// ===================== js/app/logic/param_master_controller.js =====================
/**
 * MASTER PARAMETER CONTROLLER & SYNCHRONIZATION ENGINE
 * Điều phối hoạt ảnh tham số hợp nhất cho Vector và Ma trận trong Vectoria.
 * 
 * Hỗ trợ 3 chế độ đồng bộ toán học:
 * 1. 'offset': (Độc lập / Giữ vị trí) Mỗi tham số giữ nguyên giá trị hiện tại và cùng chạy độc lập
 * 2. 'lockstep': (Cùng giá trị / Đồng bộ tiến độ) Tất cả tham số tăng giảm nhịp nhàng theo chu kỳ s in [0, 1]
 * 3. 'link_names': (Khóa biến trùng tên) Các biến có cùng ký tự (như t, m) chia sẻ một giá trị duy nhất
 */

(function () {
  window.App = window.App || {};

  const MasterParamController = {
    isPlaying: false,
    syncMode: "offset", // "offset" | "lockstep" | "link_names"
    lockstepProgress: 0.0,
    lockstepDir: 1,
    lockstepDuration: 4.0, // Chu kỳ 4 giây
    sharedScope: { t: 1.0, m: 1.0, u: 1.0, v: 1.0, x: 2.0, y: 1.0, z: 1.0 },
    _isSyncing: false,
    _animFrameId: null,
    _lastTimestamp: null,

    // Khởi tạo và gắn sự kiện DOM
    init: function () {
      const playBtn = document.getElementById("btnMasterParamPlay");
      if (playBtn) {
        playBtn.onclick = (e) => {
          e.preventDefault();
          this.togglePlayAll();
        };
      }

      const resetBtn = document.getElementById("btnMasterParamReset");
      if (resetBtn) {
        resetBtn.onclick = (e) => {
          e.preventDefault();
          this.resetAll();
        };
      }

      const chipsWrap = document.getElementById("masterModeChips");
      if (chipsWrap) {
        chipsWrap.querySelectorAll(".master-mode-chip").forEach((chip) => {
          chip.onclick = (e) => {
            e.preventDefault();
            const mode = chip.dataset.mode;
            if (mode) this.setSyncMode(mode);
          };
        });
      }

      this.updateUI();
    },

    // Kiểm tra xem có vector hoặc ma trận tham số nào đang tồn tại không
    hasParametricItems: function () {
      const hasVec = Array.isArray(App.vectorList) && App.vectorList.some((v) => v && v.isParametric);
      const hasMat = Array.isArray(App.matrixList) && App.matrixList.some((m) => m && m.isParametric);
      return hasVec || hasMat;
    },

    // Lấy danh sách toàn bộ các đối tượng tham số
    getAllParametricItems: function () {
      const vectors = (App.vectorList || []).filter((v) => v && v.isParametric);
      const matrices = (App.matrixList || []).filter((m) => m && m.isParametric);
      return { vectors, matrices, total: vectors.length + matrices.length };
    },

    // Bật hoạt ảnh đồng loạt cho tất cả tham số
    playAll: function () {
      const { vectors, matrices, total } = this.getAllParametricItems();
      if (total === 0) return;

      this.isPlaying = true;

      // Khi ở chế độ lockstep: khởi tạo pha nếu chưa có
      if (this.syncMode === "lockstep") {
        if (typeof this.lockstepProgress !== "number" || isNaN(this.lockstepProgress)) {
          this.lockstepProgress = 0.0;
          this.lockstepDir = 1;
        }
      }

      // Khi ở chế độ link_names: đồng bộ giá trị các biến cùng tên trước khi chạy
      if (this.syncMode === "link_names") {
        this.syncSharedVariables();
      }

      // Bật cờ isAnimating cho toàn bộ vector
      vectors.forEach((v) => {
        v.isAnimating = true;
        if (typeof App.updateSingleVectorParamUI === "function") {
          App.updateSingleVectorParamUI(v, false);
        }
      });

      // Bật cờ isAnimating cho toàn bộ ma trận
      matrices.forEach((m) => {
        m.isAnimating = true;
        if (typeof App.updateSingleMatrixUI === "function") {
          App.updateSingleMatrixUI(m);
        }
      });

      // Kích hoạt vòng lặp hoạt ảnh theo chế độ
      if (this.syncMode !== "offset") {
        this.startMasterLoop();
      } else {
        if (typeof App.startParamAnimationLoop === "function") {
          App.startParamAnimationLoop();
        }
        if (typeof App.startMatrixParamAnimationLoop === "function") {
          App.startMatrixParamAnimationLoop();
        }
      }

      this.updateUI();
    },

    // Tạm dừng hoạt ảnh tất cả tham số
    pauseAll: function () {
      this.isPlaying = false;
      const { vectors, matrices } = this.getAllParametricItems();

      vectors.forEach((v) => {
        v.isAnimating = false;
        if (typeof App.updateSingleVectorParamUI === "function") {
          App.updateSingleVectorParamUI(v, false);
        }
      });

      matrices.forEach((m) => {
        m.isAnimating = false;
        if (typeof App.updateSingleMatrixUI === "function") {
          App.updateSingleMatrixUI(m);
        }
      });

      if (this._animFrameId) {
        cancelAnimationFrame(this._animFrameId);
        this._animFrameId = null;
        this._lastTimestamp = null;
      }
      if (App._paramAnimFrameId) {
        cancelAnimationFrame(App._paramAnimFrameId);
        App._paramAnimFrameId = null;
        App._lastAnimTimestamp = null;
      }
      if (App._matrixParamAnimFrameId) {
        cancelAnimationFrame(App._matrixParamAnimFrameId);
        App._matrixParamAnimFrameId = null;
        App._lastMatrixAnimTimestamp = null;
      }

      this.updateUI();
    },

    // Đảo trạng thái Play / Pause
    togglePlayAll: function () {
      if (this.isPlaying) {
        this.pauseAll();
      } else {
        this.playAll();
      }
    },

    // Đặt lại toàn bộ tham số về giá trị ban đầu
    resetAll: function () {
      this.pauseAll();
      const { vectors, matrices } = this.getAllParametricItems();

      vectors.forEach((v) => {
        if (typeof App.resetVectorParam === "function") {
          App.resetVectorParam(v.id);
        } else {
          v.paramVal = v.initialParamVal !== undefined ? v.initialParamVal : 1.0;
        }
      });

      matrices.forEach((m) => {
        if (typeof App.resetMatrixParam === "function") {
          App.resetMatrixParam(m.id);
        } else {
          m.paramVal = m.initialParamVal !== undefined ? m.initialParamVal : 1.0;
        }
      });

      this.lockstepProgress = 0.0;
      this.lockstepDir = 1;

      // Vẽ lại Canvas
      if (typeof App._renderParamStep === "function") {
        App._renderParamStep();
      } else if (App.mode === "2D" && window.Vec2D && typeof window.Vec2D.draw2DAllVectors === "function") {
        window.Vec2D.draw2DAllVectors();
      } else if (App.mode === "3D" && window.Vec3D && typeof window.Vec3D.hardRefresh3D === "function") {
        window.Vec3D.hardRefresh3D(false);
      }

      this.updateUI();
    },

    // Đổi chế độ đồng bộ hoạt cảnh
    setSyncMode: function (mode) {
      if (mode !== "offset" && mode !== "lockstep" && mode !== "link_names") return;
      this.syncMode = mode;

      if (this.isPlaying) {
        if (mode === "offset") {
          if (this._animFrameId) {
            cancelAnimationFrame(this._animFrameId);
            this._animFrameId = null;
            this._lastTimestamp = null;
          }
          if (typeof App.startParamAnimationLoop === "function") App.startParamAnimationLoop();
          if (typeof App.startMatrixParamAnimationLoop === "function") App.startMatrixParamAnimationLoop();
        } else {
          if (App._paramAnimFrameId) {
            cancelAnimationFrame(App._paramAnimFrameId);
            App._paramAnimFrameId = null;
            App._lastAnimTimestamp = null;
          }
          if (App._matrixParamAnimFrameId) {
            cancelAnimationFrame(App._matrixParamAnimFrameId);
            App._matrixParamAnimFrameId = null;
            App._lastMatrixAnimTimestamp = null;
          }
          if (mode === "link_names") {
            this.syncSharedVariables();
          }
          this.startMasterLoop();
        }
      } else if (mode === "link_names") {
        this.syncSharedVariables();
      }

      // Cập nhật UI các chip bên ngoài nếu có
      const chipsWrap = document.getElementById("masterModeChips");
      if (chipsWrap) {
        chipsWrap.querySelectorAll(".master-mode-chip").forEach((chip) => {
          chip.classList.toggle("active", chip.dataset.mode === mode);
        });
      }

      // Cập nhật các chip và mô tả trong toàn bộ popover cài đặt đang mở
      document.querySelectorAll(".vec-pop-master-chip").forEach((chip) => {
        chip.classList.toggle("active", chip.dataset.mode === mode);
      });
      const descMap = {
        offset: "Độc lập: Giữ vị trí và dải chạy riêng của từng tham số",
        lockstep: "Đồng bộ: Toàn bộ tham số cùng co dãn nhịp nhàng theo chu kỳ [0, 1]",
        link_names: "Cùng tên: Các biến cùng ký hiệu (như t, m) sẽ nhận chung một giá trị"
      };
      document.querySelectorAll(".vec-pop-master-desc").forEach((el) => {
        el.textContent = descMap[mode] || "";
      });

      // Vẽ lại Canvas
      if (App.mode === "2D" && window.Vec2D && typeof window.Vec2D.draw2DAllVectors === "function") {
        window.Vec2D.draw2DAllVectors();
      } else if (App.mode === "3D" && window.Vec3D && typeof window.Vec3D.hardRefresh3D === "function") {
        window.Vec3D.hardRefresh3D(false);
      }

      this.updateUI();
    },

    // Đồng bộ các biến có cùng ký tự (Chế độ link_names)
    syncSharedVariables: function () {
      if (this._isSyncing) return;
      this._isSyncing = true;
      try {
        const { vectors, matrices } = this.getAllParametricItems();

        // Thu thập giá trị mốc cho từng tên biến
        const masterValues = Object.assign({}, this.sharedScope);

        // Quét vector để tìm giá trị hiện thời
        vectors.forEach((v) => {
          const varName = v.paramVar || (v.vars && v.vars[0]) || "t";
          if (v.scopeValues && v.scopeValues[varName] !== undefined) {
            masterValues[varName] = v.scopeValues[varName];
          } else if (v.paramVal !== undefined) {
            masterValues[varName] = v.paramVal;
          }
        });

        // Áp dụng giá trị mốc cho toàn bộ vector chứa biến tương ứng
        vectors.forEach((v) => {
          const vVars = v.vars && v.vars.length ? v.vars : [v.paramVar || "t"];
          vVars.forEach((vName) => {
            if (masterValues[vName] !== undefined) {
              if (!v.scopeValues) v.scopeValues = {};
              v.scopeValues[vName] = masterValues[vName];
              if (v.paramVar === vName) {
                v.paramVal = masterValues[vName];
              }
            }
          });
          if (typeof App.updateSingleVectorParamUI === "function") {
            App.updateSingleVectorParamUI(v, v.isAnimating);
          }
        });

        // Áp dụng giá trị mốc cho toàn bộ ma trận chứa biến tương ứng
        matrices.forEach((m) => {
          const mVars = m.vars && m.vars.length ? m.vars : [m.paramVar || "t"];
          mVars.forEach((vName) => {
            if (masterValues[vName] !== undefined) {
              if (!m.scopeValues) m.scopeValues = {};
              m.scopeValues[vName] = masterValues[vName];
              if (m.paramVar === vName) {
                m.paramVal = masterValues[vName];
              }
            }
          });
          if (typeof m.evalMatrix === "function") {
            m.values = m.evalMatrix(m.paramVal, m.scopeValues);
          }
          if (typeof App.updateSingleMatrixUI === "function") {
            App.updateSingleMatrixUI(m);
          }
        });

        this.sharedScope = masterValues;
      } finally {
        this._isSyncing = false;
      }
    },

    // Phát tán giá trị tham số khi một slider bất kỳ bị kéo trong chế độ link_names
    broadcastParamValue: function (varName, val, sourceType, sourceId) {
      if (this.syncMode !== "link_names" || this._isSyncing) return;
      this._isSyncing = true;

      try {
        const num = parseFloat(val);
        if (isNaN(num)) return;
        this.sharedScope[varName] = num;

        const { vectors, matrices } = this.getAllParametricItems();

        vectors.forEach((v) => {
          if (sourceType === "vector" && String(v.id) === String(sourceId)) return;
          const vVars = v.vars && v.vars.length ? v.vars : [v.paramVar || "t"];
          if (vVars.includes(varName)) {
            if (!v.scopeValues) v.scopeValues = {};
            v.scopeValues[varName] = num;
            if (v.paramVar === varName) {
              v.paramVal = num;
            }
            if (typeof v.fn === "function") {
              const nextVec = v.fn.call(v, v.paramVal, v.scopeValues);
              if (Array.isArray(nextVec) && nextVec.every((c) => isFinite(c))) {
                v.vec = nextVec;
              }
            }
            if (typeof App.updateSingleVectorParamUI === "function") {
              App.updateSingleVectorParamUI(v, v.isAnimating);
            }
          }
        });

        matrices.forEach((m) => {
          if (sourceType === "matrix" && String(m.id) === String(sourceId)) return;
          const mVars = m.vars && m.vars.length ? m.vars : [m.paramVar || "t"];
          if (mVars.includes(varName)) {
            if (!m.scopeValues) m.scopeValues = {};
            m.scopeValues[varName] = num;
            if (m.paramVar === varName) {
              m.paramVal = num;
            }
            if (typeof m.evalMatrix === "function") {
              m.values = m.evalMatrix(m.paramVal, m.scopeValues);
            }
            if (typeof App.updateSingleMatrixUI === "function") {
              App.updateSingleMatrixUI(m);
            }
          }
        });

        if (typeof App._renderParamStep === "function") {
          App._renderParamStep();
        } else if (App.mode === "2D" && window.Vec2D && typeof window.Vec2D.draw2DAllVectors === "function") {
          window.Vec2D.draw2DAllVectors();
        } else if (App.mode === "3D" && window.Vec3D && typeof window.Vec3D.hardRefresh3D === "function") {
          window.Vec3D.hardRefresh3D(false);
        }
      } finally {
        this._isSyncing = false;
      }
    },

    // Vòng lặp RAF tổng điều phối hoạt ảnh Lockstep và Link Names
    startMasterLoop: function () {
      if (this._animFrameId) return;
      this._lastTimestamp = performance.now();

      const loop = (now) => {
        if (!this.isPlaying) {
          this._animFrameId = null;
          this._lastTimestamp = null;
          return;
        }

        const dt = Math.min(0.08, (now - (this._lastTimestamp || now)) / 1000);
        this._lastTimestamp = now;

        const { vectors, matrices } = this.getAllParametricItems();

        if (this.syncMode === "lockstep") {
          // Cập nhật tiến độ chuẩn hóa s in [0, 1]
          this.lockstepProgress += this.lockstepDir * (dt / this.lockstepDuration);
          if (this.lockstepProgress >= 1.0) {
            this.lockstepProgress = 1.0;
            this.lockstepDir = -1;
          } else if (this.lockstepProgress <= 0.0) {
            this.lockstepProgress = 0.0;
            this.lockstepDir = 1;
          }

          // Cập nhật toàn bộ vector theo s (bao gồm toàn bộ các biến trong vector)
          vectors.forEach((v) => {
            const varsToAnim = (Array.isArray(v.activeAnimVars) && v.activeAnimVars.length > 0)
              ? v.activeAnimVars
              : (v.vars && v.vars.length ? v.vars : [v.paramVar || "t"]);

            if (!v.scopeValues) v.scopeValues = {};

            varsToAnim.forEach((vName) => {
              const rObj = (v.varRanges && v.varRanges[vName]) || {
                min: v.paramInfinity ? -25 : (v.paramMin ?? -10.0),
                max: v.paramInfinity ? 25 : (v.paramMax ?? 10.0)
              };
              let vMin = Number(rObj.min);
              let vMax = Number(rObj.max);
              if (isNaN(vMin)) vMin = -10.0;
              if (isNaN(vMax)) vMax = 10.0;
              if (vMax <= vMin) vMax = vMin + 1.0;

              const val = vMin + this.lockstepProgress * (vMax - vMin);
              v.scopeValues[vName] = val;
              if (vName === v.paramVar) {
                v.paramVal = val;
              }
            });

            // Tính lại tọa độ v.vec và gán để vector và đường gióng di chuyển trên Canvas!
            if (typeof v.fn === "function") {
              const nextVec = v.fn.call(v, v.paramVal, v.scopeValues);
              if (Array.isArray(nextVec) && nextVec.every((c) => isFinite(c))) {
                v.vec = nextVec;
              }
            }

            if (typeof App.updateSingleVectorParamUI === "function") {
              App.updateSingleVectorParamUI(v, true);
            }
          });

          // Cập nhật toàn bộ ma trận theo s (bao gồm toàn bộ các biến trong ma trận)
          matrices.forEach((m) => {
            const varsToAnim = (Array.isArray(m.activeAnimVars) && m.activeAnimVars.length > 0)
              ? m.activeAnimVars
              : (m.vars && m.vars.length ? m.vars : [m.paramVar || "t"]);

            if (!m.scopeValues) m.scopeValues = {};

            varsToAnim.forEach((vName) => {
              const rObj = (m.varRanges && m.varRanges[vName]) || {
                min: m.paramInfinity ? -25 : (m.paramMin ?? -10.0),
                max: m.paramInfinity ? 25 : (m.paramMax ?? 10.0)
              };
              let vMin = Number(rObj.min);
              let vMax = Number(rObj.max);
              if (isNaN(vMin)) vMin = -10.0;
              if (isNaN(vMax)) vMax = 10.0;
              if (vMax <= vMin) vMax = vMin + 1.0;

              const val = vMin + this.lockstepProgress * (vMax - vMin);
              m.scopeValues[vName] = val;
              if (vName === m.paramVar) {
                m.paramVal = val;
              }
            });

            if (typeof m.evalMatrix === "function") {
              m.values = m.evalMatrix(m.paramVal, m.scopeValues);
            }

            if (typeof App.updateSingleMatrixUI === "function") {
              App.updateSingleMatrixUI(m);
            }
          });

          if (typeof App._renderParamStep === "function") {
            App._renderParamStep();
          } else if (App.mode === "2D" && window.Vec2D && typeof window.Vec2D.draw2DAllVectors === "function") {
            window.Vec2D.draw2DAllVectors();
          } else if (App.mode === "3D" && window.Vec3D && typeof window.Vec3D.renderOnce === "function") {
            window.Vec3D.renderOnce();
          }
        } else if (this.syncMode === "link_names") {
          // Cập nhật các biến độc lập và phát tán
          const speed = 20.0 / 4.0; // Đi 20 đơn vị trong 4s
          Object.keys(this.sharedScope).forEach((vName) => {
            let cur = this.sharedScope[vName] ?? 1.0;
            cur += dt * speed;
            if (cur > 10.0) cur = -10.0;
            this.sharedScope[vName] = cur;
          });

          vectors.forEach((v) => {
            const vVars = v.vars && v.vars.length ? v.vars : [v.paramVar || "t"];
            vVars.forEach((vName) => {
              if (!v.scopeValues) v.scopeValues = {};
              v.scopeValues[vName] = this.sharedScope[vName] ?? 1.0;
              if (v.paramVar === vName) {
                v.paramVal = v.scopeValues[vName];
              }
            });
            if (typeof v.fn === "function") {
              const nextVec = v.fn.call(v, v.paramVal, v.scopeValues);
              if (Array.isArray(nextVec) && nextVec.every((c) => isFinite(c))) {
                v.vec = nextVec;
              }
            }
            if (typeof App.updateSingleVectorParamUI === "function") {
              App.updateSingleVectorParamUI(v, true);
            }
          });

          matrices.forEach((m) => {
            const mVars = m.vars && m.vars.length ? m.vars : [m.paramVar || "t"];
            mVars.forEach((vName) => {
              if (!m.scopeValues) m.scopeValues = {};
              m.scopeValues[vName] = this.sharedScope[vName] ?? 1.0;
              if (m.paramVar === vName) {
                m.paramVal = m.scopeValues[vName];
              }
            });
            if (typeof m.evalMatrix === "function") {
              m.values = m.evalMatrix(m.paramVal, m.scopeValues);
            }
            if (typeof App.updateSingleMatrixUI === "function") {
              App.updateSingleMatrixUI(m);
            }
          });

          if (typeof App._renderParamStep === "function") {
            App._renderParamStep();
          } else if (App.mode === "2D" && window.Vec2D && typeof window.Vec2D.draw2DAllVectors === "function") {
            window.Vec2D.draw2DAllVectors();
          } else if (App.mode === "3D" && window.Vec3D && typeof window.Vec3D.renderOnce === "function") {
            window.Vec3D.renderOnce();
          }
        }

        this._animFrameId = requestAnimationFrame(loop);
      };

      this._animFrameId = requestAnimationFrame(loop);
    },

    // Cập nhật hiển thị thanh Master Parameter Bar trên giao diện
    updateUI: function () {
      const bar = document.getElementById("masterParamBar");
      if (bar) {
        bar.style.display = "none";
      }

      const hasParams = this.hasParametricItems();
      const { vectors, matrices } = this.getAllParametricItems();
      const anyAnimating = vectors.some((v) => v.isAnimating) || matrices.some((m) => m.isAnimating);
      this.isPlaying = anyAnimating;

      // Nút Play/Pause tổng nếu có trong DOM
      const playBtn = document.getElementById("btnMasterParamPlay");
      if (playBtn) {
        playBtn.classList.toggle("is-active", this.isPlaying);
        playBtn.innerHTML = this.isPlaying
          ? '<i class="ph ph-pause"></i> <span id="txtMasterParamPlay">Tạm dừng</span>'
          : '<i class="ph ph-play"></i> <span id="txtMasterParamPlay">Chạy tất cả</span>';
      }

      // Cập nhật trạng thái active của các chip chế độ ngoài
      const chipsWrap = document.getElementById("masterModeChips");
      if (chipsWrap) {
        chipsWrap.querySelectorAll(".master-mode-chip").forEach((chip) => {
          chip.classList.toggle("active", chip.dataset.mode === this.syncMode);
        });
      }

      // Cập nhật đồng bộ các nút và chip trong toàn bộ popover cài đặt vector đang mở
      document.querySelectorAll(".vec-pop-master-play").forEach((btn) => {
        btn.classList.toggle("is-active", this.isPlaying);
        btn.innerHTML = this.isPlaying
          ? '<i class="ph ph-pause"></i> <span>Tạm dừng tất cả</span>'
          : '<i class="ph ph-play"></i> <span>Chạy tất cả</span>';
      });

      document.querySelectorAll(".vec-pop-master-chip").forEach((chip) => {
        chip.classList.toggle("active", chip.dataset.mode === this.syncMode);
      });

      const descMap = {
        offset: "Độc lập: Giữ vị trí và dải chạy riêng của từng tham số",
        lockstep: "Đồng bộ: Toàn bộ tham số cùng co dãn nhịp nhàng theo chu kỳ [0, 1]",
        link_names: "Cùng tên: Các biến cùng ký hiệu (như t, m) sẽ nhận chung một giá trị"
      };
      document.querySelectorAll(".vec-pop-master-desc").forEach((el) => {
        el.textContent = descMap[this.syncMode] || "";
      });
    }
  };

  window.App.MasterParamController = MasterParamController;

  // Tự động khởi chạy khi DOM sẵn sàng
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      MasterParamController.init();
    });
  } else {
    MasterParamController.init();
  }
})();
