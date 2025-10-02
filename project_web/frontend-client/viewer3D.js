// ===================== viewer3D.js =====================
(function () {
  // Public namespace
  window.Vec3D = window.Vec3D || {};
  Vec3D._ZOOM_MIN = 1e-12;
  Vec3D._ZOOM_MAX = 1e12;
  const App = window.App || {};

  // Mount point
  const threeLayer = document.getElementById('threeLayer');

  // Core handles
  Vec3D._scene = null;
  Vec3D._camera = null;
  Vec3D._renderer = null;
  Vec3D._labelRenderer = null;
  Vec3D._controls = null;
  Vec3D._angleLayer = null;   // layer chuyên chứa “quạt góc”
  Vec3D._vecSignature = '';   // để phát hiện vectorList thay đổi
  // Giữ góc khi redraw do camera (rotate/pan/zoom), còn lại thì xoá
Vec3D._cameraOnlyOp = false;
  Vec3D.S3D = {
  

  unitsPerWorld: 1,
  zoomTarget: 1,
  offset: new THREE.Vector3(0, 0, 0),         // tịnh tiến math-group trong WORLD
  pivotMath: new THREE.Vector3(0,0,0),        // điểm “giữ yên” ở TỌA ĐỘ TOÁN
  pivotWorld: new THREE.Vector3(0,0,0),       // điểm “giữ yên” ở WORLD
  hasPivot: false,
};

  // Axis & helpers state
  Vec3D._animating = false;
  Vec3D._hover3D = false;
  Vec3D._pressed = new Set();
  Vec3D._kbAnimId = null;
  Vec3D._lastUForVectors = 1; // u lần cuối đã vẽ vector

  // Scene helpers
  Vec3D._axisMaxMath = 50;          // biên toán học (+/-)
  // Khung lập phương cố định (WORLD half-size), không đổi khi math-zoom
Vec3D._axisMaxWorld = Vec3D._axisMaxMath; // = 50 ban đầu
Vec3D._frameGroup = null; // chỉ chứa cube edges (static)

  Vec3D._axesGroup = null;          // 3 trục màu
  Vec3D._cubeEdges = null;          // dây cạnh lập phương
  Vec3D._planeXY = null;            // mặt phẳng Oxy (vùng xám)
  Vec3D._axisTicksGroup = null;     // tick vạch
  Vec3D._label2DObjs = [];          // CSS2D labels (tick + X/Y/Z)
  Vec3D._lastLabelKey = "";         // cache để tránh rebuild dư
  Vec3D._mathGroup = null;     // group chứa toàn bộ hệ trục + ticks + labels + vectors (math space)
  Vec3D._vectorsGroup = null; 
  Vec3D._ticksGroup = null;    // THREE.LineSegments cho vạch tick
Vec3D._tickLabels = [];      // CSS2DObject số trên trục
Vec3D._axisLetters = [];     // CSS2DObject 'X','Y','Z'

  // Vectormap
  Vec3D.threeVecMap = new Map();    // id -> group (arrow + proj + tipLabel)

  // Text sizes (Sprite path không còn dùng; giữ thông số cho consistency)
  Vec3D.AXIS_TICK_PX = 26;
  Vec3D.AXIS_LETTER_PX = 30;
  Vec3D.TIP_PX = 22;
  Vec3D.ANGLE_LABEL_PX   = 28; // kích cỡ ảo của badge theo px
  Vec3D.ANGLE_ARC_GAP_PX = 8;
  // Quạt góc & badge
  Vec3D.ANGLE_RADIUS_RATIO   = 0.72; // bán kính quạt = 72% độ dài vector ngắn hơn
  Vec3D.ANGLE_LABEL_MIN_RATIO = 0.38; // badge cách gốc tối thiểu 38% bán kính
  Vec3D.ANGLE_LABEL_GAP_PX    = 6;    // khoảng “thở” giữa badge và mép quạt (px)


  function worldPointUnderCursor(clientX, clientY) {
  if (!Vec3D._renderer || !Vec3D._camera || !Vec3D._controls) return null;
  const rect = Vec3D._renderer.domElement.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((clientY - rect.top) / rect.height) * 2 + 1;

  const ndc = new THREE.Vector2(x, y);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, Vec3D._camera);

  // Mặt phẳng trực giao với camera, đi qua controls.target
  const normal = new THREE.Vector3();
  Vec3D._camera.getWorldDirection(normal);
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, Vec3D._controls.target);
  const hit = new THREE.Vector3();
  if (!ray.ray.intersectPlane(plane, hit)) return null;
  return hit; // world-space
}

  // ===== Init =====
  Vec3D.init3D = function () {
    Vec3D.DEFAULT_FOV = 24; 
    // [FIX-0] đảm bảo layer có thể đo được size trước khi tạo renderer
  if (getComputedStyle(threeLayer).display === 'none') {
    threeLayer.style.display = 'block';
  }
    const rect = threeLayer.getBoundingClientRect();

    // WebGL renderer
Vec3D._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
Vec3D._renderer.setSize(rect.width || 760, rect.height || 760);
Vec3D._renderer.setPixelRatio(window.devicePixelRatio || 1);
threeLayer.appendChild(Vec3D._renderer.domElement);
// ĐẢM BẢO canvas ở dưới
Vec3D._renderer.domElement.style.position = 'absolute';
Vec3D._renderer.domElement.style.inset = '0';
Vec3D._renderer.domElement.style.zIndex = '0';

// CSS2D renderer (ticks & labels)
Vec3D._labelRenderer = new THREE.CSS2DRenderer();
Vec3D._labelRenderer.setSize(rect.width || 760, rect.height || 760);
Vec3D._labelRenderer.domElement.style.position = 'absolute';
Vec3D._labelRenderer.domElement.style.inset = '0';
Vec3D._labelRenderer.domElement.style.pointerEvents = 'none';
Vec3D._labelRenderer.domElement.style.overflow = 'visible';

// QUAN TRỌNG: container CSS2D luôn ở trên canvas
Vec3D._labelRenderer.domElement.style.zIndex = '1';
threeLayer.appendChild(Vec3D._labelRenderer.domElement);


    Vec3D._scene = new THREE.Scene();
    Vec3D._scene.background = new THREE.Color(App.getCSS('--bg'));

    // Camera: cố định FOV, không dùng zoom
    Vec3D._camera = new THREE.PerspectiveCamera(
      Vec3D.DEFAULT_FOV,
      Math.max(1e-6, (rect.width || 760) / (rect.height || 760)),
      0.1,
      1e12
    );
    Vec3D._camera.position.set(100, 100, 100);
    Vec3D._camera.up.set(0, 0, 1); // Z-up

    // Orbit controls: cấm zoom
    Vec3D._controls = new THREE.OrbitControls(Vec3D._camera, Vec3D._renderer.domElement);
    // Cố định gốc quy chiếu cho cả trục lẫn số
Vec3D.S3D.unitsPerWorld = 1;
Vec3D.S3D.zoomTarget    = 1;
Vec3D.S3D.offset.set(0, 0, 0);
Vec3D.S3D.hasPivot = false;

    Vec3D._controls.enableDamping = true;
    Vec3D._controls.dampingFactor = 0.07;
    Vec3D._controls.rotateSpeed = 0.6;
    Vec3D._controls.enablePan = true;
    Vec3D._controls.enableZoom = false; // QUAN TRỌNG: camera không zoom

    // --- KHÓA ZOOM HOÀN TOÀN ---
Vec3D._controls.enableZoom = false;   // chặn logic zoom
Vec3D._controls.zoomSpeed = 0;        // dự phòng
Vec3D._controls.zoomToCursor = false;
Vec3D._controls.mouseButtons = {      // bỏ dolly ở chuột giữa
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.PAN,
  RIGHT: THREE.MOUSE.PAN
};
Vec3D._controls.touches = {           // bỏ pinch-dolly
  ONE: THREE.TOUCH.ROTATE,
  TWO: THREE.TOUCH.PAN
};
// Wheel = math-zoom (đổi unitsPerWorld), KHÔNG camera zoom
// Wheel = math-zoom (đổi unitsPerWorld), KHÔNG camera zoom
const wheelHandler = (e) => {
  e.preventDefault();
  e.stopImmediatePropagation(); // cắt tới OrbitControls

  const dir    = (e.deltaY < 0) ? +1 : -1;
  const factor = dir > 0 ? 1.12 : 1 / 1.12;

  // Nếu đã ở biên và còn muốn đi xa hơn → bỏ qua hẳn
  if ((Vec3D.S3D.zoomTarget >= Vec3D._ZOOM_MAX && dir > 0) ||
      (Vec3D.S3D.zoomTarget <= Vec3D._ZOOM_MIN && dir < 0)) {
    Vec3D.S3D.hasPivot = false;
    return;
  }

  // Luôn pivot tại GỐC TOÁN (0,0,0): giữ yên vị trí world của gốc khi zoom
Vec3D.S3D.pivotMath.set(0, 0, 0);
Vec3D.S3D.pivotWorld.copy(Vec3D.S3D.offset); // world-pos hiện tại của gốc
Vec3D.S3D.hasPivot = true;


  const next = Vec3D.S3D.zoomTarget * factor;
  Vec3D.S3D.zoomTarget = Math.min(Vec3D._ZOOM_MAX, Math.max(Vec3D._ZOOM_MIN, next));
};


Vec3D._renderer.domElement.addEventListener('wheel', wheelHandler, { passive: false });
Vec3D._labelRenderer.domElement.addEventListener('wheel', wheelHandler, { passive: false });
    // Render lại khi quay/pan (nhưng không đổi unitsPerWorld)
    Vec3D._controls.addEventListener('change', () => {
      if (App.mode !== '3D') return;
      Vec3D.addAxisLabelsDynamic(); // update vị trí số theo góc nhìn & zoom toán
      Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
      Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
    });

    // Resize
    window.addEventListener('resize', () => {
      const r = threeLayer.getBoundingClientRect();
      Vec3D._camera.aspect = Math.max(1e-6, (r.width || 760) / (r.height || 760));
      Vec3D._camera.updateProjectionMatrix();
      Vec3D._renderer.setSize(r.width || 760, r.height || 760);
      Vec3D._labelRenderer.setSize(r.width || 760, r.height || 760);
      if (App.mode === '3D') Vec3D.hardRefresh3D(false);
    });

    // [FIX-2] Bắt mọi thay đổi size của container (mở sidebar, đổi font, v.v.)
const ro = new ResizeObserver(() => {
  const r = threeLayer.getBoundingClientRect();
  Vec3D._camera.aspect = Math.max(1e-6, (r.width || 760) / (r.height || 760));
  Vec3D._camera.updateProjectionMatrix();
  Vec3D._renderer.setSize(r.width || 760, r.height || 760);
  Vec3D._labelRenderer.setSize(r.width || 760, r.height || 760);
  if (App.mode === '3D') Vec3D.hardRefresh3D(false);
});
ro.observe(threeLayer);


    // Hover focus
    Vec3D._renderer.domElement.addEventListener('mouseenter', () => {
      Vec3D._hover3D = true;
      threeLayer.focus();
    });
    Vec3D._renderer.domElement.addEventListener('mouseleave', () => {
      Vec3D._hover3D = false;
    });

    // Keyboard nav (WASD + QE + arrows) — giữ nguyên
    document.addEventListener(
      'keydown',
      (e) => {
        const controlsPane = document.getElementById('controls');
        const typing =
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) ||
          (controlsPane && controlsPane.contains(e.target));
        if (App.mode !== '3D' || !Vec3D._hover3D || typing) return;
        const key = e.key.toLowerCase();
        Vec3D._pressed.add(key);
        if (
          [
            'w',
            'a',
            's',
            'd',
            'q',
            'e',
            'arrowup',
            'arrowdown',
            'arrowleft',
            'arrowright',
            'shift'
          ].includes(key)
        ) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      { capture: true }
    );
    document.addEventListener(
      'keyup',
      (e) => {
        const controlsPane = document.getElementById('controls');
        const typing =
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) ||
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
      if (App.mode === '3D' && Vec3D._pressed.size && Vec3D._camera && Vec3D._controls) {
        const base = Vec3D._camera.position.distanceTo(Vec3D._controls.target);
        const speed = (Vec3D._pressed.has('shift') ? 0.004 : 0.002) * base;

        const forward = new THREE.Vector3();
        Vec3D._camera.getWorldDirection(forward);
        const up = new THREE.Vector3(0, 0, 1);
        const right = new THREE.Vector3().crossVectors(forward, up).normalize();
        const delta = new THREE.Vector3();

        if (Vec3D._pressed.has('w') || Vec3D._pressed.has('arrowup'))
          delta.add(up.clone().multiplyScalar(+speed));
        if (Vec3D._pressed.has('s') || Vec3D._pressed.has('arrowdown'))
          delta.add(up.clone().multiplyScalar(-speed));
        if (Vec3D._pressed.has('a') || Vec3D._pressed.has('arrowleft'))
          delta.add(right.clone().multiplyScalar(-speed));
        if (Vec3D._pressed.has('d') || Vec3D._pressed.has('arrowright'))
          delta.add(right.clone().multiplyScalar(+speed));
        if (Vec3D._pressed.has('q')) delta.add(forward.clone().multiplyScalar(-speed));
        if (Vec3D._pressed.has('e')) delta.add(forward.clone().multiplyScalar(+speed));

        if (delta.lengthSq() > 0) {
          Vec3D._camera.position.add(delta);
          Vec3D._controls.target.add(delta);
          Vec3D._controls.update();
        }
      }
      Vec3D._kbAnimId = requestAnimationFrame(stepLoop);
    };
    if (!Vec3D._kbAnimId) Vec3D._kbAnimId = requestAnimationFrame(stepLoop);

    // Helpers (plane + cube + axes)
    Vec3D.update3DHelpersBase();

    // Start loop
    Vec3D.show3D();
    // [FIX-3] Ép render + rebuild ticks/labels bằng kích thước thật
requestAnimationFrame(() => {
  Vec3D.hardRefresh3D(true);
});

  };

  Vec3D._syncVectorList = function () {
  const list = (App.vectorList || []).map(v => ([
    v.id ?? null,
    v.visible !== false ? 1 : 0,
    +((v.vec?.[0] || 0).toFixed(12)),
    +((v.vec?.[1] || 0).toFixed(12)),
    +((v.vec?.[2] || 0).toFixed(12)),
    v.focus ? 1 : 0
  ]));
  const sig = JSON.stringify(list);
  if (sig !== Vec3D._vecSignature) {
    Vec3D._vecSignature = sig;
    // Thay đổi dữ liệu (không phải camera)
    Vec3D.draw3DAllVectors({ frame: false }); // sẽ tự gọi _maybeInvalidateAngle theo (A)
    Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
    Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
  }
};

  // ===== Show/loop =====
  Vec3D.show3D = function () {
    document.getElementById('canvas2d').style.display = 'none';
    threeLayer.style.display = 'block';
    try {
      threeLayer.focus({ preventScroll: true });
    } catch (e) {}
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
        // Easing math-zoom
        const target = Math.min(Vec3D._ZOOM_MAX, Math.max(Vec3D._ZOOM_MIN, Vec3D.S3D.zoomTarget));
Vec3D.S3D.unitsPerWorld += (target - Vec3D.S3D.unitsPerWorld) * 0.15;

const diff = Math.abs(Vec3D.S3D.unitsPerWorld - target);
const eps  = Math.max(1e-9, Math.abs(target) * 1e-9); // ngưỡng tương đối
if (diff <= eps) {
  Vec3D.S3D.unitsPerWorld = target;
  Vec3D.S3D.hasPivot = false;
}


        // Update axis labels/ticks theo zoom
        Vec3D.addAxisLabelsDynamic();

        // Render
        Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
        Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
      })();
    }
  };

  // ===== CSS2D labels =====
  Vec3D.makeCSSLabel = function (text, className = 'axis-label', colorCSS) {
    const div = document.createElement('div');
    div.className = className;
    div.textContent = text;
    if (colorCSS) div.style.color = colorCSS;
    const obj = new THREE.CSS2DObject(div);
    return obj;
  };

  Vec3D.clear2DLabels = function () {
    if (!Vec3D._label2DObjs) return;
    for (const o of Vec3D._label2DObjs) {
      Vec3D._scene.remove(o);
    }
    Vec3D._label2DObjs.length = 0;
  };

  // ===== Helpers (plane + cube + axes) =====
  Vec3D.buildAxesLines = function (LMath, colors) {
    // Trục dựng ở toạ độ toán học, scale cả nhóm theo unitsPerWorld
    const L = LMath;
    const g = new THREE.Group();
    const mk = (a1, a2) => new THREE.BufferGeometry().setFromPoints([a1, a2]);

    const xg = new THREE.Line(
      mk(new THREE.Vector3(-L, 0, 0), new THREE.Vector3(L, 0, 0)),
      new THREE.LineBasicMaterial({ color: new THREE.Color(colors.x) })
    );
    const yg = new THREE.Line(
      mk(new THREE.Vector3(0, -L, 0), new THREE.Vector3(0, L, 0)),
      new THREE.LineBasicMaterial({ color: new THREE.Color(colors.y) })
    );
    const zg = new THREE.Line(
      mk(new THREE.Vector3(0, 0, -L), new THREE.Vector3(0, 0, L)),
      new THREE.LineBasicMaterial({ color: new THREE.Color(colors.z) })
    );
    g.add(xg, yg, zg);
    return g;
  };

  Vec3D.update3DHelpersBase = function () {
  const Lw = Vec3D._axisMaxWorld;

  // ----- FRAME (static) -----
  if (!Vec3D._frameGroup) {
    Vec3D._frameGroup = new THREE.Group();
    Vec3D._scene.add(Vec3D._frameGroup);
  } else {
    Vec3D._frameGroup.clear();
  }
  // Cube edges (WORLD, luôn cố định)
  const cube = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(Lw * 2, Lw * 2, Lw * 2)),
    new THREE.LineBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.25 })
  );
  Vec3D._frameGroup.add(cube);

  // ----- MATH SPACE (dynamic, KHÔNG scale; chỉ translate theo offset) -----
  if (!Vec3D._mathGroup) {
    Vec3D._mathGroup = new THREE.Group();
    Vec3D._scene.add(Vec3D._mathGroup);
  } else {
    // giữ lại vectorsGroup nếu có
    const keepVectors = Vec3D._vectorsGroup || new THREE.Group();
  const keepAngles  = Vec3D._angleLayer  || new THREE.Group();
  keepVectors.parent && keepVectors.parent.remove(keepVectors);
  keepAngles.parent  && keepAngles.parent.remove(keepAngles);

  Vec3D._mathGroup.clear();
  Vec3D._vectorsGroup = keepVectors;
  Vec3D._angleLayer   = keepAngles;
  if (!Vec3D._vectorsGroup) { Vec3D._vectorsGroup = new THREE.Group(); }
  if (!Vec3D._angleLayer)   { Vec3D._angleLayer   = new THREE.Group(); }
  
  }

  // Plane Oxy (WORLD size, neo tại offset của math-origin)
  Vec3D._planeXY = new THREE.Mesh(
    new THREE.PlaneGeometry(Lw * 2, Lw * 2),
    new THREE.MeshBasicMaterial({
      color: App.getCSS('--card'),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.18,
      depthWrite: false
    })
  );
  Vec3D._planeXY.renderOrder = 0;

  Vec3D._planeXY.rotation.set(0, 0, 0);
  Vec3D._mathGroup.add(Vec3D._planeXY);

  // Trục màu (WORLD length Lw ở local; group này sẽ được translate theo offset)
  Vec3D._axesGroup = (function buildAxesWorld(L, colors){
    const g = new THREE.Group();
    const mk = (a,b) => new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([a,b]),
      new THREE.LineBasicMaterial({ color: new THREE.Color(colors) })
    );
    g.add(mk(new THREE.Vector3(-L,0,0), new THREE.Vector3(L,0,0)));      // X
    g.add(mk(new THREE.Vector3(0,-L,0), new THREE.Vector3(0,L,0)));      // Y
    g.add(mk(new THREE.Vector3(0,0,-L), new THREE.Vector3(0,0,L)));      // Z
    g.children[0].material.color = new THREE.Color(App.getCSS('--axis-x'));
    g.children[1].material.color = new THREE.Color(App.getCSS('--axis-y'));
    g.children[2].material.color = new THREE.Color(App.getCSS('--axis-z'));
    return g;
  })(Lw);
  Vec3D._mathGroup.add(Vec3D._axesGroup);
  Vec3D._mathGroup.add(Vec3D._vectorsGroup);
  Vec3D._mathGroup.add(Vec3D._angleLayer);
  // tick/labels sẽ build trong addAxisLabelsDynamic()
  // Đặt vị trí math-origin ngay lần đầu
  Vec3D._mathGroup.position.copy(Vec3D.S3D.offset);
};



  // ===== Axis ticks & labels (math-zoom aware) =====
  function niceStep(raw) {
    raw = Math.max(1e-12, Math.abs(raw));
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const s = raw / p; // 1..10
    const m = s <= 1 ? 1 : s <= 2 ? 2 : s <= 5 ? 5 : 10;
    return m * p;
  }
  function formatTick(v, step) {
  if (!isFinite(v)) return '';
  const abs = Math.abs(v);
  if (abs === 0) return '0';

  // Số chữ số có nghĩa đủ để phân biệt 2 tick kề nhau theo step
  const s = Math.max(1e-300, Math.abs(step || 1));
  const expStep = Math.floor(Math.log10(s));
  const expV    = Math.floor(Math.log10(abs));
  let sig = 1 + (expV - expStep);           // significant digits cần thiết
  sig = Math.max(1, Math.min(6, sig));      // giới hạn 1..6

  if (abs >= 1e6 || abs < 1e-6) {
    // toExponential(n) → n chữ sau dấu chấm, tổng sig = n+1
    return Number(v).toExponential(sig - 1).replace('+', '');
  }

  const dec = Math.max(0, -expStep);
  let out = (Math.round(v / step) * step).toFixed(Math.min(6, dec));
  if (out.includes('.')) out = out.replace(/\.?0+$/, '');
  return out;
}



  

Vec3D.addAxisLabelsDynamic = function () {
  if (!Vec3D._camera || !Vec3D._renderer || !Vec3D._mathGroup) return;

  const u  = Math.max(1e-12, Vec3D.S3D.unitsPerWorld); // math -> world
  const Lw = Vec3D._axisMaxWorld;                      // khung WORLD cố định
  const Lm = Lw / u;                                   // biên theo đơn vị TOÁN
  
  // Giữ điểm dưới con trỏ đứng yên khi math-zoom => cập nhật offset
  if (Vec3D.S3D.hasPivot) {
    const pos = Vec3D.S3D.pivotWorld.clone()
      .sub(Vec3D.S3D.pivotMath.clone().multiplyScalar(u));
    Vec3D.S3D.offset.copy(pos);
  }
  // Tịnh tiến toàn bộ “math space” theo offset (KHÔNG scale)
  Vec3D._mathGroup.position.copy(Vec3D.S3D.offset);

  // PX per WORLD & per MATH (để chọn bước 1-2-5)
  const dist = Vec3D._camera.position.distanceTo(Vec3D._controls?.target || new THREE.Vector3());
  const vFOV = Vec3D._camera.fov * Math.PI / 180;
  const screenH = Math.max(1, Vec3D._renderer.domElement.clientHeight);
  const worldH = 2 * Math.tan(vFOV / 2) * dist;
  const pxPerWorld = screenH / worldH;
  const pxPerMath  = pxPerWorld * u;
  Vec3D._pxPerWorld = pxPerWorld;
  // Nếu math-zoom đổi u → vẽ lại vectors & scale quạt góc
if (Math.abs(u - (Vec3D._lastUForVectors || 0)) > 1e-6) {
  // Zoom toán: redraw vectors; _maybeInvalidateAngle sẽ GIỮ góc nếu dữ liệu không đổi
  Vec3D.draw3DAllVectors({ frame: false });

  const g = App.currentAngleVisual3D;
  if (g?.userData?.angleMeta) {
    const u0 = g.userData.angleMeta.createdU || 1;
    const s  = u / u0;
    g.scale.set(s, s, s);
    g.userData.angleMeta.createdU = u;
  }
  Vec3D._lastUForVectors = u;
}


  const targetPx = 70;
  const step     = niceStep(targetPx / Math.max(1e-9, pxPerMath)); // bước theo “đơn vị toán”

  const off = Vec3D.S3D.offset;
  const key = `${Lw}|${step}|${u}|${App.theme}|${Math.round(dist*1000)}|${off.x.toFixed(4)},${off.y.toFixed(4)},${off.z.toFixed(4)}`;
  
  if (key === Vec3D._lastLabelKey) return;
  Vec3D._lastLabelKey = key;

  // --- Clear ticks/labels cũ ---
  if (Vec3D._ticksGroup) {
    Vec3D._mathGroup.remove(Vec3D._ticksGroup);
    Vec3D._ticksGroup.geometry.dispose();
    Vec3D._ticksGroup.material.dispose();
    Vec3D._ticksGroup = null;
  }
  for (const o of Vec3D._tickLabels) { o.element?.remove(); o.parent?.remove(o); }
  for (const o of Vec3D._axisLetters) { o.element?.remove(); o.parent?.remove(o); }
  Vec3D._tickLabels.length = 0;
  Vec3D._axisLetters.length = 0;

  // --- Majors quanh vị trí đang xem (offset) theo từng trục ---
// t0 = toạ độ TOÁN hiện đang nằm ở tâm khung WORLD (do offset)
const t0x = -Vec3D.S3D.offset.x / u;
const t0y = -Vec3D.S3D.offset.y / u;
const t0z = -Vec3D.S3D.offset.z / u;

function buildMajorsAround(t0) {
  const start = Math.ceil((t0 - Lm) / step) * step;
  const end   = Math.floor((t0 + Lm) / step) * step;
  const arr = [];
  for (let t = start; t <= end + 1e-12; t += step) arr.push(+t.toFixed(12));
  return arr;
}

const majorsX = buildMajorsAround(t0x);
const majorsY = buildMajorsAround(t0y);
const majorsZ = buildMajorsAround(t0z);


  // --- Dựng tick (LOCAL = WORLD units) ---
  const tickLenW = Math.max(Lw * 0.02, 0.25); // chiều dài vạch theo WORLD
  const pos = [];
  const addMajor = (axis, tMath) => {
    const s = tMath * u; // đổi đơn vị toán -> khoảng cách WORLD (LOCAL)
    if (axis === 'x') pos.push(s, -tickLenW, 0,  s, +tickLenW, 0);
    if (axis === 'y') pos.push(-tickLenW, s, 0, +tickLenW, s, 0);
    if (axis === 'z') pos.push(-tickLenW, 0, s, +tickLenW, 0, s);
  };
  majorsX.forEach(t => addMajor('x', t));
  majorsY.forEach(t => addMajor('y', t));
  majorsZ.forEach(t => addMajor('z', t));

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  Vec3D._ticksGroup = new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({ color: new THREE.Color(App.getCSS('--grid-light')).getHex() })
  );
  Vec3D._mathGroup.add(Vec3D._ticksGroup);

  // --- Nhãn số (CSS2D) – LOCAL = (t*u, 0, 0) ---
  const putLabel = (axis, tMath) => {
    if (Math.abs(tMath) <= 1e-12) return;
    const txt = formatTick(tMath, step);
    const outer = document.createElement('div');
    outer.className = 'axis-label-outer';
    const inner = document.createElement('div');
    inner.className = `axis-label-inner axis-${axis}`;
    inner.textContent = txt;
    inner.style.color =
      axis==='x' ? App.getCSS('--axis-x') :
      axis==='y' ? App.getCSS('--axis-y') : App.getCSS('--axis-z');
    outer.appendChild(inner);

    const obj = new THREE.CSS2DObject(outer);
    const s = tMath * u;
    obj.position.set(
      axis==='x'? s : 0,
      axis==='y'? s : 0,
      axis==='z'? s : 0
    );
    Vec3D._mathGroup.add(obj);
    Vec3D._tickLabels.push(obj);
  };
  majorsX.forEach(t => putLabel('x', t));
  majorsY.forEach(t => putLabel('y', t));
  majorsZ.forEach(t => putLabel('z', t));

  // --- Chữ X/Y/Z ở đầu trục (WORLD) ---
  const letterOffW = Lw * 0.98;
  const addLetter = (txt, axis, pos) => {
    const el = document.createElement('div');
    el.className = 'axis-letter';
    el.textContent = txt;
    el.style.color =
      axis==='x' ? App.getCSS('--axis-x') :
      axis==='y' ? App.getCSS('--axis-y') : App.getCSS('--axis-z');
    const obj = new THREE.CSS2DObject(el);
    obj.position.copy(pos);            // LOCAL (WORLD units)
    Vec3D._mathGroup.add(obj);
    Vec3D._axisLetters.push(obj);
  };
  addLetter('X', 'x', new THREE.Vector3(letterOffW, 0, 0));
  addLetter('Y', 'y', new THREE.Vector3(0, letterOffW, 0));
  addLetter('Z', 'z', new THREE.Vector3(0, 0, letterOffW));

  // --- cập nhật offset pixel cho tip-label của vector (WORLD) ---
  (function updateTipLabels() {
    if (!Vec3D._vectorsGroup) return;
    const desiredPx = 16;
    const offsetW = desiredPx / (Vec3D._pxPerWorld || 1); // PX -> WORLD
    for (const g of Vec3D._vectorsGroup.children) {
      const tip = g.userData?.tipLocal; // LOCAL (WORLD)
      const dir = g.userData?.dirLocal; // LOCAL (WORLD)
      if (!tip || !dir) continue;
      const lbl = g.children.find(ch => ch.isCSS2DObject && ch.name === 'tipLabel');
      if (!lbl) continue;
      lbl.position.copy( tip.clone().add(dir.clone().multiplyScalar(offsetW)) );
    }
  })();
  // --- cập nhật vị trí nhãn "độ" của quạt góc theo khoảng cách px cố định ---
(function updateAngleLabel() {
  const g = App.currentAngleVisual3D;
  if (!g || !g.userData?.angleMeta) return;

  const { midDir, r, labelPx = Vec3D.ANGLE_LABEL_PX, gapPx = Vec3D.ANGLE_LABEL_GAP_PX } = g.userData.angleMeta;
  const lbl = g.children.find(ch => ch.isCSS2DObject);
  if (!lbl) return;

  const pxPerWorld = Vec3D._pxPerWorld || 1;
  const s = (g.scale?.x || 1); // group quạt có thể scale khi math-zoom

  // Đặt badge BÊN TRONG quạt: cách mép một khoảng theo px
  const padPx   = (gapPx || 0) + (labelPx || 0) * 0.50; // chừa nửa chiều badge + gap
  const insetW  = padPx / pxPerWorld;                   // WORLD
  const minInside = r * (Vec3D.ANGLE_LABEL_MIN_RATIO || 0.38);

  const distLocal = Math.max(minInside, r - insetW / s); // luôn ≤ r
  lbl.position.copy(midDir.clone().multiplyScalar(distLocal));
})();



};





  // ===== Projection (dashed) & tip label =====
  Vec3D.buildProjectionGroupZUp = function (vecWorld, colorCSS = '#444') {
    const g = new THREE.Group();
    const [x, y, z] = vecWorld;
    const mat = new THREE.LineDashedMaterial({
      color: new THREE.Color(colorCSS),
      dashSize: 0.6,
      gapSize: 0.35
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

  Vec3D.buildTipLabel = function (textMath, tipWorld) {
    // text = tọa độ toán, position = world (đã scale/clip)
    const div = document.createElement('div');
    div.className = 'tip-label';
    div.textContent = textMath;
    const obj = new THREE.CSS2DObject(div);
    obj.position.copy(tipWorld);
    return obj;
  };

  // ===== Arrow builder =====
  Vec3D.buildVectorGroup3D = function (vecWorld, colorHex) {
    const group = new THREE.Group();

    const tip = new THREE.Vector3(vecWorld[0], vecWorld[1], vecWorld[2]);
    const len = Math.max(tip.length(), 1e-9);
    const dir = tip.clone().normalize();

    // Shaft (along +Y local => align to dir)
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, Math.max(len - 0.25, 1e-6), 16, 1, true),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex) })
    );
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    shaft.position.copy(dir.clone().multiplyScalar((len - 0.25) / 2));
    group.add(shaft);

    // Head
    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.25, 20),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex) })
    );
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    head.position.copy(tip.clone().addScaledVector(dir, -0.25 / 2));
    group.add(head);

    return group;
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
    tz > 0 ? tz : Infinity
  );
  return isFinite(t) ? tip.multiplyScalar(t) : new THREE.Vector3(0, 0, 0);
}

  // ===== Clip tip to cube (world) =====
  function clipTipToCubeWorld(x, y, z, Lworld) {
    const tip = new THREE.Vector3(x, y, z);
    if (Math.abs(x) <= Lworld && Math.abs(y) <= Lworld && Math.abs(z) <= Lworld) {
      return tip; // trong cube
    }
    const dir = tip.clone().normalize();
    let tMin = Infinity;

    // 6 mặt
    if (Math.abs(dir.x) > 1e-12) {
      const tx = (Math.sign(x) * Lworld) / x;
      if (tx > 0 && tx < tMin) tMin = tx;
    }
    if (Math.abs(dir.y) > 1e-12) {
      const ty = (Math.sign(y) * Lworld) / y;
      if (ty > 0 && ty < tMin) tMin = ty;
    }
    if (Math.abs(dir.z) > 1e-12) {
      const tz = (Math.sign(z) * Lworld) / z;
      if (tz > 0 && tz < tMin) tMin = tz;
    }

    if (tMin < Infinity) return tip.multiplyScalar(tMin);
    return new THREE.Vector3(0, 0, 0);
  }

  // So sánh 2 vector (mảng 3 số) với sai số nhỏ
Vec3D._sameVec = function(a, b, eps = 1e-9) {
  if (!a || !b) return false;
  return Math.abs(a[0]-b[0]) < eps &&
         Math.abs(a[1]-b[1]) < eps &&
         Math.abs(a[2]-b[2]) < eps;
};

// Nếu 2 vector nguồn thay đổi / bị mất → clear quạt
Vec3D._maybeInvalidateAngle = function() {
  const g = App.currentAngleVisual3D;
  if (!g?.userData?.angleMeta?.src) return;        // chưa có quạt thì thôi

  const { a: A0, b: B0 /*, idA, idB*/ } = g.userData.angleMeta.src;

  // Dùng danh sách vector đang *hiển thị* (visible !== false)
  const cur = (App.vectorList || []).filter(v => v.visible !== false);

  // Kiểm tra còn tồn tại 2 vector có tọa độ như cũ hay không
  const hasA = cur.some(v => Vec3D._sameVec(
    [v.vec[0]||0, v.vec[1]||0, v.vec[2]||0], A0));
  const hasB = cur.some(v => Vec3D._sameVec(
    [v.vec[0]||0, v.vec[1]||0, v.vec[2]||0], B0));

  // Nếu bạn có id, ưu tiên dùng id để kiểm tra “mất” nhanh gọn:
  // const byId = (id) => cur.find(v => v.id === id);
  // const hasA = idA ? !!byId(idA) : cur.some(..._sameVec A0);
  // const hasB = idB ? !!byId(idB) : cur.some(..._sameVec B0);

  // Điều kiện CLEAR:
  // - mất 1 trong 2 (hoặc mất cả 2),
  // - hoặc cur rỗng (xóa hết vector)
  if (!(hasA && hasB) || cur.length === 0) {
    Vec3D.clearAngle();
  }
};

  // ===== Draw all vectors =====
  Vec3D.draw3DAllVectors = function (opts = { frame: false }) {
    // Nếu KHÔNG phải redraw do camera (rotate/pan/zoom) → xoá góc
Vec3D._maybeInvalidateAngle();

  if (!Vec3D._mathGroup) return;
  if (!Vec3D._vectorsGroup) {
    Vec3D._vectorsGroup = new THREE.Group();
    Vec3D._mathGroup.add(Vec3D._vectorsGroup);
  }

  // --- DỌN CỨNG TẤT CẢ LABEL/GEOMETRY CŨ (tránh “vệt” lặp) ---
  Vec3D._vectorsGroup.traverse(obj => {
    if (obj.isCSS2DObject && obj.element) {
      // tháo DOM node ra ngay, không đợi frame render sau
      obj.element.remove();
    }
    if (obj.geometry) obj.geometry.dispose?.();
    if (Array.isArray(obj.material)) obj.material.forEach(m => m?.dispose?.());
    else obj.material?.dispose?.();
  });
  // KHÔNG còn auto thay đổi kích thước khung
  Vec3D._vectorsGroup.clear();
  Vec3D.threeVecMap.clear();

  const u  = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
  const Lw = Vec3D._axisMaxWorld;
  const Lm = Lw / u;

  const focused = App.vectorList.find(v => v.focus);
  const list = focused ? [focused] : (App.vectorList || []).filter(v => v.visible !== false);

  for (const it of list) {
    const v = [(it.vec[0]||0), (it.vec[1]||0), (it.vec[2]||0)];
    const tipM = clipToCubeMath(v[0], v[1], v[2], Lm);  // cắt theo đơn vị TOÁN
    const tipLocal = tipM.clone().multiplyScalar(u);    // LOCAL (WORLD)
    const len = Math.max(tipLocal.length(), 1e-9);
    const dirLocal = len > 1e-9 ? tipLocal.clone().normalize() : new THREE.Vector3(1,0,0);

    // Arrow (LOCAL)
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, Math.max(len - 0.25, 1e-6), 16, 1, true),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(it.colorHex) })
    );
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dirLocal);
    shaft.position.copy(dirLocal.clone().multiplyScalar((len - 0.25) / 2));

    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.25, 20),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(it.colorHex) })
    );
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dirLocal);
    head.position.copy(tipLocal.clone().addScaledVector(dirLocal, -0.25/2));

    // Proj (LOCAL)
    const proj = Vec3D.buildProjectionGroupZUp([tipLocal.x, tipLocal.y, tipLocal.z], App.getCSS('--axis'));

    // Tip label (LOCAL) — text theo tọa độ toán
    const el = document.createElement('div');
    el.className = 'tip-label';
    el.textContent = App.formatTip(v);
    const labelEl = new THREE.CSS2DObject(el);
    labelEl.name = 'tipLabel';
    labelEl.position.copy(tipLocal);

    const group = new THREE.Group();
    group.userData.tipLocal = tipLocal;
    group.userData.dirLocal = dirLocal;

    group.add(shaft, head, proj, labelEl);
    Vec3D._vectorsGroup.add(group);
    Vec3D.threeVecMap.set(it.id, group);
  }

  // frame camera (WORLD)
  if (opts.frame) {
  // 1) Tính độ dài vector dài nhất (đơn vị TOÁN)
  const longestMath = App.vectorList.length
    ? Math.max(...App.vectorList.map(it=>{
        const a = it.vec.length===3 ? it.vec : [it.vec[0], it.vec[1], 0];
        return new THREE.Vector3(a[0]||0,a[1]||0,a[2]||0).length();
      }))
    : 1;

  // 2) Chọn tỉ lệ math→world sao cho vector dài nhất chiếm ~55% khung
  const Lw = Vec3D._axisMaxWorld;            // half-size khung WORLD (mặc định 50)
  const targetWorld = Lw * 0.55;              // vector dài nhất ≈ 55% nửa cạnh
  const uFit = targetWorld / Math.max(1e-9, longestMath);

  Vec3D.S3D.unitsPerWorld = Vec3D.S3D.zoomTarget = Math.min(Vec3D._ZOOM_MAX, Math.max(Vec3D._ZOOM_MIN, uFit));
  Vec3D._lastUForVectors = Vec3D.S3D.unitsPerWorld;
  Vec3D.S3D.offset.set(0,0,0);               // tâm khung ở gốc

  // 3) Đặt khoảng cách camera vừa đủ để thấy trọn khung
  // (FOV đã tăng nên không cần đứng quá xa)
  const dist = Math.max(32, Lw * 1.15);
  Vec3D._camera.position.set(dist, dist, dist);
  Vec3D._controls.target.copy(Vec3D.S3D.offset);
  Vec3D._controls.update();
}


  if (App.currentVector) {
    const v = (App.currentVector.length===3)?App.currentVector:[App.currentVector[0], App.currentVector[1], 0];
    App.coordOut(App.formatTip(v) + ' in standard basis');
  } else App.coordOut('—');
};
// Tắt và dọn sạch quạt góc + nhãn
Vec3D.clearAngle = function () {
  const g = App.currentAngleVisual3D;
  if (!g) return;
  (g.parent || Vec3D._mathGroup || Vec3D._scene).remove(g);
  g.traverse(obj => {
    obj.element?.remove?.();          // gỡ DOM CSS2D
    obj.geometry?.dispose?.();
    if (Array.isArray(obj.material)) obj.material.forEach(m => m?.dispose?.());
    else obj.material?.dispose?.();
  });
  App.currentAngleVisual3D = null;
};

// Đổi màu quạt & màu chữ theo theme hiện tại
Vec3D.refreshAngleTheme = function () {
  const g = App.currentAngleVisual3D;
  if (!g) return;
  const sectorColor = new THREE.Color(App.getCSS('--angle') || '#ffb703');
  g.children.forEach(ch => {
    if (ch.isMesh && ch.material?.color) ch.material.color.copy(sectorColor);
    if (ch.isCSS2DObject) {
      const el = ch.element;
      el.style.background = App.getCSS('--chip-bg')     || 'rgba(0,0,0,.45)';
      el.style.border     = `1px solid ${App.getCSS('--chip-border') || 'rgba(255,255,255,.22)'}`;
      el.style.color      = App.getCSS('--chip-fg')     || App.getCSS('--fg') || '#fff';
      el.style.textShadow = '0 1px 1px rgba(0,0,0,.35)';
    }
  });
  Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
  Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
};


// Xoá tất cả quạt góc (kể cả nếu biến tham chiếu bị lạc)
Vec3D.removeAllAngleVisuals = function () {
  const sweep = (root) => {
    if (!root) return;
    const trash = [];
    root.traverse(o => { if (o.userData?.isAngleSector) trash.push(o); });
    trash.forEach(g => {
      (g.parent || root).remove(g);
      g.traverse(obj => {
        obj.element?.remove?.();
        obj.geometry?.dispose?.();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m?.dispose?.());
        else obj.material?.dispose?.();
      });
    });
  };
  sweep(Vec3D._mathGroup);
  sweep(Vec3D._scene);
  App.currentAngleVisual3D = null;
};


  // ===== Angle sector =====
  // ===== Angle sector =====
Vec3D.drawAngleArc3D = function (v1, v2, rad, deg) {
  // dọn cái cũ
  Vec3D.removeAllAngleVisuals();

  // dữ liệu
  const a = new THREE.Vector3(...(v1.length === 3 ? v1 : [v1[0], v1[1], 0]));
  const b = new THREE.Vector3(...(v2.length === 3 ? v2 : [v2[0], v2[1], 0]));
  if (a.length() < 1e-9 || b.length() < 1e-9 || !isFinite(rad) || rad <= 1e-9) return;

  const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
  const au = a.clone().multiplyScalar(u);
  const bu = b.clone().multiplyScalar(u);

  const planeN = new THREE.Vector3().crossVectors(au, bu);
  if (planeN.lengthSq() < 1e-18) return; // cùng phương
  planeN.normalize();

  const xDir = au.clone().normalize();
  const yDir = new THREE.Vector3().crossVectors(planeN, xDir).normalize();

  // hình quạt: bán kính luôn nhỏ hơn vector ngắn nhất
const r = Math.min(au.length(), bu.length()) * (Vec3D.ANGLE_RADIUS_RATIO || 0.72);
const sweep = rad;
const segments = Math.max(32, Math.ceil((sweep * 64) / Math.PI));
const geom = new THREE.RingGeometry(0, r, segments, 1, 0, sweep);

const angleColor = App.getCSS('--angle') || '#ffd166';
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

// nhãn độ (đặt tạm bên trong, lát nữa hàm update sẽ canh đúng)
const midDirUnit = xDir.clone().applyAxisAngle(planeN, sweep / 2).normalize();
const txt = `${deg.toFixed(1)}°`;
const el = document.createElement('div');
el.className = 'tip-label angle-badge';
el.textContent = txt;
const lbl = new THREE.CSS2DObject(el);
lbl.position.copy(midDirUnit.clone().multiplyScalar(r * 0.6)); // tạm 60% bán kính

// style chip
el.style.background   = App.getCSS('--chip-bg')     || 'rgba(0,0,0,.45)';
el.style.border       = `1px solid ${App.getCSS('--chip-border') || 'rgba(255,255,255,.22)'}`;
el.style.color        = App.getCSS('--chip-fg')     || App.getCSS('--fg') || '#fff';
el.style.padding      = '2px 6px';
el.style.borderRadius = '8px';
el.style.fontWeight   = '600';
el.style.textShadow   = '0 1px 1px rgba(0,0,0,.35)';

const group = new THREE.Group();
const srcA = [a.x, a.y, a.z];
const srcB = [b.x, b.y, b.z];
group.userData.isAngleSector = true;
group.userData.angleMeta = {
  midDir: midDirUnit.clone(),
  r,
  createdU: u,
  src: { a: srcA, b: srcB },
  labelPx: Vec3D.ANGLE_LABEL_PX,
  gapPx: Vec3D.ANGLE_LABEL_GAP_PX,
};
group.add(sector);
group.add(lbl);

// add vào lớp quạt
if (!Vec3D._angleLayer) {
  Vec3D._angleLayer = new THREE.Group();
  if (Vec3D._mathGroup) Vec3D._mathGroup.add(Vec3D._angleLayer);
}
Vec3D._angleLayer.add(group);
App.currentAngleVisual3D = group;

};



  // ===== Hard refresh =====
  Vec3D.hardRefresh3D = function (frameFirst = false) {
  if (App.mode !== '3D') return;
  Vec3D.draw3DAllVectors({ frame: frameFirst });

  Vec3D._controls.update();
  Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
  Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
};
Vec3D.setFOV = function(fovDeg = 24) {
  if (!Vec3D._camera) return;
  Vec3D._camera.fov = Math.max(5, Math.min(90, fovDeg));
  Vec3D._camera.updateProjectionMatrix();
  Vec3D.hardRefresh3D(false);
};


})();
