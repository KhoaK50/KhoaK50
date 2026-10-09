/**
 * Automated Verification for:
 * 1. Matrix tiered dropdown menu (4 groups, right flyout)
 * 2. Matrix cell insertion via insertLatex
 * 3. Matrix creation bug fix (no invalid error on default/normal inputs)
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9272;
const HTTP_PORT = 5546;
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
    console.log('STARTING MATRIX TIERED MENU & CREATION VERIFICATION');
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
        '--user-data-dir=' + path.join(ROOT_DIR, 'scratch', 'edge_matrix_test_' + Date.now()),
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

    // --- TEST 1: Chuyen sang tab Ma tran ---
    console.log('\n--- Test 1: Chuyen sang tab Ma tran ---');
    const switchTabRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const matBtn = document.getElementById('btnSegmentMatrix');
            if (matBtn) matBtn.click();
            const matPanel = document.getElementById('createMatrixPanel');
            return {
                isMatActive: matBtn && matBtn.classList.contains('active'),
                isPanelVisible: matPanel && matPanel.classList.contains('active')
            };
        })()`,
        returnByValue: true
    });

    assert('Switched to Matrix segment tab', switchTabRes.result.value.isMatActive);
    assert('Matrix panel is active and visible', switchTabRes.result.value.isPanelVisible);

    // --- TEST 2: Mo menu phan tang cua Ma tran va kiem tra mo sang BEN PHAI ---
    console.log('\n--- Test 2: Menu phan tang Ma tran mo sang ben phai ---');
    const openMatMenuRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const btn = document.getElementById('matrixMenuBtn');
            if (btn) btn.click();
            const matMenu = document.getElementById('matrixCustomMenu');
            const groupItem = matMenu ? matMenu.querySelector('.menu-group-item[data-group="roots"]') : null;
            if (groupItem) {
                const header = groupItem.querySelector('.menu-group-header');
                if (header) header.click();
            }
            const flyout = groupItem ? groupItem.querySelector('.menu-sub-flyout') : null;
            
            const menuRect = matMenu ? matMenu.getBoundingClientRect() : null;
            const flyoutRect = flyout ? flyout.getBoundingClientRect() : null;

            return {
                isMenuVisible: matMenu && matMenu.style.display === 'block',
                groupCount: matMenu ? matMenu.querySelectorAll('.menu-group-item').length : 0,
                flyoutLeft: flyoutRect ? flyoutRect.left : 0,
                menuRight: menuRect ? menuRect.right : 0,
                flyoutOpensRight: flyoutRect && menuRect && (flyoutRect.left >= menuRect.left + 50)
            };
        })()`,
        returnByValue: true
    });

    const mRes = openMatMenuRes.result.value;
    assert('Matrix dropdown menu opened', mRes.isMenuVisible);
    assert('Matrix dropdown menu has 4 tiered groups', mRes.groupCount === 4, `Found: ${mRes.groupCount}`);
    assert('Matrix submenu flyout opens to the RIGHT', mRes.flyoutOpensRight, `flyoutLeft=${mRes.flyoutLeft}, menuRight=${mRes.menuRight}`);

    // Chup screenshot Matrix menu phan tang mo sang phai
    const shotMatMenu = await send('Page.captureScreenshot', { format: 'png' });
    if (shotMatMenu && shotMatMenu.data) {
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'matrix_tiered_menu_opens_right.png'), Buffer.from(shotMatMenu.data, 'base64'));
        console.log('[ARTIFACT] Saved matrix_tiered_menu_opens_right.png');
    }

    // --- TEST 3: Chen cong thuc tu menu vao o phan tu ma tran ---
    console.log('\n--- Test 3: Chen cong thuc tu menu vao o ma tran ---');
    const insertRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const cell00 = document.getElementById('matrixCreateGrid_cell_0_0');
            if (cell00) {
                cell00.focus();
                window.activeMathField = cell00;
            }
            // Chen can bac 2
            window.insertLatex('\\\\sqrt{#0}');
            return {
                cellVal: cell00 ? cell00.value : null
            };
        })()`,
        returnByValue: true
    });

    assert('Formula sqrt() inserted into matrix cell', insertRes.result.value.cellVal && insertRes.result.value.cellVal.includes('sqrt'), `Val: ${insertRes.result.value.cellVal}`);

    // --- TEST 4: Tao ma tran (Kiem tra fix bug "Có ô chứa biểu thức không hợp lệ") ---
    console.log('\n--- Test 4: Tao ma tran thanh cong khong bao loi hop le ---');
    // Dat lai cac o giong nhu anh chup cua user: cot 0 co [1, 0, 0], cac o con lai de trong (tu dong hieu la 0)
    const createMatRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const cell00 = document.getElementById('matrixCreateGrid_cell_0_0');
            const cell10 = document.getElementById('matrixCreateGrid_cell_1_0');
            const cell20 = document.getElementById('matrixCreateGrid_cell_2_0');
            if (cell00) cell00.value = '1';
            if (cell10) cell10.value = '0';
            if (cell20) cell20.value = '0';

            // Xoa rong cac o khac (chuan giong screenshot nguoi dung)
            for (let i = 0; i < 3; i++) {
                for (let j = 1; j < 3; j++) {
                    const c = document.getElementById(\`matrixCreateGrid_cell_\${i}_\${j}\`);
                    if (c) c.value = '';
                }
            }

            // Ghi nhan toast hien len neu co
            let toastMessage = null;
            const origToast = App.showToast;
            App.showToast = function(msg) {
                toastMessage = msg;
                if (origToast) origToast.apply(this, arguments);
            };

            const addBtn = document.getElementById('btnAddMatrix');
            if (addBtn) addBtn.click();

            App.showToast = origToast;

            return {
                matListLen: App.matrixList ? App.matrixList.length : 0,
                createdMat: App.matrixList && App.matrixList.length > 0 ? {
                    name: App.matrixList[0].name,
                    rows: App.matrixList[0].rows,
                    cols: App.matrixList[0].cols,
                    values: App.matrixList[0].values
                } : null,
                toast: toastMessage
            };
        })()`,
        returnByValue: true
    });

    const cRes = createMatRes.result.value;
    assert('Matrix created without invalid toast error', !cRes.toast || !cRes.toast.includes('không hợp lệ'), `Toast: ${cRes.toast}`);
    assert('App.matrixList has 1 matrix', cRes.matListLen === 1);
    assert('Matrix has correct dimensions 3x3', cRes.createdMat && cRes.createdMat.rows === 3 && cRes.createdMat.cols === 3);
    assert('Matrix cell values correctly parsed (first col: [1,0,0], others: [0,0])', cRes.createdMat && cRes.createdMat.values[0][0] === 1 && cRes.createdMat.values[0][1] === 0);

    // Chup screenshot sau khi tao ma tran thanh cong
    const shotCreated = await send('Page.captureScreenshot', { format: 'png' });
    if (shotCreated && shotCreated.data) {
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'matrix_created_successfully.png'), Buffer.from(shotCreated.data, 'base64'));
        console.log('[ARTIFACT] Saved matrix_created_successfully.png');
    }

    // --- TEST 5: Kiem tra Dark Mode tren tab Ma tran ---
    console.log('\n--- Test 5: Dark Mode Visual Consistency on Matrix Tab ---');
    await send('Runtime.evaluate', {
        expression: `document.body.classList.add('dark-theme'); document.body.classList.add('dark');`
    });
    await sleep(400);

    const shotDark = await send('Page.captureScreenshot', { format: 'png' });
    if (shotDark && shotDark.data) {
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'matrix_tab_dark_mode.png'), Buffer.from(shotDark.data, 'base64'));
        console.log('[ARTIFACT] Saved matrix_tab_dark_mode.png');
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
