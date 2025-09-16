/* parser.js
   ============================================
   Bộ parse & format vector/number cho UI
   - Hỗ trợ: phân số (1/2), sqrt(...) & ký hiệu √
   - Xấp xỉ hữu tỉ (continued fraction), xấp xỉ căn bậc hai tối giản
   - Xuất hàm toàn cục: formatScalar, formatVectorShort, formatTip,
                       splitTopLevelByComma, evalExprSafe, parseVectorExpr
   ============================================ */

/* (1) Helpers số học cơ bản */
(function(){
  'use strict';

  function gcd(a,b){
    a = Math.abs(Number(a)); b = Math.abs(Number(b));
    while (b) { const t = a % b; a = b; b = t; }
    return a || 1;
  }
  function isNearly(x,y,eps=1e-10){ return Math.abs(x - y) <= eps; }
  function isNearlyInt(x, eps=1e-10){ return isNearly(x, Math.round(x), eps); }

  /* (2) Xấp xỉ hữu tỉ (continued fraction) */
  function rationalApprox(x, maxDen=10000, eps=1e-12){
    if (!isFinite(x)) return null;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    if (isNearlyInt(x, eps)) return { n: sign * Math.round(x), d: 1 };

    let a0 = Math.floor(x);
    let p0 = 1, q0 = 0, p1 = a0, q1 = 1;
    let frac = x - a0;
    if (isNearly(frac, 0, eps)) return { n: sign * p1, d: q1 };

    for (let i=0;i<30;i++){
      const a = Math.floor(1/frac);
      const p2 = a*p1 + p0;
      const q2 = a*q1 + q0;
      const approx = p2/q2;
      if (q2 > maxDen) break;
      if (Math.abs(approx - x) <= eps) return { n: sign*p2, d: q2 };
      p0=p1; q0=q1; p1=p2; q1=q2;
      frac = 1/frac - a;
      if (frac <= eps) break;
    }
    if (Math.abs(p1/q1 - x) <= eps) return { n: sign*p1, d: q1 };
    return null;
  }

  /* (3) Xấp xỉ căn bậc hai tối giản */
  function largestSquareFactor(n){
    let r = 1;
    for (let k=2; k*k<=n; k++){
      while (n % (k*k) === 0){
        n /= k*k;
        r *= k;
      }
    }
    return { root: r, rest: n };
  }

  function approxRadical(x, eps=1e-9){
    if (!isFinite(x)) return null;
    if (isNearlyInt(x, eps)) return null; // ưu tiên số nguyên
    const sign = x < 0 ? '-' : '';
    const ax = Math.abs(x);

    let best=null, errBest=1e9;

    // p*sqrt(n)/m, với n square-free (2..400), p<=8, m<=60
    for (let p=1; p<=8; p++){
      for (let n=2; n<=400; n++){
        const s = Math.sqrt(n);
        for (let m=1; m<=60; m++){
          const val = (p*s)/m;
          const err = Math.abs(val - ax);
          if (err < errBest){
            const {root:r, rest} = largestSquareFactor(n);
            if (rest === 1) continue; // không phải square-free thực sự
            let num = p*r, den = m;
            const g = gcd(num, den); num/=g; den/=g;
            const coef = (num===1 ? '' : String(num));
            const frac = (den===1 ? '' : `/${den}`);
            best = `${sign}${coef}√${rest}${frac}`;
            errBest = err;
          }
        }
      }
    }

    // Trường hợp 1/sqrt(n)
    for (let n=2; n<=400; n++){
      const val = 1/Math.sqrt(n);
      const err = Math.abs(val - ax);
      if (err < errBest && err < eps){
        const {root:r, rest} = largestSquareFactor(n);
        const den = r*rest;
        best = `${sign}√${rest}/${den}`;
        errBest = err;
      }
    }

    if (errBest < eps) return best;
    return null;
  }

  /* (4) Format số & vector */
  function formatScalar(x){
    if (!isFinite(x)) return String(x);
    if (Math.abs(x) < 1e-12) return "0";
    if (isNearlyInt(x)) return String(Math.round(x));

    // Ưu tiên dạng phân số nếu “khớp” sát
    const rat = rationalApprox(x, 10000, 1e-12);
    if (rat){
      const n=rat.n, d=rat.d;
      if (d===1) return String(n);
      return `${n}/${d}`;
    }

    // Thử dạng căn
    const rad = approxRadical(x, 1e-9);
    if (rad) return rad;

    // Thập phân fallback
    return Number(x.toFixed(6)).toString();
  }

  function formatVectorShort(vec){
    return `[${vec.map(formatScalar).join(', ')}]`;
  }
  function formatTip(vec){
    return `(${vec.map(formatScalar).join(', ')})`;
  }

  /* (5) Các hàm parse biểu thức & vector */
  function splitTopLevelByComma(s){
    const parts=[]; let cur=''; let depth=0;
    for (let i=0;i<s.length;i++){
      const ch = s[i];
      if (ch===',' && depth===0){ parts.push(cur.trim()); cur=''; continue; }
      if (ch==='(') depth++;
      else if (ch===')' && depth>0) depth--;
      cur += ch;
    }
    if (cur.trim()!=='') parts.push(cur.trim());
    return parts;
  }

  function evalExprSafe(expr){
    if (!expr || !expr.trim()) throw "Thiếu toạ độ";
    let e = expr.trim();

    // Hỗ trợ ký hiệu √2, √(3)
    e = e.replace(/√\s*\(/g, 'sqrt(');           // √(2) -> sqrt(2)
    e = e.replace(/√\s*([0-9.]+)/g, 'sqrt($1)'); // √2   -> sqrt(2)

    // Preprocess sqrt(...) => Math.sqrt(...)
    e = e.replace(/\bsqrt\s*\(/gi, 'Math.sqrt(');

    // Chỉ cho phép chuỗi an toàn
    const safeRe = /^[0-9+\-*/.\s()a-zA-Z_]+$/;
    if (!safeRe.test(e)) throw "Biểu thức có ký tự không hợp lệ";

    // Cấm các từ khoá nguy hiểm
    if (/constructor|Function|=>|while|for|if|return|try|catch|process|window|document/i.test(e)){
      throw "Biểu thức không hợp lệ";
    }

    let val;
    try{
      // eslint-disable-next-line no-new-func
      val = Function(`"use strict"; return (${e});`)();
    }catch{
      throw `Không tính được: ${expr}`;
    }
    if (!isFinite(val)) throw `Kết quả không hợp lệ: ${expr}`;
    return Number(val);
  }

  function parseVectorExpr(raw){
    const s = String(raw || '').trim();
    if (!s.startsWith('[') || !s.endsWith(']'))
      throw 'Nhập phải dạng [a,b] hoặc [a,b,c]';
    const inside = s.slice(1, -1);
    const parts = splitTopLevelByComma(inside);
    if (parts.length!==2 && parts.length!==3)
      throw 'Vector phải có 2 hoặc 3 toạ độ';
    const vec = parts.map(evalExprSafe);
    return vec;
  }

  /* (6) Xuất global (không đè nếu đã có) */
  const g = (typeof window!=='undefined' ? window : globalThis);

  if (typeof g.gcd === 'undefined') g.gcd = gcd;
  if (typeof g.isNearly === 'undefined') g.isNearly = isNearly;
  if (typeof g.isNearlyInt === 'undefined') g.isNearlyInt = isNearlyInt;
  if (typeof g.rationalApprox === 'undefined') g.rationalApprox = rationalApprox;
  if (typeof g.largestSquareFactor === 'undefined') g.largestSquareFactor = largestSquareFactor;
  if (typeof g.approxRadical === 'undefined') g.approxRadical = approxRadical;

  if (typeof g.formatScalar === 'undefined') g.formatScalar = formatScalar;
  if (typeof g.formatVectorShort === 'undefined') g.formatVectorShort = formatVectorShort;
  if (typeof g.formatTip === 'undefined') g.formatTip = formatTip;

  if (typeof g.splitTopLevelByComma === 'undefined') g.splitTopLevelByComma = splitTopLevelByComma;
  if (typeof g.evalExprSafe === 'undefined') g.evalExprSafe = evalExprSafe;
  if (typeof g.parseVectorExpr === 'undefined') g.parseVectorExpr = parseVectorExpr;

  // Namespace tiện nếu muốn gọi qua Vec.*
  if (!g.Vec) g.Vec = {};
  Object.assign(g.Vec, {
    gcd, isNearly, isNearlyInt,
    rationalApprox, largestSquareFactor, approxRadical,
    formatScalar, formatVectorShort, formatTip,
    splitTopLevelByComma, evalExprSafe, parseVectorExpr
  });

})();
