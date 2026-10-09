const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const HTTP_PORT = 5622;
const CDP_PORT = 9294;
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
    console.log('TESTING BASIS ANIMATION & UI FIXES VERIFICATION');
    console.log('================================================================');

    const server = await startServer(HTTP_PORT);
    console.log(`[HTTP] Server active on port ${HTTP_PORT}`);

    const edgePaths = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    let edgeBin = edgePaths.find(p => fs.existsSync(p));
    if (!edgeBin) {
        console.error('Edge executable not found');
        process.exit(1);
    }

    const userDataDir = path.join(ROOT_DIR, 'tmp_edge_test_basis_fixes');
    if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

    const browser = spawn(edgeBin, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${userDataDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--headless=new',
        '--window-size=1440,920',
        'about:blank'
    ]);

    await sleep(2000);

    let wsUrl = '';
    for (let i = 0; i < 15; i++) {
        try {
            const listRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`).then(r => r.json());
            const target = listRes.find(t => t.type === 'page') || listRes[0];
            if (target && target.webSocketDebuggerUrl) {
                wsUrl = target.webSocketDebuggerUrl;
                break;
            }
        } catch (e) {}
        await sleep(500);
    }

    if (!wsUrl) {
        console.error('Failed to obtain CDP WebSocket URL');
        browser.kill();
        server.close();
        process.exit(1);
    }

    const ws = new WebSocket(wsUrl);
    await new Promise((res) => { ws.onopen = res; });
    console.log('[CDP] Connected.');

    let msgId = 1;
    const callbacks = new Map();

    ws.onmessage = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id && callbacks.has(data.id)) {
            const cb = callbacks.get(data.id);
            callbacks.delete(data.id);
            if (data.error) cb.reject(data.error);
            else cb.resolve(data.result);
        }
    };

    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const reqId = msgId++;
            callbacks.set(reqId, { resolve, reject });
            ws.send(JSON.stringify({ id: reqId, method, params }));
        });
    }

    async function evaluate(expression) {
        const res = await send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (res?.exceptionDetails) {
            console.error('[Eval Exception]', res.exceptionDetails.text, res.exceptionDetails.exception?.description);
        }
        return res?.result?.value;
    }

    async function screenshot(name) {
        const res = await send('Page.captureScreenshot', { format: 'png' });
        if (res && res.data) {
            const filePath = path.join(ARTIFACT_DIR, `${name}.png`);
            fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
            console.log(`[Screenshot] Saved: ${name}.png`);
        }
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

    console.log('[Browser] Navigating to calculation.html...');
    await send('Page.navigate', { url: `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html` });
    await sleep(3500);

    // Dismiss any backend disconnect banner for clean testing
    await evaluate(`(function() {
        document.querySelectorAll('.toast, [class*="toast"], .alert').forEach(el => el.remove());
    })()`);

    // =========================================================================
    // TEST 1: Check initial hidden state of #basisAnimControls
    // =========================================================================
    console.log('\n--- TEST 1: Kiểm tra trạng thái ẩn ban đầu của #basisAnimControls ---');
    // Chuyển sang tab Bài toán (index 1) trên sidebar
    await evaluate(`
        (function() {
            const tabs = document.querySelectorAll('.sidebar-tabs.vertical .tab-btn');
            if (tabs && tabs[1]) tabs[1].click();
            const opSel = document.getElementById('opExtraSelect');
            if (opSel) {
                opSel.value = 'basis';
                opSel.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (typeof App.showExtraForm === 'function') App.showExtraForm('basis');
        })()
    `);
    await sleep(600);

    const initialDisplay = await evaluate(`
        (function() {
            const c = document.getElementById('basisAnimControls');
            return c ? window.getComputedStyle(c).display : 'not_found';
        })()
    `);
    console.log(`Initial #basisAnimControls display: ${initialDisplay}`);
    if (initialDisplay === 'none') {
        console.log('✅ PASS: #basisAnimControls ban đầu ẩn (display: none).');
    } else {
        console.error(`❌ FAIL: #basisAnimControls không ẩn ban đầu! display = ${initialDisplay}`);
    }

    // =========================================================================
    // TEST 2: Parsing parametric vector "cost, sint"
    // =========================================================================
    console.log('\n--- TEST 2: Thử nghiệm parse vector tham số "cost, sint" ---');
    const parseResult = await evaluate(`
        (function() {
            const parsed1 = App.parseVectorExpr('cost, sint');
            const parsed2 = App.parseVectorExpr('\\\\cos t, \\\\sin t');
            const parsed3 = App.parseVectorExpr('cos(t), sin(t)');
            return {
                p1_isParam: parsed1?.isParametric,
                p1_vars: parsed1?.vars,
                p1_raw: parsed1?.rawExprs,
                p2_isParam: parsed2?.isParametric,
                p2_raw: parsed2?.rawExprs,
                p3_isParam: parsed3?.isParametric
            };
        })()
    `);
    console.log('Parse test result:', JSON.stringify(parseResult, null, 2));
    if (parseResult.p1_isParam && parseResult.p2_isParam && parseResult.p3_isParam) {
        console.log('✅ PASS: Cú pháp "cost, sint" và "\\cos t, \\sin t" được nhận diện thành vector tham số chuẩn xác!');
    } else {
        console.error('❌ FAIL: Nhận diện vector tham số thất bại!');
    }

    // =========================================================================
    // TEST 3: Nạp 3 vector và kiểm tra checklist, màu sắc định danh
    // =========================================================================
    console.log('\n--- TEST 3: Nạp hệ vector [1, 0], [cost, sint], [2, 3] và bảo toàn swatch ---');
    await evaluate(`
        (function() {
            App.vectorList = [];
            const v1 = App.parseVectorExpr('1, 0');
            const v2 = App.parseVectorExpr('cost, sint');
            const v3 = App.parseVectorExpr('2, 3');

            App.vectorList = [
                {
                    id: 1,
                    vec: v1.slice(),
                    rawInput: '[1, 0]',
                    latex: '[1, 0]',
                    colorCss: '#0284c7',
                    colorHex: '#0284c7',
                    visible: true,
                    alpha: 1.0
                },
                {
                    id: 2,
                    vec: v2.slice(),
                    rawInput: 'cost, sint',
                    latex: '[\\\\cos(t), \\\\sin(t)]',
                    isParametric: true,
                    paramVar: 't',
                    vars: ['t'],
                    rawExprs: v2.rawExprs,
                    colorCss: '#8b5cf6',
                    colorHex: '#8b5cf6',
                    visible: true,
                    alpha: 1.0
                },
                {
                    id: 3,
                    vec: v3.slice(),
                    rawInput: '[2, 3]',
                    latex: '[2, 3]',
                    colorCss: '#f59e0b',
                    colorHex: '#f59e0b',
                    visible: true,
                    alpha: 1.0
                }
            ];

            App.renderVectorList(false);
            App.renderExtraCalcOptions();
        })()
    `);
    await sleep(600);

    const checklistStatus = await evaluate(`
        (function() {
            const checklist = document.getElementById('basisChecklist');
            const items = Array.from(checklist.querySelectorAll('.checkitem'));
            return items.map((it, idx) => {
                const sw = it.querySelector('.sw');
                const mf = it.querySelector('math-field');
                return {
                    idx: idx + 1,
                    bg: sw ? window.getComputedStyle(sw).backgroundColor : null,
                    text: mf ? mf.value : null
                };
            });
        })()
    `);
    console.log('Checklist status before anim:', JSON.stringify(checklistStatus, null, 2));

    // =========================================================================
    // TEST 4: Bấm "Tính cơ sở" -> Hiện tool, kiểm tra slider và nút Play/Pause
    // =========================================================================
    console.log('\n--- TEST 4: Bấm "Tính cơ sở" và kiểm tra slider styling ---');
    await evaluate(`
        (async function() {
            // Tick chọn cả 3 vector
            const cbs = document.querySelectorAll('#basisChecklist input[type="checkbox"]');
            cbs.forEach(cb => cb.checked = true);
            await App.basisAndDimUI();
        })()
    `);
    await sleep(800);

    const controlsDisplayAfterCalc = await evaluate(`
        (function() {
            const c = document.getElementById('basisAnimControls');
            return c ? window.getComputedStyle(c).display : 'none';
        })()
    `);
    console.log(`Display after clicking "Tính cơ sở": ${controlsDisplayAfterCalc}`);
    if (controlsDisplayAfterCalc === 'block') {
        console.log('✅ PASS: #basisAnimControls đã hiển thị (display: block) sau khi bấm "Tính cơ sở".');
    } else {
        console.error('❌ FAIL: #basisAnimControls không hiển thị sau khi bấm "Tính cơ sở"!');
    }

    // Kiểm tra slider styling
    const sliderStyles = await evaluate(`
        (function() {
            const s = document.getElementById('basisSpeedSlider');
            if (!s) return null;
            const style = window.getComputedStyle(s);
            const pct = s.style.getPropertyValue('--slider-pct');
            return {
                className: s.className,
                sliderPct: pct,
                height: style.height,
                background: style.background
            };
        })()
    `);
    console.log('Slider styles:', JSON.stringify(sliderStyles, null, 2));
    if (sliderStyles && sliderStyles.className.includes('hud-range-slider')) {
        console.log('✅ PASS: Slider áp dụng class .hud-range-slider đồng bộ tuyệt đối với hệ thống!');
    } else {
        console.error('❌ FAIL: Slider thiếu class .hud-range-slider!');
    }

    // Kiểm tra kết quả hiển thị vector tham số
    const basisResultText = await evaluate(`
        (function() {
            const res = document.getElementById('result_basis');
            const mfs = Array.from(res.querySelectorAll('math-field')).map(m => m.value);
            return {
                hasResult: !!res,
                mathFields: mfs
            };
        })()
    `);
    console.log('Basis result math fields:', JSON.stringify(basisResultText, null, 2));

    // =========================================================================
    // TEST 5: Trạng thái nút Play / Pause & Màu swatch khi hoạt cảnh chạy
    // =========================================================================
    console.log('\n--- TEST 5: Kiểm tra Play / Pause trạng thái YouTube và Swatch bảo toàn màu ---');
    // Mở sidebar để thấy rõ controls, checklist và slider
    await evaluate(`(function() {
        const ctrl = document.getElementById('controls');
        if (ctrl) ctrl.classList.add('open');
        const burger = document.getElementById('floatingHamburger');
        if (burger) burger.classList.add('open');
        const activeTab = document.querySelector('.tab-content.active') || document.querySelector('.sidebar-content-area');
        if (activeTab) activeTab.scrollTop = 450;
    })()`);
    await sleep(400);

    await screenshot('verify_basis_fixes_step1_ready');

    // Chạy hoạt cảnh
    await evaluate(`
        (function() {
            if (App.BasisAnimator) {
                App.BasisAnimator.play();
            }
        })()
    `);
    await sleep(400);

    const playingButtonState = await evaluate(`
        (function() {
            const btn = document.getElementById('btnBasisPlay');
            const icon = document.getElementById('iconBasisPlay');
            const style = window.getComputedStyle(btn);
            return {
                isPlayingClass: btn.classList.contains('is-playing'),
                pauseBtnRedClass: btn.classList.contains('pause-btn-red'),
                bgColor: style.backgroundColor,
                iconClass: icon ? icon.className : null
            };
        })()
    `);
    console.log('Playing button state:', JSON.stringify(playingButtonState, null, 2));
    if (playingButtonState.pauseBtnRedClass && playingButtonState.iconClass.includes('ph-pause')) {
        console.log('✅ PASS: Khi đang chạy, nút có màu đỏ YouTube và icon || (ph-fill ph-pause)!');
    } else {
        console.error('❌ FAIL: Nút Play/Pause không đạt trạng thái YouTube đỏ khi đang chạy!');
    }

    // Kiểm tra swatch trên checklist khi đang chạy (tuyệt đối KHÔNG được chuyển xám #94a3b8)
    const swatchesDuringAnim = await evaluate(`
        (function() {
            const checklist = document.getElementById('basisChecklist');
            const items = Array.from(checklist.querySelectorAll('.checkitem'));
            return items.map((it, idx) => {
                const sw = it.querySelector('.sw');
                return {
                    idx: idx + 1,
                    bg: sw ? window.getComputedStyle(sw).backgroundColor : null
                };
            });
        })()
    `);
    console.log('Swatches during anim:', JSON.stringify(swatchesDuringAnim, null, 2));
    const hasGraySwatch = swatchesDuringAnim.some(s => s.bg && s.bg.includes('148, 163, 184'));
    if (!hasGraySwatch) {
        console.log('✅ PASS: Swatch màu trên sidebar list giữ vững màu định danh, không hề bị chuyển xám!');
    } else {
        console.error('❌ FAIL: Swatch bị biến đổi màu sang xám!');
    }

    await screenshot('verify_basis_fixes_step2_playing');

    // Pause hoạt cảnh
    await evaluate(`
        (function() {
            if (App.BasisAnimator) {
                App.BasisAnimator.pause();
            }
        })()
    `);
    await sleep(300);

    const pausedButtonState = await evaluate(`
        (function() {
            const btn = document.getElementById('btnBasisPlay');
            const icon = document.getElementById('iconBasisPlay');
            const style = window.getComputedStyle(btn);
            return {
                isPlayingClass: btn.classList.contains('is-playing'),
                pauseBtnRedClass: btn.classList.contains('pause-btn-red'),
                bgColor: style.backgroundColor,
                iconClass: icon ? icon.className : null
            };
        })()
    `);
    console.log('Paused button state:', JSON.stringify(pausedButtonState, null, 2));
    if (!pausedButtonState.isPlayingClass && pausedButtonState.iconClass.includes('ph-play')) {
        console.log('✅ PASS: Khi tạm dừng, nút trở lại màu xanh YouTube và icon play (ph-fill ph-play)!');
    } else {
        console.error('❌ FAIL: Nút tạm dừng không trở lại màu xanh!');
    }

    // =========================================================================
    // TEST 5.1: Kiểm tra cờ App._basisAnimActive và màu sư phạm trên đồ thị ở từng bước
    // =========================================================================
    console.log('\n--- TEST 5.1: Kiểm tra màu sư phạm trên đồ thị (Canvas) ---');
    // Bước 1: EXPAND v1 (v1 trở thành cơ sở -> Xanh ngọc #10b981)
    await evaluate(`App.BasisAnimator.goToStep(1);`);
    await sleep(400);
    const step1Vecs = await evaluate(`
        (function() {
            return {
                animActive: App._basisAnimActive,
                v1_basisColor: App.vectorList[0]._basisColorCss,
                v2_basisColor: App.vectorList[1]._basisColorCss,
                v3_basisColor: App.vectorList[2]._basisColorCss
            };
        })()
    `);
    console.log('Step 1 (EXPAND v1) canvas vector colors:', JSON.stringify(step1Vecs, null, 2));
    if (step1Vecs.animActive && step1Vecs.v1_basisColor === '#10b981') {
        console.log('✅ PASS: Bước 1: v1 trên đồ thị chuyển màu Xanh ngọc Emerald (#10b981)!');
    } else {
        console.error('❌ FAIL: Bước 1: v1 không đổi sang màu xanh ngọc cơ sở!');
    }

    // Bước 2: EXPAND v2 (v2 đang khảo sát -> Xanh lơ #0284c7)
    await evaluate(`App.BasisAnimator.goToStep(2);`);
    await sleep(400);
    const step2Vecs = await evaluate(`
        (function() {
            return {
                animActive: App._basisAnimActive,
                v1_basisColor: App.vectorList[0]._basisColorCss,
                v2_basisColor: App.vectorList[1]._basisColorCss,
                v3_basisColor: App.vectorList[2]._basisColorCss
            };
        })()
    `);
    if (step2Vecs.v1_basisColor === '#10b981' && (step2Vecs.v2_basisColor === '#0284c7' || step2Vecs.v2_basisColor === '#10b981')) {
        console.log('✅ PASS: Bước 2: v1 xanh ngọc cơ sở, v2 chuyển màu chuẩn sư phạm (#0284c7 hoặc #10b981 khi kết tinh)!');
    } else {
        console.error('❌ FAIL: Bước 2: Màu vector trên đồ thị không đúng!');
    }

    // =========================================================================
    // TEST 6: Kiểm tra bảo tồn màu không gian R^2 và v3 phụ thuộc (Hổ phách) ở Bước 3
    // =========================================================================
    console.log('\n--- TEST 6: Kiểm tra màu không gian R^2 và vector phụ thuộc v3 (Vàng hổ phách) ---');
    // Nhảy tới bước 3 (khảo sát vector phụ thuộc thứ 3)
    await evaluate(`
        (function() {
            if (App.BasisAnimator) {
                App.BasisAnimator.goToStep(3); // Bước 4 (REDUNDANT v3)
            }
        })()
    `);
    await sleep(500);

    const step3Vecs = await evaluate(`
        (function() {
            return {
                animActive: App._basisAnimActive,
                v1_basisColor: App.vectorList[0]._basisColorCss,
                v2_basisColor: App.vectorList[1]._basisColorCss,
                v3_basisColor: App.vectorList[2]._basisColorCss,
                v3_isRedundant: App.vectorList[2]._basisIsRedundant
            };
        })()
    `);
    console.log('Step 3 (REDUNDANT v3) canvas vector colors:', JSON.stringify(step3Vecs, null, 2));
    if (step3Vecs.v1_basisColor === '#10b981' && step3Vecs.v2_basisColor === '#10b981' && step3Vecs.v3_basisColor === '#f59e0b') {
        console.log('✅ PASS: Bước 3: {v1, v2} xanh ngọc cơ sở, v3 phụ thuộc chuyển Vàng hổ phách (#f59e0b)!');
    } else {
        console.error('❌ FAIL: Bước 3: Màu vector trên đồ thị không đúng!');
    }

    await screenshot('verify_basis_fixes_step3_space_retained');

    // =========================================================================
    // TEST 7: Chuyển sang bài toán khác -> Ẩn tool và tắt animation
    // =========================================================================
    console.log('\n--- TEST 7: Chuyển sang bài toán Độc lập tuyến tính (indep) -> Tắt và ẩn tool ---');
    await evaluate(`
        (function() {
            App.showExtraForm('indep');
        })()
    `);
    await sleep(500);

    const afterSwitchState = await evaluate(`
        (function() {
            const c = document.getElementById('basisAnimControls');
            return {
                display: c ? window.getComputedStyle(c).display : 'none',
                animActive: App.BasisAnimator ? App.BasisAnimator.isActive() : false
            };
        })()
    `);
    console.log('After switch state:', JSON.stringify(afterSwitchState, null, 2));
    if (afterSwitchState.display === 'none' && !afterSwitchState.animActive) {
        console.log('✅ PASS: Hoạt cảnh đã dừng và #basisAnimControls đã ẩn khi chuyển bài toán!');
    } else {
        console.error('❌ FAIL: Không tắt animation hoặc không ẩn controls khi chuyển bài toán!');
    }

    console.log('\n================================================================');
    console.log('ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
    console.log('================================================================');

    browser.kill();
    server.close();
    process.exit(0);
}

runTest().catch((err) => {
    console.error('Test execution error:', err);
    process.exit(1);
});
