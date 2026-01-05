// ===================== basis_animation.js =====================
(function () {
  window.App = window.App || {};

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function redraw() {
    if (App.mode === "2D" && window.Vec2D) Vec2D.draw2DAllVectors();
    else if (window.Vec3D) Vec3D.hardRefresh3D(false);
  }

  // --------- helpers: compare / key vector ---------
  function normComp(x) {
    if (typeof x === "number" && isFinite(x)) {
      return String(Math.round(x * 1e12) / 1e12);
    }
    return String(x ?? "").trim();
  }

  function vecKey(v) {
    if (!Array.isArray(v)) return "";
    return v.map(normComp).join("|");
  }

  function setColor(item, css) {
    if (!item) return;
    item.colorCss = css;
    item.colorHex = css;
    item.haloCss = css;
  }

  function ensureAlpha(item) {
    if (!item) return;
    if (typeof item.alpha !== "number") item.alpha = 1;
  }

  function removeAllBasisTemps() {
    if (!Array.isArray(App.vectorList)) return;
    for (let i = App.vectorList.length - 1; i >= 0; i--) {
      const it = App.vectorList[i];
      if (it && it._basisTemp) App.vectorList.splice(i, 1);
    }
    if (App._basisTempByKey && typeof App._basisTempByKey.clear === "function") {
      App._basisTempByKey.clear();
    }
    App._basisTempByKey = new Map();
  }

  function pulse(filterFn, from, to, ms) {
    ms = Math.max(60, Number(ms) || 600);
    const start = performance.now();

    return new Promise((resolve) => {
      const tick = (t) => {
        if (App._basisAnimTokenCanceled) return resolve();

        const p = Math.min(1, (t - start) / ms);
        const a = from + (to - from) * p;

        (App.vectorList || []).forEach((it) => {
          if (!it) return;
          if (filterFn(it)) {
            ensureAlpha(it);
            it.alpha = a;
          }
        });

        redraw();
        if (p < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  // public: stop (CHỈ hủy token, rollback sẽ do basis_controller.js làm)
  App.stopBasisAnimation = function () {
    App._basisAnimTokenCanceled = true;
  };

  // public: start
  App.startBasisAnimation = async function (opts) {
    // ✅ bật chế độ draw-order basis (giữ sau khi animation xong)
    App._basisAnimActive = true;

    // cancel previous run
    App._basisAnimTokenCanceled = true;
    await sleep(0);
    App._basisAnimTokenCanceled = false;

    // reset sạch temp vectors mỗi lượt chạy (để bấm lần 2 giống lần 1)
    removeAllBasisTemps();

    const phaseMs = Math.max(120, Number(opts?.phaseMs) || 900);

    const selectedIds = Array.isArray(opts?.selectedIds) ? opts.selectedIds.map(Number) : [];
    const dependentIds = Array.isArray(opts?.dependentIds) ? opts.dependentIds.map(Number) : [];

    const basisVectors = Array.isArray(opts?.basisVectors)
      ? opts.basisVectors.map((v) => (Array.isArray(v) ? v.slice() : v))
      : [];

    const selectedSet = new Set(selectedIds);
    const dependentSet = new Set(dependentIds);

    const RED = "#ef4444";
    const GREEN = "#22c55e";

    const basisKeySet = new Set(basisVectors.map(vecKey).filter(Boolean));

    // đảm bảo alpha
    (App.vectorList || []).forEach((it) => ensureAlpha(it));

    const isSelected = (it) => !!it && selectedSet.has(it.id);
    const isDependent = (it) => !!it && dependentSet.has(it.id);

    const isBasisExistingInList = (it) => {
      if (!it || !Array.isArray(it.vec)) return false;
      return basisKeySet.has(vecKey(it.vec));
    };

    const listHasVectorKey = (key) => {
      for (const it of (App.vectorList || [])) {
        if (!it || !Array.isArray(it.vec)) continue;
        if (vecKey(it.vec) === key) return true;
      }
      return false;
    };

    // ==========================================================
    // PHASE 1: tô đỏ các vector được chọn (và dependents nếu có)
    // (KHÔNG ẨN AI)
    // ==========================================================
    (App.vectorList || []).forEach((it) => {
      if (!it) return;
      if (isSelected(it) || isDependent(it)) setColor(it, RED);
      // không set _basisIsBasis ở phase này
    });

    if (typeof App.renderVectorList === "function") App.renderVectorList();
    redraw();

    await pulse((it) => isSelected(it) || isDependent(it), 1, 0.75, Math.round(phaseMs * 0.45));
    if (App._basisAnimTokenCanceled) return;
    await pulse((it) => isSelected(it) || isDependent(it), 0.75, 1, Math.round(phaseMs * 0.45));
    if (App._basisAnimTokenCanceled) return;

    // ==========================================================
    // PHASE 2:
    // - basis đã có trong list: đổi xanh + set _basisIsBasis = true
    // - basis chưa có: tạo temp vector xanh, fade-in + set _basisIsBasis = true
    // ==========================================================
    (App.vectorList || []).forEach((it) => {
      if (!it) return;
      if (isBasisExistingInList(it)) {
        setColor(it, GREEN);
        it._basisIsBasis = true; // ✅ để viewer vẽ trên cùng
      } else {
        delete it._basisIsBasis;
      }
    });

    const newlyCreatedTemps = [];

    for (const v of basisVectors) {
      const key = vecKey(v);
      if (!key) continue;

      // nếu list đã có vector này -> khỏi tạo
      if (listHasVectorKey(key)) continue;

      // tạo mới 1 lần cho lượt chạy này
      const item = (typeof App._attachVectorItem === "function")
        ? App._attachVectorItem(v, 120)
        : { id: Date.now() + Math.random(), vec: v.slice(), visible: true };

      item._basisTemp = true;
      item._basisKey = key;

      item.visible = true;
      item.alpha = 0;

      setColor(item, GREEN);

      // ✅ temp basis cũng là basis => vẽ trên cùng
      item._basisIsBasis = true;

      App.vectorList.push(item);
      App._basisTempByKey.set(key, item);
      newlyCreatedTemps.push(item);
    }

    if (typeof App.renderVectorList === "function") App.renderVectorList();
    redraw();

    if (newlyCreatedTemps.length) {
      const tempFilter = (it) => !!it && it._basisTemp && newlyCreatedTemps.includes(it);
      await pulse(tempFilter, 0, 1, phaseMs);
      if (App._basisAnimTokenCanceled) return;
    } else {
      const basisFilter = (it) => !!it && isBasisExistingInList(it);
      await pulse(basisFilter, 1, 0.82, Math.round(phaseMs * 0.35));
      if (App._basisAnimTokenCanceled) return;
      await pulse(basisFilter, 0.82, 1, Math.round(phaseMs * 0.35));
      if (App._basisAnimTokenCanceled) return;
    }

    // ✅ kết thúc animation: GIỮ TRẠNG THÁI (không restore, không tắt _basisAnimActive)
    redraw();
  };
})();
