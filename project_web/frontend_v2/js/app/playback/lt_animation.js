// ==================================================================================
// LINEAR TRANSFORMATION 3-STEP PLAYBACK ENGINE (ACADEMIC ARCHITECTURE)
// Trực quan hóa bản chất Ánh xạ tuyến tính, Hạt nhân Ker(T) & Không gian ảnh Im(T)
// Hỗ trợ đồng bộ cả 2D Canvas (ma trận 2x2) và 3D Three.js (ma trận 3x3)
// Kịch bản 3 bước liên hoàn chuẩn bản chất Đại số Tuyến tính:
//   Bước 1: Ánh xạ Cơ sở chuẩn e_j -> T(e_j) sinh ra các Cột của Ma trận A
//   Bước 2: Sự sụp đổ của Hạt nhân Ker(T) = {x | Ax = 0} về Gốc tọa độ O
//   Bước 3: Kết tinh Không gian ảnh Im(T) & Định lý Hạng - Số khuyết
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

  function formatScalarLatex(val) {
    if (!Number.isFinite(val) || Math.abs(val) < 1e-4) return "0";
    const sign = val < 0 ? "-" : "";
    const abs = Math.abs(val);
    if (Math.abs(abs - Math.round(abs)) < 1e-3) return sign + String(Math.round(abs));
    for (let den = 2; den <= 16; den++) {
      const num = Math.round(abs * den);
      if (Math.abs(abs - num / den) < 1e-3) {
        return `${sign}\\frac{${num}}{${den}}`;
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

  // --- THUẬT TOÁN ĐẠI SỐ TUYẾN TÍNH PHÂN TÍCH ÁNH XẠ TUYẾN TÍNH ---
  function analyzeLinearTransformation(rawValues, n) {
    const dim = n === 3 ? 3 : 2;
    const matrix = [];
    for (let i = 0; i < dim; i++) {
      matrix[i] = [];
      for (let j = 0; j < dim; j++) {
        matrix[i][j] = Number(rawValues?.[i]?.[j] ?? 0);
      }
    }

    // 1. Tính định thức det(A)
    let det = 0;
    if (dim === 2) {
      det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    } else {
      det =
        matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
        matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
        matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);
    }

    // 2. Tính vết ma trận trace(A)
    let trace = 0;
    for (let i = 0; i < dim; i++) trace += matrix[i][i];

    // 3. Cơ sở chính tắc ban đầu {e_j} và các cột ảnh T(e_j) = A e_j
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

    // 4. Khử Gauss - Jordan tìm RREF, hạng (rank) và số khuyết (nullity)
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

    // 5. Cơ sở Không gian Hạt nhân Ker(T) = {x | Ax = 0}
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

    // 6. Cơ sở Không gian Ảnh Im(T) = span{cols(A)}
    const imBasis = pivotCols.map((c) => columns[c]);

    // 7. Sinh tập điểm mẫu trên Hạt nhân Ker(T) phục vụ hoạt cảnh sụp đổ ở Bước 2
    const sampleKerPoints = [];
    if (nullity === 1 && kerBasis.length >= 1) {
      const k = kerBasis[0];
      const kLen = norm(to3D(k));
      if (kLen > 1e-6) {
        const u = k.map((coord) => coord / kLen);
        const steps = [-3.0, -2.0, -1.0, 1.0, 2.0, 3.0];
        steps.forEach((s) => {
          sampleKerPoints.push(u.map((c) => c * s));
        });
      }
    } else if (nullity === 2 && kerBasis.length >= 2) {
      const k1 = kerBasis[0];
      const k2 = kerBasis[1];
      const coords = [-1.8, 1.8];
      coords.forEach((s1) => {
        coords.forEach((s2) => {
          sampleKerPoints.push([
            s1 * k1[0] + s2 * k2[0],
            s1 * k1[1] + s2 * k2[1],
            s1 * (k1[2] || 0) + s2 * (k2[2] || 0)
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

  // --- CẤU HÌNH THUYẾT MINH 3 BƯỚC ĐẠI SỐ TUYẾN TÍNH ---
  const PHASES = [
    {
      index: 0,
      title: "Bước 1: Ánh xạ Cơ sở chuẩn e_j -> T(e_j) & Cột Ma trận",
      desc: "Lưới không gian biến dạng theo M(t) = (1-t)I + tA. Các vector cơ sở chuẩn e_j dịch chuyển đến ảnh T(e_j), chính là các cột của ma trận A."
    },
    {
      index: 1,
      title: "Bước 2: Hạt nhân Ker(T) = {x | Ax = 0} sụp đổ về Gốc O",
      desc: "Không gian hạt nhân Ker(T) (đỏ hoa hồng) chứa các nghiệm Ax = 0. Khi ma trận tác động, mọi vector trên Ker(T) bị co xẹp hoàn toàn về gốc tọa độ O."
    },
    {
      index: 2,
      title: "Bước 3: Kết tinh Không gian ảnh Im(T) & Định lý Hạng - Số khuyết",
      desc: "Không gian ảnh Im(T) = span(cols(A)) (xanh ngọc lục bảo). Định lý bảo toàn số chiều: dim Ker(T) + dim Im(T) = n."
    }
  ];

  // =========================================================================
  // BỘ ĐIỀU KHIỂN HOẠT CẢNH ÁNH XẠ TUYẾN TÍNH (App.LTAnimator)
  // =========================================================================
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

    // --- KHỞI ĐỘNG VÀ THIẾT LẬP ---
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

      // Đồng bộ chế độ 2D / 3D phù hợp với cấp ma trận
      if (analysis.is3D && App.mode !== "3D") {
        if (typeof App.setMode === "function") App.setMode("3D");
        else if (typeof App.toggleMode === "function") App.toggleMode();
      } else if (!analysis.is3D && App.mode === "3D") {
        if (typeof App.setMode === "function") App.setMode("2D");
        else if (typeof App.toggleMode === "function") App.toggleMode();
      }

      // Căn chỉnh góc nhìn Camera 3D lệch phương (x != y != z) để các vector không che lấp nhau
      this._savedCamPos3D = null;
      if (window.Vec3D && Vec3D._camera && Vec3D._controls && App.mode === "3D") {
        if (Vec3D._resetAnimId) {
          cancelAnimationFrame(Vec3D._resetAnimId);
          Vec3D._resetAnimId = null;
        }
        this._savedCamPos3D = Vec3D._camera.position.clone();
        let maxReach = 3.0;
        for (const col of analysis.columns) {
          maxReach = Math.max(maxReach, norm(to3D(col)));
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
      const wrap = document.getElementById("ltAnimControls");
      if (wrap) wrap.style.display = "block";

      this._active = true;
      this._paused = false;
      this._currentPhase = 0;
      this._phaseProgress = 0;
      App._ltAnimActive = true;

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

      this._active = false;
      this._paused = false;
      this._currentPhase = 0;
      this._phaseProgress = 0;
      App._ltAnimActive = false;

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

      // Khôi phục Camera 3D nếu có
      if (this._savedCamPos3D && window.Vec3D && Vec3D._camera && Vec3D._controls) {
        Vec3D._camera.position.copy(this._savedCamPos3D);
        Vec3D._controls.update();
        this._savedCamPos3D = null;
      }

      // Làm mới Viewer
      if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
        Vec2D.draw2DAllVectors();
      }
      if (window.Vec3D && typeof Vec3D.hardRefresh3D === "function") {
        Vec3D.hardRefresh3D();
      }

      this.updateSidebarUI();
    },

    // --- ĐIỀU KHIỂN BƯỚC & TỐC ĐỘ ---
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

      this._currentPhase = Math.max(0, Math.min(2, phaseIdx));
      this._phaseProgress = 0;
      this.updateSidebarUI();

      if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
        Vec2D.draw2DAllVectors();
      }
      if (window.Vec3D && typeof Vec3D.hardRefresh3D === "function") {
        Vec3D.hardRefresh3D();
      }

      if (this._active && !this._paused) {
        this.runCurrentPhase();
      }
    },

    togglePlayPause() {
      if (!this._active) {
        this.start();
        return;
      }
      this._paused = !this._paused;
      this.updateSidebarUI();

      if (!this._paused) {
        this.runCurrentPhase();
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

    // --- VÒNG LẶP RAF CHUYỂN BƯỚC LIÊN HOÀN 3 BƯỚC ---
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
      const baseDuration = 2600; // ms mỗi bước

      const tick = (now) => {
        if (!this._active || this._paused) return;

        const dt = Math.max(0, now - lastTime);
        lastTime = now;

        const speed = Math.max(0.2, this._speed || 1.0);
        this._phaseProgress = Math.min(1.0, this._phaseProgress + (dt * speed) / baseDuration);

        // Vẽ lại trên cả 2D và 3D
        if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
          Vec2D.draw2DAllVectors();
        }
        if (window.Vec3D && typeof Vec3D.hardRefresh3D === "function") {
          Vec3D.hardRefresh3D();
        }

        if (this._phaseProgress < 1.0) {
          this._raf = requestAnimationFrame(tick);
        } else {
          // Hoàn thành bước hiện tại
          if (this._currentPhase < 2) {
            // Tự động chuyển tiếp sang bước sau (nghỉ 380ms để người học quan sát kết quả)
            this._phaseTimer = setTimeout(() => {
              if (this._active && !this._paused) {
                this._currentPhase++;
                this._phaseProgress = 0;
                this.updateSidebarUI();
                this.runCurrentPhase();
              }
            }, 380 / speed);
          } else {
            // Kết thúc Bước 3: Giữ khung hình hoàn tất và chuyển sang trạng thái Pause
            this._paused = true;
            this.updateSidebarUI();
          }
        }
      };

      this._raf = requestAnimationFrame(tick);
    },

    // --- CẬP NHẬT GIAO DIỆN KHỐI ĐIỀU KHIỂN SIDEBAR ---
    updateSidebarUI() {
      const counter = document.getElementById("ltStepCounter");
      if (counter) counter.textContent = `Bước ${this._currentPhase + 1} / 3`;

      const pills = document.querySelectorAll("#ltPhasePills .coord-phase-btn");
      pills.forEach((p, idx) => {
        if (idx === this._currentPhase) {
          p.classList.add("active");
          p.style.background = "var(--primary-base, #0284c7)";
          p.style.color = "#ffffff";
        } else {
          p.classList.remove("active");
          p.style.background = "var(--bg-card)";
          p.style.color = "var(--fg)";
        }
      });

      const playBtn = document.getElementById("btnLTPlay");
      const playIcon = document.getElementById("iconLTPlay");
      if (playBtn && playIcon) {
        const isPlaying = this._active && !this._paused;
        if (isPlaying) {
          playBtn.classList.add("pause-btn-red");
          playBtn.style.background = "#ef4444";
          playBtn.style.borderColor = "#ef4444";
          playIcon.className = "ph ph-pause";
          playBtn.title = "Tạm dừng";
        } else {
          playBtn.classList.remove("pause-btn-red");
          playBtn.style.background = "var(--primary-base, #0284c7)";
          playBtn.style.borderColor = "var(--primary-base, #0284c7)";
          playIcon.className = "ph ph-play";
          playBtn.title = "Phát";
        }
      }

      const pInfo = PHASES[this._currentPhase] || PHASES[0];
      const titleEl = document.getElementById("ltStepTitle");
      const descEl = document.getElementById("ltStepDesc");
      if (titleEl) titleEl.textContent = pInfo.title;
      if (descEl) descEl.textContent = pInfo.desc;
    },

    // --- KHỞI TẠO VÀ GẮN SỰ KIỆN KHỐI CONTROLS ---
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
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted, #64748b);">Khảo sát Ánh xạ Tuyến tính</span>
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

        if (out && out.nextSibling) {
          host.insertBefore(wrap, out.nextSibling);
        } else {
          host.appendChild(wrap);
        }

        // Gắn sự kiện
        const btnClose = document.getElementById("btnLTCloseAnim");
        if (btnClose) {
          btnClose.addEventListener("click", () => {
            this.stop();
            wrap.style.display = "none";
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
    // KẾT XUẤT 2D CANVAS (viewer2D.js Hooks)
    // =========================================================================
    render2DSubspace(ctx2d, gridInfo2D) {
      if (!this._active || !this._analysis || this._analysis.is3D) return;
      if (!ctx2d || !gridInfo2D) return;

      const { originPx, pixelsPerUnit } = gridInfo2D;
      const cx = originPx.x;
      const cy = originPx.y;
      const px = pixelsPerUnit;

      const wX = (x) => cx + x * px;
      const wY = (y) => cy - y * px;

      const an = this._analysis;
      const p = this._phaseProgress;
      const t = smoothstep(p);

      ctx2d.save();

      if (this._currentPhase === 0) {
        // Bước 1: Lưới biến dạng M(t) = (1-t)I + tA
        const e1 = [1, 0];
        const e2 = [0, 1];
        const c1 = an.columns[0];
        const c2 = an.columns[1];

        const v1 = [(1 - t) * e1[0] + t * c1[0], (1 - t) * e1[1] + t * c1[1]];
        const v2 = [(1 - t) * e2[0] + t * c2[0], (1 - t) * e2[1] + t * c2[1]];

        // A. Lưới tọa độ biến dạng
        ctx2d.strokeStyle = "rgba(2, 132, 199, 0.15)";
        ctx2d.lineWidth = 1;
        ctx2d.beginPath();
        for (let k = -7; k <= 7; k++) {
          // Các đường song song v1
          const startX1 = k * v2[0] - 10 * v1[0];
          const startY1 = k * v2[1] - 10 * v1[1];
          const endX1 = k * v2[0] + 10 * v1[0];
          const endY1 = k * v2[1] + 10 * v1[1];
          ctx2d.moveTo(wX(startX1), wY(startY1));
          ctx2d.lineTo(wX(endX1), wY(endY1));

          // Các đường song song v2
          const startX2 = k * v1[0] - 10 * v2[0];
          const startY2 = k * v1[1] - 10 * v2[1];
          const endX2 = k * v1[0] + 10 * v2[0];
          const endY2 = k * v1[1] + 10 * v2[1];
          ctx2d.moveTo(wX(startX2), wY(startY2));
          ctx2d.lineTo(wX(endX2), wY(endY2));
        }
        ctx2d.stroke();

        // B. Hình bình hành đơn vị biến dạng căng bởi v1, v2
        ctx2d.fillStyle = "rgba(2, 132, 199, 0.14)";
        ctx2d.strokeStyle = "rgba(2, 132, 199, 0.45)";
        ctx2d.lineWidth = 1.5;
        ctx2d.beginPath();
        ctx2d.moveTo(wX(0), wY(0));
        ctx2d.lineTo(wX(v1[0]), wY(v1[1]));
        ctx2d.lineTo(wX(v1[0] + v2[0]), wY(v1[1] + v2[1]));
        ctx2d.lineTo(wX(v2[0]), wY(v2[1]));
        ctx2d.closePath();
        ctx2d.fill();
        ctx2d.stroke();

        // C. Bóng mờ ô vuông đơn vị ban đầu [0,1]^2
        ctx2d.strokeStyle = "rgba(148, 163, 184, 0.45)";
        ctx2d.lineWidth = 1.2;
        ctx2d.setLineDash([4, 4]);
        ctx2d.strokeRect(wX(0), wY(1), px, px);
        ctx2d.setLineDash([]);
      } else if (this._currentPhase === 1) {
        // Bước 2: Sự sụp đổ của Hạt nhân Ker(T) về gốc O
        if (an.nullity === 0) {
          // Ker(T) chỉ có điểm gốc {0}
          ctx2d.fillStyle = "rgba(244, 63, 94, 0.9)";
          ctx2d.beginPath();
          ctx2d.arc(cx, cy, 6, 0, Math.PI * 2);
          ctx2d.fill();

          ctx2d.font = "700 12px system-ui, sans-serif";
          ctx2d.fillStyle = "#f43f5e";
          ctx2d.fillText("Ker(T) = {0} (Ánh xạ đơn ánh)", cx + 12, cy - 8);
        } else if (an.nullity === 1 && an.kerBasis.length >= 1) {
          const k = an.kerBasis[0];
          const far = 40;

          // A. Đường thẳng Hạt nhân Ker(T)
          ctx2d.strokeStyle = "rgba(244, 63, 94, 0.85)";
          ctx2d.lineWidth = 2.5;
          ctx2d.setLineDash([7, 5]);
          ctx2d.beginPath();
          ctx2d.moveTo(wX(-far * k[0]), wY(-far * k[1]));
          ctx2d.lineTo(wX(far * k[0]), wY(far * k[1]));
          ctx2d.stroke();
          ctx2d.setLineDash([]);

          // B. Nhãn Ker(T)
          ctx2d.font = "700 12px system-ui, sans-serif";
          ctx2d.fillStyle = "#f43f5e";
          ctx2d.fillText("Ker(T) = span{" + k[0] + ", " + k[1] + "}", wX(3.2 * k[0]) + 8, wY(3.2 * k[1]) - 8);

          // C. Các điểm mẫu co xẹp về gốc (0,0): x(t) = (1 - t) x_0
          const collapseRatio = 1.0 - t;
          an.sampleKerPoints.forEach((pt) => {
            const curX = pt[0] * collapseRatio;
            const curY = pt[1] * collapseRatio;

            // Điểm đang chuyển động
            ctx2d.fillStyle = "#f43f5e";
            ctx2d.beginPath();
            ctx2d.arc(wX(curX), wY(curY), 4, 0, Math.PI * 2);
            ctx2d.fill();

            // Mũi tên hướng về gốc 0
            const dx = cx - wX(curX);
            const dy = cy - wY(curY);
            const dist = Math.hypot(dx, dy);
            if (dist > 18) {
              const arrowLen = 14;
              const ax = wX(curX) + (dx / dist) * arrowLen;
              const ay = wY(curY) + (dy / dist) * arrowLen;
              ctx2d.strokeStyle = "rgba(244, 63, 94, 0.55)";
              ctx2d.lineWidth = 1.5;
              ctx2d.beginPath();
              ctx2d.moveTo(wX(curX), wY(curY));
              ctx2d.lineTo(ax, ay);
              ctx2d.stroke();
            }
          });
        }
      } else if (this._currentPhase === 2) {
        // Bước 3: Không gian ảnh Im(T) & Bảo toàn số chiều
        if (an.rank === 1 && an.imBasis.length >= 1) {
          const im = an.imBasis[0];
          const far = 40;

          // A. Đường thẳng Không gian ảnh Im(T)
          ctx2d.strokeStyle = "rgba(16, 185, 129, 0.9)";
          ctx2d.lineWidth = 3.0;
          ctx2d.beginPath();
          ctx2d.moveTo(wX(-far * im[0]), wY(-far * im[1]));
          ctx2d.lineTo(wX(far * im[0]), wY(far * im[1]));
          ctx2d.stroke();

          // Nhãn Im(T)
          ctx2d.font = "700 12px system-ui, sans-serif";
          ctx2d.fillStyle = "#10b981";
          ctx2d.fillText("Im(T) = span{T(e)} (Đường 1D)", wX(3.5 * im[0]) + 8, wY(3.5 * im[1]) - 8);

          // B. Ghost đường Ker(T) để so sánh đối ngẫu
          if (an.kerBasis.length >= 1) {
            const k = an.kerBasis[0];
            ctx2d.strokeStyle = "rgba(244, 63, 94, 0.45)";
            ctx2d.lineWidth = 1.8;
            ctx2d.setLineDash([6, 5]);
            ctx2d.beginPath();
            ctx2d.moveTo(wX(-far * k[0]), wY(-far * k[1]));
            ctx2d.lineTo(wX(far * k[0]), wY(far * k[1]));
            ctx2d.stroke();
            ctx2d.setLineDash([]);
          }
        } else if (an.rank === 2) {
          // Im(T) là toàn bộ mặt phẳng R^2
          const c1 = an.columns[0];
          const c2 = an.columns[1];

          ctx2d.fillStyle = "rgba(16, 185, 129, 0.16)";
          ctx2d.strokeStyle = "rgba(16, 185, 129, 0.55)";
          ctx2d.lineWidth = 2.0;
          ctx2d.beginPath();
          ctx2d.moveTo(wX(0), wY(0));
          ctx2d.lineTo(wX(c1[0]), wY(c1[1]));
          ctx2d.lineTo(wX(c1[0] + c2[0]), wY(c1[1] + c2[1]));
          ctx2d.lineTo(wX(c2[0]), wY(c2[1]));
          ctx2d.closePath();
          ctx2d.fill();
          ctx2d.stroke();

          ctx2d.font = "700 12px system-ui, sans-serif";
          ctx2d.fillStyle = "#10b981";
          ctx2d.fillText("Im(T) = R^2 (rank = 2)", wX(c1[0] + c2[0]) + 10, wY(c1[1] + c2[1]));
        }
      }

      ctx2d.restore();
    },

    render2DProjections(ctx2d, gridInfo2D) {
      if (!this._active || !this._analysis || this._analysis.is3D) return;
      if (!ctx2d || !gridInfo2D) return;

      const { originPx, pixelsPerUnit } = gridInfo2D;
      const cx = originPx.x;
      const cy = originPx.y;
      const px = pixelsPerUnit;

      const wX = (x) => cx + x * px;
      const wY = (y) => cy - y * px;

      const an = this._analysis;
      const p = this._phaseProgress;
      const t = smoothstep(p);

      ctx2d.save();

      // Hàm vẽ mũi tên sắc nét kèm nhãn
      function drawArrow2D(x0, y0, x1, y1, color, labelText) {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const len = Math.hypot(dx, dy);
        if (len < 1e-4) return;

        ctx2d.beginPath();
        ctx2d.strokeStyle = color;
        ctx2d.lineWidth = 2.8;
        ctx2d.moveTo(x0, y0);
        ctx2d.lineTo(x1, y1);
        ctx2d.stroke();

        const headLen = Math.min(11, len * 0.35);
        const angle = Math.atan2(dy, dx);
        ctx2d.fillStyle = color;
        ctx2d.beginPath();
        ctx2d.moveTo(x1, y1);
        ctx2d.lineTo(
          x1 - headLen * Math.cos(angle - Math.PI / 7),
          y1 - headLen * Math.sin(angle - Math.PI / 7)
        );
        ctx2d.lineTo(
          x1 - headLen * Math.cos(angle + Math.PI / 7),
          y1 - headLen * Math.sin(angle + Math.PI / 7)
        );
        ctx2d.closePath();
        ctx2d.fill();

        if (labelText) {
          ctx2d.font = "700 12px system-ui, sans-serif";
          ctx2d.fillStyle = color;
          ctx2d.fillText(labelText, x1 + 8, y1 - 4);
        }
      }

      if (this._currentPhase === 0) {
        // Vẽ 2 vector đang biến dạng từ e_j sang T(e_j)
        const e1 = [1, 0];
        const e2 = [0, 1];
        const c1 = an.columns[0];
        const c2 = an.columns[1];

        const v1 = [(1 - t) * e1[0] + t * c1[0], (1 - t) * e1[1] + t * c1[1]];
        const v2 = [(1 - t) * e2[0] + t * c2[0], (1 - t) * e2[1] + t * c2[1]];

        const lbl1 = t > 0.8 ? "T(e1) = Cột 1" : "v1(t)";
        const lbl2 = t > 0.8 ? "T(e2) = Cột 2" : "v2(t)";

        drawArrow2D(cx, cy, wX(v1[0]), wY(v1[1]), "#0090ff", lbl1);
        drawArrow2D(cx, cy, wX(v2[0]), wY(v2[1]), "#10b981", lbl2);
      } else {
        // Ở Bước 2 và Bước 3: Luôn hiển thị hai vector cột ảnh đích T(e1), T(e2)
        const c1 = an.columns[0];
        const c2 = an.columns[1];
        drawArrow2D(cx, cy, wX(c1[0]), wY(c1[1]), "#0090ff", "T(e1)");
        drawArrow2D(cx, cy, wX(c2[0]), wY(c2[1]), "#10b981", "T(e2)");
      }

      ctx2d.restore();
    },

    // =========================================================================
    // KẾT XUẤT 3D THREE.JS (viewer3D.js Hooks)
    // =========================================================================
    render3D(parentGroup) {
      if (!this._active || !this._analysis) return;
      if (!window.THREE || !parentGroup) return;

      const an = this._analysis;
      const p = this._phaseProgress;
      const t = smoothstep(p);

      // 1. Tạo hoặc làm sạch Three Group
      if (!this._threeGroup) {
        this._threeGroup = new THREE.Group();
        this._threeGroup.name = "LTAnimator_Group";
      }

      // Xóa và giải phóng tài nguyên cũ
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

      // Hàm tiện ích tạo mũi tên vector 3D
      const makeArrow3D = (vec, colorHex, headSize = 0.35) => {
        const grp = new THREE.Group();
        const vLen = norm(vec);
        if (vLen < 1e-4) return grp;

        const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(vec[0], vec[1], vec[2])];
        const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
        const lineMat = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 2.5 });
        grp.add(new THREE.Line(lineGeom, lineMat));

        const coneGeom = new THREE.ConeGeometry(headSize * 0.35, headSize, 12);
        const coneMat = new THREE.MeshBasicMaterial({ color: colorHex });
        const cone = new THREE.Mesh(coneGeom, coneMat);
        cone.position.set(vec[0], vec[1], vec[2]);
        const dir = new THREE.Vector3(vec[0], vec[1], vec[2]).normalize();
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        grp.add(cone);
        return grp;
      };

      if (this._currentPhase === 0) {
        // Bước 1: Khối biến dạng 3D từ I sang A
        const cols = an.columns.map((c) => to3D(c));
        const std = [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1]
        ];

        const v1 = [
          (1 - t) * std[0][0] + t * cols[0][0],
          (1 - t) * std[0][1] + t * cols[0][1],
          (1 - t) * std[0][2] + t * cols[0][2]
        ];
        const v2 = [
          (1 - t) * std[1][0] + t * cols[1][0],
          (1 - t) * std[1][1] + t * cols[1][1],
          (1 - t) * std[1][2] + t * cols[1][2]
        ];
        const v3 = [
          (1 - t) * std[2][0] + t * (cols[2] ? cols[2][0] : 0),
          (1 - t) * std[2][1] + t * (cols[2] ? cols[2][1] : 0),
          (1 - t) * std[2][2] + t * (cols[2] ? cols[2][2] : 1)
        ];

        // 3 Mũi tên biến dạng
        this._threeGroup.add(makeArrow3D(v1, 0x0090ff));
        this._threeGroup.add(makeArrow3D(v2, 0x10b981));
        if (an.is3D) {
          this._threeGroup.add(makeArrow3D(v3, 0xf59e0b));
        }

        // Khung dây hình hộp biến dạng
        const ptsBox = [
          [0, 0, 0],
          v1,
          [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]],
          v2,
          [0, 0, 0],
          v3,
          [v1[0] + v3[0], v1[1] + v3[1], v1[2] + v3[2]],
          [v1[0] + v2[0] + v3[0], v1[1] + v2[1] + v3[1], v1[2] + v2[2] + v3[2]],
          [v2[0] + v3[0], v2[1] + v3[1], v2[2] + v3[2]],
          v3
        ];
        const boxGeom = new THREE.BufferGeometry().setFromPoints(
          ptsBox.map((p) => new THREE.Vector3(p[0], p[1], p[2]))
        );
        const boxMat = new THREE.LineBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.45 });
        this._threeGroup.add(new THREE.Line(boxGeom, boxMat));
      } else if (this._currentPhase === 1) {
        // Bước 2: Hạt nhân Ker(T) sụp đổ 3D
        if (an.nullity === 0) {
          const sphGeom = new THREE.SphereGeometry(0.2, 16, 16);
          const sphMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
          this._threeGroup.add(new THREE.Mesh(sphGeom, sphMat));
        } else if (an.nullity === 1 && an.kerBasis.length >= 1) {
          const k = to3D(an.kerBasis[0]);
          const kLen = norm(k);
          if (kLen > 1e-4) {
            const dir = [k[0] / kLen, k[1] / kLen, k[2] / kLen];
            const pts = [
              new THREE.Vector3(-dir[0] * 16, -dir[1] * 16, -dir[2] * 16),
              new THREE.Vector3(dir[0] * 16, dir[1] * 16, dir[2] * 16)
            ];
            const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
            const lineMat = new THREE.LineDashedMaterial({
              color: 0xf43f5e,
              dashSize: 0.4,
              gapSize: 0.2
            });
            const line = new THREE.Line(lineGeom, lineMat);
            line.computeLineDistances();
            this._threeGroup.add(line);

            // Các hạt co xẹp
            const collapseRatio = 1.0 - t;
            an.sampleKerPoints.forEach((pt) => {
              const p3 = to3D(pt);
              const sphGeom = new THREE.SphereGeometry(0.12, 12, 12);
              const sphMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
              const sph = new THREE.Mesh(sphGeom, sphMat);
              sph.position.set(p3[0] * collapseRatio, p3[1] * collapseRatio, p3[2] * collapseRatio);
              this._threeGroup.add(sph);
            });
          }
        } else if (an.nullity === 2 && an.kerBasis.length >= 2) {
          // Mặt phẳng Hạt nhân Ker(T)
          const k1 = to3D(an.kerBasis[0]);
          const k2 = to3D(an.kerBasis[1]);
          const nVec = cross(k1, k2);
          const nLen = norm(nVec);
          if (nLen > 1e-6) {
            const planeGeom = new THREE.PlaneGeometry(16, 16);
            const planeMat = new THREE.MeshBasicMaterial({
              color: 0xf43f5e,
              transparent: true,
              opacity: 0.22,
              side: THREE.DoubleSide
            });
            const planeMesh = new THREE.Mesh(planeGeom, planeMat);
            planeMesh.quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              new THREE.Vector3(nVec[0] / nLen, nVec[1] / nLen, nVec[2] / nLen)
            );
            this._threeGroup.add(planeMesh);
          }
        }
      } else if (this._currentPhase === 2) {
        // Bước 3: Không gian ảnh Im(T) 3D
        if (an.rank === 1 && an.imBasis.length >= 1) {
          const im = to3D(an.imBasis[0]);
          const imLen = norm(im);
          if (imLen > 1e-4) {
            const dir = [im[0] / imLen, im[1] / imLen, im[2] / imLen];
            const pts = [
              new THREE.Vector3(-dir[0] * 16, -dir[1] * 16, -dir[2] * 16),
              new THREE.Vector3(dir[0] * 16, dir[1] * 16, dir[2] * 16)
            ];
            const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
            const lineMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 3 });
            this._threeGroup.add(new THREE.Line(lineGeom, lineMat));
          }
        } else if (an.rank === 2 && an.imBasis.length >= 2) {
          // Mặt phẳng ảnh Im(T)
          const c1 = to3D(an.imBasis[0]);
          const c2 = to3D(an.imBasis[1]);
          const nVec = cross(c1, c2);
          const nLen = norm(nVec);
          if (nLen > 1e-6) {
            const planeGeom = new THREE.PlaneGeometry(18, 18);
            const planeMat = new THREE.MeshBasicMaterial({
              color: 0x10b981,
              transparent: true,
              opacity: 0.22,
              side: THREE.DoubleSide
            });
            const planeMesh = new THREE.Mesh(planeGeom, planeMat);
            planeMesh.quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              new THREE.Vector3(nVec[0] / nLen, nVec[1] / nLen, nVec[2] / nLen)
            );
            this._threeGroup.add(planeMesh);
          }
        }

        // Vẽ các vector cột của A
        an.columns.forEach((col, idx) => {
          const col3 = to3D(col);
          const colorHex = idx === 0 ? 0x0090ff : idx === 1 ? 0x10b981 : 0xf59e0b;
          this._threeGroup.add(makeArrow3D(col3, colorHex));
        });
      }
    }
  };

  App.LTAnimator = LTAnimator;
})();
