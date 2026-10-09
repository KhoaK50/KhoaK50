(function () {
  window.App = window.App || {};
  const App = window.App;

  // Hàm tiền xử lý làm sạch token MathLive và tự động chuẩn hóa dấu ngoặc
  App.cleanVectorInput = function (rawStr) {
    if (!rawStr) return "";
    let s = String(rawStr).trim();

    // 1. Loại bỏ các token rỗng MathLive sinh ra khi xóa bằng Backspace
    s = s.replace(/\\placeholder(\[[^\]]*\])?(\{[^}]*\})?/gi, "");
    s = s.replace(/\\square/gi, "");
    s = s.replace(/\\empty/gi, "");
    s = s.replace(/\\phantom\{[^}]*\}/gi, "");
    s = s.replace(/\\left\./gi, "").replace(/\\right\./gi, "");
    s = s.replace(/\{\s*\}/g, "");

    s = s.trim();
    if (!s) return "";

    // 2. Chuẩn hóa ngoặc ngoài
    if (s.startsWith("[") && !s.endsWith("]")) {
      if (s.endsWith(")")) s = s.slice(0, -1) + "]";
      else s = s + "]";
    } else if (s.startsWith("(") && !s.endsWith(")")) {
      if (s.endsWith("]")) s = s.slice(0, -1) + ")";
      else s = s + ")";
    }

    if (s.startsWith("(") && s.endsWith(")")) {
      s = "[" + s.slice(1, -1) + "]";
    }

    if (!s.startsWith("[") || !s.endsWith("]")) {
      s = "[" + s + "]";
    }

    return s;
  };

  // Tách tọa độ vector ở cấp cao nhất (bảo toàn cấu trúc ngoặc lồng nhau)
  App.splitVectorCoordinates = function (str) {
    if (!str) return [];
    let s = String(str).trim();
    function findMatching(text, openIdx) {
      let depth = 0;
      const openChar = text[openIdx];
      const closeChar = openChar === '(' ? ')' : (openChar === '[' ? ']' : '}');
      for (let i = openIdx; i < text.length; i++) {
        if (text[i] === openChar) depth++;
        else if (text[i] === closeChar) {
          depth--;
          if (depth === 0) return i;
        }
      }
      return -1;
    }

    if (s.startsWith("[") || s.startsWith("(")) {
      if (findMatching(s, 0) === s.length - 1) {
        s = s.slice(1, -1).trim();
      }
    }
    const hasCommaOrSemi = s.includes(",") || s.includes(";");
    const parts = [];
    let depth = 0;
    let current = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;

      let isSeparator = false;
      if (hasCommaOrSemi) {
        isSeparator = (ch === ',' || ch === ';') && depth === 0;
      } else if (/\s/.test(ch) && depth === 0) {
        const trimmedPrev = current.trim();
        const prevEndsWithOp = /[+\-*/^%&=<>|,]$/.test(trimmedPrev);

        let nextIdx = i + 1;
        while (nextIdx < s.length && /\s/.test(s[nextIdx])) nextIdx++;
        const nextChar = nextIdx < s.length ? s[nextIdx] : '';

        const nextIsBinaryOp = /[+*/^%&=<>]/.test(nextChar);
        let nextIsSubOp = false;
        if (nextChar === '-') {
          let afterMinusIdx = nextIdx + 1;
          while (afterMinusIdx < s.length && /\s/.test(s[afterMinusIdx])) afterMinusIdx++;
          if (afterMinusIdx > nextIdx + 1) {
            nextIsSubOp = true;
          }
        }

        if (!prevEndsWithOp && !nextIsBinaryOp && !nextIsSubOp && trimmedPrev.length > 0) {
          isSeparator = true;
        }
      }

      if (isSeparator) {
        if (current.trim()) parts.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    if (current.trim()) parts.push(current.trim());
    if (parts.some((p) => /^[+\-*/^%&=<>|]$/.test(p.trim()))) {
      return [s];
    }
    return parts;
  };

  // Chuyển biểu thức toán thô thành mã LaTeX KaTeX (Hỗ trợ cấu trúc lồng nhau qua dấu ngoặc)
  App.exprToLatex = function (expr) {
    if (!expr) return "";
    let s = String(expr).trim();

    // Tìm vị trí đóng ngoặc tương ứng cho dấu mở ngoặc tại openIdx
    function findMatchingParen(str, openIdx) {
      let depth = 0;
      for (let i = openIdx; i < str.length; i++) {
        if (str[i] === '(') depth++;
        else if (str[i] === ')') {
          depth--;
          if (depth === 0) return i;
        }
      }
      return -1;
    }

    // 0. Xử lý hàm căn thức tổng quát: root(n, x) hoặc nthroot(n, x)
    for (const rFn of ['root', 'nthroot']) {
      const pattern = rFn + '(';
      let searchFrom = 0;
      while (true) {
        const idx = s.indexOf(pattern, searchFrom);
        if (idx === -1) break;
        if (idx > 0 && (s[idx - 1] === '\\' || /[a-zA-Z]/.test(s[idx - 1]))) {
          searchFrom = idx + 1;
          continue;
        }
        const openIdx = idx + rFn.length;
        const closeIdx = findMatchingParen(s, openIdx);
        if (closeIdx === -1) {
          searchFrom = openIdx + 1;
          continue;
        }
        const inner = s.substring(openIdx + 1, closeIdx);
        let commaIdx = -1;
        let d = 0;
        for (let j = 0; j < inner.length; j++) {
          if (inner[j] === '(' || inner[j] === '[' || inner[j] === '{') d++;
          else if (inner[j] === ')' || inner[j] === ']' || inner[j] === '}') d--;
          else if (inner[j] === ',' && d === 0) { commaIdx = j; break; }
        }
        let replacement = '';
        if (commaIdx !== -1) {
          const deg = inner.substring(0, commaIdx).trim();
          const rad = inner.substring(commaIdx + 1).trim();
          replacement = `\\sqrt[${App.exprToLatex(deg)}]{${App.exprToLatex(rad)}}`;
        } else {
          replacement = `\\sqrt{${App.exprToLatex(inner)}}`;
        }
        s = s.substring(0, idx) + replacement + s.substring(closeIdx + 1);
        searchFrom = idx + replacement.length;
      }
    }

    // 0.1 Xử lý logarit có cơ số: log_a(x), log_{a}(x), log10(x), log2(x)
    let logSearchFrom = 0;
    while (true) {
      const remaining = s.substring(logSearchFrom);
      const m = remaining.match(/(?:(?<!\\)log_\{?([a-zA-Z0-9_\.]+)\}?|(?<!\\)log(10|2))\(/);
      if (!m) break;
      const idx = logSearchFrom + m.index;
      const base = m[1] || m[2];
      const openIdx = idx + m[0].length - 1;
      const closeIdx = findMatchingParen(s, openIdx);
      if (closeIdx === -1) {
        logSearchFrom = idx + m[0].length;
        continue;
      }
      const inner = s.substring(openIdx + 1, closeIdx);
      const replacement = `\\log_{${base}}(${App.exprToLatex(inner)})`;
      s = s.substring(0, idx) + replacement + s.substring(closeIdx + 1);
      logSearchFrom = idx + replacement.length;
    }

    // 1. Xử lý các hàm toán học: sqrt, cbrt, sin, cos, tan, cot, sinh, cosh, tanh, ln, log, exp, abs, arccos, arcsin, arctan
    const funcs = [
      'sqrt', 'cbrt', 'sinh', 'cosh', 'tanh', 'sin', 'cos', 'tan', 'cot',
      'arccos', 'arcsin', 'arctan', 'arccot', 'acos', 'asin', 'atan', 'acot',
      'ln', 'log', 'exp', 'abs'
    ];
    for (const fn of funcs) {
      const pattern = fn + '(';
      let searchFrom = 0;
      while (true) {
        const idx = s.indexOf(pattern, searchFrom);
        if (idx === -1) break;
        // Đảm bảo không trùng với hàm khác hoặc đã có ký tự escape
        if (idx > 0 && (s[idx - 1] === '\\' || /[a-zA-Z]/.test(s[idx - 1]))) {
          searchFrom = idx + 1;
          continue;
        }

        const openIdx = idx + fn.length;
        const closeIdx = findMatchingParen(s, openIdx);
        if (closeIdx === -1) {
          searchFrom = openIdx + 1;
          continue;
        }

        const inner = s.substring(openIdx + 1, closeIdx);
        let replacement = '';
        if (fn === 'sqrt') {
          replacement = `\\sqrt{${App.exprToLatex(inner)}}`;
        } else if (fn === 'cbrt') {
          replacement = `\\sqrt[3]{${App.exprToLatex(inner)}}`;
        } else if (fn === 'abs') {
          replacement = `|${App.exprToLatex(inner)}|`;
        } else if (fn === 'ln') {
          replacement = `\\ln(${App.exprToLatex(inner)})`;
        } else if (fn === 'log') {
          // Kiểm tra log(a, x) có 2 tham số
          let commaIdx = -1;
          let d = 0;
          for (let j = 0; j < inner.length; j++) {
            if (inner[j] === '(' || inner[j] === '[' || inner[j] === '{') d++;
            else if (inner[j] === ')' || inner[j] === ']' || inner[j] === '}') d--;
            else if (inner[j] === ',' && d === 0) { commaIdx = j; break; }
          }
          if (commaIdx !== -1) {
            const base = inner.substring(0, commaIdx).trim();
            const val = inner.substring(commaIdx + 1).trim();
            replacement = `\\log_{${App.exprToLatex(base)}}(${App.exprToLatex(val)})`;
          } else {
            replacement = `\\log(${App.exprToLatex(inner)})`;
          }
        } else if (fn === 'exp') {
          replacement = `e^{${App.exprToLatex(inner)}}`;
        } else if (fn === 'arccos' || fn === 'acos') {
          replacement = `\\arccos(${App.exprToLatex(inner)})`;
        } else if (fn === 'arcsin' || fn === 'asin') {
          replacement = `\\arcsin(${App.exprToLatex(inner)})`;
        } else if (fn === 'arctan' || fn === 'atan') {
          replacement = `\\arctan(${App.exprToLatex(inner)})`;
        } else if (fn === 'arccot' || fn === 'acot') {
          replacement = `\\operatorname{arccot}(${App.exprToLatex(inner)})`;
        } else {
          replacement = `\\${fn}(${App.exprToLatex(inner)})`;
        }

        s = s.substring(0, idx) + replacement + s.substring(closeIdx + 1);
        searchFrom = idx + replacement.length;
      }
    }

    // 2. Xử lý lũy thừa: base^(exp) hoặc base^exp hoặc base**exp (Quét từ phải sang trái để hỗ trợ mọi cấp độ lồng nhau)
    s = s.replace(/\*\*/g, "^");
    while (true) {
      // Tìm dấu ^ chưa được bọc trong ^{...} từ phải sang trái
      let caretIdx = -1;
      for (let i = s.length - 1; i >= 0; i--) {
        if (s[i] === '^' && s[i + 1] !== '{') {
          caretIdx = i;
          break;
        }
      }
      if (caretIdx === -1) break;

      // Xác định cơ số: có thể là (...) hoặc một từ/số liền trước
      let base = '';
      let baseStart = caretIdx;
      if (caretIdx > 0 && s[caretIdx - 1] === ')') {
        let depth = 0;
        let openIdx = -1;
        for (let i = caretIdx - 1; i >= 0; i--) {
          if (s[i] === ')') depth++;
          else if (s[i] === '(') {
            depth--;
            if (depth === 0) {
              openIdx = i;
              break;
            }
          }
        }
        if (openIdx !== -1) {
          baseStart = openIdx;
          const baseInner = s.substring(openIdx + 1, caretIdx - 1);
          base = `(${App.exprToLatex(baseInner)})`;
        } else {
          baseStart = caretIdx - 1;
          base = s[baseStart];
        }
      } else {
        const m = s.substring(0, caretIdx).match(/([a-zA-Z0-9_\.]+|\\pi|\\cdot)+$/);
        if (m) {
          baseStart = caretIdx - m[0].length;
          base = m[0];
        } else if (caretIdx > 0) {
          baseStart = caretIdx - 1;
          base = s[baseStart];
        }
      }

      // Xác định số mũ: có thể là (...) hoặc một từ/số (có thể kèm theo ^{...} liền sau do quét từ phải sang)
      let exp = '';
      let expEnd = caretIdx + 1;
      if (s[caretIdx + 1] === '(') {
        const closeIdx = findMatchingParen(s, caretIdx + 1);
        if (closeIdx !== -1) {
          expEnd = closeIdx + 1;
          const expInner = s.substring(caretIdx + 2, closeIdx);
          exp = App.exprToLatex(expInner);
        } else {
          exp = s.substring(caretIdx + 1);
          expEnd = s.length;
        }
      } else {
        let cur = caretIdx + 1;
        const m = s.substring(cur).match(/^([a-zA-Z0-9_\.]+|-[a-zA-Z0-9_\.]+)/);
        if (m) {
          cur += m[0].length;
          while (cur < s.length && s[cur] === '^' && s[cur + 1] === '{') {
            let bDepth = 0;
            let bEnd = -1;
            for (let j = cur + 1; j < s.length; j++) {
              if (s[j] === '{') bDepth++;
              else if (s[j] === '}') {
                bDepth--;
                if (bDepth === 0) {
                  bEnd = j;
                  break;
                }
              }
            }
            if (bEnd !== -1) {
              cur = bEnd + 1;
            } else {
              break;
            }
          }
          exp = s.substring(caretIdx + 1, cur);
          expEnd = cur;
        } else {
          exp = s[caretIdx + 1] || '';
          expEnd = caretIdx + 2;
        }
      }

      const replacement = `${base}^{${exp}}`;
      s = s.substring(0, baseStart) + replacement + s.substring(expEnd);
    }

    // 3. Xử lý phân số: numerator / denominator
    function findTopLevelDivision(str) {
      let pDepth = 0;
      let bDepth = 0;
      for (let i = 0; i < str.length; i++) {
        if (str[i] === '(') pDepth++;
        else if (str[i] === ')') pDepth--;
        else if (str[i] === '{') bDepth++;
        else if (str[i] === '}') bDepth--;
        else if (str[i] === '/' && pDepth === 0 && bDepth === 0) {
          return i;
        }
      }
      return -1;
    }

    let divIdx = findTopLevelDivision(s);
    while (divIdx !== -1) {
      let numStart = 0;
      let pDepth = 0;
      let bDepth = 0;
      for (let i = divIdx - 1; i >= 0; i--) {
        if (s[i] === ')') pDepth++;
        else if (s[i] === '(') pDepth--;
        else if (s[i] === '}') bDepth++;
        else if (s[i] === '{') bDepth--;
        else if ((s[i] === '+' || s[i] === '-') && pDepth === 0 && bDepth === 0) {
          numStart = i + 1;
          break;
        }
      }

      let denEnd = s.length;
      pDepth = 0;
      bDepth = 0;
      for (let i = divIdx + 1; i < s.length; i++) {
        if (s[i] === '(') pDepth++;
        else if (s[i] === ')') pDepth--;
        else if (s[i] === '{') bDepth++;
        else if (s[i] === '}') bDepth--;
        else if ((s[i] === '+' || s[i] === '-') && pDepth === 0 && bDepth === 0) {
          denEnd = i;
          break;
        }
      }

      let numStr = s.substring(numStart, divIdx).trim();
      let denStr = s.substring(divIdx + 1, denEnd).trim();

      if (numStr.startsWith('(') && numStr.endsWith(')')) {
        if (findMatchingParen(numStr, 0) === numStr.length - 1) {
          numStr = numStr.substring(1, numStr.length - 1);
        }
      }
      if (denStr.startsWith('(') && denStr.endsWith(')')) {
        if (findMatchingParen(denStr, 0) === denStr.length - 1) {
          denStr = denStr.substring(1, denStr.length - 1);
        }
      }

      const numLatex = App.exprToLatex(numStr);
      const denLatex = App.exprToLatex(denStr);
      const frac = `\\frac{${numLatex}}{${denLatex}}`;

      s = s.substring(0, numStart) + frac + s.substring(denEnd);
      divIdx = findTopLevelDivision(s);
    }

    // 4. Hằng số pi
    s = s.replace(/\bpi\b/g, "\\pi");

    // 5. Chuẩn hóa phép nhân
    s = s.replace(/(\d)\s*\*\s*([a-zA-Z\\])/g, "$1$2");
    s = s.replace(/\*/g, " \\cdot ");

    return s.trim();
  };

  // Cập nhật khung xem trước công thức KaTeX thời gian thực
  App.updateVectorInputPreview = function () {
    const inp = document.getElementById("vectorInput");
    const wrap = document.getElementById("vecInputPreviewWrap");
    const preview = document.getElementById("vecInputPreview");
    if (!inp || !wrap || !preview) return;
    if (typeof window.katex === "undefined") return;

    const raw = (inp.value || "").trim();
    const cleaned = App.cleanVectorInput ? App.cleanVectorInput(raw) : raw;

    if (!cleaned || cleaned === "[]" || cleaned === "[,]" || cleaned === "()") {
      wrap.style.display = "none";
      preview.innerHTML = "";
      return;
    }

    try {
      const parts = App.splitVectorCoordinates(cleaned);
      if (!parts || parts.length < 2) {
        wrap.style.display = "none";
        preview.innerHTML = "";
        return;
      }

      const latexParts = parts.map((p) => App.exprToLatex(p));
      const allowedVars = ["t", "m", "x", "y", "z"];
      const reserved = new Set(["pi", "e", "sin", "cos", "tan", "cot", "sinh", "cosh", "tanh", "log", "log10", "ln", "abs", "sqrt"]);
      const tokens = cleaned.toLowerCase().match(/\b[a-z_][a-z0-9_]*\b/g) || [];
      const foundVars = [];
      tokens.forEach((tok) => {
        if (!reserved.has(tok) && allowedVars.includes(tok) && !foundVars.includes(tok)) foundVars.push(tok);
      });
      let paramName = "";
      if (foundVars.includes("t")) paramName = "t";
      else if (foundVars.includes("m")) paramName = "m";
      else if (foundVars.length > 0) paramName = foundVars[0];

      const varName = paramName ? `v(${paramName})` : "v";
      const matrixLatex = `\\displaystyle \\vec{${varName}} = \\begin{bmatrix} ` + latexParts.join(" \\\\ ") + " \\end{bmatrix}";

      katex.render(matrixLatex, preview, {
        throwOnError: false,
        displayMode: false
      });

      if (cleaned.includes("^")) {
        preview.title = `Biểu thức: ${cleaned}`;
      } else {
        preview.title = "";
      }

      wrap.style.display = "flex";
    } catch (e) {
      wrap.style.display = "none";
    }
  };

  // Không còn sử dụng nút zoom thủ công, tự động khóa sàn kích thước số mũ qua CSS Math Floor
  App.togglePreviewZoom = function () {};

  // =========================================================================
  // TOÁN TỬ VÀ MÔI TRƯỜNG BIÊN DỊCH BẬC CAO CHO HIỆU NĂNG TỐI ĐA (PRE-COMPILED ENGINE)
  // =========================================================================
  const MATH_RAD = {
    pi: Math.PI,
    e: Math.E,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    root: (n, x) => (x < 0 && n % 2 !== 0) ? -Math.pow(-x, 1 / n) : Math.pow(x, 1 / n),
    nthroot: (n, x) => (x < 0 && n % 2 !== 0) ? -Math.pow(-x, 1 / n) : Math.pow(x, 1 / n),
    abs: Math.abs,
    log: (a, b) => b !== undefined ? Math.log(b) / Math.log(a) : Math.log(a),
    log2: (x) => Math.log2 ? Math.log2(x) : Math.log(x) / Math.LN2,
    log10: (x) => Math.log10 ? Math.log10(x) : Math.log(x) / Math.LN10,
    ln: Math.log,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    cot: (x) => 1 / Math.tan(x),
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    acot: (x) => Math.PI / 2 - Math.atan(x),
    arcsin: Math.asin,
    arccos: Math.acos,
    arctan: Math.atan,
    arccot: (x) => Math.PI / 2 - Math.atan(x),
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
  };

  const DEG_TO_RAD = Math.PI / 180;
  const MATH_DEG = {
    pi: Math.PI,
    e: Math.E,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    root: (n, x) => (x < 0 && n % 2 !== 0) ? -Math.pow(-x, 1 / n) : Math.pow(x, 1 / n),
    nthroot: (n, x) => (x < 0 && n % 2 !== 0) ? -Math.pow(-x, 1 / n) : Math.pow(x, 1 / n),
    abs: Math.abs,
    log: (a, b) => b !== undefined ? Math.log(b) / Math.log(a) : Math.log(a),
    log2: (x) => Math.log2 ? Math.log2(x) : Math.log(x) / Math.LN2,
    log10: (x) => Math.log10 ? Math.log10(x) : Math.log(x) / Math.LN10,
    ln: Math.log,
    sin: (x) => Math.sin(x * DEG_TO_RAD),
    cos: (x) => Math.cos(x * DEG_TO_RAD),
    tan: (x) => Math.tan(x * DEG_TO_RAD),
    cot: (x) => 1 / Math.tan(x * DEG_TO_RAD),
    asin: (x) => Math.asin(x) / DEG_TO_RAD,
    acos: (x) => Math.acos(x) / DEG_TO_RAD,
    atan: (x) => Math.atan(x) / DEG_TO_RAD,
    acot: (x) => (Math.PI / 2 - Math.atan(x)) / DEG_TO_RAD,
    arcsin: (x) => Math.asin(x) / DEG_TO_RAD,
    arccos: (x) => Math.acos(x) / DEG_TO_RAD,
    arctan: (x) => Math.atan(x) / DEG_TO_RAD,
    arccot: (x) => (Math.PI / 2 - Math.atan(x)) / DEG_TO_RAD,
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
  };

  const _exprFnCache = new Map();

  function getCompiledExpr(exprStr, isRadianContext) {
    if (!exprStr || !exprStr.trim()) {
      return () => 0;
    }
    const e = exprStr.trim();
    const cacheKey = (isRadianContext ? "R:" : "D:") + e;
    let compiled = _exprFnCache.get(cacheKey);
    if (compiled) return compiled;

    const M = isRadianContext ? MATH_RAD : MATH_DEG;
    try {
      const rawFn = new Function("s", "M", `
        var t = (s && s.t !== undefined) ? s.t : 1.0;
        var m = (s && s.m !== undefined) ? s.m : 1.0;
        var u = (s && s.u !== undefined) ? s.u : 1.0;
        var v = (s && s.v !== undefined) ? s.v : 1.0;
        var x = (s && s.x !== undefined) ? s.x : 1.0;
        var y = (s && s.y !== undefined) ? s.y : 1.0;
        var z = (s && s.z !== undefined) ? s.z : 1.0;
        var pi = M.pi, e = M.e, sqrt = M.sqrt, cbrt = M.cbrt, root = M.root, nthroot = M.nthroot, abs = M.abs;
        var log = M.log, log2 = M.log2, log10 = M.log10, ln = M.ln;
        var sin = M.sin, cos = M.cos, tan = M.tan, cot = M.cot;
        var asin = M.asin, acos = M.acos, atan = M.atan, acot = M.acot;
        var arcsin = M.arcsin, arccos = M.arccos, arctan = M.arctan, arccot = M.arccot;
        var sinh = M.sinh, cosh = M.cosh, tanh = M.tanh;
        return Number(${e});
      `);
      compiled = function (scope) {
        try {
          return rawFn(scope, M);
        } catch (err) {
          return NaN;
        }
      };
      if (_exprFnCache.size > 2000) _exprFnCache.clear();
      _exprFnCache.set(cacheKey, compiled);
      return compiled;
    } catch (err) {
      compiled = () => NaN;
      _exprFnCache.set(cacheKey, compiled);
      return compiled;
    }
  }

  App.parseVectorExpr = function (str, allowScalar = false) {
    if (!str) return null;
    let s = App.cleanVectorInput(str);
    if (!s || s === "[]" || s === "[,]") return null;
    s = s.toLowerCase();

    // 1. Dọn dẹp ký tự lạ & Chuẩn hóa
    s = s.replace(/\\left/g, "").replace(/\\right/g, "");
    s = s.replace(/\\lbrack/g, "[").replace(/\\rbrack/g, "]");
    s = s.replace(/\\lbrace/g, "(").replace(/\\rbrace/g, ")");
    // Thay dấu nhân
    s = s.replace(/\\cdot/g, "*").replace(/\\times/g, "*");
    // Xóa dấu chấm thừa
    s = s.replace(/\s+\.\s+/g, "*");

    // 2. XỬ LÝ TOÁN HỌC (QUAN TRỌNG)

    // Hàm parser chuyên dụng cho LaTeX (Xử lý ngoặc lồng nhau)
    function replaceMathCommands(inputStr) {
      let res = inputStr;
      
      function replaceCmd(cmdName, replacer) {
          let regex = new RegExp('\\\\\\\\?' + cmdName + '(?![a-zA-Z])');
          while (true) {
            let match = regex.exec(res);
            if (!match) break;
            
            let startIdx = match.index;
            let args = [];
            let currIdx = startIdx + match[0].length;
            
            while (currIdx < res.length) {
                while (currIdx < res.length && res[currIdx] === ' ') currIdx++;
                if (currIdx >= res.length) break;
                
                let openChar = res[currIdx];
                let closeChar = '';
                
                if (openChar === '{') closeChar = '}';
                else if (openChar === '[') closeChar = ']';
                else {
                    // Xử lý các đối số không có ngoặc, ví dụ: \sqrt2, \frac12
                    if (/[0-9a-zA-Z]/.test(openChar)) {
                        args.push({ val: openChar, type: 'none' });
                        currIdx++;
                        if (args.length >= 2) break; // Tối ưu: frac, sqrt chỉ cần tối đa 2 arg
                        continue;
                    }
                    break;
                }
                
                let openBraces = 0;
                let argStart = currIdx;
                let found = false;
                
                for (let j = currIdx; j < res.length; j++) {
                    if (res[j] === openChar) openBraces++;
                    else if (res[j] === closeChar) openBraces--;
                    
                    if (openBraces === 0) {
                        args.push({ val: res.substring(argStart + 1, j), type: openChar });
                        currIdx = j + 1;
                        found = true;
                        break;
                    }
                }
                if (!found) break; 
                
                if (args.length >= 2) break; 
            }
            
            let replacement = replacer(args);
            if (replacement === null) {
                res = res.substring(0, startIdx) + 'ERR_' + cmdName + res.substring(currIdx);
            } else {
                res = res.substring(0, startIdx) + replacement + res.substring(currIdx);
            }
          }
      }
      
      replaceCmd('frac', args => {
          if (args.length >= 2) return '(' + args[0].val + ')/(' + args[1].val + ')';
          return null;
      });
      
      replaceCmd('sqrt', (args) => {
          if (args.length >= 1) {
              if (args.length === 2 && args[0].type === '[' && args[1].type === '{') {
                  return '((' + args[1].val + ')**(1/(' + args[0].val + ')))';
              }
              return 'sqrt(' + args[0].val + ')';
          }
          return null;
      });

      return res;
    }

    s = replaceMathCommands(s);

    // Logarit có cơ số: \log_2(8) hoặc log_a(x) hoặc \log_{a}(x)
    s = s.replace(/\\?log_\{?([a-zA-Z0-9_\.]+)\}?\(([^()]+)\)/g, "(log($2)/log($1))");
    // Logarit thập phân và nhị phân
    s = s.replace(/\\?log10\(([^()]+)\)/g, "(log($1)/log(10))");
    s = s.replace(/\\?log2\(([^()]+)\)/g, "(log($1)/log(2))");
    // Căn bậc n tổng quát: root(n, x) hoặc nthroot(n, x)
    s = s.replace(/\\?(?:root|nthroot)\(([^,]+),([^()]+)\)/g, "(($2)**(1/($1)))");
    // Căn bậc 3: cbrt(x)
    s = s.replace(/\\?cbrt\(([^()]+)\)/g, "(($1)**(1/3))");
    // Lượng giác ngược: arccos, arcsin, arctan, arccot
    s = s.replace(/\\?arccos\b/g, "acos");
    s = s.replace(/\\?arcsin\b/g, "asin");
    s = s.replace(/\\?arctan\b/g, "atan");
    s = s.replace(/\\?arccot\(([^()]+)\)/g, "(pi/2-atan($1))");

    // [FIX LỖI CỦA ÔNG] Logarit tự nhiên (ln) và log thường
    s = s.replace(/\\?ln\b/g, "log");
    s = s.replace(/\\?log\b/g, "log");

    // Xử lý sqrt không ngoặc (nếu có): \sqrt4 -> sqrt(4)
    s = s.replace(/\\?sqrt\s*(\d+)/g, "sqrt($1)");

    // Lượng giác & Mũ
    s = s.replace(/cot\((.+?)\)/g, "(1/tan($1))");
    s = s.replace(/\^/g, "**");

    // 3. Xóa dấu gạch chéo còn sót lại
    s = s.replace(/\\/g, "");

    // Chuẩn hóa hàm lượng giác không ngoặc hoặc dính liền: cost -> cos(t), sint -> sin(t), cos t -> cos(t), sin t -> sin(t)
    s = s.replace(/\b(sin|cos|tan|cot|sinh|cosh|tanh|asin|acos|atan)\s*([tmuvxyz])\b/g, "$1($2)");
    // Chuẩn hóa hàm lượng giác với số không ngoặc: cos2 -> cos(2), sin3 -> sin(3)
    s = s.replace(/\b(sin|cos|tan|cot|sinh|cosh|tanh|asin|acos|atan)\s*(\d+(?:\.\d+)?)\b/g, "$1($2)");

    // 4. Nhân ẩn (Implicit Multiplication)
    // Số nhân chữ/ngoặc: 2x -> 2*x, 2(3) -> 2*(3)
    s = s.replace(/(\d)\s*([a-z\(])/g, "$1*$2");
    // Ngoặc nhân số: )2 -> )*2
    s = s.replace(/([a-z\)])\s*(\d)/g, "$1*$2");
    // Ngoặc nhân ngoặc: )( -> )*(
    s = s.replace(/(\))\s*(\()/g, "$1*$2");
    // Ngoặc nhân chữ: )t -> )*t, )cos -> )*cos
    s = s.replace(/(\))\s*([a-z])/g, "$1*$2");
    // Biến nhân ngoặc: t(t+1) -> t*(t+1)
    s = s.replace(/\b([tmuvxyz])\s*\(/g, "$1*(");
    // Biến nhân hàm toán học: m sin(u) -> m*sin(u), u cos(v) -> u*cos(v)
    s = s.replace(/\b([tmuvxyz])\s+(sin|cos|tan|cot|sqrt|cbrt|root|nthroot|ln|log|exp|sinh|cosh|tanh|abs|asin|acos|atan|arccos|arcsin|arctan)\b/g, "$1*$2");
    // Hằng số nhân số: pi2 -> pi*2
    s = s.replace(/\b(pi|e)\s*(\d)/g, "$1*$2");

    // Xử lý dấu trừ đơn trước lũy thừa: -t**2 -> ((-1)*(t**2))
    s = s.replace(/(^|[+\-*/(,])\s*-\s*([a-zA-Z0-9_\.]+)\*\*([a-zA-Z0-9_\.]+)/g, (match, prefix, base, exp) => {
      return prefix + "((-1)*(" + base + "**" + exp + "))";
    });

    // 5. Tách mảng vector (Yêu cầu tối thiểu 2 tọa độ cho vector; cho phép 1 số nếu allowScalar = true cho ma trận)
    let parts = App.splitVectorCoordinates(s);
    const minCoords = allowScalar ? 1 : 2;
    if (!parts || parts.length < minCoords || parts.every((p) => p === "")) return null;

    // Khoan dung với tọa độ rỗng (ví dụ người dùng vừa xóa một số: [1, ])
    parts = parts.map((p) => (p === "" ? "0" : p));
    if (parts.length > 5) parts = parts.slice(0, 5);

    // 6. Nhận diện các biến tham số hợp lệ: t, m, u, v, x, y, z
    const allowedVars = ["t", "m", "u", "v", "x", "y", "z"];
    const reservedWords = new Set([
      "pi", "e", "sin", "cos", "tan", "cot", "sinh", "cosh", "tanh",
      "asin", "acos", "atan", "acot", "arcsin", "arccos", "arctan", "arccot",
      "log", "log10", "log2", "ln", "abs", "sqrt", "cbrt", "root", "nthroot", "math"
    ]);

    const detectedVars = [];
    parts.forEach((p) => {
      const tokens = p.match(/\b[a-z_][a-z0-9_]*\b/g) || [];
      tokens.forEach((tok) => {
        if (!reservedWords.has(tok) && allowedVars.includes(tok) && !detectedVars.includes(tok)) {
          detectedVars.push(tok);
        }
      });
    });

    // 7. Hàm tính toán an toàn hỗ trợ biến số với bộ biên dịch sẵn (Pre-compiled High Performance Evaluator)
    const isExprRadian = detectedVars.length > 0;
    const compiledParts = parts.map((p) => {
      const isRad = isExprRadian || /\b(pi|e)\b/.test(p);
      return getCompiledExpr(p, isRad);
    });

    const evaluate = (expr, scope = {}) => {
      if (!expr || !expr.trim()) return 0;
      const idx = parts.indexOf(expr);
      if (idx !== -1) {
        return compiledParts[idx](scope);
      }
      const isRad = isExprRadian || /\b(pi|e)\b/.test(expr);
      return getCompiledExpr(expr, isRad)(scope);
    };

    // 8. Nếu không có biến tham số: trả về mảng số tĩnh bình thường
    if (detectedVars.length === 0) {
      return parts.map((p, idx) => {
        const val = compiledParts[idx]({});
        if (isNaN(val)) throw new Error(`Lỗi cú pháp: "${p}"`);
        return val;
      });
    }

    // 9. Xác định biến tham số chính theo độ ưu tiên: t > m > u > v > x > y > z
    let primaryVar = "t";
    if (detectedVars.includes("t")) {
      primaryVar = "t";
    } else if (detectedVars.includes("m")) {
      primaryVar = "m";
    } else if (detectedVars.includes("u")) {
      primaryVar = "u";
    } else if (detectedVars.includes("v")) {
      primaryVar = "v";
    } else {
      primaryVar = detectedVars[0];
    }
    const sortedVars = [primaryVar, ...detectedVars.filter((v) => v !== primaryVar)];

    // 10. Nếu có biến tham số: tính tọa độ ban đầu an toàn và gán năng lực tham số
    const defaultScopeValues = { t: 1.0, m: 1.0, u: 1.0, v: 1.0, x: 2.0, y: 1.0, z: 1.0 };
    const initialCoords = parts.map((p, idx) => {
      const val = compiledParts[idx](defaultScopeValues);
      if (!isNaN(val)) return val;
      for (const testVal of [1.0, 0.0, 2.0, 0.5]) {
        const fallbackVal = compiledParts[idx]({ t: testVal, m: testVal, u: testVal, v: testVal, x: testVal, y: testVal, z: testVal });
        if (!isNaN(fallbackVal)) return fallbackVal;
      }
      throw new Error(`Lỗi cú pháp biểu thức: "${p}"`);
    });

    initialCoords.isParametric = true;
    initialCoords.paramVar = primaryVar;
    initialCoords.vars = sortedVars;
    initialCoords.rawExprs = parts.map((p) => p.trim());
    initialCoords._compiledParts = compiledParts;

    initialCoords.fn = function (valOrScope, explicitScope) {
      const activeVar = this && this.paramVar ? this.paramVar : primaryVar;
      const baseScope = Object.assign({}, defaultScopeValues);
      if (this && this.scopeValues && typeof this.scopeValues === "object") {
        Object.assign(baseScope, this.scopeValues);
      }
      if (explicitScope && typeof explicitScope === "object") {
        Object.assign(baseScope, explicitScope);
      }

      let sc = baseScope;
      if (typeof valOrScope === "number") {
        sc[activeVar] = valOrScope;
      } else if (valOrScope && typeof valOrScope === "object") {
        Object.assign(sc, valOrScope);
      }

      const fns = this && this._compiledParts ? this._compiledParts : compiledParts;
      return fns.map((fn) => {
        const res = fn(sc);
        return isNaN(res) ? NaN : res;
      });
    };
    initialCoords.evalParam = initialCoords.fn;

    initialCoords.eval2D = function (val1, val2) {
      const var1 = sortedVars[0];
      const var2 = sortedVars[1] || sortedVars[0];
      if (!this._reusableEval2DScope) {
        this._reusableEval2DScope = Object.assign({}, defaultScopeValues);
      }
      const sc = this._reusableEval2DScope;
      if (this && this.scopeValues && typeof this.scopeValues === "object") {
        Object.assign(sc, this.scopeValues);
      }
      sc[var1] = val1;
      sc[var2] = val2;

      const fns = this && this._compiledParts ? this._compiledParts : compiledParts;
      return fns.map((fn) => {
        const res = fn(sc);
        return isNaN(res) ? NaN : res;
      });
    };

    return initialCoords;
  };

  // Hàm format hiển thị (giữ nguyên)
  App.formatVectorShort = function (vec) {
    if (!Array.isArray(vec)) return "[]";
    return (
      "[" +
      vec
        .map((n) => {
          const r = Math.round(n * 10000) / 10000;
          return r.toString();
        })
        .join(", ") +
      "]"
    );
  };

  // Hàm phân tích biểu thức vô hướng đơn lẻ (Dành cho ô phần tử ma trận)
  App.parseScalarExpr = function (str) {
    if (str === null || str === undefined) return null;
    const trimmed = String(str).trim();
    if (trimmed === "") return 0;
    const wrapped = trimmed.startsWith("[") && trimmed.endsWith("]") ? trimmed : `[${trimmed}]`;
    return App.parseVectorExpr(wrapped, true);
  };
})();
