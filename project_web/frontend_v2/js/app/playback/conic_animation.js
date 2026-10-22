// ==================================================================================
// QUADRATIC FORMS & CONICS/QUADRICS 3-STEP PLAYBACK ENGINE (ACADEMIC ARCHITECTURE)
// Trực quan hóa Bản chất Dạng Toàn Phương Q(x) = x^T A x & Đưa về Dạng Chính Tắc
// Hỗ trợ đồng bộ cả 2D Canvas (Thiết diện Conic) và 3D Three.js (Mặt bậc hai z = Q(x,y) & Quadric 3D)
// Kịch bản 3 Bước Động học Liền mạch (Tuyệt đối không vẽ chữ thuyết minh lên Canvas):
//   Bước 1: Sự phá vỡ đối xứng của số hạng chéo 2bxy != 0 (Biến dạng liên tục từ
//           dạng đường chéo thuần túy Q_0(x) = ax^2 + cy^2 = 1 sang Q(x) = x^T A x = 1 bị vặn nghiêng góc theta)
//   Bước 2: Định lý Phổ cho Ma trận Đối xứng A = A^T (Phóng các trục đối xứng vuông góc e_1 perp e_2,
//           ký hiệu góc vuông 90 deg tại O và trượt thước đo đỉnh bán trục a_i = 1 / sqrt(|lambda_i|))
//   Bước 3: Bản chất Phép đổi biến Trực giao x = P y (Dựng hệ lưới ô vuông trực chuẩn mới Oy_1y_2
//           dọc theo {e_i} ôm khít đường/mặt bậc hai, sau đó xoay cứng cả hệ quy chiếu mới lẫn hình học
//           một góc -theta về chính diện chuẩn tắc sum lambda_i y_i^2 = 1)
// Tuân thủ triệt để Zero Em-dash (\u2014) và quy chuẩn Anti-Slop.
// ==================================================================================
(function () {
  window.App = window.App || {};

  const EIGEN_COLORS = ["#00e5ff", "#f59e0b", "#10b981"];
  const EIGEN_HEX = [0x00e5ff, 0xf59e0b, 0x10b981];

  function smoothstep(t) {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
  }

  function norm(v) {
    return Math.hypot(v[0] || 0, v[1] || 0, v[2] || 0);
  }

  function dot(a, b) {
    return (a[0] || 0) * (b[0] || 0) + (a[1] || 0) * (b[1] || 0) + (a[2] || 0) * (b[2] || 0);
  }

  function cross(a, b) {
    return [
      (a[1] || 0) * (b[2] || 0) - (a[2] || 0) * (b[1] || 0),
      (a[2] || 0) * (b[0] || 0) - (a[0] || 0) * (b[2] || 0),
      (a[0] || 0) * (b[1] || 0) - (a[1] || 0) * (b[0] || 0)
    ];
  }

  function formatScalar(val) {
    if (!Number.isFinite(val) || Math.abs(val) < 1e-4) return "0";
    if (Math.abs(val - Math.round(val)) < 1e-3) return String(Math.round(val));
    for (let den = 2; den <= 16; den++) {
      const num = Math.round(val * den);
      if (Math.abs(val - num / den) < 1e-3) {
        return num < 0 ? `-${Math.abs(num)}/${den}` : `${num}/${den}`;
      }
    }
    return val.toFixed(2).replace(/\.?0+$/, "");
  }

  // Phân rã Phổ trực giao (Spectral Decomposition) cho ma trận đối xứng 2x2 hoặc 3x3
  function decomposeSymmetricMatrix(A) {
    const dim = A.length === 3 ? 3 : 2;
    if (dim === 2) {
      const a = Number(A[0][0]) || 0;
      const b = Number(A[0][1]) || 0;
      const c = Number(A[1][1]) || 0;

      const tr = a + c;
      const diff = a - c;
      const disc = Math.sqrt(Math.max(0, diff * diff + 4 * b * b));
      let l1 = (tr + disc) / 2;
      let l2 = (tr - disc) / 2;
      if (Math.abs(l1 - Math.round(l1)) < 1e-5) l1 = Math.round(l1);
      if (Math.abs(l2 - Math.round(l2)) < 1e-5) l2 = Math.round(l2);

      // Góc xoay chính xác theta = 1/2 atan2(2b, a - c)
      let theta = 0;
      if (Math.abs(b) > 1e-7 || a < c) {
        theta = 0.5 * Math.atan2(2 * b, a - c);
      }
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const e1 = [cosT, sinT];
      const e2 = [-sinT, cosT];

      return {
        dim: 2,
        eigenvalues: [l1, l2],
        eigenvectors: [e1, e2],
        P: [
          [e1[0], e2[0]],
          [e1[1], e2[1]]
        ],
        theta2D: theta,
        rotAxis3D: [0, 0, 1],
        rotAngle3D: theta
      };
    }

    // 3x3: Thuật toán quay Jacobi cho ma trận đối xứng thực
    const D = [
      [Number(A[0][0]) || 0, Number(A[0][1]) || 0, Number(A[0][2]) || 0],
      [Number(A[1][0]) || 0, Number(A[1][1]) || 0, Number(A[1][2]) || 0],
      [Number(A[2][0]) || 0, Number(A[2][1]) || 0, Number(A[2][2]) || 0]
    ];
    const V = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];

    for (let iter = 0; iter < 60; iter++) {
      let p = 0, q = 1;
      let maxOff = Math.abs(D[0][1]);
      if (Math.abs(D[0][2]) > maxOff) { p = 0; q = 2; maxOff = Math.abs(D[0][2]); }
      if (Math.abs(D[1][2]) > maxOff) { p = 1; q = 2; maxOff = Math.abs(D[1][2]); }
      if (maxOff < 1e-11) break;

      const diff = D[q][q] - D[p][p];
      let t;
      if (Math.abs(diff) < 1e-12) {
        t = D[p][q] > 0 ? 1 : -1;
      } else {
        const phi = diff / (2 * D[p][q]);
        t = 1 / (Math.abs(phi) + Math.sqrt(phi * phi + 1));
        if (phi < 0) t = -t;
      }
      const c = 1 / Math.sqrt(1 + t * t);
      const s = t * c;
      const tau = s / (1 + c);
      const h = t * D[p][q];
      D[p][p] -= h;
      D[q][q] += h;
      D[p][q] = 0;
      D[q][p] = 0;

      for (let r = 0; r < 3; r++) {
        if (r !== p && r !== q) {
          const g = D[r][p];
          const m = D[r][q];
          D[r][p] = D[p][r] = g - s * (m + g * tau);
          D[r][q] = D[q][r] = m + s * (g - m * tau);
        }
        const vp = V[r][p];
        const vq = V[r][q];
        V[r][p] = vp - s * (vq + vp * tau);
        V[r][q] = vq + s * (vp - vq * tau);
      }
    }

    const pairs = [0, 1, 2].map((idx) => {
      let lam = D[idx][idx];
      if (Math.abs(lam - Math.round(lam)) < 1e-5) lam = Math.round(lam);
      return {
        lam,
        vec: [V[0][idx], V[1][idx], V[2][idx]]
      };
    });
    pairs.sort((x, y) => y.lam - x.lam);

    const eigenvalues = pairs.map((p) => p.lam);
    let e1 = pairs[0].vec;
    let e2 = pairs[1].vec;
    const n1 = norm(e1) || 1;
    e1 = e1.map((x) => x / n1);
    if (e1[0] < -1e-5 || (Math.abs(e1[0]) <= 1e-5 && e1[1] < -1e-5)) {
      e1 = e1.map((x) => -x);
    }
    const n2 = norm(e2) || 1;
    e2 = e2.map((x) => x / n2);
    // Trực giao hóa lại nhẹ để khử sai số dấu phẩy động và đảm bảo det(P) = +1
    const proj12 = dot(e2, e1);
    e2 = [e2[0] - proj12 * e1[0], e2[1] - proj12 * e1[1], e2[2] - proj12 * e1[2]];
    const n2Clean = norm(e2) || 1;
    e2 = e2.map((x) => x / n2Clean);
    const e3 = cross(e1, e2);

    const P = [
      [e1[0], e2[0], e3[0]],
      [e1[1], e2[1], e3[1]],
      [e1[2], e2[2], e3[2]]
    ];

    let rotAxis3D = [0, 0, 1];
    const trP = P[0][0] + P[1][1] + P[2][2];
    const cosA = Math.max(-1, Math.min(1, (trP - 1) / 2));
    const rotAngle3D = Math.acos(cosA);
    if (Math.sin(rotAngle3D) > 1e-5) {
      rotAxis3D = [
        (P[2][1] - P[1][2]) / (2 * Math.sin(rotAngle3D)),
        (P[0][2] - P[2][0]) / (2 * Math.sin(rotAngle3D)),
        (P[1][0] - P[0][1]) / (2 * Math.sin(rotAngle3D))
      ];
      const nAx = norm(rotAxis3D) || 1;
      rotAxis3D = rotAxis3D.map((x) => x / nAx);
    }

    return {
      dim: 3,
      eigenvalues,
      eigenvectors: [e1, e2, e3],
      P,
      theta2D: Math.atan2(e1[1], e1[0]),
      rotAxis3D,
      rotAngle3D
    };
  }

  // Phân tích toàn diện Dạng Toàn Phương Q(x) = x^T A x
  function analyzeQuadraticForm(rawValues, n) {
    const dim = n === 3 ? 3 : 2;
    const origMatrix = [];
    for (let i = 0; i < dim; i++) {
      origMatrix[i] = [];
      for (let j = 0; j < dim; j++) {
        origMatrix[i][j] = Number(rawValues?.[i]?.[j] ?? 0);
      }
    }

    let isSymmetric = true;
    for (let i = 0; i < dim; i++) {
      for (let j = i + 1; j < dim; j++) {
        if (Math.abs(origMatrix[i][j] - origMatrix[j][i]) > 1e-5) {
          isSymmetric = false;
          break;
        }
      }
      if (!isSymmetric) break;
    }

    const A = [];
    const ADiag = [];
    let maxOffDiag = 0;
    for (let i = 0; i < dim; i++) {
      A[i] = [];
      ADiag[i] = [];
      for (let j = 0; j < dim; j++) {
        const val = (origMatrix[i][j] + origMatrix[j][i]) / 2;
        A[i][j] = val;
        ADiag[i][j] = i === j ? val : 0;
        if (i !== j) maxOffDiag = Math.max(maxOffDiag, Math.abs(val));
      }
    }

    const spec = decomposeSymmetricMatrix(A);
    const semiAxes = spec.eigenvalues.map((lam) => {
      if (Math.abs(lam) < 1e-4) return 2.2;
      return Math.max(0.28, Math.min(5.5, 1 / Math.sqrt(Math.abs(lam))));
    });

    const pPos = spec.eigenvalues.filter((x) => x > 1e-5).length;
    const qNeg = spec.eigenvalues.filter((x) => x < -1e-5).length;

    return {
      dim,
      is3D: dim === 3,
      origMatrix,
      matrix: A,
      diagMatrix: ADiag,
      hasOffDiag: maxOffDiag > 1e-5,
      isSymmetric,
      eigenvalues: spec.eigenvalues,
      eigenvectors: spec.eigenvectors,
      semiAxes,
      P: spec.P,
      theta2D: spec.theta2D,
      rotAxis3D: spec.rotAxis3D,
      rotAngle3D: spec.rotAngle3D,
      pPos,
      qNeg
    };
  }

  // Nội suy ma trận A(t) = A_diag + t * (A - A_diag) ở Bước 1 (bật dần số hạng chéo 2bxy)
  function getInterpolatedMatrix(analysis, tCross) {
    const dim = analysis.dim;
    const M = [];
    for (let i = 0; i < dim; i++) {
      M[i] = [];
      for (let j = 0; j < dim; j++) {
        if (i === j) {
          M[i][j] = analysis.matrix[i][j];
        } else {
          M[i][j] = tCross * analysis.matrix[i][j];
        }
      }
    }
    return M;
  }

  // Vẽ đường cong bậc hai 2D tương ứng với cặp trị riêng (l1, l2) và góc xoay rotAngle
  function strokeConicByEigen2D(ctx, wX, wY, l1, l2, rotAngle) {
    const cosR = Math.cos(rotAngle);
    const sinR = Math.sin(rotAngle);

    // Nếu cả 2 trị riêng đều âm, vẽ đường mức Q(x,y) = -1 bằng nét đứt để người học vẫn quan sát được hình thái
    let effL1 = l1;
    let effL2 = l2;
    if (l1 < -1e-5 && l2 < -1e-5) {
      effL1 = -l1;
      effL2 = -l2;
    }

    if (effL1 > 1e-5 && effL2 > 1e-5) {
      // Elip: l1 * y1^2 + l2 * y2^2 = 1
      const a1 = Math.min(8.0, 1 / Math.sqrt(effL1));
      const a2 = Math.min(8.0, 1 / Math.sqrt(effL2));
      const steps = 128;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const phi = (i / steps) * Math.PI * 2;
        const y1 = a1 * Math.cos(phi);
        const y2 = a2 * Math.sin(phi);
        const x = cosR * y1 - sinR * y2;
        const y = sinR * y1 + cosR * y2;
        if (i === 0) ctx.moveTo(wX(x), wY(y));
        else ctx.lineTo(wX(x), wY(y));
      }
      ctx.closePath();
      ctx.stroke();
    } else if (effL1 > 1e-5 && effL2 < -1e-5) {
      // Hyperbol mở dọc trục e1: y1^2 / a1^2 - y2^2 / b2^2 = 1
      const a1 = Math.min(6.0, 1 / Math.sqrt(effL1));
      const b2 = Math.min(6.0, 1 / Math.sqrt(-effL2));
      const uMax = 2.15;
      const steps = 72;
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const u = -uMax + (i / steps) * (2 * uMax);
          const y1 = sgn * a1 * Math.cosh(u);
          const y2 = b2 * Math.sinh(u);
          const x = cosR * y1 - sinR * y2;
          const y = sinR * y1 + cosR * y2;
          if (i === 0) ctx.moveTo(wX(x), wY(y));
          else ctx.lineTo(wX(x), wY(y));
        }
        ctx.stroke();
      }
    } else if (effL1 < -1e-5 && effL2 > 1e-5) {
      // Hyperbol mở dọc trục e2: -y1^2 / b1^2 + y2^2 / a2^2 = 1
      const b1 = Math.min(6.0, 1 / Math.sqrt(-effL1));
      const a2 = Math.min(6.0, 1 / Math.sqrt(effL2));
      const uMax = 2.15;
      const steps = 72;
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const u = -uMax + (i / steps) * (2 * uMax);
          const y1 = b1 * Math.sinh(u);
          const y2 = sgn * a2 * Math.cosh(u);
          const x = cosR * y1 - sinR * y2;
          const y = sinR * y1 + cosR * y2;
          if (i === 0) ctx.moveTo(wX(x), wY(y));
          else ctx.lineTo(wX(x), wY(y));
        }
        ctx.stroke();
      }
    } else if (Math.abs(effL1) > 1e-5 || Math.abs(effL2) > 1e-5) {
      // Suy biến (1 trị riêng bằng 0): Cặp đường thẳng song song
      const useFirst = Math.abs(effL1) > Math.abs(effL2);
      const lam = Math.abs(useFirst ? effL1 : effL2);
      const d = Math.min(6.0, 1 / Math.sqrt(lam));
      const span = 9.0;
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        const y1A = useFirst ? sgn * d : -span;
        const y2A = useFirst ? -span : sgn * d;
        const y1B = useFirst ? sgn * d : span;
        const y2B = useFirst ? span : sgn * d;
        ctx.moveTo(wX(cosR * y1A - sinR * y2A), wY(sinR * y1A + cosR * y2A));
        ctx.lineTo(wX(cosR * y1B - sinR * y2B), wY(sinR * y1B + cosR * y2B));
        ctx.stroke();
      }
    }
  }

  const PHASES_INFO = [
    {
      title: "Bước 1: Sự phá vỡ đối xứng của số hạng chéo 2bxy",
      desc: "Khi bật dần số hạng ngoài đường chéo 2bxy, tích xy dương ở góc phần tư (I, III) và âm ở (II, IV) kéo giãn - ép co lệch phương, vặn nghiêng đường/mặt bậc hai một góc θ khỏi trục chuẩn."
    },
    {
      title: "Bước 2: Định lý Phổ - Trục riêng trực chuẩn & Đỉnh bán trục",
      desc: "Vì ma trận A đối xứng thực (A = Aᵀ), các vector riêng đơn vị e₁, e₂ luôn vuông góc tuyệt đối (90°) và nằm đè đúng lên các trục đối xứng chính, cắt đỉnh tại bán trục aᵢ = 1/√|λᵢ|."
    },
    {
      title: "Bước 3: Đổi biến trực giao x = Py - Xoay hệ trục về Chính tắc",
      desc: "Dựng hệ lưới tọa độ vuông mới Oy₁y₂ dọc theo {e₁, e₂} ôm khít đường bậc hai, sau đó xoay cứng toàn bộ hệ quy chiếu mới một góc -θ về phương ngang - dọc, khử sạch số hạng chéo."
    }
  ];

  // =========================================================================
  // BỘ ĐIỀU KHIỂN HOẠT CẢNH DẠNG TOÀN PHƯƠNG (App.ConicAnimator)
  // =========================================================================
  App.ConicAnimator = {
    _active: false,
    _paused: false,
    _currentPhase: 0,
    _phaseProgress: 0,
    _speed: 1.0,
    _raf: null,
    _phaseTimer: null,
    _analysis: null,
    _targetItem: null,
    _snapshot: null,
    _tempEigenItems: [],
    _threeGroup: null,
    _savedCamPos3D: null,

    isActive() {
      return this._active;
    },

    isPlaying() {
      return this._active && !this._paused;
    },

    getCurrentPhase() {
      return this._currentPhase;
    },

    getAnalysis() {
      return this._analysis;
    },

    start(matrixItem) {
      let item = matrixItem;
      if (!item) {
        const found = App.getOrEnsureSelectedSquareMatrix
          ? App.getOrEnsureSelectedSquareMatrix("conicMatrixSelect", { requireSymmetric: true })
          : null;
        if (!found) return false;
        item = found.item;
      }

      this.stop();

      const rawVals = typeof item.evalMatrix === "function" ? item.evalMatrix() : item.values;
      const n = item.rows || (Array.isArray(rawVals) ? rawVals.length : 2);
      const analysis = analyzeQuadraticForm(rawVals, n);
      this._analysis = analysis;
      this._targetItem = item;

      // Đồng bộ chế độ 2D / 3D theo cấp ma trận khi khởi chạy
      const targetMode = analysis.is3D ? "3D" : "2D";
      if (App.mode !== targetMode) {
        if (typeof App.setMode === "function") App.setMode(targetMode);
        else if (typeof App.toggleMode === "function") App.toggleMode();
      }

      // Lưu snapshot danh sách vector của người dùng để khôi phục nguyên vẹn khi dừng
      this._snapshot = (App.vectorList || []).map((v) => ({
        id: v.id,
        vec: Array.isArray(v.vec) ? [...v.vec] : [0, 0],
        visible: v.visible,
        alpha: v.alpha,
        colorCss: v.colorCss,
        colorHex: v.colorHex,
        focus: v.focus
      }));

      (App.vectorList || []).forEach((v) => {
        v.visible = false;
      });

      // Tạo các vector riêng đơn vị trực chuẩn e_1, e_2, (e_3) trong App.vectorList
      // để viewer2D và viewer3D tự vẽ mũi tên + nhãn ngắn gọn "e_1", "e_2" chuẩn mực!
      this._tempEigenItems = [];
      for (let i = 0; i < analysis.eigenvectors.length; i++) {
        const eVec = analysis.eigenvectors[i];
        const colCss = EIGEN_COLORS[i % EIGEN_COLORS.length];
        const colHex = EIGEN_HEX[i % EIGEN_HEX.length];
        const coord = analysis.is3D
          ? [eVec[0], eVec[1], eVec[2] || 0]
          : [eVec[0], eVec[1]];

        const tempItem = {
          id: 9400 + i + 1,
          name: `e_${i + 1}`,
          _customLabelLatex: `e_{${i + 1}}`,
          vec: [...coord],
          origUnitVec: [...coord],
          lambda: analysis.eigenvalues[i],
          semiAxis: analysis.semiAxes[i],
          eigenIndex: i,
          colorCss: colCss,
          colorHex: colCss,
          colorHexNum: colHex,
          visible: false,
          showArrow: true,
          showProjection: false,
          alpha: 0.0,
          _isConicTemp: true
        };
        App.vectorList.push(tempItem);
        this._tempEigenItems.push(tempItem);
      }

      // Căn chỉnh góc nhìn Camera 3D lệch phương
      this._savedCamPos3D = null;
      this._camFramed3D = false;
      this._frame3DCameraIfNeeded();

      this.ensureControls();
      const wrap = document.getElementById("conicAnimControls");
      if (wrap) wrap.style.display = "block";

      this._active = true;
      this._paused = false;
      this._currentPhase = 0;
      this._phaseProgress = 0;
      App._conicAnimActive = true;

      this._syncPlayPauseIcon();
      this._runPhase(0);
      return true;
    },

    stop() {
      if (this._phaseTimer) {
        clearTimeout(this._phaseTimer);
        this._phaseTimer = null;
      }
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }

      const wasActive = this._active;
      this._active = false;
      this._paused = false;
      this._currentPhase = 0;
      this._phaseProgress = 0;
      App._conicAnimActive = false;

      const wrap = document.getElementById("conicAnimControls");
      if (wrap) wrap.style.display = "none";

      if (this._threeGroup) {
        if (this._threeGroup.parent) {
          this._threeGroup.parent.remove(this._threeGroup);
        }
        this._threeGroup.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose?.();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m?.dispose?.());
          else obj.material?.dispose?.();
        });
        this._threeGroup = null;
      }

      if (this._savedCamPos3D && window.Vec3D && Vec3D._camera && Vec3D._controls) {
        Vec3D._camera.position.copy(this._savedCamPos3D);
        Vec3D._controls.update();
        this._savedCamPos3D = null;
      }

      if (Array.isArray(App.vectorList)) {
        for (let i = App.vectorList.length - 1; i >= 0; i--) {
          if (App.vectorList[i] && App.vectorList[i]._isConicTemp) {
            App.vectorList.splice(i, 1);
          }
        }
      }

      if (this._snapshot && Array.isArray(App.vectorList)) {
        for (const snap of this._snapshot) {
          const it = App.vectorList.find((v) => v.id === snap.id);
          if (it) {
            it.vec = [...snap.vec];
            it.visible = snap.visible;
            it.alpha = snap.alpha;
            it.colorCss = snap.colorCss;
            it.colorHex = snap.colorHex;
            it.focus = snap.focus;
          }
        }
      }
      this._snapshot = null;
      this._tempEigenItems = [];

      if (wasActive) {
        if (App.mode === "2D" && window.Vec2D) {
          Vec2D.draw2DAllVectors();
        } else if (App.mode === "3D" && window.Vec3D) {
          Vec3D.hardRefresh3D(false);
        }
      }
    },

    pause() {
      this._paused = true;
      if (this._phaseTimer) {
        clearTimeout(this._phaseTimer);
        this._phaseTimer = null;
      }
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }
      this._syncPlayPauseIcon();
    },

    resume() {
      if (!this._active) return;
      this._paused = false;
      this._syncPlayPauseIcon();
      if (this._phaseProgress >= 0.999) {
        if (this._currentPhase < 2) {
          this._runPhase(this._currentPhase + 1);
        } else {
          this._runPhase(0);
        }
      } else {
        this._animatePhaseFrom(this._currentPhase, this._phaseProgress);
      }
    },

    togglePlayPause() {
      if (!this._active) return;
      if (this._paused) this.resume();
      else this.pause();
    },

    nextStep() {
      if (!this._active) return;
      this.goToPhase(Math.min(2, this._currentPhase + 1));
    },

    prevStep() {
      if (!this._active) return;
      this.goToPhase(Math.max(0, this._currentPhase - 1));
    },

    restart() {
      if (!this._active) return;
      this._paused = false;
      this._syncPlayPauseIcon();
      this._runPhase(0);
    },

    setSpeed(mult) {
      const val = parseFloat(mult);
      if (!isNaN(val) && val > 0) {
        this._speed = val;
      }
    },

    goToPhase(phaseIdx) {
      if (!this._active) return;
      if (this._phaseTimer) {
        clearTimeout(this._phaseTimer);
        this._phaseTimer = null;
      }
      const clamped = Math.max(0, Math.min(2, phaseIdx));
      this._paused = false;
      this._syncPlayPauseIcon();
      this._runPhase(clamped);
    },

    _runPhase(phaseIdx) {
      if (!this._active) return;
      if (this._phaseTimer) {
        clearTimeout(this._phaseTimer);
        this._phaseTimer = null;
      }
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }
      this._currentPhase = phaseIdx;
      this._phaseProgress = 0;
      this._applyVectorsForPhase(phaseIdx, 0);
      this.updateDynamicStepText(phaseIdx, 0);
      this._syncPhasePills(phaseIdx);
      this._animatePhaseFrom(phaseIdx, 0);
    },

    _animatePhaseFrom(phaseIdx, startProgress) {
      const baseDurations = [2800, 3200, 3400];
      const baseDur = baseDurations[phaseIdx] || 3000;
      let lastTime = performance.now();
      let progress = startProgress;

      const tick = (now) => {
        if (!this._active || this._paused || this._currentPhase !== phaseIdx) return;
        const dt = Math.max(0, now - lastTime);
        lastTime = now;
        const speed = Math.max(0.2, this._speed || 1.0);
        progress = Math.min(1.0, progress + (dt * speed) / baseDur);
        this._phaseProgress = progress;

        this._applyVectorsForPhase(phaseIdx, progress);
        this.updateDynamicStepText(phaseIdx, progress);

        if (App.mode === "2D" && window.Vec2D) {
          Vec2D.draw2DAllVectors();
        } else if (App.mode === "3D" && window.Vec3D) {
          Vec3D.hardRefresh3D(false);
        }

        if (progress < 1.0) {
          this._raf = requestAnimationFrame(tick);
        } else {
          this._raf = null;
          if (this._currentPhase < 2) {
            this._phaseTimer = setTimeout(() => {
              if (this._active && !this._paused) {
                this._runPhase(this._currentPhase + 1);
              }
            }, 380 / speed);
          } else {
            this._paused = true;
            this._syncPlayPauseIcon();
          }
        }
      };

      this._raf = requestAnimationFrame(tick);
    },

    // Cập nhật tọa độ các vector riêng trực chuẩn e_1, e_2, (e_3) xuyên suốt 3 bước:
    // - Bước 1 (curPhase = 0): Ẩn e_i để tập trung quan sát đường/mặt bậc hai bị vặn nghiêng bởi 2bxy
    // - Bước 2 (curPhase = 1): e_1, e_2 hiện lên tại đúng trục đối xứng nghiêng (độ dài đơn vị = 1)
    // - Bước 3 (curPhase = 2):
    //     + Pha 3A (p: 0 -> 0.45): Giữ e_1, e_2 làm cơ sở dựng lưới ô vuông mới Oy_1y_2
    //     + Pha 3B (p: 0.45 -> 1.0): Xoay cứng cả e_1, e_2 cùng lưới mới và đường bậc hai một góc -theta về trùng trục chuẩn!
    _applyVectorsForPhase(curPhase, p) {
      const an = this._analysis;
      if (!an) return;

      for (let i = 0; i < this._tempEigenItems.length; i++) {
        const it = this._tempEigenItems[i];
        const u0 = it.origUnitVec;

        if (curPhase === 0) {
          it.visible = false;
          it.alpha = 0.0;
          it.vec[0] = u0[0];
          it.vec[1] = u0[1];
          if (an.is3D) it.vec[2] = u0[2];
        } else if (curPhase === 1) {
          const appearT = smoothstep(Math.min(1.0, p / 0.35));
          it.visible = appearT > 0.02;
          it.alpha = appearT;
          it.vec[0] = u0[0] * appearT;
          it.vec[1] = u0[1] * appearT;
          if (an.is3D) it.vec[2] = u0[2] * appearT;
        } else {
          it.visible = true;
          it.alpha = 1.0;
          const rotT = smoothstep(Math.max(0, Math.min(1.0, (p - 0.42) / 0.58)));
          if (!an.is3D) {
            // Quay ngược góc -rotT * theta2D để đưa e_1 -> (1,0), e_2 -> (0,1)
            const deltaAngle = -rotT * an.theta2D;
            const c = Math.cos(deltaAngle);
            const s = Math.sin(deltaAngle);
            it.vec[0] = c * u0[0] - s * u0[1];
            it.vec[1] = s * u0[0] + c * u0[1];
          } else {
            // Quay 3D Rodrigues quanh rotAxis3D góc -rotT * rotAngle3D
            const angle = -rotT * an.rotAngle3D;
            const k = an.rotAxis3D;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const kCrossU = cross(k, u0);
            const kDotU = dot(k, u0);
            it.vec[0] = u0[0] * cosA + kCrossU[0] * sinA + k[0] * kDotU * (1 - cosA);
            it.vec[1] = u0[1] * cosA + kCrossU[1] * sinA + k[1] * kDotU * (1 - cosA);
            it.vec[2] = u0[2] * cosA + kCrossU[2] * sinA + k[2] * kDotU * (1 - cosA);
          }
        }
      }
    },

    ensureControls() {
      const out = document.getElementById("result_conic_info");
      if (!out) return;
      if (document.getElementById("conicAnimControls")) {
        this.bindSidebarControls();
        return;
      }

      const host = out.parentElement;
      if (!host) return;

      const wrap = document.createElement("div");
      wrap.id = "conicAnimControls";
      wrap.className = "basis-sidebar-anim-box";
      wrap.style.display = "none";
      wrap.style.marginTop = "10px";

      wrap.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted, #64748b);">Trực quan hóa Dạng Toàn Phương</span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="basis-step-pill" id="conicStepCounter">Bước 1 / 3</span>
            <button type="button" id="btnConicCloseAnim" class="basis-anim-close-btn" title="Đóng trực quan" style="background: transparent; border: none; cursor: pointer; color: var(--text-muted, #64748b); font-size: 13px; padding: 2px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px;">
              <i class="ph ph-x"></i>
            </button>
          </div>
        </div>

        <div class="coord-phase-pills" id="conicPhasePills">
          <button type="button" class="coord-phase-btn active" data-phase="0" title="Bước 1: Số hạng chéo 2bxy làm vặn nghiêng đường/mặt bậc hai">Bước 1</button>
          <button type="button" class="coord-phase-btn" data-phase="1" title="Bước 2: Định lý Phổ - Trục đối xứng vuông góc e₁ ⊥ e₂ & Đỉnh bán trục">Bước 2</button>
          <button type="button" class="coord-phase-btn" data-phase="2" title="Bước 3: Đổi biến trực giao x = Py - Dựng lưới mới & Xoay về chính tắc">Bước 3</button>
        </div>

        <div class="basis-anim-btn-row">
          <button type="button" id="btnConicPrev" class="basis-ctrl-btn" title="Bước trước">
            <i class="ph ph-skip-back"></i>
          </button>
          <button type="button" id="btnConicPlay" class="basis-ctrl-btn primary" title="Phát / Tạm dừng">
            <i class="ph ph-pause" id="iconConicPlay"></i>
          </button>
          <button type="button" id="btnConicNext" class="basis-ctrl-btn" title="Bước tiếp">
            <i class="ph ph-skip-forward"></i>
          </button>
          <button type="button" id="btnConicReplay" class="basis-ctrl-btn" title="Phát lại từ đầu">
            <i class="ph ph-arrow-counter-clockwise"></i>
          </button>
        </div>

        <div class="hud-menu-slider-row basis-speed-slider-wrap" style="padding: 6px 0 2px; margin-top: 6px; border-top: 1px dashed var(--border-subtle, var(--border, #e2e8f0));">
          <div class="hud-menu-slider-header" style="font-size: 11.5px; margin-bottom: 2px;">
            <span class="hud-menu-item-text" style="color: var(--text-muted, #64748b); font-weight: 600;">Tốc độ phát</span>
            <span class="hud-menu-slider-val" id="conicSpeedValue">1.0×</span>
          </div>
          <input type="range" id="conicSpeedSlider" min="0.2" max="2.5" step="0.1" value="1.0" class="hud-range-slider" />
        </div>

        <div class="basis-step-explainer" id="conicStepExplainer">
          <div class="basis-step-title" id="conicStepTitle">Khảo sát dạng toàn phương</div>
          <div class="basis-step-desc" id="conicStepDesc">Bấm nút Trực quan để khởi chạy hoạt cảnh 3 bước.</div>
        </div>
      `;

      // Đặt khối điều khiển hoạt cảnh ngay phía trên thẻ kết quả để người học luôn thấy thuyết minh từng bước
      host.insertBefore(wrap, out);

      this.bindSidebarControls();
    },

    _frame3DCameraIfNeeded() {
      if (this._camFramed3D || !this._analysis || App.mode !== "3D") return;
      if (window.Vec3D && Vec3D._camera && Vec3D._controls) {
        if (Vec3D._resetAnimId) {
          cancelAnimationFrame(Vec3D._resetAnimId);
          Vec3D._resetAnimId = null;
        }
        if (!this._savedCamPos3D) {
          this._savedCamPos3D = Vec3D._camera.position.clone();
        }
        const maxAxis = Math.max(2.4, ...(this._analysis.semiAxes || [2.4]));
        const dist = Math.max(9.5, Math.min(18.5, maxAxis * 2.55));
        Vec3D._camera.position.set(dist * 1.32, dist * 0.54, dist * 0.68);
        Vec3D._camera.up.set(0, 0, 1);
        Vec3D._controls.target.set(0, 0, 0);
        Vec3D._camera.lookAt(0, 0, 0);
        Vec3D._controls.update();
        if (typeof Vec3D.addAxisLabelsDynamic === "function") {
          Vec3D.addAxisLabelsDynamic();
        }
        this._camFramed3D = true;
      }
    },

    bindSidebarControls() {
      const btnPrev = document.getElementById("btnConicPrev");
      const btnPlay = document.getElementById("btnConicPlay");
      const btnNext = document.getElementById("btnConicNext");
      const btnReplay = document.getElementById("btnConicReplay");
      const btnClose = document.getElementById("btnConicCloseAnim");
      const speedSlider = document.getElementById("conicSpeedSlider");
      const pillsWrap = document.getElementById("conicPhasePills");

      if (btnPrev && !btnPrev._conicBound) {
        btnPrev._conicBound = true;
        btnPrev.addEventListener("click", () => this.prevStep());
      }
      if (btnPlay && !btnPlay._conicBound) {
        btnPlay._conicBound = true;
        btnPlay.addEventListener("click", () => this.togglePlayPause());
      }
      if (btnNext && !btnNext._conicBound) {
        btnNext._conicBound = true;
        btnNext.addEventListener("click", () => this.nextStep());
      }
      if (btnReplay && !btnReplay._conicBound) {
        btnReplay._conicBound = true;
        btnReplay.addEventListener("click", () => this.restart());
      }
      if (btnClose && !btnClose._conicBound) {
        btnClose._conicBound = true;
        btnClose.addEventListener("click", () => this.stop());
      }
      if (speedSlider && !speedSlider._conicBound) {
        speedSlider._conicBound = true;
        const syncSliderPct = (val) => {
          const min = parseFloat(speedSlider.min) || 0.2;
          const max = parseFloat(speedSlider.max) || 2.5;
          const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
          speedSlider.style.setProperty("--slider-pct", `${pct.toFixed(1)}%`);
          speedSlider.style.setProperty("--range-pct", `${pct.toFixed(1)}%`);
        };
        syncSliderPct(1.0);
        speedSlider.addEventListener("input", (e) => {
          const v = parseFloat(e.target.value) || 1.0;
          syncSliderPct(v);
          const lbl = document.getElementById("conicSpeedValue");
          if (lbl) lbl.textContent = `${v.toFixed(1)}×`;
          this.setSpeed(v);
        });
      }
      if (pillsWrap && !pillsWrap._conicBound) {
        pillsWrap._conicBound = true;
        pillsWrap.querySelectorAll(".coord-phase-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.phase, 10);
            if (!isNaN(idx)) this.goToPhase(idx);
          });
        });
      }
    },

    _syncPlayPauseIcon() {
      const icon = document.getElementById("iconConicPlay");
      if (icon) {
        icon.className = this._paused ? "ph ph-play" : "ph ph-pause";
      }
    },

    _syncPhasePills(curPhase) {
      const counter = document.getElementById("conicStepCounter");
      if (counter) counter.textContent = `Bước ${curPhase + 1} / 3`;

      const pillsWrap = document.getElementById("conicPhasePills");
      if (pillsWrap) {
        pillsWrap.querySelectorAll(".coord-phase-btn").forEach((b) => {
          const idx = parseInt(b.dataset.phase, 10);
          b.classList.toggle("active", idx === curPhase);
        });
      }
    },

    // Toàn bộ giải thích toán học chi tiết được hiển thị trong Sidebar (#conicStepDesc),
    // giúp mặt phẳng đồ thị Canvas 2D / 3D hoàn toàn tinh khiết, không chứa chữ thuyết minh!
    updateDynamicStepText(curPhase, p) {
      const titleEl = document.getElementById("conicStepTitle");
      const descEl = document.getElementById("conicStepDesc");
      if (!titleEl || !descEl) return;

      const info = PHASES_INFO[curPhase] || PHASES_INFO[0];
      titleEl.textContent = info.title;

      const an = this._analysis;
      if (!an) {
        descEl.textContent = info.desc;
        return;
      }

      const pct = Math.round(p * 100);
      const A = an.matrix;
      const deg = ((an.theta2D * 180) / Math.PI).toFixed(1);

      if (curPhase === 0) {
        if (!an.is3D) {
          const aStr = formatScalar(A[0][0]);
          const b2Str = formatScalar(2 * A[0][1]);
          const cStr = formatScalar(A[1][1]);
          descEl.innerHTML =
            `<b>1. Khi chưa có số hạng chéo (nét đứt mờ):</b> <b>${aStr}x² + ${cStr}y² = 1</b> nhận trục chuẩn Ox, Oy làm trục đối xứng gương.<br>` +
            `<b>2. Bật số hạng chéo (${pct}%):</b> Thành phần <b>(${b2Str})xy</b> cộng thêm ở góc phần tư cùng dấu và trừ bớt ở góc phần tư trái dấu, làm đường cong bị vặn nghiêng góc <b>θ = ${deg}°</b>.`;
        } else {
          descEl.innerHTML =
            `<b>1. Dạng đường chéo ban đầu (khung mờ):</b> Nhận 3 trục tọa độ chuẩn Ox, Oy, Oz làm trục đối xứng.<br>` +
            `<b>2. Kích hoạt các phần tử ngoài đường chéo a<sub>ij</sub> (${pct}%):</b> Các số hạng chéo <b>2a<sub>ij</sub>x<sub>i</sub>x<sub>j</sub></b> làm mặt bậc hai 3D bị xoay nghiêng trong không gian.`;
        }
      } else if (curPhase === 1) {
        const eigDetails = an.eigenvalues
          .map((lam, i) => {
            const eStr = `(${an.eigenvectors[i].map(formatScalar).join(", ")})`;
            const aStr = formatScalar(an.semiAxes[i]);
            return `• <b>λ<sub>${i + 1}</sub> = ${formatScalar(lam)}</b> ⇒ Trục riêng trực chuẩn <b>e<sub>${i + 1}</sub> = ${eStr}</b>, bán trục <b>a<sub>${i + 1}</sub> = 1/√|λ<sub>${i + 1}</sub>| = ${aStr}</b>`;
          })
          .join("<br>");
        descEl.innerHTML =
          `<b>Định lý Phổ (A = Aᵀ):</b> Các vector riêng của ma trận đối xứng luôn <b>vuông góc từng đôi một (e₁ ⊥ e₂, góc 90°)</b> và trùng khít với trục đối xứng cực trị:<br>${eigDetails}`;
      } else {
        const isGridPhase = p < 0.42;
        const canTerms = an.eigenvalues
          .map((lam, i) => `(${formatScalar(lam)})y<sub>${i + 1}</sub>²`)
          .join(" + ");
        if (isGridPhase) {
          descEl.innerHTML =
            `<b>Pha 3A - Dựng hệ lưới tọa độ mới Oy₁y₂ dọc theo {eᵢ}:</b> Trên hệ lưới ô vuông xoay theo cơ sở trực chuẩn <b>P = [e₁ e₂]</b>, đường/mặt bậc hai đã hoàn toàn đối xứng qua các trục lưới mới!`;
        } else {
          const invDegNum = -((an.theta2D * 180) / Math.PI);
          const invDegStr = (invDegNum > 0 ? "+" : "") + invDegNum.toFixed(1);
          descEl.innerHTML =
            `<b>Pha 3B - Chỉnh thẳng hệ quy chiếu x = Py (${pct}%):</b> Xoay cứng đồng thời cả lưới mới <b>Oy₁y₂</b> lẫn đường/mặt bậc hai một góc <b>${invDegStr}°</b> về trùng phương ngang - dọc. Số hạng chéo triệt tiêu hoàn toàn: <b>${canTerms} = 1</b>.`;
        }
      }
    },

    // =========================================================================
    // KẾT XUẤT LỚP NỀN 2D LIỀN MẠCH QUA 3 BƯỚC (viewer2D.js Subspace Hook)
    // Tuyệt đối không vẽ chữ (fillText) lên Canvas!
    // =========================================================================
    render2DSubspace(ctx2d, gridInfo2D) {
      if (!this._active || !this._analysis || !ctx2d || !gridInfo2D) return;

      const cx = gridInfo2D.cx !== undefined ? gridInfo2D.cx : gridInfo2D.originPx.x;
      const cy = gridInfo2D.cy !== undefined ? gridInfo2D.cy : gridInfo2D.originPx.y;
      const px = gridInfo2D.px !== undefined ? gridInfo2D.px : gridInfo2D.pixelsPerUnit;
      const wX = (x) => cx + x * px;
      const wY = (y) => cy - y * px;

      const an = this._analysis;
      const curPhase = this._currentPhase;
      const p = this._phaseProgress;
      const s = smoothstep(p);
      const isDark = window.App && App.theme === "dark";

      // Nếu là ma trận 3x3 nhưng người dùng đang xem ở 2D, lấy thiết diện z = 0 (khối 2x2 đầu tiên)
      const a = an.matrix[0][0];
      const b = an.matrix[0][1];
      const c = an.matrix[1][1];

      ctx2d.save();

      // -----------------------------------------------------------------------
      // BƯỚC 1: Biến dạng liên tục từ dạng chéo Q_0(x,y) = ax^2 + cy^2 = 1
      //         sang Q(x,y) = ax^2 + 2(s*b)xy + cy^2 = 1 khi số hạng chéo bật lên
      // -----------------------------------------------------------------------
      if (curPhase === 0) {
        // 1. Vẽ bóng mờ nét đứt của đường bậc hai khi chưa có số hạng chéo (b = 0, nằm thẳng theo Ox, Oy)
        if (Math.abs(b) > 1e-5) {
          ctx2d.save();
          ctx2d.strokeStyle = isDark ? "rgba(148, 163, 184, 0.38)" : "rgba(100, 116, 139, 0.38)";
          ctx2d.lineWidth = 1.6;
          ctx2d.setLineDash([5, 5]);
          strokeConicByEigen2D(ctx2d, wX, wY, a, c, 0);
          ctx2d.restore();
        }

        // 2. Tính phân rã phổ đích của ma trận A = [[a, b], [b, c]] và nội suy mượt cả trị riêng lẫn góc nghiêng
        //    (để ngay cả khi a = c, đường bậc hai vẫn xoay mượt từ 0 -> theta thay vì nhảy đột ngột sang +-45 deg)
        const specFinal = decomposeSymmetricMatrix([
          [a, b],
          [b, c]
        ]);
        const [l1Final, l2Final] = specFinal.eigenvalues;
        const thetaFinal = specFinal.theta2D;
        const l1Now = (1 - s) * a + s * l1Final;
        const l2Now = (1 - s) * c + s * l2Final;
        const thetaNow = s * thetaFinal;

        // 3. Vẽ bán kính định hướng tới đỉnh nghiêng + cung góc lệch theta mở dần từ trục Ox (không vẽ trục vô tận để dành cho Bước 2)
        if (Math.abs(thetaNow) > 0.01) {
          const cosR = Math.cos(thetaNow);
          const sinR = Math.sin(thetaNow);
          const rVertex = Math.abs(l1Now) > 1e-4 ? Math.min(4.5, 1 / Math.sqrt(Math.abs(l1Now))) : 1.5;
          const chordLen = Math.max(1.15, rVertex * 1.15);
          ctx2d.save();
          ctx2d.strokeStyle = "rgba(245, 158, 11, 0.72)";
          ctx2d.lineWidth = 1.6;
          ctx2d.setLineDash([4, 3]);
          ctx2d.beginPath();
          ctx2d.moveTo(cx, cy);
          ctx2d.lineTo(wX(chordLen * cosR), wY(chordLen * sinR));
          ctx2d.stroke();

          // Cung góc nghiêng theta mở dần từ trục Ox tới bán kính đỉnh nghiêng
          const arcRadiusPx = Math.min(52, Math.max(30, 0.78 * px));
          ctx2d.strokeStyle = "rgba(245, 158, 11, 0.88)";
          ctx2d.lineWidth = 2.1;
          ctx2d.setLineDash([]);
          ctx2d.beginPath();
          ctx2d.arc(cx, cy, arcRadiusPx, 0, -thetaNow, thetaNow > 0);
          ctx2d.stroke();
          ctx2d.restore();
        }

        // 4. Vẽ đường cong bậc hai đang bị số hạng chéo 2bxy vặn nghiêng mượt mà
        ctx2d.save();
        ctx2d.strokeStyle = isDark ? "rgba(56, 189, 248, 0.95)" : "rgba(2, 132, 199, 0.92)";
        ctx2d.lineWidth = 2.8;
        if (l1Now < -1e-5 && l2Now < -1e-5) ctx2d.setLineDash([6, 4]);
        strokeConicByEigen2D(ctx2d, wX, wY, l1Now, l2Now, thetaNow);
        ctx2d.restore();
      }

      // -----------------------------------------------------------------------
      // BƯỚC 2: Giữ đường cong nghiêng thực tế, phóng 2 trục đối xứng vuông góc
      //         e_1 perp e_2 từ gốc O, vẽ ký hiệu góc vuông 90 deg và trượt thước đo đỉnh bán trục
      // -----------------------------------------------------------------------
      else if (curPhase === 1) {
        const spec2D = decomposeSymmetricMatrix([
          [a, b],
          [b, c]
        ]);
        const [l1, l2] = spec2D.eigenvalues;
        const theta = spec2D.theta2D;
        const cosR = Math.cos(theta);
        const sinR = Math.sin(theta);

        // 1. Đường cong bậc hai ở vị trí nghiêng thực tế
        ctx2d.save();
        ctx2d.strokeStyle = isDark ? "rgba(56, 189, 248, 0.88)" : "rgba(2, 132, 199, 0.85)";
        ctx2d.lineWidth = 2.6;
        if (l1 < -1e-5 && l2 < -1e-5) ctx2d.setLineDash([6, 4]);
        strokeConicByEigen2D(ctx2d, wX, wY, l1, l2, theta);
        ctx2d.restore();

        // 2. Hai đường trục đối xứng nét đứt phóng ra từ gốc O (p: 0 -> 0.4)
        const axisGrow = smoothstep(Math.min(1.0, p / 0.4));
        const maxSpan = 14 * axisGrow;
        if (maxSpan > 0.05) {
          ctx2d.save();
          ctx2d.lineWidth = 1.7;
          ctx2d.setLineDash([6, 5]);

          // Trục riêng 1 (dọc theo e_1)
          ctx2d.strokeStyle = isDark ? "rgba(0, 229, 255, 0.55)" : "rgba(2, 132, 199, 0.55)";
          ctx2d.beginPath();
          ctx2d.moveTo(wX(-maxSpan * cosR), wY(-maxSpan * sinR));
          ctx2d.lineTo(wX(maxSpan * cosR), wY(maxSpan * sinR));
          ctx2d.stroke();

          // Trục riêng 2 (dọc theo e_2)
          ctx2d.strokeStyle = "rgba(245, 158, 11, 0.55)";
          ctx2d.beginPath();
          ctx2d.moveTo(wX(maxSpan * sinR), wY(-maxSpan * cosR));
          ctx2d.lineTo(wX(-maxSpan * sinR), wY(maxSpan * cosR));
          ctx2d.stroke();
          ctx2d.restore();
        }
      }

      // -----------------------------------------------------------------------
      // BƯỚC 3:
      //   - Pha 3A (p: 0 -> 0.42): Hiện hệ lưới ô vuông trực chuẩn mới Oy_1y_2 dọc theo {e_1, e_2}
      //   - Pha 3B (p: 0.42 -> 1.0): Xoay cứng đồng bộ cả lưới mới Oy_1y_2 lẫn đường Conic
      //     một góc -theta về trùng khít phương ngang - dọc chính tắc!
      // -----------------------------------------------------------------------
      else if (curPhase === 2) {
        const spec2D = decomposeSymmetricMatrix([
          [a, b],
          [b, c]
        ]);
        const [l1, l2] = spec2D.eigenvalues;
        const theta = spec2D.theta2D;

        const gridFadeIn = smoothstep(Math.min(1.0, p / 0.38));
        const rotT = smoothstep(Math.max(0, Math.min(1.0, (p - 0.42) / 0.58)));
        const curAngle = (1 - rotT) * theta;
        const cosR = Math.cos(curAngle);
        const sinR = Math.sin(curAngle);

        // 1. Bóng mờ nét đứt của đường cong ở vị trí nghiêng ban đầu (để đối chiếu phép quay hệ trục)
        if (rotT > 0.02 && Math.abs(theta) > 1e-4) {
          ctx2d.save();
          ctx2d.strokeStyle = isDark ? "rgba(148, 163, 184, 0.30)" : "rgba(100, 116, 139, 0.30)";
          ctx2d.lineWidth = 1.5;
          ctx2d.setLineDash([5, 5]);
          strokeConicByEigen2D(ctx2d, wX, wY, l1, l2, theta);
          ctx2d.restore();
        }

        // 2. Hệ lưới ô vuông trực chuẩn mới Oy_1y_2 xoay cùng đường bậc hai
        if (gridFadeIn > 0.01) {
          const N = 12;
          ctx2d.save();
          // Phủ lớp màn mờ nhẹ lên lưới chuẩn nền khi đang ở góc nghiêng để lưới tọa độ mới Oy_1y_2 nổi bật rõ nét
          const veilAlpha = 0.52 * gridFadeIn * (1 - 0.65 * rotT);
          if (veilAlpha > 0.01 && ctx2d.canvas) {
            ctx2d.fillStyle = isDark
              ? `rgba(15, 23, 42, ${veilAlpha})`
              : `rgba(248, 250, 252, ${veilAlpha})`;
            ctx2d.fillRect(0, 0, ctx2d.canvas.width, ctx2d.canvas.height);
          }

          ctx2d.lineWidth = 1.15;
          const gAlpha = 0.36 * gridFadeIn;
          ctx2d.strokeStyle = isDark ? `rgba(16, 185, 129, ${gAlpha})` : `rgba(5, 150, 105, ${gAlpha})`;
          ctx2d.beginPath();
          for (let k = -N; k <= N; k++) {
            // Đường lưới song song trục e_1 (y_2 = k)
            const x1 = cosR * -N - sinR * k;
            const y1 = sinR * -N + cosR * k;
            const x2 = cosR * N - sinR * k;
            const y2 = sinR * N + cosR * k;
            ctx2d.moveTo(wX(x1), wY(y1));
            ctx2d.lineTo(wX(x2), wY(y2));

            // Đường lưới song song trục e_2 (y_1 = k)
            const x3 = cosR * k - sinR * -N;
            const y3 = sinR * k + cosR * -N;
            const x4 = cosR * k - sinR * N;
            const y4 = sinR * k + cosR * N;
            ctx2d.moveTo(wX(x3), wY(y3));
            ctx2d.lineTo(wX(x4), wY(y4));
          }
          ctx2d.stroke();

          // Hai trục chính Oy_1, Oy_2 của lưới mới
          ctx2d.lineWidth = 1.9;
          ctx2d.setLineDash([6, 4]);
          ctx2d.strokeStyle = isDark ? `rgba(0, 229, 255, ${0.72 * gridFadeIn})` : `rgba(2, 132, 199, ${0.72 * gridFadeIn})`;
          ctx2d.beginPath();
          ctx2d.moveTo(wX(-N * cosR), wY(-N * sinR));
          ctx2d.lineTo(wX(N * cosR), wY(N * sinR));
          ctx2d.stroke();

          ctx2d.strokeStyle = `rgba(245, 158, 11, ${0.72 * gridFadeIn})`;
          ctx2d.beginPath();
          ctx2d.moveTo(wX(N * sinR), wY(-N * cosR));
          ctx2d.lineTo(wX(-N * sinR), wY(N * cosR));
          ctx2d.stroke();
          ctx2d.restore();
        }

        // 3. Đường cong bậc hai nằm cố định trên lưới mới Oy_1y_2 và cùng xoay về chính diện
        ctx2d.save();
        ctx2d.strokeStyle = rotT > 0.85 ? "#10b981" : isDark ? "rgba(56, 189, 248, 0.95)" : "rgba(2, 132, 199, 0.92)";
        ctx2d.lineWidth = 2.9;
        if (l1 < -1e-5 && l2 < -1e-5) ctx2d.setLineDash([6, 4]);
        strokeConicByEigen2D(ctx2d, wX, wY, l1, l2, curAngle);
        ctx2d.restore();
      }

      ctx2d.restore();
    },

    // =========================================================================
    // KẾT XUẤT LỚP CHI TIẾT HÌNH HỌC 2D (Ký hiệu góc vuông 90 deg, Khung tiếp tuyến đỉnh bán trục)
    // Tuyệt đối không vẽ chữ (fillText) lên Canvas!
    // =========================================================================
    render2DProjections(ctx2d, gridInfo2D) {
      if (!this._active || !this._analysis || !ctx2d || !gridInfo2D) return;

      const cx = gridInfo2D.cx !== undefined ? gridInfo2D.cx : gridInfo2D.originPx.x;
      const cy = gridInfo2D.cy !== undefined ? gridInfo2D.cy : gridInfo2D.originPx.y;
      const px = gridInfo2D.px !== undefined ? gridInfo2D.px : gridInfo2D.pixelsPerUnit;
      const wX = (x) => cx + x * px;
      const wY = (y) => cy - y * px;

      const an = this._analysis;
      const curPhase = this._currentPhase;
      const p = this._phaseProgress;
      if (curPhase === 0) return;

      const a = an.matrix[0][0];
      const b = an.matrix[0][1];
      const c = an.matrix[1][1];
      const spec2D = decomposeSymmetricMatrix([
        [a, b],
        [b, c]
      ]);
      const [l1, l2] = spec2D.eigenvalues;
      const theta = spec2D.theta2D;

      const rotT = curPhase === 2 ? smoothstep(Math.max(0, Math.min(1.0, (p - 0.42) / 0.58))) : 0;
      const curAngle = (1 - rotT) * theta;
      const cosR = Math.cos(curAngle);
      const sinR = Math.sin(curAngle);

      ctx2d.save();

      // 1. Ký hiệu góc vuông 90 deg tại gốc O giữa e_1 và e_2 (chứng minh trực giao e_1 perp e_2)
      const sqAlpha = curPhase === 1 ? smoothstep(Math.min(1.0, p / 0.35)) : 1.0;
      if (sqAlpha > 0.02) {
        const sqPx = Math.min(18, Math.max(12, 0.26 * px));
        const u1x = cosR * sqPx;
        const u1y = -sinR * sqPx;
        const u2x = -sinR * sqPx;
        const u2y = -cosR * sqPx;

        ctx2d.save();
        ctx2d.strokeStyle = `rgba(16, 185, 129, ${0.9 * sqAlpha})`;
        ctx2d.fillStyle = `rgba(16, 185, 129, ${0.18 * sqAlpha})`;
        ctx2d.lineWidth = 1.8;
        ctx2d.beginPath();
        ctx2d.moveTo(cx, cy);
        ctx2d.lineTo(cx + u1x, cy + u1y);
        ctx2d.lineTo(cx + u1x + u2x, cy + u1y + u2y);
        ctx2d.lineTo(cx + u2x, cy + u2y);
        ctx2d.closePath();
        ctx2d.fill();
        ctx2d.stroke();
        ctx2d.restore();
      }

      // 2. Các điểm đỉnh bán trục +- a_i * e_i và khung hộp cơ sở chính tắc (nửa sau Bước 2 & xuyên suốt Bước 3)
      const vertexSlide = curPhase === 1 ? smoothstep(Math.max(0, Math.min(1.0, (p - 0.38) / 0.62))) : 1.0;
      if (vertexSlide > 0.02) {
        const a1 = Math.abs(l1) > 1e-4 ? Math.min(6.5, 1 / Math.sqrt(Math.abs(l1))) : 0;
        const a2 = Math.abs(l2) > 1e-4 ? Math.min(6.5, 1 / Math.sqrt(Math.abs(l2))) : 0;

        // Vẽ khung hình chữ nhật cơ sở (bounding box tiếp tuyến tại đỉnh cho Elip hoặc hộp tiệm cận cho Hyperbol)
        if (a1 > 0 && a2 > 0) {
          const curA1 = a1 * vertexSlide;
          const curA2 = a2 * vertexSlide;
          const corners = [
            [curA1, curA2],
            [-curA1, curA2],
            [-curA1, -curA2],
            [curA1, -curA2]
          ].map(([y1, y2]) => [cosR * y1 - sinR * y2, sinR * y1 + cosR * y2]);

          ctx2d.save();
          ctx2d.strokeStyle = `rgba(148, 163, 184, ${0.48 * vertexSlide})`;
          ctx2d.lineWidth = 1.3;
          ctx2d.setLineDash([4, 4]);
          ctx2d.beginPath();
          corners.forEach(([wx, wy], idx) => {
            if (idx === 0) ctx2d.moveTo(wX(wx), wY(wy));
            else ctx2d.lineTo(wX(wx), wY(wy));
          });
          ctx2d.closePath();
          ctx2d.stroke();

          // Nếu là Hyperbol (l1 * l2 < 0), vẽ thêm 2 đường tiệm cận chéo đi qua 4 góc của hộp cơ sở!
          if (l1 * l2 < -1e-5) {
            ctx2d.strokeStyle = `rgba(245, 158, 11, ${0.42 * vertexSlide})`;
            ctx2d.beginPath();
            ctx2d.moveTo(wX(corners[0][0] * 1.8), wY(corners[0][1] * 1.8));
            ctx2d.lineTo(wX(corners[2][0] * 1.8), wY(corners[2][1] * 1.8));
            ctx2d.moveTo(wX(corners[1][0] * 1.8), wY(corners[1][1] * 1.8));
            ctx2d.lineTo(wX(corners[3][0] * 1.8), wY(corners[3][1] * 1.8));
            ctx2d.stroke();
          }
          ctx2d.restore();
        }

        // Vẽ các chấm tròn đánh dấu đỉnh thực trên trục riêng
        const drawVertexDot = (wx, wy, color) => {
          ctx2d.save();
          ctx2d.fillStyle = color;
          ctx2d.strokeStyle = "#ffffff";
          ctx2d.lineWidth = 1.6;
          ctx2d.beginPath();
          ctx2d.arc(wX(wx), wY(wy), 4.5, 0, Math.PI * 2);
          ctx2d.fill();
          ctx2d.stroke();
          ctx2d.restore();
        };

        if (a1 > 0) {
          const d1 = a1 * vertexSlide;
          drawVertexDot(cosR * d1, sinR * d1, "#00e5ff");
          drawVertexDot(-cosR * d1, -sinR * d1, "#00e5ff");
        }
        if (a2 > 0) {
          const d2 = a2 * vertexSlide;
          drawVertexDot(-sinR * d2, cosR * d2, "#f59e0b");
          drawVertexDot(sinR * d2, -cosR * d2, "#f59e0b");
        }
      }

      ctx2d.restore();
    },

    // =========================================================================
    // KẾT XUẤT KHÔNG GIAN 3D LIỀN MẠCH QUA 3 BƯỚC (viewer3D.js Hook)
    // - Với ma trận 2x2 khi xem ở 3D: Dựng mặt bậc hai z = Q(x,y) = ax^2 + 2bxy + cy^2
    //   cắt bởi mặt phẳng ngang z = 1 tạo ra đường giao tuyến Conic!
    // - Với ma trận 3x3: Dựng mặt bậc hai 3D thực thụ Q(x1,x2,x3) = 1 cùng khung lưới riêng 3D!
    // =========================================================================
    render3D(parentGroup) {
      if (!this._active || !this._analysis || !window.THREE || !parentGroup) return;

      this._frame3DCameraIfNeeded();

      const an = this._analysis;
      const curPhase = this._currentPhase;
      const p = this._phaseProgress;
      const s = smoothstep(p);

      if (!this._threeGroup) {
        this._threeGroup = new THREE.Group();
        this._threeGroup.name = "ConicAnimator_3DGroup";
      }

      while (this._threeGroup.children.length > 0) {
        const obj = this._threeGroup.children[0];
        this._threeGroup.remove(obj);
        if (obj.geometry) obj.geometry.dispose?.();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m?.dispose?.());
        else obj.material?.dispose?.();
      }

      if (this._threeGroup.parent !== parentGroup) {
        parentGroup.add(this._threeGroup);
      }

      // ---------------------------------------------------------------------
      // TRƯỜNG HỢP 1: MA TRẬN 2x2 KHI BẬT SANG CHẾ ĐỘ 3D
      // Trực quan hóa mặt bậc hai z = Q(x,y) cắt bởi mặt phẳng mức ngang tạo ra đường giao tuyến Conic
      // và chiếu vuông góc xuống mặt phẳng đáy Oxy (z = 0)!
      // ---------------------------------------------------------------------
      if (!an.is3D) {
        const a = an.matrix[0][0];
        const b = an.matrix[0][1];
        const c = an.matrix[1][1];

        const specFinal = decomposeSymmetricMatrix([
          [a, b],
          [b, c]
        ]);
        const [l1Final, l2Final] = specFinal.eigenvalues;
        const l1 = curPhase === 0 ? (1 - s) * a + s * l1Final : l1Final;
        const l2 = curPhase === 0 ? (1 - s) * c + s * l2Final : l2Final;

        const rotT = curPhase === 2 ? smoothstep(Math.max(0, Math.min(1.0, (p - 0.42) / 0.58))) : 0;
        const curTheta = curPhase === 0 ? s * specFinal.theta2D : (1 - rotT) * specFinal.theta2D;
        const rotMat = new THREE.Matrix4().makeRotationZ(curTheta);

        const effL1 = l1 < -1e-5 && l2 < -1e-5 ? -l1 : l1;
        const effL2 = l1 < -1e-5 && l2 < -1e-5 ? -l2 : l2;
        const isElliptic = effL1 > 1e-4 && effL2 > 1e-4;
        const a1 = Math.abs(effL1) > 1e-4 ? Math.min(3.8, 1 / Math.sqrt(Math.abs(effL1))) : 1.8;
        const a2 = Math.abs(effL2) > 1e-4 ? Math.min(3.8, 1 / Math.sqrt(Math.abs(effL2))) : 1.8;

        // Độ cao quy chuẩn của mặt phẳng mức cắt ngang Q(x,y) = 1
        const zSlice = 1.05;
        const surfColor = curPhase === 2 && rotT > 0.85 ? 0x10b981 : 0x0284c7;

        if (isElliptic) {
          // Tham số hóa Paraboloid Elip theo các vòng mức đồng tâm rho in [0, 1.32]
          // để vành trên cùng của chảo 3D phẳng đẹp tuyệt đối, không bị nhọn góc!
          const rhoSegs = 14;
          const phiSegs = 48;
          const rhoMax = 1.32;
          const positions = [];
          const indices = [];

          for (let i = 0; i <= rhoSegs; i++) {
            const rho = (i / rhoSegs) * rhoMax;
            const zVal = zSlice * rho * rho;
            for (let j = 0; j <= phiSegs; j++) {
              const phi = (j / phiSegs) * Math.PI * 2;
              const y1 = rho * a1 * Math.cos(phi);
              const y2 = rho * a2 * Math.sin(phi);
              const v = new THREE.Vector3(y1, y2, zVal).applyMatrix4(rotMat);
              positions.push(v.x, v.y, v.z);
            }
          }
          for (let i = 0; i < rhoSegs; i++) {
            for (let j = 0; j < phiSegs; j++) {
              const aIdx = i * (phiSegs + 1) + j;
              const bIdx = (i + 1) * (phiSegs + 1) + j;
              const cIdx = (i + 1) * (phiSegs + 1) + (j + 1);
              const dIdx = i * (phiSegs + 1) + (j + 1);
              indices.push(aIdx, bIdx, dIdx, bIdx, cIdx, dIdx);
            }
          }
          const surfGeom = new THREE.BufferGeometry();
          surfGeom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
          surfGeom.setIndex(indices);
          surfGeom.computeVertexNormals();

          // Lớp màng bán trong suốt của mặt chảo Paraboloid
          this._threeGroup.add(
            new THREE.Mesh(
              surfGeom,
              new THREE.MeshBasicMaterial({
                color: surfColor,
                transparent: true,
                opacity: 0.11,
                side: THREE.DoubleSide,
                depthWrite: false
              })
            )
          );
          // Lớp lưới kinh tuyến - vĩ tuyến thanh mảnh
          this._threeGroup.add(
            new THREE.Mesh(
              surfGeom.clone(),
              new THREE.MeshBasicMaterial({
                color: surfColor,
                wireframe: true,
                transparent: true,
                opacity: 0.24,
                depthWrite: false
              })
            )
          );
        } else {
          // Mặt yên ngựa Hyperbolic Paraboloid trên miền đĩa tròn bán kính R
          const rSegs = 16;
          const phiSegs = 48;
          const rMax = Math.min(2.6, Math.max(a1, a2) * 1.35);
          const positions = [];
          const indices = [];
          for (let i = 0; i <= rSegs; i++) {
            const r = (i / rSegs) * rMax;
            for (let j = 0; j <= phiSegs; j++) {
              const phi = (j / phiSegs) * Math.PI * 2;
              const y1 = r * Math.cos(phi);
              const y2 = r * Math.sin(phi);
              const zRaw = (effL1 * y1 * y1 + effL2 * y2 * y2) * zSlice;
              const zVal = Math.max(-2.1, Math.min(2.1, zRaw));
              const v = new THREE.Vector3(y1, y2, zVal).applyMatrix4(rotMat);
              positions.push(v.x, v.y, v.z);
            }
          }
          for (let i = 0; i < rSegs; i++) {
            for (let j = 0; j < phiSegs; j++) {
              const aIdx = i * (phiSegs + 1) + j;
              const bIdx = (i + 1) * (phiSegs + 1) + j;
              const cIdx = (i + 1) * (phiSegs + 1) + (j + 1);
              const dIdx = i * (phiSegs + 1) + (j + 1);
              indices.push(aIdx, bIdx, dIdx, bIdx, cIdx, dIdx);
            }
          }
          const surfGeom = new THREE.BufferGeometry();
          surfGeom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
          surfGeom.setIndex(indices);
          this._threeGroup.add(
            new THREE.Mesh(
              surfGeom,
              new THREE.MeshBasicMaterial({
                color: surfColor,
                wireframe: true,
                transparent: true,
                opacity: 0.26,
                depthWrite: false
              })
            )
          );
        }

        // 2. Mặt phẳng cắt ngang z = zSlice (tương ứng Q(x,y) = 1) có viền sắc nét
        const planeHalf = Math.max(a1, a2) * 1.45;
        const planeGeom = new THREE.PlaneGeometry(planeHalf * 2, planeHalf * 2);
        const planeMesh = new THREE.Mesh(
          planeGeom,
          new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.09,
            side: THREE.DoubleSide,
            depthWrite: false
          })
        );
        planeMesh.position.z = zSlice;
        planeMesh.applyMatrix4(rotMat);
        this._threeGroup.add(planeMesh);

        const planeBorderPts = [
          new THREE.Vector3(-planeHalf, -planeHalf, zSlice).applyMatrix4(rotMat),
          new THREE.Vector3(planeHalf, -planeHalf, zSlice).applyMatrix4(rotMat),
          new THREE.Vector3(planeHalf, planeHalf, zSlice).applyMatrix4(rotMat),
          new THREE.Vector3(-planeHalf, planeHalf, zSlice).applyMatrix4(rotMat),
          new THREE.Vector3(-planeHalf, -planeHalf, zSlice).applyMatrix4(rotMat)
        ];
        this._threeGroup.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(planeBorderPts),
            new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.42 })
          )
        );

        // 3. Đường giao tuyến Conic trên mặt phẳng cắt (z = zSlice) và hình chiếu vuông góc trên mặt phẳng đáy Oxy (z = 0)
        const addConic3DCurve = (zHeight, colorHex, opacity) => {
          if (isElliptic) {
            const pts = [];
            for (let k = 0; k <= 96; k++) {
              const phi = (k / 96) * Math.PI * 2;
              const v = new THREE.Vector3(a1 * Math.cos(phi), a2 * Math.sin(phi), zHeight).applyMatrix4(rotMat);
              pts.push(v);
            }
            this._threeGroup.add(
              new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(pts),
                new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity })
              )
            );
          } else if (effL1 * effL2 < -1e-5) {
            const firstPos = effL1 > 0;
            const aAxis = firstPos ? a1 : a2;
            const bAxis = firstPos ? a2 : a1;
            for (const sgn of [-1, 1]) {
              const pts = [];
              for (let k = 0; k <= 60; k++) {
                const u = -1.35 + (k / 60) * 2.7;
                const y1 = firstPos ? sgn * aAxis * Math.cosh(u) : bAxis * Math.sinh(u);
                const y2 = firstPos ? bAxis * Math.sinh(u) : sgn * aAxis * Math.cosh(u);
                const v = new THREE.Vector3(y1, y2, zHeight).applyMatrix4(rotMat);
                pts.push(v);
              }
              this._threeGroup.add(
                new THREE.Line(
                  new THREE.BufferGeometry().setFromPoints(pts),
                  new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity })
                )
              );
            }
          }
        };
        addConic3DCurve(zSlice, 0x00e5ff, 0.98);
        addConic3DCurve(0, curPhase === 2 && rotT > 0.85 ? 0x10b981 : 0x0284c7, 0.92);

        // 4. Các đường gióng chiếu thẳng đứng từ 4 đỉnh trên lát cắt z = zSlice xuống 4 đỉnh trên mặt đáy Oxy (z = 0)
        //    cùng 2 trục đối xứng vuông góc e_1 perp e_2 và khung tiếp tuyến ở Bước 2 & Bước 3
        const vertCoords = isElliptic
          ? [
              [a1, 0, 0x00e5ff],
              [-a1, 0, 0x00e5ff],
              [0, a2, 0xf59e0b],
              [0, -a2, 0xf59e0b]
            ]
          : effL1 > 0
            ? [
                [a1, 0, 0x00e5ff],
                [-a1, 0, 0x00e5ff]
              ]
            : [
                [0, a2, 0xf59e0b],
                [0, -a2, 0xf59e0b]
              ];

        for (const [vy1, vy2, vCol] of vertCoords) {
          const pTop = new THREE.Vector3(vy1, vy2, zSlice).applyMatrix4(rotMat);
          const pBot = new THREE.Vector3(vy1, vy2, 0).applyMatrix4(rotMat);
          const dropLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([pTop, pBot]),
            new THREE.LineDashedMaterial({
              color: vCol,
              dashSize: 0.14,
              gapSize: 0.1,
              transparent: true,
              opacity: 0.72
            })
          );
          dropLine.computeLineDistances();
          this._threeGroup.add(dropLine);

          if (curPhase >= 1) {
            const dotGeom = new THREE.SphereGeometry(0.075, 12, 10);
            const dotMat = new THREE.MeshBasicMaterial({ color: vCol });
            const dotTop = new THREE.Mesh(dotGeom, dotMat);
            dotTop.position.copy(pTop);
            const dotBot = new THREE.Mesh(dotGeom.clone(), dotMat);
            dotBot.position.copy(pBot);
            this._threeGroup.add(dotTop, dotBot);
          }
        }

        if (curPhase >= 1) {
          const axisGrow = curPhase === 1 ? smoothstep(Math.min(1.0, p / 0.4)) : 1.0;
          const span1 = (a1 + 1.8) * axisGrow;
          const span2 = (a2 + 1.8) * axisGrow;

          const ax1 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(-span1, 0, 0).applyMatrix4(rotMat),
              new THREE.Vector3(span1, 0, 0).applyMatrix4(rotMat)
            ]),
            new THREE.LineDashedMaterial({ color: 0x00e5ff, dashSize: 0.22, gapSize: 0.12, transparent: true, opacity: 0.8 })
          );
          ax1.computeLineDistances();

          const ax2 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(0, -span2, 0).applyMatrix4(rotMat),
              new THREE.Vector3(0, span2, 0).applyMatrix4(rotMat)
            ]),
            new THREE.LineDashedMaterial({ color: 0xf59e0b, dashSize: 0.22, gapSize: 0.12, transparent: true, opacity: 0.8 })
          );
          ax2.computeLineDistances();
          this._threeGroup.add(ax1, ax2);

          // Ký hiệu góc vuông 90 deg trên mặt phẳng Oxy tại gốc O
          const sq = 0.28;
          const sqPts = [
            new THREE.Vector3(sq, 0, 0.01).applyMatrix4(rotMat),
            new THREE.Vector3(sq, sq, 0.01).applyMatrix4(rotMat),
            new THREE.Vector3(0, sq, 0.01).applyMatrix4(rotMat)
          ];
          this._threeGroup.add(
            new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(sqPts),
              new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.95 })
            )
          );

          // Khung hình chữ nhật tiếp tuyến bán trục trên mặt phẳng đáy Oxy
          const boxSlide = curPhase === 1 ? smoothstep(Math.max(0, Math.min(1.0, (p - 0.38) / 0.62))) : 1.0;
          if (boxSlide > 0.02) {
            const ba1 = a1 * boxSlide;
            const ba2 = a2 * boxSlide;
            const bPts = [
              new THREE.Vector3(ba1, ba2, 0.01).applyMatrix4(rotMat),
              new THREE.Vector3(-ba1, ba2, 0.01).applyMatrix4(rotMat),
              new THREE.Vector3(-ba1, -ba2, 0.01).applyMatrix4(rotMat),
              new THREE.Vector3(ba1, -ba2, 0.01).applyMatrix4(rotMat),
              new THREE.Vector3(ba1, ba2, 0.01).applyMatrix4(rotMat)
            ];
            const boxLine = new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(bPts),
              new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.16, gapSize: 0.1, transparent: true, opacity: 0.65 })
            );
            boxLine.computeLineDistances();
            this._threeGroup.add(boxLine);
          }
        }

        // Bước 3: Hệ lưới tọa độ mới Oy_1y_2 trên mặt phẳng đáy Oxy cùng xoay về chính tắc
        if (curPhase === 2) {
          const gridFade = smoothstep(Math.min(1.0, p / 0.38));
          const N = 4;
          const gPts = [];
          for (let k = -N; k <= N; k++) {
            gPts.push(
              new THREE.Vector3(-N, k, 0.005).applyMatrix4(rotMat),
              new THREE.Vector3(N, k, 0.005).applyMatrix4(rotMat),
              new THREE.Vector3(k, -N, 0.005).applyMatrix4(rotMat),
              new THREE.Vector3(k, N, 0.005).applyMatrix4(rotMat)
            );
          }
          this._threeGroup.add(
            new THREE.LineSegments(
              new THREE.BufferGeometry().setFromPoints(gPts),
              new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.32 * gridFade })
            )
          );
        }
        return;
      }

      // ---------------------------------------------------------------------
      // TRƯỜNG HỢP 2: MA TRẬN ĐỐI XỨNG 3x3 (MẶT BẬC HAI QUADRIC 3D THỰC THỤ)
      // ---------------------------------------------------------------------
      // Tính hệ phổ tức thời: ở Bước 1 nội suy bật dần các số hạng ngoài đường chéo
      const tCross = curPhase === 0 ? s : 1.0;
      const MNow = getInterpolatedMatrix(an, tCross);
      const specNow = curPhase === 0 ? decomposeSymmetricMatrix(MNow) : an;

      const [l1, l2, l3] = specNow.eigenvalues;
      const a1 = Math.max(0.3, Math.min(4.8, 1 / Math.sqrt(Math.max(1e-4, Math.abs(l1)))));
      const a2 = Math.max(0.3, Math.min(4.8, 1 / Math.sqrt(Math.max(1e-4, Math.abs(l2)))));
      const a3 = Math.max(0.3, Math.min(4.8, 1 / Math.sqrt(Math.max(1e-4, Math.abs(l3)))));

      // Ma trận xoay hiện tại từ hệ trục riêng ra không gian
      const rotT = curPhase === 2 ? smoothstep(Math.max(0, Math.min(1.0, (p - 0.42) / 0.58))) : 0;
      const curAngle3D = (1 - rotT) * specNow.rotAngle3D;
      const axisVec3D = new THREE.Vector3(specNow.rotAxis3D[0], specNow.rotAxis3D[1], specNow.rotAxis3D[2]);
      const currentRotMat = new THREE.Matrix4().makeRotationFromQuaternion(
        new THREE.Quaternion().setFromAxisAngle(axisVec3D, curAngle3D)
      );

      // Hàm tạo hình học mặt bậc hai chuẩn theo dấu của (l1, l2, l3)
      const buildQuadricGeometry = (r1, r2, r3, eig1, eig2, eig3) => {
        const posCount = [eig1, eig2, eig3].filter((x) => x > 1e-4).length;
        const negCount = [eig1, eig2, eig3].filter((x) => x < -1e-4).length;

        if (posCount === 3 || negCount === 3) {
          // Elipsoid: y1^2/r1^2 + y2^2/r2^2 + y3^2/r3^2 = 1
          const geom = new THREE.SphereGeometry(1, 28, 20);
          geom.scale(r1, r2, r3);
          return geom;
        }

        // Hyperboloid 1 tầng (2 dương, 1 âm): y1^2/r1^2 + y2^2/r2^2 - y3^2/r3^2 = 1
        // Vì eigenvalues đã sắp giảm dần l1 >= l2 >= l3, nên l1 > 0, l2 > 0, l3 < 0
        const uSegs = 28;
        const vSegs = 18;
        const verts = [];
        const idxs = [];
        if (posCount === 2 && negCount === 1) {
          const uMax = 1.25;
          for (let i = 0; i <= vSegs; i++) {
            const u = -uMax + (i / vSegs) * (2 * uMax);
            const ch = Math.cosh(u);
            const sh = Math.sinh(u);
            for (let j = 0; j <= uSegs; j++) {
              const phi = (j / uSegs) * Math.PI * 2;
              verts.push(r1 * ch * Math.cos(phi), r2 * ch * Math.sin(phi), r3 * sh);
            }
          }
        } else {
          // Mặt trụ bậc hai hoặc Hyperboloid 2 tầng
          const hMax = 2.4;
          for (let i = 0; i <= vSegs; i++) {
            const z = -hMax + (i / vSegs) * (2 * hMax);
            for (let j = 0; j <= uSegs; j++) {
              const phi = (j / uSegs) * Math.PI * 2;
              verts.push(r1 * Math.cos(phi), r2 * Math.sin(phi), z);
            }
          }
        }
        for (let i = 0; i < vSegs; i++) {
          for (let j = 0; j < uSegs; j++) {
            const aIdx = i * (uSegs + 1) + j;
            const bIdx = (i + 1) * (uSegs + 1) + j;
            const cIdx = (i + 1) * (uSegs + 1) + (j + 1);
            const dIdx = i * (uSegs + 1) + (j + 1);
            idxs.push(aIdx, bIdx, dIdx, bIdx, cIdx, dIdx);
          }
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
        geom.setIndex(idxs);
        return geom;
      };

      const quadGeom = buildQuadricGeometry(a1, a2, a3, l1, l2, l3);

      // 1. Ở Bước 1 (khi có số hạng chéo) hoặc Bước 3 (khi đang quay về chính tắc), vẽ khung mờ đối chiếu
      if ((curPhase === 0 && an.hasOffDiag) || (curPhase === 2 && rotT > 0.02)) {
        const ghostGeom = quadGeom.clone();
        const ghostMesh = new THREE.Mesh(
          ghostGeom,
          new THREE.MeshBasicMaterial({
            color: 0x64748b,
            wireframe: true,
            transparent: true,
            opacity: 0.16
          })
        );
        if (curPhase === 2) {
          const initMat = new THREE.Matrix4().makeRotationFromQuaternion(
            new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(an.rotAxis3D[0], an.rotAxis3D[1], an.rotAxis3D[2]),
              an.rotAngle3D
            )
          );
          ghostMesh.applyMatrix4(initMat);
        }
        this._threeGroup.add(ghostMesh);
      }

      // 2. Vẽ mặt bậc hai chính đang biến đổi / xoay
      const quadMesh = new THREE.Mesh(
        quadGeom,
        new THREE.MeshBasicMaterial({
          color: curPhase === 2 && rotT > 0.85 ? 0x10b981 : 0x0284c7,
          wireframe: true,
          transparent: true,
          opacity: 0.42
        })
      );
      quadMesh.applyMatrix4(currentRotMat);
      this._threeGroup.add(quadMesh);

      // 3. Bước 2 & Bước 3: Vẽ 3 trục đối xứng nét đứt vuông góc + Ký hiệu góc vuông 3D + Hộp cơ sở chính tắc
      if (curPhase >= 1) {
        const axisGrow = curPhase === 1 ? smoothstep(Math.min(1.0, p / 0.4)) : 1.0;
        const axisColors = [0x00e5ff, 0xf59e0b, 0x10b981];
        const radii = [a1, a2, a3];

        for (let k = 0; k < 3; k++) {
          const span = (radii[k] + 2.2) * axisGrow;
          const pA = new THREE.Vector3(
            k === 0 ? -span : 0,
            k === 1 ? -span : 0,
            k === 2 ? -span : 0
          ).applyMatrix4(currentRotMat);
          const pB = new THREE.Vector3(
            k === 0 ? span : 0,
            k === 1 ? span : 0,
            k === 2 ? span : 0
          ).applyMatrix4(currentRotMat);

          const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([pA, pB]),
            new THREE.LineDashedMaterial({
              color: axisColors[k],
              dashSize: 0.28,
              gapSize: 0.14,
              transparent: true,
              opacity: 0.75
            })
          );
          line.computeLineDistances();
          this._threeGroup.add(line);
        }

        // Khung hộp cơ sở chính tắc (Bounding Box 2*a1 x 2*a2 x 2*a3) ở nửa sau Bước 2 và Bước 3
        const boxSlide = curPhase === 1 ? smoothstep(Math.max(0, Math.min(1.0, (p - 0.38) / 0.62))) : 1.0;
        if (boxSlide > 0.02) {
          const boxGeom = new THREE.BoxGeometry(2 * a1 * boxSlide, 2 * a2 * boxSlide, 2 * a3 * boxSlide);
          const edges = new THREE.EdgesGeometry(boxGeom);
          const boxLines = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({
              color: curPhase === 2 ? 0x10b981 : 0x94a3b8,
              transparent: true,
              opacity: curPhase === 2 ? 0.55 : 0.35
            })
          );
          boxLines.applyMatrix4(currentRotMat);
          this._threeGroup.add(boxLines);
          boxGeom.dispose();
        }
      }
    }
  };
})();
