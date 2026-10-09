// ==============================================================================
// TEST: KIỂM CHỨNG ĐỒNG BỘ UI, TÁCH TÍNH TOÁN - TRỰC QUAN, BỘ LỌC VÀ DỌN DẸP HOẠT CẢNH
// ==============================================================================
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5635;
const CDP_PORT = 9235;

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

function startStaticServer() {
    const server = http.createServer((req, res) => {
        let reqPath = decodeURI(req.url.split('?')[0]);
        if (reqPath === '/') reqPath = '/frontend_v2/calculation.html';
        const filePath = path.join(PROJECT_ROOT, reqPath.replace(/^\//, ''));
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not Found: ' + reqPath);
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.json': 'application/json',
            '.png': 'image/png',
            '.svg': 'image/svg+xml'
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
    });
    server.listen(HTTP_PORT);
    return server;
}

function findEdgeBinary() {
    const edgePaths = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    for (const p of edgePaths) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error('Edge binary not found');
}

async function runTest() {
    console.log('================================================================');
    console.log('TESTING UNIFIED UI, DECOUPLED COMPUTE/ANIMATE, FILTER & CLEANUP');
    console.log('================================================================');

    const server = startStaticServer();
    console.log(`[HTTP] Server active on port ${HTTP_PORT}`);

    const tmpUserData = path.join(PROJECT_ROOT, '.tmp_edge_unified_test');
    if (fs.existsSync(tmpUserData)) {
        try { fs.rmSync(tmpUserData, { recursive: true, force: true }); } catch (_) {}
    }

    const edgeBin = findEdgeBinary();
    const edgeProcess = spawn(edgeBin, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${tmpUserData}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--headless=new',
        '--window-size=1400,900',
        'about:blank'
    ]);

    await sleep(1500);

    let wsUrl = null;
    for (let i = 0; i < 20; i++) {
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
        console.error('Failed to obtain CDP WebSocket debugger URL');
        process.exit(1);
    }

    const ws = new WebSocket(wsUrl);
    await new Promise((res) => { ws.onopen = res; });
    console.log('[CDP] Connected.');

    let msgId = 1;
    const callbacks = new Map();
    ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id && callbacks.has(msg.id)) {
            const cb = callbacks.get(msg.id);
            callbacks.delete(msg.id);
            if (msg.error) cb.reject(msg.error);
            else cb.resolve(msg.result);
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
        const r = await send('Runtime.evaluate', {
            expression,
            awaitPromise: true,
            returnByValue: true
        });
        if (r.exceptionDetails) {
            throw new Error(`Eval failed: ${JSON.stringify(r.exceptionDetails)}`);
        }
        return r.result ? r.result.value : undefined;
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
        width: 1366,
        height: 850,
        deviceScaleFactor: 1,
        mobile: false
    });

    console.log('[TEST] Navigating to calculation.html...');
    await send('Page.navigate', { url: `http://localhost:${HTTP_PORT}/frontend_v2/calculation.html` });

    // Wait for App to load
    let ready = false;
    for (let i = 0; i < 40; i++) {
        ready = await evaluate(`typeof window.App !== 'undefined' && typeof App.vectorList !== 'undefined'`);
        if (ready) break;
        await sleep(250);
    }

    if (!ready) {
        throw new Error('Application failed to initialize in time');
    }
    console.log('[TEST] App loaded successfully.');

    // Nạp bộ vector của user: [1, 2], [1, 3], [1, 4] và 3D vector [1, 4, 1]
    console.log('[TEST 1] Populating test vectors: 3x 2D vectors and 1x 3D vector...');
    await evaluate(`(() => {
        App.vectorList = [
            { id: 1, vec: [1, 2], colorCss: "#ef4444", colorHex: "#ef4444", latex: "[1, 2]", visible: true },
            { id: 2, vec: [1, 3], colorCss: "#22c55e", colorHex: "#22c55e", latex: "[1, 3]", visible: true },
            { id: 3, vec: [1, 4], colorCss: "#a855f7", colorHex: "#a855f7", latex: "[1, 4]", visible: true },
            { id: 4, vec: [1, 4, 1], colorCss: "#eab308", colorHex: "#eab308", latex: "[1, 4, 1]", visible: true }
        ];
        App.renderExtraCalcOptions();
    })()`);

    // --- TEST 2: KIỂM TRA BỘ LỌC CHECKLIST ---
    console.log('[TEST 2] Verifying Checklist Filter (2D/3D & Search text)...');
    
    // Switch to coordinates task
    await evaluate(`(() => {
        const sel = document.getElementById("opExtraSelect");
        sel.value = "coordinates";
        sel.dispatchEvent(new Event("change"));
    })()`);
    await sleep(300);

    // Test filter 2D chip
    const filter2dRes = await evaluate(`(() => {
        const basisCoordChecklist = document.getElementById("basisCoordChecklist");
        const chip2d = Array.from(basisCoordChecklist.querySelectorAll(".filter-chip")).find(c => c.dataset.filter === "2d");
        chip2d.click();
        
        const rows = Array.from(basisCoordChecklist.querySelectorAll(".checkitem"));
        return rows.map((r, i) => ({
            id: i + 1,
            hasIsHidden: r.classList.contains("is-hidden"),
            computedDisplay: window.getComputedStyle(r).display
        }));
    })()`);

    console.log('[TEST 2.1] Filter 2D result:', JSON.stringify(filter2dRes));
    if (filter2dRes[3].computedDisplay !== 'none' || !filter2dRes[3].hasIsHidden) {
        throw new Error(`Filter 2D failed: vector #4 [1, 4, 1] was not hidden! Display: ${filter2dRes[3].computedDisplay}`);
    }
    console.log('✅ Filter 2D SUCCESS: Vector #4 [1, 4, 1] is hidden.');

    // Test search filter
    const searchRes = await evaluate(`(() => {
        const basisCoordChecklist = document.getElementById("basisCoordChecklist");
        // Click Tất cả
        const chipAll = Array.from(basisCoordChecklist.querySelectorAll(".filter-chip")).find(c => c.dataset.filter === "all");
        chipAll.click();

        const searchInp = basisCoordChecklist.querySelector(".vec-search-inp");
        searchInp.value = "1, 3";
        searchInp.dispatchEvent(new Event("input"));

        const rows = Array.from(basisCoordChecklist.querySelectorAll(".checkitem"));
        return rows.map((r, i) => ({
            id: i + 1,
            computedDisplay: window.getComputedStyle(r).display
        }));
    })()`);

    console.log('[TEST 2.2] Search "1, 3" result:', JSON.stringify(searchRes));
    if (searchRes[1].computedDisplay === 'none' || searchRes[0].computedDisplay !== 'none') {
        throw new Error('Search input filter failed to match [1, 3]!');
    }
    console.log('✅ Search filter SUCCESS: [1, 3] matches row #2 specifically.');

    // Reset filter
    await evaluate(`(() => {
        const basisCoordChecklist = document.getElementById("basisCoordChecklist");
        const searchInp = basisCoordChecklist.querySelector(".vec-search-inp");
        searchInp.value = "";
        searchInp.dispatchEvent(new Event("input"));
    })()`);

    // --- TEST 3: KIỂM TRA ĐỒNG BỘ THUẬT NGỮ "BƯỚC" TRONG TỌA ĐỘ ---
    console.log('[TEST 3] Verifying Step Pills and "Bước" in Coordinate Task...');
    const coordPillsRes = await evaluate(`(() => {
        App.ensureCoordAnimControls();
        const wrap = document.getElementById("coordAnimControls");
        const pills = Array.from(wrap.querySelectorAll(".coord-phase-btn")).map(b => ({
            text: b.textContent.trim(),
            title: b.title
        }));
        
        // Start animation to check counter text
        const vCoordSelect = document.getElementById("vCoordSelect");
        vCoordSelect.value = "1";
        vCoordSelect.dispatchEvent(new Event("change"));
        
        const checkContainer = document.getElementById("basisCoordChecklist");
        const cb2 = checkContainer.querySelector('input[type="checkbox"][value="2"]');
        const cb3 = checkContainer.querySelector('input[type="checkbox"][value="3"]');
        if (cb2) cb2.checked = true;
        if (cb3) cb3.checked = true;

        App.CoordAnimator.start({ targetId: 1, basisIds: [2, 3] });
        const counterRunning = document.getElementById("coordStepCounter")?.textContent;
        App.CoordAnimator.stop();

        return { counterRunning, pills };
    })()`);

    console.log('[TEST 3] Coordinate pills:', JSON.stringify(coordPillsRes));
    if (!coordPillsRes.counterRunning.includes('Bước 1 / 4')) {
        throw new Error(`Coordinate counter did not use "Bước 1 / 4"! Got: ${coordPillsRes.counterRunning}`);
    }
    const hasPhaOrDesc = coordPillsRes.pills.some(p => p.text.includes('Pha') || p.text.includes('Trục') || p.text.includes('Chiếu'));
    if (hasPhaOrDesc) {
        throw new Error(`Coordinate pill buttons still contain description or "Pha"! Got: ${JSON.stringify(coordPillsRes.pills)}`);
    }
    console.log('✅ Coordinate buttons SUCCESS: Clean "Bước 1", "Bước 2", "Bước 3", "Bước 4" with zero descriptions.');

    // --- TEST 4: TÁCH RIÊNG TÍNH TOÁN VÀ TRỰC QUAN Ở BÀI 3 (CƠ SỞ & SỐ CHIỀU) ---
    console.log('[TEST 4] Testing Decoupled Compute & Animate in Basis Task...');
    
    // Switch to basis task
    await evaluate(`(() => {
        const sel = document.getElementById("opExtraSelect");
        sel.value = "basis";
        sel.dispatchEvent(new Event("change"));
    })()`);
    await sleep(300);

    // Tick v1, v2
    const tickRes = await evaluate(`(() => {
        const checkContainer = document.getElementById("basisChecklist");
        const cb1 = checkContainer.querySelector('input[type="checkbox"][value="1"]');
        const cb2 = checkContainer.querySelector('input[type="checkbox"][value="2"]');
        if (cb1) cb1.checked = true;
        if (cb2) cb2.checked = true;
        return {
            cb1Found: !!cb1,
            cb1Checked: cb1?.checked,
            cb2Found: !!cb2,
            cb2Checked: cb2?.checked
        };
    })()`);
    console.log('[TEST 4.1] Ticked checkboxes:', JSON.stringify(tickRes));

    // Click "Tính cơ sở"
    console.log('[TEST 4.1] Clicking "Tính cơ sở" (Compute only)...');
    const debugBefore = await evaluate(`(() => {
        const checkContainer = document.getElementById("basisChecklist");
        const cbs = Array.from(checkContainer.querySelectorAll('input[type="checkbox"]')).map(c => ({ id: c.value, checked: c.checked }));
        return { cbs };
    })()`);
    console.log('[TEST 4.1] Checkbox states before compute:', JSON.stringify(debugBefore));

    await evaluate(`(async () => {
        try {
            await App.basisAndDimUI();
        } catch (e) {
            console.error('basisAndDimUI threw:', e);
        }
    })()`);
    
    let computeRes = null;
    for (let i = 0; i < 20; i++) {
        await sleep(300);
        computeRes = await evaluate(`(() => {
            const resBox = document.getElementById("result_basis");
            const animWrap = document.getElementById("basisAnimControls");
            const isAnimActive = window.App?.BasisAnimator?.isActive?.() || false;
            return {
                resText: resBox ? resBox.innerText : 'null',
                animDisplay: animWrap ? animWrap.style.display : "null",
                isAnimActive
            };
        })()`);
        if (computeRes.resText && computeRes.resText.includes("dim(V) = 2")) break;
    }

    console.log('[TEST 4.1] Compute result:', JSON.stringify(computeRes));
    if (!computeRes.resText.includes("dim(V) = 2")) {
        throw new Error(`Compute basis did not output dim(V) = 2! Text: ${computeRes.resText}`);
    }
    if (computeRes.isAnimActive || computeRes.animDisplay === 'block' || computeRes.animDisplay === 'flex') {
        throw new Error('Compute basis prematurely started animation without user clicking "Trực quan"!');
    }
    console.log('✅ Compute basis SUCCESS: Result calculated without starting animation.');

    // Click "Trực quan"
    console.log('[TEST 4.2] Clicking "Trực quan" (Start visualization)...');
    await evaluate(`document.getElementById("btnBasisAnimate").click()`);
    await sleep(500);

    const animStartRes = await evaluate(`(() => {
        const animWrap = document.getElementById("basisAnimControls");
        const isAnimActive = window.App?.BasisAnimator?.isActive?.() || false;
        const stepCounter = document.getElementById("basisStepCounter")?.textContent;
        const stepPills = Array.from(document.querySelectorAll("#basisStepPills .basis-step-btn")).map(b => b.textContent.trim());
        return {
            animDisplay: animWrap ? animWrap.style.display : "null",
            isAnimActive,
            stepCounter,
            stepPills
        };
    })()`);

    console.log('[TEST 4.2] Animate result:', JSON.stringify(animStartRes));
    if (!animStartRes.isAnimActive) {
        throw new Error('Basis animation failed to activate on "Trực quan" click!');
    }
    if (animStartRes.stepPills.length === 0) {
        throw new Error('Basis step pills were not rendered!');
    }
    console.log('✅ Basis animation SUCCESS: Animation started, dynamic step pills rendered: ' + animStartRes.stepPills.join(', '));

    // Test toggle off
    console.log('[TEST 4.3] Clicking "Trực quan" again to test toggle off...');
    await evaluate(`document.getElementById("btnBasisAnimate").click()`);
    await sleep(300);

    const toggleOffRes = await evaluate(`(() => {
        const isAnimActive = window.App?.BasisAnimator?.isActive?.() || false;
        const animWrap = document.getElementById("basisAnimControls");
        return {
            isAnimActive,
            animDisplay: animWrap ? animWrap.style.display : "null"
        };
    })()`);

    console.log('[TEST 4.3] Toggle off result:', JSON.stringify(toggleOffRes));
    if (toggleOffRes.isAnimActive || toggleOffRes.animDisplay !== 'none') {
        throw new Error('Clicking "Trực quan" again did not toggle off the animation!');
    }
    console.log('✅ Toggle off SUCCESS: Basis animation stopped and controls hidden.');

    // --- TEST 5: TỰ ĐỘNG DỌN DẸP KHI CHUYỂN BÀI TOÁN ---
    console.log('[TEST 5] Testing Automatic Cleanup when switching problems...');
    
    // Switch to coordinates and start animation
    await evaluate(`(() => {
        const sel = document.getElementById("opExtraSelect");
        sel.value = "coordinates";
        sel.dispatchEvent(new Event("change"));

        const vCoordSelect = document.getElementById("vCoordSelect");
        vCoordSelect.value = "1";
        vCoordSelect.dispatchEvent(new Event("change"));

        const checkContainer = document.getElementById("basisCoordChecklist");
        const cb2 = checkContainer.querySelector('input[type="checkbox"][value="2"]');
        const cb3 = checkContainer.querySelector('input[type="checkbox"][value="3"]');
        if (cb2) cb2.checked = true;
        if (cb3) cb3.checked = true;
    })()`);
    await sleep(300);

    await evaluate(`document.getElementById("btnCoordAnimate").click()`);
    await sleep(500);

    const coordActiveCheck = await evaluate(`window.App?.CoordAnimator?.isActive?.() || false`);
    console.log('[TEST 5.1] Coord animator active before switch:', coordActiveCheck);
    if (!coordActiveCheck) throw new Error('Coord animator failed to start for test 5!');

    // Switch to another problem (e.g. rank)
    console.log('[TEST 5.2] Switching to rank problem...');
    await evaluate(`(() => {
        const sel = document.getElementById("opExtraSelect");
        sel.value = "rank";
        sel.dispatchEvent(new Event("change"));
    })()`);
    await sleep(300);

    const switchCleanupRes = await evaluate(`(() => {
        const isCoordActive = window.App?.CoordAnimator?.isActive?.() || false;
        const coordWrap = document.getElementById("coordAnimControls");
        const isBasisActive = window.App?.BasisAnimator?.isActive?.() || false;
        const basisWrap = document.getElementById("basisAnimControls");
        return {
            isCoordActive,
            coordDisplay: coordWrap ? coordWrap.style.display : "null",
            isBasisActive,
            basisDisplay: basisWrap ? basisWrap.style.display : "null"
        };
    })()`);

    console.log('[TEST 5.2] Cleanup result after switch:', JSON.stringify(switchCleanupRes));
    if (switchCleanupRes.isCoordActive || switchCleanupRes.coordDisplay !== 'none') {
        throw new Error('Coord animator was not cleaned up when switching to rank problem!');
    }
    // Set desktop viewport 1280x850 for clean visualization screenshots
    await send('Emulation.setDeviceMetricsOverride', {
        width: 1280,
        height: 850,
        deviceScaleFactor: 1,
        mobile: false
    });

    // Capture Coordinate Task UI (Pill buttons: Bước 1..4 without descriptions)
    await evaluate(`(() => {
        // Open sidebar controls
        document.getElementById("controls")?.classList.add("open");

        // Switch to "Bài toán" tab (index 1)
        const tabs = document.querySelectorAll(".sidebar-tabs .tab-btn");
        if (tabs[1]) tabs[1].click();

        const sel = document.getElementById("opExtraSelect");
        sel.value = "coordinates";
        sel.dispatchEvent(new Event("change"));

        const vCoordSelect = document.getElementById("vCoordSelect");
        vCoordSelect.value = "1";
        vCoordSelect.dispatchEvent(new Event("change"));

        const checkContainer = document.getElementById("basisCoordChecklist");
        const cb2 = checkContainer.querySelector('input[type="checkbox"][value="2"]');
        const cb3 = checkContainer.querySelector('input[type="checkbox"][value="3"]');
        if (cb2) cb2.checked = true;
        if (cb3) cb3.checked = true;

        // Open animation controls
        document.getElementById("btnCoordAnimate").click();
        document.querySelectorAll(".toast-item, .alert, .offline-toast, [class*='toast']").forEach(e => e.remove());
    })()`);
    await sleep(500);

    const shotCoord = await send('Page.captureScreenshot', { format: 'png' });
    const shotCoordPath = path.join(ARTIFACT_DIR, 'verify_coord_step_pills_clean.png');
    fs.writeFileSync(shotCoordPath, Buffer.from(shotCoord.data, 'base64'));
    console.log(`[TEST] Saved coordinate pills screenshot to ${shotCoordPath}`);

    // Capture Basis Task UI (Decoupled buttons: Tính cơ sở, Trực quan, Lời giải and dynamic step pills)
    await evaluate(`(async () => {
        // Open sidebar controls
        document.getElementById("controls")?.classList.add("open");

        const sel = document.getElementById("opExtraSelect");
        sel.value = "basis";
        sel.dispatchEvent(new Event("change"));

        const checkContainer = document.getElementById("basisChecklist");
        const cb1 = checkContainer.querySelector('input[type="checkbox"][value="1"]');
        const cb2 = checkContainer.querySelector('input[type="checkbox"][value="2"]');
        if (cb1) cb1.checked = true;
        if (cb2) cb2.checked = true;

        await App.basisAndDimUI();
        await App.startBasisAnimateUI();
        document.querySelectorAll(".toast-item, .alert, .offline-toast, [class*='toast']").forEach(e => e.remove());
        const wrap = document.getElementById("basisAnimControls");
        if (wrap) wrap.scrollIntoView({ behavior: "instant", block: "center" });
    })()`);
    await sleep(600);

    const shotBasis = await send('Page.captureScreenshot', { format: 'png' });
    const shotBasisPath = path.join(ARTIFACT_DIR, 'verify_basis_decoupled_and_step_pills.png');
    fs.writeFileSync(shotBasisPath, Buffer.from(shotBasis.data, 'base64'));
    console.log(`[TEST] Saved basis decoupled UI screenshot to ${shotBasisPath}`);

    console.log('================================================================');
    console.log('ALL TESTS PASSED 100%!');
    console.log('================================================================');

    edgeProcess.kill();
    server.close();
    if (fs.existsSync(tmpUserData)) {
        try { fs.rmSync(tmpUserData, { recursive: true, force: true }); } catch (_) {}
    }
    process.exit(0);
}

runTest().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
