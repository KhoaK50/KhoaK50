/**
 * Automated Verification for 3-Tab Architecture (Classic UI/UX) & Anti-Slop Layout
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9260;
const HTTP_PORT = 5535;
const ROOT_DIR = path.resolve(__dirname, '..');
const ARTIFACT_DIR = 'C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81';

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
    console.log('STARTING CLASSIC 3-TAB ARCHITECTURE & ANTI-SLOP VERIFICATION');
    console.log('================================================================');

    const server = await startServer(HTTP_PORT);
    console.log(`[HTTP] Static server active on port ${HTTP_PORT}`);

    const edge = spawn(EDGE_PATH, [
        `--remote-debugging-port=${CDP_PORT}`,
        '--headless=new',
        '--window-size=1400,900',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--user-data-dir=' + path.join(ROOT_DIR, 'scratch', 'edge_3tab_test_' + Date.now()),
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
    await new Promise(r => { ws.onopen = r; });

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

    // Mở sidebar nếu đang đóng
    await send('Runtime.evaluate', {
        expression: `(() => {
            const controls = document.getElementById('controls');
            if (controls && !controls.classList.contains('open')) {
                const btn = document.getElementById('floatingHamburger') || document.getElementById('hamburger');
                if (btn) btn.click();
            }
        })()`
    });
    await sleep(600);

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

    // T0: Console Error Check
    console.log('[CONSOLE ERRORS]', consoleErrors);
    const criticalErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('mathfield'));
    assert('T0_No_Critical_Console_Errors', criticalErrors.length === 0, `Errors: ${JSON.stringify(criticalErrors)}`);

    // T1: Check 3 Tabs Count and Names
    const tabsData = await send('Runtime.evaluate', {
        expression: `(() => {
            const tabButtons = Array.from(document.querySelectorAll('.sidebar-tabs .tab-btn'));
            return tabButtons.map(btn => btn.innerText.trim());
        })()`,
        returnByValue: true
    });
    const tabs = tabsData.result.value || [];
    assert('T1.1_Tab_Count_Equals_3', tabs.length === 3, `Tabs: ${JSON.stringify(tabs)}`);
    assert('T1.2_Tab_0_Is_DoiTuong', tabs[0]?.toUpperCase() === 'ĐỐI TƯỢNG', `Tab 0: ${tabs[0]}`);
    assert('T1.3_Tab_1_Is_BaiToan', tabs[1]?.toUpperCase() === 'BÀI TOÁN', `Tab 1: ${tabs[1]}`);
    assert('T1.4_Tab_2_Is_PhepTinh', tabs[2]?.toUpperCase() === 'PHÉP TÍNH', `Tab 2: ${tabs[2]}`);

    // T2: Tab 1 [Đối tượng] Checks
    const tab1Info = await send('Runtime.evaluate', {
        expression: `(() => {
            const tabButtons = Array.from(document.querySelectorAll('.sidebar-tabs .tab-btn'));
            if (tabButtons[0]) tabButtons[0].click();

            const segSwitcher = document.querySelector('.obj-segmented-switcher');
            const dock = document.getElementById('contextActionDock');
            const vecPanel = document.getElementById('createVectorPanel');
            const matPanel = document.getElementById('createMatrixPanel');
            const cardCreate = document.querySelector('.section-create');
            const cardList = document.querySelector('.section-list');

            // Thêm 2 vector mẫu
            const inp = document.getElementById('vectorInput');
            if (inp && window.App && App.onAddVector) {
                inp.value = '[2, 3]';
                App.onAddVector();
                inp.value = '[1, -1]';
                App.onAddVector();
            }

            const vecCheckboxes = document.querySelectorAll('.vec-select-chk');

            return {
                hasSegSwitcher: !!segSwitcher,
                hasDock: !!dock,
                hasVecPanel: !!vecPanel,
                hasMatPanel: !!matPanel,
                hasCardCreate: !!cardCreate,
                hasCardList: !!cardList,
                vecCount: (App.vectorList || []).length,
                vecCheckboxCount: vecCheckboxes.length
            };
        })()`,
        returnByValue: true
    });
    const t1 = tab1Info.result.value;
    assert('T2.1_Segmented_Switcher_In_Tab1', t1.hasSegSwitcher, 'Segmented Switcher active');
    assert('T2.2_No_Dock_In_Tab1', !t1.hasDock, 'Contextual Action Dock removed');
    assert('T2.3_Vector_And_Matrix_Panels_Exist', t1.hasVecPanel && t1.hasMatPanel, 'Both creation panels exist');
    assert('T2.4_No_Cluttered_Checkboxes_In_Vector_List', t1.vecCheckboxCount === 0, 'Clean list without checkboxes');

    // Chụp screenshot Tab 1 [Đối tượng]
    const ssTab1 = await send('Page.captureScreenshot', { format: 'png' });
    if (ssTab1 && ssTab1.data) {
        const p = path.join(ARTIFACT_DIR, 'calc_3tab_doi_tuong.png');
        fs.writeFileSync(p, Buffer.from(ssTab1.data, 'base64'));
        console.log(`[SCREENSHOT] Saved: ${p}`);
    }

    // T3: Tab 2 [Bài toán] Checks
    const tab2Info = await send('Runtime.evaluate', {
        expression: `(() => {
            const tabButtons = Array.from(document.querySelectorAll('.sidebar-tabs .tab-btn'));
            if (tabButtons[1]) tabButtons[1].click();

            const topicSel = document.getElementById('opExtraSelect');
            const options = topicSel ? Array.from(topicSel.options).map(o => o.text.trim()) : [];
            const presetBtns = document.querySelectorAll('#presetParabol, #presetEllipse, #presetGS45, #presetLTSingular, #presetEigenReal');

            return {
                topicOptionCount: options.length,
                presetBtnsCount: presetBtns.length
            };
        })()`,
        returnByValue: true
    });
    const t2 = tab2Info.result.value;
    assert('T3.1_Exactly_8_Problems_In_Tab2', t2.topicOptionCount === 8, `Problems count: ${t2.topicOptionCount}`);
    assert('T3.2_No_Presets_In_Tab2', t2.presetBtnsCount === 0, 'No preset buttons found');

    // Chụp screenshot Tab 2 [Bài toán]
    const ssTab2 = await send('Page.captureScreenshot', { format: 'png' });
    if (ssTab2 && ssTab2.data) {
        const p = path.join(ARTIFACT_DIR, 'calc_3tab_bai_toan.png');
        fs.writeFileSync(p, Buffer.from(ssTab2.data, 'base64'));
        console.log(`[SCREENSHOT] Saved: ${p}`);
    }

    // T4: Tab 3 [Phép tính] Checks
    const tab3Info = await send('Runtime.evaluate', {
        expression: `(() => {
            const tabButtons = Array.from(document.querySelectorAll('.sidebar-tabs .tab-btn'));
            if (tabButtons[2]) tabButtons[2].click();

            const calcSel = document.getElementById('calcObjectSelect');
            const vecCalcPanel = document.getElementById('calcVectorPanel');
            const matCalcPanel = document.getElementById('calcMatrixPanel');
            const mixedCalcPanel = document.getElementById('calcMixedPanel');

            const opSel = document.getElementById('opSelect');
            const v1Sel = document.getElementById('v1Select');
            const v2Sel = document.getElementById('v2Select');
            const btnCompute = document.getElementById('btnCompute');

            // Thực hiện tính thử: Chọn v1, v2 và tính
            if (v1Sel && v1Sel.options.length > 1) v1Sel.selectedIndex = 1;
            if (v2Sel && v2Sel.options.length > 2) v2Sel.selectedIndex = 2;
            if (opSel) opSel.value = 'add';
            
            if (btnCompute) btnCompute.click();

            const calcSteps = document.getElementById('calcSteps');

            return {
                hasCalcSwitcher: !!calcSel,
                hasVecCalcPanel: !!vecCalcPanel,
                hasMatCalcPanel: !!matCalcPanel,
                hasMixedCalcPanel: !!mixedCalcPanel,
                hasOpSelect: !!opSel,
                hasV1Select: !!v1Sel,
                hasV2Select: !!v2Sel,
                hasBtnCompute: !!btnCompute,
                calcStepsText: calcSteps ? calcSteps.innerText.trim() : ''
            };
        })()`,
        returnByValue: true
    });
    await sleep(600);
    const t3 = tab3Info.result.value;
    assert('T4.1_Calc_Switcher_In_Tab3', t3.hasCalcSwitcher, 'Calculation scope switcher exists');
    assert('T4.2_All_3_Calc_Panels_In_Tab3', t3.hasVecCalcPanel && t3.hasMatCalcPanel && t3.hasMixedCalcPanel, 'Vector, Matrix & Mixed panels exist in Tab 3');
    assert('T4.3_Vector_Calculation_Controls_Ready', t3.hasOpSelect && t3.hasV1Select && t3.hasV2Select && t3.hasBtnCompute, 'Vector calc controls ready');
    assert('T4.4_Calculation_Execution_Succeeds', t3.calcStepsText.length > 0, `Calculation result: ${t3.calcStepsText.slice(0, 60)}...`);

    // Chụp screenshot Tab 3 [Phép tính] (Light Mode)
    const ssTab3 = await send('Page.captureScreenshot', { format: 'png' });
    if (ssTab3 && ssTab3.data) {
        const p = path.join(ARTIFACT_DIR, 'calc_3tab_phep_tinh.png');
        fs.writeFileSync(p, Buffer.from(ssTab3.data, 'base64'));
        console.log(`[SCREENSHOT] Saved: ${p}`);
    }

    // Chuyển sang Dark Mode và chụp ảnh
    await send('Runtime.evaluate', {
        expression: `(() => {
            document.body.classList.add('dark');
            document.body.classList.add('dark-theme');
            document.documentElement.classList.add('dark');
        })()`
    });
    await sleep(400);

    const ssDarkTab3 = await send('Page.captureScreenshot', { format: 'png' });
    if (ssDarkTab3 && ssDarkTab3.data) {
        const p = path.join(ARTIFACT_DIR, 'calc_3tab_phep_tinh_dark.png');
        fs.writeFileSync(p, Buffer.from(ssDarkTab3.data, 'base64'));
        console.log(`[SCREENSHOT] Saved: ${p}`);
    }

    // T5: Zero Em-dash Check
    const emDashCheck = await send('Runtime.evaluate', {
        expression: `(() => {
            return document.body.innerHTML.includes('—');
        })()`,
        returnByValue: true
    });
    assert('T5_Zero_EmDash_Rule_Followed', !emDashCheck.result.value, 'No em-dash found in rendered DOM');

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
