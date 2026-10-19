/**
 * Test script for Milestone 4: Linear Transformation Playback Engine (App.LTAnimator & Topic 5)
 * Verifies 3-step continuous animation, 2D/3D dual-rendering, Ker(T) collapse, Im(T) crystallization,
 * rank-nullity theorem, controls box, 3D off-diagonal camera framing, and solution drawer.
 */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9226;
const HTTP_PORT = 5502;
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

    await sleep(2200);

    // Get CDP WebSocket
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

    console.log('--- Step 1: Check App and LTAnimator Modules Existence ---');
    const checkModules = await evalCode(`({
        hasApp: !!window.App,
        hasLTAnimator: !!(window.App && window.App.LTAnimator),
        hasGetOrEnsure: typeof App.getOrEnsureSelectedSquareMatrix === 'function'
    })`);
    console.log('Modules check:', checkModules);
    if (!checkModules.hasApp || !checkModules.hasLTAnimator || !checkModules.hasGetOrEnsure) {
        throw new Error('App.LTAnimator or matrix helpers missing');
    }

    console.log('--- Step 2: Test 2D Linear Transformation Inspection ---');
    const inspect2D = await evalCode(`(function() {
        // Switch to linear transformation task
        const taskSelect = document.getElementById("opExtraSelect");
        if (taskSelect) {
            taskSelect.value = "topic5_linear_transformation";
            taskSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }

        // Add 2x2 singular matrix [[1, 1], [1, 1]]
        App.matrixList = [
            {
                id: "mat_test_2d",
                name: "A",
                rows: 2,
                cols: 2,
                values: [[1, 1], [1, 1]],
                visible: true
            }
        ];

        if (typeof App.refreshLTMatrixDropdown === "function") {
            App.refreshLTMatrixDropdown();
        }

        // Click inspect
        const btnInspect = document.getElementById("btnLTInspect");
        if (btnInspect) btnInspect.click();

        const resBox = document.getElementById("result_lt_info");
        const resText = resBox ? resBox.innerText : "";
        const isVisible = resBox && resBox.style.display !== "none";

        return {
            isVisible,
            hasRank: resText.includes("1 / 2"),
            hasRankNullity: resText.includes("1 + 1 = 2"),
            hasKer: resText.includes("KER(T)"),
            hasIm: resText.includes("IM(T)")
        };
    })()`);
    console.log('2D Inspection Result:', inspect2D);
    if (!inspect2D.isVisible || !inspect2D.hasRank || !inspect2D.hasRankNullity) {
        throw new Error('2D matrix inspection failed');
    }

    console.log('--- Step 3: Test LTAnimator.start() and 3-Step Controls in 2D ---');
    const anim2D = await evalCode(`(function() {
        const matItem = App.matrixList[0];
        const ok = App.LTAnimator.start(matItem);
        const controls = document.getElementById("ltAnimControls");
        const isControlsVisible = controls && controls.style.display !== "none";
        const phase0 = App.LTAnimator.getCurrentPhase();
        const active = App.LTAnimator.isActive();
        const analysis = App.LTAnimator.getAnalysis();

        return {
            ok,
            isControlsVisible,
            phase0,
            active,
            rank: analysis.rank,
            nullity: analysis.nullity,
            det: analysis.det
        };
    })()`);
    console.log('2D Animation Start:', anim2D);
    if (!anim2D.ok || !anim2D.isControlsVisible || !anim2D.active || anim2D.rank !== 1 || anim2D.nullity !== 1) {
        throw new Error('LTAnimator start failed in 2D');
    }

    // Step jumps: 0 -> 1 -> 2 -> stop
    const phaseJumps = await evalCode(`(function() {
        App.LTAnimator.goToPhase(1);
        const p1 = App.LTAnimator.getCurrentPhase();
        App.LTAnimator.goToPhase(2);
        const p2 = App.LTAnimator.getCurrentPhase();
        App.LTAnimator.togglePlayPause(); // pause
        const paused = App.LTAnimator._paused;
        App.LTAnimator.stop();
        const stopped = !App.LTAnimator.isActive();
        return { p1, p2, paused, stopped };
    })()`);
    console.log('Phase Jumps:', phaseJumps);
    if (phaseJumps.p1 !== 1 || phaseJumps.p2 !== 2 || !phaseJumps.stopped) {
        throw new Error('Phase navigation failed');
    }

    console.log('--- Step 4: Test 3D Matrix & Off-Diagonal Camera Framing ---');
    const anim3D = await evalCode(`(function() {
        // Add 3x3 rank-2 matrix
        App.matrixList = [
            {
                id: "mat_test_3d",
                name: "M3",
                rows: 3,
                cols: 3,
                values: [
                    [1, 0, 1],
                    [0, 1, 1],
                    [1, 1, 2]
                ],
                visible: true
            }
        ];

        if (typeof App.refreshLTMatrixDropdown === "function") {
            App.refreshLTMatrixDropdown();
        }

        const matItem = App.matrixList[0];
        const ok = App.LTAnimator.start(matItem);
        const mode = App.mode;
        const analysis = App.LTAnimator.getAnalysis();

        let isOffDiag = false;
        let camPos = null;
        if (window.Vec3D && Vec3D._camera) {
            camPos = {
                x: Vec3D._camera.position.x,
                y: Vec3D._camera.position.y,
                z: Vec3D._camera.position.z
            };
            isOffDiag = (camPos.x !== camPos.y) && (camPos.y !== camPos.z);
        }

        App.LTAnimator.stop();
        return {
            ok,
            mode,
            rank: analysis.rank,
            nullity: analysis.nullity,
            isOffDiag,
            camPos
        };
    })()`);
    console.log('3D Animation and Camera Framing:', anim3D);
    if (!anim3D.ok || anim3D.mode !== '3D' || anim3D.rank !== 2 || anim3D.nullity !== 1 || !anim3D.isOffDiag) {
        throw new Error('3D matrix animation or off-diagonal camera framing failed');
    }

    console.log('--- Step 5: Test Academic Solution Drawer (2-Tab Mode) ---');
    const solutionDrawer = await evalCode(`(function() {
        const btnSol = document.getElementById("btnLTSolution");
        const selData = App.getOrEnsureSelectedSquareMatrix ? App.getOrEnsureSelectedSquareMatrix("ltMatrixSelect") : null;
        console.log("selData:", selData);
        if (btnSol) btnSol.click();

        const overlay = document.getElementById("solutionOverlay");
        const isOpen = overlay && overlay.classList.contains("is-open");
        const body = document.getElementById("solutionBody");
        const bodyHtml = body ? body.innerHTML : "";
        const bodyText = body ? body.textContent : "";

        // Check tabs
        const tabMat = document.getElementById("solMethodMat");
        const tabEq = document.getElementById("solMethodEq");

        const tab1Text = tabMat ? tabMat.textContent : "";
        const tab2Text = tabEq ? tabEq.textContent : "";

        // Switch to Tab 2
        if (tabEq) tabEq.click();
        const bodyTextTab2 = body ? body.textContent : "";

        // Close overlay
        const btnClose = document.getElementById("btnCloseSolution");
        if (btnClose) btnClose.click();
        const isClosed = !overlay.classList.contains("is-open");

        return {
            isOpen,
            hasRREF: bodyText.includes("RREF") || bodyText.includes("Gauss") || bodyText.includes("bậc thang"),
            tab1Text,
            tab2Text,
            hasRankNullityTheorem: bodyTextTab2.includes("Rank - Nullity") || bodyTextTab2.includes("bảo toàn số chiều") || bodyTextTab2.includes("Định lý"),
            isClosed
        };
    })()`);
    console.log('Solution Drawer Test:', solutionDrawer);

    if (!solutionDrawer.isOpen || !solutionDrawer.hasRREF || !solutionDrawer.hasRankNullityTheorem || !solutionDrawer.isClosed) {
        throw new Error('Academic solution drawer verification failed');
    }

    console.log('--- Step 6: Verify Zero Console Errors ---');
    console.log('Captured console errors:', consoleErrors);
    if (consoleErrors.length > 0) {
        throw new Error('Console errors encountered: ' + consoleErrors.join(', '));
    }

    console.log('>>> ALL MILESTONE 4 ANIMATOR & TOPIC 5 TESTS PASSED! <<<');
    ws.close();
    edge.kill();
    server.close();
}

runTest().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
});
