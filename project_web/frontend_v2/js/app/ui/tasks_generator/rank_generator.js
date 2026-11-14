// ==========================================================================
// FILE: frontend_v2/js/app/ui/tasks_generator/rank_generator.js
// MÔ TẢ: Bộ sinh lời giải chuẩn mực cho bài toán Hạng của hệ vector
// ==========================================================================
(function (root, factory) {
  const mod = factory();
  if (typeof window !== "undefined") {
    window.App = window.App || {};
    window.App.TasksGen = window.App.TasksGen || {};
    window.App.TasksGen.Rank = mod;
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

  function analyzeRank(selectedItemsOrVecs) {
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
    const pivotCols = colGauss.pivotCols.slice();
    const freeCols = colGauss.freeCols.slice();

    const maxSubsetSyms = pivotCols.map(function (cIdx) { return syms[cIdx]; });
    const maxSubsetDefsLatex = pivotCols.map(function (cIdx) {
      return syms[cIdx] + " = " + fmt.vecTupleLatex(vecs[cIdx]);
    });

    const nonZeroRefRows = [];
    for (let i = 0; i < rowGauss.refMatrix.length; i++) {
      if (!isZeroVec(rowGauss.refMatrix[i])) {
        nonZeroRefRows.push(rowGauss.refMatrix[i]);
      }
    }

    const redundantRelationsLatex = [];
    for (let fIdx = 0; fIdx < freeCols.length; fIdx++) {
      const fc = freeCols[fIdx];
      if (pivotCols.length === 0) {
        redundantRelationsLatex.push(syms[fc] + " = \\mathbf{0}");
      } else {
        const coeffs = pivotCols.map(function (_, rIdx) {
          return Number(colGauss.rrefMatrix[rIdx][fc] || 0);
        });
        redundantRelationsLatex.push(
          syms[fc] + " = " + fmt.linearCombLatex(coeffs, maxSubsetSyms, { zeroFallback: "\\mathbf{0}" })
        );
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
      pivotCols: pivotCols,
      freeCols: freeCols,
      maxSubsetSyms: maxSubsetSyms,
      maxSubsetDefsLatex: maxSubsetDefsLatex,
      nonZeroRefRows: nonZeroRefRows,
      redundantRelationsLatex: redundantRelationsLatex
    };
  }

  // Cách 1: Biến đổi sơ cấp ma trận dòng đưa về dạng bậc thang (REF)
  function buildMethodMatrix(data, selectedVectors) {
    const fmt = getFmt();
    const items = resolveInputItems(data, selectedVectors);
    const info = analyzeRank(items);
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

    html += "<div class=\"sol-bold\">Bước 1: Lập ma trận dòng \\(A\\)</div>";
    html += "<div class=\"sol-text\">Xếp các vector của hệ \\(S\\) thành các dòng của ma trận \\(A \\in \\mathbb{R}^{" + m + " \\times " + n + "}\\):</div>";
    const initMatTex = fmt.matrixToLatex(info.vecs, { bracket: "bmatrix" });
    html += fmt.mathBlockHtml("A = " + initMatTex);

    html += "<div class=\"sol-bold\">Bước 2: Khử Gauss đưa \\(A\\) về dạng bậc thang dòng (REF)</div>";
    html += "<div class=\"sol-text\">Các phép biến đổi sơ cấp trên dòng bảo toàn không gian dòng \\(\\operatorname{Row}(A) = \\operatorname{span}(S)\\) và giữ nguyên hạng:</div>";
    html += fmt.renderGaussChainHtml(initMatTex, info.rowGauss.steps, "Biến đổi dòng");

    const refTex = info.rowGauss.refMatrixLatex || fmt.matrixToLatex(info.rowGauss.refMatrix, { bracket: "bmatrix" });
    html += "<div class=\"sol-bold\">Bước 3: Đếm số dòng khác không và xác định hạng</div>";
    html += "<div class=\"sol-text\">Ma trận bậc thang \\(E\\) thu được là:</div>";
    html += fmt.mathBlockHtml("E = " + refTex);

    if (info.rowGauss.pivotCols.length > 0) {
      const pivCoords = info.rowGauss.pivotCols.map(function (c, rIdx) {
        return "(" + (rIdx + 1) + ",\\, " + (c + 1) + ")";
      }).join(",\\; ");
      html += "<div class=\"sol-text\">Vị trí các phần tử chốt trên \\(E\\): \\(" + pivCoords + "\\). Số dòng khác không của \\(E\\) bằng <b>" + info.rank + "</b>.</div>";
    } else {
      html += "<div class=\"sol-text\">Mọi dòng của \\(E\\) đều bằng \\(0\\) nên số dòng khác không bằng <b>0</b>.</div>";
    }

    html += "<div class=\"sol-bold\">Kết luận</div>";
    html += "<div class=\"sol-bullet\"><span>Hạng của hệ vector \\(S\\) và số chiều không gian sinh \\(\\operatorname{span}(S)\\) là:</span></div>";
    html += fmt.mathBlockHtml("\\operatorname{rank}(S) = \\operatorname{rank}(A) = \\dim\\operatorname{span}(S) = " + info.rank);

    return fmt.wrapStepContainer(html);
  }

  // Cách 2: Khử Gauss - Jordan trên ma trận cột & Hệ con độc lập tuyến tính cực đại
  function buildMethodMaximalSubset(data, selectedVectors) {
    const fmt = getFmt();
    const items = resolveInputItems(data, selectedVectors);
    const info = analyzeRank(items);
    const m = info.m;
    const n = info.n;

    if (m === 0) {
      return fmt.wrapStepContainer("<div class=\"sol-empty\">Chưa có vector nào được chọn.</div>");
    }

    let html = "";
    html += "<div class=\"sol-bold\">Bước 1: Lập ma trận cột \\(M = A^T\\)</div>";
    html += "<div class=\"sol-text\">Theo định nghĩa, hạng \\(\\operatorname{rank}(S)\\) bằng số phần tử của một tập con độc lập tuyến tính cực đại \\(B_{\\max} \\subseteq S\\). Để xác định chính xác các vector thuộc \\(B_{\\max}\\), ta xếp các vector thành các cột của ma trận \\(M \\in \\mathbb{R}^{" + n + " \\times " + m + "}\\):</div>";
    const colInitTex = fmt.matrixToLatex(info.colMat, { bracket: "bmatrix" });
    html += fmt.mathBlockHtml("M = \\begin{bmatrix} " + info.syms.join(" & ") + " \\end{bmatrix} = " + colInitTex);

    html += "<div class=\"sol-bold\">Bước 2: Đưa \\(M\\) về dạng bậc thang rút gọn (RREF)</div>";
    html += fmt.renderGaussChainHtml(colInitTex, info.colGauss.steps, "Biến đổi dòng");

    if (info.colGauss.steps.length > 0) {
      const colRrefTex = info.colGauss.rrefMatrixLatex || fmt.matrixToLatex(info.colGauss.rrefMatrix, { bracket: "bmatrix" });
      html += "<div class=\"sol-text\">Ma trận bậc thang rút gọn của \\(M\\) là:</div>";
      html += fmt.mathBlockHtml("\\operatorname{RREF}(M) = " + colRrefTex);
    }

    html += "<div class=\"sol-bold\">Bước 3: Trích hệ con độc lập tuyến tính cực đại \\(B_{\\max}\\)</div>";
    if (info.rank === 0) {
      html += "<div class=\"sol-text\">Ma trận \\(\\operatorname{RREF}(M)\\) bằng ma trận không, không có cột chốt nào. Tất cả vector trong \\(S\\) đều bằng \\(\\mathbf{0}\\).</div>";
      html += fmt.mathBlockHtml("B_{\\max} = \\varnothing,\\quad \\operatorname{span}(S) = \\left\\{\\mathbf{0}\\right\\}");
    } else {
      const pivHuman = info.pivotCols.map(function (c) { return String(c + 1); }).join(", ");
      html += "<div class=\"sol-text\">Các cột chứa phần tử chốt nằm tại cột <b>" + pivHuman + "</b>, tương ứng chính xác với tập con độc lập tuyến tính cực đại từ hệ gốc:</div>";
      html += fmt.mathBlockHtml("B_{\\max} = \\left\\{" + info.maxSubsetSyms.join(",\\; ") + "\\right\\} \\quad \\left(" + info.maxSubsetDefsLatex.join(",\\; ") + "\\right)");

      if (info.redundantRelationsLatex.length > 0) {
        html += "<div class=\"sol-text\">Các vector còn lại (ứng với cột không chốt) biểu diễn tuyến tính duy nhất qua \\(B_{\\max}\\) theo đúng các cột của \\(\\operatorname{RREF}(M)\\):</div>";
        html += fmt.mathBlockHtml(info.redundantRelationsLatex.join(",\\quad "));
      }
      html += "<div class=\"sol-text\">Suy ra \\(\\operatorname{span}(S) = \\operatorname{span}(B_{\\max})\\) và \\(\\dim\\operatorname{span}(S) = \\left|B_{\\max}\\right| = " + info.rank + "\\).</div>";
    }

    html += "<div class=\"sol-bold\">Kết luận</div>";
    html += "<div class=\"sol-bullet\"><span>Số lượng vector trong hệ con độc lập tuyến tính cực đại là \\(" + info.rank + "\\), vậy:</span></div>";
    html += fmt.mathBlockHtml("\\operatorname{rank}(S) = \\dim\\operatorname{span}(S) = " + info.rank);

    return fmt.wrapStepContainer(html);
  }

  function buildSolution(data, selectedVectors) {
    const items = resolveInputItems(data, selectedVectors);
    const info = analyzeRank(items);
    return {
      titleText: "Hạng của hệ vector",
      titleMath: "\\mathbb{R}^{" + info.n + "}",
      tab1Label: "Cách 1: Ma trận bậc thang",
      tab2Label: "Cách 2: Hệ độc lập cực đại",
      showSubTabs: false,
      analysis: info,
      content1: buildMethodMatrix(data, selectedVectors),
      content2: buildMethodMaximalSubset(data, selectedVectors)
    };
  }

  return {
    analyzeRank: analyzeRank,
    buildMethodMatrix: buildMethodMatrix,
    buildMethodMaximalSubset: buildMethodMaximalSubset,
    buildSolution: buildSolution
  };
});
