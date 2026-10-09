const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const HTTP_PORT = 5549;
const CDP_PORT = 9239;
const ARTIFACT_DIR = path.join('C:', 'Users', 'LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
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
    console.log('STARTING DROPDOWN FLUSH & ALIGN VERIFICATION');
    console.log('================================================================');

    const server = await startServer(HTTP_PORT);
    console.log(`[HTTP] Static server active on port ${HTTP_PORT}`);

    const edgePaths = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    let edgeBin = edgePaths.find(p => fs.existsSync(p));
    if (!edgeBin) {
        throw new Error('Edge binary not found');
    }

    const userDataDir = path.join(ROOT_DIR, 'tmp_edge_test_flush');
    const edge = spawn(edgeBin, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${userDataDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--window-size=1400,900',
        '--headless=new',
        `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html`
    ]);

    await sleep(2500);

    let wsUrl = '';
    for (let i = 0; i < 15; i++) {
        try {
            const listRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`).then(r => r.json());
            const target = listRes.find(t => t.type === 'page');
            if (target && target.webSocketDebuggerUrl) {
                wsUrl = target.webSocketDebuggerUrl;
                break;
            }
        } catch (e) {}
        await sleep(500);
    }

    if (!wsUrl) {
        throw new Error('Could not connect to CDP WebSocket endpoint');
    }

    const ws = new WebSocket(wsUrl);
    await new Promise(res => { ws.onopen = res; });

    let msgId = 1;
    const callbacks = new Map();
    ws.onmessage = event => {
        const msg = JSON.parse(event.data.toString());
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

    // Open sidebar
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

    // --- TEST 1: Vector Dropdown Alignment & No Icons ---
    console.log('\n--- Test 1: Vector Dropdown Align & No Icons ---');
    const vecRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const btn = document.getElementById('myMenuBtn');
            btn.click();
            const menu = document.getElementById('myCustomMenu');
            const btnRect = btn.getBoundingClientRect();
            const menuRect = menu.getBoundingClientRect();

            // Check icons in group titles
            const titles = menu.querySelectorAll('.group-title');
            let iconFound = false;
            titles.forEach(t => {
                if (t.querySelector('i')) iconFound = true;
            });

            // Hover over first group
            const firstGroup = menu.querySelector('.menu-group-item[data-group="roots"]');
            if (firstGroup) {
                firstGroup.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            }
            const flyout = firstGroup ? firstGroup.querySelector('.menu-sub-flyout') : null;
            const flyoutRect = flyout ? flyout.getBoundingClientRect() : null;

            // Khúc đầu nằm dưới icon 3 gạch: menuRect.left starts right under btnRect.left
            const leftDiff = Math.abs(menuRect.left - btnRect.left);

            // Khít sát nhau: flyoutRect.left - menuRect.right <= 1
            const gap = flyoutRect ? (flyoutRect.left - menuRect.right) : 999;

            return {
                isMenuVisible: menu.style.display === 'block',
                iconFound,
                btnLeft: btnRect.left,
                menuLeft: menuRect.left,
                leftDiff,
                alignedUnderBtn: leftDiff <= 5,
                menuRight: menuRect.right,
                flyoutLeft: flyoutRect ? flyoutRect.left : 0,
                gap,
                isFlush: gap <= 0.5,
                hasHoverBridge: !!flyout
            };
        })()`,
        returnByValue: true
    });

    const vData = vecRes.result.value;
    assert('Vector dropdown menu opened', vData.isMenuVisible);
    assert('Vector dropdown has NO leading icons in group titles', !vData.iconFound);
    assert('Vector dropdown start (left) is situated under 3-bar icon', vData.alignedUnderBtn, `btnLeft=${vData.btnLeft}, menuLeft=${vData.menuLeft}, diff=${vData.leftDiff}`);
    assert('Vector dropdown tầng 1 and tầng 2 are FLUSH (khít sát nhau, 0 gap)', vData.isFlush, `gap=${vData.gap}px, menuRight=${vData.menuRight}, flyoutLeft=${vData.flyoutLeft}`);

    // Capture screenshot of Vector dropdown
    const shotVec = await send('Page.captureScreenshot', { format: 'png' });
    if (shotVec && shotVec.data) {
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'vector_dropdown_aligned_and_flush.png'), Buffer.from(shotVec.data, 'base64'));
        console.log('[ARTIFACT] Saved vector_dropdown_aligned_and_flush.png');
    }

    // --- TEST 2: Switch to Matrix and Check Matrix Dropdown ---
    console.log('\n--- Test 2: Matrix Dropdown Align, Flush & No Icons ---');
    const matRes = await send('Runtime.evaluate', {
        expression: `(() => {
            // Close vector menu
            const vMenu = document.getElementById('myCustomMenu');
            if (vMenu) vMenu.style.display = 'none';

            // Switch to matrix tab
            const matTab = document.getElementById('btnSegmentMatrix');
            if (matTab) matTab.click();

            const matBtn = document.getElementById('matrixMenuBtn');
            if (matBtn) matBtn.click();

            const matMenu = document.getElementById('matrixCustomMenu');
            const matBtnRect = matBtn.getBoundingClientRect();
            const matMenuRect = matMenu.getBoundingClientRect();

            // Check icons
            const titles = matMenu.querySelectorAll('.group-title');
            let iconFound = false;
            titles.forEach(t => {
                if (t.querySelector('i')) iconFound = true;
            });

            // Hover over roots group
            const firstGroup = matMenu.querySelector('.menu-group-item[data-group="roots"]');
            if (firstGroup) {
                firstGroup.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            }
            const flyout = firstGroup ? firstGroup.querySelector('.menu-sub-flyout') : null;
            const flyoutRect = flyout ? flyout.getBoundingClientRect() : null;

            const leftDiff = Math.abs(matMenuRect.left - matBtnRect.left);
            const gap = flyoutRect ? (flyoutRect.left - matMenuRect.right) : 999;

            return {
                isMatMenuVisible: matMenu.style.display === 'block',
                iconFound,
                matBtnLeft: matBtnRect.left,
                matMenuLeft: matMenuRect.left,
                leftDiff,
                alignedUnderBtn: leftDiff <= 5,
                matMenuRight: matMenuRect.right,
                flyoutLeft: flyoutRect ? flyoutRect.left : 0,
                gap,
                isFlush: gap <= 0.5
            };
        })()`,
        returnByValue: true
    });

    const mData = matRes.result.value;
    assert('Matrix dropdown menu opened', mData.isMatMenuVisible);
    assert('Matrix dropdown has NO leading icons in group titles', !mData.iconFound);
    assert('Matrix dropdown start (left) is situated under 3-bar icon', mData.alignedUnderBtn, `matBtnLeft=${mData.matBtnLeft}, matMenuLeft=${mData.matMenuLeft}, diff=${mData.leftDiff}`);
    assert('Matrix dropdown tầng 1 and tầng 2 are FLUSH (khít sát nhau, 0 gap)', mData.isFlush, `gap=${mData.gap}px, matMenuRight=${mData.matMenuRight}, flyoutLeft=${mData.flyoutLeft}`);

    // Capture screenshot of Matrix dropdown
    const shotMat = await send('Page.captureScreenshot', { format: 'png' });
    if (shotMat && shotMat.data) {
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'matrix_dropdown_aligned_and_flush.png'), Buffer.from(shotMat.data, 'base64'));
        console.log('[ARTIFACT] Saved matrix_dropdown_aligned_and_flush.png');
    }

    // --- TEST 3: Dark Mode Visual Check ---
    console.log('\n--- Test 3: Dark Mode Consistency ---');
    await send('Runtime.evaluate', {
        expression: `(() => {
            document.body.classList.add('dark');
        })()`
    });
    await sleep(300);

    const shotDark = await send('Page.captureScreenshot', { format: 'png' });
    if (shotDark && shotDark.data) {
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'matrix_dropdown_dark_flush.png'), Buffer.from(shotDark.data, 'base64'));
        console.log('[ARTIFACT] Saved matrix_dropdown_dark_flush.png');
    }

    console.log('\n================================================================');
    console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('================================================================');

    // Cleanup
    ws.close();
    edge.kill();
    server.close();
    try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (e) {}

    process.exit(failCount > 0 ? 1 : 0);
}

runTest().catch(err => {
    console.error(err);
    process.exit(1);
});
