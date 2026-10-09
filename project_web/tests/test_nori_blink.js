const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5665;
const CDP_PORT = 9265;
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/frontend_v2/calculation.html';
    const filePath = path.join(PROJECT_ROOT, reqPath.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) {
        res.writeHead(404); res.end('Not Found'); return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png' };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
}).listen(HTTP_PORT);

const edgeBin = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_blink_test');

(async () => {
    const browser = spawn(edgeBin, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${userDataDir}`,
        '--headless=new',
        '--window-size=1440,900',
        '--disable-gpu',
        `http://localhost:${HTTP_PORT}/frontend_v2/calculation.html`
    ]);
    await sleep(2500);

    try {
        const pagesRes = await new Promise((resolve, reject) => {
            http.get(`http://localhost:${CDP_PORT}/json`, (res) => {
                let data = ''; res.on('data', c => data += c); res.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });
        const targetPage = pagesRes.find(p => p.url.includes('calculation.html'));
        const ws = new WebSocket(targetPage.webSocketDebuggerUrl);
        await new Promise(r => ws.onopen = r);

        let msgId = 1;
        const callbacks = new Map();
        ws.onmessage = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id && callbacks.has(data.id)) {
                callbacks.get(data.id).resolve(data.result);
                callbacks.delete(data.id);
            }
        };
        const sendCDP = (method, params = {}) => new Promise(resolve => {
            const id = msgId++;
            callbacks.set(id, { resolve });
            ws.send(JSON.stringify({ id, method, params }));
        });

        await sendCDP('Runtime.enable');
        await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                if (!App.noriEntityActive) App.toggleNoriEntity();
                App.activeNoriTransformMatrix = [[1, 0], [0, 1]];
                window._origNow = performance.now;
                performance.now = () => 4100;
                if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
            })()`
        });
        await sleep(150);

        const shot = await sendCDP('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_nori_blinking_fixed.png'), Buffer.from(shot.data, 'base64'));

        await sendCDP('Runtime.evaluate', {
            expression: `(() => {
                if (window._origNow) performance.now = window._origNow;
            })()`
        });
        console.log('Chup thanh cong: verify_nori_blinking_fixed.png');
    } finally {
        browser.kill();
        server.close();
        try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
    }
})();
