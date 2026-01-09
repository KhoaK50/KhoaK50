// ===================== solution_panel.js (HTML RENDER + TABS) =====================
(function () {
  window.App = window.App || {};

  function $(id) { return document.getElementById(id); }

  // DOM Elements
  const overlay = $("solutionOverlay");
  const body = $("solutionBody");
  const titleTextEl = $("solTitleText");
  const titleMathEl = $("solTitleMath");
  const btnOpen = $("btnOpenSolution");
  const btnClose = $("btnCloseSolution");
  const tabMat = $("solMethodMat");
  const tabEq = $("solMethodEq");
  const btnCopy = $("btnCopySolution");

  // Subtabs Logic
  let eqSubWrap = null;
  let eqBtnGeneral = null;
  let eqBtnStep = null;

  // State Management (Lưu HTML thay vì LaTeX)
  const state = {
    titleText: "Cơ sở & số chiều trong",
    titleMath: "\\( \\mathbb{R}^n \\)",
    
    // Nội dung HTML của 3 cách giải
    htmlMat: "",
    htmlEqGeneral: "",
    htmlEqStep: "",

    active: "mat",      // Tab chính: "mat" | "eq"
    eqVariant: "general" // Subtab: "general" | "step"
  };

  // Hàm render MathJax
  function typesetMath() {
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      return window.MathJax.typesetPromise([overlay]);
    }
    return Promise.resolve();
  }

  // Toggle Panel
  function setOpen(open) {
    if (!overlay) return;
    if (open) {
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      renderAll();
    } else {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
    }
  }

  // Render Tabs Logic
  function renderTabs() {
    if (tabMat) tabMat.classList.toggle("is-active", state.active === "mat");
    if (tabEq) tabEq.classList.toggle("is-active", state.active === "eq");
  }

  function ensureEqSubtabs() {
    if (!tabEq || !tabEq.parentElement) return;
    if (eqSubWrap) return;

    eqSubWrap = document.createElement("span");
    eqSubWrap.className = "sol-subtabs";
    eqSubWrap.id = "solEqSubtabs";

    eqBtnGeneral = document.createElement("button");
    eqBtnGeneral.className = "sol-subtab is-active";
    eqBtnGeneral.textContent = "Tổng quát";
    eqBtnGeneral.onclick = () => { state.eqVariant = "general"; renderEqSubtabs(); renderBody(); };

    eqBtnStep = document.createElement("button");
    eqBtnStep.className = "sol-subtab";
    eqBtnStep.textContent = "Xét từng vector";
    eqBtnStep.onclick = () => { state.eqVariant = "step"; renderEqSubtabs(); renderBody(); };

    eqSubWrap.appendChild(eqBtnGeneral);
    eqSubWrap.appendChild(eqBtnStep);
    tabEq.parentElement.appendChild(eqSubWrap);
  }

  function renderEqSubtabs() {
    ensureEqSubtabs();
    if (!eqSubWrap) return;

    // Chỉ hiện subtab nếu đang ở tab Equation
    const show = (state.active === "eq");
    eqSubWrap.classList.toggle("is-visible", show);

    if (eqBtnGeneral) eqBtnGeneral.classList.toggle("is-active", state.eqVariant === "general");
    if (eqBtnStep) eqBtnStep.classList.toggle("is-active", state.eqVariant === "step");
  }

  // Render Nội dung chính (Thay innerHTML bằng HTML string)
  function renderBody() {
    if (!body) return;

    let content = "";
    if (state.active === "mat") {
        content = state.htmlMat;
    } else {
        content = (state.eqVariant === "step") ? state.htmlEqStep : state.htmlEqGeneral;
        // Fallback nếu 1 trong 2 subtab chưa có dữ liệu
        if (!content && state.eqVariant === "step") content = state.htmlEqGeneral;
        if (!content && state.eqVariant === "general") content = state.htmlEqStep;
    }

    // Hiển thị
    if (!content) {
      body.innerHTML = `
        <div class="sol-empty">
          Chưa có lời giải. Hãy bấm <b>"Tính cơ sở"</b> để tạo lời giải mới.
        </div>
      `;
    } else {
      body.innerHTML = content; // Chèn trực tiếp HTML
    }

    renderEqSubtabs();
    typesetMath(); // Render công thức sau khi chèn HTML
  }

  function renderTitle() {
    if (titleTextEl) titleTextEl.textContent = state.titleText;
    if (titleMathEl) titleMathEl.innerHTML = state.titleMath;
  }

  function renderAll() {
    renderTitle();
    renderTabs();
    renderEqSubtabs();
    renderBody();
  }

  // --- API Public ---
  // Nhận dữ liệu từ Controller (basis_controller.js)
  App.setBasisSolutionForPanel = function (pack) {
    state.titleText = pack.titleText || "Cơ sở & số chiều trong";
    state.titleMath = pack.titleMath || "\\( \\mathbb{R}^n \\)";

    // Update dữ liệu HTML cho cả 3 cách
    if (pack.allSolutions) {
        state.htmlMat = pack.allSolutions.mat || "";
        state.htmlEqGeneral = pack.allSolutions.general || "";
        state.htmlEqStep = pack.allSolutions.step || "";
    } else {
        // Fallback cho code cũ (nếu có)
        state.htmlMat = pack.htmlContent || "";
    }

    // Reset về tab đầu tiên khi có kết quả mới
    state.active = "mat"; 
    state.eqVariant = "general";
    
    renderAll();
  };

  // Hàm Copy thông minh (Lấy text thuần túy từ HTML đang hiển thị)
  function copyActiveContent() {
    const text = body.innerText; // Lấy text đã render (bao gồm công thức dạng text)
    if (!text || text.includes("Chưa có lời giải")) return;

    const ok = () => {
      if (!btnCopy) return;
      const old = btnCopy.textContent;
      btnCopy.textContent = "Đã copy!";
      setTimeout(() => { btnCopy.textContent = old || "Copy Text"; }, 900);
    };

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(ok);
    } else {
        // Fallback cũ
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        ok();
    }
  }

  // Bind Events
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
      renderTabs(); renderEqSubtabs(); renderBody();
    });

    if (tabEq) tabEq.addEventListener("click", () => {
      state.active = "eq";
      renderTabs(); renderEqSubtabs(); renderBody();
    });

    if (btnCopy) btnCopy.addEventListener("click", copyActiveContent);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }

})();