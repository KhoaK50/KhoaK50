const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5691;
const CDP_PORT = 9291;
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
const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_halo_test');

(async () => {
    console.log('KIEM THU CAC TUY CHON TIEU DIEM HALO');

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

        const optionsCheck = await evalCode(`
            (() => {
                const sel = document.getElementById("settingHaloStyle");
                if (!sel) return { exists: false };
                const opts = Array.from(sel.options).map(o => ({ value: o.value, text: o.textContent.trim() }));
                const parentRow = sel.closest(".hud-menu-select-row");
                const labelText = parentRow ? parentRow.querySelector(".hud-menu-item-text")?.textContent.trim() : "";
                return {
                    exists: true,
                    labelText,
                    options: opts
                };
            })()
        `);
        console.log('Options Check:', JSON.stringify(optionsCheck, null, 2));

        if (optionsCheck.options.length !== 3) {
            throw new Error(`That bai: Yeu cau giu 3 cai dau (3 options), hien tai co ${optionsCheck.options.length}`);
        }

        const expected = [
            { value: 'precision_reticle', text: 'Tâm điểm tọa độ' },
            { value: 'academic_aura', text: 'Quầng sáng đồng màu' },
            { value: 'soft_elevation', text: 'Đổ bóng mờ' }
        ];

        for (let i = 0; i < 3; i++) {
            if (optionsCheck.options[i].value !== expected[i].value || optionsCheck.options[i].text !== expected[i].text) {
                throw new Error(`Tuy chon thu ${i+1} khong khop: ${JSON.stringify(optionsCheck.options[i])}`);
            }
        }
        console.log('PASS: Ca 3 tuy chon da duoc doi ten chuan xac, ro rang va khong cringe!');

        // Mo popup HUD menu de chup hinh menu
        await evalCode(`
            (() => {
                const btn = document.getElementById("canvasMenuBtn");
                if (btn) btn.click();
            })()
        `);
        await sleep(500);
        await captureScreenshot('verify_halo_options_clean');

        // Tao vector v1 = [3, 2] va highlight de kiem tra hieu ung truc quan 3 kieu halo
        await evalCode(`
            (() => {
                // Dong canvas menu
                const btn = document.getElementById("canvasMenuBtn");
                if (btn) btn.click();

                App.vectorList = [{
                    id: 1,
                    name: "u",
                    vec: [3, 2],
                    colorCss: "#2563eb",
                    colorHex: "#2563eb",
                    isTargeted: true,
                    highlighted: true,
                    focus: true
                }];
                if (window.Vec2D && Vec2D.S2D) {
                    Vec2D.S2D.hoveredVectorId = 1;
                }
                if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
            })()
        `);
        await sleep(300);

        // Kieu 1: Tam diem toa do (precision_reticle)
        await evalCode(`
            (() => {
                App.graphSettings.haloStyle = "precision_reticle";
                App.haloStyle = "precision_reticle";
                if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
            })()
        `);
        await sleep(300);
        await captureScreenshot('verify_halo_style_1_precision_reticle');

        // Kieu 2: Quang sang dong mau (academic_aura)
        await evalCode(`
            (() => {
                App.graphSettings.haloStyle = "academic_aura";
                App.haloStyle = "academic_aura";
                if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
            })()
        `);
        await sleep(300);
        await captureScreenshot('verify_halo_style_2_colored_glow');

        // Kieu 3: Do bong mo (soft_elevation)
        await evalCode(`
            (() => {
                App.graphSettings.haloStyle = "soft_elevation";
                App.haloStyle = "soft_elevation";
                if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
            })()
        `);
        await sleep(300);
        await captureScreenshot('verify_halo_style_3_soft_shadow');

    } catch (err) {
        console.error('LOI KIEM THU:', err);
        process.exitCode = 1;
    } finally {
        browser.kill();
        server.close();
        if (fs.existsSync(userDataDir)) {
            try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
        }
        process.exit();
    }
})();
