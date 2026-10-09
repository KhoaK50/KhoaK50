const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const HTTP_PORT = 5649;
const CDP_PORT = 9249;

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/frontend_v2/calculation.html';
    const filePath = path.join(PROJECT_ROOT, reqPath.replace(/^\//, ''));
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404); return res.end();
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
}).listen(HTTP_PORT);

const edgeBin = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_debug');

const browser = spawn(edgeBin, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--window-size=1600,1000',
    `http://localhost:${HTTP_PORT}/frontend_v2/calculation.html`
]);

(async () => {
    try {
        await sleep(2500);
        const versionJson = await new Promise((res, rej) => {
            http.get(`http://localhost:${CDP_PORT}/json/list`, r => {
                let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
            }).on('error', rej);
        });
        const target = versionJson.find(t => t.type === 'page' && t.url.includes(`${HTTP_PORT}`));
        const ws = new WebSocket((target || versionJson[0]).webSocketDebuggerUrl);
        await new Promise(r => ws.onopen = r);

        let id = 1;
        const cbs = new Map();
        const logs = [];
        ws.onmessage = e => {
            const m = JSON.parse(e.data);
            if (m.method === 'Runtime.consoleAPICalled') {
                logs.push({ type: m.params.type, args: m.params.args.map(a => a.value || a.description) });
            }
            if (m.method === 'Runtime.exceptionThrown') {
                console.error('[PAGE EXCEPTION]:', m.params.exceptionDetails);
            }
            if (cbs.has(m.id)) cbs.get(m.id)(m.result);
        };
        const send = (method, params = {}) => new Promise(res => {
            const curId = id++;
            cbs.set(curId, res);
            ws.send(JSON.stringify({ id: curId, method, params }));
        });
        const evalExpr = expr => send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });

        await send('Page.enable');
        await send('Runtime.enable');
        await sleep(1500);

        console.log('--- 1. KIEM TRA NUT THEME TOGGLE BTN ---');
        const themeBtnInfo = await evalExpr(`(() => {
            const btn = document.getElementById("themeToggleBtn");
            const badge = document.getElementById("themeBadge");
            return {
                hasThemeToggleBtn: !!btn,
                hasThemeBadge: !!badge,
                btnHtml: btn ? btn.outerHTML : null,
                currentTheme: window.App?.theme || localStorage.getItem("vec_theme"),
                docDark: document.documentElement.classList.contains("dark")
            };
        })()`);
        console.log('[THEME BTN INFO]:', themeBtnInfo);

        console.log('\n--- 2. CALL THEMEMANAGER.TOGGLE DIRECTLY ---');
        const toggleResult = await evalExpr(`(() => {
            if (typeof ThemeManager !== "undefined") {
                const res = ThemeManager.toggle();
                return {
                    res: res,
                    current: ThemeManager.getCurrent(),
                    storage: localStorage.getItem("vec_theme"),
                    docDark: document.documentElement.classList.contains("dark")
                };
            }
            return "No ThemeManager";
        })()`);
        console.log('[DIRECT TOGGLE RESULT]:', toggleResult);

        // Click again to test toggle back (Dark -> Light)
        await evalExpr(`(() => {
            const btn = document.getElementById("themeToggleBtn");
            if (btn) btn.click();
        })()`);
        await sleep(300);

        const afterToggle2 = await evalExpr(`(() => {
            return {
                tmCurrent: typeof ThemeManager !== "undefined" ? ThemeManager.getCurrent() : null,
                storage: localStorage.getItem("vec_theme"),
                appTheme: window.App?.theme,
                docDark: document.documentElement.classList.contains("dark"),
                bodyDark: document.body?.classList.contains("dark")
            };
        })()`);
        console.log('[AFTER TOGGLE 2 (DARK -> LIGHT)]:', afterToggle2);

        console.log('\n--- 3. KIEM TRA CHUYEN 3D (MODE BADGE) ---');
        const modeBtnInfo = await evalExpr(`(() => {
            const btn = document.getElementById("modeBadge");
            const btnText = document.getElementById("modeBadgeText");
            return {
                hasModeBadge: !!btn,
                currentMode: window.App?.mode,
                btnText: btnText ? btnText.textContent : null,
                bodyHasMode3D: document.body?.classList.contains("mode-3d"),
                threeLayerDisplay: document.getElementById("threeLayer")?.style.display,
                canvas2dDisplay: document.getElementById("canvas2d")?.style.display,
                hasVec3D: typeof window.Vec3D !== "undefined",
                hasScene: !!window.Vec3D?._scene
            };
        })()`);
        console.log('[MODE BTN BEFORE CLICK]:', modeBtnInfo);

        // Click modeBadge
        console.log('\n--- 4. CLICK MODE BADGE DE CHUYEN SANG 3D ---');
        await evalExpr(`(() => {
            const btn = document.getElementById("modeBadge");
            if (btn) btn.click();
        })()`);
        await sleep(500);

        const modeAfterClick = await evalExpr(`(() => {
            return {
                mode: window.App?.mode,
                btnText: document.getElementById("modeBadgeText")?.textContent,
                bodyHasMode3D: document.body?.classList.contains("mode-3d"),
                threeLayerDisplay: document.getElementById("threeLayer")?.style.display,
                canvas2dDisplay: document.getElementById("canvas2d")?.style.display,
                hasScene: !!window.Vec3D?._scene,
                animating: window.Vec3D?._animating
            };
        })()`);
        console.log('[MODE AFTER CLICK]:', modeAfterClick);

        console.log('\n--- 5. KIEM TRA VẼ VECTOR TRONG 3D KHI CO VECTOR ---');
        await evalExpr(`(() => {
            const App = window.App || {};
            App.vectorList = [
                { id: 1, name: "u", vec: [2, 3, 4], colorCss: "#3b82f6", colorHex: "#3b82f6", visible: true, showArrow: true, alpha: 1 },
                { id: 2, name: "v", vec: [-1, 2, 2], colorCss: "#ef4444", colorHex: "#ef4444", visible: true, showArrow: true, alpha: 1 }
            ];
            if (window.Vec3D && Vec3D.draw3DAllVectors) {
                Vec3D.draw3DAllVectors({ frame: true });
            }
        })()`);
        await sleep(300);

        const vec3DCheck = await evalExpr(`(() => {
            return {
                meshCount: window.Vec3D?._pickableMeshes?.length || 0,
                pulseCount: window.Vec3D?._focusPulseMaterials?.length || 0
            };
        })()`);
        console.log('[VEC 3D CHECK]:', vec3DCheck);

        console.log('\n--- CONSOLE LOGS ---');
        for (const l of logs.slice(-15)) {
            console.log(`[CONSOLE ${l.type}]:`, ...l.args);
        }

        ws.close();
    } catch (e) {
        console.error(e);
    } finally {
        browser.kill();
        server.close();
        try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
    }
})();
