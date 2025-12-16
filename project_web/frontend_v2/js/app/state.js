(function () {
  window.App = window.App || {};

  /* ============== GLOBAL STATE ============== */
  App.mode = "2D";
  App.autoMode = true;
  App.currentVector = [1, 2];
  App.firstDrawForVector = true;
  App.theme = "light";

  // Angle visualization state
  App.currentAngleVisual2D = null; // { a:[x,y], b:[x,y], deg }
  App.currentAngleVisual3D = null; // THREE.Group
  App.currentListInput = null;     // focused <input> in list

  // vectorList items: { id, vec, hue, colorCss, colorHex, haloCss, haloHex, focus, visible, highlighted }
  App.vectorList = [];
  App.nextId = 1;
  App.usedHues = new Set();

  App._previewTemp = null;
})();
