(function () {
  window.App = window.App || {};

  // =========================================================================
  // 1. CSS CHO TAB & QUY HOẠCH GIAO DIỆN (BẢN TỐI ƯU UX)
  // =========================================================================
  function injectSidebarStyles() {
    if (document.getElementById("sidebar-dynamic-styles")) {
        document.getElementById("sidebar-dynamic-styles").remove();
    }

    const style = document.createElement("style");
    style.id = "sidebar-dynamic-styles";
    style.textContent = `
    /* --- MASTER LAYOUT --- */
    @media (min-width: 1100px) { #controls { width: 420px !important; } }
    #controls { padding: 0 !important; overflow: hidden !important; display: flex; flex-direction: column; }
    .sidebar-master-layout { display: flex; flex-direction: row; height: 100%; width: 100%; background: var(--bg); }
    
    /* --- VERTICAL ACTIVITY BAR (ĐÃ FIX VẠCH THẲNG) --- */
    .sidebar-tabs.vertical {
        flex: 0 0 72px; background: var(--card); border-right: 1px solid var(--border);
        display: flex; flex-direction: column; align-items: flex-start; padding-top: 75px; z-index: 100;
    }
    .sidebar-tabs.vertical .tab-btn {
        width: calc(100% - 8px); height: 56px; margin-bottom: 12px;
        /* Gọt phẳng lề trái, chỉ bo tròn lề phải */
        border-radius: 0 12px 12px 0; 
        display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 6px;
        color: var(--muted); background: transparent; border: none; cursor: pointer; transition: all 0.2s;
    }
    .sidebar-tabs.vertical .tab-btn i { font-size: 20px; transition: transform 0.2s; }
    .sidebar-tabs.vertical .tab-btn span { font-size: 10px; font-weight: 700; text-transform: uppercase; line-height: 1.2; text-align: center; }
    
    .sidebar-tabs.vertical .tab-btn:hover { color: var(--fg); background: var(--hover, rgba(128,128,128,0.1)); }
    
    /* Dùng box-shadow inset để tạo vạch thẳng tắp đè lên nền */
    .sidebar-tabs.vertical .tab-btn.active { 
        color: #2196F3; background: rgba(33, 150, 243, 0.12); 
        box-shadow: inset 4px 0 0 #2196F3; 
    }
    body.dark .sidebar-tabs.vertical .tab-btn.active { 
        color: #60a5fa; background: rgba(96, 165, 250, 0.15); 
        box-shadow: inset 4px 0 0 #60a5fa; 
    }

    /* --- KHU VỰC NỘI DUNG --- */
    .sidebar-content-area { flex: 1; display: flex; flex-direction: column; min-width: 0; background: var(--bg); }
    .tab-content { display: none !important; flex: 1; overflow-y: auto; overflow-x: hidden; padding: 24px !important; -webkit-overflow-scrolling: touch; }
    .tab-content.active { display: block !important; animation: fadeIn 0.2s ease-out; }
    .tab-content .card { box-shadow: none !important; border: none !important; background: transparent !important; padding: 0 !important; margin-bottom: 30px !important; }
    .tab-content details > summary { display: none !important; }
    .tab-content details { border: none !important; padding: 0 !important; }

    .calc-param-block { background: var(--card); border: 1px solid var(--border); padding: 16px; border-radius: 12px; display: flex; flex-direction: column; gap: 16px; box-shadow: var(--shadow-sm); margin-bottom: 16px; margin-top: 10px; }
    #controls label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; display: block; letter-spacing: 0.5px; }

    /* --- NÚT CHỨC NĂNG PHỤ (GỌN GÀNG) --- */
    .btn-sub-action {
        flex: 1; padding: 8px 10px; font-size: 11.5px; font-weight: 600; border-radius: 8px;
        background: transparent; border: 1px dashed var(--border); color: var(--muted);
        cursor: pointer; transition: all 0.2s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .btn-sub-action:hover { border-style: solid; color: var(--fg); background: var(--card); box-shadow: var(--shadow-sm); }
    .btn-sub-danger { color: #ef4444; border-color: rgba(239, 68, 68, 0.3); }
    .btn-sub-danger:hover { background: #fee2e2; border-color: #ef4444; color: #dc2626; }
    body.dark .btn-sub-danger:hover { background: rgba(239,68,68,0.2); }

    /* --- CUSTOM DROPDOWN --- */
    .v-select-wrapper { position: relative; width: 100%; font-family: inherit; }
    .v-select-trigger { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; color: var(--fg); transition: all 0.2s; }
    .v-select-trigger:hover, .v-select-wrapper.open .v-select-trigger { border-color: #2196F3; box-shadow: 0 0 0 2px rgba(33,150,243,0.1); }
    .v-select-trigger i { color: var(--muted); transition: transform 0.3s; }
    .v-select-wrapper.open .v-select-trigger i { transform: rotate(180deg); color: #2196F3; }
    .v-select-options { position: fixed; background: var(--card); border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); max-height: 250px; overflow-y: auto; z-index: 999999; opacity: 0; pointer-events: none; transform: translateY(-10px); transition: all 0.2s ease; }
    .v-select-options.show { opacity: 1; pointer-events: auto; transform: translateY(0); }
    .v-select-option { padding: 12px 14px; cursor: pointer; font-size: 14px; color: var(--fg); border-bottom: 1px solid var(--border); transition: background 0.15s; }
    .v-select-option:last-child { border-bottom: none; }
    .v-select-option:hover { background: rgba(33,150,243,0.1); color: #2196F3; padding-left: 20px; transition: padding 0.2s; }
    .v-select-option.selected { font-weight: 700; color: #2196F3; background: rgba(33,150,243,0.05); border-left: 3px solid #2196F3; }

    /* --- RESPONSIVE MOBILE --- */
    @media (max-width: 768px) {
        #controls { 
            width: 100vw !important; 
            max-width: 100vw !important; 
            border-right: none !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
        }
        .sidebar-master-layout { flex-direction: column-reverse !important; }
        .sidebar-content-area { height: calc(100% - 65px); }
        .sidebar-tabs.vertical {
            flex: 0 0 65px; flex-direction: row; justify-content: space-around;
            border-right: none; border-top: 1px solid var(--border); padding-top: 0; box-shadow: 0 -4px 15px rgba(0,0,0,0.05); z-index: 1000;
        }
        .sidebar-tabs.vertical .tab-btn { width: auto; flex: 1; height: 100%; margin-bottom: 0; border-radius: 0; gap: 4px; }
        .sidebar-tabs.vertical .tab-btn.active { box-shadow: inset 0 3px 0 #2196F3; }
        body.dark .sidebar-tabs.vertical .tab-btn.active { box-shadow: inset 0 3px 0 #60a5fa; }
        .tab-content { padding: 20px 16px 80px 16px !important; }
    }
    
    /* --- VECTOR LIST GIAO DIỆN CŨ --- */
    .checklist-actions input[type="checkbox"] { width: 18px !important; height: 18px !important; margin: 0 !important; cursor: pointer; accent-color: #2196F3; }
    .search-box-modern { border: 1px solid var(--border) !important; transition: all 0.2s; border-radius: 8px; position: relative; margin-bottom: 12px;}
    .search-box-modern:focus-within { border-color: #2196F3 !important; box-shadow: 0 0 0 2px rgba(33,150,243,0.1) !important; }
    .vec-search-inp { width: 100%; padding: 10px 12px 10px 36px !important; border: none !important; background: transparent !important; box-shadow: none !important; color: var(--fg) !important;}
    .vec-search-inp:focus { outline: none !important; }
    .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); }
    
    .vec-filters { display: flex; gap: 6px; overflow-x: auto; margin-bottom: 16px; padding-bottom: 4px; }
    .filter-chip { padding: 6px 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--card); color: var(--muted); font-size: 11px; font-weight: 600; white-space: nowrap; cursor: pointer; transition: all 0.2s; }
    .filter-chip:hover { background: var(--hover, rgba(128,128,128,0.1)); color: var(--fg);}
    .filter-chip.active { background: #2196F3; color: white; border-color: #2196F3; }

    .vec-item { margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; border-radius: 8px; background: var(--card); border: 1px solid var(--border); transition: all 0.2s; box-shadow: var(--shadow-sm); }
    .vec-item:hover { border-color: #2196F3; box-shadow: 0 2px 8px rgba(33, 150, 243, 0.15); }
    .vec-item.active { background: rgba(33, 150, 243, 0.05) !important; border-color: #2196F3; border-left: 4px solid #2196F3; }
    
    .vec-main { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
    .vec-header { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; width: 100%; }
    .vec-actions { display: flex; gap: 4px; opacity: 0.6; transition: opacity 0.2s; }
    .vec-item:hover .vec-actions { opacity: 1; }
    .vec-actions .btn { padding: 4px 8px; background: transparent; border: none; font-size: 14px; }
    .vec-actions .btn:hover { background: var(--hover, rgba(128,128,128,0.1)); border-radius: 6px;}

    /* [ĐÃ FIX: ÉP MATHLIVE VƯƠN TOÀN MÀN HÌNH VÀ CĂN TRÁI] */
    .vec-input-wrapper { flex: 1 1 auto; width: 100%; display: flex; align-items: center; background: transparent !important; border: 1px solid var(--border); border-radius: 6px; padding: 0; min-height: 42px; overflow: hidden; }
    .vec-input-wrapper:focus-within { border-color: #2196F3; }
    
    /* Ép thẻ MathLive giãn hết cỡ */
    .vec-math-field { flex: 1; width: 100%; min-width: 100%; border: none !important; background: transparent !important; padding: 4px 8px; font-size: 1.1em; outline: none; color: var(--fg) !important; }
    
    /* Can thiệp sâu vào Shadow DOM của MathLive để ép chữ sát lề trái */
    math-field::part(content) { justify-content: flex-start !important; width: 100% !important; padding-left: 4px; }
    math-field::part(container) { width: 100% !important; }

    .vec-menu-btn { padding: 0 12px; cursor: pointer; color: var(--muted); background: transparent; border: none; border-left: 1px solid var(--border); font-size: 16px; display: flex; align-items: center; height: 100%; }
    
    .vec-dropdown { display: none; position: fixed !important; width: 240px; background: var(--card) !important; border: 1px solid var(--border) !important; box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important; border-radius: 8px; z-index: 999999 !important; padding: 5px 0; transform: scale(0.95); opacity: 0; transition: transform 0.15s ease-out, opacity 0.15s ease-out; }
    .vec-dropdown.show { display: block; transform: scale(1); opacity: 1; }
    .vec-dropdown-item { padding: 10px 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); font-size: 0.95em; color: var(--fg); }
    .vec-dropdown-item:hover { background: rgba(33, 150, 243, 0.1); color: #2196F3; }
    
    .checkitem { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 6px; background: var(--card); cursor: pointer !important; transition: all 0.2s; box-shadow: var(--shadow-sm); }
    .checkitem:hover { border-color: #2196F3; }
    .checkitem-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; pointer-events: none; }
    .checkitem input[type="checkbox"] { width: 18px !important; height: 18px !important; margin: 0; cursor: pointer; accent-color: #2196F3; pointer-events: auto; }
    .checklist-math { border: none !important; background: transparent !important; font-size: 1.1em; color: var(--fg) !important; outline: none; pointer-events: none !important; width: 100%; }

    /* Khung kết quả đẹp */
    .nice-result-box { margin-top: 16px; padding: 16px; background: rgba(76, 175, 80, 0.1); border-left: 4px solid #4caf50; border-radius: 8px; color: var(--fg); line-height: 1.5; font-size: 15px; }
    .extra-form pre { font-family: "JetBrains Mono", monospace; font-size: 15px; background: var(--card); border: 1px dashed var(--border); border-radius: 8px; padding: 16px; text-align: left; margin-top: 16px; white-space: pre-wrap; color: var(--fg); box-shadow: var(--shadow-sm); }

    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.3); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.5); }
    
    /* --- DYNAMIC MATRIX GRID LAYOUT (RADIX THEME) --- */
    .matrix-setup-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: nowrap; white-space: nowrap; }
    .matrix-size-input { width: 50px; padding: 6px; border-radius: 6px; border: 1px solid var(--border-strong); background: var(--card); color: var(--fg); font-weight: 600; text-align: center; outline: none; }
    .matrix-size-input:focus { border-color: var(--primary-base); }
    
    .matrix-grid-container { 
        display: grid; gap: 6px; margin: 16px 0; padding: 12px; 
        background: var(--bg-hover); border: 1px solid var(--border-subtle); border-radius: 8px;
        transition: all 0.2s ease-in-out;
        overflow: auto; max-height: 400px; width: 100%; box-sizing: border-box;
    }
    .calc-mode-panel { display: none; }
    .calc-mode-panel.active { display: block; }
    .calc-object-inline { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .calc-object-inline select { flex: 1; min-width: 180px; }
    .calc-helper-text { font-size: 12px; color: var(--muted); margin-top: 6px; }
    
    /* Cấu trúc 1 lớp, width 100% để fill cột, text-align: center để tự động chừa đều 2 bên mép */
    .matrix-cell { 
        width: 100%; min-height: 40px; box-sizing: border-box; padding: 4px;
        border: 1px solid var(--border-strong); border-radius: 6px; text-align: center;
        background: var(--card); color: var(--fg); outline: none;
        transition: border-color 0.15s, box-shadow 0.15s; font-size: 15px; font-weight: 600;
        cursor: text;
    }
    .matrix-cell:focus { border-color: var(--primary-base); box-shadow: 0 0 0 2px rgba(33,150,243,0.15); }
    body.dark-theme .matrix-cell:focus { box-shadow: 0 0 0 2px rgba(96,165,250,0.25); }
    
    .mat-preview .matrix-cell { font-size: 13px; min-height: 28px; }
    
    .matrix-action-bar { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }

    /* --- MATRIX LIST (Danh sách ma trận) --- */
    #matrixList { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; padding-right: 2px; }

    .mat-item {
        display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px;
        border: 1px solid var(--border); border-radius: 10px; background: var(--card);
        transition: border-color 0.2s, box-shadow 0.2s, opacity 0.25s, transform 0.25s;
    }
    .mat-item:hover { border-color: #7c3aed; box-shadow: 0 2px 10px rgba(124, 58, 237, 0.12); }
    body.dark .mat-item:hover { box-shadow: 0 2px 10px rgba(139, 92, 246, 0.2); }

    .mat-swatch { width: 14px; height: 14px; border-radius: 4px; flex-shrink: 0; margin-top: 3px; border: 1px solid rgba(0,0,0,0.1); }

    .mat-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }

    .mat-header { display: flex; align-items: center; gap: 8px; }
    .mat-tag {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 13px; font-weight: 700; color: var(--fg);
        padding: 2px 8px; border-radius: 6px; background: rgba(124, 58, 237, 0.1);
    }
    body.dark .mat-tag { background: rgba(139, 92, 246, 0.15); }
    .mat-dim {
        font-size: 11px; font-weight: 600; color: var(--muted);
        padding: 2px 6px; border-radius: 4px; background: var(--border);
        font-family: ui-monospace, monospace;
    }

    .mat-preview {
        display: grid; gap: 6px; padding: 12px; margin: 0;
        background: var(--bg-hover); border: 1px solid var(--border-subtle); border-radius: 8px;
        width: 100%; box-sizing: border-box;
        overflow: auto; max-height: 300px;
    }
    .mat-cell {
        text-align: center; font-size: 12px; font-weight: 600;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        color: var(--fg); padding: 2px 6px; min-width: 28px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .mat-cell-math {
        display: block; width: 100%; min-width: 28px; min-height: 24px;
        text-align: center; font-size: 13px; font-weight: 600;
        color: var(--fg); 
        /* Không dùng overflow hidden để MathLive tự render đầy đủ */
    }

    .mat-actions { display: flex; align-items: flex-start; gap: 4px; flex-shrink: 0; opacity: 0.4; transition: opacity 0.2s; }
    .mat-item:hover .mat-actions { opacity: 1; }
    .mat-btn-del {
        padding: 4px 8px; background: transparent; border: none; font-size: 14px;
        color: #ef4444; cursor: pointer; border-radius: 6px; transition: background 0.15s;
    }
    .mat-btn-del:hover { background: #fee2e2; }
    body.dark .mat-btn-del:hover { background: rgba(239, 68, 68, 0.2); }

    .mat-empty {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 24px 16px; color: var(--muted); font-size: 13px; font-weight: 500;
        border: 1px dashed var(--border); border-radius: 10px;
    }
    
    `;
    document.head.appendChild(style);
  }

  // =========================================================================
  // 2. KHỞI TẠO MASTER LAYOUT (HIỂN THỊ LŨY TIẾN & DỌN DẸP NÚT GỌN GÀNG)
  // =========================================================================
  function initSidebarLayout() {
    const sidebar = document.getElementById("controls");
    if (!sidebar) return;

    if (sidebar.querySelector(".sidebar-master-layout")) return;

    const cardCreate = sidebar.querySelector(".section-create");
    const cardList = sidebar.querySelector(".section-list");
    const cardSpace = sidebar.querySelector(".section-calc-info"); 
    const cardCalc = sidebar.querySelector(".section-calc-new"); 

    // --- XỬ LÝ 3 NÚT KHỞI TẠO (TRẢ VỀ ĐÚNG CHỖ GỌN GÀNG) ---
    if (cardCreate) {
        const btnDraw = cardCreate.querySelector("#btnDraw");
        const btnAuto = cardCreate.querySelector("#btnAuto");
        const btnClearAll = cardCreate.querySelector("#btnClearAll");
        
        if (btnDraw && btnAuto && btnClearAll) {
            const rowWrap = btnDraw.parentNode;
            
            // Ép nút Thêm Vector bự lên trên cùng
            btnDraw.style.width = "100%";
            btnDraw.style.padding = "12px";
            btnDraw.style.fontSize = "15px";
            btnDraw.style.marginBottom = "10px";
            btnDraw.innerHTML = '<i class="fa-solid fa-plus" style="margin-right:6px;"></i> Thêm Vector';

            // Biến 2 nút còn lại thành nút phụ (Ghost button)
            btnAuto.className = "btn-sub-action";
            btnClearAll.className = "btn-sub-action btn-sub-danger";
            
            // Xóa rác text ban đầu nếu dài quá
            if (btnAuto.textContent.includes("BẬT")) btnAuto.innerHTML = 'Auto 2D/3D: Bật';
            if (btnAuto.textContent.includes("TẮT")) btnAuto.innerHTML = 'Auto 2D/3D: Tắt';
            btnClearAll.innerHTML = '<i class="fa-solid fa-trash-can" style="margin-right:4px;"></i> Xóa hết';

            // Tạo một hàng con chứa 2 nút phụ
            const subRow = document.createElement("div");
            subRow.style.display = "flex";
            subRow.style.width = "100%";
            subRow.style.gap = "8px";
            subRow.appendChild(btnAuto);
            subRow.appendChild(btnClearAll);

            // Xếp lại DOM
            rowWrap.innerHTML = "";
            rowWrap.style.display = "block"; // Hủy flex row rác của CSS cũ
            rowWrap.appendChild(btnDraw);
            rowWrap.appendChild(subRow);
            
            // Nghe lén sự kiện đổi Text của btnAuto để format lại cho ngắn
            const autoObserver = new MutationObserver(() => {
                if (btnAuto.textContent === "Tự động chuyển chiều không gian: BẬT") {
                    btnAuto.innerHTML = 'Auto 2D/3D: Bật';
                } else if (btnAuto.textContent === "Tự động chuyển chiều không gian: TẮT") {
                    btnAuto.innerHTML = 'Auto 2D/3D: Tắt';
                }
            });
            autoObserver.observe(btnAuto, { childList: true, characterData: true });
        }
    }

    // Gọt bỏ thẻ <details> rườm rà
    [cardSpace, cardCalc].forEach(card => {
        if (!card) return;
        const details = card.querySelector("details");
        if (details) {
            const children = Array.from(details.children).filter(c => c.tagName.toLowerCase() !== 'summary');
            children.forEach(c => card.appendChild(c));
            details.remove();
        }
    });

    // Gom nhóm tham số thành Block xám mờ mờ (Progressive Disclosure)
    if (cardCalc) {
        const opSelDiv = cardCalc.querySelector('#opSelect')?.parentNode;
        const scalarBox = cardCalc.querySelector('#scalarBox');
        const grid2 = cardCalc.querySelector('.grid2');
        
        const paramBlock = document.createElement("div");
        paramBlock.className = "calc-param-block";
        if (opSelDiv) {
            opSelDiv.parentNode.insertBefore(paramBlock, opSelDiv);
            paramBlock.appendChild(opSelDiv);
        }
        if (scalarBox) paramBlock.appendChild(scalarBox);
        if (grid2) paramBlock.appendChild(grid2);
        
        const btnCompute = cardCalc.querySelector('#btnCompute');
        if(btnCompute) {
            btnCompute.style.width = "100%";
            btnCompute.style.padding = "14px";
            btnCompute.style.fontSize = "15px";
        }
    }

    // Dựng khung tổng
    const layout = document.createElement("div");
    layout.className = "sidebar-master-layout";

    const tabNav = document.createElement("div");
    tabNav.className = "sidebar-tabs vertical";

    const btnList = document.createElement("button");
    btnList.className = "tab-btn active";
    btnList.innerHTML = '<i class="fa-solid fa-layer-group"></i><span>Vector</span>';

    const btnSpace = document.createElement("button");
    btnSpace.className = "tab-btn";
    btnSpace.innerHTML = '<i class="fa-solid fa-cube"></i><span>Cơ sở</span>';

    const btnCalc = document.createElement("button");
    btnCalc.className = "tab-btn";
    btnCalc.innerHTML = '<i class="fa-solid fa-calculator"></i><span>Toán</span>';

    tabNav.append(btnList, btnSpace, btnCalc);

    const contentArea = document.createElement("div");
    contentArea.className = "sidebar-content-area";

    const tabContentList = document.createElement("div");
    tabContentList.className = "tab-content active";

    const initChooser = document.createElement("div");
    initChooser.className = "calc-param-block";
    initChooser.innerHTML = `
      <div class="calc-object-inline">
        <label style="margin:0;">Chọn loại khởi tạo:</label>
        <select id="createObjectSelect">
          <option value="vector">Vector</option>
          <option value="matrix">Ma trận</option>
        </select>
      </div>
    `;

    const createVectorPanel = document.createElement("div");
    createVectorPanel.id = "createVectorPanel";
    createVectorPanel.className = "calc-mode-panel active";
    if (cardCreate) createVectorPanel.appendChild(cardCreate);
    if (cardList) createVectorPanel.appendChild(cardList);

    const createMatrixPanel = document.createElement("div");
    createMatrixPanel.id = "createMatrixPanel";
    createMatrixPanel.className = "calc-mode-panel";
    createMatrixPanel.innerHTML = `
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <label style="margin: 0;"><b>KHỞI TẠO MA TRẬN</b></label>
        </div>
        <div class="calc-param-block" style="margin-top:10px;">
          <div class="matrix-setup-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size:13px; font-weight:600; color:var(--muted);">Kích thước:</span>
              <input type="number" id="matrixCreateRows" class="matrix-size-input" style="width:40px; padding: 4px;" value="3" min="2" max="5">
              <span style="color:var(--muted); font-weight:700;">×</span>
              <input type="number" id="matrixCreateCols" class="matrix-size-input" style="width:40px; padding: 4px;" value="3" min="2" max="5">
            </div>
            <div style="position: relative; flex-shrink: 0; margin-left: 8px;">
              <button id="matrixMenuBtn" class="custom-menu-btn" title="Chèn công thức toán học" style="padding: 4px 8px; border-radius: 4px; background: transparent; border: 1px solid var(--border); color: var(--fg); cursor: pointer;">
                <i class="fa-solid fa-bars"></i>
              </button>
              <div id="matrixCustomMenu" class="custom-menu-dropdown" style="display: none; position: absolute; top: 100%; right: 0; margin-top: 10px; z-index: 1000;">
                <div class="menu-item" onclick="insertLatex('\\\\sqrt{#0}')">
                  <span>Căn bậc 2</span> <span class="latex-preview">√x</span>
                </div>
                <div class="menu-item" onclick="insertLatex('\\\\sqrt[#?]{#0}')">
                  <span>Căn bậc n</span> <span class="latex-preview">ⁿ√x</span>
                </div>
                <hr style="margin: 5px 0; border-top: 1px solid var(--border);">
                <div class="menu-item" onclick="insertLatex('\\\\sin(#0)')">
                  <span>Sin</span> <span class="latex-preview">sin</span>
                </div>
                <div class="menu-item" onclick="insertLatex('\\\\cos(#0)')">
                  <span>Cos</span> <span class="latex-preview">cos</span>
                </div>
                <div class="menu-item" onclick="insertLatex('\\\\tan(#0)')">
                  <span>Tan</span> <span class="latex-preview">tan</span>
                </div>
                <div class="menu-item" onclick="insertLatex('\\\\cot(#0)')">
                  <span>Cot</span> <span class="latex-preview">cot</span>
                </div>
                <hr style="margin: 5px 0; border-top: 1px solid var(--border);">
                <div class="menu-item" onclick="insertLatex('\\\\pi')">
                  <span>Số Pi</span> <span class="latex-preview">π</span>
                </div>
                <div class="menu-item" onclick="insertLatex('e')">
                  <span>Số e</span> <span class="latex-preview">e</span>
                </div>
              </div>
            </div>
          </div>
          <div id="matrixCreateGrid" class="matrix-grid-container"></div>
        </div>
        <div style="margin-top:12px; display:block;">
          <button id="btnAddMatrix" class="btn primary" style="width:100%; padding:12px; font-size:15px; margin-bottom:10px;">
            <i class="fa-solid fa-plus" style="margin-right:6px;"></i> Thêm Ma Trận
          </button>
          <div style="display:flex; gap:8px;">
            <button id="btnClearAllMatrices" class="btn-sub-action btn-sub-danger" style="flex:1;">
              <i class="fa-solid fa-trash-can" style="margin-right:4px;"></i> Xóa hết
            </button>
          </div>
        </div>
      </div>
      <div class="card" style="margin-top: 16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 12px;">
          <label style="margin: 0; font-weight: 600;">Danh sách ma trận</label>
        </div>
        <ul id="matrixList"></ul>
      </div>
    `;

    tabContentList.append(initChooser, createVectorPanel, createMatrixPanel);

    // Xử lý logic đóng/mở menu của Matrix
    setTimeout(() => {
      const matBtn = document.getElementById('matrixMenuBtn');
      const matMenu = document.getElementById('matrixCustomMenu');
      if (matBtn && matMenu) {
        matBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          matMenu.style.display = matMenu.style.display === 'block' ? 'none' : 'block';
        });
        document.addEventListener('click', (e) => {
          if (!matBtn.contains(e.target) && !matMenu.contains(e.target)) {
            matMenu.style.display = 'none';
          }
        });
      }
    }, 0);

    const tabContentSpace = document.createElement("div");
    tabContentSpace.className = "tab-content";
    if (cardSpace) tabContentSpace.appendChild(cardSpace);

    const tabContentCalc = document.createElement("div");
    tabContentCalc.className = "tab-content";
    tabContentCalc.innerHTML = `
      <div class="card">
        <label><b>PHÉP TÍNH</b></label>
        <div class="calc-param-block" style="margin-top:10px;">
          <div class="calc-object-inline">
            <label style="margin:0;">Đối tượng:</label>
            <select id="calcObjectSelect">
              <option value="vector">Vector</option>
              <option value="matrix">Ma trận</option>
              <option value="mixed">Vector + Ma trận</option>
            </select>
          </div>
          <div class="calc-helper-text">Chọn chế độ để hiển thị đúng loại phép tính.</div>
        </div>

        <div id="calcVectorPanel" class="calc-mode-panel active">
          <div class="calc-param-block" style="margin-top:10px;">
            <div>
              <label>Chọn phép tính:</label>
              <select id="opSelect">
                <option value="add">Cộng 2 vector</option>
                <option value="scale">Kéo dãn</option>
                <option value="projection">Hình chiếu</option>
                <option value="normalize">Chuẩn hoá vector</option>
                <option value="dot">Tích vô hướng của 2 vector</option>
                <option value="cross">Tích có hướng của 2 vector</option>
                <option value="vector_norm">Độ dài vector</option>
                <option value="angle_between">Góc giữa 2 vector</option>
              </select>
            </div>
            <div id="scalarBox" style="display:none">
              <label>Hệ số k</label>
              <input id="scalarInp" type="text" inputmode="decimal" value="2" placeholder="Nhập k..." />
            </div>
          </div>
          <div class="grid2" style="margin-top:8px">
            <div>
              <label>Vector 1 (v1)</label>
              <select id="v1Select"></select>
            </div>
            <div id="v2Box">
              <label>Vector 2 (v2)</label>
              <select id="v2Select"></select>
            </div>
          </div>
          <div class="row" style="margin-top:10px">
            <button id="btnCompute" class="btn primary" data-require-vectors="true">Thực hiện</button>
            <div id="calcSteps" class="help">Kết quả phép tính sẽ hiển thị ở đây.</div>
          </div>
        </div>

        <div id="calcMatrixPanel" class="calc-mode-panel">
          <div class="calc-param-block" style="margin-top:10px;">
            <div>
              <label>Chọn phép toán ma trận:</label>
              <select id="matrixOpSelect">
                <option value="det">Tính Định thức (Det)</option>
                <option value="inv">Tìm Ma trận Nghịch đảo</option>
                <option value="rank">Tìm Hạng Ma trận (Rank)</option>
                <option value="transpose">Ma trận Chuyển vị</option>
                <option value="mul_vector">Ma trận ✕ Vector</option>
                <option value="mul_matrix">Ma trận ✕ Ma trận (A ✕ B)</option>
              </select>
            </div>
            <div id="matrixVectorInputWrap" class="calc-param-block" style="display:none; margin-top:10px;">
              <label>Vector b</label>
              <input id="matrixVectorInput" type="text" value="[1, 2, 3]" placeholder="VD: [1, 2, 3]" />
            </div>
            <div class="matrix-setup-row" style="margin-top:12px;">
              <span style="font-size:13px; font-weight:600; color:var(--muted);">Ma trận A</span>
              <input type="number" id="matrixCalcRowsA" class="matrix-size-input" value="3" min="2" max="5">
              <span style="color:var(--muted);">✕</span>
              <input type="number" id="matrixCalcColsA" class="matrix-size-input" value="3" min="2" max="5">
            </div>
            <div id="matrixCalcGridA" class="matrix-grid-container"></div>
            <div id="matrixCalcBlockB" class="calc-param-block" style="display:none; margin-top:8px;">
              <div class="matrix-setup-row">
                <span style="font-size:13px; font-weight:600; color:var(--muted);">Ma trận B</span>
                <input type="number" id="matrixCalcRowsB" class="matrix-size-input" value="3" min="2" max="5">
                <span style="color:var(--muted);">✕</span>
                <input type="number" id="matrixCalcColsB" class="matrix-size-input" value="3" min="2" max="5">
              </div>
              <div id="matrixCalcGridB" class="matrix-grid-container"></div>
            </div>
          </div>
          <div class="matrix-action-bar">
            <button id="btnMatrixCompute" class="btn primary" data-require-vectors="false" style="width:100%; padding:12px; font-size:15px;">
              <i class="fa-solid fa-play" style="margin-right:6px;"></i> Tính toán Ma trận
            </button>
          </div>
          <div id="matrixResultBox" class="nice-result-box" style="display:none; margin-top:16px;"></div>
        </div>

        <div id="calcMixedPanel" class="calc-mode-panel">
          <div class="calc-param-block" style="margin-top:10px;">
            <div>
              <label>Phép tính hỗn hợp:</label>
              <select id="mixedOpSelect">
                <option value="mul_vector">Ma trận × Vector</option>
              </select>
            </div>
            <div class="matrix-setup-row" style="margin-top:12px;">
              <span style="font-size:13px; font-weight:600; color:var(--muted);">Ma trận</span>
              <input type="number" id="matrixMixedRows" class="matrix-size-input" value="3" min="2" max="5">
              <span style="color:var(--muted);">✕</span>
              <input type="number" id="matrixMixedCols" class="matrix-size-input" value="3" min="2" max="5">
            </div>
            <div id="matrixMixedGrid" class="matrix-grid-container"></div>
            <div style="margin-top:8px;">
              <label>Vector b</label>
              <input id="mixedVectorInput" type="text" value="[1, 2, 3]" placeholder="VD: [1, 2, 3]" />
            </div>
          </div>
          <div class="matrix-action-bar">
            <button id="btnMixedCompute" class="btn primary" data-require-vectors="false" style="width:100%; padding:12px; font-size:15px;">
              <i class="fa-solid fa-play" style="margin-right:6px;"></i> Tính hỗn hợp
            </button>
          </div>
          <div id="mixedResultBox" class="nice-result-box" style="display:none; margin-top:16px;"></div>
        </div>
      </div>
    `;

    contentArea.append(tabContentList, tabContentSpace, tabContentCalc);
    layout.append(tabNav, contentArea);

    sidebar.innerHTML = "";
    sidebar.appendChild(layout);

    const tabs = [btnList, btnSpace, btnCalc];
    const panels = [tabContentList, tabContentSpace, tabContentCalc];

    tabs.forEach((btn, index) => {
      btn.onclick = () => {
        tabs.forEach((t) => t.classList.remove("active"));
        panels.forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        panels[index].classList.add("active");
      };
    });

    const createObjectSelect = document.getElementById("createObjectSelect");
    const calcObjectSelect = document.getElementById("calcObjectSelect");

    const toggleCreatePanels = () => {
      const isMatrix = createObjectSelect?.value === "matrix";
      const vectorPanel = document.getElementById("createVectorPanel");
      const matrixPanel = document.getElementById("createMatrixPanel");
      if (vectorPanel) vectorPanel.classList.toggle("active", !isMatrix);
      if (matrixPanel) matrixPanel.classList.toggle("active", isMatrix);
      
      if (!isMatrix) {
        window.activeMathField = document.getElementById('vectorInput');
      }
    };

    const toggleCalcPanels = () => {
      const mode = calcObjectSelect?.value || "vector";
      const vectorPanel = document.getElementById("calcVectorPanel");
      const matrixPanel = document.getElementById("calcMatrixPanel");
      const mixedPanel = document.getElementById("calcMixedPanel");
      if (vectorPanel) vectorPanel.classList.toggle("active", mode === "vector");
      if (matrixPanel) matrixPanel.classList.toggle("active", mode === "matrix");
      if (mixedPanel) mixedPanel.classList.toggle("active", mode === "mixed");
    };

    createObjectSelect?.addEventListener("change", toggleCreatePanels);
    calcObjectSelect?.addEventListener("change", toggleCalcPanels);
    toggleCreatePanels();
    toggleCalcPanels();

    const opSelect = document.getElementById("opSelect");
    if (opSelect && typeof App.refreshCalcUI === "function") {
      opSelect.onchange = App.refreshCalcUI;
    }

    const btnCompute = document.getElementById("btnCompute");
    if (btnCompute) {
      btnCompute.onclick = () => App.runCalc(true);
    }

    const btnMatrixCompute = document.getElementById("btnMatrixCompute");
    if (btnMatrixCompute) {
      btnMatrixCompute.onclick = () => App.runMatrixCalc();
    }

    const btnMixedCompute = document.getElementById("btnMixedCompute");
    if (btnMixedCompute) {
      btnMixedCompute.onclick = () => App.runMixedCalc();
    }

    const matrixOpSelect = document.getElementById("matrixOpSelect");
    const matrixCalcBlockB = document.getElementById("matrixCalcBlockB");
    const matrixVectorInputWrap = document.getElementById("matrixVectorInputWrap");
    const toggleMatrixSecondaryGrid = () => {
      const showB = matrixOpSelect?.value === "mul_matrix";
      const showVectorInput = matrixOpSelect?.value === "mul_vector";
      if (matrixCalcBlockB) matrixCalcBlockB.style.display = showB ? "block" : "none";
      if (matrixVectorInputWrap) matrixVectorInputWrap.style.display = showVectorInput ? "block" : "none";
    };
    matrixOpSelect?.addEventListener("change", toggleMatrixSecondaryGrid);
    toggleMatrixSecondaryGrid();

    // --- WIRE MATRIX CREATE EVENTS ---
    const btnAddMatrix = document.getElementById("btnAddMatrix");
    if (btnAddMatrix && typeof App.onAddMatrix === "function") {
      btnAddMatrix.addEventListener("click", App.onAddMatrix);
    }
    const btnClearAllMatrices = document.getElementById("btnClearAllMatrices");
    if (btnClearAllMatrices && typeof App.clearAllMatrices === "function") {
      btnClearAllMatrices.addEventListener("click", App.clearAllMatrices);
    }

    // Render empty matrix list
    if (typeof App.renderMatrixList === "function") {
      App.renderMatrixList();
    }

    if (typeof App.refreshCalcVectorOptions === "function") App.refreshCalcVectorOptions();
    if (typeof App.renderExtraCalcOptions === "function") App.renderExtraCalcOptions();

    // Khởi tạo handlers cho grid ma trận SAU KHI panel đã được add vào DOM
    if (typeof App.attachMatrixGridHandlers === "function") {
      App.attachMatrixGridHandlers({ gridId: "matrixCreateGrid", rowsInputId: "matrixCreateRows", colsInputId: "matrixCreateCols" });
      App.attachMatrixGridHandlers({ gridId: "matrixCalcGridA", rowsInputId: "matrixCalcRowsA", colsInputId: "matrixCalcColsA" });
      App.attachMatrixGridHandlers({ gridId: "matrixCalcGridB", rowsInputId: "matrixCalcRowsB", colsInputId: "matrixCalcColsB" });
      App.attachMatrixGridHandlers({ gridId: "matrixMixedGrid", rowsInputId: "matrixMixedRows", colsInputId: "matrixMixedCols" });
    }

    setTimeout(() => {
        if (typeof App.initCustomDropdowns === "function") App.initCustomDropdowns();
    }, 100);
  }

  // Chạy ngay và luôn
  injectSidebarStyles();

  // Đợi DOM load xong để chắc chắn tìm thấy element
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSidebarLayout);
  } else {
    initSidebarLayout();
  }
  // =========================================================================
  // 2. HELPER FUNCTIONS (MÀU SẮC & XỬ LÝ)
  // =========================================================================

  function nearAxisHue(h) {
    const anchors = [0, 120, 240];
    return anchors.some((a) => Math.abs(((h - a + 540) % 360) - 180) < 14);
  }

  function pickUniqueHue() {
    const golden = 137.508;
    let h = (App.vectorList.length * golden) % 360;
    while (
      [...App.usedHues].some((uh) => Math.abs(uh - h) < 8) ||
      nearAxisHue(h)
    ) {
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
    const f = (n) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x) =>
      Math.round(255 * x)
        .toString(16)
        .padStart(2, "0");
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
      haloCss:
        App.theme === "dark" ? `hsl(${hue} 95% 80%)` : `hsl(${hue} 80% 30%)`,
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
      v.haloCss =
        App.theme === "dark"
          ? `hsl(${v.hue} 95% 80%)`
          : `hsl(${v.hue} 80% 30%)`;
    });
  };
  App.smartFormat = function (num) {
    if (Math.abs(num - Math.round(num)) < 1e-9) return String(Math.round(num));
    for (let d = 2; d <= 100; d++) {
      let n = num * d;
      if (Math.abs(n - Math.round(n)) < 1e-5)
        return `\\frac{${Math.round(n)}}{${d}}`;
    }
    return Number(num)
      .toFixed(4)
      .replace(/\.?0+$/, "");
  };
  App.displayIndexOf = (item) => App.vectorList.indexOf(item) + 1;
  App.latexToText = function(latex) {
      if (!latex) return "";
      let s = latex;
      s = s.replace(/\\left\[|\\right\]/g, "");
      s = s.replace(/\\left\(|\\right\)/g, "");
      s = s.replace(/\[|\]/g, "");
      s = s.replace(/\\frac{([^}]+)}{([^}]+)}/g, "$1/$2");
      s = s.replace(/\\sqrt{([^}]+)}/g, "√$1");
      s = s.replace(/\\pi/g, "π");
      s = s.replace(/\\/g, "");
      return "[" + s.trim() + "]";
  };

  App.optionLabelFor = (it) =>
    `#${App.displayIndexOf(it)} ${it.latex ? App.latexToText(it.latex) : App.formatVectorShort(it.vec)}`;

  // =========================================================================
  // 3. MAIN RENDER FUNCTION: App.renderVectorList
  // (Đã tích hợp Search + Cơi nới khung + Sự kiện đóng mở)
  // =========================================================================
  App.renderVectorList = function (isAppend = false) {
    const el = document.getElementById("vectorList");
    if (!el) return;
    document.querySelectorAll("body > .vec-dropdown").forEach(d => d.remove());
    // --- RADAR ĐÓNG MENU THÔNG MINH ---
    if (!window._globalMenuCloserAttached) {
        const closeAllMenus = () => {
            document.querySelectorAll(".vec-dropdown.show").forEach((d) => d.classList.remove("show"));
            document.querySelectorAll(".vec-item").forEach((it) => it.style.zIndex = "1");
        };
        
        // 1. Lắng nghe Scroll: Đóng mọi Menu nếu lăn chuột ở danh sách hoặc thanh chính
        const tabContent = el.closest('.tab-content');
        if (tabContent) {
             tabContent.addEventListener('scroll', () => { closeAllMenus(); }, { passive: true });
        }
        
        // 2. Lắng nghe Click ngoài: Đóng Menu nếu click ra vùng trống
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.vec-menu-btn') && !e.target.closest('.vec-dropdown')) {
                closeAllMenus();
            }
        });
        window._globalMenuCloserAttached = true;
    }

    const currentScroll = el.scrollTop;
    if (!isAppend) el.innerHTML = "";
    else {
        const emptyEl = el.querySelector(".mat-empty");
        if (emptyEl) emptyEl.remove();
    }

    const searchInp = document.getElementById("mainVecSearch");

    // Nếu chưa gắn sự kiện thì gắn 1 lần thôi
    if (searchInp && !searchInp._searchAttached) {
      searchInp.addEventListener("input", () => App.renderVectorList());
      searchInp._searchAttached = true;
    }
    const rawSearch = searchInp ? searchInp.value.trim().toLowerCase() : "";
    // Xóa mọi khoảng trắng để tìm chính xác (VD: "[ 1, 2 ]" thành "[1,2]")
    const cleanSearch = rawSearch.replace(/\s+/g, ""); 
    
    // 2. Lấy trạng thái Filter
    const activeFilter = document.querySelector('#vecFilters .filter-chip.active')?.dataset.filter || 'all';

    // Gắn sự kiện Click cho nút Lọc
    if (!window._filterAttached) {
        document.querySelectorAll('#vecFilters .filter-chip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#vecFilters .filter-chip').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                App.renderVectorList(); 
            });
        });
        window._filterAttached = true;
    }

    // --- C. VÒNG LẶP RENDER ---
    if (!isAppend && App.vectorList.length === 0) {
        const empty = document.createElement("div");
        empty.className = "mat-empty"; // Dùng chung class style với ma trận cho đồng bộ
        empty.innerHTML = `
          <i class="fa-regular fa-square-plus" style="font-size:28px; opacity:0.3; margin-bottom:8px;"></i>
          <span>Chưa có vector nào</span>
        `;
        el.appendChild(empty);
        return;
    }

    const targetList = isAppend ? [App.vectorList[App.vectorList.length - 1]] : App.vectorList;
    for (const item of targetList) {
        
        // BƯỚC 1: LỌC THEO NÚT CHIPS
        if (activeFilter === 'hidden' && item.visible) continue;
        if (activeFilter === 'focus' && !item.focus) continue;
        if (activeFilter === '2d' && item.vec.length >= 3) continue;
        if (activeFilter === '3d' && item.vec.length < 3) continue;

        // BƯỚC 2: LỌC SEARCH THEO TỰ ĐIỂN
        if (cleanSearch !== "") {
            // Tạo chuỗi gốc chuẩn: "#1[1,2,3]"
            const dict = `#${App.displayIndexOf(item)}[${item.vec.join(",")}]`.toLowerCase();
            // Lọc chuỗi tuyệt đối
            if (!dict.includes(cleanSearch)) continue; 
        }

      // --- TỪ ĐÂY TRỞ XUỐNG LÀ CODE RENDER GIAO DIỆN (GIỮ NGUYÊN) ---
      const li = document.createElement("li");
      li.className =
        li.className = "vec-item" + (item.highlighted ? " active" : "");

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
      mf.value = item.latex || App.formatVectorShort(item.vec);
      mf.setAttribute("smart-fence", "false");
      mf.setAttribute("smart-mode", "false");
      mf.setAttribute("math-virtual-keyboard-policy", "manual");

      wrapper.addEventListener("click", () => {
          mf.focus();
      });

      // Sự kiện Edit Vector
      // [FIX LỖI TOÁN] Sửa lại đoạn sự kiện input của math-field
      mf.addEventListener("input", () => {
        try {
          // 1. Hàm làm sạch LaTeX thành toán thường (cho backend hiểu)
          const cleanLatex = (latex) => {
            let s = latex;
            // Xóa lệnh latex cơ bản
            s = s.replace(/\\left/g, "").replace(/\\right/g, "");
            // Chuyển căn: \sqrt{x} -> sqrt(x)
            s = s.replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)");
            // Chuyển phân số: \frac{a}{b} -> (a/b)
            s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1/$2)");
            // Chuyển các hàm lượng giác/log
            s = s.replace(/\\(sin|cos|tan|cot|ln|log)/g, "$1");
            s = s.replace(/\\pi/g, "pi");
            // Xử lý nhân tắt: số dính liền chữ (2x, 2sqrt) -> thêm dấu *
            s = s.replace(/(\d)([a-zA-Z\(])/g, "$1*$2");
            // Xử lý dấu ngoặc dính liền: )( -> )*(
            s = s.replace(/\)\(/g, ")*(");
            return s;
          };

          // 2. Lấy giá trị đã làm sạch để parse
          const rawValue = mf.value;
          const cleanValue = cleanLatex(rawValue);

          // Gọi hàm parse cũ của ông với giá trị đã làm sạch
          const v = App.parseVectorExpr(cleanValue);

          if (v && v.length > 0 && !v.some(isNaN)) {
            item.vec = v;

            // Giữ nguyên logic hiển thị LaTeX đẹp
            const needsCalc = /(sin|cos|tan|cot|log|ln|pi|e\^|e\s|e$)/i.test(
              rawValue,
            );
            if (needsCalc) {
              const latexArr = v.map((val) => App.smartFormat(val));
              item.latex = `[${latexArr.join(", ")}]`;
            } else {
              item.latex = rawValue;
            }

            // Update App state...
            App.currentVector = v.slice();
            if (App.updateCalcSelectLabels) App.updateCalcSelectLabels();
            if (App.clearAngleOverlay) App.clearAngleOverlay();
            if (App.renderExtraCalcOptions) App.renderExtraCalcOptions();
            if (App.redrawAll) App.redrawAll({ frame: true });
            if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
            else if (window.Vec2D) Vec2D.draw2DAllVectors();
          }
        } catch (err) {
          // console.log("Lỗi nhập liệu:", err);
        }
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
        { label: "Số e", latex: "e", preview: "e" },
      ];

      menuItems.forEach((m) => {
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
            mf.executeCommand(["insert", m.latex]);
            mf.focus();
            dropdown.classList.remove("show");
          };
          dropdown.appendChild(row);
        }
      });

  
      // --- SỰ KIỆN MENU (SMART POSITIONING - FIXED VIEWPORT) ---
      btn.onclick = (e) => {
        e.stopPropagation();
        
        const isClosed = !dropdown.classList.contains("show");

        // Đóng sạch các menu khác
        document.querySelectorAll(".vec-dropdown.show").forEach((d) => d.classList.remove("show"));
        document.querySelectorAll(".vec-item").forEach((it) => it.style.zIndex = "1");

        if (isClosed) {
          // [BÍ QUYẾT TELEPORT]: Đưa menu ra thẳng cấp cao nhất là <body> 
          // Cắt đứt hoàn toàn quan hệ với Sidebar để thoát khỏi lỗi tọa độ
          document.body.appendChild(dropdown);
          
          dropdown.classList.add("show");
          li.style.zIndex = "999"; 

          requestAnimationFrame(() => {
            const btnRect = btn.getBoundingClientRect();
            const menuHeight = dropdown.offsetHeight || 250;
            const menuWidth = dropdown.offsetWidth || 240;
            
            // TRỤC X: Căn mép phải menu bằng mép phải nút
            let leftPos = btnRect.right - menuWidth;
            if (leftPos < 10) leftPos = 10; 
            
            dropdown.style.left = `${leftPos}px`;
            dropdown.style.right = "auto";

            // TRỤC Y: So sánh không gian trên và dưới
            const spaceBelow = window.innerHeight - btnRect.bottom;
            const spaceAbove = btnRect.top;
            
            // Nếu dưới chật VÀ trên rộng hơn -> HẤT LÊN TRÊN
            if (spaceBelow < menuHeight + 10 && spaceAbove > spaceBelow) {
                dropdown.style.top = "auto";
                dropdown.style.bottom = `${window.innerHeight - btnRect.top + 4}px`; 
                dropdown.style.transformOrigin = "bottom right";
                dropdown.style.setProperty("box-shadow", "0 -10px 30px rgba(0,0,0,0.3)", "important");
            } else {
                // Đủ chỗ -> THẢ XUỐNG DƯỚI
                dropdown.style.top = `${btnRect.bottom + 4}px`;
                dropdown.style.bottom = "auto";
                dropdown.style.transformOrigin = "top right";
                dropdown.style.setProperty("box-shadow", "0 10px 30px rgba(0,0,0,0.3)", "important");
            }
          });
        }
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
      focusBtn.innerHTML = item.focus ? '<i class="fa-solid fa-star" style="color:#f59e0b"></i>' : '<i class="fa-regular fa-star"></i>';
      focusBtn.title = "Chú ý";
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
      toggleBtn.innerHTML = item.visible ? '<i class="fa-regular fa-eye"></i>' : '<i class="fa-regular fa-eye-slash"></i>';
      toggleBtn.title = "Ẩn/Hiện";
      toggleBtn.onclick = (e) => {
        e.stopPropagation();
        item.visible = !item.visible;
        toggleBtn.innerHTML = item.visible ? '<i class="fa-regular fa-eye"></i>' : '<i class="fa-regular fa-eye-slash" style="color: #888"></i>';
        if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
        else if (window.Vec2D) Vec2D.draw2DAllVectors();
      };

      const del = document.createElement("button");
      del.className = "btn vec-btn-delete";
      del.innerHTML = '<i class="fa-solid fa-trash"></i>';
      del.title = "Xóa";

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
    requestAnimationFrame(() => {
        el.scrollTop = currentScroll;
    });
  };

  // =========================================================================
  // 4. OTHER HELPERS (Cập nhật Select box và Checklist)
  // =========================================================================

  App.refreshCalcVectorOptions = function () {
    const ids = ["v1Select", "v2Select"]; // Chỉ áp dụng cho 2 ô chọn phép tính chính

    ids.forEach((id) => {
      const sel = document.getElementById(id);
      if (!sel) return;

      // Lưu lại giá trị cũ đang chọn (để không bị reset khi thêm vector mới)
      const oldValue = sel.value;

      sel.innerHTML = "";

      // 1. Tạo dòng Placeholder mặc định
      const placeholder = document.createElement("option");
      placeholder.text = "Chọn vector";
      placeholder.value = "";
      placeholder.disabled = true; // Không cho chọn lại dòng này
      placeholder.selected = true; // Mặc định chọn
      sel.appendChild(placeholder);

      // 2. Đổ danh sách vector vào
      App.vectorList.forEach((it) => {
        const o = document.createElement("option");
        o.value = it.id;
        o.textContent = App.optionLabelFor(it);
        sel.appendChild(o);
      });

      // 3. Nếu giá trị cũ vẫn còn trong danh sách thì giữ nguyên, không thì về rỗng
      if (oldValue && App.vectorList.some((v) => v.id == oldValue)) {
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

  // --- [ĐÃ FIX] CHECKLIST: GIAO DIỆN CHUẨN XỊN 100% GIỐNG MENU CHÍNH ---
  function makeChecklist(container, name) {
    if (!container) return;
    container.innerHTML = "";

    if (App.vectorList.length === 0) {
      container.innerHTML = '<div style="padding:15px; text-align:center; color:#999; font-style:italic;">(Chưa có vector nào)</div>';
      return;
    }

    // --- 1. KHU VỰC TOOLBAR (Search + Filter + Chọn tất cả) ---
    const tools = document.createElement("div");
    tools.style.paddingBottom = "10px";
    tools.style.marginBottom = "10px";
    tools.style.borderBottom = "1px solid var(--border)";

    // Thanh Search mượn y nguyên class xịn của Main List
    const searchWrap = document.createElement("div");
    searchWrap.className = "search-box-modern";
    searchWrap.style.marginBottom = "12px";
    searchWrap.innerHTML = `
        <i class="fa-solid fa-magnifying-glass search-icon"></i>
        <input type="text" class="vec-search-inp" placeholder="Tìm ID hoặc tọa độ..." style="border: none; background: transparent; box-shadow: none;">
    `;
    const searchInp = searchWrap.querySelector("input");

    // Lọc 2D/3D
    const filterDiv = document.createElement("div");
    filterDiv.className = "vec-filters";
    filterDiv.style.marginBottom = "12px";
    filterDiv.innerHTML = `
      <button class="filter-chip active" data-filter="all">Tất cả</button>
      <button class="filter-chip" data-filter="2d">2D</button>
      <button class="filter-chip" data-filter="3d">3D</button>
    `;

    // Chọn tất cả
    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.justifyContent = "space-between";
    actions.style.alignItems = "center";
    actions.style.padding = "0 8px";
    actions.innerHTML = `
        <span style="font-size: 0.95em; font-weight: 600; color: var(--text-main);">Chọn tất cả</span>
        <input type="checkbox" style="width: 18px; height: 18px; cursor: pointer; accent-color: #2196F3; margin: 0;">
    `;
    const cbAll = actions.querySelector("input");

    tools.appendChild(searchWrap);
    tools.appendChild(filterDiv);
    tools.appendChild(actions);
    container.appendChild(tools);

    // --- 2. KHU VỰC DANH SÁCH (Dùng class vec-item để có viền/hover cực đẹp) ---
    const listDiv = document.createElement("div");
    listDiv.className = "checklist-scroll";
    listDiv.style.maxHeight = "280px";
    listDiv.style.overflowY = "auto";
    listDiv.style.paddingRight = "4px";

    const items = [];

    // Logic Select All
    const toggleAll = () => {
      const isChecked = cbAll.checked;
      items.forEach(item => {
          if (item.row.style.display !== "none") {
              item.cb.checked = isChecked;
              item.cb.dispatchEvent(new Event("change", { bubbles: true }));
          }
      });
    };
    cbAll.addEventListener("change", toggleAll);

    App.vectorList.forEach((it) => {
      const is3D = it.vec.length >= 3;
      
      const row = document.createElement("div");
      // Dùng class vec-item y chang list chính
      row.className = "vec-item checkitem";
      row.style.cursor = "pointer";

      // Cấu trúc HTML clone 1:1 từ list chính
      row.innerHTML = `
          <div class="sw" style="background: ${it.colorCss}"></div>
          <div class="vec-main">
              <div class="vec-header">
                  <span class="tag">#${App.displayIndexOf(it)}</span>
                  <div class="vec-input-wrapper" style="pointer-events:none; border-color: transparent !important; background: transparent !important;">
                      <math-field class="vec-math-field" read-only="true" math-virtual-keyboard-policy="none" tabindex="-1" style="background: transparent; border: none; width: 100%;">
                          ${it.latex || App.formatVectorShort(it.vec)}
                      </math-field>
                  </div>
              </div>
              <div class="vec-actions" style="opacity: 1; padding-left: 8px;">
                  <input type="checkbox" value="${it.id}" style="width: 18px; height: 18px; cursor: pointer; accent-color: #2196F3; margin: 0; pointer-events: none;">
              </div>
          </div>
      `;

      const cb = row.querySelector("input[type='checkbox']");

      // Click vào dòng tự tick checkbox
      row.onclick = (e) => {
        if (e.target === cb) return;
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event("change", { bubbles: true }));
      };

      listDiv.appendChild(row);

      items.push({
        row: row,
        cb: cb,
        text: row.querySelector("math-field").value.toLowerCase(),
        idStr: `#${App.displayIndexOf(it)}`,
        dim: is3D ? "3d" : "2d"
      });
    });

    container.appendChild(listDiv);

    // --- 3. LÕI LỌC DỮ LIỆU ---
    let currentFilter = "all";
    const applyFilters = () => {
      const term = searchInp.value.trim().toLowerCase().replace(/\s+/g, "");
      items.forEach((item) => {
        const matchSearch = item.text.replace(/\s+/g, "").includes(term) || item.idStr.includes(term);
        const matchDim = currentFilter === "all" || currentFilter === item.dim;
        item.row.style.display = (matchSearch && matchDim) ? "flex" : "none";
      });
      cbAll.checked = false; // Bỏ tick select all khi lọc
    };

    searchInp.addEventListener("input", applyFilters);

    const filterBtns = filterDiv.querySelectorAll('.filter-chip');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
          filterBtns.forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          currentFilter = e.target.dataset.filter;
          applyFilters();
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
      if (v2AngleSelect)
        v2AngleSelect.value = App.vectorList[1]?.id ?? App.vectorList[0].id;
      if (vNormSelect) vNormSelect.value = App.vectorList[0].id;
      if (vCoordSelect) vCoordSelect.value = App.vectorList[0].id;
      if (v1DotSelect) v1DotSelect.value = App.vectorList[0].id;
      if (v2DotSelect)
        v2DotSelect.value = App.vectorList[1]?.id ?? App.vectorList[0].id;
    }

    makeChecklist(basisCoordChecklist, "coord");
    makeChecklist(basisChecklist, "basis");
    makeChecklist(indepChecklist, "indep");
    makeChecklist(rankChecklist, "rank");
  };

  App.updateCalcSelectLabels = function () {
    // 1. Cập nhật các Menu xổ xuống (Select Box) - Giữ nguyên logic cũ
    const selectIds = [
      "v1Select",
      "v2Select",
      "v1AngleSelect",
      "v2AngleSelect",
      "vNormSelect",
      "vCoordSelect",
      "v1DotSelect",
      "v2DotSelect",
    ];

    selectIds.forEach((id) => {
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
      App.vectorList.forEach((it) => {
        const checkbox = document.getElementById(`chk_${prefix}_${it.id}`);
        if (checkbox) {
          const row = checkbox.closest(".checkitem");
          if (row) {
            // [SỬA LẠI ĐOẠN NÀY] Tìm thẻ math-field thay vì .vec-text
            const mf = row.querySelector("math-field");
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
    syncChecklistText("rank"); // Tìm hạng
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
  // Hàm kiểm tra vector & Chuyển hướng
  App.requireVectors = function () {
    // If vectors exist, allow action
    if (App.vectorList && App.vectorList.length > 0) return true;

    // --- IF EMPTY: ---

    // 1. Show Toast Message (Missing part)
    if (window.App && typeof App.showToast === "function") {
      App.showToast(
        "Danh sách trống! Hãy tạo vector ở đây trước 👇",
        "warning",
      );
    } else {
      // Fallback if toast system isn't ready
      alert("Danh sách trống! Hãy tạo vector trước.");
    }

    // 2. Switch to "Create" Tab
    const firstTab = document.querySelector(".sidebar-tabs .tab-btn");
    if (firstTab) {
      firstTab.click();
    }

    // 3. Focus and Shake Input
    setTimeout(() => {
      const input =
        document.querySelector("#card-create math-field") ||
        document.querySelector("#vectorInput");
      if (input) {
        input.scrollIntoView({ behavior: "smooth", block: "center" });

        // Reset animation
        input.style.animation = "none";
        input.offsetHeight; /* trigger reflow */
        input.style.animation = "shakeError 0.4s ease-in-out";

        // Add red border/shadow
        input.style.borderColor = "#ff4444";
        input.style.boxShadow = "0 0 0 4px rgba(255, 68, 68, 0.1)";

        input.focus();

        // Clear red styles after 2s
        setTimeout(() => {
          input.style.borderColor = "";
          input.style.boxShadow = "";
          input.style.animation = "";
        }, 2000);
      }
    }, 150);

    return false; // Stop the original action
  };

  // Vòng lặp quét để gắn sự kiện chặn (Fix lại logic tìm nút)
  setInterval(() => {
    // 1. Dọn dẹp nút thừa
    const buttons = document.querySelectorAll("button");
    for (let btn of buttons) {
      if (btn.textContent.trim() === "Xem trước") btn.remove();

      // 2. Gắn chốt chặn cho các nút tính toán
      // Danh sách các từ khóa trên nút cần chặn
      const keywords = [
        "Thực hiện",
        "Kiểm tra",
        "Tính hạng",
        "Tính cơ sở",
        "Xuất tọa độ",
        "Tính toán",
      ];
      const btnText = btn.textContent.trim();

      if (keywords.some((k) => btnText.includes(k))) {
        if (!btn.dataset.hasCheck) {
          btn.dataset.hasCheck = "true";
          // Dùng capture phase (true) để chặn sự kiện trước khi nó chạy vào logic cũ
          btn.addEventListener(
            "click",
            (e) => {
              if (!App.requireVectors()) {
                e.stopImmediatePropagation();
                e.preventDefault();
              }
            },
            true,
          );
        }
      }
    }

    // 3. Làm đẹp kết quả (như cũ)
    const divs = document.querySelectorAll("div");
    for (let div of divs) {
      if (
        div.textContent.trim().startsWith("Kết quả:") &&
        !div.classList.contains("nice-result-box")
      ) {
        div.classList.add("nice-result-box");
        div.innerHTML = div.innerHTML.replace(
          "Kết quả:",
          "<strong>KẾT QUẢ:</strong>",
        );
        // Fix số xấu
        if (/\d+\.\d{5,}/.test(div.innerHTML)) {
          div.innerHTML = div.innerHTML.replace(/(\d+\.\d+)/g, (m) => {
            const v = parseFloat(m);
            return !isNaN(v) && window.App.smartFormat ? App.smartFormat(v) : m;
          });
        }
      }
    }
  }, 500);

  function parseMatrixGridValues(gridId, rowsInputId, colsInputId) {
    const grid = document.getElementById(gridId);
    const rowsInput = document.getElementById(rowsInputId);
    const colsInput = document.getElementById(colsInputId);
    if (!grid || !rowsInput || !colsInput) return null;

    const rows = Math.max(2, Math.min(5, parseInt(rowsInput.value) || 3));
    const cols = Math.max(2, Math.min(5, parseInt(colsInput.value) || 3));

    const cells = Array.from(grid.querySelectorAll("input.matrix-cell"));
    if (cells.length !== rows * cols) return null;

    const values = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) {
        const raw = cells[i * cols + j].value;
        const num = Number(raw);
        row.push(Number.isFinite(num) ? num : 0);
      }
      values.push(row);
    }
    return { rows, cols, values };
  }

  function parseVectorInput(value) {
    if (typeof value !== "string") return null;
    const clean = value.replace(/\s+/g, "");
    if (!clean.startsWith("[") || !clean.endsWith("]")) return null;
    const inner = clean.slice(1, -1);
    if (!inner) return [];
    const parts = inner.split(",").filter((p) => p !== "");
    const numbers = parts.map((p) => Number(p));
    return numbers.every(Number.isFinite) ? numbers : null;
  }

  function formatVector(v) {
    return `[${v.map((n) => (window.App && App.smartFormat ? App.smartFormat(n) : String(n))).join(", ")}]`;
  }

  function formatMatrix(M) {
    return M
      .map((row) => `[${row.map((n) => (window.App && App.smartFormat ? App.smartFormat(n) : String(n))).join(", ")}]`)
      .join("<br>");
  }

  function determinantMatrix(M) {
    if (!Array.isArray(M) || !M.length || M[0].length !== M.length) return null;
    const n = M.length;
    const a = M.map((row) => [...row]);
    let det = 1;
    for (let i = 0; i < n; i++) {
      let pivot = i;
      while (pivot < n && Math.abs(a[pivot][i]) < 1e-10) pivot++;
      if (pivot === n) return 0;
      if (pivot !== i) {
        [a[i], a[pivot]] = [a[pivot], a[i]];
        det *= -1;
      }
      const piv = a[i][i];
      det *= piv;
      if (Math.abs(piv) < 1e-10) return 0;
      for (let r = i + 1; r < n; r++) {
        const factor = a[r][i] / piv;
        for (let c = i; c < n; c++) a[r][c] -= factor * a[i][c];
      }
    }
    return det;
  }

  function transposeMatrix(M) {
    return M[0].map((_, col) => M.map((row) => row[col]));
  }

  function rankMatrix(M) {
    const a = M.map((row) => [...row]);
    const rows = a.length;
    const cols = a[0]?.length || 0;
    let rank = 0;
    let pivotCol = 0;

    for (let row = 0; row < rows && pivotCol < cols; row++) {
      let pivot = row;
      while (pivot < rows && Math.abs(a[pivot][pivotCol]) < 1e-10) pivot++;
      if (pivot === rows) {
        pivotCol++;
        row--;
        continue;
      }
      if (pivot !== row) [a[row], a[pivot]] = [a[pivot], a[row]];
      const pivotValue = a[row][pivotCol];
      for (let r = row + 1; r < rows; r++) {
        const factor = a[r][pivotCol] / pivotValue;
        for (let c = pivotCol; c < cols; c++) a[r][c] -= factor * a[row][c];
      }
      rank++;
      pivotCol++;
    }
    return rank;
  }

  function inverseMatrix(M) {
    const n = M.length;
    if (!n || M[0].length !== n) return null;
    const a = M.map((row) => [...row]);
    const aug = a.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);

    for (let i = 0; i < n; i++) {
      let pivot = i;
      while (pivot < n && Math.abs(aug[pivot][i]) < 1e-10) pivot++;
      if (pivot === n) return null;
      if (pivot !== i) [aug[i], aug[pivot]] = [aug[pivot], aug[i]];
      const pivotValue = aug[i][i];
      if (Math.abs(pivotValue) < 1e-10) return null;
      for (let c = i; c < 2 * n; c++) aug[i][c] /= pivotValue;
      for (let r = 0; r < n; r++) {
        if (r === i) continue;
        const factor = aug[r][i];
        if (Math.abs(factor) < 1e-10) continue;
        for (let c = i; c < 2 * n; c++) aug[r][c] -= factor * aug[i][c];
      }
    }
    return aug.map((row) => row.slice(n));
  }

  function multiplyMatrices(A, B) {
    const rowsA = A.length;
    const colsA = A[0].length;
    const colsB = B[0].length;
    const result = [];
    for (let i = 0; i < rowsA; i++) {
      const row = [];
      for (let j = 0; j < colsB; j++) {
        let sum = 0;
        for (let k = 0; k < colsA; k++) sum += A[i][k] * B[k][j];
        row.push(sum);
      }
      result.push(row);
    }
    return result;
  }

  function multiplyMatrixVector(A, v) {
    if (!A.length || A[0].length !== v.length) return null;
    return A.map((row) => row.reduce((sum, value, index) => sum + value * v[index], 0));
  }

  App.runMatrixCalc = function () {
    const op = document.getElementById("matrixOpSelect")?.value || "det";
    const resultBox = document.getElementById("matrixResultBox");
    const AData = parseMatrixGridValues("matrixCalcGridA", "matrixCalcRowsA", "matrixCalcColsA");
    if (!AData) {
      if (resultBox) {
        resultBox.style.display = "block";
        resultBox.innerHTML = "<strong>Vui lòng nhập đầy đủ ma trận A.</strong>";
      }
      return;
    }

    let html = "";
    let title = "KẾT QUẢ MA TRẬN";

    if (op === "det") {
      if (AData.rows !== AData.cols) {
        html = "Định thức chỉ áp dụng cho ma trận vuông.";
      } else {
        const det = determinantMatrix(AData.values);
        html = `Det(A) = ${App.smartFormat ? App.smartFormat(det) : det}`;
      }
    } else if (op === "inv") {
      const inv = inverseMatrix(AData.values);
      if (!inv) {
        html = "Ma trận không khả nghịch hoặc không phải ma trận vuông.";
      } else {
        title = "MA TRẬN NGHỊCH ĐẢO";
        html = `A<sup>-1</sup> = <br>${formatMatrix(inv)}`;
      }
    } else if (op === "rank") {
      html = `Rank(A) = ${rankMatrix(AData.values)}`;
    } else if (op === "transpose") {
      title = "MA TRẬN CHUYỂN VỊ";
      html = formatMatrix(transposeMatrix(AData.values));
    } else if (op === "mul_vector") {
      const vectorInput = document.getElementById("matrixVectorInput");
      const vector = parseVectorInput(vectorInput?.value || "");
      if (!vector) {
        html = "Vui lòng nhập vector ở dạng [x, y, z].";
      } else {
        const prod = multiplyMatrixVector(AData.values, vector);
        if (!prod) {
          html = "Kích thước không phù hợp: số cột của ma trận phải bằng số phần tử vector.";
        } else {
          title = "MA TRẬN × VECTOR";
          html = `A × b = ${formatVector(prod)}`;
        }
      }
    } else if (op === "mul_matrix") {
      const BData = parseMatrixGridValues("matrixCalcGridB", "matrixCalcRowsB", "matrixCalcColsB");
      if (!BData) {
        html = "Vui lòng nhập đầy đủ ma trận B.";
      } else if (AData.cols !== BData.rows) {
        html = "Kích thước không phù hợp: số cột của A phải bằng số hàng của B.";
      } else {
        title = "MA TRẬN × MA TRẬN";
        html = formatMatrix(multiplyMatrices(AData.values, BData.values));
      }
    }

    if (resultBox) {
      resultBox.style.display = "block";
      resultBox.innerHTML = `<strong>${title}</strong><div style="margin-top:8px">${html}</div>`;
      if (window.App.PaperLogger) {
        let latexTitle = title;
        let ltx = "";
        
        function toLatex(mat) {
          if (!Array.isArray(mat)) return mat;
          if (!Array.isArray(mat[0])) return `\\begin{bmatrix} ${mat.join(" \\\\ ")} \\end{bmatrix}`;
          return `\\begin{bmatrix} ${mat.map(r => r.join(" & ")).join(" \\\\ ")} \\end{bmatrix}`;
        }
        
        if (op === "det" && AData.rows === AData.cols) {
            ltx = `\\det(A) = ${App.smartFormat ? App.smartFormat(determinantMatrix(AData.values)) : determinantMatrix(AData.values)}`;
        } else if (op === "inv" && inverseMatrix(AData.values)) {
            ltx = `A^{-1} = ${toLatex(inverseMatrix(AData.values))}`;
        } else if (op === "rank") {
            ltx = `\\text{Rank}(A) = ${rankMatrix(AData.values)}`;
        } else if (op === "transpose") {
            ltx = `A^T = ${toLatex(transposeMatrix(AData.values))}`;
        } else if (op === "mul_vector") {
            const vectorInput = document.getElementById("matrixVectorInput");
            const vector = parseVectorInput(vectorInput?.value || "");
            const prod = multiplyMatrixVector(AData.values, vector);
            if (prod) ltx = `A \\times b = ${toLatex(prod)}`;
        } else if (op === "mul_matrix") {
            const BData = parseMatrixGridValues("matrixCalcGridB", "matrixCalcRowsB", "matrixCalcColsB");
            if (BData && AData.cols === BData.rows) {
                ltx = `A \\times B = ${toLatex(multiplyMatrices(AData.values, BData.values))}`;
            }
        }
        
        if (ltx) {
            App.PaperLogger.log(latexTitle, ltx, "");
        }
      }
    }
  };

  App.runMixedCalc = function () {
    const resultBox = document.getElementById("mixedResultBox");
    const matrixData = parseMatrixGridValues("matrixMixedGrid", "matrixMixedRows", "matrixMixedCols");
    const vectorInput = document.getElementById("mixedVectorInput");
    const vector = parseVectorInput(vectorInput?.value || "");

    if (!matrixData || !vector) {
      if (resultBox) {
        resultBox.style.display = "block";
        resultBox.innerHTML = "Vui lòng nhập ma trận và vector đúng định dạng.";
      }
      return;
    }

    const prod = multiplyMatrixVector(matrixData.values, vector);
    if (!prod) {
      if (resultBox) {
        resultBox.style.display = "block";
        resultBox.innerHTML = "Kích thước không phù hợp: số cột của ma trận phải bằng số phần tử vector.";
      }
      return;
    }

    if (resultBox) {
      resultBox.style.display = "block";
      resultBox.innerHTML = `<strong>MA TRẬN × VECTOR</strong><div style="margin-top:8px">${formatVector(prod)}</div>`;
    }
  };

  // LOGIC ĐIỀU KHIỂN SINH LƯỚI MA TRẬN ĐỘNG (DYNAMIC GRID ENGINE)
  App.renderDynamicMatrix = function(options = {}) {
    const gridId = options.gridId || "matrixGrid";
    const rowsInputId = options.rowsInputId || "matrixRows";
    const colsInputId = options.colsInputId || "matrixCols";
    const defaultValue = options.defaultValue ?? "0";

    const grid = document.getElementById(gridId);
    const rowsInput = document.getElementById(rowsInputId);
    const colsInput = document.getElementById(colsInputId);
    if (!grid || !rowsInput || !colsInput) return;

    // Lưu giá trị cũ trước khi rebuild (bảo toàn khi resize)
    const oldValues = {};
    grid.querySelectorAll(".matrix-cell").forEach(c => {
      if (c.id && c.value !== defaultValue) oldValues[c.id] = c.value;
    });

    let rows = Math.max(2, Math.min(5, parseInt(rowsInput.value) || 3));
    let cols = Math.max(2, Math.min(5, parseInt(colsInput.value) || 3));
    rowsInput.value = rows;
    colsInput.value = cols;

    grid.innerHTML = "";
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const cell = document.createElement("math-field");
        cell.className = "matrix-cell";
        cell.id = `${gridId}_cell_${i}_${j}`;
        
        // Cấu hình MathLive
        cell.setAttribute("math-virtual-keyboard-policy", "manual");
        cell.setAttribute("smart-fence", "false");
        cell.setAttribute("smart-mode", "false");

        // Khôi phục giá trị cũ nếu ô đã từng nhập
        cell.value = oldValues[cell.id] ?? defaultValue;

        // [UX] Focus: Đặt activeMathField để dùng chung menu toán học
        const setActive = () => { window.activeMathField = cell; };
        cell.addEventListener("focusin", setActive);
        cell.addEventListener("focus", setActive);
        cell.addEventListener("pointerdown", (e) => {
            setActive();
            // Ép focus để click vào padding viền ngoài cũng ăn
            requestAnimationFrame(() => {
                if (document.activeElement !== cell) {
                    cell.focus();
                }
            });
        });

        // [UX] Nhảy ô khi ấn Enter
        cell.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const nextI = j + 1 < cols ? i : i + 1;
            const nextJ = j + 1 < cols ? j + 1 : 0;
            const next = document.getElementById(`${gridId}_cell_${nextI}_${nextJ}`);
            if (next) next.focus();
          }
        });
        
        // Không dọn dẹp số 0 vô dụng ở đây nữa vì MathLive cần chuỗi LaTeX nguyên bản.

        grid.appendChild(cell);
      }
    }
  };

  App.attachMatrixGridHandlers = function(options = {}) {
    const rowsInputId = options.rowsInputId || "matrixRows";
    const colsInputId = options.colsInputId || "matrixCols";
    const rowsInput = document.getElementById(rowsInputId);
    const colsInput = document.getElementById(colsInputId);
    if (!rowsInput || !colsInput || rowsInput.dataset.matrixBound === "true") return;

    rowsInput.dataset.matrixBound = "true";
    colsInput.dataset.matrixBound = "true";
    rowsInput.addEventListener("input", () => App.renderDynamicMatrix(options));
    colsInput.addEventListener("input", () => App.renderDynamicMatrix(options));
    App.renderDynamicMatrix(options);
  };
})();

// =========================================================================
  // BỘ MÁY CUSTOM DROPDOWN TỰ ĐỘNG (TELEPORT & AUTO-SYNC)
  // =========================================================================
  App.initCustomDropdowns = function() {
    const selects = document.querySelectorAll('#controls select');
    
    selects.forEach(nativeSelect => {
        if (nativeSelect.dataset.customized) return;
        nativeSelect.dataset.customized = "true";
        nativeSelect.style.display = 'none'; // Giấu hàng mặc định
        
        // Tạo vỏ bao bọc thay thế
        const wrapper = document.createElement('div');
        wrapper.className = 'v-select-wrapper';
        nativeSelect.parentNode.insertBefore(wrapper, nativeSelect);
        wrapper.appendChild(nativeSelect);
        
        const trigger = document.createElement('div');
        trigger.className = 'v-select-trigger';
        trigger.innerHTML = `<span class="val"></span><i class="fa-solid fa-chevron-down"></i>`;
        wrapper.appendChild(trigger);
        
        // Tạo danh sách (nhưng giấu đi chờ kích hoạt)
        const list = document.createElement('div');
        list.className = 'v-select-options';
        
        // Hàm đồng bộ UI dựa vào ruột của thẻ <select> gốc
        const syncUI = () => {
            list.innerHTML = '';
            let selectedText = 'Chọn...';
            let hasSelection = false;

            Array.from(nativeSelect.options).forEach(opt => {
                if (opt.selected) { selectedText = opt.text; hasSelection = true; }
                if (opt.disabled && opt.value === "") return; // Lờ đi dòng Placeholder rác
                
                const item = document.createElement('div');
                item.className = 'v-select-option' + (opt.selected ? ' selected' : '');
                item.textContent = opt.text;
                
                // Khi User click chọn 1 mục
                item.onclick = (e) => {
                    e.stopPropagation();
                    nativeSelect.value = opt.value;
                    nativeSelect.dispatchEvent(new Event('change')); // Bắn Event cho logic cũ tự chạy
                    wrapper.classList.remove('open');
                    list.classList.remove('show');
                    syncUI(); // Vẽ lại nút Trigger
                };
                list.appendChild(item);
            });
            trigger.querySelector('.val').textContent = selectedText;
            trigger.querySelector('.val').style.color = (!hasSelection && nativeSelect.options.length > 0 && nativeSelect.options[0].disabled) ? "var(--muted)" : "";
        };
        
        syncUI(); 
        
        // Auto-update nếu sếp dùng Javascript thêm/bớt Option bên dưới
        const observer = new MutationObserver(syncUI);
        observer.observe(nativeSelect, { childList: true, attributes: true, subtree: true });
        
        // SỰ KIỆN TELEPORT (Bắn menu ra ngoài body để ko bị ép hẹp)
        trigger.onclick = (e) => {
            e.stopPropagation();
            const isClosed = !wrapper.classList.contains('open');
            
            // Đóng tất cả các menu khác
            document.querySelectorAll('.v-select-wrapper').forEach(w => w.classList.remove('open'));
            document.querySelectorAll('.v-select-options').forEach(o => o.classList.remove('show'));
            
            if (isClosed) {
                wrapper.classList.add('open');
                document.body.appendChild(list); // Ném ra ngoài DOM gốc
                
                // Trích xuất tọa độ súng thần công
                const rect = wrapper.getBoundingClientRect();
                list.style.width = `${rect.width}px`;
                list.style.left = `${rect.left}px`;
                
                // Tính toán hướng rớt xuống (chống đụng đáy màn hình)
                const spaceBelow = window.innerHeight - rect.bottom;
                if (spaceBelow < 280 && rect.top > spaceBelow) {
                    list.style.top = "auto";
                    list.style.bottom = `${window.innerHeight - rect.top + 6}px`;
                } else {
                    list.style.top = `${rect.bottom + 6}px`;
                    list.style.bottom = "auto";
                }
                
                requestAnimationFrame(() => list.classList.add('show'));
            }
        };
    });
    
    // Bấm ra ngoài là dọn dẹp sạch sẽ
    if (!window._customDropdownCloser) {
        document.addEventListener('click', () => {
            document.querySelectorAll('.v-select-wrapper').forEach(w => w.classList.remove('open'));
            document.querySelectorAll('.v-select-options').forEach(o => o.classList.remove('show'));
        });
        window._customDropdownCloser = true;
    }
  };
