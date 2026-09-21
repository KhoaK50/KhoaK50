/**
 * VECTORIA - HISTORY MANAGER (UNDO / REDO)
 * Quản lý lịch sử trạng thái đối tượng toán học (Vector & Ma trận),
 * cung cấp khả năng Hoàn tác (Ctrl+Z) và Làm lại (Ctrl+Y / Ctrl+Shift+Z),
 * bảo vệ dữ liệu vector gốc khi người dùng tương tác trực quan trên đồ thị.
 */
(function () {
  window.App = window.App || {};

  const MAX_HISTORY_DEPTH = 50;
  const undoStack = [];
  const redoStack = [];
  let isExecuting = false;

  // Hàm sao chép sâu danh sách vector
  function cloneVectorList(list) {
    if (!Array.isArray(list)) return [];
    return list.map((v) => ({
      id: v.id,
      name: v.name,
      vec: Array.isArray(v.vec) ? v.vec.slice() : [0, 0],
      visible: v.visible !== false,
      focus: !!v.focus,
      colorHex: v.colorHex,
      colorCss: v.colorCss,
      haloCss: v.haloCss,
      alpha: typeof v.alpha === "number" ? v.alpha : 1,
      latex: v.latex || "",
      hue: v.hue,
      subspaceIdx: v.subspaceIdx,
      tag: v.tag,
    }));
  }

  // Hàm sao chép sâu danh sách ma trận
  function cloneMatrixList(list) {
    if (!Array.isArray(list)) return [];
    return list.map((m) => ({
      id: m.id,
      name: m.name,
      rows: m.rows,
      cols: m.cols,
      values: Array.isArray(m.values)
        ? m.values.map((r) => (Array.isArray(r) ? r.slice() : r))
        : [],
      colorHex: m.colorHex,
      colorCss: m.colorCss,
    }));
  }

  // Trích xuất snapshot trạng thái hiện tại
  function captureCurrentState(description = "Thao tác") {
    return {
      vectors: cloneVectorList(App.vectorList),
      matrices: cloneMatrixList(App.matrixList),
      nextVectorId:
        typeof nextVectorId !== "undefined"
          ? nextVectorId
          : App.nextId || (App.vectorList ? App.vectorList.length + 1 : 1),
      description: description,
      timestamp: Date.now(),
    };
  }

  // Áp dụng trạng thái snapshot lên ứng dụng
  function applyState(state) {
    if (!state) return;
    isExecuting = true;

    try {
      // 1. Phục hồi Vector List
      App.vectorList = cloneVectorList(state.vectors);

      // Đồng bộ lại usedHues
      if (App.usedHues && App.usedHues.clear) {
        App.usedHues.clear();
        App.vectorList.forEach((v) => {
          if (typeof v.hue === "number") App.usedHues.add(v.hue);
        });
      }

      // Phục hồi ID đếm tiếp theo nếu biến toàn cục tồn tại
      if (typeof state.nextVectorId !== "undefined") {
        if (typeof nextVectorId !== "undefined") {
          nextVectorId = state.nextVectorId;
        }
        App.nextId = state.nextVectorId;
      }

      // 2. Phục hồi Matrix List
      if (Array.isArray(state.matrices)) {
        App.matrixList = cloneMatrixList(state.matrices);
      }

      // 3. Cập nhật giao diện toàn diện
      if (typeof App.renderVectorList === "function") {
        App.renderVectorList();
      }
      if (typeof App.renderMatrixList === "function") {
        App.renderMatrixList();
      }
      if (typeof App.refreshCalcVectorOptions === "function") {
        App.refreshCalcVectorOptions();
      }
      if (typeof App.renderExtraCalcOptions === "function") {
        App.renderExtraCalcOptions();
      }
      // Xóa tàn dư hình chiếu, góc, bóng ma và nút replay khi Undo/Redo
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
      if (typeof App.clearAngleOverlay === "function") {
        App.clearAngleOverlay();
      }
      if (typeof App.refreshProjectionOverlay === "function") {
        App.refreshProjectionOverlay();
      }

      const btnReplay = document.getElementById("btnVectorReplay");
      if (btnReplay) btnReplay.style.display = "none";
      App._lastVectorOp = null;

      const v1 = document.getElementById("v1Select");
      const v2 = document.getElementById("v2Select");
      if (v1) { v1.value = ""; v1.selectedIndex = 0; }
      if (v2) { v2.value = ""; v2.selectedIndex = 0; }

      const s = document.getElementById("calcSteps");
      if (s) {
        s.innerHTML = "Kết quả phép tính sẽ hiển thị ở đây.";
        s.style.color = "";
      }
      if (typeof App.updateVisibilityByCalc === "function") {
        App.updateVisibilityByCalc();
      }

      // 4. Vẽ lại Canvas 2D / 3D
      if (typeof App.redrawAll === "function") {
        App.redrawAll({ frame: true });
      }
      if (App.mode === "3D" && window.Vec3D && typeof Vec3D.hardRefresh3D === "function") {
        Vec3D.hardRefresh3D(false);
      } else if (window.Vec2D && typeof Vec2D.draw2DAllVectors === "function") {
        Vec2D.draw2DAllVectors();
      }
    } catch (err) {
      console.error("[HistoryManager] Lỗi khi phục hồi trạng thái:", err);
    } finally {
      isExecuting = false;
      App.History.updateUI();
    }
  }

  App.History = {
    /**
     * Ghi nhận một hành động mới vào lịch sử
     * @param {string} description - Mô tả ngắn gọn (VD: "Thêm vector #1")
     * @param {Object} [customPreState] - Trạng thái trước khi thay đổi (nếu có)
     */
    record: function (description = "Thao tác", customPreState = null) {
      if (isExecuting) return;

      const stateToPush = customPreState || captureCurrentState(description);
      stateToPush.description = description;

      undoStack.push(stateToPush);
      if (undoStack.length > MAX_HISTORY_DEPTH) {
        undoStack.shift();
      }

      // Khi có hành động mới, xóa ngăn xếp Redo
      redoStack.length = 0;
      this.updateUI();
    },

    /**
     * Chụp một snapshot tại thời điểm hiện tại (thường dùng trước khi kéo chuột)
     */
    snapshot: function (description = "Trạng thái trước") {
      return captureCurrentState(description);
    },

    /**
     * Hoàn tác hành động gần nhất
     */
    undo: function () {
      if (undoStack.length === 0 || isExecuting) return;

      // Lưu trạng thái hiện tại vào Redo stack
      const currentState = captureCurrentState("Hiện tại");
      redoStack.push(currentState);
      if (redoStack.length > MAX_HISTORY_DEPTH) {
        redoStack.shift();
      }

      const previousState = undoStack.pop();
      applyState(previousState);
    },

    /**
     * Làm lại hành động vừa hoàn tác
     */
    redo: function () {
      if (redoStack.length === 0 || isExecuting) return;

      // Lưu trạng thái hiện tại vào Undo stack
      const currentState = captureCurrentState("Trước khi làm lại");
      undoStack.push(currentState);
      if (undoStack.length > MAX_HISTORY_DEPTH) {
        undoStack.shift();
      }

      const nextState = redoStack.pop();
      applyState(nextState);
    },

    canUndo: function () {
      return undoStack.length > 0;
    },

    canRedo: function () {
      return redoStack.length > 0;
    },

    clear: function () {
      undoStack.length = 0;
      redoStack.length = 0;
      this.updateUI();
    },

    /**
     * Đồng bộ hóa trạng thái enabled/disabled và tooltip của các nút HUD
     */
    updateUI: function () {
      const btnUndo = document.getElementById("btnUndo");
      const btnRedo = document.getElementById("btnRedo");

      const hasUndo = undoStack.length > 0;
      const hasRedo = redoStack.length > 0;

      if (btnUndo) {
        btnUndo.disabled = !hasUndo;
        if (hasUndo) {
          const lastDesc = undoStack[undoStack.length - 1].description;
          btnUndo.title = `Hoàn tác: ${lastDesc} (Ctrl+Z)`;
          btnUndo.style.opacity = "1";
          btnUndo.style.pointerEvents = "auto";
        } else {
          btnUndo.title = "Không có thao tác để hoàn tác (Ctrl+Z)";
          btnUndo.style.opacity = "0.35";
          btnUndo.style.pointerEvents = "none";
        }
      }

      if (btnRedo) {
        btnRedo.disabled = !hasRedo;
        if (hasRedo) {
          const nextDesc = redoStack[redoStack.length - 1].description;
          btnRedo.title = `Làm lại: ${nextDesc} (Ctrl+Y / Ctrl+Shift+Z)`;
          btnRedo.style.opacity = "1";
          btnRedo.style.pointerEvents = "auto";
        } else {
          btnRedo.title = "Không có thao tác để làm lại (Ctrl+Y)";
          btnRedo.style.opacity = "0.35";
          btnRedo.style.pointerEvents = "none";
        }
      }
    },

    /**
     * Khởi tạo lắng nghe phím tắt và sự kiện nút bấm
     */
    init: function () {
      const btnUndo = document.getElementById("btnUndo");
      const btnRedo = document.getElementById("btnRedo");

      if (btnUndo) {
        btnUndo.addEventListener("click", (e) => {
          e.preventDefault();
          this.undo();
        });
      }

      if (btnRedo) {
        btnRedo.addEventListener("click", (e) => {
          e.preventDefault();
          this.redo();
        });
      }

      // Lắng nghe phím tắt toàn cục: Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z (Cmd trên Mac)
      window.addEventListener(
        "keydown",
        (e) => {
          const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
          const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

          if (!ctrlOrCmd) return;

          // Kiểm tra xem người dùng có đang gõ văn bản bên trong thẻ input / textarea hay không
          const activeEl = document.activeElement;
          const isEditableInput =
            activeEl &&
            (activeEl.tagName === "INPUT" ||
              activeEl.tagName === "TEXTAREA" ||
              activeEl.isContentEditable);

          // Nếu đang focus trong math-field và người dùng đang gõ, để MathLive tự xử lý undo văn bản nội bộ
          if (activeEl && activeEl.tagName === "MATH-FIELD") {
            return;
          }

          if (isEditableInput) {
            return;
          }

          // Phím Hoàn tác: Ctrl + Z (không có Shift)
          if (e.key === "z" || e.key === "Z") {
            if (e.shiftKey) {
              // Ctrl + Shift + Z: Làm lại (Redo)
              e.preventDefault();
              this.redo();
            } else {
              // Ctrl + Z: Hoàn tác (Undo)
              e.preventDefault();
              this.undo();
            }
          } else if (e.key === "y" || e.key === "Y") {
            // Ctrl + Y: Làm lại (Redo)
            e.preventDefault();
            this.redo();
          }
        },
        false
      );

      this.updateUI();
    },
  };

  // Tự động khởi tạo khi DOM sẵn sàng
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => App.History.init());
  } else {
    App.History.init();
  }
})();
