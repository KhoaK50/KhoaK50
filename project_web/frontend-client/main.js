// ===================== main.js =====================
// App orchestrator: state, parser/format, vector list UI, extra-calcs UI, API calls,
// and glue code to 2D (Vec2D) & 3D (Vec3D).
// API base = localhost for local testing as requested.

(function () {
  // ---- Global namespace shared by all modules ----
  window.App = window.App || {};

  App.API_BASE = "https://vsv-i0ya.onrender.com"; // ĐỔI thành domain thật của bạn


  /* ===== Utilities / Debug ===== */
  App.log = function (s) {
    console.log(s);
    const el = document.getElementById("logOut");
    if (!el) return;
    el.innerText = (el.innerText === "—" ? "" : el.innerText + "\n") + String(s);
  };

  App.pingBackend = async function () {
    try {
      const r = await fetch(`${App.API_BASE}/api/health`, { mode: "cors" });
      const j = await r.json();
      App.log(`Backend OK (${App.API_BASE}) — health: ${JSON.stringify(j)}`);
    } catch (e) {
      App.log(`Không gọi được /api/health — ${e}`);
      alert("Không kết nối được backend local. Hãy chạy Flask ở 127.0.0.1:5000.");
    }
  };

  /* ============== GLOBAL STATE ============== */
  App.mode = "2D";
  App.autoMode = true;
  App.currentVector = [1, 2];
  App.firstDrawForVector = true;
  App.theme = "light";

  // Angle visualization state (2D/3D overlays):
  App.currentAngleVisual2D = null; // { a:[x,y], b:[x,y], deg }
  App.currentAngleVisual3D = null; // THREE.Group
  App.currentListInput = null;     // remember focused <input> in the list

  // vectorList items: { id, vec, hue, colorCss, colorHex, haloCss, haloHex, highlighted }
  App.vectorList = [];
  App.nextId = 1;
  App.usedHues = new Set();

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
    const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
    return '#' + toHex(f(0)) + toHex(f(8)) + toHex(f(4));
  }
  function computeVectorColorHex(hue) { return hslToHex(hue, 75, 52); }
  function computeHaloHex(hue, theme) { return theme === 'dark' ? hslToHex(hue, 95, 80) : hslToHex(hue, 80, 30); }
  function attachVectorItem(vec, hue) {
    return {
      id: App.nextId++,
      vec: vec.slice(),
      hue,
      colorCss: `hsl(${hue} 75% 52%)`,
      colorHex: computeVectorColorHex(hue),
      haloCss: App.theme === 'dark' ? `hsl(${hue} 95% 80%)` : `hsl(${hue} 80% 30%)`,
      haloHex: computeHaloHex(hue, App.theme),
      highlighted: false,
    };
  }
  App.refreshHaloColors = function () {
    App.vectorList.forEach((v) => {
      v.haloHex = computeHaloHex(v.hue, App.theme);
      v.haloCss = App.theme === 'dark' ? `hsl(${v.hue} 95% 80%)` : `hsl(${v.hue} 80% 30%)`;
    });
  };

  /* --------- Display helpers --------- */
  App.coordOut = function (text) {
    const el = document.getElementById("coordOut");
    if (el) el.innerText = text;
  };
  App.getCSS = function (v) {
    return getComputedStyle(document.body).getPropertyValue(v).trim() || '#fff';
  };

  function formatLabel(val) {
    if (val === 0) return "0";
    const abs = Math.abs(val);
    if (abs >= 1e6 || abs < 1e-6) return val.toExponential(0).replace("+", "");
    return Number(val.toFixed(6)).toString();
  }
  App.niceStep = function (unitsRange) {
    const rough = Math.max(unitsRange, 1e-12) / 10;
    const pow10 = Math.pow(10, Math.floor(Math.log10(rough)));
    const d = rough / pow10;
    if (d < 1.5) return 1 * pow10;
    if (d < 3) return 2 * pow10;
    if (d < 7) return 5 * pow10;
    return 10 * pow10;
  };

  /* ===== Number formatting (fraction & surd) ===== */
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; }
  function isNearly(x, y, eps = 1e-10) { return Math.abs(x - y) <= eps; }
  function isNearlyInt(x, eps = 1e-10) { return isNearly(x, Math.round(x), eps); }

  function rationalApprox(x, maxDen = 10000, eps = 1e-12) {
    if (!isFinite(x)) return null;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    if (isNearlyInt(x, eps)) return { n: sign * Math.round(x), d: 1 };
    let a0 = Math.floor(x);
    let p0 = 1, q0 = 0, p1 = a0, q1 = 1;
    let frac = x - a0;
    if (isNearly(frac, 0, eps)) return { n: sign * p1, d: q1 };
    for (let i = 0; i < 30; i++) {
      const a = Math.floor(1 / frac);
      const p2 = a * p1 + p0;
      const q2 = a * q1 + q0;
      const approx = p2 / q2;
      if (q2 > maxDen) break;
      if (Math.abs(approx - x) <= eps) return { n: sign * p2, d: q2 };
      p0 = p1; q0 = q1; p1 = p2; q1 = q2;
      frac = 1 / frac - a;
      if (frac <= eps) break;
    }
    if (Math.abs(p1 / q1 - x) <= eps) return { n: sign * p1, d: q1 };
    return null;
  }

  function largestSquareFactor(n) { let r = 1; for (let k = 2; k * k <= n; k++) { while (n % (k * k) === 0) { n /= k * k; r *= k; } } return { root: r, rest: n }; }
  function approxRadical(x, eps = 1e-9) {
    if (!isFinite(x)) return null;
    if (isNearlyInt(x, eps)) return null; // prefer integer
    const sign = x < 0 ? '-' : '';
    const ax = Math.abs(x);

    let best = null, errBest = 1e9;
    for (let p = 1; p <= 8; p++) {
      for (let n = 2; n <= 400; n++) {
        const s = Math.sqrt(n);
        for (let m = 1; m <= 60; m++) {
          const val = (p * s) / m;
          const err = Math.abs(val - ax);
          if (err < errBest) {
            const { root: r, rest } = largestSquareFactor(n);
            if (rest === 1) continue;
            let num = p * r, den = m;
            const g = gcd(num, den); num /= g; den /= g;
            const coef = (num === 1 ? '' : num.toString());
            const frac = (den === 1 ? '' : `/${den}`);
            best = `${sign}${coef}√${rest}${frac}`;
            errBest = err;
          }
        }
      }
    }
    for (let n = 2; n <= 400; n++) {
      const val = 1 / Math.sqrt(n);
      const err = Math.abs(val - ax);
      if (err < errBest && err < eps) {
        const { root: r, rest } = largestSquareFactor(n);
        const den = r * rest;
        best = `${sign}√${rest}/${den}`;
        errBest = err;
      }
    }
    if (errBest < eps) return best;
    return null;
  }

  App.formatScalar = function (x) {
    if (!isFinite(x)) return String(x);
    if (Math.abs(x) < 1e-12) return "0";
    if (isNearlyInt(x)) return String(Math.round(x));
    const rat = rationalApprox(x, 10000, 1e-12);
    if (rat) {
      const n = rat.n, d = rat.d;
      if (d === 1) return String(n);
      return `${n}/${d}`;
    }
    const rad = approxRadical(x, 1e-9);
    if (rad) return rad;
    return Number(x.toFixed(6)).toString();
  };
  App.formatVectorShort = (vec) => `[${vec.map(App.formatScalar).join(", ")}]`;
  App.formatTip = (vec) => `(${vec.map(App.formatScalar).join(", ")})`;

    // === Reset angle overlay (2D & 3D) ===
  App.clearAngleOverlay = function () {
    // xóa trạng thái 2D
    App.currentAngleVisual2D = null;
    const angEl = document.getElementById("result_angle");
    if (angEl) angEl.innerText = "—";

    // xóa mesh 3D nếu đang có
    if (App.currentAngleVisual3D && window.Vec3D) {
      Vec3D._scene.remove(App.currentAngleVisual3D);
      App.currentAngleVisual3D.traverse(obj => {
        obj.geometry?.dispose?.();
        if (obj.material) { obj.material.map?.dispose?.(); obj.material.dispose?.(); }
      });
      App.currentAngleVisual3D = null;
      if (App.mode === '3D') Vec3D.hardRefresh3D(false);
    }
  };

  /* ===== Parser cho input vector: hỗ trợ phân số & sqrt ===== */
  function splitTopLevelByComma(s) {
    const parts = []; let cur = ''; let depth = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; continue; }
      if (ch === '(') depth++;
      else if (ch === ')' && depth > 0) depth--;
      cur += ch;
    }
    if (cur.trim() !== '') parts.push(cur.trim());
    return parts;
  }

  function evalExprSafe(expr) {
    if (!expr || !expr.trim()) throw "Thiếu toạ độ";
    let e = expr.trim();

    e = e.replace(/√\s*\(/g, 'sqrt(');      // √(2) -> sqrt(2)
    e = e.replace(/√\s*([0-9.]+)/g, 'sqrt($1)'); // √2   -> sqrt(2)
    e = e.replace(/\bsqrt\s*\(/gi, 'Math.sqrt(');

    const safeRe = /^[0-9+\-*/.\s()a-zA-Z_]+$/;
    if (!safeRe.test(e)) throw "Biểu thức có ký tự không hợp lệ";
    if (/constructor|Function|=>|while|for|if|return|try|catch|process|window|document/i.test(e)) {
      throw "Biểu thức không hợp lệ";
    }
    let val;
    try {
      // eslint-disable-next-line no-new-func
      val = Function(`"use strict"; return (${e});`)();
    } catch {
      throw `Không tính được: ${expr}`;
    }
    if (!isFinite(val)) throw `Kết quả không hợp lệ: ${expr}`;
    return Number(val);
  }

  App.parseVectorExpr = function (raw) {
    const s = raw.trim();
    if (!s.startsWith('[') || !s.endsWith(']')) throw 'Nhập phải dạng [a,b] hoặc [a,b,c]';
    const inside = s.slice(1, -1);
    const parts = splitTopLevelByComma(inside);
    if (parts.length !== 2 && parts.length !== 3) throw 'Vector phải có 2 hoặc 3 toạ độ';
    const vec = parts.map(evalExprSafe);
    return vec;
  };

  /* ============== DOM HOOKS ============== */
  // (được gán trong App.init sau khi DOM ready)

  /* ===== THEME ===== */
  App.applyTheme = function () {
    document.body.classList.toggle('dark', App.theme === 'dark');
    const themeBadge = document.getElementById('themeBadge');
    if (themeBadge) themeBadge.textContent = `Theme: ${App.theme === 'dark' ? 'Dark' : 'Light'}`;
    App.refreshHaloColors();
    if (App.mode === '2D' && window.Vec2D) Vec2D.draw2DAllVectors();
    if (window.Vec3D && Vec3D._scene) {
      Vec3D._scene.background = new THREE.Color(App.getCSS('--bg'));
      Vec3D.update3DHelpersBase();
      Vec3D.hardRefresh3D(false);
    }
  };
  App.toggleTheme = function () { App.theme = App.theme === 'light' ? 'dark' : 'light'; App.applyTheme(); };

  /* ===== MODE ===== */
  App.toggleAuto = function () {
    const btn = document.getElementById('btnAuto');
    App.autoMode = !App.autoMode;
    if (btn) btn.textContent = App.autoMode ? 'Tự động 2D<->3D: BẬT' : 'Tự động 2D<->3D: TẮT';
  };

  App.toggleMode = function () {
    const to3D = (App.mode === '2D');
    App.mode = to3D ? '3D' : '2D';
    const modeBadge = document.getElementById('modeBadge');
    if (modeBadge) modeBadge.textContent = `Mode: ${App.mode}`;
    if (to3D) {
      App.redrawAll({ frame: true });
      if (window.Vec3D) Vec3D.hardRefresh3D(true);
    } else {
      App.redrawAll({ frame: false });
    }
  };

  App.displayIndexOf = (item) => App.vectorList.indexOf(item) + 1;

  /* ============== VECTOR LIST & UI ============== */
  App.onAddVector = function () {
    const inp = document.getElementById('vectorInput');
    if (!inp) return;
    const raw = inp.value.trim();
    let v;
    try {
      v = App.parseVectorExpr(raw);
      if (!Array.isArray(v) || (v.length !== 2 && v.length !== 3)) throw new Error();
    } catch (err) {
      alert('Nhập hợp lệ: [x,y] hoặc [x,y,z], chấp nhận 1/2, sqrt(2), 3*sqrt(5)/7.\n' + (err?.message || err));
      return;
    }

    App.currentVector = v.slice();
    App.firstDrawForVector = true;

    const hue = pickUniqueHue();
    const item = attachVectorItem(v, hue);
    App.vectorList.push(item);
    App.renderVectorList();
    App.refreshCalcVectorOptions();
    App.renderExtraCalcOptions();

    if (App.autoMode) {
      App.mode = (v.length === 3) ? '3D' : '2D';
      const modeBadge = document.getElementById('modeBadge');
      if (modeBadge) modeBadge.textContent = `Mode: ${App.mode}`;
    }

    // Không frame camera mỗi lần thêm vector; chỉ redraw nhẹ
    App.redrawAll({ frame: false });
    if (App.mode === '3D' && window.Vec3D) Vec3D.hardRefresh3D(false);

  };

  App.optionLabelFor = (it) => `#${App.displayIndexOf(it)} ${App.formatVectorShort(it.vec)}`;

  App.renderVectorList = function () {
    const el = document.getElementById('vectorList');
    if (!el) return;
    el.innerHTML = '';

    for (const item of App.vectorList) {
      const li = document.createElement('li');
      li.className = 'vec-item' + (item.highlighted ? ' active' : '');

      const sw = document.createElement('div');
      sw.className = 'sw';
      sw.style.background = item.colorCss;

      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = `#${App.displayIndexOf(item)}`;

      const lbl = document.createElement('input');
      lbl.className = 'lbl';
      lbl.value = App.formatVectorShort(item.vec);
      lbl.title = App.formatVectorShort(item.vec);

      lbl.addEventListener('focus', () => { App.currentListInput = lbl; });
      lbl.addEventListener('blur', () => { if (App.currentListInput === lbl) App.currentListInput = null; });

      lbl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          try {
            const v = App.parseVectorExpr(lbl.value);
            item.vec = v;
            App.currentVector = v.slice();
            lbl.value = App.formatVectorShort(v);
            lbl.title = App.formatVectorShort(v);
            App.clearAngleOverlay();      // xoá góc quét cũ
            App.updateCalcSelectLabels(); // cập nhật nhãn trong các <select>
            if (App.autoMode) {
              const newMode = (v.length === 3) ? '3D' : '2D';
              if (App.mode !== newMode) {
                App.mode = newMode;
                const modeBadge = document.getElementById('modeBadge');
                if (modeBadge) modeBadge.textContent = `Mode: ${App.mode}`;
                App.redrawAll({ frame: true });
              }
            }
            if (App.mode === '3D' && window.Vec3D) Vec3D.hardRefresh3D(false);
            else if (window.Vec2D) Vec2D.draw2DAllVectors();

            // tắt góc quét khi vector thay đổi
            App.currentAngleVisual2D = null;
            if (App.currentAngleVisual3D && window.Vec3D) {
              Vec3D._scene.remove(App.currentAngleVisual3D);
              App.currentAngleVisual3D = null;
            }

          } catch (err) {
            alert("Sai định dạng vector: " + err);
            lbl.value = App.formatVectorShort(item.vec);
            lbl.title = App.formatVectorShort(item.vec);
          }
        }
        if (e.key === '/' && !e.ctrlKey) {
          e.preventDefault();
          App.insertAtCursor(lbl, '/');
        }
        if (e.key === '√' || e.key.toLowerCase() === 'r') {
          e.preventDefault();
          App.insertSqrt(lbl);
        }
      });

      const haloBtn = document.createElement('button');
      haloBtn.className = 'btn';
      haloBtn.textContent = item.highlighted ? 'Halo ON' : 'Halo OFF';
      haloBtn.onclick = (e) => {
        e.stopPropagation();
        item.highlighted = !item.highlighted;
        haloBtn.textContent = item.highlighted ? 'Halo ON' : 'Halo OFF';
        li.classList.toggle('active', item.highlighted);
        if (App.mode === '3D' && window.Vec3D) Vec3D.hardRefresh3D(false);
        else if (window.Vec2D) Vec2D.draw2DAllVectors();
      };

      const del = document.createElement('button');
      del.className = 'btn';
      del.textContent = 'Xóa';
      del.onclick = (e) => {
        e.stopPropagation();
        const idx = App.vectorList.findIndex(v => v.id === item.id);
        if (idx >= 0) App.vectorList.splice(idx, 1);
        App.usedHues.delete(item.hue);
        App.clearAngleOverlay();

        App.renderVectorList();
        App.refreshCalcVectorOptions();
        App.renderExtraCalcOptions();
        if (App.mode === '3D' && window.Vec3D) Vec3D.hardRefresh3D(false);
        else if (window.Vec2D) Vec2D.draw2DAllVectors();

        // tắt góc quét khi danh sách thay đổi
        App.currentAngleVisual2D = null;
        if (App.currentAngleVisual3D && window.Vec3D) {
          Vec3D._scene.remove(App.currentAngleVisual3D);
          App.currentAngleVisual3D = null;
        }

      };

      li.appendChild(sw);
      li.appendChild(tag);
      li.appendChild(lbl);
      li.appendChild(haloBtn);
      li.appendChild(del);
      el.appendChild(li);
    }
  };

  App.getFocusedVectorInput = function () {
    return document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('lbl')
      ? document.activeElement
      : null;
  };

  App.clearAllVectors = function () {
    App.vectorList.length = 0;
    App.usedHues.clear();
    App.currentAngleVisual2D = null;
    if (App.currentAngleVisual3D && window.Vec3D) {
      Vec3D._scene.remove(App.currentAngleVisual3D);
      App.currentAngleVisual3D = null;
    }
    App.renderVectorList();
    App.refreshCalcVectorOptions();
    App.renderExtraCalcOptions();
    App.redrawAll({ frame: true });
  };

  App.refreshCalcVectorOptions = function () {
    const v1Select = document.getElementById('v1Select');
    const v2Select = document.getElementById('v2Select');
    if (!v1Select || !v2Select) return;
    v1Select.innerHTML = ''; v2Select.innerHTML = '';
    for (const it of App.vectorList) {
      const o1 = document.createElement('option'); o1.value = it.id; o1.textContent = App.optionLabelFor(it);
      const o2 = document.createElement('option'); o2.value = it.id; o2.textContent = App.optionLabelFor(it);
      v1Select.appendChild(o1); v2Select.appendChild(o2);
    }
    if (App.vectorList.length) {
      v1Select.value = App.vectorList[0].id;
      v2Select.value = (App.vectorList[1]?.id ?? App.vectorList[0].id);
    }
  };

  function makeChecklist(container, name) {
    container.innerHTML = '';
    App.vectorList.forEach((it) => {
      const id = `chk_${name}_${it.id}`;
      const row = document.createElement('div');
      row.className = 'checkitem';

      const left = document.createElement('div');
      left.className = 'checkitem-left';

      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = `#${App.displayIndexOf(it)}`;

      const txt = document.createElement('span');
      txt.className = 'vec-text';
      txt.textContent = App.formatVectorShort(it.vec);

      left.appendChild(badge);
      left.appendChild(txt);

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = id;
      cb.value = it.id;

      row.appendChild(left);
      row.appendChild(cb);

      container.appendChild(row);
    });
  }

  function addOptionsToSelect(selectEl) {
    selectEl.innerHTML = '';
    for (const it of App.vectorList) {
      const o = document.createElement('option');
      o.value = it.id;
      o.textContent = App.optionLabelFor(it);
      selectEl.appendChild(o);
    }
  }

  App.renderExtraCalcOptions = function () {
    const v1AngleSelect = document.getElementById('v1AngleSelect');
    const v2AngleSelect = document.getElementById('v2AngleSelect');
    const vNormSelect = document.getElementById('vNormSelect');
    const vCoordSelect = document.getElementById('vCoordSelect');
    const basisCoordChecklist = document.getElementById('basisCoordChecklist');
    const basisChecklist = document.getElementById('basisChecklist');
    const indepChecklist = document.getElementById('indepChecklist');
    const rankChecklist = document.getElementById('rankChecklist');
    const v1DotSelect = document.getElementById('v1DotSelect');
    const v2DotSelect = document.getElementById('v2DotSelect');

    if (!v1AngleSelect) return;

    addOptionsToSelect(v1AngleSelect);
    addOptionsToSelect(v2AngleSelect);
    addOptionsToSelect(vNormSelect);
    addOptionsToSelect(vCoordSelect);
    addOptionsToSelect(v1DotSelect);
    addOptionsToSelect(v2DotSelect);

    if (App.vectorList.length) {
      v1AngleSelect.value = App.vectorList[0].id;
      v2AngleSelect.value = (App.vectorList[1]?.id ?? App.vectorList[0].id);
      vNormSelect.value = App.vectorList[0].id;
      vCoordSelect.value = App.vectorList[0].id;
      v1DotSelect.value = App.vectorList[0].id;
      v2DotSelect.value = (App.vectorList[1]?.id ?? App.vectorList[0].id);

    }
    makeChecklist(basisCoordChecklist, 'coord');
    makeChecklist(basisChecklist, 'basis');
    makeChecklist(indepChecklist, 'indep');
    makeChecklist(rankChecklist, 'rank');
  };

    // === Cập nhật label các option theo list hiện tại (giữ nguyên lựa chọn) ===
  App.updateCalcSelectLabels = function () {
    const update = (id) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const keep = sel.value;
      Array.from(sel.options).forEach(opt => {
        const it = App.vectorList.find(v => v.id === Number(opt.value));
        if (it) opt.textContent = App.optionLabelFor(it);
        else opt.remove(); // option mồ côi
      });
      if (keep) sel.value = keep;
    };
    update('v1Select'); update('v2Select');
    update('v1AngleSelect'); update('v2AngleSelect');
    update('vNormSelect'); update('vCoordSelect');
  };


  /* ====== BACKEND CALLER ====== */
  App.callAPI = async function (op, payload) {
    const url = `${App.API_BASE}/api/${op}`;
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store'
      });
    } catch (netErr) {
      throw new Error(`Network error calling ${op}: ${netErr.message}`);
    }
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`API ${op} failed: HTTP ${res.status} ${t}`);
    }
    return await res.json();
  };

  // --- Dot product (tích vô hướng) ---
App.dotProductUI = async function () {
  if (App.vectorList.length < 2) { 
    alert('Cần ít nhất 2 vector.'); 
    return; 
  }
  const v1 = App.selectIdToVector(document.getElementById('v1DotSelect'));
  const v2 = App.selectIdToVector(document.getElementById('v2DotSelect'));
  if (!v1 || !v2) { 
    alert('Chọn v1 và v2.'); 
    return; 
  }
  try {
    const data = await App.callAPI("dot_product", { v1, v2 });
    const val = (typeof data?.result === 'number') ? data.result : NaN;
    document.getElementById("result_dot").innerText = isFinite(val) 
      ? App.formatScalar(val) 
      : 'Không đọc được tích vô hướng.';
  } catch (err) {
    document.getElementById("result_dot").innerText = "Lỗi: " + err.message;
  }
};

// --- Projection (chiếu trực giao) ---
App.projectionUI = async function () {
  const v = App.selectIdToVector(document.getElementById('vProjSelect'));
  const u = App.selectIdToVector(document.getElementById('v2ProjSelect')); // bạn cần 1 select cho u
  if (!v || !u) { alert("Chọn đủ vector v và u."); return; }
  try {
    const data = await App.callAPI("projection", { v, u });
    const proj = Array.isArray(data?.result) ? data.result : null;
    document.getElementById("result_proj").innerText = proj
      ? App.formatVectorShort(proj)
      : "Không đọc được kết quả chiếu.";
  } catch (err) {
    document.getElementById("result_proj").innerText = "Lỗi: " + err.message;
  }
};



  /* ================== RUN CALC (tạo vector) ================== */
  function vectorById(id) { return App.vectorList.find(v => v.id === id)?.vec ?? null; }

  App.runCalc = async function (addToList) {
    if (!App.vectorList.length) { alert('Chưa có vector nào.'); return; }
    const opSelect = document.getElementById('opSelect');
    const v1Select = document.getElementById('v1Select');
    const v2Select = document.getElementById('v2Select');
    const scalarInp = document.getElementById('scalarInp');
    const calcSteps = document.getElementById('calcSteps');

    const op = opSelect.value;
    const id1 = Number(v1Select.value), id2 = Number(v2Select.value);
    const v1 = vectorById(id1);
    const v2 = vectorById(id2);

    let payload = null, explain = '';
    try {
      if (op === 'add') {
        if (!v1 || !v2) throw 'Chọn đủ v1, v2';
        if (v1.length !== v2.length) throw 'Hai vector phải cùng chiều.';
        payload = { v1, v2 }; explain = `${App.formatVectorShort(v1)} + ${App.formatVectorShort(v2)} = `;
      } else if (op === 'sub') {
        if (!v1 || !v2) throw 'Chọn đủ v1, v2';
        if (v1.length !== v2.length) throw 'Hai vector phải cùng chiều.';
        payload = { v1, v2 }; explain = `${App.formatVectorShort(v1)} − ${App.formatVectorShort(v2)} = `;
      } else if (op === 'scale') {
        if (!v1) throw 'Chọn v1';
        const k = Number(scalarInp.value); if (!isFinite(k)) throw 'k không hợp lệ';
        payload = { v: v1, scalar: k }; explain = `${App.formatScalar(k)} · ${App.formatVectorShort(v1)} = `;
      } else if (op === 'cross') {
        if (!v1 || !v2) throw 'Chọn đủ v1, v2';
        payload = { v1, v2 }; explain = `${App.formatVectorShort(v1)} × ${App.formatVectorShort(v2)} = `;
      } else if (op === 'normalize') {
        if (!v1) throw 'Chọn v1';
        payload = { v: v1 }; explain = `normalize(${App.formatVectorShort(v1)}) = `;
      }
    } catch (err) { alert(String(err)); return; }

    const mapOpToApi = {
      add: 'add_vectors',
      sub: 'sub_vectors',
      scale: 'scale_vector',
      cross: 'cross_product',
      normalize: 'normalize'
    };

    let data = null;
    try {
      data = await App.callAPI(mapOpToApi[op], payload);
    } catch (e) {
      console.error(e);
      alert('Gọi API thất bại. Kiểm tra backend hoặc CORS.\n' + e.message);
      return;
    }

    const vec = Array.isArray(data?.result) ? data.result : (Array.isArray(data) ? data : null);
    if (!vec) { alert('Kết quả không hợp lệ.'); return; }

    const pretty = App.formatVectorShort(vec);
    calcSteps.innerHTML = `<div><b>Kết quả:</b> <code>${pretty}</code></div><div class="help" style="margin-top:4px">${explain}${pretty}</div>`;

    if (addToList) {
      const hue = pickUniqueHue();
      const item = attachVectorItem(vec, hue);
      item.highlighted = true;
      App.vectorList.push(item);
      App.renderVectorList(); App.refreshCalcVectorOptions(); App.renderExtraCalcOptions();
      if (App.mode === '3D' && window.Vec3D) Vec3D.hardRefresh3D(false);
      else if (window.Vec2D) Vec2D.draw2DAllVectors();

      // tắt góc quét khi sinh vector mới
      App.currentAngleVisual2D = null;
      if (App.currentAngleVisual3D && window.Vec3D) {
        Vec3D._scene.remove(App.currentAngleVisual3D);
        App.currentAngleVisual3D = null;
      }

    } else {
      App.previewVector(vec);
    }
  };

  App._previewTemp = null;
  App.previewVector = function (vec) {
    App.currentVector = vec.slice();
    if (App.mode === '2D' && window.Vec2D) {
      App.firstDrawForVector = false;
      Vec2D.draw2DAllVectors();
    } else if (window.Vec3D) {
      if (App._previewTemp) { Vec3D._scene.remove(App._previewTemp); App._previewTemp = null; }
      const v3 = vec.length === 3 ? vec : [vec[0], vec[1], 0];
      const grp = Vec3D.buildVectorGroup3D(v3, '#bdbdbd', '#d0d0d0', false);
      const proj = Vec3D.buildProjectionGroupZUp(v3, '#555');
      const tip = Vec3D.buildTipLabel(v3, App.getCSS('--label-fg'), App.getCSS('--label-bg'));
      const g = new THREE.Group(); g.add(grp); g.add(proj); g.add(tip);
      Vec3D._scene.add(g); App._previewTemp = g;
      Vec3D.hardRefresh3D(false);
    }
    App.coordOut(App.formatTip(vec));
  };

  /* ============== REDRAW ROUTER ============== */
  App.redrawAll = function (opts = { frame: true }) {
    if (App.mode === '2D') { if (window.Vec2D) { Vec2D.show2D(); Vec2D.draw2DAllVectors(); } }
    else { if (window.Vec3D) { Vec3D.show3D(); Vec3D.draw3DAllVectors({ frame: opts.frame }); } }
  };

  /* ===== Helpers for selections ===== */
  App.getCheckedVectors = function (container) {
    const arr = [];
    container.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
      const id = Number(cb.value);
      const it = App.vectorList.find(v => v.id === id);
      if (it) arr.push(it.vec.slice());
    });
    return arr;
  };
  App.selectIdToVector = function (selectEl) {
    const id = Number(selectEl.value);
    return App.vectorList.find(v => v.id === id)?.vec ?? null;
  };

  /* ===== Toggle extra form ===== */
  App.showExtraForm = function (op) {
    const extraForms = document.getElementById('extraForms');
    if (!extraForms) return;
    const forms = extraForms.querySelectorAll('.extra-form');
    forms.forEach(f => f.classList.remove('active'));
    const active = document.getElementById(`form-${op}`);
    if (active) active.classList.add('active');
  };

  /* ===== UI handlers (không sinh vector) ===== */
  App.angleBetweenUI = async function () {
    if (App.vectorList.length < 2) { alert('Cần ít nhất 2 vector.'); return; }
    const v1 = App.selectIdToVector(document.getElementById('v1AngleSelect'));
    const v2 = App.selectIdToVector(document.getElementById('v2AngleSelect'));
    if (!v1 || !v2) { alert('Chọn v1 và v2.'); return; }
    try {
      const data = await App.callAPI("angle_between", { v1, v2 });
      const rad = (typeof data?.result === 'number') ? data.result : NaN;
      if (!isFinite(rad)) { document.getElementById("result_angle").innerText = 'Không đọc được góc.'; return; }
      const deg = rad * 180 / Math.PI;
      document.getElementById("result_angle").innerText = `${App.formatScalar(deg)}°`;
      if (App.mode === '2D' && window.Vec2D) {
        Vec2D.drawAngleArc2D(v1, v2, deg);
      } else if (window.Vec3D) {
        Vec3D.drawAngleArc3D(v1, v2, rad, deg);
      }
    } catch (err) {
      document.getElementById("result_angle").innerText = "Lỗi: " + err.message;
    }
  };

  App.vectorNormUI = async function () {
    if (!App.vectorList.length) { alert('Chưa có vector nào.'); return; }
    const v = App.selectIdToVector(document.getElementById('vNormSelect'));
    if (!v) { alert('Chọn vector.'); return; }
    try {
      const data = await App.callAPI("vector_norm", { v });
      const val = (typeof data?.result === 'number') ? data.result : NaN;
      document.getElementById("result_norm").innerText = isFinite(val) ? App.formatScalar(val) : 'Không đọc được norm.';
    } catch (err) {
      document.getElementById("result_norm").innerText = "Lỗi: " + err.message;
    }
  };

  App.coordinatesUI = async function () {
    if (App.vectorList.length < 1) { alert('Chưa có vector nào.'); return; }
    const v = App.selectIdToVector(document.getElementById('vCoordSelect'));
    const basis = App.getCheckedVectors(document.getElementById('basisCoordChecklist'));
    if (!v) { alert('Chọn vector cần đổi tọa độ.'); return; }
    if (!basis.length) { alert('Tick ít nhất 1 vector làm cơ sở.'); return; }
    try {
      const res = await fetch(`${App.API_BASE}/api/coordinates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vector: v, basis })
      });
      if (!res.ok) { throw new Error(`HTTP ${res.status}`); }
      const data = await res.json();
      const coords = Array.isArray(data?.coordinates) ? data.coordinates : null;
      if (!coords) { document.getElementById("result_coord").innerText = 'Không đọc được toạ độ.'; return; }
      const terms = coords.map((c, i) => `${App.formatScalar(c)}·${App.formatVectorShort(basis[i])}`);
      const out = `${App.formatVectorShort(v)} = ` + terms.join(" + ");
      document.getElementById("result_coord").innerText = out;
    } catch (err) {
      document.getElementById("result_coord").innerText = "Lỗi: " + err.message;
    }
  };

  App.basisAndDimUI = async function () {
    const vecs = App.getCheckedVectors(document.getElementById('basisChecklist'));
    if (!vecs.length) { alert('Tick ít nhất 1 vector để xét cơ sở.'); return; }
    try {
      const res = await fetch(`${App.API_BASE}/api/basis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vectors: vecs })
      });
      if (!res.ok) { throw new Error(`HTTP ${res.status}`); }
      const data = await res.json();
      const basis = data?.basis;
      const dim = data?.dimension;
      if (!Array.isArray(basis)) { document.getElementById("result_basis").innerText = 'Không đọc được cơ sở.'; return; }
      const basisStr = basis.map(v => App.formatVectorShort(v)).join("\n");
      const out = `Cơ sở:\n${basisStr}\nSố chiều: ${App.formatScalar(dim)}`;
      document.getElementById("result_basis").innerText = out;
    } catch (err) {
      document.getElementById("result_basis").innerText = "Lỗi: " + err.message;
    }
  };

  App.checkIndependenceUI = async function () {
    const vecs = App.getCheckedVectors(document.getElementById('indepChecklist'));
    if (!vecs.length) { alert('Tick ít nhất 1 vector để kiểm tra.'); return; }
    try {
      const data = await App.callAPI("linear_independence", { vectors: vecs });
      const msg = (typeof data?.result === 'string') ? data.result : 'Không xác định được.';
      document.getElementById("result_indep").innerText = msg;
    } catch (err) {
      document.getElementById("result_indep").innerText = "Lỗi: " + err.message;
    }
  };

  App.rankVecUI = async function () {
    const vecs = App.getCheckedVectors(document.getElementById('rankChecklist'));
    if (!vecs.length) { alert('Tick ít nhất 1 vector để tính rank.'); return; }
    try {
      const res = await fetch(`${App.API_BASE}/api/rank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vectors: vecs })
      });
      if (!res.ok) { throw new Error(`HTTP ${res.status}`); }
      const data = await res.json();
      const rank = (typeof data?.rank === 'number') ? data.rank : null;
      document.getElementById("result_rank").innerText = (rank !== null) ? App.formatScalar(rank) : 'Không đọc được rank.';
    } catch (err) {
      document.getElementById("result_rank").innerText = "Lỗi: " + err.message;
    }
  };

  /* ====== Calculator UI small ====== */
  App.refreshCalcUI = function () {
    const op = document.getElementById('opSelect').value;
    const v2Box = document.getElementById('v2Box');
    const scalarBox = document.getElementById('scalarBox');
    const needV2 = (op === 'add' || op === 'sub' || op === 'cross' || op === 'projection');

    v2Box.style.display = needV2 ? '' : 'none';
    scalarBox.style.display = (op === 'scale') ? '' : 'none';
    document.getElementById('calcSteps').innerHTML = ' ';
  };

  /* ====== Mini keypad helpers ====== */
  App.insertAtCursor = function (inp, text) {
    const start = inp.selectionStart ?? inp.value.length;
    const end = inp.selectionEnd ?? inp.value.length;
    const before = inp.value.substring(0, start);
    const after = inp.value.substring(end);
    inp.value = before + text + after;
    const pos = start + text.length;
    inp.selectionStart = inp.selectionEnd = pos;
    inp.focus();
  };
  App.insertSqrt = function (inp) {
    const start = inp.selectionStart ?? inp.value.length;
    App.insertAtCursor(inp, "sqrt()");
    inp.selectionStart = inp.selectionEnd = start + "sqrt(".length;
    inp.focus();
  };

  /* ====== App.init: wire DOM + start ====== */
  App.init = function () {
    App.log(`Frontend origin: ${location.origin}`);
    App.pingBackend();

    // Keypad top
    const vectorInput = document.getElementById('vectorInput');
    document.getElementById('btnInsertSlash').addEventListener('click', () => App.insertAtCursor(vectorInput, '/'));
    document.getElementById('btnInsertSqrt').addEventListener('click', () => App.insertSqrt(vectorInput));
    vectorInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); App.onAddVector(); } });

    document.getElementById('btnDraw').addEventListener('click', App.onAddVector);
    document.getElementById('btnAuto').addEventListener('click', App.toggleAuto);
    document.getElementById('btnClearAll').addEventListener('click', App.clearAllVectors);
    document.getElementById('themeBadge').addEventListener('click', App.toggleTheme);
    document.getElementById('modeBadge').addEventListener('click', App.toggleMode);

    document.getElementById('opSelect').addEventListener('change', App.refreshCalcUI);
    document.getElementById('btnCompute').addEventListener('click', () => App.runCalc(true));
    document.getElementById('btnPreview').addEventListener('click', () => App.runCalc(false));

    document.getElementById('opExtraSelect').addEventListener('change', () => App.showExtraForm(document.getElementById('opExtraSelect').value));
    document.getElementById('btnAngle').addEventListener('click', App.angleBetweenUI);
    document.getElementById('btnNorm').addEventListener('click', App.vectorNormUI);
    document.getElementById('btnCoord').addEventListener('click', App.coordinatesUI);
    document.getElementById('btnBasis').addEventListener('click', App.basisAndDimUI);
    document.getElementById('btnIndep').addEventListener('click', App.checkIndependenceUI);
    document.getElementById('btnRank').addEventListener('click', App.rankVecUI);
    document.getElementById('btnDot').addEventListener('click', App.dotProductUI);
    document.getElementById('btnProj').addEventListener('click', App.projectionUI);


    // mini keypad for list inputs
    const btnListSlash = document.getElementById('btnListSlash');
    const btnListSqrt = document.getElementById('btnListSqrt');
    btnListSlash.addEventListener('mousedown', (e) => { e.preventDefault(); });
    btnListSqrt.addEventListener('mousedown', (e) => { e.preventDefault(); });
    btnListSlash.addEventListener('click', () => {
      const inp = App.currentListInput || App.getFocusedVectorInput();
      if (inp) { App.insertAtCursor(inp, '/'); inp.focus(); }
    });
    btnListSqrt.addEventListener('click', () => {
      const inp = App.currentListInput || App.getFocusedVectorInput();
      if (inp) { App.insertSqrt(inp); inp.focus(); }
    });

    // Init 2D/3D layers
if (window.Vec2D) Vec2D.init2D();
if (window.Vec3D) Vec3D.init3D();

// prevent wheel scroll in viewer wrap (so it zooms canvas/three only)
const viewerWrap = document.getElementById('viewerWrap');
viewerWrap.addEventListener('wheel', (e) => { e.preventDefault(); }, { passive: false });

// First show 2D by default
App.applyTheme();

// đảm bảo canvas 2D có nội dung ngay từ đầu
if (window.Vec2D) {
  Vec2D.show2D();
  Vec2D.draw2DAllVectors();
}

// KHÔNG show3D ở đây, chỉ update helpers thôi
if (window.Vec3D) {
  Vec3D.update3DHelpersBase();
  // chưa gọi show3D, để mặc định 2D hiển thị
}

// đồng bộ lại
App.redrawAll({ frame: true });


App.log('Ready Z-up.');


    // selectors + checklists
    App.refreshCalcVectorOptions();
    App.renderExtraCalcOptions();

    // default visible form
    App.showExtraForm(document.getElementById('opExtraSelect').value);
    // Hamburger toggle cho mobile
const burger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');
if (burger && sidebar) {
  burger.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('open');
  });
}

const viewerWrap2 = document.getElementById('viewerWrap');
if (viewerWrap2 && sidebar) {
  viewerWrap2.addEventListener('pointerdown', () => {
    sidebar.classList.remove('open');
  });
}


window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') sidebar.classList.remove('open');
});

window.addEventListener('resize', () => {
  if (window.innerWidth >= 900) sidebar.classList.remove('open');
});


  };

  // Wait DOM, then init (Vec2D/Vec3D are loaded before main.js per recommended order)
  window.addEventListener('DOMContentLoaded', () => {
    App.init();
    App.log('three typeof: ' + (typeof THREE));
    App.log('OrbitControls ' + (typeof THREE?.OrbitControls));
    
  });

})();
