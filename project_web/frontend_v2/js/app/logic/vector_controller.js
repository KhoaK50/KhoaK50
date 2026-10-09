// ===================== js/app/logic/vector_controller.js (FINAL DETAILED VERSION) =====================
(function () {
  window.App = window.App || {};
  App._pickUniqueHue = function () {
    // Thuật toán Góc Vàng: Màu rải đều, không bao giờ trùng, siêu nhanh
    const i = App.vectorList ? App.vectorList.length : 0;
    return (i * 137.508) % 360;
  };
  App.useAnimation = true;
  App.formatVectorShort = function (vec) {
    if (!Array.isArray(vec)) return "[]";

    const clean = (x) => {
      let n = Number(x);
      // Nếu sai số < 0.0001 thì ép về số nguyên luôn (3.00000012 -> 3)
      if (Math.abs(n - Math.round(n)) < 1e-4) return Math.round(n);
      return n;
    };

    return (
      "[" +
      vec
        .map((x) => {
          let v = clean(x);
          // Nếu có hàm formatScalar xịn thì dùng, không thì dùng string
          return typeof App.formatScalar === "function"
            ? App.formatScalar(v)
            : String(v);
        })
        .join(", ") +
      "]"
    );
  };

  // Hàm làm đẹp Nhãn Tọa độ (Ép tối đa 2 chữ số thập phân, tự cắt số 0 thừa)
  App.formatTip = function (vec) {
    if (!Array.isArray(vec)) return "[]";
    return "[" + vec.map(v => {
      let num = Number(v);
      if (isNaN(num)) return "0";
      // ToFixed(2) đảm bảo tối đa 2 số. Regex dọn dẹp số 0 vô dụng ở đuôi.
      return num.toFixed(2).replace(/\.?0+$/, "");
    }).join(", ") + "]";
  };

  // Biến đếm ID toàn cục (Reset được)
  let nextVectorId = 1;
  function smartFormat(num) {
    const val = Number(num);
    if (isNaN(val)) return "0";
    if (Math.abs(val) < 1e-9) return "0"; // Xử lý số 0

    const absVal = Math.abs(val);
    const sign = val < 0 ? "-" : "";

    // 1. Số nguyên (Nới lỏng sai số lên 1e-4 để bắt được cả số đã bị làm tròn)
    if (Math.abs(val - Math.round(val)) < 1e-4) return String(Math.round(val));

    // 2. Phân số
    for (let d = 2; d <= 50; d++) {
      let n = val * d;
      if (Math.abs(n - Math.round(n)) < 1e-4) {
        return `\\frac{${Math.round(n)}}{${d}}`;
      }
    }

    // --- TRUY NGƯỢC CĂN THỨC (Nới lỏng sai số và tăng phạm vi) ---
    // Sai số cho phép: 0.0005 (để bắt được 1.4953 so với 1.49534...)
    const TOLERANCE = 5e-4;

    // 3. Căn bậc 2: k * sqrt(n)
    for (let k = 1; k <= 10; k++) {
      const base = (absVal / k) ** 2;
      const roundBase = Math.round(base);
      if (Math.abs(base - roundBase) < TOLERANCE && roundBase < 1000) {
        const latexK = k === 1 ? "" : String(k);
        return `${sign}${latexK}\\sqrt{${roundBase}}`;
      }
    }

    // 4. Căn bậc 4: sqrt[4](n) (Ưu tiên kiểm tra trước căn bậc 3 vì dễ trùng)
    // Ví dụ: 1.4953 -> mũ 4 lên = 4.999... -> 5
    const pow4 = Math.pow(absVal, 4);
    if (Math.abs(pow4 - Math.round(pow4)) < TOLERANCE * 10) {
      // Nới lỏng hơn cho bậc cao
      return `${sign}\\sqrt[4]{${Math.round(pow4)}}`;
    }

    // 5. Căn bậc 3: k * cbrt(n)
    for (let k = 1; k <= 5; k++) {
      const base = (absVal / k) ** 3;
      const roundBase = Math.round(base);
      if (Math.abs(base - roundBase) < TOLERANCE && roundBase < 1000) {
        const latexK = k === 1 ? "" : String(k);
        return `${sign}${latexK}\\sqrt[3]{${roundBase}}`;
      }
    }

    // 6. Số Pi (k*pi)
    const divPi = absVal / Math.PI;
    if (Math.abs(divPi - Math.round(divPi)) < TOLERANCE) {
      const k = Math.round(divPi);
      return (k === 1 ? "" : String(k)) + "\\pi";
    }

    // 7. Chịu thua -> In số thập phân
    return Number(val)
      .toFixed(4)
      .replace(/\.?0+$/, "");
  }
  // Helper: Chuyển vector bất kỳ thành mảng [x, y, z] an toàn
  const toVec3 = function (v) {
    return [v?.[0] || 0, v?.[1] || 0, v?.[2] || 0];
  };

  /* =======================================================================
       PHẦN 1: TIỆN ÍCH & GIAO DIỆN
       ======================================================================= */

  

  // =======================================================================
  // CHUẨN HIỂN THỊ KẾT QUẢ THỐNG NHẤT (UNIFIED RESULT UI)
  // =======================================================================
  App.renderUnifiedResult = function (label, contentHtml) {
    if (!document.getElementById("unified-result-style")) {
      const style = document.createElement("style");
      style.id = "unified-result-style";
      style.innerHTML = `
            .unified-result-box {
                background: var(--card, #fff); 
                border: 1px solid var(--border, #e2e8f0); 
                border-left: 3px solid var(--accent, #3b82f6);
                border-radius: 2px; 
                padding: 10px 12px; 
                margin-top: 10px;
                font-family: inherit;
                box-shadow: none; 
                display: flex; 
                flex-direction: column; 
                gap: 6px;
            }
            .unified-result-label { 
                font-size: 10px; 
                text-transform: uppercase; 
                font-weight: 700; 
                color: var(--muted, #64748b); 
                letter-spacing: 0.5px; 
            }
            .unified-result-content { 
                font-size: 15px; 
                font-weight: 600; 
                color: var(--text, #0f172a); 
                overflow-x: auto; 
                -webkit-overflow-scrolling: touch; 
            }
            .unified-result-content math-field { 
                background: transparent; 
                border: none; 
                outline: none; 
                font-size: 15px; 
                color: inherit; 
                width: max-content; 
            }
            .calc-explanation-box {
                margin-top: 10px;
                font-size: 12px;
                line-height: 1.6;
                border: 1px solid var(--border, #e2e8f0);
                border-radius: 2px;
                padding: 10px 12px;
                background: var(--card, #fff);
                color: var(--fg, #0f172a);
            }
            .calc-explanation-title {
                font-size: 11px;
                font-weight: 700;
                color: var(--muted, #64748b);
                letter-spacing: 0.3px;
                margin-bottom: 8px;
            }
            .calc-section-title, .calc-explanation-section-title {
                font-size: 12px;
                font-weight: 700;
                color: var(--fg, #0f172a);
                letter-spacing: 0.2px;
                margin-top: 10px;
                margin-bottom: 5px;
                padding-bottom: 3px;
                border-bottom: 1px solid var(--border, #e2e8f0);
            }
            .calc-section-title:first-child, .calc-explanation-section-title:first-child {
                margin-top: 0;
            }
            .calc-explanation-block {
                margin-bottom: 8px;
                font-size: 12px;
                line-height: 1.65;
                color: var(--fg, #0f172a);
            }
            .calc-explanation-block:last-child {
                margin-bottom: 0;
            }
        `;
      document.head.appendChild(style);
    }
    return `
        <div class="unified-result-box">
            <div class="unified-result-label">${label}</div>
            <div class="unified-result-content">${contentHtml}</div>
        </div>
    `;
  };

  App.renderExplanationBox = function (detailsHtml, title = "Chi tiết phép tính") {
    if (!detailsHtml) return "";
    return `
      <div class="calc-explanation-box">
        <div class="calc-explanation-title">${title}</div>
        <div class="calc-explanation-content" style="overflow-x: auto;">${detailsHtml}</div>
      </div>
    `;
  };

  // Xử lý khi danh sách vector trống (FIX LỖI KẸT VIỀN ĐỎ)
  App.handleEmptyListAction = function () {
    if (App.vectorList.length === 0) {
      App.showToast("Danh sách trống! Hãy tạo vector ở đây trước 👇");
      const createCard = document.getElementById("card-create");
      if (createCard) {
        createCard.scrollIntoView({ behavior: "smooth", block: "center" });
        const inp = document.getElementById("vectorInput");
        if (inp) {
          inp.focus();
          // Dùng CSS class thay vì ép cứng style để không bao giờ bị kẹt màu
          inp.classList.remove("input-error-flash");
          void inp.offsetWidth; // Kích hoạt chạy lại animation
          inp.classList.add("input-error-flash");
          setTimeout(() => inp.classList.remove("input-error-flash"), 1000);
        }
      }
      return true;
    }
    return false;
  };

  // Áp dụng Theme (Dark/Light)
  App.applyTheme = function () {
    const isDark = App.theme === "dark";
    if (document.documentElement) {
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("dark-theme", isDark);
    }
    if (document.body) {
      document.body.classList.toggle("dark", isDark);
      document.body.classList.toggle("dark-theme", isDark);
    }
    const themeBadge = document.getElementById("themeBadge");
    if (themeBadge) {
      themeBadge.textContent = `Theme: ${isDark ? "Dark" : "Light"}`;
    }

    if (typeof App.refreshHaloColors === "function") App.refreshHaloColors();

    if (App.mode === "2D" && window.Vec2D) {
      Vec2D.draw2DAllVectors();
    }

    if (window.Vec3D && Vec3D._scene) {
      Vec3D._scene.background = new THREE.Color(App.getCSS("--bg"));
      Vec3D.update3DHelpersBase();
      Vec3D.hardRefresh3D(false);
      if (App.currentAngleVisual3D) Vec3D.refreshAngleTheme();
    }

    if (App.mode === "2D" && App.currentAngleVisual2D && window.Vec2D) {
      const g2 = App.currentAngleVisual2D;
      Vec2D.drawAngleArc2D(g2.a, g2.b, g2.deg);
    }
  };

  function triggerThemeAnim(isDark) {
    const s = document.getElementById("sunIcon");
    const m = document.getElementById("moonIcon");
    if (!s || !m) return;

    // Reset animation cũ để có thể chạy lại
    s.classList.remove("animate-rise-fade");
    m.classList.remove("animate-rise-fade");

    // Hack: Buộc trình duyệt vẽ lại (reflow) để nhận diện reset
    void s.offsetWidth;

    // Thêm class để chạy animation
    if (isDark) m.classList.add("animate-rise-fade");
    else s.classList.add("animate-rise-fade");
  }

  // [SỬA] Cập nhật hàm toggleTheme để đồng bộ ThemeManager và hiệu ứng
  App.toggleTheme = function () {
    if (typeof ThemeManager !== "undefined" && typeof ThemeManager.toggle === "function") {
      ThemeManager.toggle();
    } else {
      App.theme = App.theme === "light" ? "dark" : "light";
      App.applyTheme();
      localStorage.setItem("vec_theme", App.theme);
    }
  };

  App.toggleAuto = function () {
    const btn = document.getElementById("btnAuto");
    App.autoMode = !App.autoMode;
    if (btn) {
      btn.textContent = App.autoMode
        ? "Tự động chuyển chiều không gian: BẬT"
        : "Tự động chuyển chiều không gian: TẮT";
    }
  };

  // Xử lý vẽ đè góc (Angle Overlay) khi chuyển chế độ
  App._portAngleOverlay = function (toMode) {
    if (toMode === "3D") {
      if (!window.Vec3D) return;
      if (App.currentAngleVisual3D) {
        Vec3D.refreshAngleTheme();
        return;
      }
      const g2 = App.currentAngleVisual2D;
      if (g2) {
        const deg = parseFloat(String(g2.deg));
        if (isFinite(deg)) {
          const rad = (deg * Math.PI) / 180;
          Vec3D.drawAngleArc3D(
            [g2.a[0], g2.a[1], 0],
            [g2.b[0], g2.b[1], 0],
            rad,
            deg,
          );
        }
      }
    } else if (toMode === "2D") {
      if (!window.Vec2D) return;
      if (App.currentAngleVisual2D) {
        Vec2D.drawAngleArc2D(
          App.currentAngleVisual2D.a,
          App.currentAngleVisual2D.b,
          App.currentAngleVisual2D.deg,
        );
        return;
      }
      const g3 = App.currentAngleVisual3D;
      const src = g3?.userData?.angleMeta?.src;
      if (src?.a && src?.b) {
        const ax = src.a[0],
          ay = src.a[1],
          bx = src.b[0],
          by = src.b[1];
        const la = Math.hypot(ax, ay),
          lb = Math.hypot(bx, by);
        if (la > 1e-9 && lb > 1e-9) {
          let c = (ax * bx + ay * by) / (la * lb);
          c = Math.max(-1, Math.min(1, c));
          const rad = Math.acos(c);
          Vec2D.drawAngleArc2D([ax, ay], [bx, by], (rad * 180) / Math.PI);
        }
      }
    }
  };

  App.toggleMode = function () {
    const to3D = App.mode === "2D";
    App.mode = to3D ? "3D" : "2D";

    if (document.body) {
      document.body.classList.toggle("mode-3d", to3D);
      document.body.classList.toggle("mode-2d", !to3D);
    }

    const modeBadge = document.getElementById("modeBadgeText");
    if (modeBadge) modeBadge.textContent = `${App.mode}`;
    const modeIcon = document.getElementById("modeBadgeIcon");
    if (modeIcon) modeIcon.className = App.mode === "3D" ? "ph ph-cube" : "ph ph-bounding-box";

    const axisPanel = document.getElementById("axisControls");
    if (axisPanel) axisPanel.style.display = to3D ? "inline-flex" : "none";

    const btnNori = document.getElementById("btnNoriEntity");
    if (btnNori) btnNori.style.display = to3D ? "none" : "";
    
    if (to3D) {
      if (window.Vec3D) {
        if (!Vec3D._scene) Vec3D.init3D();
        Vec3D.removeNoriHamsterEntity3D?.();
        Vec3D.show3D();
        Vec3D.resetView();
        App._portAngleOverlay("3D");
      }
    } else {
      if (window.Vec2D) {
        Vec2D.show2D();
        Vec2D.resetView();
        App._portAngleOverlay("2D");
      }
    }
    if (typeof App.refreshProjectionOverlay === "function") {
      App.refreshProjectionOverlay();
    }
    if (typeof App.refreshTransformTab === "function") {
      App.refreshTransformTab();
    }
  };

  App.clearAngleOverlay = function () {
    App.currentAngleVisual2D = null;
    const angEl = document.getElementById("result_angle");
    if (angEl) angEl.innerText = "-";
    if (window.Vec3D) {
      Vec3D.clearAngle();
      if (App.mode === "3D") Vec3D.hardRefresh3D(false);
    }
  };

  // Vẽ lại toàn bộ (Gọi cả 2D và 3D)
  App.redrawAll = function (opts) {
    opts = opts || { frame: true };
    if (App.mode === "2D") {
      if (window.Vec2D) {
        Vec2D.show2D();
        // Vẽ các vector thường
        Vec2D.draw2DAllVectors();

        // [CẤU HÌNH ĐẶC BIỆT]: Nếu là phép chiếu 3D đang xem ở 2D,
        // ta phải tính lại hình chiếu 2D của vector 3D đó dựa trên tọa độ thực.
        if (App.currentProjVisual) {
          // Tự tính lại vector hình chiếu dựa trên công thức toán học
          // để hình ảnh hiển thị không bị "lừa mắt"
          App._drawCorrectedProjection2D();
        }
      }
    } else {
      if (window.Vec3D) {
        Vec3D.show3D();
        Vec3D.draw3DAllVectors({ frame: opts.frame });
      }
    }
    if (typeof App.refreshProjectionOverlay === "function") {
      App.refreshProjectionOverlay();
    }
  };

  // --- PHẦN TẠO VECTOR ---

  // Helper tạo Object Vector mới
  App._attachVectorItem = function (vec, hue) {
    const lightness = nextVectorId % 2 === 0 ? 50 : 65;
    return {
      id: nextVectorId++, // ID tăng dần
      vec: vec,
      colorHex:
        typeof App.hslToHex === "function"
          ? App.hslToHex((hue % 360) / 360, 0.85, 0.6)
          : `hsl(${hue}, 85%, 60%)`,
      colorCss: `hsl(${hue}, 85%, ${lightness}%)`,
      haloCss: `hsl(${hue}, 85%, ${lightness + 20}%)`,
      visible: true,
      focus: false,
      highlighted: false,
      alpha: 1,
    };
  };

  App.editingVectorId = null;

  // Hủy chế độ sửa vector và khôi phục nút Thêm
  App.cancelEditVector = function () {
    if (App.editingVectorId === null) return;
    App.editingVectorId = null;
    const btn = document.getElementById("btnDraw") || document.getElementById("btnAddVector");
    if (btn) {
      btn.innerHTML = '<i class="ph ph-plus" style="margin-right:6px;"></i> Thêm Vector';
      btn.classList.remove("success");
      btn.classList.add("primary");
    }
  };

  // Bắt đầu sửa vector: nạp công thức lên form nhập liệu chính
  App.startEditVector = function (id) {
    const item = (App.vectorList || []).find((v) => v.id === id);
    if (!item) return;

    App.editingVectorId = id;

    // Switch tab qua tạo vector nếu đang ở tab khác
    const createSelect = document.getElementById("createObjectSelect");
    if (createSelect && createSelect.value !== "vector") {
      createSelect.value = "vector";
      createSelect.dispatchEvent(new Event("change"));
    }

    const inp = document.getElementById("vectorInput");
    if (inp) {
      let valToEdit = "";
      if (item.isParametric && item.rawInput) {
        valToEdit = item.rawInput;
      } else if (item.isParametric && item.rawExprs && Array.isArray(item.rawExprs)) {
        valToEdit = `[${item.rawExprs.join(", ")}]`;
      } else if (item.vec && Array.isArray(item.vec)) {
        valToEdit = App.formatVectorShort ? App.formatVectorShort(item.vec) : `[${item.vec.join(", ")}]`;
      } else if (item.rawInput) {
        valToEdit = item.rawInput;
      } else if (item.latex) {
        valToEdit = item.latex;
      }
      inp.value = valToEdit;
      if (typeof inp.focus === "function") inp.focus();
      if (typeof App.updateVectorInputPreview === "function") {
        App.updateVectorInputPreview(valToEdit);
      }
    }

    // Đổi nút bấm thành "Lưu Vector"
    const btn = document.getElementById("btnDraw") || document.getElementById("btnAddVector");
    if (btn) {
      btn.innerHTML = '<i class="ph ph-check" style="margin-right:6px;"></i> Lưu Vector';
      btn.classList.remove("primary");
      btn.classList.add("success");
    }

    // Scroll mượt lên form tạo vector
    const cardCreate = document.getElementById("card-create") || document.querySelector(".section-create");
    if (cardCreate && typeof cardCreate.scrollIntoView === "function") {
      cardCreate.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Hàm xử lý sự kiện nút "Thêm Vector" / "Lưu Vector"
  App.onAddVector = function () {
    const inp = document.getElementById("vectorInput");
    if (!inp) return;

    // 1. Lấy dữ liệu thô và dọn dẹp token rỗng
    const raw = (inp.value || "").trim();
    const cleanStr = App.cleanVectorInput ? App.cleanVectorInput(raw) : raw;

    // Nếu ô nhập hoàn toàn trống rỗng: nhẹ nhàng focus, không quăng lỗi hay rung lắc
    if (!cleanStr || cleanStr === "[]" || cleanStr === "[,]") {
      if (typeof inp.focus === "function") inp.focus();
      return;
    }

    let v;
    try {
      v = App.parseVectorExpr(cleanStr);
      if (!v || !Array.isArray(v) || v.length < 2) {
        App.showToast("Vector cần tối thiểu 2 tọa độ (ví dụ: [1, 2] hoặc [root(3, 8), log_2(4)]). Không thể tạo vector từ 1 số vô hướng.", "warning");
        return;
      }

      if (v.length > 5) {
        App.showToast("Vector tối đa 5 chiều để đảm bảo hiệu suất tính toán");
        return;
      }

      if (v.some((val) => val === null || val === undefined || isNaN(Number(val)))) {
        App.showToast("Tọa độ có chứa giá trị không phải là số hợp lệ");
        return;
      }
    } catch (err) {
      App.showToast("Cú pháp chưa chuẩn xác: " + err.message);
      return;
    }

    App.currentVector = v.slice();
    App.firstDrawForVector = true;

    // Chuẩn hóa định dạng LaTeX
    let latexFormatted = "";
    if (v.rawExprs && Array.isArray(v.rawExprs)) {
      const latexParts = v.rawExprs.map((expr) => App.exprToLatex(expr));
      latexFormatted = `[${latexParts.join(", ")}]`;
    } else {
      const rawParts = (App.splitVectorCoordinates ? App.splitVectorCoordinates(cleanStr) : cleanStr.replace(/[\[\]\(\)]/g, "").split(/[,;]/)).map((p) => p.trim()).filter((p) => p.length > 0);
      const latexParts = rawParts.map((p) => App.exprToLatex(p));
      latexFormatted = `[${latexParts.join(", ")}]`;
    }

    // 2. NẾU ĐANG Ở CHẾ ĐỘ SỬA VECTOR CŨ (App.editingVectorId !== null):
    if (App.editingVectorId !== null) {
      const targetIdx = (App.vectorList || []).findIndex((it) => it.id === App.editingVectorId);
      if (targetIdx >= 0) {
        const item = App.vectorList[targetIdx];
        item.vec = v.slice();
        item.rawInput = cleanStr;
        item.latex = latexFormatted;
        item.isParametric = !!v.isParametric;
        if (v.isParametric) {
          item.paramVar = v.paramVar || "t";
          item.vars = v.vars || [item.paramVar];
          item.rawExprs = v.rawExprs;
          item.fn = v.fn;
          item.evalParam = v.evalParam;
          item.eval2D = v.eval2D;
          item.initialParamVal = item.paramVal ?? 1.0;
          item.initialVec = v.slice();
          if (item.showArrow === undefined) item.showArrow = true;
          if (item.showTrajectory === undefined) item.showTrajectory = true;
          if (item.showAreaFill === undefined) item.showAreaFill = false;
          if (item.surfaceOpacity === undefined) item.surfaceOpacity = 0.45;
          if (!item.varRanges) item.varRanges = {};
          item.vars.forEach((vName, idx) => {
            if (!item.varRanges[vName]) {
              item.varRanges[vName] = {
                min: idx === 0 ? (item.paramMin ?? -10.0) : (item.surfaceMin ?? -5.0),
                max: idx === 0 ? (item.paramMax ?? 10.0) : (item.surfaceMax ?? 5.0)
              };
            }
          });
          if (!item.scopeValues) {
            item.scopeValues = { t: 1.0, m: 1.0, u: 1.0, v: 1.0, x: 2.0, y: 1.0, z: 1.0 };
          }
          if (Array.isArray(item.vars)) {
            item.vars.forEach((vName) => {
              if (item.scopeValues[vName] === undefined) {
                item.scopeValues[vName] = 1.0;
              }
            });
          }
          if (!item.activeAnimVars || !Array.isArray(item.activeAnimVars)) {
            item.activeAnimVars = item.vars && item.vars.length ? [...item.vars] : [item.paramVar || "t"];
          }
        } else {
          item.vars = null;
          item.rawExprs = null;
          item.fn = null;
          item.evalParam = null;
          item.eval2D = null;
        }

        if (App.History && typeof App.History.record === "function") {
          App.History.record(`Sửa vector #${item.id}`);
        }

        App.editingVectorId = null;
        const btn = document.getElementById("btnDraw") || document.getElementById("btnAddVector");
        if (btn) {
          btn.innerHTML = '<i class="ph ph-plus" style="margin-right:6px;"></i> Thêm Vector';
          btn.classList.remove("success");
          btn.classList.add("primary");
        }

        if (App.syncParametricControls) App.syncParametricControls();
        if (App.renderVectorList) App.renderVectorList(false);
        if (App.refreshCalcVectorOptions) App.refreshCalcVectorOptions();
        if (App.renderExtraCalcOptions) App.renderExtraCalcOptions();
        if (App.autoMode) {
          const is3D = v.length >= 3;
          App.mode = is3D ? "3D" : "2D";
          if (document.body) {
            document.body.classList.toggle("mode-3d", is3D);
            document.body.classList.toggle("mode-2d", !is3D);
          }
          const mb = document.getElementById("modeBadgeText");
          if (mb) mb.textContent = `${App.mode}`;
          const mi = document.getElementById("modeBadgeIcon");
          if (mi) mi.className = App.mode === "3D" ? "ph ph-cube" : "ph ph-bounding-box";
          if (is3D && window.Vec3D) Vec3D.show3D();
          else if (!is3D && window.Vec2D) Vec2D.show2D();
        }
        if (App.redrawAll) App.redrawAll({ frame: false });
        if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
        return;
      }
      App.editingVectorId = null;
    }

    // 3. TẠO MỚI VECTOR
    const hue = App._pickUniqueHue ? App._pickUniqueHue() : Math.random() * 360;
    const item = App._attachVectorItem(v, hue);
    item.rawInput = cleanStr;
    item.latex = latexFormatted;

    // Gắn thuộc tính tham số nếu vector phụ thuộc biến
    if (v.isParametric) {
      item.isParametric = true;
      item.paramVar = v.paramVar || "t";
      item.vars = v.vars || [item.paramVar];
      item.rawExprs = v.rawExprs;
      item.fn = v.fn;
      item.evalParam = v.evalParam;
      item.eval2D = v.eval2D;
      item.scopeValues = { t: 1.0, m: 1.0, u: 1.0, v: 1.0, x: 2.0, y: 1.0, z: 1.0 };
      if (item.vars && Array.isArray(item.vars)) {
        item.vars.forEach((vName) => {
          if (item.scopeValues[vName] === undefined) {
            item.scopeValues[vName] = 1.0;
          }
        });
      }
      if (item.paramVar) {
        item.scopeValues[item.paramVar] = 1.0;
      }
      item.paramVal = 1.0;
      item.initialParamVal = 1.0;
      item.initialVec = v.slice();
      item.paramMin = -10.0;
      item.paramMax = 10.0;
      item.paramInfinity = false;
      item.surfaceMin = -5.0;
      item.surfaceMax = 5.0;
      item.duration = 4.0;
      item.isAnimating = false;
      item.showArrow = true;
      item.showTrajectory = true;
      item.showAreaFill = false;
      item.surfaceOpacity = 0.45;
      item.surfaceColor = item.colorHex || "#0090ff";
      item.activeAnimVars = item.vars && item.vars.length ? [...item.vars] : [item.paramVar || "t"];
      item.varRanges = {};
      if (item.vars && Array.isArray(item.vars)) {
        item.vars.forEach((vName, idx) => {
          item.varRanges[vName] = {
            min: idx === 0 ? -10.0 : -5.0,
            max: idx === 0 ? 10.0 : 5.0
          };
        });
      } else if (item.paramVar) {
        item.varRanges[item.paramVar] = { min: -10.0, max: 10.0 };
      }
    }

    if (App.History && typeof App.History.record === "function") {
      App.History.record(`Thêm vector #${item.id}`);
    }

    App.vectorList.push(item);
    if (App.syncParametricControls) App.syncParametricControls();

    // Nếu user đang gõ tìm kiếm thì phải vẽ lại toàn bộ để lọc. 
    // Nếu không, chỉ gắn nối tiếp vector mới vào cuối để chống lag.
    const searchInp = document.getElementById("mainVecSearch");
    const isSearching = searchInp && searchInp.value.trim() !== "";
    
    if (App.renderVectorList) App.renderVectorList(!isSearching);
    if (App.refreshCalcVectorOptions) App.refreshCalcVectorOptions();
    if (App.renderExtraCalcOptions) App.renderExtraCalcOptions();

    if (App.autoMode) {
      const is3D = v.length >= 3;
      App.mode = is3D ? "3D" : "2D";
      if (document.body) {
        document.body.classList.toggle("mode-3d", is3D);
        document.body.classList.toggle("mode-2d", !is3D);
      }
      const mb = document.getElementById("modeBadgeText");
      if (mb) mb.textContent = `${App.mode}`;
      const mi = document.getElementById("modeBadgeIcon");
      if (mi) mi.className = App.mode === "3D" ? "ph ph-cube" : "ph ph-bounding-box";
      
      const axisPanel = document.getElementById("axisControls");
      if (axisPanel) axisPanel.style.display = is3D ? "inline-flex" : "none";
      if (is3D && window.Vec3D) Vec3D.show3D();
      else if (!is3D && window.Vec2D) Vec2D.show2D();
    }
    // Bật chế độ sinh tồn: Quá 50 vector thì ẩn nhãn 3D để cứu CPU
   if (App.vectorList.length === 51) {
       // CHỈ BÁO ĐÚNG 1 LẦN khi vừa vượt mốc 50
       App.showToast("Đã vượt 50 vector! Tự động ẩn nhãn 3D để chống giật lag.", "warning");
   }

   if (App.vectorList.length > 50) {
       document.body.classList.add("overload-3d");
   } else {
       document.body.classList.remove("overload-3d");
   }
    if (App.redrawAll) App.redrawAll({ frame: false });
    if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
  };

  // Hàm xóa hết vector (FIX LỖI DANH SÁCH VECTOR KHÔNG BIẾN MẤT)
  App.clearAllVectors = function () {
    if (App.editingVectorId !== null) {
      App.editingVectorId = null;
      const btn = document.getElementById("btnDraw") || document.getElementById("btnAddVector");
      if (btn) {
        btn.innerHTML = '<i class="ph ph-plus" style="margin-right:6px;"></i> Thêm Vector';
        btn.classList.remove("success");
        btn.classList.add("primary");
      }
    }
    if (!App.vectorList || App.vectorList.length === 0) {
      if (typeof App.showToast === "function") App.showToast("Danh sách vector đã trống rồi!", "warning");
      return;
    }
    if (App.History && typeof App.History.record === "function" && App.vectorList.length > 0) {
      App.History.record("Xóa tất cả vector");
    }
    App.vectorList.length = 0;
    nextVectorId = 1;
    if (App.usedHues) App.usedHues.clear();
    if (App.selectedVectorIds) App.selectedVectorIds.clear();
    if (typeof App.syncSelectedVectorsToCalc === "function") App.syncSelectedVectorsToCalc();

    const toastContainer = document.getElementById("toast-container");
    if (toastContainer) toastContainer.innerHTML = "";

    App.clearAngleOverlay();

    // --- CHỖ NÀY QUAN TRỌNG: Cập nhật TẤT CẢ giao diện ---
    if (App.renderVectorList) App.renderVectorList();
    if (App.refreshCalcVectorOptions) App.refreshCalcVectorOptions();
    if (App.renderExtraCalcOptions) App.renderExtraCalcOptions(); // Lệnh này giúp dọn dẹp mấy cái Checklist cũ!
    if (App.syncParametricControls) App.syncParametricControls();

    const badge = document.getElementById("vecCountBadge");
    if (badge) badge.textContent = "(0)";

    // Xóa luôn text kết quả cũ đang hiển thị
    ["result_indep", "result_rank", "result_basis", "result_coord"].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) el.innerText = "-";
      },
    );

    App.redrawAll({ frame: true });
    if (typeof App.showToast === "function") App.showToast("Đã xóa toàn bộ vector");
  };

  /* =======================================================================
       PHẦN 2: LOGIC TÍNH TOÁN & KÍCH HOẠT ANIMATION
       ======================================================================= */

  function vectorById(id) {
    const item = App.vectorList.find(function (v) {
      return v.id === id;
    });
    if (!item) return null;
    
    if (item.isParametric) {
      return item.vec.map((x) => String(Math.round(x * 10000) / 10000));
    }

    if (item.latex) {
        let s = item.latex.replace(/^\\left\[|^\[|\\right\]|\]$/g, "");
        return s.split(",").map((x) => x.trim());
    }
    return item.vec;
  }

  App.refreshCalcUI = function (keepSelection = false) {
    const opEl = document.getElementById("opSelect");
    if (!opEl) return;

    const op = opEl.value;
    const v1 = document.getElementById("v1Select");
    const v2 = document.getElementById("v2Select");
    const v1Label = document.getElementById("v1Label");
    const v2Box = document.getElementById("v2Box");
    const scalarBox = document.getElementById("scalarBox");
    const calcInputsGrid = document.getElementById("calcInputsGrid");
    const btnCompute = document.getElementById("btnCompute");
    const btnReplay = document.getElementById("btnVectorReplay");

    // 1. Reset về placeholder "-- Chọn vector --" khi đổi phép tính
    if (!keepSelection) {
      if (v1) { v1.value = ""; v1.selectedIndex = 0; }
      if (v2) { v2.value = ""; v2.selectedIndex = 0; }
      if (btnReplay) btnReplay.style.display = "none";
      App._lastVectorOp = null;

      // Xóa toàn bộ tàn dư hình chiếu, góc, bóng ma
      App.currentProjVisual = null;
      App.tempGhosts = [];
      if (App._currentProjLine3D && App._currentProjLine3D.parent) {
        App._currentProjLine3D.parent.remove(App._currentProjLine3D);
        App._currentProjLine3D = null;
      }
      if (App._projGroup3D && App._projGroup3D.parent) {
        App._projGroup3D.clear();
        App._projGroup3D.parent.remove(App._projGroup3D);
        App._projGroup3D = null;
      }
      if (typeof App.clearAngleOverlay === "function") App.clearAngleOverlay();
      if (typeof App.refreshProjectionOverlay === "function") App.refreshProjectionOverlay();
      if (typeof App.updateVisibilityByCalc === "function") App.updateVisibilityByCalc();
      if (typeof App.redrawAll === "function") App.redrawAll({ frame: false });
    }

    if (!v2Box || !scalarBox) return;

    if (op === "scale") {
      if (v1Label) v1Label.textContent = "Vector (v)";
      v2Box.style.display = "none";
      scalarBox.style.display = "block";
      if (calcInputsGrid) calcInputsGrid.style.gridTemplateColumns = "1fr 1fr";
    } else if (op === "normalize" || op === "vector_norm") {
      if (v1Label) v1Label.textContent = "Vector (v)";
      v2Box.style.display = "none";
      scalarBox.style.display = "none";
      if (calcInputsGrid) calcInputsGrid.style.gridTemplateColumns = "1fr";
    } else {
      if (v1Label) v1Label.textContent = "Vector 1 (v1)";
      v2Box.style.display = "block";
      scalarBox.style.display = "none";
      if (calcInputsGrid) calcInputsGrid.style.gridTemplateColumns = "1fr 1fr";
    }

    if (btnCompute) {
      const measureOps = ["dot", "vector_norm", "angle_between"];
      btnCompute.textContent = measureOps.includes(op)
        ? "Tính toán"
        : "Thực hiện";
    }

    const s = document.getElementById("calcSteps");
    if (s) {
      s.innerHTML = "Kết quả phép tính sẽ hiển thị ở đây.";
      s.style.color = "";
    }
    if (btnReplay && (!App._lastVectorOp || App._lastVectorOp.op !== op)) {
      btnReplay.style.display = "none";
    }
  };

  // --- MAIN FUNCTION: CHẠY TÍNH TOÁN ---
  App.runCalc = async function (addToList) {
    if (App.handleEmptyListAction()) return;

    const op = document.getElementById("opSelect").value;
    const id1 = Number(document.getElementById("v1Select").value);
    const id2 = Number(document.getElementById("v2Select").value);
    const scalarInp = document.getElementById("scalarInp");
    const calcSteps = document.getElementById("calcSteps");

    const v1 = vectorById(id1);
    const needsV2 = !["scale", "normalize", "vector_norm"].includes(op);
    const v2 = needsV2 ? vectorById(id2) : null;

    let payload = null;
    try {
      if (!v1) throw needsV2 ? "Chưa chọn Vector 1." : "Chưa chọn vector.";
      if (needsV2 && !v2) throw "Chưa chọn Vector 2.";

      if (op === "add" || op === "sub" || op === "subtract") payload = { v1, v2 };
      else if (op === "scale") {
        let k = scalarInp ? scalarInp.value.trim() : "";
        if (!k) throw "Hệ số k không được để trống.";
        k = k
          .replace(/√\s*([0-9.]+)/g, "sqrt($1)")
          .replace(/√/g, "sqrt")
          .replace(/π/g, "pi");
        payload = { v: v1, scalar: k };
      } else if (op === "cross") payload = { v1, v2 };
      else if (op === "normalize") payload = { v: v1 };
      else if (op === "projection") payload = { v: v1, u: v2 };
      else if (op === "dot") payload = { v1, v2 };
      else if (op === "vector_norm") payload = { v: v1 };
      else if (op === "angle_between") payload = { v1, v2 };
    } catch (err) {
      App.showToast(String(err));
      return;
    }

    const mapOpToApi = {
      add: "add_vectors",
      sub: "sub_vectors",
      subtract: "sub_vectors",
      scale: "scale_vector",
      cross: "cross_product",
      normalize: "normalize",
      projection: "projection",
      dot: "dot_product",
      vector_norm: "vector_norm",

      angle_between: "angle_between",
    };

    calcSteps.innerHTML = "Đang tính...";
    try {
      let data = await App.callAPI(mapOpToApi[op], payload);
      if (data.error) throw data.error;

      // 1. Xử lý kết quả vô hướng
      if (["dot", "vector_norm", "angle_between"].includes(op)) {
        let val = data.result;
        if (op === "angle_between") {
          const deg = (val * 180) / Math.PI;
          if (App.mode === "2D" && window.Vec2D)
            Vec2D.drawAngleArc2D(v1, v2, deg);
          else if (window.Vec3D) Vec3D.drawAngleArc3D(v1, v2, val, deg);

          const v1Vec = App.vectorList.find(v => v.id === id1);
          const v2Vec = App.vectorList.find(v => v.id === id2);
          let detailsHtml = "";
          if (v1Vec && v2Vec) {
            const v1Name = `\\vec{v}_{${id1}}`;
            const v2Name = id1 === id2 ? `\\vec{v}_{${id1}}` : `\\vec{v}_{${id2}}`;
            const v1NormSq = v1Vec.vec.reduce((s, x) => s + x * x, 0);
            const v2NormSq = v2Vec.vec.reduce((s, x) => s + x * x, 0);
            const v1Norm = Math.sqrt(v1NormSq);
            const v2Norm = Math.sqrt(v2NormSq);
            const dotProduct = v1Vec.vec.reduce((s, x, i) => s + x * (v2Vec.vec[i] || 0), 0);
            const denom = v1Norm * v2Norm;
            const cosVal = denom > 1e-9 ? (dotProduct / denom) : (dotProduct >= 0 ? 1 : -1);

            let angleCategory = "";
            if (Math.abs(deg - 90) < 1e-4) {
              angleCategory = "Hai vector trực giao (vuông góc chính xác trong không gian Euclide, tích vô hướng bằng 0).";
            } else if (Math.abs(deg) < 1e-4) {
              angleCategory = "Hai vector cùng phương và cùng chiều (hệ số tương quan tuyến tính dương, góc lệch 0°).";
            } else if (Math.abs(deg - 180) < 1e-4) {
              angleCategory = "Hai vector cùng phương nhưng ngược chiều (hệ số tương quan tuyến tính âm, góc lệch 180°).";
            } else if (deg < 90) {
              angleCategory = "Góc nhọn: cos(θ) > 0, hình chiếu trực giao cùng hướng với vector chiếu.";
            } else {
              angleCategory = "Góc tù: cos(θ) < 0, hình chiếu trực giao ngược hướng với vector chiếu.";
            }

            detailsHtml = `
              <div class="calc-section-title">Khung định nghĩa đại số</div>
              <div class="calc-explanation-block">
                Trong không gian Euclide \\( \\mathbb{R}^n \\), góc \\( \\theta \\in [0, \\pi] \\) giữa hai vector khác không được xác định duy nhất qua tích vô hướng chính tắc:<br/>
                \\( \\cos(\\theta) = \\frac{\\langle \\vec{u}, \\vec{v} \\rangle}{\\|\\vec{u}\\| \\|\\vec{v}\\|} = \\frac{\\vec{u} \\cdot \\vec{v}}{\\|\\vec{u}\\| \\|\\vec{v}\\|} \\implies \\theta = \\arccos\\left( \\frac{\\vec{u} \\cdot \\vec{v}}{\\|\\vec{u}\\| \\|\\vec{v}\\|} \\right) \\)
              </div>
              <div class="calc-section-title">Quá trình tính toán chi tiết</div>
              <div class="calc-explanation-block">
                ${id1 === id2 ? `• Vector: \\( ${v1Name} = [${v1Vec.vec.join(", ")}] \\)<br/>` : `• Vector thứ nhất: \\( ${v1Name} = [${v1Vec.vec.join(", ")}] \\)<br/>• Vector thứ hai: \\( ${v2Name} = [${v2Vec.vec.join(", ")}] \\)<br/>`}
                • Tích vô hướng: \\( ${v1Name} \\cdot ${v2Name} = ` + v1Vec.vec.map((x,i) => `(${x})(${v2Vec.vec[i]})`).join(' + ') + ` = ${dotProduct} \\)<br/>
                • Chuẩn Euclide vector 1: \\( \\|${v1Name}\\| = \\sqrt{` + v1Vec.vec.map(x => `(${x})^2`).join(' + ') + `} \\approx ${v1Norm.toFixed(4)} \\)<br/>
                • Chuẩn Euclide vector 2: \\( \\|${v2Name}\\| = \\sqrt{` + v2Vec.vec.map(x => `(${x})^2`).join(' + ') + `} \\approx ${v2Norm.toFixed(4)} \\)<br/>
                • Giá trị cosin: \\( \\cos(\\theta) = \\frac{${dotProduct}}{${denom.toFixed(4)}} \\approx ${cosVal.toFixed(4)} \\implies \\theta = ${deg.toFixed(2)}^\\circ \\)
              </div>
              <div class="calc-section-title">Ý nghĩa hình học & Bản chất không gian</div>
              <div class="calc-explanation-block">
                • <b>Độ lệch hướng trong không gian con:</b> Số đo góc \\( \\theta = ${deg.toFixed(2)}^\\circ \\) đo lường độ lệch định hướng giữa hai vector chỉ phương trong mặt phẳng 2 chiều căng bởi \\( \\{${v1Name}, ${v2Name}\\} \\).<br/>
                • <b>Phân loại hình học:</b> ${angleCategory}
              </div>
            `;
          }

          calcSteps.innerHTML = App.renderUnifiedResult(
            "GÓC GIỮA 2 VECTOR",
            `${deg.toFixed(2)}°`,
          ) + App.renderExplanationBox(detailsHtml);

          if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([calcSteps]).catch(console.warn);
          }

          if (window.App.PaperLogger) {
            const ltx = `\\angle(\\vec{v}_{${id1}}, \\vec{v}_{${id2}}) = ${deg.toFixed(2)}^\\circ`;
            App.PaperLogger.log("Góc giữa 2 vector", ltx, detailsHtml, null, { type: 'angle_between', vectors: [id1, id2] });
          }
          if (App.useAnimation && typeof App.animateOperation === "function") {
              App.animateOperation("angle_between", [id1, id2], val);
          }
        } else {
          let ltx = "";
          let title = "Phép tính vô hướng";
          let detailsHtml = "";
          const v1Vec = App.vectorList.find(v => v.id === id1);
          const v2Vec = App.vectorList.find(v => v.id === id2);
          if (op === "dot") { 
             title = "Tích vô hướng"; 
             ltx = `\\vec{v}_{${id1}} \\cdot \\vec{v}_{${id2}} = ${val}`; 
             if (v1Vec && v2Vec) {
               const v1Name = `\\vec{v}_{${id1}}`;
               const v2Name = id1 === id2 ? `\\vec{v}_{${id1}}` : `\\vec{v}_{${id2}}`;
               let angleNature = "";
               if (Math.abs(val) < 1e-6) {
                 angleNature = "Tích vô hướng bằng 0: Hai vector trực giao (vuông góc chính xác trong không gian Euclide).";
               } else if (val > 0) {
                 angleNature = "Tích vô hướng dương: Góc kẹp giữa hai vector là góc nhọn (hình chiếu trực giao cùng chiều với trục chiếu).";
               } else {
                 angleNature = "Tích vô hướng âm: Góc kẹp giữa hai vector là góc tù (hình chiếu trực giao ngược chiều với trục chiếu).";
               }

               detailsHtml = `
                 <div class="calc-section-title">Khung định nghĩa đại số</div>
                 <div class="calc-explanation-block">
                   Tích vô hướng chính tắc (Euclidean inner product) trong không gian \\( \\mathbb{R}^n \\) là ánh xạ song tuyến tính đối xứng xác định dương:<br/>
                   \\( \\langle \\vec{u}, \\vec{v} \\rangle = \\vec{u} \\cdot \\vec{v} = \\sum_{i=1}^n u_i v_i = u_1 v_1 + u_2 v_2 + \\dots + u_n v_n \\)
                 </div>
                 <div class="calc-section-title">Quá trình tính toán chi tiết</div>
                 <div class="calc-explanation-block">
                   ${id1 === id2 ? `• Vector: \\( ${v1Name} = [${v1Vec.vec.join(", ")}] \\)<br/>` : `• Vector thứ nhất: \\( ${v1Name} = [${v1Vec.vec.join(", ")}] \\)<br/>• Vector thứ hai: \\( ${v2Name} = [${v2Vec.vec.join(", ")}] \\)<br/>`}
                   • Khai triển tổng tích các tọa độ tương ứng:<br/>
                   \\( ${v1Name} \\cdot ${v2Name} = ` + v1Vec.vec.map((x,i) => `(${x})(${v2Vec.vec[i]})`).join(' + ') + ` = ${val} \\)
                 </div>
                 <div class="calc-section-title">Ý nghĩa hình học & Bản chất không gian</div>
                 <div class="calc-explanation-block">
                   • <b>Mối liên hệ với chuẩn và góc:</b> \\( \\vec{u} \\cdot \\vec{v} = \\|\\vec{u}\\| \\|\\vec{v}\\| \\cos(\\theta) \\). Tích vô hướng lượng hóa mức độ cùng phương giữa hai vector định hướng.<br/>
                   • <b>Hình chiếu trực giao:</b> Độ dài đại số của hình chiếu vuông góc điểm ngọn của \\( ${v1Name} \\) lên đường thẳng sinh bởi \\( ${v2Name} \\) nhân với độ dài của \\( ${v2Name} \\) bằng đúng \\( ${val} \\).<br/>
                   • <b>Nhận xét vị trí tương đối:</b> ${angleNature}
                 </div>
               `;
             }
          }
          else if (op === "vector_norm") { 
             title = "Độ dài vector"; 
             ltx = `\\|\\vec{v}_{${id1}}\\| = ${val}`; 
             if (v1Vec) {
               const normValStr = App.formatScalar ? App.formatScalar(val) : String(val);
               detailsHtml = `
                 <div class="calc-section-title">Khung định nghĩa đại số</div>
                 <div class="calc-explanation-block">
                   Chuẩn \\( L_2 \\) (chuẩn Euclide) của vector \\( \\vec{v} \\in \\mathbb{R}^n \\) được cảm ứng từ tích vô hướng chính tắc:<br/>
                   \\( \\|\\vec{v}\\|_2 = \\sqrt{\\langle \\vec{v}, \\vec{v} \\rangle} = \\sqrt{\\sum_{i=1}^n v_i^2} = \\sqrt{v_1^2 + v_2^2 + \\dots + v_n^2} \\)
                 </div>
                 <div class="calc-section-title">Quá trình tính toán chi tiết</div>
                 <div class="calc-explanation-block">
                   • Vector khảo sát: \\( \\vec{v}_{${id1}} = [${v1Vec.vec.join(", ")}] \\)<br/>
                   • Tổng bình phương các thành phần tọa độ:<br/>
                   \\( \\|\\vec{v}_{${id1}}\\| = \\sqrt{` + v1Vec.vec.map(x => `(${x})^2`).join(' + ') + `} = \\sqrt{${v1Vec.vec.reduce((s,x) => s + x*x, 0)}} = ${normValStr} \\)
                 </div>
                 <div class="calc-section-title">Ý nghĩa hình học & Bản chất không gian</div>
                 <div class="calc-explanation-block">
                   • <b>Khoảng cách metric Euclide:</b> Giá trị \\( \\|\\vec{v}_{${id1}}\\| = ${normValStr} \\) xác định khoảng cách hình học từ gốc tọa độ \\( O \\) đến điểm ngọn của vector trong không gian \\( \\mathbb{R}^n \\).<br/>
                   • <b>Hệ quả định lý Pythagoras:</b> Chuẩn Euclide là độ dài cạnh huyền của khối tam giác vuông cấu thành từ các hình chiếu trực giao trên các trục tọa độ chính tắc.<br/>
                   • <b>Tiên đề chuẩn:</b> Thỏa mãn đầy đủ 3 tiên đề: xác định dương (\\( \\|\\vec{v}\\| \\ge 0 \\)), thuần nhất tuyệt đối (\\( \\|k\\vec{v}\\| = |k|\\|\\vec{v}\\| \\)) và bất đẳng thức tam giác.
                 </div>
               `;
             }
          }

          calcSteps.innerHTML = App.renderUnifiedResult(
            "KẾT QUẢ VÔ HƯỚNG",
            App.formatScalar ? App.formatScalar(val) : val,
          ) + App.renderExplanationBox(detailsHtml);

          if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([calcSteps]).catch(console.warn);
          }

          if (window.App.PaperLogger) {
            if (op === "dot") {
               App.PaperLogger.log(title, ltx, detailsHtml, null, { type: 'dot', vectors: [id1, id2] });
            } else {
               App.PaperLogger.log(title, ltx, detailsHtml);
            }
          }
        }

        App._lastVectorOp = {
          op: op,
          id1: id1,
          id2: id2,
          resultVal: val
        };
        const btnReplayScalar = document.getElementById("btnVectorReplay");
        if (btnReplayScalar) btnReplayScalar.style.display = "inline-flex";

        if (
          op === "dot" &&
          App.useAnimation &&
          typeof App.animateOperation === "function"
        ) {
          App.animateOperation("dot", [id1, id2], val);
        }
        if (
          op === "vector_norm" &&
          App.useAnimation &&
          typeof App.animateOperation === "function"
        ) {
          App.animateOperation("vector_norm", [id1], val);
        }
        return;
      }

      // 2. Xử lý kết quả Vector (Đã fix hiển thị MathLive + Fix lỗi 2 viền)
      const rawRes = data.result !== undefined ? data.result : data.result_vec;

      // Hàm làm tròn số
      const fmtVal = (n) => {
        let x = Number(n);
        if (isNaN(x)) return "0";
        if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
        return String(parseFloat(x.toFixed(4)));
      };

      // Tạo chuỗi Latex: Vector (x, y) hoặc số
      let latex = "";
      if (data.result_latex !== undefined) {
        // Nếu backend gửi kết quả LaTeX chuẩn (từ SymPy)
        const rawLatex = data.result_latex;
        if (Array.isArray(rawLatex)) {
            latex = `\\left( ${rawLatex.join(",\\; ")} \\right)`;
        } else {
            latex = String(rawLatex);
        }
      } else {
        // Fallback cũ nếu API chưa hỗ trợ SymPy trả về LaTeX
        if (Array.isArray(rawRes)) {
            latex = `\\left( ${rawRes.map(fmtVal).join(",\\; ")} \\right)`;
        } else {
            latex = fmtVal(rawRes);
        }
      }

      // [FIX QUAN TRỌNG] Reset sạch style thẻ cha để không bị 2 viền chồng nhau
      calcSteps.className = "";
      calcSteps.style.padding = "0";
      calcSteps.style.border = "none";
      calcSteps.style.background = "transparent";

      let ltx = "";
      let title = "Phép tính vector";
      let detailsHtml = "";
      const v1Vec = App.vectorList.find(v => v.id === id1);
      const v2Vec = App.vectorList.find(v => v.id === id2);
      
      if (op === "add") { 
         title = "Cộng 2 vector"; 
         ltx = `\\vec{v}_{${id1}} + \\vec{v}_{${id2}} = ${latex}`; 
         if (v1Vec && v2Vec) {
           const isSelfAdd = (id1 === id2);
           const v1Name = `\\vec{v}_{${id1}}`;
           const v2Name = isSelfAdd ? `\\vec{v}_{${id1}}` : `\\vec{v}_{${id2}}`;
           const sumExpr = isSelfAdd
             ? `${v1Name} + ${v1Name} = 2${v1Name} = [` + v1Vec.vec.map(x => `${x} + ${x}`).join(', ') + `] = ${latex}`
             : `${v1Name} + ${v2Name} = [` + v1Vec.vec.map((x,i) => `${x} + ${v2Vec.vec[i]}`).join(', ') + `] = ${latex}`;

           detailsHtml = `
             <div class="calc-section-title">Khung định nghĩa đại số</div>
             <div class="calc-explanation-block">
               Phép cộng trong không gian vector \\( \\mathbb{R}^n \\) được định nghĩa theo từng tọa độ thành phần tương ứng:<br/>
               \\( \\vec{u} + \\vec{v} = (u_1 + v_1, u_2 + v_2, \\dots, u_n + v_n) \\)
             </div>
             <div class="calc-section-title">Quá trình tính toán chi tiết</div>
             <div class="calc-explanation-block">
               ${isSelfAdd ? `• Vector ban đầu: \\( ${v1Name} = [${v1Vec.vec.join(", ")}] \\)<br/>` : `• Vector thứ nhất: \\( ${v1Name} = [${v1Vec.vec.join(", ")}] \\)<br/>• Vector thứ hai: \\( ${v2Name} = [${v2Vec.vec.join(", ")}] \\)<br/>`}
               • Cộng các tọa độ tương ứng:<br/>
               \\( ${sumExpr} \\)
             </div>
             <div class="calc-section-title">Ý nghĩa hình học & Bản chất không gian</div>
             <div class="calc-explanation-block">
               • <b>Quy tắc hình bình hành:</b> Vector tổng \\( ${v1Name} + ${v2Name} \\) xuất phát từ gốc tọa độ đóng vai trò là đường chéo chính của hình bình hành căng bởi hai vector thành phần.<br/>
               • <b>Quy tắc tam giác (Hệ thức Chasles):</b> Điểm ngọn của vector thứ nhất được tịnh tiến nối tiếp với điểm đầu của vector thứ hai, vector tổng là đoạn thẳng định hướng từ gốc tọa độ đến điểm ngọn kết quả.<br/>
               • <b>Tọa độ điểm ngọn:</b> Điểm ngọn của vector tổng có tọa độ \\( ${latex} \\) trên hệ trục tọa độ Affine.
             </div>
           `;
         }
      }
      else if (op === "sub" || op === "subtract") { 
         title = "Hiệu 2 vector"; 
         ltx = `\\vec{v}_{${id1}} - \\vec{v}_{${id2}} = ${latex}`; 
         if (v1Vec && v2Vec) {
           const isSelfSub = (id1 === id2);
           const v1Name = `\\vec{v}_{${id1}}`;
           const v2Name = isSelfSub ? `\\vec{v}_{${id1}}` : `\\vec{v}_{${id2}}`;
           const diffExpr = isSelfSub
             ? `${v1Name} - ${v1Name} = \\vec{0}`
             : `${v1Name} - ${v2Name} = [` + v1Vec.vec.map((x,i) => `${x} - (${v2Vec.vec[i]})`).join(', ') + `] = ${latex}`;

           detailsHtml = `
             <div class="calc-section-title">Khung định nghĩa đại số</div>
             <div class="calc-explanation-block">
               Phép trừ trong không gian vector \\( \\mathbb{R}^n \\) là phép cộng với vector đối của vector thứ hai:<br/>
               \\( \\vec{u} - \\vec{v} = \\vec{u} + (-\\vec{v}) = (u_1 - v_1, u_2 - v_2, \\dots, u_n - v_n) \\)
             </div>
             <div class="calc-section-title">Quá trình tính toán chi tiết</div>
             <div class="calc-explanation-block">
               ${isSelfSub ? `• Vector ban đầu: \\( ${v1Name} = [${v1Vec.vec.join(", ")}] \\)<br/>` : `• Vector thứ nhất: \\( ${v1Name} = [${v1Vec.vec.join(", ")}] \\)<br/>• Vector thứ hai: \\( ${v2Name} = [${v2Vec.vec.join(", ")}] \\)<br/>`}
               • Trừ các tọa độ tương ứng:<br/>
               \\( ${diffExpr} \\)
             </div>
             <div class="calc-section-title">Ý nghĩa hình học & Bản chất không gian</div>
             <div class="calc-explanation-block">
               • <b>Vector nối hai điểm ngọn:</b> Vector hiệu \\( ${v1Name} - ${v2Name} \\) là đoạn thẳng định hướng nối từ điểm ngọn của \\( ${v2Name} \\) đến điểm ngọn của \\( ${v1Name} \\).<br/>
               • <b>Quy tắc tam giác:</b> Biểu diễn hệ thức \\( ${v2Name} + (${v1Name} - ${v2Name}) = ${v1Name} \\).<br/>
               • <b>Tọa độ điểm ngọn:</b> Điểm ngọn của vector hiệu có tọa độ \\( ${latex} \\) trên hệ trục tọa độ Affine.
             </div>
           `;
         }
      }
      else if (op === "scale") { 
         title = "Kéo giãn vector"; 
         ltx = `${scalarInp.value.trim()} \\cdot \\vec{v}_{${id1}} = ${latex}`; 
         if (v1Vec) {
           const kVal = Number(scalarInp.value.trim()) || 0;
           const dirDesc = kVal > 0
             ? "Cùng hướng với vector ban đầu (do k > 0, bảo toàn định hướng)."
             : kVal < 0
             ? "Đảo ngược chiều định hướng 180° so với vector ban đầu (do k < 0)."
             : "Triệt tiêu thành vector không (do k = 0).";

           detailsHtml = `
             <div class="calc-section-title">Khung định nghĩa đại số</div>
             <div class="calc-explanation-block">
               Phép nhân vector với vô hướng \\( k \\in \\mathbb{R} \\) trong không gian vector \\( \\mathbb{R}^n \\) là ánh xạ tuyến tính co dãn tọa độ:<br/>
               \\( k \\cdot \\vec{v} = (k \\cdot v_1, k \\cdot v_2, \\dots, k \\cdot v_n) \\)
             </div>
             <div class="calc-section-title">Quá trình tính toán chi tiết</div>
             <div class="calc-explanation-block">
               • Vector ban đầu: \\( \\vec{v}_{${id1}} = [${v1Vec.vec.join(", ")}] \\)<br/>
               • Hệ số vô hướng: \\( k = ${scalarInp.value.trim()} \\)<br/>
               • Nhân từng thành phần tọa độ với hệ số k:<br/>
               \\( ${scalarInp.value.trim()} \\cdot \\vec{v}_{${id1}} = [` + v1Vec.vec.map(x => `${scalarInp.value.trim()} \\cdot (${x})`).join(', ') + `] = ${latex} \\)
             </div>
             <div class="calc-section-title">Ý nghĩa hình học & Bản chất không gian</div>
             <div class="calc-explanation-block">
               • <b>Biến thiên độ dài:</b> Chuẩn của vector co dãn theo tỉ lệ \\( |k| = ${Math.abs(kVal)} \\) lần độ dài ban đầu: \\( \\|k\\vec{v}\\| = |k| \\cdot \\|\\vec{v}\\| \\).<br/>
               • <b>Phương và định hướng:</b> Vector mới thuộc không gian con 1 chiều \\( \\text{Span}\\{\\vec{v}_{${id1}}\\} \\). ${dirDesc}<br/>
               • <b>Tọa độ điểm ngọn:</b> Nằm tại vị trí \\( ${latex} \\) trên không gian tọa độ.
             </div>
           `;
         }
      }
      else if (op === "cross") { 
         title = "Tích có hướng"; 
         ltx = `[\\vec{v}_{${id1}}, \\vec{v}_{${id2}}] = ${latex}`; 
         if (v1Vec && v2Vec && v1Vec.vec.length === 3 && v2Vec.vec.length === 3) {
           const v1Name = `\\vec{v}_{${id1}}`;
           const v2Name = id1 === id2 ? `\\vec{v}_{${id1}}` : `\\vec{v}_{${id2}}`;
           detailsHtml = `
             <div class="calc-section-title">Khung định nghĩa đại số</div>
             <div class="calc-explanation-block">
               Tích có hướng của hai vector \\( \\vec{u}, \\vec{v} \\in \\mathbb{R}^3 \\) được xác định thông qua định thức hình thức với hệ vector đơn vị trực chuẩn \\( \\{\\mathbf{i}, \\mathbf{j}, \\mathbf{k}\\} \\):<br/>
               \\( [\\vec{u}, \\vec{v}] = \\vec{u} \\times \\vec{v} = \\begin{vmatrix} \\mathbf{i} & \\mathbf{j} & \\mathbf{k} \\\\ u_1 & u_2 & u_3 \\\\ v_1 & v_2 & v_3 \\end{vmatrix} = \\left( \\begin{vmatrix} u_2 & u_3 \\\\ v_2 & v_3 \\end{vmatrix}, -\\begin{vmatrix} u_1 & u_3 \\\\ v_1 & v_3 \\end{vmatrix}, \\begin{vmatrix} u_1 & u_2 \\\\ v_1 & v_2 \\end{vmatrix} \\right) \\)
             </div>
             <div class="calc-section-title">Quá trình tính toán chi tiết</div>
             <div class="calc-explanation-block">
               • Vector thứ nhất: \\( ${v1Name} = [${v1Vec.vec.join(", ")}] \\)<br/>
               • Vector thứ hai: \\( ${v2Name} = [${v2Vec.vec.join(", ")}] \\)<br/>
               • Khai triển các định thức con cấp 2:<br/>
               \\( [${v1Name}, ${v2Name}] = \\begin{vmatrix} \\mathbf{i} & \\mathbf{j} & \\mathbf{k} \\\\ ${v1Vec.vec.join(' & ')} \\\\ ${v2Vec.vec.join(' & ')} \\end{vmatrix} = ${latex} \\)
             </div>
             <div class="calc-section-title">Ý nghĩa hình học & Bản chất không gian</div>
             <div class="calc-explanation-block">
               • <b>Tính trực giao:</b> Vector kết quả vuông góc đồng thời với cả hai vector thành phần: \\( (\\vec{u} \\times \\vec{v}) \\perp \\vec{u} \\) và \\( (\\vec{u} \\times \\vec{v}) \\perp \\vec{v} \\), đóng vai trò vector pháp tuyến của mặt phẳng căng bởi cặp vector.<br/>
               • <b>Định hướng không gian:</b> Chiều của vector tuân thủ nghiêm ngặt quy tắc bàn tay phải (hệ tam diện thuận).<br/>
               • <b>Diện tích hình bình hành:</b> Chuẩn của vector tích có hướng \\( \\|\\vec{u} \\times \\vec{v}\\| \\) bằng đúng diện tích hình bình hành căng bởi hai vector trong không gian ba chiều.
             </div>
           `;
         }
      }
      else if (op === "normalize") { 
         title = "Chuẩn hoá vector"; 
         ltx = `\\frac{\\vec{v}_{${id1}}}{\\|\\vec{v}_{${id1}}\\|} = ${latex}`; 
         if (v1Vec) {
           const mag = Math.sqrt(v1Vec.vec.reduce((s, x) => s + x * x, 0));
           const magStr = mag.toFixed(4);
           detailsHtml = `
             <div class="calc-section-title">Khung định nghĩa đại số</div>
             <div class="calc-explanation-block">
               Vector đơn vị (unit vector) tương ứng với vector khác không \\( \\vec{v} \\in \\mathbb{R}^n \\) thu được bằng cách nhân \\( \\vec{v} \\) với nghịch đảo của chuẩn Euclide:<br/>
               \\( \\vec{u} = \\frac{\\vec{v}}{\\|\\vec{v}\\|_2} = \\left( \\frac{v_1}{\\|\\vec{v}\\|}, \\frac{v_2}{\\|\\vec{v}\\|}, \\dots, \\frac{v_n}{\\|\\vec{v}\\|} \\right) \\)
             </div>
             <div class="calc-section-title">Quá trình tính toán chi tiết</div>
             <div class="calc-explanation-block">
               • Vector ban đầu: \\( \\vec{v}_{${id1}} = [${v1Vec.vec.join(", ")}] \\)<br/>
               • Chuẩn Euclide: \\( \\|\\vec{v}_{${id1}}\\| = \\sqrt{` + v1Vec.vec.map(x => `(${x})^2`).join(' + ') + `} \\approx ${magStr} \\)<br/>
               • Chuẩn hóa từng thành phần tọa độ:<br/>
               \\( \\frac{\\vec{v}_{${id1}}}{\\|\\vec{v}_{${id1}}\\|} = [${v1Vec.vec.map(x => `\\frac{${x}}{${magStr}}`).join(", ")}] = ${latex} \\)
             </div>
             <div class="calc-section-title">Ý nghĩa hình học & Bản chất không gian</div>
             <div class="calc-explanation-block">
               • <b>Bảo toàn phương hướng:</b> Vector kết quả giữ nguyên phương và chiều của vector ban đầu nhưng có độ dài chuẩn hóa đúng bằng 1 đơn vị (\\( \\|\\vec{u}\\| = 1 \\)).<br/>
               • <b>Vị trí trên siêu cầu đơn vị:</b> Điểm ngọn của vector nằm chính xác trên đường tròn đơn vị \\( S^1 \\) (trong \\( \\mathbb{R}^2 \\)) hoặc mặt cầu đơn vị \\( S^2 \\) (trong \\( \\mathbb{R}^3 \\)) có tâm tại gốc tọa độ.<br/>
               • <b>Ứng dụng:</b> Đại diện thuần túy cho phương chỉ hướng mà không phụ thuộc vào độ lớn metric.
             </div>
           `;
         }
      }
      else if (op === "projection") { 
         title = "Hình chiếu"; 
         ltx = `\\text{proj}_{\\vec{v}_{${id2}}} \\vec{v}_{${id1}} = ${latex}`; 
         if (v1Vec && v2Vec) {
           const v1Name = `\\vec{v}_{${id1}}`;
           const v2Name = id1 === id2 ? `\\vec{v}_{${id1}}` : `\\vec{v}_{${id2}}`;
           const dotProd = v1Vec.vec.reduce((s,x,i) => s + x*(v2Vec.vec[i]||0), 0);
           const v2NormSq = v2Vec.vec.reduce((s,x) => s + x*x, 0);
           detailsHtml = `
             <div class="calc-section-title">Khung định nghĩa đại số</div>
             <div class="calc-explanation-block">
               Hình chiếu trực giao của vector \\( \\vec{u} \\) lên đường thẳng sinh bởi vector khác không \\( \\vec{v} \\) trong không gian Euclide được xác định bởi công thức chiếu chuẩn:<br/>
               \\( \\text{proj}_{\\vec{v}} \\vec{u} = \\frac{\\langle \\vec{u}, \\vec{v} \\rangle}{\\|\\vec{v}\\|^2} \\vec{v} = \\frac{\\vec{u} \\cdot \\vec{v}}{\\vec{v} \\cdot \\vec{v}} \\vec{v} \\)
             </div>
             <div class="calc-section-title">Quá trình tính toán chi tiết</div>
             <div class="calc-explanation-block">
               • Vector cần chiếu: \\( ${v1Name} = [${v1Vec.vec.join(", ")}] \\)<br/>
               • Vector phương chiếu: \\( ${v2Name} = [${v2Vec.vec.join(", ")}] \\)<br/>
               • Tích vô hướng: \\( ${v1Name} \\cdot ${v2Name} = ` + v1Vec.vec.map((x,i) => `(${x})(${v2Vec.vec[i]})`).join(' + ') + ` = ${dotProd} \\)<br/>
               • Bình phương chuẩn vector phương chiếu: \\( \\|${v2Name}\\|^2 = ` + v2Vec.vec.map(x => `(${x})^2`).join(' + ') + ` = ${v2NormSq} \\)<br/>
               • Thế số tính vector hình chiếu:<br/>
               \\( \\text{proj}_{${v2Name}} ${v1Name} = \\frac{${dotProd}}{${v2NormSq}} ${v2Name} = ${latex} \\)
             </div>
             <div class="calc-section-title">Ý nghĩa hình học & Bản chất không gian</div>
             <div class="calc-explanation-block">
               • <b>Phân rã trực giao:</b> Vector \\( ${v1Name} \\) được phân rã duy nhất thành hai thành phần trực giao: thành phần cùng phương \\( \\vec{u}_{\\parallel} = \\text{proj}_{${v2Name}} ${v1Name} \\in \\text{Span}\\{${v2Name}\\} \\) và thành phần trực giao \\( \\vec{u}_{\\perp} = ${v1Name} - \\text{proj}_{${v2Name}} ${v1Name} \\perp ${v2Name} \\).<br/>
               • <b>Khoảng cách tối thiểu:</b> Điểm ngọn của vector hình chiếu là điểm trên đường thẳng chứa \\( ${v2Name} \\) gần điểm ngọn của \\( ${v1Name} \\) nhất theo metric khoảng cách Euclide.
             </div>
           `;
         }
      }

      // Bọc kết quả vào khung Thống nhất kèm quá trình giải thích
      calcSteps.innerHTML = App.renderUnifiedResult(
        "VECTOR KẾT QUẢ",
        `<math-field read-only>${latex}</math-field>`,
      ) + App.renderExplanationBox(detailsHtml);

      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([calcSteps]).catch(console.warn);
      }

      if (window.App.PaperLogger) {
        if (op === "cross" && id1 !== undefined && id2 !== undefined) {
           App.PaperLogger.log(title, ltx, detailsHtml, null, { type: 'cross', vectors: [id1, id2], result: nextVectorId });
        } else if (op === "add" && id1 !== undefined && id2 !== undefined) {
           App.PaperLogger.log(title, ltx, detailsHtml, null, { type: 'add', vectors: [id1, id2], result: nextVectorId });
        } else if (op === "subtract" && id1 !== undefined && id2 !== undefined) {
           App.PaperLogger.log(title, ltx, detailsHtml, null, { type: 'subtract', vectors: [id1, id2], result: nextVectorId });
        } else if (op === "projection" && id1 !== undefined && id2 !== undefined) {
           App.PaperLogger.log(title, ltx, detailsHtml, null, { type: 'project', vectors: [id1, id2], result: nextVectorId });
        } else {
           App.PaperLogger.log(title, ltx, detailsHtml);
        }
      }
      if (addToList) {
        // [FIX LỖI] Định nghĩa vecRes lấy từ kết quả rawRes ở trên dạng số thực
        const vecRes = (Array.isArray(rawRes) ? rawRes : [rawRes]).map(Number);

        const hue = App._pickUniqueHue ? App._pickUniqueHue() : 0;

        // Giờ vecRes đã có giá trị, không bị lỗi nữa
        const newItem = App._attachVectorItem(vecRes, hue);
        
        // Lưu lại latex chuẩn để tính toán tiếp
        if (data.result_latex !== undefined && Array.isArray(data.result_latex)) {
            newItem.latex = `[${data.result_latex.join(", ")}]`;
        }

        // [FIX] Đưa vào danh sách NGAY LẬP TỨC để đồng bộ ID
        if (App.History && typeof App.History.record === "function") {
          App.History.record(`Tính: ${title || op} → v${newItem.id}`);
        }
        App.vectorList.push(newItem);
        App.renderVectorList();
        App.refreshCalcVectorOptions();
        if (App.renderExtraCalcOptions) App.renderExtraCalcOptions();
        if (!App.useAnimation) {
          newItem.alpha = 1; // Hiện ngay
          newItem.vec = vecRes; // Gán giá trị cuối
          App.tempGhosts = []; // Xóa bóng ma (nếu có)
          App.redrawAll({ frame: false });
          return; // Dừng hàm, không chạy xuống phần animation dưới nữa
        }
        // --- 3. XỬ LÝ ANIMATION CO DÃN & CHUẨN HÓA ---
        // --- 1. KỊCH BẢN "PHÉP VỊ TỰ" CHO PHÉP NHÂN VÔ HƯỚNG ---
        if (op === "scale") {
          const originalItem = App.vectorList.find((v) => v.id === id1);
          const startVec = originalItem ? originalItem.vec.map(Number) : (Array.isArray(v1) ? v1.map(Number) : [0, 0]);
          const targetVec = Array.isArray(vecRes) ? vecRes.map(Number) : [0, 0];

          if (originalItem) originalItem.alpha = 0.2; // Lưu lại cái bóng mờ để làm hệ quy chiếu

          newItem.alpha = 1;
          newItem.vec = [...startVec];
          App.tempGhosts = [];

          const dur = 1000; // Cho chạy 1s để thấy rõ quá trình đi xuyên qua gốc O
          const t0 = performance.now();

          // Hàm Easing (Nhanh ở giữa, chậm hai đầu) để mô phỏng lực kéo/đẩy
          const easeInOutQuad = (t) =>
            t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

          function animScale(now) {
            const timeRatio = Math.min((now - t0) / dur, 1);
            const p = easeInOutQuad(timeRatio);

            // CỐT LÕI TOÁN HỌC: Bắt đầu từ ngọn vector cũ, kéo/đẩy đến ngọn vector mới
            const currentVec = startVec.map(
              (val, i) => Number(val) + (Number(targetVec[i]) - Number(val)) * p,
            );

            newItem.vec = currentVec; // Cập nhật tọa độ real-time
            App.redrawAll({ frame: false });

            if (timeRatio < 1) {
              requestAnimationFrame(animScale);
            } else {
              // Chốt sổ
              if (originalItem) originalItem.alpha = 1;
              newItem.vec = [...targetVec];
              App.redrawAll({ frame: false });
            }
          }
          requestAnimationFrame(animScale);
        } else if (op === "normalize") {
          // =========================================================
          // KỊCH BẢN CHUẨN HÓA: HOLOGRAM NĂNG LƯỢNG (ĐÃ DIỆT LỖI LƯỚI TÀNG HÌNH)
          // =========================================================
          const originalItem = App.vectorList.find((v) => v.id === id1);
          const startVec = originalItem ? originalItem.vec.map(Number) : (Array.isArray(v1) ? v1.map(Number) : [0, 0]);
          const targetVec = Array.isArray(vecRes) ? vecRes.map(Number) : [0, 0];

          // Màu Hologram Sci-fi siêu ngầu
          const isDark = document.body.classList.contains("dark");
          const refColorHex = isDark ? 0x00d4ff : 0x0055ff;
          const refColorCss = isDark ? "#00d4ff" : "#0088cc";

          // 1. CHUẨN BỊ GHOST VECTOR
          const stretchGhost = {
            // [CHÌA KHÓA DIỆT MẠNG NHỆN]:
            // Chỉ báo cho hệ thống vẽ "Đây là Chuẩn hóa" khi ở 2D.
            // Ở 3D, ta ngắt cờ này để file viewer3D.js KHÔNG tự động đẻ ra mặt cầu lưới mặc định nữa!
            isNormalize: App.mode === "2D",
            isGhost: true,
            vec: [...startVec],
            colorCss: refColorCss,
            alpha: 1,
            unitCircleAlpha: 0,
          };
          App.tempGhosts = [stretchGhost];
          newItem.alpha = 0;
          newItem.vec = [...startVec];

          // 2. TẠO MẶT CẦU HOLOGRAM BẰNG SHADER (TỰ PHÁT SÁNG, XUYÊN THẤU 100%)
          let sphereMesh = null;
          if (App.mode === "3D" && window.Vec3D && Vec3D._mathGroup) {
            const u = Vec3D.S3D.unitsPerWorld || 1;
            const sphereGeo = new THREE.SphereGeometry(1, 64, 64); // Phân giải cao cho mịn

            // Tự viết thuật toán Ánh sáng Fresnel (Viền sáng, tâm trong suốt)
            const vertexShader = `
                  varying vec3 vNormal;
                  void main() {
                      vNormal = normalize(normalMatrix * normal);
                      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                  }
              `;
            const fragmentShader = `
                  uniform vec3 glowColor;
                  uniform float opacityAnim;
                  varying vec3 vNormal;
                  void main() {
                      // Tính độ chói ở viền (Hiệu ứng bong bóng/hologram)
                      float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
                      gl_FragColor = vec4(glowColor, fresnel * opacityAnim);
                  }
              `;

            const sphereMat = new THREE.ShaderMaterial({
              uniforms: {
                glowColor: { value: new THREE.Color(refColorHex) },
                opacityAnim: { value: 0.0 },
              },

              vertexShader: `
        varying vec3 vNormal;

        void main() {
            vNormal = normalize(normalMatrix * normal);

            gl_Position =
                projectionMatrix *
                modelViewMatrix *
                vec4(position, 1.0);
        }
    `,

              fragmentShader: `
        uniform vec3 glowColor;
        uniform float opacityAnim;

        varying vec3 vNormal;

        void main() {

            float fresnel =
                pow(
                    1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))),
                    3.0
                );

            float alpha =
                fresnel *
                opacityAnim *
                0.5;

            gl_FragColor =
                vec4(glowColor, alpha);
        }
    `,

              transparent: true,

              depthWrite: false,

              side: THREE.FrontSide,

              blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
            });

            sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
            sphereMesh.onBeforeRender = () => {
              const dynamicU = Vec3D.S3D.unitsPerWorld || 1;
              sphereMesh.scale.setScalar(dynamicU);
            };
            Vec3D._mathGroup.add(sphereMesh);
          }

          if (originalItem) {
            originalItem.alpha = 0.2;
          }

          const durFade = 300;
          const durScale = 800;
          const t0 = performance.now();

          function animNormalize(now) {
            const t = now - t0;

            // NHỊP 1: Tỏa sáng Hologram
            let p1 = Math.min(t / durFade, 1);
            stretchGhost.unitCircleAlpha = p1 * 0.5;
            if (sphereMesh) {
              sphereMesh.material.uniforms.opacityAnim.value = p1 * 2.0; // Đẩy sáng lên
            }

            // NHỊP 2: Co giãn mũi tên
            let p2 = 0;
            if (t > durFade) {
              p2 = Math.min((t - durFade) / durScale, 1);
            }
            const easeInOutCubic =
              p2 < 0.5 ? 4 * p2 * p2 * p2 : 1 - Math.pow(-2 * p2 + 2, 3) / 2;

            const currentVec = startVec.map(
              (s, i) => Number(s) + (Number(targetVec[i]) - Number(s)) * easeInOutCubic,
            );
            stretchGhost.vec = currentVec;
            newItem.vec = currentVec;

            App.redrawAll({ frame: false });

            if (t < durFade + durScale) {
              requestAnimationFrame(animNormalize);
            } else {
              setTimeout(() => {
                newItem.alpha = 1;
                newItem.vec = [...targetVec];
                App.tempGhosts = [];
                if (originalItem) originalItem.alpha = 1;
                if (sphereMesh && sphereMesh.parent)
                  sphereMesh.parent.remove(sphereMesh);
                App.redrawAll({ frame: false });
              }, 400);
            }
          }
          requestAnimationFrame(animNormalize);
        }
        // PHÉP CỘNG, CHIẾU & TÍCH CÓ HƯỚNG
        else {
          const hasAnim =
            (op === "add" || op === "projection" || op === "cross") &&
            App.useAnimation &&
            typeof App.animateOperation === "function";
          newItem.alpha = hasAnim ? 0 : 1;
          App.redrawAll({ frame: false });
          if (hasAnim) App.animateOperation(op, [id1, id2], newItem.id);
        }

        if (typeof newItem !== "undefined" && newItem) {
          App._lastVectorOp = {
            op: op,
            id1: id1,
            id2: id2,
            scalar: scalarInp ? scalarInp.value.trim() : "2",
            resultId: newItem.id,
            vecRes: vecRes
          };
          const btnReplay = document.getElementById("btnVectorReplay");
          if (btnReplay) btnReplay.style.display = "inline-flex";
        }
      } else {
        App.previewVector(vecRes);
      }
    } catch (e) {
      App.showToast("Lỗi: " + e);
    }
  };

  App.replayLastVectorCalc = function () {
    if (!App._lastVectorOp) {
      if (window.App?.showToast) App.showToast("Chưa có phép tính nào để phát lại.", "info");
      return;
    }
    const { op, id1, id2, scalar, resultId, resultVal, vecRes } = App._lastVectorOp;
    const v1 = vectorById(id1);
    const v2 = vectorById(id2);

    if (op === "angle_between") {
      const deg = (resultVal * 180) / Math.PI;
      if (App.mode === "2D" && window.Vec2D) {
        Vec2D.drawAngleArc2D(v1, v2, deg);
      } else if (window.Vec3D) {
        Vec3D.drawAngleArc3D(v1, v2, resultVal, deg);
      }
      if (typeof App.animateOperation === "function") {
        App.animateOperation("angle_between", [id1, id2], resultVal);
      }
    } else if (op === "dot" || op === "vector_norm") {
      if (typeof App.animateOperation === "function") {
        App.animateOperation(op, op === "dot" ? [id1, id2] : [id1], resultVal);
      }
    } else if (op === "scale") {
      if (resultId && App.vectorList) {
        const targetItem = App.vectorList.find(v => v.id === resultId);
        const originalItem = App.vectorList.find(v => v.id === id1);
        if (targetItem && originalItem && v1 && vecRes) {
          const startVec = originalItem.vec ? originalItem.vec.map(Number) : (Array.isArray(v1) ? v1.map(Number) : [0, 0]);
          const targetVec = Array.isArray(vecRes) ? vecRes.map(Number) : [0, 0];
          originalItem.alpha = 0.2;
          targetItem.alpha = 1;
          targetItem.vec = [...startVec];
          const dur = 1000;
          const t0 = performance.now();
          const easeInOutQuad = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          function animScale(now) {
            const p = Math.min(1, (now - t0) / dur);
            const ease = easeInOutQuad(p);
            targetItem.vec = startVec.map((c, i) => Number(c) + (Number(targetVec[i]) - Number(c)) * ease);
            App.redrawAll({ frame: false });
            if (p < 1) {
              requestAnimationFrame(animScale);
            } else {
              targetItem.vec = [...targetVec];
              originalItem.alpha = 1;
              App.redrawAll({ frame: false });
            }
          }
          requestAnimationFrame(animScale);
        }
      }
    } else if (op === "cross" || op === "add" || op === "projection") {
      if (resultId && App.vectorList) {
        const resVec = App.vectorList.find(v => v.id === resultId);
        if (resVec) {
          resVec.alpha = 0;
          App.redrawAll({ frame: false });
        }
      }
      if (typeof App.animateOperation === "function") {
        App.animateOperation(op, [id1, id2], resultId);
      }
    } else if (op === "normalize") {
      if (resultId && App.vectorList) {
        const targetItem = App.vectorList.find(v => v.id === resultId);
        const originalItem = App.vectorList.find(v => v.id === id1);
        if (targetItem && originalItem && v1 && vecRes) {
          const startVec = originalItem.vec ? originalItem.vec.map(Number) : (Array.isArray(v1) ? v1.map(Number) : [0, 0]);
          const targetVec = Array.isArray(vecRes) ? vecRes.map(Number) : [0, 0];
          targetItem.alpha = 0;
          targetItem.vec = [...startVec];
          originalItem.alpha = 0.3;
          App.redrawAll({ frame: false });
          const dur = 1000;
          const t0 = performance.now();
          const easeInOutCubic = (p) => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
          function animNorm(now) {
            const p = Math.min(1, (now - t0) / dur);
            const ease = easeInOutCubic(p);
            targetItem.vec = startVec.map((c, i) => Number(c) + (Number(targetVec[i]) - Number(c)) * ease);
            targetItem.alpha = ease;
            App.redrawAll({ frame: false });
            if (p < 1) {
              requestAnimationFrame(animNorm);
            } else {
              targetItem.vec = [...targetVec];
              targetItem.alpha = 1;
              originalItem.alpha = 1;
              App.redrawAll({ frame: false });
            }
          }
          requestAnimationFrame(animNorm);
        }
      }
    }
  };

  App.previewVector = function (vec) {
    App.currentVector = vec.slice();
    if (App.mode === "2D" && window.Vec2D) {
      App.firstDrawForVector = false;
      Vec2D.draw2DAllVectors();
    } else if (window.Vec3D) {
      if (App._previewTemp) {
        Vec3D._scene.remove(App._previewTemp);
        App._previewTemp = null;
      }
      const v3 = toVec3(vec);
      const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
      const tipWorld = new THREE.Vector3(v3[0] * u, v3[1] * u, v3[2] * u);
      const grp = Vec3D.buildVectorGroup3D(
        [tipWorld.x, tipWorld.y, tipWorld.z],
        "#bdbdbd",
      );
      const proj = Vec3D.buildProjectionGroupZUp(
        [tipWorld.x, tipWorld.y, tipWorld.z],
        "#555",
      );
      const g = new THREE.Group();
      g.add(grp, proj);
      Vec3D._scene.add(g);
      App._previewTemp = g;
      Vec3D.hardRefresh3D(false);
    }
    if (App.coordOut && App.formatTip) {
      App.coordOut(App.formatTip(vec));
    }
  };

  /* =======================================================================
       PHẦN 5: LOGIC GỌI API MENU 1 (EXTRA UTILS)
       ======================================================================= */

  App.refreshExtraUI = function () {
    const el = document.getElementById("opExtraSelect");
    if (!el) return;
    const val = el.value;
    document.querySelectorAll(".extra-form").forEach(function (f) {
      f.style.display = "none";
    });
    const active = document.getElementById("form-" + val);
    if (active) active.style.display = "block";
  };

  App.getCheckedVectors = function (container) {
    const arr = [];
    if (!container) return arr;
    container
      .querySelectorAll('input[type="checkbox"]:checked')
      .forEach(function (cb) {
        const id = Number(cb.value);
        const it = App.vectorList.find(function (v) {
          return v.id === id;
        });
        if (it) {
          if (it.latex) {
            let s = it.latex.replace(/^\\left\[|^\[|\\right\]|\]$/g, "");
            arr.push(s.split(",").map((x) => x.trim()));
          } else {
            arr.push(it.vec.slice());
          }
        }
      });
    return arr;
  };

  App.selectIdToVector = function (selectEl) {
    if (!selectEl) return null;
    const id = Number(selectEl.value);
    const item = App.vectorList.find(function (v) {
      return v.id === id;
    });
    if (!item) return null;
    
    if (item.latex) {
        let s = item.latex.replace(/^\\left\[|^\[|\\right\]|\]$/g, "");
        return s.split(",").map((x) => x.trim());
    }
    return item.vec;
  };

  App.rankVectorsUI = async function () {
    const container = document.getElementById("rankChecklist");
    if (typeof App.handleEmptyListAction === "function" && App.handleEmptyListAction()) return;
    const vectors = App.getCheckedVectors(container);
    if (!vectors || !vectors.length) {
      if (typeof App.showToast === "function") App.showToast("Hãy tick chọn ít nhất 1 vector!");
      return;
    }

    const resBox = document.getElementById("result_rank");
    if (resBox) {
      resBox.innerHTML = '<div style="color: var(--muted); font-size: 13px; padding: 6px 0;">Đang tính toán...</div>';
    }

    try {
      const res = await App.callAPI("rank", { vectors: vectors });
      App.currentRankData = res;

      const r = typeof res.rank === "number" ? res.rank : (res.result ? res.result.rank : 0);
      const m = vectors.length;

      const cardHtml = `
        <div class="academic-result-card" style="margin-top: 10px; padding: 12px; border: 1px solid var(--border); border-radius: 4px; background: var(--card);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 13px; background: rgba(59, 130, 246, 0.12); border: 1px solid #3b82f6; color: #2563eb;">
              <i class="ph ph-hash" style="font-size: 15px;"></i> Hạng của hệ vector: ${r}
            </span>
            <span style="font-size: 12px; color: var(--muted); font-weight: 600;">dim(span) = ${r}</span>
          </div>
          <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">
            Không gian sinh bởi ${m} vector có số chiều bằng ${r}.
          </div>
        </div>
      `;

      if (resBox) {
        resBox.innerHTML = cardHtml;
      }

      // Show solution button
      const btnSol = document.getElementById("btnRankSolution");
      if (btnSol) {
        btnSol.style.display = "inline-flex";
      }

      // Pre-build solution for Solution Panel
      if (App.TasksGen && App.TasksGen.Rank && typeof App.TasksGen.Rank.buildSolution === "function") {
        const pack = App.TasksGen.Rank.buildSolution(res, vectors);
        App.cachedRankConfig = {
          title: pack.titleText || "Hạng của hệ vector",
          math: pack.titleMath || `\\( \\mathbb{R}^{${res.dimension || (vectors[0] ? vectors[0].length : 0)}} \\)`,
          tab1Label: pack.tab1Label || "Cách 1: Ma trận bậc thang",
          tab2Label: pack.tab2Label || "Cách 2: Hệ độc lập tuyến tính tối đại",
          showSubTabs: false,
          content1: pack.content1,
          content2: pack.content2,
          autoOpen: false,
        };
        if (typeof App.openSolutionPanel === "function") {
          App.openSolutionPanel(App.cachedRankConfig);
        }
      }
    } catch (err) {
      if (resBox) {
        resBox.innerHTML = `<div style="color: #ef4444; font-size: 13px; padding: 6px 0;">Lỗi: ${err.message}</div>`;
      }
      if (typeof App.showToast === "function") App.showToast(err.message);
    }
  };

  App.linearIndependenceUI = async function () {
    const container = document.getElementById("indepChecklist");
    if (typeof App.handleEmptyListAction === "function" && App.handleEmptyListAction()) return;
    const vectors = App.getCheckedVectors(container);
    if (!vectors || !vectors.length) {
      if (typeof App.showToast === "function") App.showToast("Hãy tick chọn ít nhất 1 vector!");
      return;
    }

    const resBox = document.getElementById("result_indep");
    if (resBox) {
      resBox.innerHTML = '<div style="color: var(--muted); font-size: 13px; padding: 6px 0;">Đang kiểm tra...</div>';
    }

    try {
      const res = await App.callAPI("linear_independence", {
        vectors: vectors,
      });
      App.currentIndepData = res;

      const n = vectors.length;
      const r = typeof res.rank === "number" ? res.rank : (res.result ? res.result.rank : n);
      const isIndep = res.independent !== undefined ? res.independent : (res.result ? res.result.is_independent : (r === n));
      const statusText = isIndep ? "Độc lập tuyến tính" : "Phụ thuộc tuyến tính";
      const badgeBg = isIndep ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)";
      const badgeBorder = isIndep ? "#10b981" : "#f59e0b";
      const badgeColor = isIndep ? "#059669" : "#d97706";
      const iconClass = isIndep ? "ph-check-circle" : "ph-warning-circle";

      const cardHtml = `
        <div class="academic-result-card" style="margin-top: 10px; padding: 12px; border: 1px solid var(--border); border-radius: 4px; background: var(--card);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 13px; background: ${badgeBg}; border: 1px solid ${badgeBorder}; color: ${badgeColor};">
              <i class="ph ${iconClass}" style="font-size: 15px;"></i> ${statusText}
            </span>
            <span style="font-size: 12px; color: var(--muted); font-weight: 600;">Hạng r = ${r} / ${n} vector</span>
          </div>
          <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">
            ${isIndep ? "Hệ vector thỏa mãn điều kiện độc lập tuyến tính." : "Hệ vector tồn tại biểu diễn tuyến tính phụ thuộc."}
          </div>
        </div>
      `;

      if (resBox) {
        resBox.innerHTML = cardHtml;
      }

      // Show solution button
      const btnSol = document.getElementById("btnIndepSolution");
      if (btnSol) {
        btnSol.style.display = "inline-flex";
      }

      // Pre-build solution for Solution Panel
      if (App.TasksGen && App.TasksGen.Indep && typeof App.TasksGen.Indep.buildSolution === "function") {
        const pack = App.TasksGen.Indep.buildSolution(res, vectors);
        App.cachedIndepConfig = {
          title: pack.titleText || "Độc lập - phụ thuộc tuyến tính",
          math: pack.titleMath || `\\( \\mathbb{R}^{${res.dimension || (vectors[0] ? vectors[0].length : 0)}} \\)`,
          tab1Label: pack.tab1Label || "Cách 1: Khử Gauss ma trận dòng",
          tab2Label: pack.tab2Label || "Cách 2: Hệ phương trình thuần nhất",
          showSubTabs: false,
          content1: pack.content1,
          content2: pack.content2,
          autoOpen: false,
        };
        if (typeof App.openSolutionPanel === "function") {
          App.openSolutionPanel(App.cachedIndepConfig);
        }
      }
    } catch (err) {
      if (resBox) {
        resBox.innerHTML = `<div style="color: #ef4444; font-size: 13px; padding: 6px 0;">Lỗi: ${err.message}</div>`;
      }
      if (typeof App.showToast === "function") App.showToast(err.message);
    }
  };

  App.checkIndependenceUI = App.linearIndependenceUI;
  App.rankVecUI = App.rankVectorsUI;

  App.coordinatesUI = async function () {
    if (App.handleEmptyListAction()) return;
    const v = App.selectIdToVector(document.getElementById("vCoordSelect"));
    const basis = App.getCheckedVectors(
      document.getElementById("basisCoordChecklist"),
    );

    if (!v) {
      App.showToast("Chưa chọn vector cần tìm tọa độ!");
      return;
    }
    if (!basis.length) {
      App.showToast("Chọn hệ cơ sở (tick ít nhất 1 vector)!");
      return;
    }

    try {
      const res = await App.callAPI("coordinates", { vector: v, basis: basis });

      // [FIX QUAN TRỌNG]: Ưu tiên lấy chuỗi đẹp từ Backend (pretty_coordinates)
      const displayCoords = res.pretty_coordinates || res.coordinates;
      if (!displayCoords) throw new Error("Không tìm thấy tọa độ.");

      const latex = `\\left( ${displayCoords.join(",\\; ")} \\right)`;
      
      const resEl = document.getElementById("result_coord");
      resEl.className = "";
      resEl.style.padding = "0";
      resEl.style.border = "none";
      resEl.style.background = "transparent";
      
      resEl.innerHTML = App.renderUnifiedResult(
        "TỌA ĐỘ",
        `<math-field read-only>${latex}</math-field>`
      );
    } catch (err) {
      document.getElementById("result_coord").innerText = "Lỗi: " + err.message;
      App.showToast(err.message);
    }
  };

  // --- INIT ---
  // --- INIT ---
  window.addEventListener("load", () => {
    // [FIX LỆCH PHA] 1. Đồng bộ trạng thái App.theme từ LocalStorage ngay lập tức
    const savedTheme = localStorage.getItem("vec_theme");
    if (savedTheme === "dark") {
      App.theme = "dark";
    } else {
      App.theme = "light";
    }

    // 2. Đồng bộ giao diện (Icon & Màu sắc) theo App.theme vừa lấy
    App.applyTheme();

    // Các nút cơ bản cũ
    if (document.getElementById("btnAddVector"))
      document.getElementById("btnAddVector").onclick = App.onAddVector;
    if (document.getElementById("btnClearAll"))
      document.getElementById("btnClearAll").onclick = App.clearAllVectors;
    if (document.getElementById("btnIndep"))
      document.getElementById("btnIndep").onclick = App.linearIndependenceUI;
    if (document.getElementById("btnRank"))
      document.getElementById("btnRank").onclick = App.rankVectorsUI;

    function bindAcademicSolutionButtons() {
      const btnIndepSol = document.getElementById("btnIndepSolution");
      if (btnIndepSol) {
        btnIndepSol.onclick = () => {
          if (typeof App.openSolutionPanel !== "function") return;
          if (App.cachedIndepConfig) {
            App.openSolutionPanel({ ...App.cachedIndepConfig, autoOpen: true });
          } else {
            App.openSolutionPanel({
              title: "Độc lập - phụ thuộc tuyến tính",
              tab1Label: "Cách 1",
              tab2Label: "Cách 2",
              showSubTabs: false,
              content1: '<div class="sol-empty">Vui lòng chọn vector và bấm nút "Kiểm tra" trước.</div>',
              autoOpen: true,
            });
          }
        };
      }

      const btnRankSol = document.getElementById("btnRankSolution");
      if (btnRankSol) {
        btnRankSol.onclick = () => {
          if (typeof App.openSolutionPanel !== "function") return;
          if (App.cachedRankConfig) {
            App.openSolutionPanel({ ...App.cachedRankConfig, autoOpen: true });
          } else {
            App.openSolutionPanel({
              title: "Hạng của hệ vector",
              tab1Label: "Cách 1",
              tab2Label: "Cách 2",
              showSubTabs: false,
              content1: '<div class="sol-empty">Vui lòng chọn vector và bấm nút "Tính hạng" trước.</div>',
              autoOpen: true,
            });
          }
        };
      }
    }
    bindAcademicSolutionButtons();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bindAcademicSolutionButtons);
    }

    // --- XỬ LÝ MENU CÀI ĐẶT (BÁNH RĂNG) ---
    const btnSettings = document.getElementById("btnSettings");
    const dropdown = document.getElementById("settingsDropdown");

    // 1. Bật/Tắt Menu
    if (btnSettings && dropdown) {
      btnSettings.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("show");
      });
      document.addEventListener("click", (e) => {
        if (!dropdown.contains(e.target) && e.target !== btnSettings) {
          dropdown.classList.remove("show");
        }
      });
    }

    // 2. Toggle Animation
    const animToggle = document.getElementById("animToggle");
    if (animToggle) {
      animToggle.checked = App.useAnimation;
      animToggle.addEventListener("change", () => {
        App.useAnimation = animToggle.checked;
      });
    }

    // 3. Toggle Theme (Đã fix đồng bộ)
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
      // [QUAN TRỌNG] Set trạng thái nút gạt theo App.theme đã đồng bộ ở trên
      themeToggle.checked = App.theme === "dark";

      // Xử lý sự kiện khi bấm
      themeToggle.addEventListener("change", () => {
        App.toggleTheme();
      });
    }

    const opSel = document.getElementById("opSelect");
    if (opSel) {
      opSel.onchange = function () {
        App.refreshCalcUI(false);
      };
    }
  });
  // =========================================================
  // PHẦN 3: LOGIC TƯƠNG TÁC HÌNH HỘP & GIZMO (ĐÃ FIX)
  // =========================================================

  let interactMode = false;
  let transformControl = null;
  let parallelepipedMesh = null;
  let interactVectors = []; // Lưu danh sách các object vector đang tham gia

  // 1. Khởi tạo hệ thống tương tác
  function initInteraction() {
    if (!window.App || !window.Vec3D || !Vec3D._scene) return;

    // Tạo Gizmo điều khiển
    transformControl = new THREE.TransformControls(
      Vec3D._camera,
      Vec3D._renderer.domElement,
    );

    // Khi đang kéo -> Tắt xoay camera
    transformControl.addEventListener("dragging-changed", function (event) {
      if (Vec3D._controls) Vec3D._controls.enabled = !event.value;
    });

    // Khi kéo xong -> Cập nhật lại hình hộp & Số liệu
    transformControl.addEventListener("change", function () {
      if (interactMode) {
        syncVectorData(); // Cập nhật số liệu trong object
        updateParallelepipedMesh(); // Vẽ lại hộp

        // [QUAN TRỌNG] Cập nhật lại giao diện & render lại
        if (App.renderVectorList) App.renderVectorList();
        if (App.refreshCalcVectorOptions) App.refreshCalcVectorOptions(); // Để số trên checklist nhảy theo
        // Lưu ý: Không gọi redrawAll() ở đây vì sẽ làm mất Gizmo, ta chỉ cập nhật mũi tên thôi
      }
    });

    Vec3D._scene.add(transformControl);

    // Gắn sự kiện nút
    const btnInt = document.getElementById("btnInteract");
    if (btnInt) btnInt.addEventListener("click", toggleInteraction);
  }

  // 2. Bật/Tắt chế độ tương tác
  function toggleInteraction() {
    // Lấy danh sách ID đang được tick trong phần "Độc lập tuyến tính" (hoặc checklist nào ông muốn)
    // Giả sử dùng 'indepChecklist' làm chuẩn để chọn 3 vector tạo hộp
    const container = document.getElementById("indepChecklist");
    if (!container) return;

    const checkedBoxes = container.querySelectorAll(
      'input[type="checkbox"]:checked',
    );
    const selectedIds = Array.from(checkedBoxes).map((cb) => Number(cb.value));

      if (!interactMode) {
      // --- BẮT ĐẦU ---
      if (selectedIds.length !== 3) {
        App.showToast(
          "⚠️ Vui lòng tick chọn ĐÚNG 3 vector trong danh sách 'Kiểm tra ĐLTT' để tạo hộp!",
          "error",
        );
        return;
      }

      // Tự động chuyển sang chế độ 3D nếu đang ở 2D
      if (App.mode !== "3D" && typeof App.toggleMode === "function") {
        App.toggleMode();
      }

      if (!transformControl) {
        initInteraction();
      }

      interactMode = true;
      const btn = document.getElementById("btnInteract");
      if (btn) {
        btn.innerHTML = '<i class="ph ph-stop"></i> Dừng';
        btn.classList.add("active");
      }

      // Lấy object vector từ ID
      interactVectors = selectedIds
        .map((id) => App.vectorList.find((v) => v.id === id))
        .filter((x) => x);

      // Vẽ hộp
      updateParallelepipedMesh();

      // Gắn Gizmo vào vector thứ 3 (vecto cuối cùng)
      attachGizmoToVector(interactVectors[2]);
    } else {
      // --- DỪNG ---
      interactMode = false;
      const btn = document.getElementById("btnInteract");
      if (btn) {
        btn.innerHTML = '<i class="ph ph-cube"></i> Hình hộp 3D';
        btn.classList.remove("active");
      }

      if (parallelepipedMesh && Vec3D._scene) {
        Vec3D._scene.remove(parallelepipedMesh);
        parallelepipedMesh = null;
      }
      if (transformControl) {
        transformControl.detach();
      }
      if (App.redrawAll) App.redrawAll({ frame: false }); // Vẽ lại sạch sẽ
    }
  }

  App.lockInteraction = function() {
    // 1. Nếu user đang mở hộp Gizmo kéo thả -> Ép tắt ngang (thu hồi Gizmo)
    if (interactMode) toggleInteraction(); 
    
    // 2. Làm mù nút Tương tác
    const btn = document.getElementById("btnInteract");
    if (btn) {
        btn.style.opacity = "0.4";
        btn.style.pointerEvents = "none";
    }
    App.isAnimating = true; // Cắm cờ báo hiệu hệ thống đang bận
  };

  App.unlockInteraction = function() {
    // Nhả khóa nút Tương tác
    const btn = document.getElementById("btnInteract");
    if (btn) {
        btn.style.opacity = "1";
        btn.style.pointerEvents = "auto";
    }
    App.isAnimating = false;
  };
  // 3. Vẽ hình hộp
  function updateParallelepipedMesh() {
    if (parallelepipedMesh) Vec3D._scene.remove(parallelepipedMesh);
    if (!interactMode || interactVectors.length < 3) return;

    // Chuyển mảng [x,y,z] thành THREE.Vector3
    // [FIX] Dùng v.vec thay vì v.components
    const v1 = new THREE.Vector3(...toVec3(interactVectors[0].vec));
    const v2 = new THREE.Vector3(...toVec3(interactVectors[1].vec));
    const v3 = new THREE.Vector3(...toVec3(interactVectors[2].vec));

    // Scale theo tỷ lệ khung nhìn (nếu có logic scale) - ở đây lấy thô
    const u = Vec3D.S3D ? Vec3D.S3D.unitsPerWorld : 1;
    v1.multiplyScalar(u);
    v2.multiplyScalar(u);
    v3.multiplyScalar(u);

    const O = new THREE.Vector3(0, 0, 0);
    const A = v1.clone(),
      B = v2.clone(),
      C = v3.clone();
    const D = v1.clone().add(v2);
    const E = v1.clone().add(v3);
    const F = v2.clone().add(v3);
    const G = v1.clone().add(v2).add(v3);

    // Thứ tự đỉnh để tạo các mặt tam giác (Counter-clockwise)
    const vertices = [
      O,
      B,
      D,
      O,
      D,
      A, // Đáy dưới (O-B-D-A)
      C,
      E,
      G,
      C,
      G,
      F, // Đáy trên (C-E-G-F)
      O,
      A,
      E,
      O,
      E,
      C, // Mặt bên trái
      B,
      F,
      G,
      B,
      G,
      D, // Mặt bên phải
      O,
      C,
      F,
      O,
      F,
      B, // Mặt sau
      A,
      D,
      G,
      A,
      G,
      E, // Mặt trước
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(vertices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      color: 0x90ee90,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      shininess: 50,
      depthWrite: false,
    });

    parallelepipedMesh = new THREE.Mesh(geometry, material);

    // Wireframe viền đen cho đẹp
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x27ae60 }),
    );
    parallelepipedMesh.add(line);

    Vec3D._scene.add(parallelepipedMesh);
  }

  // 4. Đồng bộ dữ liệu: Gizmo -> Vector Object
  function syncVectorData() {
    const targetMesh = transformControl.object;
    if (!targetMesh) return;

    // Tìm xem Gizmo đang gắn vào vector nào
    // [FIX] So sánh qua thuộc tính tạm gizmoBall
    const targetVec = interactVectors.find((v) => v.gizmoBall === targetMesh);

    if (targetVec) {
      // Tọa độ thế giới thực của Gizmo
      const newPos = targetMesh.position;

      // Chuyển về tọa độ toán học (chia cho tỉ lệ vẽ)
      const u = Vec3D.S3D ? Vec3D.S3D.unitsPerWorld : 1;
      const x = parseFloat((newPos.x / u).toFixed(2));
      const y = parseFloat((newPos.y / u).toFixed(2));
      const z = parseFloat((newPos.z / u).toFixed(2));

      // Cập nhật dữ liệu gốc
      targetVec.vec = [x, y, z];

      // Cập nhật hình ảnh 3D (Gọi trực tiếp hàm của Vec3D để nhanh)
      if (window.Vec3D) {
        // Xóa arrow cũ vẽ lại arrow mới (hoặc update nếu Vec3D hỗ trợ update)
        // Cách đơn giản nhất: Vẽ lại toàn bộ mũi tên
        Vec3D.draw3DAllVectors({ frame: false });
        // Lưu ý: redrawAll sẽ xóa scene, làm mất GizmoBall -> Cần cẩn thận.
        // Tốt nhất chỉ update Mesh nếu có thể. Nhưng để đơn giản, ta chấp nhận redraw
        // nhưng phải add lại gizmoBall.

        // => CÁCH TỐT HƠN: Cập nhật object tham chiếu trong Scene (nếu ông lưu arrowMesh vào object vector)
        // Ở đây ta dùng cách đơn giản: Cập nhật text hiển thị thôi, hình vẽ chờ thả chuột mới update full.
      }
    }
  }

  // 5. Gắn Gizmo
  function attachGizmoToVector(vec) {
    if (!window.Vec3D) return;

    // Tạo 1 cục dummy tại đầu vector để gizmo bám vào
    if (vec.gizmoBall) Vec3D._scene.remove(vec.gizmoBall);

    const u = Vec3D.S3D ? Vec3D.S3D.unitsPerWorld : 1;
    const pos = new THREE.Vector3(
      vec.vec[0] * u,
      vec.vec[1] * u,
      (vec.vec[2] || 0) * u,
    );

    const geo = new THREE.BoxGeometry(u * 0.5, u * 0.5, u * 0.5);
    const mat = new THREE.MeshBasicMaterial({ visible: false }); // Ẩn đi
    vec.gizmoBall = new THREE.Mesh(geo, mat);
    vec.gizmoBall.position.copy(pos);

    Vec3D._scene.add(vec.gizmoBall);
    transformControl.attach(vec.gizmoBall);
  }

  // Tự động init
  window.addEventListener("load", () => {
    setTimeout(initInteraction, 1500);
  });

  // --- HÀM QUẢN LÝ ẨN/HIỆN & DỌN RÁC (ĐÃ GỘP CHUẨN) ---
  App.updateVisibilityByCalc = function () {
    const v1Sel = document.getElementById("v1Select");
    const v2Sel = document.getElementById("v2Select");

    const id1 = v1Sel ? Number(v1Sel.value) : 0;
    const id2 = v2Sel ? Number(v2Sel.value) : 0;

    App.currentProjVisual = null;
    // 1. DỌN SẠCH RÁC HÌNH CHIẾU
    App.tempGhosts = []; // Xóa vết 2D
    if (App._currentProjLine3D && App._currentProjLine3D.parent) {
      App._currentProjLine3D.parent.remove(App._currentProjLine3D); // Xóa vết 3D
      App._currentProjLine3D = null;
    }
    // [BỔ SUNG CHÍ MẠNG] TIÊU DIỆT TOÀN BỘ LABEL LƠ LỬNG
    if (App._activeAnimLabels && App._activeAnimLabels.length > 0) {
        App._activeAnimLabels.forEach(lbl => { if(lbl && lbl.parentNode) lbl.remove(); });
        App._activeAnimLabels = [];
    }

    // 2. ẨN/HIỆN VECTOR
    const hasSelection = id1 > 0 || id2 > 0;
    App.vectorList.forEach((v) => {
      if (!hasSelection) {
        v.visible = true;
      } else {
        v.visible = v.id === id1 || v.id === id2;
      }
    });

    if (typeof App.renderVectorList === "function") App.renderVectorList();
    if (typeof App.redrawAll === "function") App.redrawAll({ frame: false });
  };

  // =========================================================
  // HÀM DUY TRÌ HIỆN TRƯỜNG TĨNH CHO 2D (ĐÃ THÊM GIÁ & MÀU THẬT)
  // =========================================================
  App.refreshProjectionOverlay = function () {
    if (App.mode === "2D") {
      if (App.tempGhosts)
        App.tempGhosts = App.tempGhosts.filter(
          (g) => !g.isRightAngleOverlay && !g.isActionLineOverlay,
        );
      if (!App.currentProjVisual) return;
      const v1 = App.vectorList.find(
        (v) => v.id === App.currentProjVisual.v1Id,
      );
      const res = App.vectorList.find(
        (v) => v.id === App.currentProjVisual.resId,
      );
      const v2 = App.vectorList.find(
        (v) => v.id === App.currentProjVisual.v2Id,
      );

      if (v1 && res) {
        if (!App.tempGhosts) App.tempGhosts = [];

        const isDark = document.body.classList.contains("dark");
        const actionColor = isDark ? "#888888" : "#aaaaaa";

        // 1. Vẽ Giá vector (Action Line - Màu xám nhạt)
        const endPx = res.vec[0],
          endPy = res.vec[1];
        let actionTarget = [endPx * 1.15, endPy * 1.15];
        if (actionTarget[0] === 0 && actionTarget[1] === 0 && v2)
          actionTarget = [v2.vec[0] * 1.15, v2.vec[1] * 1.15];

        App.tempGhosts.push({
          isActionLineOverlay: true,
          vec: actionTarget,
          offset: [0, 0],
          colorCss: actionColor,
          alpha: 0.5,
          isGhost: true,
          isDashed: false,
          noArrow: true,
          isRightAngle: false,
        });

        // 2. Vẽ Đường gióng nét đứt (MÀU THẬT CỦA VECTOR V1)
        App.tempGhosts.push({
          isRightAngleOverlay: true,
          vec: [res.vec[0] - v1.vec[0], res.vec[1] - v1.vec[1]],
          offset: [...v1.vec],
          colorCss: v1.colorCss, // LẤY MÀU THẬT CỦA V1
          alpha: 0.6,
          isGhost: true,
          isDashed: true,
          noArrow: true,
          isRightAngle: true,
        });
      }
    }
  };

  // [TRÁI TIM TOÁN HỌC 3D V2]: Khóa dính tọa độ, Chống xóa Theme, Texture nét đứt
  if (!App._projSyncLoopRunning) {
    App._projSyncLoopRunning = true;

    App._initProjMeshes3D = function (hue = 200) {
      if (App._projGroup3D)
        App._projGroup3D.clear(); // Xóa sạch rác cũ
      else App._projGroup3D = new THREE.Group();

      const color = new THREE.Color(`hsl(${hue}, 85%, 60%)`);

      // ==========================================================
      // [FIX LỖI CỤC TRẮNG]: Đã phẫu thuật cắt bỏ "Mặt cầu Hologram" rác ở đây!
      // CHỈ GIỮ LẠI CÁC THÀNH PHẦN GIÓNG (Ống nét đứt và Góc vuông)
      // ==========================================================
      const geo = new THREE.CylinderGeometry(1, 1, 1, 8);
      geo.rotateX(Math.PI / 2);

      const canvas = document.createElement("canvas");
      canvas.width = 16;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 16, 64);
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapT = THREE.RepeatWrapping;

      App._projMeshes = {
        tube: new THREE.Mesh(
          geo,
          new THREE.MeshBasicMaterial({ color: color, alphaMap: tex, transparent: true })
        ),
        edge1: new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: color })),
        edge2: new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: color })),
        sqGroup: new THREE.Group() // Tui tạo nhóm riêng để góc vuông 3D hiển thị chuẩn
      };

      App._projMeshes.sqGroup.add(App._projMeshes.edge1);
      App._projMeshes.sqGroup.add(App._projMeshes.edge2);

      App._projGroup3D.add(App._projMeshes.tube);
      App._projGroup3D.add(App._projMeshes.sqGroup);

      Vec3D._mathGroup.add(App._projGroup3D);
    };

    const sync3D = () => {
      requestAnimationFrame(sync3D);

      if (typeof Vec3D === 'undefined' || !Vec3D._mathGroup) return;

      if (!App._projGroup3D) App._initProjMeshes3D();

      if (
        App.mode !== "3D" ||
        !App.currentProjVisual ||
        !window.Vec3D ||
        !Vec3D._mathGroup
      ) {
        if (App._projGroup3D) App._projGroup3D.visible = false;
        return;
      }

      // [FIX LỖI MẤT KHI ĐỔI THEME]: Tự động Hồi sinh nếu bị hàm refreshTheme xóa mất
      if (!App._projGroup3D.parent) {
        Vec3D._mathGroup.add(App._projGroup3D);
      }

      const v1 = App.vectorList.find(
        (v) => v.id === App.currentProjVisual.v1Id,
      );
      const res = App.vectorList.find(
        (v) => v.id === App.currentProjVisual.resId,
      );
      const v2 = App.vectorList.find(
        (v) => v.id === App.currentProjVisual.v2Id,
      );

      if (!v1 || !res || !v1.visible || !res.visible) {
        App._projGroup3D.visible = false;
        return;
      }

      App._projGroup3D.visible = true;

      // [FIX DARK THEME 3D]: Tự động đổi màu tương phản
      const isDark = document.body.classList.contains("dark");
      const projColor = isDark ? 0xdddddd : 0x555555;
      App._projMeshes.tube.material.color.setHex(projColor);
      App._projMeshes.edge1.material.color.setHex(projColor);
      App._projMeshes.edge2.material.color.setHex(projColor);

      const u = Vec3D.S3D.unitsPerWorld || 1;

      const getTip = (id, vec) => {
        const g = Vec3D.threeVecMap ? Vec3D.threeVecMap.get(id) : null;
        if (g && g.userData && g.userData.tipLocal)
          return g.userData.tipLocal.clone();
        return new THREE.Vector3(vec[0] * u, vec[1] * u, (vec[2] || 0) * u);
      };

      const startP = getTip(v1.id, v1.vec);
      const endP = getTip(res.id, res.vec);
      const dist = startP.distanceTo(endP);

      // Độ dày tinh tế
      const camDist = Vec3D._camera
        ? Vec3D._camera.position.distanceTo(startP)
        : 10;
      const thick = Math.max(0.002 * camDist, 0.015 * u);

      // 1. Ép ống trụ đường gióng
      const tube = App._projMeshes.tube;
      tube.position.copy(startP).lerp(endP, 0.5);
      if (dist > 0.001) tube.lookAt(endP);
      tube.scale.set(thick, thick, dist);

      // Cập nhật số lần lặp nét đứt theo độ dài thực tế để nét đứt luôn đều nhau
      tube.material.alphaMap.repeat.set(1, dist / (0.15 * u));

      // 2. Ép Góc vuông (Sửa lỗi to bất chấp bối cảnh)
      const dir1 = new THREE.Vector3().subVectors(startP, endP).normalize();
      let dir2 = endP.clone().multiplyScalar(-1).normalize();
      if (dir2.lengthSq() < 0.001 && v2)
        dir2 = new THREE.Vector3(
          v2.vec[0] * u,
          v2.vec[1] * u,
          (v2.vec[2] || 0) * u,
        ).normalize();

      if (dir1.lengthSq() > 0.1 && dir2.lengthSq() > 0.1) {
        App._projMeshes.sqGroup.visible = true;

        // [FIX GÓC VUÔNG TO]: Chốt cứng kích thước bằng 0.15 lần lưới (như 2D)
        const sqSize = 0.15 * u;

        const pA = endP.clone().add(dir1.clone().multiplyScalar(sqSize));
        const pB = endP.clone().add(dir2.clone().multiplyScalar(sqSize));
        const corner = endP
          .clone()
          .add(dir1.clone().multiplyScalar(sqSize))
          .add(dir2.clone().multiplyScalar(sqSize));

        const e1 = App._projMeshes.edge1;
        e1.position.copy(pA).lerp(corner, 0.5);
        e1.lookAt(corner);
        e1.scale.set(thick * 0.6, thick * 0.6, pA.distanceTo(corner));

        const e2 = App._projMeshes.edge2;
        e2.position.copy(pB).lerp(corner, 0.5);
        e2.lookAt(corner);
        e2.scale.set(thick * 0.6, thick * 0.6, pB.distanceTo(corner));
      } else {
        App._projMeshes.sqGroup.visible = false;
      }
    };
    sync3D();
  }

  /* =======================================================================
     PHẦN 7: ĐIỀU KHIỂN HOẠT ẢNH VECTOR THAM SỐ TÁCH BẠCH TỪNG VECTOR
     ======================================================================= */
  App._paramAnimFrameId = null;
  App._lastAnimTimestamp = null;

  // Lấy tầm nhìn khung vẽ hiện tại để quét tham số vô cực
  App.getViewportRange = function () {
    if (window.Vec2D && Vec2D.gridInfo2D) {
      const g = Vec2D.gridInfo2D;
      const px = g.px || 40;
      const canvas = document.getElementById("canvas2D");
      const w = canvas ? canvas.width : 800;
      const xSpan = Math.max(10, Math.ceil(w / (px * 2) + 4));
      return { min: -xSpan, max: xSpan };
    }
    return { min: -20, max: 20 };
  };

  // Chuyển đổi định dạng màu sắc CSS bất kỳ sang mã HEX chuẩn #rrggbb cho input color
  App.colorToHex = function (colorStr) {
    if (!colorStr) return "#0090ff";
    const str = String(colorStr).trim();
    if (str.startsWith("#")) {
      if (str.length === 7) return str;
      if (str.length === 4) {
        return "#" + str[1] + str[1] + str[2] + str[2] + str[3] + str[3];
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "#0090ff";
    ctx.fillStyle = str;
    const computed = ctx.fillStyle;
    if (computed && computed.startsWith("#")) return computed;
    const m = (computed || "").match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (m) {
      const r = parseInt(m[1], 10).toString(16).padStart(2, "0");
      const g = parseInt(m[2], 10).toString(16).padStart(2, "0");
      const b = parseInt(m[3], 10).toString(16).padStart(2, "0");
      return `#${r}${g}${b}`;
    }
    return "#0090ff";
  };

  // Cập nhật màu sắc của vector và đồng bộ toàn bộ giao diện 2D / 3D
  App.setVectorColor = function (itemId, colorHex) {
    const item = (App.vectorList || []).find((v) => String(v.id) === String(itemId));
    if (!item || !colorHex) return;
    const hex = App.colorToHex(colorHex);
    item.colorHex = hex;
    item.colorCss = hex;
    item.color = hex;

    const sw = document.getElementById(`vecColorSwatch_${item.id}`);
    if (sw) sw.style.background = hex;

    const popHex = document.getElementById(`vecPopColorHex_${item.id}`);
    if (popHex) popHex.textContent = hex.toUpperCase();
    const popInp = document.getElementById(`vecPopColorInp_${item.id}`);
    if (popInp && popInp.value !== hex) popInp.value = hex;

    if (App.mode === "3D" && window.Vec3D) {
      if (typeof Vec3D.hardRefresh3D === "function") {
        Vec3D.hardRefresh3D(false);
      } else if (typeof Vec3D.draw3DAllVectors === "function") {
        Vec3D.draw3DAllVectors({ frame: false });
      }
    } else if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
      Vec2D.draw2DAllVectors();
    }
  };

  // Cập nhật trực tiếp giao diện của một thẻ vector tham số
  App.updateSingleVectorParamUI = function (item, isTick = false) {
    if (!item) return;

    const activeVars = (Array.isArray(item.activeAnimVars) && item.activeAnimVars.length > 0)
      ? item.activeAnimVars
      : (item.vars && item.vars.length ? item.vars : [item.paramVar || "t"]);
    const isMultiMode = activeVars.length > 1;
    const singleValBox = document.getElementById(`vecParamSingleValBox_${item.id}`);
    const multiValBox = document.getElementById(`vecParamMultiVals_${item.id}`);

    if (singleValBox) singleValBox.style.display = "inline-flex";

    const currentVar = item.paramVar || (activeVars.length ? activeVars[0] : "t");
    item.paramVar = currentVar;

    const varLbl = document.getElementById(`vecParamVarLbl_${item.id}`);
    if (varLbl) {
      varLbl.textContent = `${currentVar} =`;
    }
    const valInp = document.getElementById(`vecParamValInp_${item.id}`);
    if (valInp && document.activeElement !== valInp) {
      const curVal = (item.scopeValues && item.scopeValues[currentVar] !== undefined)
        ? item.scopeValues[currentVar]
        : item.paramVal;
      valInp.value = Number(curVal ?? 1.0).toFixed(2);
    }

    if (isMultiMode) {
      if (multiValBox) {
        multiValBox.style.display = "flex";
        const badges = multiValBox.querySelectorAll(".vec-multi-badge");
        if (badges.length === activeVars.length) {
          activeVars.forEach((vName, idx) => {
            const b = badges[idx];
            const val = (item.scopeValues && item.scopeValues[vName] !== undefined)
              ? Number(item.scopeValues[vName]).toFixed(2)
              : (vName === currentVar ? Number(item.paramVal).toFixed(2) : "0.00");
            b.textContent = `${vName} = ${val}`;
            b.classList.toggle("active", vName === currentVar);
          });
        } else {
          multiValBox.innerHTML = "";
          activeVars.forEach((vName) => {
            const val = (item.scopeValues && item.scopeValues[vName] !== undefined)
              ? Number(item.scopeValues[vName]).toFixed(2)
              : (vName === currentVar ? Number(item.paramVal).toFixed(2) : "0.00");
            const isCur = (vName === currentVar);
            const badge = document.createElement("button");
            badge.type = "button";
            badge.className = "vec-multi-badge" + (isCur ? " active" : "");
            badge.title = `Bấm để điều khiển biến ${vName} trên thanh trượt và ô nhập`;
            badge.textContent = `${vName} = ${val}`;
            badge.onclick = (e) => {
              e.stopPropagation();
              item.paramVar = vName;
              if (item.varRanges && item.varRanges[vName]) {
                item.paramMin = item.varRanges[vName].min;
                item.paramMax = item.varRanges[vName].max;
              }
              if (item.scopeValues && item.scopeValues[vName] !== undefined) {
                item.paramVal = item.scopeValues[vName];
              }
              const slider = document.getElementById(`vecParamSlider_${item.id}`);
              if (slider) {
                slider.min = item.paramInfinity ? -25 : (item.paramMin ?? -10.0);
                slider.max = item.paramInfinity ? 25 : (item.paramMax ?? 10.0);
                slider.value = item.paramVal;
              }
              App.updateSingleVectorParamUI(item, false);
            };
            multiValBox.appendChild(badge);
          });
        }
      }
    } else {
      if (multiValBox) multiValBox.style.display = "none";
    }

    const sliderEl = document.getElementById(`vecParamSlider_${item.id}`);
    if (sliderEl && document.activeElement !== sliderEl) {
      const curVal = (item.scopeValues && item.scopeValues[currentVar] !== undefined)
        ? item.scopeValues[currentVar]
        : item.paramVal;
      sliderEl.value = curVal;
    }

    // Khi đang trong vòng lặp vẽ chuyển động (isTick = true), tuyệt đối không đụng vào playBtn
    // để tránh tái sinh DOM làm trình duyệt hủy sự kiện click của người dùng!
    if (isTick) return;

    const playBtn = document.getElementById(`vecParamPlay_${item.id}`);
    if (playBtn) {
      playBtn.innerHTML = item.isAnimating ? '<i class="ph ph-pause"></i>' : '<i class="ph ph-play"></i>';
      playBtn.classList.toggle("is-active", !!item.isAnimating);
      playBtn.title = item.isAnimating ? "Tạm dừng" : "Chạy hoạt ảnh";
    }
  };

  // Hàm vẽ đệm trực tiếp cực nhẹ, triệt tiêu hoàn toàn nháy đen do resize canvas
  App._renderParamStep = function () {
    if (App.mode === "3D" && window.Vec3D) {
      if (typeof Vec3D.draw3DAllVectors === "function") {
        Vec3D.draw3DAllVectors({ frame: false });
      }
      if (Vec3D._renderer && Vec3D._scene && Vec3D._camera) {
        Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
      }
      if (Vec3D._labelRenderer && Vec3D._scene && Vec3D._camera) {
        Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
      }
    } else if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
      Vec2D.draw2DAllVectors();
    }
  };

  // Thiết lập giá trị tham số cho một vector cụ thể qua thanh trượt
  App.setVectorParamValue = function (itemId, val) {
    const item = (App.vectorList || []).find((v) => String(v.id) === String(itemId));
    if (!item || !item.isParametric || typeof item.fn !== "function") return;
    const num = parseFloat(val);
    if (isNaN(num)) return;
    item.paramVal = num;
    if (item.scopeValues && item.paramVar) {
      item.scopeValues[item.paramVar] = num;
    }
    const nextVec = item.fn.call(item, num, item.scopeValues);
    if (Array.isArray(nextVec) && nextVec.every((c) => isFinite(c))) {
      item.vec = nextVec;
    }
    const valInp = document.getElementById(`vecParamValInp_${item.id}`);
    if (valInp && document.activeElement !== valInp) {
      valInp.value = Number(num).toFixed(2);
    }
    App.updateSingleVectorParamUI(item, false);
    if (window.App?.MasterParamController?.broadcastParamValue) {
      window.App.MasterParamController.broadcastParamValue(item.paramVar || "t", num, "vector", item.id);
    }
    // Đồng bộ Live với LinearTransform và MixedCalc
    const mixedVecSel = document.getElementById("mixedVectorSelect");
    if (mixedVecSel && (mixedVecSel.value === "all" || String(mixedVecSel.value) === String(item.id))) {
      const resBox = document.getElementById("mixedResultBox");
      if (resBox && resBox.style.display !== "none" && typeof App.runMixedCalc === "function") {
        App.runMixedCalc(false);
      }
      if (window.App?.LinearTransform?.isActive?.() && typeof window.App.LinearTransform.updateLiveVector === "function") {
        window.App.LinearTransform.updateLiveVector(item.id, item.vec);
      }
    }
    App._renderParamStep();
  };

  // Thiết lập giá trị tham số trực tiếp qua ô nhập (Tự thích ứng mở rộng dải min/max nếu giá trị vượt ngưỡng)
  App.setVectorParamValueDirect = function (itemId, val) {
    const item = (App.vectorList || []).find((v) => String(v.id) === String(itemId));
    if (!item || !item.isParametric) return;
    const num = parseFloat(val);
    if (isNaN(num)) return;

    let minChanged = false;
    let maxChanged = false;
    if (item.paramMin === undefined || isNaN(item.paramMin)) item.paramMin = -10.0;
    if (item.paramMax === undefined || isNaN(item.paramMax)) item.paramMax = 10.0;

    if (num < item.paramMin) {
      item.paramMin = Math.floor(num);
      minChanged = true;
    }
    if (num > item.paramMax) {
      item.paramMax = Math.ceil(num);
      maxChanged = true;
    }

    const sliderEl = document.getElementById(`vecParamSlider_${item.id}`);
    if (sliderEl) {
      if (minChanged) sliderEl.min = item.paramMin;
      if (maxChanged) sliderEl.max = item.paramMax;
      sliderEl.value = num;
    }

    const popover = document.getElementById(`vecParamPopover_${item.id}`);
    if (popover && typeof popover.querySelectorAll === "function") {
      const inputs = popover.querySelectorAll(".vec-param-num-inp");
      if (inputs.length >= 2) {
        if (minChanged) inputs[0].value = item.paramMin;
        if (maxChanged) inputs[1].value = item.paramMax;
      }
    }

    item.paramVal = num;
    if (item.scopeValues && item.paramVar) {
      item.scopeValues[item.paramVar] = num;
    }
    if (typeof item.fn === "function") {
      const nextVec = item.fn.call(item, num, item.scopeValues);
      if (Array.isArray(nextVec) && nextVec.every((c) => isFinite(c))) {
        item.vec = nextVec;
      }
    }

    App.updateSingleVectorParamUI(item, false);
    App._renderParamStep();
  };

  // Bật tắt hoạt ảnh cho một vector cụ thể
  App.toggleVectorAnimation = function (itemId) {
    const item = (App.vectorList || []).find((v) => String(v.id) === String(itemId));
    if (!item || !item.isParametric) return;
    item.isAnimating = !item.isAnimating;
    if (item.isAnimating) {
      if (!item.animDirection) item.animDirection = 1;
      App.startParamAnimationLoop();
    } else {
      const anyOtherRunning = (App.vectorList || []).some((v) => v.id !== item.id && v.isParametric && v.isAnimating);
      if (!anyOtherRunning && App._paramAnimFrameId) {
        cancelAnimationFrame(App._paramAnimFrameId);
        App._paramAnimFrameId = null;
        App._lastAnimTimestamp = null;
      }
    }
    App.updateSingleVectorParamUI(item, false);
  };

  // Đặt lại tham số của vector về giá trị mặc định lúc mới được tạo ra
  App.resetVectorParam = function (itemId) {
    const item = (App.vectorList || []).find((v) => String(v.id) === String(itemId));
    if (!item || !item.isParametric) return;
    item.isAnimating = false;
    const defaultVal = item.initialParamVal !== undefined ? item.initialParamVal : 1.0;
    item.paramVal = defaultVal;
    if (item.scopeValues) {
      if (item.vars && Array.isArray(item.vars)) {
        item.vars.forEach((vName) => {
          item.scopeValues[vName] = defaultVal;
        });
      } else if (item.paramVar) {
        item.scopeValues[item.paramVar] = defaultVal;
      }
    }
    if (item.varStates) {
      Object.keys(item.varStates).forEach((vName) => {
        item.varStates[vName].dir = 1;
      });
    }
    item.animDirection = 1;
    if (typeof item.fn === "function") {
      const resetVec = item.fn.call(item, defaultVal, item.scopeValues);
      if (Array.isArray(resetVec) && resetVec.every((c) => isFinite(c))) {
        item.vec = resetVec;
      } else if (item.initialVec && Array.isArray(item.initialVec)) {
        item.vec = item.initialVec.slice();
      }
    } else if (item.initialVec && Array.isArray(item.initialVec)) {
      item.vec = item.initialVec.slice();
    }
    const sliderEl = document.getElementById(`vecParamSlider_${item.id}`);
    if (sliderEl) sliderEl.value = defaultVal;

    const valInp = document.getElementById(`vecParamValInp_${item.id}`);
    if (valInp) valInp.value = Number(defaultVal).toFixed(2);

    const anyOtherRunning = (App.vectorList || []).some((v) => v.id !== item.id && v.isParametric && v.isAnimating);
    if (!anyOtherRunning && App._paramAnimFrameId) {
      cancelAnimationFrame(App._paramAnimFrameId);
      App._paramAnimFrameId = null;
      App._lastAnimTimestamp = null;
    }

    App.updateSingleVectorParamUI(item, false);
    App._renderParamStep();
  };

  // Vòng lặp hoạt ảnh tham số đa vector
  App.startParamAnimationLoop = function () {
    if (App._paramAnimFrameId) return;
    App._lastAnimTimestamp = performance.now();

    function step(now) {
      const dt = Math.min(0.08, (now - (App._lastAnimTimestamp || now)) / 1000);
      App._lastAnimTimestamp = now;

      let anyRunning = false;
      let anyChanged = false;

      for (const item of (App.vectorList || [])) {
        if (item.isParametric && item.isAnimating && typeof item.fn === "function") {
          anyRunning = true;
          const duration = Math.max(0.2, Number(item.duration) || 4.0);

          if (!item.varStates) item.varStates = {};
          if (!item.varRanges) item.varRanges = {};

          // Danh sách biến được chọn chạy (chọn 1 chạy 1, chọn nhiều chạy nhiều, không chọn không chạy)
          const varsToAnimate = (Array.isArray(item.activeAnimVars) && item.activeAnimVars.length > 0)
            ? item.activeAnimVars
            : (item.vars && item.vars.length ? item.vars : [item.paramVar || "t"]);
          if (varsToAnimate.length === 0) {
            // Không có biến nào được kích hoạt -> đứng yên
            continue;
          }

          varsToAnimate.forEach((vName, idx) => {
            if (!item.varStates[vName]) {
              const freqRatio = idx === 0 ? 1.0 : (idx === 1 ? 1.4142 : 1.732);
              item.varStates[vName] = { dir: 1, speedRatio: freqRatio };
            }
            const vState = item.varStates[vName];

            // Từng biến có dải Min/Max riêng biệt, không đồng bộ lẫn nhau
            let rangeObj = item.varRanges[vName];
            if (!rangeObj) {
              rangeObj = {
                min: (idx === 0 ? (item.paramMin ?? -10.0) : (item.surfaceMin ?? -5.0)),
                max: (idx === 0 ? (item.paramMax ?? 10.0) : (item.surfaceMax ?? 5.0))
              };
              item.varRanges[vName] = rangeObj;
            }

            let vMin = Number(rangeObj.min);
            let vMax = Number(rangeObj.max);
            if (isNaN(vMin)) vMin = -10.0;
            if (isNaN(vMax)) vMax = 10.0;

            if (item.paramInfinity && vName === item.paramVar) {
              const vp = App.getViewportRange();
              vMin = vp.min;
              vMax = vp.max;
            }

            if (vMax <= vMin) vMax = vMin + 1.0;
            const vRange = vMax - vMin;
            const vSpeed = (vRange / duration) * (vState.dir || 1) * (vState.speedRatio || 1);

            let curVal = (item.scopeValues && item.scopeValues[vName] !== undefined)
              ? item.scopeValues[vName]
              : (item.paramVal !== undefined && vName === item.paramVar ? item.paramVal : (vMin + vRange / 2));

            let nextVVal = curVal + vSpeed * dt;
            if (nextVVal >= vMax) {
              nextVVal = vMax;
              vState.dir = -1;
            } else if (nextVVal <= vMin) {
              nextVVal = vMin;
              vState.dir = 1;
            }

            if (!item.scopeValues) item.scopeValues = {};
            item.scopeValues[vName] = nextVVal;
            if (vName === item.paramVar) {
              item.paramVal = nextVVal;
            }
          });

          const nextVec = item.fn.call(item, item.paramVal, item.scopeValues);
          if (Array.isArray(nextVec) && nextVec.every((c) => isFinite(c))) {
            item.vec = nextVec;
          }
          anyChanged = true;

          App.updateSingleVectorParamUI(item, true);

          // Đồng bộ Live với LinearTransform và MixedCalc
          const mixedVecSel = document.getElementById("mixedVectorSelect");
          if (mixedVecSel && (mixedVecSel.value === "all" || String(mixedVecSel.value) === String(item.id))) {
            const resBox = document.getElementById("mixedResultBox");
            if (resBox && resBox.style.display !== "none" && typeof App.runMixedCalc === "function") {
              App.runMixedCalc(false);
            }
            if (window.App?.LinearTransform?.isActive?.() && typeof window.App.LinearTransform.updateLiveVector === "function") {
              window.App.LinearTransform.updateLiveVector(item.id, item.vec);
            }
          }
        }
      }

      if (anyChanged) {
        App._renderParamStep();
      }

      if (anyRunning) {
        App._paramAnimFrameId = requestAnimationFrame(step);
      } else {
        App._paramAnimFrameId = null;
        App._lastAnimTimestamp = null;
      }
    }

    App._paramAnimFrameId = requestAnimationFrame(step);
  };
})();



