(function () {
  window.App = window.App || {};

  function splitTopLevelByComma(s) {
    const parts = [];
    let cur = "";
    let depth = 0;

    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === "," && depth === 0) { parts.push(cur.trim()); cur = ""; continue; }
      if (ch === "(") depth++;
      else if (ch === ")" && depth > 0) depth--;
      cur += ch;
    }
    if (cur.trim() !== "") parts.push(cur.trim());
    return parts;
  }

  function evalExprSafe(expr) {
    if (!expr || !expr.trim()) throw "Thiếu toạ độ";
    let e = expr.trim();

    e = e.replace(/√\s*\(/g, "sqrt(");
    e = e.replace(/√\s*([0-9.]+)/g, "sqrt($1)");
    e = e.replace(/\bsqrt\s*\(/gi, "Math.sqrt(");

    const safeRe = /^[0-9+\-*/.\s()a-zA-Z_]+$/;
    if (!safeRe.test(e)) throw "Biểu thức có ký tự không hợp lệ";
    if (/constructor|Function|=>|while|for|if|return|try|catch|process|window|document/i.test(e)) {
      throw "Biểu thức không hợp lệ";
    }

    let val;
    try {
      // eslint-disable-next-line no-new-func
      val = Function(`"use strict"; return (${e});`)();
    } catch {
      throw `Không tính được: ${expr}`;
    }

    if (!isFinite(val)) throw `Kết quả không hợp lệ: ${expr}`;
    return Number(val);
  }

  App.parseVectorExpr = function (raw) {
    const s = raw.trim();
    if (!s.startsWith("[") || !s.endsWith("]")) throw "Nhập phải dạng [a,b] hoặc [a,b,c]";
    const inside = s.slice(1, -1);
    const parts = splitTopLevelByComma(inside);
    if (parts.length !== 2 && parts.length !== 3) throw "Vector phải có 2 hoặc 3 toạ độ";
    return parts.map(evalExprSafe);
  };
})();
