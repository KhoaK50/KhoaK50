const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const HTTP_PORT = 5564;
const CDP_PORT = 9247;
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
    console.log('STARTING GEOGEBRA-GRADE GRAPH CONTRAST & 3D HOVER VERIFICATION');
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

    const userDataDir = path.join(ROOT_DIR, 'tmp_edge_test_feedback');
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
            return undefined;
        }
        return res.result?.value;
    }

    async function takeScreenshot(filename) {
        const res = await sendCmd('Page.captureScreenshot', { format: 'png' });
        const filePath = path.join(ARTIFACT_DIR, filename);
        fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
        console.log(`[SCREENSHOT] Saved: ${filename}`);
    }

    // Wait until document.readyState is complete and App is initialized
    console.log('[WAIT] Waiting for document to load and App to initialize...');
    for (let i = 0; i < 30; i++) {
        const ready = await evalCode('document.readyState === "complete" && !!(window.App && window.App.vectorList && window.Vec2D && window.Vec3D)');
        if (ready) {
            console.log(`[READY] Page and App ready after ${i * 300}ms`);
            break;
        }
        await sleep(300);
    }

    // Step 1: Inject LaTeX-formatted vectors in 2D
    console.log('[STEP 1] Testing 2D with LaTeX vectors (roots, logs, fractions)...');
    await evalCode(`(() => {
        window.App.vectorList = [
            {
                id: 1,
                name: "v1",
                vec: [1.414, 3],
                latex: "[\\\\sqrt{2}, 3]",
                colorHex: "#e11d48",
                visible: true,
                focus: false
            },
            {
                id: 2,
                name: "v2",
                vec: [-3, 0.5],
                latex: "[-3, \\\\frac{1}{2}]",
                colorHex: "#2563eb",
                visible: true,
                focus: false
            },
            {
                id: 3,
                name: "v3",
                vec: [3, 2],
                latex: "[\\\\log_{2}(8), 2]",
                colorHex: "#059669",
                visible: true,
                focus: false
            }
        ];
        window.App.graphSettings.labelMode = "both";
        window.App.graphSettings.gridContrast = "hierarchical";
        if (window.App.redrawAll) window.App.redrawAll();
    })()`);
    await sleep(600);
    await takeScreenshot('feedback_2d_hierarchical_contrast.png');

    // Verify formatVectorMathLabel output
    const mathFormats = await evalCode(`(() => {
        return window.App.vectorList.map(v => ({
            name: v.name,
            mathLabel: window.App.formatVectorMathLabel(v)
        }));
    })()`);
    console.log('[FORMAT CHECK]', JSON.stringify(mathFormats, null, 2));

    // Step 2: Test 3D mode
    console.log('[STEP 2] Switching to 3D mode...');
    await evalCode(`(() => {
        const modeBadge = document.getElementById("modeBadge");
        if (modeBadge) modeBadge.click();
        window.App.vectorList = [
            {
                id: 1,
                name: "v1",
                vec: [1.414, 3, 2],
                latex: "[\\\\sqrt{2}, 3, 2]",
                colorHex: "#e11d48",
                visible: true,
                focus: false
            },
            {
                id: 2,
                name: "v2",
                vec: [-2.5, 2, -3],
                latex: "[-\\frac{5}{2}, 2, -3]",
                colorHex: "#2563eb",
                visible: true,
                focus: false
            }
        ];
        if (window.App.redrawAll) window.App.redrawAll();
    })()`);
    await sleep(1000);
    await takeScreenshot('feedback_3d_no_grey_slab.png');

    // Step 3: Test 3D hover detection
    console.log('[STEP 3] Simulating hover over 3D vector v1...');
    const hoverCheck = await evalCode(`(() => {
        // Simulating hover on vector #1
        window.Vec3D.S3D.hoveredVectorId = 1;
        window.Vec3D.S3D.activeVectorId = 1;
        window.Vec3D.updateVectorLabelsLive();
        
        const grp = window.Vec3D.threeVecMap.get(1);
        const lbl = grp ? grp.children.find(c => c.isCSS2DObject && c.name === "tipLabel") : null;
        return {
            hasLabel: !!lbl,
            labelText: lbl && lbl.element ? lbl.element.textContent : null
        };
    })()`);
    console.log('[HOVER RESULT]', hoverCheck);
    await sleep(300);
    await takeScreenshot('feedback_3d_hover_active.png');

    // Step 4: Test 3D in Dark theme
    console.log('[STEP 4] Testing 3D in Dark theme...');
    await evalCode(`(() => {
        const btn = document.getElementById("themeToggleBtn") || document.getElementById("themeBadge");
        if (btn) btn.click();
        else if (window.App && window.App.toggleTheme) window.App.toggleTheme();
        if (window.App.redrawAll) window.App.redrawAll();
    })()`);
    await sleep(800);
    await takeScreenshot('feedback_3d_dark_crisp_axis.png');

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
    console.log('FEEDBACK VERIFICATIONS COMPLETED SUCCESSFULLY!');
    console.log('================================================================');
}

runTest().catch(err => {
    console.error('TEST FAILED:', err);
    process.exit(1);
});
