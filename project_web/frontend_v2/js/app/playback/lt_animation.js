// ==================================================================================
// LINEAR TRANSFORMATION 3-STEP PLAYBACK ENGINE (PURE GEOMETRY)
// Truc quan hoa ban chat Anh xa tuyen tinh, Hat nhan Ker(T) & Khong gian anh Im(T)
// Ho tro dong bo ca 2D Canvas (ma tran 2x2) va 3D Three.js (ma tran 3x3)
// Kich ban 3 buoc lien hoan chuan ban chat Dai so Tuyen tinh (0 chu giai tren Canvas):
//   Buoc 1: Anh xa Co so chuan e_j -> T(e_j) sinh ra cac Cot cua Ma tran A
//   Buoc 2: Su sup do cua Hat nhan Ker(T) = {x | Ax = 0} ve Goc toa do O
//   Buoc 3: Ket tinh Khong gian anh Im(T) & Dinh ly Hang - So khuyet
// Tuan thu triet de Zero Em-dash (\u2014) va chuan muc Anti-Slop.
// ==================================================================================
(function () {
  window.App = window.App || {};

  function smoothstep(t) {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
  }

  function to3D(v) {
    if (!v) return [0, 0, 0];
    if (v.length >= 3) return [Number(v[0]) || 0, Number(v[1]) || 0, Number(v[2]) || 0];
    return [Number(v[0]) || 0, Number(v[1]) || 0, 0];
  }

  function norm(v) {
    return Math.hypot(v[0] || 0, v[1] || 0, v[2] || 0);
  }

  function cross(a, b) {
    return [
      (a[1] || 0) * (b[2] || 0) - (a[2] || 0) * (b[1] || 0),
      (a[2] || 0) * (b[0] || 0) - (a[0] || 0) * (b[2] || 0),
      (a[0] || 0) * (b[1] || 0) - (a[1] || 0) * (b[0] || 0)
    ];
  }

  function scaleVec(v, s) {
    return [(v[0] || 0) * s, (v[1] || 0) * s, (v[2] || 0) * s];
  }

  function lerpVec(a, b, t) {
    return [
      (a[0] || 0) * (1 - t) + (b[0] || 0) * t,
      (a[1] || 0) * (1 - t) + (b[1] || 0) * t,
      (a[2] || 0) * (1 - t) + (b[2] || 0) * t
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

  function canonicalizeVector(vec) {
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
      return d === 3 ? [0, 0, 0] : [0, 0];
    }
    const scaled = vec.map((x) => (x / maxAbs) * firstNonZeroSign);
    for (let mult = 1; mult <= 12; mult++) {
      const cand = scaled.map((x) => x * mult);
      const allInt = cand.every((x) => Math.abs(x - Math.round(x)) < 1e-3);
      if (allInt) {
        return cand.map((x) => {
          const r = Math.round(x);
          return Object.is(r, -0) ? 0 : r;
        });
      }
    }
    return scaled.map((x) => (Math.abs(x) < 1e-5 ? 0 : Number(x.toFixed(3))));
  }

  // --- THUAT TOAN DAI SO TUYEN TINH PHAN TICH ANH XA TUYEN TINH ---
  function analyzeLinearTransformation(rawValues, n) {
    const dim = n === 3 ? 3 : 2;
    const matrix = [];
    for (let i = 0; i < dim; i++) {
      matrix[i] = [];
      for (let j = 0; j < dim; j++) {
        matrix[i][j] = Number(rawValues?.[i]?.[j] ?? 0);
      }
    }

    let det = 0;
    if (dim === 2) {
      det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    } else {
      det =
        matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
        matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
        matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);
    }

    let trace = 0;
    for (let i = 0; i < dim; i++) trace += matrix[i][i];

    const standardBasis = [];
    const columns = [];
    for (let j = 0; j < dim; j++) {
      const ej = new Array(dim).fill(0);
      ej[j] = 1;
      standardBasis.push(ej);

      const col = [];
      for (let i = 0; i < dim; i++) {
        col.push(matrix[i][j]);
      }
      columns.push(col);
    }

    // Khu Gauss - Jordan tim RREF, hang (rank) va so khuyet (nullity)
    const RREF = matrix.map((row) => row.slice());
    const pivotCols = [];
    const pivotRows = [];
    let pr = 0;
    const eps = 1e-5;

    for (let c = 0; c < dim && pr < dim; c++) {
      let maxR = pr;
      let maxVal = Math.abs(RREF[pr][c]);
      for (let r = pr + 1; r < dim; r++) {
        if (Math.abs(RREF[r][c]) > maxVal) {
          maxVal = Math.abs(RREF[r][c]);
          maxR = r;
        }
      }
      if (maxVal < eps) continue;

      const tmp = RREF[pr];
      RREF[pr] = RREF[maxR];
      RREF[maxR] = tmp;

      const pv = RREF[pr][c];
      for (let j = c; j < dim; j++) RREF[pr][j] /= pv;
      for (let r = 0; r < dim; r++) {
        if (r !== pr && Math.abs(RREF[r][c]) > 1e-9) {
          const factor = RREF[r][c];
          for (let j = c; j < dim; j++) RREF[r][j] -= factor * RREF[pr][j];
        }
      }
      pivotCols.push(c);
      pivotRows.push(pr);
      pr++;
    }

    const rank = pivotCols.length;
    const nullity = dim - rank;

    const freeCols = [];
    for (let c = 0; c < dim; c++) {
      if (!pivotCols.includes(c)) freeCols.push(c);
    }

    const kerBasis = [];
    if (nullity > 0) {
      for (const freeCol of freeCols) {
        const x = new Array(dim).fill(0);
        x[freeCol] = 1;
        for (let i = 0; i < pivotCols.length; i++) {
          const pivCol = pivotCols[i];
          const pivRow = pivotRows[i];
          x[pivCol] = -RREF[pivRow][freeCol];
        }
        kerBasis.push(canonicalizeVector(x));
      }
    }

    const imBasis = pivotCols.map((c) => columns[c]);

    const sampleKerPoints = [];
    if (nullity === 1 && kerBasis.length >= 1) {
      const k = kerBasis[0];
      const kLen = norm(to3D(k));
      if (kLen > 1e-6) {
        const u = k.map((coord) => coord / kLen);
        [-3.2, -2.1, -1.05, 1.05, 2.1, 3.2].forEach((s) => {
          sampleKerPoints.push(u.map((c) => c * s));
        });
      }
    } else if (nullity === 2 && kerBasis.length >= 2) {
      const k1 = to3D(kerBasis[0]);
      const k2 = to3D(kerBasis[1]);
      const l1 = norm(k1) || 1;
      const l2 = norm(k2) || 1;
      [-2.0, 0, 2.0].forEach((s1) => {
        [-2.0, 0, 2.0].forEach((s2) => {
          if (Math.abs(s1) < 1e-3 && Math.abs(s2) < 1e-3) return;
          sampleKerPoints.push([
            (s1 * k1[0]) / l1 + (s2 * k2[0]) / l2,
            (s1 * k1[1]) / l1 + (s2 * k2[1]) / l2,
            (s1 * k1[2]) / l1 + (s2 * k2[2]) / l2
          ]);
        });
      });
    }

    return {
      dim,
      is3D: dim === 3,
      matrix,
      det,
      trace,
      rank,
      nullity,
      isInvertible: rank === dim,
      standardBasis,
      columns,
      pivotCols,
      freeCols,
      kerBasis,
      imBasis,
      sampleKerPoints
    };
  }

  const PHASES = [
    {
      index: 0,
      title: "Bước 1: Ánh xạ cơ sở chuẩn eⱼ → T(eⱼ) sinh ra các cột ma trận A",
      desc: "Lưới không gian biến dạng liên tục từ ma trận đơn vị I sang ma trận A theo M(t) = (1 - t)I + tA. Các vector cơ sở chuẩn eⱼ dịch chuyển đến ảnh T(eⱼ), chính là các cột của A."
    },
    {
      index: 1,
      title: "Bước 2: Sự sụp đổ của hạt nhân Ker(T) = {x | Ax = 0} về gốc O",
      desc: "Không gian hạt nhân Ker(T) (đỏ hoa hồng) chứa mọi vector bị ánh xạ triệt tiêu. Khi A tác động, toàn bộ các điểm trên Ker(T) bị nén dọc theo phương hạt nhân và hút tụt hoàn toàn về gốc tọa độ O."
    },
    {
      index: 2,
      title: "Bước 3: Kết tinh không gian ảnh Im(T) & Định lý Hạng - Số khuyết",
      desc: "Không gian ảnh Im(T) = span(Cols(A)) (xanh lục bảo) là phần không gian còn trụ lại sau biến đổi. Số chiều bị ép mất dim Ker(T) cộng với số chiều ảnh dim Im(T) luôn bằng đúng số chiều nguồn n."
    }
  ];

  const LTAnimator = {
    _active: false,
    _paused: false,
    _currentPhase: 0,
    _phaseProgress: 0,
    _phaseTimer: null,
    _raf: null,
    _speed: 1.0,
    _analysis: null,
    _matrixItem: null,
    _savedVecVis: null,
    _tempVecIds: [],
    _savedCamPos3D: null,
    _threeGroup: null,

    isActive() {
      return this._active;
    },

    getCurrentPhase() {
      return this._currentPhase;
    },

    getAnalysis() {
      return this._analysis;
    },

    getLTData() {
      return this._analysis;
    },

    _frame3DCameraIfNeeded() {
      if (App.mode !== "3D" || !window.Vec3D || !Vec3D._camera || !Vec3D._controls || !this._analysis) return;
      if (this._savedCamPos3D) return;

      if (Vec3D._resetAnimId) {
        cancelAnimationFrame(Vec3D._resetAnimId);
        Vec3D._resetAnimId = null;
      }
      this._savedCamPos3D = Vec3D._camera.position.clone();
      let maxReach = 3.0;
      for (const col of this._analysis.columns) {
        maxReach = Math.max(maxReach, norm(to3D(col)));
      }
      const dist = Math.max(11.0, Math.min(24.0, maxReach * 2.55));
      Vec3D._camera.position.set(dist * 1.32, dist * 0.58, dist * 0.76);
      Vec3D._camera.up.set(0, 0, 1);
      Vec3D._controls.target.set(0, 0, 0);
      Vec3D._camera.lookAt(0, 0, 0);
      Vec3D._controls.update();
      if (typeof Vec3D.addAxisLabelsDynamic === "function") {
        Vec3D.addAxisLabelsDynamic();
      }
    },

    start(selectedItem) {
      let item = selectedItem;
      let values = null;

      if (!item) {
        const found = App.getOrEnsureSelectedSquareMatrix
          ? App.getOrEnsureSelectedSquareMatrix("ltMatrixSelect")
          : null;
        if (found) {
          item = found.item;
          values = found.values;
        }
      } else {
        values = typeof item.evalMatrix === "function" ? item.evalMatrix() : item.values;
      }

      if (!item || !values) {
        if (typeof App.showToast === "function") {
          App.showToast("Hãy chọn ma trận vuông ở danh sách để trực quan!", "warning");
        }
        return false;
      }

      this.stop();

      const n = item.rows;
      const analysis = analyzeLinearTransformation(values, n);
      this._analysis = analysis;
      this._matrixItem = item;

      // An tam thoi vector cua nguoi dung va them vector co so/anh tam thoi
      this._savedVecVis = (App.vectorList || []).map((v) => ({
        id: v.id,
        visible: v.visible
      }));
      (App.vectorList || []).forEach((v) => {
        v.visible = false;
      });

      this._tempVecIds = [];
      const colors = ["#0284c7", "#10b981", "#f59e0b"];

      if (Array.isArray(App.vectorList)) {
        for (let j = 0; j < analysis.dim; j++) {
          const tempId = -9701 - j;
          this._tempVecIds.push(tempId);
          App.vectorList.push({
            id: tempId,
            vec: analysis.standardBasis[j].slice(),
            name: `e_${j + 1}`,
            _customLabelLatex: `e_${j + 1}`,
            colorCss: colors[j % 3],
            colorHex: colors[j % 3],
            visible: true,
            alpha: 1.0,
            showProjection: false,
            _isLTTemp: true
          });
        }

        // Vector mau tren Ker(T) cho Buoc 2
        if (analysis.nullity > 0 && analysis.kerBasis.length > 0) {
          const kVec = to3D(analysis.kerBasis[0]);
          const kLen = norm(kVec);
          const scaledK = kLen > 1e-5 ? scaleVec(kVec, 2.0 / kLen) : kVec;
          const kId = -9711;
          this._tempVecIds.push(kId);
          App.vectorList.push({
            id: kId,
            vec: scaledK.slice(0, analysis.dim),
            name: "x_ker",
            _customLabelLatex: "x_{\\text{Ker}}",
            colorCss: "#f43f5e",
            colorHex: "#f43f5e",
            visible: false,
            alpha: 0,
            showProjection: false,
            _isLTTemp: true
          });
        }
      }

      if (analysis.is3D && App.mode !== "3D") {
        if (typeof App.setMode === "function") App.setMode("3D");
        else if (typeof App.toggleMode === "function") App.toggleMode();
      } else if (!analysis.is3D && App.mode === "3D") {
        if (typeof App.setMode === "function") App.setMode("2D");
        else if (typeof App.toggleMode === "function") App.toggleMode();
      }

      this._savedCamPos3D = null;
      this._frame3DCameraIfNeeded();

      this.ensureControls();
      const wrap = document.getElementById("ltAnimControls");
      if (wrap) wrap.style.display = "block";

      this._active = true;
      this._paused = false;
      this._currentPhase = 0;
      this._phaseProgress = 0;
      App._ltAnimActive = true;

      this.applyPhaseVectors(0, 0);
      this.updateSidebarUI();
      this.runCurrentPhase();
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
      App._ltAnimActive = false;

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
          if (App.vectorList[i]._isLTTemp || this._tempVecIds.includes(App.vectorList[i].id)) {
            App.vectorList.splice(i, 1);
          }
        }
        if (this._savedVecVis) {
          for (const s of this._savedVecVis) {
            const found = App.vectorList.find((v) => v.id === s.id);
            if (found) found.visible = s.visible;
          }
        }
      }
      this._tempVecIds = [];
      this._savedVecVis = null;
      this._analysis = null;

      const wrap = document.getElementById("ltAnimControls");
      if (wrap) wrap.style.display = "none";

      if (wasActive) {
        this.redraw();
      }
    },

    applyPhaseVectors(phase, progress) {
      if (!this._analysis || !Array.isArray(App.vectorList)) return;
      const an = this._analysis;
      const d = an.dim;
      const t = smoothstep(progress);

      for (let j = 0; j < d; j++) {
        const vItem = App.vectorList.find((v) => v.id === -9701 - j);
        if (!vItem) continue;

        const ej = to3D(an.standardBasis[j]);
        const colj = to3D(an.columns[j]);

        if (phase === 0) {
          const cur = lerpVec(ej, colj, t);
          vItem.vec = cur.slice(0, d);
          vItem._customLabelLatex = t > 0.55 ? `T(e_${j + 1})` : `e_${j + 1}`;
          vItem._ltAlpha = norm(cur) > 1e-3 ? 1.0 : 0.05;
          vItem.alpha = vItem._ltAlpha;
          vItem.visible = norm(cur) > 1e-3;
        } else if (phase === 1) {
          // O Buoc 2: Bien doi lai tu e_j -> T(e_j) trong nua sau de thay su nen cung hat nhan
          const tCollapse = smoothstep((progress - 0.25) / 0.75);
          const cur = lerpVec(ej, colj, tCollapse);
          vItem.vec = cur.slice(0, d);
          vItem._customLabelLatex = `T(e_${j + 1})`;
          vItem._ltAlpha = norm(cur) > 1e-3 ? 0.65 : 0.02;
          vItem.alpha = vItem._ltAlpha;
          vItem.visible = norm(cur) > 1e-3;
        } else if (phase === 2) {
          const isPivot = an.pivotCols.includes(j);
          vItem.vec = colj.slice(0, d);
          vItem._customLabelLatex = `T(e_${j + 1})`;
          vItem._ltAlpha = isPivot ? 1.0 : 0.45;
          vItem.alpha = vItem._ltAlpha;
          vItem.visible = norm(colj) > 1e-3;
        }
      }

      // Vector mau tren Ker(T)
      const kItem = App.vectorList.find((v) => v.id === -9711);
      if (kItem) {
        if (phase === 1 && an.nullity > 0 && an.kerBasis.length > 0) {
          const kVec = to3D(an.kerBasis[0]);
          const kLen = norm(kVec);
          const scaledK = kLen > 1e-5 ? scaleVec(kVec, 2.2 / kLen) : kVec;
          const tCollapse = smoothstep((progress - 0.25) / 0.75);
          const remain = Math.max(0, 1.0 - tCollapse);
          const curK = scaleVec(scaledK, remain);
          kItem.vec = curK.slice(0, d);
          kItem.visible = remain > 0.04;
          kItem._ltAlpha = Math.max(0.1, remain);
          kItem.alpha = kItem._ltAlpha;
        } else {
          kItem.visible = false;
          kItem.alpha = 0;
        }
      }
    },

    redraw() {
      this._frame3DCameraIfNeeded();
      if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
        Vec2D.draw2DAllVectors();
      }
      if (window.Vec3D && typeof Vec3D.hardRefresh3D === "function") {
        Vec3D.hardRefresh3D(false);
      }
    },

    goToPhase(phaseIdx) {
      if (!this._analysis) return;
      if (this._phaseTimer) {
        clearTimeout(this._phaseTimer);
        this._phaseTimer = null;
      }
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }

      this._frame3DCameraIfNeeded();
      this._currentPhase = Math.max(0, Math.min(2, phaseIdx));
      this._phaseProgress = 0;
      this.applyPhaseVectors(this._currentPhase, 0);
      this.updateSidebarUI();
      this.redraw();

      if (this._active && !this._paused) {
        this.runCurrentPhase();
      } else if (this._paused) {
        this._phaseProgress = 1.0;
        this.applyPhaseVectors(this._currentPhase, 1.0);
        this.redraw();
      }
    },

    pause() {
      this._paused = true;
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }
      if (this._phaseTimer) {
        clearTimeout(this._phaseTimer);
        this._phaseTimer = null;
      }
      this.updateSidebarUI();
    },

    resume() {
      if (!this._active) return;
      this._paused = false;
      this.updateSidebarUI();
      if (this._phaseProgress >= 0.999) {
        if (this._currentPhase < 2) {
          this.goToPhase(this._currentPhase + 1);
        } else {
          this.goToPhase(0);
        }
      } else {
        this.runCurrentPhase();
      }
    },

    togglePlay() {
      this.togglePlayPause();
    },

    applyPhaseStyles(phase, progress) {
      this.applyPhaseVectors(phase, progress);
    },

    togglePlayPause() {
      if (!this._active) {
        this.start();
        return;
      }
      this._paused = !this._paused;
      this.updateSidebarUI();

      if (!this._paused) {
        if (this._phaseProgress >= 0.999) {
          if (this._currentPhase < 2) {
            this.goToPhase(this._currentPhase + 1);
          } else {
            this.goToPhase(0);
          }
        } else {
          this.runCurrentPhase();
        }
      } else {
        if (this._raf) {
          cancelAnimationFrame(this._raf);
          this._raf = null;
        }
        if (this._phaseTimer) {
          clearTimeout(this._phaseTimer);
          this._phaseTimer = null;
        }
      }
    },

    setSpeed(speed) {
      this._speed = Math.max(0.2, Math.min(2.5, speed));
      const valEl = document.getElementById("ltSpeedValue");
      if (valEl) valEl.textContent = `${this._speed.toFixed(1)}×`;
    },

    runCurrentPhase() {
      if (!this._active || this._paused) return;

      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }
      if (this._phaseTimer) {
        clearTimeout(this._phaseTimer);
        this._phaseTimer = null;
      }

      let lastTime = performance.now();
      const baseDurations = [2600, 2900, 2500];

      const tick = (now) => {
        if (!this._active || this._paused) return;

        const dt = Math.max(0, now - lastTime);
        lastTime = now;

        const speed = Math.max(0.2, this._speed || 1.0);
        const dur = baseDurations[this._currentPhase] || 2600;
        this._phaseProgress = Math.min(1.0, this._phaseProgress + (dt * speed) / dur);

        this.applyPhaseVectors(this._currentPhase, this._phaseProgress);
        this.redraw();

        if (this._phaseProgress < 1.0) {
          this._raf = requestAnimationFrame(tick);
        } else {
          this.applyPhaseVectors(this._currentPhase, 1.0);
          this.redraw();
          if (this._currentPhase < 2) {
            this._phaseTimer = setTimeout(() => {
              if (this._active && !this._paused) {
                this._currentPhase++;
                this._phaseProgress = 0;
                this.applyPhaseVectors(this._currentPhase, 0);
                this.updateSidebarUI();
                this.runCurrentPhase();
              }
            }, 420 / speed);
          } else {
            this._paused = true;
            this.updateSidebarUI();
          }
        }
      };

      this._raf = requestAnimationFrame(tick);
    },

    updateSidebarUI() {
      const counter = document.getElementById("ltStepCounter");
      if (counter) counter.textContent = `Bước ${this._currentPhase + 1} / 3`;

      const pills = document.querySelectorAll("#ltPhasePills .coord-phase-btn");
      pills.forEach((p, idx) => {
        p.classList.toggle("active", idx === this._currentPhase);
      });

      const playBtn = document.getElementById("btnLTPlay");
      const playIcon = document.getElementById("iconLTPlay");
      if (playBtn && playIcon) {
        const isPlaying = this._active && !this._paused;
        if (isPlaying) {
          playIcon.className = "ph ph-pause";
          playBtn.style.background = "#ef4444";
          playBtn.style.borderColor = "#ef4444";
          playBtn.style.color = "#ffffff";
          playBtn.title = "Tạm dừng";
        } else {
          playIcon.className = "ph ph-play";
          playBtn.style.background = "";
          playBtn.style.borderColor = "";
          playBtn.style.color = "";
          playBtn.title = "Phát";
        }
      }

      const pInfo = PHASES[this._currentPhase] || PHASES[0];
      const titleEl = document.getElementById("ltStepTitle");
      const descEl = document.getElementById("ltStepDesc");
      const an = this._analysis;
      if (titleEl) titleEl.textContent = pInfo.title;

      if (descEl) {
        if (!an) {
          descEl.textContent = pInfo.desc;
          return;
        }
        if (this._currentPhase === 0) {
          const colsStr = an.columns
            .map((c, idx) => `<b>T(e<sub>${idx + 1}</sub>) = [${c.map(formatScalar).join(", ")}]</b>`)
            .join(", ");
          descEl.innerHTML = `Lưới tọa độ biến dạng liên tục từ <b>I → A</b>.<br>Các cột của ma trận A chính là tọa độ ảnh của cơ sở chuẩn: ${colsStr}. Định thức <b>det(A) = ${formatScalar(an.det)}</b>.`;
        } else if (this._currentPhase === 1) {
          if (an.nullity === 0) {
            descEl.innerHTML = `Vì <b>det(A) = ${formatScalar(an.det)} ≠ 0</b> nên hệ phương trình thuần nhất <b>Ax = 0</b> chỉ có nghiệm tầm thường.<br>Hạt nhân <b>Ker(T) = {0}</b> (số khuyết <b>nullity = 0</b>, ánh xạ là đơn ánh).`;
          } else {
            const kerStr = an.kerBasis.map((v) => `[${v.map(formatScalar).join(", ")}]`).join(", ");
            descEl.innerHTML = `Hạt nhân <b>Ker(T) = span{${kerStr}}</b> (đường/mặt màu đỏ hoa hồng, <b>dim Ker(T) = ${an.nullity}</b>).<br>Khi ma trận A tác động, toàn bộ các vector thuộc <b>Ker(T)</b> bị ép dọc theo phương hạt nhân và hút tụt hoàn toàn về gốc <b>O(0, 0)</b>.`;
          }
        } else if (this._currentPhase === 2) {
          const imStr =
            an.imBasis.length > 0
              ? `span{${an.imBasis.map((v) => `[${v.map(formatScalar).join(", ")}]`).join(", ")}}`
              : "{0}";
          descEl.innerHTML = `Không gian ảnh <b>Im(T) = ${imStr}</b> (màu xanh lục bảo, <b>dim Im(T) = rank(A) = ${an.rank}</b>).<br>Định lý Hạng - Số khuyết: <b>dim Ker(T) (${an.nullity}) + dim Im(T) (${an.rank}) = ${an.dim}</b>.`;
        }
      }
    },

    ensureControls() {
      let wrap = document.getElementById("ltAnimControls");
      if (!wrap) {
        const out = document.getElementById("result_lt_info");
        const host = out ? out.parentElement : document.getElementById("form-topic5_linear_transformation");
        if (!host) return;

        wrap = document.createElement("div");
        wrap.id = "ltAnimControls";
        wrap.className = "basis-sidebar-anim-box";
        wrap.style.display = "none";
        wrap.style.marginTop = "10px";

        wrap.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted, #64748b);">Trực quan Ánh xạ Tuyến tính</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="basis-step-pill" id="ltStepCounter">Bước 1 / 3</span>
              <button type="button" id="btnLTCloseAnim" class="basis-anim-close-btn" title="Đóng trực quan" style="background: transparent; border: none; cursor: pointer; color: var(--text-muted, #64748b); font-size: 13px; padding: 2px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px;">
                <i class="ph ph-x"></i>
              </button>
            </div>
          </div>

          <div class="coord-phase-pills" id="ltPhasePills">
            <button type="button" class="coord-phase-btn active" data-phase="0" title="Bước 1: Ánh xạ cơ sở chuẩn & Cột ma trận">Bước 1</button>
            <button type="button" class="coord-phase-btn" data-phase="1" title="Bước 2: Hạt nhân Ker(T) sụp đổ về gốc O">Bước 2</button>
            <button type="button" class="coord-phase-btn" data-phase="2" title="Bước 3: Không gian ảnh Im(T) & Định lý số chiều">Bước 3</button>
          </div>

          <div class="basis-anim-btn-row">
            <button type="button" id="btnLTPrev" class="basis-ctrl-btn" title="Bước trước">
              <i class="ph ph-skip-back"></i>
            </button>
            <button type="button" id="btnLTPlay" class="basis-ctrl-btn primary" title="Phát / Tạm dừng">
              <i class="ph ph-play" id="iconLTPlay"></i>
            </button>
            <button type="button" id="btnLTNext" class="basis-ctrl-btn" title="Bước tiếp">
              <i class="ph ph-skip-forward"></i>
            </button>
            <button type="button" id="btnLTReplay" class="basis-ctrl-btn" title="Phát lại từ đầu">
              <i class="ph ph-arrow-counter-clockwise"></i>
            </button>
          </div>

          <div class="hud-menu-slider-row basis-speed-slider-wrap" style="padding: 6px 0 2px; margin-top: 6px; border-top: 1px dashed var(--border-subtle, var(--border, #e2e8f0));">
            <div class="hud-menu-slider-header" style="font-size: 11.5px; margin-bottom: 2px;">
              <span class="hud-menu-item-text" style="color: var(--text-muted, #64748b); font-weight: 600;">Tốc độ phát</span>
              <span class="hud-menu-slider-val" id="ltSpeedValue">1.0×</span>
            </div>
            <input type="range" id="ltSpeedSlider" min="0.2" max="2.5" step="0.1" value="1.0" class="hud-range-slider" />
          </div>

          <div class="basis-step-explainer" id="ltStepExplainer">
            <div class="basis-step-title" id="ltStepTitle">Bước 1: Ánh xạ Cơ sở chuẩn & Cột Ma trận</div>
            <div class="basis-step-desc" id="ltStepDesc">Lưới không gian biến dạng theo M(t) = (1-t)I + tA.</div>
          </div>
        `;

        // Dat ngay TRƯỚC #result_lt_info
        if (out) {
          host.insertBefore(wrap, out);
        } else {
          host.appendChild(wrap);
        }

        const btnClose = document.getElementById("btnLTCloseAnim");
        if (btnClose) {
          btnClose.addEventListener("click", () => {
            this.stop();
          });
        }

        const pills = wrap.querySelectorAll("#ltPhasePills .coord-phase-btn");
        pills.forEach((btn) => {
          btn.addEventListener("click", () => {
            const p = parseInt(btn.dataset.phase, 10) || 0;
            this.goToPhase(p);
          });
        });

        const btnPlay = document.getElementById("btnLTPlay");
        if (btnPlay) {
          btnPlay.addEventListener("click", () => this.togglePlayPause());
        }

        const btnPrev = document.getElementById("btnLTPrev");
        if (btnPrev) {
          btnPrev.addEventListener("click", () => {
            this.goToPhase(Math.max(0, this._currentPhase - 1));
          });
        }

        const btnNext = document.getElementById("btnLTNext");
        if (btnNext) {
          btnNext.addEventListener("click", () => {
            this.goToPhase(Math.min(2, this._currentPhase + 1));
          });
        }

        const btnReplay = document.getElementById("btnLTReplay");
        if (btnReplay) {
          btnReplay.addEventListener("click", () => {
            this._paused = false;
            this.goToPhase(0);
          });
        }

        const slider = document.getElementById("ltSpeedSlider");
        if (slider) {
          slider.addEventListener("input", (e) => {
            this.setSpeed(parseFloat(e.target.value) || 1.0);
          });
        }
      }
    },

    // =========================================================================
    // KET XUAT 2D CANVAS (viewer2D.js Hooks - 0 PROSE TEXT ON CANVAS)
    // =========================================================================
    render2DSubspace(ctx2d, gridInfo2D) {
      if (!this._active || !this._analysis || this._analysis.is3D) return;
      if (!ctx2d || !gridInfo2D) return;

      const { cx, cy, px } = gridInfo2D;
      const wX = (x) => cx + x * px;
      const wY = (y) => cy - y * px;

      const an = this._analysis;
      const rawP = this._phaseProgress;
      const t = smoothstep(rawP);

      ctx2d.save();

      const drawDeformedGrid2D = (v1, v2, strokeStyle, fillStyle, borderStyle) => {
        ctx2d.strokeStyle = strokeStyle;
        ctx2d.lineWidth = 1.05;
        ctx2d.beginPath();
        for (let k = -8; k <= 8; k++) {
          const sx1 = k * v2[0] - 12 * v1[0];
          const sy1 = k * v2[1] - 12 * v1[1];
          const ex1 = k * v2[0] + 12 * v1[0];
          const ey1 = k * v2[1] + 12 * v1[1];
          ctx2d.moveTo(wX(sx1), wY(sy1));
          ctx2d.lineTo(wX(ex1), wY(ey1));

          const sx2 = k * v1[0] - 12 * v2[0];
          const sy2 = k * v1[1] - 12 * v2[1];
          const ex2 = k * v1[0] + 12 * v2[0];
          const ey2 = k * v1[1] + 12 * v2[1];
          ctx2d.moveTo(wX(sx2), wY(sy2));
          ctx2d.lineTo(wX(ex2), wY(ey2));
        }
        ctx2d.stroke();

        // Hinh binh hanh don vi cang boi v1, v2
        ctx2d.fillStyle = fillStyle;
        ctx2d.strokeStyle = borderStyle;
        ctx2d.lineWidth = 1.6;
        ctx2d.beginPath();
        ctx2d.moveTo(wX(0), wY(0));
        ctx2d.lineTo(wX(v1[0]), wY(v1[1]));
        ctx2d.lineTo(wX(v1[0] + v2[0]), wY(v1[1] + v2[1]));
        ctx2d.lineTo(wX(v2[0]), wY(v2[1]));
        ctx2d.closePath();
        ctx2d.fill();
        ctx2d.stroke();
      };

      const e1 = [1, 0];
      const e2 = [0, 1];
      const c1 = an.columns[0];
      const c2 = an.columns[1];

      if (this._currentPhase === 0) {
        // Bong mo o vuong don vi ban dau [0,1]^2
        ctx2d.strokeStyle = "rgba(148, 163, 184, 0.45)";
        ctx2d.fillStyle = "rgba(148, 163, 184, 0.06)";
        ctx2d.lineWidth = 1.2;
        ctx2d.setLineDash([4, 4]);
        ctx2d.fillRect(wX(0), wY(1), px, px);
        ctx2d.strokeRect(wX(0), wY(1), px, px);
        ctx2d.setLineDash([]);

        const v1 = [(1 - t) * e1[0] + t * c1[0], (1 - t) * e1[1] + t * c1[1]];
        const v2 = [(1 - t) * e2[0] + t * c2[0], (1 - t) * e2[1] + t * c2[1]];
        drawDeformedGrid2D(v1, v2, "rgba(2, 132, 199, 0.16)", "rgba(2, 132, 199, 0.15)", "rgba(2, 132, 199, 0.55)");
      } else if (this._currentPhase === 1) {
        // Buoc 2: Hat nhan Ker(T) sup do ve goc O
        const tCollapse = smoothstep((rawP - 0.25) / 0.75);
        const v1 = [(1 - tCollapse) * e1[0] + tCollapse * c1[0], (1 - tCollapse) * e1[1] + tCollapse * c1[1]];
        const v2 = [(1 - tCollapse) * e2[0] + tCollapse * c2[0], (1 - tCollapse) * e2[1] + tCollapse * c2[1]];
        drawDeformedGrid2D(v1, v2, "rgba(148, 163, 184, 0.14)", "rgba(2, 132, 199, 0.08)", "rgba(2, 132, 199, 0.30)");

        if (an.nullity >= 1 && an.kerBasis.length >= 1) {
          const k = an.kerBasis[0];
          const kLen = Math.hypot(k[0], k[1]) || 1;
          const kx = k[0] / kLen;
          const ky = k[1] / kLen;
          const far = 30;

          // Duong thang Hat nhan Ker(T) di qua goc O
          ctx2d.strokeStyle = "rgba(244, 63, 94, 0.85)";
          ctx2d.lineWidth = 2.4;
          ctx2d.setLineDash([7, 5]);
          ctx2d.beginPath();
          ctx2d.moveTo(wX(-far * kx), wY(-far * ky));
          ctx2d.lineTo(wX(far * kx), wY(far * ky));
          ctx2d.stroke();
          ctx2d.setLineDash([]);
        }
      } else if (this._currentPhase === 2) {
        // Buoc 3: Khong gian anh Im(T) & Bao toan so chieu
        const pShow = smoothstep(rawP);

        if (an.rank === 1 && an.imBasis.length >= 1) {
          const im = an.imBasis[0];
          const imLen = Math.hypot(im[0], im[1]) || 1;
          const ix = im[0] / imLen;
          const iy = im[1] / imLen;
          const far = 30 * pShow;

          // Ghost duong Ker(T) bi ep mat
          if (an.kerBasis.length >= 1) {
            const k = an.kerBasis[0];
            const kLen = Math.hypot(k[0], k[1]) || 1;
            const kx = k[0] / kLen;
            const ky = k[1] / kLen;
            ctx2d.strokeStyle = "rgba(244, 63, 94, 0.42)";
            ctx2d.lineWidth = 1.8;
            ctx2d.setLineDash([6, 5]);
            ctx2d.beginPath();
            ctx2d.moveTo(wX(-28 * kx), wY(-28 * ky));
            ctx2d.lineTo(wX(28 * kx), wY(28 * ky));
            ctx2d.stroke();
            ctx2d.setLineDash([]);
          }

          // Duong thang Khong gian anh Im(T) (Xanh luc bao dam)
          ctx2d.strokeStyle = "rgba(16, 185, 129, 0.25)";
          ctx2d.lineWidth = 8.0;
          ctx2d.beginPath();
          ctx2d.moveTo(wX(-far * ix), wY(-far * iy));
          ctx2d.lineTo(wX(far * ix), wY(far * iy));
          ctx2d.stroke();

          ctx2d.strokeStyle = "#10b981";
          ctx2d.lineWidth = 2.8;
          ctx2d.beginPath();
          ctx2d.moveTo(wX(-far * ix), wY(-far * iy));
          ctx2d.lineTo(wX(far * ix), wY(far * iy));
          ctx2d.stroke();
        } else if (an.rank === 2) {
          drawDeformedGrid2D(c1, c2, "rgba(16, 185, 129, 0.18)", "rgba(16, 185, 129, 0.16)", "rgba(16, 185, 129, 0.65)");
        }
      }

      ctx2d.restore();
    },

    render2DProjections(ctx2d, gridInfo2D) {
      if (!this._active || !this._analysis || this._analysis.is3D) return;
      if (!ctx2d || !gridInfo2D) return;

      const { cx, cy, px } = gridInfo2D;
      const wX = (x) => cx + x * px;
      const wY = (y) => cy - y * px;

      const an = this._analysis;
      const rawP = this._phaseProgress;

      ctx2d.save();

      if (this._currentPhase === 0) {
        // Quy dao net dut tu ngon e_j den ngon T(e_j)
        const t = smoothstep(rawP);
        const e1 = [1, 0];
        const e2 = [0, 1];
        const c1 = an.columns[0];
        const c2 = an.columns[1];

        ctx2d.setLineDash([4, 3]);
        ctx2d.lineWidth = 1.4;

        ctx2d.strokeStyle = "rgba(2, 132, 199, 0.55)";
        ctx2d.beginPath();
        ctx2d.moveTo(wX(e1[0]), wY(e1[1]));
        ctx2d.lineTo(wX((1 - t) * e1[0] + t * c1[0]), wY((1 - t) * e1[1] + t * c1[1]));
        ctx2d.stroke();

        ctx2d.strokeStyle = "rgba(16, 185, 129, 0.55)";
        ctx2d.beginPath();
        ctx2d.moveTo(wX(e2[0]), wY(e2[1]));
        ctx2d.lineTo(wX((1 - t) * e2[0] + t * c2[0]), wY((1 - t) * e2[1] + t * c2[1]));
        ctx2d.stroke();
        ctx2d.setLineDash([]);
      } else if (this._currentPhase === 1) {
        const tCollapse = smoothstep((rawP - 0.25) / 0.75);
        const remain = 1.0 - tCollapse;

        // Vong tam ngam hap thu tai goc O(0,0)
        ctx2d.strokeStyle = "rgba(244, 63, 94, 0.85)";
        ctx2d.lineWidth = 1.8;
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, 6 + 6 * Math.sin(rawP * Math.PI), 0, Math.PI * 2);
        ctx2d.stroke();

        ctx2d.fillStyle = "#f43f5e";
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, 3.5, 0, Math.PI * 2);
        ctx2d.fill();

        // Cac hat mau tren Ker(T) bi hut tut ve goc O
        if (an.nullity >= 1) {
          an.sampleKerPoints.forEach((pt) => {
            const curX = pt[0] * remain;
            const curY = pt[1] * remain;
            const sx = wX(curX);
            const sy = wY(curY);

            ctx2d.fillStyle = "#f43f5e";
            ctx2d.beginPath();
            ctx2d.arc(sx, sy, 4.0, 0, Math.PI * 2);
            ctx2d.fill();
          });
        }
      } else if (this._currentPhase === 2) {
        // Vong nhan goc O(0,0)
        ctx2d.fillStyle = "#f43f5e";
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, 4.0, 0, Math.PI * 2);
        ctx2d.fill();
      }

      ctx2d.restore();
    },

    // =========================================================================
    // KET XUAT 3D THREE.JS (viewer3D.js Hooks)
    // =========================================================================
    render3D(parentGroup) {
      if (!this._active || !this._analysis) return;
      if (!window.THREE || !parentGroup) return;

      this._frame3DCameraIfNeeded();

      const an = this._analysis;
      const rawP = this._phaseProgress;
      const t = smoothstep(rawP);
      const u = (window.Vec3D && Vec3D.S3D && Vec3D.S3D.unitsPerWorld) || 1;

      if (!this._threeGroup) {
        this._threeGroup = new THREE.Group();
        this._threeGroup.name = "LTAnimator_Group";
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

      const addParallelepiped3D = (v1, v2, v3, colorHex, fillOpacity, edgeOpacity) => {
        const V = [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(v1[0] * u, v1[1] * u, v1[2] * u),
          new THREE.Vector3(v2[0] * u, v2[1] * u, v2[2] * u),
          new THREE.Vector3((v1[0] + v2[0]) * u, (v1[1] + v2[1]) * u, (v1[2] + v2[2]) * u),
          new THREE.Vector3(v3[0] * u, v3[1] * u, v3[2] * u),
          new THREE.Vector3((v1[0] + v3[0]) * u, (v1[1] + v3[1]) * u, (v1[2] + v3[2]) * u),
          new THREE.Vector3((v2[0] + v3[0]) * u, (v2[1] + v3[1]) * u, (v2[2] + v3[2]) * u),
          new THREE.Vector3(
            (v1[0] + v2[0] + v3[0]) * u,
            (v1[1] + v2[1] + v3[1]) * u,
            (v1[2] + v2[2] + v3[2]) * u
          )
        ];

        const indices = [0, 1, 3, 0, 3, 2, 4, 6, 7, 4, 7, 5, 0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6, 0, 2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3];
        const positions = [];
        for (let i = 0; i < indices.length; i++) {
          const pt = V[indices[i]];
          positions.push(pt.x, pt.y, pt.z);
        }

        const boxGeom = new THREE.BufferGeometry();
        boxGeom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        boxGeom.computeVertexNormals();

        if (fillOpacity > 0.01) {
          const boxMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: fillOpacity,
            side: THREE.DoubleSide,
            depthWrite: false
          });
          this._threeGroup.add(new THREE.Mesh(boxGeom, boxMat));
        }

        const edgeGeom = new THREE.EdgesGeometry(boxGeom);
        const edgeMat = new THREE.LineBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: edgeOpacity
        });
        this._threeGroup.add(new THREE.LineSegments(edgeGeom, edgeMat));
      };

      const cols = an.columns.map((c) => to3D(c));
      const std = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ];
      const c1 = cols[0] || [1, 0, 0];
      const c2 = cols[1] || [0, 1, 0];
      const c3 = cols[2] || [0, 0, 1];

      if (this._currentPhase === 0) {
        // Bong mo khoi lap phuong don vi [0,1]^3 ban dau
        addParallelepiped3D(std[0], std[1], std[2], 0x94a3b8, 0.04, 0.3);

        const v1 = lerpVec(std[0], c1, t);
        const v2 = lerpVec(std[1], c2, t);
        const v3 = an.is3D ? lerpVec(std[2], c3, t) : [0, 0, 0];
        if (an.is3D) {
          addParallelepiped3D(v1, v2, v3, 0x0284c7, 0.16, 0.65);
        }
      } else if (this._currentPhase === 1) {
        const tCollapse = smoothstep((rawP - 0.25) / 0.75);
        const remain = 1.0 - tCollapse;

        if (an.is3D) {
          const v1 = lerpVec(std[0], c1, tCollapse);
          const v2 = lerpVec(std[1], c2, tCollapse);
          const v3 = lerpVec(std[2], c3, tCollapse);
          addParallelepiped3D(v1, v2, v3, 0x0284c7, 0.08, 0.35);
        }

        // Diem goc O(0,0,0) mau do hoa hong
        const originSph = new THREE.Mesh(
          new THREE.SphereGeometry(0.14 * u, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0xf43f5e })
        );
        this._threeGroup.add(originSph);

        if (an.nullity === 1 && an.kerBasis.length >= 1) {
          const k = to3D(an.kerBasis[0]);
          const kLen = norm(k);
          if (kLen > 1e-4) {
            const dir = scaleVec(k, (14 * u) / kLen);
            const pts = [new THREE.Vector3(-dir[0], -dir[1], -dir[2]), new THREE.Vector3(dir[0], dir[1], dir[2])];
            const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
            const lineMat = new THREE.LineDashedMaterial({
              color: 0xf43f5e,
              dashSize: 0.35 * u,
              gapSize: 0.18 * u
            });
            const line = new THREE.Line(lineGeom, lineMat);
            line.computeLineDistances();
            this._threeGroup.add(line);

            an.sampleKerPoints.forEach((pt) => {
              const p3 = to3D(pt);
              const sph = new THREE.Mesh(
                new THREE.SphereGeometry(0.1 * u, 12, 12),
                new THREE.MeshBasicMaterial({ color: 0xf43f5e })
              );
              sph.position.set(p3[0] * remain * u, p3[1] * remain * u, p3[2] * remain * u);
              this._threeGroup.add(sph);
            });
          }
        } else if (an.nullity === 2 && an.kerBasis.length >= 2) {
          const k1 = to3D(an.kerBasis[0]);
          const k2 = to3D(an.kerBasis[1]);
          const nVec = cross(k1, k2);
          const nLen = norm(nVec);
          if (nLen > 1e-6) {
            const planeGeom = new THREE.PlaneGeometry(14 * u, 14 * u);
            const planeMat = new THREE.MeshBasicMaterial({
              color: 0xf43f5e,
              transparent: true,
              opacity: 0.2,
              side: THREE.DoubleSide,
              depthWrite: false
            });
            const planeMesh = new THREE.Mesh(planeGeom, planeMat);
            planeMesh.quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              new THREE.Vector3(nVec[0] / nLen, nVec[1] / nLen, nVec[2] / nLen)
            );
            this._threeGroup.add(planeMesh);

            an.sampleKerPoints.forEach((pt) => {
              const p3 = to3D(pt);
              const sph = new THREE.Mesh(
                new THREE.SphereGeometry(0.1 * u, 12, 12),
                new THREE.MeshBasicMaterial({ color: 0xf43f5e })
              );
              sph.position.set(p3[0] * remain * u, p3[1] * remain * u, p3[2] * remain * u);
              this._threeGroup.add(sph);
            });
          }
        }
      } else if (this._currentPhase === 2) {
        // Buoc 3: Khong gian anh Im(T) 3D + Ghost Ker(T)
        if (an.nullity === 1 && an.kerBasis.length >= 1) {
          const k = to3D(an.kerBasis[0]);
          const kLen = norm(k);
          if (kLen > 1e-4) {
            const dir = scaleVec(k, (13 * u) / kLen);
            const pts = [new THREE.Vector3(-dir[0], -dir[1], -dir[2]), new THREE.Vector3(dir[0], dir[1], dir[2])];
            const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
            const lineMat = new THREE.LineDashedMaterial({
              color: 0xf43f5e,
              transparent: true,
              opacity: 0.55,
              dashSize: 0.35 * u,
              gapSize: 0.18 * u
            });
            const line = new THREE.Line(lineGeom, lineMat);
            line.computeLineDistances();
            this._threeGroup.add(line);
          }
        }

        if (an.rank === 1 && an.imBasis.length >= 1) {
          const im = to3D(an.imBasis[0]);
          const imLen = norm(im);
          if (imLen > 1e-4) {
            const dir = scaleVec(im, (14 * u * t) / imLen);
            const pts = [new THREE.Vector3(-dir[0], -dir[1], -dir[2]), new THREE.Vector3(dir[0], dir[1], dir[2])];
            const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
            const lineMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 3 });
            this._threeGroup.add(new THREE.Line(lineGeom, lineMat));
          }
        } else if (an.rank === 2 && an.imBasis.length >= 2) {
          const b1 = to3D(an.imBasis[0]);
          const b2 = to3D(an.imBasis[1]);
          const nVec = cross(b1, b2);
          const nLen = norm(nVec);
          if (nLen > 1e-6) {
            const planeGeom = new THREE.PlaneGeometry(15 * u * t, 15 * u * t);
            const planeMat = new THREE.MeshBasicMaterial({
              color: 0x10b981,
              transparent: true,
              opacity: 0.22,
              side: THREE.DoubleSide,
              depthWrite: false
            });
            const planeMesh = new THREE.Mesh(planeGeom, planeMat);
            planeMesh.quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              new THREE.Vector3(nVec[0] / nLen, nVec[1] / nLen, nVec[2] / nLen)
            );
            this._threeGroup.add(planeMesh);
          }
        } else if (an.rank === 3 && an.is3D) {
          addParallelepiped3D(c1, c2, c3, 0x10b981, 0.16 * t, 0.65 * t);
        }
      }
    }
  };

  App.LTAnimator = LTAnimator;
  App.stopLTAnimation = function () {
    if (LTAnimator.isActive()) LTAnimator.stop();
  };
})();
