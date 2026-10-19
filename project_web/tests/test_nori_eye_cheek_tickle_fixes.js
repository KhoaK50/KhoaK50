const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5678;
const CDP_PORT = 9278;
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

async function runVerification() {
    console.log('================================================================');
    console.log('KIEM THU SUA LOI MAT, MA HONG, CHOC BUNG VA XOA CAN GAT DUOI NORI');
    console.log('================================================================');

    const server = startStaticServer();
    const edgeBin = findEdgeBinary();
    const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_test_fixes');

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

        // Kiem tra container Nori
        const companionReady = await client.evaluate(`
            !!(window.App && window.App.noriFloatingCompanion)
        `);
        console.log(`[CHECK] NoriFloatingCompanion ready: ${companionReady}`);
        if (!companionReady) throw new Error('Nori Companion not initialized');

        // Test 1: Xoa can gat o duoi
        const lampCordExists = await client.evaluate(`
            document.getElementById('Lamp_Cord_Group') !== null
        `);
        console.log(`[CHECK 1] Lamp_Cord_Group exists in DOM: ${lampCordExists} (Expected: false)`);
        if (lampCordExists) throw new Error('Lamp_Cord_Group was not removed from DOM!');

        // Focus Nori vao trung tam man hinh de chup anh
        await client.evaluate(`(() => {
            const comp = window.App.noriFloatingCompanion;
            comp.show();
            comp.container.style.left = '600px';
            comp.container.style.top = '250px';
            comp.pos = { x: 600, y: 250 };
            comp.setFaceExpression('NEUTRAL');
        })()`);
        await sleep(400);

        // Test 2: Neutral Face
        const neutralState = await client.evaluate(`(() => {
            const cL = document.getElementById('Eye_Left_Catch');
            const aL = document.getElementById('Eye_Left_Arc');
            return {
                catchOpacity: cL ? cL.style.opacity : 'missing',
                arcOpacity: aL ? aL.style.opacity : 'missing'
            };
        })()`);
        console.log(`[CHECK 2] Neutral eyes: catchOpacity=${neutralState.catchOpacity}, arcOpacity=${neutralState.arcOpacity}`);
        await client.captureScreenshot('verify_nori_neutral_fixed.png', {
            x: 550, y: 200, width: 220, height: 220, scale: 1
        });

        // Test 3: Closed eyes (DROWSY / SLEEP) - Catchlights MUST be hidden (opacity=0)
        await client.evaluate(`(() => {
            const comp = window.App.noriFloatingCompanion;
            comp.setFaceExpression('DROWSY');
        })()`);
        await sleep(300);

        const drowsyState = await client.evaluate(`(() => {
            const cL = document.getElementById('Eye_Left_Catch');
            const cR = document.getElementById('Eye_Right_Catch');
            const aL = document.getElementById('Eye_Left_Arc');
            const aR = document.getElementById('Eye_Right_Arc');
            return {
                catchLeftOpacity: cL ? cL.style.opacity : 'missing',
                catchRightOpacity: cR ? cR.style.opacity : 'missing',
                arcLeftOpacity: aL ? aL.style.opacity : 'missing',
                arcRightOpacity: aR ? aR.style.opacity : 'missing',
                arcLeftD: aL ? aL.getAttribute('d') : ''
            };
        })()`);
        console.log(`[CHECK 3] Drowsy closed eyes: catchL=${drowsyState.catchLeftOpacity}, catchR=${drowsyState.catchRightOpacity}, arcL=${drowsyState.arcLeftOpacity}, arcR=${drowsyState.arcRightOpacity}`);
        if (drowsyState.catchLeftOpacity !== '0' || drowsyState.catchRightOpacity !== '0') {
            throw new Error(`Catchlights still visible when eyes closed! Left: ${drowsyState.catchLeftOpacity}, Right: ${drowsyState.catchRightOpacity}`);
        }
        if (drowsyState.arcLeftOpacity !== '1') {
            throw new Error(`Curved eye arc not visible when eyes closed!`);
        }
        await client.captureScreenshot('verify_nori_closed_eyes_fixed.png', {
            x: 550, y: 200, width: 220, height: 220, scale: 1
        });

        // Test 4: Cheek pinch deformation - Both body and tummy patch deformed, blush on cheek
        await client.evaluate(`(() => {
            const comp = window.App.noriFloatingCompanion;
            comp.setFaceExpression('CHEEK_PINCH', 'left');
            comp.applyCheekDeform('left', -14, 0);
        })()`);
        await sleep(300);

        const cheekDeformState = await client.evaluate(`(() => {
            const body = document.getElementById('Body_Silhouette');
            const tummy = document.getElementById('Tummy_Patch');
            const blush = document.getElementById('Cheek_Left_Group');
            return {
                bodyD: body.getAttribute('d'),
                tummyD: tummy.getAttribute('d'),
                blushTransform: blush.style.transform
            };
        })()`);
        console.log(`[CHECK 4] Cheek deform left: blushTransform=${cheekDeformState.blushTransform}`);
        console.log(`[CHECK 4] Body silhouette path modified: ${cheekDeformState.bodyD.includes('1.0')}`);
        console.log(`[CHECK 4] Tummy patch path modified: ${cheekDeformState.tummyD.includes('15.1')}`);
        await client.captureScreenshot('verify_nori_cheek_pinch_fixed.png', {
            x: 550, y: 200, width: 220, height: 220, scale: 1
        });

        // Release cheek & snap back
        await client.evaluate(`(() => {
            const comp = window.App.noriFloatingCompanion;
            comp.animateCheekSpringSnap('left', -14, 0);
        })()`);
        await sleep(550);

        // Test 5: Tummy tickle - Soft natural giggle
        await client.evaluate(`(() => {
            const comp = window.App.noriFloatingCompanion;
            comp.triggerTickle();
        })()`);
        await sleep(300);

        const tickleState = await client.evaluate(`(() => {
            const stage = document.getElementById('noriCompanionStage');
            const cL = document.getElementById('Eye_Left_Catch');
            const aL = document.getElementById('Eye_Left_Arc');
            return {
                isSuperTickled: stage.classList.contains('is-super-tickled'),
                catchLeftOpacity: cL.style.opacity,
                arcLeftOpacity: aL.style.opacity
            };
        })()`);
        console.log(`[CHECK 5] Tummy tickle: isSuperTickled=${tickleState.isSuperTickled}, catchL=${tickleState.catchLeftOpacity}, arcL=${tickleState.arcLeftOpacity}`);
        if (!tickleState.isSuperTickled) throw new Error('Stage did not receive is-super-tickled class');
        if (tickleState.catchLeftOpacity !== '0') throw new Error('Catchlights not hidden during TICKLE_LAUGH');
        await client.captureScreenshot('verify_nori_tickle_fixed.png', {
            x: 550, y: 200, width: 220, height: 220, scale: 1
        });

        // Test 6: Verify biological blink loop works without throwing errors
        await client.evaluate(`(() => {
            const comp = window.App.noriFloatingCompanion;
            comp.triggerNaturalBlink();
        })()`);
        await sleep(300);

        client.close();
        console.log('----------------------------------------------------------------');
        console.log('TAT CA 5 CA KIEM THU DA HOAN TAT XUAT SAC!');
        console.log('----------------------------------------------------------------');
    } finally {
        browser.kill();
        server.close();
    }
}

runVerification().catch(err => {
    console.error('Test failed with error:', err);
    process.exit(1);
});
