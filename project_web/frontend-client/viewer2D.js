// ===================== viewer2D.js =====================

(function () {
  window.Vec2D = window.Vec2D || {};
  const App = window.App || {};

  const canvas2d = document.getElementById('canvas2d');
  const ctx2d = canvas2d.getContext('2d', { alpha: false });

  // ----- State -----
  Vec2D.S2D = {
    pxPerUnit: 25,
    offsetX: 0, offsetY: 0,

    // 1-finger/mouse drag
    isPanningOne: false,
    startX: 0, startY: 0,
    lastX: 0, lastY: 0,

    // velocities (px/ms)
    velX: 0, velY: 0,
    lastTime: 0,

    // momentum raf
    momentumId: null,

    // multi-pointer
    pointers: new Map(), // id -> {x,y}
    lastCentroidX: null, lastCentroidY: null,
    lastDist: null,
    zoomVel: 0, // per ms in log space
  };
  Vec2D.gridInfo2D = null;

  Vec2D.init2D = function () {
    Vec2D.resize2D();
    Vec2D.bind2DEvents();
    // Rất quan trọng cho mobile để trình duyệt không chiếm gesture (pinch-zoom/pan của browser)
    canvas2d.style.touchAction = 'none';
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

  // ---------- Helpers for gestures ----------
  function centroidOfPointers(ptrs) {
    let sx = 0, sy = 0, n = 0;
    for (const p of ptrs.values()) { sx += p.x; sy += p.y; n++; }
    if (!n) return null;
    return { x: sx / n, y: sy / n };
  }

  function distanceTwoPointers(ptrs) {
    if (ptrs.size !== 2) return null;
    const it = ptrs.values();
    const a = it.next().value, b = it.next().value;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function applyZoomAboutScreenPoint(mx, my, factor) {
    const w = canvas2d.clientWidth, h = canvas2d.clientHeight;
    const cx = w / 2 + Vec2D.S2D.offsetX;
    const cy = h / 2 + Vec2D.S2D.offsetY;

    // world coord under (mx,my) before zoom
    const wx = (mx - cx) / Vec2D.S2D.pxPerUnit;
    const wy = (cy - my) / Vec2D.S2D.pxPerUnit;

    Vec2D.S2D.pxPerUnit *= factor;
    if (!isFinite(Vec2D.S2D.pxPerUnit) || Vec2D.S2D.pxPerUnit <= 1e-12) Vec2D.S2D.pxPerUnit = 1e-12;

    // keep the same world point under finger
    const cxNew = mx - wx * Vec2D.S2D.pxPerUnit;
    const cyNew = my + wy * Vec2D.S2D.pxPerUnit;
    Vec2D.S2D.offsetX = cxNew - w / 2;
    Vec2D.S2D.offsetY = cyNew - h / 2;
  }

  // ---------- Events ----------
  Vec2D.bind2DEvents = function () {
    window.addEventListener('resize', () => { Vec2D.resize2D(); if (App.mode === '2D') Vec2D.draw2DAllVectors(); });

    // Pointer down
    canvas2d.addEventListener('pointerdown', e => {
      // register pointer
      Vec2D.S2D.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // cancel momentum when user touches again
      if (Vec2D.S2D.momentumId) cancelAnimationFrame(Vec2D.S2D.momentumId);

      const n = Vec2D.S2D.pointers.size;
      Vec2D.S2D.lastTime = performance.now();

      if (n === 1) {
        // 1-finger or mouse: start pan
        Vec2D.S2D.isPanningOne = true;
        Vec2D.S2D.startX = e.clientX - Vec2D.S2D.offsetX;
        Vec2D.S2D.startY = e.clientY - Vec2D.S2D.offsetY;
        Vec2D.S2D.lastX = e.clientX;
        Vec2D.S2D.lastY = e.clientY;
        canvas2d.setPointerCapture(e.pointerId);
        canvas2d.style.cursor = 'grabbing';
      } else if (n === 2) {
        // two-finger: reset centroid/dist baselines
        const c = centroidOfPointers(Vec2D.S2D.pointers);
        Vec2D.S2D.lastCentroidX = c.x;
        Vec2D.S2D.lastCentroidY = c.y;
        Vec2D.S2D.lastDist = distanceTwoPointers(Vec2D.S2D.pointers);
        Vec2D.S2D.isPanningOne = false; // switch to two-finger mode
      }
      e.preventDefault();
    });

    // Pointer move
    canvas2d.addEventListener('pointermove', e => {
      if (!Vec2D.S2D.pointers.has(e.pointerId)) return;
      Vec2D.S2D.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const now = performance.now();
      const dt = (now - Vec2D.S2D.lastTime) || 16;

      const n = Vec2D.S2D.pointers.size;

      if (n >= 2) {
        // Combined pan + pinch
        const c = centroidOfPointers(Vec2D.S2D.pointers);
        const dist = distanceTwoPointers(Vec2D.S2D.pointers);

        // Pan by centroid delta
        if (Vec2D.S2D.lastCentroidX != null) {
          const dx = c.x - Vec2D.S2D.lastCentroidX;
          const dy = c.y - Vec2D.S2D.lastCentroidY;
          Vec2D.S2D.offsetX += dx;
          Vec2D.S2D.offsetY += dy;

          // velocity for momentum (px/ms)
          Vec2D.S2D.velX = dx / dt;
          Vec2D.S2D.velY = dy / dt;
        }

        // Pinch zoom about centroid
        if (Vec2D.S2D.lastDist) {
          const rawFactor = dist / Vec2D.S2D.lastDist;
          const smooth = 0.9; // gentle
          const factor = Math.pow(rawFactor, smooth);
          applyZoomAboutScreenPoint(c.x, c.y, factor);

          // zoom velocity in log space
          Vec2D.S2D.zoomVel = Math.log(factor) / dt;
        }

        Vec2D.S2D.lastCentroidX = c.x; Vec2D.S2D.lastCentroidY = c.y;
        Vec2D.S2D.lastDist = dist;
        Vec2D.S2D.lastTime = now;

        if (App.mode === '2D') Vec2D.draw2DAllVectors();
        return;
      }

      // Single pointer pan (mouse or one finger)
      if (Vec2D.S2D.isPanningOne && n === 1) {
        Vec2D.S2D.offsetX = e.clientX - Vec2D.S2D.startX;
        Vec2D.S2D.offsetY = e.clientY - Vec2D.S2D.startY;

        Vec2D.S2D.velX = (e.clientX - Vec2D.S2D.lastX) / dt;
        Vec2D.S2D.velY = (e.clientY - Vec2D.S2D.lastY) / dt;

        Vec2D.S2D.lastX = e.clientX;
        Vec2D.S2D.lastY = e.clientY;
        Vec2D.S2D.lastTime = now;

        if (App.mode === '2D') Vec2D.draw2DAllVectors();
      }
    });

    // Pointer up / cancel
    const endPointer = (e) => {
      if (!Vec2D.S2D.pointers.has(e.pointerId)) return;
      Vec2D.S2D.pointers.delete(e.pointerId);

      const n = Vec2D.S2D.pointers.size;

      if (n === 0) {
        // no fingers → momentum (both pan & zoom)
        canvas2d.releasePointerCapture?.(e.pointerId);
        canvas2d.style.cursor = 'default';
        Vec2D.S2D.isPanningOne = false;
        Vec2D.S2D.lastCentroidX = Vec2D.S2D.lastCentroidY = null;
        Vec2D.S2D.lastDist = null;

        const panSpeed = Math.hypot(Vec2D.S2D.velX, Vec2D.S2D.velY);
        const hasPanMomentum = panSpeed > 0.01;
        const hasZoomMomentum = Math.abs(Vec2D.S2D.zoomVel) > 1e-4;

        if (hasPanMomentum || hasZoomMomentum) {
          const decayPan = 0.85;
          const decayZoom = 0.80;

          const step = () => {
            // ~16ms/frame
            if (hasPanMomentum) {
              Vec2D.S2D.offsetX += Vec2D.S2D.velX * 16;
              Vec2D.S2D.offsetY += Vec2D.S2D.velY * 16;
              Vec2D.S2D.velX *= decayPan;
              Vec2D.S2D.velY *= decayPan;
            }

            if (hasZoomMomentum) {
              const factor = Math.exp(Vec2D.S2D.zoomVel * 16);
              // zoom về tâm màn hình (ổn định); có thể đổi sang điểm cuối cùng nếu muốn
              applyZoomAboutScreenPoint(canvas2d.clientWidth / 2, canvas2d.clientHeight / 2, factor);
              Vec2D.S2D.zoomVel *= decayZoom;
            }

            if (App.mode === '2D') Vec2D.draw2DAllVectors();

            const stillPan = Math.hypot(Vec2D.S2D.velX, Vec2D.S2D.velY) > 0.01;
            const stillZoom = Math.abs(Vec2D.S2D.zoomVel) > 1e-4;
            if (stillPan || stillZoom) {
              Vec2D.S2D.momentumId = requestAnimationFrame(step);
            }
          };
          Vec2D.S2D.momentumId = requestAnimationFrame(step);
        }

        // reset zoomVel for next gesture
        Vec2D.S2D.zoomVel = 0;
      } else if (n === 1) {
        // if one pointer remains, switch back to one-finger pan baseline
        const remain = Vec2D.S2D.pointers.values().next().value;
        Vec2D.S2D.isPanningOne = true;
        Vec2D.S2D.startX = remain.x - Vec2D.S2D.offsetX;
        Vec2D.S2D.startY = remain.y - Vec2D.S2D.offsetY;
        Vec2D.S2D.lastX = remain.x;
        Vec2D.S2D.lastY = remain.y;
        Vec2D.S2D.lastTime = performance.now();
        Vec2D.S2D.lastCentroidX = Vec2D.S2D.lastCentroidY = null;
        Vec2D.S2D.lastDist = null;
        Vec2D.S2D.zoomVel = 0;
      } else {
        // still >=2 after removing one → recompute baselines
        const c = centroidOfPointers(Vec2D.S2D.pointers);
        Vec2D.S2D.lastCentroidX = c.x;
        Vec2D.S2D.lastCentroidY = c.y;
        Vec2D.S2D.lastDist = distanceTwoPointers(Vec2D.S2D.pointers);
        Vec2D.S2D.lastTime = performance.now();
      }
    };
    canvas2d.addEventListener('pointerup', endPointer);
    canvas2d.addEventListener('pointercancel', endPointer);
    canvas2d.addEventListener('lostpointercapture', () => { /* ignore */ });

    // Wheel zoom (desktop)
    canvas2d.addEventListener('wheel', e => {
      const rect = canvas2d.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const factor = (e.deltaY < 0) ? 1.18 : (1 / 1.18);
      applyZoomAboutScreenPoint(mx, my, factor);
      if (App.mode === '2D') Vec2D.draw2DAllVectors();
      e.preventDefault();
    }, { passive: false });
  };

  // ---------- Rendering ----------
  Vec2D.render2DGrid = function () {
    const w = canvas2d.width, h = canvas2d.height;
    const cx = w / 2 + Vec2D.S2D.offsetX, cy = h / 2 + Vec2D.S2D.offsetY, px = Vec2D.S2D.pxPerUnit;

    ctx2d.fillStyle = App.getCSS('--card');
    ctx2d.fillRect(0, 0, w, h);

    const unitsHalfX = (w / 2) / px, unitsHalfY = (h / 2) / px;
    const unitsRange = Math.max(unitsHalfX, unitsHalfY) * 2;

    // Bước chia chỉ 1 hoặc 5 (…0.1, 0.5, 5, 50, 100…)
    function niceStep(range) {
      const raw = Math.max(1e-18, range / 10);            // mục tiêu ~10 vạch
      const p = Math.pow(10, Math.floor(Math.log10(raw))); // bậc 10
      const s = raw / p;                                   // 1..10
      const m = (s <= 2.5) ? 1 : 5;                        // chỉ 1 hoặc 5
      return m * p;
    }

    const stepUnit = niceStep(unitsRange);
    const tickPx = stepUnit * px;

    // grid lines
    ctx2d.strokeStyle = App.getCSS('--grid-light'); ctx2d.lineWidth = 1;
    for (let k = Math.floor((-cx) / tickPx) - 1; k <= Math.ceil((w - cx) / tickPx) + 1; k++) {
      const x = cx + k * tickPx; ctx2d.beginPath(); ctx2d.moveTo(x, 0); ctx2d.lineTo(x, h); ctx2d.stroke();
    }
    for (let k = Math.floor((cy - h) / tickPx) - 1; k <= Math.ceil((cy + h) / tickPx) + 1; k++) {
      const y = cy - k * tickPx; ctx2d.beginPath(); ctx2d.moveTo(0, y); ctx2d.lineTo(w, y); ctx2d.stroke();
    }

    // axes
    ctx2d.strokeStyle = App.getCSS('--axis'); ctx2d.lineWidth = 2;
    ctx2d.beginPath(); ctx2d.moveTo(0, cy); ctx2d.lineTo(w, cy); ctx2d.stroke();
    ctx2d.beginPath(); ctx2d.moveTo(cx, 0); ctx2d.lineTo(cx, h); ctx2d.stroke();

    // labels
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
    // auto-fit on first draw of currentVector
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

  // Public: set new angle state and trigger redraw
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
