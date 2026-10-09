const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5666;
const CDP_PORT = 9266;
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/frontend_v2/calculation.html';
    const filePath = path.join(PROJECT_ROOT, reqPath.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json',
        '.png': 'image/png'
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
}).listen(HTTP_PORT);

const edgeBin = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_master_param_test');

(async () => {
    console.log('================================================================');
    console.log('KIEM THU HE THONG DIEU KHIEN THAM SO TONG (MASTER PARAM CONTROLLER)');
    console.log('================================================================');

    const browser = spawn(edgeBin, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${userDataDir}`,
        '--headless=new',
        '--window-size=1440,900',
        '--disable-gpu',
        `http://localhost:${HTTP_PORT}/frontend_v2/calculation.html`
    ]);
    await sleep(2500);

    try {
        const pagesRes = await new Promise((resolve, reject) => {
            http.get(`http://localhost:${CDP_PORT}/json`, (res) => {
                let data = ''; res.on('data', c => data += c); res.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });
        const targetPage = pagesRes.find(p => p.url.includes('calculation.html'));
        if (!targetPage) throw new Error('Khong tim thay target page calculation.html');

        const ws = new WebSocket(targetPage.webSocketDebuggerUrl);
        await new Promise(r => ws.onopen = r);

        let msgId = 1;
        const callbacks = new Map();
        ws.onmessage = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id && callbacks.has(data.id)) {
                callbacks.get(data.id).resolve(data.result);
                callbacks.delete(data.id);
            }
        };
        const sendCDP = (method, params = {}) => new Promise(resolve => {
            const id = msgId++;
            callbacks.set(id, { resolve });
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

        await sendCDP('Runtime.enable');
        await sendCDP('Page.enable');

        console.log('\n--- BƯỚC 1: KIỂM TRA TRẠNG THÁI BAN ĐẦU KHI CHƯA CÓ THAM SỐ ---');
        const initialStatus = await evalExpr(`(() => {
            const bar = document.getElementById("masterParamBar");
            return {
                hasBar: !!bar,
                display: bar ? getComputedStyle(bar).display : null,
                hasParams: App.MasterParamController ? App.MasterParamController.hasParametricItems() : null
            };
        })()`);
        console.log('Trang thai ban dau:', initialStatus);
        if (initialStatus.display !== "none") {
            throw new Error('MasterParamBar khong duoc an khi chua co tham so!');
        }
        console.log('-> DAT: MasterParamBar tu dong an khi chua co vector/ma tran tham so.');

        console.log('\n--- BƯỚC 2: TẠO 2 VECTOR THAM SỐ VÀ 1 MA TRẬN THAM SỐ ---');
        const createResult = await evalExpr(`(() => {
            // Vector 1: [t, 2t]
            document.getElementById("vectorInput").value = "[t, 2*t]";
            App.onAddVector();

            // Vector 2: [m, 3]
            document.getElementById("vectorInput").value = "[m, 3]";
            App.onAddVector();

            // Ma tran M1: [[t, 0], [0, m]]
            const m1Data = {
                id: 1,
                name: "M1",
                isParametric: true,
                vars: ["t", "m"],
                paramVar: "t",
                scopeValues: { t: 1.0, m: 1.0 }
            };
            const m1 = {
                id: 1,
                name: "M1",
                rows: 2,
                cols: 2,
                values: [[1, 0], [0, 1]],
                latexValues: [["t", "0"], ["0", "m"]],
                colorCss: "hsl(220, 70%, 55%)",
                isParametric: true,
                vars: ["t", "m"],
                paramVar: "t",
                activeAnimVars: ["t", "m"],
                scopeValues: { t: 1.0, m: 1.0 },
                varRanges: { t: { min: -10, max: 10 }, m: { min: -5, max: 5 } },
                paramVal: 1.0,
                initialParamVal: 1.0,
                duration: 4.0,
                isAnimating: false,
                evalMatrix: function(val, sc) {
                    const tv = sc && sc.t !== undefined ? sc.t : 1;
                    const mv = sc && sc.m !== undefined ? sc.m : 1;
                    return [[tv, 0], [0, mv]];
                }
            };
            App.matrixList.push(m1);

            App.renderVectorList();
            App.renderMatrixList();

            const bar = document.getElementById("masterParamBar");
            return {
                display: bar ? getComputedStyle(bar).display : null,
                totalParams: App.MasterParamController.getAllParametricItems().total,
                hasParams: App.MasterParamController.hasParametricItems()
            };
        })()`);
        console.log('Sau khi them doi tuong tham so:', createResult);
        if (createResult.display === "none" || createResult.totalParams !== 3) {
            throw new Error('MasterParamBar khong tu dong xuat hien sau khi co tham so!');
        }
        console.log('-> DAT: MasterParamBar tu dong hien thi voi 3 doi tuong tham so.');

        console.log('\n--- BƯỚC 3: KIỂM THỬ NÚT MASTER PLAY Ở CHẾ ĐỘ OFFSET (ĐỘC LẬP) ---');
        const playResult = await evalExpr(`(() => {
            const btn = document.getElementById("btnMasterParamPlay");
            btn.click(); // Kich hoat Master Play

            const items = App.MasterParamController.getAllParametricItems();
            return {
                isPlaying: App.MasterParamController.isPlaying,
                v1Anim: items.vectors[0].isAnimating,
                v2Anim: items.vectors[1].isAnimating,
                m1Anim: items.matrices[0].isAnimating,
                btnText: btn.textContent.trim(),
                btnActive: btn.classList.contains("is-active")
            };
        })()`);
        console.log('Ket qua Master Play:', playResult);
        if (!playResult.isPlaying || !playResult.v1Anim || !playResult.v2Anim || !playResult.m1Anim || !playResult.btnActive) {
            throw new Error('Master Play khong dong loat kich hoat tat ca cac doi tuong!');
        }
        console.log('-> DAT: Master Play da kich hoat dong thoi ca 2 vector va 1 ma tran tham so.');

        console.log('\n--- BƯỚC 4: KIỂM THỬ CHẾ ĐỘ KHÓA BIẾN CÙNG TÊN (LINK SHARED NAMES) ---');
        const linkResult = await evalExpr(`(() => {
            // Chuyen sang che do link_names
            const linkChip = document.querySelector('.master-mode-chip[data-mode="link_names"]');
            if (linkChip) linkChip.click();

            // Dat gia tri t = 3.5 tren Vector 1
            App.setVectorParamValue(App.vectorList[0].id, 3.5);

            // Kiem tra Ma tran M1 va Vector 1
            const v1Val = App.vectorList[0].paramVal;
            const m1Val = App.matrixList[0].scopeValues.t;
            const m1Values = App.matrixList[0].values;

            return {
                mode: App.MasterParamController.syncMode,
                v1Val,
                m1Val,
                m1Values,
                chipActive: linkChip.classList.contains("active")
            };
        })()`);
        console.log('Ket qua che do link_names:', linkResult);
        if (linkResult.v1Val !== 3.5 || linkResult.m1Val !== 3.5 || linkResult.m1Values[0][0] !== 3.5) {
            throw new Error('Che do link_names khong dong bo gia tri bien t giua Vector va Ma tran!');
        }
        console.log('-> DAT: Bien t = 3.5 da duoc dong bo tuyet doi giua Vector 1 va Ma tran M1.');

        console.log('\n--- BƯỚC 5: KIỂM THỬ ĐẶT LẠI TẤT CẢ (RESET ALL) ---');
        const resetResult = await evalExpr(`(() => {
            const resetBtn = document.getElementById("btnMasterParamReset");
            resetBtn.click();

            const items = App.MasterParamController.getAllParametricItems();
            return {
                isPlaying: App.MasterParamController.isPlaying,
                v1Anim: items.vectors[0].isAnimating,
                v2Anim: items.vectors[1].isAnimating,
                m1Anim: items.matrices[0].isAnimating,
                v1Val: items.vectors[0].paramVal,
                m1Val: items.matrices[0].paramVal
            };
        })()`);
        console.log('Ket qua Reset All:', resetResult);
        if (resetResult.isPlaying || resetResult.v1Anim || resetResult.m1Anim || resetResult.v1Val !== 1.0) {
            throw new Error('Reset All khong dua toan bo tham so ve trang thai ban dau!');
        }
        console.log('-> DAT: Toan bo tham so va trang thai hoat anh da duoc dat lai ve mac dinh.');

        console.log('\n--- BƯỚC 6: CHỤP ẢNH MINH CHỨNG GIAO DIỆN MASTER PARAMETER CONTROLLER ---');
        // Mo sidebar va kich hoat Master Play de chup frame dang hoat dong dep mat
        await evalExpr(`(() => {
            const h = document.getElementById("floatingHamburger");
            if (h && !h.classList.contains("open")) h.click();
            document.getElementById("btnMasterParamPlay").click();
        })()`);
        await sleep(500);

        const shot = await sendCDP('Page.captureScreenshot', { format: 'png' });
        const outPath = path.join(ARTIFACT_DIR, 'verify_master_param_controls.png');
        fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
        console.log(`-> Da chup va luu anh minh chung: verify_master_param_controls.png`);

        console.log('\n================================================================');
        console.log('KIEM THU HOAN TAT 100%: HE THONG DONG BO THAM SO DAT CHUAN TUYET DOI!');
        console.log('================================================================');

    } finally {
        browser.kill();
        server.close();
        try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
    }
})();
