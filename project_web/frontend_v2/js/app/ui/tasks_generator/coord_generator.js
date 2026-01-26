// ===================== js/app/ui/tasks_generator/coord_generator.js =====================
(function () {
  window.App = window.App || {};
  App.TasksGen = App.TasksGen || {};
  App.TasksGen.Coord = {}; // Namespace riêng cho bài Tọa độ

  // --- CÁC HÀM BỔ TRỢ FORMAT ---
  function fmt(x) {
    if (typeof App.formatScalar === "function") return App.formatScalar(x);
    // Fallback nếu không có hàm format chung
    const s = String(Math.round(x * 10000) / 10000);
    return s.replace("-", "−"); 
  }

  function vecToColLatex(v) {
    // Vector cột (dùng cho công thức P)
    return `\\begin{pmatrix} ${v.map(fmt).join(" \\\\ ")} \\end{pmatrix}`;
  }

  function matToLatex(rows) {
    const content = rows.map(r => r.map(fmt).join(" & ")).join(" \\\\ ");
    return `\\begin{pmatrix} ${content} \\end{pmatrix}`;
  }

  function augMatToLatex(rows) {
    // Ma trận mở rộng [P|x]
    if (!rows || !rows.length) return "";
    const n = rows[0].length; 
    const colStr = "c".repeat(n-1) + "|" + "c"; // Định dạng cột: ccc|c
    const content = rows.map(r => {
        const last = r[n-1];
        const rest = r.slice(0, n-1);
        return rest.map(fmt).join(" & ") + " & " + fmt(last);
    }).join(" \\\\ ");
    return `\\left(\\begin{array}{${colStr}} ${content} \\end{array}\\right)`;
  }

  // --- CÁCH 1: LẬP HỆ PHƯƠNG TRÌNH TRỰC TIẾP ---
  App.TasksGen.Coord.buildMethod1 = function(basisVecs, targetVec) {
    const n = basisVecs[0].length; // Số chiều (số dòng)
    const m = basisVecs.length;    // Số vector cơ sở (số ẩn)
    
    let html = `<div class="sol-step-container">`;
    
    // 1. Đề bài
    html += `<div class="sol-text">Trong không gian $\\mathbb{R}^{${n}}$, cho cơ sở $B = \\{u_1, ..., u_${m}\\}$ với:</div>`;
    const defs = basisVecs.map((v, i) => `u_{${i+1}} = ${vecToColLatex(v)}`).join(",\\; ");
    html += `<div class="sol-math-block">\\[ ${defs} \\]</div>`;
    html += `<div class="sol-text">Tìm tọa độ của vector $\\mathbf{x} = ${vecToColLatex(targetVec)}$ đối với cơ sở $B$.</div>`;

    // 2. Phương trình vector
    html += `<div class="sol-bold">Bước 1: Lập phương trình vector</div>`;
    html += `<div class="sol-text">Ta cần tìm các số $c_1, ..., c_${m}$ sao cho:</div>`;
    const linComb = basisVecs.map((v, i) => `c_{${i+1}} u_{${i+1}}`).join(" + ");
    html += `<div class="sol-math-block">\\[ ${linComb} = \\mathbf{x} \\]</div>`;

    // 3. Hệ phương trình
    html += `<div class="sol-text">Hệ phương trình tương đương:</div>`;
    let sysLines = [];
    for(let i=0; i<n; i++) {
        // Tạo dòng phương trình: 1c1 + 0c2 + ... = x_i
        let lhs = basisVecs.map((v, j) => {
            let val = v[i];
            if(Math.abs(val) < 1e-9) return null; // Hệ số 0 thì bỏ qua
            
            let valStr = fmt(Math.abs(val));
            if(Math.abs(val - 1) < 1e-9) valStr = ""; // Hệ số 1 thì ẩn số
            
            let sign = (val < 0) ? "-" : (j > 0 ? "+" : ""); // Dấu
            // Xử lý trường hợp đầu dòng không cần dấu +
            if (j===0 && val > 0) sign = "";
            
            // Fix dấu cách cho đẹp: "+ 2c_2"
            if (sign === "+") sign = "+ ";
            if (sign === "-") sign = "- ";

            return `${sign}${valStr}c_{${j+1}}`;
        }).filter(x => x !== null).join(" ");
        
        if(!lhs.trim()) lhs = "0";
        sysLines.push(`${lhs} = ${fmt(targetVec[i])}`);
    }
    html += `<div class="sol-math-block">\\[ \\begin{cases} ${sysLines.join(" \\\\ ")} \\end{cases} \\]</div>`;

    // 4. Giải hệ (Tính ngầm bằng Gauss)
    let matrix = [];
    for(let i=0; i<n; i++) {
        let row = basisVecs.map(v => v[i]);
        row.push(targetVec[i]);
        matrix.push(row);
    }
    // Dùng hàm khử Gauss có sẵn trong hệ thống
    const res = App.gaussElimWithOps ? App.gaussElimWithOps(matrix) : { matrices: [matrix] };
    const finalM = res.matrices[res.matrices.length - 1];
    
    // Trích xuất nghiệm (cột cuối cùng)
    let coords = [];
    for(let i=0; i<m; i++) coords.push(finalM[i][m]);

    html += `<div class="sol-bold">Bước 2: Giải hệ phương trình</div>`;
    const solStr = coords.map((c, i) => `c_{${i+1}} = ${fmt(c)}`).join(",\\; ");
    html += `<div class="sol-text">Giải hệ ta thu được: $${solStr}$.</div>`;

    // 5. Kết luận
    html += `<div class="sol-bold">Kết luận:</div>`;
    html += `<div class="sol-text">Tọa độ của $\\mathbf{x}$ đối với cơ sở $B$ là:</div>`;
    html += `<div class="sol-math-block">\\[ [\\mathbf{x}]_B = ${vecToColLatex(coords)} \\]</div>`;
    html += `</div>`;

    return html;
  };

  // --- CÁCH 2: MA TRẬN CHUYỂN CƠ SỞ ---
  App.TasksGen.Coord.buildMethod2 = function(basisVecs, targetVec) {
    const m = basisVecs.length;
    const n = basisVecs[0].length;
    let html = `<div class="sol-step-container">`;

    // 1. Ma trận P
    html += `<div class="sol-bold">Bước 1: Lập ma trận chuyển cơ sở P</div>`;
    html += `<div class="sol-text">Gọi $P$ là ma trận có các cột là các vector của cơ sở $B$:</div>`;
    
    let matP = [];
    for(let i=0; i<n; i++) {
        let row = basisVecs.map(v => v[i]); // Lấy dòng i của từng vector ghép lại
        matP.push(row);
    }
    html += `<div class="sol-math-block">\\[ P = ${matToLatex(matP)} \\]</div>`;

    // 2. Khử Gauss
    html += `<div class="sol-text">Công thức tìm tọa độ là: $[\\mathbf{x}]_B = P^{-1}\\mathbf{x}$.</div>`;
    html += `<div class="sol-text">Ta thực hiện biến đổi ma trận $[P|\\mathbf{x}]$ về dạng $[I|[\\mathbf{x}]_B]$ bằng khử Gauss-Jordan:</div>`;

    let augMat = [];
    for(let i=0; i<n; i++) {
        let row = [...matP[i]];
        row.push(targetVec[i]);
        augMat.push(row);
    }

    // Gọi hàm tính toán
    const res = App.gaussElimWithOps ? App.gaussElimWithOps(augMat) : { matrices: [augMat], ops: [] };
    const steps = res.ops || [];
    const matrices = res.matrices || [augMat];

    // Hiện ma trận đầu tiên
    html += `<div class="sol-math-block">\\[ ${augMatToLatex(augMat)} \\]</div>`;

    html += `<div class="sol-bold">Các bước biến đổi:</div>`;
    for(let i=0; i<steps.length; i++) {
        let opText = steps[i]; 
        // Format lại text biến đổi hàng cho đẹp (nếu cần)
        html += `<div class="sol-text" style="margin-top:12px">${i+1}. $${opText}$:</div>`;
        html += `<div class="sol-math-block">\\[ ${augMatToLatex(matrices[i+1])} \\]</div>`;
    }

    // 3. Kết luận
    const finalM = matrices[matrices.length - 1];
    let coords = [];
    for(let i=0; i<m; i++) coords.push(finalM[i][m]);

    html += `<div class="sol-bold">Kết luận:</div>`;
    html += `<div class="sol-text">Kết quả thu được tọa độ là:</div>`;
    html += `<div class="sol-math-block">\\[ [\\mathbf{x}]_B = ${vecToColLatex(coords)} \\]</div>`;
    html += `<div class="sol-text">(Khớp với Cách 1)</div>`;
    html += `</div>`;

    return html;
  };

})();