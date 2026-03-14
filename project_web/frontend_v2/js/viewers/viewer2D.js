// ===================== viewer2D.js (FULL + NEON PULSE FOCUS) =====================
(function () {
  window.Vec2D = window.Vec2D || {};

  const canvas2d = document.getElementById("canvas2d");
  if (!canvas2d) return;

  const ctx2d = canvas2d.getContext("2d", { alpha: false });

  // ----- State (Giữ nguyên toàn bộ) -----
  Vec2D.S2D = {
    pxPerUnit: 80,
    offsetX: 0,
    offsetY: 0,
    isPanningOne: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    velX: 0,
    velY: 0,
    lastTime: 0,
    momentumId: null,
    pointers: new Map(),
    lastCentroidX: null,
    lastCentroidY: null,
    lastDist: null,
    zoomVel: 0,
  };

  Vec2D.gridInfo2D = null;
  Vec2D._animLoopId = null;

  const VEC_STROKE_W = 3.2;
  const ARROW_HEAD = 14;

  // [FUNKY PULSE CONFIG]
  const PULSE_SPEED = 0.005; // Tốc độ nhịp
  const PULSE_MIN_W = 6; // Độ rộng min
  const PULSE_MAX_W = 20; // Độ rộng max
  const PULSE_COLOR = "#00ffff"; // Màu cyan neon

  const toVec2 = (v) => [Number(v?.[0]) || 0, Number(v?.[1]) || 0];

  function getLogicalSize() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas2d.width / dpr || 1;
    const h = canvas2d.height / dpr || 1;
    return { w, h };
  }

  // --- INIT ---
  Vec2D.init2D = function () {
    const App = window.App || {};
    Vec2D.resize2D();
    Vec2D.bind2DEvents();
    if (canvas2d) canvas2d.style.touchAction = "none";
    if (App.applyTheme) App.applyTheme();

    const viewerDiv = document.getElementById("viewer");
    if (viewerDiv) {
      const ro = new ResizeObserver(() => {
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
    if (canvas) canvas.style.display = "block";
    if (threeLayer) threeLayer.style.display = "none";

    requestAnimationFrame(() => {
      Vec2D.resize2D();
      if (!Vec2D._animLoopId) Vec2D.draw2DAllVectors();
    });
  };

  Vec2D.resize2D = function () {
    const rect = document.getElementById("viewer").getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (rect.width === 0 || rect.height === 0) return;
    canvas2d.width = Math.floor(rect.width * dpr);
    canvas2d.height = Math.floor(rect.height * dpr);
    ctx2d.setTransform(1, 0, 0, 1, 0, 0);
    ctx2d.scale(dpr, dpr);
  };

  // --- EVENT HANDLERS (GIỮ NGUYÊN 100%) ---
  function centroidOfPointers(ptrs) {
    let sx = 0,
      sy = 0,
      n = 0;
    for (const p of ptrs.values()) {
      sx += p.x;
      sy += p.y;
      n++;
    }
    if (!n) return null;
    return { x: sx / n, y: sy / n };
  }

  function distanceTwoPointers(ptrs) {
    if (ptrs.size !== 2) return null;
    const it = ptrs.values();
    const a = it.next().value,
      b = it.next().value;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function applyZoomAboutScreenPoint(mx, my, factor) {
    const { w, h } = getLogicalSize();
    const cx = w / 2 + Vec2D.S2D.offsetX;
    const cy = h / 2 + Vec2D.S2D.offsetY;
    const wx = (mx - cx) / Vec2D.S2D.pxPerUnit;
    const wy = (cy - my) / Vec2D.S2D.pxPerUnit;
    Vec2D.S2D.pxPerUnit *= factor;
    if (!isFinite(Vec2D.S2D.pxPerUnit) || Vec2D.S2D.pxPerUnit <= 1e-12)
      Vec2D.S2D.pxPerUnit = 1e-12;
    if (Vec2D.S2D.pxPerUnit > 1e12) Vec2D.S2D.pxPerUnit = 1e12;
    const cxNew = mx - wx * Vec2D.S2D.pxPerUnit;
    const cyNew = my + wy * Vec2D.S2D.pxPerUnit;
    Vec2D.S2D.offsetX = cxNew - w / 2;
    Vec2D.S2D.offsetY = cyNew - h / 2;
  }

  Vec2D.bind2DEvents = function () {
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
      const dt = now - Vec2D.S2D.lastTime || 16;
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
          const factor = Math.pow(rawFactor, 0.9);
          applyZoomAboutScreenPoint(c.x, c.y, factor);
          Vec2D.S2D.zoomVel = Math.log(factor) / dt;
        }
        Vec2D.S2D.lastCentroidX = c.x;
        Vec2D.S2D.lastCentroidY = c.y;
        Vec2D.S2D.lastDist = dist;
        Vec2D.S2D.lastTime = now;
        return;
      }

      if (Vec2D.S2D.isPanningOne && n === 1) {
        if (e.shiftKey) {
          const dy = e.clientY - Vec2D.S2D.lastY;
          const factor = dy > 0 ? 1 + dy * 0.01 : 1 / (1 - dy * 0.01);
          const rect = canvas2d.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          applyZoomAboutScreenPoint(mx, my, factor);
          Vec2D.S2D.lastX = e.clientX;
          Vec2D.S2D.lastY = e.clientY;
          Vec2D.S2D.lastTime = now;
          return;
        }
        Vec2D.S2D.offsetX = e.clientX - Vec2D.S2D.startX;
        Vec2D.S2D.offsetY = e.clientY - Vec2D.S2D.startY;
        Vec2D.S2D.velX = (e.clientX - Vec2D.S2D.lastX) / dt;
        Vec2D.S2D.velY = (e.clientY - Vec2D.S2D.lastY) / dt;
        Vec2D.S2D.lastX = e.clientX;
        Vec2D.S2D.lastY = e.clientY;
        Vec2D.S2D.lastTime = now;
      }
    });

    const endPointer = (e) => {
      const App = window.App || {};
      if (!Vec2D.S2D.pointers.has(e.pointerId)) return;
      Vec2D.S2D.pointers.delete(e.pointerId);
      const n = Vec2D.S2D.pointers.size;

      if (n === 0) {
        if (canvas2d.releasePointerCapture)
          canvas2d.releasePointerCapture(e.pointerId);
        canvas2d.style.cursor = "default";
        Vec2D.S2D.isPanningOne = false;
        Vec2D.S2D.lastCentroidX = Vec2D.S2D.lastCentroidY = null;
        Vec2D.S2D.lastDist = null;
        const panSpeed = Math.hypot(Vec2D.S2D.velX, Vec2D.S2D.velY);
        const hasPanMomentum = panSpeed > 0.01;
        const hasZoomMomentum = Math.abs(Vec2D.S2D.zoomVel) > 1e-4;

        if (hasPanMomentum || hasZoomMomentum) {
          const decayPan = 0.85,
            decayZoom = 0.8;
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
        const rect = canvas2d.getBoundingClientRect();
        const mx = e.clientX - rect.left,
          my = e.clientY - rect.top;
        const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
        applyZoomAboutScreenPoint(mx, my, factor);
        e.preventDefault();
      },
      { passive: false },
    );
  };

  Vec2D.render2DGrid = function () {
    const App = window.App || {};
    const { w, h } = getLogicalSize();
    const cx = w / 2 + Vec2D.S2D.offsetX,
      cy = h / 2 + Vec2D.S2D.offsetY,
      px = Vec2D.S2D.pxPerUnit;

    ctx2d.fillStyle = App.getCSS?.("--card") || "#111";
    ctx2d.fillRect(0, 0, w, h);

    const targetPx = 70;
    const rawStep = targetPx / Math.max(1e-9, px);
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const res = rawStep / mag;
    let stepUnit =
      res <= 1 ? 1 * mag : res <= 2 ? 2 * mag : res <= 5 ? 5 * mag : 10 * mag;
    const tickPx = stepUnit * px;
    const subTickPx = tickPx / 5;

    ctx2d.strokeStyle = App.getCSS?.("--grid-light") || "#2b2b2b";
    ctx2d.lineWidth = 0.5;
    for (let x = cx % subTickPx; x <= w; x += subTickPx) {
      ctx2d.beginPath();
      ctx2d.moveTo(x, 0);
      ctx2d.lineTo(x, h);
      ctx2d.stroke();
    }
    for (let y = cy % subTickPx; y <= h; y += subTickPx) {
      ctx2d.beginPath();
      ctx2d.moveTo(0, y);
      ctx2d.lineTo(w, y);
      ctx2d.stroke();
    }

    ctx2d.strokeStyle = App.getCSS?.("--grid-light") || "#2b2b2b";
    ctx2d.lineWidth = 1.2;
    const startKx = Math.floor(-cx / tickPx) - 1,
      endKx = Math.ceil((w - cx) / tickPx) + 1;
    for (let k = startKx; k <= endKx; k++) {
      const x = cx + k * tickPx;
      ctx2d.beginPath();
      ctx2d.moveTo(x, 0);
      ctx2d.lineTo(x, h);
      ctx2d.stroke();
    }
    const startKy = Math.floor((cy - h) / tickPx) - 1,
      endKy = Math.ceil((cy + h) / tickPx) + 1;
    for (let k = startKy; k <= endKy; k++) {
      const y = cy - k * tickPx;
      ctx2d.beginPath();
      ctx2d.moveTo(0, y);
      ctx2d.lineTo(w, y);
      ctx2d.stroke();
    }

    ctx2d.strokeStyle = App.getCSS?.("--axis") || "#aaa";
    ctx2d.lineWidth = 2;
    ctx2d.beginPath();
    ctx2d.moveTo(0, cy);
    ctx2d.lineTo(w, cy);
    ctx2d.stroke();
    ctx2d.beginPath();
    ctx2d.moveTo(cx, 0);
    ctx2d.lineTo(cx, h);
    ctx2d.stroke();

    ctx2d.fillStyle = App.getCSS?.("--fg") || "#fff";
    ctx2d.font = "12px sans-serif";
    ctx2d.textAlign = "center";
    ctx2d.textBaseline = "top";
    for (let k = startKx; k <= endKx; k++) {
      const unitVal = k * stepUnit;
      if (Math.abs(unitVal) < 1e-9) continue;
      const x = cx + k * tickPx;
      if (Math.abs(x - cx) > 15)
        ctx2d.fillText(parseFloat(unitVal.toPrecision(6)), x, cy + 6);
    }
    ctx2d.textAlign = "right";
    ctx2d.textBaseline = "middle";
    for (let k = startKy; k <= endKy; k++) {
      const unitVal = k * stepUnit;
      if (Math.abs(unitVal) < 1e-9) continue;
      const y = cy - k * tickPx;
      if (Math.abs(y - cy) > 15)
        ctx2d.fillText(parseFloat(unitVal.toPrecision(6)), cx - 8, y);
    }
    ctx2d.textAlign = "right";
    ctx2d.textBaseline = "top";
    ctx2d.fillText("0", cx - 6, cy + 6);

    return { cx, cy, px, stepUnit };
  };

  // --- [NEON PULSE EFFECT] ---
  function draw2DVectorSingle(
    v,
    color,
    highlighted,
    alpha = 1,
    pulseFactor = 0,
    offset = [0, 0],
  ) {
    alpha = Math.max(0, Math.min(1, Number(alpha) || 0));
    const { cx, cy, px } = Vec2D.gridInfo2D;
    // Tính toán tọa độ gốc (đã cộng offset)
    const startX = cx + offset[0] * px;
    const startY = cy - offset[1] * px; // Trục Y canvas ngược chiều Math

    // Tọa độ ngọn (cộng thêm vector v vào điểm gốc)
    const x2 = startX + v[0] * px;
    const y2 = startY - v[1] * px;

    const angle = Math.atan2(y2 - startY, x2 - startX);

    if (highlighted) {
      ctx2d.save();

      // Tính độ rộng và độ mờ theo nhịp xung
      const currentWidth =
        PULSE_MIN_W + (PULSE_MAX_W - PULSE_MIN_W) * pulseFactor;
      const currentAlpha = (0.3 + 0.4 * (1 - pulseFactor)) * alpha;

      // Hào quang
      ctx2d.strokeStyle = PULSE_COLOR;
      ctx2d.globalAlpha = currentAlpha;
      ctx2d.lineWidth = currentWidth;
      ctx2d.lineCap = "round";
      ctx2d.beginPath();
      ctx2d.moveTo(startX, startY);
      ctx2d.lineTo(x2, y2);
      ctx2d.stroke();

      const haloHead = ARROW_HEAD + currentWidth * 0.3;
      ctx2d.beginPath();
      ctx2d.moveTo(x2, y2);
      ctx2d.lineTo(
        x2 - haloHead * Math.cos(angle - Math.PI / 6),
        y2 - haloHead * Math.sin(angle - Math.PI / 6),
      );
      ctx2d.moveTo(x2, y2);
      ctx2d.lineTo(
        x2 - haloHead * Math.cos(angle + Math.PI / 6),
        y2 - haloHead * Math.sin(angle + Math.PI / 6),
      );
      ctx2d.stroke();
      ctx2d.restore();
    }

    // Vector chính
    ctx2d.save();
    ctx2d.globalAlpha = alpha;
    ctx2d.strokeStyle = color;
    ctx2d.lineWidth = VEC_STROKE_W;
    ctx2d.beginPath();
    ctx2d.moveTo(startX, startY);
    ctx2d.lineTo(x2, y2);
    ctx2d.stroke();

    ctx2d.beginPath();
    ctx2d.moveTo(x2, y2);
    ctx2d.lineTo(
      x2 - ARROW_HEAD * Math.cos(angle - Math.PI / 6),
      y2 - ARROW_HEAD * Math.sin(angle - Math.PI / 6),
    );
    ctx2d.moveTo(x2, y2);
    ctx2d.lineTo(
      x2 - ARROW_HEAD * Math.cos(angle + Math.PI / 6),
      y2 - ARROW_HEAD * Math.sin(angle + Math.PI / 6),
    );
    ctx2d.stroke();
    ctx2d.restore();
  }

  // --- HÀM VẼ ĐÈN PIN VÀ CHÙM SÁNG BAO TRÒN ---
  function drawFlashlight2D(ghost) {
    const { cx, cy, px } = Vec2D.gridInfo2D;

    // Tọa độ pixel các đỉnh
    const p1 = { x: cx + ghost.v1[0] * px, y: cy - ghost.v1[1] * px };
    const pr = { x: cx + ghost.res[0] * px, y: cy - ghost.res[1] * px };

    // Tính toán hướng
    let dx = p1.x - pr.x,
      dy = p1.y - pr.y;
    let dist = Math.hypot(dx, dy);
    if (dist < 1) dist = 100;

    const lampOffset = 160 * ghost.scale; // Đèn bay dần vào
    const f = (dist + lampOffset) / dist;
    const lx = pr.x + dx * f;
    const ly = pr.y + dy * f;
    const angle = Math.atan2(pr.y - ly, pr.x - lx);

    // 1. Vẽ chùm sáng (Beam) - Hình nón bao trọn vector
    if (ghost.beamOpacity > 0) {
      ctx2d.save();
      const beamLen = dist + lampOffset + 50;
      const beamRadius = Math.max(100, Math.hypot(pr.x - cx, pr.y - cy) * 1.2);

      ctx2d.translate(lx, ly);
      ctx2d.rotate(angle);

      const grad = ctx2d.createLinearGradient(0, 0, beamLen, 0);
      grad.addColorStop(0, `rgba(255, 235, 59, ${0.4 * ghost.beamOpacity})`);
      grad.addColorStop(1, "rgba(255, 235, 59, 0)");

      ctx2d.fillStyle = grad;
      ctx2d.beginPath();
      ctx2d.moveTo(0, 0);
      ctx2d.lineTo(beamLen, -beamRadius);
      ctx2d.lineTo(beamLen, beamRadius);
      ctx2d.closePath();
      ctx2d.fill();
      ctx2d.restore();
    }

    // 2. Vẽ cái đèn pin (SVG-like)
    ctx2d.save();
    ctx2d.translate(lx, ly);
    ctx2d.rotate(angle);
    ctx2d.scale(ghost.scale, ghost.scale);
    ctx2d.globalAlpha = Math.min(1, ghost.scale * 2);

    // Thân đèn
    ctx2d.fillStyle = "#333";
    ctx2d.fillRect(-60, -15, 60, 30);
    // Đầu đèn
    ctx2d.fillStyle = "#ffc107";
    ctx2d.beginPath();
    ctx2d.moveTo(0, -20);
    ctx2d.lineTo(30, -35);
    ctx2d.lineTo(30, 35);
    ctx2d.lineTo(0, 20);
    ctx2d.fill();
    // Mặt kính
    ctx2d.fillStyle = "#fff";
    ctx2d.beginPath();
    ctx2d.ellipse(30, 0, 5, 35, 0, 0, Math.PI * 2);
    ctx2d.fill();

    ctx2d.restore();
  }
  // --- VÒNG LẶP VẼ CHÍNH ---
  Vec2D.draw2DAllVectors = function () {
    const App = window.App || {};
    if (App.mode !== "2D") {
      if (Vec2D._animLoopId) {
        cancelAnimationFrame(Vec2D._animLoopId);
        Vec2D._animLoopId = null;
      }
      return;
    }

    const time = Date.now() * PULSE_SPEED;
    const pulseFactor = (Math.sin(time) + 1) / 2;

    const { w, h } = getLogicalSize();

    if (
      App.firstDrawForVector &&
      App.currentVector &&
      App.currentVector.length >= 2
    ) {
      App.firstDrawForVector = false;
    }

    Vec2D.gridInfo2D = Vec2D.render2DGrid();

    // Focus Logic: Dim others
    const hasFocus = App.vectorList?.some((v) => v.focus);
    const list = (App.vectorList || []).filter((v) => v.visible !== false);
    list.sort((a, b) => (a.focus ? 1 : 0) - (b.focus ? 1 : 0)); // Focus vẽ sau

    for (const it of list) {
      const v2 = toVec2(it.vec);
      let alpha = typeof it.alpha === "number" ? it.alpha : 1;
      if (hasFocus && !it.focus) alpha *= 0.15; // Mờ đi
      draw2DVectorSingle(
        v2,
        it.colorCss,
        !!it.focus,
        alpha,
        pulseFactor,
        [0, 0],
      );
    }
    if (App.tempGhosts && Array.isArray(App.tempGhosts)) {
      for (const g of App.tempGhosts) {
        if (g.isFlashlight) {
          // [QUAN TRỌNG] Nếu là đèn pin thì gọi hàm vẽ riêng
          drawFlashlight2D(g);

          // Vẽ thêm cái bóng đen (Vector kết quả màu đen)
          const vRes = toVec2(g.res);
          draw2DVectorSingle(vRes, "#000000", false, g.shadowAlpha, 0, [0, 0]);
        } else if (g.isNormalize) {
          const { cx, cy, px } = Vec2D.gridInfo2D;
          // 1. Vẽ vòng kim cô (Đường tròn đơn vị)
          ctx2d.save();
          ctx2d.beginPath();
          ctx2d.arc(cx, cy, 1 * px, 0, Math.PI * 2);
          ctx2d.strokeStyle = `rgba(0, 255, 255, ${g.unitCircleAlpha})`;
          ctx2d.setLineDash([5, 5]); // Nét đứt cho "ngầu"
          ctx2d.lineWidth = 2;
          ctx2d.stroke();
          ctx2d.restore();

          // 2. Vẽ vector ảo đang co dãn (headGlow > 0.4 sẽ bật neon)
          draw2DVectorSingle(
            g.vec,
            g.colorCss,
            g.headGlow > 0.4,
            g.alpha,
            g.headGlow,
            [0, 0],
          );
        } else {
          // Vẽ các ghost bình thường (như phép cộng)
          draw2DVectorSingle(
            g.vec,
            g.colorCss,
            false,
            g.alpha,
            0,
            g.offset || [0, 0],
          );
        }
      }
    }

    if (App.currentAngleVisual2D)
      _drawAngleArc2DOverlay(App.currentAngleVisual2D);
    if (App.currentVector && App.currentVector.length >= 2) {
      const vOriginal = App.currentVector;
      const vStr = App.formatTip
        ? App.formatTip(vOriginal)
        : `[${vOriginal.join(", ")}]`;
      const suffix = vOriginal.length > 2 ? " (Chiếu 2D)" : "";
      App.coordOut?.(`Toạ độ: ${vStr}` + suffix);
    } else {
      App.coordOut?.("—");
    }

    Vec2D._animLoopId = requestAnimationFrame(Vec2D.draw2DAllVectors);
  };

  Vec2D.drawAngleArc2D = function (v1, v2, deg) {
    const a = toVec2(v1),
      b = toVec2(v2);
    const App = window.App || {};
    App.currentAngleVisual2D = {
      a: [a[0], a[1]],
      b: [b[0], b[1]],
      deg: Number(deg),
    };
  };

  function _drawAngleArc2DOverlay(state) {
    const App = window.App || {};
    if (!Vec2D.gridInfo2D || !state) return;
    const { cx, cy } = Vec2D.gridInfo2D;
    const a = state.a,
      b = state.b;
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
    const degShow =
      state.deg != null ? state.deg : Math.abs((delta * 180) / Math.PI);
    ctx2d.font = "14px sans-serif";
    ctx2d.textAlign = "center";
    ctx2d.textBaseline = "middle";
    const textColor =
      App.getCSS?.("--label-fg") || App.getCSS?.("--fg") || "#fff";
    ctx2d.fillStyle = textColor;
    ctx2d.fillText(`${degShow.toFixed(1)}°`, tx, ty);
    ctx2d.restore();
  }

  Vec2D.resetView = function () {
    if (Vec2D._resetAnimId) cancelAnimationFrame(Vec2D._resetAnimId);
    const startX = Vec2D.S2D.offsetX;
    const startY = Vec2D.S2D.offsetY;
    const startScale = Vec2D.S2D.pxPerUnit;
    const targetX = 0;
    const targetY = 0;
    const targetScale = 80;
    const duration = 800;
    const startTime = performance.now();
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    function loop(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeOutCubic(progress);
      Vec2D.S2D.offsetX = startX + (targetX - startX) * ease;
      Vec2D.S2D.offsetY = startY + (targetY - startY) * ease;
      Vec2D.S2D.pxPerUnit = startScale + (targetScale - startScale) * ease;
      if (progress < 1) Vec2D._resetAnimId = requestAnimationFrame(loop);
      else {
        Vec2D._resetAnimId = null;
        Vec2D.S2D.offsetX = targetX;
        Vec2D.S2D.offsetY = targetY;
        Vec2D.S2D.pxPerUnit = targetScale;
      }
    }
    Vec2D._resetAnimId = requestAnimationFrame(loop);
  };
})();
