// ===================== viewer3D.js (FULL FINAL - FIXED FLASH & GHOST) =====================
(function () {
  window.Vec3D = window.Vec3D || {};

  // --- CẤU HÌNH & CONSTANTS ---
  Vec3D._ZOOM_MIN = 1e-12;
  Vec3D._ZOOM_MAX = 1e12;

  const App = window.App || {};
  const toVec3 = (v) => [
    Number(v?.[0]) || 0,
    Number(v?.[1]) || 0,
    Number(v?.[2]) || 0,
  ];

  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) || window.innerWidth < 768;

  const GEOM_QUALITY = {
    shaftSeg: isMobile ? 12 : 24,
    headSeg: isMobile ? 16 : 32,
    maxPixel: isMobile ? 1.5 : 2,
  };

  const threeLayer = document.getElementById("threeLayer");

  // --- CORE HANDLES ---
  Vec3D._scene = null;
  Vec3D._camera = null;
  Vec3D._renderer = null;
  Vec3D._labelRenderer = null;
  Vec3D._controls = null;

  Vec3D._angleLayer = null;
  Vec3D._vecSignature = "";

  // --- STATE ---
  Vec3D.S3D = {
    unitsPerWorld: 1,
    zoomTarget: 1,
    offset: new THREE.Vector3(0, 0, 0),
    pivotMath: new THREE.Vector3(0, 0, 0),
    pivotWorld: new THREE.Vector3(0, 0, 0),
    hasPivot: false,
  };

  Vec3D._animating = false;
  Vec3D._hover3D = false;
  Vec3D._pressed = new Set();
  Vec3D._kbAnimId = null;
  Vec3D._lastUForVectors = 1;

  // --- CONFIG AXIS ---
  Vec3D._axisMaxMath = 20;
  Vec3D._axisMaxWorld = Vec3D._axisMaxMath;

  // --- GROUPS ---
  Vec3D._frameGroup = null;
  Vec3D._axesGroup = null;
  Vec3D._planeXY = null;
  Vec3D._mathGroup = null;
  Vec3D._vectorsGroup = null;
  Vec3D._ticksGroup = null;
  Vec3D._tickLabels = [];
  Vec3D._axisLetters = [];
  Vec3D._lastLabelKey = "";
  Vec3D.threeVecMap = new Map();

  // --- VISUAL CONFIG ---
  Vec3D.AXIS_TICK_PX = 26;
  Vec3D.AXIS_LETTER_PX = 30;
  Vec3D.TIP_PX = 22;
  Vec3D.ANGLE_LABEL_PX = 28;
  Vec3D.ANGLE_ARC_GAP_PX = 8;
  Vec3D.ANGLE_RADIUS_RATIO = 0.72;
  Vec3D.ANGLE_LABEL_MIN_RATIO = 0.38;
  Vec3D.ANGLE_LABEL_GAP_PX = 6;

  const VEC_SHAFT_R = 0.025;
  const VEC_HEAD_R = 0.08;
  const VEC_HEAD_H = 0.25;

  // [ENERGY PULSE CONFIG 3D]
  const PULSE_COLOR_3D = 0x00ffff;
  const PULSE_SPEED_3D = 0.005;
  const PULSE_SCALE_ADD = 0.3;

  // =========================================================
  // INITIALIZATION
  // =========================================================
  Vec3D.init3D = function () {
    if (Vec3D._scene) return;

    Vec3D.DEFAULT_FOV = 24;

    if (getComputedStyle(threeLayer).display === "none") {
      threeLayer.style.display = "block";
    }
    const rect = threeLayer.getBoundingClientRect();

    // 1. WebGL Renderer
    Vec3D._renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: true,
    });
    Vec3D._renderer.setSize(rect.width || 760, rect.height || 760);
    Vec3D._renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, GEOM_QUALITY.maxPixel),
    );
    threeLayer.appendChild(Vec3D._renderer.domElement);

    Vec3D._renderer.domElement.style.position = "absolute";
    Vec3D._renderer.domElement.style.inset = "0";
    Vec3D._renderer.domElement.style.zIndex = "0";

    // 2. CSS2D Renderer (Labels)
    Vec3D._labelRenderer = new THREE.CSS2DRenderer();
    Vec3D._labelRenderer.setSize(rect.width || 760, rect.height || 760);
    Vec3D._labelRenderer.domElement.style.position = "absolute";
    Vec3D._labelRenderer.domElement.style.inset = "0";
    Vec3D._labelRenderer.domElement.style.pointerEvents = "none";
    Vec3D._labelRenderer.domElement.style.overflow = "visible";
    Vec3D._labelRenderer.domElement.style.zIndex = "1";
    threeLayer.appendChild(Vec3D._labelRenderer.domElement);

    // 3. Scene & Camera
    Vec3D._scene = new THREE.Scene();
    Vec3D._scene.background = new THREE.Color(
      App.getCSS?.("--bg") || "#ffffff",
    );

    Vec3D._camera = new THREE.PerspectiveCamera(
      Vec3D.DEFAULT_FOV,
      Math.max(1e-6, (rect.width || 760) / (rect.height || 760)),
      0.1,
      1e12,
    );
    Vec3D._camera.position.set(10, 10, 10);
    Vec3D._camera.up.set(0, 0, 1);

    // 4. Controls
    Vec3D._controls = new THREE.OrbitControls(
      Vec3D._camera,
      Vec3D._renderer.domElement,
    );
    Vec3D.S3D.unitsPerWorld = 1;
    Vec3D.S3D.zoomTarget = 1;
    Vec3D.S3D.offset.set(0, 0, 0);
    Vec3D.S3D.hasPivot = false;

    Vec3D._controls.enableDamping = true;
    Vec3D._controls.dampingFactor = 0.07;
    Vec3D._controls.rotateSpeed = 0.6;
    Vec3D._controls.enablePan = true;
    Vec3D._controls.enableZoom = false; // Custom Zoom logic below
    Vec3D._controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.PAN,
    };
    Vec3D._controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.PAN,
    };

    // --- Custom Wheel Zoom ---
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
      Vec3D.S3D.zoomTarget = Math.min(
        Vec3D._ZOOM_MAX,
        Math.max(Vec3D._ZOOM_MIN, next),
      );
    };
    Vec3D._renderer.domElement.addEventListener("wheel", wheelHandler, {
      passive: false,
    });
    Vec3D._labelRenderer.domElement.addEventListener("wheel", wheelHandler, {
      passive: false,
    });

    // --- Event Listeners ---
    Vec3D._controls.addEventListener("change", () => {
      if (App.mode !== "3D") return;
      Vec3D.addAxisLabelsDynamic();
      Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
      Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
    });

    window.addEventListener("resize", () => {
      const r = threeLayer.getBoundingClientRect();
      Vec3D._camera.aspect = Math.max(
        1e-6,
        (r.width || 760) / (r.height || 760),
      );
      Vec3D._camera.updateProjectionMatrix();
      Vec3D._renderer.setSize(r.width || 760, r.height || 760);
      Vec3D._labelRenderer.setSize(r.width || 760, r.height || 760);
      if (App.mode === "3D") Vec3D.hardRefresh3D(false);
    });

    const ro = new ResizeObserver(() => {
      const r = threeLayer.getBoundingClientRect();
      Vec3D._camera.aspect = Math.max(
        1e-6,
        (r.width || 760) / (r.height || 760),
      );
      Vec3D._camera.updateProjectionMatrix();
      Vec3D._renderer.setSize(r.width || 760, r.height || 760);
      Vec3D._labelRenderer.setSize(r.width || 760, r.height || 760);
      if (App.mode === "3D") Vec3D.hardRefresh3D(false);
    });
    ro.observe(threeLayer);

    // Keyboard Controls
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
        if (
          [
            "w",
            "a",
            "s",
            "d",
            "q",
            "e",
            "arrowup",
            "arrowdown",
            "arrowleft",
            "arrowright",
            "shift",
          ].includes(key)
        ) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      {
        capture: true,
      },
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
      {
        capture: true,
      },
    );

    // --- Keyboard Move Loop ---
    const stepLoop = () => {
      if (
        App.mode === "3D" &&
        Vec3D._pressed.size &&
        Vec3D._camera &&
        Vec3D._controls
      ) {
        const base = Vec3D._camera.position.distanceTo(Vec3D._controls.target);
        const speed = (Vec3D._pressed.has("shift") ? 0.01 : 0.005) * base;
        const forward = new THREE.Vector3();
        Vec3D._camera.getWorldDirection(forward);
        forward.normalize();
        const worldUp = new THREE.Vector3(0, 0, 1);
        const right = new THREE.Vector3()
          .crossVectors(forward, worldUp)
          .normalize();
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
    requestAnimationFrame(() => Vec3D.hardRefresh3D(false));
  };

  // =========================================================
  // SYNC & RENDER LOOP
  // =========================================================
  Vec3D._syncVectorList = function () {
    const list = (App.vectorList || []).map((v) => [
      v.id ?? null,
      v.visible !== false ? 1 : 0,
      ...toVec3(v.vec).map((val) => +val.toFixed(12)),
      v.focus ? 1 : 0,
      +(typeof v.alpha === "number" ? v.alpha : 1).toFixed(3),
      String(v.colorHex || v.colorCss || ""),
    ]);
    const sig = JSON.stringify(list);
    if (sig !== Vec3D._vecSignature) {
      Vec3D._vecSignature = sig;
      Vec3D.draw3DAllVectors({
        frame: false,
      });
      if (Vec3D._renderer) Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
      if (Vec3D._labelRenderer)
        Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
    }
  };

  Vec3D.show3D = function () {
    if (!Vec3D._scene) Vec3D.init3D();

    const c2d = document.getElementById("canvas2d");
    if (c2d) c2d.style.display = "none";
    threeLayer.style.display = "block";
    try {
      threeLayer.focus({
        preventScroll: true,
      });
    } catch (_) {}
    Vec3D._hover3D = true;

    if (!Vec3D._animating) {
      Vec3D._animating = true;
      (function loop() {
        if (!Vec3D._animating) return;
        requestAnimationFrame(loop);

        // --- ENERGY PULSE (Focus) ---
        if (Vec3D._vectorsGroup) {
          const time = Date.now() * PULSE_SPEED_3D;
          const pulseOpacity = 0.2 + ((Math.sin(time) + 1) / 2) * 0.5; // 0.2 -> 0.7

          Vec3D._vectorsGroup.traverse((obj) => {
            if (obj.userData?.isFocusPulse && obj.material) {
              obj.material.opacity = pulseOpacity;
            }
          });
        }
        // -----------------------------

        if (Vec3D._controls) {
          Vec3D._controls.update();
          Vec3D._syncVectorList();
        }
        const target = Math.min(
          Vec3D._ZOOM_MAX,
          Math.max(Vec3D._ZOOM_MIN, Vec3D.S3D.zoomTarget),
        );
        Vec3D.S3D.unitsPerWorld += (target - Vec3D.S3D.unitsPerWorld) * 0.15;
        const diff = Math.abs(Vec3D.S3D.unitsPerWorld - target);
        const eps = Math.max(1e-9, Math.abs(target) * 1e-9);
        if (diff <= eps) {
          Vec3D.S3D.unitsPerWorld = target;
          Vec3D.S3D.hasPivot = false;
        }
        Vec3D.addAxisLabelsDynamic();
        if (Vec3D._renderer)
          Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
        if (Vec3D._labelRenderer)
          Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
      })();
    }
  };

  // =========================================================
  // SCENE HELPERS (GRID, AXES)
  // =========================================================
  Vec3D.update3DHelpersBase = function () {
    if (!Vec3D._scene) return;

    const Lw = Vec3D._axisMaxWorld;
    if (!Vec3D._frameGroup) {
      Vec3D._frameGroup = new THREE.Group();
      Vec3D._scene.add(Vec3D._frameGroup);
    } else {
      Vec3D._frameGroup.clear();
    }

    const cube = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(Lw * 2, Lw * 2, Lw * 2)),
      new THREE.LineBasicMaterial({
        color: 0x666666,
        transparent: true,
        opacity: 0.25,
      }),
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
        color: App.getCSS?.("--card") || "#222",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      }),
    );
    Vec3D._planeXY.renderOrder = 0;
    Vec3D._mathGroup.add(Vec3D._planeXY);

    Vec3D._axesGroup = (function buildAxesWorld(L) {
      const g = new THREE.Group();
      const mk = (a, b, cssVar) =>
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([a, b]),
          new THREE.LineBasicMaterial({
            color: new THREE.Color(App.getCSS?.(cssVar) || "#888"),
          }),
        );
      g.add(
        mk(new THREE.Vector3(-L, 0, 0), new THREE.Vector3(L, 0, 0), "--axis-x"),
      );
      g.add(
        mk(new THREE.Vector3(0, -L, 0), new THREE.Vector3(0, L, 0), "--axis-y"),
      );
      g.add(
        mk(new THREE.Vector3(0, 0, -L), new THREE.Vector3(0, 0, L), "--axis-z"),
      );
      return g;
    })(Lw);
    Vec3D._mathGroup.add(Vec3D._axesGroup);
    Vec3D._mathGroup.add(Vec3D._vectorsGroup);
    Vec3D._mathGroup.add(Vec3D._angleLayer);
    Vec3D._mathGroup.position.copy(Vec3D.S3D.offset);
  };

  function niceStep(raw) {
    raw = Math.max(1e-12, Math.abs(raw));
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const s = raw / p;
    const m = s <= 1 ? 1 : s <= 2 ? 2 : s <= 5 ? 5 : 10;
    return Math.max(1, m * p);
  }

  function formatTick(v, step) {
    if (!isFinite(v)) return "";
    const abs = Math.abs(v);
    if (abs === 0) return "0";
    const s = Math.max(1e-300, Math.abs(step || 1));
    const expStep = Math.floor(Math.log10(s));
    let sig = 1 + (Math.floor(Math.log10(abs)) - expStep);
    sig = Math.max(1, Math.min(6, sig));
    if (abs >= 1e6 || abs < 1e-6)
      return Number(v)
        .toExponential(sig - 1)
        .replace("+", "");
    const dec = Math.max(0, -expStep);
    let out = (Math.round(v / step) * step).toFixed(Math.min(6, dec));
    if (out.includes(".")) out = out.replace(/\.?0+$/, "");
    return out;
  }

  // =========================================================
  // DYNAMIC LABELS
  // =========================================================
  Vec3D.addAxisLabelsDynamic = function () {
    if (!Vec3D._camera || !Vec3D._renderer || !Vec3D._mathGroup) return;
    const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
    const Lw = Vec3D._axisMaxWorld;
    const Lm = Lw / u;

    if (Vec3D.S3D.hasPivot) {
      const pos = Vec3D.S3D.pivotWorld
        .clone()
        .sub(Vec3D.S3D.pivotMath.clone().multiplyScalar(u));
      Vec3D.S3D.offset.copy(pos);
    }
    Vec3D._mathGroup.position.copy(Vec3D.S3D.offset);

    const dist = Vec3D._camera.position.distanceTo(
      Vec3D._controls?.target || new THREE.Vector3(),
    );
    const vFOV = (Vec3D._camera.fov * Math.PI) / 180;
    const screenH = Math.max(1, Vec3D._renderer.domElement.clientHeight);
    const worldH = 2 * Math.tan(vFOV / 2) * dist;
    const pxPerWorld = screenH / worldH;
    const pxPerMath = pxPerWorld * u;
    Vec3D._pxPerWorld = pxPerWorld;

    if (Math.abs(u - (Vec3D._lastUForVectors || 0)) > 1e-6) {
      Vec3D.draw3DAllVectors({
        frame: false,
      });
      const g = App.currentAngleVisual3D;
      if (g?.userData?.angleMeta) {
        const u0 = g.userData.angleMeta.createdU || 1;
        const s = u / u0;
        g.scale.set(s, s, s);
        g.userData.angleMeta.createdU = u;
      }
      Vec3D._lastUForVectors = u;
    }

    const targetPx = 80;
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
      new THREE.LineBasicMaterial({
        color: new THREE.Color(App.getCSS?.("--grid-light") || "#444").getHex(),
      }),
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
      inner.style.color =
        axis === "x"
          ? App.getCSS?.("--axis-x") || "red"
          : axis === "y"
            ? App.getCSS?.("--axis-y") || "green"
            : App.getCSS?.("--axis-z") || "blue";
      outer.appendChild(inner);
      const obj = new THREE.CSS2DObject(outer);
      const s = tMath * u;
      obj.position.set(
        axis === "x" ? s : 0,
        axis === "y" ? s : 0,
        axis === "z" ? s : 0,
      );
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
      el.style.color =
        axis === "x"
          ? App.getCSS?.("--axis-x") || "red"
          : axis === "y"
            ? App.getCSS?.("--axis-y") || "green"
            : App.getCSS?.("--axis-z") || "blue";
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
        const lbl = g.children.find(
          (ch) => ch.isCSS2DObject && ch.name === "tipLabel",
        );
        if (!lbl) continue;
        lbl.position.copy(tip.clone().add(dir.clone().multiplyScalar(offsetW)));
      }
    })();

    (function updateAngleLabel() {
      const g = App.currentAngleVisual3D;
      if (!g || !g.userData?.angleMeta) return;
      const {
        midDir,
        r,
        labelPx = Vec3D.ANGLE_LABEL_PX,
        gapPx = Vec3D.ANGLE_LABEL_GAP_PX,
      } = g.userData.angleMeta;
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

  // =========================================================
  // VECTOR DRAWING
  // =========================================================
  Vec3D.buildProjectionGroupZUp = function (
    vecWorld,
    colorCSS = "#444",
    alpha = 1,
  ) {
    const g = new THREE.Group();
    const [x, y, z] = vecWorld;
    const mat = new THREE.LineDashedMaterial({
      color: new THREE.Color(colorCSS),
      dashSize: 0.6,
      gapSize: 0.35,
      transparent: true,
      opacity: Math.max(0, Math.min(1, Number(alpha) || 0)),
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

  function clipToCubeMath(x, y, z, L) {
    const tip = new THREE.Vector3(x, y, z);
    if (Math.abs(x) <= L && Math.abs(y) <= L && Math.abs(z) <= L) return tip;
    const tx = x ? (Math.sign(x) * L) / x : Infinity;
    const ty = y ? (Math.sign(y) * L) / y : Infinity;
    const tz = z ? (Math.sign(z) * L) / z : Infinity;
    const t = Math.min(
      tx > 0 ? tx : Infinity,
      ty > 0 ? ty : Infinity,
      tz > 0 ? tz : Infinity,
    );
    return isFinite(t) ? tip.multiplyScalar(t) : new THREE.Vector3(0, 0, 0);
  }

  Vec3D._sameVec = function (a, b, eps = 1e-9) {
    if (!a || !b) return false;
    return (
      Math.abs(a[0] - b[0]) < eps &&
      Math.abs(a[1] - b[1]) < eps &&
      Math.abs(a[2] - b[2]) < eps
    );
  };

  Vec3D._maybeInvalidateAngle = function () {
    const g = App.currentAngleVisual3D;
    if (!g?.userData?.angleMeta?.src) return;
    const { a: A0, b: B0 } = g.userData.angleMeta.src;
    const cur = (App.vectorList || []).filter((v) => v.visible !== false);
    const hasA = cur.some((v) => Vec3D._sameVec(toVec3(v.vec), A0));
    const hasB = cur.some((v) => Vec3D._sameVec(toVec3(v.vec), B0));
    if (!(hasA && hasB) || cur.length === 0) Vec3D.clearAngle();
  };

  Vec3D.draw3DAllVectors = function (opts = { frame: false }) {
    if (!Vec3D._mathGroup) {
      if (Vec3D.init3D) Vec3D.init3D();
      if (!Vec3D._mathGroup) return;
    }

    Vec3D._maybeInvalidateAngle();
    if (!Vec3D._vectorsGroup) {
      Vec3D._vectorsGroup = new THREE.Group();
      Vec3D._mathGroup.add(Vec3D._vectorsGroup);
    }

    Vec3D._vectorsGroup.traverse((obj) => {
      if (obj.isCSS2DObject && obj.element) obj.element.remove();
      if (obj.geometry) obj.geometry.dispose?.();
      if (Array.isArray(obj.material))
        obj.material.forEach((m) => m?.dispose?.());
      else obj.material?.dispose?.();
    });
    Vec3D._vectorsGroup.clear();
    Vec3D.threeVecMap.clear();

    const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
    const Lm = Vec3D._axisMaxWorld / u;

    const hasFocus = App.vectorList?.some((v) => v.focus);
    const list = (App.vectorList || []).filter((v) => v.visible !== false);

    // Sort: Focus last
    list.sort((a, b) => (a.focus ? 1 : 0) - (b.focus ? 1 : 0));

    for (const it of list) {
      const v = toVec3(it.vec);
      let aItem =
        typeof it.alpha === "number" ? Math.max(0, Math.min(1, it.alpha)) : 1;

      // Dim others
      if (hasFocus && !it.focus) aItem *= 0.15;

      // [FIX] Xóa dòng này để dù alpha=0 vẫn tạo object 3D
      // if (aItem <= 0.001) continue;

      const tipM = clipToCubeMath(v[0], v[1], v[2], Lm);
      const tipLocal = tipM.clone().multiplyScalar(u);
      const len = Math.max(tipLocal.length(), 1e-9);
      const dirLocal =
        len > 1e-9 ? tipLocal.clone().normalize() : new THREE.Vector3(1, 0, 0);
      const shaftLen = Math.max(len - VEC_HEAD_H, 1e-6);
      const color = new THREE.Color(it.colorHex || it.colorCss || "#ffffff");

      const group = new THREE.Group();
      group.userData.tipLocal = tipLocal;
      group.userData.dirLocal = dirLocal;

      if (it.focus) {
        // [ENERGY PULSE]
        const pulseMat = new THREE.MeshBasicMaterial({
          color: PULSE_COLOR_3D,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
          side: THREE.FrontSide,
        });

        const pulseShaft = new THREE.Mesh(
          new THREE.CylinderGeometry(
            VEC_SHAFT_R + (PULSE_SCALE_ADD / u) * 0.1,
            VEC_SHAFT_R + (PULSE_SCALE_ADD / u) * 0.1,
            shaftLen,
            12,
            1,
            true,
          ),
          pulseMat,
        );
        pulseShaft.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dirLocal,
        );
        pulseShaft.position.copy(dirLocal.clone().multiplyScalar(shaftLen / 2));
        pulseShaft.userData.isFocusPulse = true;
        group.add(pulseShaft);

        const pulseHead = new THREE.Mesh(
          new THREE.ConeGeometry(
            VEC_HEAD_R + (PULSE_SCALE_ADD / u) * 0.2,
            VEC_HEAD_H + (PULSE_SCALE_ADD / u) * 0.2,
            12,
          ),
          pulseMat,
        );
        pulseHead.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dirLocal,
        );
        pulseHead.position.copy(
          tipLocal
            .clone()
            .addScaledVector(
              dirLocal,
              -(VEC_HEAD_H + (PULSE_SCALE_ADD / u) * 0.2) / 2,
            ),
        );
        pulseHead.userData.isFocusPulse = true;
        group.add(pulseHead);
      }

      const isTransparent = aItem < 0.98;
      const vecMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: isTransparent,
        opacity: aItem,
        depthWrite: !isTransparent,
      });
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(
          VEC_SHAFT_R,
          VEC_SHAFT_R,
          shaftLen,
          GEOM_QUALITY.shaftSeg,
          1,
          true,
        ),
        vecMat,
      );
      shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirLocal);
      shaft.position.copy(dirLocal.clone().multiplyScalar(shaftLen / 2));

      const head = new THREE.Mesh(
        new THREE.ConeGeometry(VEC_HEAD_R, VEC_HEAD_H, GEOM_QUALITY.headSeg),
        vecMat,
      );
      head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirLocal);
      head.position.copy(
        tipLocal.clone().addScaledVector(dirLocal, -VEC_HEAD_H / 2),
      );

      const proj = Vec3D.buildProjectionGroupZUp(
        [tipLocal.x, tipLocal.y, tipLocal.z],
        App.getCSS?.("--axis") || "#888",
        aItem * 0.9,
      );
      const el = document.createElement("div");
      el.className = "tip-label";
      el.textContent = App.formatTip
        ? App.formatTip(it.vec)
        : `[${it.vec.join(", ")}]`;
      el.style.opacity = String(aItem);
      const labelEl = new THREE.CSS2DObject(el);
      labelEl.name = "tipLabel";
      labelEl.position.copy(tipLocal);

      // [FIX] Ẩn hoàn toàn nếu alpha = 0 để tránh hiện bóng mờ
      if (aItem <= 0.001) {
        group.visible = false;
      }

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
      const hasVec = (App.vectorList || []).some((v) => v.visible !== false);
      if (!hasVec) {
        Vec3D.S3D.unitsPerWorld = 1;
        Vec3D._camera.position.set(17, 17, 17);
      } else {
        const longest = Math.max(
          ...App.vectorList.map((it) => {
            const v3 = toVec3(it.vec);
            return Math.sqrt(v3[0] ** 2 + v3[1] ** 2 + v3[2] ** 2);
          }),
        );
        Vec3D.S3D.unitsPerWorld = Math.min(
          Vec3D._ZOOM_MAX,
          Math.max(Vec3D._ZOOM_MIN, (Lm * u * 0.55) / Math.max(1e-9, longest)),
        );
        const dist = Math.min(40, Math.max(32, Lm * u * 1.15));
        Vec3D._camera.position.set(dist, dist, dist);
        Vec3D._controls.target.copy(Vec3D.S3D.offset);
        Vec3D._controls.update();
      }
    }
    if (App.currentVector) {
      const txt = App.formatTip
        ? App.formatTip(App.currentVector)
        : `[${App.currentVector.join(",")}]`;
      App.coordOut?.(txt + (App.currentVector.length > 3 ? " (Chiếu 3D)" : ""));
    } else {
      App.coordOut?.("—");
    }

    const normalizeGhost = App.tempGhosts?.find((g) => g.isNormalize);
    if (normalizeGhost) {
      Vec3D._drawUnitSphere(normalizeGhost.unitCircleAlpha);
    } else if (Vec3D._unitSphereMesh) {
      Vec3D._unitSphereMesh.visible = false;
    }
  };

  // =========================================================
  // ANGLE VISUALS (FILLED IN LOGIC)
  // =========================================================
  Vec3D.clearAngle = function () {
    const g = App.currentAngleVisual3D;
    if (!g) return;
    (g.parent || Vec3D._mathGroup || Vec3D._scene).remove(g);
    g.traverse((obj) => {
      obj.element?.remove?.();
      obj.geometry?.dispose?.();
      if (Array.isArray(obj.material))
        obj.material.forEach((m) => m?.dispose?.());
      else obj.material?.dispose?.();
    });
    App.currentAngleVisual3D = null;
  };

  Vec3D.refreshAngleTheme = function () {
    const g = App.currentAngleVisual3D;
    if (!g) return;
    const color = new THREE.Color(
      App.getCSS?.("--angle-fill") || "rgba(255,200,0,0.3)",
    );
    const mesh = g.children.find((c) => c.isMesh);
    if (mesh && mesh.material) {
      mesh.material.color = color;
    }
  };

  Vec3D.removeAllAngleVisuals = function () {
    Vec3D.clearAngle();
  };

  // HÀM VẼ GÓC 3D (Được viết đầy đủ)
  Vec3D.drawAngleArc3D = function (v1, v2, rad, deg) {
    Vec3D.clearAngle(); // Xóa cái cũ trước

    const u = Vec3D.S3D.unitsPerWorld || 1;
    const A = new THREE.Vector3(...toVec3(v1)).normalize();
    const B = new THREE.Vector3(...toVec3(v2)).normalize();

    // Nếu 2 vector song song hoặc trùng nhau -> không vẽ
    if (A.lengthSq() < 1e-9 || B.lengthSq() < 1e-9) return;
    const angleVal = A.angleTo(B);
    if (Math.abs(angleVal) < 1e-5) return;

    // Tính bán kính hiển thị (tùy chỉnh)
    const displayRadius = 4 * u;

    // Tạo geometry cung tròn
    const curve = new THREE.EllipseCurve(
      0,
      0, // ax, aY
      displayRadius,
      displayRadius, // xRadius, yRadius
      0,
      angleVal, // startAngle, endAngle
      false, // clockwise
      0, // rotation
    );
    const pts = curve.getPoints(32);
    const geometry = new THREE.BufferGeometry().setFromPoints(pts);

    // Vật liệu (Material)
    const material = new THREE.LineBasicMaterial({ color: 0xffaa00 });
    const arcLine = new THREE.Line(geometry, material);

    // Tạo mặt phẳng rẻ quạt (Mesh) cho đẹp
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    pts.forEach((p) => shape.lineTo(p.x, p.y));
    shape.lineTo(0, 0);
    const meshGeo = new THREE.ShapeGeometry(shape);
    const meshMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(meshGeo, meshMat);

    // Group chứa tất cả
    const group = new THREE.Group();
    group.add(arcLine);
    group.add(mesh);

    // Xoay Group để khớp với mặt phẳng tạo bởi 2 vector
    // Trục Z mặc định của EllipseCurve là (0,0,1). Ta cần xoay nó trùng với Cross(A, B).
    const normal = new THREE.Vector3().crossVectors(A, B).normalize();
    // Nếu cross = 0 (song song), dùng trục bất kỳ
    if (normal.lengthSq() < 0.001) normal.set(0, 0, 1);

    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal,
    );
    group.setRotationFromQuaternion(quaternion);

    // Xoay tiếp để điểm bắt đầu khớp với A
    // EllipseCurve bắt đầu tại (Radius, 0, 0) local.
    // Sau khi xoay phẳng, vector (1,0,0) local sẽ nằm trên mặt phẳng.
    // Ta cần xoay quanh trục Normal sao cho vector đó trùng với A.
    const startVecLocal = new THREE.Vector3(1, 0, 0).applyQuaternion(
      quaternion,
    );
    const angleOffset = startVecLocal.angleTo(A);
    // Kiểm tra hướng xoay (trái hay phải)
    const testCross = new THREE.Vector3().crossVectors(startVecLocal, A);
    const sign = testCross.dot(normal) >= 0 ? 1 : -1;

    group.rotateOnAxis(new THREE.Vector3(0, 0, 1), sign * angleOffset);

    // Label hiển thị số độ
    const degTxt =
      (deg !== undefined ? deg : (angleVal * 180) / Math.PI).toFixed(1) + "°";
    const div = document.createElement("div");
    div.className = "angle-label";
    div.textContent = degTxt;
    div.style.color = "#ffaa00";
    const labelObj = new THREE.CSS2DObject(div);

    // Vị trí label: Nằm giữa cung
    const midAngle = angleVal / 2;
    const midDir = new THREE.Vector3(
      Math.cos(midAngle),
      Math.sin(midAngle),
      0,
    ).applyQuaternion(group.quaternion);
    labelObj.position.copy(midDir.multiplyScalar(displayRadius * 1.1));

    group.add(labelObj);

    // Metadata để scale theo zoom
    group.userData.angleMeta = {
      src: { a: toVec3(v1), b: toVec3(v2) },
      createdU: u,
      r: displayRadius,
      midDir: midDir.clone().normalize(),
    };

    Vec3D._angleLayer.add(group);
    App.currentAngleVisual3D = group;
  };

  // [THÊM MỚI] Hàm này giúp Animation chạy mượt mà không bị xóa mất Ghost
  Vec3D.renderOnce = function () {
    if (Vec3D._renderer && Vec3D._scene && Vec3D._camera) {
      Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
      if (Vec3D._labelRenderer)
        Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
    }
  };

  // --- UTILS ---
  Vec3D.hardRefresh3D = function (frameFirst = false) {
    if (App.mode !== "3D") return;
    if (!Vec3D._scene) Vec3D.init3D();
    Vec3D.draw3DAllVectors({
      frame: frameFirst,
    });
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

  Vec3D.resetView = function () {
    if (!Vec3D._camera || !Vec3D._controls) return;
    if (Vec3D._resetAnimId) cancelAnimationFrame(Vec3D._resetAnimId);
    const startPos = Vec3D._camera.position.clone();
    const startTarget = Vec3D._controls.target.clone();
    const startZoom = Vec3D.S3D.unitsPerWorld;
    const targetPos = new THREE.Vector3(10, 10, 10);
    const targetLookAt = new THREE.Vector3(0, 0, 0);
    const targetZoom = 1;
    const duration = 1000;
    const startTime = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 4);

    function loop(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      Vec3D._camera.position.lerpVectors(startPos, targetPos, ease(progress));
      Vec3D._controls.target.lerpVectors(
        startTarget,
        targetLookAt,
        ease(progress),
      );
      Vec3D.S3D.unitsPerWorld =
        startZoom + (targetZoom - startZoom) * ease(progress);
      Vec3D.S3D.zoomTarget = Vec3D.S3D.unitsPerWorld;
      Vec3D._controls.update();
      if (!Vec3D._animating) {
        Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
        Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
        Vec3D.addAxisLabelsDynamic();
      }
      if (progress < 1) Vec3D._resetAnimId = requestAnimationFrame(loop);
      else {
        Vec3D._resetAnimId = null;
        Vec3D.S3D.offset.set(0, 0, 0);
        Vec3D.S3D.hasPivot = false;
        Vec3D.hardRefresh3D(false);
      }
    }
    Vec3D._resetAnimId = requestAnimationFrame(loop);
  };

  Vec3D._drawUnitSphere = function (alpha) {
    if (!Vec3D._unitSphereMesh) {
      const geo = new THREE.SphereGeometry(1, 32, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        wireframe: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      Vec3D._unitSphereMesh = new THREE.Mesh(geo, mat);
      Vec3D._mathGroup.add(Vec3D._unitSphereMesh);
    }
    const u = Vec3D.S3D.unitsPerWorld;
    Vec3D._unitSphereMesh.scale.setScalar(u); // Tỉ lệ theo zoom
    Vec3D._unitSphereMesh.material.opacity = alpha;
    Vec3D._unitSphereMesh.visible = alpha > 0.01;
  };
})();
