// ==================================================================================
// BASIS & DIMENSION PLAYBACK ENGINE (ACADEMIC OVERHAUL)
// Trực quan hóa Không gian con (Subspace Span), Lưới Affine 2D/3D & Phân rã Tổ hợp
// ==================================================================================
(function () {
  window.App = window.App || {};

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // --- HÀM TOÁN HỌC ĐẠI SỐ CHUẨN TẮC ---
  const EPSILON = 1e-5;

  function to3D(v) {
    if (!Array.isArray(v)) return [0, 0, 0];
    return [v[0] || 0, v[1] || 0, v[2] || 0];
  }

  function dot(a, b) {
    return (a[0] || 0) * (b[0] || 0) + (a[1] || 0) * (b[1] || 0) + (a[2] || 0) * (b[2] || 0);
  }

  function normSq(a) {
    return dot(a, a);
  }

  function norm(a) {
    return Math.sqrt(normSq(a));
  }

  function cross(a, b) {
    return [
      (a[1] || 0) * (b[2] || 0) - (a[2] || 0) * (b[1] || 0),
      (a[2] || 0) * (b[0] || 0) - (a[0] || 0) * (b[2] || 0),
      (a[0] || 0) * (b[1] || 0) - (a[1] || 0) * (b[0] || 0)
    ];
  }

  function formatScalar(val) {
    if (Math.abs(val) < 1e-4) return "0";
    if (Math.abs(val - Math.round(val)) < 1e-3) return String(Math.round(val));
    // Thử phân số đơn giản
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

  function formatLinearCombo(coeffs, names) {
    const parts = [];
    for (let i = 0; i < coeffs.length; i++) {
      const c = coeffs[i];
      if (Math.abs(c) < 1e-4) continue;
      const rawName = names[i] || `v_{${i + 1}}`;
      const name = formatMathName(rawName);
      const isNeg = c < 0;
      const absC = Math.abs(c);
      let coefStr = "";
      if (Math.abs(absC - 1) < 1e-3) {
        coefStr = "";
      } else {
        coefStr = formatScalar(absC);
      }
      const term = `${coefStr}${name}`;
      if (parts.length === 0) {
        parts.push(isNeg ? `-${term}` : term);
      } else {
        parts.push(isNeg ? `- ${term}` : `+ ${term}`);
      }
    }
    return parts.length ? parts.join(" ") : "0";
  }

  // Phân tích vector v theo hệ cơ sở B = [b1, b2, ...]
  function solveDecomposition(vRaw, basisItems) {
    const v = to3D(vRaw);
    const r = basisItems.length;
    if (r === 0) return { isDependent: false, coeffs: [], residual: norm(v), proj: [0, 0, 0] };

    if (r === 1) {
      const b1 = to3D(basisItems[0].vec);
      const b1Sq = normSq(b1);
      if (b1Sq < 1e-9) return { isDependent: false, coeffs: [], residual: norm(v), proj: [0, 0, 0] };
      const c1 = dot(v, b1) / b1Sq;
      const proj = [c1 * b1[0], c1 * b1[1], c1 * b1[2]];
      const res = norm([v[0] - proj[0], v[1] - proj[1], v[2] - proj[2]]);
      const isDependent = res < EPSILON;
      return { isDependent, coeffs: [c1], residual: res, proj };
    }

    if (r === 2) {
      const b1 = to3D(basisItems[0].vec);
      const b2 = to3D(basisItems[1].vec);
      const g11 = dot(b1, b1);
      const g12 = dot(b1, b2);
      const g22 = dot(b2, b2);
      const det = g11 * g22 - g12 * g12;
      if (Math.abs(det) < 1e-9) {
        return { isDependent: false, coeffs: [], residual: norm(v), proj: [0, 0, 0] };
      }
      const p1 = dot(b1, v);
      const p2 = dot(b2, v);
      const c1 = (g22 * p1 - g12 * p2) / det;
      const c2 = (g11 * p2 - g12 * p1) / det;
      const proj = [
        c1 * b1[0] + c2 * b2[0],
        c1 * b1[1] + c2 * b2[1],
        c1 * b1[2] + c2 * b2[2]
      ];
      const res = norm([v[0] - proj[0], v[1] - proj[1], v[2] - proj[2]]);
      const isDependent = res < EPSILON;
      return { isDependent, coeffs: [c1, c2], residual: res, proj };
    }

    if (r === 3) {
      const b1 = to3D(basisItems[0].vec);
      const b2 = to3D(basisItems[1].vec);
      const b3 = to3D(basisItems[2].vec);
      const b2xb3 = cross(b2, b3);
      const D = dot(b1, b2xb3);
      if (Math.abs(D) < 1e-9) {
        return { isDependent: false, coeffs: [], residual: norm(v), proj: [0, 0, 0] };
      }
      const c1 = dot(v, b2xb3) / D;
      const c2 = dot(b1, cross(v, b3)) / D;
      const c3 = dot(b1, cross(b2, v)) / D;
      const proj = [
        c1 * b1[0] + c2 * b2[0] + c3 * b3[0],
        c1 * b1[1] + c2 * b2[1] + c3 * b3[1],
        c1 * b1[2] + c2 * b2[2] + c3 * b3[2]
      ];
      const res = norm([v[0] - proj[0], v[1] - proj[1], v[2] - proj[2]]);
      return { isDependent: true, coeffs: [c1, c2, c3], residual: res, proj };
    }

    return { isDependent: false, coeffs: [], residual: norm(v), proj: [0, 0, 0] };
  }

  // --- BỘ PHÂN TÍCH KỊCH BẢN SƯ PHẠM (PLAN ANALYZER) ---
  function analyzeBasisPlan(items, spaceDim = 2) {
    const steps = [];
    const currentBasis = [];
    const maxDim = Math.min(spaceDim, 3);

    // Bước 0: Khởi tạo
    steps.push({
      type: "INIT",
      title: "Khảo sát hệ vector",
      desc: `Hệ gồm ${items.length} vector ứng viên được nạp vào không gian ${spaceDim}D.`,
      dim: 0,
      basisIds: [],
      dependentIds: [],
      activeItemId: null
    });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itRawName = getVectorDisplayName(item, i + 1);
      const itDisplayName = formatMathName(itRawName);
      const v = item.vec;
      if (!v || norm(to3D(v)) < 1e-9) {
        // Vector 0
        steps.push({
          type: "REDUNDANT_ZERO",
          title: `Khảo sát (${itDisplayName})`,
          desc: `Vector 0 là vector tầm thường, bị loại khỏi cơ sở.`,
          dim: currentBasis.length,
          item,
          basisIds: currentBasis.map((b) => b.id),
          dependentIds: [item.id],
          activeItemId: item.id
        });
        continue;
      }

      if (currentBasis.length < maxDim) {
        const decomp = solveDecomposition(v, currentBasis);
        if (!decomp.isDependent) {
          // Độc lập -> Nạp vào cơ sở
          currentBasis.push(item);
          const newDim = currentBasis.length;
          let title = `Khởi tạo span 1D (${itDisplayName})`;
          let desc = `Vector ${itDisplayName} độc lập -> Khởi tạo trục không gian 1D span(${itDisplayName}).`;
          if (newDim === 2) {
            const b1Disp = formatMathName(getVectorDisplayName(currentBasis[0], 1));
            title = `Quét không gian 2D (${itDisplayName})`;
            desc = `Đường thẳng span(${b1Disp}) quét tịnh tiến liên tục dọc theo ${itDisplayName}: c₁${b1Disp} + c₂${itDisplayName} phủ trọn R².`;
          } else if (newDim === 3) {
            const b1Disp = formatMathName(getVectorDisplayName(currentBasis[0], 1));
            const b2Disp = formatMathName(getVectorDisplayName(currentBasis[1], 2));
            title = `Quét không gian 3D (${itDisplayName})`;
            desc = `Mặt phẳng span(${b1Disp}, ${b2Disp}) quét tịnh tiến liên tục dọc theo ${itDisplayName}: c₁${b1Disp} + c₂${b2Disp} + c₃${itDisplayName} lấp đầy trọn R³.`;
          }

          steps.push({
            type: "EXPAND",
            title,
            desc,
            dim: newDim,
            item,
            basisIds: currentBasis.map((b) => b.id),
            basisItems: [...currentBasis],
            activeItemId: item.id
          });
          continue;
        } else {
          // Phụ thuộc tuyến tính
          const names = currentBasis.map((b, idx) => getVectorDisplayName(b, idx + 1));
          const dispNames = names.map(formatMathName);
          const formula = formatLinearCombo(decomp.coeffs, names);
          steps.push({
            type: "REDUNDANT",
            title: `Bắt giữ vector phụ thuộc (${itDisplayName})`,
            desc: `${itDisplayName} = ${formula}: Nằm trong không gian span{${dispNames.join(", ")}}, không tăng số chiều.`,
            dim: currentBasis.length,
            item,
            basisIds: currentBasis.map((b) => b.id),
            basisItems: [...currentBasis],
            coeffs: decomp.coeffs,
            proj: decomp.proj,
            formula,
            activeItemId: item.id
          });
          continue;
        }
      } else {
        // Không gian đã đạt số chiều tối đa
        const decomp = solveDecomposition(v, currentBasis);
        const names = currentBasis.map((b, idx) => getVectorDisplayName(b, idx + 1));
        const dispNames = names.map(formatMathName);
        const formula = decomp.coeffs.length ? formatLinearCombo(decomp.coeffs, names) : "";
        steps.push({
          type: "REDUNDANT",
          title: `Bắt giữ vector phụ thuộc (${itDisplayName})`,
          desc: `${itDisplayName}${formula ? ` = ${formula}` : ""}: Nằm trong không gian span{${dispNames.join(", ")}}, không tăng số chiều.`,
          dim: currentBasis.length,
          item,
          basisIds: currentBasis.map((b) => b.id),
          basisItems: [...currentBasis],
          coeffs: decomp.coeffs,
          proj: decomp.proj,
          formula,
          activeItemId: item.id
        });
      }
    }

    // Bước Kết tinh (Crystallization)
    const basisNames = currentBasis.map((b, idx) => formatMathName(getVectorDisplayName(b, idx + 1))).join(", ");
    steps.push({
      type: "CRYSTALLIZE",
      title: "Kết tinh Cơ sở & Số chiều",
      desc: `Hệ cơ sở B = {${basisNames}}, số chiều dim(V) = ${currentBasis.length}.`,
      dim: currentBasis.length,
      basisIds: currentBasis.map((b) => b.id),
      basisItems: [...currentBasis],
      activeItemId: null
    });

    return { steps, finalBasis: currentBasis, finalDim: currentBasis.length, isLargeSet: items.length >= 5 };
  }

  // --- HỆ THỐNG ANIMATOR CHÍNH ---
  const Animator = {
    _active: false,
    _paused: false,
    _currentStep: 0,
    _plan: null,
    _candidateItems: [],
    _snapshot: null,
    _speed: 1.0,
    _raf: null,
    _stepTimer: null,
    _stepDurationMs: 1400,
    _tileWaveProgress: 0,
    _tileWaveAnimId: null,

    isActive() {
      return this._active;
    },

    getStep() {
      return this._plan?.steps?.[this._currentStep] || null;
    },

    getBasisItems() {
      const step = this.getStep();
      return step?.basisItems || [];
    },

    // Cập nhật trạng thái động thái sư phạm của Bước mở rộng (Đoạn thẳng trượt -> Hình bình hành / Khối hộp dãn nở)
    updateStep2DynamicState(rawP) {
      const step = this.getStep();
      if (!step || step.type !== "EXPAND") return;
      const basisItems = step.basisItems || [];
      if (basisItems.length < 2) return;

      const titleEl = document.getElementById("basisStepTitle");
      const descEl = document.getElementById("basisStepDesc");

      if (step.dim === 2) {
        const b1 = basisItems[0];
        const b2 = basisItems[1];
        const b1Name = formatMathName(getVectorDisplayName(b1, 1));
        const b2Name = formatMathName(getVectorDisplayName(b2, 2));

        if (rawP < 0.15) {
          b2._basisColorCss = "#0284c7";
          b2._basisAlpha = 1.0;
          b2.haloCss = "#38bdf8";
          delete b2._basisIsBasis;
          if (titleEl) titleEl.textContent = `Khảo sát phương độc lập (${b2Name})`;
          if (descEl) descEl.textContent = `Vector ${b2Name} không cùng phương với ${b1Name} -> Độc lập tuyến tính. Chuẩn bị quét.`;
        } else if (rawP < 0.45) {
          b2._basisColorCss = "#0284c7";
          b2._basisAlpha = 1.0;
          b2.haloCss = "#38bdf8";
          delete b2._basisIsBasis;
          if (titleEl) titleEl.textContent = `Đoạn thẳng ${b1Name} trượt theo ${b2Name}`;
          if (descEl) descEl.textContent = `Đoạn ${b1Name} trượt dọc theo vector ${b2Name}: Quét diện tích cơ sở (0 ≤ c₁, c₂ ≤ 1).`;
        } else if (rawP < 0.95) {
          b2._basisColorCss = "#0284c7";
          b2._basisAlpha = 1.0;
          b2.haloCss = "#38bdf8";
          delete b2._basisIsBasis;
          if (titleEl) titleEl.textContent = `Dãn nở tổ hợp: c₁${b1Name} + c₂${b2Name}`;
          if (descEl) descEl.textContent = `Hệ số c₁, c₂ mở rộng liên tục ra 4 phía, phủ trọn toàn bộ mặt phẳng ℝ².`;
        } else {
          b2._basisColorCss = "#10b981";
          b2._basisAlpha = 1.0;
          b2.haloCss = "#10b981";
          b2._basisIsBasis = true;
          if (titleEl) titleEl.textContent = `Xác lập không gian 2D: span{${b1Name}, ${b2Name}}`;
          if (descEl) descEl.textContent = `span{${b1Name}, ${b2Name}} bao trọn toàn bộ không gian 2 chiều ℝ² (dim = 2).`;
        }
      } else if (step.dim === 3 && basisItems.length >= 3) {
        const b1 = basisItems[0];
        const b2 = basisItems[1];
        const b3 = basisItems[2];
        const b1Name = formatMathName(getVectorDisplayName(b1, 1));
        const b2Name = formatMathName(getVectorDisplayName(b2, 2));
        const b3Name = formatMathName(getVectorDisplayName(b3, 3));

        if (rawP < 0.15) {
          b3._basisColorCss = "#0284c7";
          b3._basisAlpha = 1.0;
          b3.haloCss = "#38bdf8";
          delete b3._basisIsBasis;
          if (titleEl) titleEl.textContent = `Khảo sát phương thứ 3 (${b3Name})`;
          if (descEl) descEl.textContent = `Vector ${b3Name} không đồng phẳng với ${b1Name}, ${b2Name} -> Độc lập tuyến tính. Chuẩn bị quét 3D.`;
        } else if (rawP < 0.45) {
          b3._basisColorCss = "#0284c7";
          b3._basisAlpha = 1.0;
          b3.haloCss = "#38bdf8";
          delete b3._basisIsBasis;
          if (titleEl) titleEl.textContent = `Mặt phẳng span{${b1Name}, ${b2Name}} trượt dọc theo ${b3Name}`;
          if (descEl) descEl.textContent = `Mặt phẳng cơ sở trượt dọc theo ${b3Name}: Quét khối hộp 3D cơ sở (0 ≤ c₁, c₂, c₃ ≤ 1).`;
        } else if (rawP < 0.95) {
          b3._basisColorCss = "#0284c7";
          b3._basisAlpha = 1.0;
          b3.haloCss = "#38bdf8";
          delete b3._basisIsBasis;
          if (titleEl) titleEl.textContent = `Dãn nở khối hộp: c₁${b1Name} + c₂${b2Name} + c₃${b3Name}`;
          if (descEl) descEl.textContent = `Hệ số c₁, c₂, c₃ mở rộng liên tục ra 6 phía, bao trọn toàn bộ không gian 3 chiều ℝ³.`;
        } else {
          b3._basisColorCss = "#10b981";
          b3._basisAlpha = 1.0;
          b3.haloCss = "#10b981";
          b3._basisIsBasis = true;
          if (titleEl) titleEl.textContent = `Bao trọn không gian 3D: span{${b1Name}, ${b2Name}, ${b3Name}}`;
          if (descEl) descEl.textContent = `Hệ cơ sở độc lập tuyến tính bao trọn toàn bộ không gian 3 chiều ℝ³ (dim = 3).`;
        }
      }
    },

    // Quản lý hoạt cảnh lan tỏa sàn gạch (Parallelogram Wave Expansion)
    startTileWave() {
      if (this._tileWaveAnimId) {
        cancelAnimationFrame(this._tileWaveAnimId);
        this._tileWaveAnimId = null;
      }
      this._tileWaveProgress = 0;
      const baseWaveTime = App.basisWaveDurationMs || (this._plan?.isLargeSet ? 2800 : 4400);
      const duration = baseWaveTime / (this._speed || 1.0);
      let lastTime = performance.now();
      let totalElapsed = 0;

      const frame = (now) => {
        if (!this._active) return;
        if (this._paused) {
          lastTime = now;
          this._tileWaveAnimId = requestAnimationFrame(frame);
          return;
        }
        const delta = now - lastTime;
        lastTime = now;
        totalElapsed += delta;
        const rawP = Math.min(1.0, totalElapsed / duration);
        this._tileWaveProgress = rawP;

        this.updateStep2DynamicState(rawP);
        this.redraw();

        if (rawP < 1.0) {
          this._tileWaveAnimId = requestAnimationFrame(frame);
        } else {
          this._tileWaveProgress = 1.0;
          this._tileWaveAnimId = null;
          this.updateStep2DynamicState(1.0);
          this.redraw();
        }
      };

      this.updateStep2DynamicState(0);
      this._tileWaveAnimId = requestAnimationFrame(frame);
    },

    stopTileWave(finalProgress = 1.0) {
      if (this._tileWaveAnimId) {
        cancelAnimationFrame(this._tileWaveAnimId);
        this._tileWaveAnimId = null;
      }
      this._tileWaveProgress = finalProgress;
      if (finalProgress >= 1.0) {
        this.updateStep2DynamicState(1.0);
      }
    },

    // Bắt đầu hoạt cảnh
    async start(opts = {}) {
      this.stop();

      const selectedIds = new Set(
        Array.isArray(opts.selectedIds) ? opts.selectedIds.map(Number) : []
      );
      this._candidateItems = (App.vectorList || []).filter((it) => selectedIds.has(it.id));
      if (!this._candidateItems.length) return;

      const has3DVector = this._candidateItems.some(
        (it) => it.vec && it.vec.length >= 3 && Math.abs(it.vec[2] || 0) > 1e-5
      );
      if (has3DVector && App.mode !== "3D" && typeof App.toggleMode === "function") {
        App.toggleMode();
      }
      const spaceDim = (App.mode === "3D" || has3DVector) ? 3 : 2;
      this._plan = analyzeBasisPlan(this._candidateItems, spaceDim);

      // Snapshot để hoàn nguyên màu và alpha
      this._snapshot = (App.vectorList || []).map((v) => ({
        id: v.id,
        colorCss: v.colorCss,
        colorHex: v.colorHex,
        haloCss: v.haloCss,
        alpha: v.alpha ?? 1,
        visible: v.visible !== false
      }));

      this._active = true;
      App._basisAnimActive = true;
      this._paused = false;
      this._currentStep = 0;
      this._speed = 1.0;
      this._stepDurationMs = this._plan.isLargeSet ? 850 : 1350;
      this._tileWaveProgress = 0;

      const wrap = document.getElementById("basisAnimControls");
      if (wrap) wrap.style.display = "block";

      this.updateSidebarUI();
      this.applyStep(0);
      this.scheduleNextStep();
    },

    // Dừng hoạt cảnh
    stop() {
      if (this._stepTimer) clearTimeout(this._stepTimer);
      this._stepTimer = null;
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = null;
      this.stopTileWave(0);

      this.destroy3D();
      this.restoreSnapshot();

      this._active = false;
      this._paused = false;
      this._plan = null;
      this._currentStep = 0;
      App._basisAnimActive = false;

      const wrap = document.getElementById("basisAnimControls");
      if (wrap) wrap.style.display = "none";

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
        delete it._basisColorCss;
        delete it._basisAlpha;
        delete it._basisIsBasis;
        delete it._basisIsRedundant;
      });
      this._snapshot = null;
      if (typeof App.renderVectorList === "function") App.renderVectorList(false);
      if (typeof App.renderExtraCalcOptions === "function") App.renderExtraCalcOptions();
    },

    // Điều khiển Play / Pause
    togglePlay() {
      if (!this._active) {
        if (typeof App.basisAndDimUI === "function") {
          App.basisAndDimUI();
        }
        return;
      }
      const totalSteps = this._plan?.steps?.length || 1;
      const isFinished = this._currentStep >= totalSteps - 1;
      if (this._paused || isFinished) {
        this.play();
      } else {
        this.pause();
      }
    },

    play() {
      if (!this._plan || !this._plan.steps || !this._plan.steps.length) return;
      this._paused = false;
      const totalSteps = this._plan.steps.length;
      if (this._currentStep >= totalSteps - 1) {
        this.goToStep(0);
      } else {
        const step = this.getStep();
        if (step?.type === "EXPAND" && (step?.dim === 2 || step?.dim === 3) && this._tileWaveProgress >= 0.99) {
          this.startTileWave();
        }
        this.updateSidebarUI();
        this.scheduleNextStep();
      }
    },

    pause() {
      this._paused = true;
      if (this._stepTimer) clearTimeout(this._stepTimer);
      this._stepTimer = null;
      this.updateSidebarUI();
    },

    nextStep() {
      if (!this._plan) return;
      if (this._stepTimer) clearTimeout(this._stepTimer);
      const next = Math.min(this._plan.steps.length - 1, this._currentStep + 1);
      this.goToStep(next);
    },

    prevStep() {
      if (!this._plan) return;
      if (this._stepTimer) clearTimeout(this._stepTimer);
      const prev = Math.max(0, this._currentStep - 1);
      this.goToStep(prev);
    },

    goToStep(index) {
      if (!this._plan || index < 0 || index >= this._plan.steps.length) return;
      if (this._stepTimer) clearTimeout(this._stepTimer);
      this._currentStep = index;
      this.applyStep(index);
      if (index >= this._plan.steps.length - 1) {
        this._paused = true;
      }
      this.updateSidebarUI();
      if (!this._paused && index < this._plan.steps.length - 1) {
        this.scheduleNextStep();
      }
    },

    restart() {
      this.goToStep(0);
    },

    skipToEnd() {
      if (!this._plan) return;
      this.goToStep(this._plan.steps.length - 1);
      this.pause();
    },

    setSpeed(speed) {
      const val = parseFloat(speed);
      if (isNaN(val) || val <= 0) return;
      this._speed = Math.max(0.1, Math.min(3.0, val));
      this.updateSidebarUI();
      if (!this._paused && this._stepTimer) {
        clearTimeout(this._stepTimer);
        this.scheduleNextStep();
      }
    },

    scheduleNextStep() {
      if (this._paused || !this._plan) return;
      if (this._currentStep >= this._plan.steps.length - 1) {
        this._paused = true;
        this.updateSidebarUI();
        return;
      }

      const step = this.getStep();
      const waveDuration = (this._plan?.isLargeSet ? 2800 : 4400) / this._speed;
      let baseDuration = (this._stepDurationMs || 1350) / this._speed;
      if (step?.type === "EXPAND" && (step?.dim === 2 || step?.dim === 3)) {
        baseDuration = this._plan?.isLargeSet ? waveDuration * 0.75 : waveDuration + 1400 / this._speed;
      } else if (step?.type === "REDUNDANT") {
        baseDuration = (this._plan?.isLargeSet ? 2200 : 3400) / this._speed;
      }

      this._stepTimer = setTimeout(() => {
        if (this._paused || !this._active) return;
        this.nextStep();
      }, baseDuration);
    },

    // Áp dụng trực quan của bước lên các vector
    applyStep(index) {
      const step = this._plan?.steps?.[index];
      if (!step) return;

      const basisIds = new Set(step.basisIds || []);
      const activeId = step.activeItemId;
      const candidateIds = new Set(this._candidateItems.map((c) => c.id));
      const isExpand = step.type === "EXPAND" && (step.dim === 2 || step.dim === 3);

      (App.vectorList || []).forEach((it) => {
        if (!candidateIds.has(it.id)) {
          it._basisAlpha = 0.15;
          it._basisColorCss = null;
          return;
        }

        if (step.type === "INIT") {
          // BƯỚC 0 (INIT): Hiển thị tất cả vector ứng viên bằng màu định danh gốc, sẵn sàng khảo sát
          it._basisColorCss = it.colorCss;
          it.haloCss = it.haloCss || it.colorCss;
          it._basisAlpha = 1.0;
          delete it._basisIsBasis;
          delete it._basisIsRedundant;
          return;
        }

        if (step.type === "CRYSTALLIZE") {
          // BƯỚC CUỐI (KẾT TINH): Cơ sở xanh ngọc rực rỡ, vector phụ thuộc màu vàng hổ phách
          if (basisIds.has(it.id)) {
            it._basisColorCss = "#10b981";
            it.haloCss = "#10b981";
            it._basisAlpha = 1.0;
            it._basisIsBasis = true;
            delete it._basisIsRedundant;
          } else {
            it._basisColorCss = "#f59e0b";
            it.haloCss = "#f59e0b";
            it._basisAlpha = 0.70;
            it._basisIsRedundant = true;
            delete it._basisIsBasis;
          }
          return;
        }

        if (isExpand && it.id === activeId) {
          // Vector đang trong quá trình khảo sát & quét: Màu Sky Blue khảo sát
          it._basisColorCss = "#0284c7";
          it.haloCss = "#38bdf8";
          it._basisAlpha = 1.0;
          delete it._basisIsBasis;
          delete it._basisIsRedundant;
        } else if (basisIds.has(it.id)) {
          // Vector cơ sở: Xanh ngọc Emerald
          it._basisColorCss = "#10b981";
          it.haloCss = "#10b981";
          it._basisAlpha = 1.0;
          it._basisIsBasis = true;
          delete it._basisIsRedundant;
        } else if (it.id === activeId && (step.type === "REDUNDANT" || step.type === "REDUNDANT_ZERO")) {
          // Vector đang bị bẫy thừa: Vàng hổ phách
          it._basisColorCss = "#f59e0b";
          it.haloCss = "#f59e0b";
          it._basisAlpha = 1.0;
          it._basisIsRedundant = true;
          delete it._basisIsBasis;
        } else {
          // Kiểm tra xem vector này là đã từng xét trước đó hay chưa tới lượt
          const activeIndex = this._candidateItems.findIndex((c) => c.id === activeId);
          const itIndex = this._candidateItems.findIndex((c) => c.id === it.id);
          const isPassed = activeIndex !== -1 && itIndex < activeIndex;

          if (isPassed) {
            // Đã xét qua và là vector phụ thuộc
            it._basisColorCss = "#f59e0b";
            it.haloCss = "#f59e0b";
            it._basisAlpha = 0.55;
            it._basisIsRedundant = true;
          } else {
            // Chưa duyệt tới lượt: Làm mờ nhẹ để hướng sự chú ý vào vector đang khảo sát
            it._basisColorCss = "#94a3b8";
            it._basisAlpha = 0.35;
            delete it._basisIsRedundant;
          }
          delete it._basisIsBasis;
        }
      });

      this.updateSidebarUI();

      // Kích hoạt sóng lát gạch lan tỏa khi nạp vector thứ 2 hoặc 3 vào không gian
      if (step.type === "EXPAND" && (step.dim === 2 || step.dim === 3)) {
        if (this._paused) {
          this.stopTileWave(1.0);
          this.updateStep2DynamicState(1.0);
        } else {
          this.startTileWave();
        }
      } else {
        this.stopTileWave(step.dim >= 2 ? 1.0 : 0.0);
      }

      this.redraw();
    },

    redraw() {
      if (App.mode === "2D" && window.Vec2D) {
        Vec2D.draw2DAllVectors();
      } else if (window.Vec3D) {
        Vec3D.hardRefresh3D(false);
      }
    },

    // =========================================================================
    // ĐỒNG BỘ ĐIỀU KHIỂN & GIẢI THÍCH TRÊN SIDEBAR
    // =========================================================================
    bindSidebarControls() {
      const btnPlay = document.getElementById("btnBasisPlay");
      const btnPrev = document.getElementById("btnBasisPrev");
      const btnNext = document.getElementById("btnBasisNext");
      const btnReplay = document.getElementById("btnBasisReplay");
      const speedSlider = document.getElementById("basisSpeedSlider");

      if (btnPlay && !btnPlay._basisBound) {
        btnPlay._basisBound = true;
        btnPlay.addEventListener("click", () => this.togglePlay());
      }
      if (btnPrev && !btnPrev._basisBound) {
        btnPrev._basisBound = true;
        btnPrev.addEventListener("click", () => this.prevStep());
      }
      if (btnNext && !btnNext._basisBound) {
        btnNext._basisBound = true;
        btnNext.addEventListener("click", () => this.nextStep());
      }
      if (btnReplay && !btnReplay._basisBound) {
        btnReplay._basisBound = true;
        btnReplay.addEventListener("click", () => this.restart());
      }
      if (speedSlider && !speedSlider._basisBound) {
        speedSlider._basisBound = true;
        speedSlider.addEventListener("input", (e) => {
          this.setSpeed(e.target.value);
        });
      }
    },

    updateSidebarUI() {
      this.bindSidebarControls();
      const step = this.getStep();
      const plan = this._plan;
      const totalSteps = plan?.steps?.length || 1;
      const curStep = this._currentStep;

      // 1. Play / Pause button icon & Red Pause button styling (YouTube style)
      const iconPlay = document.getElementById("iconBasisPlay");
      const btnPlay = document.getElementById("btnBasisPlay");
      const isFinished = curStep >= totalSteps - 1;
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

      // 2. Step pill counter
      const stepCounter = document.getElementById("basisStepCounter");
      if (stepCounter) {
        stepCounter.textContent = this._active ? `Bước ${curStep + 1} / ${totalSteps}` : "Sẵn sàng";
      }

      // 3. Step title & description
      const titleEl = document.getElementById("basisStepTitle");
      const descEl = document.getElementById("basisStepDesc");
      if (titleEl) {
        titleEl.textContent = (this._active && step)
          ? formatMathName(step.title || "Cơ sở & Số chiều")
          : "Khảo sát hệ vector";
      }
      if (descEl) {
        descEl.textContent = (this._active && step)
          ? formatMathName(step.desc || "")
          : "Bấm 'Tính cơ sở' hoặc nút Phát để bắt đầu trực quan hóa.";
      }

      // 4. Speed slider & readout
      const speedVal = document.getElementById("basisSpeedValue");
      const speedSlider = document.getElementById("basisSpeedSlider");
      if (speedVal) {
        speedVal.textContent = `${this._speed.toFixed(1)}×`;
      }
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

      // 5. Dynamic Step Pills (Đồng bộ các nút Bước 1, Bước 2, ...)
      const pillsWrap = document.getElementById("basisStepPills");
      if (pillsWrap && plan && Array.isArray(plan.steps) && plan.steps.length > 0) {
        if (pillsWrap.children.length !== plan.steps.length) {
          pillsWrap.innerHTML = plan.steps
            .map((s, idx) => {
              const num = idx + 1;
              return `<button type="button" class="coord-phase-btn basis-step-btn ${idx === curStep ? "active" : ""}" data-step="${idx}" title="Bước ${num}">Bước ${num}</button>`;
            })
            .join("");

          pillsWrap.querySelectorAll(".basis-step-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
              const stepIdx = parseInt(btn.dataset.step, 10);
              if (typeof this.goToStep === "function") {
                this.goToStep(stepIdx);
              }
            });
          });
        } else {
          const buttons = pillsWrap.querySelectorAll(".basis-step-btn");
          buttons.forEach((btn, idx) => {
            if (idx === curStep) {
              btn.classList.add("active");
            } else {
              btn.classList.remove("active");
            }
          });
        }
      }
    },

    // =========================================================================
    // 2D CANVAS RENDERING (HOOK TRỰC TIẾP TỪ VIEWER2D)
    // =========================================================================
    render2DSubspace(ctx, gridInfo) {
      if (!this._active || !gridInfo || App.mode !== "2D") return;
      const step = this.getStep();
      if (!step) return;

      const basisItems = step.basisItems || [];
      if (!basisItems.length) return;

      const { cx, cy, px } = gridInfo;
      const w = gridInfo.w || (ctx.canvas ? ctx.canvas.width / (window.devicePixelRatio || 1) : 1400);
      const h = gridInfo.h || (ctx.canvas ? ctx.canvas.height / (window.devicePixelRatio || 1) : 900);
      const isDark = document.body.classList.contains("dark");
      const isRedundantStep = step.type === "REDUNDANT";
      const diag = Math.hypot(w, h) * 1.5;

      ctx.save();

      // Hàm vẽ mũi tên vector dẫn hướng
      const drawArrow = (fromX, fromY, toX, toY, color, width = 2.0) => {
        const headLen = 9;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const dist = Math.hypot(dx, dy);
        if (dist < 6) return;
        const angle = Math.atan2(dy, dx);

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

      // 1. Trục chỉ phương 1D: span(b1) (xuyên suốt màn hình, màu xanh ngọc)
      const b1 = basisItems[0].vec;
      const d1x = b1[0] * px;
      const d1y = -b1[1] * px;
      const len1 = Math.hypot(d1x, d1y);
      const u1x = d1x / (len1 || 1);
      const u1y = d1y / (len1 || 1);

      const b1Norm = Math.hypot(b1[0], b1[1]);

      if (b1Norm > 1e-6) {
        ctx.beginPath();
        ctx.moveTo(cx - u1x * diag, cy - u1y * diag);
        ctx.lineTo(cx + u1x * diag, cy + u1y * diag);
        ctx.strokeStyle = isDark ? "rgba(16, 185, 129, 0.85)" : "rgba(16, 185, 129, 0.75)";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([8, 4]);
        ctx.stroke();

        // Vach chia don vi doc theo span(b1) (adaptive stride chong bien mat / chong qua tai khi zoom)
        const stepTick1 = Math.max(1, Math.ceil(30 / Math.max(1e-4, len1)));
        const maxTick1 = Math.min(40 * stepTick1, Math.ceil(diag / Math.max(1e-4, len1)));
        ctx.setLineDash([]);
        ctx.strokeStyle = isDark ? "rgba(16, 185, 129, 0.85)" : "rgba(16, 185, 129, 0.75)";
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
      }

      // 2. Truc chi phuong 1D: span(b2) (khi co vector thu 2, khao sat xanh lo, khi chot co so thanh xanh ngoc)
      if (basisItems.length >= 2) {
        const isExpand2D = step.type === "EXPAND" && step.dim === 2;
        const rawP = isExpand2D ? Math.max(0, this._tileWaveProgress) : 1.0;
        const b2 = basisItems[1].vec;
        const d2x = b2[0] * px;
        const d2y = -b2[1] * px;
        const len2 = Math.hypot(d2x, d2y);
        const u2x = d2x / (len2 || 1);
        const u2y = d2y / (len2 || 1);
        const b2Norm = Math.hypot(b2[0], b2[1]);

        if (b2Norm > 1e-6) {
          const axisColor = (isExpand2D && rawP < 0.95)
            ? (isDark ? "rgba(56, 189, 248, 0.85)" : "rgba(2, 132, 199, 0.75)")
            : (isDark ? "rgba(16, 185, 129, 0.85)" : "rgba(16, 185, 129, 0.75)");

          ctx.beginPath();
          ctx.moveTo(cx - u2x * diag, cy - u2y * diag);
          ctx.lineTo(cx + u2x * diag, cy + u2y * diag);
          ctx.strokeStyle = axisColor;
          ctx.lineWidth = 1.8;
          ctx.setLineDash([8, 4]);
          ctx.stroke();

          // Vach chia don vi doc theo span(b2) (adaptive stride)
          const stepTick2 = Math.max(1, Math.ceil(30 / Math.max(1e-4, len2)));
          const maxTick2 = Math.min(40 * stepTick2, Math.ceil(diag / Math.max(1e-4, len2)));
          ctx.setLineDash([]);
          ctx.strokeStyle = axisColor;
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

          // Goc toa do O (Giao diem noi bat cua hai truc doc lap)
          ctx.fillStyle = isDark ? "#34d399" : "#059669";
          ctx.beginPath();
          ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = isDark ? "rgba(52, 211, 153, 0.45)" : "rgba(5, 150, 105, 0.40)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, 8, 0, Math.PI * 2);
          ctx.stroke();
        }

        const detMath = Math.abs(b1[0] * b2[1] - b1[1] * b2[0]);
        if (detMath < 1e-7) {
          ctx.restore();
          return;
        }

        const det = d1x * d2y - d1y * d2x;

        // Tính toán bán kính hệ số max để hình bình hành bao trùm 100% 4 góc canvas
        const corners = [
          { x: 0, y: 0 },
          { x: w, y: 0 },
          { x: w, y: h },
          { x: 0, y: h }
        ];
        let maxC1 = 0, maxC2 = 0;
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

        const b1Name = formatMathName(getVectorDisplayName(basisItems[0], 1));
        const b2Name = formatMathName(getVectorDisplayName(basisItems[1], 2));

        if (isExpand2D && rawP < 0.15) {
          // ===================================================================
          // PHA 1: KHẢO SÁT 2 VECTOR ĐỘC LẬP (0 <= rawP < 0.15)
          // ===================================================================
          // Canvas hoàn toàn sạch sẽ, không vẽ chữ hay badge giải thích

        } else if (isExpand2D && rawP < 0.45) {
          // ===================================================================
          // PHA 2: ĐOẠN THẲNG b1 TRƯỢT DỌC THEO b2 QUÉT HÌNH BÌNH HÀNH CƠ SỞ (0.15 <= rawP < 0.45)
          // ===================================================================
          const tSweep = (rawP - 0.15) / 0.30;
          const s = tSweep * tSweep * (3 - 2 * tSweep);
          const curC2 = s;

          // 1. Tô màu diện tích hình bình hành cơ sở đang được quét ra
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + d1x, cy + d1y);
          ctx.lineTo(cx + d1x + curC2 * d2x, cy + d1y + curC2 * d2y);
          ctx.lineTo(cx + curC2 * d2x, cy + curC2 * d2y);
          ctx.closePath();
          ctx.fillStyle = isDark ? "rgba(16, 185, 129, 0.20)" : "rgba(16, 185, 129, 0.15)";
          ctx.fill();

          // 2. Viền cạnh đáy (O -> b1)
          ctx.strokeStyle = isDark ? "rgba(16, 185, 129, 0.6)" : "rgba(16, 185, 129, 0.5)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + d1x, cy + d1y);
          ctx.stroke();

          // 3. Đoạn thẳng b1 ĐANG TRƯỢT TỊNH TIẾN (Moving Segment)
          ctx.strokeStyle = isDark ? "#34d399" : "#059669";
          ctx.lineWidth = 2.5;
          ctx.shadowColor = "#10b981";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(cx + curC2 * d2x, cy + curC2 * d2y);
          ctx.lineTo(cx + d1x + curC2 * d2x, cy + d1y + curC2 * d2y);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // 4. Mũi tên ray dẫn hướng trượt dọc theo b2 từ O đến curC2 * b2
          drawArrow(cx, cy, cx + curC2 * d2x, cy + curC2 * d2y, isDark ? "#38bdf8" : "#0284c7", 2.2);

          // 5. Mũi tên trượt song song ở đầu ngọn từ b1 đến b1 + curC2 * b2
          drawArrow(cx + d1x, cy + d1y, cx + d1x + curC2 * d2x, cy + d1y + curC2 * d2y, isDark ? "rgba(56, 189, 248, 0.7)" : "rgba(2, 132, 199, 0.7)", 1.5);

          // 6. Hai điểm mút của đoạn thẳng đang trượt
          ctx.fillStyle = isDark ? "#38bdf8" : "#0284c7";
          ctx.beginPath();
          ctx.arc(cx + curC2 * d2x, cy + curC2 * d2y, 4.5, 0, Math.PI * 2);
          ctx.arc(cx + d1x + curC2 * d2x, cy + d1y + curC2 * d2y, 4.5, 0, Math.PI * 2);
          ctx.fill();

        } else if (isExpand2D && rawP < 0.95) {
          // ===================================================================
          // PHA 3: HÌNH BÌNH HÀNH DÃN NỞ AFFINE RA 4 PHÍA (0.45 <= rawP < 0.95)
          // ===================================================================
          const tExp = (rawP - 0.45) / 0.50;
          const s = tExp * tExp * (3 - 2 * tExp);
          // Chuyển tiếp mượt mà từ [0..1] x [0..1] sang đối xứng [-R..R]
          const curC1Min = -R1Max * s;
          const curC1Max = 1 + (R1Max - 1) * s;
          const curC2Min = -R2Max * s;
          const curC2Max = 1 + (R2Max - 1) * s;

          const pTopRight = { x: cx + curC1Max * d1x + curC2Max * d2x, y: cy + curC1Max * d1y + curC2Max * d2y };
          const pTopLeft  = { x: cx + curC1Min * d1x + curC2Max * d2x, y: cy + curC1Min * d1y + curC2Max * d2y };
          const pBotLeft  = { x: cx + curC1Min * d1x + curC2Min * d2x, y: cy + curC1Min * d1y + curC2Min * d2y };
          const pBotRight = { x: cx + curC1Max * d1x + curC2Min * d2x, y: cy + curC1Max * d1y + curC2Min * d2y };

          // A. Tô màu diện tích hình bình hành đang dãn nở
          ctx.beginPath();
          ctx.moveTo(pTopRight.x, pTopRight.y);
          ctx.lineTo(pTopLeft.x, pTopLeft.y);
          ctx.lineTo(pBotLeft.x, pBotLeft.y);
          ctx.lineTo(pBotRight.x, pBotRight.y);
          ctx.closePath();
          ctx.fillStyle = isDark ? "rgba(16, 185, 129, 0.14)" : "rgba(16, 185, 129, 0.10)";
          ctx.fill();

          // B. Soi luoi Affine (song song b1 va b2 tai cac moc nguyen k, m)
          const absDet3 = Math.abs(det);
          const dPerp2_3 = absDet3 / Math.max(1e-4, len1);
          const dPerp1_3 = absDet3 / Math.max(1e-4, len2);

          const kMin = Math.ceil(curC2Min);
          const kMax = Math.floor(curC2Max);
          const stepK = Math.max(1, Math.ceil(40 / Math.max(1e-4, dPerp2_3)));
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
          const stepM = Math.max(1, Math.ceil(40 / Math.max(1e-4, dPerp1_3)));
          ctx.strokeStyle = isDark ? "rgba(56, 189, 248, 0.20)" : "rgba(2, 132, 199, 0.16)";
          ctx.beginPath();
          for (let m = mMin; m <= mMax; m += stepM) {
            ctx.moveTo(cx + m * d1x + curC2Min * d2x, cy + m * d1y + curC2Min * d2y);
            ctx.lineTo(cx + m * d1x + curC2Max * d2x, cy + m * d1y + curC2Max * d2y);
          }
          ctx.stroke();
          ctx.setLineDash([]);

          // C. 4 vien mep hinh binh hanh dan no phat sang
          ctx.strokeStyle = isDark ? "rgba(52, 211, 153, 0.90)" : "rgba(5, 150, 105, 0.85)";
          ctx.lineWidth = 2.0;
          ctx.setLineDash([6, 3]);
          ctx.shadowColor = "#10b981";
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.moveTo(pTopRight.x, pTopRight.y);
          ctx.lineTo(pTopLeft.x, pTopLeft.y);
          ctx.lineTo(pBotLeft.x, pBotLeft.y);
          ctx.lineTo(pBotRight.x, pBotRight.y);
          ctx.closePath();
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.setLineDash([]);

        } else {
          // ===================================================================
          // PHA 4: HOAN TAT & CAC BUOC SAU (rawP >= 0.95 hoac cac buoc sau)
          // ===================================================================
          // Duy tri vinh vien mau sac khong gian R2 (Emerald tint) trong suot toan bo cac buoc con lai
          const blanketAlpha = isDark ? 0.20 : 0.15;
          ctx.fillStyle = `rgba(16, 185, 129, ${blanketAlpha})`;
          ctx.fillRect(0, 0, w, h);

          // Luoi Affine chuan toan hoc trai rong bao tron toan bo khung nhin
          // BAO VE CHONG BIEN MAT VA CHONG LAG KHI ZOOM (ADAPTIVE STRIDE THEO SCREEN PIXEL)
          const R1 = Math.ceil(R1Max) + 2;
          const R2 = Math.ceil(R2Max) + 2;

          const absDet = Math.abs(det);
          const dPerp2 = absDet / Math.max(1e-4, len1);
          const dPerp1 = absDet / Math.max(1e-4, len2);

          const stepK = Math.max(1, Math.ceil(45 / Math.max(1e-4, dPerp2)));
          const stepM = Math.max(1, Math.ceil(45 / Math.max(1e-4, dPerp1)));
          const kLimit = Math.min(R2, 30 * stepK);
          const mLimit = Math.min(R1, 30 * stepM);

          ctx.strokeStyle = isDark ? "rgba(16, 185, 129, 0.32)" : "rgba(16, 185, 129, 0.24)";
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);

          ctx.beginPath();
          for (let k = -kLimit; k <= kLimit; k += stepK) {
            if (k === 0) continue;
            ctx.moveTo(cx - R1 * d1x + k * d2x, cy - R1 * d1y + k * d2y);
            ctx.lineTo(cx + R1 * d1x + k * d2x, cy + R1 * d1y + k * d2y);
          }
          for (let m = -mLimit; m <= mLimit; m += stepM) {
            if (m === 0) continue;
            ctx.moveTo(cx + m * d1x - R2 * d2x, cy + m * d1y - R2 * d2y);
            ctx.lineTo(cx + m * d1x + R2 * d2x, cy + m * d1y + R2 * d2y);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      ctx.restore();
    },

    render2DProjections(ctx, gridInfo) {
      if (!this._active || !gridInfo || App.mode !== "2D") return;
      const step = this.getStep();
      if (!step || step.type !== "REDUNDANT" || !step.item) return;

      const { cx, cy, px } = gridInfo;
      const v = step.item.vec;
      if (!v) return;

      const basisItems = step.basisItems || [];
      let decomp = solveDecomposition(v, basisItems);
      const coeffs = (step.coeffs && step.coeffs.length) ? step.coeffs : decomp.coeffs;

      ctx.save();

      // Điểm mút vector khảo sát
      const tipX = cx + (v[0] || 0) * px;
      const tipY = cy - (v[1] || 0) * px;

      // Hình bình hành tổ hợp tuyến tính trên mặt phẳng 2D
      if (basisItems.length >= 2 && coeffs && coeffs.length >= 2) {
        const b1 = basisItems[0].vec;
        const b2 = basisItems[1].vec;
        const c1 = coeffs[0];
        const c2 = coeffs[1];

        const p1x = cx + c1 * b1[0] * px;
        const p1y = cy - c1 * b1[1] * px;
        const p2x = cx + c2 * b2[0] * px;
        const p2y = cy - c2 * b2[1] * px;
        const projX = cx + (c1 * b1[0] + c2 * b2[0]) * px;
        const projY = cy - (c1 * b1[1] + c2 * b2[1]) * px;

        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 4]);

        // O -> P1 & O -> P2
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p1x, p1y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p2x, p2y);
        ctx.stroke();

        // P1 -> Proj & P2 -> Proj
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(projX, projY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p2x, p2y);
        ctx.lineTo(projX, projY);
        ctx.stroke();

        ctx.setLineDash([]);

        // Điểm mút thành phần P1, P2
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.arc(p1x, p1y, 3.5, 0, Math.PI * 2);
        ctx.arc(p2x, p2y, 3.5, 0, Math.PI * 2);
        ctx.fill();

      } else if (basisItems.length >= 1 && coeffs && coeffs.length >= 1) {
        const b1 = basisItems[0].vec;
        const c1 = coeffs[0];
        const p1x = cx + c1 * b1[0] * px;
        const p1y = cy - c1 * b1[1] * px;

        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p1x, p1y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.arc(p1x, p1y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Điểm nhấn vòng tròn hổ phách tinh tế tại ngọn vector đang khảo sát
      ctx.fillStyle = "rgba(245, 158, 11, 0.35)";
      ctx.beginPath();
      ctx.arc(tipX, tipY, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f59e0b";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    },

    // =========================================================================
    // 3D THREE.JS RENDERING (HOOK TRỰC TIẾP TỪ VIEWER3D)
    // =========================================================================
    render3D(mathGroup) {
      if (!this._active || !mathGroup || App.mode !== "3D") return;
      const step = this.getStep();
      if (!step) return;

      const basisItems = step.basisItems || [];
      const u = Vec3D.S3D.unitsPerWorld || 1;
      const Lw = Vec3D._axisMaxWorld || 50;
      const Lm = Lw / u;

      // Đảm bảo nhóm Three.js chuyên dụng cho Subspace
      if (!Vec3D._basisSubspaceGroup) {
        Vec3D._basisSubspaceGroup = new THREE.Group();
        Vec3D._basisSubspaceGroup.name = "basisSubspaceGroup";
        mathGroup.add(Vec3D._basisSubspaceGroup);
      }

      const g = Vec3D._basisSubspaceGroup;
      // Dọn dẹp con cũ trước khi tái tạo
      while (g.children.length > 0) {
        const ch = g.children[0];
        g.remove(ch);
        if (ch.geometry) ch.geometry.dispose?.();
        if (ch.material) ch.material.dispose?.();
      }

      if (!basisItems.length && step.type === "INIT") return;

      const isExpand2D = step.type === "EXPAND" && step.dim === 2;
      const isExpand3D = step.type === "EXPAND" && step.dim === 3;
      // rawP điều khiển tiến độ hoạt cảnh lan tỏa sóng
      // Khi ở bước EXPAND, lấy từ _tileWaveProgress; khi đã sang các bước sau (REDUNDANT, CRYSTALLIZE), cố định = 1.0 để giữ nguyên không gian
      const rawP = (isExpand2D || isExpand3D) ? Math.max(0, this._tileWaveProgress) : 1.0;

      // Các hàm trợ giúp tạo hình Three.js
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

      const makeLineSegments = (pts, color, opacity = 0.35, isDashed = false) => {
        if (!pts.length) return null;
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        let mat;
        if (isDashed) {
          mat = new THREE.LineDashedMaterial({
            color,
            dashSize: 0.4 * u,
            gapSize: 0.25 * u,
            transparent: true,
            opacity,
            depthWrite: false
          });
        } else {
          mat = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity,
            depthWrite: false
          });
        }
        const segs = new THREE.LineSegments(geom, mat);
        if (isDashed) segs.computeLineDistances();
        segs.renderOrder = 1;
        return segs;
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
          depthWrite: false
        });
        const m = new THREE.Mesh(geom, mat);
        m.renderOrder = 0;
        return m;
      };

      const makeMarker = (pos, radius, color, haloRadius = 0, haloOpacity = 0.35) => {
        const grp = new THREE.Group();
        const sphereGeo = new THREE.SphereGeometry(radius, 16, 12);
        const sphereMat = new THREE.MeshBasicMaterial({ color, depthWrite: false });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.copy(pos);
        sphere.renderOrder = 5;
        grp.add(sphere);

        if (haloRadius > 0) {
          const haloGeo = new THREE.SphereGeometry(haloRadius, 16, 12);
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

      // 1. TRỤC 1D span(b1) (Emerald)
      if (basisItems.length >= 1) {
        const b1 = to3D(basisItems[0].vec);
        const len1 = norm(b1);
        if (len1 > 1e-4) {
          const dir1 = new THREE.Vector3(b1[0] / len1, b1[1] / len1, b1[2] / len1);
          const pMin = dir1.clone().multiplyScalar(-Lw);
          const pMax = dir1.clone().multiplyScalar(Lw);
          g.add(makeDashedLine(pMin, pMax, 0x10b981, 0.85, 0.6 * u, 0.3 * u));

          // Vạch chia đơn vị dọc theo span(b1)
          let upVec = new THREE.Vector3(0, 0, 1);
          if (Math.abs(dir1.dot(upVec)) > 0.9) upVec = new THREE.Vector3(0, 1, 0);
          const perp1 = new THREE.Vector3().crossVectors(dir1, upVec).normalize();
          const tickPairs = [];
          for (let m = -14; m <= 14; m++) {
            if (m === 0) continue;
            const dist = Math.abs(m) * len1 * u;
            if (dist <= Lw) {
              const tickCenter = dir1.clone().multiplyScalar(m * len1 * u);
              tickPairs.push(
                tickCenter.clone().addScaledVector(perp1, -0.09 * u),
                tickCenter.clone().addScaledVector(perp1, 0.09 * u)
              );
            }
          }
          if (tickPairs.length) {
            const ticksMesh = makeLineSegments(tickPairs, 0x10b981, 0.65, false);
            if (ticksMesh) g.add(ticksMesh);
          }

          // Gốc tọa độ O (Emerald)
          g.add(makeMarker(new THREE.Vector3(0, 0, 0), 0.05 * u, 0x10b981, 0.09 * u, 0.35));
        }
      }

      // 2. MẶT PHẲNG 2D span(b1, b2) VỚI ĐỘNG HỌC 4 PHA
      if (basisItems.length >= 2) {
        const b1 = to3D(basisItems[0].vec);
        const b2 = to3D(basisItems[1].vec);
        const len1 = norm(b1);
        const len2 = norm(b2);
        const nRaw = cross(b1, b2);
        const lenN = norm(nRaw);

        if (lenN > 1e-4 && len1 > 1e-4 && len2 > 1e-4) {
          const dir2 = new THREE.Vector3(b2[0] / len2, b2[1] / len2, b2[2] / len2);
          const isPhaseBeforeCrystallize = isExpand2D && rawP < 0.95;
          const axis2Color = isPhaseBeforeCrystallize ? 0x38bdf8 : 0x10b981;

          // Trục 1D span(b2)
          const pMin2 = dir2.clone().multiplyScalar(-Lw);
          const pMax2 = dir2.clone().multiplyScalar(Lw);
          g.add(makeDashedLine(pMin2, pMax2, axis2Color, 0.85, 0.6 * u, 0.3 * u));

          // Vạch chia đơn vị dọc theo span(b2)
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
            const ticks2Mesh = makeLineSegments(tickPairs2, axis2Color, 0.65, false);
            if (ticks2Mesh) g.add(ticks2Mesh);
          }

          // Vector Three.js cơ sở tương ứng
          const vB1 = new THREE.Vector3(b1[0] * u, b1[1] * u, b1[2] * u);
          const vB2 = new THREE.Vector3(b2[0] * u, b2[1] * u, b2[2] * u);
          const vO = new THREE.Vector3(0, 0, 0);

          // Cơ sở trực chuẩn (u1, u2) trong mặt phẳng span(b1, b2) để phủ trọn 100% không gian
          const u1 = new THREE.Vector3(b1[0] / len1, b1[1] / len1, b1[2] / len1);
          const nHat = new THREE.Vector3(nRaw[0] / lenN, nRaw[1] / lenN, nRaw[2] / lenN);
          const u2 = new THREE.Vector3().crossVectors(nHat, u1).normalize();

          // Bán kính bao phủ toàn bộ khung nhìn 3D (vượt qua hộp trục Lw)
          const Rplane = Lw * 1.8;
          const Rm = Rplane / u;
          const b1dotb2 = dot(b1, b2);

          if (isExpand2D && rawP < 0.15) {
            // PHA 1: Khảo sát 2 vector độc lập (Chỉ 2 trục và gốc O, không gian phẳng chưa xuất hiện)
          } else if (isExpand2D && rawP < 0.45) {
            // PHA 2: Đoạn thẳng b1 trượt dọc theo b2 quét hình bình hành cơ sở (0.15 <= rawP < 0.45)
            const tSweep = (rawP - 0.15) / 0.30;
            const s = tSweep * tSweep * (3 - 2 * tSweep);
            const curC2 = s;

            const V0 = vO;
            const V1 = vB1;
            const V2 = vB1.clone().addScaledVector(vB2, curC2);
            const V3 = vB2.clone().multiplyScalar(curC2);

            // A. Diện tích hình bình hành cơ sở đang quét ra
            g.add(makeQuadMesh(V0, V1, V2, V3, 0x10b981, 0.22));

            // B. Viền cạnh đáy (O -> b1)
            g.add(makeLine(V0, V1, 0x10b981, 0.65));

            // C. Đoạn thẳng b1 ĐANG TRƯỢT TỊNH TIẾN (Moving Segment) - Xanh ngọc phát sáng
            g.add(makeLine(V3, V2, 0x34d399, 1.0));

            // D. Ray dẫn hướng trượt dọc theo b2 (O -> V3) và song song (V1 -> V2)
            g.add(makeLine(V0, V3, 0x38bdf8, 0.85));
            g.add(makeLine(V1, V2, 0x38bdf8, 0.65));

            // E. Hai điểm mút đang trượt
            g.add(makeMarker(V3, 0.045 * u, 0x38bdf8));
            g.add(makeMarker(V2, 0.045 * u, 0x38bdf8));

          } else if (isExpand2D && rawP < 0.95) {
            // PHA 3: Mặt phẳng dãn nở trực chuẩn ra toàn bộ không gian 3D (0.45 <= rawP < 0.95)
            const tExp = (rawP - 0.45) / 0.50;
            const s = tExp * tExp * (3 - 2 * tExp);
            const R0 = Math.max(len1, len2) * 1.4 * u;
            const Rcur = R0 + (Rplane - R0) * s;

            const C00 = u1.clone().multiplyScalar(-Rcur).addScaledVector(u2, -Rcur);
            const C10 = u1.clone().multiplyScalar(Rcur).addScaledVector(u2, -Rcur);
            const C11 = u1.clone().multiplyScalar(Rcur).addScaledVector(u2, Rcur);
            const C01 = u1.clone().multiplyScalar(-Rcur).addScaledVector(u2, Rcur);

            // A. Diện tích mặt phẳng dãn nở bao trùm không gian
            g.add(makeQuadMesh(C00, C10, C11, C01, 0x10b981, 0.16));

            // B. Viền mép phát sáng
            g.add(makeLineLoop([C00, C10, C11, C01], 0x34d399, 0.85));

            // C. Lưới Affine động dãn nở clipped theo Rcur
            const curRm = Rcur / u;
            const kMax = Math.min(25, Math.floor((curRm * len1) / lenN));
            const stepK = kMax > 16 ? Math.ceil(kMax / 12) : 1;
            const gridLines1 = [];
            for (let k = -kMax; k <= kMax; k += stepK) {
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
              if (gl1) g.add(gl1);
            }

            const mMax = Math.min(25, Math.floor((curRm * len2) / lenN));
            const stepM = mMax > 16 ? Math.ceil(mMax / 12) : 1;
            const gridLines2 = [];
            for (let m = -mMax; m <= mMax; m += stepM) {
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
              if (gl2) g.add(gl2);
            }

          } else {
            // PHA 4: HOAN TAT & DUY TRI CHO KHONG GIAN 2D
            // Bao ton lien tuc: khi he chi co 2 vector thi phu 0.16; khi sang dim 3 van giu lam mat san / mat phang tham chieu span(b1, b2) ben trong R3!
            const C00 = u1.clone().multiplyScalar(-Rplane).addScaledVector(u2, -Rplane);
            const C10 = u1.clone().multiplyScalar(Rplane).addScaledVector(u2, -Rplane);
            const C11 = u1.clone().multiplyScalar(Rplane).addScaledVector(u2, Rplane);
            const C01 = u1.clone().multiplyScalar(-Rplane).addScaledVector(u2, Rplane);

            // A. Mat phang ngoc bich on dinh phu tron khong gian 3D (khong bao gio bi bien mat khi sang dim 3)
            const planeOpacity = (basisItems.length < 3 || (isExpand3D && rawP < 0.45)) ? 0.16 : 0.10;
            g.add(makeQuadMesh(C00, C10, C11, C01, 0x10b981, planeOpacity));

            // B. Mang luoi Affine tren mat phang span(b1, b2) (chong thu hep khi zoom)
            const dPerp1 = (lenN / len1) * u;
            const kMax = Math.ceil(Rplane / Math.max(0.01, dPerp1));
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
              const gl1 = makeLineSegments(gridLines1, 0x10b981, basisItems.length < 3 ? 0.30 : 0.20, true);
              if (gl1) g.add(gl1);
            }

            const dPerp2 = (lenN / len2) * u;
            const mMax = Math.ceil(Rplane / Math.max(0.01, dPerp2));
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
              const gl2 = makeLineSegments(gridLines2, 0x38bdf8, basisItems.length < 3 ? 0.25 : 0.16, true);
              if (gl2) g.add(gl2);
            }
          }
        }
      }

      // 3. KHONG GIAN 3D KHOI HOP PARALLELEPIPED (KHI DIM = 3 DOC LAP) VOI DONG HOC 4 PHA
      if (basisItems.length >= 3) {
        const b1 = to3D(basisItems[0].vec);
        const b2 = to3D(basisItems[1].vec);
        const b3 = to3D(basisItems[2].vec);
        const len1 = norm(b1);
        const len2 = norm(b2);
        const len3 = norm(b3);

        const b2xb3 = cross(b2, b3);
        const detB = Math.abs(dot(b1, b2xb3));

        if (detB > 1e-4 && len1 > 1e-4 && len2 > 1e-4 && len3 > 1e-4) {
          const dir3 = new THREE.Vector3(b3[0] / len3, b3[1] / len3, b3[2] / len3);
          const isPhaseBeforeCrystallize3 = isExpand3D && rawP < 0.95;
          const axis3Color = isPhaseBeforeCrystallize3 ? 0x38bdf8 : 0x10b981;

          // Truc 1D span(b3)
          const pMin3 = dir3.clone().multiplyScalar(-Lw);
          const pMax3 = dir3.clone().multiplyScalar(Lw);
          g.add(makeDashedLine(pMin3, pMax3, axis3Color, 0.85, 0.6 * u, 0.3 * u));

          // Vach chia don vi doc theo span(b3)
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
            const ticks3Mesh = makeLineSegments(tickPairs3, axis3Color, 0.65, false);
            if (ticks3Mesh) g.add(ticks3Mesh);
          }

          const vB1 = new THREE.Vector3(b1[0] * u, b1[1] * u, b1[2] * u);
          const vB2 = new THREE.Vector3(b2[0] * u, b2[1] * u, b2[2] * u);
          const vB3 = new THREE.Vector3(b3[0] * u, b3[1] * u, b3[2] * u);
          const vO = new THREE.Vector3(0, 0, 0);

          const W1 = Math.max(1e-4, len1 * u);
          const W2 = Math.max(1e-4, len2 * u);
          const W3 = Math.max(1e-4, len3 * u);

          // Ban kinh bao phu toan bo tam nhin 3D theo don vi Three.js world, khong bao gio bi thu hep khi zoom ra xa
          const Rworld = Lw * 1.8;
          const R1Max = Rworld / W1;
          const R2Max = Rworld / W2;
          const R3Max = Rworld / W3;

          if (isExpand3D && rawP < 0.15) {
            // PHA 1: Khao sat phuong thu 3 doc lap ngoai mat phang (Chi truc b3, vach chia va marker dinh)
            g.add(makeMarker(vB3, 0.05 * u, 0x38bdf8, 0.085 * u, 0.4));
          } else if (isExpand3D && rawP < 0.45) {
            // PHA 2: Mat phang day truot tinh tien theo b3 quet khoi hop co so (0.15 <= rawP < 0.45)
            const tSweep = (rawP - 0.15) / 0.30;
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
            g.add(makeQuadMesh(p000, p100, p110, p010, 0x10b981, 0.18));
            g.add(makeQuadMesh(p001, p101, p111, p011, 0x38bdf8, 0.24));
            // Vien mat tren dang truot phat sang
            g.add(makeLineLoop([p001, p101, p111, p011], 0x38bdf8, 0.95));

            // 4 mat ben
            g.add(makeQuadMesh(p000, p100, p101, p001, 0x10b981, 0.14));
            g.add(makeQuadMesh(p100, p110, p111, p101, 0x10b981, 0.14));
            g.add(makeQuadMesh(p110, p010, p011, p111, 0x10b981, 0.14));
            g.add(makeQuadMesh(p010, p000, p001, p011, 0x10b981, 0.14));

            // 4 ray dan huong truot doc theo b3
            g.add(makeLine(p000, p001, 0x38bdf8, 0.85));
            g.add(makeLine(p100, p101, 0x38bdf8, 0.85));
            g.add(makeLine(p110, p111, 0x38bdf8, 0.85));
            g.add(makeLine(p010, p011, 0x38bdf8, 0.85));

            // 4 diem mut dinh tren
            g.add(makeMarker(p001, 0.045 * u, 0x38bdf8));
            g.add(makeMarker(p101, 0.045 * u, 0x38bdf8));
            g.add(makeMarker(p111, 0.045 * u, 0x38bdf8));
            g.add(makeMarker(p011, 0.045 * u, 0x38bdf8));

          } else if (isExpand3D && rawP < 0.95) {
            // PHA 3: Khoi hop dan no affine da chieu ra toan bo khong gian 3D (0.45 <= rawP < 0.95)
            const tExp = (rawP - 0.45) / 0.50;
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
            g.add(makeQuadMesh(c000, c100, c110, c010, 0x10b981, 0.06));
            g.add(makeQuadMesh(c001, c101, c111, c011, 0x10b981, 0.07));
            g.add(makeQuadMesh(c000, c100, c101, c001, 0x10b981, 0.06));
            g.add(makeQuadMesh(c010, c110, c111, c011, 0x10b981, 0.06));
            g.add(makeQuadMesh(c000, c010, c011, c001, 0x10b981, 0.06));
            g.add(makeQuadMesh(c100, c110, c111, c101, 0x10b981, 0.06));

            // 12 canh khung phat sang
            const edges = [
              c000, c100, c100, c110, c110, c010, c010, c000,
              c001, c101, c101, c111, c111, c011, c011, c001,
              c000, c001, c100, c101, c110, c111, c010, c011
            ];
            const edgesMesh = makeLineSegments(edges, 0x34d399, 0.75, false);
            if (edgesMesh) g.add(edgesMesh);

            // Lat cat tang affine song song span(b1, b2) tai cac muc nguyen c3 (adaptive world-step)
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
              if (slicesMesh) g.add(slicesMesh);
            }

          } else {
            // PHA 4: HOAN TAT & DUY TRI CHO KHONG GIAN R3 (rawP >= 0.95)
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
            g.add(makeQuadMesh(c000, c100, c110, c010, 0x10b981, 0.05));
            g.add(makeQuadMesh(c001, c101, c111, c011, 0x10b981, 0.05));
            g.add(makeQuadMesh(c000, c100, c101, c001, 0x10b981, 0.05));
            g.add(makeQuadMesh(c010, c110, c111, c011, 0x10b981, 0.05));
            g.add(makeQuadMesh(c000, c010, c011, c001, 0x10b981, 0.05));
            g.add(makeQuadMesh(c100, c110, c111, c101, 0x10b981, 0.05));

            // 12 canh khung khong gian R3
            const edges = [
              c000, c100, c100, c110, c110, c010, c010, c000,
              c001, c101, c101, c111, c111, c011, c011, c001,
              c000, c001, c100, c101, c110, c111, c010, c011
            ];
            const edgesMesh = makeLineSegments(edges, 0x10b981, 0.40, false);
            if (edgesMesh) g.add(edgesMesh);

            // Lat cat tang affine song song span(b1, b2) (adaptive stepping chong bien mat khi zoom)
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
              if (slicesMesh) g.add(slicesMesh);
            }
          }
        }
      }

      // 4. KHAO SAT VECTOR PHU THUOC (VECTOR CAM): HINH BINH HANH / KHOI HOP TO HOP TUYEN TINH
      if (step.type === "REDUNDANT" && step.item) {
        const vRaw = to3D(step.item.vec);
        const vPos = new THREE.Vector3(vRaw[0] * u, vRaw[1] * u, vRaw[2] * u);

        // Lay he so to hop phan tich
        let decomp = solveDecomposition(vRaw, basisItems);
        const coeffs = (step.coeffs && step.coeffs.length) ? step.coeffs : decomp.coeffs;

        if (basisItems.length >= 3 && coeffs && coeffs.length >= 3) {
          const b1 = to3D(basisItems[0].vec);
          const b2 = to3D(basisItems[1].vec);
          const b3 = to3D(basisItems[2].vec);
          const c1 = coeffs[0];
          const c2 = coeffs[1];
          const c3 = coeffs[2];

          const vB1 = new THREE.Vector3(b1[0] * u, b1[1] * u, b1[2] * u);
          const vB2 = new THREE.Vector3(b2[0] * u, b2[1] * u, b2[2] * u);
          const vB3 = new THREE.Vector3(b3[0] * u, b3[1] * u, b3[2] * u);

          const P1 = vB1.clone().multiplyScalar(c1);
          const P2 = vB2.clone().multiplyScalar(c2);
          const P3 = vB3.clone().multiplyScalar(c3);
          const P12 = P1.clone().add(P2);
          const Ptotal = P12.clone().add(P3);
          const vO = new THREE.Vector3(0, 0, 0);

          // O -> P1, O -> P2, O -> P3
          g.add(makeDashedLine(vO, P1, 0xf59e0b, 0.85, 0.4 * u, 0.2 * u));
          g.add(makeDashedLine(vO, P2, 0xf59e0b, 0.85, 0.4 * u, 0.2 * u));
          g.add(makeDashedLine(vO, P3, 0xf59e0b, 0.85, 0.4 * u, 0.2 * u));

          // Mat phang day (P1 -> P12, P2 -> P12)
          g.add(makeDashedLine(P1, P12, 0xf59e0b, 0.70, 0.4 * u, 0.2 * u));
          g.add(makeDashedLine(P2, P12, 0xf59e0b, 0.70, 0.4 * u, 0.2 * u));

          // Canh dung len dinh Ptotal
          g.add(makeDashedLine(P12, Ptotal, 0xf59e0b, 0.85, 0.4 * u, 0.2 * u));
          g.add(makeDashedLine(P3, Ptotal, 0xf59e0b, 0.70, 0.4 * u, 0.2 * u));

          g.add(makeMarker(P1, 0.045 * u, 0xf59e0b));
          g.add(makeMarker(P2, 0.045 * u, 0xf59e0b));
          g.add(makeMarker(P3, 0.045 * u, 0xf59e0b));
          g.add(makeMarker(Ptotal, 0.05 * u, 0xf59e0b, 0.085 * u, 0.35));

        } else if (basisItems.length >= 2 && coeffs && coeffs.length >= 2) {
          const b1 = to3D(basisItems[0].vec);
          const b2 = to3D(basisItems[1].vec);
          const c1 = coeffs[0];
          const c2 = coeffs[1];

          const vB1 = new THREE.Vector3(b1[0] * u, b1[1] * u, b1[2] * u);
          const vB2 = new THREE.Vector3(b2[0] * u, b2[1] * u, b2[2] * u);

          const P1 = vB1.clone().multiplyScalar(c1);
          const P2 = vB2.clone().multiplyScalar(c2);
          const Pproj = P1.clone().add(P2);
          const vO = new THREE.Vector3(0, 0, 0);

          // Cac doan giong dut net mau vang ho phach (0xf59e0b)
          // O -> P1 (thanh phan tren truc b1)
          g.add(makeDashedLine(vO, P1, 0xf59e0b, 0.85, 0.4 * u, 0.2 * u));
          // O -> P2 (thanh phan tren truc b2)
          g.add(makeDashedLine(vO, P2, 0xf59e0b, 0.85, 0.4 * u, 0.2 * u));
          // P1 -> Pproj (song song b2)
          g.add(makeDashedLine(P1, Pproj, 0xf59e0b, 0.85, 0.4 * u, 0.2 * u));
          // P2 -> Pproj (song song b1)
          g.add(makeDashedLine(P2, Pproj, 0xf59e0b, 0.85, 0.4 * u, 0.2 * u));

          // Neu vector co phan du ngoai mat phang, ve duong vuong goc tu v xuong hinh chieu
          if (vPos.distanceTo(Pproj) > 0.005 * u) {
            g.add(makeDashedLine(vPos, Pproj, 0xef4444, 0.75, 0.3 * u, 0.15 * u));
          }

          // Diem mut thanh phan P1, P2
          g.add(makeMarker(P1, 0.045 * u, 0xf59e0b));
          g.add(makeMarker(P2, 0.045 * u, 0xf59e0b));
          g.add(makeMarker(Pproj, 0.05 * u, 0xf59e0b, 0.085 * u, 0.35));

        } else if (basisItems.length >= 1 && coeffs && coeffs.length >= 1) {
          const b1 = to3D(basisItems[0].vec);
          const c1 = coeffs[0];
          const vB1 = new THREE.Vector3(b1[0] * u, b1[1] * u, b1[2] * u);
          const P1 = vB1.clone().multiplyScalar(c1);
          const vO = new THREE.Vector3(0, 0, 0);

          g.add(makeDashedLine(vO, P1, 0xf59e0b, 0.85, 0.4 * u, 0.2 * u));
          g.add(makeMarker(P1, 0.05 * u, 0xf59e0b, 0.085 * u, 0.35));
        }

        // Diem nhan tinh te tai ngon vector khao sat (ban kinh chuan hoc thuat 0.05u, khong bi phinh to)
        g.add(makeMarker(vPos, 0.05 * u, 0xf59e0b, 0.085 * u, 0.35));
      }
    },

    destroy3D() {
      if (window.Vec3D && Vec3D._basisSubspaceGroup) {
        const g = Vec3D._basisSubspaceGroup;
        if (g.parent) g.parent.remove(g);
        g.traverse((ch) => {
          if (ch.geometry) ch.geometry.dispose?.();
          if (ch.material) ch.material.dispose?.();
        });
        Vec3D._basisSubspaceGroup = null;
      }
    }
  };

  // --- EXPORT PUBLIC APIS ---
  App.BasisAnimator = Animator;
  App.analyzeBasisPlan = analyzeBasisPlan;

  App.startBasisAnimation = function (opts) {
    App._basisAnimActive = true;
    return Animator.start(opts);
  };

  App.stopBasisAnimation = function () {
    const wrap = document.getElementById("basisAnimControls");
    if (wrap) wrap.style.display = "none";
    if (typeof App.restoreBasisPreState === "function") {
      try { App.restoreBasisPreState(); } catch (_) {}
    }
    return Animator.stop();
  };

  App.toggleBasisAnimation = function () {
    return Animator.togglePlay();
  };

  App.setBasisSpeed = function (speed) {
    return Animator.setSpeed(speed);
  };
})();
