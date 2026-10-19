const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = 'd:\\Programming_language\\project_web';
const HTTP_PORT = 5693;
const CDP_PORT = 9293;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/frontend_v2/calculation.html';
  const filePath = path.join(PROJECT_ROOT, reqPath.replace(/^\//, ''));
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end('Not Found'); return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});
server.listen(HTTP_PORT);

const edgeBin = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userData = path.join(PROJECT_ROOT, '.tmp_edge_test_clean_matrix');

const browser = spawn(edgeBin, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-fre',
  '--window-size=1440,900',
  `--remote-debugging-port=${CDP_PORT}`,
  `--user-data-dir=${userData}`,
  `http://localhost:${HTTP_PORT}/frontend_v2/calculation.html`
]);

async function main() {
  await sleep(2800);
  const targets = await new Promise(r => http.get(`http://localhost:${CDP_PORT}/json`, res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
  }));
  const pageTarget = targets.find(t => t.type === 'page' && t.url.includes('calculation.html')) || targets.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 1;
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
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const curId = id++;
    callbacks.set(curId, { resolve, reject });
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  const evalJson = async (code) => {
    const res = await send('Runtime.evaluate', {
      expression: `JSON.stringify((() => { ${code} })())`,
      returnByValue: true
    });
    return res && res.result?.value ? JSON.parse(res.result.value) : null;
  };

  // Mở Sidebar nếu đang đóng
  await evalJson(`
    const controls = document.getElementById('controls');
    if (controls && controls.classList.contains('collapsed')) {
      const ham = document.getElementById('floatingHamburger') || document.getElementById('hamburger');
      if (ham) ham.click();
    }
    // Chuyển sang Tab Ma trận
    const matrixBtn = document.getElementById('btnSegmentMatrix') || document.querySelector('[data-tab="matrix"]') || document.querySelectorAll('.segmented-control button')[1];
    if (matrixBtn) matrixBtn.click();
    return true;
  `);
  await sleep(500);

  // Thêm một ma trận mẫu vào danh sách và kiểm tra
  const addRes = await evalJson(`
    window.App.matrixList = [{
      id: 3,
      name: 'M3',
      rows: 3,
      cols: 3,
      values: [['t', 0, 0], [0, 0, 0], [0, 0, 0]],
      latexValues: [['t', '0', '0'], ['0', '0', '0'], ['0', '0', '0']],
      colorCss: '#8b5cf6',
      isParametric: true,
      vars: ['t'],
      paramVar: 't'
    }];
    window.App.renderMatrixList();

    const matList = document.getElementById('matrixList');
    const items = matList ? matList.querySelectorAll('.mat-item') : [];
    const hasTransformBtn = !!matList?.querySelector('.mat-btn-transform');
    const hasParamCtrl = !!matList?.querySelector('.mat-param-controller');
    const hasBadge = !!matList?.querySelector('.mat-param-badge');

    return {
      itemCount: items.length,
      hasTransformBtn,
      hasParamCtrl,
      hasBadge
    };
  `);

  console.log('Kết quả kiểm tra Danh sách ma trận:', addRes);

  // Chụp ảnh kiểm chứng
  const ss = await send('Page.captureScreenshot', { format: 'png' });
  const artifactPath = path.join(
    process.env.USERPROFILE || 'C:\\Users\\LENOVO',
    '.gemini', 'antigravity', 'brain', '4024b48f-75e3-49e7-8d4e-2dd03106df81',
    'verify_clean_matrix_list.png'
  );
  fs.writeFileSync(artifactPath, Buffer.from(ss.data, 'base64'));
  console.log('Đã lưu ảnh kiểm chứng tại:', artifactPath);

  ws.close();
  browser.kill();
  server.close();

  if (addRes.hasTransformBtn || addRes.hasParamCtrl || addRes.hasBadge) {
    console.error('THẤT BẠI: Vẫn còn nút play, thanh trượt hoặc huy hiệu!');
    process.exit(1);
  } else {
    console.log('THÀNH CÔNG: Danh sách ma trận đã sạch sẽ 100%, không còn thanh trượt hay nút play!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Lỗi:', err);
  try { browser.kill(); } catch (e) {}
  try { server.close(); } catch (e) {}
  process.exit(1);
});
