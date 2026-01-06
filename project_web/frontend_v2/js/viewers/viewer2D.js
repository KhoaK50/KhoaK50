// ===================== viewer2D.js (Fixed Loading & Resize) =====================
(function () {
  window.Vec2D = window.Vec2D || {};

  const canvas2d = document.getElementById("canvas2d");
  const ctx2d = canvas2d.getContext("2d", { alpha: false });

  // ----- State -----
  Vec2D.S2D = {
    pxPerUnit: 25,
    offsetX: 0,
    offsetY: 0,

    // 1-finger/mouse drag
    isPanningOne: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,

    // velocities (px/ms)
    velX: 0,
    velY: 0,
    lastTime: 0,

    // momentum raf
    momentumId: null,

    // multi-pointer
    pointers: new Map(), // id -> {x,y}
    lastCentroidX: null,
    lastCentroidY: null,
    lastDist: null,
    zoomVel: 0 // per ms in log space
  };

  Vec2D.gridInfo2D = null;

  // ====== Vector thickness config (MEDIUM-BOLD) ======
  const VEC_STROKE_W = 3.2;
  const ARROW_HEAD = 14;
  const HALO_LAYERS = [
    { w: 12, a: 0.18 },
    { w: 8, a: 0.14 },
    { w: 5, a: 0.10 }
  ];

  const toVec2 = (v) => [v?.[0] || 0, v?.[1] || 0];

  // Helper: Lấy kích thước logic (CSS pixels)
  function getLogicalSize() {
    const dpr = window.devicePixelRatio || 1;
    // Phòng trường hợp canvas chưa init xong width=0
    const w = (canvas2d.width / dpr) || 1;
    const h = (canvas2d.height / dpr) || 1;
    return { w, h };
  }

  Vec2D.init2D = function () {
    const App = window.App || {};
    
    // 1. Resize lần đầu (có thể chưa chính xác nếu DOM chưa load xong)
    Vec2D.resize2D();
    
    // 2. Bind Events
    Vec2D.bind2DEvents();
    canvas2d.style.touchAction = "none";
    App.applyTheme?.();

    // 3. QUAN TRỌNG: Dùng ResizeObserver để theo dõi kích thước thật của div cha (#viewer)
    // Ngay khi div cha có kích thước chuẩn, nó sẽ tự gọi resize2D và vẽ lại.
    const viewerDiv = document.getElementById("viewer");
    if (viewerDiv) {
      const ro = new ResizeObserver(() => {
        // Chỉ vẽ lại nếu đang ở mode 2D
        if (App.mode === "2D") {
          Vec2D.resize2D();
          Vec2D.draw2DAllVectors();
        }
      });
      ro.observe(viewerDiv);
    }
  };

  Vec2D.show2D = function () {
    const canvas = document.getElementById("canvas2d");
    const threeLayer = document.getElementById("threeLayer");
    canvas.style.display = "block";
    threeLayer.style.display = "none";
    
    // Resize lại ngay khi hiển thị để đảm bảo nét
    requestAnimationFrame(() => {
        Vec2D.resize2D();
        Vec2D.draw2DAllVectors();
    });
  };

  // Hàm xử lý High-DPI
  Vec2D.resize2D = function () {
    const rect = document.getElementById("viewer").getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Nếu kích thước = 0 (đang ẩn hoặc chưa load), bỏ qua để tránh lỗi
    if (rect.width === 0 || rect.height === 0) return;

    // 1. Set kích thước vật lý (thực tế) gấp dpr lần
    canvas2d.width = Math.floor(rect.width * dpr);
    canvas2d.height = Math.floor(rect.height * dpr);

    // 2. Scale context
    ctx2d.setTransform(1, 0, 0, 1, 0, 0); // Reset transform cũ
    ctx2d.scale(dpr, dpr);
  };

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
    const { w, h } = getLogicalSize();
    const cx = w / 2 + Vec2D.S2D.offsetX;
    const cy = h / 2 + Vec2D.S2D.offsetY;

    const wx = (mx - cx) / Vec2D.S2D.pxPerUnit;
    const wy = (cy - my) / Vec2D.S2D.pxPerUnit;

    Vec2D.S2D.pxPerUnit *= factor;
    // Giới hạn zoom tránh crash
    if (!isFinite(Vec2D.S2D.pxPerUnit) || Vec2D.S2D.pxPerUnit <= 1e-12) Vec2D.S2D.pxPerUnit = 1e-12;
    if (Vec2D.S2D.pxPerUnit > 1e12) Vec2D.S2D.pxPerUnit = 1e12;

    const cxNew = mx - wx * Vec2D.S2D.pxPerUnit;
    const cyNew = my + wy * Vec2D.S2D.pxPerUnit;
    Vec2D.S2D.offsetX = cxNew - w / 2;
    Vec2D.S2D.offsetY = cyNew - h / 2;
  }

  Vec2D.bind2DEvents = function () {
    // window.resize đã được ResizeObserver lo, nhưng giữ lại cho chắc chắn
    window.addEventListener("resize", () => {
      const App = window.App || {};
      if (App.mode === "2D") {
          Vec2D.resize2D();
          Vec2D.draw2DAllVectors();
      }
    });

    canvas2d.addEventListener("pointerdown", (e) => {
      Vec2D.S2D.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (Vec2D.S2D.momentumId) cancelAnimationFrame(Vec2D.S2D.momentumId);

      const n = Vec2D.S2D.pointers.size;
      Vec2D.S2D.lastTime = performance.now();

      if (n === 1) {
        Vec2D.S2D.isPanningOne = true;
        Vec2D.S2D.startX = e.clientX - Vec2D.S2D.offsetX;
        Vec2D.S2D.startY = e.clientY - Vec2D.S2D.offsetY;
        Vec2D.S2D.lastX = e.clientX;
        Vec2D.S2D.lastY = e.clientY;
        canvas2d.setPointerCapture(e.pointerId);
        canvas2d.style.cursor = "grabbing";
      } else if (n === 2) {
        const c = centroidOfPointers(Vec2D.S2D.pointers);
        Vec2D.S2D.lastCentroidX = c.x;
        Vec2D.S2D.lastCentroidY = c.y;
        Vec2D.S2D.lastDist = distanceTwoPointers(Vec2D.S2D.pointers);
        Vec2D.S2D.isPanningOne = false;
      }

      e.preventDefault();
    });

    canvas2d.addEventListener("pointermove", (e) => {
      const App = window.App || {};
      if (!Vec2D.S2D.pointers.has(e.pointerId)) return;
      Vec2D.S2D.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const now = performance.now();
      const dt = (now - Vec2D.S2D.lastTime) || 16;

      const n = Vec2D.S2D.pointers.size;

      if (n >= 2) {
        const c = centroidOfPointers(Vec2D.S2D.pointers);
        const dist = distanceTwoPointers(Vec2D.S2D.pointers);

        if (Vec2D.S2D.lastCentroidX != null) {
          const dx = c.x - Vec2D.S2D.lastCentroidX;
          const dy = c.y - Vec2D.S2D.lastCentroidY;
          Vec2D.S2D.offsetX += dx;
          Vec2D.S2D.offsetY += dy;

          Vec2D.S2D.velX = dx / dt;
          Vec2D.S2D.velY = dy / dt;
        }

        if (Vec2D.S2D.lastDist) {
          const rawFactor = dist / Vec2D.S2D.lastDist;
          const smooth = 0.9;
          const factor = Math.pow(rawFactor, smooth);
          applyZoomAboutScreenPoint(c.x, c.y, factor);
          Vec2D.S2D.zoomVel = Math.log(factor) / dt;
        }

        Vec2D.S2D.lastCentroidX = c.x;
        Vec2D.S2D.lastCentroidY = c.y;
        Vec2D.S2D.lastDist = dist;
        Vec2D.S2D.lastTime = now;

        if (App.mode === "2D") Vec2D.draw2DAllVectors();
        return;
      }

      if (Vec2D.S2D.isPanningOne && n === 1) {
        Vec2D.S2D.offsetX = e.clientX - Vec2D.S2D.startX;
        Vec2D.S2D.offsetY = e.clientY - Vec2D.S2D.startY;

        Vec2D.S2D.velX = (e.clientX - Vec2D.S2D.lastX) / dt;
        Vec2D.S2D.velY = (e.clientY - Vec2D.S2D.lastY) / dt;

        Vec2D.S2D.lastX = e.clientX;
        Vec2D.S2D.lastY = e.clientY;
        Vec2D.S2D.lastTime = now;

        if (App.mode === "2D") Vec2D.draw2DAllVectors();
      }
    });

    const endPointer = (e) => {
      const App = window.App || {};
      if (!Vec2D.S2D.pointers.has(e.pointerId)) return;
      Vec2D.S2D.pointers.delete(e.pointerId);

      const n = Vec2D.S2D.pointers.size;

      if (n === 0) {
        canvas2d.releasePointerCapture?.(e.pointerId);
        canvas2d.style.cursor = "default";
        Vec2D.S2D.isPanningOne = false;
        Vec2D.S2D.lastCentroidX = Vec2D.S2D.lastCentroidY = null;
        Vec2D.S2D.lastDist = null;

        const panSpeed = Math.hypot(Vec2D.S2D.velX, Vec2D.S2D.velY);
        const hasPanMomentum = panSpeed > 0.01;
        const hasZoomMomentum = Math.abs(Vec2D.S2D.zoomVel) > 1e-4;

        if (hasPanMomentum || hasZoomMomentum) {
          const decayPan = 0.85;
          const decayZoom = 0.8;

          const step = () => {
            if (hasPanMomentum) {
              Vec2D.S2D.offsetX += Vec2D.S2D.velX * 16;
              Vec2D.S2D.offsetY += Vec2D.S2D.velY * 16;
              Vec2D.S2D.velX *= decayPan;
              Vec2D.S2D.velY *= decayPan;
            }

            if (hasZoomMomentum) {
              const factor = Math.exp(Vec2D.S2D.zoomVel * 16);
              const { w, h } = getLogicalSize();
              applyZoomAboutScreenPoint(w / 2, h / 2, factor);
              Vec2D.S2D.zoomVel *= decayZoom;
            }

            if (App.mode === "2D") Vec2D.draw2DAllVectors();

            const stillPan = Math.hypot(Vec2D.S2D.velX, Vec2D.S2D.velY) > 0.01;
            const stillZoom = Math.abs(Vec2D.S2D.zoomVel) > 1e-4;
            if (stillPan || stillZoom) {
              Vec2D.S2D.momentumId = requestAnimationFrame(step);
            }
          };
          Vec2D.S2D.momentumId = requestAnimationFrame(step);
        }

        Vec2D.S2D.zoomVel = 0;
      } else if (n === 1) {
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
        const c = centroidOfPointers(Vec2D.S2D.pointers);
        Vec2D.S2D.lastCentroidX = c.x;
        Vec2D.S2D.lastCentroidY = c.y;
        Vec2D.S2D.lastDist = distanceTwoPointers(Vec2D.S2D.pointers);
        Vec2D.S2D.lastTime = performance.now();
      }
    };

    canvas2d.addEventListener("pointerup", endPointer);
    canvas2d.addEventListener("pointercancel", endPointer);

    canvas2d.addEventListener(
      "wheel",
      (e) => {
        const App = window.App || {};
        const rect = canvas2d.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
        applyZoomAboutScreenPoint(mx, my, factor);
        if (App.mode === "2D") Vec2D.draw2DAllVectors();
        e.preventDefault();
      },
      { passive: false }
    );
  };

  Vec2D.render2DGrid = function () {
    const App = window.App || {};
    const { w, h } = getLogicalSize();
    
    const cx = w / 2 + Vec2D.S2D.offsetX, cy = h / 2 + Vec2D.S2D.offsetY, px = Vec2D.S2D.pxPerUnit;

    ctx2d.fillStyle = App.getCSS?.("--card") || "#111";
    ctx2d.fillRect(0, 0, w, h);

    const unitsHalfX = (w / 2) / px, unitsHalfY = (h / 2) / px;
    const unitsRange = Math.max(unitsHalfX, unitsHalfY) * 2;
    const stepUnit = App.niceStep ? App.niceStep(unitsRange) : 1;
    const tickPx = stepUnit * px;

    const subDiv = 5;
    const subTickPx = tickPx / subDiv;
    ctx2d.strokeStyle = App.getCSS?.("--grid-light") || "#2b2b2b";
    ctx2d.lineWidth = 0.5;
    for (let x = cx % subTickPx; x <= w; x += subTickPx) {
      ctx2d.beginPath(); ctx2d.moveTo(x, 0); ctx2d.lineTo(x, h); ctx2d.stroke();
    }
    for (let y = cy % subTickPx; y <= h; y += subTickPx) {
      ctx2d.beginPath(); ctx2d.moveTo(0, y); ctx2d.lineTo(w, y); ctx2d.stroke();
    }

    ctx2d.strokeStyle = App.getCSS?.("--grid-light") || "#2b2b2b";
    ctx2d.lineWidth = 1.2;
    for (let k = Math.floor((-cx) / tickPx) - 1; k <= Math.ceil((w - cx) / tickPx) + 1; k++) {
      const x = cx + k * tickPx;
      ctx2d.beginPath(); ctx2d.moveTo(x, 0); ctx2d.lineTo(x, h); ctx2d.stroke();
    }
    for (let k = Math.floor((cy - h) / tickPx) - 1; k <= Math.ceil((cy + h) / tickPx) + 1; k++) {
      const y = cy - k * tickPx;
      ctx2d.beginPath(); ctx2d.moveTo(0, y); ctx2d.lineTo(w, y); ctx2d.stroke();
    }

    ctx2d.strokeStyle = App.getCSS?.("--axis") || "#aaa";
    ctx2d.lineWidth = 2;
    ctx2d.beginPath(); ctx2d.moveTo(0, cy); ctx2d.lineTo(w, cy); ctx2d.stroke();
    ctx2d.beginPath(); ctx2d.moveTo(cx, 0); ctx2d.lineTo(cx, h); ctx2d.stroke();

    ctx2d.fillStyle = App.getCSS?.("--fg") || "#fff";
    ctx2d.font = "12px sans-serif";

    ctx2d.textAlign = "center";
    ctx2d.textBaseline = "top";
    for (let k = Math.floor((-cx) / tickPx) - 1; k <= Math.ceil((w - cx) / tickPx) + 1; k++) {
      const unitVal = k * stepUnit;
      if (Math.abs(unitVal) <= 1e-12) continue;
      const x = cx + k * tickPx;
      ctx2d.fillText(formatLabel(unitVal), x, cy + 6);
    }

    ctx2d.textAlign = "left";
    ctx2d.textBaseline = "middle";
    for (let k = Math.floor((cy - h) / tickPx) - 1; k <= Math.ceil((cy + h) / tickPx) + 1; k++) {
      const unitVal = k * stepUnit;
      if (Math.abs(unitVal) <= 1e-12) continue;
      const y = cy - k * tickPx;
      ctx2d.fillText(formatLabel(unitVal), cx + 6, y);
    }

    ctx2d.textAlign = "left";
    ctx2d.textBaseline = "top";
    ctx2d.fillText("0", cx + 4, cy + 4);

    function formatLabel(v) {
      if (v === 0) return "0";
      const abs = Math.abs(v);
      if (abs >= 1e6 || abs < 1e-6) return v.toExponential(0).replace("+", "");
      return Number(v.toFixed(6)).toString();
    }

    return { cx, cy, px, stepUnit };
  };

  function draw2DVectorSingle(v, color, haloColor, highlighted, alpha = 1) {
    alpha = Math.max(0, Math.min(1, Number(alpha) || 0));

    const { cx, cy, px } = Vec2D.gridInfo2D;
    const x2 = cx + v[0] * px, y2 = cy - v[1] * px;
    const angle = Math.atan2(y2 - cy, x2 - cx);

    if (highlighted) {
      ctx2d.save();
      for (const L of HALO_LAYERS) {
        ctx2d.strokeStyle = haloColor;
        ctx2d.globalAlpha = L.a * alpha;
        ctx2d.lineWidth = L.w;

        ctx2d.beginPath(); ctx2d.moveTo(cx, cy); ctx2d.lineTo(x2, y2); ctx2d.stroke();

        ctx2d.beginPath();
        ctx2d.moveTo(x2, y2);
        ctx2d.lineTo(
          x2 - (L.w + 6) * Math.cos(angle - Math.PI / 6),
          y2 - (L.w + 6) * Math.sin(angle - Math.PI / 6)
        );
        ctx2d.moveTo(x2, y2);
        ctx2d.lineTo(
          x2 - (L.w + 6) * Math.cos(angle + Math.PI / 6),
          y2 - (L.w + 6) * Math.sin(angle + Math.PI / 6)
        );
        ctx2d.stroke();
      }
      ctx2d.restore();
    }

    ctx2d.save();
    ctx2d.globalAlpha = alpha;

    ctx2d.strokeStyle = color;
    ctx2d.lineWidth = VEC_STROKE_W;

    ctx2d.beginPath();
    ctx2d.moveTo(cx, cy);
    ctx2d.lineTo(x2, y2);
    ctx2d.stroke();

    ctx2d.beginPath();
    ctx2d.moveTo(x2, y2);
    ctx2d.lineTo(x2 - ARROW_HEAD * Math.cos(angle - Math.PI / 6), y2 - ARROW_HEAD * Math.sin(angle - Math.PI / 6));
    ctx2d.moveTo(x2, y2);
    ctx2d.lineTo(x2 - ARROW_HEAD * Math.cos(angle + Math.PI / 6), y2 - ARROW_HEAD * Math.sin(angle + Math.PI / 6));
    ctx2d.stroke();

    ctx2d.restore();
  }

  Vec2D.draw2DAllVectors = function () {
    const App = window.App || {};
    const { w, h } = getLogicalSize();

    if (App.firstDrawForVector && App.currentVector && App.currentVector.length >= 2) {
      const v = toVec2(App.currentVector);
      const maxComp = Math.max(Math.abs(v[0]), Math.abs(v[1]), 1);
      Vec2D.S2D.pxPerUnit = Math.max((Math.min(w, h) / 2) * 0.6 / maxComp, 1e-12);
      Vec2D.S2D.offsetX = 0;
      Vec2D.S2D.offsetY = 0;
      App.firstDrawForVector = false;
    }

    Vec2D.gridInfo2D = Vec2D.render2DGrid();

    const focused = App.vectorList?.find((v) => v.focus);
    const toDraw = focused ? [focused] : (App.vectorList || []).filter((v) => v.visible !== false);

    // ===== Draw order (ONLY during basis animation) =====
    const drawOne = (it) => {
      const v2 = it.vec?.length >= 2 ? [it.vec[0], it.vec[1]] : [0, 0];
      const a = (typeof it.alpha === "number") ? it.alpha : 1;
      draw2DVectorSingle(v2, it.colorCss, it.haloCss, !!it.focus, a);
    };

    if (App._basisAnimActive) {
      // 1) vẽ non-basis trước
      for (const it of toDraw) {
        if (it && it._basisIsBasis) continue;
        drawOne(it);
      }
      // 2) vẽ basis sau => luôn nằm trên cùng
      for (const it of toDraw) {
        if (!it || !it._basisIsBasis) continue;
        drawOne(it);
      }
    } else {
      // bình thường: giữ nguyên thứ tự vẽ hiện tại
      for (const it of toDraw) drawOne(it);
    }

    if (App.currentAngleVisual2D) _drawAngleArc2DOverlay(App.currentAngleVisual2D);

    if (App.currentVector && App.currentVector.length >= 2) {
      const v2 = toVec2(App.currentVector);
      App.coordOut?.(
        `[${App.formatScalar?.(v2[0]) ?? v2[0]}, ${App.formatScalar?.(v2[1]) ?? v2[1]}] = ` +
        `${App.formatScalar?.(v2[0]) ?? v2[0]}·[1,0] + ${App.formatScalar?.(v2[1]) ?? v2[1]}·[0,1]`
      );
    } else {
      App.coordOut?.("—");
    }
  };

  Vec2D.drawAngleArc2D = function (v1, v2, deg) {
    const a = toVec2(v1), b = toVec2(v2);
    const App = window.App || {};
    App.currentAngleVisual2D = { a: [a[0], a[1]], b: [b[0], b[1]], deg: Number(deg) };
    Vec2D.draw2DAllVectors();
  };

  function _drawAngleArc2DOverlay(state) {
    const App = window.App || {};
    if (!Vec2D.gridInfo2D || !state) return;
    const { cx, cy } = Vec2D.gridInfo2D;
    const a = state.a, b = state.b;

    // ✅ FIX: Dùng kích thước logic
    const { w, h } = getLogicalSize();

    const angA = Math.atan2(-a[1], a[0]);
    const angB = Math.atan2(-b[1], b[0]);

    const normPi = (x) => {
      while (x <= -Math.PI) x += 2 * Math.PI;
      while (x > Math.PI) x -= 2 * Math.PI;
      return x;
    };

    const delta = normPi(angB - angA);
    const anticlockwise = delta < 0;

    const r = Math.min(w, h) * 0.18;

    ctx2d.save();
    ctx2d.beginPath();
    ctx2d.moveTo(cx, cy);
    ctx2d.arc(cx, cy, r, angA, angA + delta, anticlockwise);
    ctx2d.closePath();
    ctx2d.fillStyle = "rgba(255, 200, 0, 0.32)";
    ctx2d.fill();

    const mid = angA + delta / 2;
    const padPx = 16;
    const tx = cx + Math.cos(mid) * (r + padPx);
    const ty = cy + Math.sin(mid) * (r + padPx);

    const degShow = state.deg != null ? state.deg : Math.abs((delta * 180) / Math.PI);

    ctx2d.font = "14px sans-serif";
    ctx2d.textAlign = "center";
    ctx2d.textBaseline = "middle";
    const textColor = App.getCSS?.("--label-fg") || App.getCSS?.("--fg") || "#fff";
    ctx2d.fillStyle = textColor;
    ctx2d.fillText(`${degShow.toFixed(1)}°`, tx, ty);

    ctx2d.restore();
  }

})();
