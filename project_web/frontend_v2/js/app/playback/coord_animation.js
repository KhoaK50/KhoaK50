// ==================================================================================
// COORDINATE PLAYBACK ENGINE (ACADEMIC ARCHITECTURE)
// Trực quan hóa Tọa độ của Vector đối với Cơ sở [x]_B (2D Canvas & 3D Three.js)
// Kịch bản 4 Pha Sư phạm:
//   Pha 1: Đổi hệ quy chiếu (Lưới Affine của cơ sở B)
//   Pha 2: Tia chiếu song song (Oblique Projection Rays) xác định thành phần c_i * v_i
//   Pha 3: Hành trình bước chân nối đuôi (Head-to-Tail Journey: x = sum c_i * v_i)
//   Pha 4: Kết tinh Hình bình hành / Khối hộp Parallelepiped & Viên nang Tọa độ [x]_B
// ==================================================================================
(function () {
  window.App = window.App || {};

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // --- HÀM TOÁN HỌC & ĐẠI SỐ TUYẾN TÍNH CHUẨN MỰC ---
  function to3D(v) {
    if (!Array.isArray(v)) return [0, 0, 0];
    return [Number(v[0] || 0), Number(v[1] || 0), Number(v[2] || 0)];
  }

  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function cross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  function norm(a) {
    return Math.sqrt(dot(a, a));
  }

  function formatScalar(val) {
    if (Math.abs(val) < 1e-4) return "0";
    if (Math.abs(val - Math.round(val)) < 1e-3) return String(Math.round(val));
    for (let den = 2; den <= 12; den++) {
      const num = Math.round(val * den);
      if (Math.abs(val - num / den) < 1e-3) {
        return num < 0 ? `-${Math.abs(num)}/${den}` : `${num}/${den}`;
      }
    }
    return val.toFixed(2).replace(/\.?0+$/, "");
  }

  function formatMathName(str) {
    if (!str) return "";
    return String(str)
      .replace(/([a-zA-Z])_?\{?(\d+)\}?/g, (m, letter, d) => {
        const subs = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
        const subDigits = d.split("").map((c) => subs[c] || c).join("");
        return `${letter}${subDigits}`;
      })
      .replace(/_\{?(\d+)\}?/g, (m, d) => {
        const subs = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
        return d.split("").map((c) => subs[c] || c).join("");
      });
  }

  function getVectorDisplayName(item, fallbackIdx) {
    if (!item) return `v_{${fallbackIdx || 1}}`;
    if (typeof App.getVectorName === "function") return App.getVectorName(item);
    if (item.name && !/^v_?\{?\d+\}?$/i.test(item.name)) return item.name;
    const idx = App.vectorList ? App.vectorList.indexOf(item) : -1;
    const num = idx >= 0 ? idx + 1 : (fallbackIdx || item.id || 1);
    return `v_{${num}}`;
  }

  // Giải hệ phương trình tìm tọa độ [x]_B = (c_1, c_2, ...)^T
  function solveCoordinates(targetVecRaw, basisItems) {
    const target = to3D(targetVecRaw);
    const r = basisItems.length;

    if (r === 2) {
      const b1 = to3D(basisItems[0].vec);
      const b2 = to3D(basisItems[1].vec);
      const det = b1[0] * b2[1] - b1[1] * b2[0];
      if (Math.abs(det) < 1e-7) {
        return { solvable: false, error: "Hệ hai vector cơ sở phụ thuộc tuyến tính (det = 0)." };
      }
      const c1 = (target[0] * b2[1] - target[1] * b2[0]) / det;
      const c2 = (b1[0] * target[1] - b1[1] * target[0]) / det;
      return {
        solvable: true,
        dim: 2,
        coeffs: [c1, c2],
        p1: [c1 * b1[0], c1 * b1[1], 0],
        p2: [c2 * b2[0], c2 * b2[1], 0]
      };
    }

    if (r === 3) {
      const b1 = to3D(basisItems[0].vec);
      const b2 = to3D(basisItems[1].vec);
      const b3 = to3D(basisItems[2].vec);
      const b2xb3 = cross(b2, b3);
      const det = dot(b1, b2xb3);
      if (Math.abs(det) < 1e-7) {
        return { solvable: false, error: "Hệ ba vector cơ sở đồng phẳng trong không gian 3D (det = 0)." };
      }
      const c1 = dot(target, b2xb3) / det;
      const c2 = dot(b1, cross(target, b3)) / det;
      const c3 = dot(b1, cross(b2, target)) / det;
      return {
        solvable: true,
        dim: 3,
        coeffs: [c1, c2, c3],
        p1: [c1 * b1[0], c1 * b1[1], c1 * b1[2]],
        p2: [c2 * b2[0], c2 * b2[1], c2 * b2[2]],
        p3: [c3 * b3[0], c3 * b3[1], c3 * b3[2]]
      };
    }

    return { solvable: false, error: "Số lượng vector cơ sở phải là 2 (trong 2D) hoặc 3 (trong 3D)." };
  }

  // Định nghĩa thông tin thuyết minh cho 4 bước
  const PHASES_INFO = [
    {
      index: 0,
      title: "Bước 1/4: Thiết lập hệ trục cơ sở B",
      desc: "Đổi hệ quy chiếu sang cơ sở B. Giữ đồ thị trực quan thông thoáng, tập trung vào các phương cơ sở và vector đích x."
    },
    {
      index: 1,
      title: "Bước 2/4: Tia chiếu song song xác định thành phần cᵢvᵢ",
      desc: "Từ ngọn x, kẻ các tia chiếu xiên song song với các phương cơ sở còn lại để xác định chính xác các vector thành phần cᵢvᵢ."
    },
    {
      index: 2,
      title: "Bước 3/4: Quy tắc cộng nối đuôi: x = ∑ cᵢvᵢ",
      desc: "Thực hiện hành trình cộng vector nối tiếp: từ gốc O đi theo thành phần c₁v₁, rồi tiếp tục theo thành phần c₂v₂ để chạm đúng ngọn x."
    },
    {
      index: 3,
      title: "Bước 4/4: Kết tinh Hình học & Viên nang Tọa độ [x]B",
      desc: "Khối hình học khép kín khẳng định tính duy nhất của bộ tọa độ [x]B đối với hệ cơ sở đã chọn."
    }
  ];

  // =========================================================================
  // BỘ ĐIỀU KHIỂN HOẠT CẢNH TỌA ĐỘ TOÀN CỤC (App.CoordAnimator)
  // =========================================================================
  const CoordAnimator = {
    _active: false,
    _paused: false,
    _currentPhase: 0,
    _phaseProgress: 0,
    _phaseTimer: null,
    _raf: null,
    _speed: 1.0,
    _targetItem: null,
    _basisItems: [],
    _solution: null,
    _snapshot: null,

    isActive() {
      return this._active;
    },

    getCurrentPhase() {
      return this._currentPhase;
    },

    getSolution() {
      return this._solution;
    },

    getTargetItem() {
      return this._targetItem;
    },

    getBasisItems() {
      return this._basisItems;
    },

    // Bắt đầu hoạt cảnh
    start(opts = {}) {
      this.stop();

      const targetId = Number(opts.targetId);
      const basisIds = Array.isArray(opts.basisIds) ? opts.basisIds.map(Number) : [];

      const targetItem = (App.vectorList || []).find((v) => v.id === targetId);
      const basisItems = basisIds
        .map((id) => (App.vectorList || []).find((v) => v.id === id))
        .filter(Boolean);

      if (!targetItem) {
        if (typeof App.showToast === "function") App.showToast("Chưa chọn vector đích (x) cần tìm tọa độ!", "warning");
        return false;
      }

      if (basisItems.length < 2) {
        if (typeof App.showToast === "function") App.showToast("Cần chọn ít nhất 2 vector cơ sở!", "warning");
        return false;
      }

      const sol = solveCoordinates(targetItem.vec, basisItems);
      if (!sol.solvable) {
        if (typeof App.showToast === "function") App.showToast(sol.error || "Không thể giải tọa độ!", "warning");
        return false;
      }

      // Lưu snapshot trạng thái hiển thị vector
      this._snapshot = (App.vectorList || []).map((v) => ({
        id: v.id,
        colorCss: v.colorCss,
        colorHex: v.colorHex,
        haloCss: v.haloCss,
        alpha: v.alpha,
        visible: v.visible
      }));

      this._targetItem = targetItem;
      this._basisItems = basisItems;
      this._solution = sol;
      this._active = true;
      App._coordAnimActive = true;
      this._paused = false;
      this._currentPhase = 0;
      this._phaseProgress = 0;

      // Định kiểu màu sắc đồng bộ
      targetItem._coordColorCss = "#f59e0b"; // Vàng hổ phách cho vector đích x
      targetItem._coordAlpha = 1.0;
      targetItem.haloCss = "#f59e0b";

      const basisColors = ["#10b981", "#0284c7", "#8b5cf6"];
      basisItems.forEach((b, idx) => {
        b._coordColorCss = basisColors[idx % basisColors.length];
        b._coordAlpha = 1.0;
        b.haloCss = basisColors[idx % basisColors.length];
      });

      // Làm mờ nhẹ các vector ngoại lai không tham gia bài toán
      const usedIds = new Set([targetId, ...basisIds]);
      (App.vectorList || []).forEach((v) => {
        if (!usedIds.has(v.id)) {
          v._coordAlpha = 0.15;
        }
      });

      this.updateSidebarUI();
      this.goToPhase(0);
      return true;
    },

    stop() {
      if (this._phaseTimer) clearTimeout(this._phaseTimer);
      this._phaseTimer = null;
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = null;

      this.destroy3D();
      this.restoreSnapshot();

      this._active = false;
      App._coordAnimActive = false;
      this._currentPhase = 0;
      this._phaseProgress = 0;
      this._targetItem = null;
      this._basisItems = [];
      this._solution = null;

      this.updateSidebarUI();
      this.redraw();
    },

    restoreSnapshot() {
      if (!this._snapshot) return;
      const map = new Map(this._snapshot.map((s) => [s.id, s]));
      (App.vectorList || []).forEach((it) => {
        const s = map.get(it.id);
        if (s) {
          it.colorCss = s.colorCss;
          it.colorHex = s.colorHex;
          it.haloCss = s.haloCss;
          it.alpha = s.alpha;
          it.visible = s.visible;
        }
        delete it._coordColorCss;
        delete it._coordAlpha;
      });
      this._snapshot = null;
      if (typeof App.renderVectorList === "function") App.renderVectorList(false);
    },

    togglePlay() {
      if (!this._active) return;
      if (this._paused || this._currentPhase >= 3) {
        this.play();
      } else {
        this.pause();
      }
    },

    play() {
      if (!this._active) return;
      this._paused = false;
      if (this._currentPhase >= 3) {
        this.goToPhase(0);
      } else {
        this.runCurrentPhase();
      }
      this.updateSidebarUI();
    },

    pause() {
      this._paused = true;
      if (this._phaseTimer) clearTimeout(this._phaseTimer);
      this._phaseTimer = null;
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = null;
      this.updateSidebarUI();
      this.redraw();
    },

    nextPhase() {
      if (!this._active) return;
      const next = Math.min(3, this._currentPhase + 1);
      this.goToPhase(next);
    },

    prevPhase() {
      if (!this._active) return;
      const prev = Math.max(0, this._currentPhase - 1);
      this.goToPhase(prev);
    },

    restart() {
      if (!this._active) return;
      this.goToPhase(0);
    },

    setSpeed(speedVal) {
      const val = parseFloat(speedVal);
      if (isNaN(val) || val <= 0) return;
      this._speed = Math.max(0.2, Math.min(3.0, val));
      this.updateSidebarUI();
    },

    goToPhase(phaseIdx) {
      if (this._phaseTimer) clearTimeout(this._phaseTimer);
      if (this._raf) cancelAnimationFrame(this._raf);

      this._currentPhase = Math.max(0, Math.min(3, phaseIdx));
      this._phaseProgress = 0;

      if (this._currentPhase >= 3) {
        this._phaseProgress = 1.0;
        this._paused = true;
      }

      this.updateSidebarUI();
      this.runCurrentPhase();
    },

    runCurrentPhase() {
      if (!this._active) return;
      if (this._paused) {
        this._phaseProgress = 1.0;
        this.redraw();
        return;
      }

      const baseDurations = [2000, 2400, 2800, 1000];
      let lastTime = performance.now();
      let currentProgress = this._phaseProgress;

      const stepLoop = (now) => {
        if (!this._active) return;
        if (this._paused) return;

        const delta = Math.max(0, now - lastTime);
        lastTime = now;

        const baseDuration = baseDurations[this._currentPhase] || 2500;
        currentProgress += (delta * this._speed) / baseDuration;
        const p = Math.min(1.0, currentProgress);
        this._phaseProgress = p;
        this.redraw();

        if (p < 1.0) {
          this._raf = requestAnimationFrame(stepLoop);
        } else {
          this._phaseProgress = 1.0;
          this.redraw();
          if (this._currentPhase < 3) {
            this._phaseTimer = setTimeout(() => {
              if (this._active && !this._paused) {
                this.goToPhase(this._currentPhase + 1);
              }
            }, 400 / this._speed);
          } else {
            this._paused = true;
            this.updateSidebarUI();
          }
        }
      };

      this._raf = requestAnimationFrame(stepLoop);
    },

    redraw() {
      if (App.mode === "2D" && window.Vec2D) {
        Vec2D.draw2DAllVectors();
      } else if (window.Vec3D) {
        Vec3D.hardRefresh3D(false);
      }
    },

    // =========================================================================
    // SIDEBAR UI BINDINGS
    // =========================================================================
    bindSidebarControls() {
      const btnPlay = document.getElementById("btnCoordPlay");
      const btnPrev = document.getElementById("btnCoordPrev");
      const btnNext = document.getElementById("btnCoordNext");
      const btnReplay = document.getElementById("btnCoordReplay");
      const speedSlider = document.getElementById("coordSpeedSlider");

      if (btnPlay && !btnPlay._coordBound) {
        btnPlay._coordBound = true;
        btnPlay.addEventListener("click", () => this.togglePlay());
      }
      if (btnPrev && !btnPrev._coordBound) {
        btnPrev._coordBound = true;
        btnPrev.addEventListener("click", () => this.prevPhase());
      }
      if (btnNext && !btnNext._coordBound) {
        btnNext._coordBound = true;
        btnNext.addEventListener("click", () => this.nextPhase());
      }
      if (btnReplay && !btnReplay._coordBound) {
        btnReplay._coordBound = true;
        btnReplay.addEventListener("click", () => this.restart());
      }
      if (speedSlider && !speedSlider._coordBound) {
        speedSlider._coordBound = true;
        speedSlider.addEventListener("input", (e) => {
          this.setSpeed(e.target.value);
        });
      }
    },

    updateSidebarUI() {
      this.bindSidebarControls();

      const wrap = document.getElementById("coordAnimControls");
      if (wrap) {
        wrap.style.display = this._active ? "flex" : "none";
      }

      const iconPlay = document.getElementById("iconCoordPlay");
      const btnPlay = document.getElementById("btnCoordPlay");
      const isFinished = this._currentPhase >= 3;
      const isCurrentlyPlaying = this._active && !this._paused && !isFinished;

      if (iconPlay) {
        iconPlay.className = isCurrentlyPlaying ? "ph-fill ph-pause" : "ph-fill ph-play";
      }
      if (btnPlay) {
        if (isCurrentlyPlaying) {
          btnPlay.classList.add("is-playing", "pause-btn-red");
          btnPlay.title = "Tạm dừng";
        } else {
          btnPlay.classList.remove("is-playing", "pause-btn-red");
          btnPlay.title = isFinished ? "Phát lại từ đầu" : (this._active ? "Phát tiếp" : "Phát trực quan");
        }
      }

      const stepCounter = document.getElementById("coordStepCounter");
      if (stepCounter) {
        stepCounter.textContent = this._active ? `Bước ${this._currentPhase + 1} / 4` : "Sẵn sàng";
      }

      // Cập nhật trạng thái active cho các nút điều hướng 4 pha
      const phaseBtns = document.querySelectorAll(".coord-phase-btn");
      phaseBtns.forEach((btn) => {
        const ph = parseInt(btn.dataset.phase, 10);
        if (ph === this._currentPhase) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });

      const titleEl = document.getElementById("coordStepTitle");
      const descEl = document.getElementById("coordStepDesc");
      const info = PHASES_INFO[this._currentPhase];

      if (titleEl && info) {
        titleEl.textContent = this._active ? formatMathName(info.title) : "Khảo sát tọa độ";
      }
      if (descEl && info) {
        if (this._active && this._solution && this._solution.solvable && this._targetItem) {
          const tName = formatMathName(getVectorDisplayName(this._targetItem, 0));
          const coeffsStr = this._solution.coeffs.map(formatScalar).join(", ");
          const isTargetInBasis = this._basisItems.some((b) => b.id === this._targetItem.id);
          let extra = "";
          if (isTargetInBasis) {
            extra = " Lưu ý: Vector đích x nằm trong hệ cơ sở B (hình bình hành suy biến thành đoạn thẳng).";
          }
          descEl.textContent = info.desc + (this._currentPhase === 3 ? ` Kết quả: [${tName}]_B = (${coeffsStr})ᵀ.${extra}` : extra);
        } else {
          descEl.textContent = info ? info.desc : "Bấm nút Trực quan để khởi chạy hoạt cảnh.";
        }
      }

      const speedVal = document.getElementById("coordSpeedValue");
      if (speedVal) {
        speedVal.textContent = `${this._speed.toFixed(1)}×`;
      }

      const speedSlider = document.getElementById("coordSpeedSlider");
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
    },

    // =========================================================================
    // 2D CANVAS RENDERING
    // =========================================================================
    // Helper vẽ mũi tên vector đầy đặn (filled arrowhead)
    _drawArrow(ctx, x1, y1, x2, y2, headLen = 12, width = 2.6, color = "#10b981") {
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 1e-3) return;
      const angle = Math.atan2(dy, dx);
      const actualHead = Math.min(headLen, len * 0.35);

      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - actualHead * Math.cos(angle - Math.PI / 6), y2 - actualHead * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - actualHead * 0.65 * Math.cos(angle), y2 - actualHead * 0.65 * Math.sin(angle));
      ctx.lineTo(x2 - actualHead * Math.cos(angle + Math.PI / 6), y2 - actualHead * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    // Helper vẽ nhãn badge nhỏ gọn, không che đồ thị
    _drawBadge(ctx, text, x, y, color = "#10b981", isDark = false) {
      ctx.save();
      ctx.font = "bold 11px system-ui, sans-serif";
      const metrics = ctx.measureText(text);
      const w = metrics.width + 10;
      const h = 18;
      const rx = x - w / 2;
      const ry = y - h / 2;

      ctx.fillStyle = isDark ? "rgba(15, 23, 42, 0.90)" : "rgba(255, 255, 255, 0.92)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.roundRect(rx, ry, w, h, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x, y + 0.5);
      ctx.restore();
    },

    render2DSubspace(ctx, gridInfo) {
      if (!this._active || !gridInfo || App.mode !== "2D" || !this._solution || !this._solution.solvable) return;
      const { cx, cy, px } = gridInfo;
      const w = gridInfo.w || (ctx.canvas ? ctx.canvas.width / (window.devicePixelRatio || 1) : 1400);
      const h = gridInfo.h || (ctx.canvas ? ctx.canvas.height / (window.devicePixelRatio || 1) : 900);
      const isDark = document.body.classList.contains("dark");
      const diag = Math.hypot(w, h) * 1.5;

      const b1 = this._basisItems[0].vec;
      const b2 = this._basisItems[1].vec;
      const d1x = b1[0] * px, d1y = -b1[1] * px;
      const d2x = b2[0] * px, d2y = -b2[1] * px;
      const len1 = Math.hypot(d1x, d1y);
      const len2 = Math.hypot(d2x, d2y);
      const u1x = d1x / (len1 || 1), u1y = d1y / (len1 || 1);
      const u2x = d2x / (len2 || 1), u2y = d2y / (len2 || 1);

      ctx.save();

      // 1. Chỉ vẽ 2 trục chỉ phương của cơ sở span(v1) và span(v2) nét đứt thanh mảnh
      // Tuyệt đối KHÔNG vẽ lưới Affine dày đặc 140 đường phủ kín màn hình
      ctx.lineWidth = 1.3;
      ctx.setLineDash([6, 5]);

      // Trục span(v1)
      ctx.strokeStyle = isDark ? "rgba(16, 185, 129, 0.40)" : "rgba(16, 185, 129, 0.35)";
      ctx.beginPath();
      ctx.moveTo(cx - u1x * diag, cy - u1y * diag);
      ctx.lineTo(cx + u1x * diag, cy + u1y * diag);
      ctx.stroke();

      // Trục span(v2)
      ctx.strokeStyle = isDark ? "rgba(2, 132, 199, 0.40)" : "rgba(2, 132, 199, 0.35)";
      ctx.beginPath();
      ctx.moveTo(cx - u2x * diag, cy - u2y * diag);
      ctx.lineTo(cx + u2x * diag, cy + u2y * diag);
      ctx.stroke();

      ctx.setLineDash([]);

      // 2. Vạch chia đơn vị (tick marks) tinh tế trên 2 trục
      const tickNorm1X = -u1y * 4, tickNorm1Y = u1x * 4;
      const tickNorm2X = -u2y * 4, tickNorm2Y = u2x * 4;
      ctx.lineWidth = 1.0;

      for (let k of [-2, -1, 1, 2]) {
        // Vạch trên trục v1
        const tx1 = cx + k * d1x, ty1 = cy + k * d1y;
        ctx.strokeStyle = isDark ? "rgba(16, 185, 129, 0.50)" : "rgba(16, 185, 129, 0.40)";
        ctx.beginPath();
        ctx.moveTo(tx1 - tickNorm1X, ty1 - tickNorm1Y);
        ctx.lineTo(tx1 + tickNorm1X, ty1 + tickNorm1Y);
        ctx.stroke();

        // Vạch trên trục v2
        const tx2 = cx + k * d2x, ty2 = cy + k * d2y;
        ctx.strokeStyle = isDark ? "rgba(2, 132, 199, 0.50)" : "rgba(2, 132, 199, 0.40)";
        ctx.beginPath();
        ctx.moveTo(tx2 - tickNorm2X, ty2 - tickNorm2Y);
        ctx.lineTo(tx2 + tickNorm2X, ty2 + tickNorm2Y);
        ctx.stroke();
      }

      // Gốc tọa độ O
      ctx.fillStyle = isDark ? "#34d399" : "#059669";
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    },

    render2DProjections(ctx, gridInfo) {
      if (!this._active || !gridInfo || App.mode !== "2D" || !this._solution || !this._solution.solvable) return;
      const { cx, cy, px } = gridInfo;
      const isDark = document.body.classList.contains("dark");
      const curPhase = this._currentPhase;
      const p = this._phaseProgress;

      const target = this._targetItem.vec;
      const b1 = this._basisItems[0].vec;
      const b2 = this._basisItems[1].vec;
      const c1 = this._solution.coeffs[0];
      const c2 = this._solution.coeffs[1];

      const tipX = cx + target[0] * px;
      const tipY = cy - target[1] * px;
      const p1X = cx + c1 * b1[0] * px;
      const p1Y = cy - c1 * b1[1] * px;
      const p2X = cx + c2 * b2[0] * px;
      const p2Y = cy - c2 * b2[1] * px;

      const tName = formatMathName(getVectorDisplayName(this._targetItem, 0));
      const b1Name = formatMathName(getVectorDisplayName(this._basisItems[0], 1));
      const b2Name = formatMathName(getVectorDisplayName(this._basisItems[1], 2));

      // Kiểm tra xem bài toán có bị suy biến (degenerate) không
      const isTargetInBasis = this._basisItems.some((b) => b.id === this._targetItem.id);
      const isDegenerate = isTargetInBasis || Math.hypot(p1X - cx, p1Y - cy) < 2 || Math.hypot(p2X - cx, p2Y - cy) < 2;

      ctx.save();

      // --- PHA 2, 3, 4: TIA CHIẾU XIÊN VÀ VECTOR THÀNH PHẦN ---
      if (curPhase >= 1) {
        const factor2 = curPhase === 1 ? p * p * (3 - 2 * p) : 1.0;

        // Tia chiếu từ ngọn x song song v2 tới P1 trên trục span(v1)
        const curProj1X = tipX + (p1X - tipX) * factor2;
        const curProj1Y = tipY + (p1Y - tipY) * factor2;

        // Tia chiếu từ ngọn x song song v1 tới P2 trên trục span(v2)
        const curProj2X = tipX + (p2X - tipX) * factor2;
        const curProj2Y = tipY + (p2Y - tipY) * factor2;

        if (!isDegenerate) {
          ctx.strokeStyle = isDark ? "rgba(245, 158, 11, 0.85)" : "rgba(217, 119, 6, 0.80)";
          ctx.lineWidth = 1.6;
          ctx.setLineDash([5, 4]);

          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(curProj1X, curProj1Y);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(curProj2X, curProj2Y);
          ctx.stroke();

          ctx.setLineDash([]);
        }

        // Vẽ mũi tên vector thành phần c1 * v1 trên trục span(v1)
        const curP1X = cx + (p1X - cx) * factor2;
        const curP1Y = cy + (p1Y - cy) * factor2;
        this._drawArrow(ctx, cx, cy, curP1X, curP1Y, 11, 2.6, "#10b981");

        // Vẽ mũi tên vector thành phần c2 * v2 trên trục span(v2)
        const curP2X = cx + (p2X - cx) * factor2;
        const curP2Y = cy + (p2Y - cy) * factor2;
        this._drawArrow(ctx, cx, cy, curP2X, curP2Y, 11, 2.6, "#0284c7");

        // Điểm mút và nhãn thành phần
        if (factor2 > 0.35) {
          ctx.fillStyle = "#10b981";
          ctx.beginPath();
          ctx.arc(p1X, p1Y, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#0284c7";
          ctx.beginPath();
          ctx.arc(p2X, p2Y, 4, 0, Math.PI * 2);
          ctx.fill();

          // Nhãn thành phần
          if (curPhase === 1) {
            this._drawBadge(ctx, `${formatScalar(c1)}${b1Name}`, p1X + 12, p1Y - 10, "#10b981", isDark);
            this._drawBadge(ctx, `${formatScalar(c2)}${b2Name}`, p2X + 12, p2Y - 10, "#0284c7", isDark);
          }
        }
      }

      // --- PHA 3 & 4: HÀNH TRÌNH BƯỚC CHÂN NỐI ĐUÔI ---
      if (curPhase >= 2) {
        const factor3 = curPhase === 2 ? p : 1.0;

        // Bước 1: O -> P1 (thành phần c1 * v1)
        const p1Ratio = Math.min(1.0, factor3 * 2);
        const curWalk1X = cx + (p1X - cx) * p1Ratio;
        const curWalk1Y = cy + (p1Y - cy) * p1Ratio;

        this._drawArrow(ctx, cx, cy, curWalk1X, curWalk1Y, 12, 3.2, "#10b981");

        // Bước 2: P1 -> ngọn x (tịnh tiến theo thành phần c2 * v2)
        if (factor3 > 0.45) {
          const p2Ratio = Math.min(1.0, (factor3 - 0.45) * 1.82);
          const curWalk2X = p1X + (tipX - p1X) * p2Ratio;
          const curWalk2Y = p1Y + (tipY - p1Y) * p2Ratio;

          this._drawArrow(ctx, p1X, p1Y, curWalk2X, curWalk2Y, 12, 3.2, "#0284c7");

          // Chấm sáng động dẫn đường
          if (curPhase === 2 && factor3 < 0.98) {
            ctx.fillStyle = "#f59e0b";
            ctx.beginPath();
            ctx.arc(curWalk2X, curWalk2Y, 5, 0, Math.PI * 2);
            ctx.fill();
          }

          if (curPhase === 2) {
            this._drawBadge(ctx, `1. Bước ${formatScalar(c1)}${b1Name}`, (cx + p1X) / 2 + 10, (cy + p1Y) / 2 - 12, "#10b981", isDark);
            this._drawBadge(ctx, `2. Bước ${formatScalar(c2)}${b2Name}`, (p1X + tipX) / 2 + 10, (p1Y + tipY) / 2 - 12, "#0284c7", isDark);
          }
        }
      }

      // --- PHA 4: KẾT TINH HÌNH BÌNH HÀNH & VIÊN NANG TỌA ĐỘ ---
      if (curPhase >= 3) {
        if (!isDegenerate) {
          // Tô diện tích hình bình hành O - P1 - tip - P2
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(p1X, p1Y);
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(p2X, p2Y);
          ctx.closePath();
          ctx.fillStyle = isDark ? "rgba(16, 185, 129, 0.16)" : "rgba(16, 185, 129, 0.12)";
          ctx.fill();

          // 4 viền hình bình hành
          ctx.strokeStyle = isDark ? "rgba(52, 211, 153, 0.85)" : "rgba(5, 150, 105, 0.75)";
          ctx.lineWidth = 1.6;
          ctx.stroke();
        } else {
          // Trường hợp suy biến: vẽ quầng sáng dọc theo vector x
          ctx.strokeStyle = "rgba(245, 158, 11, 0.40)";
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(tipX, tipY);
          ctx.stroke();
        }

        // Vẽ thẻ Capsule tọa độ bên cạnh ngọn vector x (đặt vị trí thông minh)
        const c1Text = formatScalar(c1);
        const c2Text = formatScalar(c2);
        const capX = tipX + 16;
        const capY = tipY - 24;

        ctx.fillStyle = isDark ? "rgba(15, 23, 42, 0.94)" : "rgba(255, 255, 255, 0.96)";
        ctx.strokeStyle = isDark ? "#334155" : "#cbd5e1";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        const capW = isDegenerate ? 116 : 94;
        ctx.roundRect(capX, capY, capW, 46, 4);
        ctx.fill();
        ctx.stroke();

        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.fillStyle = isDark ? "#f8fafc" : "#0f172a";
        ctx.fillText(`[${tName}]_B =`, capX + 8, capY + 19);

        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.fillStyle = "#10b981";
        ctx.fillText(c1Text, capX + 64, capY + 16);

        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.fillStyle = "#0284c7";
        ctx.fillText(c2Text, capX + 64, capY + 33);

        if (isDegenerate) {
          ctx.font = "italic 9.5px system-ui, sans-serif";
          ctx.fillStyle = "#f59e0b";
          ctx.fillText("(Suy biến)", capX + 8, capY + 36);
        }
      }

      // Vòng tròn highlight ngọn vector x
      ctx.fillStyle = "rgba(245, 158, 11, 0.35)";
      ctx.beginPath();
      ctx.arc(tipX, tipY, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f59e0b";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    },

    // =========================================================================
    // 3D THREE.JS RENDERING
    // =========================================================================
    _coord3DGroup: null,

    destroy3D() {
      if (this._coord3DGroup) {
        if (this._coord3DGroup.parent) {
          this._coord3DGroup.parent.remove(this._coord3DGroup);
        }
        this._coord3DGroup.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose?.();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
            else obj.material.dispose?.();
          }
        });
        this._coord3DGroup = null;
      }
    },

    render3D(mathGroup) {
      if (!this._active || !mathGroup || App.mode !== "3D" || !this._solution || !this._solution.solvable) return;
      if (typeof THREE === "undefined" || !window.Vec3D) return;

      this.destroy3D();

      const g = new THREE.Group();
      g.name = "coordSubspaceGroup3D";
      this._coord3DGroup = g;
      mathGroup.add(g);

      const u = Vec3D.S3D.unitsPerWorld || 1;
      const Lw = Vec3D._axisMaxWorld || 20;
      const curPhase = this._currentPhase;
      const p = this._phaseProgress;

      const target = this._targetItem.vec;
      const b1 = this._basisItems[0].vec;
      const b2 = this._basisItems[1].vec;
      const b3 = this._basisItems[2] ? this._basisItems[2].vec : [0, 0, 1];
      const coeffs = this._solution.coeffs;
      const is3D = this._solution.dim === 3;

      const vT = new THREE.Vector3(target[0] * u, target[1] * u, (target[2] || 0) * u);
      const vB1 = new THREE.Vector3(b1[0] * u, b1[1] * u, (b1[2] || 0) * u);
      const vB2 = new THREE.Vector3(b2[0] * u, b2[1] * u, (b2[2] || 0) * u);
      const vB3 = new THREE.Vector3(b3[0] * u, b3[1] * u, (b3[2] || 0) * u);
      const vO = new THREE.Vector3(0, 0, 0);

      const vP1 = vB1.clone().multiplyScalar(coeffs[0]);
      const vP2 = vB2.clone().multiplyScalar(coeffs[1]);
      const vP3 = is3D ? vB3.clone().multiplyScalar(coeffs[2]) : new THREE.Vector3(0, 0, 0);

      // Helper tạo đường thẳng Three.js
      const makeLine = (pA, pB, colorHex, opacity = 1.0, dashed = false) => {
        const geom = new THREE.BufferGeometry().setFromPoints([pA, pB]);
        let mat;
        if (dashed) {
          mat = new THREE.LineDashedMaterial({ color: colorHex, dashSize: 0.8 * u, gapSize: 0.4 * u, transparent: true, opacity });
        } else {
          mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity });
        }
        const line = new THREE.Line(geom, mat);
        if (dashed) line.computeLineDistances();
        return line;
      };

      // Helper tạo quad mesh
      const makeQuadMesh = (c0, c1, c2, c3, colorHex, opacity = 0.15) => {
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
          depthWrite: false
        });
        return new THREE.Mesh(geom, mat);
      };

      // 1. Trục cơ sở không gian
      const dir1 = vB1.clone().normalize();
      const dir2 = vB2.clone().normalize();
      g.add(makeLine(dir1.clone().multiplyScalar(-Lw * 1.5), dir1.clone().multiplyScalar(Lw * 1.5), 0x10b981, 0.45, true));
      g.add(makeLine(dir2.clone().multiplyScalar(-Lw * 1.5), dir2.clone().multiplyScalar(Lw * 1.5), 0x0284c7, 0.45, true));
      if (is3D) {
        const dir3 = vB3.clone().normalize();
        g.add(makeLine(dir3.clone().multiplyScalar(-Lw * 1.5), dir3.clone().multiplyScalar(Lw * 1.5), 0x8b5cf6, 0.45, true));
      }

      // 2. Pha 2: Tia chiếu song song hạ từ ngọn x
      if (curPhase >= 1) {
        const factor2 = curPhase === 1 ? p * p * (3 - 2 * p) : 1.0;
        const curRay1 = vT.clone().lerp(vP1, factor2);
        const curRay2 = vT.clone().lerp(vP2, factor2);
        g.add(makeLine(vT, curRay1, 0xf59e0b, 0.85, true));
        g.add(makeLine(vT, curRay2, 0xf59e0b, 0.85, true));
        if (is3D) {
          const curRay3 = vT.clone().lerp(vP3, factor2);
          g.add(makeLine(vT, curRay3, 0xf59e0b, 0.85, true));
        }

        // Đoạn thành phần trên trục
        g.add(makeLine(vO, vP1.clone().multiplyScalar(factor2), 0x10b981, 0.95));
        g.add(makeLine(vO, vP2.clone().multiplyScalar(factor2), 0x0284c7, 0.95));
        if (is3D) {
          g.add(makeLine(vO, vP3.clone().multiplyScalar(factor2), 0x8b5cf6, 0.95));
        }
      }

      // 3. Pha 3: Hành trình bước chân nối đuôi 3D
      if (curPhase >= 2) {
        const factor3 = curPhase === 2 ? p : 1.0;
        if (!is3D) {
          // 2D trong không gian 3D: O -> P1 -> vT
          const p1Ratio = Math.min(1.0, factor3 * 2);
          g.add(makeLine(vO, vO.clone().lerp(vP1, p1Ratio), 0x10b981, 1.0));
          if (factor3 > 0.5) {
            const p2Ratio = Math.min(1.0, (factor3 - 0.5) * 2);
            g.add(makeLine(vP1, vP1.clone().lerp(vT, p2Ratio), 0x0284c7, 1.0));
          }
        } else {
          // 3D: O -> P1 -> (P1 + P2) -> vT
          const vP12 = vP1.clone().add(vP2);
          const r1 = Math.min(1.0, factor3 * 3);
          g.add(makeLine(vO, vO.clone().lerp(vP1, r1), 0x10b981, 1.0));
          if (factor3 > 0.33) {
            const r2 = Math.min(1.0, (factor3 - 0.33) * 3);
            g.add(makeLine(vP1, vP1.clone().lerp(vP12, r2), 0x0284c7, 1.0));
          }
          if (factor3 > 0.66) {
            const r3 = Math.min(1.0, (factor3 - 0.66) * 3);
            g.add(makeLine(vP12, vP12.clone().lerp(vT, r3), 0x8b5cf6, 1.0));
          }
        }
      }

      // 4. Pha 4: Kết tinh Khối hình học
      if (curPhase >= 3) {
        if (!is3D) {
          // Hình bình hành 2D trong 3D
          g.add(makeQuadMesh(vO, vP1, vT, vP2, 0x10b981, 0.15));
        } else {
          // Khối hộp Parallelepiped 3D (8 đỉnh)
          const c000 = vO;
          const c100 = vP1.clone();
          const c010 = vP2.clone();
          const c110 = vP1.clone().add(vP2);
          const c001 = vP3.clone();
          const c101 = vP1.clone().add(vP3);
          const c011 = vP2.clone().add(vP3);
          const c111 = vT;

          // 6 mặt mờ
          g.add(makeQuadMesh(c000, c100, c110, c010, 0x10b981, 0.08));
          g.add(makeQuadMesh(c001, c101, c111, c011, 0x10b981, 0.08));
          g.add(makeQuadMesh(c000, c100, c101, c001, 0x10b981, 0.08));
          g.add(makeQuadMesh(c010, c110, c111, c011, 0x10b981, 0.08));
          g.add(makeQuadMesh(c000, c010, c011, c001, 0x10b981, 0.08));
          g.add(makeQuadMesh(c100, c110, c111, c101, 0x10b981, 0.08));

          // 12 cạnh khung
          const boxEdges = [
            c000, c100, c100, c110, c110, c010, c010, c000,
            c001, c101, c101, c111, c111, c011, c011, c001,
            c000, c001, c100, c101, c110, c111, c010, c011
          ];
          const edgeGeom = new THREE.BufferGeometry().setFromPoints(boxEdges);
          const edgeMat = new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.65 });
          g.add(new THREE.LineSegments(edgeGeom, edgeMat));
        }
      }
    }
  };

  App.CoordAnimator = CoordAnimator;
})();
