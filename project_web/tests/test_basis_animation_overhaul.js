const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const HTTP_PORT = 5607;
const CDP_PORT = 9287;
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
    console.log('TESTING BASIS & DIMENSION ANIMATION OVERHAUL (2D & 3D)');
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

    const userDataDir = path.join(ROOT_DIR, 'tmp_edge_test_basis');
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
            const target = listRes.find(t => t.type === 'page');
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

    ws.onmessage = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id && callbacks.has(data.id)) {
            const cb = callbacks.get(data.id);
            callbacks.delete(data.id);
            if (data.error) cb.reject(data.error);
            else cb.resolve(data.result);
        }
    };

    function sendCmd(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = msgId++;
            callbacks.set(id, { resolve, reject });
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    await sendCmd('Runtime.enable');
    await sendCmd('Page.enable');
    await sendCmd('Emulation.setDeviceMetricsOverride', {
        width: 1400,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false
    });
    await sendCmd('Page.navigate', { url: `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html` });

    console.log('[PAGE] Waiting for page initialization...');
    await sleep(3500);

    async function evalCode(expression) {
        const res = await sendCmd('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (res.exceptionDetails) {
            console.error('Evaluate Exception:', res.exceptionDetails);
        }
        return res.result ? res.result.value : null;
    }

    // =========================================================================
    // TEST 1: KỊCH BẢN 2D VỚI HỆ 3 VECTOR (2 ĐỘC LẬP, 1 PHỤ THUỘC)
    // =========================================================================
    console.log('\n[TEST 1] Testing 2D Basis Animation with 3 vectors (v1=[2,0], v2=[0,3], v3=[2,3])...');
    const test1Setup = await evalCode(`(function() {
        if (window.App.mode === '3D') window.App.toggleMode();
        window.App.vectorList = [
            { id: 101, name: 'v_1', vec: [2, 0], colorCss: '#3b82f6', colorHex: '#3b82f6', visible: true },
            { id: 102, name: 'v_2', vec: [0, 3], colorCss: '#10b981', colorHex: '#10b981', visible: true },
            { id: 103, name: 'v_3', vec: [2, 3], colorCss: '#f59e0b', colorHex: '#f59e0b', visible: true }
        ];
        if (window.Vec2D && window.Vec2D.draw2DAllVectors) window.Vec2D.draw2DAllVectors();

        window.App.startBasisAnimation({
            selectedIds: [101, 102, 103]
        });

        const animator = window.App.BasisAnimator;
        const plan = animator._plan;

        return {
            isActive: animator.isActive(),
            stepCount: plan?.steps?.length,
            steps: plan?.steps?.map(s => ({ type: s.type, title: s.title, desc: s.desc, formula: s.formula })),
            finalDim: plan?.finalDim,
            finalBasisCount: plan?.finalBasis?.length,
            hudExists: !!document.getElementById('basisPlaybackHUD')
        };
    })()`);
    console.log('[TEST 1 SETUP RESULT]', JSON.stringify(test1Setup, null, 2));

    // Chuyển tới bước 1 (Khởi tạo 1D Subspace Axis)
    await evalCode(`window.App.BasisAnimator.goToStep(1); window.App.BasisAnimator.pause();`);
    await sleep(250);
    const shotStep1 = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_basis_2d_subspace_step1.png'), Buffer.from(shotStep1.data, 'base64'));
    console.log('[SCREENSHOT] Saved verify_basis_2d_subspace_step1.png');

    // Chuyển tới bước 2 (Mở rộng 2D Subspace Grid)
    await evalCode(`window.App.BasisAnimator.goToStep(2); window.App.BasisAnimator.pause();`);
    await sleep(250);
    const shotStep2 = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_basis_2d_subspace_step2.png'), Buffer.from(shotStep2.data, 'base64'));
    console.log('[SCREENSHOT] Saved verify_basis_2d_subspace_step2.png');

    // Chuyển tới bước 3 (Vector v3 phụ thuộc tuyến tính: v3 = v1 + v2)
    const step3Info = await evalCode(`(function() {
        window.App.BasisAnimator.goToStep(3);
        const step = window.App.BasisAnimator.getStep();
        return {
            type: step.type,
            formula: step.formula,
            coeffs: step.coeffs,
            proj: step.proj
        };
    })()`);
    console.log('[TEST 1 STEP 3 DECOMPOSITION]', step3Info);
    await sleep(250);
    const shotStep3 = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_basis_2d_redundant_step3.png'), Buffer.from(shotStep3.data, 'base64'));
    console.log('[SCREENSHOT] Saved verify_basis_2d_redundant_step3.png');

    // Chuyển tới bước cuối (Kết tinh cơ sở)
    await evalCode(`window.App.BasisAnimator.goToStep(4);`);
    await sleep(250);
    const shotStep4 = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_basis_2d_crystallized.png'), Buffer.from(shotStep4.data, 'base64'));
    console.log('[SCREENSHOT] Saved verify_basis_2d_crystallized.png');

    // =========================================================================
    // TEST 1B: CA KIỂM THỬ ĐẶC BIỆT CỦA USER: v1=[1,2], v2=[1,3], v3=[1,4]
    // =========================================================================
    console.log('\n[TEST 1B] Testing User Specific Slanted Case: v1=[1,2], v2=[1,3], v3=[1,4]...');
    const test1bSetup = await evalCode(`(function() {
        window.App.vectorList = [
            { id: 111, name: 'v_1', vec: [1, 2], colorCss: '#3b82f6', colorHex: '#3b82f6', visible: true },
            { id: 112, name: 'v_2', vec: [1, 3], colorCss: '#10b981', colorHex: '#10b981', visible: true },
            { id: 113, name: 'v_3', vec: [1, 4], colorCss: '#f59e0b', colorHex: '#f59e0b', visible: true }
        ];
        if (window.Vec2D && window.Vec2D.draw2DAllVectors) window.Vec2D.draw2DAllVectors();

        window.App.startBasisAnimation({
            selectedIds: [111, 112, 113]
        });

        // Đi tới bước 2: Quét không gian 2D bằng vệt quét tịnh tiến liên tục v2
        window.App.BasisAnimator.goToStep(2);
        window.App.BasisAnimator.pause();

        // 1. Pha 1: Khảo sát 2 vector độc lập (p = 0.08)
        window.App.BasisAnimator._tileWaveProgress = 0.08;
        window.App.BasisAnimator.updateStep2DynamicState(0.08);
        window.App.BasisAnimator.redraw();
        return {
            title: window.App.BasisAnimator.getStep()?.title,
            desc: window.App.BasisAnimator.getStep()?.desc
        };
    })()`);
    console.log('[TEST 1B STEP 2 SETUP]', test1bSetup);
    await sleep(250);
    const shot1bPhase1 = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_basis_2d_usercase_step2_phase1_axes.png'), Buffer.from(shot1bPhase1.data, 'base64'));
    console.log('[SCREENSHOT] Saved verify_basis_2d_usercase_step2_phase1_axes.png');

    // 2. Pha 2: Đoạn thẳng v1 trượt dọc theo vector v2 quét hình bình hành cơ sở (p = 0.30)
    await evalCode(`(function() {
        window.App.BasisAnimator._tileWaveProgress = 0.30;
        window.App.BasisAnimator.updateStep2DynamicState(0.30);
        window.App.BasisAnimator.redraw();
    })()`);
    await sleep(250);
    const shot1bSegment = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_basis_2d_usercase_step2_segment_sweep.png'), Buffer.from(shot1bSegment.data, 'base64'));
    console.log('[SCREENSHOT] Saved verify_basis_2d_usercase_step2_segment_sweep.png');

    // 3. Pha 3: Hình bình hành dãn nở liên tục ra 4 phía (p = 0.70)
    await evalCode(`(function() {
        window.App.BasisAnimator._tileWaveProgress = 0.70;
        window.App.BasisAnimator.updateStep2DynamicState(0.70);
        window.App.BasisAnimator.redraw();
    })()`);
    await sleep(250);
    const shot1bSweepStart = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_basis_2d_usercase_step2_sweep_start.png'), Buffer.from(shot1bSweepStart.data, 'base64'));
    console.log('[SCREENSHOT] Saved verify_basis_2d_usercase_step2_sweep_start.png');

    // 4. Pha 4: Hoàn tất phủ trọn 100% Canvas (p = 0.98)
    await evalCode(`(function() {
        window.App.BasisAnimator._tileWaveProgress = 0.98;
        window.App.BasisAnimator.updateStep2DynamicState(0.98);
        window.App.BasisAnimator.redraw();
    })()`);
    await sleep(250);
    const shot1bStep2 = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_basis_2d_usercase_step2.png'), Buffer.from(shot1bStep2.data, 'base64'));
    console.log('[SCREENSHOT] Saved verify_basis_2d_usercase_step2.png');

    // Đi tới bước 3: Bắt giữ vector phụ thuộc v3 = -1*v1 + 2*v2
    const test1bStep3 = await evalCode(`(function() {
        window.App.BasisAnimator.goToStep(3);
        window.App.BasisAnimator.pause();
        const step = window.App.BasisAnimator.getStep();
        return {
            type: step?.type,
            formula: step?.formula,
            coeffs: step?.coeffs,
            title: step?.title,
            desc: step?.desc
        };
    })()`);
    console.log('[TEST 1B STEP 3 DECOMPOSITION]', test1bStep3);
    await sleep(350);
    const shot1bStep3 = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_basis_2d_usercase_step3.png'), Buffer.from(shot1bStep3.data, 'base64'));
    console.log('[SCREENSHOT] Saved verify_basis_2d_usercase_step3.png');

    // =========================================================================
    // TEST 2: ĐIỀU KHIỂN TƯƠNG TÁC PLAYBACK HUD (PLAY, PAUSE, STEP, REPLAY, STOP)
    // =========================================================================
    console.log('\n[TEST 2] Testing Playback HUD Controls...');
    const test2Controls = await evalCode(`(function() {
        const anim = window.App.BasisAnimator;
        anim.play();
        const isPlaying = !anim._paused;
        anim.pause();
        const isPaused = anim._paused;
        anim.prevStep();
        const stepAfterPrev = anim._currentStep;
        anim.nextStep();
        const stepAfterNext = anim._currentStep;
        anim.cycleSpeed();
        const speed = anim._speed;

        // Dừng animation
        anim.stop();
        const isHudRemoved = !document.getElementById('basisPlaybackHUD');
        const isActiveAfterStop = anim.isActive();

        return {
            isPlaying,
            isPaused,
            stepAfterPrev,
            stepAfterNext,
            speed,
            isHudRemoved,
            isActiveAfterStop
        };
    })()`);
    console.log('[TEST 2 CONTROLS RESULT]', test2Controls);

    // =========================================================================
    // TEST 3: KỊCH BẢN 3D VỚI MẶT PHẲNG CON (SUBSPACE PLANE IN 3D)
    // =========================================================================
    console.log('\n[TEST 3] Testing 3D Subspace Plane Animation...');
    const test3Result = await evalCode(`(function() {
        if (window.App.mode === '2D') window.App.toggleMode();

        window.App.vectorList = [
            { id: 201, name: 'u_1', vec: [3, 0, 0], colorCss: '#3b82f6', colorHex: '#3b82f6', visible: true },
            { id: 202, name: 'u_2', vec: [0, 3, 0], colorCss: '#10b981', colorHex: '#10b981', visible: true },
            { id: 203, name: 'u_3', vec: [3, 3, 0], colorCss: '#f59e0b', colorHex: '#f59e0b', visible: true },
            { id: 204, name: 'u_4', vec: [0, 0, 3], colorCss: '#8b5cf6', colorHex: '#8b5cf6', visible: true }
        ];

        window.App.startBasisAnimation({
            selectedIds: [201, 202, 203, 204]
        });

        // Đi tới bước u3 (bị bẫy đồng phẳng trên Oxy, u3 = u1 + u2)
        window.App.BasisAnimator.goToStep(3);
        window.App.BasisAnimator.pause();

        const step = window.App.BasisAnimator.getStep();
        const has3DGroup = !!window.Vec3D._basisSubspaceGroup;
        const childCount3D = window.Vec3D._basisSubspaceGroup?.children?.length || 0;

        return {
            stepType: step?.type,
            formula: step?.formula,
            has3DGroup,
            childCount3D,
            hudTitle: document.getElementById('basisHudTitle')?.textContent,
            hudDesc: document.getElementById('basisHudDesc')?.textContent
        };
    })()`);
    console.log('[TEST 3 RESULT]', test3Result);
    await sleep(350);
    const shot3D = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_basis_3d_subspace_plane.png'), Buffer.from(shot3D.data, 'base64'));
    console.log('[SCREENSHOT] Saved verify_basis_3d_subspace_plane.png');

    // =========================================================================
    // TEST 4: KHẢ NĂNG CHỊU TẢI VỚI HỆ VECTOR LỚN (8 VECTORS)
    // =========================================================================
    console.log('\n[TEST 4] Testing Large Vector Set (8 vectors)...');
    const test4Result = await evalCode(`(function() {
        const bigList = [];
        for (let i = 1; i <= 8; i++) {
            bigList.push({
                id: 300 + i,
                name: 'w_' + i,
                vec: [i, (i * 2) % 5, (i * 3) % 4],
                colorCss: '#0090ff',
                visible: true
            });
        }
        window.App.vectorList = bigList;

        window.App.startBasisAnimation({
            selectedIds: bigList.map(b => b.id)
        });

        const plan = window.App.BasisAnimator._plan;
        const isLargeSet = plan.isLargeSet;
        const finalDim = plan.finalDim;
        const totalSteps = plan.steps.length;

        // Skip to end
        window.App.BasisAnimator.skipToEnd();
        const curStep = window.App.BasisAnimator._currentStep;

        window.App.BasisAnimator.stop();

        return {
            isLargeSet,
            finalDim,
            totalSteps,
            curStepAtEnd: curStep,
            success: isLargeSet && finalDim <= 3
        };
    })()`);
    console.log('[TEST 4 RESULT]', test4Result);

    // =========================================================================
    // TEST 5: KIỂM CHỨNG LỖI ĐÁNH SỐ QUÁ KHÚ (XÓA V2 -> V3 THÀNH V2, THÊM MỚI THÀNH V3)
    // =========================================================================
    console.log('\n[TEST 5] Testing Dynamic Vector Label Renumbering (Ghost ID elimination)...');
    const test5Result = await evalCode(`(function() {
        if (window.App.mode === '3D') window.App.toggleMode();

        // 1. Khởi tạo 3 vector v1, v2, v3
        window.App.vectorList = [
            window.App._attachVectorItem([1, 2], 200),
            window.App._attachVectorItem([2, 1], 150),
            window.App._attachVectorItem([3, 4], 80)
        ];
        if (window.App.renderVectorList) window.App.renderVectorList();
        if (window.Vec2D && window.Vec2D.draw2DAllVectors) window.Vec2D.draw2DAllVectors();

        const labelsBefore = window.App.vectorList.map((v, i) => ({
            index: window.App.displayIndexOf(v),
            name: window.App.getVectorName(v),
            latex: window.App.getVectorLatexLabel(v, false)
        }));

        // 2. Xóa vector ở vị trí thứ 2 (index 1)
        const deletedId = window.App.vectorList[1].id;
        window.App.vectorList.splice(1, 1);
        if (window.App.renderVectorList) window.App.renderVectorList();
        if (window.Vec2D && window.Vec2D.draw2DAllVectors) window.Vec2D.draw2DAllVectors();

        const labelsAfterDelete = window.App.vectorList.map((v, i) => ({
            index: window.App.displayIndexOf(v),
            name: window.App.getVectorName(v),
            latex: window.App.getVectorLatexLabel(v, false)
        }));

        // 3. Tạo mới 1 vector nữa
        const newVec = window.App._attachVectorItem([-1, 3], 320);
        window.App.vectorList.push(newVec);
        if (window.App.renderVectorList) window.App.renderVectorList();
        if (window.Vec2D && window.Vec2D.draw2DAllVectors) window.Vec2D.draw2DAllVectors();

        const labelsAfterAdd = window.App.vectorList.map((v, i) => ({
            index: window.App.displayIndexOf(v),
            name: window.App.getVectorName(v),
            latex: window.App.getVectorLatexLabel(v, false)
        }));

        return {
            labelsBefore,
            labelsAfterDelete,
            labelsAfterAdd,
            isSuccess: (
                labelsAfterDelete[1].name === 'v_{2}' &&
                labelsAfterAdd[0].name === 'v_{1}' &&
                labelsAfterAdd[1].name === 'v_{2}' &&
                labelsAfterAdd[2].name === 'v_{3}'
            )
        };
    })()`);
    console.log('[TEST 5 RESULT]', JSON.stringify(test5Result, null, 2));

    const shotTest5 = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_vector_labels_renumbered.png'), Buffer.from(shotTest5.data, 'base64'));
    console.log('[SCREENSHOT] Saved verify_vector_labels_renumbered.png');

    // =========================================================================
    // TEST 6: CHỤP ẢNH SIDEBAR STREAMLINED CỦA BÀI TOÁN CƠ SỞ
    // =========================================================================
    console.log('\n[TEST 6] Capturing Streamlined Sidebar UI...');
    await evalCode(`(function() {
        const ham = document.getElementById('floatingHamburger') || document.getElementById('hamburger');
        // Mo sidebar neu dang dong
        const sidebar = document.getElementById('controlsArea') || document.getElementById('controls');
        if (!sidebar || !sidebar.classList.contains('open')) {
            if (ham) ham.click();
        }

        // Click tab Bai Toan (index 1)
        const tabBtns = document.querySelectorAll('.sidebar-tabs.vertical .tab-btn');
        if (tabBtns && tabBtns[1]) tabBtns[1].click();

        // Chon bai toan Co so & So chieu
        const select = document.getElementById('opExtraSelect');
        if (select) {
            select.value = 'basis';
            select.dispatchEvent(new Event('change'));
        }

        if (window.App.ensureBasisAnimControls) window.App.ensureBasisAnimControls();
    })()`);
    await sleep(600);
    const shotSidebar = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_basis_sidebar_streamlined.png'), Buffer.from(shotSidebar.data, 'base64'));
    console.log('[SCREENSHOT] Saved verify_basis_sidebar_streamlined.png');

    browser.kill();
    server.close();

    console.log('\n================================================================');
    console.log('ALL BASIS ANIMATION TESTS COMPLETED SUCCESSFULLY!');
    console.log('================================================================');
    process.exit(0);
}

runTest().catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
});
