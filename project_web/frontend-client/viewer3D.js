// ===================== viewer3D.js =====================

(function () {
  window.Vec3D = window.Vec3D || {};
  const App = window.App || {};

  const threeLayer = document.getElementById('threeLayer');

  // Public fields (useful if you need to debug from console)
  Vec3D._scene = null; Vec3D._camera = null; Vec3D._renderer = null; Vec3D._controls = null;
  Vec3D._axisMax = 50;          // lưu phạm vi ±trục hiện tại
  Vec3D._lastLabelKey = "";     // cache để khỏi dựng lại nhãn khi không cần

  Vec3D._animating = false;
  Vec3D._hover3D = false; Vec3D._pressed = new Set(); Vec3D._kbAnimId = null;

  Vec3D.threeVecMap = new Map();
  Vec3D._labelSprites = [];
  Vec3D._gridHelper = null; Vec3D._axesGroup = null; Vec3D._axisTicks = null;

  // Sizing for text sprites
  Vec3D.AXIS_TICK_PX = 26;
  Vec3D.AXIS_LETTER_PX = 30;
  Vec3D.TIP_PX = 22;
  Vec3D.TEXTURE_RATIO = 2;
  // Hiển thị số trên trục?
Vec3D.SHOW_TICK_NUMBERS = true;         // false = ẩn (sạch như site tham chiếu)
Vec3D.SHOW_NUMBERS_WHEN_RANGE_LT = 120;   // nếu bật, chỉ hiện khi zoom đủ gần (range < 40)


  Vec3D.init3D = function () {
    const rect = threeLayer.getBoundingClientRect();
    Vec3D._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    Vec3D._renderer.setSize(rect.width || 760, rect.height || 760);
    Vec3D._renderer.setPixelRatio(window.devicePixelRatio || 1);
    threeLayer.appendChild(Vec3D._renderer.domElement);

    Vec3D._scene = new THREE.Scene();
    Vec3D._scene.background = new THREE.Color(App.getCSS('--bg'));

    Vec3D._camera = new THREE.PerspectiveCamera(10, (rect.width || 760) / (rect.height || 760), 0.1, 1e12);
    Vec3D._camera.position.set(100, 100, 100);
    Vec3D._camera.up.set(0, 0, 1); // Z-up

    Vec3D._controls = new THREE.OrbitControls(Vec3D._camera, Vec3D._renderer.domElement);
    // Mỗi khi camera/target đổi (zoom/pan/rotate), cập nhật step & nhãn trục
    Vec3D._controls.addEventListener('change', () => {
      if (App.mode === '3D') Vec3D.addAxisLabelsDynamic(Vec3D._axisMax || 50);
    });

    Vec3D._controls.enableDamping = true; Vec3D._controls.dampingFactor = 0.07;
    Vec3D._controls.rotateSpeed = 0.6; Vec3D._controls.enablePan = true;
    Vec3D._controls.minDistance = 0.5; Vec3D._controls.maxDistance = 1e12;

    Vec3D.update3DHelpersBase();

    window.addEventListener('resize', () => {
      const r = threeLayer.getBoundingClientRect();
      Vec3D._camera.aspect = Math.max(1e-6, (r.width || 760) / (r.height || 760));
      Vec3D._camera.updateProjectionMatrix();
      Vec3D._renderer.setSize(r.width || 760, r.height || 760);
      if (App.mode === '3D') Vec3D.hardRefresh3D(false);
    });

    Vec3D._renderer.domElement.addEventListener('wheel', (e) => { e.preventDefault(); }, { passive: false });
    Vec3D._renderer.domElement.addEventListener('mouseenter', () => { Vec3D._hover3D = true; threeLayer.focus(); });
    Vec3D._renderer.domElement.addEventListener('mouseleave', () => { Vec3D._hover3D = false; });

    // Keyboard nav (WASD + QE + arrows)
    document.addEventListener('keydown', (e) => {
      const controlsPane = document.getElementById('controls');
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || controlsPane.contains(e.target);
      if (App.mode !== '3D' || !Vec3D._hover3D || typing) return;
      const key = e.key.toLowerCase(); Vec3D._pressed.add(key);
      if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(key)) {
        e.preventDefault(); e.stopPropagation();
      }
    }, { capture: true });
    document.addEventListener('keyup', (e) => {
      const controlsPane = document.getElementById('controls');
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || controlsPane.contains(e.target);
      if (typing) return;
      const key = e.key.toLowerCase();
      if (Vec3D._pressed.has(key)) { Vec3D._pressed.delete(key); e.preventDefault(); e.stopPropagation(); }
    }, { capture: true });

    const stepLoop = () => {
      if (App.mode === '3D' && Vec3D._pressed.size && Vec3D._camera && Vec3D._controls) {
        const base = Vec3D._camera.position.distanceTo(Vec3D._controls.target);
        const speed = (Vec3D._pressed.has('shift') ? 0.004 : 0.002) * base;

        const forward = new THREE.Vector3(); Vec3D._camera.getWorldDirection(forward);
        const up = new THREE.Vector3(0, 0, 1);
        const right = new THREE.Vector3().crossVectors(forward, up).normalize();
        const delta = new THREE.Vector3();

        if (Vec3D._pressed.has('w') || Vec3D._pressed.has('arrowup')) delta.add(up.clone().multiplyScalar(+speed));
        if (Vec3D._pressed.has('s') || Vec3D._pressed.has('arrowdown')) delta.add(up.clone().multiplyScalar(-speed));
        if (Vec3D._pressed.has('a') || Vec3D._pressed.has('arrowleft')) delta.add(right.clone().multiplyScalar(-speed));
        if (Vec3D._pressed.has('d') || Vec3D._pressed.has('arrowright')) delta.add(right.clone().multiplyScalar(+speed));
        if (Vec3D._pressed.has('q')) delta.add(forward.clone().multiplyScalar(-speed));
        if (Vec3D._pressed.has('e')) delta.add(forward.clone().multiplyScalar(+speed));

        if (delta.lengthSq() > 0) { Vec3D._camera.position.add(delta); Vec3D._controls.target.add(delta); Vec3D._controls.update(); }
      }
      Vec3D._kbAnimId = requestAnimationFrame(stepLoop);
    };
    if (!Vec3D._kbAnimId) Vec3D._kbAnimId = requestAnimationFrame(stepLoop);
  };

  Vec3D.show3D = function () {
    document.getElementById('canvas2d').style.display = 'none';
    threeLayer.style.display = 'block';
    try { threeLayer.focus({ preventScroll: true }); } catch (e) { }
    Vec3D._hover3D = true;

    if (!Vec3D._animating) {
      Vec3D._animating = true;
      (function loop() {
        if (!Vec3D._animating) return;
        requestAnimationFrame(loop);
        if (Vec3D._controls) Vec3D._controls.update();
        Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
      })();
    }
  };

  // ====== Text Sprites ======
  Vec3D.makeTextSprite = function (text, color = "#fff", pxSize = 18, bg = 'rgba(0,0,0,0.6)', depthTest = true) {
    const pad = 6, fontPx = pxSize, fontSpec = `600 ${fontPx}px Arial`;
    const tmp = document.createElement('canvas').getContext('2d'); tmp.font = fontSpec;
    const w = Math.ceil(tmp.measureText(text).width + pad * 2), h = Math.ceil(fontPx + pad * 2), ratio = Vec3D.TEXTURE_RATIO;
    const c = document.createElement('canvas'); c.width = w * ratio; c.height = h * ratio;
    const ctx = c.getContext('2d'); ctx.scale(ratio, ratio); ctx.font = fontSpec; ctx.textBaseline = 'top';
    if (bg) {
      ctx.fillStyle = bg; const r = 4; ctx.beginPath();
      ctx.moveTo(0 + r, 0);
      ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r); ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r);
      ctx.closePath(); ctx.fill();
    }
    // viền & shadow nhẹ hơn khi có nền để chữ đỡ “bết”
const hasBg = !!bg && bg !== 'none';
ctx.shadowColor = 'rgba(0,0,0,' + (hasBg ? 0.20 : 0.35) + ')';
ctx.shadowBlur  = hasBg ? 1 : 2;

ctx.strokeStyle = 'rgba(0,0,0,' + (hasBg ? 0.35 : 0.75) + ')';
ctx.lineWidth   = hasBg ? 0.8 : 1.1;

ctx.strokeText(text, pad, pad);
ctx.shadowBlur = 0;
ctx.fillStyle = color;
ctx.fillText(text, pad, pad);


    const tex = new THREE.Texture(c); tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: depthTest, depthWrite: false });
    const sp = new THREE.Sprite(mat);
    return sp;
  };

  Vec3D.clear3DLabels = function () {
    for (const sp of Vec3D._labelSprites) {
      Vec3D._scene.remove(sp);
      sp.material?.map?.dispose?.(); sp.material?.dispose?.();
    }
    Vec3D._labelSprites.length = 0;
  };

  Vec3D.labelWorldScaleForPixels = function (distance) {
    const vFOV = Vec3D._camera.fov * Math.PI / 180, screenH = Vec3D._renderer.domElement.clientHeight;
    const worldH = 2 * Math.tan(vFOV / 2) * distance;
    return worldH / screenH;
  };

  // ====== Helpers / Axes / Grid ======
  Vec3D.buildAxesLines = function (L, colors) {
    const g = new THREE.Group();
    const makeAxis = (axis) => {
      let p1, p2;
      if (axis === 'x') { p1 = new THREE.Vector3(-L, 0, 0); p2 = new THREE.Vector3(L, 0, 0); }
      if (axis === 'y') { p1 = new THREE.Vector3(0, -L, 0); p2 = new THREE.Vector3(0, L, 0); }
      if (axis === 'z') { p1 = new THREE.Vector3(0, 0, -L); p2 = new THREE.Vector3(0, 0, L); }
      const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(colors[axis]) });
      const line = new THREE.Line(geo, mat);
      g.add(line);
    };
    makeAxis('x'); makeAxis('y'); makeAxis('z');
    return g;
  };

  Vec3D.update3DHelpersBase = function () {
    if (Vec3D._gridHelper) { Vec3D._scene.remove(Vec3D._gridHelper); Vec3D._gridHelper = null; }
    if (Vec3D._axesGroup) { Vec3D._scene.remove(Vec3D._axesGroup); Vec3D._axesGroup = null; }
    if (Vec3D._axisTicks) { Vec3D._scene.remove(Vec3D._axisTicks); Vec3D._axisTicks = null; }
    Vec3D.clear3DLabels();

    const axisMax = 50;
    const gcol = new THREE.Color(App.getCSS('--grid-light'));
    Vec3D._gridHelper = new THREE.GridHelper(axisMax * 2, 80, gcol.getHex(), gcol.getHex());
    Vec3D._gridHelper.rotation.x = Math.PI / 2; // Oxy
    Vec3D._scene.add(Vec3D._gridHelper);

    Vec3D._axesGroup = Vec3D.buildAxesLines(axisMax, { x: App.getCSS('--axis-x'), y: App.getCSS('--axis-y'), z: App.getCSS('--axis-z') });
    Vec3D._scene.add(Vec3D._axesGroup);
  };

  Vec3D.addAxisLabelsDynamic = function (axisMax) {
    // helper cục bộ: chọn step 1–2–5
const niceStep = (raw) => {
  raw = Math.max(1e-12, Math.abs(raw));
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const s = raw / p;                       // 1..10
  const m = (s <= 1) ? 1 : (s <= 2) ? 2 : (s <= 5) ? 5 : 10;
  return m * p;
};

// helper cục bộ: format tick theo step (bỏ đuôi .0, .00…)
const formatTick = (v, step) => {
  const abs = Math.abs(v);
  if (abs >= 1e12 || abs < 1e-12) return v.toExponential(0).replace('+','');
  const dec = Math.max(0, Math.min(10, -Math.floor(Math.log10(step))));
  let s = (Math.round(v / step) * step).toFixed(dec);
  if (s.includes('.')) s = s.replace(/\.?0+$/, '');
  return s;
};

  if (!Vec3D._camera || !Vec3D._renderer) return;
  Vec3D._axisMax = axisMax;

  // 1) world-units / pixel tại target
  const dist = Vec3D._camera.position.distanceTo(Vec3D._controls?.target || new THREE.Vector3());
  const vFOV = Vec3D._camera.fov * Math.PI / 180;
  const screenH = Math.max(1, Vec3D._renderer.domElement.clientHeight);
  const worldH = 2 * Math.tan(vFOV / 2) * dist;
  const worldPerPx = worldH / screenH;

  // 2) spacing mục tiêu theo pixel (đặt thưa ra chút)
  const targetPx = 100; // 80→100 để đỡ dày
  const rawStep = targetPx * worldPerPx;
  const step = niceStep(rawStep);


  // 3) Tạo dãy tick theo đúng bội k*step (không bị lẻ)
const kMin = Math.ceil(-axisMax / step);
const kMax = Math.floor(axisMax / step);
const ticks = [];
for (let k = kMin; k <= kMax; k++) ticks.push(+((k * step).toFixed(12)));


  // 4) Chỉ gắn nhãn ~12 cái / trục
  const MAX_LABELS_PER_AXIS = 12;
  const labelEvery = Math.max(1, Math.ceil(ticks.length / MAX_LABELS_PER_AXIS));

  // Cache key (đổi khi step/labelEvery/theme thay đổi)
  const key = `${axisMax}|${step.toFixed(10)}|${labelEvery}|${App.theme}`;
  if (Vec3D._lastLabelKey === key) return;
  Vec3D._lastLabelKey = key;

  // 5) Xoá nhãn & tick cũ
  Vec3D.clear3DLabels();
  if (Vec3D._axisTicks) {
    Vec3D._scene.remove(Vec3D._axisTicks);
    Vec3D._axisTicks.geometry?.dispose?.();
    Vec3D._axisTicks.material?.dispose?.();
    Vec3D._axisTicks = null;
  }

  // 6) Vẽ CHỈ “major ticks” (mỗi labelEvery tick mới vẽ) để nhẹ
  const majors = ticks.filter((_, i) => i % labelEvery === 0);
  const gridCol = new THREE.Color(App.getCSS('--grid-light'));
  const tickLen = Math.max(axisMax * 0.02, 0.25);
  const pos = [];
  const addMajor = (axis, t) => {
    if (axis === 'x') { pos.push(t, -tickLen, 0,  t, tickLen, 0); }
    else if (axis === 'y') { pos.push(-tickLen, t, 0,  tickLen, t, 0); }
    else { pos.push(-tickLen, 0, t,  tickLen, 0, t); }
  };
  for (const t of majors) { addMajor('x', t); addMajor('y', t); addMajor('z', t); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  Vec3D._axisTicks = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: gridCol.getHex() }));
  Vec3D._scene.add(Vec3D._axisTicks);

  // 7) Gắn nhãn cho majors, màu theo trục – scale theo pixel
  const colX = App.getCSS('--axis-x');
  const colY = App.getCSS('--axis-y');
  const colZ = App.getCSS('--axis-z');
  const bg = App.getCSS('--label-bg');

  const putLabel = (axis, val, x, y, z) => {
    const txt = formatTick(val, step);

    const color = axis === 'x' ? colX : (axis === 'y' ? colY : colZ);
    const sp = Vec3D.makeTextSprite(txt, color, 22, bg, /*depthTest=*/false);
    sp.position.set(x, y, z);
    const s = (worldH / screenH) * 22; // 22 px
    sp.scale.set(s, s * 0.56, 1);
    Vec3D._scene.add(sp);
    Vec3D._labelSprites.push(sp);
  };

  for (const t of majors) {
    if (Math.abs(t) <= 1e-12) continue; // tránh dán 0 trùng vào tâm
    putLabel('x', t, t, 0, 0);
    putLabel('y', t, 0, t, 0);
    putLabel('z', t, 0, 0, t);
  }

  // 8) Ký tự X/Y/Z ở đầu trục
  const letterOff = axisMax * 1.12;
  const addLetter = (txt, axis, vec) => {
    const color = axis === 'x' ? colX : (axis === 'y' ? colY : colZ);
    const sp = Vec3D.makeTextSprite(txt, color, 28, bg, false);
    sp.position.copy(vec);
    const s = (worldH / screenH) * 28;
    sp.scale.set(s, s * 0.58, 1);
    Vec3D._scene.add(sp); Vec3D._labelSprites.push(sp);
  };
  addLetter('X', 'x', new THREE.Vector3(letterOff, 0, 0));
  addLetter('Y', 'y', new THREE.Vector3(0, letterOff, 0));
  addLetter('Z', 'z', new THREE.Vector3(0, 0, letterOff));
};

  // ====== Projection cubes & vector bodies ======
  Vec3D.buildProjectionGroupZUp = function (vec3, colorCSS = '#444') {
    const g = new THREE.Group(); const [x, y, z] = vec3;
    const mat = new THREE.LineDashedMaterial({ color: new THREE.Color(colorCSS), dashSize: 0.6, gapSize: 0.35 });
    const mk = (pts) => { const geo = new THREE.BufferGeometry().setFromPoints(pts); const l = new THREE.Line(geo, mat); l.computeLineDistances(); return l; };

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

  Vec3D.buildTipLabel = function (vec3, fg, bg) {
    // nền theo theme: dark -> đen nhạt; light -> trắng mờ
const tipBG = (String(App.theme||'').toLowerCase().includes('dark'))
  ? 'rgba(0,0,0,0.25)'
  : 'rgba(255,255,255,0.85)';

const sp = Vec3D.makeTextSprite(
  App.formatTip(vec3),
  App.getCSS('--label-fg'),
  Vec3D.TIP_PX,
  tipBG,
  false
);
sp.material.opacity = 0.95; // tổng thể nhẹ hơn một chút


    sp.renderOrder = 999;
    sp.position.set(vec3[0], vec3[1], vec3[2]);
    const d = Vec3D._camera.position.distanceTo(sp.position);
    const s = Vec3D.labelWorldScaleForPixels(d) * Vec3D.TIP_PX;
    sp.scale.set(s, s * 0.5, 1);
    return sp;
  };

  Vec3D.buildVectorGroup3D = function (vec, colorHex, haloHex, highlighted) {
    const group = new THREE.Group();
    const v = new THREE.Vector3(vec[0], vec[1], vec[2]);
    const len = Math.max(v.length(), 1e-9);
    const dir = v.clone().normalize();

    const headLen = Math.max(0.8, Math.min(3.5, len * 0.12));
    const headRad = 0.06 * Math.max(1, Math.log10(1 + len)) * 2.4;
    const shaftR = headRad / 2.4;
    const bodyLen = Math.max(len - headLen, 1e-4);

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(shaftR, shaftR, bodyLen, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex) })
    );
    shaft.position.copy(dir.clone().multiplyScalar(bodyLen / 2));
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    group.add(shaft);

    const head = new THREE.Mesh(
      new THREE.ConeGeometry(headRad, headLen, 20),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex) })
    );
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    head.position.copy(v.clone().addScaledVector(dir, -headLen / 2));
    group.add(head);

    if (highlighted) {
      const haloAlpha = .35, haloRad = shaftR * 2.6;
      const halo = new THREE.Mesh(
        new THREE.CylinderGeometry(haloRad, haloRad, bodyLen * 1.02, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(haloHex), transparent: true, opacity: haloAlpha, depthWrite: false, depthTest: false })
      );
      halo.position.copy(dir.clone().multiplyScalar(bodyLen / 2));
      halo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      halo.renderOrder = 500; group.add(halo);

      const coneHalo = new THREE.Mesh(
        new THREE.ConeGeometry(headRad * 1.25, headLen * 1.1, 20),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(haloHex), transparent: true, opacity: haloAlpha * 0.9, depthWrite: false, depthTest: false })
      );
      coneHalo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      coneHalo.position.copy(v.clone().addScaledVector(dir, -headLen / 2));
      coneHalo.renderOrder = 500; group.add(coneHalo);
    }

    return group;
  };

  Vec3D.draw3DAllVectors = function (opts = { frame: true }) {
    for (const [, grp] of Vec3D.threeVecMap) { Vec3D._scene.remove(grp); }
    Vec3D.threeVecMap.clear();

    const maxComp = App.vectorList.length ? Math.max(...App.vectorList.map(it => it.vec.reduce((m, a) => Math.max(m, Math.abs(a)), 0))) : 10;
    const axisMax = Math.max(10, maxComp * 2);

    if (Vec3D._gridHelper) Vec3D._scene.remove(Vec3D._gridHelper);
    const gcol = new THREE.Color(App.getCSS('--grid-light'));
    const divisions = Math.min(500, Math.max(40, Math.round(axisMax * 4)));
    Vec3D._gridHelper = new THREE.GridHelper(axisMax * 2, divisions, gcol.getHex(), gcol.getHex());
    Vec3D._gridHelper.rotation.x = Math.PI / 2;
    Vec3D._scene.add(Vec3D._gridHelper);

    if (Vec3D._axesGroup) Vec3D._scene.remove(Vec3D._axesGroup);
    Vec3D._axesGroup = Vec3D.buildAxesLines(axisMax, { x: App.getCSS('--axis-x'), y: App.getCSS('--axis-y'), z: App.getCSS('--axis-z') });
    Vec3D._scene.add(Vec3D._axesGroup);

    Vec3D.addAxisLabelsDynamic(axisMax);

    for (const it of App.vectorList) {
      const v3 = (it.vec.length === 3) ? it.vec : [it.vec[0], it.vec[1], 0];
      const arrow = Vec3D.buildVectorGroup3D(v3, it.colorHex, it.haloHex, it.highlighted);
      const proj = Vec3D.buildProjectionGroupZUp(v3, App.getCSS('--axis'));
      const tip = Vec3D.buildTipLabel(v3, App.getCSS('--label-fg'), App.getCSS('--label-bg'));
      const group = new THREE.Group(); group.add(arrow); group.add(proj); group.add(tip);
      Vec3D._scene.add(group); Vec3D.threeVecMap.set(it.id, group);
    }

    if (opts.frame) {
      const longest = App.vectorList.length ? Math.max(...App.vectorList.map(it => new THREE.Vector3(...(it.vec.length === 3 ? it.vec : [it.vec[0], it.vec[1], 0])).length())) : 1;
      const dist = Math.max(40, longest * 2.6, axisMax * 1.5);
      Vec3D._camera.position.set(dist, dist, dist);
      Vec3D._controls.target.set(0, 0, 0); Vec3D._controls.update();
    }

    // keep label size constant
    const hook = () => {
      if (!Vec3D._animating) return;
      for (const sp of Vec3D._labelSprites) {
        const d = Vec3D._camera.position.distanceTo(sp.position);
        const s = Vec3D.labelWorldScaleForPixels(d) * Vec3D.AXIS_TICK_PX;
        sp.scale.set(s, s * 0.56, 1);
      }
      requestAnimationFrame(hook);
    };
    requestAnimationFrame(hook);

    if (App.currentVector) {
      const v = (App.currentVector.length === 3) ? App.currentVector : [App.currentVector[0], App.currentVector[1], 0];
      App.coordOut(App.formatTip(v) + ' in standard basis');
    } else App.coordOut('—');
  };

  Vec3D.drawAngleArc3D = function (v1, v2, rad, deg) {
  if (App.currentAngleVisual3D) {
    Vec3D._scene.remove(App.currentAngleVisual3D);
    App.currentAngleVisual3D.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) { obj.material.map?.dispose?.(); obj.material.dispose?.(); }
    });
    App.currentAngleVisual3D = null;
  }

  const a = new THREE.Vector3(...(v1.length === 3 ? v1 : [v1[0], v1[1], 0]));
  const b = new THREE.Vector3(...(v2.length === 3 ? v2 : [v2[0], v2[1], 0]));
  const lenA = a.length(), lenB = b.length();
  if (lenA < 1e-9 || lenB < 1e-9 || !isFinite(rad) || rad <= 1e-9) return;

  const w = new THREE.Vector3().crossVectors(a, b);
  if (w.lengthSq() < 1e-18) return; // colinear
  w.normalize();

  const u = a.clone().normalize();
  const v_ = new THREE.Vector3().crossVectors(w, u).normalize();
  const r = Math.min(lenA, lenB) * 0.6;

  // Dùng rad từ backend, luôn trong [0,π]
  const sweep = rad;

  const segments = Math.max(32, Math.ceil(sweep * 64 / Math.PI));
  const geom = new THREE.RingGeometry(0, r, segments, 1, 0, sweep);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffc000, transparent: true, opacity: 0.35, side: THREE.DoubleSide,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
  });
  const sector = new THREE.Mesh(geom, mat);

  const basis = new THREE.Matrix4().makeBasis(u, v_, w);
  sector.applyMatrix4(basis);

  const group = new THREE.Group();
  group.add(sector);

  // Label ở giữa cung
  const midDir = u.clone().applyAxisAngle(w, sweep / 2).multiplyScalar(r * 1.12);
  const text = `${deg.toFixed(1)}°`;   // dùng luôn deg từ backend
  const sp = Vec3D.makeTextSprite(text, App.getCSS('--label-fg'), 24, App.getCSS('--label-bg'), false);
  sp.onBeforeRender = function (renderer, scene, camera) {
    const d = camera.position.distanceTo(sp.position);
    const s = Vec3D.labelWorldScaleForPixels(d) * 24;
    sp.scale.set(s, s * 0.56, 1);
  };
  sp.position.copy(midDir);
  group.add(sp);

  Vec3D._scene.add(group);
  App.currentAngleVisual3D = group;
};


  // Double-refresh to ensure ticks/labels stabilized
  Vec3D.hardRefresh3D = function (frameFirst = false) {
    if (App.mode !== '3D') return;
    requestAnimationFrame(() => {
      Vec3D.draw3DAllVectors({ frame: frameFirst });
      Vec3D._controls.update(); Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
      requestAnimationFrame(() => {
        Vec3D.draw3DAllVectors({ frame: false });
        Vec3D._controls.update(); Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
      });
    });
  };

})();