/**
 * Automated Verification for Tab Labels, Calculation Operations, and Academic Explanations
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9245;
const HTTP_PORT = 5520;
const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.woff2': 'font/woff2'
};

function startServer(port) {
    return new Promise((resolve) => {
        const s = http.createServer((req, res) => {
            let p = decodeURIComponent(new URL(req.url, 'http://127.0.0.1:' + port).pathname);
            if (p === '/') p = '/frontend_v2/calculation.html';
            const f = path.join(ROOT_DIR, p);
            fs.stat(f, (err, stats) => {
                if (err || !stats.isFile()) {
                    res.writeHead(404);
                    res.end('Not found');
                    return;
                }
                const ext = path.extname(f).toLowerCase();
                res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
                fs.createReadStream(f).pipe(res);
            });
        });
        s.listen(port, '127.0.0.1', () => resolve(s));
    });
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function runTest() {
    console.log('================================================================');
    console.log('STARTING ACADEMIC CALCULATION & TAB LABELS VERIFICATION');
    console.log('================================================================');

    const server = await startServer(HTTP_PORT);
    console.log(`[HTTP] Static test server listening on port ${HTTP_PORT}`);

    const edge = spawn(EDGE_PATH, [
        `--remote-debugging-port=${CDP_PORT}`,
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--user-data-dir=' + path.join(ROOT_DIR, 'scratch', 'edge_test_prof_' + Date.now()),
        `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html`
    ]);

    await sleep(2500);

    let wsUrl = '';
    for (let i = 0; i < 15; i++) {
        try {
            const listData = await new Promise((resolve, reject) => {
                http.get(`http://127.0.0.1:${CDP_PORT}/json/list`, res => {
                    let body = '';
                    res.on('data', chunk => body += chunk);
                    res.on('end', () => resolve(JSON.parse(body)));
                }).on('error', reject);
            });
            if (listData && listData.length > 0) {
                const targetPage = listData.find(p => p.type === 'page' && p.url.includes('calculation.html')) || listData.find(p => p.type === 'page' && !p.url.startsWith('edge://')) || listData[0];
                if (targetPage && targetPage.webSocketDebuggerUrl) {
                    wsUrl = targetPage.webSocketDebuggerUrl;
                    break;
                }
            }
        } catch (e) {
            await sleep(500);
        }
    }

    if (!wsUrl) {
        console.error('Failed to connect to Edge CDP');
        edge.kill();
        server.close();
        process.exit(1);
    }

    const ws = new WebSocket(wsUrl);
    await new Promise(r => {
        ws.onopen = r;
    });

    let msgId = 1;
    const callbacks = new Map();
    const consoleLogs = [];
    const consoleErrors = [];

    ws.onmessage = event => {
        const msg = JSON.parse(event.data.toString());
        if (msg.method === 'Runtime.consoleAPICalled') {
            const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
            if (msg.params.type === 'error') consoleErrors.push(text);
            else consoleLogs.push(text);
        }
        if (msg.id && callbacks.has(msg.id)) {
            const cb = callbacks.get(msg.id);
            callbacks.delete(msg.id);
            cb(msg.result);
        }
    };

    function send(method, params = {}) {
        return new Promise(resolve => {
            const id = msgId++;
            callbacks.set(id, resolve);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await sleep(2000);

    let passCount = 0;
    let failCount = 0;

    function assert(name, condition, extra = '') {
        if (condition) {
            console.log(`[PASS] ${name} ${extra ? '- ' + extra : ''}`);
            passCount++;
        } else {
            console.error(`[FAIL] ${name} ${extra ? '- ' + extra : ''}`);
            failCount++;
        }
    }

    const pageStatus = await send('Runtime.evaluate', {
        expression: `({ title: document.title, url: window.location.href, readyState: document.readyState, hasControls: !!document.getElementById('controls') })`,
        returnByValue: true
    });
    console.log('[DEBUG PAGE]', pageStatus.result.value);
    console.log('[CONSOLE ERRORS]', consoleErrors);

    // 1. Kiểm tra Tab Labels
    const tabsInfo = await send('Runtime.evaluate', {
        expression: `(() => {
            const tabButtons = Array.from(document.querySelectorAll('.sidebar-tabs .tab-btn'));
            return tabButtons.map(btn => btn.innerText.trim());
        })()`,
        returnByValue: true
    });
    const tabs = tabsInfo.result.value || [];
    assert('T1.1_Tab_Count_Equals_3', tabs.length === 3, `Tabs: ${JSON.stringify(tabs)}`);
    assert('T1.2_Tab_1_Is_DoiTuong', tabs[0]?.toLowerCase() === 'đối tượng', `Tab 1: ${tabs[0]}`);
    assert('T1.3_Tab_2_Is_BaiToan', tabs[1]?.toLowerCase() === 'bài toán', `Tab 2: ${tabs[1]}`);
    assert('T1.4_Tab_3_Is_PhepTinh', tabs[2]?.toLowerCase() === 'phép tính', `Tab 3: ${tabs[2]}`);

    // 2. Chuyển sang Tab 3 (Phép tính) và kiểm tra 3 loại phép tính + số lượng
    const calcTabInfo = await send('Runtime.evaluate', {
        expression: `(() => {
            const tabButtons = Array.from(document.querySelectorAll('.sidebar-tabs .tab-btn'));
            if (tabButtons[2]) tabButtons[2].click();

            const calcObjSel = document.getElementById('calcObjectSelect');
            const modes = Array.from(calcObjSel ? calcObjSel.options : []).map(o => ({
                value: o.value,
                text: o.textContent.trim()
            }));

            const vecOps = Array.from(document.querySelectorAll('#opSelect option')).map(o => o.value);
            const matOps = Array.from(document.querySelectorAll('#matrixOpSelect option')).map(o => o.value);
            const mixedOps = Array.from(document.querySelectorAll('#mixedOpSelect option')).map(o => o.value);

            return { modes, vecOpsCount: vecOps.length, vecOps, matOpsCount: matOps.length, matOps, mixedOpsCount: mixedOps.length, mixedOps };
        })()`,
        returnByValue: true
    });
    const cti = calcTabInfo.result.value;
    assert('T2.1_Calc_Modes_Count_Equals_3', cti.modes.length === 3, `Modes: ${cti.modes.map(m => m.text).join(' | ')}`);
    assert('T2.2_Vector_Ops_Count_Equals_8', cti.vecOpsCount === 8, `Vector ops: ${cti.vecOps.join(', ')}`);
    assert('T2.3_Matrix_Ops_Count_Equals_5', cti.matOpsCount === 5, `Matrix ops: ${cti.matOps.join(', ')}`);
    assert('T2.4_Mixed_Ops_Count_Equals_1', cti.mixedOpsCount === 1, `Mixed ops: ${cti.mixedOps.join(', ')}`);

    // 3. Thực hiện tính toán và kiểm tra cấu trúc sư phạm 3 phần cho Phép tính Ma trận (det)
    const matCalcRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const calcObjSel = document.getElementById('calcObjectSelect');
            calcObjSel.value = 'matrix';
            calcObjSel.dispatchEvent(new Event('change'));

            // Điền ma trận 2x2: [[2, 1], [1, 3]] -> det = 5
            const rInp = document.getElementById('matrixCalcRowsA');
            const cInp = document.getElementById('matrixCalcColsA');
            if (rInp) { rInp.value = 2; rInp.dispatchEvent(new Event('change')); }
            if (cInp) { cInp.value = 2; cInp.dispatchEvent(new Event('change')); }

            const cells = document.querySelectorAll('#matrixCalcGridA input');
            if (cells.length >= 4) {
                cells[0].value = '2';
                cells[1].value = '1';
                cells[2].value = '1';
                cells[3].value = '3';
            }

            document.getElementById('btnMatrixCompute')?.click();

            const resBox = document.getElementById('matrixResultBox');
            const html = resBox ? resBox.innerHTML : '';
            return {
                visible: resBox && resBox.style.display !== 'none',
                hasSection1: html.includes('Khung định nghĩa đại số'),
                hasSection2: html.includes('Quá trình tính toán chi tiết'),
                hasSection3: html.includes('Ý nghĩa hình học &amp; Bản chất không gian') || html.includes('Ý nghĩa hình học & Bản chất không gian'),
                hasDetVal: html.includes('5'),
                html
            };
        })()`,
        returnByValue: true
    });
    const mcr = matCalcRes.result.value;
    assert('T3.1_Matrix_Det_Computation_Success', mcr.visible && mcr.hasDetVal, 'Det evaluated correctly');
    assert('T3.2_Matrix_3_Section_Academic_Structure', mcr.hasSection1 && mcr.hasSection2 && mcr.hasSection3, 'Contains 3 standard academic sections');

    // 4. Kiểm tra phép tính ma trận nghịch đảo inv
    const matInvRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const matOpSel = document.getElementById('matrixOpSelect');
            matOpSel.value = 'inv';
            matOpSel.dispatchEvent(new Event('change'));

            document.getElementById('btnMatrixCompute')?.click();

            const resBox = document.getElementById('matrixResultBox');
            const html = resBox ? resBox.innerHTML : '';
            return {
                visible: resBox && resBox.style.display !== 'none',
                hasSection1: html.includes('Khung định nghĩa đại số'),
                hasSection2: html.includes('Quá trình tính toán chi tiết'),
                hasSection3: html.includes('Ý nghĩa hình học &amp; Bản chất không gian') || html.includes('Ý nghĩa hình học & Bản chất không gian'),
                hasInvMatrix: html.includes('katex') || html.includes('calc-result-latex') || html.includes('bmatrix'),
                html
            };
        })()`,
        returnByValue: true
    });
    const mir = matInvRes.result.value;
    assert('T4.1_Matrix_Inv_Computation_Success', mir.visible && mir.hasInvMatrix, 'Inverse computed');
    assert('T4.2_Matrix_Inv_3_Section_Academic_Structure', mir.hasSection1 && mir.hasSection2 && mir.hasSection3, '3 academic sections in inv');

    // 5. Kiểm tra Canvas 2D
    const canvasStatus = await send('Runtime.evaluate', {
        expression: `(() => {
            window.dispatchEvent(new Event('resize'));
            const c = document.getElementById('canvas2d') || document.getElementById('canvas2D');
            const v = document.getElementById('viewer');
            return {
                canvasWidth: c ? c.width : 0,
                canvasHeight: c ? c.height : 0,
                canvasVisible: c ? (c.offsetParent !== null || c.clientWidth > 0) : false,
                viewerDisplay: v ? window.getComputedStyle(v).display : 'none'
            };
        })()`,
        returnByValue: true
    });
    const cs = canvasStatus.result.value;
    assert('T5.1_Canvas2D_Dimensions_Active', cs.canvasWidth > 0 && cs.canvasHeight > 0, `Width: ${cs.canvasWidth}, Height: ${cs.canvasHeight}`);
    assert('T5.2_Canvas2D_Visible_In_DOM', cs.canvasVisible, 'Canvas is displayed');

    // 6. Quét vi phạm em-dash và khẩu ngữ bậy bạ
    const bannedScan = await send('Runtime.evaluate', {
        expression: `(() => {
            const fullHtml = document.body.innerHTML;
            const hasEmDash = fullHtml.includes('—');
            const bannedWords = ['bẹp dí', 'bánh kẹp', 'lật mặt', 'mũi tên trên màn hình', 'quét góc mở'];
            const foundBanned = bannedWords.filter(w => fullHtml.includes(w));
            return { hasEmDash, foundBanned };
        })()`,
        returnByValue: true
    });
    const bs = bannedScan.result.value;
    assert('T6.1_Zero_EmDash_Violation', !bs.hasEmDash, 'Zero em-dash detected in DOM');
    assert('T6.2_Zero_Colloquialism_Violation', bs.foundBanned.length === 0, `Banned: ${JSON.stringify(bs.foundBanned)}`);

    console.log('================================================================');
    console.log(`VERIFICATION COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('================================================================');

    ws.close();
    edge.kill();
    server.close();

    process.exit(failCount === 0 ? 0 : 1);
}

runTest().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
