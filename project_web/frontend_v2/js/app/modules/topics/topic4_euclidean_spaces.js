// =========================================================================
// topic4_euclidean_spaces.js - Module Chủ Đề 4: Không Gian Euclide
// Khảo sát sự trực giao và Thuật toán trực giao hóa Gram - Schmidt 2D/3D
// =========================================================================
(function () {
  window.App = window.App || {};

  // Trạng thái của module Không gian Euclide
  const gsState = {
    v1: [3, 1],
    v2: [2, 2],
    u1: [3, 1],
    u2: [-0.6, 1.8],
    e1: [0.9487, 0.3162],
    e2: [-0.3162, 0.9487],
    proj: [2.4, 0.8],
    showOriginal: true,
    showProjection: true,
    normalize: false,
    animProgress: 1.0,
    isAnimating: false,
    animStartTime: 0,
    animDuration: 900
  };

  // Các phép toán vector cơ bản
  function dotProduct(a, b) {
    return a[0] * b[0] + a[1] * b[1];
  }

  function norm(a) {
    return Math.sqrt(dotProduct(a, a));
  }

  function angleBetween(a, b) {
    const na = norm(a);
    const nb = norm(b);
    if (na < 1e-9 || nb < 1e-9) return 0;
    let cosVal = dotProduct(a, b) / (na * nb);
    cosVal = Math.max(-1, Math.min(1, cosVal));
    return Math.acos(cosVal) * (180 / Math.PI);
  }

  // Tính toán Gram - Schmidt cho 2 vector 2D
  function computeGramSchmidt() {
    const v1 = [Number(gsState.v1[0]) || 0, Number(gsState.v1[1]) || 0];
    const v2 = [Number(gsState.v2[0]) || 0, Number(gsState.v2[1]) || 0];

    // u1 = v1
    const u1 = [v1[0], v1[1]];
    const normU1Sq = dotProduct(u1, u1);

    // Hình chiếu của v2 lên u1
    let proj = [0, 0];
    let u2 = [v2[0], v2[1]];

    if (normU1Sq > 1e-9) {
      const coeff = dotProduct(v2, u1) / normU1Sq;
      proj = [coeff * u1[0], coeff * u1[1]];
      u2 = [v2[0] - proj[0], v2[1] - proj[1]];
    }

    // Chuẩn hóa thành e1, e2
    const nU1 = norm(u1);
    const nU2 = norm(u2);
    const e1 = nU1 > 1e-9 ? [u1[0] / nU1, u1[1] / nU1] : [0, 0];
    const e2 = nU2 > 1e-9 ? [u2[0] / nU2, u2[1] / nU2] : [0, 0];

    gsState.u1 = u1;
    gsState.u2 = u2;
    gsState.proj = proj;
    gsState.e1 = e1;
    gsState.e2 = e2;
  }

  // Hook vẽ đồ họa 2D trên Canvas của Viewer2D
  function drawGramSchmidtOnCanvas2D(ctx, gridInfo, logicalSize) {
    const cx = gridInfo.originPx.x;
    const cy = gridInfo.originPx.y;
    const px = gridInfo.pixelsPerUnit;

    const wX = (x) => cx + x * px;
    const wY = (y) => cy - y * px;

    ctx.save();

    // 1. Nếu bật chuẩn hóa, vẽ vòng tròn đơn vị bán kính r = 1 mờ
    if (gsState.normalize) {
      ctx.beginPath();
      ctx.arc(cx, cy, 1.0 * px, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(100, 116, 139, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const t = gsState.animProgress;

    // Tọa độ vector thứ 2 nội suy giữa v2 và u2 (hoặc e2)
    const targetVec2 = gsState.normalize ? gsState.e2 : gsState.u2;
    const targetVec1 = gsState.normalize ? gsState.e1 : gsState.u1;

    const curVec1 = [
      (1 - t) * gsState.v1[0] + t * targetVec1[0],
      (1 - t) * gsState.v1[1] + t * targetVec1[1]
    ];

    const curVec2 = [
      (1 - t) * gsState.v2[0] + t * targetVec2[0],
      (1 - t) * gsState.v2[1] + t * targetVec2[1]
    ];

    // 2. Vẽ vector gốc ban đầu (nét đứt xám nhạt)
    if (gsState.showOriginal && (t > 0 || gsState.normalize)) {
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2.0;

      // v1 gốc
      ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(wX(gsState.v1[0]), wY(gsState.v1[1]));
      ctx.stroke();

      // v2 gốc
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(wX(gsState.v2[0]), wY(gsState.v2[1]));
      ctx.stroke();
      ctx.setLineDash([]);

      // Nhãn v1, v2 gốc
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
      ctx.fillText("v1", wX(gsState.v1[0]) + 6, wY(gsState.v1[1]) - 4);
      ctx.fillText("v2", wX(gsState.v2[0]) + 6, wY(gsState.v2[1]) - 4);
    }

    // 3. Vẽ hình chiếu vuông góc nếu được bật
    if (gsState.showProjection && !gsState.normalize) {
      const prX = wX(gsState.proj[0]);
      const prY = wY(gsState.proj[1]);
      const v2X = wX(gsState.v2[0]);
      const v2Y = wY(gsState.v2[1]);

      // Đường hạ vuông góc nét đứt từ v2 xuống điểm chiếu
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(v2X, v2Y);
      ctx.lineTo(prX, prY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Điểm chiếu và vector chiếu trên phương u1
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(prX, prY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "600 10.5px system-ui, sans-serif";
      ctx.fillText("proj(v2)", prX + 6, prY + 12);
    }

    // Hàm phụ vẽ vector có mũi tên sắc nét
    function drawArrow(x0, y0, x1, y1, color, labelText, lineWidth) {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1e-4) return;

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth || 2.5;
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      // Mũi tên
      const headLen = Math.min(10, len * 0.35);
      const angle = Math.atan2(dy, dx);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(
        x1 - headLen * Math.cos(angle - Math.PI / 7),
        y1 - headLen * Math.sin(angle - Math.PI / 7)
      );
      ctx.lineTo(
        x1 - headLen * Math.cos(angle + Math.PI / 7),
        y1 - headLen * Math.sin(angle + Math.PI / 7)
      );
      ctx.closePath();
      ctx.fill();

      if (labelText) {
        ctx.font = "700 12px system-ui, sans-serif";
        ctx.fillStyle = color;
        ctx.fillText(labelText, x1 + 8, y1 - 4);
      }
    }

    // 4. Vẽ vector trực giao / trực chuẩn thứ nhất
    const label1 = gsState.normalize ? "e1" : "u1";
    drawArrow(cx, cy, wX(curVec1[0]), wY(curVec1[1]), "#0090ff", label1, 3.0);

    // 5. Vẽ vector trực giao / trực chuẩn thứ hai
    const label2 = gsState.normalize ? "e2" : "u2";
    drawArrow(cx, cy, wX(curVec2[0]), wY(curVec2[1]), "#10b981", label2, 3.0);

    // 6. Vẽ ký hiệu góc vuông 90 độ tại gốc nếu đã trực giao hoàn tất
    if (t >= 0.98) {
      const n1 = norm(curVec1);
      const n2 = norm(curVec2);
      if (n1 > 1e-4 && n2 > 1e-4) {
        const d1x = (curVec1[0] / n1) * 14;
        const d1y = (-curVec1[1] / n1) * 14;
        const d2x = (curVec2[0] / n2) * 14;
        const d2y = (-curVec2[1] / n2) * 14;

        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + d1x, cy + d1y);
        ctx.lineTo(cx + d1x + d2x, cy + d1y + d2y);
        ctx.lineTo(cx + d2x, cy + d2y);
        ctx.stroke();

        // Chấm nhỏ bên trong góc vuông
        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.arc(cx + 0.5 * (d1x + d2x), cy + 0.5 * (d1y + d2y), 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // Hoạt họa chuyển động nắn thẳng vector
  function animateGramSchmidt() {
    gsState.isAnimating = true;
    gsState.animStartTime = performance.now();

    function step(now) {
      const elapsed = now - gsState.animStartTime;
      let p = elapsed / gsState.animDuration;
      if (p > 1.0) p = 1.0;

      // Hàm gia tốc mượt mà cubic ease-out
      const ease = 1 - Math.pow(1 - p, 3);
      gsState.animProgress = ease;

      if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
        Vec2D.draw2DAllVectors();
      }

      if (p < 1.0 && gsState.isAnimating) {
        requestAnimationFrame(step);
      } else {
        gsState.isAnimating = false;
        gsState.animProgress = 1.0;
        updateInfoPanel();
        if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
          Vec2D.draw2DAllVectors();
        }
      }
    }

    requestAnimationFrame(step);
  }

  // Cập nhật bảng kết quả đọc nhanh bên dưới form
  function updateInfoPanel() {
    const box = document.getElementById("result_gs_info");
    if (!box) return;

    box.style.display = "block";
    const v1 = gsState.v1;
    const v2 = gsState.v2;
    const u1 = gsState.u1;
    const u2 = gsState.u2;
    const e1 = gsState.e1;
    const e2 = gsState.e2;
    const dot = dotProduct(v1, v2);
    const ang = angleBetween(v1, v2).toFixed(1);
    const checkDotOrth = Math.abs(dotProduct(u1, u2)).toFixed(4);

    box.innerHTML = `
      <div style="font-weight: 700; color: var(--fg); margin-bottom: 6px; font-size: 12px;">
        Kết quả trực giao hóa Gram - Schmidt:
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11.5px; color: var(--fg);">
        <div><span style="color: var(--muted);">Vector v1:</span> [${v1[0]}, ${v1[1]}]</div>
        <div><span style="color: var(--muted);">Vector v2:</span> [${v2[0]}, ${v2[1]}]</div>
        <div><span style="color: var(--muted);">Góc ban đầu:</span> ${ang}°</div>
        <div><span style="color: var(--muted);">Tích vô hướng:</span> ${dot}</div>
        <div style="grid-column: span 2; border-top: 1px solid var(--border); padding-top: 5px; margin-top: 2px;">
          <span style="color: #0090ff; font-weight: 600;">Cơ sở trực giao u1, u2:</span><br>
          u1 = [${u1[0].toFixed(2)}, ${u1[1].toFixed(2)}], 
          u2 = [${u2[0].toFixed(2)}, ${u2[1].toFixed(2)}]<br>
          <span style="color: var(--muted); font-size: 11px;">Tích vô hướng kiểm tra: 〈u1, u2〉 = ${checkDotOrth}</span>
        </div>
        <div style="grid-column: span 2; border-top: 1px solid var(--border); padding-top: 5px;">
          <span style="color: #10b981; font-weight: 600;">Cơ sở trực chuẩn e1, e2:</span><br>
          e1 = [${e1[0].toFixed(3)}, ${e1[1].toFixed(3)}], 
          e2 = [${e2[0].toFixed(3)}, ${e2[1].toFixed(3)}]
        </div>
      </div>
    `;
  }

  // Bộ sinh lời giải LaTeX KaTeX sư phạm từng bước chi tiết
  function generateGramSchmidtSolution() {
    computeGramSchmidt();

    const v1 = gsState.v1;
    const v2 = gsState.v2;
    const u1 = gsState.u1;
    const u2 = gsState.u2;
    const e1 = gsState.e1;
    const e2 = gsState.e2;
    const proj = gsState.proj;

    const dotV2U1 = dotProduct(v2, u1);
    const normU1Sq = dotProduct(u1, u1);
    const normU1 = Math.sqrt(normU1Sq);
    const normU2 = norm(u2);
    const coeff = normU1Sq > 1e-9 ? (dotV2U1 / normU1Sq).toFixed(4) : "0";

    const html = `
      <div style="padding: 6px 0; font-size: 13.5px; line-height: 1.7; color: var(--fg);">
        <p style="margin-bottom: 12px;">
          Xét hệ gồm 2 vector trong không gian Euclide $\\mathbb{R}^2$ với tích vô hướng chính tắc:
          $$\\vec{v}_1 = \\begin{bmatrix} ${v1[0]} \\\\ ${v1[1]} \\end{bmatrix}, \\quad \\vec{v}_2 = \\begin{bmatrix} ${v2[0]} \\\\ ${v2[1]} \\end{bmatrix}$$
        </p>

        <div style="background: var(--bg-hover); border-left: 3px solid var(--primary-base); padding: 10px 14px; margin-bottom: 14px; border-radius: 2px;">
          <strong>Mục tiêu:</strong> Sử dụng thuật toán trực giao hóa Gram - Schmidt để biến đổi hệ $\\{\\vec{v}_1, \\vec{v}_2\\}$ thành cơ sở trực giao $\\{\\vec{u}_1, \\vec{u}_2\\}$ và chuẩn hóa thành cơ sở trực chuẩn $\\{\\vec{e}_1, \\vec{e}_2\\}$.
        </div>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 1: Chọn vector trực giao thứ nhất
        </h4>
        <p>
          Ta giữ nguyên hướng của vector ban đầu thứ nhất:
          $$\\vec{u}_1 = \\vec{v}_1 = \\begin{bmatrix} ${u1[0]} \\\\ ${u1[1]} \\end{bmatrix}$$
          Bình phương độ dài của $\\vec{u}_1$:
          $$\\|\\vec{u}_1\\|^2 = \\langle \\vec{u}_1, \\vec{u}_1 \\rangle = (${u1[0]})^2 + (${u1[1]})^2 = ${normU1Sq.toFixed(2)}$$
          $$\\|\\vec{u}_1\\| = \\sqrt{${normU1Sq.toFixed(2)}} \\approx ${normU1.toFixed(4)}$$
        </p>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 2: Tìm hình chiếu của vector thứ hai
        </h4>
        <p>
          Tích vô hướng giữa $\\vec{v}_2$ và $\\vec{u}_1$:
          $$\\langle \\vec{v}_2, \\vec{u}_1 \\rangle = (${v2[0]})(${u1[0]}) + (${v2[1]})(${u1[1]}) = ${dotV2U1.toFixed(2)}$$
          Hình chiếu trực giao của $\\vec{v}_2$ lên phương của $\\vec{u}_1$:
          $$\\text{proj}_{\\vec{u}_1}(\\vec{v}_2) = \\frac{\\langle \\vec{v}_2, \\vec{u}_1 \\rangle}{\\|\\vec{u}_1\\|^2} \\vec{u}_1 = \\frac{${dotV2U1.toFixed(2)}}{${normU1Sq.toFixed(2)}} \\begin{bmatrix} ${u1[0]} \\\\ ${u1[1]} \\end{bmatrix} \\approx ${coeff} \\begin{bmatrix} ${u1[0]} \\\\ ${u1[1]} \\end{bmatrix} = \\begin{bmatrix} ${proj[0].toFixed(3)} \\\\ ${proj[1].toFixed(3)} \\end{bmatrix}$$
        </p>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 3: Lấy thành phần trực giao thứ hai
        </h4>
        <p>
          Vector trực giao $\\vec{u}_2$ nhận được bằng cách loại bỏ hình chiếu dọc theo $\\vec{u}_1$:
          $$\\vec{u}_2 = \\vec{v}_2 - \\text{proj}_{\\vec{u}_1}(\\vec{v}_2) = \\begin{bmatrix} ${v2[0]} \\\\ ${v2[1]} \\end{bmatrix} - \\begin{bmatrix} ${proj[0].toFixed(3)} \\\\ ${proj[1].toFixed(3)} \\end{bmatrix} = \\begin{bmatrix} ${u2[0].toFixed(3)} \\\\ ${u2[1].toFixed(3)} \\end{bmatrix}$$
          Kiểm tra tính trực giao:
          $$\\langle \\vec{u}_1, \\vec{u}_2 \\rangle = (${u1[0]})(${u2[0].toFixed(3)}) + (${u1[1]})(${u2[1].toFixed(3)}) = ${(dotProduct(u1, u2)).toFixed(4)} \\approx 0$$
          Do đó, hai vector $\\vec{u}_1$ và $\\vec{u}_2$ hoàn toàn trực giao với nhau.
        </p>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 4: Chuẩn hóa thành cơ sở trực chuẩn
        </h4>
        <p>
          Độ dài của $\\vec{u}_2$:
          $$\\|\\vec{u}_2\\| = \\sqrt{(${u2[0].toFixed(3)})^2 + (${u2[1].toFixed(3)})^2} \\approx ${normU2.toFixed(4)}$$
          Chia từng vector cho độ dài của chính nó để nhận các vector đơn vị trực chuẩn:
          $$\\vec{e}_1 = \\frac{\\vec{u}_1}{\\|\\vec{u}_1\\|} = \\begin{bmatrix} ${e1[0].toFixed(4)} \\\\ ${e1[1].toFixed(4)} \\end{bmatrix}, \\quad \\vec{e}_2 = \\frac{\\vec{u}_2}{\\|\\vec{u}_2\\|} = \\begin{bmatrix} ${e2[0].toFixed(4)} \\\\ ${e2[1].toFixed(4)} \\end{bmatrix}$$
        </p>

        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); padding: 12px; border-radius: 2px; margin-top: 14px;">
          <strong style="color: #10b981;">Kết luận:</strong><br>
          Cơ sở trực giao nhận được là: $\\mathcal{B}_{ort} = \\left\\{ \\begin{bmatrix} ${u1[0].toFixed(2)} \\\\ ${u1[1].toFixed(2)} \\end{bmatrix}, \\begin{bmatrix} ${u2[0].toFixed(2)} \\\\ ${u2[1].toFixed(2)} \\end{bmatrix} \\right\\}$<br>
          Cơ sở trực chuẩn tương ứng là: $\\mathcal{B}_{norm} = \\left\\{ \\begin{bmatrix} ${e1[0].toFixed(3)} \\\\ ${e1[1].toFixed(3)} \\end{bmatrix}, \\begin{bmatrix} ${e2[0].toFixed(3)} \\\\ ${e2[1].toFixed(3)} \\end{bmatrix} \\right\\}$
        </div>
      </div>
    `;

    if (window.App && typeof App.openCustomSolution === "function") {
      App.openCustomSolution("Thuật Toán Trực Giao Hóa Gram - Schmidt", html);
    } else {
      const solBody = document.getElementById("solutionBody");
      const solOverlay = document.getElementById("solutionOverlay");
      const solTitle = document.getElementById("solTitleText");
      if (solTitle) solTitle.textContent = "Thuật Toán Trực Giao Hóa Gram - Schmidt";
      if (solBody) solBody.innerHTML = html;
      if (solOverlay) {
        solOverlay.classList.add("is-open");
        solOverlay.setAttribute("aria-hidden", "false");
      }
      if (window.renderMathInElement) {
        renderMathInElement(solBody, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "\\[", right: "\\]", display: true },
            { left: "\\(", right: "\\)", display: false },
            { left: "$", right: "$", display: false }
          ]
        });
      }
    }
  }

  // Module định nghĩa cho Chủ đề 4
  const Topic4Module = {
    _isInitialized: false,

    init: function () {
      if (this._isInitialized) return;
      const btnOrth = document.getElementById("btnGSOrthogonalize");
      if (!btnOrth) return;
      this._isInitialized = true;

      // Nút Preset
      const p1 = document.getElementById("presetGS45");
      const p2 = document.getElementById("presetGSNarrow");
      const p3 = document.getElementById("presetGSGeneral");

      const clearActivePill = () => {
        [p1, p2, p3].forEach((b) => {
          if (b) b.classList.remove("active");
        });
      };

      const syncInputsFromState = () => {
        const x1 = document.getElementById("gs_v1_x");
        const y1 = document.getElementById("gs_v1_y");
        const x2 = document.getElementById("gs_v2_x");
        const y2 = document.getElementById("gs_v2_y");
        if (x1) x1.value = gsState.v1[0];
        if (y1) y1.value = gsState.v1[1];
        if (x2) x2.value = gsState.v2[0];
        if (y2) y2.value = gsState.v2[1];
      };

      if (p1) {
        p1.addEventListener("click", () => {
          clearActivePill();
          p1.classList.add("active");
          gsState.v1 = [3, 1];
          gsState.v2 = [2, 2];
          syncInputsFromState();
          this.execute();
        });
      }

      if (p2) {
        p2.addEventListener("click", () => {
          clearActivePill();
          p2.classList.add("active");
          gsState.v1 = [4, 0];
          gsState.v2 = [3, 3];
          syncInputsFromState();
          this.execute();
        });
      }

      if (p3) {
        p3.addEventListener("click", () => {
          clearActivePill();
          p3.classList.add("active");
          gsState.v1 = [2, 3];
          gsState.v2 = [-1, 2];
          syncInputsFromState();
          this.execute();
        });
      }

      // Lắng nghe thay đổi tọa độ
      const bindCoordChange = (id, vecIndex, coordIndex) => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener("input", (e) => {
            const val = parseFloat(e.target.value) || 0;
            if (vecIndex === 1) gsState.v1[coordIndex] = val;
            if (vecIndex === 2) gsState.v2[coordIndex] = val;
            this.execute();
          });
        }
      };

      bindCoordChange("gs_v1_x", 1, 0);
      bindCoordChange("gs_v1_y", 1, 1);
      bindCoordChange("gs_v2_x", 2, 0);
      bindCoordChange("gs_v2_y", 2, 1);

      // Checkbox các lớp hiển thị
      const chkOrig = document.getElementById("chkGSShowOrig");
      if (chkOrig) {
        chkOrig.addEventListener("change", (e) => {
          gsState.showOriginal = e.target.checked;
          if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
        });
      }

      const chkProj = document.getElementById("chkGSShowProj");
      if (chkProj) {
        chkProj.addEventListener("change", (e) => {
          gsState.showProjection = e.target.checked;
          if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
        });
      }

      const chkNorm = document.getElementById("chkGSNormalize");
      if (chkNorm) {
        chkNorm.addEventListener("change", (e) => {
          gsState.normalize = e.target.checked;
          this.execute();
        });
      }

      // Nút Trực giao hóa (chạy hoạt họa nắn góc)
      btnOrth.addEventListener("click", () => {
        computeGramSchmidt();
        gsState.animProgress = 0.0;
        animateGramSchmidt();
      });

      // Nút Lời giải
      const btnSol = document.getElementById("btnGSSolution");
      if (btnSol) {
        btnSol.addEventListener("click", generateGramSchmidtSolution);
      }
    },

    execute: function () {
      if (!this._isInitialized) this.init();

      const x1 = document.getElementById("gs_v1_x");
      const y1 = document.getElementById("gs_v1_y");
      const x2 = document.getElementById("gs_v2_x");
      const y2 = document.getElementById("gs_v2_y");
      if (x1 && !isNaN(parseFloat(x1.value))) gsState.v1[0] = parseFloat(x1.value);
      if (y1 && !isNaN(parseFloat(y1.value))) gsState.v1[1] = parseFloat(y1.value);
      if (x2 && !isNaN(parseFloat(x2.value))) gsState.v2[0] = parseFloat(x2.value);
      if (y2 && !isNaN(parseFloat(y2.value))) gsState.v2[1] = parseFloat(y2.value);

      computeGramSchmidt();
      gsState.animProgress = 1.0;
      App.custom2DDrawHook = drawGramSchmidtOnCanvas2D;
      updateInfoPanel();

      if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
        Vec2D.draw2DAllVectors();
      }
    },

    onTaskSelect: function (taskId) {
      if (taskId === "topic4_gram_schmidt" || taskId === "s21" || taskId === "topic4_orthogonality" || taskId === "s20") {
        this.execute();
      } else {
        if (App.custom2DDrawHook === drawGramSchmidtOnCanvas2D) {
          App.custom2DDrawHook = null;
        }
      }
    }
  };

  if (typeof App.registerTopicModule === "function") {
    App.registerTopicModule("t4", Topic4Module);
  } else {
    window.addEventListener("DOMContentLoaded", function () {
      if (typeof App.registerTopicModule === "function") {
        App.registerTopicModule("t4", Topic4Module);
      }
    });
  }
})();
