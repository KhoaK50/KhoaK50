// ===================== gauss_steps.js (FIXED FORMAT) =====================
(function () {
  window.App = window.App || {};

  // Hàm làm sạch số (ép số nguyên nếu rất gần)
  function clean(x) {
    const eps = 1e-4; // Dung sai lớn hơn chút để bắt được 3.000000000012
    if (Math.abs(x) < eps) return 0;
    
    // Nếu gần số nguyên thì ép về số nguyên
    if (Math.abs(x - Math.round(x)) < eps) {
        return Math.round(x);
    }
    return x;
  }

  function deepCopy(M) {
    return M.map(r => r.slice());
  }

  // Hàm format số đẹp (Dùng App.formatScalar xịn hoặc tự tính phân số)
  function fmtNum(x) {
    let val = clean(x);
    if (val === 0) return "0";
    
    // Nếu là số nguyên
    if (Number.isInteger(val)) return String(val);

    // Nếu có hàm format xịn của App thì dùng
    if (typeof App.formatScalar === 'function') {
        return App.formatScalar(val);
    }

    // Tự xử lý phân số (Fallback)
    for (let d = 2; d <= 12; d++) {
        let num = Math.round(val * d);
        if (Math.abs(val - num / d) < 1e-4) {
            return (num === d || num === -d) ? String(num/d) : `${num}/${d}`; // Trả về dạng a/b
        }
    }

    // Số thập phân xấu quá thì cắt ngắn
    return String(Number(val.toFixed(4)).replace(/\.?0+$/, ""));
  }

  // op string theo style PDF: d2 -> d2 - 2 d1, d1 <-> d2, d3 -> (1/2) d3
  function opSwap(i, j) { return `d_${i} \\leftrightarrow d_${j}`; }
  
  function opScale(i, k) { 
      // Format k đẹp (VD: 1/3 thay vì 0.3333)
      let kStr = fmtNum(k);
      // Thêm ngoặc nếu là số âm hoặc phân số phức tạp để nhìn cho rõ
      if (kStr.includes("-") || kStr.includes("/")) kStr = `(${kStr})`;
      return `d_${i} \\to ${kStr}\\,d_${i}`; 
  }

  function opAdd(i, a, j) {
    // di -> di + a*dj  (a có thể âm)
    const aClean = clean(a);
    if (aClean === 0) return "";
    
    const sign = (aClean >= 0) ? "+" : "-";
    const mag = Math.abs(aClean);
    
    // Format hệ số đẹp
    let coef = fmtNum(mag);
    if (coef === "1") coef = ""; // Ẩn số 1 (d_i + d_j thay vì d_i + 1d_j)

    return `d_${i} \\to d_${i} ${sign} ${coef}d_${j}`;
  }

  // Khử Gauss dạng bậc thang, có ghi phép biến đổi hàng
  App.gaussElimWithOps = function (A) {
    const M = deepCopy(A).map(row => row.map(clean));
    const m = M.length;
    const n = (m ? M[0].length : 0);

    const matrices = [deepCopy(M)];
    const ops = [];

    let row = 0;

    for (let col = 0; col < n && row < m; col++) {
      // tìm pivot
      let piv = row;
      for (let r = row; r < m; r++) {
        if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
      }

      if (Math.abs(M[piv][col]) < 1e-9) continue;

      // swap
      if (piv !== row) {
        const tmp = M[piv]; M[piv] = M[row]; M[row] = tmp;
        ops.push(opSwap(piv + 1, row + 1));
        matrices.push(deepCopy(M));
      }

      // chuẩn hoá pivot về 1 (để số đẹp hơn)
      const pv = M[row][col];
      if (Math.abs(pv - 1) > 1e-9) {
        const k = 1 / pv;
        for (let c = col; c < n; c++) M[row][c] = clean(M[row][c] * k);
        
        ops.push(opScale(row + 1, k)); // Truyền số k vào để hàm opScale tự format
        matrices.push(deepCopy(M));
      }

      // khử các hàng dưới
      for (let r = row + 1; r < m; r++) {
        const factor = clean(M[r][col]);
        if (Math.abs(factor) < 1e-9) continue;

        for (let c = col; c < n; c++) {
          M[r][c] = clean(M[r][c] - factor * M[row][c]);
        }

        const a = -factor; 
        const op = opAdd(r + 1, a, row + 1);
        if (op) {
          ops.push(op);
          matrices.push(deepCopy(M));
        }
      }

      row++;
    }

    return { matrices, ops };
  };

})();