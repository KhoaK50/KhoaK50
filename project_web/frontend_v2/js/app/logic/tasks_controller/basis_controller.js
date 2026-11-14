// ===================== basis_controller.js (UNIFIED SIDEBAR & SYNC ENGINE) =====================
(function () {
  "use strict";

  window.App = window.App || {};
  let cachedConfig = null;

  function $(id) {
    return document.getElementById(id);
  }

  function getCheckedIds(container) {
    if (!container) return [];
    const checkboxes = Array.from(
      container.querySelectorAll('input[type="checkbox"]:checked')
    );
    return checkboxes
      .map(function (cb) {
        const raw =
          cb.value !== undefined && cb.value !== ""
            ? cb.value
            : cb.getAttribute("data-id");
        const id = Number(raw);
        return Number.isFinite(id) ? id : null;
      })
      .filter(function (id) {
        return id !== null;
      });
  }

  function getBasisSignature() {
    if (window.App && App.SolutionSync && typeof App.SolutionSync.checklistSig === "function") {
      return App.SolutionSync.checklistSig("basisChecklist");
    }
    return "";
  }

  function getVecSym(it, fallbackIdx, fmt) {
    const rawName =
      it && typeof App.getVectorName === "function"
        ? App.getVectorName(it)
        : (it && it.name ? it.name : "v_{" + (fallbackIdx + 1) + "}");
    if (fmt && typeof fmt.normalizeVecSymbol === "function") {
      return fmt.normalizeVecSymbol(rawName, true);
    }
    return "\\mathbf{" + rawName + "}";
  }

  function formatItemTupleLatex(it, fmt) {
    if (it && it.isParametric && Array.isArray(it.rawExprs) && it.rawExprs.length > 0) {
      const parts = it.rawExprs.map(function (e) {
        return typeof App.exprToLatex === "function" ? App.exprToLatex(e) : String(e);
      });
      return "\\left(" + parts.join(",\\; ") + "\\right)";
    }
    const v = (it && Array.isArray(it.vec)) ? it.vec : [];
    if (fmt && typeof fmt.vecTupleLatex === "function") {
      return fmt.vecTupleLatex(v);
    }
    return "\\left(" + v.join(", ") + "\\right)";
  }

  function buildColumnMatrix(items, n) {
    const M = [];
    for (let r = 0; r < n; r++) {
      const row = [];
      for (let c = 0; c < items.length; c++) {
        const v = items[c] && Array.isArray(items[c].vec) ? items[c].vec : [];
        row.push(Number(v[r] || 0));
      }
      M.push(row);
    }
    return M;
  }

  // =========================
  // A) SNAPSHOT / RESTORE
  // =========================
  function snapshotVectorList(list) {
    return (list || []).map(function (v) {
      return {
        id: v.id,
        visible: v.visible !== false,
        focus: !!v.focus,
        alpha: typeof v.alpha === "number" ? v.alpha : 1,
        colorCss: v.colorCss,
        colorHex: v.colorHex,
        haloCss: v.haloCss,
        highlighted: !!v.highlighted
      };
    });
  }

  function restoreSnapshot(list, snap) {
    if (!Array.isArray(list)) return;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i] && list[i]._basisTemp) list.splice(i, 1);
    }
    const byId = new Map((snap || []).map(function (s) { return [s.id, s]; }));
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
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
    if (typeof App.renderVectorList === "function") App.renderVectorList(false);
    if (App.mode === "2D" && window.Vec2D) Vec2D.draw2DAllVectors();
    else if (window.Vec3D) Vec3D.hardRefresh3D(false);
  }

  App._basisBaselineSnapshot = null;
  App._basisModeActive = false;

  App.restoreBasisPreState = function () {
    if (window.App && App.BasisAnimator && typeof App.BasisAnimator.stop === "function") {
      try { App.BasisAnimator.stop(); } catch (_) {}
    }
    App._basisAnimActive = false;
    (App.vectorList || []).forEach(function (it) {
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
  // B) ANIMATION CONTROLS (SIDEBAR)
  // =========================
  App.ensureBasisAnimControls = function () {
    const checklist = $("basisChecklist");
    const out = $("result_basis");
    if (!checklist || !out) return;
    if ($("basisAnimControls")) return;

    const host = out.parentElement || checklist.parentElement;
    if (!host) return;

    const wrap = document.createElement("div");
    wrap.id = "basisAnimControls";
    wrap.className = "basis-sidebar-anim-box";

    wrap.innerHTML =
      '<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">' +
        '<span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted, #64748b);">Trực quan hóa không gian</span>' +
        '<div style="display: flex; align-items: center; gap: 6px;">' +
          '<span class="basis-step-pill" id="basisStepCounter">Bước 1 / 3</span>' +
          '<button type="button" id="btnBasisCloseAnim" class="basis-anim-close-btn" title="Đóng trực quan" style="background: transparent; border: none; cursor: pointer; color: var(--text-muted, #64748b); font-size: 13px; padding: 2px; display: inline-flex; align-items: center; justify-content: center; border-radius: 2px;">' +
            '<i class="ph ph-x"></i>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="coord-phase-pills basis-step-pills" id="basisStepPills"></div>' +
      '<div class="basis-anim-btn-row">' +
        '<button type="button" id="btnBasisPrev" class="basis-ctrl-btn" title="Bước trước"><i class="ph ph-skip-back"></i></button>' +
        '<button type="button" id="btnBasisPlay" class="basis-ctrl-btn primary" title="Phát / Tạm dừng"><i class="ph ph-play" id="iconBasisPlay"></i></button>' +
        '<button type="button" id="btnBasisNext" class="basis-ctrl-btn" title="Bước tiếp"><i class="ph ph-skip-forward"></i></button>' +
        '<button type="button" id="btnBasisReplay" class="basis-ctrl-btn" title="Phát lại từ đầu"><i class="ph ph-arrow-counter-clockwise"></i></button>' +
      '</div>' +
      '<div class="hud-menu-slider-row basis-speed-slider-wrap" style="padding: 6px 0 2px; margin-top: 6px; border-top: 1px dashed var(--border-subtle, var(--border, #e2e8f0));">' +
        '<div class="hud-menu-slider-header" style="font-size: 11.5px; margin-bottom: 2px;">' +
          '<span class="hud-menu-item-text" style="color: var(--text-muted, #64748b); font-weight: 600;">Tốc độ phát</span>' +
          '<span class="hud-menu-slider-val" id="basisSpeedValue">1.0x</span>' +
        '</div>' +
        '<input type="range" id="basisSpeedSlider" min="0.2" max="2.5" step="0.1" value="1.0" class="hud-range-slider" />' +
      '</div>' +
      '<div class="basis-step-explainer" id="basisStepExplainer">' +
        '<div class="basis-step-title" id="basisStepTitle">Khảo sát hệ vector</div>' +
        '<div class="basis-step-desc" id="basisStepDesc">Bấm nút Trực quan để bắt đầu trực quan hóa không gian.</div>' +
      '</div>';

    wrap.style.display = "none";

    if (out.nextSibling) {
      host.insertBefore(wrap, out.nextSibling);
    } else {
      host.appendChild(wrap);
    }

    const btnClose = wrap.querySelector("#btnBasisCloseAnim");
    if (btnClose) {
      btnClose.addEventListener("click", function () {
        App.stopBasisAnimation();
      });
    }

    const speedSlider = wrap.querySelector("#basisSpeedSlider");
    const syncSliderPct = function (val) {
      if (!speedSlider) return;
      const min = parseFloat(speedSlider.min) || 0.2;
      const max = parseFloat(speedSlider.max) || 2.5;
      const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
      speedSlider.style.setProperty("--slider-pct", pct.toFixed(1) + "%");
      speedSlider.style.setProperty("--range-pct", pct.toFixed(1) + "%");
    };
    if (speedSlider) {
      speedSlider.addEventListener("input", function (e) {
        const val = parseFloat(e.target.value) || 1.0;
        syncSliderPct(val);
        const valLabel = wrap.querySelector("#basisSpeedValue");
        if (valLabel) valLabel.textContent = val.toFixed(1) + "x";
      });
      syncSliderPct(1.0);
    }
  };

  App.stopBasisAnimation = function () {
    const wrap = $("basisAnimControls");
    if (wrap) wrap.style.display = "none";

    if (window.App && App.BasisAnimator && typeof App.BasisAnimator.stop === "function") {
      try { App.BasisAnimator.stop(); } catch (_) {}
    }
    if (typeof App.restoreBasisPreState === "function") {
      try { App.restoreBasisPreState(); } catch (_) {}
    }
  };

  App.ensureBasisAnimControls();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      App.ensureBasisAnimControls();
    });
  }

  // =========================
  // C) MAIN LOGIC: TÍNH CƠ SỞ & SỐ CHIỀU
  // =========================
  App.basisAndDimUI = async function (opts) {
    const options = opts && typeof opts === "object" && !("target" in opts) ? opts : {};

    if (!options.silentWhenEmpty && typeof App.handleEmptyListAction === "function") {
      if (App.handleEmptyListAction()) return;
    }

    App.ensureBasisAnimControls();

    const checklist = $("basisChecklist");
    if (!checklist) return;

    const checkedIds = getCheckedIds(checklist);
    const selectedItems = checkedIds
      .map(function (id) {
        return (App.vectorList || []).find(function (v) { return v.id === id; });
      })
      .filter(Boolean);

    if (!selectedItems.length) {
      if (!options.silentWhenEmpty && typeof App.showToast === "function") {
        App.showToast("Vui lòng tick chọn ít nhất 1 vector để tìm cơ sở.", "warning");
      }
      return;
    }

    if (App._basisModeActive || App._basisBaselineSnapshot) {
      App.restoreBasisPreState();
    }
    if (typeof App.clearAutoVectors === "function") {
      App.clearAutoVectors("basis");
    }

    const out = $("result_basis");
    if (out) {
      out.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); padding: 6px 0;">Đang tính toán cơ sở...</div>';
    }

    App._basisBaselineSnapshot = snapshotVectorList(App.vectorList);

    if (typeof App.stopBasisAnimation === "function") {
      try { App.stopBasisAnimation(); } catch (_) {}
    }

    const vecs = selectedItems.map(function (it) {
      if (it.latex) {
        const s = it.latex.replace(/^\\left\[|^\[|\\right\]|\]$/g, "");
        return s.split(",").map(function (x) { return x.trim(); });
      }
      return (it.vec || []).slice();
    });

    try {
      const has3DVector = selectedItems.some(function (it) {
        return it.vec && it.vec.length >= 3 && Math.abs(it.vec[2] || 0) > 1e-5;
      });
      if (!options.silentWhenEmpty && has3DVector && App.mode !== "3D" && typeof App.toggleMode === "function") {
        App.toggleMode();
      }

      const nDim = (selectedItems[0] && Array.isArray(selectedItems[0].vec) && selectedItems[0].vec.length) || ((App.mode === "3D" || has3DVector) ? 3 : 2);
      const spaceDim = (App.mode === "3D" || has3DVector) ? 3 : 2;
      const basisPlan = typeof App.analyzeBasisPlan === "function"
        ? App.analyzeBasisPlan(selectedItems, spaceDim)
        : null;

      const fmt = App.LatexFmt;
      const colMat = buildColumnMatrix(selectedItems, nDim);
      const colGauss = fmt && typeof fmt.gaussRrefWithSteps === "function"
        ? fmt.gaussRrefWithSteps(colMat, { mode: "rref", rowSymbol: "d", bracket: "bmatrix" })
        : null;

      let data = null;
      try {
        data = await App.callAPI("basis", {
          vectors: vecs,
          pivot_strategy: "basic"
        });
      } catch (apiErr) {
        const fallbackDim = colGauss
          ? colGauss.rank
          : (typeof basisPlan?.finalDim === "number" ? basisPlan.finalDim : 0);
        data = {
          basis: basisPlan && Array.isArray(basisPlan.finalBasis)
            ? basisPlan.finalBasis.map(function (it) { return it.vec; })
            : [],
          dimension: fallbackDim,
          steps: []
        };
      }

      const gen = App.TasksGen && App.TasksGen.Basis;
      const packMat = gen && gen.buildBasisByMatrix ? gen.buildBasisByMatrix(selectedItems, data) : null;
      const packEqGeneral = gen && gen.buildBasisByEquationsGeneral ? gen.buildBasisByEquationsGeneral(selectedItems, data) : null;
      const packEqStep = gen && gen.buildBasisByEquationsStepwise ? gen.buildBasisByEquationsStepwise(selectedItems, data) : null;

      const pivotIndices = colGauss
        ? colGauss.pivotCols
        : (packMat && Array.isArray(packMat.pivotIndices) ? packMat.pivotIndices : []);

      const basisItems = pivotIndices.length > 0
        ? pivotIndices.map(function (idx) { return selectedItems[idx]; }).filter(Boolean)
        : (basisPlan && Array.isArray(basisPlan.finalBasis) ? basisPlan.finalBasis : []);

      const dim = colGauss
        ? colGauss.rank
        : (typeof packMat?.dimension === "number"
            ? packMat.dimension
            : (typeof data?.dimension === "number" ? data.dimension : basisItems.length));

      const pivotSet = new Set(pivotIndices);
      const dependentPairs = [];
      for (let j = 0; j < selectedItems.length; j++) {
        if (!pivotSet.has(j)) {
          dependentPairs.push({ item: selectedItems[j], colIndex: j });
        }
      }
      const dependentItems = dependentPairs.map(function (p) { return p.item; });
      const dependentIds = dependentItems.map(function (it) { return it.id; });

      const allSyms = selectedItems.map(function (it, idx) {
        return getVecSym(it, idx, fmt);
      });
      const basisSyms = pivotIndices.map(function (cIdx) {
        return allSyms[cIdx];
      });

      const primaryRows = [];
      if (basisItems.length > 0) {
        for (let k = 0; k < pivotIndices.length; k++) {
          const cIdx = pivotIndices[k];
          const it = selectedItems[cIdx];
          primaryRows.push({
            latex: allSyms[cIdx] + " = " + formatItemTupleLatex(it, fmt)
          });
        }
      } else {
        primaryRows.push({
          latex: "B = \\varnothing,\\quad V = \\left\\{\\mathbf{0}\\right\\}",
          noteHtml: "Tất cả vector được chọn đều là vector không."
        });
      }

      const secondaryRows = [];
      if (dependentPairs.length > 0) {
        for (let dIdx = 0; dIdx < dependentPairs.length; dIdx++) {
          const pair = dependentPairs[dIdx];
          const fc = pair.colIndex;
          const depSym = allSyms[fc];
          let relLatex = depSym + " = " + formatItemTupleLatex(pair.item, fmt);

          if (colGauss && pivotIndices.length > 0 && fmt && typeof fmt.linearCombLatex === "function") {
            const coeffs = [];
            for (let r = 0; r < pivotIndices.length; r++) {
              coeffs.push(Number(colGauss.rrefMatrix[r][fc] || 0));
            }
            const comb = fmt.linearCombLatex(coeffs, basisSyms, { zeroFallback: "\\mathbf{0}" });
            relLatex = depSym + " = " + comb;
          } else if (dim === 0) {
            relLatex = depSym + " = \\mathbf{0}";
          }

          secondaryRows.push({
            latex: relLatex
          });
        }
      }

      if (App.ResultCard && typeof App.ResultCard.mount === "function") {
        App.ResultCard.mount(out, {
          titleLeft: "Hệ cơ sở B (" + basisItems.length + " vector)",
          badgeRightLatex: "\\dim(V) = " + dim,
          badgeTone: dim > 0 ? "success" : "neutral",
          primaryRows: primaryRows,
          secondarySection: secondaryRows.length > 0
            ? {
                titleHtml: "Vector phụ thuộc loại khỏi cơ sở (" + secondaryRows.length + ")",
                rows: secondaryRows
              }
            : null,
          footerHintHtml: "Bấm <b>Trực quan</b> để xem hoạt cảnh không gian hoặc <b>Lời giải</b> để xem khử Gauss và hệ phương trình."
        });
      }

      App._lastBasisAnimData = {
        selectedIds: checkedIds,
        dependentIds: dependentIds,
        basisVectors: basisItems.map(function (it) { return it.vec; }),
        phaseMs: App.basisAnimPhaseMs
      };

      cachedConfig = {
        title: "Cơ sở và số chiều",
        math: "\\mathbb{R}^{" + nDim + "}",
        tab1Label: "Cách 1: Ma trận",
        tab2Label: "Cách 2: Hệ phương trình",
        showSubTabs: true,
        content1: packMat ? packMat.htmlContent : "",
        htmlHeader: packMat ? packMat.htmlHeader : "",
        htmlSteps: packMat ? packMat.htmlSteps : null,
        htmlFooter: packMat ? packMat.htmlFooter : "",
        content2: packEqGeneral ? (packEqGeneral.htmlContent || packEqGeneral.html || "") : "",
        content2Sub: packEqStep ? (packEqStep.htmlContent || packEqStep.html || "") : "",
        autoOpen: false
      };

      if (App.SolutionSync && typeof App.SolutionSync.save === "function") {
        App.SolutionSync.save("basis", getBasisSignature(), cachedConfig);
      }

      if (typeof App.openSolutionPanel === "function") {
        App.openSolutionPanel(cachedConfig);

        const btnSol = $("btnOpenSolution");
        if (btnSol) btnSol.style.display = "inline-flex";

        if (!options.silentWhenEmpty && window.App && window.App.PaperLogger && typeof window.App.PaperLogger.log === "function") {
          try {
            const ltx = "\\dim(V) = " + dim;
            const animData = {
              type: "basis",
              selectedIds: checkedIds,
              dependentIds: dependentIds,
              basisVectors: basisItems.map(function (it) { return it.vec; }),
              phaseMs: App.basisAnimPhaseMs
            };
            App.PaperLogger.log("Tìm Cơ sở và Số chiều", ltx, "", cachedConfig, animData);
          } catch (_) {}
        }
      }
    } catch (err) {
      if (App.ResultCard && typeof App.ResultCard.mountError === "function") {
        App.ResultCard.mountError(out, String(err && err.message ? err.message : err), "Không thể tính cơ sở");
      } else if (out) {
        out.innerText = "Lỗi: " + err.message;
      }
      if (typeof App.showToast === "function") App.showToast(err.message, "error");
    }
  };

  // =========================
  // D) TRỰC QUAN HÓA CƠ SỞ
  // =========================
  App.startBasisAnimateUI = async function () {
    App.ensureBasisAnimControls();
    const wrap = $("basisAnimControls");

    const isBoxOpen = wrap && wrap.style.display !== "none" && wrap.style.display !== "";
    if (isBoxOpen || (window.App && App.BasisAnimator && typeof App.BasisAnimator.isActive === "function" && App.BasisAnimator.isActive())) {
      App.stopBasisAnimation();
      return;
    }

    const currentSig = getBasisSignature();
    const synced = App.SolutionSync && App.SolutionSync.get("basis", currentSig);
    if (!App._lastBasisAnimData || !synced) {
      await App.basisAndDimUI();
    }
    if (!App._lastBasisAnimData) return;

    if (typeof App.stopCoordAnimation === "function") {
      App.stopCoordAnimation();
    } else if (window.App && App.CoordAnimator && typeof App.CoordAnimator.isActive === "function" && App.CoordAnimator.isActive()) {
      App.CoordAnimator.stop();
    }

    App._basisModeActive = true;
    if (typeof App.startBasisAnimation === "function") {
      await App.startBasisAnimation(App._lastBasisAnimData);
    }
    if (wrap) wrap.style.display = "block";
  };

  // --- INIT ---
  let _basisBtnsInitialized = false;
  function initBasisButtons() {
    if (_basisBtnsInitialized) return;
    const btnCalc = $("btnBasis") || $("btnCalcBasis");
    const btnAnimate = $("btnBasisAnimate");
    if (!btnCalc && !btnAnimate) return;
    _basisBtnsInitialized = true;

    if (btnCalc) {
      const newBtn = btnCalc.cloneNode(true);
      if (btnCalc.parentNode) btnCalc.parentNode.replaceChild(newBtn, btnCalc);
      newBtn.addEventListener("click", function () {
        App.basisAndDimUI();
      });
    }

    if (btnAnimate) {
      const newBtnAnimate = btnAnimate.cloneNode(true);
      if (btnAnimate.parentNode) btnAnimate.parentNode.replaceChild(newBtnAnimate, btnAnimate);
      newBtnAnimate.addEventListener("click", App.startBasisAnimateUI);
    }

    const btnShow = $("btnOpenSolution");
    if (btnShow) {
      btnShow.style.display = "inline-flex";
      const newBtnShow = btnShow.cloneNode(true);
      newBtnShow.dataset.syncManaged = "1";
      if (btnShow.parentNode) btnShow.parentNode.replaceChild(newBtnShow, btnShow);

      newBtnShow.addEventListener("click", function () {
        if (App.SolutionSync && typeof App.SolutionSync.openWithSync === "function") {
          App.SolutionSync.openWithSync({
            key: "basis",
            getSig: getBasisSignature,
            recomputeStatic: function () {
              return App.basisAndDimUI({ silentWhenEmpty: true });
            },
            emptyTitle: "Cơ sở và số chiều",
            emptyMath: "\\mathbb{R}^n",
            emptyHintHtml: "Vui lòng tick chọn ít nhất 1 vector trong danh sách để khảo sát cơ sở và số chiều."
          });
          return;
        }
        if (cachedConfig && typeof App.openSolutionPanel === "function") {
          App.openSolutionPanel(Object.assign({}, cachedConfig, { autoOpen: true }));
        }
      });
    }
  }

  initBasisButtons();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBasisButtons);
  }
})();
