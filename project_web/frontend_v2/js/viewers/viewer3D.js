// ===================== viewer3D.js (Optimized & Fixed Reset) =====================
(function () {
  // Public namespace
  window.Vec3D = window.Vec3D || {};
  Vec3D._ZOOM_MIN = 1e-12;
  Vec3D._ZOOM_MAX = 1e12;
  const App = window.App || {};
  const toVec3 = (v) => [v?.[0] || 0, v?.[1] || 0, v?.[2] || 0];

  // ===== DEVICE DETECTION =====
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth < 768;

  const GEOM_QUALITY = {
    shaftSeg: isMobile ? 8 : 18,
    headSeg: isMobile ? 12 : 22,
    maxPixel: isMobile ? 1.5 : 2
  };

  // Mount point
  const threeLayer = document.getElementById("threeLayer");

  // Core handles
  Vec3D._scene = null;
  Vec3D._camera = null;
  Vec3D._renderer = null;
  Vec3D._labelRenderer = null;
  Vec3D._controls = null;

  // angle layer
  Vec3D._angleLayer = null;
  Vec3D._vecSignature = "";

  Vec3D.S3D = {
    unitsPerWorld: 1,
    zoomTarget: 1,
    offset: new THREE.Vector3(0, 0, 0),
    pivotMath: new THREE.Vector3(0, 0, 0),
    pivotWorld: new THREE.Vector3(0, 0, 0),
    hasPivot: false
  };

  // Axis & helpers state
  Vec3D._animating = false;
  Vec3D._hover3D = false;
  Vec3D._pressed = new Set();
  Vec3D._kbAnimId = null;
  Vec3D._lastUForVectors = 1;

  // Scene helpers
  Vec3D._axisMaxMath = 50;
  Vec3D._axisMaxWorld = Vec3D._axisMaxMath;
  Vec3D._frameGroup = null;

  Vec3D._axesGroup = null;
  Vec3D._planeXY = null;
  Vec3D._mathGroup = null;
  Vec3D._vectorsGroup = null;

  Vec3D._ticksGroup = null;
  Vec3D._tickLabels = [];
  Vec3D._axisLetters = [];
  Vec3D._lastLabelKey = "";

  // Vectormap
  Vec3D.threeVecMap = new Map(); // id -> group

  // Text sizes
  Vec3D.AXIS_TICK_PX = 26;
  Vec3D.AXIS_LETTER_PX = 30;
  Vec3D.TIP_PX = 22;

  Vec3D.ANGLE_LABEL_PX = 28;
  Vec3D.ANGLE_ARC_GAP_PX = 8;
  Vec3D.ANGLE_RADIUS_RATIO = 0.72;
  Vec3D.ANGLE_LABEL_MIN_RATIO = 0.38;
  Vec3D.ANGLE_LABEL_GAP_PX = 6;

  // ===== Vector thickness config =====
  const VEC_SHAFT_R = 0.1;
  const VEC_HEAD_R = 0.20;
  const VEC_HEAD_H = 0.35;

  // ===== Init =====
  Vec3D.init3D = function () {
    Vec3D.DEFAULT_FOV = 24;

    if (getComputedStyle(threeLayer).display === "none") {
      threeLayer.style.display = "block";
    }
    const rect = threeLayer.getBoundingClientRect();

    Vec3D._renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: true
    });
    Vec3D._renderer.setSize(rect.width || 760, rect.height || 760);
    Vec3D._renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, GEOM_QUALITY.maxPixel));
    threeLayer.appendChild(Vec3D._renderer.domElement);

    Vec3D._renderer.domElement.style.position = "absolute";
    Vec3D._renderer.domElement.style.inset = "0";
    Vec3D._renderer.domElement.style.zIndex = "0";

    Vec3D._labelRenderer = new THREE.CSS2DRenderer();
    Vec3D._labelRenderer.setSize(rect.width || 760, rect.height || 760);
    Vec3D._labelRenderer.domElement.style.position = "absolute";
    Vec3D._labelRenderer.domElement.style.inset = "0";
    Vec3D._labelRenderer.domElement.style.pointerEvents = "none";
    Vec3D._labelRenderer.domElement.style.overflow = "visible";
    Vec3D._labelRenderer.domElement.style.zIndex = "1";
    threeLayer.appendChild(Vec3D._labelRenderer.domElement);

    Vec3D._scene = new THREE.Scene();
    Vec3D._scene.background = new THREE.Color(App.getCSS("--bg"));

    Vec3D._camera = new THREE.PerspectiveCamera(
      Vec3D.DEFAULT_FOV,
      Math.max(1e-6, (rect.width || 760) / (rect.height || 760)),
      0.1,
      1e12
    );
    Vec3D._camera.position.set(100, 100, 100);
    Vec3D._camera.up.set(0, 0, 1); // Z-up

    Vec3D._controls = new THREE.OrbitControls(Vec3D._camera, Vec3D._renderer.domElement);

    Vec3D.S3D.unitsPerWorld = 1;
    Vec3D.S3D.zoomTarget = 1;
    Vec3D.S3D.offset.set(0, 0, 0);
    Vec3D.S3D.hasPivot = false;

    Vec3D._controls.enableDamping = true;
    Vec3D._controls.dampingFactor = 0.07;
    Vec3D._controls.rotateSpeed = 0.6;
    Vec3D._controls.enablePan = true;
    Vec3D._controls.enableZoom = false;

    Vec3D._controls.zoomSpeed = 0;
    Vec3D._controls.zoomToCursor = false;
    Vec3D._controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.PAN
    };
    Vec3D._controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.PAN
    };

    const wheelHandler = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();

      const dir = e.deltaY < 0 ? +1 : -1;
      const factor = dir > 0 ? 1.12 : 1 / 1.12;

      if (
        (Vec3D.S3D.zoomTarget >= Vec3D._ZOOM_MAX && dir > 0) ||
        (Vec3D.S3D.zoomTarget <= Vec3D._ZOOM_MIN && dir < 0)
      ) {
        Vec3D.S3D.hasPivot = false;
        return;
      }

      Vec3D.S3D.pivotMath.set(0, 0, 0);
      Vec3D.S3D.pivotWorld.copy(Vec3D.S3D.offset);
      Vec3D.S3D.hasPivot = true;

      const next = Vec3D.S3D.zoomTarget * factor;
      Vec3D.S3D.zoomTarget = Math.min(Vec3D._ZOOM_MAX, Math.max(Vec3D._ZOOM_MIN, next));
    };

    Vec3D._renderer.domElement.addEventListener("wheel", wheelHandler, { passive: false });
    Vec3D._labelRenderer.domElement.addEventListener("wheel", wheelHandler, { passive: false });

    Vec3D._controls.addEventListener("change", () => {
      if (App.mode !== "3D") return;
      Vec3D.addAxisLabelsDynamic();
      Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
      Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
    });

    window.addEventListener("resize", () => {
      const r = threeLayer.getBoundingClientRect();
      Vec3D._camera.aspect = Math.max(1e-6, (r.width || 760) / (r.height || 760));
      Vec3D._camera.updateProjectionMatrix();
      Vec3D._renderer.setSize(r.width || 760, r.height || 760);
      Vec3D._labelRenderer.setSize(r.width || 760, r.height || 760);
      if (App.mode === "3D") Vec3D.hardRefresh3D(false);
    });

    const ro = new ResizeObserver(() => {
      const r = threeLayer.getBoundingClientRect();
      Vec3D._camera.aspect = Math.max(1e-6, (r.width || 760) / (r.height || 760));
      Vec3D._camera.updateProjectionMatrix();
      Vec3D._renderer.setSize(r.width || 760, r.height || 760);
      Vec3D._labelRenderer.setSize(r.width || 760, r.height || 760);
      if (App.mode === "3D") Vec3D.hardRefresh3D(false);
    });
    ro.observe(threeLayer);

    Vec3D._renderer.domElement.addEventListener("mouseenter", () => {
      Vec3D._hover3D = true;
      threeLayer.focus();
    });
    Vec3D._renderer.domElement.addEventListener("mouseleave", () => {
      Vec3D._hover3D = false;
    });

    document.addEventListener(
      "keydown",
      (e) => {
        const controlsPane = document.getElementById("controls");
        const typing =
          ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) ||
          (controlsPane && controlsPane.contains(e.target));
        if (App.mode !== "3D" || !Vec3D._hover3D || typing) return;

        const key = e.key.toLowerCase();
        Vec3D._pressed.add(key);

        if (["w", "a", "s", "d", "q", "e", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(key)) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      { capture: true }
    );

    document.addEventListener(
      "keyup",
      (e) => {
        const controlsPane = document.getElementById("controls");
        const typing =
          ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) ||
          (controlsPane && controlsPane.contains(e.target));
        if (typing) return;

        const key = e.key.toLowerCase();
        if (Vec3D._pressed.has(key)) {
          Vec3D._pressed.delete(key);
          e.preventDefault();
          e.stopPropagation();
        }
      },
      { capture: true }
    );

    const stepLoop = () => {
      if (App.mode === "3D" && Vec3D._pressed.size && Vec3D._camera && Vec3D._controls) {
        const base = Vec3D._camera.position.distanceTo(Vec3D._controls.target);
        const speed = (Vec3D._pressed.has("shift") ? 0.01 : 0.005) * base;

        const forward = new THREE.Vector3();
        Vec3D._camera.getWorldDirection(forward);
        forward.normalize();

        const worldUp = new THREE.Vector3(0, 0, 1);
        const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();

        const move = new THREE.Vector3();

        if (Vec3D._pressed.has("w")) move.add(forward);
        if (Vec3D._pressed.has("s")) move.sub(forward);
        if (Vec3D._pressed.has("a")) move.sub(right);
        if (Vec3D._pressed.has("d")) move.add(right);

        if (move.lengthSq() > 0) {
          move.normalize().multiplyScalar(speed);
          Vec3D._camera.position.add(move);
          Vec3D._controls.target.add(move);
          Vec3D._controls.update();
        }
      }

      Vec3D._kbAnimId = requestAnimationFrame(stepLoop);
    };

    if (!Vec3D._kbAnimId) Vec3D._kbAnimId = requestAnimationFrame(stepLoop);

    Vec3D.update3DHelpersBase();
    Vec3D.show3D();

    requestAnimationFrame(() => Vec3D.hardRefresh3D(true));
  };

  Vec3D._syncVectorList = function () {
    const list = (App.vectorList || []).map((v) => [
      v.id ?? null,
      v.visible !== false ? 1 : 0,
      +((v.vec?.[0] || 0).toFixed(12)),
      +((v.vec?.[1] || 0).toFixed(12)),
      +((v.vec?.[2] || 0).toFixed(12)),
      v.focus ? 1 : 0,
      +((typeof v.alpha === "number" ? v.alpha : 1).toFixed(3)),
      String(v.colorHex || v.colorCss || "")
    ]);

    const sig = JSON.stringify(list);
    if (sig !== Vec3D._vecSignature) {
      Vec3D._vecSignature = sig;
      Vec3D.draw3DAllVectors({ frame: false });
      Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
      Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
    }
  };

  // ===== Show/loop =====
  Vec3D.show3D = function () {
    document.getElementById("canvas2d").style.display = "none";
    threeLayer.style.display = "block";
    try { threeLayer.focus({ preventScroll: true }); } catch (_) { }
    Vec3D._hover3D = true;

    if (!Vec3D._animating) {
      Vec3D._animating = true;
      (function loop() {
        if (!Vec3D._animating) return;
        requestAnimationFrame(loop);

        if (Vec3D._controls) {
          Vec3D._controls.update();
          Vec3D._syncVectorList();
        }

        const target = Math.min(Vec3D._ZOOM_MAX, Math.max(Vec3D._ZOOM_MIN, Vec3D.S3D.zoomTarget));
        Vec3D.S3D.unitsPerWorld += (target - Vec3D.S3D.unitsPerWorld) * 0.15;

        const diff = Math.abs(Vec3D.S3D.unitsPerWorld - target);
        const eps = Math.max(1e-9, Math.abs(target) * 1e-9);
        if (diff <= eps) {
          Vec3D.S3D.unitsPerWorld = target;
          Vec3D.S3D.hasPivot = false;
        }

        Vec3D.addAxisLabelsDynamic();

        Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
        Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
      })();
    }
  };

  // ===== Helpers (plane + cube + axes) =====
  Vec3D.update3DHelpersBase = function () {
    const Lw = Vec3D._axisMaxWorld;

    if (!Vec3D._frameGroup) {
      Vec3D._frameGroup = new THREE.Group();
      Vec3D._scene.add(Vec3D._frameGroup);
    } else {
      Vec3D._frameGroup.clear();
    }

    const cube = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(Lw * 2, Lw * 2, Lw * 2)),
      new THREE.LineBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.25 })
    );
    Vec3D._frameGroup.add(cube);

    if (!Vec3D._mathGroup) {
      Vec3D._mathGroup = new THREE.Group();
      Vec3D._scene.add(Vec3D._mathGroup);
    } else {
      const keepVectors = Vec3D._vectorsGroup || new THREE.Group();
      const keepAngles = Vec3D._angleLayer || new THREE.Group();
      keepVectors.parent && keepVectors.parent.remove(keepVectors);
      keepAngles.parent && keepAngles.parent.remove(keepAngles);
      Vec3D._mathGroup.clear();
      Vec3D._vectorsGroup = keepVectors;
      Vec3D._angleLayer = keepAngles;
    }

    if (!Vec3D._vectorsGroup) Vec3D._vectorsGroup = new THREE.Group();
    if (!Vec3D._angleLayer) Vec3D._angleLayer = new THREE.Group();

    Vec3D._planeXY = new THREE.Mesh(
      new THREE.PlaneGeometry(Lw * 2, Lw * 2),
      new THREE.MeshBasicMaterial({
        color: App.getCSS("--card"),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.18,
        depthWrite: false
      })
    );
    Vec3D._planeXY.renderOrder = 0;
    Vec3D._planeXY.rotation.set(0, 0, 0);
    Vec3D._mathGroup.add(Vec3D._planeXY);

    Vec3D._axesGroup = (function buildAxesWorld(L) {
      const g = new THREE.Group();
      const mk = (a, b, cssVar) =>
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([a, b]),
          new THREE.LineBasicMaterial({ color: new THREE.Color(App.getCSS(cssVar)) })
        );

      g.add(mk(new THREE.Vector3(-L, 0, 0), new THREE.Vector3(L, 0, 0), "--axis-x"));
      g.add(mk(new THREE.Vector3(0, -L, 0), new THREE.Vector3(0, L, 0), "--axis-y"));
      g.add(mk(new THREE.Vector3(0, 0, -L), new THREE.Vector3(0, 0, L), "--axis-z"));
      return g;
    })(Lw);

    Vec3D._mathGroup.add(Vec3D._axesGroup);
    Vec3D._mathGroup.add(Vec3D._vectorsGroup);
    Vec3D._mathGroup.add(Vec3D._angleLayer);

    Vec3D._mathGroup.position.copy(Vec3D.S3D.offset);
  };

  // ===== Axis ticks & labels (math-zoom aware) =====
  function niceStep(raw) {
    raw = Math.max(1e-12, Math.abs(raw));
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const s = raw / p;
    const m = s <= 1 ? 1 : s <= 2 ? 2 : s <= 5 ? 5 : 10;
    return m * p;
  }

  function formatTick(v, step) {
    if (!isFinite(v)) return "";
    const abs = Math.abs(v);
    if (abs === 0) return "0";

    const s = Math.max(1e-300, Math.abs(step || 1));
    const expStep = Math.floor(Math.log10(s));
    const expV = Math.floor(Math.log10(abs));
    let sig = 1 + (expV - expStep);
    sig = Math.max(1, Math.min(6, sig));

    if (abs >= 1e6 || abs < 1e-6) return Number(v).toExponential(sig - 1).replace("+", "");

    const dec = Math.max(0, -expStep);
    let out = (Math.round(v / step) * step).toFixed(Math.min(6, dec));
    if (out.includes(".")) out = out.replace(/\.?0+$/, "");
    return out;
  }

  Vec3D.addAxisLabelsDynamic = function () {
    if (!Vec3D._camera || !Vec3D._renderer || !Vec3D._mathGroup) return;

    const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
    const Lw = Vec3D._axisMaxWorld;
    const Lm = Lw / u;

    if (Vec3D.S3D.hasPivot) {
      const pos = Vec3D.S3D.pivotWorld.clone().sub(Vec3D.S3D.pivotMath.clone().multiplyScalar(u));
      Vec3D.S3D.offset.copy(pos);
    }
    Vec3D._mathGroup.position.copy(Vec3D.S3D.offset);

    const dist = Vec3D._camera.position.distanceTo(Vec3D._controls?.target || new THREE.Vector3());
    const vFOV = (Vec3D._camera.fov * Math.PI) / 180;
    const screenH = Math.max(1, Vec3D._renderer.domElement.clientHeight);
    const worldH = 2 * Math.tan(vFOV / 2) * dist;
    const pxPerWorld = screenH / worldH;
    const pxPerMath = pxPerWorld * u;
    Vec3D._pxPerWorld = pxPerWorld;

    if (Math.abs(u - (Vec3D._lastUForVectors || 0)) > 1e-6) {
      Vec3D.draw3DAllVectors({ frame: false });

      const g = App.currentAngleVisual3D;
      if (g?.userData?.angleMeta) {
        const u0 = g.userData.angleMeta.createdU || 1;
        const s = u / u0;
        g.scale.set(s, s, s);
        g.userData.angleMeta.createdU = u;
      }
      Vec3D._lastUForVectors = u;
    }

    const targetPx = 70;
    const step = niceStep(targetPx / Math.max(1e-9, pxPerMath));

    const off = Vec3D.S3D.offset;
    const key = `${Lw}|${step}|${u}|${App.theme}|${Math.round(dist * 1000)}|${off.x.toFixed(4)},${off.y.toFixed(4)},${off.z.toFixed(4)}`;
    if (key === Vec3D._lastLabelKey) return;
    Vec3D._lastLabelKey = key;

    if (Vec3D._ticksGroup) {
      Vec3D._mathGroup.remove(Vec3D._ticksGroup);
      Vec3D._ticksGroup.geometry.dispose();
      Vec3D._ticksGroup.material.dispose();
      Vec3D._ticksGroup = null;
    }
    for (const o of Vec3D._tickLabels) {
      o.element?.remove();
      o.parent?.remove(o);
    }
    for (const o of Vec3D._axisLetters) {
      o.element?.remove();
      o.parent?.remove(o);
    }
    Vec3D._tickLabels.length = 0;
    Vec3D._axisLetters.length = 0;

    const t0x = -Vec3D.S3D.offset.x / u;
    const t0y = -Vec3D.S3D.offset.y / u;
    const t0z = -Vec3D.S3D.offset.z / u;

    function buildMajorsAround(t0) {
      const start = Math.ceil((t0 - Lm) / step) * step;
      const end = Math.floor((t0 + Lm) / step) * step;
      const arr = [];
      for (let t = start; t <= end + 1e-12; t += step) arr.push(+t.toFixed(12));
      return arr;
    }

    const majorsX = buildMajorsAround(t0x);
    const majorsY = buildMajorsAround(t0y);
    const majorsZ = buildMajorsAround(t0z);

    const tickLenW = Math.max(Lw * 0.02, 0.25);
    const pos = [];

    const addMajor = (axis, tMath) => {
      const s = tMath * u;
      if (axis === "x") pos.push(s, -tickLenW, 0, s, +tickLenW, 0);
      if (axis === "y") pos.push(-tickLenW, s, 0, +tickLenW, s, 0);
      if (axis === "z") pos.push(-tickLenW, 0, s, +tickLenW, 0, s);
    };

    majorsX.forEach((t) => addMajor("x", t));
    majorsY.forEach((t) => addMajor("y", t));
    majorsZ.forEach((t) => addMajor("z", t));

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    Vec3D._ticksGroup = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: new THREE.Color(App.getCSS("--grid-light")).getHex() })
    );
    Vec3D._mathGroup.add(Vec3D._ticksGroup);

    const putLabel = (axis, tMath) => {
      if (Math.abs(tMath) <= 1e-12) return;
      const txt = formatTick(tMath, step);

      const outer = document.createElement("div");
      outer.className = "axis-label-outer";
      const inner = document.createElement("div");
      inner.className = `axis-label-inner axis-${axis}`;
      inner.textContent = txt;
      inner.style.color = axis === "x" ? App.getCSS("--axis-x") : axis === "y" ? App.getCSS("--axis-y") : App.getCSS("--axis-z");
      outer.appendChild(inner);

      const obj = new THREE.CSS2DObject(outer);
      const s = tMath * u;
      obj.position.set(axis === "x" ? s : 0, axis === "y" ? s : 0, axis === "z" ? s : 0);
      Vec3D._mathGroup.add(obj);
      Vec3D._tickLabels.push(obj);
    };

    majorsX.forEach((t) => putLabel("x", t));
    majorsY.forEach((t) => putLabel("y", t));
    majorsZ.forEach((t) => putLabel("z", t));

    const letterOffW = Lw * 0.98;
    const addLetter = (txt, axis, position) => {
      const el = document.createElement("div");
      el.className = "axis-letter";
      el.textContent = txt;
      el.style.color = axis === "x" ? App.getCSS("--axis-x") : axis === "y" ? App.getCSS("--axis-y") : App.getCSS("--axis-z");
      const obj = new THREE.CSS2DObject(el);
      obj.position.copy(position);
      Vec3D._mathGroup.add(obj);
      Vec3D._axisLetters.push(obj);
    };

    addLetter("X", "x", new THREE.Vector3(letterOffW, 0, 0));
    addLetter("Y", "y", new THREE.Vector3(0, letterOffW, 0));
    addLetter("Z", "z", new THREE.Vector3(0, 0, letterOffW));

    (function updateTipLabels() {
      if (!Vec3D._vectorsGroup) return;
      const desiredPx = 16;
      const offsetW = desiredPx / (Vec3D._pxPerWorld || 1);
      for (const g of Vec3D._vectorsGroup.children) {
        const tip = g.userData?.tipLocal;
        const dir = g.userData?.dirLocal;
        if (!tip || !dir) continue;
        const lbl = g.children.find((ch) => ch.isCSS2DObject && ch.name === "tipLabel");
        if (!lbl) continue;
        lbl.position.copy(tip.clone().add(dir.clone().multiplyScalar(offsetW)));
      }
    })();

    (function updateAngleLabel() {
      const g = App.currentAngleVisual3D;
      if (!g || !g.userData?.angleMeta) return;

      const { midDir, r, labelPx = Vec3D.ANGLE_LABEL_PX, gapPx = Vec3D.ANGLE_LABEL_GAP_PX } = g.userData.angleMeta;
      const lbl = g.children.find((ch) => ch.isCSS2DObject);
      if (!lbl) return;

      const pxPerWorld = Vec3D._pxPerWorld || 1;
      const s = g.scale?.x || 1;

      const padPx = (gapPx || 0) + (labelPx || 0) * 0.5;
      const insetW = padPx / pxPerWorld;
      const minInside = r * (Vec3D.ANGLE_LABEL_MIN_RATIO || 0.38);

      const distLocal = Math.max(minInside, r - insetW / s);
      lbl.position.copy(midDir.clone().multiplyScalar(distLocal));
    })();
  };

  // ===== Projection (dashed) =====
  Vec3D.buildProjectionGroupZUp = function (vecWorld, colorCSS = "#444", alpha = 1) {
    const g = new THREE.Group();
    const [x, y, z] = vecWorld;

    const mat = new THREE.LineDashedMaterial({
      color: new THREE.Color(colorCSS),
      dashSize: 0.6,
      gapSize: 0.35,
      transparent: true,
      opacity: Math.max(0, Math.min(1, Number(alpha) || 0))
    });

    const mk = (pts) => {
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const l = new THREE.Line(geo, mat);
      l.computeLineDistances();
      return l;
    };

    g.add(mk([new THREE.Vector3(x, y, z), new THREE.Vector3(x, y, 0)]));
    g.add(mk([new THREE.Vector3(x, y, z), new THREE.Vector3(0, y, z)]));
    g.add(mk([new THREE.Vector3(x, y, z), new THREE.Vector3(x, 0, z)]));

    g.add(mk([new THREE.Vector3(x, y, 0), new THREE.Vector3(x, 0, 0)]));
    g.add(mk([new THREE.Vector3(x, y, 0), new THREE.Vector3(0, y, 0)]));
    g.add(mk([new THREE.Vector3(0, y, z), new THREE.Vector3(0, 0, z)]));
    g.add(mk([new THREE.Vector3(x, 0, z), new THREE.Vector3(0, 0, z)]));

    g.add(mk([new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, y, 0)]));
    g.add(mk([new THREE.Vector3(0, y, 0), new THREE.Vector3(x, y, 0)]));
    g.add(mk([new THREE.Vector3(0, 0, z), new THREE.Vector3(x, 0, z)]));
    g.add(mk([new THREE.Vector3(0, 0, z), new THREE.Vector3(0, y, z)]));

    return g;
  };

  // ===== Clip tip to cube (math) =====
  function clipToCubeMath(x, y, z, L) {
    const tip = new THREE.Vector3(x, y, z);
    if (Math.abs(x) <= L && Math.abs(y) <= L && Math.abs(z) <= L) return tip;

    const tx = x ? (Math.sign(x) * L) / x : Infinity;
    const ty = y ? (Math.sign(y) * L) / y : Infinity;
    const tz = z ? (Math.sign(z) * L) / z : Infinity;

    const t = Math.min(tx > 0 ? tx : Infinity, ty > 0 ? ty : Infinity, tz > 0 ? tz : Infinity);
    return isFinite(t) ? tip.multiplyScalar(t) : new THREE.Vector3(0, 0, 0);
  }

  Vec3D._sameVec = function (a, b, eps = 1e-9) {
    if (!a || !b) return false;
    return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps && Math.abs(a[2] - b[2]) < eps;
  };

  Vec3D._maybeInvalidateAngle = function () {
    const g = App.currentAngleVisual3D;
    if (!g?.userData?.angleMeta?.src) return;

    const { a: A0, b: B0 } = g.userData.angleMeta.src;
    const cur = (App.vectorList || []).filter((v) => v.visible !== false);

    const hasA = cur.some((v) => Vec3D._sameVec([v.vec[0] || 0, v.vec[1] || 0, v.vec[2] || 0], A0));
    const hasB = cur.some((v) => Vec3D._sameVec([v.vec[0] || 0, v.vec[1] || 0, v.vec[2] || 0], B0));

    if (!(hasA && hasB) || cur.length === 0) Vec3D.clearAngle();
  };

  // ===== Draw all vectors =====
  Vec3D.draw3DAllVectors = function (opts = { frame: false }) {
    Vec3D._maybeInvalidateAngle();

    if (!Vec3D._mathGroup) return;
    if (!Vec3D._vectorsGroup) {
      Vec3D._vectorsGroup = new THREE.Group();
      Vec3D._mathGroup.add(Vec3D._vectorsGroup);
    }

    Vec3D._vectorsGroup.traverse((obj) => {
      if (obj.isCSS2DObject && obj.element) obj.element.remove();
      if (obj.geometry) obj.geometry.dispose?.();
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m?.dispose?.());
      else obj.material?.dispose?.();
    });
    Vec3D._vectorsGroup.clear();
    Vec3D.threeVecMap.clear();

    const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
    const Lw = Vec3D._axisMaxWorld;
    const Lm = Lw / u;

    const focused = App.vectorList.find((v) => v.focus);
    const list = focused ? [focused] : (App.vectorList || []).filter((v) => v.visible !== false);

    for (const it of list) {
      const v = [it.vec[0] || 0, it.vec[1] || 0, it.vec[2] || 0];

      const aItem = (typeof it.alpha === "number") ? Math.max(0, Math.min(1, it.alpha)) : 1;
      if (aItem <= 0.001) continue;

      const tipM = clipToCubeMath(v[0], v[1], v[2], Lm);
      const tipLocal = tipM.clone().multiplyScalar(u);

      const len = Math.max(tipLocal.length(), 1e-9);
      const dirLocal = len > 1e-9 ? tipLocal.clone().normalize() : new THREE.Vector3(1, 0, 0);

      const shaftLen = Math.max(len - VEC_HEAD_H, 1e-6);

      const color = new THREE.Color(it.colorHex || it.colorCss || "#ffffff");

      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(VEC_SHAFT_R, VEC_SHAFT_R, shaftLen, GEOM_QUALITY.shaftSeg, 1, true),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: aItem })
      );
      shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirLocal);
      shaft.position.copy(dirLocal.clone().multiplyScalar(shaftLen / 2));

      const head = new THREE.Mesh(
        new THREE.ConeGeometry(VEC_HEAD_R, VEC_HEAD_H, GEOM_QUALITY.headSeg),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: aItem })
      );
      head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirLocal);
      head.position.copy(tipLocal.clone().addScaledVector(dirLocal, -VEC_HEAD_H / 2));

      const proj = Vec3D.buildProjectionGroupZUp([tipLocal.x, tipLocal.y, tipLocal.z], App.getCSS("--axis"), aItem * 0.9);

      const el = document.createElement("div");
      el.className = "tip-label";
      el.textContent = App.formatTip(v);
      el.style.opacity = String(aItem);
      const labelEl = new THREE.CSS2DObject(el);
      labelEl.name = "tipLabel";
      labelEl.position.copy(tipLocal);

      const group = new THREE.Group();
      group.userData.tipLocal = tipLocal;
      group.userData.dirLocal = dirLocal;

      if (App._basisAnimActive && it._basisIsBasis) {
        group.renderOrder = 999;
        shaft.renderOrder = 999;
        head.renderOrder = 999;
        shaft.material.depthTest = false;
        head.material.depthTest = false;
        shaft.material.depthWrite = false;
        head.material.depthWrite = false;
      } else {
        group.renderOrder = 1;
      }

      group.add(shaft, head, proj, labelEl);
      Vec3D._vectorsGroup.add(group);
      Vec3D.threeVecMap.set(it.id, group);

    }

    if (opts.frame) {
      const longestMath = App.vectorList.length
        ? Math.max(
          ...App.vectorList.map((it) => {
            const a = toVec3(it.vec);
            return new THREE.Vector3(a[0], a[1], a[2]).length();
          })
        )
        : 1;

      const targetWorld = Lw * 0.55;
      const uFit = targetWorld / Math.max(1e-9, longestMath);

      Vec3D.S3D.unitsPerWorld = Vec3D.S3D.zoomTarget = Math.min(Vec3D._ZOOM_MAX, Math.max(Vec3D._ZOOM_MIN, uFit));
      Vec3D._lastUForVectors = Vec3D.S3D.unitsPerWorld;
      Vec3D.S3D.offset.set(0, 0, 0);

      const dist = Math.max(32, Lw * 1.15);
      Vec3D._camera.position.set(dist, dist, dist);
      Vec3D._controls.target.copy(Vec3D.S3D.offset);
      Vec3D._controls.update();
    }

    if (App.currentVector) {
      const v = toVec3(App.currentVector);
      App.coordOut(App.formatTip(v) + " in standard basis");
    } else {
      App.coordOut("—");
    }
  };

  // ===== Angle cleanup =====
  Vec3D.clearAngle = function () {
    const g = App.currentAngleVisual3D;
    if (!g) return;
    (g.parent || Vec3D._mathGroup || Vec3D._scene).remove(g);
    g.traverse((obj) => {
      obj.element?.remove?.();
      obj.geometry?.dispose?.();
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m?.dispose?.());
      else obj.material?.dispose?.();
    });
    App.currentAngleVisual3D = null;
  };

  Vec3D.refreshAngleTheme = function () {
    const g = App.currentAngleVisual3D;
    if (!g) return;

    const sectorColor = new THREE.Color(App.getCSS("--angle") || "#ffb703");
    g.children.forEach((ch) => {
      if (ch.isMesh && ch.material?.color) ch.material.color.copy(sectorColor);
      if (ch.isCSS2DObject) {
        const el = ch.element;
        el.style.background = App.getCSS("--chip-bg") || "rgba(0,0,0,.45)";
        el.style.border = `1px solid ${App.getCSS("--chip-border") || "rgba(255,255,255,.22)"}`;
        el.style.color = App.getCSS("--chip-fg") || App.getCSS("--fg") || "#fff";
        el.style.textShadow = "0 1px 1px rgba(0,0,0,.35)";
      }
    });

    Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
    Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
  };

  Vec3D.removeAllAngleVisuals = function () {
    const sweep = (root) => {
      if (!root) return;
      const trash = [];
      root.traverse((o) => {
        if (o.userData?.isAngleSector) trash.push(o);
      });
      trash.forEach((g) => {
        (g.parent || root).remove(g);
        g.traverse((obj) => {
          obj.element?.remove?.();
          obj.geometry?.dispose?.();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m?.dispose?.());
          else obj.material?.dispose?.();
        });
      });
    };
    sweep(Vec3D._mathGroup);
    sweep(Vec3D._scene);
    App.currentAngleVisual3D = null;
  };

  // ===== Angle sector =====
  Vec3D.drawAngleArc3D = function (v1, v2, rad, deg) {
    Vec3D.removeAllAngleVisuals();

    const a3 = toVec3(v1);
    const b3 = toVec3(v2);
    const a = new THREE.Vector3(a3[0], a3[1], a3[2]);
    const b = new THREE.Vector3(b3[0], b3[1], b3[2]);

    if (a.length() < 1e-9 || b.length() < 1e-9 || !isFinite(rad) || rad <= 1e-9) return;

    const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
    const au = a.clone().multiplyScalar(u);
    const bu = b.clone().multiplyScalar(u);

    const planeN = new THREE.Vector3().crossVectors(au, bu);
    if (planeN.lengthSq() < 1e-18) return;
    planeN.normalize();

    const xDir = au.clone().normalize();
    const yDir = new THREE.Vector3().crossVectors(planeN, xDir).normalize();

    const r = Math.min(au.length(), bu.length()) * (Vec3D.ANGLE_RADIUS_RATIO || 0.72);
    const sweep = rad;
    const segments = Math.max(32, Math.ceil((sweep * 64) / Math.PI));
    const geom = new THREE.RingGeometry(0, r, segments, 1, 0, sweep);

    const angleColor = App.getCSS("--angle") || "#ffd166";
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(angleColor),
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    const sector = new THREE.Mesh(geom, mat);
    sector.renderOrder = 2;

    const basis = new THREE.Matrix4().makeBasis(xDir, yDir, planeN);
    sector.applyMatrix4(basis);

    const midDirUnit = xDir.clone().applyAxisAngle(planeN, sweep / 2).normalize();
    const el = document.createElement("div");
    el.className = "tip-label angle-badge";
    el.textContent = `${deg.toFixed(1)}°`;

    const lbl = new THREE.CSS2DObject(el);
    lbl.position.copy(midDirUnit.clone().multiplyScalar(r * 0.6));

    el.style.background = App.getCSS("--chip-bg") || "rgba(0,0,0,.45)";
    el.style.border = `1px solid ${App.getCSS("--chip-border") || "rgba(255,255,255,.22)"}`;
    el.style.color = App.getCSS("--chip-fg") || App.getCSS("--fg") || "#fff";
    el.style.padding = "2px 6px";
    el.style.borderRadius = "8px";
    el.style.fontWeight = "600";
    el.style.textShadow = "0 1px 1px rgba(0,0,0,.35)";

    const group = new THREE.Group();
    group.userData.isAngleSector = true;
    group.userData.angleMeta = {
      midDir: midDirUnit.clone(),
      r,
      createdU: u,
      src: { a: [a.x, a.y, a.z], b: [b.x, b.y, b.z] },
      labelPx: Vec3D.ANGLE_LABEL_PX,
      gapPx: Vec3D.ANGLE_LABEL_GAP_PX
    };

    group.add(sector, lbl);

    if (!Vec3D._angleLayer) {
      Vec3D._angleLayer = new THREE.Group();
      if (Vec3D._mathGroup) Vec3D._mathGroup.add(Vec3D._angleLayer);
    }
    Vec3D._angleLayer.add(group);
    App.currentAngleVisual3D = group;
  };

  // ===== Hard refresh =====
  Vec3D.hardRefresh3D = function (frameFirst = false) {
    if (App.mode !== "3D") return;
    Vec3D.draw3DAllVectors({ frame: frameFirst });

    Vec3D._controls.update();
    Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
    Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
  };

  Vec3D.setFOV = function (fovDeg = 24) {
    if (!Vec3D._camera) return;
    Vec3D._camera.fov = Math.max(5, Math.min(90, fovDeg));
    Vec3D._camera.updateProjectionMatrix();
    Vec3D.hardRefresh3D(false);
  };

  // --- HÀM RESET VIEW 3D (CAMERA FLY ANIMATION) ---
  Vec3D.resetView = function () {
    if (!Vec3D._camera || !Vec3D._controls) return;
    if (Vec3D._resetAnimId) cancelAnimationFrame(Vec3D._resetAnimId);

    // 1. Điểm xuất phát
    const startPos = Vec3D._camera.position.clone();
    const startTarget = Vec3D._controls.target.clone(); // Điểm camera đang nhìn vào
    const startZoom = Vec3D.S3D.unitsPerWorld; // Zoom của hệ trục (nếu có)

    // 2. Điểm đích
    const targetPos = new THREE.Vector3(100, 100, 100); // Vị trí mặc định (như trong init)
    const targetLookAt = new THREE.Vector3(0, 0, 0); // Nhìn vào gốc
    const targetZoom = 1; // Reset scale trục

    const duration = 1000; // 1 giây cho 3D (vì không gian rộng nên cần chậm hơn xíu)
    const startTime = performance.now();
    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4); // Mượt hơn cả Cubic

    function loop(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeOutQuart(progress);

      // Nội suy vị trí Camera
      Vec3D._camera.position.lerpVectors(startPos, targetPos, ease);

      // Nội suy điểm nhìn (Target)
      Vec3D._controls.target.lerpVectors(startTarget, targetLookAt, ease);

      // Nội suy Zoom trục (quan trọng để trục không bị to/nhỏ bất thường)
      Vec3D.S3D.unitsPerWorld = startZoom + (targetZoom - startZoom) * ease;
      Vec3D.S3D.zoomTarget = Vec3D.S3D.unitsPerWorld; // Đồng bộ để chuột không bị giật lại

      // Cập nhật Controls
      Vec3D._controls.update();

      // Vẽ lại (Render loop chính của 3D sẽ tự vẽ, nhưng gọi thêm cho chắc nếu loop đang dừng)
      if (!Vec3D._animating) {
        Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
        Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
        Vec3D.addAxisLabelsDynamic();
      }

      if (progress < 1) {
        Vec3D._resetAnimId = requestAnimationFrame(loop);
      } else {
        Vec3D._resetAnimId = null;
        // Reset offset nội bộ về 0
        Vec3D.S3D.offset.set(0, 0, 0);
        Vec3D.S3D.hasPivot = false;
        Vec3D.hardRefresh3D(false);
      }
    }

    Vec3D._resetAnimId = requestAnimationFrame(loop);
  };

})(); 