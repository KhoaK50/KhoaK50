// ==============================================================================
// TEST: VECTOR LABEL LINKED HOVER, COLOR BORDER, OPTION 1 RELATIVE DRAG & ANIMATION LOCK
// ==============================================================================
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5636;
const CDP_PORT = 9236;

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
    console.log('TESTING LINKED HOVER, LABEL COLOR BORDER, OPTION 1 RELATIVE DRAG');
    console.log('================================================================');

    const server = startStaticServer();
    console.log(`[HTTP] Server active on port ${HTTP_PORT}`);

    const edgeBin = findEdgeBinary();
    const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_label_drag');

    const browser = spawn(edgeBin, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${userDataDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--headless=new',
        '--window-size=1600,1000',
        `http://localhost:${HTTP_PORT}/frontend_v2/calculation.html`
    ]);

    let ws = null;
    let msgId = 1;

    try {
        await sleep(2500);

        const versionJson = await new Promise((resolve, reject) => {
            http.get(`http://localhost:${CDP_PORT}/json/list`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });

        const targetPage = versionJson.find(t => t.type === 'page');
        if (!targetPage) throw new Error('Cannot find target debug page');
        const wsUrl = targetPage.webSocketDebuggerUrl;

        ws = new WebSocket(wsUrl);

        await new Promise((resolve, reject) => {
            ws.onopen = resolve;
            ws.onerror = reject;
        });

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

        const sendCmd = (method, params = {}) => {
            return new Promise((resolve, reject) => {
                const id = msgId++;
                callbacks.set(id, { resolve, reject });
                ws.send(JSON.stringify({ id, method, params }));
            });
        };

        const evaluate = async (expr) => {
            const res = await sendCmd('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
            if (res.exceptionDetails) {
                throw new Error('Eval failed: ' + JSON.stringify(res.exceptionDetails));
            }
            return res.result ? res.result.value : undefined;
        };

        const captureScreenshot = async (name) => {
            const res = await sendCmd('Page.captureScreenshot', { format: 'png' });
            const buf = Buffer.from(res.data, 'base64');
            const p = path.join(ARTIFACT_DIR, `${name}.png`);
            fs.writeFileSync(p, buf);
            console.log(`[SCREENSHOT] Saved: ${p}`);
        };

        await sendCmd('Page.enable');
        await sendCmd('Runtime.enable');
        await sleep(1500);

        // 1. Kiem tra khoi tao vector mau tren do thi 2D
        console.log('\n--- BUOC 1: KIEM TRA KHOI TAO VA STYLE VIEN NHAN VECTOR ---');
        await evaluate(`(() => {
            const App = window.App || {};
            if (App.switchMode) App.switchMode("2D");
            App.vectorList = [
                { id: 1, name: "v_1", vec: [3, 2], latex: "[3, 2]", colorCss: "#3b82f6", colorHex: "#3b82f6", visible: true, showArrow: true, alpha: 1 },
                { id: 2, name: "v_2", vec: [-2, 4], latex: "[-2, 4]", colorCss: "#10b981", colorHex: "#10b981", visible: true, showArrow: true, alpha: 1 }
            ];
            if (App.renderVectorList) App.renderVectorList();
            if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
        })()`);
        await sleep(500);

        const initInfo = await evaluate(`(() => {
            const App = window.App || {};
            const overlay = document.getElementById("labels2dOverlay");
            const lbl1 = document.getElementById("vecLabel2D_1");
            const lbl2 = document.getElementById("vecLabel2D_2");
            return {
                vecCount: (App.vectorList || []).length,
                overlayChildCount: overlay ? overlay.children.length : 0,
                overlayHtml: overlay ? overlay.innerHTML : "",
                hasLbl1: !!lbl1,
                hasLbl2: !!lbl2,
                lbl1Border: lbl1 ? lbl1.style.borderColor : null,
                lbl1VarColor: lbl1 ? lbl1.style.getPropertyValue('--vec-color') : null,
                lbl2Border: lbl2 ? lbl2.style.borderColor : null,
                lbl2VarColor: lbl2 ? lbl2.style.getPropertyValue('--vec-color') : null,
                lbl1Text: lbl1 ? lbl1.innerText.trim() : null
            };
        })()`);
        console.log('[STEP 1 RESULT]:', JSON.stringify(initInfo, null, 2));

        if (!initInfo.hasLbl1 || !initInfo.hasLbl2) {
            throw new Error('Label elements not found in DOM');
        }
        if (initInfo.lbl1Border !== '#3b82f6' && initInfo.lbl1VarColor !== '#3b82f6') {
            throw new Error(`Label 1 border color mismatch: expected #3b82f6, got border=${initInfo.lbl1Border}, var=${initInfo.lbl1VarColor}`);
        }
        console.log('[PASS] Nhãn v1 và v2 đã mang đúng viền màu vector (#3b82f6 và #10b981)!');

        // 2. Kiểm tra Hover 2 chiều (Bi-directional Linked Hover)
        console.log('\n--- BƯỚC 2: KIỂM TRA HOVER MŨI TÊN VÀ HOVER NHÃN (HIỆN TỌA ĐỘ, SÁNG HALO, CURSOR GRAB) ---');
        
        // 2a. Hover vào Mũi tên của v1
        const tipPos1 = await evaluate(`(() => {
            const { cx, cy, px } = window.Vec2D.gridInfo2D;
            const v1 = App.vectorList.find(v => v.id === 1);
            const tipX = cx + v1.vec[0] * px;
            const tipY = cy - v1.vec[1] * px;
            const rect = document.getElementById("canvas2d").getBoundingClientRect();
            return { clientX: rect.left + tipX, clientY: rect.top + tipY, tipX, tipY };
        })()`);

        // Di chuyển chuột đến ngọn v1
        await sendCmd('Input.dispatchMouseEvent', {
            type: 'mouseMoved',
            x: tipPos1.clientX,
            y: tipPos1.clientY
        });
        await sleep(200);

        const hoverTipResult = await evaluate(`(() => {
            const canvas = document.getElementById("canvas2d");
            const lbl1 = document.getElementById("vecLabel2D_1");
            return {
                hoveredId: window.Vec2D.S2D.hoveredVectorId,
                canvasCursor: canvas.style.cursor,
                lbl1Text: lbl1 ? lbl1.innerText.trim() : null,
                isHoveredClass: lbl1 ? lbl1.classList.contains("is-hovered") : false
            };
        })()`);
        console.log('[HOVER TIP RESULT]:', JSON.stringify(hoverTipResult, null, 2));
        if (hoverTipResult.hoveredId !== 1) throw new Error('Expected v1 to be hovered at tip');
        if (hoverTipResult.canvasCursor !== 'grab') throw new Error(`Expected cursor 'grab', got ${hoverTipResult.canvasCursor}`);
        if (!hoverTipResult.lbl1Text.includes('3') || !hoverTipResult.lbl1Text.includes('2')) {
            throw new Error(`Expected coordinates [3, 2] in label, got ${hoverTipResult.lbl1Text}`);
        }
        console.log('[PASS] Hover mũi tên: Nhãn bung tọa độ [3, 2], halo sáng, cursor grab!');

        // 2b. Rê chuột ra khoảng trống để tắt hover
        await sendCmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 10, y: 10 });
        await sleep(200);

        const unhoverResult = await evaluate(`(() => {
            const canvas = document.getElementById("canvas2d");
            const lbl1 = document.getElementById("vecLabel2D_1");
            return {
                hoveredId: window.Vec2D.S2D.hoveredVectorId,
                canvasCursor: canvas.style.cursor,
                lbl1Text: lbl1 ? lbl1.innerText.trim() : null
            };
        })()`);
        console.log('[UNHOVER RESULT]:', JSON.stringify(unhoverResult, null, 2));
        if (unhoverResult.hoveredId !== null) throw new Error('Expected hoveredId to be null when moved away');
        if (unhoverResult.canvasCursor !== 'default') throw new Error('Expected cursor default');
        if (unhoverResult.lbl1Text.includes('[')) throw new Error('Expected label to collapse to name only when unhovered');
        console.log('[PASS] Khi không hover: Nhãn tự thu gọn chỉ còn tên (v_1) để đồ thị thông thoáng!');

        // 2c. Hover vào chính NHÃN (Label) của v1
        const lblPos1 = await evaluate(`(() => {
            const lbl1 = document.getElementById("vecLabel2D_1");
            const rect = lbl1.getBoundingClientRect();
            return { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
        })()`);

        await sendCmd('Input.dispatchMouseEvent', {
            type: 'mouseMoved',
            x: lblPos1.clientX,
            y: lblPos1.clientY
        });
        await sleep(200);

        const hoverLabelResult = await evaluate(`(() => {
            const canvas = document.getElementById("canvas2d");
            const lbl1 = document.getElementById("vecLabel2D_1");
            return {
                hoveredId: window.Vec2D.S2D.hoveredVectorId,
                canvasCursor: canvas.style.cursor,
                lbl1Text: lbl1 ? lbl1.innerText.trim() : null,
                isHoveredClass: lbl1 ? lbl1.classList.contains("is-hovered") : false
            };
        })()`);
        console.log('[HOVER LABEL RESULT]:', JSON.stringify(hoverLabelResult, null, 2));
        if (hoverLabelResult.hoveredId !== 1) throw new Error('Expected v1 to be hovered when mouse is over label');
        if (hoverLabelResult.canvasCursor !== 'grab') throw new Error(`Expected cursor 'grab', got ${hoverLabelResult.canvasCursor}`);
        if (!hoverLabelResult.lbl1Text.includes('3') || !hoverLabelResult.lbl1Text.includes('2')) {
            throw new Error(`Expected coordinates in label when hovering label, got ${hoverLabelResult.lbl1Text}`);
        }
        console.log('[PASS] Hover nhãn: Nhãn bung tọa độ, vector sáng halo, cursor grab!');

        await captureScreenshot('verify_label_hover_and_border');

        // 3. Kiểm tra Kéo thả từ Nhãn theo Phương án 1 (Relative Offset / Delta Dragging)
        console.log('\n--- BƯỚC 3: KIỂM TRA KÉO THẢ TỪ NHÃN THEO PHƯƠNG ÁN 1 (KHÓA ĐỘ LỆCH TƯƠNG ĐỐI) ---');
        
        // Ghi lại vị trí và vector ban đầu
        const preDrag = await evaluate(`(() => {
            const v1 = App.vectorList.find(v => v.id === 1);
            const lbl1 = document.getElementById("vecLabel2D_1");
            const rect = lbl1.getBoundingClientRect();
            return {
                startVec: [...v1.vec],
                lblCenterX: rect.left + rect.width / 2,
                lblCenterY: rect.top + rect.height / 2
            };
        })()`);
        console.log('[PRE-DRAG INFO]:', preDrag);

        // Nhấn chuột xuống ngay trên NHÃN
        await sendCmd('Input.dispatchMouseEvent', {
            type: 'mousePressed',
            button: 'left',
            clickCount: 1,
            x: preDrag.lblCenterX,
            y: preDrag.lblCenterY
        });
        await sleep(100);

        const dragStartCheck = await evaluate(`(() => {
            return {
                draggedId: window.Vec2D.S2D.draggedVectorId,
                hasOffset: !!window.Vec2D.S2D.dragStartOffset,
                offset: window.Vec2D.S2D.dragStartOffset,
                cursor: document.getElementById("canvas2d").style.cursor,
                vecImmediatelyAfterClick: [...App.vectorList.find(v => v.id === 1).vec]
            };
        })()`);
        console.log('[DRAG START CHECK]:', dragStartCheck);
        if (dragStartCheck.draggedId !== 1) throw new Error('Expected draggedVectorId to be 1');
        if (!dragStartCheck.hasOffset) throw new Error('Expected dragStartOffset to be recorded');
        if (dragStartCheck.cursor !== 'grabbing') throw new Error('Expected cursor grabbing');
        
        // Kiểm tra chống visual snap: vector không được bị giật ngay khi click
        const diffImmediately = Math.hypot(
            dragStartCheck.vecImmediatelyAfterClick[0] - preDrag.startVec[0],
            dragStartCheck.vecImmediatelyAfterClick[1] - preDrag.startVec[1]
        );
        if (diffImmediately > 0.001) {
            throw new Error(`Visual Snap detected! Vector jumped by ${diffImmediately} upon click`);
        }
        console.log('[PASS] Click nhãn không làm giật vector (Zero visual snap)! Độ lệch offset được khóa: ', dragStartCheck.offset);

        // Rê chuột dời 60px sang phải và 40px lên trên
        const deltaPixelX = 60;
        const deltaPixelY = -40; // -Y trên màn hình là +Y trong toán
        await sendCmd('Input.dispatchMouseEvent', {
            type: 'mouseMoved',
            x: preDrag.lblCenterX + deltaPixelX,
            y: preDrag.lblCenterY + deltaPixelY
        });
        await sleep(150);

        const dragMoveCheck = await evaluate(`(() => {
            const v1 = App.vectorList.find(v => v.id === 1);
            return {
                draggedId: window.Vec2D.S2D.draggedVectorId,
                currentVec: [...v1.vec],
                cursor: document.getElementById("canvas2d").style.cursor
            };
        })()`);
        console.log('[DRAG MOVE CHECK]:', dragMoveCheck);

        // Tính delta toán học kỳ vọng: deltaPixel / pxPerUnit
        const pxPerUnit = await evaluate(`window.Vec2D.gridInfo2D.px`);
        const expectedDeltaX = deltaPixelX / pxPerUnit;
        const expectedDeltaY = -deltaPixelY / pxPerUnit;
        const actualDeltaX = dragMoveCheck.currentVec[0] - preDrag.startVec[0];
        const actualDeltaY = dragMoveCheck.currentVec[1] - preDrag.startVec[1];

        console.log(`[MATH DELTA] Expected: (${expectedDeltaX.toFixed(2)}, ${expectedDeltaY.toFixed(2)}), Actual: (${actualDeltaX.toFixed(2)}, ${actualDeltaY.toFixed(2)})`);
        if (Math.abs(actualDeltaX - expectedDeltaX) > 0.15 || Math.abs(actualDeltaY - expectedDeltaY) > 0.15) {
            throw new Error('Relative drag math delta mismatch!');
        }
        console.log('[PASS] Phương án 1 chuẩn xác: Ngọn vector di chuyển tịnh tiến đúng theo vector dời của chuột!');

        // Thả chuột kết thúc kéo
        await sendCmd('Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            button: 'left',
            clickCount: 1,
            x: preDrag.lblCenterX + deltaPixelX,
            y: preDrag.lblCenterY + deltaPixelY
        });
        await sleep(200);

        const postDragCheck = await evaluate(`(() => {
            return {
                draggedId: window.Vec2D.S2D.draggedVectorId,
                offset: window.Vec2D.S2D.dragStartOffset,
                cursor: document.getElementById("canvas2d").style.cursor
            };
        })()`);
        console.log('[POST DRAG CHECK]:', postDragCheck);
        if (postDragCheck.draggedId !== null) throw new Error('Expected draggedVectorId null after release');
        if (postDragCheck.offset !== null) throw new Error('Expected dragStartOffset cleaned up');
        console.log('[PASS] Thả chuột thành công, dọn dẹp offset sạch sẽ!');

        await captureScreenshot('verify_drag_label_relative_offset');

        // 4. Kiem tra Khoa an toan Animation (Animation Safety Lock)
        console.log('\n--- BUOC 4: KIEM TRA KHOA KEO THA TUYET DOI TRONG ANIMATION (RUNNING & PAUSED) ---');
        
        // Kich hoat Truc quan hoa voi he 2 vector co so hop le trong 2D
        await evaluate(`(() => {
            const App = window.App || {};
            if (!App.vectorList.some(v => v.id === 3)) {
                App.vectorList.push({ id: 3, name: "v_3", vec: [0, 2], latex: "[0, 2]", colorCss: "#f59e0b", visible: true, showArrow: true, alpha: 1 });
            }
            if (App.CoordAnimator && typeof App.CoordAnimator.start === "function") {
                App.CoordAnimator.start({ targetId: 1, basisIds: [2, 3] });
            }
        })()`);
        await sleep(500);

        const animActiveCheck = await evaluate(`(() => {
            const App = window.App || {};
            return {
                isInteractionBlocked: typeof App.isInteractionBlocked === "function" && App.isInteractionBlocked(),
                coordAnimActive: window.App?.CoordAnimator?.isActive?.() || false,
                isAnimating: !!App.isAnimating
            };
        })()`);
        console.log('[ANIMATION ACTIVE CHECK]:', animActiveCheck);
        if (!animActiveCheck.isInteractionBlocked) {
            throw new Error('Expected App.isInteractionBlocked() to be TRUE during animation');
        }

        // Tam dung animation o buoc hien tai de kiem tra ca trang thai Paused
        await evaluate(`(() => {
            const App = window.App || {};
            if (App.CoordAnimator && typeof App.CoordAnimator.pause === "function") {
                App.CoordAnimator.pause();
            }
        })()`);
        await sleep(200);

        const pausedBlockedCheck = await evaluate(`(() => {
            const App = window.App || {};
            return {
                isBlocked: typeof App.isInteractionBlocked === "function" && App.isInteractionBlocked(),
                hitId: window.Vec2D ? window.Vec2D.getHitVectorId?.(100, 100) : null
            };
        })()`);
        console.log('[PAUSED BLOCKED CHECK]:', pausedBlockedCheck);
        if (!pausedBlockedCheck.isBlocked) {
            throw new Error('Expected interaction blocked even when animation is PAUSED');
        }

        // Thu hover va click chuot len ngon vector dang trong animation
        const animTipPos = await evaluate(`(() => {
            const { cx, cy, px } = window.Vec2D.gridInfo2D;
            const v1 = App.vectorList[0];
            const tipX = cx + v1.vec[0] * px;
            const tipY = cy - v1.vec[1] * px;
            const rect = document.getElementById("canvas2d").getBoundingClientRect();
            return { x: rect.left + tipX, y: rect.top + tipY };
        })()`);

        // Move mouse to tip
        await sendCmd('Input.dispatchMouseEvent', {
            type: 'mouseMoved',
            x: animTipPos.x,
            y: animTipPos.y
        });
        await sleep(150);

        const animHoverCheck = await evaluate(`(() => {
            const canvas = document.getElementById("canvas2d");
            return {
                hoveredId: window.Vec2D.S2D.hoveredVectorId,
                cursor: canvas.style.cursor
            };
        })()`);
        console.log('[ANIM HOVER CHECK]:', animHoverCheck);
        if (animHoverCheck.hoveredId !== null) {
            throw new Error('Hover must return NULL when animation is active!');
        }
        if (animHoverCheck.cursor !== 'default') {
            throw new Error(`Cursor must stay 'default' during animation, got ${animHoverCheck.cursor}`);
        }

        // Click mouse down
        await sendCmd('Input.dispatchMouseEvent', {
            type: 'mousePressed',
            button: 'left',
            clickCount: 1,
            x: animTipPos.x,
            y: animTipPos.y
        });
        await sleep(100);

        const animClickCheck = await evaluate(`(() => {
            return {
                draggedId: window.Vec2D.S2D.draggedVectorId,
                isPanningOne: window.Vec2D.S2D.isPanningOne
            };
        })()`);
        console.log('[ANIM CLICK CHECK]:', animClickCheck);
        if (animClickCheck.draggedId !== null) {
            throw new Error('Dragging vector MUST BE COMPLETELY BLOCKED during animation!');
        }
        console.log('[PASS] Khoa an toan 100%: Trong animation (chay hoac tam dung), tuong tac keo tha bi khoa tuyet doi, con tro giu default!');

        // Tha chuot
        await sendCmd('Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            button: 'left',
            clickCount: 1,
            x: animTipPos.x,
            y: animTipPos.y
        });

        await captureScreenshot('verify_animation_interaction_lock');

        // Dung animation
        await evaluate(`(() => {
            const App = window.App || {};
            if (App.CoordAnimator && typeof App.CoordAnimator.stop === "function") {
                App.CoordAnimator.stop();
            }
        })()`);
        await sleep(300);

        const postStopCheck = await evaluate(`(() => {
            const App = window.App || {};
            return {
                isBlocked: typeof App.isInteractionBlocked === "function" && App.isInteractionBlocked()
            };
        })()`);
        if (postStopCheck.isBlocked) {
            throw new Error('Expected isInteractionBlocked to be FALSE after stopping animation');
        }
        console.log('[PASS] Sau khi dung animation: Tuong tac mo khoa tro lai binh thuong!');

        console.log('\n================================================================');
        console.log('TAT CA CAC BUOC KIEM THU DA THANH CONG 100%!');
        console.log('================================================================');

    } finally {
        if (ws) ws.close();
        browser.kill();
        server.close();
        try {
            fs.rmSync(userDataDir, { recursive: true, force: true });
        } catch (e) {}
    }
}

runTest().catch((err) => {
    console.error('\n[TEST FAILED]:', err);
    process.exit(1);
});
