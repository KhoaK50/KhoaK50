// =========================================================================
// topic1_vectors.js - Module Chủ Đề 1: Kiến Thức Chuẩn Bị
// Khảo sát hình học vector phổ thông và vector tham số v(t) quét đường Parabol
// =========================================================================
(function () {
  window.App = window.App || {};

  let paramState = {
    xExpr: "t",
    yExpr: "t*t",
    t: 1.0,
    tMin: -3.0,
    tMax: 3.0,
    isPlaying: false,
    animDirection: 1,
    animSpeed: 0.03,
    showTrace: true,
    showTangent: true,
    trajectoryPoints: []
  };

  App.activeParamVectorState = null;

  // Đánh giá biểu thức toán học an toàn theo biến t
  function evaluateExpr(exprStr, tVal) {
    try {
      const sanitized = exprStr
        .replace(/\^/g, "**")
        .replace(/sin/g, "Math.sin")
        .replace(/cos/g, "Math.cos")
        .replace(/tan/g, "Math.tan")
        .replace(/sqrt/g, "Math.sqrt")
        .replace(/abs/g, "Math.abs")
        .replace(/pi/gi, "Math.PI");

      const fn = new Function("t", "return " + sanitized + ";");
      const res = Number(fn(tVal));
      return isNaN(res) ? 0 : res;
    } catch (err) {
      return 0;
    }
  }

  // Tiền tính toán các điểm trên quỹ đạo để vẽ đường cong mịn
  function computeTrajectoryPoints() {
    const pts = [];
    const step = 0.05;
    for (let curT = paramState.tMin; curT <= paramState.tMax + 1e-4; curT += step) {
      const x = evaluateExpr(paramState.xExpr, curT);
      const y = evaluateExpr(paramState.yExpr, curT);
      pts.push({ t: curT, x: x, y: y });
    }
    paramState.trajectoryPoints = pts;
  }

  // Hook vẽ đồ họa 2D trên Canvas
  function drawParamVectorOnCanvas2D(ctx, gridInfo, logicalSize) {
    if (!paramState || !gridInfo) return;

    const cx = gridInfo.cx !== undefined ? gridInfo.cx : (gridInfo.originPx ? gridInfo.originPx.x : 0);
    const cy = gridInfo.cy !== undefined ? gridInfo.cy : (gridInfo.originPx ? gridInfo.originPx.y : 0);
    const px = gridInfo.px !== undefined ? gridInfo.px : (gridInfo.pixelsPerUnit || 40);

    const wX = (x) => cx + x * px;
    const wY = (y) => cy - y * px;

    ctx.save();

    // 1. Vẽ vệt sáng quỹ đạo đường cong (Parabol)
    if (paramState.showTrace && paramState.trajectoryPoints.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(168, 85, 247, 0.85)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);

      let started = false;
      paramState.trajectoryPoints.forEach((pt) => {
        const sx = wX(pt.x);
        const sy = wY(pt.y);
        if (!started) {
          ctx.moveTo(sx, sy);
          started = true;
        } else {
          ctx.lineTo(sx, sy);
        }
      });
      ctx.stroke();

      // Vẽ vệt sáng mờ neon phía dưới
      ctx.beginPath();
      ctx.strokeStyle = "rgba(168, 85, 247, 0.25)";
      ctx.lineWidth = 6.0;
      started = false;
      paramState.trajectoryPoints.forEach((pt) => {
        const sx = wX(pt.x);
        const sy = wY(pt.y);
        if (!started) {
          ctx.moveTo(sx, sy);
          started = true;
        } else {
          ctx.lineTo(sx, sy);
        }
      });
      ctx.stroke();
    }

    // 2. Tính tọa độ vector hiện tại v(t)
    const curX = evaluateExpr(paramState.xExpr, paramState.t);
    const curY = evaluateExpr(paramState.yExpr, paramState.t);
    const tipX = wX(curX);
    const tipY = wY(curY);

    // 3. Vẽ vector vị trí v(t) từ gốc (0, 0)
    ctx.beginPath();
    ctx.strokeStyle = "#0090ff";
    ctx.lineWidth = 3.0;
    ctx.moveTo(cx, cy);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Đầu mũi tên của vector v(t)
    const angleV = Math.atan2(cy - tipY, tipX - cx);
    const headLen = 12;
    ctx.beginPath();
    ctx.fillStyle = "#0090ff";
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
      tipX - headLen * Math.cos(angleV - Math.PI / 6),
      tipY + headLen * Math.sin(angleV - Math.PI / 6)
    );
    ctx.lineTo(
      tipX - headLen * Math.cos(angleV + Math.PI / 6),
      tipY + headLen * Math.sin(angleV + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // Điểm ngọn vector
    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0090ff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Vẽ vector tiếp tuyến vận tốc v'(t)
    if (paramState.showTangent) {
      const dt = 0.01;
      const xNext = evaluateExpr(paramState.xExpr, paramState.t + dt);
      const yNext = evaluateExpr(paramState.yExpr, paramState.t + dt);
      const vx = (xNext - curX) / dt;
      const vy = (yNext - curY) / dt;
      const vLen = Math.hypot(vx, vy);

      if (vLen > 1e-4) {
        // Chuẩn hóa độ dài hiển thị vừa phải (khoảng 1.5 đơn vị)
        const displayScale = 1.5 / Math.max(vLen, 1.0);
        const tanTipX = wX(curX + vx * displayScale);
        const tanTipY = wY(curY + vy * displayScale);

        ctx.beginPath();
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2.2;
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tanTipX, tanTipY);
        ctx.stroke();

        const tanAngle = Math.atan2(tipY - tanTipY, tanTipX - tipX);
        ctx.beginPath();
        ctx.fillStyle = "#f59e0b";
        ctx.moveTo(tanTipX, tanTipY);
        ctx.lineTo(
          tanTipX - 9 * Math.cos(tanAngle - Math.PI / 6),
          tanTipY + 9 * Math.sin(tanAngle - Math.PI / 6)
        );
        ctx.lineTo(
          tanTipX - 9 * Math.cos(tanAngle + Math.PI / 6),
          tanTipY + 9 * Math.sin(tanAngle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();

        // Nhãn vector tiếp tuyến
        ctx.font = "600 11px system-ui, sans-serif";
        ctx.fillStyle = "#f59e0b";
        ctx.fillText("v'(t)", tanTipX + 6, tanTipY - 4);
      }
    }

    // 5. Nhãn tọa độ điểm ngọn
    ctx.font = "600 12px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#0090ff";
    ctx.fillText(
      "v = [" + curX.toFixed(2) + ", " + curY.toFixed(2) + "]",
      tipX + 10,
      tipY + 18
    );

    ctx.restore();
  }

  // Vòng lặp chuyển động quét tham số t
  function animationTick() {
    if (!paramState.isPlaying) return;

    paramState.t += paramState.animDirection * paramState.animSpeed;

    if (paramState.t >= paramState.tMax) {
      paramState.t = paramState.tMax;
      paramState.animDirection = -1;
    } else if (paramState.t <= paramState.tMin) {
      paramState.t = paramState.tMin;
      paramState.animDirection = 1;
    }

    // Đồng bộ giao diện thanh trượt
    const slider = document.getElementById("param_t_slider");
    const valText = document.getElementById("param_t_val");
    if (slider) slider.value = paramState.t;
    if (valText) valText.textContent = "t = " + paramState.t.toFixed(2);

    updateReadout();

    if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
      Vec2D.draw2DAllVectors();
    }

    requestAnimationFrame(animationTick);
  }

  // Cập nhật bảng thông tin
  function updateReadout() {
    const curX = evaluateExpr(paramState.xExpr, paramState.t);
    const curY = evaluateExpr(paramState.yExpr, paramState.t);
    const norm = Math.hypot(curX, curY);

    const dt = 0.01;
    const vx = (evaluateExpr(paramState.xExpr, paramState.t + dt) - curX) / dt;
    const vy = (evaluateExpr(paramState.yExpr, paramState.t + dt) - curY) / dt;
    const speed = Math.hypot(vx, vy);

    const resEl = document.getElementById("result_param_info");
    if (resEl) {
      resEl.innerHTML = `
        <div style="font-weight:700; color:var(--primary-base); margin-bottom:4px;">
          Vector vị trí: v(${paramState.t.toFixed(2)}) = [${curX.toFixed(2)}, ${curY.toFixed(2)}]
        </div>
        <div>Độ dài chuẩn: ||v|| = ${norm.toFixed(2)}</div>
        <div style="font-size:11.5px; color:var(--muted); margin-top:2px;">
          Vận tốc tiếp tuyến: v' = [${vx.toFixed(2)}, ${vy.toFixed(2)}], Tốc độ = ${speed.toFixed(2)}
        </div>
      `;
      resEl.style.display = "block";
    }
  }

  // Sinh lời giải LaTeX chi tiết cho Solution Panel
  function generateParamSolution() {
    const curX = evaluateExpr(paramState.xExpr, paramState.t);
    const curY = evaluateExpr(paramState.yExpr, paramState.t);
    const norm = Math.hypot(curX, curY);

    let html = `
      <div style="padding: 18px 22px; font-family: 'STIX Two Text', serif; font-size: 15px; line-height: 1.7; color: var(--text-main);">
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 12px; color: var(--primary-base); border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px;">
          Khảo Sát Hình Học Vector Tham Số v(t) & Quỹ Đạo Đường Cong
        </h3>

        <p><strong>1. Biểu diễn vector theo biến tham số:</strong></p>
        <p>Xét vector chuyển động theo tham số thời gian \\( t \\in [${paramState.tMin}, ${paramState.tMax}] \\):</p>
        <div style="text-align: center; margin: 10px 0;">
          \\[ \\vec{v}(t) = \\begin{bmatrix} x(t) \\\\ y(t) \\end{bmatrix} = \\begin{bmatrix} ${paramState.xExpr} \\\\ ${paramState.yExpr} \\end{bmatrix} \\]
        </div>

        <p><strong>2. Điểm ngọn và vector tức thời tại \\( t = ${paramState.t.toFixed(2)} \\):</strong></p>
        <div style="text-align: center; margin: 10px 0;">
          \\[ \\vec{v}(${paramState.t.toFixed(2)}) = [${curX.toFixed(3)},\\; ${curY.toFixed(3)}]^T \\]
        </div>
        <p>Độ dài chuẩn Euclide của vector tại thời điểm này:</p>
        <div style="text-align: center; margin: 10px 0;">
          \\[ \\|\\vec{v}(t)\\| = \\sqrt{x(t)^2 + y(t)^2} = \\sqrt{(${curX.toFixed(2)})^2 + (${curY.toFixed(2)})^2} \\approx ${norm.toFixed(3)} \\]
        </div>

        <p><strong>3. Phương trình quỹ đạo đường cong:</strong></p>
        <p>Khử tham số \\( t \\) từ hệ phương trình tọa độ:</p>
        <div style="text-align: center; margin: 10px 0;">
          \\[ \\begin{cases} x = t \\\\ y = t^2 \\end{cases} \\implies y = x^2 \\]
        </div>
        <p>Đây chính là phương trình đường Parabol có đỉnh tại gốc tọa độ \\( O(0, 0) \\), nhận trục tung \\( Oy \\) làm trục đối xứng.</p>

        <p><strong>4. Vector vận tốc tiếp tuyến:</strong></p>
        <p>Đạo hàm từng thành phần của vector theo tham số \\( t \\):</p>
        <div style="text-align: center; margin: 10px 0;">
          \\[ \\vec{v}'(t) = \\frac{d\\vec{v}}{dt} = \\begin{bmatrix} x'(t) \\\\ y'(t) \\end{bmatrix} = \\begin{bmatrix} 1 \\\\ 2t \\end{bmatrix} \\]
        </div>
        <p>Vector tiếp tuyến chỉ rõ hướng chuyển động và biến thiên tức thời của điểm ngọn vector dọc theo đường cong Parabol.</p>
      </div>
    `;

    if (window.App && typeof App.openCustomSolution === "function") {
      App.openCustomSolution("Vector Tham Số & Quỹ Đạo Parabol", html);
    } else {
      const solBody = document.getElementById("solutionBody");
      const solOverlay = document.getElementById("solutionOverlay");
      const solTitle = document.getElementById("solTitleText");
      if (solTitle) solTitle.textContent = "Vector Tham Số & Quỹ Đạo Parabol";
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

  const Topic1Module = {
    _isInitialized: false,

    init: function () {
      if (this._isInitialized) return;
      const btnParabol = document.getElementById("presetParamParabol");
      if (!btnParabol) return;
      this._isInitialized = true;

      computeTrajectoryPoints();

      // Gắn sự kiện nút preset
      const btnCircle = document.getElementById("presetParamCircle");
      const btnCubic = document.getElementById("presetParamCubic");

      const clearActivePill = () => {
        [btnParabol, btnCircle, btnCubic].forEach((b) => {
          if (b) b.classList.remove("active");
        });
      };

      if (btnParabol) {
        btnParabol.addEventListener("click", () => {
          clearActivePill();
          btnParabol.classList.add("active");
          const xInp = document.getElementById("param_x_expr");
          const yInp = document.getElementById("param_y_expr");
          if (xInp) xInp.value = "t";
          if (yInp) yInp.value = "t*t";
          paramState.xExpr = "t";
          paramState.yExpr = "t*t";
          paramState.tMin = -3;
          paramState.tMax = 3;
          computeTrajectoryPoints();
          updateReadout();
          if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
        });
      }

      if (btnCircle) {
        btnCircle.addEventListener("click", () => {
          clearActivePill();
          btnCircle.classList.add("active");
          const xInp = document.getElementById("param_x_expr");
          const yInp = document.getElementById("param_y_expr");
          if (xInp) xInp.value = "2*cos(t)";
          if (yInp) yInp.value = "2*sin(t)";
          paramState.xExpr = "2*cos(t)";
          paramState.yExpr = "2*sin(t)";
          paramState.tMin = 0;
          paramState.tMax = 6.28;
          computeTrajectoryPoints();
          updateReadout();
          if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
        });
      }

      if (btnCubic) {
        btnCubic.addEventListener("click", () => {
          clearActivePill();
          btnCubic.classList.add("active");
          const xInp = document.getElementById("param_x_expr");
          const yInp = document.getElementById("param_y_expr");
          if (xInp) xInp.value = "t";
          if (yInp) yInp.value = "0.3*t*t*t";
          paramState.xExpr = "t";
          paramState.yExpr = "0.3*t*t*t";
          paramState.tMin = -2.5;
          paramState.tMax = 2.5;
          computeTrajectoryPoints();
          updateReadout();
          if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
        });
      }

      // Thanh trượt t
      const slider = document.getElementById("param_t_slider");
      if (slider) {
        slider.addEventListener("input", (e) => {
          paramState.t = parseFloat(e.target.value);
          const valText = document.getElementById("param_t_val");
          if (valText) valText.textContent = "t = " + paramState.t.toFixed(2);
          updateReadout();
          if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
        });
      }

      // Nút Play / Pause
      const btnPlay = document.getElementById("btnParamPlay");
      if (btnPlay) {
        btnPlay.addEventListener("click", () => {
          paramState.isPlaying = !paramState.isPlaying;
          if (paramState.isPlaying) {
            btnPlay.innerHTML = '<i class="ph ph-pause" style="margin-right:4px;"></i> Tạm dừng';
            requestAnimationFrame(animationTick);
          } else {
            btnPlay.innerHTML = '<i class="ph ph-play" style="margin-right:4px;"></i> Chạy quét t';
          }
        });
      }

      // Checkbox vệt quỹ đạo và tiếp tuyến
      const chkTrace = document.getElementById("chkShowParamTrace");
      if (chkTrace) {
        chkTrace.addEventListener("change", (e) => {
          paramState.showTrace = e.target.checked;
          if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
        });
      }

      const chkTan = document.getElementById("chkShowTangentVec");
      if (chkTan) {
        chkTan.addEventListener("change", (e) => {
          paramState.showTangent = e.target.checked;
          if (window.Vec2D && Vec2D.draw2DAllVectors) Vec2D.draw2DAllVectors();
        });
      }

      // Nút Lời giải
      const btnSol = document.getElementById("btnParamSolution");
      if (btnSol) {
        btnSol.addEventListener("click", generateParamSolution);
      }
    },

    execute: function () {
      if (!this._isInitialized) this.init();
      const xInp = document.getElementById("param_x_expr");
      const yInp = document.getElementById("param_y_expr");
      if (xInp && xInp.value) paramState.xExpr = xInp.value.trim();
      if (yInp && yInp.value) paramState.yExpr = yInp.value.trim();

      computeTrajectoryPoints();
      App.custom2DDrawHook = drawParamVectorOnCanvas2D;
      updateReadout();

      if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
        Vec2D.draw2DAllVectors();
      }
    },

    onTaskSelect: function (taskId) {
      if (taskId === "topic1_parametric_vector" || taskId === "s1") {
        this.execute();
      } else {
        if (paramState.isPlaying) {
          paramState.isPlaying = false;
          const btnPlay = document.getElementById("btnParamPlay");
          if (btnPlay) {
            btnPlay.innerHTML = '<i class="ph ph-play" style="margin-right:4px;"></i> Chạy quét t';
          }
        }
        if (App.custom2DDrawHook === drawParamVectorOnCanvas2D) {
          App.custom2DDrawHook = null;
        }
      }
    }
  };

  if (typeof App.registerTopicModule === "function") {
    App.registerTopicModule("t1", Topic1Module);
  } else {
    window.addEventListener("DOMContentLoaded", function () {
      if (typeof App.registerTopicModule === "function") {
        App.registerTopicModule("t1", Topic1Module);
      }
    });
  }
})();
