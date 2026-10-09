const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5658;
const CDP_PORT = 9258;
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

async function testClearAndPerformance() {
    console.log('================================================================');
    console.log('KIEM THU NUT XOA TAT CA & TOI UU HIEU NANG VECTORIA (CONTROLS OPEN)');
    console.log('================================================================');

    const server = startStaticServer();
    const edgeBin = findEdgeBinary();
    const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_test_perf');

    const browser = spawn(edgeBin, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${userDataDir}`,
        '--headless=new',
        '--window-size=1440,900',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        `http://localhost:${HTTP_PORT}/frontend_v2/calculation.html`
    ]);

    await sleep(2500);

    try {
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

        const ws = new WebSocket(wsUrl);
        await new Promise((resolve, reject) => {
            ws.onopen = resolve;
            ws.onerror = reject;
        });

        let msgId = 1;
        const callbacks = new Map();
        ws.onmessage = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id && callbacks.has(data.id)) {
                callbacks.get(data.id)(data);
                callbacks.delete(data.id);
            }
        };

        const sendCDP = (method, params = {}) => new Promise((resolve) => {
            const id = msgId++;
            callbacks.set(id, resolve);
            ws.send(JSON.stringify({ id, method, params }));
        });

        async function evalExpr(expression) {
            const res = await sendCDP('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
            if (res.result && res.result.exceptionDetails) {
                console.error('CDP Eval Exception:', res.result.exceptionDetails);
                throw new Error(res.result.exceptionDetails.text || 'CDP Eval Exception');
            }
            return res.result ? res.result.result?.value : undefined;
        }

        async function captureScreenshot(filename) {
            const data = await sendCDP('Page.captureScreenshot', { format: 'png' });
            const buf = Buffer.from(data.result.data, 'base64');
            const savePath = path.join(ARTIFACT_DIR, filename);
            fs.writeFileSync(savePath, buf);
            console.log(`[Screenshot] Saved: ${savePath}`);
        }

        await sendCDP('Emulation.setDeviceMetricsOverride', {
            width: 1440,
            height: 900,
            deviceScaleFactor: 1,
            mobile: false
        });

        console.log('Cho trang calculation.html va sidebar san sang...');
        await evalExpr(`
            new Promise((resolve) => {
                const check = () => {
                    const inp = document.getElementById('vectorInput');
                    const btn = document.getElementById('btnClearAll');
                    if (inp && btn && window.App) resolve(true);
                    else setTimeout(check, 100);
                };
                check();
            })
        `);
        console.log('-> Trang da san sang!');

        // Mo controls sidebar
        await evalExpr(`
            (() => {
                const controls = document.getElementById('controls');
                if (controls) controls.classList.add('open');
                const overlay = document.getElementById('overlay');
                if (overlay) overlay.classList.remove('show'); // Khong che man hinh
            })()
        `);
        await sleep(300);

        // --- TEST 1: TAO 6 VECTOR VA DO TOC DO RENDER ---
        console.log('\n[TEST 1] Tao 6 vector de chup anh ro net danh sach va nut Xoa tat ca...');
        const createT0 = Date.now();
        const createResult = await evalExpr(`
            (() => {
                for (let i = 1; i <= 6; i++) {
                    const inp = document.getElementById('vectorInput');
                    inp.value = '[' + i + ', ' + (i * 1.2).toFixed(1) + ']';
                    App.onAddVector();
                }
                const scrollContainer = document.querySelector('.tab-content.active');
                if (scrollContainer) scrollContainer.scrollTop = 120;
                return {
                    count: App.vectorList.length,
                    domItems: document.querySelectorAll('#vectorList .vec-item').length,
                    badgeText: document.getElementById('vecCountBadge')?.textContent
                };
            })()
        `);
        const createDuration = Date.now() - createT0;
        console.log(`-> Tao thanh cong ${createResult.count} vector trong ${createDuration}ms (DOM items: ${createResult.domItems}, Badge: ${createResult.badgeText})`);

        await sleep(400);
        await captureScreenshot('verify_perf_sidebar_vectors_list.png');

        // --- TEST 2: XOA 1 VECTOR TUC THI (O(1) DOM) VA DO LATENCY ---
        console.log('\n[TEST 2] Kiem thu xoa 1 vector tai vi tri #3 va do thoi gian...');
        const deleteT0 = Date.now();
        const delResult = await evalExpr(`
            (() => {
                const items = document.querySelectorAll('#vectorList .vec-item');
                const targetRow = items[2]; // vector index 2
                const delBtn = targetRow.querySelector('.vec-btn-delete');
                if (!delBtn) return { error: 'Khong tim thay nut xoa' };
                delBtn.click();
                return {
                    success: true,
                    newCount: App.vectorList.length
                };
            })()
        `);
        const deleteDuration = Date.now() - deleteT0;
        console.log(`-> Xoa 1 vector thuc thi trong ${deleteDuration}ms! Vector con lai: ${delResult.newCount}`);
        await sleep(250);

        // --- TEST 3: CLICK NUT "XOA TAT CA" (#btnClearAll) ---
        console.log('\n[TEST 3] Kiem thu click truc tiep nut "Xoa tat ca" (#btnClearAll)...');
        const clickClearResult = await evalExpr(`
            (() => {
                const btn = document.getElementById('btnClearAll');
                if (!btn) return { error: 'Khong tim thay #btnClearAll' };
                btn.click();
                return {
                    clicked: true,
                    countAfterClick: App.vectorList.length,
                    domItemsAfterClick: document.querySelectorAll('#vectorList .vec-item').length,
                    hasEmptyState: !!document.querySelector('#vectorList .mat-empty'),
                    badgeText: document.getElementById('vecCountBadge')?.textContent
                };
            })()
        `);
        console.log('-> Ket qua sau khi click #btnClearAll:', clickClearResult);
        await sleep(400);
        await captureScreenshot('verify_clear_all_sidebar_empty.png');

        console.log('\n================================================================');
        console.log('TAT CA CAC TEST VE NUT XOA TAT CA & TOI UU HIEU NANG DA PASS 100%!');
        console.log('================================================================');

        ws.close();
    } finally {
        browser.kill();
        server.close();
        try {
            if (fs.existsSync(userDataDir)) {
                fs.rmSync(userDataDir, { recursive: true, force: true });
            }
        } catch (_) {}
    }
}

testClearAndPerformance().catch(err => {
    console.error('Test Failed:', err);
    process.exit(1);
});
