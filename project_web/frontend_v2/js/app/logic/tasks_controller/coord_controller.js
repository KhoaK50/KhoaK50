// ==========================================================================
// FILE: js/app/logic/tasks_controller/coord_controller.js
// MÔ TẢ: Điều khiển logic bài toán Tọa độ (Coordinates) & Tích hợp Hoạt cảnh
// ==========================================================================
(function () {
  window.App = window.App || {};
  let cachedConfig = null;

  function $(id) {
    return document.getElementById(id);
  }

  // Hàm chuyển số thực sang chuỗi LaTeX chuẩn xác (Số nguyên -> Căn thức -> Phân số -> Thập phân)
  function fmtScalarLatex(val) {
    if (!Number.isFinite(val) || Math.abs(val) < 1e-9) return "0";
    const sign = val < 0 ? "-" : "";
    const abs = Math.abs(val);

    if (Math.abs(abs - Math.round(abs)) < 1e-7) {
      return sign + String(Math.round(abs));
    }

    // Kiểm tra phân số tối giản
    let h1 = 1, h2 = 0, k1 = 0, k2 = 1, b = abs;
    for (let iter = 0; iter < 24; iter++) {
      const a = Math.floor(b);
      const auxH = h1; h1 = a * h1 + h2; h2 = auxH;
      const auxK = k1; k1 = a * k1 + k2; k2 = auxK;
      if (Math.abs(abs - h1 / k1) < 1e-7 && k1 <= 100) {
        if (k1 === 1) return sign + String(h1);
        return `${sign}\\frac{${h1}}{${k1}}`;
      }
      const rem = b - a;
      if (Math.abs(rem) < 1e-9) break;
      b = 1 / rem;
    }

    return (val < 0 ? "-" : "") + parseFloat(abs.toFixed(3)).toString();
  }

  function getVecIndexLabel(it, fallbackNum) {
    if (!it) return String(fallbackNum);
    if (typeof App.displayIndexOf === "function") {
      const d = App.displayIndexOf(it);
      if (d) return String(d);
    }
    const idx = App.vectorList ? App.vectorList.indexOf(it) : -1;
    return idx >= 0 ? String(idx + 1) : String(fallbackNum);
  }

  function buildLinearComboLatex(coeffs, basisObjs) {
    const terms = [];
    for (let i = 0; i < coeffs.length; i++) {
      const c = coeffs[i];
      const vIdx = getVecIndexLabel(basisObjs[i], i + 1);
      const cLatex = fmtScalarLatex(Math.abs(c));
      const isNeg = c < -1e-7;
      if (i === 0) {
        terms.push(`${isNeg ? "-" : ""}${cLatex}v_{${vIdx}}`);
      } else {
        terms.push(`${isNeg ? "-" : "+"} ${cLatex}v_{${vIdx}}`);
      }
    }
    return terms.join(" ");
  }

  function renderCoordResultBox(targetObj, basisObjs, sol) {
    const resBox = $("result_coord");
    if (!resBox || !targetObj || !basisObjs || !basisObjs.length) return;

    if (!sol || !sol.solvable) {
      resBox.innerHTML = `
        <div style="padding: 8px 10px; border-radius: 4px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.35); color: var(--text-main, #ef4444); font-size: 12px; line-height: 1.5;">
          <b style="color: #ef4444;">Không thể xác định tọa độ:</b><br/>
          ${sol?.error || "Hệ vector cơ sở phụ thuộc tuyến tính (det = 0)."}
        </div>
      `;
      return;
    }

    const targetIdx = getVecIndexLabel(targetObj, 1);
    const coeffs = sol.coeffs || [];
    const tupleLatex = `\\left(${coeffs.map(fmtScalarLatex).join(", ")}\\right)^T`;
    const comboLatex = buildLinearComboLatex(coeffs, basisObjs);

    resBox.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px; padding: 4px 0 10px 0;">
        <div style="display:flex; flex-direction:column; gap:6px; width:100%;">
          <math-field read-only id="mfCoordTuple" style="
            width: 100%;
            box-sizing: border-box;
            background: var(--bg-paper, var(--card, #fff));
            border: 1px solid var(--border-subtle, var(--border, #ccc));
            border-radius: 4px;
            padding: 6px 12px;
            font-size: 1.18em;
            color: var(--text-main, #333);
            pointer-events: none;
          ">[v_{${targetIdx}}]_B = ${tupleLatex}</math-field>

          <math-field read-only id="mfCoordCombo" style="
            width: 100%;
            box-sizing: border-box;
            background: var(--bg-hover, rgba(0,0,0,0.02));
            border: 1px dashed var(--border-subtle, var(--border, #ccc));
            border-radius: 4px;
            padding: 6px 12px;
            font-size: 1.12em;
            color: var(--text-muted, #64748b);
            pointer-events: none;
          ">v_{${targetIdx}} = ${comboLatex}</math-field>
        </div>

        <div style="font-size:11.5px; color:var(--text-muted, #888); font-style:italic; padding:2px 0 4px 0; line-height:1.45; text-align:left; width:100%;">
          Bấm <b>"Trực quan"</b> để xem hoạt cảnh biến đổi không gian hoặc <b>"Lời giải"</b> để xem biến đổi hệ phương trình và ma trận chuyển cơ sở.
        </div>
      </div>
    `;
  }

  // Đồng bộ trực tiếp ô kết quả khi người dùng kéo thả vector trong lúc bật Trực quan
  App.onCoordLiveUpdate = function (targetObj, basisObjs, sol) {
    const mfTuple = $("mfCoordTuple");
    const mfCombo = $("mfCoordCombo");
    if (mfTuple && mfCombo && sol && sol.solvable) {
      const targetIdx = getVecIndexLabel(targetObj, 1);
      const coeffs = sol.coeffs || [];
      const tupleLatex = `\\left(${coeffs.map(fmtScalarLatex).join(", ")}\\right)^T`;
      const comboLatex = buildLinearComboLatex(coeffs, basisObjs);
      mfTuple.value = `[v_{${targetIdx}}]_B = ${tupleLatex}`;
      mfCombo.value = `v_{${targetIdx}} = ${comboLatex}`;
    } else if ($("result_coord") && $("result_coord").innerHTML.trim() !== "") {
      renderCoordResultBox(targetObj, basisObjs, sol);
    }
  };

  // Khởi tạo cụm điều khiển hoạt cảnh tọa độ trên sidebar
  App.ensureCoordAnimControls = function () {
    const checklist = $("basisCoordChecklist");
    const out = $("result_coord");
    if (!checklist || !out) return;
    if ($("coordAnimControls")) return;

    const host = out.parentElement || checklist.parentElement;
    if (!host) return;

    const wrap = document.createElement("div");
    wrap.id = "coordAnimControls";
    wrap.className = "basis-sidebar-anim-box";
    wrap.style.display = "none";
    wrap.style.marginTop = "10px";

    wrap.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted, #64748b);">Trực quan hóa tọa độ</span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="basis-step-pill" id="coordStepCounter">Bước 1 / 4</span>
          <button type="button" id="btnCoordCloseAnim" class="basis-anim-close-btn" title="Đóng trực quan" style="background: transparent; border: none; cursor: pointer; color: var(--text-muted, #64748b); font-size: 13px; padding: 2px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px;">
            <i class="ph ph-x"></i>
          </button>
        </div>
      </div>

      <div class="coord-phase-pills" id="coordPhasePills">
        <button type="button" class="coord-phase-btn active" data-phase="0" title="Bước 1: Thiết lập vector đơn vị mới của không gian B">Bước 1</button>
        <button type="button" class="coord-phase-btn" data-phase="1" title="Bước 2: Dệt lưới không gian mới từ cơ sở B">Bước 2</button>
        <button type="button" class="coord-phase-btn" data-phase="2" title="Bước 3: Biến đổi không gian - Đưa cơ sở B về trục đơn vị">Bước 3</button>
        <button type="button" class="coord-phase-btn" data-phase="3" title="Bước 4: Đọc tọa độ mới của vector trong không gian mới">Bước 4</button>
      </div>

      <div class="basis-anim-btn-row">
        <button type="button" id="btnCoordPrev" class="basis-ctrl-btn" title="Bước trước">
          <i class="ph ph-skip-back"></i>
        </button>
        <button type="button" id="btnCoordPlay" class="basis-ctrl-btn primary" title="Phát / Tạm dừng">
          <i class="ph ph-play" id="iconCoordPlay"></i>
        </button>
        <button type="button" id="btnCoordNext" class="basis-ctrl-btn" title="Bước tiếp">
          <i class="ph ph-skip-forward"></i>
        </button>
        <button type="button" id="btnCoordReplay" class="basis-ctrl-btn" title="Phát lại từ đầu">
          <i class="ph ph-arrow-counter-clockwise"></i>
        </button>
      </div>

      <div class="hud-menu-slider-row basis-speed-slider-wrap" style="padding: 6px 0 2px; margin-top: 6px; border-top: 1px dashed var(--border-subtle, var(--border, #e2e8f0));">
        <div class="hud-menu-slider-header" style="font-size: 11.5px; margin-bottom: 2px;">
          <span class="hud-menu-item-text" style="color: var(--text-muted, #64748b); font-weight: 600;">Tốc độ phát</span>
          <span class="hud-menu-slider-val" id="coordSpeedValue">1.0×</span>
        </div>
        <input type="range" id="coordSpeedSlider" min="0.2" max="2.5" step="0.1" value="1.0" class="hud-range-slider" />
      </div>

      <div class="basis-step-explainer" id="coordStepExplainer">
        <div class="basis-step-title" id="coordStepTitle">Khảo sát tọa độ</div>
        <div class="basis-step-desc" id="coordStepDesc">Bấm nút Trực quan để khởi chạy hoạt cảnh.</div>
      </div>
    `;

    if (out.nextSibling) {
      host.insertBefore(wrap, out.nextSibling);
    } else {
      host.appendChild(wrap);
    }

    const speedSlider = wrap.querySelector("#coordSpeedSlider");
    const syncSliderPct = (val) => {
      if (!speedSlider) return;
      const min = parseFloat(speedSlider.min) || 0.2;
      const max = parseFloat(speedSlider.max) || 2.5;
      const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
      speedSlider.style.setProperty("--slider-pct", `${pct.toFixed(1)}%`);
      speedSlider.style.setProperty("--range-pct", `${pct.toFixed(1)}%`);
    };

    if (speedSlider) {
      speedSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value) || 1.0;
        syncSliderPct(val);
        const valLabel = wrap.querySelector("#coordSpeedValue");
        if (valLabel) valLabel.textContent = `${val.toFixed(1)}×`;
      });
      syncSliderPct(1.0);
    }

    const phaseBtns = wrap.querySelectorAll(".coord-phase-btn");
    phaseBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const ph = parseInt(btn.dataset.phase, 10);
        if (window.App && App.CoordAnimator && typeof App.CoordAnimator.goToPhase === "function") {
          App.CoordAnimator.goToPhase(ph);
        }
      });
    });

    const btnClose = wrap.querySelector("#btnCoordCloseAnim");
    if (btnClose) {
      btnClose.addEventListener("click", () => {
        App.stopCoordAnimation();
      });
    }

    if (window.App && App.CoordAnimator && typeof App.CoordAnimator.bindSidebarControls === "function") {
      App.CoordAnimator.bindSidebarControls();
    }
  };

  // Dừng và giải phóng hoạt cảnh tọa độ
  App.stopCoordAnimation = function () {
    if (window.App && App.CoordAnimator && typeof App.CoordAnimator.stop === "function") {
      App.CoordAnimator.stop();
    }
    const wrap = $("coordAnimControls");
    if (wrap) wrap.style.display = "none";
  };

  function getSelectedCoordData() {
    const targetSelect = $("vCoordSelect");
    if (!targetSelect) return null;
    const targetId = parseInt(targetSelect.value, 10);
    const targetObj = (App.vectorList || []).find((v) => v.id === targetId);

    const checkContainer = $("basisCoordChecklist");
    if (!checkContainer) return null;

    const checkedInputs = Array.from(
      checkContainer.querySelectorAll('input[type="checkbox"]:checked')
    );
    const basisObjs = checkedInputs
      .map((inp) => {
        const vid = parseInt(inp.value, 10);
        return (App.vectorList || []).find((v) => v.id === vid);
      })
      .filter(Boolean);

    return { targetObj, basisObjs };
  }

  function computeAndPrepareCoordSolution(targetObj, basisObjs) {
    const n = targetObj.vec.length;
    if (basisObjs.some((b) => b.vec.length !== n)) {
      if (window.App && window.App.showToast) {
        window.App.showToast(`Lỗi: Tất cả vector phải cùng số chiều ${n}!`, "warning");
      }
      return null;
    }

    const sol =
      typeof App.solveCoordinates === "function"
        ? App.solveCoordinates(targetObj.vec, basisObjs)
        : null;

    renderCoordResultBox(targetObj, basisObjs, sol);

    if (!sol || !sol.solvable) {
      if (window.App && window.App.showToast) {
        window.App.showToast(sol?.error || "Hệ vector cơ sở phụ thuộc tuyến tính!", "warning");
      }
      return null;
    }

    function getLatex(obj) {
      if (obj.latex) {
        const s = obj.latex.replace(/^\\left\[|^\[|\\right\]|\]$/g, "");
        return s.split(",").map((x) => x.trim());
      }
      return obj.vec;
    }
    const basisLatex = basisObjs.map(getLatex);
    const targetLatex = getLatex(targetObj);
    const basisVecs = basisObjs.map((v) => v.vec);
    const targetVec = targetObj.vec;

    if (App.TasksGen && App.TasksGen.Coord) {
      const content1 = App.TasksGen.Coord.buildMethod1(basisVecs, targetVec, basisLatex, targetLatex);
      const content2 = App.TasksGen.Coord.buildMethod2(basisVecs, targetVec, basisLatex, targetLatex);

      cachedConfig = {
        title: "Tọa độ vector theo cơ sở",
        math: `\\( \\mathbb{R}^${n} \\)`,
        tab1Label: "Cách 1: Lập hệ phương trình",
        tab2Label: "Cách 2: Ma trận chuyển cơ sở",
        showSubTabs: false,
        content1: content1,
        content2: content2,
        autoOpen: false
      };

      if (typeof App.openSolutionPanel === "function") {
        App.openSolutionPanel({ ...cachedConfig, autoOpen: false });
      }

      if (window.App.PaperLogger) {
        const targetIdx = getVecIndexLabel(targetObj, 1);
        const tupleLatex = `\\left(${sol.coeffs.map(fmtScalarLatex).join(", ")}\\right)^T`;
        const ltx = `[v_{${targetIdx}}]_B = ${tupleLatex}`;
        const animData = {
          type: "coord",
          targetId: targetObj.id,
          basisIds: basisObjs.map((b) => b.id)
        };
        App.PaperLogger.log("Tọa độ của Vector đối với Cơ sở", ltx, "", cachedConfig, animData);
      }
    }

    return sol;
  }

  let _coordBtnsInitialized = false;
  function init() {
    App.ensureCoordAnimControls();
    if (_coordBtnsInitialized) return;

    const btnCalc = $("btnCoord");
    const btnAnimate = $("btnCoordAnimate");
    const btnShow = $("btnCoordSolution");
    if (!btnCalc && !btnAnimate && !btnShow) return;
    _coordBtnsInitialized = true;

    const vCoordSelect = $("vCoordSelect");
    if (vCoordSelect && !vCoordSelect._coordBound) {
      vCoordSelect._coordBound = true;
      vCoordSelect.addEventListener("change", () => {
        App._lastCoordAnimData = null;
        if (typeof App.stopCoordAnimation === "function" && window.App?.CoordAnimator?.isActive?.()) {
          try { App.stopCoordAnimation(); } catch (_) {}
        }

        const targetId = parseInt(vCoordSelect.value, 10);
        const checkContainer = $("basisCoordChecklist");
        if (!checkContainer) return;

        // Tự động bỏ chọn checkbox của vector đích khỏi checklist cơ sở nếu đang tick
        const targetCb = checkContainer.querySelector(`input[type="checkbox"][value="${targetId}"]`);
        if (targetCb && targetCb.checked) {
          targetCb.checked = false;
          targetCb.dispatchEvent(new Event("change", { bubbles: true }));
          if (window.App && typeof App.showToast === "function") {
            App.showToast("Đã tự động bỏ chọn vector đích khỏi hệ cơ sở để quan sát hình bình hành không suy biến.", "info");
          }
        }
      });
    }

    // --- 1. XỬ LÝ NÚT "XUẤT TỌA ĐỘ" ---
    App.coordinatesUI = function () {
      const data = getSelectedCoordData();
      if (!data) return;
      const { targetObj, basisObjs } = data;

      if (!targetObj) {
        if (window.App && window.App.showToast) window.App.showToast("Vui lòng chọn vector đích (x)!", "warning");
        return;
      }
      if (basisObjs.length < 2) {
        if (window.App && window.App.showToast) window.App.showToast("Vui lòng chọn ít nhất 2 vector cho hệ cơ sở (B)!", "warning");
        return;
      }

      const isTargetInBasis = targetObj && basisObjs.some((b) => b.id === targetObj.id);
      if (isTargetInBasis && window.App && typeof App.showToast === "function") {
        App.showToast("Lưu ý: Vector đích x nằm trong hệ cơ sở B. Tọa độ là vector đơn vị chuẩn (hình bình hành suy biến thành đoạn thẳng).", "info");
      }

      computeAndPrepareCoordSolution(targetObj, basisObjs);
    };

    if (btnCalc) {
      const newBtnCalc = btnCalc.cloneNode(true);
      if (btnCalc.parentNode) btnCalc.parentNode.replaceChild(newBtnCalc, btnCalc);
      newBtnCalc.addEventListener("click", App.coordinatesUI);
    }

    // --- 2. XỬ LÝ NÚT "TRỰC QUAN HÓA" ---
    if (btnAnimate) {
      const newBtnAnimate = btnAnimate.cloneNode(true);
      if (btnAnimate.parentNode) btnAnimate.parentNode.replaceChild(newBtnAnimate, btnAnimate);
      newBtnAnimate.addEventListener("click", () => {
        App.ensureCoordAnimControls();
        const wrap = $("coordAnimControls");

        // Nếu hộp trực quan đang mở hoặc hoạt cảnh đang chạy: bấm nút Trực quan sẽ dừng và tắt (Toggle)
        const isBoxOpen = wrap && wrap.style.display !== "none" && wrap.style.display !== "";
        if (isBoxOpen || window.App?.CoordAnimator?.isActive?.()) {
          App.stopCoordAnimation();
          return;
        }

        const data = getSelectedCoordData();
        if (!data) return;
        const { targetObj, basisObjs } = data;

        if (!targetObj) {
          if (window.App && window.App.showToast) window.App.showToast("Vui lòng chọn vector đích (x)!", "warning");
          return;
        }
        if (basisObjs.length < 2) {
          if (window.App && window.App.showToast) window.App.showToast("Vui lòng chọn ít nhất 2 vector cho hệ cơ sở (B)!", "warning");
          return;
        }

        // Tự động xuất kết quả tọa độ ra khung kết quả nếu chưa bấm Xuất tọa độ trước đó
        const sol = computeAndPrepareCoordSolution(targetObj, basisObjs);
        if (!sol || !sol.solvable) return;

        if (window.App && App.CoordAnimator) {
          // Dừng hoạt cảnh cơ sở nếu đang chạy
          if (typeof App.stopBasisAnimation === "function") {
            App.stopBasisAnimation();
          } else if (window.App.BasisAnimator && App.BasisAnimator.isActive()) {
            App.BasisAnimator.stop();
          }

          const ok = App.CoordAnimator.start({
            targetId: targetObj.id,
            basisIds: basisObjs.map((b) => b.id)
          });

          if (ok) {
            const box = $("coordAnimControls");
            if (box) box.style.display = "flex";
          }
        }
      });
    }

    // --- 3. XỬ LÝ NÚT "LỜI GIẢI" ---
    if (btnShow) {
      const newBtnShow = btnShow.cloneNode(true);
      if (btnShow.parentNode) btnShow.parentNode.replaceChild(newBtnShow, btnShow);

      newBtnShow.addEventListener("click", () => {
        if (typeof App.openSolutionPanel !== "function") return;

        if (cachedConfig) {
          App.openSolutionPanel({ ...cachedConfig, autoOpen: true });
        } else {
          const data = getSelectedCoordData();
          if (data && data.targetObj && data.basisObjs && data.basisObjs.length >= 2) {
            const sol = computeAndPrepareCoordSolution(data.targetObj, data.basisObjs);
            if (sol && cachedConfig) {
              App.openSolutionPanel({ ...cachedConfig, autoOpen: true });
              return;
            }
          }
          App.openSolutionPanel({
            title: "Tọa độ vector",
            content1: `<div class="sol-empty">Vui lòng chọn vector đích và ít nhất 2 vector cơ sở, sau đó bấm nút <b>"Xuất tọa độ"</b>.</div>`,
            tab1Label: "Cách 1",
            showSubTabs: false,
            autoOpen: true
          });
        }
      });
    }
  }

  init();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
