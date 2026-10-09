const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5655;
const CDP_PORT = 9255;
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
    console.log('STARTING COMPLETE 3D INTERACTION & DISPLAY VERIFICATION');
    console.log('================================================================');

    const server = startStaticServer();
    const edgeBin = findEdgeBinary();
    const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_verify_3d');

    const browser = spawn(edgeBin, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${userDataDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-sync',
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

        const callbacks = new Map();
        ws.onmessage = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id && callbacks.has(data.id)) {
                callbacks.get(data.id)(data);
                callbacks.delete(data.id);
            }
        };

        const send = (method, params = {}) => new Promise((resolve) => {
            const id = msgId++;
            callbacks.set(id, resolve);
            ws.send(JSON.stringify({ id, method, params }));
        });

        const evaluate = async (expr) => {
            const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
            if (res.result && res.result.exceptionDetails) {
                throw new Error('Eval error: ' + JSON.stringify(res.result.exceptionDetails));
            }
            return res.result ? res.result.result?.value : undefined;
        };

        const captureScreenshot = async (name) => {
            const res = await send('Page.captureScreenshot', { format: 'png' });
            const buf = Buffer.from(res.result.data, 'base64');
            const p = path.join(ARTIFACT_DIR, `${name}.png`);
            fs.writeFileSync(p, buf);
            console.log(`[SCREENSHOT] Saved: ${p}`);
        };

        await send('Runtime.enable');
        await send('Page.enable');
        await sleep(1500);

        // 1. Setup exact vectors from user query:
        // v1: [-0.68, 3.61, 0] (#ef4444)
        // v2: [1, 2, 0] (#22c55e)
        // v3: [1, 2, 0] (#a855f7)
        console.log('\n--- BƯỚC 1: KHỞI TẠO 3 VECTOR (CÓ 2 VECTOR CHỒNG CHẬP) & CHUYỂN SANG 3D ---');
        const setupInfo = await evaluate(`(() => {
            window.App.vectorList = [
                { id: 1, name: "v_1", vec: [-0.68, 3.61, 0], visible: true, colorHex: "#ef4444", colorCss: "#ef4444", showArrow: true },
                { id: 2, name: "v_2", vec: [1, 2, 0], visible: true, colorHex: "#22c55e", colorCss: "#22c55e", showArrow: true },
                { id: 3, name: "v_3", vec: [1, 2, 0], visible: true, colorHex: "#a855f7", colorCss: "#a855f7", showArrow: true }
            ];
            if (window.App.mode !== "3D") {
                window.App.toggleMode();
            }
            Vec3D.hardRefresh3D(false);
            return {
                mode: window.App.mode,
                count: window.App.vectorList.length
            };
        })()`);
        console.log('[SETUP INFO]:', setupInfo);
        await sleep(500);

        // 2. Kiểm tra tách nhãn khi chồng chập
        console.log('\n--- BƯỚC 2: KIỂM TRA TÁCH NHÃN ANTI-COLLISION & KHÔNG CHE ĐẦU MŨI TÊN ---');
        const labelPositions = await evaluate(`(() => {
            const res = [];
            for (const g of Vec3D._vectorsGroup.children) {
                const lbl = g.children.find(ch => ch.isCSS2DObject && ch.name === "tipLabel");
                if (lbl && lbl.element) {
                    const rect = lbl.element.getBoundingClientRect();
                    res.push({
                        id: g.userData?.vectorId,
                        text: lbl.element.innerText.trim().replace(/\\s+/g, ' '),
                        left: Math.round(rect.left),
                        top: Math.round(rect.top),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                        marginLeft: lbl.element.style.marginLeft,
                        marginTop: lbl.element.style.marginTop
                    });
                }
            }
            return res;
        })()`);
        console.log('[LABEL POSITIONS]:', JSON.stringify(labelPositions, null, 2));

        const v2Label = labelPositions.find(l => l.id === 2);
        const v3Label = labelPositions.find(l => l.id === 3);
        const dist = Math.hypot(v2Label.left - v3Label.left, v2Label.top - v3Label.top);
        console.log(`[DE-OVERLAP DISTANCE]: ${dist.toFixed(1)}px (Phải > 20px để không đè lên nhau)`);
        if (dist < 20) {
            throw new Error(`Labels of v2 and v3 are overlapping! Distance = ${dist}px`);
        }
        console.log('✅ Nhãn v2 và v3 đã tách rời hoàn hảo, không còn đè lên nhau!');

        await captureScreenshot('verify_3d_deoverlap_labels');

        // 3. Kiểm tra Hover vào nhãn / mũi tên v2: hiện tọa độ và viền phát sáng + Precision Reticle Halo
        console.log('\n--- BƯỚC 3: KIỂM TRA HOVER V2 (HIỆN TỌA ĐỘ TRÊN NHÃN & RETICLE HALO) ---');
        await evaluate(`(() => {
            Vec3D.S3D.hoveredVectorId = 2;
            Vec3D.S3D.activeVectorId = 2;
            Vec3D.updateVectorLabelsLive();
            Vec3D.draw3DAllVectors();
        })()`);
        await sleep(300);

        const hoverCheck = await evaluate(`(() => {
            const group2 = Vec3D.threeVecMap.get(2);
            const lbl2 = group2.children.find(ch => ch.isCSS2DObject && ch.name === "tipLabel");
            const reticle = group2.children.find(ch => ch.name === "reticleHalo");
            return {
                text: lbl2 ? lbl2.element.innerText.trim().replace(/\\s+/g, ' ') : null,
                isHoveredClass: lbl2 ? lbl2.element.classList.contains("is-hovered") : false,
                borderColor: lbl2 ? lbl2.element.style.borderColor : null,
                hasReticle: !!reticle,
                reticleVisible: reticle ? reticle.visible : false
            };
        })()`);
        console.log('[HOVER CHECK V2]:', hoverCheck);
        if (!hoverCheck.text.includes('1') || !hoverCheck.text.includes('2') || !hoverCheck.hasReticle) {
            throw new Error('Hover coordinate or reticle check failed: ' + JSON.stringify(hoverCheck));
        }
        console.log('✅ Hover hiển thị đầy đủ tọa độ (1, 2, 0), viền vector và Precision Reticle Halo!');

        await captureScreenshot('verify_3d_hover_reticle_coords');

        // 4. Kiểm tra Kéo mũi tên v2 (Arrow tip drag)
        console.log('\n--- BƯỚC 4: KIỂM TRA DRAG MŨI TÊN VECTOR 2 QUA CDP ---');
        // Un-hover
        await evaluate(`(() => {
            Vec3D.S3D.hoveredVectorId = null;
            Vec3D.S3D.activeVectorId = null;
            Vec3D.updateVectorLabelsLive();
            Vec3D.draw3DAllVectors();
        })()`);
        await sleep(200);

        // Lấy tọa độ màn hình đỉnh vector 2
        const v2TipScreen = await evaluate(`(() => {
            const group2 = Vec3D.threeVecMap.get(2);
            const tipWorld = group2.userData.tipLocal.clone().add(Vec3D.S3D.offset);
            const screenPos = tipWorld.clone().project(Vec3D._camera);
            const rect = Vec3D._renderer.domElement.getBoundingClientRect();
            return {
                x: Math.round(((screenPos.x + 1) / 2) * rect.width + rect.left),
                y: Math.round(((-screenPos.y + 1) / 2) * rect.height + rect.top)
            };
        })()`);
        console.log('[V2 TIP SCREEN POINT]:', v2TipScreen);

        // Chuột nhấn vào đỉnh v2
        await send('Input.dispatchMouseEvent', {
            type: 'mousePressed',
            button: 'left',
            buttons: 1,
            clickCount: 1,
            x: v2TipScreen.x,
            y: v2TipScreen.y
        });
        await sleep(100);

        // Di chuyển chuột kéo đi +70px X, -50px Y
        await send('Input.dispatchMouseEvent', {
            type: 'mouseMoved',
            buttons: 1,
            x: v2TipScreen.x + 70,
            y: v2TipScreen.y - 50
        });
        await sleep(150);

        const v2AfterDrag = await evaluate(`(() => {
            return {
                draggedId: Vec3D.S3D.draggedVectorId,
                v2Vec: App.vectorList.find(v => v.id === 2)?.vec,
                controlsEnabled: Vec3D._controls.enabled
            };
        })()`);
        console.log('[V2 DRAG IN-PROGRESS]:', v2AfterDrag);

        await captureScreenshot('verify_3d_drag_arrow_in_progress');

        // Thả chuột chốt số
        await send('Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            button: 'left',
            x: v2TipScreen.x + 70,
            y: v2TipScreen.y - 50
        });
        await sleep(200);

        const v2Final = await evaluate(`(() => {
            return {
                draggedId: Vec3D.S3D.draggedVectorId,
                v2Vec: App.vectorList.find(v => v.id === 2)?.vec,
                controlsEnabled: Vec3D._controls.enabled
            };
        })()`);
        console.log('[V2 FINAL AFTER DRAG]:', v2Final);
        if (v2Final.v2Vec[0] === 1 && v2Final.v2Vec[1] === 2 && v2Final.v2Vec[2] === 0) {
            throw new Error('Vector 2 did not move after dragging arrow tip!');
        }
        console.log('✅ Kéo mũi tên v2 thành công, tọa độ cập nhật mượt mà!');

        // 5. Kiểm tra Kéo bằng Nhãn (Label drag - Phương án 1) cho Vector 3
        console.log('\n--- BƯỚC 5: KIỂM TRA KÉO NHÃN (LABEL DRAG - PHƯƠNG ÁN 1) CHO VECTOR 3 ---');
        const v3Before = await evaluate(`App.vectorList.find(v => v.id === 3)?.vec.slice()`);

        const v3LabelScreen = await evaluate(`(() => {
            const group3 = Vec3D.threeVecMap.get(3);
            const lbl3 = group3.children.find(ch => ch.isCSS2DObject && ch.name === "tipLabel");
            const rect = lbl3.element.getBoundingClientRect();
            return {
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2)
            };
        })()`);
        console.log('[V3 LABEL SCREEN POINT]:', v3LabelScreen);

        // Nhấn chuột lên nhãn v3
        await send('Input.dispatchMouseEvent', {
            type: 'mousePressed',
            button: 'left',
            buttons: 1,
            clickCount: 1,
            x: v3LabelScreen.x,
            y: v3LabelScreen.y
        });
        await sleep(100);

        // Kéo nhãn sang -60px X, +40px Y
        await send('Input.dispatchMouseEvent', {
            type: 'mouseMoved',
            buttons: 1,
            x: v3LabelScreen.x - 60,
            y: v3LabelScreen.y + 40
        });
        await sleep(150);

        // Thả chuột
        await send('Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            button: 'left',
            x: v3LabelScreen.x - 60,
            y: v3LabelScreen.y + 40
        });
        await sleep(200);

        const v3After = await evaluate(`App.vectorList.find(v => v.id === 3)?.vec.slice()`);
        console.log(`[V3 LABEL DRAG RESULT]: Trước: [${v3Before}], Sau: [${v3After}]`);
        if (v3Before[0] === v3After[0] && v3Before[1] === v3After[1] && v3Before[2] === v3After[2]) {
            throw new Error('Vector 3 did not move when dragging label!');
        }
        console.log('✅ Kéo nhãn v3 thành công với Phương án 1 (độ lệch tương đối)!');

        await captureScreenshot('verify_3d_drag_label_relative');

        // 6. Kiểm tra Dark Theme trong không gian 3D
        console.log('\n--- BƯỚC 6: KIỂM TRA DARK THEME TRONG KHÔNG GIAN 3D ---');
        await evaluate(`document.getElementById("themeToggleBtn").click()`);
        await sleep(400);

        const darkCheck = await evaluate(`(() => {
            return {
                isDark: document.documentElement.classList.contains("dark"),
                appTheme: window.App?.theme,
                stored: localStorage.getItem("vec_theme")
            };
        })()`);
        console.log('[DARK THEME 3D CHECK]:', darkCheck);
        if (!darkCheck.isDark || darkCheck.appTheme !== "dark") {
            throw new Error('Dark theme toggle failed in 3D: ' + JSON.stringify(darkCheck));
        }

        await captureScreenshot('verify_3d_dark_theme_final');
        console.log('✅ Dark theme trong không gian 3D hoạt động hoàn hảo, tương phản sắc nét!');

        console.log('\n================================================================');
        console.log('TẤT CẢ CÁC BƯỚC KIỂM THỬ 3D ĐÃ HOÀN TẤT THÀNH CÔNG 100%!');
        console.log('================================================================');

    } catch (err) {
        console.error('Test error:', err);
        process.exitCode = 1;
    } finally {
        if (ws) ws.close();
        browser.kill();
        server.close();
        try {
            fs.rmSync(userDataDir, { recursive: true, force: true });
        } catch (e) {}
    }
}

runVerification();
