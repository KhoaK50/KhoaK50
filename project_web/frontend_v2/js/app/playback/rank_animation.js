// ==================================================================================
// RANK & GAUSSIAN ELIMINATION 3-STEP PLAYBACK ENGINE (ACADEMIC ARCHITECTURE)
// Trực quan hóa bản chất Hạng và Biến đổi sơ cấp dòng khử Gauss (2D Canvas & 3D Three.js)
// Kịch bản 3 bước liên hoàn chuẩn bản chất Đại số Tuyến tính:
//   Bước 1: Hệ vector ban đầu & Phép biến đổi sơ cấp dòng bảo toàn Span
//   Bước 2: Triệt tiêu Vector phụ thuộc về gốc 0 & Lộ diện Bậc thang Pivot
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

  // --- THUẬT TOÁN KHỬ GAUSS THEO DÒNG & GHI NHẬN TỪNG BƯỚC BIẾN ĐỔI ---
  function computeGaussianElimination(items) {
    const m = items.length;
    const vectors = items.map((it) => to3D(it.vec || it));
    const is3D = items.some((it) => (it.vec || it).length >= 3);
    const n = is3D ? 3 : 2;

    // Ma trận A gồm m dòng (mỗi dòng là 1 vector v_i) và n cột
    const A = vectors.map((v) => v.slice(0, n));
    const initialRows = A.map((row) => row.slice());

    const steps = [];
    const pivotPositions = []; // { row, col, val }
    const eliminatedRows = new Set();
    let pr = 0;
    const eps = 1e-5;

    for (let c = 0; c < n && pr < m; c++) {
      let maxR = pr;
      let maxVal = Math.abs(A[pr][c]);
      for (let r = pr + 1; r < m; r++) {
        if (Math.abs(A[r][c]) > maxVal) {
          maxVal = Math.abs(A[r][c]);
          maxR = r;
        }
      }

      if (maxVal < eps) continue;

      // Hoán vị dòng nếu cần
      if (maxR !== pr) {
        const tmp = A[pr];
        A[pr] = A[maxR];
        A[maxR] = tmp;
        steps.push({
          type: "SWAP",
          row1: pr,
          row2: maxR,
          matrix: A.map((r) => r.slice())
        });
      }

      const pvVal = A[pr][c];
      pivotPositions.push({ row: pr, col: c, val: pvVal });

      // Khử các dòng phía dưới
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
            pivotRow: pr,
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
    const finalRows = A.map((r) => to3D(r));

    // Xác định các dòng là dòng 0 (phụ thuộc bị triệt tiêu)
    const zeroRowIndices = [];
    const nonZeroRowIndices = [];
    for (let r = 0; r < m; r++) {
      const isZero = finalRows[r].every((x) => Math.abs(x) < 1e-5);
      if (isZero) zeroRowIndices.push(r);
      else nonZeroRowIndices.push(r);
    }

    return {
      m,
      n,
      is3D,
      items,
      initialVectors: vectors,
      initialRows,
      finalRows,
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
      title: "Bước 1: Hệ vector Ban đầu & Phép biến đổi Sơ cấp dòng Bảo toàn Span",
      desc: "Mỗi phép khử dòng Rᵢ ← Rᵢ - k·Rⱼ trượt ngọn vector vᵢ song song theo phương vector trụ vⱼ. Vì vectơ trượt luôn nằm trong span(vᵢ, vⱼ), toàn bộ quá trình bảo toàn tuyệt đối không gian sinh."
    },
    {
      index: 1,
      title: "Bước 2: Triệt tiêu Vector Phụ thuộc về Gốc 0 & Lộ diện Bậc thang Pivot",
      desc: "Các dòng phụ thuộc sau khử Gauss co tụt hoàn toàn về gốc tọa độ 0 (tương ứng các hàng 0 ở đáy ma trận bậc thang REF). Các dòng còn lại tạo thành cấu trúc bậc thang Pivot."
    },
    {
      index: 2,
      title: "Bước 3: Kết tinh Không gian sinh & Khẳng định rank(A) = dim(span) = r",
      desc: "Từ r vector trụ bậc thang khác 0, không gian con thực sự được kết tinh trọn vẹn. Khẳng định bản chất đại số: Hạng ma trận bằng số dòng khác 0 của REF, chính là số chiều hình học: rank(A) = dim(span) = r."
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

    // --- KHỞI ĐỘNG VÀ THIẾT LẬP ---
    start(selectedItems) {
      let items = selectedItems;
      if (!items || !items.length) {
        const container = document.getElementById("rankChecklist");
        if (container && typeof App.getCheckedVectors === "function") {
          const checked = App.getCheckedVectors(container);
          if (checked && checked.length) {
            items = checked.map((vec) => {
              const found = (App.vectorList || []).find((v) => v.vec === vec || (v.vec && vec && v.vec[0] === vec[0] && v.vec[1] === vec[1]));
              return found || { vec: vec, name: "v" };
            });
          }
        }
      }

      if (!items || !items.length) {
        if (Array.isArray(App.vectorList) && App.vectorList.length > 0) {
          items = App.vectorList.slice(0, 3);
        }
      }

      if (!items || !items.length) {
        if (typeof App.showToast === "function") {
          App.showToast("Hãy tick chọn ít nhất 1 vector trong danh sách để trực quan!", "warning");
        }
        return false;
      }

      this.stop();

      const gaussData = computeGaussianElimination(items);
      this._gaussData = gaussData;

      // Lưu snapshot trạng thái vector gốc
      this._snapshot = (App.vectorList || []).map((v) => ({
        id: v.id,
        vec: [...(v.vec || [0, 0, 0])],
        visible: v.visible !== false,
        alpha: typeof v.alpha === "number" ? v.alpha : 1.0,
        colorCss: v.colorCss,
        colorHex: v.colorHex
      }));

      // Chuyển chế độ 2D / 3D nếu cần
      if (gaussData.is3D && App.mode !== "3D") {
        if (typeof App.setMode === "function") App.setMode("3D");
        else if (typeof App.toggleMode === "function") App.toggleMode();
      }

      // Căn chỉnh góc nhìn Camera 3D lệch phương (x != y != z)
      this._savedCamPos3D = null;
      if (window.Vec3D && Vec3D._camera && Vec3D._controls && App.mode === "3D") {
        if (Vec3D._resetAnimId) {
          cancelAnimationFrame(Vec3D._resetAnimId);
          Vec3D._resetAnimId = null;
        }
        this._savedCamPos3D = Vec3D._camera.position.clone();
        let maxReach = 3.0;
        for (const v of gaussData.initialVectors) {
          maxReach = Math.max(maxReach, norm(v));
        }
        const dist = Math.max(11.0, Math.min(24.0, maxReach * 2.65));
        Vec3D._camera.position.set(dist * 1.32, dist * 0.58, dist * 0.76);
        Vec3D._camera.up.set(0, 0, 1);
        Vec3D._controls.target.set(0, 0, 0);
        Vec3D._camera.lookAt(0, 0, 0);
        Vec3D._controls.update();
        if (typeof Vec3D.addAxisLabelsDynamic === "function") {
          Vec3D.addAxisLabelsDynamic();
        }
      }

      this.ensureControls();
      const wrap = document.getElementById("rankAnimControls");
      if (wrap) wrap.style.display = "block";

      this._active = true;
      this._paused = false;
      this._currentPhase = 0;
      this._phaseProgress = 0;
      App._rankAnimActive = true;

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

      // Dọn dẹp Three.js Group 3D
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

      // Khôi phục góc Camera 3D
      if (this._savedCamPos3D && window.Vec3D && Vec3D._camera && Vec3D._controls) {
        Vec3D._camera.position.copy(this._savedCamPos3D);
        Vec3D._controls.update();
        this._savedCamPos3D = null;
      }

      // Khôi phục snapshot vector và xóa override
      if (this._snapshot && Array.isArray(App.vectorList)) {
        for (const snap of this._snapshot) {
          const it = App.vectorList.find((v) => v.id === snap.id);
          if (it) {
            it.vec = [...snap.vec];
            it.visible = snap.visible;
            it.alpha = snap.alpha;
            it.colorCss = snap.colorCss;
            it.colorHex = snap.colorHex;
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

    // --- VÒNG LẶP RAF CHẠY HOẠT CẢNH LIÊN HOÀN 3 BƯỚC ---
    runCurrentPhase() {
      if (!this._active) return;
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

        const baseDuration = baseDurations[this._currentPhase] || 2400;
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

          // Chuyển tiếp liên hoàn sang bước kế tiếp với khoảng nghỉ 380ms / speed
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

    // Cập nhật vị trí tọa độ động và style của các vector theo từng bước
    applyPhaseStyles(phase, progress) {
      if (!this._gaussData || !Array.isArray(App.vectorList)) return;
      const gd = this._gaussData;
      const p = smoothstep(progress);

      for (let i = 0; i < gd.items.length; i++) {
        const item = gd.items[i];
        const vItem = App.vectorList.find((v) => v.id === item.id);
        if (!vItem) continue;

        const isZero = gd.zeroRowIndices.includes(i);
        const vInit = gd.initialVectors[i];
        const vFinal = gd.finalRows[i];

        if (phase === 0) {
          // Bước 1: Trượt ngọn vector v_i theo phương khử Gauss
          // v_i(t) = v_i_init + p * (v_i_final - v_i_init)
          const curVec = [
            vInit[0] + p * (vFinal[0] - vInit[0]),
            vInit[1] + p * (vFinal[1] - vInit[1]),
            vInit[2] + p * (vFinal[2] - vInit[2])
          ];
          vItem.vec = curVec;
          vItem._rankAlpha = 1.0;
          vItem._rankColorCss = isZero ? "#f59e0b" : "#0284c7";
        } else if (phase === 1) {
          // Bước 2: Hàng 0 co tụt hoàn toàn về gốc tọa độ O
          if (isZero) {
            const shrink = 1.0 - p;
            vItem.vec = [vFinal[0] * shrink, vFinal[1] * shrink, vFinal[2] * shrink];
            vItem._rankAlpha = Math.max(0.05, 1.0 - p * 0.90);
            vItem._rankColorCss = "#94a3b8";
            vItem._rankIsZero = true;
          } else {
            vItem.vec = [...vFinal];
            vItem._rankAlpha = 1.0;
            vItem._rankColorCss = "#0284c7";
            vItem._rankIsPivot = true;
          }
        } else if (phase === 2) {
          // Bước 3: r vector trụ bậc thang kết tinh không gian sinh
          if (isZero) {
            vItem.vec = [0, 0, 0];
            vItem._rankAlpha = 0.20;
            vItem._rankColorCss = "#cbd5e1";
          } else {
            vItem.vec = [...vFinal];
            vItem._rankAlpha = 1.0;
            vItem._rankColorCss = "#0284c7";
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

    // --- GIAO DIỆN HỘP ĐIỀU KHIỂN (#rankAnimControls) ---
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
          <button type="button" class="coord-phase-btn" data-phase="1" title="Bước 2: Triệt tiêu dòng 0 & Bậc thang">Bước 2</button>
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
          <div class="basis-step-title" id="rankStepTitle">Bước 1: Hệ vector Ban đầu & Phép biến đổi Sơ cấp dòng Bảo toàn Span</div>
          <div class="basis-step-desc" id="rankStepDesc">Trực quan hóa phép khử Gauss trượt ngọn vector song song theo phương vector trụ.</div>
        </div>
      `;

      if (out && out.nextSibling) {
        host.insertBefore(wrap, out.nextSibling);
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

      // Cập nhật pills
      const pills = wrap.querySelectorAll("#rankPhasePills .coord-phase-btn");
      pills.forEach((pBtn, idx) => {
        pBtn.classList.toggle("active", idx === this._currentPhase);
      });

      // Cập nhật nút Play/Pause: Khi đang phát, nút chuyển màu đỏ và icon pause
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

      // Cập nhật tốc độ
      const speedVal = wrap.querySelector("#rankSpeedValue");
      if (speedVal) speedVal.textContent = `${this._speed.toFixed(1)}×`;

      // Cập nhật thuyết minh động
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
          descEl.innerHTML = `Thực hiện khử Gauss đưa ma trận về bậc thang REF.<br>Ngọn vector <b>trượt song song theo phương vector trụ</b>. Vì vector trượt nằm trọn trong span ban đầu, phép biến đổi <b>bảo toàn tuyệt đối không gian sinh</b>.`;
        } else if (this._currentPhase === 1) {
          descEl.innerHTML = `Sau các phép trượt khử Gauss: <b>${gd.zeroRowIndices.length} dòng phụ thuộc co tụt hoàn toàn về gốc 0</b> (các hàng 0 ở đáy ma trận REF).<br>Lộ diện đúng <b>r = ${gd.rank} dòng bậc thang Pivot khác 0</b>.`;
        } else if (this._currentPhase === 2) {
          descEl.innerHTML = `Không gian con thực sự kết tinh từ đúng <b>${gd.rank} vector trụ bậc thang</b>.<br>Khẳng định bản chất: <b>Số dòng khác 0 của REF = dim(span) = rank(A) = ${gd.rank}</b>.`;
        }
      }
    },

    // =========================================================================
    // 2D CANVAS RENDERING HOOKS (viewer2D.js)
    // =========================================================================

    // 1. Kết xuất lớp nền không gian con (Subspace Pass)
    render2DSubspace(ctx, gridInfo) {
      if (!this._active || !gridInfo || App.mode !== "2D" || !this._gaussData) return;
      const { cx, cy, px } = gridInfo;
      const gd = this._gaussData;
      const p = smoothstep(this._phaseProgress);

      const toScreen = (vx, vy) => ({
        x: cx + vx * px,
        y: cy - vy * px
      });

      if (this._currentPhase === 0) {
        // Bước 1: Đường gióng trượt song song theo phương vector trụ
        ctx.save();
        ctx.strokeStyle = "rgba(2, 132, 199, 0.4)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);

        for (const st of gd.steps) {
          if (st.type === "ELIMINATE" && st.beforeVec && st.afterVec) {
            const p1 = toScreen(st.beforeVec[0], st.beforeVec[1]);
            const p2 = toScreen(st.afterVec[0], st.afterVec[1]);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // Mũi tên hướng trượt
            const curTip = toScreen(
              st.beforeVec[0] + p * (st.afterVec[0] - st.beforeVec[0]),
              st.beforeVec[1] + p * (st.afterVec[1] - st.beforeVec[1])
            );
            ctx.fillStyle = "#0284c7";
            ctx.beginPath();
            ctx.arc(curTip.x, curTip.y, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      } else if (this._currentPhase === 1) {
        // Bước 2: Vòng hấp thụ tại gốc O khi hàng 0 co tụt về 0
        const pO = toScreen(0, 0);
        ctx.save();
        ctx.strokeStyle = "rgba(239, 68, 68, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pO.x, pO.y, 6 + p * 8, 0, Math.PI * 2);
        ctx.stroke();

        // Đường bậc thang Pivot (Staircase)
        if (gd.pivotPositions.length >= 2) {
          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          const p1 = toScreen(gd.finalRows[0][0], gd.finalRows[0][1]);
          ctx.moveTo(pO.x, pO.y);
          ctx.lineTo(p1.x, pO.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
        ctx.restore();
      } else if (this._currentPhase === 2) {
        // Bước 3: Kết tinh không gian sinh rank(A) = r
        ctx.save();
        if (gd.rank === 1 && gd.nonZeroRowIndices.length > 0) {
          const pv = gd.finalRows[gd.nonZeroRowIndices[0]];
          const len = Math.hypot(pv[0], pv[1]);
          if (len > 1e-9) {
            const dirX = pv[0] / len;
            const dirY = pv[1] / len;
            const p1 = toScreen(-dirX * 30, -dirY * 30);
            const p2 = toScreen(dirX * 30, dirY * 30);
            ctx.strokeStyle = "rgba(16, 185, 129, 0.55)";
            ctx.lineWidth = 2.0;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        } else if (gd.rank >= 2) {
          ctx.fillStyle = "rgba(16, 185, 129, 0.09)";
          ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
        ctx.restore();
      }
    },

    // 2. Kết xuất lớp tiền cảnh chú thích hình học (Projections Pass)
    render2DProjections(ctx, gridInfo) {
      if (!this._active || !gridInfo || App.mode !== "2D" || !this._gaussData) return;
      const { cx, cy, px } = gridInfo;
      const gd = this._gaussData;

      const toScreen = (vx, vy) => ({
        x: cx + vx * px,
        y: cy - vy * px
      });

      if (this._currentPhase === 0) {
        // Nhãn phép biến đổi dòng
        for (const st of gd.steps) {
          if (st.type === "ELIMINATE" && st.beforeVec) {
            const sc = toScreen(st.beforeVec[0], st.beforeVec[1]);
            ctx.save();
            ctx.font = "bold 11px system-ui, sans-serif";
            ctx.fillStyle = "#0284c7";
            ctx.fillText(`R_${st.targetRow + 1} ← R_${st.targetRow + 1} - ${formatScalar(st.factor)}·R_${st.pivotRow + 1}`, sc.x + 8, sc.y - 6);
            ctx.restore();
          }
        }
      } else if (this._currentPhase === 1) {
        // Nhãn dòng 0 bị triệt tiêu
        const pO = toScreen(0, 0);
        ctx.save();
        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.fillStyle = "#ef4444";
        ctx.fillText(`Hàng 0 triệt tiêu về gốc O (${gd.zeroRowIndices.length} vector)`, pO.x + 10, pO.y + 14);
        ctx.restore();
      } else if (this._currentPhase === 2) {
        // Nhãn kết luận hạng
        const pO = toScreen(0, 0);
        ctx.save();
        ctx.font = "bold 12px system-ui, sans-serif";
        ctx.textAlign = "center";
        const txt = `Hạng rank(A) = ${gd.rank} (Số dòng khác 0 của REF)`;
        const w = ctx.measureText(txt).width + 16;

        ctx.fillStyle = "rgba(16, 185, 129, 0.94)";
        ctx.beginPath();
        ctx.roundRect(pO.x - w / 2, pO.y - 28, w, 22, 4);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.fillText(txt, pO.x, pO.y - 13);
        ctx.restore();
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

      // Xóa sạch children cũ
      while (this._threeGroup.children.length > 0) {
        const obj = this._threeGroup.children[0];
        this._threeGroup.remove(obj);
        if (obj.geometry) obj.geometry.dispose?.();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m?.dispose?.());
        else obj.material?.dispose?.();
      }

      const gd = this._gaussData;
      const p = smoothstep(this._phaseProgress);

      if (this._currentPhase === 0) {
        // Bước 1: Đường gióng 3D trượt Gauss
        for (const st of gd.steps) {
          if (st.type === "ELIMINATE" && st.beforeVec && st.afterVec) {
            const pts = [
              new THREE.Vector3(st.beforeVec[0], st.beforeVec[1], st.beforeVec[2]),
              new THREE.Vector3(st.afterVec[0], st.afterVec[1], st.afterVec[2])
            ];
            const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
            const lineMat = new THREE.LineDashedMaterial({
              color: 0x0284c7,
              dashSize: 0.3,
              gapSize: 0.15
            });
            const line = new THREE.Line(lineGeom, lineMat);
            line.computeLineDistances();
            this._threeGroup.add(line);
          }
        }
      } else if (this._currentPhase === 1) {
        // Bước 2: Vòng cầu hấp thụ tại gốc O
        const ringGeom = new THREE.RingGeometry(0.15, 0.25, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0));
        this._threeGroup.add(ring);
      } else if (this._currentPhase === 2) {
        // Bước 3: Mặt phẳng kết tinh không gian sinh thực sự
        if (gd.rank === 2 && gd.nonZeroRowIndices.length >= 2) {
          const u = gd.finalRows[gd.nonZeroRowIndices[0]];
          const v = gd.finalRows[gd.nonZeroRowIndices[1]];
          const normVec = cross(u, v);
          const nLen = norm(normVec);
          if (nLen > 1e-6) {
            const planeGeom = new THREE.PlaneGeometry(16, 16);
            const planeMat = new THREE.MeshBasicMaterial({
              color: 0x10b981,
              transparent: true,
              opacity: 0.14 * p,
              side: THREE.DoubleSide,
              depthWrite: false
            });
            const planeMesh = new THREE.Mesh(planeGeom, planeMat);
            const normal = new THREE.Vector3(normVec[0] / nLen, normVec[1] / nLen, normVec[2] / nLen);
            planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
            this._threeGroup.add(planeMesh);
          }
        }
      }
    }
  };

  App.RankAnimator = RankAnimator;
})();
