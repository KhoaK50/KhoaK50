// =========================================================================
// topic7_quadratic_forms_conics.js - Module Chủ Đề 7: Dạng Toàn Phương
// Khảo sát Dạng Toàn Phương x^T A x, Trục Đối Xứng và Đưa về Dạng Chính Tắc
// Đồng bộ 2D (2x2 Conic) và 3D (3x3 Quadric) với App.matrixList & App.ConicAnimator
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

  function normVec(v) {
    return Math.hypot(v[0] || 0, v[1] || 0, v[2] || 0);
  }

  function cross3(a, b) {
    return [
      (a[1] || 0) * (b[2] || 0) - (a[2] || 0) * (b[1] || 0),
      (a[2] || 0) * (b[0] || 0) - (a[0] || 0) * (b[2] || 0),
      (a[0] || 0) * (b[1] || 0) - (a[1] || 0) * (b[0] || 0)
    ];
  }

  // --- THUẬT TOÁN ĐẠI SỐ TUYẾN TÍNH PHÂN TÍCH DẠNG TOÀN PHƯƠNG ---
  function computeConicAnalysis(rawValues, n) {
    const dim = n === 3 ? 3 : 2;
    const origMatrix = [];
    for (let i = 0; i < dim; i++) {
      origMatrix[i] = [];
      for (let j = 0; j < dim; j++) {
        origMatrix[i][j] = Number(rawValues?.[i]?.[j] ?? 0);
      }
    }

    // 1. Kiểm tra đối xứng và trích xuất ma trận đối xứng A_sym = 1/2 (A + A^T)
    let isSymmetric = true;
    for (let i = 0; i < dim; i++) {
      for (let j = i + 1; j < dim; j++) {
        if (Math.abs(origMatrix[i][j] - origMatrix[j][i]) > 1e-5) {
          isSymmetric = false;
          break;
        }
      }
      if (!isSymmetric) break;
    }

    const A = [];
    for (let i = 0; i < dim; i++) {
      A[i] = [];
      for (let j = 0; j < dim; j++) {
        A[i][j] = (origMatrix[i][j] + origMatrix[j][i]) / 2;
      }
    }

    let eigenvalues = [];
    let eigenvectors = [];
    let P = [];
    let theta2D = 0;

    if (dim === 2) {
      const a = A[0][0];
      const b = A[0][1];
      const c = A[1][1];
      const tr = a + c;
      const disc = Math.sqrt(Math.max(0, (a - c) * (a - c) + 4 * b * b));
      let l1 = (tr + disc) / 2;
      let l2 = (tr - disc) / 2;
      if (Math.abs(l1 - Math.round(l1)) < 1e-5) l1 = Math.round(l1);
      if (Math.abs(l2 - Math.round(l2)) < 1e-5) l2 = Math.round(l2);

      let e1 = [1, 0];
      let e2 = [0, 1];
      if (Math.abs(b) > 1e-6) {
        const vx = b;
        const vy = l1 - a;
        const len = Math.hypot(vx, vy) || 1;
        e1 = [vx / len, vy / len];
        if (e1[0] < -1e-6 || (Math.abs(e1[0]) <= 1e-6 && e1[1] < 0)) {
          e1 = [-e1[0], -e1[1]];
        }
        e2 = [-e1[1], e1[0]];
      } else if (a < c) {
        e1 = [0, 1];
        e2 = [-1, 0];
      }

      theta2D = Math.atan2(e1[1], e1[0]);
      eigenvalues = [l1, l2];
      eigenvectors = [e1, e2];
      P = [
        [e1[0], e2[0]],
        [e1[1], e2[1]]
      ];
    } else {
      // Ma trận đối xứng 3x3: Thuật toán Jacobi tìm trị riêng và vector riêng trực chuẩn
      const D = A.map((r) => r.slice());
      const V = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ];
      for (let iter = 0; iter < 50; iter++) {
        let p = 0, q = 1;
        let maxOff = Math.abs(D[0][1]);
        if (Math.abs(D[0][2]) > maxOff) { p = 0; q = 2; maxOff = Math.abs(D[0][2]); }
        if (Math.abs(D[1][2]) > maxOff) { p = 1; q = 2; maxOff = Math.abs(D[1][2]); }
        if (maxOff < 1e-10) break;

        const diff = D[q][q] - D[p][p];
        let t;
        if (Math.abs(diff) < 1e-12) {
          t = D[p][q] > 0 ? 1 : -1;
        } else {
          const phi = diff / (2 * D[p][q]);
          t = 1 / (Math.abs(phi) + Math.sqrt(phi * phi + 1));
          if (phi < 0) t = -t;
        }
        const c = 1 / Math.sqrt(1 + t * t);
        const s = t * c;
        const tau = s / (1 + c);
        const h = t * D[p][q];
        D[p][p] -= h;
        D[q][q] += h;
        D[p][q] = 0;
        D[q][p] = 0;

        for (let r = 0; r < 3; r++) {
          if (r !== p && r !== q) {
            const g = D[r][p];
            const m = D[r][q];
            D[r][p] = D[p][r] = g - s * (m + g * tau);
            D[r][q] = D[q][r] = m + s * (g - m * tau);
          }
          const vp = V[r][p];
          const vq = V[r][q];
          V[r][p] = vp - s * (vq + vp * tau);
          V[r][q] = vq + s * (vp - vq * tau);
        }
      }

      const pairs = [0, 1, 2].map((idx) => {
        let lam = D[idx][idx];
        if (Math.abs(lam - Math.round(lam)) < 1e-5) lam = Math.round(lam);
        return {
          lam,
          vec: [V[0][idx], V[1][idx], V[2][idx]]
        };
      });
      pairs.sort((x, y) => y.lam - x.lam);

      eigenvalues = pairs.map((p) => p.lam);
      let e1 = pairs[0].vec;
      let e2 = pairs[1].vec;
      const n1 = normVec(e1) || 1;
      e1 = e1.map((x) => x / n1);
      const n2 = normVec(e2) || 1;
      e2 = e2.map((x) => x / n2);
      const e3 = cross3(e1, e2); // Đảm bảo hệ trục thuận det(P) = +1
      eigenvectors = [e1, e2, e3];
      P = [
        [e1[0], e2[0], e3[0]],
        [e1[1], e2[1], e3[1]],
        [e1[2], e2[2], e3[2]]
      ];
    }

    // Chỉ số quán tính Sylvester (p: số trị riêng dương, q: số trị riêng âm)
    const pPos = eigenvalues.filter((x) => x > 1e-5).length;
    const qNeg = eigenvalues.filter((x) => x < -1e-5).length;
    const rank = pPos + qNeg;

    // Phân loại đường bậc hai / mặt bậc hai x^T A x = 1
    let conicType = "";
    let statusColor = "var(--primary-base, #0284c7)";
    if (dim === 2) {
      const [l1, l2] = eigenvalues;
      if (l1 > 1e-5 && l2 > 1e-5) {
        conicType = Math.abs(l1 - l2) < 1e-5 ? "Đường tròn (Elip cân)" : "Elip xác định dương";
        statusColor = "#10b981";
      } else if (l1 * l2 < -1e-5) {
        conicType = "Hyperbol (Đổi dấu)";
        statusColor = "#f59e0b";
      } else if (l1 <= 1e-5 && l2 <= 1e-5) {
        conicType = "Xác định âm (Tập mức = 1 rỗng)";
        statusColor = "#ef4444";
      } else {
        conicType = "Suy biến (Cặp đường thẳng song song)";
        statusColor = "#8b5cf6";
      }
    } else {
      if (pPos === 3) {
        conicType = "Mặt Elipsoid (Xác định dương)";
        statusColor = "#10b981";
      } else if (pPos === 2 && qNeg === 1) {
        conicType = "Hyperboloid 1 tầng";
        statusColor = "#f59e0b";
      } else if (pPos === 1 && qNeg === 2) {
        conicType = "Hyperboloid 2 tầng";
        statusColor = "#0284c7";
      } else if (rank < 3 && pPos > 0) {
        conicType = "Mặt trụ bậc hai (Suy biến)";
        statusColor = "#8b5cf6";
      } else {
        conicType = "Mặt bậc hai xác định âm";
        statusColor = "#ef4444";
      }
    }

    // Chuỗi LaTeX của dạng toàn phương ban đầu Q(x) = x^T A x
    const varNames = dim === 3 ? ["x_1", "x_2", "x_3"] : ["x", "y"];
    const qTerms = [];
    for (let i = 0; i < dim; i++) {
      const aii = A[i][i];
      if (Math.abs(aii) > 1e-6) {
        const coeff = fmtScalarLatex(Math.abs(aii));
        const sign = aii < 0 ? "-" : qTerms.length > 0 ? "+" : "";
        const cStr = coeff === "1" ? "" : coeff;
        qTerms.push(`${sign} ${cStr}${varNames[i]}^2`);
      }
    }
    for (let i = 0; i < dim; i++) {
      for (let j = i + 1; j < dim; j++) {
        const twoAij = 2 * A[i][j];
        if (Math.abs(twoAij) > 1e-6) {
          const coeff = fmtScalarLatex(Math.abs(twoAij));
          const sign = twoAij < 0 ? "-" : qTerms.length > 0 ? "+" : "";
          const cStr = coeff === "1" ? "" : coeff;
          qTerms.push(`${sign} ${cStr}${varNames[i]}${varNames[j]}`);
        }
      }
    }
    const qOrigLatex = `Q(${varNames.join(",")}) = ${qTerms.length ? qTerms.join(" ") : "0"}`;

    // Chuỗi LaTeX của dạng chính tắc Q(Y) = sum lambda_i Y_i^2
    const yVars = dim === 3 ? ["Y_1", "Y_2", "Y_3"] : ["X", "Y"];
    const canTerms = [];
    for (let i = 0; i < dim; i++) {
      const lam = eigenvalues[i];
      if (Math.abs(lam) > 1e-6) {
        const coeff = fmtScalarLatex(Math.abs(lam));
        const sign = lam < 0 ? "-" : canTerms.length > 0 ? "+" : "";
        const cStr = coeff === "1" ? "" : coeff;
        canTerms.push(`${sign} ${cStr}${yVars[i]}^2`);
      }
    }
    const canonicalLatex = `${canTerms.length ? canTerms.join(" ") : "0"} = 1`;

    return {
      dim,
      is3D: dim === 3,
      origMatrix,
      matrix: A,
      isSymmetric,
      eigenvalues,
      eigenvectors,
      P,
      theta2D,
      thetaDeg: Number(((theta2D * 180) / Math.PI).toFixed(1)),
      pPos,
      qNeg,
      rank,
      conicType,
      statusColor,
      qOrigLatex,
      canonicalLatex
    };
  }

  // --- KẾT XUẤT KHUNG KẾT QUẢ MATH-CLEAN-CARD ---
  function renderConicInfoCard(matItem, analysis) {
    const box = $("result_conic_info");
    if (!box || !analysis) return;

    box.style.display = "block";
    box.style.padding = "0";
    box.style.background = "transparent";
    box.style.border = "none";

    const mfStyle =
      "background: var(--bg-paper, var(--card, #fff)); border: 1px solid var(--border-subtle, var(--border, #ccc)); border-radius: 4px; padding: 6px 12px; font-size: 1.05em; color: var(--text-main, var(--fg, #333)); pointer-events: none; width: 100%; box-sizing: border-box;";

    const eigListLatex = analysis.eigenvalues
      .map((lam, idx) => `\\lambda_${idx + 1} = ${fmtScalarLatex(lam)}`)
      .join(", \\quad ");

    const pMatrixLatex = `P = ${matrixToBmatrixLatex(analysis.P)}, \\quad \\det(P) = +1`;

    const symWarningHtml = !analysis.isSymmetric
      ? `<div style="margin-bottom: 10px; padding: 6px 10px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 4px; font-size: 11.5px; color: var(--fg);">
           Ma trận gốc chưa đối xứng ($A \\neq A^T$). Hệ thống đã tự động trích xuất ma trận đối xứng liên kết $A_{\\text{sym}} = \\frac{1}{2}(A + A^T)$ giữ nguyên dạng toàn phương $x^T A x$.
         </div>`
      : "";

    box.innerHTML = `
      <div class="math-Clean-Card" style="margin-top: 8px; padding-top: 10px; border-top: 1px solid var(--border-subtle, var(--border));">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background: var(--bg-hover, rgba(0,0,0,0.03)); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-subtle, var(--border));">
          <span style="font-size: 0.78em; color: var(--text-muted, var(--muted)); font-weight: 700;">CHỈ SỐ QUÁN TÍNH: <strong style="color: var(--primary-base, var(--fg)); font-size: 1.1em;">(${analysis.pPos}, ${analysis.qNeg})</strong></span>
          <span style="font-size: 0.8em; font-weight: 600; color: ${analysis.statusColor};">${analysis.conicType}</span>
        </div>

        ${symWarningHtml}

        <div style="font-size: 0.78em; font-weight: 700; color: var(--text-muted, var(--muted)); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">DẠNG TOÀN PHƯƠNG BAN ĐẦU:</div>
        <div style="margin-bottom: 10px;">
          <math-field read-only style="${mfStyle}">${analysis.qOrigLatex}</math-field>
        </div>

        <div style="font-size: 0.78em; font-weight: 700; color: var(--text-muted, var(--muted)); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">PHƯƠNG TRÌNH CHÍNH TẮC (SAU PHÉP QUAY X = PY):</div>
        <div style="margin-bottom: 10px;">
          <math-field read-only style="${mfStyle}">${analysis.canonicalLatex}</math-field>
        </div>

        <div style="font-size: 0.78em; font-weight: 700; color: var(--text-muted, var(--muted)); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">CÁC TRỊ RIÊNG ĐẶC TRƯNG:</div>
        <div style="margin-bottom: 10px;">
          <math-field read-only style="${mfStyle}">${eigListLatex}</math-field>
        </div>

        <div style="border-top: 1px dashed var(--border-subtle, var(--border)); padding-top: 8px;">
          <div style="font-size: 0.78em; font-weight: 700; color: var(--text-muted, var(--muted)); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">MA TRẬN XOAY TRỰC GIAO P = [e₁ e₂ ...]:</div>
          <math-field read-only style="${mfStyle}">${pMatrixLatex}</math-field>
        </div>

        <div style="margin-top: 10px; font-size: 0.78em; color: var(--text-muted, var(--muted)); font-style: italic; text-align: center;">Nhấn "Trực quan" để xem hoạt cảnh xoay hệ trục 3 bước hoặc "Lời giải" để xem chứng minh chi tiết!</div>
      </div>
    `;
  }

  // --- BỘ SINH LỜI GIẢI HỌC THUẬT 2 TAB (solution_panel.js) ---
  function generateConicAcademicSolution(matItem, analysis) {
    const n = analysis.dim;
    const A_latex = matrixToBmatrixLatex(analysis.matrix);
    const P_latex = matrixToBmatrixLatex(analysis.P);
    const eigLatex = analysis.eigenvalues
      .map((lam, i) => `\\lambda_${i + 1} = ${fmtScalarLatex(lam)}`)
      .join(", \\quad ");
    const eColsLatex = analysis.eigenvectors
      .map((vec, i) => `e_${i + 1} = ${vecToColLatex(vec)}`)
      .join(", \\quad ");

    const tab1Html = `
      <div style="padding: 6px 0; font-size: 13.5px; line-height: 1.7; color: var(--fg);">
        <p style="margin-bottom: 12px;">
          Xét dạng toàn phương trên $\\mathbb{R}^${n}$ có biểu thức giải tích:
          $$${analysis.qOrigLatex}$$
          Ma trận đối xứng thực liên kết với dạng toàn phương là:
          $$A = ${A_latex}$$
        </p>

        <div style="background: var(--bg-hover); border-left: 3px solid var(--primary-base); padding: 10px 14px; margin-bottom: 14px; border-radius: 2px;">
          <strong>Mục tiêu:</strong> Chéo hóa trực giao ma trận đối xứng $A = P D P^T$ để khử hoàn toàn các số hạng chéo $x_i x_j$ ($i \\neq j$) và xác định các trục đối xứng hình học.
        </div>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 1: Giải Phương trình Đặc trưng tìm Trị riêng
        </h4>
        <p>
          Xét đa thức đặc trưng $\\det(A - \\lambda I_${n}) = 0$. Vì $A = A^T$ là ma trận đối xứng thực nên toàn bộ nghiệm đặc trưng đều là số thực:
          $$${eigLatex}$$
        </p>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 2: Tìm Hệ Cơ sở Trực chuẩn gồm các Vector riêng
        </h4>
        <p>
          Ứng với mỗi trị riêng $\\lambda_i$, giải hệ $(A - \\lambda_i I)\\mathbf{v} = \\mathbf{0}$ rồi chuẩn hóa độ dài về 1, ta thu được hệ cơ sở trực chuẩn:
          $$${eColsLatex}$$
          Các vector riêng này đôi một vuông góc ($e_i \\perp e_j$) và chỉ đúng phương của các trục đối xứng chính của đường/mặt bậc hai.
        </p>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 3: Lập Ma trận Chuyển cơ sở Trực giao P và Đưa về Chính tắc
        </h4>
        <p>
          Ghép các vector riêng trực chuẩn làm các cột của ma trận $P$ (sắp thứ tự sao cho $\\det(P) = +1$ để bảo toàn phép quay cứng):
          $$P = ${P_latex}$$
          Thực hiện phép đổi biến trực giao $\\mathbf{x} = P \\mathbf{Y}$, dạng toàn phương rút gọn về dạng chính tắc:
          $$${analysis.canonicalLatex}$$
          Phân loại hình học: <strong>${analysis.conicType}</strong>.
        </p>
      </div>
    `;

    const tab2Html = `
      <div style="padding: 6px 0; font-size: 13.5px; line-height: 1.7; color: var(--fg);">
        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 8px 0 6px; letter-spacing: 0.5px;">
          1. Ý nghĩa Hình học của Số hạng chéo và Phép quay Trực giao
        </h4>
        <p>
          Sự xuất hiện của các phần tử ngoài đường chéo chính $a_{ij} \\neq 0$ ($i \\neq j$) trong ma trận $A$ chính là nguyên nhân làm đường bậc hai (2D) hoặc mặt bậc hai (3D) bị xoay lệch khỏi hệ trục tọa độ chuẩn $Oxy${n === 3 ? "z" : ""}${n === 2 ? ` một góc $\\theta = ${analysis.thetaDeg}^\\circ$` : ""}.
          <br>
          Phép biến đổi trực giao $\\mathbf{x} = P \\mathbf{Y}$ với $P^T P = I, \\det(P) = +1$ là một <strong>phép đẳng cự (isometry)</strong>: nó giữ nguyên khoảng cách, góc và hình dạng của thiết diện, chỉ xoay hệ trục tọa độ về trùng khít với các trục riêng $e_i$.
        </p>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          2. Luật Quán tính Sylvester (Sylvester's Law of Inertia)
        </h4>
        <div style="background: rgba(2, 132, 199, 0.08); border: 1px solid rgba(2, 132, 199, 0.25); padding: 12px; border-radius: 4px; margin: 10px 0;">
          <p style="margin: 0; font-weight: 600;">
            Số lượng hệ số dương ($p$) và số lượng hệ số âm ($q$) trong dạng chính tắc của một dạng toàn phương thực là bất biến, không phụ thuộc vào cách chọn phép biến đổi tuyến tính không suy biến đưa nó về dạng chính tắc.
          </p>
        </div>
        <p>
          Đối với ma trận $A$ đang khảo sát:
          <br>- Chỉ số dương quán tính: $p = ${analysis.pPos}$
          <br>- Chỉ số âm quán tính: $q = ${analysis.qNeg}$
          <br>- Hạng của dạng toàn phương: $r = p + q = ${analysis.rank}$
          <br>- Cặp chỉ số quán tính $(p, q) = (${analysis.pPos}, ${analysis.qNeg})$ quyết định duy nhất hình thái hình học là <strong>${analysis.conicType}</strong>.
        </p>
      </div>
    `;

    if (window.App && typeof App.openSolutionPanel === "function") {
      App.openSolutionPanel({
        title: "Chéo Hóa Trực Giao & Chính Tắc Hóa Dạng Toàn Phương",
        math: analysis.qOrigLatex,
        content1: tab1Html,
        content2: tab2Html,
        content2Sub: "",
        tab1Label: "Cách 1: Khử số hạng chéo & Chéo hóa trực giao",
        tab2Label: "Cách 2: Phương pháp Lagrange & Dấu quán tính",
        showSubTabs: false,
        autoOpen: true
      });
    } else if (typeof App.openCustomSolution === "function") {
      App.openCustomSolution("Chéo Hóa Trực Giao & Dạng Toàn Phương", tab1Html);
    }
  }

  // =========================================================================
  // MODULE ĐIỀU HÀNH CHỦ ĐỀ 7 (Topic7Module)
  // =========================================================================
  const Topic7Module = {
    _isInitialized: false,
    _lastAnalysis: null,

    init: function () {
      if (this._isInitialized) return;
      const btnDraw = $("btnConicDraw");
      if (!btnDraw) return;
      this._isInitialized = true;

      if (typeof App.refreshConicMatrixDropdown === "function") {
        App.refreshConicMatrixDropdown();
      }

      const sel = $("conicMatrixSelect");
      const previewEl = $("conicMatrixPreview");
      if (sel) {
        sel.addEventListener("change", () => {
          if (typeof App.stopConicAnimation === "function") {
            try { App.stopConicAnimation(); } catch (_) {}
          }
          const selData = App.getOrEnsureSelectedSquareMatrix
            ? App.getOrEnsureSelectedSquareMatrix("conicMatrixSelect", { requireSymmetric: true })
            : null;
          if (selData && typeof App.renderMatrixPreviewGrid === "function") {
            App.renderMatrixPreviewGrid(previewEl, selData.item, { isConic: true });
          }
          const resBox = $("result_conic_info");
          if (resBox && resBox.style.display !== "none") {
            this.execute();
          }
        });
      }

      // 1. Nút Chính tắc hóa (#btnConicDraw)
      btnDraw.addEventListener("click", () => {
        this.execute();
      });

      // 2. Nút Trực quan (#btnConicAnimate)
      const btnAnimate = $("btnConicAnimate");
      if (btnAnimate) {
        btnAnimate.addEventListener("click", () => {
          const selData = App.getOrEnsureSelectedSquareMatrix
            ? App.getOrEnsureSelectedSquareMatrix("conicMatrixSelect", { requireSymmetric: true })
            : null;
          if (!selData) return;

          if (window.App && App.ConicAnimator) {
            if (App.ConicAnimator.isActive()) {
              App.ConicAnimator.stop();
            } else {
              this.execute();
              App.ConicAnimator.start(selData.item);
            }
          }
        });
      }

      // 3. Nút Lời giải (#btnConicSolution)
      const btnSol = $("btnConicSolution");
      if (btnSol) {
        btnSol.addEventListener("click", () => {
          const selData = App.getOrEnsureSelectedSquareMatrix
            ? App.getOrEnsureSelectedSquareMatrix("conicMatrixSelect", { requireSymmetric: true })
            : null;
          if (!selData) return;
          const analysis = computeConicAnalysis(selData.values, selData.n);
          generateConicAcademicSolution(selData.item, analysis);
        });
      }
    },

    execute: function () {
      if (!this._isInitialized) this.init();

      const selData = App.getOrEnsureSelectedSquareMatrix
        ? App.getOrEnsureSelectedSquareMatrix("conicMatrixSelect", { requireSymmetric: true })
        : null;
      if (!selData) return;

      const analysis = computeConicAnalysis(selData.values, selData.n);
      this._lastAnalysis = analysis;

      // Đồng bộ chế độ 2D / 3D
      if (analysis.is3D && App.mode !== "3D") {
        if (typeof App.setMode === "function") App.setMode("3D");
        else if (typeof App.toggleMode === "function") App.toggleMode();
      } else if (!analysis.is3D && App.mode === "3D") {
        if (typeof App.setMode === "function") App.setMode("2D");
        else if (typeof App.toggleMode === "function") App.toggleMode();
      }

      renderConicInfoCard(selData.item, analysis);

      const previewEl = $("conicMatrixPreview");
      if (previewEl && typeof App.renderMatrixPreviewGrid === "function") {
        App.renderMatrixPreviewGrid(previewEl, selData.item, { isConic: true });
      }

      if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
        Vec2D.draw2DAllVectors();
      }
      if (window.Vec3D && typeof Vec3D.hardRefresh3D === "function") {
        Vec3D.hardRefresh3D();
      }
    },

    onTaskSelect: function (taskId) {
      if (taskId === "quadratic_form_conic" || taskId === "s28" || taskId === "s29") {
        if (!this._isInitialized) this.init();
        if (typeof App.refreshConicMatrixDropdown === "function") {
          App.refreshConicMatrixDropdown();
        }
      } else {
        if (typeof App.stopConicAnimation === "function") {
          try { App.stopConicAnimation(); } catch (_) {}
        }
      }
    }
  };

  App.stopConicAnimation = function () {
    if (window.App && App.ConicAnimator && App.ConicAnimator.isActive()) {
      App.ConicAnimator.stop();
    }
  };

  if (typeof App.registerTopicModule === "function") {
    App.registerTopicModule("t7", Topic7Module);
  } else {
    window.addEventListener("DOMContentLoaded", function () {
      if (typeof App.registerTopicModule === "function") {
        App.registerTopicModule("t7", Topic7Module);
      }
    });
  }
})();
