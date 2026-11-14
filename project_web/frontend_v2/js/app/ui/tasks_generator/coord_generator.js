// ===================== coord_generator.js (UNIFIED ACADEMIC PROOF ENGINE) =====================
(function (root, factory) {
  const mod = factory();
  if (typeof window !== "undefined") {
    window.App = window.App || {};
    window.App.TasksGen = window.App.TasksGen || {};
    window.App.TasksGen.Coord = mod;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = mod;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function getFmt() {
    if (typeof window !== "undefined" && window.App && window.App.LatexFmt) {
      return window.App.LatexFmt;
    }
    if (typeof require === "function") {
      try {
        return require("../../../utils/latex_format.js");
      } catch (_) {}
    }
    return null;
  }

  function toNumArray(v) {
    if (!Array.isArray(v)) return [];
    return v.map(function (x) {
      const n = Number(x);
      return Number.isFinite(n) ? n : 0;
    });
  }

  function analyzeCoordinates(basisVecsRaw, targetVecRaw) {
    const fmt = getFmt();
    const basisVecs = (Array.isArray(basisVecsRaw) ? basisVecsRaw : []).map(toNumArray);
    const targetVec = toNumArray(targetVecRaw);
    const m = basisVecs.length;
    const n = targetVec.length || (basisVecs[0] ? basisVecs[0].length : 2);

    if (m === 0 || n === 0) {
      return {
        solvable: false,
        reason: "empty",
        error: "Chưa chọn đủ dữ liệu vector.",
        n: n,
        m: m,
        P: [],
        augMat: [],
        pGauss: null,
        augGauss: null,
        coeffs: null
      };
    }

    const P = [];
    const augMat = [];
    for (let r = 0; r < n; r++) {
      const rowP = [];
      for (let c = 0; c < m; c++) {
        rowP.push(basisVecs[c] && basisVecs[c][r] !== undefined ? basisVecs[c][r] : 0);
      }
      P.push(rowP);
      const rowAug = rowP.slice();
      rowAug.push(targetVec[r] !== undefined ? targetVec[r] : 0);
      augMat.push(rowAug);
    }

    const pGauss = fmt.gaussRrefWithSteps(P, { mode: "rref", rowSymbol: "d", bracket: "bmatrix" });
    const augGauss = fmt.gaussRrefWithSteps(augMat, { mode: "rref", augCol: m, rowSymbol: "d", bracket: "bmatrix" });

    const basisIndependent = pGauss.rank === m;
    const inSpan = augGauss.isConsistent;

    if (!inSpan) {
      const extraNote = !basisIndependent
        ? " Đồng thời hệ B phụ thuộc tuyến tính (hạng " + pGauss.rank + " < " + m + ")."
        : "";
      return {
        solvable: false,
        reason: "inconsistent",
        error: "Vector đích không nằm trong không gian con span(B) nên hệ phương trình vô nghiệm." + extraNote,
        n: n,
        m: m,
        P: P,
        augMat: augMat,
        pGauss: pGauss,
        augGauss: augGauss,
        basisIndependent: basisIndependent,
        inSpan: false,
        coeffs: null
      };
    }

    if (!basisIndependent) {
      return {
        solvable: false,
        reason: "dependent_basis",
        error: "Hệ vector B phụ thuộc tuyến tính (hạng " + pGauss.rank + " < " + m + ") nên không tạo thành cơ sở và bộ hệ số biểu diễn không duy nhất.",
        n: n,
        m: m,
        P: P,
        augMat: augMat,
        pGauss: pGauss,
        augGauss: augGauss,
        basisIndependent: false,
        inSpan: true,
        coeffs: null
      };
    }

    return {
      solvable: true,
      reason: "ok",
      error: "",
      n: n,
      m: m,
      P: P,
      augMat: augMat,
      pGauss: pGauss,
      augGauss: augGauss,
      basisIndependent: true,
      inSpan: true,
      coeffs: augGauss.particularSol ? augGauss.particularSol.slice() : new Array(m).fill(0)
    };
  }

  function resolveSymbols(m, opts, fmt) {
    const options = opts || {};
    const basisSyms = [];
    for (let i = 0; i < m; i++) {
      if (options.basisSymbols && options.basisSymbols[i]) {
        basisSyms.push(fmt.normalizeVecSymbol(options.basisSymbols[i], true));
      } else {
        basisSyms.push("\\mathbf{u}_{" + (i + 1) + "}");
      }
    }
    const targetSym = options.targetSymbol
      ? fmt.normalizeVecSymbol(options.targetSymbol, true)
      : "\\mathbf{x}";
    return { basisSyms: basisSyms, targetSym: targetSym };
  }

  // Cách 1: Lập phương trình vector & Giải hệ phương trình tuyến tính
  function buildMethod1(basisVecs, targetVec, basisLatex, targetLatex, opts) {
    const fmt = getFmt();
    const info = analyzeCoordinates(basisVecs, targetVec);
    const n = info.n;
    const m = info.m;
    const syms = resolveSymbols(m, opts, fmt);
    const bDisplay = Array.isArray(basisLatex) && basisLatex.length === m ? basisLatex : basisVecs;
    const tDisplay = Array.isArray(targetLatex) && targetLatex.length === n ? targetLatex : targetVec;

    let html = "";

    const defsTex = bDisplay.map(function (v, i) {
      return syms.basisSyms[i] + " = " + fmt.vecTupleLatex(v, { colMode: true, bracket: "bmatrix" });
    }).join(",\\quad ");

    html += "<div class=\"sol-text\">Trong không gian \\(\\mathbb{R}^{" + n + "}\\), xét họ vector \\(B = \\left(" + syms.basisSyms.join(",\\, ") + "\\right)\\) và vector đích \\(" + syms.targetSym + "\\):</div>";
    html += fmt.mathBlockHtml(defsTex + ",\\quad " + syms.targetSym + " = " + fmt.vecTupleLatex(tDisplay, { colMode: true, bracket: "bmatrix" }));

    html += "<div class=\"sol-bold\">Bước 1: Thiết lập phương trình vector và hệ phương trình đại số</div>";
    const cSyms = syms.basisSyms.map(function (s, i) { return "c_{" + (i + 1) + "}" + s; });
    html += "<div class=\"sol-text\">Giả sử \\(" + syms.targetSym + "\\) biểu diễn tuyến tính qua họ \\(B\\) với các hệ số vô hướng \\(c_1, \\dots, c_{" + m + "} \\in \\mathbb{R}\\):</div>";
    html += fmt.mathBlockHtml(cSyms.join(" + ") + " = " + syms.targetSym);

    html += "<div class=\"sol-text\">Đồng nhất từng tọa độ thành phần, ta thu được hệ \\(" + n + "\\) phương trình tuyến tính gồm \\(" + m + "\\) ẩn số:</div>";
    html += fmt.mathBlockHtml(fmt.systemLatex(info.P, targetVec, "c"));

    html += "<div class=\"sol-bold\">Bước 2: Giải hệ phương trình bằng khử Gauss - Jordan</div>";
    const augInitTex = fmt.matrixToLatex(info.augMat, { augCol: m, bracket: "bmatrix" });
    const augRrefTex = info.augGauss.rrefMatrixLatex || fmt.matrixToLatex(info.augGauss.rrefMatrix, { augCol: m, bracket: "bmatrix" });
    html += "<div class=\"sol-text\">Đưa ma trận bổ rộng của hệ về dạng bậc thang rút gọn (RREF):</div>";
    html += fmt.mathBlockHtml(augInitTex + " \\;\\xrightarrow{\\text{RREF}}\\; " + augRrefTex);

    if (info.solvable) {
      const solPairs = info.coeffs.map(function (c, i) {
        return "c_{" + (i + 1) + "} = " + fmt.scalarToLatex(c);
      }).join(",\\quad ");
      const comboVerify = fmt.linearCombLatex(info.coeffs, syms.basisSyms, { zeroFallback: "\\mathbf{0}" });

      html += "<div class=\"sol-text\">Hệ phương trình tương thích và có duy nhất \\(" + m + "\\) cột chốt (\\(\\operatorname{rank}(P) = " + m + "\\)), suy ra bộ hệ số duy nhất:</div>";
      html += fmt.mathBlockHtml(solPairs);
      html += "<div class=\"sol-text\">Kiểm chứng khai triển tổ hợp tuyến tính:</div>";
      html += fmt.mathBlockHtml(syms.targetSym + " = " + comboVerify);

      html += "<div class=\"sol-bold\">Kết luận</div>";
      const spaceName = m === n ? "\\mathbb{R}^{" + n + "}" : "\\operatorname{span}(B)";
      html += "<div class=\"sol-bullet\"><span>Họ \\(B\\) là cơ sở hợp lệ của \\(" + spaceName + "\\) và tọa độ của \\(" + syms.targetSym + "\\) đối với cơ sở \\(B\\) là:</span></div>";
      html += fmt.mathBlockHtml("\\left[" + syms.targetSym + "\\right]_{B} = " + fmt.vecTupleLatex(info.coeffs, { colMode: true, bracket: "bmatrix" }));
    } else if (info.reason === "inconsistent") {
      const badRowIdx = info.augGauss.inconsistentRow >= 0 ? info.augGauss.inconsistentRow : (n - 1);
      const rhsVal = fmt.scalarToLatex(info.augGauss.rrefMatrix[badRowIdx][m]);
      const zerosLeft = new Array(m).fill("0").join(" & ");
      html += "<div class=\"sol-text\">Tại dòng thứ <b>" + (badRowIdx + 1) + "</b> của ma trận bậc thang rút gọn xuất hiện phương trình mâu thuẫn:</div>";
      html += fmt.mathBlockHtml("\\left[\\begin{array}{" + "c".repeat(m) + "|c} " + zerosLeft + " & " + rhsVal + " \\end{array}\\right] \\;\\Longleftrightarrow\\; 0 = " + rhsVal + " \\neq 0");
      html += "<div class=\"sol-bold\">Kết luận</div>";
      html += "<div class=\"sol-bullet\"><span>Theo định lý Kronecker - Capelli, \\(\\operatorname{rank}(P) = " + info.pGauss.rank + " < \\operatorname{rank}\\left([P \\mid " + syms.targetSym + "]\\right) = " + (info.pGauss.rank + 1) + "\\) nên hệ phương trình <b>vô nghiệm</b>.</span></div>";
      html += "<div class=\"sol-bullet\"><span>Vector \\(" + syms.targetSym + " \\notin \\operatorname{span}(B)\\), do đó không tồn tại tọa độ \\(\\left[" + syms.targetSym + "\\right]_B\\).</span></div>";
    } else {
      const depVec = info.pGauss.nullspaceIntegerBasis[0] || new Array(m).fill(1);
      const depRel = fmt.linearCombLatex(depVec, syms.basisSyms, { zeroFallback: "\\mathbf{0}" });
      html += "<div class=\"sol-text\">Ta có \\(\\operatorname{rank}(P) = " + info.pGauss.rank + " < " + m + "\\), hệ xuất hiện ẩn tự do nên có vô số bộ hệ số biểu diễn \\(" + syms.targetSym + "\\). Cụ thể, các vector trong \\(B\\) phụ thuộc tuyến tính theo hệ thức:</div>";
      html += fmt.mathBlockHtml(depRel + " = \\mathbf{0}");
      html += "<div class=\"sol-bold\">Kết luận</div>";
      html += "<div class=\"sol-bullet\"><span>Vì \\(B\\) phụ thuộc tuyến tính nên \\(B\\) <b>không tạo thành một cơ sở</b>; tọa độ \\(\\left[" + syms.targetSym + "\\right]_B\\) không xác định duy nhất.</span></div>";
    }

    return fmt.wrapStepContainer(html);
  }

  // Cách 2: Ma trận chuyển cơ sở & Khử Gauss-Jordan từng bước
  function buildMethod2(basisVecs, targetVec, basisLatex, targetLatex, opts) {
    const fmt = getFmt();
    const info = analyzeCoordinates(basisVecs, targetVec);
    const n = info.n;
    const m = info.m;
    const syms = resolveSymbols(m, opts, fmt);

    let html = "";
    html += "<div class=\"sol-bold\">Bước 1: Lập ma trận cơ sở \\(P\\)</div>";
    html += "<div class=\"sol-text\">Xếp các vector của \\(B = \\left(" + syms.basisSyms.join(",\\, ") + "\\right)\\) thành các cột của ma trận \\(P \\in \\mathbb{R}^{" + n + " \\times " + m + "}\\):</div>";
    html += fmt.mathBlockHtml("P = \\begin{bmatrix} " + syms.basisSyms.join(" & ") + " \\end{bmatrix} = " + fmt.matrixToLatex(info.P, { bracket: "bmatrix" }));

    if (m === n) {
      const detTex = info.pGauss.detLatex || fmt.scalarToLatex(info.pGauss.det || 0);
      if (info.basisIndependent) {
        html += "<div class=\"sol-text\">Định thức ma trận chuyển cơ sở \\(\\det(P) = " + detTex + " \\neq 0\\), nên \\(P\\) khả nghịch và \\(\\left[" + syms.targetSym + "\\right]_B = P^{-1}" + syms.targetSym + "\\).</div>";
      } else {
        html += "<div class=\"sol-text\">Định thức \\(\\det(P) = " + detTex + " = 0\\), nên \\(P\\) suy biến (không khả nghịch) và \\(B\\) không phải là cơ sở của \\(\\mathbb{R}^{" + n + "}\\).</div>";
      }
    } else {
      html += "<div class=\"sol-text\">Ta xét ma trận mở rộng \\(\\left[P \\;\\middle|\\; " + syms.targetSym + "\\right]\\) và thực hiện phép khử Gauss - Jordan để đồng thời kiểm tra tính độc lập của \\(B\\) và tìm tọa độ.</div>";
    }

    html += "<div class=\"sol-bold\">Bước 2: Biến đổi sơ cấp trên dòng ma trận mở rộng \\(\\left[P \\;\\middle|\\; " + syms.targetSym + "\\right]\\)</div>";
    const augInitTex = fmt.matrixToLatex(info.augMat, { augCol: m, bracket: "bmatrix" });
    html += "<div class=\"sol-text\">Thiết lập ma trận ghép ban đầu:</div>";
    html += fmt.mathBlockHtml("\\left[P \\;\\middle|\\; " + syms.targetSym + "\\right] = " + augInitTex);
    html += fmt.renderGaussChainHtml(augInitTex, info.augGauss.steps, "Biến đổi dòng");

    html += "<div class=\"sol-bold\">Kết luận</div>";
    if (info.solvable) {
      if (m === n) {
        html += "<div class=\"sol-bullet\"><span>Khối bên trái đã thu về ma trận đơn vị \\(I_{" + n + "}\\), nên cột bên phải chính là vector tọa độ \\(\\left[" + syms.targetSym + "\\right]_B = P^{-1}" + syms.targetSym + "\\):</span></div>";
      } else {
        html += "<div class=\"sol-bullet\"><span>\\(" + m + "\\) dòng đầu tạo thành khối đơn vị \\(I_{" + m + "}\\) và các dòng còn lại bằng \\(0\\), suy ra tọa độ duy nhất của \\(" + syms.targetSym + "\\) trên không gian con \\(\\operatorname{span}(B)\\) là:</span></div>";
      }
      html += fmt.mathBlockHtml("\\left[" + syms.targetSym + "\\right]_{B} = " + fmt.vecTupleLatex(info.coeffs, { colMode: true, bracket: "bmatrix" }));
    } else if (info.reason === "inconsistent") {
      html += "<div class=\"sol-bullet\"><span>Quá trình khử Gauss - Jordan xuất hiện dòng mâu thuẫn \\(\\left[0 \\;\\dots\\; 0 \\;\\middle|\\; d \\neq 0\\right]\\), chứng tỏ \\(" + syms.targetSym + " \\notin \\operatorname{span}(B)\\). Không tồn tại tọa độ \\(\\left[" + syms.targetSym + "\\right]_B\\).</span></div>";
    } else {
      html += "<div class=\"sol-bullet\"><span>Khối bên trái không thể đưa về \\(I_{" + m + "}\\) do \\(\\operatorname{rank}(P) = " + info.pGauss.rank + " < " + m + "\\). Họ \\(B\\) phụ thuộc tuyến tính nên không phải là một cơ sở.</span></div>";
    }

    return fmt.wrapStepContainer(html);
  }

  function buildSolution(basisVecs, targetVec, basisLatex, targetLatex, opts) {
    const info = analyzeCoordinates(basisVecs, targetVec);
    return {
      titleText: "Tọa độ của vector theo cơ sở",
      titleMath: "\\mathbb{R}^{" + info.n + "}",
      tab1Label: "Cách 1: Lập hệ phương trình",
      tab2Label: "Cách 2: Ma trận chuyển cơ sở",
      showSubTabs: false,
      solvable: info.solvable,
      coeffs: info.coeffs,
      analysis: info,
      content1: buildMethod1(basisVecs, targetVec, basisLatex, targetLatex, opts),
      content2: buildMethod2(basisVecs, targetVec, basisLatex, targetLatex, opts)
    };
  }

  return {
    analyzeCoordinates: analyzeCoordinates,
    buildMethod1: buildMethod1,
    buildMethod2: buildMethod2,
    buildSolution: buildSolution
  };
});
