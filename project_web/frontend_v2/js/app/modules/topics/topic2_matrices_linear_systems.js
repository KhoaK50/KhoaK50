// =========================================================================
// topic2_matrices_linear_systems.js - Module Chủ Đề 2: Ma Trận & Hệ PTTT
// Khảo sát ma trận tham số m, định thức det(A) và biến dạng không gian
// =========================================================================
(function () {
  window.App = window.App || {};

  let matState = {
    a11Expr: "1",
    a12Expr: "m",
    a21Expr: "m",
    a22Expr: "1",
    m: 0.5,
    mMin: -3.0,
    mMax: 3.0,
    isPlaying: false,
    animDirection: 1,
    animSpeed: 0.03,
    showParallelogram: true,
    showBasis: true
  };

  App.activeParamMatrixState = null;

  // Đánh giá biểu thức toán học an toàn theo biến m
  function evaluateExpr(exprStr, mVal) {
    try {
      const sanitized = exprStr
        .replace(/\^/g, "**")
        .replace(/sin/g, "Math.sin")
        .replace(/cos/g, "Math.cos")
        .replace(/tan/g, "Math.tan")
        .replace(/sqrt/g, "Math.sqrt")
        .replace(/abs/g, "Math.abs")
        .replace(/pi/gi, "Math.PI");

      const fn = new Function("m", "return " + sanitized + ";");
      const res = Number(fn(mVal));
      return isNaN(res) ? 0 : res;
    } catch (err) {
      return 0;
    }
  }

  // Hook vẽ đồ họa 2D trên Canvas
  function drawParamMatrixOnCanvas2D(ctx, gridInfo, logicalSize) {
    if (!matState) return;

    const cx = gridInfo.originPx.x;
    const cy = gridInfo.originPx.y;
    const px = gridInfo.pixelsPerUnit;

    const wX = (x) => cx + x * px;
    const wY = (y) => cy - y * px;

    // Tính các phần tử ma trận tại m hiện tại
    const a11 = evaluateExpr(matState.a11Expr, matState.m);
    const a12 = evaluateExpr(matState.a12Expr, matState.m);
    const a21 = evaluateExpr(matState.a21Expr, matState.m);
    const a22 = evaluateExpr(matState.a22Expr, matState.m);

    // Vector cột 1: A*e1 = [a11, a21]
    // Vector cột 2: A*e2 = [a12, a22]
    const v1 = [a11, a21];
    const v2 = [a12, a22];
    const det = a11 * a22 - a12 * a21;

    ctx.save();

    // 1. Vẽ hình bình hành biến dạng của không gian cơ sở
    if (matState.showParallelogram) {
      const p0 = { x: cx, y: cy };
      const p1 = { x: wX(v1[0]), y: wY(v1[1]) };
      const p2 = { x: wX(v1[0] + v2[0]), y: wY(v1[1] + v2[1]) };
      const p3 = { x: wX(v2[0]), y: wY(v2[1]) };

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();

      if (Math.abs(det) < 0.03) {
        // Không gian xẹp thành đường thẳng (det = 0)
        ctx.strokeStyle = "rgba(239, 68, 68, 0.95)";
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.font = "700 12px system-ui, sans-serif";
        ctx.fillStyle = "#ef4444";
        ctx.fillText("Không gian xẹp - det A = 0", p1.x + 10, p1.y - 10);
      } else if (det > 0) {
        // Thuận chiều không gian (det > 0)
        ctx.fillStyle = "rgba(0, 144, 255, 0.18)";
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 144, 255, 0.6)";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
      } else {
        // Đảo chiều không gian (det < 0)
        ctx.fillStyle = "rgba(245, 158, 11, 0.2)";
        ctx.fill();
        ctx.strokeStyle = "rgba(245, 158, 11, 0.75)";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
      }
    }

    // 2. Vẽ 2 vector cột cơ sở ảnh A*e1 và A*e2
    if (matState.showBasis) {
      const headLen = 11;

      // Vector 1 (A e1) - Màu xanh lam
      const tip1X = wX(v1[0]);
      const tip1Y = wY(v1[1]);
      ctx.beginPath();
      ctx.setLineDash([]);
      ctx.strokeStyle = "#0090ff";
      ctx.lineWidth = 3.0;
      ctx.moveTo(cx, cy);
      ctx.lineTo(tip1X, tip1Y);
      ctx.stroke();

      const ang1 = Math.atan2(cy - tip1Y, tip1X - cx);
      ctx.beginPath();
      ctx.fillStyle = "#0090ff";
      ctx.moveTo(tip1X, tip1Y);
      ctx.lineTo(
        tip1X - headLen * Math.cos(ang1 - Math.PI / 6),
        tip1Y + headLen * Math.sin(ang1 - Math.PI / 6)
      );
      ctx.lineTo(
        tip1X - headLen * Math.cos(ang1 + Math.PI / 6),
        tip1Y + headLen * Math.sin(ang1 + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      ctx.font = "600 11.5px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#0090ff";
      ctx.fillText("A e₁ = [" + v1[0].toFixed(2) + ", " + v1[1].toFixed(2) + "]", tip1X + 8, tip1Y - 4);

      // Vector 2 (A e2) - Màu cam hổ phách
      const tip2X = wX(v2[0]);
      const tip2Y = wY(v2[1]);
      ctx.beginPath();
      ctx.setLineDash([]);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 3.0;
      ctx.moveTo(cx, cy);
      ctx.lineTo(tip2X, tip2Y);
      ctx.stroke();

      const ang2 = Math.atan2(cy - tip2Y, tip2X - cx);
      ctx.beginPath();
      ctx.fillStyle = "#f59e0b";
      ctx.moveTo(tip2X, tip2Y);
      ctx.lineTo(
        tip2X - headLen * Math.cos(ang2 - Math.PI / 6),
        tip2Y + headLen * Math.sin(ang2 - Math.PI / 6)
      );
      ctx.lineTo(
        tip2X - headLen * Math.cos(ang2 + Math.PI / 6),
        tip2Y + headLen * Math.sin(ang2 + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      ctx.font = "600 11.5px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#f59e0b";
      ctx.fillText("A e₂ = [" + v2[0].toFixed(2) + ", " + v2[1].toFixed(2) + "]", tip2X + 8, tip2Y + 16);
    }

    ctx.restore();
  }

  // Vòng lặp chuyển động quét tham số m
  function animationTick() {
    if (!matState.isPlaying) return;

    matState.m += matState.animDirection * matState.animSpeed;

    if (matState.m >= matState.mMax) {
      matState.m = matState.mMax;
      matState.animDirection = -1;
    } else if (matState.m <= matState.mMin) {
      matState.m = matState.mMin;
      matState.animDirection = 1;
    }

    const slider = document.getElementById("mat_m_slider");
    const valText = document.getElementById("mat_m_val");
    if (slider) slider.value = matState.m;
    if (valText) valText.textContent = "m = " + matState.m.toFixed(2);

    updateReadout();

    if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
      Vec2D.draw2DAllVectors();
    }

    requestAnimationFrame(animationTick);
  }

  // Cập nhật bảng thông tin
  function updateReadout() {
    const a11 = evaluateExpr(matState.a11Expr, matState.m);
    const a12 = evaluateExpr(matState.a12Expr, matState.m);
    const a21 = evaluateExpr(matState.a21Expr, matState.m);
    const a22 = evaluateExpr(matState.a22Expr, matState.m);
    const det = a11 * a22 - a12 * a21;
    const rank = Math.abs(det) < 0.03 ? 1 : 2;

    const resEl = document.getElementById("result_mat_m_info");
    if (resEl) {
      let statusColor = "var(--primary-base)";
      let statusDesc = "Định thức dương, bảo toàn hướng không gian";
      if (Math.abs(det) < 0.03) {
        statusColor = "#ef4444";
        statusDesc = "Ma trận suy biến, không gian bị xẹp dẹp 2D về 1D";
      } else if (det < 0) {
        statusColor = "var(--amber, #f59e0b)";
        statusDesc = "Định thức âm, đảo ngược chiều định hướng không gian";
      }

      resEl.innerHTML = `
        <div style="font-weight:700; color:${statusColor}; margin-bottom:4px;">
          det A = ${det.toFixed(3)} - Hạng ma trận: ${rank}
        </div>
        <div style="font-size:12px; color:var(--fg); margin-bottom:2px;">
          ${statusDesc}
        </div>
        <div style="font-size:11px; color:var(--muted);">
          Diện tích hình bình hành cơ sở: ${Math.abs(det).toFixed(3)} đơn vị diện tích
        </div>
      `;
      resEl.style.display = "block";
    }
  }

  // Sinh lời giải LaTeX chi tiết cho Solution Panel
  function generateMatrixSolution() {
    const a11 = evaluateExpr(matState.a11Expr, matState.m);
    const a12 = evaluateExpr(matState.a12Expr, matState.m);
    const a21 = evaluateExpr(matState.a21Expr, matState.m);
    const a22 = evaluateExpr(matState.a22Expr, matState.m);
    const det = a11 * a22 - a12 * a21;

    let html = `
      <div style="padding: 18px 22px; font-family: 'STIX Two Text', serif; font-size: 15px; line-height: 1.7; color: var(--text-main);">
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 12px; color: var(--primary-base); border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px;">
          Khảo Sát Định Thức Ma Trận Tham Số m & Không Gian Nghiệm
        </h3>

        <p><strong>1. Ma trận tham số:</strong></p>
        <p>Xét ma trận vuông cấp 2 phụ thuộc tham số thực \\( m \\in [${matState.mMin}, ${matState.mMax}] \\):</p>
        <div style="text-align: center; margin: 10px 0;">
          \\[ A(m) = \\begin{bmatrix} a_{11} & a_{12} \\\\ a_{21} & a_{22} \\end{bmatrix} = \\begin{bmatrix} ${matState.a11Expr} & ${matState.a12Expr} \\\\ ${matState.a21Expr} & ${matState.a22Expr} \\end{bmatrix} \\]
        </div>

        <p><strong>2. Công thức định thức tổng quát:</strong></p>
        <p>Định thức của ma trận \\( A(m) \\) được xác định bởi tích đường chéo chính trừ tích đường chéo phụ:</p>
        <div style="text-align: center; margin: 10px 0;">
          \\[ \\det(A(m)) = a_{11} a_{22} - a_{12} a_{21} = (${matState.a11Expr})(${matState.a22Expr}) - (${matState.a12Expr})(${matState.a21Expr}) \\]
        </div>

        <p><strong>3. Giá trị tức thời tại \\( m = ${matState.m.toFixed(2)} \\):</strong></p>
        <div style="text-align: center; margin: 10px 0;">
          \\[ A(${matState.m.toFixed(2)}) = \\begin{bmatrix} ${a11.toFixed(2)} & ${a12.toFixed(2)} \\\\ ${a21.toFixed(2)} & ${a22.toFixed(2)} \\end{bmatrix} \\implies \\det(A) = ${det.toFixed(3)} \\]
        </div>

        <p><strong>4. Biện luận hình học và hạng ma trận:</strong></p>
        <ul>
          <li><strong>Trường hợp \\( \\det(A) \\neq 0 \\):</strong> Hạng \\( r(A) = 2 \\). Ma trận \\( A \\) khả nghịch, hệ phương trình \\( A \\mathbf{x} = \\mathbf{b} \\) có nghiệm duy nhất với mọi \\( \\mathbf{b} \\). Ánh xạ tuyến tính co giãn diện tích theo tỉ số \\( |\\det(A)| \\).</li>
          <li><strong>Trường hợp \\( \\det(A) = 0 \\):</strong> Hạng \\( r(A) < 2 \\). Ma trận suy biến, các vector cột phụ thuộc tuyến tính, làm không gian 2D bị xẹp về 1 chiều. Hệ thuần nhất \\( A \\mathbf{x} = \\mathbf{0} \\) có vô số nghiệm không tầm thường.</li>
        </ul>
      </div>
    `;

    if (window.App && typeof App.openCustomSolution === "function") {
      App.openCustomSolution("Định Thức Ma Trận Tham Số m", html);
    } else {
      const solBody = document.getElementById("solutionBody");
      const solOverlay = document.getElementById("solutionOverlay");
      const solTitle = document.getElementById("solTitleText");
      if (solTitle) solTitle.textContent = "Định Thức Ma Trận Tham Số m";
      if (solBody) solBody.innerHTML = html;
      if (solOverlay) {
        solOverlay.classList.add("is-open");
        solOverlay.setAttribute("aria-hidden", "false");
      }
      if (window.renderMathInElement) {
        renderMathInElement(solBody, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "\\[", right: "\\]", display: true },
            { left: "\\(", right: "\\)", display: false },
            { left: "$", right: "$", display: false }
          ]
        });
      }
    }
  }

  const Topic2Module = {
    _isInitialized: false,

    init: function () {
      if (this._isInitialized) return;
      const btnSym = document.getElementById("presetMatSym");
      if (!btnSym) return;
      this._isInitialized = true;
      const btnShear = document.getElementById("presetMatShear");
      const btnRotate = document.getElementById("presetMatRotate");
      const btnSingular = document.getElementById("presetMatSingular");

      const clearActivePill = () => {
        [btnSym, btnShear, btnRotate, btnSingular].forEach((b) => {
          if (b) b.classList.remove("active");
        });
      };

      const setMatrixInputs = (a11, a12, a21, a22) => {
        const el11 = document.getElementById("mat_m_a11");
        const el12 = document.getElementById("mat_m_a12");
        const el21 = document.getElementById("mat_m_a21");
        const el22 = document.getElementById("mat_m_a22");
        if (el11) el11.value = a11;
        if (el12) el12.value = a12;
        if (el21) el21.value = a21;
        if (el22) el22.value = a22;
        matState.a11Expr = a11;
        matState.a12Expr = a12;
        matState.a21Expr = a21;
        matState.a22Expr = a22;
        updateReadout();
        if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
      };

      if (btnSym) {
        btnSym.addEventListener("click", () => {
          clearActivePill();
          btnSym.classList.add("active");
          setMatrixInputs("1", "m", "m", "1");
        });
      }

      if (btnShear) {
        btnShear.addEventListener("click", () => {
          clearActivePill();
          btnShear.classList.add("active");
          setMatrixInputs("1", "m", "0", "1");
        });
      }

      if (btnRotate) {
        btnRotate.addEventListener("click", () => {
          clearActivePill();
          btnRotate.classList.add("active");
          setMatrixInputs("cos(m)", "-sin(m)", "sin(m)", "cos(m)");
        });
      }

      if (btnSingular) {
        btnSingular.addEventListener("click", () => {
          clearActivePill();
          btnSingular.classList.add("active");
          setMatrixInputs("m", "2", "2", "m");
        });
      }

      // Slider m
      const slider = document.getElementById("mat_m_slider");
      if (slider) {
        slider.addEventListener("input", (e) => {
          matState.m = parseFloat(e.target.value);
          const valText = document.getElementById("mat_m_val");
          if (valText) valText.textContent = "m = " + matState.m.toFixed(2);
          updateReadout();
          if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
        });
      }

      // Nút Play / Pause
      const btnPlay = document.getElementById("btnMatMPlay");
      if (btnPlay) {
        btnPlay.addEventListener("click", () => {
          matState.isPlaying = !matState.isPlaying;
          if (matState.isPlaying) {
            btnPlay.innerHTML = '<i class="ph ph-pause" style="margin-right:4px;"></i> Tạm dừng';
            requestAnimationFrame(animationTick);
          } else {
            btnPlay.innerHTML = '<i class="ph ph-play" style="margin-right:4px;"></i> Chạy quét m';
          }
        });
      }

      // Checkbox
      const chkPara = document.getElementById("chkShowParallelogram");
      if (chkPara) {
        chkPara.addEventListener("change", (e) => {
          matState.showParallelogram = e.target.checked;
          if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
        });
      }

      const chkBasis = document.getElementById("chkShowBasisVectors");
      if (chkBasis) {
        chkBasis.addEventListener("change", (e) => {
          matState.showBasis = e.target.checked;
          if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
        });
      }

      // Nút Lời giải
      const btnSol = document.getElementById("btnMatMSolution");
      if (btnSol) {
        btnSol.addEventListener("click", generateMatrixSolution);
      }
    },

    execute: function () {
      if (!this._isInitialized) this.init();
      const el11 = document.getElementById("mat_m_a11");
      const el12 = document.getElementById("mat_m_a12");
      const el21 = document.getElementById("mat_m_a21");
      const el22 = document.getElementById("mat_m_a22");
      if (el11 && el11.value) matState.a11Expr = el11.value.trim();
      if (el12 && el12.value) matState.a12Expr = el12.value.trim();
      if (el21 && el21.value) matState.a21Expr = el21.value.trim();
      if (el22 && el22.value) matState.a22Expr = el22.value.trim();

      App.custom2DDrawHook = drawParamMatrixOnCanvas2D;
      updateReadout();

      if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
        Vec2D.draw2DAllVectors();
      }
    },

    onTaskSelect: function (taskId) {
      if (
        taskId === "topic2_matrix_param" ||
        taskId === "s6" ||
        taskId === "s8" ||
        taskId === "s4"
      ) {
        this.execute();
      } else {
        if (matState.isPlaying) {
          matState.isPlaying = false;
          const btnPlay = document.getElementById("btnMatMPlay");
          if (btnPlay) {
            btnPlay.innerHTML = '<i class="ph ph-play" style="margin-right:4px;"></i> Chạy quét m';
          }
        }
        if (App.custom2DDrawHook === drawParamMatrixOnCanvas2D) {
          App.custom2DDrawHook = null;
        }
      }
    }
  };

  if (typeof App.registerTopicModule === "function") {
    App.registerTopicModule("t2", Topic2Module);
  } else {
    window.addEventListener("DOMContentLoaded", function () {
      if (typeof App.registerTopicModule === "function") {
        App.registerTopicModule("t2", Topic2Module);
      }
    });
  }
})();
