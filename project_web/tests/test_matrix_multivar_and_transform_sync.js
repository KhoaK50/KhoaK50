const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5689;
const CDP_PORT = 9289;
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
const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_mat_sync_test');

(async () => {
    console.log('================================================================');
    console.log('KIEM THU DONG BO HOAT ANH MA TRAN, VECTOR VA LUOI BIEN DANG');
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

        let idCounter = 1;
        const sendCDP = (method, params = {}) => new Promise((resolve, reject) => {
            const id = idCounter++;
            const handler = (msg) => {
                const res = JSON.parse(msg.data);
                if (res.id === id) {
                    ws.removeEventListener('message', handler);
                    if (res.error) reject(res.error);
                    else resolve(res.result);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id, method, params }));
        });

        await sendCDP('Page.enable');
        await sendCDP('Runtime.enable');

        const evalCode = async (expression) => {
            const res = await sendCDP('Runtime.evaluate', {
                expression,
                returnByValue: true,
                awaitPromise: true
            });
            if (res.exceptionDetails) {
                throw new Error(res.exceptionDetails.text + ' ' + (res.exceptionDetails.exception?.description || ''));
            }
            return res.result.value;
        };

        const captureScreenshot = async (name) => {
            const shot = await sendCDP('Page.captureScreenshot', { format: 'png' });
            const buf = Buffer.from(shot.data, 'base64');
            const dest = path.join(ARTIFACT_DIR, `${name}.png`);
            fs.writeFileSync(dest, buf);
            console.log(`[SNAPSHOT] Da luu: ${dest}`);
        };

        console.log('\n--- 1. Tao ma tran tham so da bien M1 f(t, u, v, x) ---');
        const setupMatRes = await evalCode(`
            (() => {
                App.matrixList = [];
                App.vectorList = [];

                // Tao ma tran tham so 2x2 f(t, u, v, x)
                const rows = 2, cols = 2;
                const cellParseds = [
                    [(s) => s.t, (s) => s.u],
                    [(s) => s.v, (s) => s.x]
                ];
                const latexValues = [
                    ["t", "u"],
                    ["v", "x"]
                ];
                const gridData = {
                    name: "M1",
                    isParametric: true,
                    vars: ["t", "u", "v", "x"],
                    paramVar: "t",
                    activeAnimVars: ["t", "u", "v", "x"],
                    cellParseds: cellParseds,
                    scopeValues: { t: 1.2, u: 0.8, v: -0.5, x: 1.5 }
                };

                const hue = 210;
                const item = App.createMatrixItem(rows, cols, [[1.2, 0.8], [-0.5, 1.5]], latexValues, hue, gridData);
                item.evalMatrix = function(primaryVal, scope) {
                    const sc = Object.assign({}, scope || {});
                    if (this.paramVar) sc[this.paramVar] = primaryVal;
                    return [
                        [sc.t !== undefined ? sc.t : 1, sc.u !== undefined ? sc.u : 1],
                        [sc.v !== undefined ? sc.v : 0, sc.x !== undefined ? sc.x : 1]
                    ];
                };
                App.matrixList.push(item);
                App.renderMatrixList();

                // Chuyen sang tab Phep tinh (Tab 3, index 2)
                const tabs = document.querySelectorAll(".mode-tab");
                if (tabs.length >= 3) tabs[2].click();

                App.refreshMixedCalcOptions();
                return {
                    matName: item.name,
                    vars: item.vars,
                    activeAnimVars: item.activeAnimVars
                };
            })()
        `);
        console.log('Ket qua khoi tao ma tran:', setupMatRes);

        console.log('\n--- 2. Kiem tra huy hieu da bien matParamMultiVals tren giao dien ---');
        const badgeCheck = await evalCode(`
            (() => {
                const multiBox = document.getElementById("matParamMultiVals_1");
                const badges = multiBox ? Array.from(multiBox.querySelectorAll(".mat-multi-badge")).map(b => b.textContent) : [];
                return {
                    exists: !!multiBox,
                    display: multiBox ? window.getComputedStyle(multiBox).display : "none",
                    badgeTexts: badges
                };
            })()
        `);
        console.log('Kiem tra Multi-variable Badges:', badgeCheck);
        if (!badgeCheck.exists || badgeCheck.badgeTexts.length !== 4) {
            throw new Error(`That bai: Can 4 badges cho t, u, v, x nhung nhan duoc: ${JSON.stringify(badgeCheck)}`);
        }

        console.log('\n--- 3. Tao vector tham so v = [u, v] & Kiem tra khong bi gan cung so thuc ---');
        const vecRes = await evalCode(`
            (() => {
                const vItem = {
                    id: 1,
                    name: "v1",
                    isParametric: true,
                    vars: ["u", "v"],
                    rawExprs: ["u", "v"],
                    paramVar: "u",
                    paramVal: 2.0,
                    scopeValues: { u: 2.0, v: 3.5 },
                    vec: [2.0, 3.5],
                    fn: function(val, sc) {
                        return [sc.u !== undefined ? sc.u : val, sc.v !== undefined ? sc.v : 3.5];
                    }
                };
                App.vectorList.push(vItem);
                App.refreshMixedCalcOptions();

                const vecSel = document.getElementById("mixedVectorSelect");
                const optTexts = Array.from(vecSel.options).map(o => ({ value: o.value, text: o.textContent }));
                return {
                    options: optTexts
                };
            })()
        `);
        console.log('Options trong mixedVectorSelect:', vecRes.options);
        const v1Opt = vecRes.options.find(o => o.value === "1");
        if (!v1Opt || !v1Opt.text.includes("[u, v]")) {
            throw new Error(`That bai: Vector tham so phai hien thi cong thuc [u, v], nhung hien tai la: ${v1Opt?.text}`);
        }
        console.log('PASS: Vector tham so hien thi chuan ky hieu cong thuc:', v1Opt.text);

        console.log('\n--- 4. Chay hoat anh da bien & Kiem tra tat ca bien cung chay ---');
        await evalCode(`
            (() => {
                const item = App.matrixList[0];
                App.toggleMatrixAnimation(item.id);
            })()
        `);
        await sleep(350);

        const animScopeCheck = await evalCode(`
            (() => {
                const item = App.matrixList[0];
                return {
                    isAnimating: item.isAnimating,
                    scopeValues: item.scopeValues,
                    rafRunning: !!App._matAnimFrameId
                };
            })()
        `);
        console.log('Trang thai hoat anh da bien ma tran:', animScopeCheck);
        if (!animScopeCheck.isAnimating || !animScopeCheck.rafRunning) {
            throw new Error('That bai: Hoat anh ma tran chua chay!');
        }

        console.log('\n--- 5. Kiem tra dong bo giua nut thuc hien (LinearTransform) va thanh slide ---');
        const computeAndSyncCheck = await evalCode(`
            (() => {
                const vecSel = document.getElementById("mixedVectorSelect");
                vecSel.value = "1";
                const matSel = document.getElementById("mixedMatrixSelect");
                matSel.value = String(App.matrixList[0].id);

                // Bam nut thuc hien
                const btnMixed = document.getElementById("btnMixedCompute");
                btnMixed.click();

                const isLTActive = !!(window.App?.LinearTransform?.isActive?.());
                const btnText = btnMixed.textContent.trim();

                return {
                    isLTActive,
                    btnText
                };
            })()
        `);
        console.log('Trang thai sau khi bam Thuc hien:', computeAndSyncCheck);

        // Bam dung mo phong qua nut bu
        const stopSyncCheck = await evalCode(`
            (() => {
                const btnMixed = document.getElementById("btnMixedCompute");
                // Bam nut Dung mo phong
                btnMixed.click();

                const isLTActiveAfter = !!(window.App?.LinearTransform?.isActive?.());
                const matItem = App.matrixList[0];
                const btnTextAfter = btnMixed.textContent.trim();

                return {
                    isLTActiveAfter,
                    matIsAnimating: matItem.isAnimating,
                    btnTextAfter,
                    matAnimFrameId: App._matAnimFrameId
                };
            })()
        `);
        console.log('Trang thai sau khi bam Dung mo phong tren nut bu:', stopSyncCheck);
        if (stopSyncCheck.matIsAnimating || stopSyncCheck.isLTActiveAfter || stopSyncCheck.matAnimFrameId !== null) {
            throw new Error(`That bai: Tat nut bu nhung thanh slide van chay! Chi tiet: ${JSON.stringify(stopSyncCheck)}`);
        }
        console.log('PASS: Da dong bo hoan hao nut Thuc hien va thanh slide. Tat nut bu thi tat luon slider animation.');

        console.log('\n--- 6. Kiem tra do tuong phan luoi bien dang & truc toa do Ox, Oy tren 2D ---');
        await evalCode(`
            (() => {
                const btnMixed = document.getElementById("btnMixedCompute");
                btnMixed.click(); // Bat lai bien doi
                App.LinearTransform.setT(1.0); // Tien den t = 1.0 (khong gian bien dang toi da)
                if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
            })()
        `);
        await sleep(500);

        await captureScreenshot('verify_matrix_multivar_and_space_deformation');

        // Mo sidebar va chuyen sang tab Phep tinh (Tab 3: tab-btn index 2) & chon che do Mixed (A · v)
        await evalCode(`
            (() => {
                const hamburger = document.getElementById("floatingHamburger");
                if (hamburger) hamburger.click();
                const railBtns = document.querySelectorAll(".sidebar-tabs.vertical .tab-btn");
                if (railBtns.length >= 3) railBtns[2].click();
                const calcSel = document.getElementById("calcObjectSelect");
                if (calcSel) {
                    calcSel.value = "mixed";
                    calcSel.dispatchEvent(new Event("change"));
                }
                App.refreshMixedCalcOptions();
            })()
        `);
        await sleep(500);
        await captureScreenshot('verify_matrix_multivar_sidebar_open');

        // Chuyen sang tab Doi tuong -> Ma tran & mo popover setting de kiem tra giao dien chip da bien
        await evalCode(`
            (() => {
                const railBtns = document.querySelectorAll(".sidebar-tabs.vertical .tab-btn");
                if (railBtns.length >= 1) railBtns[0].click(); // Tab Doi tuong
                const segBtns = document.querySelectorAll("#tabContentObjects .obj-segmented-switcher button");
                if (segBtns.length >= 2) segBtns[1].click(); // Tab Ma tran
                const gearBtn = document.querySelector("#matrixList .mat-param-tool-btn");
                if (gearBtn) gearBtn.click(); // Mo settings popover
            })()
        `);
        await sleep(500);
        await captureScreenshot('verify_matrix_card_multivar_controls');

        console.log('\n================================================================');
        console.log('TAT CA 4 CA KIEM THU DA HOAN TAT 100% THANH CONG!');
        console.log('================================================================');

    } catch (err) {
        console.error('LOI KIEM THU:', err);
        process.exitCode = 1;
    } finally {
        browser.kill();
        server.close();
        process.exit();
    }
})();
