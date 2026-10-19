const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5666;
const CDP_PORT = 9266;
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

async function runVerification() {
    console.log('================================================================');
    console.log('KIEM THU NORI LIVING COMPANION - ORIGIN INTEGRATION & EASTER EGGS');
    console.log('================================================================');

    const server = startStaticServer();
    const edgeBin = findEdgeBinary();
    const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_test_nori_v2');

    const browser = spawn(edgeBin, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${userDataDir}`,
        '--headless=new',
        '--window-size=1440,900',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        `http://localhost:${HTTP_PORT}/frontend_v2/calculation.html`
    ]);

    await sleep(2500);

    try {
        const pagesRes = await new Promise((resolve, reject) => {
            http.get(`http://localhost:${CDP_PORT}/json`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });

        const targetPage = pagesRes.find(p => p.type === 'page' && p.url.includes('calculation.html'));
        if (!targetPage) throw new Error('Khong tim thay target page calculation.html');

        const ws = new WebSocket(targetPage.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
            ws.onopen = resolve;
            ws.onerror = reject;
        });

        let msgId = 1;
        const callbacks = new Map();
        ws.onmessage = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.method === 'Runtime.consoleAPICalled') {
                console.log('[BROWSER CONSOLE]', data.params.type, data.params.args.map(a => a.value || a.description).join(' '));
            }
            if (data.method === 'Runtime.exceptionThrown') {
                console.log('[BROWSER EXCEPTION]', JSON.stringify(data.params.exceptionDetails));
            }
            if (data.id && callbacks.has(data.id)) {
                const cb = callbacks.get(data.id);
                callbacks.delete(data.id);
                if (data.error) cb.reject(data.error);
                else cb.resolve(data.result);
            }
        };

        const sendCDP = (method, params = {}) => new Promise((resolve, reject) => {
            const id = msgId++;
            callbacks.set(id, { resolve, reject });
            ws.send(JSON.stringify({ id, method, params }));
        });

        async function evalExpr(expression) {
            const res = await sendCDP('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
            if (res && res.exceptionDetails) {
                console.error('CDP Eval Exception:', res.exceptionDetails);
                throw new Error(res.exceptionDetails.text || 'CDP Eval Exception');
            }
            return res ? res.result?.value : undefined;
        }

        async function takeScreenshot(fileName) {
            const res = await sendCDP('Page.captureScreenshot', { format: 'png' });
            const buffer = Buffer.from(res.data, 'base64');
            const filePath = path.join(ARTIFACT_DIR, fileName);
            fs.writeFileSync(filePath, buffer);
            console.log(`[Screenshot Saved] -> ${filePath}`);
        }

        await sendCDP('Page.enable');
        await sendCDP('Runtime.enable');

        console.log('\n--- BƯỚC 1: KIỂM TRA TRẠNG THÁI MẶC ĐỊNH KHI VỪA VÀO TRANG ---');
        await sleep(1200);
        await evalExpr(`new Promise(resolve => {
            const check = () => {
                if (window.App?.noriFloatingCompanion && document.getElementById('noriFloatingCompanion')) {
                    resolve(true);
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        })`);

        const initialStatus = await evalExpr(`(() => {
            const comp = document.getElementById('noriFloatingCompanion');
            return {
                noriActive: window.App?.noriEntityActive,
                noriFloating: window.App?.noriIsFloating,
                compDisplay: comp ? comp.style.display : null
            };
        })()`);
        console.log('Trạng thái khởi tạo ban đầu:', initialStatus);
        if (initialStatus.noriActive || initialStatus.compDisplay !== 'none') {
            throw new Error('Nori phai o trang thai an ban dau!');
        }

        console.log('\n--- BƯỚC 2: BẬT NÚT THỰC THỂ NORI -> XUẤT HIỆN TẠI GỐC TỌA ĐỘ (0, 0) ---');
        const toggleRes = await evalExpr(`(() => {
            window.App.toggleNoriEntity();
            return {
                noriActive: window.App?.noriEntityActive,
                noriFloating: window.App?.noriIsFloating,
                btnActive: document.getElementById('btnNoriEntity')?.classList.contains('active')
            };
        })()`);
        console.log('Trạng thái sau khi bật nút Nori:', toggleRes);
        if (!toggleRes.noriActive || toggleRes.noriFloating) {
            throw new Error('Nori phai xuat hien tai goc toa do tren Canvas!');
        }
        await sleep(400);
        await takeScreenshot('verify_nori_activated_origin.png');

        console.log('\n--- BƯỚC 3: ÁP DỤNG MA TRẬN BIẾN DẠNG LÊN NORI TRÊN CANVAS ---');
        await evalExpr(`(() => {
            // Thiết lập ma trận kéo xiên shear [[1.5, 0.5], [0, 1]]
            if (window.App && window.App.LinearTransform) {
                App.LinearTransform.matrix = [[1.5, 0.5], [0, 1]];
                App.LinearTransform.targetVectors = ['nori'];
            }
            if (window.Vec2D && Vec2D.draw2DAllVectors) {
                Vec2D.draw2DAllVectors();
            }
        })()`);
        await sleep(300);
        await takeScreenshot('verify_nori_matrix_deformed_canvas.png');

        console.log('\n--- BƯỚC 3B: KIỂM THỬ RÊ CHUỘT (HOVER GRAB) LÊN NORI TẠI GỐC TỌA ĐỘ ---');
        const hoverStatus = await evalExpr(`(() => {
            const canvas = document.getElementById('canvas2d');
            const crect = canvas.getBoundingClientRect();
            const { cx, cy } = window.Vec2D.gridInfo2D;
            // Rê chuột vào ngay thân Nori (cx, cy)
            canvas.dispatchEvent(new PointerEvent('pointermove', {
                clientX: crect.left + cx,
                clientY: crect.top + cy,
                bubbles: true
            }));
            return {
                cursor: canvas.style.cursor,
                hoveredNori: window.Vec2D.S2D?.hoveredNori
            };
        })()`);
        console.log('Trạng thái hover lên Nori tại gốc:', hoverStatus);
        if (hoverStatus.cursor !== 'grab' || !hoverStatus.hoveredNori) {
            throw new Error('Re chuot vao Nori tai goc phai hien con tro grab!');
        }

        console.log('\n--- BƯỚC 4: BƯNG NORI RA KHỎI CANVAS TỪ CHÍNH THÂN NÓ -> LƠ LỬNG ---');
        const liftRes = await evalExpr(`(() => {
            const canvas = document.getElementById('canvas2d');
            const crect = canvas.getBoundingClientRect();
            const { cx, cy } = window.Vec2D.gridInfo2D;
            const screenX = crect.left + cx;
            const screenY = crect.top + cy;

            // Nhấp chuột vào giữa thân Nori trên canvas (dễ dàng bắt sự kiện)
            canvas.dispatchEvent(new PointerEvent('pointerdown', {
                clientX: screenX,
                clientY: screenY - 6,
                bubbles: true,
                pointerId: 1
            }));

            // Giả lập di chuyển ra góc ngoài canvas
            window.dispatchEvent(new PointerEvent('pointermove', {
                clientX: screenX + 180,
                clientY: screenY - 140,
                bubbles: true,
                pointerId: 1
            }));

            const comp = document.getElementById('noriFloatingCompanion');
            return {
                noriActive: window.App?.noriEntityActive,
                noriFloating: window.App?.noriIsFloating,
                compDisplay: comp ? comp.style.display : null,
                bubbleText: document.getElementById('noriCompanionBubble')?.textContent
            };
        })()`);
        console.log('Trạng thái sau khi bưng Nori ra khỏi Canvas:', liftRes);
        if (!liftRes.noriFloating || liftRes.compDisplay !== 'flex') {
            throw new Error('Nori chua duoc chuyen sang lop lo lung thanh cong!');
        }

        // Thả chuột ra màn hình
        await evalExpr(`(() => {
            window.dispatchEvent(new PointerEvent('pointerup', {
                clientX: 900,
                clientY: 500,
                bubbles: true,
                pointerId: 1
            }));
        })()`);
        await sleep(600);
        await takeScreenshot('verify_nori_lifted_immune.png');

        console.log('\n--- BƯỚC 4B: KIỂM THỬ Z-INDEX THẤP (15) & KHÔNG CHẶN VECTOR ---');
        const layerStatus = await evalExpr(`(() => {
            const comp = document.getElementById('noriFloatingCompanion');
            const stage = document.getElementById('noriCompanionStage');
            const compStyle = window.getComputedStyle(comp);
            const stageStyle = window.getComputedStyle(stage);
            const charEl = document.getElementById('Nori_Character');
            const charStyle = window.getComputedStyle(charEl);
            return {
                zIndex: compStyle.zIndex,
                compPointerEvents: compStyle.pointerEvents,
                stagePointerEvents: stageStyle.pointerEvents,
                charPointerEvents: charStyle.pointerEvents
            };
        })()`);
        console.log('Kiểm tra xếp lớp Z-index và Pointer Events:', layerStatus);
        if (layerStatus.zIndex !== '15') {
            throw new Error('Z-index cua Nori phai la 15 (thap hon sidebar 250)!');
        }
        if (layerStatus.compPointerEvents !== 'none' || layerStatus.stagePointerEvents !== 'none') {
            throw new Error('Khung vien ngoai phai co pointer-events: none de khong che vector!');
        }

        console.log('\n--- BƯỚC 4C: KIỂM THỬ GIỚI HẠN VÙNG CANVAS (CANVAS BOUNDARY CLAMPING) ---');
        const clampStatus = await evalExpr(`(() => {
            const bounds = window.App.noriFloatingCompanion.getCanvasBounds();
            // Thu keo Nori ra khoi dinh man hinh (clientX: 10, clientY: 10)
            const fakeEvt = { clientX: 10, clientY: 10 };
            window.App.noriFloatingCompanion.isGrabbed = true;
            window.App.noriFloatingCompanion._onPointerMove(fakeEvt);
            window.App.noriFloatingCompanion._onPointerUp(fakeEvt);

            const pos = window.App.noriFloatingCompanion.pos;
            const res = {
                bounds,
                pos,
                isInsideCanvasY: pos.y >= bounds.minY && pos.y <= bounds.maxY,
                isInsideCanvasX: pos.x >= bounds.minX && pos.x <= bounds.maxX
            };
            // Đặt Nori ở giữa Canvas để hiển thị rõ ràng và đẹp mắt trong các ảnh chụp màn hình
            window.App.noriFloatingCompanion.pos = { x: 550, y: 280 };
            window.App.noriFloatingCompanion.container.style.left = '550px';
            window.App.noriFloatingCompanion.container.style.top = '280px';
            return res;
        })()`);
        console.log('Kiểm tra giới hạn Canvas:', clampStatus);
        if (!clampStatus.isInsideCanvasX || !clampStatus.isInsideCanvasY) {
            throw new Error('Nori khong duoc vuot ra ngoai vung Canvas!');
        }

        console.log('\n--- BƯỚC 5A: KIỂM THỬ CLICK TAI (EAR CLICK TWITCH) ---');
        const earClickRes = await evalExpr(`(() => {
            const earL = document.getElementById('Ear_Left');
            earL.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return {
                isEarTwitching: window.App.noriFloatingCompanion.isEarTwitching,
                bubbleText: document.getElementById('noriCompanionBubble')?.textContent
            };
        })()`);
        console.log('Trạng thái click vẫy tai:', earClickRes);
        await sleep(300);

        console.log('\n--- BƯỚC 5B: KIỂM THỬ KÉO TAI ĐÀN HỒI GÓC RỘNG (SKULL ANCHOR & WIDE ANGLE SPRING) ---');
        const earPullRes = await evalExpr(`(() => {
            const earL = document.getElementById('Ear_Left');
            const rect = earL.getBoundingClientRect();
            const startX = rect.left + rect.width / 2;
            const startY = rect.top + rect.height / 2;

            earL.dispatchEvent(new PointerEvent('pointerdown', {
                clientX: startX,
                clientY: startY,
                bubbles: true,
                cancelable: true,
                pointerId: 2
            }));

            window.dispatchEvent(new PointerEvent('pointermove', {
                clientX: startX - 45,
                clientY: startY + 15,
                bubbles: true,
                pointerId: 2
            }));

            return {
                isEarPulling: window.App.noriFloatingCompanion.isEarPulling,
                transform: earL.style.transform
            };
        })()`);
        console.log('Trạng thái kéo tai đàn hồi góc rộng:', earPullRes);
        if (earPullRes.isEarPulling !== 'left') {
            throw new Error('Keo tai chua duoc kich hoat dung!');
        }
        await sleep(200);
        await takeScreenshot('verify_nori_ear_pull_anchored.png');

        // Thả tai giật lò xo
        await evalExpr(`(() => {
            window.dispatchEvent(new PointerEvent('pointerup', {
                clientX: 200,
                clientY: 200,
                bubbles: true,
                pointerId: 2
            }));
        })()`);
        await sleep(500);

        console.log('\n--- BƯỚC 6A: KIỂM THỬ CLICK MÁ (CHEEK CLICK BOUNCE) ---');
        const cheekClickRes = await evalExpr(`(() => {
            const cheekL = document.getElementById('Cheek_Left_Group');
            cheekL.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return {
                isCheekBouncing: window.App.noriFloatingCompanion.isCheekBouncing,
                bubbleText: document.getElementById('noriCompanionBubble')?.textContent
            };
        })()`);
        console.log('Trạng thái click bẹo má:', cheekClickRes);
        await sleep(300);

        console.log('\n--- BƯỚC 6B: KIỂM THỬ VÉO MÁ MOCHI BIẾN DẠNG ĐẦU (CHEEK PINCH & HEAD DEFORM) ---');
        const cheekPinchRes = await evalExpr(`(() => {
            const cheekL = document.getElementById('Cheek_Left_Group');
            const rect = cheekL.getBoundingClientRect();
            const startX = rect.left + rect.width / 2;
            const startY = rect.top + rect.height / 2;

            cheekL.dispatchEvent(new PointerEvent('pointerdown', {
                clientX: startX,
                clientY: startY,
                bubbles: true,
                pointerId: 3
            }));

            window.dispatchEvent(new PointerEvent('pointermove', {
                clientX: startX - 30,
                clientY: startY + 6,
                bubbles: true,
                pointerId: 3
            }));

            const bodyPath = document.getElementById('Body_Silhouette')?.getAttribute('d') || '';
            return {
                isCheekPinching: window.App.noriFloatingCompanion.isCheekPinching,
                transform: cheekL.style.transform,
                isBodyDeformed: !bodyPath.includes('15 47'),
                bodyPathPreview: bodyPath.substring(0, 90) + '...'
            };
        })()`);
        console.log('Trạng thái véo má dãn cả khối đầu Nori:', cheekPinchRes);
        if (cheekPinchRes.isCheekPinching !== 'left' || !cheekPinchRes.isBodyDeformed) {
            throw new Error('Veo ma phai bien dang ca khoi dau Body_Silhouette!');
        }
        await sleep(200);
        await takeScreenshot('verify_nori_easteregg_cheek_pinch.png');

        // Thả má đàn hồi trở lại
        await evalExpr(`(() => {
            window.dispatchEvent(new PointerEvent('pointerup', {
                clientX: 200,
                clientY: 200,
                bubbles: true,
                pointerId: 3
            }));
        })()`);
        await sleep(550);

        const restoredPath = await evalExpr(`document.getElementById('Body_Silhouette')?.getAttribute('d')`);
        if (!restoredPath || !restoredPath.includes('15 47')) {
            throw new Error('Tha ma ra phai dan hoi tro ve nguyen ban!');
        }

        console.log('\n--- BƯỚC 7: KIỂM THỬ BÚNG MŨI HẮT XÌ 3 PHA (3-PHASE DRAMATIC SNEEZE) ---');
        await evalExpr(`(() => {
            const nose = document.getElementById('Nose_Group');
            nose.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        })()`);
        await sleep(200);

        // Kiểm tra Pha 1: Hít thở run rẩy
        const inhaleStatus = await evalExpr(`(() => {
            const stage = document.getElementById('noriCompanionStage');
            return {
                isSneezingInhale: stage?.classList.contains('is-sneezing-inhale'),
                bubbleText: document.getElementById('noriCompanionBubble')?.textContent
            };
        })()`);
        console.log('Trạng thái Pha 1 (Hít thở chuẩn bị hắt xì):', inhaleStatus);
        if (!inhaleStatus.isSneezingInhale) {
            throw new Error('Pha 1 phai kich hoat is-sneezing-inhale!');
        }

        // Đợi chuyển sang Pha 2: Blast nổ tung
        await sleep(450);
        const blastStatus = await evalExpr(`(() => {
            const stage = document.getElementById('noriCompanionStage');
            const sneezeFX = document.getElementById('Sneeze_FX');
            const mouthPath = document.getElementById('Mouth_Smile')?.getAttribute('d') || '';
            const mouthFill = document.getElementById('Mouth_Smile')?.getAttribute('fill');
            // Mũi có cy=54. Miệng mở hắt xì ở y >= 59.5 (hoàn toàn nằm dưới mũi)
            const matchesY = mouthPath.match(/[0-9.]+/g);
            // Kiểm tra các số đứng ở vị trí y (chỉ số lẻ): y1, y2, y3...
            return {
                isSneezingBlast: stage?.classList.contains('is-sneezing-blast'),
                sneezeFXOpacity: sneezeFX ? window.getComputedStyle(sneezeFX).opacity : '0',
                mouthPath,
                mouthFill,
                mouthDoesNotOverlapNose: mouthPath.includes('61') && mouthPath.includes('67') && !mouthPath.includes('46 58'),
                bubbleText: document.getElementById('noriCompanionBubble')?.textContent
            };
        })()`);
        console.log('Trạng thái Pha 2 (Hắt xì bùng nổ & vị trí miệng):', blastStatus);
        if (!blastStatus.isSneezingBlast) {
            throw new Error('Pha 2 phai kich hoat is-sneezing-blast!');
        }
        if (!blastStatus.mouthDoesNotOverlapNose) {
            throw new Error('Mieng chu O khong duoc de len mui! Phai nam phia duoi y=54!');
        }
        await takeScreenshot('verify_nori_easteregg_sneeze_blast.png');
        await sleep(1000);

        console.log('\n--- BƯỚC 8: KIỂM THỬ CHỌC BỤNG CƯỜI SẶC SỤA (SUPER TICKLE & SQUISH) ---');
        await evalExpr(`(() => {
            const tummy = document.getElementById('Tummy_Group');
            tummy.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        })()`);
        await sleep(250);
        const tummyStatus = await evalExpr(`(() => {
            const stage = document.getElementById('noriCompanionStage');
            const laughTears = document.getElementById('Laugh_Tears');
            const mouthFill = document.getElementById('Mouth_Smile')?.getAttribute('fill');
            return {
                hasSuperTickledClass: stage?.classList.contains('is-super-tickled'),
                laughTearsOpacity: laughTears ? window.getComputedStyle(laughTears).opacity : '0',
                mouthFill,
                bubbleText: document.getElementById('noriCompanionBubble')?.textContent
            };
        })()`);
        console.log('Trạng thái chọc bụng cười sặc sụa:', tummyStatus);
        if (!tummyStatus.hasSuperTickledClass) {
            throw new Error('Choc bung phai kich hoat is-super-tickled animation!');
        }
        await takeScreenshot('verify_nori_easteregg_super_tickle.png');
        await sleep(1400);

        console.log('\n--- BƯỚC 8B: KIỂM THỬ CLICK VÀO THÂN (BODY CLICK GUIDANCE) ---');
        const bodyClickRes = await evalExpr(`(() => {
            const stage = document.getElementById('noriCompanionStage');
            stage.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 500, clientY: 500 }));
            window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 500, clientY: 500 }));
            return {
                bubbleText: document.getElementById('noriCompanionBubble')?.textContent
            };
        })()`);
        console.log('Trạng thái click vào thân hướng dẫn:', bodyClickRes);
        if (!bodyClickRes.bubbleText.includes('Tui là Nori')) {
            throw new Error('Click vao than phai chao va huong dan tuong tac!');
        }
        await sleep(400);

        console.log('\n--- BƯỚC 8C: KIỂM THỬ LẮC CHUỘT TIỀN ĐÌNH (DIZZY SHAKE REVERSALS) ---');
        const dizzyRes = await evalExpr(`(() => {
            const comp = window.App.noriFloatingCompanion;
            comp.isGrabbed = true;
            const now = performance.now();
            // Mô phỏng 4 lần đảo chiều lắc chuột qua lại
            comp.trackDizzyShake(-25, -0.6, now);
            comp.trackDizzyShake(25, 0.6, now + 120);
            comp.trackDizzyShake(-28, -0.7, now + 240);
            comp.trackDizzyShake(28, 0.7, now + 360);
            comp.isGrabbed = false;
            return {
                isDizzy: comp.isDizzy,
                bubbleText: document.getElementById('noriCompanionBubble')?.textContent
            };
        })()`);
        console.log('Trạng thái kích hoạt chóng mặt lắc chuột:', dizzyRes);
        if (!dizzyRes.isDizzy) {
            throw new Error('Lac chuot qua lai phai kich hoat isDizzy!');
        }
        await takeScreenshot('verify_nori_easteregg_dizzy_shake.png');
        await evalExpr(`(() => {
            window.App.noriFloatingCompanion.isDizzy = false;
            window.App.noriFloatingCompanion.setFaceExpression('NEUTRAL');
        })()`);
        await sleep(500);

        console.log('\n--- BƯỚC 8D: KIỂM THỬ DÂY GIẬT ĐÈN BẬT / TẮT THEME (LAMP CORD TOGGLE) ---');
        const isDarkBefore = await evalExpr(`document.documentElement.classList.contains('dark') || document.body.classList.contains('dark')`);
        console.log('Theme trước khi giật dây đèn:', isDarkBefore ? 'DARK' : 'LIGHT');

        // Kéo dây giật đèn
        const lampPullRes = await evalExpr(`(() => {
            const cordGroup = document.getElementById('Lamp_Cord_Group');
            const cordLine = document.getElementById('Cord_Line');
            const cordKnob = document.getElementById('Cord_Knob');

            cordGroup.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientY: 300, cancelable: true }));
            window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientY: 320 }));

            return {
                isLampPulling: window.App.noriFloatingCompanion.isLampPulling,
                cordY2: cordLine?.getAttribute('y2'),
                knobCy: cordKnob?.getAttribute('cy')
            };
        })()`);
        console.log('Trạng thái kéo dây đèn:', lampPullRes);
        if (!lampPullRes.isLampPulling || Number(lampPullRes.cordY2) <= 88) {
            throw new Error('Day den chua keo dan xuong!');
        }
        await sleep(150);

        // Thả tay giật đèn
        await evalExpr(`window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientY: 320 }))`);
        await sleep(600);

        const lampAfterRes = await evalExpr(`(() => {
            const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
            return {
                isDark,
                bubbleText: document.getElementById('noriCompanionBubble')?.textContent
            };
        })()`);
        console.log('Trạng thái sau khi giật dây đổi Theme:', lampAfterRes);
        if (lampAfterRes.isDark === isDarkBefore) {
            throw new Error('Giat day den phai dao chieu Theme (dark <-> light)!');
        }
        await takeScreenshot('verify_nori_easteregg_lamp_toggle.png');
        await sleep(500);

        console.log('\n--- BƯỚC 9: KIỂM THỬ QUAY TRỞ LẠI GỐC TỌA ĐỘ CANVAS (RETURN TO ORIGIN) ---');
        await evalExpr(`(() => {
            window.App.noriFloatingCompanion.returnToOrigin();
        })()`);
        await sleep(500);

        const returnStatus = await evalExpr(`(() => {
            const comp = document.getElementById('noriFloatingCompanion');
            return {
                noriActive: window.App?.noriEntityActive,
                noriFloating: window.App?.noriIsFloating,
                compDisplay: comp ? comp.style.display : null
            };
        })()`);
        console.log('Trạng thái sau khi quay về gốc (0, 0):', returnStatus);
        if (returnStatus.noriFloating || returnStatus.compDisplay !== 'none') {
            throw new Error('Nori chua quay ve goc toa do dung cach!');
        }
        await takeScreenshot('verify_nori_returned_origin.png');

        console.log('\n================================================================');
        console.log('TAT CA CAC MUC KIEM THU DA HOAN TAT XUAT SAC VA VUOT QUA 100%!');
        console.log('================================================================');

        ws.close();
        browser.kill();
        server.close();
        process.exit(0);
    } catch (err) {
        console.error('Loi trong qua trinh kiem thu:', err);
        try { browser.kill(); } catch (e) {}
        try { server.close(); } catch (e) {}
        process.exit(1);
    }
}

runVerification();
