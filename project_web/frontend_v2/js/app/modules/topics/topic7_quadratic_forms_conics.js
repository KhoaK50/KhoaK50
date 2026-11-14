// =========================================================================
// topic7_quadratic_forms_conics.js - Module Chu De 7: Dang Toan Phuong
// Cheo hoa truc giao, Phuong phap Lagrange, Tieu chuan Sylvester & Conic/Quadric
// Tuan thu Zero Em-dash, chuan muc Anti-Slop, UMD Node/Browser.
// =========================================================================
(function (root, factory) {
  const mod = factory();
  if (typeof window !== "undefined") {
    window.App = window.App || {};
    window.App.TasksGen = window.App.TasksGen || {};
    window.App.TasksGen.Topic7Conic = mod;
    window.App.Topic7Module = mod.Topic7Module;
    window.App.stopConicAnimation = mod.stopConicAnimation;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = mod;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SYNC_KEY = "topic7_conic";

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

  function normVec(v) {
    return Math.hypot(v[0] || 0, v[1] || 0, v[2] || 0);
  }

  function cross3(a, b) {
    return [
      (a[1] || 0) * (b[2] || 0) - (a[2] || 0) * (b[1] || 0),
      (a[2] || 0) * (b[0] || 0) - (a[0] || 0) * (b[2] || 0),
      (a[0] || 0) * (b[1] || 0) - (a[1] || 0) * (b[0] || 0)
    ];
  }

  function formatQuadPolyLatex(B, varSyms, fmt) {
    const n = B.length;
    const terms = [];

    for (let i = 0; i < n; i++) {
      const aii = fmt.snapZero(B[i][i]);
      if (Math.abs(aii) <= 1e-9) continue;
      const absTex = fmt.scalarToLatex(Math.abs(aii));
      const cStr = absTex === "1" ? "" : absTex;
      if (terms.length === 0) {
        terms.push((aii < 0 ? "-" : "") + cStr + varSyms[i] + "^2");
      } else {
        terms.push((aii < 0 ? " - " : " + ") + cStr + varSyms[i] + "^2");
      }
    }

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const twoAij = fmt.snapZero(2 * B[i][j]);
        if (Math.abs(twoAij) <= 1e-9) continue;
        const absTex = fmt.scalarToLatex(Math.abs(twoAij));
        const cStr = absTex === "1" ? "" : absTex;
        if (terms.length === 0) {
          terms.push((twoAij < 0 ? "-" : "") + cStr + varSyms[i] + varSyms[j]);
        } else {
          terms.push((twoAij < 0 ? " - " : " + ") + cStr + varSyms[i] + varSyms[j]);
        }
      }
    }

    return terms.length > 0 ? terms.join("") : "0";
  }

  function formatDiagSqSumLatex(coeffs, varSyms, fmt) {
    const terms = [];
    for (let i = 0; i < coeffs.length; i++) {
      const c = fmt.snapZero(coeffs[i]);
      if (Math.abs(c) <= 1e-9) continue;
      const absTex = fmt.scalarToLatex(Math.abs(c));
      const cStr = absTex === "1" ? "" : (absTex.includes("\\frac") || absTex.includes(" ") ? "\\left(" + absTex + "\\right)" : absTex);
      if (terms.length === 0) {
        terms.push((c < 0 ? "-" : "") + cStr + varSyms[i] + "^2");
      } else {
        terms.push((c < 0 ? " - " : " + ") + cStr + varSyms[i] + "^2");
      }
    }
    return terms.length > 0 ? terms.join("") : "0";
  }

  // Exact algebraic Lagrange completing-the-square reduction for symmetric n x n (n = 2, 3)
  function computeLagrangeReduction(symA, fmt) {
    const n = symA.length;
    const xSyms = [];
    for (let i = 0; i < n; i++) xSyms.push("x_{" + (i + 1) + "}");

    // Current symmetric matrix B in current variables u_1..u_n, where u = invT * x
    // Specifically, uForms[i] = array of length n giving linear expression of u_i in terms of x_1..x_n:
    // u_i = sum_k uForms[i][k] * x_k
    let B = symA.map(function (rw) { return rw.slice(); });
    let uForms = [];
    for (let i = 0; i < n; i++) {
      const e = new Array(n).fill(0);
      e[i] = 1;
      uForms.push(e);
    }

    const steps = [];
    const canonicalTerms = [];
    let auxCount = 0;

    for (let guard = 0; guard < n + 3; guard++) {
      // Find first non-zero diagonal entry
      let piv = -1;
      for (let i = 0; i < n; i++) {
        if (Math.abs(B[i][i]) > 1e-8) {
          piv = i;
          break;
        }
      }

      if (piv === -1) {
        // Check if any off-diagonal entry is non-zero
        let p = -1;
        let q = -1;
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            if (Math.abs(B[i][j]) > 1e-8) {
              p = i;
              q = j;
              break;
            }
          }
          if (p !== -1) break;
        }

        if (p === -1) {
          // Entire remaining matrix B is zero!
          break;
        }

        // Auxiliary substitution: u_p = v_p + v_q, u_q = v_p - v_q
        // Inverse: v_p = 0.5*(u_p + u_q), v_q = 0.5*(u_p - u_q)
        auxCount++;
        const T = [];
        for (let i = 0; i < n; i++) {
          const rw = new Array(n).fill(0);
          rw[i] = 1;
          T.push(rw);
        }
        T[p][p] = 1;
        T[p][q] = 1;
        T[q][p] = 1;
        T[q][q] = -1;

        // B_new = T^T * B * T
        const BT = [];
        for (let i = 0; i < n; i++) {
          const rw = [];
          for (let j = 0; j < n; j++) {
            let s = 0;
            for (let k = 0; k < n; k++) s += B[i][k] * T[k][j];
            rw.push(fmt.snapZero(s));
          }
          BT.push(rw);
        }
        const BNew = [];
        for (let i = 0; i < n; i++) {
          const rw = [];
          for (let j = 0; j < n; j++) {
            let s = 0;
            for (let k = 0; k < n; k++) s += T[k][i] * BT[k][j];
            rw.push(fmt.snapZero(s));
          }
          BNew.push(rw);
        }

        const upOld = uForms[p].slice();
        const uqOld = uForms[q].slice();
        const upTex = fmt.linearCombLatex(upOld, xSyms);
        const uqTex = fmt.linearCombLatex(uqOld, xSyms);

        uForms[p] = upOld.map(function (val, k) { return fmt.snapZero(0.5 * (val + uqOld[k])); });
        uForms[q] = upOld.map(function (val, k) { return fmt.snapZero(0.5 * (val - uqOld[k])); });
        B = BNew;

        const vSyms = [];
        for (let i = 0; i < n; i++) vSyms.push("t_{" + (i + 1) + "}");
        steps.push({
          type: "aux",
          descHtml: "Do biểu thức còn lại khuyết toàn bộ số hạng bình phương nhưng còn số hạng chéo khác \\(0\\), ta đặt phép đổi biến phụ không suy biến để làm xuất hiện bình phương:",
          latex:
            "\\left\\{\\begin{aligned} " +
              upTex + " &= " + vSyms[p] + " + " + vSyms[q] + " \\\\[3pt] " +
              uqTex + " &= " + vSyms[p] + " - " + vSyms[q] +
            " \\end{aligned}\\right. \\implies Q_{\\text{rem}} = " + formatQuadPolyLatex(B, vSyms, fmt)
        });
        continue;
      }

      // Standard Lagrange step on pivot index `piv`: B[piv][piv] != 0
      const bpp = B[piv][piv];
      // zForm in x-coordinates: u_piv + sum_{j != piv} (B[piv][j] / bpp) * u_j
      const zForm = uForms[piv].slice();
      for (let j = 0; j < n; j++) {
        if (j === piv) continue;
        if (Math.abs(B[piv][j]) <= 1e-9) continue;
        const ratio = B[piv][j] / bpp;
        for (let k = 0; k < n; k++) {
          zForm[k] = fmt.snapZero(zForm[k] + ratio * uForms[j][k]);
        }
      }

      // Update B: B'[i][j] = B[i][j] - B[piv][i]*B[piv][j]/bpp for i,j != piv; row/col piv = 0
      const BNext = [];
      for (let i = 0; i < n; i++) {
        const rw = new Array(n).fill(0);
        if (i !== piv) {
          for (let j = 0; j < n; j++) {
            if (j !== piv) {
              rw[j] = fmt.snapZero(B[i][j] - (B[piv][i] * B[piv][j]) / bpp);
            }
          }
        }
        BNext.push(rw);
      }

      const zIdx = canonicalTerms.length + 1;
      const zSym = "Z_{" + zIdx + "}";
      const zLinearLatex = fmt.linearCombLatex(zForm, xSyms);
      const bppLatex = fmt.scalarToLatex(bpp);
      const sqTermLatex = (Math.abs(bpp - 1) <= 1e-9 ? "" : (Math.abs(bpp + 1) <= 1e-9 ? "-" : bppLatex)) + "\\left(" + zLinearLatex + "\\right)^2";

      // Express remaining form in xSyms if no aux was used, or via current uForms
      let remPolyMatrixInX = [];
      for (let r1 = 0; r1 < n; r1++) remPolyMatrixInX.push(new Array(n).fill(0));
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (Math.abs(BNext[i][j]) <= 1e-9) continue;
          for (let k1 = 0; k1 < n; k1++) {
            for (let k2 = 0; k2 < n; k2++) {
              remPolyMatrixInX[k1][k2] = fmt.snapZero(remPolyMatrixInX[k1][k2] + BNext[i][j] * uForms[i][k1] * uForms[j][k2]);
            }
          }
        }
      }
      const remLatex = formatQuadPolyLatex(remPolyMatrixInX, xSyms, fmt);

      steps.push({
        type: "complete_square",
        zSym: zSym,
        coeff: bpp,
        zLinearLatex: zLinearLatex,
        descHtml: "Nhóm toàn bộ các số hạng chứa biến dẫn đầu để tạo bình phương đủ \\(" + zSym + " = " + zLinearLatex + "\\):",
        latex: remLatex === "0"
          ? "Q_{\\text{cur}} = " + sqTermLatex
          : "Q_{\\text{cur}} = " + sqTermLatex + (remLatex.startsWith("-") ? " " + remLatex : " + " + remLatex)
      });

      canonicalTerms.push({
        zSym: zSym,
        coeff: bpp,
        zForm: zForm,
        zLinearLatex: zLinearLatex
      });

      B = BNext;
    }

    const pLagrange = canonicalTerms.filter(function (t) { return t.coeff > 1e-8; }).length;
    const qLagrange = canonicalTerms.filter(function (t) { return t.coeff < -1e-8; }).length;
    const zSyms = canonicalTerms.map(function (t) { return t.zSym; });
    const zCoeffs = canonicalTerms.map(function (t) { return t.coeff; });
    const lagrangeCanonicalLatex = formatDiagSqSumLatex(zCoeffs, zSyms, fmt);

    return {
      steps: steps,
      canonicalTerms: canonicalTerms,
      lagrangeCanonicalLatex: lagrangeCanonicalLatex,
      pPos: pLagrange,
      qNeg: qLagrange,
      usedAux: auxCount > 0
    };
  }

  function computeSylvesterMinors(A, fmt) {
    const n = A.length;
    const d1 = fmt.snapZero(A[0][0]);
    const d2 = fmt.snapZero(A[0][0] * A[1][1] - A[0][1] * A[1][0]);
    const minors = [
      { order: 1, val: d1, latex: fmt.scalarToLatex(d1), subMatrix: [[A[0][0]]] },
      { order: 2, val: d2, latex: fmt.scalarToLatex(d2), subMatrix: [[A[0][0], A[0][1]], [A[1][0], A[1][1]]] }
    ];
    if (n === 3) {
      const d3 = fmt.snapZero(
        A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
        A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
        A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0])
      );
      minors.push({ order: 3, val: d3, latex: fmt.scalarToLatex(d3), subMatrix: A });
    }
    const isPosDefBySylvester = minors.every(function (m) { return m.val > 1e-8; });
    const isNegDefBySylvester = minors.every(function (m, idx) {
      const sign = (idx + 1) % 2 === 1 ? -1 : 1;
      return sign * m.val > 1e-8;
    });
    return {
      minors: minors,
      isPosDefBySylvester: isPosDefBySylvester,
      isNegDefBySylvester: isNegDefBySylvester
    };
  }

  function computeConicAnalysis(rawValues, nOverride) {
    const fmt = getFmt();
    const dim = (typeof nOverride === "number" ? nOverride : (Array.isArray(rawValues) ? rawValues.length : 2)) === 3 ? 3 : 2;
    const origMatrix = [];
    for (let i = 0; i < dim; i++) {
      origMatrix[i] = [];
      for (let j = 0; j < dim; j++) {
        const v = rawValues && rawValues[i] && rawValues[i][j] !== undefined ? Number(rawValues[i][j]) : 0;
        origMatrix[i][j] = fmt.snapZero(Number.isFinite(v) ? v : 0);
      }
    }

    let isSymmetric = true;
    for (let i = 0; i < dim; i++) {
      for (let j = i + 1; j < dim; j++) {
        if (Math.abs(origMatrix[i][j] - origMatrix[j][i]) > 1e-7) {
          isSymmetric = false;
          break;
        }
      }
      if (!isSymmetric) break;
    }

    const A = [];
    for (let i = 0; i < dim; i++) {
      A[i] = [];
      for (let j = 0; j < dim; j++) {
        A[i][j] = fmt.snapZero((origMatrix[i][j] + origMatrix[j][i]) / 2);
      }
    }

    let eigenvalues = [];
    let eigenLatexList = [];
    let eigenvectors = [];
    let P = [];
    let theta2D = 0;

    if (dim === 2) {
      const a = A[0][0];
      const b = A[0][1];
      const c = A[1][1];
      const tr = fmt.snapZero(a + c);
      const discSq = fmt.snapZero((a - c) * (a - c) + 4 * b * b);
      const disc = Math.sqrt(Math.max(0, discSq));
      const l1 = fmt.snapZero((tr + disc) / 2);
      const l2 = fmt.snapZero((tr - disc) / 2);
      const qRoots = fmt.quadRootToLatex(tr, discSq, 2);

      let e1 = [1, 0];
      let e2 = [0, 1];
      if (Math.abs(b) > 1e-8) {
        const vx = b;
        const vy = l1 - a;
        const len = Math.hypot(vx, vy) || 1;
        e1 = [fmt.snapZero(vx / len), fmt.snapZero(vy / len)];
        if (e1[0] < -1e-8 || (Math.abs(e1[0]) <= 1e-8 && e1[1] < 0)) {
          e1 = [fmt.snapZero(-e1[0]), fmt.snapZero(-e1[1])];
        }
        e2 = [fmt.snapZero(-e1[1]), fmt.snapZero(e1[0])];
      } else if (a < c) {
        e1 = [0, 1];
        e2 = [-1, 0];
      }

      theta2D = Math.atan2(e1[1], e1[0]);
      eigenvalues = [l1, l2];
      eigenLatexList = [qRoots[0], qRoots[1]];
      eigenvectors = [e1, e2];
      P = [
        [e1[0], e2[0]],
        [e1[1], e2[1]]
      ];
    } else {
      const D = A.map(function (r) { return r.slice(); });
      const V = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ];
      for (let iter = 0; iter < 60; iter++) {
        let p = 0;
        let q = 1;
        let maxOff = Math.abs(D[0][1]);
        if (Math.abs(D[0][2]) > maxOff) { p = 0; q = 2; maxOff = Math.abs(D[0][2]); }
        if (Math.abs(D[1][2]) > maxOff) { p = 1; q = 2; maxOff = Math.abs(D[1][2]); }
        if (maxOff < 1e-11) break;

        const diff = D[q][q] - D[p][p];
        let t;
        if (Math.abs(diff) < 1e-12) {
          t = D[p][q] > 0 ? 1 : -1;
        } else {
          const phi = diff / (2 * D[p][q]);
          t = 1 / (Math.abs(phi) + Math.sqrt(phi * phi + 1));
          if (phi < 0) t = -t;
        }
        const c = 1 / Math.sqrt(1 + t * t);
        const s = t * c;
        const tau = s / (1 + c);
        const h = t * D[p][q];
        D[p][p] -= h;
        D[q][q] += h;
        D[p][q] = 0;
        D[q][p] = 0;

        for (let r = 0; r < 3; r++) {
          if (r !== p && r !== q) {
            const g = D[r][p];
            const m = D[r][q];
            D[r][p] = D[p][r] = g - s * (m + g * tau);
            D[r][q] = D[q][r] = m + s * (g - m * tau);
          }
          const vp = V[r][p];
          const vq = V[r][q];
          V[r][p] = vp - s * (vq + vp * tau);
          V[r][q] = vq + s * (vp - vq * tau);
        }
      }

      const pairs = [0, 1, 2].map(function (idx) {
        return {
          lam: fmt.snapZero(D[idx][idx]),
          vec: [V[0][idx], V[1][idx], V[2][idx]]
        };
      });
      pairs.sort(function (x, y) { return y.lam - x.lam; });

      eigenvalues = pairs.map(function (pr) { return pr.lam; });
      eigenLatexList = eigenvalues.map(function (lam) { return fmt.scalarToLatex(lam); });

      const n1 = normVec(pairs[0].vec) || 1;
      const e1 = pairs[0].vec.map(function (x) { return fmt.snapZero(x / n1); });
      const n2 = normVec(pairs[1].vec) || 1;
      const e2 = pairs[1].vec.map(function (x) { return fmt.snapZero(x / n2); });
      const e3Raw = cross3(e1, e2);
      const n3 = normVec(e3Raw) || 1;
      const e3 = e3Raw.map(function (x) { return fmt.snapZero(x / n3); });
      eigenvectors = [e1, e2, e3];
      P = [
        [e1[0], e2[0], e3[0]],
        [e1[1], e2[1], e3[1]],
        [e1[2], e2[2], e3[2]]
      ];
    }

    const pPos = eigenvalues.filter(function (x) { return x > 1e-6; }).length;
    const qNeg = eigenvalues.filter(function (x) { return x < -1e-6; }).length;
    const rank = pPos + qNeg;

    let definiteness = "";
    let badgeTone = "primary";
    if (rank === 0) {
      definiteness = "Dạng toàn phương không";
      badgeTone = "danger";
    } else if (pPos === dim) {
      definiteness = "Xác định dương";
      badgeTone = "success";
    } else if (qNeg === dim) {
      definiteness = "Xác định âm";
      badgeTone = "danger";
    } else if (pPos > 0 && qNeg === 0) {
      definiteness = "Bán xác định dương";
      badgeTone = "primary";
    } else if (qNeg > 0 && pPos === 0) {
      definiteness = "Bán xác định âm";
      badgeTone = "warning";
    } else {
      definiteness = "Đổi dấu";
      badgeTone = "warning";
    }

    let conicType = "";
    if (dim === 2) {
      const l1 = eigenvalues[0];
      const l2 = eigenvalues[1];
      if (l1 > 1e-6 && l2 > 1e-6) {
        conicType = Math.abs(l1 - l2) < 1e-6 ? "Đường tròn" : "Elip";
      } else if (l1 * l2 < -1e-6) {
        conicType = "Hyperbol";
      } else if (pPos === 1 && rank === 1) {
        conicType = "Cặp đường thẳng song song";
      } else if (rank === 0) {
        conicType = "Tập rỗng (Dạng không)";
      } else {
        conicType = "Tập mức = 1 rỗng trên R²";
      }
    } else {
      if (pPos === 3) {
        conicType = "Mặt Elipsoid";
      } else if (pPos === 2 && qNeg === 1) {
        conicType = "Hyperboloid 1 tầng";
      } else if (pPos === 1 && qNeg === 2) {
        conicType = "Hyperboloid 2 tầng";
      } else if (pPos === 2 && qNeg === 0) {
        conicType = "Mặt trụ Elip";
      } else if (pPos === 1 && qNeg === 1) {
        conicType = "Mặt trụ Hyperbol";
      } else if (pPos === 1 && qNeg === 0) {
        conicType = "Cặp mặt phẳng song song";
      } else {
        conicType = "Tập mức = 1 rỗng trên R³";
      }
    }

    const xSyms = dim === 3 ? ["x_1", "x_2", "x_3"] : ["x_1", "x_2"];
    const ySyms = dim === 3 ? ["Y_1", "Y_2", "Y_3"] : ["Y_1", "Y_2"];
    const qBodyLatex = formatQuadPolyLatex(A, xSyms, fmt);
    const qOrigLatex = "Q(" + xSyms.join(",\\;") + ") = " + qBodyLatex;
    const canBodyLatex = formatDiagSqSumLatex(eigenvalues, ySyms, fmt);
    const canonicalFormLatex = "Q(" + ySyms.join(",\\;") + ") = " + canBodyLatex;
    const canonicalLatex = canBodyLatex + " = 1";

    const lagrange = computeLagrangeReduction(A, fmt);
    const sylvester = computeSylvesterMinors(A, fmt);

    return {
      dim: dim,
      is3D: dim === 3,
      origMatrix: origMatrix,
      matrix: A,
      isSymmetric: isSymmetric,
      eigenvalues: eigenvalues,
      eigenLatexList: eigenLatexList,
      eigenvectors: eigenvectors,
      P: P,
      theta2D: theta2D,
      thetaDeg: Number(((theta2D * 180) / Math.PI).toFixed(1)),
      pPos: pPos,
      qNeg: qNeg,
      rank: rank,
      definiteness: definiteness,
      badgeTone: badgeTone,
      conicType: conicType,
      xSyms: xSyms,
      ySyms: ySyms,
      qBodyLatex: qBodyLatex,
      qOrigLatex: qOrigLatex,
      canBodyLatex: canBodyLatex,
      canonicalFormLatex: canonicalFormLatex,
      canonicalLatex: canonicalLatex,
      lagrange: lagrange,
      sylvester: sylvester
    };
  }

  function buildConicSidebarCard(analysis) {
    const fmt = getFmt();
    const primaryRows = [
      {
        labelHtml: "Dạng chính tắc trực giao (tập mức = 1: " + analysis.conicType + ")",
        latex: analysis.canonicalFormLatex
      },
      {
        labelHtml: analysis.isSymmetric
          ? "Ma trận đối xứng liên kết của dạng toàn phương"
          : "Ma trận đối xứng hóa A = 1/2 (A₀ + A₀ᵀ)",
        latex: "A = " + fmt.matrixToLatex(analysis.matrix),
        noteHtml: !analysis.isSymmetric
          ? "Ma trận đầu vào chưa đối xứng; đã trích xuất phần đối xứng giữ nguyên giá trị \\(\\mathbf{x}^T A \\mathbf{x}\\)."
          : ""
      }
    ];

    const secondaryRows = [
      {
        labelHtml: "Phép đổi biến trực giao x = P Y (det P = +1)",
        latex: "P = " + fmt.matrixToLatex(analysis.P)
      },
      {
        labelHtml: "Cặp chỉ số quán tính (n₊, n₋) và hạng",
        latex: "(n_+,\\; n_-) = (" + analysis.pPos + ",\\; " + analysis.qNeg + "),\\quad \\rank(Q) = " + analysis.rank
      }
    ];

    return {
      titleLeft: analysis.definiteness,
      badgeRight: analysis.conicType,
      badgeTone: analysis.badgeTone,
      primaryRows: primaryRows,
      secondarySection: {
        titleHtml: "Ma trận trục chính & Luật quán tính Sylvester",
        rows: secondaryRows
      }
    };
  }

  function renderConicInfoCard(matItem, analysis) {
    const api = getResultCardApi();
    if (!api.ResultCard || !analysis) return "";
    return api.ResultCard.mount("result_conic_info", buildConicSidebarCard(analysis));
  }

  function buildMethod1Html(matItem, analysis, fmt) {
    const n = analysis.dim;
    const ALatex = fmt.matrixToLatex(analysis.matrix);
    const PLatex = fmt.matrixToLatex(analysis.P);
    const sections = [];

    const step1Parts = [];
    if (!analysis.isSymmetric) {
      const origLatex = fmt.matrixToLatex(analysis.origMatrix);
      step1Parts.push(
        "<div class=\"sol-text\">Ma trận đầu vào \\(A_0\\) chưa đối xứng. Vì \\(\\mathbf{x}^T A_0 \\mathbf{x} = \\mathbf{x}^T A_0^T \\mathbf{x}\\), dạng toàn phương được xác định duy nhất bởi ma trận đối xứng liên kết \\(A = \\frac{1}{2}(A_0 + A_0^T)\\):</div>",
        fmt.mathBlockHtml("A_0 = " + origLatex + " \\implies A = \\frac{1}{2}\\left(A_0 + A_0^T\\right) = " + ALatex)
      );
    } else {
      step1Parts.push(
        "<div class=\"sol-text\">Ma trận đối xứng thực gắn với dạng toàn phương trên \\(\\mathbb{R}^{" + n + "}\\) là:</div>",
        fmt.mathBlockHtml("A = " + ALatex)
      );
    }
    step1Parts.push(
      "<div class=\"sol-text\">Khai triển biểu thức giải tích \\(Q(\\mathbf{x}) = \\mathbf{x}^T A \\mathbf{x}\\):</div>",
      fmt.mathBlockHtml(analysis.qOrigLatex)
    );
    sections.push(fmt.stepSectionHtml(
      "Bước 1: Ma trận đối xứng của dạng toàn phương",
      step1Parts
    ));

    const eigListTex = analysis.eigenLatexList.map(function (tex, idx) {
      return "\\lambda_{" + (idx + 1) + "} = " + tex;
    }).join(",\\qquad ");

    const eColsTex = analysis.eigenvectors.map(function (v, idx) {
      return "\\mathbf{e}_{" + (idx + 1) + "} = " + fmt.vecTupleLatex(v, { colMode: true });
    }).join(",\\qquad ");

    sections.push(fmt.stepSectionHtml(
      "Bước 2: Phổ trị riêng thực và cơ sở trực chuẩn các trục chính",
      [
        "<div class=\"sol-text\">Theo Định lý Phổ cho ma trận đối xứng thực \\(A = A^T\\), mọi nghiệm của \\(\\det(A - \\lambda I_{" + n + "}) = 0\\) đều là số thực:</div>",
        fmt.mathBlockHtml(eigListTex),
        "<div class=\"sol-text\">Giải các không gian riêng \\(\\ker(A - \\lambda_i I_{" + n + "})\\) và trực chuẩn hóa (sắp thứ tự sao cho \\(\\det(P) = +1\\) bảo toàn định hướng không gian), ta thu được hệ cơ sở trực chuẩn chỉ phương các trục đối xứng chính:</div>",
        fmt.mathBlockHtml(eColsTex)
      ]
    ));

    const dDiagEntries = analysis.eigenLatexList.join(",\\; ");
    sections.push(fmt.stepSectionHtml(
      "Bước 3: Đổi biến trực giao \\(\\mathbf{x} = P\\mathbf{Y}\\) và phân loại hình học",
      [
        "<div class=\"sol-text\">Lập ma trận trực giao \\(P \\in SO(" + n + ")\\) thỏa \\(P^T A P = D = \\diag(" + dDiagEntries + ")\\):</div>",
        fmt.mathBlockHtml("P = " + PLatex + ",\\qquad \\det(P) = +1"),
        "<div class=\"sol-text\">Thực hiện phép đổi biến trực giao \\(\\mathbf{x} = P\\mathbf{Y}\\), toàn bộ số hạng chéo triệt tiêu và dạng toàn phương trở thành dạng chính tắc:</div>",
        fmt.mathBlockHtml(analysis.canonicalFormLatex),
        "<div class=\"sol-text\">Đối với tập mức \\(Q(\\mathbf{x}) = 1\\): phương trình chính tắc là \\(" + analysis.canonicalLatex + "\\), phân loại hình học là <b>" + analysis.conicType + "</b> và tính chất dấu là <b>" + analysis.definiteness + "</b>.</div>"
      ]
    ));

    return fmt.wrapStepContainer(sections.join(""));
  }

  function buildMethod2Html(matItem, analysis, fmt) {
    const lag = analysis.lagrange;
    const sylv = analysis.sylvester;
    const sections = [];

    const lagParts = [
      "<div class=\"sol-text\">Xuất phát từ biểu thức \\(" + analysis.qOrigLatex + "\\), ta biến đổi đại số đưa về tổng các bình phương độc lập mà không cần giải trị riêng:</div>"
    ];

    if (lag.steps.length === 0) {
      lagParts.push(
        "<div class=\"sol-text\">Dạng toàn phương bằng \\(0\\) đồng nhất tại mọi \\(\\mathbf{x}\\).</div>",
        fmt.mathBlockHtml("Q(\\mathbf{x}) = 0")
      );
    } else {
      for (let i = 0; i < lag.steps.length; i++) {
        const st = lag.steps[i];
        lagParts.push(
          "<div class=\"sol-text\">" + st.descHtml + "</div>",
          fmt.mathBlockHtml(st.latex)
        );
      }

      const subLines = lag.canonicalTerms.map(function (t) {
        return t.zSym + " &= " + t.zLinearLatex;
      });
      lagParts.push(
        "<div class=\"sol-text\">Vậy với phép đổi biến tuyến tính không suy biến:</div>",
        fmt.mathBlockHtml("\\left\\{\\begin{aligned} " + subLines.join(" \\\\[3pt] ") + " \\end{aligned}\\right."),
        "<div class=\"sol-text\">Ta thu được dạng chính tắc Lagrange:</div>",
        fmt.mathBlockHtml("Q(\\mathbf{Z}) = " + lag.lagrangeCanonicalLatex)
      );
    }

    sections.push(fmt.stepSectionHtml(
      "Bước 1: Đưa về dạng chính tắc bằng phương pháp nhóm bình phương Lagrange",
      lagParts
    ));

    const minorLines = sylv.minors.map(function (m) {
      if (m.order === 1) {
        return "\\Delta_1 = a_{11} = " + m.latex;
      }
      return "\\Delta_{" + m.order + "} = " + fmt.matrixToLatex(m.subMatrix, { bracket: "vmatrix" }) + " = " + m.latex;
    });

    let sylvVerdict = "";
    if (sylv.isPosDefBySylvester) {
      sylvVerdict = "Mọi định thức con chính dẫn đầu đều dương (\\(\\Delta_k > 0\\) với mọi \\(k = 1, \\dots, " + analysis.dim + "\\)). Theo Tiêu chuẩn Sylvester, dạng toàn phương <b>xác định dương</b>.";
    } else if (sylv.isNegDefBySylvester) {
      sylvVerdict = "Các định thức con chính dẫn đầu đan dấu \\((-1)^k \\Delta_k > 0\\) với mọi \\(k = 1, \\dots, " + analysis.dim + "\\). Theo Tiêu chuẩn Sylvester, dạng toàn phương <b>xác định âm</b>.";
    } else {
      sylvVerdict = "Dãy định thức con chính dẫn đầu không thỏa điều kiện dương hẳn hay đan dấu chặt; ta kết luận đầy đủ bản chất dấu nhờ Luật quán tính Sylvester ở Bước 3.";
    }

    sections.push(fmt.stepSectionHtml(
      "Bước 2: Xét các định thức con chính dẫn đầu (Tiêu chuẩn Sylvester)",
      [
        "<div class=\"sol-text\">Tính lần lượt các định thức con chính góc trên bên trái của ma trận đối xứng \\(A\\):</div>",
        fmt.mathBlockHtml(minorLines.join(",\\qquad ")),
        "<div class=\"sol-text\">" + sylvVerdict + "</div>"
      ]
    ));

    sections.push(fmt.stepSectionHtml(
      "Bước 3: Đối chiếu Luật quán tính Sylvester",
      [
        "<div class=\"sol-text\">Theo Luật quán tính Sylvester, số hệ số dương \\(n_+\\) và số hệ số âm \\(n_-\\) trong dạng chính tắc là bất biến đối với mọi phép đổi biến tuyến tính khả nghịch (cả phép quay trực giao lẫn phép biến đổi Lagrange):</div>",
        fmt.mathBlockHtml(
          "(n_+,\\; n_-)_{\\mathrm{orth}} = (" + analysis.pPos + ",\\; " + analysis.qNeg + ") = (" + lag.pPos + ",\\; " + lag.qNeg + ") = (n_+,\\; n_-)_{\\mathrm{Lagrange}}"
        ),
        "<div class=\"sol-text\">Hạng của dạng toàn phương là \\(\\rank(Q) = n_+ + n_- = " + analysis.rank + "\\), khẳng định phân loại <b>" + analysis.definiteness + "</b> hoàn toàn nhất quán giữa cả hai phương pháp.</div>"
      ]
    ));

    return fmt.wrapStepContainer(sections.join(""));
  }

  function buildConicSolution(matItem, rawValues, nOverride) {
    const fmt = getFmt();
    const analysis = (rawValues && rawValues.lagrange && rawValues.sylvester)
      ? rawValues
      : computeConicAnalysis(rawValues || (matItem && matItem.values) || [[1, 0], [0, 1]], nOverride);

    const content1 = buildMethod1Html(matItem, analysis, fmt);
    const content2 = buildMethod2Html(matItem, analysis, fmt);

    return {
      analysis: analysis,
      cardOptions: buildConicSidebarCard(analysis),
      logLatex: analysis.canonicalFormLatex + "\\; (" + analysis.pPos + ",\\," + analysis.qNeg + ")",
      modalConfig: {
        title: "Chéo hóa trực giao & Chính tắc hóa Dạng toàn phương",
        math: "Q(\\mathbf{x}) = \\mathbf{x}^T A \\mathbf{x} = " + analysis.qBodyLatex,
        tab1Label: "Cách 1: Chéo hóa trực giao (Trục chính)",
        tab2Label: "Cách 2: Biến đổi Lagrange & Tiêu chuẩn Sylvester",
        showSubTabs: false,
        content1: content1,
        content2: content2,
        content2Sub: ""
      }
    };
  }

  function getCurrentConicSig() {
    const api = getResultCardApi();
    if (typeof window === "undefined" || !window.App) return "";
    const matrices = Array.isArray(window.App.matrixList) ? window.App.matrixList : [];
    const sel = $("conicMatrixSelect");
    const item = sel && sel.value
      ? matrices.find(function (m) { return String(m.id) === String(sel.value); })
      : matrices[0];
    if (!item) return "no-matrix";
    const vals = typeof item.evalMatrix === "function" ? item.evalMatrix() : item.values;
    const matSig = api.SolutionSync ? api.SolutionSync.matrixSig(vals) : "";
    return String(item.id) + ":" + String(item.name || "A") + ":" + matSig;
  }

  function stopConicAnimation() {
    if (typeof window !== "undefined" && window.App && window.App.ConicAnimator && window.App.ConicAnimator.isActive()) {
      window.App.ConicAnimator.stop();
    }
  }

  const Topic7Module = {
    _isInitialized: false,
    _lastAnalysis: null,

    init: function () {
      if (this._isInitialized || typeof document === "undefined") return;
      const btnDraw = $("btnConicDraw");
      const btnAnimate = $("btnConicAnimate");
      const btnSol = $("btnConicSolution");
      if (!btnDraw && !btnAnimate && !btnSol) return;
      this._isInitialized = true;

      const self = this;

      if (typeof App.refreshConicMatrixDropdown === "function") {
        App.refreshConicMatrixDropdown();
      }

      const sel = $("conicMatrixSelect");
      const previewEl = $("conicMatrixPreview");
      if (sel) {
        sel.addEventListener("change", function () {
          try { stopConicAnimation(); } catch (_) {}
          const selData = App.getOrEnsureSelectedSquareMatrix
            ? App.getOrEnsureSelectedSquareMatrix("conicMatrixSelect", { requireSymmetric: true })
            : null;
          if (selData && typeof App.renderMatrixPreviewGrid === "function") {
            App.renderMatrixPreviewGrid(previewEl, selData.item, { isConic: true });
          }
          const resBox = $("result_conic_info");
          if (resBox && resBox.style.display !== "none" && resBox.innerHTML.trim() !== "") {
            self.execute({ logHistory: false });
          }
        });
      }

      if (btnDraw) {
        btnDraw.addEventListener("click", function () {
          self.execute({ logHistory: true });
        });
      }

      if (btnAnimate) {
        btnAnimate.addEventListener("click", function () {
          const selData = App.getOrEnsureSelectedSquareMatrix
            ? App.getOrEnsureSelectedSquareMatrix("conicMatrixSelect", { requireSymmetric: true })
            : null;
          if (!selData) return;

          if (window.App && App.ConicAnimator) {
            if (App.ConicAnimator.isActive()) {
              App.ConicAnimator.stop();
            } else {
              self.execute({ logHistory: false });
              App.ConicAnimator.start(selData.item);
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
              getSig: getCurrentConicSig,
              recomputeStatic: function () {
                self.execute({ silent: true, logHistory: false });
              },
              emptyTitle: "Dạng toàn phương & Thiết diện Conic",
              emptyHintHtml: "Hãy tạo một <b>ma trận vuông cấp 2 hoặc cấp 3</b> ở tab Đối tượng để khảo sát dạng toàn phương."
            });
          }
        });
      }
    },

    execute: function (opts) {
      const options = opts || {};
      if (!this._isInitialized) this.init();

      const selData = App.getOrEnsureSelectedSquareMatrix
        ? App.getOrEnsureSelectedSquareMatrix("conicMatrixSelect", { requireSymmetric: true })
        : null;
      if (!selData) return null;

      const pack = buildConicSolution(selData.item, selData.values, selData.n);
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

      renderConicInfoCard(selData.item, analysis);

      const api = getResultCardApi();
      if (api.SolutionSync) {
        api.SolutionSync.save(SYNC_KEY, getCurrentConicSig(), pack.modalConfig);
      }
      if (typeof App.openSolutionPanel === "function") {
        App.openSolutionPanel(Object.assign({}, pack.modalConfig, { autoOpen: false }));
      }

      if (options.logHistory !== false && window.App && window.App.PaperLogger && typeof window.App.PaperLogger.log === "function") {
        window.App.PaperLogger.log(
          "Dạng toàn phương & Thiết diện Conic",
          pack.logLatex,
          "",
          pack.modalConfig,
          { type: "quadratic_form", matrixId: selData.item.id }
        );
      }

      const previewEl = $("conicMatrixPreview");
      if (previewEl && typeof App.renderMatrixPreviewGrid === "function") {
        App.renderMatrixPreviewGrid(previewEl, selData.item, { isConic: true });
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
      if (taskId === "quadratic_form_conic" || taskId === "s28" || taskId === "s29") {
        if (!this._isInitialized) this.init();
        if (typeof App.refreshConicMatrixDropdown === "function") {
          App.refreshConicMatrixDropdown();
        }
      } else {
        try { stopConicAnimation(); } catch (_) {}
      }
    }
  };

  if (typeof window !== "undefined") {
    window.App = window.App || {};
    if (typeof window.App.registerTopicModule === "function") {
      window.App.registerTopicModule("t7", Topic7Module);
    } else if (typeof window.addEventListener === "function") {
      window.addEventListener("DOMContentLoaded", function () {
        if (typeof window.App.registerTopicModule === "function") {
          window.App.registerTopicModule("t7", Topic7Module);
        }
      });
    }
  }

  return {
    computeLagrangeReduction: computeLagrangeReduction,
    computeSylvesterMinors: computeSylvesterMinors,
    computeConicAnalysis: computeConicAnalysis,
    buildConicSidebarCard: buildConicSidebarCard,
    buildConicSolution: buildConicSolution,
    renderConicInfoCard: renderConicInfoCard,
    stopConicAnimation: stopConicAnimation,
    Topic7Module: Topic7Module
  };
});
