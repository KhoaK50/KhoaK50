(function () {
  window.App = window.App || {};

  App.init = function () {
    App.log(`Frontend origin: ${location.origin}`);
    App.pingBackend();

    // Keypad top
    const vectorInput = document.getElementById("vectorInput");
    document.getElementById("btnInsertSlash").addEventListener("click", () => App.insertAtCursor(vectorInput, "/"));
    document.getElementById("btnInsertSqrt").addEventListener("click", () => App.insertSqrt(vectorInput));
    vectorInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); App.onAddVector(); }
    });

    document.getElementById("btnDraw").addEventListener("click", App.onAddVector);
    document.getElementById("btnAuto").addEventListener("click", App.toggleAuto);
    document.getElementById("btnClearAll").addEventListener("click", App.clearAllVectors);
    document.getElementById("themeBadge").addEventListener("click", App.toggleTheme);
    document.getElementById("modeBadge").addEventListener("click", App.toggleMode);

    document.getElementById("opSelect").addEventListener("change", App.refreshCalcUI);
    document.getElementById("btnCompute").addEventListener("click", () => App.runCalc(true));
    document.getElementById("btnPreview").addEventListener("click", () => App.runCalc(false));

    document.getElementById("opExtraSelect").addEventListener("change", () => {
      App.showExtraForm(document.getElementById("opExtraSelect").value);
    });

    document.getElementById("btnAngle").addEventListener("click", App.angleBetweenUI);
    document.getElementById("btnNorm").addEventListener("click", App.vectorNormUI);
    document.getElementById("btnCoord").addEventListener("click", App.coordinatesUI);
    document.getElementById("btnBasis").addEventListener("click", App.basisAndDimUI);
    document.getElementById("btnIndep").addEventListener("click", App.checkIndependenceUI);
    document.getElementById("btnRank").addEventListener("click", App.rankVecUI);
    document.getElementById("btnDot").addEventListener("click", App.dotProductUI);
    document.getElementById("btnProj").addEventListener("click", App.projectionUI);

    // mini keypad for list inputs
    const btnListSlash = document.getElementById("btnListSlash");
    const btnListSqrt = document.getElementById("btnListSqrt");

    btnListSlash.addEventListener("mousedown", (e) => e.preventDefault());
    btnListSqrt.addEventListener("mousedown", (e) => e.preventDefault());

    btnListSlash.addEventListener("click", () => {
      const inp = App.currentListInput || App.getFocusedVectorInput();
      if (inp) { App.insertAtCursor(inp, "/"); inp.focus(); }
    });

    btnListSqrt.addEventListener("click", () => {
      const inp = App.currentListInput || App.getFocusedVectorInput();
      if (inp) { App.insertSqrt(inp); inp.focus(); }
    });

    // Init 2D/3D layers
    if (window.Vec2D) Vec2D.init2D();
    if (window.Vec3D) Vec3D.init3D();

    // prevent wheel scroll in viewer wrap
    const viewerWrap = document.getElementById("viewerWrap");
    viewerWrap.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });

    // First show 2D by default
    App.applyTheme();
    if (window.Vec2D) Vec2D.show2D();
    App.redrawAll();

    App.log("Ready Z-up.");

    App.refreshCalcVectorOptions();
    App.renderExtraCalcOptions();
    App.showExtraForm(document.getElementById("opExtraSelect").value);

    // =========================
    // GẮN GUARD CHO CÁC <select> DÙNG VECTOR
    // (đặc biệt 4 ô bạn nói: v1Select, v2Select, v1DotSelect, v2DotSelect)
    // =========================
    function attachEmptyVectorGuards() {
      if (typeof App.guardEmptyVectorSelect !== "function") return;

      const ids = [
        // 2 ô trên (phép tính tạo vector mới)
        "v1Select", "v2Select",

        // 2 ô dưới (tích vô hướng)
        "v1DotSelect", "v2DotSelect",

        // các select khác cũng cần guard luôn cho đồng bộ UX
        "v1AngleSelect", "v2AngleSelect",
        "vNormSelect",
        "vCoordSelect",
        "vProjSelect",
      ];

      ids.forEach((id) => App.guardEmptyVectorSelect(document.getElementById(id)));
    }

    attachEmptyVectorGuards();

    // =========================
    // Hamburger toggle: CHỈ nút 3 gạch mới đóng/mở
    // =========================
    const burger = document.getElementById("hamburger");
    const controls = document.getElementById("controls");
    const overlay = document.getElementById("overlay");

    function syncOverlay() {
      if (!overlay || !controls) return;
      if (controls.classList.contains("open")) overlay.classList.add("show");
      else overlay.classList.remove("show");
    }

    if (burger && controls) {
      burger.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        controls.classList.toggle("open");
        syncOverlay();
      });
    } else {
      syncOverlay();
    }
    if (App.SolutionPanel && typeof App.SolutionPanel.init === "function") {
      App.SolutionPanel.init();
    }

  };

  window.addEventListener("DOMContentLoaded", () => {
    App.init();
    App.log("three typeof: " + (typeof THREE));
    App.log("OrbitControls " + (typeof THREE?.OrbitControls));
  });
})();
