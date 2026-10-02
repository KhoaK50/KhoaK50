// =========================================================================
// topic5_linear_transformations.js - Module Chủ Đề 5: Ánh Xạ Tuyến Tính
// Khảo sát Hạt nhân Ker(T), Không gian ảnh Im(T) và Ma trận ánh xạ 2D
// =========================================================================
(function () {
  window.App = window.App || {};

  // Trạng thái module Ánh xạ tuyến tính
  const ltState = {
    matrix: [
      [1, 1],
      [1, 1]
    ],
    det: 0,
    rank: 1,
    nullity: 1,
    kerDir: [-1, 1],
    imDir: [1, 1],
    showKernel: true,
    showImage: true,
    showCompression: true,
    isMorphing: false
  };

  // Tính toán hạt nhân Ker(T) và ảnh Im(T) của ma trận 2x2
  function computeKernelAndImage() {
    const a = Number(ltState.matrix[0][0]) || 0;
    const b = Number(ltState.matrix[0][1]) || 0;
    const c = Number(ltState.matrix[1][0]) || 0;
    const d = Number(ltState.matrix[1][1]) || 0;

    const det = a * d - b * c;
    ltState.det = det;

    const normA = Math.sqrt(a * a + b * b + c * c + d * d);

    // Trường hợp ma trận không: rank = 0, nullity = 2
    if (normA < 1e-9) {
      ltState.rank = 0;
      ltState.nullity = 2;
      ltState.kerDir = [1, 0];
      ltState.imDir = [0, 0];
      return;
    }

    // Trường hợp khả nghịch: rank = 2, nullity = 0
    if (Math.abs(det) > 1e-5) {
      ltState.rank = 2;
      ltState.nullity = 0;
      ltState.kerDir = [0, 0];
      ltState.imDir = [1, 0];
      return;
    }

    // Trường hợp suy biến cấp 1: rank = 1, nullity = 1
    ltState.rank = 1;
    ltState.nullity = 1;

    // Hạt nhân là nghiệm của phương trình ax + by = 0 (hoặc cx + dy = 0)
    let kx = 0;
    let ky = 0;
    if (Math.abs(a) > 1e-5 || Math.abs(b) > 1e-5) {
      kx = -b;
      ky = a;
    } else {
      kx = -d;
      ky = c;
    }
    const lenK = Math.sqrt(kx * kx + ky * ky);
    ltState.kerDir = lenK > 1e-9 ? [kx / lenK, ky / lenK] : [1, 0];

    // Không gian ảnh Im(T) sinh bởi cột khác không của A: [a, c]^T hoặc [b, d]^T
    let ix = a;
    let iy = c;
    if (Math.abs(ix) < 1e-5 && Math.abs(iy) < 1e-5) {
      ix = b;
      iy = d;
    }
    const lenI = Math.sqrt(ix * ix + iy * iy);
    ltState.imDir = lenI > 1e-9 ? [ix / lenI, iy / lenI] : [1, 0];
  }

  // Hook vẽ đồ họa 2D trực quan trên Canvas của Viewer2D
  function drawLinearTransformOnCanvas2D(ctx, gridInfo, logicalSize) {
    const cx = gridInfo.originPx.x;
    const cy = gridInfo.originPx.y;
    const px = gridInfo.pixelsPerUnit;

    const wX = (x) => cx + x * px;
    const wY = (y) => cy - y * px;

    ctx.save();

    const a = ltState.matrix[0][0];
    const b = ltState.matrix[0][1];
    const c = ltState.matrix[1][0];
    const d = ltState.matrix[1][1];

    const te1 = [a, c];
    const te2 = [b, d];

    // 1. Trường hợp suy biến: rank = 1 (Định thức = 0)
    if (ltState.rank === 1) {
      const farSpan = 30; // Chiều dài kéo dài qua màn hình

      // A. Vẽ không gian Hạt nhân Ker(T): Đường thẳng nét đứt màu đỏ cam
      if (ltState.showKernel) {
        const k = ltState.kerDir;
        ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 5]);

        ctx.beginPath();
        ctx.moveTo(wX(-farSpan * k[0]), wY(-farSpan * k[1]));
        ctx.lineTo(wX(farSpan * k[0]), wY(farSpan * k[1]));
        ctx.stroke();
        ctx.setLineDash([]);

        // Nhãn Ker(T)
        ctx.font = "700 12px system-ui, sans-serif";
        ctx.fillStyle = "#ef4444";
        ctx.fillText("Ker(T)", wX(3.5 * k[0]) + 6, wY(3.5 * k[1]) - 6);

        // Minh họa co xẹp: các điểm trên hạt nhân bị nén về gốc (0, 0)
        if (ltState.showCompression) {
          [-2.5, -1.2, 1.2, 2.5].forEach((factor) => {
            const px0 = wX(factor * k[0]);
            const py0 = wY(factor * k[1]);

            // Điểm hạt nhân
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.arc(px0, py0, 3.5, 0, Math.PI * 2);
            ctx.fill();

            // Mũi tên hướng về gốc 0
            const dx = cx - px0;
            const dy = cy - py0;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 15) {
              const arrowLen = 14;
              const ax = px0 + (dx / dist) * arrowLen;
              const ay = py0 + (dy / dist) * arrowLen;

              ctx.strokeStyle = "rgba(239, 68, 68, 0.65)";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(px0, py0);
              ctx.lineTo(ax, ay);
              ctx.stroke();
            }
          });
        }
      }

      // B. Vẽ không gian Ảnh Im(T): Đường thẳng màu xanh lam neon đậm nét
      if (ltState.showImage) {
        const im = ltState.imDir;
        ctx.strokeStyle = "rgba(0, 144, 255, 0.85)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(wX(-farSpan * im[0]), wY(-farSpan * im[1]));
        ctx.lineTo(wX(farSpan * im[0]), wY(farSpan * im[1]));
        ctx.stroke();

        // Nhãn Im(T)
        ctx.font = "700 12px system-ui, sans-serif";
        ctx.fillStyle = "#0090ff";
        ctx.fillText("Im(T)", wX(3.8 * im[0]) + 6, wY(3.8 * im[1]) - 6);
      }
    }

    // 2. Trường hợp ma trận khả nghịch: rank = 2 (Định thức khác 0)
    if (ltState.rank === 2) {
      // Hạt nhân chỉ có duy nhất vector 0
      if (ltState.showKernel) {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(cx, cy, 5.0, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = "700 11.5px system-ui, sans-serif";
        ctx.fillStyle = "#ef4444";
        ctx.fillText("Ker(T) = {0}", cx + 10, cy + 14);
      }

      // Không gian ảnh là toàn bộ mặt phẳng R2
      // Vẽ hình bình hành cơ sở ảnh biểu thị diện tích det(A)
      if (ltState.showImage) {
        const p0x = cx;
        const p0y = cy;
        const p1x = wX(te1[0]);
        const p1y = wY(te1[1]);
        const p2x = wX(te1[0] + te2[0]);
        const p2y = wY(te1[1] + te2[1]);
        const p3x = wX(te2[0]);
        const p3y = wY(te2[1]);

        ctx.fillStyle = "rgba(0, 144, 255, 0.12)";
        ctx.strokeStyle = "rgba(0, 144, 255, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        ctx.lineTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.lineTo(p3x, p3y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // 3. Luôn vẽ hai vector cột ảnh T(e1) và T(e2)
    function drawArrow(x0, y0, x1, y1, color, labelText) {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1e-4) return;

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
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
        ctx.fillText(labelText, x1 + 6, y1 - 4);
      }
    }

    drawArrow(cx, cy, wX(te1[0]), wY(te1[1]), "#0090ff", "T(e1)");
    drawArrow(cx, cy, wX(te2[0]), wY(te2[1]), "#10b981", "T(e2)");

    ctx.restore();
  }

  // Cập nhật bảng kết quả đọc nhanh bên dưới form
  function updateInfoPanel() {
    const box = document.getElementById("result_lt_info");
    if (!box) return;

    box.style.display = "block";
    const det = ltState.det.toFixed(2);
    const r = ltState.rank;
    const n = ltState.nullity;

    let kerText = "";
    if (r === 2) {
      kerText = "{0} (Chỉ có gốc tọa độ)";
    } else if (r === 1) {
      kerText = `span{[${ltState.kerDir[0].toFixed(2)}, ${ltState.kerDir[1].toFixed(2)}]} (Đường thẳng đi qua gốc)`;
    } else {
      kerText = "R^2 (Toàn không gian)";
    }

    let imText = "";
    if (r === 2) {
      imText = "R^2 (Toàn không gian)";
    } else if (r === 1) {
      imText = `span{[${ltState.imDir[0].toFixed(2)}, ${ltState.imDir[1].toFixed(2)}]} (Đường thẳng đi qua gốc)`;
    } else {
      imText = "{0} (Chỉ có gốc tọa độ)";
    }

    box.innerHTML = `
      <div style="font-weight: 700; color: var(--fg); margin-bottom: 6px; font-size: 12px;">
        Khảo sát Ánh xạ tuyến tính:
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11.5px; color: var(--fg);">
        <div><span style="color: var(--muted);">Định thức det(A):</span> ${det}</div>
        <div><span style="color: var(--muted);">Hạng rank(A):</span> ${r}</div>
        <div><span style="color: var(--muted);">Số chiều ảnh dim(Im):</span> ${r}</div>
        <div><span style="color: var(--muted);">Số chiều nhân dim(Ker):</span> ${n}</div>
        <div style="grid-column: span 2; border-top: 1px solid var(--border); padding-top: 5px; margin-top: 2px;">
          <span style="color: #ef4444; font-weight: 600;">Hạt nhân Ker(T):</span> ${kerText}
        </div>
        <div style="grid-column: span 2; border-top: 1px solid var(--border); padding-top: 5px;">
          <span style="color: #0090ff; font-weight: 600;">Không gian ảnh Im(T):</span> ${imText}
        </div>
        <div style="grid-column: span 2; font-size: 11px; color: var(--muted); margin-top: 2px;">
          Định lý số chiều: dim(Ker) + dim(Im) = ${n} + ${r} = 2
        </div>
      </div>
    `;
  }

  // Bộ sinh lời giải LaTeX KaTeX sư phạm từng bước chi tiết
  function generateLinearTransformSolution() {
    computeKernelAndImage();

    const a = ltState.matrix[0][0];
    const b = ltState.matrix[0][1];
    const c = ltState.matrix[1][0];
    const d = ltState.matrix[1][1];
    const det = ltState.det;
    const r = ltState.rank;
    const n = ltState.nullity;

    let kerExplain = "";
    if (r === 2) {
      kerExplain = `
        Vì $\\det(A) = ${det.toFixed(2)} \\ne 0$, ma trận $A$ khả nghịch. Hệ phương trình thuần nhất $A \\mathbf{x} = \\mathbf{0}$ chỉ có duy nhất nghiệm tầm thường $\\mathbf{x} = \\mathbf{0}$.
        $$\\ker(T) = \\left\\{ \\begin{bmatrix} 0 \\\\ 0 \\end{bmatrix} \\right\\}, \\quad \\dim(\\ker(T)) = 0$$
      `;
    } else if (r === 1) {
      const kx = ltState.kerDir[0].toFixed(3);
      const ky = ltState.kerDir[1].toFixed(3);
      kerExplain = `
        Vì $\\det(A) = 0$, ma trận $A$ suy biến. Hệ phương trình thuần nhất trở thành:
        $$\\begin{cases} ${a}x + ${b}y = 0 \\\\ ${c}x + ${d}y = 0 \\end{cases}$$
        Do hai hàng phụ thuộc tuyến tính, phương trình xác định hạt nhân là $(${a})x + (${b})y = 0$.
        $$\\ker(T) = \\text{span} \\left\\{ \\begin{bmatrix} ${kx} \\\\ ${ky} \\end{bmatrix} \\right\\}, \\quad \\dim(\\ker(T)) = 1$$
        Mọi vector nằm trên đường thẳng này đều bị ánh xạ biến thành vector không $\\mathbf{0}$.
      `;
    } else {
      kerExplain = `
        Vì $A$ là ma trận không, $A \\mathbf{x} = \\mathbf{0}$ với mọi $\\mathbf{x} \\in \\mathbb{R}^2$.
        $$\\ker(T) = \\mathbb{R}^2, \\quad \\dim(\\ker(T)) = 2$$
      `;
    }

    let imExplain = "";
    if (r === 2) {
      imExplain = `
        Vì hạng của $A$ bằng $2$, hai vector cột của $A$ độc lập tuyến tính và tạo thành một cơ sở của $\\mathbb{R}^2$:
        $$\\text{Im}(T) = \\text{span} \\left\\{ \\begin{bmatrix} ${a} \\\\ ${c} \\end{bmatrix}, \\begin{bmatrix} ${b} \\\\ ${d} \\end{bmatrix} \\right\\} = \\mathbb{R}^2, \\quad \\dim(\\text{Im}(T)) = 2$$
      `;
    } else if (r === 1) {
      const ix = ltState.imDir[0].toFixed(3);
      const iy = ltState.imDir[1].toFixed(3);
      imExplain = `
        Hạng của $A$ bằng $1$, các cột của $A$ cùng phương với nhau. Không gian ảnh là một đường thẳng đi qua gốc tọa độ:
        $$\\text{Im}(T) = \\text{span} \\left\\{ \\begin{bmatrix} ${ix} \\\\ ${iy} \\end{bmatrix} \\right\\}, \\quad \\dim(\\text{Im}(T)) = 1$$
      `;
    } else {
      imExplain = `
        Vì $A$ là ma trận không, toàn bộ không gian bị nén về gốc:
        $$\\text{Im}(T) = \\left\\{ \\begin{bmatrix} 0 \\\\ 0 \\end{bmatrix} \\right\\}, \\quad \\dim(\\text{Im}(T)) = 0$$
      `;
    }

    const html = `
      <div style="padding: 6px 0; font-size: 13.5px; line-height: 1.7; color: var(--fg);">
        <p style="margin-bottom: 12px;">
          Xét ánh xạ tuyến tính $T: \\mathbb{R}^2 \\to \\mathbb{R}^2$ có ma trận biểu diễn trong cơ sở chính tắc là:
          $$A = \\begin{bmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{bmatrix}$$
        </p>

        <div style="background: var(--bg-hover); border-left: 3px solid var(--primary-base); padding: 10px 14px; margin-bottom: 14px; border-radius: 2px;">
          <strong>Mục tiêu:</strong> Xác định Hạt nhân $\\ker(T)$, Không gian ảnh $\\text{Im}(T)$ và kiểm chứng Định lý số chiều.
        </div>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 1: Tính định thức và xác định hạng ma trận
        </h4>
        <p>
          Định thức của ma trận $A$:
          $$\\det(A) = (${a})(${d}) - (${b})(${c}) = ${det.toFixed(2)}$$
          Hạng của ma trận $A$:
          $$\\text{rank}(A) = ${r}$$
        </p>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 2: Tìm Hạt nhân Ker(T)
        </h4>
        <p>
          Theo định nghĩa, $\\ker(T) = \\{\\mathbf{x} \\in \\mathbb{R}^2 \\mid A \\mathbf{x} = \\mathbf{0}\\}$.
        </p>
        <div>${kerExplain}</div>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 3: Tìm Không gian ảnh Im(T)
        </h4>
        <p>
          Không gian ảnh $\\text{Im}(T)$ được sinh bởi các vector cột của ma trận $A$:
        </p>
        <div>${imExplain}</div>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 4: Kiểm chứng Định lý số chiều (Rank-Nullity Theorem)
        </h4>
        <p>
          Định lý số chiều khẳng định với mọi ánh xạ tuyến tính $T: V \\to W$:
          $$\\dim(\\ker(T)) + \\dim(\\text{Im}(T)) = \\dim(V)$$
          Thay các kết quả vừa tính:
          $$\\dim(\\ker(T)) + \\dim(\\text{Im}(T)) = ${n} + ${r} = 2 = \\dim(\\mathbb{R}^2)$$
          Định lý được nghiệm đúng.
        </p>

        <div style="background: rgba(0, 144, 255, 0.08); border: 1px solid rgba(0, 144, 255, 0.3); padding: 12px; border-radius: 2px; margin-top: 14px;">
          <strong style="color: #0090ff;">Ý nghĩa hình học:</strong><br>
          ${r === 1 ? "Ma trận làm xẹp toàn bộ mặt phẳng 2 chiều thành một đường thẳng 1 chiều. Chiều bị mất đi chính là số chiều của Hạt nhân $\\ker(T)$, biểu diễn bằng các vector bị nén về điểm gốc 0." : "Ánh xạ bảo toàn số chiều của không gian, biến một đơn vị diện tích thành diện tích $\\det(A) = " + det.toFixed(2) + "$."}
        </div>
      </div>
    `;

    if (window.App && typeof App.openCustomSolution === "function") {
      App.openCustomSolution("Khảo Sát Hạt Nhân & Không Gian Ảnh", html);
    } else {
      const solBody = document.getElementById("solutionBody");
      const solOverlay = document.getElementById("solutionOverlay");
      const solTitle = document.getElementById("solTitleText");
      if (solTitle) solTitle.textContent = "Khảo Sát Hạt Nhân & Không Gian Ảnh";
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

  // Module định nghĩa cho Chủ đề 5
  const Topic5Module = {
    _isInitialized: false,

    init: function () {
      if (this._isInitialized) return;
      const btnInspect = document.getElementById("btnLTInspect");
      if (!btnInspect) return;
      this._isInitialized = true;

      // Nút Preset
      const pSingular = document.getElementById("presetLTSingular");
      const pProject = document.getElementById("presetLTProject");
      const pInvert = document.getElementById("presetLTInvert");
      const pShear = document.getElementById("presetLTShear");

      const clearActivePill = () => {
        [pSingular, pProject, pInvert, pShear].forEach((b) => {
          if (b) b.classList.remove("active");
        });
      };

      const syncInputsFromMatrix = () => {
        const a11 = document.getElementById("lt_a11");
        const a12 = document.getElementById("lt_a12");
        const a21 = document.getElementById("lt_a21");
        const a22 = document.getElementById("lt_a22");
        if (a11) a11.value = ltState.matrix[0][0];
        if (a12) a12.value = ltState.matrix[0][1];
        if (a21) a21.value = ltState.matrix[1][0];
        if (a22) a22.value = ltState.matrix[1][1];
      };

      if (pSingular) {
        pSingular.addEventListener("click", () => {
          clearActivePill();
          pSingular.classList.add("active");
          ltState.matrix = [
            [1, 1],
            [1, 1]
          ];
          syncInputsFromMatrix();
          this.execute();
        });
      }

      if (pProject) {
        pProject.addEventListener("click", () => {
          clearActivePill();
          pProject.classList.add("active");
          ltState.matrix = [
            [1, 0],
            [0, 0]
          ];
          syncInputsFromMatrix();
          this.execute();
        });
      }

      if (pInvert) {
        pInvert.addEventListener("click", () => {
          clearActivePill();
          pInvert.classList.add("active");
          ltState.matrix = [
            [2, -1],
            [1, 1.5]
          ];
          syncInputsFromMatrix();
          this.execute();
        });
      }

      if (pShear) {
        pShear.addEventListener("click", () => {
          clearActivePill();
          pShear.classList.add("active");
          ltState.matrix = [
            [1, 1.5],
            [0, 1]
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
            ltState.matrix[row][col] = val;
            this.execute();
          });
        }
      };

      bindMatrixChange("lt_a11", 0, 0);
      bindMatrixChange("lt_a12", 0, 1);
      bindMatrixChange("lt_a21", 1, 0);
      bindMatrixChange("lt_a22", 1, 1);

      // Checkbox các lớp hiển thị
      const chkKer = document.getElementById("chkLTShowKer");
      if (chkKer) {
        chkKer.addEventListener("change", (e) => {
          ltState.showKernel = e.target.checked;
          if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
        });
      }

      const chkIm = document.getElementById("chkLTShowIm");
      if (chkIm) {
        chkIm.addEventListener("change", (e) => {
          ltState.showImage = e.target.checked;
          if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
        });
      }

      const chkComp = document.getElementById("chkLTShowComp");
      if (chkComp) {
        chkComp.addEventListener("change", (e) => {
          ltState.showCompression = e.target.checked;
          if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
        });
      }

      // Nút Khảo sát
      btnInspect.addEventListener("click", () => {
        this.execute();
      });

      // Nút Biến đổi lưới (kết nối với App.LinearTransform engine)
      const btnMorph = document.getElementById("btnLTMorph");
      if (btnMorph) {
        btnMorph.addEventListener("click", () => {
          if (window.App && App.LinearTransform) {
            if (App.LinearTransform.isActive && App.LinearTransform.isActive()) {
              App.LinearTransform.stop();
              btnMorph.innerHTML = '<i class="ph ph-play" style="margin-right:4px;"></i> Biến đổi lưới';
            } else {
              App.LinearTransform.start(ltState.matrix, 2);
              btnMorph.innerHTML = '<i class="ph ph-stop" style="margin-right:4px;"></i> Dừng biến đổi';
            }
          }
        });
      }

      // Nút Lời giải
      const btnSol = document.getElementById("btnLTSolution");
      if (btnSol) {
        btnSol.addEventListener("click", generateLinearTransformSolution);
      }
    },

    execute: function () {
      if (!this._isInitialized) this.init();

      const a11 = document.getElementById("lt_a11");
      const a12 = document.getElementById("lt_a12");
      const a21 = document.getElementById("lt_a21");
      const a22 = document.getElementById("lt_a22");
      if (a11 && !isNaN(parseFloat(a11.value))) ltState.matrix[0][0] = parseFloat(a11.value);
      if (a12 && !isNaN(parseFloat(a12.value))) ltState.matrix[0][1] = parseFloat(a12.value);
      if (a21 && !isNaN(parseFloat(a21.value))) ltState.matrix[1][0] = parseFloat(a21.value);
      if (a22 && !isNaN(parseFloat(a22.value))) ltState.matrix[1][1] = parseFloat(a22.value);

      computeKernelAndImage();
      App.custom2DDrawHook = drawLinearTransformOnCanvas2D;
      updateInfoPanel();

      if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
        Vec2D.draw2DAllVectors();
      }
    },

    onTaskSelect: function (taskId) {
      if (taskId === "topic5_kernel_image" || taskId === "s25" || taskId === "topic5_matrix_transform" || taskId === "s26") {
        this.execute();
      } else {
        if (window.App && App.LinearTransform && App.LinearTransform.isActive && App.LinearTransform.isActive()) {
          App.LinearTransform.stop();
          const btnMorph = document.getElementById("btnLTMorph");
          if (btnMorph) {
            btnMorph.innerHTML = '<i class="ph ph-play" style="margin-right:4px;"></i> Biến đổi lưới';
          }
        }
        if (App.custom2DDrawHook === drawLinearTransformOnCanvas2D) {
          App.custom2DDrawHook = null;
        }
      }
    }
  };

  if (typeof App.registerTopicModule === "function") {
    App.registerTopicModule("t5", Topic5Module);
  } else {
    window.addEventListener("DOMContentLoaded", function () {
      if (typeof App.registerTopicModule === "function") {
        App.registerTopicModule("t5", Topic5Module);
      }
    });
  }
})();
