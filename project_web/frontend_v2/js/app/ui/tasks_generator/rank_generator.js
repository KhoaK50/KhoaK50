// ==========================================================================
// FILE: frontend_v2/js/app/ui/tasks_generator/rank_generator.js
// MO TA: Bo sinh loi giai chuan muc cho bai toan Tinh hang cua he vector
// QUY CHUAN: Zero Em-dash (\u2014), Anti-Slop, Dual-Method (REF & Maximal Subset)
// ==========================================================================
(function () {
  window.App = window.App || {};
  App.TasksGen = App.TasksGen || {};
  App.TasksGen.Rank = {};

  // --- CAC HAM BO TRO FORMAT TOAN HOC ---
  function fmtScalar(x) {
    if (x === null || x === undefined) return "0";
    if (typeof x === "string") {
      let s = x.trim();
      s = s.replace(/sqrt\(([^)]+)\)/g, "\\sqrt{$1}");
      return s;
    }
    if (typeof x === "number") {
      if (Number.isInteger(x)) return String(x);
      if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
      // Tim phan so toi gian
      for (let d = 2; d <= 100; d++) {
        let n = x * d;
        if (Math.abs(n - Math.round(n)) < 1e-5) {
          let num = Math.round(n);
          let sign = "";
          if (num < 0 || d < 0) {
            sign = "-";
            num = Math.abs(num);
          }
          return `${sign}\\frac{${num}}{${Math.abs(d)}}`;
        }
      }
      return String(Math.round(x * 10000) / 10000);
    }
    return String(x);
  }

  function vecToLatex(v) {
    if (!Array.isArray(v)) return "\\vec{0}";
    const items = v.map(fmtScalar);
    return `\\left(${items.join(",\\, ")}\\right)`;
  }

  function matrixToLatex(rows) {
    if (!Array.isArray(rows) || !rows.length) return "\\begin{pmatrix}\\end{pmatrix}";
    const content = rows
      .map((r) => (Array.isArray(r) ? r.map(fmtScalar).join(" & ") : fmtScalar(r)))
      .join(" \\\\ ");
    return `\\begin{pmatrix} ${content} \\end{pmatrix}`;
  }

  function subName(prefix, idx) {
    return idx < 10 ? `${prefix}_${idx}` : `${prefix}_{${idx}}`;
  }

  function extractVectors(data, selectedVectors) {
    if (data && Array.isArray(data.vectors) && data.vectors.length > 0) {
      return data.vectors.map((row) => (Array.isArray(row) ? row.slice() : row));
    }
    if (Array.isArray(selectedVectors) && selectedVectors.length > 0) {
      return selectedVectors.map((item) => {
        if (item && Array.isArray(item.vec)) return item.vec.slice();
        if (Array.isArray(item)) return item.slice();
        return item;
      });
    }
    return [];
  }

  // --- CACH 1: PHUONG PHAP BIEN DOI SO CAP DUA VE MA TRAN BAC THANG (REF) ---
  App.TasksGen.Rank.buildMethodMatrix = function (data, selectedVectors) {
    const vecs = extractVectors(data, selectedVectors);
    const m = vecs.length || (data && data.num_vectors) || 0;
    const n = (vecs[0] && vecs[0].length) || (data && data.dimension) || 0;

    const methodMat = data && data.method_matrix ? data.method_matrix : null;
    const resultObj = data && data.result ? data.result : null;
    const rank = typeof resultObj?.rank === "number" ? resultObj.rank : (typeof data?.rank === "number" ? data.rank : 0);

    let html = `<div class="sol-step-container">`;

    // 1. De bai & Thiet lap he vector
    html += `<div class="sol-text">Trong không gian vector $\\mathbb{R}^{${n}}$, xét hệ $S$ gồm $${m}$ vector:</div>`;
    const vecDefs = vecs
      .map((v, i) => `${subName("v", i + 1)} = ${vecToLatex(v)}`)
      .join(",\\; ");
    html += `<div class="sol-math-block">\\[ S = \\left\\{ ${vecDefs} \\right\\} \\]</div>`;

    // 2. Pha 1: Lap ma tran dong A
    html += `<div class="sol-bold">Bước 1: Lập ma trận dòng từ hệ vector</div>`;
    html += `<div class="sol-text">Lập ma trận $A$ kích thước $${m} \\times ${n}$ nhận các vector $v_1, \\dots, v_{${m}}$ làm các dòng:</div>`;
    const matSetup = methodMat?.matrix_setup_latex || `A = ${matrixToLatex(vecs)}`;
    html += `<div class="sol-math-block">\\[ ${matSetup} \\]</div>`;

    // 3. Pha 2: Chuoi bien doi so cap theo dong dua ve ma tran bac thang (REF)
    html += `<div class="sol-bold">Bước 2: Khử Gauss đưa ma trận về dạng bậc thang (REF)</div>`;
    html += `<div class="sol-text">Sử dụng các phép biến đổi sơ cấp theo dòng ($h_i \\leftrightarrow h_j$, $h_i \\leftarrow h_i + c \\cdot h_j$) để đưa $A$ về dạng bậc thang:</div>`;

    const steps = Array.isArray(methodMat?.steps) ? methodMat.steps : [];
    if (steps.length > 0) {
      let prevMatrix = vecs;
      for (let i = 0; i < steps.length; i++) {
        const st = steps[i];
        const label = st.latex_label || "";
        const nextMatrix = st.matrix || prevMatrix;

        html += `<div style="margin-bottom: 12px; padding: 10px 14px; border: 1px solid var(--border); border-radius: 4px; background: var(--card);">`;
        html += `<div class="sol-bold" style="font-size: 0.95em; margin-bottom: 6px; color: var(--fg);">`;
        html += `<i class="ph ph-arrow-right" style="color: #3b82f6;"></i> Phép biến đổi ${i + 1}: $${label ? label : "\\text{Biến đổi sơ cấp}"}$`;
        html += `</div>`;
        html += `<div class="sol-math-block" style="overflow-x: auto; padding: 4px 0;">`;
        html += `\\[ ${matrixToLatex(prevMatrix)} \\xrightarrow{\\;${label}\\;} ${matrixToLatex(nextMatrix)} \\]`;
        html += `</div>`;
        html += `</div>`;

        prevMatrix = nextMatrix;
      }
    } else {
      html += `<div class="sol-text" style="font-style: italic; color: var(--muted);">(Ma trận ban đầu đã ở dạng bậc thang)</div>`;
    }

    // 4. Pha 3: Xac dinh phan tu tru va dem so dong khac 0
    const echelonMat = methodMat?.echelon_matrix || (steps.length > 0 ? steps[steps.length - 1].matrix : vecs);
    const pivots = Array.isArray(methodMat?.pivots) ? methodMat.pivots : [];

    html += `<div class="sol-bold" style="margin-top: 18px;">Bước 3: Xác định phần tử trụ và đếm số dòng khác không</div>`;
    html += `<div class="sol-text">Ma trận bậc thang $E$ thu được sau quá trình khử Gauss:</div>`;
    html += `<div class="sol-math-block">\\[ E = ${matrixToLatex(echelonMat)} \\]</div>`;

    if (pivots.length > 0) {
      const pivotCoords = pivots
        .map((p) => `(${p[0] + 1},\\, ${p[1] + 1})`)
        .join(",\\; ");
      html += `<div class="sol-text">Tọa độ các phần tử trụ trên ma trận bậc thang: $${pivotCoords}$.</div>`;
    }
    html += `<div class="sol-text">Số dòng khác không của ma trận bậc thang $E$ là $r = ${rank}$.</div>`;

    // 5. Pha 4: Ket luan toan hoc chuan muc
    html += `<div class="sol-bold" style="margin-top: 18px;">Kết luận:</div>`;
    const vecNames = Array.from({ length: m }, (_, i) => subName("v", i + 1)).join(",\\, ");
    html += `<div class="sol-text" style="font-weight: 600; color: #2563eb;">`;
    html += `Hạng của hệ vector $S$ bằng số dòng khác không của ma trận bậc thang $E$:`;
    html += `</div>`;
    html += `<div class="sol-math-block">\\[ \\mathrm{rank}(S) = \\mathrm{rank}(A) = ${rank} \\]</div>`;
    html += `<div class="sol-text" style="margin-top: 6px;">`;
    html += `Không gian con sinh bởi hệ vector có số chiều là: $\\dim(\\mathrm{span}(S)) = ${rank}$.`;
    html += `</div>`;

    html += `</div>`;
    return html;
  };

  // --- CACH 2: PHUONG PHAP HE DOC LAP TUYEN TINH TOI DAI ---
  App.TasksGen.Rank.buildMethodMaximalSubset = function (data, selectedVectors) {
    const vecs = extractVectors(data, selectedVectors);
    const m = vecs.length || (data && data.num_vectors) || 0;
    const n = (vecs[0] && vecs[0].length) || (data && data.dimension) || 0;

    const methodEq = data && (data.method_equation || data.method_definition) ? (data.method_equation || data.method_definition) : null;
    const resultObj = data && data.result ? data.result : null;
    const rank = typeof resultObj?.rank === "number" ? resultObj.rank : (typeof data?.rank === "number" ? data.rank : 0);

    let html = `<div class="sol-step-container">`;

    // 1. Pha 1: Co so ly thuyet ve he doc lap tuyen tinh toi dai
    html += `<div class="sol-bold">Bước 1: Cơ sở lý thuyết về hệ độc lập tuyến tính tối đại</div>`;
    html += `<div class="sol-text">`;
    html += `Theo định nghĩa trong lý thuyết không gian vector, hạng của một hệ vector $S = \\{v_1, \\dots, v_{${m}}\\}$ chính là số lượng vector lớn nhất của một tập con độc lập tuyến tính chứa trong $S$.`;
    html += `</div>`;

    // 2. Pha 2: Xac dinh tap con doc lap tuyen tinh toi dai
    html += `<div class="sol-bold" style="margin-top: 18px;">Bước 2: Xác định tập con độc lập tuyến tính tối đại S'</div>`;
    html += `<div class="sol-text">`;
    html += `Xếp các vector thành các cột của ma trận $V = A^T = \\begin{pmatrix} v_1 & v_2 & \\dots & v_{${m}} \\end{pmatrix}$. Khử Gauss-Jordan tìm các cột chứa phần tử trụ (pivot columns):`;
    html += `</div>`;

    const maxSubsetStr = methodEq?.maximal_independent_subset_latex || (rank > 0 ? `S' = \\{${Array.from({ length: rank }, (_, i) => subName("v", i + 1)).join(",\\; ")}\\}` : `S' = \\emptyset`);
    html += `<div class="sol-math-block">\\[ ${maxSubsetStr} \\]</div>`;

    // 3. Pha 3: So chieu cua khong gian sinh
    html += `<div class="sol-bold" style="margin-top: 18px;">Bước 3: Mối liên hệ với không gian sinh Span(S)</div>`;
    if (rank === 0) {
      html += `<div class="sol-text">Hệ vector chỉ gồm vector không $\\vec{0}$, không gian sinh chỉ gồm vector không và có số chiều bằng 0.</div>`;
    } else {
      html += `<div class="sol-text">`;
      html += `Do $S'$ là hệ độc lập tuyến tính tối đại trong $S$, mọi vector còn lại của $S$ đều là tổ hợp tuyến tính của các vector trong $S'$. Do đó:`;
      html += `</div>`;
      html += `<div class="sol-math-block">\\[ \\mathrm{span}(S) = \\mathrm{span}(S') \\implies \\dim(\\mathrm{span}(S)) = |S'| = ${rank} \\]</div>`;
    }

    // 4. Pha 4: Ket luan toan hoc chuan muc
    html += `<div class="sol-bold" style="margin-top: 18px;">Kết luận:</div>`;
    html += `<div class="sol-text" style="font-weight: 600; color: #2563eb;">`;
    html += `Số lượng vector độc lập tuyến tính cực đại trong hệ là $${rank}$, nên hạng của hệ vector $S$ bằng:`;
    html += `</div>`;
    html += `<div class="sol-math-block">\\[ \\mathrm{rank}(S) = ${rank} \\]</div>`;

    html += `</div>`;
    return html;
  };

  // --- HAM DONG GOI DUAL-METHOD SOLUTION ---
  App.TasksGen.Rank.buildSolution = function (data, selectedVectors) {
    const vecs = extractVectors(data, selectedVectors);
    const n = (vecs[0] && vecs[0].length) || (data && data.dimension) || 3;

    const content1 = App.TasksGen.Rank.buildMethodMatrix(data, selectedVectors);
    const content2 = App.TasksGen.Rank.buildMethodMaximalSubset(data, selectedVectors);

    return {
      titleText: "Hạng của hệ vector",
      titleMath: `\\( \\mathbb{R}^{${n}} \\)`,
      tab1Label: "Cách 1: Ma trận bậc thang",
      tab2Label: "Cách 2: Hệ độc lập tuyến tính tối đại",
      showSubTabs: false,
      content1: content1,
      content2: content2,
    };
  };
})();
