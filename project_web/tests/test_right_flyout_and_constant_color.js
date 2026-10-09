/**
 * Automated Verification for:
 * 1. Submenu flyout opening to the RIGHT
 * 2. Complete Constants & Parameters flyout (pi, e, t, m, u, v, x, y, z)
 * 3. Constant vector color picker & display settings popover
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9267;
const HTTP_PORT = 5542;
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
    console.log('STARTING RIGHT FLYOUT & CONSTANT VECTOR COLOR POPVER TEST');
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
        '--user-data-dir=' + path.join(ROOT_DIR, 'scratch', 'edge_flyout_test_' + Date.now()),
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

    // Mo sidebar
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

    // --- TEST 1: Dropdown cap 2 mo sang BEN PHAI ---
    console.log('\n--- Test 1: Dropdown cap 2 mo sang ben phai ---');
    const flyoutPos = await send('Runtime.evaluate', {
        expression: `(() => {
            const menuBtn = document.getElementById('myMenuBtn');
            if (menuBtn) menuBtn.click();
            const parentDropdown = document.getElementById('myCustomMenu');
            const groupItem = parentDropdown ? parentDropdown.querySelector('.menu-group-item[data-group="constants"]') : null;
            if (groupItem) {
                const header = groupItem.querySelector('.menu-group-header');
                if (header) header.click();
            }
            const flyout = groupItem ? groupItem.querySelector('.menu-sub-flyout') : null;
            
            const groupRect = groupItem.getBoundingClientRect();
            const flyoutRect = flyout.getBoundingClientRect();
            const dropRect = parentDropdown.getBoundingClientRect();

            return {
                isFlyoutVisible: window.getComputedStyle(flyout).display !== 'none',
                flyoutLeft: flyoutRect.left,
                dropRight: dropRect.right,
                flyoutRight: flyoutRect.right,
                opensToTheRight: flyoutRect.left >= dropRect.left + 50
            };
        })()`,
        returnByValue: true
    });

    const fRes = flyoutPos.result.value;
    assert('Flyout constants is visible', fRes.isFlyoutVisible);
    assert('Flyout opens to the RIGHT (flyoutLeft >= dropRect.left)', fRes.opensToTheRight, `flyoutLeft=${fRes.flyoutLeft}, dropRight=${fRes.dropRight}`);

    // Chup screenshot Flyout constants mo sang phai
    const shotFlyout = await send('Page.captureScreenshot', { format: 'png' });
    if (shotFlyout && shotFlyout.data) {
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'flyout_opens_right.png'), Buffer.from(shotFlyout.data, 'base64'));
        console.log('[ARTIFACT] Saved flyout_opens_right.png');
    }

    // --- TEST 2: Kiem tra tat ca tham so & hang so trong submenu ---
    console.log('\n--- Test 2: Submenu Hang so & Tham so day du ---');
    const constsRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const groupItem = document.querySelector('.menu-group-item[data-group="constants"]');
            const flyout = groupItem.querySelector('.menu-sub-flyout');
            const items = Array.from(flyout.querySelectorAll('.menu-item')).map(it => {
                const title = it.querySelector('span:first-child')?.textContent?.trim() || '';
                const preview = it.querySelector('.latex-preview')?.textContent?.trim() || '';
                const onclick = it.getAttribute('onclick') || '';
                return { title, preview, onclick };
            });
            return items;
        })()`,
        returnByValue: true
    });

    const items = constsRes.result.value || [];
    const expectedVars = ['pi', 'e', 't', 'm', 'u', 'v', 'x', 'y', 'z'];
    const foundOnclicks = items.map(it => it.onclick);

    let allVarsFound = true;
    for (const v of expectedVars) {
        const found = foundOnclicks.some(oc => oc.includes(`'${v}'`) || oc.includes(`'\\\\${v}'`));
        if (!found) {
            console.error(`Missing expected item for variable: ${v}`);
            allVarsFound = false;
        }
    }
    assert('All 9 constants and parameters found in flyout menu', allVarsFound, `Total items: ${items.length}`);

    // --- TEST 3: Vector hang so co nut 3 cham va popover doi mau ---
    console.log('\n--- Test 3: Vector hang so co nut 3 cham va popover doi mau ---');
    // Dong menu truoc
    await send('Runtime.evaluate', { expression: `document.body.click();` });
    await sleep(400);

    // Them vector hang so [1, 2, 3]
    const addVecRes = await send('Runtime.evaluate', {
        expression: `(() => {
            if (App.vectorList) App.vectorList.length = 0;
            const mf = document.getElementById('vecInput');
            if (mf) mf.value = '[1, 2, 3]';
            const btn = document.getElementById('btnDraw');
            if (btn) btn.click();
            return {
                vecCount: App.vectorList ? App.vectorList.length : 0,
                firstVec: App.vectorList && App.vectorList[0] ? {
                    id: App.vectorList[0].id,
                    isParametric: !!App.vectorList[0].isParametric,
                    colorHex: App.vectorList[0].colorHex
                } : null
            };
        })()`,
        returnByValue: true
    });

    const vData = addVecRes.result.value;
    assert('Added 1 constant vector', vData.vecCount === 1);
    assert('First vector is non-parametric (constant)', vData.firstVec && !vData.firstVec.isParametric);

    const vecId = vData.firstVec.id;

    // Kiem tra nut 3 cham ton tai tren vector hang so
    const moreBtnCheck = await send('Runtime.evaluate', {
        expression: `(() => {
            const moreBtn = document.getElementById('vecParamMore_${vecId}');
            return {
                exists: !!moreBtn,
                id: moreBtn ? moreBtn.id : null,
                classes: moreBtn ? moreBtn.className : null
            };
        })()`,
        returnByValue: true
    });

    assert('3-dots more button exists on constant vector', moreBtnCheck.result.value.exists, `ID: ${moreBtnCheck.result.value.id}`);

    // Click nut 3 cham de mo popover
    const openPopRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const moreBtn = document.getElementById('vecParamMore_${vecId}');
            if (moreBtn) moreBtn.click();
            const pop = document.getElementById('vecParamPopover_${vecId}');
            const tabBtnParam = pop ? pop.querySelector('.vec-pop-tab-btn i.ph-sliders') : null;
            const tabBtnDisplay = pop ? pop.querySelector('.vec-pop-tab-btn i.ph-paint-brush') : null;
            const colorInp = document.getElementById('vecPopColorInp_${vecId}');
            const colorHex = document.getElementById('vecPopColorHex_${vecId}');
            const arrowInp = document.getElementById('vecParamArrowInp_${vecId}');
            return {
                isOpen: pop && pop.style.display === 'block',
                hasParamTab: !!tabBtnParam,
                hasDisplayTab: !!tabBtnDisplay,
                hasColorInp: !!colorInp,
                curColorHex: colorHex ? colorHex.textContent : '',
                hasArrowInp: !!arrowInp,
                arrowChecked: arrowInp ? arrowInp.checked : false
            };
        })()`,
        returnByValue: true
    });

    const pData = openPopRes.result.value;
    assert('Popover opened on 3-dots click', pData.isOpen);
    assert('Popover does NOT have parameter/slider tab', !pData.hasParamTab);
    assert('Popover has display tab', pData.hasDisplayTab);
    assert('Popover has native color input and hex text', pData.hasColorInp, `CurHex: ${pData.curColorHex}`);
    assert('Popover has arrow checkbox and is checked', pData.hasArrowInp && pData.arrowChecked);

    // Chup screenshot Popover doi mau cua vector hang so
    const shotPopover = await send('Page.captureScreenshot', { format: 'png' });
    if (shotPopover && shotPopover.data) {
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'constant_vector_color_popover.png'), Buffer.from(shotPopover.data, 'base64'));
        console.log('[ARTIFACT] Saved constant_vector_color_popover.png');
    }

    // --- TEST 4: Doi mau vector va kiem tra dong bo thoi gian thuc ---
    console.log('\n--- Test 4: Doi mau vector qua popover va kiem tra dong bo ---');
    const changeColorRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const colorInp = document.getElementById('vecPopColorInp_${vecId}');
            if (colorInp) {
                colorInp.value = '#e11d48';
                colorInp.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const item = App.vectorList.find(v => String(v.id) === String('${vecId}'));
            const swatch = document.getElementById('vecColorSwatch_${vecId}');
            const colorHex = document.getElementById('vecPopColorHex_${vecId}');
            return {
                itemColor: item ? item.colorHex : null,
                popHexText: colorHex ? colorHex.textContent : null,
                swatchBg: swatch ? swatch.style.background : null
            };
        })()`,
        returnByValue: true
    });

    const cRes = changeColorRes.result.value;
    assert('Vector item colorHex updated to #e11d48', cRes.itemColor === '#e11d48', `Actual: ${cRes.itemColor}`);
    assert('Popover hex text updated to #E11D48', cRes.popHexText === '#E11D48', `Actual: ${cRes.popHexText}`);
    assert('Vector swatch background updated', cRes.swatchBg && (cRes.swatchBg.includes('225') || cRes.swatchBg.includes('e11d48')));

    // --- TEST 5: Toggle check than vector mui ten ---
    console.log('\n--- Test 5: Toggle check than vector mui ten ---');
    const toggleArrowRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const arrowInp = document.getElementById('vecParamArrowInp_${vecId}');
            if (arrowInp) {
                arrowInp.checked = false;
                arrowInp.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const item = App.vectorList.find(v => String(v.id) === String('${vecId}'));
            const toggleBtn = document.querySelector('.vec-item .vec-btn-toggle');
            return {
                showArrow: item ? item.showArrow : null,
                toggleBtnTitle: toggleBtn ? toggleBtn.title : null
            };
        })()`,
        returnByValue: true
    });

    const tRes = toggleArrowRes.result.value;
    assert('item.showArrow changed to false', tRes.showArrow === false);

    // Chup screenshot sau khi doi mau va bo tick mui ten
    const shotModified = await send('Page.captureScreenshot', { format: 'png' });
    if (shotModified && shotModified.data) {
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'constant_vector_custom_color_applied.png'), Buffer.from(shotModified.data, 'base64'));
        console.log('[ARTIFACT] Saved constant_vector_custom_color_applied.png');
    }

    // Chuyen qua Dark Mode de kiem tra tinh nhat quan giao dien
    console.log('\n--- Test 6: Dark Mode Visual Consistency ---');
    await send('Runtime.evaluate', {
        expression: `document.body.classList.add('dark-theme'); document.body.classList.add('dark');`
    });
    await sleep(400);

    const shotDark = await send('Page.captureScreenshot', { format: 'png' });
    if (shotDark && shotDark.data) {
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'constant_vector_popover_dark.png'), Buffer.from(shotDark.data, 'base64'));
        console.log('[ARTIFACT] Saved constant_vector_popover_dark.png');
    }

    console.log('\n================================================================');
    console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED, ${consoleErrors.length} Console Errors`);
    console.log('================================================================');

    ws.close();
    edge.kill();
    server.close();

    if (failCount > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTest().catch(err => {
    console.error('Fatal error during test:', err);
    process.exit(1);
});
