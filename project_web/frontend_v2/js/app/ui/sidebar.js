(function () {
  window.App = window.App || {};

  /* --------- Color helpers --------- */
  function nearAxisHue(h) {
    const anchors = [0, 120, 240];
    return anchors.some((a) => Math.abs((((h - a + 540) % 360) - 180)) < 14);
  }

  function pickUniqueHue() {
    const golden = 137.508;
    let h = (App.vectorList.length * golden) % 360;
    while ([...(App.usedHues)].some((uh) => Math.abs(uh - h) < 8) || nearAxisHue(h)) {
      h = (h + 23) % 360;
    }
    App.usedHues.add(h);
    return h;
  }

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, "0");
    return "#" + toHex(f(0)) + toHex(f(8)) + toHex(f(4));
  }

  function computeVectorColorHex(hue) { return hslToHex(hue, 75, 52); }
  function computeHaloHex(hue, theme) { return theme === "dark" ? hslToHex(hue, 95, 80) : hslToHex(hue, 80, 30); }

  function attachVectorItem(vec, hue) {
    return {
      id: App.nextId++,
      vec: vec.slice(),
      hue,
      colorCss: `hsl(${hue} 75% 52%)`,
      colorHex: computeVectorColorHex(hue),
      haloCss: App.theme === "dark" ? `hsl(${hue} 95% 80%)` : `hsl(${hue} 80% 30%)`,
      haloHex: computeHaloHex(hue, App.theme),
      focus: false,
      visible: true,
      highlighted: false,
    };
  }

  App._pickUniqueHue = pickUniqueHue;
  App._attachVectorItem = attachVectorItem;

  App.refreshHaloColors = function () {
    App.vectorList.forEach((v) => {
      v.haloHex = computeHaloHex(v.hue, App.theme);
      v.haloCss = App.theme === "dark" ? `hsl(${v.hue} 95% 80%)` : `hsl(${v.hue} 80% 30%)`;
    });
  };

  App.displayIndexOf = (item) => App.vectorList.indexOf(item) + 1;
  App.optionLabelFor = (it) => `#${App.displayIndexOf(it)} ${App.formatVectorShort(it.vec)}`;

  /* ====== Mini keypad helpers ====== */
  // Vẫn giữ để hỗ trợ phím tắt bàn phím vật lý
  App.insertAtCursor = function (inp, text) {
    const start = inp.selectionStart ?? inp.value.length;
    const end = inp.selectionEnd ?? inp.value.length;
    const before = inp.value.substring(0, start);
    const after = inp.value.substring(end);
    inp.value = before + text + after;
    const pos = start + text.length;
    inp.selectionStart = inp.selectionEnd = pos;
    inp.focus();
    inp.dispatchEvent(new Event('input', { bubbles: true })); // Trigger update
  };

  App.insertSqrt = function (inp) {
    const start = inp.selectionStart ?? inp.value.length;
    App.insertAtCursor(inp, "sqrt()");
    inp.selectionStart = inp.selectionEnd = start + "sqrt(".length;
    inp.focus();
  };

  /* ====== Vector list render ====== */
  App.renderVectorList = function () {
    const el = document.getElementById("vectorList");
    if (!el) return;
    el.innerHTML = "";

    for (const item of App.vectorList) {
      const li = document.createElement("li");
      li.className = "vec-item hover-gradient" + (item.highlighted ? " active" : "");

      const sw = document.createElement("div");
      sw.className = "sw";
      sw.style.background = item.colorCss;

      const main = document.createElement("div");
      main.className = "vec-main";

      const header = document.createElement("div");
      header.className = "vec-header";

      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = `#${App.displayIndexOf(item)}`;

      const lbl = document.createElement("input");
      lbl.className = "lbl";
      lbl.value = App.formatVectorShort(item.vec);
      lbl.title = App.formatVectorShort(item.vec);
      
      // --- CẤU HÌNH INPUT CHO BÀN PHÍM ẢO ---
      lbl.setAttribute("autocomplete", "off");
      lbl.setAttribute("spellcheck", "false");
      // Quan trọng: Chặn bàn phím native trên mobile để dùng bàn phím custom
      if (window.innerWidth < 768) {
         lbl.setAttribute("inputmode", "none"); 
         lbl.setAttribute("readonly", "true");
      }

      // Đảm bảo click vào là mở bàn phím ngay (dự phòng cho Event Delegation)
      lbl.addEventListener("click", (e) => {
        if(window.openKeypad) window.openKeypad(e.target);
      });

      lbl.addEventListener("focus", () => { App.currentListInput = lbl; });
      lbl.addEventListener("blur", () => { if (App.currentListInput === lbl) App.currentListInput = null; });

      lbl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          try {
            const v = App.parseVectorExpr(lbl.value);
            item.vec = v;
            App.currentVector = v.slice();
            lbl.value = App.formatVectorShort(v);
            lbl.title = App.formatVectorShort(v);

            if (App.clearAngleOverlay) App.clearAngleOverlay();
            App.updateCalcSelectLabels();

            if (App.autoMode) {
              const newMode = (v.length === 3) ? "3D" : "2D";
              if (App.mode !== newMode) {
                App.mode = newMode;
                const modeBadge = document.getElementById("modeBadge");
                if (modeBadge) modeBadge.textContent = `Mode: ${App.mode}`;
                App.redrawAll({ frame: true });
              }
            }

            if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
            else if (window.Vec2D) Vec2D.draw2DAllVectors();
            
            // Đóng bàn phím sau khi Enter
            const closeBtn = document.getElementById('keypadClose');
            if(closeBtn) closeBtn.click();
            lbl.blur();

          } catch (err) {
            alert("Sai định dạng vector: " + err);
            lbl.value = App.formatVectorShort(item.vec);
            lbl.title = App.formatVectorShort(item.vec);
          }
        }
      });

      header.appendChild(tag);
      header.appendChild(lbl);
      // Đã xóa hoàn toàn phần .mini-keys (icon / và √) tại đây

      const actions = document.createElement("div");
      actions.className = "vec-actions";

      const focusBtn = document.createElement("button");
      focusBtn.className = "btn";
      focusBtn.textContent = item.focus ? "Chú ý: BẬT" : "Chú ý: TẮT";
      focusBtn.onclick = (e) => {
        e.stopPropagation();
        if (!item.focus) App.vectorList.forEach((v) => (v.focus = false));
        item.focus = !item.focus;
        App.renderVectorList();
        if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
        else if (window.Vec2D) Vec2D.draw2DAllVectors();
      };

      const toggleBtn = document.createElement("button");
      toggleBtn.className = "btn";
      toggleBtn.textContent = item.visible ? "Ẩn" : "Hiện";
      toggleBtn.onclick = (e) => {
        e.stopPropagation();
        item.visible = !item.visible;
        toggleBtn.textContent = item.visible ? "Ẩn" : "Hiện";
        if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
        else if (window.Vec2D) Vec2D.draw2DAllVectors();
      };

      const del = document.createElement("button");
      del.className = "btn";
      del.textContent = "Xóa";
      del.onclick = (e) => {
        e.stopPropagation();
        const idx = App.vectorList.findIndex((v) => v.id === item.id);
        if (idx >= 0) App.vectorList.splice(idx, 1);
        App.usedHues.delete(item.hue);
        if (App.clearAngleOverlay) App.clearAngleOverlay();
        App.renderVectorList();
        App.refreshCalcVectorOptions();
        App.renderExtraCalcOptions();
        if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
        else if (window.Vec2D) Vec2D.draw2DAllVectors();
      };

      actions.appendChild(focusBtn);
      actions.appendChild(toggleBtn);
      actions.appendChild(del);

      main.appendChild(header);
      main.appendChild(actions);

      li.appendChild(sw);
      li.appendChild(main);
      el.appendChild(li);
    }
  };

  /* ===== selects + checklist ===== */
  App.refreshCalcVectorOptions = function () {
    const v1Select = document.getElementById("v1Select");
    const v2Select = document.getElementById("v2Select");
    if (!v1Select || !v2Select) return;

    v1Select.innerHTML = "";
    v2Select.innerHTML = "";

    for (const it of App.vectorList) {
      const o1 = document.createElement("option");
      o1.value = it.id;
      o1.textContent = App.optionLabelFor(it);

      const o2 = document.createElement("option");
      o2.value = it.id;
      o2.textContent = App.optionLabelFor(it);

      v1Select.appendChild(o1);
      v2Select.appendChild(o2);
    }

    if (App.vectorList.length) {
      v1Select.value = App.vectorList[0].id;
      v2Select.value = (App.vectorList[1]?.id ?? App.vectorList[0].id);
    }
  };

  function addOptionsToSelect(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    for (const it of App.vectorList) {
      const o = document.createElement("option");
      o.value = it.id;
      o.textContent = App.optionLabelFor(it);
      selectEl.appendChild(o);
    }
  }

  function makeChecklist(container, name) {
    if (!container) return;
    container.innerHTML = "";
    App.vectorList.forEach((it) => {
      const id = `chk_${name}_${it.id}`;
      const row = document.createElement("div");
      row.className = "checkitem";

      const left = document.createElement("div");
      left.className = "checkitem-left";

      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = `#${App.displayIndexOf(it)}`;

      const txt = document.createElement("span");
      txt.className = "vec-text";
      txt.textContent = App.formatVectorShort(it.vec);

      left.appendChild(badge);
      left.appendChild(txt);

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.id = id;
      cb.value = it.id;

      row.appendChild(left);
      row.appendChild(cb);
      container.appendChild(row);
    });
  }

  App.renderExtraCalcOptions = function () {
    const v1AngleSelect = document.getElementById("v1AngleSelect");
    const v2AngleSelect = document.getElementById("v2AngleSelect");
    const vNormSelect = document.getElementById("vNormSelect");
    const vCoordSelect = document.getElementById("vCoordSelect");
    const basisCoordChecklist = document.getElementById("basisCoordChecklist");
    const basisChecklist = document.getElementById("basisChecklist");
    const indepChecklist = document.getElementById("indepChecklist");
    const rankChecklist = document.getElementById("rankChecklist");
    const v1DotSelect = document.getElementById("v1DotSelect");
    const v2DotSelect = document.getElementById("v2DotSelect");

    addOptionsToSelect(v1AngleSelect);
    addOptionsToSelect(v2AngleSelect);
    addOptionsToSelect(vNormSelect);
    addOptionsToSelect(vCoordSelect);
    addOptionsToSelect(v1DotSelect);
    addOptionsToSelect(v2DotSelect);

    if (App.vectorList.length) {
      if (v1AngleSelect) v1AngleSelect.value = App.vectorList[0].id;
      if (v2AngleSelect) v2AngleSelect.value = (App.vectorList[1]?.id ?? App.vectorList[0].id);
      if (vNormSelect) vNormSelect.value = App.vectorList[0].id;
      if (vCoordSelect) vCoordSelect.value = App.vectorList[0].id;
      if (v1DotSelect) v1DotSelect.value = App.vectorList[0].id;
      if (v2DotSelect) v2DotSelect.value = (App.vectorList[1]?.id ?? App.vectorList[0].id);
    }

    makeChecklist(basisCoordChecklist, "coord");
    makeChecklist(basisChecklist, "basis");
    makeChecklist(indepChecklist, "indep");
    makeChecklist(rankChecklist, "rank");
  };

  
  App.updateCalcSelectLabels = function () {
    const update = (id) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const keep = sel.value;

      Array.from(sel.options).forEach((opt) => {
        const it = App.vectorList.find((v) => v.id === Number(opt.value));
        if (it) opt.textContent = App.optionLabelFor(it);
        else opt.remove();
      });

      if (keep) sel.value = keep;
    };

    update("v1Select"); update("v2Select");
    update("v1AngleSelect"); update("v2AngleSelect");
    update("vNormSelect"); update("vCoordSelect");
  };

  /* ===== Toggle extra form ===== */
  App.showExtraForm = function (op) {
    const extraForms = document.getElementById("extraForms");
    if (!extraForms) return;
    const forms = extraForms.querySelectorAll(".extra-form");
    forms.forEach((f) => f.classList.remove("active"));
    const active = document.getElementById(`form-${op}`);
    if (active) active.classList.add("active");
  };
})();