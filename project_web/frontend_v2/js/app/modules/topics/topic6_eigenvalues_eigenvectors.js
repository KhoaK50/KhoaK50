// =========================================================================
// topic6_eigenvalues_eigenvectors.js - Chủ đề 6: Trị riêng, Vector riêng & Chéo hóa
// Tích hợp đồng bộ với App.matrixList, App.EigenAnimator (4 bước động học) &
// Hệ thống Lời giải Học thuật 2 Tab (solution_panel.js)
// =========================================================================
(function () {
  window.App = window.App || {};

  let cachedEigenSolutionConfig = null;

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

  // Lấy ma trận vuông đang chọn trong App.matrixList (TUYỆT ĐỐI KHÔNG tự động tạo ma trận mặc định)
  function getOrEnsureSelectedSquareMatrix() {
    const matrices = Array.isArray(App.matrixList) ? App.matrixList : [];
    const sel = $("eigenMatrixSelect");

    let item = null;
    if (sel && sel.value) {
      item = matrices.find((m) => String(m.id) === String(sel.value));
    }
    if (!item && matrices.length > 0) {
      item = matrices.find((m) => m.rows === m.cols && (m.rows === 2 || m.rows === 3)) || matrices[0];
      if (sel && item) sel.value = String(item.id);
    }

    // Nếu người dùng chưa tạo ma trận nào trong tab ĐỐI TƯỢNG, thông báo và chuyển sang tab ĐỐI TƯỢNG (phần Ma trận)
    if (!item) {
      if (typeof App.showToast === "function") {
        App.showToast("Danh sách trống! Hãy tạo ma trận vuông ở tab Đối tượng trước.", "warning");
      }
      const firstTab = document.querySelector(".sidebar-tabs .tab-btn");
      if (firstTab) firstTab.click();
      const createSelect = document.getElementById("createObjectSelect");
      if (createSelect && createSelect.value !== "matrix") {
        createSelect.value = "matrix";
        createSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return null;
    }

    if (item.rows !== item.cols || (item.rows !== 2 && item.rows !== 3)) {
      if (typeof App.showToast === "function") {
        App.showToast(`Ma trận ${item.name} (${item.rows}×${item.cols}) không phải ma trận vuông cấp 2 hoặc cấp 3!`, "warning");
      }
      return null;
    }

    const matValues = typeof item.evalMatrix === "function" ? item.evalMatrix() : item.values;
    return { item, values: matValues };
  }

  // Hiển thị bảng xem trước ma trận đang chọn (ẩn hoàn toàn nếu chưa có ma trận nào trong danh sách)
  function renderSelectedMatrixPreview() {
    const previewEl = $("eigenMatrixPreview");
    if (!previewEl) return;

    const matrices = Array.isArray(App.matrixList) ? App.matrixList : [];
    const sel = $("eigenMatrixSelect");
    const item = sel && sel.value ? matrices.find((m) => String(m.id) === String(sel.value)) : matrices[0];

    if (!item) {
      previewEl.style.display = "none";
      previewEl.innerHTML = "";
      return;
    }

    previewEl.style.display = "block";
    const vals = typeof item.evalMatrix === "function" ? item.evalMatrix() : item.values;
    const isSquareValid = item.rows === item.cols && (item.rows === 2 || item.rows === 3);
    const cellsHtml = [];
    for (let i = 0; i < item.rows; i++) {
      for (let j = 0; j < item.cols; j++) {
        const v = vals?.[i]?.[j] ?? 0;
        cellsHtml.push(`
          <div style="background: var(--bg-card, var(--card)); border: 1px solid var(--border); border-radius: 2px; padding: 4px 6px; text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600; color: var(--fg);">
            ${fmtScalarPlain(Number(v))}
          </div>
        `);
      }
    }

    previewEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; font-size: 11px; color: var(--muted);">
        <span>Ma trận đang chọn: <b style="color: var(--fg);">${item.name} (${item.rows}×${item.cols})</b></span>
        <span style="color: ${isSquareValid ? "var(--text-muted, var(--muted))" : "#ef4444"}; font-weight: 600;">
          ${isSquareValid ? "Ma trận vuông hợp lệ" : "Cần ma trận 2×2 hoặc 3×3"}
        </span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(${item.cols}, 1fr); gap: 4px;">
        ${cellsHtml.join("")}
      </div>
    `;
  }

  // Làm mới dropdown chọn ma trận #eigenMatrixSelect từ App.matrixList
  App.refreshEigenMatrixDropdown = function () {
    const sel = $("eigenMatrixSelect");
    if (!sel) return;

    const matrices = Array.isArray(App.matrixList) ? App.matrixList : [];
    const prevVal = sel.value;
    sel.innerHTML = "";

    if (matrices.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "(Chưa có ma trận - Tạo ở tab Đối tượng)";
      sel.appendChild(opt);
      const resBox = $("result_eigen_info");
      if (resBox) {
        resBox.style.display = "none";
        resBox.innerHTML = "";
      }
    } else {
      matrices.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = String(m.id);
        const sqTag = m.rows === m.cols && (m.rows === 2 || m.rows === 3) ? "" : " [Không vuông]";
        opt.textContent = `${m.name} (${m.rows}×${m.cols})${sqTag}`;
        sel.appendChild(opt);
      });

      if (prevVal && matrices.some((m) => String(m.id) === String(prevVal))) {
        sel.value = prevVal;
      } else {
        const firstSquare = matrices.find((m) => m.rows === m.cols && (m.rows === 2 || m.rows === 3));
        sel.value = String((firstSquare || matrices[0]).id);
      }
    }

    renderSelectedMatrixPreview();
  };

  // Khởi tạo hộp điều khiển hoạt cảnh 4 bước #eigenAnimControls
  App.ensureEigenAnimControls = function () {
    const out = $("result_eigen_info");
    if (!out) return;
    if ($("eigenAnimControls")) return;

    const host = out.parentElement;
    if (!host) return;

    const wrap = document.createElement("div");
    wrap.id = "eigenAnimControls";
    wrap.className = "basis-sidebar-anim-box";
    wrap.style.display = "none";
    wrap.style.marginTop = "10px";

    wrap.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted, #64748b);">Trực quan hóa Trị riêng &amp; Chéo hóa</span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="basis-step-pill" id="eigenStepCounter">Bước 1 / 3</span>
          <button type="button" id="btnEigenCloseAnim" class="basis-anim-close-btn" title="Đóng trực quan" style="background: transparent; border: none; cursor: pointer; color: var(--text-muted, #64748b); font-size: 13px; padding: 2px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px;">
            <i class="ph ph-x"></i>
          </button>
        </div>
      </div>

      <div class="coord-phase-pills" id="eigenPhasePills">
        <button type="button" class="coord-phase-btn active" data-phase="0" title="Bước 1: Ma trận A biến đổi cơ sở chuẩn e₁, e₂ làm lệch phương">Bước 1</button>
        <button type="button" class="coord-phase-btn" data-phase="1" title="Bước 2: Lộ diện Trục bất biến (Vector riêng v) & Độ co giãn (Trị riêng λ)">Bước 2</button>
        <button type="button" class="coord-phase-btn" data-phase="2" title="Bước 3: Kẻ lưới theo Cơ sở Vector riêng - Bản chất Chéo hóa D">Bước 3</button>
      </div>

      <div class="basis-anim-btn-row">
        <button type="button" id="btnEigenPrev" class="basis-ctrl-btn" title="Bước trước">
          <i class="ph ph-skip-back"></i>
        </button>
        <button type="button" id="btnEigenPlay" class="basis-ctrl-btn primary" title="Phát / Tạm dừng">
          <i class="ph ph-pause" id="iconEigenPlay"></i>
        </button>
        <button type="button" id="btnEigenNext" class="basis-ctrl-btn" title="Bước tiếp">
          <i class="ph ph-skip-forward"></i>
        </button>
        <button type="button" id="btnEigenReplay" class="basis-ctrl-btn" title="Phát lại từ đầu">
          <i class="ph ph-arrow-counter-clockwise"></i>
        </button>
      </div>

      <div class="hud-menu-slider-row basis-speed-slider-wrap" style="padding: 6px 0 2px; margin-top: 6px; border-top: 1px dashed var(--border-subtle, var(--border, #e2e8f0));">
        <div class="hud-menu-slider-header" style="font-size: 11.5px; margin-bottom: 2px;">
          <span class="hud-menu-item-text" style="color: var(--text-muted, #64748b); font-weight: 600;">Tốc độ phát</span>
          <span class="hud-menu-slider-val" id="eigenSpeedValue">1.0×</span>
        </div>
        <input type="range" id="eigenSpeedSlider" min="0.2" max="2.5" step="0.1" value="1.0" class="hud-range-slider" />
      </div>

      <div class="basis-step-explainer" id="eigenStepExplainer">
        <div class="basis-step-title" id="eigenStepTitle">Khảo sát trị riêng &amp; vector riêng</div>
        <div class="basis-step-desc" id="eigenStepDesc">Bấm nút Trực quan để khởi chạy hoạt cảnh 3 bước.</div>
      </div>
    `;

    if (out.nextSibling) {
      host.insertBefore(wrap, out.nextSibling);
    } else {
      host.appendChild(wrap);
    }

    const speedSlider = wrap.querySelector("#eigenSpeedSlider");
    const syncSliderPct = (val) => {
      if (!speedSlider) return;
      const min = parseFloat(speedSlider.min) || 0.2;
      const max = parseFloat(speedSlider.max) || 2.5;
      const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
      speedSlider.style.setProperty("--slider-pct", `${pct.toFixed(1)}%`);
      speedSlider.style.setProperty("--range-pct", `${pct.toFixed(1)}%`);
    };

    if (speedSlider) {
      speedSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value) || 1.0;
        syncSliderPct(val);
        const valLabel = wrap.querySelector("#eigenSpeedValue");
        if (valLabel) valLabel.textContent = `${val.toFixed(1)}×`;
      });
      syncSliderPct(1.0);
    }

    const phaseBtns = wrap.querySelectorAll(".coord-phase-btn");
    phaseBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const ph = parseInt(btn.dataset.phase, 10);
        if (window.App && App.EigenAnimator && typeof App.EigenAnimator.goToPhase === "function") {
          App.EigenAnimator.goToPhase(ph);
        }
      });
    });

    const btnClose = wrap.querySelector("#btnEigenCloseAnim");
    if (btnClose) {
      btnClose.addEventListener("click", () => {
        App.stopEigenAnimation();
      });
    }

    if (window.App && App.EigenAnimator && typeof App.EigenAnimator.bindSidebarControls === "function") {
      App.EigenAnimator.bindSidebarControls();
    }
  };

  App.stopEigenAnimation = function () {
    if (window.App && App.EigenAnimator && typeof App.EigenAnimator.stop === "function") {
      App.EigenAnimator.stop();
    }
    const wrap = $("eigenAnimControls");
    if (wrap) wrap.style.display = "none";
  };

  // Hiển thị bảng kết quả đồng bộ với #result_basis (dùng math-field read-only, không trộn màu chữ)
  function renderEigenInfoCard(matItem, sys) {
    const box = $("result_eigen_info");
    if (!box || !sys) return;

    box.style.display = "block";
    const mfStyle =
      "background: var(--bg-paper, var(--card, #fff)); border: 1px solid var(--border-subtle, var(--border, #ccc)); border-radius: 4px; padding: 6px 12px; font-size: 1.1em; color: var(--text-main, var(--fg, #333)); pointer-events: none; width: 100%; box-sizing: border-box;";

    let eigenPairsHtml = "";
    let diagBlockHtml = "";

    if (sys.isComplex && sys.eigenPairs.length === 0) {
      const re = fmtScalarPlain(sys.complexPair.re);
      const im = fmtScalarPlain(sys.complexPair.im);
      const complexLatex = `\\lambda_{1,2} = ${re} \\pm ${im}i \\quad (\\text{Nghiệm phức, không có vector riêng thực})`;
      eigenPairsHtml = `<math-field read-only style="${mfStyle}">${complexLatex}</math-field>`;
      const invLatex = `\\text{tr}(A) = ${fmtScalarLatex(sys.trace)}, \\quad \\det(A) = ${fmtScalarLatex(sys.det)}, \\quad \\Delta = ${fmtScalarLatex(sys.delta)} < 0`;
      diagBlockHtml = `
        <div style="border-top: 1px dashed var(--border-subtle, var(--border)); padding-top: 10px;">
          <div style="font-size: 0.78em; font-weight: 700; color: var(--text-muted, var(--muted)); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">BẤT BIẾN ĐẶC TRƯNG CỦA MA TRẬN:</div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            <math-field read-only style="${mfStyle}">${invLatex}</math-field>
          </div>
        </div>
      `;
    } else {
      eigenPairsHtml = sys.eigenPairs
        .map((ep, idx) => {
          const lamStr = fmtScalarLatex(ep.lambda);
          const vecStr = ep.vec.map(fmtScalarLatex).join(", ");
          const pairLatex = `\\lambda_{${idx + 1}} = ${lamStr} \\implies v_{${idx + 1}} = (${vecStr})^T`;
          return `<math-field read-only style="${mfStyle}">${pairLatex}</math-field>`;
        })
        .join("");

      if (sys.isDiagonalizable) {
        const diagVals = sys.eigenPairs.map((ep) => fmtScalarLatex(ep.lambda)).join(", ");
        const diagLatex = `D = P^{-1}AP = \\text{diag}(${diagVals})`;
        diagBlockHtml = `
          <div style="border-top: 1px dashed var(--border-subtle, var(--border)); padding-top: 10px;">
            <div style="font-size: 0.78em; font-weight: 700; color: var(--text-muted, var(--muted)); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">MA TRẬN ĐƯỜNG CHÉO CHÉO HÓA:</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              <math-field read-only style="${mfStyle}">${diagLatex}</math-field>
            </div>
          </div>
        `;
      } else {
        const invLatex = `\\text{tr}(A) = ${fmtScalarLatex(sys.trace)}, \\quad \\det(A) = ${fmtScalarLatex(sys.det)} \\quad (\\text{Khuyết vector riêng ĐLTT})`;
        diagBlockHtml = `
          <div style="border-top: 1px dashed var(--border-subtle, var(--border)); padding-top: 10px;">
            <div style="font-size: 0.78em; font-weight: 700; color: var(--text-muted, var(--muted)); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">TRẠNG THÁI CHÉO HÓA:</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              <math-field read-only style="${mfStyle}">${invLatex}</math-field>
            </div>
          </div>
        `;
      }
    }

    const statusLabel = sys.isDiagonalizable ? "Chéo hóa được" : "Không chéo hóa được";

    box.innerHTML = `
      <div style="margin-top: 8px; padding-top: 10px; border-top: 1px solid var(--border-subtle, var(--border));">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; background: var(--bg-hover, rgba(0,0,0,0.03)); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-subtle, var(--border));">
          <span style="font-size: 0.78em; color: var(--text-muted, var(--muted)); font-weight: 700;">SỐ VECTOR RIÊNG ĐLTT: <strong style="color: var(--primary-base, var(--fg)); font-size: 1.15em;">${sys.eigenPairs.length} / ${sys.dim}</strong></span>
          <span style="font-size: 0.8em; font-weight: 600; color: var(--text-main, var(--fg));">${statusLabel}</span>
        </div>
        <div style="font-size: 0.78em; font-weight: 700; color: var(--text-muted, var(--muted)); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">CÁC CẶP TRỊ RIÊNG - VECTOR RIÊNG:</div>
        <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px;">
          ${eigenPairsHtml}
        </div>
        ${diagBlockHtml}
        <div style="margin-top: 10px; font-size: 0.78em; color: var(--text-muted, var(--muted)); font-style: italic; text-align: center;">Nhấn "Lời giải" ở trên để xem chi tiết từng bước biến đổi!</div>
      </div>
    `;
  }

  // Sinh phương trình đường thẳng bất biến tường minh cho hệ 2x2: (a - lambda)x + by = 0
  function format2DLineEquationLatex(aMinusLam, b, c, dMinusLam) {
    const eps = 1e-7;
    let A = aMinusLam;
    let B = b;
    if (Math.abs(A) <= eps && Math.abs(B) <= eps) {
      A = c;
      B = dMinusLam;
    }
    if (Math.abs(A) <= eps && Math.abs(B) <= eps) {
      return "0x + 0y = 0 \\; (\\text{Mọi đường thẳng qua } O)";
    }
    const aStr = fmtScalarLatex(A);
    const bAbsStr = fmtScalarLatex(Math.abs(B));
    const signB = B >= 0 ? "+" : "-";
    return `(${aStr})x ${signB} (${bAbsStr})y = 0`;
  }

  // Sinh lời giải học thuật 2 Tab chuẩn đại học cho solution_panel.js
  function buildEigenAcademicSolutionConfig(matItem, sys) {
    const M = sys.matrix;
    const matName = matItem?.name || "A";
    const matLatex = matrixToBmatrixLatex(M);

    // TAB 1: ĐA THỨC ĐẶC TRƯNG & KHÔNG GIAN RIÊNG
    let tab1Html = "";
    if (sys.dim === 2) {
      const a = M[0][0], b = M[0][1], c = M[1][0], d = M[1][1];
      const tr = sys.trace;
      const det = sys.det;
      const delta = sys.delta;

      let step2And3 = "";
      if (sys.isComplex) {
        const re = fmtScalarLatex(sys.complexPair.re);
        const im = fmtScalarLatex(sys.complexPair.im);
        step2And3 = `
          <div class="sol-step">
            <div class="sol-step-header">Pha 2: Khai triển định thức và giải phương trình đặc trưng</div>
            <div class="sol-step-body">
              <p>Khai triển định thức cấp 2 theo quy tắc đường chéo chính trừ đường chéo phụ:</p>
              $$P(\\lambda) = (${fmtScalarLatex(a)} - \\lambda)(${fmtScalarLatex(d)} - \\lambda) - (${fmtScalarLatex(b)})(${fmtScalarLatex(c)}) = \\lambda^2 - (${fmtScalarLatex(tr)})\\lambda + (${fmtScalarLatex(det)}) = 0$$
              <p>Xét biệt thức của phương trình bậc hai:</p>
              $$\\Delta = (\\text{tr}(A))^2 - 4\\det(A) = (${fmtScalarLatex(tr)})^2 - 4(${fmtScalarLatex(det)}) = ${fmtScalarLatex(delta)} < 0$$
              <p>Do $\\Delta < 0$, phương trình đặc trưng vô nghiệm trên trường số thực $\\mathbb{R}$ và có hai nghiệm phức liên hợp trên $\\mathbb{C}$:</p>
              $$\\lambda_{1,2} = ${re} \\pm ${im}i$$
            </div>
          </div>
          <div class="sol-step">
            <div class="sol-step-header">Pha 3 & Pha 4: Kết luận về đường bất biến thực</div>
            <div class="sol-step-body">
              <p>Vì phương trình đặc trưng không có nghiệm thực, không tồn tại vector khác không $v \\in \\mathbb{R}^2$ nào giữ nguyên phương sau phép biến đổi $A$. Về mặt hình học, ma trận $A$ chứa thành phần xoay làm mọi đường thẳng qua gốc tọa độ $O$ đều bị xoay lệch đi, nên không có đường thẳng bất biến nét đứt nào trên mặt phẳng thực.</p>
            </div>
          </div>
        `;
      } else {
        const rootsLatex = sys.distinctEigenvalues
          .map((it, idx) => `\\lambda_{${idx + 1}} = ${fmtScalarLatex(it.lambda)} \\text{ (bội đại số } m_a = ${it.algMult}\\text{)}`)
          .join(", \\quad ");

        const eigenspaceBlocks = sys.distinctEigenvalues.map((it, idx) => {
          const lam = it.lambda;
          const m00Val = a - lam;
          const m01Val = b;
          const m10Val = c;
          const m11Val = d - lam;
          const m00 = fmtScalarLatex(m00Val);
          const m01 = fmtScalarLatex(m01Val);
          const m10 = fmtScalarLatex(m10Val);
          const m11 = fmtScalarLatex(m11Val);
          const lineEqLatex = format2DLineEquationLatex(m00Val, m01Val, m10Val, m11Val);
          const basisVecsLatex = (it.basis || []).map(vecToColLatex).join(", \\; ");
          const firstVec = (it.basis && it.basis[0]) ? it.basis[0] : [1, 0];
          return `
            <div style="margin-bottom: 12px; padding: 10px 12px; background: var(--bg-hover); border-left: 3px solid var(--primary-base); border-radius: 2px;">
              <p style="margin: 0 0 6px 0;"><strong>Trường hợp ${idx + 1}: Thay trị riêng $\\lambda_{${idx + 1}} = ${fmtScalarLatex(lam)}$ vào hệ $(A - \\lambda I)v = \\vec{0}$:</strong></p>
              <p style="margin: 0 0 6px 0;">Lấy các phần tử trên đường chéo chính của $A$ trừ đi $\\lambda_{${idx + 1}} = ${fmtScalarLatex(lam)}$, ta được hệ phương trình tuyến tính thuần nhất tìm tọa độ $v = (x, y)^T$:</p>
              $$\\begin{bmatrix} ${fmtScalarLatex(a)} - (${fmtScalarLatex(lam)}) & ${m01} \\\\ ${m10} & ${fmtScalarLatex(d)} - (${fmtScalarLatex(lam)}) \\end{bmatrix} \\begin{bmatrix} x \\\\ y \\end{bmatrix} = \\begin{bmatrix} 0 \\\\ 0 \\end{bmatrix} \\iff \\begin{bmatrix} ${m00} & ${m01} \\\\ ${m10} & ${m11} \\end{bmatrix} \\begin{bmatrix} x \\\\ y \\end{bmatrix} = \\begin{bmatrix} 0 \\\\ 0 \\end{bmatrix}$$
              <p style="margin: 6px 0;"><strong>Nguồn gốc đường thẳng bất biến nét đứt $E_{\\lambda_{${idx + 1}}}$:</strong> Vì $\\det(A - \\lambda_{${idx + 1}}I) = 0$, hai dòng của ma trận trên tỷ lệ với nhau và rút gọn về phương trình đường thẳng đi qua gốc tọa độ $O(0,0)$:</p>
              $$E_{\\lambda_{${idx + 1}}}: \\quad ${lineEqLatex}$$
              <p style="margin: 6px 0 0 0;">Đường thẳng này chính là <strong>đường thẳng bất biến nét đứt</strong> hiển thị ở Bước 2 trên đồ thị. Chọn một điểm khác gốc $O$ nằm trên đường thẳng này (chẳng hạn $x = ${fmtScalarLatex(firstVec[0])} \\implies y = ${fmtScalarLatex(firstVec[1])}$), ta thu được vector riêng cơ sở:</p>
              $$B_{E_{${fmtScalarLatex(lam)}}} = \\left\\{ ${basisVecsLatex} \\right\\} \\quad (\\text{số chiều } m_g = ${it.geoMult})$$
            </div>
          `;
        }).join("");

        const verifyLines = sys.eigenPairs.map((ep, i) => {
          const vx = ep.vec[0], vy = ep.vec[1];
          const avx = a * vx + b * vy;
          const avy = c * vx + d * vy;
          return `$$A v_{${i + 1}} = ${matLatex} \\begin{bmatrix} ${fmtScalarLatex(vx)} \\\\ ${fmtScalarLatex(vy)} \\end{bmatrix} = \\begin{bmatrix} ${fmtScalarLatex(avx)} \\\\ ${fmtScalarLatex(avy)} \\end{bmatrix} = ${fmtScalarLatex(ep.lambda)} \\begin{bmatrix} ${fmtScalarLatex(vx)} \\\\ ${fmtScalarLatex(vy)} \\end{bmatrix} = \\lambda_{${i + 1}} v_{${i + 1}}$$`;
        }).join("");

        step2And3 = `
          <div class="sol-step">
            <div class="sol-step-header">Pha 2: Khai triển định thức $\\det(A - \\lambda I) = 0$ tìm trị riêng $\\lambda$</div>
            <div class="sol-step-body">
              <p>Trừ $\\lambda$ vào đường chéo chính của ma trận $A$ và tính định thức cấp 2 (tích đường chéo chính trừ tích đường chéo phụ):</p>
              $$P(\\lambda) = \\det(A - \\lambda I_2) = \\begin{vmatrix} ${fmtScalarLatex(a)} - \\lambda & ${fmtScalarLatex(b)} \\\\ ${fmtScalarLatex(c)} & ${fmtScalarLatex(d)} - \\lambda \\end{vmatrix} = (${fmtScalarLatex(a)} - \\lambda)(${fmtScalarLatex(d)} - \\lambda) - (${fmtScalarLatex(b)})(${fmtScalarLatex(c)}) = 0$$
              <p>Khai triển thành phương trình bậc hai theo $\\lambda$ (với vết $\\text{tr}(A) = ${fmtScalarLatex(a)} + (${fmtScalarLatex(d)}) = ${fmtScalarLatex(tr)}$ và định thức $\\det(A) = ${fmtScalarLatex(det)}$):</p>
              $$\\lambda^2 - (${fmtScalarLatex(tr)})\\lambda + (${fmtScalarLatex(det)}) = 0$$
              <p>Tính biệt thức $\\Delta = (${fmtScalarLatex(tr)})^2 - 4(${fmtScalarLatex(det)}) = ${fmtScalarLatex(delta)} \\ge 0$, ta giải được các trị riêng thực:</p>
              $$${rootsLatex}$$
            </div>
          </div>
          <div class="sol-step">
            <div class="sol-step-header">Pha 3: Từ đâu sinh ra các đường thẳng bất biến nét đứt và vector riêng $v_i$?</div>
            <div class="sol-step-body">
              ${eigenspaceBlocks}
            </div>
          </div>
          <div class="sol-step">
            <div class="sol-step-header">Pha 4: Kiểm chứng trực tiếp $Av_i = \\lambda_i v_i$ và kết luận</div>
            <div class="sol-step-body">
              <p>Nhân trực tiếp ma trận $A$ với từng vector riêng tìm được để kiểm chứng chúng nằm đúng trên đường bất biến và chỉ co giãn $\\lambda_i$ lần:</p>
              ${verifyLines}
              <p>Vậy hệ có <strong>${sys.eigenPairs.length}</strong> vector riêng độc lập tuyến tính: ${sys.eigenPairs.map((ep, i) => `$v_{${i + 1}} = (${ep.vec.map(fmtScalarLatex).join(", ")})^T$ ứng với $\\lambda_{${i + 1}} = ${fmtScalarLatex(ep.lambda)}$`).join("; ")}.</p>
            </div>
          </div>
        `;
      }

      tab1Html = `
        <div class="sol-container">
          <div class="sol-step">
            <div class="sol-step-header">Pha 1: Tại sao lại lập biểu thức $(A - \\lambda I)v = \\vec{0}$ và tính $\\det(A - \\lambda I) = 0$?</div>
            <div class="sol-step-body">
              <p>Xét ma trận vuông cấp 2: $$${matName} = ${matLatex}$$</p>
              <p><strong>1. Từ bài toán hình học sang phương trình đại số:</strong> Khi nhân ma trận $A$ vào một vector bất kỳ, hầu hết các vector đều bị bẻ lệch hướng (như $\\vec{e}_1, \\vec{e}_2$ ở Bước 1). Ta muốn tìm những vector đặc biệt $v \\neq \\vec{0}$ <strong>không bị đổi phương</strong> sau phép biến đổi, tức là ảnh $Av$ chỉ là một bội số vô hướng $\\lambda$ của chính $v$:</p>
              $$A v = \\lambda v \\quad (v \\neq \\vec{0})$$
              <p><strong>2. Tại sao phải nhân thêm ma trận đơn vị $I$ vào $\\lambda$?</strong> Chuyển vế sang trái ta có $Av - \\lambda v = \\vec{0}$. Tuy nhiên, $A$ là một <em>ma trận</em> $2 \\times 2$ còn $\\lambda$ là một <em>con số vô hướng</em>, trong đại số tuyến tính không thể lấy ma trận trừ trực tiếp một con số ($A - \\lambda$ là vô nghĩa). Vì ma trận đơn vị $I = \\begin{bmatrix} 1 & 0 \\\\ 0 & 1 \\end{bmatrix}$ không làm thay đổi vector khi nhân ($Iv = v$), ta thay $\\lambda v = \\lambda I v$ rồi đặt nhân tử chung $v$ ra ngoài:</p>
              $$Av - \\lambda I v = \\vec{0} \\iff (A - \\lambda I)v = \\vec{0}$$
              <p><strong>3. Tại sao lại phải tính định thức $\\det(A - \\lambda I) = 0$?</strong> Hệ phương trình thuần nhất $(A - \\lambda I)v = \\vec{0}$ luôn có nghiệm tầm thường $v = \\vec{0}$. Nhưng vector riêng bắt buộc phải <strong>khác không ($v \\neq \\vec{0}$)</strong> để xác định được phương của đường thẳng. Hệ thuần nhất có nghiệm $v \\neq \\vec{0}$ khi và chỉ khi ma trận hệ số $(A - \\lambda I)$ không khả nghịch (làm sụp đổ diện tích về $0$), nghĩa là định thức của nó phải bằng $0$:</p>
              $$\\det(A - \\lambda I) = 0$$
            </div>
          </div>
          ${step2And3}
        </div>
      `;
    } else {
      // 3x3
      const tr = sys.trace;
      const c1 = sys.c1;
      const det = sys.det;
      const rootsLatex = sys.distinctEigenvalues
        .map((it, idx) => `\\lambda_{${idx + 1}} = ${fmtScalarLatex(it.lambda)} \\text{ (bội đại số } m_a = ${it.algMult}\\text{)}`)
        .join(", \\quad ");

      const eigenspaceBlocks = sys.distinctEigenvalues.map((it, idx) => {
        const lam = it.lambda;
        const shifted = M.map((row, rIdx) => row.map((val, cIdx) => (rIdx === cIdx ? val - lam : val)));
        const basisVecsLatex = (it.basis || []).map(vecToColLatex).join(", \\; ");
        return `
          <div style="margin-bottom: 12px; padding: 10px 12px; background: var(--bg-hover); border-left: 3px solid var(--primary-base); border-radius: 2px;">
            <p style="margin: 0 0 6px 0;"><strong>Trường hợp ${idx + 1}: Thay trị riêng $\\lambda = ${fmtScalarLatex(lam)}$ vào hệ $(A - \\lambda I_3)v = \\vec{0}$:</strong></p>
            <p style="margin: 0 0 6px 0;">Trừ $\\lambda = ${fmtScalarLatex(lam)}$ vào đường chéo chính của $A$, ta được ma trận hệ số của hệ phương trình thuần nhất:</p>
            $$A - (${fmtScalarLatex(lam)})I_3 = ${matrixToBmatrixLatex(shifted)}$$
            <p style="margin: 6px 0 0 0;">Khử Gauss hệ phương trình $(A - (${fmtScalarLatex(lam)})I_3)v = \\vec{0}$ và chọn giá trị cho ẩn tự do, ta thu được cơ sở của không gian riêng bất biến $E_{${fmtScalarLatex(lam)}}$ (số chiều $m_g = ${it.geoMult}$):</p>
            $$B_{E_{${fmtScalarLatex(lam)}}} = \\left\\{ ${basisVecsLatex} \\right\\}$$
          </div>
        `;
      }).join("");

      tab1Html = `
        <div class="sol-container">
          <div class="sol-step">
            <div class="sol-step-header">Pha 1: Tại sao lại lập biểu thức $(A - \\lambda I_3)v = \\vec{0}$ và tính $\\det(A - \\lambda I_3) = 0$?</div>
            <div class="sol-step-body">
              <p>Xét ma trận vuông cấp 3: $$${matName} = ${matLatex}$$</p>
              <p>Từ điều kiện hình học vector riêng giữ nguyên phương $Av = \\lambda v \\; (v \\neq \\vec{0})$, ta nhân ma trận đơn vị $I_3$ vào hằng số $\\lambda$ để có thể đặt nhân tử chung: $Av - \\lambda I_3 v = \\vec{0} \\iff (A - \\lambda I_3)v = \\vec{0}$.</p>
              <p>Để hệ phương trình thuần nhất này có nghiệm khác không ($v \\neq \\vec{0}$), ma trận hệ số $(A - \\lambda I_3)$ phải suy biến, tức là định thức của nó phải bằng $0$:</p>
              $$P(\\lambda) = \\det(A - \\lambda I_3) = -\\left(\\lambda^3 - (${fmtScalarLatex(tr)})\\lambda^2 + (${fmtScalarLatex(c1)})\\lambda - (${fmtScalarLatex(det)})\\right) = 0$$
            </div>
          </div>
          <div class="sol-step">
            <div class="sol-step-header">Pha 2: Giải phương trình đặc trưng tìm trị riêng $\\lambda$</div>
            <div class="sol-step-body">
              <p>Giải phương trình bậc ba $\\lambda^3 - (${fmtScalarLatex(tr)})\\lambda^2 + (${fmtScalarLatex(c1)})\\lambda - (${fmtScalarLatex(det)}) = 0$, ta thu được các trị riêng thực:</p>
              $$${rootsLatex || "\\text{Không có nghiệm thực}"}$$
            </div>
          </div>
          <div class="sol-step">
            <div class="sol-step-header">Pha 3 & Pha 4: Giải hệ $(A - \\lambda_i I_3)v = \\vec{0}$ tìm trục bất biến và vector riêng</div>
            <div class="sol-step-body">
              ${eigenspaceBlocks}
            </div>
          </div>
        </div>
      `;
    }

    // TAB 2: CHÉO HÓA MA TRẬN (A = P D P^-1)
    let tab2Html = "";
    if (sys.isDiagonalizable && sys.P && sys.D) {
      const pLatex = matrixToBmatrixLatex(sys.P);
      const dLatex = matrixToBmatrixLatex(sys.D);
      const pInvBlock = sys.PInv
        ? `<p>Ma trận chuyển cơ sở nghịch đảo $P^{-1}$:</p>$$P^{-1} = ${matrixToBmatrixLatex(sys.PInv)}$$`
        : "";
      const vecNames = sys.eigenPairs.map((_, i) => `v_{${i + 1}}`).join(", ");

      tab2Html = `
        <div class="sol-container">
          <div class="sol-step">
            <div class="sol-step-header">Pha 1: Kiểm tra điều kiện cần và đủ để chéo hóa</div>
            <div class="sol-step-body">
              <p>Ma trận vuông cấp $n = ${sys.dim}$ chéo hóa được trên $\\mathbb{R}$ khi và chỉ khi tổng số chiều của các không gian riêng bằng $n$ (mọi trị riêng đều thực và có bội hình học bằng bội đại số).</p>
              <p>Ở đây $\\sum \\dim(E_{\\lambda_i}) = ${sys.eigenPairs.length} = ${sys.dim}$, nên hệ vector riêng $B = \\{${vecNames}\\}$ lập thành một cơ sở của $\\mathbb{R}^${sys.dim}$. Do đó ma trận <strong>chéo hóa được</strong>.</p>
            </div>
          </div>
          <div class="sol-step">
            <div class="sol-step-header">Pha 2: Lập ma trận làm chéo $P$ và ma trận đường chéo $D$</div>
            <div class="sol-step-body">
              <p>Vì $Av_i = \\lambda_i v_i$, khi ghép các vector riêng $v_i$ làm các cột của ma trận $P = \\begin{bmatrix} ${vecNames} \\end{bmatrix}$, ta có $AP = PD$. Nhân $P^{-1}$ vào bên trái hai vế ta thu được:</p>
              $$P = ${pLatex}, \\quad D = P^{-1}AP = ${dLatex}$$
              ${pInvBlock}
            </div>
          </div>
          <div class="sol-step">
            <div class="sol-step-header">Pha 3 & Pha 4: Hệ thức chéo hóa và Ý nghĩa của Bước 3 trên đồ thị</div>
            <div class="sol-step-body">
              <p>Ta có phân tích chéo hóa:</p>
              $$P^{-1} A P = D \\iff A = P D P^{-1}$$
              <p><strong>Ý nghĩa hình học (liên kết 3 bước trực quan):</strong></p>
              <ul style="margin: 4px 0 0 18px; padding: 0;">
                <li>Ở <strong>Bước 1</strong>, hệ lưới chuẩn $\\{\\vec{e}_1, \\vec{e}_2\\}$ bị ma trận $A$ bẻ nghiêng vì $\\vec{e}_1, \\vec{e}_2$ không nằm trên đường bất biến.</li>
                <li>Ở <strong>Bước 2</strong>, giải hệ $(A - \\lambda_i I)v = \\vec{0}$ cho ta các đường thẳng bất biến nét đứt đi qua $O$, trên đó $v_i$ chỉ trượt thành $\\lambda_i v_i$.</li>
                <li>Ở <strong>Bước 3</strong>, khi đổi sang hệ lưới mới kẻ song song với cơ sở Vector riêng $B = \\{${vecNames}\\}$ (tức nhân với $P^{-1}$), phép biến đổi $A$ trở thành ma trận đường chéo $D$: các ô lưới riêng chỉ co giãn thuần túy $\\lambda_i$ lần dọc theo các đường bất biến mà không còn bị bẻ lệch góc.</li>
              </ul>
            </div>
          </div>
        </div>
      `;
    } else {
      tab2Html = `
        <div class="sol-container">
          <div class="sol-step">
            <div class="sol-step-header">Pha 1: Kiểm tra điều kiện chéo hóa trên trường số thực $\\mathbb{R}$</div>
            <div class="sol-step-body">
              <p>Để ma trận vuông cấp $n = ${sys.dim}$ chéo hóa được trên $\\mathbb{R}$, ma trận phải có đủ ${sys.dim} vector riêng thực độc lập tuyến tính tạo thành một cơ sở của $\\mathbb{R}^${sys.dim}$.</p>
              <p><strong>Kết quả kiểm tra:</strong> ${sys.reasonNotDiag}</p>
            </div>
          </div>
          <div class="sol-step">
            <div class="sol-step-header">Pha 2: Kết luận</div>
            <div class="sol-step-body">
              <p>Vì số lượng vector riêng độc lập tuyến tính (${sys.eigenPairs.length}) nhỏ hơn số chiều không gian (${sys.dim}), không tồn tại ma trận khả nghịch $P \\in M_${sys.dim}(\\mathbb{R})$ sao cho $P^{-1}AP$ là ma trận đường chéo. Ma trận <strong>không chéo hóa được</strong> trên $\\mathbb{R}$.</p>
            </div>
          </div>
        </div>
      `;
    }

    return {
      title: "Trị riêng, Vector riêng & Chéo hóa Ma trận",
      math: `\\( \\mathbb{R}^{${sys.dim} \\times ${sys.dim}} \\)`,
      tab1Label: "Tab 1: Giải tìm Trị riêng & Đường bất biến",
      tab2Label: "Tab 2: Chéo hóa A = P D P⁻¹",
      showSubTabs: false,
      content1: tab1Html,
      content2: tab2Html,
      autoOpen: false
    };
  }

  function computeAndPrepareEigen() {
    const selData = getOrEnsureSelectedSquareMatrix();
    if (!selData) return null;

    const { item, values } = selData;
    const sys = typeof App.solveEigenSystem === "function" ? App.solveEigenSystem(values) : null;
    if (!sys) return null;

    renderEigenInfoCard(item, sys);
    cachedEigenSolutionConfig = buildEigenAcademicSolutionConfig(item, sys);

    if (typeof App.openSolutionPanel === "function") {
      App.openSolutionPanel({ ...cachedEigenSolutionConfig, autoOpen: false });
    }

    if (window.App.PaperLogger) {
      const ltx = sys.isComplex
        ? `\\Delta < 0 \\text{ (Trị riêng phức)}`
        : sys.distinctEigenvalues.map((d, idx) => `\\lambda_{${idx + 1}} = ${fmtScalarLatex(d.lambda)}`).join(", \\; ");
      App.PaperLogger.log("Trị riêng, Vector riêng & Chéo hóa", ltx, "", cachedEigenSolutionConfig, {
        type: "eigen",
        matrixId: item.id
      });
    }

    return { item, values, sys };
  }

  const Topic6Module = {
    _isInitialized: false,

    init: function () {
      App.ensureEigenAnimControls();
      App.refreshEigenMatrixDropdown();
      if (this._isInitialized) return;

      const btnCompute = $("btnEigenCompute");
      const btnAnimate = $("btnEigenAnimate");
      const btnSol = $("btnEigenSolution");
      if (!btnCompute && !btnAnimate && !btnSol) return;
      this._isInitialized = true;

      const sel = $("eigenMatrixSelect");
      if (sel && !sel._eigenBound) {
        sel._eigenBound = true;
        sel.addEventListener("change", () => {
          if (typeof App.stopEigenAnimation === "function" && window.App?.EigenAnimator?.isActive?.()) {
            App.stopEigenAnimation();
          }
          renderSelectedMatrixPreview();
        });
      }

      // 1. Nút "Tính trị riêng"
      if (btnCompute) {
        btnCompute.addEventListener("click", () => {
          if (typeof App.stopEigenAnimation === "function" && window.App?.EigenAnimator?.isActive?.()) {
            App.stopEigenAnimation();
          }
          computeAndPrepareEigen();
        });
      }

      // 2. Nút "Trực quan" (Bật/Tắt hoạt cảnh 4 bước App.EigenAnimator)
      if (btnAnimate) {
        btnAnimate.addEventListener("click", () => {
          App.ensureEigenAnimControls();
          const wrap = $("eigenAnimControls");
          const isBoxOpen = wrap && wrap.style.display !== "none" && wrap.style.display !== "";
          if (isBoxOpen || window.App?.EigenAnimator?.isActive?.()) {
            App.stopEigenAnimation();
            return;
          }

          const res = computeAndPrepareEigen();
          if (!res) return;

          // Dừng các animator khác nếu đang chạy
          if (typeof App.stopBasisAnimation === "function") App.stopBasisAnimation();
          if (typeof App.stopCoordAnimation === "function") App.stopCoordAnimation();

          if (window.App && App.EigenAnimator) {
            const ok = App.EigenAnimator.start({
              matrix: res.values,
              matrixId: res.item.id
            });
            if (ok && wrap) {
              wrap.style.display = "flex";
            }
          }
        });
      }

      // 3. Nút "Lời giải"
      if (btnSol) {
        btnSol.addEventListener("click", () => {
          if (!cachedEigenSolutionConfig) {
            computeAndPrepareEigen();
          }
          if (cachedEigenSolutionConfig && typeof App.openSolutionPanel === "function") {
            App.openSolutionPanel({ ...cachedEigenSolutionConfig, autoOpen: true });
          }
        });
      }
    },

    execute: function () {
      if (!this._isInitialized) this.init();
      App.refreshEigenMatrixDropdown();
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
        if (typeof App.stopEigenAnimation === "function") {
          App.stopEigenAnimation();
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
  window.addEventListener("DOMContentLoaded", function () {
    Topic6Module.init();
  });
})();
