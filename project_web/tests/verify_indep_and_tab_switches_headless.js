/**
 * E2E Verification Test:
 * 1. Independent vs Dependent vector color differentiation (#10b981 vs #f59e0b)
 * 2. Vector drag interaction locked while animation is running
 * 3. Switching tabs or switching topics stops any active animation
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9231;
const HTTP_PORT = 5506;
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
  console.log(' Vectoria E2E Test: Linear Independence & Lifecycle Guards');
  console.log('================================================================\n');

  const server = await startServer(HTTP_PORT);
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(ROOT_DIR, '.tmp_edge_indep_profile'),
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

  async function evalCode(expression) {
    const ret = await sendCommand('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (ret?.exceptionDetails) {
      throw new Error('Eval exception: ' + JSON.stringify(ret.exceptionDetails));
    }
    return ret?.result?.value;
  }

  await sendCommand('Runtime.enable');

  // Wait for App and Animators to be fully loaded
  for (let i = 0; i < 30; i++) {
    const ready = await evalCode('typeof window.App !== "undefined" && typeof window.App.IndepAnimator !== "undefined"');
    if (ready) break;
    await sleep(200);
  }

  try {
    // 1. Setup 3 vectors in 2D: v1(1, 0), v2(0, 1), v3(2, 3)
    console.log('--- Step 1: Initialize 2D Vectors & Start Independence Animation ---');
    const initRes = await evalCode(`(function() {
      App.vectorList = [
        { id: 1, vec: [1, 0], visible: true, alpha: 1.0, colorCss: "#38bdf8", colorHex: "#38bdf8" },
        { id: 2, vec: [0, 1], visible: true, alpha: 1.0, colorCss: "#a855f7", colorHex: "#a855f7" },
        { id: 3, vec: [2, 3], visible: true, alpha: 1.0, colorCss: "#ec4899", colorHex: "#ec4899" }
      ];
      if (App.redrawAll) App.redrawAll();

      const taskSelect = document.getElementById("opExtraSelect");
      if (taskSelect) {
        taskSelect.value = "linear_independence";
        taskSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }

      const started = App.IndepAnimator.start(App.vectorList);
      return {
        started,
        isActive: App.IndepAnimator.isActive(),
        isBlocked: App.isInteractionBlocked(),
        isAnimating: App.isAnimating
      };
    })()`);
    console.log('[PASS] Animation started:', initRes);
    if (!initRes.started || !initRes.isActive || !initRes.isBlocked || !initRes.isAnimating) {
      throw new Error('Animation failed to start or interaction is not blocked');
    }

    // 2. Check Vector Colors across phases
    console.log('\n--- Step 2: Verify Vector Color Differentiation ---');
    const colorPhase2 = await evalCode(`(function() {
      App.IndepAnimator.goToPhase(2);
      return {
        v1_color: App.vectorList[0]._indepColorCss,
        v2_color: App.vectorList[1]._indepColorCss,
        v3_color: App.vectorList[2]._indepColorCss
      };
    })()`);
    console.log('[PASS] Vector Colors at Phase 2 (3 vectors in 2D):', colorPhase2);
    if (colorPhase2.v1_color !== '#10b981' || colorPhase2.v2_color !== '#10b981' || colorPhase2.v3_color !== '#f59e0b') {
      throw new Error(`Color mismatch: expected v1=#10b981, v2=#10b981, v3=#f59e0b, got: ${JSON.stringify(colorPhase2)}`);
    }

    // 3. Verify Drag Vector is Blocked
    console.log('\n--- Step 3: Verify Vector Dragging is Blocked During Animation ---');
    const dragAttempt = await evalCode(`(function() {
      const canvas = document.getElementById("canvas2d");
      const rect = canvas.getBoundingClientRect();
      const pointerDown = new PointerEvent("pointerdown", {
        clientX: rect.left + 500,
        clientY: rect.top + 400,
        pointerId: 1,
        bubbles: true
      });
      canvas.dispatchEvent(pointerDown);

      return {
        draggedVectorId: Vec2D?.S2D?.draggedVectorId,
        cursor: canvas.style.cursor,
        isBlocked: App.isInteractionBlocked()
      };
    })()`);
    console.log('[PASS] Drag Attempt Result:', dragAttempt);
    if (dragAttempt.draggedVectorId !== null && dragAttempt.draggedVectorId !== undefined) {
      throw new Error('Vector was dragged while animation was active!');
    }

    // 4. Verify Tab Switch Stops Animation
    console.log('\n--- Step 4: Verify Sidebar Tab Switch Stops Animation ---');
    const tabSwitchRes = await evalCode(`(function() {
      // First switch to Tasks Tab (index 1) so we are on Tasks tab
      const tabs = document.querySelectorAll(".sidebar-tabs .tab-btn");
      const initialTabCount = tabs.length;
      if (tabs[1]) tabs[1].click();

      // Ensure Indep animation is active on Tasks tab
      App.IndepAnimator.start(App.vectorList);
      const activeOnTasks = App.IndepAnimator.isActive();

      // Now switch away from Tasks Tab to Objects Tab (index 0)
      if (tabs[0]) tabs[0].click();

      const indepControls = document.getElementById("indepAnimControls");
      return {
        initialTabCount,
        activeOnTasks,
        isActive: App.IndepAnimator.isActive(),
        controlsDisplay: indepControls ? indepControls.style.display : null,
        isBlocked: App.isInteractionBlocked()
      };
    })()`);
    console.log('[PASS] After switching to Objects Tab:', tabSwitchRes);
    if (tabSwitchRes.isActive || tabSwitchRes.controlsDisplay !== 'none' || tabSwitchRes.isBlocked) {
      throw new Error('Animation did not stop when leaving Tasks tab!');
    }

    // 5. Verify Topic Switch in Dropdown Stops Animation
    console.log('\n--- Step 5: Verify Problem/Topic Switch Stops Animation ---');
    const topicSwitchRes = await evalCode(`(function() {
      // Go back to Tasks Tab
      const tabs = document.querySelectorAll(".sidebar-tabs .tab-btn");
      if (tabs[1]) tabs[1].click();

      // Restart Indep Animation
      App.IndepAnimator.start(App.vectorList);
      const wasActive = App.IndepAnimator.isActive();

      // Switch to Rank task
      const taskSelect = document.getElementById("opExtraSelect");
      if (taskSelect) {
        taskSelect.value = "rank";
        taskSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }

      const indepControls = document.getElementById("indepAnimControls");
      return {
        wasActive,
        isStillActive: App.IndepAnimator.isActive(),
        controlsDisplay: indepControls ? indepControls.style.display : null
      };
    })()`);
    console.log('[PASS] After switching problem to Rank:', topicSwitchRes);
    if (topicSwitchRes.isStillActive || topicSwitchRes.controlsDisplay !== 'none') {
      throw new Error('Indep animation did not stop when switching problem to Rank!');
    }

    if (consoleErrors.length > 0) {
      throw new Error('Console errors encountered: ' + consoleErrors.join('; '));
    }

    console.log('\n>>> SUITE RESULT: ALL 5 E2E TESTS PASSED (100%) <<<');
  } finally {
    edge.kill();
    server.close();
  }
}

runTest().catch(err => {
  console.error('\n[FAIL] ' + err.stack);
  process.exit(1);
});
