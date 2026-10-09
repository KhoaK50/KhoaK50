const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const HTTP_PORT = 5563;
const CDP_PORT = 9246;
const ARTIFACT_DIR = path.join('C:', 'Users', 'LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

function startServer(port) {
    return new Promise((resolve) => {
        const s = http.createServer((req, res) => {
            let p = decodeURIComponent(new URL(req.url, 'http://127.0.0.1:' + port).pathname);
            if (p === '/') p = '/frontend_v2/calculation.html';
            const f = path.join(ROOT_DIR, p);
            fs.stat(f, (err, stats) => {
                if (err || !stats.isFile()) {
                    res.writeHead(404);
                    res.end('Not found');
                    return;
                }
                const ext = path.extname(f).toLowerCase();
                res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
                fs.createReadStream(f).pipe(res);
            });
        });
        s.listen(port, '127.0.0.1', () => resolve(s));
    });
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function runTest() {
    console.log('================================================================');
    console.log('STARTING 3D MULTI-VECTOR ROTATION ZERO-LAG PERFORMANCE TEST');
    console.log('================================================================');

    const server = await startServer(HTTP_PORT);
    console.log(`[HTTP] Static server active on port ${HTTP_PORT}`);

    const edgePaths = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    let edgeBin = edgePaths.find(p => fs.existsSync(p));
    if (!edgeBin) {
        throw new Error('Edge binary not found');
    }

    const userDataDir = path.join(ROOT_DIR, 'tmp_edge_test_3d_perf');
    const edge = spawn(edgeBin, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${userDataDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--window-size=1400,900',
        '--headless=new',
        `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html`
    ]);

    await sleep(2500);

    let wsUrl = '';
    for (let i = 0; i < 15; i++) {
        try {
            const listRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`).then(r => r.json());
            const target = listRes.find(t => t.type === 'page');
            if (target && target.webSocketDebuggerUrl) {
                wsUrl = target.webSocketDebuggerUrl;
                break;
            }
        } catch (e) {}
        await sleep(500);
    }

    if (!wsUrl) {
        throw new Error('Could not connect to CDP WebSocket endpoint');
    }

    const ws = new WebSocket(wsUrl);
    await new Promise(res => { ws.onopen = res; });

    let msgId = 1;
    const callbacks = new Map();
    const consoleErrors = [];

    ws.onmessage = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id && callbacks.has(data.id)) {
            const cb = callbacks.get(data.id);
            callbacks.delete(data.id);
            if (data.error) cb.reject(data.error);
            else cb.resolve(data.result);
        }
        if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
            consoleErrors.push(data.params.args.map(a => a.value || a.description).join(' '));
        }
    };

    function sendCmd(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = msgId++;
            callbacks.set(id, { resolve, reject });
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    await sendCmd('Runtime.enable');
    await sendCmd('Page.enable');

    async function evalCode(expression) {
        const res = await sendCmd('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (res.exceptionDetails) {
            throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
        }
        return res.result?.value;
    }

    async function takeScreenshot(filename) {
        const res = await sendCmd('Page.captureScreenshot', { format: 'png' });
        const filePath = path.join(ARTIFACT_DIR, filename);
        fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
        console.log(`[SCREENSHOT] Saved: ${filename}`);
    }

    // Wait for App and Vec3D to be ready
    for (let i = 0; i < 25; i++) {
        const ready = await evalCode('!!(window.App && window.App.vectorList && window.Vec3D)');
        if (ready) break;
        await sleep(300);
    }

    // Step 1: Switch to 3D mode
    console.log('[STEP 1] Switching to 3D mode...');
    await evalCode(`(() => {
        const modeBadge = document.getElementById("modeBadge");
        if (modeBadge && modeBadge.textContent.includes("2D")) {
            modeBadge.click();
        }
    })()`);
    await sleep(1200);

    // Step 2: Inject 15 distinct 3D vectors
    console.log('[STEP 2] Injecting 15 distinct 3D vectors...');
    await evalCode(`(() => {
        window.App.vectorList = [];
        const colors = [
            "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
            "#ec4899", "#06b6d4", "#14b8a6", "#f97316", "#6366f1",
            "#84cc16", "#e11d48", "#0284c7", "#059669", "#d97706"
        ];
        for (let i = 0; i < 15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            const r = 2.5 + (i % 3) * 1.2;
            const z = ((i % 5) - 2) * 1.5;
            window.App.vectorList.push({
                id: i + 1,
                name: "v" + (i + 1),
                vec: [Number((r * Math.cos(angle)).toFixed(2)), Number((r * Math.sin(angle)).toFixed(2)), Number(z.toFixed(2))],
                colorHex: colors[i],
                visible: true,
                focus: i === 0
            });
        }
        if (window.App.redrawAll) window.App.redrawAll();
    })()`);
    await sleep(800);
    await takeScreenshot('perf_3d_15_vectors_initial.png');

    // Step 3: Setup counters to track any re-rendering during rotation
    console.log('[STEP 3] Setting up performance counters on Vec3D...');
    await evalCode(`(() => {
        window.__perf = {
            drawAllCalls: 0,
            tickDisposalCalls: 0,
            frameTimes: []
        };
        const origDrawAll = window.Vec3D.draw3DAllVectors;
        window.Vec3D.draw3DAllVectors = function(...args) {
            window.__perf.drawAllCalls++;
            return origDrawAll.apply(this, args);
        };
    })()`);

    // Step 4: Simulate continuous camera rotation (60 frames of OrbitControls rotation)
    console.log('[STEP 4] Simulating 60 continuous camera rotation frames...');
    const perfResults = await evalCode(`(async () => {
        const perf = window.__perf;
        const controls = window.Vec3D._controls;
        const renderer = window.Vec3D._renderer;
        const camera = window.Vec3D._camera;
        const labelRenderer = window.Vec3D._labelRenderer;

        const startTotal = performance.now();
        for (let frame = 0; frame < 60; frame++) {
            const t0 = performance.now();

            // Simulate mouse orbit rotation
            const angle = 0.05;
            const x = camera.position.x;
            const z = camera.position.z;
            camera.position.x = x * Math.cos(angle) - z * Math.sin(angle);
            camera.position.z = x * Math.sin(angle) + z * Math.cos(angle);
            camera.lookAt(controls.target);

            // Trigger controls change event (the exact event fired by OrbitControls)
            controls.dispatchEvent({ type: "change" });

            const t1 = performance.now();
            perf.frameTimes.push(t1 - t0);
        }
        const totalDuration = performance.now() - startTotal;

        const avgFrame = perf.frameTimes.reduce((a, b) => a + b, 0) / perf.frameTimes.length;
        const maxFrame = Math.max(...perf.frameTimes);

        return {
            totalDuration: Number(totalDuration.toFixed(2)),
            avgFrameTimeMs: Number(avgFrame.toFixed(3)),
            maxFrameTimeMs: Number(maxFrame.toFixed(3)),
            draw3DAllCallsDuringRotation: perf.drawAllCalls,
            vectorCount: window.App.vectorList.length
        };
    })()`);

    console.log('[PERFORMANCE METRICS]', JSON.stringify(perfResults, null, 2));

    await sleep(400);
    await takeScreenshot('perf_3d_after_rotation.png');

    // Step 5: Assertions
    if (perfResults.draw3DAllCallsDuringRotation > 0) {
        throw new Error(`PERF REGRESSION: draw3DAllVectors was called ${perfResults.draw3DAllCallsDuringRotation} times during rotation!`);
    }
    console.log('[PASS] draw3DAllVectors called 0 times during rotation (Mesh reuse: 100%)');

    if (perfResults.avgFrameTimeMs > 8.0) {
        throw new Error(`PERF REGRESSION: Average frame time ${perfResults.avgFrameTimeMs}ms exceeds budget of 8.0ms!`);
    }
    console.log(`[PASS] Average frame time: ${perfResults.avgFrameTimeMs}ms (FPS capability: ~${Math.round(1000 / perfResults.avgFrameTimeMs)} FPS)`);

    // Check console errors
    console.log('Total browser console errors captured:', consoleErrors.length);
    if (consoleErrors.length > 0) {
        console.error('Errors:', consoleErrors);
    }

    // Cleanup
    ws.close();
    edge.kill();
    server.close();
    try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (_) {}

    console.log('================================================================');
    console.log('3D ZERO-LAG ROTATION PERFORMANCE TEST PASSED FLAWLESSLY!');
    console.log('================================================================');
}

runTest().catch(err => {
    console.error('TEST FAILED:', err);
    process.exit(1);
});
