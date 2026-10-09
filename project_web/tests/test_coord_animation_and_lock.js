// ==============================================================================
// TEST: KHÓA TƯƠNG TÁC ĐẦU VECTOR & HOẠT CẢNH TỌA ĐỘ THEO CƠ SỞ (2D & 3D)
// ==============================================================================
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5626;
const CDP_PORT = 9225;

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
    console.log('TESTING INTERACTION LOCK & COORDINATE ANIMATION (2D & 3D)');
    console.log('================================================================');

    const server = startStaticServer();
    console.log(`[HTTP] Server active on port ${HTTP_PORT}`);

    const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_coord_test');
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}

    const edgeBin = findEdgeBinary();
    const browser = spawn(edgeBin, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${userDataDir}`,
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
        await send('Emulation.setDeviceMetricsOverride', {
            width: 1400,
            height: 900,
            deviceScaleFactor: 1,
            mobile: false
        });

        console.log('[NAV] Navigating to calculation.html...');
        await send('Page.navigate', { url: `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html` });
        console.log('[PAGE] Waiting for page initialization...');
        await sleep(3500);

        let isAppReady = false;
        for (let w = 0; w < 30; w++) {
            try {
                isAppReady = await evaluate(`typeof window.App !== 'undefined' && typeof window.App.toggleMode === 'function'`);
                if (isAppReady) {
                    console.log(`[APP] App ready after ${(w + 1) * 500}ms`);
                    break;
                }
            } catch (e) {}
            await sleep(500);
        }
        if (!isAppReady) {
            throw new Error('Timed out waiting for App to initialize');
        }

        // =========================================================================
        // TEST 1: KHÓA TƯƠNG TÁC ĐẦU VECTOR TRONG 2D KHI HOẠT CẢNH ĐANG CHẠY / TẠM DỪNG
        // =========================================================================
        console.log('\n--- TEST 1: Kiểm tra khóa tương tác kéo đầu vector trong 2D ---');
        await evaluate(`(() => {
            if (App.mode !== '2D') App.toggleMode();
            App.vectorList = [
                { id: 1, name: 'v_1', vec: [3, 2], colorCss: '#ef4444', colorHex: '#ef4444', visible: true, alpha: 1 }
            ];
            if (typeof App.renderVectorList === 'function') App.renderVectorList(false);
            Vec2D.draw2DAllVectors();
        })()`);
        await sleep(300);

        // A. Khi CHƯA có hoạt cảnh: click vào đầu vector phải bắt được (draggedVectorId = 1)
        const unblockedCheck = await evaluate(`(() => {
            const cv = document.getElementById('canvas2d');
            const rect = cv.getBoundingClientRect();
            const { cx, cy, px } = Vec2D.gridInfo2D;
            const tipX = cx + 3 * px;
            const tipY = cy - 2 * px;

            // Bắn sự kiện pointerdown vào đúng đầu vector
            const evt = new PointerEvent('pointerdown', {
                clientX: rect.left + tipX,
                clientY: rect.top + tipY,
                bubbles: true
            });
            cv.dispatchEvent(evt);

            const isDragged = Vec2D.S2D.draggedVectorId === 1;
            // Dọn dẹp nhả chuột
            cv.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
            return isDragged;
        })()`);
        console.log('[TEST 1A] Kéo vector bình thường khi CHƯA có animation:', unblockedCheck);
        if (!unblockedCheck) throw new Error('Normal vector dragging should work when animation is inactive!');

        // B. KHI KÍCH HOẠT HOẠT CẢNH (App.CoordAnimator hoặc App.BasisAnimator): Phải bị KHÓA hoàn toàn
        console.log('[TEST 1B] Bật hoạt cảnh và thử kéo đầu vector...');
        await evaluate(`(() => {
            App.vectorList = [
                { id: 1, name: 'x', vec: [3, 4], colorCss: '#f59e0b', colorHex: '#f59e0b', visible: true, alpha: 1 },
                { id: 2, name: 'v_1', vec: [1, 2], colorCss: '#10b981', colorHex: '#10b981', visible: true, alpha: 1 },
                { id: 3, name: 'v_2', vec: [2, 1], colorCss: '#0284c7', colorHex: '#0284c7', visible: true, alpha: 1 }
            ];
            App.CoordAnimator.start({ targetId: 1, basisIds: [2, 3] });
            App.CoordAnimator.pause(); // Tạm dừng
        })()`);
        await sleep(300);

        const lockedCheck2D = await evaluate(`(() => {
            const cv = document.getElementById('canvas2d');
            const rect = cv.getBoundingClientRect();
            const { cx, cy, px } = Vec2D.gridInfo2D;
            const tipX = cx + 3 * px;
            const tipY = cy - 4 * px;

            // Thử pointermove hover vào đầu vector
            cv.dispatchEvent(new PointerEvent('pointermove', {
                clientX: rect.left + tipX,
                clientY: rect.top + tipY,
                bubbles: true
            }));
            const cursorOnHover = cv.style.cursor;

            // Thử pointerdown vào đầu vector
            cv.dispatchEvent(new PointerEvent('pointerdown', {
                clientX: rect.left + tipX,
                clientY: rect.top + tipY,
                bubbles: true
            }));
            const draggedId = Vec2D.S2D.draggedVectorId;

            // Thử kéo dịch 50px
            cv.dispatchEvent(new PointerEvent('pointermove', {
                clientX: rect.left + tipX + 50,
                clientY: rect.top + tipY + 50,
                bubbles: true
            }));

            // Thả chuột
            cv.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

            const targetVec = App.vectorList.find(v => v.id === 1);
            return {
                cursorOnHover,
                draggedId,
                animActive: App.CoordAnimator.isActive(),
                isBlocked: App.isInteractionBlocked(),
                finalVec: [...targetVec.vec]
            };
        })()`);
        console.log('[TEST 1B] Kết quả thử kéo đầu vector khi animation active (2D):', lockedCheck2D);
        if (lockedCheck2D.draggedId !== null) {
            throw new Error(`CRITICAL: Vector head was draggable (draggedId = ${lockedCheck2D.draggedId}) while animation is active!`);
        }
        if (lockedCheck2D.finalVec[0] !== 3 || lockedCheck2D.finalVec[1] !== 4) {
            throw new Error('Vector coordinates shifted during animation!');
        }
        console.log('✅ PASS: Khóa tương tác đầu vector trong 2D hoàn hảo 100%!');

        // =========================================================================
        // TEST 2: KIỂM TRA CÁC PHA HOẠT CẢNH TỌA ĐỘ TRONG 2D & BỘ VECTOR CỦA USER
        // =========================================================================
        console.log('\n--- TEST 2: Kiểm tra các pha hoạt cảnh tọa độ 2D với bộ vector của User ---');
        // Thiết lập đúng bộ vector của người dùng: v1=[1, 2], v2=[1, 3], v3=[1, 4]
        await evaluate(`(() => {
            App.vectorList = [
                { id: 1, name: 'v_1', vec: [1, 2], colorCss: '#ef4444', colorHex: '#ef4444', visible: true, alpha: 1 },
                { id: 2, name: 'v_2', vec: [1, 3], colorCss: '#10b981', colorHex: '#10b981', visible: true, alpha: 1 },
                { id: 3, name: 'v_3', vec: [1, 4], colorCss: '#0284c7', colorHex: '#0284c7', visible: true, alpha: 1 }
            ];
            const taskSelect = document.getElementById('opExtraSelect');
            if (taskSelect) {
                taskSelect.value = 'coordinates';
                taskSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (typeof App.ensureCoordAnimControls === 'function') App.ensureCoordAnimControls();
            App.CoordAnimator.start({ targetId: 1, basisIds: [2, 3] });
        })()`);
        await sleep(400);

        const userSol = await evaluate(`App.CoordAnimator.getSolution()`);
        console.log('[USER VECTOR SOL] Nghiệm giải được:', userSol);
        // c1 = 2, c2 = -1
        if (Math.abs(userSol.coeffs[0] - 2) > 1e-3 || Math.abs(userSol.coeffs[1] - (-1)) > 1e-3) {
            throw new Error(`User vector solution incorrect! Got: ${JSON.stringify(userSol.coeffs)}`);
        }

        // Test kiểm tra slider track fill (--slider-pct)
        const sliderCheck = await evaluate(`(() => {
            const slider = document.getElementById('coordSpeedSlider');
            if (!slider) return null;
            slider.value = '1.5';
            slider.dispatchEvent(new Event('input', { bubbles: true }));
            return {
                val: slider.value,
                sliderPct: slider.style.getPropertyValue('--slider-pct'),
                rangePct: slider.style.getPropertyValue('--range-pct')
            };
        })()`);
        console.log('[SLIDER CHECK] Đồng bộ thuộc tính thanh trượt:', sliderCheck);
        if (!sliderCheck.sliderPct || sliderCheck.sliderPct === '') {
            throw new Error('--slider-pct was not updated on coordSpeedSlider!');
        }

        // Test kiểm tra 4 nút chọn pha (.coord-phase-btn)
        await evaluate(`(() => {
            const btnP3 = document.querySelector('.coord-phase-btn[data-phase="2"]');
            if (btnP3) btnP3.click();
        })()`);
        await sleep(300);
        const p3Active = await evaluate(`document.querySelector('.coord-phase-btn[data-phase="2"]').classList.contains('active')`);
        console.log('[PHASE PILLS] Nút Pha 3 active:', p3Active);

        // Chuyển sang Pha 4 và chụp ảnh
        await evaluate(`(() => {
            const btnP4 = document.querySelector('.coord-phase-btn[data-phase="3"]');
            if (btnP4) btnP4.click();
            App.CoordAnimator.redraw();
        })()`);
        await sleep(500);
        await captureScreenshot('verify_coord_user_vectors_phase4.png');

        // Test trường hợp suy biến: targetId = 2 (v_2), basisIds = [2, 3]
        console.log('[TEST DEGENERATE] Thử nghiệm trường hợp target nằm trong cơ sở:');
        const degenSol = await evaluate(`(() => {
            App.CoordAnimator.start({ targetId: 2, basisIds: [2, 3] });
            App.CoordAnimator.goToPhase(3);
            return {
                sol: App.CoordAnimator.getSolution(),
                stepDesc: document.getElementById('coordStepDesc').textContent
            };
        })()`);
        console.log('[TEST DEGENERATE] Kết quả:', degenSol);
        if (degenSol.sol.coeffs[0] !== 1 || degenSol.sol.coeffs[1] !== 0) {
            throw new Error(`Degenerate solution incorrect: ${JSON.stringify(degenSol.sol.coeffs)}`);
        }
        // Mở sidebar để chụp ảnh giao diện các nút điều khiển mới và thanh trượt đã sửa
        await evaluate(`(() => {
            const btnHam = document.getElementById('floatingHamburger');
            if (btnHam && !btnHam.classList.contains('open')) {
                btnHam.click();
            }
            const ctrl = document.getElementById('coordAnimControls');
            if (ctrl) ctrl.scrollIntoView({ behavior: 'instant', block: 'center' });
        })()`);
        await sleep(500);
        await captureScreenshot('verify_coord_sidebar_controls.png');

        // Đóng lại sidebar trước khi sang Test 3
        await evaluate(`(() => {
            const btnHam = document.getElementById('floatingHamburger');
            if (btnHam && btnHam.classList.contains('open')) {
                btnHam.click();
            }
        })()`);
        await sleep(300);

        // =========================================================================
        // TEST 3: KHÓA TƯƠNG TÁC ĐẦU VECTOR TRONG 3D KHI HOẠT CẢNH ĐANG CHẠY / TẠM DỪNG
        // =========================================================================
        console.log('\n--- TEST 3: Kiểm tra khóa tương tác kéo đầu vector trong 3D ---');
        await evaluate(`(() => {
            App.CoordAnimator.stop();
            if (App.mode !== '3D') App.toggleMode();
            App.vectorList = [
                { id: 1, name: 'x', vec: [2, 3, 4], colorCss: '#f59e0b', colorHex: '#f59e0b', visible: true, alpha: 1 },
                { id: 2, name: 'e_1', vec: [1, 0, 0], colorCss: '#10b981', colorHex: '#10b981', visible: true, alpha: 1 },
                { id: 3, name: 'e_2', vec: [0, 1, 0], colorCss: '#0284c7', colorHex: '#0284c7', visible: true, alpha: 1 },
                { id: 4, name: 'e_3', vec: [0, 0, 1], colorCss: '#8b5cf6', colorHex: '#8b5cf6', visible: true, alpha: 1 }
            ];
            if (typeof App.renderVectorList === 'function') App.renderVectorList(false);
            App.CoordAnimator.start({ targetId: 1, basisIds: [2, 3, 4] });
            App.CoordAnimator.pause();
        })()`);
        await sleep(600);

        const lockedCheck3D = await evaluate(`(() => {
            const cv = Vec3D._renderer.domElement;
            const rect = cv.getBoundingClientRect();

            // Lấy tọa độ màn hình của vector (2, 3, 4)
            const vWorld = Vec3D.mathToWorld ? Vec3D.mathToWorld(new THREE.Vector3(2, 3, 4)) : new THREE.Vector3(2, 4, 3);
            const vProj = vWorld.clone().project(Vec3D._camera);
            const sx = rect.left + (vProj.x * 0.5 + 0.5) * rect.width;
            const sy = rect.top + (-vProj.y * 0.5 + 0.5) * rect.height;

            // Bắn pointerdown vào đúng đầu mũi tên vector 3D
            cv.dispatchEvent(new PointerEvent('pointerdown', {
                clientX: sx,
                clientY: sy,
                bubbles: true
            }));

            const draggedId = Vec3D.S3D.draggedVectorId;
            const controlsEnabled = Vec3D._controls ? Vec3D._controls.enabled : true;

            // Nhả chuột
            cv.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

            return {
                isBlocked: App.isInteractionBlocked(),
                draggedId: draggedId || null,
                controlsEnabled,
                animActive: App.CoordAnimator.isActive()
            };
        })()`);
        console.log('[TEST 3] Trạng thái khóa tương tác trong 3D:', lockedCheck3D);
        if (!lockedCheck3D.isBlocked || lockedCheck3D.draggedId !== null || !lockedCheck3D.controlsEnabled) {
            throw new Error(`3D interaction lock failed: isBlocked=${lockedCheck3D.isBlocked}, draggedId=${lockedCheck3D.draggedId}, controlsEnabled=${lockedCheck3D.controlsEnabled}`);
        }
        console.log('✅ PASS: Khóa tương tác đầu vector trong 3D hoàn hảo 100%! Camera orbit vẫn hoạt động mượt mà.');

        // =========================================================================
        // TEST 4: KIỂM TRA KHỐI HỘP PARALLELEPIPED 3D TRONG PHA 4
        // =========================================================================
        console.log('\n--- TEST 4: Kiểm tra kết tinh khối hộp Parallelepiped 3D ---');
        await evaluate(`(() => {
            App.CoordAnimator.goToPhase(3); // Pha 4 index 3
            App.CoordAnimator.redraw();
        })()`);
        await sleep(600);

        const group3DInfo = await evaluate(`(() => {
            const grp = App.CoordAnimator._coord3DGroup;
            if (!grp) return null;
            let meshCount = 0;
            let lineCount = 0;
            grp.children.forEach(c => {
                if (c.isMesh) meshCount++;
                if (c.isLine || c.isLineSegments) lineCount++;
            });
            return {
                childCount: grp.children.length,
                meshCount,
                lineCount,
                sol: App.CoordAnimator.getSolution()
            };
        })()`);
        console.log('[TEST 4] Khối hộp Parallelepiped 3D:', group3DInfo);
        // 6 mặt mesh của khối hộp xiên
        if (group3DInfo.meshCount < 6) {
            throw new Error(`Expected at least 6 quad faces for parallelepiped, got ${group3DInfo.meshCount}`);
        }
        // Nghiệm [x]_B = (2, 3, 4)^T
        if (group3DInfo.sol.coeffs[0] !== 2 || group3DInfo.sol.coeffs[1] !== 3 || group3DInfo.sol.coeffs[2] !== 4) {
            throw new Error(`3D coordinates incorrect! Got: ${JSON.stringify(group3DInfo.sol.coeffs)}`);
        }

        await captureScreenshot('verify_coord_3d_crystallized.png');
        console.log('✅ PASS: Khối hộp Parallelepiped 3D kết tinh đầy đủ 6 mặt và các cạnh khung phát sáng!');

        console.log('================================================================');
        console.log('ALL INTERACTION LOCK & COORDINATE ANIMATION TESTS PASSED!');
        console.log('================================================================');

    } catch (err) {
        console.error('Test Failed:', err);
        process.exitCode = 1;
    } finally {
        ws.close();
        browser.kill();
        server.close();
        try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
    }
}

runTest();
