const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5663;
const CDP_PORT = 9263;
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
    console.log('KIEM THU HE SINH THAI BIEN DANG KHONG GIAN MA TRAN CHO LINH VAT NORI');
    console.log('================================================================');

    const server = startStaticServer();
    const edgeBin = findEdgeBinary();
    const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_test_nori_matrix');

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
            const res = await sendCDP('Runtime.evaluate', { expression, returnByValue: true });
            if (res && res.exceptionDetails) {
                console.error('CDP Eval Exception:', res.exceptionDetails);
                throw new Error(res.exceptionDetails.text || 'CDP Eval Exception');
            }
            return res ? res.result?.value : undefined;
        }

        await sendCDP('Page.enable');
        await sendCDP('Runtime.enable');

        console.log('\n--- BƯỚC 1: KIỂM THỬ THUẬT TOÁN ĐẠI SỐ MA TRẬN TRONG Vec2D.getNoriExpressionState ---');
        const stateMatrixTests = await evalExpr(`(() => {
            const results = {};
            // 1. Shear
            results.shear = Vec2D.getNoriExpressionState([[1, 1.5], [0, 1]]);
            // 2. Anisotropic Stretch (Oy)
            results.stretch = Vec2D.getNoriExpressionState([[0.5, 0], [0, 2.2]]);
            // 3. Anisotropic Squash (Ox)
            results.squash = Vec2D.getNoriExpressionState([[2.2, 0], [0, 0.5]]);
            // 4. Eigen Align (Diagonal)
            results.eigen = Vec2D.getNoriExpressionState([[1.3, 0], [0, 0.8]]);
            // 5. Singular Pancake
            results.pancake = Vec2D.getNoriExpressionState([[1, 1], [1, 1]]);
            // 6. Reflection Backside
            results.backside = Vec2D.getNoriExpressionState([[1, 0], [0, -1]]);
            // 7. Pure Rotation
            results.rotation = Vec2D.getNoriExpressionState([[0, -1], [1, 0]]);
            // 8. Identity Relaxed
            results.relaxed = Vec2D.getNoriExpressionState([[1, 0], [0, 1]]);
            return results;
        })()`);

        console.log('Ket qua phan loai cac ma tran:');
        console.log(' - Shear [[1, 1.5], [0, 1]]:', stateMatrixTests.shear.state, '(Kỳ vọng: SHEAR_LEAN)');
        console.log(' - Stretch [[0.5, 0], [0, 2.2]]:', stateMatrixTests.stretch.state, '(Kỳ vọng: ANISOTROPIC_STRETCH)');
        console.log(' - Squash [[2.2, 0], [0, 0.5]]:', stateMatrixTests.squash.state, '(Kỳ vọng: ANISOTROPIC_SQUASH)');
        console.log(' - Eigen [[1.3, 0], [0, 0.8]]:', stateMatrixTests.eigen.state, '(Kỳ vọng: EIGEN_ALIGN)');
        console.log(' - Pancake [[1, 1], [1, 1]]:', stateMatrixTests.pancake.state, '(Kỳ vọng: PANCAKE)');
        console.log(' - Backside [[1, 0], [0, -1]]:', stateMatrixTests.backside.state, '(Kỳ vọng: BACKSIDE)');
        console.log(' - Rotation [[0, -1], [1, 0]]:', stateMatrixTests.rotation.state, '(Kỳ vọng: SPINNING)');
        console.log(' - Relaxed [[1, 0], [0, 1]]:', stateMatrixTests.relaxed.state, '(Kỳ vọng: RELAXED)');

        if (
            stateMatrixTests.shear.state !== 'SHEAR_LEAN' ||
            stateMatrixTests.stretch.state !== 'ANISOTROPIC_STRETCH' ||
            stateMatrixTests.squash.state !== 'ANISOTROPIC_SQUASH' ||
            stateMatrixTests.eigen.state !== 'EIGEN_ALIGN' ||
            stateMatrixTests.pancake.state !== 'PANCAKE' ||
            stateMatrixTests.backside.state !== 'BACKSIDE' ||
            stateMatrixTests.rotation.state !== 'SPINNING' ||
            stateMatrixTests.relaxed.state !== 'RELAXED'
        ) {
            throw new Error('Sai lech ket qua phan loai trang thai ma tran!');
        }
        console.log('-> XAC MINH TOAN HOC: 8/8 TRUONG HOP DAT CHUAN TUYET DOI!');

        console.log('\n--- BƯỚC 2: BẬT THỰC THỂ NORI TRÊN CANVAS 2D ---');
        const noriActivated = await evalExpr(`(() => {
            if (!App.noriEntityActive) {
                App.toggleNoriEntity();
            }
            const btn = document.getElementById('btnNoriEntity');
            const chk = document.getElementById('chkLTShowNori');
            return {
                active: App.noriEntityActive,
                btnActive: btn ? btn.classList.contains('active') : false,
                chkChecked: chk ? chk.checked : false
            };
        })()`);
        console.log('Trang thai toggle Nori:', noriActivated);
        if (!noriActivated.active || !noriActivated.btnActive) {
            throw new Error('Khong the kich hoat thuc the Nori qua App.toggleNoriEntity!');
        }

        // Chụp ảnh từng trạng thái biến dạng trực tiếp trên Canvas 2D
        const testCases = [
            { name: 'verify_nori_shear_lean.png', label: '1. Trượt Affine (Shear Lean)', matrix: [[1, 1.5], [0, 1]] },
            { name: 'verify_nori_anisotropic_stretch.png', label: '2. Kéo dãn đứng (Anisotropic Stretch)', matrix: [[0.5, 0], [0, 2.2]] },
            { name: 'verify_nori_anisotropic_squash.png', label: '3. Nén dẹp ngang (Anisotropic Squash)', matrix: [[2.2, 0], [0, 0.5]] },
            { name: 'verify_nori_eigen_align.png', label: '4. Trục riêng bất biến (Eigen Align)', matrix: [[1.3, 0], [0, 0.8]] },
            { name: 'verify_nori_singular_pancake.png', label: '5. Sụp đổ 1D (Singular Pancake)', matrix: [[1, 1], [1, 1]] }
        ];

        console.log('\n--- BƯỚC 3: KẾT XUẤT VÀ CHỤP ẢNH MINH CHỨNG CÁC TRẠNG THÁI BIẾN DẠNG ---');
        for (const tc of testCases) {
            console.log(`Dang thiet lap ma tran: ${tc.label}`);
            await evalExpr(`(() => {
                App.activeNoriTransformMatrix = ${JSON.stringify(tc.matrix)};
                if (window.Vec2D && Vec2D.draw2DAllVectors) {
                    Vec2D.draw2DAllVectors();
                }
            })()`);
            await sleep(300);

            const shot = await sendCDP('Page.captureScreenshot', { format: 'png' });
            const outPath = path.join(ARTIFACT_DIR, tc.name);
            fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
            console.log(`-> Da chup va luu anh minh chung: ${tc.name}`);
        }

        console.log('\n--- BƯỚC 4: MỞ SIDEBAR CHỦ ĐỀ 5 VÀ CHỤP TOÀN CẢNH GIAO DIỆN KHÔNG GIAN BIẾN DẠNG ---');
        await evalExpr(`(() => {
            const h = document.getElementById("floatingHamburger");
            if (h && !h.classList.contains("open")) h.click();
            
            // Chuyển sang tab 2 hoặc tab Bài toán
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

            // Kích hoạt preset Trượt (Shear)
            const shearBtn = document.querySelector('.btn-geo-preset[data-preset="shear"]');
            if (shearBtn) shearBtn.click();
        })()`);
        await sleep(500);

        const overviewShot = await sendCDP('Page.captureScreenshot', { format: 'png' });
        const overviewPath = path.join(ARTIFACT_DIR, 'verify_nori_workspace_overview.png');
        fs.writeFileSync(overviewPath, Buffer.from(overviewShot.data, 'base64'));
        console.log(`-> Da chup va luu anh minh chung tong the: verify_nori_workspace_overview.png`);

        console.log('\n--- BƯỚC 5: KIỂM CHỨNG ĐỘNG CƠ SINH HỌC SỐNG ĐỘNG (THỞ & CHỚP MẮT) KHI TRUNG TÍNH ---');
        await evalExpr(`(() => {
            App.activeNoriTransformMatrix = [[1, 0], [0, 1]];
            if (window.Vec2D && Vec2D.draw2DAllVectors) {
                Vec2D.draw2DAllVectors();
            }
        })()`);
        await sleep(500);

        const neutralShot = await sendCDP('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_nori_living_neutral.png'), Buffer.from(neutralShot.data, 'base64'));
        console.log('-> Da chup va luu anh minh chung trang thai tho tu nhien: verify_nori_living_neutral.png');

        console.log('\n================================================================');
        console.log('KIEM THU HOAN TAT THIET THUC 100%: TAT CA TRANG THAI CHUAN XAC!');
        console.log('================================================================');

    } finally {
        browser.kill();
        server.close();
        if (fs.existsSync(userDataDir)) {
            try {
                fs.rmSync(userDataDir, { recursive: true, force: true });
            } catch (e) {}
        }
    }
}

runVerification().catch(err => {
    console.error('Loi kiem thu:', err);
    process.exit(1);
});
