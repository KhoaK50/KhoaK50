// ===================== basis_controller.js (FULL - USER VERSION PRESERVED) =====================
(function () {
  window.App = window.App || {};
  let cachedConfig = null;

  function $(id) {
    return document.getElementById(id);
  }

  // [LOGIC] Lấy ID theo thứ tự DOM (thứ tự người dùng nhìn thấy trên màn hình)
  // Khi người dùng kéo thả, DOM thay đổi, hàm này sẽ lấy đúng thứ tự mới.
  function getCheckedIds(container) {
    if (!container) return [];
    // querySelectorAll trả về NodeList theo thứ tự từ trên xuống dưới trong HTML
    const checkboxes = Array.from(
      container.querySelectorAll('input[type="checkbox"]:checked'),
    );
    return checkboxes
      .map((cb) => {
        const raw =
          cb.value !== undefined && cb.value !== ""
            ? cb.value
            : cb.getAttribute("data-id");
        const id = Number(raw);
        return Number.isFinite(id) ? id : null;
      })
      .filter((id) => id !== null);
  }

  // =========================
  // A) SNAPSHOT / RESTORE
  // =========================
  function snapshotVectorList(list) {
    return (list || []).map((v) => ({
      id: v.id,
      visible: v.visible !== false,
      focus: !!v.focus,
      alpha: typeof v.alpha === "number" ? v.alpha : 1,
      colorCss: v.colorCss,
      colorHex: v.colorHex,
      haloCss: v.haloCss,
      highlighted: !!v.highlighted,
    }));
  }

  function restoreSnapshot(list, snap) {
    if (!Array.isArray(list)) return;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i] && list[i]._basisTemp) list.splice(i, 1);
    }
    const byId = new Map((snap || []).map((s) => [s.id, s]));
    for (const it of list) {
      const s = byId.get(it.id);
      if (!s) continue;
      it.visible = s.visible;
      it.focus = s.focus;
      it.alpha = s.alpha;
      it.colorCss = s.colorCss;
      it.colorHex = s.colorHex;
      it.haloCss = s.haloCss;
      it.highlighted = s.highlighted;
    }
    if (typeof App.renderVectorList === "function") App.renderVectorList();
    if (App.mode === "2D" && window.Vec2D) Vec2D.draw2DAllVectors();
    else if (window.Vec3D) Vec3D.hardRefresh3D(false);
  }

  App._basisBaselineSnapshot = null;
  App._basisModeActive = false;

  App.restoreBasisPreState = function () {
    if (window.App && App.BasisAnimator && typeof App.BasisAnimator.stop === "function") {
      try { App.BasisAnimator.stop(); } catch (_) {}
    }
    App._basisAnimActive = false;
    (App.vectorList || []).forEach((it) => {
      if (!it) return;
      delete it._basisIsBasis;
    });
    if (App._basisBaselineSnapshot) {
      restoreSnapshot(App.vectorList, App._basisBaselineSnapshot);
    }
    if (
      App._basisTempByKey &&
      typeof App._basisTempByKey.clear === "function"
    ) {
      App._basisTempByKey.clear();
    }
    App._basisTempByKey = null;
    App._basisModeActive = false;
    App._basisBaselineSnapshot = null;
  };

  // =========================
  // B) ANIMATION CONTROLS (HỢP NHẤT TRỰC TIẾP TRÊN SIDEBAR)
  // =========================
  App.ensureBasisAnimControls = function () {
    const checklist = $("basisChecklist");
    const out = $("result_basis");
    if (!checklist || !out) return;
    if ($("basisAnimControls")) return;

    const host = out.parentElement || checklist.parentElement;
    if (!host) return;

    const wrap = document.createElement("div");
    wrap.id = "basisAnimControls";
    wrap.className = "basis-sidebar-anim-box";

    wrap.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted, #64748b);">Trực quan hóa không gian</span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="basis-step-pill" id="basisStepCounter">Bước 1 / 3</span>
          <button type="button" id="btnBasisCloseAnim" class="basis-anim-close-btn" title="Đóng trực quan" style="background: transparent; border: none; cursor: pointer; color: var(--text-muted, #64748b); font-size: 13px; padding: 2px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px;">
            <i class="ph ph-x"></i>
          </button>
        </div>
      </div>

      <div class="coord-phase-pills basis-step-pills" id="basisStepPills"></div>

      <div class="basis-anim-btn-row">
        <button type="button" id="btnBasisPrev" class="basis-ctrl-btn" title="Bước trước">
          <i class="ph ph-skip-back"></i>
        </button>
        <button type="button" id="btnBasisPlay" class="basis-ctrl-btn primary" title="Phát / Tạm dừng">
          <i class="ph ph-play" id="iconBasisPlay"></i>
        </button>
        <button type="button" id="btnBasisNext" class="basis-ctrl-btn" title="Bước tiếp">
          <i class="ph ph-skip-forward"></i>
        </button>
        <button type="button" id="btnBasisReplay" class="basis-ctrl-btn" title="Phát lại từ đầu">
          <i class="ph ph-arrow-counter-clockwise"></i>
        </button>
      </div>

      <div class="hud-menu-slider-row basis-speed-slider-wrap" style="padding: 6px 0 2px; margin-top: 6px; border-top: 1px dashed var(--border-subtle, var(--border, #e2e8f0));">
        <div class="hud-menu-slider-header" style="font-size: 11.5px; margin-bottom: 2px;">
          <span class="hud-menu-item-text" style="color: var(--text-muted, #64748b); font-weight: 600;">Tốc độ phát</span>
          <span class="hud-menu-slider-val" id="basisSpeedValue">1.0×</span>
        </div>
        <input type="range" id="basisSpeedSlider" min="0.2" max="2.5" step="0.1" value="1.0" class="hud-range-slider" />
      </div>

      <div class="basis-step-explainer" id="basisStepExplainer">
        <div class="basis-step-title" id="basisStepTitle">Khảo sát hệ vector</div>
        <div class="basis-step-desc" id="basisStepDesc">Bấm nút Trực quan để bắt đầu trực quan hóa không gian.</div>
      </div>
    `;

    wrap.style.display = "none";

    // Dat khoi hoat canh nam ngay duoi khoi ket qua de giu logic thi giac mach lac
    if (out.nextSibling) {
      host.insertBefore(wrap, out.nextSibling);
    } else {
      host.appendChild(wrap);
    }

    const btnClose = wrap.querySelector("#btnBasisCloseAnim");
    if (btnClose) {
      btnClose.addEventListener("click", () => {
        App.stopBasisAnimation();
      });
    }

    const speedSlider = wrap.querySelector("#basisSpeedSlider");
    const syncSliderPct = (val) => {
      if (!speedSlider) return;
      const min = parseFloat(speedSlider.min) || 0.2;
      const max = parseFloat(speedSlider.max) || 2.5;
      const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
      speedSlider.style.setProperty("--slider-pct", `${pct.toFixed(1)}%`);
      speedSlider.style.setProperty("--range-pct", `${pct.toFixed(1)}%`);
    };
    if (speedSlider) {
      speedSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value) || 1.0;
        syncSliderPct(val);
        const valLabel = wrap.querySelector("#basisSpeedValue");
        if (valLabel) valLabel.textContent = `${val.toFixed(1)}×`;
      });
      syncSliderPct(1.0);
    }
  };

  // Dừng và giải phóng hoạt cảnh cơ sở
  App.stopBasisAnimation = function () {
    const wrap = $("basisAnimControls");
    if (wrap) wrap.style.display = "none";

    if (window.App && App.BasisAnimator && typeof App.BasisAnimator.stop === "function") {
      try { App.BasisAnimator.stop(); } catch (_) {}
    }
    if (typeof App.restoreBasisPreState === "function") {
      try { App.restoreBasisPreState(); } catch (_) {}
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      App.ensureBasisAnimControls(),
    );
  } else {
    App.ensureBasisAnimControls();
  }

  // =========================
  // C) MAIN LOGIC: TÍNH CƠ SỞ & SỐ CHIỀU
  // =========================
  App.basisAndDimUI = async function () {
    if (typeof App.handleEmptyListAction === "function") {
      if (App.handleEmptyListAction()) return;
    }

    App.ensureBasisAnimControls();

    const checklist = $("basisChecklist");
    if (!checklist) return;

    // 1. Lấy danh sách ID đã tick (theo đúng thứ tự trên màn hình)
    // Lưu ý: Nếu có Drag & Drop, DOM phải được cập nhật thì hàm này mới đúng.
    const checkedIds = getCheckedIds(checklist);

    // 2. Map ID sang Object Vector (Giữ nguyên thứ tự của checkedIds)
    // Code cũ của bạn đã đúng ở chỗ này, nó sẽ tạo mảng selectedItems theo thứ tự của checkedIds
    const selectedItems = checkedIds
      .map((id) => (App.vectorList || []).find((v) => v.id === id))
      .filter(Boolean);

    if (!selectedItems.length) {
      if (typeof App.showToast === "function")
        App.showToast("⚠️ Hãy tick chọn ít nhất 1 vector!");
      else window.App.showToast("Tick ít nhất 1 vector.", 'warning');
      return;
    }

    if (App._basisModeActive || App._basisBaselineSnapshot) {
      App.restoreBasisPreState();
    }
    if (typeof App.clearAutoVectors === "function") {
      App.clearAutoVectors("basis");
    }

    const out = $("result_basis");
    if (out) out.innerText = "Đang tính toán...";

    App._basisBaselineSnapshot = snapshotVectorList(App.vectorList);

    if (typeof App.stopBasisAnimation === "function") {
      try {
        App.stopBasisAnimation();
      } catch (_) {}
    }

    // Lấy dữ liệu vector thô để gửi đi (gửi string nếu có thể để backend dùng SymPy)
    const vecs = selectedItems.map((it) => {
      if (it.latex) {
        let s = it.latex.replace(/^\\left\[|^\[|\\right\]|\]$/g, "");
        return s.split(",").map((x) => x.trim());
      }
      return (it.vec || []).slice();
    });

    try {
      // [QUAN TRỌNG] Trích xuất cơ sở trực tiếp từ họ vector của người dùng trên đồ thị
      const has3DVector = selectedItems.some(
        (it) => it.vec && it.vec.length >= 3 && Math.abs(it.vec[2] || 0) > 1e-5
      );
      if (has3DVector && App.mode !== "3D" && typeof App.toggleMode === "function") {
        App.toggleMode();
      }
      const spaceDim = (App.mode === "3D" || has3DVector) ? 3 : 2;
      const basisPlan = typeof App.analyzeBasisPlan === "function"
        ? App.analyzeBasisPlan(selectedItems, spaceDim)
        : null;

      let data = null;
      try {
        data = await App.callAPI("basis", {
          vectors: vecs,
          pivot_strategy: "basic",
        });
      } catch (apiErr) {
        console.warn("Backend API basis call failed or offline, falling back to client-side geometric solver:", apiErr);
        data = {
          basis: basisPlan?.finalBasis?.map((it) => it.vec) || [],
          dimension: basisPlan?.finalDim || 2,
          steps: [],
        };
      }

      // Gọi hàm sinh lời giải
      const gen = App.TasksGen && App.TasksGen.Basis;

      const packMat =
        gen && gen.buildBasisByMatrix
          ? gen.buildBasisByMatrix(selectedItems, data)
          : null;

      let packEqGeneral = gen && gen.buildBasisByEquationsGeneral ? gen.buildBasisByEquationsGeneral(selectedItems, data) : null;
      let packEqStep = gen && gen.buildBasisByEquationsStepwise ? gen.buildBasisByEquationsStepwise(selectedItems, data) : null;

      const basisItems = basisPlan?.finalBasis?.length
        ? basisPlan.finalBasis
        : selectedItems.slice(0, typeof data?.dimension === "number" ? data.dimension : 2);

      const dim = typeof basisPlan?.finalDim === "number"
        ? basisPlan.finalDim
        : (typeof packMat?.dimension === "number" ? packMat.dimension : (typeof data?.dimension === "number" ? data.dimension : basisItems.length));

      const dependentItems = basisPlan?.steps
        ? basisPlan.steps.filter((s) => s.type === "REDUNDANT" || s.type === "REDUNDANT_ZERO").map((s) => s.item).filter(Boolean)
        : [];

      // --- [MỚI] 1. TẠO HTML HIỂN THỊ ĐẸP (MATHLIVE READ-ONLY) ---

      // Hàm chuyển vector [1, 2] thành Latex (1, 2) để hiển thị trong Mathfield
      // [FIX FINAL] Logic hiển thị: Tham số -> Căn -> Phân số (nghiêm ngặt) -> Thập phân
      const fmtVecForMathLive = (v, item) => {
        if (item && item.isParametric && item.rawExprs && item.rawExprs.length) {
          const parts = item.rawExprs.map((e) => (App.exprToLatex ? App.exprToLatex(e) : e));
          return `\\left(${parts.join(", ")}\\right)`;
        }

        // Helper: Rút gọn căn
        const simplifySqrtStr = (n) => {
          let coef = 1;
          for (let i = Math.floor(Math.sqrt(n)); i > 1; i--) {
            if (n % (i * i) === 0) {
              coef = i;
              n /= i * i;
              break;
            }
          }
          let r = n === 1 ? "" : `\\sqrt{${n}}`;
          return coef === 1 ? r || "1" : `${coef}${r}`;
        };

        // Helper: Tìm phân số (SIẾT CHẶT)
        const getFrac = (val, maxD = 100) => {
          let h1 = 1,
            h2 = 0,
            k1 = 0,
            k2 = 1,
            b = val;
          do {
            let a = Math.floor(b);
            let aux = h1;
            h1 = a * h1 + h2;
            h2 = aux;
            aux = k1;
            k1 = a * k1 + k2;
            k2 = aux;
            b = 1 / (b - a);
          } while (Math.abs(val - h1 / k1) > 1e-9 && k1 < maxD); // Lặp đến khi sai số cực nhỏ

          // [QUAN TRỌNG] Chỉ trả về nếu sai số < 1e-9
          if (Math.abs(val - h1 / k1) < 1e-9) return { n: h1, d: k1 };
          return null;
        };

        const nums = v.map((x) => {
          // Nếu backend gửi chuỗi LaTeX (căn, phân số) -> giữ nguyên
          if (typeof x === "string" && (x.includes("\\") || x.includes("sqrt")))
            return x;

          let val = 0;
          if (typeof x === "object" && x !== null) {
            const n = Number(x.n);
            const d = Number(x.d);
            const s = x.s || 1;
            if (d !== 0 && !isNaN(n)) val = s * (n / d);
          } else {
            val = Number(x);
          }

          if (isNaN(val)) return typeof x === "string" ? x : "0";
          if (Math.abs(val) < 1e-9) return "0";

          let sign = val < 0 ? "-" : "";
          let abs = Math.abs(val);

          // 1. Số nguyên
          if (Number.isInteger(abs)) return String(val);

          // 2. Căn thức (Ưu tiên)
          let sq = abs * abs;
          if (Math.abs(sq - Math.round(sq)) < 1e-5 && Math.round(sq) < 1000) {
            return sign + simplifySqrtStr(Math.round(sq));
          }

          // 3. Phân số (NGHIÊM NGẶT)
          // ln(5) sẽ fail ở bước này vì sai số > 1e-9
          let frac = getFrac(abs, 100);
          if (frac) {
            if (frac.d === 1) return sign + frac.n;
            return `${sign}\\frac{${frac.n}}{${frac.d}}`;
          }

          // 4. Số thập phân (cho Loga, Pi...)
          return parseFloat(val.toFixed(4)).toString();
        });

        return `\\left(${nums.join(", ")}\\right)`;
      };
      const getVecIndex = (it, fallbackNum) => {
        if (!it) return String(fallbackNum);
        if (typeof App.displayIndexOf === "function") {
          const d = App.displayIndexOf(it);
          if (d) return String(d);
        }
        const idx = App.vectorList ? App.vectorList.indexOf(it) : -1;
        return idx >= 0 ? String(idx + 1) : String(fallbackNum);
      };

      // Tạo danh sách các thẻ <math-field> cho từng vector cơ sở từ hệ thực tế của người dùng
      const basisMathFields = basisItems.length
        ? basisItems
            .map(
              (it, idx) => `
            <div style="margin-bottom: 6px;">
              <math-field read-only style="
                  width: 100%;
                  box-sizing: border-box;
                  background: var(--bg-paper, var(--card, #fff));
                  border: 1px solid var(--border-subtle, var(--border, #ccc));
                  border-radius: 4px;
                  padding: 6px 12px;
                  font-size: 1.2em;
                  color: var(--text-main, #333);
                  pointer-events: none;
              ">
                  v_{${getVecIndex(it, idx + 1)}} = ${fmtVecForMathLive(it.vec, it)}
              </math-field>
            </div>
          `,
            )
            .join("")
        : `<div style="font-style:italic; color:var(--text-muted, #888); padding: 5px;">(Không có vector cơ sở)</div>`;

      // Khối danh sách vector phụ thuộc (nếu có)
      let dependentHTML = "";
      if (dependentItems.length > 0) {
        const depList = dependentItems
          .map(
            (it, idx) => `
          <div style="margin-bottom: 6px;">
            <math-field read-only style="
                width: 100%;
                box-sizing: border-box;
                background: var(--bg-hover, rgba(0,0,0,0.02));
                border: 1px dashed var(--border-subtle, var(--border, #ccc));
                border-radius: 4px;
                padding: 6px 12px;
                font-size: 1.15em;
                color: var(--text-muted, #64748b);
                pointer-events: none;
            ">
                v_{${getVecIndex(it, idx + 1)}} = ${fmtVecForMathLive(it.vec, it)}
            </math-field>
          </div>
        `,
          )
          .join("");

        dependentHTML = `
          <div style="margin-top: 6px; padding-top: 8px; border-top: 1px dashed var(--border-subtle, var(--border, #ccc));">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted, #64748b); text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.03em;">
              Vector phụ thuộc tuyến tính (loại khỏi cơ sở):
            </div>
            ${depList}
          </div>
        `;
      }

      // HTML Khung kết quả (Hoàn toàn dùng DIV, không dùng LI/UL)
      const resultHTML = `
        <div style="display:flex; flex-direction:column; gap:8px; padding: 4px 0 12px 0;">
            <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:var(--bg-hover, rgba(0,0,0,0.02)); border:1px solid var(--border-subtle, var(--border, #e2e8f0)); border-radius:4px;">
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-muted, #64748b);">Số chiều:</span>
                    <span style="font-weight:700; font-size:13px; color:var(--primary-base, #10b981);">dim(V) = ${dim ?? "?"}</span>
                </div>
                <span style="font-size:11.5px; font-weight:600; color:var(--text-muted, #64748b);">Hệ cơ sở B (${basisItems.length} vector)</span>
            </div>
            
            <div style="display:flex; flex-direction:column; width:100%;">
                ${basisMathFields}
            </div>

            ${dependentHTML}
            
            <div style="font-size:11.5px; color:var(--text-muted, #888); font-style:italic; padding-top:4px; text-align: left; width: 100%;">
                👉 Bấm <b>"Trực quan"</b> để xem hoạt cảnh không gian hoặc <b>"Lời giải"</b> để xem chi tiết biến đổi ma trận bậc thang (khử Gauss) và giải hệ phương trình.
            </div>
        </div>
      `;

      let dependentIds = dependentItems.map((it) => it.id);

      // [FIX] Gán HTML đẹp vào ô kết quả
      if (out) {
        out.innerHTML = resultHTML;
      }

      cachedConfig = {
        title: "Cơ sở & số chiều",
        math: `\\( \\mathbb{R}^${selectedItems[0].vec.length} \\)`,
        tab1Label: "Cách 1: Ma trận",
        tab2Label: "Cách 2: Hệ phương trình",
        showSubTabs: true,

        // --- CÁCH 1 (Đã độ động cơ Virtual List) ---
        content1: packMat?.htmlContent || "", 
        htmlHeader: packMat?.htmlHeader || "",    // [MỚI] Truyền Phần đầu
        htmlSteps: packMat?.htmlSteps || null,    // [MỚI] Truyền Mảng băm nhỏ
        htmlFooter: packMat?.htmlFooter || "",    // [MỚI] Truyền Phần đuôi

        // --- CÁCH 2 (Giữ nguyên) ---
        content2: packEqGeneral?.htmlContent || packEqGeneral?.html || "",
        content2Sub: packEqStep?.htmlContent || packEqStep?.html || "",

        autoOpen: false,
      };

      // Truyền dữ liệu HTML sang Panel
      if (typeof App.openSolutionPanel === "function") {
        App.openSolutionPanel(cachedConfig);

        const btnSol = $("btnOpenSolution");
        if (btnSol) btnSol.style.display = "inline-block";
        
        // --- TÍCH HỢP SỔ TAY GHI CHÉP ---
        if (window.App.PaperLogger) {
          const ltx = `\\text{Dim} = ${dim}`;
          const animData = { 
              type: 'basis', 
              selectedIds: checkedIds,
              dependentIds: dependentIds,
              basisVectors: basisItems.map((it) => it.vec),
              phaseMs: App.basisAnimPhaseMs
          };
          App.PaperLogger.log("Tìm Cơ sở & Số chiều", ltx, "", cachedConfig, animData);
        }
      }

      // [QUAN TRỌNG] Không tự ý chèn auto-vector (1, 0), (0, 1) lên canvas.
      // Lưu lại dữ liệu để khi người dùng bấm nút "Trực quan" sẽ khởi chạy hoạt cảnh
      App._lastBasisAnimData = {
        selectedIds: checkedIds,
        dependentIds: dependentIds,
        basisVectors: basisItems.map((it) => it.vec),
        phaseMs: App.basisAnimPhaseMs,
      };
    } catch (err) {
      if (out) out.innerText = "Lỗi: " + err.message;
      if (typeof App.showToast === "function") App.showToast(err.message);
    }
  };

  // =========================
  // D) TRỰC QUAN HÓA CƠ SỞ (TÁCH RIÊNG KHỎI TÍNH TOÁN)
  // =========================
  App.startBasisAnimateUI = async function () {
    App.ensureBasisAnimControls();
    const wrap = $("basisAnimControls");

    // Nếu hộp trực quan đang mở hoặc hoạt cảnh đang chạy: bấm nút Trực quan sẽ dừng và tắt (Toggle)
    const isBoxOpen = wrap && wrap.style.display !== "none" && wrap.style.display !== "";
    if (isBoxOpen || window.App?.BasisAnimator?.isActive?.()) {
      App.stopBasisAnimation();
      return;
    }

    // Nếu chưa tính toán trước đó, gọi tính toán để trích xuất cơ sở
    if (!App._lastBasisAnimData) {
      await App.basisAndDimUI();
    }
    if (!App._lastBasisAnimData) return;

    // Dừng hoạt cảnh tọa độ nếu đang chạy
    if (typeof App.stopCoordAnimation === "function") {
      App.stopCoordAnimation();
    } else if (window.App?.CoordAnimator?.isActive?.()) {
      App.CoordAnimator.stop();
    }

    App._basisModeActive = true;
    if (typeof App.startBasisAnimation === "function") {
      App.startBasisAnimation(App._lastBasisAnimData);
    }
    if (wrap) wrap.style.display = "block";
  };

  // --- INIT ---
  document.addEventListener("DOMContentLoaded", () => {
    // 1. XỬ LÝ NÚT TÍNH CƠ SỞ
    const btnCalc = $("btnBasis") || $("btnCalcBasis");
    if (btnCalc) {
      const newBtn = btnCalc.cloneNode(true);
      if (btnCalc.parentNode) btnCalc.parentNode.replaceChild(newBtn, btnCalc);
      newBtn.addEventListener("click", App.basisAndDimUI);
    }

    // 2. XỬ LÝ NÚT TRỰC QUAN (Tách riêng khỏi Tính cơ sở)
    const btnAnimate = $("btnBasisAnimate");
    if (btnAnimate) {
      const newBtnAnimate = btnAnimate.cloneNode(true);
      if (btnAnimate.parentNode) btnAnimate.parentNode.replaceChild(newBtnAnimate, btnAnimate);
      newBtnAnimate.addEventListener("click", App.startBasisAnimateUI);
    }

    // 3. XỬ LÝ NÚT LỜI GIẢI (Logic thông minh)
    const btnShow = $("btnOpenSolution");
    if (btnShow) {
      // [SỬA] Luôn hiện nút này ngay từ đầu (để giống bên Tọa độ)
      btnShow.style.display = "inline-block";

      const newBtnShow = btnShow.cloneNode(true);
      if (btnShow.parentNode)
        btnShow.parentNode.replaceChild(newBtnShow, btnShow);

      newBtnShow.addEventListener("click", () => {
        if (typeof App.openSolutionPanel !== "function") {
          console.error("Thiếu module solution_panel.js");
          return;
        }

        // Kiểm tra xem đã có kết quả trong bộ nhớ đệm chưa
        if (cachedConfig) {
          // CÓ: Nạp lại lời giải Cơ sở vào Panel và mở lên
          // (Tránh trường hợp Panel đang chứa nội dung của bài Tọa độ)
          App.openSolutionPanel({ ...cachedConfig, autoOpen: true });
        } else {
          // CHƯA: Hiện thông báo nhắc nhở
          App.openSolutionPanel({
            title: "Cơ sở & Số chiều",
            math: "",
            tab1Label: "Cách 1",
            showSubTabs: false,
            content1: `<div class="sol-empty">
                          Chưa có dữ liệu tính toán.<br>
                          Vui lòng chọn vector và bấm nút <b>"Tính cơ sở"</b> trước.
                      </div>`,
            autoOpen: true,
          });
        }
      });
    }
  });
})();
