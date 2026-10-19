const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5693;
const CDP_PORT = 9293;
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

async function getCDPWebSocketUrl() {
    const maxTries = 30;
    for (let i = 0; i < maxTries; i++) {
        try {
            const list = await new Promise((resolve, reject) => {
                http.get(`http://127.0.0.1:${CDP_PORT}/json/list`, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => resolve(JSON.parse(data)));
                }).on('error', reject);
            });
            const page = list.find(item => item.type === 'page');
            if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
        } catch (e) {}
        await sleep(200);
    }
    throw new Error('Could not connect to CDP WebSocket');
}

class CDPClient {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.id = 1;
        this.callbacks = new Map();
    }

    async connect() {
        const WSClass = typeof WebSocket !== 'undefined' ? WebSocket : globalThis.WebSocket;
        this.ws = new WSClass(this.wsUrl);
        await new Promise((resolve, reject) => {
            this.ws.onopen = resolve;
            this.ws.onerror = reject;
        });

        this.ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.id && this.callbacks.has(msg.id)) {
                const cb = this.callbacks.get(msg.id);
                this.callbacks.delete(msg.id);
                if (msg.error) cb.reject(msg.error);
                else cb.resolve(msg.result);
            }
        };
    }

    send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = this.id++;
            this.callbacks.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async evaluate(expression) {
        const res = await this.send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (res.exceptionDetails) {
            throw new Error(JSON.stringify(res.exceptionDetails));
        }
        return res.result ? res.result.value : undefined;
    }

    close() {
        if (this.ws) this.ws.close();
    }
}

async function runTest() {
    console.log('[1/6] Khoi dong static server...');
    const server = startStaticServer();
    const edgePath = findEdgeBinary();

    console.log('[2/6] Khoi dong Edge headless...');
    const tmpUserData = path.join(PROJECT_ROOT, '.tmp_edge_gaze_test');
    const edgeProc = spawn(edgePath, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${tmpUserData}`,
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--window-size=1280,800',
        `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html`
    ]);

    try {
        console.log('[3/6] Ket noi CDP...');
        const wsUrl = await getCDPWebSocketUrl();
        const cdp = new CDPClient(wsUrl);
        await cdp.connect();

        await cdp.send('Page.enable');
        await cdp.send('Runtime.enable');
        await sleep(1500);

        console.log('[4/6] Kiem tra khoi tao Nori va bung ra man hinh...');
        // Bat Nori tren canvas
        await cdp.evaluate(`
            if (window.App && !App.noriEntityActive) {
                App.toggleNoriEntity();
            }
        `);
        await sleep(300);

        // Bung Nori ra man hinh (Lift from canvas)
        const liftResult = await cdp.evaluate(`
            (() => {
                const comp = window.App && window.App.noriFloatingCompanion;
                if (!comp) return { error: 'Companion not found' };
                comp.liftFromCanvas({ clientX: 450, clientY: 350 }, 450, 350);
                // Tha tay ra sau khi bung de roi ve trang thai tu do
                comp.isGrabbed = false;
                comp.stage.classList.remove('is-grabbed');
                comp.setFaceExpression('NEUTRAL');
                return {
                    visible: comp.container.style.display !== 'none',
                    gazeLoopActive: !!comp.gazeRafId
                };
            })()
        `);
        console.log('Ket qua sau khi bung Nori:', liftResult);
        if (!liftResult.gazeLoopActive) {
            throw new Error('Gaze loop khong duoc khoi dong khi bung Nori!');
        }

        console.log('[5/6] Kiem tra dao mat tu nhien (Wandering Gaze) theo thoi gian...');
        const gazeSamples = [];
        for (let i = 0; i < 4; i++) {
            await sleep(250);
            const sample = await cdp.evaluate(`
                (() => {
                    const comp = window.App.noriFloatingCompanion;
                    const pL = document.getElementById('Eye_Left_Pupil');
                    const pR = document.getElementById('Eye_Right_Pupil');
                    return {
                        x: comp.currentGaze.x,
                        y: comp.currentGaze.y,
                        transformL: pL ? pL.style.transform : null,
                        transformR: pR ? pR.style.transform : null
                    };
                })()
            `);
            gazeSamples.push(sample);
            console.log(`  Mau ${i + 1}: x=${sample.x.toFixed(3)}, y=${sample.y.toFixed(3)}, transformL=${sample.transformL}`);
        }

        // Kiem tra gia tri x hoac y co su bien thien tu nhien (khong dung im 0)
        const hasMovement = Math.abs(gazeSamples[3].x - gazeSamples[0].x) > 0.05 || Math.abs(gazeSamples[3].y - gazeSamples[0].y) > 0.05;
        if (!hasMovement) {
            throw new Error('Trong mat Nori khong dao mat tu nhien theo thoi gian!');
        }
        console.log('=> Dao mat tu nhien thanh cong!');

        console.log('[6/6] Kiem tra doi mat theo con tro chuot (Mouse Pointer Tracking)...');
        // Di chuyen chuot sang goc tren ben trai (100, 100)
        await cdp.evaluate(`
            window.dispatchEvent(new PointerEvent('pointermove', { clientX: 100, clientY: 100 }));
        `);
        await sleep(350);

        const gazeTopLeft = await cdp.evaluate(`
            (() => {
                const comp = window.App.noriFloatingCompanion;
                return { x: comp.currentGaze.x, y: comp.currentGaze.y };
            })()
        `);
        console.log(`  Vi tri mat khi chuot o goc tren-trai (100, 100): x=${gazeTopLeft.x.toFixed(3)}, y=${gazeTopLeft.y.toFixed(3)}`);
        if (gazeTopLeft.x >= 0 || gazeTopLeft.y >= 0) {
            throw new Error('Mat Nori khong liec ve goc tren-trai khi chuot o do!');
        }

        // Di chuyen chuot sang goc duoi ben phai (900, 700)
        await cdp.evaluate(`
            window.dispatchEvent(new PointerEvent('pointermove', { clientX: 900, clientY: 700 }));
        `);
        await sleep(350);

        const gazeBottomRight = await cdp.evaluate(`
            (() => {
                const comp = window.App.noriFloatingCompanion;
                return { x: comp.currentGaze.x, y: comp.currentGaze.y };
            })()
        `);
        console.log(`  Vi tri mat khi chuot o goc duoi-phai (900, 700): x=${gazeBottomRight.x.toFixed(3)}, y=${gazeBottomRight.y.toFixed(3)}`);
        if (gazeBottomRight.x <= 0 || gazeBottomRight.y <= 0) {
            throw new Error('Mat Nori khong liec ve goc duoi-phai khi chuot o do!');
        }

        // Chup anh man hinh luu artifact
        const screenshotRes = await cdp.send('Page.captureScreenshot', { format: 'png' });
        const screenshotPath = path.join(ARTIFACT_DIR, 'verify_nori_floating_gaze.png');
        fs.writeFileSync(screenshotPath, Buffer.from(screenshotRes.data, 'base64'));
        console.log('Da luu anh chup man hinh:', screenshotPath);

        // Kiem tra dung gaze loop khi an Nori
        const hideResult = await cdp.evaluate(`
            (() => {
                const comp = window.App.noriFloatingCompanion;
                comp.hide();
                return {
                    visible: comp.container.style.display !== 'none',
                    gazeLoopActive: !!comp.gazeRafId
                };
            })()
        `);
        console.log('Ket qua sau khi an Nori:', hideResult);
        if (hideResult.gazeLoopActive) {
            throw new Error('Gaze loop van chay khi an Nori (ro ri tai nguyen)!');
        }

        console.log('=== TAT CA CAC TEST GAZE TRACKING & LIVING ENGINE DA VUOT QUA 100%! ===');
        cdp.close();
    } finally {
        edgeProc.kill();
        server.close();
        try {
            fs.rmSync(tmpUserData, { recursive: true, force: true });
        } catch (e) {}
    }
}

runTest().catch((err) => {
    console.error('Test that bai:', err);
    process.exit(1);
});
