const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = 'd:\\Programming_language\\project_web';
const HTTP_PORT = 5694;
const CDP_PORT = 9294;
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
const userData = path.join(PROJECT_ROOT, '.tmp_edge_test_nori_transform');

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

  try {
    console.log("Edge connected! Waiting for UI ready...");
    await sleep(1500);

    // Mở #controls nếu đang collapsed
    await evalJson(`
      const controls = document.getElementById('controls');
      if (controls && controls.classList.contains('collapsed')) {
        const ham = document.getElementById('floatingHamburger') || document.getElementById('hamburger');
        if (ham) ham.click();
      }
      return true;
    `);
    await sleep(400);

    // 1. Kiểm tra nút Nori trong sidebar tab vector
    await evalJson(`
      const tabVec = document.getElementById('btnSegmentVector') || document.querySelector('[data-tab="vector"]');
      if (tabVec) tabVec.click();
      return true;
    `);
    await sleep(400);

    const noriBtnInfo = await evalJson(`
      const btn = document.getElementById("btnNoriEntitySidebar");
      if (!btn) return { found: false };
      const icon = btn.querySelector("i.ph.ph-paw-print");
      const hasSvg = !!btn.querySelector("svg");
      return {
        found: true,
        hasPawPrint: !!icon,
        hasSvg: hasSvg,
        text: btn.textContent.trim()
      };
    `);
    console.log("1. Nori Sidebar Button Info:", noriBtnInfo);

    // Chụp screenshot tab Vector có nút Nori icon bàn chân thú
    const shotVectorTab = await send('Page.captureScreenshot', { format: 'png' });
    const shotVectorTabPath = "C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\verify_nori_sidebar_paw_icon.png";
    fs.writeFileSync(shotVectorTabPath, Buffer.from(shotVectorTab.data, 'base64'));
    console.log("Saved vector tab screenshot with paw print icon to:", shotVectorTabPath);

    // 2. Chuyển sang tab Phép tính -> mixed (Ma trận x Vector)
    await evalJson(`
      const tabCalc = document.getElementById('btnSegmentMixed') || document.querySelector('[data-tab="calc"]');
      if (tabCalc) tabCalc.click();
      
      const objSel = document.getElementById("calcObjectSelect");
      if (objSel) {
        objSel.value = "mixed";
        objSel.dispatchEvent(new Event("change"));
      }
      return true;
    `);
    await sleep(500);

    // 3. Kiểm tra dropdown mixedVectorSelect khi chưa có vector
    const emptyStateVectorSelect = await evalJson(`
      const vecSel = document.getElementById("mixedVectorSelect");
      if (!vecSel) return null;
      const opts = Array.from(vecSel.options).map(o => ({ value: o.value, text: o.text }));
      return {
        selectedValue: vecSel.value,
        selectedText: vecSel.options[vecSel.selectedIndex]?.text,
        firstOptionText: vecSel.options[0]?.text,
        options: opts
      };
    `);
    console.log("2. Mixed Vector Select (Empty State):", emptyStateVectorSelect);

    // 4. Bật Nori trên canvas rồi kiểm tra lại dropdown
    await evalJson(`
      if (window.App && typeof window.App.toggleNoriEntity === "function") {
        window.App.toggleNoriEntity();
      }
      return true;
    `);
    await sleep(500);

    const noriActiveVectorSelect = await evalJson(`
      const vecSel = document.getElementById("mixedVectorSelect");
      if (!vecSel) return null;
      return {
        noriActive: window.App?.noriEntityActive,
        selectedValue: vecSel.value,
        selectedText: vecSel.options[vecSel.selectedIndex]?.text,
        firstOptionText: vecSel.options[0]?.text
      };
    `);
    console.log("3. Mixed Vector Select when Nori is turned ON:", noriActiveVectorSelect);

    // 5. Thêm ma trận mẫu 2x2 và chọn Nori
    await evalJson(`
      if (window.App && Array.isArray(App.matrixList)) {
        App.matrixList.push({
          id: "testMat",
          name: "M1",
          rows: 2,
          cols: 2,
          values: [[1.6, 0.4], [0.3, 1.3]],
          latexValues: [["1.6", "0.4"], ["0.3", "1.3"]]
        });
      }
      if (typeof App.refreshMixedCalcOptions === "function") {
        App.refreshMixedCalcOptions();
      }
      const matSel = document.getElementById("mixedMatrixSelect");
      if (matSel) {
        matSel.value = "testMat";
        matSel.dispatchEvent(new Event("change"));
      }
      const vecSel = document.getElementById("mixedVectorSelect");
      if (vecSel) {
        vecSel.value = "nori_entity";
        vecSel.dispatchEvent(new Event("change"));
      }
      return true;
    `);
    await sleep(600);

    // 6. Nhấn Thực hiện
    await evalJson(`
      const btn = document.getElementById("btnMixedCompute");
      if (btn) btn.click();
      return true;
    `);
    await sleep(1000);

    const transformActiveState = await evalJson(`
      const btn = document.getElementById("btnMixedCompute");
      const isLT = window.App?.LinearTransform?.isActive?.();
      const tVal = window.App?.LinearTransform?.t;
      return {
        isLTActive: isLT,
        t: tVal,
        btnHtml: btn ? btn.innerHTML : null,
        btnBackground: btn ? btn.style.background : null,
        playbackHUDVisible: document.getElementById("sidebarTransformPlayback")?.style.display !== "none"
      };
    `);
    console.log("4. Transformation Active State:", transformActiveState);

    const screenshot1 = await send('Page.captureScreenshot', { format: 'png' });
    const artifactPath1 = "C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\verify_nori_space_transform_active.png";
    fs.writeFileSync(artifactPath1, Buffer.from(screenshot1.data, 'base64'));
    console.log("Saved active screenshot to:", artifactPath1);

    // 7. Nhấn Dừng mô phỏng
    await evalJson(`
      const btn = document.getElementById("btnMixedCompute");
      if (btn) btn.click();
      return true;
    `);
    await sleep(600);

    const transformStoppedState = await evalJson(`
      const btn = document.getElementById("btnMixedCompute");
      const isLT = window.App?.LinearTransform?.isActive?.();
      return {
        isLTActive: isLT,
        btnHtml: btn ? btn.innerHTML : null,
        btnBackground: btn ? btn.style.background : null
      };
    `);
    console.log("5. Transformation Stopped State:", transformStoppedState);

    const screenshot2 = await send('Page.captureScreenshot', { format: 'png' });
    const artifactPath2 = "C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81\\verify_nori_space_transform_stopped.png";
    fs.writeFileSync(artifactPath2, Buffer.from(screenshot2.data, 'base64'));
    console.log("Saved stopped screenshot to:", artifactPath2);

  } finally {
    browser.kill();
    server.close();
    try {
      fs.rmSync(userData, { recursive: true, force: true });
    } catch (e) {}
  }
}

main().catch(err => {
  console.error("Test error:", err);
  browser.kill();
  server.close();
  process.exit(1);
});
