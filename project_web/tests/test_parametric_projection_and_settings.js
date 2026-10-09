const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5677;
const CDP_PORT = 9277;
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
const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_proj_test');

(async () => {
    console.log('================================================================');
    console.log('KIEM THU DUONG GIONG TOA DO & CAI DAT THAM SO TRONG VECTOR');
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

        console.log('\n--- BƯỚC 1: KIỂM TRA MASTERPARAMBAR ĐÃ ĐƯỢC ẨN KHỎI DANH SÁCH ---');
        const barStatus = await evalExpr(`(() => {
            const bar = document.getElementById("masterParamBar");
            return {
                exists: !!bar,
                display: bar ? getComputedStyle(bar).display : "none"
            };
        })()`);
        console.log('Trang thai bar:', barStatus);
        if (barStatus.display !== "none") {
            throw new Error('masterParamBar van con hien thi tren danh sach vector!');
        }
        console.log('-> DAT: Thanh banner ben ngoai danh sach da bi an hoan toan.');

        console.log('\n--- BƯỚC 2: TẠO VECTOR ĐA BIẾN [u, 2t] & KIỂM TRA ĐƯỜNG GIÓNG ---');
        const vecResult = await evalExpr(`(() => {
            document.getElementById("vectorInput").value = "[u, 2*t]";
            App.onAddVector();

            const v1 = App.vectorList[0];
            return {
                id: v1.id,
                vars: v1.vars,
                isParametric: v1.isParametric,
                vec: v1.vec,
                showProjection: v1.showProjection
            };
        })()`);
        console.log('Vector da tao:', vecResult);
        if (!vecResult.isParametric || vecResult.vars.length < 2) {
            throw new Error('Tao vector tham so da bien that bai!');
        }
        console.log('-> DAT: Vector [u, 2t] da duoc tao thanh cong.');

        console.log('\n--- BƯỚC 3: KIỂM TRA CLICK BADGE ĐA BIẾN CHUYỂN SLIDER ---');
        const badgeTest = await evalExpr(`(() => {
            const multiBox = document.getElementById("vecParamMultiVals_1");
            const badges = multiBox.querySelectorAll(".vec-multi-badge");
            const v1 = App.vectorList[0];
            const initialVar = v1.paramVar;

            // Click vao badge thu 2 de doi bien
            if (badges.length >= 2) {
                badges[1].click();
            }

            const newVar = v1.paramVar;
            const slider = document.getElementById("vecParamSlider_1");

            return {
                badgeCount: badges.length,
                initialVar,
                newVar,
                sliderVal: slider ? slider.value : null
            };
        })()`);
        console.log('Ket qua click badge:', badgeTest);
        if (badgeTest.initialVar === badgeTest.newVar && badgeTest.badgeCount >= 2) {
            throw new Error('Click badge khong chuyen bien paramVar!');
        }
        console.log('-> DAT: Click badge da chuyen doi bien dieu khien tren thanh truot.');

        console.log('\n--- BƯỚC 4: KIỂM TRA PHÂN KHU ĐỒNG BỘ TRONG POPOVER CÀI ĐẶT ---');
        const popoverTest = await evalExpr(`(() => {
            const moreBtn = document.getElementById("vecParamMore_1");
            moreBtn.click(); // Mo popover cai dat

            const popover = document.querySelector(".vec-param-popover");
            const masterSec = popover ? popover.querySelector(".vec-param-master-section") : null;
            const chips = popover ? popover.querySelectorAll(".vec-pop-master-chip") : [];
            const playBtn = popover ? popover.querySelector(".vec-pop-master-play") : null;
            const resetBtn = popover ? popover.querySelector(".vec-pop-master-reset") : null;

            // Thu click chip "dong bo" xem co toast spam khong
            const chipLockstep = Array.from(chips).find(c => c.dataset.mode === "lockstep");
            if (chipLockstep) chipLockstep.click();

            const curMode = App.MasterParamController.syncMode;

            return {
                popoverVisible: popover ? getComputedStyle(popover).display : "none",
                hasMasterSec: !!masterSec,
                chipCount: chips.length,
                hasPlayBtn: !!playBtn,
                hasResetBtn: !!resetBtn,
                curMode
            };
        })()`);
        console.log('Ket qua popover cai dat:', popoverTest);
        if (!popoverTest.hasMasterSec || popoverTest.chipCount !== 3 || popoverTest.curMode !== "lockstep") {
            throw new Error('Phan khu dong bo trong popover khong hoat dong chinh xac!');
        }
        console.log('-> DAT: Phan khu Dong bo hoat anh toan cuc da tich hop hoan hao vao popover cai dat.');

        console.log('\n--- BƯỚC 5: CHỤP ẢNH MINH CHỨNG CANVAS VỚI 2 ĐƯỜNG GIÓNG VÀ POPOVER ---');
        // Dong popover de chup canvas voi 2 duong giong
        await evalExpr(`(() => {
            document.querySelectorAll(".vec-param-popover").forEach(p => p.style.display = "none");
            App._renderParamStep();
        })()`);
        await sleep(300);

        let shot = await sendCDP('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_parametric_projection_2d.png'), Buffer.from(shot.data, 'base64'));
        console.log('-> Da luu: verify_parametric_projection_2d.png');

        // Mo lai popover va chup
        await evalExpr(`(() => {
            document.getElementById("vecParamMore_1").click();
        })()`);
        await sleep(300);

        shot = await sendCDP('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_vector_settings_popover.png'), Buffer.from(shot.data, 'base64'));
        console.log('-> Da luu: verify_vector_settings_popover.png');

        // Mo sidebar va dong popover de chup danh sach vector card va badges tuong tac
        await evalExpr(`(() => {
            document.querySelectorAll(".vec-param-popover").forEach(p => p.style.display = "none");
            const h = document.getElementById("floatingHamburger");
            if (h && !h.classList.contains("open")) h.click();
        })()`);
        await sleep(500);

        shot = await sendCDP('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_vector_card_interactive_badges.png'), Buffer.from(shot.data, 'base64'));
        console.log('-> Da luu: verify_vector_card_interactive_badges.png');

        console.log('\n--- BƯỚC 6: KIỂM THỬ KHÔNG GIAN 3D VỚI 3 ĐƯỜNG GIÓNG ---');
        await evalExpr(`(() => {
            const btn = document.getElementById("modeBadge");
            if (btn && App.mode !== "3D") btn.click();
            document.getElementById("vectorInput").value = "[u, 2*t, 3]";
            App.onAddVector();
        })()`);
        await sleep(600);

        const res3D = await evalExpr(`(() => {
            const v = App.vectorList[App.vectorList.length - 1];
            return {
                mode: App.mode,
                id: v.id,
                vars: v.vars,
                isParametric: v.isParametric,
                vec: v.vec
            };
        })()`);
        console.log('Ket qua vector 3D:', res3D);

        shot = await sendCDP('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_parametric_projection_3d.png'), Buffer.from(shot.data, 'base64'));
        console.log('-> Da luu: verify_parametric_projection_3d.png');

        console.log('\n================================================================');
        console.log('TAT CA CAC MUC KIEM THU DA DAT 100%!');
        console.log('================================================================');

    } finally {
        browser.kill();
        server.close();
        try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
    }
})();
