// =========================================================================
// topic7_quadratic_forms_conics.js - Module Chủ Đề 7: Dạng Toàn Phương
// Bài toán: Dạng toàn phương, nhận diện và chéo hóa nắn thẳng Parabol / Conic
// =========================================================================
(function () {
  window.App = window.App || {};

  // Trạng thái lưu trữ của Conic hiện tại
  let conicState = {
    a: 1,
    b: -1,
    c: 1,
    d: -5.65685, // -4*sqrt(2)
    e: -5.65685, // -4*sqrt(2)
    f: 0,
    lambda1: 2,
    lambda2: 0,
    u1: [Math.SQRT1_2, -Math.SQRT1_2],
    u2: [Math.SQRT1_2, Math.SQRT1_2],
    theta: -Math.PI / 4, // -45 deg
    currentAngle: -Math.PI / 4,
    conicType: "Parabol",
    isRotated: false,
    animProgress: 0,
    animating: false
  };

  App.activeConicState = null;

  // --- 1. THUẬT TOÁN ĐẠI SỐ TUYẾN TÍNH ---
  function solveConicParameters(a, b, c, d, e, f) {
    // Ma trận đối xứng A = [[a, b], [b, c]]
    const trace = a + c;
    const detA = a * c - b * b;
    const disc = Math.max(0, (a - c) * (a - c) + 4 * b * b);
    const sqrtDisc = Math.sqrt(disc);

    // Trị riêng
    let l1 = (trace + sqrtDisc) / 2;
    let l2 = (trace - sqrtDisc) / 2;

    // Làm tròn số gần nguyên (ví dụ 1.999999 -> 2)
    if (Math.abs(l1 - Math.round(l1)) < 1e-5) l1 = Math.round(l1);
    if (Math.abs(l2 - Math.round(l2)) < 1e-5) l2 = Math.round(l2);

    // Vector riêng chuẩn hóa
    let u1 = [1, 0];
    let u2 = [0, 1];

    if (Math.abs(b) > 1e-7) {
      const v1 = [l1 - c, b];
      const len1 = Math.hypot(v1[0], v1[1]) || 1;
      u1 = [v1[0] / len1, v1[1] / len1];
      u2 = [-u1[1], u1[0]];
    } else {
      if (a >= c) {
        u1 = [1, 0];
        u2 = [0, 1];
      } else {
        u1 = [0, 1];
        u2 = [-1, 0];
      }
    }

    const theta = Math.atan2(u1[1], u1[0]);

    // Phân loại conic theo dấu trị riêng (Định lý Sylvester)
    let type = "Parabol";
    if (Math.abs(l1) < 1e-5 || Math.abs(l2) < 1e-5) {
      type = "Parabol";
    } else if (l1 * l2 > 0) {
      type = "Elip";
    } else {
      type = "Hyperbol";
    }

    return {
      a, b, c, d, e, f,
      lambda1: l1,
      lambda2: l2,
      u1,
      u2,
      theta,
      currentAngle: theta,
      conicType: type,
      isRotated: false
    };
  }

  // --- 2. VẼ ĐỒ THỊ TRÊN CANVAS 2D (HOOK VÀO Vec2D) ---
  function drawConicOnCanvas2D(ctx, gridInfo, size) {
    if (!App.activeConicState) return;

    const s = App.activeConicState;
    const { cx, cy, px } = gridInfo;
    const { w, h } = size;

    // Giới hạn tọa độ thực trên màn hình (World Coordinates)
    const minX = -cx / px;
    const maxX = (w - cx) / px;
    const minY = (cy - h) / px;
    const maxY = cy / px;

    ctx.save();

    // 1. Vẽ 2 trục đối xứng vector riêng
    const rot = s.currentAngle;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);

    const axisLen = Math.max(w, h) / px;

    // Trục chính 1 (theo vector u1)
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0, 180, 255, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.moveTo(cx - cosR * axisLen * px, cy + sinR * axisLen * px);
    ctx.lineTo(cx + cosR * axisLen * px, cy - sinR * axisLen * px);
    ctx.stroke();

    // Trục chính 2 (theo vector u2)
    ctx.beginPath();
    ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.moveTo(cx + sinR * axisLen * px, cy + cosR * axisLen * px);
    ctx.lineTo(cx - sinR * axisLen * px, cy - cosR * axisLen * px);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // 2. Vẽ 2 vector riêng trực chuẩn (Mũi tên u1, u2)
    const arrowScale = Math.min(2.5, Math.max(1.2, 120 / px));
    drawArrow(ctx, cx, cy, cx + cosR * arrowScale * px, cy - sinR * arrowScale * px, "#00e5ff", 2.5);
    drawArrow(ctx, cx, cy, cx - sinR * arrowScale * px, cy - cosR * arrowScale * px, "#f59e0b", 2.5);

    // Nhãn vector riêng
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = "#00e5ff";
    ctx.fillText("u1 (λ1=" + s.lambda1.toFixed(1) + ")", cx + cosR * (arrowScale + 0.3) * px, cy - sinR * (arrowScale + 0.3) * px);
    ctx.fillStyle = "#f59e0b";
    ctx.fillText("u2 (λ2=" + s.lambda2.toFixed(1) + ")", cx - sinR * (arrowScale + 0.3) * px, cy - cosR * (arrowScale + 0.3) * px);

    // 3. Vẽ đường cong Conic (Parabol / Elip / Hyperbol)
    // Dùng kỹ thuật quét hàm ẩn F(x,y) = 0 trên lưới điểm hoặc tham số hóa
    ctx.lineWidth = 2.8;
    if (s.conicType === "Parabol") {
      ctx.strokeStyle = "#8b5cf6"; // Tím Radix cho Parabol
    } else if (s.conicType === "Elip") {
      ctx.strokeStyle = "#10b981"; // Lục ngọc cho Elip
    } else {
      ctx.strokeStyle = "#f59e0b"; // Hổ phách cho Hyperbol
    }

    renderImplicitConic(ctx, s, minX, maxX, minY, maxY, cx, cy, px);

    ctx.restore();
  }

  function drawArrow(ctx, x1, y1, x2, y2, color, width) {
    const headLen = 10;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  // Quét đường cong bậc hai mượt mà
  function renderImplicitConic(ctx, s, minX, maxX, minY, maxY, cx, cy, px) {
    // Nếu là góc xoay biến thiên trong lúc hoạt họa (Rotate to Canonical)
    // Ta biến đổi phương trình sang hệ trục hiện tại
    const rot = s.currentAngle;
    const deltaTheta = rot - s.theta; // Góc bù khi xoay
    const cosD = Math.cos(deltaTheta);
    const sinD = Math.sin(deltaTheta);

    // Đơn giản hóa: Vẽ theo tham số trong hệ trục riêng rồi quay ngược lại
    // Nếu là Parabol (một trị riêng bằng 0 hoặc xấp xỉ 0)
    if (s.conicType === "Parabol") {
      // Giả sử lambda1 != 0, lambda2 ~ 0: phương trình chính tắc dạng lambda1 * x'^2 + e' * y' + d' * x' + f' = 0
      // Tham số hóa x' từ -20 đến 20
      ctx.beginPath();
      let started = false;
      const step = 0.05;
      const bound = Math.max(15, (maxX - minX) * 1.2);

      // Tính các hệ số trong hệ trục riêng (u1, u2)
      const dPrime = s.d * s.u1[0] + s.e * s.u1[1];
      const ePrime = s.d * s.u2[0] + s.e * s.u2[1];

      for (let xP = -bound; xP <= bound; xP += step) {
        let yP = 0;
        if (Math.abs(s.lambda2) < 1e-5) {
          // lambda1 * x'^2 + d'*x' + e'*y' + f = 0  => y' = -(lambda1 * x'^2 + d'*x' + f) / e'
          const div = Math.abs(ePrime) > 1e-4 ? ePrime : (Math.abs(s.d) > 1e-4 ? s.d : -1);
          yP = -(s.lambda1 * xP * xP + dPrime * xP + s.f) / div;
        } else {
          // lambda2 * y'^2 + d'*x' + e'*y' + f = 0 => x' = -(lambda2 * y'^2 + e'*y' + f) / d'
          const div = Math.abs(dPrime) > 1e-4 ? dPrime : -1;
          yP = xP;
          xP = -(s.lambda2 * yP * yP + ePrime * yP + s.f) / div;
        }

        // Biến đổi tọa độ theo góc hiện tại rot
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);
        const worldX = xP * cosR - yP * sinR;
        const worldY = xP * sinR + yP * cosR;

        const scrX = cx + worldX * px;
        const scrY = cy - worldY * px;

        if (!started) {
          ctx.moveTo(scrX, scrY);
          started = true;
        } else {
          ctx.lineTo(scrX, scrY);
        }
      }
      ctx.stroke();
    } else if (s.conicType === "Elip") {
      // Elip: lambda1 * x'^2 + lambda2 * y'^2 = C
      const C = Math.max(0.1, -s.f || 8);
      const aAxis = Math.sqrt(Math.max(0.01, C / Math.max(0.01, s.lambda1)));
      const bAxis = Math.sqrt(Math.max(0.01, C / Math.max(0.01, s.lambda2)));

      ctx.beginPath();
      const steps = 120;
      for (let i = 0; i <= steps; i++) {
        const phi = (i / steps) * Math.PI * 2;
        const xP = aAxis * Math.cos(phi);
        const yP = bAxis * Math.sin(phi);

        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);
        const worldX = xP * cosR - yP * sinR;
        const worldY = xP * sinR + yP * cosR;

        const scrX = cx + worldX * px;
        const scrY = cy - worldY * px;

        if (i === 0) ctx.moveTo(scrX, scrY);
        else ctx.lineTo(scrX, scrY);
      }
      ctx.closePath();
      ctx.stroke();
    } else {
      // Hyperbol: lambda1 * x'^2 + lambda2 * y'^2 = C (lambda1 > 0, lambda2 < 0)
      const C = Math.abs(s.f) > 0.01 ? Math.abs(s.f) : 3;
      const aAxis = Math.sqrt(Math.max(0.01, C / Math.abs(s.lambda1)));
      const bAxis = Math.sqrt(Math.max(0.01, C / Math.abs(s.lambda2)));

      // 2 nhánh hyperbol
      [-1, 1].forEach((branch) => {
        ctx.beginPath();
        let started = false;
        for (let t = -2.5; t <= 2.5; t += 0.05) {
          const xP = branch * aAxis * Math.cosh(t);
          const yP = bAxis * Math.sinh(t);

          const cosR = Math.cos(rot);
          const sinR = Math.sin(rot);
          const worldX = xP * cosR - yP * sinR;
          const worldY = xP * sinR + yP * cosR;

          const scrX = cx + worldX * px;
          const scrY = cy - worldY * px;

          if (!started) {
            ctx.moveTo(scrX, scrY);
            started = true;
          } else {
            ctx.lineTo(scrX, scrY);
          }
        }
        ctx.stroke();
      });
    }
  }

  // --- 3. HOẠT HỌA CHÉO HÓA TRỰC GIAO (NẮN THẲNG CONIC) ---
  function animateRotateToCanonical() {
    if (!App.activeConicState) return;
    const s = App.activeConicState;
    if (s.animating) return;

    s.animating = true;
    const startAngle = s.currentAngle;
    const targetAngle = 0; // Đưa về trục chuẩn 0 rad (song song Ox, Oy)
    const duration = 1200; // 1.2 giây
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Easing: cubic-bezier mượt mà
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      s.currentAngle = startAngle + (targetAngle - startAngle) * ease;
      s.isRotated = t >= 1;

      // Vẽ lại canvas
      if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
        Vec2D.draw2DAllVectors();
      }

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        s.animating = false;
        s.currentAngle = targetAngle;
        if (window.App && typeof App.showToast === "function") {
          App.showToast("Chéo hóa hoàn tất: Hệ trục đã được nắn về dạng chính tắc!", "success");
        }
      }
    }

    requestAnimationFrame(step);
  }

  // --- 4. BỘ SINH LỜI GIẢI CHI TIẾT (CHO SOLUTION PANEL) ---
  function generateConicSolution(s) {
    const deg = ((s.theta * 180) / Math.PI).toFixed(1);
    const signType = s.conicType;

    const htmlContent = `
      <div style="font-family: var(--font-academic); line-height: 1.8; color: var(--fg);">
        <h3 style="color: var(--primary-base); font-size: 1.15rem; margin-bottom: 12px;">
          Khảo sát Dạng Toàn Phương và Đưa về Dạng Chính Tắc
        </h3>
        <p style="margin-bottom: 14px;">
          Cho phương trình đường cong bậc hai tổng quát:
        </p>
        <div class="sol-math-block">
          $$${s.a}x^2 + ${2 * s.b}xy + ${s.c}y^2 + (${s.d})x + (${s.e})y + (${s.f}) = 0$$
        </div>

        <div style="margin: 20px 0 10px 0; font-weight: 700; color: var(--primary-hover);">
          Bước 1: Thiết lập ma trận đối xứng của dạng toàn phương
        </div>
        <p>Phần thuần nhất bậc hai $q(x, y) = ${s.a}x^2 + ${2 * s.b}xy + ${s.c}y^2$ có ma trận đối xứng biểu diễn:</p>
        <div class="sol-math-block">
          $$A = \\begin{pmatrix} ${s.a} & ${s.b} \\\\ ${s.b} & ${s.c} \\end{pmatrix}$$
        </div>

        <div style="margin: 20px 0 10px 0; font-weight: 700; color: var(--primary-hover);">
          Bước 2: Tìm đa thức đặc trưng và các trị riêng
        </div>
        <p>Giải phương trình đặc trưng $\\det(A - \\lambda I) = 0$:</p>
        <div class="sol-math-block">
          $$\\det\\begin{pmatrix} ${s.a} - \\lambda & ${s.b} \\\\ ${s.b} & ${s.c} - \\lambda \\end{pmatrix} = \\lambda^2 - (${s.a + s.c})\\lambda + (${s.a * s.c - s.b * s.b}) = 0$$
        </div>
        <p>Phương trình có 2 nghiệm trị riêng:</p>
        <div class="sol-math-block">
          $$\\lambda_1 = ${s.lambda1}, \\quad \\lambda_2 = ${s.lambda2}$$
        </div>

        <div style="margin: 20px 0 10px 0; font-weight: 700; color: var(--primary-hover);">
          Bước 3: Xác định cơ sở trực chuẩn các vector riêng và ma trận trực giao P
        </div>
        <p>Các vector riêng trực chuẩn tương ứng với 2 trị riêng:</p>
        <div class="sol-math-block">
          $$\\vec{u}_1 = \\begin{pmatrix} ${s.u1[0].toFixed(4)} \\\\ ${s.u1[1].toFixed(4)} \\end{pmatrix}, \\quad \\vec{u}_2 = \\begin{pmatrix} ${s.u2[0].toFixed(4)} \\\\ ${s.u2[1].toFixed(4)} \\end{pmatrix}$$
        </div>
        <p>Ma trận trực giao làm chéo $P = [\\vec{u}_1, \\vec{u}_2]$ (tương ứng phép quay một góc $\\theta \\approx ${deg}^\\circ$):</p>
        <div class="sol-math-block">
          $$P = \\begin{pmatrix} ${s.u1[0].toFixed(4)} & ${s.u2[0].toFixed(4)} \\\\ ${s.u1[1].toFixed(4)} & ${s.u2[1].toFixed(4)} \\end{pmatrix}, \\quad P^T A P = \\begin{pmatrix} ${s.lambda1} & 0 \\\\ 0 & ${s.lambda2} \\end{pmatrix}$$
        </div>

        <div style="margin: 20px 0 10px 0; font-weight: 700; color: var(--primary-hover);">
          Bước 4: Thực hiện phép đổi biến trực giao và đưa về dạng chính tắc
        </div>
        <p>Thực hiện đổi biến tọa độ $\\begin{pmatrix} x \\\\ y \\end{pmatrix} = P \\begin{pmatrix} x' \\\\ y' \\end{pmatrix}$, số hạng chéo $xy$ hoàn toàn bị triệt tiêu:</p>
        <div class="sol-math-block">
          $$${s.lambda1}(x')^2 + ${s.lambda2}(y')^2 + d'x' + e'y' + f = 0$$
        </div>

        <div style="margin: 20px 0 10px 0; font-weight: 700; color: var(--primary-hover);">
          Bước 5: Phân loại hình học đường conic (Tiêu chuẩn Sylvester)
        </div>
        <p>Dựa trên tích 2 trị riêng $\\lambda_1 \\cdot \\lambda_2$:</p>
        <div style="padding: 12px; border-left: 3px solid var(--primary-base); background: var(--bg-hover); margin: 10px 0; border-radius: 2px;">
          <strong>Kết luận:</strong> Đây là một <strong>${signType.toUpperCase()}</strong>. Sau phép chéo hóa trực giao, trục đối xứng của đường cong trùng với phương của các vector riêng $\\vec{u}_1, \\vec{u}_2$.
        </div>
      </div>
    `;

    return {
      title: "Lời giải Dạng toàn phương & Conic",
      math: `\\lambda_1=${s.lambda1},\\,\\lambda_2=${s.lambda2}`,
      content1: htmlContent,
      tab1Label: "Phương pháp Ma trận trực giao",
      showSubTabs: false
    };
  }

  // --- 5. ĐĂNG KÝ MODULE VÀ GẮN SỰ KIỆN UI ---
  const Topic7Module = {
    id: "t7",
    name: "Chủ đề 7: Dạng toàn phương",
    tasks: [
      { id: "quadratic_form_conic", title: "Dạng toàn phương và nắn thẳng Parabol / Conic" }
    ],

    init: function () {
      this.bindUI();
    },

    bindUI: function () {
      const btnDraw = document.getElementById("btnConicDraw");
      const btnRotate = document.getElementById("btnConicRotate");
      const btnSol = document.getElementById("btnConicSolution");

      // Preset buttons
      const btnPParabol = document.getElementById("presetParabol");
      const btnPEllipse = document.getElementById("presetEllipse");
      const btnPHyperbola = document.getElementById("presetHyperbola");

      if (btnPParabol) {
        btnPParabol.onclick = () => {
          this.setInputs(1, -1, 1, -5.65685, -5.65685, 0); // Parabol xoay nghiêng 45 deg
          this.execute();
        };
      }
      if (btnPEllipse) {
        btnPEllipse.onclick = () => {
          this.setInputs(5, -3, 5, 0, 0, -8); // Elip xoay 45 deg
          this.execute();
        };
      }
      if (btnPHyperbola) {
        btnPHyperbola.onclick = () => {
          this.setInputs(1, -2, 1, 0, 0, -3); // Hyperbol
          this.execute();
        };
      }

      if (btnDraw) {
        btnDraw.onclick = () => this.execute();
      }

      if (btnRotate) {
        btnRotate.onclick = () => animateRotateToCanonical();
      }

      if (btnSol) {
        btnSol.onclick = () => {
          if (!App.activeConicState) this.execute();
          if (typeof App.openSolutionPanel === "function") {
            const solData = generateConicSolution(App.activeConicState);
            App.openSolutionPanel(solData);
          }
        };
      }
    },

    setInputs: function (a, b, c, d, e, f) {
      const setVal = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.value = v;
      };
      setVal("conic_a", a);
      setVal("conic_b", b);
      setVal("conic_c", c);
      setVal("conic_d", d);
      setVal("conic_e", e);
      setVal("conic_f", f);
    },

    execute: function () {
      const getVal = (id, def) => {
        const el = document.getElementById(id);
        if (!el) return def;
        const v = parseFloat(el.value);
        return isNaN(v) ? def : v;
      };

      const a = getVal("conic_a", 1);
      const b = getVal("conic_b", -1);
      const c = getVal("conic_c", 1);
      const d = getVal("conic_d", -5.65685);
      const e = getVal("conic_e", -5.65685);
      const f = getVal("conic_f", 0);

      conicState = solveConicParameters(a, b, c, d, e, f);
      App.activeConicState = conicState;

      // Đăng ký hook vẽ 2D
      App.custom2DDrawHook = drawConicOnCanvas2D;

      // Cập nhật nhãn kết quả trên UI
      const resEl = document.getElementById("result_conic_info");
      if (resEl) {
        const deg = ((conicState.theta * 180) / Math.PI).toFixed(1);
        resEl.innerHTML = `
          <div style="font-weight:700; color:var(--primary-base); margin-bottom:4px;">
            Nhận diện: ${conicState.conicType.toUpperCase()} - Góc nghiêng ${deg}°
          </div>
          <div>Trị riêng: λ₁ = ${conicState.lambda1.toFixed(2)}, λ₂ = ${conicState.lambda2.toFixed(2)}</div>
          <div style="font-size:11.5px; color:var(--muted); margin-top:2px;">
            Vector riêng u₁=[${conicState.u1[0].toFixed(2)}, ${conicState.u1[1].toFixed(2)}], u₂=[${conicState.u2[0].toFixed(2)}, ${conicState.u2[1].toFixed(2)}]
          </div>
        `;
        resEl.style.display = "block";
      }

      // Kích hoạt vẽ lại 2D
      if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
        Vec2D.draw2DAllVectors();
      }

      if (window.App && typeof App.showToast === "function") {
        App.showToast("Đã tính xong trị riêng và hiển thị đường " + conicState.conicType + "!", "success");
      }
    },

    onTaskSelect: function (taskId) {
      if (
        taskId === "quadratic_form_conic" ||
        taskId === "quadratic_form_canonical" ||
        taskId === "quadratic_form_sylvester"
      ) {
        this.execute();
        if (taskId === "quadratic_form_canonical") {
          const btn = document.getElementById("btnConicRotate");
          if (btn) {
            btn.style.boxShadow = "0 0 0 2px var(--primary-base)";
            setTimeout(() => { if (btn) btn.style.boxShadow = ""; }, 1500);
          }
        } else if (taskId === "quadratic_form_sylvester") {
          const btn = document.getElementById("btnConicSolution");
          if (btn) {
            btn.style.boxShadow = "0 0 0 2px var(--amber, #f59e0b)";
            setTimeout(() => { if (btn) btn.style.boxShadow = ""; }, 1500);
          }
        }
      } else {
        App.activeConicState = null;
        if (App.custom2DDrawHook === drawConicOnCanvas2D) {
          App.custom2DDrawHook = null;
        }
      }
    }
  };

  // Đăng ký vào registry
  if (typeof App.registerTopicModule === "function") {
    App.registerTopicModule("t7", Topic7Module);
  } else {
    window.addEventListener("DOMContentLoaded", function () {
      if (typeof App.registerTopicModule === "function") {
        App.registerTopicModule("t7", Topic7Module);
      }
    });
  }
})();
