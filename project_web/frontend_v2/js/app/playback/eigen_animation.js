// ==================================================================================
// EIGENVALUE, EIGENVECTOR & DIAGONALIZATION PLAYBACK ENGINE (ACADEMIC ARCHITECTURE)
// Trực quan hóa Trị riêng, Vector riêng và Chéo hóa Ma trận (2D Canvas & 3D Three.js)
// Kịch bản 4 Bước Động học Chuẩn Bản chất Đại số Tuyến tính:
//   Bước 1: Quét la bàn u -> Au trên đường tròn đơn vị phát hiện Phương bất biến (Au // u)
//           -> Khóa trục riêng E_lambda và làm xuất hiện các Vector riêng v_i
//   Bước 2: Biến đổi không gian I -> A - Các ô lưới lệch phương bị trượt/xoay, riêng các
//           Vector riêng v_i nằm yên trên trục bất biến và co giãn đúng bằng hệ số trị riêng lambda_i
//   Bước 3: Đổi sang Cơ sở Vector riêng (P^-1) - Xem hệ vector riêng {v_i} là cơ sở đơn vị
//           của không gian mới và dời cùng mặt lưới riêng về trùng khít hệ trục chuẩn
//   Bước 4: Bản chất Chéo hóa (A = P D P^-1) - Trên hệ trục cơ sở vector riêng đã chuẩn hóa,
//           phép biến đổi A trở thành ma trận đường chéo D = diag(lambda_1, lambda_2, ...)
//           co giãn thuần túy độc lập dọc theo từng trục tọa độ
// ==================================================================================
(function () {
  window.App = window.App || {};

  function smoothstep(t) {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
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

  // Chuẩn hóa vector riêng về dạng tọa độ đẹp (ưu tiên số nguyên nhỏ hoặc thành phần lớn nhất = 1)
  function canonicalizeEigenvector(vec) {
    const d = vec.length;
    let maxAbs = 0;
    let firstNonZeroSign = 1;
    for (let i = 0; i < d; i++) {
      const a = Math.abs(vec[i]);
      if (a > maxAbs) maxAbs = a;
      if (a > 1e-5 && firstNonZeroSign === 1) {
        firstNonZeroSign = vec[i] < 0 ? -1 : 1;
      }
    }
    if (maxAbs < 1e-8) {
      return d === 3 ? [1, 0, 0] : [1, 0];
    }
    // Chia cho maxAbs và đảm bảo thành phần khác 0 đầu tiên dương
    let v = vec.map((x) => (x / maxAbs) * firstNonZeroSign);
    // Kiểm tra xem nhân với 1, 2, 3 có ra số nguyên đẹp mà độ dài không quá lớn không
    for (let mult = 1; mult <= 3; mult++) {
      const cand = v.map((x) => x * mult);
      const allInt = cand.every((x) => Math.abs(x - Math.round(x)) < 1e-3);
      const len = Math.hypot(...cand);
      if (allInt && len <= 2.6) {
        return cand.map((x) => {
          const r = Math.round(x);
          return Object.is(r, -0) ? 0 : r;
        });
      }
    }
    return v.map((x) => (Math.abs(x) < 1e-5 ? 0 : Number(x.toFixed(4))));
  }

  // Tìm cơ sở không gian nghiệm của (A - lambda*I)x = 0 cho ma trận 2x2 hoặc 3x3
  function computeNullspaceBasis(M, eps = 1e-5) {
    const n = M.length;
    const A = M.map((row) => row.map((v) => Number(v) || 0));
    const pivotCols = [];
    let r = 0;

    for (let c = 0; c < n && r < n; c++) {
      let maxRow = r;
      let maxVal = Math.abs(A[r][c]);
      for (let i = r + 1; i < n; i++) {
        if (Math.abs(A[i][c]) > maxVal) {
          maxVal = Math.abs(A[i][c]);
          maxRow = i;
        }
      }
      if (maxVal < eps) continue;
      const tmp = A[r];
      A[r] = A[maxRow];
      A[maxRow] = tmp;

      const pv = A[r][c];
      for (let j = c; j < n; j++) A[r][j] /= pv;
      for (let i = 0; i < n; i++) {
        if (i !== r && Math.abs(A[i][c]) > 1e-9) {
          const f = A[i][c];
          for (let j = c; j < n; j++) A[i][j] -= f * A[r][j];
        }
      }
      pivotCols.push(c);
      r++;
    }

    const freeCols = [];
    for (let c = 0; c < n; c++) {
      if (!pivotCols.includes(c)) freeCols.push(c);
    }

    if (freeCols.length === 0) {
      // Fallback tìm vector kỳ dị nhỏ nhất nếu sai số số học làm mất biến tự do
      if (n === 2) {
        const r0 = M[0][0] * M[0][0] + M[0][1] * M[0][1];
        const r1 = M[1][0] * M[1][0] + M[1][1] * M[1][1];
        const row = r0 >= r1 ? M[0] : M[1];
        if (Math.hypot(row[0], row[1]) < 1e-8) return [[1, 0]];
        return [canonicalizeEigenvector([-row[1], row[0]])];
      }
      // 3D fallback bằng tích có hướng của 2 dòng lớn nhất
      const rows = M.map((row, idx) => ({ row, norm: Math.hypot(...row), idx }));
      rows.sort((a, b) => b.norm - a.norm);
      const u = rows[0].row;
      const v = rows[1].row;
      const cr = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0]
      ];
      if (Math.hypot(...cr) > 1e-6) {
        return [canonicalizeEigenvector(cr)];
      }
      return [[1, 0, 0]];
    }

    const basis = [];
    for (const fc of freeCols) {
      const vec = new Array(n).fill(0);
      vec[fc] = 1;
      for (let idx = pivotCols.length - 1; idx >= 0; idx--) {
        const pc = pivotCols[idx];
        let sum = 0;
        for (let j = pc + 1; j < n; j++) {
          sum += A[idx][j] * vec[j];
        }
        vec[pc] = -sum;
      }
      basis.push(canonicalizeEigenvector(vec));
    }
    return basis;
  }

  // Giải phương trình bậc 3: x^3 + a*x^2 + b*x + c = 0
  function solveCubicRealRoots(a, b, c) {
    // Kiểm tra nghiệm nguyên/hữu tỷ nhỏ trước để đạt độ chính xác tuyệt đối cho bài tập giáo trình
    const candidates = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 0.5, -0.5, 1.5, -1.5];
    for (const r of candidates) {
      const val = ((r + a) * r + b) * r + c;
      if (Math.abs(val) < 1e-7) {
        // Chia đa thức (x - r)(x^2 + B*x + C) = 0
        const B = a + r;
        const C = b + B * r;
        const delta = B * B - 4 * C;
        if (delta < -1e-7) {
          return { realRoots: [r], hasComplex: true, complexPair: { re: -B / 2, im: Math.sqrt(-delta) / 2 } };
        }
        const sq = Math.sqrt(Math.max(0, delta));
        const r2 = (-B + sq) / 2;
        const r3 = (-B - sq) / 2;
        return { realRoots: [r, r2, r3].sort((x, y) => y - x), hasComplex: false };
      }
    }

    const p = b - (a * a) / 3;
    const q = (2 * a * a * a) / 27 - (a * b) / 3 + c;
    const disc = (q * q) / 4 + (p * p * p) / 27;

    if (disc > 1e-9) {
      const sq = Math.sqrt(disc);
      const u = Math.cbrt(-q / 2 + sq);
      const v = Math.cbrt(-q / 2 - sq);
      const r1 = u + v - a / 3;
      const re = -(u + v) / 2 - a / 3;
      const im = (Math.sqrt(3) / 2) * Math.abs(u - v);
      return { realRoots: [r1], hasComplex: true, complexPair: { re, im } };
    } else if (Math.abs(disc) <= 1e-9) {
      const u = Math.cbrt(-q / 2);
      const r1 = 2 * u - a / 3;
      const r2 = -u - a / 3;
      return { realRoots: [r1, r2, r2].sort((x, y) => y - x), hasComplex: false };
    } else {
      const r = Math.sqrt(Math.max(0, -(p * p * p) / 27));
      const phi = Math.acos(Math.max(-1, Math.min(1, -q / (2 * r))));
      const m = 2 * Math.cbrt(r);
      const r1 = m * Math.cos(phi / 3) - a / 3;
      const r2 = m * Math.cos((phi + 2 * Math.PI) / 3) - a / 3;
      const r3 = m * Math.cos((phi + 4 * Math.PI) / 3) - a / 3;
      return { realRoots: [r1, r2, r3].sort((x, y) => y - x), hasComplex: false };
    }
  }

  // Giải toàn diện bài toán Trị riêng - Vector riêng - Chéo hóa cho ma trận vuông 2x2 hoặc 3x3
  function solveEigenSystem(rawMat) {
    const n = Array.isArray(rawMat) ? rawMat.length : 2;
    if (n === 2) {
      const a = Number(rawMat[0]?.[0] || 0);
      const b = Number(rawMat[0]?.[1] || 0);
      const c = Number(rawMat[1]?.[0] || 0);
      const d = Number(rawMat[1]?.[1] || 0);
      const M = [
        [a, b],
        [c, d]
      ];
      const trace = a + d;
      const det = a * d - b * c;
      const delta = trace * trace - 4 * det;

      if (delta < -1e-7) {
        const re = trace / 2;
        const im = Math.sqrt(-delta) / 2;
        return {
          dim: 2,
          matrix: M,
          trace,
          det,
          delta,
          isComplex: true,
          complexPair: { re, im },
          eigenvalues: [],
          distinctEigenvalues: [],
          eigenvectors: [],
          eigenPairs: [],
          isDiagonalizable: false,
          reasonNotDiag: "Phương trình đặc trưng có biệt thức Δ < 0 (nghiệm phức liên hợp), nên không tồn tại phương bất biến hay vector riêng thực trong R²."
        };
      }

      const sq = Math.sqrt(Math.max(0, delta));
      let l1 = (trace + sq) / 2;
      let l2 = (trace - sq) / 2;
      if (Math.abs(l1 - Math.round(l1)) < 1e-6) l1 = Math.round(l1);
      if (Math.abs(l2 - Math.round(l2)) < 1e-6) l2 = Math.round(l2);

      const isRepeated = Math.abs(l1 - l2) < 1e-5;
      const distinct = isRepeated ? [{ lambda: l1, algMult: 2 }] : [{ lambda: l1, algMult: 1 }, { lambda: l2, algMult: 1 }];
      const eigenPairs = [];
      const eigenvectors = [];

      for (const item of distinct) {
        const lam = item.lambda;
        const shifted = [
          [a - lam, b],
          [c, d - lam]
        ];
        const basis = computeNullspaceBasis(shifted);
        item.geoMult = basis.length;
        item.basis = basis;
        for (const v of basis) {
          eigenvectors.push(v);
          eigenPairs.push({ lambda: lam, vec: v, algMult: item.algMult, geoMult: basis.length });
        }
      }

      const isDiagonalizable = eigenPairs.length === 2;
      let P = null;
      let PInv = null;
      let D = null;
      if (isDiagonalizable) {
        const v1 = eigenPairs[0].vec;
        let v2 = eigenPairs[1].vec;
        let detP = v1[0] * v2[1] - v1[1] * v2[0];
        if (detP < -1e-7) {
          v2 = v2.map((x) => (Object.is(-x, -0) ? 0 : -x));
          eigenPairs[1].vec = v2;
          eigenvectors[1] = v2;
          if (distinct.length > 1 && distinct[1].basis && distinct[1].basis.length > 0) {
            distinct[1].basis[0] = v2;
          }
          detP = -detP;
        }
        P = [
          [v1[0], v2[0]],
          [v1[1], v2[1]]
        ];
        if (Math.abs(detP) > 1e-7) {
          PInv = [
            [P[1][1] / detP, -P[0][1] / detP],
            [-P[1][0] / detP, P[0][0] / detP]
          ];
        }
        D = [
          [eigenPairs[0].lambda, 0],
          [0, eigenPairs[1].lambda]
        ];
      }

      return {
        dim: 2,
        matrix: M,
        trace,
        det,
        delta,
        isComplex: false,
        isRepeated,
        eigenvalues: [l1, l2],
        distinctEigenvalues: distinct,
        eigenvectors,
        eigenPairs,
        isDiagonalizable,
        P,
        PInv,
        D,
        reasonNotDiag: isDiagonalizable
          ? ""
          : `Trị riêng bội λ = ${formatScalar(l1)} có bội đại số bằng 2 nhưng số chiều không gian riêng chỉ bằng 1 (thiếu vector riêng độc lập tuyến tính).`
      };
    }

    // Ma trận 3x3
    const M = [
      [Number(rawMat[0]?.[0] || 0), Number(rawMat[0]?.[1] || 0), Number(rawMat[0]?.[2] || 0)],
      [Number(rawMat[1]?.[0] || 0), Number(rawMat[1]?.[1] || 0), Number(rawMat[1]?.[2] || 0)],
      [Number(rawMat[2]?.[0] || 0), Number(rawMat[2]?.[1] || 0), Number(rawMat[2]?.[2] || 0)]
    ];
    const trace = M[0][0] + M[1][1] + M[2][2];
    const minor11 = M[1][1] * M[2][2] - M[1][2] * M[2][1];
    const minor22 = M[0][0] * M[2][2] - M[0][2] * M[2][0];
    const minor33 = M[0][0] * M[1][1] - M[0][1] * M[1][0];
    const c1 = minor11 + minor22 + minor33;
    const det =
      M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
      M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
      M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);

    // Đa thức: lambda^3 - trace*lambda^2 + c1*lambda - det = 0
    const cubic = solveCubicRealRoots(-trace, c1, -det);
    const cleanedRoots = cubic.realRoots.map((r) => (Math.abs(r - Math.round(r)) < 1e-5 ? Math.round(r) : Number(r.toFixed(5))));

    // Gom nhóm nghiệm phân biệt
    const distinct = [];
    for (const r of cleanedRoots) {
      const found = distinct.find((d) => Math.abs(d.lambda - r) < 1e-4);
      if (found) {
        found.algMult++;
      } else {
        distinct.push({ lambda: r, algMult: 1 });
      }
    }

    const eigenPairs = [];
    const eigenvectors = [];
    for (const item of distinct) {
      const lam = item.lambda;
      const shifted = [
        [M[0][0] - lam, M[0][1], M[0][2]],
        [M[1][0], M[1][1] - lam, M[1][2]],
        [M[2][0], M[2][1], M[2][2] - lam]
      ];
      const basis = computeNullspaceBasis(shifted);
      item.geoMult = basis.length;
      item.basis = basis;
      for (const v of basis) {
        eigenvectors.push(v);
        eigenPairs.push({ lambda: lam, vec: v, algMult: item.algMult, geoMult: basis.length });
      }
    }

    const isDiagonalizable = !cubic.hasComplex && eigenPairs.length === 3;
    let P = null;
    let D = null;
    if (isDiagonalizable) {
      const v1 = eigenPairs[0].vec;
      const v2 = eigenPairs[1].vec;
      const v3 = eigenPairs[2].vec;
      P = [
        [v1[0], v2[0], v3[0]],
        [v1[1], v2[1], v3[1]],
        [v1[2], v2[2], v3[2]]
      ];
      D = [
        [eigenPairs[0].lambda, 0, 0],
        [0, eigenPairs[1].lambda, 0],
        [0, 0, eigenPairs[2].lambda]
      ];
    }

    return {
      dim: 3,
      matrix: M,
      trace,
      c1,
      det,
      isComplex: cubic.hasComplex,
      complexPair: cubic.complexPair || null,
      eigenvalues: cleanedRoots,
      distinctEigenvalues: distinct,
      eigenvectors,
      eigenPairs,
      isDiagonalizable,
      P,
      D,
      reasonNotDiag: isDiagonalizable
        ? ""
        : cubic.hasComplex
          ? "Ma trận có cặp trị riêng phức liên hợp nên không chéo hóa được trên trường số thực R."
          : "Tổng số chiều các không gian riêng nhỏ hơn 3 nên ma trận không đủ 3 vector riêng độc lập tuyến tính."
    };
  }

  const STD_COLORS = ["#ef4444", "#f59e0b", "#a855f7"];
  const STD_HEX = [0xef4444, 0xf59e0b, 0xa855f7];
  const EIGEN_COLORS = ["#10b981", "#0090ff", "#f59e0b"];
  const EIGEN_HEX = [0x10b981, 0x0090ff, 0xf59e0b];

  const PHASES_INFO = [
    {
      index: 0,
      title: "Bước 1/3: Biến đổi I → A làm lệch cơ sở chuẩn & Lập phương trình det(A - λI) = 0",
      desc: "Ma trận A kéo e₁(1,0), e₂(0,1) lệch khỏi trục Ox, Oy. Để tìm vector v ≠ 0 giữ nguyên phương (Av = λv ⇔ (A - λI)v = 0), ma trận (A - λI) phải suy biến nên định thức det(A - λI) = 0."
    },
    {
      index: 1,
      title: "Bước 2/3: Giải hệ (A - λᵢI)v = 0 sinh ra Đường thẳng bất biến & Vector riêng vᵢ",
      desc: "Thay từng trị riêng λᵢ vào hệ (A - λᵢI)v = 0 ta được phương trình đường thẳng đi qua gốc O (đường nét đứt). Mọi vector riêng vᵢ trên đường thẳng này không bị lệch hướng mà chỉ trượt dọc theo đường đó tới λᵢvᵢ."
    },
    {
      index: 2,
      title: "Bước 3/3: Dựng Hệ lưới Cơ sở Vector riêng - Chéo hóa D = P⁻¹AP = diag(λ₁, λ₂)",
      desc: "Ghép các vector riêng làm cột của ma trận chuyển cơ sở P = [v₁ v₂]. Khi kẻ lưới tọa độ song song với {v₁, v₂}, ô đơn vị cơ sở [v₁, v₂] không bị lệch góc mà chỉ co giãn thành [λ₁v₁, λ₂v₂] theo ma trận đường chéo D."
    }
  ];

  // =========================================================================
  // BỘ ĐIỀU KHIỂN HOẠT CẢNH TRỊ RIÊNG & CHÉO HÓA (App.EigenAnimator - 3 BƯỚC LIÊN TỤC)
  // =========================================================================
  const EigenAnimator = {
    _active: false,
    _paused: false,
    _currentPhase: 0,
    _phaseProgress: 0,
    _phaseTimer: null,
    _raf: null,
    _speed: 1.0,
    _matrixId: null,
    _eigenSys: null,
    _snapshot: null,
    _tempStdItems: [],
    _tempEigenItems: [],
    _threeGroup: null,

    isActive() {
      return this._active;
    },

    getCurrentPhase() {
      return this._currentPhase;
    },

    getEigenSystem() {
      return this._eigenSys;
    },

    start(opts = {}) {
      this.stop();

      const rawMat = opts.matrix || [
        [2, 1],
        [1, 2]
      ];
      const sys = solveEigenSystem(rawMat);
      this._eigenSys = sys;
      this._matrixId = opts.matrixId !== undefined ? opts.matrixId : null;

      // Chuyển chế độ 2D / 3D khớp với cấp của ma trận vuông
      const targetMode = sys.dim === 3 ? "3D" : "2D";
      if (App.mode !== targetMode && typeof App.toggleMode === "function") {
        App.toggleMode();
      }

      // Lưu snapshot danh sách vector hiện có để khôi phục nguyên trạng khi dừng
      this._snapshot = (App.vectorList || []).map((v) => ({
        id: v.id,
        vec: Array.isArray(v.vec) ? [...v.vec] : [0, 0],
        visible: v.visible,
        alpha: v.alpha,
        colorCss: v.colorCss,
        colorHex: v.colorHex,
        focus: v.focus
      }));

      // Ẩn tạm các vector thông thường của người dùng trong lúc trình diễn
      (App.vectorList || []).forEach((v) => {
        v.visible = false;
      });

      // 1. Khởi tạo các vector cơ sở chuẩn e_1, e_2, (e_3)
      this._tempStdItems = [];
      const M = sys.matrix;
      for (let j = 0; j < sys.dim; j++) {
        const origCoord = sys.dim === 3
          ? [j === 0 ? 1 : 0, j === 1 ? 1 : 0, j === 2 ? 1 : 0]
          : [j === 0 ? 1 : 0, j === 1 ? 1 : 0];
        const targetCoord = sys.dim === 3
          ? [M[0][j], M[1][j], M[2][j]]
          : [M[0][j], M[1][j]];
        const colCss = STD_COLORS[j % STD_COLORS.length];
        const colHex = STD_HEX[j % STD_HEX.length];

        const stdItem = {
          id: 8900 + j + 1,
          name: `e_${j + 1}`,
          _customLabelLatex: `e_{${j + 1}}`,
          vec: [...origCoord],
          origStdVec: [...origCoord],
          targetStdVec: [...targetCoord],
          stdIndex: j,
          colorCss: colCss,
          colorHex: colCss,
          colorHexNum: colHex,
          visible: true,
          showArrow: true,
          showProjection: false,
          alpha: 0.9,
          _isEigenTemp: true,
          _isEigenStdBasis: true
        };
        App.vectorList.push(stdItem);
        this._tempStdItems.push(stdItem);
      }

      // 2. Khởi tạo các vector riêng đại diện v_1, v_2, (v_3) trên các trục bất biến E_lambda
      this._tempEigenItems = [];
      for (let i = 0; i < sys.eigenPairs.length; i++) {
        const pair = sys.eigenPairs[i];
        const colCss = EIGEN_COLORS[i % EIGEN_COLORS.length];
        const colHex = EIGEN_HEX[i % EIGEN_HEX.length];
        const vCoord = sys.dim === 3
          ? [pair.vec[0], pair.vec[1], pair.vec[2] || 0]
          : [pair.vec[0], pair.vec[1]];

        const tempId = 9000 + i + 1;
        const item = {
          id: tempId,
          name: `v_${i + 1}`,
          _customLabelLatex: `v_{${i + 1}}`,
          vec: [...vCoord],
          origEigenVec: [...vCoord],
          lambda: pair.lambda,
          eigenIndex: i,
          colorCss: colCss,
          colorHex: colCss,
          colorHexNum: colHex,
          visible: false,
          showArrow: true,
          showProjection: false,
          alpha: 0.0,
          _isEigenTemp: true,
          _isEigenVector: true
        };
        App.vectorList.push(item);
        this._tempEigenItems.push(item);
      }

      // Căn chỉnh góc nhìn Camera 3D lệch phương (x != y != z) để vector chéo (1,1,0) không trùng với trục Oz trên màn hình,
      // đồng thời giữ nguyên unitsPerWorld = 1 để các vector e₁(1,0,0), e₂(0,1,0), e₃(0,0,1) khớp 100% với vạch số 1 trên trục!
      this._savedCamPos3D = null;
      if (window.Vec3D && Vec3D._camera && Vec3D._controls) {
        if (Vec3D._resetAnimId) {
          cancelAnimationFrame(Vec3D._resetAnimId);
          Vec3D._resetAnimId = null;
        }
        this._savedCamPos3D = Vec3D._camera.position.clone();
        let maxCoordReach = 2.5;
        for (const st of this._tempStdItems) {
          const u1 = st.targetStdVec;
          maxCoordReach = Math.max(maxCoordReach, Math.hypot(u1[0] || 0, u1[1] || 0, u1[2] || 0));
        }
        for (const it of this._tempEigenItems) {
          const v0 = it.origEigenVec;
          const sc = Math.max(1, Math.abs(it.lambda));
          maxCoordReach = Math.max(maxCoordReach, Math.hypot(v0[0] || 0, v0[1] || 0, v0[2] || 0) * sc);
        }
        const dist = Math.max(11.0, Math.min(24, maxCoordReach * 2.65));
        Vec3D._camera.position.set(dist * 1.32, dist * 0.58, dist * 0.76);
        Vec3D._camera.up.set(0, 0, 1);
        Vec3D._controls.target.set(0, 0, 0);
        Vec3D._camera.lookAt(0, 0, 0);
        Vec3D._controls.update();
        if (typeof Vec3D.addAxisLabelsDynamic === "function") {
          Vec3D.addAxisLabelsDynamic();
        }
      }

      this._active = true;
      this._paused = false;
      this._currentPhase = 0;
      this._phaseProgress = 0;
      App._eigenAnimActive = true;

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
      App._eigenAnimActive = false;

      // Dọn dẹp 3D group nếu có
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

      // Gỡ bỏ các vector tạm thời và khôi phục nguyên trạng snapshot của người dùng
      if (Array.isArray(App.vectorList)) {
        for (let i = App.vectorList.length - 1; i >= 0; i--) {
          if (App.vectorList[i] && App.vectorList[i]._isEigenTemp) {
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
      this._tempStdItems = [];
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

    togglePause() {
      if (!this._active) return;
      if (this._paused) this.resume();
      else this.pause();
    },

    nextStep() {
      if (!this._active) return;
      const next = Math.min(2, this._currentPhase + 1);
      this.goToPhase(next);
    },

    prevStep() {
      if (!this._active) return;
      const prev = Math.max(0, this._currentPhase - 1);
      this.goToPhase(prev);
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
      const baseDurations = [2600, 3200, 2600];
      const baseDur = baseDurations[phaseIdx] || 2800;
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
          // Chuyển tiếp tự động liền mạch Bước 1 -> Bước 2 -> Bước 3 không giật không gian!
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

    // Tiến độ biến đổi ma trận I -> A xuyên suốt 3 bước (liền mạch 100%, không bị giật ngược về I)
    // - Bước 1 (curPhase = 0): tTransform = smoothstep(p) từ 0.0 -> 1.0 (Biến đổi không gian từ I -> A)
    // - Bước 2 (curPhase = 1): tTransform = 1.0 (Giữ nguyên không gian sau biến đổi A, giải hệ sinh ra đường thẳng bất biến & trượt v_i -> lambda_i*v_i)
    // - Bước 3 (curPhase = 2): tTransform = 1.0 (Giữ nguyên không gian A, làm mờ lưới chuẩn và dựng lưới cơ sở riêng D = diag(lambda_1, lambda_2))
    _getTransformProgress(curPhase, p) {
      if (curPhase === 0) return smoothstep(p);
      return 1.0;
    },

    // Cập nhật vị trí và độ rõ của cơ sở chuẩn {e_j} và vector riêng {v_i} liền mạch qua 3 bước
    _applyVectorsForPhase(curPhase, p) {
      const sys = this._eigenSys;
      if (!sys) return;
      const s = smoothstep(p);
      const tTrans = this._getTransformProgress(curPhase, p);
      const is3D = sys.dim === 3;

      // 1. Cập nhật các vector cơ sở chuẩn e_1, e_2, (e_3)
      for (let j = 0; j < this._tempStdItems.length; j++) {
        const st = this._tempStdItems[j];
        const u0 = st.origStdVec;
        const u1 = st.targetStdVec;

        if (curPhase === 0) {
          // Bước 1: e_1, e_2 bị ma trận A kéo lệch khỏi trục Ox, Oy tới cột 1 và cột 2 của A
          st.visible = true;
          st.alpha = 0.9;
          let vx = (1 - tTrans) * u0[0] + tTrans * u1[0];
          let vy = (1 - tTrans) * u0[1] + tTrans * u1[1];
          let vz = is3D ? (1 - tTrans) * u0[2] + tTrans * u1[2] : 0;
          if (Math.hypot(vx, vy, vz) < 0.04) {
            vx = u0[0] * 0.04;
            vy = u0[1] * 0.04;
            if (is3D) vz = u0[2] * 0.04;
          }
          st.vec[0] = vx;
          st.vec[1] = vy;
          if (is3D) st.vec[2] = vz;
        } else if (curPhase === 1) {
          // Bước 2: Giữ e_1, e_2 ở vị trí sau biến đổi A nhưng làm mờ xuống 0.45 để đối chiếu với đường thẳng bất biến
          st.visible = true;
          st.alpha = 0.9 - 0.45 * smoothstep(Math.min(1.0, p / 0.4));
          st.vec[0] = u1[0];
          st.vec[1] = u1[1];
          if (is3D) st.vec[2] = u1[2];
        } else {
          // Bước 3: Làm mờ dần và ẩn hẳn e_1, e_2 để nhường chỗ cho Hệ lưới Cơ sở Vector riêng {v_1, v_2}
          const fadeOut = Math.max(0, 1 - smoothstep(Math.min(1.0, p / 0.55)));
          st.visible = fadeOut > 0.03;
          st.alpha = 0.45 * fadeOut;
          st.vec[0] = u1[0];
          st.vec[1] = u1[1];
          if (is3D) st.vec[2] = u1[2];
        }
      }

      // 2. Cập nhật các vector riêng đại diện v_1, v_2, (v_3) trên các đường thẳng bất biến E_lambda
      for (let i = 0; i < this._tempEigenItems.length; i++) {
        const it = this._tempEigenItems[i];
        const v0 = it.origEigenVec;
        const lam = it.lambda;

        if (curPhase === 0) {
          // Bước 1: Chưa hiện đường thẳng bất biến và vector riêng (đang khảo sát e_1, e_2 bị lệch phương)
          it.visible = false;
          it.alpha = 0.0;
          it.vec[0] = v0[0];
          it.vec[1] = v0[1];
          if (is3D) it.vec[2] = v0[2];
        } else if (curPhase === 1) {
          // Bước 2:
          // - Nửa đầu (p: 0 -> 0.35): Đường thẳng nghiệm (a - lambda_i)x + by = 0 phóng ra từ gốc O, vector riêng xuất hiện tại 1*v_i
          // - Nửa sau (p: 0.30 -> 1.0): Vector riêng trượt dọc theo chính đường thẳng bất biến đó từ 1*v_i tới lambda_i*v_i
          const appearAlpha = smoothstep(Math.min(1.0, p / 0.25));
          const slideT = smoothstep(Math.max(0, Math.min(1.0, (p - 0.30) / 0.70)));
          it.visible = appearAlpha > 0.02;
          it.alpha = appearAlpha;
          const rawScale = (1 - slideT) * 1.0 + slideT * lam;
          const effScale = Math.abs(rawScale) < 0.04 ? (rawScale >= 0 ? 0.04 : -0.04) : rawScale;
          it.vec[0] = v0[0] * effScale;
          it.vec[1] = v0[1] * effScale;
          if (is3D) it.vec[2] = v0[2] * effScale;
        } else {
          // Bước 3: Giữ nguyên các vector riêng tại lambda_i*v_i trên hệ lưới cơ sở riêng
          it.visible = true;
          it.alpha = 1.0;
          const effScale = Math.abs(lam) < 0.04 ? (lam >= 0 ? 0.04 : -0.04) : lam;
          it.vec[0] = v0[0] * effScale;
          it.vec[1] = v0[1] * effScale;
          if (is3D) it.vec[2] = v0[2] * effScale;
        }
      }
    },

    _syncPlayPauseIcon() {
      const icon = document.getElementById("iconEigenPlay");
      if (icon) {
        icon.className = this._paused ? "ph ph-play" : "ph ph-pause";
      }
    },

    _syncPhasePills(curPhase) {
      const counter = document.getElementById("eigenStepCounter");
      if (counter) counter.textContent = `Bước ${curPhase + 1} / 3`;

      const pillsWrap = document.getElementById("eigenPhasePills");
      if (pillsWrap) {
        const btns = pillsWrap.querySelectorAll(".coord-phase-btn");
        btns.forEach((b) => {
          const idx = parseInt(b.dataset.phase, 10);
          b.classList.toggle("active", idx === curPhase);
        });
      }
    },

    updateDynamicStepText(curPhase, p) {
      const titleEl = document.getElementById("eigenStepTitle");
      const descEl = document.getElementById("eigenStepDesc");
      if (!titleEl || !descEl) return;

      const info = PHASES_INFO[curPhase] || PHASES_INFO[0];
      titleEl.textContent = info.title;

      const sys = this._eigenSys;
      if (!sys) {
        descEl.textContent = info.desc;
        return;
      }

      const pct = Math.round(p * 100);
      const M = sys.matrix;

      if (curPhase === 0) {
        if (sys.dim === 2) {
          const c1 = `(${formatScalar(M[0][0])}, ${formatScalar(M[1][0])})`;
          const c2 = `(${formatScalar(M[0][1])}, ${formatScalar(M[1][1])})`;
          const trStr = formatScalar(sys.trace);
          const detStr = formatScalar(sys.det);
          const rootsStr = sys.isComplex
            ? "vô nghiệm thực (Δ &lt; 0)"
            : sys.distinctEigenvalues.map((d, i) => `<b>λ<sub>${i + 1}</sub> = ${formatScalar(d.lambda)}</b>`).join(", ");
          descEl.innerHTML =
            `<b>1. Hiện tượng hình học (${pct}%):</b> Ma trận A kéo <b>e₁(1,0) → ${c1}</b> và <b>e₂(0,1) → ${c2}</b> làm lệch khỏi trục chuẩn.<br>` +
            `<b>2. Thiết lập đại số:</b> Tìm vector <b>v ≠ 0</b> không bị lệch phương: <b>Av = λv ⇔ (A - λI)v = 0</b> (nhân ma trận đơn vị I để trừ λ vào đường chéo chính).<br>` +
            `<b>3. Điều kiện có nghiệm v ≠ 0:</b> Ma trận (A - λI) phải suy biến ⇔ <b>det(A - λI) = λ² - (${trStr})λ + (${detStr}) = 0</b> ⇒ ${rootsStr}.`;
        } else {
          const c1 = `(${formatScalar(M[0][0])}, ${formatScalar(M[1][0])}, ${formatScalar(M[2][0])})`;
          const c2 = `(${formatScalar(M[0][1])}, ${formatScalar(M[1][1])}, ${formatScalar(M[2][1])})`;
          const c3 = `(${formatScalar(M[0][2])}, ${formatScalar(M[1][2])}, ${formatScalar(M[2][2])})`;
          const trStr = formatScalar(sys.trace);
          const c1Str = formatScalar(sys.c1);
          const detStr = formatScalar(sys.det);
          const rootsStr = sys.distinctEigenvalues.length === 0
            ? "không có nghiệm thực"
            : sys.distinctEigenvalues.map((d, i) => `<b>λ<sub>${i + 1}</sub> = ${formatScalar(d.lambda)}</b>`).join(", ");
          descEl.innerHTML =
            `<b>1. Hiện tượng hình học 3D (${pct}%):</b> Khối lập phương đơn vị bị biến dạng khi A kéo <b>e₁ → ${c1}</b>, <b>e₂ → ${c2}</b>, <b>e₃ → ${c3}</b>.<br>` +
            `<b>2. Thiết lập đại số:</b> Tìm trục bất biến <b>Av = λv ⇔ (A - λI₃)v = 0</b> (nhân <b>I₃</b> để trừ λ vào đường chéo chính).<br>` +
            `<b>3. Phương trình đặc trưng:</b> <b>det(A - λI₃) = -λ³ + (${trStr})λ² - (${c1Str})λ + (${detStr}) = 0</b> ⇒ ${rootsStr}.`;
        }
      } else if (curPhase === 1) {
        if (sys.isComplex && sys.eigenPairs.length === 0) {
          descEl.innerHTML = `Vì phương trình đặc trưng <b>det(A - λI) = 0</b> có biệt thức <b>Δ &lt; 0</b> (nghiệm phức), hệ <b>(A - λI)v = 0</b> không có nghiệm thực khác 0 nên không tồn tại đường thẳng bất biến nào trong không gian thực.`;
        } else {
          const eqLines = sys.eigenPairs
            .map((ep, idx) => {
              const vStr = `(${ep.vec.map(formatScalar).join(", ")})`;
              const lamStr = formatScalar(ep.lambda);
              const actionStr = Math.abs(ep.lambda) < 1e-5
                ? `co về tâm O (<b>λ<sub>${idx + 1}</sub> = 0</b>)`
                : ep.lambda < 0
                  ? `đảo chiều qua O và giãn <b>|λ<sub>${idx + 1}</sub>| = ${formatScalar(Math.abs(ep.lambda))}</b> lần`
                  : `giãn <b>λ<sub>${idx + 1}</sub> = ${lamStr}</b> lần`;
              if (sys.dim === 2) {
                const aMinusL = formatScalar(M[0][0] - ep.lambda);
                const bVal = formatScalar(M[0][1]);
                return `• Với <b>λ<sub>${idx + 1}</sub> = ${lamStr}</b>: Hệ <b>(A - λ<sub>${idx + 1}</sub>I)v = 0</b> cho đường thẳng nét đứt <b>(${aMinusL})x + (${bVal})y = 0</b> qua O, chọn <b>v<sub>${idx + 1}</sub> = ${vStr}</b> (${actionStr}).`;
              }
              return `• Với <b>λ<sub>${idx + 1}</sub> = ${lamStr}</b>: Khử Gauss hệ <b>(A - λ<sub>${idx + 1}</sub>I₃)v = 0</b> sinh ra trục bất biến nét đứt qua O, chọn <b>v<sub>${idx + 1}</sub> = ${vStr}</b> (${actionStr}).`;
            })
            .join("<br>");
          const headerAxisStr = sys.dim === 3 ? "Nguồn gốc các trục bất biến 3D nét đứt" : "Nguồn gốc 2 đường thẳng nét đứt";
          descEl.innerHTML = `<b>${headerAxisStr}:</b> Thay từng <b>λᵢ</b> vào hệ <b>(A - λᵢI)v = 0</b>:<br>${eqLines}`;
        }
      } else if (curPhase === 2) {
        if (sys.isDiagonalizable) {
          const dStr = sys.eigenPairs.map((ep) => formatScalar(ep.lambda)).join(", ");
          const vNames = sys.eigenPairs.map((_, idx) => `v<sub>${idx + 1}</sub>`).join(", ");
          const cellName = sys.dim === 3 ? "khối hộp đơn vị cơ sở riêng <b>[v₁, v₂, v₃]</b>" : "ô đơn vị cơ sở riêng <b>[v₁, v₂]</b>";
          const axisCountStr = sys.dim === 3 ? "3 trục bất biến" : "2 trục bất biến";
          descEl.innerHTML =
            `<b>Bước chéo hóa D = P⁻¹AP:</b> Ghép các vector riêng làm cột của ma trận chuyển cơ sở <b>P = [${vNames}]</b>. ` +
            `Khi dựng hệ lưới tọa độ mới song song với ${axisCountStr} <b>{${vNames}}</b>, ${cellName} (viền nét đứt) không bị lệch góc mà chỉ co giãn thuần túy dọc theo ${axisCountStr} thành <b>D = diag(${dStr})</b>!`;
        } else {
          descEl.innerHTML = `<b style="color:#f59e0b;">Không thể dựng lưới cơ sở chéo hóa:</b> ${sys.reasonNotDiag}`;
        }
      }
    },

    bindSidebarControls() {
      const btnPrev = document.getElementById("btnEigenPrev");
      const btnPlay = document.getElementById("btnEigenPlay");
      const btnNext = document.getElementById("btnEigenNext");
      const btnReplay = document.getElementById("btnEigenReplay");
      const speedSlider = document.getElementById("eigenSpeedSlider");

      if (btnPrev && !btnPrev._eigenBound) {
        btnPrev._eigenBound = true;
        btnPrev.addEventListener("click", () => this.prevStep());
      }
      if (btnPlay && !btnPlay._eigenBound) {
        btnPlay._eigenBound = true;
        btnPlay.addEventListener("click", () => this.togglePause());
      }
      if (btnNext && !btnNext._eigenBound) {
        btnNext._eigenBound = true;
        btnNext.addEventListener("click", () => this.nextStep());
      }
      if (btnReplay && !btnReplay._eigenBound) {
        btnReplay._eigenBound = true;
        btnReplay.addEventListener("click", () => this.restart());
      }
      if (speedSlider && !speedSlider._eigenBound) {
        speedSlider._eigenBound = true;
        speedSlider.addEventListener("input", (e) => {
          this.setSpeed(e.target.value);
        });
      }
    },

    // =========================================================================
    // KẾT XUẤT LỚP NỀN 2D LIỀN MẠCH QUA 3 BƯỚC
    // Tuyệt đối không vẽ chữ (fillText) trực tiếp lên đồ thị!
    // =========================================================================
    render2DSubspace(ctx, gridInfo) {
      if (!this._active || !gridInfo || !this._eigenSys) return;
      const sys = this._eigenSys;
      if (sys.dim !== 2) return;

      const { cx, cy, px } = gridInfo;
      const curPhase = this._currentPhase;
      const p = this._phaseProgress;
      const s = smoothstep(p);
      const tTrans = this._getTransformProgress(curPhase, p);
      const isDark = window.App && App.theme === "dark";

      const wX = (x) => cx + x * px;
      const wY = (y) => cy - y * px;

      const A = sys.matrix;
      const a = A[0][0], b = A[0][1], c = A[1][0], d = A[1][1];
      const m00 = (1 - tTrans) * 1 + tTrans * a;
      const m01 = (1 - tTrans) * 0 + tTrans * b;
      const m10 = (1 - tTrans) * 0 + tTrans * c;
      const m11 = (1 - tTrans) * 1 + tTrans * d;

      ctx.save();

      // 1. LƯỚI CHUẨN BIẾN ĐỔI (Biến dạng từ I -> A ở Bước 1, giữ ở Bước 2, mờ dần ở đầu Bước 3)
      const stdGridFade = curPhase === 2 ? Math.max(0, 1 - smoothstep(Math.min(1.0, p / 0.55))) : 1.0;
      if (stdGridFade > 0.01) {
        const gridAlpha = (curPhase === 0 ? 0.24 : 0.16) * stdGridFade;
        const N = 12;

        ctx.lineWidth = 1.0;
        ctx.strokeStyle = isDark ? `rgba(56, 189, 248, ${gridAlpha})` : `rgba(2, 132, 199, ${gridAlpha})`;
        ctx.beginPath();
        for (let k = -N; k <= N; k++) {
          const x1 = m00 * -N + m01 * k;
          const y1 = m10 * -N + m11 * k;
          const x2 = m00 * N + m01 * k;
          const y2 = m10 * N + m11 * k;
          ctx.moveTo(wX(x1), wY(y1));
          ctx.lineTo(wX(x2), wY(y2));

          const x3 = m00 * k + m01 * -N;
          const y3 = m10 * k + m11 * -N;
          const x4 = m00 * k + m01 * N;
          const y4 = m10 * k + m11 * N;
          ctx.moveTo(wX(x3), wY(y3));
          ctx.lineTo(wX(x4), wY(y4));
        }
        ctx.stroke();
      }

      // 2. ĐƯỜNG THẲNG TRỤC BẤT BIẾN E_lambda VÀ VẠCH CHIA TỶ LỆ NGUYÊN k * v_i
      // Sinh ra từ gốc O ở đầu Bước 2 (p: 0 -> 0.35) khi giải hệ (A - lambda_i I)v = 0, và giữ cố định ở Bước 3!
      if (curPhase === 1 || curPhase === 2) {
        const lineAppear = curPhase === 1 ? smoothstep(Math.min(1.0, p / 0.35)) : 1.0;
        if (lineAppear > 0.01) {
          for (let i = 0; i < this._tempEigenItems.length; i++) {
            const it = this._tempEigenItems[i];
            const vx = it.origEigenVec[0];
            const vy = it.origEigenVec[1];
            const len = Math.hypot(vx, vy) || 1;
            const dx = vx / len;
            const dy = vy / len;
            const nx = -dy;
            const ny = dx;
            const span = 22 * lineAppear;

            ctx.strokeStyle = it.colorCss;
            ctx.globalAlpha = 0.78 * lineAppear;
            ctx.lineWidth = 1.9;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(wX(-dx * span), wY(-dy * span));
            ctx.lineTo(wX(dx * span), wY(dy * span));
            ctx.stroke();
            ctx.setLineDash([]);

            // Vạch chia nguyên k * v_i dọc theo trục riêng để đo trực tiếp hệ số trị riêng lambda_i
            if (lineAppear > 0.5) {
              ctx.lineWidth = 1.5;
              ctx.globalAlpha = 0.8 * ((lineAppear - 0.5) * 2);
              for (let k = -4; k <= 4; k++) {
                if (k === 0) continue;
                const tx = wX(k * vx);
                const ty = wY(k * vy);
                ctx.beginPath();
                ctx.moveTo(tx - nx * 5, ty + ny * 5);
                ctx.lineTo(tx + nx * 5, ty - ny * 5);
                ctx.stroke();
              }
            }
          }
          ctx.globalAlpha = 1.0;
        }
      }

      // 3. BƯỚC 3: Mặt lưới kẻ song song với Cơ sở Vector riêng {v_1, v_2} & Ô cơ sở co giãn [1*v1, 1*v2] -> [lambda_1*v1, lambda_2*v2]
      if (curPhase === 2 && sys.isDiagonalizable && this._tempEigenItems.length >= 2) {
        const it1 = this._tempEigenItems[0];
        const it2 = this._tempEigenItems[1];
        const v1 = it1.origEigenVec;
        const v2 = it2.origEigenVec;

        const gridAppear = smoothstep(Math.min(1.0, p / 0.45));
        const scaleT = smoothstep(Math.max(0.0, (p - 0.20) / 0.80));
        const s1 = (1 - scaleT) * 1.0 + scaleT * it1.lambda;
        const s2 = (1 - scaleT) * 1.0 + scaleT * it2.lambda;
        const b1x = v1[0] * s1, b1y = v1[1] * s1;
        const b2x = v2[0] * s2, b2y = v2[1] * s2;

        const N = 12;

        // Lưới cơ sở riêng {v1, v2} (kẻ song song với 2 trục bất biến)
        ctx.lineWidth = 1.15;
        ctx.strokeStyle = isDark
          ? `rgba(16, 185, 129, ${0.34 * gridAppear})`
          : `rgba(5, 150, 105, ${0.30 * gridAppear})`;
        ctx.beginPath();
        for (let k = -N; k <= N; k++) {
          ctx.moveTo(wX(-N * v1[0] + k * v2[0]), wY(-N * v1[1] + k * v2[1]));
          ctx.lineTo(wX(N * v1[0] + k * v2[0]), wY(N * v1[1] + k * v2[1]));
        }
        ctx.stroke();

        ctx.strokeStyle = isDark
          ? `rgba(56, 189, 248, ${0.34 * gridAppear})`
          : `rgba(2, 132, 199, ${0.30 * gridAppear})`;
        ctx.beginPath();
        for (let m = -N; m <= N; m++) {
          ctx.moveTo(wX(m * v1[0] - N * v2[0]), wY(m * v1[1] - N * v2[1]));
          ctx.lineTo(wX(m * v1[0] + N * v2[0]), wY(m * v1[1] + N * v2[1]));
        }
        ctx.stroke();

        // Khung viền nét đứt của ô đơn vị cơ sở riêng ban đầu [1*v1, 1*v2]
        ctx.strokeStyle = isDark
          ? `rgba(255, 255, 255, ${0.58 * gridAppear})`
          : `rgba(15, 23, 42, ${0.52 * gridAppear})`;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(wX(0), wY(0));
        ctx.lineTo(wX(v1[0]), wY(v1[1]));
        ctx.lineTo(wX(v1[0] + v2[0]), wY(v1[1] + v2[1]));
        ctx.lineTo(wX(v2[0]), wY(v2[1]));
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        // Ô cơ sở riêng co giãn dọc theo 2 trục riêng từ [1*v1, 1*v2] tới [lambda_1*v1, lambda_2*v2]
        ctx.fillStyle = isDark
          ? `rgba(16, 185, 129, ${0.20 * gridAppear})`
          : `rgba(16, 185, 129, ${0.16 * gridAppear})`;
        ctx.strokeStyle = `rgba(16, 185, 129, ${0.95 * gridAppear})`;
        ctx.lineWidth = 1.9;
        ctx.beginPath();
        ctx.moveTo(wX(0), wY(0));
        ctx.lineTo(wX(b1x), wY(b1y));
        ctx.lineTo(wX(b1x + b2x), wY(b1y + b2y));
        ctx.lineTo(wX(b2x), wY(b2y));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    },

    // =========================================================================
    // KẾT XUẤT LỚP TRÊN 2D (BÓNG GHOST CƠ SỞ CHUẨN & BÓNG GHOST VECTOR RIÊNG)
    // =========================================================================
    render2DProjections(ctx, gridInfo) {
      if (!this._active || !gridInfo || !this._eigenSys) return;
      const sys = this._eigenSys;
      if (sys.dim !== 2) return;

      const { cx, cy, px } = gridInfo;
      const curPhase = this._currentPhase;
      const p = this._phaseProgress;
      const s = smoothstep(p);
      const wX = (x) => cx + x * px;
      const wY = (y) => cy - y * px;

      const drawCleanArrow = (x1, y1, x2, y2, color, width = 2.2, dashed = false, alpha = 1.0) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len < 2) return;
        const ang = Math.atan2(dy, dx);
        const head = Math.min(11, len * 0.35);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = width;
        if (dashed) ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - head * Math.cos(ang - Math.PI / 6), y2 - head * Math.sin(ang - Math.PI / 6));
        ctx.lineTo(x2 - head * Math.cos(ang + Math.PI / 6), y2 - head * Math.sin(ang + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };

      ctx.save();

      // BƯỚC 1 & BƯỚC 2: Vẽ bóng ghost nét đứt của e_1(1,0), e_2(0,1) trên trục Ox, Oy và đường quỹ đạo lệch phương
      if (curPhase === 0 || curPhase === 1) {
        const ghostAlpha = curPhase === 0 ? 0.45 : 0.28;
        for (let j = 0; j < this._tempStdItems.length; j++) {
          const st = this._tempStdItems[j];
          const u0 = st.origStdVec;
          const uCur = st.vec;
          drawCleanArrow(cx, cy, wX(u0[0]), wY(u0[1]), st.colorCss, 1.7, true, ghostAlpha);

          if (curPhase === 1 || s > 0.05) {
            ctx.save();
            ctx.strokeStyle = st.colorCss;
            ctx.globalAlpha = ghostAlpha;
            ctx.lineWidth = 1.4;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(wX(u0[0]), wY(u0[1]));
            ctx.lineTo(wX(uCur[0]), wY(uCur[1]));
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // BƯỚC 2 & BƯỚC 3: Vẽ bóng ghost nét đứt của vector riêng gốc 1 * v_i để đối chiếu với lambda_i * v_i
      if (curPhase === 1 || curPhase === 2) {
        const eigGhostAlpha = curPhase === 1 ? smoothstep(Math.min(1.0, p / 0.35)) * 0.58 : 0.58;
        for (let i = 0; i < this._tempEigenItems.length; i++) {
          const it = this._tempEigenItems[i];
          const v0 = it.origEigenVec;
          drawCleanArrow(cx, cy, wX(v0[0]), wY(v0[1]), it.colorCss, 2.0, true, eigGhostAlpha);

          // Nếu trị riêng lambda_i = 0 (vector riêng co tụt về gốc O), vẽ vòng tròn tâm ngắm tại gốc O
          if (Math.abs(it.lambda) < 1e-5 && (curPhase === 2 || p > 0.5)) {
            ctx.save();
            ctx.strokeStyle = it.colorCss;
            ctx.globalAlpha = 0.85;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(cx, cy, 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      ctx.restore();
    },

    // =========================================================================
    // KẾT XUẤT KHÔNG GIAN 3D (THREE.JS) CHO MA TRẬN 3x3 HOẶC CHẾ ĐỘ 3D
    // Đầy đủ 3 lớp tương đương và vượt trội hơn 2D:
    // - Bước 1: Lưới tọa độ chuẩn & Khối hộp đơn vị [e₁, e₂, e₃] biến dạng theo I -> A,
    //           kèm bóng Ghost e₁, e₂, e₃ trên trục chuẩn và quỹ đạo bẻ lệch phương.
    // - Bước 2: Trục bất biến 3D E_λᵢ phóng ra từ gốc O kèm vạch chia đơn vị k·vᵢ,
    //           mặt phẳng riêng bất biến (nếu bội hình học >= 2) và bóng Ghost 1·vᵢ.
    // - Bước 3: Hệ lưới không gian Cơ sở Vector riêng {v₁, v₂, v₃}, khung nét đứt
    //           [1·v₁, 1·v₂, 1·v₃] và khối hộp riêng co giãn dọc trục thành [λ₁v₁, λ₂v₂, λ₃v₃].
    // =========================================================================
    render3D(mathGroup) {
      if (!window.THREE || !mathGroup) return;

      if (this._threeGroup) {
        if (this._threeGroup.parent) this._threeGroup.parent.remove(this._threeGroup);
        this._threeGroup.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose?.();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m?.dispose?.());
          else obj.material?.dispose?.();
        });
        this._threeGroup = null;
      }

      if (!this._active || !this._eigenSys) return;

      const sys = this._eigenSys;
      const is3DMat = sys.dim === 3;
      const u = Math.max(1e-12, window.Vec3D?.S3D?.unitsPerWorld || 1);
      const Lw = window.Vec3D?._axisMaxWorld || 20;
      const curPhase = this._currentPhase;
      const p = this._phaseProgress;
      const s = smoothstep(p);
      const tTrans = this._getTransformProgress(curPhase, p);
      const isDark =
        (window.App && App.theme === "dark") ||
        document.documentElement.classList.contains("dark") ||
        (document.body && document.body.classList.contains("dark"));

      const vFOV = ((window.Vec3D?._camera ? window.Vec3D._camera.fov : 24) * Math.PI) / 180;
      const screenH = Math.max(1, window.Vec3D?._renderer?.domElement?.clientHeight || 760);
      const camDist = window.Vec3D?._camera ? window.Vec3D._camera.position.length() : 25;
      const worldPerPx = (2 * Math.tan(vFOV / 2) * camDist) / screenH;

      const g = new THREE.Group();
      g.name = "eigenSubspace3D";
      this._threeGroup = g;
      mathGroup.add(g);

      const vO = new THREE.Vector3(0, 0, 0);

      const makeLine = (pA, pB, colorHex, opacity = 1.0, dashed = false, dashPx = 10, gapPx = 6) => {
        const geom = new THREE.BufferGeometry().setFromPoints([pA, pB]);
        const mat = dashed
          ? new THREE.LineDashedMaterial({
              color: colorHex,
              dashSize: dashPx * worldPerPx,
              gapSize: gapPx * worldPerPx,
              transparent: true,
              opacity,
              depthWrite: false
            })
          : new THREE.LineBasicMaterial({
              color: colorHex,
              transparent: true,
              opacity,
              depthWrite: false
            });
        const line = new THREE.Line(geom, mat);
        if (dashed) line.computeLineDistances();
        line.renderOrder = 3;
        return line;
      };

      const makeLineSegments = (pts, colorHex, opacity = 1.0, dashed = false, dashPx = 9, gapPx = 5) => {
        if (!pts || pts.length < 2) return null;
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = dashed
          ? new THREE.LineDashedMaterial({
              color: colorHex,
              dashSize: dashPx * worldPerPx,
              gapSize: gapPx * worldPerPx,
              transparent: true,
              opacity,
              depthWrite: false
            })
          : new THREE.LineBasicMaterial({
              color: colorHex,
              transparent: true,
              opacity,
              depthWrite: false
            });
        const segs = new THREE.LineSegments(geom, mat);
        if (dashed) segs.computeLineDistances();
        segs.renderOrder = 2;
        return segs;
      };

      const makeQuadMesh = (c0, c1, c2, c3, colorHex, opacity = 0.14) => {
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array([
          c0.x, c0.y, c0.z, c1.x, c1.y, c1.z, c2.x, c2.y, c2.z,
          c0.x, c0.y, c0.z, c2.x, c2.y, c2.z, c3.x, c3.y, c3.z
        ]);
        geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geom.computeVertexNormals();
        const mat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: 2,
          polygonOffsetUnits: 2
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.renderOrder = -1;
        return mesh;
      };

      const addParallelepiped3D = (va, vb, vc, colorHex, faceOpacity, edgeOpacity, dashedEdges = false) => {
        const p000 = vO.clone();
        const p100 = va.clone();
        const p010 = vb.clone();
        const p110 = va.clone().add(vb);

        if (!vc || vc.lengthSq() < 1e-10) {
          if (faceOpacity > 0.005) {
            g.add(makeQuadMesh(p000, p100, p110, p010, colorHex, faceOpacity));
          }
          const edges2D = [p000, p100, p100, p110, p110, p010, p010, p000];
          const eMesh = makeLineSegments(edges2D, colorHex, edgeOpacity, dashedEdges);
          if (eMesh) g.add(eMesh);
          return;
        }

        const p001 = vc.clone();
        const p101 = va.clone().add(vc);
        const p011 = vb.clone().add(vc);
        const p111 = p110.clone().add(vc);

        if (faceOpacity > 0.005) {
          g.add(makeQuadMesh(p000, p100, p110, p010, colorHex, faceOpacity));
          g.add(makeQuadMesh(p001, p101, p111, p011, colorHex, faceOpacity));
          g.add(makeQuadMesh(p000, p100, p101, p001, colorHex, faceOpacity));
          g.add(makeQuadMesh(p010, p110, p111, p011, colorHex, faceOpacity));
          g.add(makeQuadMesh(p000, p010, p011, p001, colorHex, faceOpacity));
          g.add(makeQuadMesh(p100, p110, p111, p101, colorHex, faceOpacity));
        }

        if (edgeOpacity > 0.005) {
          const boxEdges = [
            p000, p100, p100, p110, p110, p010, p010, p000,
            p001, p101, p101, p111, p111, p011, p011, p001,
            p000, p001, p100, p101, p110, p111, p010, p011
          ];
          const edgeMesh = makeLineSegments(boxEdges, colorHex, edgeOpacity, dashedEdges);
          if (edgeMesh) g.add(edgeMesh);
        }
      };

      const addGhostArrow3D = (tipWorld, colorHex, opacity = 0.5) => {
        const len = tipWorld.length();
        if (len < 1e-4 || opacity <= 0.01) return;
        const dir = tipWorld.clone().divideScalar(len);
        const headH = Math.min(13.5 * worldPerPx, len * 0.32);
        const headR = Math.min(4.0 * worldPerPx, headH * 0.34);
        const shaftEnd = tipWorld.clone().addScaledVector(dir, -headH);

        g.add(makeLine(vO, shaftEnd, colorHex, opacity, true, 8, 5));

        const coneGeo = new THREE.ConeGeometry(headR, headH, 14);
        const coneMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity,
          depthWrite: false
        });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        cone.position.copy(tipWorld.clone().addScaledVector(dir, -headH * 0.5));
        cone.renderOrder = 6;
        g.add(cone);
      };

      const addMarkerSphere3D = (posWorld, radiusPx, colorHex, opacity = 0.85) => {
        const geo = new THREE.SphereGeometry(radiusPx * worldPerPx, 12, 10);
        const mat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity,
          depthWrite: false
        });
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(posWorld);
        m.renderOrder = 7;
        g.add(m);
      };

      // =======================================================================
      // 1. LỚP LƯỚI CHUẨN & KHỐI HỘP ĐƠN VỊ BIẾN DẠNG (I -> A) + BÓNG GHOST e₁, e₂, e₃
      // =======================================================================
      const A = sys.matrix;
      const m00 = (1 - tTrans) * 1 + tTrans * (A[0]?.[0] ?? 1);
      const m01 = (1 - tTrans) * 0 + tTrans * (A[0]?.[1] ?? 0);
      const m02 = is3DMat ? (1 - tTrans) * 0 + tTrans * (A[0]?.[2] ?? 0) : 0;

      const m10 = (1 - tTrans) * 0 + tTrans * (A[1]?.[0] ?? 0);
      const m11 = (1 - tTrans) * 1 + tTrans * (A[1]?.[1] ?? 1);
      const m12 = is3DMat ? (1 - tTrans) * 0 + tTrans * (A[1]?.[2] ?? 0) : 0;

      const m20 = is3DMat ? (1 - tTrans) * 0 + tTrans * (A[2]?.[0] ?? 0) : 0;
      const m21 = is3DMat ? (1 - tTrans) * 0 + tTrans * (A[2]?.[1] ?? 0) : 0;
      const m22 = is3DMat ? (1 - tTrans) * 1 + tTrans * (A[2]?.[2] ?? 1) : 1;

      const c1W = new THREE.Vector3(m00 * u, m10 * u, m20 * u);
      const c2W = new THREE.Vector3(m01 * u, m11 * u, m21 * u);
      const c3W = is3DMat ? new THREE.Vector3(m02 * u, m12 * u, m22 * u) : null;

      const stdGridFade = curPhase === 2 ? Math.max(0, 1 - smoothstep(Math.min(1.0, p / 0.55))) : 1.0;
      if (stdGridFade > 0.01) {
        const stdColorHex = isDark ? 0x38bdf8 : 0x0284c7;
        const gridAlpha = (curPhase === 0 ? 0.28 : 0.15) * stdGridFade;
        const N = 6;
        const stdPts = [];

        for (let k = -N; k <= N; k++) {
          stdPts.push(
            c1W.clone().multiplyScalar(-N).addScaledVector(c2W, k),
            c1W.clone().multiplyScalar(N).addScaledVector(c2W, k),
            c1W.clone().multiplyScalar(k).addScaledVector(c2W, -N),
            c1W.clone().multiplyScalar(k).addScaledVector(c2W, N)
          );
        }

        if (is3DMat && c3W) {
          const Nz = 2;
          for (let kz = -Nz; kz <= Nz; kz++) {
            if (kz === 0) continue;
            const zOff = c3W.clone().multiplyScalar(kz);
            stdPts.push(
              c1W.clone().multiplyScalar(-N).addScaledVector(c2W, -N).add(zOff),
              c1W.clone().multiplyScalar(N).addScaledVector(c2W, -N).add(zOff),
              c1W.clone().multiplyScalar(N).addScaledVector(c2W, -N).add(zOff),
              c1W.clone().multiplyScalar(N).addScaledVector(c2W, N).add(zOff),
              c1W.clone().multiplyScalar(N).addScaledVector(c2W, N).add(zOff),
              c1W.clone().multiplyScalar(-N).addScaledVector(c2W, N).add(zOff),
              c1W.clone().multiplyScalar(-N).addScaledVector(c2W, N).add(zOff),
              c1W.clone().multiplyScalar(-N).addScaledVector(c2W, -N).add(zOff)
            );
          }
        }

        const stdGridSegs = makeLineSegments(stdPts, stdColorHex, gridAlpha, false);
        if (stdGridSegs) g.add(stdGridSegs);

        // Khung viền nét đứt của khối lập phương đơn vị gốc [e₁, e₂, e₃] tại O để đối chiếu
        const refUnitColor = isDark ? 0x94a3b8 : 0x64748b;
        addParallelepiped3D(
          new THREE.Vector3(u, 0, 0),
          new THREE.Vector3(0, u, 0),
          is3DMat ? new THREE.Vector3(0, 0, u) : null,
          refUnitColor,
          0.0,
          (curPhase === 0 ? 0.45 : 0.25) * stdGridFade,
          true
        );

        // Khối hộp đơn vị [c₁(t), c₂(t), c₃(t)] biến dạng trực tiếp theo ma trận A
        addParallelepiped3D(
          c1W,
          c2W,
          c3W,
          stdColorHex,
          (curPhase === 0 ? 0.14 : 0.07) * stdGridFade,
          (curPhase === 0 ? 0.68 : 0.34) * stdGridFade,
          false
        );
      }

      // Bóng Ghost nét đứt của cơ sở chuẩn e₁, e₂, e₃ trên Ox, Oy, Oz và đường quỹ đạo lệch phương
      if (curPhase === 0 || curPhase === 1) {
        const ghostAlpha = curPhase === 0 ? 0.52 : 0.30;
        for (let j = 0; j < this._tempStdItems.length; j++) {
          const st = this._tempStdItems[j];
          const u0 = st.origStdVec;
          const uCur = st.vec;
          const vOrigW = new THREE.Vector3((u0[0] || 0) * u, (u0[1] || 0) * u, (u0[2] || 0) * u);
          const vCurW = new THREE.Vector3((uCur[0] || 0) * u, (uCur[1] || 0) * u, (uCur[2] || 0) * u);

          addGhostArrow3D(vOrigW, st.colorHexNum || 0xef4444, ghostAlpha);

          if (vOrigW.distanceTo(vCurW) > 1e-3) {
            g.add(makeLine(vOrigW, vCurW, st.colorHexNum || 0xef4444, ghostAlpha * 1.15, true, 7, 5));
            addMarkerSphere3D(vOrigW, 2.4, st.colorHexNum || 0xef4444, ghostAlpha);
          }
        }
      }

      // =======================================================================
      // 2. TRỤC BẤT BIẾN 3D (E_λᵢ) PHÓNG TỪ GỐC O, VẠCH CHIA k·vᵢ & BÓNG GHOST 1·vᵢ
      // =======================================================================
      if (curPhase === 1 || curPhase === 2) {
        const lineAppear = curPhase === 1 ? smoothstep(Math.min(1.0, p / 0.35)) : 1.0;
        const eigGhostAlpha = curPhase === 1 ? lineAppear * 0.62 : 0.58;

        if (lineAppear > 0.01) {
          const spanWorld = Lw * 1.35 * lineAppear;
          const tickHalf = 4.8 * worldPerPx;

          for (let i = 0; i < this._tempEigenItems.length; i++) {
            const it = this._tempEigenItems[i];
            const vBase = it.origEigenVec;
            const vx = Number(vBase[0] || 0);
            const vy = Number(vBase[1] || 0);
            const vz = Number(vBase[2] || 0);
            const len = Math.hypot(vx, vy, vz);
            if (len < 1e-6) continue;

            const colHex = it.colorHexNum || 0x10b981;
            const dir = new THREE.Vector3(vx / len, vy / len, vz / len);
            const p1 = dir.clone().multiplyScalar(-spanWorld);
            const p2 = dir.clone().multiplyScalar(spanWorld);

            // Đường thẳng bất biến nét đứt đi qua O
            g.add(makeLine(p1, p2, colHex, 0.85 * lineAppear, true, 11, 6));

            // Vạch chia nguyên k * v_i vuông góc 2 chiều trong không gian 3D
            if (lineAppear > 0.45) {
              const tickOp = 0.82 * ((lineAppear - 0.45) / 0.55);
              let upRef = new THREE.Vector3(0, 0, 1);
              if (Math.abs(dir.dot(upRef)) > 0.9) upRef = new THREE.Vector3(0, 1, 0);
              const perp1 = new THREE.Vector3().crossVectors(dir, upRef).normalize();
              const perp2 = new THREE.Vector3().crossVectors(dir, perp1).normalize();
              const tickPts = [];
              const vBaseWorld = new THREE.Vector3(vx * u, vy * u, vz * u);

              for (let k = -4; k <= 4; k++) {
                if (k === 0) continue;
                const center = vBaseWorld.clone().multiplyScalar(k);
                if (center.length() <= spanWorld) {
                  tickPts.push(
                    center.clone().addScaledVector(perp1, -tickHalf),
                    center.clone().addScaledVector(perp1, tickHalf),
                    center.clone().addScaledVector(perp2, -tickHalf),
                    center.clone().addScaledVector(perp2, tickHalf)
                  );
                }
              }
              const tickSegs = makeLineSegments(tickPts, colHex, tickOp, false);
              if (tickSegs) g.add(tickSegs);
            }

            // Bóng Ghost 3D của vector riêng gốc 1 * v_i để đối chiếu độ co giãn tới lambda_i * v_i
            const v0World = new THREE.Vector3(vx * u, vy * u, vz * u);
            addGhostArrow3D(v0World, colHex, eigGhostAlpha);

            // Nếu trị riêng lambda_i = 0 (vector riêng co tụt về gốc O), vẽ vòng tâm ngắm 3D tại gốc O
            if (Math.abs(it.lambda) < 1e-5 && (curPhase === 2 || p > 0.45)) {
              const ringR = 11 * worldPerPx;
              const ringGeo = new THREE.RingGeometry(ringR * 0.78, ringR, 28);
              const ringMat = new THREE.MeshBasicMaterial({
                color: colHex,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false
              });
              const ringMesh = new THREE.Mesh(ringGeo, ringMat);
              if (window.Vec3D?._camera) {
                ringMesh.quaternion.copy(window.Vec3D._camera.quaternion);
              }
              ringMesh.renderOrder = 998;
              g.add(ringMesh);
              addMarkerSphere3D(vO, 3.5, colHex, 0.9);
            }
          }

          // Nếu có 2 vector riêng ứng với cùng 1 trị riêng (bội hình học >= 2: Mặt phẳng riêng bất biến 3D)
          if (this._tempEigenItems.length >= 2 && curPhase === 1) {
            for (let aIdx = 0; aIdx < this._tempEigenItems.length; aIdx++) {
              for (let bIdx = aIdx + 1; bIdx < this._tempEigenItems.length; bIdx++) {
                const ia = this._tempEigenItems[aIdx];
                const ib = this._tempEigenItems[bIdx];
                if (Math.abs(ia.lambda - ib.lambda) < 1e-5) {
                  const va = new THREE.Vector3(
                    (ia.origEigenVec[0] || 0) * u,
                    (ia.origEigenVec[1] || 0) * u,
                    (ia.origEigenVec[2] || 0) * u
                  );
                  const vb = new THREE.Vector3(
                    (ib.origEigenVec[0] || 0) * u,
                    (ib.origEigenVec[1] || 0) * u,
                    (ib.origEigenVec[2] || 0) * u
                  );
                  const nVec = new THREE.Vector3().crossVectors(va, vb);
                  if (nVec.lengthSq() > 1e-6) {
                    const u1 = va.clone().normalize();
                    const u2 = new THREE.Vector3().crossVectors(nVec.clone().normalize(), u1).normalize();
                    const Rpl = Lw * 0.75 * lineAppear;
                    const c00 = u1.clone().multiplyScalar(-Rpl).addScaledVector(u2, -Rpl);
                    const c10 = u1.clone().multiplyScalar(Rpl).addScaledVector(u2, -Rpl);
                    const c11 = u1.clone().multiplyScalar(Rpl).addScaledVector(u2, Rpl);
                    const c01 = u1.clone().multiplyScalar(-Rpl).addScaledVector(u2, Rpl);
                    g.add(makeQuadMesh(c00, c10, c11, c01, ia.colorHexNum || 0x10b981, 0.09 * lineAppear));
                  }
                }
              }
            }
          }
        }
      }

      // =======================================================================
      // 3. BƯỚC 3: LƯỚI CƠ SỞ VECTOR RIÊNG 3D & KHỐI HỘP CHÉO HÓA D = diag(λ₁, λ₂, λ₃)
      // =======================================================================
      if (curPhase === 2 && sys.isDiagonalizable && this._tempEigenItems.length >= 2) {
        const gridAppear = smoothstep(Math.min(1.0, p / 0.45));
        const scaleT = smoothstep(Math.max(0.0, (p - 0.20) / 0.80));

        const it1 = this._tempEigenItems[0];
        const it2 = this._tempEigenItems[1];
        const it3 = this._tempEigenItems[2] || null;

        const v1W = new THREE.Vector3(
          (it1.origEigenVec[0] || 0) * u,
          (it1.origEigenVec[1] || 0) * u,
          (it1.origEigenVec[2] || 0) * u
        );
        const v2W = new THREE.Vector3(
          (it2.origEigenVec[0] || 0) * u,
          (it2.origEigenVec[1] || 0) * u,
          (it2.origEigenVec[2] || 0) * u
        );
        const v3W = it3
          ? new THREE.Vector3(
              (it3.origEigenVec[0] || 0) * u,
              (it3.origEigenVec[1] || 0) * u,
              (it3.origEigenVec[2] || 0) * u
            )
          : null;

        // A. Hệ lưới tọa độ 3D kẻ song song với các trục Vector riêng {v₁, v₂, (v₃)}
        const N = 5;
        const pts1 = [];
        const pts2 = [];
        for (let k = -N; k <= N; k++) {
          pts1.push(
            v1W.clone().multiplyScalar(-N).addScaledVector(v2W, k),
            v1W.clone().multiplyScalar(N).addScaledVector(v2W, k)
          );
          pts2.push(
            v1W.clone().multiplyScalar(k).addScaledVector(v2W, -N),
            v1W.clone().multiplyScalar(k).addScaledVector(v2W, N)
          );
        }
        const seg1 = makeLineSegments(pts1, it1.colorHexNum || 0x10b981, 0.36 * gridAppear, false);
        const seg2 = makeLineSegments(pts2, it2.colorHexNum || 0x0090ff, 0.36 * gridAppear, false);
        if (seg1) g.add(seg1);
        if (seg2) g.add(seg2);

        if (v3W && it3) {
          const pts3 = [];
          const corners = [
            [-N, -N],
            [N, -N],
            [N, N],
            [-N, N]
          ];
          for (const [cx, cy] of corners) {
            pts3.push(
              v1W.clone().multiplyScalar(cx).addScaledVector(v2W, cy).addScaledVector(v3W, -2),
              v1W.clone().multiplyScalar(cx).addScaledVector(v2W, cy).addScaledVector(v3W, 2)
            );
          }
          for (let kz = -2; kz <= 2; kz++) {
            if (kz === 0) continue;
            const zOff = v3W.clone().multiplyScalar(kz);
            pts3.push(
              v1W.clone().multiplyScalar(-N).addScaledVector(v2W, -N).add(zOff),
              v1W.clone().multiplyScalar(N).addScaledVector(v2W, -N).add(zOff),
              v1W.clone().multiplyScalar(N).addScaledVector(v2W, -N).add(zOff),
              v1W.clone().multiplyScalar(N).addScaledVector(v2W, N).add(zOff),
              v1W.clone().multiplyScalar(N).addScaledVector(v2W, N).add(zOff),
              v1W.clone().multiplyScalar(-N).addScaledVector(v2W, N).add(zOff),
              v1W.clone().multiplyScalar(-N).addScaledVector(v2W, N).add(zOff),
              v1W.clone().multiplyScalar(-N).addScaledVector(v2W, -N).add(zOff)
            );
          }
          const seg3 = makeLineSegments(pts3, it3.colorHexNum || 0xf59e0b, 0.28 * gridAppear, true);
          if (seg3) g.add(seg3);
        }

        // B. Khung viền nét đứt của khối hộp đơn vị cơ sở riêng gốc [1·v₁, 1·v₂, (1·v₃)]
        const unitOutlineColor = isDark ? 0xf8fafc : 0x0f172a;
        addParallelepiped3D(v1W, v2W, v3W, unitOutlineColor, 0.0, 0.62 * gridAppear, true);

        // C. Khối hộp cơ sở riêng co giãn dọc theo các trục bất biến từ [1·vᵢ] tới [λᵢ·vᵢ]
        const s1 = (1 - scaleT) * 1.0 + scaleT * it1.lambda;
        const s2 = (1 - scaleT) * 1.0 + scaleT * it2.lambda;
        const s3 = it3 ? (1 - scaleT) * 1.0 + scaleT * it3.lambda : 1.0;

        const sv1W = v1W.clone().multiplyScalar(s1);
        const sv2W = v2W.clone().multiplyScalar(s2);
        const sv3W = v3W ? v3W.clone().multiplyScalar(s3) : null;

        addParallelepiped3D(
          sv1W,
          sv2W,
          sv3W,
          0x10b981,
          (v3W ? 0.14 : 0.22) * gridAppear,
          0.95 * gridAppear,
          false
        );
      }
    }
  };

  App.EigenAnimator = EigenAnimator;
  App.solveEigenSystem = solveEigenSystem;

  const _prevIsBlockedEigen = App.isInteractionBlocked;
  App.isInteractionBlocked = function () {
    if (EigenAnimator.isActive()) return true;
    if (typeof _prevIsBlockedEigen === "function") return !!_prevIsBlockedEigen();
    return false;
  };
})();
