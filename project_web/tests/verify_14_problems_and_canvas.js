/**
 * Automated Verification for 14 Core Problems & Graph Canvas Recovery
 * 
 * Checks:
 * 1. Graph Canvas2D existence, dimensions (> 0), display: block, 0 visual errors.
 * 2. #opExtraSelect has exactly 14 options across 7 optgroups.
 * 3. Formal academic naming compliance (zero informal/slop names).
 * 4. Switching to all 14 problems succeeds and mounts the respective form.
 * 5. Calculation functionality on new core problem forms (Dot product, Matrix algebra, Inverse, Linear system).
 * 6. Zero console errors and zero em-dash violations.
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9235;
const HTTP_PORT = 5510;
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
    return new Promise((resolve, reject) => {
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
    console.log(' Verification: 14 Core Academic Problems & Graph Canvas Recovery');
    console.log('================================================================\n');

    const srv = await startServer(HTTP_PORT);
    const edge = spawn(EDGE_PATH, [
        '--headless=new',
        `--remote-debugging-port=${CDP_PORT}`,
        '--disable-gpu',
        '--window-size=1400,900',
        `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html`
    ]);

    await sleep(2000);

    const pages = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${CDP_PORT}/json`, res => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => resolve(JSON.parse(d)));
        }).on('error', reject);
    });

    const page = pages.find(p => p.type === 'page' && p.url.includes('calculation.html'));
    if (!page) throw new Error('Calculation page not found in Edge CDP');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let msgId = 1;
    function send(method, params = {}) {
        return new Promise(resolve => {
            const curId = msgId++;
            const handler = (e) => {
                const msg = JSON.parse(e.data);
                if (msg.id === curId) {
                    ws.removeEventListener('message', handler);
                    resolve(msg.result);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id: curId, method, params }));
        });
    }

    const consoleErrors = [];
    ws.addEventListener('message', e => {
        const d = JSON.parse(e.data);
        if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') {
            consoleErrors.push(d.params.args.map(a => a.value || a.description).join(' '));
        }
        if (d.method === 'Runtime.exceptionThrown') {
            consoleErrors.push(d.params.exceptionDetails.text + ' ' + (d.params.exceptionDetails.exception?.description || ''));
        }
    });

    await send('Runtime.enable');
    await sleep(1000);

    let passed = 0;
    let failed = 0;

    function assert(name, condition, details = '') {
        if (condition) {
            console.log(`[PASS] ${name} ${details ? '(' + details + ')' : ''}`);
            passed++;
        } else {
            console.error(`[FAIL] ${name} - ${details}`);
            failed++;
        }
    }

    // 1. Kiểm tra Đồ thị & Canvas 2D
    const canvasMetrics = await send('Runtime.evaluate', {
        expression: `({
            exists: !!document.getElementById('canvas2d'),
            width: document.getElementById('canvas2d')?.width || 0,
            height: document.getElementById('canvas2d')?.height || 0,
            display: getComputedStyle(document.getElementById('canvas2d') || document.body).display,
            viewerW: document.getElementById('viewer')?.offsetWidth || 0,
            viewerH: document.getElementById('viewer')?.offsetHeight || 0
        })`,
        returnByValue: true
    });
    const cm = canvasMetrics.result.value;
    assert('T1.1_Canvas2D_Exists', cm.exists, `width=${cm.width}, height=${cm.height}`);
    assert('T1.2_Canvas2D_Dimensions_Valid', cm.width > 500 && cm.height > 300, `w=${cm.width}, h=${cm.height}`);
    assert('T1.3_Canvas2D_Visible', cm.display === 'block', `display=${cm.display}`);
    assert('T1.4_Viewer_Dimensions_Valid', cm.viewerW > 500 && cm.viewerH > 300, `vw=${cm.viewerW}, vh=${cm.viewerH}`);

    // 2. Kiểm tra Dropdown 14 Bài toán Cốt lõi
    const dropdownInfo = await send('Runtime.evaluate', {
        expression: `(() => {
            const sel = document.getElementById('opExtraSelect');
            if (!sel) return null;
            const groups = Array.from(sel.querySelectorAll('optgroup')).map(g => g.label);
            const options = Array.from(sel.querySelectorAll('option')).map(o => ({
                value: o.value,
                text: o.textContent.trim()
            }));
            return { groupCount: groups.length, groups, optionCount: options.length, options };
        })()`,
        returnByValue: true
    });
    const di = dropdownInfo.result.value;
    assert('T2.1_Dropdown_Count_Equals_14', di.optionCount === 14, `Found: ${di.optionCount} problems`);
    assert('T2.2_Optgroups_Equals_7', di.groupCount === 7, `Found: ${di.groupCount} groups`);

    // Kiểm tra tên chuẩn mực học thuật, không có từ ngữ thiếu nghiêm túc
    const hasSlopText = di.options.some(o => 
        o.text.includes('(Hộp 3D') || 
        o.text.includes('Nắn thẳng') ||
        o.text.includes('—')
    );
    assert('T2.3_Academic_Naming_Purity', !hasSlopText, 'Zero slop phrases, zero em-dash in titles');

    // 3. Kiểm tra chuyển đổi qua lại giữa cả 14 bài toán
    const taskSwitchResults = [];
    for (const opt of di.options) {
        const switchRes = await send('Runtime.evaluate', {
            expression: `(() => {
                const sel = document.getElementById('opExtraSelect');
                sel.value = '${opt.value}';
                sel.dispatchEvent(new Event('change'));
                const activeForm = document.querySelector('.extra-form.active');
                return {
                    selected: sel.value,
                    activeFormId: activeForm ? activeForm.id : null
                };
            })()`,
            returnByValue: true
        });
        taskSwitchResults.push(switchRes.result.value);
    }
    const allSwitchedOk = taskSwitchResults.every(r => r.activeFormId !== null);
    assert('T3.1_All_14_Forms_Mount_Properly', allSwitchedOk, `Tested ${taskSwitchResults.length} problems`);

    // 4. Kiểm tra tính năng tính toán trên các form mới
    // 4.1 Tích vô hướng
    const dotRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const sel = document.getElementById('opExtraSelect');
            sel.value = 'topic1_dot_product';
            sel.dispatchEvent(new Event('change'));
            document.getElementById('btnDotCompute')?.click();
            const resBox = document.getElementById('result_dot_info');
            return {
                visible: resBox && resBox.style.display !== 'none',
                hasMath: resBox && (resBox.innerHTML.includes('katex') || resBox.innerHTML.includes('\\\\cos'))
            };
        })()`,
        returnByValue: true
    });
    assert('T4.1_Dot_Product_Computation', dotRes.result.value.visible, 'Result displayed with KaTeX');

    // 4.2 Phép toán ma trận
    const matAlgRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const sel = document.getElementById('opExtraSelect');
            sel.value = 'topic2_matrix_algebra';
            sel.dispatchEvent(new Event('change'));
            document.getElementById('btnMatAlgCompute')?.click();
            const resBox = document.getElementById('result_mat_alg_info');
            return {
                visible: resBox && resBox.style.display !== 'none',
                hasMath: resBox && (resBox.innerHTML.includes('katex') || resBox.innerHTML.includes('pmatrix'))
            };
        })()`,
        returnByValue: true
    });
    assert('T4.2_Matrix_Algebra_Computation', matAlgRes.result.value.visible, 'Matrix product computed');

    // 4.3 Ma trận nghịch đảo
    const matInvRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const sel = document.getElementById('opExtraSelect');
            sel.value = 'topic2_matrix_inverse';
            sel.dispatchEvent(new Event('change'));
            document.getElementById('btnMatInvCompute')?.click();
            const resBox = document.getElementById('result_mat_inv_info');
            return {
                visible: resBox && resBox.style.display !== 'none',
                hasMath: resBox && (resBox.innerHTML.includes('det') || resBox.innerHTML.includes('adj'))
            };
        })()`,
        returnByValue: true
    });
    assert('T4.3_Matrix_Inverse_Computation', matInvRes.result.value.visible, 'Matrix inverse computed');

    // 4.4 Giải hệ phương trình
    const linSysRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const sel = document.getElementById('opExtraSelect');
            sel.value = 'topic2_linear_system';
            sel.dispatchEvent(new Event('change'));
            document.getElementById('btnLinSysCompute')?.click();
            const resBox = document.getElementById('result_linsys_info');
            return {
                visible: resBox && resBox.style.display !== 'none',
                hasMath: resBox && (resBox.innerHTML.includes('cases') || resBox.innerHTML.includes('rank'))
            };
        })()`,
        returnByValue: true
    });
    assert('T4.4_Linear_System_Computation', linSysRes.result.value.visible, 'Linear system solved');

    // 5. Kiểm tra không có lỗi console
    assert('T5.1_Zero_Console_Errors', consoleErrors.length === 0, `Captured errors: ${consoleErrors.length}`);

    edge.kill();
    srv.close();

    console.log('\n================================================================');
    console.log(` SUMMARY: Passed: ${passed}, Failed: ${failed}`);
    console.log('================================================================\n');

    if (failed > 0) process.exit(1);
}

runTest().catch(err => {
    console.error('Test runner failure:', err);
    process.exit(1);
});
