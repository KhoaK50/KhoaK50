// ===================== js/app/playback/linear_transform.js =====================
/**
 * LINEAR TRANSFORMATION CONTROLLER & SIMULATION ENGINE
 * Mô phỏng biến đổi không gian tuyến tính theo ma trận A:
 * M(t) = (1 - t)I + tA,  t ∈ [0, 1]
 * Trực quan hóa:
 * - Lưới không gian Cartesian biến dạng (Grid Morphing)
 * - Cặp vector cơ sở î(t), ĵ(t) di chuyển về 2 cột của ma trận A
 * - Hình bình hành biểu diễn Định thức det(M(t)) (diện tích và định hướng không gian)
 * - Quỹ đạo vector mục tiêu v(t) = M(t) · v
 * - Thanh điều khiển Playback HUD (Play/Pause, Slider scrubber, Speed, Live Matrix & Det)
 */

(function () {
  window.App = window.App || {};

  const LinearTransform = {
    active: false,
    dim: 2, // 2 (2D) hoặc 3 (3D)
    matrix: [
      [1, 0],
      [0, 1],
    ], // Target matrix A
    originalVector: null, // Legacy single vector b (optional)
    targetVectors: [], // Danh sách các vector được chọn theo dõi [{ id, name, color, vec: [x, y, z] }]
    targetVectorIds: new Set(), // Set ID các vector được chọn
    t: 0, // Interpolation factor [0, 1]
    isPlaying: false,
    speed: 1.0, // 0.5x, 1x, 2x
    speedIndex: 1,
    speeds: [0.5, 1.0, 2.0],
    durationMs: 3000,
    lastTime: null,
    animId: null,
    layers: {
      showVolume: true,
      showBasis: true,
      showDecomp: true,
      showTraj: true,
    },

    isActive: function () {
      return !!this.active;
    },

    setLayers: function (opts) {
      if (!opts) return;
      if (typeof opts.showVolume === "boolean") this.layers.showVolume = opts.showVolume;
      if (typeof opts.showBasis === "boolean") this.layers.showBasis = opts.showBasis;
      if (typeof opts.showDecomp === "boolean") this.layers.showDecomp = opts.showDecomp;
      if (typeof opts.showTraj === "boolean") this.layers.showTraj = opts.showTraj;
      if (window.Vec3D && typeof window.Vec3D.setTransformLayers === "function") {
        window.Vec3D.setTransformLayers(this.layers);
      }
      if (this.dim === 2 && window.Vec2D && typeof window.Vec2D.draw2DAllVectors === "function") {
        window.Vec2D.draw2DAllVectors();
      }
    },

    toggleLayer: function (name) {
      if (this.layers.hasOwnProperty(name)) {
        this.layers[name] = !this.layers[name];
        this.setLayers(this.layers);
      }
    },

    // Thư viện mẫu biến đổi tuyến tính kinh điển
    presets: {
      identity: {
        name: "Đồng nhất (Identity)",
        matrix: [
          [1, 0],
          [0, 1],
        ],
        desc: "Không biến dạng không gian, det = 1",
      },
      rot90: {
        name: "Xoay 90° ngược chiều KĐH",
        matrix: [
          [0, -1],
          [1, 0],
        ],
        desc: "Xoay không gian 90°, det = 1",
      },
      rot45: {
        name: "Xoay 45°",
        matrix: [
          [0.7071, -0.7071],
          [0.7071, 0.7071],
        ],
        desc: "Xoay không gian 45°, det = 1",
      },
      rot180: {
        name: "Xoay 180° (Đảo trục)",
        matrix: [
          [-1, 0],
          [0, -1],
        ],
        desc: "Xoay 180°, det = 1",
      },
      scale2: {
        name: "Phóng đại 2× (Uniform Scale)",
        matrix: [
          [2, 0],
          [0, 2],
        ],
        desc: "Nhân đôi kích thước, diện tích tăng gấp 4 (det = 4)",
      },
      scaleX: {
        name: "Kéo dãn trục X (2×)",
        matrix: [
          [2, 0],
          [0, 1],
        ],
        desc: "Dãn ngang 2 lần, det = 2",
      },
      shearX: {
        name: "Biến dạng trượt ngang (Shear X)",
        matrix: [
          [1, 1],
          [0, 1],
        ],
        desc: "Trượt theo trục X, bảo toàn diện tích (det = 1)",
      },
      shearY: {
        name: "Biến dạng trượt dọc (Shear Y)",
        matrix: [
          [1, 0],
          [1, 1],
        ],
        desc: "Trượt theo trục Y, bảo toàn diện tích (det = 1)",
      },
      reflectX: {
        name: "Đối xứng qua trục Ox",
        matrix: [
          [1, 0],
          [0, -1],
        ],
        desc: "Lật không gian qua Ox, đảo hướng (det = -1)",
      },
      reflectDiag: {
        name: "Đối xứng qua đường chéo y = x",
        matrix: [
          [0, 1],
          [1, 0],
        ],
        desc: "Đổi vai trò x và y (det = -1)",
      },
      projectX: {
        name: "Hình chiếu lên Ox (Suy biến)",
        matrix: [
          [1, 0],
          [0, 0],
        ],
        desc: "Không gian 2D co thành đường thẳng 1D, det = 0",
      },
      projectY: {
        name: "Hình chiếu lên Oy (Suy biến)",
        matrix: [
          [0, 0],
          [0, 1],
        ],
        desc: "Không gian 2D co thành trục tung 1D, det = 0",
      },
    },

    // Kiểm tra trạng thái hoạt động
    isActive: function () {
      return this.active;
    },

    // Kiểm tra có danh sách vector theo dõi nào không
    hasTargetVectors: function () {
      return this.active && Array.isArray(this.targetVectors) && this.targetVectors.length > 0;
    },

    // Kiểm tra vector có được chọn theo dõi trong biến đổi không
    isVectorSelected: function (id) {
      if (!this.targetVectorIds) return false;
      return this.targetVectorIds.has(id) || this.targetVectorIds.has(String(id)) || this.targetVectorIds.has(Number(id));
    },

    // Kiểm tra đang lọc danh sách vector hay áp dụng toàn bộ
    isFilteringVectors: function () {
      return this.active && this.hasTargetVectors();
    },

    // Khởi động mô phỏng
    start: function (matrix, vectorInput = null, options = {}) {
      if (!Array.isArray(matrix) || matrix.length < 2 || matrix[0].length < 2) {
        if (window.App.showToast) {
          App.showToast("Ma trận không hợp lệ để mô phỏng biến đổi.", "error");
        }
        return;
      }

      const rows = matrix.length;
      const cols = matrix[0].length;
      const optMode = options && options.mode;

      if (optMode === "cross_compound_2d_3d_2d" || optMode === "cross_compound_3d_2d_3d") {
        this.dim = 3;
      } else if (rows === 3 && cols === 3) {
        this.dim = 3;
      } else if (rows === 2 && cols === 2) {
        this.dim = 2;
      } else if (rows === 3 && cols === 2) {
        this.dim = 3;
        if (!options.mode) options.mode = "embed_2d_to_3d";
      } else if (rows === 2 && cols === 3) {
        this.dim = 3;
        if (!options.mode) options.mode = "project_3d_to_2d";
      } else {
        if (window.App.showToast) {
          App.showToast("Chỉ hỗ trợ mô phỏng trực quan các ma trận trong không gian 2D và 3D.", "warning");
        }
        return;
      }

      this.mode = (options && options.mode) || "standard";
      this.customTitle = (options && options.title) || null;
      this.matrix1 = (options && options.matrix1) || null;
      this.matrix2 = (options && options.matrix2) || null;
      this.matrixA = (options && options.matrixA) || null;
      this.matrixB = (options && options.matrixB) || null;
      this.matrixC = (options && (options.matrixC || options.resultC)) || null;
      this.rank = (options && typeof options.rank === "number") ? options.rank : null;
      this.nullity = (options && typeof options.nullity === "number") ? options.nullity : null;
      this.originalMatrix = (options && options.originalMatrix) || null;
      this.invMatrix = (options && options.invMatrix) || null;
      this.transposeMatrix = (options && options.transposeMatrix) || null;

      if (this.mode === "det") {
        this.layers.showVolume = true;
      }

      if (this.dim === 3) {
        if (App.mode !== "3D" && typeof App.toggleMode === "function") {
          App.toggleMode();
        }
        if (rows === 3 && cols === 2) {
          this.matrix = [
            [Number(matrix[0][0]) || 0, Number(matrix[0][1]) || 0, 0],
            [Number(matrix[1][0]) || 0, Number(matrix[1][1]) || 0, 0],
            [Number(matrix[2][0]) || 0, Number(matrix[2][1]) || 0, 0],
          ];
        } else if (rows === 2 && cols === 3) {
          this.matrix = [
            [Number(matrix[0][0]) || 0, Number(matrix[0][1]) || 0, Number(matrix[0][2]) || 0],
            [Number(matrix[1][0]) || 0, Number(matrix[1][1]) || 0, Number(matrix[1][2]) || 0],
            [0, 0, 0],
          ];
        } else if (rows === 3 && cols === 3) {
          this.matrix = [
            [Number(matrix[0][0]) || 0, Number(matrix[0][1]) || 0, Number(matrix[0][2]) || 0],
            [Number(matrix[1][0]) || 0, Number(matrix[1][1]) || 0, Number(matrix[1][2]) || 0],
            [Number(matrix[2][0]) || 0, Number(matrix[2][1]) || 0, Number(matrix[2][2]) || 0],
          ];
        } else {
          this.matrix = [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
          ];
        }
      } else {
        if (App.mode !== "2D" && typeof App.toggleMode === "function") {
          App.toggleMode();
        }
        this.matrix = [
          [Number(matrix[0][0]) || 0, Number(matrix[0][1]) || 0],
          [Number(matrix[1][0]) || 0, Number(matrix[1][1]) || 0],
        ];
      }

      this.active = true;

      // Hỗ trợ mảng các đối tượng vector [{ id, name, color, vec: [x, y, z] }]
      this.targetVectors = [];
      if (Array.isArray(vectorInput) && vectorInput.length > 0) {
        if (typeof vectorInput[0] === "object" && vectorInput[0] !== null && "vec" in vectorInput[0]) {
          this.targetVectors = vectorInput.map((item) => {
            const raw = item.vec || [];
            const vCoords = this.dim === 3
              ? [Number(raw[0]) || 0, Number(raw[1]) || 0, Number(raw[2]) || 0]
              : [Number(raw[0]) || 0, Number(raw[1]) || 0];
            return {
              id: item.id,
              name: item.name || "v",
              color: item.color || item.colorCss || "#0090ff",
              vec: vCoords,
            };
          });
        } else if (typeof vectorInput[0] === "number") {
          const vCoords = this.dim === 3
            ? [Number(vectorInput[0]) || 0, Number(vectorInput[1]) || 0, Number(vectorInput[2]) || 0]
            : [Number(vectorInput[0]) || 0, Number(vectorInput[1]) || 0];
          this.targetVectors = [{
            id: "single",
            name: "v",
            color: "#0090ff",
            vec: vCoords,
          }];
        }
      }
      this.targetVectorIds = new Set(this.targetVectors.map((v) => v.id));
      this.originalVector = this.targetVectors.length > 0 ? this.targetVectors[0].vec : null;

      this.t = 0;
      this.isPlaying = true;
      this.lastTime = null;

      // Hiển thị khung điều khiển phát trực tiếp trong sidebar
      const playbackBox = document.getElementById("sidebarTransformPlayback");
      if (playbackBox) playbackBox.style.display = "block";

      const updateTransformBtns = (isRunning) => {
        const btns = [
          document.getElementById("btnStartTransform"),
          document.getElementById("btnMixedComputeAndTransform"),
          document.getElementById("btnMixedCompute"),
          document.getElementById("btnMatrixCompute")
        ];
        btns.forEach(b => {
          if (!b) return;
          if (isRunning) {
            b.innerHTML = `<i class="ph ph-stop" style="margin-right:6px;"></i> Dừng mô phỏng`;
            b.style.background = "var(--danger, #e5484d)";
            b.style.borderColor = "var(--danger, #e5484d)";
          } else {
            if (b.id === "btnMatrixCompute") {
              b.innerHTML = `<i class="ph ph-play"></i> <span>Thực hiện</span>`;
            } else {
              b.innerHTML = `Thực hiện`;
            }
            b.style.background = "";
            b.style.borderColor = "";
          }
        });
      };

      updateTransformBtns(true);

      // Hủy vòng lặp ambient của Viewer2D nếu đang chạy để LinearTransform.loop nắm quyền điều phối duy nhất
      if (window.Vec2D && Vec2D._animLoopId) {
        cancelAnimationFrame(Vec2D._animLoopId);
        Vec2D._animLoopId = null;
      }

      // Đồng bộ trạng thái lớp hiển thị sang Viewer 3D
      if (window.Vec3D && typeof window.Vec3D.setTransformLayers === "function") {
        window.Vec3D.setTransformLayers(this.layers);
      }

      this.ensureHUD();
      this.initHUD();
      this.updateHUD(null, true);

      // Khởi tạo đồ họa 3D nếu ở chế độ 3D
      if (this.dim === 3 && window.Vec3D) {
        if (typeof Vec3D.setPerspectiveView === "function") {
          Vec3D.setPerspectiveView();
        }
        if (typeof Vec3D.initTransformGroup === "function") {
          Vec3D.initTransformGroup();
        }
        if (typeof Vec3D.draw3DAllVectors === "function") {
          Vec3D.draw3DAllVectors(); // Ẩn các vector đang được mô phỏng khỏi danh sách tĩnh
        }
        if (typeof Vec3D.updateTransform3D === "function") {
          const M0 = this.getInterpMatrix(0);
          Vec3D.updateTransform3D(0, M0);
        }
        if (typeof Vec3D.renderOnce === "function") {
          Vec3D.renderOnce();
        }
      }

      // Bắt đầu vòng lặp animation
      if (this.animId) cancelAnimationFrame(this.animId);
      this.loop = this.loop.bind(this);
      this.animId = requestAnimationFrame(this.loop);

      // Trigger redraw canvas nếu ở chế độ 2D
      if (this.dim === 2 && window.Vec2D && Vec2D.draw2DAllVectors) {
        Vec2D.draw2DAllVectors();
      }
    },

    // Dừng và đóng mô phỏng
    stop: function () {
      const prevDim = this.dim;
      this.active = false;
      this.isPlaying = false;
      this.targetVectors = [];
      this.targetVectorIds = new Set();
      this.originalVector = null;
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }

      if (this._keyHandler) {
        window.removeEventListener("keydown", this._keyHandler);
        this._keyHandler = null;
      }

      // Ẩn thanh playback sidebar
      const playbackBox = document.getElementById("sidebarTransformPlayback");
      if (playbackBox) playbackBox.style.display = "none";

      const btns = [
        document.getElementById("btnStartTransform"),
        document.getElementById("btnMixedComputeAndTransform"),
        document.getElementById("btnMixedCompute"),
        document.getElementById("btnMatrixCompute")
      ];
      btns.forEach(b => {
        if (!b) return;
        if (b.id === "btnMatrixCompute") {
          b.innerHTML = `<i class="ph ph-play"></i> <span>Thực hiện</span>`;
        } else {
          b.innerHTML = `Thực hiện`;
        }
        b.style.background = "";
        b.style.borderColor = "";
      });

      // Khôi phục đồ họa bình thường
      if (prevDim === 3 && window.Vec3D) {
        if (typeof Vec3D.clearTransformGroup === "function") {
          Vec3D.clearTransformGroup();
        }
        if (typeof Vec3D.hardRefresh3D === "function") {
          Vec3D.hardRefresh3D(false);
        }
      } else if (window.Vec2D && Vec2D.draw2DAllVectors) {
        Vec2D.draw2DAllVectors();
      }
    },

    // Vòng lặp animation mượt mà
    loop: function (timestamp) {
      if (!this.active) return;

      if (this.isPlaying) {
        if (this.lastTime === null) {
          this.lastTime = timestamp;
        }
        const delta = Math.min(100, Math.max(0, timestamp - this.lastTime));
        this.lastTime = timestamp;

        const duration = (typeof this.durationMs === "number" && this.durationMs > 0) ? this.durationMs : 3000;
        const spd = (typeof this.speed === "number" && this.speed > 0) ? this.speed : 1.0;
        const effectiveDuration = duration / spd;

        if (isNaN(this.t)) this.t = 0;
        this.t += delta / effectiveDuration;

        if (this.t >= 0.999) {
          this.t = 1;
          this.isPlaying = false; // Dừng lại ở đích để người dùng quan sát
        }

        this.updateHUD(timestamp, this.t === 1);
      } else {
        this.lastTime = null;
      }

      const M = this.getInterpMatrix(this.t);
      if (this.dim === 3 && window.Vec3D && typeof Vec3D.updateTransform3D === "function") {
        Vec3D.updateTransform3D(this.t, M);
        if (typeof Vec3D.renderOnce === "function") {
          Vec3D.renderOnce();
        }
      } else if (this.dim === 2 && window.Vec2D && Vec2D.draw2DAllVectors) {
        Vec2D.draw2DAllVectors();
      }

      this.animId = requestAnimationFrame(this.loop);
    },

    // Bật/tắt phát
    togglePlay: function () {
      if (this.t >= 1) {
        this.t = 0;
        this.isPlaying = true;
      } else {
        this.isPlaying = !this.isPlaying;
      }
      this.lastTime = null;
      this.updateHUD(null, true);
    },

    play: function () {
      if (this.t >= 1) this.t = 0;
      this.isPlaying = true;
      this.lastTime = null;
      this.updateHUD(null, true);
    },

    pause: function () {
      this.isPlaying = false;
      this.lastTime = null;
      this.updateHUD(null, true);
    },

    reset: function () {
      this.t = 0;
      this.isPlaying = false;
      this.lastTime = null;
      this.updateHUD(null, true);
      const M = this.getInterpMatrix(0);
      if (this.dim === 3 && window.Vec3D && typeof Vec3D.updateTransform3D === "function") {
        Vec3D.updateTransform3D(0, M);
        if (typeof Vec3D.renderOnce === "function") {
          Vec3D.renderOnce();
        }
      } else if (this.dim === 2 && window.Vec2D && Vec2D.draw2DAllVectors) {
        Vec2D.draw2DAllVectors();
      }
    },

    setT: function (val) {
      this.t = Math.max(0, Math.min(1, Number(val) || 0));
      this.lastTime = null;
      this.updateHUD(null, true);
      const M = this.getInterpMatrix(this.t);
      if (this.dim === 3 && window.Vec3D && typeof Vec3D.updateTransform3D === "function") {
        Vec3D.updateTransform3D(this.t, M);
        if (typeof Vec3D.renderOnce === "function") {
          Vec3D.renderOnce();
        }
      } else if (this.dim === 2 && window.Vec2D && Vec2D.draw2DAllVectors) {
        Vec2D.draw2DAllVectors();
      }
    },

    toggleSpeed: function () {
      this.speedIndex = (this.speedIndex + 1) % this.speeds.length;
      this.speed = this.speeds[this.speedIndex];
      this.updateHUD(null, true);
      const btnMatrixSpeed = document.getElementById("btnMatrixSpeed");
      if (btnMatrixSpeed) {
        btnMatrixSpeed.textContent = `${this.speed}x`;
      }
    },

    // Tính ma trận nội suy M(t) = (1 - t)I + tA (hoặc 2 giai đoạn nếu là phép nhân ma trận compound)
    getInterpMatrix: function (t) {
      if (this.mode === "cross_compound_2d_3d_2d" && this.matrixA && this.matrixB && this.matrixC) {
        // Giai đoạn 1 (t ≤ 0.5): Nâng 2D lên 3D theo B (3✕2)
        // Giai đoạn 2 (t > 0.5): Chiếu tấm 3D rơi trở lại mặt sàn 2D theo A → C (2✕2)
        const B = this.matrixB;
        const C = this.matrixC;
        if (t <= 0.5) {
          const tau = t * 2;
          return [
            [(1 - tau) * 1 + tau * (Number(B[0][0]) || 0), (1 - tau) * 0 + tau * (Number(B[0][1]) || 0), 0],
            [(1 - tau) * 0 + tau * (Number(B[1][0]) || 0), (1 - tau) * 1 + tau * (Number(B[1][1]) || 0), 0],
            [(1 - tau) * 0 + tau * (Number(B[2][0]) || 0), (1 - tau) * 0 + tau * (Number(B[2][1]) || 0), 0],
          ];
        } else {
          const tau = (t - 0.5) * 2;
          return [
            [(1 - tau) * (Number(B[0][0]) || 0) + tau * (Number(C[0][0]) || 0), (1 - tau) * (Number(B[0][1]) || 0) + tau * (Number(C[0][1]) || 0), 0],
            [(1 - tau) * (Number(B[1][0]) || 0) + tau * (Number(C[1][0]) || 0), (1 - tau) * (Number(B[1][1]) || 0) + tau * (Number(C[1][1]) || 0), 0],
            [(1 - tau) * (Number(B[2][0]) || 0) + tau * 0,                      (1 - tau) * (Number(B[2][1]) || 0) + tau * 0,                      0],
          ];
        }
      }

      if (this.mode === "cross_compound_3d_2d_3d" && this.matrixA && this.matrixB && this.matrixC) {
        // Giai đoạn 1 (t ≤ 0.5): Nén 3D xuống 2D sàn theo B (2✕3)
        // Giai đoạn 2 (t > 0.5): Nhấc 2D lên tấm 3D nghiêng theo A → D (3✕3)
        const B = this.matrixB; // 2✕3
        const D = this.matrixC; // 3✕3
        if (t <= 0.5) {
          const tau = t * 2;
          return [
            [(1 - tau) * 1 + tau * (Number(B[0][0]) || 0), (1 - tau) * 0 + tau * (Number(B[0][1]) || 0), (1 - tau) * 0 + tau * (Number(B[0][2]) || 0)],
            [(1 - tau) * 0 + tau * (Number(B[1][0]) || 0), (1 - tau) * 1 + tau * (Number(B[1][1]) || 0), (1 - tau) * 0 + tau * (Number(B[1][2]) || 0)],
            [(1 - tau) * 0 + tau * 0,                      (1 - tau) * 0 + tau * 0,                      (1 - tau) * 1 + tau * 0],
          ];
        } else {
          const tau = (t - 0.5) * 2;
          return [
            [(1 - tau) * (Number(B[0][0]) || 0) + tau * (Number(D[0][0]) || 0), (1 - tau) * (Number(B[0][1]) || 0) + tau * (Number(D[0][1]) || 0), (1 - tau) * (Number(B[0][2]) || 0) + tau * (Number(D[0][2]) || 0)],
            [(1 - tau) * (Number(B[1][0]) || 0) + tau * (Number(D[1][0]) || 0), (1 - tau) * (Number(B[1][1]) || 0) + tau * (Number(D[1][1]) || 0), (1 - tau) * (Number(B[1][2]) || 0) + tau * (Number(D[1][2]) || 0)],
            [(1 - tau) * 0 + tau * (Number(D[2][0]) || 0),                      (1 - tau) * 0 + tau * (Number(D[2][1]) || 0),                      (1 - tau) * 0 + tau * (Number(D[2][2]) || 0)],
          ];
        }
      }

      if (this.mode === "embed_2d_to_3d") {
        const A = this.matrix;
        return [
          [(1 - t) * 1 + t * (A[0][0] ?? 0), (1 - t) * 0 + t * (A[0][1] ?? 0), 0],
          [(1 - t) * 0 + t * (A[1][0] ?? 0), (1 - t) * 1 + t * (A[1][1] ?? 0), 0],
          [(1 - t) * 0 + t * (A[2][0] ?? 0), (1 - t) * 0 + t * (A[2][1] ?? 0), 0],
        ];
      }


      if (this.mode === "compound" && this.matrix1 && this.matrix2) {
        // Biến đổi liên hoàn (A ✕ B):
        // t ∈ [0, 0.5]: scale τ = 2t, nội suy I → B (matrix1)
        // t ∈ (0.5, 1]: scale τ = 2(t - 0.5), nội suy B (matrix1) → (A ✕ B) (matrix2)
        if (t <= 0.5) {
          const tau = t * 2;
          const B = this.matrix1;
          if (this.dim === 3) {
            return [
              [(1 - tau) * 1 + tau * (B[0][0] ?? 0), (1 - tau) * 0 + tau * (B[0][1] ?? 0), (1 - tau) * 0 + tau * (B[0][2] ?? 0)],
              [(1 - tau) * 0 + tau * (B[1][0] ?? 0), (1 - tau) * 1 + tau * (B[1][1] ?? 0), (1 - tau) * 0 + tau * (B[1][2] ?? 0)],
              [(1 - tau) * 0 + tau * (B[2][0] ?? 0), (1 - tau) * 0 + tau * (B[2][1] ?? 0), (1 - tau) * 1 + tau * (B[2][2] ?? 0)],
            ];
          }
          return [
            [(1 - tau) * 1 + tau * (B[0][0] ?? 0), (1 - tau) * 0 + tau * (B[0][1] ?? 0)],
            [(1 - tau) * 0 + tau * (B[1][0] ?? 0), (1 - tau) * 1 + tau * (B[1][1] ?? 0)],
          ];
        } else {
          const tau = (t - 0.5) * 2;
          const B = this.matrix1;
          const C = this.matrix2;
          if (this.dim === 3) {
            return [
              [(1 - tau) * (B[0][0] ?? 0) + tau * (C[0][0] ?? 0), (1 - tau) * (B[0][1] ?? 0) + tau * (C[0][1] ?? 0), (1 - tau) * (B[0][2] ?? 0) + tau * (C[0][2] ?? 0)],
              [(1 - tau) * (B[1][0] ?? 0) + tau * (C[1][0] ?? 0), (1 - tau) * (B[1][1] ?? 0) + tau * (C[1][1] ?? 0), (1 - tau) * (B[1][2] ?? 0) + tau * (C[1][2] ?? 0)],
              [(1 - tau) * (B[2][0] ?? 0) + tau * (C[2][0] ?? 0), (1 - tau) * (B[2][1] ?? 0) + tau * (C[2][1] ?? 0), (1 - tau) * (B[2][2] ?? 0) + tau * (C[2][2] ?? 0)],
            ];
          }
          return [
            [(1 - tau) * (B[0][0] ?? 0) + tau * (C[0][0] ?? 0), (1 - tau) * (B[0][1] ?? 0) + tau * (C[0][1] ?? 0)],
            [(1 - tau) * (B[1][0] ?? 0) + tau * (C[1][0] ?? 0), (1 - tau) * (B[1][1] ?? 0) + tau * (C[1][1] ?? 0)],
          ];
        }
      }

      const A = this.matrix;
      if (this.dim === 3 || (Array.isArray(A) && A.length === 3)) {
        return [
          [(1 - t) * 1 + t * (A[0][0] ?? 0), (1 - t) * 0 + t * (A[0][1] ?? 0), (1 - t) * 0 + t * (A[0][2] ?? 0)],
          [(1 - t) * 0 + t * (A[1][0] ?? 0), (1 - t) * 1 + t * (A[1][1] ?? 0), (1 - t) * 0 + t * (A[1][2] ?? 0)],
          [(1 - t) * 0 + t * (A[2][0] ?? 0), (1 - t) * 0 + t * (A[2][1] ?? 0), (1 - t) * 1 + t * (A[2][2] ?? 0)],
        ];
      }
      return [
        [(1 - t) * 1 + t * (A[0][0] ?? 0), (1 - t) * 0 + t * (A[0][1] ?? 0)],
        [(1 - t) * 0 + t * (A[1][0] ?? 0), (1 - t) * 1 + t * (A[1][1] ?? 0)],
      ];
    },

    // Tính định thức của ma trận (2x2 hoặc 3x3)
    getDet: function (M) {
      if (!Array.isArray(M) || M.length === 0) return 0;
      if (this.dim === 3 || M.length === 3) {
        return (
          M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
          M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
          M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
        );
      }
      return M[0][0] * M[1][1] - M[0][1] * M[1][0];
    },

    // Nhân ma trận với vector (2D hoặc 3D)
    mulVec: function (M, v) {
      if (this.dim === 3 || v.length === 3 || M.length === 3) {
        const x = Number(v[0]) || 0;
        const y = Number(v[1]) || 0;
        const z = Number(v[2]) || 0;
        return [
          (M[0][0] ?? 0) * x + (M[0][1] ?? 0) * y + (M[0][2] ?? 0) * z,
          (M[1][0] ?? 0) * x + (M[1][1] ?? 0) * y + (M[1][2] ?? 0) * z,
          (M[2][0] ?? 0) * x + (M[2][1] ?? 0) * y + (M[2][2] ?? 0) * z,
        ];
      }
      const x = Number(v[0]) || 0;
      const y = Number(v[1]) || 0;
      return [
        (M[0][0] ?? 0) * x + (M[0][1] ?? 0) * y,
        (M[1][0] ?? 0) * x + (M[1][1] ?? 0) * y,
      ];
    },

    // Format số gọn gàng
    fmt: function (num) {
      if (Math.abs(num) < 1e-9) return "0.00";
      return (Number(num) || 0).toFixed(2);
    },

    // Khởi tạo các sự kiện điều khiển trên Sidebar và phím tắt
    ensureHUD: function () {
      if (!this._eventsBound) {
        this._eventsBound = true;
        const btnPlay = document.getElementById("sbBtnTransformPlay");
        const btnReset = document.getElementById("sbBtnTransformReset");
        const btnStop = document.getElementById("sbBtnTransformStop");
        const slider = document.getElementById("sbTransformSlider");
        const btnSpeed = document.getElementById("sbBtnTransformSpeed");

        if (btnPlay) btnPlay.onclick = () => this.togglePlay();
        if (btnReset) btnReset.onclick = () => this.reset();
        if (btnStop) btnStop.onclick = () => this.stop();
        if (btnSpeed) btnSpeed.onclick = () => this.toggleSpeed();

        if (slider) {
          slider.oninput = (e) => {
            this.pause();
            this.setT(parseFloat(e.target.value));
          };
        }

        const chkVol = document.getElementById("chkShowVolume");
        const chkBasis = document.getElementById("chkShowBasis");
        const chkDecomp = document.getElementById("chkShowDecomp");
        const chkTraj = document.getElementById("chkShowTraj");

        if (chkVol) {
          chkVol.checked = this.layers.showVolume;
          chkVol.onchange = (e) => this.setLayers({ showVolume: e.target.checked });
        }
        if (chkBasis) {
          chkBasis.checked = this.layers.showBasis;
          chkBasis.onchange = (e) => this.setLayers({ showBasis: e.target.checked });
        }
        if (chkDecomp) {
          chkDecomp.checked = this.layers.showDecomp;
          chkDecomp.onchange = (e) => this.setLayers({ showDecomp: e.target.checked });
        }
        if (chkTraj) {
          chkTraj.checked = this.layers.showTraj;
          chkTraj.onchange = (e) => this.setLayers({ showTraj: e.target.checked });
        }
      }

      // Luôn đồng bộ trạng thái hiển thị của checkbox
      const chkVol = document.getElementById("chkShowVolume");
      const chkBasis = document.getElementById("chkShowBasis");
      const chkDecomp = document.getElementById("chkShowDecomp");
      const chkTraj = document.getElementById("chkShowTraj");
      if (chkVol) chkVol.checked = this.layers.showVolume;
      if (chkBasis) chkBasis.checked = this.layers.showBasis;
      if (chkDecomp) chkDecomp.checked = this.layers.showDecomp;
      if (chkTraj) chkTraj.checked = this.layers.showTraj;

      // Lắng nghe phím tắt điều khiển playback thuận tiện
      if (!this._keyHandler) {
        this._keyHandler = (e) => {
          if (!this.active) return;
          if (
            ["INPUT", "TEXTAREA", "SELECT", "MATH-FIELD"].includes(document.activeElement?.tagName)
          ) {
            return;
          }

          if (e.code === "Space") {
            e.preventDefault();
            this.togglePlay();
          } else if (e.code === "KeyR" || e.code === "Home") {
            e.preventDefault();
            this.reset();
          } else if (e.code === "ArrowRight") {
            e.preventDefault();
            this.pause();
            this.setT(this.t + 0.05);
          } else if (e.code === "ArrowLeft") {
            e.preventDefault();
            this.pause();
            this.setT(this.t - 0.05);
          } else if (e.code === "Escape") {
            e.preventDefault();
            this.stop();
          }
        };
        window.addEventListener("keydown", this._keyHandler);
      }
    },

    // Helper tạo HTML biểu diễn vector có mũi tên chuẩn, không dùng ký tự kết hợp \u20D7 gây lỗi font
    getVecHtml: function (letter, color) {
      const c = color ? `color:${color};` : "";
      return `<span style="display:inline-flex; flex-direction:column; align-items:center; line-height:1; vertical-align:middle; ${c}"><span style="font-size:7.5px; line-height:0.7; transform:scaleX(0.85); font-weight:normal;">&rarr;</span><span style="font-style:italic; font-weight:800; font-size:10.5px; line-height:1;">${letter}</span></span>`;
    },

    // Khởi tạo DOM cache và cấu trúc hiển thị HUD 1 lần duy nhất để loại bỏ DOM Reflow / innerHTML
    initHUD: function () {
      this._hud = {
        iconPlay: document.getElementById("sbIconTransformPlay"),
        slider: document.getElementById("sbTransformSlider"),
        tVal: document.getElementById("sbTransformTVal"),
        btnSpeed: document.getElementById("sbBtnTransformSpeed"),
        bracket: document.getElementById("sbPlaybackBracket"),
        lblVol: document.getElementById("lblShowVolume"),
        lblBasis: document.getElementById("lblShowBasis"),
        detLabel: document.getElementById("sbDetLabel"),
        detVal: document.getElementById("sbDetVal"),
        detDesc: document.getElementById("sbDetDesc"),
        vecContainer: document.getElementById("sbVecListContainer"),
        vecItems: document.getElementById("sbVecListItems"),
      };

      this._lastHudTime = 0;

      // Xây dựng trước các ô ma trận Bracket kèm nhãn cột cơ sở
      const bracket = this._hud.bracket;
      this._hudCells = [];
      if (bracket) {
        bracket.innerHTML = "";
        const dim = this.dim;
        bracket.style.gridTemplateColumns = `repeat(${dim}, 1fr)`;

        // Hàng tiêu đề cột: i(t), j(t), k(t) đồng bộ màu với vector trên canvas
        const colColors = ["#e5484d", "#10b981", "#8b5cf6"];
        const colBasis = ["i", "j", "k"];

        for (let c = 0; c < dim; c++) {
          const header = document.createElement("span");
          header.style.cssText = `font-size:9.5px; font-weight:800; color:${colColors[c]}; text-align:center; padding-bottom:2px; border-bottom:1px solid ${colColors[c]}44;`;
          header.innerHTML = `${this.getVecHtml(colBasis[c], colColors[c])}(t)`;
          bracket.appendChild(header);
        }

        // Các hàng phần tử số của ma trận (mang màu của cột cơ sở tương ứng)
        for (let r = 0; r < dim; r++) {
          this._hudCells[r] = [];
          for (let c = 0; c < dim; c++) {
            const span = document.createElement("span");
            span.id = `sbCell${r}${c}`;
            span.style.cssText = `color:${colColors[c]}; font-weight:700; text-align:right; font-family:monospace;`;
            span.textContent = "0.00";
            bracket.appendChild(span);
            this._hudCells[r][c] = span;
          }
        }

        // Hàng chỉ số hình học giải mã trục không gian (Độ dãn ||Col|| và Góc xoay θ)
        this._hudColStats = [];
        for (let c = 0; c < dim; c++) {
          const statSpan = document.createElement("span");
          statSpan.id = `sbColStat${c}`;
          statSpan.style.cssText = `font-size:8px; font-weight:600; color:${colColors[c]}; opacity:0.85; text-align:center; padding-top:2px; border-top:1px dashed ${colColors[c]}33; white-space:nowrap;`;
          statSpan.textContent = "1.0×, 0°";
          bracket.appendChild(statSpan);
          this._hudColStats[c] = statSpan;
        }
      }

      // Xây dựng danh sách vector theo dõi hiển thị rõ công thức tổ hợp tuyến tính
      const vecContainer = this._hud.vecContainer;
      const vecItems = this._hud.vecItems;
      if (this.targetVectors && this.targetVectors.length > 0) {
        if (vecContainer) vecContainer.style.display = "block";
        if (vecItems) {
          vecItems.innerHTML = "";
          const fmt = this.fmt;
          this.targetVectors.forEach((tv) => {
            const row = document.createElement("div");
            row.style.cssText = "display:flex; align-items:center; justify-content:space-between; gap:6px; font-size:11px; padding:3px 6px; background:var(--bg, rgba(0,0,0,0.05)); border:1px solid var(--border, rgba(128,128,128,0.15)); border-radius:2px;";

            const x0 = fmt(tv.vec[0] || 0);
            const y0 = fmt(tv.vec[1] || 0);
            const z0 = fmt(tv.vec[2] || 0);
            const color = tv.color || "#0090ff";

            const leftBox = document.createElement("div");
            leftBox.style.cssText = "display:flex; align-items:center; gap:4px; font-size:10.5px; white-space:nowrap; overflow:hidden;";

            let decompHtml = `<span style="font-weight:700; color:${color};">${tv.name || "v"}(t)</span><span style="color:var(--text-muted);">=</span>`;
            if (this.dim === 3 || tv.vec.length === 3) {
              decompHtml += `<span style="color:var(--text-muted);">${x0}</span>${this.getVecHtml("i", "#e5484d")}+<span style="color:var(--text-muted);">${y0}</span>${this.getVecHtml("j", "#10b981")}+<span style="color:var(--text-muted);">${z0}</span>${this.getVecHtml("k", "#8b5cf6")}`;
            } else {
              decompHtml += `<span style="color:var(--text-muted);">${x0}</span>${this.getVecHtml("i", "#e5484d")}+<span style="color:var(--text-muted);">${y0}</span>${this.getVecHtml("j", "#10b981")}`;
            }
            leftBox.innerHTML = decompHtml;

            const valSpan = document.createElement("span");
            valSpan.style.cssText = "font-family:monospace; font-weight:800; color:var(--fg); font-size:11px; flex-shrink:0;";
            valSpan.textContent = "[0.00, 0.00]";

            row.appendChild(leftBox);
            row.appendChild(valSpan);
            vecItems.appendChild(row);

            tv._hudCoordSpan = valSpan;
          });
        }
      } else {
        if (vecContainer) vecContainer.style.display = "none";
        if (vecItems) vecItems.innerHTML = "";
      }

      // Nhãn tĩnh theo số chiều
      if (this._hud.lblVol) {
        this._hud.lblVol.textContent = (this.dim === 3) ? "Thể tích" : "Diện tích";
      }
      if (this._hud.lblBasis) {
        this._hud.lblBasis.innerHTML = (this.dim === 3)
          ? `Cơ sở (${this.getVecHtml("i", "#e5484d")}, ${this.getVecHtml("j", "#10b981")}, ${this.getVecHtml("k", "#8b5cf6")})`
          : `Cơ sở (${this.getVecHtml("i", "#e5484d")}, ${this.getVecHtml("j", "#10b981")})`;
      }
      if (this._hud.detLabel) {
        this._hud.detLabel.textContent = "det(M) =";
      }
    },

    // Cập nhật giá trị hiển thị trực tiếp trên cụm điều khiển Sidebar (Zero innerHTML, Throttle ~30fps)
    updateHUD: function (timestamp = null, force = false) {
      if (!this._hud) this.initHUD();

      // Tiết lưu DOM text update (~30 FPS) để tránh Layout Reflow liên tục làm giật frame
      if (!force && this.isPlaying && timestamp && this._lastHudTime && (timestamp - this._lastHudTime < 32) && this.t < 0.999) {
        return;
      }
      this._lastHudTime = timestamp || performance.now();

      const M = this.getInterpMatrix(this.t);
      const det = this.getDet(M);

      // Icon Play/Pause
      if (this._hud.iconPlay) {
        this._hud.iconPlay.className = this.isPlaying ? "ph ph-pause" : "ph ph-play";
      }

      // Slider & T value
      if (this._hud.slider && document.activeElement !== this._hud.slider) {
        this._hud.slider.value = this.t;
      }
      if (this._hud.tVal) {
        this._hud.tVal.textContent = `t=${this.t.toFixed(2)}`;
      }

      // Speed button
      if (this._hud.btnSpeed) {
        this._hud.btnSpeed.textContent = `${this.speed.toFixed(1)}×`;
      }
      const btnMatrixSpeed = document.getElementById("btnMatrixSpeed");
      if (btnMatrixSpeed) {
        btnMatrixSpeed.textContent = `${this.speed}x`;
      }

      // Matrix values in Bracket (Cập nhật textContent trực tiếp, không innerHTML)
      if (this._hudCells) {
        for (let r = 0; r < this.dim; r++) {
          if (!this._hudCells[r] || !M[r]) continue;
          for (let c = 0; c < this.dim; c++) {
            if (this._hudCells[r][c]) {
              this._hudCells[r][c].textContent = this.fmt(M[r][c]);
            }
          }
        }
      }

      // Cập nhật chỉ số hình học giải mã trục (Độ dãn và góc xoay)
      if (this._hudColStats) {
        for (let c = 0; c < this.dim; c++) {
          if (!this._hudColStats[c]) continue;
          if (this.dim === 2) {
            const vx = M[0] ? Number(M[0][c]) || 0 : 0;
            const vy = M[1] ? Number(M[1][c]) || 0 : 0;
            const len = Math.hypot(vx, vy);
            const deg = Math.round((Math.atan2(vy, vx) * 180) / Math.PI);
            const degSign = deg > 0 ? "+" : "";
            this._hudColStats[c].textContent = `${this.fmt(len)}×, ${degSign}${deg}°`;
          } else {
            const vx = M[0] ? Number(M[0][c]) || 0 : 0;
            const vy = M[1] ? Number(M[1][c]) || 0 : 0;
            const vz = M[2] ? Number(M[2][c]) || 0 : 0;
            const len = Math.hypot(vx, vy, vz);
            this._hudColStats[c].textContent = `${this.fmt(len)}×`;
          }
        }
      }

      // Det value and description
      if (this._hud.detVal) {
        this._hud.detVal.textContent = isNaN(det) ? "0.00" : this.fmt(det);
      }

      if (this._hud.detDesc) {
        if (this.mode === "cross_compound_2d_3d_2d") {
          if (this._hud.detVal) {
            const C = this.matrixC;
            const detC = C ? (Number(C[0][0]) || 0) * (Number(C[1][1]) || 0) - (Number(C[0][1]) || 0) * (Number(C[1][0]) || 0) : 0;
            this._hud.detVal.textContent = isNaN(detC) ? "0.00" : this.fmt(detC);
          }
          if (this.t <= 0.5) {
            this._hud.detDesc.textContent = "Giai đoạn 1/2: B(3✕2) nâng mặt phẳng 2D bay lên 3D";
            this._hud.detDesc.style.color = "var(--primary-base, #2563eb)";
          } else {
            this._hud.detDesc.textContent = "Giai đoạn 2/2: A(2✕3) chiếu phẳng tấm 3D rơi lại sàn 2D (C = A✕B)";
            this._hud.detDesc.style.color = "var(--success, #30a46c)";
          }
        } else if (this.mode === "cross_compound_3d_2d_3d") {
          if (this._hud.detVal) {
            this._hud.detVal.textContent = "0.00";
          }
          if (this.t <= 0.5) {
            this._hud.detDesc.textContent = "Giai đoạn 1/2: B(2✕3) nén toàn bộ không gian 3D xuống sàn 2D";
            this._hud.detDesc.style.color = "var(--warning, #f59e0b)";
          } else {
            this._hud.detDesc.textContent = "Giai đoạn 2/2: A(3✕2) nhấc mặt phẳng 2D đặt nghiêng trong 3D (Rank 2)";
            this._hud.detDesc.style.color = "var(--success, #30a46c)";
          }
        } else if (this.mode === "embed_2d_to_3d") {
          if (this._hud.detVal) this._hud.detVal.textContent = "Subspace 2D";
          this._hud.detDesc.textContent = "Nâng mặt phẳng 2D bay lên nghiêng trong không gian 3D";
          this._hud.detDesc.style.color = "var(--primary-base, #2563eb)";
        } else if (this.mode === "project_3d_to_2d") {
          if (this._hud.detVal) this._hud.detVal.textContent = "0.00";
          this._hud.detDesc.textContent = "Chiếu nén toàn bộ không gian 3D rơi xuống mặt sàn 2D (z=0)";
          this._hud.detDesc.style.color = "var(--warning, #f59e0b)";
        } else if (this.mode === "compound") {
          if (this.t <= 0.5) {
            this._hud.detDesc.textContent = "Giai đoạn 1: Biến đổi theo B (t ≤ 0.5)";
            this._hud.detDesc.style.color = "var(--primary-base, #2563eb)";
          } else {
            this._hud.detDesc.textContent = "Giai đoạn 2: Biến đổi tiếp theo A → (A ✕ B)";
            this._hud.detDesc.style.color = "var(--success, #30a46c)";
          }
        } else if (this.mode === "inv") {
          const invDet = (this.matrix) ? this.getDet(this.matrix) : 0;
          this._hud.detDesc.textContent = `Biến đổi theo ma trận nghịch đảo A⁻¹ (|det(A⁻¹)| = ${this.fmt(Math.abs(invDet))})`;
          this._hud.detDesc.style.color = "var(--primary-base, #2563eb)";
        } else if (this.mode === "rank") {
          const r = (this.rank !== null) ? this.rank : 0;
          const totalDim = this.dim;
          const nullity = (this.nullity !== null) ? this.nullity : (totalDim - r);
          if (r === totalDim) {
            this._hud.detDesc.textContent = `Hạng Rank = ${r}/${totalDim}: Toàn bộ không gian được bảo toàn (dim Ker A = ${nullity})`;
            this._hud.detDesc.style.color = "var(--success, #30a46c)";
          } else if (r === 1 && totalDim === 2) {
            this._hud.detDesc.textContent = `Hạng Rank = 1/2: Không gian ảnh Im(A) là đường thẳng 1D, Hạt nhân Ker(A) co về gốc (0, 0)`;
            this._hud.detDesc.style.color = "var(--danger, #e5484d)";
          } else if (r === 2 && totalDim === 3) {
            this._hud.detDesc.textContent = `Hạng Rank = 2/3: Không gian ảnh Im(A) là mặt phẳng 2D, Hạt nhân Ker(A) 1D co về gốc`;
            this._hud.detDesc.style.color = "var(--warning, #f59e0b)";
          } else if (r === 1 && totalDim === 3) {
            this._hud.detDesc.textContent = `Hạng Rank = 1/3: Không gian ảnh Im(A) là đường thẳng 1D, Hạt nhân Ker(A) 2D co về gốc`;
            this._hud.detDesc.style.color = "var(--danger, #e5484d)";
          } else {
            this._hud.detDesc.textContent = `Hạng Rank = ${r}/${totalDim}: Không gian suy biến về gốc tọa độ (dim Ker A = ${nullity})`;
            this._hud.detDesc.style.color = "var(--danger, #e5484d)";
          }
        } else if (this.mode === "transpose") {
          const orig = this.originalMatrix;
          const isSym = orig && (
            (this.dim === 2 && Math.abs((Number(orig[0][1]) || 0) - (Number(orig[1][0]) || 0)) < 1e-6) ||
            (this.dim === 3 && Math.abs((Number(orig[0][1]) || 0) - (Number(orig[1][0]) || 0)) < 1e-6 &&
                               Math.abs((Number(orig[0][2]) || 0) - (Number(orig[2][0]) || 0)) < 1e-6 &&
                               Math.abs((Number(orig[1][2]) || 0) - (Number(orig[2][1]) || 0)) < 1e-6)
          );
          if (isSym) {
            this._hud.detDesc.textContent = "Ma trận đối xứng (Aᵀ = A): Không gian chuyển vị trùng khớp ma trận gốc";
            this._hud.detDesc.style.color = "var(--success, #30a46c)";
          } else {
            this._hud.detDesc.textContent = `Chuyển vị Aᵀ: Bảo toàn định thức det(Aᵀ) = det(A) = ${this.fmt(det)}`;
            this._hud.detDesc.style.color = "var(--primary-base, #2563eb)";
          }
        } else {
          if (isNaN(det) || Math.abs(det) < 0.001) {
            this._hud.detDesc.textContent = "Suy biến (det = 0)";
            this._hud.detDesc.style.color = "var(--danger, #e5484d)";
          } else if (det < 0) {
            this._hud.detDesc.textContent = `Đảo định hướng (|det| = ${this.fmt(Math.abs(det))})`;
            this._hud.detDesc.style.color = "var(--warning, #f59e0b)";
          } else if (Math.abs(det - 1) < 0.001) {
            this._hud.detDesc.textContent = (this.dim === 3) ? "Bảo toàn thể tích" : "Bảo toàn diện tích";
            this._hud.detDesc.style.color = "var(--success, #30a46c)";
          } else {
            const ratioName = (this.dim === 3) ? "Tỉ lệ thể tích" : "Tỉ lệ diện tích";
            this._hud.detDesc.textContent = `${ratioName}: ${this.fmt(det)}`;
            this._hud.detDesc.style.color = (det > 1) ? "var(--primary-base, #2563eb)" : "var(--text-muted, #888)";
          }
        }
      }

      // Danh sách tọa độ vector live theo thời gian thực
      if (this.targetVectors && this.targetVectors.length > 0) {
        this.targetVectors.forEach((tv) => {
          if (tv._hudCoordSpan) {
            const vt = this.mulVec(M, tv.vec);
            const coordStr = (this.dim === 3 || vt.length === 3)
              ? `[${this.fmt(vt[0])}, ${this.fmt(vt[1])}, ${this.fmt(vt[2])}]`
              : `[${this.fmt(vt[0])}, ${this.fmt(vt[1])}]`;
            tv._hudCoordSpan.textContent = coordStr;
          }
        });
      }
    },

    // =========================================================================
    // RENDER TRỰC TIẾP TRÊN 2D CANVAS
    // =========================================================================
    render2D: function (ctx, gridInfo) {
      if (!this.active || !gridInfo) return;

      const { cx, cy, px } = gridInfo;
      const M = this.getInterpMatrix(this.t);
      const det = this.getDet(M);

      const dpr = window.devicePixelRatio || 1;
      const canvas = ctx.canvas;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      // 1. TÍNH BÁN KÍNH TỪ GỐC (cx, cy) ĐẾN 4 GÓC CANVAS ĐỂ PHỦ KÍN 100%
      const d1 = cx * cx + cy * cy;
      const d2 = (w - cx) * (w - cx) + cy * cy;
      const d3 = cx * cx + (h - cy) * (h - cy);
      const d4 = (w - cx) * (w - cx) + (h - cy) * (h - cy);
      const maxDistPx = Math.sqrt(Math.max(d1, d2, d3, d4));
      const maxMathR = Math.max(20, Math.ceil(maxDistPx / Math.max(1e-10, px)));

      // Chiều dài vươn xa của mỗi đường kẻ lưới (luôn vượt xa màn hình dù ma trận co dãn mạnh)
      const L = Math.max(maxMathR * 3.5, 120);

      // Bước nhảy kStep tự thích ứng theo độ thu phóng để hiển thị thẩm mỹ, không bị rối mắt
      let kStep = 1;
      if (maxMathR > 25) {
        const rawStep = (maxMathR * 2.5) / 30;
        const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
        const res = rawStep / mag;
        kStep = (res <= 1 ? 1 : res <= 2 ? 2 : res <= 5 ? 5 : 10) * mag;
      }
      const gridRange = Math.ceil((maxMathR * 2.5) / kStep) * kStep;

      ctx.save();

      // 2. VẼ LƯỚI KHÔNG GIAN BIẾN DẠNG (TRANSFORMED GRID) - Gom thành 1 Path duy nhất
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(59, 130, 246, 0.22)";
      ctx.beginPath();

      // Đường lưới biến dạng tương ứng với x = k
      for (let k = -gridRange; k <= gridRange; k += kStep) {
        if (k === 0) continue;
        const p1 = this.mulVec(M, [k, -L]);
        const p2 = this.mulVec(M, [k, L]);

        ctx.moveTo(cx + p1[0] * px, cy - p1[1] * px);
        ctx.lineTo(cx + p2[0] * px, cy - p2[1] * px);
      }

      // Đường lưới biến dạng tương ứng với y = m
      for (let m = -gridRange; m <= gridRange; m += kStep) {
        if (m === 0) continue;
        const p1 = this.mulVec(M, [-L, m]);
        const p2 = this.mulVec(M, [L, m]);

        ctx.moveTo(cx + p1[0] * px, cy - p1[1] * px);
        ctx.lineTo(cx + p2[0] * px, cy - p2[1] * px);
      }
      ctx.stroke();

      // 3. VẼ HÌNH BÌNH HÀNH ĐỊNH THỨC (DETERMINANT PARALLELOGRAM)
      if (this.layers.showVolume) {
        // Khi ở chế độ chuyển vị và có ma trận gốc A: vẽ hình bình hành mốc (ghost) của A để so sánh đối chiếu
        if (this.mode === "transpose" && this.originalMatrix) {
          const origA = this.originalMatrix;
          const origI = [Number(origA[0][0]) || 0, Number(origA[1][0]) || 0];
          const origJ = [Number(origA[0][1]) || 0, Number(origA[1][1]) || 0];
          const origSum = [origI[0] + origJ[0], origI[1] + origJ[1]];

          const g0 = { x: cx, y: cy };
          const gI = { x: cx + origI[0] * px, y: cy - origI[1] * px };
          const gSum = { x: cx + origSum[0] * px, y: cy - origSum[1] * px };
          const gJ = { x: cx + origJ[0] * px, y: cy - origJ[1] * px };

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(g0.x, g0.y);
          ctx.lineTo(gI.x, gI.y);
          ctx.lineTo(gSum.x, gSum.y);
          ctx.lineTo(gJ.x, gJ.y);
          ctx.closePath();
          ctx.fillStyle = "rgba(148, 163, 184, 0.10)";
          ctx.fill();
          ctx.strokeStyle = "rgba(148, 163, 184, 0.65)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Nhãn mốc của ma trận A
          const midX = (g0.x + gSum.x) / 2;
          const midY = (g0.y + gSum.y) / 2;
          ctx.font = "italic 600 10.5px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const isDark = document.body.classList.contains("dark-theme") || document.body.classList.contains("dark");
          const bgTheme = isDark ? "rgba(24, 25, 27, 0.88)" : "rgba(255, 255, 255, 0.88)";
          ctx.fillStyle = bgTheme;
          ctx.fillRect(midX - 42, midY - 10, 84, 20);
          ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
          ctx.strokeRect(midX - 42, midY - 10, 84, 20);
          ctx.fillStyle = isDark ? "#cbd5e1" : "#475569";
          ctx.fillText("Mốc ma trận A", midX, midY);
          ctx.restore();
        }

        const vI = this.mulVec(M, [1, 0]);
        const vJ = this.mulVec(M, [0, 1]);
        const vSum = [vI[0] + vJ[0], vI[1] + vJ[1]];

        const p0 = { x: cx, y: cy };
        const pI = { x: cx + vI[0] * px, y: cy - vI[1] * px };
        const pSum = { x: cx + vSum[0] * px, y: cy - vSum[1] * px };
        const pJ = { x: cx + vJ[0] * px, y: cy - vJ[1] * px };

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(pI.x, pI.y);
        ctx.lineTo(pSum.x, pSum.y);
        ctx.lineTo(pJ.x, pJ.y);
        ctx.closePath();

        if (Math.abs(det) < 0.001) {
          ctx.strokeStyle = "rgba(229, 72, 77, 0.9)";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (det < 0) {
          ctx.fillStyle = "rgba(229, 72, 77, 0.18)";
          ctx.fill();
          ctx.strokeStyle = "rgba(229, 72, 77, 0.75)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(245, 158, 11, 0.16)";
          ctx.fill();
          ctx.strokeStyle = "rgba(245, 158, 11, 0.8)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // 3.5 VẼ ĐƯỜNG THẲNG KHÔNG GIAN ẢNH Im(A) NẾU HẠNG BỊ GIẢM (RANK = 1)
      if (this.mode === "rank" && this.rank === 1 && this.dim === 2) {
        // Tìm vector chỉ phương của không gian ảnh (cột khác 0 của M)
        let spanDir = [M[0][0], M[1][0]];
        if (Math.hypot(spanDir[0], spanDir[1]) < 1e-6) {
          spanDir = [M[0][1], M[1][1]];
        }
        const spanLen = Math.hypot(spanDir[0], spanDir[1]);
        if (spanLen > 1e-6) {
          const uDir = [spanDir[0] / spanLen, spanDir[1] / spanLen];
          const spanL = L * 2;
          const pStart = [uDir[0] * -spanL, uDir[1] * -spanL];
          const pEnd = [uDir[0] * spanL, uDir[1] * spanL];

          ctx.save();
          // Halo phát sáng cho đường thẳng ảnh
          ctx.strokeStyle = "rgba(229, 72, 77, 0.22)";
          ctx.lineWidth = 6.0;
          ctx.beginPath();
          ctx.moveTo(cx + pStart[0] * px, cy - pStart[1] * px);
          ctx.lineTo(cx + pEnd[0] * px, cy - pEnd[1] * px);
          ctx.stroke();

          // Đường thẳng ảnh chính nét đứt
          ctx.strokeStyle = "#e5484d";
          ctx.lineWidth = 2.0;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(cx + pStart[0] * px, cy - pStart[1] * px);
          ctx.lineTo(cx + pEnd[0] * px, cy - pEnd[1] * px);
          ctx.stroke();
          ctx.setLineDash([]);

          // Nhãn giải thích không gian ảnh
          const labelDist = Math.min(180, w * 0.35);
          const lblX = cx + uDir[0] * labelDist;
          const lblY = cy - uDir[1] * labelDist;
          ctx.font = "bold 11px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const isDark = document.body.classList.contains("dark-theme") || document.body.classList.contains("dark");
          const bgTheme = isDark ? "rgba(24, 25, 27, 0.92)" : "rgba(255, 255, 255, 0.92)";
          ctx.fillStyle = bgTheme;
          ctx.fillRect(lblX - 65, lblY - 11, 130, 22);
          ctx.strokeStyle = "#e5484d";
          ctx.lineWidth = 1;
          ctx.strokeRect(lblX - 65, lblY - 11, 130, 22);
          ctx.fillStyle = "#e5484d";
          ctx.fillText("Không gian ảnh Im(A) (1 chiều)", lblX, lblY);
          ctx.restore();
        }
      }

      // 3.6 ĐƯỜNG DÓNG HÌNH CHIẾU VÀ HẠT NHÂN CHO PHÉP TÍNH HẠNG (RANK = 1)
      if (this.mode === "rank" && this.rank === 1 && this.dim === 2) {
        let spanDir = [M[0][0], M[1][0]];
        if (Math.hypot(spanDir[0], spanDir[1]) < 1e-6) {
          spanDir = [M[0][1], M[1][1]];
        }
        const spanLen = Math.hypot(spanDir[0], spanDir[1]);
        if (spanLen > 1e-6) {
          const uDir = [spanDir[0] / spanLen, spanDir[1] / spanLen];
          const vI = this.mulVec(M, [1, 0]);
          const vJ = this.mulVec(M, [0, 1]);
          const projI_len = vI[0] * uDir[0] + vI[1] * uDir[1];
          const projJ_len = vJ[0] * uDir[0] + vJ[1] * uDir[1];
          const pI_proj = [uDir[0] * projI_len, uDir[1] * projI_len];
          const pJ_proj = [uDir[0] * projJ_len, uDir[1] * projJ_len];

          ctx.save();
          const isDark = document.body.classList.contains("dark-theme") || document.body.classList.contains("dark");
          const bgTheme = isDark ? "rgba(24, 25, 27, 0.92)" : "rgba(255, 255, 255, 0.92)";

          // Đường dóng từ vI, vJ rơi vào Im(A) khi t đang biến đổi
          if (this.t < 0.96) {
            ctx.lineWidth = 1.2;
            ctx.setLineDash([3, 3]);

            ctx.strokeStyle = "rgba(229, 72, 77, 0.55)";
            ctx.beginPath();
            ctx.moveTo(cx + vI[0] * px, cy - vI[1] * px);
            ctx.lineTo(cx + pI_proj[0] * px, cy - pI_proj[1] * px);
            ctx.stroke();

            ctx.strokeStyle = "rgba(16, 185, 129, 0.55)";
            ctx.beginPath();
            ctx.moveTo(cx + vJ[0] * px, cy - vJ[1] * px);
            ctx.lineTo(cx + pJ_proj[0] * px, cy - pJ_proj[1] * px);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Hạt nhân Ker(A) (vuông góc hàng ma trận A, nén về gốc tọa độ)
          const A_mat = this.originalMatrix || M;
          let rx = Number(A_mat[0][0]) || 0;
          let ry = Number(A_mat[0][1]) || 0;
          if (Math.hypot(rx, ry) < 1e-6 && A_mat.length > 1) {
            rx = Number(A_mat[1][0]) || 0;
            ry = Number(A_mat[1][1]) || 0;
          }
          if (Math.hypot(rx, ry) > 1e-6) {
            const kerDir = [-ry, rx];
            const kerLen = Math.hypot(kerDir[0], kerDir[1]);
            const uKer = [kerDir[0] / kerLen, kerDir[1] / kerLen];
            const kerL = L * 1.5;
            ctx.strokeStyle = "rgba(168, 85, 247, 0.65)";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(cx - uKer[0] * kerL * px, cy + uKer[1] * kerL * px);
            ctx.lineTo(cx + uKer[0] * kerL * px, cy - uKer[1] * kerL * px);
            ctx.stroke();

            const kDist = Math.min(130, w * 0.25);
            const kx = cx + uKer[0] * kDist;
            const ky = cy - uKer[1] * kDist;
            ctx.font = "italic 600 10.5px system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = bgTheme;
            ctx.fillRect(kx - 55, ky - 10, 110, 20);
            ctx.strokeStyle = "#8b5cf6";
            ctx.lineWidth = 1;
            ctx.strokeRect(kx - 55, ky - 10, 110, 20);
            ctx.fillStyle = "#a855f7";
            ctx.fillText("Hạt nhân Ker(A) → (0, 0)", kx, ky);
          }
          ctx.restore();
        }
      }

      // 4. VẼ CẶP VECTOR CƠ SỞ i(t) VÀ j(t)
      if (this.layers.showBasis) {
        const vI = this.mulVec(M, [1, 0]);
        const vJ = this.mulVec(M, [0, 1]);

        const pIx = cx + vI[0] * px;
        const pIy = cy - vI[1] * px;
        const pJx = cx + vJ[0] * px;
        const pJy = cy - vJ[1] * px;
        const tipDist = Math.hypot(pIx - pJx, pIy - pJy);

        let offsetI = 0;
        let offsetJ = 0;
        if (tipDist < 26) {
          offsetI = -0.42;
          offsetJ = 0.42;
        }

        const nameI = (this.t > 0.1) ? "i'" : "i";
        const nameJ = (this.t > 0.1) ? "j'" : "j";
        const hasArrowI = true;
        const hasArrowJ = true;

        this.drawTransformedVector(
          ctx,
          cx,
          cy,
          px,
          vI,
          "#e5484d",
          nameI,
          `i = [${this.fmt(vI[0])}, ${this.fmt(vI[1])}]`,
          3.2,
          12,
          false,
          hasArrowI,
          false,
          offsetI
        );
        this.drawTransformedVector(
          ctx,
          cx,
          cy,
          px,
          vJ,
          "#10b981",
          nameJ,
          `j = [${this.fmt(vJ[0])}, ${this.fmt(vJ[1])}]`,
          3.2,
          12,
          false,
          hasArrowJ,
          false,
          offsetJ
        );
      }

      // 5. VẼ QUỸ ĐẠO, ĐƯỜNG DÓNG TỔ HỢP HÌNH BÌNH HÀNH VÀ VECTOR MỤC TIÊU v(t)
      if (this.targetVectors && this.targetVectors.length > 0) {
        this.targetVectors.forEach((tv) => {
          const v0 = tv.vec;
          const vt = this.mulVec(M, v0);
          const color = tv.color || "#0090ff";
          const name = tv.name || "v";
          const vtx = cx + vt[0] * px;
          const vty = cy - vt[1] * px;

          // Đường dóng tổ hợp hình bình hành (Quy tắc cộng vector x·i(t) + y·j(t))
          if (this.layers.showDecomp) {
            const compI = this.mulVec(M, [v0[0], 0]);
            const compJ = this.mulVec(M, [0, v0[1]]);
            const cIx = cx + compI[0] * px;
            const cIy = cy - compI[1] * px;
            const cJx = cx + compJ[0] * px;
            const cJy = cy - compJ[1] * px;

            ctx.save();
            ctx.lineWidth = 1.2;
            ctx.setLineDash([3, 3]);

            // Dóng từ compI tới vt (song song j, mang màu j #10b981)
            ctx.strokeStyle = "rgba(160, 185, 129, 0.65)";
            ctx.beginPath();
            ctx.moveTo(cIx, cIy);
            ctx.lineTo(vtx, vty);
            ctx.stroke();

            // Dóng từ compJ tới vt (song song i, mang màu i #e5484d)
            ctx.strokeStyle = "rgba(229, 72, 77, 0.65)";
            ctx.beginPath();
            ctx.moveTo(cJx, cJy);
            ctx.lineTo(vtx, vty);
            ctx.stroke();

            // Chấm tròn nhỏ tại 2 thành phần cơ sở
            ctx.setLineDash([]);
            ctx.fillStyle = "#e5484d";
            ctx.beginPath();
            ctx.arc(cIx, cIy, 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#10b981";
            ctx.beginPath();
            ctx.arc(cJx, cJy, 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          }

          if (this.layers.showTraj) {
            // a. Vector ban đầu v0 mờ làm mốc (Ghost)
            const v0x = cx + v0[0] * px;
            const v0y = cy - v0[1] * px;
            ctx.save();
            ctx.strokeStyle = "rgba(160, 160, 160, 0.35)";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(v0x, v0y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            // b. Vệt quỹ đạo từ t = 0 đến t hiện tại (Đoạn thẳng toán học chính xác)
            ctx.save();
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([2, 3]);
            ctx.beginPath();
            ctx.moveTo(v0x, v0y);
            ctx.lineTo(vtx, vty);
            ctx.stroke();
            ctx.restore();
          }

          // c. Vector vt hiện tại (với halo viền tương phản nổi bật)
          this.drawTransformedVector(
            ctx,
            cx,
            cy,
            px,
            vt,
            color,
            name,
            `${name}(t) = [${this.fmt(vt[0])}, ${this.fmt(vt[1])}]`,
            3.6,
            14,
            true,
            true
          );
        });
      }

      // 6. HUY HIỆU THÔNG BÁO - ĐÃ XÓA THEO YÊU CẦU NGƯỜI DÙNG ĐỂ GIỮ CANVAS THOÁNG ĐÃNG
      ctx.restore();
    },

    // Hàm vẽ nhãn toán học có mũi tên vector sắc nét bằng native Canvas path (100% độc lập font hệ thống, chống lỗi tofu box)
    drawVectorMathLabel: function (
      ctx,
      baseName,
      x,
      y,
      color,
      bgTheme = null,
      hasArrow = true
    ) {
      ctx.save();
      const isDark = document.body.classList.contains("dark-theme") || document.body.classList.contains("dark");
      const effectiveHalo = bgTheme || (isDark ? "rgba(24, 25, 27, 0.98)" : "rgba(255, 255, 255, 0.98)");

      // Font toán học chuẩn nét nghiêng, phân biệt rõ với văn bản UI
      ctx.font = "italic 700 13px 'STIX Two Text', 'Latin Modern Roman', 'Times New Roman', serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // 1. Halo viền tương phản cho chữ cái (4.5px chống chìm màu triệt để)
      ctx.strokeStyle = effectiveHalo;
      ctx.lineWidth = 4.5;
      ctx.lineJoin = "round";
      ctx.strokeText(baseName, x, y);

      // 2. Chữ cái chính
      ctx.fillStyle = color;
      ctx.fillText(baseName, x, y);

      // 3. Mũi tên vector phía trên đỉnh chữ cái (vẽ đường nét vector độc lập)
      if (hasArrow) {
        const textMetrics = ctx.measureText(baseName);
        const charW = Math.max(9, textMetrics.width);
        const arrowY = y - 8.5; // Ngay ngắn trên đỉnh chữ cái
        const arrowStart = x - charW * 0.52;
        const arrowEnd = x + charW * 0.52 + 1.5;

        // Halo cho mũi tên
        ctx.strokeStyle = effectiveHalo;
        ctx.lineWidth = 4.0;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(arrowStart, arrowY);
        ctx.lineTo(arrowEnd, arrowY);
        ctx.lineTo(arrowEnd - 3.0, arrowY - 2.2);
        ctx.moveTo(arrowEnd, arrowY);
        ctx.lineTo(arrowEnd - 3.0, arrowY + 2.2);
        ctx.stroke();

        // Mũi tên chính sắc nét đồng màu với vector
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(arrowStart, arrowY);
        ctx.lineTo(arrowEnd, arrowY);
        ctx.lineTo(arrowEnd - 3.0, arrowY - 2.2);
        ctx.moveTo(arrowEnd, arrowY);
        ctx.lineTo(arrowEnd - 3.0, arrowY + 2.2);
        ctx.stroke();
      }

      ctx.restore();
    },

    // Hàm tiện ích vẽ 1 vector với mũi tên, viền tương phản halo và nhãn
    drawTransformedVector: function (
      ctx,
      cx,
      cy,
      px,
      vec,
      color,
      shortLabel,
      fullLabel,
      strokeWidth = 3.2,
      arrowHead = 13,
      isUserVector = false,
      hasVectorArrow = true,
      isDashed = false,
      customAngleOffset = 0
    ) {
      const x2 = cx + vec[0] * px;
      const y2 = cy - vec[1] * px;
      const angle = Math.atan2(y2 - cy, x2 - cx);
      const len = Math.hypot(x2 - cx, y2 - cy);

      const dynamicArrow = Math.min(arrowHead, len * 0.35);
      const isDark = document.body.classList.contains("dark-theme") || document.body.classList.contains("dark");
      const haloColor = isDark ? "rgba(24, 25, 27, 0.95)" : "rgba(255, 255, 255, 0.95)";

      ctx.save();

      // Halo viền tương phản cho vector live của người dùng (tránh chìm vào lưới/trục)
      if (isUserVector && len > 1) {
        ctx.save();
        ctx.strokeStyle = haloColor;
        ctx.fillStyle = haloColor;
        ctx.lineWidth = strokeWidth + 3.0;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        if (len > 2) {
          const haloArrow = dynamicArrow + 2.5;
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(
            x2 - haloArrow * Math.cos(angle - Math.PI / 6),
            y2 - haloArrow * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            x2 - haloArrow * Math.cos(angle + Math.PI / 6),
            y2 - haloArrow * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      if (isDashed) {
        ctx.setLineDash([4, 4]);
        ctx.globalAlpha = 0.5;
      }

      // Thân vector
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      if (isDashed) {
        ctx.setLineDash([]);
      }

      // Mũi tên
      if (len > 2) {
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(
          x2 - dynamicArrow * Math.cos(angle - Math.PI / 6),
          y2 - dynamicArrow * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          x2 - dynamicArrow * Math.cos(angle + Math.PI / 6),
          y2 - dynamicArrow * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }

      // Nhãn text học thuật sắc nét - dùng halo stroke chống đụng màu, tuyệt đối không vẽ khối hộp che khuất mũi tên
      if (len > 15) {
        const labelDist = dynamicArrow + 9;
        const effAngle = angle + (customAngleOffset || 0);
        const labelX = x2 + labelDist * Math.cos(effAngle);
        const labelY = y2 + labelDist * Math.sin(effAngle);

        // Khử triệt để mọi ký tự kết hợp gây lỗi glyph
        const cleanName = (shortLabel || "").replace(/[\u20D7\u20D6\u20D0\u20D1⃗]/g, "").trim();

        this.drawVectorMathLabel(ctx, cleanName, labelX, labelY, color, haloColor, hasVectorArrow);
      }

      ctx.restore();
    },
  };

  window.App.LinearTransform = LinearTransform;
})();
