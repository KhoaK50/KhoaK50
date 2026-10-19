const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5690;
const CDP_PORT = 9290;
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
    console.log('KIEM THU: HOAT CANH NGAP TOAT LEN VE NGAP & AN NORI BEN 3D');
    console.log('================================================================');

    const server = startStaticServer();
    const edgeBin = findEdgeBinary();
    const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_test_yawn_3d');

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

        // Test 1: Vi tri mui va mieng khi ngap (YAWN geometry & no overlap with nose)
        console.log('[2] Kiem tra hinh thai bieu cam YAWN...');
        const yawnGeometry = await client.evaluate(`(() => {
            const comp = window.App.noriFloatingCompanion;
            comp.show();
            comp.container.style.left = '600px';
            comp.container.style.top = '250px';
            comp.pos = { x: 600, y: 250 };

            comp.setFaceExpression('YAWN');

            const noseEl = document.getElementById('Nose');
            const mouthEl = document.getElementById('Mouth_Smile');
            const tongueEl = document.getElementById('Mouth_Tongue');
            const tearsEl = document.getElementById('Laugh_Tears');

            const noseBBox = noseEl.getBBox();
            const mouthBBox = mouthEl.getBBox();

            return {
                noseBottom: noseBBox.y + noseBBox.height,
                mouthTop: mouthBBox.y,
                gapBetweenNoseAndMouth: mouthBBox.y - (noseBBox.y + noseBBox.height),
                mouthFill: mouthEl.getAttribute('fill'),
                tongueOpacity: tongueEl ? tongueEl.style.opacity : 'missing',
                tearsOpacity: tearsEl ? tearsEl.style.opacity : 'missing'
            };
        })()`);
        console.log('[CHECK 1] YAWN Geometry:', JSON.stringify(yawnGeometry));
        if (yawnGeometry.gapBetweenNoseAndMouth <= 0) {
            throw new Error(`Mieng ngap bi de len mui! Gap = ${yawnGeometry.gapBetweenNoseAndMouth}`);
        }
        if (yawnGeometry.tongueOpacity !== '1') {
            throw new Error(`Luoi hong khong hien thi khi ngap! Got: ${yawnGeometry.tongueOpacity}`);
        }
        if (yawnGeometry.tearsOpacity !== '0.85') {
            throw new Error(`Giot nuoc mat thoa man khong hien thi khi ngap! Got: ${yawnGeometry.tearsOpacity}`);
        }

        // Test 2: Hoat canh ngap day du (vươn vai, tay che miệng, thoai de thuong)
        console.log('[3] Kiem tra hoat canh triggerYawn()...');
        const animCheck = await client.evaluate(`(async () => {
            const comp = window.App.noriFloatingCompanion;
            comp.triggerYawn();

            // Kiem tra o pha 1 (sau 200ms)
            await new Promise(r => setTimeout(r, 200));
            const stage = comp.stage;
            const pawR = document.getElementById('Paw_Right');
            const bubble = comp.bubble;

            const stageTransformP1 = stage.style.transform;
            const pawRTransformP1 = pawR.style.transform;
            const bubbleText = bubble ? bubble.textContent : '';

            return {
                stageTransformP1,
                pawRTransformP1,
                bubbleText,
                isIdleAnimating: comp.isIdleAnimating
            };
        })()`);
        console.log('[CHECK 2] Hoat canh ngap pha 1:', animCheck);
        if (!animCheck.stageTransformP1.includes('scale') || !animCheck.stageTransformP1.includes('translateY')) {
            throw new Error(`Than Nori khong vuon vai khi ngap! Got: ${animCheck.stageTransformP1}`);
        }
        if (!animCheck.pawRTransformP1.includes('rotate') || !animCheck.pawRTransformP1.includes('translate')) {
            throw new Error(`Tay Nori khong che mieng khi ngap! Got: ${animCheck.pawRTransformP1}`);
        }
        if (!animCheck.bubbleText.includes('Oaaa') && !animCheck.bubbleText.includes('Oaaap') && !animCheck.bubbleText.includes('Ươm')) {
            throw new Error(`Thoai ngap khong dung! Got: ${animCheck.bubbleText}`);
        }

        // Chup hinh Nori dang ngap vuon vai de thuong
        await client.captureScreenshot('verify_nori_yawn_polite.png', {
            x: 550, y: 200, width: 220, height: 220, scale: 1
        });

        // Cho hoan tat ngap va tro ve binh thuong
        await sleep(2300);

        // Test 3: Kiem tra khong gian 3D - Nori phai bi an triet de
        console.log('[4] Chuyen sang che do 3D va kiem tra su bien mat hoan toan cua Nori...');
        const mode3DCheck = await client.evaluate(`(() => {
            const comp = window.App.noriFloatingCompanion;
            // Chuyen sang 3D
            window.App.toggleMode();

            const is3D = window.App.mode === '3D';
            const bodyHasClass = document.body.classList.contains('mode-3d');
            const compDisplay = comp.container.style.display;
            const compComputedDisplay = window.getComputedStyle(comp.container).display;

            const btnNori = document.getElementById('btnNoriEntity');
            const btnNoriComputed = btnNori ? window.getComputedStyle(btnNori).display : 'none';

            // Thu goi comp.show() khi dang o 3D -> Phai bi chan!
            comp.show();
            const showBlockedDisplay = window.getComputedStyle(comp.container).display;

            return {
                is3D,
                bodyHasClass,
                compDisplay,
                compComputedDisplay,
                btnNoriComputed,
                showBlockedDisplay
            };
        })()`);
        console.log('[CHECK 3] Trang thai Nori trong che do 3D:', mode3DCheck);
        if (!mode3DCheck.is3D || !mode3DCheck.bodyHasClass) {
            throw new Error('Chuyen sang 3D that bai!');
        }
        if (mode3DCheck.compComputedDisplay !== 'none') {
            throw new Error(`Nori floating companion van con hien thi tren 3D! computedDisplay = ${mode3DCheck.compComputedDisplay}`);
        }
        if (mode3DCheck.btnNoriComputed !== 'none') {
            throw new Error(`Nut Nori tren HUD van con hien thi tren 3D! computedDisplay = ${mode3DCheck.btnNoriComputed}`);
        }
        if (mode3DCheck.showBlockedDisplay !== 'none') {
            throw new Error(`comp.show() tren 3D khong bi chan! display = ${mode3DCheck.showBlockedDisplay}`);
        }

        // Chup anh man hinh 3D chung minh Nori bien mat sach se
        await client.captureScreenshot('verify_nori_hidden_in_3d.png', {
            x: 0, y: 0, width: 1400, height: 900, scale: 1
        });

        // Test 4: Chuyen nguoc lai 2D -> Cac nut phuc hoi binh thuong
        console.log('[5] Chuyen nguoc lai ve 2D...');
        const mode2DCheck = await client.evaluate(`(() => {
            window.App.toggleMode();
            const is2D = window.App.mode === '2D';
            const btnNori = document.getElementById('btnNoriEntity');
            const btnNoriComputed = btnNori ? window.getComputedStyle(btnNori).display : 'none';

            return {
                is2D,
                btnNoriComputed
            };
        })()`);
        console.log('[CHECK 4] Tro lai 2D:', mode2DCheck);
        if (!mode2DCheck.is2D) {
            throw new Error('Tro lai 2D that bai!');
        }
        if (mode2DCheck.btnNoriComputed === 'none') {
            throw new Error('Nut Nori tren HUD khong hien lai o 2D!');
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
