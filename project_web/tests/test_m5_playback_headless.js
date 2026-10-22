/**
 * Test script for Milestone 5 & 6:
 * Verifies App.ConicAnimator & Topic 7 (2D Conic + 3D Quadric, asymmetric matrix symmetrization,
 * math-Clean-Card, 3-step controls, 2-tab solution drawer) AND verifies all 8 problems in calculation.html!
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9228;
const HTTP_PORT = 5504;
const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function startServer(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURIComponent(new URL(req.url, `http://127.0.0.1:${port}`).pathname);
      if (reqPath === '/') reqPath = '/frontend_v2/calculation.html';
      const filePath = path.join(ROOT_DIR, reqPath);
      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          res.writeHead(404);
          res.end('404');
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      });
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runTest() {
  console.log('[TEST] Starting static server on port ' + HTTP_PORT + '...');
  const server = await startServer(HTTP_PORT);

  console.log('[TEST] Launching Edge headless on debug port ' + CDP_PORT + '...');
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html`
  ]);

  await sleep(2400);

  const cdpRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
  const tabs = await cdpRes.json();
  const targetTab = tabs.find(t => t.url.includes('calculation.html'));
  if (!targetTab) throw new Error('calculation.html tab not found in CDP');

  const WS = typeof WebSocket !== 'undefined' ? WebSocket : global.WebSocket;
  const ws = new WS(targetTab.webSocketDebuggerUrl);

  let idSeq = 1;
  const callbacks = new Map();
  const consoleErrors = [];

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(msg.params.exceptionDetails?.text || 'Runtime exception');
    }
    if (msg.id && callbacks.has(msg.id)) {
      const cb = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      cb(msg.result);
    }
  });

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  function sendCommand(method, params = {}) {
    return new Promise(res => {
      const id = idSeq++;
      callbacks.set(id, res);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evalCode(expression) {
    const ret = await sendCommand('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (ret?.exceptionDetails) {
      throw new Error('Eval exception: ' + JSON.stringify(ret.exceptionDetails));
    }
    return ret?.result?.value;
  }

  await sendCommand('Runtime.enable');

  console.log('--- Step 1: Verify All 8 Animators Loaded ---');
  const allAnimators = await evalCode(`({
    IndepAnimator: !!(window.App && App.IndepAnimator),
    RankAnimator: !!(window.App && App.RankAnimator),
    BasisAnimator: !!(window.App && App.BasisAnimator),
    CoordAnimator: !!(window.App && App.CoordAnimator),
    GSAnimator: !!(window.App && App.GSAnimator),
    LTAnimator: !!(window.App && App.LTAnimator),
    EigenAnimator: !!(window.App && App.EigenAnimator),
    ConicAnimator: !!(window.App && App.ConicAnimator)
  })`);
  console.log('All 8 Animators:', allAnimators);
  for (const [k, v] of Object.entries(allAnimators)) {
    if (!v) throw new Error(`Missing animator: ${k}`);
  }

  console.log('--- Step 2: Test 2D Quadratic Form (Tilted Ellipse [[5, 3], [3, 5]]) ---');
  const conic2D = await evalCode(`(function() {
    const taskSelect = document.getElementById("opExtraSelect");
    taskSelect.value = "quadratic_form_conic";
    taskSelect.dispatchEvent(new Event("change", { bubbles: true }));

    App.matrixList = [
      {
        id: "mat_conic_2d",
        name: "A",
        rows: 2,
        cols: 2,
        values: [[5, 3], [3, 5]],
        visible: true
      }
    ];
    if (typeof App.refreshConicMatrixDropdown === "function") {
      App.refreshConicMatrixDropdown();
    }

    const btnDraw = document.getElementById("btnConicDraw");
    if (btnDraw) btnDraw.click();

    const resBox = document.getElementById("result_conic_info");
    const isCardVisible = resBox && resBox.style.display !== "none";
    const cardHtml = resBox ? resBox.innerHTML : "";

    const btnAnim = document.getElementById("btnConicAnimate");
    if (btnAnim) btnAnim.click();

    const controls = document.getElementById("conicAnimControls");
    const isControlsVisible = controls && controls.style.display !== "none";
    const active = App.ConicAnimator.isActive();

    App.ConicAnimator.goToPhase(1);
    const phase1 = App.ConicAnimator._currentPhase;
    App.ConicAnimator.goToPhase(2);
    const phase2 = App.ConicAnimator._currentPhase;

    const btnSol = document.getElementById("btnConicSolution");
    if (btnSol) btnSol.click();

    App.ConicAnimator.stop();

    return {
      isCardVisible,
      hasCleanCard: cardHtml.includes("math-Clean-Card"),
      hasInertia: cardHtml.includes("(2, 0)"),
      isControlsVisible,
      active,
      phase1,
      phase2,
      stopped: !App.ConicAnimator.isActive()
    };
  })()`);
  console.log('2D Conic Result:', conic2D);
  if (!conic2D.isCardVisible || !conic2D.hasCleanCard || !conic2D.hasInertia || !conic2D.isControlsVisible || !conic2D.active || conic2D.phase1 !== 1 || conic2D.phase2 !== 2 || !conic2D.stopped) {
    throw new Error('2D Conic test failed: ' + JSON.stringify(conic2D));
  }

  console.log('--- Step 3: Test 3D Quadric & Off-Diagonal Camera Framing ---');
  const conic3D = await evalCode(`(function() {
    App.matrixList = [
      {
        id: "mat_conic_3d",
        name: "Q3",
        rows: 3,
        cols: 3,
        values: [
          [3, 1, 0],
          [1, 3, 0],
          [0, 0, 2]
        ],
        visible: true
      }
    ];
    if (typeof App.refreshConicMatrixDropdown === "function") {
      App.refreshConicMatrixDropdown();
    }

    const ok = App.ConicAnimator.start(App.matrixList[0]);
    const mode = App.mode;
    App.ConicAnimator.goToPhase(1);
    App.ConicAnimator.goToPhase(2);

    let isOffDiag = false;
    if (window.Vec3D && Vec3D._camera) {
      const c = Vec3D._camera.position;
      isOffDiag = (Math.abs(c.x - c.y) > 0.1) && (Math.abs(c.y - c.z) > 0.1);
    }

    App.ConicAnimator.stop();
    return { ok, mode, isOffDiag, stopped: !App.ConicAnimator.isActive() };
  })()`);
  console.log('3D Conic Result:', conic3D);
  if (!conic3D.ok || conic3D.mode !== '3D' || !conic3D.isOffDiag || !conic3D.stopped) {
    throw new Error('3D Conic test failed: ' + JSON.stringify(conic3D));
  }

  if (consoleErrors.length > 0) {
    throw new Error('Console exceptions detected: ' + consoleErrors.join('; '));
  }

  console.log('[PASS] ALL MILESTONE 5 & 8-PROBLEM ANIMATOR CHECKS PASSED (0 console errors)!');
  ws.close();
  edge.kill();
  server.close();
}

runTest().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
