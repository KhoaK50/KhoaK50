// ==================================================================================
// COORDINATE PLAYBACK ENGINE (ACADEMIC ARCHITECTURE)
// Trực quan hóa Tọa độ của Vector đối với Cơ sở [x]_B (2D Canvas & 3D Three.js)
// Kịch bản 4 Bước Động học Chuẩn Bản chất Đại số Tuyến tính:
//   Bước 1: Thiết lập 2 vector cơ sở làm vector đơn vị & Quét ô đơn vị của Không gian mới
//   Bước 2: Mở rộng mặt lưới Không gian mới theo đơn vị cơ sở B tràn toàn màn hình
//   Bước 3: Biến đổi Không gian - Dời 2 vector cơ sở cùng mặt lưới mới về đúng trục đơn vị
//           (1, 0), (0, 1) của không gian cũ, kéo vector chỉ định về vị trí tọa độ mới
//   Bước 4: Hoàn tất Không gian mới trên hệ trục - Nhìn trực tiếp tọa độ mới [x]_B = (c_1, c_2)^T
// ==================================================================================
(function () {
  window.App = window.App || {};

  // --- HÀM TOÁN HỌC & ĐẠI SỐ TUYẾN TÍNH CHUẨN TẮC ---
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

  function formatLinearComboText(coeffs, basisItems) {
    const parts = [];
    for (let i = 0; i < coeffs.length; i++) {
      const c = coeffs[i];
      const bName = formatMathName(getVectorDisplayName(basisItems[i], i + 1));
      const cStr = formatScalar(Math.abs(c));
      const sign = c < -1e-4 ? "-" : "+";
      if (i === 0) {
        parts.push(`${c < -1e-4 ? "-" : ""}${cStr}${bName}`);
      } else {
        parts.push(`${sign} ${cStr}${bName}`);
      }
    }
    return parts.join(" ");
  }

  // Giải hệ phương trình tìm tọa độ [x]_B = (c_1, c_2, ...)^T hỗ trợ đầy đủ 2D và 3D
  function solveCoordinates(targetVecRaw, basisItems) {
    const target = to3D(targetVecRaw);
    const r = basisItems.length;

    if (r === 2) {
      const b1 = to3D(basisItems[0].vec || basisItems[0]);
      const b2 = to3D(basisItems[1].vec || basisItems[1]);
      const isPure2D =
        Math.abs(b1[2]) < 1e-6 &&
        Math.abs(b2[2]) < 1e-6 &&
        Math.abs(target[2]) < 1e-6;

      if (isPure2D) {
        const det = b1[0] * b2[1] - b1[1] * b2[0];
        if (Math.abs(det) < 1e-7) {
          return {
            solvable: false,
            error: "Hệ hai vector cơ sở cùng phương (det = 0), không tạo thành cơ sở."
          };
        }
        const c1 = (target[0] * b2[1] - target[1] * b2[0]) / det;
        const c2 = (b1[0] * target[1] - b1[1] * target[0]) / det;
        return {
          solvable: true,
          dim: 2,
          coeffs: [c1, c2],
          p1: [c1 * b1[0], c1 * b1[1], 0],
          p2: [c2 * b2[0], c2 * b2[1], 0],
          residual: 0
        };
      }

      // Hệ 2 vector cơ sở trong không gian 3D (Dùng ma trận Gram)
      const g11 = dot(b1, b1);
      const g12 = dot(b1, b2);
      const g22 = dot(b2, b2);
      const detG = g11 * g22 - g12 * g12;
      if (Math.abs(detG) < 1e-8) {
        return {
          solvable: false,
          error: "Hệ hai vector cơ sở phụ thuộc tuyến tính (det = 0)."
        };
      }
      const rhs1 = dot(b1, target);
      const rhs2 = dot(b2, target);
      const c1 = (g22 * rhs1 - g12 * rhs2) / detG;
      const c2 = (g11 * rhs2 - g12 * rhs1) / detG;
      const proj = [
        c1 * b1[0] + c2 * b2[0],
        c1 * b1[1] + c2 * b2[1],
        c1 * b1[2] + c2 * b2[2]
      ];
      const res = norm([target[0] - proj[0], target[1] - proj[1], target[2] - proj[2]]);
      if (res > 1e-3 && App.mode === "3D") {
        return {
          solvable: false,
          error: "Vector đích không nằm trong mặt phẳng không gian con span(B)."
        };
      }
      return {
        solvable: true,
        dim: 2,
        coeffs: [c1, c2],
        p1: [c1 * b1[0], c1 * b1[1], c1 * b1[2]],
        p2: [c2 * b2[0], c2 * b2[1], c2 * b2[2]],
        residual: res
      };
    }

    if (r === 3) {
      const b1 = to3D(basisItems[0].vec || basisItems[0]);
      const b2 = to3D(basisItems[1].vec || basisItems[1]);
      const b3 = to3D(basisItems[2].vec || basisItems[2]);
      const b2xb3 = cross(b2, b3);
      const det = dot(b1, b2xb3);
      if (Math.abs(det) < 1e-7) {
        return {
          solvable: false,
          error: "Hệ ba vector cơ sở đồng phẳng trong không gian 3D (det = 0)."
        };
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
        p3: [c3 * b3[0], c3 * b3[1], c3 * b3[2]],
        residual: 0
      };
    }

    return {
      solvable: false,
      error: "Số lượng vector cơ sở phải là 2 (trong 2D) hoặc 3 (trong 3D)."
    };
  }

  // Định nghĩa khung thông tin 4 bước sư phạm
  const PHASES_INFO = [
    {
      index: 0,
      title: "Bước 1/4: Thiết lập Ô đơn vị của Không gian mới B",
      desc: "Hai vector cơ sở được chọn đóng vai trò là hai vector đơn vị của không gian mới, quét thành ô hình bình hành đơn vị tại gốc O."
    },
    {
      index: 1,
      title: "Bước 2/4: Mở rộng Mặt lưới Không gian mới",
      desc: "Từ ô đơn vị cơ sở, mặt lưới của không gian mới dãn nở phủ toàn bộ mặt phẳng với hai vector cơ sở là thước đo đơn vị."
    },
    {
      index: 2,
      title: "Bước 3/4: Dời 2 vector cơ sở cùng Không gian mới về trục chuẩn",
      desc: "Hai vector cơ sở (vector đơn vị của không gian mới) cùng toàn bộ mặt lưới và vector chỉ định biến đổi đồng thời về đúng trục đơn vị của không gian cũ."
    },
    {
      index: 3,
      title: "Bước 4/4: Nhìn trực tiếp Tọa độ mới trên Không gian mới",
      desc: "Khi hai vector cơ sở đã nằm tại mốc đơn vị (1, 0) và (0, 1) trên trục, vị trí của vector chỉ định trên mặt lưới mới cho thấy trực tiếp tọa độ [x]B."
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
    _origTargetVec: null,
    _origBasisVecs: [],
    _solution: null,
    _snapshot: null,
    _lastSig: "",

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

    _computeVecSignature() {
      if (!this._origTargetVec || !this._origBasisVecs.length) return "";
      const t = this._origTargetVec || [];
      const bStr = this._origBasisVecs
        .map((b) => (b || []).map((n) => Number(n || 0).toFixed(4)).join(","))
        .join("|");
      return `${t.map((n) => Number(n || 0).toFixed(4)).join(",")}::${bStr}`;
    },

    syncLiveCoordinates() {
      if (!this._active || !this._targetItem || !this._basisItems.length) return false;
      const list = App.vectorList || [];
      const targetAlive = list.some((v) => v && v.id === this._targetItem.id && v.visible !== false);
      const basisAlive = this._basisItems.every((b) => b && list.some((v) => v && v.id === b.id && v.visible !== false));
      if (!targetAlive || !basisAlive) {
        if (typeof App.stopCoordAnimation === "function") {
          App.stopCoordAnimation();
        } else {
          this.stop();
        }
        return false;
      }
      const sig = this._computeVecSignature();
      if (sig === this._lastSig && this._solution) return true;
      this._lastSig = sig;
      const basisRefs = this._origBasisVecs.map((v) => ({ vec: v }));
      const newSol = solveCoordinates(this._origTargetVec, basisRefs);
      this._solution = newSol;
      this.updateDynamicStepText(this._currentPhase, this._phaseProgress);
      if (typeof App.onCoordLiveUpdate === "function") {
        App.onCoordLiveUpdate(this._targetItem, this._basisItems, newSol);
      }
      return true;
    },

    // Tiến độ biến đổi không gian dời 2 vector cơ sở và vector đích về trục chuẩn (Bước 3 & Bước 4)
    _getRectifyProgress(curPhase, p) {
      if (curPhase <= 1) return 0.0;
      if (curPhase === 2) return smoothstep(p);
      return 1.0;
    },

    // Cập nhật tọa độ hiển thị của các vector cơ sở và vector đích biến đổi cùng không gian mới
    _applySpaceTransformToVectors(curPhase, p) {
      if (!this._active || !this._solution || !this._solution.solvable) return;
      if (!this._origTargetVec || !this._origBasisVecs.length) return;

      const tRect = this._getRectifyProgress(curPhase, p);
      const is3D = this._solution.dim === 3;
      const coeffs = this._solution.coeffs;

      if (!is3D) {
        const b10 = this._origBasisVecs[0];
        const b20 = this._origBasisVecs[1];
        const x0 = this._origTargetVec;

        // b1(t) dời về (1, 0), b2(t) dời về (0, 1)
        const b1x = (1 - tRect) * Number(b10[0] || 0) + tRect * 1.0;
        const b1y = (1 - tRect) * Number(b10[1] || 0) + tRect * 0.0;
        const b2x = (1 - tRect) * Number(b20[0] || 0) + tRect * 0.0;
        const b2y = (1 - tRect) * Number(b20[1] || 0) + tRect * 1.0;

        // Vector chỉ định x(t) biến đổi cùng không gian: x(t) = c1*b1(t) + c2*b2(t) -> (c1, c2)
        const xtX = (1 - tRect) * Number(x0[0] || 0) + tRect * coeffs[0];
        const xtY = (1 - tRect) * Number(x0[1] || 0) + tRect * coeffs[1];

        if (this._basisItems[0] && Array.isArray(this._basisItems[0].vec)) {
          this._basisItems[0].vec[0] = b1x;
          this._basisItems[0].vec[1] = b1y;
        }
        if (this._basisItems[1] && Array.isArray(this._basisItems[1].vec)) {
          this._basisItems[1].vec[0] = b2x;
          this._basisItems[1].vec[1] = b2y;
        }
        if (this._targetItem && Array.isArray(this._targetItem.vec)) {
          this._targetItem.vec[0] = xtX;
          this._targetItem.vec[1] = xtY;
        }
      } else {
        const b10 = to3D(this._origBasisVecs[0]);
        const b20 = to3D(this._origBasisVecs[1]);
        const b30 = to3D(this._origBasisVecs[2]);
        const x0 = to3D(this._origTargetVec);

        const b1t = [
          (1 - tRect) * b10[0] + tRect * 1.0,
          (1 - tRect) * b10[1] + tRect * 0.0,
          (1 - tRect) * b10[2] + tRect * 0.0
        ];
        const b2t = [
          (1 - tRect) * b20[0] + tRect * 0.0,
          (1 - tRect) * b20[1] + tRect * 1.0,
          (1 - tRect) * b20[2] + tRect * 0.0
        ];
        const b3t = [
          (1 - tRect) * b30[0] + tRect * 0.0,
          (1 - tRect) * b30[1] + tRect * 0.0,
          (1 - tRect) * b30[2] + tRect * 1.0
        ];
        const xt = [
          (1 - tRect) * x0[0] + tRect * coeffs[0],
          (1 - tRect) * x0[1] + tRect * coeffs[1],
          (1 - tRect) * x0[2] + tRect * coeffs[2]
        ];

        if (this._basisItems[0] && Array.isArray(this._basisItems[0].vec)) {
          this._basisItems[0].vec[0] = b1t[0];
          this._basisItems[0].vec[1] = b1t[1];
          this._basisItems[0].vec[2] = b1t[2];
        }
        if (this._basisItems[1] && Array.isArray(this._basisItems[1].vec)) {
          this._basisItems[1].vec[0] = b2t[0];
          this._basisItems[1].vec[1] = b2t[1];
          this._basisItems[1].vec[2] = b2t[2];
        }
        if (this._basisItems[2] && Array.isArray(this._basisItems[2].vec)) {
          this._basisItems[2].vec[0] = b3t[0];
          this._basisItems[2].vec[1] = b3t[1];
          this._basisItems[2].vec[2] = b3t[2];
        }
        if (this._targetItem && Array.isArray(this._targetItem.vec)) {
          this._targetItem.vec[0] = xt[0];
          this._targetItem.vec[1] = xt[1];
          this._targetItem.vec[2] = xt[2];
        }
      }
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
        if (typeof App.showToast === "function") {
          App.showToast("Chưa chọn vector đích (x) cần tìm tọa độ!", "warning");
        }
        return false;
      }

      if (basisItems.length < 2) {
        if (typeof App.showToast === "function") {
          App.showToast("Cần chọn ít nhất 2 vector cơ sở!", "warning");
        }
        return false;
      }

      const has3D =
        [targetItem, ...basisItems].some(
          (it) => it.vec && it.vec.length >= 3 && Math.abs(it.vec[2] || 0) > 1e-5
        ) || basisItems.length >= 3;
      if (has3D && App.mode !== "3D" && typeof App.toggleMode === "function") {
        App.toggleMode();
      }

      const sol = solveCoordinates(targetItem.vec, basisItems);
      if (!sol.solvable) {
        if (typeof App.showToast === "function") {
          App.showToast(sol.error || "Không thể giải tọa độ!", "warning");
        }
        return false;
      }

      // Lưu snapshot trạng thái và tọa độ gốc theo tham chiếu đối tượng thực tế
      this._snapshot = (App.vectorList || []).map((v) => ({
        item: v,
        id: v.id,
        vec: Array.isArray(v.vec) ? [...v.vec] : [],
        colorCss: v.colorCss,
        colorHex: v.colorHex,
        haloCss: v.haloCss,
        alpha: v.alpha,
        visible: v.visible
      }));

      this._targetItem = targetItem;
      this._basisItems = basisItems;
      this._origTargetVec = Array.isArray(targetItem.vec) ? [...targetItem.vec] : [0, 0];
      this._origBasisVecs = basisItems.map((b) => (Array.isArray(b.vec) ? [...b.vec] : [0, 0]));
      this._solution = sol;
      this._lastSig = this._computeVecSignature();
      this._active = true;
      App._coordAnimActive = true;
      this._paused = false;
      this._currentPhase = 0;
      this._phaseProgress = 0;

      // Giữ nguyên màu định danh gốc của từng vector (không ép sang màu vàng/xanh gây hiểu lầm trộn màu)
      targetItem._coordColorCss = targetItem.colorCss || targetItem.colorHex || "#ef4444";
      targetItem._coordAlpha = 1.0;
      targetItem.haloCss = targetItem.colorCss || targetItem.colorHex || "#ef4444";

      basisItems.forEach((b) => {
        if (b.id !== targetItem.id) {
          b._coordColorCss = b.colorCss || b.colorHex || "#10b981";
          b._coordAlpha = 1.0;
          b.haloCss = b.colorCss || b.colorHex || "#10b981";
        }
      });

      // Làm mờ các vector không tham gia bài toán
      const usedIds = new Set([targetId, ...basisIds]);
      (App.vectorList || []).forEach((v) => {
        if (!usedIds.has(v.id)) {
          v._coordAlpha = 0.12;
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
      this._origTargetVec = null;
      this._origBasisVecs = [];
      this._solution = null;
      this._lastSig = "";

      this.updateSidebarUI();
      this.redraw();
    },

    restoreSnapshot() {
      if (!this._snapshot) return;
      this._snapshot.forEach((s) => {
        const it = s.item;
        if (!it) return;
        if (Array.isArray(s.vec) && Array.isArray(it.vec)) {
          for (let i = 0; i < s.vec.length; i++) {
            it.vec[i] = s.vec[i];
          }
          it.vec.length = s.vec.length;
        }
        it.colorCss = s.colorCss;
        it.colorHex = s.colorHex;
        it.haloCss = s.haloCss;
        it.alpha = s.alpha;
        it.visible = s.visible;
        delete it._coordColorCss;
        delete it._coordAlpha;
      });
      (App.vectorList || []).forEach((it) => {
        delete it._coordColorCss;
        delete it._coordAlpha;
      });
      this._snapshot = null;
      if (typeof App.renderVectorList === "function") App.renderVectorList(false);
    },

    togglePlay() {
      if (!this._active) return;
      const isFinished = this._currentPhase >= 3 && this._phaseProgress >= 0.99;
      if (this._paused || isFinished) {
        this.play();
      } else {
        this.pause();
      }
    },

    play() {
      if (!this._active) return;
      this._paused = false;
      if (this._currentPhase >= 3 && this._phaseProgress >= 0.99) {
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
      this._paused = false;
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
      this._phaseTimer = null;
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = null;

      this._currentPhase = Math.max(0, Math.min(3, phaseIdx));
      this._phaseProgress = this._paused ? 1.0 : 0.0;

      this._applySpaceTransformToVectors(this._currentPhase, this._phaseProgress);
      this.updateSidebarUI();
      this.runCurrentPhase();
    },

    runCurrentPhase() {
      if (!this._active) return;
      if (this._paused) {
        this._phaseProgress = 1.0;
        this._applySpaceTransformToVectors(this._currentPhase, 1.0);
        this.updateDynamicStepText(this._currentPhase, 1.0);
        this.redraw();
        return;
      }

      const baseDurations = [2200, 2600, 3200, 1800];
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

        this._applySpaceTransformToVectors(this._currentPhase, p);
        this.updateDynamicStepText(this._currentPhase, p);
        this.redraw();

        if (p < 1.0) {
          this._raf = requestAnimationFrame(stepLoop);
        } else {
          this._phaseProgress = 1.0;
          this._applySpaceTransformToVectors(this._currentPhase, 1.0);
          this.updateDynamicStepText(this._currentPhase, 1.0);
          this.redraw();

          if (this._currentPhase < 3) {
            this._phaseTimer = setTimeout(() => {
              if (this._active && !this._paused) {
                this.goToPhase(this._currentPhase + 1);
              }
            }, 360 / this._speed);
          } else {
            this._paused = true;
            this.updateSidebarUI();
          }
        }
      };

      this._raf = requestAnimationFrame(stepLoop);
    },

    redraw() {
      if (this._active) {
        this._applySpaceTransformToVectors(this._currentPhase, this._phaseProgress);
      }
      if (App.mode === "2D" && window.Vec2D) {
        Vec2D.draw2DAllVectors();
      } else if (window.Vec3D) {
        Vec3D.hardRefresh3D(false);
      }
    },

    // Cập nhật thuyết minh động trong thanh điều khiển bên trái (Không vẽ bất kỳ chữ nào lên đồ thị)
    updateDynamicStepText(curPhase, p) {
      const titleEl = document.getElementById("coordStepTitle");
      const descEl = document.getElementById("coordStepDesc");
      if (!titleEl || !descEl) return;

      if (!this._active || !this._targetItem || !this._basisItems.length) {
        const info = PHASES_INFO[curPhase] || PHASES_INFO[0];
        titleEl.textContent = formatMathName(info.title);
        descEl.textContent = info.desc;
        return;
      }

      const tName = formatMathName(getVectorDisplayName(this._targetItem, 0));
      const b1Name = formatMathName(getVectorDisplayName(this._basisItems[0], 1));
      const b2Name = formatMathName(getVectorDisplayName(this._basisItems[1], 2));
      const b3Name = this._basisItems[2] ? formatMathName(getVectorDisplayName(this._basisItems[2], 3)) : "";

      if (!this._solution || !this._solution.solvable) {
        titleEl.textContent = "Hệ cơ sở suy biến (det = 0)";
        descEl.textContent = this._solution?.error || "Các vector cơ sở phụ thuộc tuyến tính.";
        return;
      }

      const origTarget = to3D(this._origTargetVec || this._targetItem.vec);
      const x0Str = formatScalar(origTarget[0]);
      const y0Str = formatScalar(origTarget[1]);
      const z0Str = formatScalar(origTarget[2]);
      const is3D = this._solution.dim === 3;
      const stdTupleStr = is3D ? `${x0Str}, ${y0Str}, ${z0Str}` : `${x0Str}, ${y0Str}`;

      const coeffs = this._solution.coeffs;
      const comboStr = formatLinearComboText(coeffs, this._basisItems);
      const tupleStr = coeffs.map(formatScalar).join(", ");
      const isTargetInBasis = this._basisItems.some((b) => b.id === this._targetItem.id);
      const extraDegen = isTargetInBasis
        ? " Lưu ý: Vector chỉ định trùng với vector cơ sở nên nằm ngay tại mốc đơn vị trên trục."
        : "";

      if (curPhase === 0) {
        titleEl.textContent = `Bước 1/4: Thiết lập Ô đơn vị cơ sở B = {${b1Name}, ${b2Name}${b3Name ? `, ${b3Name}` : ""}}`;
        descEl.textContent = `Trên không gian gốc, ${tName} = (${stdTupleStr})ᵀ. Hai vector cơ sở ${b1Name}, ${b2Name} đóng vai trò là hai vector đơn vị của không gian mới và quét ra ô đơn vị cơ sở tại gốc O.`;
      } else if (curPhase === 1) {
        titleEl.textContent = `Bước 2/4: Dựng Mặt lưới Không gian mới theo (${b1Name}, ${b2Name})`;
        descEl.textContent = `Mặt lưới không gian mới dãn nở từ ô đơn vị cơ sở phủ toàn bộ mặt phẳng, nhận ${b1Name} và ${b2Name} làm thước đo đơn vị.`;
      } else if (curPhase === 2) {
        titleEl.textContent = `Bước 3/4: Dời (${b1Name}, ${b2Name}) cùng Không gian mới về trục chuẩn`;
        descEl.textContent = `Hai vector cơ sở ${b1Name}, ${b2Name} dời về đúng trục đơn vị (1, 0) và (0, 1) của không gian cũ, kéo toàn bộ mặt lưới và vector ${tName} biến đổi theo về vị trí (${tupleStr}).`;
      } else {
        titleEl.textContent = `Bước 4/4: Không gian mới hoàn tất - [${tName}]B = (${tupleStr})ᵀ`;
        descEl.textContent = `Trong không gian mới đã dời về hệ trục chuẩn, ${b1Name} là (1, 0), ${b2Name} là (0, 1), và ngọn của ${tName} chỉ trực tiếp vào tọa độ mới [${tName}]B = (${tupleStr})ᵀ (${tName} = ${comboStr}).${extraDegen}`;
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

    syncStepButtons() {
      this.updateSidebarUI();
    },

    updateSidebarUI() {
      this.bindSidebarControls();

      const wrap = document.getElementById("coordAnimControls");
      if (wrap) {
        wrap.style.display = this._active ? "flex" : "none";
      }

      const iconPlay = document.getElementById("iconCoordPlay");
      const btnPlay = document.getElementById("btnCoordPlay");
      const isFinished = this._currentPhase >= 3 && this._phaseProgress >= 0.99;
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

      const phaseBtns = document.querySelectorAll(".coord-phase-btn");
      phaseBtns.forEach((btn) => {
        const ph = parseInt(btn.dataset.phase, 10);
        if (ph === this._currentPhase) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });

      this.updateDynamicStepText(this._currentPhase, this._phaseProgress);

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
    // 2D CANVAS RENDERING (HOÀN TOÀN SẠCH SẼ - KHÔNG GHI CHÚ TRÊN ĐỒ THỊ, KHÔNG ĐƯỜNG GIÓNG)
    // =========================================================================
    _drawArrow(ctx, x1, y1, x2, y2, headLen = 9, width = 2.2, color = "#10b981", alpha = 1.0) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 4) return;
      const angle = Math.atan2(dy, dx);
      const actualHead = Math.min(headLen, len * 0.42);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - actualHead * Math.cos(angle - Math.PI / 7),
        y2 - actualHead * Math.sin(angle - Math.PI / 7)
      );
      ctx.lineTo(
        x2 - actualHead * Math.cos(angle + Math.PI / 7),
        y2 - actualHead * Math.sin(angle + Math.PI / 7)
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    // Vẽ hai trục cơ sở và các vạch chia đơn vị rõ nét của Không gian mới (Không vẽ chữ trên đồ thị)
    _drawNewSpaceAxes2D(ctx, cx, cy, w, h, d1x, d1y, d2x, d2y, isDark) {
      const diag = Math.hypot(w, h) * 1.5;
      const len1 = Math.hypot(d1x, d1y);
      const len2 = Math.hypot(d2x, d2y);

      if (len1 > 1.5) {
        const u1x = d1x / len1;
        const u1y = d1y / len1;
        ctx.beginPath();
        ctx.moveTo(cx - u1x * diag, cy - u1y * diag);
        ctx.lineTo(cx + u1x * diag, cy + u1y * diag);
        ctx.strokeStyle = isDark ? "rgba(16, 185, 129, 0.90)" : "rgba(5, 150, 105, 0.85)";
        ctx.lineWidth = 1.9;
        ctx.setLineDash([8, 4]);
        ctx.stroke();

        const stepTick1 = Math.max(1, Math.ceil(30 / Math.max(1e-4, len1)));
        const maxTick1 = Math.min(40 * stepTick1, Math.ceil(diag / Math.max(1e-4, len1)));
        ctx.setLineDash([]);
        ctx.strokeStyle = isDark ? "rgba(52, 211, 153, 0.92)" : "rgba(5, 150, 105, 0.85)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let m = -maxTick1; m <= maxTick1; m += stepTick1) {
          if (m === 0) continue;
          const tx = cx + m * d1x;
          const ty = cy + m * d1y;
          if (tx >= -50 && tx <= w + 50 && ty >= -50 && ty <= h + 50) {
            const nx = -u1y * 5;
            const ny = u1x * 5;
            ctx.moveTo(tx - nx, ty - ny);
            ctx.lineTo(tx + nx, ty + ny);
          }
        }
        ctx.stroke();
      }

      if (len2 > 1.5) {
        const u2x = d2x / len2;
        const u2y = d2y / len2;
        ctx.beginPath();
        ctx.moveTo(cx - u2x * diag, cy - u2y * diag);
        ctx.lineTo(cx + u2x * diag, cy + u2y * diag);
        ctx.strokeStyle = isDark ? "rgba(56, 189, 248, 0.90)" : "rgba(2, 132, 199, 0.85)";
        ctx.lineWidth = 1.9;
        ctx.setLineDash([8, 4]);
        ctx.stroke();

        const stepTick2 = Math.max(1, Math.ceil(30 / Math.max(1e-4, len2)));
        const maxTick2 = Math.min(40 * stepTick2, Math.ceil(diag / Math.max(1e-4, len2)));
        ctx.setLineDash([]);
        ctx.strokeStyle = isDark ? "rgba(56, 189, 248, 0.92)" : "rgba(2, 132, 199, 0.85)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let k = -maxTick2; k <= maxTick2; k += stepTick2) {
          if (k === 0) continue;
          const tx = cx + k * d2x;
          const ty = cy + k * d2y;
          if (tx >= -50 && tx <= w + 50 && ty >= -50 && ty <= h + 50) {
            const nx = -u2y * 5;
            const ny = u2x * 5;
            ctx.moveTo(tx - nx, ty - ny);
            ctx.lineTo(tx + nx, ty + ny);
          }
        }
        ctx.stroke();
      }

      // Gốc tọa độ O
      ctx.fillStyle = isDark ? "#34d399" : "#059669";
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isDark ? "rgba(52, 211, 153, 0.50)" : "rgba(5, 150, 105, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.stroke();
    },

    // Vẽ mặt lưới Affine của Không gian mới đậm nét, rõ ràng (đồng bộ chuẩn với bài toán Cơ sở)
    _drawFullSpaceGrid2D(ctx, cx, cy, w, h, d1x, d1y, d2x, d2y, isDark, expandScale = 1.0) {
      const det = d1x * d2y - d1y * d2x;
      if (Math.abs(det) < 8) return;

      const len1 = Math.hypot(d1x, d1y);
      const len2 = Math.hypot(d2x, d2y);

      const corners = [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: h },
        { x: 0, y: h }
      ];
      let maxC1 = 0;
      let maxC2 = 0;
      for (let k = 0; k < 4; k++) {
        const dx = corners[k].x - cx;
        const dy = corners[k].y - cy;
        const c1 = Math.abs((dx * d2y - dy * d2x) / det);
        const c2 = Math.abs((d1x * dy - d1y * dx) / det);
        if (c1 > maxC1) maxC1 = c1;
        if (c2 > maxC2) maxC2 = c2;
      }
      const R1Max = maxC1 + 0.8;
      const R2Max = maxC2 + 0.8;

      const absDet = Math.abs(det);
      const dPerp2 = absDet / Math.max(1e-4, len1);
      const dPerp1 = absDet / Math.max(1e-4, len2);
      const stepK = Math.max(1, Math.ceil(38 / Math.max(1e-4, dPerp2)));
      const stepM = Math.max(1, Math.ceil(38 / Math.max(1e-4, dPerp1)));

      if (expandScale < 0.995) {
        const s = expandScale;
        const curC1Min = -R1Max * s;
        const curC1Max = 1 + (R1Max - 1) * s;
        const curC2Min = -R2Max * s;
        const curC2Max = 1 + (R2Max - 1) * s;

        const pTopRight = { x: cx + curC1Max * d1x + curC2Max * d2x, y: cy + curC1Max * d1y + curC2Max * d2y };
        const pTopLeft  = { x: cx + curC1Min * d1x + curC2Max * d2x, y: cy + curC1Min * d1y + curC2Max * d2y };
        const pBotLeft  = { x: cx + curC1Min * d1x + curC2Min * d2x, y: cy + curC1Min * d1y + curC2Min * d2y };
        const pBotRight = { x: cx + curC1Max * d1x + curC2Min * d2x, y: cy + curC1Max * d1y + curC2Min * d2y };

        // Nền không gian mới đang dãn nở
        ctx.beginPath();
        ctx.moveTo(pTopRight.x, pTopRight.y);
        ctx.lineTo(pTopLeft.x, pTopLeft.y);
        ctx.lineTo(pBotLeft.x, pBotLeft.y);
        ctx.lineTo(pBotRight.x, pBotRight.y);
        ctx.closePath();
        ctx.fillStyle = isDark ? "rgba(16, 185, 129, 0.18)" : "rgba(16, 185, 129, 0.14)";
        ctx.fill();

        const kStart = Math.ceil(curC2Min / stepK) * stepK;
        const kEnd = Math.floor(curC2Max / stepK) * stepK;
        ctx.strokeStyle = isDark ? "rgba(16, 185, 129, 0.46)" : "rgba(5, 150, 105, 0.38)";
        ctx.lineWidth = 1.25;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        for (let k = kStart; k <= kEnd; k += stepK) {
          if (k === 0) continue;
          ctx.moveTo(cx + curC1Min * d1x + k * d2x, cy + curC1Min * d1y + k * d2y);
          ctx.lineTo(cx + curC1Max * d1x + k * d2x, cy + curC1Max * d1y + k * d2y);
        }
        ctx.stroke();

        const mStart = Math.ceil(curC1Min / stepM) * stepM;
        const mEnd = Math.floor(curC1Max / stepM) * stepM;
        ctx.strokeStyle = isDark ? "rgba(56, 189, 248, 0.44)" : "rgba(2, 132, 199, 0.36)";
        ctx.beginPath();
        for (let m = mStart; m <= mEnd; m += stepM) {
          if (m === 0) continue;
          ctx.moveTo(cx + m * d1x + curC2Min * d2x, cy + m * d1y + curC2Min * d2y);
          ctx.lineTo(cx + m * d1x + curC2Max * d2x, cy + m * d1y + curC2Max * d2y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Viền mép hình bình hành dãn nở
        ctx.strokeStyle = isDark ? "rgba(52, 211, 153, 0.90)" : "rgba(5, 150, 105, 0.85)";
        ctx.lineWidth = 2.0;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(pTopRight.x, pTopRight.y);
        ctx.lineTo(pTopLeft.x, pTopLeft.y);
        ctx.lineTo(pBotLeft.x, pBotLeft.y);
        ctx.lineTo(pBotRight.x, pBotRight.y);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Phủ nền màu không gian mới toàn màn hình
        const blanketAlpha = isDark ? 0.20 : 0.14;
        ctx.fillStyle = `rgba(16, 185, 129, ${blanketAlpha})`;
        ctx.fillRect(0, 0, w, h);

        const R1 = Math.ceil(R1Max) + 2;
        const R2 = Math.ceil(R2Max) + 2;
        const kLimit = Math.min(R2, 32 * stepK);
        const mLimit = Math.min(R1, 32 * stepM);

        // Họ đường lưới song song trục cơ sở 1 (rõ nét, không bị mờ)
        ctx.strokeStyle = isDark ? "rgba(16, 185, 129, 0.50)" : "rgba(5, 150, 105, 0.42)";
        ctx.lineWidth = 1.3;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        for (let k = -kLimit; k <= kLimit; k += stepK) {
          if (k === 0) continue;
          ctx.moveTo(cx - R1 * d1x + k * d2x, cy - R1 * d1y + k * d2y);
          ctx.lineTo(cx + R1 * d1x + k * d2x, cy + R1 * d1y + k * d2y);
        }
        ctx.stroke();

        // Họ đường lưới song song trục cơ sở 2 (rõ nét, phân biệt trực quan)
        ctx.strokeStyle = isDark ? "rgba(56, 189, 248, 0.48)" : "rgba(2, 132, 199, 0.40)";
        ctx.beginPath();
        for (let m = -mLimit; m <= mLimit; m += stepM) {
          if (m === 0) continue;
          ctx.moveTo(cx + m * d1x - R2 * d2x, cy + m * d1y - R2 * d2y);
          ctx.lineTo(cx + m * d1x + R2 * d2x, cy + m * d1y + R2 * d2y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },

    render2DSubspace(ctx, gridInfo) {
      if (!this._active || !gridInfo || App.mode !== "2D") return;
      if (!this.syncLiveCoordinates()) return;
      if (!this._solution || !this._solution.solvable) return;

      const curPhase = this._currentPhase;
      const p = this._phaseProgress;
      this._applySpaceTransformToVectors(curPhase, p);

      const { cx, cy, px } = gridInfo;
      const w = gridInfo.w || (ctx.canvas ? ctx.canvas.width / (window.devicePixelRatio || 1) : 1400);
      const h = gridInfo.h || (ctx.canvas ? ctx.canvas.height / (window.devicePixelRatio || 1) : 900);
      const isDark = document.body.classList.contains("dark");

      // Lấy tọa độ hiện thời của 2 vector cơ sở b1(t), b2(t) (đang biến đổi cùng không gian ở Bước 3 & 4)
      const b1 = this._basisItems[0].vec;
      const b2 = this._basisItems[1].vec;
      const d1x = b1[0] * px;
      const d1y = -b1[1] * px;
      const d2x = b2[0] * px;
      const d2y = -b2[1] * px;

      ctx.save();

      // 1. Vẽ hai trục cơ sở và vạch chia đơn vị của không gian mới
      this._drawNewSpaceAxes2D(ctx, cx, cy, w, h, d1x, d1y, d2x, d2y, isDark);

      // =====================================================================
      // BƯỚC 1 (curPhase === 0): QUÉT Ô ĐƠN VỊ CỦA KHÔNG GIAN MỚI B
      // =====================================================================
      if (curPhase === 0) {
        const s = smoothstep(p);
        const curC2 = s;

        // Tô diện tích ô hình bình hành đơn vị (1, 1)_B đang được quét ra
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + d1x, cy + d1y);
        ctx.lineTo(cx + d1x + curC2 * d2x, cy + d1y + curC2 * d2y);
        ctx.lineTo(cx + curC2 * d2x, cy + curC2 * d2y);
        ctx.closePath();
        ctx.fillStyle = isDark ? "rgba(16, 185, 129, 0.22)" : "rgba(16, 185, 129, 0.16)";
        ctx.fill();

        // Đoạn thẳng b1 đang trượt tịnh tiến dọc theo b2
        ctx.strokeStyle = isDark ? "#34d399" : "#059669";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(cx + curC2 * d2x, cy + curC2 * d2y);
        ctx.lineTo(cx + d1x + curC2 * d2x, cy + d1y + curC2 * d2y);
        ctx.stroke();

        // Mũi tên dẫn hướng trượt ở đầu ngọn
        this._drawArrow(
          ctx,
          cx + d1x,
          cy + d1y,
          cx + d1x + curC2 * d2x,
          cy + d1y + curC2 * d2y,
          9,
          1.8,
          isDark ? "#38bdf8" : "#0284c7",
          0.85
        );

        ctx.fillStyle = isDark ? "#38bdf8" : "#0284c7";
        ctx.beginPath();
        ctx.arc(cx + curC2 * d2x, cy + curC2 * d2y, 3.6, 0, Math.PI * 2);
        ctx.arc(cx + d1x + curC2 * d2x, cy + d1y + curC2 * d2y, 3.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // =====================================================================
      // BƯỚC 2 (curPhase === 1): DÃN NỞ MẶT LƯỚI KHÔNG GIAN MỚI TOÀN MÀN HÌNH
      // =====================================================================
      if (curPhase === 1) {
        const sExp = smoothstep(p);
        this._drawFullSpaceGrid2D(ctx, cx, cy, w, h, d1x, d1y, d2x, d2y, isDark, sExp);
      }

      // =====================================================================
      // BƯỚC 3 & BƯỚC 4 (curPhase >= 2): BIẾN ĐỔI KHÔNG GIAN CÙNG 2 VECTOR CƠ SỞ
      //   Dời (b1, b2) về đúng trục đơn vị (1, 0), (0, 1) của không gian cũ,
      //   kéo toàn bộ mặt lưới và vector chỉ định x về tọa độ mới (c1, c2)
      // =====================================================================
      if (curPhase >= 2) {
        this._drawFullSpaceGrid2D(ctx, cx, cy, w, h, d1x, d1y, d2x, d2y, isDark, 1.0);

        // Tô nhẹ ô đơn vị cơ sở [0, 1] x [0, 1] của không gian mới (đang xoay về ô vuông đơn vị tại gốc O)
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + d1x, cy + d1y);
        ctx.lineTo(cx + d1x + d2x, cy + d1y + d2y);
        ctx.lineTo(cx + d2x, cy + d2y);
        ctx.closePath();
        ctx.fillStyle = isDark ? "rgba(16, 185, 129, 0.16)" : "rgba(16, 185, 129, 0.12)";
        ctx.fill();
        ctx.strokeStyle = isDark ? "rgba(52, 211, 153, 0.75)" : "rgba(5, 150, 105, 0.68)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();
    },

    render2DProjections(ctx, gridInfo) {
      if (!this._active || !gridInfo || App.mode !== "2D") return;
      this.syncLiveCoordinates();
    },

    // =========================================================================
    // 3D THREE.JS RENDERING (ĐỒNG BỘ MÀU NỀN & DÃN NỞ TOÀN KHÔNG GIAN 3D)
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
      if (!this._active || !mathGroup || App.mode !== "3D") return;
      if (typeof THREE === "undefined" || !window.Vec3D) return;

      this.destroy3D();
      if (!this.syncLiveCoordinates()) return;
      if (!this._solution || !this._solution.solvable) return;

      const curPhase = this._currentPhase;
      const p = this._phaseProgress;
      this._applySpaceTransformToVectors(curPhase, p);

      const g = new THREE.Group();
      g.name = "coordSubspaceGroup3D";
      this._coord3DGroup = g;
      mathGroup.add(g);

      const u = Vec3D.S3D.unitsPerWorld || 1;
      const Lw = Vec3D._axisMaxWorld || 20;
      const Rplane = Lw * 1.8;

      // Quy đổi kích thước pixel trên màn hình sang tọa độ 3D theo khoảng cách camera (không bị phình to theo u)
      const vFOV = ((Vec3D._camera ? Vec3D._camera.fov : 24) * Math.PI) / 180;
      const screenH = Math.max(1, Vec3D._renderer?.domElement?.clientHeight || 760);
      const camDist = Vec3D._camera ? Vec3D._camera.position.length() : 25;
      const worldPerPx = (2 * Math.tan(vFOV / 2) * camDist) / screenH;

      const target = to3D(this._targetItem.vec);
      const b1 = to3D(this._basisItems[0].vec);
      const b2 = to3D(this._basisItems[1].vec);
      const b3 = this._basisItems[2] ? to3D(this._basisItems[2].vec) : [0, 0, 1];
      const coeffs = this._solution.coeffs;
      const is3D = this._solution.dim === 3 && this._basisItems.length >= 3;

      const len1 = Math.hypot(b1[0], b1[1], b1[2]);
      const len2 = Math.hypot(b2[0], b2[1], b2[2]);
      const len3 = Math.hypot(b3[0], b3[1], b3[2]);

      const vT = new THREE.Vector3(target[0] * u, target[1] * u, target[2] * u);
      const vB1 = new THREE.Vector3(b1[0] * u, b1[1] * u, b1[2] * u);
      const vB2 = new THREE.Vector3(b2[0] * u, b2[1] * u, b2[2] * u);
      const vB3 = new THREE.Vector3(b3[0] * u, b3[1] * u, b3[2] * u);
      const vO = new THREE.Vector3(0, 0, 0);

      const vP1 = vB1.clone().multiplyScalar(coeffs[0]);
      const vP2 = vB2.clone().multiplyScalar(coeffs[1]);
      const vP3 = is3D ? vB3.clone().multiplyScalar(coeffs[2]) : new THREE.Vector3(0, 0, 0);
      const vP12 = vP1.clone().add(vP2);

      const makeLine = (pA, pB, colorHex, opacity = 1.0, dashed = false) => {
        const geom = new THREE.BufferGeometry().setFromPoints([pA, pB]);
        let mat;
        if (dashed) {
          mat = new THREE.LineDashedMaterial({
            color: colorHex,
            dashSize: 12 * worldPerPx,
            gapSize: 7 * worldPerPx,
            transparent: true,
            opacity,
            depthWrite: false
          });
        } else {
          mat = new THREE.LineBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity,
            depthWrite: false
          });
        }
        const line = new THREE.Line(geom, mat);
        if (dashed) line.computeLineDistances();
        line.renderOrder = 2;
        return line;
      };

      const makeLineSegments = (pts, colorHex, opacity = 1.0, dashed = false) => {
        if (!pts || pts.length < 2) return null;
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        let mat;
        if (dashed) {
          mat = new THREE.LineDashedMaterial({
            color: colorHex,
            dashSize: 10 * worldPerPx,
            gapSize: 6 * worldPerPx,
            transparent: true,
            opacity,
            depthWrite: false
          });
        } else {
          mat = new THREE.LineBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity,
            depthWrite: false
          });
        }
        const segs = new THREE.LineSegments(geom, mat);
        if (dashed) segs.computeLineDistances();
        segs.renderOrder = 2;
        return segs;
      };

      const makeLineLoop = (pts, colorHex, opacity = 0.85) => {
        const closed = [...pts, pts[0]];
        const geom = new THREE.BufferGeometry().setFromPoints(closed);
        const mat = new THREE.LineBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity,
          depthWrite: false
        });
        const loop = new THREE.Line(geom, mat);
        loop.renderOrder = 3;
        return loop;
      };

      const makeMarker3D = (pos, radius, colorHex) => {
        const effRadius = Math.min(radius, 3.0 * worldPerPx);
        const geo = new THREE.SphereGeometry(effRadius, 14, 10);
        const mat = new THREE.MeshBasicMaterial({ color: colorHex, depthWrite: false });
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(pos);
        m.renderOrder = 5;
        return m;
      };

      const makeQuadMesh = (c0, c1, c2, c3, colorHex, opacity = 0.16) => {
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

      // 1. Trục không gian mới xuyên tâm O kèm vạch chia đơn vị
      const addAxisWithTicks = (vBasis, lenBasis, colorHex) => {
        if (lenBasis <= 1e-4) return;
        const dir = vBasis.clone().normalize();
        g.add(makeLine(dir.clone().multiplyScalar(-Lw), dir.clone().multiplyScalar(Lw), colorHex, 0.85, true));

        let upRef = new THREE.Vector3(0, 0, 1);
        if (Math.abs(dir.dot(upRef)) > 0.9) upRef = new THREE.Vector3(0, 1, 0);
        const perp = new THREE.Vector3().crossVectors(dir, upRef).normalize();
        const tickPts = [];
        const tickHalf = 4.5 * worldPerPx;
        const stepTick = Math.max(1, Math.ceil(1.2 / Math.max(0.1, lenBasis)));
        for (let k = -18; k <= 18; k += stepTick) {
          if (k === 0) continue;
          const dist = Math.abs(k) * lenBasis * u;
          if (dist <= Lw) {
            const center = dir.clone().multiplyScalar(k * lenBasis * u);
            tickPts.push(
              center.clone().addScaledVector(perp, -tickHalf),
              center.clone().addScaledVector(perp, tickHalf)
            );
          }
        }
        const ticks = makeLineSegments(tickPts, colorHex, 0.68, false);
        if (ticks) g.add(ticks);
      };

      addAxisWithTicks(vB1, len1, 0x10b981);
      addAxisWithTicks(vB2, len2, 0x38bdf8);
      if (is3D) addAxisWithTicks(vB3, len3, 0x10b981);

      // 2. BƯỚC 1 (curPhase === 0): Quét dựng ô đơn vị cơ sở tại gốc O
      if (curPhase === 0) {
        const s = smoothstep(p);
        if (!is3D || p < 0.5) {
          const s2 = is3D ? smoothstep(p * 2) : s;
          const curB2 = vB2.clone().multiplyScalar(s2);
          const V0 = vO;
          const V1 = vB1;
          const V2 = vB1.clone().add(curB2);
          const V3 = curB2;

          g.add(makeQuadMesh(V0, V1, V2, V3, 0x10b981, 0.24));
          g.add(makeLine(V3, V2, 0x34d399, 1.0, false));
          g.add(makeLine(V0, V3, 0x38bdf8, 0.85, false));
          g.add(makeLine(V1, V2, 0x38bdf8, 0.70, false));
          g.add(makeMarker3D(V3, 3.0 * worldPerPx, 0x38bdf8));
          g.add(makeMarker3D(V2, 3.0 * worldPerPx, 0x38bdf8));
        } else {
          // Nửa sau Bước 1 trong 3D: trượt mặt đáy dọc theo b3 tạo khối hộp đơn vị (1, 1, 1)_B
          const s3 = smoothstep((p - 0.5) * 2);
          const curB3 = vB3.clone().multiplyScalar(s3);
          const p000 = vO;
          const p100 = vB1.clone();
          const p010 = vB2.clone();
          const p110 = vB1.clone().add(vB2);
          const p001 = curB3.clone();
          const p101 = vB1.clone().add(curB3);
          const p011 = vB2.clone().add(curB3);
          const p111 = p110.clone().add(curB3);

          g.add(makeQuadMesh(p000, p100, p110, p010, 0x10b981, 0.18));
          g.add(makeQuadMesh(p001, p101, p111, p011, 0x38bdf8, 0.22));
          g.add(makeQuadMesh(p000, p100, p101, p001, 0x10b981, 0.14));
          g.add(makeQuadMesh(p100, p110, p111, p101, 0x10b981, 0.14));
          g.add(makeQuadMesh(p110, p010, p011, p111, 0x10b981, 0.14));
          g.add(makeQuadMesh(p010, p000, p001, p011, 0x10b981, 0.14));
          g.add(makeLineLoop([p001, p101, p111, p011], 0x38bdf8, 0.95));
        }
      }

      // 3. BƯỚC 2, 3, 4 (curPhase >= 1): Mặt phẳng & Không gian mới lan đều toàn khung nhìn 3D, giữ nguyên màu nền ngọc bích
      if (curPhase >= 1) {
        const sExp = curPhase === 1 ? smoothstep(p) : 1.0;
        const nVec = new THREE.Vector3().crossVectors(vB1, vB2);
        const lenNWorld = nVec.length();

        if (lenNWorld > 1e-5 && len1 > 1e-4 && len2 > 1e-4) {
          // Hệ trực chuẩn (u1, u2) trong mặt phẳng span(b1, b2) để mặt phẳng và lưới lan tỏa ĐỀU mọi hướng
          const u1 = vB1.clone().normalize();
          const nHat = nVec.clone().normalize();
          const u2 = new THREE.Vector3().crossVectors(nHat, u1).normalize();

          const R0 = Math.max(len1, len2) * 1.15 * u;
          const Rcur = R0 + (Rplane - R0) * sExp;

          // Nội suy mượt từ ô đơn vị [0,1]x[0,1] ở đầu Bước 2 sang mặt phẳng trực chuẩn toàn không gian Rplane
          const unitC00 = vO.clone();
          const unitC10 = vB1.clone();
          const unitC11 = vB1.clone().add(vB2);
          const unitC01 = vB2.clone();

          const fullC00 = u1.clone().multiplyScalar(-Rcur).addScaledVector(u2, -Rcur);
          const fullC10 = u1.clone().multiplyScalar(Rcur).addScaledVector(u2, -Rcur);
          const fullC11 = u1.clone().multiplyScalar(Rcur).addScaledVector(u2, Rcur);
          const fullC01 = u1.clone().multiplyScalar(-Rcur).addScaledVector(u2, Rcur);

          const blend = Math.min(1, sExp * 1.35);
          const C00 = unitC00.clone().lerp(fullC00, blend);
          const C10 = unitC10.clone().lerp(fullC10, blend);
          const C11 = unitC11.clone().lerp(fullC11, blend);
          const C01 = unitC01.clone().lerp(fullC01, blend);

          // A. LỚP MÀU NỀN KHÔNG GIAN MỚI (Không bao giờ bị mất màu khi sang Bước 2, 3, 4)
          const planeOpacity = is3D ? 0.12 : 0.18;
          g.add(makeQuadMesh(C00, C10, C11, C01, 0x10b981, planeOpacity));

          if (curPhase === 1 && sExp < 0.99) {
            g.add(makeLineLoop([C00, C10, C11, C01], 0x34d399, 0.85));
          }

          // B. MẠNG LƯỚI AFFINE LAN ĐỀU THEO BÁN KÍNH Rcur TRÊN TOÀN MẶT PHẲNG
          const curRm = Rcur / u;
          const b1dotb2 = b1[0] * b2[0] + b1[1] * b2[1] + b1[2] * b2[2];
          const lenN = lenNWorld / (u * u);

          const dPerp1 = (lenN / len1) * u;
          const stepK = Math.max(1, Math.ceil(1.2 / Math.max(0.08, dPerp1 / u)));
          const kMax = Math.min(36 * stepK, Math.floor((curRm * len1) / Math.max(1e-4, lenN)));
          const kLimit = Math.floor(kMax / stepK) * stepK;

          const gridLines1 = [];
          for (let k = -kLimit; k <= kLimit; k += stepK) {
            if (k === 0) continue;
            const discr = curRm * curRm * len1 * len1 - k * k * lenN * lenN;
            if (discr >= 0) {
              const sq = Math.sqrt(discr);
              const t1 = (-k * b1dotb2 - sq) / (len1 * len1);
              const t2 = (-k * b1dotb2 + sq) / (len1 * len1);
              gridLines1.push(
                vB1.clone().multiplyScalar(t1).addScaledVector(vB2, k),
                vB1.clone().multiplyScalar(t2).addScaledVector(vB2, k)
              );
            }
          }
          const gl1 = makeLineSegments(gridLines1, 0x10b981, is3D ? 0.34 : 0.44, true);
          if (gl1) g.add(gl1);

          const dPerp2 = (lenN / len2) * u;
          const stepM = Math.max(1, Math.ceil(1.2 / Math.max(0.08, dPerp2 / u)));
          const mMax = Math.min(36 * stepM, Math.floor((curRm * len2) / Math.max(1e-4, lenN)));
          const mLimit = Math.floor(mMax / stepM) * stepM;

          const gridLines2 = [];
          for (let m = -mLimit; m <= mLimit; m += stepM) {
            if (m === 0) continue;
            const discr = curRm * curRm * len2 * len2 - m * m * lenN * lenN;
            if (discr >= 0) {
              const sq = Math.sqrt(discr);
              const s1 = (-m * b1dotb2 - sq) / (len2 * len2);
              const s2 = (-m * b1dotb2 + sq) / (len2 * len2);
              gridLines2.push(
                vB1.clone().multiplyScalar(m).addScaledVector(vB2, s1),
                vB1.clone().multiplyScalar(m).addScaledVector(vB2, s2)
              );
            }
          }
          const gl2 = makeLineSegments(gridLines2, 0x38bdf8, is3D ? 0.30 : 0.40, true);
          if (gl2) g.add(gl2);
        }

        // C. NẾU LÀ HỆ CƠ SỞ 3 CHIỀU (dim = 3): Dãn nở đều khối không gian 3D & các lát cắt tầng affine
        if (is3D && len3 > 1e-4) {
          const W1 = Math.max(1e-4, len1 * u);
          const W2 = Math.max(1e-4, len2 * u);
          const W3 = Math.max(1e-4, len3 * u);
          const R1Max = Rplane / W1;
          const R2Max = Rplane / W2;
          const R3Max = Rplane / W3;

          const c1Min = -R1Max * sExp;
          const c1Max = 1 + (R1Max - 1) * sExp;
          const c2Min = -R2Max * sExp;
          const c2Max = 1 + (R2Max - 1) * sExp;
          const c3Min = -R3Max * sExp;
          const c3Max = 1 + (R3Max - 1) * sExp;

          const getCorner = (c1, c2, c3) =>
            vB1.clone().multiplyScalar(c1).addScaledVector(vB2, c2).addScaledVector(vB3, c3);

          const b000 = getCorner(c1Min, c2Min, c3Min);
          const b100 = getCorner(c1Max, c2Min, c3Min);
          const b010 = getCorner(c1Min, c2Max, c3Min);
          const b110 = getCorner(c1Max, c2Max, c3Min);
          const b001 = getCorner(c1Min, c2Min, c3Max);
          const b101 = getCorner(c1Max, c2Min, c3Max);
          const b011 = getCorner(c1Min, c2Max, c3Max);
          const b111 = getCorner(c1Max, c2Max, c3Max);

          const volFaceOp = curPhase === 1 ? 0.06 : 0.045;
          g.add(makeQuadMesh(b000, b100, b110, b010, 0x10b981, volFaceOp));
          g.add(makeQuadMesh(b001, b101, b111, b011, 0x10b981, volFaceOp));
          g.add(makeQuadMesh(b000, b100, b101, b001, 0x10b981, volFaceOp));
          g.add(makeQuadMesh(b010, b110, b111, b011, 0x10b981, volFaceOp));
          g.add(makeQuadMesh(b000, b010, b011, b001, 0x10b981, volFaceOp));
          g.add(makeQuadMesh(b100, b110, b111, b101, 0x10b981, volFaceOp));

          const outerEdges = [
            b000, b100, b100, b110, b110, b010, b010, b000,
            b001, b101, b101, b111, b111, b011, b011, b001,
            b000, b001, b100, b101, b110, b111, b010, b011
          ];
          const outerEdgesMesh = makeLineSegments(outerEdges, 0x34d399, curPhase === 1 ? 0.65 : 0.38, false);
          if (outerEdgesMesh) g.add(outerEdgesMesh);

          const stepSlice = Math.max(1, Math.ceil(2.5 / Math.max(0.1, len3)));
          const kStart3 = Math.ceil(c3Min / stepSlice) * stepSlice;
          const kEnd3 = Math.floor(c3Max / stepSlice) * stepSlice;
          const slicePairs = [];
          for (let k = kStart3; k <= kEnd3; k += stepSlice) {
            if (k === 0) continue;
            const s00 = getCorner(c1Min, c2Min, k);
            const s10 = getCorner(c1Max, c2Min, k);
            const s11 = getCorner(c1Max, c2Max, k);
            const s01 = getCorner(c1Min, c2Max, k);
            slicePairs.push(s00, s10, s10, s11, s11, s01, s01, s00);
          }
          const slicesMesh = makeLineSegments(slicePairs, 0x38bdf8, 0.24, true);
          if (slicesMesh) g.add(slicesMesh);
        }
      }

      // 4. BƯỚC 4 (curPhase >= 3): Khối hộp tọa độ của Không gian mới (6 mặt mesh chuẩn 3D)
      if (curPhase >= 3) {
        const crystP = smoothstep(p);
        if (!is3D) {
          g.add(makeQuadMesh(vO, vP1, vT, vP2, 0x10b981, 0.22 * crystP));
        } else {
          const c000 = vO;
          const c100 = vP1.clone();
          const c010 = vP2.clone();
          const c110 = vP12.clone();
          const c001 = vP3.clone();
          const c101 = vP1.clone().add(vP3);
          const c011 = vP2.clone().add(vP3);
          const c111 = vT;

          const faceOp = 0.11 * crystP;
          g.add(makeQuadMesh(c000, c100, c110, c010, 0x10b981, faceOp));
          g.add(makeQuadMesh(c001, c101, c111, c011, 0x10b981, faceOp));
          g.add(makeQuadMesh(c000, c100, c101, c001, 0x10b981, faceOp));
          g.add(makeQuadMesh(c010, c110, c111, c011, 0x10b981, faceOp));
          g.add(makeQuadMesh(c000, c010, c011, c001, 0x10b981, faceOp));
          g.add(makeQuadMesh(c100, c110, c111, c101, 0x10b981, faceOp));

          const boxEdges = [
            c000, c100, c100, c110, c110, c010, c010, c000,
            c001, c101, c101, c111, c111, c011, c011, c001,
            c000, c001, c100, c101, c110, c111, c010, c011
          ];
          const edgeMesh = makeLineSegments(boxEdges, 0x34d399, 0.72 * crystP, false);
          if (edgeMesh) g.add(edgeMesh);
        }
      }
    }
  };

  App.CoordAnimator = CoordAnimator;
  App.solveCoordinates = solveCoordinates;
})();
