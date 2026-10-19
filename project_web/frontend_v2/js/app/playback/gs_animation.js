// ==================================================================================
// GRAM - SCHMIDT ORTHOGONALIZATION 3-STEP PLAYBACK ENGINE (ACADEMIC ARCHITECTURE)
// Trực quan hóa bản chất Thuật toán Trực giao hóa Gram - Schmidt (2D Canvas & 3D Three.js)
// Kịch bản 3 bước liên hoàn chuẩn bản chất Đại số Tuyến tính:
//   Bước 1: Cố định Trục chuẩn đầu tiên u1 = v1 & Phép chiếu vuông góc p1 = proj_{u1}(v2)
//   Bước 2: Triệt tiêu Thành phần song song u2 = v2 - p1 & Mở rộng 3D u3 ⊥ span(u1, u2)
//   Bước 3: Chuẩn hóa về Cơ sở Trực chuẩn e_i = u_i / ||u_i|| trên Đường tròn / Mặt cầu đơn vị (R = 1)
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

  function scaleVec(v, s) {
    return [(v[0] || 0) * s, (v[1] || 0) * s, (v[2] || 0) * s];
  }

  function addVec(a, b) {
    return [(a[0] || 0) + (b[0] || 0), (a[1] || 0) + (b[1] || 0), (a[2] || 0) + (b[2] || 0)];
  }

  function subVec(a, b) {
    return [(a[0] || 0) - (b[0] || 0), (a[1] || 0) - (b[1] || 0), (a[2] || 0) - (b[2] || 0)];
  }

  function projVec(v, u) {
    const dUU = dot(u, u);
    if (dUU < 1e-9) return [0, 0, 0];
    const c = dot(v, u) / dUU;
    return scaleVec(u, c);
  }

  function normalizeVec(v) {
    const n = norm(v);
    if (n < 1e-9) return [0, 0, 0];
    return scaleVec(v, 1 / n);
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

  // --- THUẬT TOÁN TRỰC GIAO HÓA GRAM - SCHMIDT ĐẦY ĐỦ ---
  function computeGramSchmidtDetailed(items) {
    const vectors = items.map((it) => to3D(it.vec || it));
    const is3D = items.some((it) => {
      const v = it.vec || it;
      return v.length >= 3 && Math.abs(Number(v[2]) || 0) > 1e-4;
    }) || vectors.length >= 3;

    const m = vectors.length;
    const v1 = vectors[0] || [0, 0, 0];
    const v2 = vectors[1] || [0, 0, 0];
    const v3 = m >= 3 ? vectors[2] : null;

    // Bước 1: u1 = v1
    const u1 = [...v1];
    const nU1 = norm(u1);

    // Hình chiếu của v2 lên u1
    const p1 = projVec(v2, u1);

    // Bước 2: u2 = v2 - p1
    const u2 = subVec(v2, p1);
    const nU2 = norm(u2);

    // Bước 2b: Ở 3D nếu có v3
    let p31 = [0, 0, 0];
    let p32 = [0, 0, 0];
    let p12 = [0, 0, 0];
    let u3 = null;
    let nU3 = 0;

    if (v3) {
      p31 = projVec(v3, u1);
      p32 = projVec(v3, u2);
      p12 = addVec(p31, p32);
      u3 = subVec(v3, p12);
      nU3 = norm(u3);
    }

    // Bước 3: Chuẩn hóa thành e1, e2, (e3)
    const e1 = normalizeVec(u1);
    const e2 = normalizeVec(u2);
    const e3 = u3 ? normalizeVec(u3) : null;

    const dotV1V2 = dot(v1, v2);
    const dotU1U2 = dot(u1, u2);

    return {
      items,
      vectors,
      is3D,
      m,
      v1,
      v2,
      v3,
      u1,
      u2,
      u3,
      p1,
      p31,
      p32,
      p12,
      e1,
      e2,
      e3,
      nU1,
      nU2,
      nU3,
      dotV1V2,
      dotU1U2
    };
  }

  // Thông tin sư phạm từng bước
  const PHASES_INFO = [
    {
      title: "Bước 1: Trục chuẩn u₁ = v₁ và Hình chiếu vuông góc p₁",
      desc: "Cố định trục chuẩn u₁ = v₁ làm cơ sở định hướng ban đầu. Hạ đường gióng nét đứt vuông góc từ ngọn v₂ xuống đường thẳng chứa u₁, dựng vector hình chiếu p₁ = proj_{u₁}(v₂) dọc theo phương u₁ kèm ký hiệu góc vuông 90°."
    },
    {
      title: "Bước 2: Triệt tiêu Thành phần song song u₂ = v₂ - p₁",
      desc: "Trượt vector v₂ ngược chiều p₁ một đoạn đúng bằng hình chiếu: u₂ = v₂ - p₁. Toàn bộ thành phần cùng phương u₁ bị loại bỏ, dựng đứng u₂ vuông góc với u₁ tại gốc O (〈u₁, u₂〉 = 0)."
    },
    {
      title: "Bước 3: Chuẩn hóa về Cơ sở Trực chuẩn e_i trên Đường tròn / Mặt cầu đơn vị (R = 1)",
      desc: "Xuất hiện đường tròn đơn vị R = 1 (2D) hoặc mặt cầu đơn vị (3D). Co giãn mượt mà các vector trực giao u_i về đúng độ dài chuẩn: e_i = u_i / ‖u_i‖, hoàn thiện hệ trục trực chuẩn vuông vắn với ‖e_i‖ = 1."
    }
  ];

  const GSAnimator = {
    _active: false,
    _paused: false,
    _currentPhase: 0,
    _phaseProgress: 0.0,
    _speed: 1.0,
    _raf: null,
    _phaseTimer: null,
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

    getPhaseProgress() {
      return this._phaseProgress;
    },

    getAnalysis() {
      return this._analysis;
    },

    // --- KHỞI CHẠY HOẠT CẢNH ---
    start(customItems) {
      let items = customItems;
      if (!items || !items.length) {
        const container = document.getElementById("gsChecklist");
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
        if (Array.isArray(App.vectorList) && App.vectorList.length >= 2) {
          items = App.vectorList.slice(0, 3);
        }
      }

      if (!items || items.length < 2) {
        if (typeof App.showToast === "function") {
          App.showToast("Hãy chọn ít nhất 2 vector để trực giao hóa Gram - Schmidt!", "warning");
        }
        return false;
      }

      this.stop();

      const analysis = computeGramSchmidtDetailed(items);
      this._analysis = analysis;

      // Lưu snapshot trạng thái vector gốc
      this._snapshot = (App.vectorList || []).map((v) => ({
        id: v.id,
        vec: [...(v.vec || [0, 0, 0])],
        visible: v.visible !== false,
        alpha: typeof v.alpha === "number" ? v.alpha : 1.0,
        colorCss: v.colorCss,
        colorHex: v.colorHex
      }));

      // Chuyển sang 3D nếu có vector 3D
      if (analysis.is3D && App.mode !== "3D") {
        if (typeof App.setMode === "function") App.setMode("3D");
        else if (typeof App.toggleMode === "function") App.toggleMode();
      }

      // Căn chỉnh góc nhìn Camera 3D lệch phương (dist * 1.32, dist * 0.58, dist * 0.76)
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
      const wrap = document.getElementById("gsAnimControls");
      if (wrap) wrap.style.display = "block";

      this._active = true;
      this._paused = false;
      this._currentPhase = 0;
      this._phaseProgress = 0;
      App._gsAnimActive = true;

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
      App._gsAnimActive = false;

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

      // Khôi phục Camera 3D
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
            delete it._gsAlpha;
            delete it._gsColorCss;
            delete it._gsTargetVec;
          }
        }
      }
      this._snapshot = null;
      this._analysis = null;

      const wrap = document.getElementById("gsAnimControls");
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

      const baseDurations = [2400, 2800, 2400];
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

    // Áp dụng kiểu dáng và tọa độ nội suy lên các vector
    applyPhaseStyles(phase, progress) {
      if (!this._analysis || !Array.isArray(App.vectorList)) return;
      const an = this._analysis;
      const p = smoothstep(progress);

      for (let i = 0; i < an.items.length; i++) {
        const item = an.items[i];
        const vItem = App.vectorList.find((v) => v.id === item.id);
        if (!vItem) continue;

        if (i === 0) {
          // Vector v1 / u1 / e1: Màu xanh dương #0090ff
          vItem._gsColorCss = "#0090ff";
          vItem._gsAlpha = 1.0;
          if (phase === 0 || phase === 1) {
            vItem.vec = [...an.u1];
          } else if (phase === 2) {
            // Co giãn u1 -> e1
            vItem.vec = [
              (1 - p) * an.u1[0] + p * an.e1[0],
              (1 - p) * an.u1[1] + p * an.e1[1],
              (1 - p) * an.u1[2] + p * an.e1[2]
            ];
          }
        } else if (i === 1) {
          // Vector v2 / u2 / e2: Màu xanh ngọc #10b981
          if (phase === 0) {
            vItem._gsColorCss = "#f59e0b"; // Hổ phách khi đang chiếu
            vItem._gsAlpha = 0.95;
            vItem.vec = [...an.v2];
          } else if (phase === 1) {
            vItem._gsColorCss = "#10b981";
            vItem._gsAlpha = 1.0;
            // Trượt v2(t) = v2 - t * p1
            vItem.vec = [
              an.v2[0] - p * an.p1[0],
              an.v2[1] - p * an.p1[1],
              an.v2[2] - p * an.p1[2]
            ];
          } else if (phase === 2) {
            vItem._gsColorCss = "#10b981";
            vItem._gsAlpha = 1.0;
            // Co giãn u2 -> e2
            vItem.vec = [
              (1 - p) * an.u2[0] + p * an.e2[0],
              (1 - p) * an.u2[1] + p * an.e2[1],
              (1 - p) * an.u2[2] + p * an.e2[2]
            ];
          }
        } else if (i === 2 && an.v3) {
          // Vector v3 / u3 / e3: Màu tím #8b5cf6
          if (phase === 0) {
            vItem._gsColorCss = "#8b5cf6";
            vItem._gsAlpha = 0.65;
            vItem.vec = [...an.v3];
          } else if (phase === 1) {
            vItem._gsColorCss = "#8b5cf6";
            vItem._gsAlpha = 1.0;
            // Trượt v3(t) = v3 - t * p12
            vItem.vec = [
              an.v3[0] - p * an.p12[0],
              an.v3[1] - p * an.p12[1],
              an.v3[2] - p * an.p12[2]
            ];
          } else if (phase === 2 && an.e3) {
            vItem._gsColorCss = "#8b5cf6";
            vItem._gsAlpha = 1.0;
            // Co giãn u3 -> e3
            vItem.vec = [
              (1 - p) * an.u3[0] + p * an.e3[0],
              (1 - p) * an.u3[1] + p * an.e3[1],
              (1 - p) * an.u3[2] + p * an.e3[2]
            ];
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

    // --- GIAO DIỆN HỘP ĐIỀU KHIỂN (#gsAnimControls) ---
    ensureControls() {
      let wrap = document.getElementById("gsAnimControls");
      if (wrap) return wrap;

      const host = document.getElementById("form-topic4_gram_schmidt");
      const out = document.getElementById("result_gs_info");
      if (!host) return null;

      wrap = document.createElement("div");
      wrap.id = "gsAnimControls";
      wrap.className = "basis-sidebar-anim-box";
      wrap.style.display = "none";
      wrap.style.marginTop = "10px";

      wrap.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted, #64748b);">Trực quan Gram - Schmidt</span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="basis-step-pill" id="gsStepCounter">Bước 1 / 3</span>
            <button type="button" id="btnGSCloseAnim" class="basis-anim-close-btn" title="Đóng trực quan" style="background: transparent; border: none; cursor: pointer; color: var(--text-muted, #64748b); font-size: 13px; padding: 2px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px;">
              <i class="ph ph-x"></i>
            </button>
          </div>
        </div>

        <div class="coord-phase-pills" id="gsPhasePills">
          <button type="button" class="coord-phase-btn active" data-phase="0" title="Bước 1: Trục chuẩn u₁ và Hình chiếu p₁">Bước 1</button>
          <button type="button" class="coord-phase-btn" data-phase="1" title="Bước 2: Triệt tiêu song song u₂ ⊥ u₁">Bước 2</button>
          <button type="button" class="coord-phase-btn" data-phase="2" title="Bước 3: Chuẩn hóa trực chuẩn e_i (R = 1)">Bước 3</button>
        </div>

        <div class="basis-anim-btn-row">
          <button type="button" id="btnGSPrev" class="basis-ctrl-btn" title="Bước trước">
            <i class="ph ph-skip-back"></i>
          </button>
          <button type="button" id="btnGSPlay" class="basis-ctrl-btn primary" title="Phát / Tạm dừng">
            <i class="ph ph-play" id="iconGSPlay"></i>
          </button>
          <button type="button" id="btnGSNext" class="basis-ctrl-btn" title="Bước tiếp">
            <i class="ph ph-skip-forward"></i>
          </button>
          <button type="button" id="btnGSReplay" class="basis-ctrl-btn" title="Phát lại từ đầu">
            <i class="ph ph-arrow-counter-clockwise"></i>
          </button>
        </div>

        <div class="hud-menu-slider-row basis-speed-slider-wrap" style="padding: 6px 0 2px; margin-top: 6px; border-top: 1px dashed var(--border-subtle, var(--border, #e2e8f0));">
          <div class="hud-menu-slider-header" style="font-size: 11.5px; margin-bottom: 2px;">
            <span class="hud-menu-item-text" style="color: var(--text-muted, #64748b); font-weight: 600;">Tốc độ phát</span>
            <span class="hud-menu-slider-val" id="gsSpeedValue">1.0×</span>
          </div>
          <input type="range" id="gsSpeedSlider" min="0.2" max="2.5" step="0.1" value="1.0" class="hud-range-slider" />
        </div>

        <div class="basis-step-explainer" id="gsStepExplainer">
          <div class="basis-step-title" id="gsStepTitle">Bước 1: Trục chuẩn u₁ và Hình chiếu p₁</div>
          <div class="basis-step-desc" id="gsStepDesc">Đang chuẩn bị hoạt cảnh...</div>
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
      const btnClose = wrap.querySelector("#btnGSCloseAnim");
      if (btnClose) btnClose.onclick = () => this.stop();

      const btnPlay = wrap.querySelector("#btnGSPlay");
      if (btnPlay) btnPlay.onclick = () => this.togglePlay();

      const btnPrev = wrap.querySelector("#btnGSPrev");
      if (btnPrev) btnPrev.onclick = () => this.prevPhase();

      const btnNext = wrap.querySelector("#btnGSNext");
      if (btnNext) btnNext.onclick = () => this.nextPhase();

      const btnReplay = wrap.querySelector("#btnGSReplay");
      if (btnReplay) btnReplay.onclick = () => this.replay();

      const speedSlider = wrap.querySelector("#gsSpeedSlider");
      if (speedSlider) {
        speedSlider.oninput = (e) => this.setSpeed(e.target.value);
      }

      const pills = wrap.querySelectorAll("#gsPhasePills .coord-phase-btn");
      pills.forEach((pBtn) => {
        pBtn.onclick = (e) => {
          const ph = parseInt(e.currentTarget.getAttribute("data-phase"), 10);
          if (!isNaN(ph)) this.goToPhase(ph);
        };
      });
    },

    updateSidebarUI() {
      const wrap = document.getElementById("gsAnimControls");
      if (!wrap) return;

      const stepCounter = wrap.querySelector("#gsStepCounter");
      if (stepCounter) stepCounter.textContent = `Bước ${this._currentPhase + 1} / 3`;

      // Cập nhật pills
      const pills = wrap.querySelectorAll("#gsPhasePills .coord-phase-btn");
      pills.forEach((pBtn, idx) => {
        pBtn.classList.toggle("active", idx === this._currentPhase);
      });

      // Cập nhật nút Play/Pause
      const btnPlay = wrap.querySelector("#btnGSPlay");
      const iconPlay = wrap.querySelector("#iconGSPlay");
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
      const speedVal = wrap.querySelector("#gsSpeedValue");
      if (speedVal) speedVal.textContent = `${this._speed.toFixed(1)}×`;

      // Cập nhật nội dung thuyết minh động
      const titleEl = wrap.querySelector("#gsStepTitle");
      const descEl = wrap.querySelector("#gsStepDesc");
      const an = this._analysis;

      if (titleEl && descEl) {
        const info = PHASES_INFO[this._currentPhase] || PHASES_INFO[0];
        titleEl.textContent = info.title;

        if (!an) {
          descEl.textContent = info.desc;
          return;
        }

        if (this._currentPhase === 0) {
          const coeff = an.nU1 > 1e-4 ? (an.dotV1V2 / (an.nU1 * an.nU1)).toFixed(2) : "0";
          descEl.innerHTML = `Giữ <b>u₁ = v₁ = [${an.u1.slice(0, an.is3D ? 3 : 2).map((x) => x.toFixed(1)).join(", ")}]</b> làm trục chuẩn.<br>Hạ hình chiếu vuông góc từ ngọn v₂: <b>p₁ = ${coeff}·u₁</b> (đường nét đứt và ký hiệu góc vuông 90° tại điểm chiếu).`;
        } else if (this._currentPhase === 1) {
          const checkDot = Math.abs(an.dotU1U2).toFixed(4);
          if (an.v3) {
            descEl.innerHTML = `Triệt tiêu thành phần song song: <b>u₂ = v₂ - p₁</b> vuông góc u₁ tại gốc O.<br>Mở rộng 3D: Dựng mặt phẳng span(u₁, u₂), hạ hình chiếu p₁₂ của v₃ xuống mặt phẳng rồi rút <b>u₃ = v₃ - p₁₂ ⊥ span(u₁, u₂)</b>.`;
          } else {
            descEl.innerHTML = `Trượt v₂ ngược chiều p₁: <b>u₂ = v₂ - p₁ = [${an.u2.slice(0, 2).map((x) => x.toFixed(1)).join(", ")}]</b>.<br>Kiểm tra trực giao: <b>〈u₁, u₂〉 = ${checkDot} ≈ 0</b> (ký hiệu góc vuông 90° tại gốc O).`;
          }
        } else if (this._currentPhase === 2) {
          if (an.is3D && an.e3) {
            descEl.innerHTML = `Xuất hiện mặt cầu đơn vị R = 1. Co giãn 3 vector trực giao về đúng độ dài 1:<br><b>e₁ = u₁/‖u₁‖, e₂ = u₂/‖u₂‖, e₃ = u₃/‖u₃‖</b>, tạo thành khối hộp lập phương đơn vị 1 × 1 × 1.`;
          } else {
            descEl.innerHTML = `Xuất hiện đường tròn đơn vị R = 1. Co giãn 2 vector trực giao về đúng độ dài 1:<br><b>e₁ = [${an.e1.slice(0, 2).map((x) => x.toFixed(2)).join(", ")}], e₂ = [${an.e2.slice(0, 2).map((x) => x.toFixed(2)).join(", ")}]</b>, tạo thành ô đơn vị vuông vắn 1 × 1.`;
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

      ctx.save();

      if (this._currentPhase === 0) {
        // Bước 1: Trục chuẩn u1 kéo dài nét đứt mỏng xuyên qua gốc O
        if (an.nU1 > 1e-4) {
          const dirX = an.u1[0] / an.nU1;
          const dirY = an.u1[1] / an.nU1;
          const extent = 20;
          const pStart = toScreen(-dirX * extent, -dirY * extent);
          const pEnd = toScreen(dirX * extent, dirY * extent);

          ctx.beginPath();
          ctx.strokeStyle = "rgba(0, 144, 255, 0.25)";
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
          ctx.moveTo(pStart.x, pStart.y);
          ctx.lineTo(pEnd.x, pEnd.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else if (this._currentPhase === 1) {
        // Bước 2: Bóng mờ của v2 gốc ban đầu
        const pO = toScreen(0, 0);
        const pV2 = toScreen(an.v2[0], an.v2[1]);
        ctx.beginPath();
        ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.moveTo(pO.x, pO.y);
        ctx.lineTo(pV2.x, pV2.y);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (this._currentPhase === 2) {
        // Bước 3: Đường tròn đơn vị R = 1.0 mờ
        ctx.beginPath();
        ctx.arc(cx, cy, 1.0 * px, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(2, 132, 199, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ô đơn vị diện tích 1 x 1 hình bình hành (u1(t), u2(t))
        const curE1 = [
          (1 - p) * an.u1[0] + p * an.e1[0],
          (1 - p) * an.u1[1] + p * an.e1[1]
        ];
        const curE2 = [
          (1 - p) * an.u2[0] + p * an.e2[0],
          (1 - p) * an.u2[1] + p * an.e2[1]
        ];

        const pO = toScreen(0, 0);
        const pE1 = toScreen(curE1[0], curE1[1]);
        const pSum = toScreen(curE1[0] + curE2[0], curE1[1] + curE2[1]);
        const pE2 = toScreen(curE2[0], curE2[1]);

        ctx.beginPath();
        ctx.moveTo(pO.x, pO.y);
        ctx.lineTo(pE1.x, pE1.y);
        ctx.lineTo(pSum.x, pSum.y);
        ctx.lineTo(pE2.x, pE2.y);
        ctx.closePath();
        ctx.fillStyle = "rgba(16, 185, 129, 0.16)";
        ctx.fill();
        ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.restore();
    },

    // 2. Kết xuất lớp tiền cảnh hình chiếu & góc vuông (Projections Pass)
    render2DProjections(ctx, gridInfo) {
      if (!this._active || !gridInfo || App.mode !== "2D" || !this._analysis) return;
      const { cx, cy, px } = gridInfo;
      const an = this._analysis;
      const p = smoothstep(this._phaseProgress);

      const toScreen = (vx, vy) => ({
        x: cx + vx * px,
        y: cy - vy * px
      });

      ctx.save();

      // Hàm vẽ ký hiệu góc vuông 90 độ chính xác tại đỉnh P theo 2 hướng đơn vị dir1, dir2
      const drawSquareAngleMarker = (ptP, d1, d2, size = 12, color = "#10b981") => {
        const len1 = Math.hypot(d1[0], d1[1]);
        const len2 = Math.hypot(d2[0], d2[1]);
        if (len1 < 1e-4 || len2 < 1e-4) return;

        const u1x = (d1[0] / len1) * size;
        const u1y = (-d1[1] / len1) * size; // Lật trục Y Canvas
        const u2x = (d2[0] / len2) * size;
        const u2y = (-d2[1] / len2) * size;

        const pt1 = { x: ptP.x + u1x, y: ptP.y + u1y };
        const ptCorner = { x: ptP.x + u1x + u2x, y: ptP.y + u1y + u2y };
        const pt2 = { x: ptP.x + u2x, y: ptP.y + u2y };

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(ptCorner.x, ptCorner.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.stroke();

        // Chấm nhỏ ở tâm góc vuông
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(ptP.x + 0.5 * (u1x + u2x), ptP.y + 0.5 * (u1y + u2y), 1.5, 0, Math.PI * 2);
        ctx.fill();
      };

      if (this._currentPhase === 0) {
        // Bước 1: Đường gióng vuông góc từ ngọn v2 xuống điểm chiếu p1
        const ptV2 = toScreen(an.v2[0], an.v2[1]);
        const curP1 = [an.p1[0] * p, an.p1[1] * p];
        const ptP1 = toScreen(curP1[0], curP1[1]);
        const ptO = toScreen(0, 0);

        // Vector hình chiếu p1 màu hổ phách dọc theo u1
        if (p > 0.05) {
          ctx.beginPath();
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 3.0;
          ctx.moveTo(ptO.x, ptO.y);
          ctx.lineTo(ptP1.x, ptP1.y);
          ctx.stroke();

          // Mũi tên cho p1
          const headLen = 8;
          const ang = Math.atan2(ptP1.y - ptO.y, ptP1.x - ptO.x);
          ctx.fillStyle = "#f59e0b";
          ctx.beginPath();
          ctx.moveTo(ptP1.x, ptP1.y);
          ctx.lineTo(ptP1.x - headLen * Math.cos(ang - Math.PI / 6), ptP1.y - headLen * Math.sin(ang - Math.PI / 6));
          ctx.lineTo(ptP1.x - headLen * Math.cos(ang + Math.PI / 6), ptP1.y - headLen * Math.sin(ang + Math.PI / 6));
          ctx.closePath();
          ctx.fill();
        }

        // Đường gióng nét đứt vuông góc
        ctx.beginPath();
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.moveTo(ptV2.x, ptV2.y);
        ctx.lineTo(ptP1.x, ptP1.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Chấm điểm chiếu
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.arc(ptP1.x, ptP1.y, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Nhãn điểm chiếu
        ctx.font = "600 11px system-ui, sans-serif";
        ctx.fillStyle = "#f59e0b";
        ctx.fillText("p₁ = proj(v₂)", ptP1.x + 8, ptP1.y + 12);

        // Ký hiệu góc vuông 90 độ tại p1
        if (p >= 0.85 && an.nU1 > 1e-4) {
          const dirU1 = [an.u1[0], an.u1[1]];
          const dirPerp = [an.v2[0] - an.p1[0], an.v2[1] - an.p1[1]];
          drawSquareAngleMarker(ptP1, dirU1, dirPerp, 12, "#f59e0b");
        }
      } else if (this._currentPhase === 1) {
        // Bước 2: Khi v2 dựng thẳng thành u2 vuông góc u1, vẽ góc vuông 90 độ tại gốc O
        if (p >= 0.7) {
          const ptO = toScreen(0, 0);
          const dir1 = [an.u1[0], an.u1[1]];
          const dir2 = [an.u2[0], an.u2[1]];
          drawSquareAngleMarker(ptO, dir1, dir2, 14, "#10b981");

          ctx.font = "700 11px system-ui, sans-serif";
          ctx.fillStyle = "#10b981";
          ctx.fillText("u₁ ⊥ u₂ (90°)", ptO.x + 18, ptO.y - 18);
        }
      } else if (this._currentPhase === 2) {
        // Bước 3: Góc vuông tại gốc O và nhãn trực chuẩn
        const ptO = toScreen(0, 0);
        const dir1 = [an.e1[0], an.e1[1]];
        const dir2 = [an.e2[0], an.e2[1]];
        drawSquareAngleMarker(ptO, dir1, dir2, 14, "#10b981");

        ctx.font = "700 11px system-ui, sans-serif";
        ctx.fillStyle = "#0284c7";
        ctx.fillText("‖e₁‖ = 1", cx + an.e1[0] * px * 0.5 + 8, cy - an.e1[1] * px * 0.5 - 6);
        ctx.fillStyle = "#10b981";
        ctx.fillText("‖e₂‖ = 1", cx + an.e2[0] * px * 0.5 + 8, cy - an.e2[1] * px * 0.5 - 6);
      }

      ctx.restore();
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
      const u = (window.Vec3D && Vec3D.S3D && Vec3D.S3D.unitsPerWorld) || 1;

      // Hàm phụ tạo ký hiệu góc vuông 3D (3 đoạn thẳng tạo thành góc vuông + khối cầu nhỏ)
      const add3DRightAngleMarker = (ptP, dir1, dir2, size = 0.35, colorHex = 0x10b981) => {
        const len1 = norm(dir1);
        const len2 = norm(dir2);
        if (len1 < 1e-4 || len2 < 1e-4) return;

        const u1 = scaleVec(dir1, (size * u) / len1);
        const u2 = scaleVec(dir2, (size * u) / len2);

        const pA = new THREE.Vector3((ptP[0] + u1[0]) * u, (ptP[1] + u1[1]) * u, (ptP[2] + u1[2]) * u);
        const pCorner = new THREE.Vector3((ptP[0] + u1[0] + u2[0]) * u, (ptP[1] + u1[1] + u2[1]) * u, (ptP[2] + u1[2] + u2[2]) * u);
        const pB = new THREE.Vector3((ptP[0] + u2[0]) * u, (ptP[1] + u2[1]) * u, (ptP[2] + u2[2]) * u);

        const pts = [pA, pCorner, pB];
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 2 });
        this._threeGroup.add(new THREE.Line(geom, mat));

        // Khối cầu nhỏ ở tâm góc vuông
        const dotPt = new THREE.Vector3(
          (ptP[0] + 0.5 * (u1[0] + u2[0])) * u,
          (ptP[1] + 0.5 * (u1[1] + u2[1])) * u,
          (ptP[2] + 0.5 * (u1[2] + u2[2])) * u
        );
        const sphGeom = new THREE.SphereGeometry(0.04 * u, 8, 8);
        const sphMat = new THREE.MeshBasicMaterial({ color: colorHex });
        const sphMesh = new THREE.Mesh(sphGeom, sphMat);
        sphMesh.position.copy(dotPt);
        this._threeGroup.add(sphMesh);
      };

      if (this._currentPhase === 0) {
        // Bước 1: Đường gióng vuông góc 3D từ v2 xuống p1 và vector p1
        const ptV2 = an.v2;
        const curP1 = scaleVec(an.p1, p);

        // Vector p1 màu hổ phách
        const ptsP1 = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(curP1[0] * u, curP1[1] * u, curP1[2] * u)];
        const lineP1Geom = new THREE.BufferGeometry().setFromPoints(ptsP1);
        const lineP1Mat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 3 });
        this._threeGroup.add(new THREE.Line(lineP1Geom, lineP1Mat));

        // Đường gióng nét đứt từ v2 xuống điểm chiếu
        const ptsDrop = [
          new THREE.Vector3(ptV2[0] * u, ptV2[1] * u, ptV2[2] * u),
          new THREE.Vector3(curP1[0] * u, curP1[1] * u, curP1[2] * u)
        ];
        const lineDropGeom = new THREE.BufferGeometry().setFromPoints(ptsDrop);
        const lineDropMat = new THREE.LineDashedMaterial({
          color: 0xf59e0b,
          dashSize: 0.3 * u,
          gapSize: 0.15 * u
        });
        const dropLine = new THREE.Line(lineDropGeom, lineDropMat);
        dropLine.computeLineDistances();
        this._threeGroup.add(dropLine);

        // Ký hiệu góc vuông 90 độ tại p1
        if (p >= 0.85 && an.nU1 > 1e-4) {
          const dirU1 = an.u1;
          const dirPerp = subVec(an.v2, an.p1);
          add3DRightAngleMarker(an.p1, dirU1, dirPerp, 0.4, 0xf59e0b);
        }
      } else if (this._currentPhase === 1) {
        // Bước 2: Ký hiệu góc vuông tại gốc u1 ⊥ u2
        if (p >= 0.6) {
          add3DRightAngleMarker([0, 0, 0], an.u1, an.u2, 0.45, 0x10b981);
        }

        // Nếu có vector thứ ba v3 trong 3D:
        if (an.v3 && an.u3) {
          // Mặt phẳng trực giao span(u1, u2)
          const normVec = cross(an.u1, an.u2);
          const nLen = norm(normVec);
          if (nLen > 1e-4) {
            const planeGeom = new THREE.PlaneGeometry(16 * u, 16 * u);
            const planeMat = new THREE.MeshBasicMaterial({
              color: 0x10b981,
              transparent: true,
              opacity: 0.18 * p,
              side: THREE.DoubleSide,
              depthWrite: false
            });
            const planeMesh = new THREE.Mesh(planeGeom, planeMat);
            const normal = new THREE.Vector3(normVec[0] / nLen, normVec[1] / nLen, normVec[2] / nLen);
            planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
            this._threeGroup.add(planeMesh);
          }

          // Đường gióng từ v3 xuống p12 trên mặt phẳng
          const curP12 = scaleVec(an.p12, p);
          const ptsDrop3 = [
            new THREE.Vector3(an.v3[0] * u, an.v3[1] * u, an.v3[2] * u),
            new THREE.Vector3(curP12[0] * u, curP12[1] * u, curP12[2] * u)
          ];
          const lineDropGeom3 = new THREE.BufferGeometry().setFromPoints(ptsDrop3);
          const lineDropMat3 = new THREE.LineDashedMaterial({
            color: 0x8b5cf6,
            dashSize: 0.3 * u,
            gapSize: 0.15 * u
          });
          const dropLine3 = new THREE.Line(lineDropGeom3, lineDropMat3);
          dropLine3.computeLineDistances();
          this._threeGroup.add(dropLine3);

          if (p >= 0.85) {
            add3DRightAngleMarker([0, 0, 0], an.u1, an.u3, 0.45, 0x8b5cf6);
            add3DRightAngleMarker([0, 0, 0], an.u2, an.u3, 0.45, 0x8b5cf6);
          }
        }
      } else if (this._currentPhase === 2) {
        // Bước 3: Mặt cầu đơn vị R = 1.0
        const sphereGeom = new THREE.SphereGeometry(1.0 * u, 24, 24);
        const sphereMat = new THREE.MeshBasicMaterial({
          color: 0x0284c7,
          wireframe: true,
          transparent: true,
          opacity: 0.22,
          depthWrite: false
        });
        const sphereMesh = new THREE.Mesh(sphereGeom, sphereMat);
        this._threeGroup.add(sphereMesh);

        // Khối hình hộp đơn vị 1x1x1 nếu có 3 vector, hoặc hình bình hành nếu có 2 vector
        if (an.v3 && an.e3) {
          const curE1 = [
            (1 - p) * an.u1[0] + p * an.e1[0],
            (1 - p) * an.u1[1] + p * an.e1[1],
            (1 - p) * an.u1[2] + p * an.e1[2]
          ];
          const curE2 = [
            (1 - p) * an.u2[0] + p * an.e2[0],
            (1 - p) * an.u2[1] + p * an.e2[1],
            (1 - p) * an.u2[2] + p * an.e2[2]
          ];
          const curE3 = [
            (1 - p) * an.u3[0] + p * an.e3[0],
            (1 - p) * an.u3[1] + p * an.e3[1],
            (1 - p) * an.u3[2] + p * an.e3[2]
          ];

          const V = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(curE1[0] * u, curE1[1] * u, curE1[2] * u),
            new THREE.Vector3(curE2[0] * u, curE2[1] * u, curE2[2] * u),
            new THREE.Vector3((curE1[0] + curE2[0]) * u, (curE1[1] + curE2[1]) * u, (curE1[2] + curE2[2]) * u),
            new THREE.Vector3(curE3[0] * u, curE3[1] * u, curE3[2] * u),
            new THREE.Vector3((curE1[0] + curE3[0]) * u, (curE1[1] + curE3[1]) * u, (curE1[2] + curE3[2]) * u),
            new THREE.Vector3((curE2[0] + curE3[0]) * u, (curE2[1] + curE3[1]) * u, (curE2[2] + curE3[2]) * u),
            new THREE.Vector3((curE1[0] + curE2[0] + curE3[0]) * u, (curE1[1] + curE2[1] + curE3[2]) * u, (curE1[2] + curE2[2] + curE3[2]) * u)
          ];

          const indices = [
            0, 1, 3, 0, 3, 2,
            4, 6, 7, 4, 7, 5,
            0, 4, 5, 0, 5, 1,
            2, 3, 7, 2, 7, 6,
            0, 2, 6, 0, 6, 4,
            1, 5, 7, 1, 7, 3
          ];

          const positions = [];
          for (let i = 0; i < indices.length; i++) {
            const pt = V[indices[i]];
            positions.push(pt.x, pt.y, pt.z);
          }

          const boxGeom = new THREE.BufferGeometry();
          boxGeom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
          boxGeom.computeVertexNormals();

          const boxMat = new THREE.MeshBasicMaterial({
            color: 0x10b981,
            transparent: true,
            opacity: 0.20,
            side: THREE.DoubleSide,
            depthWrite: false
          });
          this._threeGroup.add(new THREE.Mesh(boxGeom, boxMat));

          const edgeGeom = new THREE.EdgesGeometry(boxGeom);
          const edgeMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 1.5 });
          this._threeGroup.add(new THREE.LineSegments(edgeGeom, edgeMat));

          add3DRightAngleMarker([0, 0, 0], an.e1, an.e2, 0.45, 0x10b981);
          add3DRightAngleMarker([0, 0, 0], an.e1, an.e3, 0.45, 0x8b5cf6);
          add3DRightAngleMarker([0, 0, 0], an.e2, an.e3, 0.45, 0x8b5cf6);
        } else {
          // 2 vector trong 3D: Mặt phẳng đơn vị
          add3DRightAngleMarker([0, 0, 0], an.e1, an.e2, 0.45, 0x10b981);
        }
      }
    }
  };

  App.GSAnimator = GSAnimator;
  App.computeGramSchmidtDetailed = computeGramSchmidtDetailed;
})();
