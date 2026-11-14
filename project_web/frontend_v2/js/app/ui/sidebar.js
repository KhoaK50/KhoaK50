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
    .sidebar-content-area { flex: 1; display: flex; flex-direction: column; min-width: 0; background: var(--bg); height: 100%; overflow: hidden; }
    .tab-content { display: none !important; flex: 1; overflow-y: auto; overflow-x: hidden; padding: 14px !important; -webkit-overflow-scrolling: touch; }
    .tab-content.active { display: block !important; animation: fadeIn 0.2s ease-out; }

    /* --- TAB 1: DOI TUONG (VECTOR & MA TRAN) - SINGLE INTERNAL SCROLLBAR --- */
    #tabContentObjects {
        display: none !important;
        height: 100% !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        padding: 14px !important;
    }
    #tabContentObjects.active {
        display: flex !important;
        flex-direction: column !important;
        animation: fadeIn 0.2s ease-out;
    }
    #tabContentObjects .obj-segmented-switcher {
        flex-shrink: 0;
        margin-bottom: 10px;
    }
    #createVectorPanel.calc-mode-panel.active {
        display: flex !important;
        flex-direction: column !important;
        flex: 1 !important;
        min-height: 0 !important;
        overflow: hidden !important;
    }
    #createVectorPanel .section-create.card {
        flex-shrink: 0 !important;
        margin-bottom: 10px !important;
    }
    #createVectorPanel .section-list.card {
        flex: 1 !important;
        min-height: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        margin-bottom: 0 !important;
        padding-bottom: 8px !important;
    }
    #createVectorPanel .section-list.card > div:first-child {
        flex-shrink: 0;
    }
    #createVectorPanel .search-box-modern {
        flex-shrink: 0;
        margin-bottom: 8px !important;
    }
    #createVectorPanel .vec-filters {
        flex-shrink: 0;
        margin-bottom: 8px !important;
    }
    #createVectorPanel #vectorList {
        flex: 1 !important;
        min-height: 80px !important;
        max-height: none !important;
        overflow-y: auto !important;
        overscroll-behavior: contain !important;
        padding-right: 4px;
    }

    /* Ma tran */
    #createMatrixPanel.calc-mode-panel.active {
        display: flex !important;
        flex-direction: column !important;
        flex: 1 !important;
        min-height: 0 !important;
        overflow: hidden !important;
    }
    #createMatrixPanel > .card:first-child {
        flex-shrink: 0 !important;
        margin-bottom: 10px !important;
    }
    #createMatrixPanel > .card:first-child .matrix-grid-container {
        max-height: 180px !important;
        overflow: auto !important;
    }
    #createMatrixPanel > .card:last-child {
        flex: 1 !important;
        min-height: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        padding-bottom: 8px !important;
    }
    #createMatrixPanel > .card:last-child > div:first-child {
        flex-shrink: 0;
    }
    #createMatrixPanel #matrixList {
        flex: 1 !important;
        min-height: 80px !important;
        max-height: none !important;
        overflow-y: auto !important;
        overscroll-behavior: contain !important;
        padding-right: 4px;
    }
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
            width: 100% !important; 
            max-width: 100vw !important; 
            border-right: none !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
        }
        .sidebar-master-layout { flex-direction: column-reverse !important; height: 100% !important; min-height: 0 !important; }
        .sidebar-content-area { flex: 1 1 auto !important; min-height: 0 !important; height: auto !important; overflow: hidden !important; }
        .sidebar-tabs.vertical {
            flex: 0 0 54px; flex-direction: row; justify-content: space-around;
            border-right: none; border-top: 1px solid var(--border); padding-top: 0; box-shadow: 0 -2px 10px rgba(0,0,0,0.04); z-index: 1000;
        }
        .sidebar-tabs.vertical .tab-btn { width: auto; flex: 1; height: 100%; margin-bottom: 0; border-radius: 0; gap: 3px; }
        .sidebar-tabs.vertical .tab-btn i { font-size: 18px; }
        .sidebar-tabs.vertical .tab-btn.active { box-shadow: inset 0 2px 0 var(--primary-base); }
        .tab-content { height: 100% !important; box-sizing: border-box !important; overflow-y: auto !important; overflow-x: hidden !important; padding: 12px 12px 32px 12px !important; }
        #tabContentObjects {
            height: 100% !important;
            box-sizing: border-box !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            padding: 12px 12px 32px 12px !important;
            display: none !important;
        }
        #tabContentObjects.active {
            display: block !important;
        }
        body.has-keypad .tab-content.active,
        body.has-keypad #tabContentObjects.active {
            padding-bottom: 270px !important;
        }
        #createVectorPanel.calc-mode-panel.active,
        #createMatrixPanel.calc-mode-panel.active {
            display: block !important;
            overflow: visible !important;
        }
        #createVectorPanel .section-list.card,
        #createMatrixPanel > .card:last-child {
            display: block !important;
            overflow: visible !important;
        }
        #createVectorPanel #vectorList,
        #createMatrixPanel #matrixList {
            max-height: 350px !important;
        }
        .matrix-grid-container {
            padding: 8px !important;
            gap: 5px !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
        }
        .v-select-options,
        .vec-dropdown {
            max-width: calc(100vw - 20px) !important;
        }
        .playback-ctrl-row {
            flex-wrap: wrap !important;
            gap: 6px !important;
        }
        .playback-slider-wrap {
            flex: 1 1 140px !important;
        }
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

    /* --- LESSON BADGE LINK (TAB MỚI) --- */
    .lesson-badge-link {
        display: inline-flex; align-items: center; padding: 2px 6px; font-size: 10.5px; font-weight: 700;
        color: var(--primary-base, #0090ff); background: rgba(0, 144, 255, 0.08);
        border: 1px solid rgba(0, 144, 255, 0.25); border-radius: 2px; text-decoration: none;
        transition: all 0.15s ease; margin-left: 6px; vertical-align: middle; cursor: pointer;
    }
    .lesson-badge-link:hover {
        background: var(--primary-base, #0090ff); color: #ffffff !important; border-color: var(--primary-base, #0090ff);
        box-shadow: 0 1px 4px rgba(0, 144, 255, 0.25);
    }
    body.dark .lesson-badge-link, body.dark-theme .lesson-badge-link {
        color: #60a5fa; background: rgba(96, 165, 250, 0.12); border-color: rgba(96, 165, 250, 0.3);
    }
    body.dark .lesson-badge-link:hover, body.dark-theme .lesson-badge-link:hover {
        background: #3b82f6; color: #ffffff !important;
    }


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
    .vec-actions .btn.vec-btn-edit:hover { background: rgba(33, 150, 243, 0.12); color: var(--primary-base); }

    /* --- CLEAR ALL BUTTON IN LIST HEADER --- */
    .btn-clear-list { background: transparent; border: none; color: #ef4444; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 2px 4px; border-radius: 2px; transition: all 0.15s; }
    .btn-clear-list:hover { background: rgba(239, 68, 68, 0.1); color: #f87171; }
    
    .vec-dropdown { display: none; position: fixed !important; width: 240px; background: var(--card) !important; border: 1px solid var(--border) !important; box-shadow: 0 8px 24px rgba(0,0,0,0.25) !important; border-radius: 2px; z-index: 999999 !important; padding: 4px 0; transform: scale(0.95); opacity: 0; transition: transform 0.15s ease-out, opacity 0.15s ease-out; }
    .vec-dropdown.show { display: block; transform: scale(1); opacity: 1; }
    .vec-dropdown .vec-dropdown-item { padding: 7px 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); font-size: 12.5px; color: var(--fg); }
    .vec-dropdown .vec-dropdown-item:hover { background: rgba(33, 150, 243, 0.08); color: var(--primary-base); }
    
    /* --- CHECKLIST SINGLE-LINE CRISP ITEM --- */
    .checkitem { display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 5px 8px; border: 1px solid var(--border); border-radius: 2px; margin-bottom: 4px; background: var(--card); cursor: pointer; transition: all 0.15s; box-shadow: none; }
    .checkitem.is-hidden { display: none !important; }
    .checkitem:hover { border-color: var(--primary-base); background: var(--bg-hover); }
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
    
    /* --- SEGMENTED SWITCHER (CHỌN ĐỐI TƯỢNG: VECTOR / MA TRẬN) --- */
    .obj-segmented-switcher {
        display: flex; gap: 4px; padding: 3px; background: var(--bg-hover, rgba(0,0,0,0.04));
        border: 1px solid var(--border); border-radius: 4px; margin-bottom: 12px;
    }
    .obj-segment-btn {
        flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        padding: 7px 10px; font-size: 12.5px; font-weight: 600; border: 1px solid transparent;
        background: transparent; color: var(--muted); border-radius: 3px; cursor: pointer;
        transition: all 0.15s ease; white-space: nowrap; user-select: none;
    }
    .obj-segment-btn:hover { color: var(--fg); background: rgba(0,0,0,0.03); }
    .obj-segment-btn.active {
        background: var(--card); color: var(--primary-base); font-weight: 700;
        border-color: var(--border); box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    body.dark .obj-segment-btn.active, body.dark-theme .obj-segment-btn.active {
        background: var(--bg-card); color: var(--blue-9, #3b9eff); border-color: var(--border-strong);
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    }
    .obj-count-badge { font-size: 11px; font-weight: 600; opacity: 0.85; }

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

                const actionRow = document.createElement("div");
                actionRow.className = "sidebar-action-split-row";

                const btnImgVec = document.createElement("button");
                btnImgVec.type = "button";
                btnImgVec.id = "btnImageToVector";
                btnImgVec.className = "btn-image-vector";
                btnImgVec.style.flex = "1";
                btnImgVec.style.marginTop = "0";
                btnImgVec.innerHTML = '<i class="ph ph-image"></i> Nhập ảnh';
                btnImgVec.title = "Chuyển ảnh PNG hoặc JPG thành lưới vector tam giác thích ứng";
                btnImgVec.onclick = () => {
                    if (window.App && window.App.ImageVectorizer && typeof window.App.ImageVectorizer.openModal === "function") {
                        window.App.ImageVectorizer.openModal();
                    }
                };
                actionRow.appendChild(btnImgVec);

                const btnNori = document.createElement("button");
                btnNori.type = "button";
                btnNori.id = "btnNoriEntitySidebar";
                btnNori.className = "btn-nori-pencil" + (window.App?.noriEntityActive ? " active" : "");
                btnNori.title = "Bật/Tắt thực thể Nori trong mặt phẳng 2D";
                if (window.App && window.App.mode === "3D") {
                    btnNori.style.display = "none";
                }
                btnNori.innerHTML = `
                    <i class="ph ph-paw-print nori-pencil-icon"></i>
                    <span>Nori</span>
                `;
                btnNori.onclick = () => {
                    if (window.App && typeof window.App.toggleNoriEntity === "function") {
                        window.App.toggleNoriEntity();
                    }
                };
                actionRow.appendChild(btnNori);

                rowWrap.appendChild(actionRow);

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
                btnClearAll.onclick = (e) => {
                    e.stopPropagation();
                    if (typeof App.clearAllVectors === "function") {
                        App.clearAllVectors();
                    }
                };
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
    btnList.innerHTML = '<i class="ph ph-stack"></i><span>Đối tượng</span>';

    const btnSpace = document.createElement("button");
    btnSpace.className = "tab-btn";
    btnSpace.innerHTML = '<i class="ph ph-compass"></i><span>Bài toán</span>';

    const btnCalc = document.createElement("button");
    btnCalc.className = "tab-btn";
    btnCalc.innerHTML = '<i class="ph ph-calculator"></i><span>Phép tính</span>';

    tabNav.append(btnList, btnSpace, btnCalc);

    const contentArea = document.createElement("div");
    contentArea.className = "sidebar-content-area";

    const tabContentList = document.createElement("div");
    tabContentList.className = "tab-content active";
    tabContentList.id = "tabContentObjects";

    const initChooser = document.createElement("div");
    initChooser.className = "obj-segmented-switcher";
    initChooser.innerHTML = `
      <button type="button" class="obj-segment-btn active" id="btnSegmentVector" data-type="vector">
        <span>Vector</span> <span class="obj-count-badge" id="vecCountBadge">(0)</span>
      </button>
      <button type="button" class="obj-segment-btn" id="btnSegmentMatrix" data-type="matrix">
        <span>Ma trận</span> <span class="obj-count-badge" id="matCountBadge">(0)</span>
      </button>
      <select id="createObjectSelect" style="display: none;">
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
            <div id="matrixCustomMenu" class="custom-menu-dropdown" style="display: none;">
              <!-- 1. Can & Luy thua -->
              <div class="menu-group-item" data-group="roots">
                <div class="menu-group-header">
                  <span class="group-title">Căn & Lũy thừa</span>
                  <span class="group-arrow"><i class="ph ph-caret-right"></i></span>
                </div>
                <div class="menu-sub-flyout">
                  <div class="menu-item" onclick="insertLatex('\\\\sqrt{#0}')">
                    <span>Căn bậc 2</span> <span class="latex-preview">√x</span>
                  </div>
                  <div class="menu-item" onclick="insertLatex('cbrt(#0)')">
                    <span>Căn bậc 3</span> <span class="latex-preview">∛x</span>
                  </div>
                  <div class="menu-item" onclick="insertLatex('root(#?, #0)')">
                    <span>Căn bậc n</span> <span class="latex-preview">ⁿ√x</span>
                  </div>
                  <div class="menu-item" onclick="insertLatex('^{(#0)}')">
                    <span>Lũy thừa mũ</span> <span class="latex-preview">xⁿ</span>
                  </div>
                </div>
              </div>

              <!-- 2. Luong giac -->
              <div class="menu-group-item" data-group="trig">
                <div class="menu-group-header">
                  <span class="group-title">Lượng giác</span>
                  <span class="group-arrow"><i class="ph ph-caret-right"></i></span>
                </div>
                <div class="menu-sub-flyout">
                  <div class="sub-section-title">Cơ bản</div>
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
                  <div class="sub-section-title">Góc & Lượng giác ngược</div>
                  <div class="menu-item" onclick="insertLatex('\\\\arccos(#0)')">
                    <span>Arccos</span> <span class="latex-preview">arccos</span>
                  </div>
                  <div class="menu-item" onclick="insertLatex('\\\\arcsin(#0)')">
                    <span>Arcsin</span> <span class="latex-preview">arcsin</span>
                  </div>
                  <div class="menu-item" onclick="insertLatex('\\\\arctan(#0)')">
                    <span>Arctan</span> <span class="latex-preview">arctan</span>
                  </div>
                </div>
              </div>

              <!-- 3. Logarit -->
              <div class="menu-group-item" data-group="logs">
                <div class="menu-group-header">
                  <span class="group-title">Logarit</span>
                  <span class="group-arrow"><i class="ph ph-caret-right"></i></span>
                </div>
                <div class="menu-sub-flyout">
                  <div class="menu-item" onclick="insertLatex('\\\\log_{#?}(#0)')">
                    <span>Logarit cơ số a (tự chọn)</span> <span class="latex-preview">logₐ</span>
                  </div>
                  <div class="menu-item" onclick="insertLatex('\\\\log_{2}(#0)')">
                    <span>Logarit cơ số 2</span> <span class="latex-preview">log2</span>
                  </div>
                  <div class="menu-item" onclick="insertLatex('\\\\log_{10}(#0)')">
                    <span>Logarit cơ số 10</span> <span class="latex-preview">log10</span>
                  </div>
                  <div class="menu-item" onclick="insertLatex('\\\\ln(#0)')">
                    <span>Logarit tự nhiên (e)</span> <span class="latex-preview">ln</span>
                  </div>
                </div>
              </div>

              <!-- 4. Hang so & Tham so -->
              <div class="menu-group-item" data-group="constants">
                <div class="menu-group-header">
                  <span class="group-title">Hằng số & Tham số</span>
                  <span class="group-arrow"><i class="ph ph-caret-right"></i></span>
                </div>
                <div class="menu-sub-flyout">
                  <div class="sub-section-title">Hằng số toán học</div>
                  <div class="menu-item" onclick="insertLatex('\\\\pi')">
                    <span>Số Pi</span> <span class="latex-preview">π</span>
                  </div>
                  <div class="menu-item" onclick="insertLatex('e')">
                    <span>Số Euler (e)</span> <span class="latex-preview">e</span>
                  </div>
                  <div class="sub-section-title">Tham số biến thiên</div>
                  <div class="menu-item" onclick="insertLatex('t')">
                    <span>Tham số t</span> <span class="latex-preview">t</span>
                  </div>
                  <div class="menu-item" onclick="insertLatex('m')">
                    <span>Tham số m</span> <span class="latex-preview">m</span>
                  </div>
                  <div class="menu-item" onclick="insertLatex('u')">
                    <span>Tham số u</span> <span class="latex-preview">u</span>
                  </div>
                  <div class="menu-item" onclick="insertLatex('v')">
                    <span>Tham số v</span> <span class="latex-preview">v</span>
                  </div>
                  <div class="menu-item" onclick="insertLatex('x')">
                    <span>Tham số x</span> <span class="latex-preview">x</span>
                  </div>
                  <div class="menu-item" onclick="insertLatex('y')">
                    <span>Tham số y</span> <span class="latex-preview">y</span>
                  </div>
                  <div class="menu-item" onclick="insertLatex('z')">
                    <span>Tham số z</span> <span class="latex-preview">z</span>
                  </div>
                </div>
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

    // Xử lý logic đóng/mở menu của Matrix (Đồng bộ chuẩn phân tầng và portal như Vector)
    setTimeout(() => {
      const matBtn = document.getElementById('matrixMenuBtn');
      const matMenu = document.getElementById('matrixCustomMenu');
      if (matBtn && matMenu) {
        matBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isHidden = matMenu.style.display === 'none' || matMenu.style.display === '';
          if (isHidden) {
            if (matMenu.parentElement !== document.body) {
              document.body.appendChild(matMenu);
            }
            const updateMatMenuPos = () => {
              const btnRect = matBtn.getBoundingClientRect();
              const menuWidth = 180;
              matMenu.style.position = 'fixed';
              matMenu.style.right = 'auto';
              matMenu.style.width = `${menuWidth}px`;
              matMenu.style.top = `${btnRect.bottom + 4}px`;
              let leftPos = btnRect.left;
              if (leftPos + menuWidth > window.innerWidth - 10) {
                leftPos = Math.max(10, window.innerWidth - menuWidth - 10);
              }
              matMenu.style.left = `${leftPos}px`;
              matMenu.style.zIndex = '999999';
            };
            matMenu.style.display = 'block';
            updateMatMenuPos();
            matMenu.querySelectorAll('.menu-group-item.is-open').forEach(el => el.classList.remove('is-open'));
          } else {
            matMenu.style.display = 'none';
            matMenu.querySelectorAll('.menu-group-item.is-open').forEach(el => el.classList.remove('is-open'));
          }
        });

        // Click header nhóm để toggle accordion
        matMenu.querySelectorAll('.menu-group-header').forEach(header => {
          header.addEventListener('click', (e) => {
            const parent = header.closest('.menu-group-item');
            if (parent) {
              const wasOpen = parent.classList.contains('is-open');
              matMenu.querySelectorAll('.menu-group-item.is-open').forEach(el => el.classList.remove('is-open'));
              if (!wasOpen) parent.classList.add('is-open');
              e.stopPropagation();
            }
          });
        });

        // Hỗ trợ rê chuột (hover) mượt mà cho ma trận, không bị tắt đột ngột
        matMenu.querySelectorAll('.menu-group-item').forEach(item => {
          item.addEventListener('mouseenter', () => {
            matMenu.querySelectorAll('.menu-group-item.is-open').forEach(el => {
              if (el !== item) el.classList.remove('is-open');
            });
            item.classList.add('is-open');
          });
        });

        matMenu.addEventListener('mouseleave', () => {
          matMenu.querySelectorAll('.menu-group-item.is-open').forEach(el => el.classList.remove('is-open'));
        });

        // Bám theo nút khi cuộn trang
        window.addEventListener('scroll', () => {
          if (matMenu && matMenu.style.display === 'block') {
            const btnRect = matBtn.getBoundingClientRect();
            const menuWidth = 180;
            matMenu.style.right = 'auto';
            matMenu.style.width = `${menuWidth}px`;
            matMenu.style.top = `${btnRect.bottom + 4}px`;
            let leftPos = btnRect.left;
            if (leftPos + menuWidth > window.innerWidth - 10) {
              leftPos = Math.max(10, window.innerWidth - menuWidth - 10);
            }
            matMenu.style.left = `${leftPos}px`;
          }
        }, { capture: true, passive: true });

        // Bấm ra ngoài thì đóng
        document.addEventListener('click', (e) => {
          if (!matBtn.contains(e.target) && !matMenu.contains(e.target)) {
            matMenu.style.display = 'none';
            matMenu.querySelectorAll('.menu-group-item.is-open').forEach(el => el.classList.remove('is-open'));
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
        <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; display: block; letter-spacing: 0.5px;">Phạm vi phép tính</label>
        <select id="calcObjectSelect">
          <option value="vector" selected>Vector với nhau (8 phép toán)</option>
          <option value="matrix">Ma trận với nhau (5 phép toán)</option>
          <option value="mixed">Vector với Ma trận (Biến đổi tuyến tính)</option>
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
              <button id="btnCompute" class="btn primary" type="button" data-require-vectors="true" style="flex:1; padding:9px 12px; font-size:13px; font-weight:600; box-shadow:none !important; border-radius:2px;">Thực hiện</button>
              <button id="btnVectorReplay" class="btn secondary" type="button" style="display:none; padding:9px 12px; font-size:13px; font-weight:600; border-radius:2px; align-items:center; gap:6px; cursor:pointer;" title="Phát lại hoạt họa của phép tính vừa thực hiện"><i class="ph ph-arrow-counter-clockwise"></i> Phát lại</button>
              <button id="btnVectorCalcSolution" class="btn btn-secondary btn-solution" type="button" data-sync-managed="1" style="padding:9px 14px; font-size:13px; font-weight:600; border-radius:2px; white-space:nowrap;">Lời giải</button>
            </div>
            <div id="calcSteps" class="help" style="margin-top:2px;">Kết quả phép tính sẽ hiển thị ở đây.</div>
          </div>
        </div>

        <div id="calcMatrixPanel" class="calc-mode-panel">
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; display: block; letter-spacing: 0.5px;">Phép toán ma trận</label>
              <select id="matrixOpSelect" style="width: 100%;">
                <option value="det">Tính Định thức (Det) [Bài 17]</option>
                <option value="inv">Tìm Ma trận Nghịch đảo [Bài 20]</option>
                <option value="rank">Tìm Hạng Ma trận (Rank) [Bài 16]</option>
                <option value="transpose">Ma trận Chuyển vị [Bài 13]</option>
                <option value="mul_matrix">Nhân hai ma trận (A ✕ B) [Bài 13]</option>
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
            <div id="matrixCalcParamContainerA" class="mixed-matrix-param-wrap" style="display:none; margin-top:4px;"></div>
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
              <div id="matrixCalcParamContainerB" class="mixed-matrix-param-wrap" style="display:none; margin-top:4px;"></div>
            </div>
            <div style="display: flex; gap: 8px; align-items: stretch; width: 100%; flex-wrap: wrap;">
              <button id="btnMatrixCompute" class="btn primary" type="button" data-require-vectors="false" style="flex: 1; min-width: 108px; padding: 9px 10px; font-size: 13px; font-weight: 600; box-shadow: none !important; border-radius: 2px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                <i class="ph ph-play"></i> <span>Thực hiện</span>
              </button>
              <button id="btnMatrixReplay" class="btn secondary" type="button" data-require-vectors="false" style="display: none; padding: 9px 10px; font-size: 13px; font-weight: 600; box-shadow: none !important; border-radius: 2px; align-items: center; justify-content: center; gap: 6px; cursor: pointer;" title="Phát lại hoạt họa của phép tính vừa thực hiện">
                <i class="ph ph-arrow-counter-clockwise"></i> <span>Phát lại</span>
              </button>
              <button id="btnMatrixSpeed" class="btn secondary" type="button" data-require-vectors="false" style="padding: 9px 10px; font-size: 12px; font-weight: 600; box-shadow: none !important; border-radius: 2px; align-items: center; justify-content: center; min-width: 42px; cursor: pointer;" title="Thay đổi tốc độ mô phỏng (0.5x, 1x, 2x)">
                1x
              </button>
              <button id="btnMatrixCalcSolution" class="btn btn-secondary btn-solution" type="button" data-require-vectors="false" data-sync-managed="1" style="padding: 9px 12px; font-size: 13px; font-weight: 600; border-radius: 2px; white-space: nowrap;">
                Lời giải
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
            <div id="mixedMatrixParamContainer" class="mixed-matrix-param-wrap" style="display:none; margin-top:2px;"></div>
            <div style="display:flex; gap:8px;">
              <button id="btnMixedCompute" class="btn primary" type="button" data-require-vectors="false" style="flex:1; padding:9px 12px; font-size:13px; font-weight:600; box-shadow:none !important; border-radius:2px;">Thực hiện</button>
              <button id="btnMixedCalcSolution" class="btn btn-secondary btn-solution" type="button" data-require-vectors="false" data-sync-managed="1" style="padding:9px 14px; font-size:13px; font-weight:600; border-radius:2px; white-space:nowrap;">Lời giải</button>
            </div>
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
                <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:6px 10px; margin-top:8px; padding-top:8px; border-top:1px dashed var(--border-subtle, rgba(150,150,150,0.15)); font-size:10.5px;">
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
        const wasActive = btn.classList.contains("active");
        tabs.forEach((t) => t.classList.remove("active"));
        panels.forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        panels[index].classList.add("active");

        if (!wasActive) {
          if (typeof App.stopAllAnimations === "function") {
            try { App.stopAllAnimations(null); } catch (_) {}
          }
          if (window.App?.LinearTransform?.isActive?.()) {
            try { window.App.LinearTransform.stop(); } catch (_) {}
          }
          if (window.App?.OperationAnimator?.stop) {
            try { window.App.OperationAnimator.stop({ clearStaticOverlays: true, skipRedraw: true }); } catch (_) {}
          }
        }

        // Khi rời tab Phép tính, khôi phục toàn bộ vector bị ẩn tạm thời bởi bộ chọn v1/v2
        if (index !== 2) {
          if (typeof App.restoreCalcVisibility === "function") {
            App.restoreCalcVisibility(false);
          }
        } else {
          const calcMode = document.getElementById("calcObjectSelect")?.value || "vector";
          if (calcMode === "mixed" && typeof App.refreshTransformTab === "function") {
            App.refreshTransformTab();
          } else if (calcMode === "vector" && typeof App.updateVisibilityByCalc === "function") {
            App.updateVisibilityByCalc();
          }
        }
      };
    });

    const createObjectSelect = document.getElementById("createObjectSelect");
    const calcObjectSelect = document.getElementById("calcObjectSelect");
    const btnSegmentVector = document.getElementById("btnSegmentVector");
    const btnSegmentMatrix = document.getElementById("btnSegmentMatrix");

    const syncSegmentButtons = () => {
      const isMatrix = createObjectSelect?.value === "matrix";
      if (btnSegmentVector) btnSegmentVector.classList.toggle("active", !isMatrix);
      if (btnSegmentMatrix) btnSegmentMatrix.classList.toggle("active", isMatrix);
    };

    if (btnSegmentVector && btnSegmentMatrix && createObjectSelect) {
      btnSegmentVector.onclick = () => {
        createObjectSelect.value = "vector";
        createObjectSelect.dispatchEvent(new Event("change"));
      };
      btnSegmentMatrix.onclick = () => {
        createObjectSelect.value = "matrix";
        createObjectSelect.dispatchEvent(new Event("change"));
      };
    }

    const toggleCreatePanels = () => {
      const isMatrix = createObjectSelect?.value === "matrix";
      syncSegmentButtons();
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

      if (window.App?.OperationAnimator?.stop) {
        window.App.OperationAnimator.stop({ clearStaticOverlays: true, skipRedraw: true });
      }
      if (window.App?.LinearTransform?.isActive?.()) {
        window.App.LinearTransform.stop();
      }

      if (mode !== "vector") {
        if (typeof App.restoreCalcVisibility === "function") {
          App.restoreCalcVisibility(false);
        }
      } else if (typeof App.updateVisibilityByCalc === "function") {
        App.updateVisibilityByCalc();
      }

      if (mode === "mixed" && typeof App.refreshTransformTab === "function") {
        App.refreshTransformTab();
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
    const btnVectorCalcSolution = document.getElementById("btnVectorCalcSolution");
    if (btnVectorCalcSolution) {
      btnVectorCalcSolution.onclick = () => {
        if (window.App?.SolutionSync?.openWithSync) {
          App.SolutionSync.openWithSync({
            key: "calc_vector",
            getSig: () => (typeof App.getVectorCalcSig === "function" ? App.getVectorCalcSig() : ""),
            recomputeStatic: () => (typeof App.recomputeVectorCalcStatic === "function" ? App.recomputeVectorCalcStatic() : null),
            emptyTitle: "Phép tính vector",
            emptyHintHtml: "Hãy tạo và chọn vector hợp lệ để xem lời giải từng bước."
          });
        }
      };
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

    const btnMatrixCalcSolution = document.getElementById("btnMatrixCalcSolution");
    if (btnMatrixCalcSolution) {
      btnMatrixCalcSolution.dataset.requireVectors = "false";
      btnMatrixCalcSolution.onclick = () => {
        if (window.App?.SolutionSync?.openWithSync) {
          App.SolutionSync.openWithSync({
            key: "calc_matrix",
            getSig: () => (typeof App.getMatrixCalcSig === "function" ? App.getMatrixCalcSig() : ""),
            recomputeStatic: () => (typeof App.runMatrixCalc === "function" ? App.runMatrixCalc(false, { logHistory: false }) : null),
            emptyTitle: "Phép toán ma trận",
            emptyHintHtml: "Hãy nhập đầy đủ các phần tử của ma trận để xem lời giải chi tiết."
          });
        }
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
      btnMixedCompute.dataset.requireVectors = "false";
      btnMixedCompute.onclick = () => {
        if (window.App?.LinearTransform?.isActive?.()) {
          window.App.LinearTransform.stop();
          return;
        }
        App.runMixedCalc(true);
      };
    }

    const btnMixedCalcSolution = document.getElementById("btnMixedCalcSolution");
    if (btnMixedCalcSolution) {
      btnMixedCalcSolution.dataset.requireVectors = "false";
      btnMixedCalcSolution.onclick = () => {
        if (window.App?.SolutionSync?.openWithSync) {
          App.SolutionSync.openWithSync({
            key: "calc_mixed",
            getSig: () => (typeof App.getMixedCalcSig === "function" ? App.getMixedCalcSig() : ""),
            recomputeStatic: () => (typeof App.runMixedCalc === "function" ? App.runMixedCalc(false, { skipSceneMutate: true, logHistory: false }) : null),
            emptyTitle: "Biến đổi tuyến tính Ma trận - Vector",
            emptyHintHtml: "Hãy chọn một ma trận và một đối tượng vector hợp lệ để xem lời giải chi tiết."
          });
        }
      };
    }

    const mixedMatrixSel = document.getElementById("mixedMatrixSelect");
    if (mixedMatrixSel) {
      mixedMatrixSel.addEventListener("change", () => {
        if (window.App?.LinearTransform?.isActive?.()) {
          window.App.LinearTransform.stop();
        }
        if (typeof App.updateMixedParamController === "function") {
          App.updateMixedParamController();
        }
      });
    }

    const mixedVectorSel = document.getElementById("mixedVectorSelect");
    if (mixedVectorSel) {
      mixedVectorSel.addEventListener("change", () => {
        if (mixedVectorSel.value === "nori_entity") {
          mixedVectorSel.dataset.userExplicitNori = "true";
        } else {
          delete mixedVectorSel.dataset.userExplicitNori;
        }
        if (window.App?.LinearTransform?.isActive?.()) {
          window.App.LinearTransform.stop();
        }
        const resultBox = document.getElementById("mixedResultBox");
        if (resultBox && resultBox.style.display !== "none" && typeof App.runMixedCalc === "function") {
          App.runMixedCalc(false);
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
      const matResBox = document.getElementById("matrixResultBox");
      if (matResBox) {
        matResBox.style.display = "none";
        matResBox.innerHTML = "";
      }
      if (window.App?.SolutionSync?.clear) {
        App.SolutionSync.clear("calc_matrix");
      }
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

    const handleGridChangeA = () => {
      resetMatrixReplay();
      if (typeof App.updateMatrixCalcParamController === "function") {
        App.updateMatrixCalcParamController("A");
      }
    };
    const handleGridChangeB = () => {
      resetMatrixReplay();
      if (typeof App.updateMatrixCalcParamController === "function") {
        App.updateMatrixCalcParamController("B");
      }
    };

    const elGridA = document.getElementById("matrixCalcGridA");
    if (elGridA) {
      elGridA.addEventListener("input", handleGridChangeA);
      elGridA.addEventListener("change", handleGridChangeA);
    }
    const elGridB = document.getElementById("matrixCalcGridB");
    if (elGridB) {
      elGridB.addEventListener("input", handleGridChangeB);
      elGridB.addEventListener("change", handleGridChangeB);
    }

    ["matrixCalcRowsA", "matrixCalcColsA"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", () => {
        resetMatrixReplay();
        if (typeof App.updateMatrixCalcParamController === "function") {
          App.updateMatrixCalcParamController("A");
        }
      });
    });
    ["matrixCalcRowsB", "matrixCalcColsB"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", () => {
        resetMatrixReplay();
        if (typeof App.updateMatrixCalcParamController === "function") {
          App.updateMatrixCalcParamController("B");
        }
      });
    });

    // Tự động điền dữ liệu ma trận khi chọn từ danh sách đã lưu
    const fillGridFromSaved = (selId, gridId, rowsId, colsId) => {
      const sel = document.getElementById(selId);
      const isA = gridId === "matrixCalcGridA";
      const target = isA ? "A" : "B";
      if (!sel || !sel.value) {
        if (typeof App.updateMatrixCalcParamController === "function") {
          App.updateMatrixCalcParamController(target, null);
        }
        return;
      }
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
          if (cell) {
            const raw = (m.latexValues && m.latexValues[i] && m.latexValues[i][j] !== undefined)
              ? m.latexValues[i][j]
              : String(m.values[i][j]);
            cell.value = raw;
          }
        }
      }
      if (typeof App.updateMatrixCalcParamController === "function") {
        App.updateMatrixCalcParamController(target, m);
      }
    };
    App.fillGridFromSaved = fillGridFromSaved;
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

    if (typeof App.updateObjectCountBadges === "function") {
      App.updateObjectCountBadges();
    }
    if (typeof App.syncSelectedVectorsToCalc === "function") {
      App.syncSelectedVectorsToCalc();
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

  App.optionLabelFor = (it) => {
    if (it.isParametric && it.rawExprs && it.rawExprs.length) {
      return `#${App.displayIndexOf(it)} [${it.rawExprs.join(", ")}]`;
    }
    return `#${App.displayIndexOf(it)} ${it.latex ? App.latexToText(it.latex) : App.formatVectorShort(it.vec)}`;
  };

  // =========================================================================
  // 3. MAIN RENDER FUNCTION: App.renderVectorList
  // (Đã tích hợp Search + Cơi nới khung + Sự kiện đóng mở)
  // =========================================================================
  App.renderVectorList = function (isAppend = false) {
    const el = document.getElementById("vectorList");
    if (!el) return;
    if (window.App?.MasterParamController?.updateUI) {
      window.App.MasterParamController.updateUI();
    }
    document.querySelectorAll("body > .vec-dropdown").forEach(d => d.remove());
    document.querySelectorAll("body > .vec-param-popover").forEach(p => p.remove());
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
    if (typeof App.updateObjectCountBadges === "function") {
      App.updateObjectCountBadges();
    }
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
        
        // XỬ LÝ TRANH LƯỚI VECTOR THÍCH ỨNG (IMAGE MESH)
        if (item.isImageMesh) {
            if (activeFilter === 'hidden' && item.visible !== false) continue;
            if (activeFilter === 'focus' && !item.focus) continue;
            if (cleanSearch !== "") {
                const searchKey = `#${App.displayIndexOf(item)} ${item.name || "tranh vector"}`.toLowerCase();
                if (!searchKey.includes(cleanSearch)) continue;
            }

            const li = document.createElement("li");
            li.className = "vec-item vec-item-image-mesh" + (item.highlighted ? " active" : "");

            const iconBadge = document.createElement("span");
            iconBadge.className = "vec-mesh-badge";
            iconBadge.innerHTML = '<i class="ph ph-image"></i>';
            iconBadge.title = "Tranh lưới vector tam giác";
            li.appendChild(iconBadge);

            const tag = document.createElement("span");
            tag.className = "tag";
            tag.textContent = `#${App.displayIndexOf(item)}`;
            tag.style.whiteSpace = "nowrap";
            li.appendChild(tag);

            const infoWrap = document.createElement("div");
            infoWrap.className = "vec-mesh-info";
            infoWrap.innerHTML = `
              <div class="vec-mesh-name" title="${item.name || "Tranh Vector"}">${item.name || "Tranh Vector"}</div>
              <div class="vec-mesh-sub">${(item.numTriangles || 0).toLocaleString()} tam giác - Nổi 3D: ${item.depthScale || 0}</div>
            `;
            li.appendChild(infoWrap);

            const actions = document.createElement("div");
            actions.className = "vec-actions";

            const wireBtn = document.createElement("button");
            wireBtn.type = "button";
            wireBtn.className = "btn vec-btn-wireframe" + (item.showWireframe ? " active" : "");
            wireBtn.innerHTML = '<i class="ph ph-grid-four"></i>';
            wireBtn.title = item.showWireframe ? "Ẩn khung lưới tam giác" : "Hiện khung lưới tam giác";
            wireBtn.onclick = (e) => {
              e.stopPropagation();
              item.showWireframe = !item.showWireframe;
              App.renderVectorList();
              if (App.mode === "3D" && window.Vec3D?.hardRefresh3D) Vec3D.hardRefresh3D(false);
              else if (window.Vec2D?.draw2DAllVectors) Vec2D.draw2DAllVectors();
            };
            actions.appendChild(wireBtn);

            const toggleBtn = document.createElement("button");
            toggleBtn.type = "button";
            toggleBtn.className = "btn vec-btn-toggle";
            toggleBtn.innerHTML = item.visible !== false ? '<i class="ph ph-eye"></i>' : '<i class="ph ph-eye-slash" style="color:#888;"></i>';
            toggleBtn.title = item.visible !== false ? "Ẩn tranh" : "Hiện tranh";
            toggleBtn.onclick = (e) => {
              e.stopPropagation();
              item.visible = item.visible === false ? true : false;
              App.renderVectorList();
              if (App.mode === "3D" && window.Vec3D?.hardRefresh3D) Vec3D.hardRefresh3D(false);
              else if (window.Vec2D?.draw2DAllVectors) Vec2D.draw2DAllVectors();
            };
            actions.appendChild(toggleBtn);

            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "btn vec-btn-delete";
            delBtn.innerHTML = '<i class="ph ph-trash"></i>';
            delBtn.title = "Xóa tranh";
            delBtn.onclick = (e) => {
              e.stopPropagation();
              const idx = App.vectorList.findIndex((v) => v.id === item.id);
              if (idx >= 0) App.vectorList.splice(idx, 1);
              App.renderVectorList();
              if (App.mode === "3D" && window.Vec3D?.hardRefresh3D) Vec3D.hardRefresh3D(false);
              else if (window.Vec2D?.draw2DAllVectors) Vec2D.draw2DAllVectors();
            };
            actions.appendChild(delBtn);

            li.appendChild(actions);
            el.appendChild(li);
            continue;
        }

        // BƯỚC 1: LỌC THEO NÚT CHIPS (cho vector thông thường)
        if (activeFilter === 'hidden' && item.visible) continue;
        if (activeFilter === 'focus' && !item.focus) continue;
        if (activeFilter === '2d' && (item.vec || []).length >= 3) continue;
        if (activeFilter === '3d' && (item.vec || []).length < 3) continue;

        // BƯỚC 2: LỌC SEARCH THEO TỰ ĐIỂN
        if (cleanSearch !== "") {
            const vecArr = item.vec || [];
            const dict = `#${App.displayIndexOf(item)}[${vecArr.join(",")}]`.toLowerCase();
            if (!dict.includes(cleanSearch)) continue; 
        }

      // --- TỪ ĐÂY TRỞ XUỐNG LÀ CODE RENDER GIAO DIỆN (GIỮ NGUYÊN) ---
      const li = document.createElement("li");
      li.className = "vec-item" + (item.highlighted ? " active" : "");

      const sw = document.createElement("label");
      sw.className = "sw vec-color-swatch-label";
      sw.id = `vecColorSwatch_${item.id}`;
      const effectiveHex = App.colorToHex ? App.colorToHex(item.colorCss || item.colorHex) : (item.colorHex || "#0090ff");
      sw.style.background = effectiveHex;
      sw.style.cursor = "pointer";
      sw.style.position = "relative";
      sw.title = "Bấm để chọn màu vector";

      const colorInp = document.createElement("input");
      colorInp.type = "color";
      colorInp.className = "vec-color-native-picker";
      colorInp.value = effectiveHex;
      colorInp.style.position = "absolute";
      colorInp.style.opacity = "0";
      colorInp.style.width = "100%";
      colorInp.style.height = "100%";
      colorInp.style.cursor = "pointer";
      colorInp.style.top = "0";
      colorInp.style.left = "0";
      colorInp.oninput = (e) => {
        const hex = e.target.value;
        sw.style.background = hex;
        if (typeof App.setVectorColor === "function") {
          App.setVectorColor(item.id, hex);
        }
      };
      colorInp.onclick = (e) => e.stopPropagation();
      sw.appendChild(colorInp);

      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = `#${App.displayIndexOf(item)}`;
      tag.style.whiteSpace = "nowrap";

      const wrapper = document.createElement("div");
      wrapper.className = "vec-input-wrapper";
      wrapper.style.cursor = "pointer";
      wrapper.title = "Bấm để sửa vector";

      const mf = document.createElement("div");
      mf.className = "vec-math-field";
      mf.style.minHeight = "24px";
      mf.style.display = "flex";
      mf.style.alignItems = "center";
      const formulaStr = item.latex || App.formatVectorShort(item.vec);
      if (window.katex && typeof window.katex.renderToString === "function") {
        try {
          mf.innerHTML = window.katex.renderToString(formulaStr, { throwOnError: false, displayMode: false });
        } catch (_) {
          mf.textContent = formulaStr;
        }
      } else {
        mf.textContent = formulaStr;
      }

      wrapper.addEventListener("click", (e) => {
        e.stopPropagation();
        if (typeof App.startEditVector === "function") {
          App.startEditVector(item.id);
        }
      });

      wrapper.appendChild(mf);

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
      toggleBtn.className = "btn vec-btn-toggle";

      const updateVectorToggleBtn = () => {
        if (!item.isParametric) {
          const isShown = item.visible !== false && item.showArrow !== false;
          toggleBtn.innerHTML = isShown ? '<i class="ph ph-eye"></i>' : '<i class="ph ph-eye-slash" style="color: #888"></i>';
          toggleBtn.title = isShown ? "An vector" : "Hien vector";
          return;
        }
        if (item.visible === false) {
          toggleBtn.innerHTML = '<i class="ph ph-eye-slash" style="color: #888"></i>';
          toggleBtn.title = "An tat ca, bam de hien day du";
        } else if (item.showArrow === false) {
          toggleBtn.innerHTML = '<i class="ph ph-wave-sine" style="color: var(--primary-base, #0090ff); font-size: 15px;"></i>';
          toggleBtn.title = "Chi hien quy dao, than vector dang an";
        } else {
          toggleBtn.innerHTML = '<i class="ph ph-eye"></i>';
          toggleBtn.title = "Hien day du, bam de chi hien quy dao";
        }
      };
      updateVectorToggleBtn();

      toggleBtn.onclick = (e) => {
        e.stopPropagation();
        if (!item.isParametric) {
          if (item.visible === false || item.showArrow === false) {
            item.visible = true;
            item.showArrow = true;
          } else {
            item.visible = false;
          }
          const arrowInp = document.getElementById(`vecParamArrowInp_${item.id}`);
          if (arrowInp) arrowInp.checked = item.showArrow !== false && item.visible !== false;
        } else {
          if (item.visible !== false && item.showArrow !== false) {
            item.visible = true;
            item.showArrow = false;
            item.showTrajectory = true;
          } else if (item.visible !== false && item.showArrow === false) {
            item.visible = false;
          } else {
            item.visible = true;
            item.showArrow = true;
            item.showTrajectory = true;
          }
          const arrowInp = document.getElementById(`vecParamArrowInp_${item.id}`);
          if (arrowInp) arrowInp.checked = item.showArrow !== false;
          const traceInp = document.getElementById(`vecParamTraceInp_${item.id}`);
          if (traceInp) traceInp.checked = item.showTrajectory !== false;
        }
        if (item.visible === false) {
          if (typeof App.stopBasisAnimation === "function" && window.App?.BasisAnimator?.isActive?.()) {
            try { App.stopBasisAnimation(); } catch (_) {}
          }
          if (typeof App.stopCoordAnimation === "function" && window.App?.CoordAnimator?.isActive?.()) {
            try { App.stopCoordAnimation(); } catch (_) {}
          }
        }
        updateVectorToggleBtn();
        if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
        else if (window.Vec2D) Vec2D.draw2DAllVectors();
      };

      const editBtn = document.createElement("button");
      editBtn.className = "btn vec-btn-edit";
      editBtn.innerHTML = '<i class="ph ph-pen"></i>';
      editBtn.title = "Sua vector";
      editBtn.onclick = (e) => {
        e.stopPropagation();
        if (typeof App.startEditVector === "function") {
          App.startEditVector(item.id);
        }
      };

      const del = document.createElement("button");
      del.className = "btn vec-btn-delete";
      del.innerHTML = '<i class="ph ph-trash"></i>';
      del.title = "Xoa";

      // SỰ KIỆN XÓA (Tối ưu cực hạn O(1) DOM - Xóa tức thì không freeze)
      del.onclick = (e) => {
        e.stopPropagation();
        // Dừng hoạt cảnh cơ sở / tọa độ trước khi lưu lịch sử & xóa vector để trả về tọa độ gốc
        if (typeof App.stopBasisAnimation === "function") {
          try { App.stopBasisAnimation(); } catch (_) {}
        } else if (window.App?.BasisAnimator?.isActive?.()) {
          try { window.App.BasisAnimator.stop(); } catch (_) {}
        }
        if (typeof App.stopCoordAnimation === "function") {
          try { App.stopCoordAnimation(); } catch (_) {}
        } else if (window.App?.CoordAnimator?.isActive?.()) {
          try { window.App.CoordAnimator.stop(); } catch (_) {}
        }
        App._lastBasisAnimData = null;
        App._lastCoordAnimData = null;

        if (App.editingVectorId === item.id) {
          App.editingVectorId = null;
          const btn = document.getElementById("btnDraw") || document.getElementById("btnAddVector");
          if (btn) {
            btn.innerHTML = '<i class="ph ph-plus" style="margin-right:6px;"></i> Thêm Vector';
            btn.classList.remove("success");
            btn.classList.add("primary");
          }
        }
        if (App.History && typeof App.History.record === "function") {
          App.History.record(`Xóa vector #${item.id}`);
        }
        const idx = App.vectorList.findIndex((v) => v.id === item.id);
        if (idx >= 0) App.vectorList.splice(idx, 1);
        if (App.usedHues) App.usedHues.delete(item.hue);
        if (App.selectedVectorIds) App.selectedVectorIds.delete(item.id);
        if (typeof App.syncSelectedVectorsToCalc === "function") App.syncSelectedVectorsToCalc();
        if (App.clearAngleOverlay) App.clearAngleOverlay();

        // Xóa tức thì DOM element với hiệu ứng fade mượt mà
        li.style.transition = "opacity 0.15s ease, transform 0.15s ease";
        li.style.opacity = "0";
        li.style.transform = "translateX(24px)";
        setTimeout(() => {
          li.remove();
          if (App.vectorList.length === 0) {
            App.renderVectorList();
          } else {
            // Cập nhật lại số thứ tự #tag của các vector còn lại
            const remainingItems = el.querySelectorAll(".vec-item");
            remainingItems.forEach((itEl, i) => {
              const tagEl = itEl.querySelector(".tag");
              if (tagEl && !itEl.classList.contains("vec-item-image-mesh")) {
                tagEl.textContent = `#${i + 1}`;
              }
            });
            if (typeof App.updateObjectCountBadges === "function") {
              App.updateObjectCountBadges();
            }
          }
        }, 150);

        if (App.refreshCalcVectorOptions) App.refreshCalcVectorOptions();
        if (App.renderExtraCalcOptions) App.renderExtraCalcOptions();

        if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
        else if (window.Vec2D) Vec2D.draw2DAllVectors();
      };

      actions.appendChild(focusBtn);
      actions.appendChild(toggleBtn);
      actions.appendChild(editBtn);

      // Nut 3 cham cai dat hien thi cho vector hang so (chi mo tab Hien thi, khong co tab thanh truot)
      if (!item.isParametric) {
        const moreBtn = document.createElement("button");
        moreBtn.type = "button";
        moreBtn.className = "btn vec-btn-more vec-param-more-btn";
        moreBtn.id = `vecParamMore_${item.id}`;
        moreBtn.title = "Cai dat hien thi";
        moreBtn.innerHTML = '<i class="ph ph-dots-three-vertical"></i>';
        actions.appendChild(moreBtn);

        // Cua so Popover cai dat hien thi (Chuan bi doc lap khong co tab tham so)
        const popover = document.createElement("div");
        popover.className = "vec-param-popover";
        popover.id = `vecParamPopover_${item.id}`;
        popover.style.display = "none";

        // Tieu de popover
        const popHeader = document.createElement("div");
        popHeader.className = "vec-param-popover-header";
        const popTitle = document.createElement("span");
        popTitle.className = "vec-param-popover-title";
        popTitle.textContent = `Cài đặt vector #${App.displayIndexOf(item)}`;
        const popClose = document.createElement("button");
        popClose.type = "button";
        popClose.className = "vec-param-popover-close";
        popClose.innerHTML = '<i class="ph ph-x"></i>';
        popClose.onclick = (e) => {
          e.stopPropagation();
          popover.style.display = "none";
        };
        popHeader.appendChild(popTitle);
        popHeader.appendChild(popClose);
        popover.appendChild(popHeader);

        // Thanh Tab dieu huong (chi hien Tab Hien thi, theo dung yeu cau)
        const popTabs = document.createElement("div");
        popTabs.className = "vec-pop-tabs";

        const tabBtnDisplay = document.createElement("button");
        tabBtnDisplay.type = "button";
        tabBtnDisplay.className = "vec-pop-tab-btn active";
        tabBtnDisplay.innerHTML = '<i class="ph ph-paint-brush"></i> <span>Hiển thị</span>';
        popTabs.appendChild(tabBtnDisplay);
        popover.appendChild(popTabs);

        // Khung noi dung Tab Hien thi
        const tabContentDisplay = document.createElement("div");
        tabContentDisplay.className = "vec-pop-tab-content";
        tabContentDisplay.style.display = "flex";

        // Phan khu: DOI TUONG HIEN THI
        const secDisplay = document.createElement("div");
        secDisplay.className = "vec-param-section";
        const titleDisplay = document.createElement("div");
        titleDisplay.className = "vec-param-sec-title";
        titleDisplay.textContent = "ĐỐI TƯỢNG HIỂN THỊ";
        secDisplay.appendChild(titleDisplay);

        // Checkbox: Than vector mui ten
        const arrowLabel = document.createElement("label");
        arrowLabel.className = "vec-param-trace-label";
        const arrowInput = document.createElement("input");
        arrowInput.type = "checkbox";
        arrowInput.id = `vecParamArrowInp_${item.id}`;
        arrowInput.checked = item.showArrow !== false;
        arrowInput.onchange = (e) => {
          item.showArrow = e.target.checked;
          if (item.showArrow && item.visible === false) item.visible = true;
          updateVectorToggleBtn();
          if (App.mode === "3D" && window.Vec3D) {
            if (typeof Vec3D.hardRefresh3D === "function") Vec3D.hardRefresh3D(false);
            else if (typeof Vec3D.draw3DAllVectors === "function") Vec3D.draw3DAllVectors({ frame: false });
          } else if (window.Vec2D && Vec2D.draw2DAllVectors) {
            Vec2D.draw2DAllVectors();
          }
        };
        const arrowText = document.createElement("span");
        arrowText.textContent = "Hiện thân vector mũi tên";
        arrowLabel.appendChild(arrowInput);
        arrowLabel.appendChild(arrowText);
        secDisplay.appendChild(arrowLabel);

        // Cong cu chon mau vector
        const colorRow = document.createElement("div");
        colorRow.className = "vec-color-picker-row";
        colorRow.style.marginTop = "8px";

        const colorLbl = document.createElement("span");
        colorLbl.className = "vec-param-row-label";
        colorLbl.textContent = "Màu vector:";

        const colorTool = document.createElement("div");
        colorTool.className = "vec-color-picker-tool";

        const effectiveHex = App.colorToHex ? App.colorToHex(item.colorCss || item.colorHex) : (item.colorHex || "#0090ff");

        const popColorInp = document.createElement("input");
        popColorInp.type = "color";
        popColorInp.className = "vec-color-input-native";
        popColorInp.id = `vecPopColorInp_${item.id}`;
        popColorInp.value = effectiveHex;

        const popColorHex = document.createElement("span");
        popColorHex.className = "vec-color-hex-text";
        popColorHex.id = `vecPopColorHex_${item.id}`;
        popColorHex.textContent = effectiveHex.toUpperCase();

        popColorInp.oninput = (e) => {
          const hex = e.target.value;
          popColorHex.textContent = hex.toUpperCase();
          if (typeof App.setVectorColor === "function") {
            App.setVectorColor(item.id, hex);
          }
        };

        colorTool.appendChild(popColorInp);
        colorTool.appendChild(popColorHex);
        colorRow.appendChild(colorLbl);
        colorRow.appendChild(colorTool);
        secDisplay.appendChild(colorRow);

        tabContentDisplay.appendChild(secDisplay);
        popover.appendChild(tabContentDisplay);

        // Bam nut 3 cham de bat/tat Popover
        moreBtn.onclick = (e) => {
          e.stopPropagation();
          const isOpen = popover.style.display === "block";
          document.querySelectorAll(".vec-param-popover").forEach((p) => (p.style.display = "none"));
          if (!isOpen) {
            if (popover.parentElement !== document.body) {
              document.body.appendChild(popover);
            }
            popover.style.display = "block";
            popover.dataset.triggerId = moreBtn.id;

            const updatePos = () => {
              const btnRect = moreBtn.getBoundingClientRect();
              const popWidth = 275;
              let left = btnRect.right - popWidth;
              if (left < 10) left = 10;
              if (left + popWidth > window.innerWidth - 10) left = window.innerWidth - popWidth - 10;
              const popHeight = popover.offsetHeight || 190;
              const spaceBelow = window.innerHeight - btnRect.bottom;
              const spaceAbove = btnRect.top;
              let top;
              if (spaceBelow < popHeight + 10 && spaceAbove > spaceBelow) {
                top = btnRect.top - popHeight - 4;
              } else {
                top = btnRect.bottom + 4;
              }
              popover.style.position = "fixed";
              popover.style.left = `${left}px`;
              popover.style.top = `${top}px`;
              popover.style.zIndex = "999999";
            };
            requestAnimationFrame(updatePos);
          }
        };

        li.appendChild(popover);
      }

      actions.appendChild(del);
      li.appendChild(sw);
      li.appendChild(tag);
      li.appendChild(wrapper);
      li.appendChild(actions);

      // ĐIỀU KHIỂN HOẠT ẢNH THAM SỐ TÁCH BẠCH CHO TỪNG VECTOR (CHUẨN 3 CHẤM)
      if (item.isParametric) {
        const paramCtrl = document.createElement("div");
        paramCtrl.className = "vec-param-controller";
        paramCtrl.style.position = "relative";

        // Thanh điều khiển tinh gọn (biến chạy, play/pause, thanh trượt, reset, nút 3 chấm)
        const bar = document.createElement("div");
        bar.className = "vec-param-bar";

        const isMultiModeNow = (item.activeAnimVars && item.activeAnimVars.length > 1) || (item.vars && item.vars.length > 1);

        // Khung hiển thị giá trị 1 biến (có ô nhập trực tiếp)
        const singleValBox = document.createElement("div");
        singleValBox.className = "vec-param-val-box";
        singleValBox.id = `vecParamSingleValBox_${item.id}`;
        singleValBox.title = "Nhập trực tiếp giá trị tham số đang chọn";
        singleValBox.style.display = "inline-flex";

        const valLabel = document.createElement("span");
        valLabel.className = "vec-param-var-label";
        valLabel.id = `vecParamVarLbl_${item.id}`;
        valLabel.textContent = `${item.paramVar || "t"} =`;

        const valInp = document.createElement("input");
        valInp.type = "number";
        valInp.className = "vec-param-val-inp";
        valInp.id = `vecParamValInp_${item.id}`;
        valInp.value = Number(item.paramVal ?? 1.0).toFixed(2);
        valInp.step = "0.1";

        // Tự động tạm dừng hoạt ảnh khi người dùng bấm vào gõ giá trị
        valInp.onfocus = () => {
          if (item.isAnimating) {
            App.toggleVectorAnimation(item.id);
          }
        };

        // Khi người dùng nhập giá trị tham số trực tiếp:
        valInp.oninput = (e) => {
          const val = parseFloat(e.target.value);
          if (!isNaN(val)) {
            App.setVectorParamValueDirect(item.id, val);
          }
        };

        valInp.onkeydown = (e) => {
          if (e.key === "Enter") {
            valInp.blur();
          }
        };

        singleValBox.appendChild(valLabel);
        singleValBox.appendChild(valInp);

        const slider = document.createElement("input");
        slider.type = "range";
        slider.className = "vec-param-slider";
        slider.id = `vecParamSlider_${item.id}`;
        slider.min = item.paramInfinity ? -25 : (item.paramMin ?? -10.0);
        slider.max = item.paramInfinity ? 25 : (item.paramMax ?? 10.0);
        slider.step = "0.05";
        slider.value = item.paramVal ?? 1.0;
        slider.onpointerdown = () => { App._isDraggingSlider = true; };
        slider.onpointerup = () => {
          App._isDraggingSlider = false;
          if (App.mode === "2D" && window.Vec2D) Vec2D.draw2DAllVectors();
          else if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
        };
        slider.oninput = (e) => {
          App._isDraggingSlider = true;
          App.setVectorParamValue(item.id, e.target.value);
        };
        slider.onchange = () => {
          App._isDraggingSlider = false;
          if (App.mode === "2D" && window.Vec2D) Vec2D.draw2DAllVectors();
          else if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
        };

        // Khung hiển thị nhiều biến cùng chạy hoạt ảnh
        const multiValBox = document.createElement("div");
        multiValBox.className = "vec-param-multi-box";
        multiValBox.id = `vecParamMultiVals_${item.id}`;
        multiValBox.style.display = isMultiModeNow ? "flex" : "none";

        const updateMultiBadges = () => {
          multiValBox.innerHTML = "";
          if (!item.activeAnimVars || !item.activeAnimVars.length) {
            item.activeAnimVars = item.vars && item.vars.length ? [...item.vars] : [item.paramVar || "t"];
          }
          const curVar = item.paramVar || item.activeAnimVars[0];
          item.activeAnimVars.forEach((vName) => {
            const val = (item.scopeValues && item.scopeValues[vName] !== undefined)
              ? Number(item.scopeValues[vName]).toFixed(2)
              : (vName === item.paramVar ? Number(item.paramVal).toFixed(2) : "0.00");
            const isCur = (vName === curVar);
            const badge = document.createElement("button");
            badge.type = "button";
            badge.className = "vec-multi-badge" + (isCur ? " active" : "");
            badge.title = `Bấm để điều khiển biến ${vName} trên thanh trượt và ô nhập`;
            badge.textContent = `${vName} = ${val}`;
            badge.onclick = (e) => {
              e.stopPropagation();
              item.paramVar = vName;
              if (item.varRanges && item.varRanges[vName]) {
                item.paramMin = item.varRanges[vName].min;
                item.paramMax = item.varRanges[vName].max;
              }
              if (item.scopeValues && item.scopeValues[vName] !== undefined) {
                item.paramVal = item.scopeValues[vName];
              }
              slider.min = item.paramInfinity ? -25 : (item.paramMin ?? -10.0);
              slider.max = item.paramInfinity ? 25 : (item.paramMax ?? 10.0);
              slider.value = item.paramVal;
              valLabel.textContent = `${vName} =`;
              valInp.value = Number(item.paramVal).toFixed(2);
              updateMultiBadges();
            };
            multiValBox.appendChild(badge);
          });
        };
        if (isMultiModeNow && item.activeAnimVars) {
          updateMultiBadges();
        }

        const playBtn = document.createElement("button");
        playBtn.type = "button";
        playBtn.className = "vec-param-btn vec-param-play" + (item.isAnimating ? " is-active" : "");
        playBtn.id = `vecParamPlay_${item.id}`;
        playBtn.title = item.isAnimating ? "Tạm dừng" : "Chạy hoạt ảnh";
        playBtn.innerHTML = item.isAnimating ? '<i class="ph ph-pause"></i>' : '<i class="ph ph-play"></i>';
        playBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          App.toggleVectorAnimation(item.id);
        };

        const resetBtn = document.createElement("button");
        resetBtn.type = "button";
        resetBtn.className = "vec-param-btn vec-param-reset";
        resetBtn.title = "Đặt lại về mặc định";
        resetBtn.innerHTML = '<i class="ph ph-arrow-counter-clockwise"></i>';
        resetBtn.onclick = (e) => {
          e.stopPropagation();
          App.resetVectorParam(item.id);
        };

        const moreBtn = document.createElement("button");
        moreBtn.type = "button";
        moreBtn.className = "vec-param-btn vec-param-more-btn";
        moreBtn.id = `vecParamMore_${item.id}`;
        moreBtn.title = "Cài đặt tham số";
        moreBtn.innerHTML = '<i class="ph ph-dots-three-vertical"></i>';

        paramCtrl.appendChild(multiValBox);
        bar.appendChild(singleValBox);
        bar.appendChild(playBtn);
        bar.appendChild(slider);
        bar.appendChild(resetBtn);
        bar.appendChild(moreBtn);
        paramCtrl.appendChild(bar);

        // Cửa sổ Popover cài đặt nâng cao (Chỉ mở khi bấm 3 chấm, không tự mất khi rê chuột)
        const popover = document.createElement("div");
        popover.className = "vec-param-popover";
        popover.id = `vecParamPopover_${item.id}`;
        popover.style.display = "none";

        // Tiêu đề popover
        const popHeader = document.createElement("div");
        popHeader.className = "vec-param-popover-header";
        const popTitle = document.createElement("span");
        popTitle.className = "vec-param-popover-title";
        popTitle.textContent = `Cài đặt tham số #${App.displayIndexOf(item)}`;
        const popClose = document.createElement("button");
        popClose.type = "button";
        popClose.className = "vec-param-popover-close";
        popClose.innerHTML = '<i class="ph ph-x"></i>';
        popClose.onclick = (e) => {
          e.stopPropagation();
          popover.style.display = "none";
        };
        popHeader.appendChild(popTitle);
        popHeader.appendChild(popClose);
        popover.appendChild(popHeader);

        // 1. THANH TABS ĐIỀU HƯỚNG
        const popTabs = document.createElement("div");
        popTabs.className = "vec-pop-tabs";

        const tabBtnParam = document.createElement("button");
        tabBtnParam.type = "button";
        tabBtnParam.className = "vec-pop-tab-btn active";
        tabBtnParam.innerHTML = '<i class="ph ph-sliders"></i> <span>Tham số</span>';

        const tabBtnDisplay = document.createElement("button");
        tabBtnDisplay.type = "button";
        tabBtnDisplay.className = "vec-pop-tab-btn";
        tabBtnDisplay.innerHTML = '<i class="ph ph-paint-brush"></i> <span>Hiển thị</span>';

        popTabs.appendChild(tabBtnParam);
        popTabs.appendChild(tabBtnDisplay);
        popover.appendChild(popTabs);

        // 2. KHUNG NỘI DUNG TAB 1: THAM SỐ VÀ HOẠT ẢNH
        const tabContentParam = document.createElement("div");
        tabContentParam.className = "vec-pop-tab-content";

        // Chọn các biến chạy hoạt ảnh độc lập
        if (item.vars && item.vars.length > 1) {
          const secAnimVars = document.createElement("div");
          secAnimVars.className = "vec-param-section";
          const titleAnimVars = document.createElement("div");
          titleAnimVars.className = "vec-param-sec-title";
          titleAnimVars.textContent = "BIẾN HOẠT ẢNH";
          secAnimVars.appendChild(titleAnimVars);

          const chipsWrap = document.createElement("div");
          chipsWrap.className = "vec-var-chips";

          if (!item.activeAnimVars || !Array.isArray(item.activeAnimVars)) {
            item.activeAnimVars = item.vars && item.vars.length ? [...item.vars] : [item.paramVar || "t"];
          }

          item.vars.forEach((vName) => {
            const chip = document.createElement("button");
            chip.type = "button";
            const isActive = item.activeAnimVars.includes(vName);
            chip.className = "vec-var-chip" + (isActive ? " active" : "");
            chip.innerHTML = isActive
              ? `<i class="ph ph-check"></i> <span>Biến ${vName}</span>`
              : `<span>Biến ${vName}</span>`;

            chip.onclick = (e) => {
              e.stopPropagation();
              if (!item.activeAnimVars) item.activeAnimVars = [];
              const idx = item.activeAnimVars.indexOf(vName);
              if (idx >= 0) {
                item.activeAnimVars.splice(idx, 1);
              } else {
                item.activeAnimVars.push(vName);
              }
              const nowActive = item.activeAnimVars.includes(vName);
              chip.classList.toggle("active", nowActive);
              chip.innerHTML = nowActive
                ? `<i class="ph ph-check"></i> <span>Biến ${vName}</span>`
                : `<span>Biến ${vName}</span>`;

              if (item.activeAnimVars.length === 1) {
                const singleVar = item.activeAnimVars[0];
                item.paramVar = singleVar;
                if (item.varRanges && item.varRanges[singleVar]) {
                  item.paramMin = item.varRanges[singleVar].min;
                  item.paramMax = item.varRanges[singleVar].max;
                  slider.min = item.paramMin;
                  slider.max = item.paramMax;
                }
                if (item.scopeValues && item.scopeValues[singleVar] !== undefined) {
                  item.paramVal = item.scopeValues[singleVar];
                }
                valInp.value = Number(item.paramVal).toFixed(2);
                slider.value = item.paramVal;
              }

              App.updateSingleVectorParamUI(item, false);
              App._renderParamStep();
            };
            chipsWrap.appendChild(chip);
          });
          secAnimVars.appendChild(chipsWrap);
          tabContentParam.appendChild(secAnimVars);
        }

        // Phân khu: DẢI GIÁ TRỊ (MIN - MAX) TỪNG BIẾN ĐỘC LẬP
        const secRange = document.createElement("div");
        secRange.className = "vec-param-section";
        const titleRange = document.createElement("div");
        titleRange.className = "vec-param-sec-title";
        titleRange.textContent = "DẢI GIÁ TRỊ (MIN - MAX)";
        secRange.appendChild(titleRange);

        const varsList = (item.vars && item.vars.length > 0) ? item.vars : [item.paramVar || "t"];
        if (!item.varRanges) item.varRanges = {};

        varsList.forEach((vName, idx) => {
          if (!item.varRanges[vName]) {
            item.varRanges[vName] = {
              min: (idx === 0 ? (item.paramMin ?? -10.0) : (item.surfaceMin ?? -5.0)),
              max: (idx === 0 ? (item.paramMax ?? 10.0) : (item.surfaceMax ?? 5.0))
            };
          }
          const rObj = item.varRanges[vName];

          const row = document.createElement("div");
          row.className = "vec-param-var-range-row";

          const tag = document.createElement("span");
          tag.className = "vec-param-var-tag";
          tag.textContent = `Biến ${vName}:`;

          const minGroup = document.createElement("div");
          minGroup.className = "vec-param-input-group";
          minGroup.style.flex = "1";
          const minAddon = document.createElement("span");
          minAddon.className = "vec-param-addon";
          minAddon.textContent = "Min";
          const minInp = document.createElement("input");
          minInp.className = "vec-param-num-inp vec-param-min-inp";
          minInp.dataset.var = vName;
          if (item.paramInfinity) {
            minInp.type = "text";
            minInp.value = "-\u221e";
            minInp.disabled = true;
          } else {
            minInp.type = "number";
            minInp.value = rObj.min;
            minInp.step = "1";
          }
          minInp.oninput = (e) => {
            const num = parseFloat(e.target.value);
            if (!isNaN(num)) {
              rObj.min = num;
              if (vName === item.paramVar) {
                item.paramMin = num;
                if (!item.paramInfinity) slider.min = num;
              } else if (idx === 1) {
                item.surfaceMin = num;
              }
              item._trajMathCache2D = null;
              item._trajMathCache3D = null;
              App._renderParamStep();
            }
          };
          minGroup.appendChild(minAddon);
          minGroup.appendChild(minInp);

          const maxGroup = document.createElement("div");
          maxGroup.className = "vec-param-input-group";
          maxGroup.style.flex = "1";
          const maxAddon = document.createElement("span");
          maxAddon.className = "vec-param-addon";
          maxAddon.textContent = "Max";
          const maxInp = document.createElement("input");
          maxInp.className = "vec-param-num-inp vec-param-max-inp";
          maxInp.dataset.var = vName;
          if (item.paramInfinity) {
            maxInp.type = "text";
            maxInp.value = "+\u221e";
            maxInp.disabled = true;
          } else {
            maxInp.type = "number";
            maxInp.value = rObj.max;
            maxInp.step = "1";
          }
          maxInp.oninput = (e) => {
            const num = parseFloat(e.target.value);
            if (!isNaN(num)) {
              rObj.max = num;
              if (vName === item.paramVar) {
                item.paramMax = num;
                if (!item.paramInfinity) slider.max = num;
              } else if (idx === 1) {
                item.surfaceMax = num;
              }
              item._trajMathCache2D = null;
              item._trajMathCache3D = null;
              App._renderParamStep();
            }
          };
          maxGroup.appendChild(maxAddon);
          maxGroup.appendChild(maxInp);

          row.appendChild(tag);
          row.appendChild(minGroup);
          row.appendChild(maxGroup);
          secRange.appendChild(row);
        });

        // Nút quét vô cực theo tầm nhìn
        const infBtn = document.createElement("button");
        infBtn.type = "button";
        infBtn.className = "vec-param-inf-btn" + (item.paramInfinity ? " active" : "");
        infBtn.innerHTML = '<i class="ph ph-wave-sine"></i> <span>Quét vô cực theo tầm nhìn</span>';
        infBtn.onclick = (e) => {
          e.stopPropagation();
          item.paramInfinity = !item.paramInfinity;
          infBtn.classList.toggle("active", item.paramInfinity);
          const minInputs = tabContentParam.querySelectorAll(".vec-param-min-inp");
          const maxInputs = tabContentParam.querySelectorAll(".vec-param-max-inp");
          if (item.paramInfinity) {
            const vp = App.getViewportRange();
            slider.min = vp.min;
            slider.max = vp.max;
            minInputs.forEach((inp) => {
              inp.type = "text";
              inp.value = "-\u221e";
              inp.disabled = true;
            });
            maxInputs.forEach((inp) => {
              inp.type = "text";
              inp.value = "+\u221e";
              inp.disabled = true;
            });
          } else {
            slider.min = item.paramMin ?? -10.0;
            slider.max = item.paramMax ?? 10.0;
            minInputs.forEach((inp) => {
              inp.type = "number";
              inp.disabled = false;
              const vName = inp.dataset.var;
              inp.value = item.varRanges?.[vName]?.min ?? item.paramMin ?? -10;
            });
            maxInputs.forEach((inp) => {
              inp.type = "number";
              inp.disabled = false;
              const vName = inp.dataset.var;
              inp.value = item.varRanges?.[vName]?.max ?? item.paramMax ?? 10;
            });
          }
          item._trajMathCache2D = null;
          item._trajMathCache3D = null;
          App._renderParamStep();
        };
        secRange.appendChild(infBtn);
        tabContentParam.appendChild(secRange);

        // Phân khu: CHUYỂN ĐỘNG
        const secDur = document.createElement("div");
        secDur.className = "vec-param-section";
        const titleDur = document.createElement("div");
        titleDur.className = "vec-param-sec-title";
        titleDur.textContent = "CHUYỂN ĐỘNG";
        secDur.appendChild(titleDur);

        const durRow = document.createElement("div");
        durRow.className = "vec-param-dur-row";
        const durLabel = document.createElement("span");
        durLabel.className = "vec-param-row-label";
        durLabel.textContent = "Thời lượng chu kỳ:";

        const durInputGroup = document.createElement("div");
        durInputGroup.className = "vec-param-input-group vec-param-dur-group";
        const durInp = document.createElement("input");
        durInp.type = "number";
        durInp.className = "vec-param-num-inp vec-param-dur-inp";
        durInp.value = item.duration ?? 4.0;
        durInp.min = "0.5";
        durInp.max = "60";
        durInp.step = "0.5";
        durInp.oninput = (e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v) && v > 0) item.duration = v;
        };
        const durUnit = document.createElement("span");
        durUnit.className = "vec-param-addon";
        durUnit.textContent = "giây";
        durInputGroup.appendChild(durInp);
        durInputGroup.appendChild(durUnit);

        durRow.appendChild(durLabel);
        durRow.appendChild(durInputGroup);
        secDur.appendChild(durRow);

        // Nút preset: 2s, 4s, 8s
        const presetRow = document.createElement("div");
        presetRow.className = "vec-param-preset-row";
        [2, 4, 8].forEach((sec) => {
          const pill = document.createElement("button");
          pill.type = "button";
          pill.className = "vec-param-preset-btn";
          pill.textContent = `${sec}s`;
          pill.onclick = (e) => {
            e.stopPropagation();
            item.duration = sec;
            durInp.value = sec;
          };
          presetRow.appendChild(pill);
        });
        secDur.appendChild(presetRow);
        tabContentParam.appendChild(secDur);

        // Phân khu: ĐỒNG BỘ HOẠT ẢNH TOÀN CỤC (Master Parameter Synchronization)
        const secMaster = document.createElement("div");
        secMaster.className = "vec-param-section vec-param-master-section";

        const titleMaster = document.createElement("div");
        titleMaster.className = "vec-param-sec-title";
        titleMaster.textContent = "ĐỒNG BỘ HOẠT ẢNH TOÀN CỤC";
        secMaster.appendChild(titleMaster);

        // Hàng chọn chế độ đồng bộ: Độc lập | Đồng bộ | Cùng tên
        const modeRow = document.createElement("div");
        modeRow.className = "vec-pop-master-mode-row";

        const currentMode = (window.App && App.MasterParamController) ? App.MasterParamController.syncMode : "offset";

        const modes = [
          { id: "offset", label: "Độc lập", desc: "Giữ vị trí và dải chạy riêng của từng tham số" },
          { id: "lockstep", label: "Đồng bộ", desc: "Toàn bộ tham số cùng tăng giảm đồng nhịp theo chu kỳ chuẩn" },
          { id: "link_names", label: "Cùng tên", desc: "Các biến cùng ký hiệu (như t, m) sẽ nhận chung một giá trị" }
        ];

        const modeChips = [];
        const descEl = document.createElement("div");
        descEl.className = "vec-pop-master-desc";

        function updateMasterDesc(mode) {
          const m = modes.find((x) => x.id === mode);
          descEl.textContent = m ? m.desc : "";
        }

        modes.forEach((m) => {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "vec-pop-master-chip" + (currentMode === m.id ? " active" : "");
          chip.dataset.mode = m.id;
          chip.textContent = m.label;
          chip.title = m.desc;
          chip.onclick = (e) => {
            e.stopPropagation();
            if (window.App && App.MasterParamController) {
              App.MasterParamController.setSyncMode(m.id);
            }
            modeChips.forEach((c) => c.classList.toggle("active", c.dataset.mode === m.id));
            updateMasterDesc(m.id);
          };
          modeChips.push(chip);
          modeRow.appendChild(chip);
        });

        secMaster.appendChild(modeRow);
        updateMasterDesc(currentMode);
        secMaster.appendChild(descEl);

        // Hàng nút hành động: [▶ Chạy tất cả] [↺ Đặt lại tất cả]
        const actionRow = document.createElement("div");
        actionRow.className = "vec-pop-master-actions";

        const btnPlayAll = document.createElement("button");
        btnPlayAll.type = "button";
        btnPlayAll.className = "vec-pop-master-btn vec-pop-master-play" + ((window.App?.MasterParamController?.isPlaying) ? " is-active" : "");
        const isMasterPlaying = !!(window.App?.MasterParamController?.isPlaying);
        btnPlayAll.innerHTML = isMasterPlaying
          ? '<i class="ph ph-pause"></i> <span>Tạm dừng tất cả</span>'
          : '<i class="ph ph-play"></i> <span>Chạy tất cả</span>';
        btnPlayAll.onclick = (e) => {
          e.stopPropagation();
          if (window.App && App.MasterParamController) {
            App.MasterParamController.togglePlayAll();
          }
        };

        const btnResetAll = document.createElement("button");
        btnResetAll.type = "button";
        btnResetAll.className = "vec-pop-master-btn vec-pop-master-reset";
        btnResetAll.innerHTML = '<i class="ph ph-arrow-counter-clockwise"></i> <span>Đặt lại tất cả</span>';
        btnResetAll.onclick = (e) => {
          e.stopPropagation();
          if (window.App && App.MasterParamController) {
            App.MasterParamController.resetAll();
          }
        };

        actionRow.appendChild(btnPlayAll);
        actionRow.appendChild(btnResetAll);
        secMaster.appendChild(actionRow);

        tabContentParam.appendChild(secMaster);

        popover.appendChild(tabContentParam);

        // 3. KHUNG NỘI DUNG TAB 2: HIỂN THỊ VÀ ĐỒ HỌA
        const tabContentDisplay = document.createElement("div");
        tabContentDisplay.className = "vec-pop-tab-content";
        tabContentDisplay.style.display = "none";

        // Phân khu: ĐỐI TƯỢNG HIỂN THỊ
        const secDisplay = document.createElement("div");
        secDisplay.className = "vec-param-section";
        const titleDisplay = document.createElement("div");
        titleDisplay.className = "vec-param-sec-title";
        titleDisplay.textContent = "ĐỐI TƯỢNG HIỂN THỊ";
        secDisplay.appendChild(titleDisplay);

        // Checkbox: Thân vector mũi tên
        const arrowLabel = document.createElement("label");
        arrowLabel.className = "vec-param-trace-label";
        const arrowInput = document.createElement("input");
        arrowInput.type = "checkbox";
        arrowInput.id = `vecParamArrowInp_${item.id}`;
        arrowInput.checked = item.showArrow !== false;
        arrowInput.onchange = (e) => {
          item.showArrow = e.target.checked;
          if (item.showArrow && item.visible === false) item.visible = true;
          updateVectorToggleBtn();
          if (App.mode === "3D" && window.Vec3D) {
            Vec3D.draw3DAllVectors({ frame: false });
            if (Vec3D._renderer && Vec3D._scene && Vec3D._camera) {
              Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            }
          } else if (window.Vec2D && Vec2D.draw2DAllVectors) {
            Vec2D.draw2DAllVectors();
          }
        };
        const arrowText = document.createElement("span");
        arrowText.textContent = "Hiện thân vector mũi tên";
        arrowLabel.appendChild(arrowInput);
        arrowLabel.appendChild(arrowText);
        secDisplay.appendChild(arrowLabel);

        // Checkbox: Vệt quỹ đạo đường cong
        const traceLabel = document.createElement("label");
        traceLabel.className = "vec-param-trace-label";
        traceLabel.style.marginTop = "6px";
        const traceInput = document.createElement("input");
        traceInput.type = "checkbox";
        traceInput.id = `vecParamTraceInp_${item.id}`;
        traceInput.checked = item.showTrajectory !== false;
        traceInput.onchange = (e) => {
          item.showTrajectory = e.target.checked;
          if (item.showTrajectory && item.visible === false) item.visible = true;
          updateVectorToggleBtn();
          if (App.mode === "3D" && window.Vec3D) {
            Vec3D.draw3DAllVectors({ frame: false });
            if (Vec3D._renderer && Vec3D._scene && Vec3D._camera) {
              Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            }
          } else if (window.Vec2D && Vec2D.draw2DAllVectors) {
            Vec2D.draw2DAllVectors();
          }
        };
        const traceText = document.createElement("span");
        traceText.textContent = "Hiện vệt quỹ đạo đường cong";
        traceLabel.appendChild(traceInput);
        traceLabel.appendChild(traceText);
        secDisplay.appendChild(traceLabel);

        // Checkbox: Đường gióng tọa độ trực giao (2D: Ox, Oy | 3D: Ox, Oy, Oz)
        const projLabel = document.createElement("label");
        projLabel.className = "vec-param-trace-label";
        projLabel.style.marginTop = "6px";
        const projInput = document.createElement("input");
        projInput.type = "checkbox";
        projInput.id = `vecParamProjInp_${item.id}`;
        projInput.checked = item.showProjection !== false;
        projInput.onchange = (e) => {
          item.showProjection = e.target.checked;
          if (App.mode === "3D" && window.Vec3D) {
            Vec3D.draw3DAllVectors({ frame: false });
            if (Vec3D._renderer && Vec3D._scene && Vec3D._camera) {
              Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
            }
          } else if (window.Vec2D && Vec2D.draw2DAllVectors) {
            Vec2D.draw2DAllVectors();
          }
        };
        const projText = document.createElement("span");
        projText.textContent = App.mode === "3D" ? "Hiện 3 đường gióng tọa độ (Ox, Oy, Oz)" : "Hiện 2 đường gióng tọa độ (Ox, Oy)";
        projLabel.appendChild(projInput);
        projLabel.appendChild(projText);
        secDisplay.appendChild(projLabel);

        // Nếu vector đa biến: Tùy chọn diện tích / thể tích quét và độ mờ
        if (item.vars && item.vars.length >= 2) {
          const areaLabel = document.createElement("label");
          areaLabel.className = "vec-param-trace-label";
          areaLabel.style.marginTop = "6px";
          const areaInput = document.createElement("input");
          areaInput.type = "checkbox";
          areaInput.id = `vecParamAreaInp_${item.id}`;
          areaInput.checked = !!item.showAreaFill;
          areaInput.onchange = (e) => {
            item.showAreaFill = e.target.checked;
            if (App.mode === "3D" && window.Vec3D) {
              Vec3D.draw3DAllVectors({ frame: false });
              if (Vec3D._renderer && Vec3D._scene && Vec3D._camera) {
                Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
              }
            } else if (window.Vec2D && Vec2D.draw2DAllVectors) {
              Vec2D.draw2DAllVectors();
            }
          };
          const areaText = document.createElement("span");
          areaText.textContent = item.vars.length >= 3 ? "Hiện thể tích quét không gian" : "Hiện diện tích quét mặt phẳng";
          areaLabel.appendChild(areaInput);
          areaLabel.appendChild(areaText);
          secDisplay.appendChild(areaLabel);

          // Nhập số nguyên dương tùy chỉnh Độ mờ (không dùng thanh trượt)
          const opGroup = document.createElement("div");
          opGroup.className = "vec-param-opacity-group";
          opGroup.style.marginTop = "8px";
          opGroup.style.display = "flex";
          opGroup.style.justifyContent = "space-between";
          opGroup.style.alignItems = "center";

          const opLabel = document.createElement("span");
          opLabel.className = "vec-param-row-label";
          opLabel.textContent = "Độ mờ miền quét:";

          const curOp = item.surfaceOpacity !== undefined ? item.surfaceOpacity : 0.45;
          const curPct = Math.round(curOp * 100);

          const opInpBox = document.createElement("div");
          opInpBox.style.display = "flex";
          opInpBox.style.alignItems = "center";
          opInpBox.style.gap = "4px";

          const opInp = document.createElement("input");
          opInp.type = "number";
          opInp.className = "vec-param-opacity-inp";
          opInp.id = `vecParamOpacityVal_${item.id}`;
          opInp.min = "0";
          opInp.max = "100";
          opInp.step = "1";
          opInp.value = curPct;

          const opPctSpan = document.createElement("span");
          opPctSpan.textContent = "%";
          opPctSpan.style.fontSize = "11px";
          opPctSpan.style.fontWeight = "600";
          opPctSpan.style.color = "var(--text-sub, #64748b)";

          opInp.oninput = (e) => {
            let intVal = parseInt(e.target.value, 10);
            if (isNaN(intVal)) return;
            if (intVal < 0) intVal = 0;
            if (intVal > 100) intVal = 100;
            item.surfaceOpacity = intVal / 100;
            App._renderParamStep();
          };

          opInpBox.appendChild(opInp);
          opInpBox.appendChild(opPctSpan);
          opGroup.appendChild(opLabel);
          opGroup.appendChild(opInpBox);
          secDisplay.appendChild(opGroup);
        }

        // Công cụ chọn màu vector & quỹ đạo
        const colorRow = document.createElement("div");
        colorRow.className = "vec-color-picker-row";

        const colorLbl = document.createElement("span");
        colorLbl.className = "vec-param-row-label";
        colorLbl.textContent = "Màu vector & quỹ đạo:";

        const colorTool = document.createElement("div");
        colorTool.className = "vec-color-picker-tool";

        const effectiveHex = App.colorToHex ? App.colorToHex(item.colorCss || item.colorHex) : (item.colorHex || "#0090ff");

        const popColorInp = document.createElement("input");
        popColorInp.type = "color";
        popColorInp.className = "vec-color-input-native";
        popColorInp.id = `vecPopColorInp_${item.id}`;
        popColorInp.value = effectiveHex;

        const popColorHex = document.createElement("span");
        popColorHex.className = "vec-color-hex-text";
        popColorHex.id = `vecPopColorHex_${item.id}`;
        popColorHex.textContent = effectiveHex.toUpperCase();

        popColorInp.oninput = (e) => {
          const hex = e.target.value;
          popColorHex.textContent = hex.toUpperCase();
          if (typeof App.setVectorColor === "function") {
            App.setVectorColor(item.id, hex);
          }
        };

        colorTool.appendChild(popColorInp);
        colorTool.appendChild(popColorHex);
        colorRow.appendChild(colorLbl);
        colorRow.appendChild(colorTool);
        secDisplay.appendChild(colorRow);

        // Công cụ chọn màu riêng cho miền tô diện tích / thể tích
        if (item.vars && item.vars.length >= 2) {
          const sColorRow = document.createElement("div");
          sColorRow.className = "vec-color-picker-row";
          sColorRow.style.marginTop = "6px";

          const sColorLbl = document.createElement("span");
          sColorLbl.className = "vec-param-row-label";
          sColorLbl.textContent = "Màu miền quét:";

          const sColorTool = document.createElement("div");
          sColorTool.className = "vec-color-picker-tool";

          if (!item.surfaceColor) {
            item.surfaceColor = effectiveHex;
          }
          const effectiveSurfaceHex = item.surfaceColor;

          const popSurfaceColorInp = document.createElement("input");
          popSurfaceColorInp.type = "color";
          popSurfaceColorInp.className = "vec-color-input-native";
          popSurfaceColorInp.id = `vecPopSurfaceColorInp_${item.id}`;
          popSurfaceColorInp.value = effectiveSurfaceHex;

          const popSurfaceHex = document.createElement("span");
          popSurfaceHex.className = "vec-color-hex-text";
          popSurfaceHex.id = `vecPopSurfaceHex_${item.id}`;
          popSurfaceHex.textContent = effectiveSurfaceHex.toUpperCase();

          popSurfaceColorInp.oninput = (e) => {
            const hex = e.target.value;
            item.surfaceColor = hex;
            popSurfaceHex.textContent = hex.toUpperCase();
            App._renderParamStep();
          };

          sColorTool.appendChild(popSurfaceColorInp);
          sColorTool.appendChild(popSurfaceHex);
          sColorRow.appendChild(sColorLbl);
          sColorRow.appendChild(sColorTool);
          secDisplay.appendChild(sColorRow);
        }

        tabContentDisplay.appendChild(secDisplay);
        popover.appendChild(tabContentDisplay);

        // Sự kiện chuyển Tab
        tabBtnParam.onclick = (e) => {
          e.stopPropagation();
          tabBtnParam.classList.add("active");
          tabBtnDisplay.classList.remove("active");
          tabContentParam.style.display = "flex";
          tabContentDisplay.style.display = "none";
        };

        tabBtnDisplay.onclick = (e) => {
          e.stopPropagation();
          tabBtnDisplay.classList.add("active");
          tabBtnParam.classList.remove("active");
          tabContentDisplay.style.display = "flex";
          tabContentParam.style.display = "none";
        };

        // Bấm nút 3 chấm để bật/tắt Popover cài đặt nâng cao
        moreBtn.onclick = (e) => {
          e.stopPropagation();
          const isOpen = popover.style.display === "block";
          document.querySelectorAll(".vec-param-popover").forEach((p) => (p.style.display = "none"));
          if (!isOpen) {
            if (popover.parentElement !== document.body) {
              document.body.appendChild(popover);
            }
            popover.style.display = "block";
            popover.dataset.triggerId = moreBtn.id;

            const updatePos = () => {
              const btnRect = moreBtn.getBoundingClientRect();
              const popWidth = 275;
              let left = btnRect.right - popWidth;
              if (left < 10) left = 10;
              if (left + popWidth > window.innerWidth - 10) left = window.innerWidth - popWidth - 10;
              const popHeight = popover.offsetHeight || 230;
              const spaceBelow = window.innerHeight - btnRect.bottom;
              const spaceAbove = btnRect.top;
              let top;
              if (spaceBelow < popHeight + 10 && spaceAbove > spaceBelow) {
                top = btnRect.top - popHeight - 4;
              } else {
                top = btnRect.bottom + 4;
              }
              popover.style.position = "fixed";
              popover.style.left = `${left}px`;
              popover.style.top = `${top}px`;
              popover.style.zIndex = "999999";
            };
            requestAnimationFrame(updatePos);
          }
        };

        paramCtrl.appendChild(popover);
        li.appendChild(paramCtrl);
      }

      // Bộ đóng thông minh khi click ra vùng ngoài và bám theo vị trí khi cuộn (Tuyệt đối không đóng khi hover)
      if (!window._paramPopoverRadarAttached) {
        window._paramPopoverRadarAttached = true;
        document.addEventListener("click", (e) => {
          if (!e.target.closest(".vec-param-popover") && !e.target.closest(".vec-param-more-btn")) {
            document.querySelectorAll(".vec-param-popover").forEach((p) => (p.style.display = "none"));
          }
        });
        window.addEventListener("scroll", () => {
          const openPop = document.querySelector('.vec-param-popover[style*="display: block"]');
          if (!openPop || !openPop.dataset.triggerId) return;
          const trig = document.getElementById(openPop.dataset.triggerId);
          if (!trig) {
            openPop.style.display = "none";
            return;
          }
          const btnRect = trig.getBoundingClientRect();
          const popWidth = 275;
          let left = btnRect.right - popWidth;
          if (left < 10) left = 10;
          if (left + popWidth > window.innerWidth - 10) left = window.innerWidth - popWidth - 10;
          const popHeight = openPop.offsetHeight || 230;
          const spaceBelow = window.innerHeight - btnRect.bottom;
          const spaceAbove = btnRect.top;
          let top;
          if (spaceBelow < popHeight + 10 && spaceAbove > spaceBelow) {
            top = btnRect.top - popHeight - 4;
          } else {
            top = btnRect.bottom + 4;
          }
          openPop.style.left = `${left}px`;
          openPop.style.top = `${top}px`;
        }, { capture: true, passive: true });
        window._paramPopoverRadarAttached = true;
      }

      el.appendChild(li);
    }
    requestAnimationFrame(() => {
        if (isAppend) {
            el.scrollTop = el.scrollHeight;
        } else {
            el.scrollTop = currentScroll;
        }
    });

    if (typeof App.refreshTransformTab === "function") {
      App.refreshTransformTab();
    }
    if (typeof App.updateObjectCountBadges === "function") {
      App.updateObjectCountBadges();
    }
  };

  // Quản lý tập hợp ID các vector đang được chọn
  App.selectedVectorIds = App.selectedVectorIds || new Set();

  App.updateObjectCountBadges = function () {
    const vBadge = document.getElementById("vecCountBadge");
    const mBadge = document.getElementById("matCountBadge");
    if (vBadge) vBadge.textContent = `(${App.vectorList ? App.vectorList.length : 0})`;
    if (mBadge) mBadge.textContent = `(${App.matrixList ? App.matrixList.length : 0})`;
  };

  App.syncSelectedVectorsToCalc = function () {
    // Không còn sử dụng dock thao tác ngữ cảnh
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
        if (window.App?.OperationAnimator?.stop) {
          window.App.OperationAnimator.stop({ clearStaticOverlays: true, skipRedraw: true });
        }
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

      const exprLatex = (it.isParametric && it.rawExprs && it.rawExprs.length)
        ? `[${it.rawExprs.map((e) => (App.exprToLatex ? App.exprToLatex(e) : e)).join(", ")}]`
        : (it.latex || App.formatVectorShort(it.vec));
      let renderedChecklistMath = exprLatex;
      if (window.katex && typeof window.katex.renderToString === "function") {
        try {
          renderedChecklistMath = window.katex.renderToString(exprLatex, { throwOnError: false, displayMode: false });
        } catch (_) {
          renderedChecklistMath = exprLatex;
        }
      }

      // Cấu trúc phẳng 1 hàng: checkbox -> màu -> tag -> math static
      row.innerHTML = `
          <input type="checkbox" id="chk_${name}_${it.id}" value="${it.id}" style="width: 16px; height: 16px; cursor: pointer; accent-color: var(--primary-base); margin: 0; flex-shrink: 0; pointer-events: none;">
          <div class="sw" style="background: ${it.colorCss}; width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0;"></div>
          <span class="tag" style="font-size: 11px; font-weight: 700; color: var(--muted); background: var(--chip-bg); border: 1px solid var(--border); padding: 1px 6px; border-radius: 2px; flex-shrink: 0;">#${App.displayIndexOf(it)}</span>
          <div class="vec-input-wrapper" style="flex: 1; min-width: 0; pointer-events: none; border: none !important; background: transparent !important; padding: 0;">
              <div class="vec-math-field" style="background: transparent; border: none; width: 100%; display: flex; align-items: center; min-height: 22px;">
                  ${renderedChecklistMath}
              </div>
          </div>
      `;

      const cb = row.querySelector("input[type='checkbox']");

      cb.addEventListener("change", () => {
        if (name === "basis") {
          App._lastBasisAnimData = null;
          if (typeof App.stopBasisAnimation === "function" && window.App?.BasisAnimator?.isActive?.()) {
            try { App.stopBasisAnimation(); } catch (_) {}
          }
        } else if (name === "coord") {
          App._lastCoordAnimData = null;
          if (typeof App.stopCoordAnimation === "function" && window.App?.CoordAnimator?.isActive?.()) {
            try { App.stopCoordAnimation(); } catch (_) {}
          }
        } else if (name === "indep") {
          App._lastIndepAnimData = null;
          if (typeof App.stopIndepAnimation === "function" && window.App?.IndepAnimator?.isActive?.()) {
            try { App.stopIndepAnimation(); } catch (_) {}
          }
        } else if (name === "rank") {
          App._lastRankAnimData = null;
          if (typeof App.stopRankAnimation === "function" && window.App?.RankAnimator?.isActive?.()) {
            try { App.stopRankAnimation(); } catch (_) {}
          }
        } else if (name === "gs") {
          App._lastGSAnimData = null;
          if (typeof App.stopGSAnimation === "function" && window.App?.GSAnimator?.isActive?.()) {
            try { App.stopGSAnimation(); } catch (_) {}
          }
        }
      });

      // Click vào dòng tự tick checkbox
      row.onclick = (e) => {
        if (e.target === cb) return;
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event("change", { bubbles: true }));
      };

      listDiv.appendChild(row);

      let textVal = "";
      if (it.latex) textVal += " " + it.latex;
      if (Array.isArray(it.vec)) {
        textVal += " [" + it.vec.join(",") + "] [" + it.vec.join(", ") + "] " + it.vec.join(" ") + " " + it.vec.join(",");
      }
      if (typeof App.formatVectorShort === "function") textVal += " " + App.formatVectorShort(it.vec);
      textVal += " " + exprLatex;

      items.push({
        row: row,
        cb: cb,
        text: textVal.toLowerCase().replace(/\s+/g, ""),
        idStr: `#${App.displayIndexOf(it)}`.toLowerCase(),
        dim: is3D ? "3d" : "2d"
      });
    });

    container.appendChild(listDiv);

    // --- 3. LÕI LỌC DỮ LIỆU ---
    let currentFilter = "all";
    const applyFilters = () => {
      const term = searchInp.value.trim().toLowerCase().replace(/\s+/g, "");
      items.forEach((item) => {
        const matchSearch = !term || item.text.includes(term) || item.idStr.includes(term);
        const matchDim = currentFilter === "all" || currentFilter === item.dim;
        const visible = matchSearch && matchDim;
        item.row.classList.toggle("is-hidden", !visible);
        item.row.style.setProperty("display", visible ? "flex" : "none", "important");
      });
      cbAll.checked = false; // Bỏ tick select all khi lọc
    };

    searchInp.addEventListener("input", applyFilters);

    const filterBtns = filterDiv.querySelectorAll('.filter-chip');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentFilter = btn.dataset.filter || "all";
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
    const gsChecklist = document.getElementById("gsChecklist");
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
    makeChecklist(gsChecklist, "gs");
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
              // Cập nhật giá trị mới (ưu tiên biểu thức tham số nếu có)
              mf.value = (it.isParametric && it.rawExprs && it.rawExprs.length)
                ? `[${it.rawExprs.map((e) => (App.exprToLatex ? App.exprToLatex(e) : e)).join(", ")}]`
                : (it.latex || App.formatVectorShort(it.vec));
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
    syncChecklistText("gs"); // Trực giao hóa Gram - Schmidt
  };

  App.showExtraForm = function (op) {
    if (typeof App.stopAllAnimations === "function") {
      try { App.stopAllAnimations(op); } catch (_) {}
    }
    if (op !== "basis") {
      if (typeof App.stopBasisAnimation === "function") {
        try { App.stopBasisAnimation(); } catch (_) {}
      } else if (window.App?.BasisAnimator?.isActive?.()) {
        try { window.App.BasisAnimator.stop(); } catch (_) {}
      }
      const c = document.getElementById("basisAnimControls");
      if (c) c.style.display = "none";
    }
    if (op !== "coordinates") {
      if (typeof App.stopCoordAnimation === "function") {
        try { App.stopCoordAnimation(); } catch (_) {}
      } else if (window.App?.CoordAnimator?.isActive?.()) {
        try { window.App.CoordAnimator.stop(); } catch (_) {}
      }
      const c = document.getElementById("coordAnimControls");
      if (c) c.style.display = "none";
    }
    if (op !== "linear_independence") {
      if (typeof App.stopIndepAnimation === "function") {
        try { App.stopIndepAnimation(); } catch (_) {}
      } else if (window.App?.IndepAnimator?.isActive?.()) {
        try { window.App.IndepAnimator.stop(); } catch (_) {}
      }
      const c = document.getElementById("indepAnimControls");
      if (c) c.style.display = "none";
    }
    if (op !== "rank") {
      if (typeof App.stopRankAnimation === "function") {
        try { App.stopRankAnimation(); } catch (_) {}
      } else if (window.App?.RankAnimator?.isActive?.()) {
        try { window.App.RankAnimator.stop(); } catch (_) {}
      }
      const c = document.getElementById("rankAnimControls");
      if (c) c.style.display = "none";
    }
    if (op !== "topic4_gram_schmidt") {
      if (typeof App.stopGSAnimation === "function") {
        try { App.stopGSAnimation(); } catch (_) {}
      } else if (window.App?.GSAnimator?.isActive?.()) {
        try { window.App.GSAnimator.stop(); } catch (_) {}
      }
      const c = document.getElementById("gsAnimControls");
      if (c) c.style.display = "none";
    }
    if (op !== "topic5_linear_transformation") {
      if (typeof App.stopLTAnimation === "function") {
        try { App.stopLTAnimation(); } catch (_) {}
      } else if (window.App?.LTAnimator?.isActive?.()) {
        try { window.App.LTAnimator.stop(); } catch (_) {}
      }
      const c = document.getElementById("ltAnimControls");
      if (c) c.style.display = "none";
    }
    if (op !== "topic6_eigen") {
      if (typeof App.stopEigenAnimation === "function") {
        try { App.stopEigenAnimation(); } catch (_) {}
      } else if (window.App?.EigenAnimator?.isActive?.()) {
        try { window.App.EigenAnimator.stop(); } catch (_) {}
      }
      const ec = document.getElementById("eigenAnimControls");
      if (ec) ec.style.display = "none";
    }
    if (op !== "quadratic_form_conic") {
      if (typeof App.stopConicAnimation === "function") {
        try { App.stopConicAnimation(); } catch (_) {}
      } else if (window.App?.ConicAnimator?.isActive?.()) {
        try { window.App.ConicAnimator.stop(); } catch (_) {}
      }
      const c = document.getElementById("conicAnimControls");
      if (c) c.style.display = "none";
    }
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

    // Cho phép nếu Nori đang được chọn làm thực thể tọa độ mục tiêu hoặc Nori đang bật
    const mixedVecSel = document.getElementById("mixedVectorSelect");
    if (mixedVecSel && mixedVecSel.value === "nori_entity") return true;
    if (App.noriEntityActive) return true;

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
    const isNoriTarget = (document.getElementById("mixedVectorSelect")?.value === "nori_entity") || !!App.noriEntityActive;
    for (let btn of buttons) {
      if (btn.closest && (btn.closest("#solutionOverlay") || btn.closest(".res-card"))) continue;
      if (btn.textContent.trim() === "Xem trước") btn.remove();

      // Kiểm tra xem nút có thuộc form ma trận hay không
      const isMatrixScoped =
        btn.dataset.requireVectors === "false" ||
        btn.id === "btnMatrixCompute" ||
        btn.id === "btnMatrixCalcSolution" ||
        btn.id === "btnMixedCompute" ||
        btn.id === "btnMixedCalcSolution" ||
        btn.id === "btnMixedComputeAndTransform" ||
        btn.id === "btnEigenCompute" ||
        btn.id === "btnEigenAnimate" ||
        btn.id === "btnEigenSolution" ||
        btn.id === "btnLTInspect" ||
        btn.id === "btnLTAnimate" ||
        btn.id === "btnLTSolution" ||
        btn.id === "btnConicDraw" ||
        btn.id === "btnConicAnimate" ||
        btn.id === "btnConicSolution" ||
        (btn.closest && (
          btn.closest("#calcMatrixPanel") ||
          btn.closest("#form-topic5_linear_transformation") ||
          btn.closest("#form-topic6_eigen") ||
          btn.closest("#form-quadratic_form_conic") ||
          (btn.closest("#calcMixedPanel") && isNoriTarget)
        ));

      if (isMatrixScoped) continue;

      // 2. Gắn chốt chặn cho các nút tính toán vector
      const vectorKeywords = [
        "Thực hiện",
        "Kiểm tra",
        "Tính hạng",
        "Tính cơ sở",
        "Xuất tọa độ",
        "Tính toán",
        "Trực giao hóa"
      ];
      const isVectorAnimateOrSol =
        btn.id === "btnIndepAnimate" ||
        btn.id === "btnRankAnimate" ||
        btn.id === "btnGSAnimate" ||
        btn.id === "btnBasisAnimate" ||
        btn.id === "btnCoordAnimate" ||
        btn.id === "btnIndepSolution" ||
        btn.id === "btnRankSolution" ||
        btn.id === "btnGSSolution" ||
        btn.id === "btnVectorCalcSolution";

      const btnText = btn.textContent.trim();
      const needsVectorGuard = vectorKeywords.some((k) => btnText.includes(k)) || isVectorAnimateOrSol;

      if (needsVectorGuard) {
        if (!btn.dataset.hasCheck) {
          btn.dataset.hasCheck = "true";
          btn.addEventListener(
            "click",
            (e) => {
              if (!App.requireVectors()) {
                e.stopImmediatePropagation();
                e.preventDefault();
              }
            },
            true
          );
        }
      }
    }

    // 3. Làm đẹp kết quả (như cũ)
    const divs = document.querySelectorAll("div");
    for (let div of divs) {
      if (div.closest && (div.closest("#solutionOverlay") || div.closest(".res-card") || div.closest("#paperWrap"))) continue;
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

    const isA = gridId === "matrixCalcGridA";
    const isB = gridId === "matrixCalcGridB";
    const paramMat = isA ? App.calcParamMatrixA : (isB ? App.calcParamMatrixB : null);

    const values = [];
    const rawValues = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      const rawRow = [];
      for (let j = 0; j < cols; j++) {
        let raw = cells[i * cols + j].value;
        if (typeof raw === "string") raw = raw.trim();
        rawRow.push(raw);

        let num;
        if (paramMat && paramMat.isParametric && paramMat.values && paramMat.values[i] && paramMat.values[i][j] !== undefined) {
          num = Number(paramMat.values[i][j]);
        } else {
          num = Number(raw);
          if (!Number.isFinite(num)) {
            try {
              if (window.App && typeof App.parseVectorExpr === "function") {
                const parsed = App.parseVectorExpr(`[${raw}]`, true);
                if (parsed && Number.isFinite(Number(parsed[0]))) {
                  num = Number(parsed[0]);
                }
              }
            } catch (e) {}
          }
        }
        row.push(Number.isFinite(num) ? num : 0);
      }
      values.push(row);
      rawValues.push(rawRow);
    }
    return {
      rows,
      cols,
      values,
      rawValues,
      isParametric: !!(paramMat && paramMat.isParametric),
      paramMat: paramMat
    };
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
          const paramSuffix = m.isParametric
            ? ` f(${m.vars && m.vars.length > 1 ? m.vars.join(",") : (m.paramVar || "t")})`
            : "";
          opt.textContent = `${m.name} (${m.rows}✕${m.cols})${paramSuffix}`;
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
    if (typeof App.refreshEigenMatrixDropdown === "function") {
      App.refreshEigenMatrixDropdown();
    }
    if (typeof App.refreshLTMatrixDropdown === "function") {
      App.refreshLTMatrixDropdown();
    }
    if (typeof App.refreshConicMatrixDropdown === "function") {
      App.refreshConicMatrixDropdown();
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
          const paramSuffix = m.isParametric
            ? ` f(${m.vars && m.vars.length > 1 ? m.vars.join(",") : (m.paramVar || "t")})`
            : "";
          opt.textContent = `${m.name || "A"} (${r}✕${c})${paramSuffix}`;
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
      const is2D = (window.App && App.mode === "2D");

      if (vectors.length === 0) {
        const optEmpty = document.createElement("option");
        optEmpty.value = "";
        optEmpty.textContent = "(Chưa có vector)";
        vecSel.appendChild(optEmpty);

        if (is2D) {
          const optNori = document.createElement("option");
          optNori.value = "nori_entity";
          optNori.textContent = "Linh vật Nori";
          vecSel.appendChild(optNori);
        }

        if (prevVec === "nori_entity" && vecSel.dataset.userExplicitNori === "true" && is2D) {
          vecSel.value = "nori_entity";
        } else {
          vecSel.value = "";
        }
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
          if (v.isImageMesh) {
            opt.textContent = `Tranh Vector: ${v.name || "Ảnh mẫu"} (${(v.numTriangles || 0).toLocaleString()} tam giác)`;
          } else if (v.isParametric) {
            const expr = (v.rawExprs && Array.isArray(v.rawExprs) && v.rawExprs.length > 0)
              ? `[${v.rawExprs.join(", ")}]`
              : (v.vars && v.vars.length ? `[${v.vars.join(", ")}]` : (Array.isArray(v.vec) ? `[${v.vec.map(n => Number(n).toFixed(2)).join(", ")}]` : ""));
            opt.textContent = `${v.name || "v"} = ${expr}`;
          } else {
            const coords = Array.isArray(v.vec) ? `[${v.vec.map(n => Number(n).toFixed(2)).join(", ")}]` : "";
            opt.textContent = `${v.name || "v"} = ${coords}`;
          }
          vecSel.appendChild(opt);
        });

        // Tùy chọn thực thể Nori chỉ hiển thị khi ở chế độ 2D
        if (is2D) {
          const optNori = document.createElement("option");
          optNori.value = "nori_entity";
          optNori.textContent = "Linh vật Nori";
          vecSel.appendChild(optNori);
        }

        if (prevVec && (prevVec === "all" || (prevVec === "nori_entity" && is2D) || vectors.some((v) => String(v.id) === String(prevVec)))) {
          vecSel.value = prevVec;
        }
      }
    }

    if (typeof App.updateMixedParamController === "function") {
      App.updateMixedParamController();
    }
  };

  App.updateMixedParamController = function () {
    const container = document.getElementById("mixedMatrixParamContainer");
    const matSel = document.getElementById("mixedMatrixSelect");
    if (!container || !matSel) return;

    const matrices = Array.isArray(App.matrixList) ? App.matrixList : [];
    const item = matrices.find((m) => String(m.id) === String(matSel.value));

    if (!item || !item.isParametric) {
      container.style.display = "none";
      container.innerHTML = "";
      return;
    }

    container.style.display = "block";
    container.innerHTML = "";

    const header = document.createElement("div");
    header.className = "mixed-param-title-row";

    const title = document.createElement("span");
    title.className = "mixed-param-title";
    title.textContent = `Tham số ma trận ${item.name || "A"}:`;

    const badge = document.createElement("span");
    badge.className = "mat-param-badge";
    const vText = item.vars && item.vars.length > 1 ? item.vars.join(",") : (item.paramVar || "t");
    badge.textContent = `f(${vText})`;
    badge.title = `Ma trận phụ thuộc tham số ${item.vars ? item.vars.join(", ") : item.paramVar}`;

    header.appendChild(title);
    header.appendChild(badge);
    container.appendChild(header);

    if (typeof App.createMatrixParamController === "function") {
      const ctrl = App.createMatrixParamController(item, () => {
        const resultBox = document.getElementById("mixedResultBox");
        if (resultBox && resultBox.style.display !== "none" && typeof App.runMixedCalc === "function") {
          App.runMixedCalc(false);
        }
      });
      if (ctrl) container.appendChild(ctrl);
    }
  };

  // Bộ điều khiển tham số động cho Ma trận trong tab Phép toán ma trận
  App.updateMatrixCalcParamController = function (target = "A", sourceModel = null) {
    const isA = target === "A";
    const containerId = isA ? "matrixCalcParamContainerA" : "matrixCalcParamContainerB";
    const gridId = isA ? "matrixCalcGridA" : "matrixCalcGridB";
    const rowsId = isA ? "matrixCalcRowsA" : "matrixCalcRowsB";
    const colsId = isA ? "matrixCalcColsA" : "matrixCalcColsB";
    const propName = isA ? "calcParamMatrixA" : "calcParamMatrixB";

    const container = document.getElementById(containerId);
    if (!container) return;

    const rowsInput = document.getElementById(rowsId);
    const colsInput = document.getElementById(colsId);
    const rows = Math.max(1, Math.min(5, parseInt(rowsInput?.value) || 3));
    const cols = Math.max(1, Math.min(5, parseInt(colsInput?.value) || 3));

    const gridData = typeof App.readGridValues === "function" ? App.readGridValues(gridId, rows, cols) : null;

    if (!gridData || !gridData.isParametric) {
      if (App[propName]) {
        App[propName].isAnimating = false;
        App[propName] = null;
      }
      container.style.display = "none";
      container.innerHTML = "";
      return;
    }

    const existing = App[propName];
    const src = sourceModel || existing;
    const sameVars = existing && existing.vars && existing.vars.join(",") === gridData.vars.join(",");

    const paramData = {
      id: `calc${target}`,
      name: `Ma trận ${target}`,
      isParametric: true,
      vars: gridData.vars,
      paramVar: (src && gridData.vars.includes(src.paramVar)) ? src.paramVar : gridData.vars[0],
      scopeValues: Object.assign({}, src ? src.scopeValues : {}),
      paramVal: src ? src.paramVal : 1.0,
      initialParamVal: src ? (src.initialParamVal ?? src.paramVal ?? 1.0) : 1.0,
      paramMin: src ? (src.paramMin ?? -10.0) : -10.0,
      paramMax: src ? (src.paramMax ?? 10.0) : 10.0,
      paramInfinity: src ? !!src.paramInfinity : false,
      duration: src ? (src.duration ?? 4.0) : 4.0,
      cellParseds: gridData.cellParseds
    };

    const hue = isA ? 220 : 280;
    App[propName] = typeof App.createMatrixItem === "function"
      ? App.createMatrixItem(rows, cols, gridData.values, gridData.latexValues, hue, paramData)
      : null;

    if (!App[propName]) return;

    App[propName].values = App[propName].evalMatrix(App[propName].paramVal, App[propName].scopeValues);

    // Nếu controller đã hiển thị và các biến không đổi, chỉ cần cập nhật giá trị UI hiện tại
    if (sameVars && container.style.display === "block" && container.children.length > 0) {
      if (typeof App.updateSingleMatrixUI === "function") {
        App.updateSingleMatrixUI(App[propName]);
      }
      return;
    }

    container.style.display = "block";
    container.innerHTML = "";

    const header = document.createElement("div");
    header.className = "mixed-param-title-row";

    const title = document.createElement("span");
    title.className = "mixed-param-title";
    title.textContent = `Tham số Ma trận ${target}:`;

    const badge = document.createElement("span");
    badge.className = "mat-param-badge";
    const vText = App[propName].vars && App[propName].vars.length > 1 ? App[propName].vars.join(",") : (App[propName].paramVar || "t");
    badge.textContent = `f(${vText})`;
    badge.title = `Ma trận phụ thuộc tham số ${App[propName].vars ? App[propName].vars.join(", ") : App[propName].paramVar}`;

    header.appendChild(title);
    header.appendChild(badge);
    container.appendChild(header);

    if (typeof App.createMatrixParamController === "function") {
      const ctrl = App.createMatrixParamController(App[propName], () => {
        const resultBox = document.getElementById("matrixResultBox");
        if (resultBox && resultBox.style.display !== "none" && typeof App.runMatrixCalc === "function") {
          App.runMatrixCalc(false);
        }
      });
      if (ctrl) container.appendChild(ctrl);
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

  App.getMatrixCalcSig = function () {
    const op = document.getElementById("matrixOpSelect")?.value || "det";
    const AData = parseMatrixGridValues("matrixCalcGridA", "matrixCalcRowsA", "matrixCalcColsA");
    const BData = op === "mul_matrix"
      ? parseMatrixGridValues("matrixCalcGridB", "matrixCalcRowsB", "matrixCalcColsB")
      : null;
    const sync = window.App?.SolutionSync;
    const sigA = AData
      ? ((sync?.matrixSig ? sync.matrixSig(AData.values) : JSON.stringify(AData.values)) + ":" + JSON.stringify(AData.rawValues))
      : "none";
    const sigB = BData
      ? ((sync?.matrixSig ? sync.matrixSig(BData.values) : JSON.stringify(BData.values)) + ":" + JSON.stringify(BData.rawValues))
      : "none";
    return `matop:${op}|${sigA}|${sigB}`;
  };

  App.runMatrixCalc = function (triggerAnimation = true, opts = {}) {
    const shouldLog = opts.logHistory !== undefined ? !!opts.logHistory : !!triggerAnimation;
    const op = document.getElementById("matrixOpSelect")?.value || "det";
    const resultBox = document.getElementById("matrixResultBox");
    const calcGen = window.App?.TasksGen?.CalcOps;
    const resCard = window.App?.ResultCard;
    const sync = window.App?.SolutionSync;

    const AData = parseMatrixGridValues("matrixCalcGridA", "matrixCalcRowsA", "matrixCalcColsA");
    if (!AData) {
      const errMsg = "Vui lòng nhập đầy đủ các phần tử của ma trận \\(A\\).";
      if (resultBox && resCard) {
        resultBox.className = "";
        resultBox.style.display = "block";
        resultBox.style.padding = "0";
        resultBox.style.border = "none";
        resultBox.style.background = "transparent";
        resCard.mountError(resultBox, errMsg, "Lỗi dữ liệu ma trận");
      }
      const fallbackModal = {
        titleText: "Phép toán ma trận",
        titleMath: "A",
        content1: `<div class="sol-step-container"><div class="sol-text">${errMsg}</div></div>`,
        content2: ""
      };
      if (sync) sync.save("calc_matrix", App.getMatrixCalcSig(), fallbackModal);
      return fallbackModal;
    }

    const fmtVal = (num) => {
      const x = Number(num);
      if (!Number.isFinite(x)) return "0";
      if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
      return String(parseFloat(x.toFixed(4)));
    };

    const buildParamInfo = (matData) => {
      if (!matData || !matData.isParametric || !matData.paramMat) return null;
      const pMat = matData.paramMat;
      const paramDescLatex = (pMat.vars && pMat.vars.length > 1)
        ? Object.entries(pMat.scopeValues || {})
            .filter(([k]) => pMat.vars.includes(k))
            .map(([k, v]) => `${k} = ${fmtVal(v)}`)
            .join(",\\; ")
        : `${pMat.paramVar || "t"} = ${fmtVal(pMat.paramVal)}`;
      return {
        isParametric: true,
        rawValues: matData.rawValues,
        paramDescLatex
      };
    };

    const BData = op === "mul_matrix"
      ? parseMatrixGridValues("matrixCalcGridB", "matrixCalcRowsB", "matrixCalcColsB")
      : null;

    if (!calcGen || typeof calcGen.buildMatrixOp !== "function") return null;

    const bundle = calcGen.buildMatrixOp(op, {
      A: AData.values,
      B: BData ? BData.values : null,
      nameA: "A",
      nameB: "B",
      paramInfoA: buildParamInfo(AData),
      paramInfoB: buildParamInfo(BData)
    });

    if (resultBox && resCard) {
      resultBox.className = "";
      resultBox.style.display = "block";
      resultBox.style.padding = "0";
      resultBox.style.border = "none";
      resultBox.style.background = "transparent";
      if (bundle.isError) {
        resCard.mountError(resultBox, bundle.errorMessageHtml, bundle.errorTitle);
      } else {
        resCard.mount(resultBox, bundle.cardOptions);
      }
    }

    if (sync && bundle && bundle.modalConfig) {
      sync.save("calc_matrix", App.getMatrixCalcSig(), bundle.modalConfig);
    }

    if (shouldLog && !bundle.isError && window.App?.PaperLogger && bundle.logLatex) {
      App.PaperLogger.log(bundle.logTitle || "Phép tính ma trận", bundle.logLatex, "", bundle.modalConfig);
    }

    let animOptions = null;
    let animMatrix = null;
    let isAnimSupported = false;

    if (!bundle.isError) {
      if (op === "det" && (AData.rows === 2 || AData.rows === 3)) {
        isAnimSupported = true;
        animMatrix = AData.values;
        animOptions = { mode: "det", title: `Định thức: det = ${fmtVal(bundle.det)}` };
      } else if (op === "inv" && (AData.rows === 2 || AData.rows === 3)) {
        if (!bundle.invertible) {
          isAnimSupported = true;
          animMatrix = AData.values;
          animOptions = { mode: "rank", rank: bundle.rank, title: "Suy biến: det = 0 (Không khả nghịch)" };
        } else if (bundle.invMatrix) {
          isAnimSupported = true;
          animMatrix = bundle.invMatrix;
          animOptions = {
            mode: "inv",
            originalMatrix: AData.values,
            invMatrix: bundle.invMatrix,
            title: "Ma trận Nghịch đảo A⁻¹"
          };
        }
      } else if (op === "rank") {
        if ((AData.rows === 2 && AData.cols === 2) || (AData.rows === 3 && AData.cols === 3)) {
          isAnimSupported = true;
          animMatrix = AData.values;
          animOptions = {
            mode: "rank",
            rank: bundle.rank,
            nullity: bundle.nullity,
            originalMatrix: AData.values,
            title: `Hạng Ma trận: Rank = ${bundle.rank}/${AData.cols}`
          };
        }
      } else if (op === "transpose" && bundle.transposeMatrix) {
        if ((AData.rows === 2 && AData.cols === 2) || (AData.rows === 3 && AData.cols === 3)) {
          isAnimSupported = true;
          animMatrix = bundle.transposeMatrix;
          animOptions = {
            mode: "transpose",
            originalMatrix: AData.values,
            transposeMatrix: bundle.transposeMatrix,
            title: "Ma trận Chuyển vị Aᵀ"
          };
        } else if (AData.rows === 2 && AData.cols === 3) {
          isAnimSupported = true;
          animMatrix = bundle.transposeMatrix;
          animOptions = {
            mode: "embed_2d_to_3d",
            originalMatrix: AData.values,
            title: "Chuyển vị Aᵀ: Nhúng mặt phẳng 2D vào không gian 3D"
          };
        } else if (AData.rows === 3 && AData.cols === 2) {
          isAnimSupported = true;
          animMatrix = bundle.transposeMatrix;
          animOptions = {
            mode: "project_3d_to_2d",
            originalMatrix: AData.values,
            title: "Chuyển vị Aᵀ: Chiếu không gian 3D xuống mặt phẳng 2D"
          };
        }
      } else if (op === "mul_matrix" && BData && bundle.productMatrix) {
        if (
          (AData.rows === 2 && AData.cols === 2 && BData.rows === 2 && BData.cols === 2) ||
          (AData.rows === 3 && AData.cols === 3 && BData.rows === 3 && BData.cols === 3)
        ) {
          isAnimSupported = true;
          animMatrix = bundle.productMatrix;
          animOptions = {
            mode: "compound",
            matrix1: BData.values,
            matrix2: bundle.productMatrix,
            title: "A ✕ B (Biến đổi liên hoàn)"
          };
        } else if (AData.rows === 2 && AData.cols === 3 && BData.rows === 3 && BData.cols === 2) {
          isAnimSupported = true;
          animMatrix = bundle.productMatrix;
          animOptions = {
            mode: "cross_compound_2d_3d_2d",
            matrixB: BData.values,
            matrixA: AData.values,
            matrixC: bundle.productMatrix,
            resultC: bundle.productMatrix,
            title: "A(2✕3) ✕ B(3✕2): Nhúng 2D lên 3D rồi chiếu về 2D"
          };
        } else if (AData.rows === 3 && AData.cols === 2 && BData.rows === 2 && BData.cols === 3) {
          isAnimSupported = true;
          animMatrix = bundle.productMatrix;
          animOptions = {
            mode: "cross_compound_3d_2d_3d",
            matrixB: BData.values,
            matrixA: AData.values,
            matrixC: bundle.productMatrix,
            resultC: bundle.productMatrix,
            title: "A(3✕2) ✕ B(2✕3): Nén 3D xuống 2D rồi nâng lên mặt phẳng nghiêng"
          };
        }
      }
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
    } else if (triggerAnimation) {
      if (btnMatrixReplay) btnMatrixReplay.style.display = "none";
      if (playbackHUD) playbackHUD.style.display = "none";
      if (!bundle.isError && !isAnimSupported && window.App?.showToast) {
        App.showToast(`Phép tính ma trận hiện tại chỉ hỗ trợ hiển thị số học, không trực quan hóa động trong không gian 2D/3D.`, "info");
      }
    }

    return bundle ? bundle.modalConfig : null;
  };

  // Hoạt cảnh biến đổi hình học Nori mượt mà - Độc lập 100% không tạo vector cơ sở hay khung hộp
  App.animateNoriTransform = function (targetMatrix, duration = 850) {
    if (App._noriAnimFrame) {
      cancelAnimationFrame(App._noriAnimFrame);
      App._noriAnimFrame = null;
    }
    const is3D = targetMatrix.length >= 3 && targetMatrix[0].length >= 3;
    const dim = is3D ? 3 : 2;
    const startMatrix = App.activeNoriTransformMatrix || (dim === 3 ? [[1, 0, 0], [0, 1, 0], [0, 0, 1]] : [[1, 0], [0, 1]]);

    const startTime = performance.now();
    function easeOutCubic(x) {
      return 1 - Math.pow(1 - x, 3);
    }

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = easeOutCubic(progress);

      const curM = [];
      for (let r = 0; r < dim; r++) {
        curM[r] = [];
        for (let c = 0; c < dim; c++) {
          const sVal = (startMatrix[r] && startMatrix[r][c] !== undefined) ? Number(startMatrix[r][c]) : (r === c ? 1 : 0);
          const tVal = (targetMatrix[r] && targetMatrix[r][c] !== undefined) ? Number(targetMatrix[r][c]) : (r === c ? 1 : 0);
          curM[r][c] = sVal + (tVal - sVal) * ease;
        }
      }

      App.activeNoriTransformMatrix = curM;

      if (window.Vec2D?.draw2DAllVectors) {
        Vec2D.draw2DAllVectors();
      }

      if (progress < 1) {
        App._noriAnimFrame = requestAnimationFrame(step);
      } else {
        App._noriAnimFrame = null;
        App.activeNoriTransformMatrix = targetMatrix;
        if (window.Vec2D?.draw2DAllVectors) {
          Vec2D.draw2DAllVectors();
        }
      }
    }

    App._noriAnimFrame = requestAnimationFrame(step);
  };

  App.getMixedCalcSig = function () {
    const matSel = document.getElementById("mixedMatrixSelect");
    const vecSel = document.getElementById("mixedVectorSelect");
    const sync = window.App?.SolutionSync;

    const matVal = matSel ? String(matSel.value || "") : "";
    const mObj = (App.matrixList || []).find((m) => String(m.id) === matVal) || null;
    const matSig = mObj
      ? `${matVal}:${mObj.name || "A"}:${sync?.matrixSig ? sync.matrixSig(mObj.values) : JSON.stringify(mObj.values)}`
      : `none:${matVal}`;

    const vecVal = vecSel ? String(vecSel.value || "") : "";
    let vecSig = `none:${vecVal}`;
    if (vecVal === "all") {
      vecSig = "all:" + (sync?.vectorItemsSig ? sync.vectorItemsSig(App.vectorList || []) : String((App.vectorList || []).length));
    } else if (vecVal === "nori_entity") {
      vecSig = "nori_entity";
    } else if (vecVal) {
      const vObj = (App.vectorList || []).find((v) => String(v.id) === vecVal) || null;
      if (vObj && vObj.isImageMesh) {
        vecSig = `mesh:${vObj.id}:${(vObj.baseWorldPoints || vObj.worldPoints || []).length}`;
      } else if (vObj) {
        vecSig = "vec:" + (sync?.vectorItemsSig ? sync.vectorItemsSig([vObj]) : JSON.stringify(vObj.vec));
      }
    }
    return `mixedop:${matSig}|${vecSig}`;
  };

  App.runMixedCalc = function (triggerAnimation = true, opts = {}) {
    const skipSceneMutate = !!opts.skipSceneMutate;
    const shouldLog = opts.logHistory !== undefined ? !!opts.logHistory : !!triggerAnimation;
    const resultBox = document.getElementById("mixedResultBox");
    const matSel = document.getElementById("mixedMatrixSelect");
    const vecSel = document.getElementById("mixedVectorSelect");
    const calcGen = window.App?.TasksGen?.CalcOps;
    const resCard = window.App?.ResultCard;
    const sync = window.App?.SolutionSync;

    const mountMixedBundle = (bundle) => {
      if (!resultBox || !resCard || !bundle) return;
      resultBox.className = "";
      resultBox.style.display = "block";
      resultBox.style.padding = "0";
      resultBox.style.border = "none";
      resultBox.style.background = "transparent";
      if (bundle.isError) {
        resCard.mountError(resultBox, bundle.errorMessageHtml, bundle.errorTitle);
      } else {
        resCard.mount(resultBox, bundle.cardOptions);
      }
    };

    if (!matSel || !matSel.value) {
      if (!opts.silentToast && window.App?.showToast) {
        App.showToast("Chưa chọn ma trận. Hãy tạo ma trận ở tab Khởi tạo trước.", "warning");
      }
      const errBundle = calcGen?.buildMixedOp
        ? calcGen.buildMixedOp({ mode: "single", A: [], matrixName: "A", targetVectors: [] })
        : null;
      if (skipSceneMutate && errBundle) mountMixedBundle(errBundle);
      if (sync && errBundle?.modalConfig) sync.save("calc_mixed", App.getMixedCalcSig(), errBundle.modalConfig);
      return errBundle ? errBundle.modalConfig : null;
    }

    const mObj = (App.matrixList || []).find((m) => String(m.id) === String(matSel.value));
    if (!mObj || !Array.isArray(mObj.values) || mObj.values.length === 0) {
      if (!opts.silentToast && window.App?.showToast) {
        App.showToast("Ma trận đã chọn không hợp lệ.", "error");
      }
      const errBundle = calcGen?.buildMixedOp
        ? calcGen.buildMixedOp({ mode: "single", A: [], matrixName: "A", targetVectors: [] })
        : null;
      if (skipSceneMutate && errBundle) mountMixedBundle(errBundle);
      if (sync && errBundle?.modalConfig) sync.save("calc_mixed", App.getMixedCalcSig(), errBundle.modalConfig);
      return errBundle ? errBundle.modalConfig : null;
    }

    const matrixValues = mObj.values;
    const matrixName = mObj.name || "A";
    const rowsA = matrixValues.length;
    const colsA = matrixValues[0].length;

    if (!vecSel || !vecSel.value) {
      if (!opts.silentToast && window.App?.showToast) {
        App.showToast("Chưa chọn vector. Hãy tạo vector ở tab Khởi tạo trước.", "warning");
      }
      const errBundle = calcGen?.buildMixedOp
        ? calcGen.buildMixedOp({ mode: "single", A: matrixValues, matrixName, targetVectors: [] })
        : null;
      if (skipSceneMutate && errBundle) mountMixedBundle(errBundle);
      if (sync && errBundle?.modalConfig) sync.save("calc_mixed", App.getMixedCalcSig(), errBundle.modalConfig);
      return errBundle ? errBundle.modalConfig : null;
    }

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

      // 1. BIẾN ĐỔI TUYẾN TÍNH CHO TRANH VECTOR MESH
      if (vObj && vObj.isImageMesh) {
        const numPts = (vObj.baseWorldPoints || vObj.worldPoints || []).length;
        const meshBundle = calcGen?.buildMixedOp
          ? calcGen.buildMixedOp({ mode: "mesh", A: matrixValues, matrixName, numPoints: numPts })
          : null;

        if (meshBundle && meshBundle.isError) {
          if (!opts.silentToast && window.App?.showToast) {
            App.showToast(`Ma trận biến đổi tranh vector cần có kích thước 2x2 hoặc 3x3 (hiện tại: ${rowsA}x${colsA}).`, "warning");
          }
          mountMixedBundle(meshBundle);
          if (sync && meshBundle.modalConfig) sync.save("calc_mixed", App.getMixedCalcSig(), meshBundle.modalConfig);
          return meshBundle.modalConfig;
        }

        if (!skipSceneMutate) {
          if (!vObj.baseWorldPoints || vObj.baseWorldPoints.length !== vObj.worldPoints.length) {
            vObj.baseWorldPoints = vObj.worldPoints.map((p) => [p[0], p[1], p[2] || 0]);
          }

          const basePts = vObj.baseWorldPoints;
          const totalPts = basePts.length;
          const newWorldPoints = new Array(totalPts);

          const m00 = Number(matrixValues[0][0]) || 0;
          const m01 = Number(matrixValues[0][1]) || 0;
          const m02 = colsA >= 3 ? (Number(matrixValues[0][2]) || 0) : 0;

          const m10 = Number(matrixValues[1][0]) || 0;
          const m11 = Number(matrixValues[1][1]) || 0;
          const m12 = colsA >= 3 ? (Number(matrixValues[1][2]) || 0) : 0;

          const m20 = rowsA >= 3 ? (Number(matrixValues[2][0]) || 0) : 0;
          const m21 = rowsA >= 3 ? (Number(matrixValues[2][1]) || 0) : 0;
          const m22 = rowsA >= 3 && colsA >= 3 ? (Number(matrixValues[2][2]) || 0) : 1;

          if (rowsA === 2 && colsA === 2) {
            for (let i = 0; i < totalPts; i++) {
              const bp = basePts[i];
              newWorldPoints[i] = [m00 * bp[0] + m01 * bp[1], m10 * bp[0] + m11 * bp[1], bp[2]];
            }
          } else {
            for (let i = 0; i < totalPts; i++) {
              const bp = basePts[i];
              newWorldPoints[i] = [
                m00 * bp[0] + m01 * bp[1] + m02 * bp[2],
                m10 * bp[0] + m11 * bp[1] + m12 * bp[2],
                m20 * bp[0] + m21 * bp[1] + m22 * bp[2]
              ];
            }
          }

          vObj.worldPoints = newWorldPoints;
          vObj.activeTransformMatrix = matrixValues;

          if (App.mode === "3D" && window.Vec3D?.hardRefresh3D) {
            Vec3D.hardRefresh3D(false);
          } else if (window.Vec2D?.draw2DAllVectors) {
            Vec2D.draw2DAllVectors();
          }
        }

        mountMixedBundle(meshBundle);
        if (resultBox) {
          const resetBtn = resultBox.querySelector("#btnResetMeshTransform");
          if (resetBtn) {
            resetBtn.onclick = () => {
              if (vObj.baseWorldPoints) {
                vObj.worldPoints = vObj.baseWorldPoints.map((p) => [...p]);
                vObj.activeTransformMatrix = null;
                if (App.mode === "3D" && window.Vec3D?.hardRefresh3D) {
                  Vec3D.hardRefresh3D(false);
                } else if (window.Vec2D?.draw2DAllVectors) {
                  Vec2D.draw2DAllVectors();
                }
                if (window.App?.showToast) App.showToast("Đã khôi phục tranh về hình dạng ban đầu.", "success");
              }
            };
          }
        }

        if (sync && meshBundle?.modalConfig) sync.save("calc_mixed", App.getMixedCalcSig(), meshBundle.modalConfig);
        if (shouldLog && meshBundle && !meshBundle.isError && window.App?.PaperLogger && meshBundle.logLatex) {
          App.PaperLogger.log(meshBundle.logTitle, meshBundle.logLatex, "", meshBundle.modalConfig);
        }
        return meshBundle ? meshBundle.modalConfig : null;
      }

      // 2. BIẾN ĐỔI TUYẾN TÍNH CHO THỰC THỂ NORI 2D
      if (vecSel.value === "nori_entity") {
        const noriBundle = calcGen?.buildMixedOp
          ? calcGen.buildMixedOp({ mode: "nori", A: matrixValues, matrixName })
          : null;

        if (noriBundle && noriBundle.isError) {
          if (!opts.silentToast && window.App?.showToast) {
            App.showToast(`Linh vật Nori là thực thể 2D phẳng, chỉ hỗ trợ biến đổi với ma trận vuông 2x2 (hiện tại: ${rowsA}x${colsA}).`, "warning");
          }
          mountMixedBundle(noriBundle);
          if (sync && noriBundle.modalConfig) sync.save("calc_mixed", App.getMixedCalcSig(), noriBundle.modalConfig);
          return noriBundle.modalConfig;
        }

        mountMixedBundle(noriBundle);
        if (resultBox) {
          const resetBtn = resultBox.querySelector("#btnResetNoriTransform");
          if (resetBtn) {
            resetBtn.onclick = () => {
              if (App._noriAnimFrame) {
                cancelAnimationFrame(App._noriAnimFrame);
                App._noriAnimFrame = null;
              }
              if (window.App?.LinearTransform && App.LinearTransform.isActive()) {
                App.LinearTransform.stop();
              }
              App.activeNoriTransformMatrix = null;
              App.isNoriRelieved = true;
              if (window.Vec2D?.draw2DAllVectors) {
                Vec2D.draw2DAllVectors();
              }
              setTimeout(() => {
                App.isNoriRelieved = false;
                if (window.Vec2D?.draw2DAllVectors) Vec2D.draw2DAllVectors();
              }, 1200);
              if (window.App?.showToast) App.showToast("Đã khôi phục linh vật Nori về vị trí ban đầu.", "success");
            };
          }
        }

        if (sync && noriBundle?.modalConfig) sync.save("calc_mixed", App.getMixedCalcSig(), noriBundle.modalConfig);
        if (shouldLog && noriBundle && !noriBundle.isError && window.App?.PaperLogger && noriBundle.logLatex) {
          App.PaperLogger.log(noriBundle.logTitle, noriBundle.logLatex, "", noriBundle.modalConfig);
        }

        if (!skipSceneMutate) {
          if (!App.noriEntityActive && typeof App.toggleNoriEntity === "function") {
            App.toggleNoriEntity();
          }

          const playbackHUD = document.getElementById("sidebarTransformPlayback");
          if (App.mode !== "2D" && typeof App.toggleMode === "function") {
            App.toggleMode();
          }

          if (window.innerWidth < 768) {
            const sidebar = document.getElementById("sidebar");
            const hamburger = document.getElementById("floatingHamburger");
            if (sidebar && sidebar.classList.contains("open")) sidebar.classList.remove("open");
            if (hamburger && hamburger.classList.contains("active")) hamburger.classList.remove("active");
          }

          App.isNoriRelieved = false;

          if (triggerAnimation) {
            if (playbackHUD) playbackHUD.style.display = "block";
            if (window.App?.LinearTransform) {
              App.LinearTransform.start(matrixValues, []);
            } else {
              App.activeNoriTransformMatrix = matrixValues;
              if (window.Vec2D?.draw2DAllVectors) Vec2D.draw2DAllVectors();
            }
          } else {
            if (window.App?.LinearTransform && App.LinearTransform.isActive()) {
              App.LinearTransform.updateLiveMatrix(matrixValues);
            } else {
              App.activeNoriTransformMatrix = matrixValues;
              if (window.Vec2D?.draw2DAllVectors) Vec2D.draw2DAllVectors();
            }
          }
        }
        return noriBundle ? noriBundle.modalConfig : null;
      }

      if (vObj && Array.isArray(vObj.vec)) {
        targetVectors.push({
          id: vObj.id,
          name: vObj.name || "v",
          color: vObj.color || vObj.colorCss || "#0090ff",
          rawVec: vObj.vec,
          vec: vObj.vec.slice(0, colsA)
        });
      }
    }

    if (targetVectors.length === 0) {
      if (!opts.silentToast && window.App?.showToast) {
        App.showToast("Không tìm thấy vector phù hợp.", "warning");
      }
      const errBundle = calcGen?.buildMixedOp
        ? calcGen.buildMixedOp({ mode: "single", A: matrixValues, matrixName, targetVectors: [] })
        : null;
      if (skipSceneMutate && errBundle) mountMixedBundle(errBundle);
      if (sync && errBundle?.modalConfig) sync.save("calc_mixed", App.getMixedCalcSig(), errBundle.modalConfig);
      return errBundle ? errBundle.modalConfig : null;
    }

    let addParamVecBtnHtml = "";
    let symbolicVectorExpr = "";
    const isSingleValidDim = targetVectors.length === 1 && (!targetVectors[0].rawVec || targetVectors[0].rawVec.length === colsA);
    if (mObj.isParametric && isSingleValidDim) {
      const tv = targetVectors[0];
      const v = tv.vec;
      const exprComponents = [];
      for (let i = 0; i < rowsA; i++) {
        const parts = [];
        for (let j = 0; j < colsA; j++) {
          const rawCell = (mObj.latexValues && mObj.latexValues[i] && mObj.latexValues[i][j])
            ? mObj.latexValues[i][j]
            : String(mObj.values[i][j]);
          const vj = v[j] !== undefined ? v[j] : 0;
          if (vj === 0) continue;
          if (vj === 1) parts.push(`(${rawCell})`);
          else if (vj === -1) parts.push(`(-(${rawCell}))`);
          else parts.push(`(${vj})*(${rawCell})`);
        }
        exprComponents.push(parts.length > 0 ? parts.join(" + ") : "0");
      }
      symbolicVectorExpr = `[${exprComponents.join(", ")}]`;
      addParamVecBtnHtml = `
        <div style="display: flex; justify-content: flex-end;">
          <button type="button" id="btnAddTransformedParamVec" class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 2px; display: inline-flex; align-items: center; gap: 6px;">
            <i class="ph ph-plus-circle" style="font-size: 15px;"></i> Lưu thành vector tham số
          </button>
        </div>
      `;
    }

    if (!calcGen || typeof calcGen.buildMixedOp !== "function") return null;

    const bundle = calcGen.buildMixedOp({
      mode: vecSel.value === "all" ? "all" : "single",
      A: matrixValues,
      matrixName,
      targetVectors,
      extraFooterHtml: addParamVecBtnHtml
    });

    if (bundle.isError) {
      if (!opts.silentToast && window.App?.showToast) {
        App.showToast(bundle.errorTitle || "Kích thước ma trận và vector không khớp.", "warning");
      }
      mountMixedBundle(bundle);
      if (sync && bundle.modalConfig) sync.save("calc_mixed", App.getMixedCalcSig(), bundle.modalConfig);
      return bundle.modalConfig;
    }

    mountMixedBundle(bundle);
    if (symbolicVectorExpr && resultBox) {
      const btn = resultBox.querySelector("#btnAddTransformedParamVec");
      if (btn) {
        btn.onclick = () => {
          const inp = document.getElementById("vectorInput");
          if (inp) inp.value = symbolicVectorExpr;
          if (typeof App.onAddVector === "function") {
            App.onAddVector();
            if (App.showToast) App.showToast("Đã thêm vector tham số từ kết quả biến đổi ma trận!");
          }
        };
      }
    }

    if (sync && bundle.modalConfig) {
      sync.save("calc_mixed", App.getMixedCalcSig(), bundle.modalConfig);
    }
    if (shouldLog && window.App?.PaperLogger && bundle.logLatex) {
      App.PaperLogger.log(bundle.logTitle || "Biến đổi tuyến tính", bundle.logLatex, "", bundle.modalConfig);
    }

    if (!skipSceneMutate) {
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
      } else if (triggerAnimation) {
        if (playbackHUD) playbackHUD.style.display = "none";
        if (!is2D && !is3D && window.App?.showToast) {
          App.showToast(`Ma trận ${rowsA}×${colsA} chỉ tính toán số học, không hỗ trợ trực quan hóa biến đổi.`, "info");
        }
      }
    }

    return bundle.modalConfig;
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
    grid.style.gridTemplateColumns = `repeat(${cols}, minmax(58px, 1fr))`;

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

        // Keydown xử lý phím theo chuẩn Excel và điều hướng 4 phím Mũi tên
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

          // 4. Điều hướng 4 hướng Mũi tên (↑, ↓, ←, →) khi chưa Double click (loại bỏ WASD để cho phép nhập sin, cos, a, d)
          if (!cell._isEditMode && !e.ctrlKey && !e.altKey && !e.metaKey) {
            const key = e.key;
            if (key === "ArrowUp") {
              e.preventDefault();
              if (i > 0) moveToCell(i - 1, j);
              return;
            }
            if (key === "ArrowDown") {
              e.preventDefault();
              if (i < rows - 1) moveToCell(i + 1, j);
              return;
            }
            if (key === "ArrowLeft") {
              e.preventDefault();
              if (j > 0) moveToCell(i, j - 1);
              return;
            }
            if (key === "ArrowRight") {
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
        if (nativeSelect.dataset.customized || 
            nativeSelect.id === 'createObjectSelect' || 
            nativeSelect.closest('#legacyVectorControls') || 
            nativeSelect.closest('.obj-segmented-switcher') || 
            nativeSelect.dataset.noCustom === 'true' || 
            nativeSelect.style.display === 'none') return;
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
