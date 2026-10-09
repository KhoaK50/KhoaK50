/**
 * Automated Verification for Topbar Dropdown Sizing & Consistency
 * Ensures that dropdowns on calculation.html match index.html perfectly.
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9255;
const HTTP_PORT = 5530;
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

async function run() {
    console.log('================================================================');
    console.log('STARTING TOPBAR DROPDOWN CONSISTENCY VERIFICATION');
    console.log('================================================================');

    const server = await startServer(HTTP_PORT);
    const edge = spawn(EDGE_PATH, [
        `--remote-debugging-port=${CDP_PORT}`,
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--user-data-dir=' + path.join(ROOT_DIR, 'scratch', 'edge_dropdown_test_' + Date.now()),
        `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html`
    ]);

    await sleep(2500);

    let targetPage = null;
    for (let i = 0; i < 15; i++) {
        try {
            const listData = await new Promise((resolve, reject) => {
                http.get(`http://127.0.0.1:${CDP_PORT}/json/list`, res => {
                    let b = ''; res.on('data', c => b += c);
                    res.on('end', () => resolve(JSON.parse(b)));
                }).on('error', reject);
            });
            targetPage = listData.find(p => p.type === 'page' && !p.url.startsWith('edge://'));
            if (targetPage && targetPage.webSocketDebuggerUrl) break;
        } catch (e) {
            await sleep(500);
        }
    }

    if (!targetPage) {
        console.error('Failed to connect to Edge CDP');
        edge.kill(); server.close(); process.exit(1);
    }

    const ws = new WebSocket(targetPage.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

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
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

    async function inspectDropdowns(pagePath) {
        await send('Page.navigate', { url: `http://127.0.0.1:${HTTP_PORT}${pagePath}` });
        await sleep(2000);

        const evalRes = await send('Runtime.evaluate', {
            expression: `(() => {
                const exploreContainer = document.querySelector('.vec-nav-links .vec-dropdown-container');
                exploreContainer.classList.add('open');
                const exploreMenu = exploreContainer.querySelector('.vec-dropdown-menu');
                const exploreItems = Array.from(exploreMenu.querySelectorAll('.vec-dropdown-item'));

                const langContainer = document.querySelector('.vec-topbar-right .vec-dropdown-container');
                langContainer.classList.add('open');
                const langMenu = langContainer.querySelector('.vec-dropdown-menu');
                const langItems = Array.from(langMenu.querySelectorAll('.vec-dropdown-item'));

                function getMetrics(el) {
                    const cs = window.getComputedStyle(el);
                    const rect = el.getBoundingClientRect();
                    return {
                        width: rect.width,
                        height: rect.height,
                        padding: cs.padding,
                        fontSize: cs.fontSize,
                        boxSizing: cs.boxSizing
                    };
                }

                return {
                    exploreMenu: getMetrics(exploreMenu),
                    exploreFirstItem: exploreItems[0] ? getMetrics(exploreItems[0]) : null,
                    langMenu: getMetrics(langMenu),
                    langFirstItem: langItems[0] ? getMetrics(langItems[0]) : null
                };
            })()`,
            returnByValue: true
        });

        return evalRes.result.value;
    }

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

    const indexData = await inspectDropdowns('/frontend_v2/index.html');
    const calcData = await inspectDropdowns('/frontend_v2/calculation.html');

    console.log('\n--- INDEX METRICS ---', JSON.stringify(indexData, null, 2));
    console.log('--- CALC METRICS ---', JSON.stringify(calcData, null, 2));

    // Verify Calculation Page Matches Expectations
    assert('C1.1_Explore_Menu_Width', calcData.exploreMenu.width >= 240, `Width: ${calcData.exploreMenu.width}px`);
    assert('C1.2_Explore_Menu_BoxSizing', calcData.exploreMenu.boxSizing === 'border-box', `BoxSizing: ${calcData.exploreMenu.boxSizing}`);
    assert('C1.3_Explore_Item_FontSize_14px', calcData.exploreFirstItem.fontSize === '14px', `FontSize: ${calcData.exploreFirstItem.fontSize}`);
    assert('C1.4_Explore_Item_Padding_12px_20px', calcData.exploreFirstItem.padding === '12px 20px', `Padding: ${calcData.exploreFirstItem.padding}`);
    assert('C1.5_Explore_Item_Height', calcData.exploreFirstItem.height >= 40, `Height: ${calcData.exploreFirstItem.height}px`);

    assert('C2.1_Lang_Menu_Width', calcData.langMenu.width >= 150, `Width: ${calcData.langMenu.width}px`);
    assert('C2.2_Lang_Menu_BoxSizing', calcData.langMenu.boxSizing === 'border-box', `BoxSizing: ${calcData.langMenu.boxSizing}`);
    assert('C2.3_Lang_Item_FontSize_14px', calcData.langFirstItem.fontSize === '14px', `FontSize: ${calcData.langFirstItem.fontSize}`);
    assert('C2.4_Lang_Item_Padding_12px_20px', calcData.langFirstItem.padding === '12px 20px', `Padding: ${calcData.langFirstItem.padding}`);
    assert('C2.5_Lang_Item_Height', calcData.langFirstItem.height >= 40, `Height: ${calcData.langFirstItem.height}px`);

    // Verify Parity with Index Page
    assert('P1.1_Parity_Explore_Item_FontSize', calcData.exploreFirstItem.fontSize === indexData.exploreFirstItem.fontSize, `Index: ${indexData.exploreFirstItem.fontSize}, Calc: ${calcData.exploreFirstItem.fontSize}`);
    assert('P1.2_Parity_Explore_Item_Padding', calcData.exploreFirstItem.padding === indexData.exploreFirstItem.padding, `Index: ${indexData.exploreFirstItem.padding}, Calc: ${calcData.exploreFirstItem.padding}`);
    assert('P1.3_Parity_Explore_Item_Height', Math.abs(calcData.exploreFirstItem.height - indexData.exploreFirstItem.height) <= 1, `Index: ${indexData.exploreFirstItem.height}, Calc: ${calcData.exploreFirstItem.height}`);
    assert('P2.1_Parity_Lang_Item_FontSize', calcData.langFirstItem.fontSize === indexData.langFirstItem.fontSize, `Index: ${indexData.langFirstItem.fontSize}, Calc: ${calcData.langFirstItem.fontSize}`);
    assert('P2.2_Parity_Lang_Item_Padding', calcData.langFirstItem.padding === indexData.langFirstItem.padding, `Index: ${indexData.langFirstItem.padding}, Calc: ${calcData.langFirstItem.padding}`);
    assert('P2.3_Parity_Lang_Item_Height', Math.abs(calcData.langFirstItem.height - indexData.langFirstItem.height) <= 1, `Index: ${indexData.langFirstItem.height}, Calc: ${calcData.langFirstItem.height}`);

    console.log('================================================================');
    console.log(`VERIFICATION COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('================================================================');

    ws.close();
    edge.kill();
    server.close();

    process.exit(failCount === 0 ? 0 : 1);
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
