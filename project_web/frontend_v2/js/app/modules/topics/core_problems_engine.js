// =========================================================================
// core_problems_engine.js - Xử lý tính toán và sư phạm cho 14 Bài toán Cốt lõi
// Bổ sung các bài toán: Tích vô hướng/Góc, Phép toán ma trận, Ma trận nghịch đảo, Hệ PTTT
// =========================================================================
(function () {
  window.App = window.App || {};

  // Hàm hiển thị KaTeX an toàn
  function renderLatex(elementId, latexStr) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.style.display = "block";
    if (window.katex && typeof window.katex.render === "function") {
      try {
        window.katex.render(latexStr, el, { displayMode: true, throwOnError: false });
        return;
      } catch (err) {
        // Fallback
      }
    }
    el.innerHTML = "\\[ " + latexStr + " \\]";
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      window.MathJax.typesetPromise([el]).catch(() => {});
    }
  }

  // Tiện ích làm tròn phân số tối giản
  function toFraction(val, eps = 1e-6) {
    if (Math.abs(val - Math.round(val)) < eps) return `${Math.round(val)}`;
    for (let d = 2; d <= 24; d++) {
      const n = Math.round(val * d);
      if (Math.abs(val - n / d) < eps) {
        return `\\frac{${n}}{${d}}`;
      }
    }
    return val.toFixed(2);
  }

  // =========================================================================
  // BÀI 2: TÍCH VÔ HƯỚNG, ĐỘ DÀI VÀ GÓC
  // =========================================================================
  function initDotProduct() {
    const u1Inp = document.getElementById("dot_u1");
    const u2Inp = document.getElementById("dot_u2");
    const v1Inp = document.getElementById("dot_v1");
    const v2Inp = document.getElementById("dot_v2");
    const btnCompute = document.getElementById("btnDotCompute");
    const btnSolution = document.getElementById("btnDotSolution");

    if (!btnCompute) return;

    // Presets
    const pOrtho = document.getElementById("presetDotOrtho");
    const pSame = document.getElementById("presetDotSame");
    const pOpp = document.getElementById("presetDotOpp");
    const pAcute = document.getElementById("presetDotAcute");

    function setVectors(u, v, activeBtn) {
      if (u1Inp) u1Inp.value = u[0];
      if (u2Inp) u2Inp.value = u[1];
      if (v1Inp) v1Inp.value = v[0];
      if (v2Inp) v2Inp.value = v[1];
      [pOrtho, pSame, pOpp, pAcute].forEach(b => b?.classList.remove("active"));
      if (activeBtn) activeBtn.classList.add("active");
      computeDot();
    }

    if (pOrtho) pOrtho.onclick = () => setVectors([2, 0], [0, 3], pOrtho);
    if (pSame) pSame.onclick = () => setVectors([1, 2], [2, 4], pSame);
    if (pOpp) pOpp.onclick = () => setVectors([2, 1], [-2, -1], pOpp);
    if (pAcute) pAcute.onclick = () => setVectors([3, 1], [1, 2], pAcute);

    function computeDot() {
      const u1 = parseFloat(u1Inp?.value) || 0;
      const u2 = parseFloat(u2Inp?.value) || 0;
      const v1 = parseFloat(v1Inp?.value) || 0;
      const v2 = parseFloat(v2Inp?.value) || 0;

      const dot = u1 * v1 + u2 * v2;
      const normU2 = u1 * u1 + u2 * u2;
      const normV2 = v1 * v1 + v2 * v2;
      const normU = Math.sqrt(normU2);
      const normV = Math.sqrt(normV2);

      let cosTheta = 0;
      let angleDeg = 0;
      let angleRad = 0;

      if (normU > 1e-9 && normV > 1e-9) {
        cosTheta = Math.max(-1, Math.min(1, dot / (normU * normV)));
        angleRad = Math.acos(cosTheta);
        angleDeg = (angleRad * 180) / Math.PI;
      }

      let conclusion = "";
      if (Math.abs(dot) < 1e-7) {
        conclusion = "\\vec{u} \\perp \\vec{v} \\quad (\\text{Hai vector trực giao vuông góc})";
      } else if (Math.abs(cosTheta - 1) < 1e-7) {
        conclusion = "\\vec{u} \\uparrow\\uparrow \\vec{v} \\quad (\\text{Hai vector cùng hướng})";
      } else if (Math.abs(cosTheta + 1) < 1e-7) {
        conclusion = "\\vec{u} \\uparrow\\downarrow \\vec{v} \\quad (\\text{Hai vector ngược hướng})";
      } else {
        conclusion = "\\theta \\approx " + angleDeg.toFixed(1) + "^\\circ";
      }

      const latexStr = `\\begin{aligned}
\\vec{u} &= (${u1}, ${u2}), \\quad \\vec{v} = (${v1}, ${v2}) \\\\[4pt]
\\vec{u} \\cdot \\vec{v} &= (${u1})(${v1}) + (${u2})(${v2}) = ${dot} \\\\[4pt]
\\|\\vec{u}\\| &= \\sqrt{${u1}^2 + ${u2}^2} = ${toFraction(normU)}, \\quad \\|\\vec{v}\\| = \\sqrt{${v1}^2 + ${v2}^2} = ${toFraction(normV)} \\\\[4pt]
\\cos(\\theta) &= \\frac{\\vec{u} \\cdot \\vec{v}}{\\|\\vec{u}\\| \\|\\vec{v}\\|} = ${toFraction(cosTheta)} \\\\[4pt]
\\theta &= ${angleDeg.toFixed(2)}^\\circ \\; (${(angleRad).toFixed(3)} \\text{ rad}) \\\\[4pt]
\\text{Kết luận}: &\\quad ${conclusion}
\\end{aligned}`;

      renderLatex("result_dot_info", latexStr);

      // Kích hoạt vẽ 2D trên Canvas nếu có
      if (window.Vec2D && typeof window.Vec2D.draw2DAllVectors === "function") {
        App.custom2DDrawHook = function (ctx, gridInfo) {
          const cx = gridInfo.originPx.x;
          const cy = gridInfo.originPx.y;
          const px = gridInfo.pixelsPerUnit;

          // Vẽ vector u
          ctx.save();
          ctx.strokeStyle = "#3b82f6";
          ctx.fillStyle = "#3b82f6";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + u1 * px, cy - u2 * px);
          ctx.stroke();

          // Vẽ vector v
          ctx.strokeStyle = "#10b981";
          ctx.fillStyle = "#10b981";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + v1 * px, cy - v2 * px);
          ctx.stroke();

          // Vẽ góc kẹp giữa
          if (normU > 0.1 && normV > 0.1) {
            const startAng = -Math.atan2(u2, u1);
            const endAng = -Math.atan2(v2, v1);
            ctx.strokeStyle = "rgba(245, 158, 11, 0.85)";
            ctx.fillStyle = "rgba(245, 158, 11, 0.15)";
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, 32, startAng, endAng, endAng < startAng);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          ctx.restore();
        };
        Vec2D.draw2DAllVectors();
      }
    }

    btnCompute.onclick = computeDot;
    if (btnSolution) {
      btnSolution.onclick = function () {
        computeDot();
        const resBox = document.getElementById("result_dot_info");
        if (resBox) resBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      };
    }
  }

  // =========================================================================
  // BÀI 3: CÁC PHÉP TOÁN MA TRẬN
  // =========================================================================
  function initMatrixAlgebra() {
    const opSelect = document.getElementById("mat_alg_op");
    const btnCompute = document.getElementById("btnMatAlgCompute");
    const btnSolution = document.getElementById("btnMatAlgSolution");

    if (!btnCompute) return;

    function getMatA() {
      return [
        [parseFloat(document.getElementById("alg_a11")?.value) || 0, parseFloat(document.getElementById("alg_a12")?.value) || 0],
        [parseFloat(document.getElementById("alg_a21")?.value) || 0, parseFloat(document.getElementById("alg_a22")?.value) || 0]
      ];
    }

    function getMatB() {
      return [
        [parseFloat(document.getElementById("alg_b11")?.value) || 0, parseFloat(document.getElementById("alg_b12")?.value) || 0],
        [parseFloat(document.getElementById("alg_b21")?.value) || 0, parseFloat(document.getElementById("alg_b22")?.value) || 0]
      ];
    }

    function computeAlgebra() {
      const op = opSelect?.value || "mul";
      const A = getMatA();
      const B = getMatB();
      let latex = "";

      if (op === "mul") {
        const c11 = A[0][0] * B[0][0] + A[0][1] * B[1][0];
        const c12 = A[0][0] * B[0][1] + A[0][1] * B[1][1];
        const c21 = A[1][0] * B[0][0] + A[1][1] * B[1][0];
        const c22 = A[1][0] * B[0][1] + A[1][1] * B[1][1];

        latex = `\\begin{aligned}
A \\cdot B &= \\begin{pmatrix} ${A[0][0]} & ${A[0][1]} \\\\ ${A[1][0]} & ${A[1][1]} \\end{pmatrix} \\begin{pmatrix} ${B[0][0]} & ${B[0][1]} \\\\ ${B[1][0]} & ${B[1][1]} \\end{pmatrix} \\\\[6pt]
&= \\begin{pmatrix} (${A[0][0]})(${B[0][0]}) + (${A[0][1]})(${B[1][0]}) & (${A[0][0]})(${B[0][1]}) + (${A[0][1]})(${B[1][1]}) \\\\ (${A[1][0]})(${B[0][0]}) + (${A[1][1]})(${B[1][0]}) & (${A[1][0]})(${B[0][1]}) + (${A[1][1]})(${B[1][1]}) \\end{pmatrix} \\\\[6pt]
&= \\begin{pmatrix} ${toFraction(c11)} & ${toFraction(c12)} \\\\ ${toFraction(c21)} & ${toFraction(c22)} \\end{pmatrix}
\\end{aligned}`;
      } else if (op === "add") {
        latex = `A + B = \\begin{pmatrix} ${toFraction(A[0][0] + B[0][0])} & ${toFraction(A[0][1] + B[0][1])} \\\\ ${toFraction(A[1][0] + B[1][0])} & ${toFraction(A[1][1] + B[1][1])} \\end{pmatrix}`;
      } else if (op === "sub") {
        latex = `A - B = \\begin{pmatrix} ${toFraction(A[0][0] - B[0][0])} & ${toFraction(A[0][1] - B[0][1])} \\\\ ${toFraction(A[1][0] - B[1][0])} & ${toFraction(A[1][1] - B[1][1])} \\end{pmatrix}`;
      } else if (op === "transpose") {
        latex = `A^T = \\begin{pmatrix} ${A[0][0]} & ${A[1][0]} \\\\ ${A[0][1]} & ${A[1][1]} \\end{pmatrix}, \\quad B^T = \\begin{pmatrix} ${B[0][0]} & ${B[1][0]} \\\\ ${B[0][1]} & ${B[1][1]} \\end{pmatrix}`;
      } else if (op === "pow2") {
        const c11 = A[0][0] * A[0][0] + A[0][1] * A[1][0];
        const c12 = A[0][0] * A[0][1] + A[0][1] * A[1][1];
        const c21 = A[1][0] * A[0][0] + A[1][1] * A[1][0];
        const c22 = A[1][0] * A[0][1] + A[1][1] * A[1][1];
        latex = `A^2 = A \\cdot A = \\begin{pmatrix} ${toFraction(c11)} & ${toFraction(c12)} \\\\ ${toFraction(c21)} & ${toFraction(c22)} \\end{pmatrix}`;
      }

      renderLatex("result_mat_alg_info", latex);
    }

    btnCompute.onclick = computeAlgebra;
    if (btnSolution) btnSolution.onclick = computeAlgebra;
    if (opSelect) {
      opSelect.onchange = function () {
        const blockB = document.getElementById("mat_alg_block_b");
        if (blockB) {
          blockB.style.display = (this.value === "transpose" || this.value === "pow2") ? "none" : "block";
        }
        computeAlgebra();
      };
    }
  }

  // =========================================================================
  // BÀI 5: MA TRẬN NGHỊCH ĐẢO
  // =========================================================================
  function initMatrixInverse() {
    const btnCompute = document.getElementById("btnMatInvCompute");
    const btnSolution = document.getElementById("btnMatInvSolution");
    if (!btnCompute) return;

    function computeInverse() {
      const a = parseFloat(document.getElementById("inv_a11")?.value) || 0;
      const b = parseFloat(document.getElementById("inv_a12")?.value) || 0;
      const c = parseFloat(document.getElementById("inv_a21")?.value) || 0;
      const d = parseFloat(document.getElementById("inv_a22")?.value) || 0;

      const det = a * d - b * c;
      let latex = "";

      if (Math.abs(det) < 1e-9) {
        latex = `\\begin{aligned}
\\det(A) &= (${a})(${d}) - (${b})(${c}) = 0 \\\\[4pt]
&\\implies \\text{Ma trận } A \\text{ suy biến (không khả nghịch), không tồn tại } A^{-1}.
\\end{aligned}`;
      } else {
        const invA11 = d / det;
        const invA12 = -b / det;
        const invA21 = -c / det;
        const invA22 = a / det;

        latex = `\\begin{aligned}
\\det(A) &= (${a})(${d}) - (${b})(${c}) = ${toFraction(det)} \\neq 0 \\implies A \\text{ khả nghịch.} \\\\[6pt]
A^{-1} &= \\frac{1}{\\det(A)} \\operatorname{adj}(A) = \\frac{1}{${toFraction(det)}} \\begin{pmatrix} ${d} & ${-b} \\\\ ${-c} & ${a} \\end{pmatrix} \\\\[6pt]
&= \\begin{pmatrix} ${toFraction(invA11)} & ${toFraction(invA12)} \\\\ ${toFraction(invA21)} & ${toFraction(invA22)} \\end{pmatrix} \\\\[6pt]
\\text{Kiểm chứng}: &\\quad A \\cdot A^{-1} = \\begin{pmatrix} 1 & 0 \\\\ 0 & 1 \\end{pmatrix} = I_2
\\end{aligned}`;
      }

      renderLatex("result_mat_inv_info", latex);
    }

    btnCompute.onclick = computeInverse;
    if (btnSolution) btnSolution.onclick = computeInverse;
  }

  // =========================================================================
  // BÀI 6: GIẢI VÀ BIỆN LUẬN HỆ PHƯƠNG TRÌNH TUYẾN TÍNH
  // =========================================================================
  function initLinearSystem() {
    const btnCompute = document.getElementById("btnLinSysCompute");
    const btnSolution = document.getElementById("btnLinSysSolution");
    if (!btnCompute) return;

    function computeSystem() {
      const a1 = parseFloat(document.getElementById("sys_a11")?.value) || 0;
      const b1 = parseFloat(document.getElementById("sys_a12")?.value) || 0;
      const c1 = parseFloat(document.getElementById("sys_b1")?.value) || 0;

      const a2 = parseFloat(document.getElementById("sys_a21")?.value) || 0;
      const b2 = parseFloat(document.getElementById("sys_a22")?.value) || 0;
      const c2 = parseFloat(document.getElementById("sys_b2")?.value) || 0;

      const D = a1 * b2 - a2 * b1;
      const Dx = c1 * b2 - c2 * b1;
      const Dy = a1 * c2 - a2 * c1;

      let latex = `\\begin{aligned}
\\text{Hệ phương trình}: &\\quad \\begin{cases} ${a1}x_1 + ${b1}x_2 = ${c1} \\\\ ${a2}x_1 + ${b2}x_2 = ${c2} \\end{cases} \\\\[6pt]
\\text{Ma trận bổ sung}: &\\quad [A \\mid b] = \\begin{pmatrix} ${a1} & ${b1} & \\bigm| & ${c1} \\\\ ${a2} & ${b2} & \\bigm| & ${c2} \\end{pmatrix} \\\\[6pt]
D &= ${a1} \\cdot (${b2}) - (${a2}) \\cdot (${b1}) = ${toFraction(D)}
`;

      if (Math.abs(D) > 1e-9) {
        const x1 = Dx / D;
        const x2 = Dy / D;
        latex += ` \\neq 0 \\\\[4pt]
D_{x_1} &= (${c1})(${b2}) - (${c2})(${b1}) = ${toFraction(Dx)} \\\\[4pt]
D_{x_2} &= (${a1})(${c2}) - (${a2})(${c1}) = ${toFraction(Dy)} \\\\[6pt]
\\implies \\text{Hệ có nghiệm duy nhất}: &\\quad \\begin{cases} x_1 = \\frac{D_{x_1}}{D} = ${toFraction(x1)} \\\\[4pt] x_2 = \\frac{D_{x_2}}{D} = ${toFraction(x2)} \\end{cases}
\\end{aligned}`;
      } else {
        if (Math.abs(Dx) < 1e-9 && Math.abs(Dy) < 1e-9) {
          latex += ` = 0, \\quad D_{x_1} = 0, \\quad D_{x_2} = 0 \\\\[6pt]
\\implies &\\quad \\mathrm{rank}(A) = \\mathrm{rank}([A \\mid b]) = 1 < 2 \\\\[4pt]
&\\quad \\text{Hệ có vô số nghiệm phụ thuộc vào 1 tham số tự do } t \\in \\mathbb{R}.
\\end{aligned}`;
        } else {
          latex += ` = 0, \\quad (D_{x_1} \\neq 0 \\lor D_{x_2} \\neq 0) \\\\[6pt]
\\implies &\\quad \\mathrm{rank}(A) = 1 < \\mathrm{rank}([A \\mid b]) = 2 \\\\[4pt]
&\\quad \\text{Theo định lý Kronecker - Capelli, hệ phương trình vô nghiệm.}
\\end{aligned}`;
        }
      }

      renderLatex("result_linsys_info", latex);
    }

    btnCompute.onclick = computeSystem;
    if (btnSolution) btnSolution.onclick = computeSystem;
  }

  // Khởi động khi DOM sẵn sàng
  document.addEventListener("DOMContentLoaded", function () {
    initDotProduct();
    initMatrixAlgebra();
    initMatrixInverse();
    initLinearSystem();
  });

  App.initCoreProblemsEngine = function () {
    initDotProduct();
    initMatrixAlgebra();
    initMatrixInverse();
    initLinearSystem();
  };
})();
