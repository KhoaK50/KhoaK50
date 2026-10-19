/**
 * Stress Test Suite 3: Topic Switch & Animator Cleanup Stress Test
 * Challenger 2 for Milestone 1
 */

const fs = require('fs');
const path = require('path');

const sidebarPath = path.resolve(__dirname, '..', 'frontend_v2', 'js', 'app', 'ui', 'sidebar.js');
const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');

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
console.log('CHALLENGER 2: STRESS TEST SUITE 3 - TOPIC SWITCH & ANIMATOR CLEANUP');
console.log('================================================================');

const TOPICS = [
  { op: 'linear_independence', animId: 'indepAnimControls', fnStop: 'stopIndepAnimation', animatorKey: 'IndepAnimator' },
  { op: 'rank', animId: 'rankAnimControls', fnStop: 'stopRankAnimation', animatorKey: 'RankAnimator' },
  { op: 'basis', animId: 'basisAnimControls', fnStop: 'stopBasisAnimation', animatorKey: 'BasisAnimator' },
  { op: 'coordinates', animId: 'coordAnimControls', fnStop: 'stopCoordAnimation', animatorKey: 'CoordAnimator' },
  { op: 'topic4_gram_schmidt', animId: 'gsAnimControls', fnStop: 'stopGSAnimation', animatorKey: 'GSAnimator' },
  { op: 'topic5_linear_transformation', animId: 'ltAnimControls', fnStop: 'stopLTAnimation', animatorKey: 'LTAnimator' },
  { op: 'topic6_eigen', animId: 'eigenAnimControls', fnStop: 'stopEigenAnimation', animatorKey: 'EigenAnimator' },
  { op: 'quadratic_form_conic', animId: 'conicAnimControls', fnStop: 'stopConicAnimation', animatorKey: 'ConicAnimator' }
];

function createTopicSwitchEnvironment() {
  const elements = {};

  class MockElement {
    constructor(id, tag = 'div') {
      this.id = id;
      this.tagName = tag.toUpperCase();
      this.style = {};
      this.children = [];
      this.parentElement = null;
      this._classList = new Set();
    }
    get classList() {
      return {
        add: (...cls) => cls.forEach(c => this._classList.add(c)),
        remove: (...cls) => cls.forEach(c => this._classList.delete(c)),
        contains: (c) => this._classList.has(c)
      };
    }
    appendChild(child) {
      child.parentElement = this;
      this.children.push(child);
      return child;
    }
    querySelectorAll(sel) {
      if (sel === '.extra-form') {
        return this.children.filter(c => c._classList.has('extra-form'));
      }
      return [];
    }
  }

  const extraForms = new MockElement('extraForms');
  elements['extraForms'] = extraForms;

  // Build forms and controls elements
  TOPICS.forEach(t => {
    const form = new MockElement(`form-${t.op}`);
    form.classList.add('extra-form');
    extraForms.appendChild(form);
    elements[`form-${t.op}`] = form;

    const ctrl = new MockElement(t.animId);
    ctrl.style.display = 'block'; // initially active/visible
    elements[t.animId] = ctrl;
  });

  const doc = {
    getElementById: (id) => elements[id] || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    head: new MockElement('head'),
    body: new MockElement('body'),
    createElement: (tag) => new MockElement('elem_' + Math.random(), tag)
  };

  const win = {
    App: {},
    document: doc,
    setInterval: () => {},
    setTimeout: (fn) => fn(),
    localStorage: { getItem: () => null, setItem: () => {} }
  };

  global.App = win.App;
  global.window = win;
  global.document = doc;

  // Evaluate sidebar.js
  new Function('window', 'document', 'Event', 'App', 'setInterval', 'setTimeout', sidebarCode)(
    win, doc, function () {}, win.App, win.setInterval, win.setTimeout
  );

  return { win, doc, elements };
}

// -----------------------------------------------------------------------------
// TEST 1: Full 8x8 Transition Matrix Verification
// -----------------------------------------------------------------------------
let fullMatrixPass = true;
let matrixFailDetails = '';

for (const fromTopic of TOPICS) {
  for (const toTopic of TOPICS) {
    const env = createTopicSwitchEnvironment();
    const App = env.win.App;

    let stopCalled = false;
    let animatorStopCalled = false;

    // Pattern 1: App.stop<Topic>Animation function
    App[fromTopic.fnStop] = () => {
      stopCalled = true;
    };

    // Pattern 2: App.<Topic>Animator object fallback
    let isActiveState = true;
    App[fromTopic.animatorKey] = {
      isActive: () => isActiveState,
      stop: () => {
        animatorStopCalled = true;
        isActiveState = false;
      }
    };

    // Make fromTopic control visible
    env.elements[fromTopic.animId].style.display = 'block';
    env.elements[`form-${fromTopic.op}`].classList.add('active');

    // Perform transition
    App.showExtraForm(toTopic.op);

    if (fromTopic.op !== toTopic.op) {
      // Must have stopped animator
      if (!stopCalled) {
        fullMatrixPass = false;
        matrixFailDetails = `Transition ${fromTopic.op} -> ${toTopic.op}: ${fromTopic.fnStop} was not called`;
        break;
      }
      // Must have hidden floating controls
      if (env.elements[fromTopic.animId].style.display !== 'none') {
        fullMatrixPass = false;
        matrixFailDetails = `Transition ${fromTopic.op} -> ${toTopic.op}: ${fromTopic.animId} display is not 'none'`;
        break;
      }
      // From form must not be active
      if (env.elements[`form-${fromTopic.op}`].classList.contains('active')) {
        fullMatrixPass = false;
        matrixFailDetails = `Transition ${fromTopic.op} -> ${toTopic.op}: form-${fromTopic.op} still has .active`;
        break;
      }
      // To form must be active
      if (!env.elements[`form-${toTopic.op}`].classList.contains('active')) {
        fullMatrixPass = false;
        matrixFailDetails = `Transition ${fromTopic.op} -> ${toTopic.op}: form-${toTopic.op} missing .active`;
        break;
      }
    } else {
      // fromTopic === toTopic (no-op switch)
      // Must NOT stop active animator when staying on same topic
      if (stopCalled) {
        fullMatrixPass = false;
        matrixFailDetails = `Staying on ${fromTopic.op}: stop function should not be called`;
        break;
      }
    }
  }
  if (!fullMatrixPass) break;
}

assert(fullMatrixPass, 'T1.1_Full_8x8_Transition_Matrix_Animator_Stop_And_Hide', matrixFailDetails);

// -----------------------------------------------------------------------------
// TEST 2: Fallback to App.<Topic>Animator.stop() when App.stop<Topic>Animation is absent
// -----------------------------------------------------------------------------
{
  let fallbackPass = true;
  let fallbackDetails = '';

  for (const t of TOPICS) {
    const env = createTopicSwitchEnvironment();
    const App = env.win.App;

    delete App[t.fnStop]; // Ensure function is missing
    let animatorStopped = false;

    App[t.animatorKey] = {
      isActive: () => true,
      stop: () => {
        animatorStopped = true;
      }
    };

    env.elements[t.animId].style.display = 'block';

    // Switch to a different topic
    const otherTopic = TOPICS.find(o => o.op !== t.op).op;
    App.showExtraForm(otherTopic);

    if (!animatorStopped) {
      fallbackPass = false;
      fallbackDetails = `Fallback failed for ${t.op}: ${t.animatorKey}.stop() not called`;
      break;
    }
    if (env.elements[t.animId].style.display !== 'none') {
      fallbackPass = false;
      fallbackDetails = `Floating controls not hidden for ${t.op}`;
      break;
    }
  }

  assert(fallbackPass, 'T2.1_Fallback_To_Animator_Instance_Stop_All_Topics', fallbackDetails);
}

// -----------------------------------------------------------------------------
// TEST 3: Resiliency when animator.stop() throws an exception
// -----------------------------------------------------------------------------
{
  const env = createTopicSwitchEnvironment();
  const App = env.win.App;

  // Make basis animator throw error
  App.stopBasisAnimation = () => {
    throw new Error('Uncaught error inside basis stop');
  };
  env.elements['basisAnimControls'].style.display = 'block';

  let threw = false;
  try {
    App.showExtraForm('coordinates');
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'T3.1_Survives_Stop_Exception_Gracefully');
  assert(env.elements['basisAnimControls'].style.display === 'none', 'T3.2_Hides_Controls_Even_After_Stop_Exception');
  assert(env.elements['form-coordinates'].classList.contains('active'), 'T3.3_Target_Form_Activated_After_Exception');
}

// -----------------------------------------------------------------------------
// TEST 4: Resiliency when animControls DOM element is missing
// -----------------------------------------------------------------------------
{
  const env = createTopicSwitchEnvironment();
  const App = env.win.App;

  // Delete all animControls from elements map
  TOPICS.forEach(t => {
    delete env.elements[t.animId];
  });

  let threw = false;
  try {
    TOPICS.forEach(t => {
      App.showExtraForm(t.op);
    });
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'T4.1_Survives_Missing_AnimControls_DOM_Nodes');
}

// -----------------------------------------------------------------------------
// TEST 5: Switching to unknown or invalid op
// -----------------------------------------------------------------------------
{
  const env = createTopicSwitchEnvironment();
  const App = env.win.App;

  env.elements['form-basis'].classList.add('active');
  env.elements['basisAnimControls'].style.display = 'block';

  let threw = false;
  try {
    App.showExtraForm('invalid_topic_name_xyz');
  } catch (e) {
    threw = true;
  }

  assert(!threw, 'T5.1_Survives_Invalid_Op');
  assert(env.elements['basisAnimControls'].style.display === 'none', 'T5.2_Deactivates_Controls_On_Invalid_Op');
  assert(!env.elements['form-basis'].classList.contains('active'), 'T5.3_Deactivates_Previous_Form_On_Invalid_Op');
}

console.log('================================================================');
console.log(`SUITE 3 RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================');

if (failedTests > 0) process.exit(1);
