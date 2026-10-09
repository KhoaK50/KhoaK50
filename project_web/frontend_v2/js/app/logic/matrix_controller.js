// ===================== js/app/logic/matrix_controller.js =====================
// Quản lý tạo, xóa, hiển thị ma trận - kế thừa pattern từ vector_controller.js
(function () {
  window.App = window.App || {};

  App.editingMatrixId = null;

  // =========================================================================
  // 1. TIỆN ÍCH
  // =========================================================================

  // Hue cho ma trận: dải xanh-tím (220°-300°) để phân biệt với vector
  App._pickMatrixHue = function () {
    const i = App.matrixList ? App.matrixList.length : 0;
    return (220 + i * 47) % 360;
  };

  // Làm sạch số: loại trailing zeros, ép về int nếu được
  function cleanNum(val) {
    const n = Number(val);
    if (isNaN(n)) return null;
    if (Math.abs(n - Math.round(n)) < 1e-9) return Math.round(n);
    return parseFloat(n.toFixed(6));
  }

  // Format gọn 1 giá trị (dùng smartFormat nếu có)
  function fmtCell(v) {
    if (typeof App.smartFormat === "function") return App.smartFormat(v);
    return String(v);
  }

  // =========================================================================
  // 2. ĐỌC GIÁ TRỊ TỪ GRID DOM
  // =========================================================================
  function readGridValues(gridId, rows, cols) {
    const values = [];
    const latexValues = [];
    const cellParseds = [];
    const foundVars = [];
    const allowedVarsOrder = ["t", "m", "u", "v", "x", "y", "z"];

    for (let i = 0; i < rows; i++) {
      const rowVal = [];
      const rowLat = [];
      const rowParsed = [];
      for (let j = 0; j < cols; j++) {
        const cell = document.getElementById(`${gridId}_cell_${i}_${j}`);
        if (!cell) return null;

        let raw = cell.value.trim();
        if (raw === "") {
          raw = "0";
        }

        // Loại bỏ các số có số 0 vô nghĩa ở đầu (vd: 012, 00)
        // nhưng vẫn cho phép 0, 0.5, -0.5
        if (/^-?0+[0-9]/.test(raw) && !/^-?0\./.test(raw)) {
          return null; // Không hợp lệ
        }

        try {
          const parsed = App.parseVectorExpr(`[${raw}]`, true);
          if (!parsed || parsed.length === 0 || isNaN(Number(parsed[0]))) {
            return null; // Không hợp lệ
          }
          rowVal.push(parsed[0]);
          rowLat.push(raw);
          rowParsed.push(parsed);

          if (parsed.isParametric && Array.isArray(parsed.vars)) {
            parsed.vars.forEach((v) => {
              if (!foundVars.includes(v)) foundVars.push(v);
            });
          }
        } catch (err) {
          return null;
        }
      }
      values.push(rowVal);
      latexValues.push(rowLat);
      cellParseds.push(rowParsed);
    }

    // Sắp xếp các biến theo thứ tự ưu tiên: t > m > u > v > x > y > z
    const sortedVars = allowedVarsOrder.filter((v) => foundVars.includes(v));
    foundVars.forEach((v) => {
      if (!sortedVars.includes(v)) sortedVars.push(v);
    });

    const isParametric = sortedVars.length > 0;

    return { values, latexValues, cellParseds, isParametric, vars: sortedVars };
  }

  // =========================================================================
  // 3. TẠO OBJECT MA TRẬN
  // =========================================================================
  function createMatrixItem(rows, cols, values, latexValues, hue, paramData = {}) {
    const id = paramData.id !== undefined ? paramData.id : App.nextMatrixId++;
    const isParametric = !!paramData.isParametric;
    const vars = paramData.vars || [];
    const primaryVar = paramData.paramVar || vars[0] || "t";
    const defaultScope = { t: 1.0, m: 1.0, u: 1.0, v: 1.0, x: 2.0, y: 1.0, z: 1.0 };
    const scopeValues = Object.assign({}, defaultScope, paramData.scopeValues || {});
    const cellParseds = paramData.cellParseds || null;

    const item = {
      id: id,
      name: paramData.name || `M${id}`,
      rows: rows,
      cols: cols,
      values: values,
      latexValues: latexValues,
      cellParseds: cellParseds,
      colorHex:
        typeof App.hslToHex === "function"
          ? App.hslToHex(hue / 360, 0.7, 0.55)
          : `hsl(${hue}, 70%, 55%)`,
      colorCss: `hsl(${hue}, 70%, 55%)`,
      isParametric: isParametric,
      vars: vars,
      paramVar: primaryVar,
      activeAnimVars: Array.isArray(paramData.activeAnimVars) ? paramData.activeAnimVars : (vars.length ? [...vars] : [primaryVar]),
      scopeValues: scopeValues,
      varRanges: paramData.varRanges || {},
      varStates: paramData.varStates || {},
      paramVal: paramData.paramVal !== undefined ? paramData.paramVal : 1.0,
      initialParamVal: paramData.initialParamVal !== undefined ? paramData.initialParamVal : (paramData.paramVal !== undefined ? paramData.paramVal : 1.0),
      paramMin: paramData.paramMin !== undefined ? paramData.paramMin : -10.0,
      paramMax: paramData.paramMax !== undefined ? paramData.paramMax : 10.0,
      paramInfinity: !!paramData.paramInfinity,
      duration: paramData.duration !== undefined ? paramData.duration : 4.0,
      isAnimating: false,
      animDirection: 1,
    };

    item.evalMatrix = function (valOrScope, explicitScope) {
      const activeVar = this.paramVar || primaryVar;
      const baseScope = Object.assign({}, defaultScope, this.scopeValues || {});
      if (explicitScope && typeof explicitScope === "object") {
        Object.assign(baseScope, explicitScope);
      }
      let sc = baseScope;
      if (typeof valOrScope === "number") {
        sc[activeVar] = valOrScope;
      } else if (valOrScope && typeof valOrScope === "object") {
        Object.assign(sc, valOrScope);
      }

      const res = [];
      for (let i = 0; i < this.rows; i++) {
        const row = [];
        for (let j = 0; j < this.cols; j++) {
          const cp = this.cellParseds && this.cellParseds[i] ? this.cellParseds[i][j] : null;
          if (cp && typeof cp.fn === "function") {
            const v = cp.fn.call(cp, sc);
            row.push(Array.isArray(v) ? (isNaN(v[0]) ? 0 : v[0]) : (isNaN(v) ? 0 : v));
          } else if (this.latexValues && this.latexValues[i] && this.latexValues[i][j]) {
            try {
              const p = App.parseVectorExpr(`[${this.latexValues[i][j]}]`, true);
              if (p && typeof p.fn === "function") {
                const v = p.fn(sc);
                row.push(Array.isArray(v) ? (isNaN(v[0]) ? 0 : v[0]) : (isNaN(v) ? 0 : v));
              } else if (p && p.length > 0) {
                row.push(p[0]);
              } else {
                row.push(this.values[i][j]);
              }
            } catch (e) {
              row.push(this.values[i][j]);
            }
          } else {
            row.push(this.values[i][j]);
          }
        }
        res.push(row);
      }
      return res;
    };

    return item;
  }

  // =========================================================================
  // 4. CRUD: THÊM MA TRẬN
  // =========================================================================
  App.onAddMatrix = function () {
    const rowsInput = document.getElementById("matrixCreateRows");
    const colsInput = document.getElementById("matrixCreateCols");
    if (!rowsInput || !colsInput) return;

    const rows = Math.max(1, Math.min(5, parseInt(rowsInput.value) || 3));
    const cols = Math.max(1, Math.min(5, parseInt(colsInput.value) || 3));

    const gridData = readGridValues("matrixCreateGrid", rows, cols);
    if (!gridData) {
      App.showToast("Có ô chứa biểu thức không hợp lệ!");
      // Shake animation cho grid
      const grid = document.getElementById("matrixCreateGrid");
      if (grid) {
        grid.style.animation = "none";
        void grid.offsetWidth;
        grid.style.animation = "shakeError 0.4s ease-in-out";
      }
      return;
    }

    const { values, latexValues } = gridData;

    if (App.editingMatrixId !== null) {
      // Chế độ Edit
      const targetIdx = App.matrixList.findIndex((m) => m.id === App.editingMatrixId);
      if (targetIdx !== -1) {
        const item = App.matrixList[targetIdx];
        if (App.History && typeof App.History.record === "function") {
          App.History.record(`Sửa ma trận ${item.name}`);
        }
        item.rows = rows;
        item.cols = cols;
        item.values = values;
        item.latexValues = latexValues;
        item.cellParseds = gridData.cellParseds;
        item.isParametric = !!gridData.isParametric;
        item.vars = gridData.vars || [];
        if (item.isParametric) {
          if (!item.paramVar || !item.vars.includes(item.paramVar)) {
            item.paramVar = item.vars[0] || "t";
          }
          if (!item.scopeValues) {
            item.scopeValues = { t: 1.0, m: 1.0, u: 1.0, v: 1.0, x: 2.0, y: 1.0, z: 1.0 };
          }
        } else {
          item.isAnimating = false;
        }
      }

      App.editingMatrixId = null;

      // Đổi lại UI nút Thêm
      const btn = document.getElementById("btnAddMatrix");
      if (btn) {
        btn.innerHTML = '<i class="ph ph-plus" style="margin-right:6px;"></i> Thêm Ma Trận';
        btn.classList.remove("success");
        btn.classList.add("primary");
      }
    } else {
      // Chế độ Thêm mới
      const hue = App._pickMatrixHue();
      const item = createMatrixItem(rows, cols, values, latexValues, hue, gridData);
      if (App.History && typeof App.History.record === "function") {
        App.History.record(`Thêm ma trận ${item.name}`);
      }
      App.matrixList.push(item);

      // Scroll danh sách xuống cuối để thấy item vừa tạo
      requestAnimationFrame(() => {
        const list = document.getElementById("matrixList");
        if (list) list.scrollTop = list.scrollHeight;
      });
    }

    App.renderMatrixList();
  };

  // =========================================================================
  // 4b. CRUD: SỬA MA TRẬN (ĐƯA VÀO FORM)
  // =========================================================================
  App.startEditMatrix = function (id) {
    const item = App.matrixList.find(m => m.id === id);
    if (!item) return;

    App.editingMatrixId = id;

    // Switch tab qua tạo object nếu đang ở chỗ khác
    const createSelect = document.getElementById("createObjectSelect");
    if (createSelect && createSelect.value !== "matrix") {
      createSelect.value = "matrix";
      createSelect.dispatchEvent(new Event("change"));
    }

    // Gán rows/cols
    const rowsInput = document.getElementById("matrixCreateRows");
    const colsInput = document.getElementById("matrixCreateCols");
    if (rowsInput) rowsInput.value = item.rows;
    if (colsInput) colsInput.value = item.cols;

    // Kích hoạt render grid
    if (typeof App.attachMatrixGridHandlers === "function") {
      // Hàm này đã lắng nghe sự kiện input, nhưng ta có thể ép render
      if (typeof App.renderDynamicMatrix === "function") {
        App.renderDynamicMatrix({ gridId: "matrixCreateGrid", rowsInputId: "matrixCreateRows", colsInputId: "matrixCreateCols" });
      }
    }

    // Đổ dữ liệu vào grid
    for (let i = 0; i < item.rows; i++) {
      for (let j = 0; j < item.cols; j++) {
        const cell = document.getElementById(`matrixCreateGrid_cell_${i}_${j}`);
        if (cell) {
          cell.value = (item.latexValues && item.latexValues[i] && item.latexValues[i][j]) 
                       ? item.latexValues[i][j] 
                       : item.values[i][j];
        }
      }
    }

    // Cập nhật nút UI
    const btn = document.getElementById("btnAddMatrix");
    if (btn) {
      btn.innerHTML = '<i class="ph ph-check" style="margin-right:6px;"></i> Lưu Ma Trận';
      btn.classList.remove("primary");
      btn.classList.add("success");
    }

    // Scroll lên form
    const formPanel = document.getElementById("createMatrixPanel");
    if (formPanel) {
      formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // =========================================================================
  // 5. CRUD: XÓA 1 MA TRẬN
  // =========================================================================
  App.deleteMatrix = function (id) {
    const idx = App.matrixList.findIndex((m) => m.id === id);
    if (idx < 0) return;
    const item = App.matrixList[idx];
    const name = item.name;
    item.isAnimating = false;
    if (App.History && typeof App.History.record === "function") {
      App.History.record(`Xóa ma trận ${name}`);
    }
    App.matrixList.splice(idx, 1);

    const anyOtherRunning = (App.matrixList || []).some((m) => m.isParametric && m.isAnimating);
    if (!anyOtherRunning && App._matAnimFrameId) {
      cancelAnimationFrame(App._matAnimFrameId);
      App._matAnimFrameId = null;
      App._lastMatAnimTimestamp = null;
    }

    App.renderMatrixList();
  };

  // =========================================================================
  // 6. CRUD: XÓA HẾT
  // =========================================================================
  App.clearAllMatrices = function () {
    if (App.matrixList.length === 0) {
      App.showToast("Danh sách đã trống rồi!", "warning");
      return;
    }
    if (App.History && typeof App.History.record === "function") {
      App.History.record("Xóa tất cả ma trận");
    }
    (App.matrixList || []).forEach((m) => { m.isAnimating = false; });
    App.matrixList.length = 0;
    App.nextMatrixId = 1;

    if (App._matAnimFrameId) {
      cancelAnimationFrame(App._matAnimFrameId);
      App._matAnimFrameId = null;
      App._lastMatAnimTimestamp = null;
    }

    App.renderMatrixList();
  };

  // =========================================================================
  // 6b. ĐIỀU KHIỂN & HOẠT ẢNH THAM SỐ MA TRẬN
  // =========================================================================

  // Cập nhật giá trị hiển thị trên thẻ ma trận
  App.updateSingleMatrixUI = function (item) {
    if (!item) return;

    const activeVars = (Array.isArray(item.activeAnimVars) && item.activeAnimVars.length > 0)
      ? item.activeAnimVars
      : (item.vars && item.vars.length ? item.vars : [item.paramVar || "t"]);
    const isMultiMode = activeVars.length > 1;

    const curVar = item.paramVar || activeVars[0];
    item.paramVar = curVar;

    const varLbl = document.getElementById(`matParamVarLbl_${item.id}`);
    if (varLbl) {
      varLbl.textContent = `${curVar} =`;
    }

    const valInp = document.getElementById(`matParamValInp_${item.id}`);
    if (valInp && document.activeElement !== valInp) {
      const curVal = (item.scopeValues && item.scopeValues[curVar] !== undefined)
        ? item.scopeValues[curVar]
        : (item.paramVal ?? 1.0);
      valInp.value = Number(curVal).toFixed(2);
    }
    const slider = document.getElementById(`matParamSlider_${item.id}`);
    if (slider) {
      const curVal = (item.scopeValues && item.scopeValues[curVar] !== undefined)
        ? item.scopeValues[curVar]
        : (item.paramVal ?? 1.0);
      slider.value = curVal;
    }
    const playBtn = document.getElementById(`matParamPlay_${item.id}`);
    if (playBtn) {
      playBtn.className = "mat-param-btn mat-param-play" + (item.isAnimating ? " is-active" : "");
      playBtn.innerHTML = item.isAnimating ? '<i class="ph ph-pause"></i>' : '<i class="ph ph-play"></i>';
      playBtn.title = item.isAnimating ? "Tạm dừng" : "Chạy hoạt ảnh";
    }

    // Cập nhật các huy hiệu biến chạy đồng thời (multi-variable badges)
    const multiBox = document.getElementById(`matParamMultiVals_${item.id}`);
    if (multiBox) {
      multiBox.style.display = isMultiMode ? "flex" : "none";
      if (isMultiMode) {
        const badges = multiBox.querySelectorAll(".mat-multi-badge");
        if (badges.length === activeVars.length) {
          activeVars.forEach((vName, idx) => {
            const b = badges[idx];
            const val = (item.scopeValues && item.scopeValues[vName] !== undefined)
              ? Number(item.scopeValues[vName]).toFixed(2)
              : (vName === curVar ? Number(item.paramVal).toFixed(2) : "1.00");
            b.textContent = `${vName} = ${val}`;
            b.classList.toggle("active", vName === curVar);
          });
        } else {
          multiBox.innerHTML = "";
          activeVars.forEach((vName) => {
            const val = (item.scopeValues && item.scopeValues[vName] !== undefined)
              ? Number(item.scopeValues[vName]).toFixed(2)
              : (vName === curVar ? Number(item.paramVal).toFixed(2) : "1.00");
            const isCur = (vName === curVar);
            const badge = document.createElement("button");
            badge.type = "button";
            badge.className = "mat-multi-badge" + (isCur ? " active" : "");
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
              const s = document.getElementById(`matParamSlider_${item.id}`);
              if (s) {
                s.min = item.paramInfinity ? -25 : (item.paramMin ?? -10.0);
                s.max = item.paramInfinity ? 25 : (item.paramMax ?? 10.0);
                s.value = item.paramVal;
              }
              const vl = document.getElementById(`matParamVarLbl_${item.id}`);
              if (vl) vl.textContent = `${vName} =`;
              const vi = document.getElementById(`matParamValInp_${item.id}`);
              if (vi) vi.value = Number(item.paramVal).toFixed(2);
              App.updateSingleMatrixUI(item);
            };
            multiBox.appendChild(badge);
          });
        }
      }
    }
  };

  // Tìm ma trận theo ID (hỗ trợ cả danh sách chính lẫn ma trận tham số trong phép tính)
  function findMatrixById(itemId) {
    if (itemId === null || itemId === undefined) return null;
    const sId = String(itemId);
    const found = (App.matrixList || []).find((m) => String(m.id) === sId);
    if (found) return found;
    if (App.calcParamMatrixA && String(App.calcParamMatrixA.id) === sId) return App.calcParamMatrixA;
    if (App.calcParamMatrixB && String(App.calcParamMatrixB.id) === sId) return App.calcParamMatrixB;
    return null;
  }

  // Đặt giá trị tham số ma trận từ slider hoặc code
  App.setMatrixParamValue = function (itemId, val) {
    const item = findMatrixById(itemId);
    if (!item || !item.isParametric) return;

    const num = parseFloat(val);
    if (isNaN(num)) return;

    item.paramVal = num;
    if (item.scopeValues && item.paramVar) {
      item.scopeValues[item.paramVar] = num;
    }
    if (typeof item.evalMatrix === "function") {
      item.values = item.evalMatrix(num, item.scopeValues);
    }

    App.updateSingleMatrixUI(item);

    // Đồng bộ với MasterParamController trong chế độ link_names
    if (window.App?.MasterParamController?.broadcastParamValue) {
      window.App.MasterParamController.broadcastParamValue(item.paramVar || "t", num, "matrix", item.id);
    }

    // Đồng bộ Live với LinearTransform
    if (window.App?.LinearTransform?.isActive?.()) {
      if (typeof window.App.LinearTransform.updateLiveMatrix === "function") {
        window.App.LinearTransform.updateLiveMatrix(item.values);
      }
    }

    // Đồng bộ Live với MixedCalc
    const matSel = document.getElementById("mixedMatrixSelect");
    if (matSel && String(matSel.value) === String(item.id) && typeof App.runMixedCalc === "function") {
      App.runMixedCalc(false);
    }

    // Đồng bộ Live với MatrixCalc
    if (String(item.id) === "calcA" || String(item.id) === "calcB") {
      const calcPanel = document.getElementById("calcMatrixPanel");
      const resBox = document.getElementById("matrixResultBox");
      if (calcPanel && calcPanel.classList.contains("active") && resBox && resBox.style.display !== "none" && typeof App.runMatrixCalc === "function") {
        App.runMatrixCalc(false);
      }
    }
  };

  // Đặt giá trị trực tiếp từ ô input (tự động nới dải Min/Max)
  App.setMatrixParamValueDirect = function (itemId, val) {
    const item = findMatrixById(itemId);
    if (!item || !item.isParametric) return;

    const num = parseFloat(val);
    if (isNaN(num)) return;

    let minChanged = false;
    let maxChanged = false;
    if (item.paramMin !== undefined && num < item.paramMin) {
      item.paramMin = Math.floor(num - 2);
      minChanged = true;
    }
    if (item.paramMax !== undefined && num > item.paramMax) {
      item.paramMax = Math.ceil(num + 2);
      maxChanged = true;
    }

    const slider = document.getElementById(`matParamSlider_${item.id}`);
    if (slider) {
      if (minChanged && !item.paramInfinity) slider.min = item.paramMin;
      if (maxChanged && !item.paramInfinity) slider.max = item.paramMax;
      slider.value = num;
    }

    App.setMatrixParamValue(itemId, num);
  };

  // Bật/tắt hoạt ảnh tham số ma trận
  App.toggleMatrixAnimation = function (itemId) {
    const item = findMatrixById(itemId);
    if (!item || !item.isParametric) return;

    item.isAnimating = !item.isAnimating;
    if (item.isAnimating) {
      if (!item.animDirection) item.animDirection = 1;
      App.startMatrixParamAnimationLoop();
    } else {
      const anyOtherRunning = [...(App.matrixList || []), App.calcParamMatrixA, App.calcParamMatrixB]
        .some((m) => m && String(m.id) !== String(item.id) && m.isParametric && m.isAnimating);
      if (!anyOtherRunning && App._matAnimFrameId) {
        cancelAnimationFrame(App._matAnimFrameId);
        App._matAnimFrameId = null;
        App._lastMatAnimTimestamp = null;
      }
    }
    App.updateSingleMatrixUI(item);
  };

  // Đặt lại tham số ma trận về ban đầu
  App.resetMatrixParam = function (itemId) {
    const item = findMatrixById(itemId);
    if (!item || !item.isParametric) return;

    item.isAnimating = false;
    const defaultVal = item.initialParamVal !== undefined ? item.initialParamVal : 1.0;
    item.paramVal = defaultVal;
    if (item.scopeValues) {
      if (item.paramVar) item.scopeValues[item.paramVar] = defaultVal;
      if (item.vars && Array.isArray(item.vars)) {
        item.vars.forEach((v) => {
          item.scopeValues[v] = defaultVal;
        });
      }
    }
    item.animDirection = 1;
    if (item.varStates) {
      Object.keys(item.varStates).forEach((k) => {
        item.varStates[k].dir = 1;
      });
    }
    if (typeof item.evalMatrix === "function") {
      item.values = item.evalMatrix(defaultVal, item.scopeValues);
    }

    const anyOtherRunning = [...(App.matrixList || []), App.calcParamMatrixA, App.calcParamMatrixB]
      .some((m) => m && String(m.id) !== String(item.id) && m.isParametric && m.isAnimating);
    if (!anyOtherRunning && App._matAnimFrameId) {
      cancelAnimationFrame(App._matAnimFrameId);
      App._matAnimFrameId = null;
      App._lastMatAnimTimestamp = null;
    }

    App.updateSingleMatrixUI(item);

    const matSel = document.getElementById("mixedMatrixSelect");
    if (matSel && String(matSel.value) === String(item.id) && typeof App.runMixedCalc === "function") {
      App.runMixedCalc(false);
    }

    if (String(item.id) === "calcA" || String(item.id) === "calcB") {
      const calcPanel = document.getElementById("calcMatrixPanel");
      const resBox = document.getElementById("matrixResultBox");
      if (calcPanel && calcPanel.classList.contains("active") && resBox && resBox.style.display !== "none" && typeof App.runMatrixCalc === "function") {
        App.runMatrixCalc(false);
      }
    }
  };

  // Vòng lặp RAF chạy hoạt ảnh cho các ma trận tham số
  App.startMatrixParamAnimationLoop = function () {
    if (App._matAnimFrameId) return;
    App._lastMatAnimTimestamp = performance.now();

    function step(now) {
      const dt = Math.min(0.08, (now - (App._lastMatAnimTimestamp || now)) / 1000);
      App._lastMatAnimTimestamp = now;

      let hasActive = false;
      const allItems = [...(App.matrixList || [])];
      if (App.calcParamMatrixA && App.calcParamMatrixA.isParametric) allItems.push(App.calcParamMatrixA);
      if (App.calcParamMatrixB && App.calcParamMatrixB.isParametric) allItems.push(App.calcParamMatrixB);

      let needMatrixCalcUpdate = false;

      allItems.forEach((item) => {
        if (item.isParametric && item.isAnimating) {
          hasActive = true;
          const varsToAnim = (item.activeAnimVars && item.activeAnimVars.length > 0)
            ? item.activeAnimVars
            : [item.paramVar || "t"];

          if (!item.varStates) item.varStates = {};
          if (!item.varRanges) item.varRanges = {};

          const isLockstep = (item.syncMode === "lockstep");

          varsToAnim.forEach((vName, idx) => {
            if (!item.varStates[vName]) {
              const freqRatio = isLockstep ? 1.0 : (idx === 0 ? 1.0 : (idx === 1 ? 1.4142 : (idx === 2 ? 1.732 : 2.236)));
              item.varStates[vName] = { dir: 1, speedRatio: freqRatio };
            }
            const vState = item.varStates[vName];
            if (isLockstep) {
              vState.speedRatio = 1.0;
            }

            let rangeObj = item.varRanges[vName];
            if (!rangeObj) {
              rangeObj = {
                min: (idx === 0 ? (item.paramMin ?? -10.0) : -5.0),
                max: (idx === 0 ? (item.paramMax ?? 10.0) : 5.0)
              };
              item.varRanges[vName] = rangeObj;
            }

            let vMin = Number(rangeObj.min);
            let vMax = Number(rangeObj.max);
            if (isNaN(vMin)) vMin = -10.0;
            if (isNaN(vMax)) vMax = 10.0;
            if (vMax <= vMin) vMax = vMin + 1.0;

            const dur = Math.max(0.5, item.duration ?? 4.0);
            const vSpan = vMax - vMin;
            const vSpeed = (vSpan / dur) * (vState.dir || 1) * (vState.speedRatio || 1);

            let curVal = (item.scopeValues && item.scopeValues[vName] !== undefined)
              ? item.scopeValues[vName]
              : (vName === item.paramVar ? (item.paramVal ?? 1.0) : (vMin + vSpan / 2));

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

          if (typeof item.evalMatrix === "function") {
            item.values = item.evalMatrix(item.paramVal, item.scopeValues);
          }

          App.updateSingleMatrixUI(item);

          // Đồng bộ Live với LinearTransform
          if (window.App?.LinearTransform?.isActive?.()) {
            if (typeof window.App.LinearTransform.updateLiveMatrix === "function") {
              window.App.LinearTransform.updateLiveMatrix(item.values);
            }
          }

          // Đồng bộ Live với MixedCalc
          const matSel = document.getElementById("mixedMatrixSelect");
          if (matSel && String(matSel.value) === String(item.id) && typeof App.runMixedCalc === "function") {
            App.runMixedCalc(false);
          }

          if (String(item.id) === "calcA" || String(item.id) === "calcB") {
            needMatrixCalcUpdate = true;
          }
        }
      });

      if (needMatrixCalcUpdate && typeof App.runMatrixCalc === "function") {
        const calcPanel = document.getElementById("calcMatrixPanel");
        const resBox = document.getElementById("matrixResultBox");
        if (calcPanel && calcPanel.classList.contains("active") && resBox && resBox.style.display !== "none") {
          App.runMatrixCalc(false);
        }
      }

      if (hasActive) {
        App._matAnimFrameId = requestAnimationFrame(step);
      } else {
        App._matAnimFrameId = null;
        App._lastMatAnimTimestamp = null;
      }
    }

    App._matAnimFrameId = requestAnimationFrame(step);
  };

  // =========================================================================
  // 6c. TẠO BỘ ĐIỀU KHIỂN THAM SỐ MA TRẬN DÙNG CHUNG (TÁI SỬ DỤNG CHO PHÉP TÍNH)
  // =========================================================================
  App.createMatrixParamController = function (item, onUpdateCallback, options = {}) {
    if (!item || !item.isParametric) return null;

    const paramCtrl = document.createElement("div");
    paramCtrl.className = "mat-param-controller";

    // Khởi tạo activeAnimVars nếu chưa có
    if (!item.activeAnimVars || !Array.isArray(item.activeAnimVars) || !item.activeAnimVars.length) {
      item.activeAnimVars = item.vars && item.vars.length ? [...item.vars] : [item.paramVar || "t"];
    }

    const isMultiModeNow = (item.activeAnimVars && item.activeAnimVars.length > 1) || (item.vars && item.vars.length > 1);

    // Khung hiển thị các huy hiệu biến chạy hoạt ảnh đồng thời (Multi-variable Badges)
    const multiValBox = document.createElement("div");
    multiValBox.className = "mat-param-multi-box";
    multiValBox.id = `matParamMultiVals_${item.id}`;
    multiValBox.style.display = isMultiModeNow ? "flex" : "none";

    const bar = document.createElement("div");
    bar.className = "mat-param-bar";

    const valBox = document.createElement("div");
    valBox.className = "mat-param-val-box";
    valBox.title = "Nhập trực tiếp giá trị tham số đang chọn";

    const valLabel = document.createElement("span");
    valLabel.className = "mat-param-var-label";
    valLabel.id = `matParamVarLbl_${item.id}`;
    valLabel.textContent = `${item.paramVar || "t"} =`;

    const valInp = document.createElement("input");
    valInp.type = "number";
    valInp.className = "mat-param-val-inp";
    valInp.id = `matParamValInp_${item.id}`;
    valInp.value = Number(item.paramVal ?? 1.0).toFixed(2);
    valInp.step = "0.1";

    valInp.onfocus = () => {
      if (item.isAnimating) {
        App.toggleMatrixAnimation(item.id);
      }
    };

    valInp.oninput = (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        App.setMatrixParamValueDirect(item.id, val);
        if (typeof onUpdateCallback === "function") onUpdateCallback(item);
      }
    };

    valInp.onkeydown = (e) => {
      if (e.key === "Enter") {
        valInp.blur();
      }
    };

    valBox.appendChild(valLabel);
    valBox.appendChild(valInp);

    const playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.className = "mat-param-btn mat-param-play" + (item.isAnimating ? " is-active" : "");
    playBtn.id = `matParamPlay_${item.id}`;
    playBtn.title = item.isAnimating ? "Tạm dừng" : "Chạy hoạt ảnh";
    playBtn.innerHTML = item.isAnimating ? '<i class="ph ph-pause"></i>' : '<i class="ph ph-play"></i>';
    playBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      App.toggleMatrixAnimation(item.id);
    };

    const slider = document.createElement("input");
    slider.type = "range";
    slider.className = "mat-param-slider";
    slider.id = `matParamSlider_${item.id}`;
    slider.min = item.paramInfinity ? -25 : (item.paramMin ?? -10.0);
    slider.max = item.paramInfinity ? 25 : (item.paramMax ?? 10.0);
    slider.step = "0.05";
    slider.value = item.paramVal ?? 1.0;
    slider.onpointerdown = () => { App._isDraggingSlider = true; };
    slider.onpointerup = () => {
      App._isDraggingSlider = false;
      if (App.mode === "2D" && window.Vec2D) Vec2D.draw2DAllVectors();
      else if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
    };
    slider.oninput = (e) => {
      App._isDraggingSlider = true;
      App.setMatrixParamValue(item.id, e.target.value);
      if (typeof onUpdateCallback === "function") onUpdateCallback(item);
    };
    slider.onchange = () => {
      App._isDraggingSlider = false;
      if (App.mode === "2D" && window.Vec2D) Vec2D.draw2DAllVectors();
      else if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
    };

    const updateMultiBadges = () => {
      multiValBox.innerHTML = "";
      if (!item.activeAnimVars || !item.activeAnimVars.length) {
        item.activeAnimVars = item.vars && item.vars.length ? [...item.vars] : [item.paramVar || "t"];
      }
      const curVar = item.paramVar || item.activeAnimVars[0];
      item.activeAnimVars.forEach((vName) => {
        const val = (item.scopeValues && item.scopeValues[vName] !== undefined)
          ? Number(item.scopeValues[vName]).toFixed(2)
          : (vName === curVar ? Number(item.paramVal).toFixed(2) : "1.00");
        const isCur = (vName === curVar);
        const badge = document.createElement("button");
        badge.type = "button";
        badge.className = "mat-multi-badge" + (isCur ? " active" : "");
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
          slider.min = item.paramInfinity ? -25 : (item.paramMin ?? -10.0);
          slider.max = item.paramInfinity ? 25 : (item.paramMax ?? 10.0);
          slider.value = item.paramVal;
          valLabel.textContent = `${vName} =`;
          valInp.value = Number(item.paramVal).toFixed(2);
          updateMultiBadges();
          if (typeof onUpdateCallback === "function") onUpdateCallback(item);
        };
        multiValBox.appendChild(badge);
      });
    };
    if (isMultiModeNow) {
      updateMultiBadges();
    }

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "mat-param-btn mat-param-reset";
    resetBtn.title = "Đặt lại về mặc định";
    resetBtn.innerHTML = '<i class="ph ph-arrow-counter-clockwise"></i>';
    resetBtn.onclick = (e) => {
      e.stopPropagation();
      App.resetMatrixParam(item.id);
      if (typeof onUpdateCallback === "function") onUpdateCallback(item);
    };

    const moreBtn = document.createElement("button");
    moreBtn.type = "button";
    moreBtn.className = "mat-param-btn mat-param-more-btn";
    moreBtn.id = `matParamMore_${item.id}`;
    moreBtn.title = "Cài đặt tham số";
    moreBtn.innerHTML = '<i class="ph ph-dots-three-vertical"></i>';

    paramCtrl.appendChild(multiValBox);
    bar.appendChild(valBox);
    bar.appendChild(playBtn);
    bar.appendChild(slider);
    bar.appendChild(resetBtn);
    bar.appendChild(moreBtn);
    paramCtrl.appendChild(bar);

    // Popover cài đặt tham số nâng cao
    const popover = document.createElement("div");
    popover.className = "mat-param-popover";
    popover.id = `matParamPopover_${item.id}`;
    popover.style.display = "none";

    const popHeader = document.createElement("div");
    popHeader.className = "vec-param-popover-header";
    const popTitle = document.createElement("span");
    popTitle.className = "vec-param-popover-title";
    popTitle.textContent = `Cài đặt tham số ${item.name || "M"}`;
    const popClose = document.createElement("button");
    popClose.type = "button";
    popClose.className = "vec-param-popover-close";
    popClose.innerHTML = '<i class="ph ph-x"></i>';
    popClose.onclick = (e) => {
      e.stopPropagation();
      popover.style.display = "none";
    };
    popHeader.appendChild(popTitle);
    popHeader.appendChild(popClose);
    popover.appendChild(popHeader);

    // 1. Phân khu chọn các biến hoạt ảnh (chạy đồng thời hoặc chọn lẻ)
    if (item.vars && item.vars.length > 1) {
      const secAnimVars = document.createElement("div");
      secAnimVars.className = "vec-param-section";
      const titleAnimVars = document.createElement("div");
      titleAnimVars.className = "vec-param-sec-title";
      titleAnimVars.textContent = "BIẾN HOẠT ẢNH (CHỌN CHẠY ĐỒNG THỜI)";
      secAnimVars.appendChild(titleAnimVars);

      const chipsWrap = document.createElement("div");
      chipsWrap.className = "mat-var-chips";

      item.vars.forEach((vName) => {
        const chip = document.createElement("button");
        chip.type = "button";
        const isActive = item.activeAnimVars.includes(vName);
        chip.className = "mat-var-chip" + (isActive ? " active" : "");
        chip.innerHTML = isActive
          ? `<i class="ph ph-check"></i> <span>Biến ${vName}</span>`
          : `<span>Biến ${vName}</span>`;

        chip.onclick = (e) => {
          e.stopPropagation();
          if (!item.activeAnimVars) item.activeAnimVars = [];
          const idx = item.activeAnimVars.indexOf(vName);
          if (idx >= 0) {
            item.activeAnimVars.splice(idx, 1);
          } else {
            item.activeAnimVars.push(vName);
          }
          if (item.activeAnimVars.length === 0) {
            item.activeAnimVars.push(vName);
          }
          const nowActive = item.activeAnimVars.includes(vName);
          chip.classList.toggle("active", nowActive);
          chip.innerHTML = nowActive
            ? `<i class="ph ph-check"></i> <span>Biến ${vName}</span>`
            : `<span>Biến ${vName}</span>`;

          if (item.activeAnimVars.length === 1) {
            const singleVar = item.activeAnimVars[0];
            item.paramVar = singleVar;
            if (item.varRanges && item.varRanges[singleVar]) {
              item.paramMin = item.varRanges[singleVar].min;
              item.paramMax = item.varRanges[singleVar].max;
              slider.min = item.paramMin;
              slider.max = item.paramMax;
            }
            if (item.scopeValues && item.scopeValues[singleVar] !== undefined) {
              item.paramVal = item.scopeValues[singleVar];
            }
            valLabel.textContent = `${singleVar} =`;
            valInp.value = Number(item.paramVal).toFixed(2);
            slider.value = item.paramVal;
          }

          multiValBox.style.display = item.activeAnimVars.length > 1 ? "flex" : "none";
          updateMultiBadges();
          App.updateSingleMatrixUI(item);
          if (typeof onUpdateCallback === "function") onUpdateCallback(item);
        };
        chipsWrap.appendChild(chip);
      });
      secAnimVars.appendChild(chipsWrap);

      // Hàng nút chọn nhanh: Tất cả / Biến chính & Chế độ đồng bộ
      const quickRow = document.createElement("div");
      quickRow.style.cssText = "display:flex; gap:6px; margin-top:6px; flex-wrap:wrap;";

      const btnAll = document.createElement("button");
      btnAll.type = "button";
      btnAll.className = "vec-param-preset-btn";
      btnAll.style.cssText = "flex:1; padding:4px 6px; font-size:10.5px;";
      btnAll.textContent = "Chạy tất cả biến";
      btnAll.onclick = (e) => {
        e.stopPropagation();
        item.activeAnimVars = [...item.vars];
        chipsWrap.querySelectorAll(".mat-var-chip").forEach((c) => {
          c.classList.add("active");
          const v = c.textContent.replace("Biến ", "").trim();
          c.innerHTML = `<i class="ph ph-check"></i> <span>Biến ${v}</span>`;
        });
        multiValBox.style.display = "flex";
        updateMultiBadges();
        App.updateSingleMatrixUI(item);
      };

      const btnSyncMode = document.createElement("button");
      btnSyncMode.type = "button";
      btnSyncMode.className = "vec-param-preset-btn" + (item.syncMode === "lockstep" ? " active" : "");
      btnSyncMode.style.cssText = "flex:1; padding:4px 6px; font-size:10.5px;";
      btnSyncMode.textContent = item.syncMode === "lockstep" ? "Đồng bước" : "Độc lập (tần số)";
      btnSyncMode.title = "Chuyển đổi giữa chạy cùng tốc độ hoặc tần số vàng";
      btnSyncMode.onclick = (e) => {
        e.stopPropagation();
        item.syncMode = (item.syncMode === "lockstep") ? "independent" : "lockstep";
        btnSyncMode.classList.toggle("active", item.syncMode === "lockstep");
        btnSyncMode.textContent = item.syncMode === "lockstep" ? "Đồng bước" : "Độc lập (tần số)";
      };

      quickRow.appendChild(btnAll);
      quickRow.appendChild(btnSyncMode);
      secAnimVars.appendChild(quickRow);
      popover.appendChild(secAnimVars);
    }

    // 2. Dải giá trị (Min - Max) từng biến
    const secRange = document.createElement("div");
    secRange.className = "vec-param-section";
    const titleRange = document.createElement("div");
    titleRange.className = "vec-param-sec-title";
    titleRange.textContent = "DẢI GIÁ TRỊ (MIN - MAX)";
    secRange.appendChild(titleRange);

    const varsList = (item.vars && item.vars.length > 0) ? item.vars : [item.paramVar || "t"];
    if (!item.varRanges) item.varRanges = {};

    varsList.forEach((vName, idx) => {
      if (!item.varRanges[vName]) {
        item.varRanges[vName] = {
          min: (idx === 0 ? (item.paramMin ?? -10.0) : -5.0),
          max: (idx === 0 ? (item.paramMax ?? 10.0) : 5.0)
        };
      }
      const rObj = item.varRanges[vName];

      const row = document.createElement("div");
      row.className = "vec-param-var-range-row";
      row.style.cssText = "display:flex; align-items:center; gap:6px; margin-bottom:5px;";

      const tag = document.createElement("span");
      tag.className = "vec-param-var-tag";
      tag.style.cssText = "font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:600; width:52px; color:var(--muted);";
      tag.textContent = `${vName}:`;

      const gridRange = document.createElement("div");
      gridRange.className = "vec-param-grid-2";
      gridRange.style.cssText = "flex:1; display:grid; grid-template-columns:1fr 1fr; gap:4px;";

      const minGroup = document.createElement("div");
      minGroup.className = "vec-param-input-group";
      const minBadge = document.createElement("span");
      minBadge.className = "vec-param-addon";
      minBadge.textContent = "Min";
      const minInp = document.createElement("input");
      minInp.type = "number";
      minInp.className = "vec-param-num-inp";
      minInp.value = rObj.min;
      minInp.step = "1";
      minInp.oninput = (e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) {
          rObj.min = v;
          if (vName === item.paramVar && !item.paramInfinity) {
            item.paramMin = v;
            slider.min = v;
          }
        }
      };
      minGroup.appendChild(minBadge);
      minGroup.appendChild(minInp);

      const maxGroup = document.createElement("div");
      maxGroup.className = "vec-param-input-group";
      const maxBadge = document.createElement("span");
      maxBadge.className = "vec-param-addon";
      maxBadge.textContent = "Max";
      const maxInp = document.createElement("input");
      maxInp.type = "number";
      maxInp.className = "vec-param-num-inp";
      maxInp.value = rObj.max;
      maxInp.step = "1";
      maxInp.oninput = (e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) {
          rObj.max = v;
          if (vName === item.paramVar && !item.paramInfinity) {
            item.paramMax = v;
            slider.max = v;
          }
        }
      };
      maxGroup.appendChild(maxBadge);
      maxGroup.appendChild(maxInp);

      gridRange.appendChild(minGroup);
      gridRange.appendChild(maxGroup);
      row.appendChild(tag);
      row.appendChild(gridRange);
      secRange.appendChild(row);
    });

    const infBtn = document.createElement("button");
    infBtn.type = "button";
    infBtn.className = "vec-param-infinity-btn" + (item.paramInfinity ? " active" : "");
    infBtn.innerHTML = '<i class="ph ph-infinity"></i> Quét vô cực';
    infBtn.onclick = (e) => {
      e.stopPropagation();
      item.paramInfinity = !item.paramInfinity;
      infBtn.classList.toggle("active", item.paramInfinity);
      if (item.paramInfinity) {
        slider.min = -25;
        slider.max = 25;
      } else {
        const curR = item.varRanges[item.paramVar] || { min: -10, max: 10 };
        slider.min = curR.min;
        slider.max = curR.max;
      }
    };
    secRange.appendChild(infBtn);
    popover.appendChild(secRange);

    // 3. Chuyển động và thời lượng
    const secDur = document.createElement("div");
    secDur.className = "vec-param-section";
    const titleDur = document.createElement("div");
    titleDur.className = "vec-param-sec-title";
    titleDur.textContent = "CHUYỂN ĐỘNG";
    secDur.appendChild(titleDur);

    const durRow = document.createElement("div");
    durRow.className = "vec-param-dur-row";
    const durLabel = document.createElement("span");
    durLabel.className = "vec-param-row-label";
    durLabel.textContent = "Thời lượng chu kỳ:";

    const durInputGroup = document.createElement("div");
    durInputGroup.className = "vec-param-input-group vec-param-dur-group";
    const durInp = document.createElement("input");
    durInp.type = "number";
    durInp.className = "vec-param-num-inp vec-param-dur-inp";
    durInp.value = item.duration ?? 4.0;
    durInp.min = "0.5";
    durInp.max = "60";
    durInp.step = "0.5";
    durInp.oninput = (e) => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v) && v > 0) item.duration = v;
    };
    const durUnit = document.createElement("span");
    durUnit.className = "vec-param-addon";
    durUnit.textContent = "giây";
    durInputGroup.appendChild(durInp);
    durInputGroup.appendChild(durUnit);

    durRow.appendChild(durLabel);
    durRow.appendChild(durInputGroup);
    secDur.appendChild(durRow);

    const presetRow = document.createElement("div");
    presetRow.className = "vec-param-preset-row";
    [2, 4, 8].forEach((sec) => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "vec-param-preset-btn";
      pill.textContent = `${sec}s`;
      pill.onclick = (e) => {
        e.stopPropagation();
        item.duration = sec;
        durInp.value = sec;
      };
      presetRow.appendChild(pill);
    });
    secDur.appendChild(presetRow);
    popover.appendChild(secDur);

    // Click 3 dots để mở popover
    moreBtn.onclick = (e) => {
      e.stopPropagation();
      const isOpen = popover.style.display === "block";
      document.querySelectorAll(".mat-param-popover").forEach((p) => (p.style.display = "none"));
      if (!isOpen) {
        if (popover.parentElement !== document.body) {
          document.body.appendChild(popover);
        }
        popover.style.display = "block";
        popover.dataset.triggerId = moreBtn.id;

        const updatePos = () => {
          const btnRect = moreBtn.getBoundingClientRect();
          const popWidth = 275;
          let left = btnRect.right - popWidth;
          if (left < 10) left = 10;
          if (left + popWidth > window.innerWidth - 10) left = window.innerWidth - popWidth - 10;
          const popHeight = popover.offsetHeight || 230;
          let top = btnRect.bottom + 6;
          if (top + popHeight > window.innerHeight - 10) {
            top = btnRect.top - popHeight - 6;
          }
          popover.style.left = `${Math.round(left)}px`;
          popover.style.top = `${Math.round(top)}px`;
        };

        updatePos();
        setTimeout(updatePos, 10);
      }
    };

    return paramCtrl;
  };

  // =========================================================================
  // 7. RENDER DANH SÁCH MA TRẬN
  // =========================================================================
  App.renderMatrixList = function () {
    const el = document.getElementById("matrixList");
    if (!el) return;
    if (window.App?.MasterParamController?.updateUI) {
      window.App.MasterParamController.updateUI();
    }
    document.querySelectorAll("body > .mat-param-popover").forEach((p) => p.remove());

    if (!window._globalMatMenuCloserAttached) {
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".mat-param-btn") && !e.target.closest(".mat-param-popover")) {
          document.querySelectorAll(".mat-param-popover").forEach((p) => (p.style.display = "none"));
        }
      });
      window._globalMatMenuCloserAttached = true;
    }

    el.innerHTML = "";

    // Trạng thái trống
    if (App.matrixList.length === 0) {
      const empty = document.createElement("div");
      empty.className = "mat-empty";
      empty.innerHTML = `
        <i class="ph ph-plus-square" style="font-size:28px; opacity:0.3; margin-bottom:8px;"></i>
        <span>Chưa có ma trận nào</span>
      `;
      el.appendChild(empty);
      if (typeof App.refreshMatrixDropdowns === "function") App.refreshMatrixDropdowns();
      return;
    }

    // Badge counter
    const counter = document.getElementById("matrixCounter");
    if (counter) counter.textContent = App.matrixList.length;

    for (const item of App.matrixList) {
      const li = document.createElement("li");
      li.className = "mat-item";

      // Color swatch
      const sw = document.createElement("div");
      sw.className = "mat-swatch";
      sw.style.background = item.colorCss;

      // Header row: name + dimension badge on left, actions on right
      const headerRow = document.createElement("div");
      headerRow.className = "mat-header-row";

      const headerLeft = document.createElement("div");
      headerLeft.className = "mat-header-left";

      const tag = document.createElement("span");
      tag.className = "mat-tag";
      tag.textContent = item.name;

      const dim = document.createElement("span");
      dim.className = "mat-dim";
      dim.textContent = `${item.rows}×${item.cols}`;

      headerLeft.appendChild(sw);
      headerLeft.appendChild(tag);
      headerLeft.appendChild(dim);

      // Nếu là ma trận tham số, hiển thị huy hiệu f(t) hoặc f(u,v)
      if (item.isParametric) {
        const badge = document.createElement("span");
        badge.className = "mat-param-badge";
        const vText = item.vars && item.vars.length > 1 ? item.vars.join(",") : (item.paramVar || "t");
        badge.textContent = `f(${vText})`;
        badge.title = `Ma trận phụ thuộc tham số ${item.vars ? item.vars.join(", ") : item.paramVar}`;
        headerLeft.appendChild(badge);
      }

      // Actions
      const actions = document.createElement("div");
      actions.className = "mat-actions";

      // Edit button
      const editBtn = document.createElement("button");
      editBtn.className = "btn mat-btn-del mat-btn-edit";
      editBtn.innerHTML = '<i class="ph ph-pen"></i>';
      editBtn.title = "Sửa ma trận";
      editBtn.style.color = "var(--primary-base)";
      editBtn.onmouseenter = () => (editBtn.style.background = "rgba(33, 150, 243, 0.1)");
      editBtn.onmouseleave = () => (editBtn.style.background = "transparent");
      editBtn.onclick = (e) => {
        e.stopPropagation();
        App.startEditMatrix(item.id);
      };

      // Delete button
      const delBtn = document.createElement("button");
      delBtn.className = "btn mat-btn-del";
      delBtn.innerHTML = '<i class="ph ph-trash"></i>';
      delBtn.title = "Xóa ma trận";
      delBtn.onclick = (e) => {
        e.stopPropagation();
        if (App.editingMatrixId === item.id) {
          App.editingMatrixId = null;
          const btn = document.getElementById("btnAddMatrix");
          if (btn) {
            btn.innerHTML = '<i class="ph ph-plus" style="margin-right:6px;"></i> Thêm Ma Trận';
            btn.classList.remove("success");
            btn.classList.add("primary");
          }
        }

        li.style.transition = "all 0.25s ease";
        li.style.opacity = "0";
        li.style.transform = "translateX(30px)";
        setTimeout(() => App.deleteMatrix(item.id), 250);
      };

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      headerRow.appendChild(headerLeft);
      headerRow.appendChild(actions);

      // Mini preview: grid hiển thị trọn vẹn 100% chiều ngang thẻ
      const preview = document.createElement("div");
      preview.className = "mat-preview";
      preview.id = `matPreview_${item.id}`;
      preview.style.gridTemplateColumns = `repeat(${item.cols}, 1fr)`;

      for (let i = 0; i < item.rows; i++) {
        for (let j = 0; j < item.cols; j++) {
          const val = item.values[i][j];
          const rawCell =
            item.latexValues && item.latexValues[i] && item.latexValues[i][j] !== undefined
              ? item.latexValues[i][j]
              : fmtCell(val);

          const isMathExpr = /[a-zA-Z\\[\\^\\_\\{\\}]/.test(rawCell);
          if (!isMathExpr) {
            const cell = document.createElement("div");
            cell.className = "mat-cell";
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.textContent = rawCell;
            cell.title = rawCell;
            preview.appendChild(cell);
          } else {
            const cell = document.createElement("math-field");
            cell.className = "matrix-cell";
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.readOnly = true;
            cell.setAttribute("readonly", "");
            cell.style.cssText =
              "pointer-events: none; user-select: none; padding: 2px 4px !important; padding-right: 4px !important; height: 26px; min-height: 26px; display: flex; align-items: center; justify-content: center; border-radius: 2px; min-width: 0; box-sizing: border-box;";
            cell.value = rawCell;
            cell.title = rawCell;
            preview.appendChild(cell);
          }
        }
      }

      li.appendChild(headerRow);
      li.appendChild(preview);

      if (item.isParametric && typeof App.createMatrixParamController === "function") {
        const pCtrl = App.createMatrixParamController(item, () => {
          for (let i = 0; i < item.rows; i++) {
            for (let j = 0; j < item.cols; j++) {
              const cellEl = preview.querySelector(`[data-row="${i}"][data-col="${j}"]`);
              if (cellEl) {
                const rawCell = item.latexValues && item.latexValues[i] && item.latexValues[i][j] !== undefined
                  ? item.latexValues[i][j]
                  : fmtCell(item.values[i][j]);
                if (cellEl.tagName.toLowerCase() === "math-field") {
                  cellEl.value = rawCell;
                } else {
                  cellEl.textContent = rawCell;
                }
              }
            }
          }
        });
        if (pCtrl) li.appendChild(pCtrl);
      }

      el.appendChild(li);
    }

    if (typeof App.refreshMatrixDropdowns === "function") {
      App.refreshMatrixDropdowns();
    }
    if (typeof App.updateObjectCountBadges === "function") {
      App.updateObjectCountBadges();
    }
  };

  // Xuất khẩu các hàm cốt lõi phục vụ tính toán ma trận tham số
  App.readGridValues = readGridValues;
  App.createMatrixItem = createMatrixItem;

})();
