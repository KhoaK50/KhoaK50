(function () {
  window.App = window.App || {};

  // =========================================================================
  // 1. DYNAMIC CSS INJECTION
  // Tự động chèn CSS để đảm bảo giao diện đồng bộ mà không cần sửa file .css
  // =========================================================================
  function injectSidebarStyles() {
    if (document.getElementById('sidebar-dynamic-styles')) return;

    const style = document.createElement('style');
    style.id = 'sidebar-dynamic-styles';
    style.textContent = `
    /* Wrapper bao quanh ô nhập và nút menu */
    .vec-input-wrapper {
        position: relative;
        flex: 1;
        display: flex;
        align-items: center;
        background: #fff;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 0;
        min-height: 34px;
        z-index: 1;
        overflow: visible !important;
    }
    
    /* Mở khóa hiển thị cho toàn bộ khung chứa */
    .vec-item, .vec-main, .vec-header {
        overflow: visible !important;
    }
    
    /* Khi di chuột vào hoặc bấm vào, đưa dòng đó lên lớp cao nhất */
    .vec-item {
        position: relative; 
        z-index: 1; 
    }
    .vec-item:hover, .vec-item:focus-within {
        z-index: 9999 !important;
    }

    /* Ô nhập MathField chính */
    .vec-math-field {
        flex: 1;
        border: none !important;
        background: transparent !important;
        padding: 4px 8px;
        font-size: 1.1em;
        width: 100%;
        outline: none;
        z-index: 1;
        min-width: 0;
    }

    /* Nút Menu (3 gạch) */
    .vec-menu-btn {
        padding: 0 10px;
        cursor: pointer;
        color: #888;
        background: transparent;
        border: none;
        border-left: 1px solid #eee;
        font-size: 14px;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;
    }
    .vec-menu-btn:hover {
        color: #2196F3;
        background: #f9f9f9;
    }

    /* Dropdown Menu */
    .vec-dropdown {
        display: none;
        position: absolute;
        top: 100%;
        right: 0;
        width: 220px;
        background: white;
        border: 1px solid #ddd;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        border-radius: 4px;
        z-index: 99999;
        max-height: 300px;
        overflow-y: auto;
        margin-top: -1px;
    }
    .vec-item.active-z {
        z-index: 1000 !important;
    }
    .vec-dropdown.show {
        display: block;
    }

    /* Các item trong menu dropdown */
    .vec-dropdown-item {
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #f5f5f5;
        font-size: 0.9em;
        color: #333;
    }
    .vec-dropdown-item:last-child {
        border-bottom: none;
    }
    .vec-dropdown-item:hover {
        background: #f0f8ff;
        color: #2196F3;
    }

    .latex-preview {
        color: #999;
        font-style: italic;
        font-family: "Times New Roman", serif;
        font-size: 0.95em;
    }

    /* --- CHECKLIST STYLES (Đã gộp và tối ưu) --- */
    
    /* Dòng chứa checkbox + công thức */
    .checkitem {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border-bottom: 1px solid #f0f0f0;
        transition: background 0.2s;
        cursor: pointer !important; 
        user-select: none; /* Không cho bôi đen khi click liên tục */
    }
    .checkitem:hover {
        background: #f9f9f9;
    }
    
    .checkitem-left {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.95em;
        color: #333;
        flex: 1; /* Để chiếm hết chỗ trống */
        overflow: hidden;
        pointer-events: none !important;
    }
    .badge {
        font-size: 0.8em; 
        font-weight: bold; 
        color: #888; 
        background: #eee;
        padding: 2px 5px; 
        border-radius: 3px; 
        white-space: nowrap;
        
        /* [QUAN TRỌNG] Click xuyên qua badge */
        pointer-events: none !important; 
    }

    /* Ô Checkbox nhỏ gọn */
    .checkitem input[type="checkbox"] {
        width: 14px;
        height: 14px;
        margin: 0;
        cursor: pointer;
        accent-color: #2196F3;
        pointer-events: auto;
    }
    
    /* Khung công cụ tìm kiếm trong checklist */
    .checklist-tools {
        padding: 10px;
        border-bottom: 1px solid #eee;
        background: #fafafa;
    }
    
    /* Ô input tìm kiếm */
    .checklist-search {
        width: 100%;
        padding: 6px 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-bottom: 8px;
        font-size: 0.9em;
        box-sizing: border-box; /* Quan trọng: Để padding không làm vỡ layout */
    }
    
    /* Dòng chứa nút "Chọn tất cả" */
    .checklist-actions {
        display: flex !important;
        justify-content: space-between !important; /* Bắt buộc dồn sang phải */
        align-items: center !important;
        width: 100% !important;
        gap: 8px !important;
        margin-top: 6px !important;
        font-size: 0.9em;
        color: #555;
    }
    /* Trị cái label { display: block } của global */
    .checklist-actions label {
        display: inline-block !important;
        width: auto !important;
        margin: 0 !important; /* Xóa margin đáy của global */
        padding: 0 !important;
        cursor: pointer;
        user-select: none;
        font-weight: normal !important;
    }

    /* Trị cái input { width: 100% } của global */
    .checklist-actions input[type="checkbox"] {
        display: inline-block !important;
        width: 16px !important;  /* Ép về size nhỏ */
        height: 16px !important;
        min-height: 0 !important; /* Fix lỗi min-height 42px của mobile */
        margin: 0 !important;
        flex: 0 0 auto !important; /* Không cho co giãn */
        cursor: pointer;
        accent-color: #2196F3;
        box-shadow: none !important; /* Bỏ shadow focus của input global */
    }
    
    /* Khung cuộn danh sách */
    .checklist-scroll {
        max-height: 250px;
        overflow-y: auto;
    }

    /* MathField trong Checklist (Chỉ đọc) */
    .checklist-math {
        flex: 1;
        border: none !important;
        background: transparent !important;
        font-size: 1.1em;
        color: #333;
        pointer-events: none !important;
        box-shadow: none !important;
        outline: none !important;
        min-width: 0;
        touch-action: none !important;
    }
    /* Ẩn menu ảo của math-field */
    .checklist-math::part(menu-toggle) { display: none; }

    /* --- DARK MODE SUPPORT --- */
    body.dark .vec-input-wrapper {
        background: rgba(255,255,255,0.05);
        border-color: rgba(255,255,255,0.2);
    }
    body.dark .vec-math-field {
        color: #fff;
        --caret-color: #fff;
        --selection-background-color: rgba(255,255,255,0.2);
    }
    body.dark .vec-menu-btn {
        color: #aaa;
        border-left-color: rgba(255,255,255,0.1);
    }
    body.dark .vec-menu-btn:hover {
        color: #fff;
        background: rgba(255,255,255,0.1);
    }
    body.dark .vec-dropdown {
        background: #1e1e1e;
        border-color: #444;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    }
    body.dark .vec-dropdown-item {
        color: #ddd;
        border-bottom-color: #333;
    }
    body.dark .vec-dropdown-item:hover {
        background: #333;
        color: #2196F3;
    }
    
    /* Dark mode cho Checklist */
    body.dark .checklist-tools {
        background: #2a2a2a;
        border-bottom-color: #444;
    }
    body.dark .checklist-search {
        background: #333;
        border-color: #555;
        color: #fff;
    }
    body.dark .checkitem {
        border-bottom-color: #333;
    }
    body.dark .checkitem:hover {
        background: #333;
    }
    body.dark .checkitem-left {
        color: #ddd;
    }
    body.dark .checklist-math {
        color: #ddd;
    }
    body.dark .checklist-actions {
        color: #aaa;
    }
`;
    document.head.appendChild(style);
  }

  // Kích hoạt style ngay lập tức
  injectSidebarStyles();


  // =========================================================================
  // 2. HELPER FUNCTIONS (MÀU SẮC & XỬ LÝ)
  // =========================================================================

  function nearAxisHue(h) {
    const anchors = [0, 120, 240];
    return anchors.some((a) => Math.abs((((h - a + 540) % 360) - 180)) < 14);
  }

  function pickUniqueHue() {
    const golden = 137.508;
    let h = (App.vectorList.length * golden) % 360;
    while ([...(App.usedHues)].some((uh) => Math.abs(uh - h) < 8) || nearAxisHue(h)) {
      h = (h + 23) % 360;
    }
    App.usedHues.add(h);
    return h;
  }

  function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, "0");
    return "#" + toHex(f(0)) + toHex(f(8)) + toHex(f(4));
  }

  function computeVectorColorHex(hue) {
    return hslToHex(hue, 75, 52);
  }

  function computeHaloHex(hue, theme) {
    return theme === "dark" ? hslToHex(hue, 95, 80) : hslToHex(hue, 80, 30);
  }

  function attachVectorItem(vec, hue) {
    return {
      id: App.nextId++,
      vec: vec.slice(),
      hue,
      colorCss: `hsl(${hue} 75% 52%)`,
      colorHex: computeVectorColorHex(hue),
      haloCss: App.theme === "dark" ? `hsl(${hue} 95% 80%)` : `hsl(${hue} 80% 30%)`,
      haloHex: computeHaloHex(hue, App.theme),
      focus: false,
      visible: true,
      highlighted: false,
    };
  }

  // Export helpers vào App scope
  App._pickUniqueHue = pickUniqueHue;
  App._attachVectorItem = attachVectorItem;

  App.refreshHaloColors = function () {
    App.vectorList.forEach((v) => {
      v.haloHex = computeHaloHex(v.hue, App.theme);
      v.haloCss = App.theme === "dark" ? `hsl(${v.hue} 95% 80%)` : `hsl(${v.hue} 80% 30%)`;
    });
  };
  App.smartFormat = function (num) {
    if (Math.abs(num - Math.round(num)) < 1e-9) return String(Math.round(num));
    for (let d = 2; d <= 100; d++) {
      let n = num * d;
      if (Math.abs(n - Math.round(n)) < 1e-5) return `\\frac{${Math.round(n)}}{${d}}`;
    }
    return Number(num).toFixed(4).replace(/\.?0+$/, "");
  };
  App.displayIndexOf = (item) => App.vectorList.indexOf(item) + 1;
  App.optionLabelFor = (it) => `#${App.displayIndexOf(it)} ${App.formatVectorShort(it.vec)}`;


  // =========================================================================
  // 3. MAIN RENDER FUNCTION: App.renderVectorList
  // (Đã tích hợp Search + Cơi nới khung + Sự kiện đóng mở)
  // =========================================================================
  App.renderVectorList = function () {
    const el = document.getElementById("vectorList");
    if (!el) return;
    el.innerHTML = "";

    // Tự tìm ô input search
    let searchInp = document.getElementById("vecSearch") || document.querySelector('input[placeholder*="Tìm vector"]');

    // Nếu chưa gắn sự kiện thì gắn 1 lần thôi
    if (searchInp && !searchInp._searchAttached) {
      searchInp.addEventListener("input", () => App.renderVectorList());
      searchInp._searchAttached = true;
    }
    // Lấy từ khóa đang gõ
    const searchTerm = searchInp ? searchInp.value.trim().toLowerCase() : "";


    // --- B. SỰ KIỆN CLICK RA NGOÀI & SCROLL (RESET KHUNG) ---
    if (!window._sidebarEventsAttached) {
      const resetSidebar = () => {
        document.querySelectorAll('.vec-dropdown').forEach(d => d.classList.remove('show'));
        document.querySelectorAll('.vec-item').forEach(it => it.classList.remove('active-z'));
        const list = document.getElementById("vectorList");
        if (list) {
          list.style.paddingBottom = "0px";
          void list.offsetHeight; // Force Reflow để tránh lỗi kẹt
        }
      };

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.vec-input-wrapper')) resetSidebar();
      });
      window._sidebarEventsAttached = true;
    }

    // --- C. VÒNG LẶP RENDER (CÓ LỌC TÌM KIẾM) ---
    for (const item of App.vectorList) {

      // [QUAN TRỌNG] Logic Lọc: Tạo chuỗi hiển thị để so sánh
      // Ví dụ: "#1 [1, 2]"
      const displayLabel = `#${App.displayIndexOf(item)} ${App.formatVectorShort(item.vec)}`;

      // Nếu có từ khóa mà không khớp -> Bỏ qua vòng lặp này (không vẽ)
      if (searchTerm && !displayLabel.toLowerCase().includes(searchTerm)) {
        continue;
      }

      // --- TỪ ĐÂY TRỞ XUỐNG LÀ CODE RENDER GIAO DIỆN (GIỮ NGUYÊN) ---
      const li = document.createElement("li");
      li.className = "vec-item hover-gradient" + (item.highlighted ? " active" : "");

      const sw = document.createElement("div");
      sw.className = "sw";
      sw.style.background = item.colorCss;

      const main = document.createElement("div");
      main.className = "vec-main";

      const header = document.createElement("div");
      header.className = "vec-header";
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.gap = "8px";

      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = `#${App.displayIndexOf(item)}`;
      tag.style.whiteSpace = "nowrap";

      const wrapper = document.createElement("div");
      wrapper.className = "vec-input-wrapper";

      const mf = document.createElement("math-field");
      mf.className = "vec-math-field";
      mf.value = App.formatVectorShort(item.vec);
      mf.setAttribute("smart-fence", "false");
      mf.setAttribute("smart-mode", "false");
      mf.setAttribute("virtual-keyboard-policy", "manual");

      // Sự kiện Edit Vector
      mf.addEventListener("input", () => {
        try {
          const v = App.parseVectorExpr(mf.value);
          if (v && v.length > 0 && !v.some(isNaN)) {
            item.vec = v;

            // --- [ĐOẠN LOGIC SỬA ĐỔI] ---
            const raw = mf.value;
            const needsCalc = /(sin|cos|tan|cot|log|ln|pi|e\^|e\s|e$)/i.test(raw);

            if (needsCalc) {
              // Tính ra số -> Chuyển về phân số
              const latexArr = v.map(val => App.smartFormat(val));
              item.latex = `[${latexArr.join(", ")}]`;
            } else {
              // Giữ nguyên (ví dụ sqrt(2))
              item.latex = raw;
            }
            // ----------------------------

            App.currentVector = v.slice();
            if (App.updateCalcSelectLabels) App.updateCalcSelectLabels();
            if (App.clearAngleOverlay) App.clearAngleOverlay();
            if (App.renderExtraCalcOptions) App.renderExtraCalcOptions();

            if (App.autoMode) { /* ...giữ nguyên... */ }
            if (App.redrawAll) App.redrawAll({ frame: true });

            if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
            else if (window.Vec2D) Vec2D.draw2DAllVectors();
          }
        } catch (err) { }
      });

      const btn = document.createElement("button");
      btn.className = "vec-menu-btn";
      btn.innerHTML = '<i class="fa-solid fa-bars"></i>';
      btn.title = "Chèn công thức";

      const dropdown = document.createElement("div");
      dropdown.className = "vec-dropdown";

      const menuItems = [
        { label: "Căn bậc 2", latex: "\\sqrt{#0}", preview: "√x" },
        { label: "Căn bậc n", latex: "\\sqrt[#?]{#0}", preview: "ⁿ√x" },
        { separator: true },
        { label: "Sin", latex: "\\sin(#0)", preview: "sin" },
        { label: "Cos", latex: "\\cos(#0)", preview: "cos" },
        { label: "Tan", latex: "\\tan(#0)", preview: "tan" },
        { label: "Cot", latex: "\\cot(#0)", preview: "cot" },
        { separator: true },
        { label: "Logarit cơ số a", latex: "\\log_{#?}(#0)", preview: "logₐ" },
        { label: "Logarit tự nhiên", latex: "\\ln(#0)", preview: "ln" },
        { separator: true },
        { label: "Số Pi", latex: "\\pi", preview: "π" },
        { label: "Số e", latex: "e", preview: "e" }
      ];

      menuItems.forEach(m => {
        if (m.separator) {
          const hr = document.createElement("div");
          hr.style.borderTop = "1px solid #eee";
          hr.style.margin = "4px 0";
          dropdown.appendChild(hr);
        } else {
          const row = document.createElement("div");
          row.className = "vec-dropdown-item";
          row.innerHTML = `<span>${m.label}</span><span class="latex-preview">${m.preview}</span>`;
          row.onclick = (e) => {
            e.stopPropagation();
            mf.executeCommand(['insert', m.latex]);
            mf.focus();
            dropdown.classList.remove('show');
          };
          dropdown.appendChild(row);
        }
      });

      // --- SỰ KIỆN MENU (ĐÃ FIX LỖI KẸT) ---
      btn.onclick = (e) => {
        e.stopPropagation();
        const listContainer = document.getElementById("vectorList");
        const wasOpen = dropdown.classList.contains('show');

        // 1. Reset
        document.querySelectorAll('.vec-dropdown').forEach(d => d.classList.remove('show'));
        document.querySelectorAll('.vec-item').forEach(it => it.classList.remove('active-z'));
        listContainer.style.paddingBottom = "0px";
        void listContainer.offsetHeight; // Force Reflow

        if (wasOpen) return;

        // 2. Open
        li.classList.add('active-z');
        dropdown.classList.add('show');

        // 3. Calc Padding
        setTimeout(() => {
          const menuRect = dropdown.getBoundingClientRect();
          const listRect = listContainer.getBoundingClientRect();
          if (menuRect.bottom > listRect.bottom) {
            const extra = menuRect.bottom - listRect.bottom + 2;
            listContainer.style.paddingBottom = extra + "px";
            dropdown.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 10);
      };

      wrapper.appendChild(mf);
      wrapper.appendChild(btn);
      wrapper.appendChild(dropdown);
      header.appendChild(tag);
      header.appendChild(wrapper);

      const actions = document.createElement("div");
      actions.className = "vec-actions";

      const focusBtn = document.createElement("button");
      focusBtn.className = "btn";
      focusBtn.textContent = item.focus ? "Chú ý: BẬT" : "Chú ý: TẮT";
      focusBtn.onclick = (e) => {
        e.stopPropagation();
        if (!item.focus) App.vectorList.forEach((v) => (v.focus = false));
        item.focus = !item.focus;
        App.renderVectorList();
        if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
        else if (window.Vec2D) Vec2D.draw2DAllVectors();
      };

      const toggleBtn = document.createElement("button");
      toggleBtn.className = "btn";
      toggleBtn.textContent = item.visible ? "Ẩn" : "Hiện";
      toggleBtn.onclick = (e) => {
        e.stopPropagation();
        item.visible = !item.visible;
        toggleBtn.textContent = item.visible ? "Ẩn" : "Hiện";
        if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
        else if (window.Vec2D) Vec2D.draw2DAllVectors();
      };

      const del = document.createElement("button");
      del.className = "btn";
      del.textContent = "Xóa";

      // SỰ KIỆN XÓA (Đã có đủ hàm đồng bộ)
      del.onclick = (e) => {
        e.stopPropagation();
        const idx = App.vectorList.findIndex((v) => v.id === item.id);
        if (idx >= 0) App.vectorList.splice(idx, 1);
        App.usedHues.delete(item.hue);
        if (App.clearAngleOverlay) App.clearAngleOverlay();

        App.renderVectorList();
        if (App.refreshCalcVectorOptions) App.refreshCalcVectorOptions();
        if (App.renderExtraCalcOptions) App.renderExtraCalcOptions();

        if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
        else if (window.Vec2D) Vec2D.draw2DAllVectors();
      };

      actions.appendChild(focusBtn);
      actions.appendChild(toggleBtn);
      actions.appendChild(del);

      main.appendChild(header);
      main.appendChild(actions);
      li.appendChild(sw);
      li.appendChild(main);
      el.appendChild(li);
    }
  };

  // =========================================================================
  // 4. OTHER HELPERS (Cập nhật Select box và Checklist)
  // =========================================================================

  App.refreshCalcVectorOptions = function () {
    const ids = ["v1Select", "v2Select"]; // Chỉ áp dụng cho 2 ô chọn phép tính chính

    ids.forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;

      // Lưu lại giá trị cũ đang chọn (để không bị reset khi thêm vector mới)
      const oldValue = sel.value;

      sel.innerHTML = "";

      // 1. Tạo dòng Placeholder mặc định
      const placeholder = document.createElement("option");
      placeholder.text = "-- Chọn vector --";
      placeholder.value = "";
      placeholder.disabled = true; // Không cho chọn lại dòng này
      placeholder.selected = true; // Mặc định chọn
      sel.appendChild(placeholder);

      // 2. Đổ danh sách vector vào
      App.vectorList.forEach(it => {
        const o = document.createElement("option");
        o.value = it.id;
        o.textContent = App.optionLabelFor(it);
        sel.appendChild(o);
      });

      // 3. Nếu giá trị cũ vẫn còn trong danh sách thì giữ nguyên, không thì về rỗng
      if (oldValue && App.vectorList.some(v => v.id == oldValue)) {
        sel.value = oldValue;
      } else {
        sel.value = "";
      }

      // 4. Gắn sự kiện: Hễ chọn là chạy hàm ẩn/hiện
      sel.onchange = function () {
        if (App.updateVisibilityByCalc) App.updateVisibilityByCalc();
      };
    });
  };

  function addOptionsToSelect(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    for (const it of App.vectorList) {
      const o = document.createElement("option");
      o.value = it.id;
      o.textContent = App.optionLabelFor(it);
      selectEl.appendChild(o);
    }
  }

  // --- [ĐÃ FIX] CHECKLIST: CÓ SEARCH + CHỌN TẤT CẢ + CÔNG THỨC ĐẸP ---
  function makeChecklist(container, name) {
    if (!container) return;
    container.innerHTML = "";

    // 1. Báo trống
    if (App.vectorList.length === 0) {
      container.innerHTML = '<div style="padding:15px; text-align:center; color:#999; font-style:italic;">(Chưa có vector nào)</div>';
      return;
    }

    // 2. Tools (Search + Select All) - Giữ nguyên như cũ
    const tools = document.createElement("div");
    tools.className = "checklist-tools";
    const searchInp = document.createElement("input");
    searchInp.type = "text";
    searchInp.className = "checklist-search";
    searchInp.placeholder = "🔍 Tìm trong danh sách...";

    const actions = document.createElement("div");
    actions.className = "checklist-actions";
    const lbl = document.createElement("label");
    lbl.textContent = "Chọn tất cả";
    const cbAll = document.createElement("input");
    cbAll.type = "checkbox";

    // Logic Select All
    const toggleAll = () => {
      const inputs = listDiv.querySelectorAll('.checkitem:not([style*="display: none"]) input[type="checkbox"]');
      const isChecked = cbAll.checked;
      inputs.forEach(input => input.checked = isChecked);
    };
    cbAll.onchange = toggleAll;
    lbl.onclick = (e) => {
      e.preventDefault(); // Ngăn label tự kích hoạt input (tránh double)
      cbAll.checked = !cbAll.checked;
      toggleAll();
    };

    actions.appendChild(lbl);
    actions.appendChild(cbAll);
    tools.appendChild(searchInp);
    tools.appendChild(actions);
    container.appendChild(tools);

    // 3. List
    const listDiv = document.createElement("div");
    listDiv.className = "checklist-scroll";

    const items = [];
    App.vectorList.forEach((it) => {
      const id = `chk_${name}_${it.id}`;

      const row = document.createElement("div");
      row.className = "checkitem";

      const left = document.createElement("div");
      left.className = "checkitem-left";

      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = `#${App.displayIndexOf(it)}`;

      const mf = document.createElement("math-field");
      mf.className = "checklist-math";
      mf.value = it.latex || App.formatVectorShort(it.vec);
      mf.setAttribute("read-only", "true");
      mf.setAttribute("virtual-keyboard-policy", "manual");

      left.appendChild(badge);
      left.appendChild(mf);

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.id = id;
      cb.value = it.id;

      // [QUAN TRỌNG] Logic Click Dòng
      row.onclick = (e) => {
        // Nếu click trực tiếp vào checkbox -> Kệ nó tự xử lý (để tránh đảo 2 lần)
        if (e.target === cb) return;

        // Nếu click vào vùng khác -> Đảo trạng thái checkbox thủ công
        cb.checked = !cb.checked;

        // Dispatch event để báo hiệu thay đổi (nếu có logic lắng nghe change)
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      };

      row.appendChild(left);
      row.appendChild(cb);
      listDiv.appendChild(row);

      items.push({
        row: row,
        text: mf.value.toLowerCase(),
        idStr: badge.textContent.toLowerCase()
      });
    });

    container.appendChild(listDiv);

    // 5. Search Logic
    searchInp.addEventListener("input", () => {
      const term = searchInp.value.trim().toLowerCase();
      items.forEach(item => {
        const match = item.text.includes(term) || item.idStr.includes(term);
        item.row.style.display = match ? "flex" : "none";
      });
    });
  }

  App.renderExtraCalcOptions = function () {
    const v1AngleSelect = document.getElementById("v1AngleSelect");
    const v2AngleSelect = document.getElementById("v2AngleSelect");
    const vNormSelect = document.getElementById("vNormSelect");
    const vCoordSelect = document.getElementById("vCoordSelect");
    const basisCoordChecklist = document.getElementById("basisCoordChecklist");
    const basisChecklist = document.getElementById("basisChecklist");
    const indepChecklist = document.getElementById("indepChecklist");
    const rankChecklist = document.getElementById("rankChecklist");
    const v1DotSelect = document.getElementById("v1DotSelect");
    const v2DotSelect = document.getElementById("v2DotSelect");

    addOptionsToSelect(v1AngleSelect);
    addOptionsToSelect(v2AngleSelect);
    addOptionsToSelect(vNormSelect);
    addOptionsToSelect(vCoordSelect);
    addOptionsToSelect(v1DotSelect);
    addOptionsToSelect(v2DotSelect);

    if (App.vectorList.length) {
      if (v1AngleSelect) v1AngleSelect.value = App.vectorList[0].id;
      if (v2AngleSelect) v2AngleSelect.value = (App.vectorList[1]?.id ?? App.vectorList[0].id);
      if (vNormSelect) vNormSelect.value = App.vectorList[0].id;
      if (vCoordSelect) vCoordSelect.value = App.vectorList[0].id;
      if (v1DotSelect) v1DotSelect.value = App.vectorList[0].id;
      if (v2DotSelect) v2DotSelect.value = (App.vectorList[1]?.id ?? App.vectorList[0].id);
    }

    makeChecklist(basisCoordChecklist, "coord");
    makeChecklist(basisChecklist, "basis");
    makeChecklist(indepChecklist, "indep");
    makeChecklist(rankChecklist, "rank");
  };

  App.updateCalcSelectLabels = function () {
    // 1. Cập nhật các Menu xổ xuống (Select Box) - Giữ nguyên logic cũ
    const selectIds = [
      "v1Select", "v2Select", "v1AngleSelect", "v2AngleSelect",
      "vNormSelect", "vCoordSelect", "v1DotSelect", "v2DotSelect"
    ];

    selectIds.forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      Array.from(sel.options).forEach((opt) => {
        const it = App.vectorList.find((v) => v.id === Number(opt.value));
        if (it) opt.textContent = App.optionLabelFor(it);
      });
    });

    // 2. [MỚI] Cập nhật các Checklist (Độc lập tuyến tính, Cơ sở, Hạng...)
    // Hàm con để tìm và sửa chữ trong checklist mà không làm mất dấu tích chọn
    const syncChecklistText = (prefix) => {
      App.vectorList.forEach(it => {
        const checkbox = document.getElementById(`chk_${prefix}_${it.id}`);
        if (checkbox) {
          const row = checkbox.closest('.checkitem');
          if (row) {
            // [SỬA LẠI ĐOẠN NÀY] Tìm thẻ math-field thay vì .vec-text
            const mf = row.querySelector('math-field');
            if (mf) {
              // Cập nhật giá trị mới (ưu tiên latex)
              mf.value = it.latex || App.formatVectorShort(it.vec);
            }
          }
        }
      });
    };

    // Chạy đồng bộ cho tất cả các loại checklist đang có
    syncChecklistText("indep"); // Độc lập tuyến tính
    syncChecklistText("basis"); // Hệ cơ sở
    syncChecklistText("rank");  // Tìm hạng
    syncChecklistText("coord"); // Tìm tọa độ
  };

  App.showExtraForm = function (op) {
    const extraForms = document.getElementById("extraForms");
    if (!extraForms) return;
    const forms = extraForms.querySelectorAll(".extra-form");
    forms.forEach((f) => f.classList.remove("active"));
    const active = document.getElementById(`form-${op}`);
    if (active) active.classList.add("active");
  };

})();