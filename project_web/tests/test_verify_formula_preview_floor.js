/**
 * Automated Verification for Formula Preview: No Zoom Button & Exponent Floor Scaling
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9265;
const HTTP_PORT = 5540;
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
    console.log('STARTING FORMULA PREVIEW & EXPONENT FLOOR VERIFICATION');
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
        '--user-data-dir=' + path.join(ROOT_DIR, 'scratch', 'edge_preview_test_' + Date.now()),
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
    const criticalErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('mathfield'));
    assert('T0_No_Critical_Console_Errors', criticalErrors.length === 0, `Errors: ${JSON.stringify(criticalErrors)}`);

    // T1: Check No Zoom Button in DOM
    const zoomBtnCheck = await send('Runtime.evaluate', {
        expression: `(() => {
            const btn = document.getElementById('vecPreviewZoomBtn');
            const icon = document.getElementById('vecPreviewZoomIcon');
            return { hasBtn: !!btn, hasIcon: !!icon };
        })()`,
        returnByValue: true
    });
    assert('T1_Zoom_Button_Completely_Removed', !zoomBtnCheck.result.value.hasBtn && !zoomBtnCheck.result.value.hasIcon, 'vecPreviewZoomBtn not in DOM');

    // T2: Test Preview with standard vector [1, 2]
    const preview1 = await send('Runtime.evaluate', {
        expression: `(() => {
            const inp = document.getElementById('vectorInput');
            if (inp) {
                inp.value = '[1, 2]';
                inp.dispatchEvent(new Event('input', { bubbles: true }));
                inp.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const wrap = document.getElementById('vecInputPreviewWrap');
            const katex = document.getElementById('vecInputPreview');
            return {
                wrapDisplay: wrap ? window.getComputedStyle(wrap).display : 'none',
                katexContent: katex ? katex.innerHTML : '',
                hasContent: katex ? katex.innerText.trim().length > 0 : false
            };
        })()`,
        returnByValue: true
    });
    await sleep(400);
    assert('T2_Standard_Vector_Preview_Visible', preview1.result.value.wrapDisplay === 'flex' && preview1.result.value.hasContent, 'Preview displays [1, 2]');

    // Chụp screenshot Preview vector thông thường
    const ssStd = await send('Page.captureScreenshot', { format: 'png' });
    if (ssStd && ssStd.data) {
        const p = path.join(ARTIFACT_DIR, 'preview_clean_no_zoom.png');
        fs.writeFileSync(p, Buffer.from(ssStd.data, 'base64'));
        console.log(`[SCREENSHOT] Saved: ${p}`);
    }

    // T3: Test Preview with Super-power (siêu lũy thừa đội tầng) [2^{2^{2^2}}, 3^{t^2}]
    const previewSuperPower = await send('Runtime.evaluate', {
        expression: `(() => {
            const inp = document.getElementById('vectorInput');
            if (inp) {
                inp.value = '[2^(2^(2^2)), 3^(t^2)]';
                inp.dispatchEvent(new Event('input', { bubbles: true }));
                inp.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const wrap = document.getElementById('vecInputPreviewWrap');
            const katex = document.getElementById('vecInputPreview');

            // Kiểm tra font size của các scriptscriptstyle
            const scripts = Array.from(document.querySelectorAll('#vecInputPreview .scriptscriptstyle, #vecInputPreview .scriptstyle'));
            const sizes = scripts.map(el => window.getComputedStyle(el).fontSize);

            return {
                wrapDisplay: wrap ? window.getComputedStyle(wrap).display : 'none',
                katexContent: katex ? katex.innerHTML : '',
                elementCount: scripts.length,
                fontSizes: sizes
            };
        })()`,
        returnByValue: true
    });
    await sleep(400);
    const psp = previewSuperPower.result.value;
    console.log('[DEBUG SUPER POWER SIZES]', psp.fontSizes);
    assert('T3.1_SuperPower_Preview_Visible', psp.wrapDisplay === 'flex', 'Super-power preview displays');
    const allAbove10px = psp.fontSizes.every(s => parseFloat(s) >= 10.5);
    assert('T3.2_All_Nested_Exponents_Floor_Scaled', allAbove10px, `Font sizes: ${JSON.stringify(psp.fontSizes)}`);

    // Chụp screenshot Preview siêu lũy thừa (Light Mode)
    const ssSuper = await send('Page.captureScreenshot', { format: 'png' });
    if (ssSuper && ssSuper.data) {
        const p = path.join(ARTIFACT_DIR, 'preview_super_power_floor.png');
        fs.writeFileSync(p, Buffer.from(ssSuper.data, 'base64'));
        console.log(`[SCREENSHOT] Saved: ${p}`);
    }

    // T4: Chuyển sang Dark Mode và chụp ảnh kiểm chứng cả 2 chế độ
    await send('Runtime.evaluate', {
        expression: `(() => {
            document.documentElement.classList.add('dark');
            document.body.classList.add('dark', 'dark-theme');
        })()`
    });
    await sleep(400);

    const ssSuperDark = await send('Page.captureScreenshot', { format: 'png' });
    if (ssSuperDark && ssSuperDark.data) {
        const pDark = path.join(ARTIFACT_DIR, 'preview_super_power_floor_dark.png');
        fs.writeFileSync(pDark, Buffer.from(ssSuperDark.data, 'base64'));
        console.log(`[SCREENSHOT] Saved: ${pDark}`);
    }

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
