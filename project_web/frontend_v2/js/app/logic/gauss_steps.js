// ===================== gauss_steps.js =====================
(function () {
  window.App = window.App || {};

  // Làm tròn nhẹ để tránh -0, 1.0000000002...
  function clean(x) {
    const eps = 1e-10;
    if (Math.abs(x) < eps) return 0;
    const r = Math.round(x * 1e12) / 1e12;
    return r;
  }

  function deepCopy(M) {
    return M.map(r => r.slice());
  }

  function fmtNum(x) {
    // in đẹp hệ số trong nhãn phép biến đổi
    x = clean(x);
    if (x === 0) return "0";
    if (Number.isInteger(x)) return String(x);
    // dạng phân số gần đúng nếu đẹp
    const s = String(x);
    return s;
  }

  // op string theo style PDF: d2 -> d2 - 2 d1, d1 <-> d2, d3 -> (1/2) d3
  function opSwap(i, j) { return `d_${i} \\leftrightarrow d_${j}`; }
  function opScale(i, k) { return `d_${i} \\to ${k}\\,d_${i}`; }
  function opAdd(i, a, j) {
    // di -> di + a*dj  (a có thể âm)
    const aClean = clean(a);
    if (aClean === 0) return "";
    const sign = (aClean >= 0) ? "+" : "-";
    const mag = Math.abs(aClean);
    const coef = (mag === 1) ? "" : fmtNum(mag);
    // d_i -> d_i - 2 d_j
    return `d_${i} \\to d_${i} ${sign} ${coef}${coef ? "" : ""}d_${j}`;
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
      // tìm pivot: hàng có |M[r][col]| lớn nhất từ row..m-1
      let piv = row;
      for (let r = row; r < m; r++) {
        if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
      }

      if (Math.abs(M[piv][col]) < 1e-10) continue;

      // swap nếu cần
      if (piv !== row) {
        const tmp = M[piv]; M[piv] = M[row]; M[row] = tmp;
        ops.push(opSwap(piv + 1, row + 1));
        matrices.push(deepCopy(M));
      }

      // (tuỳ chọn) chuẩn hoá pivot về 1 như nhiều bài PDF hay làm
      const pv = M[row][col];
      if (Math.abs(pv - 1) > 1e-10) {
        const k = clean(1 / pv);
        for (let c = col; c < n; c++) M[row][c] = clean(M[row][c] * k);
        // ghi đúng kiểu: d_row -> (1/pv) d_row
        const kStr = fmtNum(k);
        ops.push(opScale(row + 1, kStr.startsWith("-") ? `(${kStr})` : kStr));
        matrices.push(deepCopy(M));
      }

      // khử các hàng dưới
      for (let r = row + 1; r < m; r++) {
        const factor = clean(M[r][col]);
        if (Math.abs(factor) < 1e-10) continue;

        // r -> r - factor * row (vì pivot đã là 1)
        for (let c = col; c < n; c++) {
          M[r][c] = clean(M[r][c] - factor * M[row][c]);
        }

        const a = clean(-factor); // di -> di + a*dj ; ở đây a = -factor
        const op = opAdd(r + 1, a, row + 1);
        if (op) {
          ops.push(op);
          matrices.push(deepCopy(M));
        }
      }

      row++;
    }

    // trả về echelon + ops
    return { matrices, ops };
  };

})();
