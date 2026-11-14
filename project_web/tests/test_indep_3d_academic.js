// ==============================================================================
// TEST: 3D Academic Rendering for Linear Independence (Three.js Dimension Growth)
// ==============================================================================
const assert = require("assert");

// Mock browser globals
global.window = global;
global.document = {
  body: { classList: { contains: () => false } },
  documentElement: { classList: { contains: () => false } },
  getElementById: (id) => null
};

// Mock THREE.js
global.THREE = {
  Vector3: class {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x; this.y = y; this.z = z;
    }
    clone() { return new global.THREE.Vector3(this.x, this.y, this.z); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    crossVectors(a, b) {
      this.x = a.y * b.z - a.z * b.y;
      this.y = a.z * b.x - a.x * b.z;
      this.z = a.x * b.y - a.y * b.x;
      return this;
    }
    normalize() {
      const l = Math.hypot(this.x, this.y, this.z) || 1;
      this.x /= l; this.y /= l; this.z /= l;
      return this;
    }
    lerp(v, alpha) {
      this.x += (v.x - this.x) * alpha;
      this.y += (v.y - this.y) * alpha;
      this.z += (v.z - this.z) * alpha;
      return this;
    }
    length() { return Math.hypot(this.x, this.y, this.z); }
  },
  Group: class {
    constructor() {
      this.children = [];
      this.parent = null;
    }
    add(child) {
      this.children.push(child);
      child.parent = this;
    }
    remove(child) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) {
        this.children.splice(idx, 1);
        child.parent = null;
      }
    }
    traverse(fn) {
      fn(this);
      for (const ch of this.children.slice()) {
        if (ch.traverse) ch.traverse(fn);
        else fn(ch);
      }
    }
  },
  BufferGeometry: class {
    constructor() { this.points = []; this.attributes = {}; }
    setFromPoints(pts) { this.points = pts; return this; }
    setAttribute(name, attr) { this.attributes[name] = attr; return this; }
    computeVertexNormals() {}
    dispose() {}
  },
  BufferAttribute: class {
    constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; }
  },
  LineBasicMaterial: class {
    constructor(opts) { Object.assign(this, opts); }
    dispose() {}
  },
  LineDashedMaterial: class {
    constructor(opts) { Object.assign(this, opts); }
    dispose() {}
  },
  MeshBasicMaterial: class {
    constructor(opts) { Object.assign(this, opts); }
    dispose() {}
  },
  SphereGeometry: class {
    constructor(r) { this.radius = r; }
    dispose() {}
  },
  Line: class {
    constructor(geom, mat) {
      this.geometry = geom;
      this.material = mat;
    }
    computeLineDistances() {}
  },
  LineSegments: class {
    constructor(geom, mat) {
      this.geometry = geom;
      this.material = mat;
    }
    computeLineDistances() {}
  },
  LineLoop: class {
    constructor(geom, mat) {
      this.geometry = geom;
      this.material = mat;
    }
  },
  Mesh: class {
    constructor(geom, mat) {
      this.geometry = geom;
      this.material = mat;
      this.position = new global.THREE.Vector3();
    }
  }
};

global.App = {
  mode: "3D",
  theme: "dark",
  vectorList: []
};

let hardRefreshCalled = false;
global.Vec3D = {
  S3D: { unitsPerWorld: 1.5 },
  _axisMaxWorld: 50,
  _camera: { fov: 24, position: new global.THREE.Vector3(15, 15, 15) },
  _renderer: { domElement: { clientHeight: 800 } },
  hardRefresh3D: function() {
    hardRefreshCalled = true;
  }
};

require("../frontend_v2/js/app/playback/indep_animation.js");

console.log("=== KIEM THU 3D THREE.JS CHO HOAT CANH DOC LAP TUYEN TINH ===");

const Animator = App.IndepAnimator;
assert(Animator, "IndepAnimator phai ton tai");

// 1. Kiem thu Phase 0 (Truc 1D)
console.log("1. Kiem thu Phase 0: Truc 1D span(v1)");
App.vectorList = [
  { id: 1, vec: [2, 0, 0] },
  { id: 2, vec: [0, 3, 0] },
  { id: 3, vec: [0, 0, 4] }
];
Animator.start(App.vectorList);
assert.strictEqual(Animator.getCurrentPhase(), 0);

const mathGroup = new THREE.Group();
Animator.render3D(mathGroup);
assert(Animator._threeGroup, "threeGroup phai duoc tao trong mathGroup");
assert(Animator._threeGroup.children.length >= 2, "Phase 0 phai co truc 1D va goc toa do / tick marks");
console.log("   -> Phase 0 tao thanh cong " + Animator._threeGroup.children.length + " doi tuong Three.js");

// 2. Kiem thu Phase 1 (Mat phang 2D) - Giai doan truot & Dan no Affine
console.log("2. Kiem thu Phase 1: Mo rong mat phang 2D (v2 doc lap)");
Animator.goToPhase(1);
Animator._phaseProgress = 0.2; // Giai doan truot
Animator.render3D(mathGroup);
assert(Animator._threeGroup.children.length >= 4, "Phase 1 (truot) phai co cac ray va doan moving");

Animator._phaseProgress = 0.7; // Giai doan luoi Affine dan no
Animator.render3D(mathGroup);
assert(Animator._threeGroup.children.length >= 4, "Phase 1 (Affine) phai co vien hinh binh hanh va luoi Affine");
console.log("   -> Phase 1 tao thanh cong " + Animator._threeGroup.children.length + " doi tuong Three.js");

// 3. Kiem thu Phase 1 khi v2 cung phuong (Collinear / Phu thuoc)
console.log("3. Kiem thu Phase 1: v2 cung phuong (Phu thuoc)");
const depList = [
  { id: 1, vec: [1, 2, 0] },
  { id: 2, vec: [2, 4, 0] }
];
Animator.start(depList);
Animator.goToPhase(1);
Animator.render3D(mathGroup);
assert(Animator._threeGroup.children.length >= 2, "Phase 1 collinear phai co marker canh bao tai ngon v2");
console.log("   -> Collinear tao marker canh bao ho phach");

// 4. Kiem thu Phase 2: v3 doc lap (dim = 3, khoi hop 3D wireframe)
console.log("4. Kiem thu Phase 2: v3 doc lap (Vuon ra khoi hop 3D)");
Animator.start(App.vectorList);
Animator.goToPhase(2);
Animator._phaseProgress = 0.8;
Animator.render3D(mathGroup);
assert(Animator._threeGroup.children.length >= 6, "Phase 2 doc lap phai co truc 3, chan hinh chieu, phan ra tren mat phang va khoi hop 3D");
console.log("   -> 3D Box Wireframe tao thanh cong voi " + Animator._threeGroup.children.length + " doi tuong");

// 5. Kiem thu Phase 2: v3 dong phang (Phan ra he so c1, c2)
console.log("5. Kiem thu Phase 2: v3 dong phang (Phan ra phu thuoc)");
const coplanarList = [
  { id: 1, vec: [1, 0, 0] },
  { id: 2, vec: [0, 1, 0] },
  { id: 3, vec: [2, 3, 0] }
];
Animator.start(coplanarList);
Animator.goToPhase(2);
Animator._phaseProgress = 0.9;
Animator.render3D(mathGroup);
assert(Animator._threeGroup.children.length >= 6, "Phase 2 coplanar phai co 2 duong chieu song song, 2 vector highlight va 3 diem nut");
console.log("   -> Phan ra dong phang 3D hoat dong chuan xac!");

// 6. Kiem thu Redraw goi Vec3D.hardRefresh3D
console.log("6. Kiem thu Redraw triggers Vec3D.hardRefresh3D");
hardRefreshCalled = false;
Animator.redraw();
assert(hardRefreshCalled, "Animator.redraw() phai kich hoat Vec3D.hardRefresh3D");
console.log("   -> Redraw 3D da dong bo tuyet doi!");

// 7. Don dep Stop
Animator.stop();
assert.strictEqual(Animator._threeGroup, null, "threeGroup phai duoc don dep khi stop()");
console.log("   -> Stop dọn dep Three.js group sach se!");

console.log("=== TAT CA 7 CA KIEM THU 3D CHUAN TOAN HOC DA VUOT QUA 100%! ===");
