const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const HTTP_PORT = 5624;
const CDP_PORT = 9296;
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
    console.log('TESTING 2D/3D ZOOM STABILITY & R^2 PLANE CONTINUITY IN R^3');
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

    const userDataDir = path.join(ROOT_DIR, 'tmp_edge_test_zoom_behavior');
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

    let wsUrl = null;
    for (let i = 0; i < 15; i++) {
        try {
            const listData = await new Promise((resolve, reject) => {
                http.get(`http://127.0.0.1:${CDP_PORT}/json/list`, res => {
                    let d = '';
                    res.on('data', chunk => d += chunk);
                    res.on('end', () => resolve(JSON.parse(d)));
                }).on('error', reject);
            });
            if (listData && listData.length > 0 && listData[0].webSocketDebuggerUrl) {
                wsUrl = listData[0].webSocketDebuggerUrl;
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

    async function evaluate(expr) {
        const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (res.exceptionDetails) {
            console.error('Evaluate Exception:', res.exceptionDetails);
            throw new Error(res.exceptionDetails.text || 'Runtime.evaluate exception');
        }
        return res.result ? res.result.value : null;
    }

    async function captureScreenshot(filename) {
        const res = await send('Page.captureScreenshot', { format: 'png' });
        const buf = Buffer.from(res.data, 'base64');
        const outPath = path.join(ARTIFACT_DIR, filename);
        fs.writeFileSync(outPath, buf);
        console.log(`[SCREENSHOT] Saved: ${outPath} (${buf.length} bytes)`);
    }

    try {
        await send('Page.enable');
        await send('Runtime.enable');

        console.log('[NAV] Navigating to calculation.html...');
        await send('Page.navigate', { url: `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html` });
        for (let w = 0; w < 30; w++) {
            await sleep(500);
            try {
                const ready = await evaluate(`typeof window.App !== 'undefined' && typeof App.toggleMode === 'function'`);
                if (ready) {
                    console.log(`[APP] App ready after ${(w + 1) * 500}ms`);
                    break;
                }
            } catch (e) {}
        }

        // =========================================================================
        // TEST 1: 2D ZOOM-OUT STABILITY (Lưới không biến mất khi zoom nhỏ)
        // =========================================================================
        console.log('\n--- TEST 1: Kiểm tra độ ổn định khi zoom nhỏ trong 2D ---');
        await evaluate(`(() => {
            const tabs = document.querySelectorAll('.sidebar-tabs.vertical .tab-btn');
            if (tabs && tabs[1]) tabs[1].click();
            const opSel = document.getElementById('opExtraSelect');
            if (opSel) {
                opSel.value = 'basis';
                opSel.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (typeof App.showExtraForm === 'function') App.showExtraForm('basis');
            if (App.mode !== '2D') App.toggleMode();
            App.vectorList = [
                { id: 1, name: 'u', vec: [1, 2], colorCss: '#ef4444', colorHex: '#ef4444', visible: true, alpha: 1 },
                { id: 2, name: 'v', vec: [2, 1], colorCss: '#3b82f6', colorHex: '#3b82f6', visible: true, alpha: 1 }
            ];
            if (typeof App.renderVectorList === 'function') App.renderVectorList(false);
            if (typeof App.renderExtraCalcOptions === 'function') App.renderExtraCalcOptions();
            const cbs = document.querySelectorAll('#basisChecklist input[type="checkbox"]');
            cbs.forEach(cb => cb.checked = true);
        })()`);
        await evaluate(`(async () => {
            await App.basisAndDimUI();
        })()`);
        await sleep(1200);

        // Nhảy đến Bước 2 (Phủ R^2)
        await evaluate(`(() => {
            App.BasisAnimator.pause();
            App.BasisAnimator.goToStep(2); // Bước 2 là index 2 (EXPAND dim=2)
            App.BasisAnimator._tileWaveProgress = 1.0;
            App.BasisAnimator.redraw();
        })()`);
        await sleep(400);

        const stepDebug = await evaluate(`(() => {
            return {
                step: App.BasisAnimator.getStep(),
                stepsCount: App.BasisAnimator._plan?.steps?.length,
                basisItems: App.BasisAnimator.getBasisItems(),
                active: App.BasisAnimator.isActive()
            };
        })()`);
        console.log('[DEBUG STEP]', JSON.stringify(stepDebug, null, 2));

        // Giả lập zoom cực nhỏ: pxPerUnit = 0.02 (nhỏ gấp 2000 lần bình thường)
        console.log('[2D ZOOM] Simulating extreme zoom-out: pxPerUnit = 0.02...');
        const zoom2DInfo = await evaluate(`(() => {
            Vec2D.S2D.pxPerUnit = 0.02;
            Vec2D.S2D.zoomTarget = 0.02;
            App.BasisAnimator.redraw();

            // Kiểm tra canvas pixel xem màu nền ngọc bích R^2 còn phủ không
            const cv = document.getElementById('canvas2d');
            const ctx = cv.getContext('2d');
            const p = ctx.getImageData(50, 50, 1, 1).data;
            return {
                pxPerUnit: Vec2D.S2D.pxPerUnit,
                r: p[0],
                g: p[1],
                b: p[2],
                a: p[3],
                animActive: App.BasisAnimator.isActive()
            };
        })()`);
        console.log('[VERIFY 1] 2D Zoom-out canvas state:', zoom2DInfo);
        // Canvas phải có sắc ngọc bích R^2 (rgba(16, 185, 129, 0.15) trên nền trắng cho ra g > r và r < 255)
        if (zoom2DInfo.r >= 250 && zoom2DInfo.g >= 250 && zoom2DInfo.b >= 250) {
            throw new Error('2D subspace blanket vanished on extreme zoom-out!');
        }
        await captureScreenshot('verify_basis_2d_zoomed_out.png');
        console.log('✅ PASS: Không gian 2D R^2 vẫn bao trùm hoàn hảo và không bị biến mất khi zoom cực nhỏ!');

        // =========================================================================
        // TEST 2: 3D R^2 PLANE CONTINUITY INTO R^3 (Mặt phẳng R^2 không bị biến mất khi sang R^3)
        // =========================================================================
        console.log('\n--- TEST 2: Kiểm tra tính liên tục của mặt phẳng R^2 khi bước sang R^3 ---');
        await evaluate(`(() => {
            App.BasisAnimator.stop();
            if (App.mode !== '3D') App.toggleMode();
            App.vectorList = [
                { id: 1, name: 'e_1', vec: [1, 0, 0], colorCss: '#ef4444', colorHex: '#ef4444', visible: true, alpha: 1 },
                { id: 2, name: 'e_2', vec: [0, 1, 0], colorCss: '#3b82f6', colorHex: '#3b82f6', visible: true, alpha: 1 },
                { id: 3, name: 'e_3', vec: [0, 0, 1], colorCss: '#10b981', colorHex: '#10b981', visible: true, alpha: 1 }
            ];
            if (typeof App.renderVectorList === 'function') App.renderVectorList(false);
            if (typeof App.renderExtraCalcOptions === 'function') App.renderExtraCalcOptions();
            const cbs = document.querySelectorAll('#basisChecklist input[type="checkbox"]');
            cbs.forEach(cb => cb.checked = true);
        })()`);
        await evaluate(`App.basisAndDimUI()`);
        await sleep(1000);

        // A. Kiểm tra Bước 2 trong 3D: Mặt phẳng R^2 đang phủ
        console.log('[STEP 2] Check Step 2 in 3D: R^2 plane covered...');
        await evaluate(`(() => {
            App.BasisAnimator.pause();
            App.BasisAnimator.goToStep(2);
            App.BasisAnimator._tileWaveProgress = 1.0;
            App.BasisAnimator.redraw();
        })()`);
        await sleep(400);

        const step2In3D = await evaluate(`(() => {
            const grp = window.Vec3D && Vec3D._basisSubspaceGroup;
            if (!grp) return null;
            let meshCount = 0;
            let lineCount = 0;
            grp.children.forEach(c => {
                if (c.isMesh) meshCount++;
                if (c.isLineSegments) lineCount++;
            });
            return { meshCount, lineCount };
        })()`);
        console.log('[VERIFY 2A] Step 2 R^2 plane in 3D:', step2In3D);
        if (step2In3D.meshCount < 1) throw new Error('Step 2 missing R^2 plane mesh in 3D');
        await captureScreenshot('verify_basis_3d_step2_plane_covered.png');

        // B. Bước sang Bước 3 Pha 1 (rawP = 0.05): Khảo sát vector 3 ngoài mặt phẳng
        console.log('[STEP 3 Pha 1] Check Step 3 Phase 1: R^2 plane MUST BE PRESERVED when b3 appears...');
        await evaluate(`(() => {
            App.BasisAnimator.goToStep(3);
            App.BasisAnimator._tileWaveProgress = 0.05;
            App.BasisAnimator.redraw();
        })()`);
        await sleep(400);

        const step3Phase1 = await evaluate(`(() => {
            const grp = window.Vec3D && Vec3D._basisSubspaceGroup;
            if (!grp) return null;
            let hasR2Plane = false;
            grp.children.forEach(c => {
                if (c.isMesh && c.material && c.material.opacity >= 0.09) hasR2Plane = true;
            });
            return { hasR2Plane, childCount: grp.children.length };
        })()`);
        console.log('[VERIFY 2B] Step 3 Phase 1 (b3 appears): R^2 plane preserved:', step3Phase1);
        if (!step3Phase1.hasR2Plane) throw new Error('R^2 plane was lost in Step 3 Phase 1 when examining b3!');
        await captureScreenshot('verify_basis_3d_step3_p1_plane_retained.png');
        console.log('✅ PASS: Mặt phẳng R^2 vẫn giữ nguyên vẹn khi vector 3 bắt đầu xuất hiện khảo sát!');

        // C. Bước 3 Hoàn tất (rawP = 1.0): R^3 kết tinh VÀ mặt phẳng R^2 vẫn nằm bên trong
        console.log('[STEP 3 Pha 4] Check Step 3 Phase 4: Full R^3 box AND R^2 base plane retained inside...');
        await evaluate(`(() => {
            App.BasisAnimator.goToStep(3);
            App.BasisAnimator._tileWaveProgress = 1.0;
            App.BasisAnimator.redraw();
        })()`);
        await sleep(400);

        const step3Phase4 = await evaluate(`(() => {
            const grp = window.Vec3D && Vec3D._basisSubspaceGroup;
            if (!grp) return null;
            let quadMeshCount = 0;
            grp.children.forEach(c => {
                if (c.isMesh) quadMeshCount++;
            });
            return { quadMeshCount };
        })()`);
        console.log('[VERIFY 2C] Step 3 Phase 4 (Full R^3): Total quad meshes:', step3Phase4);
        if (step3Phase4.quadMeshCount < 7) {
            throw new Error(`Expected at least 7 quad meshes (6 R^3 faces + 1 R^2 plane), got ${step3Phase4.quadMeshCount}`);
        }
        await captureScreenshot('verify_basis_3d_step3_p4_crystallized_with_r2.png');
        console.log('✅ PASS: Cả thể tích R^3 (6 mặt) và mặt sàn R^2 gốc đều tồn tại đồng thời, không bị mất màu R^2!');

        // =========================================================================
        // TEST 3: 3D ZOOM-OUT STABILITY (Khối R^3 và các lát cắt không bị thu nhỏ thành chấm)
        // =========================================================================
        console.log('\n--- TEST 3: Kiểm tra độ ổn định khi zoom ra rất xa trong 3D ---');
        console.log('[3D ZOOM] Simulating extreme zoom-out in 3D: unitsPerWorld = 0.05...');
        await evaluate(`(() => {
            Vec3D.S3D.unitsPerWorld = 0.05;
            Vec3D.S3D.zoomTarget = 0.05;
            App.BasisAnimator.redraw();
        })()`);
        await sleep(400);

        const zoom3DInfo = await evaluate(`(() => {
            const grp = window.Vec3D && Vec3D._basisSubspaceGroup;
            if (!grp) return null;
            let maxCoord = 0;
            grp.children.forEach(c => {
                if (c.geometry && c.geometry.attributes && c.geometry.attributes.position) {
                    const arr = c.geometry.attributes.position.array;
                    for (let i = 0; i < arr.length; i++) {
                        const val = Math.abs(arr[i]);
                        if (val > maxCoord) maxCoord = val;
                    }
                }
            });
            return {
                unitsPerWorld: Vec3D.S3D.unitsPerWorld,
                maxCoordInWorld: maxCoord
            };
        })()`);
        console.log('[VERIFY 3] 3D Zoom-out max world coordinate:', zoom3DInfo);
        // O zoom cuc nho (unitsPerWorld = 0.05), toa do the gioi cua khoi hop van phai dat ~36 world units (Lw * 1.8, khong bi co ve 2.5 units)
        if (zoom3DInfo.maxCoordInWorld < 30) {
            throw new Error(`3D box shrank to a dot! Max world coord is only ${zoom3DInfo.maxCoordInWorld}`);
        }
        await captureScreenshot('verify_basis_3d_zoomed_out_stable.png');
        console.log('✅ PASS: Khoi hop R^3 van bao quat toan bo khung nhin the gioi (~36 units) khi zoom ra cuc xa!');

        console.log('================================================================');
        console.log('ALL ZOOM STABILITY & R^2 PLANE CONTINUITY TESTS PASSED!');
        console.log('================================================================');

    } catch (err) {
        console.error('Test Failed:', err);
        process.exitCode = 1;
    } finally {
        ws.close();
        browser.kill();
        server.close();
        try {
            fs.rmSync(userDataDir, { recursive: true, force: true });
        } catch (e) {}
    }
}

runTest();
