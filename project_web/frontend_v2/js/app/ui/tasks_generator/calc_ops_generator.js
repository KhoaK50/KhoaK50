(function (root, factory) {
  const mod = factory();
  if (typeof window !== "undefined") {
    window.App = window.App || {};
    window.App.TasksGen = window.App.TasksGen || {};
    window.App.TasksGen.CalcOps = mod;
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
    throw new Error("App.LatexFmt is required before CalcOps");
  }

  function cleanZero(x, eps) {
    const tol = typeof eps === "number" ? eps : 1e-10;
    const v = Number(x);
    if (!Number.isFinite(v) || Math.abs(v) < tol) return 0;
    if (Math.abs(v - Math.round(v)) < tol) return Math.round(v);
    return v;
  }

  function gcdPos(a, b) {
    let x = Math.abs(Math.trunc(a));
    let y = Math.abs(Math.trunc(b));
    while (y !== 0) {
      const t = x % y;
      x = y;
      y = t;
    }
    return x || 1;
  }

  function largestSqFactor(n) {
    const m = Math.abs(Math.trunc(n));
    if (m <= 1) return 1;
    let best = 1;
    for (let k = 2; k * k <= m; k++) {
      if (m % (k * k) === 0) best = k;
    }
    return best;
  }

  /**
   * Formats sign * sqrt(num / den) in exact simplified rationalized surd form.
   * Example: sign=-1, num=4, den=20 -> "-\\frac{\\sqrt{5}}{5}"
   */
  function signedSqrtFractionLatex(sign, numInt, denInt) {
    if (sign === 0 || numInt === 0) return "0";
    let p = Math.abs(Math.trunc(numInt));
    let q = Math.abs(Math.trunc(denInt));
    if (q === 0) return "0";
    const g0 = gcdPos(p, q);
    p = Math.trunc(p / g0);
    q = Math.trunc(q / g0);

    // sqrt(p / q) = sqrt(p * q) / q
    const prod = p * q;
    if (prod > 1e9) {
      const fmt = getFmt();
      return fmt.scalarToLatex((sign < 0 ? -1 : 1) * Math.sqrt(p / q), { allowSurd: true });
    }
    const k = largestSqFactor(prod);
    const rad = Math.trunc(prod / (k * k));
    const g1 = gcdPos(k, q);
    const coef = Math.trunc(k / g1);
    const denom = Math.trunc(q / g1);
    const prefix = sign < 0 ? "-" : "";

    let numerTex = "";
    if (rad === 1) {
      numerTex = String(coef);
    } else if (coef === 1) {
      numerTex = "\\sqrt{" + rad + "}";
    } else {
      numerTex = coef + "\\sqrt{" + rad + "}";
    }

    if (denom === 1) {
      return prefix + numerTex;
    }
    return prefix + "\\frac{" + numerTex + "}{" + denom + "}";
  }

  function exactNormInfo(vec) {
    const fmt = getFmt();
    let sumSq = 0;
    let allRational = true;
    let numAcc = 0;
    let denAcc = 1;

    for (let i = 0; i < vec.length; i++) {
      const val = Number(vec[i]) || 0;
      sumSq += val * val;
      if (allRational) {
        const f = fmt.toFraction(val, 2000, 1e-8);
        if (!f) {
          allRational = false;
        } else {
          const fn = f.n * f.n;
          const fd = f.d * f.d;
          const nextDen = fmt.lcmInt(denAcc, fd);
          if (nextDen > 1e7) {
            allRational = false;
          } else {
            numAcc = numAcc * Math.trunc(nextDen / denAcc) + fn * Math.trunc(nextDen / fd);
            denAcc = nextDen;
            const g = gcdPos(numAcc, denAcc);
            numAcc = Math.trunc(numAcc / g);
            denAcc = Math.trunc(denAcc / g);
            if (Math.abs(numAcc) > 1e8 || denAcc > 1e7) {
              allRational = false;
            }
          }
        }
      }
    }

    sumSq = cleanZero(sumSq, 1e-11);
    const normVal = Math.sqrt(Math.max(0, sumSq));
    let normSqLatex = fmt.scalarToLatex(sumSq, { allowSurd: false });
    let normLatex = fmt.scalarToLatex(normVal, { allowSurd: true });
    let isExactIntegerOrRational = false;

    if (allRational) {
      normSqLatex = denAcc === 1
        ? String(numAcc)
        : "\\frac{" + numAcc + "}{" + denAcc + "}";
      normLatex = signedSqrtFractionLatex(numAcc === 0 ? 0 : 1, numAcc, denAcc);
      const prod = numAcc * denAcc;
      const k = largestSqFactor(prod);
      if (prod === 0 || k * k === prod) {
        isExactIntegerOrRational = true;
      }
    } else {
      const fNorm = fmt.toFraction(normVal, 1000, 1e-8);
      if (fNorm) isExactIntegerOrRational = true;
    }

    return {
      normSq: sumSq,
      normVal: normVal,
      normSqLatex: normSqLatex,
      normLatex: normLatex,
      allRational: allRational,
      ratNum: numAcc,
      ratDen: denAcc,
      isExactRational: isExactIntegerOrRational
    };
  }

  /**
   * Exact LaTeX for val / sqrt(normInfo.normSq)
   */
  function exactDivByNormLatex(val, normInfo) {
    const fmt = getFmt();
    const x = cleanZero(val, 1e-10);
    if (x === 0) return "0";
    if (!normInfo || normInfo.normSq <= 1e-12) return "0";

    if (normInfo.allRational && normInfo.ratNum > 0) {
      const fx = fmt.toFraction(x, 2000, 1e-8);
      if (fx) {
        const sign = fx.n < 0 ? -1 : 1;
        // (fx.n / fx.d)^2 / (ratNum / ratDen) = (fx.n^2 * ratDen) / (fx.d^2 * ratNum)
        const sqNum = fx.n * fx.n * normInfo.ratDen;
        const sqDen = fx.d * fx.d * normInfo.ratNum;
        if (sqNum <= 1e8 && sqDen <= 1e8) {
          return signedSqrtFractionLatex(sign, sqNum, sqDen);
        }
      }
    }
    return fmt.scalarToLatex(x / normInfo.normVal, { allowSurd: true });
  }

  /**
   * Parses scalar input string like "2", "-1/2", "\sqrt{2}", "sqrt(3)/2", "2*pi"
   */
  function parseScalarExpr(rawScalar) {
    const fmt = getFmt();
    const raw = String(rawScalar == null ? "" : rawScalar).trim();
    if (!raw) {
      return { valid: false, value: NaN, latex: "" };
    }

    // Direct finite number
    const directNum = Number(raw);
    if (Number.isFinite(directNum)) {
      const snapped = cleanZero(directNum);
      return {
        valid: true,
        value: snapped,
        latex: fmt.scalarToLatex(snapped, { allowSurd: true })
      };
    }

    // Normalize LaTeX / Unicode math into safe JS arithmetic expression
    let expr = raw
      .replace(/\\left/g, "")
      .replace(/\\right/g, "")
      .replace(/\\cdot|\\times/g, "*")
      .replace(/−/g, "-")
      .replace(/π|\\pi\b/g, "(Math.PI)")
      .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "(($1)/($2))")
      .replace(/\\sqrt\s*\{([^{}]+)\}/g, "Math.sqrt($1)")
      .replace(/√\s*\(([^()]+)\)/g, "Math.sqrt($1)")
      .replace(/√\s*([0-9.]+)/g, "Math.sqrt($1)")
      .replace(/\bsqrt\s*\(/gi, "Math.sqrt(")
      .replace(/\bsin\s*\(/gi, "Math.sin(")
      .replace(/\bcos\s*\(/gi, "Math.cos(")
      .replace(/\btan\s*\(/gi, "Math.tan(")
      .replace(/\bln\s*\(/gi, "Math.log(")
      .replace(/\be\b/g, "(Math.E)")
      .replace(/\^/g, "**");

    // Insert implicit multiplication like 2Math.sqrt(3) or 2(3)
    expr = expr
      .replace(/(\d|\))\s*(Math\.|\()/g, "$1*$2");

    // Security whitelist: only allow digits, operators, parentheses, dots, spaces, and Math.(PI|E|sqrt|sin|cos|tan|log)
    const stripped = expr.replace(/Math\.(PI|E|sqrt|sin|cos|tan|log)/g, "");
    if (/[^0-9+\-*/().\s]/.test(stripped)) {
      return { valid: false, value: NaN, latex: "" };
    }

    let val = NaN;
    try {
      // eslint-disable-next-line no-new-func
      val = Function("\"use strict\"; return (" + expr + ");")();
    } catch (_) {
      return { valid: false, value: NaN, latex: "" };
    }

    if (typeof val !== "number" || !Number.isFinite(val)) {
      return { valid: false, value: NaN, latex: "" };
    }

    const snapped = cleanZero(val);
    // Check common multiples of pi first
    const piRatio = snapped / Math.PI;
    const piFrac = fmt.toFraction(piRatio, 24, 1e-8);
    let latex = "";
    if (snapped !== 0 && piFrac) {
      const n = piFrac.n;
      const d = piFrac.d;
      const sign = n < 0 ? "-" : "";
      const absN = Math.abs(n);
      const numer = absN === 1 ? "\\pi" : absN + "\\pi";
      latex = d === 1 ? sign + numer : sign + "\\frac{" + numer + "}{" + d + "}";
    } else {
      latex = fmt.scalarToLatex(snapped, { allowSurd: true });
    }

    return {
      valid: true,
      value: snapped,
      latex: latex
    };
  }

  function formatApproxIfIrrational(val, exactLatex) {
    const fmt = getFmt();
    const snapped = cleanZero(val);
    if (fmt.toFraction(snapped, 1000, 1e-8)) {
      return "";
    }
    const dec = Number(snapped.toFixed(4)).toString();
    if (dec === exactLatex) return "";
    return dec;
  }

  function parenIfNegLatex(tex, numericVal) {
    if (numericVal < -1e-10 || String(tex).trim().startsWith("-")) {
      return "\\left(" + tex + "\\right)";
    }
    return tex;
  }

  function tupleFromLatexList(texArr) {
    return "\\left(" + texArr.join(",\\; ") + "\\right)";
  }

  function colVecFromLatexList(texArr) {
    return "\\begin{bmatrix} " + texArr.join(" \\\\ ") + " \\end{bmatrix}";
  }

  function detectSpecialAngle(cosVal) {
    const table = [
      { c: 1, deg: "0^\\circ", rad: "0", cosTex: "1", cat: "Hai vector cùng phương và cùng chiều" },
      { c: Math.sqrt(3) / 2, deg: "30^\\circ", rad: "\\frac{\\pi}{6}", cosTex: "\\frac{\\sqrt{3}}{2}", cat: "Góc nhọn đặc biệt" },
      { c: Math.SQRT1_2, deg: "45^\\circ", rad: "\\frac{\\pi}{4}", cosTex: "\\frac{\\sqrt{2}}{2}", cat: "Góc nhọn đặc biệt" },
      { c: 0.5, deg: "60^\\circ", rad: "\\frac{\\pi}{3}", cosTex: "\\frac{1}{2}", cat: "Góc nhọn đặc biệt" },
      { c: 0, deg: "90^\\circ", rad: "\\frac{\\pi}{2}", cosTex: "0", cat: "Hai vector trực giao (vuông góc)" },
      { c: -0.5, deg: "120^\\circ", rad: "\\frac{2\\pi}{3}", cosTex: "-\\frac{1}{2}", cat: "Góc tù đặc biệt" },
      { c: -Math.SQRT1_2, deg: "135^\\circ", rad: "\\frac{3\\pi}{4}", cosTex: "-\\frac{\\sqrt{2}}{2}", cat: "Góc tù đặc biệt" },
      { c: -Math.sqrt(3) / 2, deg: "150^\\circ", rad: "\\frac{5\\pi}{6}", cosTex: "-\\frac{\\sqrt{3}}{2}", cat: "Góc tù đặc biệt" },
      { c: -1, deg: "180^\\circ", rad: "\\pi", cosTex: "-1", cat: "Hai vector cùng phương nhưng ngược chiều" }
    ];
    for (let i = 0; i < table.length; i++) {
      if (Math.abs(cosVal - table[i].c) < 1e-7) {
        return table[i];
      }
    }
    return null;
  }

  function buildErrorBundle(titleText, titleMath, errorCardTitle, errorMsgHtml, proofStepHtml) {
    const fmt = getFmt();
    return {
      isError: true,
      errorTitle: errorCardTitle,
      errorMessageHtml: errorMsgHtml,
      cardOptions: null,
      logLatex: "",
      modalConfig: {
        titleText: titleText,
        titleMath: titleMath,
        content1: fmt.wrapStepContainer(proofStepHtml),
        content2: ""
      }
    };
  }

  // ===========================================================================
  // I. VECTOR OPERATIONS (8 UI OPERATIONS + SUBTRACT ALIAS)
  // ===========================================================================

  function toNumVec(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(function (x) {
      const n = Number(x);
      if (Number.isFinite(n)) return cleanZero(n);
      const parsed = parseScalarExpr(x);
      return parsed.valid ? parsed.value : 0;
    });
  }

  function vecItemSymbol(item, fallbackIdx) {
    const fmt = getFmt();
    if (!item) return fmt.normalizeVecSymbol(null, fallbackIdx);
    if (typeof window !== "undefined" && window.App && typeof window.App.getVectorName === "function") {
      return fmt.normalizeVecSymbol(window.App.getVectorName(item), fallbackIdx);
    }
    if (item.name) return fmt.normalizeVecSymbol(item.name, fallbackIdx);
    if (item.id != null) return "\\mathbf{v}_{" + item.id + "}";
    return fmt.normalizeVecSymbol(null, fallbackIdx);
  }

  function buildVectorOp(opKey, params) {
    const fmt = getFmt();
    const p = params || {};
    const op = opKey === "subtract" ? "sub" : String(opKey || "add");
    const u = toNumVec(p.v1Item ? p.v1Item.vec : p.v1);
    const v = toNumVec(p.v2Item ? p.v2Item.vec : p.v2);
    const sameId = p.v1Item && p.v2Item && p.v1Item.id != null && p.v1Item.id === p.v2Item.id;
    const uSym = vecItemSymbol(p.v1Item, 1);
    const vSym = sameId ? uSym : vecItemSymbol(p.v2Item, 2);

    const needsSecond = !["scale", "normalize", "vector_norm"].includes(op);

    if (u.length === 0) {
      return buildErrorBundle(
        "Phép toán trên vector",
        uSym,
        "Chưa chọn vector đầu vào",
        "Vui lòng chọn vector từ danh sách trước khi thực hiện phép toán.",
        fmt.stepSectionHtml("Kiểm tra dữ liệu đầu vào", [
          "<div class=\"sol-text\">Chưa có vector đầu vào hợp lệ được chọn. Vui lòng khởi tạo và chọn vector trong bảng điều khiển.</div>"
        ])
      );
    }

    if (needsSecond && v.length === 0) {
      return buildErrorBundle(
        "Phép toán trên hai vector",
        uSym + ",\\; " + vSym,
        "Thiếu vector thứ hai",
        "Phép toán này yêu cầu chọn đầy đủ hai vector đầu vào.",
        fmt.stepSectionHtml("Kiểm tra dữ liệu đầu vào", [
          "<div class=\"sol-text\">Vui lòng chọn cả hai vector đầu vào trong bảng điều khiển để thực hiện phép toán.</div>"
        ])
      );
    }

    // Same-dimension requirement for add, sub, dot, projection, angle_between
    if (["add", "sub", "dot", "projection", "angle_between"].includes(op) && u.length !== v.length) {
      return buildErrorBundle(
        "Kiểm tra điều kiện số chiều",
        uSym + " \\in \\mathbb{R}^{" + u.length + "},\\; " + vSym + " \\in \\mathbb{R}^{" + v.length + "}",
        "Không khớp số chiều không gian",
        "Hai vector phải thuộc cùng không gian \\(\\mathbb{R}^n\\). Hiện tại \\(" + uSym + " \\in \\mathbb{R}^{" + u.length + "}\\) và \\(" + vSym + " \\in \\mathbb{R}^{" + v.length + "}\\).",
        fmt.stepSectionHtml("Điều kiện xác định phép toán", [
          "<div class=\"sol-text\">Ta có \\(" + uSym + " = " + fmt.vecTupleLatex(u) + " \\in \\mathbb{R}^{" + u.length + "}\\) và \\(" + vSym + " = " + fmt.vecTupleLatex(v) + " \\in \\mathbb{R}^{" + v.length + "}\\).</div>",
          "<div class=\"sol-text\">Phép toán này chỉ được định nghĩa giữa hai phần tử thuộc cùng một không gian vector \\(\\mathbb{R}^n\\). Do \\(" + u.length + " \\neq " + v.length + "\\), phép toán không xác định.</div>"
        ])
      );
    }

    const n = u.length;
    const uTexArr = u.map(function (val) { return fmt.scalarToLatex(val, { allowSurd: true }); });
    const vTexArr = v.map(function (val) { return fmt.scalarToLatex(val, { allowSurd: true }); });
    const uTuple = tupleFromLatexList(uTexArr);
    const vTuple = tupleFromLatexList(vTexArr);

    // 1. ADD / SUB
    if (op === "add" || op === "sub") {
      const isAdd = op === "add";
      const signSym = isAdd ? "+" : "-";
      const resVec = u.map(function (val, i) { return cleanZero(isAdd ? val + v[i] : val - v[i]); });
      const resTexArr = Array.isArray(p.backendLatex) && p.backendLatex.length === n
        ? p.backendLatex.map(String)
        : resVec.map(function (val) { return fmt.scalarToLatex(val, { allowSurd: true }); });
      const resTuple = tupleFromLatexList(resTexArr);

      const compExprArr = u.map(function (val, i) {
        return uTexArr[i] + " " + signSym + " " + parenIfNegLatex(vTexArr[i], v[i]);
      });
      const normRes = exactNormInfo(resVec);

      const step1 = fmt.stepSectionHtml("Bước 1. Thiết lập dữ liệu và công thức tọa độ", [
        "<div class=\"sol-text\">Trong không gian vector \\(\\mathbb{R}^{" + n + "}\\), cho hai vector:</div>",
        fmt.mathBlockHtml(uSym + " = " + uTuple + ", \\qquad " + vSym + " = " + vTuple),
        "<div class=\"sol-text\">Phép " + (isAdd ? "cộng" : "trừ") + " hai vector được thực hiện trên từng tọa độ thành phần tương ứng:</div>",
        fmt.mathBlockHtml(uSym + " " + signSym + " " + vSym + " = \\left(u_1 " + signSym + " v_1,\\; " + (n === 2 ? "u_2 " + signSym + " v_2" : n === 3 ? "u_2 " + signSym + " v_2,\\; u_3 " + signSym + " v_3" : "\\dots,\\; u_{" + n + "} " + signSym + " v_{" + n + "}") + "\\right)")
      ]);

      const step2 = fmt.stepSectionHtml("Bước 2. Tính toán từng thành phần tọa độ", [
        "<div class=\"sol-text\">Thay số trực tiếp vào công thức tọa độ:</div>",
        fmt.mathBlockHtml(uSym + " " + signSym + " " + vSym + " = \\left(" + compExprArr.join(",\\; ") + "\\right) = " + resTuple)
      ]);

      const geomText = isAdd
        ? "Theo quy tắc hình bình hành (hoặc hệ thức Chasles nối đuôi), vector tổng \\(" + uSym + " + " + vSym + "\\) xuất phát từ gốc tọa độ có điểm ngọn tại \\(" + resTuple + "\\) và chuẩn Euclide \\(\\|" + uSym + " + " + vSym + "\\| = " + normRes.normLatex + "\\)."
        : "Theo quy tắc ba điểm, vector hiệu \\(" + uSym + " - " + vSym + "\\) là vector định hướng nối từ điểm ngọn của \\(" + vSym + "\\) tới điểm ngọn của \\(" + uSym + "\\), thỏa mãn \\(" + vSym + " + (" + uSym + " - " + vSym + ") = " + uSym + "\\) với chuẩn \\(\\|" + uSym + " - " + vSym + "\\| = " + normRes.normLatex + "\\).";

      const step3 = fmt.stepSectionHtml("Bước 3. Kết luận và ý nghĩa hình học", [
        fmt.mathBlockHtml(uSym + " " + signSym + " " + vSym + " = " + resTuple),
        "<div class=\"sol-text\">" + geomText + "</div>"
      ]);

      const titleLabel = isAdd ? "Tổng hai vector" : "Hiệu hai vector";
      const modalTitle = isAdd ? "Phép cộng hai vector" : "Phép trừ hai vector";
      const eqLatex = uSym + " " + signSym + " " + vSym + " = " + resTuple;

      return {
        isError: false,
        resultVec: resVec,
        resultLatexTuple: resTuple,
        logTitle: isAdd ? "Cộng 2 vector" : "Hiệu 2 vector",
        logLatex: eqLatex,
        cardOptions: {
          titleLeft: titleLabel,
          badgeRightLatex: "\\mathbb{R}^{" + n + "}",
          badgeTone: "primary",
          primaryRows: [
            {
              labelHtml: "Vector kết quả",
              latex: eqLatex,
              displayMode: true
            }
          ],
          secondarySection: {
            titleHtml: "Thông số hình học",
            rows: [
              {
                latex: "\\|" + uSym + " " + signSym + " " + vSym + "\\| = " + normRes.normLatex,
                displayMode: false,
                noteHtml: isAdd
                  ? "Đường chéo chính của hình bình hành sinh bởi hai vector thành phần."
                  : "Độ dài đoạn thẳng định hướng nối hai điểm ngọn."
              }
            ]
          }
        },
        modalConfig: {
          titleText: modalTitle,
          titleMath: uSym + " " + signSym + " " + vSym,
          content1: fmt.wrapStepContainer(step1 + step2 + step3),
          content2: ""
        }
      };
    }

    // 2. SCALE (k * u)
    if (op === "scale") {
      const parsedK = parseScalarExpr(p.scalarRaw);
      if (!parsedK.valid) {
        return buildErrorBundle(
          "Nhân vector với vô hướng",
          "k \\cdot " + uSym,
          "Hệ số vô hướng không hợp lệ",
          "Vui lòng nhập hệ số thực \\(k\\) hợp lệ, ví dụ: \\(2\\), \\(-1/2\\), \\(\\sqrt{2}\\).",
          fmt.stepSectionHtml("Kiểm tra hệ số vô hướng", [
            "<div class=\"sol-text\">Biểu thức hệ số \\(k\\) chưa hợp lệ hoặc để trống. Vui lòng nhập một số thực hoặc biểu thức căn/phân số hợp lệ.</div>"
          ])
        );
      }

      const kVal = parsedK.value;
      const kTex = parsedK.latex;
      const resVec = Array.isArray(p.backendResult) && p.backendResult.length === n
        ? p.backendResult.map(function (val) { return cleanZero(val); })
        : u.map(function (val) { return cleanZero(kVal * val); });

      const resTexArr = Array.isArray(p.backendLatex) && p.backendLatex.length === n
        ? p.backendLatex.map(String)
        : resVec.map(function (val) { return fmt.scalarToLatex(val, { allowSurd: true }); });
      const resTuple = tupleFromLatexList(resTexArr);

      const kFactorTex = parenIfNegLatex(kTex, kVal);
      const prodExprArr = u.map(function (val, i) {
        return kFactorTex + " \\cdot " + parenIfNegLatex(uTexArr[i], val);
      });

      const absKTex = kVal < 0 ? parsedK.latex.replace(/^-/, "") : parsedK.latex;
      const dirText = Math.abs(kVal) < 1e-10
        ? "Do \\(k = 0\\), vector kết quả triệt tiêu về vector không \\(\\mathbf{0}\\)."
        : (kVal > 0
          ? "Do \\(k > 0\\), vector kết quả cùng phương, cùng chiều với \\(" + uSym + "\\) và có độ dài gấp \\(|k| = " + absKTex + "\\) lần độ dài ban đầu."
          : "Do \\(k < 0\\), vector kết quả cùng phương nhưng ngược chiều \\(180^\\circ\\) so với \\(" + uSym + "\\), độ dài co dãn theo hệ số \\(|k| = " + absKTex + "\\).");

      const step1 = fmt.stepSectionHtml("Bước 1. Định nghĩa phép nhân vô hướng", [
        "<div class=\"sol-text\">Cho vector \\(" + uSym + " = " + uTuple + " \\in \\mathbb{R}^{" + n + "}\\) và hệ số vô hướng \\(k = " + kTex + " \\in \\mathbb{R}\\).</div>",
        "<div class=\"sol-text\">Tích vô hướng ngoài \\(k \\cdot " + uSym + "\\) nhân từng tọa độ của \\(" + uSym + "\\) với hệ số \\(k\\):</div>",
        fmt.mathBlockHtml("k \\cdot " + uSym + " = \\left(k u_1,\\; " + (n === 2 ? "k u_2" : n === 3 ? "k u_2,\\; k u_3" : "\\dots,\\; k u_{" + n + "}") + "\\right)")
      ]);

      const step2 = fmt.stepSectionHtml("Bước 2. Nhân hệ số vào từng thành phần tọa độ", [
        fmt.mathBlockHtml(kFactorTex + " \\cdot " + uSym + " = \\left(" + prodExprArr.join(",\\; ") + "\\right) = " + resTuple)
      ]);

      const step3 = fmt.stepSectionHtml("Bước 3. Kết luận và phân tích hình học", [
        fmt.mathBlockHtml(kFactorTex + " \\cdot " + uSym + " = " + resTuple + " \\in \\operatorname{Span}\\{" + uSym + "\\}"),
        "<div class=\"sol-text\">" + dirText + " Đẳng thức chuẩn thỏa mãn \\(\\|k" + uSym + "\\| = |k|\\,\\|" + uSym + "\\|\\).</div>"
      ]);

      const eqLatex = kFactorTex + " \\cdot " + uSym + " = " + resTuple;
      return {
        isError: false,
        resultVec: resVec,
        resultLatexTuple: resTuple,
        logTitle: "Kéo dãn vector",
        logLatex: eqLatex,
        cardOptions: {
          titleLeft: "Kéo dãn vector",
          badgeRightLatex: "k = " + kTex,
          badgeTone: "primary",
          primaryRows: [
            {
              labelHtml: "Vector sau phép vị tự",
              latex: eqLatex,
              displayMode: true
            }
          ],
          secondarySection: {
            titleHtml: "Phương và định hướng",
            rows: [
              {
                noteHtml: dirText
              }
            ]
          }
        },
        modalConfig: {
          titleText: "Nhân vector với vô hướng",
          titleMath: kFactorTex + " \\cdot " + uSym,
          content1: fmt.wrapStepContainer(step1 + step2 + step3),
          content2: ""
        }
      };
    }

    // 3. DOT PRODUCT
    if (op === "dot") {
      let sum = 0;
      const pairProducts = [];
      const pairTerms = [];
      for (let i = 0; i < n; i++) {
        const prod = cleanZero(u[i] * v[i]);
        sum += prod;
        pairProducts.push(parenIfNegLatex(uTexArr[i], u[i]) + " \\cdot " + parenIfNegLatex(vTexArr[i], v[i]));
        pairTerms.push({ val: prod, tex: fmt.scalarToLatex(prod, { allowSurd: true }) });
      }
      sum = cleanZero(sum);
      const sumTex = (typeof p.backendLatex === "string" && p.backendLatex.trim())
        ? p.backendLatex.trim()
        : fmt.scalarToLatex(sum, { allowSurd: true });

      let sumSimplifiedChain = "";
      for (let i = 0; i < pairTerms.length; i++) {
        const t = pairTerms[i];
        if (i === 0) sumSimplifiedChain += t.tex;
        else if (t.val < 0) sumSimplifiedChain += " - " + t.tex.replace(/^-/, "");
        else sumSimplifiedChain += " + " + t.tex;
      }

      const isZeroU = exactNormInfo(u).normSq < 1e-12;
      const isZeroV = exactNormInfo(v).normSq < 1e-12;

      let badgeText = "Góc nhọn";
      let badgeTone = "primary";
      let natureText = "";
      if (Math.abs(sum) < 1e-10) {
        badgeText = "Trực giao";
        badgeTone = "success";
        natureText = (isZeroU || isZeroV)
          ? "Tích vô hướng bằng \\(0\\) (có ít nhất một vector bằng \\(\\mathbf{0}\\), quy ước trực giao với mọi vector)."
          : "Do \\(\\langle " + uSym + ", " + vSym + " \\rangle = 0\\) và cả hai vector đều khác \\(\\mathbf{0}\\), hai vector vuông góc chính xác: \\(" + uSym + " \\perp " + vSym + "\\) (\\(\\theta = 90^\\circ\\)).";
      } else if (sum > 0) {
        badgeText = "Góc nhọn";
        badgeTone = "primary";
        natureText = "Do \\(\\langle " + uSym + ", " + vSym + " \\rangle > 0\\), cosin góc giữa hai vector mang dấu dương (\\(\\cos\\theta > 0\\)), góc kẹp là góc nhọn \\(0^\\circ \\le \\theta < 90^\\circ\\).";
      } else {
        badgeText = "Góc tù";
        badgeTone = "neutral";
        natureText = "Do \\(\\langle " + uSym + ", " + vSym + " \\rangle < 0\\), cosin góc giữa hai vector mang dấu âm (\\(\\cos\\theta < 0\\)), góc kẹp là góc tù \\(90^\\circ < \\theta \\le 180^\\circ\\).";
      }

      const step1 = fmt.stepSectionHtml("Bước 1. Định nghĩa tích vô hướng Euclide chính tắc", [
        "<div class=\"sol-text\">Trong không gian Euclide \\(\\mathbb{R}^{" + n + "}\\), tích vô hướng chính tắc của \\(" + uSym + " = " + uTuple + "\\) và \\(" + vSym + " = " + vTuple + "\\) được xác định bởi:</div>",
        fmt.mathBlockHtml("\\langle " + uSym + ", " + vSym + " \\rangle = " + uSym + " \\cdot " + vSym + " = \\sum_{i=1}^{" + n + "} u_i v_i")
      ]);

      const step2 = fmt.stepSectionHtml("Bước 2. Khai triển tổng tích các tọa độ tương ứng", [
        fmt.mathBlockHtml("\\langle " + uSym + ", " + vSym + " \\rangle = " + pairProducts.join(" + ") + " = " + sumSimplifiedChain + " = " + sumTex)
      ]);

      const step3 = fmt.stepSectionHtml("Bước 3. Nhận xét vị trí tương đối", [
        fmt.mathBlockHtml("\\langle " + uSym + ", " + vSym + " \\rangle = " + sumTex),
        "<div class=\"sol-text\">" + natureText + "</div>"
      ]);

      const eqLatex = "\\langle " + uSym + ", " + vSym + " \\rangle = " + sumTex;
      return {
        isError: false,
        resultScalar: sum,
        logTitle: "Tích vô hướng",
        logLatex: eqLatex,
        cardOptions: {
          titleLeft: "Tích vô hướng Euclide",
          badgeRight: badgeText,
          badgeTone: badgeTone,
          primaryRows: [
            {
              labelHtml: "Giá trị vô hướng",
              latex: eqLatex,
              displayMode: true
            }
          ],
          secondarySection: {
            titleHtml: "Nhận xét hình học",
            rows: [{ noteHtml: natureText }]
          }
        },
        modalConfig: {
          titleText: "Tích vô hướng của hai vector",
          titleMath: "\\langle " + uSym + ", " + vSym + " \\rangle",
          content1: fmt.wrapStepContainer(step1 + step2 + step3),
          content2: ""
        }
      };
    }

    // 4. VECTOR NORM
    if (op === "vector_norm") {
      const nInfo = exactNormInfo(u);
      const sqTerms = u.map(function (val, i) {
        return parenIfNegLatex(uTexArr[i], val) + "^2";
      });
      const approxDec = formatApproxIfIrrational(nInfo.normVal, nInfo.normLatex);
      const primaryLatex = approxDec
        ? "\\|" + uSym + "\\| = " + nInfo.normLatex + " \\approx " + approxDec
        : "\\|" + uSym + "\\| = " + nInfo.normLatex;

      const step1 = fmt.stepSectionHtml("Bước 1. Định nghĩa chuẩn Euclide (chuẩn L2)", [
        "<div class=\"sol-text\">Cho vector \\(" + uSym + " = " + uTuple + " \\in \\mathbb{R}^{" + n + "}\\). Độ dài Euclide cảm ứng từ tích vô hướng chính tắc là:</div>",
        fmt.mathBlockHtml("\\|" + uSym + "\\| = \\sqrt{\\langle " + uSym + ", " + uSym + " \\rangle} = \\sqrt{\\sum_{i=1}^{" + n + "} u_i^2}")
      ]);

      const step2 = fmt.stepSectionHtml("Bước 2. Tính tổng bình phương và rút gọn căn thức", [
        "<div class=\"sol-text\">Tổng bình phương các thành phần tọa độ:</div>",
        fmt.mathBlockHtml("\\|" + uSym + "\\|^2 = " + sqTerms.join(" + ") + " = " + nInfo.normSqLatex),
        "<div class=\"sol-text\">Lấy căn bậc hai không âm và rút gọn chính xác:</div>",
        fmt.mathBlockHtml(primaryLatex)
      ]);

      const step3 = fmt.stepSectionHtml("Bước 3. Kết luận hình học", [
        "<div class=\"sol-text\">Giá trị \\(\\|" + uSym + "\\| = " + nInfo.normLatex + "\\) biểu diễn khoảng cách Euclide từ gốc tọa độ \\(O\\) đến điểm ngọn \\(" + uTuple + "\\) trong không gian \\(\\mathbb{R}^{" + n + "}\\).</div>"
      ]);

      return {
        isError: false,
        resultScalar: nInfo.normVal,
        logTitle: "Độ dài vector",
        logLatex: "\\|" + uSym + "\\| = " + nInfo.normLatex,
        cardOptions: {
          titleLeft: "Độ dài vector",
          badgeRightLatex: "\\mathbb{R}^{" + n + "}",
          badgeTone: "primary",
          primaryRows: [
            {
              labelHtml: "Chuẩn Euclide",
              latex: primaryLatex,
              displayMode: true
            }
          ],
          secondarySection: {
            titleHtml: "Bình phương chuẩn",
            rows: [
              {
                latex: "\\|" + uSym + "\\|^2 = " + nInfo.normSqLatex,
                displayMode: false
              }
            ]
          }
        },
        modalConfig: {
          titleText: "Độ dài Euclide của vector",
          titleMath: "\\|" + uSym + "\\|",
          content1: fmt.wrapStepContainer(step1 + step2 + step3),
          content2: ""
        }
      };
    }

    // 5. NORMALIZE
    if (op === "normalize") {
      const nInfo = exactNormInfo(u);
      if (nInfo.normSq < 1e-12) {
        return buildErrorBundle(
          "Chuẩn hóa vector đơn vị",
          "\\hat{\\mathbf{u}} = \\frac{" + uSym + "}{\\|" + uSym + "\\|}",
          "Không thể chuẩn hóa vector không",
          "Vector \\(" + uSym + " = \\mathbf{0}\\) có độ dài \\(\\|" + uSym + "\\| = 0\\), không xác định phương chỉ hướng nên không thể chuẩn hóa thành vector đơn vị.",
          fmt.stepSectionHtml("Bước 1. Kiểm tra điều kiện khác vector không", [
            "<div class=\"sol-text\">Ta có \\(" + uSym + " = " + uTuple + "\\), suy ra chuẩn Euclide:</div>",
            fmt.mathBlockHtml("\\|" + uSym + "\\| = \\sqrt{" + u.map(function () { return "0^2"; }).join(" + ") + "} = 0"),
            "<div class=\"sol-text\">Phép chuẩn hóa \\(\\hat{\\mathbf{u}} = \\dfrac{1}{\\|" + uSym + "\\|}" + uSym + "\\) đòi hỏi \\(\\|" + uSym + "\\| \\neq 0\\). Do mẫu số bằng \\(0\\) và vector không không có phương xác định, không tồn tại vector đơn vị tương ứng.</div>"
          ])
        );
      }

      const unitVec = u.map(function (val) { return cleanZero(val / nInfo.normVal); });
      const unitTexArr = u.map(function (val) { return exactDivByNormLatex(val, nInfo); });
      const unitTuple = tupleFromLatexList(unitTexArr);
      const rawDivArr = uTexArr.map(function (t) { return "\\frac{" + t + "}{" + nInfo.normLatex + "}"; });
      const sqTerms = u.map(function (val, i) { return parenIfNegLatex(uTexArr[i], val) + "^2"; });

      const step1 = fmt.stepSectionHtml("Bước 1. Tính chuẩn Euclide của vector ban đầu", [
        "<div class=\"sol-text\">Xét vector \\(" + uSym + " = " + uTuple + " \\neq \\mathbf{0}\\). Chuẩn Euclide của \\(" + uSym + "\\) là:</div>",
        fmt.mathBlockHtml("\\|" + uSym + "\\| = \\sqrt{" + sqTerms.join(" + ") + "} = \\sqrt{" + nInfo.normSqLatex + "} = " + nInfo.normLatex + " > 0")
      ]);

      const step2 = fmt.stepSectionHtml("Bước 2. Nhân với nghịch đảo của chuẩn và trục căn thức", [
        "<div class=\"sol-text\">Vector đơn vị cùng hướng với \\(" + uSym + "\\) được xác định bởi \\(\\hat{\\mathbf{u}} = \\dfrac{1}{\\|" + uSym + "\\|}" + uSym + "\\):</div>",
        fmt.mathBlockHtml("\\hat{\\mathbf{u}} = \\left(" + rawDivArr.join(",\\; ") + "\\right) = " + unitTuple)
      ]);

      const step3 = fmt.stepSectionHtml("Bước 3. Kiểm chứng độ dài đơn vị", [
        "<div class=\"sol-text\">Kiểm tra lại chuẩn của vector sau chuẩn hóa:</div>",
        fmt.mathBlockHtml("\\|\\hat{\\mathbf{u}}\\|^2 = \\left\\|\\frac{1}{\\|" + uSym + "\\|}" + uSym + "\\right\\|^2 = \\frac{\\|" + uSym + "\\|^2}{\\|" + uSym + "\\|^2} = \\frac{" + nInfo.normSqLatex + "}{" + nInfo.normSqLatex + "} = 1 \\implies \\|\\hat{\\mathbf{u}}\\| = 1"),
        "<div class=\"sol-text\">Điểm ngọn của \\(\\hat{\\mathbf{u}}\\) nằm chính xác trên mặt cầu đơn vị tâm \\(O\\) bán kính \\(1\\), giữ nguyên phương và chiều của \\(" + uSym + "\\).</div>"
      ]);

      const eqLatex = "\\frac{" + uSym + "}{\\|" + uSym + "\\|} = " + unitTuple;
      return {
        isError: false,
        resultVec: unitVec,
        resultLatexTuple: unitTuple,
        resultLatexComponents: unitTexArr,
        logTitle: "Chuẩn hóa vector",
        logLatex: eqLatex,
        cardOptions: {
          titleLeft: "Vector đơn vị chuẩn hóa",
          badgeRightLatex: "\\|\\hat{\\mathbf{u}}\\| = 1",
          badgeTone: "success",
          primaryRows: [
            {
              labelHtml: "Tọa độ chính xác trên mặt cầu đơn vị",
              latex: eqLatex,
              displayMode: true
            }
          ],
          secondarySection: {
            titleHtml: "Độ dài ban đầu",
            rows: [
              {
                latex: "\\|" + uSym + "\\| = " + nInfo.normLatex,
                displayMode: false
              }
            ]
          }
        },
        modalConfig: {
          titleText: "Chuẩn hóa vector đơn vị",
          titleMath: "\\hat{\\mathbf{u}} = \\frac{" + uSym + "}{\\|" + uSym + "\\|}",
          content1: fmt.wrapStepContainer(step1 + step2 + step3),
          content2: ""
        }
      };
    }

    // 6. ANGLE BETWEEN
    if (op === "angle_between") {
      const uNorm = exactNormInfo(u);
      const vNorm = exactNormInfo(v);
      if (uNorm.normSq < 1e-12 || vNorm.normSq < 1e-12) {
        return buildErrorBundle(
          "Góc giữa hai vector",
          "\\angle\\left(" + uSym + ", " + vSym + "\\right)",
          "Không xác định góc với vector không",
          "Góc giữa hai vector chỉ xác định khi cả hai vector đều khác \\(\\mathbf{0}\\). Hiện tại có ít nhất một vector có độ dài bằng \\(0\\).",
          fmt.stepSectionHtml("Kiểm tra điều kiện xác định góc", [
            "<div class=\"sol-text\">Ta có \\(\\|" + uSym + "\\| = " + uNorm.normLatex + "\\) và \\(\\|" + vSym + "\\| = " + vNorm.normLatex + "\\).</div>",
            "<div class=\"sol-text\">Công thức \\(\\cos\\theta = \\dfrac{\\langle " + uSym + ", " + vSym + " \\rangle}{\\|" + uSym + "\\|\\,\\|" + vSym + "\\|}\\) yêu cầu \\(\\|" + uSym + "\\|\\,\\|" + vSym + "\\| > 0\\). Do mẫu số bằng \\(0\\), góc \\(\\theta\\) không xác định.</div>"
          ])
        );
      }

      let dotVal = 0;
      const dotPairs = [];
      for (let i = 0; i < n; i++) {
        dotVal += u[i] * v[i];
        dotPairs.push(parenIfNegLatex(uTexArr[i], u[i]) + " \\cdot " + parenIfNegLatex(vTexArr[i], v[i]));
      }
      dotVal = cleanZero(dotVal);
      const dotTex = fmt.scalarToLatex(dotVal, { allowSurd: true });

      const prodNormSqInfo = exactNormInfo([Math.sqrt(uNorm.normSq * vNorm.normSq)]);
      // Compute exact cos(theta) = dotVal / sqrt(uNormSq * vNormSq)
      let cosTex = "";
      if (uNorm.allRational && vNorm.allRational) {
        const prodNum = uNorm.ratNum * vNorm.ratNum;
        const prodDen = uNorm.ratDen * vNorm.ratDen;
        const g = gcdPos(prodNum, prodDen);
        const combinedNormInfo = {
          normSq: uNorm.normSq * vNorm.normSq,
          normVal: uNorm.normVal * vNorm.normVal,
          allRational: prodNum / g <= 1e8 && prodDen / g <= 1e7,
          ratNum: Math.trunc(prodNum / g),
          ratDen: Math.trunc(prodDen / g)
        };
        cosTex = exactDivByNormLatex(dotVal, combinedNormInfo);
      } else {
        cosTex = fmt.scalarToLatex(dotVal / (uNorm.normVal * vNorm.normVal), { allowSurd: true });
      }

      const cosClamped = Math.max(-1, Math.min(1, dotVal / (uNorm.normVal * vNorm.normVal)));
      const radVal = Math.acos(cosClamped);
      const degVal = (radVal * 180) / Math.PI;
      const special = detectSpecialAngle(cosClamped);

      const degShort = Number(degVal.toFixed(2)).toString() + "^\\circ";
      const radShort = Number(radVal.toFixed(4)).toString();

      const thetaMainLatex = special
        ? "\\theta = " + special.deg + " = " + special.rad + "\\;\\mathrm{rad}"
        : "\\theta = \\arccos\\!\\left(" + cosTex + "\\right) \\approx " + degShort + "\\;\\left(" + radShort + "\\;\\mathrm{rad}\\right)";

      let catNote = "";
      if (special) {
        catNote = special.cat + " (\\(\\cos\\theta = " + special.cosTex + "\\)).";
      } else if (degVal < 90) {
        catNote = "Góc nhọn (\\(\\cos\\theta > 0\\)): hai vector tạo với nhau góc nhỏ hơn \\(90^\\circ\\).";
      } else {
        catNote = "Góc tù (\\(\\cos\\theta < 0\\)): hai vector tạo với nhau góc lớn hơn \\(90^\\circ\\).";
      }

      const step1 = fmt.stepSectionHtml("Bước 1. Thiết lập công thức cosin góc trong không gian Euclide", [
        "<div class=\"sol-text\">Với hai vector khác không \\(" + uSym + " = " + uTuple + "\\) và \\(" + vSym + " = " + vTuple + "\\) trong \\(\\mathbb{R}^{" + n + "}\\), góc \\(\\theta \\in [0, \\pi]\\) được xác định duy nhất bởi bất đẳng thức Cauchy - Schwarz:</div>",
        fmt.mathBlockHtml("\\cos\\theta = \\frac{\\langle " + uSym + ", " + vSym + " \\rangle}{\\|" + uSym + "\\|\\,\\|" + vSym + "\\|}")
      ]);

      const step2 = fmt.stepSectionHtml("Bước 2. Tính tích vô hướng và độ dài từng vector", [
        fmt.mathBlockHtml("\\langle " + uSym + ", " + vSym + " \\rangle = " + dotPairs.join(" + ") + " = " + dotTex),
        fmt.mathBlockHtml("\\|" + uSym + "\\| = \\sqrt{" + uNorm.normSqLatex + "} = " + uNorm.normLatex + ", \\qquad \\|" + vSym + "\\| = \\sqrt{" + vNorm.normSqLatex + "} = " + vNorm.normLatex),
        "<div class=\"sol-text\">Thay vào công thức cosin và trục căn thức:</div>",
        fmt.mathBlockHtml("\\cos\\theta = \\frac{" + dotTex + "}{" + parenIfNegLatex(uNorm.normLatex, 1) + " \\cdot " + parenIfNegLatex(vNorm.normLatex, 1) + "} = " + (special ? special.cosTex : cosTex))
      ]);

      const step3 = fmt.stepSectionHtml("Bước 3. Suy ra số đo góc và phân loại hình học", [
        fmt.mathBlockHtml(thetaMainLatex),
        "<div class=\"sol-text\">" + catNote + "</div>"
      ]);

      void prodNormSqInfo;

      return {
        isError: false,
        resultScalar: radVal,
        resultDeg: degVal,
        logTitle: "Góc giữa 2 vector",
        logLatex: "\\angle\\left(" + uSym + ", " + vSym + "\\right) = " + (special ? special.deg : degShort),
        cardOptions: {
          titleLeft: "Góc giữa hai vector",
          badgeRightLatex: "\\cos\\theta = " + (special ? special.cosTex : cosTex),
          badgeTone: Math.abs(cosClamped) < 1e-7 ? "success" : "primary",
          primaryRows: [
            {
              labelHtml: "Số đo góc",
              latex: thetaMainLatex,
              displayMode: true
            }
          ],
          secondarySection: {
            titleHtml: "Phân loại góc",
            rows: [{ noteHtml: catNote }]
          }
        },
        modalConfig: {
          titleText: "Góc giữa hai vector",
          titleMath: "\\theta = \\angle\\left(" + uSym + ", " + vSym + "\\right)",
          content1: fmt.wrapStepContainer(step1 + step2 + step3),
          content2: ""
        }
      };
    }

    // 7. ORTHOGONAL PROJECTION (project v1 onto v2!)
    if (op === "projection") {
      const vNorm = exactNormInfo(v);
      if (vNorm.normSq < 1e-12) {
        return buildErrorBundle(
          "Hình chiếu trực giao",
          "\\operatorname{proj}_{" + vSym + "}(" + uSym + ")",
          "Phương chiếu không hợp lệ",
          "Vector chỉ phương chiếu \\(" + vSym + " = \\mathbf{0}\\) không xác định đường thẳng chiếu. Vui lòng chọn vector \\(" + vSym + " \\neq \\mathbf{0}\\).",
          fmt.stepSectionHtml("Kiểm tra điều kiện phương chiếu", [
            "<div class=\"sol-text\">Ta có \\(" + vSym + " = " + vTuple + " = \\mathbf{0}\\), suy ra \\(\\|" + vSym + "\\|^2 = 0\\).</div>",
            "<div class=\"sol-text\">Không gian con \\(\\operatorname{Span}\\{" + vSym + "\\} = \\{\\mathbf{0}\\}\\) có số chiều bằng \\(0\\), không tạo thành đường thẳng phương chiếu nên công thức \\(\\dfrac{\\langle " + uSym + ", " + vSym + " \\rangle}{\\|" + vSym + "\\|^2}" + vSym + "\\) không xác định.</div>"
          ])
        );
      }

      let dotVal = 0;
      const dotPairs = [];
      for (let i = 0; i < n; i++) {
        dotVal += u[i] * v[i];
        dotPairs.push(parenIfNegLatex(uTexArr[i], u[i]) + " \\cdot " + parenIfNegLatex(vTexArr[i], v[i]));
      }
      dotVal = cleanZero(dotVal);
      const dotTex = fmt.scalarToLatex(dotVal, { allowSurd: true });

      const alphaVal = cleanZero(dotVal / vNorm.normSq);
      const alphaTex = fmt.scalarToLatex(alphaVal, { allowSurd: true });
      const projVec = v.map(function (vj) { return cleanZero(alphaVal * vj); });
      const projTexArr = Array.isArray(p.backendLatex) && p.backendLatex.length === n
        ? p.backendLatex.map(String)
        : projVec.map(function (val) { return fmt.scalarToLatex(val, { allowSurd: true }); });
      const projTuple = tupleFromLatexList(projTexArr);

      const perpVec = u.map(function (ui, i) { return cleanZero(ui - projVec[i]); });
      const perpTexArr = perpVec.map(function (val) { return fmt.scalarToLatex(val, { allowSurd: true }); });
      const perpTuple = tupleFromLatexList(perpTexArr);

      const step1 = fmt.stepSectionHtml("Bước 1. Công thức hình chiếu trực giao lên đường thẳng", [
        "<div class=\"sol-text\">Cho vector cần chiếu \\(" + uSym + " = " + uTuple + "\\) và vector chỉ phương chiếu \\(" + vSym + " = " + vTuple + " \\neq \\mathbf{0}\\).</div>",
        "<div class=\"sol-text\">Hình chiếu trực giao của \\(" + uSym + "\\) lên không gian con \\(W = \\operatorname{Span}\\{" + vSym + "\\}\\) được xác định bởi:</div>",
        fmt.mathBlockHtml("\\mathbf{p} = \\operatorname{proj}_{" + vSym + "}(" + uSym + ") = \\frac{\\langle " + uSym + ", " + vSym + " \\rangle}{\\|" + vSym + "\\|^2}\\," + vSym)
      ]);

      const step2 = fmt.stepSectionHtml("Bước 2. Tính hệ số chiếu và tọa độ vector hình chiếu", [
        fmt.mathBlockHtml("\\langle " + uSym + ", " + vSym + " \\rangle = " + dotPairs.join(" + ") + " = " + dotTex + ", \\qquad \\|" + vSym + "\\|^2 = " + vNorm.normSqLatex),
        "<div class=\"sol-text\">Hệ số chiếu vô hướng \\(\\alpha = \\dfrac{" + dotTex + "}{" + vNorm.normSqLatex + "} = " + alphaTex + "\\). Suy ra tọa độ hình chiếu:</div>",
        fmt.mathBlockHtml("\\operatorname{proj}_{" + vSym + "}(" + uSym + ") = " + parenIfNegLatex(alphaTex, alphaVal) + " \\cdot " + vTuple + " = " + projTuple)
      ]);

      const step3 = fmt.stepSectionHtml("Bước 3. Phân rã trực giao và kiểm chứng vuông góc", [
        "<div class=\"sol-text\">Thành phần trực giao còn lại \\(\\mathbf{u}_{\\perp} = " + uSym + " - \\operatorname{proj}_{" + vSym + "}(" + uSym + ")\\) là:</div>",
        fmt.mathBlockHtml("\\mathbf{u}_{\\perp} = " + uTuple + " - " + projTuple + " = " + perpTuple),
        "<div class=\"sol-text\">Kiểm chứng tính trực giao: \\(\\langle \\mathbf{u}_{\\perp}, " + vSym + " \\rangle = 0\\) và \\(" + uSym + " = \\mathbf{p} + \\mathbf{u}_{\\perp}\\).</div>"
      ]);

      const eqLatex = "\\operatorname{proj}_{" + vSym + "}(" + uSym + ") = " + projTuple;
      return {
        isError: false,
        resultVec: projVec,
        resultLatexTuple: projTuple,
        logTitle: "Hình chiếu trực giao",
        logLatex: eqLatex,
        cardOptions: {
          titleLeft: "Hình chiếu trực giao",
          badgeRightLatex: "\\alpha = " + alphaTex,
          badgeTone: "primary",
          primaryRows: [
            {
              labelHtml: "Vector hình chiếu trên phương " + "\\(" + vSym + "\\)",
              latex: eqLatex,
              displayMode: true
            }
          ],
          secondarySection: {
            titleHtml: "Thành phần trực giao đi kèm",
            rows: [
              {
                latex: "\\mathbf{u}_{\\perp} = " + uSym + " - \\mathbf{p} = " + perpTuple,
                displayMode: false
              }
            ]
          }
        },
        modalConfig: {
          titleText: "Hình chiếu trực giao của vector",
          titleMath: "\\operatorname{proj}_{" + vSym + "}(" + uSym + ")",
          content1: fmt.wrapStepContainer(step1 + step2 + step3),
          content2: ""
        }
      };
    }

    // 8. CROSS PRODUCT (DUAL METHOD: Cách 1 Formal Determinant | Cách 2 Skew-Symmetric Matrix & Area)
    if (op === "cross") {
      if ((u.length !== 2 && u.length !== 3) || (v.length !== 2 && v.length !== 3)) {
        return buildErrorBundle(
          "Tích có hướng của hai vector",
          uSym + " \\times " + vSym,
          "Số chiều không hỗ trợ tích có hướng",
          "Tích có hướng chuẩn chỉ được định nghĩa cho các vector trong \\(\\mathbb{R}^3\\) (hoặc nhúng phẳng từ \\(\\mathbb{R}^2\\) vào \\(\\mathbb{R}^3\\)).",
          fmt.stepSectionHtml("Điều kiện xác định tích có hướng", [
            "<div class=\"sol-text\">Tích có hướng \\(" + uSym + " \\times " + vSym + "\\) là phép toán đặc trưng của không gian Euclide định hướng \\(\\mathbb{R}^3\\). Dữ liệu hiện tại có số chiều ngoài phạm vi \\(2\\) hoặc \\(3\\).</div>"
          ])
        );
      }

      const wasEmbedded = u.length === 2 || v.length === 2;
      const a = [u[0] || 0, u[1] || 0, u.length === 3 ? u[2] : 0];
      const b = [v[0] || 0, v[1] || 0, v.length === 3 ? v[2] : 0];
      const aTex = a.map(function (val) { return fmt.scalarToLatex(val, { allowSurd: true }); });
      const bTex = b.map(function (val) { return fmt.scalarToLatex(val, { allowSurd: true }); });

      const w0 = cleanZero(a[1] * b[2] - a[2] * b[1]);
      const w1 = cleanZero(a[2] * b[0] - a[0] * b[2]);
      const w2 = cleanZero(a[0] * b[1] - a[1] * b[0]);
      const resVec = [w0, w1, w2];

      const resTexArr = Array.isArray(p.backendLatex) && p.backendLatex.length === 3
        ? p.backendLatex.map(String)
        : resVec.map(function (val) { return fmt.scalarToLatex(val, { allowSurd: true }); });
      const resTuple = tupleFromLatexList(resTexArr);
      const areaInfo = exactNormInfo(resVec);

      const embedNoteHtml = wasEmbedded
        ? "<div class=\"sol-text\">Nhúng tự nhiên vector phẳng thuộc \\(\\mathbb{R}^2\\) vào mặt phẳng \\(Oxy \\subset \\mathbb{R}^3\\) bằng cách bổ sung thành phần cao độ \\(z = 0\\):</div>"
        : "<div class=\"sol-text\">Trong không gian Euclide định hướng \\(\\mathbb{R}^3\\) với cơ sở trực chuẩn thuận \\(\\{\\mathbf{i}, \\mathbf{j}, \\mathbf{k}\\}\\), cho hai vector:</div>";

      // Cách 1: Định thức hình thức & định thức con cấp 2
      const c1Step1 = fmt.stepSectionHtml("Bước 1. Thiết lập định thức hình thức cấp 3", [
        embedNoteHtml,
        fmt.mathBlockHtml(uSym + " = " + tupleFromLatexList(aTex) + ", \\qquad " + vSym + " = " + tupleFromLatexList(bTex)),
        fmt.mathBlockHtml(uSym + " \\times " + vSym + " = \\begin{vmatrix} \\mathbf{i} & \\mathbf{j} & \\mathbf{k} \\\\ " + aTex.join(" & ") + " \\\\ " + bTex.join(" & ") + " \\end{vmatrix}")
      ]);

      const m1Calc = parenIfNegLatex(aTex[1], a[1]) + " \\cdot " + parenIfNegLatex(bTex[2], b[2]) + " - " + parenIfNegLatex(aTex[2], a[2]) + " \\cdot " + parenIfNegLatex(bTex[1], b[1]);
      const m2Calc = parenIfNegLatex(aTex[0], a[0]) + " \\cdot " + parenIfNegLatex(bTex[2], b[2]) + " - " + parenIfNegLatex(aTex[2], a[2]) + " \\cdot " + parenIfNegLatex(bTex[0], b[0]);
      const m3Calc = parenIfNegLatex(aTex[0], a[0]) + " \\cdot " + parenIfNegLatex(bTex[1], b[1]) + " - " + parenIfNegLatex(aTex[1], a[1]) + " \\cdot " + parenIfNegLatex(bTex[0], b[0]);

      const c1Step2 = fmt.stepSectionHtml("Bước 2. Khai triển theo dòng đầu tiên (các định thức con cấp 2)", [
        fmt.mathBlockHtml("w_1 = +\\begin{vmatrix} " + aTex[1] + " & " + aTex[2] + " \\\\ " + bTex[1] + " & " + bTex[2] + " \\end{vmatrix} = " + m1Calc + " = " + resTexArr[0]),
        fmt.mathBlockHtml("w_2 = -\\begin{vmatrix} " + aTex[0] + " & " + aTex[2] + " \\\\ " + bTex[0] + " & " + bTex[2] + " \\end{vmatrix} = -\\left(" + m2Calc + "\\right) = " + resTexArr[1]),
        fmt.mathBlockHtml("w_3 = +\\begin{vmatrix} " + aTex[0] + " & " + aTex[1] + " \\\\ " + bTex[0] + " & " + bTex[1] + " \\end{vmatrix} = " + m3Calc + " = " + resTexArr[2])
      ]);

      const c1Step3 = fmt.stepSectionHtml("Bước 3. Kết luận vector tích có hướng", [
        fmt.mathBlockHtml(uSym + " \\times " + vSym + " = " + resTuple),
        "<div class=\"sol-text\">" + (areaInfo.normSq < 1e-12
          ? "Do tích có hướng bằng \\(\\mathbf{0}\\), hai vector \\(" + uSym + "\\) và \\(" + vSym + "\\) cùng phương (phụ thuộc tuyến tính)."
          : "Vector \\(" + uSym + " \\times " + vSym + "\\) vuông góc đồng thời với cả \\(" + uSym + "\\) và \\(" + vSym + "\\) theo quy tắc bàn tay phải.") + "</div>"
      ]);

      // Cách 2: Toán tử phản đối xứng [u]_x * v, kiểm chứng trực giao & diện tích hình bình hành
      const skewMat = [
        [0, cleanZero(-a[2]), cleanZero(a[1])],
        [cleanZero(a[2]), 0, cleanZero(-a[0])],
        [cleanZero(-a[1]), cleanZero(a[0]), 0]
      ];
      const skewLatex = fmt.matrixToLatex(skewMat, { bracket: "bmatrix", allowSurd: true });

      const c2Step1 = fmt.stepSectionHtml("Bước 1. Biểu diễn qua ma trận phản đối xứng (Skew-symmetric operator)", [
        "<div class=\"sol-text\">Phép nhân có hướng với vector cố định \\(" + uSym + " = " + tupleFromLatexList(aTex) + "\\) tương đương với tác động của ma trận phản đối xứng \\([" + uSym + "]_{\\times}\\):</div>",
        fmt.mathBlockHtml("[" + uSym + "]_{\\times} = \\begin{bmatrix} 0 & -u_3 & u_2 \\\\ u_3 & 0 & -u_1 \\\\ -u_2 & u_1 & 0 \\end{bmatrix} = " + skewLatex)
      ]);

      const c2Step2 = fmt.stepSectionHtml("Bước 2. Nhân ma trận phản đối xứng với vector cột thứ hai", [
        fmt.mathBlockHtml(uSym + " \\times " + vSym + " = [" + uSym + "]_{\\times} " + colVecFromLatexList(bTex) + " = " + skewLatex + " " + colVecFromLatexList(bTex) + " = " + colVecFromLatexList(resTexArr))
      ]);

      const c2Step3 = fmt.stepSectionHtml("Bước 3. Kiểm chứng tính trực giao và diện tích hình bình hành", [
        "<div class=\"sol-text\">Kiểm tra tích vô hướng của \\(\\mathbf{w} = " + uSym + " \\times " + vSym + "\\) với từng vector thành phần:</div>",
        fmt.mathBlockHtml("\\langle \\mathbf{w}, " + uSym + " \\rangle = 0, \\qquad \\langle \\mathbf{w}, " + vSym + " \\rangle = 0"),
        "<div class=\"sol-text\">Diện tích hình bình hành căng bởi \\(" + uSym + "\\) và \\(" + vSym + "\\) trong không gian \\(\\mathbb{R}^3\\) bằng chuẩn Euclide của tích có hướng:</div>",
        fmt.mathBlockHtml("S = \\|" + uSym + " \\times " + vSym + "\\| = \\sqrt{" + areaInfo.normSqLatex + "} = " + areaInfo.normLatex)
      ]);

      const eqLatex = uSym + " \\times " + vSym + " = " + resTuple;
      return {
        isError: false,
        resultVec: resVec,
        resultLatexTuple: resTuple,
        logTitle: "Tích có hướng",
        logLatex: eqLatex,
        cardOptions: {
          titleLeft: "Tích có hướng hai vector",
          badgeRightLatex: "S = " + areaInfo.normLatex,
          badgeTone: areaInfo.normSq < 1e-12 ? "warning" : "primary",
          primaryRows: [
            {
              labelHtml: "Vector pháp tuyến định hướng",
              latex: eqLatex,
              displayMode: true
            }
          ],
          secondarySection: {
            titleHtml: "Diện tích hình bình hành cơ sở",
            rows: [
              {
                latex: "S = \\|" + uSym + " \\times " + vSym + "\\| = " + areaInfo.normLatex,
                displayMode: false,
                noteHtml: areaInfo.normSq < 1e-12
                  ? "Hai vector cùng phương nên diện tích hình bình hành suy biến bằng 0."
                  : "Vector tích có hướng vuông góc với mặt phẳng sinh bởi hai vector thành phần."
              }
            ]
          }
        },
        modalConfig: {
          titleText: "Tích có hướng của hai vector",
          titleMath: uSym + " \\times " + vSym,
          tab1Label: "Cách 1: Định thức hình thức",
          tab2Label: "Cách 2: Ma trận phản đối xứng & Kiểm chứng",
          content1: fmt.wrapStepContainer(c1Step1 + c1Step2 + c1Step3),
          content2: fmt.wrapStepContainer(c2Step1 + c2Step2 + c2Step3)
        }
      };
    }

    return buildErrorBundle(
      "Phép toán vector",
      uSym,
      "Phép toán không xác định",
      "Không nhận diện được mã phép toán vector.",
      fmt.stepSectionHtml("Thông báo", ["<div class=\"sol-text\">Mã phép toán không hợp lệ.</div>"])
    );
  }

  // ===========================================================================
  // II. MATRIX OPERATIONS (det, inv, rank, transpose, mul_matrix)
  // ===========================================================================

  function cleanMatrix(M) {
    if (!Array.isArray(M) || M.length === 0 || !Array.isArray(M[0])) return [];
    return M.map(function (row) {
      return row.map(function (val) { return cleanZero(val); });
    });
  }

  function submatrixMinor(M, skipRow, skipCol) {
    const out = [];
    for (let i = 0; i < M.length; i++) {
      if (i === skipRow) continue;
      const r = [];
      for (let j = 0; j < M[i].length; j++) {
        if (j === skipCol) continue;
        r.push(M[i][j]);
      }
      out.push(r);
    }
    return out;
  }

  function exactDetOfSquare(M) {
    const fmt = getFmt();
    const n = M.length;
    if (n === 0) return { det: 1, detLatex: "1" };
    if (n === 1) {
      const v = cleanZero(M[0][0]);
      return { det: v, detLatex: fmt.scalarToLatex(v, { allowSurd: false }) };
    }
    const g = fmt.gaussRrefWithSteps(M, { mode: "ref", bracket: "bmatrix" });
    const detVal = cleanZero(g.det == null ? 0 : g.det);
    const detTex = g.detLatex || fmt.scalarToLatex(detVal, { allowSurd: false });
    return { det: detVal, detLatex: detTex, gauss: g };
  }

  function buildParamBannerHtml(paramInfoA, paramInfoB) {
    const fmt = getFmt();
    const parts = [];
    function formatOne(info, sym) {
      if (!info || !info.isParametric || !Array.isArray(info.rawValues)) return;
      const rawRows = info.rawValues.map(function (r) {
        return r.map(function (cell) { return String(cell == null ? "0" : cell); }).join(" & ");
      }).join(" \\\\ ");
      const paramDesc = info.paramDescLatex || "";
      parts.push(
        "<div class=\"sol-text\">Ma trận tham số \\(" + sym + " = \\begin{bmatrix} " + rawRows + " \\end{bmatrix}\\)" +
        (paramDesc ? " được thế tại giá trị tham số \\(" + paramDesc + "\\)." : ".") +
        "</div>"
      );
    }
    formatOne(paramInfoA, "A");
    formatOne(paramInfoB, "B");
    if (parts.length === 0) return "";
    return fmt.stepSectionHtml("Thông tin thế giá trị tham số", parts);
  }

  function buildMatrixOp(opKey, params) {
    const fmt = getFmt();
    const p = params || {};
    const op = String(opKey || "det");
    const A = cleanMatrix(p.A);
    const nameA = fmt.normalizeMatSymbol(p.nameA, "A");

    if (A.length === 0 || A[0].length === 0) {
      return buildErrorBundle(
        "Phép toán ma trận",
        nameA,
        "Dữ liệu ma trận chưa hợp lệ",
        "Vui lòng nhập đầy đủ các phần tử của ma trận \\(" + nameA + "\\).",
        fmt.stepSectionHtml("Kiểm tra dữ liệu", [
          "<div class=\"sol-text\">Lưới ma trận \\(" + nameA + "\\) chưa có dữ liệu hợp lệ.</div>"
        ])
      );
    }

    const rowsA = A.length;
    const colsA = A[0].length;
    const matALatex = fmt.matrixToLatex(A, { bracket: "bmatrix", allowSurd: false });
    const matAVbarLatex = fmt.matrixToLatex(A, { bracket: "vmatrix", allowSurd: false });
    const paramBanner = buildParamBannerHtml(p.paramInfoA, p.paramInfoB);

    // 1. DETERMINANT (det)
    if (op === "det") {
      if (rowsA !== colsA) {
        return buildErrorBundle(
          "Định thức của ma trận",
          "\\det(" + nameA + ")",
          "Ma trận không vuông",
          "Định thức chỉ được xác định trên các ma trận vuông \\(n \\times n\\). Ma trận \\(" + nameA + "\\) hiện tại có cấp \\(" + rowsA + " \\times " + colsA + "\\).",
          fmt.stepSectionHtml("Điều kiện tồn tại định thức", [
            "<div class=\"sol-text\">Cho ma trận \\(" + nameA + " \\in \\mathcal{M}_{" + rowsA + " \\times " + colsA + "}(\\mathbb{R})\\):</div>",
            fmt.mathBlockHtml(nameA + " = " + matALatex),
            "<div class=\"sol-text\">Định thức là ánh xạ đa tuyến tính thay phiên chuẩn hóa duy nhất trên các ma trận vuông \\(\\mathcal{M}_n(\\mathbb{R})\\). Vì \\(" + rowsA + " \\neq " + colsA + "\\), không tồn tại \\(\\det(" + nameA + ")\\).</div>"
          ])
        );
      }

      const n = rowsA;
      const detRes = exactDetOfSquare(A);
      const detVal = detRes.det;
      const detLatex = detRes.detLatex;
      const absDetLatex = detLatex.startsWith("-") ? detLatex.slice(1) : detLatex;
      const isSingular = Math.abs(detVal) < 1e-10;

      // Cách 1: Khử Gauss về ma trận tam giác trên
      let c1Html = "";
      if (n === 1) {
        c1Html =
          paramBanner +
          fmt.stepSectionHtml("Bước 1. Định thức của ma trận vuông cấp 1", [
            "<div class=\"sol-text\">Với ma trận cấp \\(1 \\times 1\\) \\(" + nameA + " = " + matALatex + "\\), định thức bằng chính phần tử duy nhất của nó:</div>",
            fmt.mathBlockHtml("\\det(" + nameA + ") = " + detLatex)
          ]);
      } else {
        const g = detRes.gauss;
        const diagEntries = [];
        for (let i = 0; i < n; i++) {
          const dVal = g.refMatrix[i][i];
          const dTex = fmt.scalarToLatex(dVal, { allowSurd: false });
          diagEntries.push(parenIfNegLatex(dTex, dVal));
        }
        const swapSignNote = g.swaps === 0
          ? "Quá trình khử không thực hiện hoán vị dòng nào (\\(s = 0 \\implies (-1)^0 = +1\\))."
          : "Quá trình khử thực hiện \\(s = " + g.swaps + "\\) phép hoán vị dòng, hệ số đổi dấu là \\((-1)^{" + g.swaps + "} = " + (g.swaps % 2 === 0 ? "+1" : "-1") + "\\).";

        const c1Step1 = fmt.stepSectionHtml("Bước 1. Đưa ma trận về dạng bậc thang (tam giác trên) bằng khử Gauss", [
          "<div class=\"sol-text\">Xét ma trận vuông cấp \\(" + n + "\\):</div>",
          fmt.mathBlockHtml(nameA + " = " + matALatex),
          fmt.renderGaussChainHtml(matALatex, g.steps, "Áp dụng phép biến đổi sơ cấp dòng")
        ]);

        const c1Step2 = fmt.stepSectionHtml("Bước 2. Nhân các phần tử trên đường chéo chính", [
          "<div class=\"sol-text\">" + swapSignNote + " Định thức bằng tích các phần tử trên đường chéo chính của ma trận tam giác trên nhân với \\((-1)^s\\):</div>",
          fmt.mathBlockHtml("\\det(" + nameA + ") = " + (g.swaps > 0 ? "(-1)^{" + g.swaps + "} \\cdot " : "") + diagEntries.join(" \\cdot ") + " = " + detLatex)
        ]);

        const geomNote = isSingular
          ? "Vì \\(\\det(" + nameA + ") = 0\\), các vector cột phụ thuộc tuyến tính, ma trận \\(" + nameA + "\\) suy biến (không khả nghịch) và làm sụp số chiều không gian."
          : "Vì \\(\\det(" + nameA + ") = " + detLatex + " \\neq 0\\), ma trận \\(" + nameA + "\\) khả nghịch; hệ số co dãn thể tích là \\(|\\det(" + nameA + ")| = " + absDetLatex + "\\) và ánh xạ " + (detVal > 0 ? "bảo toàn" : "đảo ngược") + " định hướng không gian.";

        const c1Step3 = fmt.stepSectionHtml("Bước 3. Kết luận và ý nghĩa hình học", [
          fmt.mathBlockHtml("\\det(" + nameA + ") = " + detLatex),
          "<div class=\"sol-text\">" + geomNote + "</div>"
        ]);
        c1Html = paramBanner + c1Step1 + c1Step2 + c1Step3;
      }

      // Cách 2: Khai triển Laplace theo dòng/cột nhiều số 0 nhất (+ Sarrus khi n = 3)
      let c2Html = "";
      if (n === 1) {
        c2Html = paramBanner + fmt.stepSectionHtml("Khai triển phần bù đại số cấp 1", [
          "<div class=\"sol-text\">Ma trận cấp \\(1\\) có duy nhất phần tử \\(a_{11} = " + detLatex + "\\), do đó \\(\\det(" + nameA + ") = " + detLatex + "\\).</div>"
        ]);
      } else if (n === 2) {
        const a11 = fmt.scalarToLatex(A[0][0], { allowSurd: false });
        const a12 = fmt.scalarToLatex(A[0][1], { allowSurd: false });
        const a21 = fmt.scalarToLatex(A[1][0], { allowSurd: false });
        const a22 = fmt.scalarToLatex(A[1][1], { allowSurd: false });
        const p1 = cleanZero(A[0][0] * A[1][1]);
        const p2 = cleanZero(A[0][1] * A[1][0]);
        c2Html = paramBanner +
          fmt.stepSectionHtml("Bước 1. Khai triển định thức cấp 2 theo công thức Leibniz", [
            "<div class=\"sol-text\">Với ma trận cấp \\(2 \\times 2\\), tích chéo chính trừ tích chéo phụ cho ta:</div>",
            fmt.mathBlockHtml("\\det(" + nameA + ") = " + matAVbarLatex + " = a_{11}a_{22} - a_{12}a_{21}")
          ]) +
          fmt.stepSectionHtml("Bước 2. Thay số và rút gọn", [
            fmt.mathBlockHtml("\\det(" + nameA + ") = " + parenIfNegLatex(a11, A[0][0]) + " \\cdot " + parenIfNegLatex(a22, A[1][1]) + " - " + parenIfNegLatex(a12, A[0][1]) + " \\cdot " + parenIfNegLatex(a21, A[1][0]) + " = " + fmt.scalarToLatex(p1, { allowSurd: false }) + " - " + parenIfNegLatex(fmt.scalarToLatex(p2, { allowSurd: false }), p2) + " = " + detLatex)
          ]);
      } else {
        // Choose row or col with maximum zeros!
        let bestType = "row";
        let bestIdx = 0;
        let bestZeros = -1;
        for (let i = 0; i < n; i++) {
          let zRow = 0;
          let zCol = 0;
          for (let j = 0; j < n; j++) {
            if (Math.abs(A[i][j]) < 1e-10) zRow++;
            if (Math.abs(A[j][i]) < 1e-10) zCol++;
          }
          if (zRow > bestZeros) {
            bestZeros = zRow;
            bestType = "row";
            bestIdx = i;
          }
          if (zCol > bestZeros) {
            bestZeros = zCol;
            bestType = "col";
            bestIdx = i;
          }
        }

        const axisLabel = bestType === "row"
          ? "dòng thứ " + (bestIdx + 1)
          : "cột thứ " + (bestIdx + 1);
        const formulaSum = bestType === "row"
          ? "\\det(" + nameA + ") = \\sum_{j=1}^{" + n + "} (-1)^{" + (bestIdx + 1) + "+j} a_{" + (bestIdx + 1) + "j} M_{" + (bestIdx + 1) + "j}"
          : "\\det(" + nameA + ") = \\sum_{i=1}^{" + n + "} (-1)^{i+" + (bestIdx + 1) + "} a_{i" + (bestIdx + 1) + "} M_{i" + (bestIdx + 1) + "}";

        const cofactorBlocks = [];
        const finalSumTerms = [];

        for (let k = 0; k < n; k++) {
          const rIdx = bestType === "row" ? bestIdx : k;
          const cIdx = bestType === "row" ? k : bestIdx;
          const entryVal = A[rIdx][cIdx];
          if (Math.abs(entryVal) < 1e-10) continue;

          const sub = submatrixMinor(A, rIdx, cIdx);
          const subDet = exactDetOfSquare(sub);
          const signPow = (rIdx + 1) + (cIdx + 1);
          const signFactor = signPow % 2 === 0 ? 1 : -1;
          const cofVal = cleanZero(signFactor * subDet.det);
          const termVal = cleanZero(entryVal * cofVal);
          const entryTex = fmt.scalarToLatex(entryVal, { allowSurd: false });
          const subVbar = fmt.matrixToLatex(sub, { bracket: "vmatrix", allowSurd: false });

          cofactorBlocks.push(
            fmt.mathBlockHtml(
              "C_{" + (rIdx + 1) + (cIdx + 1) + "} = (-1)^{" + (rIdx + 1) + "+" + (cIdx + 1) + "} " + subVbar +
              " = " + (signFactor > 0 ? "+" : "-") + parenIfNegLatex(subDet.detLatex, subDet.det) +
              " = " + fmt.scalarToLatex(cofVal, { allowSurd: false })
            )
          );
          finalSumTerms.push({
            expr: parenIfNegLatex(entryTex, entryVal) + " \\cdot " + parenIfNegLatex(fmt.scalarToLatex(cofVal, { allowSurd: false }), cofVal),
            val: termVal
          });
        }

        const stepLap1 = fmt.stepSectionHtml("Bước 1. Chọn " + axisLabel + " để khai triển Laplace", [
          "<div class=\"sol-text\">Ta chọn khai triển theo " + axisLabel + " (có \\(" + bestZeros + "\\) phần tử bằng \\(0\\)) nhằm giảm tối đa số định thức con cần tính:</div>",
          fmt.mathBlockHtml(formulaSum)
        ]);

        let stepLap2 = "";
        if (cofactorBlocks.length === 0) {
          stepLap2 = fmt.stepSectionHtml("Bước 2. Nhận xét dòng/cột toàn phần tử không", [
            "<div class=\"sol-text\">Toàn bộ các phần tử trên " + axisLabel + " đều bằng \\(0\\), nên mọi hạng tử trong tổng khai triển đều triệt tiêu.</div>"
          ]);
        } else {
          stepLap2 = fmt.stepSectionHtml("Bước 2. Tính các phần bù đại số tương ứng với phần tử khác không", cofactorBlocks);
        }

        const sumExprTex = finalSumTerms.length > 0
          ? finalSumTerms.map(function (t) { return t.expr; }).join(" + ")
          : "0";

        const sarrusExtra = n === 3
          ? "<div class=\"sol-text\">Đối chiếu nhanh bằng quy tắc đường chéo Sarrus cho ma trận cấp \\(3\\) cũng thu được kết quả trùng khớp \\(\\det(" + nameA + ") = " + detLatex + "\\).</div>"
          : "";

        const stepLap3 = fmt.stepSectionHtml("Bước 3. Tổng hợp kết quả định thức", [
          fmt.mathBlockHtml("\\det(" + nameA + ") = " + sumExprTex + " = " + detLatex),
          sarrusExtra
        ]);

        c2Html = paramBanner + stepLap1 + stepLap2 + stepLap3;
      }

      const eqLatex = "\\det(" + nameA + ") = " + detLatex;
      return {
        isError: false,
        det: detVal,
        detLatex: detLatex,
        logTitle: "Định thức ma trận",
        logLatex: eqLatex,
        cardOptions: {
          titleLeft: "Định thức ma trận",
          badgeRight: isSingular ? "Suy biến" : "Khả nghịch",
          badgeTone: isSingular ? "warning" : "success",
          primaryRows: [
            {
              labelHtml: "Giá trị định thức chính xác",
              latex: eqLatex,
              displayMode: true
            }
          ],
          secondarySection: {
            titleHtml: "Đặc trưng hình học",
            rows: [
              {
                latex: "|\\det(" + nameA + ")| = " + absDetLatex,
                displayMode: false,
                noteHtml: isSingular
                  ? "Các cột phụ thuộc tuyến tính, thể tích khối hộp cơ sở suy biến về 0."
                  : (detVal > 0 ? "Ánh xạ bảo toàn định hướng không gian." : "Ánh xạ đảo ngược định hướng không gian.")
              }
            ]
          }
        },
        modalConfig: {
          titleText: "Tính định thức ma trận",
          titleMath: "\\det(" + nameA + "),\\; " + nameA + " \\in \\mathcal{M}_{" + n + "}(\\mathbb{R})",
          tab1Label: "Cách 1: Khử Gauss (Tam giác trên)",
          tab2Label: "Cách 2: Khai triển Laplace",
          content1: fmt.wrapStepContainer(c1Html),
          content2: fmt.wrapStepContainer(c2Html)
        }
      };
    }

    // 2. MATRIX INVERSE (inv)
    if (op === "inv") {
      if (rowsA !== colsA) {
        return buildErrorBundle(
          "Ma trận nghịch đảo",
          nameA + "^{-1}",
          "Ma trận không vuông",
          "Chỉ ma trận vuông mới có thể khả nghịch. Ma trận \\(" + nameA + "\\) hiện tại có cấp \\(" + rowsA + " \\times " + colsA + "\\).",
          fmt.stepSectionHtml("Điều kiện cần để khả nghịch", [
            "<div class=\"sol-text\">Đẳng thức song phương \\(" + nameA + " " + nameA + "^{-1} = " + nameA + "^{-1} " + nameA + " = I_n\\) đòi hỏi \\(" + nameA + "\\) phải là ma trận vuông. Do \\(" + rowsA + " \\neq " + colsA + "\\), không tồn tại \\(" + nameA + "^{-1}\\).</div>"
          ])
        );
      }

      const n = rowsA;
      const aug = A.map(function (row, i) {
        const idRow = [];
        for (let j = 0; j < n; j++) idRow.push(i === j ? 1 : 0);
        return row.concat(idRow);
      });

      const gAug = fmt.gaussRrefWithSteps(aug, { mode: "rref", augCol: n, bracket: "bmatrix" });
      const augInitLatex = fmt.matrixToLatex(aug, { augCol: n, bracket: "bmatrix", allowSurd: false });
      const detRes = exactDetOfSquare(A);

      if (gAug.rank < n || Math.abs(detRes.det) < 1e-10) {
        const nullity = n - gAug.rank;
        const c1Sing = paramBanner +
          fmt.stepSectionHtml("Bước 1. Lập ma trận ghép khối và khử Gauss - Jordan", [
            "<div class=\"sol-text\">Thiết lập ma trận mở rộng \\([" + nameA + " \\mid I_{" + n + "}]\\):</div>",
            fmt.mathBlockHtml("[" + nameA + " \\mid I_{" + n + "}] = " + augInitLatex),
            fmt.renderGaussChainHtml(augInitLatex, gAug.steps, "Biến đổi sơ cấp trên dòng")
          ]) +
          fmt.stepSectionHtml("Bước 2. Kết luận tính suy biến", [
            "<div class=\"sol-text\">Ở nửa bên trái xuất hiện dòng toàn phần tử \\(0\\), hạng của ma trận \\(\\operatorname{rank}(" + nameA + ") = " + gAug.rank + " < " + n + "\\). Do nửa trái không thể đưa về \\(I_{" + n + "}\\), ma trận \\(" + nameA + "\\) không khả nghịch (không tồn tại \\(" + nameA + "^{-1}\\)).</div>"
          ]);

        const c2Sing = paramBanner +
          fmt.stepSectionHtml("Bước 1. Kiểm tra tiêu chuẩn định thức", [
            "<div class=\"sol-text\">Ma trận vuông \\(" + nameA + " \\in \\mathcal{M}_{" + n + "}(\\mathbb{R})\\) khả nghịch khi và chỉ khi \\(\\det(" + nameA + ") \\neq 0\\). Tính định thức của \\(" + nameA + "\\):</div>",
            fmt.mathBlockHtml("\\det(" + nameA + ") = " + detRes.detLatex)
          ]) +
          fmt.stepSectionHtml("Bước 2. Giải thích qua hạt nhân và số chiều ảnh", [
            "<div class=\"sol-text\">Vì \\(\\det(" + nameA + ") = 0\\), theo định lý Hạng - Số chiều hạt nhân ta có \\(\\dim\\ker(" + nameA + ") = " + n + " - " + gAug.rank + " = " + nullity + " \\ge 1\\). Toán tử tuyến tính không đơn ánh nên không tồn tại ánh xạ ngược \\(" + nameA + "^{-1}\\).</div>"
          ]);

        return {
          isError: false,
          invertible: false,
          invMatrix: null,
          rank: gAug.rank,
          det: 0,
          logTitle: "Ma trận nghịch đảo",
          logLatex: "\\det(" + nameA + ") = 0 \\implies \\nexists\\," + nameA + "^{-1}",
          cardOptions: {
            titleLeft: "Ma trận nghịch đảo",
            badgeRight: "Không khả nghịch",
            badgeTone: "warning",
            primaryRows: [
              {
                labelHtml: "Ma trận suy biến",
                latex: "\\det(" + nameA + ") = 0, \\quad \\operatorname{rank}(" + nameA + ") = " + gAug.rank + " < " + n,
                displayMode: true,
                noteHtml: "Không tồn tại ma trận nghịch đảo \\(" + nameA + "^{-1}\\)."
              }
            ]
          },
          modalConfig: {
            titleText: "Khảo sát tính khả nghịch của ma trận",
            titleMath: nameA + "^{-1}",
            tab1Label: "Cách 1: Khử Gauss - Jordan",
            tab2Label: "Cách 2: Tiêu chuẩn định thức",
            content1: fmt.wrapStepContainer(c1Sing),
            content2: fmt.wrapStepContainer(c2Sing)
          }
        };
      }

      const invMat = gAug.rrefMatrix.map(function (row) {
        return row.slice(n).map(function (val) { return cleanZero(val); });
      });
      const invLatex = fmt.matrixToLatex(invMat, { bracket: "bmatrix", allowSurd: false });

      // Cách 1: Gauss-Jordan [A | I_n] -> [I_n | A^{-1}]
      const c1Inv = paramBanner +
        fmt.stepSectionHtml("Bước 1. Thiết lập ma trận mở rộng ghép khối đơn vị", [
          "<div class=\"sol-text\">Ghép ma trận đơn vị \\(I_{" + n + "}\\) vào bên phải ma trận \\(" + nameA + "\\):</div>",
          fmt.mathBlockHtml("[" + nameA + " \\mid I_{" + n + "}] = " + augInitLatex)
        ]) +
        fmt.stepSectionHtml("Bước 2. Khử toàn phần Gauss - Jordan đưa nửa trái về ma trận đơn vị", [
          fmt.renderGaussChainHtml(augInitLatex, gAug.steps, "Thực hiện phép biến đổi sơ cấp dòng")
        ]) +
        fmt.stepSectionHtml("Bước 3. Trích xuất ma trận nghịch đảo chính xác", [
          "<div class=\"sol-text\">Nửa bên trái đã trở thành \\(I_{" + n + "}\\), khối bên phải chính là \\(" + nameA + "^{-1}\\):</div>",
          fmt.mathBlockHtml(nameA + "^{-1} = " + invLatex)
        ]);

      // Cách 2: Ma trận phụ hợp adj(A) = C^T
      const cofactorMat = [];
      const cofDetailLines = [];
      for (let i = 0; i < n; i++) {
        const cRow = [];
        for (let j = 0; j < n; j++) {
          const sub = submatrixMinor(A, i, j);
          const subDet = exactDetOfSquare(sub);
          const sign = (i + j) % 2 === 0 ? 1 : -1;
          const cij = cleanZero(sign * subDet.det);
          cRow.push(cij);
          if (n <= 3 && n >= 2) {
            const subTex = n === 2
              ? fmt.scalarToLatex(sub[0][0], { allowSurd: false })
              : fmt.matrixToLatex(sub, { bracket: "vmatrix", allowSurd: false });
            cofDetailLines.push(
              "C_{" + (i + 1) + (j + 1) + "} = (-1)^{" + (i + 1) + "+" + (j + 1) + "} " +
              (n === 2 ? "\\cdot " + parenIfNegLatex(subTex, sub[0][0]) : subTex) +
              " = " + fmt.scalarToLatex(cij, { allowSurd: false })
            );
          }
        }
        cofactorMat.push(cRow);
      }

      const adjMat = [];
      for (let j = 0; j < n; j++) {
        const r = [];
        for (let i = 0; i < n; i++) r.push(cofactorMat[i][j]);
        adjMat.push(r);
      }
      const adjLatex = fmt.matrixToLatex(adjMat, { bracket: "bmatrix", allowSurd: false });
      const idLatex = fmt.matrixToLatex(
        Array.from({ length: n }, function (_, i) {
          return Array.from({ length: n }, function (__, j) { return i === j ? 1 : 0; });
        }),
        { bracket: "bmatrix", allowSurd: false }
      );

      const cofDetailsHtml = [];
      if (n === 1) {
        cofDetailsHtml.push("<div class=\"sol-text\">Với \\(n = 1\\), ma trận phụ hợp quy ước là \\(\\operatorname{adj}(" + nameA + ") = [1]\\).</div>");
      } else if (n <= 3) {
        cofDetailsHtml.push("<div class=\"sol-text\">Tính các phần bù đại số \\(C_{ij} = (-1)^{i+j} M_{ij}\\):</div>");
        for (let idx = 0; idx < cofDetailLines.length; idx += n) {
          cofDetailsHtml.push(fmt.mathBlockHtml(cofDetailLines.slice(idx, idx + n).join(", \\qquad ")));
        }
      } else {
        cofDetailsHtml.push("<div class=\"sol-text\">Tính các định thức con cấp \\(" + (n - 1) + "\\) cho từng vị trí \\((i, j)\\) và chuyển vị ma trận phần bù đại số \\(C = (C_{ij})\\).</div>");
      }
      cofDetailsHtml.push(
        "<div class=\"sol-text\">Chuyển vị ma trận phần bù đại số thu được ma trận phụ hợp \\(\\operatorname{adj}(" + nameA + ") = C^T\\):</div>",
        fmt.mathBlockHtml("\\operatorname{adj}(" + nameA + ") = " + adjLatex)
      );

      const invDetFactor = detRes.detLatex === "1"
        ? ""
        : (detRes.detLatex === "-1" ? "-" : "\\frac{1}{" + detRes.detLatex + "} ");

      const c2Inv = paramBanner +
        fmt.stepSectionHtml("Bước 1. Kiểm tra định thức khác không", [
          fmt.mathBlockHtml("\\det(" + nameA + ") = " + detRes.detLatex + " \\neq 0 \\implies \\exists\\," + nameA + "^{-1} = \\frac{1}{\\det(" + nameA + ")}\\,\\operatorname{adj}(" + nameA + ")")
        ]) +
        fmt.stepSectionHtml("Bước 2. Xây dựng ma trận phụ hợp", cofDetailsHtml) +
        fmt.stepSectionHtml("Bước 3. Nhân nghịch đảo định thức và kiểm chứng", [
          fmt.mathBlockHtml(nameA + "^{-1} = " + invDetFactor + adjLatex + " = " + invLatex),
          "<div class=\"sol-text\">Kiểm chứng đẳng thức song phương: \\(" + nameA + " \\cdot " + nameA + "^{-1} = " + idLatex + " = I_{" + n + "}\\).</div>"
        ]);

      const eqLatex = nameA + "^{-1} = " + invLatex;
      return {
        isError: false,
        invertible: true,
        invMatrix: invMat,
        det: detRes.det,
        detLatex: detRes.detLatex,
        logTitle: "Ma trận nghịch đảo",
        logLatex: eqLatex,
        cardOptions: {
          titleLeft: "Ma trận nghịch đảo",
          badgeRightLatex: "\\det(" + nameA + ") = " + detRes.detLatex,
          badgeTone: "success",
          primaryRows: [
            {
              labelHtml: "Ma trận nghịch đảo chính xác",
              latex: eqLatex,
              displayMode: true
            }
          ]
        },
        modalConfig: {
          titleText: "Tìm ma trận nghịch đảo",
          titleMath: nameA + "^{-1}",
          tab1Label: "Cách 1: Khử Gauss - Jordan",
          tab2Label: "Cách 2: Ma trận phụ hợp",
          content1: fmt.wrapStepContainer(c1Inv),
          content2: fmt.wrapStepContainer(c2Inv)
        }
      };
    }

    // 3. MATRIX RANK (rank)
    if (op === "rank") {
      const refRes = fmt.gaussRrefWithSteps(A, { mode: "ref", bracket: "bmatrix" });
      const rrefRes = fmt.gaussRrefWithSteps(A, { mode: "rref", bracket: "bmatrix" });
      const r = refRes.rank;
      const nullity = colsA - r;
      const maxPossible = Math.min(rowsA, colsA);

      const c1Rank = paramBanner +
        fmt.stepSectionHtml("Bước 1. Đưa ma trận về dạng bậc thang theo dòng (REF)", [
          "<div class=\"sol-text\">Xét ma trận \\(" + nameA + " \\in \\mathcal{M}_{" + rowsA + " \\times " + colsA + "}(\\mathbb{R})\\):</div>",
          fmt.mathBlockHtml(nameA + " = " + matALatex),
          fmt.renderGaussChainHtml(matALatex, refRes.steps, "Biến đổi sơ cấp trên dòng")
        ]) +
        fmt.stepSectionHtml("Bước 2. Đếm số dòng khác không trong ma trận bậc thang", [
          "<div class=\"sol-text\">Ma trận bậc thang thu được có đúng \\(" + r + "\\) dòng khác không (trên tối đa \\(\\min(" + rowsA + ", " + colsA + ") = " + maxPossible + "\\)). Vậy:</div>",
          fmt.mathBlockHtml("\\operatorname{rank}(" + nameA + ") = " + r)
        ]);

      const pivotColLabels = rrefRes.pivotCols.map(function (cIdx) { return "j = " + (cIdx + 1); });
      const colBasisTex = rrefRes.pivotCols.map(function (cIdx) {
        const colVec = A.map(function (row) { return [row[cIdx]]; });
        return fmt.matrixToLatex(colVec, { bracket: "bmatrix", allowSurd: false });
      });

      const c2Rank = paramBanner +
        fmt.stepSectionHtml("Bước 1. Đưa về dạng bậc thang rút gọn (RREF)", [
          fmt.renderGaussChainHtml(matALatex, rrefRes.steps, "Khử Gauss - Jordan trên dòng")
        ]) +
        fmt.stepSectionHtml("Bước 2. Xác định các cột chốt và cơ sở không gian cột", [
          r > 0
            ? "<div class=\"sol-text\">Các cột chứa phần tử dẫn đầu bằng \\(1\\) là: \\(" + pivotColLabels.join(",\\; ") + "\\). Các cột tương ứng của ma trận gốc \\(" + nameA + "\\) tạo thành một cơ sở của không gian cột \\(\\operatorname{Col}(" + nameA + ")\\):</div>" +
              fmt.mathBlockHtml("\\mathcal{B}_{\\operatorname{Col}(" + nameA + ")} = \\left\\{ " + colBasisTex.join(",\\; ") + " \\right\\}")
            : "<div class=\"sol-text\">Ma trận toàn phần tử \\(0\\), không có cột chốt nào nên \\(\\operatorname{Col}(" + nameA + ") = \\{\\mathbf{0}\\}\\).</div>"
        ]) +
        fmt.stepSectionHtml("Bước 3. Liên hệ với định lý Hạng - Số chiều hạt nhân", [
          fmt.mathBlockHtml("\\operatorname{rank}(" + nameA + ") + \\dim\\ker(" + nameA + ") = " + colsA + " \\iff " + r + " + " + nullity + " = " + colsA)
        ]);

      const eqLatex = "\\operatorname{rank}(" + nameA + ") = " + r;
      return {
        isError: false,
        rank: r,
        nullity: nullity,
        logTitle: "Hạng ma trận",
        logLatex: eqLatex,
        cardOptions: {
          titleLeft: "Hạng của ma trận",
          badgeRight: r === maxPossible ? "Hạng tối đại" : "Hạng " + r + "/" + maxPossible,
          badgeTone: r === maxPossible ? "success" : "primary",
          primaryRows: [
            {
              labelHtml: "Hạng và số chiều hạt nhân",
              latex: "\\operatorname{rank}(" + nameA + ") = " + r + ", \\qquad \\dim\\ker(" + nameA + ") = " + nullity,
              displayMode: true
            }
          ],
          secondarySection: {
            titleHtml: "Cột chốt độc lập tuyến tính",
            rows: [
              {
                noteHtml: r > 0
                  ? "Cột chốt tại vị trí: " + rrefRes.pivotCols.map(function (c) { return "Cột " + (c + 1); }).join(", ") + "."
                  : "Ma trận không, không có cột chốt."
              }
            ]
          }
        },
        modalConfig: {
          titleText: "Tìm hạng của ma trận",
          titleMath: "\\operatorname{rank}(" + nameA + ")",
          tab1Label: "Cách 1: Ma trận bậc thang (REF)",
          tab2Label: "Cách 2: Dạng RREF & Không gian cột",
          content1: fmt.wrapStepContainer(c1Rank),
          content2: fmt.wrapStepContainer(c2Rank)
        }
      };
    }

    // 4. TRANSPOSE (single method -> content2 = "")
    if (op === "transpose") {
      const AT = [];
      const rowMapLines = [];
      for (let j = 0; j < colsA; j++) {
        const newRow = [];
        for (let i = 0; i < rowsA; i++) newRow.push(A[i][j]);
        AT.push(newRow);
      }
      for (let i = 0; i < rowsA; i++) {
        const rowTex = A[i].map(function (v) { return fmt.scalarToLatex(v, { allowSurd: false }); }).join(",\\; ");
        rowMapLines.push("\\operatorname{Row}_{" + (i + 1) + "}(" + nameA + ") = \\left(" + rowTex + "\\right) \\longrightarrow \\operatorname{Col}_{" + (i + 1) + "}(" + nameA + "^T)");
      }
      const atLatex = fmt.matrixToLatex(AT, { bracket: "bmatrix", allowSurd: false });

      let symNote = "Phép chuyển vị đổi ma trận cấp \\(" + rowsA + " \\times " + colsA + "\\) thành ma trận cấp \\(" + colsA + " \\times " + rowsA + "\\), đóng vai trò toán tử liên hợp \\(\\langle " + nameA + "\\mathbf{x}, \\mathbf{y} \\rangle = \\langle \\mathbf{x}, " + nameA + "^T\\mathbf{y} \\rangle\\).";
      if (rowsA === colsA) {
        let isSym = true;
        let isSkew = true;
        for (let i = 0; i < rowsA; i++) {
          for (let j = 0; j < colsA; j++) {
            if (Math.abs(A[i][j] - A[j][i]) > 1e-9) isSym = false;
            if (Math.abs(A[i][j] + A[j][i]) > 1e-9) isSkew = false;
          }
        }
        if (isSym) {
          symNote = "Nhận xét đặc biệt: \\(" + nameA + "^T = " + nameA + "\\), vậy \\(" + nameA + "\\) là ma trận đối xứng thực.";
        } else if (isSkew) {
          symNote = "Nhận xét đặc biệt: \\(" + nameA + "^T = -" + nameA + "\\), vậy \\(" + nameA + "\\) là ma trận phản đối xứng.";
        }
      }

      const tHtml = paramBanner +
        fmt.stepSectionHtml("Bước 1. Quy tắc chuyển vị ma trận", [
          "<div class=\"sol-text\">Cho ma trận \\(" + nameA + " \\in \\mathcal{M}_{" + rowsA + " \\times " + colsA + "}(\\mathbb{R})\\). Ma trận chuyển vị \\(" + nameA + "^T \\in \\mathcal{M}_{" + colsA + " \\times " + rowsA + "}(\\mathbb{R})\\) được xác định bởi \\((" + nameA + "^T)_{ji} = a_{ij}\\):</div>",
          fmt.mathBlockHtml(nameA + " = " + matALatex)
        ]) +
        fmt.stepSectionHtml("Bước 2. Hoán đổi từng dòng thành cột tương ứng", [
          fmt.mathBlockHtml(rowMapLines.join(" \\\\[4pt] "))
        ]) +
        fmt.stepSectionHtml("Bước 3. Ma trận chuyển vị thu được", [
          fmt.mathBlockHtml(nameA + "^T = " + atLatex),
          "<div class=\"sol-text\">" + symNote + "</div>"
        ]);

      const eqLatex = nameA + "^T = " + atLatex;
      return {
        isError: false,
        transposeMatrix: AT,
        logTitle: "Ma trận chuyển vị",
        logLatex: eqLatex,
        cardOptions: {
          titleLeft: "Ma trận chuyển vị",
          badgeRightLatex: colsA + " \\times " + rowsA,
          badgeTone: "primary",
          primaryRows: [
            {
              labelHtml: "Kết quả hoán đổi dòng và cột",
              latex: eqLatex,
              displayMode: true
            }
          ],
          secondarySection: {
            titleHtml: "Tính chất đại số",
            rows: [{ noteHtml: symNote }]
          }
        },
        modalConfig: {
          titleText: "Ma trận chuyển vị",
          titleMath: nameA + "^T \\in \\mathcal{M}_{" + colsA + " \\times " + rowsA + "}(\\mathbb{R})",
          content1: fmt.wrapStepContainer(tHtml),
          content2: ""
        }
      };
    }

    // 5. MATRIX MULTIPLICATION (mul_matrix)
    if (op === "mul_matrix") {
      const B = cleanMatrix(p.B);
      const nameB = fmt.normalizeMatSymbol(p.nameB, "B");

      if (B.length === 0 || B[0].length === 0) {
        return buildErrorBundle(
          "Nhân hai ma trận",
          nameA + " \\cdot " + nameB,
          "Thiếu dữ liệu ma trận B",
          "Vui lòng nhập đầy đủ các phần tử của ma trận \\(" + nameB + "\\) để thực hiện phép nhân.",
          fmt.stepSectionHtml("Kiểm tra dữ liệu", [
            "<div class=\"sol-text\">Ma trận thứ hai \\(" + nameB + "\\) chưa được nhập đầy đủ.</div>"
          ])
        );
      }

      const rowsB = B.length;
      const colsB = B[0].length;
      const matBLatex = fmt.matrixToLatex(B, { bracket: "bmatrix", allowSurd: false });

      if (colsA !== rowsB) {
        return buildErrorBundle(
          "Nhân hai ma trận",
          "{" + nameA + "}_{" + rowsA + " \\times " + colsA + "} \\cdot {" + nameB + "}_{" + rowsB + " \\times " + colsB + "}",
          "Lỗi kích thước nhân ma trận",
          "Số cột của ma trận \\(" + nameA + "\\) (\\(" + colsA + "\\)) phải bằng số dòng của ma trận \\(" + nameB + "\\) (\\(" + rowsB + "\\)).",
          fmt.stepSectionHtml("Điều kiện khả tích của hai ma trận", [
            "<div class=\"sol-text\">Ta có \\(" + nameA + " \\in \\mathcal{M}_{" + rowsA + " \\times " + colsA + "}(\\mathbb{R})\\) và \\(" + nameB + " \\in \\mathcal{M}_{" + rowsB + " \\times " + colsB + "}(\\mathbb{R})\\):</div>",
            fmt.mathBlockHtml(nameA + " = " + matALatex + ", \\qquad " + nameB + " = " + matBLatex),
            "<div class=\"sol-text\">Phép hợp thành ánh xạ \\(T_{" + nameA + "} \\circ T_{" + nameB + "}\\) đòi hỏi không gian đích của \\(" + nameB + "\\) (\\(\\mathbb{R}^{" + rowsB + "}\\)) phải trùng với không gian nguồn của \\(" + nameA + "\\) (\\(\\mathbb{R}^{" + colsA + "}\\)). Vì \\(" + colsA + " \\neq " + rowsB + "\\), tích \\(" + nameA + nameB + "\\) không xác định.</div>"
          ])
        );
      }

      const C = [];
      const entryCalcLines = [];
      for (let i = 0; i < rowsA; i++) {
        const cRow = [];
        for (let j = 0; j < colsB; j++) {
          let s = 0;
          const terms = [];
          for (let k = 0; k < colsA; k++) {
            s += A[i][k] * B[k][j];
            const aTex = fmt.scalarToLatex(A[i][k], { allowSurd: false });
            const bTex = fmt.scalarToLatex(B[k][j], { allowSurd: false });
            terms.push(parenIfNegLatex(aTex, A[i][k]) + " \\cdot " + parenIfNegLatex(bTex, B[k][j]));
          }
          s = cleanZero(s);
          cRow.push(s);
          entryCalcLines.push(
            "c_{" + (i + 1) + (j + 1) + "} = " + terms.join(" + ") + " = " + fmt.scalarToLatex(s, { allowSurd: false })
          );
        }
        C.push(cRow);
      }

      const matCLatex = fmt.matrixToLatex(C, { bracket: "bmatrix", allowSurd: false });

      // Cách 1: Quy tắc dòng nhân cột
      const entryMathBlocks = entryCalcLines.map(function (line) { return fmt.mathBlockHtml(line); });
      const c1Mul = paramBanner +
        fmt.stepSectionHtml("Bước 1. Kiểm tra điều kiện khả tích và cấp của ma trận tích", [
          "<div class=\"sol-text\">Số cột của \\(" + nameA + "\\) bằng số dòng của \\(" + nameB + "\\) (cùng bằng \\(" + colsA + "\\)), nên tích \\(C = " + nameA + nameB + " \\in \\mathcal{M}_{" + rowsA + " \\times " + colsB + "}(\\mathbb{R})\\) hoàn toàn xác định với \\(c_{ij} = \\sum_{k=1}^{" + colsA + "} a_{ik}b_{kj}\\):</div>",
          fmt.mathBlockHtml(nameA + " = " + matALatex + ", \\qquad " + nameB + " = " + matBLatex)
        ]) +
        fmt.stepSectionHtml("Bước 2. Tính từng phần tử theo quy tắc dòng nhân cột", entryMathBlocks) +
        fmt.stepSectionHtml("Bước 3. Tổng hợp ma trận tích", [
          fmt.mathBlockHtml(nameA + " \\cdot " + nameB + " = " + matCLatex)
        ]);

      // Cách 2: Tổ hợp tuyến tính các cột (Hợp thành hai ánh xạ tuyến tính)
      const colAChunks = [];
      for (let k = 0; k < colsA; k++) {
        colAChunks.push(fmt.matrixToLatex(A.map(function (r) { return [r[k]]; }), { bracket: "bmatrix", allowSurd: false }));
      }
      const colSteps = [];
      for (let j = 0; j < colsB; j++) {
        const combParts = [];
        for (let k = 0; k < colsA; k++) {
          const bkj = B[k][j];
          const bTex = fmt.scalarToLatex(bkj, { allowSurd: false });
          combParts.push(parenIfNegLatex(bTex, bkj) + " " + colAChunks[k]);
        }
        const resColTex = fmt.matrixToLatex(C.map(function (r) { return [r[j]]; }), { bracket: "bmatrix", allowSurd: false });
        colSteps.push(
          fmt.mathBlockHtml("\\operatorname{Col}_{" + (j + 1) + "}(" + nameA + nameB + ") = " + nameA + " \\cdot \\operatorname{Col}_{" + (j + 1) + "}(" + nameB + ") = " + combParts.join(" + ") + " = " + resColTex)
        );
      }

      const c2Mul = paramBanner +
        fmt.stepSectionHtml("Bước 1. Quan điểm hợp thành ánh xạ tuyến tính theo cột", [
          "<div class=\"sol-text\">Mỗi cột thứ \\(j\\) của ma trận tích \\(" + nameA + nameB + "\\) chính là ảnh của cột thứ \\(j\\) của \\(" + nameB + "\\) qua toán tử \\(" + nameA + "\\), tức là tổ hợp tuyến tính các cột của \\(" + nameA + "\\):</div>",
          fmt.mathBlockHtml("\\operatorname{Col}_j(" + nameA + nameB + ") = \\sum_{k=1}^{" + colsA + "} b_{kj}\\,\\operatorname{Col}_k(" + nameA + ")")
        ]) +
        fmt.stepSectionHtml("Bước 2. Biến đổi từng cột của ma trận thứ hai", colSteps) +
        fmt.stepSectionHtml("Bước 3. Ghép các cột thành ma trận tích hoàn chỉnh", [
          fmt.mathBlockHtml(nameA + " \\cdot " + nameB + " = " + matCLatex),
          "<div class=\"sol-text\">Về mặt hình học, \\(T_{" + nameA + nameB + "}(\\mathbf{x}) = " + nameA + "(" + nameB + "\\mathbf{x})\\) thực hiện biến đổi \\(" + nameB + "\\) trước rồi áp dụng biến đổi \\(" + nameA + "\\) tiếp theo.</div>"
        ]);

      const eqLatex = nameA + " \\cdot " + nameB + " = " + matCLatex;
      return {
        isError: false,
        productMatrix: C,
        logTitle: "Tích hai ma trận",
        logLatex: eqLatex,
        cardOptions: {
          titleLeft: "Tích hai ma trận",
          badgeRightLatex: rowsA + " \\times " + colsB,
          badgeTone: "primary",
          primaryRows: [
            {
              labelHtml: "Ma trận hợp thành \\(" + nameA + " \\cdot " + nameB + "\\)",
              latex: eqLatex,
              displayMode: true
            }
          ]
        },
        modalConfig: {
          titleText: "Phép nhân hai ma trận",
          titleMath: nameA + " \\cdot " + nameB,
          tab1Label: "Cách 1: Quy tắc dòng nhân cột",
          tab2Label: "Cách 2: Tổ hợp tuyến tính các cột",
          content1: fmt.wrapStepContainer(c1Mul),
          content2: fmt.wrapStepContainer(c2Mul)
        }
      };
    }

    return buildErrorBundle(
      "Phép toán ma trận",
      nameA,
      "Phép toán không xác định",
      "Không nhận diện được mã phép toán ma trận.",
      fmt.stepSectionHtml("Thông báo", ["<div class=\"sol-text\">Mã phép toán không hợp lệ.</div>"])
    );
  }

  // ===========================================================================
  // III. MIXED MATRIX-VECTOR TRANSFORMATION (single, all, mesh, nori)
  // ===========================================================================

  function buildMixedOp(params) {
    const fmt = getFmt();
    const p = params || {};
    const mode = p.mode || "single";
    const A = cleanMatrix(p.A);
    const symA = fmt.normalizeMatSymbol(p.matrixName, "A");

    if (A.length === 0 || A[0].length === 0) {
      return buildErrorBundle(
        "Biến đổi tuyến tính",
        symA + " \\cdot \\mathbf{v}",
        "Chưa chọn ma trận biến đổi",
        "Vui lòng tạo và chọn một ma trận hợp lệ ở mục Khởi tạo trước khi thực hiện phép biến đổi.",
        fmt.stepSectionHtml("Kiểm tra ma trận đầu vào", [
          "<div class=\"sol-text\">Chưa có ma trận biến đổi hợp lệ được chọn.</div>"
        ])
      );
    }

    const rowsA = A.length;
    const colsA = A[0].length;
    const matALatex = fmt.matrixToLatex(A, { bracket: "bmatrix", allowSurd: false });
    const isSquare = rowsA === colsA;
    const detInfo = isSquare ? exactDetOfSquare(A) : null;

    const basisColsTex = [];
    for (let j = 0; j < colsA; j++) {
      basisColsTex.push(fmt.matrixToLatex(A.map(function (r) { return [r[j]]; }), { bracket: "bmatrix", allowSurd: false }));
    }

    function orientationSentence() {
      if (!isSquare || !detInfo) {
        return "Ánh xạ tuyến tính chuyển vector từ không gian nguồn \\(\\mathbb{R}^{" + colsA + "}\\) sang không gian đích \\(\\mathbb{R}^{" + rowsA + "}\\).";
      }
      if (Math.abs(detInfo.det) < 1e-10) {
        return "Định thức \\(\\det(" + symA + ") = 0\\): toán tử suy biến làm giảm số chiều của hình ảnh xuống không gian con có số chiều nhỏ hơn \\(" + rowsA + "\\).";
      }
      const absTex = detInfo.detLatex.startsWith("-") ? detInfo.detLatex.slice(1) : detInfo.detLatex;
      if (detInfo.det < 0) {
        return "Định thức \\(\\det(" + symA + ") = " + detInfo.detLatex + " < 0\\): ánh xạ đảo ngược định hướng không gian và co dãn diện tích/thể tích theo tỉ lệ \\(|\\det(" + symA + ")| = " + absTex + "\\).";
      }
      return "Định thức \\(\\det(" + symA + ") = " + detInfo.detLatex + " > 0\\): ánh xạ bảo toàn định hướng không gian và co dãn diện tích/thể tích theo tỉ lệ \\(|\\det(" + symA + ")| = " + absTex + "\\).";
    }

    // MODE 1: MESH OR NORI ENTITY
    if (mode === "mesh" || mode === "nori") {
      const isNori = mode === "nori";
      if (isNori && (rowsA !== 2 || colsA !== 2)) {
        return buildErrorBundle(
          "Biến đổi tuyến tính thực thể Nori",
          "T: \\mathbb{R}^2 \\to \\mathbb{R}^2",
          "Yêu cầu ma trận vuông cấp 2",
          "Thực thể Nori nằm trên mặt phẳng 2D nên chỉ nhận ma trận biến đổi cấp \\(2 \\times 2\\) (hiện tại: \\(" + rowsA + " \\times " + colsA + "\\)).",
          fmt.stepSectionHtml("Kiểm tra kích thước ma trận", [
            "<div class=\"sol-text\">Mỗi điểm trên mô hình phẳng Nori có tọa độ \\((x, y)^T \\in \\mathbb{R}^2\\). Để ánh xạ \\(T(\\mathbf{x}) = " + symA + "\\mathbf{x}\\) tác động trong mặt phẳng, ma trận \\(" + symA + "\\) phải có cấp \\(2 \\times 2\\).</div>"
          ])
        );
      }
      if (!isNori && (rowsA < 2 || rowsA > 3 || colsA < 2 || colsA > 3)) {
        return buildErrorBundle(
          "Biến đổi tuyến tính tranh vector",
          "T(\\mathbf{p}) = " + symA + "\\mathbf{p}",
          "Lỗi kích thước ma trận biến đổi",
          "Tranh vector chỉ hỗ trợ ma trận biến đổi cấp \\(2 \\times 2\\) hoặc \\(3 \\times 3\\) (hiện tại: \\(" + rowsA + " \\times " + colsA + "\\)).",
          fmt.stepSectionHtml("Kiểm tra kích thước ma trận", [
            "<div class=\"sol-text\">Mô hình lưới đỉnh yêu cầu ma trận biến đổi cấp \\(2 \\times 2\\) hoặc \\(3 \\times 3\\).</div>"
          ])
        );
      }

      const numPts = Number(p.numPoints) || 0;
      const entityLabel = isNori ? "mô hình phẳng Nori" : ("lưới " + numPts.toLocaleString("en-US") + " đỉnh của tranh vector");
      const resetBtnHtml = isNori
        ? "<button type=\"button\" id=\"btnResetNoriTransform\" class=\"btn btn-secondary\" style=\"width:100%; padding:7px 10px; font-size:12px; font-weight:600; border-radius:2px;\"><i class=\"ph ph-arrow-counter-clockwise\"></i> Khôi phục hình dạng Nori</button>"
        : "<button type=\"button\" id=\"btnResetMeshTransform\" class=\"btn btn-secondary\" style=\"width:100%; padding:7px 10px; font-size:12px; font-weight:600; border-radius:2px;\"><i class=\"ph ph-arrow-counter-clockwise\"></i> Khôi phục hình dạng gốc</button>";

      const c1Entity =
        fmt.stepSectionHtml("Bước 1. Phương trình toán tử tuyến tính trên từng điểm tọa độ", [
          "<div class=\"sol-text\">Mỗi điểm \\(\\mathbf{p}\\) thuộc " + entityLabel + " được ánh xạ đồng bộ qua ma trận \\(" + symA + "\\):</div>",
          fmt.mathBlockHtml("T(\\mathbf{p}) = " + symA + " \\cdot \\mathbf{p}, \\qquad " + symA + " = " + matALatex)
        ]) +
        fmt.stepSectionHtml("Bước 2. Ảnh của hệ trục cơ sở chuẩn tắc", [
          "<div class=\"sol-text\">Các cột của ma trận \\(" + symA + "\\) xác định vị trí mới của các vector cơ sở chuẩn tắc sau biến đổi:</div>",
          fmt.mathBlockHtml(basisColsTex.map(function (colTex, idx) {
            return "T(\\mathbf{e}_{" + (idx + 1) + "}) = " + colTex;
          }).join(", \\qquad "))
        ]);

      const c2Entity =
        fmt.stepSectionHtml("Bước 1. Bất biến định thức và tỉ lệ biến thiên độ đo", [
          detInfo
            ? fmt.mathBlockHtml("\\det(" + symA + ") = " + detInfo.detLatex)
            : "<div class=\"sol-text\">Ma trận chữ nhật ánh xạ giữa hai không gian khác số chiều.</div>",
          "<div class=\"sol-text\">" + orientationSentence() + "</div>"
        ]);

      return {
        isError: false,
        logTitle: isNori ? "Biến đổi thực thể Nori" : "Biến đổi tranh vector",
        logLatex: "T(\\mathbf{p}) = " + symA + "\\mathbf{p}" + (detInfo ? ",\\; \\det(" + symA + ") = " + detInfo.detLatex : ""),
        cardOptions: {
          titleLeft: isNori ? "Biến đổi thực thể Nori" : "Biến đổi tranh vector",
          badgeRightLatex: detInfo ? "\\det(" + symA + ") = " + detInfo.detLatex : (rowsA + " \\times " + colsA),
          badgeTone: (detInfo && Math.abs(detInfo.det) < 1e-10) ? "warning" : "primary",
          primaryRows: [
            {
              labelHtml: "Toán tử tác động lên " + entityLabel,
              latex: "T(\\mathbf{p}) = " + matALatex + "\\,\\mathbf{p}",
              displayMode: true
            }
          ],
          secondarySection: {
            titleHtml: "Bản chất hình học",
            rows: [{ noteHtml: orientationSentence() }]
          },
          footerHintHtml: resetBtnHtml
        },
        modalConfig: {
          titleText: isNori ? "Biến đổi tuyến tính thực thể Nori" : "Biến đổi tuyến tính tranh vector",
          titleMath: "T(\\mathbf{p}) = " + symA + "\\mathbf{p}",
          tab1Label: "Cách 1: Tác động lên hệ cơ sở",
          tab2Label: "Cách 2: Định thức & Định hướng",
          content1: fmt.wrapStepContainer(c1Entity),
          content2: fmt.wrapStepContainer(c2Entity)
        }
      };
    }

    // MODE 2: SINGLE OR MULTIPLE VECTORS
    const targets = Array.isArray(p.targetVectors) ? p.targetVectors : [];
    if (targets.length === 0) {
      return buildErrorBundle(
        "Nhân ma trận với vector",
        symA + " \\cdot \\mathbf{v}",
        "Chưa chọn vector phù hợp",
        "Không tìm thấy vector đầu vào hợp lệ để nhân với ma trận \\(" + symA + "\\).",
        fmt.stepSectionHtml("Kiểm tra vector đầu vào", [
          "<div class=\"sol-text\">Vui lòng khởi tạo ít nhất một vector có số chiều phù hợp với số cột của ma trận \\(" + symA + "\\).</div>"
        ])
      );
    }

    // Validate dimension on single vector
    if (targets.length === 1 && Array.isArray(targets[0].rawVec) && targets[0].rawVec.length !== colsA) {
      const badLen = targets[0].rawVec.length;
      const vSymBad = fmt.normalizeVecSymbol(targets[0].name, 1);
      return buildErrorBundle(
        "Nhân ma trận với vector",
        "{" + symA + "}_{" + rowsA + " \\times " + colsA + "} \\cdot " + vSymBad,
        "Lỗi kích thước nhân ma trận - vector",
        "Ma trận \\(" + symA + "\\) có \\(" + colsA + "\\) cột nhưng vector \\(" + vSymBad + "\\) có \\(" + badLen + "\\) phần tử.",
        fmt.stepSectionHtml("Điều kiện khả tích ma trận và vector cột", [
          "<div class=\"sol-text\">Để tích \\(" + symA + "\\mathbf{v}\\) xác định, số cột của ma trận \\(" + symA + "\\) (\\(" + colsA + "\\)) phải bằng số chiều của vector \\(" + vSymBad + "\\) (\\(" + badLen + "\\)). Vì \\(" + colsA + " \\neq " + badLen + "\\), phép nhân không thể thực hiện.</div>"
        ])
      );
    }

    const computedList = targets.map(function (tv, idx) {
      const vNum = toNumVec(tv.vec).slice(0, colsA);
      while (vNum.length < colsA) vNum.push(0);
      const vSym = fmt.normalizeVecSymbol(tv.name, idx + 1);
      const vPrime = [];
      const rowDotSteps = [];
      for (let i = 0; i < rowsA; i++) {
        let s = 0;
        const terms = [];
        for (let j = 0; j < colsA; j++) {
          s += A[i][j] * vNum[j];
          const aTex = fmt.scalarToLatex(A[i][j], { allowSurd: false });
          const vTex = fmt.scalarToLatex(vNum[j], { allowSurd: true });
          terms.push(parenIfNegLatex(aTex, A[i][j]) + " \\cdot " + parenIfNegLatex(vTex, vNum[j]));
        }
        s = cleanZero(s);
        vPrime.push(s);
        rowDotSteps.push("y_{" + (i + 1) + "} = " + terms.join(" + ") + " = " + fmt.scalarToLatex(s, { allowSurd: true }));
      }
      const vTexArr = vNum.map(function (x) { return fmt.scalarToLatex(x, { allowSurd: true }); });
      const vPrimeTexArr = vPrime.map(function (x) { return fmt.scalarToLatex(x, { allowSurd: true }); });
      return {
        sym: vSym,
        vec: vNum,
        vTexArr: vTexArr,
        vPrime: vPrime,
        vPrimeTexArr: vPrimeTexArr,
        vTuple: tupleFromLatexList(vTexArr),
        vPrimeTuple: tupleFromLatexList(vPrimeTexArr),
        rowDotSteps: rowDotSteps
      };
    });

    if (computedList.length === 1) {
      const item = computedList[0];
      const vCol = colVecFromLatexList(item.vTexArr);
      const resCol = colVecFromLatexList(item.vPrimeTexArr);

      const combTerms = [];
      for (let j = 0; j < colsA; j++) {
        combTerms.push(parenIfNegLatex(item.vTexArr[j], item.vec[j]) + " " + basisColsTex[j]);
      }

      const c1Single =
        fmt.stepSectionHtml("Bước 1. Thiết lập phép nhân ma trận với vector cột", [
          "<div class=\"sol-text\">Xét toán tử tuyến tính \\(T: \\mathbb{R}^{" + colsA + "} \\to \\mathbb{R}^{" + rowsA + "}\\) xác định bởi ma trận \\(" + symA + "\\) tác động lên vector \\(" + item.sym + " = " + item.vTuple + "\\):</div>",
          fmt.mathBlockHtml(symA + " \\cdot " + item.sym + " = " + matALatex + " " + vCol)
        ]) +
        fmt.stepSectionHtml("Bước 2. Tính tích vô hướng từng dòng của ma trận với vector cột", item.rowDotSteps.map(function (s) {
          return fmt.mathBlockHtml(s);
        })) +
        fmt.stepSectionHtml("Bước 3. Kết luận vector ảnh", [
          fmt.mathBlockHtml(item.sym + "' = " + symA + " \\cdot " + item.sym + " = " + resCol + " \\equiv " + item.vPrimeTuple)
        ]);

      const c2Single =
        fmt.stepSectionHtml("Bước 1. Phân tích qua ảnh của hệ trục cơ sở chuẩn tắc", [
          "<div class=\"sol-text\">Các cột của ma trận \\(" + symA + "\\) là ảnh của các vector cơ sở chuẩn tắc \\(\\mathbf{e}_1, \\dots, \\mathbf{e}_{" + colsA + "}\\). Do tính tuyến tính, ảnh \\(" + symA + "\\cdot " + item.sym + "\\) là tổ hợp tuyến tính của các cột của \\(" + symA + "\\) với trọng số là tọa độ ban đầu của \\(" + item.sym + "\\):</div>",
          fmt.mathBlockHtml(symA + " \\cdot " + item.sym + " = \\sum_{j=1}^{" + colsA + "} v_j\\,\\operatorname{Col}_j(" + symA + ")")
        ]) +
        fmt.stepSectionHtml("Bước 2. Khai triển tổ hợp tuyến tính các cột", [
          fmt.mathBlockHtml(symA + " \\cdot " + item.sym + " = " + combTerms.join(" + ") + " = " + resCol)
        ]) +
        fmt.stepSectionHtml("Bước 3. Ý nghĩa hình học của phép biến đổi", [
          "<div class=\"sol-text\">" + orientationSentence() + "</div>"
        ]);

      const eqLatex = symA + " \\cdot " + item.sym + " = " + item.vPrimeTuple;
      return {
        isError: false,
        vPrime: item.vPrime,
        logTitle: "Biến đổi tuyến tính vector",
        logLatex: eqLatex,
        cardOptions: {
          titleLeft: "Ảnh qua biến đổi tuyến tính",
          badgeRightLatex: "\\mathbb{R}^{" + colsA + "} \\to \\mathbb{R}^{" + rowsA + "}",
          badgeTone: "primary",
          primaryRows: [
            {
              labelHtml: "Vector kết quả",
              latex: eqLatex,
              displayMode: true
            }
          ],
          secondarySection: {
            titleHtml: "Đặc trưng không gian",
            rows: [{ noteHtml: orientationSentence() }]
          },
          footerHintHtml: p.extraFooterHtml || ""
        },
        modalConfig: {
          titleText: "Nhân ma trận với vector",
          titleMath: symA + " \\cdot " + item.sym,
          tab1Label: "Cách 1: Quy tắc dòng nhân cột",
          tab2Label: "Cách 2: Tổ hợp tuyến tính cột cơ sở",
          content1: fmt.wrapStepContainer(c1Single),
          content2: fmt.wrapStepContainer(c2Single)
        }
      };
    }

    // Multiple vectors ("all")
    const summaryRows = computedList.slice(0, 6).map(function (it) {
      return {
        latex: it.sym + "' = " + symA + " \\cdot " + it.sym + " = " + it.vPrimeTuple,
        displayMode: false
      };
    });
    if (computedList.length > 6) {
      summaryRows.push({
        noteHtml: "Và " + (computedList.length - 6) + " vector khác (xem đầy đủ trong Lời giải)."
      });
    }

    const perVecBlocksC1 = computedList.map(function (it) {
      return fmt.mathBlockHtml(
        it.sym + "' = " + matALatex + " " + colVecFromLatexList(it.vTexArr) + " = " + colVecFromLatexList(it.vPrimeTexArr) + " \\equiv " + it.vPrimeTuple
      );
    });

    const perVecBlocksC2 = computedList.map(function (it) {
      const comb = basisColsTex.map(function (cTex, j) {
        return parenIfNegLatex(it.vTexArr[j], it.vec[j]) + " " + cTex;
      }).join(" + ");
      return fmt.mathBlockHtml(it.sym + "' = " + comb + " = " + colVecFromLatexList(it.vPrimeTexArr));
    });

    const c1All =
      fmt.stepSectionHtml("Bước 1. Tác động đồng thời của ma trận lên hệ vector", [
        "<div class=\"sol-text\">Áp dụng toán tử tuyến tính \\(T(\\mathbf{v}) = " + symA + "\\mathbf{v}\\) lên toàn bộ \\(" + computedList.length + "\\) vector đã chọn:</div>"
      ]) +
      fmt.stepSectionHtml("Bước 2. Kết quả nhân ma trận với từng vector", perVecBlocksC1);

    const c2All =
      fmt.stepSectionHtml("Bước 1. Biểu diễn theo hệ trục cơ sở mới", [
        "<div class=\"sol-text\">Mỗi vector sau biến đổi giữ nguyên bộ trọng số tọa độ nhưng căng trên hệ cột cơ sở mới của \\(" + symA + "\\):</div>"
      ]) +
      fmt.stepSectionHtml("Bước 2. Tổ hợp tuyến tính cho từng vector", perVecBlocksC2) +
      fmt.stepSectionHtml("Bước 3. Nhận xét bất biến không gian", [
        "<div class=\"sol-text\">" + orientationSentence() + "</div>"
      ]);

    const logLatexAll = computedList.map(function (it) { return it.sym + "' = " + it.vPrimeTuple; }).join(",\\; ");
    return {
      isError: false,
      logTitle: "Biến đổi đồng bộ hệ vector",
      logLatex: logLatexAll,
      cardOptions: {
        titleLeft: "Biến đổi đồng bộ (" + computedList.length + " vector)",
        badgeRightLatex: "\\mathbb{R}^{" + colsA + "} \\to \\mathbb{R}^{" + rowsA + "}",
        badgeTone: "primary",
        primaryRows: summaryRows,
        secondarySection: {
          titleHtml: "Đặc trưng không gian",
          rows: [{ noteHtml: orientationSentence() }]
        }
      },
      modalConfig: {
        titleText: "Biến đổi tuyến tính hệ vector",
        titleMath: "T(\\mathbf{v}) = " + symA + "\\mathbf{v}",
        tab1Label: "Cách 1: Nhân ma trận từng vector",
        tab2Label: "Cách 2: Tổ hợp cột cơ sở & Định thức",
        content1: fmt.wrapStepContainer(c1All),
        content2: fmt.wrapStepContainer(c2All)
      }
    };
  }

  return {
    parseScalarExpr: parseScalarExpr,
    exactNormInfo: exactNormInfo,
    exactDivByNormLatex: exactDivByNormLatex,
    buildVectorOp: buildVectorOp,
    buildMatrixOp: buildMatrixOp,
    buildMixedOp: buildMixedOp
  };
});
