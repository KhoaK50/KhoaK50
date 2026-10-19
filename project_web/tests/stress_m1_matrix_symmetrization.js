/**
 * Stress Test Suite 1: Matrix Symmetrization & Zero-Mock Empty State
 * Challenger 2 for Milestone 1
 */

const fs = require('fs');
const path = require('path');

// Extract matrix_controller.js content
const matrixCtrlPath = path.resolve(__dirname, '..', 'frontend_v2', 'js', 'app', 'logic', 'matrix_controller.js');
const matrixCtrlCode = fs.readFileSync(matrixCtrlPath, 'utf8');

// Environment Mock
function createMockEnvironment() {
  const toasts = [];
  const tabClicks = [];
  const events = [];

  const elements = {};

  function ensureElement(id, tag = 'div') {
    if (!elements[id]) {
      elements[id] = {
        id,
        tagName: tag.toUpperCase(),
        value: '',
        style: {},
        innerHTML: '',
        classList: {
          contains: () => false,
          add: () => {},
          remove: () => {}
        },
        appendChild: function (child) {
          this.children = this.children || [];
          this.children.push(child);
        },
        dispatchEvent: function (ev) {
          events.push({ target: id, event: ev });
        },
        click: function () {
          tabClicks.push(id);
        }
      };
    }
    return elements[id];
  }

  // Pre-create common elements
  ensureElement('eigenMatrixSelect', 'select');
  ensureElement('ltMatrixSelect', 'select');
  ensureElement('conicMatrixSelect', 'select');
  ensureElement('ltMatrixPreview', 'div');
  ensureElement('conicMatrixPreview', 'div');
  ensureElement('createObjectSelect', 'select');
  ensureElement('tab-btn-create', 'button');

  const doc = {
    getElementById: (id) => elements[id] || null,
    querySelector: (sel) => {
      if (sel === '.sidebar-tabs .tab-btn') {
        return elements['tab-btn-create'];
      }
      return null;
    },
    querySelectorAll: () => [],
    createElement: (tag) => ({
      tagName: tag.toUpperCase(),
      value: '',
      textContent: '',
      style: {}
    })
  };

  const win = {
    App: {
      matrixList: [],
      showToast: (msg, type) => {
        toasts.push({ msg, type });
      }
    },
    document: doc,
    Event: function (name, opts) {
      this.name = name;
      this.opts = opts;
    }
  };

  // Run matrix_controller inside the sandbox
  global.App = win.App;
  global.window = win;
  global.document = doc;
  const fn = new Function('window', 'document', 'Event', 'App', matrixCtrlCode);
  fn(win, doc, win.Event, win.App);

  return { win, doc, toasts, tabClicks, elements };
}

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`[FAIL] ${testName} - ${details}`);
  }
}

console.log('================================================================');
console.log('CHALLENGER 2: STRESS TEST SUITE 1 - MATRIX SYMMETRIZATION & ZERO-MOCK');
console.log('================================================================');

// -----------------------------------------------------------------------------
// TEST 1: App.getOrEnsureSelectedSquareMatrix with empty matrixList (Zero-Mock)
// -----------------------------------------------------------------------------
{
  const env = createMockEnvironment();
  const App = env.win.App;
  App.matrixList = [];

  const res = App.getOrEnsureSelectedSquareMatrix('conicMatrixSelect', { requireSymmetric: true });

  assert(res === null, 'T1.1_Empty_Matrix_Returns_Null', `Got: ${JSON.stringify(res)}`);
  assert(App.matrixList.length === 0, 'T1.2_No_Mock_Matrix_Created', `matrixList length: ${App.matrixList.length}`);
  assert(env.toasts.length === 1 && env.toasts[0].type === 'warning', 'T1.3_Warning_Toast_Triggered', `Toasts: ${JSON.stringify(env.toasts)}`);
  assert(env.toasts[0].msg.includes('Danh sách trống'), 'T1.4_Toast_Message_Content', `Msg: ${env.toasts[0]?.msg}`);
  assert(env.tabClicks.length === 1, 'T1.5_Tab_Switch_To_Create', `Tab clicks: ${env.tabClicks.length}`);
  assert(env.elements['createObjectSelect'].value === 'matrix', 'T1.6_Create_Select_Switched_To_Matrix', `Value: ${env.elements['createObjectSelect'].value}`);
}

// -----------------------------------------------------------------------------
// TEST 2: App.getOrEnsureSelectedSquareMatrix with null/undefined matrixList
// -----------------------------------------------------------------------------
{
  const env = createMockEnvironment();
  const App = env.win.App;
  App.matrixList = null;

  let threw = false;
  let res = null;
  try {
    res = App.getOrEnsureSelectedSquareMatrix('ltMatrixSelect');
  } catch (err) {
    threw = true;
  }

  assert(!threw, 'T2.1_Handles_Null_MatrixList_Safely');
  assert(res === null, 'T2.2_Returns_Null_For_Null_MatrixList');
}

// -----------------------------------------------------------------------------
// TEST 3: Non-square and invalid dimension matrices rejection
// -----------------------------------------------------------------------------
{
  const nonSquareTests = [
    { name: 'Rectangular 2x3', rows: 2, cols: 3, values: [[1, 2, 3], [4, 5, 6]] },
    { name: 'Rectangular 3x2', rows: 3, cols: 2, values: [[1, 2], [3, 4], [5, 6]] },
    { name: '1x1 Scalar Matrix', rows: 1, cols: 1, values: [[5]] },
    { name: '4x4 Large Square', rows: 4, cols: 4, values: [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]] }
  ];

  nonSquareTests.forEach((m, idx) => {
    const env = createMockEnvironment();
    const App = env.win.App;
    App.matrixList = [{ id: idx + 1, name: m.name, rows: m.rows, cols: m.cols, values: m.values }];

    const res = App.getOrEnsureSelectedSquareMatrix('conicMatrixSelect', { requireSymmetric: true });
    assert(res === null, `T3.${idx + 1}_Rejects_${m.name.replace(/\s+/g, '_')}`);
    assert(env.toasts.some(t => t.msg.includes('không phải ma trận vuông cấp 2 hoặc cấp 3')), `T3.${idx + 1}_Warning_For_${m.name.replace(/\s+/g, '_')}`);
  });
}

// -----------------------------------------------------------------------------
// TEST 4: Auto-symmetrization 2x2 asymmetric matrix
// -----------------------------------------------------------------------------
{
  const env = createMockEnvironment();
  const App = env.win.App;
  App.matrixList = [{
    id: 1,
    name: 'A_asym_2x2',
    rows: 2,
    cols: 2,
    values: [[2, 6], [0, -4]]
  }];

  const res = App.getOrEnsureSelectedSquareMatrix('conicMatrixSelect', { requireSymmetric: true });
  assert(res !== null, 'T4.1_2x2_Asym_Resolved');
  assert(res.isSymmetric === false, 'T4.2_2x2_Correctly_Identified_As_Asymmetric');
  assert(res.symmetricValues[0][0] === 2, 'T4.3_2x2_Diag_Preserved_00');
  assert(res.symmetricValues[1][1] === -4, 'T4.4_2x2_Diag_Preserved_11');
  assert(res.symmetricValues[0][1] === 3 && res.symmetricValues[1][0] === 3, 'T4.5_2x2_OffDiag_Averaged_To_3', `Got: ${res.symmetricValues[0][1]}`);

  // Quadratic Form equivalence check x^T A x == x^T A_sym x
  const x = [3, -5];
  const qOrig = x[0]*(2*x[0] + 6*x[1]) + x[1]*(0*x[0] - 4*x[1]);
  const qSym = x[0]*(2*x[0] + 3*x[1]) + x[1]*(3*x[0] - 4*x[1]);
  assert(Math.abs(qOrig - qSym) < 1e-9, 'T4.6_2x2_Quadratic_Form_Invariant', `Orig: ${qOrig}, Sym: ${qSym}`);
}

// -----------------------------------------------------------------------------
// TEST 5: Auto-symmetrization 3x3 asymmetric matrix
// -----------------------------------------------------------------------------
{
  const env = createMockEnvironment();
  const App = env.win.App;
  App.matrixList = [{
    id: 2,
    name: 'A_asym_3x3',
    rows: 3,
    cols: 3,
    values: [
      [1, 5, -3],
      [1, 4, 8],
      [7, 2, -6]
    ]
  }];

  const res = App.getOrEnsureSelectedSquareMatrix('conicMatrixSelect', { requireSymmetric: true });
  assert(res !== null, 'T5.1_3x3_Asym_Resolved');
  assert(res.isSymmetric === false, 'T5.2_3x3_Correctly_Identified_As_Asymmetric');
  // (0,1): (5+1)/2 = 3
  assert(res.symmetricValues[0][1] === 3 && res.symmetricValues[1][0] === 3, 'T5.3_3x3_OffDiag_01_Equal_3');
  // (0,2): (-3+7)/2 = 2
  assert(res.symmetricValues[0][2] === 2 && res.symmetricValues[2][0] === 2, 'T5.4_3x3_OffDiag_02_Equal_2');
  // (1,2): (8+2)/2 = 5
  assert(res.symmetricValues[1][2] === 5 && res.symmetricValues[2][1] === 5, 'T5.5_3x3_OffDiag_12_Equal_5');
  // Diagonals preserved: 1, 4, -6
  assert(res.symmetricValues[0][0] === 1 && res.symmetricValues[1][1] === 4 && res.symmetricValues[2][2] === -6, 'T5.6_3x3_Diagonals_Preserved');
}

// -----------------------------------------------------------------------------
// TEST 6: Monte Carlo Fuzzing & Property-Based Verification (500 random matrices)
// -----------------------------------------------------------------------------
{
  let monteCarloSuccess = true;
  let monteCarloFailReason = '';

  const env = createMockEnvironment();
  const App = env.win.App;

  for (let trial = 0; trial < 500; trial++) {
    const dim = trial % 2 === 0 ? 2 : 3;
    const vals = [];
    for (let i = 0; i < dim; i++) {
      vals[i] = [];
      for (let j = 0; j < dim; j++) {
        // Random floating points between -50 and 50
        vals[i][j] = (Math.random() - 0.5) * 100;
      }
    }

    App.matrixList = [{
      id: 1000 + trial,
      name: `M_${trial}`,
      rows: dim,
      cols: dim,
      values: vals
    }];

    const res = App.getOrEnsureSelectedSquareMatrix('conicMatrixSelect', { requireSymmetric: true });
    if (!res) {
      monteCarloSuccess = false;
      monteCarloFailReason = `Trial ${trial} returned null`;
      break;
    }

    const sym = res.symmetricValues;
    // Check 1: S = S^T
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        if (Math.abs(sym[i][j] - sym[j][i]) > 1e-12) {
          monteCarloSuccess = false;
          monteCarloFailReason = `Trial ${trial}: Asymmetry in sym at (${i},${j}): ${sym[i][j]} != ${sym[j][i]}`;
          break;
        }
      }
    }

    // Check 2: Quadratic form invariance with random x
    const x = Array.from({ length: dim }, () => (Math.random() - 0.5) * 20);
    let qOrig = 0;
    let qSym = 0;
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        qOrig += x[i] * vals[i][j] * x[j];
        qSym += x[i] * sym[i][j] * x[j];
      }
    }
    if (Math.abs(qOrig - qSym) > 1e-7) {
      monteCarloSuccess = false;
      monteCarloFailReason = `Trial ${trial}: Quadratic form mismatch: ${qOrig} vs ${qSym}`;
      break;
    }

    // Check 3: Trace preservation
    let trOrig = 0;
    let trSym = 0;
    for (let i = 0; i < dim; i++) {
      trOrig += vals[i][i];
      trSym += sym[i][i];
    }
    if (Math.abs(trOrig - trSym) > 1e-12) {
      monteCarloSuccess = false;
      monteCarloFailReason = `Trial ${trial}: Trace mismatch: ${trOrig} vs ${trSym}`;
      break;
    }
  }

  assert(monteCarloSuccess, 'T6.1_Monte_Carlo_500_Matrices_Symmetrization_Invariant', monteCarloFailReason);
}

// -----------------------------------------------------------------------------
// TEST 7: Matrix Preview Grid Rendering & Badges
// -----------------------------------------------------------------------------
{
  const env = createMockEnvironment();
  const App = env.win.App;
  const previewEl = env.elements['conicMatrixPreview'];

  // Case A: Symmetric matrix
  const symMatrix = {
    id: 1,
    name: 'Sym_Mat',
    rows: 2,
    cols: 2,
    values: [[3, 5], [5, -1]]
  };
  App.renderMatrixPreviewGrid(previewEl, symMatrix, { isConic: true });
  assert(previewEl.innerHTML.includes('Ma trận đối xứng A = Aᵀ'), 'T7.1_Preview_Symmetric_Badge');

  // Case B: Asymmetric matrix with isConic: true
  const asymMatrix = {
    id: 2,
    name: 'Asym_Mat',
    rows: 2,
    cols: 2,
    values: [[3, 7], [1, -1]]
  };
  App.renderMatrixPreviewGrid(previewEl, asymMatrix, { isConic: true });
  assert(previewEl.innerHTML.includes('Tự động đối xứng hóa: ½(A + Aᵀ)'), 'T7.2_Preview_Auto_Symmetrize_Badge');
  assert(previewEl.innerHTML.includes('Dạng toàn phương xᵀAx chỉ phụ thuộc vào phần đối xứng'), 'T7.3_Preview_Footer_Note_Rendered');
  // Symmetrized value should be 4
  assert(previewEl.innerHTML.includes('4'), 'T7.4_Preview_Contains_Symmetrized_Value_4');

  // Case C: isConic: false (Linear Transformation Bai 6)
  const ltPreviewEl = env.elements['ltMatrixPreview'];
  App.renderMatrixPreviewGrid(ltPreviewEl, asymMatrix, { isConic: false });
  assert(ltPreviewEl.innerHTML.includes('Ma trận vuông hợp lệ'), 'T7.5_LT_Preview_Square_Valid_Badge');
  assert(!ltPreviewEl.innerHTML.includes('Tự động đối xứng hóa'), 'T7.6_LT_Does_Not_Force_Symmetrize');
}

console.log('================================================================');
console.log(`SUITE 1 RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================');

if (failedTests > 0) process.exit(1);
