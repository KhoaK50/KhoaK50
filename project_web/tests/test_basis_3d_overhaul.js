const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const HTTP_PORT = 5623;
const CDP_PORT = 9295;
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
    console.log('TESTING 3D BASIS ANIMATION OVERHAUL & ANTI-BALLOON VERIFICATION');
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

    const userDataDir = path.join(ROOT_DIR, 'tmp_edge_test_basis_3d');
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
        const r = await send('Runtime.evaluate', {
            expression: expr,
            returnByValue: true,
            awaitPromise: true
        });
        if (r.exceptionDetails) {
            console.error('Evaluate Exception:', r.exceptionDetails);
            throw new Error(r.exceptionDetails.text || 'Runtime.evaluate failed');
        }
        return r.result ? r.result.value : undefined;
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

        // 1. Chuyển sang chế độ 3D
        console.log('[MODE] Switching to 3D mode via App.toggleMode()...');
        const modeSwitched = await evaluate(`(() => {
            if (App.mode !== '3D' && typeof App.toggleMode === 'function') {
                App.toggleMode();
            }
            return App.mode;
        })()`);
        console.log(`[MODE] Current App.mode: ${modeSwitched}`);
        await sleep(1000);

        // 2. Chuyển sang tab Bài toán -> Cơ sở
        await evaluate(`(() => {
            const tabs = document.querySelectorAll('.sidebar-tabs.vertical .tab-btn');
            if (tabs && tabs[1]) tabs[1].click();
            const opSel = document.getElementById('opExtraSelect');
            if (opSel) {
                opSel.value = 'basis';
                opSel.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (typeof App.showExtraForm === 'function') App.showExtraForm('basis');
        })()`);
        await sleep(500);

        // 3. Thiết lập 3 vector thử nghiệm trong 3D:
        // v1 = [1, 2, 0], v2 = [1, 3, 0], v3 = [1, 1, 0] (bị phụ thuộc: v3 = 2*v1 - v2)
        console.log('[SETUP] Setting vectors v1=[1,2,0], v2=[1,3,0], v3=[1,1,0]...');
        await evaluate(`(() => {
            App.vectorList = [
                { id: 1, name: 'v_1', vec: [1, 2, 0], colorCss: '#ef4444', colorHex: '#ef4444', visible: true, alpha: 1 },
                { id: 2, name: 'v_2', vec: [1, 3, 0], colorCss: '#3b82f6', colorHex: '#3b82f6', visible: true, alpha: 1 },
                { id: 3, name: 'v_3', vec: [1, 1, 0], colorCss: '#10b981', colorHex: '#10b981', visible: true, alpha: 1 }
            ];
            if (typeof App.renderVectorList === 'function') App.renderVectorList(false);
            if (typeof App.renderExtraCalcOptions === 'function') App.renderExtraCalcOptions();
            if (window.Vec3D) Vec3D.hardRefresh3D(true);
            return App.vectorList.length;
        })()`);
        await sleep(600);

        // 4. Tick chọn cả 3 vector và chạy tính cơ sở
        console.log('[ACTION] Checking all checkboxes and running App.basisAndDimUI()...');
        await evaluate(`(async () => {
            const cbs = document.querySelectorAll('#basisChecklist input[type="checkbox"]');
            cbs.forEach(cb => cb.checked = true);
            await App.basisAndDimUI();
        })()`);
        await sleep(1500);

        const animActive = await evaluate(`App.BasisAnimator.isActive()`);
        console.log(`[VERIFY 1] Basis animator active: ${animActive}`);
        if (!animActive) throw new Error('Basis animator did not start');

        // Pause để kiểm soát từng bước kiểm tra
        await evaluate(`App.BasisAnimator.pause()`);
        await sleep(300);

        // 4. Bước 1: 1D Line
        console.log('[STEP 1] Go to step 1 (1D Line span)...');
        await evaluate(`App.BasisAnimator.goToStep(1)`);
        await sleep(500);

        const step1Info = await evaluate(`(() => {
            const grp = window.Vec3D && Vec3D._basisSubspaceGroup;
            if (!grp) return { hasGroup: false };
            let hasDashedLine = false;
            let hasMarker = false;
            grp.children.forEach(c => {
                if (c.material && c.material.isLineDashedMaterial) hasDashedLine = true;
                if (c.isGroup && c.children.some(ch => ch.geometry && ch.geometry.type === 'SphereGeometry')) hasMarker = true;
            });
            return {
                hasGroup: true,
                childCount: grp.children.length,
                hasDashedLine,
                hasMarker
            };
        })()`);
        console.log('[VERIFY 2] Step 1 3D Subspace:', step1Info);
        if (!step1Info.hasDashedLine) throw new Error('Step 1 missing 1D dashed axis line in 3D');

        // 5. Bước 2: EXPAND 2D (Sóng lát gạch lan tỏa trong 3D)
        console.log('[STEP 2] Go to step 2 (EXPAND 2D wave)...');
        await evaluate(`(() => {
            App.BasisAnimator.goToStep(2);
            // Kích hoạt tiến độ sóng 0.35 (Pha 2: Quét hình bình hành)
            App.BasisAnimator._tileWaveProgress = 0.35;
            App.BasisAnimator.updateStep2DynamicState(0.35);
            App.BasisAnimator.redraw();
        })()`);
        await sleep(600);

        const step2SweepInfo = await evaluate(`(() => {
            const grp = window.Vec3D && Vec3D._basisSubspaceGroup;
            if (!grp) return null;
            let hasQuadMesh = false;
            let meshOpacity = 0;
            let lineCount = 0;
            let markerCount = 0;
            grp.children.forEach(c => {
                if (c.isMesh && c.geometry && c.geometry.type === 'BufferGeometry' && c.material && c.material.opacity > 0) {
                    hasQuadMesh = true;
                    meshOpacity = c.material.opacity;
                }
                if (c.isLine) lineCount++;
                if (c.isGroup) markerCount++;
            });
            return {
                childCount: grp.children.length,
                hasQuadMesh,
                meshOpacity,
                lineCount,
                markerCount
            };
        })()`);
        console.log('[VERIFY 3] Step 2 (Pha 2 sweep 3D):', step2SweepInfo);
        if (!step2SweepInfo.hasQuadMesh) throw new Error('Step 2 missing swept quad mesh in 3D');
        await captureScreenshot('verify_basis_3d_step2_sweep.png');

        // Kiểm tra Pha 3 (Dãn nở lưới affine)
        await evaluate(`(() => {
            App.BasisAnimator._tileWaveProgress = 0.70;
            App.BasisAnimator.updateStep2DynamicState(0.70);
            App.BasisAnimator.redraw();
        })()`);
        await sleep(500);

        const step2ExpandInfo = await evaluate(`(() => {
            const grp = window.Vec3D && Vec3D._basisSubspaceGroup;
            if (!grp) return null;
            let hasLineSegments = false;
            let hasQuad = false;
            grp.children.forEach(c => {
                if (c.isLineSegments) hasLineSegments = true;
                if (c.isMesh) hasQuad = true;
            });
            return { hasLineSegments, hasQuad };
        })()`);
        console.log('[VERIFY 4] Step 2 (Pha 3 expand affine grid 3D):', step2ExpandInfo);
        if (!step2ExpandInfo.hasLineSegments) throw new Error('Step 2 missing affine grid line segments in 3D');
        await captureScreenshot('verify_basis_3d_step2_expand.png');

        // 6. Bước 3: REDUNDANT (Vector v3=[1,1,0] bị bắt giữ)
        console.log('[STEP 3] Go to step 3 (REDUNDANT vector v3)...');
        await evaluate(`App.BasisAnimator.goToStep(3)`);
        await sleep(600);

        const step3Info = await evaluate(`(() => {
            const grp = window.Vec3D && Vec3D._basisSubspaceGroup;
            if (!grp) return null;
            let hasPlaneQuad = false;
            let hasAmberLines = false;
            let hasAmberMarkers = false;
            let maxSphereRadius = 0;
            let spheres = [];

            grp.traverse(obj => {
                if (obj.isMesh && obj.material && obj.material.color && obj.material.color.getHex() === 0x10b981 && obj.material.opacity > 0) {
                    hasPlaneQuad = true;
                }
                if (obj.isLine && obj.material && obj.material.color && obj.material.color.getHex() === 0xf59e0b) {
                    hasAmberLines = true;
                }
                if (obj.isMesh && obj.geometry && obj.geometry.type === 'SphereGeometry') {
                    const r = obj.geometry.parameters.radius;
                    spheres.push(r);
                    if (r > maxSphereRadius) maxSphereRadius = r;
                    if (obj.material && obj.material.color && obj.material.color.getHex() === 0xf59e0b) {
                        hasAmberMarkers = true;
                    }
                }
            });

            return {
                hasPlaneQuad,
                hasAmberLines,
                hasAmberMarkers,
                maxSphereRadius,
                sphereCount: spheres.length,
                spheres
            };
        })()`);
        console.log('[VERIFY 5] Step 3 (Redundant vector with linear decomposition in 3D):', step3Info);
        if (!step3Info.hasPlaneQuad) throw new Error('Step 3 lost spanned plane quad in 3D');
        if (!step3Info.hasAmberLines) throw new Error('Step 3 missing amber linear combination decomposition lines in 3D');
        if (!step3Info.hasAmberMarkers) throw new Error('Step 3 missing amber component markers in 3D');
        if (step3Info.maxSphereRadius >= 0.20) {
            throw new Error(`CRITICAL: Found giant balloon sphere with radius ${step3Info.maxSphereRadius}! Anti-balloon rule violated!`);
        }
        console.log(`[PASS] Anti-balloon check passed! Maximum sphere radius is refined: ${step3Info.maxSphereRadius.toFixed(3)}u`);
        await captureScreenshot('verify_basis_3d_step3_redundant.png');

        // 7. Bước 4: CRYSTALLIZE (Cơ sở kết tinh và giữ nguyên không gian)
        console.log('[STEP 4] Go to step 4 (CRYSTALLIZE)...');
        await evaluate(`App.BasisAnimator.goToStep(4)`);
        await sleep(600);

        const step4Info = await evaluate(`(() => {
            const grp = window.Vec3D && Vec3D._basisSubspaceGroup;
            if (!grp) return null;
            let hasPlaneQuad = false;
            let hasAffineGrid = false;
            grp.traverse(obj => {
                if (obj.isMesh && obj.material && obj.material.color && obj.material.color.getHex() === 0x10b981 && obj.material.opacity > 0) {
                    hasPlaneQuad = true;
                }
                if (obj.isLineSegments) hasAffineGrid = true;
            });
            const v1Color = App.vectorList[0]._basisColorCss;
            const v2Color = App.vectorList[1]._basisColorCss;
            const v3Color = App.vectorList[2]._basisColorCss;
            return {
                hasPlaneQuad,
                hasAffineGrid,
                v1Color,
                v2Color,
                v3Color
            };
        })()`);
        console.log('[VERIFY 6] Step 4 (Crystallize with permanent 3D space retained):', step4Info);
        if (!step4Info.hasPlaneQuad) throw new Error('Step 4 lost spanned plane quad in 3D');
        if (!step4Info.hasAffineGrid) throw new Error('Step 4 lost affine grid in 3D');
        if (step4Info.v1Color !== '#10b981' || step4Info.v2Color !== '#10b981') throw new Error('Basis vectors are not emerald in step 4');
        if (step4Info.v3Color !== '#f59e0b') throw new Error('Redundant vector is not amber in step 4');
        await captureScreenshot('verify_basis_3d_step4_crystallize.png');

        // 8. Kiểm tra Dim = 3 Khối hộp Parallelepiped trong 3D
        console.log('[STEP 5] Testing 3D Parallelepiped box expansion (Dim = 3)...');
        await evaluate(`(async () => {
            App.BasisAnimator.stop();
            App.vectorList = [
                { id: 1, name: 'e_1', vec: [1, 0, 0], colorCss: '#ef4444', colorHex: '#ef4444', visible: true, alpha: 1 },
                { id: 2, name: 'e_2', vec: [0, 1, 0], colorCss: '#3b82f6', colorHex: '#3b82f6', visible: true, alpha: 1 },
                { id: 3, name: 'e_3', vec: [0, 0, 1], colorCss: '#10b981', colorHex: '#10b981', visible: true, alpha: 1 }
            ];
            if (typeof App.renderVectorList === 'function') App.renderVectorList(false);
            if (typeof App.renderExtraCalcOptions === 'function') App.renderExtraCalcOptions();
            const cbs = document.querySelectorAll('#basisChecklist input[type="checkbox"]');
            cbs.forEach(cb => cb.checked = true);
            await App.basisAndDimUI();
        })()`);
        await sleep(1200);
        await evaluate(`(() => {
            App.BasisAnimator.pause();
            App.BasisAnimator.goToStep(3); // Bước EXPAND thứ 3: Dim = 3
            App.BasisAnimator._tileWaveProgress = 1.0;
            App.BasisAnimator.redraw();
        })()`);
        await sleep(600);

        const dim3Info = await evaluate(`(() => {
            const grp = window.Vec3D && Vec3D._basisSubspaceGroup;
            if (!grp) return null;
            let quadMeshCount = 0;
            let hasBoxEdges = false;
            grp.children.forEach(c => {
                if (c.isMesh) quadMeshCount++;
                if (c.isLineSegments) hasBoxEdges = true;
            });
            return { quadMeshCount, hasBoxEdges };
        })()`);
        console.log('[VERIFY 7] Dim = 3 Parallelepiped box expansion in 3D:', dim3Info);
        if (dim3Info.quadMeshCount < 6) throw new Error('Dim = 3 box missing 6 translucent quad faces');
        if (!dim3Info.hasBoxEdges) throw new Error('Dim = 3 box missing 12 glowing edges');
        await captureScreenshot('verify_basis_3d_dim3_box.png');

        console.log('================================================================');
        console.log('ALL 3D BASIS OVERHAUL & ANTI-BALLOON TESTS PASSED PERFECTLY!');
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
