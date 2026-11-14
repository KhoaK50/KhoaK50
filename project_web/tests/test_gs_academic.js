const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

// Load HTML and verify #form-topic4_gram_schmidt is cleaned and standardized
const html = fs.readFileSync("frontend_v2/calculation.html", "utf8");
assert(!html.includes('id="chkGSShowOrig"'), "Dead template checkbox chkGSShowOrig must be removed");
assert(!html.includes('id="chkGSShowProj"'), "Dead template checkbox chkGSShowProj must be removed");
assert(!html.includes('id="chkGSNormalize"'), "Dead template checkbox chkGSNormalize must be removed");
assert(!html.includes("Chọn hệ vector trực giao hóa"), "Redundant label above gsChecklist must be removed");
assert(html.includes('id="gsChecklist"'), "gsChecklist must exist");
assert(html.includes('id="btnGSOrthogonalize"'), "btnGSOrthogonalize must exist");
assert(html.includes('id="btnGSAnimate"'), "btnGSAnimate must exist");
assert(html.includes('id="btnGSSolution"'), "btnGSSolution must exist");

// Set up sandbox to test topic4_euclidean_spaces.js and gs_animation.js
const elements = {};
const sandbox = {
  window: {
    App: {
      mode: "2D",
      vectorList: []
    },
    addEventListener: () => {}
  },
  App: null,
  document: {
    getElementById: (id) => {
      if (!elements[id]) {
        elements[id] = {
          id,
          style: {},
          innerHTML: "",
          textContent: "",
          querySelector: () => null,
          querySelectorAll: () => [],
          insertBefore: () => {},
          appendChild: () => {},
          addEventListener: () => {}
        };
      }
      return elements[id];
    },
    createElement: (tag) => ({
      tagName: tag,
      style: {},
      innerHTML: "",
      querySelector: () => null,
      querySelectorAll: () => []
    })
  },
  performance: { now: () => 0 },
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {},
  setTimeout: () => 1,
  clearTimeout: () => {},
  Math,
  Number,
  Array,
  Set,
  String,
  Object,
  parseFloat,
  parseInt,
  isNaN
};
sandbox.App = sandbox.window.App;

const topic4Code = fs.readFileSync("frontend_v2/js/app/modules/topics/topic4_euclidean_spaces.js", "utf8");
const gsAnimCode = fs.readFileSync("frontend_v2/js/app/playback/gs_animation.js", "utf8");

assert(!topic4Code.includes("\u2014"), "Zero Em-dash check in topic4_euclidean_spaces.js");
assert(!gsAnimCode.includes("\u2014"), "Zero Em-dash check in gs_animation.js");

vm.createContext(sandbox);
vm.runInContext(topic4Code, sandbox);
vm.runInContext(gsAnimCode, sandbox);

// Case 1: Three identical 2D vectors [1, 2], [1, 2], [1, 2] (User's screenshot case!)
sandbox.window.App.mode = "2D";
const case1Items = [
  { id: 1, vec: [1, 2] },
  { id: 2, vec: [1, 2] },
  { id: 3, vec: [1, 2] }
];
const res1 = sandbox.window.App.computeGSFromItems(case1Items);
assert.strictEqual(res1.is3D, false, "Three 2D vectors in 2D mode must NOT be promoted to 3D");
assert.strictEqual(res1.dim, 2, "Dimension must remain 2");
assert.strictEqual(res1.rank, 1, "Rank of three identical [1, 2] vectors must be 1");
assert.strictEqual(res1.orthogonalBasis.length, 1, "Orthogonal basis must contain only 1 non-zero vector");
assert.strictEqual(res1.collapsedIndices.join(","), "2,3", "Vectors 2 and 3 must be marked as collapsed to 0");

const anim1 = sandbox.window.App.computeGramSchmidtDetailed(case1Items);
assert.strictEqual(anim1.is3D, false, "GSAnimator must keep 2D mode for three 2D vectors");
assert.strictEqual(anim1.u1IsZero, false);
assert.strictEqual(anim1.u2IsZero, true, "u2 must collapse to zero");
assert.strictEqual(anim1.u3IsZero, true, "u3 must collapse to zero");
assert.strictEqual(anim1.nonZeroBasis.length, 1, "nonZeroBasis must have length 1");

// Case 2: v1 = [1, 0], v2 = [2, 0] (dependent), v3 = [1, 3] (independent) in 2D
const case2Items = [
  { id: 1, vec: [1, 0] },
  { id: 2, vec: [2, 0] },
  { id: 3, vec: [1, 3] }
];
const res2 = sandbox.window.App.computeGSFromItems(case2Items);
assert.strictEqual(res2.dim, 2);
assert.strictEqual(res2.rank, 2, "Rank must be 2 (u1 and u3)");
assert.strictEqual(res2.collapsedIndices.join(","), "2", "Only v2 collapsed to 0");
assert.strictEqual(res2.orthogonalBasis.length, 2);
assert.strictEqual(res2.orthogonalBasis[0].stepIndex, 1);
assert.strictEqual(res2.orthogonalBasis[1].stepIndex, 3);
assert(Math.abs(res2.orthogonalBasis[1].u[0]) < 1e-6 && Math.abs(res2.orthogonalBasis[1].u[1] - 3) < 1e-6, "u3 must be [0, 3]");

// Case 3: Three independent 3D vectors
sandbox.window.App.mode = "3D";
const case3Items = [
  { id: 1, vec: [1, 1, 0] },
  { id: 2, vec: [1, 0, 1] },
  { id: 3, vec: [0, 1, 1] }
];
const res3 = sandbox.window.App.computeGSFromItems(case3Items);
assert.strictEqual(res3.is3D, true);
assert.strictEqual(res3.dim, 3);
assert.strictEqual(res3.rank, 3);
assert.strictEqual(res3.collapsedIndices.length, 0);
assert.strictEqual(res3.orthogonalBasis.length, 3);

// Case 4: 5 vectors in 3D (v2 dependent on v1, v3 & v4 independent, v5 dependent on span(v1,v3,v4))
const case4Items = [
  { id: 1, vec: [1, 0, 0] },
  { id: 2, vec: [3, 0, 0] },
  { id: 3, vec: [1, 2, 0] },
  { id: 4, vec: [1, 1, 4] },
  { id: 5, vec: [2, 3, 5] }
];
const anim4 = sandbox.window.App.computeGramSchmidtDetailed(case4Items);
assert.strictEqual(anim4.m, 5, "All 5 selected vectors must participate in GSAnimator");
assert.strictEqual(anim4.steps.length, 5, "steps array must have 5 entries");
assert.strictEqual(anim4.steps[0].isZero, false, "v1 is non-zero");
assert.strictEqual(anim4.steps[1].isZero, true, "v2 = 3*v1 must collapse to 0");
assert.strictEqual(anim4.steps[2].isZero, false, "v3 builds 2nd orthogonal axis");
assert.strictEqual(anim4.steps[3].isZero, false, "v4 builds 3rd orthogonal axis");
assert.strictEqual(anim4.steps[4].isZero, true, "v5 in R^3 must collapse to 0 since dim=3 is full");
assert.strictEqual(
  anim4.nonZeroBasis.map((b) => b.stepIndex).join(","),
  "1,3,4",
  "nonZeroBasis must keep steps 1, 3, and 4"
);

// Verify 2-stage timing in GSAnimator._getStepTiming: p must reach 100% BEFORE v starts sliding to 0
sandbox.window.App.GSAnimator._analysis = anim4;
const totalW = 1.0 + 3 * 1.75; // m=5 -> totalSlides=4 -> w1=1.0, w2=w3=w4=1.75
// Check k = 2 (v3) at localT = 0.44 (inside hold window [0.40, 0.50])
const rawHoldV3 = (1.0 + 0.44 * 1.75) / totalW;
const tHoldV3 = sandbox.window.App.GSAnimator._getStepTiming(2, rawHoldV3);
assert.strictEqual(tHoldV3.pProj, 1, "Projection p must be 100% grown during the hold window");
assert.strictEqual(tHoldV3.pSlide, 0, "Vector v must remain stationary (pSlide = 0) until p has finished growing and holding");

// Case 5: Verify viewer3D.js does not steal focus from #vectorInput
const viewer3DCode = fs.readFileSync("frontend_v2/js/viewers/viewer3D.js", "utf8");
const vecCtrlCode = fs.readFileSync("frontend_v2/js/app/logic/vector_controller.js", "utf8");
assert(
  viewer3DCode.includes("isTypingInControl") && viewer3DCode.includes("threeLayer.focus"),
  "Vec3D.show3D must guard threeLayer.focus() when an input is focused"
);
assert(
  vecCtrlCode.includes("if (inp && typeof inp.focus === \"function\") inp.focus()"),
  "App.onAddVector must keep focus on #vectorInput after adding a vector"
);

console.log("ALL GRAM-SCHMIDT ACADEMIC & UI TESTS PASSED!");
