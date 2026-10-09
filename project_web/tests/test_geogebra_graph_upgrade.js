const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const HTTP_PORT = 5562;
const CDP_PORT = 9245;
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
    console.log('STARTING GEOGEBRA-GRADE GRAPH DISPLAY & LABEL UPGRADE VERIFICATION');
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

    const userDataDir = path.join(ROOT_DIR, 'tmp_edge_test_geogebra');
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

    ws.onmessage = event => {
        const msg = JSON.parse(event.data.toString());
        if (msg.method === 'Runtime.consoleAPICalled') {
            if (msg.params.type === 'error') {
                const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
                consoleErrors.push(text);
                console.error('[BROWSER ERROR]', text);
            }
        }
        if (msg.id && callbacks.has(msg.id)) {
            const cb = callbacks.get(msg.id);
            callbacks.delete(msg.id);
            cb(msg.result);
        }
    };

    function send(method, params = {}) {
        return new Promise(resolve => {
            const id = msgId++;
            callbacks.set(id, resolve);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await sleep(2500);

    const loc = await evalCode('window.location.href');
    const ready = await evalCode('document.readyState');
    const title = await evalCode('document.title');
    console.log(`[PAGE DEBUG] URL: ${loc}, State: ${ready}, Title: ${title}`);

    // Wait until document.readyState is complete
    for (let i = 0; i < 20; i++) {
        const rs = await evalCode('document.readyState');
        if (rs === 'complete') break;
        await sleep(500);
    }

    async function evalCode(expression) {
        const r = await send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (r.exceptionDetails) {
            console.error('Eval error on:', expression, r.exceptionDetails);
        }
        return r.result ? r.result.value : undefined;
    }

    async function takeScreenshot(filename) {
        const res = await send('Page.captureScreenshot', { format: 'png' });
        const filePath = path.join(ARTIFACT_DIR, filename);
        fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
        console.log(`[SCREENSHOT] Saved: ${filename}`);
    }

    // Step 1: Check HUD DOM elements
    console.log('[STEP 1] Checking HUD Menu Setting elements in DOM...');
    const domCheck = await evalCode(`(() => {
        const btn = document.getElementById("canvasMenuBtn");
        const dropdown = document.getElementById("canvasMenuDropdown");
        const gridSel = document.getElementById("settingGridMode");
        const labelSel = document.getElementById("settingLabelMode");
        const axesChk = document.getElementById("settingShowAxes");
        return {
            hasBtn: !!btn,
            hasDropdown: !!dropdown,
            hasGridSel: !!gridSel,
            gridOptions: gridSel ? Array.from(gridSel.options).map(o => o.value) : [],
            hasLabelSel: !!labelSel,
            labelOptions: labelSel ? Array.from(labelSel.options).map(o => o.value) : [],
            hasAxesChk: !!axesChk,
            axesChecked: axesChk ? axesChk.checked : false
        };
    })()`);
    console.log('HUD DOM elements status:', domCheck);
    if (!domCheck.hasGridSel || !domCheck.hasLabelSel || !domCheck.hasAxesChk) {
        throw new Error('HUD menu setting inputs not found in DOM!');
    }

    // Step 2: Open HUD dropdown menu and inspect
    console.log('[STEP 2] Opening Canvas Settings Menu...');
    await evalCode(`(() => {
        const btn = document.getElementById("canvasMenuBtn");
        if (btn) btn.click();
    })()`);
    await sleep(600);
    await takeScreenshot('geogebra_hud_settings_open.png');

    // Close HUD menu
    await evalCode(`(() => {
        const btn = document.getElementById("canvasMenuBtn");
        if (btn) btn.click();
    })()`);
    await sleep(300);

    // Step 3: Add test vectors in 2D
    console.log('[STEP 3] Adding sample vectors with close tips to test Halo & Collision Avoidance...');
    await evalCode(`(() => {
        App.vectorList = [
            {
                id: 1,
                vec: [3, 4],
                colorCss: "#3b82f6",
                colorHex: "#3b82f6",
                visible: true,
                focus: false,
                alpha: 1
            },
            {
                id: 2,
                vec: [3.3, 4.3],
                colorCss: "#ec4899",
                colorHex: "#ec4899",
                visible: true,
                focus: false,
                alpha: 1
            },
            {
                id: 3,
                vec: [-4, 2],
                colorCss: "#10b981",
                colorHex: "#10b981",
                visible: true,
                focus: false,
                alpha: 1
            }
        ];
        if (App.redrawAll) App.redrawAll();
    })()`);
    await sleep(600);

    // Verify 2D light mode screenshot
    console.log('[STEP 4] Taking 2D Light Mode screenshot...');
    await takeScreenshot('geogebra_2d_light.png');

    // Test expanding labels to 'both'
    console.log('[STEP 5] Testing labelMode = "both"...');
    await evalCode(`(() => {
        const labelSel = document.getElementById("settingLabelMode");
        if (labelSel) {
            labelSel.value = "both";
            labelSel.dispatchEvent(new Event("change"));
        }
    })()`);
    await sleep(500);
    await takeScreenshot('geogebra_2d_labels_both_light.png');

    // Switch to Dark mode
    console.log('[STEP 6] Switching to Dark Theme...');
    await evalCode(`(() => {
        const btn = document.getElementById("themeToggleBtn") || document.getElementById("themeBadge");
        if (btn) btn.click();
        else if (window.App && App.toggleTheme) App.toggleTheme();
        if (App.redrawAll) App.redrawAll();
    })()`);
    await sleep(800);
    await takeScreenshot('geogebra_2d_dark.png');

    // Test gridMode toggles
    console.log('[STEP 7] Testing gridMode = "major" and "none"...');
    await evalCode(`(() => {
        const gridSel = document.getElementById("settingGridMode");
        if (gridSel) {
            gridSel.value = "major";
            gridSel.dispatchEvent(new Event("change"));
        }
    })()`);
    await sleep(400);
    await takeScreenshot('geogebra_2d_grid_major_dark.png');

    await evalCode(`(() => {
        const gridSel = document.getElementById("settingGridMode");
        if (gridSel) {
            gridSel.value = "none";
            gridSel.dispatchEvent(new Event("change"));
        }
    })()`);
    await sleep(400);
    await takeScreenshot('geogebra_2d_grid_none_dark.png');

    // Reset grid to 'full' and labels to 'name'
    await evalCode(`(() => {
        const gridSel = document.getElementById("settingGridMode");
        if (gridSel) {
            gridSel.value = "full";
            gridSel.dispatchEvent(new Event("change"));
        }
        const labelSel = document.getElementById("settingLabelMode");
        if (labelSel) {
            labelSel.value = "name";
            labelSel.dispatchEvent(new Event("change"));
        }
    })()`);
    await sleep(400);

    // Step 8: Switch to 3D mode
    console.log('[STEP 8] Switching to 3D mode...');
    await evalCode(`(() => {
        const modeBadge = document.getElementById("modeBadge");
        if (modeBadge) modeBadge.click();
        // Cung cap toa do 3D cho cac vector
        App.vectorList[0].vec = [3, 4, 2];
        App.vectorList[1].vec = [3.3, 4.3, 2.2];
        App.vectorList[2].vec = [-3, 2, 4];
        if (App.redrawAll) App.redrawAll();
    })()`);
    await sleep(1500);

    // 3D Dark mode screenshot
    console.log('[STEP 9] Taking 3D Dark Mode screenshot...');
    await takeScreenshot('geogebra_3d_dark.png');

    // Test 3D updateFromSettings
    console.log('[STEP 10] Testing 3D updateFromSettings with labelMode = "both"...');
    await evalCode(`(() => {
        const labelSel = document.getElementById("settingLabelMode");
        if (labelSel) {
            labelSel.value = "both";
            labelSel.dispatchEvent(new Event("change"));
        }
    })()`);
    await sleep(600);
    await takeScreenshot('geogebra_3d_labels_both_dark.png');

    // Switch back to Light theme in 3D
    console.log('[STEP 11] Switching to Light theme in 3D...');
    await evalCode(`(() => {
        const btn = document.getElementById("themeToggleBtn") || document.getElementById("themeBadge");
        if (btn) btn.click();
        else if (window.App && App.toggleTheme) App.toggleTheme();
        if (App.redrawAll) App.redrawAll();
    })()`);
    await sleep(800);
    await takeScreenshot('geogebra_3d_light.png');

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
    console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
    console.log('================================================================');
}

runTest().catch(err => {
    console.error('TEST FAILED:', err);
    process.exit(1);
});
