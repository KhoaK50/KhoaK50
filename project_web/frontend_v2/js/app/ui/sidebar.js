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
    @media (min-width: 1100px) { #controls { width: var(--sidebar-width, 440px) !important; } }
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
    .tab-content { display: none !important; flex: 1; overflow-y: auto; overflow-x: hidden; padding: 14px !important; -webkit-overflow-scrolling: touch; }
    .tab-content.active { display: block !important; animation: fadeIn 0.2s ease-out; }
    .tab-content .card { background: var(--card) !important; border: 1px solid var(--border) !important; border-radius: 2px !important; padding: 12px 14px !important; margin-bottom: 12px !important; box-shadow: none !important; }
    .tab-content details > summary { display: none !important; }
    .tab-content details { border: none !important; padding: 0 !important; }
    .btn.primary { box-shadow: none !important; border-radius: 2px !important; }
    .btn { border-radius: 2px !important; }

    .calc-param-block { background: var(--card); border: 1px solid var(--border); padding: 12px; border-radius: 2px; display: flex; flex-direction: column; gap: 12px; box-shadow: none; margin-bottom: 12px; }
    #controls label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; display: block; letter-spacing: 0.5px; }

    /* --- NÚT CHỨC NĂNG PHỤ (GỌN GÀNG, TƯƠNG PHẢN RÕ) --- */
    .btn-sub-action {
        flex: 1; padding: 7px 10px; font-size: 11.5px; font-weight: 600; border-radius: 2px;
        background: var(--card); border: 1px solid var(--border); color: var(--fg);
        cursor: pointer; transition: all 0.2s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .btn-sub-action:hover { border-color: var(--primary-base); color: var(--fg); background: var(--bg-hover); }
    .btn-sub-danger { color: #ef4444; border-color: rgba(239, 68, 68, 0.4); }
    .btn-sub-danger:hover { background: rgba(239, 68, 68, 0.12); border-color: #ef4444; color: #f87171; }
    body.dark .btn-sub-danger:hover, body.dark-theme .btn-sub-danger:hover { background: rgba(239,68,68,0.22); }

    .btn-sub-pill {
        padding: 3px 9px; font-size: 11px; font-weight: 600; border-radius: 2px;
        background: var(--card); border: 1px solid var(--border); color: var(--muted);
        cursor: pointer; transition: all 0.15s;
    }
    .btn-sub-pill:hover { border-color: var(--border-strong); color: var(--fg); }
    .btn-sub-pill.active { background: var(--primary-base); color: #fff; border-color: var(--primary-base); }

    /* --- CUSTOM DROPDOWN (ACADEMIC FLAT 2PX) --- */
    .v-select-wrapper { position: relative; width: 100%; font-family: inherit; }
    .v-select-trigger { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--card); border: 1px solid var(--border); border-radius: 2px; cursor: pointer; font-size: 13px; font-weight: 600; color: var(--fg); transition: all 0.15s; }
    .v-select-trigger:hover, .v-select-wrapper.open .v-select-trigger { border-color: var(--primary-base); }
    .v-select-trigger i { color: var(--muted); transition: transform 0.2s; }
    .v-select-wrapper.open .v-select-trigger i { transform: rotate(180deg); color: var(--primary-base); }
    .v-select-options { position: fixed; background: var(--card); border: 1px solid var(--border-strong); border-radius: 2px; box-shadow: 0 4px 16px rgba(0,0,0,0.25); max-height: 250px; overflow-y: auto; z-index: 999999; opacity: 0; pointer-events: none; transform: translateY(-6px); transition: all 0.15s ease; }
    .v-select-options.show { opacity: 1; pointer-events: auto; transform: translateY(0); }
    .v-select-option { padding: 8px 12px; cursor: pointer; font-size: 13px; color: var(--fg); border-bottom: 1px solid var(--border); transition: background 0.15s; }
    .v-select-option:last-child { border-bottom: none; }
    .v-select-option:hover { background: rgba(0,144,255,0.08); color: var(--primary-base); padding-left: 14px; transition: padding 0.15s; }
    .v-select-option.selected { font-weight: 700; color: var(--primary-base); background: rgba(0,144,255,0.06); border-left: 2px solid var(--primary-base); }

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
        .sidebar-tabs.vertical .tab-btn.active { box-shadow: inset 0 3px 0 var(--primary-base); }
        body.dark .sidebar-tabs.vertical .tab-btn.active { box-shadow: inset 0 3px 0 var(--blue-9, #0090ff); }
        .tab-content { padding: 16px 14px 80px 14px !important; }
    }
    
    /* --- VECTOR LIST GIAO DIỆN HỌC THUẬT --- */
    .checklist-actions input[type="checkbox"] { width: 16px !important; height: 16px !important; margin: 0 !important; cursor: pointer; accent-color: var(--primary-base); }
    .search-box-modern { border: 1px solid var(--border) !important; transition: all 0.15s; border-radius: 2px !important; position: relative; margin-bottom: 10px; background: var(--card); }
    .search-box-modern:focus-within { border-color: var(--primary-base) !important; }
    .vec-search-inp { width: 100%; padding: 7px 10px 7px 32px !important; border: none !important; background: transparent !important; box-shadow: none !important; color: var(--fg) !important; font-size: 12.5px;}
    .vec-search-inp:focus { outline: none !important; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--muted); }
    
    .vec-filters { display: flex; gap: 4px; overflow-x: auto; margin-bottom: 12px; padding-bottom: 2px; }
    .filter-chip { padding: 3px 8px; border-radius: 2px !important; border: 1px solid var(--border); background: var(--card); color: var(--fg); font-size: 11px; font-weight: 600; white-space: nowrap; cursor: pointer; transition: all 0.15s; }
    .filter-chip:hover { background: var(--bg-hover); border-color: var(--border-strong); }
    .filter-chip.active { background: var(--primary-base); color: #ffffff; border-color: var(--primary-base); }

    /* --- VECTOR ITEM: SINGLE-LINE CRISP ROW --- */
    .vec-item { margin-bottom: 4px; display: flex !important; flex-direction: row !important; align-items: center !important; gap: 8px !important; padding: 5px 8px !important; border-radius: 2px !important; background: var(--card) !important; border: 1px solid var(--border) !important; transition: all 0.15s; box-shadow: none !important; }
    .vec-item:hover { border-color: var(--primary-base) !important; background: var(--bg-hover) !important; }
    .vec-item.active { background: var(--bg-hover) !important; border-color: var(--primary-base) !important; border-left: 2px solid var(--primary-base) !important; }
    
    .vec-item .sw { flex-shrink: 0; width: 10px; height: 10px; border-radius: 1px; }
    .vec-item .tag { flex-shrink: 0; font-size: 11px; font-weight: 700; color: var(--muted); background: transparent; border: none; padding: 0; white-space: nowrap; }
    
    .vec-input-wrapper { flex: 1; min-width: 0; display: flex; align-items: center; background: transparent !important; border: none !important; border-radius: 0 !important; padding: 0 !important; min-height: 28px; overflow: hidden; box-shadow: none !important; }
    .vec-math-field { flex: 1; width: 100%; min-width: 0; border: none !important; background: transparent !important; padding: 0 4px !important; font-size: 13px; outline: none; color: var(--fg) !important; box-shadow: none !important; }
    math-field::part(content) { justify-content: flex-start !important; width: 100% !important; padding-left: 0; }
    math-field::part(container) { width: 100% !important; }

    .vec-menu-btn { padding: 0 6px; cursor: pointer; color: var(--muted); background: transparent; border: none; font-size: 13px; display: flex; align-items: center; height: 100%; }
    .vec-menu-btn:hover { color: var(--fg); }

    .vec-actions { flex-shrink: 0; display: flex !important; align-items: center !important; gap: 2px !important; margin-top: 0 !important; }
    .vec-actions .btn { width: 24px; height: 24px; padding: 0; background: transparent; border: none; border-radius: 2px; color: var(--muted); font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .vec-actions .btn:hover { background: var(--bg-hover); color: var(--fg); }
    .vec-actions .btn.vec-btn-delete:hover { background: rgba(239, 68, 68, 0.12); color: #f87171; }

    /* --- CLEAR ALL BUTTON IN LIST HEADER --- */
    .btn-clear-list { background: transparent; border: none; color: #ef4444; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 2px 4px; border-radius: 2px; transition: all 0.15s; }
    .btn-clear-list:hover { background: rgba(239, 68, 68, 0.1); color: #f87171; }
    
    .vec-dropdown { display: none; position: fixed !important; width: 240px; background: var(--card) !important; border: 1px solid var(--border) !important; box-shadow: 0 8px 24px rgba(0,0,0,0.25) !important; border-radius: 2px; z-index: 999999 !important; padding: 4px 0; transform: scale(0.95); opacity: 0; transition: transform 0.15s ease-out, opacity 0.15s ease-out; }
    .vec-dropdown.show { display: block; transform: scale(1); opacity: 1; }
    .vec-dropdown-item { padding: 7px 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); font-size: 12.5px; color: var(--fg); }
    .vec-dropdown-item:hover { background: rgba(33, 150, 243, 0.08); color: var(--primary-base); }
    
    /* --- CHECKLIST SINGLE-LINE CRISP ITEM --- */
    .checkitem { display: flex !important; flex-direction: row !important; align-items: center !important; gap: 8px !important; padding: 5px 8px !important; border: 1px solid var(--border) !important; border-radius: 2px !important; margin-bottom: 4px !important; background: var(--card) !important; cursor: pointer !important; transition: all 0.15s; box-shadow: none !important; }
    .checkitem:hover { border-color: var(--primary-base) !important; background: var(--bg-hover) !important; }
    .checkitem input[type="checkbox"] { width: 16px !important; height: 16px !important; margin: 0; cursor: pointer; accent-color: var(--primary-base); pointer-events: none; flex-shrink: 0; }
    
    /* Hide empty pre results and style result boxes cleanly */
    .extra-form pre:empty, #result_basis:empty { display: none !important; }
    .extra-form pre { font-family: "JetBrains Mono", monospace; font-size: 12.5px; font-weight: 600; background: var(--card); border: 1px solid var(--border); border-radius: 2px; padding: 10px 12px; text-align: left; margin-top: 10px; white-space: pre-wrap; color: var(--fg); }

    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.3); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.5); }
    
    /* --- DYNAMIC MATRIX GRID LAYOUT (RADIX THEME) --- */
    @keyframes shakeError {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-4px); }
      40%, 80% { transform: translateX(4px); }
    }

    .matrix-setup-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: nowrap; white-space: nowrap; }
    .matrix-size-input { width: 50px; padding: 6px; border-radius: 2px; border: 1px solid var(--border-strong); background: var(--card); color: var(--fg); font-weight: 600; text-align: center; outline: none; }
    .matrix-size-input:focus { border-color: var(--primary-base); }
    
    .matrix-grid-container { 
        display: grid; gap: 6px; margin: 16px 0; padding: 12px; 
        background: var(--bg-hover); border: 1px solid var(--border-subtle); border-radius: 2px;
        overflow: auto; max-height: 400px; width: 100%; box-sizing: border-box;
    }
    .calc-mode-panel { display: none; }
    .calc-mode-panel.active { display: block; }
    .calc-object-inline { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .calc-object-inline select { flex: 1; min-width: 180px; }
    .calc-helper-text { font-size: 12px; color: var(--muted); margin-top: 6px; }
    
    /* Cấu trúc 1 lớp, width 100% để fill cột, text-align: center để tự động chừa đều 2 bên mép */
    .matrix-cell,
    math-field.matrix-cell { 
        width: 100% !important; min-height: 38px !important; box-sizing: border-box !important;
        padding: 4px 6px !important; padding-right: 6px !important;
        border: 1px solid var(--border-strong) !important; border-radius: 2px !important; text-align: center !important;
        background: var(--card) !important; color: var(--fg) !important; outline: none !important;
        transition: none !important; font-size: 14px; font-weight: 600;
        cursor: text;
    }
    .matrix-cell:focus,
    math-field.matrix-cell:focus-within {
        border-color: var(--primary-base) !important;
        box-shadow: 0 0 0 2px rgba(33,150,243,0.15) !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
    }
    body.dark-theme .matrix-cell:focus,
    body.dark-theme math-field.matrix-cell:focus-within {
        box-shadow: 0 0 0 2px rgba(96,165,250,0.25) !important;
    }
    math-field.matrix-cell::part(container),
    math-field.matrix-cell::part(content) {
        padding: 0 !important;
        padding-right: 0 !important;
        justify-content: center !important;
        text-align: center !important;
    }
    
    .mat-preview .matrix-cell { font-size: 13px; min-height: 28px; }
    
    .matrix-action-bar { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }

    /* --- MATRIX LIST (Danh sách ma trận) --- */
    #matrixList { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; padding-right: 2px; }

    .mat-item {
        display: flex; flex-direction: column; gap: 6px; padding: 8px 10px;
        border: 1px solid var(--border); border-radius: 2px; background: var(--card);
        transition: none;
    }
    .mat-item:hover { border-color: var(--primary-base); transition: border-color 0.15s ease; }

    .mat-header-row { display: flex; justify-content: space-between; align-items: center; width: 100%; }
    .mat-header-left { display: flex; align-items: center; gap: 6px; }

    .mat-swatch { width: 12px; height: 12px; border-radius: 2px; flex-shrink: 0; border: 1px solid rgba(0,0,0,0.1); }

    .mat-tag {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 12px; font-weight: 700; color: var(--fg);
        padding: 1px 6px; border-radius: 2px; background: rgba(124, 58, 237, 0.1);
    }
    body.dark .mat-tag { background: rgba(139, 92, 246, 0.15); }
    .mat-dim {
        font-size: 11px; font-weight: 600; color: var(--muted);
        padding: 1px 5px; border-radius: 2px; background: var(--border);
        font-family: ui-monospace, monospace;
    }

    .mat-preview {
        display: grid; gap: 4px; padding: 6px 8px; margin: 0;
        background: var(--bg-hover, rgba(0,0,0,0.03)); border: 1px solid var(--border-subtle); border-radius: 2px;
        width: 100%; box-sizing: border-box;
        overflow-x: auto; overflow-y: hidden; max-height: 300px;
    }
    .mat-cell {
        text-align: center; font-size: 12px; font-weight: 600;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        color: var(--fg); padding: 2px 4px !important; min-width: 0;
        background: var(--card); border: 1px solid var(--border-subtle); border-radius: 2px;
        height: 26px; display: flex; align-items: center; justify-content: center;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-sizing: border-box;
    }
    .mat-preview .matrix-cell,
    .mat-preview math-field.matrix-cell {
        font-size: 12px; min-height: 26px !important; height: 26px !important;
        padding: 2px 4px !important; padding-right: 4px !important;
        border-radius: 2px; min-width: 0;
    }

    .mat-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; opacity: 0.6; transition: opacity 0.2s; }
    .mat-item:hover .mat-actions { opacity: 1; }
    .mat-btn-del {
        padding: 3px 6px; background: transparent; border: none; font-size: 13px;
        color: #ef4444; cursor: pointer; border-radius: 2px; transition: background 0.15s;
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

    // --- XỬ LÝ NÚT KHỞI TẠO & DI DỜI NÚT XÓA TẤT CẢ ---
    if (cardCreate) {
        const btnDraw = cardCreate.querySelector("#btnDraw");
        const btnAuto = cardCreate.querySelector("#btnAuto");
        const btnClearAll = cardCreate.querySelector("#btnClearAll");
        
        if (btnDraw) {
            const rowWrap = btnDraw.parentNode;
            btnDraw.style.width = "100%";
            btnDraw.style.padding = "10px 14px";
            btnDraw.style.fontSize = "13.5px";
            btnDraw.style.fontWeight = "600";
            btnDraw.style.borderRadius = "4px";
            btnDraw.innerHTML = '<i class="ph ph-plus" style="margin-right:6px;"></i> Thêm Vector';

            if (rowWrap) {
                rowWrap.innerHTML = "";
                rowWrap.style.display = "block";
                rowWrap.appendChild(btnDraw);
                if (btnAuto) {
                    btnAuto.style.display = "none";
                    rowWrap.appendChild(btnAuto); // Giữ trong DOM cho script khác không bị lỗi null
                }
            }
        }

        // Chuyển nút Xóa tất cả về đúng vị trí: Header của Danh sách vector
        if (cardList && btnClearAll) {
            const listHeader = cardList.querySelector("div");
            if (listHeader) {
                listHeader.style.display = "flex";
                listHeader.style.justifyContent = "space-between";
                listHeader.style.alignItems = "center";
                listHeader.style.marginBottom = "10px";

                btnClearAll.className = "btn-clear-list";
                btnClearAll.innerHTML = '<i class="ph ph-trash"></i> Xóa tất cả';
                listHeader.appendChild(btnClearAll);
            }
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
    btnList.innerHTML = '<i class="ph ph-stack"></i><span>Vector</span>';

    const btnSpace = document.createElement("button");
    btnSpace.className = "tab-btn";
    btnSpace.innerHTML = '<i class="ph ph-cube"></i><span>Cơ sở</span>';

    const btnCalc = document.createElement("button");
    btnCalc.className = "tab-btn";
    btnCalc.innerHTML = '<i class="ph ph-calculator"></i><span>Toán</span>';

    tabNav.append(btnList, btnSpace, btnCalc);

    const contentArea = document.createElement("div");
    contentArea.className = "sidebar-content-area";

    const tabContentList = document.createElement("div");
    tabContentList.className = "tab-content active";

    const initChooser = document.createElement("div");
    initChooser.className = "card";
    initChooser.style.marginBottom = "14px";
    initChooser.innerHTML = `
      <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; display: block; letter-spacing: 0.5px;">Loại đối tượng</label>
      <select id="createObjectSelect">
        <option value="vector" selected>Vector</option>
        <option value="matrix">Ma trận</option>
      </select>
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
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <label style="margin: 0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted); letter-spacing: 0.5px;">Khởi tạo ma trận</label>
        </div>
        <div class="matrix-setup-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size:12px; font-weight:600; color:var(--muted);">Kích thước:</span>
            <input type="number" id="matrixCreateRows" class="matrix-size-input" style="width:40px; padding: 4px;" value="3" min="1" max="5" title="Số hàng (từ 1 đến 5)">
            <span style="color:var(--muted); font-weight:700;">×</span>
            <input type="number" id="matrixCreateCols" class="matrix-size-input" style="width:40px; padding: 4px;" value="3" min="1" max="5" title="Số cột (từ 1 đến 5)">
            <span style="font-size:11px; font-weight:500; color:var(--muted); margin-left:2px;">(1 - 5)</span>
          </div>
          <div style="position: relative; flex-shrink: 0; margin-left: 8px;">
            <button id="matrixMenuBtn" class="custom-menu-btn" title="Chèn công thức toán học" style="padding: 4px 8px; border-radius: 4px; background: transparent; border: 1px solid var(--border); color: var(--fg); cursor: pointer;">
              <i class="ph ph-list"></i>
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
        <div id="matrixCreateGrid" class="matrix-grid-container" style="margin-bottom: 12px;"></div>
        <div style="display:block;">
          <button id="btnAddMatrix" class="btn primary" style="width:100%; padding:9px 12px; font-size:13px; font-weight:600; box-shadow:none !important; border-radius:4px; margin-bottom:8px;">
            <i class="ph ph-plus" style="margin-right:4px;"></i> Thêm Ma Trận
          </button>
          <div style="display:flex; gap:8px;">
            <button id="btnClearAllMatrices" class="btn-sub-action btn-sub-danger" style="flex:1;">
              <i class="ph ph-trash" style="margin-right:4px;"></i> Xóa hết ma trận
            </button>
          </div>
        </div>
      </div>
      <div class="card" style="margin-top: 14px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 12px;">
          <label style="margin: 0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted); letter-spacing: 0.5px;">Danh sách ma trận</label>
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
      <div class="card" style="margin-bottom: 14px;">
        <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; display: block; letter-spacing: 0.5px;">Đối tượng tính toán</label>
        <select id="calcObjectSelect">
          <option value="vector" selected>Vector</option>
          <option value="matrix">Ma trận</option>
          <option value="mixed">Vector + Ma trận</option>
        </select>
      </div>

      <div class="card">
        <div id="calcVectorPanel" class="calc-mode-panel active">
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; display: block; letter-spacing: 0.5px;">Phép tính</label>
              <select id="opSelect" style="width: 100%;">
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
            <div id="calcInputsGrid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: flex-start;">
              <div id="v1Box">
                <label id="v1Label" style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; display: block; letter-spacing: 0.5px;">Vector 1 (v1)</label>
                <select id="v1Select" style="width: 100%; height: 38px;"></select>
              </div>
              <div id="v2Box">
                <label id="v2Label" style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; display: block; letter-spacing: 0.5px;">Vector 2 (v2)</label>
                <select id="v2Select" style="width: 100%; height: 38px;"></select>
              </div>
              <div id="scalarBox" style="display: none;">
                <label id="scalarLabel" style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; display: block; letter-spacing: 0.5px;">Hệ số k</label>
                <input id="scalarInp" type="text" value="2" placeholder="Ví dụ: 2, -1/2, √2" autocomplete="off" spellcheck="false" style="width: 100%; height: 38px; box-sizing: border-box;" />
              </div>
            </div>
            <div style="display:flex; gap:8px;">
              <button id="btnCompute" class="btn primary" data-require-vectors="true" style="flex:1; padding:9px 12px; font-size:13px; font-weight:600; box-shadow:none !important; border-radius:2px;">Thực hiện</button>
              <button id="btnVectorReplay" class="btn secondary" style="display:none; padding:9px 14px; font-size:13px; font-weight:600; border-radius:2px; align-items:center; gap:6px; cursor:pointer;" title="Phát lại hoạt họa của phép tính vừa thực hiện"><i class="ph ph-arrow-counter-clockwise"></i> Phát lại</button>
            </div>
            <div id="calcSteps" class="help" style="margin-top:2px;">Kết quả phép tính sẽ hiển thị ở đây.</div>
          </div>
        </div>

        <div id="calcMatrixPanel" class="calc-mode-panel">
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; display: block; letter-spacing: 0.5px;">Phép toán ma trận</label>
              <select id="matrixOpSelect" style="width: 100%;">
                <option value="det">Tính Định thức (Det)</option>
                <option value="inv">Tìm Ma trận Nghịch đảo</option>
                <option value="rank">Tìm Hạng Ma trận (Rank)</option>
                <option value="transpose">Ma trận Chuyển vị</option>
                <option value="mul_matrix">Ma trận ✕ Ma trận (A ✕ B)</option>
              </select>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
              <span style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--muted); letter-spacing:0.5px;">Ma trận A</span>
              <select id="matrixCalcSavedA" style="font-size:11px; padding:3px 6px; width:auto; min-width:140px;">
                <option value="">- Chọn mẫu đã lưu -</option>
              </select>
            </div>
            <div class="matrix-setup-row">
              <span style="font-size:12px; font-weight:600; color:var(--muted);">Kích thước A:</span>
              <input type="number" id="matrixCalcRowsA" class="matrix-size-input" value="3" min="1" max="5" title="Số hàng (từ 1 đến 5)">
              <span style="color:var(--muted);">✕</span>
              <input type="number" id="matrixCalcColsA" class="matrix-size-input" value="3" min="1" max="5" title="Số cột (từ 1 đến 5)">
              <span style="font-size:11px; font-weight:500; color:var(--muted); margin-left:2px;">(1 - 5)</span>
            </div>
            <div id="matrixCalcGridA" class="matrix-grid-container"></div>
            <div id="matrixCalcBlockB" style="display:none; margin-top:6px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <span style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--muted); letter-spacing:0.5px;">Ma trận B</span>
                <select id="matrixCalcSavedB" style="font-size:11px; padding:3px 6px; width:auto; min-width:140px;">
                  <option value="">- Chọn mẫu đã lưu -</option>
                </select>
              </div>
              <div class="matrix-setup-row">
                <span style="font-size:12px; font-weight:600; color:var(--muted);">Kích thước B:</span>
                <input type="number" id="matrixCalcRowsB" class="matrix-size-input" value="3" min="1" max="5" title="Số hàng (từ 1 đến 5)">
                <span style="color:var(--muted);">✕</span>
                <input type="number" id="matrixCalcColsB" class="matrix-size-input" value="3" min="1" max="5" title="Số cột (từ 1 đến 5)">
                <span style="font-size:11px; font-weight:500; color:var(--muted); margin-left:2px;">(1 - 5)</span>
              </div>
              <div id="matrixCalcGridB" class="matrix-grid-container"></div>
            </div>
            <div style="display: flex; gap: 8px; align-items: stretch; width: 100%;">
              <button id="btnMatrixCompute" class="btn primary" data-require-vectors="false" style="flex: 1; padding: 9px 10px; font-size: 13px; font-weight: 600; box-shadow: none !important; border-radius: 2px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                <i class="ph ph-play"></i> <span>Thực hiện</span>
              </button>
              <button id="btnMatrixReplay" class="btn secondary" style="display: none; padding: 9px 10px; font-size: 13px; font-weight: 600; box-shadow: none !important; border-radius: 2px; align-items: center; justify-content: center; gap: 6px; cursor: pointer;" title="Phát lại hoạt họa của phép tính vừa thực hiện">
                <i class="ph ph-arrow-counter-clockwise"></i> <span>Phát lại</span>
              </button>
              <button id="btnMatrixSpeed" class="btn secondary" style="padding: 9px 10px; font-size: 12px; font-weight: 600; box-shadow: none !important; border-radius: 2px; align-items: center; justify-content: center; min-width: 44px; cursor: pointer;" title="Thay đổi tốc độ mô phỏng (0.5x, 1x, 2x)">
                1x
              </button>
            </div>
          </div>
          <div id="matrixResultBox" class="nice-result-box" style="display:none; margin-top:12px;"></div>
        </div>

        <div id="calcMixedPanel" class="calc-mode-panel">
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; display: block; letter-spacing: 0.5px;">Phép tính</label>
              <select id="mixedOpSelect" style="width: 100%;">
                <option value="mul_vector">Nhân ma trận với vector (A · v)</option>
              </select>
            </div>
            <div class="grid2">
              <div>
                <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; display: block; letter-spacing: 0.5px;">Ma trận (A)</label>
                <select id="mixedMatrixSelect" style="width: 100%;"></select>
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; display: block; letter-spacing: 0.5px;">Vector (v)</label>
                <select id="mixedVectorSelect" style="width: 100%;"></select>
              </div>
            </div>
            <button id="btnMixedCompute" class="btn primary" style="width:100%; padding:9px 12px; font-size:13px; font-weight:600; box-shadow:none !important; border-radius:2px;">Thực hiện</button>
            <div id="mixedResultBox" class="help" style="margin-top:2px;">Kết quả phép tính sẽ hiển thị ở đây.</div>

            <!-- Cụm điều khiển Playback mô phỏng biến đổi tuyến tính -->
            <div id="sidebarTransformPlayback" class="sidebar-playback-box" style="display:none; margin-top:8px;">
              <div class="playback-ctrl-row">
                <button class="transform-btn" id="sbBtnTransformPlay" title="Phát / Tạm dừng (Phím Space)">
                  <i class="ph ph-pause" id="sbIconTransformPlay"></i>
                </button>
                <button class="transform-btn" id="sbBtnTransformReset" title="Về đầu t = 0 (R)">
                  <i class="ph ph-arrow-counter-clockwise"></i>
                </button>
                <button class="transform-btn" id="sbBtnTransformStop" title="Dừng và tắt biến đổi (Esc)">
                  <i class="ph ph-stop"></i>
                </button>
                
                <div class="playback-slider-wrap">
                  <span class="playback-t-label">t=0</span>
                  <input type="range" id="sbTransformSlider" class="playback-slider" min="0" max="1" step="0.005" value="0">
                  <span class="playback-t-label">t=1</span>
                </div>
                
                <span class="playback-t-val" id="sbTransformTVal">t=0.00</span>
                <button class="transform-btn-speed" id="sbBtnTransformSpeed" title="Tốc độ phát">1.0×</button>
              </div>

              <div class="playback-math-card">
                <div class="playback-math-row">
                  <div style="display:flex; align-items:center; gap:4px;">
                    <span class="playback-math-label">M(t) =</span>
                    <div class="playback-matrix-bracket" id="sbPlaybackBracket">
                      <span id="sbCell00">1.00</span><span id="sbCell01">0.00</span>
                      <span id="sbCell10">0.00</span><span id="sbCell11">1.00</span>
                    </div>
                  </div>
                  <div class="playback-det-col">
                    <div style="display:flex; align-items:center; gap:4px;">
                      <span class="playback-math-label" id="sbDetLabel">det =</span>
                      <span class="playback-det-val" id="sbDetVal">1.00</span>
                    </div>
                    <span class="playback-det-desc" id="sbDetDesc">Bảo toàn diện tích</span>
                  </div>
                </div>

                <!-- Layer toggles: bộ lọc lớp hiển thị chống rối thị giác -->
                <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-top:8px; padding-top:8px; border-top:1px dashed var(--border-subtle, rgba(150,150,150,0.15)); font-size:10.5px;">
                  <span style="font-weight:700; color:var(--text-muted); text-transform:uppercase; font-size:9px;">Lớp:</span>
                  <label style="display:inline-flex; align-items:center; gap:3px; margin:0; cursor:pointer;" title="Hình bình hành diện tích / khối hộp thể tích">
                    <input type="checkbox" id="chkShowVolume" checked style="width:13px; height:13px; margin:0; cursor:pointer; accent-color:var(--primary-base, #3b82f6);">
                    <span id="lblShowVolume">Diện tích</span>
                  </label>
                  <label style="display:inline-flex; align-items:center; gap:3px; margin:0; cursor:pointer;" title="Vector cơ sở chỉ phương của không gian">
                    <input type="checkbox" id="chkShowBasis" checked style="width:13px; height:13px; margin:0; cursor:pointer; accent-color:var(--primary-base, #3b82f6);">
                    <span id="lblShowBasis">Cơ sở (i, j)</span>
                  </label>
                  <label style="display:inline-flex; align-items:center; gap:3px; margin:0; cursor:pointer;" title="Đường dóng tổ hợp hình bình hành x·i(t) + y·j(t)">
                    <input type="checkbox" id="chkShowDecomp" checked style="width:13px; height:13px; margin:0; cursor:pointer; accent-color:var(--primary-base, #3b82f6);">
                    <span>Tổ hợp</span>
                  </label>
                  <label style="display:inline-flex; align-items:center; gap:3px; margin:0; cursor:pointer;" title="Vệt chuyển động của vector">
                    <input type="checkbox" id="chkShowTraj" checked style="width:13px; height:13px; margin:0; cursor:pointer; accent-color:var(--primary-base, #3b82f6);">
                    <span>Quỹ đạo</span>
                  </label>
                </div>
                
                <!-- Danh sách tọa độ vector biến đổi theo thời gian thực -->
                <div id="sbVecListContainer" style="display:none; margin-top:8px; padding-top:8px; border-top:1px dashed var(--border-subtle);">
                  <div style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:4px;">Tổ hợp tức thời theo cơ sở:</div>
                  <div id="sbVecListItems" style="display:flex; flex-direction:column; gap:4px; max-height:140px; overflow-y:auto;"></div>
                </div>
              </div>
            </div>
          </div>
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

        // Khi ở tab Toán: nếu đang ở chế độ mixed, làm mới danh sách ma trận & vector
        if (index === 2) {
          if (document.getElementById("calcObjectSelect")?.value === "mixed" && typeof App.refreshTransformTab === "function") {
            App.refreshTransformTab();
          }
        }
        // Nếu rời khỏi tab Toán mà đang chạy biến đổi: dừng mô phỏng
        if (index !== 2 && window.App?.LinearTransform?.isActive?.()) {
          window.App.LinearTransform.stop();
        }
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

      if (mode === "mixed" && typeof App.refreshTransformTab === "function") {
        App.refreshTransformTab();
      }
      if (mode !== "mixed" && mode !== "matrix" && window.App?.LinearTransform?.isActive?.()) {
        window.App.LinearTransform.stop();
      }
    };

    createObjectSelect?.addEventListener("change", toggleCreatePanels);
    calcObjectSelect?.addEventListener("change", toggleCalcPanels);
    toggleCreatePanels();
    toggleCalcPanels();

    const opSelect = document.getElementById("opSelect");
    if (opSelect) {
      opSelect.onchange = () => {
        if (typeof App.refreshCalcUI === "function") App.refreshCalcUI(false);
      };
    }

    const btnCompute = document.getElementById("btnCompute");
    if (btnCompute) {
      btnCompute.onclick = () => App.runCalc(true);
    }
    const btnVectorReplay = document.getElementById("btnVectorReplay");
    if (btnVectorReplay) {
      btnVectorReplay.onclick = () => {
        if (typeof App.replayLastVectorCalc === "function") {
          App.replayLastVectorCalc();
        }
      };
    }

    const btnMatrixCompute = document.getElementById("btnMatrixCompute");
    if (btnMatrixCompute) {
      btnMatrixCompute.dataset.requireVectors = "false";
      btnMatrixCompute.dataset.hasCheck = "true";
      btnMatrixCompute.onclick = () => {
        if (window.App?.LinearTransform?.isActive?.()) {
          window.App.LinearTransform.stop();
          return;
        }
        App.runMatrixCalc(true);
      };
    }

    const btnMatrixReplay = document.getElementById("btnMatrixReplay");
    if (btnMatrixReplay) {
      btnMatrixReplay.onclick = () => {
        if (typeof App.runMatrixCalc === "function") {
          App.runMatrixCalc(true);
        }
      };
    }

    const btnMatrixSpeed = document.getElementById("btnMatrixSpeed");
    if (btnMatrixSpeed) {
      btnMatrixSpeed.onclick = () => {
        if (window.App?.LinearTransform) {
          window.App.LinearTransform.toggleSpeed();
        }
      };
    }

    // --- KHỞI TẠO PANEL TÍNH TOÁN VECTOR + MA TRẬN ---
    const btnMixedCompute = document.getElementById("btnMixedCompute");
    if (btnMixedCompute) {
      btnMixedCompute.onclick = () => {
        if (window.App?.LinearTransform?.isActive?.()) {
          window.App.LinearTransform.stop();
          return;
        }
        App.runMixedCalc(true);
      };
    }

    const mixedMatrixSel = document.getElementById("mixedMatrixSelect");
    if (mixedMatrixSel) {
      mixedMatrixSel.addEventListener("change", () => {
        if (window.App?.LinearTransform?.isActive?.()) {
          window.App.LinearTransform.stop();
        }
      });
    }

    const mixedVectorSel = document.getElementById("mixedVectorSelect");
    if (mixedVectorSel) {
      mixedVectorSel.addEventListener("change", () => {
        if (window.App?.LinearTransform?.isActive?.()) {
          window.App.LinearTransform.stop();
        }
      });
    }

    const matrixOpSelect = document.getElementById("matrixOpSelect");
    const matrixCalcBlockB = document.getElementById("matrixCalcBlockB");
    const matrixVectorInputWrap = document.getElementById("matrixVectorInputWrap");
    const toggleMatrixSecondaryGrid = () => {
      const showB = matrixOpSelect?.value === "mul_matrix";
      const showVectorInput = matrixOpSelect?.value === "mul_vector";
      if (matrixCalcBlockB) matrixCalcBlockB.style.display = showB ? "block" : "none";
      if (matrixVectorInputWrap) matrixVectorInputWrap.style.display = showVectorInput ? "block" : "none";
      if (window.App?.LinearTransform?.isActive?.()) {
        window.App.LinearTransform.stop();
      }
      const btnMatReplay = document.getElementById("btnMatrixReplay");
      if (btnMatReplay) btnMatReplay.style.display = "none";
    };
    matrixOpSelect?.addEventListener("change", toggleMatrixSecondaryGrid);
    toggleMatrixSecondaryGrid();

    const resetMatrixReplay = () => {
      const btnMatReplay = document.getElementById("btnMatrixReplay");
      if (btnMatReplay) btnMatReplay.style.display = "none";
    };
    ["matrixCalcRowsA", "matrixCalcColsA", "matrixCalcRowsB", "matrixCalcColsB", "matrixCalcSavedA", "matrixCalcSavedB"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", resetMatrixReplay);
    });
    ["matrixCalcGridA", "matrixCalcGridB"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", resetMatrixReplay);
        el.addEventListener("change", resetMatrixReplay);
      }
    });

    // Tự động điền dữ liệu ma trận khi chọn từ danh sách đã lưu
    const fillGridFromSaved = (selId, gridId, rowsId, colsId) => {
      const sel = document.getElementById(selId);
      if (!sel || !sel.value) return;
      const m = (App.matrixList || []).find(x => String(x.id) === String(sel.value));
      if (!m || !Array.isArray(m.values) || m.values.length === 0) return;
      const rInp = document.getElementById(rowsId);
      const cInp = document.getElementById(colsId);
      if (rInp) rInp.value = m.rows;
      if (cInp) cInp.value = m.cols;
      if (typeof App.renderDynamicMatrix === "function") {
        App.renderDynamicMatrix({ gridId, rowsInputId: rowsId, colsInputId: colsId });
      }
      for (let i = 0; i < m.rows; i++) {
        for (let j = 0; j < m.cols; j++) {
          const cell = document.getElementById(`${gridId}_cell_${i}_${j}`);
          if (cell) cell.value = String(m.values[i][j]);
        }
      }
    };
    const selSavedA = document.getElementById("matrixCalcSavedA");
    const selSavedB = document.getElementById("matrixCalcSavedB");
    if (selSavedA) selSavedA.addEventListener("change", () => fillGridFromSaved("matrixCalcSavedA", "matrixCalcGridA", "matrixCalcRowsA", "matrixCalcColsA"));
    if (selSavedB) selSavedB.addEventListener("change", () => fillGridFromSaved("matrixCalcSavedB", "matrixCalcGridB", "matrixCalcRowsB", "matrixCalcColsB"));

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
    }

    if (typeof App.refreshMatrixDropdowns === "function") {
      App.refreshMatrixDropdowns();
    }

    if (typeof App.refreshTransformTab === "function") {
      App.refreshTransformTab();
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
    let s = String(latex).trim();
    s = s.replace(/\\left\[|\\right\]/g, "");
    s = s.replace(/\\left\(|\\right\)/g, "");
    s = s.replace(/^\[|\]$/g, "");

    function extractBraces(str, startIdx) {
      if (str[startIdx] !== "{") return null;
      let depth = 0;
      for (let i = startIdx; i < str.length; i++) {
        if (str[i] === "{") depth++;
        else if (str[i] === "}") {
          depth--;
          if (depth === 0) {
            return {
              content: str.substring(startIdx + 1, i),
              endIdx: i
            };
          }
        }
      }
      return null;
    }

    let fracIdx;
    while ((fracIdx = s.indexOf("\\frac")) !== -1) {
      let numStart = fracIdx + 5;
      while (numStart < s.length && s[numStart] === " ") numStart++;
      const numObj = extractBraces(s, numStart);
      if (!numObj) break;
      let denStart = numObj.endIdx + 1;
      while (denStart < s.length && s[denStart] === " ") denStart++;
      const denObj = extractBraces(s, denStart);
      if (!denObj) break;

      const numText = App.latexToText(numObj.content).replace(/^\[|\]$/g, "").trim();
      const denText = App.latexToText(denObj.content).replace(/^\[|\]$/g, "").trim();
      s = s.substring(0, fracIdx) + numText + "/" + denText + s.substring(denObj.endIdx + 1);
    }

    let sqrtIdx;
    while ((sqrtIdx = s.indexOf("\\sqrt")) !== -1) {
      let argStart = sqrtIdx + 5;
      while (argStart < s.length && s[argStart] === " ") argStart++;
      const argObj = extractBraces(s, argStart);
      if (!argObj) break;
      const inner = App.latexToText(argObj.content).replace(/^\[|\]$/g, "").trim();
      s = s.substring(0, sqrtIdx) + "√" + inner + s.substring(argObj.endIdx + 1);
    }

    s = s.replace(/\\pi/g, "π");
    s = s.replace(/\\times/g, "×");
    s = s.replace(/\\cdot/g, "·");
    s = s.replace(/\\pm/g, "±");
    s = s.replace(/\\/g, "");
    s = s.replace(/[{}]/g, "");
    s = s.replace(/\s+/g, " ");
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
          <i class="ph ph-plus-square" style="font-size:28px; opacity:0.3; margin-bottom:8px;"></i>
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
      li.className = "vec-item" + (item.highlighted ? " active" : "");

      const sw = document.createElement("div");
      sw.className = "sw";
      sw.style.background = item.colorCss;

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

      // Ghi nhớ trạng thái trước khi chỉnh sửa để hỗ trợ Hoàn tác (Undo)
      mf.addEventListener("focus", () => {
        if (App.History && typeof App.History.snapshot === "function") {
          item._preEditState = App.History.snapshot(`Sửa vector #${item.id}`);
        }
      });
      mf.addEventListener("change", () => {
        if (item._preEditState && App.History && typeof App.History.record === "function") {
          App.History.record(`Sửa vector #${item.id}`, item._preEditState);
          item._preEditState = null;
        }
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
      btn.innerHTML = '<i class="ph ph-list"></i>';
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

      const actions = document.createElement("div");
      actions.className = "vec-actions";

      const focusBtn = document.createElement("button");
      focusBtn.className = "btn";
      focusBtn.innerHTML = item.focus ? '<i class="ph ph-star" style="color:#f59e0b"></i>' : '<i class="ph ph-star"></i>';
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
      toggleBtn.innerHTML = item.visible ? '<i class="ph ph-eye"></i>' : '<i class="ph ph-eye-slash"></i>';
      toggleBtn.title = "Ẩn/Hiện";
      toggleBtn.onclick = (e) => {
        e.stopPropagation();
        item.visible = !item.visible;
        toggleBtn.innerHTML = item.visible ? '<i class="ph ph-eye"></i>' : '<i class="ph ph-eye-slash" style="color: #888"></i>';
        if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
        else if (window.Vec2D) Vec2D.draw2DAllVectors();
      };

      const del = document.createElement("button");
      del.className = "btn vec-btn-delete";
      del.innerHTML = '<i class="ph ph-trash"></i>';
      del.title = "Xóa";

      // SỰ KIỆN XÓA (Đã có đủ hàm đồng bộ & Hoàn tác)
      del.onclick = (e) => {
        e.stopPropagation();
        if (App.History && typeof App.History.record === "function") {
          App.History.record(`Xóa vector #${item.id}`);
        }
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

      li.appendChild(sw);
      li.appendChild(tag);
      li.appendChild(wrapper);
      li.appendChild(actions);
      el.appendChild(li);
    }
    requestAnimationFrame(() => {
        el.scrollTop = currentScroll;
    });

    if (typeof App.refreshTransformTab === "function") {
      App.refreshTransformTab();
    }
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

      // 1. Tạo dòng Placeholder mặc định (không disabled để trình duyệt không tự nhảy sang option đầu)
      const placeholder = document.createElement("option");
      placeholder.text = "-- Chọn vector --";
      placeholder.value = "";
      placeholder.selected = true;
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

      // 4. Gắn sự kiện: Hễ chọn là chạy hàm ẩn/hiện, xóa vết cũ và ẩn nút Phát lại
      sel.onchange = function () {
        const btnReplay = document.getElementById("btnVectorReplay");
        if (btnReplay) btnReplay.style.display = "none";
        App._lastVectorOp = null;

        // Xóa sạch tàn dư hình chiếu và góc cũ khi đổi vector
        App.currentProjVisual = null;
        App.tempGhosts = [];
        if (App._currentProjLine3D && App._currentProjLine3D.parent) {
          App._currentProjLine3D.parent.remove(App._currentProjLine3D);
          App._currentProjLine3D = null;
        }
        if (App._projGroup3D && App._projGroup3D.parent) {
          App._projGroup3D.clear();
          App._projGroup3D.parent.remove(App._projGroup3D);
          App._projGroup3D = null;
        }
        if (typeof App.clearAngleOverlay === "function") App.clearAngleOverlay();
        if (typeof App.refreshProjectionOverlay === "function") App.refreshProjectionOverlay();

        if (App.updateVisibilityByCalc) App.updateVisibilityByCalc();
        if (typeof App.redrawAll === "function") App.redrawAll({ frame: false });
      };
    });

    const scalarInp = document.getElementById("scalarInp");
    if (scalarInp && !scalarInp._hasReplayListener) {
      scalarInp._hasReplayListener = true;
      scalarInp.addEventListener("input", function () {
        const btnReplay = document.getElementById("btnVectorReplay");
        if (btnReplay) btnReplay.style.display = "none";
        App._lastVectorOp = null;
      });
    }

    if (typeof App.refreshMixedCalcOptions === "function") {
      App.refreshMixedCalcOptions();
    }
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
        <i class="ph ph-magnifying-glass search-icon"></i>
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
    actions.style.alignItems = "center";
    actions.style.padding = "0 4px";
    actions.style.marginBottom = "8px";
    actions.innerHTML = `
        <label style="display:inline-flex; align-items:center; gap:8px; font-size:12px; font-weight:600; color:var(--fg); cursor:pointer;">
            <input type="checkbox" style="width: 16px; height: 16px; cursor: pointer; accent-color: var(--primary-base); margin: 0;">
            <span>Chọn tất cả</span>
        </label>
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

      // Cấu trúc phẳng 1 hàng: checkbox -> màu -> tag -> math-field
      row.innerHTML = `
          <input type="checkbox" id="chk_${name}_${it.id}" value="${it.id}" style="width: 16px; height: 16px; cursor: pointer; accent-color: var(--primary-base); margin: 0; flex-shrink: 0; pointer-events: none;">
          <div class="sw" style="background: ${it.colorCss}; width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0;"></div>
          <span class="tag" style="font-size: 11px; font-weight: 700; color: var(--muted); background: var(--chip-bg); border: 1px solid var(--border); padding: 1px 6px; border-radius: 2px; flex-shrink: 0;">#${App.displayIndexOf(it)}</span>
          <div class="vec-input-wrapper" style="flex: 1; min-width: 0; pointer-events: none; border: none !important; background: transparent !important; padding: 0;">
              <math-field class="vec-math-field" read-only="true" math-virtual-keyboard-policy="none" tabindex="-1" style="background: transparent; border: none; width: 100%;">
                  ${it.latex || App.formatVectorShort(it.vec)}
              </math-field>
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
      window.App.showToast("Danh sách trống! Hãy tạo vector trước.", 'warning');
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

      // Bỏ qua các nút thao tác ma trận thuần túy không yêu cầu vector
      if (
        btn.dataset.requireVectors === "false" ||
        btn.id === "btnMatrixCompute" ||
        (btn.closest && btn.closest("#calcMatrixPanel"))
      ) {
        continue;
      }

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
              if (
                btn.dataset.requireVectors === "false" ||
                btn.id === "btnMatrixCompute" ||
                (btn.closest && btn.closest("#calcMatrixPanel"))
              ) {
                return;
              }
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

    const rows = Math.max(1, Math.min(5, parseInt(rowsInput.value) || 1));
    const cols = Math.max(1, Math.min(5, parseInt(colsInput.value) || 1));

    const cells = Array.from(grid.querySelectorAll(".matrix-cell, input.matrix-cell"));
    if (cells.length !== rows * cols) return null;

    const values = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) {
        let raw = cells[i * cols + j].value;
        if (typeof raw === "string") raw = raw.trim();
        let num = Number(raw);
        if (!Number.isFinite(num)) {
          try {
            if (window.App && typeof App.parseVectorExpr === "function") {
              const parsed = App.parseVectorExpr(`[${raw}]`);
              if (parsed && Number.isFinite(Number(parsed[0]))) {
                num = Number(parsed[0]);
              }
            }
          } catch (e) {}
        }
        row.push(Number.isFinite(num) ? num : 0);
      }
      values.push(row);
    }
    return { rows, cols, values };
  }

  App.refreshMatrixDropdowns = function() {
    const selects = [
      document.getElementById("matrixSavedSelect"),
      document.getElementById("mixedSavedSelect"),
      document.getElementById("matrixCalcSavedA"),
      document.getElementById("matrixCalcSavedB")
    ];
    selects.forEach(sel => {
      if (!sel) return;
      const curVal = sel.value;
      sel.innerHTML = '<option value="">- Chọn mẫu đã lưu -</option>';
      if (Array.isArray(App.matrixList)) {
        App.matrixList.forEach(m => {
          const opt = document.createElement("option");
          opt.value = m.id;
          opt.textContent = `${m.name} (${m.rows}✕${m.cols})`;
          sel.appendChild(opt);
        });
      }
      sel.value = curVal;
      if (curVal) {
        sel.dispatchEvent(new Event('change'));
      }
    });
    if (typeof App.refreshTransformTab === "function") {
      App.refreshTransformTab();
    }
  };

  App.refreshMixedCalcOptions = function () {
    const matSel = document.getElementById("mixedMatrixSelect");
    const vecSel = document.getElementById("mixedVectorSelect");
    const matrices = Array.isArray(App.matrixList) ? App.matrixList : [];
    const vectors = Array.isArray(App.vectorList) ? App.vectorList : [];

    if (matSel) {
      const prevMat = matSel.value;
      matSel.innerHTML = "";
      if (matrices.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "(Chưa có ma trận)";
        matSel.appendChild(opt);
      } else {
        matrices.forEach((m) => {
          const opt = document.createElement("option");
          opt.value = String(m.id);
          const r = m.rows || (m.values ? m.values.length : 2);
          const c = m.cols || (m.values && m.values[0] ? m.values[0].length : 2);
          opt.textContent = `${m.name || "A"} (${r}✕${c})`;
          matSel.appendChild(opt);
        });
        if (prevMat && matrices.some((m) => String(m.id) === String(prevMat))) {
          matSel.value = prevMat;
        }
      }
    }

    if (vecSel) {
      const prevVec = vecSel.value;
      vecSel.innerHTML = "";
      if (vectors.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "(Chưa có vector)";
        vecSel.appendChild(opt);
      } else {
        if (vectors.length > 1) {
          const optAll = document.createElement("option");
          optAll.value = "all";
          optAll.textContent = "Tất cả vector";
          vecSel.appendChild(optAll);
        }
        vectors.forEach((v) => {
          const opt = document.createElement("option");
          opt.value = String(v.id);
          const coords = Array.isArray(v.vec) ? `[${v.vec.join(", ")}]` : "";
          opt.textContent = `${v.name || "v"} = ${coords}`;
          vecSel.appendChild(opt);
        });
        if (prevVec && (prevVec === "all" || vectors.some((v) => String(v.id) === String(prevVec)))) {
          vecSel.value = prevVec;
        }
      }
    }
  };

  App.refreshTransformTab = App.refreshMixedCalcOptions;

  App.fillMatrixGrid = function(gridId, rowsInputId, colsInputId, values) {
    if (!Array.isArray(values) || !values.length) return;
    const rows = values.length;
    const cols = values[0].length;
    const rowsInput = document.getElementById(rowsInputId);
    const colsInput = document.getElementById(colsInputId);
    if (rowsInput) rowsInput.value = rows;
    if (colsInput) colsInput.value = cols;

    if (typeof App.renderDynamicMatrix === "function") {
      App.renderDynamicMatrix({ gridId, rowsInputId, colsInputId });
    }

    setTimeout(() => {
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const cell = document.getElementById(`${gridId}_cell_${i}_${j}`);
          if (cell) {
            cell.value = String(values[i][j]);
          }
        }
      }
    }, 25);
  };

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

  function computeDetWithSteps(M) {
    const n = M.length;
    if (!n || M[0].length !== n) return null;
    const fmtVal = (num) => {
      const x = Number(num);
      if (isNaN(x)) return "0";
      if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
      return String(parseFloat(x.toFixed(4)));
    };
    if (n === 2) {
      const a = Number(M[0][0]) || 0, b = Number(M[0][1]) || 0;
      const c = Number(M[1][0]) || 0, d = Number(M[1][1]) || 0;
      const det = a * d - b * c;
      const steps = [
        `Áp dụng công thức Leibniz cho ma trận vuông cấp 2: \\( \\det(A) = ad - bc \\)`,
        `Thay số chi tiết: \\( \\det(A) = (${fmtVal(a)})(${fmtVal(d)}) - (${fmtVal(b)})(${fmtVal(c)}) = ${fmtVal(a * d)} - (${fmtVal(b * c)}) = ${fmtVal(det)} \\)`
      ];
      return { det, steps };
    }
    if (n === 3) {
      const a11 = Number(M[0][0]) || 0, a12 = Number(M[0][1]) || 0, a13 = Number(M[0][2]) || 0;
      const m11 = (Number(M[1][1]) || 0) * (Number(M[2][2]) || 0) - (Number(M[1][2]) || 0) * (Number(M[2][1]) || 0);
      const m12 = (Number(M[1][0]) || 0) * (Number(M[2][2]) || 0) - (Number(M[1][2]) || 0) * (Number(M[2][0]) || 0);
      const m13 = (Number(M[1][0]) || 0) * (Number(M[2][1]) || 0) - (Number(M[1][1]) || 0) * (Number(M[2][0]) || 0);
      const det = a11 * m11 - a12 * m12 + a13 * m13;
      const steps = [
        `Khai triển Laplace theo hàng thứ nhất: \\( \\det(A) = a_{11}M_{11} - a_{12}M_{12} + a_{13}M_{13} \\)`,
        `• Định thức con \\( M_{11} = (${fmtVal(M[1][1])})(${fmtVal(M[2][2])}) - (${fmtVal(M[1][2])})(${fmtVal(M[2][1])}) = ${fmtVal(m11)} \\)`,
        `• Định thức con \\( M_{12} = (${fmtVal(M[1][0])})(${fmtVal(M[2][2])}) - (${fmtVal(M[1][2])})(${fmtVal(M[2][0])}) = ${fmtVal(m12)} \\)`,
        `• Định thức con \\( M_{13} = (${fmtVal(M[1][0])})(${fmtVal(M[2][1])}) - (${fmtVal(M[1][1])})(${fmtVal(M[2][0])}) = ${fmtVal(m13)} \\)`,
        `\\( \\implies \\det(A) = (${fmtVal(a11)})(${fmtVal(m11)}) - (${fmtVal(a12)})(${fmtVal(m12)}) + (${fmtVal(a13)})(${fmtVal(m13)}) = ${fmtVal(det)} \\)`
      ];
      return { det, steps };
    }
    // n >= 4: Gaussian elimination to upper triangular
    const a = M.map(row => row.map(Number));
    let det = 1;
    let swaps = 0;
    const steps = [`Đưa ma trận về dạng tam giác trên bằng phương pháp khử Gauss:`];
    for (let i = 0; i < n; i++) {
      let pivot = i;
      while (pivot < n && Math.abs(a[pivot][i]) < 1e-9) pivot++;
      if (pivot === n) {
        steps.push(`Cột ${i + 1} toàn phần tử 0 bên dưới đường chéo. Định thức bằng 0.`);
        return { det: 0, steps };
      }
      if (pivot !== i) {
        [a[i], a[pivot]] = [a[pivot], a[i]];
        swaps++;
        steps.push(`Đổi chỗ Hàng ${i + 1} và Hàng ${pivot + 1}, định thức đổi dấu.`);
      }
      const piv = a[i][i];
      det *= piv;
      for (let r = i + 1; r < n; r++) {
        if (Math.abs(a[r][i]) > 1e-9) {
          const factor = a[r][i] / piv;
          for (let c = i; c < n; c++) a[r][c] -= factor * a[i][c];
          steps.push(`Hàng ${r + 1} = Hàng ${r + 1} - (${fmtVal(factor)}) ✕ Hàng ${i + 1}`);
        }
      }
    }
    if (swaps % 2 !== 0) det = -det;
    steps.push(`Tích các phần tử trên đường chéo chính: \\( \\det(A) = ${fmtVal(det)} \\)`);
    return { det, steps };
  }

  function computeInverseWithSteps(M) {
    const n = M.length;
    if (!n || M[0].length !== n) return null;
    const fmtVal = (num) => {
      const x = Number(num);
      if (isNaN(x)) return "0";
      if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
      return String(parseFloat(x.toFixed(4)));
    };
    const toMatrixLatex = (mat) => {
      if (!Array.isArray(mat) || !mat.length) return "";
      return "\\begin{bmatrix} " + mat.map(row => row.map(fmtVal).join(" & ")).join(" \\\\ ") + " \\end{bmatrix}";
    };

    const detRes = computeDetWithSteps(M);
    if (!detRes || Math.abs(detRes.det) < 1e-9) {
      return { inv: null, det: detRes ? detRes.det : 0, steps: ["Định thức \\( \\det(A) = 0 \\). Ma trận suy biến, không tồn tại ma trận nghịch đảo."] };
    }
    const det = detRes.det;
    if (n === 2) {
      const a = Number(M[0][0]) || 0, b = Number(M[0][1]) || 0;
      const c = Number(M[1][0]) || 0, d = Number(M[1][1]) || 0;
      const inv = [
        [d / det, -b / det],
        [-c / det, a / det]
      ];
      const steps = [
        `Định thức \\( \\det(A) = ${fmtVal(det)} \\neq 0 \\), ma trận thỏa mãn điều kiện khả nghịch.`,
        `Áp dụng công thức ma trận phụ hợp: \\( A^{-1} = \\frac{1}{\\det(A)} \\begin{bmatrix} d & -b \\\\ -c & a \\end{bmatrix} \\)`,
        `Thay số chi tiết: \\( A^{-1} = \\frac{1}{${fmtVal(det)}} \\begin{bmatrix} ${fmtVal(d)} & ${fmtVal(-b)} \\\\ ${fmtVal(-c)} & ${fmtVal(a)} \\end{bmatrix} = ${toMatrixLatex(inv)} \\)`
      ];
      return { inv, det, steps };
    }
    const a = M.map(row => row.map(Number));
    const aug = a.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
    const steps = [
      `Định thức \\( \\det(A) = ${fmtVal(det)} \\neq 0 \\), ma trận khả nghịch.`,
      `Áp dụng thuật toán khử toàn phần Gauss-Jordan trên ma trận mở rộng \\( [A \\mid I_n] \\):`
    ];
    for (let i = 0; i < n; i++) {
      let pivot = i;
      while (pivot < n && Math.abs(aug[pivot][i]) < 1e-9) pivot++;
      if (pivot === n) return { inv: null, det: 0, steps: ["Không tìm thấy phần tử dẫn đầu khác 0. Ma trận không khả nghịch."] };
      if (pivot !== i) {
        [aug[i], aug[pivot]] = [aug[pivot], aug[i]];
        steps.push(`Đổi chỗ Hàng ${i + 1} và Hàng ${pivot + 1}`);
      }
      const pivVal = aug[i][i];
      for (let c = 0; c < 2 * n; c++) aug[i][c] /= pivVal;
      steps.push(`Chuẩn hóa Hàng ${i + 1}: chia cho phần tử dẫn đầu bằng ${fmtVal(pivVal)} để hệ số chéo bằng 1`);
      for (let r = 0; r < n; r++) {
        if (r !== i && Math.abs(aug[r][i]) > 1e-9) {
          const factor = aug[r][i];
          for (let c = 0; c < 2 * n; c++) aug[r][c] -= factor * aug[i][c];
          steps.push(`Hàng ${r + 1} = Hàng ${r + 1} - (${fmtVal(factor)}) ✕ Hàng ${i + 1}`);
        }
      }
    }
    const inv = aug.map(row => row.slice(n));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (Math.abs(inv[r][c]) < 1e-9) inv[r][c] = 0;
      }
    }
    steps.push(`Thu được ma trận đơn vị ở nửa trái: \\( [I_n \\mid A^{-1}] \\).`);
    return { inv, det, steps };
  }

  function computeRankWithSteps(M) {
    const a = M.map(row => row.map(Number));
    const rows = a.length, cols = a[0]?.length || 0;
    const fmtVal = (num) => {
      const x = Number(num);
      if (isNaN(x)) return "0";
      if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
      return String(parseFloat(x.toFixed(4)));
    };
    const toMatrixLatex = (mat) => {
      if (!Array.isArray(mat) || !mat.length) return "";
      return "\\begin{bmatrix} " + mat.map(row => row.map(fmtVal).join(" & ")).join(" \\\\ ") + " \\end{bmatrix}";
    };

    const steps = [`Đưa ma trận về dạng bậc thang bằng các phép biến đổi sơ cấp theo hàng:`];
    let rank = 0, pivotCol = 0;
    for (let row = 0; row < rows && pivotCol < cols; row++) {
      let pivot = row;
      while (pivot < rows && Math.abs(a[pivot][pivotCol]) < 1e-9) pivot++;
      if (pivot === rows) { pivotCol++; row--; continue; }
      if (pivot !== row) {
        [a[row], a[pivot]] = [a[pivot], a[row]];
        steps.push(`Đổi chỗ Hàng ${row + 1} và Hàng ${pivot + 1}`);
      }
      const pivVal = a[row][pivotCol];
      for (let r = row + 1; r < rows; r++) {
        if (Math.abs(a[r][pivotCol]) > 1e-9) {
          const factor = a[r][pivotCol] / pivVal;
          for (let c = pivotCol; c < cols; c++) a[r][c] -= factor * a[row][c];
          steps.push(`Hàng ${r + 1} = Hàng ${r + 1} - (${fmtVal(factor)}) ✕ Hàng ${row + 1}`);
        }
      }
      rank++; pivotCol++;
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.abs(a[r][c]) < 1e-9) a[r][c] = 0;
      }
    }
    steps.push(`Ma trận bậc thang thu được: \\( ${toMatrixLatex(a)} \\)`);
    steps.push(`Số hàng khác không trong ma trận bậc thang là: <b>${rank}</b>.`);
    return { rank, echelon: a, steps, nullity: cols - rank };
  }

  function computeTransposeWithSteps(M) {
    const rows = M.length, cols = M[0]?.length || 0;
    const fmtVal = (num) => {
      const x = Number(num);
      if (isNaN(x)) return "0";
      if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
      return String(parseFloat(x.toFixed(4)));
    };
    const AT = [];
    const steps = [`Quy tắc chuyển vị: Đổi các hàng của ma trận \\( A \\) thành các cột tương ứng của \\( A^T \\): \\( (A^T)_{ji} = A_{ij} \\)`];
    for (let j = 0; j < cols; j++) {
      const newCol = [];
      for (let i = 0; i < rows; i++) {
        newCol.push(M[i][j]);
      }
      AT.push(newCol);
      steps.push(`• Cột ${j + 1} của \\( A^T \\) lấy từ Hàng ${j + 1} của \\( A \\): \\( [${newCol.map(fmtVal).join(",\\; ")}]^T \\)`);
    }
    return { AT, steps };
  }

  function computeMulMatrixWithSteps(A, B) {
    const rowsA = A.length, colsA = A[0]?.length || 0;
    const rowsB = B.length, colsB = B[0]?.length || 0;
    if (colsA !== rowsB) return null;
    const fmtVal = (num) => {
      const x = Number(num);
      if (isNaN(x)) return "0";
      if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
      return String(parseFloat(x.toFixed(4)));
    };
    const C = [];
    const steps = [
      `Điều kiện khả tích thỏa mãn: ma trận A cấp ${rowsA}✕${colsA} nhân với ma trận B cấp ${rowsB}✕${colsB} cho ma trận tích C cấp ${rowsA}✕${colsB}.`,
      `Công thức phần tử tổng quát: \\( C_{ij} = \\sum_{k=1}^{${colsA}} A_{ik} B_{kj} \\)`
    ];
    for (let i = 0; i < rowsA; i++) {
      const row = [];
      for (let j = 0; j < colsB; j++) {
        let sum = 0;
        const terms = [];
        for (let k = 0; k < colsA; k++) {
          const prod = (Number(A[i][k]) || 0) * (Number(B[k][j]) || 0);
          sum += prod;
          terms.push(`(${fmtVal(A[i][k])})(${fmtVal(B[k][j])})`);
        }
        row.push(sum);
        steps.push(`• Phần tử \\( C_{${i + 1}${j + 1}} = ${terms.join(" + ")} = ${fmtVal(sum)} \\)`);
      }
      C.push(row);
    }
    return { C, steps };
  }

  App.runMatrixCalc = function (triggerAnimation = true) {
    const op = document.getElementById("matrixOpSelect")?.value || "det";
    const resultBox = document.getElementById("matrixResultBox");
    const AData = parseMatrixGridValues("matrixCalcGridA", "matrixCalcRowsA", "matrixCalcColsA");
    if (!AData) {
      if (resultBox) {
        resultBox.className = "";
        resultBox.style.display = "block";
        resultBox.style.padding = "0";
        resultBox.style.border = "none";
        resultBox.style.background = "transparent";
        resultBox.innerHTML = App.renderUnifiedResult(
          "LỖI DỮ LIỆU",
          `<span style="color:var(--danger, #e5484d); font-size:12px;">Vui lòng nhập đầy đủ các phần tử của ma trận A.</span>`
        );
      }
      return;
    }

    const fmtVal = (num) => {
      const x = Number(num);
      if (isNaN(x)) return "0";
      if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
      return String(parseFloat(x.toFixed(4)));
    };

    const toMatrixLatex = (mat) => {
      if (!Array.isArray(mat) || !mat.length) return "";
      return "\\begin{bmatrix} " + mat.map(row => row.map(fmtVal).join(" & ")).join(" \\\\ ") + " \\end{bmatrix}";
    };

    let title = "KẾT QUẢ MA TRẬN";
    let resultLatex = "";
    let detailsHtml = "";
    let animOptions = null;
    let animMatrix = null;
    let isAnimSupported = false;

    if (op === "det") {
      title = "ĐỊNH THỨC MA TRẬN";
      if (AData.rows !== AData.cols) {
        detailsHtml = `
          <div class="calc-section-title">Cách tính đại số</div>
          <div class="calc-explanation-block">
            Theo định nghĩa toán học, định thức chỉ được xác định trên ma trận vuông. Ma trận hiện tại có kích thước ${AData.rows} × ${AData.cols}, không thỏa mãn điều kiện tồn tại định thức.
          </div>
          <div class="calc-section-title">Ý nghĩa hình học</div>
          <div class="calc-explanation-block">
            Phép biến đổi chuyển giữa hai không gian khác số chiều (${AData.cols} chiều sang ${AData.rows} chiều). Do số chiều không gian nguồn và không gian đích không đồng nhất, không tạo thành khối đa diện cùng chiều để đo lường hệ số co dãn thể tích.
          </div>
        `;
        resultLatex = "\\text{Không khả dụng}";
      } else {
        const res = computeDetWithSteps(AData.values);
        const det = res.det;
        const fmtDet = fmtVal(det);
        const absDet = fmtVal(Math.abs(det));
        resultLatex = `\\det(A) = ${fmtDet}`;

        let geomDesc = "";
        if (AData.rows === 2) {
          const a = Number(AData.values[0][0]) || 0;
          const c = Number(AData.values[0][1]) || 0;
          const b = Number(AData.values[1][0]) || 0;
          const d = Number(AData.values[1][1]) || 0;
          let orientDesc = "";
          if (Math.abs(det) < 1e-4) {
            orientDesc = "Định thức bằng 0: Hai vector cột cùng phương hoặc triệt tiêu, làm phẳng hình bình hành thành một đoạn thẳng có diện tích bằng 0.";
          } else if (det < 0) {
            orientDesc = `Định thức mang giá trị âm (${fmtDet}): Mặt phẳng bị đảo định hướng qua phép đối xứng trục, thứ tự quét từ vector thứ nhất sang vector thứ hai chuyển thành cùng chiều kim đồng hồ. Diện tích có hướng mang giá trị âm ${fmtDet}.`;
          } else {
            orientDesc = `Định thức mang giá trị dương (${fmtDet}): Mặt phẳng bảo toàn định hướng chuẩn, thứ tự quét từ vector thứ nhất sang vector thứ hai ngược chiều kim đồng hồ.`;
          }
          geomDesc = `
            • <b>Hình bình hành cơ sở:</b> Hình vuông đơn vị ban đầu (diện tích 1) được hai vector cột \\( \\vec{i}' = [${fmtVal(a)}, ${fmtVal(b)}]^T \\) và \\( \\vec{j}' = [${fmtVal(c)}, ${fmtVal(d)}]^T \\) tạo thành hình bình hành trên mặt phẳng.<br/>
            • <b>Độ lớn \\( |\\det(A)| = ${absDet} \\):</b> Diện tích hình bình hành bằng đúng ${absDet} đơn vị diện tích, biểu thị tỷ lệ dãn nở diện tích của mặt phẳng.<br/>
            • <b>Dấu của định thức:</b> ${orientDesc}
          `;
        } else if (AData.rows === 3) {
          let orientDesc = "";
          if (Math.abs(det) < 1e-4) {
            orientDesc = "Định thức bằng 0: Ba vector cột đồng phẳng, nén khối hộp 3D thành một mặt phẳng hoặc đường thẳng có thể tích bằng 0.";
          } else if (det < 0) {
            orientDesc = `Định thức mang giá trị âm (${fmtDet}): Hệ trục tọa độ bị đảo định hướng (chuyển từ quy tắc bàn tay phải sang quy tắc bàn tay trái).`;
          } else {
            orientDesc = `Định thức mang giá trị dương (${fmtDet}): Hệ trục tọa độ giữ nguyên định hướng thuận theo quy tắc bàn tay phải.`;
          }
          geomDesc = `
            • <b>Khối hộp cơ sở:</b> Khối lập phương đơn vị ban đầu (thể tích 1) được ba vector cột biến đổi thành khối hộp ba chiều.<br/>
            • <b>Độ lớn \\( |\\det(A)| = ${absDet} \\):</b> Thể tích của khối hộp này đo được đúng bằng ${absDet} đơn vị thể tích, biểu thị hệ số biến thiên thể tích không gian.<br/>
            • <b>Dấu của định thức:</b> ${orientDesc}
          `;
        } else {
          geomDesc = `• <b>Độ lớn định thức \\( |\\det(A)| = ${absDet} \\):</b> Khối hộp đơn vị ${AData.rows} chiều sau biến đổi có siêu thể tích bằng đúng ${absDet}.`;
        }

        detailsHtml = `
          <div class="calc-section-title">Cách tính đại số</div>
          <div class="calc-explanation-block">
            ${res.steps.join("<br/>")}
          </div>
          <div class="calc-section-title">Ý nghĩa hình học</div>
          <div class="calc-explanation-block">
            ${geomDesc}
          </div>
        `;

        if (AData.rows === 2 || AData.rows === 3) {
          isAnimSupported = true;
          animMatrix = AData.values;
          animOptions = { mode: "det", title: `Định thức: det = ${fmtDet}` };
        }
      }
    } else if (op === "inv") {
      title = "MA TRẬN NGHỊCH ĐẢO";
      if (AData.rows !== AData.cols) {
        detailsHtml = `
          <div class="calc-section-title">Cách tính đại số</div>
          <div class="calc-explanation-block">
            Ma trận nghịch đảo chỉ tồn tại đối với ma trận vuông. Ma trận hiện tại có kích thước ${AData.rows} × ${AData.cols}, không phải ma trận vuông nên không thỏa mãn điều kiện khả nghịch.
          </div>
          <div class="calc-section-title">Ý nghĩa hình học</div>
          <div class="calc-explanation-block">
            Phép biến đổi chuyển giữa hai không gian khác số chiều dẫn đến mất mát chiều không gian hoặc sinh bậc tự do dôi dư, do đó không thể khôi phục trạng thái ban đầu một cách duy nhất.
          </div>
        `;
        resultLatex = "\\text{Không khả dụng}";
      } else {
        const res = computeInverseWithSteps(AData.values);
        if (!res.inv) {
          resultLatex = "\\text{Không tồn tại } A^{-1}";
          const rankRes = computeRankWithSteps(AData.values);
          detailsHtml = `
            <div class="calc-section-title">Cách tính đại số</div>
            <div class="calc-explanation-block">
              Theo định lý khả nghịch, ma trận vuông A tồn tại ma trận nghịch đảo khi và chỉ khi định thức khác 0. Tính toán cho thấy \\( \\det(A) = 0 \\). Do định thức triệt tiêu, ma trận A suy biến nên không tồn tại ma trận nghịch đảo.
            </div>
            <div class="calc-section-title">Ý nghĩa hình học</div>
            <div class="calc-explanation-block">
              • <b>Không gian ảnh:</b> Không gian bị nén sụp thành không gian con có số chiều thấp hơn, tương ứng hạng \\( \\text{Rank}(A) = ${rankRes.rank} \\).<br/>
              • <b>Không gian hạt nhân:</b> Không gian hạt nhân có số chiều \\( \\text{dim}(\\text{Ker } A) = ${rankRes.nullity} \\) bị ánh xạ về gốc tọa độ. Vô số điểm khác nhau bị nén về cùng một vị trí.<br/>
              • <b>Tính bất khả nghịch:</b> Do nhiều điểm ban đầu bị dồn thành một điểm duy nhất, không tồn tại phép biến đổi tuyến tính ngược để phân tách điểm đó về các điểm ban đầu.
            </div>
          `;
          if (AData.rows === 2 || AData.rows === 3) {
            isAnimSupported = true;
            animMatrix = AData.values;
            animOptions = { mode: "rank", rank: rankRes.rank, title: "Suy biến: det = 0 (Không khả nghịch)" };
          }
        } else {
          resultLatex = `A^{-1} = ${toMatrixLatex(res.inv)}`;
          const detRes = computeDetWithSteps(AData.values);
          const detVal = detRes ? detRes.det : 1;
          const absDetStr = fmtVal(Math.abs(detVal));
          const invDetStr = fmtVal(Math.abs(1 / detVal));

          let geomInvDesc = "";
          if (AData.rows === 2) {
            geomInvDesc = `
              • <b>Hệ vector cơ sở mới:</b> Phép biến đổi tuyến tính xác định bởi ma trận nghịch đảo \\( A^{-1} \\) biến đổi hệ vector đơn vị trực chuẩn \\( \\vec{i} = [1, 0]^T \\), \\( \\vec{j} = [0, 1]^T \\) thành hai vector cột của \\( A^{-1} \\).<br/>
              • <b>Tỷ lệ co dãn diện tích:</b> Tỷ lệ biến thiên diện tích của \\( A^{-1} \\) bằng đúng nghịch đảo độ lớn định thức của ma trận ban đầu: \\( |\\det(A^{-1})| = \\frac{1}{|\\det(A)|} = \\frac{1}{${absDetStr}} = ${invDetStr} \\).<br/>
              • <b>Quan hệ đối ngẫu:</b> Khi áp dụng liên tiếp phép biến đổi \\( A \\) và \\( A^{-1} \\), mọi điểm trên mặt phẳng được đưa về vị trí ban đầu theo đẳng thức hợp thành \\( A^{-1}A = I \\).
            `;
          } else if (AData.rows === 3) {
            geomInvDesc = `
              • <b>Hệ vector cơ sở mới:</b> Phép biến đổi tuyến tính xác định bởi ma trận nghịch đảo \\( A^{-1} \\) biến đổi hệ vector đơn vị trực chuẩn ba chiều \\( \\vec{i}, \\vec{j}, \\vec{k} \\) thành ba vector cột của \\( A^{-1} \\).<br/>
              • <b>Tỷ lệ co dãn thể tích:</b> Tỷ lệ biến thiên thể tích khối hộp qua phép biến đổi \\( A^{-1} \\) bằng đúng nghịch đảo độ lớn định thức của ma trận ban đầu: \\( |\\det(A^{-1})| = \\frac{1}{|\\det(A)|} = \\frac{1}{${absDetStr}} = ${invDetStr} \\).<br/>
              • <b>Quan hệ đối ngẫu:</b> Khi áp dụng liên tiếp phép biến đổi \\( A \\) và \\( A^{-1} \\), toàn bộ không gian ba chiều được khôi phục nguyên vẹn theo đẳng thức hợp thành \\( A^{-1}A = I \\).
            `;
          } else {
            geomInvDesc = `
              • <b>Bảo toàn tính khả nghịch:</b> Ma trận vuông cấp ${AData.rows} có định thức khác 0 bảo toàn đầy đủ ${AData.rows} chiều không gian và tồn tại duy nhất biến đổi ngược \\( A^{-1} \\).
            `;
          }

          detailsHtml = `
            <div class="calc-section-title">Cách tính đại số</div>
            <div class="calc-explanation-block">
              ${res.steps.join("<br/>")}
            </div>
            <div class="calc-section-title">Ý nghĩa hình học</div>
            <div class="calc-explanation-block">
              ${geomInvDesc}
            </div>
          `;
          if (AData.rows === 2 || AData.rows === 3) {
            isAnimSupported = true;
            animMatrix = res.inv;
            animOptions = {
              mode: "inv",
              originalMatrix: AData.values,
              invMatrix: res.inv,
              title: "Ma trận Nghịch đảo A⁻¹"
            };
          }
        }
      }
    } else if (op === "rank") {
      title = "HẠNG MA TRẬN";
      const res = computeRankWithSteps(AData.values);
      resultLatex = `\\text{Rank}(A) = ${res.rank} \\quad \\text{trên } ${AData.cols} \\text{ cột}`;

      let part1Steps = `
        ${res.steps.join("<br/>")}<br/>
        Áp dụng định lý về số chiều (Rank - Nullity Theorem):<br/>
        \\( \\text{Rank}(A) + \\text{dim}(\\text{Ker } A) = n \\iff ${res.rank} + ${res.nullity} = ${AData.cols} \\)
      `;

      let geomRankDesc = "";
      if (AData.rows === 2 && AData.cols === 2) {
        if (res.rank === 2) {
          geomRankDesc = `
            • <b>Không gian ảnh:</b> Toàn bộ mặt phẳng hai chiều được bảo toàn số chiều, không có chiều nào bị triệt tiêu (\\( \\text{Rank}(A) = 2 \\)).<br/>
            • <b>Không gian hạt nhân:</b> Hạt nhân chỉ gồm duy nhất điểm gốc tọa độ \\( (0, 0) \\) (\\( \\text{dim}(\\text{Ker } A) = 0 \\)).
          `;
        } else if (res.rank === 1) {
          geomRankDesc = `
            • <b>Không gian ảnh:</b> Mặt phẳng hai chiều bị nén thành một đường thẳng đi qua gốc tọa độ (\\( \\text{Rank}(A) = 1 \\)).<br/>
            • <b>Không gian hạt nhân:</b> Toàn bộ một đường thẳng trong không gian nguồn bị ép về gốc tọa độ \\( (0, 0) \\) (\\( \\text{dim}(\\text{Ker } A) = 1 \\)).
          `;
        } else {
          geomRankDesc = `
            • <b>Không gian ảnh:</b> Toàn bộ mặt phẳng bị co rút về duy nhất điểm gốc tọa độ (\\( \\text{Rank}(A) = 0 \\)).<br/>
            • <b>Không gian hạt nhân:</b> Cả hai chiều không gian bị triệt tiêu về gốc tọa độ (\\( \\text{dim}(\\text{Ker } A) = 2 \\)).
          `;
        }
      } else if (AData.rows === 3 && AData.cols === 3) {
        if (res.rank === 3) {
          geomRankDesc = `
            • <b>Không gian ảnh:</b> Không gian ba chiều được bảo toàn đầy đủ 3 chiều (\\( \\text{Rank}(A) = 3 \\)).<br/>
            • <b>Không gian hạt nhân:</b> Hạt nhân chỉ gồm duy nhất điểm gốc tọa độ \\( (0, 0, 0) \\) (\\( \\text{dim}(\\text{Ker } A) = 0 \\)).
          `;
        } else if (res.rank === 2) {
          geomRankDesc = `
            • <b>Không gian ảnh:</b> Toàn bộ không gian 3D bị nén thành một mặt phẳng đi qua gốc tọa độ (\\( \\text{Rank}(A) = 2 \\)).<br/>
            • <b>Không gian hạt nhân:</b> Một trục đường thẳng vuông góc với mặt phẳng bị nén về gốc tọa độ \\( (0, 0, 0) \\) (\\( \\text{dim}(\\text{Ker } A) = 1 \\)).
          `;
        } else if (res.rank === 1) {
          geomRankDesc = `
            • <b>Không gian ảnh:</b> Toàn bộ không gian 3D bị thu hẹp thành một đường thẳng đi qua gốc tọa độ (\\( \\text{Rank}(A) = 1 \\)).<br/>
            • <b>Không gian hạt nhân:</b> Một mặt phẳng hai chiều bị nén tiêu biến về điểm gốc tọa độ (\\( \\text{dim}(\\text{Ker } A) = 2 \\)).
          `;
        } else {
          geomRankDesc = `
            • <b>Không gian ảnh:</b> Toàn bộ không gian ba chiều co rút về điểm gốc tọa độ (\\( \\text{Rank}(A) = 0 \\), \\( \\text{dim}(\\text{Ker } A) = 3 \\)).
          `;
        }
      } else {
        geomRankDesc = `
          • <b>Số chiều không gian ảnh:</b> Hạng \\( \\text{Rank}(A) = ${res.rank} \\) là số chiều của không gian ảnh sau biến đổi.<br/>
          • <b>Số chiều không gian hạt nhân:</b> Số chiều hạt nhân \\( \\text{dim}(\\text{Ker } A) = ${res.nullity} \\) là số chiều của không gian con bị triệt tiêu về gốc tọa độ.
        `;
      }

      detailsHtml = `
        <div class="calc-section-title">Cách tính đại số</div>
        <div class="calc-explanation-block">
          ${part1Steps}
        </div>
        <div class="calc-section-title">Ý nghĩa hình học</div>
        <div class="calc-explanation-block">
          ${geomRankDesc}
        </div>
      `;

      if (AData.rows === 2 && AData.cols === 2) {
        isAnimSupported = true;
        animMatrix = AData.values;
        animOptions = {
          mode: "rank",
          rank: res.rank,
          nullity: res.nullity,
          originalMatrix: AData.values,
          title: `Hạng Ma trận: Rank = ${res.rank}/2`
        };
      } else if (AData.rows === 3 && AData.cols === 3) {
        isAnimSupported = true;
        animMatrix = AData.values;
        animOptions = {
          mode: "rank",
          rank: res.rank,
          nullity: res.nullity,
          originalMatrix: AData.values,
          title: `Hạng Ma trận: Rank = ${res.rank}/3`
        };
      }
    } else if (op === "transpose") {
      title = "MA TRẬN CHUYỂN VỊ";
      const res = computeTransposeWithSteps(AData.values);
      resultLatex = `A^T = ${toMatrixLatex(res.AT)}`;
      let part2Geom = "";
      if (AData.rows === 2 && AData.cols === 2) {
        part2Geom = `
          • <b>Hệ vector cơ sở:</b> Các cột cơ sở của \\( A^T \\) nhận giá trị từ các hàng tương ứng của \\( A \\): \\( \\vec{i}' = [${fmtVal(AData.values[0][0])}, ${fmtVal(AData.values[0][1])}]^T \\) và \\( \\vec{j}' = [${fmtVal(AData.values[1][0])}, ${fmtVal(AData.values[1][1])}]^T \\).<br/>
          • <b>Bảo toàn diện tích:</b> Định thức được bảo toàn tuyệt đối: \\( \\det(A^T) = \\det(A) \\). Tỷ lệ co dãn diện tích của phép biến đổi \\( A^T \\) bằng đúng tỷ lệ của ma trận gốc \\( A \\).<br/>
          • <b>Đặc tính đối xứng:</b> Nếu \\( A \\) là ma trận đối xứng (\\( A = A^T \\)), không gian không thay đổi qua phép chuyển vị.
        `;
      } else if (AData.rows === 3 && AData.cols === 3) {
        part2Geom = `
          • <b>Hệ vector cơ sở:</b> Ba vector cột cơ sở của \\( A^T \\) nhận giá trị từ ba vector hàng của \\( A \\): \\( \\vec{i}' \\) nhận từ Hàng 1, \\( \\vec{j}' \\) nhận từ Hàng 2, và \\( \\vec{k}' \\) nhận từ Hàng 3 của \\( A \\).<br/>
          • <b>Bảo toàn thể tích:</b> Định thức được bảo toàn tuyệt đối: \\( \\det(A^T) = \\det(A) \\). Tỷ lệ co dãn thể tích khối hộp của phép biến đổi \\( A^T \\) hoàn toàn bằng tỷ lệ của ma trận gốc \\( A \\).<br/>
          • <b>Đặc tính trực giao:</b> Khi ma trận \\( A \\) là phép quay trực chuẩn (ma trận trực giao), ma trận chuyển vị \\( A^T \\) trùng với ma trận nghịch đảo \\( A^{-1} \\), đóng vai trò phép quay ngược chiều.
        `;
      } else if (AData.rows === 2 && AData.cols === 3) {
        part2Geom = `
          • <b>Hệ vector cơ sở:</b> Hai vector hàng của ma trận \\( A \\) (kích thước 2×3) trở thành hai vector cột của \\( A^T \\) (kích thước 3×2) trong không gian 3 chiều.<br/>
          • <b>Chuyển đổi số chiều:</b> Ma trận \\( A \\) chiếu không gian 3D xuống mặt phẳng 2D, trong khi ma trận chuyển vị \\( A^T \\) nhúng mặt phẳng 2D thành một mặt phẳng nghiêng trong không gian 3D.
        `;
      } else if (AData.rows === 3 && AData.cols === 2) {
        part2Geom = `
          • <b>Hệ vector cơ sở:</b> Ba vector hàng của ma trận \\( A \\) (kích thước 3×2) trở thành ba vector cột của \\( A^T \\) (kích thước 2×3) trên mặt phẳng 2 chiều.<br/>
          • <b>Chuyển đổi số chiều:</b> Ma trận \\( A \\) nhúng mặt phẳng 2D vào không gian 3D, trong khi ma trận chuyển vị \\( A^T \\) chiếu không gian 3D xuống mặt phẳng 2D.
        `;
      } else {
        part2Geom = `
          • <b>Hệ vector cơ sở:</b> Các hàng của ma trận \\( A \\) trở thành các cột cơ sở tương ứng của \\( A^T \\): \\( (A^T)_{ji} = A_{ij} \\).<br/>
          • <b>Bảo toàn định thức:</b> Với ma trận vuông, \\( \\det(A^T) = \\det(A) \\).
        `;
      }

      detailsHtml = `
        <div class="calc-section-title">Cách tính đại số</div>
        <div class="calc-explanation-block">
          ${res.steps.join("<br/>")}
        </div>
        <div class="calc-section-title">Ý nghĩa hình học</div>
        <div class="calc-explanation-block">
          ${part2Geom}
        </div>
      `;
      if ((AData.rows === 2 && AData.cols === 2) || (AData.rows === 3 && AData.cols === 3)) {
        isAnimSupported = true;
        animMatrix = res.AT;
        animOptions = {
          mode: "transpose",
          originalMatrix: AData.values,
          transposeMatrix: res.AT,
          title: "Ma trận Chuyển vị Aᵀ"
        };
      } else if (AData.rows === 2 && AData.cols === 3) {
        isAnimSupported = true;
        animMatrix = res.AT;
        animOptions = { mode: "embed_2d_to_3d", originalMatrix: AData.values, title: "Chuyển vị Aᵀ: Nhúng mặt phẳng 2D vào không gian 3D" };
      } else if (AData.rows === 3 && AData.cols === 2) {
        isAnimSupported = true;
        animMatrix = res.AT;
        animOptions = { mode: "project_3d_to_2d", originalMatrix: AData.values, title: "Chuyển vị Aᵀ: Chiếu không gian 3D xuống mặt phẳng 2D" };
      }
    } else if (op === "mul_matrix") {
      title = "TÍCH HAI MA TRẬN";
      const BData = parseMatrixGridValues("matrixCalcGridB", "matrixCalcRowsB", "matrixCalcColsB");
      if (!BData) {
        detailsHtml = `
          <div class="calc-section-title">Cách tính đại số</div>
          <div class="calc-explanation-block">
            Vui lòng nhập đầy đủ các phần tử của ma trận B để thực hiện phép nhân.
          </div>
          <div class="calc-section-title">Ý nghĩa hình học</div>
          <div class="calc-explanation-block">
            Phép nhân hai ma trận tương ứng với phép hợp thành của hai biến đổi tuyến tính liên tiếp trong không gian.
          </div>
        `;
        resultLatex = "\\text{Chưa nhập ma trận B}";
      } else if (AData.cols !== BData.rows) {
        detailsHtml = `
          <div class="calc-section-title">Cách tính đại số</div>
          <div class="calc-explanation-block">
            Điều kiện nhân ma trận không thỏa mãn: Số cột của ma trận A (${AData.cols}) khác số hàng của ma trận B (${BData.rows}). Phép nhân ma trận \\( A \\times B \\) chỉ xác định khi số cột của A bằng số hàng của B (ma trận cấp \\( m \\times p \\) nhân với \\( p \\times n \\)).
          </div>
          <div class="calc-section-title">Ý nghĩa hình học</div>
          <div class="calc-explanation-block">
            Biến đổi hợp thành đòi hỏi không gian đích của biến đổi thứ nhất (do B thực hiện) phải trùng với không gian nguồn của biến đổi thứ hai (do A thực hiện). Sự sai lệch giữa số cột (${AData.cols}) và số hàng (${BData.rows}) khiến hai biến đổi không thể liên kết liên tiếp.
          </div>
        `;
        resultLatex = "\\text{Lỗi kích thước}";
      } else {
        const res = computeMulMatrixWithSteps(AData.values, BData.values);
        resultLatex = `A \\times B = ${toMatrixLatex(res.C)}`;
        let part1Steps = res.steps.join("<br/>");
        let part2Geom = `
          • <b>Biến đổi không gian liên tiếp:</b> Phép nhân ma trận \\( A \\times B \\) tương ứng với phép hợp thành hai biến đổi tuyến tính: áp dụng biến đổi B trước, sau đó tiếp tục áp dụng biến đổi A lên kết quả vừa nhận được.<br/>
          • <b>Các cột của ma trận tích C:</b> Vị trí đích của vector cơ sở thứ j là ảnh của vector cột thứ j của B qua ma trận A: \\( \\text{Col}_j(C) = A \\cdot \\text{Col}_j(B) \\).<br/>
          • <b>Tính không giao hoán:</b> Việc biến đổi theo B rồi theo A nhìn chung cho kết quả khác với biến đổi theo A rồi theo B, thể hiện tính chất \\( A \\times B \\neq B \\times A \\).
        `;
        if (AData.rows === 2 && AData.cols === 3 && BData.rows === 3 && BData.cols === 2) {
          part2Geom += `<br/>• <b>Tiến trình liên tiếp (2D lên 3D rồi về 2D):</b><br/>
          - Giai đoạn 1 (ma trận B kích thước 3×2): Nhúng mặt phẳng 2D ban đầu thành một mặt phẳng nghiêng trong không gian ba chiều.<br/>
          - Giai đoạn 2 (ma trận A kích thước 2×3): Chiếu mặt phẳng nghiêng 3D trở lại mặt phẳng hai chiều. Kết quả là ma trận tích C cấp 2×2.`;
        } else if (AData.rows === 3 && AData.cols === 2 && BData.rows === 2 && BData.cols === 3) {
          part2Geom += `<br/>• <b>Tiến trình liên tiếp (3D xuống 2D rồi lên 3D):</b><br/>
          - Giai đoạn 1 (ma trận B kích thước 2×3): Chiếu không gian 3D xuống mặt phẳng 2D, thể tích triệt tiêu về 0.<br/>
          - Giai đoạn 2 (ma trận A kích thước 3×2): Nhúng mặt phẳng 2D trở lại không gian 3D thành một mặt phẳng nghiêng có số chiều bằng 2 (hạng của ma trận tích C bằng 2 và định thức bằng 0).`;
        }

        detailsHtml = `
          <div class="calc-section-title">Cách tính đại số</div>
          <div class="calc-explanation-block">
            ${part1Steps}
          </div>
          <div class="calc-section-title">Ý nghĩa hình học</div>
          <div class="calc-explanation-block">
            ${part2Geom}
          </div>
        `;
        if (AData.rows === 2 && AData.cols === 2 && BData.rows === 2 && BData.cols === 2) {
          isAnimSupported = true;
          animMatrix = res.C;
          animOptions = {
            mode: "compound",
            matrix1: BData.values,
            matrix2: res.C,
            title: "A ✕ B (Biến đổi liên hoàn)"
          };
        } else if (AData.rows === 3 && AData.cols === 3 && BData.rows === 3 && BData.cols === 3) {
          isAnimSupported = true;
          animMatrix = res.C;
          animOptions = {
            mode: "compound",
            matrix1: BData.values,
            matrix2: res.C,
            title: "A ✕ B (Biến đổi liên hoàn)"
          };
        } else if (AData.rows === 2 && AData.cols === 3 && BData.rows === 3 && BData.cols === 2) {
          isAnimSupported = true;
          animMatrix = res.C;
          animOptions = {
            mode: "cross_compound_2d_3d_2d",
            matrixB: BData.values,
            matrixA: AData.values,
            matrixC: res.C,
            resultC: res.C,
            title: "A(2✕3) ✕ B(3✕2): Nhúng 2D lên 3D rồi chiếu về 2D"
          };
        } else if (AData.rows === 3 && AData.cols === 2 && BData.rows === 2 && BData.cols === 3) {
          isAnimSupported = true;
          animMatrix = res.C;
          animOptions = {
            mode: "cross_compound_3d_2d_3d",
            matrixB: BData.values,
            matrixA: AData.values,
            matrixC: res.C,
            resultC: res.C,
            title: "A(3✕2) ✕ B(2✕3): Nén 3D xuống 2D rồi nâng lên mặt phẳng nghiêng"
          };
        }
      }
    }

    if (resultBox) {
      resultBox.className = "";
      resultBox.style.display = "block";
      resultBox.style.padding = "0";
      resultBox.style.border = "none";
      resultBox.style.background = "transparent";
      resultBox.innerHTML = App.renderUnifiedResult(
        title,
        `<div class="calc-result-latex" style="overflow-x: auto; padding: 4px 0; font-size: 15px;">\\( ${resultLatex} \\)</div>`
      ) + App.renderExplanationBox(detailsHtml);

      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([resultBox]).catch(console.warn);
      }
    }

    if (window.App?.PaperLogger && resultLatex && !resultLatex.includes("Lỗi") && !resultLatex.includes("Chưa") && !resultLatex.includes("Không")) {
      App.PaperLogger.log(title, resultLatex, "");
    }

    const playbackHUD = document.getElementById("sidebarTransformPlayback");
    const btnMatrixReplay = document.getElementById("btnMatrixReplay");
    if (triggerAnimation && isAnimSupported && animMatrix) {
      if (btnMatrixReplay) btnMatrixReplay.style.display = "inline-flex";
      if (playbackHUD) playbackHUD.style.display = "block";
      const isCross3D = (
        animOptions?.mode === "cross_compound_2d_3d_2d" ||
        animOptions?.mode === "cross_compound_3d_2d_3d" ||
        animOptions?.mode === "embed_2d_to_3d" ||
        animOptions?.mode === "project_3d_to_2d"
      );
      const is3D = isCross3D || animMatrix.length === 3;
      const is2D = !isCross3D && animMatrix.length === 2;
      if (is3D && App.mode !== "3D" && typeof App.toggleMode === "function") {
        App.toggleMode();
      } else if (is2D && App.mode !== "2D" && typeof App.toggleMode === "function") {
        App.toggleMode();
      }

      if (window.innerWidth < 768) {
        const sidebar = document.getElementById("sidebar");
        const hamburger = document.getElementById("floatingHamburger");
        if (sidebar && sidebar.classList.contains("open")) sidebar.classList.remove("open");
        if (hamburger && hamburger.classList.contains("active")) hamburger.classList.remove("active");
      }

      if (window.App?.LinearTransform) {
        App.LinearTransform.start(animMatrix, [], animOptions);
      }
    } else {
      if (btnMatrixReplay) btnMatrixReplay.style.display = "none";
      if (playbackHUD) playbackHUD.style.display = "none";
      if (triggerAnimation && !isAnimSupported && window.App?.showToast) {
        App.showToast(`Phép tính ma trận hiện tại chỉ hỗ trợ hiển thị số học, không trực quan hóa động trong không gian 2D/3D.`, "info");
      }
    }
  };

  App.runMixedCalc = function (triggerAnimation = true) {
    const resultBox = document.getElementById("mixedResultBox");
    const matSel = document.getElementById("mixedMatrixSelect");
    const vecSel = document.getElementById("mixedVectorSelect");

    if (!matSel || !matSel.value) {
      if (window.App?.showToast) App.showToast("Chưa chọn ma trận. Hãy tạo ma trận ở tab Khởi tạo trước.", "warning");
      return;
    }
    if (!vecSel || !vecSel.value) {
      if (window.App?.showToast) App.showToast("Chưa chọn vector. Hãy tạo vector ở tab Khởi tạo trước.", "warning");
      return;
    }

    const mObj = (App.matrixList || []).find((m) => String(m.id) === String(matSel.value));
    if (!mObj || !Array.isArray(mObj.values) || mObj.values.length === 0) {
      if (window.App?.showToast) App.showToast("Ma trận đã chọn không hợp lệ.", "error");
      return;
    }

    const matrixValues = mObj.values;
    const matrixName = mObj.name || "A";
    const rowsA = matrixValues.length;
    const colsA = matrixValues[0].length;

    let targetVectors = [];
    if (vecSel.value === "all") {
      (App.vectorList || []).forEach((v) => {
        if (Array.isArray(v.vec)) {
          targetVectors.push({
            id: v.id,
            name: v.name || "v",
            color: v.color || v.colorCss || "#0090ff",
            vec: v.vec.slice(0, colsA)
          });
        }
      });
    } else {
      const vObj = (App.vectorList || []).find((v) => String(v.id) === String(vecSel.value));
      if (vObj && Array.isArray(vObj.vec)) {
        if (vObj.vec.length !== colsA) {
          const msg = `Kích thước không khớp: Ma trận ${matrixName} có ${colsA} cột nhưng vector ${vObj.name || "v"} có ${vObj.vec.length} phần tử.`;
          if (window.App?.showToast) App.showToast(msg, "warning");
          if (resultBox) {
            resultBox.className = "";
            resultBox.style.display = "block";
            resultBox.innerHTML = App.renderUnifiedResult(
              "LỖI KÍCH THƯỚC",
              `<span style="color:var(--danger, #e5484d); font-size:12px;">${msg}</span>`
            );
          }
          return;
        }
        targetVectors.push({
          id: vObj.id,
          name: vObj.name || "v",
          color: vObj.color || vObj.colorCss || "#0090ff",
          vec: vObj.vec.slice(0, colsA)
        });
      }
    }

    if (targetVectors.length === 0) {
      if (window.App?.showToast) App.showToast("Không tìm thấy vector phù hợp.", "warning");
      return;
    }

    const fmtVal = (n) => {
      let x = Number(n);
      if (isNaN(x)) return "0";
      if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
      return String(parseFloat(x.toFixed(4)));
    };

    const matLatex = "\\begin{bmatrix} " + matrixValues.map(row => row.map(fmtVal).join(" & ")).join(" \\\\ ") + " \\end{bmatrix}";

    let resultLatex = "";
    let detailsHtml = "";

    if (targetVectors.length === 1) {
      const tv = targetVectors[0];
      const v = tv.vec;
      const vPrime = [];
      for (let i = 0; i < rowsA; i++) {
        let sum = 0;
        for (let j = 0; j < colsA; j++) {
          sum += (Number(matrixValues[i][j]) || 0) * (Number(v[j]) || 0);
        }
        vPrime.push(sum);
      }

      resultLatex = `\\left( ${vPrime.map(fmtVal).join(",\\; ")} \\right)`;
      const vecColLatex = "\\begin{bmatrix} " + v.map(fmtVal).join(" \\\\ ") + " \\end{bmatrix}";
      const resColLatex = "\\begin{bmatrix} " + vPrime.map(fmtVal).join(" \\\\ ") + " \\end{bmatrix}";

      if (rowsA === 2 && colsA === 2) {
        const a = Number(matrixValues[0][0]) || 0;
        const c = Number(matrixValues[0][1]) || 0;
        const b = Number(matrixValues[1][0]) || 0;
        const d = Number(matrixValues[1][1]) || 0;
        const vx = Number(v[0]) || 0;
        const vy = Number(v[1]) || 0;

        const col1 = `\\begin{bmatrix} ${fmtVal(a)} \\\\ ${fmtVal(b)} \\end{bmatrix}`;
        const col2 = `\\begin{bmatrix} ${fmtVal(c)} \\\\ ${fmtVal(d)} \\end{bmatrix}`;
        const xVal = fmtVal(vx);
        const yVal = fmtVal(vy);
        const c11 = fmtVal(a * vx);
        const c12 = fmtVal(c * vy);
        const c21 = fmtVal(b * vx);
        const c22 = fmtVal(d * vy);

        // Các chỉ số hình học của 2 trục
        const len1 = Math.hypot(a, b);
        const deg1 = Math.round((Math.atan2(b, a) * 180) / Math.PI);
        const deg1Sign = deg1 > 0 ? "+" : "";

        const len2 = Math.hypot(c, d);
        const deg2 = Math.round((Math.atan2(d, c) * 180) / Math.PI);
        const deg2Sign = deg2 > 0 ? "+" : "";

        // Góc giữa hai trục mới (đoạn biến dạng trượt - shear)
        const dotCols = a * c + b * d;
        let angleBetween = 90;
        if (len1 > 1e-6 && len2 > 1e-6) {
          const cosPhi = Math.max(-1, Math.min(1, dotCols / (len1 * len2)));
          angleBetween = Math.round((Math.acos(cosPhi) * 180) / Math.PI);
        }

        const det = a * d - b * c;
        const fmtDet = fmtVal(det);
        const absDet = fmtVal(Math.abs(det));

        let orientDesc = "";
        if (Math.abs(det) < 1e-4) {
          orientDesc = "Định thức bằng 0: Toàn bộ mặt phẳng bị nén bẹp thành một đường thẳng hoặc gốc tọa độ.";
        } else if (det < 0) {
          orientDesc = `Định thức âm (${fmtDet} < 0): Không gian bị lật mặt đối xứng qua gương, đảo ngược chiều quay chuẩn.`;
        } else {
          orientDesc = `Định thức dương (${fmtDet} > 0): Không gian bảo toàn chiều quay chuẩn ngược chiều kim đồng hồ.`;
        }

        detailsHtml = `
          <div class="calc-section-title">Cách tính đại số</div>
          <div class="calc-explanation-block">
            Nhân ma trận với vector cột theo quy tắc dòng nhân cột:<br/>
            • Tọa độ hoành mới: \\( x' = (${fmtVal(a)})(${xVal}) + (${fmtVal(c)})(${yVal}) = ${c11} + ${c12} = ${fmtVal(vPrime[0])} \\)<br/>
            • Tọa độ tung mới: \\( y' = (${fmtVal(b)})(${xVal}) + (${fmtVal(d)})(${yVal}) = ${c21} + ${c22} = ${fmtVal(vPrime[1])} \\)<br/>
            Kết quả: \\( \\vec{${tv.name}}' = \\left( ${vPrime.map(fmtVal).join(",\\; ")} \\right) \\)
          </div>
          <div class="calc-section-title">Ý nghĩa hình học</div>
          <div class="calc-explanation-block">
            • <b>Hệ trục cơ sở mới:</b><br/>
            - Trục hoành mới: \\( \\vec{i}' = ${col1} \\) có độ dài ${fmtVal(len1)} đơn vị, góc quay ${deg1Sign}${deg1}°.<br/>
            - Trục tung mới: \\( \\vec{j}' = ${col2} \\) có độ dài ${fmtVal(len2)} đơn vị, góc quay ${deg2Sign}${deg2}°.<br/>
            - Góc kẹp giữa hai trục cơ sở mới là ${angleBetween}°.<br/>
            • <b>Vector kết quả:</b> Tọa độ \\( [${fmtVal(vPrime[0])}, ${fmtVal(vPrime[1])}]^T \\) xác định điểm ngọn của vector \\( \\vec{${tv.name}}' \\). Vector này là tổ hợp tuyến tính của hai vector cơ sở mới với các hệ số tọa độ ban đầu:<br/>
            \\( \\vec{${tv.name}}' = ${xVal}\\vec{i}' + ${yVal}\\vec{j}' = ${xVal}${col1} + ${yVal}${col2} = \\begin{bmatrix} ${fmtVal(vPrime[0])} \\\\ ${fmtVal(vPrime[1])} \\end{bmatrix} \\)<br/>
            • <b>Hình bình hành cơ sở:</b> Diện tích hình bình hành căng bởi hai trục mới bằng \\( |\\det(${matrixName})| = ${absDet} \\) đơn vị diện tích. ${orientDesc}
          </div>
        `;
      } else if (rowsA === 3 && colsA === 3) {
        const m = matrixValues;
        const col1 = `\\begin{bmatrix} ${fmtVal(m[0][0])} \\\\ ${fmtVal(m[1][0])} \\\\ ${fmtVal(m[2][0])} \\end{bmatrix}`;
        const col2 = `\\begin{bmatrix} ${fmtVal(m[0][1])} \\\\ ${fmtVal(m[1][1])} \\\\ ${fmtVal(m[2][1])} \\end{bmatrix}`;
        const col3 = `\\begin{bmatrix} ${fmtVal(m[0][2])} \\\\ ${fmtVal(m[1][2])} \\\\ ${fmtVal(m[2][2])} \\end{bmatrix}`;
        const xVal = fmtVal(v[0]);
        const yVal = fmtVal(v[1]);
        const zVal = fmtVal(v[2]);

        const len1 = fmtVal(Math.hypot(m[0][0], m[1][0], m[2][0]));
        const len2 = fmtVal(Math.hypot(m[0][1], m[1][1], m[2][1]));
        const len3 = fmtVal(Math.hypot(m[0][2], m[1][2], m[2][2]));

        const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
                  - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
                  + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
        const absDet = fmtVal(Math.abs(det));

        detailsHtml = `
          <div class="calc-section-title">Cách tính đại số</div>
          <div class="calc-explanation-block">
            Nhân ma trận với vector cột trong không gian ba chiều theo quy tắc dòng nhân cột:<br/>
            • Tọa độ x mới: \\( x' = ${fmtVal(m[0][0])}(${xVal}) + ${fmtVal(m[0][1])}(${yVal}) + ${fmtVal(m[0][2])}(${zVal}) = ${fmtVal(vPrime[0])} \\)<br/>
            • Tọa độ y mới: \\( y' = ${fmtVal(m[1][0])}(${xVal}) + ${fmtVal(m[1][1])}(${yVal}) + ${fmtVal(m[1][2])}(${zVal}) = ${fmtVal(vPrime[1])} \\)<br/>
            • Tọa độ z mới: \\( z' = ${fmtVal(m[2][0])}(${xVal}) + ${fmtVal(m[2][1])}(${yVal}) + ${fmtVal(m[2][2])}(${zVal}) = ${fmtVal(vPrime[2])} \\)<br/>
            Kết quả: \\( \\vec{${tv.name}}' = \\left( ${vPrime.map(fmtVal).join(",\\; ")} \\right) \\)
          </div>
          <div class="calc-section-title">Ý nghĩa hình học</div>
          <div class="calc-explanation-block">
            • <b>Hệ trục cơ sở mới:</b><br/>
            - Ba cột của ma trận xác định tọa độ điểm ngọn của ba vector cơ sở mới: \\( \\vec{i}' = ${col1} \\), \\( \\vec{j}' = ${col2} \\), \\( \\vec{k}' = ${col3} \\).<br/>
            - Độ dài tương ứng của ba trục cơ sở: \\( \\|\\vec{i}'\\| = ${len1} \\), \\( \\|\\vec{j}'\\| = ${len2} \\), \\( \\|\\vec{k}'\\| = ${len3} \\) đơn vị.<br/>
            • <b>Vector kết quả:</b> Tọa độ \\( [${fmtVal(vPrime[0])}, ${fmtVal(vPrime[1])}, ${fmtVal(vPrime[2])}]^T \\) xác định điểm ngọn của vector \\( \\vec{${tv.name}}' \\). Vector này là tổ hợp tuyến tính của ba vector cơ sở mới:<br/>
            \\( \\vec{${tv.name}}' = ${xVal}\\vec{i}' + ${yVal}\\vec{j}' + ${zVal}\\vec{k}' = \\begin{bmatrix} ${fmtVal(vPrime[0])} \\\\ ${fmtVal(vPrime[1])} \\\\ ${fmtVal(vPrime[2])} \\end{bmatrix} \\)<br/>
            • <b>Khối hộp cơ sở:</b> Khối lập phương đơn vị biến đổi thành khối hộp có thể tích bằng \\( |\\det(${matrixName})| = ${absDet} \\) đơn vị thể tích.
          </div>
        `;
      } else {
        detailsHtml = `
          <div class="calc-section-title">Cách tính đại số</div>
          <div class="calc-explanation-block">
            Ma trận đầu vào: \\( ${matrixName} = ${matLatex} \\)<br/>
            Vector đầu vào: \\( \\vec{${tv.name}} = [${v.map(fmtVal).join(", ")}] \\)<br/>
            Thực hiện phép nhân ma trận với vector cột:<br/>
            \\( ${matrixName} \\cdot \\vec{${tv.name}} = ${matLatex} ${vecColLatex} = ${resColLatex} \\)<br/>
            Kết quả: \\( \\vec{${tv.name}}' = \\left( ${vPrime.map(fmtVal).join(",\\; ")} \\right) \\)
          </div>
          <div class="calc-section-title">Ý nghĩa hình học</div>
          <div class="calc-explanation-block">
            • <b>Vector kết quả:</b> Tọa độ \\( [${vPrime.map(fmtVal).join(",\\; ")}] \\) xác định điểm ngọn của vector kết quả sau biến đổi.<br/>
            • <b>Hệ vector cơ sở:</b> Mỗi cột của ma trận biểu diễn tọa độ điểm ngọn của một vector cơ sở mới trong không gian đích.
          </div>
        `;
      }
    } else {
      const resultsSummary = [];
      let steps = "";
      targetVectors.forEach((tv) => {
        const v = tv.vec;
        const vPrime = [];
        for (let i = 0; i < rowsA; i++) {
          let sum = 0;
          for (let j = 0; j < colsA; j++) {
            sum += (Number(matrixValues[i][j]) || 0) * (Number(v[j]) || 0);
          }
          vPrime.push(sum);
        }
        resultsSummary.push(`\\vec{${tv.name}}' = \\left( ${vPrime.map(fmtVal).join(",\\; ")} \\right)`);
        if (rowsA === 2 && colsA === 2) {
          steps += `\\( \\vec{${tv.name}}' = ${fmtVal(v[0])}\\vec{i}' + ${fmtVal(v[1])}\\vec{j}' = \\left( ${vPrime.map(fmtVal).join(",\\; ")} \\right) \\)<br/>`;
        } else if (rowsA === 3 && colsA === 3) {
          steps += `\\( \\vec{${tv.name}}' = ${fmtVal(v[0])}\\vec{i}' + ${fmtVal(v[1])}\\vec{j}' + ${fmtVal(v[2])}\\vec{k}' = \\left( ${vPrime.map(fmtVal).join(",\\; ")} \\right) \\)<br/>`;
        } else {
          steps += `\\( ${matrixName} \\cdot \\vec{${tv.name}} = \\left( ${vPrime.map(fmtVal).join(",\\; ")} \\right) \\)<br/>`;
        }
      });
      resultLatex = resultsSummary.join(",\\quad ");

      if (rowsA === 2 && colsA === 2) {
        const a = Number(matrixValues[0][0]) || 0;
        const c = Number(matrixValues[0][1]) || 0;
        const b = Number(matrixValues[1][0]) || 0;
        const d = Number(matrixValues[1][1]) || 0;
        const col1 = `\\begin{bmatrix} ${fmtVal(a)} \\\\ ${fmtVal(b)} \\end{bmatrix}`;
        const col2 = `\\begin{bmatrix} ${fmtVal(c)} \\\\ ${fmtVal(d)} \\end{bmatrix}`;
        const len1 = fmtVal(Math.hypot(a, b));
        const len2 = fmtVal(Math.hypot(c, d));
        const deg1 = Math.round((Math.atan2(b, a) * 180) / Math.PI);
        const deg2 = Math.round((Math.atan2(d, c) * 180) / Math.PI);
        const det = a * d - b * c;
        const absDet = fmtVal(Math.abs(det));

        detailsHtml = `
          <div class="calc-section-title">Cách tính đại số</div>
          <div class="calc-explanation-block">
            Biến đổi từng vector theo tổ hợp tuyến tính các vector cột mới:<br/>
            ${steps}
          </div>
          <div class="calc-section-title">Ý nghĩa hình học</div>
          <div class="calc-explanation-block">
            • <b>Hệ trục cơ sở mới:</b><br/>
            - Trục hoành mới: \\( \\vec{i}' = ${col1} \\), độ dài ${len1} đơn vị, góc quay ${deg1 > 0 ? "+" : ""}${deg1}°.<br/>
            - Trục tung mới: \\( \\vec{j}' = ${col2} \\), độ dài ${len2} đơn vị, góc quay ${deg2 > 0 ? "+" : ""}${deg2}°.<br/>
            - Diện tích hình bình hành cơ sở bằng \\( |\\det(${matrixName})| = ${absDet} \\) đơn vị diện tích.<br/>
            • <b>Tập hợp vector kết quả:</b> Mỗi vector chuyển đến điểm ngọn có tọa độ tương ứng đã tính, bảo toàn vị trí tương đối trên hệ lưới bị biến dạng tuyến tính.
          </div>
        `;
      } else if (rowsA === 3 && colsA === 3) {
        const m = matrixValues;
        const col1 = `\\begin{bmatrix} ${fmtVal(m[0][0])} \\\\ ${fmtVal(m[1][0])} \\\\ ${fmtVal(m[2][0])} \\end{bmatrix}`;
        const col2 = `\\begin{bmatrix} ${fmtVal(m[0][1])} \\\\ ${fmtVal(m[1][1])} \\\\ ${fmtVal(m[2][1])} \\end{bmatrix}`;
        const col3 = `\\begin{bmatrix} ${fmtVal(m[0][2])} \\\\ ${fmtVal(m[1][2])} \\\\ ${fmtVal(m[2][2])} \\end{bmatrix}`;
        const len1 = fmtVal(Math.hypot(m[0][0], m[1][0], m[2][0]));
        const len2 = fmtVal(Math.hypot(m[0][1], m[1][1], m[2][1]));
        const len3 = fmtVal(Math.hypot(m[0][2], m[1][2], m[2][2]));
        const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
                  - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
                  + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
        const absDet = fmtVal(Math.abs(det));

        detailsHtml = `
          <div class="calc-section-title">Cách tính đại số</div>
          <div class="calc-explanation-block">
            Biến đổi từng vector theo tổ hợp tuyến tính ba vector cột mới:<br/>
            ${steps}
          </div>
          <div class="calc-section-title">Ý nghĩa hình học</div>
          <div class="calc-explanation-block">
            • <b>Hệ trục cơ sở mới:</b><br/>
            - Trục Ox mới: \\( \\vec{i}' = ${col1} \\), độ dài ${len1} đơn vị.<br/>
            - Trục Oy mới: \\( \\vec{j}' = ${col2} \\), độ dài ${len2} đơn vị.<br/>
            - Trục Oz mới: \\( \\vec{k}' = ${col3} \\), độ dài ${len3} đơn vị.<br/>
            - Thể tích khối hộp cơ sở bằng \\( |\\det(${matrixName})| = ${absDet} \\) đơn vị thể tích.<br/>
            • <b>Tập hợp vector kết quả:</b> Mỗi vector trong không gian ba chiều chuyển dịch đồng bộ đến tọa độ mới dưới tác động của toán tử tuyến tính.
          </div>
        `;
      } else {
        detailsHtml = `
          <div class="calc-section-title">Cách tính đại số</div>
          <div class="calc-explanation-block">
            Ma trận tác động: \\( ${matrixName} = ${matLatex} \\)<br/>
            Kết quả tính toán từng vector:<br/>
            ${steps}
          </div>
          <div class="calc-section-title">Ý nghĩa hình học</div>
          <div class="calc-explanation-block">
            • <b>Tập hợp vector kết quả:</b> Điểm ngọn của mỗi vector tương ứng với bộ tọa độ kết quả đã tính.<br/>
            • <b>Cấu trúc không gian:</b> Các vector cùng chuyển dịch đồng bộ theo toán tử tuyến tính đại diện bởi ma trận.
          </div>
        `;
      }
    }

    if (resultBox) {
      resultBox.className = "";
      resultBox.style.display = "block";
      resultBox.style.padding = "0";
      resultBox.style.border = "none";
      resultBox.style.background = "transparent";
      resultBox.innerHTML = App.renderUnifiedResult(
        "VECTOR KẾT QUẢ",
        `<div class="calc-result-latex" style="overflow-x: auto; padding: 4px 0; font-size: 15px;">\\( ${resultLatex} \\)</div>`
      ) + App.renderExplanationBox(detailsHtml);

      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([resultBox]).catch(console.warn);
      }
    }

    const is2D = (rowsA === 2 && colsA === 2);
    const is3D = (rowsA === 3 && colsA === 3);
    const playbackHUD = document.getElementById("sidebarTransformPlayback");

    if (triggerAnimation && (is2D || is3D)) {
      if (playbackHUD) playbackHUD.style.display = "block";

      if (is3D && App.mode !== "3D" && typeof App.toggleMode === "function") {
        App.toggleMode();
      } else if (is2D && App.mode !== "2D" && typeof App.toggleMode === "function") {
        App.toggleMode();
      }

      if (window.innerWidth < 768) {
        const sidebar = document.getElementById("sidebar");
        const hamburger = document.getElementById("floatingHamburger");
        if (sidebar && sidebar.classList.contains("open")) sidebar.classList.remove("open");
        if (hamburger && hamburger.classList.contains("active")) hamburger.classList.remove("active");
      }

      if (window.App?.LinearTransform) {
        App.LinearTransform.start(matrixValues, targetVectors);
      }
    } else {
      if (playbackHUD) playbackHUD.style.display = "none";
      if (!is2D && !is3D && window.App?.showToast) {
        App.showToast(`Ma trận ${rowsA}×${colsA} chỉ tính toán số học, không hỗ trợ trực quan hóa biến đổi.`, "info");
      }
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

    const rParsed = parseInt(rowsInput.value);
    const cParsed = parseInt(colsInput.value);
    const rows = (!isNaN(rParsed) && rParsed >= 1 && rParsed <= 5) ? rParsed : 3;
    const cols = (!isNaN(cParsed) && cParsed >= 1 && cParsed <= 5) ? cParsed : 3;
    // Tuyệt đối không tự ý ghi đè rowsInput.value / colsInput.value ở đây để tránh làm kẹt thao tác gõ của người dùng

    grid.innerHTML = "";
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    // Hàm chuyển focus tới ô đích và bật chế độ sẵn sàng ghi đè (Excel-like)
    const moveToCell = (targetI, targetJ) => {
      const target = document.getElementById(`${gridId}_cell_${targetI}_${targetJ}`);
      if (target) {
        target.focus();
        target._firstKeyOverwrites = true;
        target._isEditMode = false;
        requestAnimationFrame(() => {
          if (typeof target.executeCommand === "function") {
            target.executeCommand("selectAll");
          }
        });
      }
    };

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

        // [EXCEL-LIKE INPUT ENGINE]
        cell._firstKeyOverwrites = true;
        cell._isEditMode = false;

        const setActive = () => {
          window.activeMathField = cell;
        };

        cell.addEventListener("focusin", setActive);
        cell.addEventListener("focus", () => {
          setActive();
          cell._firstKeyOverwrites = true;
          cell._isEditMode = false;
          requestAnimationFrame(() => {
            if (!cell._isEditMode && typeof cell.executeCommand === "function") {
              cell.executeCommand("selectAll");
            }
          });
        });

        cell.addEventListener("pointerdown", (e) => {
          setActive();
          requestAnimationFrame(() => {
            if (document.activeElement !== cell) {
              cell.focus();
            }
          });
        });

        // Double click: Chuyển sang Edit Mode (không xóa đè, cho phép viết tiếp)
        cell.addEventListener("dblclick", () => {
          cell._isEditMode = true;
          cell._firstKeyOverwrites = false;
        });

        // Keydown xử lý phím theo chuẩn Excel và điều hướng WASD / Mũi tên
        cell.addEventListener("keydown", (e) => {
          // 1. Phím Enter: Nhảy sang ô tiếp theo (ngang rồi xuống hàng)
          if (e.key === "Enter") {
            e.preventDefault();
            const nextI = j + 1 < cols ? i : i + 1;
            const nextJ = j + 1 < cols ? j + 1 : 0;
            if (nextI < rows) moveToCell(nextI, nextJ);
            return;
          }

          // 2. Phím Tab và Shift+Tab
          if (e.key === "Tab") {
            e.preventDefault();
            if (e.shiftKey) {
              const prevI = j > 0 ? i : i - 1;
              const prevJ = j > 0 ? j - 1 : cols - 1;
              if (prevI >= 0) moveToCell(prevI, prevJ);
            } else {
              const nextI = j + 1 < cols ? i : i + 1;
              const nextJ = j + 1 < cols ? j + 1 : 0;
              if (nextI < rows) moveToCell(nextI, nextJ);
            }
            return;
          }

          // 3. Phím Escape: Thoát Edit Mode về Selected Mode
          if (e.key === "Escape") {
            cell._isEditMode = false;
            cell._firstKeyOverwrites = true;
            if (typeof cell.executeCommand === "function") {
              cell.executeCommand("selectAll");
            }
            return;
          }

          // 4. Điều hướng 4 hướng Mũi tên (↑, ↓, ←, →) và W, A, S, D khi chưa Double click
          if (!cell._isEditMode && !e.ctrlKey && !e.altKey && !e.metaKey) {
            const key = e.key;
            if (key === "ArrowUp" || key === "w" || key === "W") {
              e.preventDefault();
              if (i > 0) moveToCell(i - 1, j);
              return;
            }
            if (key === "ArrowDown" || key === "s" || key === "S") {
              e.preventDefault();
              if (i < rows - 1) moveToCell(i + 1, j);
              return;
            }
            if (key === "ArrowLeft" || key === "a" || key === "A") {
              e.preventDefault();
              if (j > 0) moveToCell(i, j - 1);
              return;
            }
            if (key === "ArrowRight" || key === "d" || key === "D") {
              e.preventDefault();
              if (j < cols - 1) moveToCell(i, j + 1);
              return;
            }
          }

          // 5. Khi đang ở trạng thái Selected (chưa double click):
          if (cell._firstKeyOverwrites && !cell._isEditMode) {
            // Bỏ qua các phím bổ trợ hệ thống
            if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) {
              return;
            }

            // Phím Backspace hoặc Delete -> xóa rỗng ô
            if (e.key === "Backspace" || e.key === "Delete") {
              e.preventDefault();
              cell.value = "";
              cell._firstKeyOverwrites = false;
              return;
            }

            // Phím ký tự thường (chữ số, dấu trừ, dấu cộng...) -> xóa ô cũ và nhập ký tự mới
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
              e.preventDefault();
              cell.value = "";
              if (typeof cell.executeCommand === "function") {
                cell.executeCommand(["insert", e.key]);
              } else {
                cell.value = e.key;
              }
              cell._firstKeyOverwrites = false;
              return;
            }
          }
        });

        // Blur: nếu để trống hoàn toàn thì khôi phục về defaultValue ("0")
        cell.addEventListener("blur", () => {
          cell._firstKeyOverwrites = true;
          cell._isEditMode = false;
          if (cell.value.trim() === "") {
            cell.value = defaultValue;
          }
        });

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

    // 1. Tự động bôi đen toàn bộ số khi click hoặc focus vào ô kích thước
    const bindAutoSelect = (inp) => {
      inp.addEventListener("focus", function() {
        requestAnimationFrame(() => this.select());
      });
      inp.addEventListener("click", function() {
        this.select();
      });
    };
    bindAutoSelect(rowsInput);
    bindAutoSelect(colsInput);

    // 2. Xử lý khi đang gõ phím (input event):
    // Phản hồi vi mô rõ nét: rung lắc (shakeError), viền phát sáng tương phản cao trên Dark/Light và thông báo
    const triggerClampAlert = (inp, msg) => {
      const isDark = document.body.classList.contains("dark") || document.body.classList.contains("dark-theme");
      inp.style.transition = "none";
      inp.style.borderColor = isDark ? "#ff6369" : "#e5484d";
      inp.style.boxShadow = isDark 
        ? "0 0 0 3px rgba(255, 99, 105, 0.5)" 
        : "0 0 0 3px rgba(229, 72, 77, 0.35)";
      
      // Kích hoạt animation rung lắc
      inp.style.animation = "none";
      void inp.offsetWidth; // ép reflow
      inp.style.animation = "shakeError 0.35s ease-in-out";

      if (window.App && typeof App.showToast === "function") {
        App.showToast(msg || "Kích thước ma trận tối thiểu là 1 và tối đa là 5!", "warning");
      }

      setTimeout(() => {
        inp.style.borderColor = "";
        inp.style.boxShadow = "";
        inp.style.animation = "none";
      }, 400);
    };

    const onLiveInput = (e) => {
      const inp = e.target;
      const raw = inp.value.trim();
      if (raw === "") return;
      const n = parseInt(raw);
      if (!isNaN(n)) {
        if (n > 5) {
          inp.value = 5;
          triggerClampAlert(inp, "Kích thước ma trận tối đa là 5!");
        } else if (n < 1 && raw.length > 0) {
          inp.value = 1;
          triggerClampAlert(inp, "Kích thước ma trận tối thiểu là 1!");
        }
      }
      const r = parseInt(rowsInput.value.trim());
      const c = parseInt(colsInput.value.trim());
      if (!isNaN(r) && r >= 1 && r <= 5 && !isNaN(c) && c >= 1 && c <= 5) {
        App.renderDynamicMatrix(options);
      }
    };
    rowsInput.addEventListener("input", onLiveInput);
    colsInput.addEventListener("input", onLiveInput);

    // 3. Xử lý khi rời ô (blur) hoặc xác nhận (change):
    // Chuẩn hóa (clamp) về khoảng [1..5] nếu người dùng bỏ trống hoặc nhập ngoài biên
    const onCommit = (inp) => {
      let val = parseInt(inp.value.trim());
      if (isNaN(val) || val < 1) val = 1;
      else if (val > 5) val = 5;
      inp.value = val;
      App.renderDynamicMatrix(options);
    };
    rowsInput.addEventListener("change", () => onCommit(rowsInput));
    rowsInput.addEventListener("blur", () => onCommit(rowsInput));
    colsInput.addEventListener("change", () => onCommit(colsInput));
    colsInput.addEventListener("blur", () => onCommit(colsInput));

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
        trigger.innerHTML = `<span class="val"></span><i class="ph ph-caret-down"></i>`;
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
        nativeSelect.addEventListener('change', syncUI);
        
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
