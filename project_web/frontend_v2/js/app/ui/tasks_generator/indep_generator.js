// ==========================================================================
// FILE: frontend_v2/js/app/ui/tasks_generator/indep_generator.js
// MO TA: Bo sinh loi giai chuan muc cho bai toan Doc lap - Phu thuoc tuyen tinh
// QUY CHUAN: Zero Em-dash (\u2014), Anti-Slop, Dual-Method (Matrix & Equation)
// ==========================================================================
(function () {
  window.App = window.App || {};
  App.TasksGen = App.TasksGen || {};
  App.TasksGen.Indep = {};

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

  // --- CACH 1: PHUONG PHAP BIEN DOI SO CAP MA TRAN DONG (KHU GAUSS) ---
  App.TasksGen.Indep.buildMethodMatrix = function (data, selectedVectors) {
    const vecs = extractVectors(data, selectedVectors);
    const m = vecs.length || (data && data.num_vectors) || 0;
    const n = (vecs[0] && vecs[0].length) || (data && data.dimension) || 0;

    const methodMat = data && data.method_matrix ? data.method_matrix : null;
    const resultObj = data && data.result ? data.result : null;
    const rank = typeof resultObj?.rank === "number" ? resultObj.rank : (typeof data?.rank === "number" ? data.rank : m);
    const isIndep = resultObj?.is_independent !== undefined ? resultObj.is_independent : (data?.independent !== undefined ? data.independent : rank === m);

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
    html += `<div class="sol-bold">Bước 2: Khử Gauss đưa ma trận về dạng bậc thang (Row Echelon Form)</div>`;
    html += `<div class="sol-text">Thực hiện các phép biến đổi sơ cấp theo dòng để triệt tiêu các phần tử bên dưới đường chéo:</div>`;

    const steps = Array.isArray(methodMat?.steps) ? methodMat.steps : [];
    if (steps.length > 0) {
      let prevMatrix = vecs;
      for (let i = 0; i < steps.length; i++) {
        const st = steps[i];
        const label = st.latex_label || "";
        const nextMatrix = st.matrix || prevMatrix;

        html += `<div style="margin-bottom: 12px; padding: 10px 14px; border: 1px solid var(--border); border-radius: 4px; background: var(--card);">`;
        html += `<div class="sol-bold" style="font-size: 0.95em; margin-bottom: 6px; color: var(--fg);">`;
        html += `<i class="ph ph-arrow-right" style="color: #3b82f6;"></i> Phép biến đổi ${i + 1}: $${label ? label : "\\text{Khử dòng}"}$`;
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

    // 4. Pha 3: Ma tran bac thang cuoi cung va vi tri phan tu tru
    const echelonMat = methodMat?.echelon_matrix || (steps.length > 0 ? steps[steps.length - 1].matrix : vecs);
    const pivots = Array.isArray(methodMat?.pivots) ? methodMat.pivots : [];

    html += `<div class="sol-bold" style="margin-top: 18px;">Bước 3: Xác định phần tử trụ và tính hạng của ma trận dòng</div>`;
    html += `<div class="sol-text">Ma trận bậc thang thu được:</div>`;
    html += `<div class="sol-math-block">\\[ E = ${matrixToLatex(echelonMat)} \\]</div>`;

    if (pivots.length > 0) {
      const pivotCoords = pivots
        .map((p) => `(${p[0] + 1},\\, ${p[1] + 1})`)
        .join(",\\; ");
      html += `<div class="sol-text">Tọa độ các phần tử trụ (dòng, cột): $${pivotCoords}$.</div>`;
    }
    html += `<div class="sol-text">Số dòng khác không trong ma trận bậc thang là $r = ${rank}$. Do đó:</div>`;

    const vecNames = Array.from({ length: m }, (_, i) => subName("v", i + 1)).join(",\\, ");
    const deductionStr = methodMat?.deduction_latex || `\\mathrm{rank}\\left(\\{${vecNames}\\}\\right) = \\mathrm{rank}(A) = ${rank}`;
    html += `<div class="sol-math-block">\\[ ${deductionStr} \\]</div>`;

    // 5. Pha 4: Bien luan & Ket luan toan hoc
    html += `<div class="sol-bold" style="margin-top: 18px;">Kết luận:</div>`;
    if (isIndep) {
      html += `<div class="sol-text" style="font-weight: 600; color: #10b981;">`;
      html += `Do $\\mathrm{rank}(A) = m = ${m}$ (hạng của ma trận dòng bằng số lượng vector), hệ vector $S$ độc lập tuyến tính.`;
      html += `</div>`;
      html += `<div class="sol-text" style="margin-top: 6px;">`;
      html += `Phương trình vector thuần nhất chỉ có nghiệm tầm thường duy nhất.`;
      html += `</div>`;
    } else {
      html += `<div class="sol-text" style="font-weight: 600; color: #f59e0b;">`;
      html += `Do $\\mathrm{rank}(A) = ${rank} < m = ${m}$ (hạng của ma trận dòng nhỏ hơn số lượng vector), hệ vector $S$ phụ thuộc tuyến tính.`;
      html += `</div>`;
      const depRels = resultObj?.dependency_relations;
      if (Array.isArray(depRels) && depRels.length > 0) {
        html += `<div class="sol-text" style="margin-top: 8px;">Hệ thức liên hệ tuyến tính cụ thể giữa các vector:</div>`;
        for (const rel of depRels) {
          html += `<div class="sol-math-block">\\[ ${rel.linear_combination_latex} \\]</div>`;
        }
      }
    }

    html += `</div>`;
    return html;
  };

  // --- CACH 2: PHUONG PHAP DINH NGHIA & HE PHUONG TRINH THUAN NHAT ---
  App.TasksGen.Indep.buildMethodEquation = function (data, selectedVectors) {
    const vecs = extractVectors(data, selectedVectors);
    const m = vecs.length || (data && data.num_vectors) || 0;
    const n = (vecs[0] && vecs[0].length) || (data && data.dimension) || 0;

    const methodEq = data && data.method_equation ? data.method_equation : null;
    const resultObj = data && data.result ? data.result : null;
    const rank = typeof resultObj?.rank === "number" ? resultObj.rank : (typeof data?.rank === "number" ? data.rank : m);
    const isIndep = resultObj?.is_independent !== undefined ? resultObj.is_independent : (data?.independent !== undefined ? data.independent : rank === m);

    let html = `<div class="sol-step-container">`;

    // 1. Pha 1: Thiet lap phuong trinh vector theo dinh nghia
    html += `<div class="sol-bold">Bước 1: Thiết lập phương trình vector theo định nghĩa</div>`;
    html += `<div class="sol-text">Xét phương trình vector thuần nhất với các hệ số vô hướng $c_1, \\dots, c_{${m}} \\in \\mathbb{R}$:</div>`;
    const vectorEq = methodEq?.vector_equation_latex || Array.from({ length: m }, (_, i) => `${subName("c", i + 1)} ${subName("v", i + 1)}`).join(" + ") + " = \\vec{0} \\quad (c_i \\in \\mathbb{R})";
    html += `<div class="sol-math-block">\\[ ${vectorEq} \\]</div>`;

    // 2. Pha 2: He phuong trinh dai so vo huong & Ma tran bo sung
    html += `<div class="sol-bold" style="margin-top: 18px;">Bước 2: Lập hệ phương trình đại số tuyến tính thuần nhất</div>`;
    html += `<div class="sol-text">Khai triển theo từng tọa độ thành phần trong $\\mathbb{R}^{${n}}$, ta thu được hệ phương trình:</div>`;
    if (methodEq?.scalar_system_latex) {
      html += `<div class="sol-math-block">\\[ ${methodEq.scalar_system_latex} \\]</div>`;
    }

    if (methodEq?.augmented_matrix_latex) {
      html += `<div class="sol-text">Ma trận bổ sung $[A^T \\mid \\vec{0}]$ của hệ phương trình:</div>`;
      html += `<div class="sol-math-block">\\[ ${methodEq.augmented_matrix_latex} \\]</div>`;
    }

    // 3. Pha 3: Giai he & Bien luan khong gian nghiem
    html += `<div class="sol-bold" style="margin-top: 18px;">Bước 3: Giải hệ phương trình và xác định nghiệm tổng quát</div>`;
    if (isIndep) {
      html += `<div class="sol-text">Biến đổi ma trận hệ số về dạng bậc thang rút gọn (RREF), ta thấy hệ có $m = ${m}$ vị trí trụ và không có ẩn tự do.</div>`;
      html += `<div class="sol-text">Hệ phương trình chỉ có duy nhất nghiệm tầm thường:</div>`;
      const uniqueLines = Array.from({ length: m }, (_, i) => `${subName("c", i + 1)} = 0`).join(" = ");
      html += `<div class="sol-math-block">\\[ ${uniqueLines} = 0 \\]</div>`;
    } else {
      const freeVars = Array.isArray(methodEq?.free_variables) ? methodEq.free_variables.join(",\\; ") : subName("c", m);
      html += `<div class="sol-text">Biến đổi ma trận bổ sung về dạng bậc thang rút gọn. Hệ phương trình có các ẩn tự do: $${freeVars}$.</div>`;
      if (methodEq?.general_solution_latex) {
        html += `<div class="sol-text">Nghiệm tổng quát của hệ phụ thuộc tham số:</div>`;
        html += `<div class="sol-math-block">\\[ ${methodEq.general_solution_latex} \\]</div>`;
      }

      const nontrivial = methodEq?.nontrivial_example;
      if (nontrivial) {
        html += `<div class="sol-text">Chọn tham số $${nontrivial.param_value}$, ta thu được một bộ nghiệm không tầm thường cụ thể:</div>`;
        html += `<div class="sol-math-block">\\[ ${nontrivial.relation_latex} \\]</div>`;
      }
    }

    // 4. Pha 4: Ket luan toan hoc chuan muc
    html += `<div class="sol-bold" style="margin-top: 18px;">Kết luận:</div>`;
    if (isIndep) {
      html += `<div class="sol-text" style="font-weight: 600; color: #10b981;">`;
      html += `Hệ phương trình thuần nhất chỉ có nghiệm tầm thường, do đó hệ vector $S$ độc lập tuyến tính theo định nghĩa.`;
      html += `</div>`;
    } else {
      html += `<div class="sol-text" style="font-weight: 600; color: #f59e0b;">`;
      html += `Hệ phương trình có nghiệm không tầm thường, do đó hệ vector $S$ phụ thuộc tuyến tính theo định nghĩa.`;
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  };

  // --- HAM DONG GOI DUAL-METHOD SOLUTION ---
  App.TasksGen.Indep.buildSolution = function (data, selectedVectors) {
    const vecs = extractVectors(data, selectedVectors);
    const n = (vecs[0] && vecs[0].length) || (data && data.dimension) || 3;

    const content1 = App.TasksGen.Indep.buildMethodMatrix(data, selectedVectors);
    const content2 = App.TasksGen.Indep.buildMethodEquation(data, selectedVectors);

    return {
      titleText: "Độc lập - phụ thuộc tuyến tính",
      titleMath: `\\( \\mathbb{R}^{${n}} \\)`,
      tab1Label: "Cách 1: Khử Gauss ma trận dòng",
      tab2Label: "Cách 2: Hệ phương trình thuần nhất",
      showSubTabs: false,
      content1: content1,
      content2: content2,
    };
  };
})();
