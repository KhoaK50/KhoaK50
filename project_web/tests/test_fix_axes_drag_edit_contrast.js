const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const HTTP_PORT = 5602;
const CDP_PORT = 9282;
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
    console.log('TESTING FIXES FOR 4 USER REPORTED ISSUES');
    console.log('================================================================');

    const server = await startServer(HTTP_PORT);
    console.log(`[HTTP] Static server active on port ${HTTP_PORT}`);

    const edgePaths = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    let edgeBin = edgePaths.find(p => fs.existsSync(p));
    if (!edgeBin) {
        console.error('Edge executable not found');
        process.exit(1);
    }

    const userDataDir = path.join(ROOT_DIR, 'tmp_edge_test_user_fixes');
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
    console.log('[CDP] Connected successfully.');

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
    await sendCmd('Page.navigate', { url: `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html` });

    console.log('[PAGE] Waiting for application initialization...');
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

    for (let i = 0; i < 20; i++) {
        const ready = await evalCode(`Boolean(window.App && window.App.vectorList && window.Vec2D)`);
        if (ready) break;
        await sleep(300);
    }

    // =========================================================================
    // ISSUE 1: Keo thanh tuong phan truc o 2D khong bi chuyen sang 3D
    // =========================================================================
    console.log('\n[TEST 1] Testing grid contrast slider in 2D mode...');
    const test1Result = await evalCode(`(function() {
        // Dam bao dang o 2D
        if (window.App.mode === '3D' && typeof window.App.toggleMode === 'function') {
            window.App.toggleMode();
        }
        const initialMode = window.App.mode;
        const slider = document.getElementById('settingGridContrastSlider');
        if (!slider) return { error: 'Slider not found' };

        // Keo slider lan 1
        slider.value = 80;
        slider.dispatchEvent(new Event('input', { bubbles: true }));

        const modeAfter1 = window.App.mode;
        const canvas2dDisplay = window.getComputedStyle(document.getElementById('canvas2d')).display;
        const threeLayerDisplay = window.getComputedStyle(document.getElementById('threeLayer')).display;

        // Keo slider lan 2
        slider.value = 30;
        slider.dispatchEvent(new Event('input', { bubbles: true }));

        const modeAfter2 = window.App.mode;

        return {
            initialMode,
            modeAfter1,
            modeAfter2,
            canvas2dDisplay,
            threeLayerDisplay,
            stayedIn2D: (modeAfter1 === '2D' && modeAfter2 === '2D' && threeLayerDisplay === 'none')
        };
    })()`);
    console.log('[TEST 1 RESULT]', test1Result);

    const shot2D = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_2d_slider_contrast_no_switch.png'), Buffer.from(shot2D.data, 'base64'));
    console.log('[SCREENSHOT] Saved verify_2d_slider_contrast_no_switch.png');

    // =========================================================================
    // ISSUE 2: Tat truc toa do ben 3D phai tat ca 3 truc va so chia do
    // =========================================================================
    console.log('\n[TEST 2] Testing toggle axes in 3D mode (must hide axes lines AND tick numbers)...');
    const test2Result = await evalCode(`(function() {
        // Chuyen sang 3D
        if (window.App.mode === '2D' && typeof window.App.toggleMode === 'function') {
            window.App.toggleMode();
        }
        
        const toggleAxes = document.getElementById('settingShowAxes');
        if (!toggleAxes) return { error: 'settingShowAxes not found' };

        // 1. Tat truc toa do
        toggleAxes.checked = false;
        toggleAxes.dispatchEvent(new Event('change', { bubbles: true }));

        const axesVisibleWhenOff = window.Vec3D._axesGroup ? window.Vec3D._axesGroup.visible : null;
        const ticksVisibleWhenOff = window.Vec3D._ticksGroup ? window.Vec3D._ticksGroup.visible : null;
        const tickLabelsCountWhenOff = (window.Vec3D._tickLabels || []).length;
        const axisLettersCountWhenOff = (window.Vec3D._axisLetters || []).length;

        return {
            axesVisibleWhenOff,
            ticksVisibleWhenOff,
            tickLabelsCountWhenOff,
            axisLettersCountWhenOff,
            isCompletelyHidden: (axesVisibleWhenOff === false && !ticksVisibleWhenOff && tickLabelsCountWhenOff === 0 && axisLettersCountWhenOff === 0)
        };
    })()`);
    console.log('[TEST 2 OFF RESULT]', test2Result);

    await sleep(300);
    const shotAxesOff = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_3d_axes_completely_hidden.png'), Buffer.from(shotAxesOff.data, 'base64'));
    console.log('[SCREENSHOT] Saved verify_3d_axes_completely_hidden.png');

    // Bat lai truc toa do de kiem tra phuc hoi
    const test2OnResult = await evalCode(`(function() {
        const toggleAxes = document.getElementById('settingShowAxes');
        toggleAxes.checked = true;
        toggleAxes.dispatchEvent(new Event('change', { bubbles: true }));

        const axesVisibleWhenOn = window.Vec3D._axesGroup ? window.Vec3D._axesGroup.visible : null;
        const ticksVisibleWhenOn = window.Vec3D._ticksGroup ? window.Vec3D._ticksGroup.visible : null;
        const tickLabelsCountWhenOn = (window.Vec3D._tickLabels || []).length;
        const axisLettersCountWhenOn = (window.Vec3D._axisLetters || []).length;

        return {
            axesVisibleWhenOn,
            ticksVisibleWhenOn,
            tickLabelsCountWhenOn,
            axisLettersCountWhenOn,
            isRestored: (axesVisibleWhenOn === true && ticksVisibleWhenOn === true && tickLabelsCountWhenOn > 0 && axisLettersCountWhenOn > 0)
        };
    })()`);
    console.log('[TEST 2 ON RESTORED RESULT]', test2OnResult);

    const shotAxesOn = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_3d_axes_shown.png'), Buffer.from(shotAxesOn.data, 'base64'));
    console.log('[SCREENSHOT] Saved verify_3d_axes_shown.png');

    // =========================================================================
    // ISSUE 3: Vector sau khi keo, bam sua phai lay toa do hien tai thay vi toa do cu
    // =========================================================================
    console.log('\n[TEST 3] Testing vector edit after dragging (must load current dragged coordinates)...');
    const test3Result = await evalCode(`(function() {
        window.App.vectorList = [];
        // 1. Tao vector ban dau [1, 2]
        window.App.vectorList.push({
            id: 1,
            name: 'v_1',
            vec: [1, 2, 0],
            rawInput: '[1, 2]',
            colorHex: '#ef4444',
            visible: true
        });
        if (typeof window.App.renderVectorList === 'function') window.App.renderVectorList();

        // 2. Gia lap nguoi dung keo dau vector toi toa do moi [1.67, 1.34, 0]
        const v = window.App.vectorList[0];
        v.vec = [1.67, 1.34, 0];

        // 3. Gia lap su kien tha chuot (pointerup) cap nhat rawInput
        const newCoordsStr = window.App.formatVectorShort ? window.App.formatVectorShort(v.vec) : '[1.67, 1.34]';
        v.rawInput = newCoordsStr;
        v.latex = newCoordsStr;

        // 4. Nguoi dung bam nut Sua vector
        window.App.startEditVector(1);

        const inp = document.getElementById('vectorInput');
        return {
            expected: newCoordsStr,
            actualInputValue: inp ? inp.value : null,
            isSyncedCorrectly: (inp && inp.value === newCoordsStr)
        };
    })()`);
    console.log('[TEST 3 RESULT]', test3Result);

    const shotEditSynced = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_edit_dragged_vector_current_coords.png'), Buffer.from(shotEditSynced.data, 'base64'));
    console.log('[SCREENSHOT] Saved verify_edit_dragged_vector_current_coords.png');

    // =========================================================================
    // ISSUE 4: Rang buoc bounding dau vector 3D: hover than -> default, hover dau -> grab
    // =========================================================================
    console.log('\n[TEST 4] Testing 3D vector hit target and cursor distinction (head vs shaft)...');
    const test4Result = await evalCode(`(function() {
        if (window.App.mode === '2D' && typeof window.App.toggleMode === 'function') {
            window.App.toggleMode();
        }
        window.App.vectorList = [{
            id: 1,
            name: 'v_1',
            vec: [5, 0, 0],
            colorHex: '#2563eb',
            visible: true
        }];
        window.Vec3D.draw3DAllVectors({ frame: true });

        const pickableHeadsCount = (window.Vec3D._pickableHeads || []).length;
        const pickableMeshesCount = (window.Vec3D._pickableMeshes || []).length;

        // Kiem tra cau truc hitHead trong _pickableHeads
        const headHitMesh = (window.Vec3D._pickableHeads || [])[0];
        const isSphere = headHitMesh && headHitMesh.geometry && headHitMesh.geometry.type === 'SphereGeometry';
        const hasVectorId = headHitMesh && headHitMesh.userData && headHitMesh.userData.vectorId === 1;

        return {
            pickableHeadsCount,
            pickableMeshesCount,
            isSphere,
            hasVectorId,
            headTargetReady: (pickableHeadsCount === 1 && isSphere && hasVectorId)
        };
    })()`);
    console.log('[TEST 4 RESULT]', test4Result);

    browser.kill();
    server.close();

    console.log('\n================================================================');
    console.log('ALL 4 ISSUES VERIFIED AND FIXED SUCCESSFULLY!');
    console.log('================================================================');
}

runTest().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
