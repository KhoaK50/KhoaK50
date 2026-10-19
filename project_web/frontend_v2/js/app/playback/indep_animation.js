// ==================================================================================
// LINEAR INDEPENDENCE 3-STEP PLAYBACK ENGINE (ACADEMIC ARCHITECTURE)
// Trực quan hóa bản chất Độc lập & Phụ thuộc tuyến tính (2D Canvas & 3D Three.js)
// Kịch bản 3 bước liên hoàn chuẩn bản chất Đại số Tuyến tính:
//   Bước 1: Độ mở không gian & Thể tích/Diện tích định thức
//   Bước 2: Phép thử tổ hợp tuyến tính (Quy tắc nối đuôi đa giác tip-to-tail)
//   Bước 3: Phân tách Hệ trụ độc lập & Vector dư thừa
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

  function formatMathName(name) {
    if (!name) return "";
    return name.replace(/_([0-9]+)/g, "$1");
  }

  function getVectorDisplayName(item, index) {
    if (item && item.name) return item.name;
    return `v_${index}`;
  }

  // --- THUẬT TOÁN ĐẠI SỐ TUYẾN TÍNH PHÂN TÍCH ĐỘC LẬP / PHỤ THUỘC ---
  function analyzeLinearIndependence(items) {
    const m = items.length;
    const vectors = items.map((it) => to3D(it.vec || it));
    const is3D = items.some((it) => (it.vec || it).length >= 3);
    const n = is3D ? 3 : 2;

    // Lập ma trận A có các cột là các vector v_1, ..., v_m (kích thước n x m)
    // Để tìm rank và các cột cơ sở (Pivot columns)
    const M = [];
    for (let r = 0; r < n; r++) {
      M.push(vectors.map((v) => v[r] || 0));
    }

    const pivotCols = [];
    const pivotRows = [];
    let pr = 0;
    const eps = 1e-5;
    const A = M.map((row) => row.slice());

    for (let c = 0; c < m && pr < n; c++) {
      let maxR = pr;
      let maxVal = Math.abs(A[pr][c]);
      for (let r = pr + 1; r < n; r++) {
        if (Math.abs(A[r][c]) > maxVal) {
          maxVal = Math.abs(A[r][c]);
          maxR = r;
        }
      }
      if (maxVal < eps) continue;

      const tmp = A[pr];
      A[pr] = A[maxR];
      A[maxR] = tmp;

      const pv = A[pr][c];
      for (let j = c; j < m; j++) A[pr][j] /= pv;
      for (let r = 0; r < n; r++) {
        if (r !== pr && Math.abs(A[r][c]) > 1e-9) {
          const factor = A[r][c];
          for (let j = c; j < m; j++) A[r][j] -= factor * A[pr][j];
        }
      }
      pivotCols.push(c);
      pivotRows.push(pr);
      pr++;
    }

    const rank = pivotCols.length;
    const isIndependent = rank === m;
    const redundantIndices = [];
    for (let c = 0; c < m; c++) {
      if (!pivotCols.includes(c)) redundantIndices.push(c);
    }

    // Biểu diễn các vector phụ thuộc qua các cột trụ pivot
    const redundantExpansions = {};
    for (const redIdx of redundantIndices) {
      const coeffs = [];
      for (let p = 0; p < pivotCols.length; p++) {
        coeffs.push(A[pivotRows[p]][redIdx]);
      }
      redundantExpansions[redIdx] = {
        pivotCols: [...pivotCols],
        coeffs: coeffs,
        targetVec: vectors[redIdx]
      };
    }

    // Tính thể tích / diện tích định thức cho Bước 1
    let detVal = 0;
    let volumeGeometryType = "none";
    if (n === 2 && m >= 2) {
      detVal = Math.abs(vectors[0][0] * vectors[1][1] - vectors[0][1] * vectors[1][0]);
      volumeGeometryType = "parallelogram_2d";
    } else if (n === 3 && m >= 3) {
      const c12 = cross(vectors[1], vectors[2]);
      detVal = Math.abs(dot(vectors[0], c12));
      volumeGeometryType = "parallelepiped_3d";
    } else if (n === 3 && m === 2) {
      detVal = norm(cross(vectors[0], vectors[1]));
      volumeGeometryType = "parallelogram_3d";
    } else if (m === 1) {
      detVal = norm(vectors[0]);
      volumeGeometryType = "line_1d";
    }

    // Thành phần trực giao thoát khỏi không gian con cho bài toán độc lập ở Bước 2
    let orthogonalResidue = [0, 0, 0];
    if (isIndependent && m >= 2) {
      if (m === 2) {
        const u1 = vectors[0];
        const v2 = vectors[1];
        const u1NormSq = dot(u1, u1);
        if (u1NormSq > 1e-9) {
          const sc = dot(v2, u1) / u1NormSq;
          orthogonalResidue = [v2[0] - sc * u1[0], v2[1] - sc * u1[1], v2[2] - sc * u1[2]];
        }
      } else if (m === 3) {
        const nVec = cross(vectors[0], vectors[1]);
        const nNorm = norm(nVec);
        if (nNorm > 1e-9) {
          const unitN = [nVec[0] / nNorm, nVec[1] / nNorm, nVec[2] / nNorm];
          const dist = dot(vectors[2], unitN);
          orthogonalResidue = [unitN[0] * dist, unitN[1] * dist, unitN[2] * dist];
        }
      }
    }

    return {
      m,
      n,
      is3D,
      vectors,
      items,
      rank,
      isIndependent,
      pivotCols,
      redundantIndices,
      redundantExpansions,
      detVal,
      volumeGeometryType,
      orthogonalResidue
    };
  }

  // --- THÔNG TIN THUYẾT MINH 3 BƯỚC SƯ PHẠM ---
  const PHASES_INFO = [
    {
      index: 0,
      title: "Bước 1: Độ mở Không gian & Thể tích/Diện tích Định thức",
      desc: "Quét dựng khối hình bình hành (2D) hoặc hình hộp (3D). Nếu hệ độc lập, khối có thể tích/diện tích thực khác 0: |det| > 0. Nếu phụ thuộc, khối suy biến về 0 trên đường thẳng hoặc mặt phẳng."
    },
    {
      index: 1,
      title: "Bước 2: Phép thử Tổ hợp Tuyến tính (Quy tắc nối đuôi tip-to-tail)",
      desc: "Dựng chuỗi nối đuôi đa giác kiểm tra phương trình c₁v₁ + c₂v₂ + ... = 0. Nếu hệ phụ thuộc, chuỗi khép kín trọn vẹn về gốc O. Nếu độc lập, luôn tồn tại thành phần trực giao thoát khỏi không gian."
    },
    {
      index: 2,
      title: "Bước 3: Phân tách Hệ trụ Độc lập & Vector Dư thừa",
      desc: "Lộ diện các vector trụ cột không gian (nét liền đậm, α = 1.0) và phân tách các vector phụ thuộc dư thừa (nét đứt mờ, α = 0.40) nằm trọn trong mặt phẳng/đường thẳng span."
    }
  ];

  // =========================================================================
  // BỘ ĐIỀU KHIỂN HOẠT CẢNH ĐỘC LẬP TUYẾN TÍNH (App.IndepAnimator)
  // =========================================================================
  const IndepAnimator = {
    _active: false,
    _paused: false,
    _currentPhase: 0,
    _phaseProgress: 0,
    _phaseTimer: null,
    _raf: null,
    _speed: 1.0,
    _analysis: null,
    _snapshot: null,
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

    // --- KHỞI ĐỘNG VÀ THIẾT LẬP ---
    start(selectedItems) {
      let items = selectedItems;
      if (!items || !items.length) {
        const container = document.getElementById("indepChecklist");
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

      const analysis = analyzeLinearIndependence(items);
      this._analysis = analysis;

      // Lưu snapshot trạng thái vector gốc của người dùng
      this._snapshot = (App.vectorList || []).map((v) => ({
        id: v.id,
        vec: [...(v.vec || [0, 0, 0])],
        visible: v.visible !== false,
        alpha: typeof v.alpha === "number" ? v.alpha : 1.0,
        colorCss: v.colorCss,
        colorHex: v.colorHex
      }));

      // Chuyển chế độ 2D / 3D nếu cần
      if (analysis.is3D && App.mode !== "3D") {
        if (typeof App.setMode === "function") App.setMode("3D");
        else if (typeof App.toggleMode === "function") App.toggleMode();
      }

      // Căn chỉnh góc nhìn Camera 3D lệch phương (x != y != z) để các vector không bị che lấp
      this._savedCamPos3D = null;
      if (window.Vec3D && Vec3D._camera && Vec3D._controls && App.mode === "3D") {
        if (Vec3D._resetAnimId) {
          cancelAnimationFrame(Vec3D._resetAnimId);
          Vec3D._resetAnimId = null;
        }
        this._savedCamPos3D = Vec3D._camera.position.clone();
        let maxReach = 3.0;
        for (const v of analysis.vectors) {
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
      const wrap = document.getElementById("indepAnimControls");
      if (wrap) wrap.style.display = "block";

      this._active = true;
      this._paused = false;
      this._currentPhase = 0;
      this._phaseProgress = 0;
      App._indepAnimActive = true;

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
      App._indepAnimActive = false;

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

      // Khôi phục vector snapshot và xóa override
      if (this._snapshot && Array.isArray(App.vectorList)) {
        for (const snap of this._snapshot) {
          const it = App.vectorList.find((v) => v.id === snap.id);
          if (it) {
            it.vec = [...snap.vec];
            it.visible = snap.visible;
            it.alpha = snap.alpha;
            it.colorCss = snap.colorCss;
            it.colorHex = snap.colorHex;
            delete it._indepAlpha;
            delete it._indepColorCss;
            delete it._indepIsPillar;
            delete it._indepIsRedundant;
          }
        }
      }
      this._snapshot = null;
      this._analysis = null;

      const wrap = document.getElementById("indepAnimControls");
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

      const baseDurations = [2400, 2800, 2200];
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

          // Tự động chuyển tiếp liên hoàn Bước 1 -> Bước 2 -> Bước 3 với khoảng nghỉ 380ms / speed
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

    // Áp dụng độ mờ và màu sắc trực quan lên các vector theo từng bước
    applyPhaseStyles(phase, progress) {
      if (!this._analysis || !Array.isArray(App.vectorList)) return;
      const an = this._analysis;

      for (let i = 0; i < an.items.length; i++) {
        const item = an.items[i];
        const vItem = App.vectorList.find((v) => v.id === item.id);
        if (!vItem) continue;

        const isPivot = an.pivotCols.includes(i);
        const isRedundant = an.redundantIndices.includes(i);

        if (phase === 0) {
          // Bước 1: Tất cả vector giữ màu sắc rõ ràng để tạo khối thể tích
          vItem._indepAlpha = 1.0;
          vItem._indepColorCss = isPivot ? "#0284c7" : "#f59e0b";
        } else if (phase === 1) {
          // Bước 2: Thử tổ hợp nối đuôi
          vItem._indepAlpha = isPivot ? 0.85 : 1.0;
          vItem._indepColorCss = isPivot ? "#0284c7" : "#10b981";
        } else if (phase === 2) {
          // Bước 3: Phân tách hệ trụ độc lập (alpha=1.0) và vector dư thừa (alpha=0.40)
          const p = smoothstep(progress);
          if (isPivot) {
            vItem._indepAlpha = 1.0;
            vItem._indepColorCss = "#0284c7";
            vItem._indepIsPillar = true;
          } else if (isRedundant) {
            vItem._indepAlpha = 1.0 - p * 0.60; // Hạ dần xuống 0.40
            vItem._indepColorCss = "#94a3b8"; // Nét xám mờ
            vItem._indepIsRedundant = true;
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

    // --- GIAO DIỆN HỘP ĐIỀU KHIỂN (#indepAnimControls) ---
    ensureControls() {
      let wrap = document.getElementById("indepAnimControls");
      if (wrap) return wrap;

      const host = document.getElementById("form-linear_independence");
      const out = document.getElementById("result_indep");
      if (!host) return null;

      wrap = document.createElement("div");
      wrap.id = "indepAnimControls";
      wrap.className = "basis-sidebar-anim-box";
      wrap.style.display = "none";
      wrap.style.marginTop = "10px";

      wrap.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted, #64748b);">Trực quan Độc lập tuyến tính</span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="basis-step-pill" id="indepStepCounter">Bước 1 / 3</span>
            <button type="button" id="btnIndepCloseAnim" class="basis-anim-close-btn" title="Đóng trực quan" style="background: transparent; border: none; cursor: pointer; color: var(--text-muted, #64748b); font-size: 13px; padding: 2px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px;">
              <i class="ph ph-x"></i>
            </button>
          </div>
        </div>

        <div class="coord-phase-pills" id="indepPhasePills">
          <button type="button" class="coord-phase-btn active" data-phase="0" title="Bước 1: Độ mở không gian & Thể tích">Bước 1</button>
          <button type="button" class="coord-phase-btn" data-phase="1" title="Bước 2: Phép thử nối đuôi tip-to-tail">Bước 2</button>
          <button type="button" class="coord-phase-btn" data-phase="2" title="Bước 3: Phân tách hệ trụ & Dư thừa">Bước 3</button>
        </div>

        <div class="basis-anim-btn-row">
          <button type="button" id="btnIndepPrev" class="basis-ctrl-btn" title="Bước trước">
            <i class="ph ph-skip-back"></i>
          </button>
          <button type="button" id="btnIndepPlay" class="basis-ctrl-btn primary" title="Phát / Tạm dừng">
            <i class="ph ph-play" id="iconIndepPlay"></i>
          </button>
          <button type="button" id="btnIndepNext" class="basis-ctrl-btn" title="Bước tiếp">
            <i class="ph ph-skip-forward"></i>
          </button>
          <button type="button" id="btnIndepReplay" class="basis-ctrl-btn" title="Phát lại từ đầu">
            <i class="ph ph-arrow-counter-clockwise"></i>
          </button>
        </div>

        <div class="hud-menu-slider-row basis-speed-slider-wrap" style="padding: 6px 0 2px; margin-top: 6px; border-top: 1px dashed var(--border-subtle, var(--border, #e2e8f0));">
          <div class="hud-menu-slider-header" style="font-size: 11.5px; margin-bottom: 2px;">
            <span class="hud-menu-item-text" style="color: var(--text-muted, #64748b); font-weight: 600;">Tốc độ phát</span>
            <span class="hud-menu-slider-val" id="indepSpeedValue">1.0×</span>
          </div>
          <input type="range" id="indepSpeedSlider" min="0.2" max="2.5" step="0.1" value="1.0" class="hud-range-slider" />
        </div>

        <div class="basis-step-explainer" id="indepStepExplainer">
          <div class="basis-step-title" id="indepStepTitle">Bước 1: Độ mở Không gian & Thể tích/Diện tích Định thức</div>
          <div class="basis-step-desc" id="indepStepDesc">Quét dựng khối hình bình hành (2D) hoặc hình hộp (3D) căng bởi các vector.</div>
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
      const btnClose = wrap.querySelector("#btnIndepCloseAnim");
      if (btnClose) btnClose.onclick = () => this.stop();

      const btnPlay = wrap.querySelector("#btnIndepPlay");
      if (btnPlay) btnPlay.onclick = () => this.togglePlay();

      const btnPrev = wrap.querySelector("#btnIndepPrev");
      if (btnPrev) btnPrev.onclick = () => this.prevPhase();

      const btnNext = wrap.querySelector("#btnIndepNext");
      if (btnNext) btnNext.onclick = () => this.nextPhase();

      const btnReplay = wrap.querySelector("#btnIndepReplay");
      if (btnReplay) btnReplay.onclick = () => this.replay();

      const speedSlider = wrap.querySelector("#indepSpeedSlider");
      if (speedSlider) {
        speedSlider.oninput = (e) => this.setSpeed(e.target.value);
      }

      const pills = wrap.querySelectorAll("#indepPhasePills .coord-phase-btn");
      pills.forEach((pBtn) => {
        pBtn.onclick = (e) => {
          const ph = parseInt(e.currentTarget.getAttribute("data-phase"), 10);
          if (!isNaN(ph)) this.goToPhase(ph);
        };
      });
    },

    updateSidebarUI() {
      const wrap = document.getElementById("indepAnimControls");
      if (!wrap) return;

      const stepCounter = wrap.querySelector("#indepStepCounter");
      if (stepCounter) stepCounter.textContent = `Bước ${this._currentPhase + 1} / 3`;

      // Cập nhật pills
      const pills = wrap.querySelectorAll("#indepPhasePills .coord-phase-btn");
      pills.forEach((pBtn, idx) => {
        pBtn.classList.toggle("active", idx === this._currentPhase);
      });

      // Cập nhật nút Play/Pause: Khi đang phát, nút chuyển màu đỏ và icon pause
      const btnPlay = wrap.querySelector("#btnIndepPlay");
      const iconPlay = wrap.querySelector("#iconIndepPlay");
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
      const speedVal = wrap.querySelector("#indepSpeedValue");
      if (speedVal) speedVal.textContent = `${this._speed.toFixed(1)}×`;

      // Cập nhật nội dung thuyết minh động
      const titleEl = wrap.querySelector("#indepStepTitle");
      const descEl = wrap.querySelector("#indepStepDesc");
      const an = this._analysis;

      if (titleEl && descEl) {
        const info = PHASES_INFO[this._currentPhase] || PHASES_INFO[0];
        titleEl.textContent = info.title;

        if (!an) {
          descEl.textContent = info.desc;
          return;
        }

        if (this._currentPhase === 0) {
          if (an.isIndependent) {
            descEl.innerHTML = `Các vector độc lập mở ra chiều không gian mới.<br><b>${an.volumeGeometryType === "parallelepiped_3d" ? "Thể tích" : "Diện tích"} |det| = ${an.detVal.toFixed(2)} &gt; 0</b>, chứng minh không có vector nào bị giam trong không gian các vector khác.`;
          } else {
            descEl.innerHTML = `Hệ vector phụ thuộc tuyến tính.<br><b>${an.volumeGeometryType === "parallelepiped_3d" ? "Thể tích" : "Diện tích"} bị ép dẹp về 0 (|det| = 0)</b>. Toàn bộ các vector bị giam trong ${an.rank === 1 ? "cùng một đường thẳng 1D" : "cùng một mặt phẳng 2D"}.`;
          }
        } else if (this._currentPhase === 1) {
          if (an.isIndependent) {
            descEl.innerHTML = `Mỗi vector mới đều sở hữu <b>thành phần trực giao v⟂ khác 0</b> thoát khỏi không gian sinh trước đó.<br>Đa giác chỉ có thể khép kín về gốc O khi và chỉ khi mọi hệ số c₁ = c₂ = ... = 0 (chỉ có nghiệm tầm thường).`;
          } else {
            const redIdx = an.redundantIndices[0];
            const redExp = an.redundantExpansions[redIdx];
            let relText = `v_${redIdx + 1}`;
            if (redExp && redExp.coeffs) {
              const terms = redExp.coeffs.map((cf, pIdx) => `${formatScalar(cf)}·v_${redExp.pivotCols[pIdx] + 1}`).join(" + ");
              relText = `v_${redIdx + 1} = ${terms}`;
            }
            descEl.innerHTML = `Tồn tại tổ hợp tuyến tính không tầm thường: <b>${relText}</b>.<br>Chuỗi nối đuôi đa giác (tip-to-tail) nối liên tiếp các vector thành phần <b>chạm khít hoàn hảo về ngọn vector phụ thuộc / gốc O</b>.`;
          }
        } else if (this._currentPhase === 2) {
          if (an.isIndependent) {
            descEl.innerHTML = `Khẳng định toàn bộ <b>${an.m} vector đều là các trụ cột độc lập</b> (nét liền đậm, α = 1.0).<br>Không có vector nào dư thừa; không gian sinh span đạt cực đại với số chiều dim = ${an.rank}.`;
          } else {
            descEl.innerHTML = `Tách bạch rõ ràng: <b>${an.rank} vector trụ độc lập</b> (nét liền đậm, α = 1.0) và <b>${an.redundantIndices.length} vector dư thừa</b> (nét đứt mờ, α = 0.40) nằm trọn trong span của hệ trụ.`;
          }
        }
      }
    },

    // =========================================================================
    // 2D CANVAS RENDERING HOOKS (viewer2D.js)
    // =========================================================================

    // 1. Kết xuất lớp nền không gian con (Subspace Pass)
    render2DSubspace(ctx, gridInfo) {
      if (!this._active || !gridInfo || App.mode !== "2D" || !this._analysis) return;
      const { cx, cy, px } = gridInfo;
      const an = this._analysis;
      const p = smoothstep(this._phaseProgress);

      const toScreen = (vx, vy) => ({
        x: cx + vx * px,
        y: cy - vy * px
      });

      if (this._currentPhase === 0) {
        // Bước 1: Quét hình bình hành diện tích định thức O -> v1 -> v1+v2 -> v2
        if (an.vectors.length >= 2) {
          const v1 = an.vectors[0];
          const v2 = an.vectors[1];
          const pO = toScreen(0, 0);
          const pV1 = toScreen(v1[0] * p, v1[1] * p);
          const pSum = toScreen((v1[0] + v2[0]) * p, (v1[1] + v2[1]) * p);
          const pV2 = toScreen(v2[0] * p, v2[1] * p);

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(pO.x, pO.y);
          ctx.lineTo(pV1.x, pV1.y);
          ctx.lineTo(pSum.x, pSum.y);
          ctx.lineTo(pV2.x, pV2.y);
          ctx.closePath();

          if (an.isIndependent) {
            ctx.fillStyle = "rgba(16, 185, 129, 0.18)";
            ctx.strokeStyle = "#10b981";
            ctx.lineWidth = 1.5;
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.fillStyle = "rgba(245, 158, 11, 0.18)";
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 1.5;
            ctx.fill();
            ctx.stroke();
          }
          ctx.restore();
        }
      } else if (this._currentPhase === 1) {
        // Bước 2: Nối đuôi đa giác tip-to-tail
        if (!an.isIndependent && an.redundantIndices.length > 0) {
          const redIdx = an.redundantIndices[0];
          const redExp = an.redundantExpansions[redIdx];
          if (redExp && redExp.coeffs) {
            let curr = [0, 0];
            ctx.save();
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);

            for (let k = 0; k < redExp.pivotCols.length; k++) {
              const pvIdx = redExp.pivotCols[k];
              const cf = redExp.coeffs[k];
              const pvVec = an.vectors[pvIdx];
              const next = [curr[0] + cf * pvVec[0] * p, curr[1] + cf * pvVec[1] * p];

              const sc1 = toScreen(curr[0], curr[1]);
              const sc2 = toScreen(next[0], next[1]);

              ctx.strokeStyle = k === 0 ? "#0284c7" : "#10b981";
              ctx.beginPath();
              ctx.moveTo(sc1.x, sc1.y);
              ctx.lineTo(sc2.x, sc2.y);
              ctx.stroke();

              // Vẽ nút tròn kết nối
              ctx.fillStyle = "#ffffff";
              ctx.beginPath();
              ctx.arc(sc2.x, sc2.y, 3, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();

              curr = next;
            }
            ctx.restore();
          }
        } else if (an.isIndependent && an.vectors.length >= 2) {
          // Thành phần trực giao v2 thoát khỏi span(v1)
          const v1 = an.vectors[0];
          const v2 = an.vectors[1];
          const u1Sq = v1[0] * v1[0] + v1[1] * v1[1];
          if (u1Sq > 1e-9) {
            const sc = (v2[0] * v1[0] + v2[1] * v1[1]) / u1Sq;
            const proj = [sc * v1[0], sc * v1[1]];
            const scProj = toScreen(proj[0], proj[1]);
            const scV2 = toScreen(v2[0], v2[1]);

            ctx.save();
            ctx.strokeStyle = "rgba(245, 158, 11, 0.75)";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(scProj.x, scProj.y);
            ctx.lineTo(scV2.x, scV2.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      } else if (this._currentPhase === 2) {
        // Bước 3: Kết tinh mặt phẳng / đường thẳng span
        ctx.save();
        if (an.rank === 1 && an.pivotCols.length > 0) {
          const pv = an.vectors[an.pivotCols[0]];
          const len = Math.hypot(pv[0], pv[1]);
          if (len > 1e-9) {
            const dirX = pv[0] / len;
            const dirY = pv[1] / len;
            const p1 = toScreen(-dirX * 30, -dirY * 30);
            const p2 = toScreen(dirX * 30, dirY * 30);
            ctx.strokeStyle = "rgba(2, 132, 199, 0.45)";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        } else if (an.rank >= 2) {
          ctx.fillStyle = "rgba(2, 132, 199, 0.08)";
          ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
        ctx.restore();
      }
    },

    // 2. Kết xuất lớp tiền cảnh chú thích hình học (Projections Pass)
    render2DProjections(ctx, gridInfo) {
      if (!this._active || !gridInfo || App.mode !== "2D" || !this._analysis) return;
      const { cx, cy, px } = gridInfo;
      const an = this._analysis;

      const toScreen = (vx, vy) => ({
        x: cx + vx * px,
        y: cy - vy * px
      });

      if (this._currentPhase === 0) {
        // Nhãn diện tích định thức
        if (an.vectors.length >= 2) {
          const v1 = an.vectors[0];
          const v2 = an.vectors[1];
          const midX = (v1[0] + v2[0]) * 0.45;
          const midY = (v1[1] + v2[1]) * 0.45;
          const scMid = toScreen(midX, midY);

          ctx.save();
          ctx.font = "bold 11px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const txt = an.isIndependent ? `Diện tích |det| = ${an.detVal.toFixed(2)}` : "Diện tích = 0 (Suy biến)";
          const w = ctx.measureText(txt).width + 12;

          ctx.fillStyle = an.isIndependent ? "rgba(16, 185, 129, 0.92)" : "rgba(245, 158, 11, 0.92)";
          ctx.beginPath();
          ctx.roundRect(scMid.x - w / 2, scMid.y - 10, w, 20, 4);
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.fillText(txt, scMid.x, scMid.y);
          ctx.restore();
        }
      } else if (this._currentPhase === 1) {
        // Nhãn đa giác nối đuôi tip-to-tail
        if (!an.isIndependent && an.redundantIndices.length > 0) {
          const redIdx = an.redundantIndices[0];
          const redV = an.vectors[redIdx];
          const scTip = toScreen(redV[0], redV[1]);

          ctx.save();
          ctx.font = "600 11px system-ui, sans-serif";
          ctx.fillStyle = "#10b981";
          ctx.fillText("Điểm chạm nối đuôi khép kín", scTip.x + 8, scTip.y - 8);
          ctx.restore();
        }
      } else if (this._currentPhase === 2) {
        // Nhãn phân tích tuyến tính cho vector dư thừa
        for (const redIdx of an.redundantIndices) {
          const redV = an.vectors[redIdx];
          const sc = toScreen(redV[0], redV[1]);
          const redExp = an.redundantExpansions[redIdx];

          let label = `v_${redIdx + 1} (dư thừa)`;
          if (redExp && redExp.coeffs) {
            const terms = redExp.coeffs.map((cf, pIdx) => `${formatScalar(cf)}·v_${redExp.pivotCols[pIdx] + 1}`).join(" + ");
            label = `v_${redIdx + 1} = ${terms}`;
          }

          ctx.save();
          ctx.font = "bold 11px system-ui, sans-serif";
          ctx.fillStyle = "#94a3b8";
          ctx.fillText(label, sc.x + 8, sc.y - 6);
          ctx.restore();
        }
      }
    },

    // =========================================================================
    // 3D THREE.JS RENDERING HOOK (viewer3D.js)
    // =========================================================================
    render3D(mathGroup) {
      if (!this._active || !mathGroup || App.mode !== "3D" || !this._analysis) return;
      if (!window.THREE) return;

      if (!this._threeGroup) {
        this._threeGroup = new THREE.Group();
        mathGroup.add(this._threeGroup);
      }

      // Xóa sạch children cũ trước khi dựng khung hình mới
      while (this._threeGroup.children.length > 0) {
        const obj = this._threeGroup.children[0];
        this._threeGroup.remove(obj);
        if (obj.geometry) obj.geometry.dispose?.();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m?.dispose?.());
        else obj.material?.dispose?.();
      }

      const an = this._analysis;
      const p = smoothstep(this._phaseProgress);

      if (this._currentPhase === 0) {
        // Bước 1: Quét khối hình hộp bình hành 8 đỉnh trong không gian 3D
        if (an.vectors.length >= 3) {
          const v1 = an.vectors[0].map((x) => x * p);
          const v2 = an.vectors[1].map((x) => x * p);
          const v3 = an.vectors[2].map((x) => x * p);

          const V = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(v1[0], v1[1], v1[2]),
            new THREE.Vector3(v2[0], v2[1], v2[2]),
            new THREE.Vector3(v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]),
            new THREE.Vector3(v3[0], v3[1], v3[2]),
            new THREE.Vector3(v1[0] + v3[0], v1[1] + v3[1], v1[2] + v3[2]),
            new THREE.Vector3(v2[0] + v3[0], v2[1] + v3[1], v2[2] + v3[2]),
            new THREE.Vector3(v1[0] + v2[0] + v3[0], v1[1] + v2[1] + v3[2], v1[2] + v2[2] + v3[2])
          ];

          // 6 mặt hình hộp (12 tam giác)
          const indices = [
            0, 1, 3, 0, 3, 2, // Đáy dưới
            4, 6, 7, 4, 7, 5, // Mặt trên
            0, 4, 5, 0, 5, 1, // Mặt trước
            2, 3, 7, 2, 7, 6, // Mặt sau
            0, 2, 6, 0, 6, 4, // Mặt trái
            1, 5, 7, 1, 7, 3  // Mặt phải
          ];

          const positions = [];
          for (let i = 0; i < indices.length; i++) {
            const pt = V[indices[i]];
            positions.push(pt.x, pt.y, pt.z);
          }

          const geom = new THREE.BufferGeometry();
          geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
          geom.computeVertexNormals();

          const mat = new THREE.MeshBasicMaterial({
            color: an.isIndependent ? 0x10b981 : 0xf59e0b,
            transparent: true,
            opacity: an.isIndependent ? 0.22 : 0.28,
            side: THREE.DoubleSide,
            depthWrite: false
          });

          const mesh = new THREE.Mesh(geom, mat);
          this._threeGroup.add(mesh);

          // Khung viền hình hộp
          const edgeGeom = new THREE.EdgesGeometry(geom);
          const edgeMat = new THREE.LineBasicMaterial({
            color: an.isIndependent ? 0x10b981 : 0xf59e0b,
            linewidth: 1.5
          });
          const wireframe = new THREE.LineSegments(edgeGeom, edgeMat);
          this._threeGroup.add(wireframe);
        } else if (an.vectors.length === 2) {
          // Hình bình hành 2 vector trong 3D
          const v1 = an.vectors[0].map((x) => x * p);
          const v2 = an.vectors[1].map((x) => x * p);
          const geom = new THREE.BufferGeometry();
          const pos = [
            0, 0, 0,
            v1[0], v1[1], v1[2],
            v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2],
            0, 0, 0,
            v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2],
            v2[0], v2[1], v2[2]
          ];
          geom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
          geom.computeVertexNormals();
          const mat = new THREE.MeshBasicMaterial({
            color: 0x0284c7,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide
          });
          this._threeGroup.add(new THREE.Mesh(geom, mat));
        }
      } else if (this._currentPhase === 1) {
        // Bước 2: Nối đuôi 3D hoặc trực giao
        if (!an.isIndependent && an.redundantIndices.length > 0) {
          const redIdx = an.redundantIndices[0];
          const redExp = an.redundantExpansions[redIdx];
          if (redExp && redExp.coeffs) {
            let curr = [0, 0, 0];
            for (let k = 0; k < redExp.pivotCols.length; k++) {
              const pvIdx = redExp.pivotCols[k];
              const cf = redExp.coeffs[k];
              const pv = an.vectors[pvIdx];
              const next = [
                curr[0] + cf * pv[0] * p,
                curr[1] + cf * pv[1] * p,
                curr[2] + cf * pv[2] * p
              ];

              const pts = [
                new THREE.Vector3(curr[0], curr[1], curr[2]),
                new THREE.Vector3(next[0], next[1], next[2])
              ];
              const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
              const lineMat = new THREE.LineDashedMaterial({
                color: k === 0 ? 0x0284c7 : 0x10b981,
                dashSize: 0.3,
                gapSize: 0.15
              });
              const line = new THREE.Line(lineGeom, lineMat);
              line.computeLineDistances();
              this._threeGroup.add(line);

              // Khối cầu tại mỗi khớp nối
              const sphGeom = new THREE.SphereGeometry(0.08, 12, 12);
              const sphMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
              const sph = new THREE.Mesh(sphGeom, sphMat);
              sph.position.set(next[0], next[1], next[2]);
              this._threeGroup.add(sph);

              curr = next;
            }
          }
        } else if (an.isIndependent && an.orthogonalResidue) {
          // Dựng vector trực giao v⟂ thoát khỏi mặt phẳng
          const res = an.orthogonalResidue;
          const rLen = norm(res);
          if (rLen > 1e-4) {
            const target = [res[0] * p, res[1] * p, res[2] * p];
            const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(target[0], target[1], target[2])];
            const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
            const lineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2.5 });
            this._threeGroup.add(new THREE.Line(lineGeom, lineMat));

            // Nón mũi tên
            const coneGeom = new THREE.ConeGeometry(0.12, 0.35, 12);
            const coneMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
            const cone = new THREE.Mesh(coneGeom, coneMat);
            cone.position.set(target[0], target[1], target[2]);
            const dir = new THREE.Vector3(res[0], res[1], res[2]).normalize();
            cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
            this._threeGroup.add(cone);
          }
        }
      } else if (this._currentPhase === 2) {
        // Bước 3: Mặt phẳng kết tinh không gian sinh
        if (an.rank === 2 && an.pivotCols.length >= 2) {
          const u = an.vectors[an.pivotCols[0]];
          const v = an.vectors[an.pivotCols[1]];
          const normVec = cross(u, v);
          const nLen = norm(normVec);
          if (nLen > 1e-6) {
            const planeGeom = new THREE.PlaneGeometry(16, 16);
            const planeMat = new THREE.MeshBasicMaterial({
              color: 0x0284c7,
              transparent: true,
              opacity: 0.12 * p,
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

  App.IndepAnimator = IndepAnimator;
})();
