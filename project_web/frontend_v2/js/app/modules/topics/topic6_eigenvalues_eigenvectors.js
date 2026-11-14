// =========================================================================
// topic6_eigenvalues_eigenvectors.js - Chu de 6: Tri rieng, Vector rieng & Cheo hoa
// Tich hop dong bo voi App.matrixList, App.EigenAnimator & Solution Panel 2 Tab
// Tuan thu Zero Em-dash, chuan muc Anti-Slop, UMD Node/Browser.
// =========================================================================
(function (root, factory) {
  const mod = factory();
  if (typeof window !== "undefined") {
    window.App = window.App || {};
    window.App.TasksGen = window.App.TasksGen || {};
    window.App.TasksGen.Topic6Eigen = mod;
    window.App.Topic6Module = mod.Topic6Module;
    window.App.refreshEigenMatrixDropdown = mod.refreshEigenMatrixDropdown;
    window.App.ensureEigenAnimControls = mod.ensureEigenAnimControls;
    window.App.stopEigenAnimation = mod.stopEigenAnimation;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = mod;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SYNC_KEY = "topic6_eigen";

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

  function fmtScalarPlain(val) {
    const fmt = getFmt();
    if (!Number.isFinite(val) || Math.abs(val) < 1e-8) return "0";
    if (Math.abs(val - Math.round(val)) < 1e-7) return String(Math.round(val));
    if (fmt && typeof fmt.toFraction === "function") {
      const fr = fmt.toFraction(val, 100, 1e-7);
      if (fr) return fr.d === 1 ? String(fr.n) : (fr.n + "/" + fr.d);
    }
    return parseFloat(val.toFixed(3)).toString();
  }

  // Fallback exact/numerical cubic solver: x^3 + a*x^2 + b*x + c = 0
  function solveCubicExact(a, b, c, fmt) {
    const evalPoly = function (x) {
      return ((x + a) * x + b) * x + c;
    };

    const candSet = new Set([0]);
    const dens = [1, 2, 3, 4, 5, 6, 8, 10, 12];
    for (let num = 1; num <= 24; num++) {
      for (let di = 0; di < dens.length; di++) {
        const r = num / dens[di];
        candSet.add(r);
        candSet.add(-r);
      }
    }

    for (const r of candSet) {
      if (Math.abs(evalPoly(r)) < 1e-8) {
        const rClean = fmt.snapZero(r);
        // Factor (x - r)(x^2 + B*x + C) = 0
        const B = fmt.snapZero(a + rClean);
        const C = fmt.snapZero(b + B * rClean);
        const delta = fmt.snapZero(B * B - 4 * C);
        if (delta < -1e-8) {
          const pairTex = fmt.quadRootToLatex(-B, delta, 2);
          return {
            realRoots: [rClean],
            realRootTexMap: null,
            hasComplex: true,
            complexPair: {
              re: fmt.snapZero(-B / 2),
              im: Math.sqrt(-delta) / 2,
              plusLatex: pairTex[0],
              minusLatex: pairTex[1]
            }
          };
        }
        const sq = Math.sqrt(Math.max(0, delta));
        const r2 = fmt.snapZero((-B + sq) / 2);
        const r3 = fmt.snapZero((-B - sq) / 2);
        const qTex = fmt.quadRootToLatex(-B, delta, 2);
        return {
          realRoots: [rClean, r2, r3],
          quadMeta: { r1: rClean, r2: r2, r3: r3, tex2: qTex[0], tex3: qTex[1] },
          hasComplex: false,
          complexPair: null
        };
      }
    }

    // Cardano / trigonometric general cubic
    const p = b - (a * a) / 3;
    const q = (2 * a * a * a) / 27 - (a * b) / 3 + c;
    const disc = (q * q) / 4 + (p * p * p) / 27;

    if (disc > 1e-9) {
      const sq = Math.sqrt(disc);
      const u = Math.cbrt(-q / 2 + sq);
      const v = Math.cbrt(-q / 2 - sq);
      const r1 = fmt.snapZero(u + v - a / 3);
      const re = fmt.snapZero(-(u + v) / 2 - a / 3);
      const im = (Math.sqrt(3) / 2) * Math.abs(u - v);
      return {
        realRoots: [r1],
        hasComplex: true,
        complexPair: {
          re: re,
          im: im,
          plusLatex: fmt.complexToLatex(re, im),
          minusLatex: fmt.complexToLatex(re, -im)
        }
      };
    }

    if (Math.abs(disc) <= 1e-9) {
      const u = Math.cbrt(-q / 2);
      const r1 = fmt.snapZero(2 * u - a / 3);
      const r2 = fmt.snapZero(-u - a / 3);
      return {
        realRoots: [r1, r2, r2],
        hasComplex: false,
        complexPair: null
      };
    }

    const rMod = Math.sqrt(Math.max(0, -p / 3));
    const cosArg = Math.max(-1, Math.min(1, -q / (2 * rMod * rMod * rMod || 1)));
    const phi = Math.acos(cosArg);
    const roots = [0, 1, 2].map(function (k) {
      return fmt.snapZero(2 * rMod * Math.cos((phi + 2 * Math.PI * k) / 3) - a / 3);
    });
    roots.sort(function (x, y) { return y - x; });
    return {
      realRoots: roots,
      hasComplex: false,
      complexPair: null
    };
  }

  function fallbackSingularKernel(shiftedM, fmt) {
    const n = shiftedM.length;
    if (n === 2) {
      const r0Norm = Math.hypot(shiftedM[0][0], shiftedM[0][1]);
      const r1Norm = Math.hypot(shiftedM[1][0], shiftedM[1][1]);
      if (r0Norm < 1e-7 && r1Norm < 1e-7) {
        return [[1, 0], [0, 1]];
      }
      const row = r0Norm >= r1Norm ? shiftedM[0] : shiftedM[1];
      return [fmt.scaleToIntegerVector([-row[1], row[0]])];
    }
    const rowObjs = shiftedM.map(function (rw) {
      return { rw: rw, norm: Math.hypot(rw[0], rw[1], rw[2]) };
    }).sort(function (x, y) { return y.norm - x.norm; });

    if (rowObjs[0].norm < 1e-7) {
      return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    }
    const u = rowObjs[0].rw;
    const v = rowObjs[1].rw;
    const cr = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0]
    ];
    if (Math.hypot(cr[0], cr[1], cr[2]) > 1e-6) {
      return [fmt.scaleToIntegerVector(cr)];
    }
    // Rank 1 fallback: find two vectors orthogonal to u
    let b1;
    if (Math.abs(u[0]) > 1e-6 || Math.abs(u[1]) > 1e-6) {
      b1 = fmt.scaleToIntegerVector([-u[1], u[0], 0]);
    } else {
      b1 = [1, 0, 0];
    }
    let b2;
    if (Math.abs(u[0]) > 1e-6) {
      b2 = fmt.scaleToIntegerVector([-u[2], 0, u[0]]);
    } else {
      b2 = fmt.scaleToIntegerVector([0, -u[2], u[1]]);
    }
    return [b1, b2];
  }

  function polyChar2Latex(tr, det, fmt) {
    // lambda^2 - tr * lambda + det = 0
    const terms = ["\\lambda^2"];
    const negTr = fmt.snapZero(-tr);
    if (Math.abs(negTr) > 1e-10) {
      const absTex = fmt.scalarToLatex(Math.abs(negTr));
      const cTex = absTex === "1" ? "" : absTex;
      terms.push((negTr < 0 ? " - " : " + ") + cTex + "\\lambda");
    }
    const dClean = fmt.snapZero(det);
    if (Math.abs(dClean) > 1e-10) {
      terms.push((dClean < 0 ? " - " : " + ") + fmt.scalarToLatex(Math.abs(dClean)));
    }
    return terms.join("");
  }

  function polyChar3Latex(tr, c1, det, fmt) {
    // lambda^3 - tr * lambda^2 + c1 * lambda - det = 0
    const terms = ["\\lambda^3"];
    const c2 = fmt.snapZero(-tr);
    if (Math.abs(c2) > 1e-10) {
      const absTex = fmt.scalarToLatex(Math.abs(c2));
      terms.push((c2 < 0 ? " - " : " + ") + (absTex === "1" ? "" : absTex) + "\\lambda^2");
    }
    const c1Clean = fmt.snapZero(c1);
    if (Math.abs(c1Clean) > 1e-10) {
      const absTex = fmt.scalarToLatex(Math.abs(c1Clean));
      terms.push((c1Clean < 0 ? " - " : " + ") + (absTex === "1" ? "" : absTex) + "\\lambda");
    }
    const c0 = fmt.snapZero(-det);
    if (Math.abs(c0) > 1e-10) {
      terms.push((c0 < 0 ? " - " : " + ") + fmt.scalarToLatex(Math.abs(c0)));
    }
    return terms.join("");
  }

  function computeEigenAnalysis(rawValues) {
    const fmt = getFmt();
    const dim = Array.isArray(rawValues) && rawValues.length === 3 ? 3 : 2;
    const M = [];
    for (let i = 0; i < dim; i++) {
      const row = [];
      for (let j = 0; j < dim; j++) {
        const val = rawValues && rawValues[i] && rawValues[i][j] !== undefined ? Number(rawValues[i][j]) : 0;
        row.push(fmt.snapZero(Number.isFinite(val) ? val : 0));
      }
      M.push(row);
    }

    let trace = 0;
    for (let i = 0; i < dim; i++) trace += M[i][i];
    trace = fmt.snapZero(trace);

    let det = 0;
    let c1 = null;
    let delta = null;
    let realRoots = [];
    let rootLatexHints = [];
    let isComplex = false;
    let complexPair = null;

    if (dim === 2) {
      det = fmt.snapZero(M[0][0] * M[1][1] - M[0][1] * M[1][0]);
      delta = fmt.snapZero(trace * trace - 4 * det);
      const qRootsTex = fmt.quadRootToLatex(trace, delta, 2);
      if (delta < -1e-9) {
        isComplex = true;
        complexPair = {
          re: fmt.snapZero(trace / 2),
          im: Math.sqrt(-delta) / 2,
          plusLatex: qRootsTex[0],
          minusLatex: qRootsTex[1]
        };
      } else {
        const sq = Math.sqrt(Math.max(0, delta));
        const l1 = fmt.snapZero((trace + sq) / 2);
        const l2 = fmt.snapZero((trace - sq) / 2);
        realRoots = [l1, l2];
        rootLatexHints = [
          { val: l1, tex: qRootsTex[0] },
          { val: l2, tex: qRootsTex[1] }
        ];
      }
    } else {
      const m01 = M[0][0] * M[1][1] - M[0][1] * M[1][0];
      const m02 = M[0][0] * M[2][2] - M[0][2] * M[2][0];
      const m12 = M[1][1] * M[2][2] - M[1][2] * M[2][1];
      c1 = fmt.snapZero(m01 + m02 + m12);
      det = fmt.snapZero(
        M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
        M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
        M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
      );
      const cubic = solveCubicExact(-trace, c1, -det, fmt);
      realRoots = cubic.realRoots.slice().sort(function (x, y) { return y - x; });
      isComplex = cubic.hasComplex;
      complexPair = cubic.complexPair;
      if (cubic.quadMeta) {
        rootLatexHints = [
          { val: cubic.quadMeta.r1, tex: fmt.scalarToLatex(cubic.quadMeta.r1) },
          { val: cubic.quadMeta.r2, tex: cubic.quadMeta.tex2 },
          { val: cubic.quadMeta.r3, tex: cubic.quadMeta.tex3 }
        ];
      }
    }

    // Group distinct real eigenvalues within tolerance
    const groups = [];
    for (let i = 0; i < realRoots.length; i++) {
      const rVal = realRoots[i];
      let found = null;
      for (let g = 0; g < groups.length; g++) {
        if (Math.abs(groups[g].lambda - rVal) <= 1e-6) {
          found = groups[g];
          break;
        }
      }
      if (found) {
        found.algMult += 1;
      } else {
        const hint = rootLatexHints.find(function (h) { return Math.abs(h.val - rVal) <= 1e-6; });
        groups.push({
          lambda: rVal,
          lambdaLatex: hint ? hint.tex : fmt.scalarToLatex(rVal),
          algMult: 1
        });
      }
    }

    const distinctEigenvalues = [];
    const eigenPairs = [];

    for (let g = 0; g < groups.length; g++) {
      const grp = groups[g];
      const lam = grp.lambda;
      const shifted = [];
      for (let i = 0; i < dim; i++) {
        const rw = [];
        for (let j = 0; j < dim; j++) {
          rw.push(fmt.snapZero(i === j ? M[i][j] - lam : M[i][j]));
        }
        shifted.push(rw);
      }

      const gauss = fmt.gaussRrefWithSteps(shifted, { mode: "rref", rowSymbol: "d" });
      let basis = gauss.nullspaceIntegerBasis && gauss.nullspaceIntegerBasis.length > 0
        ? gauss.nullspaceIntegerBasis
        : [];

      // Guard against irrational floating-point drift making (A - lam I) appear full-rank
      if (basis.length === 0) {
        basis = fallbackSingularKernel(shifted, fmt);
      }
      if (basis.length > grp.algMult) {
        basis = basis.slice(0, grp.algMult);
      }

      const geoMult = basis.length;
      distinctEigenvalues.push({
        lambda: lam,
        lambdaLatex: grp.lambdaLatex,
        algMult: grp.algMult,
        geoMult: geoMult,
        shiftedMatrix: shifted,
        gauss: gauss,
        basis: basis
      });

      for (let bIdx = 0; bIdx < basis.length; bIdx++) {
        eigenPairs.push({
          lambda: lam,
          lambdaLatex: grp.lambdaLatex,
          vec: basis[bIdx],
          algMult: grp.algMult,
          geoMult: geoMult
        });
      }
    }

    const isDiagonalizable = !isComplex && eigenPairs.length === dim;
    let P = null;
    let D = null;
    let PInv = null;
    let pInvGauss = null;
    let AP = null;
    let PD = null;

    if (isDiagonalizable) {
      P = [];
      D = [];
      for (let i = 0; i < dim; i++) {
        const pRow = [];
        const dRow = [];
        for (let j = 0; j < dim; j++) {
          pRow.push(fmt.snapZero(eigenPairs[j].vec[i]));
          dRow.push(i === j ? eigenPairs[i].lambda : 0);
        }
        P.push(pRow);
        D.push(dRow);
      }

      // Compute exact P^-1 via Gauss-Jordan on [P | I_n]
      const augPI = [];
      for (let i = 0; i < dim; i++) {
        const rw = P[i].slice();
        for (let j = 0; j < dim; j++) rw.push(i === j ? 1 : 0);
        augPI.push(rw);
      }
      pInvGauss = fmt.gaussRrefWithSteps(augPI, { mode: "rref", augCol: dim, rowSymbol: "d" });
      if (pInvGauss.rank === dim) {
        PInv = pInvGauss.rrefMatrix.map(function (rw) {
          return rw.slice(dim).map(function (v) { return fmt.snapZero(v); });
        });
      }

      AP = [];
      PD = [];
      for (let i = 0; i < dim; i++) {
        const apRow = [];
        const pdRow = [];
        for (let j = 0; j < dim; j++) {
          let s1 = 0;
          let s2 = 0;
          for (let t = 0; t < dim; t++) {
            s1 += M[i][t] * P[t][j];
            s2 += P[i][t] * D[t][j];
          }
          apRow.push(fmt.snapZero(s1));
          pdRow.push(fmt.snapZero(s2));
        }
        AP.push(apRow);
        PD.push(pdRow);
      }
    }

    let reasonNotDiagHtml = "";
    if (!isDiagonalizable) {
      if (isComplex && distinctEigenvalues.length === 0) {
        reasonNotDiagHtml = "Đa thức đặc trưng có biệt thức \\(\\Delta < 0\\), toàn bộ nghiệm là số phức ngoài trường \\(\\mathbb{R}\\).";
      } else if (isComplex && distinctEigenvalues.length > 0) {
        reasonNotDiagHtml = "Đa thức đặc trưng bậc 3 chỉ có 1 nghiệm thực và xuất hiện 1 cặp nghiệm phức liên hợp \\(\\alpha \\pm \\beta i \\notin \\mathbb{R}\\).";
      } else {
        const defList = distinctEigenvalues.filter(function (d) { return d.geoMult < d.algMult; });
        if (defList.length > 0) {
          const d0 = defList[0];
          reasonNotDiagHtml = "Tại trị riêng \\(\\lambda = " + d0.lambdaLatex + "\\), bội hình học \\(m_g = " + d0.geoMult + " < m_a = " + d0.algMult + "\\) nên thiếu vector riêng độc lập tuyến tính.";
        } else {
          reasonNotDiagHtml = "Tổng số vector riêng độc lập tuyến tính thực nhỏ hơn cấp của ma trận.";
        }
      }
    }

    return {
      dim: dim,
      matrix: M,
      trace: trace,
      c1: c1,
      det: det,
      delta: delta,
      isComplex: isComplex,
      complexPair: complexPair,
      distinctEigenvalues: distinctEigenvalues,
      eigenPairs: eigenPairs,
      isDiagonalizable: isDiagonalizable,
      P: P,
      D: D,
      PInv: PInv,
      pInvGauss: pInvGauss,
      AP: AP,
      PD: PD,
      reasonNotDiagHtml: reasonNotDiagHtml
    };
  }

  function buildEigenSidebarCard(sys) {
    const fmt = getFmt();
    const primaryRows = [];

    for (let i = 0; i < sys.distinctEigenvalues.length; i++) {
      const d = sys.distinctEigenvalues[i];
      const idx = i + 1;
      const basisTex = d.basis.map(function (v) { return fmt.vecTupleLatex(v); }).join(",\\; ");
      primaryRows.push({
        labelHtml: "Trị riêng thực thứ " + idx + " (bội đại số " + d.algMult + ", bội hình học " + d.geoMult + ")",
        latex: "\\lambda_{" + idx + "} = " + d.lambdaLatex + ",\\quad E(\\lambda_{" + idx + "}) = \\span\\left\\{ " + basisTex + " \\right\\}"
      });
    }

    if (sys.isComplex && sys.complexPair) {
      const startIdx = sys.distinctEigenvalues.length === 0 ? "1,2" : "2,3";
      primaryRows.push({
        labelHtml: "Cặp trị riêng phức liên hợp trên trường số phức",
        latex: "\\lambda_{" + startIdx + "} = " + sys.complexPair.plusLatex + ",\\; " + sys.complexPair.minusLatex,
        noteHtml: "Không sinh ra không gian con riêng thực trên \\(\\mathbb{R}^{" + sys.dim + "}\\)."
      });
    }

    const secondaryRows = [];
    if (sys.isDiagonalizable && sys.D && sys.P) {
      const diagEntries = sys.eigenPairs.map(function (ep) { return ep.lambdaLatex; }).join(",\\; ");
      secondaryRows.push({
        labelHtml: "Ma trận đường chéo và ma trận chuyển cơ sở",
        latex: "D = \\diag\\left(" + diagEntries + "\\right),\\quad P = " + fmt.matrixToLatex(sys.P)
      });
    } else {
      secondaryRows.push({
        labelHtml: "Bất biến đặc trưng và lý do không chéo hóa thực",
        latex: "\\tr(A) = " + fmt.scalarToLatex(sys.trace) + ",\\quad \\det(A) = " + fmt.scalarToLatex(sys.det),
        noteHtml: sys.reasonNotDiagHtml
      });
    }

    return {
      titleLeft: "Khảo sát phổ ma trận",
      badgeRight: sys.isDiagonalizable ? "Chéo hóa được" : "Không chéo hóa trên R",
      badgeTone: sys.isDiagonalizable ? "success" : "warning",
      primaryRows: primaryRows,
      secondarySection: {
        titleHtml: sys.isDiagonalizable ? "Kết quả chéo hóa A = P D P⁻¹" : "Phân tích điều kiện chéo hóa",
        rows: secondaryRows
      }
    };
  }

  function renderEigenInfoCard(matItem, sys) {
    const api = getResultCardApi();
    if (!api.ResultCard || !sys) return "";
    const enriched = sys.distinctEigenvalues && sys.distinctEigenvalues[0] && sys.distinctEigenvalues[0].lambdaLatex !== undefined
      ? sys
      : computeEigenAnalysis(sys.matrix);
    return api.ResultCard.mount("result_eigen_info", buildEigenSidebarCard(enriched));
  }

  function buildMethod1Html(matItem, sys, fmt) {
    const n = sys.dim;
    const M = sys.matrix;
    const matName = (matItem && matItem.name) ? matItem.name : "A";
    const matLatex = fmt.matrixToLatex(M);
    const sections = [];

    sections.push(fmt.stepSectionHtml(
      "Bước 1: Thiết lập phương trình đặc trưng \\(\\det(" + matName + " - \\lambda I_{" + n + "}) = 0\\)",
      [
        "<div class=\"sol-text\">Xét ma trận vuông cấp \\(" + n + "\\):</div>",
        fmt.mathBlockHtml(matName + " = " + matLatex),
        "<div class=\"sol-text\">Vector \\(\\mathbf{v} \\neq \\mathbf{0}\\) là vector riêng ứng với trị riêng \\(\\lambda\\) khi và chỉ khi \\((" + matName + " - \\lambda I_{" + n + "})\\mathbf{v} = \\mathbf{0}\\). Hệ thuần nhất có nghiệm không tầm thường khi và chỉ khi định thức đặc trưng bằng \\(0\\).</div>"
      ]
    ));

    if (n === 2) {
      const a00 = fmt.scalarToLatex(M[0][0]);
      const a01 = fmt.scalarToLatex(M[0][1]);
      const a10 = fmt.scalarToLatex(M[1][0]);
      const a11 = fmt.scalarToLatex(M[1][1]);
      const polyTex = polyChar2Latex(sys.trace, sys.det, fmt);

      const step2Parts = [
        "<div class=\"sol-text\">Khai triển định thức đặc trưng cấp 2 theo vết \\(\\tr(" + matName + ") = " + fmt.scalarToLatex(sys.trace) + "\\) và định thức \\(\\det(" + matName + ") = " + fmt.scalarToLatex(sys.det) + "\\):</div>",
        fmt.mathBlockHtml(
          "P(\\lambda) = \\begin{vmatrix} " + a00 + " - \\lambda & " + a01 + " \\\\ " + a10 + " & " + a11 + " - \\lambda \\end{vmatrix} = " + polyTex + " = 0"
        ),
        "<div class=\"sol-text\">Tính biệt thức \\(\\Delta = \\left(\\tr(" + matName + ")\\right)^2 - 4\\det(" + matName + ") = " + fmt.scalarToLatex(sys.delta) + "\\).</div>"
      ];

      if (sys.isComplex && sys.complexPair) {
        step2Parts.push(
          "<div class=\"sol-text\">Vì \\(\\Delta < 0\\), phương trình vô nghiệm trên \\(\\mathbb{R}\\) và có hai nghiệm phức liên hợp trên \\(\\mathbb{C}\\):</div>",
          fmt.mathBlockHtml("\\lambda_1 = " + sys.complexPair.plusLatex + ",\\qquad \\lambda_2 = " + sys.complexPair.minusLatex)
        );
      } else {
        const rootSummary = sys.distinctEigenvalues.map(function (d, idx) {
          return "\\lambda_{" + (idx + 1) + "} = " + d.lambdaLatex + "\\; (m_a = " + d.algMult + ")";
        }).join(",\\qquad ");
        step2Parts.push(
          "<div class=\"sol-text\">Giải phương trình bậc hai, ta thu được phổ trị riêng thực:</div>",
          fmt.mathBlockHtml(rootSummary)
        );
      }
      sections.push(fmt.stepSectionHtml("Bước 2: Giải phương trình đặc trưng tìm trị riêng", step2Parts));
    } else {
      const polyTex3 = polyChar3Latex(sys.trace, sys.c1, sys.det, fmt);
      const step2Parts = [
        "<div class=\"sol-text\">Tính các bất biến đặc trưng: vết \\(\\tr(" + matName + ") = " + fmt.scalarToLatex(sys.trace) + "\\), tổng định thức con chính cấp 2 là \\(c_1 = " + fmt.scalarToLatex(sys.c1) + "\\), và \\(\\det(" + matName + ") = " + fmt.scalarToLatex(sys.det) + "\\). Phương trình đặc trưng bậc ba có dạng:</div>",
        fmt.mathBlockHtml("P(\\lambda) = -\\left(" + polyTex3 + "\\right) = 0 \\iff " + polyTex3 + " = 0")
      ];

      const rootLines = [];
      for (let i = 0; i < sys.distinctEigenvalues.length; i++) {
        const d = sys.distinctEigenvalues[i];
        rootLines.push("\\lambda_{" + (i + 1) + "} = " + d.lambdaLatex + "\\; (m_a = " + d.algMult + ")");
      }
      if (sys.isComplex && sys.complexPair) {
        rootLines.push("\\lambda_{2,3} = " + sys.complexPair.plusLatex + ",\\; " + sys.complexPair.minusLatex + " \\in \\mathbb{C} \\setminus \\mathbb{R}");
      }
      step2Parts.push(
        "<div class=\"sol-text\">Phân tích nhân tử và giải phương trình bậc ba, ta xác định được các nghiệm đặc trưng:</div>",
        fmt.mathBlockHtml(rootLines.join(",\\qquad "))
      );
      sections.push(fmt.stepSectionHtml("Bước 2: Giải phương trình đặc trưng bậc ba", step2Parts));
    }

    if (sys.distinctEigenvalues.length === 0) {
      sections.push(fmt.stepSectionHtml(
        "Bước 3: Kết luận về không gian riêng trên trường số thực",
        [
          "<div class=\"sol-text\">Do phương trình đặc trưng không có nghiệm thực nào, không tồn tại vector \\(\\mathbf{v} \\in \\mathbb{R}^{" + n + "} \\setminus \\{\\mathbf{0}\\}\\) thỏa mãn \\(" + matName + "\\mathbf{v} = \\lambda\\mathbf{v}\\) với \\(\\lambda \\in \\mathbb{R}\\). Về mặt hình học, phép biến đổi chứa thành phần quay thuần túy làm lệch phương mọi đường thẳng qua gốc tọa độ.</div>"
        ]
      ));
    } else {
      for (let i = 0; i < sys.distinctEigenvalues.length; i++) {
        const d = sys.distinctEigenvalues[i];
        const idx = i + 1;
        const shiftedLatex = fmt.matrixToLatex(d.shiftedMatrix);
        const basisCols = d.basis.map(function (v) { return fmt.vecTupleLatex(v, { colMode: true }); }).join(",\\quad ");
        const basisTuples = d.basis.map(function (v) { return fmt.vecTupleLatex(v); }).join(",\\; ");
        const lamParen = d.lambda < 0 ? "\\left(" + d.lambdaLatex + "\\right)" : d.lambdaLatex;

        const subParts = [
          "<div class=\"sol-text\">Thay \\(\\lambda_{" + idx + "} = " + d.lambdaLatex + "\\) vào ma trận \\(" + matName + " - \\lambda I_{" + n + "}\\):</div>",
          fmt.mathBlockHtml(matName + " - " + lamParen + "I_{" + n + "} = " + shiftedLatex)
        ];

        if (d.gauss && d.gauss.steps && d.gauss.steps.length > 0 && d.gauss.freeCols && d.gauss.freeCols.length > 0) {
          subParts.push(
            "<div class=\"sol-text\">Khử Gauss - Jordan đưa hệ thuần nhất \\((" + matName + " - " + lamParen + "I_{" + n + "})\\mathbf{v} = \\mathbf{0}\\) về dạng bậc thang rút gọn:</div>",
            fmt.renderGaussChainHtml(shiftedLatex, d.gauss.steps)
          );
        }

        subParts.push(
          "<div class=\"sol-text\">Giải không gian nghiệm \\(E(\\lambda_{" + idx + "}) = \\ker(" + matName + " - " + lamParen + "I_{" + n + "})\\), ta thu được cơ sở gồm \\(m_g(\\lambda_{" + idx + "}) = " + d.geoMult + "\\) vector riêng độc lập tuyến tính:</div>",
          fmt.mathBlockHtml(basisCols),
          fmt.mathBlockHtml("B_{E(\\lambda_{" + idx + "})} = \\left\\{ " + basisTuples + " \\right\\},\\qquad \\dim E(\\lambda_{" + idx + "}) = " + d.geoMult)
        );

        sections.push(fmt.stepSectionHtml(
          "Bước " + (i + 3) + ": Tìm không gian riêng ứng với \\(\\lambda_{" + idx + "} = " + d.lambdaLatex + "\\) (bội đại số \\(m_a = " + d.algMult + "\\))",
          subParts
        ));
      }
    }

    return fmt.wrapStepContainer(sections.join(""));
  }

  function buildMethod2Html(matItem, sys, fmt) {
    const n = sys.dim;
    const matName = (matItem && matItem.name) ? matItem.name : "A";
    const sections = [];

    if (sys.isDiagonalizable && sys.P && sys.D) {
      const PLatex = fmt.matrixToLatex(sys.P);
      const DLatex = fmt.matrixToLatex(sys.D);
      const sumGeo = sys.eigenPairs.length;
      const vecListTex = sys.eigenPairs.map(function (_, i) { return "\\mathbf{v}_{" + (i + 1) + "}"; }).join(",\\; ");

      sections.push(fmt.stepSectionHtml(
        "Bước 1: Kiểm định tiêu chuẩn chéo hóa trên \\(\\mathbb{R}\\)",
        [
          "<div class=\"sol-text\">Ma trận vuông cấp \\(" + n + "\\) chéo hóa được trên \\(\\mathbb{R}\\) khi và chỉ khi mọi nghiệm của đa thức đặc trưng đều thuộc \\(\\mathbb{R}\\) và mỗi trị riêng có bội hình học bằng đúng bội đại số:</div>",
          fmt.mathBlockHtml("\\sum_{i} \\dim E(\\lambda_i) = " + sumGeo + " = " + n),
          "<div class=\"sol-text\">Do đó hệ \\(B = \\{" + vecListTex + "\\}\\) lập thành một cơ sở gồm các vector riêng của \\(\\mathbb{R}^{" + n + "}\\), nên \\(" + matName + "\\) <b>chéo hóa được</b>.</div>"
        ]
      ));

      const step2Parts = [
        "<div class=\"sol-text\">Ghép các vector riêng \\(" + vecListTex + "\\) theo cột để lập ma trận chuyển cơ sở khả nghịch \\(P\\), và đặt các trị riêng tương ứng lên đường chéo chính của \\(D\\):</div>",
        fmt.mathBlockHtml("P = " + PLatex + ",\\qquad D = " + DLatex)
      ];

      if (sys.PInv) {
        const augInit = [];
        for (let i = 0; i < n; i++) {
          const rw = sys.P[i].slice();
          for (let j = 0; j < n; j++) rw.push(i === j ? 1 : 0);
          augInit.push(rw);
        }
        const augInitTex = fmt.matrixToLatex(augInit, { augCol: n });
        const pInvTex = fmt.matrixToLatex(sys.PInv);
        step2Parts.push(
          "<div class=\"sol-text\">Tìm ma trận nghịch đảo \\(P^{-1}\\) bằng phương pháp Gauss - Jordan trên ma trận ghép \\([P \\mid I_{" + n + "}]\\):</div>",
          fmt.mathBlockHtml("\\left[P \\mid I_{" + n + "}\\right] = " + augInitTex + " \\longrightarrow \\left[I_{" + n + "} \\mid P^{-1}\\right]"),
          fmt.mathBlockHtml("P^{-1} = " + pInvTex)
        );
      }

      sections.push(fmt.stepSectionHtml(
        "Bước 2: Thiết lập \\(P\\), \\(D\\) và tính ma trận nghịch đảo \\(P^{-1}\\)",
        step2Parts
      ));

      const APLatex = fmt.matrixToLatex(sys.AP);
      const PDLatex = fmt.matrixToLatex(sys.PD);
      sections.push(fmt.stepSectionHtml(
        "Bước 3: Kiểm chứng đẳng thức chéo hóa \\(" + matName + " = P D P^{-1}\\)",
        [
          "<div class=\"sol-text\">Kiểm tra trực tiếp hệ thức \\(" + matName + " P = P D\\):</div>",
          fmt.mathBlockHtml(matName + " P = " + APLatex + " = " + PDLatex + " = P D"),
          "<div class=\"sol-text\">Nhân \\(P^{-1}\\) vào bên phải hai vế, ta thu được phân tích chéo hóa hoàn chỉnh:</div>",
          fmt.mathBlockHtml(matName + " = P D P^{-1} \\iff P^{-1} " + matName + " P = D")
        ]
      ));
    } else {
      const multRows = sys.distinctEigenvalues.map(function (d, idx) {
        return "\\lambda_{" + (idx + 1) + "} = " + d.lambdaLatex + ": \\quad m_a(\\lambda_{" + (idx + 1) + "}) = " + d.algMult + ",\\quad m_g(\\lambda_{" + (idx + 1) + "}) = " + d.geoMult;
      });

      const step1Parts = [
        "<div class=\"sol-text\">Điều kiện cần và đủ để ma trận \\(" + matName + " \\in \\mathbb{R}^{" + n + " \\times " + n + "}\\) chéo hóa được trên \\(\\mathbb{R}\\) là tổng số bội hình học của các trị riêng thực phải bằng \\(" + n + "\\).</div>"
      ];
      if (multRows.length > 0) {
        step1Parts.push(fmt.mathBlockHtml(multRows.join(" \\\\[4pt] ")));
      }
      step1Parts.push(
        "<div class=\"sol-note-box\">" + sys.reasonNotDiagHtml + "</div>"
      );

      sections.push(fmt.stepSectionHtml(
        "Bước 1: Đối chiếu điều kiện cần và đủ để chéo hóa trên \\(\\mathbb{R}\\)",
        step1Parts
      ));

      sections.push(fmt.stepSectionHtml(
        "Bước 2: Kết luận",
        [
          "<div class=\"sol-text\">Tổng số chiều các không gian riêng thực bằng \\(" + sys.eigenPairs.length + " < " + n + "\\). Do đó không tồn tại ma trận khả nghịch \\(P \\in GL_{" + n + "}(\\mathbb{R})\\) sao cho \\(P^{-1}" + matName + "P\\) là ma trận đường chéo. Vậy \\(" + matName + "\\) <b>không chéo hóa được trên \\(\\mathbb{R}\\)</b>.</div>"
        ]
      ));
    }

    return fmt.wrapStepContainer(sections.join(""));
  }

  function buildEigenSolution(matItem, rawValues) {
    const fmt = getFmt();
    const sys = (rawValues && rawValues.distinctEigenvalues && rawValues.distinctEigenvalues[0] && rawValues.distinctEigenvalues[0].lambdaLatex !== undefined)
      ? rawValues
      : computeEigenAnalysis(rawValues || (matItem && matItem.values) || [[1, 0], [0, 1]]);

    const matName = (matItem && matItem.name) ? matItem.name : "A";
    const content1 = buildMethod1Html(matItem, sys, fmt);
    const content2 = buildMethod2Html(matItem, sys, fmt);

    let logParts = sys.distinctEigenvalues.map(function (d, idx) {
      return "\\lambda_{" + (idx + 1) + "} = " + d.lambdaLatex;
    });
    if (sys.isComplex && sys.complexPair) {
      logParts.push("\\lambda = " + sys.complexPair.plusLatex + ",\\; " + sys.complexPair.minusLatex);
    }

    return {
      analysis: sys,
      cardOptions: buildEigenSidebarCard(sys),
      logLatex: logParts.join(",\\; "),
      modalConfig: {
        title: "Trị riêng, Vector riêng & Chéo hóa ma trận",
        math: matName + " \\in \\mathbb{R}^{" + sys.dim + " \\times " + sys.dim + "}",
        tab1Label: "Cách 1: Đa thức đặc trưng & Không gian riêng",
        tab2Label: "Cách 2: Kiểm định chéo hóa A = P D P⁻¹",
        showSubTabs: false,
        content1: content1,
        content2: content2,
        content2Sub: ""
      }
    };
  }

  // Lay ma tran vuong dang chon trong App.matrixList
  function getOrEnsureSelectedSquareMatrixLocal() {
    if (typeof window === "undefined" || !window.App) return null;
    const matrices = Array.isArray(window.App.matrixList) ? window.App.matrixList : [];
    const sel = $("eigenMatrixSelect");

    let item = null;
    if (sel && sel.value) {
      item = matrices.find(function (m) { return String(m.id) === String(sel.value); });
    }
    if (!item && matrices.length > 0) {
      item = matrices.find(function (m) { return m.rows === m.cols && (m.rows === 2 || m.rows === 3); }) || matrices[0];
      if (sel && item) sel.value = String(item.id);
    }

    if (!item) {
      if (typeof window.App.showToast === "function") {
        window.App.showToast("Danh sách trống. Hãy tạo ma trận vuông ở tab Đối tượng trước.", "warning");
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
      if (typeof window.App.showToast === "function") {
        window.App.showToast("Ma trận " + item.name + " (" + item.rows + "x" + item.cols + ") không phải ma trận vuông cấp 2 hoặc cấp 3.", "warning");
      }
      return null;
    }

    const matValues = typeof item.evalMatrix === "function" ? item.evalMatrix() : item.values;
    return { item: item, values: matValues };
  }

  function renderSelectedMatrixPreview() {
    const previewEl = $("eigenMatrixPreview");
    if (!previewEl || typeof window === "undefined" || !window.App) return;

    const matrices = Array.isArray(window.App.matrixList) ? window.App.matrixList : [];
    const sel = $("eigenMatrixSelect");
    const item = sel && sel.value
      ? matrices.find(function (m) { return String(m.id) === String(sel.value); })
      : matrices[0];

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
        const v = (vals && vals[i] && vals[i][j] !== undefined) ? vals[i][j] : 0;
        cellsHtml.push(
          "<div style=\"background: var(--bg-card, var(--card)); border: 1px solid var(--border); border-radius: 2px; padding: 4px 6px; text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600; color: var(--fg);\">" +
            fmtScalarPlain(Number(v)) +
          "</div>"
        );
      }
    }

    previewEl.innerHTML =
      "<div style=\"display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; font-size: 11px; color: var(--muted);\">" +
        "<span>Ma trận đang chọn: <b style=\"color: var(--fg);\">" + item.name + " (" + item.rows + "×" + item.cols + ")</b></span>" +
        "<span style=\"color: " + (isSquareValid ? "var(--text-muted, var(--muted))" : "var(--danger-base, #e5484d)") + "; font-weight: 600;\">" +
          (isSquareValid ? "Ma trận vuông hợp lệ" : "Cần ma trận 2×2 hoặc 3×3") +
        "</span>" +
      "</div>" +
      "<div style=\"display: grid; grid-template-columns: repeat(" + item.cols + ", 1fr); gap: 4px;\">" +
        cellsHtml.join("") +
      "</div>";
  }

  function refreshEigenMatrixDropdown() {
    const sel = $("eigenMatrixSelect");
    if (!sel || typeof window === "undefined" || !window.App) return;

    const matrices = Array.isArray(window.App.matrixList) ? window.App.matrixList : [];
    const prevVal = sel.value;
    sel.innerHTML = "";

    if (matrices.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Chưa có ma trận - tạo ở tab Đối tượng";
      sel.appendChild(opt);
      const resBox = $("result_eigen_info");
      if (resBox) {
        resBox.style.display = "none";
        resBox.innerHTML = "";
      }
    } else {
      matrices.forEach(function (m) {
        const opt = document.createElement("option");
        opt.value = String(m.id);
        const sqTag = m.rows === m.cols && (m.rows === 2 || m.rows === 3) ? "" : " - không vuông";
        opt.textContent = m.name + " (" + m.rows + "×" + m.cols + ")" + sqTag;
        sel.appendChild(opt);
      });

      if (prevVal && matrices.some(function (m) { return String(m.id) === String(prevVal); })) {
        sel.value = prevVal;
      } else {
        const firstSquare = matrices.find(function (m) { return m.rows === m.cols && (m.rows === 2 || m.rows === 3); });
        sel.value = String((firstSquare || matrices[0]).id);
      }
    }

    renderSelectedMatrixPreview();
  }

  function ensureEigenAnimControls() {
    if (typeof document === "undefined") return;
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

    wrap.innerHTML =
      "<div style=\"display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;\">" +
        "<span style=\"font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted, #64748b);\">Trực quan hóa Trị riêng &amp; Chéo hóa</span>" +
        "<div style=\"display: flex; align-items: center; gap: 6px;\">" +
          "<span class=\"basis-step-pill\" id=\"eigenStepCounter\">Bước 1 / 3</span>" +
          "<button type=\"button\" id=\"btnEigenCloseAnim\" class=\"basis-anim-close-btn\" title=\"Đóng trực quan\" style=\"background: transparent; border: none; cursor: pointer; color: var(--text-muted, #64748b); font-size: 13px; padding: 2px; display: inline-flex; align-items: center; justify-content: center; border-radius: 2px;\">" +
            "<i class=\"ph ph-x\"></i>" +
          "</button>" +
        "</div>" +
      "</div>" +
      "<div class=\"coord-phase-pills\" id=\"eigenPhasePills\">" +
        "<button type=\"button\" class=\"coord-phase-btn active\" data-phase=\"0\" title=\"Bước 1: Ma trận A biến đổi cơ sở chuẩn làm lệch phương\">Bước 1</button>" +
        "<button type=\"button\" class=\"coord-phase-btn\" data-phase=\"1\" title=\"Bước 2: Lộ diện Trục bất biến và hệ số co giãn trị riêng\">Bước 2</button>" +
        "<button type=\"button\" class=\"coord-phase-btn\" data-phase=\"2\" title=\"Bước 3: Kẻ lưới theo Cơ sở Vector riêng - Bản chất Chéo hóa\">Bước 3</button>" +
      "</div>" +
      "<div class=\"basis-anim-btn-row\">" +
        "<button type=\"button\" id=\"btnEigenPrev\" class=\"basis-ctrl-btn\" title=\"Bước trước\"><i class=\"ph ph-skip-back\"></i></button>" +
        "<button type=\"button\" id=\"btnEigenPlay\" class=\"basis-ctrl-btn primary\" title=\"Phát / Tạm dừng\"><i class=\"ph ph-pause\" id=\"iconEigenPlay\"></i></button>" +
        "<button type=\"button\" id=\"btnEigenNext\" class=\"basis-ctrl-btn\" title=\"Bước tiếp\"><i class=\"ph ph-skip-forward\"></i></button>" +
        "<button type=\"button\" id=\"btnEigenReplay\" class=\"basis-ctrl-btn\" title=\"Phát lại từ đầu\"><i class=\"ph ph-arrow-counter-clockwise\"></i></button>" +
      "</div>" +
      "<div class=\"hud-menu-slider-row basis-speed-slider-wrap\" style=\"padding: 6px 0 2px; margin-top: 6px; border-top: 1px dashed var(--border-subtle, var(--border, #e2e8f0));\">" +
        "<div class=\"hud-menu-slider-header\" style=\"font-size: 11.5px; margin-bottom: 2px;\">" +
          "<span class=\"hud-menu-item-text\" style=\"color: var(--text-muted, #64748b); font-weight: 600;\">Tốc độ phát</span>" +
          "<span class=\"hud-menu-slider-val\" id=\"eigenSpeedValue\">1.0×</span>" +
        "</div>" +
        "<input type=\"range\" id=\"eigenSpeedSlider\" min=\"0.2\" max=\"2.5\" step=\"0.1\" value=\"1.0\" class=\"hud-range-slider\" />" +
      "</div>" +
      "<div class=\"basis-step-explainer\" id=\"eigenStepExplainer\">" +
        "<div class=\"basis-step-title\" id=\"eigenStepTitle\">Khảo sát trị riêng &amp; vector riêng</div>" +
        "<div class=\"basis-step-desc\" id=\"eigenStepDesc\">Bấm nút Trực quan để khởi chạy hoạt cảnh 3 bước.</div>" +
      "</div>";

    if (out.nextSibling) {
      host.insertBefore(wrap, out.nextSibling);
    } else {
      host.appendChild(wrap);
    }

    const speedSlider = wrap.querySelector("#eigenSpeedSlider");
    const syncSliderPct = function (val) {
      if (!speedSlider) return;
      const min = parseFloat(speedSlider.min) || 0.2;
      const max = parseFloat(speedSlider.max) || 2.5;
      const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
      speedSlider.style.setProperty("--slider-pct", pct.toFixed(1) + "%");
      speedSlider.style.setProperty("--range-pct", pct.toFixed(1) + "%");
    };

    if (speedSlider) {
      speedSlider.addEventListener("input", function (e) {
        const val = parseFloat(e.target.value) || 1.0;
        syncSliderPct(val);
        const valLabel = wrap.querySelector("#eigenSpeedValue");
        if (valLabel) valLabel.textContent = val.toFixed(1) + "×";
      });
      syncSliderPct(1.0);
    }

    const phaseBtns = wrap.querySelectorAll(".coord-phase-btn");
    phaseBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const ph = parseInt(btn.dataset.phase, 10);
        if (window.App && window.App.EigenAnimator && typeof window.App.EigenAnimator.goToPhase === "function") {
          window.App.EigenAnimator.goToPhase(ph);
        }
      });
    });

    const btnClose = wrap.querySelector("#btnEigenCloseAnim");
    if (btnClose) {
      btnClose.addEventListener("click", function () {
        stopEigenAnimation();
      });
    }

    if (window.App && window.App.EigenAnimator && typeof window.App.EigenAnimator.bindSidebarControls === "function") {
      window.App.EigenAnimator.bindSidebarControls();
    }
  }

  function stopEigenAnimation() {
    if (typeof window !== "undefined" && window.App && window.App.EigenAnimator && typeof window.App.EigenAnimator.stop === "function") {
      window.App.EigenAnimator.stop();
    }
    const wrap = $("eigenAnimControls");
    if (wrap) wrap.style.display = "none";
  }

  function getCurrentEigenSig() {
    const api = getResultCardApi();
    if (typeof window === "undefined" || !window.App) return "";
    const matrices = Array.isArray(window.App.matrixList) ? window.App.matrixList : [];
    const sel = $("eigenMatrixSelect");
    const item = sel && sel.value
      ? matrices.find(function (m) { return String(m.id) === String(sel.value); })
      : matrices[0];
    if (!item) return "no-matrix";
    const vals = typeof item.evalMatrix === "function" ? item.evalMatrix() : item.values;
    const matSig = api.SolutionSync ? api.SolutionSync.matrixSig(vals) : "";
    return String(item.id) + ":" + String(item.name || "A") + ":" + matSig;
  }

  function computeAndPrepareEigen(opts) {
    const options = opts || {};
    const selData = getOrEnsureSelectedSquareMatrixLocal();
    if (!selData) return null;

    const item = selData.item;
    const values = selData.values;
    const pack = buildEigenSolution(item, values);

    const api = getResultCardApi();
    if (api.ResultCard) {
      api.ResultCard.mount("result_eigen_info", pack.cardOptions);
    }
    if (api.SolutionSync) {
      api.SolutionSync.save(SYNC_KEY, getCurrentEigenSig(), pack.modalConfig);
    }
    if (typeof window !== "undefined" && window.App && typeof window.App.openSolutionPanel === "function") {
      window.App.openSolutionPanel(Object.assign({}, pack.modalConfig, { autoOpen: false }));
    }

    if (options.logHistory !== false && typeof window !== "undefined" && window.App && window.App.PaperLogger && typeof window.App.PaperLogger.log === "function") {
      window.App.PaperLogger.log(
        "Trị riêng, Vector riêng & Chéo hóa",
        pack.logLatex,
        "",
        pack.modalConfig,
        { type: "eigen", matrixId: item.id }
      );
    }

    return { item: item, values: values, sys: pack.analysis, pack: pack };
  }

  const Topic6Module = {
    _isInitialized: false,

    init: function () {
      if (typeof document === "undefined") return;
      ensureEigenAnimControls();
      refreshEigenMatrixDropdown();
      if (this._isInitialized) return;

      const btnCompute = $("btnEigenCompute");
      const btnAnimate = $("btnEigenAnimate");
      const btnSol = $("btnEigenSolution");
      if (!btnCompute && !btnAnimate && !btnSol) return;
      this._isInitialized = true;

      const sel = $("eigenMatrixSelect");
      if (sel && !sel._eigenBound) {
        sel._eigenBound = true;
        sel.addEventListener("change", function () {
          if (window.App && window.App.EigenAnimator && typeof window.App.EigenAnimator.isActive === "function" && window.App.EigenAnimator.isActive()) {
            stopEigenAnimation();
          }
          renderSelectedMatrixPreview();
          const resBox = $("result_eigen_info");
          if (resBox && resBox.style.display !== "none" && resBox.innerHTML.trim() !== "") {
            computeAndPrepareEigen({ logHistory: false });
          }
        });
      }

      if (btnCompute) {
        btnCompute.addEventListener("click", function () {
          if (window.App && window.App.EigenAnimator && typeof window.App.EigenAnimator.isActive === "function" && window.App.EigenAnimator.isActive()) {
            stopEigenAnimation();
          }
          computeAndPrepareEigen({ logHistory: true });
        });
      }

      if (btnAnimate) {
        btnAnimate.addEventListener("click", function () {
          ensureEigenAnimControls();
          const wrap = $("eigenAnimControls");
          const isBoxOpen = wrap && wrap.style.display !== "none" && wrap.style.display !== "";
          if (isBoxOpen || (window.App && window.App.EigenAnimator && typeof window.App.EigenAnimator.isActive === "function" && window.App.EigenAnimator.isActive())) {
            stopEigenAnimation();
            return;
          }

          const res = computeAndPrepareEigen({ logHistory: false });
          if (!res) return;

          if (typeof window.App.stopBasisAnimation === "function") window.App.stopBasisAnimation();
          if (typeof window.App.stopCoordAnimation === "function") window.App.stopCoordAnimation();

          if (window.App && window.App.EigenAnimator) {
            const ok = window.App.EigenAnimator.start({
              matrix: res.values,
              matrixId: res.item.id
            });
            if (ok && wrap) {
              wrap.style.display = "flex";
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
              getSig: getCurrentEigenSig,
              recomputeStatic: function () {
                computeAndPrepareEigen({ logHistory: false });
              },
              emptyTitle: "Trị riêng, Vector riêng & Chéo hóa",
              emptyHintHtml: "Hãy tạo một <b>ma trận vuông cấp 2 hoặc cấp 3</b> ở tab Đối tượng để khảo sát trị riêng và chéo hóa."
            });
          }
        });
      }
    },

    execute: function () {
      if (!this._isInitialized) this.init();
      refreshEigenMatrixDropdown();
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
        stopEigenAnimation();
      }
    }
  };

  if (typeof window !== "undefined") {
    window.App = window.App || {};
    if (typeof window.App.registerTopicModule === "function") {
      window.App.registerTopicModule("t6", Topic6Module);
    } else if (typeof window.addEventListener === "function") {
      window.addEventListener("DOMContentLoaded", function () {
        if (typeof window.App.registerTopicModule === "function") {
          window.App.registerTopicModule("t6", Topic6Module);
        }
      });
    }
    if (typeof window.addEventListener === "function") {
      window.addEventListener("DOMContentLoaded", function () {
        Topic6Module.init();
      });
    }
  }

  return {
    computeEigenAnalysis: computeEigenAnalysis,
    buildEigenSidebarCard: buildEigenSidebarCard,
    buildEigenSolution: buildEigenSolution,
    renderEigenInfoCard: renderEigenInfoCard,
    refreshEigenMatrixDropdown: refreshEigenMatrixDropdown,
    ensureEigenAnimControls: ensureEigenAnimControls,
    stopEigenAnimation: stopEigenAnimation,
    Topic6Module: Topic6Module
  };
});
