/**
 * Stress Test Suite 2: Empty State Guards & Interceptors
 * Challenger 2 for Milestone 1
 */

const fs = require('fs');
const path = require('path');

const sidebarPath = path.resolve(__dirname, '..', 'frontend_v2', 'js', 'app', 'ui', 'sidebar.js');
const vectorCtrlPath = path.resolve(__dirname, '..', 'frontend_v2', 'js', 'app', 'logic', 'vector_controller.js');
const matrixCtrlPath = path.resolve(__dirname, '..', 'frontend_v2', 'js', 'app', 'logic', 'matrix_controller.js');

const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');
const vectorCtrlCode = fs.readFileSync(vectorCtrlPath, 'utf8');
const matrixCtrlCode = fs.readFileSync(matrixCtrlPath, 'utf8');

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
console.log('CHALLENGER 2: STRESS TEST SUITE 2 - EMPTY STATE GUARDS & INTERCEPTORS');
console.log('================================================================');

// -----------------------------------------------------------------------------
// Helper to construct DOM sandbox for button listeners & requireVectors
// -----------------------------------------------------------------------------
function createDOMEnvironment() {
  const toasts = [];
  const tabClicks = [];
  const events = [];

  const elements = {};

  class MockElement {
    constructor(id, tag = 'div') {
      this.id = id;
      this.tagName = tag.toUpperCase();
      this.value = '';
      this.textContent = '';
      this.style = {};
      this.innerHTML = '';
      this.dataset = {};
      this.children = [];
      this.listeners = {};
      this.parentElement = null;
      this._classList = new Set();
    }
    scrollIntoView() {}
    focus() {}
    remove() {
      if (this.parentElement) {
        const idx = this.parentElement.children.indexOf(this);
        if (idx !== -1) this.parentElement.children.splice(idx, 1);
      }
    }
    get classList() {
      return {
        add: (...cls) => cls.forEach(c => this._classList.add(c)),
        remove: (...cls) => cls.forEach(c => this._classList.delete(c)),
        toggle: (c, force) => {
          if (force === true) { this._classList.add(c); return true; }
          if (force === false) { this._classList.delete(c); return false; }
          if (this._classList.has(c)) { this._classList.delete(c); return false; }
          this._classList.add(c); return true;
        },
        contains: (c) => this._classList.has(c)
      };
    }
    appendChild(child) {
      child.parentElement = this;
      this.children.push(child);
      return child;
    }
    addEventListener(evt, handler, capture) {
      this.listeners[evt] = this.listeners[evt] || [];
      this.listeners[evt].push({ handler, capture });
    }
    dispatchEvent(ev) {
      events.push({ target: this.id, event: ev });
      const handlers = this.listeners[ev.type] || [];
      for (const h of handlers) {
        h.handler(ev);
      }
    }
    click() {
      const ev = {
        type: 'click',
        defaultPrevented: false,
        immediatePropagationStopped: false,
        preventDefault() { this.defaultPrevented = true; },
        stopImmediatePropagation() { this.immediatePropagationStopped = true; }
      };
      const handlers = (this.listeners['click'] || []).slice().sort((a, b) => (b.capture ? 1 : 0) - (a.capture ? 1 : 0));
      for (const h of handlers) {
        h.handler(ev);
        if (ev.immediatePropagationStopped) break;
      }
      if (!ev.immediatePropagationStopped && typeof this.onclick === 'function') {
        this.onclick(ev);
      }
      return ev;
    }
    closest(selector) {
      let cur = this;
      while (cur) {
        if (selector.startsWith('#') && cur.id === selector.slice(1)) return cur;
        if (selector.startsWith('.') && cur.classList.contains(selector.slice(1))) return cur;
        cur = cur.parentElement;
      }
      return null;
    }
    querySelectorAll(selector) {
      const matches = [];
      function traverse(node) {
        for (const child of node.children) {
          if (selector === 'button' && child.tagName === 'BUTTON') matches.push(child);
          if (selector.startsWith('#') && child.id === selector.slice(1)) matches.push(child);
          if (selector.startsWith('.') && child.classList.contains(selector.slice(1))) matches.push(child);
          traverse(child);
        }
      }
      traverse(this);
      return matches;
    }
  }

  const root = new MockElement('root');

  function ensure(id, tag = 'div', parent = root) {
    if (!elements[id]) {
      const el = new MockElement(id, tag);
      parent.appendChild(el);
      elements[id] = el;
    }
    return elements[id];
  }

  // Set up panels
  const tabs = ensure('tabs', 'div');
  tabs.classList.add('sidebar-tabs');
  const tabBtn = ensure('tab-create-btn', 'button', tabs);
  tabBtn.classList.add('tab-btn');
  tabBtn.addEventListener('click', () => { tabClicks.push('create-tab'); });

  ensure('createObjectSelect', 'select');
  ensure('card-create', 'div');
  ensure('vectorInput', 'input');
  ensure('mixedVectorSelect', 'select');

  // Vector calculation buttons
  const indepForm = ensure('form-linear_independence', 'div');
  ensure('indepChecklist', 'div', indepForm);
  const btnIndep = ensure('btnIndep', 'button', indepForm);
  btnIndep.textContent = 'Kiểm tra';
  const btnIndepAnimate = ensure('btnIndepAnimate', 'button', indepForm);
  btnIndepAnimate.textContent = 'Trực quan';
  const btnIndepSolution = ensure('btnIndepSolution', 'button', indepForm);
  btnIndepSolution.textContent = 'Lời giải';

  const rankForm = ensure('form-rank', 'div');
  ensure('rankChecklist', 'div', rankForm);
  const btnRank = ensure('btnRank', 'button', rankForm);
  btnRank.textContent = 'Tính hạng';
  const btnRankAnimate = ensure('btnRankAnimate', 'button', rankForm);
  btnRankAnimate.textContent = 'Trực quan';
  const btnRankSolution = ensure('btnRankSolution', 'button', rankForm);
  btnRankSolution.textContent = 'Lời giải';

  const basisForm = ensure('form-basis', 'div');
  const btnBasis = ensure('btnBasis', 'button', basisForm);
  btnBasis.textContent = 'Tính cơ sở';
  const btnBasisAnimate = ensure('btnBasisAnimate', 'button', basisForm);
  btnBasisAnimate.textContent = 'Trực quan';

  const coordForm = ensure('form-coordinates', 'div');
  const btnCoord = ensure('btnCoord', 'button', coordForm);
  btnCoord.textContent = 'Xuất tọa độ';
  const btnCoordAnimate = ensure('btnCoordAnimate', 'button', coordForm);
  btnCoordAnimate.textContent = 'Trực quan';

  const gsForm = ensure('form-topic4_gram_schmidt', 'div');
  ensure('gsChecklist', 'div', gsForm);
  const btnGSOrthogonalize = ensure('btnGSOrthogonalize', 'button', gsForm);
  btnGSOrthogonalize.textContent = 'Trực giao hóa';
  const btnGSAnimate = ensure('btnGSAnimate', 'button', gsForm);
  btnGSAnimate.textContent = 'Trực quan';

  // Matrix panels & buttons
  const ltForm = ensure('form-topic5_linear_transformation', 'div');
  ensure('ltMatrixSelect', 'select', ltForm);
  ensure('ltMatrixPreview', 'div', ltForm);
  const btnLTInspect = ensure('btnLTInspect', 'button', ltForm);
  btnLTInspect.textContent = 'Khảo sát';
  const btnLTAnimate = ensure('btnLTAnimate', 'button', ltForm);
  btnLTAnimate.textContent = 'Trực quan';

  const conicForm = ensure('form-quadratic_form_conic', 'div');
  ensure('conicMatrixSelect', 'select', conicForm);
  ensure('conicMatrixPreview', 'div', conicForm);
  const btnConicDraw = ensure('btnConicDraw', 'button', conicForm);
  btnConicDraw.textContent = 'Chính tắc hóa';
  const btnConicAnimate = ensure('btnConicAnimate', 'button', conicForm);
  btnConicAnimate.textContent = 'Trực quan';

  const eigenForm = ensure('form-topic6_eigen', 'div');
  ensure('eigenMatrixSelect', 'select', eigenForm);
  ensure('eigenMatrixPreview', 'div', eigenForm);
  const btnEigenCompute = ensure('btnEigenCompute', 'button', eigenForm);
  btnEigenCompute.textContent = 'Tính trị riêng';
  const btnEigenAnimate = ensure('btnEigenAnimate', 'button', eigenForm);
  btnEigenAnimate.textContent = 'Trực quan';

  const doc = {
    getElementById: (id) => elements[id] || null,
    querySelector: (sel) => {
      if (sel === '.sidebar-tabs .tab-btn') return tabBtn;
      if (sel.startsWith('#')) return elements[sel.slice(1)] || null;
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === 'button') return root.querySelectorAll('button');
      if (sel === 'div') return root.querySelectorAll('div');
      return [];
    },
    head: new MockElement('head'),
    body: new MockElement('body'),
    createElement: (tag) => new MockElement('elem_' + Math.random(), tag)
  };

  const win = {
    App: {
      vectorList: [],
      matrixList: [],
      showToast: (msg, type) => {
        toasts.push({ msg, type });
      }
    },
    document: doc,
    setInterval: (fn) => fn(), // execute immediately
    setTimeout: (fn) => fn(),
    localStorage: {
      getItem: () => null,
      setItem: () => {}
    },
    requestAnimationFrame: (cb) => 1,
    cancelAnimationFrame: () => {},
    addEventListener: (evt, handler) => {
      if (evt === 'load') handler();
    },
    removeEventListener: () => {},
    Event: function (name, opts) {
      this.name = name;
      this.opts = opts;
    }
  };

  global.localStorage = win.localStorage;
  global.requestAnimationFrame = win.requestAnimationFrame;
  global.cancelAnimationFrame = win.cancelAnimationFrame;
  global.App = win.App;
  global.window = win;
  global.document = doc;
  global.setInterval = win.setInterval;
  global.setTimeout = win.setTimeout;

  // Execute matrix_controller
  new Function('window', 'document', 'Event', 'App', 'setInterval', 'setTimeout', matrixCtrlCode)(win, doc, win.Event, win.App, win.setInterval, win.setTimeout);

  // Execute vector_controller
  new Function('window', 'document', 'Event', 'App', 'setInterval', 'setTimeout', vectorCtrlCode)(win, doc, win.Event, win.App, win.setInterval, win.setTimeout);

  // Execute sidebar.js
  new Function('window', 'document', 'Event', 'App', 'setInterval', 'setTimeout', sidebarCode)(win, doc, win.Event, win.App, win.setInterval, win.setTimeout);

  return { win, doc, toasts, tabClicks, elements };
}

// -----------------------------------------------------------------------------
// TEST 1: App.requireVectors core behavior when vectorList is empty
// -----------------------------------------------------------------------------
{
  const env = createDOMEnvironment();
  const App = env.win.App;
  App.vectorList = [];

  const allowed = App.requireVectors();
  assert(allowed === false, 'T1.1_RequireVectors_Returns_False_On_Empty');
  assert(App.vectorList.length === 0, 'T1.2_VectorList_Remains_Empty');
  assert(env.toasts.length >= 1 && env.toasts[0].type === 'warning', 'T1.3_Warning_Toast_Shown');
  assert(env.toasts[0].msg.includes('Danh sách trống'), 'T1.4_Toast_Warns_Empty_List');
  assert(env.tabClicks.length >= 1, 'T1.5_Switched_To_Create_Tab');
}

// -----------------------------------------------------------------------------
// TEST 2: App.requireVectors when vectorList has items
// -----------------------------------------------------------------------------
{
  const env = createDOMEnvironment();
  const App = env.win.App;
  App.vectorList = [{ id: 1, name: 'v1', vec: [1, 2] }];

  const allowed = App.requireVectors();
  assert(allowed === true, 'T2.1_RequireVectors_Allows_When_Populated');
  assert(env.toasts.length === 0, 'T2.2_No_Warning_Toast_When_Populated');
}

// -----------------------------------------------------------------------------
// TEST 3: Interceptor blocks all vector calculation and animate buttons when empty
// -----------------------------------------------------------------------------
{
  const vectorButtons = [
    'btnIndep',
    'btnIndepAnimate',
    'btnRank',
    'btnRankAnimate',
    'btnBasis',
    'btnBasisAnimate',
    'btnCoord',
    'btnCoordAnimate',
    'btnGSOrthogonalize',
    'btnGSAnimate'
  ];

  vectorButtons.forEach((btnId) => {
    const env = createDOMEnvironment();
    const App = env.win.App;
    App.vectorList = [];

    const btn = env.elements[btnId];
    assert(btn !== undefined, `T3.0_Button_${btnId}_Exists`);

    if (btnId === 'btnIndep') {
      console.log('DEBUG btnIndep:', {
        listeners: btn.listeners,
        onclick: typeof btn.onclick,
        dataset: btn.dataset,
        textContent: btn.textContent
      });
    }
    const ev = btn.click();
    assert(ev.defaultPrevented || ev.immediatePropagationStopped, `T3.1_Click_Blocked_For_${btnId}`);
    assert(env.toasts.length >= 1 && env.toasts.some(t => t.type === 'warning'), `T3.2_Toast_Shown_For_${btnId}`);
    assert(App.vectorList.length === 0, `T3.3_No_Mock_Vectors_For_${btnId}`);
  });
}

// -----------------------------------------------------------------------------
// TEST 4: Matrix buttons MUST NOT be blocked by requireVectors when vectorList is empty
// -----------------------------------------------------------------------------
{
  const matrixButtons = [
    'btnLTInspect',
    'btnLTAnimate',
    'btnConicDraw',
    'btnConicAnimate',
    'btnEigenCompute',
    'btnEigenAnimate'
  ];

  matrixButtons.forEach((btnId) => {
    const env = createDOMEnvironment();
    const App = env.win.App;
    // Vectors are empty, but matrix is populated!
    App.vectorList = [];
    App.matrixList = [{
      id: 1,
      name: 'Mat1',
      rows: 2,
      cols: 2,
      values: [[1, 0], [0, 1]]
    }];

    const btn = env.elements[btnId];
    assert(btn !== undefined, `T4.0_Matrix_Button_${btnId}_Exists`);

    const ev = btn.click();
    // Must NOT be blocked by requireVectors!
    assert(!ev.immediatePropagationStopped, `T4.1_Matrix_Button_${btnId}_Not_Blocked_By_Vector_Guard`);
    // No vector toast should have been fired
    const vectorToast = env.toasts.find(t => t.msg.includes('tạo vector'));
    assert(!vectorToast, `T4.2_No_Vector_Toast_On_Matrix_Button_${btnId}`);
  });
}

// -----------------------------------------------------------------------------
// TEST 5: Matrix empty state handling on matrix buttons
// -----------------------------------------------------------------------------
{
  const env = createDOMEnvironment();
  const App = env.win.App;
  App.vectorList = [];
  App.matrixList = []; // Empty matrices!

  // Bai 6 Linear Transformation
  const resLT = App.getOrEnsureSelectedSquareMatrix('ltMatrixSelect');
  assert(resLT === null, 'T5.1_LT_Empty_Matrix_Returns_Null');
  assert(env.toasts.some(t => t.msg.includes('Hãy tạo ma trận vuông')), 'T5.2_LT_Empty_Matrix_Toast_Shown');

  // Bai 8 Conic
  const resConic = App.getOrEnsureSelectedSquareMatrix('conicMatrixSelect', { requireSymmetric: true });
  assert(resConic === null, 'T5.3_Conic_Empty_Matrix_Returns_Null');
  assert(env.toasts.some(t => t.msg.includes('Hãy tạo ma trận vuông')), 'T5.4_Conic_Empty_Matrix_Toast_Shown');

  // Bai 7 Eigen
  const resEigen = App.getOrEnsureSelectedSquareMatrix('eigenMatrixSelect');
  assert(resEigen === null, 'T5.5_Eigen_Empty_Matrix_Returns_Null');

  assert(App.matrixList.length === 0, 'T5.6_Zero_Mock_Matrices_Created');
}

console.log('================================================================');
console.log(`SUITE 2 RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================');

if (failedTests > 0) process.exit(1);
