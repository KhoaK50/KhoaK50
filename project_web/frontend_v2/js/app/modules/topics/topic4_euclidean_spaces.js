// =========================================================================
// topic4_euclidean_spaces.js - Module Chu De 4: Khong Gian Euclide
// Khao sat su truc giao va Thuat toan truc giao hoa Gram - Schmidt 2D/3D
// Tuan thu triet de Zero Em-dash (\u2014) va chuan muc Anti-Slop.
// =========================================================================
(function () {
  window.App = window.App || {};

  function to3D(v) {
    if (!v) return [0, 0, 0];
    if (v.length >= 3) return [Number(v[0]) || 0, Number(v[1]) || 0, Number(v[2]) || 0];
    return [Number(v[0]) || 0, Number(v[1]) || 0, 0];
  }

  function dotProduct(a, b) {
    return (a[0] || 0) * (b[0] || 0) + (a[1] || 0) * (b[1] || 0) + (a[2] || 0) * (b[2] || 0);
  }

  function norm(a) {
    return Math.sqrt(dotProduct(a, a));
  }

  function scaleVec(v, s) {
    return [(v[0] || 0) * s, (v[1] || 0) * s, (v[2] || 0) * s];
  }

  function addVec(a, b) {
    return [(a[0] || 0) + (b[0] || 0), (a[1] || 0) + (b[1] || 0), (a[2] || 0) + (b[2] || 0)];
  }

  function subVec(a, b) {
    return [(a[0] || 0) - (b[0] || 0), (a[1] || 0) - (b[1] || 0), (a[2] || 0) - (b[2] || 0)];
  }

  function projVec(v, u) {
    const dUU = dotProduct(u, u);
    if (dUU < 1e-9) return [0, 0, 0];
    const c = dotProduct(v, u) / dUU;
    return scaleVec(u, c);
  }

  function normalizeVec(v) {
    const n = norm(v);
    if (n < 1e-9) return [0, 0, 0];
    return scaleVec(v, 1 / n);
  }

  function angleBetween(a, b) {
    const na = norm(a);
    const nb = norm(b);
    if (na < 1e-9 || nb < 1e-9) return 0;
    let cosVal = dotProduct(a, b) / (na * nb);
    cosVal = Math.max(-1, Math.min(1, cosVal));
    return Math.acos(cosVal) * (180 / Math.PI);
  }

  function formatScalar(val) {
    if (!Number.isFinite(val) || Math.abs(val) < 1e-4) return "0";
    if (Math.abs(val - Math.round(val)) < 1e-3) return String(Math.round(val));
    for (let den = 2; den <= 16; den++) {
      const num = Math.round(val * den);
      if (Math.abs(val - num / den) < 1e-3) {
        return num < 0 ? `-${Math.abs(num)}/${den}` : `${num}/${den}`;
      }
    }
    return val.toFixed(2).replace(/\.?0+$/, "");
  }

  function formatVecLatex(v, dim) {
    const d = dim || 2;
    const comps = [];
    for (let i = 0; i < d; i++) {
      comps.push(formatScalar(v[i] || 0));
    }
    return `\\begin{bmatrix} ${comps.join(" \\\\ ")} \\end{bmatrix}`;
  }

  // Lay danh sach vector da chon tu #gsChecklist (tra ve dung tham chieu item trong App.vectorList)
  function getGSSelectedItems() {
    let container = document.getElementById("gsChecklist");
    const vList = Array.isArray(App.vectorList) ? App.vectorList.filter((v) => v.id > 0) : [];
    if (container && !container.querySelector('input[type="checkbox"]') && vList.length > 0) {
      if (typeof App.renderExtraCalcOptions === "function") {
        App.renderExtraCalcOptions();
      }
    }
    const items = [];
    if (container && vList.length > 0) {
      container.querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => {
        const id = Number(cb.value);
        const found = vList.find((v) => v.id === id);
        if (found) items.push(found);
      });
      if (items.length === 0 && vList.length >= 2) {
        const autoPick = vList.slice(0, 3);
        container.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
          if (autoPick.some((it) => it.id === Number(cb.value))) cb.checked = true;
        });
        return autoPick;
      }
    }
    return items;
  }

  // Thuc hien truc giao hoa Gram - Schmidt cho 2 hoac 3 vector
  function computeGSFromItems(items) {
    const vectors = items.map((it) => to3D(it.vec || it));
    const is3D = items.some((it) => {
      const v = it.vec || it;
      return v.length >= 3 && Math.abs(Number(v[2]) || 0) > 1e-4;
    }) || vectors.length >= 3;
    const dim = is3D ? 3 : 2;

    const v1 = vectors[0] || [0, 0, 0];
    const v2 = vectors[1] || [0, 0, 0];
    const v3 = vectors.length >= 3 ? vectors[2] : null;

    // u1 = v1
    const u1 = [...v1];
    const nU1 = norm(u1);
    const nU1Sq = dotProduct(u1, u1);

    // p1 = proj_{u1}(v2)
    const p1 = projVec(v2, u1);
    const u2 = subVec(v2, p1);
    const nU2 = norm(u2);
    const nU2Sq = dotProduct(u2, u2);

    let p31 = [0, 0, 0];
    let p32 = [0, 0, 0];
    let p12 = [0, 0, 0];
    let u3 = null;
    let nU3 = 0;
    let nU3Sq = 0;

    if (v3) {
      p31 = projVec(v3, u1);
      p32 = projVec(v3, u2);
      p12 = addVec(p31, p32);
      u3 = subVec(v3, p12);
      nU3 = norm(u3);
      nU3Sq = dotProduct(u3, u3);
    }

    const e1 = normalizeVec(u1);
    const e2 = normalizeVec(u2);
    const e3 = u3 ? normalizeVec(u3) : null;

    return {
      items,
      vectors,
      is3D,
      dim,
      v1,
      v2,
      v3,
      u1,
      u2,
      u3,
      p1,
      p31,
      p32,
      p12,
      e1,
      e2,
      e3,
      nU1,
      nU2,
      nU3,
      nU1Sq,
      nU2Sq,
      nU3Sq
    };
  }

  // Hien thi bang ket qua math-Clean-Card dong bo
  function renderGSInfoCard(res) {
    const box = document.getElementById("result_gs_info");
    if (!box || !res) return;

    box.style.display = "block";
    const mfStyle =
      "background: var(--bg-paper, var(--card, #fff)); border: 1px solid var(--border-subtle, var(--border, #ccc)); border-radius: 4px; padding: 6px 12px; font-size: 1.05em; color: var(--text-main, var(--fg, #333)); pointer-events: none; width: 100%; box-sizing: border-box;";

    const dim = res.dim;
    const m = res.v3 ? 3 : 2;

    const u1Latex = `u_1 = ${formatVecLatex(res.u1, dim)}`;
    const u2Latex = `u_2 = ${formatVecLatex(res.u2, dim)}`;
    const u3Latex = res.u3 ? `u_3 = ${formatVecLatex(res.u3, dim)}` : "";

    const checkDot12 = Math.abs(dotProduct(res.u1, res.u2)).toFixed(4);
    let checkDotsLatex = `\\langle u_1, u_2 \\rangle = ${checkDot12} \\approx 0`;
    if (res.u3) {
      const checkDot13 = Math.abs(dotProduct(res.u1, res.u3)).toFixed(4);
      const checkDot23 = Math.abs(dotProduct(res.u2, res.u3)).toFixed(4);
      checkDotsLatex += `, \\quad \\langle u_1, u_3 \\rangle = ${checkDot13}, \\quad \\langle u_2, u_3 \\rangle = ${checkDot23}`;
    }

    const e1Latex = `e_1 = ${formatVecLatex(res.e1, dim)}`;
    const e2Latex = `e_2 = ${formatVecLatex(res.e2, dim)}`;
    const e3Latex = res.e3 ? `e_3 = ${formatVecLatex(res.e3, dim)}` : "";

    const uLatexItems = [
      `<math-field read-only style="${mfStyle}">${u1Latex}</math-field>`,
      `<math-field read-only style="${mfStyle}">${u2Latex}</math-field>`
    ];
    if (u3Latex) uLatexItems.push(`<math-field read-only style="${mfStyle}">${u3Latex}</math-field>`);

    const eLatexItems = [
      `<math-field read-only style="${mfStyle}">${e1Latex}</math-field>`,
      `<math-field read-only style="${mfStyle}">${e2Latex}</math-field>`
    ];
    if (e3Latex) eLatexItems.push(`<math-field read-only style="${mfStyle}">${e3Latex}</math-field>`);

    box.innerHTML = `
      <div style="margin-top: 8px; padding-top: 10px; border-top: 1px solid var(--border-subtle, var(--border));">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; background: var(--bg-hover, rgba(0,0,0,0.03)); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-subtle, var(--border));">
          <span style="font-size: 0.78em; color: var(--text-muted, var(--muted)); font-weight: 700;">TRỰC GIAO HÓA GRAM - SCHMIDT: <strong style="color: var(--primary-base, var(--fg)); font-size: 1.15em;">${m} VECTOR</strong></span>
          <span style="font-size: 0.8em; font-weight: 600; color: #10b981;">Đã trực giao hóa</span>
        </div>

        <div style="font-size: 0.78em; font-weight: 700; color: var(--text-muted, var(--muted)); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">CƠ SỞ TRỰC GIAO (ORTHOGONAL BASIS):</div>
        <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px;">
          ${uLatexItems.join("")}
          <math-field read-only style="${mfStyle}">${checkDotsLatex}</math-field>
        </div>

        <div style="border-top: 1px dashed var(--border-subtle, var(--border)); padding-top: 10px; margin-bottom: 10px;">
          <div style="font-size: 0.78em; font-weight: 700; color: var(--text-muted, var(--muted)); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">CƠ SỞ TRỰC CHUẨN (ORTHONORMAL BASIS, R = 1):</div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${eLatexItems.join("")}
          </div>
        </div>

        <div style="margin-top: 10px; font-size: 0.78em; color: var(--text-muted, var(--muted)); font-style: italic; text-align: center;">
          Nhấn "Trực quan" để xem hoạt cảnh 3 bước hoặc "Lời giải" để xem chứng minh chi tiết!
        </div>
      </div>
    `;
  }

  // Sinh loi giai KaTeX han lam chi tiet 2 Tab
  function generateGramSchmidtSolution(items) {
    const res = computeGSFromItems(items);
    const dim = res.dim;
    const v1 = res.v1;
    const v2 = res.v2;
    const v3 = res.v3;
    const u1 = res.u1;
    const u2 = res.u2;
    const u3 = res.u3;
    const e1 = res.e1;
    const e2 = res.e2;
    const e3 = res.e3;
    const p1 = res.p1;

    const dotV2U1 = dotProduct(v2, u1);
    const coeff1 = res.nU1Sq > 1e-9 ? (dotV2U1 / res.nU1Sq).toFixed(4) : "0";

    // TAB 1: Thuat toan truc giao hoa tieu chuan
    let tab1Html = `
      <div style="padding: 6px 0; font-size: 13.5px; line-height: 1.7; color: var(--fg);">
        <p style="margin-bottom: 12px;">
          Xét hệ vector $\\mathcal{S} = \\{ \\vec{v}_1, \\vec{v}_2 ${v3 ? ", \\vec{v}_3" : ""} \\} \\subset \\mathbb{R}^${dim}$ với tích vô hướng chính tắc:
          $$\\vec{v}_1 = ${formatVecLatex(v1, dim)}, \\quad \\vec{v}_2 = ${formatVecLatex(v2, dim)} ${v3 ? `, \\quad \\vec{v}_3 = ${formatVecLatex(v3, dim)}` : ""}$$
        </p>

        <div style="background: var(--bg-hover); border-left: 3px solid var(--primary-base); padding: 10px 14px; margin-bottom: 14px; border-radius: 2px;">
          <strong>Mục tiêu:</strong> Dùng thuật toán Gram - Schmidt biến đổi $\\mathcal{S}$ thành cơ sở trực giao $\\mathcal{B}_{ort} = \\{ \\vec{u}_1, \\vec{u}_2 ${v3 ? ", \\vec{u}_3" : ""} \\}$ thỏa mãn $\\langle \\vec{u}_i, \\vec{u}_j \\rangle = 0$ ($i \\neq j$) và chuẩn hóa thành cơ sở trực chuẩn $\\mathcal{B}_{norm} = \\{ \\vec{e}_i \\}$.
        </div>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 1: Cố định vector trực giao thứ nhất
        </h4>
        <p>
          Chọn vector đầu tiên làm trục chuẩn:
          $$\\vec{u}_1 = \\vec{v}_1 = ${formatVecLatex(u1, dim)}$$
          Bình phương độ dài và độ dài của $\\vec{u}_1$:
          $$\\|\\vec{u}_1\\|^2 = \\langle \\vec{u}_1, \\vec{u}_1 \\rangle = ${res.nU1Sq.toFixed(2)}, \\quad \\|\\vec{u}_1\\| = \\sqrt{${res.nU1Sq.toFixed(2)}} \\approx ${res.nU1.toFixed(4)}$$
        </p>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 2: Tìm hình chiếu và triệt tiêu thành phần song song
        </h4>
        <p>
          Tích vô hướng giữa $\\vec{v}_2$ và $\\vec{u}_1$:
          $$\\langle \\vec{v}_2, \\vec{u}_1 \\rangle = ${dotV2U1.toFixed(2)}$$
          Hình chiếu trực giao của $\\vec{v}_2$ lên phương $\\vec{u}_1$:
          $$\\vec{p}_1 = \\text{proj}_{\\vec{u}_1}(\\vec{v}_2) = \\frac{\\langle \\vec{v}_2, \\vec{u}_1 \\rangle}{\\|\\vec{u}_1\\|^2} \\vec{u}_1 = \\frac{${dotV2U1.toFixed(2)}}{${res.nU1Sq.toFixed(2)}} \\vec{u}_1 \\approx ${coeff1} ${formatVecLatex(u1, dim)} = ${formatVecLatex(p1, dim)}$$
          Trừ bỏ hình chiếu để nhận vector trực giao $\\vec{u}_2$:
          $$\\vec{u}_2 = \\vec{v}_2 - \\vec{p}_1 = ${formatVecLatex(v2, dim)} - ${formatVecLatex(p1, dim)} = ${formatVecLatex(u2, dim)}$$
          Kiểm tra tính trực giao:
          $$\\langle \\vec{u}_1, \\vec{u}_2 \\rangle = ${dotProduct(u1, u2).toFixed(4)} \\approx 0$$
          Độ dài của $\\vec{u}_2$:
          $$\\|\\vec{u}_2\\|^2 = ${res.nU2Sq.toFixed(2)}, \\quad \\|\\vec{u}_2\\| \\approx ${res.nU2.toFixed(4)}$$
        </p>
    `;

    if (v3 && u3) {
      const dotV3U1 = dotProduct(v3, u1);
      const dotV3U2 = dotProduct(v3, u2);
      const c31 = res.nU1Sq > 1e-9 ? (dotV3U1 / res.nU1Sq).toFixed(4) : "0";
      const c32 = res.nU2Sq > 1e-9 ? (dotV3U2 / res.nU2Sq).toFixed(4) : "0";

      tab1Html += `
        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Bước 3: Mở rộng trực giao trong 3D cho vector thứ ba
        </h4>
        <p>
          Hạ hình chiếu của $\\vec{v}_3$ xuống mặt phẳng $\\text{span}(\\vec{u}_1, \\vec{u}_2)$:
          $$\\vec{p}_{12} = \\text{proj}_{\\vec{u}_1}(\\vec{v}_3) + \\text{proj}_{\\vec{u}_2}(\\vec{v}_3) = \\frac{\\langle \\vec{v}_3, \\vec{u}_1 \\rangle}{\\|\\vec{u}_1\\|^2} \\vec{u}_1 + \\frac{\\langle \\vec{v}_3, \\vec{u}_2 \\rangle}{\\|\\vec{u}_2\\|^2} \\vec{u}_2$$
          $$\\vec{p}_{12} \\approx ${c31} \\vec{u}_1 + ${c32} \\vec{u}_2 = ${formatVecLatex(res.p12, dim)}$$
          Rút phần dư trực giao $\\vec{u}_3$:
          $$\\vec{u}_3 = \\vec{v}_3 - \\vec{p}_{12} = ${formatVecLatex(v3, dim)} - ${formatVecLatex(res.p12, dim)} = ${formatVecLatex(u3, dim)}$$
          Kiểm tra tính trực giao với cả hai trục trước:
          $$\\langle \\vec{u}_1, \\vec{u}_3 \\rangle = ${dotProduct(u1, u3).toFixed(4)} \\approx 0, \\quad \\langle \\vec{u}_2, \\vec{u}_3 \\rangle = ${dotProduct(u2, u3).toFixed(4)} \\approx 0$$
          Độ dài của $\\vec{u}_3$:
          $$\\|\\vec{u}_3\\|^2 = ${res.nU3Sq.toFixed(2)}, \\quad \\|\\vec{u}_3\\| \\approx ${res.nU3.toFixed(4)}$$
        </p>
      `;
    }

    tab1Html += `
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); padding: 12px; border-radius: 2px; margin-top: 14px;">
          <strong style="color: #10b981;">Kết luận Cơ sở Trực giao:</strong><br>
          $$\\mathcal{B}_{ort} = \\left\\{ ${formatVecLatex(u1, dim)}, \\; ${formatVecLatex(u2, dim)} ${u3 ? `, \\; ${formatVecLatex(u3, dim)}` : ""} \\right\\}$$
        </div>
      </div>
    `;

    // TAB 2: Chuan hoa & Truc chuan hoa (Orthonormalization & QR)
    let tab2Html = `
      <div style="padding: 6px 0; font-size: 13.5px; line-height: 1.7; color: var(--fg);">
        <p style="margin-bottom: 12px;">
          Từ cơ sở trực giao $\\mathcal{B}_{ort} = \\{ \\vec{u}_1, \\vec{u}_2 ${u3 ? ", \\vec{u}_3" : ""} \\}$, chuẩn hóa từng vector về độ dài đơn vị $\\|\\vec{e}_i\\| = 1$:
          $$\\vec{e}_i = \\frac{\\vec{u}_i}{\\|\\vec{u}_i\\|}$$
        </p>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Chuẩn hóa từng vector:
        </h4>
        <p>
          $$\\vec{e}_1 = \\frac{1}{${res.nU1.toFixed(4)}} ${formatVecLatex(u1, dim)} = ${formatVecLatex(e1, dim)}$$
          $$\\vec{e}_2 = \\frac{1}{${res.nU2.toFixed(4)}} ${formatVecLatex(u2, dim)} = ${formatVecLatex(e2, dim)}$$
          ${u3 ? `$$\\vec{e}_3 = \\frac{1}{${res.nU3.toFixed(4)}} ${formatVecLatex(u3, dim)} = ${formatVecLatex(e3, dim)}$$` : ""}
        </p>

        <h4 style="color: var(--primary-base); font-size: 13px; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px;">
          Kiểm tra tính trực chuẩn:
        </h4>
        <p>
          Độ dài: $\\|\\vec{e}_1\\| = ${norm(e1).toFixed(4)}, \\quad \\|\\vec{e}_2\\| = ${norm(e2).toFixed(4)} ${e3 ? `, \\quad \\|\\vec{e}_3\\| = ${norm(e3).toFixed(4)}` : ""}$<br>
          Tích vô hướng: $\\langle \\vec{e}_1, \\vec{e}_2 \\rangle = ${dotProduct(e1, e2).toFixed(4)} \\approx 0$ ${e3 ? `, \\quad \\langle \\vec{e}_1, \\vec{e}_3 \\rangle = ${dotProduct(e1, e3).toFixed(4)}, \\quad \\langle \\vec{e}_2, \\vec{e}_3 \\rangle = ${dotProduct(e2, e3).toFixed(4)}` : ""}
        </p>

        <div style="background: rgba(2, 132, 199, 0.08); border: 1px solid rgba(2, 132, 199, 0.3); padding: 12px; border-radius: 2px; margin-top: 14px;">
          <strong style="color: #0284c7;">Cơ sở Trực chuẩn hoàn chỉnh:</strong><br>
          $$\\mathcal{B}_{norm} = \\left\\{ ${formatVecLatex(e1, dim)}, \\; ${formatVecLatex(e2, dim)} ${e3 ? `, \\; ${formatVecLatex(e3, dim)}` : ""} \\right\\}$$
        </div>
      </div>
    `;

    if (typeof App.openSolutionPanel === "function") {
      App.openSolutionPanel({
        title: "Thuật Toán Trực Giao Hóa Gram - Schmidt",
        math: "\\mathcal{B}_{ort} \\to \\mathcal{B}_{norm}",
        content1: tab1Html,
        content2: tab2Html,
        tab1Label: "Trực giao hóa",
        tab2Label: "Chuẩn hóa & Trực chuẩn",
        showSubTabs: false
      });
    } else if (typeof App.openCustomSolution === "function") {
      App.openCustomSolution("Thuật Toán Trực Giao Hóa Gram - Schmidt", tab1Html);
    } else {
      const solBody = document.getElementById("solutionBody");
      const solOverlay = document.getElementById("solutionOverlay");
      const solTitle = document.getElementById("solTitleText");
      if (solTitle) solTitle.textContent = "Thuật Toán Trực Giao Hóa Gram - Schmidt";
      if (solBody) solBody.innerHTML = tab1Html;
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

  // Module dinh nghia cho Chu de 4
  const Topic4Module = {
    _isInitialized: false,

    init: function () {
      if (this._isInitialized) return;
      const btnOrth = document.getElementById("btnGSOrthogonalize");
      const btnAnim = document.getElementById("btnGSAnimate");
      const btnSol = document.getElementById("btnGSSolution");
      if (!btnOrth && !btnAnim) return;
      this._isInitialized = true;

      // Nút Trực giao hóa
      if (btnOrth) {
        btnOrth.addEventListener("click", () => {
          if (typeof App.requireVectors === "function" && !App.requireVectors()) return;
          const items = getGSSelectedItems();
          if (!items || items.length < 2) {
            if (typeof App.showToast === "function") {
              App.showToast("Hãy chọn ít nhất 2 vector để trực giao hóa Gram - Schmidt!", "warning");
            }
            return;
          }
          this.execute();
        });
      }

      // Nút Trực quan hoạt cảnh 3 bước
      if (btnAnim) {
        btnAnim.addEventListener("click", () => {
          if (typeof App.requireVectors === "function" && !App.requireVectors()) return;
          const items = getGSSelectedItems();
          if (!items || items.length < 2) {
            if (typeof App.showToast === "function") {
              App.showToast("Hãy chọn ít nhất 2 vector để trực giao hóa Gram - Schmidt!", "warning");
            }
            return;
          }
          this.execute();
          if (App.GSAnimator && typeof App.GSAnimator.start === "function") {
            App.GSAnimator.start(items);
          }
        });
      }

      // Nút Lời giải KaTeX
      if (btnSol) {
        btnSol.addEventListener("click", () => {
          if (typeof App.requireVectors === "function" && !App.requireVectors()) return;
          const items = getGSSelectedItems();
          if (!items || items.length < 2) {
            if (typeof App.showToast === "function") {
              App.showToast("Hãy chọn ít nhất 2 vector để trực giao hóa Gram - Schmidt!", "warning");
            }
            return;
          }
          generateGramSchmidtSolution(items);
        });
      }

      // Checkbox các lớp hiển thị phụ
      const chkOrig = document.getElementById("chkGSShowOrig");
      if (chkOrig) {
        chkOrig.addEventListener("change", () => {
          if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
          else if (window.Vec3D && Vec3D.hardRefresh3D) Vec3D.hardRefresh3D(false);
        });
      }

      const chkProj = document.getElementById("chkGSShowProj");
      if (chkProj) {
        chkProj.addEventListener("change", () => {
          if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
          else if (window.Vec3D && Vec3D.hardRefresh3D) Vec3D.hardRefresh3D(false);
        });
      }

      const chkNorm = document.getElementById("chkGSNormalize");
      if (chkNorm) {
        chkNorm.addEventListener("change", () => {
          this.execute();
        });
      }
    },

    execute: function () {
      if (!this._isInitialized) this.init();

      const items = getGSSelectedItems();
      if (!items || items.length < 2) {
        const box = document.getElementById("result_gs_info");
        if (box) {
          box.style.display = "block";
          box.innerHTML = `
            <div style="padding: 10px; background: var(--bg-hover); border: 1px dashed var(--border); border-radius: 4px; font-size: 12px; color: var(--muted); text-align: center;">
              Chưa đủ vector để trực giao hóa. Hãy chọn ít nhất 2 vector trong danh sách ở trên!
            </div>
          `;
        }
        return;
      }

      const res = computeGSFromItems(items);
      renderGSInfoCard(res);

      if (App.mode === "2D" && window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
        Vec2D.draw2DAllVectors();
      } else if (window.Vec3D && typeof Vec3D.hardRefresh3D === "function") {
        Vec3D.hardRefresh3D(false);
      }
    },

    onTaskSelect: function (taskId) {
      if (taskId === "topic4_gram_schmidt" || taskId === "s21" || taskId === "topic4_orthogonality" || taskId === "s20") {
        if (typeof App.renderExtraCalcOptions === "function") {
          App.renderExtraCalcOptions();
        }
        this.init();
      } else {
        if (App.GSAnimator && typeof App.GSAnimator.stop === "function" && App.GSAnimator.isActive()) {
          App.GSAnimator.stop();
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

  App.Topic4Module = Topic4Module;
})();
