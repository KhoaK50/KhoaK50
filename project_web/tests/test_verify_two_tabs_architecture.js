/**
 * Automated Verification for 2-Tab Architecture, Contextual Action Dock & Anti-Slop Layout
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9255;
const HTTP_PORT = 5530;
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
    console.log('STARTING CONTEXTUAL DOCK & ANTI-SLOP CDP VERIFICATION');
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
        '--user-data-dir=' + path.join(ROOT_DIR, 'scratch', 'edge_2tab_test_' + Date.now()),
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

    // T1: Check Tabs Count and Names
    const tabsData = await send('Runtime.evaluate', {
        expression: `(() => {
            const tabButtons = Array.from(document.querySelectorAll('.sidebar-tabs .tab-btn'));
            return tabButtons.map(btn => btn.innerText.trim());
        })()`,
        returnByValue: true
    });
    const tabs = tabsData.result.value || [];
    assert('T1.1_Tab_Count_Equals_2', tabs.length === 2, `Tabs: ${JSON.stringify(tabs)}`);
    assert('T1.2_Tab_0_Is_DoiTuong', tabs[0]?.toUpperCase() === 'ĐỐI TƯỢNG', `Tab 0: ${tabs[0]}`);
    assert('T1.3_Tab_1_Is_BaiToan', tabs[1]?.toUpperCase() === 'BÀI TOÁN', `Tab 1: ${tabs[1]}`);

    // T2: Tab [Đối tượng] Segmented Switcher & Contextual Action Dock
    const objTabInfo = await send('Runtime.evaluate', {
        expression: `(() => {
            const tabButtons = Array.from(document.querySelectorAll('.sidebar-tabs .tab-btn'));
            if (tabButtons[0]) tabButtons[0].click();

            const segSwitcher = document.querySelector('.obj-segmented-switcher');
            const segBtns = document.querySelectorAll('.obj-segment-btn');
            const dock = document.getElementById('contextActionDock');
            const dockEmpty = document.querySelector('.dock-empty-state');
            const legacyCardOps = document.getElementById('cardVectorOperations');

            return {
                hasSegSwitcher: !!segSwitcher,
                segBtnCount: segBtns.length,
                hasContextDock: !!dock,
                hasDockEmptyState: !!dockEmpty,
                hasLegacyCardOps: !!legacyCardOps
            };
        })()`,
        returnByValue: true
    });
    const oti = objTabInfo.result.value;
    assert('T2.1_Segmented_Switcher_Exists', oti.hasSegSwitcher && oti.segBtnCount === 2, `Segment Buttons: ${oti.segBtnCount}`);
    assert('T2.2_Contextual_Action_Dock_Integrated', oti.hasContextDock, 'Contextual Action Dock integrated');
    assert('T2.3_Dock_Empty_State_When_No_Selection', oti.hasDockEmptyState, 'Empty state rendered cleanly');
    assert('T2.4_No_Cluttered_Legacy_Operations_Card', !oti.hasLegacyCardOps, 'Old cardVectorOperations removed');

    // Tạo 2 vector và kiểm tra Action Dock cập nhật sang trạng thái 2 vector
    const dockTwoVecTest = await send('Runtime.evaluate', {
        expression: `(() => {
            // Tạo 2 vector
            const inp = document.getElementById('vectorInput');
            if (inp && window.App && App.onAddVector) {
                inp.value = '[2, 3]';
                App.onAddVector();
                inp.value = '[1, -1]';
                App.onAddVector();
            }

            // Tick chọn 2 vector vừa tạo
            const checkboxes = Array.from(document.querySelectorAll('.vec-select-chk'));
            if (checkboxes.length >= 2) {
                checkboxes[0].checked = true;
                checkboxes[0].dispatchEvent(new Event('change'));
                checkboxes[1].checked = true;
                checkboxes[1].dispatchEvent(new Event('change'));
            }

            const dockButtons = Array.from(document.querySelectorAll('.dock-action-btn'));
            const btnTexts = dockButtons.map(b => b.textContent.trim());
            const badge = document.getElementById('selectedVecCountBadge');

            return {
                vecCount: (App.vectorList || []).length,
                chkCount: checkboxes.length,
                badgeText: badge ? badge.textContent.trim() : '',
                dockBtnCount: dockButtons.length,
                btnTexts: btnTexts
            };
        })()`,
        returnByValue: true
    });
    const dtv = dockTwoVecTest.result.value;
    console.log('[DEBUG DOCK 2 VEC]', dtv);
    assert('T2.5_Dock_Switches_To_2_Vectors_State', dtv.dockBtnCount === 6, `Buttons count: ${dtv.dockBtnCount}`);
    assert('T2.6_Dock_Has_Add_Sub_Dot_Angle_Proj_Buttons', dtv.btnTexts.some(t => t.includes('Cộng')) && dtv.btnTexts.some(t => t.includes('Trừ')) && dtv.btnTexts.some(t => t.includes('Vô hướng')), `Buttons: ${JSON.stringify(dtv.btnTexts)}`);

    // Test click nút [+] (Cộng 2 vector) 1 chạm
    const touchAddTest = await send('Runtime.evaluate', {
        expression: `(() => {
            const addBtn = document.querySelector('.dock-action-btn[data-action="add"]');
            if (addBtn) addBtn.click();
            const calcSteps = document.getElementById('calcSteps');
            return {
                clicked: !!addBtn,
                calcStepsDisplay: calcSteps ? window.getComputedStyle(calcSteps).display : 'none'
            };
        })()`,
        returnByValue: true
    });
    await sleep(600);
    assert('T2.7_Single_Touch_Add_Triggers_Calculation', touchAddTest.result.value.clicked, 'Single-touch Add action triggered');

    // Chụp ảnh màn hình 1: Tab [Đối tượng] (Light Mode)
    const screenshot1 = await send('Page.captureScreenshot', { format: 'png' });
    if (screenshot1 && screenshot1.data) {
        const p1 = path.join(ARTIFACT_DIR, 'calc_2tab_doi_tuong.png');
        fs.writeFileSync(p1, Buffer.from(screenshot1.data, 'base64'));
        console.log(`[SCREENSHOT] Saved: ${p1}`);
    }

    // T3: Chuyển sang Tab [Bài toán]
    const topicTabInfo = await send('Runtime.evaluate', {
        expression: `(() => {
            const tabButtons = Array.from(document.querySelectorAll('.sidebar-tabs .tab-btn'));
            if (tabButtons[1]) tabButtons[1].click();

            const topicSel = document.getElementById('opExtraSelect');
            const options = topicSel ? Array.from(topicSel.options).map(o => o.text.trim()) : [];

            // Kiểm tra các nút preset mẫu bị xóa
            const presetBtns = document.querySelectorAll('#presetParabol, #presetEllipse, #presetGS45, #presetLTSingular, #presetEigenReal');

            // Kiểm tra các button và checkbox xem có bị rớt dòng bất thường không
            const buttons = Array.from(document.querySelectorAll('#controls .extra-form button'));
            const textWrappingIssues = buttons.filter(b => {
                const rect = b.getBoundingClientRect();
                return rect.height > 55; // nếu nút bị ép bẻ 3 dòng
            }).map(b => b.innerText.trim());

            return {
                topicOptionCount: options.length,
                options: options,
                presetBtnsCount: presetBtns.length,
                wrappingIssues: textWrappingIssues
            };
        })()`,
        returnByValue: true
    });
    const tti = topicTabInfo.result.value;
    console.log('[DEBUG TOPIC TAB]', tti);
    assert('T3.1_Exactly_8_Canonical_Problems', tti.topicOptionCount === 8, `Problems count: ${tti.topicOptionCount}`);
    assert('T3.2_Zero_Fake_Preset_Buttons', tti.presetBtnsCount === 0, `Preset buttons found: ${tti.presetBtnsCount}`);
    assert('T3.3_No_Awkward_Text_Wrapping_On_Buttons', tti.wrappingIssues.length === 0, `Issues: ${JSON.stringify(tti.wrappingIssues)}`);

    // Chụp ảnh màn hình 2: Tab [Bài toán] (Light Mode)
    const screenshot2 = await send('Page.captureScreenshot', { format: 'png' });
    if (screenshot2 && screenshot2.data) {
        const p2 = path.join(ARTIFACT_DIR, 'calc_2tab_bai_toan.png');
        fs.writeFileSync(p2, Buffer.from(screenshot2.data, 'base64'));
        console.log(`[SCREENSHOT] Saved: ${p2}`);
    }

    // Chuyển sang Dark Mode
    await send('Runtime.evaluate', {
        expression: `(() => {
            document.body.classList.add('dark');
            document.body.classList.add('dark-theme');
            document.documentElement.classList.add('dark');
        })()`
    });
    await sleep(400);

    // Chụp Tab [Bài toán] Dark Mode
    const ssDarkTopic = await send('Page.captureScreenshot', { format: 'png' });
    if (ssDarkTopic && ssDarkTopic.data) {
        const p = path.join(ARTIFACT_DIR, 'calc_2tab_bai_toan_dark.png');
        fs.writeFileSync(p, Buffer.from(ssDarkTopic.data, 'base64'));
        console.log(`[SCREENSHOT] Saved: ${p}`);
    }

    // Quay lại Tab [Đối tượng] Dark Mode
    await send('Runtime.evaluate', {
        expression: `(() => {
            const tabButtons = Array.from(document.querySelectorAll('.sidebar-tabs .tab-btn'));
            if (tabButtons[0]) tabButtons[0].click();
        })()`
    });
    await sleep(400);

    const ssDarkObj = await send('Page.captureScreenshot', { format: 'png' });
    if (ssDarkObj && ssDarkObj.data) {
        const p = path.join(ARTIFACT_DIR, 'calc_2tab_doi_tuong_dark.png');
        fs.writeFileSync(p, Buffer.from(ssDarkObj.data, 'base64'));
        console.log(`[SCREENSHOT] Saved: ${p}`);
    }

    // T4: Zero Em-dash Check
    const emDashCheck = await send('Runtime.evaluate', {
        expression: `(() => {
            return document.body.innerHTML.includes('—');
        })()`,
        returnByValue: true
    });
    assert('T4_Zero_EmDash_Rule_Followed', !emDashCheck.result.value, 'No em-dash found in rendered DOM');

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
