const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5691;
const CDP_PORT = 9291;
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
        this.ws = null;
        this.id = 1;
        this.callbacks = new Map();
        this.consoleErrors = [];
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
            if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
                this.consoleErrors.push(msg.params.args.map(a => a.value || a.description).join(' '));
            }
            if (msg.method === 'Runtime.exceptionThrown') {
                this.consoleErrors.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception ? msg.params.exceptionDetails.exception.description : ''));
            }
            if (msg.id && this.callbacks.has(msg.id)) {
                const { resolve, reject } = this.callbacks.get(msg.id);
                this.callbacks.delete(msg.id);
                if (msg.error) reject(msg.error);
                else resolve(msg.result);
            }
        };
    }

    send(method, params = {}) {
        const id = this.id++;
        return new Promise((resolve, reject) => {
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
            throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
        }
        return res.result ? res.result.value : undefined;
    }

    async captureScreenshot(filename, clip = null) {
        const params = { format: 'png' };
        if (clip) params.clip = clip;
        const res = await this.send('Page.captureScreenshot', params);
        const buffer = Buffer.from(res.data, 'base64');
        const outPath = path.join(ARTIFACT_DIR, filename);
        fs.writeFileSync(outPath, buffer);
        console.log(`[CDP] Screenshot saved: ${filename} (${buffer.length} bytes)`);
        return outPath;
    }

    close() {
        if (this.ws) this.ws.close();
    }
}

async function runTest() {
    console.log('================================================================');
    console.log('KIEM THU: HOAT CANH KHOI THO PHAO & BO NHAP DUP VE GOC');
    console.log('================================================================');

    const server = startStaticServer();
    const edgeBin = findEdgeBinary();
    const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_test_relief');

    const browser = spawn(edgeBin, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${userDataDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--headless=new',
        '--window-size=1400,900',
        `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html`
    ]);

    try {
        const wsUrl = await getCDPWebSocketUrl();
        const client = new CDPClient(wsUrl);
        await client.connect();

        await client.send('Page.enable');
        await client.send('Runtime.enable');
        await client.send('DOM.enable');

        console.log('[1] Cho trang web tai xong va Nori Companion khoi tao...');
        await sleep(2500);

        console.log(`[CHECK 0] DevTools Console errors count: ${client.consoleErrors.length}`);
        if (client.consoleErrors.length > 0) {
            console.warn('[WARNING] Console errors captured:', client.consoleErrors);
        }

        // Test 1: Nhap dup (2 click) khong con lam Nori bay ve goc toa do nua
        console.log('[2] Kiem tra nhap dup 2 lan tren Nori...');
        const doubleClickCheck = await client.evaluate(`(async () => {
            const comp = window.App.noriFloatingCompanion;
            comp.show();
            comp.container.style.left = '600px';
            comp.container.style.top = '250px';
            comp.pos = { x: 600, y: 250 };

            const stage = comp.stage;

            // Nhap dup
            stage.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(r => setTimeout(r, 60));
            stage.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            // Cho 500ms
            await new Promise(r => setTimeout(r, 500));

            return {
                display: comp.container.style.display,
                pendingReturnTimer: comp.pendingReturnTimer,
                isFloating: window.App.noriIsFloating
            };
        })()`);
        console.log('[CHECK 1] Ket qua sau khi nhap dup 2 lan:', doubleClickCheck);
        if (doubleClickCheck.display === 'none') {
            throw new Error('Nhap dup van lam Nori bay ve goc toa do va an di!');
        }
        if (doubleClickCheck.pendingReturnTimer !== undefined) {
            throw new Error('pendingReturnTimer van con ton tai trong code!');
        }

        // Test 2: Bam 5 lan lien tiep van kich hoat phong ma gian doi
        console.log('[3] Kiem tra bam tiep thanh 5 lan kich hoat gian doi...');
        const rapid5Check = await client.evaluate(`(async () => {
            const comp = window.App.noriFloatingCompanion;
            const stage = comp.stage;

            for (let i = 0; i < 5; i++) {
                stage.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                await new Promise(r => setTimeout(r, 60));
            }

            return {
                isPuffed: comp.isPuffed,
                hasPuffedClass: stage.classList.contains('is-puffed')
            };
        })()`);
        console.log('[CHECK 2] Ket qua bam 5 lan:', rapid5Check);
        if (!rapid5Check.isPuffed || !rapid5Check.hasPuffedCheck && !rapid5Check.hasPuffedClass) {
            throw new Error('Bam 5 lan khong kich hoat isPuffed!');
        }

        // Test 3: Kiem tra bieu cam RELIEVED va hoat canh may khoi tren Canvas 2D
        console.log('[4] Kiem tra bieu cam tho phao RELIEVED tren Canvas 2D...');
        await client.evaluate(`(() => {
            if (!window.App.noriEntityActive) {
                window.App.toggleNoriEntity();
            }
            window.App.triggerNoriRelief();
        })()`);

        await sleep(250); // Cho 250ms de may khoi bung ra o toa do dep nhat

        const reliefState = await client.evaluate(`(() => {
            return {
                isRelieved: window.App.isNoriRelieved,
                hasStartTime: typeof window.App.noriReliefStartTime === 'number' && window.App.noriReliefStartTime > 0
            };
        })()`);
        console.log('[CHECK 3] Trang thai RELIEVED tren Canvas:', reliefState);
        if (!reliefState.isRelieved || !reliefState.hasStartTime) {
            throw new Error('triggerNoriRelief khong thiet lap dung state!');
        }

        // Chup hinh can canh Nori o goc toa do voi dam may tho phao
        const canvasRect = await client.evaluate(`(() => {
            const c = document.getElementById('canvas2d');
            const r = c.getBoundingClientRect();
            const cx = window.Vec2D.gridInfo2D.cx;
            const cy = window.Vec2D.gridInfo2D.cy;
            return {
                x: Math.round(r.left + cx - 60),
                y: Math.round(r.top + cy - 60),
                width: 130,
                height: 130
            };
        })()`);
        await client.captureScreenshot('verify_nori_relief_breath_cloud.png', {
            x: canvasRect.x,
            y: canvasRect.y,
            width: canvasRect.width,
            height: canvasRect.height,
            scale: 1
        });

        // Cho het 1.5s xem co ve lai Neutral binh thuong khong
        await sleep(1500);
        const relievedDone = await client.evaluate(`(() => {
            return {
                isRelieved: window.App.isNoriRelieved,
                startTime: window.App.noriReliefStartTime
            };
        })()`);
        console.log('[CHECK 4] Sau 1.5s ket thuc RELIEVED:', relievedDone);
        if (relievedDone.isRelieved || relievedDone.startTime !== null) {
            throw new Error('RELIEVED khong tu dong ket thuc sau 1.5s!');
        }

        client.close();
        console.log('----------------------------------------------------------------');
        console.log('TAT CA CAC CHECKPOINT KIEM THU DA HOAN TAT XUAT SAC 100%!');
        console.log('----------------------------------------------------------------');
    } finally {
        browser.kill();
        server.close();
    }
}

runTest().catch(err => {
    console.error('Test failed with error:', err);
    process.exit(1);
});
