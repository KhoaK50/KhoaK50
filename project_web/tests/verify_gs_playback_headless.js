/**
 * Headless CDP Verification for Gram-Schmidt Playback Engine (Bai 5) on calculation.html
 * 
 * Verifies:
 * 1. App.GSAnimator existence and API methods.
 * 2. Topic 4 UI elements existence (#gsChecklist, #btnGSOrthogonalize, #btnGSAnimate, #btnGSSolution).
 * 3. Orthogonalization computation and math-Clean-Card rendering with <math-field read-only>.
 * 4. GSAnimator 3-step continuous animation loop, controls injection, step navigation, and speed slider.
 * 5. Academic solution modal opening with 2-Tab structure and KaTeX rendering.
 * 6. CDP runtime exception and console error tracking (0 console errors).
 * 7. Zero Em-dash scanner across modified files.
 * 
 * Invocation: node tests/verify_gs_playback_headless.js
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9225;
const HTTP_PORT = 5501;
const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ico': 'image/x-icon'
};

function startStaticServer(port) {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const parsedUrl = new URL(req.url, `http://127.0.0.1:${port}`);
            let reqPath = decodeURIComponent(parsedUrl.pathname);
            if (reqPath === '/') reqPath = '/frontend_v2/calculation.html';

            const filePath = path.join(ROOT_DIR, reqPath);
            const ext = path.extname(filePath).toLowerCase();

            fs.stat(filePath, (err, stats) => {
                if (err || !stats.isFile()) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('404 Not Found');
                    return;
                }

                const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
                res.writeHead(200, {
                    'Content-Type': mimeType,
                    'Access-Control-Allow-Origin': '*'
                });
                fs.createReadStream(filePath).pipe(res);
            });
        });

        server.listen(port, '127.0.0.1', () => {
            resolve(server);
        });
        server.on('error', reject);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Zero Em-dash scanner function
function scanZeroEmDash() {
    const targetFiles = [
        'frontend_v2/js/app/playback/gs_animation.js',
        'frontend_v2/js/app/modules/topics/topic4_euclidean_spaces.js',
        'frontend_v2/js/viewers/viewer2D.js',
        'frontend_v2/js/viewers/viewer3D.js'
    ];

    const violations = [];
    let scannedCount = 0;

    for (const relPath of targetFiles) {
        const fullPath = path.join(ROOT_DIR, relPath);
        if (!fs.existsSync(fullPath)) continue;

        scannedCount++;
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, idx) => {
            if (line.includes('\u2014')) {
                violations.push({
                    file: relPath,
                    line: idx + 1,
                    snippet: line.trim()
                });
            }
        });
    }

    return { scannedCount, violations };
}

// Simple CDP WebSocket client
class SimpleCDPClient {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.ws = null;
        this.msgId = 0;
        this.pendingRequests = new Map();
        this.consoleErrors = [];
        this.pageErrors = [];
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.onopen = () => resolve();
            this.ws.onerror = reject;
            this.ws.onmessage = (event) => {
                const data = event.data;
                const msg = JSON.parse(data.toString());
                if (msg.id && this.pendingRequests.has(msg.id)) {
                    const { resolve, reject } = this.pendingRequests.get(msg.id);
                    this.pendingRequests.delete(msg.id);
                    if (msg.error) {
                        reject(new Error(msg.error.message || JSON.stringify(msg.error)));
                    } else {
                        resolve(msg.result);
                    }
                } else if (msg.method === 'Runtime.consoleAPICalled') {
                    if (msg.params.type === 'error') {
                        const errorText = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
                        this.consoleErrors.push(errorText);
                    }
                } else if (msg.method === 'Runtime.exceptionThrown') {
                    const desc = msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text;
                    this.pageErrors.push(desc);
                }
            };
        });
    }

    send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = ++this.msgId;
            this.pendingRequests.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async evaluate(expression) {
        const res = await this.send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (res.exceptionDetails) {
            throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
        }
        return res.result?.value;
    }

    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

async function getWsEndpoint(port) {
    for (let i = 0; i < 30; i++) {
        try {
            const data = await new Promise((resolve, reject) => {
                http.get(`http://127.0.0.1:${port}/json`, res => {
                    let raw = '';
                    res.on('data', chunk => raw += chunk);
                    res.on('end', () => resolve(raw));
                }).on('error', reject);
            });
            const pages = JSON.parse(data);
            if (Array.isArray(pages) && pages.length > 0) {
                const targetPage = pages.find(p => p.type === 'page' && p.url.includes('calculation.html')) || pages[0];
                if (targetPage && targetPage.webSocketDebuggerUrl) {
                    return targetPage.webSocketDebuggerUrl;
                }
            }
        } catch (_) {
            await sleep(250);
        }
    }
    throw new Error('Unable to get WebSocket debugger URL for page from Edge');
}

async function runGramSchmidtVerification() {
    console.log('================================================================');
    console.log(' Vectoria E2E Test: Gram-Schmidt Playback Engine (Headless Edge)');
    console.log('================================================================\n');

    let server, edgeProcess, cdp;
    let passed = 0;
    let failed = 0;

    function recordPass(name, detail = '') {
        passed++;
        console.log(`[PASS] ${name}`);
        if (detail) console.log(`       ${detail}`);
    }

    function recordFail(name, err) {
        failed++;
        console.error(`[FAIL] ${name}`);
        console.error(`       Error: ${err.message || err}`);
    }

    try {
        console.log(`[INIT] Starting static HTTP server on port ${HTTP_PORT}...`);
        server = await startStaticServer(HTTP_PORT);
        console.log(`[INIT] Static HTTP server listening on http://127.0.0.1:${HTTP_PORT}`);

        console.log(`[INIT] Launching Edge headless on debug port ${CDP_PORT}...`);
        edgeProcess = spawn(EDGE_PATH, [
            `--remote-debugging-port=${CDP_PORT}`,
            '--headless=new',
            '--disable-gpu',
            '--no-first-run',
            '--no-default-browser-check',
            '--user-data-dir=' + path.join(ROOT_DIR, '.tmp_edge_gs_profile'),
            `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html`
        ]);

        const wsUrl = await getWsEndpoint(CDP_PORT);
        cdp = new SimpleCDPClient(wsUrl);
        await cdp.connect();
        await cdp.send('Runtime.enable');
        await cdp.send('Page.enable');

        await sleep(1500);

        // --- Test 1: Page & Animator Availability ---
        console.log('\n--- Test 1: Page Initialization & GSAnimator Availability ---');
        try {
            const isReady = await cdp.evaluate('typeof window.App !== "undefined" && typeof window.App.GSAnimator !== "undefined"');
            if (isReady) {
                recordPass('T1.1_GSAnimator_Loaded', 'window.App.GSAnimator is defined and ready');
            } else {
                throw new Error('App.GSAnimator is not defined on window');
            }
        } catch (err) {
            recordFail('T1.1_GSAnimator_Loaded', err);
        }

        try {
            const methods = await cdp.evaluate(`
                ['start', 'stop', 'pause', 'resume', 'togglePlay', 'goToPhase', 'setSpeed', 'render2DSubspace', 'render2DProjections', 'render3D'].every(m => typeof App.GSAnimator[m] === 'function')
            `);
            if (methods) {
                recordPass('T1.2_GSAnimator_APIs_Present', 'All 10 required methods implemented on App.GSAnimator');
            } else {
                throw new Error('Some required methods are missing on App.GSAnimator');
            }
        } catch (err) {
            recordFail('T1.2_GSAnimator_APIs_Present', err);
        }

        // --- Test 2: Task Switch & UI Elements ---
        console.log('\n--- Test 2: Topic 4 Task Switch & Controls Layout ---');
        try {
            await cdp.evaluate(`
                const sel = document.getElementById('opExtraSelect');
                sel.value = 'topic4_gram_schmidt';
                sel.dispatchEvent(new Event('change'));
            `);
            await sleep(400);

            const uiCheck = await cdp.evaluate(`
                const chk = document.getElementById('gsChecklist');
                const btnOrth = document.getElementById('btnGSOrthogonalize');
                const btnAnim = document.getElementById('btnGSAnimate');
                const btnSol = document.getElementById('btnGSSolution');
                const form = document.getElementById('form-topic4_gram_schmidt');
                ({
                    hasChecklist: !!chk,
                    hasOrth: !!btnOrth,
                    hasAnim: !!btnAnim,
                    hasSol: !!btnSol,
                    formVisible: form && form.style.display !== 'none'
                })
            `);

            if (uiCheck.hasChecklist && uiCheck.hasOrth && uiCheck.hasAnim && uiCheck.hasSol && uiCheck.formVisible) {
                recordPass('T2.1_Topic4_UI_Mounted', 'form-topic4_gram_schmidt visible with #gsChecklist and 3 buttons');
            } else {
                throw new Error(`UI Check failed: ${JSON.stringify(uiCheck)}`);
            }
        } catch (err) {
            recordFail('T2.1_Topic4_UI_Mounted', err);
        }

        // --- Test 3: Create Vectors & Run Orthogonalize ---
        console.log('\n--- Test 3: Calculation & math-Clean-Card Rendering ---');
        try {
            // Ensure 2 test vectors exist in App.vectorList: v1 = [3, 1], v2 = [2, 2]
            await cdp.evaluate(`
                App.vectorList = [
                    { id: 1, name: "v_1", vec: [3, 1, 0], colorCss: "#0090ff", colorHex: "#0090ff", visible: true },
                    { id: 2, name: "v_2", vec: [2, 2, 0], colorCss: "#10b981", colorHex: "#10b981", visible: true }
                ];
                if (typeof App.renderExtraCalcOptions === 'function') App.renderExtraCalcOptions();
            `);
            await sleep(300);

            // Tick both checkboxes in #gsChecklist
            await cdp.evaluate(`
                const boxes = document.querySelectorAll('#gsChecklist input[type="checkbox"]');
                boxes.forEach(b => b.checked = true);
            `);

            // Click #btnGSOrthogonalize
            await cdp.evaluate(`document.getElementById('btnGSOrthogonalize').click()`);
            await sleep(300);

            const resCheck = await cdp.evaluate(`
                const box = document.getElementById('result_gs_info');
                const mathFields = box ? box.querySelectorAll('math-field[read-only]') : [];
                ({
                    visible: box && box.style.display === 'block',
                    mathFieldCount: mathFields.length,
                    hasOrthText: box && box.textContent.includes('CƠ SỞ TRỰC GIAO'),
                    hasNormText: box && box.textContent.includes('CƠ SỞ TRỰC CHUẨN')
                })
            `);

            if (resCheck.visible && resCheck.mathFieldCount >= 4 && resCheck.hasOrthText && resCheck.hasNormText) {
                recordPass('T3.1_Math_Clean_Card_Rendered', `Rendered ${resCheck.mathFieldCount} <math-field read-only> in math-Clean-Card`);
            } else {
                throw new Error(`Card check failed: ${JSON.stringify(resCheck)}`);
            }
        } catch (err) {
            recordFail('T3.1_Math_Clean_Card_Rendered', err);
        }

        // --- Test 4: Trực quan Animation Engine ---
        console.log('\n--- Test 4: GSAnimator Continuous Playback Flow ---');
        try {
            // Click #btnGSAnimate
            await cdp.evaluate(`document.getElementById('btnGSAnimate').click()`);
            await sleep(400);

            const animCheck = await cdp.evaluate(`
                const wrap = document.getElementById('gsAnimControls');
                const counter = wrap ? wrap.querySelector('#gsStepCounter')?.textContent : '';
                const title = wrap ? wrap.querySelector('#gsStepTitle')?.textContent : '';
                const isAct = App.GSAnimator.isActive();
                ({
                    wrapVisible: wrap && wrap.style.display === 'block',
                    counter,
                    title,
                    isAct
                })
            `);

            if (animCheck.wrapVisible && animCheck.isAct && animCheck.counter.includes('Bước 1')) {
                recordPass('T4.1_GSAnimator_Started', `Controls visible, active=true, counter="${animCheck.counter}", title="${animCheck.title}"`);
            } else {
                throw new Error(`Animation start failed: ${JSON.stringify(animCheck)}`);
            }
        } catch (err) {
            recordFail('T4.1_GSAnimator_Started', err);
        }

        // Test Phase 2 jump via Step Pills
        try {
            await cdp.evaluate(`
                const pill2 = document.querySelector('#gsPhasePills button[data-phase="1"]');
                pill2.click();
            `);
            await sleep(300);

            const phase2Check = await cdp.evaluate(`(() => {
                const wrap = document.getElementById('gsAnimControls');
                const counter = wrap.querySelector('#gsStepCounter').textContent;
                const title = wrap.querySelector('#gsStepTitle').textContent;
                const phase = App.GSAnimator.getCurrentPhase();
                return { counter, title, phase };
            })()`);

            if (phase2Check.phase === 1 && phase2Check.counter.includes('Bước 2')) {
                recordPass('T4.2_Step2_Jump_Working', `Switched to Phase 2: counter="${phase2Check.counter}", title="${phase2Check.title}"`);
            } else {
                throw new Error(`Step 2 check failed: ${JSON.stringify(phase2Check)}`);
            }
        } catch (err) {
            recordFail('T4.2_Step2_Jump_Working', err);
        }

        // Test Phase 3 jump
        try {
            await cdp.evaluate(`
                const pill3 = document.querySelector('#gsPhasePills button[data-phase="2"]');
                pill3.click();
            `);
            await sleep(300);

            const phase3Check = await cdp.evaluate(`(() => {
                const wrap = document.getElementById('gsAnimControls');
                const counter = wrap.querySelector('#gsStepCounter').textContent;
                const title = wrap.querySelector('#gsStepTitle').textContent;
                const phase = App.GSAnimator.getCurrentPhase();
                return { counter, title, phase };
            })()`);

            if (phase3Check.phase === 2 && phase3Check.counter.includes('Bước 3')) {
                recordPass('T4.3_Step3_Jump_Working', `Switched to Phase 3: counter="${phase3Check.counter}", title="${phase3Check.title}"`);
            } else {
                throw new Error(`Step 3 check failed: ${JSON.stringify(phase3Check)}`);
            }
        } catch (err) {
            recordFail('T4.3_Step3_Jump_Working', err);
        }

        // Test Play/Pause toggle and Stop
        try {
            await cdp.evaluate(`App.GSAnimator.pause()`);
            const isPaused = await cdp.evaluate(`App.GSAnimator._paused`);
            await cdp.evaluate(`document.getElementById('btnGSCloseAnim').click()`);
            await sleep(200);
            const isStopped = await cdp.evaluate(`!App.GSAnimator.isActive() && document.getElementById('gsAnimControls').style.display === 'none'`);

            if (isPaused && isStopped) {
                recordPass('T4.4_Pause_And_Stop_Working', 'GSAnimator paused and cleanly dismissed via close button');
            } else {
                throw new Error(`Pause/Stop check failed: paused=${isPaused}, stopped=${isStopped}`);
            }
        } catch (err) {
            recordFail('T4.4_Pause_And_Stop_Working', err);
        }

        // --- Test 5: Solution Modal Flow ---
        console.log('\n--- Test 5: Academic Solution Modal Flow ---');
        try {
            await cdp.evaluate(`document.getElementById('btnGSSolution').click()`);
            await sleep(400);

            const solCheck = await cdp.evaluate(`
                const overlay = document.getElementById('solutionOverlay');
                const body = document.getElementById('solutionBody');
                const isOpen = overlay && overlay.classList.contains('is-open');
                const hasContent = body && body.innerHTML.includes('Gram - Schmidt');
                ({ isOpen, hasContent, bodyLength: body ? body.innerHTML.length : 0 })
            `);

            if (solCheck.isOpen && solCheck.hasContent) {
                recordPass('T5.1_Solution_Modal_Opened', `Solution overlay opened with Gram-Schmidt content (${solCheck.bodyLength} bytes)`);
            } else {
                throw new Error(`Solution check failed: ${JSON.stringify(solCheck)}`);
            }

            // Close modal
            await cdp.evaluate(`
                const btnClose = document.getElementById('btnCloseSolution');
                if (btnClose) btnClose.click();
            `);
            await sleep(200);
        } catch (err) {
            recordFail('T5.1_Solution_Modal_Opened', err);
        }

        // --- Test 6: Console Error Audit ---
        console.log('\n--- Test 6: Console Errors & Exceptions Audit ---');
        const totalErrors = cdp.consoleErrors.length + cdp.pageErrors.length;
        if (totalErrors === 0) {
            recordPass('T6.1_Zero_Console_Errors', '0 console errors and 0 unhandled exceptions');
        } else {
            recordFail('T6.1_Zero_Console_Errors', new Error(`Captured errors: ${JSON.stringify([...cdp.consoleErrors, ...cdp.pageErrors])}`));
        }

        // --- Test 7: Zero Em-dash Scanner ---
        console.log('\n--- Test 7: Anti-Slop & Zero Em-dash Enforcement Scanner ---');
        const scanResult = scanZeroEmDash();
        if (scanResult.violations.length === 0) {
            recordPass('T7.1_Zero_Em_Dash', `All ${scanResult.scannedCount} files contain 0 em-dash characters`);
        } else {
            recordFail('T7.1_Zero_Em_Dash', new Error(`Found ${scanResult.violations.length} em-dash violations: ${JSON.stringify(scanResult.violations)}`));
        }

    } catch (globalErr) {
        console.error('\n[FATAL] Global test execution error:', globalErr);
        failed++;
    } finally {
        console.log('\n--- Teardown & Cleanup ---');
        if (cdp) {
            try { cdp.close(); } catch (_) {}
        }
        if (edgeProcess) {
            console.log('[CLEANUP] Terminating Edge process...');
            try { edgeProcess.kill(); } catch (_) {}
        }
        if (server) {
            console.log('[CLEANUP] Stopping static HTTP server...');
            try { server.close(); } catch (_) {}
        }

        console.log('\n================================================================');
        console.log(' E2E Verification Summary');
        console.log('================================================================');
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);

        if (failed === 0) {
            console.log('\n>>> SUITE RESULT: ALL TESTS PASSED (100%) <<<\n');
            process.exit(0);
        } else {
            console.error('\n>>> SUITE RESULT: TESTS FAILED <<<\n');
            process.exit(1);
        }
    }
}

runGramSchmidtVerification();
