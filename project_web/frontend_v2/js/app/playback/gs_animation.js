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

    return resolved.slice(0, 3);
  }

  // --- THUAT TOAN TRUC GIAO HOA GRAM - SCHMIDT DAY DU ---
  function computeGramSchmidtDetailed(items) {
    const vectors = items.map((it) => to3D(it.vec || it));
    const is3D =
      items.some((it) => {
        const v = it.vec || it;
        return v.length >= 3;
      }) || vectors.length >= 3;

    const m = vectors.length;
    const v1 = vectors[0] || [0, 0, 0];
    const v2 = vectors[1] || [0, 0, 0];
    const v3 = m >= 3 ? vectors[2] : null;

    // Buoc 1: u1 = v1
    const u1 = [...v1];
    const nU1 = norm(u1);

    // Hinh chieu cua v2 len u1
    const p1 = projVec(v2, u1);
    const coeff21 = dot(u1, u1) > 1e-9 ? dot(v2, u1) / dot(u1, u1) : 0;

    // Buoc 2: u2 = v2 - p1
    const u2 = subVec(v2, p1);
    const nU2 = norm(u2);

    // Buoc 2b: O 3D neu co v3
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

    // Buoc 3: Chuan hoa thanh e1, e2, (e3)
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
            vec: [0, 0, 0],
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

      // Chuyen sang 3D neu co vector 3D, hoac 2D neu la 2 vector 2D
      if (analysis.is3D && App.mode !== "3D") {
        if (typeof App.setMode === "function") App.setMode("3D");
        else if (typeof App.toggleMode === "function") App.toggleMode();
      } else if (!analysis.is3D && App.mode === "3D") {
        if (typeof App.setMode === "function") App.setMode("2D");
        else if (typeof App.toggleMode === "function") App.toggleMode();
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

    // --- VONG LAP RAF CHAY HOAT CANH LIEN HOAN 3 BUOC ---
    runCurrentPhase() {
      if (!this._active) return;
      if (this._paused) {
        this._phaseProgress = 1.0;
        this.applyPhaseStyles(this._currentPhase, 1.0);
        this.redraw();
        return;
      }

      const baseDurations = [2600, 3000, 2600];
      let lastTime = performance.now();
      let currentProgress = this._phaseProgress;

      const stepLoop = (now) => {
        if (!this._active || this._paused) return;

        const delta = Math.max(0, now - lastTime);
        lastTime = now;

        const baseDuration = baseDurations[this._currentPhase] || 2600;
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
            }, 420 / this._speed);
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
      // Phase 0: [0..0.30] truc u1, [0.30..1.0] ha duong giong va moc vector p1
      const pDrop = smoothstep((progress - 0.25) / 0.75);
      // Phase 1: neu 2 vector thi truot v2 trong [0..1]; neu 3 vector thi v2 truot [0..0.5], v3 truot [0.5..1.0]
      const pSlide2 = an.v3 ? smoothstep(progress / 0.52) : smoothstep(progress);
      const pSlide3 = an.v3 ? smoothstep((progress - 0.48) / 0.52) : 0;
      // Phase 2: [0..0.30] hien duong tron/mat cau don vi, [0.30..1.0] co gian u_i -> e_i
      const pNorm = smoothstep((progress - 0.25) / 0.75);

      if (p1Item) {
        if (phase === 0 && pDrop > 0.02 && norm(an.p1) > 1e-4) {
          p1Item.visible = true;
          p1Item.vec = scaleVec(an.p1, pDrop).slice(0, d);
          p1Item._gsColorCss = "#f59e0b";
          p1Item.colorHex = "#f59e0b";
          p1Item._gsAlpha = 0.95;
          p1Item.alpha = 0.95;
          p1Item._customLabelLatex = "p_1";
        } else {
          p1Item.visible = false;
          p1Item.alpha = 0;
        }
      }

      if (p12Item) {
        if (phase === 1 && an.v3 && progress >= 0.42 && progress <= 0.96 && norm(an.p12) > 1e-4) {
          const pSub = smoothstep((progress - 0.42) / 0.25);
          p12Item.visible = true;
          p12Item.vec = scaleVec(an.p12, pSub).slice(0, 3);
          p12Item._gsColorCss = "#f59e0b";
          p12Item.colorHex = "#f59e0b";
          p12Item._gsAlpha = 0.9 * (1 - 0.4 * pSlide3);
          p12Item.alpha = p12Item._gsAlpha;
          p12Item._customLabelLatex = "p_{12}";
        } else {
          p12Item.visible = false;
          p12Item.alpha = 0;
        }
      }

      for (let i = 0; i < an.items.length; i++) {
        const item = an.items[i];
        const vItem = App.vectorList.find((v) => v.id === item.id);
        if (!vItem) continue;

        if (i === 0) {
          // Vector 1: u1 = v1 -> e1 (Xanh duong #0284c7)
          vItem._gsColorCss = "#0284c7";
          vItem.colorHex = "#0284c7";
          vItem._gsAlpha = 1.0;
          vItem.alpha = 1.0;
          if (phase === 0) {
            vItem.vec = an.u1.slice(0, d);
            vItem._customLabelLatex = "u_1";
          } else if (phase === 1) {
            vItem.vec = an.u1.slice(0, d);
            vItem._customLabelLatex = "u_1";
          } else if (phase === 2) {
            const cur = lerpVec(an.u1, an.e1, pNorm);
            vItem.vec = cur.slice(0, d);
            vItem._customLabelLatex = pNorm > 0.5 ? "e_1" : "u_1";
          }
        } else if (i === 1) {
          // Vector 2: v2 -> u2 = v2 - p1 -> e2 (Xanh ngoc #10b981)
          if (phase === 0) {
            vItem._gsColorCss = "#6366f1";
            vItem.colorHex = "#6366f1";
            vItem._gsAlpha = 0.95;
            vItem.alpha = 0.95;
            vItem.vec = an.v2.slice(0, d);
            vItem._customLabelLatex = "v_2";
          } else if (phase === 1) {
            vItem._gsColorCss = "#10b981";
            vItem.colorHex = "#10b981";
            vItem._gsAlpha = 1.0;
            vItem.alpha = 1.0;
            const cur = subVec(an.v2, scaleVec(an.p1, pSlide2));
            vItem.vec = cur.slice(0, d);
            vItem._customLabelLatex = pSlide2 > 0.65 ? "u_2" : "v_2";
          } else if (phase === 2) {
            vItem._gsColorCss = "#10b981";
            vItem.colorHex = "#10b981";
            vItem._gsAlpha = 1.0;
            vItem.alpha = 1.0;
            const cur = lerpVec(an.u2, an.e2, pNorm);
            vItem.vec = cur.slice(0, d);
            vItem._customLabelLatex = pNorm > 0.5 ? "e_2" : "u_2";
          }
        } else if (i === 2 && an.v3 && an.u3) {
          // Vector 3: v3 -> u3 = v3 - p12 -> e3 (Tim #8b5cf6)
          if (phase === 0) {
            vItem._gsColorCss = "#8b5cf6";
            vItem.colorHex = "#8b5cf6";
            vItem._gsAlpha = 0.45;
            vItem.alpha = 0.45;
            vItem.vec = an.v3.slice(0, 3);
            vItem._customLabelLatex = "v_3";
          } else if (phase === 1) {
            vItem._gsColorCss = "#8b5cf6";
            vItem.colorHex = "#8b5cf6";
            vItem._gsAlpha = progress < 0.45 ? 0.55 : 1.0;
            vItem.alpha = vItem._gsAlpha;
            const cur = subVec(an.v3, scaleVec(an.p12, pSlide3));
            vItem.vec = cur.slice(0, 3);
            vItem._customLabelLatex = pSlide3 > 0.65 ? "u_3" : "v_3";
          } else if (phase === 2 && an.e3) {
            vItem._gsColorCss = "#8b5cf6";
            vItem.colorHex = "#8b5cf6";
            vItem._gsAlpha = 1.0;
            vItem.alpha = 1.0;
            const cur = lerpVec(an.u3, an.e3, pNorm);
            vItem.vec = cur.slice(0, 3);
            vItem._customLabelLatex = pNorm > 0.5 ? "e_3" : "u_3";
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
        if (this._currentPhase === 0) {
          const coeff = formatScalar(an.coeff21);
          descEl.innerHTML = `Cố định trục chuẩn <b>u₁ = v₁ = [${an.u1.slice(0, d).map(formatScalar).join(", ")}]</b>.<br>Hạ đường gióng vuông góc từ ngọn v₂ xuống giá của u₁, thu được hình chiếu <b>p₁ = proj<sub>u₁</sub>(v₂) = ${coeff}·u₁ = [${an.p1.slice(0, d).map(formatScalar).join(", ")}]</b>.`;
        } else if (this._currentPhase === 1) {
          const checkDot = Math.abs(an.dotU1U2).toFixed(4);
          if (an.v3 && an.u3) {
            descEl.innerHTML = `Khử thành phần song song: <b>u₂ = v₂ - p₁ = [${an.u2.slice(0, 3).map(formatScalar).join(", ")}] ⊥ u₁</b>.<br>Tiếp tục hạ hình chiếu <b>p₁₂</b> của v₃ xuống mặt phẳng <b>span(u₁, u₂)</b> và rút phần dư trực giao <b>u₃ = v₃ - p₁₂ = [${an.u3.slice(0, 3).map(formatScalar).join(", ")}]</b>.`;
          } else {
            descEl.innerHTML = `Tịnh tiến v₂ ngược theo phương p₁ để khử thành phần song song: <b>u₂ = v₂ - p₁ = [${an.u2.slice(0, 2).map(formatScalar).join(", ")}]</b>.<br>Kiểm chứng: <b>⟨u₁, u₂⟩ = ${checkDot} = 0</b> (vuông góc 90° tại gốc O).`;
          }
        } else if (this._currentPhase === 2) {
          if (an.is3D && an.e3) {
            descEl.innerHTML = `Co giãn các vector trực giao uᵢ về mặt cầu đơn vị <b>R = 1</b> (eᵢ = uᵢ / ‖uᵢ‖):<br><b>e₁ = [${an.e1.slice(0, 3).map((x) => x.toFixed(2)).join(", ")}], e₂ = [${an.e2.slice(0, 3).map((x) => x.toFixed(2)).join(", ")}], e₃ = [${an.e3.slice(0, 3).map((x) => x.toFixed(2)).join(", ")}]</b>.`;
          } else {
            descEl.innerHTML = `Co giãn 2 vector trực giao u₁, u₂ về đường tròn đơn vị <b>R = 1</b> (eᵢ = uᵢ / ‖uᵢ‖):<br><b>e₁ = [${an.e1.slice(0, 2).map((x) => x.toFixed(2)).join(", ")}], e₂ = [${an.e2.slice(0, 2).map((x) => x.toFixed(2)).join(", ")}]</b>, tạo thành ô vuông đơn vị trực chuẩn 1 × 1.`;
          }
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
        // Buoc 2: Truc vuong goc vo han chua u2 + Hinh binh hanh tru vector u2 = v2 - p1
        const pSlide = smoothstep(rawP);
        if (an.nU2 > 1e-4) {
          const dir2X = an.u2[0] / an.nU2;
          const dir2Y = an.u2[1] / an.nU2;
          const extent2 = 28 * pSlide;
          const p2Start = toScreen(-dir2X * extent2, -dir2Y * extent2);
          const p2End = toScreen(dir2X * extent2, dir2Y * extent2);

          ctx.beginPath();
          ctx.strokeStyle = "rgba(16, 185, 129, 0.30)";
          ctx.lineWidth = 1.4;
          ctx.setLineDash([5, 5]);
          ctx.moveTo(p2Start.x, p2Start.y);
          ctx.lineTo(p2End.x, p2End.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Mien hinh chu nhat / hinh binh hanh giua O, p1, v2, curVec
        const curV2 = subVec(an.v2, scaleVec(an.p1, pSlide));
        const pO = toScreen(0, 0);
        const pP1 = toScreen(an.p1[0] * (1 - pSlide), an.p1[1] * (1 - pSlide));
        const pV2Orig = toScreen(an.v2[0], an.v2[1]);
        const pCur = toScreen(curV2[0], curV2[1]);
        const pP1Full = toScreen(an.p1[0], an.p1[1]);

        ctx.beginPath();
        ctx.moveTo(pP1Full.x, pP1Full.y);
        ctx.lineTo(pV2Orig.x, pV2Orig.y);
        ctx.lineTo(pCur.x, pCur.y);
        ctx.lineTo(pP1.x, pP1.y);
        ctx.closePath();
        ctx.fillStyle = "rgba(16, 185, 129, 0.09)";
        ctx.fill();

        // Bong mo vector v2 ban dau va p1 ban dau
        ctx.beginPath();
        ctx.strokeStyle = "rgba(99, 102, 241, 0.38)";
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 4]);
        ctx.moveTo(pO.x, pO.y);
        ctx.lineTo(pV2Orig.x, pV2Orig.y);
        ctx.stroke();

        // Duong truot song song tu ngon v2 den ngon u2(t)
        ctx.beginPath();
        ctx.strokeStyle = "rgba(245, 158, 11, 0.65)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.moveTo(pV2Orig.x, pV2Orig.y);
        ctx.lineTo(pCur.x, pCur.y);
        ctx.moveTo(pP1Full.x, pP1Full.y);
        ctx.lineTo(pV2Orig.x, pV2Orig.y);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (this._currentPhase === 2) {
        const pCircle = smoothstep(rawP / 0.35);
        const pNorm = smoothstep((rawP - 0.25) / 0.75);

        // Truc truc giao u2
        if (an.nU2 > 1e-4) {
          const dir2X = an.u2[0] / an.nU2;
          const dir2Y = an.u2[1] / an.nU2;
          const p2Start = toScreen(-dir2X * 28, -dir2Y * 28);
          const p2End = toScreen(dir2X * 28, dir2Y * 28);
          ctx.beginPath();
          ctx.strokeStyle = "rgba(16, 185, 129, 0.25)";
          ctx.lineWidth = 1.2;
          ctx.setLineDash([5, 5]);
          ctx.moveTo(p2Start.x, p2Start.y);
          ctx.lineTo(p2End.x, p2End.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Bong mo u1, u2 truoc khi chuan hoa
        const pO = toScreen(0, 0);
        const pU1 = toScreen(an.u1[0], an.u1[1]);
        const pU2 = toScreen(an.u2[0], an.u2[1]);
        ctx.beginPath();
        ctx.strokeStyle = "rgba(2, 132, 199, 0.30)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.moveTo(pO.x, pO.y);
        ctx.lineTo(pU1.x, pU1.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "rgba(16, 185, 129, 0.30)";
        ctx.lineWidth = 1.5;
        ctx.moveTo(pO.x, pO.y);
        ctx.lineTo(pU2.x, pU2.y);
        ctx.stroke();
        ctx.setLineDash([]);

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

        // O vuong don vi truc chuan 1 x 1
        const curE1 = lerpVec(an.u1, an.e1, pNorm);
        const curE2 = lerpVec(an.u2, an.e2, pNorm);
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

          // Duong giong net dut ha vuong goc tu ngon v2 xuong chan hinh chieu p1
          ctx.beginPath();
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 1.8;
          ctx.setLineDash([5, 4]);
          ctx.moveTo(ptV2.x, ptV2.y);
          ctx.lineTo(ptFoot.x, ptFoot.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Cham tron tai chan hinh chieu
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
        const pSlide = smoothstep(rawP);
        const ptP1 = toScreen(an.p1[0], an.p1[1]);
        const ptO = toScreen(0, 0);

        // Giữ góc vuông mờ tại chân chiếu cũ và bật sáng góc vuông 90° tại gốc O khi u2 về đích
        if (an.nU1 > 1e-4 && an.nU2 > 1e-4) {
          if (pSlide < 0.85) {
            const dirU1 = norm(an.p1) > 1e-4 ? [-an.p1[0], -an.p1[1]] : [an.u1[0], an.u1[1]];
            drawSquareAngleMarker(ptP1, dirU1, [an.u2[0], an.u2[1]], 11, "#f59e0b");
          }
          if (pSlide >= 0.55) {
            drawSquareAngleMarker(ptO, [an.u1[0], an.u1[1]], [an.u2[0], an.u2[1]], 14, "#10b981");
          }
        }
      } else if (this._currentPhase === 2) {
        const pNorm = smoothstep((rawP - 0.25) / 0.75);
        const ptO = toScreen(0, 0);
        if (an.nU1 > 1e-4 && an.nU2 > 1e-4) {
          drawSquareAngleMarker(ptO, [an.e1[0], an.e1[1]], [an.e2[0], an.e2[1]], 13, "#10b981");
        }

        // Cham sang tren duong tron don vi R = 1 khi e1, e2 cham dich
        if (pNorm > 0.7) {
          const ptE1 = toScreen(an.e1[0], an.e1[1]);
          const ptE2 = toScreen(an.e2[0], an.e2[1]);
          ctx.fillStyle = "#0284c7";
          ctx.beginPath();
          ctx.arc(ptE1.x, ptE1.y, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#10b981";
          ctx.beginPath();
          ctx.arc(ptE2.x, ptE2.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    },

    // =========================================================================
    // 3D THREE.JS RENDERING HOOK (viewer3D.js)
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

      const addDashedLine3D = (ptA, ptB, colorHex, opacity = 0.75, dash = 0.28, gap = 0.16) => {
        const pts = [
          new THREE.Vector3(ptA[0] * u, ptA[1] * u, ptA[2] * u),
          new THREE.Vector3(ptB[0] * u, ptB[1] * u, ptB[2] * u)
        ];
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineDashedMaterial({
          color: colorHex,
          transparent: true,
          opacity,
          dashSize: dash * u,
          gapSize: gap * u,
          depthWrite: false
        });
        const line = new THREE.Line(geom, mat);
        line.computeLineDistances();
        this._threeGroup.add(line);
      };

      const add3DRightAngleMarker = (ptP, dir1, dir2, size = 0.38, colorHex = 0x10b981) => {
        const len1 = norm(dir1);
        const len2 = norm(dir2);
        if (len1 < 1e-4 || len2 < 1e-4) return;

        const u1 = scaleVec(dir1, (size * u) / len1);
        const u2 = scaleVec(dir2, (size * u) / len2);

        const pO = new THREE.Vector3(ptP[0] * u, ptP[1] * u, ptP[2] * u);
        const pA = new THREE.Vector3(ptP[0] * u + u1[0], ptP[1] * u + u1[1], ptP[2] * u + u1[2]);
        const pCorner = new THREE.Vector3(
          ptP[0] * u + u1[0] + u2[0],
          ptP[1] * u + u1[1] + u2[1],
          ptP[2] * u + u1[2] + u2[2]
        );
        const pB = new THREE.Vector3(ptP[0] * u + u2[0], ptP[1] * u + u2[1], ptP[2] * u + u2[2]);

        const pts = [pA, pCorner, pB];
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 2 });
        this._threeGroup.add(new THREE.Line(geom, mat));

        const quadGeom = new THREE.BufferGeometry();
        quadGeom.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            [pO.x, pO.y, pO.z, pA.x, pA.y, pA.z, pCorner.x, pCorner.y, pCorner.z, pO.x, pO.y, pO.z, pCorner.x, pCorner.y, pCorner.z, pB.x, pB.y, pB.z],
            3
          )
        );
        const quadMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.24,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        this._threeGroup.add(new THREE.Mesh(quadGeom, quadMat));
      };

      // Truc chuan u1 keo dai net dut
      if (an.nU1 > 1e-4) {
        const dirU1 = scaleVec(an.u1, 14 / an.nU1);
        addDashedLine3D(scaleVec(dirU1, -1), dirU1, 0x0284c7, 0.35);
      }

      if (this._currentPhase === 0) {
        const pDrop = smoothstep((rawP - 0.25) / 0.75);
        if (pDrop > 0.02) {
          const curFoot = lerpVec(an.v2, an.p1, pDrop);
          addDashedLine3D(an.v2, curFoot, 0xf59e0b, 0.9, 0.25, 0.14);

          const sphGeom = new THREE.SphereGeometry(0.07 * u, 12, 12);
          const sphMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
          const sph = new THREE.Mesh(sphGeom, sphMat);
          sph.position.set(curFoot[0] * u, curFoot[1] * u, curFoot[2] * u);
          this._threeGroup.add(sph);

          if (pDrop >= 0.75 && an.nU1 > 1e-4 && an.nU2 > 1e-4) {
            const dirAlongU1 = norm(an.p1) > 1e-4 ? scaleVec(an.p1, -1) : an.u1;
            add3DRightAngleMarker(an.p1, dirAlongU1, an.u2, 0.42, 0xf59e0b);
          }
        }
      } else if (this._currentPhase === 1) {
        const pSlide2 = an.v3 ? smoothstep(rawP / 0.52) : smoothstep(rawP);
        const pSlide3 = an.v3 ? smoothstep((rawP - 0.48) / 0.52) : 0;

        // Bong mo v2 va duong truot song song tu v2 ve u2
        addDashedLine3D([0, 0, 0], an.v2, 0x6366f1, 0.38);
        const curV2 = subVec(an.v2, scaleVec(an.p1, pSlide2));
        addDashedLine3D(an.v2, curV2, 0xf59e0b, 0.65);
        addDashedLine3D(an.p1, an.v2, 0xf59e0b, 0.45);

        if (pSlide2 >= 0.55 && an.nU1 > 1e-4 && an.nU2 > 1e-4) {
          add3DRightAngleMarker([0, 0, 0], an.u1, an.u2, 0.45, 0x10b981);
        }

        // Neu co vector v3 trong 3D:
        if (an.v3 && an.u3 && rawP >= 0.42) {
          const pPlane = smoothstep((rawP - 0.42) / 0.25);
          const normVec = cross(an.u1, an.u2);
          const nLen = norm(normVec);
          if (nLen > 1e-4) {
            const planeGeom = new THREE.PlaneGeometry(14 * u, 14 * u);
            const planeMat = new THREE.MeshBasicMaterial({
              color: 0x10b981,
              transparent: true,
              opacity: 0.14 * pPlane,
              side: THREE.DoubleSide,
              depthWrite: false
            });
            const planeMesh = new THREE.Mesh(planeGeom, planeMat);
            const normal = new THREE.Vector3(normVec[0] / nLen, normVec[1] / nLen, normVec[2] / nLen);
            planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
            this._threeGroup.add(planeMesh);
          }

          // Duong giong tu v3 xuong p12 tren mat phang span(u1, u2)
          addDashedLine3D([0, 0, 0], an.v3, 0x8b5cf6, 0.35);
          addDashedLine3D(an.v3, an.p12, 0xf59e0b, 0.85);
          const curV3 = subVec(an.v3, scaleVec(an.p12, pSlide3));
          addDashedLine3D(an.v3, curV3, 0x8b5cf6, 0.65);

          if (norm(an.p12) > 1e-4 && an.nU3 > 1e-4) {
            add3DRightAngleMarker(an.p12, scaleVec(an.p12, -1), an.u3, 0.4, 0xf59e0b);
          }
          if (pSlide3 >= 0.65 && an.nU3 > 1e-4) {
            add3DRightAngleMarker([0, 0, 0], an.u1, an.u3, 0.45, 0x8b5cf6);
            add3DRightAngleMarker([0, 0, 0], an.u2, an.u3, 0.45, 0x8b5cf6);
          }
        }
      } else if (this._currentPhase === 2) {
        const pSphere = smoothstep(rawP / 0.35);
        const pNorm = smoothstep((rawP - 0.25) / 0.75);

        // Bong mo u1, u2, (u3)
        addDashedLine3D([0, 0, 0], an.u1, 0x0284c7, 0.32);
        addDashedLine3D([0, 0, 0], an.u2, 0x10b981, 0.32);
        if (an.u3) addDashedLine3D([0, 0, 0], an.u3, 0x8b5cf6, 0.32);

        // Mat cau don vi R = 1.0 + 3 vong tron lon xich dao
        const rSphere = Math.max(0.05, 1.0 * u * pSphere);
        const sphereGeom = new THREE.SphereGeometry(rSphere, 28, 20);
        const sphereMat = new THREE.MeshBasicMaterial({
          color: 0x0284c7,
          wireframe: true,
          transparent: true,
          opacity: 0.16 * pSphere,
          depthWrite: false
        });
        this._threeGroup.add(new THREE.Mesh(sphereGeom, sphereMat));

        // Khoi hop don vi 1x1x1 (3 vector) hoac hinh vuong don vi 1x1 (2 vector)
        const curE1 = lerpVec(an.u1, an.e1, pNorm);
        const curE2 = lerpVec(an.u2, an.e2, pNorm);

        if (an.v3 && an.u3 && an.e3) {
          const curE3 = lerpVec(an.u3, an.e3, pNorm);
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
            opacity: 0.16,
            side: THREE.DoubleSide,
            depthWrite: false
          });
          this._threeGroup.add(new THREE.Mesh(boxGeom, boxMat));

          const edgeGeom = new THREE.EdgesGeometry(boxGeom);
          const edgeMat = new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.65 });
          this._threeGroup.add(new THREE.LineSegments(edgeGeom, edgeMat));

          add3DRightAngleMarker([0, 0, 0], curE1, curE2, 0.35, 0x10b981);
          add3DRightAngleMarker([0, 0, 0], curE1, curE3, 0.35, 0x8b5cf6);
          add3DRightAngleMarker([0, 0, 0], curE2, curE3, 0.35, 0x8b5cf6);
        } else {
          // 2 vector trong 3D: O vuong don vi 1x1
          const pos = [
            0, 0, 0,
            curE1[0] * u, curE1[1] * u, curE1[2] * u,
            (curE1[0] + curE2[0]) * u, (curE1[1] + curE2[1]) * u, (curE1[2] + curE2[2]) * u,
            0, 0, 0,
            (curE1[0] + curE2[0]) * u, (curE1[1] + curE2[1]) * u, (curE1[2] + curE2[2]) * u,
            curE2[0] * u, curE2[1] * u, curE2[2] * u
          ];
          const sqGeom = new THREE.BufferGeometry();
          sqGeom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
          const sqMat = new THREE.MeshBasicMaterial({
            color: 0x10b981,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide,
            depthWrite: false
          });
          this._threeGroup.add(new THREE.Mesh(sqGeom, sqMat));
          add3DRightAngleMarker([0, 0, 0], curE1, curE2, 0.38, 0x10b981);
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
