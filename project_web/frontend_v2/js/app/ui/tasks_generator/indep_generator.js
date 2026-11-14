// ==========================================================================
// FILE: frontend_v2/js/app/ui/tasks_generator/indep_generator.js
// MÔ TẢ: Bộ sinh lời giải chuẩn mực cho bài toán Độc lập - Phụ thuộc tuyến tính
// ==========================================================================
(function (root, factory) {
  const mod = factory();
  if (typeof window !== "undefined") {
    window.App = window.App || {};
    window.App.TasksGen = window.App.TasksGen || {};
    window.App.TasksGen.Indep = mod;
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

  function toNumVec(item) {
    const raw = item && Array.isArray(item.vec) ? item.vec : (Array.isArray(item) ? item : []);
    return raw.map(function (x) {
      const n = Number(x);
      return Number.isFinite(n) ? n : 0;
    });
  }

  function getVecSym(item, idx, fmt) {
    if (item && !Array.isArray(item)) {
      if (typeof window !== "undefined" && window.App && typeof window.App.getVectorName === "function") {
        return fmt.normalizeVecSymbol(window.App.getVectorName(item), true);
      }
      if (item.name) {
        return fmt.normalizeVecSymbol(item.name, true);
      }
    }
    return "\\mathbf{v}_{" + (idx + 1) + "}";
  }

  function isZeroVec(v) {
    for (let i = 0; i < v.length; i++) {
      if (Math.abs(Number(v[i]) || 0) > 1e-9) return false;
    }
    return true;
  }

  function resolveInputItems(data, selectedVectors) {
    if (Array.isArray(selectedVectors) && selectedVectors.length > 0) {
      return selectedVectors;
    }
    if (data && Array.isArray(data.vectors) && data.vectors.length > 0) {
      return data.vectors;
    }
    return [];
  }

  function formatParamHomogeneousLatex(rrefRes, m, varPrefix, fmt) {
    const pfx = varPrefix || "c";
    const pivotCols = rrefRes.pivotCols || [];
    const freeCols = rrefRes.freeCols || [];
    const R = rrefRes.rrefMatrix || [];

    const tSyms = freeCols.map(function (_, idx) {
      return freeCols.length === 1 ? "t" : "t_{" + (idx + 1) + "}";
    });

    const exprByVar = new Array(m).fill("0");
    for (let fIdx = 0; fIdx < freeCols.length; fIdx++) {
      exprByVar[freeCols[fIdx]] = tSyms[fIdx] + " \\in \\mathbb{R}";
    }

    for (let r = 0; r < pivotCols.length; r++) {
      const pCol = pivotCols[r];
      const coeffs = [];
      for (let fIdx = 0; fIdx < freeCols.length; fIdx++) {
        const fc = freeCols[fIdx];
        coeffs.push(-(R[r] ? Number(R[r][fc] || 0) : 0));
      }
      exprByVar[pCol] = fmt.linearCombLatex(coeffs, tSyms, { zeroFallback: "0" });
    }

    const lines = [];
    for (let j = 0; j < m; j++) {
      lines.push(pfx + "_{" + (j + 1) + "} &= " + exprByVar[j]);
    }
    return "\\left\\{\\begin{aligned} " + lines.join(" \\\\[3pt] ") + " \\end{aligned}\\right.";
  }

  function analyzeIndep(selectedItemsOrVecs) {
    const fmt = getFmt();
    const items = Array.isArray(selectedItemsOrVecs) ? selectedItemsOrVecs : [];
    const vecs = items.map(toNumVec);
    const m = vecs.length;
    const n = (vecs[0] && vecs[0].length) || 2;
    const syms = items.map(function (it, i) { return getVecSym(it, i, fmt); });

    const colMat = [];
    for (let r = 0; r < n; r++) {
      const row = [];
      for (let c = 0; c < m; c++) {
        row.push(vecs[c] && vecs[c][r] !== undefined ? vecs[c][r] : 0);
      }
      colMat.push(row);
    }

    const rowGauss = fmt.gaussRrefWithSteps(vecs, { mode: "ref", rowSymbol: "d", bracket: "bmatrix" });
    const colGauss = fmt.gaussRrefWithSteps(colMat, { mode: "rref", rowSymbol: "d", bracket: "bmatrix" });
    const rank = rowGauss.rank;
    const isIndependent = rank === m && m > 0;

    let zeroVecIndex = -1;
    for (let i = 0; i < m; i++) {
      if (isZeroVec(vecs[i])) {
        zeroVecIndex = i;
        break;
      }
    }

    let depCoeffs = null;
    let depRelationLatex = "";
    let depExpressLatex = "";

    if (!isIndependent && m > 0) {
      depCoeffs = (colGauss.nullspaceIntegerBasis && colGauss.nullspaceIntegerBasis[0])
        ? colGauss.nullspaceIntegerBasis[0].slice()
        : new Array(m).fill(0);

      let nonZeroCount = 0;
      let singleIdx = -1;
      for (let j = 0; j < depCoeffs.length; j++) {
        if (Math.abs(depCoeffs[j]) > 1e-9) {
          nonZeroCount++;
          singleIdx = j;
        }
      }

      if (nonZeroCount === 1 && singleIdx >= 0) {
        depRelationLatex = "1 \\cdot " + syms[singleIdx] + " = \\mathbf{0}";
        depExpressLatex = syms[singleIdx] + " = \\mathbf{0}";
      } else {
        depRelationLatex = fmt.linearCombLatex(depCoeffs, syms, { zeroFallback: "\\mathbf{0}" }) + " = \\mathbf{0}";
        if (colGauss.freeCols.length > 0 && colGauss.pivotCols.length > 0) {
          const fc = colGauss.freeCols[0];
          const pivSyms = colGauss.pivotCols.map(function (p) { return syms[p]; });
          const pivCoeffs = colGauss.pivotCols.map(function (_, rIdx) {
            return Number(colGauss.rrefMatrix[rIdx][fc] || 0);
          });
          depExpressLatex = syms[fc] + " = " + fmt.linearCombLatex(pivCoeffs, pivSyms, { zeroFallback: "\\mathbf{0}" });
        }
      }
    }

    return {
      vecs: vecs,
      syms: syms,
      m: m,
      n: n,
      colMat: colMat,
      rowGauss: rowGauss,
      colGauss: colGauss,
      rank: rank,
      isIndependent: isIndependent,
      zeroVecIndex: zeroVecIndex,
      overDimension: m > n,
      depCoeffs: depCoeffs,
      depRelationLatex: depRelationLatex,
      depExpressLatex: depExpressLatex
    };
  }

  // Cách 1: Phương pháp hạng của ma trận dòng (Khử Gauss)
  function buildMethodMatrix(data, selectedVectors) {
    const fmt = getFmt();
    const items = resolveInputItems(data, selectedVectors);
    const info = analyzeIndep(items);
    const m = info.m;
    const n = info.n;

    if (m === 0) {
      return fmt.wrapStepContainer("<div class=\"sol-empty\">Chưa có vector nào được chọn.</div>");
    }

    const vecDefs = info.vecs.map(function (v, i) {
      return info.syms[i] + " = " + fmt.vecTupleLatex(v);
    }).join(",\\quad ");

    let html = "";
    html += "<div class=\"sol-text\">Trong không gian \\(\\mathbb{R}^{" + n + "}\\), xét hệ \\(S = \\left\\{" + info.syms.join(",\\, ") + "\\right\\}\\) gồm \\(" + m + "\\) vector:</div>";
    html += fmt.mathBlockHtml(vecDefs);

    if (info.overDimension) {
      html += "<div class=\"sol-text\"><i>Nhận xét lý thuyết:</i> Số lượng vector \\(m = " + m + " > n = " + n + " = \\dim\\left(\\mathbb{R}^{" + n + "}\\right)\\), nên theo định lý cơ bản hệ \\(S\\) chắc chắn phụ thuộc tuyến tính. Ta thực hiện khử Gauss dưới đây để xác định chính xác hạng \\(\\operatorname{rank}(S)\\) và hệ thức phụ thuộc tường minh.</div>";
    }

    html += "<div class=\"sol-bold\">Bước 1: Lập ma trận dòng \\(A\\)</div>";
    html += "<div class=\"sol-text\">Xếp các vector của hệ \\(S\\) làm các dòng của ma trận \\(A \\in \\mathbb{R}^{" + m + " \\times " + n + "}\\):</div>";
    const initMatTex = fmt.matrixToLatex(info.vecs, { bracket: "bmatrix" });
    html += fmt.mathBlockHtml("A = " + initMatTex);

    html += "<div class=\"sol-bold\">Bước 2: Khử Gauss đưa ma trận về dạng bậc thang (REF)</div>";
    html += fmt.renderGaussChainHtml(initMatTex, info.rowGauss.steps, "Biến đổi dòng");

    const refTex = info.rowGauss.refMatrixLatex || fmt.matrixToLatex(info.rowGauss.refMatrix, { bracket: "bmatrix" });
    html += "<div class=\"sol-bold\">Bước 3: Xác định hạng và so sánh với số lượng vector</div>";
    html += "<div class=\"sol-text\">Dạng bậc thang dòng thu được là:</div>";
    html += fmt.mathBlockHtml("E = " + refTex);

    if (info.rowGauss.pivotCols.length > 0) {
      const pivCoords = info.rowGauss.pivotCols.map(function (c, rIdx) {
        return "(" + (rIdx + 1) + ",\\, " + (c + 1) + ")";
      }).join(",\\; ");
      html += "<div class=\"sol-text\">Các phần tử chốt nằm tại vị trí (dòng, cột): \\(" + pivCoords + "\\). Ma trận \\(E\\) có <b>" + info.rank + "</b> dòng khác không:</div>";
    } else {
      html += "<div class=\"sol-text\">Tất cả các dòng của \\(E\\) đều bằng \\(0\\), suy ra \\(\\operatorname{rank}(A) = 0\\):</div>";
    }
    html += fmt.mathBlockHtml("\\operatorname{rank}(S) = \\operatorname{rank}(A) = " + info.rank);

    html += "<div class=\"sol-bold\">Kết luận</div>";
    if (info.isIndependent) {
      html += "<div class=\"sol-bullet\"><span>Vì \\(\\operatorname{rank}(A) = " + info.rank + " = m\\) (hạng bằng đúng số vector của hệ), hệ \\(S\\) <b>độc lập tuyến tính</b>.</span></div>";
      html += "<div class=\"sol-bullet\"><span>Mọi tổ hợp tuyến tính bằng \\(\\mathbf{0}\\) đều kéo theo tất cả hệ số bằng \\(0\\).</span></div>";
    } else {
      html += "<div class=\"sol-bullet\"><span>Vì \\(\\operatorname{rank}(A) = " + info.rank + " < m = " + m + "\\), hệ \\(S\\) <b>phụ thuộc tuyến tính</b>.</span></div>";
      if (info.depRelationLatex) {
        html += "<div class=\"sol-bullet\"><span>Một hệ thức phụ thuộc tuyến tính không tầm thường giữa các vector trong \\(S\\) là:</span></div>";
        html += fmt.mathBlockHtml(info.depRelationLatex + (info.depExpressLatex ? "\\quad \\Longleftrightarrow \\quad " + info.depExpressLatex : ""));
      }
    }

    return fmt.wrapStepContainer(html);
  }

  // Cách 2: Phương pháp hệ phương trình tuyến tính thuần nhất
  function buildMethodEquation(data, selectedVectors) {
    const fmt = getFmt();
    const items = resolveInputItems(data, selectedVectors);
    const info = analyzeIndep(items);
    const m = info.m;
    const n = info.n;

    if (m === 0) {
      return fmt.wrapStepContainer("<div class=\"sol-empty\">Chưa có vector nào được chọn.</div>");
    }

    const cVecTerms = info.syms.map(function (s, i) {
      return "c_{" + (i + 1) + "}" + s;
    }).join(" + ");

    let html = "";
    html += "<div class=\"sol-bold\">Bước 1: Thiết lập phương trình vector theo định nghĩa</div>";
    html += "<div class=\"sol-text\">Xét phương trình tổ hợp tuyến tính thuần nhất với các ẩn vô hướng \\(c_1, \\dots, c_{" + m + "} \\in \\mathbb{R}\\):</div>";
    html += fmt.mathBlockHtml(cVecTerms + " = \\mathbf{0}");

    html += "<div class=\"sol-bold\">Bước 2: Lập hệ phương trình đại số và đưa về dạng RREF</div>";
    html += "<div class=\"sol-text\">Khai triển theo \\(" + n + "\\) tọa độ thành phần trong \\(\\mathbb{R}^{" + n + "}\\), ta có hệ phương trình thuần nhất:</div>";
    html += fmt.mathBlockHtml(fmt.systemLatex(info.colMat, new Array(n).fill(0), "c"));

    const augZero = info.colMat.map(function (row) {
      const r = row.slice();
      r.push(0);
      return r;
    });
    const augGauss = fmt.gaussRrefWithSteps(augZero, { mode: "rref", augCol: m, rowSymbol: "d", bracket: "bmatrix" });
    const augInitTex = fmt.matrixToLatex(augZero, { augCol: m, bracket: "bmatrix" });

    html += "<div class=\"sol-text\">Lập ma trận mở rộng \\(\\left[A^T \\;\\middle|\\; \\mathbf{0}\\right]\\) (với các cột là các vector \\(" + info.syms.join(",\\, ") + "\\)) và khử Gauss - Jordan:</div>";
    html += fmt.mathBlockHtml("\\left[A^T \\;\\middle|\\; \\mathbf{0}\\right] = " + augInitTex);
    html += fmt.renderGaussChainHtml(augInitTex, augGauss.steps, "Biến đổi dòng");

    html += "<div class=\"sol-bold\">Bước 3: Biện luận không gian nghiệm</div>";
    if (info.isIndependent) {
      const zeroChain = [];
      for (let j = 0; j < m; j++) zeroChain.push("c_{" + (j + 1) + "}");
      html += "<div class=\"sol-text\">Ma trận bậc thang rút gọn có đủ \\(" + m + "\\) cột chốt và không có ẩn tự do. Hệ chỉ có duy nhất nghiệm tầm thường:</div>";
      html += fmt.mathBlockHtml(zeroChain.join(" = ") + " = 0");
      html += "<div class=\"sol-bold\">Kết luận</div>";
      html += "<div class=\"sol-bullet\"><span>Theo định nghĩa, hệ vector \\(S\\) <b>độc lập tuyến tính</b>.</span></div>";
    } else {
      const freeSyms = info.colGauss.freeCols.map(function (fc) { return "c_{" + (fc + 1) + "}"; });
      html += "<div class=\"sol-text\">Hệ có \\(" + info.rank + " < " + m + "\\) cột chốt nên xuất hiện " + freeSyms.length + " ẩn tự do: \\(" + freeSyms.join(",\\; ") + "\\). Nghiệm tổng quát của hệ là:</div>";
      html += fmt.mathBlockHtml(formatParamHomogeneousLatex(info.colGauss, m, "c", fmt));

      if (info.depCoeffs) {
        const chosenTuple = info.depCoeffs.map(function (val, idx) {
          return "c_{" + (idx + 1) + "} = " + fmt.scalarToLatex(val);
        }).join(",\\; ");
        html += "<div class=\"sol-text\">Chọn một bộ giá trị tham số khác không để khử mẫu số, ta thu được nghiệm không tầm thường \\(" + chosenTuple + "\\), thỏa mãn:</div>";
        html += fmt.mathBlockHtml(info.depRelationLatex);
      }

      html += "<div class=\"sol-bold\">Kết luận</div>";
      html += "<div class=\"sol-bullet\"><span>Vì phương trình \\(" + cVecTerms + " = \\mathbf{0}\\) tồn tại nghiệm không tầm thường nên hệ \\(S\\) <b>phụ thuộc tuyến tính</b> theo định nghĩa.</span></div>";
    }

    return fmt.wrapStepContainer(html);
  }

  function buildSolution(data, selectedVectors) {
    const items = resolveInputItems(data, selectedVectors);
    const info = analyzeIndep(items);
    return {
      titleText: "Khảo sát độc lập và phụ thuộc tuyến tính",
      titleMath: "\\mathbb{R}^{" + info.n + "}",
      tab1Label: "Cách 1: Khử Gauss ma trận dòng",
      tab2Label: "Cách 2: Hệ phương trình thuần nhất",
      showSubTabs: false,
      analysis: info,
      content1: buildMethodMatrix(data, selectedVectors),
      content2: buildMethodEquation(data, selectedVectors)
    };
  }

  return {
    analyzeIndep: analyzeIndep,
    buildMethodMatrix: buildMethodMatrix,
    buildMethodEquation: buildMethodEquation,
    buildSolution: buildSolution
  };
});
