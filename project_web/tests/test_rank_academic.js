const fs = require("fs");
const path = require("path");
const assert = require("assert");

// Mock Browser & Three.js Environment
global.window = global;
global.performance = { now: () => Date.now() };
global.document = {
  body: { classList: { contains: () => false } },
  documentElement: { classList: { contains: () => false } },
  getElementById: () => null,
  createElement: () => ({
    style: { setProperty: () => {} },
    classList: { toggle: () => {} },
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild: () => {},
    insertBefore: () => {}
  })
};

class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  clone() {
    return new Vector3(this.x, this.y, this.z);
  }
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }
  add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }
  addScaledVector(v, s) {
    this.x += v.x * s;
    this.y += v.y * s;
    this.z += v.z * s;
    return this;
  }
  multiplyScalar(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
  crossVectors(a, b) {
    this.x = a.y * b.z - a.z * b.y;
    this.y = a.z * b.x - a.x * b.z;
    this.z = a.x * b.y - a.y * b.x;
    return this;
  }
  length() {
    return Math.hypot(this.x, this.y, this.z);
  }
  normalize() {
    const l = this.length() || 1;
    return this.multiplyScalar(1 / l);
  }
  lerp(v, alpha) {
    this.x += (v.x - this.x) * alpha;
    this.y += (v.y - this.y) * alpha;
    this.z += (v.z - this.z) * alpha;
    return this;
  }
}

class Object3D {
  constructor() {
    this.children = [];
    this.position = new Vector3();
    this.renderOrder = 0;
  }
  add(obj) {
    if (!obj) return;
    obj.parent = this;
    this.children.push(obj);
  }
  remove(obj) {
    const idx = this.children.indexOf(obj);
    if (idx >= 0) this.children.splice(idx, 1);
  }
  traverse(cb) {
    cb(this);
    for (const ch of this.children) {
      if (typeof ch.traverse === "function") ch.traverse(cb);
      else cb(ch);
    }
  }
}

global.THREE = {
  Vector3,
  Group: class extends Object3D {},
  BufferGeometry: class {
    setFromPoints(pts) {
      this.points = pts;
      return this;
    }
    setAttribute() {}
    computeVertexNormals() {}
    dispose() {
      this.disposed = true;
    }
  },
  BufferAttribute: class {},
  SphereGeometry: class {
    dispose() {}
  },
  LineBasicMaterial: class {
    constructor(opts) {
      Object.assign(this, opts);
    }
    dispose() {}
  },
  LineDashedMaterial: class {
    constructor(opts) {
      Object.assign(this, opts);
    }
    dispose() {}
  },
  MeshBasicMaterial: class {
    constructor(opts) {
      Object.assign(this, opts);
    }
    dispose() {}
  },
  Line: class extends Object3D {
    constructor(g, m) {
      super();
      this.geometry = g;
      this.material = m;
    }
    computeLineDistances() {}
  },
  LineSegments: class extends Object3D {
    constructor(g, m) {
      super();
      this.geometry = g;
      this.material = m;
    }
    computeLineDistances() {}
  },
  LineLoop: class extends Object3D {
    constructor(g, m) {
      super();
      this.geometry = g;
      this.material = m;
    }
  },
  Mesh: class extends Object3D {
    constructor(g, m) {
      super();
      this.geometry = g;
      this.material = m;
    }
  },
  DoubleSide: 2
};

global.App = {
  mode: "3D",
  vectorList: []
};

global.Vec3D = {
  S3D: { unitsPerWorld: 1, draggedVectorId: null },
  _axisMaxWorld: 50,
  _camera: {
    fov: 24,
    position: new Vector3(20, 15, 18),
    up: new Vector3(0, 0, 1),
    lookAt: () => {}
  },
  _controls: {
    target: new Vector3(),
    update: () => {}
  },
  _renderer: {
    domElement: { clientWidth: 800, clientHeight: 600 }
  },
  hardRefresh3D: () => {},
  addAxisLabelsDynamic: () => {}
};

// Load rank_animation.js
const code = fs.readFileSync(
  path.join(__dirname, "../frontend_v2/js/app/playback/rank_animation.js"),
  "utf8"
);
eval(code);

console.log("=== KIEM THU TOAN HOC & 3D THREE.JS CHO BAI TOAN HANG (RANK) ===");

// 1. Kiem thu he 3D dong phang (Rank = 2, v3 can 2 phep khu Gauss)
console.log("1. Kiem thu He 3D dong phang (Rank = 2, khu Gauss 2 chang)");
App.mode = "3D";
App.vectorList = [
  { id: 1, vec: [1, 1, 1], visible: true },
  { id: 2, vec: [1, 2, 3], visible: true },
  { id: 3, vec: [2, 3, 4], visible: true } // v3 = v1 + v2 -> phu thuoc!
];
const mathGroup = new THREE.Group();
App.RankAnimator.start(App.vectorList);
App.RankAnimator.pause();

const gd2 = App.RankAnimator.getGaussData();
assert.strictEqual(gd2.rank, 2, "Hang phai bang 2");
assert.deepStrictEqual(gd2.zeroRowIndices, [2], "Vector thu 3 phai bi khu ve dong 0");
assert.strictEqual(gd2.elimHistoryByOrig[2].length, 2, "v3 phai trai qua 2 phep khu Gauss (x->0, roi y->0)");
assert.strictEqual(Math.abs(gd2.step1EndRows[2][0]) < 1e-6, true, "Cuoi Buoc 1, x cua v3 phai bang 0");
assert.strictEqual(Math.abs(gd2.step1EndRows[2][1]) > 1e-3, true, "Cuoi Buoc 1, y cua v3 chua ve 0 (de Buoc 2 khu tiep)");

// Render Step 3 (phase = 2, p = 1.0): Giu lai r vector khac 0 & khung gióng bac thang, KHONG to mat phang lan toa
App.RankAnimator._currentPhase = 2;
App.RankAnimator._phaseProgress = 1.0;
App.RankAnimator.render3D(mathGroup);
assert.ok(App.RankAnimator._threeGroup.children.length >= 6, "Buoc 3 phai hien thi bong goc + khung gióng bac thang cho r vector khac 0");
console.log("   -> Rank = 2 tao thanh cong", App.RankAnimator._threeGroup.children.length, "doi tuong 3D (khong lan toa mat phang)");

// 2. Kiem thu he 3D doc lap (Rank = 3)
console.log("2. Kiem thu He 3D doc lap (Rank = 3, giu lai 3 vector bac thang khac 0)");
App.vectorList = [
  { id: 1, vec: [1, 1, 1], visible: true },
  { id: 2, vec: [1, 2, 3], visible: true },
  { id: 3, vec: [2, 3, 5], visible: true } // Doc lap!
];
App.RankAnimator.start(App.vectorList);
App.RankAnimator.pause();

const gd3 = App.RankAnimator.getGaussData();
assert.strictEqual(gd3.rank, 3, "Hang phai bang 3");
assert.strictEqual(gd3.zeroRowIndices.length, 0, "Khong co dong 0");
assert.strictEqual(Math.abs(gd3.finalRows[1][0]) < 1e-6, true, "r2 co x = 0");
assert.strictEqual(Math.abs(gd3.finalRows[2][0]) < 1e-6 && Math.abs(gd3.finalRows[2][1]) < 1e-6, true, "r3 co x = 0, y = 0 (nam tren Oz)");

App.RankAnimator._currentPhase = 2;
App.RankAnimator._phaseProgress = 1.0;
App.RankAnimator.render3D(mathGroup);
assert.ok(App.RankAnimator._threeGroup.children.length >= 8, "Rank = 3 phai hien thi 3 vector bac thang khac 0 va duong gióng toa do");
console.log("   -> Rank = 3 tao thanh cong", App.RankAnimator._threeGroup.children.length, "doi tuong 3D");

// 3. Kiem thu khoi phuc du lieu goc khi stop()
console.log("3. Kiem thu khoi phuc nguyen ven App.vectorList khi stop()");
App.RankAnimator.stop();
assert.deepStrictEqual(App.vectorList[0].vec, [1, 1, 1]);
assert.deepStrictEqual(App.vectorList[1].vec, [1, 2, 3]);
assert.deepStrictEqual(App.vectorList[2].vec, [2, 3, 5]);
assert.strictEqual(App.RankAnimator._threeGroup, null, "ThreeGroup phai duoc don sach");

// 4. Kiem thu truong hop v1 suy bien (x1 = 0 hoac v1 = (0,0,0)) -> Hoan vi dong SWAP
console.log("4. Kiem thu v1 suy bien tai cot 1: v1 = (0, 2, 1), v2 = (3, 1, 0), v3 = (0, 4, 2)");
App.vectorList = [
  { id: 1, vec: [0, 2, 1], visible: true },
  { id: 2, vec: [3, 1, 0], visible: true },
  { id: 3, vec: [0, 4, 2], visible: true } // v3 = 2*v1 -> phu thuoc!
];
App.RankAnimator.start(App.vectorList);
App.RankAnimator.pause();
const gdSwap = App.RankAnimator.getGaussData();
assert.strictEqual(gdSwap.rank, 2, "Hang phai bang 2 khi v1 = (0,2,1), v2 = (3,1,0), v3 = (0,4,2)");
assert.ok(gdSwap.steps.some((st) => st.type === "SWAP"), "Phai co buoc hoan vi dong SWAP khi v1 co x1 = 0");
assert.deepStrictEqual(gdSwap.zeroRowIndices, [2], "v3 phai bi khu ve 0");
assert.deepStrictEqual(gdSwap.nonZeroRowIndices, [0, 1], "v1 va v2 duoc giu lai");
App.RankAnimator.stop();

console.log("=== TAT CA KIEM THU TOAN HOC & 3D CHO BAI TOAN HANG DA PASS 100%! ===");
