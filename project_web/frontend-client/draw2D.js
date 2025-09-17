// ===================== viewer2D.js =====================

(function () {
  window.Vec2D = window.Vec2D || {};
  const App = window.App || {};

  const canvas2d = document.getElementById('canvas2d');
  const ctx2d = canvas2d.getContext('2d', { alpha: false });

  // Public state (for debug)
  Vec2D.S2D = {
    pxPerUnit: 25,
    offsetX: 0, offsetY: 0,
    panning: false,
    lastX: 0, lastY: 0,
    velX: 0, velY: 0
  };
  Vec2D.gridInfo2D = null;

  Vec2D.init2D = function () {
    Vec2D.resize2D();
    Vec2D.bind2DEvents();
    App.applyTheme();
  };

  Vec2D.show2D = function () {
    canvas2d.style.display = 'block';
    document.getElementById('threeLayer').style.display = 'none';
  };

  Vec2D.resize2D = function () {
    const rect = document.getElementById('viewer').getBoundingClientRect();
    canvas2d.width = Math.floor(rect.width);
    canvas2d.height = Math.floor(rect.height);
  };

  Vec2D.bind2DEvents = function () {
    window.addEventListener('resize', () => {
      Vec2D.resize2D();
      if (App.mode === '2D') Vec2D.draw2DAllVectors();
    });

    // ========== Pointer (chuột hoặc 1 ngón) ==========
    canvas2d.addEventListener('pointerdown', e => {
      Vec2D.S2D.panning = true;
      Vec2D.S2D.lastX = e.clientX;
      Vec2D.S2D.lastY = e.clientY;
      Vec2D.S2D.velX = 0; Vec2D.S2D.velY = 0;
      canvas2d.setPointerCapture(e.pointerId);
      canvas2d.style.cursor = 'grabbing';
      e.preventDefault();
    });

    canvas2d.addEventListener('pointermove', e => {
      if (!Vec2D.S2D.panning) return;
      const dx = e.clientX - Vec2D.S2D.lastX;
      const dy = e.clientY - Vec2D.S2D.lastY;
      Vec2D.S2D.offsetX += dx;
      Vec2D.S2D.offsetY += dy;
      Vec2D.S2D.velX = dx; Vec2D.S2D.velY = dy;
      Vec2D.S2D.lastX = e.clientX;
      Vec2D.S2D.lastY = e.clientY;
      if (App.mode === '2D') Vec2D.draw2DAllVectors();
    });

    canvas2d.addEventListener('pointerup', e => {
      Vec2D.S2D.panning = false;
      canvas2d.releasePointerCapture(e.pointerId);
      canvas2d.style.cursor = 'default';
    });

    // ========== Wheel zoom ==========
    canvas2d.addEventListener('wheel', e => {
      const rect = canvas2d.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const w = canvas2d.clientWidth, h = canvas2d.clientHeight;
      const cx = w / 2 + Vec2D.S2D.offsetX, cy = h / 2 + Vec2D.S2D.offsetY;
      const wx = (mx - cx) / Vec2D.S2D.pxPerUnit, wy = (cy - my) / Vec2D.S2D.pxPerUnit;
      const factor = (e.deltaY < 0) ? 1.18 : (1 / 1.18);
      Vec2D.S2D.pxPerUnit *= factor;
      if (!isFinite(Vec2D.S2D.pxPerUnit) || Vec2D.S2D.pxPerUnit <= 1e-12) Vec2D.S2D.pxPerUnit = 1e-12;
      const cxNew = mx - wx * Vec2D.S2D.pxPerUnit, cyNew = my + wy * Vec2D.S2D.pxPerUnit;
      Vec2D.S2D.offsetX = cxNew - w / 2; Vec2D.S2D.offsetY = cyNew - h / 2;
      if (App.mode === '2D') Vec2D.draw2DAllVectors();
      e.preventDefault();
    }, { passive: false });

    // ========== Touch (1 hoặc 2 ngón) ==========
    let lastMid = null, lastDist = null;
    canvas2d.addEventListener('touchmove', e => {
      if (e.touches.length === 1) {
        // 1 ngón = pan
        const t = e.touches[0];
        if (lastMid) {
          Vec2D.S2D.offsetX += t.clientX - lastMid.x;
          Vec2D.S2D.offsetY += t.clientY - lastMid.y;
        }
        lastMid = { x: t.clientX, y: t.clientY };
        if (App.mode === '2D') Vec2D.draw2DAllVectors();
      } else if (e.touches.length === 2) {
        // 2 ngón = pan + zoom kết hợp
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        if (lastMid) {
          Vec2D.S2D.offsetX += (midX - lastMid.x);
          Vec2D.S2D.offsetY += (midY - lastMid.y);
        }
        lastMid = { x: midX, y: midY };

        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (lastDist) {
          const factor = dist / lastDist;
          Vec2D.S2D.pxPerUnit *= factor;
          if (!isFinite(Vec2D.S2D.pxPerUnit) || Vec2D.S2D.pxPerUnit <= 1e-12) Vec2D.S2D.pxPerUnit = 1e-12;
        }
        lastDist = dist;

        if (App.mode === '2D') Vec2D.draw2DAllVectors();
      }
      e.preventDefault();
    }, { passive: false });

    canvas2d.addEventListener('touchend', () => { lastMid = null; lastDist = null; });

    // ========== Inertia loop ==========
    function inertiaLoop() {
      if (!Vec2D.S2D.panning) {
        Vec2D.S2D.offsetX += Vec2D.S2D.velX;
        Vec2D.S2D.offsetY += Vec2D.S2D.velY;
        Vec2D.S2D.velX *= 0.9;
        Vec2D.S2D.velY *= 0.9;
        if (Math.abs(Vec2D.S2D.velX) > 0.1 || Math.abs(Vec2D.S2D.velY) > 0.1) {
          if (App.mode === '2D') Vec2D.draw2DAllVectors();
        } else {
          Vec2D.S2D.velX = Vec2D.S2D.velY = 0;
        }
      }
      requestAnimationFrame(inertiaLoop);
    }
    inertiaLoop();
  };

  // ================= Grid + Draw =================
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
