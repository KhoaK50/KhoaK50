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
        <button type="button" class="coord-phase-btn active" data-phase="0" title="Bước 1">Bước 1</button>
        <button type="button" class="coord-phase-btn" data-phase="1" title="Bước 2">Bước 2</button>
        <button type="button" class="coord-phase-btn" data-phase="2" title="Bước 3">Bước 3</button>
        <button type="button" class="coord-phase-btn" data-phase="3" title="Bước 4">Bước 4</button>
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
    const targetId = parseInt(targetSelect.value);
    const targetObj = (App.vectorList || []).find((v) => v.id === targetId);

    const checkContainer = $("basisCoordChecklist");
    if (!checkContainer) return null;

    const checkedInputs = Array.from(
      checkContainer.querySelectorAll('input[type="checkbox"]:checked')
    );
    const basisObjs = checkedInputs
      .map((inp) => {
        const vid = parseInt(inp.value);
        return (App.vectorList || []).find((v) => v.id === vid);
      })
      .filter(Boolean);

    return { targetObj, basisObjs };
  }

  function init() {
    App.ensureCoordAnimControls();

    const btnCalc = $("btnCoord"); // Nút "Xuất tọa độ"
    const btnAnimate = $("btnCoordAnimate"); // Nút "Trực quan"
    const btnShow = $("btnCoordSolution"); // Nút "Lời giải"

    const vCoordSelect = $("vCoordSelect");
    if (vCoordSelect && !vCoordSelect._coordBound) {
      vCoordSelect._coordBound = true;
      vCoordSelect.addEventListener("change", () => {
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
    if (btnCalc) {
      btnCalc.addEventListener("click", () => {
        const data = getSelectedCoordData();
        if (!data) return;
        const { targetObj, basisObjs } = data;

        if (!targetObj) {
          if (window.App && window.App.showToast) window.App.showToast("Vui lòng chọn vector đích (x)!", "warning");
          return;
        }
        if (basisObjs.length === 0) {
          if (window.App && window.App.showToast) window.App.showToast("Vui lòng chọn các vector cho hệ cơ sở (B)!", "warning");
          return;
        }

        const isTargetInBasis = targetObj && basisObjs.some((b) => b.id === targetObj.id);
        if (isTargetInBasis && window.App && typeof App.showToast === "function") {
          App.showToast("Lưu ý: Vector đích x nằm trong hệ cơ sở B. Tọa độ là vector đơn vị chuẩn (hình bình hành suy biến thành đoạn thẳng).", "info");
        }

        const n = targetObj.vec.length;
        if (basisObjs.some((b) => b.vec.length !== n)) {
          if (window.App && window.App.showToast) window.App.showToast(`Lỗi: Tất cả vector phải cùng số chiều ${n}!`, "warning");
          return;
        }

        function getLatex(obj) {
          if (obj.latex) {
            let s = obj.latex.replace(/^\\left\[|^\[|\\right\]|\]$/g, "");
            return s.split(",").map((x) => x.trim());
          }
          return obj.vec;
        }
        const basisLatex = basisObjs.map(getLatex);
        const targetLatex = getLatex(targetObj);

        const basisVecs = basisObjs.map((v) => v.vec);
        const targetVec = targetObj.vec;

        if (!App.TasksGen || !App.TasksGen.Coord) {
          console.error("Thiếu module App.TasksGen.Coord (coord_generator.js)");
          if (window.App && window.App.showToast) window.App.showToast("Lỗi hệ thống: Chưa nạp module sinh lời giải.", "warning");
          return;
        }

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

        const resBox = $("result_coord");
        if (resBox) {
          resBox.innerHTML = `
            <div style="font-size: 12px; line-height: 1.6; padding: 6px 10px; border-radius: 4px; background: var(--card-bg, #f8fafc); border: 1px solid var(--border);">
              <span style="color: #10b981; font-weight: 700;">✅ Đã tính toán xong tọa độ!</span><br/>
              Bấm <b>"Trực quan"</b> để xem hoạt cảnh hoặc <b>"Lời giải"</b> để xem chứng minh chi tiết.
            </div>
          `;
        }
      });
    }

    // --- 2. XỬ LÝ NÚT "TRỰC QUAN HÓA" ---
    if (btnAnimate) {
      btnAnimate.addEventListener("click", () => {
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
        if (basisObjs.length === 0) {
          if (window.App && window.App.showToast) window.App.showToast("Vui lòng chọn các vector cho hệ cơ sở (B)!", "warning");
          return;
        }

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
            const wrap = $("coordAnimControls");
            if (wrap) wrap.style.display = "flex";
          }
        } else {
          console.error("Thiếu module App.CoordAnimator (coord_animation.js)");
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
          App.openSolutionPanel({
            title: "Tọa độ vector",
            content1: `<div class="sol-empty">Vui lòng chọn vector và bấm nút <b>"Xuất tọa độ"</b> trước.</div>`,
            tab1Label: "Cách 1",
            showSubTabs: false,
            autoOpen: true
          });
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
