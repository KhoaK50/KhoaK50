// ===================== basis_controller.js =====================
(function () {
  window.App = window.App || {};

  function $(id) { return document.getElementById(id); }

  function getCheckedIds(container) {
    if (!container) return [];
    const ids = [];
    container.querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => {
      const raw = (cb.value !== undefined && cb.value !== "") ? cb.value : cb.getAttribute("data-id");
      const id = Number(raw);
      if (Number.isFinite(id)) ids.push(id);
    });
    return ids;
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
  // B) SPEED CONTROL -> ms
  // =========================
  App.BASIS_PHASE_MS_MIN = 100;
  App.BASIS_PHASE_MS_MAX = 5000;
  App.BASIS_PHASE_MS_STEP = 50;

  App.basisAnimPhaseMs = 1000;

  App.setBasisAnimPhaseMs = function (ms) {
    let x = Math.round(Number(ms));
    if (!isFinite(x)) x = App.basisAnimPhaseMs;
    x = Math.max(App.BASIS_PHASE_MS_MIN, Math.min(App.BASIS_PHASE_MS_MAX, x));
    const step = Math.max(1, App.BASIS_PHASE_MS_STEP || 100);
    x = Math.round(x / step) * step;
    App.basisAnimPhaseMs = x;
    return x;
  };

  /*function estimateTotalMs(phaseMs) {
    return Math.round(phaseMs * 3.2);
  }*/

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
    wrap.style.gap = "10px";
    wrap.style.margin = "10px 0 8px";
    wrap.style.padding = "12px";
    wrap.style.borderRadius = "12px";

    const row1 = document.createElement("div");
    row1.style.display = "flex";
    row1.style.alignItems = "baseline";
    row1.style.justifyContent = "space-between";
    row1.style.gap = "10px";

    const lbl = document.createElement("div");
    lbl.style.fontSize = "13px";
    lbl.style.fontWeight = "700";
    lbl.textContent = "Thời lượng animation:";

    const val = document.createElement("div");
    val.id = "basisSpeedVal";
    val.style.fontSize = "13px";
    val.style.fontWeight = "800";
    val.textContent = `${App.basisAnimPhaseMs} ms`;

    row1.appendChild(lbl);
    row1.appendChild(val);

    const range = document.createElement("input");
    range.type = "range";
    range.id = "basisSpeedRange";
    range.min = String(App.BASIS_PHASE_MS_MIN);
    range.max = String(App.BASIS_PHASE_MS_MAX);
    range.step = String(App.BASIS_PHASE_MS_STEP);
    range.value = String(App.basisAnimPhaseMs);

    const help = document.createElement("div");
    help.id = "basisSpeedHelp";
    help.style.fontSize = "12px";
    help.style.opacity = "0.85";
    help.textContent = `Vector được tô màu đỏ là vector trong hệ sinh.\nVector được tô màu xanh lá là vector làm cơ sở.`;

    const btn = document.createElement("button");
    btn.id = "btnStopBasisAnim";
    btn.type = "button";
    btn.textContent = "Hủy animation";
    btn.className = "btn basis-anim-stop";
    btn.style.padding = "10px 12px";
    btn.style.borderRadius = "10px";
    btn.style.fontWeight = "800";
    btn.style.cursor = "pointer";
    btn.style.width = "fit-content";

    range.addEventListener("input", () => {
      const ms = App.setBasisAnimPhaseMs(range.value);
      const v = $("basisSpeedVal");
      if (v) v.textContent = `${ms} ms`;
      const h = $("basisSpeedHelp");
      if (h) h.textContent = `Chọn thời lượng 1000ms là chuẩn nhất rồi đó -_- Vector được tô màu đỏ là vector trong hệ sinh. Vector được tô màu xanh lá là vector làm cơ sở.`;
    });

    btn.addEventListener("click", () => {
      App.restoreBasisPreState();
      if (typeof App.clearAutoVectors === "function") App.clearAutoVectors("basis");
    });

    wrap.appendChild(row1);
    wrap.appendChild(range);
    wrap.appendChild(help);
    wrap.appendChild(btn);

    host.insertBefore(wrap, out);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => App.ensureBasisAnimControls());
  } else {
    App.ensureBasisAnimControls();
  }

  // =========================
  // MAIN UI
  // =========================
  App.basisAndDimUI = async function () {
    App.ensureBasisAnimControls();

    const checklist = $("basisChecklist");
    if (!checklist) return;

    const checkedIds = getCheckedIds(checklist);
    const selectedItems = checkedIds
      .map((id) => (App.vectorList || []).find((v) => v.id === id))
      .filter(Boolean);

    if (!selectedItems.length) {
      alert("Tick ít nhất 1 vector để xét cơ sở.");
      return;
    }

    // RESET RUN
    if (App._basisModeActive || App._basisBaselineSnapshot) {
      App.restoreBasisPreState();
    }
    if (typeof App.clearAutoVectors === "function") {
      App.clearAutoVectors("basis");
    }

    const out = $("result_basis");
    if (out) out.innerText = "Đang tính...";

    App._basisBaselineSnapshot = snapshotVectorList(App.vectorList);

    if (typeof App.stopBasisAnimation === "function") {
      try { App.stopBasisAnimation(); } catch (_) { }
    }

    const vecs = selectedItems.map((it) => (it.vec || []).slice());

    try {
      const base = App.API_BASE || "";
      const res = await fetch(`${base}/api/basis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vectors: vecs }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      // ===== Build 3 lời giải: (1) ma trận, (2) PT tổng quát, (3) xét từng vector =====
      const packMat = (App.SolutionGen && typeof App.SolutionGen.buildBasisByMatrix === "function")
        ? App.SolutionGen.buildBasisByMatrix(selectedItems, data)
        : null;

      const packEqGeneral = (App.SolutionGen && typeof App.SolutionGen.buildBasisByEquationsGeneral === "function")
        ? App.SolutionGen.buildBasisByEquationsGeneral(selectedItems, data)
        : null;

      const packEqStep = (App.SolutionGen && typeof App.SolutionGen.buildBasisByEquationsStepwise === "function")
        ? App.SolutionGen.buildBasisByEquationsStepwise(selectedItems, data)
        : null;

      const basis = Array.isArray(packMat?.basisVectors)
        ? packMat.basisVectors
        : (Array.isArray(data?.basis) ? data.basis : []);

      const dim = (typeof packMat?.dimension === "number")
        ? packMat.dimension
        : ((typeof data?.dimension === "number") ? data.dimension : null);

      const basisStr = basis.length
        ? basis
          .map((v) => (typeof App.formatVectorShort === "function") ? App.formatVectorShort(v) : JSON.stringify(v))
          .join("\n")
        : "(rỗng)";

      const explanationText =
        "KẾT QUẢ CƠ SỞ & SỐ CHIỀU\n\n" +
        `dim(V) = ${dim !== null ? (typeof App.formatScalar === "function" ? App.formatScalar(dim) : String(dim)) : "?"}\n` +
        "Cơ sở gồm:\n" + basisStr + "\n\n" +
        'Bấm nút "Lời giải" để xem lời giải chi tiết.';

      // dependents backend trả index theo selectedItems -> đổi sang ID
      let dependentIds = [];
      if (Array.isArray(data?.dependents) && data.dependents.length) {
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

      // ✅ set Solution Panel (đúng key)
      if (typeof App.setBasisSolutionForPanel === "function") {
        App.setBasisSolutionForPanel({
          titleText: packMat?.titleText || packEqGeneral?.titleText || packEqStep?.titleText || "Cơ sở & số chiều trong",
          titleMath: packMat?.titleMath || packEqGeneral?.titleMath || packEqStep?.titleMath || "\\( \\mathbb{R}^n \\)",

          matLatex: packMat?.matLatex || "",

          eqLatexGeneral: packEqGeneral?.eqLatexGeneral || "",
          eqLatexStep: packEqStep?.eqLatexStep || ""
        });
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
      console.error(err);
    }
  };
  // =========================
  // RANK UI
  // =========================
  document.getElementById("btnRank")?.addEventListener("click", async () => {
    const checklist = document.getElementById("rankChecklist");
    const ids = getCheckedIds(checklist);

    const vectors = ids
      .map(id => App.vectorList.find(v => v.id === id)?.vec)
      .filter(Boolean);

    if (!vectors.length) {
      alert("Tick ít nhất 1 vector.");
      return;
    }

    const out = document.getElementById("result_rank");
    out.innerText = "Đang tính...";

    try {
      const res = await App.callAPI("rank", { vectors });
      out.innerText = res.message || `Hạng = ${res.rank}`;
    } catch (e) {
      out.innerText = "Lỗi: " + e.message;
    }
  });


  // =========================
  // LINEAR INDEPENDENCE UI
  // =========================
  document.getElementById("btnIndep")?.addEventListener("click", async () => {
    const checklist = document.getElementById("indepChecklist");
    const ids = getCheckedIds(checklist);

    const vectors = ids
      .map(id => App.vectorList.find(v => v.id === id)?.vec)
      .filter(Boolean);

    if (!vectors.length) {
      alert("Tick ít nhất 1 vector.");
      return;
    }

    const out = document.getElementById("result_indep");
    out.innerText = "Đang kiểm tra...";

    try {
      const res = await App.callAPI("linear_independence", { vectors });
      out.innerText = res.message;
    } catch (e) {
      out.innerText = "Lỗi: " + e.message;
    }
  });

})();
