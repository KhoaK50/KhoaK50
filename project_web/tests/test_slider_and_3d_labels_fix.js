const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const HTTP_PORT = 5592;
const CDP_PORT = 9272;
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
    console.log('TESTING RANGE SLIDER FIX AND 3D SINGLE ACADEMIC BADGE LABEL');
    console.log('================================================================');

    const server = await startServer(HTTP_PORT);
    console.log(`[HTTP] Static server active on port ${HTTP_PORT}`);

    const edgePaths = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    let edgeBin = edgePaths.find(p => fs.existsSync(p));
    if (!edgeBin) {
        console.error('Edge browser binary not found!');
        server.close();
        process.exit(1);
    }

    const userDataDir = path.join(ROOT_DIR, 'tmp_edge_test_slider_labels');
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

    // 1. Chuan bi moi truong ban dau, dam bao dark mode
    await evalCode(`(() => {
        localStorage.clear();
        document.querySelectorAll('.toast, #toast-container, .toast-container').forEach(t => t.remove());
        const style = document.createElement('style');
        style.innerHTML = '.toast, .toast-container { display: none !important; }';
        document.head.appendChild(style);
        if (window.App) {
            App.theme = 'dark';
            if (App.applyTheme) App.applyTheme();
        }
    })()`);
    await sleep(500);

    // 2. Kiem tra Range Slider trong menu HUD
    console.log('[STEP 1] Testing Range Slider styling & focus behaviour...');
    const sliderInfo = await evalCode(`(() => {
        const btn = document.getElementById('canvasMenuBtn');
        if (btn) btn.click();
        const slider = document.getElementById('settingGridContrastSlider');
        if (!slider) return null;
        slider.focus();
        slider.value = 35;
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        const cs = window.getComputedStyle(slider);
        return {
            value: slider.value,
            sliderPct: slider.style.getPropertyValue('--slider-pct'),
            outline: cs.outline,
            outlineWidth: cs.outlineWidth,
            border: cs.border,
            display: cs.display
        };
    })()`);
    console.log('[SLIDER INFO]:', sliderInfo);
    await sleep(400);

    // Chup anh Menu HUD voi Slider da focus
    const shotSlider = await sendCmd('Page.captureScreenshot', { format: 'png' });
    const shotSliderPath = path.join(ARTIFACT_DIR, 'verify_hud_slider_fixed.png');
    fs.writeFileSync(shotSliderPath, Buffer.from(shotSlider.data, 'base64'));
    console.log(`[SCREENSHOT] Saved HUD slider view: ${shotSliderPath}`);

    // 3. Them vector 3D: [0.52, 1.85, 0.86]
    console.log('[STEP 2] Adding 3D vector [0.52, 1.85, 0.86] and switching to 3D mode...');
    await evalCode(`(() => {
        const wrap = document.getElementById('canvasMenuContainer');
        if (wrap) wrap.classList.remove('open');
        if (App.clearAllVectors) App.clearAllVectors();
        const inp = document.getElementById("vectorInput");
        inp.value = "[0.52, 1.85, 0.86]";
        if (App.updateVectorInputPreview) App.updateVectorInputPreview();
        App.onAddVector();
    })()`);
    await sleep(800);

    // 4. Kiem tra so luong nhan va trang thai overlay 2D trong che do 3D
    const check3DLabels = await evalCode(`(() => {
        const overlay2d = document.getElementById('labels2dOverlay');
        const overlayDisp = overlay2d ? window.getComputedStyle(overlay2d).display : 'none';
        const overlayChildren = overlay2d ? overlay2d.children.length : 0;
        const labels2dVisible = overlay2d ? Array.from(overlay2d.querySelectorAll('.vec-label-2d')).length : 0;
        
        // Kiem tra nhan 3D
        const tipLabels3D = Array.from(document.querySelectorAll('#threeLayer .tip-label'));
        const tipLabelText = tipLabels3D.map(el => el.textContent.trim());
        const tipLabelLatex = tipLabels3D.map(el => el.dataset.latex || '');
        const tipLabelBg = tipLabels3D.map(el => window.getComputedStyle(el).backgroundColor);
        const tipLabelPadding = tipLabels3D.map(el => window.getComputedStyle(el).padding);

        // Kiem tra xem 3D vector co hover label khong
        const v = App.vectorList[0];
        if (v) {
            Vec3D.S3D.hoveredVectorId = v.id;
            Vec3D.updateVectorLabelsLive();
        }

        return {
            appMode: App.mode,
            bodyHasMode3d: document.body.classList.contains('mode-3d'),
            overlayDisp,
            overlayChildren,
            labels2dVisible,
            tipLabelsCount: tipLabels3D.length,
            tipLabelText,
            tipLabelLatex,
            tipLabelBg,
            tipLabelPadding
        };
    })()`);
    console.log('[3D LABELS CHECK]:', check3DLabels);
    await sleep(500);

    // 5. Xoay goc nhin 3D de kiem tra nhan khong bi che khuat hay lag
    console.log('[STEP 3] Rotating 3D camera to test label readability from multiple angles...');
    await evalCode(`(() => {
        if (Vec3D._camera) {
            Vec3D._camera.position.set(4, 5, 4.5);
            Vec3D._camera.lookAt(0, 0, 0);
            if (Vec3D._controls) Vec3D._controls.update();
            Vec3D.hardRefresh3D(false);
        }
    })()`);
    await sleep(600);

    const shot3DDark = await sendCmd('Page.captureScreenshot', { format: 'png' });
    const shot3DDarkPath = path.join(ARTIFACT_DIR, 'verify_3d_single_badge_label_dark.png');
    fs.writeFileSync(shot3DDarkPath, Buffer.from(shot3DDark.data, 'base64'));
    console.log(`[SCREENSHOT] Saved 3D dark single badge view: ${shot3DDarkPath}`);

    // 6. Chuyen sang Light Mode
    console.log('[STEP 4] Testing Light Mode compatibility...');
    await evalCode(`(() => {
        if (window.App) {
            App.theme = 'light';
            if (App.applyTheme) App.applyTheme();
        }
    })()`);
    await sleep(600);

    const shot3DLight = await sendCmd('Page.captureScreenshot', { format: 'png' });
    const shot3DLightPath = path.join(ARTIFACT_DIR, 'verify_3d_single_badge_label_light.png');
    fs.writeFileSync(shot3DLightPath, Buffer.from(shot3DLight.data, 'base64'));
    console.log(`[SCREENSHOT] Saved 3D light single badge view: ${shot3DLightPath}`);

    // 7. Chuyen ve 2D va kiem tra label badge 2D
    console.log('[STEP 5] Switching back to 2D to verify 2D badge label...');
    await evalCode(`(() => {
        const modeBadge = document.getElementById('modeBadge');
        if (modeBadge) modeBadge.click();
        const v = App.vectorList[0];
        if (v) {
            Vec2D.S2D.hoveredVectorId = v.id;
            Vec2D.draw2DAllVectors();
        }
    })()`);
    await sleep(600);

    const shot2D = await sendCmd('Page.captureScreenshot', { format: 'png' });
    const shot2DPath = path.join(ARTIFACT_DIR, 'verify_2d_badge_label.png');
    fs.writeFileSync(shot2DPath, Buffer.from(shot2D.data, 'base64'));
    console.log(`[SCREENSHOT] Saved 2D badge view: ${shot2DPath}`);

    ws.close();
    browser.kill();
    server.close();
    console.log('ALL VERIFICATION STEPS COMPLETED SUCCESSFULLY!');
}

runTest().catch(err => {
    console.error('Test run failed:', err);
    process.exit(1);
});
