// ===================== solution_panel.js (UNIFIED KATEX MODAL ENGINE) =====================
(function () {
  "use strict";

  window.App = window.App || {};

  function $(id) {
    return document.getElementById(id);
  }

  let eqSubWrap = null;
  let eqBtnGeneral = null;
  let eqBtnStep = null;
  let virtualObserver = null;

  const state = {
    titleText: "Lời giải chi tiết",
    titleMath: "",
    htmlTab1: "",
    htmlTab2Main: "",
    htmlTab2Sub: "",
    htmlHeader1: "",
    htmlSteps1: null,
    htmlFooter1: "",
    active: "mat",
    eqVariant: "general",
    tab1Label: "Cách 1",
    tab2Label: "Cách 2",
    showSubTabs: false
  };

  function typesetContainer(container) {
    if (!container) return;
    if (window.App && window.App.LatexFmt && typeof window.App.LatexFmt.renderMathInContainer === "function") {
      window.App.LatexFmt.renderMathInContainer(container);
      return;
    }
    if (typeof window.renderMathInElement === "function") {
      try {
        window.renderMathInElement(container, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "\\[", right: "\\]", display: true },
            { left: "\\(", right: "\\)", display: false },
            { left: "$", right: "$", display: false }
          ],
          throwOnError: false,
          strict: false
        });
      } catch (e) {
        console.warn("[SolutionPanel] KaTeX render warning:", e);
      }
    }
  }

  function hasSecondMethod() {
    const m2 = String(state.htmlTab2Main || "").trim();
    const s2 = String(state.htmlTab2Sub || "").trim();
    return m2.length > 0 || s2.length > 0;
  }

  function hasSubTabsContent() {
    return Boolean(
      state.showSubTabs &&
      String(state.htmlTab2Main || "").trim().length > 0 &&
      String(state.htmlTab2Sub || "").trim().length > 0
    );
  }

  function setOpen(open) {
    const overlay = $("solutionOverlay");
    if (!overlay) return;
    if (open) {
      renderAll();
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
    } else {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
    }
  }

  function ensureEqSubtabs() {
    const tabEq = $("solMethodEq");
    if (!tabEq || !tabEq.parentElement) return;
    if (eqSubWrap && eqSubWrap.parentElement) return;

    eqSubWrap = document.createElement("span");
    eqSubWrap.className = "sol-subtabs";
    eqSubWrap.id = "solEqSubtabs";

    eqBtnGeneral = document.createElement("button");
    eqBtnGeneral.type = "button";
    eqBtnGeneral.className = "sol-subtab is-active";
    eqBtnGeneral.textContent = "Tổng quát";
    eqBtnGeneral.addEventListener("click", function () {
      state.eqVariant = "general";
      renderEqSubtabs();
      renderBody();
    });

    eqBtnStep = document.createElement("button");
    eqBtnStep.type = "button";
    eqBtnStep.className = "sol-subtab";
    eqBtnStep.textContent = "Xét từng vector";
    eqBtnStep.addEventListener("click", function () {
      state.eqVariant = "step";
      renderEqSubtabs();
      renderBody();
    });

    eqSubWrap.appendChild(eqBtnGeneral);
    eqSubWrap.appendChild(eqBtnStep);
    tabEq.parentElement.appendChild(eqSubWrap);
  }

  function renderTabs() {
    const overlay = $("solutionOverlay");
    const toolbar = overlay ? overlay.querySelector(".sol-toolbar") : null;
    const tabMat = $("solMethodMat");
    const tabEq = $("solMethodEq");
    const dual = hasSecondMethod();

    if (!dual) {
      state.active = "mat";
    }

    if (toolbar) {
      toolbar.classList.toggle("is-hidden", !dual);
      toolbar.style.display = dual ? "" : "none";
    }

    if (tabMat) {
      tabMat.textContent = state.tab1Label || "Cách 1";
      tabMat.classList.toggle("is-active", state.active === "mat");
    }

    if (tabEq) {
      tabEq.textContent = state.tab2Label || "Cách 2";
      tabEq.classList.toggle("is-active", state.active === "eq");
      tabEq.style.display = dual ? "" : "none";
    }
  }

  function renderEqSubtabs() {
    ensureEqSubtabs();
    if (!eqSubWrap) return;

    const show = hasSecondMethod() && state.active === "eq" && hasSubTabsContent();
    eqSubWrap.classList.toggle("is-visible", show);
    eqSubWrap.style.display = show ? "inline-flex" : "none";

    if (eqBtnGeneral) {
      eqBtnGeneral.classList.toggle("is-active", state.eqVariant === "general");
    }
    if (eqBtnStep) {
      eqBtnStep.classList.toggle("is-active", state.eqVariant === "step");
    }
  }

  function renderTitle() {
    const titleTextEl = $("solTitleText");
    const titleMathEl = $("solTitleMath");

    if (titleTextEl) {
      titleTextEl.textContent = state.titleText || "Lời giải chi tiết";
    }

    if (titleMathEl) {
      const rawMath = String(state.titleMath || "").trim();
      if (!rawMath) {
        titleMathEl.innerHTML = "";
        titleMathEl.style.display = "none";
        return;
      }
      titleMathEl.style.display = "inline-block";
      if (window.App && window.App.LatexFmt && typeof window.App.LatexFmt.renderTitleMathHtml === "function") {
        titleMathEl.innerHTML = window.App.LatexFmt.renderTitleMathHtml(rawMath);
      } else {
        titleMathEl.textContent = rawMath;
        typesetContainer(titleMathEl);
      }
    }
  }

  function renderBody() {
    const body = $("solutionBody");
    if (!body) return;
    if (virtualObserver) {
      virtualObserver.disconnect();
      virtualObserver = null;
    }

    body.scrollTop = 0;

    if (state.active === "eq" && hasSecondMethod()) {
      let content = state.eqVariant === "step" ? state.htmlTab2Sub : state.htmlTab2Main;
      if (!content && state.eqVariant === "step") content = state.htmlTab2Main;
      if (!content && state.eqVariant === "general") content = state.htmlTab2Sub;

      body.innerHTML = content || "<div class=\"sol-empty\">Chưa có lời giải cho phương pháp này.</div>";
      renderEqSubtabs();
      typesetContainer(body);
      return;
    }

    if (!Array.isArray(state.htmlSteps1) || state.htmlSteps1.length === 0) {
      body.innerHTML = state.htmlTab1 || "<div class=\"sol-empty\">Chưa có lời giải.</div>";
      typesetContainer(body);
      return;
    }

    // Virtual Recycler for multi-step Gauss proofs (100% synchronous KaTeX)
    body.innerHTML = "";

    const headerDiv = document.createElement("div");
    headerDiv.className = "sol-step-container";
    headerDiv.style.paddingBottom = "0";
    headerDiv.innerHTML = state.htmlHeader1 || "";
    body.appendChild(headerDiv);

    const rawChunks = state.htmlSteps1;
    const cachedHTML = new Array(rawChunks.length).fill(null);
    const cachedHeight = new Array(rawChunks.length).fill(120);

    const listContainer = document.createElement("div");
    listContainer.className = "sol-step-container";
    listContainer.style.paddingBottom = "0";
    body.appendChild(listContainer);

    const domNodes = [];
    for (let idx = 0; idx < rawChunks.length; idx++) {
      const wrap = document.createElement("div");
      wrap.className = "virtual-recycler-node";
      wrap.style.minHeight = cachedHeight[idx] + "px";
      wrap.dataset.idx = String(idx);
      listContainer.appendChild(wrap);
      domNodes.push(wrap);
    }

    const footerDiv = document.createElement("div");
    footerDiv.className = "sol-step-container";
    footerDiv.innerHTML = state.htmlFooter1 || "";
    body.appendChild(footerDiv);

    typesetContainer(headerDiv);
    typesetContainer(footerDiv);

    // Eagerly render the first 8 steps immediately so initial open never flashes blank placeholders
    const eagerCount = Math.min(8, domNodes.length);
    for (let idx = 0; idx < eagerCount; idx++) {
      const el = domNodes[idx];
      el.dataset.rendered = "true";
      el.innerHTML = rawChunks[idx];
      typesetContainer(el);
      cachedHTML[idx] = el.innerHTML;
      if (el.offsetHeight > 0) {
        cachedHeight[idx] = el.offsetHeight;
        el.style.minHeight = cachedHeight[idx] + "px";
      }
    }

    if (typeof IntersectionObserver === "function" && domNodes.length > eagerCount) {
      virtualObserver = new IntersectionObserver(function (entries) {
        for (let k = 0; k < entries.length; k++) {
          const entry = entries[k];
          const el = entry.target;
          const idx = parseInt(el.dataset.idx, 10);
          if (Number.isNaN(idx)) continue;

          if (entry.isIntersecting) {
            if (el.dataset.rendered !== "true") {
              el.dataset.rendered = "true";
              if (cachedHTML[idx] !== null) {
                el.innerHTML = cachedHTML[idx];
              } else {
                el.innerHTML = rawChunks[idx];
                typesetContainer(el);
                cachedHTML[idx] = el.innerHTML;
                if (el.offsetHeight > 0) {
                  cachedHeight[idx] = el.offsetHeight;
                  el.style.minHeight = cachedHeight[idx] + "px";
                }
              }
            }
          } else if (el.dataset.rendered === "true" && cachedHTML[idx] !== null && idx >= eagerCount) {
            if (el.offsetHeight > 0) {
              cachedHeight[idx] = el.offsetHeight;
            }
            el.style.minHeight = cachedHeight[idx] + "px";
            el.innerHTML = "";
            el.dataset.rendered = "";
          }
        }
      }, { root: body, rootMargin: "800px" });

      for (let idx = 0; idx < domNodes.length; idx++) {
        virtualObserver.observe(domNodes[idx]);
      }
    } else {
      for (let idx = eagerCount; idx < domNodes.length; idx++) {
        const el = domNodes[idx];
        el.dataset.rendered = "true";
        el.innerHTML = rawChunks[idx];
        typesetContainer(el);
      }
    }
  }

  function renderAll() {
    renderTitle();
    renderTabs();
    renderEqSubtabs();
    renderBody();
  }

  App.openSolutionPanel = function (config) {
    const cfg = config || {};
    state.titleText = cfg.title || cfg.titleText || "Lời giải chi tiết";
    state.titleMath = cfg.math || cfg.titleMath || "";
    state.htmlTab1 = cfg.content1 || "";
    state.htmlTab2Main = cfg.content2 || "";
    state.htmlTab2Sub = cfg.content2Sub || "";
    state.htmlHeader1 = cfg.htmlHeader || "";
    state.htmlSteps1 = Array.isArray(cfg.htmlSteps) ? cfg.htmlSteps : null;
    state.htmlFooter1 = cfg.htmlFooter || "";

    state.tab1Label = cfg.tab1Label || "Cách 1";
    state.tab2Label = cfg.tab2Label || "Cách 2";
    state.showSubTabs = Boolean(cfg.showSubTabs);

    state.active = "mat";
    state.eqVariant = "general";

    if (cfg.autoOpen !== false) {
      setOpen(true);
    } else {
      const overlay = $("solutionOverlay");
      if (overlay && overlay.classList.contains("is-open")) {
        renderAll();
      }
    }
  };

  App.showSolutionPanel = function () {
    setOpen(true);
  };

  App.closeSolutionPanel = function () {
    setOpen(false);
  };

  App.setBasisSolutionForPanel = function (pack) {
    if (!pack) return;
    App.openSolutionPanel({
      title: pack.titleText,
      math: pack.titleMath,
      content1: pack.allSolutions ? pack.allSolutions.mat : pack.htmlContent,
      content2: pack.allSolutions ? pack.allSolutions.general : "",
      content2Sub: pack.allSolutions ? pack.allSolutions.step : "",
      tab1Label: "Cách 1: Ma trận",
      tab2Label: "Cách 2: Hệ phương trình",
      showSubTabs: true,
      autoOpen: false
    });
  };

  function copyActiveContent() {
    const body = $("solutionBody");
    const btnCopy = $("btnCopySolution");
    if (!body) return;
    const text = body.innerText;
    if (!text || text.includes("Chưa có lời giải")) return;

    const ok = function () {
      if (!btnCopy) return;
      const old = btnCopy.textContent;
      btnCopy.textContent = "Đã sao chép";
      setTimeout(function () {
        btnCopy.textContent = old || "Sao chép";
      }, 900);
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).then(ok).catch(function () {});
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      ok();
    }
  }

  function bind() {
    ensureEqSubtabs();

    const btnOpen = $("btnOpenSolution");
    const btnClose = $("btnCloseSolution");
    const overlay = $("solutionOverlay");
    const tabMat = $("solMethodMat");
    const tabEq = $("solMethodEq");
    const btnCopy = $("btnCopySolution");

    if (btnOpen) {
      btnOpen.addEventListener("click", function () {
        if (btnOpen.dataset && btnOpen.dataset.syncManaged === "1") return;
        setOpen(true);
      });
    }

    if (btnClose) {
      btnClose.addEventListener("click", function () {
        setOpen(false);
      });
    }

    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) setOpen(false);
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });

    if (tabMat) {
      tabMat.addEventListener("click", function () {
        state.active = "mat";
        renderTabs();
        renderEqSubtabs();
        renderBody();
      });
    }

    if (tabEq) {
      tabEq.addEventListener("click", function () {
        if (!hasSecondMethod()) return;
        state.active = "eq";
        renderTabs();
        renderEqSubtabs();
        renderBody();
      });
    }

    if (btnCopy) {
      btnCopy.addEventListener("click", copyActiveContent);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
