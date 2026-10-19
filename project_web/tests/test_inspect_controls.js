const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = 'd:\\Programming_language\\project_web';
const HTTP_PORT = 5698;
const CDP_PORT = 9298;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/frontend_v2/calculation.html';
  const filePath = path.join(PROJECT_ROOT, reqPath.replace(/^\//, ''));
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end('Not Found'); return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});
server.listen(HTTP_PORT);

const edgeBin = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userData = path.join(PROJECT_ROOT, '.tmp_edge_test_full_verify2');

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
  await new Promise(r => ws.onopen = r);
  let id = 1;
  const callbacks = new Map();
  ws.onmessage = evt => {
    const data = JSON.parse(evt.data);
    if (data.id && callbacks.has(data.id)) {
      callbacks.get(data.id)(data.result);
      callbacks.delete(data.id);
    }
  };
  const send = (method, params = {}) => new Promise(r => {
    const cur = id++;
    callbacks.set(cur, r);
    ws.send(JSON.stringify({ id: cur, method, params }));
  });

  // Open sidebar
  await send('Runtime.evaluate', {
    expression: `(() => {
      document.getElementById("floatingHamburger")?.click();
    })()`
  });
  await sleep(400);

  // Switch to Phép tính tab (index 2)
  await send('Runtime.evaluate', {
    expression: `(() => {
      const tabBtns = document.querySelectorAll(".sidebar-tabs.vertical .tab-btn");
      if (tabBtns[2]) tabBtns[2].click();
      const objSel = document.getElementById("calcObjectSelect");
      if (objSel) {
        objSel.value = "mixed";
        objSel.dispatchEvent(new Event("change"));
      }
    })()`
  });
  await sleep(500);

  // Capture screenshot of Phép tính tab showing empty state vector option
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\verify_mixed_empty_state_priority.png', Buffer.from(shot1.data, 'base64'));
  console.log('Saved verify_mixed_empty_state_priority.png');

  // Add matrix, choose Nori, click Thực hiện
  await send('Runtime.evaluate', {
    expression: `(() => {
      if (window.App && Array.isArray(App.matrixList)) {
        App.matrixList.push({
          id: "mTest",
          name: "M1",
          rows: 2,
          cols: 2,
          values: [[1.5, 0.4], [0.2, 1.2]],
          latexValues: [["1.5", "0.4"], ["0.2", "1.2"]]
        });
      }
      if (typeof App.refreshMixedCalcOptions === "function") {
        App.refreshMixedCalcOptions();
      }
      const matSel = document.getElementById("mixedMatrixSelect");
      if (matSel) {
        matSel.value = "mTest";
        matSel.dispatchEvent(new Event("change"));
      }
      const vecSel = document.getElementById("mixedVectorSelect");
      if (vecSel) {
        vecSel.value = "nori_entity";
        vecSel.dispatchEvent(new Event("change"));
      }
      const btn = document.getElementById("btnMixedCompute");
      if (btn) btn.click();
    })()`
  });
  await sleep(1000);

  // Capture active transformation screenshot with open sidebar showing red Dừng mô phỏng button and deformed space + Nori
  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\verify_nori_space_transform_with_sidebar.png', Buffer.from(shot2.data, 'base64'));
  console.log('Saved verify_nori_space_transform_with_sidebar.png');

  browser.kill();
  server.close();
  try { fs.rmSync(userData, { recursive: true, force: true }); } catch (e) {}
}
main();
