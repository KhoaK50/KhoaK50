const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5689;
const CDP_PORT = 9289;
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
    console.log('KIEM THU: TACH BIET CHOC BUNG VS CHAO HOI & 5-CLICK GIAN DOI');
    console.log('================================================================');

    const server = startStaticServer();
    const edgeBin = findEdgeBinary();
    const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_test_tummy');

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

        // Kiem tra loi Javascript tren console
        console.log(`[CHECK 0] DevTools Console errors count: ${client.consoleErrors.length}`);
        if (client.consoleErrors.length > 0) {
            console.warn('[WARNING] Console errors captured:', client.consoleErrors);
        }

        // Test 1: Hitbox bung da duoc thu gon ve vung bung duoi
        const hitboxCheck = await client.evaluate(`(() => {
            const tummy = document.getElementById('Tummy_Group');
            if (!tummy) return { error: 'Tummy_Group not found' };
            const ellipse = tummy.querySelector('ellipse');
            return {
                cx: ellipse ? ellipse.getAttribute('cx') : null,
                cy: ellipse ? ellipse.getAttribute('cy') : null,
                rx: ellipse ? ellipse.getAttribute('rx') : null,
                ry: ellipse ? ellipse.getAttribute('ry') : null
            };
        })()`);
        console.log('[CHECK 1] Tummy hitbox ellipse:', JSON.stringify(hitboxCheck));
        if (hitboxCheck.rx !== '14' || hitboxCheck.ry !== '10' || hitboxCheck.cy !== '67') {
            throw new Error(`Hitbox not properly refined: expected cx=50 cy=67 rx=14 ry=10, got ${JSON.stringify(hitboxCheck)}`);
        }

        // Test 2: Choc bung chi goi tickle, khong bi chong cheo loi chao hoi
        console.log('[2] Kiem tra click vao bung Nori...');
        const tummyTickleRes = await client.evaluate(`(async () => {
            const comp = window.App.noriFloatingCompanion;
            comp.show();
            const bubble = comp.bubble;
            const tummy = document.getElementById('Tummy_Group');
            
            // Dispatch pointerdown, pointerup, click tren Tummy
            tummy.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 600, clientY: 300 }));
            tummy.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 600, clientY: 300 }));
            tummy.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 600, clientY: 300 }));

            // Cho 180ms de phan hoi cuoi (sau 110ms) chay xong
            await new Promise(r => setTimeout(r, 180));

            return {
                isTickling: comp.isTickling,
                bubbleText: bubble ? bubble.textContent : ''
            };
        })()`);
        console.log('[CHECK 2] Sau khi click vao bung:', tummyTickleRes);
        if (!tummyTickleRes.isTickling && !tummyTickleRes.bubbleText.includes('Nhột') && !tummyTickleRes.bubbleText.includes('tha') && !tummyTickleRes.bubbleText.includes('UWU')) {
            throw new Error('Click vao bung khong kich hoat cuoi nhot!');
        }
        if (tummyTickleRes.bubbleText.includes('Ơi, Nori đây')) {
            throw new Error('Click vao bung bi chong cheo loi chao hoi "Ơi, Nori đây"!');
        }

        await sleep(1800); // Cho hoi phuc ve neutral

        // Test 3: Click vao dau/than tren khong vung bung -> Kich hoat loi chao hoi Nori
        console.log('[3] Kiem tra click nhe vao than Nori...');
        const bodyGreetingRes = await client.evaluate(`(() => {
            const comp = window.App.noriFloatingCompanion;
            const body = document.getElementById('Body_Silhouette');
            const bubble = comp.bubble;

            body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 600, clientY: 230 }));
            body.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 600, clientY: 230 }));

            return {
                isTickling: comp.isTickling,
                bubbleText: bubble ? bubble.textContent : ''
            };
        })()`);
        console.log('[CHECK 3] Sau khi click than:', bodyGreetingRes);
        if (!bodyGreetingRes.bubbleText.includes('Ơi, Nori đây')) {
            throw new Error(`Click than khong phan hoi loi chao! Got: ${bodyGreetingRes.bubbleText}`);
        }
        if (bodyGreetingRes.isTickling) {
            throw new Error('Click than lai bi nham thanh choc bung!');
        }

        await sleep(600);

        // Test 4: Bam 5 lan lien tuc kich hoat Easter Egg gian doi (Puff-up Blowfish)
        console.log('[4] Kiem tra bam 5 lan lien tuc de kich hoat gian doi...');
        const rapid5Res = await client.evaluate(`(async () => {
            const comp = window.App.noriFloatingCompanion;
            const stage = comp.stage;
            const bubble = comp.bubble;

            // Bam nhanh 5 lan
            for (let i = 0; i < 5; i++) {
                stage.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                await new Promise(r => setTimeout(r, 60));
            }

            return {
                isPuffed: comp.isPuffed,
                hasPuffedClass: stage.classList.contains('is-puffed'),
                bubbleText: bubble ? bubble.textContent : '',
                pendingReturnTimerExists: !!comp.pendingReturnTimer
            };
        })()`);
        console.log('[CHECK 4] Sau 5 click nhanh:', rapid5Res);
        if (!rapid5Res.isPuffed || !rapid5Res.hasPuffedClass) {
            throw new Error('5 click nhanh khong kich hoat isPuffed!');
        }
        if (rapid5Res.pendingReturnTimerExists) {
            throw new Error('5 click van de lai pendingReturnTimer khien Nori bay ve goc!');
        }
        if (!rapid5Res.bubbleText.includes('Phồng má giận luôn') && !rapid5Res.bubbleText.includes('bóp xả stress')) {
            throw new Error(`Bubble text sai khi gian doi: ${rapid5Res.bubbleText}`);
        }

        // Chup hinh Nori phong ma gian doi
        await client.captureScreenshot('verify_nori_puffed_5click.png', {
            x: 520, y: 180, width: 260, height: 260, scale: 1
        });

        // Test 5: Double click (2 lan click roi dung) -> Kich hoat quay ve goc toa do sau 340ms
        console.log('[5] Cho Nori het gian doi roi test double-click ve goc...');
        await sleep(3000); // Cho het isPuffed

        const doubleClickRes = await client.evaluate(`(async () => {
            const comp = window.App.noriFloatingCompanion;
            const stage = comp.stage;

            // Click 2 lan
            stage.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await new Promise(r => setTimeout(r, 70));
            stage.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            const immediateTimer = !!comp.pendingReturnTimer;

            // Cho 400ms (> 340ms debounce)
            await new Promise(r => setTimeout(r, 400));
            const bubbleTextAtReturn = comp.bubble ? comp.bubble.textContent : '';

            // Cho them 450ms de hoan tat animation bay va hide
            await new Promise(r => setTimeout(r, 450));
            const isHidden = comp.container.style.display === 'none';

            return {
                immediateTimer,
                pendingReturnTimerAfter: !!comp.pendingReturnTimer,
                bubbleTextAtReturn,
                isHidden
            };
        })()`);
        console.log('[CHECK 5] Double click ket qua:', doubleClickRes);
        if (!doubleClickRes.immediateTimer) {
            throw new Error('Double click khong thiet lap pendingReturnTimer!');
        }
        if (!doubleClickRes.bubbleTextAtReturn.includes('Đáp xuống gốc tọa độ') && !doubleClickRes.isHidden) {
            throw new Error(`Double click sau 340ms khong kich hoat returnToOrigin! Got bubble: "${doubleClickRes.bubbleTextAtReturn}", isHidden: ${doubleClickRes.isHidden}`);
        }

        client.close();
        console.log('----------------------------------------------------------------');
        console.log('TAT CA 5 CHECKPOINT KIEM THU DA THANH CONG 100%!');
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
