// ==================================================================================
// LINEAR INDEPENDENCE PLAYBACK ENGINE - ACADEMIC GEOMETRIC ESSENCE
// Truc quan hoa ban chat Doc lap & Phu thuoc tuyen tinh (2D Canvas & 3D Three.js)
// Kich ban 3 buoc tien trien mo rong chieu khong gian sinh (Dimension Expansion):
//   Buoc 1: Khoi tao truc chi phuong 1D - span(v1)
//   Buoc 2: Khao sat chieu thu hai (v2) - Cung phuong (Phu thuoc) vs Mo rong mat phang 2D
//   Buoc 3: Phep thu tham nhap khong gian (v3, ...) - Roi vao mat phang 2D (Phu thuoc) vs Vuon ra 3D (Doc lap)
// Tuan thu triet de: Zero Canvas Prose, Zero Em-dash (\u2014), Bao toan du lieu tuyet doi.
// ==================================================================================
(function () {
  window.App = window.App || {};

  // --- HAM TOAN HOC THUAN TUY ---
  const safeRAF = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (cb) => setTimeout(() => cb(Date.now()), 16);
  const safeCAF = typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : (id) => clearTimeout(id);

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

  // --- BO CHON VECTOR AN TOAN (KHONG GAY BAN DU LIEU) ---
  function resolveSelectedItems(selectedItems) {
    const vList = Array.isArray(App.vectorList) ? App.vectorList.filter((v) => v && v.id > 0) : [];

    // 1. Neu truyen truc tiep mang doi tuong vector hop le tu App.vectorList
    if (
      Array.isArray(selectedItems) &&
      selectedItems.length > 0 &&
      selectedItems[0] &&
      typeof selectedItems[0] === "object" &&
      !Array.isArray(selectedItems[0]) &&
      selectedItems[0].id !== undefined
    ) {
      return selectedItems.filter((it) => vList.some((v) => v.id === it.id));
    }

    // 2. Uu tien doc tu checkbox duoc tick trong #indepChecklist
    const container = document.getElementById("indepChecklist");
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

    // 3. Neu truyen mang toa do, doi chieu so thuc voi App.vectorList
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
          return { id: -(idx + 100), vec: numVec, name: `v_${idx + 1}` };
        })
        .filter(Boolean);
      if (matched.length > 0) return matched;
    }

    // 4. Fallback: tu dong lay toi da 3 vector dau tien trong App.vectorList
    if (vList.length > 0) {
      const autoItems = vList.slice(0, 3);
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

  // --- THUAT TOAN MO RONG CHIEU KHONG GIAN SINH (DIMENSION GROWTH ENGINE) ---
  function analyzeDimensionGrowth(items) {
    const m = items.length;
    const vectors = items.map((it) => to3D(it.vec || it));
    const is3D = items.some((it) => (it.vec || it).length >= 3) || App.mode === "3D";
    const dimSpace = is3D ? 3 : 2;

    const v1 = vectors[0] || [0, 0, 0];
    const len1 = norm(v1);
    const isV1Zero = len1 < 1e-6;

    // Khoi tao ket qua phan tich
    let isIndependent = true;
    let rank = 0;
    let redundantIndex = -1;
    let failureStep = -1; // 0, 1, 2

    // Pha 1: Khao sat v1
    if (isV1Zero) {
      isIndependent = false;
      rank = 0;
      redundantIndex = 0;
      failureStep = 0;
    } else {
      rank = 1;
    }

    // Pha 2: Khao sat v2 doi voi span(v1)
    let isV2Collinear = false;
    let collinearRatio = 0;
    let v2 = null;
    let len2 = 0;
    let planeNormal = [0, 0, 1];
    let normCross12 = 0;

    if (m >= 2 && !isV1Zero) {
      v2 = vectors[1];
      len2 = norm(v2);
      if (len2 < 1e-6) {
        isV2Collinear = true;
        collinearRatio = 0;
      } else {
        const cr = cross(v1, v2);
        normCross12 = norm(cr);
        if (normCross12 < 1e-5 * Math.max(1e-4, len1 * len2)) {
          isV2Collinear = true;
          collinearRatio = dot(v2, v1) / (len1 * len1);
        } else {
          isV2Collinear = false;
          planeNormal = [cr[0] / normCross12, cr[1] / normCross12, cr[2] / normCross12];
        }
      }

      if (isV2Collinear) {
        isIndependent = false;
        if (redundantIndex === -1) {
          redundantIndex = 1;
          failureStep = 1;
        }
      } else {
        rank = 2;
      }
    }

    // Pha 3: Khao sat v3 doi voi span(v1, v2)
    let v3 = null;
    let isV3Coplanar = false;
    let decompC1 = 0;
    let decompC2 = 0;
    let projFoot3D = [0, 0, 0];
    let escapeVec3D = [0, 0, 0];
    let escapeDist = 0;

    if (m >= 3 && rank === 2 && !isV2Collinear) {
      v3 = vectors[2];
      if (!is3D) {
        // Trong 2D: moi vector thu 3 deu dong phang (R^2 chi toi da 2 chieu doc lap)
        isV3Coplanar = true;
        escapeDist = 0;
        const det2D = v1[0] * v2[1] - v1[1] * v2[0];
        if (Math.abs(det2D) > 1e-7) {
          decompC1 = (v3[0] * v2[1] - v3[1] * v2[0]) / det2D;
          decompC2 = (v1[0] * v3[1] - v1[1] * v3[0]) / det2D;
        }
        projFoot3D = [v3[0], v3[1], 0];
        escapeVec3D = [0, 0, 0];
      } else {
        // Trong 3D: he he so Gram 2x2 de tim hinh chieu truc giao len span(v1, v2)
        const g11 = dot(v1, v1);
        const g12 = dot(v1, v2);
        const g22 = dot(v2, v2);
        const detG = g11 * g22 - g12 * g12; // = ||v1 x v2||^2

        if (detG > 1e-8) {
          const b1Val = dot(v3, v1);
          const b2Val = dot(v3, v2);
          decompC1 = (b1Val * g22 - b2Val * g12) / detG;
          decompC2 = (g11 * b2Val - g12 * b1Val) / detG;
          projFoot3D = [
            decompC1 * v1[0] + decompC2 * v2[0],
            decompC1 * v1[1] + decompC2 * v2[1],
            decompC1 * v1[2] + decompC2 * v2[2]
          ];
          escapeVec3D = [
            v3[0] - projFoot3D[0],
            v3[1] - projFoot3D[1],
            v3[2] - projFoot3D[2]
          ];
          escapeDist = norm(escapeVec3D);
          isV3Coplanar = escapeDist < 1e-4;
        } else {
          isV3Coplanar = true;
          escapeDist = 0;
        }
      }

      if (isV3Coplanar) {
        isIndependent = false;
        if (redundantIndex === -1) {
          redundantIndex = 2;
          failureStep = 2;
        }
      } else {
        rank = 3;
      }
    } else if (m >= 4 && rank === 3) {
      // Trong R^3, vector thu 4 chac chan phu thuoc
      isIndependent = false;
      redundantIndex = 3;
      failureStep = 2;
    }

    return {
      m,
      dimSpace,
      is3D,
      vectors,
      items,
      isIndependent,
      rank,
      redundantIndex,
      failureStep,
      // Du lieu Pha 1
      v1,
      len1,
      isV1Zero,
      // Du lieu Pha 2
      v2,
      len2,
      isV2Collinear,
      collinearRatio,
      planeNormal,
      normCross12,
      // Du lieu Pha 3
      v3,
      isV3Coplanar,
      decompC1,
      decompC2,
      projFoot3D,
      escapeVec3D,
      escapeDist
    };
  }

  // =========================================================================
  // BO DIEU KHIEN HOAT CANH DOC LAP TUYEN TINH (App.IndepAnimator)
  // =========================================================================
  const IndepAnimator = {
    _active: false,
    _paused: false,
    _currentPhase: 0, // 0: Truc 1D, 1: Mat phang 2D, 2: Tham nhap 3D / Phan ra
    _phaseProgress: 0,
    _speed: 1.0,
    _phaseTimer: null,
    _raf: null,
    _analysis: null,
    _snapshot: null,
    _threeGroup: null,
    _savedCamPos3D: null,

    isActive() {
      return this._active;
    },

    getCurrentPhase() {
      return this._currentPhase;
    },

    getAnalysis() {
      return this._analysis;
    },

    _frame3DCameraIfNeeded() {
      if (!window.Vec3D || !Vec3D._camera || !Vec3D._controls || App.mode !== "3D" || !this._analysis) return;
      if (this._savedCamPos3D) return;
      this._savedCamPos3D = Vec3D._camera.position.clone();
      let maxReach = 3.0;
      for (const v of this._analysis.vectors) {
        maxReach = Math.max(maxReach, norm(v));
      }
      const u = (Vec3D.S3D && Vec3D.S3D.unitsPerWorld) || 1;
      const maxReachWorld = maxReach * u;
      const dist = Math.max(10.0, Math.min(32.0, maxReachWorld * 2.2));
      Vec3D._camera.position.set(dist * 1.15, dist * 0.72, dist * 0.85);
      Vec3D._camera.up.set(0, 0, 1);
      Vec3D._controls.target.set(0, 0, 0);
      Vec3D._camera.lookAt(0, 0, 0);
      Vec3D._controls.update();
      if (typeof Vec3D.addAxisLabelsDynamic === "function") {
        Vec3D.addAxisLabelsDynamic();
      }
    },

    start(selectedItems) {
      const items = resolveSelectedItems(selectedItems);
      if (!items || !items.length) {
        if (typeof App.showToast === "function") {
          App.showToast("Hãy tick chọn ít nhất 1 vector trong danh sách để trực quan!", "warning");
        }
        return false;
      }

      this.stop();

      const analysis = analyzeDimensionGrowth(items);
      this._analysis = analysis;

      // Luu snapshot do mo va trang thai vector nguoi dung
      this._snapshot = (App.vectorList || []).map((v) => ({
        id: v.id,
        visible: v.visible !== false,
        alpha: typeof v.alpha === "number" ? v.alpha : 1.0,
        colorCss: v.colorCss,
        colorHex: v.colorHex
      }));

      // Kich hoat che do 3D neu du lieu co 3 toa do
      if (analysis.is3D && App.mode !== "3D") {
        if (typeof App.setMode === "function") App.setMode("3D");
        else if (typeof App.toggleMode === "function") App.toggleMode();
      }

      this._savedCamPos3D = null;
      this._frame3DCameraIfNeeded();

      this.ensureControls();
      const wrap = document.getElementById("indepAnimControls");
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
      App._indepAnimActive = true;
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
      App._indepAnimActive = false;
      App.isAnimating = false;

      if (window.Vec2D && window.Vec2D.S2D) {
        window.Vec2D.S2D.draggedVectorId = null;
      }
      if (window.Vec3D && window.Vec3D.S3D) {
        window.Vec3D.S3D.draggedVectorId = null;
      }

      if (Array.isArray(App.vectorList)) {
        App.vectorList.forEach((v) => {
          delete v._indepColorCss;
          delete v._indepAlpha;
        });
      }

      // Don dep Three.js group sach se
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

      // Khoi phuc nguyen ven danh sach vector nguoi dung
      if (this._snapshot && Array.isArray(App.vectorList)) {
        for (const snap of this._snapshot) {
          const it = App.vectorList.find((v) => v.id === snap.id);
          if (it) {
            it.visible = snap.visible;
            it.alpha = snap.alpha;
            delete it._indepAlpha;
            delete it._indepColorCss;
          }
        }
      } else if (Array.isArray(App.vectorList)) {
        for (const it of App.vectorList) {
          delete it._indepAlpha;
          delete it._indepColorCss;
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

      // Thoi gian cho tung buoc: Buoc 1 (2.2s), Buoc 2 (5.2s), Buoc 3 (5.6s neu doc lap, 3.8s neu dong phang)
      const isPhase3Indep = this._analysis && this._analysis.m >= 3 && !this._analysis.isV3Coplanar && !this._analysis.isV2Collinear;
      const baseDurations = [2200, 5200, isPhase3Indep ? 5600 : 3800];
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
      if (!this._analysis || !Array.isArray(App.vectorList)) return;
      const an = this._analysis;

      const selectedIds = new Set(an.items.map((it) => it.id));

      App.vectorList.forEach((v) => {
        if (!selectedIds.has(v.id)) {
          v._indepAlpha = 0.2;
          v._indepColorCss = v.colorHex || v.colorCss || "#64748b";
          return;
        }

        const idx = an.items.findIndex((it) => it.id === v.id);
        const origCol = v.colorHex || v.colorCss || "#0284c7";

        if (phase === 0) {
          if (idx === 0) {
            v._indepAlpha = 1.0;
            v._indepColorCss = an.isV1Zero ? "#ef4444" : "#10b981";
          } else {
            v._indepAlpha = 0.45;
            v._indepColorCss = origCol;
          }
        } else if (phase === 1) {
          if (idx === 0) {
            v._indepAlpha = 1.0;
            v._indepColorCss = an.isV1Zero ? "#ef4444" : "#10b981";
          } else if (idx === 1) {
            v._indepAlpha = 1.0;
            v._indepColorCss = an.isV2Collinear ? "#f59e0b" : "#10b981";
          } else {
            v._indepAlpha = 0.45;
            v._indepColorCss = origCol;
          }
        } else {
          // Phase 2: Khao sat v3 va tong the
          if (idx === 0) {
            v._indepAlpha = 1.0;
            v._indepColorCss = an.isV1Zero ? "#ef4444" : "#10b981";
          } else if (idx === 1) {
            v._indepAlpha = 1.0;
            v._indepColorCss = an.isV2Collinear ? "#f59e0b" : "#10b981";
          } else if (idx === 2) {
            v._indepAlpha = 1.0;
            v._indepColorCss = an.isV3Coplanar ? "#f59e0b" : "#10b981";
          } else {
            v._indepAlpha = 0.85;
            v._indepColorCss = "#f59e0b"; // Moi vector thu 4 tro di deu phu thuoc tuyen tinh
          }
        }
      });
    },

    redraw() {
      if (App.mode === "2D" && window.Vec2D) {
        if (typeof Vec2D.draw2DAllVectors === "function") Vec2D.draw2DAllVectors();
        else if (typeof Vec2D.draw === "function") Vec2D.draw();
      } else if (window.Vec3D) {
        if (typeof Vec3D.hardRefresh3D === "function") Vec3D.hardRefresh3D(false);
        else if (typeof Vec3D.draw3DAllVectors === "function") {
          Vec3D.draw3DAllVectors();
          if (typeof Vec3D.renderOnce === "function") Vec3D.renderOnce();
        }
      }
    },

    // =========================================================================
    // HUD CONTROLS & SIDEBAR UI (ZERO EM-DASH, ANTI-SLOP)
    // =========================================================================
    ensureControls() {
      let wrap = document.getElementById("indepAnimControls");
      if (wrap) return wrap;

      const host = document.getElementById("linear_independence") || document.getElementById("result_indep");
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
          <button type="button" class="coord-phase-btn active" data-phase="0" title="Bước 1: Trục 1D">Bước 1</button>
          <button type="button" class="coord-phase-btn" data-phase="1" title="Bước 2: Chiều thứ hai">Bước 2</button>
          <button type="button" class="coord-phase-btn" data-phase="2" title="Bước 3: Thâm nhập / Phân rã">Bước 3</button>
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

        <div class="basis-step-explainer" id="indepStepExplainer" style="margin-top: 8px;">
          <div class="basis-step-title" id="indepStepTitle" style="font-size: 12.5px; font-weight: 700; color: var(--text-main, #0f172a);">Bước 1: Khởi tạo Trục 1D - span(v₁)</div>
          <div class="basis-step-desc" id="indepStepDesc" style="font-size: 12px; line-height: 1.5; color: var(--text-sub, #475569); margin-top: 4px;"></div>
        </div>
      `;

      const out = document.getElementById("result_indep");
      if (out && out.parentNode === host) {
        host.insertBefore(wrap, out);
      } else {
        host.appendChild(wrap);
      }

      this.bindControlsEvents(wrap);
      const initSlider = wrap.querySelector("#indepSpeedSlider");
      if (initSlider) {
        const min = parseFloat(initSlider.min) || 0.2;
        const max = parseFloat(initSlider.max) || 2.5;
        const val = parseFloat(initSlider.value) || 1.0;
        const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
        initSlider.style.setProperty("--slider-pct", `${pct.toFixed(1)}%`);
        initSlider.style.setProperty("--range-pct", `${pct.toFixed(1)}%`);
      }
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
        speedSlider.oninput = (e) => {
          const val = parseFloat(e.target.value);
          const min = parseFloat(e.target.min) || 0.2;
          const max = parseFloat(e.target.max) || 2.5;
          const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
          e.target.style.setProperty("--slider-pct", `${pct.toFixed(1)}%`);
          e.target.style.setProperty("--range-pct", `${pct.toFixed(1)}%`);
          this.setSpeed(val);
        };
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

      const pills = wrap.querySelectorAll("#indepPhasePills .coord-phase-btn");
      pills.forEach((pBtn, idx) => {
        pBtn.classList.toggle("active", idx === this._currentPhase);
      });

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

      const speedVal = wrap.querySelector("#indepSpeedValue");
      if (speedVal) speedVal.textContent = `${this._speed.toFixed(1)}×`;

      const speedSlider = wrap.querySelector("#indepSpeedSlider");
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

      const titleEl = wrap.querySelector("#indepStepTitle");
      const descEl = wrap.querySelector("#indepStepDesc");
      const an = this._analysis;
      if (!titleEl || !descEl || !an) return;

      const name1 = formatMathName(getVectorDisplayName(an.items[0], 1));
      const name2 = an.items[1] ? formatMathName(getVectorDisplayName(an.items[1], 2)) : "v₂";
      const name3 = an.items[2] ? formatMathName(getVectorDisplayName(an.items[2], 3)) : "v₃";

      if (this._currentPhase === 0) {
        titleEl.textContent = `Bước 1: Khởi tạo Trục 1D - span(${name1})`;
        if (an.isV1Zero) {
          descEl.innerHTML = `Vector <b>${name1} = [0, 0]</b> là vector không. Bất kỳ hệ nào chứa vector không đều <b>phụ thuộc tuyến tính</b> ngay lập tức.`;
        } else {
          descEl.innerHTML = `Vector <b>${name1}</b> xác lập đường thẳng không gian con 1 chiều: <b>span(${name1}) = { c · ${name1} | c ∈ ℝ }</b>.<br>Số chiều không gian ban đầu: <b>dim = 1</b>.`;
        }
      } else if (this._currentPhase === 1) {
        titleEl.textContent = `Bước 2: Khảo sát Chiều Thứ Hai - ${name2}`;
        if (an.m === 1) {
          descEl.innerHTML = `Hệ chỉ có 1 vector khác không duy nhất. Hệ hiển nhiên <b>độc lập tuyến tính</b> (dim = 1).`;
        } else if (an.isV2Collinear) {
          const ratioStr = formatScalar(an.collinearRatio);
          descEl.innerHTML = `Vector <b>${name2}</b> nằm bẹp trên đường thẳng <b>span(${name1})</b> (hệ số ${name2} = ${ratioStr}·${name1}).<br><span style="color: #ef4444; font-weight: 600;">Không mở rộng thêm chiều mới: Hệ phụ thuộc tuyến tính!</span>`;
        } else {
          descEl.innerHTML = `Vector <b>${name2}</b> trỏ sang hướng mới độc lập. Mặt phẳng <b>span(${name1}, ${name2})</b> lan tỏa và hợp nhất phủ kín không gian.<br><span style="color: #10b981; font-weight: 600;">Số chiều nâng cấp: dim = 2</span>.`;
        }
      } else if (this._currentPhase === 2) {
        titleEl.textContent = `Bước 3: Phép thử Thâm nhập Không gian - ${name3}`;
        if (an.m <= 2) {
          if (an.isIndependent) {
            descEl.innerHTML = `Hệ gồm <b>${an.m} vector độc lập tuyến tính</b> vững chắc, căng không gian con có số chiều cực đại <b>dim = ${an.rank}</b>.`;
          } else {
            descEl.innerHTML = `Hệ <b>phụ thuộc tuyến tính</b>, tồn tại vector dư thừa nằm giam hãm trên trục 1D trước đó.`;
          }
        } else if (an.isV2Collinear) {
          descEl.innerHTML = `Hệ đã <b>phụ thuộc tuyến tính</b> ngay từ cặp {${name1}, ${name2}}, việc thêm ${name3} không thể phục hồi tính độc lập.`;
        } else if (an.isV3Coplanar) {
          const c1Str = formatScalar(an.decompC1);
          const c2Str = formatScalar(an.decompC2);
          descEl.innerHTML = `Vector <b>${name3}</b> nằm trọn vẹn bên trong mặt phẳng <b>span(${name1}, ${name2})</b>.<br>Đường gióng phân rã chỉ rõ tổ hợp: <b>${name3} = ${c1Str}·${name1} + ${c2Str}·${name2}</b>.<br><span style="color: #ef4444; font-weight: 600;">Vector ${name3} dư thừa: Hệ phụ thuộc tuyến tính!</span>`;
        } else {
          const distStr = an.escapeDist.toFixed(2);
          descEl.innerHTML = `Vector <b>${name3}</b> đâm xiên nhô lên khỏi mặt phẳng 2D (khoảng cách h⊥ = ${distStr} > 0).<br>Không gian bừng nở thành <b>khối 3D toàn vẹn (dim = 3)</b>.<br><span style="color: #10b981; font-weight: 600;">Toàn bộ hệ 3 vector độc lập tuyến tính!</span>`;
        }
      }
    },

    // =========================================================================
    // 2D CANVAS RENDERING - PURE GEOMETRY (ZERO CANVAS PROSE)
    // =========================================================================
    render2DSubspace(ctx, gridInfo) {
      if (!this._active || !gridInfo || App.mode !== "2D" || !this._analysis) return;
      const { cx, cy, px } = gridInfo;
      const w = gridInfo.w || (ctx.canvas ? ctx.canvas.width / (window.devicePixelRatio || 1) : 1400);
      const h = gridInfo.h || (ctx.canvas ? ctx.canvas.height / (window.devicePixelRatio || 1) : 900);
      const isDark = document.body.classList.contains("dark");
      const diag = Math.hypot(w, h) * 1.5;
      const an = this._analysis;
      const p = smoothstep(this._phaseProgress);

      const b1 = an.v1;
      const d1x = b1[0] * px;
      const d1y = -b1[1] * px;
      const len1 = Math.hypot(d1x, d1y);
      const u1x = d1x / (len1 || 1);
      const u1y = d1y / (len1 || 1);

      ctx.save();

      // Ham tro giup ve mui ten chi huong truot
      const drawArrow = (fromX, fromY, toX, toY, color, width = 1.5) => {
        const headLen = 7;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 7), toY - headLen * Math.sin(angle - Math.PI / 7));
        ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 7), toY - headLen * Math.sin(angle + Math.PI / 7));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };

      // --- 1. VE TRUC 1D: span(v1) BAN RA TU GOC TOA DO ---
      if (an.len1 > 1e-6) {
        const curDiag = this._currentPhase === 0 ? Math.max(len1, diag * smoothstep(p / 0.7)) : diag;
        ctx.beginPath();
        ctx.moveTo(cx - u1x * curDiag, cy - u1y * curDiag);
        ctx.lineTo(cx + u1x * curDiag, cy + u1y * curDiag);
        ctx.strokeStyle = isDark ? "rgba(16, 185, 129, 0.85)" : "rgba(16, 185, 129, 0.75)";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([8, 4]);
        ctx.stroke();

        // Vach chia don vi tren truc span(v1)
        const stepTick1 = Math.max(1, Math.ceil(30 / Math.max(1e-4, len1)));
        const maxTick1 = Math.min(40 * stepTick1, Math.ceil(curDiag / Math.max(1e-4, len1)));
        ctx.setLineDash([]);
        ctx.strokeStyle = isDark ? "rgba(16, 185, 129, 0.80)" : "rgba(16, 185, 129, 0.70)";
        ctx.lineWidth = 1.2;
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

        // Goc toa do O
        ctx.fillStyle = isDark ? "#34d399" : "#059669";
        ctx.beginPath();
        ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- 2. VE MAT PHANG 2D LAN TOA HOAN CHINH (KHI v2 DOC LAP) ---
      if (an.m >= 2 && !an.isV2Collinear && this._currentPhase >= 1) {
        const b2 = an.v2;
        const d2x = b2[0] * px;
        const d2y = -b2[1] * px;
        const len2 = Math.hypot(d2x, d2y);
        const u2x = d2x / (len2 || 1);
        const u2y = d2y / (len2 || 1);

        // Truc span(v2)
        ctx.beginPath();
        ctx.moveTo(cx - u2x * diag, cy - u2y * diag);
        ctx.lineTo(cx + u2x * diag, cy + u2y * diag);
        ctx.strokeStyle = isDark ? "rgba(56, 189, 248, 0.85)" : "rgba(2, 132, 199, 0.75)";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([8, 4]);
        ctx.stroke();

        // Vach chia don vi tren truc span(v2)
        const stepTick2 = Math.max(1, Math.ceil(30 / Math.max(1e-4, len2)));
        const maxTick2 = Math.min(40 * stepTick2, Math.ceil(diag / Math.max(1e-4, len2)));
        ctx.setLineDash([]);
        ctx.strokeStyle = isDark ? "rgba(56, 189, 248, 0.80)" : "rgba(2, 132, 199, 0.70)";
        ctx.lineWidth = 1.2;
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

        const det = d1x * d2y - d1y * d2x;
        if (Math.abs(det) > 1e-6) {
          // Tinh ban kinh he so can thiet de phu kin 4 goc viewport
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
          const R1Max = maxC1 + 0.6;
          const R2Max = maxC2 + 0.6;

          if (this._currentPhase === 1) {
            if (p < 0.12) {
              // Giai doan 0: Quan sat 2 vector ban dau
            } else if (p < 0.42) {
              // GIAI DOAN 1: Doan thang v1 truot doc theo v2 quet hinh binh hanh co so (0.12 <= p < 0.42)
              const tSweep = (p - 0.12) / 0.30;
              const s = tSweep * tSweep * (3 - 2 * tSweep);
              const curC2 = s;

              // 1. Dien tich hinh binh hanh co so dang quet (mang mau ngoc bich nhe)
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.lineTo(cx + d1x, cy + d1y);
              ctx.lineTo(cx + d1x + curC2 * d2x, cy + d1y + curC2 * d2y);
              ctx.lineTo(cx + curC2 * d2x, cy + curC2 * d2y);
              ctx.closePath();
              ctx.fillStyle = isDark ? "rgba(16, 185, 129, 0.18)" : "rgba(16, 185, 129, 0.14)";
              ctx.fill();

              // 2. Canh day (O -> v1)
              ctx.strokeStyle = isDark ? "rgba(16, 185, 129, 0.65)" : "rgba(16, 185, 129, 0.55)";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.lineTo(cx + d1x, cy + d1y);
              ctx.stroke();

              // 3. Doan thang v1 DANG TRUOT TINH TIEN (Moving Segment) - Phat sang
              ctx.strokeStyle = isDark ? "#34d399" : "#059669";
              ctx.lineWidth = 2.5;
              ctx.shadowColor = "#10b981";
              ctx.shadowBlur = 8;
              ctx.beginPath();
              ctx.moveTo(cx + curC2 * d2x, cy + curC2 * d2y);
              ctx.lineTo(cx + d1x + curC2 * d2x, cy + d1y + curC2 * d2y);
              ctx.stroke();
              ctx.shadowBlur = 0;

              // 4. Ray dan huong truot doc theo v2
              drawArrow(cx, cy, cx + curC2 * d2x, cy + curC2 * d2y, isDark ? "#38bdf8" : "#0284c7", 2.2);
              drawArrow(cx + d1x, cy + d1y, cx + d1x + curC2 * d2x, cy + d1y + curC2 * d2y, isDark ? "rgba(56, 189, 248, 0.7)" : "rgba(2, 132, 199, 0.7)", 1.5);

              // 5. Hai diem mut dang truot
              ctx.fillStyle = isDark ? "#38bdf8" : "#0284c7";
              ctx.beginPath();
              ctx.arc(cx + curC2 * d2x, cy + curC2 * d2y, 4.5, 0, Math.PI * 2);
              ctx.arc(cx + d1x + curC2 * d2x, cy + d1y + curC2 * d2y, 4.5, 0, Math.PI * 2);
              ctx.fill();

            } else if (p < 0.95) {
              // GIAI DOAN 2: KHONG GIAN LAN TOA DAN NO RA 4 PHIA (0.42 <= p < 0.95)
              const tExp = (p - 0.42) / 0.53;
              const sExp = tExp * tExp * (3 - 2 * tExp);
              const curC1Min = -R1Max * sExp;
              const curC1Max = 1 + (R1Max - 1) * sExp;
              const curC2Min = -R2Max * sExp;
              const curC2Max = 1 + (R2Max - 1) * sExp;

              const pTR = { x: cx + curC1Max * d1x + curC2Max * d2x, y: cy + curC1Max * d1y + curC2Max * d2y };
              const pTL = { x: cx + curC1Min * d1x + curC2Max * d2x, y: cy + curC1Min * d1y + curC2Max * d2y };
              const pBL = { x: cx + curC1Min * d1x + curC2Min * d2x, y: cy + curC1Min * d1y + curC2Min * d2y };
              const pBR = { x: cx + curC1Max * d1x + curC2Min * d2x, y: cy + curC1Max * d1y + curC2Min * d2y };

              // Dien tich mat phang dang lan toa bao trum
              ctx.beginPath();
              ctx.moveTo(pTR.x, pTR.y);
              ctx.lineTo(pTL.x, pTL.y);
              ctx.lineTo(pBL.x, pBL.y);
              ctx.lineTo(pBR.x, pBR.y);
              ctx.closePath();
              ctx.fillStyle = isDark ? "rgba(16, 185, 129, 0.12)" : "rgba(16, 185, 129, 0.09)";
              ctx.fill();

              // Luoi Affine song song voi v1 va v2
              const absDet = Math.abs(det);
              const dPerp2 = absDet / Math.max(1e-4, len1);
              const dPerp1 = absDet / Math.max(1e-4, len2);

              const kMin = Math.ceil(curC2Min);
              const kMax = Math.floor(curC2Max);
              const stepK = Math.max(1, Math.ceil(40 / Math.max(1e-4, dPerp2)));
              ctx.strokeStyle = isDark ? "rgba(16, 185, 129, 0.22)" : "rgba(16, 185, 129, 0.18)";
              ctx.lineWidth = 1.0;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              for (let k = kMin; k <= kMax; k += stepK) {
                ctx.moveTo(cx + curC1Min * d1x + k * d2x, cy + curC1Min * d1y + k * d2y);
                ctx.lineTo(cx + curC1Max * d1x + k * d2x, cy + curC1Max * d1y + k * d2y);
              }
              ctx.stroke();

              const mMin = Math.ceil(curC1Min);
              const mMax = Math.floor(curC1Max);
              const stepM = Math.max(1, Math.ceil(40 / Math.max(1e-4, dPerp1)));
              ctx.strokeStyle = isDark ? "rgba(56, 189, 248, 0.20)" : "rgba(2, 132, 199, 0.16)";
              ctx.beginPath();
              for (let m = mMin; m <= mMax; m += stepM) {
                ctx.moveTo(cx + m * d1x + curC2Min * d2x, cy + m * d1y + curC2Min * d2y);
                ctx.lineTo(cx + m * d1x + curC2Max * d2x, cy + m * d1y + curC2Max * d2y);
              }
              ctx.stroke();
              ctx.setLineDash([]);

              // 4 vien mep hinh binh hanh dan no phat sang (song lan toa)
              ctx.strokeStyle = isDark ? "rgba(52, 211, 153, 0.90)" : "rgba(5, 150, 105, 0.85)";
              ctx.lineWidth = 2.0;
              ctx.setLineDash([6, 3]);
              ctx.shadowColor = "#10b981";
              ctx.shadowBlur = 6;
              ctx.beginPath();
              ctx.moveTo(pTR.x, pTR.y);
              ctx.lineTo(pTL.x, pTL.y);
              ctx.lineTo(pBL.x, pBL.y);
              ctx.lineTo(pBR.x, pBR.y);
              ctx.closePath();
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.shadowBlur = 0;

            } else {
              // GIAI DOAN 3: KHONG GIAN 2D ON DINH (p >= 0.95)
              ctx.beginPath();
              ctx.moveTo(cx + R1Max * d1x + R2Max * d2x, cy + R1Max * d1y + R2Max * d2y);
              ctx.lineTo(cx - R1Max * d1x + R2Max * d2x, cy - R1Max * d1y + R2Max * d2y);
              ctx.lineTo(cx - R1Max * d1x - R2Max * d2x, cy - R1Max * d1y - R2Max * d2y);
              ctx.lineTo(cx + R1Max * d1x - R2Max * d2x, cy + R1Max * d1y - R2Max * d2y);
              ctx.closePath();
              ctx.fillStyle = isDark ? "rgba(16, 185, 129, 0.12)" : "rgba(16, 185, 129, 0.08)";
              ctx.fill();

              // Luoi Affine phu kin viewport
              ctx.strokeStyle = isDark ? "rgba(16, 185, 129, 0.18)" : "rgba(16, 185, 129, 0.14)";
              ctx.lineWidth = 1.0;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              const spanK = Math.ceil(R2Max);
              const spanM = Math.ceil(R1Max);
              for (let k = -spanK; k <= spanK; k++) {
                ctx.moveTo(cx - spanM * d1x + k * d2x, cy - spanM * d1y + k * d2y);
                ctx.lineTo(cx + spanM * d1x + k * d2x, cy + spanM * d1y + k * d2y);
              }
              for (let m = -spanM; m <= spanM; m++) {
                ctx.moveTo(cx + m * d1x - spanK * d2x, cy + m * d1y - spanK * d2y);
                ctx.lineTo(cx + m * d1x + spanK * d2x, cy + m * d1y + spanK * d2y);
              }
              ctx.stroke();
              ctx.setLineDash([]);
            }
          } else if (this._currentPhase === 2) {
            // Buoc 3 trong 2D: Luoi khong gian 2D on dinh lam nen tang khao sat v3
            ctx.beginPath();
            ctx.moveTo(cx + R1Max * d1x + R2Max * d2x, cy + R1Max * d1y + R2Max * d2y);
            ctx.lineTo(cx - R1Max * d1x + R2Max * d2x, cy - R1Max * d1y + R2Max * d2y);
            ctx.lineTo(cx - R1Max * d1x - R2Max * d2x, cy - R1Max * d1y - R2Max * d2y);
            ctx.lineTo(cx + R1Max * d1x - R2Max * d2x, cy + R1Max * d1y - R2Max * d2y);
            ctx.closePath();
            ctx.fillStyle = isDark ? "rgba(16, 185, 129, 0.10)" : "rgba(16, 185, 129, 0.07)";
            ctx.fill();

            ctx.strokeStyle = isDark ? "rgba(16, 185, 129, 0.18)" : "rgba(16, 185, 129, 0.14)";
            ctx.lineWidth = 1.0;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            const spanK = Math.ceil(R2Max);
            const spanM = Math.ceil(R1Max);
            for (let k = -spanK; k <= spanK; k++) {
              ctx.moveTo(cx - spanM * d1x + k * d2x, cy - spanM * d1y + k * d2y);
              ctx.lineTo(cx + spanM * d1x + k * d2x, cy + spanM * d1y + k * d2y);
            }
            for (let m = -spanM; m <= spanM; m++) {
              ctx.moveTo(cx + m * d1x - spanK * d2x, cy + m * d1y - spanK * d2y);
              ctx.lineTo(cx + m * d1x + spanK * d2x, cy + m * d1y + spanK * d2y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      ctx.restore();
    },

    render2DProjections(ctx, gridInfo) {
      if (!this._active || !gridInfo || App.mode !== "2D" || !this._analysis) return;
      const { cx, cy, px } = gridInfo;
      const an = this._analysis;
      const p = smoothstep(this._phaseProgress);
      const isDark = document.body.classList.contains("dark");

      ctx.save();

      // --- TRUONG HOP 1: v2 CUNG PHUONG v1 (PHU THUOC TAI BUOC 2) ---
      if (an.m >= 2 && an.isV2Collinear && this._currentPhase >= 1) {
        const v2 = an.v2;
        const p2x = cx + v2[0] * px;
        const p2y = cy - v2[1] * px;

        // Vong tron canh bao tai ngon v2 bi giam tren truc 1D (chi stroke, khong to)
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(p2x, p2y, 7, 0, Math.PI * 2);
        ctx.stroke();
      }

      // --- TRUONG HOP 2: v3 PHU THUOC TUYEN TINH TRONG 2D (BUOC 3) ---
      if (an.m >= 3 && an.isV3Coplanar && this._currentPhase === 2) {
        const v1 = an.v1;
        const v2 = an.v2;
        const v3 = an.v3;

        const c1 = an.decompC1;
        const c2 = an.decompC2;

        const p1Target = { x: cx + c1 * v1[0] * px, y: cy - c1 * v1[1] * px };
        const p2Target = { x: cx + c2 * v2[0] * px, y: cy - c2 * v2[1] * px };
        const p3Target = { x: cx + v3[0] * px, y: cy - v3[1] * px };

        // 1. Doan chieu song song tu ngon v3 ve truc 1 (song song voi v2) - Thuan stroke net dut
        const p1Cur = {
          x: p3Target.x + (p1Target.x - p3Target.x) * p,
          y: p3Target.y + (p1Target.y - p3Target.y) * p
        };
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(p3Target.x, p3Target.y);
        ctx.lineTo(p1Cur.x, p1Cur.y);
        ctx.stroke();

        // 2. Doan chieu song song tu ngon v3 ve truc 2 (song song voi v1) - Thuan stroke net dut
        const p2Cur = {
          x: p3Target.x + (p2Target.x - p3Target.x) * p,
          y: p3Target.y + (p2Target.y - p3Target.y) * p
        };
        ctx.beginPath();
        ctx.moveTo(p3Target.x, p3Target.y);
        ctx.lineTo(p2Cur.x, p2Cur.y);
        ctx.stroke();

        // 3. Highlight hai vector thanh phan c1*v1 va c2*v2 tren 2 truc (thuan stroke)
        if (p > 0.25) {
          ctx.setLineDash([]);
          // Vector c1*v1 tren truc 1
          ctx.strokeStyle = isDark ? "#34d399" : "#059669";
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + (p1Target.x - cx) * p, cy + (p1Target.y - cy) * p);
          ctx.stroke();

          // Vector c2*v2 tren truc 2
          ctx.strokeStyle = isDark ? "#38bdf8" : "#0284c7";
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + (p2Target.x - cx) * p, cy + (p2Target.y - cy) * p);
          ctx.stroke();

          // Diem nut toa do doc lap tai cac dinh (khong to mang lien keo noi, chi cham nut roi)
          const drawNodeCircle = (pt, strokeCol) => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = isDark ? "#050811" : "#ffffff";
            ctx.fill();
            ctx.strokeStyle = strokeCol;
            ctx.lineWidth = 2.0;
            ctx.stroke();
            ctx.restore();
          };

          drawNodeCircle(p1Target, "#10b981");
          drawNodeCircle(p2Target, "#0284c7");
          drawNodeCircle(p3Target, "#f59e0b");
        }
      }

      ctx.restore();
    },

    // =========================================================================
    // 3D THREE.JS RENDERING (DIMENSION GROWTH IN THREE DIMENSIONS)
    // PURE GEOMETRY: ZERO CANVAS PROSE, ZERO AREA FILLS, PURE STROKES & MARKERS
    // =========================================================================
    render3D(mathGroup) {
      if (!this._active || !mathGroup || App.mode !== "3D" || !this._analysis || typeof THREE === "undefined") return;

      if (!this._threeGroup) {
        this._threeGroup = new THREE.Group();
        mathGroup.add(this._threeGroup);
      }

      // Don dep cac mesh cu trong group de cap nhat theo tien do progress
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

      const an = this._analysis;
      const p = smoothstep(this._phaseProgress);
      const u = (window.Vec3D && Vec3D.S3D && Vec3D.S3D.unitsPerWorld) || 1;
      const Lw = (window.Vec3D && Vec3D._axisMaxWorld) || 50;

      const vFOV = (((window.Vec3D && Vec3D._camera) ? Vec3D._camera.fov : 24) * Math.PI) / 180;
      const screenH = Math.max(1, (window.Vec3D && Vec3D._renderer?.domElement?.clientHeight) || 760);
      const camDist = (window.Vec3D && Vec3D._camera) ? Vec3D._camera.position.length() : 25;
      const worldPerPx = (2 * Math.tan(vFOV / 2) * camDist) / screenH;

      // Cac ham tro giup tao duong net stroke va marker nhat quan
      const makeLine = (p1, p2, color, opacity = 1.0) => {
        const geom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const mat = new THREE.LineBasicMaterial({
          color,
          transparent: opacity < 1.0,
          opacity,
          depthWrite: false
        });
        const l = new THREE.Line(geom, mat);
        l.renderOrder = 2;
        return l;
      };

      const makeDashedLine = (p1, p2, color, opacity = 0.85, dashSize = 0.5 * u, gapSize = 0.25 * u) => {
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

      const makeLineSegments = (pts, color, opacity = 0.35, isDashed = false, dashSize = 0.35 * u, gapSize = 0.18 * u) => {
        if (!pts || !pts.length) return null;
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        let mat;
        if (isDashed) {
          mat = new THREE.LineDashedMaterial({
            color,
            dashSize,
            gapSize,
            transparent: true,
            opacity,
            depthWrite: false
          });
        } else {
          mat = new THREE.LineBasicMaterial({
            color,
            transparent: opacity < 1.0,
            opacity,
            depthWrite: false
          });
        }
        const segs = new THREE.LineSegments(geom, mat);
        if (isDashed) segs.computeLineDistances();
        segs.renderOrder = 1;
        return segs;
      };

      const makeLineLoop = (pts, color, opacity = 0.85) => {
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({
          color,
          transparent: opacity < 1.0,
          opacity,
          depthWrite: false
        });
        const l = new THREE.LineLoop(geom, mat);
        l.renderOrder = 3;
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

      const makeQuadMesh = (p0, p1, p2, p3, color, opacity) => {
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array([
          p0.x, p0.y, p0.z,
          p1.x, p1.y, p1.z,
          p2.x, p2.y, p2.z,

          p0.x, p0.y, p0.z,
          p2.x, p2.y, p2.z,
          p3.x, p3.y, p3.z
        ]);
        geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geom.computeVertexNormals();
        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: 2,
          polygonOffsetUnits: 2
        });
        const m = new THREE.Mesh(geom, mat);
        m.renderOrder = -1;
        return m;
      };

      const b1 = to3D(an.v1);
      const len1 = norm(b1);

      // --- 1. TRUC 1D: span(v1) ---
      if (an.isV1Zero || len1 < 1e-6) {
        // Vector 0: Canh bao do tai goc toa do
        this._threeGroup.add(makeMarker(new THREE.Vector3(0, 0, 0), 0.07 * u, 0xef4444, 0.12 * u, 0.45));
      } else {
        const dir1 = new THREE.Vector3(b1[0] / len1, b1[1] / len1, b1[2] / len1);
        const pMin1 = dir1.clone().multiplyScalar(-Lw);
        const pMax1 = dir1.clone().multiplyScalar(Lw);
        this._threeGroup.add(makeDashedLine(pMin1, pMax1, 0x10b981, 0.85, 0.6 * u, 0.3 * u));

        // Vach chia don vi doc theo span(v1)
        let upVec1 = new THREE.Vector3(0, 0, 1);
        if (Math.abs(dir1.dot(upVec1)) > 0.9) upVec1 = new THREE.Vector3(0, 1, 0);
        const perp1 = new THREE.Vector3().crossVectors(dir1, upVec1).normalize();
        const tickPairs1 = [];
        for (let m = -14; m <= 14; m++) {
          if (m === 0) continue;
          const dist = Math.abs(m) * len1 * u;
          if (dist <= Lw) {
            const tickCenter = dir1.clone().multiplyScalar(m * len1 * u);
            tickPairs1.push(
              tickCenter.clone().addScaledVector(perp1, -0.09 * u),
              tickCenter.clone().addScaledVector(perp1, 0.09 * u)
            );
          }
        }
        if (tickPairs1.length) {
          const ticks1 = makeLineSegments(tickPairs1, 0x10b981, 0.65, false);
          if (ticks1) this._threeGroup.add(ticks1);
        }

        // Goc toa do O (Emerald)
        this._threeGroup.add(makeMarker(new THREE.Vector3(0, 0, 0), 0.05 * u, 0x10b981, 0.09 * u, 0.35));
      }

      // --- 2. KHAO SAT CHIEU THU HAI v2 (BUOC 2 & DUY TRI TAI BUOC 3) ---
      if (an.m >= 2 && !an.isV1Zero && this._currentPhase >= 1) {
        const b2 = to3D(an.v2);
        const len2 = norm(b2);

        if (an.isV2Collinear) {
          // v2 cung phuong voi v1 -> phu thuoc tuyen tinh
          const vB2 = new THREE.Vector3(b2[0] * u, b2[1] * u, b2[2] * u);
          this._threeGroup.add(makeMarker(vB2, 0.065 * u, 0xf59e0b, 0.12 * u, 0.45));
        } else if (len2 > 1e-6) {
          // v2 doc lap -> mo rong mat phang 2D span(v1, v2)
          const dir2 = new THREE.Vector3(b2[0] / len2, b2[1] / len2, b2[2] / len2);
          const isPhase2Active = this._currentPhase === 1;
          const axis2Color = isPhase2Active && p < 0.95 ? 0x38bdf8 : 0x10b981;

          const pMin2 = dir2.clone().multiplyScalar(-Lw);
          const pMax2 = dir2.clone().multiplyScalar(Lw);
          this._threeGroup.add(makeDashedLine(pMin2, pMax2, axis2Color, 0.85, 0.6 * u, 0.3 * u));

          // Vach chia don vi doc theo span(v2)
          let upVec2 = new THREE.Vector3(0, 0, 1);
          if (Math.abs(dir2.dot(upVec2)) > 0.9) upVec2 = new THREE.Vector3(0, 1, 0);
          const perp2 = new THREE.Vector3().crossVectors(dir2, upVec2).normalize();
          const tickPairs2 = [];
          for (let k = -14; k <= 14; k++) {
            if (k === 0) continue;
            const dist = Math.abs(k) * len2 * u;
            if (dist <= Lw) {
              const tickCenter = dir2.clone().multiplyScalar(k * len2 * u);
              tickPairs2.push(
                tickCenter.clone().addScaledVector(perp2, -0.09 * u),
                tickCenter.clone().addScaledVector(perp2, 0.09 * u)
              );
            }
          }
          if (tickPairs2.length) {
            const ticks2 = makeLineSegments(tickPairs2, axis2Color, 0.65, false);
            if (ticks2) this._threeGroup.add(ticks2);
          }

          const vB1 = new THREE.Vector3(b1[0] * u, b1[1] * u, b1[2] * u);
          const vB2 = new THREE.Vector3(b2[0] * u, b2[1] * u, b2[2] * u);
          const vO = new THREE.Vector3(0, 0, 0);

          // Co so truc chuan (u1, u2) trong mat phang span(v1, v2) de phu kin 100% toan bo mat phang
          const nRaw = cross(b1, b2);
          const lenN = Math.max(1e-6, norm(nRaw));
          const u1 = new THREE.Vector3(b1[0] / len1, b1[1] / len1, b1[2] / len1);
          const nHat = new THREE.Vector3(nRaw[0] / lenN, nRaw[1] / lenN, nRaw[2] / lenN);
          const u2 = new THREE.Vector3().crossVectors(nHat, u1).normalize();

          // Tinh toan ban kinh tam nhin camera tren mat phang giong het co che 2D (R_target gan sat mep khung nhin)
          const cam = window.Vec3D && Vec3D._camera;
          const camDist = cam ? cam.position.length() : 25;
          const vFOV = (((cam ? cam.fov : 24) * Math.PI) / 180);
          const screenH = Math.max(1, (window.Vec3D && Vec3D._renderer?.domElement?.clientHeight) || 760);
          const screenW = Math.max(1, (window.Vec3D && Vec3D._renderer?.domElement?.clientWidth) || 760);
          const aspect = screenW / screenH;
          const hVis = camDist * Math.tan(vFOV / 2);
          const rCorner = Math.sqrt(hVis * hVis * (1 + aspect * aspect));
          const cHat = cam ? cam.position.clone().normalize() : new THREE.Vector3(1, 1, 1).normalize();
          const cosTilt = Math.abs(nHat.dot(cHat));
          const rScreenOnPlane = rCorner / Math.max(0.35, cosTilt);

          // Ban kinh song lan toa dong theo toc do 2D (chi vua du vuot mep khung nhin +25%)
          const Rtarget = Math.max(rScreenOnPlane * 1.35, Math.max(len1, len2) * u * 2.2, 28);
          const T0 = u1.clone().multiplyScalar(-Rtarget).addScaledVector(u2, -Rtarget);
          const T1 = u1.clone().multiplyScalar(Rtarget).addScaledVector(u2, -Rtarget);
          const T2 = u1.clone().multiplyScalar(Rtarget).addScaledVector(u2, Rtarget);
          const T3 = u1.clone().multiplyScalar(-Rtarget).addScaledVector(u2, Rtarget);

          // Ban kinh on dinh toan phan (vo tan) cho Pha 4 va Buoc 3 (khong bi mep cat khi nguoi dung zoom out / xoay goc)
          const Rfull = Math.max(Lw * 16.0, 800);
          const F0 = u1.clone().multiplyScalar(-Rfull).addScaledVector(u2, -Rfull);
          const F1 = u1.clone().multiplyScalar(Rfull).addScaledVector(u2, -Rfull);
          const F2 = u1.clone().multiplyScalar(Rfull).addScaledVector(u2, Rfull);
          const F3 = u1.clone().multiplyScalar(-Rfull).addScaledVector(u2, Rfull);

          const V0 = vO;
          const V1 = vB1;
          const V2 = vB1.clone().add(vB2);
          const V3 = vB2;

          if (this._currentPhase === 1 && p < 0.12) {
            // PHA 1: Khao sat 2 vector ban dau (dong bo voi moc 0.12 ben 2D)
          } else if (this._currentPhase === 1 && p < 0.42) {
            // PHA 2: Doan thang v1 truot doc theo v2 quet hinh binh hanh co so (0.12 <= p < 0.42, giong 2D)
            const tSweep = (p - 0.12) / 0.30;
            const s = tSweep * tSweep * (3 - 2 * tSweep);
            const curC2 = s;

            const curV0 = vO;
            const curV1 = vB1;
            const curV2 = vB1.clone().addScaledVector(vB2, curC2);
            const curV3 = vB2.clone().multiplyScalar(curC2);

            // A. Dien tich hinh binh hanh co so dang quet (mesh xanh ngoc nhe)
            this._threeGroup.add(makeQuadMesh(curV0, curV1, curV2, curV3, 0x10b981, 0.22));

            // B. Vien canh day (O -> v1)
            this._threeGroup.add(makeLine(curV0, curV1, 0x10b981, 0.65));

            // C. Doan thang v1 DANG TRUOT TINH TIEN (Moving Segment) - Phat sang
            this._threeGroup.add(makeLine(curV3, curV2, 0x34d399, 1.0));

            // D. Ray dan huong truot doc theo v2 (O -> curV3) va song song (curV1 -> curV2)
            this._threeGroup.add(makeLine(curV0, curV3, 0x38bdf8, 0.85));
            this._threeGroup.add(makeLine(curV1, curV2, 0x38bdf8, 0.65));

            // E. Hai diem mut dang truot
            this._threeGroup.add(makeMarker(curV3, 0.045 * u, 0x38bdf8));
            this._threeGroup.add(makeMarker(curV2, 0.045 * u, 0x38bdf8));

          } else if (this._currentPhase === 1 && p < 0.95) {
            // PHA 3: Mat phang lan toa dan no BAT DAU TU HINH BINH HANH CO SO VOI TOC DO CHUAN 2D (0.42 <= p < 0.95)
            // Tai s = 0: Dung bang hinh binh hanh co so V0, V1, V2, V3
            // Khi s -> 1: Dan no deu 4 huong ra T0, T1, T2, T3 (vua cham mep man hinh o cuoi pha giong 2D)
            const tExp = (p - 0.42) / 0.53;
            const s = tExp * tExp * (3 - 2 * tExp);

            const C0 = V0.clone().lerp(T0, s);
            const C1 = V1.clone().lerp(T1, s);
            const C2 = V2.clone().lerp(T2, s);
            const C3 = V3.clone().lerp(T3, s);

            // A. Dien tich mat phang dan no bao trum toan bo khong gian
            this._threeGroup.add(makeQuadMesh(C0, C1, C2, C3, 0x10b981, 0.16));

            // B. Vien mep phat sang (song lan toa tu 4 canh hinh binh hanh di ra cham mep man hinh)
            this._threeGroup.add(makeLineLoop([C0, C1, C2, C3], 0x34d399, (1 - s * 0.35) * 0.85));

            // C. Luoi Affine dong dan no clipped theo ban kinh RcurGrid
            const Rgrid = Math.min(Rtarget, Lw * 1.5);
            const R0 = Math.max(len1, len2) * 1.4 * u;
            const RcurGrid = R0 + (Rgrid - R0) * s;
            const curRm = RcurGrid / u;
            const b1dotb2 = dot(b1, b2);

            const dPerp1 = (lenN / len1) * u;
            const kMax = Math.ceil(RcurGrid / Math.max(0.01, dPerp1));
            const stepK = Math.max(1, Math.ceil(12 / Math.max(0.1, dPerp1)));
            const kLimit = Math.min(kMax, 25 * stepK);

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
            if (gridLines1.length) {
              const gl1 = makeLineSegments(gridLines1, 0x10b981, 0.35, true);
              if (gl1) this._threeGroup.add(gl1);
            }

            const dPerp2 = (lenN / len2) * u;
            const mMax = Math.ceil(RcurGrid / Math.max(0.01, dPerp2));
            const stepM = Math.max(1, Math.ceil(12 / Math.max(0.1, dPerp2)));
            const mLimit = Math.min(mMax, 25 * stepM);

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
            if (gridLines2.length) {
              const gl2 = makeLineSegments(gridLines2, 0x38bdf8, 0.30, true);
              if (gl2) this._threeGroup.add(gl2);
            }

          } else {
            // PHA 4: HOAN TAT & DUY TRI CHO KHONG GIAN 2D (p >= 0.95 hoac tai Buoc 3)
            // Mat phang span(v1, v2) phu kin 100% toan bo viewport
            const is3DExpanding = this._currentPhase === 2 && !an.isV3Coplanar;
            const planeOpacity = is3DExpanding ? 0.06 : (this._currentPhase === 2 ? 0.10 : 0.12);
            this._threeGroup.add(makeQuadMesh(F0, F1, F2, F3, 0x10b981, planeOpacity));

            // Mang luoi Affine tren mat phang span(v1, v2)
            const Rgrid = Lw * 1.6;
            const Rm = Rgrid / u;
            const b1dotb2 = dot(b1, b2);

            const dPerp1 = (lenN / len1) * u;
            const kMax = Math.ceil(Rgrid / Math.max(0.01, dPerp1));
            const stepK = Math.max(1, Math.ceil(12 / Math.max(0.1, dPerp1)));
            const kLimit = Math.min(kMax, 25 * stepK);

            const gridLines1 = [];
            for (let k = -kLimit; k <= kLimit; k += stepK) {
              if (k === 0) continue;
              const discr = Rm * Rm * len1 * len1 - k * k * lenN * lenN;
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
            if (gridLines1.length) {
              const gl1 = makeLineSegments(gridLines1, 0x10b981, is3DExpanding ? 0.16 : 0.28, true);
              if (gl1) this._threeGroup.add(gl1);
            }

            const dPerp2 = (lenN / len2) * u;
            const mMax = Math.ceil(Rgrid / Math.max(0.01, dPerp2));
            const stepM = Math.max(1, Math.ceil(12 / Math.max(0.1, dPerp2)));
            const mLimit = Math.min(mMax, 25 * stepM);

            const gridLines2 = [];
            for (let m = -mLimit; m <= mLimit; m += stepM) {
              if (m === 0) continue;
              const discr = Rm * Rm * len2 * len2 - m * m * lenN * lenN;
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
            if (gridLines2.length) {
              const gl2 = makeLineSegments(gridLines2, 0x38bdf8, is3DExpanding ? 0.12 : 0.22, true);
              if (gl2) this._threeGroup.add(gl2);
            }
          }
        }
      }

      // --- 3. KHAO SAT VECTOR THU BA v3 (BUOC 3: DOC LAP / PHAN RA PHU THUOC) ---
      if (an.m >= 3 && this._currentPhase === 2) {
        const b1 = to3D(an.v1);
        const b2 = to3D(an.v2);
        const b3 = to3D(an.v3);
        const len1 = norm(b1);
        const len2 = norm(b2);
        const len3 = norm(b3);

        const vB1 = new THREE.Vector3(b1[0] * u, b1[1] * u, b1[2] * u);
        const vB2 = new THREE.Vector3(b2[0] * u, b2[1] * u, b2[2] * u);
        const vB3 = new THREE.Vector3(b3[0] * u, b3[1] * u, b3[2] * u);
        const vO = new THREE.Vector3(0, 0, 0);

        if (an.isV2Collinear) {
          if (an.isV3Coplanar) {
            this._threeGroup.add(makeMarker(vB3, 0.065 * u, 0xf59e0b, 0.12 * u, 0.45));
          }
        } else if (an.isV3Coplanar) {
          // TRUONG HOP A: v3 DONG PHANG VOI span(v1, v2) (PHU THUOC TUYEN TINH)
          // Phan ra: v3 = c1*v1 + c2*v2
          const c1 = an.decompC1;
          const c2 = an.decompC2;
          const P1 = vB1.clone().multiplyScalar(c1);
          const P2 = vB2.clone().multiplyScalar(c2);
          const P3 = vB3;

          // Doan chieu song song tu ngon v3 ve truc 1 (song song voi v2) - net dut ho phach
          const curP1 = P3.clone().lerp(P1, p);
          this._threeGroup.add(makeDashedLine(P3, curP1, 0xf59e0b, 0.9, 0.4 * u, 0.2 * u));

          // Doan chieu song song tu ngon v3 ve truc 2 (song song voi v1) - net dut ho phach
          const curP2 = P3.clone().lerp(P2, p);
          this._threeGroup.add(makeDashedLine(P3, curP2, 0xf59e0b, 0.9, 0.4 * u, 0.2 * u));

          // Highlight hai vector thanh phan tren 2 truc khi p > 0.2
          if (p > 0.2) {
            const curSub1 = vO.clone().lerp(P1, p);
            const curSub2 = vO.clone().lerp(P2, p);
            this._threeGroup.add(makeLine(vO, curSub1, 0x10b981, 0.95));
            this._threeGroup.add(makeLine(vO, curSub2, 0x38bdf8, 0.95));

            this._threeGroup.add(makeMarker(P1, 0.05 * u, 0x10b981));
            this._threeGroup.add(makeMarker(P2, 0.05 * u, 0x38bdf8));
            this._threeGroup.add(makeMarker(P3, 0.065 * u, 0xf59e0b, 0.11 * u, 0.4));

            // Vector phu thuoc: TUYET DOI KHONG TO DIEN TICH (pure projection lines & node markers)
          }
        } else {
          // TRUONG HOP B: v3 DOC LAP TUYEN TINH (VUON RA KHONG GIAN 3D, DIM = 3)
          // 1. Truc 1D span(v3)
          if (len3 > 1e-6) {
            const dir3 = new THREE.Vector3(b3[0] / len3, b3[1] / len3, b3[2] / len3);
            const axis3Color = p < 0.95 ? 0x38bdf8 : 0x10b981;
            const pMin3 = dir3.clone().multiplyScalar(-Lw);
            const pMax3 = dir3.clone().multiplyScalar(Lw);
            this._threeGroup.add(makeDashedLine(pMin3, pMax3, axis3Color, 0.85, 0.6 * u, 0.3 * u));

            // Vach chia don vi doc theo span(v3)
            let upVec3 = new THREE.Vector3(0, 0, 1);
            if (Math.abs(dir3.dot(upVec3)) > 0.9) upVec3 = new THREE.Vector3(0, 1, 0);
            const perp3 = new THREE.Vector3().crossVectors(dir3, upVec3).normalize();
            const tickPairs3 = [];
            for (let k = -14; k <= 14; k++) {
              if (k === 0) continue;
              const dist = Math.abs(k) * len3 * u;
              if (dist <= Lw) {
                const tickCenter = dir3.clone().multiplyScalar(k * len3 * u);
                tickPairs3.push(
                  tickCenter.clone().addScaledVector(perp3, -0.09 * u),
                  tickCenter.clone().addScaledVector(perp3, 0.09 * u)
                );
              }
            }
            if (tickPairs3.length) {
              const ticks3 = makeLineSegments(tickPairs3, axis3Color, 0.65, false);
              if (ticks3) this._threeGroup.add(ticks3);
            }
          }

          // 2. Chan hinh chieu truc giao F tren mat phang span(v1, v2)
          const foot = an.projFoot3D;
          const vFoot = new THREE.Vector3(foot[0] * u, foot[1] * u, foot[2] * u);

          // Duong vuong goc ha tu v3 xuong mat phang tai F
          const curDrop = vB3.clone().lerp(vFoot, Math.min(1.0, p / 0.4));
          this._threeGroup.add(makeDashedLine(vB3, curDrop, 0xf59e0b, 0.9, 0.4 * u, 0.2 * u));
          this._threeGroup.add(makeMarker(vFoot, 0.05 * u, 0xf59e0b, 0.09 * u, 0.35));

          // Duong phan ra cua F ve 2 truc tren mat phang
          const c1 = an.decompC1;
          const c2 = an.decompC2;
          const P1 = vB1.clone().multiplyScalar(c1);
          const P2 = vB2.clone().multiplyScalar(c2);
          this._threeGroup.add(makeDashedLine(vFoot, P1, 0xf59e0b, 0.6, 0.4 * u, 0.2 * u));
          this._threeGroup.add(makeDashedLine(vFoot, P2, 0xf59e0b, 0.6, 0.4 * u, 0.2 * u));
          this._threeGroup.add(makeMarker(P1, 0.045 * u, 0x10b981));
          this._threeGroup.add(makeMarker(P2, 0.045 * u, 0x38bdf8));

          // 3. KHONG GIAN 3D KHOI HOP PARALLELEPIPED LAN TOA DAN NO (GIONG CO SO SO CHIEU)
          const W1 = Math.max(1e-4, len1 * u);
          const W2 = Math.max(1e-4, len2 * u);
          const W3 = Math.max(1e-4, len3 * u);

          const Rworld = Math.max(Lw * 1.5, 75);
          const R1Max = Math.max(3.0, Rworld / W1);
          const R2Max = Math.max(3.0, Rworld / W2);
          const R3Max = Math.max(3.0, Rworld / W3);

          if (p < 0.12) {
            // PHA 1: Khao sat phuong thu 3 doc lap ngoai mat phang
            this._threeGroup.add(makeMarker(vB3, 0.05 * u, 0x38bdf8, 0.085 * u, 0.4));
          } else if (p < 0.42) {
            // PHA 2: Mat phang day truot tinh tien theo v3 quet khoi hop co so (0.12 <= p < 0.42)
            const tSweep = (p - 0.12) / 0.30;
            const s3 = tSweep * tSweep * (3 - 2 * tSweep);
            const curVB3 = vB3.clone().multiplyScalar(s3);

            // 8 dinh khoi hop dang quet
            const p000 = vO;
            const p100 = vB1.clone();
            const p010 = vB2.clone();
            const p110 = vB1.clone().add(vB2);

            const p001 = curVB3.clone();
            const p101 = vB1.clone().add(curVB3);
            const p011 = vB2.clone().add(curVB3);
            const p111 = vB1.clone().add(vB2).add(curVB3);

            // Mat day & mat tren dang truot
            this._threeGroup.add(makeQuadMesh(p000, p100, p110, p010, 0x10b981, 0.18));
            this._threeGroup.add(makeQuadMesh(p001, p101, p111, p011, 0x38bdf8, 0.24));
            // Vien mat tren dang truot phat sang
            this._threeGroup.add(makeLineLoop([p001, p101, p111, p011], 0x38bdf8, 0.95));

            // 4 mat ben
            this._threeGroup.add(makeQuadMesh(p000, p100, p101, p001, 0x10b981, 0.14));
            this._threeGroup.add(makeQuadMesh(p100, p110, p111, p101, 0x10b981, 0.14));
            this._threeGroup.add(makeQuadMesh(p110, p010, p011, p111, 0x10b981, 0.14));
            this._threeGroup.add(makeQuadMesh(p010, p000, p001, p011, 0x10b981, 0.14));

            // 4 ray dan huong truot doc theo v3
            this._threeGroup.add(makeLine(p000, p001, 0x38bdf8, 0.85));
            this._threeGroup.add(makeLine(p100, p101, 0x38bdf8, 0.85));
            this._threeGroup.add(makeLine(p110, p111, 0x38bdf8, 0.85));
            this._threeGroup.add(makeLine(p010, p011, 0x38bdf8, 0.85));

            // 4 diem mut dinh tren
            this._threeGroup.add(makeMarker(p001, 0.045 * u, 0x38bdf8));
            this._threeGroup.add(makeMarker(p101, 0.045 * u, 0x38bdf8));
            this._threeGroup.add(makeMarker(p111, 0.045 * u, 0x38bdf8));
            this._threeGroup.add(makeMarker(p011, 0.045 * u, 0x38bdf8));

          } else if (p < 0.95) {
            // PHA 3: Khoi hop dan no da chieu BAT DAU TU KHOI HOP CO SO VA PHU KIN TOAN BO KHONG GIAN (0.42 <= p < 0.95)
            // Tai s = 0: c1Min=0, c1Max=1, c2Min=0, c2Max=1, c3Min=0, c3Max=1 -> Dung bang khoi hop co so
            // Khi s -> 1: lan het toan bo khong gian R3!
            const tExp = (p - 0.42) / 0.53;
            const s = tExp * tExp * (3 - 2 * tExp);

            const c1Min = -R1Max * s;
            const c1Max = 1 + (R1Max - 1) * s;
            const c2Min = -R2Max * s;
            const c2Max = 1 + (R2Max - 1) * s;
            const c3Min = -R3Max * s;
            const c3Max = 1 + (R3Max - 1) * s;

            const getCorner = (c1, c2, c3) =>
              vB1.clone().multiplyScalar(c1).addScaledVector(vB2, c2).addScaledVector(vB3, c3);

            const c000 = getCorner(c1Min, c2Min, c3Min);
            const c100 = getCorner(c1Max, c2Min, c3Min);
            const c010 = getCorner(c1Min, c2Max, c3Min);
            const c110 = getCorner(c1Max, c2Max, c3Min);
            const c001 = getCorner(c1Min, c2Min, c3Max);
            const c101 = getCorner(c1Max, c2Min, c3Max);
            const c011 = getCorner(c1Min, c2Max, c3Max);
            const c111 = getCorner(c1Max, c2Max, c3Max);

            // 6 mat bien cua khoi dan no
            this._threeGroup.add(makeQuadMesh(c000, c100, c110, c010, 0x10b981, 0.06));
            this._threeGroup.add(makeQuadMesh(c001, c101, c111, c011, 0x10b981, 0.07));
            this._threeGroup.add(makeQuadMesh(c000, c100, c101, c001, 0x10b981, 0.06));
            this._threeGroup.add(makeQuadMesh(c010, c110, c111, c011, 0x10b981, 0.06));
            this._threeGroup.add(makeQuadMesh(c000, c010, c011, c001, 0x10b981, 0.06));
            this._threeGroup.add(makeQuadMesh(c100, c110, c111, c101, 0x10b981, 0.06));

            // 12 canh khung phat sang
            const edges = [
              c000, c100, c100, c110, c110, c010, c010, c000,
              c001, c101, c101, c111, c111, c011, c011, c001,
              c000, c001, c100, c101, c110, c111, c010, c011
            ];
            const edgesMesh = makeLineSegments(edges, 0x34d399, 0.75, false);
            if (edgesMesh) this._threeGroup.add(edgesMesh);

            // Lat cat tang affine song song span(v1, v2) tai cac muc nguyen c3
            const stepSlice = Math.max(1, Math.ceil(14 / Math.max(0.1, W3)));
            const kMin3 = Math.ceil(c3Min);
            const kMax3 = Math.floor(c3Max);
            const slicePairs = [];
            for (let k = kMin3; k <= kMax3; k += stepSlice) {
              if (k === 0) continue;
              const s00 = getCorner(c1Min, c2Min, k);
              const s10 = getCorner(c1Max, c2Min, k);
              const s11 = getCorner(c1Max, c2Max, k);
              const s01 = getCorner(c1Min, c2Max, k);
              slicePairs.push(s00, s10, s10, s11, s11, s01, s01, s00);
            }
            if (slicePairs.length) {
              const slicesMesh = makeLineSegments(slicePairs, 0x38bdf8, 0.25, true);
              if (slicesMesh) this._threeGroup.add(slicesMesh);
            }

          } else {
            // PHA 4: HOAN TAT & DUY TRI CHO KHONG GIAN R3 (p >= 0.95)
            const getCorner = (c1, c2, c3) =>
              vB1.clone().multiplyScalar(c1).addScaledVector(vB2, c2).addScaledVector(vB3, c3);

            const c000 = getCorner(-R1Max, -R2Max, -R3Max);
            const c100 = getCorner(R1Max, -R2Max, -R3Max);
            const c010 = getCorner(-R1Max, R2Max, -R3Max);
            const c110 = getCorner(R1Max, R2Max, -R3Max);
            const c001 = getCorner(-R1Max, -R2Max, R3Max);
            const c101 = getCorner(R1Max, -R2Max, R3Max);
            const c011 = getCorner(-R1Max, R2Max, R3Max);
            const c111 = getCorner(R1Max, R2Max, R3Max);

            // 6 mat bien khoi hop on dinh
            this._threeGroup.add(makeQuadMesh(c000, c100, c110, c010, 0x10b981, 0.05));
            this._threeGroup.add(makeQuadMesh(c001, c101, c111, c011, 0x10b981, 0.05));
            this._threeGroup.add(makeQuadMesh(c000, c100, c101, c001, 0x10b981, 0.05));
            this._threeGroup.add(makeQuadMesh(c010, c110, c111, c011, 0x10b981, 0.05));
            this._threeGroup.add(makeQuadMesh(c000, c010, c011, c001, 0x10b981, 0.05));
            this._threeGroup.add(makeQuadMesh(c100, c110, c111, c101, 0x10b981, 0.05));

            // 12 canh khung khong gian R3
            const edges = [
              c000, c100, c100, c110, c110, c010, c010, c000,
              c001, c101, c101, c111, c111, c011, c011, c001,
              c000, c001, c100, c101, c110, c111, c010, c011
            ];
            const edgesMesh = makeLineSegments(edges, 0x10b981, 0.40, false);
            if (edgesMesh) this._threeGroup.add(edgesMesh);

            // Lat cat tang affine song song span(v1, v2)
            const stepSlice3 = Math.max(1, Math.ceil(14 / Math.max(0.1, W3)));
            const kMax3 = Math.min(Math.ceil(R3Max), 25 * stepSlice3);
            const slicePairs = [];
            for (let k = -kMax3; k <= kMax3; k += stepSlice3) {
              if (k === 0) continue;
              const s00 = getCorner(-R1Max, -R2Max, k);
              const s10 = getCorner(R1Max, -R2Max, k);
              const s11 = getCorner(R1Max, R2Max, k);
              const s01 = getCorner(-R1Max, R2Max, k);
              slicePairs.push(s00, s10, s10, s11, s11, s01, s01, s00);
            }
            if (slicePairs.length) {
              const slicesMesh = makeLineSegments(slicePairs, 0x10b981, 0.16, true);
              if (slicesMesh) this._threeGroup.add(slicesMesh);
            }
          }
        }
      }
    }
  };

  // Xuat ra window.App de he thong dong bo su dung
  window.App.IndepAnimator = IndepAnimator;
  window.App.startIndepAnimation = function (items) {
    return IndepAnimator.start(items);
  };
  window.App.stopIndepAnimation = function () {
    return IndepAnimator.stop();
  };
})();
