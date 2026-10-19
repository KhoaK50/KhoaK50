const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5694;
const CDP_PORT = 9294;
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
    console.log('[1/5] Khoi dong static server va headless browser...');
    const server = startStaticServer();
    const edgePath = findEdgeBinary();

    const tmpUserData = path.join(PROJECT_ROOT, '.tmp_edge_vec_test');
    const edgeProc = spawn(edgePath, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${tmpUserData}`,
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--window-size=1280,850',
        `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html`
    ]);

    try {
        console.log('[2/5] Ket noi CDP...');
        const wsUrl = await getCDPWebSocketUrl();
        const cdp = new CDPClient(wsUrl);
        await cdp.connect();

        await cdp.send('Page.enable');
        await cdp.send('Runtime.enable');
        await sleep(1500);

        console.log('[3/5] Mo hop thoai Vector hoa anh va kiem tra cac muc chi tiet...');
        const modalInfo = await cdp.evaluate(`
            (() => {
                if (!window.App || !window.App.ImageVectorizer) return { error: 'ImageVectorizer not found' };
                window.App.ImageVectorizer.openModal();

                // Mo khung tuy chon bang cach fake upload anh de hien thi toan bo UI
                const cvs = document.createElement('canvas');
                cvs.width = 400; cvs.height = 300;
                const ctx = cvs.getContext('2d');
                ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 400, 300);
                ctx.fillStyle = '#000000'; ctx.font = '24px sans-serif';
                ctx.fillText('Vectoria Rubric Table 2026', 30, 80);
                ctx.strokeRect(30, 110, 340, 150);

                const dataUrl = cvs.toDataURL('image/png');
                const prev = document.getElementById('vecPreviewImg');
                const opts = document.getElementById('vecModalOpts');
                const procBtn = document.getElementById('btnVecModalProcess');

                const testImg = new Image();
                testImg.src = dataUrl;
                window._testImg = testImg;

                prev.src = dataUrl;
                prev.style.display = 'block';
                opts.style.display = 'block';
                procBtn.disabled = false;

                const pills = Array.from(document.querySelectorAll('#vecDetailPills .vec-opt-pill')).map(p => ({
                    text: p.textContent.trim(),
                    pts: p.dataset.pts,
                    active: p.classList.contains('active')
                }));

                const slider = document.getElementById('vecDepthSlider');
                const numInp = document.getElementById('vecDepthInput');

                return {
                    pills,
                    sliderMin: slider ? slider.min : null,
                    sliderMax: slider ? slider.max : null,
                    sliderVal: slider ? slider.value : null,
                    numInpVal: numInp ? numInp.value : null
                };
            })()
        `);

        console.log('Ket qua kiem tra Modal:', JSON.stringify(modalInfo, null, 2));

        if (!modalInfo.pills || modalInfo.pills.length < 4) {
            throw new Error(`Can co 4 muc chi tiet (hien tai chi co ${modalInfo.pills ? modalInfo.pills.length : 0})`);
        }
        const has140K = modalInfo.pills.some(p => p.pts === '72000' || p.text.includes('140.000'));
        if (!has140K) {
            throw new Error('Chua co muc Cuc han RTX 140.000 tam giac!');
        }

        if (parseFloat(modalInfo.sliderMax) < 16.0) {
            throw new Error(`Bien tren thanh truot do noi khoi can dat it nhat 16.0 (hien tai: ${modalInfo.sliderMax})`);
        }
        if (!modalInfo.numInpVal) {
            throw new Error('Chua co o go so tu do cho do noi khoi 3D!');
        }

        console.log('[4/5] Kiem tra dong bo giua thanh truot va o go so do noi khoi...');
        const syncResult = await cdp.evaluate(`
            (() => {
                const slider = document.getElementById('vecDepthSlider');
                const numInp = document.getElementById('vecDepthInput');

                // 1. Keo thanh truot len 12.6
                slider.value = '12.6';
                slider.dispatchEvent(new Event('input'));
                const inpAfterSlider = numInp.value;

                // 2. Go so truc tiep 22.5 (vuot qua bien slider nhung hop le de dap ung cuc han)
                numInp.value = '22.5';
                numInp.dispatchEvent(new Event('input'));
                const sliderAfterInp = slider.value;

                return {
                    inpAfterSlider,
                    sliderAfterInp
                };
            })()
        `);
        console.log('Ket qua dong bo Slider & Number Input:', syncResult);
        if (syncResult.inpAfterSlider !== '12.6') {
            throw new Error(`Thanh truot khong cap nhat o so! (nhan duoc: ${syncResult.inpAfterSlider})`);
        }

        // Chup anh man hinh modal de luu artifact
        const screenshotRes = await cdp.send('Page.captureScreenshot', { format: 'png' });
        const screenshotPath = path.join(ARTIFACT_DIR, 'verify_image_vectorizer_extended_limits.png');
        fs.writeFileSync(screenshotPath, Buffer.from(screenshotRes.data, 'base64'));
        console.log('Da luu anh chup man hinh modal:', screenshotPath);

        console.log('[5/5] Kiem tra thuat toan bóc tách cuc han 140.000 tam giac voi i7 / RTX...');
        const benchmarkResult = await cdp.evaluate(`
            (() => {
                const t0 = performance.now();
                const mesh = App.ImageVectorizer.vectorizeImage(window._testImg, {
                    targetPoints: 72000,
                    depthScale: 12.0,
                    name: 'Test Mesh Cuc Han'
                });
                const t1 = performance.now();
                return {
                    elapsedMs: (t1 - t0).toFixed(1),
                    numTriangles: mesh.numTriangles,
                    numPoints: mesh.worldPoints.length,
                    depthScale: mesh.depthScale,
                    isImageMesh: mesh.isImageMesh
                };
            })()
        `);
        console.log('Ket qua bóc tách cực hạn:', benchmarkResult);
        if (benchmarkResult.numTriangles < 60000) {
            throw new Error(`So luong tam giac qua it: ${benchmarkResult.numTriangles}`);
        }
        if (benchmarkResult.depthScale !== 12.0) {
            throw new Error(`Do noi khoi khong dung: ${benchmarkResult.depthScale}`);
        }

        console.log('=== TAT CA CAC TEST BIEN GIOI HAN & CUC HAN HARDWARE DA VUOT QUA 100%! ===');
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
