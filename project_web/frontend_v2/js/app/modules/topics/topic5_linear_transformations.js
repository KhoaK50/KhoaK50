// =========================================================================
// topic5_linear_transformations.js - Module Chủ Đề 5: Ánh Xạ Tuyến Tính
// Khảo sát Hạt nhân Ker(T), Không gian ảnh Im(T) và Định lý Hạng - Số khuyết
// Đồng bộ 2D (2x2) và 3D (3x3) với App.matrixList & App.LTAnimator
// Tuân thủ triệt để Zero Em-dash (\u2014) và chuẩn mực Anti-Slop.
// =========================================================================
(function () {
  window.App = window.App || {};

  function $(id) {
    return document.getElementById(id);
  }

  function fmtScalarLatex(val) {
    if (!Number.isFinite(val) || Math.abs(val) < 1e-7) return "0";
    const sign = val < 0 ? "-" : "";
    const abs = Math.abs(val);
    if (Math.abs(abs - Math.round(abs)) < 1e-6) {
      return sign + String(Math.round(abs));
    }
    for (let den = 2; den <= 24; den++) {
      const num = Math.round(abs * den);
      if (Math.abs(abs - num / den) < 1e-6) {
        return `${sign}\\frac{${num}}{${den}}`;
      }
    }
    return (val < 0 ? "-" : "") + parseFloat(abs.toFixed(3)).toString();
  }

  function fmtScalarPlain(val) {
    if (!Number.isFinite(val) || Math.abs(val) < 1e-6) return "0";
    if (Math.abs(val - Math.round(val)) < 1e-5) return String(Math.round(val));
    for (let den = 2; den <= 16; den++) {
      const num = Math.round(val * den);
      if (Math.abs(val - num / den) < 1e-5) {
        return `${num}/${den}`;
      }
    }
    return parseFloat(val.toFixed(2)).toString();
  }

  function matrixToBmatrixLatex(M) {
    if (!Array.isArray(M) || !M.length) return "\\begin{bmatrix} 0 \\end{bmatrix}";
    const rows = M.map((r) => r.map(fmtScalarLatex).join(" & ")).join(" \\\\ ");
    return `\\begin{bmatrix} ${rows} \\end{bmatrix}`;
  }

  function vecToColLatex(v) {
    if (!Array.isArray(v)) return "\\begin{bmatrix} 0 \\end{bmatrix}";
    return `\\begin{bmatrix} ${v.map(fmtScalarLatex).join(" \\\\ ")} \\end{bmatrix}`;
  }

  // --- THUẬT TOÁN ĐẠI SỐ TUYẾN TÍNH NỘI TẠI (KHÔNG PHỤ THUỘC MOCK) ---
  function computeLTAnalysis(rawValues, n) {
    const dim = n === 3 ? 3 : 2;
    const matrix = [];
    for (let i = 0; i < dim; i++) {
      matrix[i] = [];
      for (let j = 0; j < dim; j++) {
        matrix[i][j] = Number(rawValues?.[i]?.[j] ?? 0);
      }
    }

    // 1. Định thức det(A)
    let det = 0;
    if (dim === 2) {
      det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    } else {
      det =
        matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
        matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
        matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);
    }

    // 2. Vết ma trận trace(A)
    let trace = 0;
    for (let i = 0; i < dim; i++) trace += matrix[i][i];

    // 3. Các cột của ma trận A (chính là T(e_j))
    const columns = [];
    for (let j = 0; j < dim; j++) {
      const col = [];
      for (let i = 0; i < dim; i++) {
        col.push(matrix[i][j]);
      }
      columns.push(col);
    }

    // 4. Khử Gauss - Jordan tìm RREF, pivotCols, rank và nullity
    const RREF = matrix.map((row) => row.slice());
    const pivotCols = [];
    const pivotRows = [];
    let pr = 0;
    const eps = 1e-5;

    for (let c = 0; c < dim && pr < dim; c++) {
      let maxR = pr;
      let maxVal = Math.abs(RREF[pr][c]);
      for (let r = pr + 1; r < dim; r++) {
        if (Math.abs(RREF[r][c]) > maxVal) {
          maxVal = Math.abs(RREF[r][c]);
          maxR = r;
        }
      }
      if (maxVal < eps) continue;

      const tmp = RREF[pr];
      RREF[pr] = RREF[maxR];
      RREF[maxR] = tmp;

      const pv = RREF[pr][c];
      for (let j = c; j < dim; j++) RREF[pr][j] /= pv;
      for (let r = 0; r < dim; r++) {
        if (r !== pr && Math.abs(RREF[r][c]) > 1e-9) {
          const factor = RREF[r][c];
          for (let j = c; j < dim; j++) RREF[r][j] -= factor * RREF[pr][j];
        }
      }
      pivotCols.push(c);
      pivotRows.push(pr);
      pr++;
    }

    const rank = pivotCols.length;
    const nullity = dim - rank;

    const freeCols = [];
    for (let c = 0; c < dim; c++) {
      if (!pivotCols.includes(c)) freeCols.push(c);
    }

    // 5. Cơ sở Hạt nhân Ker(T)
    const kerBasis = [];
    if (nullity > 0) {
      for (const freeCol of freeCols) {
        const x = new Array(dim).fill(0);
        x[freeCol] = 1;
        for (let i = 0; i < pivotCols.length; i++) {
          const pivCol = pivotCols[i];
          const pivRow = pivotRows[i];
          x[pivCol] = -RREF[pivRow][freeCol];
        }
        // Chuẩn hóa vector cơ sở
        let maxAbs = 0;
        let sign = 1;
        for (let i = 0; i < dim; i++) {
          const a = Math.abs(x[i]);
          if (a > maxAbs) maxAbs = a;
          if (a > 1e-5 && sign === 1) sign = x[i] < 0 ? -1 : 1;
        }
        if (maxAbs > 1e-8) {
          let scaled = x.map((v) => (v / maxAbs) * sign);
          let foundInt = false;
          for (let mult = 1; mult <= 12; mult++) {
            const cand = scaled.map((v) => v * mult);
            if (cand.every((v) => Math.abs(v - Math.round(v)) < 1e-3)) {
              kerBasis.push(cand.map((v) => Math.round(v)));
              foundInt = true;
              break;
            }
          }
          if (!foundInt) {
            kerBasis.push(scaled.map((v) => Number(v.toFixed(3))));
          }
        }
      }
    }

    // 6. Cơ sở Không gian Ảnh Im(T)
    const imBasis = pivotCols.map((c) => columns[c]);

    return {
      dim,
      is3D: dim === 3,
      matrix,
      det,
      trace,
      rank,
      nullity,
      isInvertible: rank === dim,
      columns,
      RREF,
      pivotCols,
      freeCols,
      kerBasis,
      imBasis
    };
  }

  // --- KẾT XUẤT KHUNG KẾT QUẢ MATH-CLEAN-CARD (CHUẨN TOPIC 6 & 7) ---
  function renderLTInfoCard(matItem, analysis) {
    const box = $("result_lt_info");
    if (!box || !analysis) return;

    box.style.display = "block";
    const mfStyle =
      "background: var(--bg-paper, var(--card, #fff)); border: 1px solid var(--border-subtle, var(--border, #ccc)); border-radius: 4px; padding: 6px 12px; font-size: 1.05em; color: var(--text-main, var(--fg, #333)); pointer-events: none; width: 100%; box-sizing: border-box;";

    const n = analysis.dim;
    const r = analysis.rank;
    const k = analysis.nullity;
    const detVal = analysis.det;

    // Phân loại hình học định thức
    let statusText = "";
    let statusBadgeColor = "";
    if (analysis.isInvertible) {
      statusText = "Khả nghịch (Đẳng cấu không gian)";
      statusBadgeColor = "var(--primary-base, #0284c7)";
    } else if (r === 0) {
      statusText = "Ánh xạ không (Triệt tiêu toàn không gian)";
      statusBadgeColor = "#ef4444";
    } else {
      statusText = `Suy biến (Không gian bị nén về ${r} chiều)`;
      statusBadgeColor = "#f59e0b";
    }

    // Dòng định thức & vết ma trận
    const invLatex = `\\det(A) = ${fmtScalarLatex(detVal)}, \\quad \\text{tr}(A) = ${fmtScalarLatex(analysis.trace)}`;

    // Định lý số chiều
    const rankNullityLatex = `\\dim \\ker(T) + \\dim \\text{Im}(T) = ${k} + ${r} = ${n} = \\dim(V)`;

    // Cơ sở Hạt nhân Ker(T)
    let kerLatex = "";
    if (k === 0) {
      kerLatex = "\\ker(T) = \\left\\{ \\mathbf{0} \\right\\}, \\quad \\dim \\ker(T) = 0";
    } else {
      const kerCols = analysis.kerBasis.map(vecToColLatex).join(", ");
      kerLatex = `\\ker(T) = \\text{span} \\left\\{ ${kerCols} \\right\\}, \\quad \\dim \\ker(T) = ${k}`;
    }

    // Cơ sở Không gian ảnh Im(T)
    let imLatex = "";
    if (r === 0) {
      imLatex = "\\text{Im}(T) = \\left\\{ \\mathbf{0} \\right\\}, \\quad \\dim \\text{Im}(T) = 0";
    } else {
      const imCols = analysis.imBasis.map(vecToColLatex).join(", ");
      imLatex = `\\text{Im}(T) = \\text{span} \\left\\{ ${imCols} \\right\\}, \\quad \\dim \\text{Im}(T) = ${r}`;
    }

    box.innerHTML = `
      <div style="margin-top: 8px; padding-top: 10px; border-top: 1px solid var(--border-subtle, var(--border));">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; background: var(--bg-hover, rgba(0,0,0,0.03)); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-subtle, var(--border));">
          <span style="font-size: 0.78em; color: var(--text-muted, var(--muted)); font-weight: 700;">HẠNG MA TRẬN: <strong style="color: var(--primary-base, var(--fg)); font-size: 1.15em;">${r} / ${n}</strong></span>
          <span style="font-size: 0.8em; font-weight: 600; color: ${statusBadgeColor};">${statusText}</span>
        </div>

        <div style="font-size: 0.78em; font-weight: 700; color: var(--text-muted, var(--muted)); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">BẢO TOÀN SỐ CHIỀU (ĐỊNH LÝ HẠNG - SỐ KHUYẾT):</div>
        <div style="margin-bottom: 10px;">
          <math-field read-only style="${mfStyle}">${rankNullityLatex}</math-field>
        </div>

        <div style="font-size: 0.78em; font-weight: 700; color: var(--text-muted, var(--muted)); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">KHÔNG GIAN HẠT NHÂN KER(T):</div>
        <div style="margin-bottom: 10px;">
          <math-field read-only style="${mfStyle}">${kerLatex}</math-field>
        </div>

        <div style="font-size: 0.78em; font-weight: 700; color: var(--text-muted, var(--muted)); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">KHÔNG GIAN ẢNH IM(T):</div>
        <div style="margin-bottom: 10px;">
          <math-field read-only style="${mfStyle}">${imLatex}</math-field>
        </div>

        <div style="border-top: 1px dashed var(--border-subtle, var(--border)); padding-top: 8px;">
          <div style="font-size: 0.78em; font-weight: 700; color: var(--text-muted, var(--muted)); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">ĐỊNH THỨC & VẾT MA TRẬN:</div>
          <math-field read-only style="${mfStyle}">${invLatex}</math-field>
        </div>

        <div style="margin-top: 10px; font-size: 0.78em; color: var(--text-muted, var(--muted)); font-style: italic; text-align: center;">Nhấn "Trực quan" để xem hoạt cảnh liên hoàn 3 bước hoặc "Lời giải" để xem chứng minh chi tiết!</div>
      </div>
    `;
  }

  // --- BỘ SINH LỜI GIẢI HỌC THUẬT 2 TAB (solution_panel.js) ---
  function generateLinearTransformSolution(matItem, analysis) {
    const n = analysis.dim;
    const r = analysis.rank;
    const k = analysis.nullity;
    const A_latex = matrixToBmatrixLatex(analysis.matrix);
    const RREF_latex = matrixToBmatrixLatex(analysis.RREF);

    // ==========================================
    // TAB 1: PHƯƠNG PHÁP MA TRẬN & KHỬ GAUSS
    // ==========================================
    let tab1KerSteps = "";
    if (k === 0) {
      tab1KerSteps = `
        Vì ma trận $A$ có đầy đủ $n = ${n}$ vị trí trụ (không có ẩn tự do), hệ phương trình thuần nhất $A \\mathbf{x} = \\mathbf{0}$ chỉ có duy nhất nghiệm tầm thường:
        $$\\mathbf{x} = \\mathbf{0} \\implies \\ker(T) = \\left\\{ \\mathbf{0} \\right\\}, \\quad \\dim \\ker(T) = 0$$
      `;
    } else {
      const freeVarsList = analysis.freeCols.map((c) => `x_${c + 1}`).join(", ");
      const kerColsLatex = analysis.kerBasis.map(vecToColLatex).join(", ");
      tab1KerSteps = `
        Từ ma trận bậc thang rút gọn $\\text{RREF}(A)$, các ẩn tự do là $${freeVarsList}$. Cho từng ẩn tự do nhận giá trị 1 và các ẩn tự do còn lại bằng 0, ta xác định được cơ sở của Hạt nhân:
        $$\\ker(T) = \\text{span} \\left\\{ ${kerColsLatex} \\right\\}, \\quad \\dim \\ker(T) = ${k}$$
        Mọi vector thuộc không gian con này đều bị ánh xạ $T$ biến đổi về đúng vector không $\\mathbf{0}$.
      `;
    }

    const imColsLatex = analysis.imBasis.map(vecToColLatex).join(", ");
    const pivotColsNames = analysis.pivotCols.map((c) => `Cột \\, ${c + 1}`).join(", ");

    const tab1Html = `
      <div style="padding: 6px 0; font-size: 13.5px; line-height: 1.7; color: var(--fg);">
        <p style="margin-bottom: 12px;">
          Xét ánh xạ tuyến tính $T: \\mathbb{R}^${n} \\to \\mathbb{R}^${n}$ có ma trận biểu diễn trong cơ sở chính tắc là:
          $$A = ${A_latex}$$
        </p>

        <div style="background: var(--bg-hover); border-left: 3px solid var(--primary-base); padding: 10px 14px; margin-bottom: 14px; border-radius: 2px;">
          <strong>Mục tiêu:</strong> Đưa ma trận về dạng bậc thang rút gọn RREF, tìm cơ sở và số chiều của Hạt nhân $\\ker(T)$ và Không gian ảnh $\\text{Im}(T)$.
        </div>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 1: Khử Gauss - Jordan đưa về Dạng Bậc thang Rút gọn (RREF)
        </h4>
        <p>
          Thực hiện các phép biến đổi sơ cấp theo hàng trên ma trận $A$:
          $$A = ${A_latex} \\xrightarrow{\\text{Gauss-Jordan}} \\text{RREF}(A) = ${RREF_latex}$$
          Số hàng khác không trong $\\text{RREF}(A)$ chính là hạng của ma trận:
          $$\\text{rank}(A) = ${r}$$
        </p>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 2: Tìm Cơ sở của Không gian Ảnh Im(T)
        </h4>
        <p>
          Các cột trụ của $\\text{RREF}(A)$ nằm tại các vị trí: $${pivotColsNames}$. Các cột tương ứng của ma trận gốc $A$ tạo thành một cơ sở của Không gian ảnh:
          $$\\text{Im}(T) = \\text{span} \\left\\{ ${imColsLatex} \\right\\}, \\quad \\dim \\text{Im}(T) = ${r}$$
        </p>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 3: Giải Hệ Thuần nhất Ax = 0 tìm Hạt nhân Ker(T)
        </h4>
        <p>
          Hạt nhân $\\ker(T)$ là tập hợp các nghiệm của phương trình $A \\mathbf{x} = \\mathbf{0}$, tương đương với $\\text{RREF}(A) \\mathbf{x} = \\mathbf{0}$:
        </p>
        <div>${tab1KerSteps}</div>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 4: Kết luận Khảo sát
        </h4>
        <p>
          Hạng ma trận: $\\text{rank}(T) = ${r}$, số khuyết: $\\text{nullity}(T) = ${k}$.
        </p>
      </div>
    `;

    // ==========================================
    // TAB 2: ĐỊNH NGHĨA & ĐỊNH LÝ SỐ CHIỀU
    // ==========================================
    const tab2Html = `
      <div style="padding: 6px 0; font-size: 13.5px; line-height: 1.7; color: var(--fg);">
        <p style="margin-bottom: 12px;">
          Ánh xạ tuyến tính $T: \\mathbb{R}^${n} \\to \\mathbb{R}^${n}$ được xác định hoàn toàn bởi ảnh của các vector trong cơ sở chính tắc $\\{e_1, \\dots, e_${n}\\}$:
          $$T(e_j) = A e_j = \\text{cột thứ } j \\text{ của ma trận } A$$
        </p>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          1. Bản chất Hình học của Hạt nhân Ker(T)
        </h4>
        <p>
          Theo định nghĩa: $\\ker(T) = \\{\\mathbf{x} \\in \\mathbb{R}^${n} \\mid T(\\mathbf{x}) = \\mathbf{0}\\}$.
          <br>
          ${
            k === 0
              ? "Vì $\\ker(T) = \\{\\mathbf{0}\\}$, ánh xạ là <strong>đơn ánh</strong> (injective). Không có bất kỳ phương khác không nào bị co xẹp về gốc."
              : `Hạt nhân là một không gian con có số chiều $\\dim \\ker(T) = ${k}$. Mọi vector nằm trên không gian con này đều bị ánh xạ ép dẹp hoàn toàn về điểm gốc tọa độ $O(0,0${n === 3 ? ",0" : ""})$. Đây chính là ${k} chiều không gian bị mất đi trong quá trình biến đổi.`
          }
        </p>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          2. Bản chất Hình học của Không gian Ảnh Im(T)
        </h4>
        <p>
          Theo định nghĩa: $\\text{Im}(T) = \\{T(\\mathbf{x}) \\mid \\mathbf{x} \\in \\mathbb{R}^${n}\\} = \\text{span}\\{T(e_1), \\dots, T(e_${n})\\}$.
          <br>
          ${
            r === n
              ? "Vì $\\dim \\text{Im}(T) = " + n + "$, không gian ảnh bao trùm toàn bộ không gian đích $\\mathbb{R}^" + n + "$, ánh xạ là <strong>toàn ánh</strong> (surjective) và là một <strong>đẳng cấu</strong>."
              : `Toàn bộ không gian $\\mathbb{R}^${n}$ sau biến đổi bị nén ép lại và giam giữ trọn vẹn trong không gian con ${r} chiều $\\text{Im}(T)$.`
          }
        </p>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          3. Kiểm chứng Định lý Hạng - Số khuyết (Rank - Nullity Theorem)
        </h4>
        <div style="background: rgba(2, 132, 199, 0.08); border: 1px solid rgba(2, 132, 199, 0.25); padding: 12px; border-radius: 4px; margin: 10px 0;">
          <p style="margin: 0; font-weight: 600;">
            Định lý khẳng định với mọi ánh xạ tuyến tính $T: V \\to W$:
            $$\\dim \\ker(T) + \\dim \\text{Im}(T) = \\dim(V)$$
          </p>
        </div>
        <p>
          Thay các kết quả tính toán vào định lý:
          $$\\dim \\ker(T) + \\dim \\text{Im}(T) = ${k} + ${r} = ${n} = \\dim(\\mathbb{R}^${n})$$
          Định lý được nghiệm đúng.
        </p>

        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); padding: 12px; border-radius: 2px; margin-top: 14px;">
          <strong style="color: #10b981;">Ý nghĩa vật lý & hình học:</strong><br>
          Số chiều bị ép mất về gốc $\\mathbf{0}$ ($\\text{nullity} = ${k}$) cộng với số chiều còn lại của ảnh ($\\text{rank} = ${r}$) luôn bảo toàn bằng đúng số chiều tự do ban đầu ($n = ${n}$).
        </div>
      </div>
    `;

    if (window.App && typeof App.openSolutionPanel === "function") {
      App.openSolutionPanel({
        title: "Khảo Sát Hạt Nhân Ker(T) & Không Gian Ảnh Im(T)",
        math: `A \\in \\mathbb{R}^{${n} \\times ${n}}`,
        content1: tab1Html,
        content2: tab2Html,
        content2Sub: "",
        tab1Label: "Cách 1: Ma trận & Khử Gauss",
        tab2Label: "Cách 2: Định nghĩa & Định lý số chiều",
        showSubTabs: false,
        autoOpen: true
      });
    } else if (typeof App.openCustomSolution === "function") {
      App.openCustomSolution("Khảo Sát Hạt Nhân & Không Gian Ảnh", tab1Html);
    }
  }

  // =========================================================================
  // MODULE ĐIỀU HÀNH CHỦ ĐỀ 5 (Topic5Module)
  // =========================================================================
  const Topic5Module = {
    _isInitialized: false,
    _lastAnalysis: null,

    init: function () {
      if (this._isInitialized) return;
      const btnInspect = $("btnLTInspect");
      if (!btnInspect) return;
      this._isInitialized = true;

      // 1. Làm mới dropdown chọn ma trận từ App.matrixList
      if (typeof App.refreshLTMatrixDropdown === "function") {
        App.refreshLTMatrixDropdown();
      }

      const sel = $("ltMatrixSelect");
      const previewEl = $("ltMatrixPreview");
      if (sel) {
        sel.addEventListener("change", () => {
          if (typeof App.stopLTAnimation === "function") {
            try { App.stopLTAnimation(); } catch (_) {}
          }
          const selData = App.getOrEnsureSelectedSquareMatrix
            ? App.getOrEnsureSelectedSquareMatrix("ltMatrixSelect")
            : null;
          if (selData && typeof App.renderMatrixPreviewGrid === "function") {
            App.renderMatrixPreviewGrid(previewEl, selData.item, { isConic: false });
          }
          // Nếu bảng kết quả đang mở thì khảo sát lại ma trận mới
          const resBox = $("result_lt_info");
          if (resBox && resBox.style.display !== "none") {
            this.execute();
          }
        });
      }

      // 2. Nút Khảo sát (#btnLTInspect)
      btnInspect.addEventListener("click", () => {
        this.execute();
      });

      // 3. Nút Trực quan (#btnLTAnimate)
      const btnAnimate = $("btnLTAnimate");
      if (btnAnimate) {
        btnAnimate.addEventListener("click", () => {
          const selData = App.getOrEnsureSelectedSquareMatrix
            ? App.getOrEnsureSelectedSquareMatrix("ltMatrixSelect")
            : null;
          if (!selData) return;

          if (window.App && App.LTAnimator) {
            if (App.LTAnimator.isActive()) {
              App.LTAnimator.stop();
            } else {
              this.execute();
              App.LTAnimator.start(selData.item);
            }
          }
        });
      }

      // 4. Nút Lời giải (#btnLTSolution)
      const btnSol = $("btnLTSolution");
      if (btnSol) {
        btnSol.addEventListener("click", () => {
          const selData = App.getOrEnsureSelectedSquareMatrix
            ? App.getOrEnsureSelectedSquareMatrix("ltMatrixSelect")
            : null;
          if (!selData) return;
          const analysis = computeLTAnalysis(selData.values, selData.n);
          generateLinearTransformSolution(selData.item, analysis);
        });
      }

      // 5. Checkboxes hiển thị lớp hình học
      const chkKer = $("chkLTShowKer");
      const chkIm = $("chkLTShowIm");
      const chkComp = $("chkLTShowComp");
      const handleCheckboxChange = () => {
        if (App.mode === "3D" && window.Vec3D && typeof Vec3D.hardRefresh3D === "function") {
          Vec3D.hardRefresh3D();
        } else if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
          Vec2D.draw2DAllVectors();
        }
      };
      if (chkKer) chkKer.addEventListener("change", handleCheckboxChange);
      if (chkIm) chkIm.addEventListener("change", handleCheckboxChange);
      if (chkComp) chkComp.addEventListener("change", handleCheckboxChange);
    },

    execute: function () {
      if (!this._isInitialized) this.init();

      const selData = App.getOrEnsureSelectedSquareMatrix
        ? App.getOrEnsureSelectedSquareMatrix("ltMatrixSelect")
        : null;
      if (!selData) return;

      const analysis = computeLTAnalysis(selData.values, selData.n);
      this._lastAnalysis = analysis;

      // Đồng bộ chế độ 2D / 3D
      if (analysis.is3D && App.mode !== "3D") {
        if (typeof App.setMode === "function") App.setMode("3D");
        else if (typeof App.toggleMode === "function") App.toggleMode();
      } else if (!analysis.is3D && App.mode === "3D") {
        if (typeof App.setMode === "function") App.setMode("2D");
        else if (typeof App.toggleMode === "function") App.toggleMode();
      }

      // Hiển thị khung kết quả chuẩn
      renderLTInfoCard(selData.item, analysis);

      // Cập nhật khung xem trước ma trận
      const previewEl = $("ltMatrixPreview");
      if (previewEl && typeof App.renderMatrixPreviewGrid === "function") {
        App.renderMatrixPreviewGrid(previewEl, selData.item, { isConic: false });
      }

      // Vẽ lại trên Viewers
      if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
        Vec2D.draw2DAllVectors();
      }
      if (window.Vec3D && typeof Vec3D.hardRefresh3D === "function") {
        Vec3D.hardRefresh3D();
      }
    },

    onTaskSelect: function (taskId) {
      if (
        taskId === "topic5_linear_transformation" ||
        taskId === "topic5_kernel_image" ||
        taskId === "s25" ||
        taskId === "topic5_matrix_transform" ||
        taskId === "s26"
      ) {
        if (!this._isInitialized) this.init();
        if (typeof App.refreshLTMatrixDropdown === "function") {
          App.refreshLTMatrixDropdown();
        }
      } else {
        if (typeof App.stopLTAnimation === "function") {
          try { App.stopLTAnimation(); } catch (_) {}
        }
      }
    }
  };

  // Hàm tiện ích dừng hoạt cảnh toàn cục
  App.stopLTAnimation = function () {
    if (window.App && App.LTAnimator && App.LTAnimator.isActive()) {
      App.LTAnimator.stop();
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
