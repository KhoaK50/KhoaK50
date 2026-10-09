// ==============================================================================
// TEST: THEME TOGGLE & 2D/3D MODE SWITCH VERIFICATION
// ==============================================================================
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5652;
const CDP_PORT = 9252;

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
    console.log('TESTING THEME TOGGLE & 2D/3D MODE SWITCH VERIFICATION');
    console.log('================================================================');

    const server = startStaticServer();
    console.log(`[HTTP] Server active on port ${HTTP_PORT}`);

    const edgeBin = findEdgeBinary();
    const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_theme_3d');

    const browser = spawn(edgeBin, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${userDataDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-sync',
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
            if (msg.method === 'Runtime.exceptionThrown') {
                console.error('[PAGE EXCEPTION]:', msg.params.exceptionDetails);
            }
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

        const captureScreenshot = async (name) => {
            const res = await sendCmd('Page.captureScreenshot', { format: 'png' });
            const buf = Buffer.from(res.data, 'base64');
            const p = path.join(ARTIFACT_DIR, `${name}.png`);
            fs.writeFileSync(p, buf);
            console.log(`[SCREENSHOT] Saved: ${p}`);
        };

        await sendCmd('Page.enable');
        await sendCmd('Runtime.enable');
        await sleep(1500);

        // 1. KHOI TAO VECTOR MAU
        console.log('\n--- BUOC 1: KHOI TAO VECTOR MAU (2D & 3D) ---');
        await evaluate(`(() => {
            const App = window.App || {};
            App.vectorList = [
                { id: 1, name: "u", vec: [2, 3, 2], colorCss: "#3b82f6", colorHex: "#3b82f6", visible: true, showArrow: true, alpha: 1 },
                { id: 2, name: "v", vec: [-2, 2, 3], colorCss: "#ef4444", colorHex: "#ef4444", visible: true, showArrow: true, alpha: 1 }
            ];
            if (App.renderVectorList) App.renderVectorList();
            if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
        })()`);
        await sleep(300);

        // 2. KIEM TRA CHUYEN THEME (LIGHT -> DARK -> LIGHT)
        console.log('\n--- BUOC 2: KIEM TRA CHUYEN THEME (LIGHT -> DARK -> LIGHT) ---');
        const initialTheme = await evaluate(`(() => {
            return {
                isDark: document.documentElement.classList.contains("dark"),
                stored: localStorage.getItem("vec_theme"),
                appTheme: window.App?.theme
            };
        })()`);
        console.log('[INITIAL THEME]:', initialTheme);

        // Click nut #themeToggleBtn de sang Dark
        console.log('-> Clicking #themeToggleBtn to switch to Dark...');
        await evaluate(`document.getElementById("themeToggleBtn").click()`);
        await sleep(400);

        const darkState = await evaluate(`(() => {
            return {
                isDark: document.documentElement.classList.contains("dark"),
                bodyDark: document.body?.classList.contains("dark-theme"),
                stored: localStorage.getItem("vec_theme"),
                appTheme: window.App?.theme
            };
        })()`);
        console.log('[DARK STATE]:', darkState);
        if (!darkState.isDark || darkState.stored !== "dark" || darkState.appTheme !== "dark") {
            throw new Error('Failed to toggle to Dark theme: ' + JSON.stringify(darkState));
        }
        console.log('✅ Chuyển sang Dark Theme thành công 100%!');
        await captureScreenshot('verify_theme_dark_2d');

        // Click nut #themeToggleBtn lan nua de ve Light
        console.log('-> Clicking #themeToggleBtn to switch back to Light...');
        await evaluate(`document.getElementById("themeToggleBtn").click()`);
        await sleep(400);

        const lightState = await evaluate(`(() => {
            return {
                isDark: document.documentElement.classList.contains("dark"),
                bodyDark: document.body?.classList.contains("dark-theme"),
                stored: localStorage.getItem("vec_theme"),
                appTheme: window.App?.theme
            };
        })()`);
        console.log('[LIGHT STATE]:', lightState);
        if (lightState.isDark || lightState.stored !== "light" || lightState.appTheme !== "light") {
            throw new Error('Failed to toggle back to Light theme: ' + JSON.stringify(lightState));
        }
        console.log('✅ Chuyển về Light Theme thành công 100%!');

        // 3. KIEM TRA CHUYEN SANG CHẾ ĐỘ 3D
        console.log('\n--- BUOC 3: KIEM TRA CHUYEN SANG CHE DO 3D QUA NUT #modeBadge ---');
        const before3D = await evaluate(`(() => {
            return {
                mode: window.App?.mode,
                btnText: document.getElementById("modeBadgeText")?.textContent,
                c2dDisplay: document.getElementById("canvas2d")?.style.display,
                threeDisplay: document.getElementById("threeLayer")?.style.display,
                hasVec3D: typeof window.Vec3D !== "undefined"
            };
        })()`);
        console.log('[BEFORE 3D SWITCH]:', before3D);

        // Click modeBadge
        console.log('-> Clicking #modeBadge to switch to 3D...');
        await evaluate(`document.getElementById("modeBadge").click()`);
        await sleep(600);

        const in3DState = await evaluate(`(() => {
            return {
                mode: window.App?.mode,
                btnText: document.getElementById("modeBadgeText")?.textContent,
                bodyMode3D: document.body?.classList.contains("mode-3d"),
                c2dDisplay: document.getElementById("canvas2d")?.style.display,
                threeDisplay: document.getElementById("threeLayer")?.style.display,
                hasScene: !!window.Vec3D?._scene,
                animating: window.Vec3D?._animating,
                meshCount: window.Vec3D?._pickableMeshes?.length || 0
            };
        })()`);
        console.log('[3D STATE]:', in3DState);
        if (in3DState.mode !== "3D" || in3DState.btnText !== "3D" || !in3DState.bodyMode3D || in3DState.threeDisplay !== "block") {
            throw new Error('Failed to switch to 3D mode: ' + JSON.stringify(in3DState));
        }
        console.log('✅ Chuyển sang chế độ 3D thành công 100% (threeLayer hiển thị, canvas2d ẩn)!');
        await captureScreenshot('verify_mode_3d_active');

        // 4. KIEM TRA CHUYEN THEME TRONG KHI DANG O 3D
        console.log('\n--- BUOC 4: KIEM TRA CHUYEN THEME TRONG KHI DANG O 3D ---');
        console.log('-> Clicking #themeToggleBtn while in 3D...');
        await evaluate(`document.getElementById("themeToggleBtn").click()`);
        await sleep(400);

        const theme3DDark = await evaluate(`(() => {
            return {
                isDark: document.documentElement.classList.contains("dark"),
                stored: localStorage.getItem("vec_theme"),
                appTheme: window.App?.theme,
                sceneBgHex: window.Vec3D?._scene?.background?.getHexString?.()
            };
        })()`);
        console.log('[THEME 3D DARK]:', theme3DDark);
        if (!theme3DDark.isDark || theme3DDark.appTheme !== "dark") {
            throw new Error('Failed to toggle theme in 3D mode: ' + JSON.stringify(theme3DDark));
        }
        console.log('✅ Theme chuyển mượt mà ngay trong không gian 3D!');
        await captureScreenshot('verify_theme_dark_3d');

        // 5. KIEM TRA CHUYEN VE LAI 2D
        console.log('\n--- BUOC 5: KIEM TRA CHUYEN VE LAI 2D ---');
        console.log('-> Clicking #modeBadge to switch back to 2D...');
        await evaluate(`document.getElementById("modeBadge").click()`);
        await sleep(500);

        const back2DState = await evaluate(`(() => {
            return {
                mode: window.App?.mode,
                btnText: document.getElementById("modeBadgeText")?.textContent,
                bodyMode2D: document.body?.classList.contains("mode-2d"),
                c2dDisplay: document.getElementById("canvas2d")?.style.display,
                threeDisplay: document.getElementById("threeLayer")?.style.display,
                haloStyle: window.App?.graphSettings?.haloStyle || window.App?.haloStyle
            };
        })()`);
        console.log('[BACK TO 2D STATE]:', back2DState);
        if (back2DState.mode !== "2D" || back2DState.btnText !== "2D" || back2DState.c2dDisplay !== "block" || back2DState.threeDisplay !== "none") {
            throw new Error('Failed to switch back to 2D: ' + JSON.stringify(back2DState));
        }
        console.log('✅ Chuyển về lại 2D trơn tru hoàn hảo (Halo mặc định: ' + back2DState.haloStyle + ')!');

        console.log('\n================================================================');
        console.log('ALL THEME & 3D SWITCH TESTS PASSED 100%!');
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
