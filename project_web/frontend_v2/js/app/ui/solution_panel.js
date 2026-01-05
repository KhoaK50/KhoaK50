// ===================== solution_panel.js =====================
(function () {
  window.App = window.App || {};

  function $(id) { return document.getElementById(id); }

  const overlay = $("solutionOverlay");
  const body = $("solutionBody");

  const titleTextEl = $("solTitleText");
  const titleMathEl = $("solTitleMath");

  const btnOpen = $("btnOpenSolution");
  const btnClose = $("btnCloseSolution");

  const tabMat = $("solMethodMat");
  const tabEq = $("solMethodEq");

  const btnCopy = $("btnCopySolution");

  // ---------- subtabs for "Cách 2" ----------
  let eqSubWrap = null;
  let eqBtnGeneral = null;
  let eqBtnStep = null;

  const state = {
    titleText: "Cơ sở & số chiều trong",
    titleMath: "\\( \\mathbb{R}^n \\)",

    // method 1
    matLatex: "",

    // method 2 variants
    eqLatexGeneral: "",     // Tổng quát (R4)
    eqLatexStep: "",        // Xét từng vector (R5)

    active: "mat",          // "mat" | "eq"
    eqVariant: "general"    // "general" | "step"
  };

  function typesetMath() {
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      return window.MathJax.typesetPromise([overlay]);
    }
    return Promise.resolve();
  }

  function setOpen(open) {
    if (!overlay) return;
    if (open) {
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      renderAll(); // render + typeset
    } else {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
    }
  }

  function renderTabs() {
    if (tabMat) tabMat.classList.toggle("is-active", state.active === "mat");
    if (tabEq) tabEq.classList.toggle("is-active", state.active === "eq");
  }

  // ✅ delimiter check: chỉ coi là "đã có math mode" khi có \[...\] hoặc $$...$$ hoặc \(...\)
  function hasMathDelimiters(latex) {
    const s = (latex || "").trim();
    if (!s) return false;
    if (s.includes("$$")) return true;
    if (s.includes("\\[") && s.includes("\\]")) return true;
    if (s.includes("\\(") && s.includes("\\)")) return true;
    return false;
  }

  // ✅ luôn bọc \[...\] nếu chưa có delimiter
  // (vì \begin{array} KHÔNG tự tạo math mode trong MathJax)
  function wrapLatexToDisplayMath(latex) {
    const s = (latex || "").trim();
    if (!s) return "";
    if (hasMathDelimiters(s)) return s;
    return `\\[\n${s}\n\\]`;
  }

  function ensureEqSubtabs() {
    if (!tabEq || !tabEq.parentElement) return;
    if (eqSubWrap) return;

    eqSubWrap = document.createElement("span");
    eqSubWrap.className = "sol-subtabs";
    eqSubWrap.id = "solEqSubtabs";

    eqBtnGeneral = document.createElement("button");
    eqBtnGeneral.type = "button";
    eqBtnGeneral.className = "sol-subtab is-active";
    eqBtnGeneral.id = "solEqGeneral";
    eqBtnGeneral.textContent = "Tổng quát";

    eqBtnStep = document.createElement("button");
    eqBtnStep.type = "button";
    eqBtnStep.className = "sol-subtab";
    eqBtnStep.id = "solEqStep";
    eqBtnStep.textContent = "Xét từng vector";

    eqSubWrap.appendChild(eqBtnGeneral);
    eqSubWrap.appendChild(eqBtnStep);

    tabEq.parentElement.appendChild(eqSubWrap);

    eqBtnGeneral.addEventListener("click", () => {
      state.eqVariant = "general";
      renderEqSubtabs();
      renderBody();
    });

    eqBtnStep.addEventListener("click", () => {
      state.eqVariant = "step";
      renderEqSubtabs();
      renderBody();
    });
  }

  function renderEqSubtabs() {
    ensureEqSubtabs();
    if (!eqSubWrap) return;

    const hasGeneral = !!(state.eqLatexGeneral && state.eqLatexGeneral.trim());
    const hasStep = !!(state.eqLatexStep && state.eqLatexStep.trim());

    const show = (state.active === "eq") && hasGeneral && hasStep;
    eqSubWrap.classList.toggle("is-visible", show);

    if (eqBtnGeneral) eqBtnGeneral.classList.toggle("is-active", state.eqVariant === "general");
    if (eqBtnStep) eqBtnStep.classList.toggle("is-active", state.eqVariant === "step");
  }

  function getActiveLatex() {
    if (state.active === "mat") return state.matLatex || "";

    const g = (state.eqLatexGeneral || "").trim();
    const st = (state.eqLatexStep || "").trim();

    if (g && st) return (state.eqVariant === "step") ? state.eqLatexStep : state.eqLatexGeneral;
    if (g) return state.eqLatexGeneral;
    if (st) return state.eqLatexStep;
    return "";
  }

  function renderBody() {
    if (!body) return;

    const latexRaw = getActiveLatex();
    const latex = (latexRaw || "").trim();

    if (!latex) {
      body.innerHTML = `
        <div class="sol-empty">
          Chưa có lời giải. Bấm <b>Tính cơ sở</b> rồi mở <b>Lời giải</b> để xem.
        </div>
      `;
      renderEqSubtabs();
      return typesetMath();
    }

    const content = wrapLatexToDisplayMath(latex);

    body.innerHTML = `
      <div class="sol-content">
        ${content}
      </div>
    `;

    renderEqSubtabs();
    return typesetMath();
  }

  function renderTitle() {
    if (titleTextEl) titleTextEl.textContent = state.titleText || "Cơ sở & số chiều trong";
    if (titleMathEl) titleMathEl.innerHTML = state.titleMath || "";
    return typesetMath();
  }

  function renderAll() {
    renderTitle();
    renderTabs();
    renderEqSubtabs();
    renderBody();
  }

  // API public
  App.setBasisSolutionForPanel = function (pack) {
    state.titleText = (pack && typeof pack.titleText === "string") ? pack.titleText : "Cơ sở & số chiều trong";
    state.titleMath = (pack && typeof pack.titleMath === "string") ? pack.titleMath : "\\( \\mathbb{R}^n \\)";

    state.matLatex = (pack && typeof pack.matLatex === "string") ? pack.matLatex : "";

    // ✅ đúng key
    state.eqLatexGeneral = (pack && typeof pack.eqLatexGeneral === "string") ? pack.eqLatexGeneral : "";
    state.eqLatexStep = (pack && typeof pack.eqLatexStep === "string") ? pack.eqLatexStep : "";

    state.active = "mat";

    if ((state.eqLatexGeneral || "").trim() && !(state.eqLatexStep || "").trim()) state.eqVariant = "general";
    else if (!(state.eqLatexGeneral || "").trim() && (state.eqLatexStep || "").trim()) state.eqVariant = "step";
    else state.eqVariant = "general";

    renderAll();
  };

  function copyActiveLatex() {
    const latex = (getActiveLatex() || "").trim();
    if (!latex) return;

    const ok = () => {
      if (!btnCopy) return;
      const old = btnCopy.textContent;
      btnCopy.textContent = "Đã copy!";
      setTimeout(() => { btnCopy.textContent = old || "Copy LaTeX"; }, 900);
    };

    navigator.clipboard?.writeText(latex).then(ok).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = latex;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); ok(); } catch (_) { }
      ta.remove();
    });
  }

  function bind() {
    ensureEqSubtabs();

    if (btnOpen) btnOpen.addEventListener("click", () => setOpen(true));
    if (btnClose) btnClose.addEventListener("click", () => setOpen(false));

    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) setOpen(false);
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });

    if (tabMat) tabMat.addEventListener("click", () => {
      state.active = "mat";
      renderTabs();
      renderEqSubtabs();
      renderBody();
    });

    if (tabEq) tabEq.addEventListener("click", () => {
      state.active = "eq";
      renderTabs();
      renderEqSubtabs();
      renderBody();
    });

    if (btnCopy) btnCopy.addEventListener("click", () => copyActiveLatex());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }

})();
