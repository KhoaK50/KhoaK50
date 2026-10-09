/**
 * Automated Verification for:
 * 1. Tiered Cascading Formula Dropdown Menu
 * 2. Logarithm & Roots (log_a, log_2, log10, ln, root(n, x), cbrt, sqrt, arccos)
 * 3. Prevention of 1-scalar-as-vector bug
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9266;
const HTTP_PORT = 5541;
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
    console.log('STARTING TIERED MENU, LOGARITHM & SCALAR VECTOR VERIFICATION');
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
        '--user-data-dir=' + path.join(ROOT_DIR, 'scratch', 'edge_tiered_test_' + Date.now()),
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
                const targetPage = listData.find(p => p.type === 'page' && p.url.includes('calculation.html')) || listData[0];
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
    const consoleErrors = [];

    ws.onmessage = event => {
        const msg = JSON.parse(event.data.toString());
        if (msg.method === 'Runtime.consoleAPICalled') {
            const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
            if (msg.params.type === 'error') consoleErrors.push(text);
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
    await sleep(1500);

    // Mở sidebar
    await send('Runtime.evaluate', {
        expression: `(() => {
            const controls = document.getElementById('controls');
            const btn = document.getElementById('floatingHamburger') || document.getElementById('hamburger');
            if (btn && (!controls || !controls.classList.contains('open'))) {
                btn.click();
            }
        })()`
    });
    await sleep(800);

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

    // T0: Check console errors
    const criticalErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('mathfield'));
    assert('T0_No_Critical_Console_Errors', criticalErrors.length === 0, `Errors: ${JSON.stringify(criticalErrors)}`);

    // T1: Check Tiered Menu HTML Structure (4 groups)
    const menuStructure = await send('Runtime.evaluate', {
        expression: `(() => {
            const menu = document.getElementById('myCustomMenu');
            if (!menu) return { exists: false };
            const groups = Array.from(menu.querySelectorAll('.menu-group-item'));
            const groupNames = groups.map(g => g.querySelector('.group-title') ? g.querySelector('.group-title').innerText.trim() : '');
            return {
                exists: true,
                groupCount: groups.length,
                groupNames: groupNames
            };
        })()`,
        returnByValue: true
    });
    const ms = menuStructure.result.value;
    assert('T1_Tiered_Menu_Has_4_Groups', ms.exists && ms.groupCount === 4, `Found: ${JSON.stringify(ms.groupNames)}`);

    // T2: Mở menu và mở submenu Logarit để chụp ảnh
    await send('Runtime.evaluate', {
        expression: `(() => {
            const inp = document.getElementById('vectorInput');
            if (inp) inp.scrollIntoView({ block: 'center' });
            const menu = document.getElementById('myCustomMenu');
            if (menu) menu.style.display = 'block';
            const logGroup = document.querySelector('.menu-group-item[data-group="logs"]');
            if (logGroup) logGroup.classList.add('is-open');
        })()`
    });
    await sleep(600);

    const ssMenuLight = await send('Page.captureScreenshot', { format: 'png' });
    if (ssMenuLight && ssMenuLight.data) {
        const p = path.join(ARTIFACT_DIR, 'menu_tiered_flyout_light.png');
        fs.writeFileSync(p, Buffer.from(ssMenuLight.data, 'base64'));
        console.log(`[SCREENSHOT] Saved: ${p}`);
    }

    // T3: Chụp ảnh Dark Mode cho Menu
    await send('Runtime.evaluate', {
        expression: `(() => {
            document.documentElement.classList.add('dark');
            document.body.classList.add('dark', 'dark-theme');
        })()`
    });
    await sleep(300);

    const ssMenuDark = await send('Page.captureScreenshot', { format: 'png' });
    if (ssMenuDark && ssMenuDark.data) {
        const pDark = path.join(ARTIFACT_DIR, 'menu_tiered_flyout_dark.png');
        fs.writeFileSync(pDark, Buffer.from(ssMenuDark.data, 'base64'));
        console.log(`[SCREENSHOT] Saved: ${pDark}`);
    }

    // Chụp ảnh nhóm Căn & Lũy thừa (Roots)
    await send('Runtime.evaluate', {
        expression: `(() => {
            document.querySelectorAll('.menu-group-item.is-open').forEach(el => el.classList.remove('is-open'));
            const rootGroup = document.querySelector('.menu-group-item[data-group="roots"]');
            if (rootGroup) rootGroup.classList.add('is-open');
        })()`
    });
    await sleep(300);
    const ssRoots = await send('Page.captureScreenshot', { format: 'png' });
    if (ssRoots && ssRoots.data) {
        const pRoots = path.join(ARTIFACT_DIR, 'menu_roots_flyout.png');
        fs.writeFileSync(pRoots, Buffer.from(ssRoots.data, 'base64'));
        console.log(`[SCREENSHOT] Saved: ${pRoots}`);
    }

    // Chụp ảnh nhóm Lượng giác (Trig)
    await send('Runtime.evaluate', {
        expression: `(() => {
            document.querySelectorAll('.menu-group-item.is-open').forEach(el => el.classList.remove('is-open'));
            const trigGroup = document.querySelector('.menu-group-item[data-group="trig"]');
            if (trigGroup) trigGroup.classList.add('is-open');
        })()`
    });
    await sleep(300);
    const ssTrig = await send('Page.captureScreenshot', { format: 'png' });
    if (ssTrig && ssTrig.data) {
        const pTrig = path.join(ARTIFACT_DIR, 'menu_trig_flyout.png');
        fs.writeFileSync(pTrig, Buffer.from(ssTrig.data, 'base64'));
        console.log(`[SCREENSHOT] Saved: ${pTrig}`);
    }

    // Quay lại Light Mode để kiểm tra các tính năng nhập liệu
    await send('Runtime.evaluate', {
        expression: `(() => {
            document.documentElement.classList.remove('dark');
            document.body.classList.remove('dark', 'dark-theme');
            const menu = document.getElementById('myCustomMenu');
            if (menu) menu.style.display = 'none';
        })()`
    });
    await sleep(300);

    // T4: Test chèn Logarit cơ số a (select 'a')
    const testInsertLog = await send('Runtime.evaluate', {
        expression: `(() => {
            const inp = document.getElementById('vectorInput');
            inp.value = '';
            window.insertLatex('\\\\log_{#?}(#0)');
            const selectedText = inp.value.substring(inp.selectionStart, inp.selectionEnd);
            return {
                val: inp.value,
                selectedText: selectedText,
                selStart: inp.selectionStart,
                selEnd: inp.selectionEnd
            };
        })()`,
        returnByValue: true
    });
    const logIns = testInsertLog.result.value;
    assert('T4_Insert_LogA_Selects_Base', logIns.val === 'log_a()' && logIns.selectedText === 'a', `Value: ${logIns.val}, Selected: '${logIns.selectedText}'`);

    // T5: Test chèn Căn bậc n (select 'n')
    const testInsertRoot = await send('Runtime.evaluate', {
        expression: `(() => {
            const inp = document.getElementById('vectorInput');
            inp.value = '';
            window.insertLatex('root(#?, #0)');
            const selectedText = inp.value.substring(inp.selectionStart, inp.selectionEnd);
            return {
                val: inp.value,
                selectedText: selectedText
            };
        })()`,
        returnByValue: true
    });
    const rootIns = testInsertRoot.result.value;
    assert('T5_Insert_RootN_Selects_Degree', rootIns.val === 'root(n, )' && rootIns.selectedText === 'n', `Value: ${rootIns.val}, Selected: '${rootIns.selectedText}'`);

    // T6: Test Parser & Live Preview với căn bậc n và logarit: [root(3, 8), log_2(4)]
    const testCalcRootsAndLogs = await send('Runtime.evaluate', {
        expression: `(() => {
            const inp = document.getElementById('vectorInput');
            if (inp) {
                inp.value = '[root(3, 8), log_2(4)]';
                inp.scrollIntoView({ block: 'center' });
                inp.dispatchEvent(new Event('input', { bubbles: true }));
                inp.dispatchEvent(new Event('change', { bubbles: true }));
            }

            const parsed = App.parseVectorExpr('[root(3, 8), log_2(4)]');
            const wrap = document.getElementById('vecInputPreviewWrap');
            const katex = document.getElementById('vecInputPreview');

            return {
                parsedVec: parsed,
                previewDisplay: wrap ? window.getComputedStyle(wrap).display : 'none',
                previewText: katex ? katex.innerText.trim() : ''
            };
        })()`,
        returnByValue: true
    });
    const crl = testCalcRootsAndLogs.result.value;
    const isVec2D = Array.isArray(crl.parsedVec) && Math.abs(crl.parsedVec[0] - 2) < 0.01 && Math.abs(crl.parsedVec[1] - 2) < 0.01;
    assert('T6_Math_Evaluator_Root_And_Log', isVec2D, `Evaluated coords: ${JSON.stringify(crl.parsedVec)}`);
    assert('T6.1_Preview_Shows_Root_And_Log', crl.previewDisplay === 'flex', `Preview text: ${crl.previewText}`);

    // Chụp screenshot Preview tổng quát
    const ssPreviewGen = await send('Page.captureScreenshot', { format: 'png' });
    if (ssPreviewGen && ssPreviewGen.data) {
        const p = path.join(ARTIFACT_DIR, 'preview_roots_and_logs.png');
        fs.writeFileSync(p, Buffer.from(ssPreviewGen.data, 'base64'));
        console.log(`[SCREENSHOT] Saved: ${p}`);
    }

    // T7: Test Bug ghi 1 số đơn lẻ: log(4)
    const testScalarRejection = await send('Runtime.evaluate', {
        expression: `(() => {
            const inp = document.getElementById('vectorInput');
            inp.value = 'log(4)';
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));

            const wrap = document.getElementById('vecInputPreviewWrap');
            const previewDisplay = wrap ? window.getComputedStyle(wrap).display : 'none';

            const countBefore = (App.vectorList || []).length;
            App.onAddVector();
            const countAfter = (App.vectorList || []).length;

            return {
                previewHidden: previewDisplay === 'none',
                notAdded: countAfter === countBefore
            };
        })()`,
        returnByValue: true
    });
    const scRej = testScalarRejection.result.value;
    assert('T7.1_Scalar_Preview_Hidden', scRej.previewHidden, 'Preview box is hidden for single scalar');
    assert('T7.2_Scalar_Not_Added_As_Vector', scRej.notAdded, '1 scalar expression rejected from vectorList');

    // T8: Test Bug ghi số nguyên đơn lẻ: 5
    const testScalar5 = await send('Runtime.evaluate', {
        expression: `(() => {
            const inp = document.getElementById('vectorInput');
            inp.value = '5';
            inp.dispatchEvent(new Event('input', { bubbles: true }));

            const wrap = document.getElementById('vecInputPreviewWrap');
            const previewDisplay = wrap ? window.getComputedStyle(wrap).display : 'none';

            const countBefore = (App.vectorList || []).length;
            App.onAddVector();
            const countAfter = (App.vectorList || []).length;

            return {
                previewHidden: previewDisplay === 'none',
                notAdded: countAfter === countBefore
            };
        })()`,
        returnByValue: true
    });
    const sc5 = testScalar5.result.value;
    assert('T8.1_Scalar_5_Preview_Hidden', sc5.previewHidden, 'Preview box is hidden for 5');
    assert('T8.2_Scalar_5_Not_Added', sc5.notAdded, '5 rejected from vectorList');

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
