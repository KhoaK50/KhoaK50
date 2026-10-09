/**
 * Headless CDP Verification for Academic Solutions Ecosystem on calculation.html
 * 
 * Verifies:
 * 1. Solution buttons existence and visibility (#btnIndepSolution, #btnRankSolution).
 * 2. Linear Independence calculation, status badge, solution drawer opening, KaTeX math rendered, dual-tab switching.
 * 3. Rank of Vectors calculation, rank result, solution drawer opening, KaTeX math rendered, dual-tab switching.
 * 4. Modal drawer keyboard accessibility (Escape key closing).
 * 5. CDP runtime exception and console error tracking (0 unhandled exceptions, 0 console errors).
 * 6. Automated scanner enforcing Zero Em-dash (\u2014) rule across all target files.
 * 
 * Invocation: node tests/verify_academic_solutions_headless.js
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9224;
const HTTP_PORT = 5500;
const ROOT_DIR = path.resolve(__dirname, '..');

// MIME types for local static HTTP server
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

// Start lightweight static HTTP server
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
        'backend_v2/vectoria_api/explainers/strategies/linear_independence.py',
        'backend_v2/vectoria_api/explainers/strategies/rank_vectors.py',
        'backend_v2/tests/test_academic_explainers.py',
        'frontend_v2/js/app/ui/tasks_generator/indep_generator.js',
        'frontend_v2/js/app/ui/tasks_generator/rank_generator.js',
        'frontend_v2/js/app/ui/solution_panel.js',
        'frontend_v2/calculation.html',
        'frontend_v2/js/app/logic/vector_controller.js',
        'tests/verify_academic_solutions_headless.js',
        'TEST_READY.md'
    ];

    const violations = [];
    let scannedCount = 0;

    for (const relPath of targetFiles) {
        const fullPath = path.join(ROOT_DIR, relPath);
        if (!fs.existsSync(fullPath)) continue;

        scannedCount++;
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split(/\r?\n/);

        lines.forEach((line, index) => {
            if (line.includes('\u2014')) {
                violations.push({
                    file: relPath,
                    line: index + 1,
                    snippet: line.trim()
                });
            }
        });
    }

    return { scannedCount, violations };
}

async function runHeadlessVerification() {
    console.log('================================================================');
    console.log(' Vectoria E2E Test: Academic Solutions Ecosystem (Headless Edge)');
    console.log('================================================================\n');

    const testResults = {
        passed: [],
        failed: []
    };

    function recordPass(testName, details) {
        testResults.passed.push(testName);
        console.log(`[PASS] ${testName}`);
        if (details) console.log(`       ${details}`);
    }

    function recordFail(testName, reason) {
        testResults.failed.push({ testName, reason });
        console.error(`[FAIL] ${testName}: ${reason}`);
    }

    // Step 1: Start local static server
    console.log(`[INIT] Starting static HTTP server on port ${HTTP_PORT}...`);
    let staticServer = null;
    try {
        staticServer = await startStaticServer(HTTP_PORT);
        console.log(`[INIT] Static HTTP server listening on http://127.0.0.1:${HTTP_PORT}`);
    } catch (err) {
        console.error(`[ERROR] Failed to start HTTP server: ${err.message}`);
        process.exit(1);
    }

    // Step 2: Spawn Microsoft Edge Headless with CDP
    console.log(`[INIT] Launching Edge headless on debug port ${CDP_PORT}...`);
    const targetUrl = `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html`;
    const edgeProcess = spawn(EDGE_PATH, [
        '--headless=new',
        `--remote-debugging-port=${CDP_PORT}`,
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        targetUrl
    ]);

    let ws = null;

    try {
        // Step 3: Connect to CDP
        let pages = null;
        for (let attempt = 1; attempt <= 20; attempt++) {
            await sleep(250);
            try {
                pages = await new Promise((resolve, reject) => {
                    const req = http.get(`http://127.0.0.1:${CDP_PORT}/json`, (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
                        });
                    });
                    req.on('error', reject);
                });
                if (pages && pages.length > 0) break;
            } catch (e) {
                // Wait and retry
            }
        }

        if (!pages || pages.length === 0) {
            throw new Error(`Edge CDP JSON endpoint did not respond on port ${CDP_PORT}`);
        }

        const targetPage = pages.find(p => p.type === 'page' && p.url.includes('calculation.html')) || pages[0];
        console.log(`[INIT] Connected to page: ${targetPage.title} (${targetPage.url})`);

        ws = new WebSocket(targetPage.webSocketDebuggerUrl);
        const consoleErrors = [];
        const consoleMessages = [];

        await new Promise((resolve, reject) => {
            ws.onopen = resolve;
            ws.onerror = reject;
        });

        let msgId = 1;
        function sendCommand(method, params = {}) {
            return new Promise((resolve) => {
                const id = msgId++;
                const handler = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.id === id) {
                        ws.removeEventListener('message', handler);
                        resolve(data.result);
                    }
                };
                ws.addEventListener('message', handler);
                ws.send(JSON.stringify({ id, method, params }));
            });
        }

        ws.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);
            if (data.method === 'Console.messageAdded') {
                const m = data.params.message;
                if (m.level === 'error') {
                    // Filter out external non-critical blocked requests (e.g. google-analytics, favicon)
                    if (!m.text.includes('google-analytics') && !m.text.includes('googletagmanager') && !m.text.includes('favicon.ico')) {
                        consoleErrors.push(`[Console.messageAdded] ${m.text}`);
                    }
                } else {
                    consoleMessages.push(`[${m.level}] ${m.text}`);
                }
            }
            if (data.method === 'Runtime.consoleAPICalled') {
                const type = data.params.type;
                const text = (data.params.args || []).map(a => a.value || a.description || '').join(' ');
                if (type === 'error') {
                    if (!text.includes('google-analytics') && !text.includes('googletagmanager') && !text.includes('favicon.ico')) {
                        consoleErrors.push(`[Runtime.consoleAPICalled] ${text}`);
                    }
                } else {
                    consoleMessages.push(`[${type}] ${text}`);
                }
            }
            if (data.method === 'Runtime.exceptionThrown') {
                const desc = data.params.exceptionDetails?.exception?.description || data.params.exceptionDetails?.text || 'Unknown exception';
                consoleErrors.push(`[Runtime.exceptionThrown] ${desc}`);
            }
        });

        await sendCommand('Console.enable');
        await sendCommand('Runtime.enable');
        await sendCommand('Page.enable');

        const evalExpr = async (expr) => {
            const res = await sendCommand('Runtime.evaluate', {
                expression: expr,
                returnByValue: true,
                awaitPromise: true
            });
            if (res && res.exceptionDetails) {
                const ex = res.exceptionDetails.exception?.description || res.exceptionDetails.text;
                throw new Error(`Eval failed: ${ex}`);
            }
            return res && res.result ? res.result.value : undefined;
        };

        // Step 4: Wait for page initialization
        console.log('\n--- Test 1: Page Initialization & Dependency Check ---');
        let pageReady = false;
        for (let i = 0; i < 30; i++) {
            pageReady = await evalExpr("document.readyState === 'complete' && typeof window.App === 'object'");
            if (pageReady) break;
            await sleep(150);
        }

        if (pageReady) {
            recordPass('T1.1_Page_Initialization', 'calculation.html loaded, window.App ready');
        } else {
            recordFail('T1.1_Page_Initialization', 'calculation.html failed to reach readyState complete');
        }

        const overlayExists = await evalExpr("!!document.getElementById('solutionOverlay')");
        if (overlayExists) {
            recordPass('T1.2_Solution_Overlay_Mounted', '#solutionOverlay mounted in DOM');
        } else {
            recordFail('T1.2_Solution_Overlay_Mounted', '#solutionOverlay not found in DOM');
        }

        const katexAvailable = await evalExpr("typeof window.katex !== 'undefined' || typeof window.MathJax !== 'undefined'");
        if (katexAvailable) {
            recordPass('T1.3_Math_Engine_Available', 'KaTeX or MathJax typesetting engine detected');
        } else {
            recordFail('T1.3_Math_Engine_Available', 'Neither KaTeX nor MathJax found on window');
        }

        // Step 5: Check Solution Buttons
        console.log('\n--- Test 2: Solution Buttons Existence & Layout ---');
        const btnIndepInfo = await evalExpr(`(function() {
            const btn = document.getElementById('btnIndepSolution');
            if (!btn) return { exists: false };
            const style = window.getComputedStyle(btn);
            return {
                exists: true,
                text: btn.textContent.trim(),
                className: btn.className,
                visible: style.display !== 'none' && style.visibility !== 'hidden'
            };
        })()`);

        if (btnIndepInfo && btnIndepInfo.exists) {
            recordPass('T2.1_Btn_Indep_Solution_Exists', `Text: "${btnIndepInfo.text}", class: "${btnIndepInfo.className}"`);
        } else {
            recordFail('T2.1_Btn_Indep_Solution_Exists', '#btnIndepSolution button not found in DOM');
        }

        const btnRankInfo = await evalExpr(`(function() {
            const btn = document.getElementById('btnRankSolution');
            if (!btn) return { exists: false };
            const style = window.getComputedStyle(btn);
            return {
                exists: true,
                text: btn.textContent.trim(),
                className: btn.className,
                visible: style.display !== 'none' && style.visibility !== 'hidden'
            };
        })()`);

        if (btnRankInfo && btnRankInfo.exists) {
            recordPass('T2.2_Btn_Rank_Solution_Exists', `Text: "${btnRankInfo.text}", class: "${btnRankInfo.className}"`);
        } else {
            recordFail('T2.2_Btn_Rank_Solution_Exists', '#btnRankSolution button not found in DOM');
        }

        // Step 6: Test Linear Independence Workflow
        console.log('\n--- Test 3: Linear Independence Calculation & Solution Modal Flow ---');
        const indepSetupResult = await evalExpr(`(function() {
            try {
                // Select Topic 3 and Linear Independence
                const topicCat = document.getElementById('topicCategorySelect');
                if (topicCat) {
                    topicCat.value = 't3';
                    topicCat.dispatchEvent(new Event('change', { bubbles: true }));
                }
                const opExtra = document.getElementById('opExtraSelect');
                if (opExtra) {
                    opExtra.value = 'linear_independence';
                    opExtra.dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (typeof App.showExtraForm === 'function') {
                    App.showExtraForm('linear_independence');
                }

                // Ensure at least 3 vectors in App.vectorList: v1=(1,2,-1), v2=(2,5,1), v3=(1,1,-4)
                if (!App.vectorList || App.vectorList.length < 3) {
                    App.vectorList = App.vectorList || [];
                    const samples = [
                        { vec: [1, 2, -1], latex: '[1, 2, -1]', id: 1 },
                        { vec: [2, 5, 1], latex: '[2, 5, 1]', id: 2 },
                        { vec: [1, 1, -4], latex: '[1, 1, -4]', id: 3 }
                    ];
                    samples.forEach(s => {
                        if (!App.vectorList.find(x => x.id === s.id)) {
                            App.vectorList.push(s);
                        }
                    });
                    if (typeof App.renderExtraCalcOptions === 'function') {
                        App.renderExtraCalcOptions();
                    }
                }

                // Tick all checkboxes in #indepChecklist
                const container = document.getElementById('indepChecklist');
                if (container) {
                    container.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
                }

                return { ok: true, vectorCount: App.vectorList.length };
            } catch (err) {
                return { ok: false, error: err.message };
            }
        })()`);

        if (indepSetupResult && indepSetupResult.ok) {
            recordPass('T3.1_Indep_Setup', `Setup complete with ${indepSetupResult.vectorCount} vectors`);
        } else {
            recordFail('T3.1_Indep_Setup', indepSetupResult?.error || 'Unknown setup error');
        }

        // Trigger Independence Calculation
        await evalExpr(`(function() {
            const btnIndep = document.getElementById('btnIndep');
            if (btnIndep) btnIndep.click();
        })()`);

        // Wait up to 2.5s for calculation result
        let indepResultStatus = null;
        for (let i = 0; i < 25; i++) {
            await sleep(100);
            indepResultStatus = await evalExpr(`(function() {
                const res = document.getElementById('result_indep');
                if (!res) return null;
                const txt = res.innerText.trim();
                return txt.length > 0 ? txt : null;
            })()`);
            if (indepResultStatus) break;
        }

        if (indepResultStatus) {
            recordPass('T3.2_Indep_Calculation_Result', `Badge/Result text: "${indepResultStatus}"`);
        } else {
            recordFail('T3.2_Indep_Calculation_Result', 'No result displayed in #result_indep after clicking btnIndep');
        }

        // Click "Lời giải" button for Independence
        const openIndepModal = await evalExpr(`(function() {
            const btnSol = document.getElementById('btnIndepSolution');
            if (btnSol) {
                btnSol.click();
                return true;
            }
            // Fallback for direct SolutionPanel check if button not yet wired
            if (typeof App.openSolutionPanel === 'function') {
                return 'panel_function_exists';
            }
            return false;
        })()`);

        await sleep(350); // Modal animation transition

        const indepModalState = await evalExpr(`(function() {
            const overlay = document.getElementById('solutionOverlay');
            const body = document.getElementById('solutionBody');
            const tabMat = document.getElementById('solMethodMat');
            const tabEq = document.getElementById('solMethodEq');
            const titleText = document.getElementById('solTitleText')?.innerText;
            const katexCount = body ? body.querySelectorAll('.katex, .katex-html, math-field, mjx-container').length : 0;

            return {
                isOpen: overlay ? overlay.classList.contains('is-open') : false,
                bodyText: body ? body.innerText.trim() : '',
                hasContent: body && body.children.length > 0 && !body.querySelector('.sol-empty'),
                katexCount: katexCount,
                tabMatActive: tabMat ? tabMat.classList.contains('is-active') : false,
                tabEqActive: tabEq ? tabEq.classList.contains('is-active') : false,
                tabMatLabel: tabMat ? tabMat.innerText.trim() : '',
                tabEqLabel: tabEq ? tabEq.innerText.trim() : ''
            };
        })()`);

        if (indepModalState && indepModalState.isOpen) {
            recordPass('T3.3_Indep_Modal_Drawer_Opened', `#solutionOverlay has .is-open class`);
        } else {
            recordFail('T3.3_Indep_Modal_Drawer_Opened', `#solutionOverlay did not open (isOpen: ${indepModalState?.isOpen})`);
        }

        if (indepModalState && indepModalState.hasContent) {
            recordPass('T3.4_Indep_Solution_Content_Populated', `Found solution content in #solutionBody`);
        } else {
            recordFail('T3.4_Indep_Solution_Content_Populated', 'Body contains empty state or no children');
        }

        if (indepModalState && indepModalState.katexCount > 0) {
            recordPass('T3.5_Indep_KaTeX_Math_Rendered', `Rendered ${indepModalState.katexCount} KaTeX/Math elements`);
        } else {
            recordFail('T3.5_Indep_KaTeX_Math_Rendered', 'Zero KaTeX math elements (.katex) found in #solutionBody');
        }

        // Test Switching to Tab 2 (Equation Method)
        await evalExpr(`(function() {
            const tabEq = document.getElementById('solMethodEq');
            if (tabEq) tabEq.click();
        })()`);
        await sleep(200);

        const tab2Switched = await evalExpr(`(function() {
            const tabEq = document.getElementById('solMethodEq');
            const tabMat = document.getElementById('solMethodMat');
            return tabEq && tabEq.classList.contains('is-active') && !tabMat.classList.contains('is-active');
        })()`);

        if (tab2Switched) {
            recordPass('T3.6_Indep_Tab2_Switch', 'Switched to Tab 2 (Equation method), tab active');
        } else {
            recordFail('T3.6_Indep_Tab2_Switch', 'Tab 2 did not become active after click');
        }

        // Switch back to Tab 1 (Matrix Method)
        await evalExpr(`(function() {
            const tabMat = document.getElementById('solMethodMat');
            if (tabMat) tabMat.click();
        })()`);
        await sleep(200);

        const tab1SwitchedBack = await evalExpr(`(function() {
            const tabMat = document.getElementById('solMethodMat');
            return tabMat && tabMat.classList.contains('is-active');
        })()`);

        if (tab1SwitchedBack) {
            recordPass('T3.7_Indep_Tab1_Switch_Back', 'Switched back to Tab 1 (Matrix method)');
        } else {
            recordFail('T3.7_Indep_Tab1_Switch_Back', 'Tab 1 did not become active when clicking Tab 1');
        }

        // Close modal
        await evalExpr(`(function() {
            const btnClose = document.getElementById('btnCloseSolution');
            if (btnClose) btnClose.click();
        })()`);
        await sleep(200);

        const modalClosed = await evalExpr(`(function() {
            const overlay = document.getElementById('solutionOverlay');
            return overlay && !overlay.classList.contains('is-open');
        })()`);

        if (modalClosed) {
            recordPass('T3.8_Indep_Modal_Closed', '#solutionOverlay closed cleanly');
        } else {
            recordFail('T3.8_Indep_Modal_Closed', '#solutionOverlay still has .is-open class');
        }

        // Step 7: Test Rank Workflow
        console.log('\n--- Test 4: Rank of Vectors Calculation & Solution Modal Flow ---');
        const rankSetupResult = await evalExpr(`(function() {
            try {
                const opExtra = document.getElementById('opExtraSelect');
                if (opExtra) {
                    opExtra.value = 'rank';
                    opExtra.dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (typeof App.showExtraForm === 'function') {
                    App.showExtraForm('rank');
                }

                const container = document.getElementById('rankChecklist');
                if (container) {
                    container.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
                }
                return { ok: true };
            } catch (err) {
                return { ok: false, error: err.message };
            }
        })()`);

        if (rankSetupResult && rankSetupResult.ok) {
            recordPass('T4.1_Rank_Setup', 'Switched to Rank task and checked vectors');
        } else {
            recordFail('T4.1_Rank_Setup', rankSetupResult?.error || 'Unknown error');
        }

        // Trigger Rank Calculation
        await evalExpr(`(function() {
            const btnRank = document.getElementById('btnRank');
            if (btnRank) btnRank.click();
        })()`);

        let rankResultStatus = null;
        for (let i = 0; i < 25; i++) {
            await sleep(100);
            rankResultStatus = await evalExpr(`(function() {
                const res = document.getElementById('result_rank');
                if (!res) return null;
                const txt = res.innerText.trim();
                return txt.length > 0 ? txt : null;
            })()`);
            if (rankResultStatus) break;
        }

        if (rankResultStatus) {
            recordPass('T4.2_Rank_Calculation_Result', `Rank result text: "${rankResultStatus}"`);
        } else {
            recordFail('T4.2_Rank_Calculation_Result', 'No result displayed in #result_rank after clicking btnRank');
        }

        // Click "Lời giải" button for Rank
        await evalExpr(`(function() {
            const btnSol = document.getElementById('btnRankSolution');
            if (btnSol) btnSol.click();
        })()`);
        await sleep(350);

        const rankModalState = await evalExpr(`(function() {
            const overlay = document.getElementById('solutionOverlay');
            const body = document.getElementById('solutionBody');
            const katexCount = body ? body.querySelectorAll('.katex, .katex-html, math-field, mjx-container').length : 0;
            return {
                isOpen: overlay ? overlay.classList.contains('is-open') : false,
                hasContent: body && body.children.length > 0 && !body.querySelector('.sol-empty'),
                katexCount: katexCount
            };
        })()`);

        if (rankModalState && rankModalState.isOpen) {
            recordPass('T4.3_Rank_Modal_Drawer_Opened', '#solutionOverlay opened for Rank');
        } else {
            recordFail('T4.3_Rank_Modal_Drawer_Opened', '#solutionOverlay did not open for Rank');
        }

        if (rankModalState && rankModalState.hasContent) {
            recordPass('T4.4_Rank_Solution_Content_Populated', 'Rank solution body populated');
        } else {
            recordFail('T4.4_Rank_Solution_Content_Populated', 'Rank solution body empty');
        }

        if (rankModalState && rankModalState.katexCount > 0) {
            recordPass('T4.5_Rank_KaTeX_Math_Rendered', `Rendered ${rankModalState.katexCount} KaTeX elements for Rank`);
        } else {
            recordFail('T4.5_Rank_KaTeX_Math_Rendered', 'Zero KaTeX math elements found for Rank');
        }

        // Test Switching to Tab 2 for Rank
        await evalExpr(`(function() {
            const tabEq = document.getElementById('solMethodEq');
            if (tabEq) tabEq.click();
        })()`);
        await sleep(200);

        const rankTab2Switched = await evalExpr(`(function() {
            const tabEq = document.getElementById('solMethodEq');
            const tabMat = document.getElementById('solMethodMat');
            return tabEq && tabEq.classList.contains('is-active') && !tabMat.classList.contains('is-active');
        })()`);

        if (rankTab2Switched) {
            recordPass('T4.6_Rank_Tab2_Switch', 'Switched to Tab 2 for Rank, tab active');
        } else {
            recordFail('T4.6_Rank_Tab2_Switch', 'Tab 2 did not become active for Rank');
        }

        // Switch back to Tab 1 for Rank
        await evalExpr(`(function() {
            const tabMat = document.getElementById('solMethodMat');
            if (tabMat) tabMat.click();
        })()`);
        await sleep(200);

        const rankTab1Switched = await evalExpr(`(function() {
            const tabMat = document.getElementById('solMethodMat');
            return tabMat && tabMat.classList.contains('is-active');
        })()`);

        if (rankTab1Switched) {
            recordPass('T4.7_Rank_Tab1_Switch_Back', 'Switched back to Tab 1 for Rank');
        } else {
            recordFail('T4.7_Rank_Tab1_Switch_Back', 'Tab 1 did not become active for Rank');
        }

        // Step 8: Test Keyboard Accessibility (Escape Key)
        console.log('\n--- Test 5: Keyboard Accessibility (Escape Key) ---');
        await evalExpr(`(function() {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        })()`);
        await sleep(200);

        const closedByEscape = await evalExpr(`(function() {
            const overlay = document.getElementById('solutionOverlay');
            return overlay && !overlay.classList.contains('is-open');
        })()`);

        if (closedByEscape) {
            recordPass('T5.1_Modal_Closes_On_Escape', 'Escape key dismissed solution overlay');
        } else {
            recordFail('T5.1_Modal_Closes_On_Escape', 'Escape key did not dismiss solution overlay');
        }

        // Step 9: Console & Exception Audit
        console.log('\n--- Test 6: CDP Console Errors & Uncaught Exceptions Audit ---');
        console.log(`[AUDIT] Total console errors captured: ${consoleErrors.length}`);
        if (consoleErrors.length === 0) {
            recordPass('T6.1_Zero_Console_Errors', '0 console errors and 0 unhandled exceptions');
        } else {
            console.error('[AUDIT] Errors encountered:');
            consoleErrors.forEach(err => console.error(`        ${err}`));
            recordFail('T6.1_Zero_Console_Errors', `${consoleErrors.length} console errors or unhandled exceptions logged`);
        }

        // Step 10: Zero Em-dash Scanner Audit
        console.log('\n--- Test 7: Anti-Slop & Zero Em-dash Enforcement Scanner ---');
        const { scannedCount, violations } = scanZeroEmDash();
        console.log(`[SCANNER] Scanned ${scannedCount} files for em-dash characters (\\u2014)...`);

        if (violations.length === 0) {
            recordPass('T7.1_Zero_Em_Dash', `All ${scannedCount} scanned files contain 0 em-dash characters`);
        } else {
            console.error(`[SCANNER] Found ${violations.length} em-dash violations:`);
            violations.forEach(v => {
                console.error(`         ${v.file}:${v.line} -> "${v.snippet}"`);
            });
            recordFail('T7.1_Zero_Em_Dash', `${violations.length} em-dash characters found in source files`);
        }

    } catch (err) {
        console.error(`[FATAL] Error during E2E verification: ${err.message}`);
        recordFail('FATAL_EXECUTION_ERROR', err.message);
    } finally {
        // Step 11: Teardown and Cleanup
        console.log('\n--- Teardown & Cleanup ---');
        if (ws) {
            try { ws.close(); } catch (e) {}
        }
        if (edgeProcess) {
            console.log('[CLEANUP] Terminating Edge process...');
            try { edgeProcess.kill(); } catch (e) {}
        }
        if (staticServer) {
            console.log('[CLEANUP] Stopping static HTTP server...');
            try { staticServer.close(); } catch (e) {}
        }

        console.log('\n================================================================');
        console.log(' E2E Verification Summary');
        console.log('================================================================');
        console.log(`Passed: ${testResults.passed.length}`);
        console.log(`Failed: ${testResults.failed.length}`);

        if (testResults.failed.length > 0) {
            console.log('\nFailed Tests:');
            testResults.failed.forEach(f => {
                console.log(`  - ${f.testName}: ${f.reason}`);
            });
            console.log('\n>>> SUITE RESULT: FAILED <<<');
            process.exit(1);
        } else {
            console.log('\n>>> SUITE RESULT: ALL TESTS PASSED (100%) <<<');
            process.exit(0);
        }
    }
}

runHeadlessVerification();
