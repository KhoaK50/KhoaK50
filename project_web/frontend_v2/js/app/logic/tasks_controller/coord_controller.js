// ==========================================================================
// FILE: js/app/logic/tasks_controller/coord_controller.js
// MÔ TẢ: Điều khiển bài toán Tọa độ của Vector đối với Cơ sở & Hoạt cảnh
// ==========================================================================
(function () {
  "use strict";

  window.App = window.App || {};
  let cachedConfig = null;

  function $(id) {
    return document.getElementById(id);
  }

  function getVecSym(it, fallbackIdx) {
    const fmt = App.LatexFmt;
    const rawName =
      it && typeof App.getVectorName === "function"
        ? App.getVectorName(it)
        : (it && it.name ? it.name : "v_{" + (fallbackIdx + 1) + "}");
    if (fmt && typeof fmt.normalizeVecSymbol === "function") {
      return fmt.normalizeVecSymbol(rawName, true);
    }
    return "\\mathbf{" + rawName + "}";
  }

  function getSelectedCoordData() {
    const targetSelect = $("vCoordSelect");
    if (!targetSelect) return null;
    const targetId = parseInt(targetSelect.value, 10);
    const targetObj = (App.vectorList || []).find(function (v) { return v.id === targetId; });

    const checkContainer = $("basisCoordChecklist");
    if (!checkContainer) return null;

    const checkedInputs = Array.from(
      checkContainer.querySelectorAll('input[type="checkbox"]:checked')
    );
    const basisObjs = checkedInputs
      .map(function (inp) {
        const vid = parseInt(inp.value, 10);
        return (App.vectorList || []).find(function (v) { return v.id === vid; });
      })
      .filter(Boolean);

    return { targetObj: targetObj || null, basisObjs: basisObjs };
  }

  function getCoordSignature() {
    if (!window.App || !App.SolutionSync) return "";
    const data = getSelectedCoordData();
    if (!data || !data.targetObj || !data.basisObjs || data.basisObjs.length === 0) {
      return "incomplete";
    }
    return (
      "target(" + App.SolutionSync.vectorItemsSig([data.targetObj]) + ")||basis(" +
      App.SolutionSync.checklistSig("basisCoordChecklist") + ")"
    );
  }

  function renderCoordResultBox(targetObj, basisObjs, sol) {
    const resBox = $("result_coord");
    if (!resBox || !targetObj || !basisObjs || !basisObjs.length) return;

    const fmt = App.LatexFmt;

    if (!sol || !sol.solvable) {
      const errMsg = (sol && sol.error ? sol.error : "Hệ vector cơ sở phụ thuộc tuyến tính (det = 0).") +
        '<div style="margin-top: 5px; font-size: 11.5px; color: var(--text-muted);">Bấm <b>Lời giải</b> để xem chứng minh chi tiết bằng khử Gauss - Jordan.</div>';
      if (App.ResultCard && typeof App.ResultCard.mountError === "function") {
        App.ResultCard.mountError(resBox, errMsg, "Không xác định được tọa độ duy nhất");
      } else {
        resBox.innerHTML = errMsg;
      }
      return;
    }

    const targetSym = getVecSym(targetObj, 0);
    const basisSyms = basisObjs.map(function (b, idx) {
      return getVecSym(b, idx);
    });
    const coeffs = sol.coeffs || [];
    const coeffsTex = coeffs.map(function (c) {
      return fmt && typeof fmt.scalarToLatex === "function" ? fmt.scalarToLatex(c) : String(c);
    });
    const tupleLatex = "\\left(" + coeffsTex.join(",\\; ") + "\\right)^T";
    const comboLatex = fmt && typeof fmt.linearCombLatex === "function"
      ? fmt.linearCombLatex(coeffs, basisSyms, { keepZeros: false, zeroFallback: "\\mathbf{0}" })
      : coeffsTex.map(function (c, i) { return c + basisSyms[i]; }).join(" + ");

    if (App.ResultCard && typeof App.ResultCard.mount === "function") {
      App.ResultCard.mount(resBox, {
        titleLeft: "Tọa độ đối với cơ sở B (" + basisObjs.length + " vector)",
        badgeRightLatex: "\\mathbb{R}^{" + targetObj.vec.length + "}",
        badgeTone: "primary",
        primaryRows: [
          {
            latex: "\\left[" + targetSym + "\\right]_{B} = " + tupleLatex
          }
        ],
        secondarySection: {
          titleHtml: "Khai triển tổ hợp tuyến tính",
          rows: [
            {
              latex: targetSym + " = " + comboLatex
            }
          ]
        },
        footerHintHtml: "Bấm <b>Trực quan</b> để xem hoạt cảnh đổi lưới tọa độ hoặc <b>Lời giải</b> để xem hệ phương trình và ma trận chuyển cơ sở."
      });
    }
  }

  // Đồng bộ trực tiếp ô kết quả khi người dùng kéo thả vector trong lúc bật Trực quan
  App.onCoordLiveUpdate = function (targetObj, basisObjs, sol) {
    const resBox = $("result_coord");
    if (resBox && resBox.innerHTML.trim() !== "") {
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

    wrap.innerHTML =
      '<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">' +
        '<span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted, #64748b);">Trực quan hóa tọa độ</span>' +
        '<div style="display: flex; align-items: center; gap: 6px;">' +
          '<span class="basis-step-pill" id="coordStepCounter">Bước 1 / 4</span>' +
          '<button type="button" id="btnCoordCloseAnim" class="basis-anim-close-btn" title="Đóng trực quan" style="background: transparent; border: none; cursor: pointer; color: var(--text-muted, #64748b); font-size: 13px; padding: 2px; display: inline-flex; align-items: center; justify-content: center; border-radius: 2px;">' +
            '<i class="ph ph-x"></i>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="coord-phase-pills" id="coordPhasePills">' +
        '<button type="button" class="coord-phase-btn active" data-phase="0" title="Bước 1: Thiết lập vector đơn vị mới của không gian B">Bước 1</button>' +
        '<button type="button" class="coord-phase-btn" data-phase="1" title="Bước 2: Dệt lưới không gian mới từ cơ sở B">Bước 2</button>' +
        '<button type="button" class="coord-phase-btn" data-phase="2" title="Bước 3: Biến đổi không gian - Đưa cơ sở B về trục đơn vị">Bước 3</button>' +
        '<button type="button" class="coord-phase-btn" data-phase="3" title="Bước 4: Đọc tọa độ mới của vector trong không gian mới">Bước 4</button>' +
      '</div>' +
      '<div class="basis-anim-btn-row">' +
        '<button type="button" id="btnCoordPrev" class="basis-ctrl-btn" title="Bước trước"><i class="ph ph-skip-back"></i></button>' +
        '<button type="button" id="btnCoordPlay" class="basis-ctrl-btn primary" title="Phát / Tạm dừng"><i class="ph ph-play" id="iconCoordPlay"></i></button>' +
        '<button type="button" id="btnCoordNext" class="basis-ctrl-btn" title="Bước tiếp"><i class="ph ph-skip-forward"></i></button>' +
        '<button type="button" id="btnCoordReplay" class="basis-ctrl-btn" title="Phát lại từ đầu"><i class="ph ph-arrow-counter-clockwise"></i></button>' +
      '</div>' +
      '<div class="hud-menu-slider-row basis-speed-slider-wrap" style="padding: 6px 0 2px; margin-top: 6px; border-top: 1px dashed var(--border-subtle, var(--border, #e2e8f0));">' +
        '<div class="hud-menu-slider-header" style="font-size: 11.5px; margin-bottom: 2px;">' +
          '<span class="hud-menu-item-text" style="color: var(--text-muted, #64748b); font-weight: 600;">Tốc độ phát</span>' +
          '<span class="hud-menu-slider-val" id="coordSpeedValue">1.0x</span>' +
        '</div>' +
        '<input type="range" id="coordSpeedSlider" min="0.2" max="2.5" step="0.1" value="1.0" class="hud-range-slider" />' +
      '</div>' +
      '<div class="basis-step-explainer" id="coordStepExplainer">' +
        '<div class="basis-step-title" id="coordStepTitle">Khảo sát tọa độ</div>' +
        '<div class="basis-step-desc" id="coordStepDesc">Bấm nút Trực quan để khởi chạy hoạt cảnh.</div>' +
      '</div>';

    if (out.nextSibling) {
      host.insertBefore(wrap, out.nextSibling);
    } else {
      host.appendChild(wrap);
    }

    const speedSlider = wrap.querySelector("#coordSpeedSlider");
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
        const valLabel = wrap.querySelector("#coordSpeedValue");
        if (valLabel) valLabel.textContent = val.toFixed(1) + "x";
      });
      syncSliderPct(1.0);
    }

    const phaseBtns = wrap.querySelectorAll(".coord-phase-btn");
    phaseBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const ph = parseInt(btn.dataset.phase, 10);
        if (window.App && App.CoordAnimator && typeof App.CoordAnimator.goToPhase === "function") {
          App.CoordAnimator.goToPhase(ph);
        }
      });
    });

    const btnClose = wrap.querySelector("#btnCoordCloseAnim");
    if (btnClose) {
      btnClose.addEventListener("click", function () {
        App.stopCoordAnimation();
      });
    }

    if (window.App && App.CoordAnimator && typeof App.CoordAnimator.bindSidebarControls === "function") {
      App.CoordAnimator.bindSidebarControls();
    }
  };

  App.stopCoordAnimation = function () {
    if (window.App && App.CoordAnimator && typeof App.CoordAnimator.stop === "function") {
      App.CoordAnimator.stop();
    }
    const wrap = $("coordAnimControls");
    if (wrap) wrap.style.display = "none";
  };

  function extractRawLatexOrVec(obj) {
    if (obj && obj.latex) {
      const s = obj.latex.replace(/^\\left\[|^\[|\\right\]|\]$/g, "");
      return s.split(",").map(function (x) { return x.trim(); });
    }
    return obj && Array.isArray(obj.vec) ? obj.vec.slice() : [];
  }

  function computeAndPrepareCoordSolution(targetObj, basisObjs, opts) {
    const options = opts || {};
    const n = targetObj.vec.length;
    if (basisObjs.some(function (b) { return b.vec.length !== n; })) {
      if (!options.silentToast && window.App && typeof window.App.showToast === "function") {
        window.App.showToast("Tất cả vector được chọn phải có cùng số chiều " + n + ".", "warning");
      }
      return null;
    }

    const basisVecs = basisObjs.map(function (v) { return v.vec; });
    const targetVec = targetObj.vec;
    const basisLatex = basisObjs.map(extractRawLatexOrVec);
    const targetLatex = extractRawLatexOrVec(targetObj);

    const gen = App.TasksGen && App.TasksGen.Coord;
    const exactAnalysis = gen && typeof gen.analyzeCoordinates === "function"
      ? gen.analyzeCoordinates(basisVecs, targetVec)
      : null;

    let sol = null;
    if (exactAnalysis) {
      sol = {
        solvable: exactAnalysis.solvable,
        coeffs: exactAnalysis.coeffs || [],
        error: exactAnalysis.error || ""
      };
    } else if (typeof App.solveCoordinates === "function") {
      sol = App.solveCoordinates(targetVec, basisObjs);
    }

    renderCoordResultBox(targetObj, basisObjs, sol);

    if (gen) {
      const symOpts = {
        basisSymbols: basisObjs.map(function (b, idx) {
          return typeof App.getVectorName === "function" ? App.getVectorName(b) : ("u_{" + (idx + 1) + "}");
        }),
        targetSymbol: typeof App.getVectorName === "function" ? App.getVectorName(targetObj) : "x"
      };

      const content1 = gen.buildMethod1(basisVecs, targetVec, basisLatex, targetLatex, symOpts);
      const content2 = gen.buildMethod2(basisVecs, targetVec, basisLatex, targetLatex, symOpts);

      cachedConfig = {
        title: "Tọa độ của vector theo cơ sở",
        math: "\\mathbb{R}^{" + n + "}",
        tab1Label: "Cách 1: Lập hệ phương trình",
        tab2Label: "Cách 2: Ma trận chuyển cơ sở",
        showSubTabs: false,
        content1: content1,
        content2: content2,
        autoOpen: false
      };

      if (App.SolutionSync && typeof App.SolutionSync.save === "function") {
        App.SolutionSync.save("coordinates", getCoordSignature(), cachedConfig);
      }

      if (typeof App.openSolutionPanel === "function") {
        App.openSolutionPanel(Object.assign({}, cachedConfig, { autoOpen: false }));
      }
    }

    if (!sol || !sol.solvable) {
      if (!options.silentToast && window.App && typeof window.App.showToast === "function") {
        window.App.showToast(sol && sol.error ? sol.error : "Hệ vector cơ sở phụ thuộc tuyến tính.", "warning");
      }
      return sol;
    }

    if (!options.silentLog && window.App && window.App.PaperLogger && typeof window.App.PaperLogger.log === "function") {
      try {
        const fmt = App.LatexFmt;
        const targetSym = getVecSym(targetObj, 0);
        const coeffsTex = sol.coeffs.map(function (c) {
          return fmt && typeof fmt.scalarToLatex === "function" ? fmt.scalarToLatex(c) : String(c);
        });
        const ltx = "\\left[" + targetSym + "\\right]_{B} = \\left(" + coeffsTex.join(",\\; ") + "\\right)^T";
        const animData = {
          type: "coord",
          targetId: targetObj.id,
          basisIds: basisObjs.map(function (b) { return b.id; })
        };
        App.PaperLogger.log("Tọa độ của Vector đối với Cơ sở", ltx, "", cachedConfig, animData);
      } catch (_) {}
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
      vCoordSelect.addEventListener("change", function () {
        App._lastCoordAnimData = null;
        if (typeof App.stopCoordAnimation === "function" && window.App && App.CoordAnimator && typeof App.CoordAnimator.isActive === "function" && App.CoordAnimator.isActive()) {
          try { App.stopCoordAnimation(); } catch (_) {}
        }

        const targetId = parseInt(vCoordSelect.value, 10);
        const checkContainer = $("basisCoordChecklist");
        if (!checkContainer) return;

        const targetCb = checkContainer.querySelector('input[type="checkbox"][value="' + targetId + '"]');
        if (targetCb && targetCb.checked) {
          targetCb.checked = false;
          targetCb.dispatchEvent(new Event("change", { bubbles: true }));
          if (window.App && typeof App.showToast === "function") {
            App.showToast("Đã tự động bỏ chọn vector đích khỏi hệ cơ sở để quan sát hình bình hành không suy biến.", "info");
          }
        }
      });
    }

    App.coordinatesUI = function (opts) {
      const options = opts && typeof opts === "object" && !("target" in opts) ? opts : {};
      const data = getSelectedCoordData();
      if (!data) return null;
      const targetObj = data.targetObj;
      const basisObjs = data.basisObjs;

      if (!targetObj) {
        if (!options.silentToast && window.App && typeof window.App.showToast === "function") {
          window.App.showToast("Vui lòng chọn vector đích cần tìm tọa độ.", "warning");
        }
        return null;
      }
      if (!basisObjs || basisObjs.length < 1) {
        if (!options.silentToast && window.App && typeof window.App.showToast === "function") {
          window.App.showToast("Vui lòng tick chọn các vector cho hệ cơ sở B.", "warning");
        }
        return null;
      }

      const isTargetInBasis = targetObj && basisObjs.some(function (b) { return b.id === targetObj.id; });
      if (!options.silentToast && isTargetInBasis && window.App && typeof App.showToast === "function") {
        App.showToast("Lưu ý: Vector đích nằm ngay trong hệ cơ sở B nên tọa độ là vector đơn vị chuẩn.", "info");
      }

      return computeAndPrepareCoordSolution(targetObj, basisObjs, options);
    };

    if (btnCalc) {
      const newBtnCalc = btnCalc.cloneNode(true);
      if (btnCalc.parentNode) btnCalc.parentNode.replaceChild(newBtnCalc, btnCalc);
      newBtnCalc.addEventListener("click", function () {
        App.coordinatesUI();
      });
    }

    if (btnAnimate) {
      const newBtnAnimate = btnAnimate.cloneNode(true);
      if (btnAnimate.parentNode) btnAnimate.parentNode.replaceChild(newBtnAnimate, btnAnimate);
      newBtnAnimate.addEventListener("click", function () {
        App.ensureCoordAnimControls();
        const wrap = $("coordAnimControls");

        const isBoxOpen = wrap && wrap.style.display !== "none" && wrap.style.display !== "";
        if (isBoxOpen || (window.App && App.CoordAnimator && typeof App.CoordAnimator.isActive === "function" && App.CoordAnimator.isActive())) {
          App.stopCoordAnimation();
          return;
        }

        const data = getSelectedCoordData();
        if (!data) return;
        const targetObj = data.targetObj;
        const basisObjs = data.basisObjs;

        if (!targetObj) {
          if (window.App && typeof window.App.showToast === "function") {
            window.App.showToast("Vui lòng chọn vector đích cần trực quan tọa độ.", "warning");
          }
          return;
        }
        if (basisObjs.length < 2 || basisObjs.length > 3) {
          if (window.App && typeof window.App.showToast === "function") {
            window.App.showToast("Hoạt cảnh đổi lưới không gian yêu cầu chọn 2 vector cơ sở (2D) hoặc 3 vector cơ sở (3D).", "warning");
          }
          return;
        }

        const sol = computeAndPrepareCoordSolution(targetObj, basisObjs);
        if (!sol || !sol.solvable) return;

        if (window.App && App.CoordAnimator) {
          if (typeof App.stopBasisAnimation === "function") {
            App.stopBasisAnimation();
          } else if (window.App.BasisAnimator && typeof App.BasisAnimator.isActive === "function" && App.BasisAnimator.isActive()) {
            App.BasisAnimator.stop();
          }

          const ok = App.CoordAnimator.start({
            targetId: targetObj.id,
            basisIds: basisObjs.map(function (b) { return b.id; })
          });

          if (ok) {
            const box = $("coordAnimControls");
            if (box) box.style.display = "flex";
          }
        }
      });
    }

    if (btnShow) {
      const newBtnShow = btnShow.cloneNode(true);
      newBtnShow.dataset.syncManaged = "1";
      if (btnShow.parentNode) btnShow.parentNode.replaceChild(newBtnShow, btnShow);

      newBtnShow.addEventListener("click", function () {
        if (App.SolutionSync && typeof App.SolutionSync.openWithSync === "function") {
          App.SolutionSync.openWithSync({
            key: "coordinates",
            getSig: getCoordSignature,
            recomputeStatic: function () {
              return App.coordinatesUI({ silentToast: true, silentLog: true });
            },
            emptyTitle: "Tọa độ của vector theo cơ sở",
            emptyMath: "\\mathbb{R}^n",
            emptyHintHtml: "Vui lòng chọn 1 vector đích và tick chọn các vector của hệ cơ sở B để xem lời giải từng bước."
          });
          return;
        }
        if (cachedConfig && typeof App.openSolutionPanel === "function") {
          App.openSolutionPanel(Object.assign({}, cachedConfig, { autoOpen: true }));
        }
      });
    }
  }

  init();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
