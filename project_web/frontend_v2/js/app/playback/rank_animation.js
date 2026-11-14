// ==================================================================================
// RANK & GAUSSIAN ELIMINATION 3-STEP PLAYBACK ENGINE (ACADEMIC MATHEMATICAL ESSENCE)
// Truc quan hoa ban chat Hang va Bien doi so cap dong khu Gauss (2D Canvas & 3D Three.js)
// Kich ban 3 buoc lien hoan thuan hinh hoc (Zero Canvas Prose):
//   Buoc 1: He vector ban dau & Phep truot so cap dong R_i <- R_i - k*R_j (Khu cot tru 1)
//   Buoc 2: Khu bac thang tiep theo & Triet tieu Dong phu thuoc ve goc O(0,0,0) (Pivot REF)
//   Buoc 3: Ket tinh Khong gian sinh (1D / 2D / 3D) & Khang dinh rank(A) = dim(span) = r
// Tuan thu triet de Zero Em-dash (\u2014) va chuan muc Anti-Slop.
// ==================================================================================
(function () {
  window.App = window.App || {};

  const safeRAF =
    typeof window.requestAnimationFrame === "function"
      ? (cb) => window.requestAnimationFrame(cb)
      : (cb) => setTimeout(() => cb(performance.now()), 16);
  const safeCAF =
    typeof window.cancelAnimationFrame === "function"
      ? (id) => window.cancelAnimationFrame(id)
      : (id) => clearTimeout(id);

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

  function resolveRankItems(selectedItems) {
    const vList = Array.isArray(App.vectorList) ? App.vectorList : [];

    // 1. Neu truyen truc tiep mang doi tuong tu App.vectorList
    if (
      Array.isArray(selectedItems) &&
      selectedItems.length > 0 &&
      selectedItems[0] &&
      typeof selectedItems[0] === "object" &&
      !Array.isArray(selectedItems[0]) &&
      selectedItems[0].id !== undefined
    ) {
      return selectedItems;
    }

    // 2. Uu tien doc tu cac checkbox duoc tick trong #rankChecklist (khop chinh xac v.id)
    const container = document.getElementById("rankChecklist");
    if (container) {
      const checkedBoxes = container.querySelectorAll('input[type="checkbox"]:checked');
      if (checkedBoxes && checkedBoxes.length > 0) {
        const picked = [];
        checkedBoxes.forEach((cb) => {
          const id = Number(cb.value);
          const found = vList.find((v) => v.id === id);
          if (found) picked.push(found);
        });
        if (picked.length > 0) return picked;
      }
    }

    // 3. Neu truyen mang toa do (VD tu App.getCheckedVectors), doi chieu so thuc voi App.vectorList
    if (Array.isArray(selectedItems) && selectedItems.length > 0) {
      const usedIds = new Set();
      const matched = selectedItems
        .map((el, idx) => {
          const raw = Array.isArray(el) ? el : el && Array.isArray(el.vec) ? el.vec : null;
          if (!raw) return null;
          const numVec = raw.map((x) => Number(x) || 0);
          const found = vList.find((v) => {
            if (usedIds.has(v.id) || !Array.isArray(v.vec)) return false;
            if (v.vec.length !== numVec.length) return false;
            return v.vec.every((val, k) => Math.abs((Number(val) || 0) - numVec[k]) < 1e-4);
          });
          if (found) {
            usedIds.add(found.id);
            return found;
          }
          return { id: -(idx + 1), vec: numVec };
        })
        .filter(Boolean);
      if (matched.length > 0) return matched;
    }

    // 4. Fallback: lay toi da 3 vector dau tien trong App.vectorList va tu dong tick
    if (vList.length > 0) {
      const autoItems = vList.filter((v) => v.id > 0).slice(0, 3);
      if (container) {
        const boxes = container.querySelectorAll('input[type="checkbox"]');
        boxes.forEach((cb) => {
          if (autoItems.some((it) => it.id === Number(cb.value))) cb.checked = true;
        });
      }
      return autoItems;
    }

    return [];
  }

  // --- THUAT TOAN KHU GAUSS THEO DONG & GHI NHAN QUY DAO TRUOT HINH HOC TUNG BUOC ---
  function computeGaussianElimination(items) {
    const m = items.length;
    const vectors = items.map((it) => to3D(it.vec || it));
    const is3D = items.some((it) => (it.vec || it).length >= 3) || App.mode === "3D";
    const n = is3D ? 3 : 2;

    const A = vectors.map((v) => v.slice(0, n));
    const initialRows = A.map((row) => row.slice());

    // Theo doi lich su tung dong goc ban dau (origIdx)
    const rowOrder = A.map((_, idx) => idx);
    const steps = [];
    const pivotPositions = [];
    const elimHistoryByOrig = Array.from({ length: m }, () => []);
    let pr = 0;
    const eps = 1e-5;

    for (let c = 0; c < n && pr < m; c++) {
      let maxR = pr;
      let maxVal = Math.abs(A[pr][c]);
      if (maxVal < eps) {
        for (let r = pr + 1; r < m; r++) {
          if (Math.abs(A[r][c]) > maxVal) {
            maxVal = Math.abs(A[r][c]);
            maxR = r;
          }
        }
      }

      if (maxVal < eps) continue;

      if (maxR !== pr) {
        const tmp = A[pr];
        A[pr] = A[maxR];
        A[maxR] = tmp;

        const tmpOrd = rowOrder[pr];
        rowOrder[pr] = rowOrder[maxR];
        rowOrder[maxR] = tmpOrd;

        steps.push({
          type: "SWAP",
          row1: pr,
          row2: maxR,
          matrix: A.map((r) => r.slice())
        });
      }

      const pvVal = A[pr][c];
      pivotPositions.push({ row: pr, origIdx: rowOrder[pr], col: c, val: pvVal });

      for (let r = pr + 1; r < m; r++) {
        if (Math.abs(A[r][c]) > eps) {
          const factor = A[r][c] / pvVal;
          const origRow = A[r].slice();
          for (let j = c; j < n; j++) {
            A[r][j] -= factor * A[pr][j];
            if (Math.abs(A[r][j]) < 1e-10) A[r][j] = 0;
          }

          const stepObj = {
            type: "ELIMINATE",
            passIdx: pr,
            col: c,
            targetRow: r,
            origTargetIdx: rowOrder[r],
            pivotRow: pr,
            origPivotIdx: rowOrder[pr],
            factor: factor,
            beforeVec: to3D(origRow),
            afterVec: to3D(A[r]),
            pivotVec: to3D(A[pr]),
            matrix: A.map((row) => row.slice())
          };
          steps.push(stepObj);
          elimHistoryByOrig[rowOrder[r]].push(stepObj);
        }
      }
      pr++;
    }

    const rank = pivotPositions.length;

    // Anh xa ket qua cuoi cung ve dung thu tu tung vector goc ban dau (0..m-1)
    const finalByOrig = new Array(m).fill(null);
    for (let r = 0; r < m; r++) {
      finalByOrig[rowOrder[r]] = to3D(A[r]);
    }

    const zeroRowIndices = [];
    const nonZeroRowIndices = [];
    for (let i = 0; i < m; i++) {
      const fVec = finalByOrig[i] || [0, 0, 0];
      const isZero = norm(fVec) < 1e-5;
      if (isZero) zeroRowIndices.push(i);
      else nonZeroRowIndices.push(i);
    }

    // Xac dinh quy dao 2 chang (Buoc 1 -> step1EndByOrig, Buoc 2 -> finalByOrig):
    // - Neu vector i trai qua >= 2 phep khu (VD khu x ve 0 o Pass 1, roi khu y ve 0 o Pass 2):
    //   Buoc 1 truot dung den ket qua sau Pass 1 (afterVec cua phep khu dau tien: x = 0),
    //   Buoc 2 truot tiep theo phuong tru thu hai ve vi tri cuoi cung (hoac ve O(0,0,0) neu phu thuoc).
    // - Neu vector i chi co 1 phep khu va la dong tru doc lap (non-zero):
    //   Buoc 1 truot 100% ve vi tri bac thang, Buoc 2 khoa co dinh tren truc bac thang.
    // - Neu vector i chi co 1 phep khu nhung bi triet tieu ve 0 (cung phuong voi tru 1):
    //   Buoc 1 truot 65% quang duong doc theo tru 1, Buoc 2 co tut not 35% cuoi cung vao tam hap thu O(0,0,0).
    const step1EndByOrig = new Array(m).fill(null);
    for (let i = 0; i < m; i++) {
      const v0 = vectors[i];
      const vf = finalByOrig[i];
      const hist = elimHistoryByOrig[i];
      const isZero = zeroRowIndices.includes(i);

      if (hist.length >= 2) {
        step1EndByOrig[i] = [...hist[0].afterVec];
      } else if (isZero) {
        step1EndByOrig[i] = [
          v0[0] + 0.65 * (vf[0] - v0[0]),
          v0[1] + 0.65 * (vf[1] - v0[1]),
          v0[2] + 0.65 * (vf[2] - v0[2])
        ];
      } else {
        step1EndByOrig[i] = [...vf];
      }
    }

    return {
      m,
      n,
      is3D,
      items,
      initialVectors: vectors,
      initialRows,
      finalRows: finalByOrig,
      step1EndRows: step1EndByOrig,
      elimHistoryByOrig,
      steps,
      pivotPositions,
      rank,
      zeroRowIndices,
      nonZeroRowIndices
    };
  }

  // --- THONG TIN THUYET MINH 3 BUOC SU PHAM ---
  const PHASES_INFO = [
    {
      index: 0,
      title: "Bước 1: Hệ vector Ban đầu & Phép trượt Khử Gauss (Rᵢ ← Rᵢ - k·Rⱼ)",
      desc: "Mỗi phép biến đổi sơ cấp dòng trượt ngọn vector vᵢ song song theo phương vector trụ vⱼ để khử tọa độ đầu về 0 mà không làm đổi hạng."
    },
    {
      index: 1,
      title: "Bước 2: Triệt tiêu Dòng Phụ thuộc về Gốc O & Lộ diện Bậc thang",
      desc: "Các dòng phụ thuộc co tụt hoàn toàn về gốc O(0,0) thành dòng 0 ở đáy ma trận REF. Các dòng độc lập khóa vào cấu trúc bậc thang tọa độ."
    },
    {
      index: 2,
      title: "Bước 3: Giữ lại các Vector Bậc thang Khác 0 & Kết luận rank(A) = r",
      desc: "Loại bỏ các dòng đã sập về 0, hệ chỉ giữ lại đúng r vector bậc thang khác 0 (rᵢ ≠ 0) khóa trên khung tọa độ, suy ra hạng của hệ là rank(A) = r."
    }
  ];

  // =========================================================================
  // BO DIEU KHIEN HOAT CANH HANG & KHU GAUSS (App.RankAnimator)
  // =========================================================================
  const RankAnimator = {
    _active: false,
    _paused: false,
    _currentPhase: 0,
    _phaseProgress: 0,
    _phaseTimer: null,
    _raf: null,
    _speed: 1.0,
    _gaussData: null,
    _snapshot: null,
    _savedCamPos3D: null,
    _threeGroup: null,

    isActive() {
      return this._active;
    },

    getCurrentPhase() {
      return this._currentPhase;
    },

    getGaussData() {
      return this._gaussData;
    },

    _frame3DCameraIfNeeded() {
      if (!window.Vec3D || !Vec3D._camera || !Vec3D._controls || App.mode !== "3D" || !this._gaussData) return;
      if (Vec3D._resetAnimId) {
        safeCAF(Vec3D._resetAnimId);
        Vec3D._resetAnimId = null;
      }
      if (!this._savedCamPos3D) {
        this._savedCamPos3D = Vec3D._camera.position.clone();
      }
      let maxReach = 3.0;
      for (const v of this._gaussData.initialVectors) {
        maxReach = Math.max(maxReach, norm(v));
      }
      const u = (Vec3D.S3D && Vec3D.S3D.unitsPerWorld) || 1;
      const maxReachWorld = maxReach * u;
      const dist = Math.max(10.5, Math.min(30.0, maxReachWorld * 2.25));
      Vec3D._camera.position.set(dist * 1.18, dist * 0.72, dist * 0.85);
      Vec3D._camera.up.set(0, 0, 1);
      Vec3D._controls.target.set(0, 0, 0);
      Vec3D._camera.lookAt(0, 0, 0);
      Vec3D._controls.update();
      if (typeof Vec3D.addAxisLabelsDynamic === "function") {
        Vec3D.addAxisLabelsDynamic();
      }
    },

    start(selectedItems) {
      if (typeof App.stopAllAnimations === "function") {
        try {
          App.stopAllAnimations();
        } catch (_) {}
      } else {
        this.stop();
      }

      const items = resolveRankItems(selectedItems);
      if (!items || !items.length) {
        if (typeof App.showToast === "function") {
          App.showToast("Hãy tick chọn ít nhất 1 vector trong danh sách để trực quan!", "warning");
        }
        return false;
      }

      const gaussData = computeGaussianElimination(items);
      this._gaussData = gaussData;

      this._snapshot = (App.vectorList || []).map((v) => ({
        id: v.id,
        vec: [...(v.vec || [0, 0, 0])],
        visible: v.visible !== false,
        alpha: typeof v.alpha === "number" ? v.alpha : 1.0,
        colorCss: v.colorCss,
        colorHex: v.colorHex,
        latex: v.latex,
        _customLabelLatex: v._customLabelLatex,
        showProjection: v.showProjection,
        rawInput: v.rawInput,
        _isDashed: Boolean(v._isDashed)
      }));

      // An cac vector khong duoc chon
      const selectedIds = new Set(items.map((it) => it.id));
      (App.vectorList || []).forEach((v) => {
        v.showProjection = false;
        if (!selectedIds.has(v.id)) {
          v.visible = false;
        } else {
          v.visible = true;
        }
      });

      const has3DCoord = items.some((it) => (it.vec || it).length >= 3);
      if (has3DCoord && App.mode !== "3D") {
        if (typeof App.setMode === "function") App.setMode("3D");
        else if (typeof App.toggleMode === "function") App.toggleMode();
      }

      this._savedCamPos3D = null;
      this._frame3DCameraIfNeeded();

      this.ensureControls();
      const wrap = document.getElementById("rankAnimControls");
      if (wrap) wrap.style.display = "block";

      if (window.Vec2D && window.Vec2D.S2D) {
        window.Vec2D.S2D.draggedVectorId = null;
      }
      if (window.Vec3D && window.Vec3D.S3D) {
        window.Vec3D.S3D.draggedVectorId = null;
      }

      this._active = true;
      this._paused = false;
      this._currentPhase = 0;
      this._phaseProgress = 0;
      App._rankAnimActive = true;
      App.isAnimating = true;

      this.applyPhaseStyles(0, 0);
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
        safeCAF(this._raf);
        this._raf = null;
      }

      const wasActive = this._active;
      this._active = false;
      this._paused = false;
      this._currentPhase = 0;
      this._phaseProgress = 0;
      App._rankAnimActive = false;
      App.isAnimating = false;

      if (window.Vec2D && window.Vec2D.S2D) {
        window.Vec2D.S2D.draggedVectorId = null;
      }
      if (window.Vec3D && window.Vec3D.S3D) {
        window.Vec3D.S3D.draggedVectorId = null;
      }

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

      if (this._snapshot && Array.isArray(App.vectorList)) {
        for (const snap of this._snapshot) {
          const it = App.vectorList.find((v) => v.id === snap.id);
          if (it) {
            it.vec = [...snap.vec];
            it.visible = snap.visible;
            it.alpha = snap.alpha;
            it.colorCss = snap.colorCss;
            it.colorHex = snap.colorHex;
            it.latex = snap.latex;
            it._customLabelLatex = snap._customLabelLatex;
            it.showProjection = snap.showProjection;
            it.rawInput = snap.rawInput;
            it._isDashed = snap._isDashed;
            delete it._rankAlpha;
            delete it._rankColorCss;
            delete it._rankIsPivot;
            delete it._rankIsZero;
          }
        }
      } else if (Array.isArray(App.vectorList)) {
        for (const it of App.vectorList) {
          delete it._rankAlpha;
          delete it._rankColorCss;
          delete it._rankIsPivot;
          delete it._rankIsZero;
        }
      }
      this._snapshot = null;
      this._gaussData = null;

      const wrap = document.getElementById("rankAnimControls");
      if (wrap) wrap.style.display = "none";

      if (wasActive) {
        this.redraw();
      }
    },

    pause() {
      this._paused = true;
      if (this._phaseTimer) {
        clearTimeout(this._phaseTimer);
        this._phaseTimer = null;
      }
      if (this._raf) {
        safeCAF(this._raf);
        this._raf = null;
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
      if (!this._active) {
        this.start();
        return;
      }
      if (this._paused) {
        this.resume();
      } else {
        this.pause();
      }
    },

    nextPhase() {
      if (!this._active) return;
      const next = Math.min(2, this._currentPhase + 1);
      this.goToPhase(next);
    },

    prevPhase() {
      if (!this._active) return;
      const prev = Math.max(0, this._currentPhase - 1);
      this.goToPhase(prev);
    },

    replay() {
      if (!this._active) {
        this.start();
        return;
      }
      this._paused = false;
      this.goToPhase(0);
    },

    setSpeed(val) {
      const sp = parseFloat(val);
      if (isNaN(sp) || sp <= 0) return;
      this._speed = Math.max(0.2, Math.min(2.5, sp));
      this.updateSidebarUI();
    },

    goToPhase(phaseIdx) {
      if (this._phaseTimer) {
        clearTimeout(this._phaseTimer);
        this._phaseTimer = null;
      }
      if (this._raf) {
        safeCAF(this._raf);
        this._raf = null;
      }

      this._currentPhase = Math.max(0, Math.min(2, phaseIdx));
      this._phaseProgress = 0.0;

      this.applyPhaseStyles(this._currentPhase, 0.0);
      this.updateSidebarUI();
      this.runCurrentPhase();
    },

    runCurrentPhase() {
      if (!this._active) return;
      this._frame3DCameraIfNeeded();

      if (this._paused) {
        this._phaseProgress = 1.0;
        this.applyPhaseStyles(this._currentPhase, 1.0);
        this.redraw();
        return;
      }

      const baseDurations = [2800, 2800, 2400];
      let lastTime = performance.now();
      let currentProgress = this._phaseProgress;

      const stepLoop = (now) => {
        if (!this._active || this._paused) return;

        const delta = Math.max(0, now - lastTime);
        lastTime = now;

        const baseDuration = baseDurations[this._currentPhase] || 2800;
        currentProgress += (delta * this._speed) / baseDuration;
        const p = Math.min(1.0, currentProgress);
        this._phaseProgress = p;

        this.applyPhaseStyles(this._currentPhase, p);
        this.redraw();

        if (p < 1.0) {
          this._raf = safeRAF(stepLoop);
        } else {
          this._phaseProgress = 1.0;
          this.applyPhaseStyles(this._currentPhase, 1.0);
          this.redraw();

          if (this._currentPhase < 2) {
            this._phaseTimer = setTimeout(() => {
              if (this._active && !this._paused) {
                this.goToPhase(this._currentPhase + 1);
              }
            }, 420 / this._speed);
          } else {
            this._paused = true;
            this.updateSidebarUI();
          }
        }
      };

      this._raf = safeRAF(stepLoop);
    },

    applyPhaseStyles(phase, progress) {
      if (!this._gaussData || !Array.isArray(App.vectorList)) return;
      const gd = this._gaussData;
      const p = smoothstep(progress);
      const dim = gd.is3D ? 3 : 2;
      const toDim = (v3) => (dim === 3 ? [v3[0], v3[1], v3[2]] : [v3[0], v3[1]]);

      for (let i = 0; i < gd.items.length; i++) {
        const item = gd.items[i];
        const vItem = App.vectorList.find((v) => v.id === item.id);
        if (!vItem) continue;

        const isZero = gd.zeroRowIndices.includes(i);
        const vInit = gd.initialVectors[i];
        const vStep1End = gd.step1EndRows[i];
        const vFinal = gd.finalRows[i];

        vItem.visible = true;
        vItem._isDashed = false;

        if (phase === 0) {
          // Buoc 1: Truot song song theo phuong vector tru tu vInit -> vStep1End
          const curVec = [
            vInit[0] + p * (vStep1End[0] - vInit[0]),
            vInit[1] + p * (vStep1End[1] - vInit[1]),
            vInit[2] + p * (vStep1End[2] - vInit[2])
          ];
          vItem.vec = toDim(curVec);
          vItem._rankAlpha = 1.0;
          vItem._rankColorCss = isZero ? "#f59e0b" : "#10b981";
          vItem._customLabelLatex = `v_${i + 1}`;
        } else if (phase === 1) {
          // Buoc 2: Truot tiep tu vStep1End -> vFinal (dong phu thuoc co tut ve O(0,0,0); dong tru khoa vao bac thang REF)
          const curVec = [
            vStep1End[0] + p * (vFinal[0] - vStep1End[0]),
            vStep1End[1] + p * (vFinal[1] - vStep1End[1]),
            vStep1End[2] + p * (vFinal[2] - vStep1End[2])
          ];
          vItem.vec = toDim(curVec);

          if (isZero) {
            vItem._rankAlpha = Math.max(0.05, 1.0 - p * 0.88);
            vItem._rankColorCss = "#ef4444";
            vItem._rankIsZero = true;
            vItem._customLabelLatex = p > 0.75 ? "0" : `v_${i + 1}`;
            if (p > 0.94) vItem.visible = false;
          } else {
            vItem._rankAlpha = 1.0;
            vItem._rankColorCss = "#10b981";
            vItem._rankIsPivot = true;
            vItem._customLabelLatex = `r_${i + 1}`;
          }
        } else if (phase === 2) {
          // Buoc 3: Chi con r vector bac thang khac 0 ket tinh va lan toa khong gian sinh
          if (isZero) {
            vItem.vec = toDim([0, 0, 0]);
            vItem.visible = false;
            vItem._rankAlpha = 0;
          } else {
            vItem.vec = toDim(vFinal);
            vItem.visible = true;
            vItem._rankAlpha = 1.0;
            vItem._rankColorCss = "#10b981";
            vItem._customLabelLatex = `r_${i + 1}`;
          }
        }
      }
    },

    redraw() {
      if (App.mode === "2D" && window.Vec2D) {
        if (typeof Vec2D.draw2DAllVectors === "function") Vec2D.draw2DAllVectors();
      } else if (window.Vec3D) {
        if (typeof Vec3D.hardRefresh3D === "function") Vec3D.hardRefresh3D(false);
      }
    },

    ensureControls() {
      let wrap = document.getElementById("rankAnimControls");
      if (wrap) return wrap;

      const host = document.getElementById("form-rank") || document.getElementById("result_rank");
      const out = document.getElementById("result_rank");
      if (!host) return null;

      wrap = document.createElement("div");
      wrap.id = "rankAnimControls";
      wrap.className = "basis-sidebar-anim-box";
      wrap.style.display = "none";
      wrap.style.marginTop = "10px";

      wrap.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted, #64748b);">Trực quan Hạng & Khử Gauss</span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="basis-step-pill" id="rankStepCounter">Bước 1 / 3</span>
            <button type="button" id="btnRankCloseAnim" class="basis-anim-close-btn" title="Đóng trực quan" style="background: transparent; border: none; cursor: pointer; color: var(--text-muted, #64748b); font-size: 13px; padding: 2px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px;">
              <i class="ph ph-x"></i>
            </button>
          </div>
        </div>

        <div class="coord-phase-pills" id="rankPhasePills">
          <button type="button" class="coord-phase-btn active" data-phase="0" title="Bước 1: Trượt khử Gauss bảo toàn Hạng">Bước 1</button>
          <button type="button" class="coord-phase-btn" data-phase="1" title="Bước 2: Triệt tiêu dòng 0 & Bậc thang Pivot">Bước 2</button>
          <button type="button" class="coord-phase-btn" data-phase="2" title="Bước 3: Giữ lại r vector khác 0 & Kết luận rank(A) = r">Bước 3</button>
        </div>

        <div class="basis-anim-btn-row">
          <button type="button" id="btnRankPrev" class="basis-ctrl-btn" title="Bước trước">
            <i class="ph ph-skip-back"></i>
          </button>
          <button type="button" id="btnRankPlay" class="basis-ctrl-btn primary" title="Phát / Tạm dừng">
            <i class="ph ph-play" id="iconRankPlay"></i>
          </button>
          <button type="button" id="btnRankNext" class="basis-ctrl-btn" title="Bước tiếp">
            <i class="ph ph-skip-forward"></i>
          </button>
          <button type="button" id="btnRankReplay" class="basis-ctrl-btn" title="Phát lại từ đầu">
            <i class="ph ph-arrow-counter-clockwise"></i>
          </button>
        </div>

        <div class="hud-menu-slider-row basis-speed-slider-wrap" style="padding: 6px 0 2px; margin-top: 6px; border-top: 1px dashed var(--border-subtle, var(--border, #e2e8f0));">
          <div class="hud-menu-slider-header" style="font-size: 11.5px; margin-bottom: 2px;">
            <span class="hud-menu-item-text" style="color: var(--text-muted, #64748b); font-weight: 600;">Tốc độ phát</span>
            <span class="hud-menu-slider-val" id="rankSpeedValue">1.0×</span>
          </div>
          <input type="range" id="rankSpeedSlider" min="0.2" max="2.5" step="0.1" value="1.0" class="hud-range-slider" />
        </div>

        <div class="basis-step-explainer" id="rankStepExplainer">
          <div class="basis-step-title" id="rankStepTitle">Bước 1: Hệ vector Ban đầu & Phép trượt Sơ cấp dòng Bảo toàn Span</div>
          <div class="basis-step-desc" id="rankStepDesc">Trực quan hóa phép khử Gauss trượt ngọn vector song song theo phương vector trụ.</div>
        </div>
      `;

      if (out && out.parentNode === host) {
        host.insertBefore(wrap, out);
      } else {
        host.appendChild(wrap);
      }

      this.bindControlsEvents(wrap);

      const initSlider = wrap.querySelector("#rankSpeedSlider");
      if (initSlider) {
        const min = parseFloat(initSlider.min) || 0.2;
        const max = parseFloat(initSlider.max) || 2.5;
        const pct = Math.max(0, Math.min(100, ((this._speed - min) / (max - min)) * 100));
        initSlider.style.setProperty("--slider-pct", `${pct.toFixed(1)}%`);
        initSlider.style.setProperty("--range-pct", `${pct.toFixed(1)}%`);
      }

      return wrap;
    },

    bindControlsEvents(wrap) {
      const btnClose = wrap.querySelector("#btnRankCloseAnim");
      if (btnClose) btnClose.onclick = () => this.stop();

      const btnPlay = wrap.querySelector("#btnRankPlay");
      if (btnPlay) btnPlay.onclick = () => this.togglePlay();

      const btnPrev = wrap.querySelector("#btnRankPrev");
      if (btnPrev) btnPrev.onclick = () => this.prevPhase();

      const btnNext = wrap.querySelector("#btnRankNext");
      if (btnNext) btnNext.onclick = () => this.nextPhase();

      const btnReplay = wrap.querySelector("#btnRankReplay");
      if (btnReplay) btnReplay.onclick = () => this.replay();

      const speedSlider = wrap.querySelector("#rankSpeedSlider");
      if (speedSlider) {
        const updateSliderStyle = (val) => {
          const min = parseFloat(speedSlider.min) || 0.2;
          const max = parseFloat(speedSlider.max) || 2.5;
          const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
          speedSlider.style.setProperty("--slider-pct", `${pct.toFixed(1)}%`);
          speedSlider.style.setProperty("--range-pct", `${pct.toFixed(1)}%`);
        };
        updateSliderStyle(parseFloat(speedSlider.value) || this._speed);
        speedSlider.oninput = (e) => {
          const val = parseFloat(e.target.value) || 1.0;
          updateSliderStyle(val);
          this.setSpeed(val);
        };
      }

      const pills = wrap.querySelectorAll("#rankPhasePills .coord-phase-btn");
      pills.forEach((pBtn) => {
        pBtn.onclick = (e) => {
          const ph = parseInt(e.currentTarget.getAttribute("data-phase"), 10);
          if (!isNaN(ph)) this.goToPhase(ph);
        };
      });
    },

    updateSidebarUI() {
      const wrap = document.getElementById("rankAnimControls");
      if (!wrap) return;

      const stepCounter = wrap.querySelector("#rankStepCounter");
      if (stepCounter) stepCounter.textContent = `Bước ${this._currentPhase + 1} / 3`;

      const pills = wrap.querySelectorAll("#rankPhasePills .coord-phase-btn");
      pills.forEach((pBtn, idx) => {
        pBtn.classList.toggle("active", idx === this._currentPhase);
      });

      const btnPlay = wrap.querySelector("#btnRankPlay");
      const iconPlay = wrap.querySelector("#iconRankPlay");
      if (btnPlay && iconPlay) {
        const isRunning = this._active && !this._paused;
        if (isRunning) {
          iconPlay.className = "ph ph-pause";
          btnPlay.style.background = "#ef4444";
          btnPlay.style.borderColor = "#ef4444";
          btnPlay.style.color = "#ffffff";
        } else {
          iconPlay.className = "ph ph-play";
          btnPlay.style.background = "";
          btnPlay.style.borderColor = "";
          btnPlay.style.color = "";
        }
      }

      const speedVal = wrap.querySelector("#rankSpeedValue");
      if (speedVal) speedVal.textContent = `${this._speed.toFixed(1)}×`;

      const speedSlider = wrap.querySelector("#rankSpeedSlider");
      if (speedSlider) {
        if (Math.abs(parseFloat(speedSlider.value) - this._speed) > 0.05) {
          speedSlider.value = String(this._speed);
        }
        const min = parseFloat(speedSlider.min) || 0.2;
        const max = parseFloat(speedSlider.max) || 2.5;
        const pct = Math.max(0, Math.min(100, ((this._speed - min) / (max - min)) * 100));
        speedSlider.style.setProperty("--slider-pct", `${pct.toFixed(1)}%`);
        speedSlider.style.setProperty("--range-pct", `${pct.toFixed(1)}%`);
      }

      const titleEl = wrap.querySelector("#rankStepTitle");
      const descEl = wrap.querySelector("#rankStepDesc");
      const gd = this._gaussData;

      if (titleEl && descEl) {
        const info = PHASES_INFO[this._currentPhase] || PHASES_INFO[0];
        titleEl.textContent = info.title;

        if (!gd) {
          descEl.textContent = info.desc;
          return;
        }

        if (this._currentPhase === 0) {
          const swapList = gd.steps
            .filter((st) => st.type === "SWAP")
            .map((st) => `R<sub>${st.row1 + 1}</sub> ↔ R<sub>${st.row2 + 1}</sub>`)
            .join(", ");
          const elimPass0 = gd.steps.filter((st) => st.type === "ELIMINATE" && st.passIdx === 0);
          const elimSource = elimPass0.length > 0 ? elimPass0 : gd.steps.filter((st) => st.type === "ELIMINATE");
          const elimList = elimSource
            .map((st) => `R<sub>${st.targetRow + 1}</sub> ← R<sub>${st.targetRow + 1}</sub> - (${formatScalar(st.factor)})R<sub>${st.pivotRow + 1}</sub>`)
            .join(", ");
          const opsSummary = [swapList ? `hoán vị ${swapList}` : "", elimList].filter(Boolean).join("; ") || "giữ nguyên dòng trụ";
          descEl.innerHTML = `Phép khử Gauss (${opsSummary}): ngọn vector <b>trượt trên đường ray nét đứt song song với dòng trụ</b> để khử tọa độ đầu về 0.<br>Các phép biến đổi sơ cấp dòng luôn <b>bảo toàn hạng</b> của hệ vector.`;
        } else if (this._currentPhase === 1) {
          if (gd.zeroRowIndices.length > 0) {
            descEl.innerHTML = `<b>${gd.zeroRowIndices.length} dòng phụ thuộc</b> bị triệt tiêu hoàn toàn vào tâm ngắm đỏ tại <b>gốc O(0,0)</b> (ứng với hàng toàn số 0 ở đáy ma trận REF).<br>Chỉ còn lại <b>r = ${gd.rank} vector bậc thang (r<sub>i</sub>)</b> khóa trên khung tọa độ.`;
          } else {
            descEl.innerHTML = `Không có dòng nào bị triệt tiêu về 0.<br>Các dòng dưới trượt về đúng vị trí <b>bậc thang tọa độ (tọa độ đầu bằng 0)</b>, lộ diện <b>r = ${gd.rank} dòng Pivot độc lập</b>.`;
          }
        } else if (this._currentPhase === 2) {
          if (gd.rank === 0) {
            descEl.innerHTML = `Toàn bộ các vector trong hệ đều sập về <b>gốc O(0,0)</b> sau khi khử Gauss.<br>Không còn vector khác 0 nào được giữ lại, suy ra <b>rank(A) = 0</b>.`;
          } else {
            const keptLabels = gd.nonZeroRowIndices.map((idx) => `<b>r<sub>${idx + 1}</sub></b>`).join(", ");
            descEl.innerHTML = `Loại bỏ ${gd.zeroRowIndices.length} dòng đã sập về 0, hệ giữ lại đúng <b>r = ${gd.rank} vector bậc thang khác 0</b> (${keptLabels}) khóa trên bậc thang tọa độ.<br>Kết luận: <b>Số vector khác 0 được giữ lại = rank(A) = ${gd.rank}</b>.`;
          }
        }
      }
    },

    // =========================================================================
    // 2D CANVAS RENDERING HOOKS (PURE GEOMETRY - ZERO CANVAS PROSE)
    // =========================================================================
    render2DSubspace(ctx, gridInfo) {
      if (!this._active || !gridInfo || App.mode !== "2D" || !this._gaussData) return;
      const { cx, cy, px } = gridInfo;
      const gd = this._gaussData;
      const isDark = document.body.classList.contains("dark");

      const toScreen = (vx, vy) => ({
        x: cx + vx * px,
        y: cy - vy * px
      });

      ctx.save();

      // Ve bong doi chieu net dut cua cac vector ban dau v_i^(0) de doi chieu
      ctx.strokeStyle = isDark ? "rgba(148, 163, 184, 0.42)" : "rgba(100, 116, 139, 0.38)";
      ctx.fillStyle = isDark ? "rgba(148, 163, 184, 0.42)" : "rgba(100, 116, 139, 0.38)";
      ctx.lineWidth = 1.5;
      const pO = toScreen(0, 0);
      for (let i = 0; i < gd.initialVectors.length; i++) {
        const v0 = gd.initialVectors[i];
        const pV0 = toScreen(v0[0], v0[1]);
        const dx = pV0.x - pO.x;
        const dy = pV0.y - pO.y;
        const lenPx = Math.hypot(dx, dy);
        if (lenPx > 4) {
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(pO.x, pO.y);
          ctx.lineTo(pV0.x, pV0.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Cham tron nho tai ngon vector goc ban dau
          ctx.beginPath();
          ctx.arc(pV0.x, pV0.y, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    },

    render2DProjections(ctx, gridInfo) {
      if (!this._active || !gridInfo || App.mode !== "2D" || !this._gaussData) return;
      const { cx, cy, px } = gridInfo;
      const gd = this._gaussData;
      const p = smoothstep(this._phaseProgress);

      const toScreen = (vx, vy) => ({
        x: cx + vx * px,
        y: cy - vy * px
      });

      const drawTrackArrow2D = (pStart, pEnd, color) => {
        const dx = pEnd.x - pStart.x;
        const dy = pEnd.y - pStart.y;
        const len = Math.hypot(dx, dy);
        if (len < 3) return;
        const angle = Math.atan2(dy, dx);
        const head = Math.min(10, len * 0.35);

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(pEnd.x, pEnd.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(pEnd.x, pEnd.y);
        ctx.lineTo(pEnd.x - head * Math.cos(angle - Math.PI / 6), pEnd.y - head * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(pEnd.x - head * Math.cos(angle + Math.PI / 6), pEnd.y - head * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };

      if (this._currentPhase === 0) {
        // Buoc 1: Duong ray truot song song theo phuong vector tru tu vInit -> vStep1End
        for (let i = 0; i < gd.m; i++) {
          const v0 = gd.initialVectors[i];
          const vEnd1 = gd.step1EndRows[i];
          const vf = gd.finalRows[i];
          if (Math.hypot(vEnd1[0] - v0[0], vEnd1[1] - v0[1]) > 1e-4) {
            const scStart = toScreen(v0[0], v0[1]);
            const scTarget = toScreen(
              gd.elimHistoryByOrig[i].length >= 2 ? vEnd1[0] : vf[0],
              gd.elimHistoryByOrig[i].length >= 2 ? vEnd1[1] : vf[1]
            );
            const scCur = toScreen(
              v0[0] + p * (vEnd1[0] - v0[0]),
              v0[1] + p * (vEnd1[1] - v0[1])
            );
            const isZero = gd.zeroRowIndices.includes(i);
            const trackCol = isZero ? "#f59e0b" : "#10b981";

            drawTrackArrow2D(scStart, scTarget, trackCol);

            ctx.save();
            ctx.fillStyle = trackCol;
            ctx.beginPath();
            ctx.arc(scCur.x, scCur.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      } else if (this._currentPhase === 1 || this._currentPhase === 2) {
        const pO = toScreen(0, 0);

        if (this._currentPhase === 1) {
          // Duong ray truot chang 2 (neu co) tu vStep1End -> vFinal
          for (let i = 0; i < gd.m; i++) {
            const v1 = gd.step1EndRows[i];
            const vf = gd.finalRows[i];
            if (Math.hypot(vf[0] - v1[0], vf[1] - v1[1]) > 1e-4) {
              const scStart = toScreen(v1[0], v1[1]);
              const scEnd = toScreen(vf[0], vf[1]);
              const isZero = gd.zeroRowIndices.includes(i);
              drawTrackArrow2D(scStart, scEnd, isZero ? "#ef4444" : "#10b981");
            }
          }

          // Tam ngam hap thu dong phu thuoc tai goc O(0,0)
          if (gd.zeroRowIndices.length > 0) {
            ctx.save();
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(pO.x, pO.y, 6 + 6 * Math.sin(p * Math.PI), 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(pO.x, pO.y, 13, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }

        // Duong gióng bac thang toa do va vong khoa cho r vector khac 0 duoc giu lai
        const guideAlpha = this._currentPhase === 2 ? 0.78 : 0.55;
        for (const rIdx of gd.nonZeroRowIndices) {
          const rf = gd.finalRows[rIdx];
          const scTip = toScreen(rf[0], rf[1]);
          if (Math.abs(rf[0]) > 1e-4 && Math.abs(rf[1]) > 1e-4) {
            const scX = toScreen(rf[0], 0);
            ctx.save();
            ctx.strokeStyle = `rgba(16, 185, 129, ${guideAlpha})`;
            ctx.lineWidth = 1.6;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(pO.x, pO.y);
            ctx.lineTo(scX.x, scX.y);
            ctx.lineTo(scTip.x, scTip.y);
            ctx.stroke();
            ctx.restore();
          }
          if (this._currentPhase === 2 || (Math.abs(rf[0]) < 1e-4 && Math.abs(rf[1]) > 1e-4)) {
            ctx.save();
            ctx.strokeStyle = "#10b981";
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(scTip.x, scTip.y, 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    },

    // =========================================================================
    // 3D THREE.JS RENDERING HOOK (viewer3D.js)
    // =========================================================================
    render3D(mathGroup) {
      if (!this._active || !mathGroup || App.mode !== "3D" || !this._gaussData || typeof THREE === "undefined") return;

      if (!this._threeGroup) {
        this._threeGroup = new THREE.Group();
        mathGroup.add(this._threeGroup);
      }

      while (this._threeGroup.children.length > 0) {
        const obj = this._threeGroup.children[0];
        this._threeGroup.remove(obj);
        if (typeof obj.traverse === "function") {
          obj.traverse((child) => {
            if (child.geometry) child.geometry.dispose?.();
            if (Array.isArray(child.material)) child.material.forEach((m) => m?.dispose?.());
            else if (child.material) child.material.dispose?.();
          });
        } else {
          if (obj.geometry) obj.geometry.dispose?.();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m?.dispose?.());
          else if (obj.material) obj.material.dispose?.();
        }
      }

      const gd = this._gaussData;
      const p = smoothstep(this._phaseProgress);
      const u = (window.Vec3D && Vec3D.S3D && Vec3D.S3D.unitsPerWorld) || 1;

      const cam = window.Vec3D && Vec3D._camera;
      const camDist = cam ? cam.position.length() : 25;
      const vFOV = ((cam ? cam.fov : 24) * Math.PI) / 180;
      const screenH = Math.max(1, (window.Vec3D && Vec3D._renderer?.domElement?.clientHeight) || 760);
      const worldPerPx = (2 * Math.tan(vFOV / 2) * camDist) / screenH;

      const makeDashedLine = (p1, p2, color, opacity = 0.85, dashSize = 0.45 * u, gapSize = 0.22 * u) => {
        const geom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const mat = new THREE.LineDashedMaterial({
          color,
          dashSize,
          gapSize,
          transparent: opacity < 1.0,
          opacity,
          depthWrite: false
        });
        const l = new THREE.Line(geom, mat);
        l.computeLineDistances();
        l.renderOrder = 2;
        return l;
      };

      const makeMarker = (pos, radius, color, haloRadius = 0, haloOpacity = 0.35) => {
        const effRadius = Math.min(radius, 4.0 * worldPerPx);
        const effHalo = haloRadius > 0 ? Math.min(haloRadius, 7.0 * worldPerPx) : 0;
        const grp = new THREE.Group();
        const sphereGeo = new THREE.SphereGeometry(effRadius, 16, 12);
        const sphereMat = new THREE.MeshBasicMaterial({ color, depthWrite: false });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.copy(pos);
        sphere.renderOrder = 5;
        grp.add(sphere);

        if (effHalo > 0) {
          const haloGeo = new THREE.SphereGeometry(effHalo, 16, 12);
          const haloMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: haloOpacity,
            depthWrite: false
          });
          const halo = new THREE.Mesh(haloGeo, haloMat);
          halo.position.copy(pos);
          halo.renderOrder = 4;
          grp.add(halo);
        }
        return grp;
      };

      const vO = new THREE.Vector3(0, 0, 0);

      // 1. Bong doi chieu net dut cua cac vector ban dau v_i^(0) trong 3D
      for (let i = 0; i < gd.initialVectors.length; i++) {
        const v0 = gd.initialVectors[i];
        if (norm(v0) > 1e-5) {
          const pV0 = new THREE.Vector3(v0[0] * u, v0[1] * u, v0[2] * u);
          this._threeGroup.add(makeDashedLine(vO, pV0, 0x94a3b8, 0.45, 0.3 * u, 0.18 * u));
          this._threeGroup.add(makeMarker(pV0, 0.038 * u, 0x94a3b8));
        }
      }

      if (this._currentPhase === 0) {
        // BUOC 1: Duong ray truot khu Gauss song song voi vector tru
        for (let i = 0; i < gd.m; i++) {
          const v0 = gd.initialVectors[i];
          const v1 = gd.step1EndRows[i];
          const vf = gd.finalRows[i];
          if (norm([v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]]) > 1e-4) {
            const pStart = new THREE.Vector3(v0[0] * u, v0[1] * u, v0[2] * u);
            const targetRaw = gd.elimHistoryByOrig[i].length >= 2 ? v1 : vf;
            const pTarget = new THREE.Vector3(targetRaw[0] * u, targetRaw[1] * u, targetRaw[2] * u);
            const pCur = new THREE.Vector3(
              (v0[0] + p * (v1[0] - v0[0])) * u,
              (v0[1] + p * (v1[1] - v0[1])) * u,
              (v0[2] + p * (v1[2] - v0[2])) * u
            );
            const isZero = gd.zeroRowIndices.includes(i);
            const col = isZero ? 0xf59e0b : 0x10b981;

            this._threeGroup.add(makeDashedLine(pStart, pTarget, col, 0.85, 0.4 * u, 0.2 * u));
            this._threeGroup.add(makeMarker(pCur, 0.05 * u, col, 0.09 * u, 0.35));
          }
        }
      } else if (this._currentPhase === 1 || this._currentPhase === 2) {
        if (this._currentPhase === 1) {
          // BUOC 2: Duong ray truot chang 2 & Tam hap thu dong 0 tai goc O
          for (let i = 0; i < gd.m; i++) {
            const v1 = gd.step1EndRows[i];
            const vf = gd.finalRows[i];
            if (norm([vf[0] - v1[0], vf[1] - v1[1], vf[2] - v1[2]]) > 1e-4) {
              const pStart = new THREE.Vector3(v1[0] * u, v1[1] * u, v1[2] * u);
              const pEnd = new THREE.Vector3(vf[0] * u, vf[1] * u, vf[2] * u);
              const pCur = pStart.clone().lerp(pEnd, p);
              const isZero = gd.zeroRowIndices.includes(i);
              const col = isZero ? 0xef4444 : 0x10b981;

              this._threeGroup.add(makeDashedLine(pStart, pEnd, col, 0.85, 0.35 * u, 0.18 * u));
              this._threeGroup.add(makeMarker(pCur, 0.05 * u, col, 0.09 * u, 0.35));
            }
          }

          if (gd.zeroRowIndices.length > 0) {
            this._threeGroup.add(makeMarker(vO, 0.065 * u, 0xef4444, 0.13 * u, 0.45));
          }
        } else if (gd.rank === 0) {
          this._threeGroup.add(makeMarker(vO, 0.07 * u, 0xef4444, 0.12 * u, 0.45));
        }

        // BUOC 2 & BUOC 3: Khung gióng bac thang toa do cho r vector khac 0 duoc giu lai
        const lineOp = this._currentPhase === 2 ? 0.78 : 0.55;
        for (const rIdx of gd.nonZeroRowIndices) {
          const rf = gd.finalRows[rIdx];
          const pTip = new THREE.Vector3(rf[0] * u, rf[1] * u, rf[2] * u);
          const pXY = new THREE.Vector3(rf[0] * u, rf[1] * u, 0);
          const pX = new THREE.Vector3(rf[0] * u, 0, 0);
          const pY = new THREE.Vector3(0, rf[1] * u, 0);

          if (Math.abs(rf[2]) > 1e-4 && (Math.abs(rf[0]) > 1e-4 || Math.abs(rf[1]) > 1e-4)) {
            this._threeGroup.add(makeDashedLine(pTip, pXY, 0x10b981, lineOp, 0.3 * u, 0.15 * u));
            if (this._currentPhase === 2) {
              this._threeGroup.add(makeMarker(pXY, 0.032 * u, 0x10b981));
            }
          }
          if (Math.abs(rf[0]) > 1e-4 && Math.abs(rf[1]) > 1e-4) {
            this._threeGroup.add(makeDashedLine(pXY, pX, 0x10b981, lineOp, 0.3 * u, 0.15 * u));
            if (this._currentPhase === 2) {
              this._threeGroup.add(makeDashedLine(vO, pX, 0x10b981, lineOp, 0.3 * u, 0.15 * u));
              this._threeGroup.add(makeMarker(pX, 0.032 * u, 0x10b981));
            }
          } else if (Math.abs(rf[0]) < 1e-4 && Math.abs(rf[1]) > 1e-4 && this._currentPhase === 2) {
            this._threeGroup.add(makeDashedLine(vO, pY, 0x10b981, lineOp, 0.3 * u, 0.15 * u));
            this._threeGroup.add(makeMarker(pY, 0.032 * u, 0x10b981));
          }
          this._threeGroup.add(
            makeMarker(
              pTip,
              this._currentPhase === 2 ? 0.052 * u : 0.048 * u,
              0x10b981,
              this._currentPhase === 2 ? 0.095 * u : 0.085 * u,
              0.38
            )
          );
        }
      }
    }
  };

  App.RankAnimator = RankAnimator;
  App.startRankAnimation = function (items) {
    return RankAnimator.start(items);
  };
  App.stopRankAnimation = function () {
    return RankAnimator.stop();
  };
})();
