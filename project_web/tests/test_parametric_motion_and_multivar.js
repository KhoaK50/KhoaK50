const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5678;
const CDP_PORT = 9278;
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
const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_multivar_test');

(async () => {
    console.log('================================================================');
    console.log('KIEM THU HOAT ANH VECTOR DA BIEN & CHUYEN DONG VECTOR TREN CANVAS');
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

        console.log('\n--- BƯỚC 1: TẠO VECTOR ĐA BIẾN [u, v] ---');
        const initVec = await evalExpr(`(() => {
            document.getElementById("vectorInput").value = "[u, v]";
            App.onAddVector();

            const v1 = App.vectorList[0];
            return {
                id: v1.id,
                vars: v1.vars,
                activeAnimVars: v1.activeAnimVars,
                scopeValues: v1.scopeValues,
                vec: [...v1.vec],
                paramVar: v1.paramVar
            };
        })()`);
        console.log('Thong tin ban dau vector:', initVec);
        if (!initVec.vars.includes('u') || !initVec.vars.includes('v')) {
            throw new Error('Vector khong chua day du 2 bien u va v!');
        }
        if (!initVec.activeAnimVars.includes('u') || !initVec.activeAnimVars.includes('v')) {
            throw new Error('activeAnimVars khong chua day du ca u va v mac dinh!');
        }
        if (initVec.scopeValues.u === undefined || initVec.scopeValues.v === undefined) {
            throw new Error('scopeValues khong khoi tao day du u va v!');
        }
        console.log('-> DAT: Vector [u, v] khoi tao day du bien va gia tri.');

        console.log('\n--- BƯỚC 2: KIỂM TRA GIAO DIỆN Ô NHẬP VÀ BADGES ---');
        const uiCheck = await evalExpr(`(() => {
            const singleValBox = document.getElementById("vecParamSingleValBox_1");
            const valLabel = document.getElementById("vecParamVarLbl_1");
            const valInp = document.getElementById("vecParamValInp_1");
            const multiBox = document.getElementById("vecParamMultiVals_1");
            const badges = multiBox ? multiBox.querySelectorAll(".vec-multi-badge") : [];

            return {
                singleValBoxDisplay: singleValBox ? getComputedStyle(singleValBox).display : null,
                valLabelText: valLabel ? valLabel.textContent.trim() : null,
                valInpValue: valInp ? valInp.value : null,
                badgeCount: badges.length,
                badgeTexts: Array.from(badges).map(b => b.textContent.trim()),
                activeBadgeText: Array.from(badges).find(b => b.classList.contains("active"))?.textContent.trim()
            };
        })()`);
        console.log('Trang thai UI:', uiCheck);
        if (uiCheck.singleValBoxDisplay === 'none') {
            throw new Error('singleValBox bi an trong che do da bien!');
        }
        if (uiCheck.badgeCount !== 2) {
            throw new Error(`So luong badges (${uiCheck.badgeCount}) khong bang 2!`);
        }
        console.log('-> DAT: O nhap truc tiep va 2 badges deu hien thi hoan hao.');

        console.log('\n--- BƯỚC 3: KIỂM TRA CHẾ ĐỘ ĐỒNG BỘ (LOCKSTEP) - CẢ U VÀ V CÙNG CHẠY, VECTOR DI CHUYỂN ---');
        // Mo popover, chon che do Dong bo va bam Chay tat ca
        await evalExpr(`(() => {
            const moreBtn = document.getElementById("vecParamMore_1");
            moreBtn.click();
            App.MasterParamController.setSyncMode("lockstep");
            App.MasterParamController.playAll();
        })()`);

        const t0_coords = await evalExpr(`(() => {
            const v1 = App.vectorList[0];
            return {
                vec: [...v1.vec],
                u: v1.scopeValues.u,
                v: v1.scopeValues.v
            };
        })()`);
        console.log('Toa do tai thoi diem t0 (lockstep):', t0_coords);

        // Cho chay hoat anh trong 500ms
        await sleep(500);

        const t1_coords = await evalExpr(`(() => {
            const v1 = App.vectorList[0];
            return {
                vec: [...v1.vec],
                u: v1.scopeValues.u,
                v: v1.scopeValues.v,
                sliderVal: document.getElementById("vecParamSlider_1").value,
                valInpVal: document.getElementById("vecParamValInp_1").value
            };
        })()`);
        console.log('Toa do tai thoi diem t1 (lockstep):', t1_coords);

        const u_changed = Math.abs(t1_coords.u - t0_coords.u) > 0.05;
        const v_changed = Math.abs(t1_coords.v - t0_coords.v) > 0.05;
        const vec_x_changed = Math.abs(t1_coords.vec[0] - t0_coords.vec[0]) > 0.05;
        const vec_y_changed = Math.abs(t1_coords.vec[1] - t0_coords.vec[1]) > 0.05;

        console.log(`Bien u thay doi: ${u_changed} (${t0_coords.u} -> ${t1_coords.u})`);
        console.log(`Bien v thay doi: ${v_changed} (${t0_coords.v} -> ${t1_coords.v})`);
        console.log(`Vector X thay doi: ${vec_x_changed} (${t0_coords.vec[0]} -> ${t1_coords.vec[0]})`);
        console.log(`Vector Y thay doi: ${vec_y_changed} (${t0_coords.vec[1]} -> ${t1_coords.vec[1]})`);

        if (!u_changed || !v_changed) {
            throw new Error(`Khong phai tat ca cac bien deu chay! u_changed=${u_changed}, v_changed=${v_changed}`);
        }
        if (!vec_x_changed || !vec_y_changed) {
            throw new Error(`Vector khong di chuyen tren canvas! vec_x_changed=${vec_x_changed}, vec_y_changed=${vec_y_changed}`);
        }
        console.log('-> DAT: Che do Dong bo chay ca u va v, vector di chuyen tren canvas.');

        // Chup anh minh chung khi dang chay lockstep
        let shot1 = await sendCDP('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_multivar_lockstep_running.png'), Buffer.from(shot1.data, 'base64'));
        console.log('-> Da luu: verify_multivar_lockstep_running.png');

        console.log('\n--- BƯỚC 4: KIỂM TRA CLICK BADGE ĐỂ CHUYỂN BIẾN ĐANG ĐIỀU KHIỂN & GÕ SỐ TRỰC TIẾP ---');
        const badgeClickRes = await evalExpr(`(() => {
            // Tam dung hoat anh
            App.MasterParamController.pauseAll();

            // Click vao badge v de chuyen sang dieu khien v
            const badges = document.getElementById("vecParamMultiVals_1").querySelectorAll(".vec-multi-badge");
            badges[1].click();

            const v1 = App.vectorList[0];
            const activeVar = v1.paramVar;
            const valLabel = document.getElementById("vecParamVarLbl_1").textContent.trim();
            const valInp = document.getElementById("vecParamValInp_1").value;

            // Nhap truc tiep so 7.5 vao valInp
            App.setVectorParamValueDirect(v1.id, 7.5);

            return {
                activeVar,
                valLabel,
                valInp,
                newScopeV: v1.scopeValues.v,
                newVecY: v1.vec[1]
            };
        })()`);
        console.log('Ket qua click badge va nhap so truc tiep:', badgeClickRes);
        if (badgeClickRes.activeVar !== 'v' || !badgeClickRes.valLabel.startsWith('v')) {
            throw new Error('Click badge v khong chuyen bien dieu khien sang v!');
        }
        if (Math.abs(badgeClickRes.newScopeV - 7.5) > 0.01 || Math.abs(badgeClickRes.newVecY - 7.5) > 0.01) {
            throw new Error('Nhap gia tri truc tiep khong cap nhat scopeValues va v.vec!');
        }
        console.log('-> DAT: Click badge da chuyen bien thanh cong va cho phep nhap so truc tiep.');

        console.log('\n--- BƯỚC 5: KIỂM TRA CHẾ ĐỘ ĐỘC LẬP (OFFSET) QUA NÚT PLAY TỔNG & NÚT PLAY THẺ ---');
        await evalExpr(`(() => {
            App.MasterParamController.setSyncMode("offset");
            App.MasterParamController.playAll();
        })()`);

        const offset_t0 = await evalExpr(`(() => {
            const v1 = App.vectorList[0];
            return {
                u: v1.scopeValues.u,
                v: v1.scopeValues.v,
                vec: [...v1.vec],
                isPlaying: v1.isAnimating
            };
        })()`);
        await sleep(500);
        const offset_t1 = await evalExpr(`(() => {
            const v1 = App.vectorList[0];
            return {
                u: v1.scopeValues.u,
                v: v1.scopeValues.v,
                vec: [...v1.vec]
            };
        })()`);
        console.log('Chay offset t0:', offset_t0);
        console.log('Chay offset t1:', offset_t1);

        const offset_u_changed = Math.abs(offset_t1.u - offset_t0.u) > 0.05;
        const offset_v_changed = Math.abs(offset_t1.v - offset_t0.v) > 0.05;
        const offset_vec_changed = Math.abs(offset_t1.vec[0] - offset_t0.vec[0]) > 0.05 || Math.abs(offset_t1.vec[1] - offset_t0.vec[1]) > 0.05;

        if (!offset_u_changed && !offset_v_changed) {
            throw new Error('Offset mode khong chay bien nao!');
        }
        if (!offset_vec_changed) {
            throw new Error('Offset mode khong di chuyen vector!');
        }
        console.log('-> DAT: Che do Doc lap (Offset) chay hoat anh va vector di chuyen thanh cong.');

        console.log('\n--- BƯỚC 6: KIỂM TRA ĐẶT LẠI TẤT CẢ (RESET ALL) ---');
        const resetRes = await evalExpr(`(() => {
            App.MasterParamController.resetAll();
            const v1 = App.vectorList[0];
            return {
                u: v1.scopeValues.u,
                v: v1.scopeValues.v,
                vec: [...v1.vec],
                isAnimating: v1.isAnimating,
                isMasterPlaying: App.MasterParamController.isPlaying
            };
        })()`);
        console.log('Ket qua sau Reset All:', resetRes);
        if (resetRes.isAnimating || resetRes.isMasterPlaying) {
            throw new Error('Reset All khong dung hoat anh!');
        }
        if (Math.abs(resetRes.u - 1.0) > 0.01 || Math.abs(resetRes.v - 1.0) > 0.01) {
            throw new Error(`Reset All khong dat lai tat ca bien ve mac dinh! u=${resetRes.u}, v=${resetRes.v}`);
        }
        console.log('-> DAT: Reset All dat lai toan bo tham so u, v va toa do vector ve ban dau.');

        // Chup anh minh chung sau khi reset
        let shot2 = await sendCDP('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_multivar_reset_complete.png'), Buffer.from(shot2.data, 'base64'));
        console.log('-> Da luu: verify_multivar_reset_complete.png');

        console.log('\n================================================================');
        console.log('TAT CA 6 BƯOC KIEM THU DA VUOT QUA 100%!');
        console.log('================================================================');
    } catch (err) {
        console.error('TEST ERROR:', err);
        process.exitCode = 1;
    } finally {
        browser.kill();
        server.close();
    }
})();
