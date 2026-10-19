const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = 'd:\\Programming_language\\project_web';
const HTTP_PORT = 5692;
const CDP_PORT = 9292;
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
const userData = path.join(PROJECT_ROOT, '.tmp_edge_test_matrix_nori_clean');

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

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await sleep(1500);

  const evalJson = async (code) => {
    const res = await send('Runtime.evaluate', {
      expression: `JSON.stringify((() => { ${code} })())`,
      returnByValue: true
    });
    return res && res.result?.value ? JSON.parse(res.result.value) : null;
  };

  console.log('=== TEST 1: KHOI TAO MA TRAN VA NUT BIEN DOI TRUC TIEP TREN THE MA TRAN ===');
  const r1 = await evalJson(`
    window.App.matrixList = [{
      id: 'mat_test_1',
      name: 'M1',
      rows: 2,
      cols: 2,
      values: [[1.5, 0.8], [0, 1.2]],
      colorCss: '#3b82f6',
      isParametric: false
    }];
    window.App.renderMatrixList();
    const btn = document.querySelector('.mat-btn-transform');
    return { hasTransformBtn: !!btn, btnTitle: btn ? btn.title : '' };
  `);
  console.log('Test 1 Result:', r1);

  console.log('=== TEST 2: BAM NUT BIEN DOI TREN THE MA TRAN ===');
  const r2 = await evalJson(`
    const btn = document.querySelector('.mat-btn-transform');
    if (btn) btn.click();
    return {
      isLTActive: window.App.LinearTransform.isActive(),
      noriActive: window.App.noriEntityActive,
      dim: window.App.LinearTransform.dim
    };
  `);
  console.log('Test 2 Result:', r2);
  await sleep(600);

  const r2Expr = await evalJson(`
    const M = window.App.LinearTransform.getInterpMatrix(window.App.LinearTransform.t);
    const expr = window.Vec2D.getNoriExpressionState(M);
    return { t: window.App.LinearTransform.t, state: expr.state, shear: expr.shearFactor };
  `);
  console.log('Nori Deformation State at (0, 0):', r2Expr);

  console.log('=== TEST 3: BUNG NORI RA KHOI CANVAS TRONG KHI MA TRAN DANG CHAY ===');
  const r3 = await evalJson(`
    window.App.noriFloatingCompanion.liftFromCanvas(400, 300);
    return {
      isFloating: window.App.noriIsFloating,
      companionDisplay: window.App.noriFloatingCompanion.container.style.display,
      bubbleText: window.App.noriFloatingCompanion.bubble.textContent
    };
  `);
  console.log('Test 3 Result (Nori Lifted & Immune):', r3);

  console.log('=== TEST 4: KHOI DONG BIEN DOI KHI NORI DANG LO LUNG (THONG BAO NEN) ===');
  const r4 = await evalJson(`
    window.App.LinearTransform.start([[1.4, 0], [0, 2.0]]);
    return {
      bubbleText: window.App.noriFloatingCompanion.bubble.textContent,
      isBubbleVisible: window.App.noriFloatingCompanion.bubble.classList.contains('is-visible')
    };
  `);
  console.log('Test 4 Result (Nori Speech Warning):', r4);

  console.log('=== TEST 5: DOUBLE CLICK VAO NORI DE BAY VE GOC (0, 0) VA BI BIEN DANG ===');
  await send('Runtime.evaluate', {
    expression: `window.App.noriFloatingCompanion.stage.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));`
  });
  await sleep(600);

  const r5 = await evalJson(`
    return {
      isFloating: window.App.noriIsFloating,
      noriActive: window.App.noriEntityActive,
      ltActive: window.App.LinearTransform.isActive()
    };
  `);
  console.log('Test 5 Result (Nori Landed at Origin):', r5);

  console.log('=== TEST 6: KIEM THU CAC EASTER EGGS CUA NORI ===');
  await send('Runtime.evaluate', {
    expression: `window.App.noriFloatingCompanion.liftFromCanvas(500, 300);`
  });
  await sleep(300);

  // Easter Egg 1: Bung mui hat xi
  const ee1 = await evalJson(`
    window.App.noriFloatingCompanion.triggerSneeze();
    return {
      isSneezing: window.App.noriFloatingCompanion.isSneezing,
      bubble: window.App.noriFloatingCompanion.bubble.textContent
    };
  `);
  console.log('Easter Egg - Bung mui:', ee1);
  await sleep(700);

  // Easter Egg 2: Choc bung cuoi
  const ee2 = await evalJson(`
    window.App.noriFloatingCompanion.triggerTickle();
    return {
      isTickling: window.App.noriFloatingCompanion.isTickling,
      bubble: window.App.noriFloatingCompanion.bubble.textContent
    };
  `);
  console.log('Easter Egg - Choc bung:', ee2);
  await sleep(600);

  // Easter Egg 3: Veo ma mochi
  const ee3 = await evalJson(`
    window.App.noriFloatingCompanion.triggerCheekBounce('left');
    return {
      bubble: window.App.noriFloatingCompanion.bubble.textContent
    };
  `);
  console.log('Easter Egg - Veo ma Mochi:', ee3);
  await sleep(500);

  // Easter Egg 4: Xoa dau vuot ve
  const ee4 = await evalJson(`
    const now = performance.now();
    window.App.noriFloatingCompanion.petStrokeHistory = [
      { x: 100, time: now - 800 },
      { x: 140, time: now - 600 },
      { x: 90, time: now - 450 },
      { x: 150, time: now - 300 },
      { x: 80, time: now - 150 },
      { x: 160, time: now - 50 }
    ];
    const evt = new PointerEvent('pointermove', { clientX: 100, clientY: 310, bubbles: true });
    window.App.noriFloatingCompanion.stage.dispatchEvent(evt);
    return {
      isPetting: window.App.noriFloatingCompanion.isPetting,
      bubble: window.App.noriFloatingCompanion.bubble.textContent
    };
  `);
  console.log('Easter Egg - Xoa dau vuot ve:', ee4);
  await sleep(500);

  // Easter Egg 5: Click lien tuc ca noc phong mang
  const ee5 = await evalJson(`
    const now = performance.now();
    window.App.noriFloatingCompanion.clickTimestamps = [now - 900, now - 600, now - 300];
    window.App.noriFloatingCompanion.stage.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return {
      isPuffed: window.App.noriFloatingCompanion.isPuffed,
      bubble: window.App.noriFloatingCompanion.bubble.textContent
    };
  `);
  console.log('Easter Egg - Ca noc phong mang:', ee5);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\verify_matrix_nori_eastereggs_clean.png', Buffer.from(shot.data, 'base64'));
  console.log('Screenshot saved: verify_matrix_nori_eastereggs_clean.png');

  ws.close();
  browser.kill();
  server.close();
  try { fs.rmSync(userData, { recursive: true, force: true }); } catch (e) {}
}

main().catch(e => { console.error(e); process.exit(1); });
