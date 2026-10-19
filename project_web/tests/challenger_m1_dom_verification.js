/**
 * Empirical DOM & Controller Integrity Verification for Milestone 1
 * Written by Challenger 1 (m1_challenger_1)
 */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const CALC_HTML_PATH = path.join(ROOT_DIR, 'frontend_v2', 'calculation.html');
const SIDEBAR_JS_PATH = path.join(ROOT_DIR, 'frontend_v2', 'js', 'app', 'ui', 'sidebar.js');
const MATRIX_CTRL_PATH = path.join(ROOT_DIR, 'frontend_v2', 'js', 'app', 'logic', 'matrix_controller.js');
const VECTOR_CTRL_PATH = path.join(ROOT_DIR, 'frontend_v2', 'js', 'app', 'logic', 'vector_controller.js');

const REQUIRED_NEW_IDS = [
  'indepChecklist',
  'btnIndepAnimate',
  'btnIndepSolution',
  'rankChecklist',
  'btnRankAnimate',
  'btnRankSolution',
  'gsChecklist',
  'btnGSOrthogonalize',
  'btnGSAnimate',
  'btnGSSolution',
  'ltMatrixSelect',
  'ltMatrixPreview',
  'btnLTInspect',
  'btnLTAnimate',
  'btnLTSolution',
  'conicMatrixSelect',
  'conicMatrixPreview',
  'btnConicDraw',
  'btnConicAnimate',
  'btnConicSolution'
];

const ELIMINATED_LEGACY_IDS = [
  'btnInteract',
  'gs_v1_x',
  'gs_v1_y',
  'gs_v2_x',
  'gs_v2_y',
  'lt_geo_presets',
  'lt_a11',
  'lt_a22',
  'btnLTMorph',
  'conic_a',
  'conic_b',
  'conic_f',
  'btnConicRotate'
];

function runVerification() {
  console.log('================================================================');
  console.log(' CHALLENGER 1: EMPIRICAL DOM & CONTROLLER VERIFICATION SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let failedTests = 0;
  const issues = [];

  const htmlContent = fs.readFileSync(CALC_HTML_PATH, 'utf8');

  // --- TEST 1: Required New DOM IDs Existence ---
  console.log('--- Test 1: Presence of 100% Required New DOM Elements ---');
  let missingCount = 0;
  for (const id of REQUIRED_NEW_IDS) {
    const idRegex = new RegExp(`id=["']${id}["']`, 'i');
    if (idRegex.test(htmlContent)) {
      console.log(`  [PASS] ID exists: #${id}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] MISSING REQUIRED ID: #${id}`);
      issues.push(`Missing required new ID: #${id}`);
      missingCount++;
      failedTests++;
    }
  }

  // --- TEST 2: Elimination of 100% Legacy Elements ---
  console.log('\n--- Test 2: Elimination of 100% Legacy Elements ---');
  let legacyCount = 0;
  for (const id of ELIMINATED_LEGACY_IDS) {
    const idRegex = new RegExp(`id=["']${id}["']`, 'i');
    if (idRegex.test(htmlContent)) {
      console.error(`  [FAIL] LEGACY ID STILL PRESENT: #${id}`);
      issues.push(`Legacy ID not eliminated: #${id}`);
      legacyCount++;
      failedTests++;
    } else {
      console.log(`  [PASS] Legacy eliminated: #${id}`);
      passedTests++;
    }
  }

  // --- TEST 3: Duplicate ID Detection ---
  console.log('\n--- Test 3: Duplicate ID Check (Uniqueness in DOM) ---');
  for (const id of REQUIRED_NEW_IDS) {
    const idRegex = new RegExp(`id=["']${id}["']`, 'gi');
    const matches = htmlContent.match(idRegex) || [];
    if (matches.length === 1) {
      console.log(`  [PASS] Unique: #${id} (occurs 1 time)`);
      passedTests++;
    } else if (matches.length > 1) {
      console.error(`  [FAIL] DUPLICATE ID FOUND: #${id} occurs ${matches.length} times`);
      issues.push(`Duplicate ID: #${id} occurs ${matches.length} times in calculation.html`);
      failedTests++;
    } else {
      // Already counted in Test 1
    }
  }

  // --- TEST 4: Button Attributes (type="button" and Visibility) ---
  console.log('\n--- Test 4: Button Attributes & Visibility Audit ---');
  const buttonIds = REQUIRED_NEW_IDS.filter(id => id.startsWith('btn'));
  for (const btnId of buttonIds) {
    const btnRegex = new RegExp(`<button[^>]*id=["']${btnId}["'][^>]*>`, 'i');
    const match = htmlContent.match(btnRegex);
    if (!match) {
      console.error(`  [FAIL] Button tag not found for #${btnId}`);
      issues.push(`Button tag not found for #${btnId}`);
      failedTests++;
      continue;
    }
    const tag = match[0];
    const hasTypeButton = /type=["']button["']/i.test(tag);
    const isHidden = /display:\s*none/i.test(tag) || /hidden/i.test(tag);

    if (hasTypeButton) {
      console.log(`  [PASS] #${btnId} has explicit type="button"`);
      passedTests++;
    } else {
      console.error(`  [WARN/FAIL] #${btnId} is missing type="button" (may cause form submit reload)`);
      issues.push(`Button #${btnId} missing explicit type="button": ${tag}`);
      failedTests++;
    }

    if (!isHidden) {
      console.log(`  [PASS] #${btnId} is visible (no display:none / hidden)`);
      passedTests++;
    } else {
      console.error(`  [FAIL] #${btnId} is hidden: ${tag}`);
      issues.push(`Button #${btnId} has display:none or hidden attribute`);
      failedTests++;
    }
  }

  // --- TEST 5: Script Duplicate Inclusions Check ---
  console.log('\n--- Test 5: Playback Script Inclusions Audit ---');
  const playbackScripts = [
    'indep_animation.js',
    'rank_animation.js',
    'gs_animation.js',
    'lt_animation.js',
    'conic_animation.js'
  ];
  for (const scriptName of playbackScripts) {
    const scriptRegex = new RegExp(`src=["'][^"']*${scriptName}["']`, 'gi');
    const matches = htmlContent.match(scriptRegex) || [];
    if (matches.length === 1) {
      console.log(`  [PASS] Script loaded once: ${scriptName}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] SCRIPT DUPLICATE INCLUSION: ${scriptName} is loaded ${matches.length} times in calculation.html`);
      issues.push(`Duplicate script tag: ${scriptName} is included ${matches.length} times (could execute twice or redeclare globals)`);
      failedTests++;
    }
  }

  // --- TEST 6: Controller Wiring & Protection ---
  console.log('\n--- Test 6: Controller Wiring & Zero-Mock Protection ---');
  const sidebarContent = fs.readFileSync(SIDEBAR_JS_PATH, 'utf8');
  const matrixCtrlContent = fs.readFileSync(MATRIX_CTRL_PATH, 'utf8');
  const vectorCtrlContent = fs.readFileSync(VECTOR_CTRL_PATH, 'utf8');

  // Check sidebar.js wiring
  const sidebarChecks = [
    { name: 'gsChecklist init in sidebar.js', test: sidebarContent.includes('gsChecklist') },
    { name: 'syncChecklistText("gs") in sidebar.js', test: sidebarContent.includes('syncChecklistText("gs")') || sidebarContent.includes("syncChecklistText('gs')") },
    { name: 'ltMatrixSelect refresh in sidebar.js', test: sidebarContent.includes('refreshLTMatrixDropdown') },
    { name: 'conicMatrixSelect refresh in sidebar.js', test: sidebarContent.includes('refreshConicMatrixDropdown') },
    { name: 'App.requireVectors used for validation', test: sidebarContent.includes('App.requireVectors') }
  ];
  for (const c of sidebarChecks) {
    if (c.test) {
      console.log(`  [PASS] ${c.name}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Missing in sidebar.js: ${c.name}`);
      issues.push(`Missing in sidebar.js: ${c.name}`);
      failedTests++;
    }
  }

  // Check matrix_controller.js wiring
  const matrixChecks = [
    { name: 'getOrEnsureSelectedSquareMatrix in matrix_controller.js', test: matrixCtrlContent.includes('getOrEnsureSelectedSquareMatrix') },
    { name: 'renderMatrixPreviewGrid in matrix_controller.js', test: matrixCtrlContent.includes('renderMatrixPreviewGrid') },
    { name: 'refreshLTMatrixDropdown in matrix_controller.js', test: matrixCtrlContent.includes('refreshLTMatrixDropdown') },
    { name: 'refreshConicMatrixDropdown in matrix_controller.js', test: matrixCtrlContent.includes('refreshConicMatrixDropdown') }
  ];
  for (const c of matrixChecks) {
    if (c.test) {
      console.log(`  [PASS] ${c.name}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Missing in matrix_controller.js: ${c.name}`);
      issues.push(`Missing in matrix_controller.js: ${c.name}`);
      failedTests++;
    }
  }

  // Check vector_controller.js wiring
  const vectorChecks = [
    { name: 'btnIndepAnimate listener in vector_controller.js', test: vectorCtrlContent.includes('btnIndepAnimate') },
    { name: 'btnRankAnimate listener in vector_controller.js', test: vectorCtrlContent.includes('btnRankAnimate') },
    { name: 'App.requireVectors in vector_controller.js', test: vectorCtrlContent.includes('App.requireVectors') }
  ];
  for (const c of vectorChecks) {
    if (c.test) {
      console.log(`  [PASS] ${c.name}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Missing in vector_controller.js: ${c.name}`);
      issues.push(`Missing in vector_controller.js: ${c.name}`);
      failedTests++;
    }
  }

  // --- TEST 7: Zero Em-dash (\u2014) Scanner ---
  console.log('\n--- Test 7: Zero Em-dash Compliance Scanner ---');
  const targetFiles = [
    CALC_HTML_PATH,
    SIDEBAR_JS_PATH,
    MATRIX_CTRL_PATH,
    VECTOR_CTRL_PATH
  ];
  for (const file of targetFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT_DIR, file);
    if (content.includes('\u2014')) {
      console.error(`  [FAIL] Em-dash (\u2014) detected in: ${rel}`);
      issues.push(`Em-dash violation in: ${rel}`);
      failedTests++;
    } else {
      console.log(`  [PASS] Zero Em-dash: ${rel}`);
      passedTests++;
    }
  }

  // --- SUMMARY ---
  console.log('\n================================================================');
  console.log(' VERIFICATION SUMMARY');
  console.log('================================================================');
  console.log(`Total Checks: ${passedTests + failedTests}`);
  console.log(`Passed:       ${passedTests}`);
  console.log(`Failed:       ${failedTests}`);

  if (issues.length > 0) {
    console.log('\nIssues Found:');
    issues.forEach((iss, idx) => console.log(`  ${idx + 1}. ${iss}`));
  }

  return { passedTests, failedTests, issues };
}

if (require.main === module) {
  const result = runVerification();
  process.exit(result.failedTests > 0 ? 1 : 0);
}

module.exports = { runVerification };
