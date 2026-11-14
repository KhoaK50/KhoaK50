/**
 * Comprehensive Automated Verification Suite for Unified Academic Solutions & Result Cards
 * Covers all 8 Core Survey Problems + all 14 Calculator Operations + 55+ edge cases.
 * Uses real KaTeX (throwOnError: true) to guarantee zero LaTeX syntax errors, zero raw
 * LaTeX leaks, zero Vietnamese diacritics inside \text{}, zero -0/NaN/undefined, and zero em-dashes.
 */

const assert = require("assert");
const path = require("path");

const katex = require(path.resolve(__dirname, "../admin_v2/node_modules/katex"));

// Set up minimal browser-like global namespace for dual-UMD modules
global.window = global;
global.window.katex = katex;
global.window.App = {
  Topics: {},
  TasksGen: {},
  registerTopicModule: function (id, mod) {
    global.window.App.Topics[id] = mod;
  }
};

const LatexFmt = require("../frontend_v2/js/utils/latex_format.js");
const ResultCardPkg = require("../frontend_v2/js/app/ui/result_card_renderer.js");
const BasisGen = require("../frontend_v2/js/app/ui/tasks_generator/basis_generator.js");
const CoordGen = require("../frontend_v2/js/app/ui/tasks_generator/coord_generator.js");
const IndepGen = require("../frontend_v2/js/app/ui/tasks_generator/indep_generator.js");
const RankGen = require("../frontend_v2/js/app/ui/tasks_generator/rank_generator.js");
const CalcOps = require("../frontend_v2/js/app/ui/tasks_generator/calc_ops_generator.js");
const Topic4 = require("../frontend_v2/js/app/modules/topics/topic4_euclidean_spaces.js");
const Topic5 = require("../frontend_v2/js/app/modules/topics/topic5_linear_transformations.js");
const Topic6 = require("../frontend_v2/js/app/modules/topics/topic6_eigenvalues_eigenvectors.js");
const Topic7 = require("../frontend_v2/js/app/modules/topics/topic7_quadratic_forms_conics.js");

const ResultCard = ResultCardPkg.ResultCard || global.window.App.ResultCard;
const MACROS = LatexFmt.KATEX_MACROS || {};

let totalCases = 0;
let totalMathExpressions = 0;
const failures = [];

function recordFailure(caseName, reason) {
  failures.push(`[${caseName}] ${reason}`);
}

function compileKatexStrict(latex, displayMode, caseName, fieldName) {
  if (!latex || typeof latex !== "string" || !latex.trim()) return;
  totalMathExpressions++;
  // Check no Vietnamese diacritics inside \text{...} or \mathrm{...}
  const textBlocks = latex.match(/\\(?:text|mathrm|operatorname)\{[^}]*\}/g) || [];
  for (const tb of textBlocks) {
    if (/[^\x00-\x7F]/.test(tb)) {
      recordFailure(caseName, `Non-ASCII / Vietnamese inside ${fieldName}: ${tb}`);
    }
  }
  // Check no -0 token (e.g. -0 or -0.00, excluding genuine decimals like -0.1072)
  if (/(^|[=,+(\s\[{])-0(?:\.0+)?(?![0-9.])/.test(latex)) {
    recordFailure(caseName, `Negative zero (-0) detected in ${fieldName}: ${latex}`);
  }
  if (/\b(NaN|undefined|Infinity)\b/.test(latex)) {
    recordFailure(caseName, `NaN/undefined/Infinity in ${fieldName}: ${latex}`);
  }
  if (latex.includes("\u2014")) {
    recordFailure(caseName, `Em-dash (\\u2014) in ${fieldName}: ${latex}`);
  }

  try {
    katex.renderToString(latex, {
      displayMode: !!displayMode,
      throwOnError: true,
      strict: "ignore",
      macros: Object.assign({}, MACROS)
    });
  } catch (err) {
    recordFailure(caseName, `KaTeX error in ${fieldName}: ${err.message}\n   LaTeX: ${latex}`);
  }
}

function validateHtmlFragment(html, caseName, fieldName) {
  if (!html) return;
  if (typeof html !== "string") {
    recordFailure(caseName, `${fieldName} is not a string`);
    return;
  }
  if (html.includes("\u2014")) {
    recordFailure(caseName, `Em-dash (\\u2014) in ${fieldName}`);
  }
  if (/\b(NaN|undefined|Infinity)\b/.test(html)) {
    recordFailure(caseName, `NaN/undefined/Infinity in ${fieldName}`);
  }
  if (html.includes("sol-container")) {
    recordFailure(caseName, `Legacy orphan class .sol-container found in ${fieldName}`);
  }
  if (/Tab\s*1|Tab\s*2/.test(html)) {
    recordFailure(caseName, `Generic 'Tab 1/2' label found in ${fieldName}`);
  }

  // Extract math segments \[...\], $$...$$, \(...\) and compile each strictly with KaTeX
  let stripped = html;

  // First remove already-rendered <span class="katex">...</span> if ResultCard pre-rendered KaTeX
  // Wait: ResultCard renders KaTeX into HTML! For raw content1/content2, math is in \[...\] and \(...\).
  // Let's extract \[...\], $$...$$, and \(...\) before stripping tags!
  const displayBracketRe = /\\\[([\s\S]*?)\\\]/g;
  let m;
  while ((m = displayBracketRe.exec(html)) !== null) {
    compileKatexStrict(m[1], true, caseName, `${fieldName} \\[...\\]`);
  }
  stripped = stripped.replace(displayBracketRe, " ");

  const displayDollarRe = /\$\$([\s\S]*?)\$\$/g;
  while ((m = displayDollarRe.exec(stripped)) !== null) {
    compileKatexStrict(m[1], true, caseName, `${fieldName} $$...$$`);
  }
  stripped = stripped.replace(displayDollarRe, " ");

  const inlineParenRe = /\\\(([\s\S]*?)\\\)/g;
  while ((m = inlineParenRe.exec(stripped)) !== null) {
    compileKatexStrict(m[1], false, caseName, `${fieldName} \\(...\\)`);
  }
  stripped = stripped.replace(inlineParenRe, " ");

  // Remove any <annotation encoding="application/x-tex">...</annotation> from already-rendered KaTeX spans
  stripped = stripped.replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, " ");
  // Remove HTML tags
  const plainText = stripped.replace(/<[^>]+>/g, " ");

  // Check for leaked raw LaTeX commands in plain text!
  const rawLatexLeakRe = /\\(?:frac|dfrac|sqrt|begin|end|vec|mathbf|mathcal|mathbb|operatorname|xrightarrow|lambda|Delta|sum|prod|left|right|cdot|times|implies|iff|neq|leq|geq|infty|varnothing)\b/;
  const leakMatch = plainText.match(rawLatexLeakRe);
  if (leakMatch) {
    recordFailure(caseName, `Raw LaTeX leak '${leakMatch[0]}' outside math delimiters in ${fieldName}: ${plainText.slice(Math.max(0, leakMatch.index - 30), leakMatch.index + 60)}`);
  }

  // Check for stray unclosed delimiters
  if (/\\\[|\\\]|\\\(|\\\)/.test(plainText)) {
    recordFailure(caseName, `Unmatched math delimiter in ${fieldName}: ${plainText}`);
  }
}

function checkModalAndCard(caseName, bundleOrModal, opts = {}) {
  totalCases++;
  const modal = bundleOrModal.modalConfig || bundleOrModal;
  if (!modal) {
    recordFailure(caseName, "Missing modalConfig");
    return;
  }

  const titleText = modal.titleText || modal.title || "";
  const titleMath = modal.titleMath || modal.math || "";
  if (!titleText.trim()) {
    recordFailure(caseName, "Empty modal titleText/title");
  }
  if (titleText.includes("\u2014")) {
    recordFailure(caseName, `Em-dash in titleText: ${titleText}`);
  }
  if (titleMath) {
    compileKatexStrict(titleMath, false, caseName, "modal.titleMath");
  }
  if (bundleOrModal.logLatex) {
    compileKatexStrict(bundleOrModal.logLatex, false, caseName, "bundle.logLatex");
  }

  validateHtmlFragment(modal.content1, caseName, "modal.content1");
  validateHtmlFragment(modal.content2, caseName, "modal.content2");
  if (modal.content2Sub) {
    validateHtmlFragment(modal.content2Sub, caseName, "modal.content2Sub");
  }

  if (opts.expectSingleMethod) {
    if ((modal.content2 || "").trim() !== "") {
      recordFailure(caseName, "Expected single-method (empty content2), but content2 was non-empty");
    }
  } else if (opts.expectDualMethod) {
    if (!(modal.content2 || "").trim()) {
      recordFailure(caseName, "Expected dual-method (non-empty content2), but content2 was empty");
    }
  }

  if (bundleOrModal.cardOptions && ResultCard) {
    const cardHtml = ResultCard.render(bundleOrModal.cardOptions);
    if (cardHtml.includes("katex-error")) {
      recordFailure(caseName, `KaTeX render error inside ResultCard HTML: ${cardHtml}`);
    }
    validateHtmlFragment(cardHtml, caseName, "ResultCard.html");
  }
  if (bundleOrModal.isError && bundleOrModal.errorMessageHtml) {
    validateHtmlFragment(bundleOrModal.errorMessageHtml, caseName, "bundle.errorMessageHtml");
  }
}

// ============================================================================
// PART 1: ALL 8 CORE SURVEY PROBLEMS
// ============================================================================

// 1. Basis & Dimension
{
  const cases = [
    { name: "Basis 3D full", vecs: [[1, 0, 0], [0, 2, -1], [1, 1, 3]], tex: ["(1,0,0)", "(0,2,-1)", "(1,1,3)"] },
    { name: "Basis 3D deficient + redundant", vecs: [[1, 2, 3], [2, 4, 6], [1, 0, 1], [3, 4, 7]], tex: null },
    { name: "Basis m > n (4 vecs in R2)", vecs: [[1, -1], [2, -2], [0, 3], [5, 1]], tex: null },
    { name: "Basis all zero vectors", vecs: [[0, 0, 0], [0, 0, 0]], tex: null },
    { name: "Basis surds & negative fractions", vecs: [[Math.sqrt(2), -0.5], [0, 1.5]], tex: null }
  ];
  for (const c of cases) {
    const c1 = BasisGen.buildBasisByMatrix(c.vecs, c.tex);
    const c2a = BasisGen.buildBasisByEquationsGeneral(c.vecs, c.tex);
    const c2b = BasisGen.buildBasisByEquationsStepwise(c.vecs, c.tex);
    checkModalAndCard(c.name, {
      titleText: c1.titleText,
      titleMath: c1.titleMath,
      content1: c1.htmlContent,
      content2: c2a.htmlContent,
      content2Sub: c2b.htmlContent
    }, { expectDualMethod: true });
  }
}

// 2. Coordinates with respect to Basis
{
  const cases = [
    { name: "Coord 2D unique", B: [[1, 2], [3, 4]], v: [5, 6] },
    { name: "Coord 3D subspace solvable (m=2 < n=3)", B: [[1, 0, 1], [0, 1, 2]], v: [2, -3, -4] },
    { name: "Coord 3D subspace inconsistent", B: [[1, 0, 1], [0, 1, 2]], v: [1, 1, 5] },
    { name: "Coord dependent basis error", B: [[1, 2], [2, 4]], v: [3, 6] },
    { name: "Coord fractional & surd", B: [[1, -0.5], [0.5, 1]], v: [Math.sqrt(3), -1] }
  ];
  for (const c of cases) {
    const sol = CoordGen.buildSolution(c.B, c.v, null, null);
    checkModalAndCard(c.name, sol, { expectDualMethod: true });
  }
}

// 3. Linear Independence
{
  const mkItems = (vecs) => vecs.map((v, i) => ({ id: i + 1, name: `v_${i + 1}`, vec: v }));
  const cases = [
    { name: "Indep 3D independent", items: mkItems([[1, 0, 2], [0, 1, -1], [2, 1, 0]]) },
    { name: "Indep 3D dependent", items: mkItems([[1, 2, 3], [4, 5, 6], [5, 7, 9]]) },
    { name: "Indep m > n (4 vecs in R3)", items: mkItems([[1, 0, 0], [0, 1, 0], [0, 0, 1], [2, -3, 5]]) },
    { name: "Indep contains zero vector", items: mkItems([[0, 0], [1, 3]]) },
    { name: "Indep 4D fractional", items: mkItems([[0.5, -1, 0, 2], [1, -2, 0, 4]]) }
  ];
  for (const c of cases) {
    const sol = IndepGen.buildSolution(null, c.items);
    checkModalAndCard(c.name, sol, { expectDualMethod: true });
  }
}

// 4. Rank of Vector System
{
  const mkItems = (vecs) => vecs.map((v, i) => ({ id: i + 1, name: `u_${i + 1}`, vec: v }));
  const cases = [
    { name: "Rank Vecs full rank 3", items: mkItems([[1, 1, 0], [0, 1, 1], [1, 0, 1]]) },
    { name: "Rank Vecs rank 2 of 4", items: mkItems([[1, 2, 1], [2, 4, 2], [0, 1, -1], [1, 3, 0]]) },
    { name: "Rank Vecs all zero", items: mkItems([[0, 0, 0], [0, 0, 0]]) }
  ];
  for (const c of cases) {
    const sol = RankGen.buildSolution(null, c.items);
    checkModalAndCard(c.name, sol, { expectDualMethod: true });
  }
}

// 5. Topic 4: Gram-Schmidt & QR
{
  const mkItems = (vecs) => vecs.map((v, i) => ({ id: i + 1, name: `v_${i + 1}`, vec: v }));
  const cases = [
    { name: "GS 2D standard", items: mkItems([[3, 1], [2, 2]]) },
    { name: "GS 3D 3 vectors", items: mkItems([[1, 1, 0], [1, 0, 1], [0, 1, 1]]) },
    { name: "GS with dependent vector skipped", items: mkItems([[1, 2, 2], [2, 4, 4], [2, -1, 0]]) },
    { name: "GS single zero vector", items: mkItems([[0, 0, 0]]) }
  ];
  for (const c of cases) {
    const pack = Topic4.buildGSSolution(c.items);
    checkModalAndCard(c.name, pack, { expectDualMethod: true });
  }
}

// 6. Topic 5: Linear Transformations (Ker, Im, Rank-Nullity)
{
  const cases = [
    { name: "LT 2x2 isomorphism", A: [[2, 1], [1, 3]] },
    { name: "LT 2x2 rank 1 singular", A: [[1, -2], [-2, 4]] },
    { name: "LT 2x2 zero matrix", A: [[0, 0], [0, 0]] },
    { name: "LT 2x3 surjective", A: [[1, 0, 2], [0, 1, -1]] },
    { name: "LT 3x2 injective", A: [[1, 0], [2, 1], [-1, 3]] },
    { name: "LT 3x3 rank 2", A: [[1, 2, 3], [0, 1, 2], [1, 3, 5]] }
  ];
  for (const c of cases) {
    const pack = Topic5.buildLTSolution({ name: "A", values: c.A }, c.A);
    checkModalAndCard(c.name, pack, { expectDualMethod: true });
  }
}

// 7. Topic 6: Eigenvalues, Eigenvectors & Diagonalization
{
  const cases = [
    { name: "Eigen 2x2 distinct integers", A: [[4, 1], [2, 3]] },
    { name: "Eigen 2x2 irrational surd", A: [[1, 2], [2, 3]] },
    { name: "Eigen 2x2 complex rotation-scale", A: [[1, -2], [2, 1]] },
    { name: "Eigen 2x2 defective Jordan", A: [[3, 1], [0, 3]] },
    { name: "Eigen 2x2 scalar diagonalizable", A: [[5, 0], [0, 5]] },
    { name: "Eigen 3x3 distinct real", A: [[2, 0, 0], [1, 3, 0], [-1, 2, 4]] },
    { name: "Eigen 3x3 repeated diagonalizable", A: [[2, 0, 0], [0, 2, 0], [0, 0, -1]] },
    { name: "Eigen 3x3 repeated defective", A: [[2, 1, 0], [0, 2, 0], [0, 0, 5]] },
    { name: "Eigen 3x3 real + complex pair", A: [[1, 0, 0], [0, 0, -1], [0, 1, 0]] }
  ];
  for (const c of cases) {
    const pack = Topic6.buildEigenSolution({ name: "A", values: c.A }, c.A);
    checkModalAndCard(c.name, pack, { expectDualMethod: true });
  }
}

// 8. Topic 7: Quadratic Forms, Conics & Quadrics (Spectral + Lagrange + Sylvester)
{
  const cases = [
    { name: "Conic 2x2 PosDef rotated ellipse", A: [[5, 2], [2, 5]] },
    { name: "Conic 2x2 NegDef", A: [[-3, 1], [1, -3]] },
    { name: "Conic 2x2 Indefinite hyperbola", A: [[1, 2], [2, 1]] },
    { name: "Conic 2x2 Zero-diagonal pure cross term Q=2xy", A: [[0, 1], [1, 0]] },
    { name: "Conic 2x2 Semidefinite", A: [[1, -2], [-2, 4]] },
    { name: "Conic 2x2 Asymmetric auto-symmetrized", A: [[2, 3], [1, 5]] },
    { name: "Conic 3x3 Ellipsoid", A: [[3, 1, 0], [1, 3, 0], [0, 0, 2]] },
    { name: "Conic 3x3 Zerodiagonal 3D", A: [[0, 1, 1], [1, 0, 1], [1, 1, 0]] },
    { name: "Conic 3x3 Zero matrix", A: [[0, 0, 0], [0, 0, 0], [0, 0, 0]] }
  ];
  for (const c of cases) {
    const pack = Topic7.buildConicSolution({ name: "A", values: c.A }, c.A);
    checkModalAndCard(c.name, pack, { expectDualMethod: true });
  }
}

// ============================================================================
// PART 2: ALL 14 CALCULATOR OPERATIONS (8 Vector + 5 Matrix + 1 Mixed x 4 modes)
// ============================================================================

// A. Vector Ops
{
  const u2 = { id: 1, name: "u", vec: [1, -2] };
  const v2 = { id: 2, name: "v", vec: [3, 4] };
  const z2 = { id: 3, name: "z", vec: [0, 0] };
  const u3 = { id: 4, name: "a", vec: [1, 2, -1] };
  const v3 = { id: 5, name: "b", vec: [-2, 1, 3] };

  checkModalAndCard("Vec add 2D", CalcOps.buildVectorOp("add", { v1Item: u2, v2Item: v2 }), { expectSingleMethod: true });
  checkModalAndCard("Vec sub 3D", CalcOps.buildVectorOp("sub", { v1Item: u3, v2Item: v3 }), { expectSingleMethod: true });
  checkModalAndCard("Vec subtract alias", CalcOps.buildVectorOp("subtract", { v1Item: u2, v2Item: v2 }), { expectSingleMethod: true });
  checkModalAndCard("Vec dim mismatch", CalcOps.buildVectorOp("add", { v1Item: u2, v2Item: u3 }), { expectSingleMethod: true });

  checkModalAndCard("Vec scale rational -3/2", CalcOps.buildVectorOp("scale", { v1Item: u2, scalarRaw: "-3/2" }), { expectSingleMethod: true });
  checkModalAndCard("Vec scale surd sqrt(2)", CalcOps.buildVectorOp("scale", { v1Item: u3, scalarRaw: "sqrt(2)" }), { expectSingleMethod: true });
  checkModalAndCard("Vec scale invalid expr", CalcOps.buildVectorOp("scale", { v1Item: u2, scalarRaw: "" }), { expectSingleMethod: true });

  checkModalAndCard("Vec dot orthogonal", CalcOps.buildVectorOp("dot", { v1: [2, 1], v2: [-1, 2] }), { expectSingleMethod: true });
  checkModalAndCard("Vec dot obtuse", CalcOps.buildVectorOp("dot", { v1Item: u3, v2Item: v3 }), { expectSingleMethod: true });

  checkModalAndCard("Vec norm surd sqrt(5)", CalcOps.buildVectorOp("vector_norm", { v1Item: u2 }), { expectSingleMethod: true });
  checkModalAndCard("Vec norm zero", CalcOps.buildVectorOp("vector_norm", { v1Item: z2 }), { expectSingleMethod: true });

  checkModalAndCard("Vec normalize rationalized surd", CalcOps.buildVectorOp("normalize", { v1Item: u2 }), { expectSingleMethod: true });
  checkModalAndCard("Vec normalize zero guard", CalcOps.buildVectorOp("normalize", { v1Item: z2 }), { expectSingleMethod: true });

  checkModalAndCard("Vec angle 90 deg", CalcOps.buildVectorOp("angle_between", { v1: [1, 0], v2: [0, 2] }), { expectSingleMethod: true });
  checkModalAndCard("Vec angle 60 deg", CalcOps.buildVectorOp("angle_between", { v1: [1, 0, 0], v2: [1, Math.sqrt(3), 0] }), { expectSingleMethod: true });
  checkModalAndCard("Vec angle 135 deg", CalcOps.buildVectorOp("angle_between", { v1: [-1, 1], v2: [1, 0] }), { expectSingleMethod: true });
  checkModalAndCard("Vec angle generic", CalcOps.buildVectorOp("angle_between", { v1Item: u3, v2Item: v3 }), { expectSingleMethod: true });
  checkModalAndCard("Vec angle zero guard", CalcOps.buildVectorOp("angle_between", { v1Item: u2, v2Item: z2 }), { expectSingleMethod: true });

  checkModalAndCard("Vec projection 3D", CalcOps.buildVectorOp("projection", { v1Item: u3, v2Item: v3 }), { expectSingleMethod: true });
  checkModalAndCard("Vec projection zero target guard", CalcOps.buildVectorOp("projection", { v1Item: u2, v2Item: z2 }), { expectSingleMethod: true });

  checkModalAndCard("Vec cross 3D", CalcOps.buildVectorOp("cross", { v1Item: u3, v2Item: v3 }), { expectDualMethod: true });
  checkModalAndCard("Vec cross 2D embedded", CalcOps.buildVectorOp("cross", { v1Item: u2, v2Item: v2 }), { expectDualMethod: true });
  checkModalAndCard("Vec cross collinear", CalcOps.buildVectorOp("cross", { v1: [1, -2, 3], v2: [-2, 4, -6] }), { expectDualMethod: true });
}

// B. Matrix Ops (det, inv, rank, transpose, mul_matrix)
{
  checkModalAndCard("Mat det 1x1", CalcOps.buildMatrixOp("det", { A: [[-7]] }), { expectDualMethod: true });
  checkModalAndCard("Mat det 2x2", CalcOps.buildMatrixOp("det", { A: [[3, -2], [1, 4]] }), { expectDualMethod: true });
  checkModalAndCard("Mat det 3x3 with zeros", CalcOps.buildMatrixOp("det", { A: [[2, 0, -1], [3, 5, 2], [0, -4, 1]] }), { expectDualMethod: true });
  checkModalAndCard("Mat det 4x4", CalcOps.buildMatrixOp("det", { A: [[1, 2, 0, 1], [0, -1, 3, 2], [2, 4, 1, 0], [1, 0, 2, -1]] }), { expectDualMethod: true });
  checkModalAndCard("Mat det 5x5", CalcOps.buildMatrixOp("det", {
    A: [
      [2, 0, 1, 0, 0],
      [1, 3, 0, -1, 0],
      [0, 1, 2, 0, 1],
      [0, 0, -1, 4, 2],
      [1, 0, 0, 1, 3]
    ]
  }), { expectDualMethod: true });
  checkModalAndCard("Mat det non-square guard", CalcOps.buildMatrixOp("det", { A: [[1, 2, 3], [4, 5, 6]] }), { expectSingleMethod: true });
  checkModalAndCard("Mat det parametric banner", CalcOps.buildMatrixOp("det", {
    A: [[1, 2], [-2, 1]],
    paramInfoA: { isParametric: true, rawValues: [["1", "t"], ["-t", "1"]], paramDescLatex: "t = 2" }
  }), { expectDualMethod: true });

  checkModalAndCard("Mat inv 1x1", CalcOps.buildMatrixOp("inv", { A: [[4]] }), { expectDualMethod: true });
  checkModalAndCard("Mat inv 2x2", CalcOps.buildMatrixOp("inv", { A: [[2, -1], [5, -3]] }), { expectDualMethod: true });
  checkModalAndCard("Mat inv 3x3", CalcOps.buildMatrixOp("inv", { A: [[1, 2, -1], [0, 1, 3], [2, 5, 2]] }), { expectDualMethod: true });
  checkModalAndCard("Mat inv 4x4", CalcOps.buildMatrixOp("inv", { A: [[1, 0, 2, 0], [0, 2, 0, 1], [1, 0, 3, 0], [0, 1, 0, 1]] }), { expectDualMethod: true });
  checkModalAndCard("Mat inv singular", CalcOps.buildMatrixOp("inv", { A: [[1, 2, 3], [2, 4, 6], [0, 1, 1]] }), { expectDualMethod: true });
  checkModalAndCard("Mat inv non-square guard", CalcOps.buildMatrixOp("inv", { A: [[1, 2, 3], [4, 5, 6]] }), { expectSingleMethod: true });

  checkModalAndCard("Mat rank 3x4", CalcOps.buildMatrixOp("rank", { A: [[1, 2, 0, -1], [2, 4, 1, 3], [3, 6, 1, 2]] }), { expectDualMethod: true });
  checkModalAndCard("Mat rank all zero", CalcOps.buildMatrixOp("rank", { A: [[0, 0], [0, 0]] }), { expectDualMethod: true });

  checkModalAndCard("Mat transpose 2x3", CalcOps.buildMatrixOp("transpose", { A: [[1, -2, 5], [0, 3, -4]] }), { expectSingleMethod: true });
  checkModalAndCard("Mat transpose symmetric", CalcOps.buildMatrixOp("transpose", { A: [[2, -3], [-3, 7]] }), { expectSingleMethod: true });
  checkModalAndCard("Mat transpose skew-symmetric", CalcOps.buildMatrixOp("transpose", { A: [[0, -4], [4, 0]] }), { expectSingleMethod: true });

  checkModalAndCard("Mat mul 2x3 * 3x2", CalcOps.buildMatrixOp("mul_matrix", {
    A: [[1, -2, 3], [0, 4, -1]],
    B: [[2, 1], [-1, 3], [0, 5]]
  }), { expectDualMethod: true });
  checkModalAndCard("Mat mul dim mismatch", CalcOps.buildMatrixOp("mul_matrix", {
    A: [[1, 2], [3, 4]],
    B: [[1, 2], [3, 4], [5, 6]]
  }), { expectSingleMethod: true });
  checkModalAndCard("Mat mul missing B", CalcOps.buildMatrixOp("mul_matrix", {
    A: [[1, 2], [3, 4]],
    B: null
  }), { expectSingleMethod: true });

  // Subscripted matrix symbol normalization ("M1" -> "M_{1}")
  if (LatexFmt.normalizeMatSymbol("M1", "A") !== "M_{1}") {
    failures.push("[normalizeMatSymbol] Expected M1 -> M_{1}, got " + LatexFmt.normalizeMatSymbol("M1", "A"));
  }
  checkModalAndCard("Mat inv M1 symbol", CalcOps.buildMatrixOp("inv", {
    nameA: "M1",
    A: [[2, -1], [5, -3]]
  }), { expectDualMethod: true });
  checkModalAndCard("Mat transpose M1 symbol", CalcOps.buildMatrixOp("transpose", {
    nameA: "M1",
    A: [[1, -2, 5], [0, 3, -4]]
  }), { expectSingleMethod: true });
  checkModalAndCard("Mat mul M1*M2 dim mismatch", CalcOps.buildMatrixOp("mul_matrix", {
    nameA: "M1",
    nameB: "M2",
    A: [[1, 2], [3, 4]],
    B: [[1, 2], [3, 4], [5, 6]]
  }), { expectSingleMethod: true });
}

// C. Mixed Matrix-Vector Ops (single, all, mesh, nori)
{
  checkModalAndCard("Mixed single 2x2 M1", CalcOps.buildMixedOp({
    mode: "single",
    A: [[2, -1], [1, 3]],
    matrixName: "M1",
    targetVectors: [{ id: 1, name: "v_1", rawVec: [4, -2], vec: [4, -2] }]
  }), { expectDualMethod: true });

  checkModalAndCard("Mixed single dim mismatch M1", CalcOps.buildMixedOp({
    mode: "single",
    A: [[2, -1], [1, 3]],
    matrixName: "M1",
    targetVectors: [{ id: 1, name: "v_1", rawVec: [1, 2, 3], vec: [1, 2] }]
  }), { expectSingleMethod: true });

  checkModalAndCard("Mixed all 8 vectors", CalcOps.buildMixedOp({
    mode: "all",
    A: [[1, 0, -1], [2, 1, 0]],
    matrixName: "P",
    targetVectors: Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      name: `u_${i + 1}`,
      vec: [i - 2, 1, -i]
    }))
  }), { expectDualMethod: true });

  checkModalAndCard("Mixed mesh 3x3", CalcOps.buildMixedOp({
    mode: "mesh",
    A: [[1, 0, 0], [0, -1, 0], [0, 0, 2]],
    matrixName: "R",
    numPoints: 1240
  }), { expectDualMethod: true });

  checkModalAndCard("Mixed nori 2x2", CalcOps.buildMixedOp({
    mode: "nori",
    A: [[1, 0.5], [0, 1]],
    matrixName: "S"
  }), { expectDualMethod: true });

  checkModalAndCard("Mixed nori invalid 3x3 guard", CalcOps.buildMixedOp({
    mode: "nori",
    A: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    matrixName: "I"
  }), { expectSingleMethod: true });
}

// ============================================================================
// REPORT SUMMARY
// ============================================================================

if (failures.length > 0) {
  console.error(`FAILED with ${failures.length} error(s) across ${totalCases} test cases (${totalMathExpressions} KaTeX expressions):`);
  for (const f of failures) {
    console.error("  x " + f);
  }
  process.exit(1);
} else {
  console.log(`PASS: ${totalCases} test cases & ${totalMathExpressions} KaTeX expressions verified strictly with 0 errors!`);
}
