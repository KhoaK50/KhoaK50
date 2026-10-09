const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const HTTP_PORT = 5654;
const CDP_PORT = 9254;
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

async function verifyOverlap() {
    const server = startStaticServer();
    const edgeBin = findEdgeBinary();
    const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_test_overlap');

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
        const wsUrl = targetPage.webSocketDebuggerUrl;

        ws = new WebSocket(wsUrl);
        await new Promise((resolve, reject) => {
            ws.onopen = resolve;
            ws.onerror = reject;
        });

        const callbacks = new Map();
        ws.onmessage = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id && callbacks.has(data.id)) {
                callbacks.get(data.id)(data);
                callbacks.delete(data.id);
            }
        };

        const send = (method, params = {}) => new Promise((resolve) => {
            const id = msgId++;
            callbacks.set(id, resolve);
            ws.send(JSON.stringify({ id, method, params }));
        });

        await send('Runtime.enable');
        await send('Page.enable');
        await sleep(1000);

        // Setup the 3 vectors exactly as shown in user's image:
        // v1: [-0.68, 3.61, 0] (red)
        // v2: [1, 2, 0] (green)
        // v3: [1, 2, 0] (purple)
        const setupRes = await send('Runtime.evaluate', {
            expression: `(function() {
                window.App.vectorList = [
                    { id: 1, name: "v_1", vec: [-0.68, 3.61, 0], visible: true, colorHex: "#ef4444", colorCss: "#ef4444", showArrow: true },
                    { id: 2, name: "v_2", vec: [1, 2, 0], visible: true, colorHex: "#22c55e", colorCss: "#22c55e", showArrow: true },
                    { id: 3, name: "v_3", vec: [1, 2, 0], visible: true, colorHex: "#a855f7", colorCss: "#a855f7", showArrow: true }
                ];
                // Switch to 3D
                if (window.App.mode !== "3D") {
                    window.App.toggleMode();
                }
                Vec3D.hardRefresh3D(false);

                // Check label positions in 3D
                const labelPositions = [];
                for (const g of Vec3D._vectorsGroup.children) {
                    const lbl = g.children.find(ch => ch.isCSS2DObject && ch.name === "tipLabel");
                    if (lbl && lbl.element) {
                        const rect = lbl.element.getBoundingClientRect();
                        labelPositions.push({
                            id: g.userData?.vectorId,
                            text: lbl.element.innerText.trim().replace(/\\s+/g, ' '),
                            left: rect.left,
                            top: rect.top,
                            width: rect.width,
                            height: rect.height,
                            visible: lbl.visible,
                            display: lbl.element.style.display
                        });
                    }
                }
                return {
                    labelPositions
                };
            })()`,
            returnByValue: true
        });

        console.log('[Setup 3 Vectors in 3D]:', JSON.stringify(setupRes.result?.result?.value, null, 2));

    } catch (err) {
        console.error('Test error:', err);
    } finally {
        if (ws) ws.close();
        browser.kill();
        server.close();
        try {
            fs.rmSync(userDataDir, { recursive: true, force: true });
        } catch (e) {}
    }
}

verifyOverlap();
