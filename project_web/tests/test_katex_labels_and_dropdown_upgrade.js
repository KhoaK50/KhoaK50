const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const HTTP_PORT = 5589;
const CDP_PORT = 9269;
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
    console.log('STARTING CLEAN 2D & 3D VERIFICATION WITH KATEX & HUD UPGRADE');
    console.log('================================================================');

    const server = await startServer(HTTP_PORT);
    console.log(`[HTTP] Static server active on port ${HTTP_PORT}`);

    const edgePaths = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    let edgeBin = edgePaths.find(p => fs.existsSync(p));
    if (!edgeBin) {
        console.error('Edge browser not found!');
        process.exit(1);
    }

    const userDataDir = path.join(ROOT_DIR, 'tmp_edge_test_clean');
    if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

    const browser = spawn(edgeBin, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${userDataDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--headless=new',
        '--window-size=1400,900',
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
    await sendCmd('Emulation.setDeviceMetricsOverride', {
        width: 1400,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false
    });
    await sendCmd('Page.navigate', { url: `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html` });
    await sleep(3500);

    async function evalCode(expression) {
        const res = await sendCmd('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (res.exceptionDetails) {
            console.error('Eval error:', res.exceptionDetails);
            return undefined;
        }
        return res.result?.value;
    }

    // 1. Chuan bi moi truong 2D sach se, xoa toast
    await evalCode(`(() => {
        localStorage.clear();
        document.querySelectorAll('.toast, #toast-container, .toast-container').forEach(t => t.remove());
        if (App.setMode) App.setMode('2D');
        if (App.clearAllVectors) App.clearAllVectors();
        // Remove toast overlay
        const style = document.createElement('style');
        style.innerHTML = '.toast, .toast-container { display: none !important; }';
        document.head.appendChild(style);
    })()`);
    await sleep(600);

    // 2. Them vector phuc tap: [log_2(5), 2*sqrt(2)]
    await evalCode(`(() => {
        const inp = document.getElementById("vectorInput");
        inp.value = "[log_2(5), 2*sqrt(2)]";
        if (App.updateVectorInputPreview) App.updateVectorInputPreview();
        App.onAddVector();
    })()`);
    await sleep(600);

    // 3. Hover vector 2D de hien thi day du KaTeX toa do
    await evalCode(`(() => {
        const v = App.vectorList[0];
        Vec2D.S2D.hoveredVectorId = v.id;
        Vec2D.draw2DAllVectors();
    })()`);
    await sleep(300);

    // Mo HUD menu
    await evalCode(`(() => {
        const btn = document.getElementById('canvasMenuBtn');
        if (btn) btn.click();
    })()`);
    await sleep(400);

    // Chup anh 2D
    const shot2D = await sendCmd('Page.captureScreenshot', { format: 'png' });
    const shot2DPath = path.join(ARTIFACT_DIR, 'verify_2d_katex_labels_and_hud_clean.png');
    fs.writeFileSync(shot2DPath, Buffer.from(shot2D.data, 'base64'));
    console.log(`[SCREENSHOT] Saved clean 2D view: ${shot2DPath}`);

    // 4. Chuyen sang che do 3D
    await evalCode(`(() => {
        const modeBadge = document.getElementById('modeBadge');
        if (modeBadge) modeBadge.click();
    })()`);
    await sleep(1000);

    // Dong menu HUD tren 3D de nhin ro khong gian
    await evalCode(`(() => {
        const wrap = document.getElementById('canvasMenuContainer');
        if (wrap) wrap.classList.remove('open');
        // Kich hoat hover tren vector 3D
        const v = App.vectorList[0];
        Vec3D.S3D.hoveredVectorId = v.id;
        Vec3D.updateVectorLabelsLive();
    })()`);
    await sleep(400);

    // Chup anh 3D
    const shot3D = await sendCmd('Page.captureScreenshot', { format: 'png' });
    const shot3DPath = path.join(ARTIFACT_DIR, 'verify_3d_axes_and_katex_labels_clean.png');
    fs.writeFileSync(shot3DPath, Buffer.from(shot3D.data, 'base64'));
    console.log(`[SCREENSHOT] Saved clean 3D view: ${shot3DPath}`);

    // 5. Chuyen sang Dark Mode de kiem tra tinh tuong thich Theme
    await evalCode(`(() => {
        if (App.toggleTheme) App.toggleTheme();
    })()`);
    await sleep(600);

    const shotDark = await sendCmd('Page.captureScreenshot', { format: 'png' });
    const shotDarkPath = path.join(ARTIFACT_DIR, 'verify_3d_dark_mode_clean.png');
    fs.writeFileSync(shotDarkPath, Buffer.from(shotDark.data, 'base64'));
    console.log(`[SCREENSHOT] Saved clean 3D dark mode view: ${shotDarkPath}`);

    ws.close();
    browser.kill();
    server.close();
    console.log('ALL SCREENSHOTS GENERATED SUCCESSFULLY!');
}

runTest().catch(err => {
    console.error('Test run failed:', err);
    process.exit(1);
});
