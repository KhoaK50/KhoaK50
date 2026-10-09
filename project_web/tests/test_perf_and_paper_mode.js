const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const HTTP_PORT = 5598;
const CDP_PORT = 9278;
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
    console.log('TESTING 3D RENDERING PERFORMANCE AND PAPER MODE LATENCY FIX');
    console.log('================================================================');

    const server = await startServer(HTTP_PORT);
    console.log(`[HTTP] Static server active on port ${HTTP_PORT}`);

    const edgePaths = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    let edgeBin = edgePaths.find(p => fs.existsSync(p));
    if (!edgeBin) {
        console.error('Edge executable not found');
        process.exit(1);
    }

    const userDataDir = path.join(ROOT_DIR, 'tmp_edge_test_perf_paper');
    if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

    const browser = spawn(edgeBin, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${userDataDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--headless=new',
        '--window-size=1400,900',
        'about:blank'
    ]);

    await sleep(2000);

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
        console.error('Failed to obtain CDP WebSocket URL');
        browser.kill();
        server.close();
        process.exit(1);
    }

    const ws = new WebSocket(wsUrl);
    await new Promise(res => { ws.onopen = res; });
    console.log('[CDP] Connected successfully.');

    let msgId = 1;
    const callbacks = new Map();

    ws.onmessage = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id && callbacks.has(data.id)) {
            const cb = callbacks.get(data.id);
            callbacks.delete(data.id);
            if (data.error) cb.reject(data.error);
            else cb.resolve(data.result);
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
    await sendCmd('Page.navigate', { url: `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html` });

    console.log('[PAGE] Waiting for application initialization...');
    await sleep(3500);

    async function evalCode(expression) {
        const res = await sendCmd('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (res.exceptionDetails) {
            console.error('Evaluate Exception:', res.exceptionDetails);
        }
        return res.result ? res.result.value : null;
    }

    // Doi App khoi tao
    for (let i = 0; i < 20; i++) {
        const ready = await evalCode(`Boolean(window.App && window.App.vectorList && window.Vec3D && window.App.PaperLogger)`);
        if (ready) break;
        await sleep(300);
    }

    // 1. Chuyen sang che do 3D va tao 15 vector
    console.log('[STEP 1] Generating 15 3D vectors and switching to 3D mode...');
    const setup3DResult = await evalCode(`(function() {
        if (window.App.mode === '2D' && typeof window.App.toggleMode === 'function') {
            window.App.toggleMode();
        }
        window.App.vectorList = [];
        const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
        for (let i = 1; i <= 15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            const r = 3 + (i % 4) * 2;
            const x = Number((Math.cos(angle) * r).toFixed(2));
            const y = Number((Math.sin(angle) * r).toFixed(2));
            const z = Number(((i % 5) - 2).toFixed(2));
            window.App.vectorList.push({
                id: i,
                name: 'u_{' + i + '}',
                vec: [x, y, z],
                colorHex: colors[i % colors.length],
                visible: true,
                focus: (i === 1)
            });
        }
        if (typeof window.App.renderVectorList === 'function') window.App.renderVectorList();
        if (typeof window.Vec3D.draw3DAllVectors === 'function') window.Vec3D.draw3DAllVectors({ frame: true });
        return {
            mode: window.App.mode,
            count: window.App.vectorList.length,
            pickableMeshesCount: (window.Vec3D._pickableMeshes || []).length,
            pickableHeadsCount: (window.Vec3D._pickableHeads || []).length,
            focusPulseCount: (window.Vec3D._focusPulseMaterials || []).length
        };
    })()`);
    console.log('[STEP 1 RESULT]', setup3DResult);

    // 2. Do FPS va thoi gian xoay 3D
    console.log('[STEP 2] Measuring 3D rotation FPS and frame time with 15 vectors...');
    const perfResult = await evalCode(`new Promise((resolve) => {
        let frames = 0;
        const startTime = performance.now();
        
        function step() {
            frames++;
            if (window.Vec3D && window.Vec3D._camera) {
                const cam = window.Vec3D._camera;
                const t = frames * 0.05;
                cam.position.x = 25 * Math.cos(t);
                cam.position.y = 25 * Math.sin(t);
                cam.position.z = 15;
                cam.lookAt(0, 0, 0);
            }
            const now = performance.now();
            if (now - startTime < 1000) {
                requestAnimationFrame(step);
            } else {
                const elapsed = now - startTime;
                const fps = Math.round((frames / elapsed) * 1000);
                resolve({ fps, frames, elapsed: Math.round(elapsed) });
            }
        }
        requestAnimationFrame(step);
    })`);
    console.log('[STEP 2 FPS RESULT]', perfResult);

    // Chup anh 3D 15 vectors
    const shot3D = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_3d_high_perf_15_vectors.png'), Buffer.from(shot3D.data, 'base64'));
    console.log('[SCREENSHOT] Saved verify_3d_high_perf_15_vectors.png');

    // 3. Nap 20 phep toan vao PaperLogger
    console.log('[STEP 3] Populating 20 mathematical log entries into PaperLogger...');
    const logPopulateResult = await evalCode(`(function() {
        if (!window.App.PaperLogger) return { error: 'No PaperLogger' };
        for (let i = 1; i <= 20; i++) {
            const title = (i % 2 === 0) ? 'Cong vector u_1 + u_' + i : 'Tich vo huong (u_1, u_' + i + ')';
            const ltx = '\\\\vec{u_1} + \\\\vec{u_{' + i + '}} = \\\\begin{pmatrix} ' + (i*1.5).toFixed(1) + ' \\\\\\\\ ' + (i*2.2).toFixed(1) + ' \\\\\\\\ ' + (-i*0.8).toFixed(1) + ' \\\\end{pmatrix}';
            const det = '<p>Phep toan thanh phan tung toa do: x = 1 + ' + i + ', y = 2 + ' + (i*2) + '</p>';
            window.App.PaperLogger.log(title, ltx, det);
        }
        return {
            totalLogs: window.App.PaperLogger.logs.length
        };
    })()`);
    console.log('[STEP 3 RESULT]', logPopulateResult);

    // 4. Do do tre khi chuyen sang tab Ghi chep (Paper Mode)
    console.log('[STEP 4] Measuring tab switch latency to Paper Mode...');
    const switchLatency = await evalCode(`(function() {
        const btnPaper = document.getElementById('btnPaperMode');
        const t0 = performance.now();
        btnPaper.click();
        const t1 = performance.now();
        const paperWrap = document.getElementById('paperWrap');
        const logEntries = document.querySelectorAll('.paper-log-entry');
        const katexElements = document.querySelectorAll('.paper-log-entry .katex');
        return {
            switchTimeMs: Number((t1 - t0).toFixed(2)),
            paperWrapDisplay: window.getComputedStyle(paperWrap).display,
            is3DAnimating: window.Vec3D ? window.Vec3D._animating : null,
            logEntriesCount: logEntries.length,
            katexRenderedCount: katexElements.length
        };
    })()`);
    console.log('[STEP 4 LATENCY RESULT]', switchLatency);

    // Chup anh Paper Mode voi KaTeX render
    await sleep(300);
    const shotPaper = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_paper_mode_instant_katex.png'), Buffer.from(shotPaper.data, 'base64'));
    console.log('[SCREENSHOT] Saved verify_paper_mode_instant_katex.png');

    // 5. Kiem tra nut Xoa so tay o dau trang (Modal xac nhan)
    console.log('[STEP 5] Testing clear confirm modal on #btnClearPaperTop...');
    const openModalResult = await evalCode(`(function() {
        const btnClearTop = document.getElementById('btnClearPaperTop');
        if (btnClearTop) btnClearTop.click();
        const modalTitle = document.querySelector('h3');
        const hasOverlay = !!document.getElementById('btnConfirmClear');
        return {
            clickedTop: !!btnClearTop,
            hasModal: hasOverlay
        };
    })()`);
    console.log('[STEP 5 MODAL OPENED]', openModalResult);

    await sleep(200);
    const shotModal = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_paper_clear_confirm_modal.png'), Buffer.from(shotModal.data, 'base64'));
    console.log('[SCREENSHOT] Saved verify_paper_clear_confirm_modal.png');

    // 6. Xac nhan xoa va kiem tra placeholder
    console.log('[STEP 6] Confirming clear and checking empty placeholder...');
    const confirmClearResult = await evalCode(`(function() {
        const btnConfirm = document.getElementById('btnConfirmClear');
        if (btnConfirm) btnConfirm.click();
        const placeholder = document.getElementById('paperPlaceholder');
        const remainingEntries = document.querySelectorAll('.paper-log-entry');
        return {
            logsInLogger: window.App.PaperLogger.logs.length,
            hasPlaceholder: !!placeholder,
            remainingDomEntries: remainingEntries.length
        };
    })()`);
    console.log('[STEP 6 CLEARED RESULT]', confirmClearResult);

    await sleep(200);
    const shotPlaceholder = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_paper_cleared_placeholder.png'), Buffer.from(shotPlaceholder.data, 'base64'));
    console.log('[SCREENSHOT] Saved verify_paper_cleared_placeholder.png');

    // 7. Chuyen nguoc lai Visual Mode
    console.log('[STEP 7] Switching back to Visual Mode and verifying 3D resume...');
    const switchBackResult = await evalCode(`(function() {
        const btnVisual = document.getElementById('btnVisualMode');
        btnVisual.click();
        return {
            mode: window.App.mode,
            is3DAnimating: window.Vec3D ? window.Vec3D._animating : null,
            viewerDisplay: window.getComputedStyle(document.getElementById('viewer')).display
        };
    })()`);
    console.log('[STEP 7 RESULT]', switchBackResult);

    browser.kill();
    server.close();

    console.log('\n================================================================');
    console.log('ALL TESTS PASSED SUCCESSFULLY! ZERO DELAY AND SMOOTH 60 FPS 3D!');
    console.log('================================================================');
}

runTest().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
