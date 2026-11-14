// ==================================================================================
// GRAM - SCHMIDT ORTHOGONALIZATION 3-STEP PLAYBACK ENGINE (PURE GEOMETRY)
// Truc quan hoa ban chat Thuat toan Truc giao hoa Gram - Schmidt (2D Canvas & 3D Three.js)
// Kich ban 3 buoc lien hoan chuan ban chat Dai so Tuyen tinh (0 chu giai tren Canvas):
//   Buoc 1: Co dinh Truc chuan dau tien u1 = v1 & Phep chieu vuong goc p1 = proj_{u1}(v2)
//   Buoc 2: Triet tieu Thanh phan song song u2 = v2 - p1 & Mo rong 3D u3 vuong goc span(u1, u2)
//   Buoc 3: Chuan hoa ve Co so Truc chuan e_i = u_i / ||u_i|| tren Duong tron / Mat cau don vi (R = 1)
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

  function lerpVec(a, b, t) {
    return [
      (a[0] || 0) * (1 - t) + (b[0] || 0) * t,
      (a[1] || 0) * (1 - t) + (b[1] || 0) * t,
      (a[2] || 0) * (1 - t) + (b[2] || 0) * t
    ];
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

  // Lay danh sach item vector thuc te trong App.vectorList tu #gsChecklist hoac customItems
  function resolveGSItems(customItems) {
    const list = App.vectorList || [];
    const resolved = [];

    if (Array.isArray(customItems) && customItems.length > 0) {
      for (const it of customItems) {
        if (it && typeof it.id !== "undefined") {
          const foundById = list.find((v) => v.id === it.id);
          if (foundById && !resolved.includes(foundById)) {
            resolved.push(foundById);
            continue;
          }
        }
        const raw = to3D(it?.vec || it);
        const foundByCoord = list.find(
          (v) =>
            !resolved.includes(v) &&
            v.vec &&
            Math.abs((Number(v.vec[0]) || 0) - raw[0]) < 1e-4 &&
            Math.abs((Number(v.vec[1]) || 0) - raw[1]) < 1e-4 &&
            Math.abs((Number(v.vec[2]) || 0) - raw[2]) < 1e-4
        );
        if (foundByCoord) resolved.push(foundByCoord);
      }
    }

    if (resolved.length < 2) {
      const container = document.getElementById("gsChecklist");
      if (container) {
        container.querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => {
          const id = Number(cb.value);
          const found = list.find((v) => v.id === id);
          if (found && !resolved.includes(found)) resolved.push(found);
        });
      }
    }

    return resolved;
  }

  // --- THUAT TOAN TRUC GIAO HOA GRAM - SCHMIDT DAY DU (HO TRO M >= 2 VECTOR & TRIET TIEU VECTOR PHU THUOC VE 0) ---
  function computeGramSchmidtDetailed(items) {
    const vectors = items.map((it) => to3D(it.vec || it));
    const is3D =
      items.some((it) => {
        const v = it.vec || it;
        return v.length >= 3;
      }) || App.mode === "3D";

    const m = vectors.length;
    const maxDim = is3D ? 3 : 2;
    const basisPalette = [
      { css: "#0284c7", hex: 0x0284c7 },
      { css: "#10b981", hex: 0x10b981 },
      { css: "#8b5cf6", hex: 0x8b5cf6 }
    ];

    const steps = [];
    const nonZeroBasis = [];

    for (let i = 0; i < m; i++) {
      const v = vectors[i] || [0, 0, 0];
      let pTotal = [0, 0, 0];
      const components = [];

      for (let bIdx = 0; bIdx < nonZeroBasis.length; bIdx++) {
        const b = nonZeroBasis[bIdx];
        const dUU = dot(b.u, b.u);
        const coeff = dUU > 1e-9 ? dot(v, b.u) / dUU : 0;
        const proj = dUU > 1e-9 ? scaleVec(b.u, coeff) : [0, 0, 0];
        pTotal = addVec(pTotal, proj);
        components.push({
          basisStepIndex: b.stepIndex,
          coeff,
          proj
        });
      }

      const rawU = subVec(v, pTotal);
      const rawNU = norm(rawU);
      const isZero = rawNU < 1e-5 || nonZeroBasis.length >= maxDim;
      const u = isZero ? [0, 0, 0] : rawU;
      const nU = isZero ? 0 : rawNU;
      const e = isZero ? [0, 0, 0] : normalizeVec(u);

      const paletteEntry = basisPalette[Math.min(nonZeroBasis.length, basisPalette.length - 1)];
      const stepObj = {
        index: i,
        stepIndex: i + 1,
        v,
        pTotal: isZero && rawNU < 1e-5 ? pTotal : (isZero ? [...v] : pTotal),
        components,
        u,
        nU,
        e,
        isZero,
        color: isZero ? "#ef4444" : paletteEntry.css,
        colorHex: isZero ? 0xef4444 : paletteEntry.hex
      };
      steps.push(stepObj);

      if (!isZero) {
        nonZeroBasis.push({
          stepIndex: i + 1,
          vecIndex: i,
          u,
          nU,
          e,
          color: paletteEntry.css,
          colorHex: paletteEntry.hex
        });
      }
    }

    const v1 = steps[0] ? steps[0].v : [0, 0, 0];
    const v2 = steps[1] ? steps[1].v : [0, 0, 0];
    const v3 = steps[2] ? steps[2].v : null;

    const u1 = steps[0] ? steps[0].u : [0, 0, 0];
    const u2 = steps[1] ? steps[1].u : [0, 0, 0];
    const u3 = steps[2] ? steps[2].u : null;

    const u1IsZero = steps[0] ? steps[0].isZero : true;
    const u2IsZero = steps[1] ? steps[1].isZero : true;
    const u3IsZero = steps[2] ? steps[2].isZero : true;

    const nU1 = steps[0] ? steps[0].nU : 0;
    const nU2 = steps[1] ? steps[1].nU : 0;
    const nU3 = steps[2] ? steps[2].nU : 0;

    const p1 = steps[1] ? steps[1].pTotal : [0, 0, 0];
    const coeff21 = !u1IsZero && dot(u1, u1) > 1e-9 ? dot(v2, u1) / dot(u1, u1) : 0;

    let p31 = [0, 0, 0];
    let p32 = [0, 0, 0];
    let p12 = [0, 0, 0];
    if (v3 && steps[2]) {
      p31 = u1IsZero ? [0, 0, 0] : projVec(v3, u1);
      p32 = u2IsZero ? [0, 0, 0] : projVec(v3, u2);
      p12 = steps[2].pTotal;
    }

    const e1 = steps[0] ? steps[0].e : [0, 0, 0];
    const e2 = steps[1] ? steps[1].e : [0, 0, 0];
    const e3 = steps[2] ? steps[2].e : null;

    const dotV1V2 = dot(v1, v2);
    const dotU1U2 = dot(u1, u2);

    return {
      items,
      vectors,
      steps,
      is3D,
      m,
      v1,
      v2,
      v3,
      u1,
      u2,
      u3,
      u1IsZero,
      u2IsZero,
      u3IsZero,
      nonZeroBasis,
      p1,
      coeff21,
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

  // Thong tin su pham tung buoc trong khung Explainer
  const PHASES_INFO = [
    {
      title: "Bước 1: Cố định trục chuẩn u₁ = v₁ và hạ hình chiếu vuông góc p₁",
      desc: "Giữ vector đầu tiên làm trục chuẩn u₁ = v₁. Từ ngọn v₂, hạ đường gióng nét đứt vuông góc xuống giá của u₁ để xác định vector hình chiếu p₁ = proj_u₁(v₂) cùng ký hiệu góc vuông 90°."
    },
    {
      title: "Bước 2: Triệt tiêu thành phần song song u₂ = v₂ - p₁",
      desc: "Tịnh tiến vector v₂ ngược theo phương p₁ một đoạn -p₁ (quy tắc hình bình hành hiệu hai vector). Thành phần song song với u₁ bị khử hoàn toàn, dựng đứng u₂ vuông góc với u₁ tại gốc O."
    },
    {
      title: "Bước 3: Chuẩn hóa về cơ sở trực chuẩn eᵢ trên mặt cầu / đường tròn đơn vị (R = 1)",
      desc: "Xuất hiện đường tròn đơn vị R = 1 (2D) hoặc mặt cầu đơn vị (3D). Các vector trực giao uᵢ co giãn dọc theo chính phương của chúng về đúng độ dài đơn vị ‖eᵢ‖ = 1, tạo thành khối đơn vị vuông góc."
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
    _tempVecIds: [],
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

    _frame3DCameraIfNeeded() {
      if (App.mode !== "3D" || !window.Vec3D || !Vec3D._camera || !Vec3D._controls || !this._analysis) return;
      if (this._savedCamPos3D) return;

      if (Vec3D._resetAnimId) {
        cancelAnimationFrame(Vec3D._resetAnimId);
        Vec3D._resetAnimId = null;
      }
      this._savedCamPos3D = Vec3D._camera.position.clone();
      let maxReach = 3.0;
      for (const v of this._analysis.vectors) {
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

    // --- KHOI CHAY HOAT CANH ---
    start(customItems) {
      const items = resolveGSItems(customItems);
      if (!items || items.length < 2) {
        if (typeof App.showToast === "function") {
          App.showToast("Hãy tick chọn ít nhất 2 vector trong danh sách để trực quan Gram - Schmidt!", "warning");
        }
        return false;
      }

      this.stop();

      const analysis = computeGramSchmidtDetailed(items);
      this._analysis = analysis;

      // Luu snapshot toan bo vector cua nguoi dung
      this._snapshot = (App.vectorList || []).map((v) => ({
        id: v.id,
        vec: [...(v.vec || [0, 0, 0])],
        name: v.name,
        latex: v.latex,
        _customLabelLatex: v._customLabelLatex,
        visible: v.visible !== false,
        alpha: typeof v.alpha === "number" ? v.alpha : 1.0,
        colorCss: v.colorCss,
        colorHex: v.colorHex,
        showProjection: v.showProjection
      }));

      // An tam thoi cac vector khong duoc chon de khong gay nhieu
      const selectedIds = new Set(items.map((it) => it.id));
      (App.vectorList || []).forEach((v) => {
        if (!selectedIds.has(v.id)) {
          v.visible = false;
        } else {
          v.visible = true;
          v.showProjection = false;
        }
      });

      // Tao vector tam thoi cho hinh chieu p1 (va p12 neu co 3 vector)
      this._tempVecIds = [];
      if (Array.isArray(App.vectorList)) {
        const p1Id = -9801;
        this._tempVecIds.push(p1Id);
        App.vectorList.push({
          id: p1Id,
          vec: analysis.is3D ? [0, 0, 0] : [0, 0],
          name: "p_1",
          _customLabelLatex: "p_1",
          colorCss: "#f59e0b",
          colorHex: "#f59e0b",
          visible: false,
          alpha: 0,
          showProjection: false,
          _isGSTemp: true
        });

        if (analysis.v3) {
          const p12Id = -9802;
          this._tempVecIds.push(p12Id);
          App.vectorList.push({
            id: p12Id,
            vec: analysis.is3D ? [0, 0, 0] : [0, 0],
            name: "p_{12}",
            _customLabelLatex: "p_{12}",
            colorCss: "#f59e0b",
            colorHex: "#f59e0b",
            visible: false,
            alpha: 0,
            showProjection: false,
            _isGSTemp: true
          });
        }
      }

      this._savedCamPos3D = null;
      this._frame3DCameraIfNeeded();

      this.ensureControls();
      const wrap = document.getElementById("gsAnimControls");
      if (wrap) wrap.style.display = "block";

      this._active = true;
      this._paused = false;
      this._currentPhase = 0;
      this._phaseProgress = 0;
      App._gsAnimActive = true;

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
      App._gsAnimActive = false;

      // Don dep Three.js Group 3D
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

      // Khoi phuc Camera 3D
      if (this._savedCamPos3D && window.Vec3D && Vec3D._camera && Vec3D._controls) {
        Vec3D._camera.position.copy(this._savedCamPos3D);
        Vec3D._controls.update();
        this._savedCamPos3D = null;
      }

      // Xoa cac vector tam thoi (_isGSTemp)
      if (Array.isArray(App.vectorList)) {
        for (let i = App.vectorList.length - 1; i >= 0; i--) {
          if (App.vectorList[i]._isGSTemp || this._tempVecIds.includes(App.vectorList[i].id)) {
            App.vectorList.splice(i, 1);
          }
        }
      }
      this._tempVecIds = [];

      // Khoi phuc vector snapshot va xoa override
      if (this._snapshot && Array.isArray(App.vectorList)) {
        for (const snap of this._snapshot) {
          const it = App.vectorList.find((v) => v.id === snap.id);
          if (it) {
            it.vec = [...snap.vec];
            it.name = snap.name;
            it.latex = snap.latex;
            if (snap._customLabelLatex !== undefined) it._customLabelLatex = snap._customLabelLatex;
            else delete it._customLabelLatex;
            it.visible = snap.visible;
            it.alpha = snap.alpha;
            it.colorCss = snap.colorCss;
            it.colorHex = snap.colorHex;
            it.showProjection = snap.showProjection;
            delete it._gsAlpha;
            delete it._gsColorCss;
            delete it._isDashed;
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

      this._frame3DCameraIfNeeded();
      this._currentPhase = Math.max(0, Math.min(2, phaseIdx));
      this._phaseProgress = 0.0;

      this.applyPhaseStyles(this._currentPhase, 0.0);
      this.updateSidebarUI();
      this.runCurrentPhase();
    },

    // Tinh nhip thoi gian 2 giai doan tach biet cho vector thu k (k >= 1, ung voi v_{k+1}) trong Buoc 2 (Phase 1):
    // - Voi k = 1 (v2): p1 da moc xong o Buoc 1, nen o dau Buoc 2 giu nhe 14% de nhin ro p1, sau do moi truot v2 va thu p1 cung nhau.
    // - Voi k >= 2 (v3, v4, ...):
    //   + Giai doan A (localT trong [0.00 .. 0.40]): v_{k+1} DUNG YEN, ha duong giong va moc vector hinh chieu p tu O len 100% (pProj: 0 -> 1).
    //   + Giai doan giu (localT trong [0.40 .. 0.50]): Giu nguyen p o 100% va v_{k+1} dung yen de nguoi hoc thay ro p (dac biet khi p = v_{k+1}).
    //   + Giai doan B (localT trong [0.50 .. 0.98]): Tru p, vector v_{k+1} (cung p) truot ve u_{k+1} hoac rut cung nhau ve 0 tai goc O (pSlide: 0 -> 1).
    _getStepTiming(k, rawP) {
      const an = this._analysis;
      const totalSlides = Math.max(1, (an ? an.m : 2) - 1);
      if (totalSlides === 1) {
        const clamped = Math.max(0, Math.min(1, rawP));
        const pSlide = smoothstep((clamped - 0.14) / 0.84);
        return {
          active: true,
          localT: clamped,
          pProj: 1.0,
          pSlide
        };
      }

      const w1 = 1.0;
      const wk = 1.75;
      const totalW = w1 + (totalSlides - 1) * wk;
      const startW = k === 1 ? 0 : w1 + (k - 2) * wk;
      const curW = k === 1 ? w1 : wk;
      const slotStart = startW / totalW;
      const slotDur = curW / totalW;
      const rawLocal = (rawP - slotStart) / Math.max(1e-4, slotDur);
      const clamped = Math.max(0, Math.min(1, rawLocal));

      if (k === 1) {
        const pSlide = smoothstep((clamped - 0.12) / 0.86);
        return {
          active: rawLocal >= -0.01 && rawLocal <= 1.01,
          localT: clamped,
          pProj: 1.0,
          pSlide
        };
      }

      const pProj = smoothstep(clamped / 0.40);
      const pSlide = smoothstep((clamped - 0.50) / 0.48);
      return {
        active: rawLocal >= 0 && rawLocal <= 1.01,
        localT: clamped,
        pProj,
        pSlide
      };
    },

    _getStepSlideProgress(k, rawP) {
      return this._getStepTiming(k, rawP).pSlide;
    },

    // --- VONG LAP RAF CHAY HOAT CANH LIEN HOAN 3 BUOC ---
    runCurrentPhase() {
      if (!this._active) return;
      if (this._paused) {
        this._phaseProgress = 1.0;
        this.applyPhaseStyles(this._currentPhase, 1.0);
        this.redraw();
        return;
      }

      const extraVecs = Math.max(0, ((this._analysis && this._analysis.m) || 2) - 2);
      const baseDurations = [2800, 2800 + extraVecs * 3400, 2600];
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
            }, 450 / this._speed);
          } else {
            this._paused = true;
            this.updateSidebarUI();
          }
        }
      };

      this._raf = requestAnimationFrame(stepLoop);
    },

    // Ap dung kieu dang, nhan toan hoc va toa do noi suy len cac vector
    applyPhaseStyles(phase, progress) {
      if (!this._analysis || !Array.isArray(App.vectorList)) return;
      const an = this._analysis;
      const d = an.is3D ? 3 : 2;

      const p1Item = App.vectorList.find((v) => v.id === -9801);
      const p12Item = App.vectorList.find((v) => v.id === -9802);

      // Quy uoc thoi gian con trong tung pha:
      // Phase 0: [0..0.22] truc u1, [0.22..0.88] ha duong giong va moc vector p1, [0.88..1.0] giu p1 o 100%
      const pDrop = smoothstep((progress - 0.22) / 0.66);
      const tStep1 = this._getStepTiming(1, progress);
      // Phase 2: [0..0.25] hien duong tron/mat cau don vi, [0.25..1.0] co gian u_i -> e_i
      const pNorm = smoothstep((progress - 0.25) / 0.75);

      if (p1Item) {
        if (phase === 0 && pDrop > 0.02 && norm(an.p1) > 1e-4) {
          p1Item.visible = true;
          p1Item.showProjection = false;
          p1Item.vec = scaleVec(an.p1, pDrop).slice(0, d);
          p1Item._gsColorCss = "#f59e0b";
          p1Item.colorHex = "#f59e0b";
          p1Item._gsAlpha = 0.95;
          p1Item.alpha = 0.95;
          p1Item._customLabelLatex = "p_1";
        } else if (phase === 1 && tStep1.active && tStep1.pSlide < 0.97 && norm(an.p1) > 1e-4) {
          // O dau Buoc 2, p1 giu nguyen 100% roi thu ngan cung luc khi v2 tru p1
          const remScale = Math.max(0, 1 - tStep1.pSlide);
          p1Item.visible = remScale > 0.02;
          p1Item.showProjection = false;
          p1Item.vec = scaleVec(an.p1, remScale).slice(0, d);
          p1Item._gsColorCss = "#f59e0b";
          p1Item.colorHex = "#f59e0b";
          p1Item._gsAlpha = 0.9 * (0.35 + 0.65 * remScale);
          p1Item.alpha = p1Item._gsAlpha;
          p1Item._customLabelLatex = "p_1";
        } else {
          p1Item.visible = false;
          p1Item.alpha = 0;
        }
      }

      if (p12Item) {
        let activeProjStep = null;
        let activeTiming = null;
        if (phase === 1 && an.m >= 3) {
          for (let i = 2; i < an.steps.length; i++) {
            const ti = this._getStepTiming(i, progress);
            if (ti.active) {
              activeProjStep = an.steps[i];
              activeTiming = ti;
              break;
            }
          }
        }

        if (
          activeProjStep &&
          activeTiming &&
          activeTiming.pProj > 0.02 &&
          activeTiming.pSlide < 0.97 &&
          norm(activeProjStep.pTotal) > 1e-4
        ) {
          // Giai doan A: p moc tu 0 -> 100% (khi pSlide = 0). Giai doan giu: p = 100%. Giai doan B: p thu tu 100% -> 0 cung v_{i+1}!
          const pScale = activeTiming.pProj * Math.max(0, 1 - activeTiming.pSlide);
          p12Item.visible = pScale > 0.02;
          p12Item.showProjection = false;
          p12Item.vec = scaleVec(activeProjStep.pTotal, pScale).slice(0, d);
          p12Item._gsColorCss = "#f59e0b";
          p12Item.colorHex = "#f59e0b";
          p12Item._gsAlpha = 0.95 * (1 - 0.35 * activeTiming.pSlide);
          p12Item.alpha = p12Item._gsAlpha;
          const kIdx = activeProjStep.index;
          p12Item._customLabelLatex = kIdx === 2 ? "p_{12}" : kIdx === 3 ? "p_{123}" : `p_{1..${kIdx}}`;
        } else {
          p12Item.visible = false;
          p12Item.alpha = 0;
        }
      }

      const initColors = ["#0284c7", "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

      for (let i = 0; i < an.items.length; i++) {
        const item = an.items[i];
        const step = an.steps[i];
        const vItem = App.vectorList.find((v) => v.id === item.id);
        if (!vItem || !step) continue;
        vItem.showProjection = false;

        if (i === 0) {
          // Vector 1: u1 = v1 -> e1 (Xanh duong #0284c7)
          if (step.isZero) {
            vItem.visible = phase < 2;
            vItem._gsColorCss = "#ef4444";
            vItem.colorCss = "#ef4444";
            vItem.colorHex = "#ef4444";
            vItem._gsAlpha = phase === 2 ? 0 : 0.25;
            vItem.alpha = vItem._gsAlpha;
            vItem.vec = step.u.slice(0, d);
            vItem._customLabelLatex = "u_1 = 0";
          } else {
            vItem.visible = true;
            vItem._gsColorCss = step.color;
            vItem.colorCss = step.color;
            vItem.colorHex = step.color;
            vItem._gsAlpha = 1.0;
            vItem.alpha = 1.0;
            if (phase === 0 || phase === 1) {
              vItem.vec = step.u.slice(0, d);
              vItem._customLabelLatex = "u_1";
            } else if (phase === 2) {
              const cur = lerpVec(step.u, step.e, pNorm);
              vItem.vec = cur.slice(0, d);
              vItem._customLabelLatex = pNorm > 0.5 ? "e_1" : "u_1";
            }
          }
        } else {
          // Vector thu k+1 (i >= 1): v_{i+1} -> u_{i+1} = v_{i+1} - pTotal -> e_{i+1} (hoac triet tieu ve 0 neu phu thuoc)
          const idxLabel = i + 1;
          const initCol = initColors[i % initColors.length];
          const tInfo = this._getStepTiming(i, progress);
          const pSlide = tInfo.pSlide;

          if (phase === 0) {
            vItem.visible = true;
            vItem._gsColorCss = initCol;
            vItem.colorCss = initCol;
            vItem.colorHex = initCol;
            vItem._gsAlpha = i === 1 ? 0.95 : 0.45;
            vItem.alpha = vItem._gsAlpha;
            vItem.vec = step.v.slice(0, d);
            vItem._customLabelLatex = `v_${idxLabel}`;
          } else if (phase === 1) {
            const cur = subVec(step.v, scaleVec(step.pTotal, pSlide));
            vItem.vec = cur.slice(0, d);
            if (step.isZero) {
              vItem.visible = pSlide < 0.98;
              const col = pSlide > 0.25 ? "#ef4444" : initCol;
              vItem._gsColorCss = col;
              vItem.colorCss = col;
              vItem.colorHex = col;
              vItem._gsAlpha = !tInfo.active && pSlide === 0 && i >= 2 ? 0.45 : Math.max(0.15, 1.0 - 0.85 * pSlide);
              vItem.alpha = vItem._gsAlpha;
              vItem._customLabelLatex = pSlide > 0.62 ? `u_${idxLabel} = 0` : `v_${idxLabel}`;
            } else {
              vItem.visible = true;
              const col = pSlide > 0.15 ? step.color : initCol;
              vItem._gsColorCss = col;
              vItem.colorCss = col;
              vItem.colorHex = col;
              vItem._gsAlpha = !tInfo.active && pSlide === 0 && i >= 2 ? 0.45 : 1.0;
              vItem.alpha = vItem._gsAlpha;
              vItem._customLabelLatex = pSlide > 0.62 ? `u_${idxLabel}` : `v_${idxLabel}`;
            }
          } else if (phase === 2) {
            if (step.isZero) {
              vItem.visible = false;
              vItem._gsAlpha = 0;
              vItem.alpha = 0;
            } else {
              vItem.visible = true;
              vItem._gsColorCss = step.color;
              vItem.colorCss = step.color;
              vItem.colorHex = step.color;
              vItem._gsAlpha = 1.0;
              vItem.alpha = 1.0;
              const cur = lerpVec(step.u, step.e, pNorm);
              vItem.vec = cur.slice(0, d);
              vItem._customLabelLatex = pNorm > 0.5 ? `e_${idxLabel}` : `u_${idxLabel}`;
            }
          }
        }
      }
    },

    redraw() {
      this._frame3DCameraIfNeeded();
      if (App.mode === "2D" && window.Vec2D) {
        Vec2D.draw2DAllVectors();
      } else if (window.Vec3D) {
        Vec3D.hardRefresh3D(false);
      }
    },

    // --- GIAO DIEN HOP DIEU KHIEN (#gsAnimControls) ---
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

      // Dat ngay TRƯỚC #result_gs_info de nguoi hoc thay ngay bo dieu khien va thuyet minh
      if (out) {
        host.insertBefore(wrap, out);
      } else {
        host.appendChild(wrap);
      }

      this.bindControlsEvents(wrap);

      const initSlider = wrap.querySelector("#gsSpeedSlider");
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

      const pills = wrap.querySelectorAll("#gsPhasePills .coord-phase-btn");
      pills.forEach((pBtn, idx) => {
        pBtn.classList.toggle("active", idx === this._currentPhase);
      });

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

      const speedVal = wrap.querySelector("#gsSpeedValue");
      if (speedVal) speedVal.textContent = `${this._speed.toFixed(1)}×`;

      const speedSlider = wrap.querySelector("#gsSpeedSlider");
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

        const d = an.is3D ? 3 : 2;
        const subMap = { 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆" };
        if (this._currentPhase === 0) {
          const coeff = formatScalar(an.coeff21);
          const colNote = an.u2IsZero ? " (v₂ cùng phương u₁ nên chân chiếu p₁ trùng ngọn v₂)" : "";
          descEl.innerHTML = `Cố định trục chuẩn <b>u₁ = v₁ = [${an.u1.slice(0, d).map(formatScalar).join(", ")}]</b>.<br>Hạ đường gióng vuông góc từ ngọn v₂ xuống giá của u₁, thu được hình chiếu <b>p₁ = proj<sub>u₁</sub>(v₂) = ${coeff}·u₁ = [${an.p1.slice(0, d).map(formatScalar).join(", ")}]</b>${colNote}.`;
        } else if (this._currentPhase === 1) {
          const lines = [];
          for (let i = 1; i < an.steps.length; i++) {
            const st = an.steps[i];
            const sub = subMap[st.stepIndex] || st.stepIndex;
            const pLabel = i === 1 ? "p₁" : (i === 2 ? "p₁₂" : `p₁..${i}`);
            if (st.isZero) {
              lines.push(`<b>u${sub} = v${sub} - ${pLabel} = [0, ..., 0]</b> (v${sub} phụ thuộc tuyến tính vào các trục trước nên trượt về gốc O và bị loại bỏ).`);
            } else {
              lines.push(`Khử thành phần song song: <b>u${sub} = v${sub} - ${pLabel} = [${st.u.slice(0, d).map(formatScalar).join(", ")}]</b> vuông góc với không gian con trước đó.`);
            }
          }
          descEl.innerHTML = lines.join("<br>");
        } else if (this._currentPhase === 2) {
          const eListStr = an.nonZeroBasis
            .map((b) => `<b>e${subMap[b.stepIndex] || b.stepIndex} = [${b.e.slice(0, d).map((x) => x.toFixed(2)).join(", ")}]</b>`)
            .join(", ");
          const droppedCount = an.m - an.nonZeroBasis.length;
          const droppedNote =
            droppedCount > 0
              ? ` (đã loại bỏ ${droppedCount} vector phụ thuộc triệt tiêu về 0)`
              : "";
          descEl.innerHTML = `Chuẩn hóa ${an.nonZeroBasis.length} trục trực giao khác không về độ dài đơn vị <b>R = 1</b> (eᵢ = uᵢ / ‖uᵢ‖)${droppedNote}:<br>${eListStr || "∅"}.`;
        }
      }
    },

    // =========================================================================
    // 2D CANVAS RENDERING HOOKS (viewer2D.js - 0 PROSE TEXT ON CANVAS)
    // =========================================================================

    render2DSubspace(ctx, gridInfo) {
      if (!this._active || !gridInfo || App.mode !== "2D" || !this._analysis) return;
      const { cx, cy, px } = gridInfo;
      const an = this._analysis;
      const rawP = this._phaseProgress;

      const toScreen = (vx, vy) => ({
        x: cx + vx * px,
        y: cy - vy * px
      });

      ctx.save();

      // Luon hien duong truc chuan vo han chua u1
      if (an.nU1 > 1e-4) {
        const pLine = this._currentPhase === 0 ? smoothstep(rawP / 0.35) : 1.0;
        const dirX = an.u1[0] / an.nU1;
        const dirY = an.u1[1] / an.nU1;
        const extent = 28 * pLine;
        const pStart = toScreen(-dirX * extent, -dirY * extent);
        const pEnd = toScreen(dirX * extent, dirY * extent);

        ctx.beginPath();
        ctx.strokeStyle = "rgba(2, 132, 199, 0.32)";
        ctx.lineWidth = 1.4;
        ctx.setLineDash([5, 5]);
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(pEnd.x, pEnd.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (this._currentPhase === 1) {
        const pO = toScreen(0, 0);

        for (let i = 1; i < an.steps.length; i++) {
          const step = an.steps[i];
          const tInfo = this._getStepTiming(i, rawP);
          const pSlide = tInfo.pSlide;
          if (!tInfo.active && pSlide <= 0.001 && i > 1) continue;

          if (!step.isZero && step.nU > 1e-4 && pSlide > 0.001) {
            const dirX = step.u[0] / step.nU;
            const dirY = step.u[1] / step.nU;
            const extent = 28 * pSlide;
            const pS = toScreen(-dirX * extent, -dirY * extent);
            const pE = toScreen(dirX * extent, dirY * extent);

            ctx.beginPath();
            ctx.strokeStyle = "rgba(16, 185, 129, 0.30)";
            ctx.lineWidth = 1.4;
            ctx.setLineDash([5, 5]);
            ctx.moveTo(pS.x, pS.y);
            ctx.lineTo(pE.x, pE.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Giai doan A (cho i >= 2): Ha duong giong tu v_{i+1} xuong pTotal truoc khi truot
          if (i >= 2 && tInfo.active && tInfo.pProj > 0.02 && pSlide < 0.05) {
            const curFoot = lerpVec(step.v, step.pTotal, tInfo.pProj);
            const ptV = toScreen(step.v[0], step.v[1]);
            const ptFoot = toScreen(curFoot[0], curFoot[1]);
            ctx.beginPath();
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 1.7;
            ctx.setLineDash([5, 4]);
            ctx.moveTo(ptV.x, ptV.y);
            ctx.lineTo(ptFoot.x, ptFoot.y);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = "#f59e0b";
            ctx.beginPath();
            ctx.arc(ptFoot.x, ptFoot.y, 3.8, 0, Math.PI * 2);
            ctx.fill();
            continue;
          }

          if (pSlide <= 0.001) continue;

          const curV = subVec(step.v, scaleVec(step.pTotal, pSlide));
          const pPRem = toScreen(step.pTotal[0] * (1 - pSlide), step.pTotal[1] * (1 - pSlide));
          const pVOrig = toScreen(step.v[0], step.v[1]);
          const pCur = toScreen(curV[0], curV[1]);
          const pPFull = toScreen(step.pTotal[0], step.pTotal[1]);

          if (!step.isZero) {
            ctx.beginPath();
            ctx.moveTo(pPFull.x, pPFull.y);
            ctx.lineTo(pVOrig.x, pVOrig.y);
            ctx.lineTo(pCur.x, pCur.y);
            ctx.lineTo(pPRem.x, pPRem.y);
            ctx.closePath();
            ctx.fillStyle = "rgba(16, 185, 129, 0.09)";
            ctx.fill();
          }

          ctx.beginPath();
          ctx.strokeStyle = i === 1 ? "rgba(99, 102, 241, 0.38)" : "rgba(139, 92, 246, 0.35)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.moveTo(pO.x, pO.y);
          ctx.lineTo(pVOrig.x, pVOrig.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.strokeStyle = step.isZero ? "rgba(239, 68, 68, 0.65)" : "rgba(245, 158, 11, 0.65)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.moveTo(pVOrig.x, pVOrig.y);
          ctx.lineTo(pCur.x, pCur.y);
          if (!step.isZero) {
            ctx.moveTo(pPFull.x, pPFull.y);
            ctx.lineTo(pVOrig.x, pVOrig.y);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else if (this._currentPhase === 2) {
        const pCircle = smoothstep(rawP / 0.35);
        const pNorm = smoothstep((rawP - 0.25) / 0.75);
        const pO = toScreen(0, 0);

        for (let bIdx = 0; bIdx < an.nonZeroBasis.length; bIdx++) {
          const b = an.nonZeroBasis[bIdx];
          const lenU = norm(b.u);
          if (lenU > 1e-4) {
            if (bIdx > 0) {
              const dirX = b.u[0] / lenU;
              const dirY = b.u[1] / lenU;
              const pS = toScreen(-dirX * 28, -dirY * 28);
              const pE = toScreen(dirX * 28, dirY * 28);
              ctx.beginPath();
              ctx.strokeStyle = "rgba(16, 185, 129, 0.25)";
              ctx.lineWidth = 1.2;
              ctx.setLineDash([5, 5]);
              ctx.moveTo(pS.x, pS.y);
              ctx.lineTo(pE.x, pE.y);
              ctx.stroke();
              ctx.setLineDash([]);
            }
            const pU = toScreen(b.u[0], b.u[1]);
            ctx.beginPath();
            ctx.strokeStyle = bIdx === 0 ? "rgba(2, 132, 199, 0.30)" : "rgba(16, 185, 129, 0.30)";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.moveTo(pO.x, pO.y);
            ctx.lineTo(pU.x, pU.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }

        // Duong tron don vi R = 1.0
        ctx.beginPath();
        ctx.arc(cx, cy, 1.0 * px * pCircle, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(2, 132, 199, ${0.05 * pCircle})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(2, 132, 199, ${0.55 * pCircle})`;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // O vuong don vi truc chuan 1 x 1 (chi ve khi co du 2 truc truc giao khac 0)
        if (an.nonZeroBasis.length >= 2) {
          const b1 = an.nonZeroBasis[0];
          const b2 = an.nonZeroBasis[1];
          const curE1 = lerpVec(b1.u, b1.e, pNorm);
          const curE2 = lerpVec(b2.u, b2.e, pNorm);
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
          ctx.strokeStyle = "rgba(16, 185, 129, 0.65)";
          ctx.lineWidth = 1.4;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      ctx.restore();
    },

    render2DProjections(ctx, gridInfo) {
      if (!this._active || !gridInfo || App.mode !== "2D" || !this._analysis) return;
      const { cx, cy, px } = gridInfo;
      const an = this._analysis;
      const rawP = this._phaseProgress;

      const toScreen = (vx, vy) => ({
        x: cx + vx * px,
        y: cy - vy * px
      });

      ctx.save();

      // Ky hieu goc vuong 90 do chuan hinh hoc (khong dung chu)
      const drawSquareAngleMarker = (ptP, d1, d2, size = 12, color = "#10b981") => {
        const len1 = Math.hypot(d1[0], d1[1]);
        const len2 = Math.hypot(d2[0], d2[1]);
        if (len1 < 1e-4 || len2 < 1e-4) return;

        const u1x = (d1[0] / len1) * size;
        const u1y = (-d1[1] / len1) * size;
        const u2x = (d2[0] / len2) * size;
        const u2y = (-d2[1] / len2) * size;

        const pt1 = { x: ptP.x + u1x, y: ptP.y + u1y };
        const ptCorner = { x: ptP.x + u1x + u2x, y: ptP.y + u1y + u2y };
        const pt2 = { x: ptP.x + u2x, y: ptP.y + u2y };

        ctx.fillStyle = color === "#f59e0b" ? "rgba(245, 158, 11, 0.18)" : "rgba(16, 185, 129, 0.20)";
        ctx.beginPath();
        ctx.moveTo(ptP.x, ptP.y);
        ctx.lineTo(pt1.x, pt1.y);
        ctx.lineTo(ptCorner.x, ptCorner.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(ptCorner.x, ptCorner.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(ptP.x + 0.5 * (u1x + u2x), ptP.y + 0.5 * (u1y + u2y), 1.6, 0, Math.PI * 2);
        ctx.fill();
      };

      if (this._currentPhase === 0) {
        const pDrop = smoothstep((rawP - 0.25) / 0.75);
        if (pDrop > 0.01) {
          const ptV2 = toScreen(an.v2[0], an.v2[1]);
          const curFoot = lerpVec(an.v2, an.p1, pDrop);
          const ptFoot = toScreen(curFoot[0], curFoot[1]);

          ctx.beginPath();
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 1.8;
          ctx.setLineDash([5, 4]);
          ctx.moveTo(ptV2.x, ptV2.y);
          ctx.lineTo(ptFoot.x, ptFoot.y);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = "#f59e0b";
          ctx.beginPath();
          ctx.arc(ptFoot.x, ptFoot.y, 3.8, 0, Math.PI * 2);
          ctx.fill();

          if (pDrop >= 0.75 && an.nU1 > 1e-4 && an.nU2 > 1e-4) {
            const dirU1 = norm(an.p1) > 1e-4 ? [-an.p1[0], -an.p1[1]] : [an.u1[0], an.u1[1]];
            const dirPerp = [an.u2[0], an.u2[1]];
            drawSquareAngleMarker(toScreen(an.p1[0], an.p1[1]), dirU1, dirPerp, 13, "#f59e0b");
          }
        }
      } else if (this._currentPhase === 1) {
        const pSlide2 = this._getStepSlideProgress(1, rawP);
        const ptP1 = toScreen(an.p1[0], an.p1[1]);
        const ptO = toScreen(0, 0);

        if (an.nU1 > 1e-4 && an.nU2 > 1e-4 && pSlide2 < 0.85) {
          const dirU1 = norm(an.p1) > 1e-4 ? [-an.p1[0], -an.p1[1]] : [an.u1[0], an.u1[1]];
          drawSquareAngleMarker(ptP1, dirU1, [an.u2[0], an.u2[1]], 11, "#f59e0b");
        }

        if (an.nonZeroBasis.length >= 2) {
          const b1 = an.nonZeroBasis[0];
          const b2 = an.nonZeroBasis[1];
          const pSlideB2 = this._getStepSlideProgress(b2.vecIndex, rawP);
          if (pSlideB2 >= 0.55) {
            drawSquareAngleMarker(ptO, [b1.u[0], b1.u[1]], [b2.u[0], b2.u[1]], 14, "#10b981");
          }
        }

        // Vong tron do tai goc O khi bat ky vector phu thuoc nao dang triet tieu ve 0
        let anyZeroCollapsing = false;
        for (let i = 1; i < an.steps.length; i++) {
          const st = an.steps[i];
          const pSl = this._getStepSlideProgress(i, rawP);
          if (st.isZero && pSl > 0.55 && pSl < 0.99) {
            anyZeroCollapsing = true;
            break;
          }
        }
        if (anyZeroCollapsing) {
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ptO.x, ptO.y, 7, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (this._currentPhase === 2) {
        const pNorm = smoothstep((rawP - 0.25) / 0.75);
        const ptO = toScreen(0, 0);
        if (an.nonZeroBasis.length >= 2) {
          const b1 = an.nonZeroBasis[0];
          const b2 = an.nonZeroBasis[1];
          drawSquareAngleMarker(ptO, [b1.e[0], b1.e[1]], [b2.e[0], b2.e[1]], 13, "#10b981");
        }

        if (pNorm > 0.7) {
          for (const b of an.nonZeroBasis) {
            const ptE = toScreen(b.e[0], b.e[1]);
            ctx.fillStyle = b.color || "#10b981";
            ctx.beginPath();
            ctx.arc(ptE.x, ptE.y, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.restore();
    },

    // =========================================================================
    // 3D THREE.JS RENDERING HOOK (viewer3D.js - SCREEN-SPACE PRECISION MATCHING 2D)
    // =========================================================================
    render3D(mathGroup) {
      if (!this._active || !mathGroup || App.mode !== "3D" || !this._analysis) return;
      if (!window.THREE) return;

      this._frame3DCameraIfNeeded();

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
      if (this._threeGroup.parent !== mathGroup) {
        mathGroup.add(this._threeGroup);
      }

      const an = this._analysis;
      const rawP = this._phaseProgress;
      const u = (window.Vec3D && Vec3D.S3D && Vec3D.S3D.unitsPerWorld) || 1;

      // Quy doi kich thuoc pixel tren man hinh sang toa do 3D (Screen-Space Aesthetic nhu 2D)
      const vFOV = (((window.Vec3D && Vec3D._camera && Vec3D._camera.fov) || 24) * Math.PI) / 180;
      const screenH = Math.max(
        1,
        (window.Vec3D && Vec3D._renderer && Vec3D._renderer.domElement && Vec3D._renderer.domElement.clientHeight) || 760
      );
      const camDist = window.Vec3D && Vec3D._camera ? Vec3D._camera.position.length() : 16;
      const worldPerPx = (2 * Math.tan(vFOV / 2) * camDist) / screenH;

      // Duong net dut chuan kich thuoc pixel man hinh (mac dinh 6px dash, 4px gap giong 2D)
      const addDashedLine3D = (ptA, ptB, colorHex, opacity = 0.75, dashPx = 6, gapPx = 4) => {
        const pts = [
          new THREE.Vector3(ptA[0] * u, ptA[1] * u, ptA[2] * u),
          new THREE.Vector3(ptB[0] * u, ptB[1] * u, ptB[2] * u)
        ];
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineDashedMaterial({
          color: colorHex,
          transparent: true,
          opacity,
          dashSize: Math.max(0.015 * u, dashPx * worldPerPx),
          gapSize: Math.max(0.01 * u, gapPx * worldPerPx),
          depthWrite: false
        });
        const line = new THREE.Line(geom, mat);
        line.computeLineDistances();
        this._threeGroup.add(line);
      };

      // Cham tron danh dau diem chuan pixel man hinh (mac dinh 3.8px giong 2D)
      const addPointSphere3D = (pt, colorHex, radiusPx = 3.8, opacity = 1.0) => {
        const rWorld = Math.min(0.045 * u, radiusPx * worldPerPx);
        const sphGeom = new THREE.SphereGeometry(rWorld, 14, 14);
        const sphMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: opacity < 1.0,
          opacity
        });
        const sph = new THREE.Mesh(sphGeom, sphMat);
        sph.position.set(pt[0] * u, pt[1] * u, pt[2] * u);
        this._threeGroup.add(sph);
      };

      // Ky hieu goc vuong 90 do chuan hinh hoc 3D (kich thuoc 13px man hinh + cham tron tam 1.6px y het 2D)
      const add3DRightAngleMarker = (ptP, dir1, dir2, sizePx = 13, colorHex = 0x10b981) => {
        const len1 = norm(dir1);
        const len2 = norm(dir2);
        if (len1 < 1e-4 || len2 < 1e-4) return;

        const maxByVec = Math.min(len1, len2) * u * 0.28;
        const sideWorld = Math.max(0.025 * u, Math.min(sizePx * worldPerPx, maxByVec));

        const u1 = scaleVec(dir1, sideWorld / len1);
        const u2 = scaleVec(dir2, sideWorld / len2);

        const pO = new THREE.Vector3(ptP[0] * u, ptP[1] * u, ptP[2] * u);
        const pA = new THREE.Vector3(pO.x + u1[0], pO.y + u1[1], pO.z + u1[2]);
        const pCorner = new THREE.Vector3(pO.x + u1[0] + u2[0], pO.y + u1[1] + u2[1], pO.z + u1[2] + u2[2]);
        const pB = new THREE.Vector3(pO.x + u2[0], pO.y + u2[1], pO.z + u2[2]);

        const pts = [pA, pCorner, pB];
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.95 });
        this._threeGroup.add(new THREE.Line(geom, mat));

        const quadGeom = new THREE.BufferGeometry();
        quadGeom.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            [
              pO.x, pO.y, pO.z,
              pA.x, pA.y, pA.z,
              pCorner.x, pCorner.y, pCorner.z,
              pO.x, pO.y, pO.z,
              pCorner.x, pCorner.y, pCorner.z,
              pB.x, pB.y, pB.z
            ],
            3
          )
        );
        const quadMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.2,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        this._threeGroup.add(new THREE.Mesh(quadGeom, quadMat));

        // Cham tron nho chinh giua o vuong goc vuong (giong 2D)
        const dotR = Math.min(sideWorld * 0.14, 1.6 * worldPerPx);
        const dotGeom = new THREE.SphereGeometry(dotR, 10, 10);
        const dotMat = new THREE.MeshBasicMaterial({ color: colorHex });
        const dotMesh = new THREE.Mesh(dotGeom, dotMat);
        dotMesh.position.set(
          pO.x + 0.5 * (u1[0] + u2[0]),
          pO.y + 0.5 * (u1[1] + u2[1]),
          pO.z + 0.5 * (u1[2] + u2[2])
        );
        this._threeGroup.add(dotMesh);
      };

      // Mien hinh binh hanh quet khi tinh tien vector v_k doc theo -pTotal ve u_k (giong 2D)
      const addSweepQuad3D = (ptA, ptB, ptC, ptD, colorHex, opacity = 0.1) => {
        const quadGeom = new THREE.BufferGeometry();
        quadGeom.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            [
              ptA[0] * u, ptA[1] * u, ptA[2] * u,
              ptB[0] * u, ptB[1] * u, ptB[2] * u,
              ptC[0] * u, ptC[1] * u, ptC[2] * u,
              ptA[0] * u, ptA[1] * u, ptA[2] * u,
              ptC[0] * u, ptC[1] * u, ptC[2] * u,
              ptD[0] * u, ptD[1] * u, ptD[2] * u
            ],
            3
          )
        );
        const quadMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        this._threeGroup.add(new THREE.Mesh(quadGeom, quadMat));
      };

      // Vong tron do tai goc O khi vector phu thuoc triet tieu ve 0
      const addOriginZeroRing3D = () => {
        const ringR = 8 * worldPerPx;
        const ringGeom = new THREE.RingGeometry(ringR * 0.78, ringR, 28);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
          depthTest: false
        });
        const ringMesh = new THREE.Mesh(ringGeom, ringMat);
        if (window.Vec3D && Vec3D._camera) {
          ringMesh.quaternion.copy(Vec3D._camera.quaternion);
        }
        this._threeGroup.add(ringMesh);
      };

      // Luon hien duong truc chuan vo han chua u1 (co gian muot o dau Buoc 1 giong 2D)
      if (an.nU1 > 1e-4) {
        const pLine1 = this._currentPhase === 0 ? smoothstep(rawP / 0.35) : 1.0;
        const dirU1 = scaleVec(an.u1, (14 * pLine1) / an.nU1);
        addDashedLine3D(scaleVec(dirU1, -1), dirU1, 0x0284c7, 0.34, 5, 5);
      }

      if (this._currentPhase === 0) {
        const pDrop = smoothstep((rawP - 0.22) / 0.66);
        if (pDrop > 0.01) {
          const curFoot = lerpVec(an.v2, an.p1, pDrop);
          addDashedLine3D(an.v2, curFoot, 0xf59e0b, 0.92, 5, 4);
          addPointSphere3D(curFoot, 0xf59e0b, 3.8, 0.98);

          if (pDrop >= 0.75 && an.nU1 > 1e-4 && an.nU2 > 1e-4) {
            const dirAlongU1 = norm(an.p1) > 1e-4 ? scaleVec(an.p1, -1) : an.u1;
            add3DRightAngleMarker(an.p1, dirAlongU1, an.u2, 13, 0xf59e0b);
          }
        }
      } else if (this._currentPhase === 1) {
        let anyZeroCollapsing = false;

        for (let i = 1; i < an.steps.length; i++) {
          const step = an.steps[i];
          const tInfo = this._getStepTiming(i, rawP);
          const pSlide = tInfo.pSlide;
          if (!tInfo.active && pSlide <= 0.001 && i > 1) continue;

          // Neu la buoc 3 (v3 chieu xuong span(u1, u2)): ve mat phang con span(u1, u2) + hinh binh hanh thanh phan p12 = p31 + p32
          if (i === 2 && !an.u1IsZero && !an.u2IsZero) {
            const pPlane = tInfo.pProj;
            const e1 = an.e1;
            const e2 = an.e2;
            const halfExt = 5.5 * pPlane;
            const c00 = addVec(scaleVec(e1, -halfExt), scaleVec(e2, -halfExt));
            const c10 = addVec(scaleVec(e1, halfExt), scaleVec(e2, -halfExt));
            const c11 = addVec(scaleVec(e1, halfExt), scaleVec(e2, halfExt));
            const c01 = addVec(scaleVec(e1, -halfExt), scaleVec(e2, halfExt));
            addSweepQuad3D(c00, c10, c11, c01, 0x10b981, 0.08 * pPlane);

            // Hinh binh hanh tong hop hinh chieu p12 = p31 + p32 tren mat phang span(u1, u2)
            if (norm(an.p31) > 1e-4 && norm(an.p32) > 1e-4 && pSlide < 0.92) {
              const curP31 = scaleVec(an.p31, pPlane);
              const curP32 = scaleVec(an.p32, pPlane);
              const curP12 = scaleVec(an.p12, pPlane);
              addDashedLine3D(curP31, curP12, 0xf59e0b, 0.55 * pPlane, 4, 4);
              addDashedLine3D(curP32, curP12, 0xf59e0b, 0.55 * pPlane, 4, 4);
            }
          }

          // Giai doan A (cho i >= 2): Ha duong giong va moc pTotal truoc, v_{i+1} DUNG YEN
          if (i >= 2 && tInfo.active && tInfo.pProj > 0.02 && pSlide < 0.02) {
            const curFoot = lerpVec(step.v, step.pTotal, tInfo.pProj);
            addDashedLine3D(step.v, curFoot, 0xf59e0b, 0.9, 5, 4);
            addPointSphere3D(curFoot, 0xf59e0b, 3.8, 0.98);
            if (tInfo.pProj >= 0.75 && !step.isZero && norm(step.pTotal) > 1e-4 && step.nU > 1e-4) {
              add3DRightAngleMarker(step.pTotal, scaleVec(step.pTotal, -1), step.u, 12, 0xf59e0b);
            }
            continue;
          }

          if (pSlide <= 0.001) continue;

          // Duong truc truc giao vo han cho vector u_{i+1} khac 0
          if (!step.isZero && step.nU > 1e-4) {
            const dirU = scaleVec(step.u, (14 * pSlide) / step.nU);
            addDashedLine3D(scaleVec(dirU, -1), dirU, step.colorHex, 0.3 * pSlide, 5, 5);
          }

          // Mien hinh binh hanh quet (Sweep Quad) + Bong mo v_{i+1} + Duong truot song song -pTotal
          const curV = subVec(step.v, scaleVec(step.pTotal, pSlide));
          const pRem = scaleVec(step.pTotal, 1 - pSlide);
          if (!step.isZero && pSlide > 0.01) {
            addSweepQuad3D(step.pTotal, step.v, curV, pRem, step.colorHex, 0.1);
          }

          addDashedLine3D([0, 0, 0], step.v, i === 1 ? 0x6366f1 : 0x8b5cf6, 0.38, 4, 4);
          addDashedLine3D(step.v, curV, step.isZero ? 0xef4444 : 0xf59e0b, 0.72, 4, 3);
          if (!step.isZero && norm(step.pTotal) > 1e-4) {
            addDashedLine3D(step.pTotal, step.v, 0xf59e0b, 0.52, 5, 4);
          }

          // Ky hieu goc vuong tai chan hinh chieu pTotal va tai goc O sau khi dung truc u_{i+1}
          if (!step.isZero && step.nU > 1e-4) {
            if (pSlide < 0.85 && norm(step.pTotal) > 1e-4) {
              add3DRightAngleMarker(step.pTotal, scaleVec(step.pTotal, -1), step.u, 11, 0xf59e0b);
            }
            if (pSlide >= 0.55) {
              for (const b of an.nonZeroBasis) {
                if (b.vecIndex < i) {
                  add3DRightAngleMarker([0, 0, 0], b.u, step.u, 13, step.colorHex);
                }
              }
            }
          }

          if (step.isZero && pSlide > 0.55 && pSlide < 0.99) {
            anyZeroCollapsing = true;
          }
        }

        if (anyZeroCollapsing) {
          addOriginZeroRing3D();
        }
      } else if (this._currentPhase === 2) {
        const pSphere = smoothstep(rawP / 0.35);
        const pNorm = smoothstep((rawP - 0.25) / 0.75);

        // Truc vo han va bong mo cho cac vector u_i khac 0
        for (let bIdx = 0; bIdx < an.nonZeroBasis.length; bIdx++) {
          const b = an.nonZeroBasis[bIdx];
          if (b.nU > 1e-4) {
            if (bIdx > 0) {
              const dirU = scaleVec(b.u, 14 / b.nU);
              addDashedLine3D(scaleVec(dirU, -1), dirU, b.colorHex, 0.24, 5, 5);
            }
            addDashedLine3D([0, 0, 0], b.u, b.colorHex, 0.32, 4, 4);
          }
        }

        // Mat cau don vi R = 1.0: Be mat trong suot tinh te + 3 vong tron lon net dut chuan sach giao khoa (khong dung luoi tam giac wireframe roi mat)
        const rSphere = Math.max(0.05, 1.0 * u * pSphere);
        const sphereGeom = new THREE.SphereGeometry(rSphere, 32, 24);
        const sphereMat = new THREE.MeshBasicMaterial({
          color: 0x0284c7,
          transparent: true,
          opacity: 0.055 * pSphere,
          depthWrite: false
        });
        this._threeGroup.add(new THREE.Mesh(sphereGeom, sphereMat));

        const addGreatCircleDashed = (axisA, axisB, colorHex, opacity) => {
          const segments = 64;
          const pts = [];
          for (let s = 0; s <= segments; s++) {
            const theta = (s / segments) * Math.PI * 2;
            const c = Math.cos(theta) * rSphere;
            const sn = Math.sin(theta) * rSphere;
            pts.push(
              new THREE.Vector3(
                axisA[0] * c + axisB[0] * sn,
                axisA[1] * c + axisB[1] * sn,
                axisA[2] * c + axisB[2] * sn
              )
            );
          }
          const geom = new THREE.BufferGeometry().setFromPoints(pts);
          const mat = new THREE.LineDashedMaterial({
            color: colorHex,
            transparent: true,
            opacity: opacity * pSphere,
            dashSize: Math.max(0.015 * u, 5 * worldPerPx),
            gapSize: Math.max(0.01 * u, 4 * worldPerPx),
            depthWrite: false
          });
          const ring = new THREE.Line(geom, mat);
          ring.computeLineDistances();
          this._threeGroup.add(ring);
        };

        if (an.nonZeroBasis.length === 3) {
          addGreatCircleDashed(an.nonZeroBasis[0].e, an.nonZeroBasis[1].e, 0x0284c7, 0.52);
          addGreatCircleDashed(an.nonZeroBasis[0].e, an.nonZeroBasis[2].e, 0x0284c7, 0.36);
          addGreatCircleDashed(an.nonZeroBasis[1].e, an.nonZeroBasis[2].e, 0x10b981, 0.36);
        } else if (an.nonZeroBasis.length === 2) {
          const e1 = an.nonZeroBasis[0].e;
          const e2 = an.nonZeroBasis[1].e;
          const e3Ortho = normalizeVec(cross(e1, e2));
          addGreatCircleDashed(e1, e2, 0x0284c7, 0.55);
          if (norm(e3Ortho) > 1e-4) {
            addGreatCircleDashed(e1, e3Ortho, 0x0284c7, 0.28);
            addGreatCircleDashed(e2, e3Ortho, 0x10b981, 0.28);
          }
        } else {
          addGreatCircleDashed([1, 0, 0], [0, 1, 0], 0x0284c7, 0.45);
          addGreatCircleDashed([1, 0, 0], [0, 0, 1], 0x0284c7, 0.32);
          addGreatCircleDashed([0, 1, 0], [0, 0, 1], 0x0284c7, 0.32);
        }

        // Khoi hop don vi 1x1x1 (khi co du 3 truc truc chuan) hoac hinh vuong don vi 1x1 (khi co 2 truc truc chuan)
        if (an.nonZeroBasis.length === 3) {
          const curE1 = lerpVec(an.nonZeroBasis[0].u, an.nonZeroBasis[0].e, pNorm);
          const curE2 = lerpVec(an.nonZeroBasis[1].u, an.nonZeroBasis[1].e, pNorm);
          const curE3 = lerpVec(an.nonZeroBasis[2].u, an.nonZeroBasis[2].e, pNorm);
          const V = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(curE1[0] * u, curE1[1] * u, curE1[2] * u),
            new THREE.Vector3(curE2[0] * u, curE2[1] * u, curE2[2] * u),
            new THREE.Vector3((curE1[0] + curE2[0]) * u, (curE1[1] + curE2[1]) * u, (curE1[2] + curE2[2]) * u),
            new THREE.Vector3(curE3[0] * u, curE3[1] * u, curE3[2] * u),
            new THREE.Vector3((curE1[0] + curE3[0]) * u, (curE1[1] + curE3[1]) * u, (curE1[2] + curE3[2]) * u),
            new THREE.Vector3((curE2[0] + curE3[0]) * u, (curE2[1] + curE3[1]) * u, (curE2[2] + curE3[2]) * u),
            new THREE.Vector3(
              (curE1[0] + curE2[0] + curE3[0]) * u,
              (curE1[1] + curE2[1] + curE3[1]) * u,
              (curE1[2] + curE2[2] + curE3[2]) * u
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

          const boxMat = new THREE.MeshBasicMaterial({
            color: 0x10b981,
            transparent: true,
            opacity: 0.14,
            side: THREE.DoubleSide,
            depthWrite: false
          });
          this._threeGroup.add(new THREE.Mesh(boxGeom, boxMat));

          const edgeGeom = new THREE.EdgesGeometry(boxGeom);
          const edgeMat = new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.62 });
          this._threeGroup.add(new THREE.LineSegments(edgeGeom, edgeMat));

          add3DRightAngleMarker([0, 0, 0], curE1, curE2, 13, 0x10b981);
          add3DRightAngleMarker([0, 0, 0], curE1, curE3, 13, 0x8b5cf6);
          add3DRightAngleMarker([0, 0, 0], curE2, curE3, 13, 0x8b5cf6);
        } else if (an.nonZeroBasis.length === 2) {
          const curE1 = lerpVec(an.nonZeroBasis[0].u, an.nonZeroBasis[0].e, pNorm);
          const curE2 = lerpVec(an.nonZeroBasis[1].u, an.nonZeroBasis[1].e, pNorm);
          addSweepQuad3D([0, 0, 0], curE1, addVec(curE1, curE2), curE2, 0x10b981, 0.16);
          addDashedLine3D(curE1, addVec(curE1, curE2), 0x10b981, 0.65, 4, 4);
          addDashedLine3D(curE2, addVec(curE1, curE2), 0x10b981, 0.65, 4, 4);
          add3DRightAngleMarker([0, 0, 0], curE1, curE2, 13, 0x10b981);
        }

        // Cham sang tai dau mut e_i tren mat cau don vi R = 1 (giong 2D)
        if (pNorm > 0.7) {
          for (const b of an.nonZeroBasis) {
            addPointSphere3D(b.e, b.colorHex || 0x10b981, 3.8, 0.98);
          }
        }
      }
    }
  };

  App.GSAnimator = GSAnimator;
  App.computeGramSchmidtDetailed = computeGramSchmidtDetailed;
  App.stopGSAnimation = function () {
    if (GSAnimator.isActive()) GSAnimator.stop();
  };
})();
