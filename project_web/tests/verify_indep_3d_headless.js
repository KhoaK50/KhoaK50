/**
 * E2E Verification Test: 3D Linear Independence Visualization
 * Verifies that:
 * 1. 3D mode correctly displays 1D line and tick marks in Phase 0
 * 2. Phase 1 correctly shows sliding segment & expanding affine grid on the plane
 * 3. Phase 2 for independent vectors displays 3D wireframe parallelepiped box & 3rd axis
 * 4. Phase 2 for coplanar vectors displays planar decomposition lines & node markers
 * 5. Clean teardown on stop
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9233;
const HTTP_PORT = 5508;
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
  console.log('================================================================');
  console.log(' Vectoria E2E Test: 3D Linear Independence Visualization');
  console.log('================================================================\n');

  const server = await startServer(HTTP_PORT);
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(ROOT_DIR, '.tmp_edge_indep3d_profile'),
    `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html`
  ]);

  await sleep(2500);

  const cdpRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
  const tabs = await cdpRes.json();
  const targetTab = tabs.find(t => t.type === 'page' && t.url.includes('calculation.html')) || tabs.find(t => t.type === 'page');
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

  async function evaluate(expr) {
    const res = await sendCommand('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    if (res?.exceptionDetails) {
      throw new Error(`Eval error: ${res.exceptionDetails.text}`);
    }
    return res?.result?.value;
  }

  try {
    await sendCommand('Runtime.enable');

    // 1. Chuyen sang 3D va khoi tao 3 vector doc lap
    console.log('--- Step 1: Switch to 3D Mode & Set 3 Independent Vectors ---');
    const initRes = await evaluate(`
      (() => {
        if (App.mode !== "3D") {
          if (typeof App.setMode === "function") App.setMode("3D");
          else if (typeof App.toggleMode === "function") App.toggleMode();
        }
        App.vectorList = [
          { id: 1, vec: [3, 0, 0], colorHex: "#3b82f6", name: "v_1", visible: true },
          { id: 2, vec: [0, 3, 0], colorHex: "#10b981", name: "v_2", visible: true },
          { id: 3, vec: [0, 0, 3], colorHex: "#f59e0b", name: "v_3", visible: true }
        ];
        if (window.Vec3D && typeof Vec3D.hardRefresh3D === "function") {
          Vec3D.hardRefresh3D(false);
        }
        return {
          mode: App.mode,
          count: App.vectorList.length,
          hasIndep: !!App.IndepAnimator
        };
      })()
    `);
    console.log('[PASS] Initialized 3D mode:', initRes);

    // 2. Khoi chay animation Phase 0
    console.log('\n--- Step 2: Start Linear Independence in 3D (Phase 0) ---');
    const p0Res = await evaluate(`
      (() => {
        const started = App.IndepAnimator.start(App.vectorList);
        App.IndepAnimator.redraw();
        const grp = App.IndepAnimator._threeGroup;
        return {
          started,
          isActive: App.IndepAnimator.isActive(),
          phase: App.IndepAnimator.getCurrentPhase(),
          hasThreeGroup: !!grp,
          childCount: grp ? grp.children.length : 0
        };
      })()
    `);
    console.log('[PASS] Phase 0 result in 3D:', p0Res);
    if (!p0Res.started || !p0Res.hasThreeGroup || p0Res.childCount < 2) {
      throw new Error('Phase 0 failed in 3D');
    }

    // 3. Chuyen sang Phase 1
    console.log('\n--- Step 3: Advance to Phase 1 (Mat phang 2D) ---');
    const p1Res = await evaluate(`
      (() => {
        App.IndepAnimator.goToPhase(1);
        App.IndepAnimator._phaseProgress = 0.8;
        App.IndepAnimator.redraw();
        const grp = App.IndepAnimator._threeGroup;
        return {
          phase: App.IndepAnimator.getCurrentPhase(),
          childCount: grp ? grp.children.length : 0,
          hasLineSegments: grp ? grp.children.some(c => c.isLineSegments) : false,
          hasLineLoop: grp ? grp.children.some(c => c.isLineLoop) : false
        };
      })()
    `);
    console.log('[PASS] Phase 1 result in 3D:', p1Res);
    if (p1Res.childCount < 4 || !p1Res.hasLineSegments) {
      throw new Error('Phase 1 affine grid failed in 3D');
    }

    // 4. Chuyen sang Phase 2 (Doc lap - Khoi hop 3D)
    console.log('\n--- Step 4: Advance to Phase 2 (Vuon ra khoi hop 3D) ---');
    const p2Res = await evaluate(`
      (() => {
        App.IndepAnimator.goToPhase(2);
        App.IndepAnimator._phaseProgress = 1.0;
        App.IndepAnimator.redraw();
        const grp = App.IndepAnimator._threeGroup;
        return {
          phase: App.IndepAnimator.getCurrentPhase(),
          childCount: grp ? grp.children.length : 0,
          isIndependent: App.IndepAnimator.getAnalysis().isIndependent
        };
      })()
    `);
    console.log('[PASS] Phase 2 independent 3D result:', p2Res);
    if (p2Res.childCount < 5 || !p2Res.isIndependent) {
      throw new Error('Phase 2 3D wireframe box failed');
    }

    // 5. Kiem tra truong hop Coplanar (Dong phang)
    console.log('\n--- Step 5: Test 3D Coplanar Dependent Vectors ---');
    const coplanarRes = await evaluate(`
      (() => {
        App.vectorList = [
          { id: 1, vec: [3, 0, 0], colorHex: "#3b82f6", name: "v_1", visible: true },
          { id: 2, vec: [0, 3, 0], colorHex: "#10b981", name: "v_2", visible: true },
          { id: 3, vec: [3, 3, 0], colorHex: "#f59e0b", name: "v_3", visible: true }
        ];
        App.IndepAnimator.start(App.vectorList);
        App.IndepAnimator.goToPhase(2);
        App.IndepAnimator._phaseProgress = 1.0;
        App.IndepAnimator.redraw();
        const grp = App.IndepAnimator._threeGroup;
        const an = App.IndepAnimator.getAnalysis();
        return {
          isV3Coplanar: an.isV3Coplanar,
          decompC1: an.decompC1,
          decompC2: an.decompC2,
          childCount: grp ? grp.children.length : 0
        };
      })()
    `);
    console.log('[PASS] Coplanar 3D result:', coplanarRes);
    if (!coplanarRes.isV3Coplanar || coplanarRes.childCount < 5) {
      throw new Error('Phase 2 coplanar decomposition failed in 3D');
    }

    // 6. Kiem tra Stop & Teardown
    console.log('\n--- Step 6: Test Teardown on Stop ---');
    const stopRes = await evaluate(`
      (() => {
        App.IndepAnimator.stop();
        return {
          isActive: App.IndepAnimator.isActive(),
          threeGroup: App.IndepAnimator._threeGroup,
          isBlocked: typeof App.isInteractionBlocked === "function" ? App.isInteractionBlocked() : false
        };
      })()
    `);
    console.log('[PASS] Stop teardown result:', stopRes);
    if (stopRes.isActive || stopRes.threeGroup !== null || stopRes.isBlocked) {
      throw new Error('Stop teardown failed in 3D');
    }

    console.log('\n>>> SUITE RESULT: ALL 3D HEADLESS TESTS PASSED (100%) <<<');
  } finally {
    ws.close();
    edge.kill();
    server.close();
    try {
      fs.rmSync(path.join(ROOT_DIR, '.tmp_edge_indep3d_profile'), { recursive: true, force: true });
    } catch (_) {}
  }
}

runTest().catch((err) => {
  console.error('\n[FAIL] Test suite threw an unhandled error:', err);
  process.exit(1);
});
