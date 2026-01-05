(function () {
  window.App = window.App || {};

  const toVec3 = (v) => [v?.[0] || 0, v?.[1] || 0, v?.[2] || 0];

  /* ===== THEME ===== */
  App.applyTheme = function () {
    document.body.classList.toggle("dark", App.theme === "dark");
    const themeBadge = document.getElementById("themeBadge");
    if (themeBadge) themeBadge.textContent = `Theme: ${App.theme === "dark" ? "Dark" : "Light"}`;

    App.refreshHaloColors();

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

  App.toggleTheme = function () {
    App.theme = App.theme === "light" ? "dark" : "light";
    App.applyTheme();
  };

  /* ===== MODE ===== */
  App.toggleAuto = function () {
    const btn = document.getElementById("btnAuto");
    App.autoMode = !App.autoMode;
    if (btn) btn.textContent = App.autoMode ? "Tự động 2D<->3D: BẬT" : "Tự động 2D<->3D: TẮT";
  };

  App._portAngleOverlay = function (toMode) {
    if (toMode === "3D") {
      if (!window.Vec3D) return;
      if (App.currentAngleVisual3D) { Vec3D.refreshAngleTheme(); return; }

      const g2 = App.currentAngleVisual2D;
      if (g2 && Array.isArray(g2.a) && Array.isArray(g2.b)) {
        const parseDeg = (x) =>
          (typeof x === "number" && isFinite(x)) ? x : parseFloat(String(x).replace(/[^\d+\-eE.]/g, ""));
        const deg = parseDeg(g2.deg);
        if (!isFinite(deg)) return;
        const rad = deg * Math.PI / 180;
        Vec3D.drawAngleArc3D([g2.a[0], g2.a[1], 0], [g2.b[0], g2.b[1], 0], rad, deg);
      }

    } else if (toMode === "2D") {
      if (!window.Vec2D) return;
      if (App.currentAngleVisual2D) {
        Vec2D.drawAngleArc2D(App.currentAngleVisual2D.a, App.currentAngleVisual2D.b, App.currentAngleVisual2D.deg);
        return;
      }

      const g3 = App.currentAngleVisual3D;
      const src = g3?.userData?.angleMeta?.src;
      if (src?.a && src?.b) {
        const ax = src.a[0] || 0, ay = src.a[1] || 0;
        const bx = src.b[0] || 0, by = src.b[1] || 0;
        const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
        if (la > 1e-9 && lb > 1e-9) {
          let c = (ax * bx + ay * by) / (la * lb);
          c = Math.max(-1, Math.min(1, c));
          const rad = Math.acos(c);
          const deg = rad * 180 / Math.PI;
          Vec2D.drawAngleArc2D([ax, ay], [bx, by], deg);
        }
      }
    }
  };

  App.toggleMode = function () {
    const to3D = (App.mode === "2D");
    App.mode = to3D ? "3D" : "2D";
    const modeBadge = document.getElementById("modeBadge");
    if (modeBadge) modeBadge.textContent = `Mode: ${App.mode}`;

    if (to3D) {
      if (window.Vec3D) {
        if (!Vec3D._scene) Vec3D.init3D();

        Vec3D.S3D.unitsPerWorld = 1;
        Vec3D.S3D.zoomTarget = 1;
        Vec3D.S3D.offset.set(0, 0, 0);
        Vec3D.S3D.hasPivot = false;
        Vec3D._lastUForVectors = 1;

        Vec3D.show3D();
        Vec3D.hardRefresh3D(true);

        App._portAngleOverlay("3D");
      }
    } else {
      if (window.Vec2D) {
        Vec2D.show2D();
        Vec2D.draw2DAllVectors();
        App._portAngleOverlay("2D");
      }
    }
  };

  /* ===== Angle overlay reset ===== */
  App.clearAngleOverlay = function () {
    App.currentAngleVisual2D = null;
    const angEl = document.getElementById("result_angle");
    if (angEl) angEl.innerText = "—";

    if (window.Vec3D) {
      Vec3D.clearAngle();
      if (App.mode === "3D") Vec3D.hardRefresh3D(false);
    }
  };

  /* ===== Helpers for selections ===== */
  App.getCheckedVectors = function (container) {
    const arr = [];
    container.querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => {
      const id = Number(cb.value);
      const it = App.vectorList.find((v) => v.id === id);
      if (it) arr.push(it.vec.slice());
    });
    return arr;
  };

  App.selectIdToVector = function (selectEl) {
    const id = Number(selectEl.value);
    return App.vectorList.find((v) => v.id === id)?.vec ?? null;
  };

  /* ============== REDRAW ROUTER ============== */
  App.redrawAll = function (opts = { frame: true }) {
    if (App.mode === "2D") {
      if (window.Vec2D) { Vec2D.show2D(); Vec2D.draw2DAllVectors(); }
    } else {
      if (window.Vec3D) { Vec3D.show3D(); Vec3D.draw3DAllVectors({ frame: opts.frame }); }
    }
  };

  /* ============== VECTOR ACTIONS ============== */
  App.onAddVector = function () {
    const inp = document.getElementById("vectorInput");
    if (!inp) return;

    const raw = inp.value.trim();
    let v;

    try {
      v = App.parseVectorExpr(raw);

      // ✅ n-chiều (n >= 2)
      if (!Array.isArray(v) || v.length < 2) throw new Error("Vector phải có ít nhất 2 toạ độ");
    } catch (err) {
      alert(
        "Nhập hợp lệ: [x1,x2,...,xn] (n≥2), chấp nhận 1/2, sqrt(2), 3*sqrt(5)/7.\n" +
        (err?.message || err)
      );
      return;
    }

    App.currentVector = v.slice();
    App.firstDrawForVector = true;

    const hue = App._pickUniqueHue();
    const item = App._attachVectorItem(v, hue);
    App.vectorList.push(item);

    App.renderVectorList();
    App.refreshCalcVectorOptions();
    App.renderExtraCalcOptions();

    // ✅ Auto mode: chỉ cần >=3 thì show 3D, còn lại 2D
    if (App.autoMode) {
      App.mode = (v.length >= 3) ? "3D" : "2D";
      const modeBadge = document.getElementById("modeBadge");
      if (modeBadge) modeBadge.textContent = `Mode: ${App.mode}`;
    }

    App.redrawAll({ frame: false });
    if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
  };

  App.clearAllVectors = function () {
    App.vectorList.length = 0;
    App.usedHues.clear();
    App.currentAngleVisual2D = null;

    if (window.Vec3D) Vec3D.clearAngle();
    if (App.currentAngleVisual3D && window.Vec3D) {
      Vec3D._scene.remove(App.currentAngleVisual3D);
      App.currentAngleVisual3D = null;
    }

    App.renderVectorList();
    App.refreshCalcVectorOptions();
    App.renderExtraCalcOptions();
    App.redrawAll({ frame: true });
  };

  /* ================== RUN CALC (tạo vector) ================== */
  function vectorById(id) { return App.vectorList.find((v) => v.id === id)?.vec ?? null; }

  App.runCalc = async function (addToList) {
    if (!App.vectorList.length) { alert("Chưa có vector nào."); return; }

    const opSelect = document.getElementById("opSelect");
    const v1Select = document.getElementById("v1Select");
    const v2Select = document.getElementById("v2Select");
    const scalarInp = document.getElementById("scalarInp");
    const calcSteps = document.getElementById("calcSteps");

    const op = opSelect.value;
    const id1 = Number(v1Select.value), id2 = Number(v2Select.value);
    const v1 = vectorById(id1);
    const v2 = vectorById(id2);

    let payload = null, explain = "";
    try {
      if (op === "add") {
        if (!v1 || !v2) throw "Chọn đủ v1, v2";
        if (v1.length !== v2.length) throw "Hai vector phải cùng chiều.";
        payload = { v1, v2 }; explain = `${App.formatVectorShort(v1)} + ${App.formatVectorShort(v2)} = `;
      } else if (op === "sub") {
        if (!v1 || !v2) throw "Chọn đủ v1, v2";
        if (v1.length !== v2.length) throw "Hai vector phải cùng chiều.";
        payload = { v1, v2 }; explain = `${App.formatVectorShort(v1)} − ${App.formatVectorShort(v2)} = `;
      } else if (op === "scale") {
        if (!v1) throw "Chọn v1";
        const k = Number(scalarInp.value); if (!isFinite(k)) throw "k không hợp lệ";
        payload = { v: v1, scalar: k }; explain = `${App.formatScalar(k)} · ${App.formatVectorShort(v1)} = `;
      } else if (op === "cross") {
        if (!v1 || !v2) throw "Chọn đủ v1, v2";

        // ✅ Cross chỉ cho đúng 3 chiều (rõ ràng, tránh backend nổ)
        if (v1.length !== 3 || v2.length !== 3) {
          throw "Tích có hướng (cross) chỉ hỗ trợ vector đúng 3 chiều.";
        }

        payload = { v1, v2 }; explain = `${App.formatVectorShort(v1)} × ${App.formatVectorShort(v2)} = `;
      } else if (op === "normalize") {
        if (!v1) throw "Chọn v1";
        payload = { v: v1 }; explain = `normalize(${App.formatVectorShort(v1)}) = `;
      } else if (op === "projection") {
        if (!v1 || !v2) throw "Chọn đủ v1, v2";
        if (v1.length !== v2.length) throw "Hai vector phải cùng chiều không gian.";
        payload = { v: v1, u: v2 };
        explain = `proj_${App.formatVectorShort(v2)}(${App.formatVectorShort(v1)}) = `;
      }
    } catch (err) { alert(String(err)); return; }

    const mapOpToApi = {
      add: "add_vectors",
      sub: "sub_vectors",
      scale: "scale_vector",
      cross: "cross_product",
      normalize: "normalize",
      projection: "projection",
    };

    let data = null;
    try {
      data = await App.callAPI(mapOpToApi[op], payload);
    } catch (e) {
      console.error(e);
      alert("Gọi API thất bại. Kiểm tra backend hoặc CORS.\n" + e.message);
      return;
    }

    const vec = Array.isArray(data?.result) ? data.result : (Array.isArray(data) ? data : null);
    if (!vec) { alert("Kết quả không hợp lệ."); return; }

    const pretty = App.formatVectorShort(vec);
    calcSteps.innerHTML =
      `<div><b>Kết quả:</b> <code>${pretty}</code></div>` +
      `<div class="help" style="margin-top:4px">${explain}${pretty}</div>`;

    if (addToList) {
      const hue = App._pickUniqueHue();
      const item = App._attachVectorItem(vec, hue);
      item.highlighted = true;
      App.vectorList.push(item);

      App.renderVectorList();
      App.refreshCalcVectorOptions();
      App.renderExtraCalcOptions();

      if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
      else if (window.Vec2D) Vec2D.draw2DAllVectors();

      App.currentAngleVisual2D = null;
      if (window.Vec3D) Vec3D.clearAngle();
    } else {
      App.previewVector(vec);
    }
  };

  App.previewVector = function (vec) {
    App.currentVector = vec.slice();

    if (App.mode === "2D" && window.Vec2D) {
      App.firstDrawForVector = false;
      Vec2D.draw2DAllVectors();
    } else if (window.Vec3D) {
      if (App._previewTemp) { Vec3D._scene.remove(App._previewTemp); App._previewTemp = null; }

      const v3 = toVec3(vec);
      const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
      const tipWorld = new THREE.Vector3(v3[0] * u, v3[1] * u, v3[2] * u);

      const grp = Vec3D.buildVectorGroup3D([tipWorld.x, tipWorld.y, tipWorld.z], "#bdbdbd");
      const proj = Vec3D.buildProjectionGroupZUp([tipWorld.x, tipWorld.y, tipWorld.z], "#555");
      const tip = Vec3D.buildTipLabel(App.formatTip(v3), tipWorld);

      const g = new THREE.Group();
      g.add(grp, proj, tip);
      Vec3D._scene.add(g);
      App._previewTemp = g;

      Vec3D.hardRefresh3D(false);
    }

    // Tip hiển thị: nếu bạn muốn chỉ hiện 2D/3D, đổi sang formatTip(toVec3(vec)) cũng được
    App.coordOut(App.formatTip(vec));
  };

  /* ===== UI handlers (không sinh vector) ===== */
  App.angleBetweenUI = async function () {
    if (App.vectorList.length < 2) { alert("Cần ít nhất 2 vector."); return; }
    const v1 = App.selectIdToVector(document.getElementById("v1AngleSelect"));
    const v2 = App.selectIdToVector(document.getElementById("v2AngleSelect"));
    if (!v1 || !v2) { alert("Chọn v1 và v2."); return; }

    try {
      const data = await App.callAPI("angle_between", { v1, v2 });
      const rad = (typeof data?.result === "number") ? data.result : NaN;
      if (!isFinite(rad)) { document.getElementById("result_angle").innerText = "Không đọc được góc."; return; }

      const deg = rad * 180 / Math.PI;
      document.getElementById("result_angle").innerText = `${App.formatScalar(deg)}°`;

      if (App.mode === "2D" && window.Vec2D) Vec2D.drawAngleArc2D(v1, v2, deg);
      else if (window.Vec3D) Vec3D.drawAngleArc3D(v1, v2, rad, deg);

    } catch (err) {
      document.getElementById("result_angle").innerText = "Lỗi: " + err.message;
    }
  };

  App.vectorNormUI = async function () {
    if (!App.vectorList.length) { alert("Chưa có vector nào."); return; }
    const v = App.selectIdToVector(document.getElementById("vNormSelect"));
    if (!v) { alert("Chọn vector."); return; }

    try {
      const data = await App.callAPI("vector_norm", { v });
      const val = (typeof data?.result === "number") ? data.result : NaN;
      document.getElementById("result_norm").innerText = isFinite(val) ? App.formatScalar(val) : "Không đọc được norm.";
    } catch (err) {
      document.getElementById("result_norm").innerText = "Lỗi: " + err.message;
    }
  };

  App.coordinatesUI = async function () {
    if (App.vectorList.length < 1) { alert("Chưa có vector nào."); return; }
    const v = App.selectIdToVector(document.getElementById("vCoordSelect"));
    const basis = App.getCheckedVectors(document.getElementById("basisCoordChecklist"));
    if (!v) { alert("Chọn vector cần đổi tọa độ."); return; }
    if (!basis.length) { alert("Tick ít nhất 1 vector làm cơ sở."); return; }

    try {
      const res = await fetch(`${App.API_BASE}/api/coordinates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vector: v, basis }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const coords = Array.isArray(data?.coordinates) ? data.coordinates : null;
      if (!coords) { document.getElementById("result_coord").innerText = "Không đọc được toạ độ."; return; }

      const terms = coords.map((c, i) => `${App.formatScalar(c)}·${App.formatVectorShort(basis[i])}`);
      document.getElementById("result_coord").innerText =
        `${App.formatVectorShort(v)} = ` + terms.join(" + ");
    } catch (err) {
      document.getElementById("result_coord").innerText = "Lỗi: " + err.message;
    }
  };

  App.refreshCalcUI = function () {
    const op = document.getElementById("opSelect").value;
    const v2Box = document.getElementById("v2Box");
    const scalarBox = document.getElementById("scalarBox");
    const needV2 = (op === "add" || op === "sub" || op === "cross" || op === "projection");

    v2Box.style.display = needV2 ? "" : "none";
    scalarBox.style.display = (op === "scale") ? "" : "none";
    document.getElementById("calcSteps").innerHTML = " ";
  };

  /* dot + proj UI (theo main.js cũ) */
  App.dotProductUI = async function () {
    if (App.vectorList.length < 2) { alert("Cần ít nhất 2 vector."); return; }
    const v1 = App.selectIdToVector(document.getElementById("v1DotSelect"));
    const v2 = App.selectIdToVector(document.getElementById("v2DotSelect"));
    if (!v1 || !v2) { alert("Chọn v1 và v2."); return; }

    try {
      const data = await App.callAPI("dot_product", { v1, v2 });
      const val = (typeof data?.result === "number") ? data.result : NaN;
      document.getElementById("result_dot").innerText = isFinite(val) ? App.formatScalar(val) : "Không đọc được tích vô hướng.";
    } catch (err) {
      document.getElementById("result_dot").innerText = "Lỗi: " + err.message;
    }
  };

  App.projectionUI = async function () {
    const v = App.selectIdToVector(document.getElementById("vProjSelect"));
    const basis = App.getCheckedVectors(document.getElementById("projBasisChecklist"));
    if (!v) { alert("Chọn vector cần chiếu."); return; }
    if (basis.length !== 1) { alert("Chỉ tick đúng 1 vector để làm cơ sở chiếu."); return; }

    try {
      const data = await App.callAPI("projection", { v, u: basis[0] });
      const proj = Array.isArray(data?.result) ? data.result : null;
      document.getElementById("result_proj").innerText = proj ? App.formatVectorShort(proj) : "Không đọc được kết quả chiếu.";
    } catch (err) {
      document.getElementById("result_proj").innerText = "Lỗi: " + err.message;
    }
  };
  /* ===== Linear algebra UI ===== */

  // TÍNH HẠNG HỆ VECTOR
  App.rankVectorsUI = async function () {
    const container = document.getElementById("rankVectorChecklist");
    if (!container) {
      alert("Không tìm thấy danh sách vector (rank).");
      return;
    }

    const vectors = App.getCheckedVectors(container);
    if (!vectors.length) {
      alert("Tick ít nhất 1 vector.");
      return;
    }

    try {
      const res = await App.callAPI("rank", { vectors });
      document.getElementById("result_rank").innerText =
        `Hạng của hệ vector = ${res.rank}`;
    } catch (err) {
      document.getElementById("result_rank").innerText =
        "Lỗi: " + err.message;
    }
  };


  // KIỂM TRA ĐỘC LẬP TUYẾN TÍNH
  App.linearIndependenceUI = async function () {
    const container = document.getElementById("independenceVectorChecklist");
    if (!container) {
      alert("Không tìm thấy danh sách vector (độc lập tuyến tính).");
      return;
    }

    const vectors = App.getCheckedVectors(container);
    if (!vectors.length) {
      alert("Tick ít nhất 1 vector.");
      return;
    }

    try {
      const res = await App.callAPI("linear_independence", { vectors });
      document.getElementById("result_independence").innerText =
        `${res.result} (rank = ${res.rank})`;
    } catch (err) {
      document.getElementById("result_independence").innerText =
        "Lỗi: " + err.message;
    }
  };

})();
