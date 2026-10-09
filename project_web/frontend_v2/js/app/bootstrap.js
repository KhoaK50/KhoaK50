// ================== bootstrap.js ==================
(function () {
  window.App = window.App || {};

  App.init = function () {
    if (App.log) App.log(`Frontend origin: ${location.origin}`);
    if (App.pingBackend) App.pingBackend();

    const vectorInput = document.getElementById("vectorInput");
    if (vectorInput) {
      vectorInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          App.onAddVector();
        } else if (e.key === "Escape") {
          if (typeof App.cancelEditVector === "function") {
            App.cancelEditVector();
          }
        }
      });
      vectorInput.addEventListener("input", () => {
        if (typeof App.updateVectorInputPreview === "function") {
          App.updateVectorInputPreview();
        }
      });
      if (typeof App.updateVectorInputPreview === "function") {
        setTimeout(App.updateVectorInputPreview, 120);
      }
    }

    const bindClick = (id, fn) => {
      const el = document.getElementById(id);
      if (el && fn) el.addEventListener("click", fn);
    };

    const bindChange = (id, fn) => {
      const el = document.getElementById(id);
      if (el && fn) el.addEventListener("change", fn);
    };

    bindClick("btnDraw", App.onAddVector);
    bindClick("btnClearAll", () => {
      if (typeof App.clearAllVectors === "function") App.clearAllVectors();
    });
    bindClick("btnAuto", App.toggleAuto);
    bindClick("themeBadge", App.toggleTheme);
    bindClick("modeBadge", App.toggleMode);

    bindChange("opSelect", () => {
      if (typeof App.refreshCalcUI === "function") App.refreshCalcUI(false);
    });

    // Nút tính toán & xem trước
    const btnCompute = document.getElementById("btnCompute");
    // [FIX] Removed duplicate listener, now only in sidebar.js

    // Select phép tính phụ
    const opExtraSelect = document.getElementById("opExtraSelect");
    if (opExtraSelect) {
      opExtraSelect.addEventListener("change", () => {
        App.showExtraForm(opExtraSelect.value);
      });
    }

    // Các nút phép tính phụ
    bindClick("btnAngle", App.angleBetweenUI);
    bindClick("btnNorm", App.vectorNormUI);
    bindClick("btnCoord", App.coordinatesUI);
    bindClick("btnBasis", App.basisAndDimUI);
    bindClick("btnIndep", App.checkIndependenceUI);
    bindClick("btnRank", App.rankVecUI);
    bindClick("btnDot", App.dotProductUI);
    bindClick("btnProj", App.projectionUI);
    // --- (ĐÃ XÓA HOÀN TOÀN ĐOẠN MINI KEYPAD CŨ GÂY LỖI) ---

    // Init 2D/3D layers
    if (window.Vec2D && Vec2D.init2D) Vec2D.init2D();
    if (window.Vec3D && Vec3D.init3D) Vec3D.init3D();

    // prevent wheel scroll in viewer wrap, except for paper mode
    const viewerWrap = document.getElementById("viewerWrap");
    if (viewerWrap)
      viewerWrap.addEventListener("wheel", (e) => {
        if (e.target.closest('#paperWrap')) return;
        e.preventDefault();
      }, {
        passive: false,
      });

    // First show 2D by default
    if (App.applyTheme) App.applyTheme();
    if (window.Vec2D && Vec2D.show2D) Vec2D.show2D();
    
    // Khôi phục phiên làm việc trước khi vẽ lại tất cả
    if (App.SessionManager) App.SessionManager.init();
    
    if (App.redrawAll) App.redrawAll();


    if (App.log) App.log("Ready Z-up.");

    if (App.refreshCalcVectorOptions) App.refreshCalcVectorOptions();
    if (App.renderExtraCalcOptions) App.renderExtraCalcOptions();
    if (opExtraSelect && App.showExtraForm)
      App.showExtraForm(opExtraSelect.value);

    // =========================
    // GẮN GUARD CHO CÁC <select>
    // =========================
    function attachEmptyVectorGuards() {
      if (typeof App.guardEmptyVectorSelect !== "function") return;

      const ids = [
        "v1Select",
        "v2Select",
        "v1DotSelect",
        "v2DotSelect",
        "v1AngleSelect",
        "v2AngleSelect",
        "vNormSelect",
        "vCoordSelect",
        "vProjSelect",
      ];

      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) App.guardEmptyVectorSelect(el);
      });
    }

    attachEmptyVectorGuards();

    // =========================
    // Hamburger toggle
    // =========================
    const burger = document.getElementById("hamburger");
    const controls = document.getElementById("controls");
    const overlay = document.getElementById("overlay");

    function syncOverlay() {
      if (!overlay || !controls) return;
      if (controls.classList.contains("open")) {
          overlay.classList.add("show");
          const fh = document.getElementById("floatingHamburger");
          if (fh) fh.classList.add("open");
        } else {
          overlay.classList.remove("show");
          const fh = document.getElementById("floatingHamburger");
          if (fh) fh.classList.remove("open");
        }
    }

    if (burger && controls) {
      burger.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        controls.classList.toggle("open");
        syncOverlay();
      });
      // Thêm sự kiện click overlay để đóng menu
      if (overlay) {
        overlay.addEventListener("click", () => {
          controls.classList.remove("open");
          syncOverlay();
        });
      }
    } else {
      syncOverlay();
    }

    // Init Solution Panel
    if (
      window.App &&
      App.SolutionPanel &&
      typeof App.SolutionPanel.init === "function"
    ) {
      App.SolutionPanel.init();
    }

    // --- XỬ LÝ NÚT RESET VIEW (QUAY VỀ GỐC) ---
    const btnResetView = document.getElementById("btnResetView");
    if (btnResetView) {
      btnResetView.addEventListener("click", function () {
        // Hiệu ứng xoay icon cho trực quan
        const icon = this.querySelector("svg, i");
        if (icon) {
          icon.style.transition = "transform 0.5s ease";
          icon.style.transform = "rotate(360deg)";
          setTimeout(() => (icon.style.transform = "none"), 500);
        }

        // Gọi hàm reset tùy theo chế độ 2D hay 3D
        if (App.mode === "3D") {
          if (window.Vec3D && Vec3D.resetView) Vec3D.resetView();
        } else {
          if (window.Vec2D && Vec2D.resetView) Vec2D.resetView();
        }
      });
    }

    // --- XỬ LÝ MENU TÙY CHỌN CANVAS (CANVAS HUD) ---
    const canvasMenuContainer = document.getElementById("canvasMenuContainer");
    const canvasMenuBtn = document.getElementById("canvasMenuBtn");
    if (canvasMenuBtn && canvasMenuContainer) {
      canvasMenuBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        canvasMenuContainer.classList.toggle("open");
      });
      document.addEventListener("click", function (e) {
        if (!canvasMenuContainer.contains(e.target)) {
          canvasMenuContainer.classList.remove("open");
        }
      });
    }

    // --- QUẢN LÝ CÀI ĐẶT ĐỒ THỊ (GRAPH SETTINGS) CHO 2D & 3D ---
    const savedGraphSettings = (() => {
      try {
        const s = localStorage.getItem("vectoria_graph_settings");
        return s ? JSON.parse(s) : null;
      } catch (e) { return null; }
    })();

    App.graphSettings = Object.assign({
      gridMode: "full",         // 'full' | 'major' | 'none'
      gridContrast: 50,         // 0 to 100 (%)
      labelMode: "name",        // 'name' | 'both' | 'none'
      showAxes: true,           // boolean
      haloStyle: "precision_reticle" // 'precision_reticle' | 'academic_aura' | 'soft_elevation'
    }, savedGraphSettings);

    // Neu saved settings la chuoi cu ('hierarchical', etc.), chuyen sang so 50
    if (typeof App.graphSettings.gridContrast !== "number") {
      if (App.graphSettings.gridContrast === "subtle") App.graphSettings.gridContrast = 35;
      else if (App.graphSettings.gridContrast === "high") App.graphSettings.gridContrast = 70;
      else App.graphSettings.gridContrast = 50;
    }

    const settingGridMode = document.getElementById("settingGridMode");
    const settingGridContrastSlider = document.getElementById("settingGridContrastSlider");
    const settingGridContrastVal = document.getElementById("settingGridContrastVal");
    const settingLabelMode = document.getElementById("settingLabelMode");
    const settingShowAxes = document.getElementById("settingShowAxes");
    const settingHaloStyle = document.getElementById("settingHaloStyle");

    if (settingGridMode) {
      settingGridMode.value = App.graphSettings.gridMode || "full";
      settingGridMode.addEventListener("change", (e) => {
        App.graphSettings.gridMode = e.target.value;
        App.saveGraphSettings();
      });
    }

    function updateSliderFill(slider) {
      if (!slider) return;
      const min = Number(slider.min) || 0;
      const max = Number(slider.max) || 100;
      const val = Number(slider.value) || 0;
      const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
      slider.style.setProperty("--slider-pct", `${pct}%`);
    }

    if (settingGridContrastSlider) {
      settingGridContrastSlider.value = App.graphSettings.gridContrast;
      updateSliderFill(settingGridContrastSlider);
      if (settingGridContrastVal) {
        settingGridContrastVal.textContent = App.graphSettings.gridContrast + "%";
      }
      settingGridContrastSlider.addEventListener("input", (e) => {
        const val = Number(e.target.value);
        App.graphSettings.gridContrast = val;
        updateSliderFill(e.target);
        if (settingGridContrastVal) {
          settingGridContrastVal.textContent = val + "%";
        }
        App.saveGraphSettings();
      });
    }

    if (settingLabelMode) {
      settingLabelMode.value = App.graphSettings.labelMode || "name";
      settingLabelMode.addEventListener("change", (e) => {
        App.graphSettings.labelMode = e.target.value;
        App.saveGraphSettings();
      });
    }

    if (settingShowAxes) {
      settingShowAxes.checked = App.graphSettings.showAxes !== false;
      settingShowAxes.addEventListener("change", (e) => {
        App.graphSettings.showAxes = e.target.checked;
        App.saveGraphSettings();
      });
    }

    if (settingHaloStyle) {
      const validStyles = ["precision_reticle", "academic_aura", "soft_elevation"];
      const currentStyle = App.graphSettings.haloStyle;
      settingHaloStyle.value = validStyles.includes(currentStyle) ? currentStyle : "precision_reticle";
      settingHaloStyle.addEventListener("change", (e) => {
        App.graphSettings.haloStyle = e.target.value;
        App.saveGraphSettings();
      });
    }

    App.saveGraphSettings = function () {
      try {
        localStorage.setItem("vectoria_graph_settings", JSON.stringify(App.graphSettings));
        if (App.graphSettings.haloStyle) {
          localStorage.setItem("vectoria_halo_style", App.graphSettings.haloStyle);
          App.haloStyle = App.graphSettings.haloStyle;
        }
      } catch (e) {}

      if (window.App && window.App.mode === "3D") {
        if (window.Vec3D && typeof window.Vec3D.updateFromSettings === "function") {
          window.Vec3D.updateFromSettings();
        }
      } else {
        if (window.Vec2D) {
          if (typeof window.Vec2D.render2DGrid === "function") window.Vec2D.render2DGrid();
          if (typeof window.Vec2D.draw2DAllVectors === "function") window.Vec2D.draw2DAllVectors();
        }
      }
    };
  };

  // Chạy init khi DOM sẵn sàng
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      App.init();
      if (App.log) {
        App.log("three typeof: " + typeof THREE);
        App.log("OrbitControls " + typeof THREE?.OrbitControls);
      }
    });
  } else {
    App.init();
  }
})();
