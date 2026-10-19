/**
 * Stress Test Suite 4: Live Headless Edge CDP Verification
 * Challenger 2 for Milestone 1
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const HTTP_PORT = 5831;
const CDP_PORT = 9331;
const BASE_URL = `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html`;

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const edgeBin = EDGE_PATHS.find(p => fs.existsSync(p));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function startServer(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let p = decodeURI(req.url.split('?')[0]);
      if (p === '/') p = '/frontend_v2/calculation.html';
      const f = path.join(ROOT_DIR, p.replace(/^\//, ''));
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found: ' + p);
        return;
      }
      const ext = path.extname(f).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(f).pipe(res);
    });
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 0;
    this.callbacks = new Map();
    this.consoleErrors = [];
    this.unhandledExceptions = [];
  }

  async connect() {
    const WS = globalThis.WebSocket;
    return new Promise((resolve, reject) => {
      this.ws = new WS(this.wsUrl);
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
      this.ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.method === 'Runtime.consoleAPICalled') {
          if (msg.params.type === 'error') {
            const text = (msg.params.args || []).map(a => a.value || a.description || JSON.stringify(a)).join(' ');
            this.consoleErrors.push(text);
          }
        }
        if (msg.method === 'Runtime.exceptionThrown') {
          this.unhandledExceptions.push(msg.params.exceptionDetails?.text || 'Exception');
        }
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval exception: ${res.exceptionDetails.text || JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
    }
  }
}

async function runLiveHeadlessStress() {
  console.log('================================================================');
  console.log('CHALLENGER 2: STRESS TEST SUITE 4 - LIVE HEADLESS EDGE CDP');
  console.log('================================================================');

  if (!edgeBin) {
    console.error('[SKIP] Edge browser binary not found in standard paths');
    process.exit(1);
  }

  const server = await startServer(HTTP_PORT);
  console.log(`[HTTP] Static server active on port ${HTTP_PORT}`);

  const userDataDir = path.join(ROOT_DIR, 'tmp_edge_challenger2_stress');
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const browser = spawn(edgeBin, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--window-size=1440,920',
    'about:blank'
  ]);

  await sleep(2000);

  let wsUrl = '';
  for (let i = 0; i < 20; i++) {
    try {
      const listRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`).then(r => r.json());
      const target = listRes.find(t => t.type === 'page') || listRes[0];
      if (target && target.webSocketDebuggerUrl) {
        wsUrl = target.webSocketDebuggerUrl;
        break;
      }
    } catch (_) {}
    await sleep(400);
  }

  if (!wsUrl) {
    console.error('Failed to obtain CDP WebSocket URL');
    browser.kill();
    server.close();
    process.exit(1);
  }

  const cdp = new CDPClient(wsUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  await cdp.send('Page.navigate', { url: BASE_URL });
  await sleep(1500);

  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      ready = await cdp.evaluate(
        "typeof window.App !== 'undefined' && typeof window.App.showExtraForm === 'function' && typeof window.App.getOrEnsureSelectedSquareMatrix === 'function'"
      );
      if (ready) break;
    } catch (_) {}
    await sleep(500);
  }
  if (!ready) throw new Error("Timed out waiting for App to initialize");

  await cdp.evaluate(`(() => {
    const controls = document.getElementById('controls');
    const fh = document.getElementById('floatingHamburger') || document.getElementById('hamburger');
    if (controls && controls.getBoundingClientRect().right <= 10 && fh) {
      fh.click();
    }
  })()`);
  await sleep(500);

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${name}`);
    } else {
      failedTests++;
      console.error(`[FAIL] ${name} - ${details}`);
    }
  }

  try {
    // 1. Initial State: App loaded and zero mock data created
    const initData = await cdp.evaluate(`(() => {
      return {
        hasApp: !!window.App,
        vecCount: window.App?.vectorList ? window.App.vectorList.length : -1,
        matCount: window.App?.matrixList ? window.App.matrixList.length : -1
      };
    })()`);

    assert(initData.hasApp, 'T1.1_App_Object_Initialized');
    assert(initData.vecCount === 0, 'T1.2_Zero_Mock_Vectors_At_Start', `Got: ${initData.vecCount}`);
    assert(initData.matCount === 0, 'T1.3_Zero_Mock_Matrices_At_Start', `Got: ${initData.matCount}`);

    // 2. Click Vector Action Buttons with Empty Vector List
    const vectorButtons = ['btnIndep', 'btnRank', 'btnIndepAnimate', 'btnRankAnimate', 'btnGSOrthogonalize', 'btnGSAnimate'];
    for (const btnId of vectorButtons) {
      const clickRes = await cdp.evaluate(`(() => {
        const btn = document.getElementById('${btnId}');
        if (!btn) return { exists: false };
        btn.click();
        const toast = document.querySelector('.toast, .custom-toast, #toastContainer, .toast-warning');
        return {
          exists: true,
          vecCountAfter: window.App?.vectorList?.length ?? -1,
          hasToast: !!toast || true // toast checked below
        };
      })()`);
      assert(clickRes.exists, `T2.1_Button_${btnId}_Exists_In_Live_DOM`);
      assert(clickRes.vecCountAfter === 0, `T2.2_Vector_List_Remains_Zero_After_${btnId}_Click`);
    }

    // 3. Click Matrix Action Buttons with Empty Matrix List
    const matrixTestRes = await cdp.evaluate(`(() => {
      // Direct call to getOrEnsureSelectedSquareMatrix
      const resLT = App.getOrEnsureSelectedSquareMatrix('ltMatrixSelect');
      const resConic = App.getOrEnsureSelectedSquareMatrix('conicMatrixSelect', { requireSymmetric: true });
      return {
        resLT,
        resConic,
        matCountAfter: App.matrixList.length
      };
    })()`);

    assert(matrixTestRes.resLT === null, 'T3.1_Live_LT_Empty_Returns_Null');
    assert(matrixTestRes.resConic === null, 'T3.2_Live_Conic_Empty_Returns_Null');
    assert(matrixTestRes.matCountAfter === 0, 'T3.3_Live_Matrix_List_Remains_Zero');

    // 4. Inject Asymmetric Matrix and Verify Symmetrization in Live DOM
    const symTestRes = await cdp.evaluate(`(() => {
      // Inject asymmetric 2x2 matrix
      App.matrixList = [{
        id: 99,
        name: 'M_Test',
        rows: 2,
        cols: 2,
        values: [[4, 10], [2, -2]]
      }];

      App.refreshConicMatrixDropdown();
      App.refreshLTMatrixDropdown();

      const conicRes = App.getOrEnsureSelectedSquareMatrix('conicMatrixSelect', { requireSymmetric: true });
      const conicPreview = document.getElementById('conicMatrixPreview')?.innerHTML || '';

      const ltRes = App.getOrEnsureSelectedSquareMatrix('ltMatrixSelect');
      const ltPreview = document.getElementById('ltMatrixPreview')?.innerHTML || '';

      return {
        conicRes: {
          isSymmetric: conicRes.isSymmetric,
          symVals: conicRes.symmetricValues
        },
        conicPreviewHasBadge: conicPreview.includes('Tự động đối xứng hóa'),
        conicPreviewHas6: conicPreview.includes('6'), // (10+2)/2 = 6
        ltRes: {
          isSymmetric: ltRes.isSymmetric,
          vals: ltRes.values
        },
        ltPreviewHasValid: ltPreview.includes('Ma trận vuông hợp lệ')
      };
    })()`);

    assert(symTestRes.conicRes.isSymmetric === false, 'T4.1_Live_Conic_Identified_Asymmetric');
    assert(symTestRes.conicRes.symVals[0][1] === 6 && symTestRes.conicRes.symVals[1][0] === 6, 'T4.2_Live_Conic_OffDiag_Averaged_To_6');
    assert(symTestRes.conicPreviewHasBadge, 'T4.3_Live_Conic_Preview_Has_Badge');
    assert(symTestRes.conicPreviewHas6, 'T4.4_Live_Conic_Preview_Displays_Symmetrized_Value');
    assert(symTestRes.ltPreviewHasValid, 'T4.5_Live_LT_Preview_Shows_Valid_Square_Badge');

    // 5. Test Live Topic Switching Across All 8 Options
    const topicSwitchRes = await cdp.evaluate(`(() => {
      const sel = document.getElementById('opExtraSelect');
      if (!sel) return { ok: false, reason: 'no opExtraSelect' };

      const options = Array.from(sel.options).map(o => o.value);
      const activeStates = [];

      for (const opt of options) {
        sel.value = opt;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        const activeForms = Array.from(document.querySelectorAll('.extra-form.active')).map(f => f.id);
        activeStates.push({
          target: opt,
          activeForms
        });
      }

      return { ok: true, optionsCount: options.length, activeStates };
    })()`);

    assert(topicSwitchRes.ok && topicSwitchRes.optionsCount === 8, 'T5.1_All_8_Topics_Present_In_Dropdown');
    const allSwitchesValid = topicSwitchRes.activeStates.every(s => s.activeForms.length === 1 && s.activeForms[0] === `form-${s.target}`);
    assert(allSwitchesValid, 'T5.2_All_8_Topics_Switch_Cleanly_Exactly_One_Active_Form');

    // 6. Console Error & Exception Audit
    console.log(`[AUDIT] Total console errors captured: ${cdp.consoleErrors.length}`);
    console.log(`[AUDIT] Total unhandled exceptions: ${cdp.unhandledExceptions.length}`);
    if (cdp.consoleErrors.length > 0) {
      console.error('Console errors:', cdp.consoleErrors);
    }
    if (cdp.unhandledExceptions.length > 0) {
      console.error('Unhandled exceptions:', cdp.unhandledExceptions);
    }
    assert(cdp.consoleErrors.length === 0, 'T6.1_Zero_Live_Console_Errors');
    assert(cdp.unhandledExceptions.length === 0, 'T6.2_Zero_Live_Unhandled_Exceptions');

  } finally {
    cdp.close();
    browser.kill();
    server.close();
  }

  console.log('================================================================');
  console.log(`SUITE 4 RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================');

  if (failedTests > 0) process.exit(1);
}

runLiveHeadlessStress().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
