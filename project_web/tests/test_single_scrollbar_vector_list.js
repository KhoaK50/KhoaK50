const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5661;
const CDP_PORT = 9261;
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

async function runVerification() {
    console.log('================================================================');
    console.log('KIEM THU KIEN TRUC THANH CUON DON (SINGLE SCROLLBAR) CHO VECTOR');
    console.log('================================================================');

    const server = startStaticServer();
    const edgeBin = findEdgeBinary();
    const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_test_scrollbar');

    const browser = spawn(edgeBin, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${userDataDir}`,
        '--headless=new',
        '--window-size=1440,850',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        `http://localhost:${HTTP_PORT}/frontend_v2/calculation.html`
    ]);

    await sleep(2500);

    try {
        const pagesRes = await new Promise((resolve, reject) => {
            http.get(`http://localhost:${CDP_PORT}/json`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });

        const targetPage = pagesRes.find(p => p.type === 'page' && p.url.includes('calculation.html'));
        if (!targetPage) throw new Error('Khong tim thay target page');

        const ws = new WebSocket(targetPage.webSocketDebuggerUrl);
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
            const res = await sendCDP('Runtime.evaluate', { expression, returnByValue: true });
            if (res.result && res.result.exceptionDetails) {
                console.error('CDP Eval Exception:', res.result.exceptionDetails);
                throw new Error(res.result.exceptionDetails.text || 'CDP Eval Exception');
            }
            return res.result ? res.result.result?.value : undefined;
        }

        await sendCDP('Page.enable');
        await sendCDP('Runtime.enable');

        // Mo sidebar neu dang dong
        await evalExpr(`(() => {
            const controls = document.getElementById('controls');
            if (controls && !controls.classList.contains('open')) {
                controls.classList.add('open');
            }
        })()`);
        await sleep(500);

        // Them 16 vector de tao danh sach dai giong nhu cua nguoi dung
        console.log('\n--- BƯỚC 1: TẠO 16 VECTOR ---');
        const createResult = await evalExpr(`(() => {
            const inp = document.getElementById('vectorInput');
            const btn = document.getElementById('btnDraw');
            if (!inp || !btn) return { error: 'Khong tim thay input/btn' };

            for (let i = 1; i <= 16; i++) {
                inp.value = '[' + i + ', ' + (i * 2) + ']';
                App.onAddVector();
            }

            return {
                count: App.vectorList ? App.vectorList.length : 0,
                domItems: document.querySelectorAll('#vectorList .vec-item').length
            };
        })()`);

        console.log('Ket qua tao vector:', createResult);

        // Kiem tra cau truc cuon va vi tri cua form Khoi tao vector
        console.log('\n--- BƯỚC 2: KIỂM TRA TRẠNG THÁI CUỘN & VỊ TRÍ FORM TẠO VECTOR ---');
        const scrollCheck = await evalExpr(`(() => {
            const tab = document.getElementById('tabContentObjects');
            const vecList = document.getElementById('vectorList');
            const cardCreate = document.querySelector('.section-create');
            const btnDraw = document.getElementById('btnDraw');
            const listCard = document.querySelector('.section-list');

            const tabRect = tab ? tab.getBoundingClientRect() : null;
            const cardCreateRect = cardCreate ? cardCreate.getBoundingClientRect() : null;
            const btnDrawRect = btnDraw ? btnDraw.getBoundingClientRect() : null;
            const vecListRect = vecList ? vecList.getBoundingClientRect() : null;

            return {
                tabScrollTop: tab ? tab.scrollTop : -1,
                tabScrollHeight: tab ? tab.scrollHeight : -1,
                tabClientHeight: tab ? tab.clientHeight : -1,
                tabOverflowY: tab ? window.getComputedStyle(tab).overflowY : '',
                vecListScrollTop: vecList ? vecList.scrollTop : -1,
                vecListScrollHeight: vecList ? vecList.scrollHeight : -1,
                vecListClientHeight: vecList ? vecList.clientHeight : -1,
                vecListOverflowY: vecList ? window.getComputedStyle(vecList).overflowY : '',
                cardCreateVisible: cardCreateRect && cardCreateRect.top >= 0 && cardCreateRect.bottom <= window.innerHeight,
                cardCreateTop: cardCreateRect ? cardCreateRect.top : -1,
                btnDrawTop: btnDrawRect ? btnDrawRect.top : -1
            };
        })()`);

        console.log('Chi so cuon hien tai:', scrollCheck);

        // Mo phong cuon chuot tren danh sach vector va kiem tra container ngoai co bi thut xuong khong
        console.log('\n--- BƯỚC 3: CUỘN CHUỘT TRÊN DANH SÁCH VECTOR ---');
        const wheelResult = await evalExpr(`(() => {
            const vecList = document.getElementById('vectorList');
            const tab = document.getElementById('tabContentObjects');
            
            // Cuon danh sach vector xuong giua hoac cuoi
            vecList.scrollTop = 150;
            
            // Thu cuon them bang cach dispatch su kien wheel
            const wheelEv = new WheelEvent('wheel', { deltaY: 200, bubbles: true, cancelable: true });
            vecList.dispatchEvent(wheelEv);

            const cardCreate = document.querySelector('.section-create');
            const cardCreateRect = cardCreate ? cardCreate.getBoundingClientRect() : null;

            return {
                vecListScrollTop: vecList.scrollTop,
                tabScrollTop: tab ? tab.scrollTop : -1,
                cardCreateTop: cardCreateRect ? cardCreateRect.top : -1,
                isCardCreateStillAtTop: cardCreateRect && cardCreateRect.top >= 40 && cardCreateRect.top <= 140
            };
        })()`);

        console.log('Ket qua sau khi cuon:', wheelResult);

        // Chup anh man hinh luu vao Artifacts
        console.log('\n--- BƯỚC 4: CHỤP ẢNH MINH CHỨNG ARTIFACT ---');
        const screenshotRes = await sendCDP('Page.captureScreenshot', { format: 'png' });
        const screenshotPath = path.join(ARTIFACT_DIR, 'verify_single_scrollbar_vector_layout.png');
        fs.writeFileSync(screenshotPath, Buffer.from(screenshotRes.result.data, 'base64'));
        console.log(`Da chup anh minh chung: ${screenshotPath}`);

        ws.close();
    } finally {
        browser.kill();
        server.close();
        try {
            fs.rmSync(userDataDir, { recursive: true, force: true });
        } catch (_) {}
    }

    console.log('\n================================================================');
    console.log('HOAN THANH KIEM THU TRINH DUYET!');
    console.log('================================================================');
}

runVerification().catch(err => {
    console.error('Loi kiem thu:', err);
    process.exit(1);
});
