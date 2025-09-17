// ===================== viewer2D.js =====================

(function () {
  window.Vec2D = window.Vec2D || {};
  const App = window.App || {};

  const canvas2d = document.getElementById('canvas2d');
  const ctx2d = canvas2d.getContext('2d', { alpha: false });

  // Public state (for debug)
  Vec2D.S2D = {
    pxPerUnit: 25,
    offsetX: 0,
    offsetY: 0,
    velocityX: 0,
    velocityY: 0,
    lastGesture: null
  };
  Vec2D.gridInfo2D = null;

  Vec2D.init2D = function () {
    Vec2D.resize2D();
    Vec2D.bind2DEvents();
    App.applyTheme(); // sets bg & redraw via draw2DAllVectors if in 2D
  };

  Vec2D.show2D = function () {
    const canvas = document.getElementById('canvas2d');
    const threeLayer = document.getElementById('threeLayer');
    canvas.style.display = 'block';
    threeLayer.style.display = 'none';
  };

  Vec2D.resize2D = function () {
    const rect = document.getElementById('viewer').getBoundingClientRect();
    canvas2d.width = Math.floor(rect.width);
    canvas2d.height = Math.floor(rect.height);
  };

  // === Gesture Handling (Google Maps style) ===
  Vec2D.bind2DEvents = function () {
    window.addEventListener('resize', () => {
      Vec2D.resize2D();
      if (App.mode === '2D') Vec2D.draw2DAllVectors();
    });

    let activeTouches = new Map();
    let lastMid = null;
    let lastDist = null;
    let animating = false;

    const updateMomentum = () => {
      if (!animating) return;
      Vec2D.S2D.offsetX += Vec2D.S2D.velocityX;
      Vec2D.S2D.offsetY += Vec2D.S2D.velocityY;

      Vec2D.S2D.velocityX *= 0.9; // friction
      Vec2D.S2D.velocityY *= 0.9;

      if (Math.abs(Vec2D.S2D.velocityX) < 0.05 &&
          Math.abs(Vec2D.S2D.velocityY) < 0.05) {
        animating = false;
        return;
      }

      if (App.mode === '2D') Vec2D.draw2DAllVectors();
      requestAnimationFrame(updateMomentum);
    };

    canvas2d.addEventListener('pointerdown', e => {
      canvas2d.setPointerCapture(e.pointerId);
      activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      lastMid = null;
      lastDist = null;
      Vec2D.S2D.velocityX = 0;
      Vec2D.S2D.velocityY = 0;
      animating = false;
    });

    canvas2d.addEventListener('pointermove', e => {
      if (!activeTouches.has(e.pointerId)) return;
      activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const touches = Array.from(activeTouches.values());
      if (touches.length === 1) {
        // Pan with 1 finger
        const t = touches[0];
        if (lastMid) {
          const dx = t.x - lastMid.x;
          const dy = t.y - lastMid.y;
          Vec2D.S2D.offsetX += dx;
          Vec2D.S2D.offsetY += dy;
          Vec2D.S2D.velocityX = dx;
          Vec2D.S2D.velocityY = dy;
          if (App.mode === '2D') Vec2D.draw2DAllVectors();
        }
        lastMid = { ...t };
      } else if (touches.length >= 2) {
        // Pinch zoom + pan with 2 fingers
        const mid = {
          x: (touches[0].x + touches[1].x) / 2,
          y: (touches[0].y + touches[1].y) / 2
        };
        const dx = touches[0].x - touches[1].x;
        const dy = touches[0].y - touches[1].y;
        const dist = Math.hypot(dx, dy);

        if (lastMid) {
          // Pan by midpoint movement
          const dmx = mid.x - lastMid.x;
          const dmy = mid.y - lastMid.y;
          Vec2D.S2D.offsetX += dmx;
          Vec2D.S2D.offsetY += dmy;
          Vec2D.S2D.velocityX = dmx;
          Vec2D.S2D.velocityY = dmy;
        }

        if (lastDist) {
          // Zoom by pinch distance
          const factor = Math.pow(dist / lastDist, 0.9);
          const rect = canvas2d.getBoundingClientRect();
          const w = canvas2d.clientWidth, h = canvas2d.clientHeight;
          const cx = w / 2 + Vec2D.S2D.offsetX;
          const cy = h / 2 + Vec2D.S2D.offsetY;
          const wx = (mid.x - cx) / Vec2D.S2D.pxPerUnit;
          const wy = (cy - mid.y) / Vec2D.S2D.pxPerUnit;

          Vec2D.S2D.pxPerUnit *= factor;
          if (!isFinite(Vec2D.S2D.pxPerUnit) || Vec2D.S2D.pxPerUnit <= 1e-12)
            Vec2D.S2D.pxPerUnit = 1e-12;

          const cxNew = mid.x - wx * Vec2D.S2D.pxPerUnit;
          const cyNew = mid.y + wy * Vec2D.S2D.pxPerUnit;
          Vec2D.S2D.offsetX = cxNew - w / 2;
          Vec2D.S2D.offsetY = cyNew - h / 2;
        }

        lastMid = mid;
        lastDist = dist;
        if (App.mode === '2D') Vec2D.draw2DAllVectors();
      }
    });

    canvas2d.addEventListener('pointerup', e => {
      activeTouches.delete(e.pointerId);
      if (activeTouches.size === 0) {
        lastMid = null;
        lastDist = null;
        if (Math.abs(Vec2D.S2D.velocityX) > 0.1 ||
            Math.abs(Vec2D.S2D.velocityY) > 0.1) {
          animating = true;
          requestAnimationFrame(updateMomentum);
        }
      }
    });

    // Mouse wheel zoom
    canvas2d.addEventListener('wheel', e => {
      const rect = canvas2d.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const w = canvas2d.clientWidth, h = canvas2d.clientHeight;
      const cx = w / 2 + Vec2D.S2D.offsetX, cy = h / 2 + Vec2D.S2D.offsetY;
      const wx = (mx - cx) / Vec2D.S2D.pxPerUnit, wy = (cy - my) / Vec2D.S2D.pxPerUnit;
      const factor = (e.deltaY < 0) ? 1.18 : (1 / 1.18);
      Vec2D.S2D.pxPerUnit *= factor;
      if (!isFinite(Vec2D.S2D.pxPerUnit) || Vec2D.S2D.pxPerUnit <= 1e-12)
        Vec2D.S2D.pxPerUnit = 1e-12;
      const cxNew = mx - wx * Vec2D.S2D.pxPerUnit, cyNew = my + wy * Vec2D.S2D.pxPerUnit;
      Vec2D.S2D.offsetX = cxNew - w / 2;
      Vec2D.S2D.offsetY = cyNew - h / 2;
      if (App.mode === '2D') Vec2D.draw2DAllVectors();
      e.preventDefault();
    }, { passive: false });
  };

  Vec2D.render2DGrid = function () {
    const w = canvas2d.width, h = canvas2d.height;
    const cx = w / 2 + Vec2D.S2D.offsetX, cy = h / 2 + Vec2D.S2D.offsetY, px = Vec2D.S2D.pxPerUnit;

    ctx2d.fillStyle = App.getCSS('--card');
    ctx2d.fillRect(0, 0, w, h);

    const unitsHalfX = (w / 2) / px, unitsHalfY = (h / 2) / px;
    const unitsRange = Math.max(unitsHalfX, unitsHalfY) * 2;
    const stepUnit = App.niceStep(unitsRange), tickPx = stepUnit * px;

    ctx2d.strokeStyle = App.getCSS('--grid-light'); ctx2d.lineWidth = 1;
    for (let k = Math.floor((-cx) / tickPx) - 1; k <= Math.ceil((w - cx) / tickPx) + 1; k++) {
      const x = cx + k * tickPx; ctx2d.beginPath(); ctx2d.moveTo(x, 0); ctx2d.lineTo(x, h); ctx2d.stroke();
    }
    for (let k = Math.floor((cy - h) / tickPx) - 1; k <= Math.ceil((cy + h) / tickPx) + 1; k++) {
      const y = cy - k * tickPx; ctx2d.beginPath(); ctx2d.moveTo(0, y); ctx2d.lineTo(w, y); ctx2d.stroke();
    }

    ctx2d.strokeStyle = App.getCSS('--axis'); ctx2d.lineWidth = 2;
    ctx2d.beginPath(); ctx2d.moveTo(0, cy); ctx2d.lineTo(w, cy); ctx2d.stroke();
    ctx2d.beginPath(); ctx2d.moveTo(cx, 0); ctx2d.lineTo(cx, h); ctx2d.stroke();

    ctx2d.fillStyle = App.getCSS('--fg'); ctx2d.font = '12px sans-serif';
    ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'top';
    for (let k = Math.floor((-cx) / tickPx) - 1; k <= Math.ceil((w - cx) / tickPx) + 1; k++) {
      const unitVal = k * stepUnit; if (Math.abs(unitVal) <= 1e-12) continue; const x = cx + k * tickPx;
      ctx2d.fillText(formatLabel(unitVal), x, cy + 6);
    }
    ctx2d.textAlign = 'left'; ctx2d.textBaseline = 'middle';
    for (let k = Math.floor((cy - h) / tickPx) - 1; k <= Math.ceil((cy + h) / tickPx) + 1; k++) {
      const unitVal = k * stepUnit; if (Math.abs(unitVal) <= 1e-12) continue; const y = cy - k * tickPx;
      ctx2d.fillText(formatLabel(unitVal), cx + 6, y);
    }
    ctx2d.textAlign = 'left'; ctx2d.textBaseline = 'top'; ctx2d.fillText('0', cx + 4, cy + 4);

    function formatLabel(v) {
      if (v === 0) return '0';
      const abs = Math.abs(v);
      if (abs >= 1e6 || abs < 1e-6) return v.toExponential(0).replace('+', '');
      return Number(v.toFixed(6)).toString();
    }

    return { cx, cy, px, stepUnit };
  };

  function draw2DVectorSingle(v, color, haloColor, highlighted) {
    const { cx, cy, px } = Vec2D.gridInfo2D;
    const x2 = cx + v[0] * px, y2 = cy - v[1] * px;
    const angle = Math.atan2(y2 - cy, x2 - cx);

    if (highlighted) {
      const layers = [{ w: 12, a: .18 }, { w: 8, a: .14 }, { w: 5, a: .10 }];
      for (const L of layers) {
        ctx2d.strokeStyle = haloColor; ctx2d.globalAlpha = L.a; ctx2d.lineWidth = L.w;
        ctx2d.beginPath(); ctx2d.moveTo(cx, cy); ctx2d.lineTo(x2, y2); ctx2d.stroke();
        ctx2d.beginPath(); ctx2d.moveTo(x2, y2);
        ctx2d.lineTo(x2 - (L.w + 6) * Math.cos(angle - Math.PI / 6), y2 - (L.w + 6) * Math.sin(angle - Math.PI / 6));
        ctx2d.moveTo(x2, y2);
        ctx2d.lineTo(x2 - (L.w + 6) * Math.cos(angle + Math.PI / 6), y2 - (L.w + 6) * Math.sin(angle + Math.PI / 6));
        ctx2d.stroke(); ctx2d.globalAlpha = 1;
      }
    }
    ctx2d.strokeStyle = color; ctx2d.lineWidth = 2;
    ctx2d.beginPath(); ctx2d.moveTo(cx, cy); ctx2d.lineTo(x2, y2); ctx2d.stroke();

    const head = 12;
    ctx2d.beginPath(); ctx2d.moveTo(x2, y2);
    ctx2d.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
    ctx2d.moveTo(x2, y2);
    ctx2d.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
    ctx2d.stroke();
  }

  Vec2D.draw2DAllVectors = function () {
    if (App.firstDrawForVector && App.currentVector && (App.currentVector.length >= 2)) {
      const w = canvas2d.width, h = canvas2d.height; const v = App.currentVector;
      const maxComp = Math.max(Math.abs(v[0]), Math.abs(v[1]), 1);
      Vec2D.S2D.pxPerUnit = Math.max((Math.min(w, h) / 2) * 0.6 / maxComp, 1e-12);
      Vec2D.S2D.offsetX = 0; Vec2D.S2D.offsetY = 0; App.firstDrawForVector = false;
    }

    Vec2D.gridInfo2D = Vec2D.render2DGrid();

    for (const it of App.vectorList) {
      const v2 = it.vec.length === 2 ? it.vec : [it.vec[0], it.vec[1]];
      draw2DVectorSingle(v2, it.colorCss, it.haloCss, it.highlighted);
    }

    if (App.currentAngleVisual2D) _drawAngleArc2DOverlay(App.currentAngleVisual2D);

    if (App.currentVector && App.currentVector.length >= 2) {
      const v2 = App.currentVector;
      App.coordOut(`[${App.formatScalar(v2[0])}, ${App.formatScalar(v2[1])}] = ${App.formatScalar(v2[0])}·[1,0] + ${App.formatScalar(v2[1])}·[0,1]`);
    } else App.coordOut('—');
  };

  Vec2D.drawAngleArc2D = function (v1, v2, deg) {
    App.currentAngleVisual2D = { a: [v1[0], v1[1]], b: [v2[0], v2[1]], deg: Number(deg) };
    Vec2D.draw2DAllVectors();
  };

  function _drawAngleArc2DOverlay(state) {
    if (!Vec2D.gridInfo2D || !state) return;
    const { cx, cy } = Vec2D.gridInfo2D;
    const a = state.a, b = state.b;

    const angA = Math.atan2(-a[1], a[0]);
    const angB = Math.atan2(-b[1], b[0]);

    let delta = angB - angA;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;

    let sweep = delta;
    if (sweep < 0) sweep += 2 * Math.PI;

    const start = angA;
    const end = angA + sweep;
    const r = Math.min(canvas2d.width, canvas2d.height) * 0.18;

    ctx2d.save();
    ctx2d.beginPath();
    ctx2d.moveTo(cx, cy);
    ctx2d.arc(cx, cy, r, start, end, false);
    ctx2d.closePath();
    ctx2d.fillStyle = "rgba(255, 200, 0, 0.32)";
    ctx2d.fill();

    const mid = start + sweep / 2;
    const tx = cx + Math.cos(mid) * (r * 1.2);
    const ty = cy + Math.sin(mid) * (r * 1.2);
    const degShow = sweep * 180 / Math.PI;

    ctx2d.font = "14px sans-serif";
    ctx2d.textAlign = "center";
    ctx2d.textBaseline = "middle";
    ctx2d.fillStyle = App.getCSS('--fg');
    ctx2d.fillText(`${degShow.toFixed(1)}°`, tx, ty);
    ctx2d.restore();
  }

})();
