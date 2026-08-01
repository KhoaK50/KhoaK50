// ===================== solution_panel.js (HTML RENDER + TABS) =====================
(function () {
  window.App = window.App || {};

  function $(id) {
    return document.getElementById(id);
  }

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
    titleText: "Lời giải",
    titleMath: "",

    // Nội dung HTML
    htmlTab1: "",
    htmlTab2Main: "",
    htmlTab2Sub: "",

    active: "mat", // Tab đang chọn
    eqVariant: "general", // Subtab đang chọn

    // [MỚI] Cấu hình hiển thị (Mặc định)
    tab1Label: "Cách 1",
    tab2Label: "Cách 2",
    showSubTabs: true,
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
    if (tabMat) {
      tabMat.textContent = state.tab1Label; // Lấy tên từ state
      tabMat.classList.toggle("is-active", state.active === "mat");
    }
    if (tabEq) {
      tabEq.textContent = state.tab2Label; // Lấy tên từ state
      tabEq.classList.toggle("is-active", state.active === "eq");
    }
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
    eqBtnGeneral.onclick = () => {
      state.eqVariant = "general";
      renderEqSubtabs();
      renderBody();
    };

    eqBtnStep = document.createElement("button");
    eqBtnStep.className = "sol-subtab";
    eqBtnStep.textContent = "Xét từng vector";
    eqBtnStep.onclick = () => {
      state.eqVariant = "step";
      renderEqSubtabs();
      renderBody();
    };

    eqSubWrap.appendChild(eqBtnGeneral);
    eqSubWrap.appendChild(eqBtnStep);
    tabEq.parentElement.appendChild(eqSubWrap);
  }

  function renderEqSubtabs() {
    ensureEqSubtabs();
    if (!eqSubWrap) return;

    // Chỉ hiện nếu đang ở Tab 2 VÀ Config cho phép hiện
    const show = state.active === "eq" && state.showSubTabs;

    eqSubWrap.classList.toggle("is-visible", show);
    eqSubWrap.style.display = show ? "inline-flex" : "none";

    if (eqBtnGeneral)
      eqBtnGeneral.classList.toggle("is-active", state.eqVariant === "general");
    if (eqBtnStep)
      eqBtnStep.classList.toggle("is-active", state.eqVariant === "step");
  }

  // Biến toàn cục để quản lý việc "Băm nhỏ" dữ liệu
  let stepChildren = [];
  let currentRenderIndex = 0;
  const CHUNK_SIZE = 5; // Render 5 thẻ DOM (5 bước giải) mỗi lần cuộn

  let virtualObserver = null;

  function renderBody() {
    if (!body) return;
    if (virtualObserver) { virtualObserver.disconnect(); virtualObserver = null; }

    // Xử lý Tab 2 như bình thường
    if (state.active === "eq") {
      let content = state.eqVariant === "step" ? state.htmlTab2Sub : state.htmlTab2Main;
      if (!content && state.eqVariant === "step") content = state.htmlTab2Main;
      if (!content && state.eqVariant === "general") content = state.htmlTab2Sub;
      
      body.innerHTML = content || `<div class="sol-empty">Chưa có lời giải.</div>`;
      renderEqSubtabs();
      typesetMath();
      return;
    }

    // --- XỬ LÝ TAB 1: CỖ MÁY ẢO HÓA ---
    if (!state.htmlSteps1 || state.htmlSteps1.length === 0) {
      body.innerHTML = state.htmlTab1 || `<div class="sol-empty">Chưa có lời giải.</div>`;
      typesetMath();
      return;
    }

    body.innerHTML = ""; // Xóa sạch rác

    // 1. Ráp Header
    const headerDiv = document.createElement('div');
    headerDiv.innerHTML = state.htmlHeader1;
    body.appendChild(headerDiv);

    // 2. Chuẩn bị kho dữ liệu đệm (RAM)
    const rawChunks = state.htmlSteps1;
    const cachedHTML = new Array(rawChunks.length).fill(null); // Lưu HTML đã vẽ chín
    const cachedHeight = new Array(rawChunks.length).fill(150); // Chiều cao dự kiến

    const listContainer = document.createElement('div');
    body.appendChild(listContainer);

    // 3. Tạo 300 Vỏ rỗng
    const domNodes = [];
    rawChunks.forEach((_, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'virtual-recycler-node';
      wrap.style.minHeight = cachedHeight[idx] + 'px';
      wrap.dataset.idx = idx;
      listContainer.appendChild(wrap);
      domNodes.push(wrap);
    });

    // 4. Ráp Footer
    const footerDiv = document.createElement('div');
    footerDiv.innerHTML = state.htmlFooter1;
    body.appendChild(footerDiv);

    // Dịch toán học cho Header và Footer trước
    if (window.MathJax) MathJax.typesetPromise([headerDiv, footerDiv]);

    // 5. RADAR TÁI CHẾ (Intersection Observer)
    virtualObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const el = entry.target;
        const idx = parseInt(el.dataset.idx);

        if (entry.isIntersecting) {
          // KHI CUỘN TỚI: Nạp dữ liệu
          if (!el.dataset.rendered) {
            el.dataset.rendered = "true";
            
            if (cachedHTML[idx]) {
               // BÍ KÍP 1: Bốc HTML đã vẽ chín đắp vào, KHÔNG GỌI MATHJAX NỮA!
               el.innerHTML = cachedHTML[idx];
            } else {
               // Lần đầu tiên nhìn thấy: Nạp HTML thô và gọi MathJax
               el.innerHTML = rawChunks[idx];
               if (window.MathJax) {
                 MathJax.typesetPromise([el]).then(() => {
                    // BÍ KÍP 2: Lưu lại HTML chín và Chiều cao thật
                    cachedHTML[idx] = el.innerHTML;
                    cachedHeight[idx] = el.offsetHeight;
                    el.style.minHeight = cachedHeight[idx] + 'px';
                 }).catch(e => console.warn(e));
               }
            }
          }
        } else {
          // KHI CUỘN ĐI NƠI KHÁC: Tái chế DOM (Culling)
          // Xóa ruột HTML để giải phóng RAM lập tức, nhưng giữ lại cái khung vỏ chiều cao!
          if (el.dataset.rendered === "true" && cachedHTML[idx]) {
             el.style.minHeight = cachedHeight[idx] + 'px';
             el.innerHTML = ""; 
             el.dataset.rendered = "";
          }
        }
      });
    }, { root: body, rootMargin: '800px' }); // Quét trước 800px (tầm 1 màn hình) để tải ngầm

    // Kích hoạt Radar cho toàn bộ vỏ rỗng
    domNodes.forEach(node => virtualObserver.observe(node));
  }

  function renderTitle() {
    if (titleTextEl) titleTextEl.textContent = state.titleText;
    if (titleMathEl) {
      titleMathEl.innerHTML = state.titleMath;
      // Ép MathJax dịch riêng cái tiêu đề (Fix lỗi hiển thị raw code)
      if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
        window.MathJax.typesetPromise([titleMathEl]).catch((e) => console.warn(e));
      }
    }
  }

  function renderAll() {
    renderTitle();
    renderTabs();
    renderEqSubtabs();
    renderBody();
  }

  // --- API Public ---

  // [THÊM MỚI] Hàm mở Panel đa năng
  App.openSolutionPanel = function (config) {
    // 1. Nạp dữ liệu
    state.titleText = config.title || "Lời giải";
    state.titleMath = config.math || "";
    state.htmlTab1 = config.content1 || "";
    state.htmlTab2Main = config.content2 || "";
    state.htmlTab2Sub = config.content2Sub || "";
    state.htmlHeader1 = config.htmlHeader || "";
    state.htmlSteps1 = config.htmlSteps || null;
    state.htmlFooter1 = config.htmlFooter || "";

    // 2. Nạp Config giao diện (Tên tab, Ẩn/Hiện subtab)
    state.tab1Label = config.tab1Label || "Cách 1";
    state.tab2Label = config.tab2Label || "Cách 2";
    state.showSubTabs = config.showSubTabs !== false; // Mặc định là hiện

    // 3. Reset trạng thái
    state.active = "mat";
    state.eqVariant = "general";

    // 4. Mở Panel (nếu autoOpen = true hoặc không truyền)
    if (config.autoOpen !== false) setOpen(true);
  };

  // [THÊM MỚI] Hàm chỉ mở Panel (cho nút "Lời giải")
  App.showSolutionPanel = function () {
    setOpen(true);
  };
  // Nhận dữ liệu từ Controller (basis_controller.js)
  App.setBasisSolutionForPanel = function (pack) {
    App.openSolutionPanel({
      title: pack.titleText,
      math: pack.titleMath,
      content1: pack.allSolutions ? pack.allSolutions.mat : pack.htmlContent,
      content2: pack.allSolutions ? pack.allSolutions.general : "",
      content2Sub: pack.allSolutions ? pack.allSolutions.step : "",
      tab1Label: "Cách 1: Ma trận",
      tab2Label: "Cách 2: Hệ phương trình",
      showSubTabs: true,
    });
  };

  // Hàm Copy thông minh (Lấy text thuần túy từ HTML đang hiển thị)
  function copyActiveContent() {
    const text = body.innerText; // Lấy text đã render (bao gồm công thức dạng text)
    if (!text || text.includes("Chưa có lời giải")) return;

    const ok = () => {
      if (!btnCopy) return;
      const old = btnCopy.textContent;
      btnCopy.textContent = "Đã copy!";
      setTimeout(() => {
        btnCopy.textContent = old || "Copy Text";
      }, 900);
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

    if (tabMat)
      tabMat.addEventListener("click", () => {
        state.active = "mat";
        renderTabs();
        renderEqSubtabs();
        renderBody();
      });

    if (tabEq)
      tabEq.addEventListener("click", () => {
        state.active = "eq";
        renderTabs();
        renderEqSubtabs();
        renderBody();
      });

    if (btnCopy) btnCopy.addEventListener("click", copyActiveContent);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
