// =========================================================================
// topic6_eigenvalues_eigenvectors.js - Module Chủ Đề 6: Trị Riêng & Vector Riêng
// Khảo sát Trị riêng, Vector riêng, Không gian riêng và Chéo hóa ma trận 2D
// =========================================================================
(function () {
  window.App = window.App || {};

  // Trạng thái của module Trị riêng & Vector riêng
  const eigenState = {
    matrix: [
      [3, 1],
      [0, 2]
    ],
    trace: 5,
    det: 6,
    delta: 1,
    isComplex: false,
    eigenvalues: [3, 2],
    eigenvectors: [
      [1, 0],
      [-1, 1]
    ],
    isDiagonalizable: true,
    showEigenspaces: true,
    showTransformed: true,
    showUnitCircle: true,
    isSweeping: false,
    sweepAngle: 0,
    sweepAnimId: null
  };

  // Tính toán trị riêng và vector riêng của ma trận 2x2
  function computeEigen() {
    const a = Number(eigenState.matrix[0][0]) || 0;
    const b = Number(eigenState.matrix[0][1]) || 0;
    const c = Number(eigenState.matrix[1][0]) || 0;
    const d = Number(eigenState.matrix[1][1]) || 0;

    const tr = a + d;
    const det = a * d - b * c;
    const delta = tr * tr - 4 * det;

    eigenState.trace = tr;
    eigenState.det = det;
    eigenState.delta = delta;

    // 1. Trường hợp trị riêng phức (phép quay thuần túy)
    if (delta < -1e-6) {
      eigenState.isComplex = true;
      const alpha = tr / 2;
      const beta = Math.sqrt(-delta) / 2;
      eigenState.eigenvalues = [
        { real: alpha, imag: beta },
        { real: alpha, imag: -beta }
      ];
      eigenState.eigenvectors = [];
      eigenState.isDiagonalizable = false;
      return;
    }

    eigenState.isComplex = false;

    // 2. Hai nghiệm thực phân biệt hoặc nghiệm kép
    let l1 = 0;
    let l2 = 0;
    if (Math.abs(delta) <= 1e-6) {
      l1 = tr / 2;
      l2 = tr / 2;
    } else {
      l1 = (tr + Math.sqrt(delta)) / 2;
      l2 = (tr - Math.sqrt(delta)) / 2;
    }

    eigenState.eigenvalues = [l1, l2];

    // Tìm vector riêng tương ứng với từng trị riêng: (A - lambda I)v = 0
    function findEigenvector(lambdaVal) {
      const m11 = a - lambdaVal;
      const m12 = b;
      const m21 = c;
      const m22 = d - lambdaVal;

      let vx = 0;
      let vy = 0;

      if (Math.abs(m12) > 1e-6) {
        vx = -m12;
        vy = m11;
      } else if (Math.abs(m21) > 1e-6) {
        vx = m22;
        vy = -m21;
      } else if (Math.abs(m11) > 1e-6) {
        vx = 0;
        vy = 1;
      } else if (Math.abs(m22) > 1e-6) {
        vx = 1;
        vy = 0;
      } else {
        vx = 1;
        vy = 0;
      }

      const len = Math.sqrt(vx * vx + vy * vy);
      return len > 1e-7 ? [vx / len, vy / len] : [1, 0];
    }

    const v1 = findEigenvector(l1);
    let v2 = findEigenvector(l2);

    // Nếu trị riêng kép, kiểm tra ma trận có bội hình học bằng 2 không
    if (Math.abs(l1 - l2) <= 1e-6) {
      const isScalarIdentity = Math.abs(b) < 1e-6 && Math.abs(c) < 1e-6 && Math.abs(a - d) < 1e-6;
      if (isScalarIdentity) {
        eigenState.eigenvectors = [
          [1, 0],
          [0, 1]
        ];
        eigenState.isDiagonalizable = true;
      } else {
        eigenState.eigenvectors = [v1];
        eigenState.isDiagonalizable = false;
      }
    } else {
      // Đảm bảo hướng vector trực quan sạch đẹp
      if (v1[0] < 0 || (Math.abs(v1[0]) < 1e-6 && v1[1] < 0)) {
        v1[0] = -v1[0];
        v1[1] = -v1[1];
      }
      if (v2[0] < 0 || (Math.abs(v2[0]) < 1e-6 && v2[1] < 0)) {
        v2[0] = -v2[0];
        v2[1] = -v2[1];
      }
      eigenState.eigenvectors = [v1, v2];
      eigenState.isDiagonalizable = true;
    }
  }

  // Hook vẽ đồ họa 2D trực quan trên Canvas của Viewer2D
  function drawEigenOnCanvas2D(ctx, gridInfo, logicalSize) {
    const cx = gridInfo.originPx.x;
    const cy = gridInfo.originPx.y;
    const px = gridInfo.pixelsPerUnit;

    const wX = (x) => cx + x * px;
    const wY = (y) => cy - y * px;

    ctx.save();

    // 1. Vẽ đường tròn đơn vị tham chiếu nếu được bật
    if (eigenState.showUnitCircle) {
      ctx.beginPath();
      ctx.arc(cx, cy, 1.0 * px, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(100, 116, 139, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
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
        ctx.font = "700 11.5px system-ui, sans-serif";
        ctx.fillStyle = color;
        ctx.fillText(labelText, x1 + 8, y1 - 4);
      }
    }

    // 2. Trường hợp trị riêng thực
    if (!eigenState.isComplex && eigenState.eigenvectors.length > 0) {
      const colors = ["#0090ff", "#10b981"];
      const farSpan = 35;

      eigenState.eigenvectors.forEach((v, idx) => {
        const lVal = eigenState.eigenvalues[idx] || eigenState.eigenvalues[0];
        const color = colors[idx % colors.length];

        // A. Đường thẳng không gian riêng E_lambda kéo dài qua màn hình
        if (eigenState.showEigenspaces) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(wX(-farSpan * v[0]), wY(-farSpan * v[1]));
          ctx.lineTo(wX(farSpan * v[0]), wY(farSpan * v[1]));
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.font = "600 11px system-ui, sans-serif";
          ctx.fillStyle = color;
          ctx.fillText(`E_λ${idx + 1}`, wX(3.5 * v[0]) + 6, wY(3.5 * v[1]) - 4);
        }

        // B. Vector riêng đơn vị v_i
        const tipX = wX(v[0]);
        const tipY = wY(v[1]);
        drawArrow(cx, cy, tipX, tipY, color, `v${idx + 1}`, 3.0);

        // C. Vector ảnh A v_i = lambda v_i sau biến đổi
        if (eigenState.showTransformed) {
          const avX = wX(lVal * v[0]);
          const avY = wY(lVal * v[1]);
          // Vẽ vector ảnh hơi nhạt hơn hoặc nét chấm để so sánh độ co giãn
          ctx.setLineDash([3, 2]);
          drawArrow(cx, cy, avX, avY, color, `Av${idx + 1} = ${lVal.toFixed(1)}v${idx + 1}`, 2.0);
          ctx.setLineDash([]);
        }
      });
    }

    // 3. Trường hợp trị riêng phức
    if (eigenState.isComplex) {
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.fillStyle = "#f59e0b";
      ctx.fillText("Trị riêng phức: Phép quay không có hướng bất biến thực", cx - 140, cy - 30);
    }

    // 4. Minh họa quét vector thử nghiệm tìm hướng bất biến
    if (eigenState.isSweeping) {
      const rad = eigenState.sweepAngle;
      const x = Math.cos(rad);
      const y = Math.sin(rad);

      const a = eigenState.matrix[0][0];
      const b = eigenState.matrix[0][1];
      const c = eigenState.matrix[1][0];
      const d = eigenState.matrix[1][1];

      const ax = a * x + b * y;
      const ay = c * x + d * y;

      // Vector thử nghiệm x
      drawArrow(cx, cy, wX(x), wY(y), "#f59e0b", "x", 2.5);

      // Vector ảnh Ax
      drawArrow(cx, cy, wX(ax), wY(ay), "#a855f7", "Ax", 2.5);

      // Kiểm tra chập cùng phương: tích có hướng x * ay - y * ax gần bằng 0
      const cross = Math.abs(x * ay - y * ax);
      if (cross < 0.08) {
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.arc(wX(x), wY(y), 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = "700 11px system-ui, sans-serif";
        ctx.fillStyle = "#10b981";
        ctx.fillText("Hướng bất biến!", wX(x) + 12, wY(y) - 6);
      }
    }

    ctx.restore();
  }

  // Vòng lặp animation quét hướng bất biến
  function sweepTick() {
    if (!eigenState.isSweeping) return;

    eigenState.sweepAngle += 0.025;
    if (eigenState.sweepAngle >= Math.PI * 2) {
      eigenState.sweepAngle = 0;
    }

    if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
      Vec2D.draw2DAllVectors();
    }

    eigenState.sweepAnimId = requestAnimationFrame(sweepTick);
  }

  // Cập nhật bảng kết quả đọc nhanh bên dưới form
  function updateInfoPanel() {
    const box = document.getElementById("result_eigen_info");
    if (!box) return;

    box.style.display = "block";
    const tr = eigenState.trace;
    const det = eigenState.det;
    const delta = eigenState.delta;

    let evalText = "";
    let evecText = "";
    let diagText = "";

    if (eigenState.isComplex) {
      const alpha = (tr / 2).toFixed(2);
      const beta = (Math.sqrt(-delta) / 2).toFixed(2);
      evalText = `λ1,2 = ${alpha} ± ${beta}i (Cặp phức liên hợp)`;
      evecText = "Không có vector riêng thực trong R^2";
      diagText = "Không thể chéo hóa trên trường số thực R";
    } else {
      const l1 = eigenState.eigenvalues[0].toFixed(2);
      const l2 = eigenState.eigenvalues[1].toFixed(2);
      evalText = `λ1 = ${l1}, λ2 = ${l2}`;

      if (eigenState.eigenvectors.length >= 2) {
        const v1 = eigenState.eigenvectors[0];
        const v2 = eigenState.eigenvectors[1];
        evecText = `v1 = [${v1[0].toFixed(2)}, ${v1[1].toFixed(2)}], v2 = [${v2[0].toFixed(2)}, ${v2[1].toFixed(2)}]`;
        diagText = "Chéo hóa được (Có đủ 2 vector riêng độc lập tuyến tính)";
      } else if (eigenState.eigenvectors.length === 1) {
        const v1 = eigenState.eigenvectors[0];
        evecText = `v1 = [${v1[0].toFixed(2)}, ${v1[1].toFixed(2)}] (Chỉ có 1 chiều)`;
        diagText = "Không thể chéo hóa (Bội hình học < Bội đại số)";
      }
    }

    box.innerHTML = `
      <div style="font-weight: 700; color: var(--fg); margin-bottom: 6px; font-size: 12px;">
        Kết quả Trị riêng và Vector riêng:
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11.5px; color: var(--fg);">
        <div><span style="color: var(--muted);">Vết ma trận tr(A):</span> ${tr.toFixed(2)}</div>
        <div><span style="color: var(--muted);">Định thức det(A):</span> ${det.toFixed(2)}</div>
        <div style="grid-column: span 2; border-top: 1px solid var(--border); padding-top: 5px; margin-top: 2px;">
          <span style="color: #0090ff; font-weight: 600;">Trị riêng:</span> ${evalText}
        </div>
        <div style="grid-column: span 2;">
          <span style="color: #10b981; font-weight: 600;">Vector riêng:</span> ${evecText}
        </div>
        <div style="grid-column: span 2; border-top: 1px solid var(--border); padding-top: 5px;">
          <span style="color: var(--muted);">Tính chéo hóa:</span> ${diagText}
        </div>
      </div>
    `;
  }

  // Bộ sinh lời giải LaTeX KaTeX sư phạm từng bước chi tiết
  function generateEigenSolution() {
    computeEigen();

    const a = eigenState.matrix[0][0];
    const b = eigenState.matrix[0][1];
    const c = eigenState.matrix[1][0];
    const d = eigenState.matrix[1][1];
    const tr = eigenState.trace;
    const det = eigenState.det;
    const delta = eigenState.delta;

    let eigenContent = "";
    if (eigenState.isComplex) {
      const alpha = (tr / 2).toFixed(3);
      const beta = (Math.sqrt(-delta) / 2).toFixed(3);
      eigenContent = `
        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 2: Tìm các nghiệm trị riêng
        </h4>
        <p>
          Biệt thức $\\Delta = (${tr})^2 - 4(${det}) = ${delta.toFixed(2)} < 0$.<br>
          Phương trình không có nghiệm thực mà có cặp nghiệm phức liên hợp:
          $$\\lambda_{1,2} = ${alpha} \\pm ${beta}i$$
          Vì không có trị riêng thực, không tồn tại vector riêng thực nào trong $\\mathbb{R}^2$. Ánh xạ đại diện cho một phép co giãn kết hợp phép quay không gian.
        </p>
        <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); padding: 12px; border-radius: 2px; margin-top: 14px;">
          <strong style="color: #f59e0b;">Kết luận:</strong><br>
          Ma trận không thể chéo hóa trên trường số thực $\\mathbb{R}$.
        </div>
      `;
    } else {
      const l1 = eigenState.eigenvalues[0];
      const l2 = eigenState.eigenvalues[1];

      let v1Html = "";
      let v2Html = "";
      let diagHtml = "";

      if (eigenState.eigenvectors.length >= 1) {
        const v1 = eigenState.eigenvectors[0];
        v1Html = `
          <p>
            <strong>Với $\\lambda_1 = ${l1.toFixed(2)}$:</strong> Ta giải hệ $(A - ${l1.toFixed(2)}I)\\mathbf{v} = \\mathbf{0}$:
            $$\\begin{bmatrix} ${a - l1.toFixed(2)} & ${b} \\\\ ${c} & ${d - l1.toFixed(2)} \\end{bmatrix} \\begin{bmatrix} x \\\\ y \\end{bmatrix} = \\begin{bmatrix} 0 \\\\ 0 \\end{bmatrix}$$
            Ta chọn một vector riêng đại diện: $\\vec{v}_1 = \\begin{bmatrix} ${v1[0].toFixed(3)} \\\\ ${v1[1].toFixed(3)} \\end{bmatrix}$. Không gian riêng tương ứng là $E_{\\lambda_1} = \\text{span}\\{\\vec{v}_1\\}$.
          </p>
        `;
      }

      if (eigenState.eigenvectors.length >= 2) {
        const v2 = eigenState.eigenvectors[1];
        v2Html = `
          <p>
            <strong>Với $\\lambda_2 = ${l2.toFixed(2)}$:</strong> Ta giải hệ $(A - ${l2.toFixed(2)}I)\\mathbf{v} = \\mathbf{0}$:
            $$\\begin{bmatrix} ${a - l2.toFixed(2)} & ${b} \\\\ ${c} & ${d - l2.toFixed(2)} \\end{bmatrix} \\begin{bmatrix} x \\\\ y \\end{bmatrix} = \\begin{bmatrix} 0 \\\\ 0 \\end{bmatrix}$$
            Ta chọn một vector riêng đại diện: $\\vec{v}_2 = \\begin{bmatrix} ${v2[0].toFixed(3)} \\\\ ${v2[1].toFixed(3)} \\end{bmatrix}$. Không gian riêng tương ứng là $E_{\\lambda_2} = \\text{span}\\{\\vec{v}_2\\}$.
          </p>
        `;

        const v1 = eigenState.eigenvectors[0];
        diagHtml = `
          <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
            Bước 4: Chéo hóa ma trận
          </h4>
          <p>
            Vì có 2 vector riêng độc lập tuyến tính, ma trận $A$ chéo hóa được.<br>
            Ma trận làm chéo $P$ và ma trận chéo $D$:
            $$P = \\begin{bmatrix} \\vec{v}_1 & \\vec{v}_2 \\end{bmatrix} = \\begin{bmatrix} ${v1[0].toFixed(2)} & ${v2[0].toFixed(2)} \\\\ ${v1[1].toFixed(2)} & ${v2[1].toFixed(2)} \\end{bmatrix}, \\quad D = \\begin{bmatrix} ${l1.toFixed(2)} & 0 \\\\ 0 & ${l2.toFixed(2)} \\end{bmatrix}$$
            Hệ thức chéo hóa thỏa mãn: $P^{-1} A P = D$ hay $A = P D P^{-1}$.
          </p>
          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); padding: 12px; border-radius: 2px; margin-top: 14px;">
            <strong style="color: #10b981;">Ý nghĩa hình học:</strong><br>
            Trong hệ tọa độ cơ sở mới xác định bởi $\\{\\vec{v}_1, \\vec{v}_2\\}$, phép biến đổi ma trận $A$ chỉ đơn thuần là phép dãn nở độc lập dọc theo hai trục với các hệ số tỷ lệ lần lượt là $\\lambda_1$ và $\\lambda_2$.
          </div>
        `;
      } else {
        diagHtml = `
          <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
            Bước 4: Xét tính chéo hóa
          </h4>
          <p>
            Trị riêng bội có số chiều không gian riêng nhỏ hơn bội đại số (bội hình học = 1 < bội đại số = 2).<br>
            Do đó, không đủ vector riêng độc lập tuyến tính để lập cơ sở cho toàn không gian $\\mathbb{R}^2$. Ma trận $A$ không thể chéo hóa được.
          </p>
        `;
      }

      eigenContent = `
        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 2: Tìm các nghiệm trị riêng
        </h4>
        <p>
          Biệt thức $\\Delta = (${tr})^2 - 4(${det}) = ${delta.toFixed(2)} \\ge 0$.<br>
          Phương trình có các nghiệm trị riêng thực:
          $$\\lambda_1 = ${l1.toFixed(3)}, \\quad \\lambda_2 = ${l2.toFixed(3)}$$
        </p>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 3: Xác định các không gian riêng tương ứng
        </h4>
        ${v1Html}
        ${v2Html}
        ${diagHtml}
      `;
    }

    const html = `
      <div style="padding: 6px 0; font-size: 13.5px; line-height: 1.7; color: var(--fg);">
        <p style="margin-bottom: 12px;">
          Xét ma trận vuông cấp 2:
          $$A = \\begin{bmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{bmatrix}$$
        </p>

        <div style="background: var(--bg-hover); border-left: 3px solid var(--primary-base); padding: 10px 14px; margin-bottom: 14px; border-radius: 2px;">
          <strong>Mục tiêu:</strong> Lập phương trình đặc trưng, tìm các trị riêng $\\lambda$, vector riêng $\\vec{v}$ thỏa mãn $A\\vec{v} = \\lambda \\vec{v}$ và kiểm tra tính chéo hóa.
        </div>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 1: Lập đa thức đặc trưng và phương trình đặc trưng
        </h4>
        <p>
          Đa thức đặc trưng của ma trận $A$:
          $$P(\\lambda) = \\det(A - \\lambda I) = \\begin{vmatrix} ${a} - \\lambda & ${b} \\\\ ${c} & ${d} - \\lambda \\end{vmatrix}$$
          Khai triển định thức:
          $$P(\\lambda) = (${a} - \\lambda)(${d} - \\lambda) - (${b})(${c}) = \\lambda^2 - (${tr})\\lambda + (${det})$$
          Phương trình đặc trưng: $\\lambda^2 - (${tr})\\lambda + (${det}) = 0$.
        </p>

        ${eigenContent}
      </div>
    `;

    if (window.App && typeof App.openCustomSolution === "function") {
      App.openCustomSolution("Trị Riêng, Vector Riêng & Chéo Hóa Ma Trận", html);
    } else {
      const solBody = document.getElementById("solutionBody");
      const solOverlay = document.getElementById("solutionOverlay");
      const solTitle = document.getElementById("solTitleText");
      if (solTitle) solTitle.textContent = "Trị Riêng, Vector Riêng & Chéo Hóa Ma Trận";
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

  // Module định nghĩa cho Chủ đề 6
  const Topic6Module = {
    _isInitialized: false,

    init: function () {
      if (this._isInitialized) return;
      const btnCompute = document.getElementById("btnEigenCompute");
      if (!btnCompute) return;
      this._isInitialized = true;

      // Nút Preset
      const pReal = document.getElementById("presetEigenReal");
      const pSym = document.getElementById("presetEigenSym");
      const pRot = document.getElementById("presetEigenRot");
      const pRepeated = document.getElementById("presetEigenRepeated");

      const clearActivePill = () => {
        [pReal, pSym, pRot, pRepeated].forEach((b) => {
          if (b) b.classList.remove("active");
        });
      };

      const syncInputsFromMatrix = () => {
        const a11 = document.getElementById("eigen_a11");
        const a12 = document.getElementById("eigen_a12");
        const a21 = document.getElementById("eigen_a21");
        const a22 = document.getElementById("eigen_a22");
        if (a11) a11.value = eigenState.matrix[0][0];
        if (a12) a12.value = eigenState.matrix[0][1];
        if (a21) a21.value = eigenState.matrix[1][0];
        if (a22) a22.value = eigenState.matrix[1][1];
      };

      if (pReal) {
        pReal.addEventListener("click", () => {
          clearActivePill();
          pReal.classList.add("active");
          eigenState.matrix = [
            [3, 1],
            [0, 2]
          ];
          syncInputsFromMatrix();
          this.execute();
        });
      }

      if (pSym) {
        pSym.addEventListener("click", () => {
          clearActivePill();
          pSym.classList.add("active");
          eigenState.matrix = [
            [2, 1],
            [1, 2]
          ];
          syncInputsFromMatrix();
          this.execute();
        });
      }

      if (pRot) {
        pRot.addEventListener("click", () => {
          clearActivePill();
          pRot.classList.add("active");
          eigenState.matrix = [
            [0, -1],
            [1, 0]
          ];
          syncInputsFromMatrix();
          this.execute();
        });
      }

      if (pRepeated) {
        pRepeated.addEventListener("click", () => {
          clearActivePill();
          pRepeated.classList.add("active");
          eigenState.matrix = [
            [2, 1],
            [0, 2]
          ];
          syncInputsFromMatrix();
          this.execute();
        });
      }

      // Lắng nghe thay đổi phần tử ma trận
      const bindMatrixChange = (id, row, col) => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener("input", (e) => {
            const val = parseFloat(e.target.value) || 0;
            eigenState.matrix[row][col] = val;
            this.execute();
          });
        }
      };

      bindMatrixChange("eigen_a11", 0, 0);
      bindMatrixChange("eigen_a12", 0, 1);
      bindMatrixChange("eigen_a21", 1, 0);
      bindMatrixChange("eigen_a22", 1, 1);

      // Checkbox các lớp hiển thị
      const chkLines = document.getElementById("chkEigenShowLines");
      if (chkLines) {
        chkLines.addEventListener("change", (e) => {
          eigenState.showEigenspaces = e.target.checked;
          if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
        });
      }

      const chkTrans = document.getElementById("chkEigenShowTrans");
      if (chkTrans) {
        chkTrans.addEventListener("change", (e) => {
          eigenState.showTransformed = e.target.checked;
          if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
        });
      }

      const chkCircle = document.getElementById("chkEigenShowUnitCircle");
      if (chkCircle) {
        chkCircle.addEventListener("change", (e) => {
          eigenState.showUnitCircle = e.target.checked;
          if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
        });
      }

      // Nút Khảo sát
      btnCompute.addEventListener("click", () => {
        this.execute();
      });

      // Nút Quét hướng bất biến (Animation)
      const btnSweep = document.getElementById("btnEigenSweep");
      if (btnSweep) {
        btnSweep.addEventListener("click", () => {
          eigenState.isSweeping = !eigenState.isSweeping;
          if (eigenState.isSweeping) {
            btnSweep.innerHTML = '<i class="ph ph-pause" style="margin-right:4px;"></i> Dừng quét';
            eigenState.sweepAngle = 0;
            requestAnimationFrame(sweepTick);
          } else {
            btnSweep.innerHTML = '<i class="ph ph-compass" style="margin-right:4px;"></i> Quét hướng';
            if (eigenState.sweepAnimId) {
              cancelAnimationFrame(eigenState.sweepAnimId);
              eigenState.sweepAnimId = null;
            }
            if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
          }
        });
      }

      // Nút Lời giải
      const btnSol = document.getElementById("btnEigenSolution");
      if (btnSol) {
        btnSol.addEventListener("click", generateEigenSolution);
      }
    },

    execute: function () {
      if (!this._isInitialized) this.init();

      const a11 = document.getElementById("eigen_a11");
      const a12 = document.getElementById("eigen_a12");
      const a21 = document.getElementById("eigen_a21");
      const a22 = document.getElementById("eigen_a22");
      if (a11 && !isNaN(parseFloat(a11.value))) eigenState.matrix[0][0] = parseFloat(a11.value);
      if (a12 && !isNaN(parseFloat(a12.value))) eigenState.matrix[0][1] = parseFloat(a12.value);
      if (a21 && !isNaN(parseFloat(a21.value))) eigenState.matrix[1][0] = parseFloat(a21.value);
      if (a22 && !isNaN(parseFloat(a22.value))) eigenState.matrix[1][1] = parseFloat(a22.value);

      computeEigen();
      App.custom2DDrawHook = drawEigenOnCanvas2D;
      updateInfoPanel();

      if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
        Vec2D.draw2DAllVectors();
      }
    },

    onTaskSelect: function (taskId) {
      if (
        taskId === "topic6_eigen" ||
        taskId === "s27" ||
        taskId === "topic6_char_poly" ||
        taskId === "s28" ||
        taskId === "topic6_diagonalize" ||
        taskId === "s29" ||
        taskId === "topic6_symmetric_diag" ||
        taskId === "s30"
      ) {
        this.execute();
      } else {
        if (eigenState.isSweeping) {
          eigenState.isSweeping = false;
          if (eigenState.sweepAnimId) {
            cancelAnimationFrame(eigenState.sweepAnimId);
            eigenState.sweepAnimId = null;
          }
          const btnSweep = document.getElementById("btnEigenSweep");
          if (btnSweep) {
            btnSweep.innerHTML = '<i class="ph ph-compass" style="margin-right:4px;"></i> Quét hướng';
          }
        }
        if (App.custom2DDrawHook === drawEigenOnCanvas2D) {
          App.custom2DDrawHook = null;
        }
      }
    }
  };

  if (typeof App.registerTopicModule === "function") {
    App.registerTopicModule("t6", Topic6Module);
  } else {
    window.addEventListener("DOMContentLoaded", function () {
      if (typeof App.registerTopicModule === "function") {
        App.registerTopicModule("t6", Topic6Module);
      }
    });
  }
})();
