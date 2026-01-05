// ===================== solution_generators.js =====================
(function () {
  window.App = window.App || {};
  App.SolutionGen = App.SolutionGen || {};

  // ---------- scalar / vector / matrix to LaTeX ----------
  function fmtScalarLatex(x) {
    let s = (typeof App.formatScalar === "function") ? App.formatScalar(x) : String(x);
    s = String(s).trim();
    s = s.replace(/sqrt\(([^)]+)\)/g, "\\sqrt{$1}");
    s = s.replace(/(\d)\s*\*\s*(\\sqrt|\w)/g, "$1\\cdot $2");
    return s;
  }

  function vecToLatex(v) {
    const items = (v || []).map(fmtScalarLatex);
    return `\\left(${items.join(",\\;")}\\right)`;
  }

  function matrixToLatex(M) {
    if (!Array.isArray(M) || !M.length) return "\\begin{pmatrix}\\end{pmatrix}";
    const rows = M.map(row => (row || []).map(fmtScalarLatex).join(" & ")).join(" \\\\ ");
    return `\\begin{pmatrix} ${rows} \\end{pmatrix}`;
  }

  function nonZeroRowCount(M) {
    if (!Array.isArray(M)) return 0;
    let c = 0;
    for (const row of M) {
      if (!Array.isArray(row)) continue;
      const allZero = row.every(x => {
        const s = String(x);
        return x === 0 || s === "0" || s === "0.0";
      });
      if (!allZero) c++;
    }
    return c;
  }

  function isZeroRow(row) {
    if (!Array.isArray(row)) return true;
    return row.every(x => {
      const s = String(x);
      return x === 0 || s === "0" || s === "0.0";
    });
  }

  function isZeroVector(v, tol = 1e-10) {
    if (!Array.isArray(v) || !v.length) return true;
    return v.every(x => Math.abs(Number(x)) < tol);
  }

  // ---------- helpers: compare matrices to skip redundant last matrix ----------
  function normCell(x) {
    if (x === null || x === undefined) return "";
    if (typeof x === "number") {
      if (!Number.isFinite(x)) return String(x);
      const r = Math.round(x);
      if (Math.abs(x - r) < 1e-12) return String(r);
      return String(Number(x.toFixed(12)));
    }
    return String(x).trim();
  }

  function matrixEqual(A, B) {
    if (A === B) return true;
    if (!Array.isArray(A) || !Array.isArray(B)) return false;
    if (A.length !== B.length) return false;
    for (let i = 0; i < A.length; i++) {
      const ra = A[i], rb = B[i];
      if (!Array.isArray(ra) || !Array.isArray(rb)) return false;
      if (ra.length !== rb.length) return false;
      for (let j = 0; j < ra.length; j++) {
        if (normCell(ra[j]) !== normCell(rb[j])) return false;
      }
    }
    return true;
  }

  // ---------- row-op label ----------
  function fmtNumForOp(k) {
    const kk = Number(k);
    if (!Number.isFinite(kk)) return String(k);
    if (Math.abs(kk - Math.round(kk)) < 1e-12) return String(Math.round(kk));
    return String(Number(kk.toFixed(6)));
  }

  function rowOpDictToLatex(op) {
    if (!op || typeof op !== "object") return "";

    const kind = op.op;

    if (kind === "swap") {
      const a = Number(op.i) + 1;
      const b = Number(op.j) + 1;
      if (Number.isFinite(a) && Number.isFinite(b)) {
        return `d_${a}\\;\\leftrightarrow\\;d_${b}`;
      }
      return "";
    }

    if (kind === "elim") {
      const dst = Number(op.i) + 1;
      const src = Number(op.j) + 1;
      const k = Number(op.factor);

      if (!Number.isFinite(dst) || !Number.isFinite(src)) return "";
      if (!Number.isFinite(k)) return `d_${dst}\\;\\to\\;d_${dst}`;

      if (Math.abs(k) < 1e-12) return `d_${dst}\\;\\to\\;d_${dst}`;
      if (Math.abs(k - 1) < 1e-12) return `d_${dst}\\;\\to\\;d_${dst}-d_${src}`;
      if (Math.abs(k + 1) < 1e-12) return `d_${dst}\\;\\to\\;d_${dst}+d_${src}`;

      if (k > 0) return `d_${dst}\\;\\to\\;d_${dst}-${fmtNumForOp(k)}d_${src}`;
      return `d_${dst}\\;\\to\\;d_${dst}+${fmtNumForOp(Math.abs(k))}d_${src}`;
    }

    return "";
  }

  function cleanLabelFromText(text) {
    let s = String(text ?? "").trim();
    if (!s) return "";

    s = s.replace(/^Bước\s*[^:]*:\s*/i, "").trim();
    s = s.replace(/↔/g, "\\leftrightarrow");
    s = s.replace(/→/g, "\\to");

    const hasArrow = /(\\+to|\\+leftrightarrow)/.test(s);
    const hasD = /d_\d+/.test(s);
    if (!hasArrow || !hasD) return "";

    s = s.replace(/\\+to/g, "\\to");
    s = s.replace(/\\+leftrightarrow/g, "\\leftrightarrow");

    s = s.replace(/d_(\d+)\s*\\to\s*d_(\d+)/g, "d_$1\\;\\to\\; d_$2");
    s = s.replace(/d_(\d+)\s*\\leftrightarrow\s*d_(\d+)/g, "d_$1\\;\\leftrightarrow\\; d_$2");
    s = s.replace(/\s*\+\s*/g, " + ");
    s = s.replace(/\s*-\s*/g, " - ");
    s = s.replace(/\s+/g, " ").trim();

    return s;
  }

  function arrowLatex(label) {
    if (!label) return "\\to";
    return `\\xrightarrow{\\;${label}\\;}`;
  }

  function buildChainFromSteps(steps) {
    const list = Array.isArray(steps) ? steps : [];

    let firstMatrix = null;
    for (const st of list) {
      if (st && Array.isArray(st.matrix) && st.matrix.length) {
        firstMatrix = st.matrix;
        break;
      }
    }
    if (!firstMatrix) return { chain: "", lastMatrix: null };

    const rowOps = list.filter(st => st && st.kind === "row_op" && Array.isArray(st.matrix));
    if (rowOps.length) {
      let chain = `${matrixToLatex(firstMatrix)}`;
      let prevM = firstMatrix;

      for (const st of rowOps) {
        const label = rowOpDictToLatex(st.row_op) || cleanLabelFromText(st.text) || "";
        const nextM = st.matrix;

        if (!label && matrixEqual(prevM, nextM)) continue;

        chain += `\\;${arrowLatex(label)}\\;${matrixToLatex(nextM)}`;
        prevM = nextM;
      }
      return { chain, lastMatrix: prevM };
    }

    const mats = [];
    for (const st of list) {
      if (st && st.kind === "matrix" && Array.isArray(st.matrix)) {
        mats.push({ M: st.matrix, label: cleanLabelFromText(st.text) });
      }
    }
    if (!mats.length) return { chain: "", lastMatrix: null };

    let chain = `${matrixToLatex(mats[0].M)}`;
    let prevM = mats[0].M;

    for (let i = 1; i < mats.length; i++) {
      const label = mats[i].label || "";
      const nextM = mats[i].M;
      if (!label && matrixEqual(prevM, nextM)) continue;
      chain += `\\;${arrowLatex(label)}\\;${matrixToLatex(nextM)}`;
      prevM = nextM;
    }

    return { chain, lastMatrix: prevM };
  }

  // =========================
  // CÁCH 1: Ma trận & biến đổi sơ cấp
  // =========================
  App.SolutionGen.buildBasisByMatrix = function (selectedItems, apiData) {
    const vecs = (selectedItems || []).map(it => (it.vec || []).slice());
    const n = vecs[0]?.length ?? 0;

    const dim = (typeof apiData?.dimension === "number") ? apiData.dimension : null;
    const A = vecs;

    const steps = Array.isArray(apiData?.steps) ? apiData.steps : [];
    const { chain, lastMatrix } = buildChainFromSteps(steps);
    const chainLatex = chain ? chain : `${matrixToLatex(A)}`;

    const rankFromE = Array.isArray(lastMatrix) ? nonZeroRowCount(lastMatrix) : null;
    const rank = (dim !== null) ? dim : (rankFromE ?? null);

    const vecListLatex = (selectedItems || [])
      .map((it, i) => `v_{${i + 1}} = ${vecToLatex(it.vec)}`)
      .join(",\\; ");

    let basisRows = [];
    if (Array.isArray(lastMatrix)) basisRows = lastMatrix.filter(r => !isZeroRow(r));

    const basisRowsLatex = basisRows.length
      ? `\\left\\{${basisRows.map(vecToLatex).join(",\\; ")}\\right\\}`
      : "\\left\\{\\;\\right\\}";

    return {
      titleText: "Cơ sở và số chiều trong",
      titleMath: `\\(\\mathbb{R}^{${n}}\\)`,

      matLatex:
        "\\renewcommand{\\arraystretch}{1.25}\n" +
        "\\begin{array}{l}\n" +
        `\\text{Cho } ${vecListLatex}.\\\\[2pt]\n` +
        `\\text{Lập ma trận }A\\text{ (các vectơ là các dòng) và biến đổi về dạng bậc thang:}\\\\[6pt]\n` +
        `${chainLatex}.\\\\[10pt]\n` +
        "\\textbf{Kết luận.}\\\\[4pt]\n" +
        `\\bullet\\; \\text{Số chiều: }\\dim(V) = ${rank !== null ? rank : "\\,?\\,"}.\\\\[2pt]\n` +
        `\\bullet\\; \\text{Một cơ sở của }V\\text{ là: } B = ${basisRowsLatex}.\\\\\n` +
        "\\end{array}",

      basisVectors: basisRows,
      dimension: rank
    };
  };

  // ============================================================
  // CÁCH 2A: Giải hệ phương trình - TỔNG QUÁT (FIX theo PDF)
  // ============================================================

  function buildComponentSystemLatex(vecs) {
    const m = vecs.length;
    const n = vecs[0]?.length ?? 0;

    const eqs = [];
    for (let i = 0; i < n; i++) {
      const parts = [];
      for (let j = 0; j < m; j++) {
        const a = Number(vecs[j][i] ?? 0);
        const kj = `k_{${j + 1}}`;

        if (j === 0) {
          parts.push(`${fmtScalarLatex(a)}${kj}`);
        } else {
          if (a >= 0) parts.push(`+ ${fmtScalarLatex(a)}${kj}`);
          else parts.push(`- ${fmtScalarLatex(Math.abs(a))}${kj}`);
        }
      }
      let lhs = parts.join(" ");
      lhs = lhs.replace(/\+\s*0k_\{\d+\}/g, ""); // nhẹ tay loại 0k (nếu có)
      lhs = lhs.replace(/-\s*0k_\{\d+\}/g, "");
      lhs = lhs.replace(/\s+/g, " ").trim();
      eqs.push(`${lhs} = 0\\;(${i + 1})`);
    }

    return `\\left\\{\\begin{array}{l}\n${eqs.join(" \\\\\n")}\n\\end{array}\\right.`;
  }

  function rref(A, tol = 1e-10) {
    const M = A.map(r => r.map(x => Number(x)));
    const rows = M.length;
    const cols = M[0]?.length ?? 0;

    let r = 0;
    const pivotCols = [];

    for (let c = 0; c < cols && r < rows; c++) {
      let piv = r;
      for (let i = r; i < rows; i++) {
        if (Math.abs(M[i][c]) > Math.abs(M[piv][c])) piv = i;
      }
      if (Math.abs(M[piv][c]) < tol) continue;

      if (piv !== r) {
        const tmp = M[piv]; M[piv] = M[r]; M[r] = tmp;
      }

      const pv = M[r][c];
      for (let j = c; j < cols; j++) M[r][j] /= pv;

      for (let i = 0; i < rows; i++) {
        if (i === r) continue;
        const f = M[i][c];
        if (Math.abs(f) < tol) continue;
        for (let j = c; j < cols; j++) M[i][j] -= f * M[r][j];
      }

      pivotCols.push(c);
      r++;
    }

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (Math.abs(M[i][j]) < tol) M[i][j] = 0;
      }
    }

    return { M, pivotCols, rank: pivotCols.length };
  }

  function solutionFromRrefLatex(R, pivotCols) {
    const n = R.length;
    const m = R[0]?.length ?? 0;

    const pivSet = new Set(pivotCols);
    const freeCols = [];
    for (let j = 0; j < m; j++) if (!pivSet.has(j)) freeCols.push(j);

    // only trivial
    if (freeCols.length === 0) {
      const lines = [];
      for (let j = 0; j < m; j++) lines.push(`k_{${j + 1}} = 0`);
      return {
        freeCount: 0,
        freeCols,
        latex:
          "\\left\\{\\begin{array}{l}\n" +
          lines.join(" \\\\\n") +
          "\n\\end{array}\\right."
      };
    }

    const tNames = freeCols.map((_, idx) => `t_{${idx + 1}}`);
    const lines = [];

    // free vars
    for (let idx = 0; idx < freeCols.length; idx++) {
      const col = freeCols[idx];
      lines.push(`k_{${col + 1}} = ${tNames[idx]}`);
    }

    // pivot vars from rref rows
    // find pivot row for each pivot col (leading 1)
    function findPivotRow(pc) {
      for (let i = 0; i < n; i++) {
        if (R[i][pc] !== 1) continue;
        // leading check
        let ok = true;
        for (let j = 0; j < pc; j++) {
          if (Math.abs(Number(R[i][j])) > 1e-12) { ok = false; break; }
        }
        if (ok) return i;
      }
      return -1;
    }

    for (const pc of pivotCols) {
      const row = findPivotRow(pc);
      if (row < 0) continue;

      const terms = [];
      for (let idx = 0; idx < freeCols.length; idx++) {
        const fc = freeCols[idx];
        const coeff = Number(R[row][fc] ?? 0);
        if (Math.abs(coeff) < 1e-12) continue;

        // k_pc + coeff*k_fc = 0 -> k_pc = -coeff*k_fc
        const c = -coeff;
        if (Math.abs(c - 1) < 1e-12) terms.push(`${tNames[idx]}`);
        else if (Math.abs(c + 1) < 1e-12) terms.push(`- ${tNames[idx]}`);
        else terms.push(`${fmtScalarLatex(c)}${tNames[idx]}`);
      }

      const rhs = terms.length ? terms.join(" + ").replace(/\+\s*-\s*/g, "- ") : "0";
      lines.push(`k_{${pc + 1}} = ${rhs}`);
    }

    return {
      freeCount: freeCols.length,
      freeCols,
      latex:
        "\\left\\{\\begin{array}{l}\n" +
        lines.join(" \\\\\n") +
        "\n\\end{array}\\right."
    };
  }

  App.SolutionGen.buildBasisByEquationsGeneral = function (selectedItems, apiData) {
    const vecs = (selectedItems || []).map(it => (it.vec || []).slice());
    const n = vecs[0]?.length ?? 0;
    const m = vecs.length;

    const dim = (typeof apiData?.dimension === "number") ? apiData.dimension : null;

    // basis lấy từ hệ sinh: ưu tiên pivot_indices backend, nếu không có thì dùng pivotCols từ rref
    const pivotFromApi = Array.isArray(apiData?.pivot_indices) ? apiData.pivot_indices : null;

    const vecListLatex = (selectedItems || [])
      .map((it, i) => `v_{${i + 1}} = ${vecToLatex(it.vec)}`)
      .join(",\\; ");

    const eq0 = Array.from({ length: m }, (_, i) => `k_{${i + 1}}v_{${i + 1}}`).join(" + ") + " = \\vec{0}";

    // hệ phương trình theo thành phần
    const sysLatex = buildComponentSystemLatex(vecs);

    // ma trận hệ số A (n x m): hàng là tọa độ, cột là vector
    const A = Array.from({ length: n }, (_, i) =>
      Array.from({ length: m }, (_, j) => Number(vecs[j][i] ?? 0))
    );

    const { M: R, pivotCols, rank: rnk } = rref(A, 1e-10);
    const sol = solutionFromRrefLatex(R, pivotCols);

    const independent = (sol.freeCount === 0); // only trivial -> independent

    let piv = pivotFromApi;
    if (!Array.isArray(piv) || !piv.length) piv = pivotCols.slice(); // 0-based

    const basisFromSet = piv.length ? piv.map(i => vecs[i]) : [];

    const basisLatex = basisFromSet.length
      ? `\\left\\{${basisFromSet.map(vecToLatex).join(",\\; ")}\\right\\}`
      : "\\left\\{\\;\\right\\}";

    const rank = (typeof dim === "number") ? dim : (typeof rnk === "number" ? rnk : null);

    return {
      titleText: "Cơ sở & số chiều trong",
      titleMath: `\\(\\mathbb{R}^{${n}}\\)`,

      eqLatexGeneral:
        "\\renewcommand{\\arraystretch}{1.25}\n" +
        "\\begin{array}{l}\n" +
        `\\text{Cho } ${vecListLatex}.\\\\[2pt]\n` +
        `\\text{[Xét }V=\\mathrm{span}\\{v_1,\\dots,v_m\\}\\text{ }(m \\ge 1).\\;\\text{Một tập con các vector trong hệ sinh sẽ làm cơ sở]}\\\\[10pt]` +
        "\\textbf{Bước 1: Lập hệ phương trình.}\\\\[4pt]\n" +
        `\\text{Xét phương trình vectơ: } ${eq0}.\\\\[6pt]\n` +
        "\\text{Tương đương hệ phương trình theo từng thành phần:}\\\\[6pt]\n" +
        `${sysLatex}.\\\\[10pt]\n` +

        "\\textbf{Bước 2: Giải hệ (khử Gauss).}\\\\[4pt]\n" +
        "\\text{Đưa ma trận hệ số về dạng bậc thang rút gọn:}\\\\[6pt]\n" +
        `${matrixToLatex(A)}\\;\\to\\;${matrixToLatex(R)}.\\\\[8pt]\n` +
        "\\text{Suy ra nghiệm của hệ:}\\\\[4pt]\n" +
        `${sol.latex}.\\\\[10pt]\n` +

        "\\textbf{Bước 3: Kết luận.}\\\\[4pt]\n" +
        (independent
          ? "\\text{Hệ chỉ có nghiệm tầm thường nên các vectơ độc lập tuyến tính.}\\\\[4pt]\n"
          : "\\text{Hệ có nghiệm không tầm thường nên các vectơ phụ thuộc tuyến tính.}\\\\[4pt]\n"
        ) +
        `\\bullet\\; \\text{Số chiều: }\\dim(V) = ${rank != null ? String(rank) : "?"}.\\\\[2pt]\n` +
        `\\bullet\\; \\text{Một cơ sở (lấy từ hệ sinh) là: } B = ${basisLatex}.` +
        "\n\\end{array}"
    };
  };

  // =========================
  // CÁCH 2B: Xét từng vector (R5)
  // =========================
  function ratioCheckLatex(v1, v2) {
    const a1 = fmtScalarLatex(v1[0]);
    const b1 = fmtScalarLatex(v2[0]);
    const a2 = fmtScalarLatex(v1[1] ?? 0);
    const b2 = fmtScalarLatex(v2[1] ?? 0);
    return `\\left(\\dfrac{${a1}}{${b1}} \\neq \\dfrac{${a2}}{${b2}}\\right)`;
  }

  function solveCoeffs(B, v) {
    const n = v.length;
    const r = B.length;
    const BT = Array.from({ length: n }, (_, i) => Array.from({ length: r }, (_, j) => Number(B[j][i] ?? 0)));
    const rhs = Array.from({ length: n }, (_, i) => Number(v[i] ?? 0));

    const idxs = Array.from({ length: n }, (_, i) => i);

    function det2(A) { return A[0][0]*A[1][1]-A[0][1]*A[1][0]; }
    function det3(A) {
      return A[0][0]*(A[1][1]*A[2][2]-A[1][2]*A[2][1])
           - A[0][1]*(A[1][0]*A[2][2]-A[1][2]*A[2][0])
           + A[0][2]*(A[1][0]*A[2][1]-A[1][1]*A[2][0]);
    }

    function combinations(arr, k) {
      const out = [];
      const rec = (start, cur) => {
        if (cur.length === k) { out.push(cur.slice()); return; }
        for (let i = start; i < arr.length; i++) {
          cur.push(arr[i]);
          rec(i + 1, cur);
          cur.pop();
        }
      };
      rec(0, []);
      return out;
    }

    let rows = null;
    if (r === 1) rows = [0];
    else if (r === 2 || r === 3) {
      for (const cand of combinations(idxs, r)) {
        const A = cand.map(i => BT[i].slice());
        const d = (r === 2) ? det2(A) : det3(A);
        if (Math.abs(d) > 1e-10) { rows = cand; break; }
      }
    } else {
      rows = Array.from({ length: r }, (_, i) => i);
    }

    if (!rows) return { rowsUsed: [0], coeffs: Array(r).fill(0), ok: false };

    const A = rows.map(i => BT[i].slice());
    const b = rows.map(i => rhs[i]);

    const M = A.map((row, i) => row.concat([b[i]]));

    for (let col = 0; col < r; col++) {
      let piv = col;
      for (let i = col; i < r; i++) {
        if (Math.abs(M[i][col]) > Math.abs(M[piv][col])) piv = i;
      }
      if (Math.abs(M[piv][col]) < 1e-12) continue;
      if (piv !== col) { const tmp = M[piv]; M[piv] = M[col]; M[col] = tmp; }

      const pv = M[col][col];
      for (let j = col; j <= r; j++) M[col][j] /= pv;

      for (let i = 0; i < r; i++) {
        if (i === col) continue;
        const f = M[i][col];
        for (let j = col; j <= r; j++) M[i][j] -= f * M[col][j];
      }
    }

    const coeffs = Array.from({ length: r }, (_, i) => M[i][r]);

    let ok = true;
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < r; j++) s += (Number(B[j][i] ?? 0) * coeffs[j]);
      if (Math.abs(s - rhs[i]) > 1e-6) { ok = false; break; }
    }

    return { rowsUsed: rows, coeffs, ok };
  }

  function fmtCoeff(k) {
    const x = Number(k);
    if (!Number.isFinite(x)) return "0";
    const r = Math.round(x);
    if (Math.abs(x - r) < 1e-10) return String(r);
    return String(Number(x.toFixed(6)));
  }

  App.SolutionGen.buildBasisByEquationsStepwise = function (selectedItems, apiData) {
    const vecs = (selectedItems || []).map(it => (it.vec || []).slice());
    const n = vecs[0]?.length ?? 0;
    const m = vecs.length;

    const basisFromApi = Array.isArray(apiData?.basis) ? apiData.basis : [];
    const dim = (typeof apiData?.dimension === "number") ? apiData.dimension : null;

    const vecListLatex = (selectedItems || [])
      .map((it, i) => `v_{${i + 1}} = ${vecToLatex(it.vec)}`)
      .join(",\\; ");

    const lines = [];
    lines.push(`\\text{Cho } ${vecListLatex}.\\\\[2pt]`);
    lines.push(`\\text{[Xét }V=\\mathrm{span}\\{v_1,\\dots,v_m\\}\\text{ }(m \\ge 1).\\;\\text{Một tập con các vector trong hệ sinh sẽ làm cơ sở]}\\\\[10pt]`);

    if (m === 1) {
      lines.push(`\\textbf{Bước 1: Xét hệ }\\left\\{v_{1}\\right\\}.\\\\[4pt]`);
      if (isZeroVector(vecs[0])) lines.push(`\\text{Vì }v_{1}=\\vec{0}\\text{ nên }\\left\\{v_{1}\\right\\}\\text{ phụ thuộc tuyến tính.}\\\\[10pt]`);
      else lines.push(`\\text{Vì }v_{1}\\neq\\vec{0}\\text{ nên }\\left\\{v_{1}\\right\\}\\text{ độc lập tuyến tính.}\\\\[10pt]`);
    } else {
      lines.push(`\\textbf{Bước 1: Xét hệ }\\left\\{v_{1},\\,v_{2}\\right\\}.\\\\[4pt]`);

      if (isZeroVector(vecs[0]) && isZeroVector(vecs[1])) {
        lines.push(`\\text{Vì }v_{1}=\\vec{0},\\;v_{2}=\\vec{0}\\text{ nên hệ phụ thuộc tuyến tính.}\\\\[10pt]`);
      } else if (isZeroVector(vecs[0])) {
        lines.push(`\\text{Vì }v_{1}=\\vec{0}\\text{ nên xét }\\left\\{v_{2}\\right\\}.\\;\\text{Do }v_{2}\\neq\\vec{0}\\text{ nên độc lập tuyến tính.}\\\\[10pt]`);
      } else if (isZeroVector(vecs[1])) {
        lines.push(`\\text{Vì }v_{2}=\\vec{0}\\text{ nên xét }\\left\\{v_{1}\\right\\}.\\;\\text{Do }v_{1}\\neq\\vec{0}\\text{ nên độc lập tuyến tính.}\\\\[10pt]`);
      } else {
        lines.push(
          `\\text{Vì }v_{1}\\text{ và }v_{2}\\text{ không tỉ lệ }\\,${ratioCheckLatex(vecs[0], vecs[1])}` +
          `\\text{ nên }\\left\\{v_{1},\\,v_{2}\\right\\}\\text{ độc lập tuyến tính.}\\\\[10pt]`
        );
      }

      for (let i = 2; i < m; i++) {
        const viName = `v_{${i + 1}}`;

        lines.push(`\\textbf{Bước ${i}: Kiểm tra }${viName}\\text{ có là tổ hợp tuyến tính của }v_{1},\\,v_{2}\\text{ không.}\\\\[4pt]`);
        lines.push(`\\text{Giả sử }${viName} = a\\cdot v_{1} + b\\cdot v_{2}.\\;\\text{Ta xét 2 thành phần đầu tiên:}\\\\[4pt]`);

        const a11 = fmtScalarLatex(vecs[0][0]);
        const a12 = fmtScalarLatex(vecs[1][0]);
        const b1 = fmtScalarLatex(vecs[i][0]);

        const a21 = fmtScalarLatex(vecs[0][1] ?? 0);
        const a22 = fmtScalarLatex(vecs[1][1] ?? 0);
        const b2 = fmtScalarLatex(vecs[i][1] ?? 0);

        lines.push(
          "\\left\\{\\begin{array}{l}\n" +
          `${a11}a + ${a12}b = ${b1}\\\\\n` +
          `${a21}a + ${a22}b = ${b2}\n` +
          "\\end{array}\\right.\\;\\Rightarrow\\;"
        );

        const B = [vecs[0], vecs[1]];
        const { coeffs, ok } = solveCoeffs(B, vecs[i]);
        const aVal = fmtCoeff(coeffs[0]);
        const bVal = fmtCoeff(coeffs[1]);

        lines.push(
          "\\left\\{\\begin{array}{l}\n" +
          `a = ${aVal}\\\\\n` +
          `b = ${bVal}\n` +
          "\\end{array}\\right.\\\\[6pt]"
        );

        if (ok) lines.push(`\\text{Vậy }${viName} = ${aVal}v_{1} + ${bVal}v_{2}.\\;\\text{Loại }${viName}\\text{ khỏi hệ sinh.}\\\\[10pt]`);
        else lines.push(`\\text{Vì không thỏa mãn nên }${viName}\\text{ độc lập tuyến tính với }v_{1},\\,v_{2}.\\\\[10pt]`);
      }
    }

    const basisLatex = basisFromApi.length
      ? `\\left\\{${basisFromApi.map(vecToLatex).join(",\\; ")}\\right\\}`
      : "\\left\\{\\;\\right\\}";

    lines.push("\\textbf{Kết luận.}\\\\[4pt]");
    lines.push(`\\bullet\\; \\text{Số chiều: }\\dim(V) = ${dim != null ? String(dim) : "?"}.\\\\[2pt]`);
    lines.push(`\\bullet\\; \\text{Một cơ sở là: } B = ${basisLatex}.`);

    return {
      titleText: "Cơ sở & số chiều trong",
      titleMath: `\\(\\mathbb{R}^{${n}}\\)`,

      eqLatexStep:
        "\\renewcommand{\\arraystretch}{1.25}\n" +
        "\\begin{array}{l}\n" +
        lines.join("\n") +
        "\n\\end{array}"
    };
  };

})();
