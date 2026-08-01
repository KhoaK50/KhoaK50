// ===================== js/app/logic/matrix_controller.js =====================
// Quản lý tạo, xóa, hiển thị ma trận — kế thừa pattern từ vector_controller.js
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
    for (let i = 0; i < rows; i++) {
      const rowVal = [];
      const rowLat = [];
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
          const parsed = App.parseVectorExpr(`[${raw}]`);
          if (!parsed || parsed.length === 0 || isNaN(Number(parsed[0]))) {
              return null; // Không hợp lệ
          }
          rowVal.push(parsed[0]);
          rowLat.push(raw);
        } catch (err) {
          return null;
        }
      }
      values.push(rowVal);
      latexValues.push(rowLat);
    }
    return { values, latexValues };
  }

  // =========================================================================
  // 3. TẠO OBJECT MA TRẬN
  // =========================================================================
  function createMatrixItem(rows, cols, values, latexValues, hue) {
    const id = App.nextMatrixId++;
    return {
      id: id,
      name: `M${id}`,
      rows: rows,
      cols: cols,
      values: values,
      latexValues: latexValues,
      colorHex: typeof App.hslToHex === "function"
        ? App.hslToHex(hue / 360, 0.7, 0.55)
        : `hsl(${hue}, 70%, 55%)`,
      colorCss: `hsl(${hue}, 70%, 55%)`,
    };
  }

  // =========================================================================
  // 4. CRUD: THÊM MA TRẬN
  // =========================================================================
  App.onAddMatrix = function () {
    const rowsInput = document.getElementById("matrixCreateRows");
    const colsInput = document.getElementById("matrixCreateCols");
    if (!rowsInput || !colsInput) return;

    const rows = Math.max(2, Math.min(5, parseInt(rowsInput.value) || 3));
    const cols = Math.max(2, Math.min(5, parseInt(colsInput.value) || 3));

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
      const targetIdx = App.matrixList.findIndex(m => m.id === App.editingMatrixId);
      if (targetIdx !== -1) {
        const item = App.matrixList[targetIdx];
        item.rows = rows;
        item.cols = cols;
        item.values = values;
        item.latexValues = latexValues;
      }
      
      App.editingMatrixId = null;
      
      // Đổi lại UI nút Thêm
      const btn = document.getElementById("btnAddMatrix");
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-plus" style="margin-right:6px;"></i> Thêm Ma Trận';
        btn.classList.remove("success");
        btn.classList.add("primary");
      }
    } else {
      // Chế độ Thêm mới
      const hue = App._pickMatrixHue();
      const item = createMatrixItem(rows, cols, values, latexValues, hue);
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
      btn.innerHTML = '<i class="fa-solid fa-check" style="margin-right:6px;"></i> Lưu Ma Trận';
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
    const idx = App.matrixList.findIndex(m => m.id === id);
    if (idx < 0) return;
    const name = App.matrixList[idx].name;
    App.matrixList.splice(idx, 1);
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
    App.matrixList.length = 0;
    App.nextMatrixId = 1;
    App.renderMatrixList();
  };

  // =========================================================================
  // 7. RENDER DANH SÁCH MA TRẬN
  // =========================================================================
  App.renderMatrixList = function () {
    const el = document.getElementById("matrixList");
    if (!el) return;

    el.innerHTML = "";

    // Trạng thái trống
    if (App.matrixList.length === 0) {
      const empty = document.createElement("div");
      empty.className = "mat-empty";
      empty.innerHTML = `
        <i class="fa-regular fa-square-plus" style="font-size:28px; opacity:0.3; margin-bottom:8px;"></i>
        <span>Chưa có ma trận nào</span>
      `;
      el.appendChild(empty);
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

      // Main content
      const main = document.createElement("div");
      main.className = "mat-main";

      // Header row: name + dimension badge
      const header = document.createElement("div");
      header.className = "mat-header";

      const tag = document.createElement("span");
      tag.className = "mat-tag";
      tag.textContent = item.name;

      const dim = document.createElement("span");
      dim.className = "mat-dim";
      dim.textContent = `${item.rows}×${item.cols}`;

      header.appendChild(tag);
      header.appendChild(dim);

      // Mini preview: grid nhỏ hiển thị giá trị
      const preview = document.createElement("div");
      preview.className = "mat-preview";
      preview.style.gridTemplateColumns = `repeat(${item.cols}, 1fr)`;

      for (let i = 0; i < item.rows; i++) {
        for (let j = 0; j < item.cols; j++) {
          const val = item.values[i][j];
          const lat = (item.latexValues && item.latexValues[i] && item.latexValues[i][j]) 
                      ? item.latexValues[i][j] 
                      : fmtCell(val);

          // Render bằng math-field để hiển thị đúng chuẩn LaTeX
          const cell = document.createElement("math-field");
          cell.className = "matrix-cell";
          cell.readOnly = true;
          cell.setAttribute("readonly", "");
          cell.style.cssText = "pointer-events: none; user-select: none;";
          cell.value = lat;
          
          preview.appendChild(cell);
        }
      }

      const actions = document.createElement("div");
      actions.className = "mat-actions";

      // Edit button
      const editBtn = document.createElement("button");
      editBtn.className = "btn mat-btn-del mat-btn-edit";
      editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
      editBtn.title = "Sửa ma trận";
      editBtn.style.color = "var(--primary-base)";
      editBtn.onmouseenter = () => editBtn.style.background = "rgba(33, 150, 243, 0.1)";
      editBtn.onmouseleave = () => editBtn.style.background = "transparent";
      editBtn.onclick = (e) => {
        e.stopPropagation();
        App.startEditMatrix(item.id);
      };

      // Delete button
      const delBtn = document.createElement("button");
      delBtn.className = "btn mat-btn-del";
      delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
      delBtn.title = "Xóa ma trận";
      delBtn.onclick = (e) => {
        e.stopPropagation();
        // Xóa khỏi mode edit nếu đang sửa matrix này
        if (App.editingMatrixId === item.id) {
          App.editingMatrixId = null;
          const btn = document.getElementById("btnAddMatrix");
          if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-plus" style="margin-right:6px;"></i> Thêm Ma Trận';
            btn.classList.remove("success");
            btn.classList.add("primary");
          }
        }

        // Hiệu ứng slide-out rồi xóa
        li.style.transition = "all 0.25s ease";
        li.style.opacity = "0";
        li.style.transform = "translateX(30px)";
        setTimeout(() => App.deleteMatrix(item.id), 250);
      };

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      main.appendChild(header);
      main.appendChild(preview);

      li.appendChild(sw);
      li.appendChild(main);
      li.appendChild(actions);

      el.appendChild(li);
    }
  };

})();
