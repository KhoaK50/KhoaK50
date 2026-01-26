(function () {
  window.App = window.App || {};

  /* * Hàm phân tích chuỗi vector "[1, 2^3, sqrt(4)]" thành mảng số [1, 8, 2]
   */
  App.parseVectorExpr = function (str) {
    if (!str) throw new Error("Chuỗi rỗng");
    
    // 1. Chuẩn hóa chuỗi (xóa khoảng trắng thừa, chữ thường)
    let s = str.trim().toLowerCase();

    // 2. Kiểm tra cú pháp cơ bản [ ... ]
    if (!s.startsWith("[") || !s.endsWith("]")) {
      throw new Error("Phải bắt đầu bằng '[' và kết thúc bằng ']'");
    }

    // Lấy nội dung bên trong
    let content = s.substring(1, s.length - 1).trim();
    if (!content) throw new Error("Vector rỗng");

    // 3. Tách các thành phần bằng dấu phẩy
    const parts = content.split(",");

    if (parts.length < 2) throw new Error("Cần ít nhất 2 tọa độ (x, y)");

    // 4. Hàm tính toán biểu thức an toàn
    const evaluate = (expr) => {
      // --- XỬ LÝ PHÉP MŨ (QUAN TRỌNG) ---
      // Thay thế '^' thành '**' để JS hiểu là lũy thừa
      expr = expr.replace(/\^/g, "**");

      // --- XỬ LÝ HÀM & HẰNG SỐ ---
      // Dùng Regex \b để thay thế chính xác từ khóa (tránh thay nhầm chữ trong biến khác)
      expr = expr.replace(/\bpi\b/g, "Math.PI");
      expr = expr.replace(/\be\b/g, "Math.E");
      
      expr = expr.replace(/\bsqrt\b/g, "Math.sqrt");
      expr = expr.replace(/\bsin\b/g, "Math.sin");
      expr = expr.replace(/\bcos\b/g, "Math.cos");
      expr = expr.replace(/\btan\b/g, "Math.tan");
      expr = expr.replace(/\babs\b/g, "Math.abs");
      expr = expr.replace(/\blog\b/g, "Math.log10");
      expr = expr.replace(/\bln\b/g, "Math.log");

      try {
        // Dùng Function constructor để eval an toàn hơn
        const func = new Function(`return (${expr})`);
        const val = func();
        
        // Kiểm tra kết quả
        if (typeof val !== "number" || isNaN(val) || !isFinite(val)) {
          throw new Error("Kết quả không xác định");
        }
        return val;
      } catch (err) {
        throw new Error("Biểu thức không hợp lệ");
      }
    };

    // 5. Duyệt qua từng tọa độ và tính toán
    const result = parts.map((p, index) => {
      try {
        if(!p.trim()) throw new Error("Rỗng");
        return evaluate(p);
      } catch (e) {
        throw new Error(`Tọa độ thứ ${index + 1} ("${p}") lỗi: ${e.message}`);
      }
    });

    return result;
  };

  // Hàm format hiển thị vector ngắn gọn (làm tròn 4 chữ số thập phân)
  App.formatVectorShort = function (vec) {
    if (!Array.isArray(vec)) return "[]";
    const niceNum = (n) => {
      // Làm tròn 4 số lẻ, nếu là số nguyên thì hiện số nguyên
      const r = Math.round(n * 10000) / 10000; 
      return r.toString();
    };
    return "[" + vec.map(niceNum).join(", ") + "]";
  };

  // Helper format số vô tỉ (tùy chọn dùng thêm)
  /*App.formatScalar = function(n) {
      if(n === undefined || n === null) return "—";
      if(Math.abs(n - Math.PI) < 1e-4) return "π";
      if(Math.abs(n) < 1e-9) return "0";
      return parseFloat(n.toFixed(4)).toString();
  };*/

})();