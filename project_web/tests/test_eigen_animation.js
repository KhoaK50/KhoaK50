const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const HTTP_PORT = 5628;
const CDP_PORT = 9349;
const BASE_URL = `http://127.0.0.1:${HTTP_PORT}/frontend_v2/calculation.html`;
const ARTIFACT_DIR = "C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\4024b48f-75e3-49e7-8d4e-2dd03106df81";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function startStaticServer() {
  const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split("?")[0]);
    if (reqPath === "/") reqPath = "/frontend_v2/calculation.html";
    const filePath = path.join(PROJECT_ROOT, reqPath.replace(/^\//, ""));
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found: " + reqPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".html": "text/html; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".woff2": "font/woff2"
    };
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
  server.listen(HTTP_PORT);
  return server;
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.pending = new Map();
    this.consoleErrors = [];
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method === "Runtime.exceptionThrown") {
        this.consoleErrors.push(msg.params.exceptionDetails?.text || "Runtime exception");
      }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }
  async open() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }
  send(method, params = {}) {
    const id = this.id++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }
  async eval(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error("Eval exception: " + JSON.stringify(res.exceptionDetails));
    }
    return res.result ? res.result.value : undefined;
  }
  async screenshot(filePath) {
    const { data } = await this.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(filePath, Buffer.from(data, "base64"));
  }
  close() {
    try {
      this.ws.close();
    } catch (_) {}
  }
}

(async () => {
  const server = startStaticServer();
  const userDataDir = path.join(PROJECT_ROOT, ".tmp_edge_eigen_test");
  try {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  } catch (_) {}

  const edge = spawn(EDGE_PATH, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${CDP_PORT}`,
    "--window-size=1440,900",
    "about:blank"
  ]);

  let client;
  try {
    await sleep(1500);
    let pageTarget = null;
    for (let i = 0; i < 20; i++) {
      try {
        const targets = await getJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
        pageTarget = targets.find((t) => t.type === "page");
        if (pageTarget && pageTarget.webSocketDebuggerUrl) break;
      } catch (_) {}
      await sleep(500);
    }
    if (!pageTarget) throw new Error("No page target found");

    client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.open();
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    await client.send("Page.navigate", { url: BASE_URL });
    await sleep(3000);

    let ready = false;
    for (let i = 0; i < 30; i++) {
      try {
        ready = await client.eval(
          "typeof window.App !== 'undefined' && typeof window.App.EigenAnimator !== 'undefined' && typeof window.App.showExtraForm === 'function'"
        );
        if (ready) break;
      } catch (_) {}
      await sleep(500);
    }
    if (!ready) throw new Error("Timed out waiting for App.EigenAnimator");

    // 1. Mở sidebar (nếu đang đóng), chuyển sang Tab BÀI TOÁN và chọn bài toán 7 (topic6_eigen)
    const setupRes = await client.eval(`
      (() => {
        const controls = document.getElementById('controls');
        const fh = document.getElementById('floatingHamburger') || document.getElementById('hamburger');
        if (controls && controls.getBoundingClientRect().right <= 10 && fh) {
          fh.click();
        }
        const tabs = document.querySelectorAll('.sidebar-tabs .tab-btn');
        if (tabs[1] && !tabs[1].classList.contains('active')) tabs[1].click();

        const sel = document.getElementById('opExtraSelect');
        if (sel) {
          sel.value = 'topic6_eigen';
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Kiểm tra TUYỆT ĐỐI KHÔNG tự ý khởi tạo ma trận mặc định khi user chưa tạo
        const initialMatrixCount = App.matrixList ? App.matrixList.length : 0;
        const hasPresetButtons = !!(document.getElementById('presetEigenOnes') || document.getElementById('presetEigenSym'));

        // Tạo ma trận [[1, 3], [2, 1]] giống như người dùng tạo ở tab ĐỐI TƯỢNG
        const matItem = App.createMatrixItem(2, 2, [[1, 3], [2, 1]], [['1', '3'], ['2', '1']], 220, { isParametric: false, vars: [] });
        App.matrixList.push(matItem);
        if (typeof App.renderMatrixList === 'function') App.renderMatrixList();
        if (typeof App.refreshEigenMatrixDropdown === 'function') App.refreshEigenMatrixDropdown();

        document.getElementById('btnEigenCompute')?.click();

        const resBox = document.getElementById('result_eigen_info');
        return {
          initialMatrixCount,
          hasPresetButtons,
          matrixCount: App.matrixList ? App.matrixList.length : 0,
          selectedMatrixId: document.getElementById('eigenMatrixSelect')?.value || '',
          resText: resBox ? resBox.innerText.trim() : '',
          has3Buttons: !!(document.getElementById('btnEigenCompute') && document.getElementById('btnEigenAnimate') && document.getElementById('btnEigenSolution'))
        };
      })()
    `);
    console.log("1. Setup & Compute Result ([[1,3],[2,1]]):", setupRes);
    if (setupRes.initialMatrixCount !== 0) {
      throw new Error("Should NOT auto-create a default matrix when App.matrixList is empty! Found: " + setupRes.initialMatrixCount);
    }
    if (setupRes.hasPresetButtons) throw new Error("Preset buttons should be removed from #form-topic6_eigen");
    if (!setupRes.has3Buttons) throw new Error("Missing unified 3 buttons in #form-topic6_eigen");
    if (setupRes.matrixCount < 1) throw new Error("Matrix was not synced into App.matrixList");

    // 2. Bấm nút Trực quan (#btnEigenAnimate) và kiểm tra tính liên tục tự động chuyển bước 1 -> 2 -> 3
    await client.eval(`
      (() => {
        App.EigenAnimator.setSpeed(3.0);
        const btnAnim = document.getElementById('btnEigenAnimate');
        if (btnAnim) btnAnim.click();
      })()
    `);
    await sleep(3500);
    const autoTransitionRes = await client.eval(`
      (() => ({
        curPhase: App.EigenAnimator.getCurrentPhase(),
        progress: App.EigenAnimator._phaseProgress
      }))()
    `);
    console.log("2a. Auto-Transition Progress at 3.0x speed:", autoTransitionRes);
    if (autoTransitionRes.curPhase < 1) {
      throw new Error("Animation did not automatically transition past Step 1! State: " + JSON.stringify(autoTransitionRes));
    }

    // Đặt lại tốc độ 1.0x và chụp từng bước liền mạch của ma trận [[1, 3], [2, 1]]
    await client.eval(`
      (() => {
        App.EigenAnimator.setSpeed(1.0);
        App.EigenAnimator.pause();
        App.EigenAnimator._currentPhase = 0;
        App.EigenAnimator._phaseProgress = 1.0;
        App.EigenAnimator._applyVectorsForPhase(0, 1.0);
        App.EigenAnimator.updateDynamicStepText(0, 1.0);
        App.EigenAnimator._syncPhasePills(0);
        if (window.Vec2D) Vec2D.draw2DAllVectors();
      })()
    `);
    await sleep(250);
    await client.screenshot(path.join(ARTIFACT_DIR, "verify_eigen_cont_step1_init_axes.png"));

    await client.eval(`
      (() => {
        App.EigenAnimator._currentPhase = 1;
        App.EigenAnimator._phaseProgress = 1.0;
        App.EigenAnimator._applyVectorsForPhase(1, 1.0);
        App.EigenAnimator.updateDynamicStepText(1, 1.0);
        App.EigenAnimator._syncPhasePills(1);
        if (window.Vec2D) Vec2D.draw2DAllVectors();
      })()
    `);
    await sleep(250);
    await client.screenshot(path.join(ARTIFACT_DIR, "verify_eigen_cont_step2_transform.png"));

    await client.eval(`
      (() => {
        App.EigenAnimator._currentPhase = 2;
        App.EigenAnimator._phaseProgress = 1.0;
        App.EigenAnimator._applyVectorsForPhase(2, 1.0);
        App.EigenAnimator.updateDynamicStepText(2, 1.0);
        App.EigenAnimator._syncPhasePills(2);
        if (window.Vec2D) Vec2D.draw2DAllVectors();
      })()
    `);
    await sleep(250);
    await client.screenshot(path.join(ARTIFACT_DIR, "verify_eigen_cont_step3_eigen_grid.png"));

    const animState = await client.eval(`
      (() => ({
        isActive: App.EigenAnimator.isActive(),
        isBlocked: App.isInteractionBlocked(),
        tempEigenVecs: App.vectorList.filter(v => v._isEigenVector).map(v => ({ name: v.name, vec: v.vec, lambda: v.lambda })),
        stepTitle: document.getElementById('eigenStepTitle')?.innerText || '',
        stepDesc: document.getElementById('eigenStepDesc')?.innerText || ''
      }))()
    `);
    console.log("2. Animation State at Step 3:", animState);
    if (!animState.isActive || !animState.isBlocked) {
      throw new Error("EigenAnimator should be active and blocking interaction");
    }

    // 3. Kiểm tra mở Lời giải 2 Tab (#btnEigenSolution)
    const solState = await client.eval(`
      (() => {
        document.getElementById('btnEigenSolution').click();
        const overlay = document.getElementById('solutionOverlay');
        const isOpen = overlay ? overlay.classList.contains('is-open') : false;
        const tab1Text = document.getElementById('solutionBody')?.textContent || '';
        const tab2Btn = document.getElementById('solMethodEq');
        if (tab2Btn) tab2Btn.click();
        const tab2Text = document.getElementById('solutionBody')?.textContent || '';
        const btnClose = document.getElementById('btnCloseSolution');
        if (btnClose) btnClose.click();
        return {
          isOpen,
          hasTab1: tab1Text.includes('Pha 1'),
          hasTab2: tab2Text.includes('Pha 1') && tab2Text.includes('chéo hóa')
        };
      })()
    `);
    console.log("3. Solution Panel State:", solState);
    if (!solState.hasTab1 || !solState.hasTab2) {
      throw new Error("Eigen 2-tab solution failed to render properly: " + JSON.stringify(solState));
    }

    // 4. Kiểm tra các cơ chế tự động tắt (Auto-stop lifecycle hooks)
    const lifecycleRes = await client.eval(`
      (() => {
        // Đổi sang bài toán khác -> phải tự tắt EigenAnimator
        App.showExtraForm('coordinates');
        const stoppedOnTaskSwitch = !App.EigenAnimator.isActive() && document.getElementById('eigenAnimControls').style.display === 'none';
        const tempCleared = App.vectorList.filter(v => v._isEigenTemp).length === 0;

        // Mở lại topic6_eigen và chạy animation, sau đó chuyển sang tab ĐỐI TƯỢNG -> phải tự tắt
        App.showExtraForm('topic6_eigen');
        document.getElementById('btnEigenAnimate').click();
        const runningAgain = App.EigenAnimator.isActive();
        const tabs = document.querySelectorAll('.sidebar-tabs .tab-btn');
        if (tabs[0]) tabs[0].click();
        const stoppedOnTabSwitch = !App.EigenAnimator.isActive();

        // Chuyển lại tab BÀI TOÁN, bật animation rồi xóa ma trận -> phải tự tắt
        if (tabs[1]) tabs[1].click();
        document.getElementById('btnEigenAnimate').click();
        const runningBeforeDelete = App.EigenAnimator.isActive();
        App.clearAllMatrices();
        const stoppedOnMatrixClear = !App.EigenAnimator.isActive();

        return {
          stoppedOnTaskSwitch,
          tempCleared,
          runningAgain,
          stoppedOnTabSwitch,
          runningBeforeDelete,
          stoppedOnMatrixClear
        };
      })()
    `);
    console.log("4. Lifecycle Auto-Stop Verification:", lifecycleRes);
    if (
      !lifecycleRes.stoppedOnTaskSwitch ||
      !lifecycleRes.tempCleared ||
      !lifecycleRes.stoppedOnTabSwitch ||
      !lifecycleRes.stoppedOnMatrixClear
    ) {
      throw new Error("Lifecycle auto-stop failed: " + JSON.stringify(lifecycleRes));
    }

    // 5. Kiểm tra trực quan 3D (Ma trận 3x3: A = [[2, 1, 0], [1, 2, 0], [0, 0, -1]]) qua 3 bước
    await client.eval(`
      (() => {
        const tabs = document.querySelectorAll('.sidebar-tabs .tab-btn');
        if (tabs[1]) tabs[1].click();
        App.matrixList.push({
          id: 901,
          name: 'A3D',
          rows: 3,
          cols: 3,
          values: [
            ['2', '1', '0'],
            ['1', '2', '0'],
            ['0', '0', '-1']
          ]
        });
        if (typeof App.refreshEigenMatrixDropdown === 'function') {
          App.refreshEigenMatrixDropdown();
        }
        const sel = document.getElementById('eigenMatrixSelect');
        if (sel) {
          sel.value = '901';
          sel.dispatchEvent(new Event('change'));
        }
        document.getElementById('btnEigenAnimate').click();
        App.EigenAnimator.pause();

        // Bước 1 (t = 1.0): Lưới chuẩn & khối hộp đơn vị biến dạng + bóng Ghost e1, e2, e3
        App.EigenAnimator._currentPhase = 0;
        App.EigenAnimator._phaseProgress = 1.0;
        App.EigenAnimator._applyVectorsForPhase(0, 1.0);
        App.EigenAnimator.updateDynamicStepText(0, 1.0);
        App.EigenAnimator._syncPhasePills(0);
        if (window.Vec3D) Vec3D.hardRefresh3D(false);
      })()
    `);
    await sleep(350);
    await client.screenshot(path.join(ARTIFACT_DIR, "verify_eigen_3d_step1.png"));

    await client.eval(`
      (() => {
        // Bước 2 (t = 1.0): Trục bất biến 3D + vạch chia + bóng Ghost 1*v_i + trượt tới lambda_i*v_i
        App.EigenAnimator._currentPhase = 1;
        App.EigenAnimator._phaseProgress = 1.0;
        App.EigenAnimator._applyVectorsForPhase(1, 1.0);
        App.EigenAnimator.updateDynamicStepText(1, 1.0);
        App.EigenAnimator._syncPhasePills(1);
        if (window.Vec3D) Vec3D.hardRefresh3D(false);
      })()
    `);
    await sleep(350);
    await client.screenshot(path.join(ARTIFACT_DIR, "verify_eigen_3d_step2.png"));

    const state3D = await client.eval(`
      (() => {
        // Bước 3 (t = 1.0): Hệ lưới Cơ sở Vector riêng 3D & Khối hộp Chéo hóa [lambda_1*v1, lambda_2*v2, lambda_3*v3]
        App.EigenAnimator._currentPhase = 2;
        App.EigenAnimator._phaseProgress = 1.0;
        App.EigenAnimator._applyVectorsForPhase(2, 1.0);
        App.EigenAnimator.updateDynamicStepText(2, 1.0);
        App.EigenAnimator._syncPhasePills(2);
        if (window.Vec3D) Vec3D.hardRefresh3D(false);
        const grp = window.Vec3D?._mathGroup?.getObjectByName('eigenSubspace3D');
        return {
          mode: App.mode,
          has3DGroup: !!grp,
          childrenCount3D: grp ? grp.children.length : 0,
          stepDesc3D: document.getElementById('eigenStepDesc')?.innerText || ''
        };
      })()
    `);
    await sleep(350);
    await client.screenshot(path.join(ARTIFACT_DIR, "verify_eigen_3d_step3.png"));
    console.log("5. 3D Eigen Animation State:", state3D);
    if (state3D.mode !== "3D" || !state3D.has3DGroup || state3D.childrenCount3D < 15) {
      throw new Error("3D Eigen animation failed to render full 3D geometry: " + JSON.stringify(state3D));
    }

    if (client.consoleErrors.length > 0) {
      throw new Error("Console errors detected: " + client.consoleErrors.join("; "));
    }

    console.log("ALL EIGENVALUE & DIAGONALIZATION TESTS PASSED 100%!");
  } finally {
    if (client) client.close();
    edge.kill();
    server.close();
  }
})();
