// =========================================================================
// topic5_linear_transformations.js - Module Chu De 5: Anh Xa Tuyen Tinh
// Khao sat Hat nhan Ker(T), Khong gian anh Im(T) va Dinh ly So chieu
// Tuan thu Zero Em-dash, chuan muc Anti-Slop, UMD Node/Browser.
// =========================================================================
(function (root, factory) {
  const mod = factory();
  if (typeof window !== "undefined") {
    window.App = window.App || {};
    window.App.TasksGen = window.App.TasksGen || {};
    window.App.TasksGen.Topic5LT = mod;
    window.App.Topic5Module = mod.Topic5Module;
    window.App.stopLTAnimation = mod.stopLTAnimation;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = mod;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SYNC_KEY = "topic5_lt";

  function $(id) {
    if (typeof document === "undefined") return null;
    return document.getElementById(id);
  }

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

  function getResultCardApi() {
    if (typeof window !== "undefined" && window.App && window.App.ResultCard) {
      return {
        ResultCard: window.App.ResultCard,
        SolutionSync: window.App.SolutionSync
      };
    }
    if (typeof require === "function") {
      try {
        return require("../../ui/result_card_renderer.js");
      } catch (_) {}
    }
    return { ResultCard: null, SolutionSync: null };
  }

  function formatParamHomogeneousLatex(gaussRes, numVars, fmt) {
    const pivotCols = gaussRes.pivotCols || [];
    const freeCols = gaussRes.freeCols || [];
    const R = gaussRes.rrefMatrix || [];

    const tSyms = freeCols.map(function (_, idx) {
      return freeCols.length === 1 ? "t" : "t_{" + (idx + 1) + "}";
    });

    const lines = new Array(numVars).fill("0");
    for (let fIdx = 0; fIdx < freeCols.length; fIdx++) {
      lines[freeCols[fIdx]] = tSyms[fIdx] + " \\in \\mathbb{R}";
    }
    for (let pIdx = 0; pIdx < pivotCols.length; pIdx++) {
      const pCol = pivotCols[pIdx];
      const coeffs = freeCols.map(function (fCol) {
        return fmt.snapZero(-(R[pIdx] ? R[pIdx][fCol] : 0));
      });
      lines[pCol] = fmt.linearCombLatex(coeffs, tSyms, { zeroFallback: "0" });
    }

    const eqs = [];
    for (let j = 0; j < numVars; j++) {
      eqs.push("x_{" + (j + 1) + "} &= " + lines[j]);
    }
    return "\\left\\{\\begin{aligned} " + eqs.join(" \\\\[3pt] ") + " \\end{aligned}\\right.";
  }

  function computeLTAnalysis(rawValues, nOverride) {
    const fmt = getFmt();
    const rawRows = Array.isArray(rawValues) && rawValues.length > 0 ? rawValues.length : 2;
    const rawCols = Array.isArray(rawValues) && Array.isArray(rawValues[0]) && rawValues[0].length > 0 ? rawValues[0].length : rawRows;
    const rows = typeof nOverride === "number" ? (nOverride === 3 ? 3 : 2) : rawRows;
    const cols = typeof nOverride === "number" ? rows : rawCols;
    const isSquare = rows === cols;

    const matrix = [];
    for (let i = 0; i < rows; i++) {
      const r = [];
      for (let j = 0; j < cols; j++) {
        const v = rawValues && rawValues[i] && rawValues[i][j] !== undefined ? Number(rawValues[i][j]) : 0;
        r.push(fmt.snapZero(Number.isFinite(v) ? v : 0));
      }
      matrix.push(r);
    }

    let trace = null;
    if (isSquare) {
      let trSum = 0;
      for (let i = 0; i < rows; i++) trSum += matrix[i][i];
      trace = fmt.snapZero(trSum);
    }

    const columns = [];
    for (let j = 0; j < cols; j++) {
      const col = [];
      for (let i = 0; i < rows; i++) col.push(matrix[i][j]);
      columns.push(col);
    }

    const gauss = fmt.gaussRrefWithSteps(matrix, { mode: "rref", rowSymbol: "d" });
    const rank = gauss.rank;
    const nullity = cols - rank;
    const kerBasis = gauss.nullspaceIntegerBasis || [];
    const imBasis = (gauss.pivotCols || []).map(function (c) { return columns[c]; });

    const isInjective = nullity === 0;
    const isSurjective = rank === rows;
    const isBijective = isInjective && isSurjective;

    return {
      dim: cols,
      rows: rows,
      cols: cols,
      isSquare: isSquare,
      is3D: rows === 3 || cols === 3,
      matrix: matrix,
      det: isSquare ? gauss.det : null,
      detLatex: isSquare ? gauss.detLatex : null,
      trace: trace,
      rank: rank,
      nullity: nullity,
      isInvertible: isSquare && rank === rows,
      isInjective: isInjective,
      isSurjective: isSurjective,
      isBijective: isBijective,
      columns: columns,
      RREF: gauss.rrefMatrix,
      gauss: gauss,
      pivotCols: gauss.pivotCols,
      freeCols: gauss.freeCols,
      kerBasis: kerBasis,
      imBasis: imBasis
    };
  }

  function buildLTSidebarCard(analysis) {
    const fmt = getFmt();
    const r = analysis.rank;
    const k = analysis.nullity;
    const cols = analysis.cols;

    const kerLatex = k === 0
      ? "\\ker(T) = \\left\\{\\mathbf{0}\\right\\},\\quad \\dim\\ker(T) = 0"
      : "B_{\\ker(T)} = \\left\\{ " + analysis.kerBasis.map(function (v) { return fmt.vecTupleLatex(v); }).join(",\\; ") + " \\right\\},\\quad \\dim\\ker(T) = " + k;

    const imLatex = r === 0
      ? "\\Im(T) = \\left\\{\\mathbf{0}\\right\\},\\quad \\dim\\Im(T) = 0"
      : "B_{\\Im(T)} = \\left\\{ " + analysis.imBasis.map(function (v) { return fmt.vecTupleLatex(v); }).join(",\\; ") + " \\right\\},\\quad \\dim\\Im(T) = " + r;

    const secondaryRows = [];
    if (analysis.isSquare) {
      secondaryRows.push({
        labelHtml: "Định thức và vết của ma trận biểu diễn",
        latex: "\\det(A) = " + (analysis.detLatex || fmt.scalarToLatex(analysis.det)) + ",\\quad \\tr(A) = " + fmt.scalarToLatex(analysis.trace)
      });
    }

    const chipsHtml =
      "<span class=\"res-card-chip " + (analysis.isInjective ? "is-yes" : "is-no") + "\">" + (analysis.isInjective ? "Đơn ánh" : "Không đơn ánh") + "</span>" +
      "<span class=\"res-card-chip " + (analysis.isSurjective ? "is-yes" : "is-no") + "\">" + (analysis.isSurjective ? "Toàn ánh" : "Không toàn ánh") + "</span>" +
      "<span class=\"res-card-chip " + (analysis.isBijective ? "is-yes" : "is-no") + "\">" + (analysis.isBijective ? "Đẳng cấu tuyến tính" : "Ánh xạ suy biến") + "</span>";

    secondaryRows.push({
      labelHtml: "Phân loại tính chất ánh xạ",
      html: chipsHtml
    });

    return {
      titleLeft: "Định lý số chiều",
      badgeRightLatex: "\\dim\\ker(T) + \\dim\\Im(T) = " + k + " + " + r + " = " + cols,
      badgeTone: analysis.isBijective ? "success" : (r === 0 ? "danger" : "primary"),
      primaryRows: [
        {
          labelHtml: "Cơ sở và số chiều Hạt nhân Ker(T)",
          latex: kerLatex
        },
        {
          labelHtml: "Cơ sở và số chiều Không gian ảnh Im(T)",
          latex: imLatex
        }
      ],
      secondarySection: {
        titleHtml: "Bất biến đại số & phân loại ánh xạ",
        rows: secondaryRows
      }
    };
  }

  function renderLTInfoCard(matItem, analysis) {
    const api = getResultCardApi();
    if (!api.ResultCard || !analysis) return "";
    return api.ResultCard.mount("result_lt_info", buildLTSidebarCard(analysis));
  }

  function buildMethod1Html(matItem, analysis, fmt) {
    const rows = analysis.rows;
    const cols = analysis.cols;
    const k = analysis.nullity;
    const r = analysis.rank;
    const matName = (matItem && matItem.name) ? matItem.name : "A";
    const ALatex = fmt.matrixToLatex(analysis.matrix);
    const rrefLatex = analysis.gauss.rrefMatrixLatex || fmt.matrixToLatex(analysis.RREF);
    const zeroRhs = new Array(rows).fill(0);
    const sysTex = fmt.systemLatex(analysis.matrix, zeroRhs, "x");

    const sections = [];
    sections.push(fmt.stepSectionHtml(
      "Bước 1: Thiết lập hệ phương trình thuần nhất xác định Hạt nhân \\(\\ker(T)\\)",
      [
        "<div class=\"sol-text\">Ánh xạ tuyến tính \\(T: \\mathbb{R}^{" + cols + "} \\to \\mathbb{R}^{" + rows + "}\\) xác định bởi \\(T(\\mathbf{x}) = " + matName + "\\mathbf{x}\\) có ma trận biểu diễn trong cặp cơ sở chính tắc là:</div>",
        fmt.mathBlockHtml(matName + " = " + ALatex),
        "<div class=\"sol-text\">Theo định nghĩa, \\(\\ker(T) = \\left\\{\\mathbf{x} \\in \\mathbb{R}^{" + cols + "} \\mid " + matName + "\\mathbf{x} = \\mathbf{0}\\right\\}\\). Điều kiện \\(" + matName + "\\mathbf{x} = \\mathbf{0}\\) tương đương với hệ phương trình tuyến tính thuần nhất:</div>",
        fmt.mathBlockHtml(sysTex)
      ]
    ));

    sections.push(fmt.stepSectionHtml(
      "Bước 2: Đưa ma trận hệ số về dạng bậc thang rút gọn \\(\\operatorname{RREF}(" + matName + ")\\)",
      [
        fmt.renderGaussChainHtml(ALatex, analysis.gauss.steps),
        "<div class=\"sol-text\">Ma trận bậc thang rút gọn thu được có \\(" + r + "\\) dòng khác không:</div>",
        fmt.mathBlockHtml("\\operatorname{RREF}(" + matName + ") = " + rrefLatex + " \\implies \\rank(" + matName + ") = " + r)
      ]
    ));

    const step3Parts = [];
    if (k === 0) {
      step3Parts.push(
        "<div class=\"sol-text\">Mọi cột \\(1, \\dots, " + cols + "\\) đều là cột trụ (không có ẩn tự do). Do đó hệ \\(" + matName + "\\mathbf{x} = \\mathbf{0}\\) chỉ có duy nhất nghiệm tầm thường:</div>",
        fmt.mathBlockHtml("\\mathbf{x} = \\mathbf{0} \\implies \\ker(T) = \\left\\{\\mathbf{0}\\right\\},\\quad \\dim\\ker(T) = 0"),
        "<div class=\"sol-text\">Vì \\(\\ker(T) = \\left\\{\\mathbf{0}\\right\\}\\), ánh xạ tuyến tính \\(T\\) là một <b>đơn ánh</b>.</div>"
      );
    } else {
      const freeVarTex = analysis.freeCols.map(function (c) { return "x_{" + (c + 1) + "}"; }).join(",\\; ");
      const paramSys = formatParamHomogeneousLatex(analysis.gauss, cols, fmt);
      const kerColsTex = analysis.kerBasis.map(function (v) { return fmt.vecTupleLatex(v, { colMode: true }); }).join(",\\quad ");
      const kerTuplesTex = analysis.kerBasis.map(function (v) { return fmt.vecTupleLatex(v); }).join(",\\; ");

      step3Parts.push(
        "<div class=\"sol-text\">Hệ có \\(" + k + "\\) ẩn tự do là \\(" + freeVarTex + "\\). Biểu diễn các ẩn cơ sở theo tham số thực của ẩn tự do:</div>",
        fmt.mathBlockHtml(paramSys),
        "<div class=\"sol-text\">Lần lượt gán từng tham số tự do bằng giá trị nguyên thích hợp và các tham số còn lại bằng \\(0\\) để khử mẫu số, ta thu được các vector cơ sở độc lập tuyến tính của \\(\\ker(T)\\):</div>",
        fmt.mathBlockHtml(kerColsTex),
        "<div class=\"sol-text\">Vậy cơ sở và số chiều của Hạt nhân là:</div>",
        fmt.mathBlockHtml("B_{\\ker(T)} = \\left\\{ " + kerTuplesTex + " \\right\\},\\qquad \\dim\\ker(T) = " + k),
        "<div class=\"sol-text\">Do \\(\\dim\\ker(T) = " + k + " > 0\\), tồn tại vector \\(\\mathbf{x} \\neq \\mathbf{0}\\) sao cho \\(T(\\mathbf{x}) = \\mathbf{0}\\), nên \\(T\\) <b>không phải đơn ánh</b>.</div>"
      );
    }

    sections.push(fmt.stepSectionHtml(
      "Bước 3: Trích xuất cơ sở \\(\\ker(T)\\) và xét tính đơn ánh",
      step3Parts
    ));

    return fmt.wrapStepContainer(sections.join(""));
  }

  function buildMethod2Html(matItem, analysis, fmt) {
    const rows = analysis.rows;
    const cols = analysis.cols;
    const r = analysis.rank;
    const k = analysis.nullity;
    const matName = (matItem && matItem.name) ? matItem.name : "A";
    const rrefLatex = analysis.gauss.rrefMatrixLatex || fmt.matrixToLatex(analysis.RREF);

    const colSpanDefs = analysis.columns.map(function (col, j) {
      return "T(\\mathbf{e}_{" + (j + 1) + "}) = " + fmt.vecTupleLatex(col, { colMode: true });
    }).join(",\\quad ");

    const sections = [];
    sections.push(fmt.stepSectionHtml(
      "Bước 1: Biểu diễn Không gian ảnh \\(\\Im(T)\\) qua ảnh của cơ sở chính tắc",
      [
        "<div class=\"sol-text\">Với mọi \\(\\mathbf{x} = \\sum_{j=1}^{" + cols + "} x_j \\mathbf{e}_j \\in \\mathbb{R}^{" + cols + "}\\), tính tuyến tính cho ta \\(T(\\mathbf{x}) = \\sum_{j=1}^{" + cols + "} x_j T(\\mathbf{e}_j)\\). Do đó \\(\\Im(T)\\) chính là không gian cột \\(\\operatorname{Col}(" + matName + ")\\) sinh bởi các vector ảnh:</div>",
        fmt.mathBlockHtml(colSpanDefs)
      ]
    ));

    const step2Parts = [];
    if (r === 0) {
      step2Parts.push(
        "<div class=\"sol-text\">Ma trận \\(\\operatorname{RREF}(" + matName + ")\\) không có cột trụ nào (mọi cột đều bằng \\(\\mathbf{0}\\)):</div>",
        fmt.mathBlockHtml("\\Im(T) = \\left\\{\\mathbf{0}\\right\\},\\qquad \\dim\\Im(T) = 0")
      );
    } else {
      const pivIndices1 = analysis.pivotCols.map(function (c) { return c + 1; }).join(",\\; ");
      const pivBasisTuples = analysis.imBasis.map(function (v) { return fmt.vecTupleLatex(v); }).join(",\\; ");
      const pivBasisCols = analysis.imBasis.map(function (v, idx) {
        const origColIdx = analysis.pivotCols[idx] + 1;
        return "T(\\mathbf{e}_{" + origColIdx + "}) = " + fmt.vecTupleLatex(v, { colMode: true });
      }).join(",\\quad ");

      step2Parts.push(
        "<div class=\"sol-text\">Quan sát \\(\\operatorname{RREF}(" + matName + ") = " + rrefLatex + "\\), các phần tử cơ sở (chốt dẫn đầu bằng \\(1\\)) nằm tại các cột có chỉ số \\(j \\in \\{" + pivIndices1 + "\\}\\).</div>",
        "<div class=\"sol-text\">Theo định lý bảo toàn quan hệ phụ thuộc tuyến tính giữa các cột qua phép biến đổi sơ cấp trên dòng, các cột gốc tương ứng của ma trận \\(" + matName + "\\) tạo thành một cơ sở của \\(\\Im(T)\\):</div>",
        fmt.mathBlockHtml(pivBasisCols),
        fmt.mathBlockHtml("B_{\\Im(T)} = \\left\\{ " + pivBasisTuples + " \\right\\},\\qquad \\dim\\Im(T) = \\rank(" + matName + ") = " + r)
      );
    }

    sections.push(fmt.stepSectionHtml(
      "Bước 2: Trích xuất cơ sở của \\(\\Im(T)\\) từ các cột trụ của \\(" + matName + "\\)",
      step2Parts
    ));

    const step3Parts = [
      "<div class=\"sol-text\">Theo Định lý Hạng - Số khuyết (Rank - Nullity Theorem) cho ánh xạ tuyến tính \\(T: \\mathbb{R}^{" + cols + "} \\to \\mathbb{R}^{" + rows + "}\\):</div>",
      fmt.mathBlockHtml("\\dim\\ker(T) + \\dim\\Im(T) = " + k + " + " + r + " = " + cols + " = \\dim\\left(\\mathbb{R}^{" + cols + "}\\right)")
    ];

    if (analysis.isSquare) {
      step3Parts.push(
        "<div class=\"sol-text\">Kiểm tra thêm bất biến định thức và vết của tự đồng cấu trên \\(\\mathbb{R}^{" + cols + "}\\):</div>",
        fmt.mathBlockHtml("\\det(" + matName + ") = " + (analysis.detLatex || fmt.scalarToLatex(analysis.det)) + ",\\qquad \\tr(" + matName + ") = " + fmt.scalarToLatex(analysis.trace))
      );
    }

    const surjSummary = analysis.isSurjective
      ? "Vì \\(\\dim\\Im(T) = " + r + " = \\dim\\left(\\mathbb{R}^{" + rows + "}\\right)\\), nên \\(\\Im(T) = \\mathbb{R}^{" + rows + "}\\) và \\(T\\) là <b>toàn ánh</b>."
      : "Vì \\(\\dim\\Im(T) = " + r + " < " + rows + " = \\dim\\left(\\mathbb{R}^{" + rows + "}\\right)\\), nên \\(\\Im(T) \\subsetneq \\mathbb{R}^{" + rows + "}\\) và \\(T\\) <b>không phải toàn ánh</b>.";

    const isoSummary = analysis.isBijective
      ? "Kết hợp tính đơn ánh và toàn ánh, \\(T\\) là một <b>đẳng cấu tuyến tính</b>."
      : "Do đó \\(T\\) <b>không phải là đẳng cấu tuyến tính</b>.";

    step3Parts.push(
      "<div class=\"sol-text\">" + surjSummary + " " + isoSummary + "</div>"
    );

    sections.push(fmt.stepSectionHtml(
      "Bước 3: Kiểm chứng Định lý số chiều và phân loại ánh xạ",
      step3Parts
    ));

    return fmt.wrapStepContainer(sections.join(""));
  }

  function buildLTSolution(matItem, rawValues, nOverride) {
    const fmt = getFmt();
    const analysis = (rawValues && rawValues.gauss)
      ? rawValues
      : computeLTAnalysis(rawValues || (matItem && matItem.values) || [[1, 0], [0, 1]], nOverride);

    const content1 = buildMethod1Html(matItem, analysis, fmt);
    const content2 = buildMethod2Html(matItem, analysis, fmt);
    const logLatex = "\\dim\\ker(T) = " + analysis.nullity + ",\\; \\dim\\Im(T) = " + analysis.rank;

    return {
      analysis: analysis,
      cardOptions: buildLTSidebarCard(analysis),
      logLatex: logLatex,
      modalConfig: {
        title: "Khảo sát Hạt nhân Ker(T) & Không gian ảnh Im(T)",
        math: "T: \\mathbb{R}^{" + analysis.cols + "} \\to \\mathbb{R}^{" + analysis.rows + "}",
        tab1Label: "Cách 1: Khảo sát Ker(T) qua hệ thuần nhất",
        tab2Label: "Cách 2: Không gian ảnh Im(T) & Định lý số chiều",
        showSubTabs: false,
        content1: content1,
        content2: content2,
        content2Sub: ""
      }
    };
  }

  function getCurrentLTSig() {
    const api = getResultCardApi();
    if (typeof window === "undefined" || !window.App || typeof window.App.getOrEnsureSelectedSquareMatrix !== "function") {
      return "";
    }
    const sel = $("ltMatrixSelect");
    const matrices = Array.isArray(window.App.matrixList) ? window.App.matrixList : [];
    const item = sel && sel.value
      ? matrices.find(function (m) { return String(m.id) === String(sel.value); })
      : matrices[0];
    if (!item) return "no-matrix";
    const vals = typeof item.evalMatrix === "function" ? item.evalMatrix() : item.values;
    const matSig = api.SolutionSync ? api.SolutionSync.matrixSig(vals) : "";
    return String(item.id) + ":" + String(item.name || "A") + ":" + matSig;
  }

  function stopLTAnimation() {
    if (typeof window !== "undefined" && window.App && window.App.LTAnimator && window.App.LTAnimator.isActive()) {
      window.App.LTAnimator.stop();
    }
  }

  const Topic5Module = {
    _isInitialized: false,
    _lastAnalysis: null,

    init: function () {
      if (this._isInitialized || typeof document === "undefined") return;
      const btnInspect = $("btnLTInspect");
      const btnAnimate = $("btnLTAnimate");
      const btnSol = $("btnLTSolution");
      if (!btnInspect && !btnAnimate && !btnSol) return;
      this._isInitialized = true;

      const self = this;

      if (typeof App.refreshLTMatrixDropdown === "function") {
        App.refreshLTMatrixDropdown();
      }

      const sel = $("ltMatrixSelect");
      const previewEl = $("ltMatrixPreview");
      if (sel) {
        sel.addEventListener("change", function () {
          try { stopLTAnimation(); } catch (_) {}
          const selData = App.getOrEnsureSelectedSquareMatrix
            ? App.getOrEnsureSelectedSquareMatrix("ltMatrixSelect")
            : null;
          if (selData && typeof App.renderMatrixPreviewGrid === "function") {
            App.renderMatrixPreviewGrid(previewEl, selData.item, { isConic: false });
          }
          const resBox = $("result_lt_info");
          if (resBox && resBox.style.display !== "none" && resBox.innerHTML.trim() !== "") {
            self.execute({ logHistory: false });
          }
        });
      }

      if (btnInspect) {
        btnInspect.addEventListener("click", function () {
          self.execute({ logHistory: true });
        });
      }

      if (btnAnimate) {
        btnAnimate.addEventListener("click", function () {
          const selData = App.getOrEnsureSelectedSquareMatrix
            ? App.getOrEnsureSelectedSquareMatrix("ltMatrixSelect")
            : null;
          if (!selData) return;

          if (window.App && App.LTAnimator) {
            if (App.LTAnimator.isActive()) {
              App.LTAnimator.stop();
            } else {
              self.execute({ logHistory: false });
              App.LTAnimator.start(selData.item);
            }
          }
        });
      }

      if (btnSol) {
        btnSol.dataset.syncManaged = "1";
        btnSol.addEventListener("click", function () {
          const api = getResultCardApi();
          if (api.SolutionSync && typeof api.SolutionSync.openWithSync === "function") {
            api.SolutionSync.openWithSync({
              key: SYNC_KEY,
              getSig: getCurrentLTSig,
              recomputeStatic: function () {
                self.execute({ silent: true, logHistory: false });
              },
              emptyTitle: "Khảo sát Ánh xạ tuyến tính",
              emptyHintHtml: "Hãy tạo một <b>ma trận vuông cấp 2 hoặc cấp 3</b> ở tab Đối tượng để khảo sát Hạt nhân và Không gian ảnh."
            });
          }
        });
      }
    },

    execute: function (opts) {
      const options = opts || {};
      if (!this._isInitialized) this.init();

      const selData = App.getOrEnsureSelectedSquareMatrix
        ? App.getOrEnsureSelectedSquareMatrix("ltMatrixSelect")
        : null;
      if (!selData) return null;

      const pack = buildLTSolution(selData.item, selData.values, selData.n);
      const analysis = pack.analysis;
      this._lastAnalysis = analysis;

      if (!options.silent) {
        if (analysis.is3D && App.mode !== "3D") {
          if (typeof App.setMode === "function") App.setMode("3D");
          else if (typeof App.toggleMode === "function") App.toggleMode();
        } else if (!analysis.is3D && App.mode === "3D") {
          if (typeof App.setMode === "function") App.setMode("2D");
          else if (typeof App.toggleMode === "function") App.toggleMode();
        }
      }

      renderLTInfoCard(selData.item, analysis);

      const api = getResultCardApi();
      if (api.SolutionSync) {
        api.SolutionSync.save(SYNC_KEY, getCurrentLTSig(), pack.modalConfig);
      }
      if (typeof App.openSolutionPanel === "function") {
        App.openSolutionPanel(Object.assign({}, pack.modalConfig, { autoOpen: false }));
      }

      if (options.logHistory !== false && window.App && window.App.PaperLogger && typeof window.App.PaperLogger.log === "function") {
        window.App.PaperLogger.log(
          "Khảo sát Hạt nhân & Không gian ảnh",
          pack.logLatex,
          "",
          pack.modalConfig,
          { type: "linear_transform", matrixId: selData.item.id }
        );
      }

      const previewEl = $("ltMatrixPreview");
      if (previewEl && typeof App.renderMatrixPreviewGrid === "function") {
        App.renderMatrixPreviewGrid(previewEl, selData.item, { isConic: false });
      }

      if (!options.silent) {
        if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
          Vec2D.draw2DAllVectors();
        }
        if (window.Vec3D && typeof Vec3D.hardRefresh3D === "function") {
          Vec3D.hardRefresh3D();
        }
      }

      return pack;
    },

    onTaskSelect: function (taskId) {
      if (
        taskId === "topic5_linear_transformation" ||
        taskId === "topic5_kernel_image" ||
        taskId === "s25" ||
        taskId === "topic5_matrix_transform" ||
        taskId === "s26"
      ) {
        if (!this._isInitialized) this.init();
        if (typeof App.refreshLTMatrixDropdown === "function") {
          App.refreshLTMatrixDropdown();
        }
      } else {
        try { stopLTAnimation(); } catch (_) {}
      }
    }
  };

  if (typeof window !== "undefined") {
    window.App = window.App || {};
    if (typeof window.App.registerTopicModule === "function") {
      window.App.registerTopicModule("t5", Topic5Module);
    } else if (typeof window.addEventListener === "function") {
      window.addEventListener("DOMContentLoaded", function () {
        if (typeof window.App.registerTopicModule === "function") {
          window.App.registerTopicModule("t5", Topic5Module);
        }
      });
    }
  }

  return {
    computeLTAnalysis: computeLTAnalysis,
    buildLTSidebarCard: buildLTSidebarCard,
    buildLTSolution: buildLTSolution,
    renderLTInfoCard: renderLTInfoCard,
    stopLTAnimation: stopLTAnimation,
    Topic5Module: Topic5Module
  };
});
