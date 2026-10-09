(function () {
  window.App = window.App || {};

  /* --------- Display helpers --------- */
  App.coordOut = function (text) {
    const el = document.getElementById("coordOut");
    if (el) el.innerText = text;
  };

  App.getCSS = function (v) {
    return getComputedStyle(document.body).getPropertyValue(v).trim() || "#fff";
  };

  /* ===== Number formatting (fraction & surd) ===== */
  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a || 1;
  }
  function isNearly(x, y, eps = 1e-10) {
    return Math.abs(x - y) <= eps;
  }
  function isNearlyInt(x, eps = 1e-10) {
    return isNearly(x, Math.round(x), eps);
  }

  function rationalApprox(x, maxDen = 10000, eps = 1e-12) {
    if (!isFinite(x)) return null;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    if (isNearlyInt(x, eps)) return { n: sign * Math.round(x), d: 1 };

    let a0 = Math.floor(x);
    let p0 = 1,
      q0 = 0,
      p1 = a0,
      q1 = 1;
    let frac = x - a0;
    if (isNearly(frac, 0, eps)) return { n: sign * p1, d: q1 };

    for (let i = 0; i < 30; i++) {
      const a = Math.floor(1 / frac);
      const p2 = a * p1 + p0;
      const q2 = a * q1 + q0;
      const approx = p2 / q2;
      if (q2 > maxDen) break;
      if (Math.abs(approx - x) <= eps) return { n: sign * p2, d: q2 };
      p0 = p1;
      q0 = q1;
      p1 = p2;
      q1 = q2;
      frac = 1 / frac - a;
      if (frac <= eps) break;
    }
    if (Math.abs(p1 / q1 - x) <= eps) return { n: sign * p1, d: q1 };
    return null;
  }

  function largestSquareFactor(n) {
    let r = 1;
    for (let k = 2; k * k <= n; k++) {
      while (n % (k * k) === 0) {
        n /= k * k;
        r *= k;
      }
    }
    return { root: r, rest: n };
  }

  function approxRadical(x, eps = 1e-9) {
    if (!isFinite(x)) return null;
    if (isNearlyInt(x, eps)) return null; // prefer integer
    const sign = x < 0 ? "-" : "";
    const ax = Math.abs(x);

    let best = null,
      errBest = 1e9;

    for (let p = 1; p <= 8; p++) {
      for (let n = 2; n <= 400; n++) {
        const s = Math.sqrt(n);
        for (let m = 1; m <= 60; m++) {
          const val = (p * s) / m;
          const err = Math.abs(val - ax);
          if (err < errBest) {
            const { root: r, rest } = largestSquareFactor(n);
            if (rest === 1) continue;
            let num = p * r,
              den = m;
            const g = gcd(num, den);
            num /= g;
            den /= g;
            const coef = num === 1 ? "" : num.toString();
            const frac = den === 1 ? "" : `/${den}`;
            best = `${sign}${coef}√${rest}${frac}`;
            errBest = err;
          }
        }
      }
    }

    for (let n = 2; n <= 400; n++) {
      const val = 1 / Math.sqrt(n);
      const err = Math.abs(val - ax);
      if (err < errBest && err < eps) {
        const { root: r, rest } = largestSquareFactor(n);
        const den = r * rest;
        best = `${sign}√${rest}/${den}`;
        errBest = err;
      }
    }

    if (errBest < eps) return best;
    return null;
  }

  App.formatScalar = function (x, dec = 6) {
    if (typeof x === "string") return x;

    if (!isFinite(x)) return String(x);
    const ax = Math.abs(x);

    if (ax >= 1e6 || (ax > 0 && ax < 1e-6))
      return x.toExponential(2).replace("+", "");
    if (ax < 1e-12) return "0";
    if (isNearlyInt(x)) return String(Math.round(x));

    const rat = rationalApprox(x, 10000, 1e-12);
    if (rat) {
      const { n, d } = rat;
      return d === 1 ? String(n) : `${n}/${d}`;
    }

    const rad = approxRadical(x, 1e-9);
    if (rad) return rad;

    let s = x.toFixed(dec).replace(/\.?0+$/, "");
    return s === "-0" ? "0" : s;
  };

  App.formatVectorShort = (vec) => `[${vec.map(App.formatScalar).join(", ")}]`;
  App.formatTip = (vec) => `[${vec.map(App.formatScalar).join(", ")}]`;

  // Chuan hoa toa do vector giong dinh dang LaTeX ben danh sach (can thuc, logarit, phan so, pi)
  App.formatVectorMathLabel = function (it) {
    if (!it) return "[]";
    const subs = { "0": "\u2080", "1": "\u2081", "2": "\u2082", "3": "\u2083", "4": "\u2084", "5": "\u2085", "6": "\u2086", "7": "\u2087", "8": "\u2088", "9": "\u2089" };
    const sups = { "0": "\u2070", "1": "\u00B9", "2": "\u00B2", "3": "\u00B3", "4": "\u2074", "5": "\u2075", "6": "\u2076", "7": "\u2077", "8": "\u2078", "9": "\u2079" };

    if (it.latex) {
      let s = String(it.latex).trim();
      s = s.replace(/^\\left\[|^\[/, "").replace(/\\right\]|\]$/, "").trim();
      // Can bac n: \sqrt[3]{8} -> 3√8
      s = s.replace(/\\sqrt\[(\d+)\]\{([^}]+)\}/g, (_, n, inner) => {
        const sup = String(n).split("").map((c) => sups[c] || c).join("");
        return sup + "\u221A" + inner;
      });
      // Can bac 2: \sqrt{2} -> √2
      s = s.replace(/\\sqrt\{([^}]+)\}/g, "\u221A$1");
      // Phan so: \frac{a}{b} -> a/b
      s = s.replace(/(?:\\frac|\x0crac)\{([^}]+)\}\{([^}]+)\}/g, "$1/$2");
      s = s.replace(/(?:\\frac|\x0crac)\s*([0-9a-zA-Z])([0-9a-zA-Z])/g, "$1/$2");
      // Logarit co so: \log_{2}(8) -> log2(8)
      s = s.replace(/\\log_\{?(\d+)\}?\(([^)]+)\)/g, (_, base, arg) => {
        const sub = String(base).split("").map((c) => subs[c] || c).join("");
        return "log" + sub + "(" + arg + ")";
      });
      s = s.replace(/\\log\(([^)]+)\)/g, "log($1)");
      s = s.replace(/\\ln\(([^)]+)\)/g, "ln($1)");
      s = s.replace(/\\pi/g, "\u03C0");
      s = s.replace(/\\cdot/g, "\u00B7");
      s = s.replace(/\\times/g, "\u00D7");
      s = s.replace(/[{}]/g, "");
      s = s.replace(/\s*,\s*/g, ", ");
      return "[" + s + "]";
    }

    if (Array.isArray(it.vec)) {
      return "[" + it.vec.map((v) => {
        const num = Number(v);
        if (isNaN(num)) return "0";
        if (typeof App.formatScalar === "function") return App.formatScalar(num);
        return num.toFixed(2).replace(/\.?0+$/, "");
      }).join(", ") + "]";
    }
    return "[]";
  };

  // Lay ten vector chuan (tu dong dong bo theo thu tu danh sach #1 -> v_1, #2 -> v_2 neu khong co ten rieng)
  App.getVectorName = function (it) {
    if (!it) return "v";
    // Neu co ten tuy chinh do nguoi dung dat rieng (khong phai mac dinh v, v1, v_1):
    if (it.name && !/^v_?\{?\d+\}?$/i.test(it.name)) {
      return String(it.name).replace(/^([a-zA-Z])(\d+)$/, "$1_{$2}");
    }
    // Mac dinh luon dong bo theo vi tri hien tai trong App.vectorList
    const idx = App.vectorList ? App.vectorList.indexOf(it) : -1;
    if (idx >= 0) {
      return `v_{${idx + 1}}`;
    }
    if (it.name) {
      return String(it.name).replace(/^v(\d+)$/i, "v_{$1}");
    }
    return `v_{${it.id || 1}}`;
  };

  // Tra ve chuoi LaTeX hoan chinh cho nhan vector tren do thi (dong bo 100% voi preview va danh sach)
  App.getVectorLatexLabel = function (it, showCoord) {
    if (!it) return "";
    const vName = typeof App.getVectorName === "function" ? App.getVectorName(it) : `v_{${it.id || 1}}`;

    const vColor = it.colorHex || it.colorCss || "";
    const coloredName = (vColor && (vColor.startsWith("#") || /^[a-z]+$/i.test(vColor)))
      ? `{\\color{${vColor}}${vName}}`
      : vName;

    if (!showCoord) {
      return coloredName;
    }

    let coordLatex = "";
    if (it.latex) {
      coordLatex = String(it.latex).trim();
      if (!coordLatex.startsWith("[")) coordLatex = `[${coordLatex}]`;
    } else if (Array.isArray(it.vec)) {
      const parts = it.vec.map((val) => {
        const num = Number(val);
        if (isNaN(num)) return "0";
        if (typeof App.formatScalar === "function") {
          const s = App.formatScalar(num);
          return String(s).replace(/(\d*)√(\d+)/g, (m, c, r) => `${c}\\sqrt{${r}}`);
        }
        return String(num);
      });
      coordLatex = `[${parts.join(", ")}]`;
    } else {
      coordLatex = "[]";
    }

    return `${coloredName}\\!:\\,${coordLatex}`;
  };

  App.niceStep = function (unitsRange) {
    const rough = Math.max(unitsRange, 1e-12) / 10;
    const pow10 = Math.pow(10, Math.floor(Math.log10(rough)));
    const d = rough / pow10;
    if (d < 1.5) return 1 * pow10;
    if (d < 3) return 2 * pow10;
    if (d < 7) return 5 * pow10;
    return 10 * pow10;
  };
})();
