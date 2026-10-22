// ==================================================================================
// RANK & GAUSSIAN ELIMINATION 3-STEP PLAYBACK ENGINE (ACADEMIC MATHEMATICAL ESSENCE)
// Trực quan hóa bản chất Hạng và Biến đổi sơ cấp dòng khử Gauss (2D Canvas & 3D Three.js)
// Kịch bản 3 bước liên hoàn thuần hình học (Zero Canvas Prose):
//   Bước 1: Hệ vector ban đầu & Phép trượt sơ cấp dòng R_i <- R_i - k*R_j bảo toàn Span
//   Bước 2: Triệt tiêu Dòng phụ thuộc về gốc O(0,0) & Lộ diện Cấu trúc Bậc thang (Pivot REF)
//   Bước 3: Kết tinh Không gian sinh & Khẳng định rank(A) = dim(span) = r
// Tuân thủ triệt để Zero Em-dash (\u2014) và chuẩn mực Anti-Slop.
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

    // 1. Nếu truyền trực tiếp mảng đối tượng từ App.vectorList
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

    // 2. Ưu tiên đọc từ các checkbox được tick trong #rankChecklist (khớp chính xác v.id)
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

    // 3. Nếu truyền mảng tọa độ (VD từ App.getCheckedVectors), đối chiếu số thực với App.vectorList
    if (Array.isArray(selectedItems) && selectedItems.length > 0) {
      const usedIds = new Set();
      const matched = selectedItems.map((el, idx) => {
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
      }).filter(Boolean);
      if (matched.length > 0) return matched;
    }

    // 4. Fallback: lấy tối đa 3 vector đầu tiên trong App.vectorList và tự động tick
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

  // --- THUẬT TOÁN KHỬ GAUSS THEO DÒNG & GHI NHẬN QUỸ ĐẠO TRƯỢT HÌNH HỌC ---
  function computeGaussianElimination(items) {
    const m = items.length;
    const vectors = items.map((it) => to3D(it.vec || it));
    const is3D = items.some((it) => (it.vec || it).length >= 3) || App.mode === "3D";
    const n = is3D ? 3 : 2;

    const A = vectors.map((v) => v.slice(0, n));
    const initialRows = A.map((row) => row.slice());

    // Theo dõi lịch sử từng dòng gốc ban đầu (rowIdx)
    const rowOrder = A.map((_, idx) => idx);
    const steps = [];
    const pivotPositions = [];
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

          steps.push({
            type: "ELIMINATE",
            targetRow: r,
            origTargetIdx: rowOrder[r],
            pivotRow: pr,
            origPivotIdx: rowOrder[pr],
            factor: factor,
            beforeVec: to3D(origRow),
            afterVec: to3D(A[r]),
            pivotVec: to3D(A[pr]),
            matrix: A.map((row) => row.slice())
          });
        }
      }
      pr++;
    }

    const rank = pivotPositions.length;

    // Ánh xạ kết quả cuối cùng về đúng thứ tự từng vector gốc ban đầu (0..m-1)
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

    // Điểm dừng trung gian cuối Bước 1:
    // - Các dòng trụ bậc thang (non-zero) trượt 100% về vị trí bậc thang (toạ độ đầu về 0).
    // - Các dòng phụ thuộc (sẽ về 0) trượt 62% quãng đường trên quỹ đạo song song với dòng trụ ở Bước 1,
    //   sau đó ở Bước 2 mới co tụt nốt 38% cuối cùng vào tâm hấp thụ tại gốc O(0,0)!
    const step1EndByOrig = new Array(m).fill(null);
    for (let i = 0; i < m; i++) {
      const v0 = vectors[i];
      const vf = finalByOrig[i];
      if (zeroRowIndices.includes(i)) {
        step1EndByOrig[i] = [
          v0[0] + 0.62 * (vf[0] - v0[0]),
          v0[1] + 0.62 * (vf[1] - v0[1]),
          v0[2] + 0.62 * (vf[2] - v0[2])
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
      steps,
      pivotPositions,
      rank,
      zeroRowIndices,
      nonZeroRowIndices
    };
  }

  // --- THÔNG TIN THUYẾT MINH 3 BƯỚC SƯ PHẠM ---
  const PHASES_INFO = [
    {
      index: 0,
      title: "Bước 1: Hệ vector Ban đầu & Phép trượt Sơ cấp dòng Bảo toàn Span",
      desc: "Mỗi phép khử Gauss Rᵢ ← Rᵢ - k·Rⱼ trượt ngọn vector vᵢ song song theo phương vector trụ vⱼ nhưng luôn nằm trọn trong không gian sinh ban đầu."
    },
    {
      index: 1,
      title: "Bước 2: Triệt tiêu Dòng Phụ thuộc về Gốc O & Lộ diện Bậc thang Pivot",
      desc: "Các dòng phụ thuộc co tụt hoàn toàn về gốc O(0,0) thành dòng 0 ở đáy ma trận REF. Các dòng độc lập khóa vào cấu trúc bậc thang tọa độ."
    },
    {
      index: 2,
      title: "Bước 3: Kết tinh Không gian sinh & Khẳng định rank(A) = dim(span) = r",
      desc: "Từ r vector bậc thang khác 0 còn trụ lại, không gian con thực sự được kết tinh trọn vẹn, chứng minh số dòng khác 0 của REF chính là số chiều hình học."
    }
  ];

  // =========================================================================
  // BỘ ĐIỀU KHIỂN HOẠT CẢNH HẠNG & KHỬ GAUSS (App.RankAnimator)
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
        cancelAnimationFrame(Vec3D._resetAnimId);
        Vec3D._resetAnimId = null;
      }
      if (!this._savedCamPos3D) {
        this._savedCamPos3D = Vec3D._camera.position.clone();
      }
      let maxReach = 3.0;
      for (const v of this._gaussData.initialVectors) {
        maxReach = Math.max(maxReach, norm(v));
      }
      const dist = Math.max(10.5, Math.min(24.0, maxReach * 2.55));
      Vec3D._camera.position.set(dist * 1.32, dist * 0.58, dist * 0.76);
      Vec3D._camera.up.set(0, 0, 1);
      Vec3D._controls.target.set(0, 0, 0);
      Vec3D._camera.lookAt(0, 0, 0);
      Vec3D._controls.update();
      if (typeof Vec3D.addAxisLabelsDynamic === "function") {
        Vec3D.addAxisLabelsDynamic();
      }
    },

    start(selectedItems) {
      const items = resolveRankItems(selectedItems);
      if (!items || !items.length) {
        if (typeof App.showToast === "function") {
          App.showToast("Hãy tick chọn ít nhất 1 vector trong danh sách để trực quan!", "warning");
        }
        return false;
      }

      this.stop();

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

      // Ẩn các vector không được chọn
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

      this._active = true;
      this._paused = false;
      this._currentPhase = 0;
      this._phaseProgress = 0;
      App._rankAnimActive = true;

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
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }

      const wasActive = this._active;
      this._active = false;
      this._paused = false;
      this._currentPhase = 0;
      this._phaseProgress = 0;
      App._rankAnimActive = false;

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
        cancelAnimationFrame(this._raf);
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
        cancelAnimationFrame(this._raf);
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

      const baseDurations = [2600, 2600, 2200];
      let lastTime = performance.now();
      let currentProgress = this._phaseProgress;

      const stepLoop = (now) => {
        if (!this._active || this._paused) return;

        const delta = Math.max(0, now - lastTime);
        lastTime = now;

        const baseDuration = baseDurations[this._currentPhase] || 2500;
        currentProgress += (delta * this._speed) / baseDuration;
        const p = Math.min(1.0, currentProgress);
        this._phaseProgress = p;

        this.applyPhaseStyles(this._currentPhase, p);
        this.redraw();

        if (p < 1.0) {
          this._raf = requestAnimationFrame(stepLoop);
        } else {
          this._phaseProgress = 1.0;
          this.applyPhaseStyles(this._currentPhase, 1.0);
          this.redraw();

          if (this._currentPhase < 2) {
            this._phaseTimer = setTimeout(() => {
              if (this._active && !this._paused) {
                this.goToPhase(this._currentPhase + 1);
              }
            }, 380 / this._speed);
          } else {
            this._paused = true;
            this.updateSidebarUI();
          }
        }
      };

      this._raf = requestAnimationFrame(stepLoop);
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
          // Bước 1: Trượt song song theo phương vector trụ từ vInit -> vStep1End
          const curVec = [
            vInit[0] + p * (vStep1End[0] - vInit[0]),
            vInit[1] + p * (vStep1End[1] - vInit[1]),
            vInit[2] + p * (vStep1End[2] - vInit[2])
          ];
          vItem.vec = toDim(curVec);
          vItem._rankAlpha = 1.0;
          vItem._rankColorCss = i === 0 ? "#0284c7" : isZero ? "#f59e0b" : "#10b981";
          vItem._customLabelLatex = `v_${i + 1}`;
        } else if (phase === 1) {
          // Bước 2: Dòng phụ thuộc co tụt từ vStep1End về đúng gốc O(0,0); dòng trụ giữ vững vị trí bậc thang REF
          if (isZero) {
            const shrink = 1.0 - p;
            vItem.vec = toDim([
              vStep1End[0] * shrink,
              vStep1End[1] * shrink,
              vStep1End[2] * shrink
            ]);
            vItem._rankAlpha = Math.max(0.05, 1.0 - p * 0.88);
            vItem._rankColorCss = "#ef4444";
            vItem._rankIsZero = true;
            vItem._customLabelLatex = p > 0.75 ? "0" : `v_${i + 1}`;
            if (p > 0.94) vItem.visible = false;
          } else {
            vItem.vec = toDim(vFinal);
            vItem._rankAlpha = 1.0;
            vItem._rankColorCss = i === 0 ? "#0284c7" : "#10b981";
            vItem._rankIsPivot = true;
            vItem._customLabelLatex = `r_${i + 1}`;
          }
        } else if (phase === 2) {
          // Bước 3: Chỉ còn r vector bậc thang khác 0 kết tinh không gian sinh
          if (isZero) {
            vItem.vec = toDim([0, 0, 0]);
            vItem.visible = false;
            vItem._rankAlpha = 0;
          } else {
            vItem.vec = toDim(vFinal);
            vItem.visible = true;
            vItem._rankAlpha = 1.0;
            vItem._rankColorCss = i === 0 ? "#0284c7" : "#10b981";
            vItem._customLabelLatex = `r_${i + 1}`;
          }
        }
      }
    },

    redraw() {
      if (App.mode === "2D" && window.Vec2D) {
        Vec2D.draw2DAllVectors();
      } else if (window.Vec3D) {
        Vec3D.hardRefresh3D(false);
      }
    },

    ensureControls() {
      let wrap = document.getElementById("rankAnimControls");
      if (wrap) return wrap;

      const host = document.getElementById("form-rank");
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
          <button type="button" class="coord-phase-btn active" data-phase="0" title="Bước 1: Trượt khử Gauss bảo toàn Span">Bước 1</button>
          <button type="button" class="coord-phase-btn" data-phase="1" title="Bước 2: Triệt tiêu dòng 0 & Bậc thang Pivot">Bước 2</button>
          <button type="button" class="coord-phase-btn" data-phase="2" title="Bước 3: Kết tinh không gian rank(A) = r">Bước 3</button>
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
        speedSlider.oninput = (e) => this.setSpeed(e.target.value);
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
          const elimList = gd.steps
            .filter((st) => st.type === "ELIMINATE")
            .map((st) => `R<sub>${st.targetRow + 1}</sub> ← R<sub>${st.targetRow + 1}</sub> - (${formatScalar(st.factor)})R<sub>${st.pivotRow + 1}</sub>`)
            .join(", ");
          descEl.innerHTML = `Phép khử Gauss (${elimList || "giữ nguyên dòng trụ"}): ngọn vector <b>trượt trên đường ray nét đứt song song với vector trụ</b>.<br>Vì chỉ cộng bội của vector nằm trong hệ, <b>không gian sinh (span) được bảo toàn tuyệt đối</b>.`;
        } else if (this._currentPhase === 1) {
          if (gd.zeroRowIndices.length > 0) {
            descEl.innerHTML = `<b>${gd.zeroRowIndices.length} dòng phụ thuộc</b> bị triệt tiêu hoàn toàn vào tâm ngắm đỏ tại <b>gốc O(0,0)</b> (ứng với hàng toàn số 0 ở đáy ma trận REF).<br>Chỉ còn lại <b>r = ${gd.rank} vector bậc thang (r<sub>i</sub>)</b> có tọa độ đầu bị khử về 0.`;
          } else {
            descEl.innerHTML = `Không có dòng nào bị triệt tiêu về 0.<br>Các dòng dưới trượt về đúng vị trí <b>bậc thang tọa độ (x = 0 trên trục Oy)</b>, lộ diện <b>r = ${gd.rank} dòng Pivot độc lập</b>.`;
          }
        } else if (this._currentPhase === 2) {
          descEl.innerHTML = `Từ <b>r = ${gd.rank} vector bậc thang khác 0</b> còn trụ lại (cùng bóng mờ của hệ vector ban đầu), không gian con <b>${gd.rank}D</b> được kết tinh.<br>Khẳng định: <b>Số dòng khác 0 của REF = dim(span) = rank(A) = ${gd.rank}</b>.`;
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
      const p = smoothstep(this._phaseProgress);
      const isDark = document.body.classList.contains("dark");

      const toScreen = (vx, vy) => ({
        x: cx + vx * px,
        y: cy - vy * px
      });

      // Vẽ bóng mờ nét đứt của các vector ban đầu v_i^(0) để đối chiếu bảo toàn Span
      ctx.save();
      ctx.strokeStyle = isDark ? "rgba(148, 163, 184, 0.35)" : "rgba(100, 116, 139, 0.32)";
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      const pO = toScreen(0, 0);
      for (let i = 0; i < gd.initialVectors.length; i++) {
        const v0 = gd.initialVectors[i];
        const pV0 = toScreen(v0[0], v0[1]);
        ctx.beginPath();
        ctx.moveTo(pO.x, pO.y);
        ctx.lineTo(pV0.x, pV0.y);
        ctx.stroke();
      }
      ctx.restore();

      // Vẽ không gian sinh (Span) được bảo toàn xuyên suốt cả 3 bước
      ctx.save();
      if (gd.rank === 1 && gd.nonZeroRowIndices.length > 0) {
        const pv = gd.initialVectors[gd.nonZeroRowIndices[0]];
        const len = Math.hypot(pv[0], pv[1]);
        if (len > 1e-9) {
          const dirX = pv[0] / len;
          const dirY = pv[1] / len;
          const p1 = toScreen(-dirX * 30, -dirY * 30);
          const p2 = toScreen(dirX * 30, dirY * 30);
          ctx.strokeStyle = this._currentPhase === 2 ? "rgba(16, 185, 129, 0.65)" : "rgba(2, 132, 199, 0.35)";
          ctx.lineWidth = this._currentPhase === 2 ? 2.4 : 1.6;
          ctx.setLineDash([7, 5]);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      } else if (gd.rank >= 2 && this._currentPhase === 2) {
        ctx.fillStyle = isDark ? "rgba(16, 185, 129, 0.07)" : "rgba(16, 185, 129, 0.05)";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        const r1 = gd.finalRows[gd.nonZeroRowIndices[0]];
        const r2 = gd.finalRows[gd.nonZeroRowIndices[1]];
        if (r1 && r2) {
          ctx.strokeStyle = isDark ? "rgba(16, 185, 129, 0.16)" : "rgba(16, 185, 129, 0.14)";
          ctx.lineWidth = 1.0;
          for (let k = -4; k <= 4; k++) {
            const a1 = toScreen(k * r1[0] - 4 * r2[0], k * r1[1] - 4 * r2[1]);
            const a2 = toScreen(k * r1[0] + 4 * r2[0], k * r1[1] + 4 * r2[1]);
            const b1 = toScreen(-4 * r1[0] + k * r2[0], -4 * r1[1] + k * r2[1]);
            const b2 = toScreen(4 * r1[0] + k * r2[0], 4 * r1[1] + k * r2[1]);
            ctx.beginPath();
            ctx.moveTo(a1.x, a1.y);
            ctx.lineTo(a2.x, a2.y);
            ctx.moveTo(b1.x, b1.y);
            ctx.lineTo(b2.x, b2.y);
            ctx.stroke();
          }
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
        // Bước 1: Đường ray trượt song song theo phương vector trụ từ vInit -> vFinal
        for (let i = 0; i < gd.m; i++) {
          const v0 = gd.initialVectors[i];
          const vf = gd.finalRows[i];
          const vEnd1 = gd.step1EndRows[i];
          if (Math.hypot(vf[0] - v0[0], vf[1] - v0[1]) > 1e-4) {
            const scStart = toScreen(v0[0], v0[1]);
            const scFullEnd = toScreen(vf[0], vf[1]);
            const scCur = toScreen(
              v0[0] + p * (vEnd1[0] - v0[0]),
              v0[1] + p * (vEnd1[1] - v0[1])
            );
            const isZero = gd.zeroRowIndices.includes(i);
            const trackCol = isZero ? "#f59e0b" : "#10b981";

            drawTrackArrow2D(scStart, scFullEnd, trackCol);

            ctx.save();
            ctx.fillStyle = trackCol;
            ctx.beginPath();
            ctx.arc(scCur.x, scCur.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      } else if (this._currentPhase === 1) {
        const pO = toScreen(0, 0);

        // Tâm ngắm hấp thụ dòng phụ thuộc tại gốc O(0,0)
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

        // Đường bậc thang tọa độ cho các dòng Pivot khác 0
        for (const rIdx of gd.nonZeroRowIndices) {
          const rf = gd.finalRows[rIdx];
          if (Math.abs(rf[0]) > 1e-4 && Math.abs(rf[1]) > 1e-4) {
            const scX = toScreen(rf[0], 0);
            const scTip = toScreen(rf[0], rf[1]);
            ctx.save();
            ctx.strokeStyle = "rgba(2, 132, 199, 0.55)";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(pO.x, pO.y);
            ctx.lineTo(scX.x, scX.y);
            ctx.lineTo(scTip.x, scTip.y);
            ctx.stroke();
            ctx.restore();
          } else if (Math.abs(rf[0]) < 1e-4 && Math.abs(rf[1]) > 1e-4) {
            // Vector bậc thang thứ 2 đã nằm hẳn trên trục Oy (x = 0): vẽ tâm khóa trên trục Oy
            const scTip = toScreen(0, rf[1]);
            ctx.save();
            ctx.strokeStyle = "#10b981";
            ctx.lineWidth = 1.6;
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
      if (!this._active || !mathGroup || App.mode !== "3D" || !this._gaussData) return;
      if (!window.THREE) return;

      if (!this._threeGroup) {
        this._threeGroup = new THREE.Group();
        mathGroup.add(this._threeGroup);
      }

      while (this._threeGroup.children.length > 0) {
        const obj = this._threeGroup.children[0];
        this._threeGroup.remove(obj);
        if (obj.geometry) obj.geometry.dispose?.();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m?.dispose?.());
        else obj.material?.dispose?.();
      }

      const gd = this._gaussData;
      const p = smoothstep(this._phaseProgress);

      // Bóng mờ nét đứt của các vector ban đầu trong 3D
      for (let i = 0; i < gd.initialVectors.length; i++) {
        const v0 = gd.initialVectors[i];
        const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(v0[0], v0[1], v0[2])];
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineDashedMaterial({
          color: 0x94a3b8,
          dashSize: 0.25,
          gapSize: 0.15,
          transparent: true,
          opacity: 0.45
        });
        const line = new THREE.Line(geom, mat);
        line.computeLineDistances();
        this._threeGroup.add(line);
      }

      if (this._currentPhase === 0) {
        for (let i = 0; i < gd.m; i++) {
          const v0 = gd.initialVectors[i];
          const vf = gd.finalRows[i];
          if (norm([vf[0] - v0[0], vf[1] - v0[1], vf[2] - v0[2]]) > 1e-4) {
            const pts = [
              new THREE.Vector3(v0[0], v0[1], v0[2]),
              new THREE.Vector3(vf[0], vf[1], vf[2])
            ];
            const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
            const isZero = gd.zeroRowIndices.includes(i);
            const lineMat = new THREE.LineDashedMaterial({
              color: isZero ? 0xf59e0b : 0x10b981,
              dashSize: 0.3,
              gapSize: 0.15
            });
            const line = new THREE.Line(lineGeom, lineMat);
            line.computeLineDistances();
            this._threeGroup.add(line);
          }
        }
      } else if (this._currentPhase === 1) {
        if (gd.zeroRowIndices.length > 0) {
          const ringGeom = new THREE.RingGeometry(0.18, 0.32, 28);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0xef4444,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85
          });
          const ring = new THREE.Mesh(ringGeom, ringMat);
          this._threeGroup.add(ring);
        }
      } else if (this._currentPhase === 2) {
        if (gd.rank === 2 && gd.nonZeroRowIndices.length >= 2) {
          const u = gd.finalRows[gd.nonZeroRowIndices[0]];
          const v = gd.finalRows[gd.nonZeroRowIndices[1]];
          const normVec = cross(u, v);
          const nLen = norm(normVec);
          if (nLen > 1e-6) {
            const planeGeom = new THREE.PlaneGeometry(14, 14);
            const planeMat = new THREE.MeshBasicMaterial({
              color: 0x10b981,
              transparent: true,
              opacity: 0.15 * p,
              side: THREE.DoubleSide,
              depthWrite: false
            });
            const planeMesh = new THREE.Mesh(planeGeom, planeMat);
            const normal = new THREE.Vector3(normVec[0] / nLen, normVec[1] / nLen, normVec[2] / nLen);
            planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
            this._threeGroup.add(planeMesh);
          }
        } else if (gd.rank === 1 && gd.nonZeroRowIndices.length >= 1) {
          const u = gd.finalRows[gd.nonZeroRowIndices[0]];
          const uLen = norm(u);
          if (uLen > 1e-6) {
            const dir = [u[0] / uLen, u[1] / uLen, u[2] / uLen];
            const pts = [
              new THREE.Vector3(-dir[0] * 12, -dir[1] * 12, -dir[2] * 12),
              new THREE.Vector3(dir[0] * 12, dir[1] * 12, dir[2] * 12)
            ];
            const geom = new THREE.BufferGeometry().setFromPoints(pts);
            const mat = new THREE.LineDashedMaterial({ color: 0x10b981, dashSize: 0.35, gapSize: 0.18 });
            const line = new THREE.Line(geom, mat);
            line.computeLineDistances();
            this._threeGroup.add(line);
          }
        }
      }
    }
  };

  App.RankAnimator = RankAnimator;
})();
