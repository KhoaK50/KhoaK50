// ==================================================================================
// LINEAR INDEPENDENCE 3-STEP PLAYBACK ENGINE (ACADEMIC MATHEMATICAL ESSENCE)
// Trực quan hóa bản chất Độc lập & Phụ thuộc tuyến tính (2D Canvas & 3D Three.js)
// Kịch bản 3 bước liên hoàn thuần hình học (Zero Canvas Prose):
//   Bước 1: Độ mở Không gian & Thể tích/Diện tích Định thức (|det| > 0 vs Suy biến = 0)
//   Bước 2: Tổ hợp Tuyến tính Nối đuôi (Phụ thuộc) vs Thành phần Trực giao Thoát (Độc lập)
//   Bước 3: Phân tách Hệ trụ Độc lập (Nét liền) & Vector Dư thừa (Nét đứt trên Span)
// Tuân thủ triệt để Zero Em-dash (\u2014) và chuẩn mực Anti-Slop.
// ==================================================================================
(function () {
  window.App = window.App || {};

  const TEMP_ID_COMP1 = -9701;
  const TEMP_ID_ORTHO = -9702;

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

  function resolveIndepItems(selectedItems) {
    const vList = Array.isArray(App.vectorList) ? App.vectorList : [];

    // 1. Nếu truyền trực tiếp mảng đối tượng từ App.vectorList (có thuộc tính id và vec)
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

    // 2. Ưu tiên đọc từ các checkbox được tick trong #indepChecklist (khớp chính xác v.id)
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

  // --- THUẬT TOÁN ĐẠI SỐ TUYẾN TÍNH PHÂN TÍCH ĐỘC LẬP / PHỤ THUỘC ---
  function analyzeLinearIndependence(items) {
    const m = items.length;
    const vectors = items.map((it) => to3D(it.vec || it));
    const is3D = items.some((it) => (it.vec || it).length >= 3) || App.mode === "3D";
    const n = is3D ? 3 : 2;

    // Lập ma trận M có các cột là các vector v_1, ..., v_m (kích thước n x m)
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

    // Biểu diễn các vector phụ thuộc qua các cột trụ pivot: v_red = sum(coeff_p * v_pivot_p)
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
    if (!is3D && m >= 2) {
      detVal = Math.abs(vectors[0][0] * vectors[1][1] - vectors[0][1] * vectors[1][0]);
      volumeGeometryType = "parallelogram_2d";
    } else if (is3D && m >= 3) {
      const c12 = cross(vectors[1], vectors[2]);
      detVal = Math.abs(dot(vectors[0], c12));
      volumeGeometryType = "parallelepiped_3d";
    } else if (is3D && m === 2) {
      detVal = norm(cross(vectors[0], vectors[1]));
      volumeGeometryType = "parallelogram_3d";
    } else if (m === 1) {
      detVal = norm(vectors[0]);
      volumeGeometryType = "line_1d";
    }

    // Thành phần trực giao thoát khỏi không gian con của các vector đứng trước (cho Bước 2 khi độc lập)
    let orthoFoot = [0, 0, 0];
    let orthoEscapeVec = [0, 0, 0];
    let orthoSourceVec = vectors[Math.min(m - 1, 2)] || [0, 0, 0];

    if (m >= 2) {
      if (m === 2 || !is3D) {
        const u1 = vectors[0];
        const v2 = vectors[1];
        orthoSourceVec = v2;
        const u1NormSq = dot(u1, u1);
        if (u1NormSq > 1e-9) {
          const sc = dot(v2, u1) / u1NormSq;
          orthoFoot = [sc * u1[0], sc * u1[1], sc * u1[2]];
          orthoEscapeVec = [v2[0] - orthoFoot[0], v2[1] - orthoFoot[1], v2[2] - orthoFoot[2]];
        }
      } else if (m >= 3 && is3D) {
        const u1 = vectors[0];
        const u2 = vectors[1];
        const v3 = vectors[2];
        orthoSourceVec = v3;
        const nVec = cross(u1, u2);
        const nNorm = norm(nVec);
        if (nNorm > 1e-9) {
          const unitN = [nVec[0] / nNorm, nVec[1] / nNorm, nVec[2] / nNorm];
          const dist = dot(v3, unitN);
          orthoEscapeVec = [unitN[0] * dist, unitN[1] * dist, unitN[2] * dist];
          orthoFoot = [v3[0] - orthoEscapeVec[0], v3[1] - orthoEscapeVec[1], v3[2] - orthoEscapeVec[2]];
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
      orthoFoot,
      orthoEscapeVec,
      orthoSourceVec
    };
  }

  // --- THÔNG TIN THUYẾT MINH 3 BƯỚC SƯ PHẠM ---
  const PHASES_INFO = [
    {
      index: 0,
      title: "Bước 1: Độ mở Không gian & Thể tích/Diện tích Định thức",
      desc: "Quét dựng hình bình hành (2D) hoặc hình hộp bình hành (3D) căng bởi hệ vector để kiểm tra độ mở không gian."
    },
    {
      index: 1,
      title: "Bước 2: Tổ hợp Tuyến tính Nối đuôi vs Chiều Thoát Trực giao",
      desc: "Kiểm tra xem vector mới có thể biểu diễn bằng đường đi nối đuôi dọc theo các vector trước hay có thành phần vuông góc thoát ra ngoài."
    },
    {
      index: 2,
      title: "Bước 3: Phân tách Hệ trụ Độc lập & Vector Dư thừa",
      desc: "Giữ nét liền đậm cho các vector trụ cột độc lập và chuyển các vector phụ thuộc dư thừa sang nét đứt trên không gian sinh."
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
    _tempIds: [],
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

    _frame3DCameraIfNeeded() {
      if (!window.Vec3D || !Vec3D._camera || !Vec3D._controls || App.mode !== "3D" || !this._analysis) return;
      if (Vec3D._resetAnimId) {
        cancelAnimationFrame(Vec3D._resetAnimId);
        Vec3D._resetAnimId = null;
      }
      if (!this._savedCamPos3D) {
        this._savedCamPos3D = Vec3D._camera.position.clone();
      }
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

    start(selectedItems) {
      const items = resolveIndepItems(selectedItems);
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
        colorHex: v.colorHex,
        latex: v.latex,
        _customLabelLatex: v._customLabelLatex,
        showProjection: v.showProjection,
        rawInput: v.rawInput,
        _isDashed: Boolean(v._isDashed)
      }));

      // Ẩn các vector không được chọn để tránh nhiễu không gian
      const selectedIds = new Set(items.map((it) => it.id));
      (App.vectorList || []).forEach((v) => {
        v.showProjection = false;
        if (!selectedIds.has(v.id)) {
          v.visible = false;
        } else {
          v.visible = true;
        }
      });

      // Tạo vector phụ trợ cho Bước 2 (Thành phần tổ hợp đầu tiên hoặc hình chiếu song song)
      this._tempIds = [];
      const dim = analysis.is3D ? 3 : 2;
      if (Array.isArray(App.vectorList)) {
        const compItem = {
          id: TEMP_ID_COMP1,
          vec: dim === 3 ? [0, 0, 0] : [0, 0],
          colorCss: "#f59e0b",
          colorHex: "#f59e0b",
          color: "#f59e0b",
          visible: false,
          alpha: 0,
          showArrow: true,
          showProjection: false,
          latex: "[0, 0]",
          _customLabelLatex: "\\alpha_1 \\vec{v}_1"
        };
        App.vectorList.push(compItem);
        this._tempIds.push(TEMP_ID_COMP1);

        const orthoItem = {
          id: TEMP_ID_ORTHO,
          vec: dim === 3 ? [0, 0, 0] : [0, 0],
          colorCss: "#0284c7",
          colorHex: "#0284c7",
          color: "#0284c7",
          visible: false,
          alpha: 0,
          showArrow: true,
          showProjection: false,
          latex: "[0, 0]",
          _customLabelLatex: "p_{\\parallel}"
        };
        App.vectorList.push(orthoItem);
        this._tempIds.push(TEMP_ID_ORTHO);
      }

      // Chuyển chế độ 2D / 3D nếu vector có 3 tọa độ
      const has3DCoord = items.some((it) => (it.vec || it).length >= 3);
      if (has3DCoord && App.mode !== "3D") {
        if (typeof App.setMode === "function") App.setMode("3D");
        else if (typeof App.toggleMode === "function") App.toggleMode();
      }

      this._savedCamPos3D = null;
      this._frame3DCameraIfNeeded();

      this.ensureControls();
      const wrap = document.getElementById("indepAnimControls");
      if (wrap) wrap.style.display = "block";

      this._active = true;
      this._paused = false;
      this._currentPhase = 0;
      this._phaseProgress = 0;
      App._indepAnimActive = true;

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
      App._indepAnimActive = false;

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

      if (Array.isArray(App.vectorList) && this._tempIds && this._tempIds.length > 0) {
        const rmSet = new Set(this._tempIds);
        for (let i = App.vectorList.length - 1; i >= 0; i--) {
          if (rmSet.has(App.vectorList[i].id)) {
            App.vectorList.splice(i, 1);
          }
        }
      }
      this._tempIds = [];

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

      const baseDurations = [2500, 2800, 2300];
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
      if (!this._analysis || !Array.isArray(App.vectorList)) return;
      const an = this._analysis;
      const p = smoothstep(progress);
      const dim = an.is3D ? 3 : 2;
      const toDim = (v3) => (dim === 3 ? [v3[0], v3[1], v3[2]] : [v3[0], v3[1]]);

      const compItem = App.vectorList.find((v) => v.id === TEMP_ID_COMP1);
      const orthoItem = App.vectorList.find((v) => v.id === TEMP_ID_ORTHO);
      if (compItem) {
        compItem.visible = false;
        compItem.alpha = 0;
      }
      if (orthoItem) {
        orthoItem.visible = false;
        orthoItem.alpha = 0;
      }

      const palette = ["#0284c7", "#10b981", "#8b5cf6", "#f59e0b"];

      for (let i = 0; i < an.items.length; i++) {
        const item = an.items[i];
        const vItem = App.vectorList.find((v) => v.id === item.id);
        if (!vItem) continue;

        const isPivot = an.pivotCols.includes(i);
        const isRedundant = an.redundantIndices.includes(i);
        vItem.visible = true;
        vItem._customLabelLatex = `v_${i + 1}`;
        vItem._isDashed = false;

        if (phase === 0) {
          vItem._indepAlpha = 1.0;
          vItem._indepColorCss = isPivot ? palette[i % palette.length] : "#f59e0b";
        } else if (phase === 1) {
          if (!an.isIndependent) {
            vItem._indepAlpha = isRedundant ? 1.0 : 0.45;
            vItem._indepColorCss = isRedundant ? "#ef4444" : palette[i % palette.length];
          } else {
            vItem._indepAlpha = 0.92;
            vItem._indepColorCss = palette[i % palette.length];
          }
        } else if (phase === 2) {
          if (isPivot) {
            vItem._indepAlpha = 1.0;
            vItem._indepColorCss = i === 0 ? "#0284c7" : "#10b981";
            vItem._indepIsPillar = true;
            vItem._isDashed = false;
          } else if (isRedundant) {
            vItem._indepAlpha = 1.0 - p * 0.52;
            vItem._indepColorCss = "#94a3b8";
            vItem._indepIsRedundant = true;
            vItem._isDashed = progress > 0.25;
            vItem._customLabelLatex = `v_${i + 1}`;
          }
        }
      }

      // Ở Bước 2: Hiển thị vector phụ trợ cho tổ hợp tuyến tính hoặc hình chiếu song song
      if (phase === 1) {
        if (!an.isIndependent && an.redundantIndices.length > 0 && compItem) {
          const redIdx = an.redundantIndices[0];
          const redExp = an.redundantExpansions[redIdx];
          if (redExp && redExp.pivotCols.length > 0) {
            const pv0 = redExp.pivotCols[0];
            const cf0 = redExp.coeffs[0];
            const p1 = smoothstep(Math.min(1, progress / 0.55));
            const vScaled = [
              an.vectors[pv0][0] * cf0 * p1,
              an.vectors[pv0][1] * cf0 * p1,
              an.vectors[pv0][2] * cf0 * p1
            ];
            compItem.vec = toDim(vScaled);
            compItem.visible = p1 > 0.04;
            compItem.alpha = 0.95;
            compItem._indepAlpha = 0.95;
            compItem._indepColorCss = "#f59e0b";
            compItem._customLabelLatex = `${formatScalar(cf0)}v_${pv0 + 1}`;
          }
        } else if (an.isIndependent && an.m >= 2 && orthoItem) {
          const foot = an.orthoFoot;
          if (norm(foot) > 1e-4) {
            const pFoot = smoothstep(Math.min(1, progress / 0.5));
            orthoItem.vec = toDim([foot[0] * pFoot, foot[1] * pFoot, foot[2] * pFoot]);
            orthoItem.visible = pFoot > 0.05;
            orthoItem.alpha = 0.92;
            orthoItem._indepAlpha = 0.92;
            orthoItem._indepColorCss = "#0284c7";
            orthoItem._customLabelLatex = "p_{\\parallel}";
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
          <button type="button" class="coord-phase-btn" data-phase="1" title="Bước 2: Tổ hợp nối đuôi & Chiều trực giao">Bước 2</button>
          <button type="button" class="coord-phase-btn" data-phase="2" title="Bước 3: Phân tách hệ trụ & Vector dư thừa">Bước 3</button>
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

      if (out && out.parentNode === host) {
        host.insertBefore(wrap, out);
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
            descEl.innerHTML = `Khối căng bởi hệ vector mở ra không gian đầy đủ: <b>${an.volumeGeometryType === "parallelepiped_3d" ? "Thể tích" : "Diện tích"} |det| = ${an.detVal.toFixed(2)} &gt; 0</b>.<br>Không có vector nào bị ép bẹp vào không gian con của các vector còn lại.`;
          } else {
            descEl.innerHTML = `Hệ vector phụ thuộc tuyến tính làm khối hình bình hành <b>bị ép bẹp hoàn toàn (${an.volumeGeometryType === "parallelepiped_3d" ? "Thể tích" : "Diện tích"} |det| = 0)</b>.<br>Toàn bộ ${an.m} vector bị giam trong ${an.rank === 1 ? "cùng một đường thẳng 1D" : "cùng một mặt phẳng 2D"}.`;
          }
        } else if (this._currentPhase === 1) {
          if (an.isIndependent) {
            const hLen = norm(an.orthoEscapeVec).toFixed(2);
            descEl.innerHTML = `Hạ đường gióng vuông góc 90° xuống không gian con trước đó: lộ diện <b>vector thoát trực giao h<sub>⊥</sub> (độ dài ${hLen} &gt; 0)</b>.<br>Vì h<sub>⊥</sub> ≠ 0, phương trình c₁v₁ + c₂v₂ + ... = 0 chỉ có nghiệm tầm thường cᵢ = 0.`;
          } else {
            const redIdx = an.redundantIndices[0];
            const redExp = an.redundantExpansions[redIdx];
            let relText = `v_${redIdx + 1}`;
            if (redExp && redExp.coeffs) {
              const terms = redExp.coeffs.map((cf, pIdx) => `${formatScalar(cf)}·v_${redExp.pivotCols[pIdx] + 1}`).join(" + ");
              relText = `v_${redIdx + 1} = ${terms}`;
            }
            descEl.innerHTML = `Tồn tại biểu diễn tuyến tính: <b>${relText}</b>.<br>Đường đi nối đuôi (tip-to-tail) dọc theo các vector cơ sở chạm khít hoàn hảo vào tâm ngắm tại ngọn của <b>v<sub>${redIdx + 1}</sub></b>.`;
          }
        } else if (this._currentPhase === 2) {
          if (an.isIndependent) {
            descEl.innerHTML = `Toàn bộ <b>${an.m} vector đều là các trục trụ cột độc lập</b> (nét liền đậm).<br>Không có vector nào dư thừa; số chiều không gian sinh đạt cực đại <b>dim(span) = ${an.rank}</b>.`;
          } else {
            descEl.innerHTML = `Phân tách rõ: <b>${an.rank} vector trụ độc lập</b> (nét liền đậm) căng không gian sinh, và <b>${an.redundantIndices.length} vector dư thừa</b> (nét đứt mờ) nằm lệ thuộc bên trong.`;
          }
        }
      }
    },

    // =========================================================================
    // 2D CANVAS RENDERING HOOKS (PURE GEOMETRY - ZERO CANVAS PROSE)
    // =========================================================================
    render2DSubspace(ctx, gridInfo) {
      if (!this._active || !gridInfo || App.mode !== "2D" || !this._analysis) return;
      const { cx, cy, px } = gridInfo;
      const an = this._analysis;
      const p = smoothstep(this._phaseProgress);
      const isDark = document.body.classList.contains("dark");

      const toScreen = (vx, vy) => ({
        x: cx + vx * px,
        y: cy - vy * px
      });

      if (this._currentPhase === 0) {
        if (an.vectors.length >= 2) {
          const v1 = an.vectors[0];
          const v2 = an.vectors[1];

          if (an.isIndependent) {
            // Quét hình bình hành diện tích thực |det| > 0
            const pO = toScreen(0, 0);
            const pV1 = toScreen(v1[0], v1[1]);
            const pSum = toScreen(v1[0] + v2[0] * p, v1[1] + v2[1] * p);
            const pV2 = toScreen(v2[0] * p, v2[1] * p);

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(pO.x, pO.y);
            ctx.lineTo(pV1.x, pV1.y);
            ctx.lineTo(pSum.x, pSum.y);
            ctx.lineTo(pV2.x, pV2.y);
            ctx.closePath();

            ctx.fillStyle = isDark ? "rgba(16, 185, 129, 0.18)" : "rgba(16, 185, 129, 0.14)";
            ctx.fill();

            // Lưới con bên trong hình bình hành để thấy rõ diện tích
            ctx.strokeStyle = "rgba(16, 185, 129, 0.25)";
            ctx.lineWidth = 1.0;
            for (let k = 1; k <= 3; k++) {
              const t = k / 4;
              const a1 = toScreen(v1[0] * t, v1[1] * t);
              const b1 = toScreen(v1[0] * t + v2[0] * p, v1[1] * t + v2[1] * p);
              const a2 = toScreen(v2[0] * p * t, v2[1] * p * t);
              const b2 = toScreen(v1[0] + v2[0] * p * t, v1[1] + v2[1] * p * t);
              ctx.beginPath();
              ctx.moveTo(a1.x, a1.y);
              ctx.lineTo(b1.x, b1.y);
              ctx.moveTo(a2.x, a2.y);
              ctx.lineTo(b2.x, b2.y);
              ctx.stroke();
            }

            // Hai cạnh song song khép kín hình bình hành
            ctx.strokeStyle = "#10b981";
            ctx.lineWidth = 1.6;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(pV1.x, pV1.y);
            ctx.lineTo(pSum.x, pSum.y);
            ctx.lineTo(pV2.x, pV2.y);
            ctx.stroke();
            ctx.restore();
          } else {
            // Phụ thuộc tuyến tính: Hình bình hành bị ép dẹp hoàn toàn vào đường thẳng 1D
            const baseV = norm(v1) >= norm(v2) ? v1 : v2;
            const bLen = Math.hypot(baseV[0], baseV[1]);
            if (bLen > 1e-6) {
              const ux = baseV[0] / bLen;
              const uy = baseV[1] / bLen;
              const nx = -uy;
              const ny = ux;

              // Đường thẳng giam giữ 1D
              const L1 = toScreen(-ux * 25, -uy * 25);
              const L2 = toScreen(ux * 25, uy * 25);
              ctx.save();
              ctx.strokeStyle = "rgba(245, 158, 11, 0.55)";
              ctx.lineWidth = 2.0;
              ctx.setLineDash([7, 5]);
              ctx.beginPath();
              ctx.moveTo(L1.x, L1.y);
              ctx.lineTo(L2.x, L2.y);
              ctx.stroke();

              // Hiệu ứng hình bình hành ảo bị ép bẹp chiều cao vuông góc về 0
              const squeezeH = 0.85 * Math.max(0, 1 - p);
              const pO = toScreen(0, 0);
              const pV1 = toScreen(v1[0], v1[1]);
              const pV2 = toScreen(v2[0] + nx * squeezeH, v2[1] + ny * squeezeH);
              const pSum = toScreen(v1[0] + v2[0] + nx * squeezeH, v1[1] + v2[1] + ny * squeezeH);

              ctx.fillStyle = "rgba(245, 158, 11, 0.16)";
              ctx.strokeStyle = "#f59e0b";
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 3]);
              ctx.beginPath();
              ctx.moveTo(pO.x, pO.y);
              ctx.lineTo(pV1.x, pV1.y);
              ctx.lineTo(pSum.x, pSum.y);
              ctx.lineTo(pV2.x, pV2.y);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              ctx.restore();
            }
          }
        }
      } else if (this._currentPhase === 1) {
        // Bước 2: Đường thẳng span nền của vector đầu tiên
        if (an.vectors.length >= 1) {
          const v1 = an.vectors[0];
          const len1 = Math.hypot(v1[0], v1[1]);
          if (len1 > 1e-6) {
            const ux = v1[0] / len1;
            const uy = v1[1] / len1;
            const p1 = toScreen(-ux * 25, -uy * 25);
            const p2 = toScreen(ux * 25, uy * 25);
            ctx.save();
            ctx.strokeStyle = isDark ? "rgba(56, 189, 248, 0.35)" : "rgba(2, 132, 199, 0.32)";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 5]);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      } else if (this._currentPhase === 2) {
        // Bước 3: Không gian sinh span kết tinh
        ctx.save();
        if (an.rank === 1 && an.pivotCols.length > 0) {
          const pv = an.vectors[an.pivotCols[0]];
          const len = Math.hypot(pv[0], pv[1]);
          if (len > 1e-9) {
            const dirX = pv[0] / len;
            const dirY = pv[1] / len;
            const p1 = toScreen(-dirX * 30, -dirY * 30);
            const p2 = toScreen(dirX * 30, dirY * 30);
            ctx.strokeStyle = "rgba(2, 132, 199, 0.52)";
            ctx.lineWidth = 2.2;
            ctx.setLineDash([7, 5]);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        } else if (an.rank >= 2 && an.pivotCols.length >= 2) {
          // Lưới cơ sở căng bởi 2 vector trụ độc lập
          const u = an.vectors[an.pivotCols[0]];
          const v = an.vectors[an.pivotCols[1]];
          ctx.fillStyle = isDark ? "rgba(16, 185, 129, 0.06)" : "rgba(16, 185, 129, 0.05)";
          ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

          ctx.strokeStyle = isDark ? "rgba(16, 185, 129, 0.16)" : "rgba(16, 185, 129, 0.14)";
          ctx.lineWidth = 1.0;
          for (let k = -4; k <= 4; k++) {
            const a1 = toScreen(k * u[0] - 4 * v[0], k * u[1] - 4 * v[1]);
            const a2 = toScreen(k * u[0] + 4 * v[0], k * u[1] + 4 * v[1]);
            const b1 = toScreen(-4 * u[0] + k * v[0], -4 * u[1] + k * v[1]);
            const b2 = toScreen(4 * u[0] + k * v[0], 4 * u[1] + k * v[1]);
            ctx.beginPath();
            ctx.moveTo(a1.x, a1.y);
            ctx.lineTo(a2.x, a2.y);
            ctx.moveTo(b1.x, b1.y);
            ctx.lineTo(b2.x, b2.y);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    },

    render2DProjections(ctx, gridInfo) {
      if (!this._active || !gridInfo || App.mode !== "2D" || !this._analysis) return;
      const { cx, cy, px } = gridInfo;
      const an = this._analysis;
      const p = smoothstep(this._phaseProgress);

      const toScreen = (vx, vy) => ({
        x: cx + vx * px,
        y: cy - vy * px
      });

      const drawArrow2D = (pStart, pEnd, color, lineWidth = 2.2, dashed = false) => {
        const dx = pEnd.x - pStart.x;
        const dy = pEnd.y - pStart.y;
        const len = Math.hypot(dx, dy);
        if (len < 2) return;
        const angle = Math.atan2(dy, dx);
        const head = Math.min(11, len * 0.35);

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lineWidth;
        if (dashed) ctx.setLineDash([5, 4]);
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
        // Nếu suy biến (det = 0), vẽ 2 mũi tên nén vuông góc ép vào đường thẳng span
        if (!an.isIndependent && an.vectors.length >= 2) {
          const v1 = an.vectors[0];
          const v2 = an.vectors[1];
          const baseV = norm(v1) >= norm(v2) ? v1 : v2;
          const bLen = Math.hypot(baseV[0], baseV[1]);
          if (bLen > 1e-6) {
            const ux = baseV[0] / bLen;
            const uy = baseV[1] / bLen;
            const nx = -uy;
            const ny = ux;
            const mid = [baseV[0] * 0.55, baseV[1] * 0.55];
            const dist = 0.85 * Math.max(0.18, 1 - p * 0.82);

            const topStart = toScreen(mid[0] + nx * (dist + 0.55), mid[1] + ny * (dist + 0.55));
            const topEnd = toScreen(mid[0] + nx * 0.08, mid[1] + ny * 0.08);
            const botStart = toScreen(mid[0] - nx * (dist + 0.55), mid[1] - ny * (dist + 0.55));
            const botEnd = toScreen(mid[0] - nx * 0.08, mid[1] - ny * 0.08);

            drawArrow2D(topStart, topEnd, "#f59e0b", 1.8, false);
            drawArrow2D(botStart, botEnd, "#f59e0b", 1.8, false);
          }
        }
      } else if (this._currentPhase === 1) {
        if (!an.isIndependent && an.redundantIndices.length > 0) {
          // Phụ thuộc: Vẽ chuỗi mũi tên nối đuôi tip-to-tail và vòng tâm ngắm khóa vào ngọn v_red
          const redIdx = an.redundantIndices[0];
          const redExp = an.redundantExpansions[redIdx];
          if (redExp && redExp.pivotCols.length > 0) {
            const pv0 = redExp.pivotCols[0];
            const cf0 = redExp.coeffs[0];
            const tip1 = [an.vectors[pv0][0] * cf0, an.vectors[pv0][1] * cf0];

            if (redExp.pivotCols.length >= 2) {
              const pv1 = redExp.pivotCols[1];
              const cf1 = redExp.coeffs[1];
              const p2 = smoothstep(Math.max(0, (this._phaseProgress - 0.45) / 0.55));
              if (p2 > 0.02) {
                const startSc = toScreen(tip1[0], tip1[1]);
                const endSc = toScreen(
                  tip1[0] + an.vectors[pv1][0] * cf1 * p2,
                  tip1[1] + an.vectors[pv1][1] * cf1 * p2
                );
                drawArrow2D(startSc, endSc, "#10b981", 2.4, true);
              }
            }

            // Vòng tâm ngắm tại ngọn vector phụ thuộc
            const targetSc = toScreen(an.vectors[redIdx][0], an.vectors[redIdx][1]);
            ctx.save();
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(targetSc.x, targetSc.y, 7 + 4 * Math.sin(p * Math.PI), 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(targetSc.x, targetSc.y, 13, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        } else if (an.isIndependent && an.vectors.length >= 2) {
          // Độc lập: Hạ đường gióng vuông góc 90 độ từ v2 xuống span(v1) và vẽ mũi tên thoát trực giao
          const foot = an.orthoFoot;
          const v2 = an.orthoSourceVec;
          const esc = an.orthoEscapeVec;
          if (norm(esc) > 1e-4) {
            const pDrop = smoothstep(Math.min(1, this._phaseProgress / 0.6));
            const curFoot = [
              v2[0] + (foot[0] - v2[0]) * pDrop,
              v2[1] + (foot[1] - v2[1]) * pDrop
            ];
            const scV2 = toScreen(v2[0], v2[1]);
            const scCurFoot = toScreen(curFoot[0], curFoot[1]);
            const scFoot = toScreen(foot[0], foot[1]);

            // Đường gióng vuông góc
            ctx.save();
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 1.8;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(scV2.x, scV2.y);
            ctx.lineTo(scCurFoot.x, scCurFoot.y);
            ctx.stroke();
            ctx.restore();

            // Ký hiệu góc vuông 90 độ tại chân đường vuông góc H và mũi tên thoát từ H -> v2
            if (pDrop > 0.85) {
              const v1 = an.vectors[0];
              const u1Len = Math.hypot(v1[0], v1[1]) || 1;
              const eLen = Math.hypot(esc[0], esc[1]) || 1;
              const ux = (v1[0] / u1Len) * 11;
              const uy = -(v1[1] / u1Len) * 11;
              const nx = (esc[0] / eLen) * 11;
              const ny = -(esc[1] / eLen) * 11;

              ctx.save();
              ctx.strokeStyle = "#f59e0b";
              ctx.fillStyle = "rgba(245, 158, 11, 0.22)";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(scFoot.x, scFoot.y);
              ctx.lineTo(scFoot.x + ux, scFoot.y + uy);
              ctx.lineTo(scFoot.x + ux + nx, scFoot.y + uy + ny);
              ctx.lineTo(scFoot.x + nx, scFoot.y + ny);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              ctx.restore();

              drawArrow2D(scFoot, scV2, "#f59e0b", 2.2, false);
            }
          }
        }
      } else if (this._currentPhase === 2) {
        // Bước 3: Đường gióng hình bình hành từ vector dư thừa về các trục trụ độc lập
        if (!an.isIndependent && an.redundantIndices.length > 0) {
          for (const redIdx of an.redundantIndices) {
            const redExp = an.redundantExpansions[redIdx];
            if (redExp && redExp.pivotCols.length >= 2) {
              const pv0 = redExp.pivotCols[0];
              const pv1 = redExp.pivotCols[1];
              const c0 = redExp.coeffs[0];
              const c1 = redExp.coeffs[1];
              const pComp0 = toScreen(an.vectors[pv0][0] * c0, an.vectors[pv0][1] * c0);
              const pComp1 = toScreen(an.vectors[pv1][0] * c1, an.vectors[pv1][1] * c1);
              const pTip = toScreen(an.vectors[redIdx][0], an.vectors[redIdx][1]);

              ctx.save();
              ctx.strokeStyle = "rgba(148, 163, 184, 0.65)";
              ctx.lineWidth = 1.3;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(pComp0.x, pComp0.y);
              ctx.lineTo(pTip.x, pTip.y);
              ctx.lineTo(pComp1.x, pComp1.y);
              ctx.stroke();
              ctx.restore();
            }
          }
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
        if (an.vectors.length >= 3) {
          const v1 = an.vectors[0];
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
            new THREE.Vector3(v1[0] + v2[0] + v3[0], v1[1] + v2[1] + v3[1], v1[2] + v2[2] + v3[2])
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

          const geom = new THREE.BufferGeometry();
          geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
          geom.computeVertexNormals();

          const mat = new THREE.MeshBasicMaterial({
            color: an.isIndependent ? 0x10b981 : 0xf59e0b,
            transparent: true,
            opacity: an.isIndependent ? 0.20 : 0.26,
            side: THREE.DoubleSide,
            depthWrite: false
          });
          this._threeGroup.add(new THREE.Mesh(geom, mat));

          const edgePairs = [
            [0, 1], [0, 2], [1, 3], [2, 3],
            [4, 5], [4, 6], [5, 7], [6, 7],
            [0, 4], [1, 5], [2, 6], [3, 7]
          ];
          const edgePts = [];
          edgePairs.forEach(([a, b]) => {
            edgePts.push(V[a], V[b]);
          });
          const edgeGeom = new THREE.BufferGeometry().setFromPoints(edgePts);
          const edgeMat = new THREE.LineBasicMaterial({
            color: an.isIndependent ? 0x10b981 : 0xf59e0b,
            transparent: true,
            opacity: 0.78
          });
          this._threeGroup.add(new THREE.LineSegments(edgeGeom, edgeMat));
        } else if (an.vectors.length === 2) {
          const v1 = an.vectors[0];
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
            color: an.isIndependent ? 0x10b981 : 0xf59e0b,
            transparent: true,
            opacity: 0.24,
            side: THREE.DoubleSide,
            depthWrite: false
          });
          this._threeGroup.add(new THREE.Mesh(geom, mat));
        }
      } else if (this._currentPhase === 1) {
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
                color: k === 0 ? 0xf59e0b : 0x10b981,
                dashSize: 0.3,
                gapSize: 0.15
              });
              const line = new THREE.Line(lineGeom, lineMat);
              line.computeLineDistances();
              this._threeGroup.add(line);

              const sphGeom = new THREE.SphereGeometry(0.11, 14, 14);
              const sphMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
              const sph = new THREE.Mesh(sphGeom, sphMat);
              sph.position.set(next[0], next[1], next[2]);
              this._threeGroup.add(sph);

              curr = next;
            }
          }
        } else if (an.isIndependent && norm(an.orthoEscapeVec) > 1e-4) {
          // Mặt phẳng span(v1, v2) + đường gióng vuông góc + góc vuông 90 độ tại H
          if (an.m >= 3) {
            const nVec = cross(an.vectors[0], an.vectors[1]);
            const nLen = norm(nVec);
            if (nLen > 1e-6) {
              const planeGeom = new THREE.PlaneGeometry(12, 12);
              const planeMat = new THREE.MeshBasicMaterial({
                color: 0x0284c7,
                transparent: true,
                opacity: 0.14,
                side: THREE.DoubleSide,
                depthWrite: false
              });
              const planeMesh = new THREE.Mesh(planeGeom, planeMat);
              const normal = new THREE.Vector3(nVec[0] / nLen, nVec[1] / nLen, nVec[2] / nLen);
              planeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
              this._threeGroup.add(planeMesh);
            }
          }

          const foot = an.orthoFoot;
          const src = an.orthoSourceVec;
          const dropPts = [
            new THREE.Vector3(src[0], src[1], src[2]),
            new THREE.Vector3(
              src[0] + (foot[0] - src[0]) * p,
              src[1] + (foot[1] - src[1]) * p,
              src[2] + (foot[2] - src[2]) * p
            )
          ];
          const dropGeom = new THREE.BufferGeometry().setFromPoints(dropPts);
          const dropMat = new THREE.LineDashedMaterial({
            color: 0xf59e0b,
            dashSize: 0.25,
            gapSize: 0.14
          });
          const dropLine = new THREE.Line(dropGeom, dropMat);
          dropLine.computeLineDistances();
          this._threeGroup.add(dropLine);
        }
      } else if (this._currentPhase === 2) {
        if (an.rank === 2 && an.pivotCols.length >= 2) {
          const u = an.vectors[an.pivotCols[0]];
          const v = an.vectors[an.pivotCols[1]];
          const normVec = cross(u, v);
          const nLen = norm(normVec);
          if (nLen > 1e-6) {
            const planeGeom = new THREE.PlaneGeometry(14, 14);
            const planeMat = new THREE.MeshBasicMaterial({
              color: 0x0284c7,
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
        } else if (an.rank === 1 && an.pivotCols.length >= 1) {
          const u = an.vectors[an.pivotCols[0]];
          const uLen = norm(u);
          if (uLen > 1e-6) {
            const dir = [u[0] / uLen, u[1] / uLen, u[2] / uLen];
            const pts = [
              new THREE.Vector3(-dir[0] * 12, -dir[1] * 12, -dir[2] * 12),
              new THREE.Vector3(dir[0] * 12, dir[1] * 12, dir[2] * 12)
            ];
            const geom = new THREE.BufferGeometry().setFromPoints(pts);
            const mat = new THREE.LineDashedMaterial({ color: 0x0284c7, dashSize: 0.35, gapSize: 0.18 });
            const line = new THREE.Line(geom, mat);
            line.computeLineDistances();
            this._threeGroup.add(line);
          }
        }
      }
    }
  };

  App.IndepAnimator = IndepAnimator;
})();
