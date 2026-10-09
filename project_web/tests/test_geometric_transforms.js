const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5656;
const CDP_PORT = 9256;
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

async function testGeometricTransforms() {
    console.log('================================================================');
    console.log('TESTING GEOMETRIC TRANSFORMATION PRESETS & DET MEANING');
    console.log('================================================================');

    const server = startStaticServer();
    const edgeBin = findEdgeBinary();
    const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_test_geo');

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

        // 1. Chuyển sang Chủ đề 5: topic5_linear_transformation
        console.log('\n--- BƯỚC 1: CHỌN CHỦ ĐỀ 5 (ÁNH XẠ TUYẾN TÍNH & MA TRẬN) ---');
        await evaluate(`(() => {
            const h = document.getElementById("floatingHamburger");
            if (h && !h.classList.contains("open")) h.click();
            
            // Chuyển sang tab Bài toán (nút thứ 2 trong vertical activity bar)
            const tabBtns = document.querySelectorAll(".sidebar-tabs.vertical .tab-btn");
            if (tabBtns && tabBtns[1]) tabBtns[1].click();

            const sel = document.getElementById("opExtraSelect");
            if (sel) {
                sel.value = "topic5_linear_transformation";
                sel.dispatchEvent(new Event("change"));
            }
            if (window.App && App.TopicModules && App.TopicModules.t5) {
                App.TopicModules.t5.onTaskSelect("topic5_linear_transformation");
            }
        })()`);
        await sleep(500);

        // 2. Kiểm tra Phép quay góc θ
        console.log('\n--- BƯỚC 2: KIỂM TRA PHÉP QUAY GÓC θ (ROTATION) ---');
        const rotTest = await evaluate(`(() => {
            const btnRot = document.querySelector('button[data-preset="rotation"]');
            if (btnRot) btnRot.click();
            
            const slider = document.getElementById("lt_rot_slider");
            if (slider) {
                slider.value = 45;
                slider.dispatchEvent(new Event("input"));
            }

            const a11 = parseFloat(document.getElementById("lt_a11").value);
            const a12 = parseFloat(document.getElementById("lt_a12").value);
            const a21 = parseFloat(document.getElementById("lt_a21").value);
            const a22 = parseFloat(document.getElementById("lt_a22").value);
            const infoText = document.getElementById("result_lt_info")?.innerText || "";

            return {
                matrix: [[a11, a12], [a21, a22]],
                infoText,
                rotCtrlDisplay: document.getElementById("lt_rotation_ctrl")?.style.display
            };
        })()`);
        console.log('[ROTATION TEST 45 DEG]:', JSON.stringify(rotTest, null, 2));

        if (Math.abs(rotTest.matrix[0][0] - 0.707) > 0.02 || !rotTest.infoText.includes("Bảo toàn hướng không gian")) {
            throw new Error("Rotation test failed: " + JSON.stringify(rotTest));
        }
        console.log('✅ Phép quay góc 45° thành công: ma trận cập nhật chuẩn lượng giác và det(A) > 0 báo bảo toàn hướng!');
        await captureScreenshot('verify_geo_rotation_45deg');

        // 3. Kiểm tra Phép đối xứng / Lật qua Ox (Reflection)
        console.log('\n--- BƯỚC 3: KIỂM TRA PHÉP ĐỐI XỨNG / LẬT QUA Ox (REFLECTION) ---');
        const reflectTest = await evaluate(`(() => {
            const btnReflect = document.querySelector('button[data-preset="reflectX"]');
            if (btnReflect) btnReflect.click();

            const a11 = parseFloat(document.getElementById("lt_a11").value);
            const a12 = parseFloat(document.getElementById("lt_a12").value);
            const a21 = parseFloat(document.getElementById("lt_a21").value);
            const a22 = parseFloat(document.getElementById("lt_a22").value);
            const infoText = document.getElementById("result_lt_info")?.innerText || "";

            return {
                matrix: [[a11, a12], [a21, a22]],
                infoText
            };
        })()`);
        console.log('[REFLECTION TEST Ox]:', JSON.stringify(reflectTest, null, 2));

        if (reflectTest.matrix[0][0] !== 1 || reflectTest.matrix[1][1] !== -1 || !reflectTest.infoText.includes("Đảo hướng không gian")) {
            throw new Error("Reflection test failed: " + JSON.stringify(reflectTest));
        }
        console.log('✅ Phép đối xứng qua Ox thành công: det(A) = -1 báo đảo hướng không gian (lật đối xứng)!');
        await captureScreenshot('verify_geo_reflection_ox');

        // 4. Kiểm tra Ma trận suy biến (det = 0)
        console.log('\n--- BƯỚC 4: KIỂM TRA MA TRẬN SUY BIẾN (det = 0) ---');
        const singularTest = await evaluate(`(() => {
            document.getElementById("lt_a11").value = "1";
            document.getElementById("lt_a12").value = "1";
            document.getElementById("lt_a21").value = "1";
            document.getElementById("lt_a22").value = "1";
            
            document.getElementById("lt_a11").dispatchEvent(new Event("input"));
            document.getElementById("btnLTInspect").click();

            const infoText = document.getElementById("result_lt_info")?.innerText || "";
            return {
                infoText,
                customActive: document.querySelector('button[data-preset="custom"]')?.classList.contains("active")
            };
        })()`);
        console.log('[SINGULAR MATRIX TEST]:', JSON.stringify(singularTest, null, 2));

        if (!singularTest.infoText.includes("Ma trận suy biến") || !singularTest.customActive) {
            throw new Error("Singular matrix test failed: " + JSON.stringify(singularTest));
        }
        console.log('✅ Ma trận suy biến det = 0 báo chính xác: Không gian bị ép xẹp thành 1 chiều!');
        await captureScreenshot('verify_geo_singular_det0');

        console.log('\n================================================================');
        console.log('TẤT CẢ KIỂM THỬ PHÉP BIẾN ĐỔI HÌNH HỌC ĐÃ VƯỢT QUA 100%!');
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

testGeometricTransforms();
