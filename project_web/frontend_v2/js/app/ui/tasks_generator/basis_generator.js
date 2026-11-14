// ===================== basis_generator.js (UNIFIED ACADEMIC PROOF ENGINE) =====================
(function (root, factory) {
  const mod = factory();
  if (typeof window !== "undefined") {
    window.App = window.App || {};
    window.App.TasksGen = window.App.TasksGen || {};
    window.App.TasksGen.Basis = mod;
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
    if (item && typeof window !== "undefined" && window.App && typeof window.App.getVectorName === "function") {
      return fmt.normalizeVecSymbol(window.App.getVectorName(item), true);
    }
    if (item && item.name) {
      return fmt.normalizeVecSymbol(item.name, true);
    }
    return "\\mathbf{v}_{" + (idx + 1) + "}";
  }

  function isZeroVec(v) {
    if (!Array.isArray(v) || v.length === 0) return true;
    for (let i = 0; i < v.length; i++) {
      if (Math.abs(Number(v[i]) || 0) > 1e-9) return false;
    }
    return true;
  }

  function buildColumnMatrix(vecs, n) {
    const m = vecs.length;
    const M = [];
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < m; j++) {
        row.push(Number(vecs[j][i] || 0));
      }
      M.push(row);
    }
    return M;
  }

  function formatParamSolutionLatex(rrefRes, m, varPrefix, fmt) {
    const pfx = varPrefix || "k";
    const pivotCols = rrefRes.pivotCols || [];
    const freeCols = rrefRes.freeCols || [];
    const R = rrefRes.rrefMatrix || [];

    if (freeCols.length === 0) {
      const zeroParts = [];
      for (let j = 0; j < m; j++) {
        zeroParts.push(pfx + "_{" + (j + 1) + "}");
      }
      return zeroParts.join(" = ") + " = 0";
    }

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

  // Cách 1: Ma trận dòng & Khử Gauss (hỗ trợ Virtual Recycler qua htmlHeader / htmlSteps / htmlFooter)
  function buildBasisByMatrix(selectedItems, apiData) {
    const fmt = getFmt();
    const items = Array.isArray(selectedItems) ? selectedItems : [];
    const vecs = items.map(toNumVec);
    const m = vecs.length;
    const n = (vecs[0] && vecs[0].length) || 2;
    const syms = items.map(function (it, i) { return getVecSym(it, i, fmt); });

    const rowGauss = fmt.gaussRrefWithSteps(vecs, { mode: "ref", rowSymbol: "d", bracket: "bmatrix" });
    const colGauss = fmt.gaussRrefWithSteps(buildColumnMatrix(vecs, n), { mode: "rref", rowSymbol: "d", bracket: "bmatrix" });
    const dim = typeof apiData?.dimension === "number" ? apiData.dimension : rowGauss.rank;

    const vecDefsLatex = vecs.map(function (v, i) {
      return syms[i] + " = " + fmt.vecTupleLatex(v);
    }).join(",\\quad ");

    const stepChunks = [];
    if (rowGauss.steps.length === 0) {
      stepChunks.push(
        "<div class=\"sol-text\">Ma trận \\(A\\) đã ở sẵn dạng bậc thang dòng, không cần thực hiện thêm phép biến đổi sơ cấp.</div>"
      );
    } else {
      let prevTex = fmt.matrixToLatex(vecs, { bracket: "bmatrix" });
      for (let i = 0; i < rowGauss.steps.length; i++) {
        const st = rowGauss.steps[i];
        stepChunks.push(
          "<div style=\"margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px dashed var(--border-subtle);\">" +
            "<div class=\"sol-text\"><b>Bước biến đổi " + (i + 1) + ":</b> Thực hiện \\(" + st.opLatex + "\\):</div>" +
            "<div class=\"sol-math-block\">\\[" + prevTex + " \\;\\longrightarrow\\; " + st.matrixLatex + "\\]</div>" +
          "</div>"
        );
        prevTex = st.matrixLatex;
      }
    }

    const nonZeroRefRows = [];
    for (let i = 0; i < rowGauss.refMatrix.length; i++) {
      if (!isZeroVec(rowGauss.refMatrix[i])) {
        nonZeroRefRows.push(rowGauss.refMatrix[i]);
      }
    }

    const refBasisTex = nonZeroRefRows.length > 0
      ? "\\left\\{ " + nonZeroRefRows.map(function (r) { return fmt.vecTupleLatex(r); }).join(",\\; ") + " \\right\\}"
      : "\\varnothing";

    const origPivotSyms = colGauss.pivotCols.map(function (cIdx) { return syms[cIdx]; });
    const origPivotVecs = colGauss.pivotCols.map(function (cIdx) {
      return syms[cIdx] + " = " + fmt.vecTupleLatex(vecs[cIdx]);
    });

    const htmlHeader =
      "<div class=\"sol-text\">Trong không gian \\(\\mathbb{R}^{" + n + "}\\), xét không gian con \\(V = \\operatorname{span}\\left\\{" + syms.join(",\\, ") + "\\right\\}\\) sinh bởi hệ gồm \\(" + m + "\\) vector:</div>" +
      fmt.mathBlockHtml(vecDefsLatex) +
      "<div class=\"sol-bold\">Bước 1: Lập ma trận dòng và khử Gauss</div>" +
      "<div class=\"sol-text\">Xếp các vector theo thứ tự thành các dòng của ma trận \\(A \\in \\mathbb{R}^{" + m + " \\times " + n + "}\\):</div>" +
      fmt.mathBlockHtml("A = " + fmt.matrixToLatex(vecs, { bracket: "bmatrix" })) +
      "<div class=\"sol-text\">Áp dụng các phép biến đổi sơ cấp trên dòng để đưa \\(A\\) về dạng bậc thang \\(E\\) (không làm thay đổi không gian dòng \\(\\operatorname{Row}(A) = V\\)):</div>";

    let htmlFooter =
      "<div class=\"sol-bold\">Bước 2: Đọc ma trận bậc thang và kết luận cơ sở</div>" +
      "<div class=\"sol-text\">Ma trận bậc thang \\(E\\) thu được có <b>" + dim + "</b> dòng khác không:</div>" +
      fmt.mathBlockHtml("E = " + (rowGauss.refMatrixLatex || fmt.matrixToLatex(rowGauss.refMatrix, { bracket: "bmatrix" }))) +
      "<div class=\"sol-bullet\"><span>Số chiều của không gian con: \\(\\dim(V) = \\operatorname{rank}(A) = " + dim + "\\).</span></div>";

    if (dim === 0) {
      htmlFooter +=
        "<div class=\"sol-bullet\"><span>Mọi vector trong hệ sinh đều bằng \\(\\mathbf{0}\\), do đó \\(V = \\{\\mathbf{0}\\}\\) và hệ cơ sở là tập rỗng \\(B = \\varnothing\\).</span></div>";
    } else {
      htmlFooter +=
        "<div class=\"sol-bullet\"><span>Các dòng khác không của \\(E\\) tạo thành một cơ sở rút gọn của \\(V\\):</span></div>" +
        fmt.mathBlockHtml("B_{\\text{REF}} = " + refBasisTex) +
        "<div class=\"sol-bullet\"><span>Tương ứng trên hệ vector gốc ban đầu, cơ sở trích trực tiếp từ các vector độc lập tuyến tính là \\(B = \\left\\{" + origPivotSyms.join(",\\; ") + "\\right\\}\\):</span></div>" +
        fmt.mathBlockHtml(origPivotVecs.join(",\\quad "));
    }

    const fullHtml = fmt.wrapStepContainer(htmlHeader + stepChunks.join("") + htmlFooter);

    return {
      titleText: "Cơ sở và số chiều",
      titleMath: "\\mathbb{R}^{" + n + "}",
      dimension: dim,
      htmlHeader: htmlHeader,
      htmlSteps: stepChunks,
      htmlFooter: htmlFooter,
      htmlContent: fullHtml,
      basisVectors: nonZeroRefRows,
      pivotIndices: colGauss.pivotCols.slice()
    };
  }

  // Cách 2A: Hệ phương trình thuần nhất tổng quát
  function buildBasisByEquationsGeneral(selectedItems, apiData) {
    const fmt = getFmt();
    const items = Array.isArray(selectedItems) ? selectedItems : [];
    const vecs = items.map(toNumVec);
    const m = vecs.length;
    const n = (vecs[0] && vecs[0].length) || 2;
    const syms = items.map(function (it, i) { return getVecSym(it, i, fmt); });

    const colMat = buildColumnMatrix(vecs, n);
    const colGauss = fmt.gaussRrefWithSteps(colMat, { mode: "rref", rowSymbol: "d", bracket: "bmatrix" });
    const dim = typeof apiData?.dimension === "number" ? apiData.dimension : colGauss.rank;

    const kTerms = syms.map(function (s, i) { return "k_{" + (i + 1) + "}" + s; }).join(" + ");
    const sysLatex = fmt.systemLatex(colMat, new Array(n).fill(0), "k");
    const paramSolLatex = formatParamSolutionLatex(colGauss, m, "k", fmt);

    let html = "";
    html += "<div class=\"sol-text\">Xét không gian con \\(V = \\operatorname{span}\\left\\{" + syms.join(",\\, ") + "\\right\\} \\subseteq \\mathbb{R}^{" + n + "}\\). Ta tìm tập con độc lập tuyến tính cực đại từ hệ sinh bằng phương pháp giải hệ phương trình thuần nhất.</div>";

    html += "<div class=\"sol-bold\">Bước 1: Thiết lập phương trình vector và hệ phương trình thành phần</div>";
    html += "<div class=\"sol-text\">Xét tổ hợp tuyến tính bằng vector không với các ẩn số \\(k_1, \\dots, k_{" + m + "} \\in \\mathbb{R}\\):</div>";
    html += fmt.mathBlockHtml(kTerms + " = \\mathbf{0}");
    html += "<div class=\"sol-text\">Khai triển theo \\(" + n + "\\) tọa độ thành phần, ta thu được hệ phương trình tuyến tính thuần nhất:</div>";
    html += fmt.mathBlockHtml(sysLatex);

    html += "<div class=\"sol-bold\">Bước 2: Đưa ma trận cột về dạng bậc thang rút gọn (RREF)</div>";
    html += "<div class=\"sol-text\">Lập ma trận hệ số \\(M = \\begin{bmatrix} " + syms.join(" & ") + " \\end{bmatrix} \\in \\mathbb{R}^{" + n + " \\times " + m + "}\\) và thực hiện phép khử Gauss - Jordan:</div>";
    html += fmt.mathBlockHtml("M = " + fmt.matrixToLatex(colMat, { bracket: "bmatrix" }));
    html += fmt.renderGaussChainHtml(fmt.matrixToLatex(colMat, { bracket: "bmatrix" }), colGauss.steps, "Biến đổi dòng");

    if (colGauss.steps.length > 0) {
      html += "<div class=\"sol-text\">Dạng bậc thang rút gọn thu được là:</div>";
      html += fmt.mathBlockHtml("\\operatorname{RREF}(M) = " + (colGauss.rrefMatrixLatex || fmt.matrixToLatex(colGauss.rrefMatrix, { bracket: "bmatrix" })));
    }

    html += "<div class=\"sol-text\">Từ ma trận bậc thang rút gọn, hệ phương trình có nghiệm tổng quát:</div>";
    html += fmt.mathBlockHtml(paramSolLatex);

    html += "<div class=\"sol-bold\">Bước 3: Xác định cột chốt và kết luận cơ sở</div>";
    if (dim === 0) {
      html += "<div class=\"sol-text\">Ma trận không có cột chốt nào (mọi ẩn \\(k_j\\) đều là ẩn tự do), suy ra mọi vector trong hệ đều bằng \\(\\mathbf{0}\\).</div>";
      html += "<div class=\"sol-bullet\"><span>Số chiều: \\(\\dim(V) = 0\\), cơ sở \\(B = \\varnothing\\).</span></div>";
    } else {
      const pivColsHuman = colGauss.pivotCols.map(function (c) { return String(c + 1); }).join(", ");
      const basisSyms = colGauss.pivotCols.map(function (c) { return syms[c]; });
      const basisDefs = colGauss.pivotCols.map(function (c) {
        return syms[c] + " = " + fmt.vecTupleLatex(vecs[c]);
      });

      if (colGauss.freeCols.length === 0) {
        html += "<div class=\"sol-text\">Hệ chỉ có nghiệm tầm thường duy nhất nên cả \\(" + m + "\\) vector đã cho độc lập tuyến tính và lập thành cơ sở của \\(V\\).</div>";
      } else {
        const depNotes = colGauss.freeCols.map(function (fc) {
          const exprCoeffs = [];
          for (let r = 0; r < colGauss.pivotCols.length; r++) {
            exprCoeffs.push(Number(colGauss.rrefMatrix[r][fc] || 0));
          }
          return syms[fc] + " = " + fmt.linearCombLatex(exprCoeffs, basisSyms, { zeroFallback: "\\mathbf{0}" });
        });
        html += "<div class=\"sol-text\">Các cột chốt nằm tại vị trí cột <b>" + pivColsHuman + "</b>. Các cột không chốt biểu diễn tuyến tính qua các cột chốt theo hệ thức:</div>";
        html += fmt.mathBlockHtml(depNotes.join(",\\quad "));
      }

      html += "<div class=\"sol-bullet\"><span>Số chiều của không gian con: \\(\\dim(V) = " + dim + "\\).</span></div>";
      html += "<div class=\"sol-bullet\"><span>Cơ sở trích từ hệ sinh ban đầu là \\(B = \\left\\{" + basisSyms.join(",\\; ") + "\\right\\}\\):</span></div>";
      html += fmt.mathBlockHtml(basisDefs.join(",\\quad "));
    }

    return {
      titleText: "Cơ sở và số chiều",
      titleMath: "\\mathbb{R}^{" + n + "}",
      htmlContent: fmt.wrapStepContainer(html)
    };
  }

  // Cách 2B: Sàng lọc từng vector từ trái sang phải
  function buildBasisByEquationsStepwise(selectedItems, apiData) {
    const fmt = getFmt();
    const items = Array.isArray(selectedItems) ? selectedItems : [];
    const vecs = items.map(toNumVec);
    const m = vecs.length;
    const n = (vecs[0] && vecs[0].length) || 2;
    const syms = items.map(function (it, i) { return getVecSym(it, i, fmt); });

    let html = "";
    html += "<div class=\"sol-text\">Ta duyệt lần lượt từng vector từ \\(" + (syms[0] || "\\mathbf{v}_1") + "\\) đến \\(" + (syms[m - 1] || "\\mathbf{v}_m") + "\\) để xây dựng tập cơ sở \\(B\\) theo quy tắc: giữ lại vector nếu nó không biểu diễn tuyến tính được qua các vector cơ sở đã chọn trước đó.</div>";

    const keptIndices = [];

    for (let i = 0; i < m; i++) {
      const vCur = vecs[i];
      const symCur = syms[i];
      html += "<div class=\"sol-bold\">Bước " + (i + 1) + ": Khảo sát vector \\(" + symCur + " = " + fmt.vecTupleLatex(vCur) + "\\)</div>";

      if (isZeroVec(vCur)) {
        html += "<div class=\"sol-text\">Vì \\(" + symCur + " = \\mathbf{0}\\) nên \\(" + symCur + "\\) luôn phụ thuộc tuyến tính. Ta loại \\(" + symCur + "\\) khỏi cơ sở.</div>";
        continue;
      }

      if (keptIndices.length === 0) {
        keptIndices.push(i);
        html += "<div class=\"sol-text\">Vì \\(" + symCur + " \\neq \\mathbf{0}\\), hệ đơn phần tử \\(\\left\\{" + symCur + "\\right\\}\\) độc lập tuyến tính. Khởi tạo \\(B_1 = \\left\\{" + symCur + "\\right\\}\\).</div>";
        continue;
      }

      const r = keptIndices.length;
      const keptSyms = keptIndices.map(function (idx) { return syms[idx]; });
      const aug = [];
      for (let row = 0; row < n; row++) {
        const line = [];
        for (let k = 0; k < r; k++) {
          line.push(vecs[keptIndices[k]][row]);
        }
        line.push(vCur[row]);
        aug.push(line);
      }

      const cVars = keptIndices.map(function (_, k) { return "c_{" + (k + 1) + "}"; });
      const combAssume = fmt.linearCombLatex(new Array(r).fill(1), keptSyms.map(function (s, k) { return cVars[k] + s; }));
      html += "<div class=\"sol-text\">Kiểm tra xem \\(" + symCur + "\\) có thuộc \\(\\operatorname{span}\\left\\{" + keptSyms.join(",\\, ") + "\\right\\}\\) hay không bằng cách xét phương trình \\(" + combAssume + " = " + symCur + "\\):</div>";

      const solveStep = fmt.gaussRrefWithSteps(aug, { mode: "rref", augCol: r, rowSymbol: "d", bracket: "bmatrix" });
      html += fmt.mathBlockHtml(
        fmt.matrixToLatex(aug, { augCol: r, bracket: "bmatrix" }) +
        " \\;\\xrightarrow{\\text{RREF}}\\; " +
        (solveStep.rrefMatrixLatex || fmt.matrixToLatex(solveStep.rrefMatrix, { augCol: r, bracket: "bmatrix" }))
      );

      if (solveStep.isConsistent && solveStep.particularSol) {
        const expr = fmt.linearCombLatex(solveStep.particularSol, keptSyms, { zeroFallback: "\\mathbf{0}" });
        html += "<div class=\"sol-text\">Hệ phương trình tương thích với nghiệm \\(" + solveStep.particularSol.map(function (val, k) { return "c_{" + (k + 1) + "} = " + fmt.scalarToLatex(val); }).join(",\\; ") + "\\), nghĩa là:</div>";
        html += fmt.mathBlockHtml(symCur + " = " + expr);
        html += "<div class=\"sol-text\">Do \\(" + symCur + "\\) là tổ hợp tuyến tính của các vector đi trước nên ta loại \\(" + symCur + "\\) khỏi cơ sở.</div>";
      } else {
        keptIndices.push(i);
        const badRow = solveStep.inconsistentRow >= 0 ? (solveStep.inconsistentRow + 1) : n;
        html += "<div class=\"sol-text\">Dòng thứ " + badRow + " của ma trận mở rộng có dạng \\(\\left[0 \\;\\dots\\; 0 \\;\\middle|\\; d \\neq 0\\right]\\), nên hệ phương trình vô nghiệm. Vậy \\(" + symCur + " \\notin \\operatorname{span}\\left\\{" + keptSyms.join(",\\, ") + "\\right\\}\\).</div>";
        html += "<div class=\"sol-text\">Ta bổ sung \\(" + symCur + "\\) vào tập độc lập tuyến tính hiện hành: \\(B_{" + keptIndices.length + "} = \\left\\{" + keptIndices.map(function (idx) { return syms[idx]; }).join(",\\; ") + "\\right\\}\\).</div>";
      }
    }

    const dim = typeof apiData?.dimension === "number" ? apiData.dimension : keptIndices.length;
    html += "<div class=\"sol-bold\">Kết luận</div>";
    html += "<div class=\"sol-bullet\"><span>Số chiều của không gian con: \\(\\dim(V) = " + dim + "\\).</span></div>";
    if (keptIndices.length === 0) {
      html += "<div class=\"sol-bullet\"><span>Hệ cơ sở là tập rỗng: \\(B = \\varnothing\\).</span></div>";
    } else {
      const finalSyms = keptIndices.map(function (idx) { return syms[idx]; });
      const finalDefs = keptIndices.map(function (idx) { return syms[idx] + " = " + fmt.vecTupleLatex(vecs[idx]); });
      html += "<div class=\"sol-bullet\"><span>Hệ cơ sở thu được sau sàng lọc là \\(B = \\left\\{" + finalSyms.join(",\\; ") + "\\right\\}\\):</span></div>";
      html += fmt.mathBlockHtml(finalDefs.join(",\\quad "));
    }

    return {
      titleText: "Cơ sở và số chiều",
      titleMath: "\\mathbb{R}^{" + n + "}",
      htmlContent: fmt.wrapStepContainer(html)
    };
  }

  return {
    buildBasisByMatrix: buildBasisByMatrix,
    buildBasisByEquationsGeneral: buildBasisByEquationsGeneral,
    buildBasisByEquationsStepwise: buildBasisByEquationsStepwise
  };
});
