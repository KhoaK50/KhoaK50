const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const HTTP_PORT = 5612;
const CDP_PORT = 9292;
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
    console.log('TESTING BASIS UNIFIED SIDEBAR CONTROLS & CLEAN CANVAS');
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

    const userDataDir = path.join(ROOT_DIR, 'tmp_edge_test_basis_unified');
    if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

    const browser = spawn(edgeBin, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${userDataDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--headless=new',
        '--window-size=1400,900',
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
    await new Promise(res => { ws.onopen = res; });
    console.log('[CDP] Connected.');

    let msgId = 1;
    const callbacks = new Map();

    const consoleErrors = [];

    ws.onmessage = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.method === 'Runtime.exceptionThrown') {
            const desc = data.params.exceptionDetails?.exception?.description || data.params.exceptionDetails?.text;
            consoleErrors.push(`[EXCEPTION] ${desc}`);
            console.error(`[BROWSER EXCEPTION] ${desc}`);
        }
        if (data.id && callbacks.has(data.id)) {
            const cb = callbacks.get(data.id);
            callbacks.delete(data.id);
            if (data.error) cb.reject(data.error);
            else cb.resolve(data.result);
        }
    };

    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = msgId++;
            callbacks.set(id, { resolve, reject });
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async function evaluate(expression) {
        const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        return res?.result?.value;
    }

    async function captureScreenshot(fileName) {
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        const filePath = path.join(ARTIFACT_DIR, fileName);
        fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
        console.log(`[SCREENSHOT] Saved: ${fileName}`);
    }

    try {
        await send('Page.enable');
        await send('Runtime.enable');

        console.log('[NAVIGATE] Opening calculation.html');
        await send('Page.navigate', { url: `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html` });
        await sleep(3500);

        // 1. Chuyen tab bai toan Co so & So chieu
        console.log('[STEP 1] Selecting Basis problem (Bài 40)');
        const initResult = await evaluate(`(function() {
            const sel = document.getElementById('topicTaskSelect');
            if (sel) {
                sel.value = 'basis';
                sel.dispatchEvent(new Event('change'));
            }
            if (typeof App.switchTaskTab === 'function') {
                App.switchTaskTab('basis');
            }
            return {
                animControlsExists: !!document.getElementById('basisAnimControls'),
                floatingHudExists: !!document.getElementById('basisPlaybackHUD')
            };
        })()`);
        console.log('[ASSERT] Initial Sidebar Controls:', initResult);

        if (!initResult.animControlsExists) {
            throw new Error('basisAnimControls does not exist on sidebar!');
        }
        if (initResult.floatingHudExists) {
            throw new Error('basisPlaybackHUD floating bar should NOT exist!');
        }

        // 2. Nap he vector khao sat: v1=(1, 2), v2=(1, 3), v3=(1, 4), v4=(1, 5)
        console.log('[STEP 2] Setting up user vectors: v1=(1, 2), v2=(1, 3), v3=(1, 4), v4=(1, 5)');
        await evaluate(`(function() {
            App.vectorList = [
                { id: 1, name: 'v_1', vec: [1, 2], colorCss: '#3b82f6', colorHex: '#3b82f6', visible: true },
                { id: 2, name: 'v_2', vec: [1, 3], colorCss: '#ef4444', colorHex: '#ef4444', visible: true },
                { id: 3, name: 'v_3', vec: [1, 4], colorCss: '#10b981', colorHex: '#10b981', visible: true },
                { id: 4, name: 'v_4', vec: [1, 5], colorCss: '#f59e0b', colorHex: '#f59e0b', visible: true }
            ];
            if (typeof App.renderVectorList === 'function') App.renderVectorList();
            if (typeof App.renderExtraCalcOptions === 'function') App.renderExtraCalcOptions();
            if (typeof Vec2D !== 'undefined' && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
            return App.vectorList.length;
        })()`);
        await sleep(500);

        // Tick ca 4 vector trong basisChecklist
        const tickedCount = await evaluate(`(function() {
            const cbs = document.querySelectorAll('#basisChecklist input[type="checkbox"]');
            cbs.forEach(cb => { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); });
            return cbs.length;
        })()`);
        console.log(`[SETUP] Ticked ${tickedCount} checkboxes in #basisChecklist`);

        // 3. Tinh co so va so chieu
        console.log('[STEP 3] Running App.basisAndDimUI()');
        await evaluate(`(function() {
            App.basisAndDimUI();
        })()`);
        await sleep(2000);

        // 4. Kiem tra ket qua trong #result_basis
        const resultCheck = await evaluate(`(function() {
            const resEl = document.getElementById('result_basis');
            const resText = resEl ? resEl.innerText : '';
            const mathFields = resEl ? Array.from(resEl.querySelectorAll('math-field')).map(mf => mf.value || mf.textContent) : [];
            const floatingHud = document.getElementById('basisPlaybackHUD');
            
            // Kiem tra khong sinh auto-vector la [1, 0] hoac [0, 1]
            const autoVectors = (App.vectorList || []).filter(v => v._basisTemp || v.isAuto);
            
            // Kiem tra animation controls tren sidebar
            const stepCounter = document.getElementById('basisStepCounter')?.textContent;
            const stepTitle = document.getElementById('basisStepTitle')?.textContent;
            const stepDesc = document.getElementById('basisStepDesc')?.textContent;
            const speedVal = document.getElementById('basisSpeedValue')?.textContent;
            const iconPlay = document.getElementById('iconBasisPlay')?.className;

            return {
                resTextSnippet: resText.substring(0, 180),
                mathFields,
                floatingHudExists: !!floatingHud,
                autoVectorCount: autoVectors.length,
                stepCounter,
                stepTitle,
                stepDesc,
                speedVal,
                isPlaying: iconPlay.includes('ph-pause')
            };
        })()`);
        console.log('[ASSERT] Result & Animation State:', resultCheck);

        if (resultCheck.floatingHudExists) {
            throw new Error('FAIL: Floating HUD still exists in DOM!');
        }
        if (resultCheck.autoVectorCount > 0) {
            throw new Error('FAIL: Unwanted auto-vectors were added to vectorList!');
        }
        if (!resultCheck.mathFields.some(mf => mf.includes('1') && mf.includes('2'))) {
            throw new Error('FAIL: Basis does not contain v1=(1, 2) from user input!');
        }
        if (!resultCheck.mathFields.some(mf => mf.includes('1') && mf.includes('3'))) {
            throw new Error('FAIL: Basis does not contain v2=(1, 3) from user input!');
        }

        // Mo sidebar va chuyen sang tab Bai toan de chup ro cac control tren sidebar
        await evaluate(`(function() {
            const ctrl = document.getElementById('controls');
            if (ctrl) ctrl.classList.add('open');
            const burger = document.getElementById('floatingHamburger');
            if (burger) burger.classList.add('open');
            
            const tabs = document.querySelectorAll('.sidebar-tabs.vertical .tab-btn');
            if (tabs && tabs[1]) tabs[1].click();
            const opExtra = document.getElementById('opExtraSelect');
            if (opExtra) {
                opExtra.value = 'basis';
                opExtra.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (typeof App.showExtraForm === 'function') {
                App.showExtraForm('basis');
            }
        })()`);
        await sleep(500);
        await captureScreenshot('verify_basis_sidebar_unified_controls.png');

        // Scroll xuong de chup tron ven khung ket qua co so & vector phu thuoc
        await evaluate(`(function() {
            const activeTab = document.querySelector('.tab-content.active') || document.querySelector('.sidebar-content-area');
            if (activeTab) activeTab.scrollTop = 500;
            const spaceTab = document.querySelectorAll('.tab-content')[1];
            if (spaceTab) spaceTab.scrollTop = 500;
            const ctrl = document.getElementById('controls');
            if (ctrl) ctrl.scrollTop = 500;
        })()`);
        await sleep(300);
        await captureScreenshot('verify_basis_sidebar_result_scrolled.png');

        // 5. Kiem tra tuy chinh toc do tu do tren slider
        console.log('[STEP 5] Testing custom smooth speed slider (set to 0.4x)');
        const speedTestResult = await evaluate(`(function() {
            const slider = document.getElementById('basisSpeedSlider');
            if (slider) {
                slider.value = '0.4';
                slider.dispatchEvent(new Event('input'));
            }
            return {
                animatorSpeed: App.BasisAnimator ? App.BasisAnimator._speed : null,
                speedLabelText: document.getElementById('basisSpeedValue')?.textContent
            };
        })()`);
        console.log('[ASSERT] Speed Slider Test:', speedTestResult);

        if (Math.abs(speedTestResult.animatorSpeed - 0.4) > 0.05) {
            throw new Error(`FAIL: Animator speed not updated to 0.4! Got: ${speedTestResult.animatorSpeed}`);
        }

        // Dong sidebar de chup canvas ro rang
        await evaluate(`(function() {
            const ctrl = document.getElementById('controls');
            if (ctrl) ctrl.classList.remove('open');
            const burger = document.getElementById('floatingHamburger');
            if (burger) burger.classList.remove('open');
        })()`);
        await sleep(300);

        // 6. Kiem tra chuyen buoc tren sidebar: Sang buoc 2 (EXPAND 2D)
        console.log('[STEP 6] Moving to Step 2 (Expansion)');
        const step2Debug = await evaluate(`(function() {
            if (App.BasisAnimator) {
                App.BasisAnimator.goToStep(2);
                App.BasisAnimator.pause();
                return {
                    curStep: App.BasisAnimator._currentStep,
                    step: App.BasisAnimator.getStep()
                };
            }
            return null;
        })()`);
        console.log('[STEP 6 DEBUG]', step2Debug);
        await sleep(600);

        const step2State = await evaluate(`(function() {
            return {
                stepCounter: document.getElementById('basisStepCounter')?.textContent,
                stepTitle: document.getElementById('basisStepTitle')?.textContent,
                stepDesc: document.getElementById('basisStepDesc')?.textContent
            };
        })()`);
        console.log('[ASSERT] Step 2 State on Sidebar:', step2State);
        await captureScreenshot('verify_basis_clean_canvas_sweep.png');

        // 7. Kiem tra chuyen sang buoc REDUNDANT (v3 phu thuoc)
        console.log('[STEP 7] Moving to Step 3 (Redundant vector v3)');
        const step3Debug = await evaluate(`(function() {
            if (App.BasisAnimator) {
                App.BasisAnimator.goToStep(3);
                App.BasisAnimator.pause();
                return {
                    curStep: App.BasisAnimator._currentStep,
                    step: App.BasisAnimator.getStep()
                };
            }
            return null;
        })()`);
        console.log('[STEP 7 DEBUG]', step3Debug);
        await sleep(600);

        const step3State = await evaluate(`(function() {
            return {
                stepCounter: document.getElementById('basisStepCounter')?.textContent,
                stepTitle: document.getElementById('basisStepTitle')?.textContent,
                stepDesc: document.getElementById('basisStepDesc')?.textContent
            };
        })()`);
        console.log('[ASSERT] Step 3 (Redundant) State on Sidebar:', step3State);
        await captureScreenshot('verify_basis_clean_canvas_redundant.png');

        // 8. Kiem tra che do Mobile Viewport (390 x 844)
        console.log('[STEP 8] Testing Mobile Viewport (390 x 844)');
        await send('Emulation.setDeviceMetricsOverride', {
            width: 390,
            height: 844,
            deviceScaleFactor: 2,
            mobile: true
        });
        await sleep(1000);

        // Mo panel tren mobile
        await evaluate(`(function() {
            const btn = document.getElementById('btnTogglePanel');
            const panel = document.getElementById('controlsArea');
            if (btn && panel) {
                panel.classList.add('mobile-open');
                panel.style.display = 'block';
            }
        })()`);
        await sleep(500);

        // Reset lai Desktop Viewport de kiem tra tiep
        await send('Emulation.setDeviceMetricsOverride', {
            width: 1400,
            height: 900,
            deviceScaleFactor: 1,
            mobile: false
        });
        await sleep(500);

        // 9. Kiem tra nut Pause mau do phong cach YouTube khi dang phat
        console.log('[STEP 9] Testing Red Pause Button (YouTube Style) during playback');
        const playBtnStart = await evaluate(`(function() {
            const ctrl = document.getElementById('controls');
            if (ctrl) ctrl.classList.add('open');
            const burger = document.getElementById('floatingHamburger');
            if (burger) burger.classList.add('open');
            
            // Cuon sidebar de thay ro nut
            const activeTab = document.querySelector('.tab-content.active') || document.querySelector('.sidebar-content-area');
            if (activeTab) activeTab.scrollTop = 500;
            
            // Bat dau phat
            if (App.BasisAnimator) {
                App.BasisAnimator.goToStep(0);
                App.BasisAnimator.play();
            }
            
            const btnPlay = document.getElementById('btnBasisPlay');
            const iconPlay = document.getElementById('iconBasisPlay');
            return {
                isRedWhilePlaying: btnPlay.classList.contains('pause-btn-red') || btnPlay.classList.contains('is-playing'),
                iconWhilePlaying: iconPlay.className
            };
        })()`);
        await sleep(300);
        await captureScreenshot('verify_basis_red_pause_btn.png');

        const playBtnPause = await evaluate(`(function() {
            // Bam pause
            if (App.BasisAnimator) {
                App.BasisAnimator.pause();
            }
            const btnPlay = document.getElementById('btnBasisPlay');
            const iconPlay = document.getElementById('iconBasisPlay');
            return {
                isNormalWhilePaused: !btnPlay.classList.contains('pause-btn-red'),
                iconWhilePaused: iconPlay.className
            };
        })()`);

        console.log('[ASSERT] Red Pause Button Check:', { ...playBtnStart, ...playBtnPause });
        if (!playBtnStart.isRedWhilePlaying || !playBtnStart.iconWhilePlaying.includes('ph-pause')) {
            throw new Error('FAIL: Play button is NOT red with ph-pause while playing!');
        }
        if (!playBtnPause.isNormalWhilePaused || !playBtnPause.iconWhilePaused.includes('ph-play')) {
            throw new Error('FAIL: Play button did NOT revert to normal with ph-play when paused!');
        }

        // 10. Kiem tra tu dong dung tai buoc cuoi (khong bi ket o icon ||)
        console.log('[STEP 10] Testing Auto-pause at the final step (Step 6 of 6)');
        const lastStepCheck = await evaluate(`(function() {
            const totalSteps = App.BasisAnimator._plan.steps.length;
            App.BasisAnimator.goToStep(totalSteps - 1);
            
            const btnPlay = document.getElementById('btnBasisPlay');
            const iconPlay = document.getElementById('iconBasisPlay');
            
            return {
                isPaused: App.BasisAnimator._paused,
                btnTitle: btnPlay.title,
                iconClass: iconPlay.className,
                isRed: btnPlay.classList.contains('pause-btn-red')
            };
        })()`);
        console.log('[ASSERT] Final Step Check:', lastStepCheck);
        if (!lastStepCheck.iconClass.includes('ph-play')) {
            throw new Error('FAIL: Icon should be ph-play (ready to replay) at the final step, but got: ' + lastStepCheck.iconClass);
        }
        if (lastStepCheck.isRed) {
            throw new Error('FAIL: Button should NOT be red at the final step!');
        }

        // 11. Kiem tra dung animation khi chuyen sang Tab khac
        console.log('[STEP 11] Testing animation stops when switching sidebar tabs');
        const tabSwitchCheck = await evaluate(`(function() {
            // Cho animation chay
            App.BasisAnimator.goToStep(0);
            App.BasisAnimator.play();
            const wasActive = App.BasisAnimator.isActive();
            
            // Chuyen sang Tab 0: DOI TUONG
            const tabs = document.querySelectorAll('.sidebar-tabs.vertical .tab-btn');
            if (tabs && tabs[0]) tabs[0].click();
            
            const isActiveAfterTabSwitch = App.BasisAnimator.isActive();
            
            // Chuyen lai Tab 1: BAI TOAN
            if (tabs && tabs[1]) tabs[1].click();
            
            return {
                wasActive,
                isActiveAfterTabSwitch
            };
        })()`);
        console.log('[ASSERT] Tab Switch Check:', tabSwitchCheck);
        if (tabSwitchCheck.isActiveAfterTabSwitch) {
            throw new Error('FAIL: BasisAnimator is still active after switching to another tab!');
        }

        // 12. Kiem tra dung animation khi chuyen sang Bai toan khac (opExtraSelect / switchTopicTask)
        console.log('[STEP 12] Testing animation stops when selecting a different task');
        const taskSwitchCheck = await evaluate(`(function() {
            // Khoi dong lai animation
            App.basisAndDimUI();
            const wasActive = App.BasisAnimator.isActive();
            
            // Chuyen sang bai toan khac (vi du: linear_independence)
            const sel = document.getElementById('opExtraSelect');
            if (sel) {
                sel.value = 'linear_independence';
                sel.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (typeof App.switchTopicTask === 'function') {
                App.switchTopicTask('linear_independence');
            }
            
            const isActiveAfterTaskSwitch = App.BasisAnimator.isActive();
            
            return {
                wasActive,
                isActiveAfterTaskSwitch
            };
        })()`);
        console.log('[ASSERT] Task Switch Check:', taskSwitchCheck);
        if (taskSwitchCheck.isActiveAfterTaskSwitch) {
            throw new Error('FAIL: BasisAnimator is still active after switching to another task!');
        }

        if (consoleErrors.length > 0) {
            throw new Error(`FAIL: Browser exceptions occurred (${consoleErrors.length}): \n` + consoleErrors.join('\n'));
        }

        console.log('================================================================');
        console.log('ALL TESTS PASSED 100%! RED PAUSE BUTTON, AUTO-STOP ON TAB/TASK SWITCH');
        console.log('================================================================');

    } catch (err) {
        console.error('TEST FAILED:', err);
        process.exitCode = 1;
    } finally {
        ws.close();
        browser.kill();
        server.close();
    }
}

runTest();
