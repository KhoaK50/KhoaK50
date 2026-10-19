/**
 * Test script for Milestone 2: IndepAnimator & RankAnimator
 * Verifies 3-step continuous animation, 2D/3D hooks, controls box, and off-diagonal camera.
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9225;
const HTTP_PORT = 5501;
const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon'
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
    console.log('[TEST] Starting static server...');
    const server = await startServer(HTTP_PORT);

    console.log('[TEST] Launching Edge headless...');
    const edge = spawn(EDGE_PATH, [
        `--remote-debugging-port=${CDP_PORT}`,
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html`
    ]);

    await sleep(2000);

    // Get CDP WebSocket
    const cdpRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
    const tabs = await cdpRes.json();
    const targetTab = tabs.find(t => t.url.includes('calculation.html'));
    if (!targetTab) throw new Error('calculation.html tab not found in CDP');

    const WS = typeof WebSocket !== 'undefined' ? WebSocket : global.WebSocket;
    const ws = new WS(targetTab.webSocketDebuggerUrl);

    let idSeq = 1;
    const callbacks = new Map();

    ws.addEventListener('message', (event) => {
        const msg = JSON.parse(event.data);
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
        return ret?.result?.value;
    }

    console.log('--- Step 1: Check App and Animator Modules Existence ---');
    const checkModules = await evalCode(`({
        hasApp: !!window.App,
        hasIndepAnimator: !!(window.App && window.App.IndepAnimator),
        hasRankAnimator: !!(window.App && window.App.RankAnimator)
    })`);
    console.log('Modules:', checkModules);
    if (!checkModules.hasIndepAnimator || !checkModules.hasRankAnimator) {
        throw new Error('Animators not loaded on window.App');
    }

    console.log('--- Step 2: Test IndepAnimator.start() and UI Controls ---');
    const indepTest = await evalCode(`(function() {
        App.vectorList = [
            { id: 1, vec: [1, 2], name: "v1", visible: true },
            { id: 2, vec: [2, 4], name: "v2", visible: true }
        ];
        const ok = App.IndepAnimator.start(App.vectorList);
        const controls = document.getElementById("indepAnimControls");
        const isControlsVisible = controls && controls.style.display !== "none";
        const phase0 = App.IndepAnimator.getCurrentPhase();
        const active = App.IndepAnimator.isActive();
        return { ok, isControlsVisible, phase0, active };
    })()`);
    console.log('IndepAnimator start:', indepTest);
    if (!indepTest.ok || !indepTest.isControlsVisible || !indepTest.active) {
        throw new Error('IndepAnimator start failed');
    }

    // Step jumps
    const indepPillJump = await evalCode(`(function() {
        App.IndepAnimator.goToPhase(1);
        const phase1 = App.IndepAnimator.getCurrentPhase();
        App.IndepAnimator.goToPhase(2);
        const phase2 = App.IndepAnimator.getCurrentPhase();
        App.IndepAnimator.stop();
        const stopped = !App.IndepAnimator.isActive();
        return { phase1, phase2, stopped };
    })()`);
    console.log('IndepAnimator phase jumps & stop:', indepPillJump);
    if (indepPillJump.phase1 !== 1 || indepPillJump.phase2 !== 2 || !indepPillJump.stopped) {
        throw new Error('IndepAnimator phase navigation failed');
    }

    console.log('--- Step 3: Test RankAnimator.start() and UI Controls ---');
    const rankTest = await evalCode(`(function() {
        App.vectorList = [
            { id: 1, vec: [1, 2], name: "v1", visible: true },
            { id: 2, vec: [2, 4], name: "v2", visible: true }
        ];
        const ok = App.RankAnimator.start(App.vectorList);
        const controls = document.getElementById("rankAnimControls");
        const isControlsVisible = controls && controls.style.display !== "none";
        const phase0 = App.RankAnimator.getCurrentPhase();
        const active = App.RankAnimator.isActive();
        const analysis = App.RankAnimator.getGaussData();
        return { ok, isControlsVisible, phase0, active, rank: analysis ? analysis.rank : null };
    })()`);
    console.log('RankAnimator start:', rankTest);
    if (!rankTest.ok || !rankTest.isControlsVisible || !rankTest.active || rankTest.rank !== 1) {
        throw new Error('RankAnimator start or rank analysis failed');
    }

    const rankPillJump = await evalCode(`(function() {
        App.RankAnimator.goToPhase(1);
        const phase1 = App.RankAnimator.getCurrentPhase();
        App.RankAnimator.goToPhase(2);
        const phase2 = App.RankAnimator.getCurrentPhase();
        App.RankAnimator.stop();
        const stopped = !App.RankAnimator.isActive();
        return { phase1, phase2, stopped };
    })()`);
    console.log('RankAnimator phase jumps & stop:', rankPillJump);
    if (rankPillJump.phase1 !== 1 || rankPillJump.phase2 !== 2 || !rankPillJump.stopped) {
        throw new Error('RankAnimator phase navigation failed');
    }

    console.log('--- Step 4: Test 3D Off-Diagonal Camera Framing ---');
    const camTest = await evalCode(`(function() {
        if (!window.Vec3D || !Vec3D._camera) return { skipped: true };
        App.mode = "3D";
        App.vectorList = [
            { id: 1, vec: [1, 0, 0], name: "v1", visible: true },
            { id: 2, vec: [0, 1, 0], name: "v2", visible: true },
            { id: 3, vec: [0, 0, 1], name: "v3", visible: true }
        ];
        App.IndepAnimator.start(App.vectorList);
        const camPos = { x: Vec3D._camera.position.x, y: Vec3D._camera.position.y, z: Vec3D._camera.position.z };
        const isOffDiag = (camPos.x !== camPos.y) && (camPos.y !== camPos.z);
        App.IndepAnimator.stop();
        return { camPos, isOffDiag };
    })()`);
    console.log('3D camera framing test:', camTest);
    if (!camTest.skipped && !camTest.isOffDiag) {
        throw new Error('3D camera is not off-diagonal');
    }

    console.log('>>> ALL ANIMATOR TESTS PASSED SUCCESSFULLY! <<<');
    ws.close();
    edge.kill();
    server.close();
}

runTest().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
});
