// ==============================================================================
// TEST: HALO STYLES COMPARISON & VERIFICATION
// Styles tested: classic_neon, academic_aura, precision_reticle, soft_elevation
// ==============================================================================
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5645;
const CDP_PORT = 9245;

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

function startStaticServer() {
    const server = http.createServer((req, res) => {
        let reqPath = decodeURI(req.url.split('?')[0]);
        if (reqPath === '/') reqPath = '/frontend_v2/calculation.html';
        const filePath = path.join(PROJECT_ROOT, reqPath.replace(/^\//, ''));
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not Found: ' + reqPath);
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.json': 'application/json',
            '.png': 'image/png',
            '.svg': 'image/svg+xml'
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
    });
    server.listen(HTTP_PORT);
    return server;
}

function findEdgeBinary() {
    const edgePaths = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    for (const p of edgePaths) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error('Edge binary not found');
}

async function runTest() {
    console.log('================================================================');
    console.log('TESTING HALO STYLES & VISUAL COMPARISON');
    console.log('================================================================');

    const server = startStaticServer();
    console.log(`[HTTP] Server active on port ${HTTP_PORT}`);

    const edgeBin = findEdgeBinary();
    const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_halo_test');

    const browser = spawn(edgeBin, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${userDataDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--headless=new',
        '--window-size=1600,1000',
        `http://localhost:${HTTP_PORT}/frontend_v2/calculation.html`
    ]);

    let ws = null;
    let msgId = 1;

    try {
        await sleep(2500);

        const versionJson = await new Promise((resolve, reject) => {
            http.get(`http://localhost:${CDP_PORT}/json/list`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });

        const targetPage = versionJson.find(t => t.type === 'page');
        if (!targetPage) throw new Error('Cannot find target debug page');
        const wsUrl = targetPage.webSocketDebuggerUrl;

        ws = new WebSocket(wsUrl);

        await new Promise((resolve, reject) => {
            ws.onopen = resolve;
            ws.onerror = reject;
        });

        const callbacks = new Map();
        ws.onmessage = (evt) => {
            const msg = JSON.parse(evt.data);
            if (msg.id && callbacks.has(msg.id)) {
                const cb = callbacks.get(msg.id);
                callbacks.delete(msg.id);
                if (msg.error) cb.reject(msg.error);
                else cb.resolve(msg.result);
            }
        };

        const sendCmd = (method, params = {}) => {
            return new Promise((resolve, reject) => {
                const id = msgId++;
                callbacks.set(id, { resolve, reject });
                ws.send(JSON.stringify({ id, method, params }));
            });
        };

        const evaluate = async (expr) => {
            const res = await sendCmd('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
            if (res.exceptionDetails) {
                throw new Error('Eval failed: ' + JSON.stringify(res.exceptionDetails));
            }
            return res.result ? res.result.value : undefined;
        };

        const captureScreenshot = async (name, clip = null) => {
            const params = { format: 'png' };
            if (clip) params.clip = clip;
            const res = await sendCmd('Page.captureScreenshot', params);
            const buf = Buffer.from(res.data, 'base64');
            const p = path.join(ARTIFACT_DIR, `${name}.png`);
            fs.writeFileSync(p, buf);
            console.log(`[SCREENSHOT] Saved: ${p}`);
        };

        await sendCmd('Page.enable');
        await sendCmd('Runtime.enable');
        await sleep(1500);

        // 1. Khoi tao danh sach vector tren do thi 2D
        console.log('\n--- BUOC 1: KHOI TAO VECTOR MAU TRONG 2D ---');
        await evaluate(`(() => {
            const App = window.App || {};
            App.vectorList = [
                { id: 1, name: "u", vec: [3, 2], latex: "[3, 2]", colorCss: "#3b82f6", colorHex: "#3b82f6", visible: true, showArrow: true, alpha: 1 },
                { id: 2, name: "v", vec: [-2, 3], latex: "[-2, 3]", colorCss: "#ef4444", colorHex: "#ef4444", visible: true, showArrow: true, alpha: 1 }
            ];
            if (App.renderVectorList) App.renderVectorList();
            if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
        })()`);
        await sleep(300);

        // Hover / focus vector u (id = 1)
        await evaluate(`(() => {
            window.Vec2D.S2D.hoveredVectorId = 1;
            if (window.Vec2D.draw2DAllVectors) window.Vec2D.draw2DAllVectors();
        })()`);
        await sleep(200);

        // Lay clip toa do cua viewer de screenshot ro net
        const viewerBox = await evaluate(`(() => {
            const el = document.getElementById("canvas2d");
            const rect = el.getBoundingClientRect();
            return {
                x: Math.round(rect.left),
                y: Math.round(rect.top),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                scale: 1
            };
        })()`);
        console.log('[VIEWER BOX]:', viewerBox);

        // Lay clip toa do cua rieng vung vector u de xem chi tiet zoom-in
        const uClip = await evaluate(`(() => {
            const { cx, cy, px } = window.Vec2D.gridInfo2D;
            const canvas = document.getElementById("canvas2d");
            const rect = canvas.getBoundingClientRect();
            const x0 = rect.left + cx;
            const y0 = rect.top + cy;
            const x1 = rect.left + cx + 3 * px;
            const y1 = rect.top + cy - 2 * px;
            const pad = 60;
            const minX = Math.min(x0, x1) - pad;
            const minY = Math.min(y0, y1) - pad;
            const maxX = Math.max(x0, x1) + pad + 50; // bao gom ca nhan
            const maxY = Math.max(y0, y1) + pad;
            return {
                x: Math.round(minX),
                y: Math.round(minY),
                width: Math.round(maxX - minX),
                height: Math.round(maxY - minY),
                scale: 1
            };
        })()`);
        console.log('[U VECTOR CLOSEUP CLIP]:', uClip);

        // 2. Chup lan luot 4 kieu Halo
        const styles = [
            { id: 'classic_neon', name: 'halo_1_classic_neon', desc: '1. Cyan Neon (Cached original pulse)' },
            { id: 'academic_aura', name: 'halo_2_academic_aura', desc: '2. Academic Aura (Color-matched soft feathered glow)' },
            { id: 'precision_reticle', name: 'halo_3_precision_reticle', desc: '3. Precision Reticle (CAD Drafting dual concentric crosshair rings)' },
            { id: 'soft_elevation', name: 'halo_4_soft_elevation', desc: '4. Soft Elevation (Subtle elevation shadow & depth)' }
        ];

        console.log('\n--- BUOC 2: CHUP ANH SO SANH 4 PHONG CACH HALO ---');
        for (const st of styles) {
            console.log(`\nTesting style: ${st.desc}`);
            await evaluate(`(() => {
                const App = window.App || {};
                if (!App.graphSettings) App.graphSettings = {};
                App.graphSettings.haloStyle = "${st.id}";
                App.haloStyle = "${st.id}";
                const selectEl = document.getElementById("settingHaloStyle");
                if (selectEl) selectEl.value = "${st.id}";
                if (App.saveGraphSettings) App.saveGraphSettings();
                if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
            })()`);
            await sleep(300);

            // Chup toan bo man hinh
            await captureScreenshot(st.name);

            // Chup crop khu vuc do thi
            if (viewerBox && viewerBox.width > 0) {
                await captureScreenshot(`${st.name}_canvas`, viewerBox);
            }

            // Chup crop zoom-in can canh vector u
            if (uClip && uClip.width > 0) {
                await captureScreenshot(`${st.name}_closeup`, uClip);
            }
            console.log(`[PASS] Captured ${st.id} for vector u (blue)`);
        }

        // Chup them can canh tren vector v (mau do #ef4444) de so sanh khi vector mang mau khac
        console.log('\n--- BUOC 2B: CHUP ANH CAN CANH VECTOR V (MAU DO) ---');
        await evaluate(`(() => {
            window.Vec2D.S2D.hoveredVectorId = 2; // Hover vector v mau do
            if (window.Vec2D.draw2DAllVectors) window.Vec2D.draw2DAllVectors();
        })()`);
        await sleep(200);

        const vClip = await evaluate(`(() => {
            const { cx, cy, px } = window.Vec2D.gridInfo2D;
            const canvas = document.getElementById("canvas2d");
            const rect = canvas.getBoundingClientRect();
            const x0 = rect.left + cx;
            const y0 = rect.top + cy;
            const x1 = rect.left + cx - 2 * px;
            const y1 = rect.top + cy - 3 * px;
            const pad = 60;
            const minX = Math.min(x0, x1) - pad;
            const minY = Math.min(y0, y1) - pad;
            const maxX = Math.max(x0, x1) + pad + 50;
            const maxY = Math.max(y0, y1) + pad;
            return {
                x: Math.round(minX),
                y: Math.round(minY),
                width: Math.round(maxX - minX),
                height: Math.round(maxY - minY),
                scale: 1
            };
        })()`);

        for (const st of styles) {
            await evaluate(`(() => {
                const App = window.App || {};
                App.graphSettings.haloStyle = "${st.id}";
                App.haloStyle = "${st.id}";
                if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
            })()`);
            await sleep(200);
            if (vClip && vClip.width > 0) {
                await captureScreenshot(`halo_red_${st.name.replace('halo_', '')}_closeup`, vClip);
            }
            console.log(`[PASS] Captured ${st.id} for vector v (red)`);
        }

        // 3. Kiem tra tinh nang dropdown settingHaloStyle trong UI
        console.log('\n--- BUOC 3: KIEM TRA TUONG TAC DROPDOWN SETTING TRONG UI ---');
        const dropdownCheck = await evaluate(`(() => {
            const selectEl = document.getElementById("settingHaloStyle");
            if (!selectEl) return { found: false };
            const options = Array.from(selectEl.options).map(o => o.value);
            return {
                found: true,
                currentVal: selectEl.value,
                optionsCount: selectEl.options.length,
                options: options
            };
        })()`);
        console.log('[DROPDOWN CHECK]:', dropdownCheck);
        if (!dropdownCheck.found) throw new Error('settingHaloStyle dropdown element not found in DOM!');
        if (dropdownCheck.optionsCount < 4) throw new Error('Expected at least 4 halo style options');

        // Test change event through DOM
        await evaluate(`(() => {
            const selectEl = document.getElementById("settingHaloStyle");
            selectEl.value = "academic_aura";
            selectEl.dispatchEvent(new Event("change"));
        })()`);
        await sleep(100);

        const storageVal = await evaluate(`localStorage.getItem("vectoria_halo_style")`);
        console.log('[LOCAL STORAGE HALO STYLE]:', storageVal);
        if (storageVal !== 'academic_aura') {
            throw new Error(`Expected localStorage vectoria_halo_style to be 'academic_aura', got '${storageVal}'`);
        }
        console.log('[PASS] Dropdown binding & localStorage persistence verified 100%!');

        console.log('\n================================================================');
        console.log('ALL HALO TESTS & SCREENSHOTS COMPLETED SUCCESSFULLY!');
        console.log('================================================================');

    } catch (err) {
        console.error('[ERROR RUNNING TEST]:', err);
        process.exitCode = 1;
    } finally {
        if (ws) ws.close();
        browser.kill();
        server.close();
        try {
            fs.rmSync(userDataDir, { recursive: true, force: true });
        } catch (e) {}
    }
}

runTest();
