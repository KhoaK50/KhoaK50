// ===================== basis_controller.js (FULL - USER VERSION PRESERVED) =====================
(function () {
  window.App = window.App || {};

  function $(id) { return document.getElementById(id); }

  // [LOGIC] Lấy ID theo thứ tự DOM (thứ tự người dùng nhìn thấy trên màn hình)
  // Khi người dùng kéo thả, DOM thay đổi, hàm này sẽ lấy đúng thứ tự mới.
  function getCheckedIds(container) {
    if (!container) return [];
    // querySelectorAll trả về NodeList theo thứ tự từ trên xuống dưới trong HTML
    const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'));
    return checkboxes.map(cb => {
      const raw = (cb.value !== undefined && cb.value !== "") ? cb.value : cb.getAttribute("data-id");
      const id = Number(raw);
      return Number.isFinite(id) ? id : null;
    }).filter(id => id !== null);
  }

  // =========================
  // A) SNAPSHOT / RESTORE
  // =========================
  function snapshotVectorList(list) {
    return (list || []).map(v => ({
      id: v.id,
      visible: (v.visible !== false),
      focus: !!v.focus,
      alpha: (typeof v.alpha === "number") ? v.alpha : 1,
      colorCss: v.colorCss,
      colorHex: v.colorHex,
      haloCss: v.haloCss,
      highlighted: !!v.highlighted
    }));
  }

  function restoreSnapshot(list, snap) {
    if (!Array.isArray(list)) return;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i] && list[i]._basisTemp) list.splice(i, 1);
    }
    const byId = new Map((snap || []).map(s => [s.id, s]));
    for (const it of list) {
      const s = byId.get(it.id);
      if (!s) continue;
      it.visible = s.visible;
      it.focus = s.focus;
      it.alpha = s.alpha;
      it.colorCss = s.colorCss;
      it.colorHex = s.colorHex;
      it.haloCss = s.haloCss;
      it.highlighted = s.highlighted;
    }
    if (typeof App.renderVectorList === "function") App.renderVectorList();
    if (App.mode === "2D" && window.Vec2D) Vec2D.draw2DAllVectors();
    else if (window.Vec3D) Vec3D.hardRefresh3D(false);
  }

  App._basisBaselineSnapshot = null;
  App._basisModeActive = false;

  App.restoreBasisPreState = function () {
    if (typeof App.stopBasisAnimation === "function") {
      try { App.stopBasisAnimation(); } catch (_) { }
    }
    App._basisAnimActive = false;
    (App.vectorList || []).forEach((it) => {
      if (!it) return;
      delete it._basisIsBasis;
    });
    if (App._basisBaselineSnapshot) {
      restoreSnapshot(App.vectorList, App._basisBaselineSnapshot);
    }
    if (App._basisTempByKey && typeof App._basisTempByKey.clear === "function") {
      App._basisTempByKey.clear();
    }
    App._basisTempByKey = null;
    App._basisModeActive = false;
    App._basisBaselineSnapshot = null;
  };

  // =========================
  // B) ANIMATION CONTROLS (TÙY CHỈNH THỜI LƯỢNG SÓNG LAN TỎA)
  // =========================
  App.basisWaveDurationMs = 3500; // 3.5s mặc định: lan tỏa như sóng biển êm đềm

  App.ensureBasisAnimControls = function () {
    const checklist = $("basisChecklist");
    const out = $("result_basis");
    if (!checklist || !out) return;
    if ($("basisAnimControls")) return;

    const host = out.parentElement || checklist.parentElement;
    if (!host) return;

    const wrap = document.createElement("div");
    wrap.id = "basisAnimControls";
    wrap.className = "basis-anim-controls";
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.gap = "8px";
    wrap.style.margin = "10px 0 8px";
    wrap.style.padding = "10px 12px";
    wrap.style.borderRadius = "8px";
    wrap.style.background = "var(--card)";
    wrap.style.border = "1px solid var(--border)";

    const row1 = document.createElement("div");
    row1.style.display = "flex";
    row1.style.alignItems = "baseline";
    row1.style.justifyContent = "space-between";
    row1.style.gap = "10px";

    const lbl = document.createElement("div");
    lbl.style.fontSize = "12.5px";
    lbl.style.fontWeight = "600";
    lbl.textContent = "Thời lượng sóng lan tỏa:";

    const val = document.createElement("div");
    val.id = "basisSpeedVal";
    val.style.fontSize = "12.5px";
    val.style.fontWeight = "700";
    val.style.color = "var(--primary, #10b981)";
    val.textContent = `${(App.basisWaveDurationMs / 1000).toFixed(1)}s`;

    row1.appendChild(lbl);
    row1.appendChild(val);

    const range = document.createElement("input");
    range.type = "range";
    range.id = "basisSpeedRange";
    range.min = "1.5";
    range.max = "6.0";
    range.step = "0.5";
    range.value = String(App.basisWaveDurationMs / 1000);
    range.style.width = "100%";
    range.style.cursor = "pointer";

    range.addEventListener("input", () => {
      const sec = parseFloat(range.value) || 3.5;
      App.basisWaveDurationMs = Math.round(sec * 1000);
      val.textContent = `${sec.toFixed(1)}s`;
    });

    wrap.appendChild(row1);
    wrap.appendChild(range);

    host.insertBefore(wrap, out);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => App.ensureBasisAnimControls());
  } else {
    App.ensureBasisAnimControls();
  }

  // =========================
  // C) MAIN LOGIC: TÍNH CƠ SỞ & SỐ CHIỀU
  // =========================
  App.basisAndDimUI = async function () {
    if (typeof App.handleEmptyListAction === "function") {
        if (App.handleEmptyListAction()) return;
    }

    App.ensureBasisAnimControls();

    const checklist = $("basisChecklist");
    if (!checklist) return;

    // 1. Lấy danh sách ID đã tick (theo đúng thứ tự trên màn hình)
    // Lưu ý: Nếu có Drag & Drop, DOM phải được cập nhật thì hàm này mới đúng.
    const checkedIds = getCheckedIds(checklist);
    
    // 2. Map ID sang Object Vector (Giữ nguyên thứ tự của checkedIds)
    // Code cũ của bạn đã đúng ở chỗ này, nó sẽ tạo mảng selectedItems theo thứ tự của checkedIds
    const selectedItems = checkedIds
      .map((id) => (App.vectorList || []).find((v) => v.id === id))
      .filter(Boolean);

    if (!selectedItems.length) {
      if(typeof App.showToast === 'function') App.showToast("⚠️ Hãy tick chọn ít nhất 1 vector!");
      else window.App.showToast("Tick ít nhất 1 vector.", 'warning');
      return;
    }

    if (App._basisModeActive || App._basisBaselineSnapshot) {
      App.restoreBasisPreState();
    }
    if (typeof App.clearAutoVectors === "function") {
      App.clearAutoVectors("basis");
    }

    const out = $("result_basis");
    if (out) out.innerText = "Đang tính toán...";

    App._basisBaselineSnapshot = snapshotVectorList(App.vectorList);

    if (typeof App.stopBasisAnimation === "function") {
      try { App.stopBasisAnimation(); } catch (_) { }
    }

    // Lấy dữ liệu vector thô để gửi đi
    const vecs = selectedItems.map((it) => (it.vec || []).slice());

    try {
      // [FIX] Thêm tham số pivot_strategy='basic' để báo cho backend biết:
      // "Đừng có tự ý đổi chỗ vector của tao!"
      const data = await App.callAPI("basis", { 
          vectors: vecs,
          pivot_strategy: "basic" 
      });

      // Gọi hàm sinh lời giải (Code cũ của bạn)
      const packMat = (App.SolutionGen && App.SolutionGen.buildBasisByMatrix) 
        ? App.SolutionGen.buildBasisByMatrix(selectedItems, data) : null;
      
      const packEqGeneral = (App.SolutionGen && App.SolutionGen.buildBasisByEquationsGeneral) 
        ? App.SolutionGen.buildBasisByEquationsGeneral(selectedItems, data) : null;
      
      const packEqStep = (App.SolutionGen && App.SolutionGen.buildBasisByEquationsStepwise) 
        ? App.SolutionGen.buildBasisByEquationsStepwise(selectedItems, data) : null;

      const basis = Array.isArray(packMat?.basisVectors) 
        ? packMat.basisVectors : (Array.isArray(data?.basis) ? data.basis : []);
      
      const dim = (typeof packMat?.dimension === "number") 
        ? packMat.dimension : ((typeof data?.dimension === "number") ? data.dimension : null);

      const basisStr = basis.length
        ? basis.map((v) => (typeof App.formatVectorShort === "function") ? App.formatVectorShort(v) : JSON.stringify(v)).join("\n")
        : "(rỗng)";

      const explanationText =
        `Số chiều dim(V) = ${dim ?? "?"}\n` +
        "Cơ sở gồm:\n" + basisStr + "\n\n" +
        '👉 Bấm "Lời giải" để xem chi tiết.';

      let dependentIds = [];
      if (Array.isArray(data?.dependents) && data.dependents.length) {
        // data.dependents trả về index trong mảng gửi đi -> map lại ID gốc
        dependentIds = data.dependents
          .map((idx) => selectedItems[idx])
          .filter(Boolean)
          .map((it) => it.id);
      }

      if (typeof App.playBasisSolution === "function") {
        await App.playBasisSolution(explanationText);
      } else if (out) {
        out.innerText = explanationText;
      }

      // Truyền dữ liệu HTML sang Panel
      if (typeof App.setBasisSolutionForPanel === "function") {
        App.setBasisSolutionForPanel({
          titleText: packMat?.titleText || "Cơ sở & số chiều",
          titleMath: packMat?.titleMath || "\\( \\mathbb{R}^n \\)",
          // Gói dữ liệu cấu trúc mới
          allSolutions: {
              mat: packMat?.htmlContent || "",
              general: packEqGeneral?.htmlContent || "",
              step: packEqStep?.htmlContent || ""
          }
        });
        
        const btnSol = $("btnOpenSolution");
        if(btnSol) btnSol.style.display = "inline-block";
      }

      if (typeof App.addAutoVector === "function" && Array.isArray(basis) && basis.length) {
        basis.forEach((v) => App.addAutoVector(v, "basis"));
      }

      App._basisModeActive = true;

      if (typeof App.startBasisAnimation === "function") {
        App.startBasisAnimation({
          selectedIds: checkedIds,
          dependentIds: dependentIds,
          basisVectors: basis,
          phaseMs: App.basisAnimPhaseMs
        });
      }

    } catch (err) {
      if (out) out.innerText = "Lỗi: " + err.message;
      if(typeof App.showToast === 'function') App.showToast(err.message);
    }
  };

  // --- INIT ---
  document.addEventListener("DOMContentLoaded", () => {
      const btn = $("btnBasis") || $("btnCalcBasis");
      if(btn) {
          const newBtn = btn.cloneNode(true);
          if(btn.parentNode) btn.parentNode.replaceChild(newBtn, btn);
          newBtn.addEventListener("click", App.basisAndDimUI);
      }
  });

})();