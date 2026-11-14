(function (root, factory) {
  const api = factory();
  if (typeof window !== "undefined") {
    window.App = window.App || {};
    window.App.LatexFmt = api;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const KATEX_MACROS = {
    "\\R": "\\mathbb{R}",
    "\\C": "\\mathbb{C}",
    "\\N": "\\mathbb{N}",
    "\\Z": "\\mathbb{Z}",
    "\\Q": "\\mathbb{Q}",
    "\\rank": "\\operatorname{rank}",
    "\\Im": "\\operatorname{Im}",
    "\\Ker": "\\ker",
    "\\span": "\\operatorname{span}",
    "\\proj": "\\operatorname{proj}",
    "\\adj": "\\operatorname{adj}",
    "\\diag": "\\operatorname{diag}",
    "\\tr": "\\operatorname{tr}",
    "\\nullity": "\\operatorname{nullity}"
  };

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function gcdInt(a, b) {
    let x = Math.abs(Math.trunc(a));
    let y = Math.abs(Math.trunc(b));
    while (y !== 0) {
      const t = x % y;
      x = y;
      y = t;
    }
    return x || 1;
  }

  function lcmInt(a, b) {
    const x = Math.abs(Math.trunc(a));
    const y = Math.abs(Math.trunc(b));
    if (x === 0 || y === 0) return 1;
    return Math.round((x / gcdInt(x, y)) * y);
  }

  function snapZero(x, eps) {
    const tol = typeof eps === "number" ? eps : 1e-10;
    const n = Number(x);
    if (!Number.isFinite(n)) return 0;
    if (Math.abs(n) <= tol) return 0;
    const rounded = Math.round(n);
    if (Math.abs(n - rounded) <= tol) {
      return rounded === 0 ? 0 : rounded;
    }
    return n;
  }

  function toFraction(x, maxDen, eps) {
    const limitDen = typeof maxDen === "number" ? maxDen : 10000;
    const tol = typeof eps === "number" ? eps : 1e-9;
    const nVal = Number(x);
    if (!Number.isFinite(nVal)) return null;
    if (Math.abs(nVal) <= tol) return { n: 0, d: 1 };

    const sign = nVal < 0 ? -1 : 1;
    const ax = Math.abs(nVal);
    const nearInt = Math.round(ax);
    if (Math.abs(ax - nearInt) <= tol) {
      return { n: sign * nearInt, d: 1 };
    }

    let a0 = Math.floor(ax);
    let p0 = 1;
    let q0 = 0;
    let p1 = a0;
    let q1 = 1;
    let frac = ax - a0;

    for (let iter = 0; iter < 32; iter++) {
      if (frac <= 1e-13) break;
      const inv = 1 / frac;
      const a = Math.floor(inv);
      const p2 = a * p1 + p0;
      const q2 = a * q1 + q0;
      if (q2 > limitDen || !Number.isSafeInteger(p2) || !Number.isSafeInteger(q2)) {
        break;
      }
      p0 = p1;
      q0 = q1;
      p1 = p2;
      q1 = q2;
      if (Math.abs(p1 / q1 - ax) <= tol) {
        const g = gcdInt(p1, q1);
        return { n: sign * (p1 / g), d: q1 / g };
      }
      frac = inv - a;
    }

    if (q1 > 0 && q1 <= limitDen && Math.abs(p1 / q1 - ax) <= tol) {
      const g = gcdInt(p1, q1);
      return { n: sign * (p1 / g), d: q1 / g };
    }
    return null;
  }

  function largestSquareFactor(n) {
    let rem = Math.abs(Math.trunc(n));
    let root = 1;
    for (let k = 2; k * k <= rem; k++) {
      while (rem % (k * k) === 0) {
        rem = Math.trunc(rem / (k * k));
        root *= k;
      }
    }
    return { root: root, rest: rem };
  }

  function toPositiveSurdBody(ax, eps) {
    const tol = typeof eps === "number" ? eps : 1e-8;
    if (!Number.isFinite(ax) || ax <= tol) return null;
    if (Math.abs(ax - Math.round(ax)) <= tol) return null;

    // Fast path: check if ax^2 is rational (covers p*sqrt(r)/q directly in O(1) continued fraction!)
    const sq = ax * ax;
    const ratSq = toFraction(sq, 250000, 1e-7);
    if (ratSq && ratSq.n > 0 && ratSq.d > 0) {
      // ax = sqrt(ratSq.n / ratSq.d) = sqrt(ratSq.n * ratSq.d) / ratSq.d
      const prod = ratSq.n * ratSq.d;
      if (prod <= 1000000 && Number.isSafeInteger(prod)) {
        const sqf = largestSquareFactor(prod);
        if (sqf.rest > 1 && sqf.rest <= 2000) {
          const g = gcdInt(sqf.root, ratSq.d);
          const num = sqf.root / g;
          const den = ratSq.d / g;
          if (num <= 200 && den <= 200) {
            const val = (num * Math.sqrt(sqf.rest)) / den;
            if (Math.abs(val - ax) <= tol) {
              const radPart = (num === 1 ? "" : String(num)) + "\\sqrt{" + sqf.rest + "}";
              return den === 1 ? radPart : "\\frac{" + radPart + "}{" + den + "}";
            }
          }
        }
      }
    }
    return null;
  }

  function toSurdLatex(x, eps) {
    const v = snapZero(x, 1e-10);
    if (v === 0) return null;
    const sign = v < 0 ? "-" : "";
    const body = toPositiveSurdBody(Math.abs(v), eps);
    return body ? sign + body : null;
  }

  function cleanStringMath(str) {
    let s = String(str).trim();
    if (!s || s === "-0") return "0";
    s = s.replace(/\u2212/g, "-");
    s = s.replace(/(\d*)√(\d+)/g, function (_, c, r) {
      return (c || "") + "\\sqrt{" + r + "}";
    });
    const simpleFrac = s.match(/^(-?\d+)\s*\/\s*(\d+)$/);
    if (simpleFrac) {
      const n = parseInt(simpleFrac[1], 10);
      const d = parseInt(simpleFrac[2], 10);
      if (d > 0) {
        if (n === 0) return "0";
        const g = gcdInt(n, d);
        const rn = Math.abs(n) / g;
        const rd = d / g;
        const sgn = n < 0 ? "-" : "";
        return rd === 1 ? sgn + rn : sgn + "\\frac{" + rn + "}{" + rd + "}";
      }
    }
    return s;
  }

  function scalarToLatex(x, opts) {
    const options = opts || {};
    const preferFraction = options.preferFraction !== false;
    const preferSurd = options.preferSurd !== false;
    const approxDigits = typeof options.approxDigits === "number" ? options.approxDigits : 4;
    const parenNeg = !!options.parenNeg;
    const plusPrefix = !!options.plusPrefix;

    if (typeof x === "string") {
      const numTry = Number(x);
      if (!Number.isFinite(numTry) || /[a-zA-Z\\√]/.test(x)) {
        const cleaned = cleanStringMath(x);
        if (parenNeg && cleaned.startsWith("-")) {
          return "\\left(" + cleaned + "\\right)";
        }
        return cleaned;
      }
      x = numTry;
    }

    const v = snapZero(x, 1e-10);
    if (v === 0) {
      return plusPrefix ? "+0" : "0";
    }

    const isNeg = v < 0;
    const ax = Math.abs(v);
    const sign = isNeg ? "-" : (plusPrefix ? "+" : "");
    let body = null;

    if (Math.abs(ax - Math.round(ax)) <= 1e-9) {
      body = String(Math.round(ax));
    }

    if (!body && preferFraction) {
      const rat = toFraction(ax, options.maxDen || 10000, 1e-9);
      if (rat) {
        body = rat.d === 1 ? String(rat.n) : "\\frac{" + rat.n + "}{" + rat.d + "}";
      }
    }

    if (!body && preferSurd) {
      body = toPositiveSurdBody(ax, 1e-8);
    }

    if (!body) {
      if (ax >= 1e6 || ax < 1e-5) {
        const expParts = ax.toExponential(3).split("e");
        const mant = parseFloat(expParts[0]).toString();
        const expNum = parseInt(expParts[1], 10);
        body = mant + " \\cdot 10^{" + expNum + "}";
      } else {
        const dec = ax.toFixed(approxDigits).replace(/\.?0+$/, "");
        if (dec === "0" || dec === "") return "0";
        body = dec;
      }
    }

    const out = sign + body;
    if (parenNeg && isNeg) {
      return "\\left(" + out + "\\right)";
    }
    return out;
  }

  function complexToLatex(re, im, opts) {
    const r = snapZero(re, 1e-9);
    const m = snapZero(im, 1e-9);
    if (m === 0) return scalarToLatex(r, opts);
    const absM = Math.abs(m);
    const imUnit = Math.abs(absM - 1) <= 1e-9 ? "i" : scalarToLatex(absM, opts) + "i";
    if (r === 0) {
      return (m < 0 ? "-" : "") + imUnit;
    }
    const reTex = scalarToLatex(r, opts);
    return reTex + (m < 0 ? " - " : " + ") + imUnit;
  }

  function quadRootToLatex(negB, disc, twoA) {
    const denom = Math.round(twoA);
    const nb = snapZero(negB, 1e-9);
    const d = snapZero(disc, 1e-9);
    if (Math.abs(twoA - denom) > 1e-8 || denom === 0 || Math.abs(nb - Math.round(nb)) > 1e-8 || Math.abs(d - Math.round(d)) > 1e-8) {
      if (d >= 0) {
        const s = Math.sqrt(Math.max(0, d));
        return [
          scalarToLatex((nb + s) / twoA),
          scalarToLatex((nb - s) / twoA)
        ];
      }
      const re = nb / twoA;
      const im = Math.sqrt(-d) / Math.abs(twoA);
      return [
        complexToLatex(re, im),
        complexToLatex(re, -im)
      ];
    }

    let bInt = Math.round(nb);
    let dInt = Math.round(d);
    let a2 = denom;
    if (a2 < 0) {
      bInt = -bInt;
      a2 = -a2;
    }

    const isComplex = dInt < 0;
    const sqf = largestSquareFactor(Math.abs(dInt));
    if (dInt === 0) {
      const val = scalarToLatex(bInt / a2);
      return [val, val];
    }
    if (!isComplex && sqf.rest === 1) {
      return [
        scalarToLatex((bInt + sqf.root) / a2),
        scalarToLatex((bInt - sqf.root) / a2)
      ];
    }

    const g = gcdInt(gcdInt(bInt, sqf.root), a2);
    const bRed = bInt / g;
    const rCoef = sqf.root / g;
    const denRed = a2 / g;

    const radCore = (sqf.rest === 1 ? (rCoef === 1 ? "" : String(rCoef)) : ((rCoef === 1 ? "" : String(rCoef)) + "\\sqrt{" + sqf.rest + "}")) + (isComplex ? "i" : "");
    const buildBranch = function (plus) {
      const op = plus ? "+" : "-";
      if (bRed === 0) {
        const prefix = plus ? "" : "-";
        return denRed === 1 ? prefix + radCore : prefix + "\\frac{" + radCore + "}{" + denRed + "}";
      }
      const numStr = String(bRed) + " " + op + " " + radCore;
      return denRed === 1 ? numStr : "\\frac{" + numStr + "}{" + denRed + "}";
    };

    return [buildBranch(true), buildBranch(false)];
  }

  function normalizeVecSymbol(raw, bold) {
    const useBold = bold !== false;
    if (typeof raw === "number") {
      return (useBold ? "\\mathbf{v}" : "v") + "_{" + raw + "}";
    }
    let s = String(raw || "v").trim();
    s = s.replace(/^\\(?:vec|mathbf|boldsymbol)\{([\s\S]+)\}$/, "$1").trim();
    const m1 = s.match(/^([a-zA-Z]+)_\{([^}]+)\}$/);
    if (m1) {
      return (useBold ? "\\mathbf{" + m1[1] + "}" : m1[1]) + "_{" + m1[2] + "}";
    }
    const m2 = s.match(/^([a-zA-Z]+)_([a-zA-Z0-9]+)$/);
    if (m2) {
      return (useBold ? "\\mathbf{" + m2[1] + "}" : m2[1]) + "_{" + m2[2] + "}";
    }
    const m3 = s.match(/^([a-zA-Z]+)(\d+)$/);
    if (m3) {
      return (useBold ? "\\mathbf{" + m3[1] + "}" : m3[1]) + "_{" + m3[2] + "}";
    }
    if (/^[a-zA-Z]+$/.test(s)) {
      return useBold ? "\\mathbf{" + s + "}" : s;
    }
    return s;
  }

  function normalizeMatSymbol(raw, fallback) {
    const fb = fallback || "A";
    const s = String(raw || fb).trim();
    if (!s) return fb;
    const m1 = s.match(/^([A-Za-z]+)_\{([A-Za-z0-9]+)\}$/);
    if (m1) return m1[1] + "_{" + m1[2] + "}";
    const m2 = s.match(/^([A-Za-z]+)_([A-Za-z0-9]+)$/);
    if (m2) return m2[1] + "_{" + m2[2] + "}";
    const m3 = s.match(/^([A-Za-z]+)(\d+)$/);
    if (m3) return m3[1] + "_{" + m3[2] + "}";
    if (/^[A-Za-z]+$/.test(s)) return s;
    return fb;
  }

  function linearCombLatex(coeffs, symbols, opts) {
    const options = opts || {};
    const tol = typeof options.eps === "number" ? options.eps : 1e-9;
    const zeroFallback = options.zeroFallback !== undefined ? options.zeroFallback : "\\mathbf{0}";
    const keepZeros = !!options.keepZeros;
    const parts = [];

    for (let i = 0; i < coeffs.length; i++) {
      const c = snapZero(coeffs[i], tol);
      const sym = symbols && symbols[i] !== undefined ? String(symbols[i]) : "";
      if (!keepZeros && Math.abs(c) <= tol) continue;

      const isFirst = parts.length === 0;
      const ac = Math.abs(c);
      const isUnit = sym !== "" && Math.abs(ac - 1) <= tol;

      if (isFirst) {
        if (c === 0) {
          parts.push("0" + (sym ? " \\cdot " + sym : ""));
        } else if (isUnit) {
          parts.push((c < 0 ? "-" : "") + sym);
        } else {
          const cTex = scalarToLatex(c, options);
          const sep = sym && cTex.includes("\\frac") ? "\\," : (sym ? "" : "");
          parts.push(cTex + sep + sym);
        }
      } else {
        const op = c < 0 ? " - " : " + ";
        if (c === 0) {
          parts.push(" + 0" + (sym ? " \\cdot " + sym : ""));
        } else if (isUnit) {
          parts.push(op + sym);
        } else {
          const cTex = scalarToLatex(ac, options);
          const sep = sym && cTex.includes("\\frac") ? "\\," : "";
          parts.push(op + cTex + sep + sym);
        }
      }
    }

    return parts.length > 0 ? parts.join("") : zeroFallback;
  }

  function vecTupleLatex(vec, opts) {
    const options = opts || {};
    if (!Array.isArray(vec) || vec.length === 0) {
      return options.colMode ? "\\begin{bmatrix} 0 \\end{bmatrix}" : "\\left(0\\right)";
    }
    const items = vec.map(function (val) {
      return scalarToLatex(val, options);
    });
    const hasTall = items.some(function (t) {
      return t.includes("\\frac") || t.includes("\\sqrt");
    });
    if (options.colMode) {
      const env = options.bracket || "bmatrix";
      const rowJoin = hasTall ? " \\\\[4pt] " : " \\\\ ";
      return "\\begin{" + env + "} " + items.join(rowJoin) + " \\end{" + env + "}";
    }
    if (options.squareBracket) {
      return "\\left[ " + items.join(",\\; ") + " \\right]";
    }
    return "\\left( " + items.join(",\\; ") + " \\right)";
  }

  function matrixToLatex(M, opts) {
    const options = opts || {};
    const bracket = options.bracket || "bmatrix";
    const augCol = typeof options.augCol === "number" ? options.augCol : -1;

    if (!Array.isArray(M) || M.length === 0 || !Array.isArray(M[0]) || M[0].length === 0) {
      return "\\begin{" + bracket + "} 0 \\end{" + bracket + "}";
    }

    const rows = M.length;
    const cols = M[0].length;
    let hasTall = false;
    const texRows = [];

    for (let i = 0; i < rows; i++) {
      const cells = [];
      for (let j = 0; j < cols; j++) {
        const cellTex = scalarToLatex(M[i] && M[i][j] !== undefined ? M[i][j] : 0, options);
        if (cellTex.includes("\\frac") || cellTex.includes("\\sqrt")) hasTall = true;
        cells.push(cellTex);
      }
      texRows.push(cells.join(" & "));
    }

    const rowSep = hasTall ? " \\\\[4pt] " : " \\\\ ";

    if (augCol > 0 && augCol < cols) {
      const colSpec = "c".repeat(augCol) + "|" + "c".repeat(cols - augCol);
      const leftDelim = bracket === "pmatrix" ? "\\left(" : (bracket === "vmatrix" ? "\\left|" : "\\left[");
      const rightDelim = bracket === "pmatrix" ? "\\right)" : (bracket === "vmatrix" ? "\\right|" : "\\right]");
      return leftDelim + "\\begin{array}{" + colSpec + "} " + texRows.join(rowSep) + " \\end{array}" + rightDelim;
    }

    return "\\begin{" + bracket + "} " + texRows.join(rowSep) + " \\end{" + bracket + "}";
  }

  function systemLatex(A, b, varPrefix) {
    const prefix = varPrefix || "c";
    if (!Array.isArray(A) || A.length === 0 || !Array.isArray(A[0])) {
      return "0 = 0";
    }
    const cols = A[0].length;
    const syms = [];
    for (let j = 0; j < cols; j++) {
      syms.push(prefix + "_{" + (j + 1) + "}");
    }
    const lines = [];
    for (let i = 0; i < A.length; i++) {
      const lhs = linearCombLatex(A[i], syms, { zeroFallback: "0" });
      const rhs = b && b[i] !== undefined ? scalarToLatex(b[i]) : "0";
      lines.push(lhs + " &= " + rhs);
    }
    return "\\left\\{\\begin{aligned} " + lines.join(" \\\\[3pt] ") + " \\end{aligned}\\right.";
  }

  // Exact BigInt Rational helpers for deterministic Gauss / Gauss-Jordan
  function gcdBig(a, b) {
    let x = a < 0n ? -a : a;
    let y = b < 0n ? -b : b;
    while (y !== 0n) {
      const t = x % y;
      x = y;
      y = t;
    }
    return x === 0n ? 1n : x;
  }

  function mkRat(n, d) {
    if (d === 0n) return { n: 0n, d: 1n };
    if (n === 0n) return { n: 0n, d: 1n };
    let num = n;
    let den = d;
    if (den < 0n) {
      num = -num;
      den = -den;
    }
    const g = gcdBig(num, den);
    return { n: num / g, d: den / g };
  }

  function ratAdd(a, b) { return mkRat(a.n * b.d + b.n * a.d, a.d * b.d); }
  function ratSub(a, b) { return mkRat(a.n * b.d - b.n * a.d, a.d * b.d); }
  function ratMul(a, b) { return mkRat(a.n * b.n, a.d * b.d); }
  function ratDiv(a, b) { return mkRat(a.n * b.d, a.d * b.n); }
  function ratNeg(a) { return { n: -a.n, d: a.d }; }
  function ratAbs(a) { return { n: a.n < 0n ? -a.n : a.n, d: a.d }; }
  function ratToNum(a) { return Number(a.n) / Number(a.d); }

  function ratToLatex(a, opts) {
    const options = opts || {};
    if (a.n === 0n) return options.plusPrefix ? "+0" : "0";
    const isNeg = a.n < 0n;
    const an = isNeg ? -a.n : a.n;
    const sign = isNeg ? "-" : (options.plusPrefix ? "+" : "");
    const body = a.d === 1n ? an.toString() : "\\frac{" + an.toString() + "}{" + a.d.toString() + "}";
    const out = sign + body;
    return (options.parenNeg && isNeg) ? "\\left(" + out + "\\right)" : out;
  }

  function tryMatrixToRat(M) {
    const out = [];
    for (let i = 0; i < M.length; i++) {
      const row = [];
      for (let j = 0; j < M[i].length; j++) {
        const f = toFraction(M[i][j], 10000, 1e-9);
        if (!f) return null;
        row.push({ n: BigInt(f.n), d: BigInt(f.d) });
      }
      out.push(row);
    }
    return out;
  }

  function ratMatrixOverflow(R) {
    const MAX_BOUND = 1000000000000n;
    for (let i = 0; i < R.length; i++) {
      for (let j = 0; j < R[i].length; j++) {
        const an = R[i][j].n < 0n ? -R[i][j].n : R[i][j].n;
        if (an > MAX_BOUND || R[i][j].d > MAX_BOUND) return true;
      }
    }
    return false;
  }

  function ratMatrixToNumbers(R) {
    return R.map(function (row) {
      return row.map(ratToNum);
    });
  }

  function ratMatrixToLatex(R, augCol, bracket) {
    const env = bracket || "bmatrix";
    const rows = R.length;
    const cols = R[0].length;
    let hasTall = false;
    const texRows = [];
    for (let i = 0; i < rows; i++) {
      const cells = [];
      for (let j = 0; j < cols; j++) {
        const t = ratToLatex(R[i][j]);
        if (t.includes("\\frac")) hasTall = true;
        cells.push(t);
      }
      texRows.push(cells.join(" & "));
    }
    const sep = hasTall ? " \\\\[4pt] " : " \\\\ ";
    if (augCol > 0 && augCol < cols) {
      const spec = "c".repeat(augCol) + "|" + "c".repeat(cols - augCol);
      return "\\left[\\begin{array}{" + spec + "} " + texRows.join(sep) + " \\end{array}\\right]";
    }
    return "\\begin{" + env + "} " + texRows.join(sep) + " \\end{" + env + "}";
  }

  function formatRowElimOp(rowSym, targetIdx1, pivotIdx1, factorLatex, isNegFactor) {
    // We compute d_target <- d_target - factor * d_pivot
    // If factor > 0: d_i -> d_i - factor d_p; if factor < 0: d_i -> d_i + |factor| d_p
    const opSign = isNegFactor ? " + " : " - ";
    const coef = factorLatex === "1" ? "" : (factorLatex.includes("\\frac") ? factorLatex + "\\," : factorLatex);
    return rowSym + "_{" + targetIdx1 + "} \\to " + rowSym + "_{" + targetIdx1 + "}" + opSign + coef + rowSym + "_{" + pivotIdx1 + "}";
  }

  function gaussSolveFloat(M, options) {
    const mode = options.mode === "ref" ? "ref" : "rref";
    const augCol = typeof options.augCol === "number" ? options.augCol : -1;
    const rowSym = options.rowSymbol || "d";
    const bracket = options.bracket || "bmatrix";
    const rows = M.length;
    const cols = M[0].length;
    const maxPivotCol = augCol > 0 && augCol <= cols ? augCol : cols;

    const A = M.map(function (row) {
      return row.map(function (v) { return snapZero(v, 1e-12); });
    });

    const steps = [];
    const pivotCols = [];
    let swaps = 0;
    let r = 0;

    for (let col = 0; col < maxPivotCol && r < rows; col++) {
      let pivotRow = -1;
      if (Math.abs(A[r][col]) > 1e-7) {
        pivotRow = r;
      } else {
        let maxVal = 1e-9;
        for (let i = r; i < rows; i++) {
          if (Math.abs(A[i][col]) > maxVal) {
            maxVal = Math.abs(A[i][col]);
            pivotRow = i;
          }
        }
      }
      if (pivotRow === -1) continue;

      if (pivotRow !== r) {
        const tmp = A[r];
        A[r] = A[pivotRow];
        A[pivotRow] = tmp;
        swaps++;
        const snap = A.map(function (rw) { return rw.slice(); });
        const op = rowSym + "_{" + (r + 1) + "} \\leftrightarrow " + rowSym + "_{" + (pivotRow + 1) + "}";
        steps.push({
          opsLatex: [op],
          opLatex: op,
          matrix: snap,
          matrixLatex: matrixToLatex(snap, { augCol: augCol, bracket: bracket })
        });
      }

      pivotCols.push(col);
      const ops = [];
      const piv = A[r][col];
      for (let i = r + 1; i < rows; i++) {
        if (Math.abs(A[i][col]) <= 1e-9) {
          A[i][col] = 0;
          continue;
        }
        const factor = A[i][col] / piv;
        for (let j = col; j < cols; j++) {
          A[i][j] = snapZero(A[i][j] - factor * A[r][j], 1e-10);
        }
        A[i][col] = 0;
        ops.push(formatRowElimOp(rowSym, i + 1, r + 1, scalarToLatex(Math.abs(factor)), factor < 0));
      }

      if (ops.length > 0) {
        const snap = A.map(function (rw) { return rw.slice(); });
        steps.push({
          opsLatex: ops,
          opLatex: ops.join(",\\quad "),
          matrix: snap,
          matrixLatex: matrixToLatex(snap, { augCol: augCol, bracket: bracket })
        });
      }
      r++;
    }

    const refMatrix = A.map(function (rw) { return rw.slice(); });
    let det = null;
    if (rows === maxPivotCol) {
      if (pivotCols.length < rows) {
        det = 0;
      } else {
        let prod = swaps % 2 === 0 ? 1 : -1;
        for (let i = 0; i < rows; i++) prod *= refMatrix[i][i];
        det = snapZero(prod, 1e-9);
      }
    }

    if (mode === "rref") {
      for (let idx = pivotCols.length - 1; idx >= 0; idx--) {
        const pCol = pivotCols[idx];
        const piv = A[idx][pCol];
        if (Math.abs(piv - 1) > 1e-9) {
          const invPiv = 1 / piv;
          for (let j = pCol; j < cols; j++) {
            A[idx][j] = snapZero(A[idx][j] * invPiv, 1e-10);
          }
          A[idx][pCol] = 1;
          const snap = A.map(function (rw) { return rw.slice(); });
          const scaleTex = scalarToLatex(invPiv, { parenNeg: invPiv < 0 });
          const op = rowSym + "_{" + (idx + 1) + "} \\to " + scaleTex + (scaleTex.includes("\\frac") ? "\\," : " \\cdot ") + rowSym + "_{" + (idx + 1) + "}";
          steps.push({
            opsLatex: [op],
            opLatex: op,
            matrix: snap,
            matrixLatex: matrixToLatex(snap, { augCol: augCol, bracket: bracket })
          });
        }

        const upOps = [];
        for (let i = 0; i < idx; i++) {
          const factor = A[i][pCol];
          if (Math.abs(factor) <= 1e-9) {
            A[i][pCol] = 0;
            continue;
          }
          for (let j = pCol; j < cols; j++) {
            A[i][j] = snapZero(A[i][j] - factor * A[idx][j], 1e-10);
          }
          A[i][pCol] = 0;
          upOps.push(formatRowElimOp(rowSym, i + 1, idx + 1, scalarToLatex(Math.abs(factor)), factor < 0));
        }
        if (upOps.length > 0) {
          const snap = A.map(function (rw) { return rw.slice(); });
          steps.push({
            opsLatex: upOps,
            opLatex: upOps.join(",\\quad "),
            matrix: snap,
            matrixLatex: matrixToLatex(snap, { augCol: augCol, bracket: bracket })
          });
        }
      }
    }

    const rrefMatrix = A.map(function (rw) { return rw.slice(); });
    return finalizeGaussOutput(refMatrix, rrefMatrix, steps, pivotCols, maxPivotCol, augCol, swaps, det, null);
  }

  function finalizeGaussOutput(refMatrix, rrefMatrix, steps, pivotCols, maxPivotCol, augCol, swaps, det, detLatexOverride) {
    const rank = pivotCols.length;
    const pivSet = new Set(pivotCols);
    const freeCols = [];
    for (let j = 0; j < maxPivotCol; j++) {
      if (!pivSet.has(j)) freeCols.push(j);
    }

    let isConsistent = true;
    let inconsistentRow = -1;
    const rows = rrefMatrix.length;
    const cols = rrefMatrix[0].length;
    if (augCol > 0 && augCol < cols) {
      for (let i = rank; i < rows; i++) {
        for (let j = augCol; j < cols; j++) {
          if (Math.abs(rrefMatrix[i][j]) > 1e-8) {
            isConsistent = false;
            inconsistentRow = i;
            break;
          }
        }
        if (!isConsistent) break;
      }
    }

    let particularSol = null;
    if (augCol > 0 && augCol < cols && isConsistent) {
      particularSol = new Array(maxPivotCol).fill(0);
      for (let idx = 0; idx < rank; idx++) {
        particularSol[pivotCols[idx]] = snapZero(rrefMatrix[idx][augCol], 1e-10);
      }
    }

    const nullspaceBasis = [];
    const nullspaceIntegerBasis = [];
    if (steps._rrefSourceReady !== false) {
      for (let fIdx = 0; fIdx < freeCols.length; fIdx++) {
        const fCol = freeCols[fIdx];
        const vec = new Array(maxPivotCol).fill(0);
        vec[fCol] = 1;
        for (let idx = 0; idx < rank; idx++) {
          vec[pivotCols[idx]] = snapZero(-rrefMatrix[idx][fCol], 1e-10);
        }
        nullspaceBasis.push(vec);
        nullspaceIntegerBasis.push(scaleToIntegerVector(vec));
      }
    }

    return {
      steps: steps,
      refMatrix: refMatrix,
      rrefMatrix: rrefMatrix,
      rank: rank,
      pivotCols: pivotCols,
      freeCols: freeCols,
      swaps: swaps,
      det: det,
      detLatex: detLatexOverride !== null && detLatexOverride !== undefined ? detLatexOverride : (det !== null ? scalarToLatex(det) : null),
      isConsistent: isConsistent,
      inconsistentRow: inconsistentRow,
      particularSol: particularSol,
      nullspaceBasis: nullspaceBasis,
      nullspaceIntegerBasis: nullspaceIntegerBasis
    };
  }

  function scaleToIntegerVector(vec) {
    let mult = 1;
    for (let i = 0; i < vec.length; i++) {
      const f = toFraction(vec[i], 1000, 1e-8);
      if (!f) return vec.slice();
      mult = lcmInt(mult, f.d);
      if (mult > 5000) return vec.slice();
    }
    const scaled = vec.map(function (v) {
      return snapZero(v * mult, 1e-8);
    });
    // Divide by GCD of non-zero integer components
    let g = 0;
    for (let i = 0; i < scaled.length; i++) {
      const iv = Math.abs(Math.round(scaled[i]));
      if (iv > 0) g = g === 0 ? iv : gcdInt(g, iv);
    }
    if (g > 1) {
      for (let i = 0; i < scaled.length; i++) {
        scaled[i] = Math.round(scaled[i]) / g;
      }
    }
    // Prefer first non-zero entry positive
    for (let i = 0; i < scaled.length; i++) {
      if (Math.abs(scaled[i]) > 1e-9) {
        if (scaled[i] < 0) {
          for (let k = 0; k < scaled.length; k++) scaled[k] = snapZero(-scaled[k]);
        }
        break;
      }
    }
    return scaled;
  }

  function gaussRrefWithSteps(M, opts) {
    const options = opts || {};
    if (!Array.isArray(M) || M.length === 0 || !Array.isArray(M[0]) || M[0].length === 0) {
      return {
        steps: [],
        refMatrix: [[0]],
        rrefMatrix: [[0]],
        rank: 0,
        pivotCols: [],
        freeCols: [],
        swaps: 0,
        det: 0,
        detLatex: "0",
        isConsistent: true,
        inconsistentRow: -1,
        particularSol: [],
        nullspaceBasis: [],
        nullspaceIntegerBasis: []
      };
    }

    const mode = options.mode === "ref" ? "ref" : "rref";
    const augCol = typeof options.augCol === "number" ? options.augCol : -1;
    const rowSym = options.rowSymbol || "d";
    const bracket = options.bracket || "bmatrix";
    const rows = M.length;
    const cols = M[0].length;
    const maxPivotCol = augCol > 0 && augCol <= cols ? augCol : cols;

    const R = tryMatrixToRat(M);
    if (!R) {
      return gaussSolveFloat(M, options);
    }

    const steps = [];
    const pivotCols = [];
    let swaps = 0;
    let r = 0;

    for (let col = 0; col < maxPivotCol && r < rows; col++) {
      let pivotRow = -1;
      if (R[r][col].n !== 0n) {
        pivotRow = r;
      } else {
        // Prefer unit pivot +/-1 among rows below if row r has 0
        for (let i = r + 1; i < rows; i++) {
          if (R[i][col].d === 1n && (R[i][col].n === 1n || R[i][col].n === -1n)) {
            pivotRow = i;
            break;
          }
        }
        if (pivotRow === -1) {
          for (let i = r + 1; i < rows; i++) {
            if (R[i][col].n !== 0n) {
              pivotRow = i;
              break;
            }
          }
        }
      }

      if (pivotRow === -1) continue;

      if (pivotRow !== r) {
        const tmp = R[r];
        R[r] = R[pivotRow];
        R[pivotRow] = tmp;
        swaps++;
        const op = rowSym + "_{" + (r + 1) + "} \\leftrightarrow " + rowSym + "_{" + (pivotRow + 1) + "}";
        steps.push({
          opsLatex: [op],
          opLatex: op,
          matrix: ratMatrixToNumbers(R),
          matrixLatex: ratMatrixToLatex(R, augCol, bracket)
        });
      }

      pivotCols.push(col);
      const ops = [];
      const piv = R[r][col];
      for (let i = r + 1; i < rows; i++) {
        if (R[i][col].n === 0n) continue;
        const factor = ratDiv(R[i][col], piv);
        for (let j = col; j < cols; j++) {
          R[i][j] = ratSub(R[i][j], ratMul(factor, R[r][j]));
        }
        R[i][col] = { n: 0n, d: 1n };
        if (ratMatrixOverflow(R)) {
          return gaussSolveFloat(M, options);
        }
        ops.push(formatRowElimOp(rowSym, i + 1, r + 1, ratToLatex(ratAbs(factor)), factor.n < 0n));
      }

      if (ops.length > 0) {
        steps.push({
          opsLatex: ops,
          opLatex: ops.join(",\\quad "),
          matrix: ratMatrixToNumbers(R),
          matrixLatex: ratMatrixToLatex(R, augCol, bracket)
        });
      }
      r++;
    }

    const refRat = R.map(function (rw) { return rw.map(function (c) { return { n: c.n, d: c.d }; }); });
    const refMatrix = ratMatrixToNumbers(refRat);

    let det = null;
    let detLatex = null;
    if (rows === maxPivotCol) {
      if (pivotCols.length < rows) {
        det = 0;
        detLatex = "0";
      } else {
        let prod = swaps % 2 === 0 ? { n: 1n, d: 1n } : { n: -1n, d: 1n };
        for (let i = 0; i < rows; i++) {
          prod = ratMul(prod, refRat[i][i]);
        }
        det = ratToNum(prod);
        detLatex = ratToLatex(prod);
      }
    }

    // Even if mode === "ref", compute an internal RREF copy if needed for nullspace, while keeping steps strictly REF!
    const workRref = mode === "rref" ? R : refRat.map(function (rw) { return rw.map(function (c) { return { n: c.n, d: c.d }; }); });

    for (let idx = pivotCols.length - 1; idx >= 0; idx--) {
      const pCol = pivotCols[idx];
      const piv = workRref[idx][pCol];
      if (!(piv.n === 1n && piv.d === 1n)) {
        const invPiv = ratDiv({ n: 1n, d: 1n }, piv);
        for (let j = pCol; j < cols; j++) {
          workRref[idx][j] = ratMul(workRref[idx][j], invPiv);
        }
        workRref[idx][pCol] = { n: 1n, d: 1n };
        if (ratMatrixOverflow(workRref)) {
          return gaussSolveFloat(M, options);
        }
        if (mode === "rref") {
          const scaleTex = ratToLatex(invPiv, { parenNeg: invPiv.n < 0n });
          const op = rowSym + "_{" + (idx + 1) + "} \\to " + scaleTex + (scaleTex.includes("\\frac") ? "\\," : " \\cdot ") + rowSym + "_{" + (idx + 1) + "}";
          steps.push({
            opsLatex: [op],
            opLatex: op,
            matrix: ratMatrixToNumbers(workRref),
            matrixLatex: ratMatrixToLatex(workRref, augCol, bracket)
          });
        }
      }

      const upOps = [];
      for (let i = 0; i < idx; i++) {
        const factor = workRref[i][pCol];
        if (factor.n === 0n) continue;
        for (let j = pCol; j < cols; j++) {
          workRref[i][j] = ratSub(workRref[i][j], ratMul(factor, workRref[idx][j]));
        }
        workRref[i][pCol] = { n: 0n, d: 1n };
        if (ratMatrixOverflow(workRref)) {
          return gaussSolveFloat(M, options);
        }
        if (mode === "rref") {
          upOps.push(formatRowElimOp(rowSym, i + 1, idx + 1, ratToLatex(ratAbs(factor)), factor.n < 0n));
        }
      }

      if (mode === "rref" && upOps.length > 0) {
        steps.push({
          opsLatex: upOps,
          opLatex: upOps.join(",\\quad "),
          matrix: ratMatrixToNumbers(workRref),
          matrixLatex: ratMatrixToLatex(workRref, augCol, bracket)
        });
      }
    }

    const rrefMatrix = ratMatrixToNumbers(workRref);
    const out = finalizeGaussOutput(refMatrix, rrefMatrix, steps, pivotCols, maxPivotCol, augCol, swaps, det, detLatex);
    out.refMatrixLatex = ratMatrixToLatex(refRat, augCol, bracket);
    out.rrefMatrixLatex = ratMatrixToLatex(workRref, augCol, bracket);
    return out;
  }

  function renderKatexSafe(tex, displayMode, strictThrow) {
    const raw = String(tex == null ? "" : tex).trim();
    if (!raw) return "";
    const katexLib = (typeof window !== "undefined" && window.katex) ? window.katex : null;
    if (katexLib && typeof katexLib.renderToString === "function") {
      try {
        return katexLib.renderToString(raw, {
          displayMode: !!displayMode,
          throwOnError: !!strictThrow,
          strict: false,
          macros: Object.assign({}, KATEX_MACROS)
        });
      } catch (err) {
        if (strictThrow) throw err;
        return "<span class=\"katex-fallback\">" + escapeHtml(raw) + "</span>";
      }
    }
    return displayMode ? "\\[" + raw + "\\]" : "\\(" + raw + "\\)";
  }

  function replaceDelimitedMathInText(text) {
    if (!text || (!text.includes("$") && !text.includes("\\[") && !text.includes("\\("))) {
      return null;
    }
    let changed = false;
    // Order matters: $$...$$ BEFORE $...$!
    const html = text
      .replace(/\$\$([\s\S]*?)\$\$/g, function (match, tex) {
        changed = true;
        return renderKatexSafe(tex, true, false);
      })
      .replace(/\\\[([\s\S]*?)\\\]/g, function (match, tex) {
        changed = true;
        return renderKatexSafe(tex, true, false);
      })
      .replace(/\\\(([\s\S]*?)\\\)/g, function (match, tex) {
        changed = true;
        return renderKatexSafe(tex, false, false);
      })
      .replace(/\$([^\$\n]+?)\$/g, function (match, tex) {
        changed = true;
        return renderKatexSafe(tex, false, false);
      });
    return changed ? html : null;
  }

  function renderMathInContainer(container) {
    if (!container) return;
    if (typeof window === "undefined" || !window.katex || typeof window.katex.renderToString !== "function") {
      return;
    }
    if (typeof window.renderMathInElement === "function") {
      try {
        window.renderMathInElement(container, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "\\[", right: "\\]", display: true },
            { left: "\\(", right: "\\)", display: false },
            { left: "$", right: "$", display: false }
          ],
          throwOnError: false,
          strict: false,
          macros: Object.assign({}, KATEX_MACROS)
        });
        return;
      } catch (e) {
        // Fall through to manual walker if auto-render throws
      }
    }

    const walk = function (node) {
      if (!node) return;
      if (node.nodeType === 3) {
        const parent = node.parentNode;
        if (!parent) return;
        const tag = parent.tagName ? parent.tagName.toUpperCase() : "";
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA" || tag === "CODE" || tag === "PRE") return;
        if (parent.classList && parent.classList.contains("katex")) return;
        const replacedHtml = replaceDelimitedMathInText(node.nodeValue);
        if (replacedHtml !== null && typeof document !== "undefined") {
          const span = document.createElement("span");
          span.innerHTML = replacedHtml;
          parent.replaceChild(span, node);
        }
      } else if (node.nodeType === 1) {
        if (node.classList && (node.classList.contains("katex") || node.classList.contains("mjx-container"))) return;
        const children = Array.prototype.slice.call(node.childNodes);
        for (let i = 0; i < children.length; i++) {
          walk(children[i]);
        }
      }
    };
    walk(container);
  }

  function renderTitleMathHtml(mathInput) {
    const raw = String(mathInput == null ? "" : mathInput).trim();
    if (!raw) return "";

    // Check if the entire string is wrapped in \(...\) or \[...\] or $$...$$ or $...$
    let stripped = null;
    if (raw.startsWith("\\(") && raw.endsWith("\\)") && raw.indexOf("\\)", 2) === raw.length - 2) {
      stripped = raw.slice(2, -2).trim();
    } else if (raw.startsWith("\\[") && raw.endsWith("\\]") && raw.indexOf("\\]", 2) === raw.length - 2) {
      stripped = raw.slice(2, -2).trim();
    } else if (raw.startsWith("$$") && raw.endsWith("$$") && raw.indexOf("$$", 2) === raw.length - 2) {
      stripped = raw.slice(2, -2).trim();
    } else if (raw.startsWith("$") && raw.endsWith("$") && raw.length >= 2 && raw.indexOf("$", 1) === raw.length - 1) {
      stripped = raw.slice(1, -1).trim();
    }

    if (stripped !== null) {
      return renderKatexSafe(stripped, false, false);
    }

    // Mixed text + delimited math (e.g. "\( A \) và \( B \)")
    if (raw.includes("\\(") || raw.includes("\\[") || raw.includes("$")) {
      const mixed = replaceDelimitedMathInText(raw);
      if (mixed !== null) return mixed;
    }

    // Bare LaTeX string (e.g. "A \\in \\mathbb{R}^{2 \\times 2}" or "x_1^2 + 2x_1x_2")
    return renderKatexSafe(raw, false, false);
  }

  function mathBlockHtml(latex) {
    const raw = String(latex == null ? "" : latex).trim();
    if (!raw) return "";
    return "<div class=\"sol-math-block\">\\[" + raw + "\\]</div>";
  }

  function stepSectionHtml(title, bodyParts) {
    const parts = Array.isArray(bodyParts) ? bodyParts.filter(Boolean) : [bodyParts].filter(Boolean);
    return (
      (title ? "<div class=\"sol-bold\">" + title + "</div>" : "") +
      parts.join("")
    );
  }

  function wrapStepContainer(innerHtml) {
    return "<div class=\"sol-step-container\">" + innerHtml + "</div>";
  }

  function renderGaussChainHtml(initialMatrixLatex, gaussSteps, rowLabelText) {
    if (!gaussSteps || gaussSteps.length === 0) {
      return (
        "<div class=\"sol-text\">Ma trận đã ở sẵn dạng bậc thang, không cần thực hiện thêm phép biến đổi sơ cấp trên dòng.</div>" +
        mathBlockHtml(initialMatrixLatex)
      );
    }
    let html = "";
    for (let i = 0; i < gaussSteps.length; i++) {
      const st = gaussSteps[i];
      const prefix = rowLabelText || "Thực hiện phép biến đổi sơ cấp trên dòng";
      const opsArr = (Array.isArray(st.opsLatex) && st.opsLatex.length > 0)
        ? st.opsLatex
        : String(st.opLatex || "").split(/,\s*\\quad\s*/).filter(Boolean);
      const opsInlineHtml = opsArr.map(function (op) { return "\\(" + op + "\\)"; }).join(", ");
      html +=
        "<div class=\"sol-text\">" + prefix + " " + opsInlineHtml + ":</div>" +
        mathBlockHtml(st.matrixLatex);
    }
    return html;
  }

  return {
    KATEX_MACROS: KATEX_MACROS,
    escapeHtml: escapeHtml,
    gcdInt: gcdInt,
    lcmInt: lcmInt,
    snapZero: snapZero,
    toFraction: toFraction,
    largestSquareFactor: largestSquareFactor,
    toSurdLatex: toSurdLatex,
    scalarToLatex: scalarToLatex,
    complexToLatex: complexToLatex,
    quadRootToLatex: quadRootToLatex,
    normalizeVecSymbol: normalizeVecSymbol,
    normalizeMatSymbol: normalizeMatSymbol,
    linearCombLatex: linearCombLatex,
    vecTupleLatex: vecTupleLatex,
    matrixToLatex: matrixToLatex,
    systemLatex: systemLatex,
    scaleToIntegerVector: scaleToIntegerVector,
    gaussRrefWithSteps: gaussRrefWithSteps,
    renderKatexSafe: renderKatexSafe,
    renderMathInContainer: renderMathInContainer,
    renderTitleMathHtml: renderTitleMathHtml,
    mathBlockHtml: mathBlockHtml,
    stepSectionHtml: stepSectionHtml,
    wrapStepContainer: wrapStepContainer,
    renderGaussChainHtml: renderGaussChainHtml
  };
});
