const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(process.env.USERPROFILE || 'C:\\Users\\LENOVO', '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81');
const HTTP_PORT = 5648;
const CDP_PORT = 9248;

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

function toDataUri(filename) {
    const p = path.join(ARTIFACT_DIR, filename);
    if (!fs.existsSync(p)) return '';
    const b64 = fs.readFileSync(p).toString('base64');
    return `data:image/png;base64,${b64}`;
}

const imgU1 = toDataUri('halo_1_classic_neon_closeup.png');
const imgV1 = toDataUri('halo_red_1_classic_neon_closeup.png');

const imgU2 = toDataUri('halo_2_academic_aura_closeup.png');
const imgV2 = toDataUri('halo_red_2_academic_aura_closeup.png');

const imgU3 = toDataUri('halo_3_precision_reticle_closeup.png');
const imgV3 = toDataUri('halo_red_3_precision_reticle_closeup.png');

const imgU4 = toDataUri('halo_4_soft_elevation_closeup.png');
const imgV4 = toDataUri('halo_red_4_soft_elevation_closeup.png');

const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>So sánh 4 phong cách Halo Vectoria</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 24px 30px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 6px;
      text-align: center;
      letter-spacing: -0.5px;
    }
    p.subtitle {
      text-align: center;
      color: #64748b;
      font-size: 13px;
      margin-bottom: 22px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .card-header {
      padding: 10px 16px;
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-original { background: #e0f2fe; color: #0369a1; }
    .badge-candidate { background: #ecfdf5; color: #047857; }
    .card-body {
      padding: 12px 14px;
      display: flex;
      gap: 12px;
      background: #ffffff;
      align-items: center;
      justify-content: center;
    }
    .img-wrap {
      flex: 1;
      text-align: center;
    }
    .img-wrap img {
      width: 100%;
      max-height: 180px;
      object-fit: contain;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      background: #ffffff;
      display: block;
      margin: 0 auto;
    }
    .img-label {
      font-size: 11px;
      color: #475569;
      margin-top: 4px;
      font-weight: 600;
    }
    .card-desc {
      padding: 10px 14px 12px;
      font-size: 12px;
      line-height: 1.45;
      color: #334155;
      border-top: 1px solid #f1f5f9;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <h1>BẢNG SO SÁNH TRỰC QUAN 4 PHONG CÁCH TIÊU ĐIỂM (HALO)</h1>
  <p class="subtitle">Quan sát trực tiếp trên 2 màu đại diện: Vector u (Xanh dương #3b82f6) và Vector v (Đỏ #ef4444)</p>

  <div class="grid">
    <!-- Style 1 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">1. Classic Cyan Neon (Nguyên bản cũ - 100% Cached)</span>
        <span class="badge badge-original">Đã lưu đệm</span>
      </div>
      <div class="card-body">
        <div class="img-wrap">
          <img src="${imgU1}" alt="u vector neon">
          <div class="img-label">Vector u (Xanh dương)</div>
        </div>
        <div class="img-wrap">
          <img src="${imgV1}" alt="v vector neon">
          <div class="img-label">Vector v (Đỏ)</div>
        </div>
      </div>
      <div class="card-desc">
        Quầng sáng Cyan (#00ffff) nhịp đập lớn (6-20px). Ưu điểm: Nổi bật tức thì. Nhược điểm: Áp đặt màu cyan neon lên mọi vector (kể cả vector đỏ), phong cách hơi hướng game arcade.
      </div>
    </div>

    <!-- Style 2 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">2. Academic Aura (Đồng sắc hàn lâm)</span>
        <span class="badge badge-candidate">Đề xuất A</span>
      </div>
      <div class="card-body">
        <div class="img-wrap">
          <img src="${imgU2}" alt="u vector aura">
          <div class="img-label">Vector u (Xanh dương)</div>
        </div>
        <div class="img-wrap">
          <img src="${imgV2}" alt="v vector aura">
          <div class="img-label">Vector v (Đỏ)</div>
        </div>
      </div>
      <div class="card-desc">
        Hào quang đồng sắc mềm mại (lớp ngoài 7-10px alpha 0.20 + lớp trong 4-5px alpha 0.38) lấy chính mã màu của vector. Tĩnh lặng, êm ái, tôn vinh màu nhận diện cá thể của vector.
      </div>
    </div>

    <!-- Style 3 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">3. Precision Reticle (Tâm ngắm kỹ thuật & Trắc địa)</span>
        <span class="badge badge-candidate">Đề xuất B</span>
      </div>
      <div class="card-body">
        <div class="img-wrap">
          <img src="${imgU3}" alt="u vector reticle">
          <div class="img-label">Vector u (Xanh dương)</div>
        </div>
        <div class="img-wrap">
          <img src="${imgV3}" alt="v vector reticle">
          <div class="img-label">Vector v (Đỏ)</div>
        </div>
      </div>
      <div class="card-desc">
        Phong cách bản vẽ kỹ thuật CAD: 2 vòng tròn đồng tâm hairline 1px tại ngọn mút (r=5px, r=11px), 4 vạch ngắm chữ thập trắc địa và đường gióng song song nét đứt dọc thân vector.
      </div>
    </div>

    <!-- Style 4 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">4. Soft Elevation (Bóng nổi chiều sâu 3D)</span>
        <span class="badge badge-candidate">Đề xuất C</span>
      </div>
      <div class="card-body">
        <div class="img-wrap">
          <img src="${imgU4}" alt="u vector elevation">
          <div class="img-label">Vector u (Xanh dương)</div>
        </div>
        <div class="img-wrap">
          <img src="${imgV4}" alt="v vector elevation">
          <div class="img-label">Vector v (Đỏ)</div>
        </div>
      </div>
      <div class="card-desc">
        Tạo chiều sâu nâng nổi (elevation) bằng shadowBlur 12px cùng tông màu vector, kết hợp viền sáng 6px ôm sát. Cảm giác vector như một chiếc compa hoặc kim nổi nhẹ trên mặt giấy can.
      </div>
    </div>
  </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
}).listen(HTTP_PORT);

const edgeBin = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = path.join(PROJECT_ROOT, '.tmp_edge_sheet2');

const browser = spawn(edgeBin, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-sync',
    '--headless=new',
    '--window-size=1280,950',
    `http://localhost:${HTTP_PORT}/`
]);

(async () => {
    try {
        await sleep(2000);
        const versionJson = await new Promise((res, rej) => {
            http.get(`http://localhost:${CDP_PORT}/json/list`, r => {
                let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
            }).on('error', rej);
        });
        const target = versionJson.find(t => t.type === 'page' && t.url.includes(`${HTTP_PORT}`));
        const wsUrl = (target || versionJson[0]).webSocketDebuggerUrl;
        const ws = new WebSocket(wsUrl);
        await new Promise(r => ws.onopen = r);

        let id = 1;
        const cbs = new Map();
        ws.onmessage = e => {
            const m = JSON.parse(e.data);
            if (cbs.has(m.id)) cbs.get(m.id)(m.result);
        };
        const send = (method, params = {}) => new Promise(res => {
            const curId = id++;
            cbs.set(curId, res);
            ws.send(JSON.stringify({ id: curId, method, params }));
        });

        await send('Page.enable');
        await sleep(1000);

        const res = await send('Page.captureScreenshot', { format: 'png' });
        const outPath = path.join(ARTIFACT_DIR, 'halo_comparison_4_styles_grid.png');
        fs.writeFileSync(outPath, Buffer.from(res.data, 'base64'));
        console.log('[SUCCESS] Saved 4-styles comparison grid:', outPath);

        ws.close();
    } catch (e) {
        console.error(e);
    } finally {
        browser.kill();
        server.close();
        try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
    }
})();
