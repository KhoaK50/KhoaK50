// ===================== viewer3D.js (FULL FINAL - FIXED FLASH & GHOST) =====================
(function () {
  window.Vec3D = window.Vec3D || {};

  // --- CẤU HÌNH & CONSTANTS ---
  Vec3D._ZOOM_MIN = 1e-12;
  Vec3D._ZOOM_MAX = 1e12;

  const App = window.App || {};
  const toVec3 = (v) => [
    Number(v?.[0]) || 0,
    Number(v?.[1]) || 0,
    Number(v?.[2]) || 0,
  ];

  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) || window.innerWidth < 768;

  const GEOM_QUALITY = {
    shaftSeg: isMobile ? 12 : 24,
    headSeg: isMobile ? 16 : 32,
    maxPixel: isMobile ? 1.5 : 2,
  };

  const threeLayer = document.getElementById("threeLayer");

  // --- CORE HANDLES ---
  Vec3D._scene = null;
  Vec3D._camera = null;
  Vec3D._renderer = null;
  Vec3D._labelRenderer = null;
  Vec3D._controls = null;

  Vec3D._angleLayer = null;
  Vec3D._vecSignature = "";

  // --- STATE ---
  Vec3D.S3D = {
    unitsPerWorld: 1,
    zoomTarget: 1,
    offset: new THREE.Vector3(0, 0, 0),
    pivotMath: new THREE.Vector3(0, 0, 0),
    pivotWorld: new THREE.Vector3(0, 0, 0),
    hasPivot: false,
  };

  Vec3D._animating = false;
  Vec3D._hover3D = false;
  Vec3D._pressed = new Set();
  Vec3D._kbAnimId = null;
  Vec3D._lastUForVectors = 1;

  // --- CONFIG AXIS ---
  Vec3D._axisMaxMath = 20;
  Vec3D._axisMaxWorld = Vec3D._axisMaxMath;

  // --- GROUPS ---
  Vec3D._frameGroup = null;
  Vec3D._axesGroup = null;
  Vec3D._planeXY = null;
  Vec3D._mathGroup = null;
  Vec3D._vectorsGroup = null;
  Vec3D._ticksGroup = null;
  Vec3D._tickLabels = [];
  Vec3D._axisLetters = [];
  Vec3D._lastLabelKey = "";
  Vec3D.threeVecMap = new Map();

  // --- VISUAL CONFIG ---
  Vec3D.AXIS_TICK_PX = 26;
  Vec3D.AXIS_LETTER_PX = 30;
  Vec3D.TIP_PX = 22;
  Vec3D.ANGLE_LABEL_PX = 28;
  Vec3D.ANGLE_ARC_GAP_PX = 8;
  Vec3D.ANGLE_RADIUS_RATIO = 0.72;
  Vec3D.ANGLE_LABEL_MIN_RATIO = 0.38;
  Vec3D.ANGLE_LABEL_GAP_PX = 6;

  const VEC_SHAFT_R = 0.025;
  const VEC_HEAD_R = 0.08;
  const VEC_HEAD_H = 0.25;

  // [ENERGY PULSE CONFIG 3D]
  const PULSE_COLOR_3D = 0x00ffff;
  const PULSE_SPEED_3D = 0.005;
  const PULSE_SCALE_ADD = 0.3;

  // [TÌM VÀ DÁN ĐÈ VÀO viewer3D.js - THAY THẾ TOÀN BỘ HÀM Vec3D.init3D]
  Vec3D.init3D = function () {
    if (Vec3D._scene) return;

    Vec3D.DEFAULT_FOV = 24;

    if (getComputedStyle(threeLayer).display === "none") {
      threeLayer.style.display = "block";
    }
    const rect = threeLayer.getBoundingClientRect();

    // 1. WebGL Renderer
    Vec3D._renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
    Vec3D._renderer.setSize(rect.width || 760, rect.height || 760);
    Vec3D._renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, GEOM_QUALITY.maxPixel));
    threeLayer.appendChild(Vec3D._renderer.domElement);

    Vec3D._renderer.domElement.style.position = "absolute";
    Vec3D._renderer.domElement.style.inset = "0";
    Vec3D._renderer.domElement.style.zIndex = "0";

    // 2. CSS2D Renderer (Labels)
    Vec3D._labelRenderer = new THREE.CSS2DRenderer();
    Vec3D._labelRenderer.setSize(rect.width || 760, rect.height || 760);
    Vec3D._labelRenderer.domElement.style.position = "absolute";
    Vec3D._labelRenderer.domElement.style.inset = "0";
    
    // [FIX QUAN TRỌNG 1]: Trả lại "none" để DOM chữ không cản trở Radar và Chuột của WebGL
    Vec3D._labelRenderer.domElement.style.pointerEvents = "none"; 
    Vec3D._labelRenderer.domElement.style.overflow = "visible";
    Vec3D._labelRenderer.domElement.style.zIndex = "1";
    threeLayer.appendChild(Vec3D._labelRenderer.domElement);

    // 3. Scene & Camera
    Vec3D._scene = new THREE.Scene();
    const defaultBg = (window.App && App.theme === "dark") ? "#111113" : "#ffffff";
    Vec3D._scene.background = new THREE.Color(App.getCSS?.("--bg") || defaultBg);

    Vec3D._camera = new THREE.PerspectiveCamera(Vec3D.DEFAULT_FOV, Math.max(1e-6, (rect.width || 760) / (rect.height || 760)), 0.1, 1e12);
    Vec3D._camera.position.set(10, 10, 10);
    Vec3D._camera.up.set(0, 0, 1);

    // 4. Controls
    Vec3D._controls = new THREE.OrbitControls(Vec3D._camera, Vec3D._renderer.domElement);
    Vec3D.S3D.unitsPerWorld = 1;
    Vec3D.S3D.zoomTarget = 1;
    Vec3D.S3D.offset.set(0, 0, 0);
    Vec3D.S3D.hasPivot = false;

    Vec3D._controls.enableDamping = true;
    Vec3D._controls.dampingFactor = 0.07;
    Vec3D._controls.rotateSpeed = 0.6;
    Vec3D._controls.addEventListener("start", () => {
      Vec3D._userControlledCamera = true;
    });
    
    // [FIX QUAN TRỌNG 2]: Trả lại quyền Kéo (Pan) Đồ thị cho Chuột Phải
    Vec3D._controls.enablePan = true; 
    Vec3D._controls.enableZoom = false; // Vẫn tắt Zoom mặc định để xài Math Zoom của hệ thống

    Vec3D._controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN, // Kéo rê đồ thị bằng chuột phải
    };

    Vec3D._controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.PAN, // Kéo đồ thị bằng 2 ngón
    };

    // ==========================================
    // CƠ CHẾ MATH ZOOM VÀ TƯƠNG TÁC VECTOR (RAYCASTER)
    // ==========================================
    const renderDom = Vec3D._renderer.domElement;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let dragPlane = new THREE.Plane();
    let dragOffset = new THREE.Vector3();
    let constraintStart = new THREE.Vector3(); // Lưu vị trí bắt đầu kéo
    
    // Biến lưu trạng thái khóa trục hiện tại ('x', 'y', 'z' hoặc null)
    Vec3D.S3D.axisConstraint = null; 

    // Gắn sự kiện cho 3 nút UI Khóa trục
    const axisPanel = document.getElementById("axisControls");
    if (axisPanel) {
        const btns = axisPanel.querySelectorAll(".axis-btn");
        btns.forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                btns.forEach(b => b.classList.remove("active"));
                if (Vec3D.S3D.axisConstraint === btn.dataset.axis) {
                    Vec3D.S3D.axisConstraint = null; // Bấm lại thì tắt
                } else {
                    btn.classList.add("active");
                    Vec3D.S3D.axisConstraint = btn.dataset.axis; // Bật khóa
                }
            });
        });
    }

    const applyMathZoom = (dir, factor) => {
      if ((Vec3D.S3D.zoomTarget >= Vec3D._ZOOM_MAX && dir > 0) || (Vec3D.S3D.zoomTarget <= Vec3D._ZOOM_MIN && dir < 0)) {
        Vec3D.S3D.hasPivot = false; return;
      }
      Vec3D.S3D.pivotMath.set(0, 0, 0);
      Vec3D.S3D.pivotWorld.copy(Vec3D.S3D.offset);
      Vec3D.S3D.hasPivot = true;
      const next = Vec3D.S3D.zoomTarget * factor;
      Vec3D.S3D.zoomTarget = Math.min(Vec3D._ZOOM_MAX, Math.max(Vec3D._ZOOM_MIN, next));
    };

    const wheelHandler = (e) => {
      e.preventDefault(); e.stopImmediatePropagation();
      const dir = e.deltaY < 0 ? +1 : -1;
      const factor = dir > 0 ? 1.12 : 1 / 1.12;
      applyMathZoom(dir, factor);

      if (Vec3D.S3D.draggedVectorId && !Vec3D.S3D.axisConstraint) {
          const group = Vec3D.threeVecMap.get(Vec3D.S3D.draggedVectorId);
          if (group) {
              const tipWorld = group.userData.tipLocal.clone().multiplyScalar(factor).add(Vec3D.S3D.offset);
              const camDir = new THREE.Vector3();
              Vec3D._camera.getWorldDirection(camDir);
              dragPlane.setFromNormalAndCoplanarPoint(camDir.multiplyScalar(-1), tipWorld);
              pointerMoveHandler(e); 
          }
      }
    };
    renderDom.addEventListener("wheel", wheelHandler, { passive: false });

    // POINTER DOWN: Tóm Vector
    const pointerDownHandler = (e) => {
      
      if (!e.touches && e.button !== 0) return; 
      
      const rect = renderDom.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      mouse.x = ((cx - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((cy - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, Vec3D._camera);

      if (Vec3D._vectorsGroup) {
          const heads = [];
          Vec3D._vectorsGroup.traverse(child => {
              if (child.isMesh && child.geometry && child.geometry.type === "ConeGeometry" && child.visible) {
                  heads.push(child);
              }
          });

          raycaster.params.Line.threshold = 0.5;
          const intersects = raycaster.intersectObjects(heads, false);
          
          if (intersects.length > 0) {
              let group = intersects[0].object.parent;
              let hitId = null;
              for (let [id, grp] of Vec3D.threeVecMap.entries()) {
                  if (grp === group) { hitId = id; break; }
              }

              if (hitId && !(window.App && App.isAnimating)) {
                  Vec3D.S3D.draggedVectorId = hitId;
                  if (window.App && App.History && typeof App.History.snapshot === "function") {
                    Vec3D.S3D._dragPreState = App.History.snapshot(`Di chuyển vector #${hitId}`);
                    const hitV = App.vectorList.find((v) => v.id === hitId);
                    Vec3D.S3D._dragStartVec = hitV ? [...hitV.vec] : null;
                  }
                  Vec3D._controls.enabled = false; 

                  const tipWorld = group.userData.tipLocal.clone().add(Vec3D.S3D.offset);
                  constraintStart.copy(tipWorld); // Lưu gốc để trượt

                  const camDir = new THREE.Vector3();
                  Vec3D._camera.getWorldDirection(camDir);

                  // NẾU ĐANG KHÓA TRỤC: Tạo mặt phẳng chứa trục đó và hướng về Camera
                  if (Vec3D.S3D.axisConstraint) {
                      const constraintLine = new THREE.Vector3();
                      if (Vec3D.S3D.axisConstraint === 'x') constraintLine.x = 1;
                      if (Vec3D.S3D.axisConstraint === 'y') constraintLine.y = 1;
                      if (Vec3D.S3D.axisConstraint === 'z') constraintLine.z = 1;

                      // Tính pháp tuyến mặt phẳng: Normal = (Axis) Cross (Camera Cross Axis)
                      const planeNormal = new THREE.Vector3().crossVectors(
                          constraintLine, 
                          new THREE.Vector3().crossVectors(camDir, constraintLine)
                      ).normalize();
                      
                      // Fix lỗi nếu nhìn thẳng góc trục
                      if (planeNormal.lengthSq() < 0.001) planeNormal.copy(camDir).multiplyScalar(-1);
                      dragPlane.setFromNormalAndCoplanarPoint(planeNormal, tipWorld);
                  } else {
                      // KÉO TỰ DO: Dùng mặt phẳng song song Camera như cũ
                      dragPlane.setFromNormalAndCoplanarPoint(camDir.multiplyScalar(-1), tipWorld);
                  }

                  const planeIntersect = new THREE.Vector3();
                  raycaster.ray.intersectPlane(dragPlane, planeIntersect);
                  if (planeIntersect) dragOffset.copy(planeIntersect).sub(tipWorld);

                  e.preventDefault(); e.stopImmediatePropagation();
                  renderDom.setPointerCapture(e.pointerId || (e.touches ? e.touches[0].identifier : 0));
                  renderDom.style.cursor = Vec3D.S3D.axisConstraint ? "ns-resize" : "crosshair";
              }
          }
      }
    };
    
    // POINTER MOVE: Trượt Vector
    const pointerMoveHandler = (e) => {
      if (!Vec3D.S3D.draggedVectorId) return; 
      
      e.preventDefault(); e.stopImmediatePropagation();
      const vItem = App.vectorList.find(v => v.id === Vec3D.S3D.draggedVectorId);
      if (!vItem) return;

      const rect = renderDom.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      mouse.x = ((cx - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((cy - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, Vec3D._camera);
      const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
      
      // [FIX NAM CHÂM]: Chỉ dùng Ctrl, lấy thông số vạch lưới hiện tại để hít
      const isSnap = e.ctrlKey; 
      const step = Vec3D.S3D.stepUnit || 1; 

      const intersect = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragPlane, intersect);
      
      if (intersect) {
          let newPosWorld;
          
          if (Vec3D.S3D.axisConstraint) {
              const constraintLine = new THREE.Vector3();
              if (Vec3D.S3D.axisConstraint === 'x') constraintLine.x = 1;
              if (Vec3D.S3D.axisConstraint === 'y') constraintLine.y = 1;
              if (Vec3D.S3D.axisConstraint === 'z') constraintLine.z = 1;

              const diff = new THREE.Vector3().subVectors(intersect, constraintStart);
              const projLen = diff.dot(constraintLine); 
              newPosWorld = constraintStart.clone().add(constraintLine.multiplyScalar(projLen));
          } else {
              newPosWorld = intersect.clone().sub(dragOffset);
          }

          newPosWorld.sub(Vec3D.S3D.offset); 
          
          let nx = newPosWorld.x / u;
          let ny = newPosWorld.y / u;
          let nz = newPosWorld.z / u;

          // LÀM TRÒN THEO CHUẨN VẠCH LƯỚI (VD: Lưới 0.5 thì 1.1 -> 1.0, 1.4 -> 1.5)
          if (isSnap) { 
              nx = Math.round(nx / step) * step; 
              ny = Math.round(ny / step) * step; 
              nz = Math.round(nz / step) * step; 
          }
          
          if (Vec3D.S3D.axisConstraint === 'x') vItem.vec[0] = nx;
          else if (Vec3D.S3D.axisConstraint === 'y') vItem.vec[1] = ny;
          else if (Vec3D.S3D.axisConstraint === 'z') vItem.vec[2] = nz;
          else { vItem.vec[0] = nx; vItem.vec[1] = ny; vItem.vec[2] = nz; }
      }
      // [LIVE SYNC] ÉP ĐỒNG BỘ PHÉP CHIẾU BÊN 3D (ZERO LAG)
      if (App.currentProjVisual) {
          const v1 = App.vectorList.find(v => v.id === App.currentProjVisual.v1Id);
          const res = App.vectorList.find(v => v.id === App.currentProjVisual.resId);
          const v2 = App.vectorList.find(v => v.id === App.currentProjVisual.v2Id);
          
          if (v1 && res && v2 && (vItem.id === v1.id || vItem.id === v2.id)) {
              let dot = 0, magSq = 0;
              const dim = Math.max(v1.vec.length, v2.vec.length);
              for (let i = 0; i < dim; i++) {
                  const a = v1.vec[i] || 0;
                  const b = v2.vec[i] || 0;
                  dot += a * b;
                  magSq += b * b;
              }
              if (magSq > 1e-9) {
                  const scalar = dot / magSq;
                  res.vec = v2.vec.map(b => b * scalar);
              } else {
                  res.vec = v2.vec.map(() => 0);
              }
              // Lưu ý: Không cần gọi hàm phụ, vì file 3D đã có sync3D loop quét liên tục!
          }
      }
      const placeholder = "[" + vItem.vec.map((val, i) => {
          if (!Vec3D.S3D.axisConstraint && i < 3) return "...";
          if (Vec3D.S3D.axisConstraint) {
              if (Vec3D.S3D.axisConstraint === 'x' && i === 0) return "...";
              if (Vec3D.S3D.axisConstraint === 'y' && i === 1) return "...";
              if (Vec3D.S3D.axisConstraint === 'z' && i === 2) return "...";
          }
          return Number(val).toFixed(2).replace(/\.?0+$/, "");
      }).join(", ") + "]";
      App.coordOut?.(placeholder);

      const group = Vec3D.threeVecMap.get(Vec3D.S3D.draggedVectorId);
      if (group) {
          const lbl = group.children.find(ch => ch.isCSS2DObject);
          if (lbl) lbl.visible = false;
      }
      Vec3D.draw3DAllVectors(); 
    };

    // POINTER UP: Thả chuột chốt số
    const pointerUpHandler = (e) => {
      if (Vec3D.S3D.draggedVectorId) {
          // 1. Chốt số Vector vật thể
          const draggedVec = App.vectorList.find(v => v.id === Vec3D.S3D.draggedVectorId);
          if (draggedVec) {
              draggedVec.vec = draggedVec.vec.map(val => Number(Number(val).toFixed(2)));
              draggedVec.latex = `[${draggedVec.vec.join(", ")}]`;

              // [HOÀN TÁC THÔNG MINH]: Chỉ lưu nếu vector có thay đổi vị trí thực tế
              if (
                Vec3D.S3D._dragPreState &&
                Vec3D.S3D._dragStartVec &&
                window.App &&
                App.History &&
                typeof App.History.record === "function"
              ) {
                const moved = draggedVec.vec.some(
                  (val, i) => Math.abs(val - (Vec3D.S3D._dragStartVec[i] || 0)) > 0.001
                );
                if (moved) {
                  App.History.record(`Di chuyển vector #${draggedVec.id}`, Vec3D.S3D._dragPreState);
                }
              }
          }

          Vec3D.S3D._dragPreState = null;
          Vec3D.S3D._dragStartVec = null;
          Vec3D.S3D.draggedVectorId = null;
          Vec3D._controls.enabled = true; // Mở lại OrbitControls
          renderDom.style.cursor = "default";
          if (renderDom.releasePointerCapture && e.pointerId) renderDom.releasePointerCapture(e.pointerId);

          // 2. Chốt số Vector bóng (Hình chiếu)
          if (App.currentProjVisual) {
              const res = App.vectorList.find(v => v.id === App.currentProjVisual.resId);
              const mf = document.querySelector("#calcSteps math-field");
              if (res) {
                  res.vec = res.vec.map(val => Number(Number(val).toFixed(2))); 
                  res.latex = `[${res.vec.join(", ")}]`;
                  if (mf) {
                      mf.value = `\\left( ${res.vec.join(",\\; ")} \\right)`;
                  }
              }
          }

          if (App.renderVectorList) App.renderVectorList();
          if (App.refreshCalcVectorOptions) App.refreshCalcVectorOptions();
          
          Vec3D.draw3DAllVectors();
      }
    };

    renderDom.addEventListener("pointerdown", pointerDownHandler);
    renderDom.addEventListener("pointermove", pointerMoveHandler);
    renderDom.addEventListener("pointerup", pointerUpHandler);
    renderDom.addEventListener("pointercancel", pointerUpHandler);

    // Kéo 2 ngón Mobile (Zoom & Pan)
    let lastTouchDistance = null;
    renderDom.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDistance = Math.hypot(dx, dy);
      } else {
        lastTouchDistance = null;
      }
    }, { passive: false });

    renderDom.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2 && lastTouchDistance !== null) {
        e.preventDefault(); e.stopImmediatePropagation();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.hypot(dx, dy);
        const distDiff = currentDist - lastTouchDistance;

        if (Math.abs(distDiff) > 1) {
          const factor = distDiff > 0 ? 1.05 : 1 / 1.05;
          applyMathZoom(distDiff > 0 ? 1 : -1, factor);
          lastTouchDistance = currentDist;
          if (Vec3D.S3D.draggedVectorId) {
             const group = Vec3D.threeVecMap.get(Vec3D.S3D.draggedVectorId);
             if (group && !isDepthDrag) {
                 const tipWorld = group.userData.tipLocal.clone().multiplyScalar(factor).add(Vec3D.S3D.offset);
                 const camDir = new THREE.Vector3();
                 Vec3D._camera.getWorldDirection(camDir);
                 dragPlane.setFromNormalAndCoplanarPoint(camDir.multiplyScalar(-1), tipWorld);
                 pointerMoveHandler(e);
             }
          }
        }
      }
    }, { passive: false });

    renderDom.addEventListener("touchend", () => { lastTouchDistance = null; });

    // --- CÁC SỰ KIỆN KHÁC (Change, Resize, Keydown) ---
    Vec3D._controls.addEventListener("change", () => {
      if (App.mode !== "3D") return;
      Vec3D.addAxisLabelsDynamic();
      Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
      Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
    });

    const onResize = () => {
      const r = threeLayer.getBoundingClientRect();
      Vec3D._camera.aspect = Math.max(1e-6, (r.width || 760) / (r.height || 760));
      Vec3D._camera.updateProjectionMatrix();
      Vec3D._renderer.setSize(r.width || 760, r.height || 760);
      Vec3D._labelRenderer.setSize(r.width || 760, r.height || 760);
      if (App.mode === "3D") Vec3D.hardRefresh3D(false);
    };
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(threeLayer);

    renderDom.addEventListener("mouseenter", () => { Vec3D._hover3D = true; threeLayer.focus(); });
    renderDom.addEventListener("mouseleave", () => { Vec3D._hover3D = false; });

    document.addEventListener("keydown", (e) => {
      const controlsPane = document.getElementById("controls");
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) || (controlsPane && controlsPane.contains(e.target));
      if (App.mode !== "3D" || !Vec3D._hover3D || typing) return;
      const key = e.key.toLowerCase();
      Vec3D._pressed.add(key);
      if (["w", "a", "s", "d", "q", "e", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(key)) {
        e.preventDefault(); e.stopPropagation();
      }
    }, { capture: true });

    document.addEventListener("keyup", (e) => {
      const controlsPane = document.getElementById("controls");
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) || (controlsPane && controlsPane.contains(e.target));
      if (typing) return;
      const key = e.key.toLowerCase();
      if (Vec3D._pressed.has(key)) {
        Vec3D._pressed.delete(key);
        e.preventDefault(); e.stopPropagation();

        // Vừa nhả hết phím WASD xong -> Chốt sổ
        if (["w", "a", "s", "d", "q", "e"].includes(key) && Vec3D._pressed.size === 0) {
            const activeVec = App.vectorList.find(v => v.id === Vec3D.S3D.activeVectorId || v.focus);
            if (activeVec) {
                if (App.renderVectorList) App.renderVectorList();
                if (App.refreshCalcVectorOptions) App.refreshCalcVectorOptions();
                
                // [FIX LỖI ANIMATION CHẠY LẠI]: Bỏ btn.click(), ép chữ hiển thị tức thì
                if (App.currentProjVisual) {
                    const res = App.vectorList.find(v => v.id === App.currentProjVisual.resId);
                    const mf = document.querySelector("#calcSteps math-field");
                    if (res && mf) {
                        const fmtVal = (n) => {
                            let x = Number(n);
                            if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
                            return String(parseFloat(x.toFixed(4)));
                        };
                        mf.value = `\\left( ${res.vec.map(fmtVal).join(",\\; ")} \\right)`;
                    }
                }
                Vec3D.draw3DAllVectors();
            }
        }
      }
    }, { capture: true });

    const stepLoop = () => {
      if (App.mode === "3D" && Vec3D._pressed.size && Vec3D._camera && Vec3D._controls) {
        
        // 1. Tính toán hướng mũi Camera hiện tại
        const forward = new THREE.Vector3();
        Vec3D._camera.getWorldDirection(forward);
        forward.normalize();
        
        const worldUp = new THREE.Vector3(0, 0, 1);
        const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
        
        const move = new THREE.Vector3();
        if (Vec3D._pressed.has("w")) move.add(forward);
        if (Vec3D._pressed.has("s")) move.sub(forward);
        if (Vec3D._pressed.has("a")) move.sub(right);
        if (Vec3D._pressed.has("d")) move.add(right);
        
        // [BONUS CỦA TUI]: Nhấn Q để đẩy thẳng lên trời, E để dìm thẳng xuống đất (trục Z)
        if (Vec3D._pressed.has("q")) move.add(worldUp);
        if (Vec3D._pressed.has("e")) move.sub(worldUp);

        if (move.lengthSq() > 0) {
          move.normalize();

          // 2. TÌM VẬT THỂ CẦN ĐIỀU KHIỂN: Ưu tiên Vector đang click hoặc Vector đang chọn ở Sidebar
          const activeVec = App.vectorList.find(v => v.id === Vec3D.S3D.activeVectorId || v.focus);
          
          if (activeVec) {
              // --- CHẾ ĐỘ LÁI VECTOR ---
              const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
              // Shift để tăng tốc độ lái (bay nhanh hơn)
              const speed = (Vec3D._pressed.has("shift") ? 0.05 : 0.01) * (Vec3D._axisMaxWorld / u);
              move.multiplyScalar(speed);

              // Cập nhật thẳng tọa độ Toán học
              activeVec.vec[0] = (activeVec.vec[0] || 0) + move.x / u;
              activeVec.vec[1] = (activeVec.vec[1] || 0) + move.y / u;
              activeVec.vec[2] = (activeVec.vec[2] || 0) + move.z / u;

              // Giao diện tĩnh lặng [..., ..., ..., N]
              const placeholder = "[" + activeVec.vec.map((val, i) => i < 3 ? "..." : val).join(", ") + "]";
              App.coordOut?.(placeholder);

              // Ẩn Label để tránh vướng víu
              const group = Vec3D.threeVecMap.get(activeVec.id);
              if (group) {
                  const lbl = group.children.find(ch => ch.isCSS2DObject);
                  if (lbl) lbl.visible = false;
              }
              
              // Gọi Card màn hình vẽ lại ngay lập tức
              Vec3D.draw3DAllVectors();
              
          } else {
              // --- CHẾ ĐỘ LÁI CAMERA VỀ GỐC (Nếu không có vector nào được chọn) ---
              const base = Vec3D._camera.position.distanceTo(Vec3D._controls.target);
              const speed = (Vec3D._pressed.has("shift") ? 0.01 : 0.005) * base;
              move.multiplyScalar(speed);
              Vec3D._camera.position.add(move);
              Vec3D._controls.target.add(move);
              Vec3D._controls.update();
          }
        }
      }
      Vec3D._kbAnimId = requestAnimationFrame(stepLoop);
    };
    if (!Vec3D._kbAnimId) Vec3D._kbAnimId = requestAnimationFrame(stepLoop);

    Vec3D.update3DHelpersBase();
    Vec3D.show3D();
    requestAnimationFrame(() => Vec3D.hardRefresh3D(false));
  };

  // =========================================================
  // SYNC & RENDER LOOP
  // =========================================================
  Vec3D._syncVectorList = function () {
    const list = (App.vectorList || []).map((v) => [
      v.id ?? null,
      v.visible !== false ? 1 : 0,
      ...toVec3(v.vec).map((val) => +val.toFixed(12)),
      v.focus ? 1 : 0,
      +(typeof v.alpha === "number" ? v.alpha : 1).toFixed(3),
      String(v.colorHex || v.colorCss || ""),
    ]);
    const sig = JSON.stringify(list);
    if (sig !== Vec3D._vecSignature) {
      Vec3D._vecSignature = sig;
      Vec3D.draw3DAllVectors({
        frame: false,
      });
      if (Vec3D._renderer) Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
      if (Vec3D._labelRenderer)
        Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
    }
  };

  Vec3D.show3D = function () {
    if (!Vec3D._scene) Vec3D.init3D();
    const defaultBg = (window.App && App.theme === "dark") ? "#111113" : "#ffffff";
    if (Vec3D._scene) Vec3D._scene.background = new THREE.Color(App.getCSS?.("--bg") || defaultBg);

    const c2d = document.getElementById("canvas2d");
    if (c2d) c2d.style.display = "none";
    threeLayer.style.display = "block";
    try {
      threeLayer.focus({
        preventScroll: true,
      });
    } catch (_) {}
    Vec3D._hover3D = true;

    if (!Vec3D._animating) {
      Vec3D._animating = true;
      (function loop() {
        if (!Vec3D._animating) return;
        requestAnimationFrame(loop);

        // --- ENERGY PULSE (Focus) ---
        if (Vec3D._vectorsGroup) {
          const time = Date.now() * PULSE_SPEED_3D;
          const pulseOpacity = 0.2 + ((Math.sin(time) + 1) / 2) * 0.5; // 0.2 -> 0.7

          Vec3D._vectorsGroup.traverse((obj) => {
            if (obj.userData?.isFocusPulse && obj.material) {
              obj.material.opacity = pulseOpacity;
            }
          });
        }
        // -----------------------------

        if (Vec3D._controls) {
          Vec3D._controls.update();
          Vec3D._syncVectorList();
        }
        const target = Math.min(
          Vec3D._ZOOM_MAX,
          Math.max(Vec3D._ZOOM_MIN, Vec3D.S3D.zoomTarget),
        );
        Vec3D.S3D.unitsPerWorld = target;
        const diff = Math.abs(Vec3D.S3D.unitsPerWorld - target);
        const eps = Math.max(1e-9, Math.abs(target) * 1e-9);
        if (diff <= eps) {
          Vec3D.S3D.unitsPerWorld = target;
          Vec3D.S3D.hasPivot = false;
        }
        Vec3D.addAxisLabelsDynamic();
        if (Vec3D._renderer)
          Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
        if (Vec3D._labelRenderer)
          Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
      })();
    }
  };

  // =========================================================
  // SCENE HELPERS (GRID, AXES)
  // =========================================================
  Vec3D.update3DHelpersBase = function () {
    if (!Vec3D._scene) return;

    const Lw = Vec3D._axisMaxWorld;
    if (!Vec3D._frameGroup) {
      Vec3D._frameGroup = new THREE.Group();
      Vec3D._scene.add(Vec3D._frameGroup);
    } else {
      Vec3D._frameGroup.clear();
    }

    const cube = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(Lw * 2, Lw * 2, Lw * 2)),
      new THREE.LineBasicMaterial({
        color: 0x666666,
        transparent: true,
        opacity: 0.25,
      }),
    );
    Vec3D._frameGroup.add(cube);

    if (!Vec3D._mathGroup) {
      Vec3D._mathGroup = new THREE.Group();
      Vec3D._scene.add(Vec3D._mathGroup);
    } else {
      const keepVectors = Vec3D._vectorsGroup || new THREE.Group();
      const keepAngles = Vec3D._angleLayer || new THREE.Group();
      const keepTransform = Vec3D._transformGroup || null;
      keepVectors.parent && keepVectors.parent.remove(keepVectors);
      keepAngles.parent && keepAngles.parent.remove(keepAngles);
      if (keepTransform && keepTransform.parent) keepTransform.parent.remove(keepTransform);
      Vec3D._mathGroup.clear();
      Vec3D._vectorsGroup = keepVectors;
      Vec3D._angleLayer = keepAngles;
      if (keepTransform) Vec3D._transformGroup = keepTransform;
    }
    if (!Vec3D._vectorsGroup) Vec3D._vectorsGroup = new THREE.Group();
    if (!Vec3D._angleLayer) Vec3D._angleLayer = new THREE.Group();

    Vec3D._planeXY = new THREE.Mesh(
      new THREE.PlaneGeometry(Lw * 2, Lw * 2),
      new THREE.MeshBasicMaterial({
        color: App.getCSS?.("--card") || "#222",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      }),
    );
    Vec3D._planeXY.renderOrder = 0;
    Vec3D._mathGroup.add(Vec3D._planeXY);

    Vec3D._axesGroup = (function buildAxesWorld(L) {
      const g = new THREE.Group();
      const mk = (a, b, cssVar) =>
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([a, b]),
          new THREE.LineBasicMaterial({
            color: new THREE.Color(App.getCSS?.(cssVar) || "#888"),
          }),
        );
      g.add(
        mk(new THREE.Vector3(-L, 0, 0), new THREE.Vector3(L, 0, 0), "--axis-x"),
      );
      g.add(
        mk(new THREE.Vector3(0, -L, 0), new THREE.Vector3(0, L, 0), "--axis-y"),
      );
      g.add(
        mk(new THREE.Vector3(0, 0, -L), new THREE.Vector3(0, 0, L), "--axis-z"),
      );
      return g;
    })(Lw);
    Vec3D._mathGroup.add(Vec3D._axesGroup);
    Vec3D._mathGroup.add(Vec3D._vectorsGroup);
    Vec3D._mathGroup.add(Vec3D._angleLayer);
    if (Vec3D._transformGroup) Vec3D._mathGroup.add(Vec3D._transformGroup);
    Vec3D._mathGroup.position.copy(Vec3D.S3D.offset);
  };

  function niceStep(raw) {
    raw = Math.max(1e-12, Math.abs(raw));
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const s = raw / p;
    const m = s <= 1 ? 1 : s <= 2 ? 2 : s <= 5 ? 5 : 10;
    
    // [FIX] Bỏ Math.max(1, ...) để cho phép vạch chia là số thập phân (vd: 0.1, 0.01...)
    return m * p; 
  }

  function formatTick(v, step) {
    if (!isFinite(v)) return "";
    const abs = Math.abs(v);
    if (abs === 0) return "0";
    const s = Math.max(1e-300, Math.abs(step || 1));
    const expStep = Math.floor(Math.log10(s));
    let sig = 1 + (Math.floor(Math.log10(abs)) - expStep);
    sig = Math.max(1, Math.min(6, sig));
    if (abs >= 1e6 || abs < 1e-6)
      return Number(v)
        .toExponential(sig - 1)
        .replace("+", "");
    const dec = Math.max(0, -expStep);
    let out = (Math.round(v / step) * step).toFixed(Math.min(6, dec));
    if (out.includes(".")) out = out.replace(/\.?0+$/, "");
    return out;
  }

  // =========================================================
  // DYNAMIC LABELS
  // =========================================================
  Vec3D.addAxisLabelsDynamic = function () {
    if (!Vec3D._camera || !Vec3D._renderer || !Vec3D._mathGroup) return;
    const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
    const Lw = Vec3D._axisMaxWorld;
    const Lm = Lw / u;

    if (Vec3D.S3D.hasPivot) {
      const pos = Vec3D.S3D.pivotWorld
        .clone()
        .sub(Vec3D.S3D.pivotMath.clone().multiplyScalar(u));
      Vec3D.S3D.offset.copy(pos);
    }
    Vec3D._mathGroup.position.copy(Vec3D.S3D.offset);

    const dist = Vec3D._camera.position.distanceTo(
      Vec3D._controls?.target || new THREE.Vector3(),
    );
    const vFOV = (Vec3D._camera.fov * Math.PI) / 180;
    const screenH = Math.max(1, Vec3D._renderer.domElement.clientHeight);
    const worldH = 2 * Math.tan(vFOV / 2) * dist;
    const pxPerWorld = screenH / worldH;
    const pxPerMath = pxPerWorld * u;
    Vec3D._pxPerWorld = pxPerWorld;

    const uChanged = Math.abs(u - (Vec3D._lastUForVectors || 0)) > 1e-6;
    const distChanged = Vec3D._lastDistForVectors !== undefined && Math.abs(dist - Vec3D._lastDistForVectors) > 0.1;

    if (uChanged || distChanged) {
      Vec3D.draw3DAllVectors({
        frame: false,
      });
      const g = App.currentAngleVisual3D;
      if (g?.userData?.angleMeta) {
        const u0 = g.userData.angleMeta.createdU || 1;
        const s = u / u0;
        g.scale.set(s, s, s);
        
      }
      Vec3D._lastUForVectors = u;
      Vec3D._lastDistForVectors = dist;
    }

    const targetPx = 80;
    const step = niceStep(targetPx / Math.max(1e-30, pxPerMath));
    Vec3D.S3D.stepUnit = step;
    const off = Vec3D.S3D.offset;
    const key = `${Lw}|${step}|${u}|${App.theme}|${Math.round(dist * 1000)}|${off.x.toFixed(4)},${off.y.toFixed(4)},${off.z.toFixed(4)}`;

    if (key === Vec3D._lastLabelKey) return;
    Vec3D._lastLabelKey = key;

    if (Vec3D._ticksGroup) {
      Vec3D._mathGroup.remove(Vec3D._ticksGroup);
      Vec3D._ticksGroup.geometry.dispose();
      Vec3D._ticksGroup.material.dispose();
      Vec3D._ticksGroup = null;
    }
    for (const o of Vec3D._tickLabels) {
      o.element?.remove();
      o.parent?.remove(o);
    }
    for (const o of Vec3D._axisLetters) {
      o.element?.remove();
      o.parent?.remove(o);
    }
    Vec3D._tickLabels.length = 0;
    Vec3D._axisLetters.length = 0;

    const t0x = -Vec3D.S3D.offset.x / u;
    const t0y = -Vec3D.S3D.offset.y / u;
    const t0z = -Vec3D.S3D.offset.z / u;

    function buildMajorsAround(t0) {
      const start = Math.ceil((t0 - Lm) / step) * step;
      const end = Math.floor((t0 + Lm) / step) * step;
      const arr = [];
      for (let t = start; t <= end + 1e-12; t += step) arr.push(+t.toFixed(12));
      return arr;
    }
    const majorsX = buildMajorsAround(t0x);
    const majorsY = buildMajorsAround(t0y);
    const majorsZ = buildMajorsAround(t0z);

    const tickLenW = Math.max(Lw * 0.02, 0.25);
    const pos = [];
    const addMajor = (axis, tMath) => {
      const s = tMath * u;
      if (axis === "x") pos.push(s, -tickLenW, 0, s, +tickLenW, 0);
      if (axis === "y") pos.push(-tickLenW, s, 0, +tickLenW, s, 0);
      if (axis === "z") pos.push(-tickLenW, 0, s, +tickLenW, 0, s);
    };
    majorsX.forEach((t) => addMajor("x", t));
    majorsY.forEach((t) => addMajor("y", t));
    majorsZ.forEach((t) => addMajor("z", t));

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    Vec3D._ticksGroup = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({
        color: new THREE.Color(App.getCSS?.("--grid-light") || "#444").getHex(),
      }),
    );
    Vec3D._mathGroup.add(Vec3D._ticksGroup);

    const putLabel = (axis, tMath) => {
      if (Math.abs(tMath) <= 1e-12) return;
      const txt = formatTick(tMath, step);
      const outer = document.createElement("div");
      outer.className = "axis-label-outer";
      const inner = document.createElement("div");
      inner.className = `axis-label-inner axis-${axis}`;
      inner.textContent = txt;
      inner.style.color =
        axis === "x"
          ? App.getCSS?.("--axis-x") || "red"
          : axis === "y"
            ? App.getCSS?.("--axis-y") || "green"
            : App.getCSS?.("--axis-z") || "blue";
      outer.appendChild(inner);
      const obj = new THREE.CSS2DObject(outer);
      const s = tMath * u;
      obj.position.set(
        axis === "x" ? s : 0,
        axis === "y" ? s : 0,
        axis === "z" ? s : 0,
      );
      Vec3D._mathGroup.add(obj);
      Vec3D._tickLabels.push(obj);
    };
    majorsX.forEach((t) => putLabel("x", t));
    majorsY.forEach((t) => putLabel("y", t));
    majorsZ.forEach((t) => putLabel("z", t));

    const letterOffW = Lw * 0.98;
    const addLetter = (txt, axis, position) => {
      const el = document.createElement("div");
      el.className = "axis-letter";
      el.textContent = txt;
      el.style.color =
        axis === "x"
          ? App.getCSS?.("--axis-x") || "red"
          : axis === "y"
            ? App.getCSS?.("--axis-y") || "green"
            : App.getCSS?.("--axis-z") || "blue";
      const obj = new THREE.CSS2DObject(el);
      obj.position.copy(position);
      Vec3D._mathGroup.add(obj);
      Vec3D._axisLetters.push(obj);
    };
    addLetter("X", "x", new THREE.Vector3(letterOffW, 0, 0));
    addLetter("Y", "y", new THREE.Vector3(0, letterOffW, 0));
    addLetter("Z", "z", new THREE.Vector3(0, 0, letterOffW));

    (function updateTipLabels() {
      if (!Vec3D._vectorsGroup) return;
      // Dịch nhãn ra xa một chút (đơn vị pixel) để không đè vào mũi tên
      const desiredPx = 25; 
      const offsetW = desiredPx / (Vec3D._pxPerWorld || 1);
      
      for (const g of Vec3D._vectorsGroup.children) {
        const tip = g.userData?.tipLocal;
        if (!tip) continue;
        const lbl = g.children.find(ch => ch.isCSS2DObject && ch.name === "tipLabel");
        if (!lbl) continue;
        
        // Đẩy nhãn lệch ra một khoảng cố định (tip + offset)
        lbl.position.copy(tip.clone().add(new THREE.Vector3(offsetW, offsetW, offsetW)));
      }
    })();

    (function updateAngleLabel() {
      const g = App.currentAngleVisual3D;
      if (!g || !g.userData?.angleMeta) return;
      const {
        midDir,
        r,
        labelPx = Vec3D.ANGLE_LABEL_PX,
        gapPx = Vec3D.ANGLE_LABEL_GAP_PX,
      } = g.userData.angleMeta;
      const lbl = g.children.find((ch) => ch.isCSS2DObject);
      if (!lbl) return;
      const pxPerWorld = Vec3D._pxPerWorld || 1;
      const s = g.scale?.x || 1;
      const padPx = (gapPx || 0) + (labelPx || 0) * 0.5;
      const insetW = padPx / pxPerWorld;
      const distLocal = r + outsetW / s;
      lbl.position.copy(midDir.clone().multiplyScalar(distLocal));
    })();
  };

  // =========================================================
  // VECTOR DRAWING
  // =========================================================
  Vec3D.buildProjectionGroupZUp = function (
    vecWorld,
    colorCSS = "#444",
    alpha = 1,
  ) {
    const g = new THREE.Group();
    const [x, y, z] = vecWorld;
    const mat = new THREE.LineDashedMaterial({
      color: new THREE.Color(colorCSS),
      dashSize: 0.6,
      gapSize: 0.35,
      transparent: true,
      opacity: Math.max(0, Math.min(1, Number(alpha) || 0)),
    });
    const mk = (pts) => {
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const l = new THREE.Line(geo, mat);
      l.computeLineDistances();
      return l;
    };
    g.add(mk([new THREE.Vector3(x, y, z), new THREE.Vector3(x, y, 0)]));
    g.add(mk([new THREE.Vector3(x, y, z), new THREE.Vector3(0, y, z)]));
    g.add(mk([new THREE.Vector3(x, y, z), new THREE.Vector3(x, 0, z)]));
    g.add(mk([new THREE.Vector3(x, y, 0), new THREE.Vector3(x, 0, 0)]));
    g.add(mk([new THREE.Vector3(x, y, 0), new THREE.Vector3(0, y, 0)]));
    g.add(mk([new THREE.Vector3(0, y, z), new THREE.Vector3(0, 0, z)]));
    g.add(mk([new THREE.Vector3(x, 0, z), new THREE.Vector3(0, 0, z)]));
    g.add(mk([new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, y, 0)]));
    g.add(mk([new THREE.Vector3(0, y, 0), new THREE.Vector3(x, y, 0)]));
    g.add(mk([new THREE.Vector3(0, 0, z), new THREE.Vector3(x, 0, z)]));
    g.add(mk([new THREE.Vector3(0, 0, z), new THREE.Vector3(0, y, z)]));
    return g;
  };

  function clipToCubeMath(x, y, z, L) {
    const tip = new THREE.Vector3(x, y, z);
    if (Math.abs(x) <= L && Math.abs(y) <= L && Math.abs(z) <= L) return tip;
    const tx = x ? (Math.sign(x) * L) / x : Infinity;
    const ty = y ? (Math.sign(y) * L) / y : Infinity;
    const tz = z ? (Math.sign(z) * L) / z : Infinity;
    const t = Math.min(
      tx > 0 ? tx : Infinity,
      ty > 0 ? ty : Infinity,
      tz > 0 ? tz : Infinity,
    );
    return isFinite(t) ? tip.multiplyScalar(t) : new THREE.Vector3(0, 0, 0);
  }

  Vec3D._sameVec = function (a, b, eps = 1e-9) {
    if (!a || !b) return false;
    return (
      Math.abs(a[0] - b[0]) < eps &&
      Math.abs(a[1] - b[1]) < eps &&
      Math.abs(a[2] - b[2]) < eps
    );
  };

  Vec3D._maybeInvalidateAngle = function () {
    const g = App.currentAngleVisual3D;
    if (!g?.userData?.angleMeta?.src) return;
    const { a: A0, b: B0 } = g.userData.angleMeta.src;
    const cur = (App.vectorList || []).filter((v) => v.visible !== false);
    const hasA = cur.some((v) => Vec3D._sameVec(toVec3(v.vec), A0));
    const hasB = cur.some((v) => Vec3D._sameVec(toVec3(v.vec), B0));
    if (!(hasA && hasB) || cur.length === 0) Vec3D.clearAngle();
  };

  Vec3D.draw3DAllVectors = function (opts = { frame: false }) {
    if (!Vec3D._mathGroup) {
      if (Vec3D.init3D) Vec3D.init3D();
      if (!Vec3D._mathGroup) return;
    }

    Vec3D._maybeInvalidateAngle();
    if (!Vec3D._vectorsGroup) {
      Vec3D._vectorsGroup = new THREE.Group();
      Vec3D._mathGroup.add(Vec3D._vectorsGroup);
    }

    Vec3D._vectorsGroup.traverse((obj) => {
      if (obj.isCSS2DObject && obj.element) obj.element.remove();
      if (obj.geometry) obj.geometry.dispose?.();
      if (Array.isArray(obj.material))
        obj.material.forEach((m) => m?.dispose?.());
      else obj.material?.dispose?.();
    });
    Vec3D._vectorsGroup.clear();
    Vec3D.threeVecMap.clear();

    const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
    const Lm = Vec3D._axisMaxWorld / u;

    const hasFocus = App.vectorList?.some((v) => v.focus);
    const list = (App.vectorList || []).filter((v) => v.visible !== false);

    // Sort: Focus last
    list.sort((a, b) => (a.focus ? 1 : 0) - (b.focus ? 1 : 0));

    for (const it of list) {
      if (window.App?.LinearTransform?.isActive?.() && window.App.LinearTransform.dim === 3) {
        if (window.App.LinearTransform.isVectorSelected(it.id)) {
          continue; // Bỏ qua vector đang được mô phỏng biến đổi vì _transformGroup quản lý render Live & Ghost
        }
      }
      const v = toVec3(it.vec);
      let aItem =
        typeof it.alpha === "number" ? Math.max(0, Math.min(1, it.alpha)) : 1;

      // Dim others
      if (hasFocus && !it.focus) aItem *= 0.15;

      const tipM = clipToCubeMath(v[0], v[1], v[2], Lm);
      const tipLocal = tipM.clone().multiplyScalar(u);
      const len = Math.max(tipLocal.length(), 1e-9);
      const dirLocal = len > 1e-9 ? tipLocal.clone().normalize() : new THREE.Vector3(1, 0, 0);

      // --- TỶ LỆ HÌNH HỌC VECTOR 3D CHUẨN GEOGEBRA & DESMOS (SCREEN-SPACE AESTHETIC) ---
      // Quy đổi kích thước pixel trên màn hình sang tọa độ 3D theo khoảng cách camera
      const vFOV = ((Vec3D._camera ? Vec3D._camera.fov : Vec3D.DEFAULT_FOV || 24) * Math.PI) / 180;
      const screenH = Math.max(1, Vec3D._renderer?.domElement?.clientHeight || 760);
      const midLocal = tipLocal.clone().multiplyScalar(0.5);
      const camDist = Vec3D._camera ? Vec3D._camera.position.distanceTo(midLocal) : 25;
      const worldPerPx = (2 * Math.tan(vFOV / 2) * camDist) / screenH;

      // Kích thước chuẩn trên màn hình:
      // - Thân vector: bán kính 2.0px (~4.0px đường kính, thanh mảnh, sắc nét như tài liệu toán học)
      // - Mũi tên: dài 15px, bán kính đáy 4.5px (tỷ lệ thon nhọn khí động học, ~2.25x bán kính thân)
      let idealHeadH = 15.0 * worldPerPx;
      let idealHeadR = 4.5 * worldPerPx;
      let idealShaftR = 2.0 * worldPerPx;

      // Xử lý vector ngắn hoặc khi zoom out xa:
      // Mũi tên chiếm tối đa 28% chiều dài vector để không nuốt chửng thân
      if (idealHeadH > len * 0.28) {
        const scale = (len * 0.28) / idealHeadH;
        idealHeadH = len * 0.28;
        idealHeadR *= scale;
        idealShaftR = Math.min(idealShaftR, idealHeadR * 0.44);
      }

      const DYN_HEAD_H = idealHeadH;
      const DYN_HEAD_R = idealHeadR;
      const DYN_SHAFT_R = Math.min(idealShaftR, DYN_HEAD_R * 0.44);
      const shaftLen = Math.max(len - DYN_HEAD_H, 1e-6);
      const color = new THREE.Color(it.colorHex || it.colorCss || "#ffffff");

      const group = new THREE.Group();
      group.userData.tipLocal = tipLocal;
      group.userData.dirLocal = dirLocal;

      if (it.focus) {
        // [ENERGY PULSE]
        const pulseMat = new THREE.MeshBasicMaterial({
          color: PULSE_COLOR_3D,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
          side: THREE.FrontSide,
        });

        const haloR = 2.5 * worldPerPx;
        const pulseShaftR = DYN_SHAFT_R + haloR;
        const pulseHeadR = DYN_HEAD_R + haloR;
        const pulseHeadH = DYN_HEAD_H + haloR * 1.5;

        const pulseShaft = new THREE.Mesh(
          new THREE.CylinderGeometry(
            pulseShaftR,
            pulseShaftR,
            shaftLen,
            12, 1, true
          ),
          pulseMat,
        );
        pulseShaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirLocal);
        pulseShaft.position.copy(dirLocal.clone().multiplyScalar(shaftLen / 2));
        pulseShaft.userData.isFocusPulse = true;
        group.add(pulseShaft);

        const pulseHead = new THREE.Mesh(
          new THREE.ConeGeometry(
            pulseHeadR,
            pulseHeadH,
            12
          ),
          pulseMat,
        );
        pulseHead.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirLocal);
        pulseHead.position.copy(tipLocal.clone().addScaledVector(dirLocal, -pulseHeadH / 2));
        pulseHead.userData.isFocusPulse = true;
        group.add(pulseHead);
      }

      const isTransparent = aItem < 0.98;
      const vecMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: isTransparent,
        opacity: aItem,
        depthWrite: !isTransparent,
      });

      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(
          DYN_SHAFT_R,
          DYN_SHAFT_R,
          shaftLen,
          GEOM_QUALITY.shaftSeg, 1, true
        ),
        vecMat,
      );
      shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirLocal);
      shaft.position.copy(dirLocal.clone().multiplyScalar(shaftLen / 2));

      const head = new THREE.Mesh(
        new THREE.ConeGeometry(DYN_HEAD_R, DYN_HEAD_H, GEOM_QUALITY.headSeg),
        vecMat,
      );
      head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirLocal);
      head.position.copy(tipLocal.clone().addScaledVector(dirLocal, -DYN_HEAD_H / 2));

      const proj = Vec3D.buildProjectionGroupZUp(
        [tipLocal.x, tipLocal.y, tipLocal.z],
        App.getCSS?.("--axis") || "#888",
        aItem * 0.9,
      );
      
      const el = document.createElement("div");
      el.className = "tip-label";
      el.textContent = App.formatTip ? App.formatTip(it.vec) : `[${it.vec.join(", ")}]`;
      el.style.opacity = String(aItem);
      const labelEl = new THREE.CSS2DObject(el);
      labelEl.name = "tipLabel";
      labelEl.position.copy(tipLocal);

      if (aItem <= 0.001) {
        group.visible = false;
      }

      if (App._basisAnimActive && it._basisIsBasis) {
        group.renderOrder = 999;
        shaft.renderOrder = 999;
        head.renderOrder = 999;
        shaft.material.depthTest = false;
        head.material.depthTest = false;
        shaft.material.depthWrite = false;
        head.material.depthWrite = false;
      } else {
        group.renderOrder = 1;
      }

      group.add(shaft, head, proj, labelEl);
      Vec3D._vectorsGroup.add(group);
      Vec3D.threeVecMap.set(it.id, group);
    }

    if (opts.frame) {
      const hasVec = (App.vectorList || []).some((v) => v.visible !== false);
      if (!hasVec) {
        Vec3D.S3D.unitsPerWorld = 1;
        Vec3D._camera.position.set(17, 17, 17);
      } else {
        const longest = Math.max(
          ...App.vectorList.map((it) => {
            const v3 = toVec3(it.vec);
            return Math.sqrt(v3[0] ** 2 + v3[1] ** 2 + v3[2] ** 2);
          }),
        );
        Vec3D.S3D.unitsPerWorld = Math.min(
          Vec3D._ZOOM_MAX,
          Math.max(Vec3D._ZOOM_MIN, (Lm * u * 0.55) / Math.max(1e-9, longest)),
        );
        const dist = Math.min(40, Math.max(32, Lm * u * 1.15));
        Vec3D._camera.position.set(dist, dist, dist);
        Vec3D._controls.target.copy(Vec3D.S3D.offset);
        Vec3D._controls.update();
      }
    }
    if (App.currentVector) {
      const txt = App.formatTip
        ? App.formatTip(App.currentVector)
        : `[${App.currentVector.join(",")}]`;
      App.coordOut?.(txt + (App.currentVector.length > 3 ? " (Chiếu 3D)" : ""));
    } else {
      App.coordOut?.("-");
    }

    const normalizeGhost = App.tempGhosts?.find((g) => g.isNormalize);
    if (normalizeGhost) {
      Vec3D._drawUnitSphere(normalizeGhost.unitCircleAlpha);
    } else if (Vec3D._unitSphereMesh) {
      Vec3D._unitSphereMesh.visible = false;
    }
  };

  // =========================================================
  // ANGLE VISUALS (FILLED IN LOGIC)
  // =========================================================
  Vec3D.clearAngle = function () {
    const g = App.currentAngleVisual3D;
    if (!g) return;
    (g.parent || Vec3D._mathGroup || Vec3D._scene).remove(g);
    g.traverse((obj) => {
      obj.element?.remove?.();
      obj.geometry?.dispose?.();
      if (Array.isArray(obj.material))
        obj.material.forEach((m) => m?.dispose?.());
      else obj.material?.dispose?.();
    });
    App.currentAngleVisual3D = null;
  };

  Vec3D.refreshAngleTheme = function () {
    const g = App.currentAngleVisual3D;
    if (!g) return;

    // 1. Phục hồi màu sắc cho mặt quét và đường viền cung tròn
    const mesh = g.children.find((c) => c.isMesh);
    if (mesh && mesh.material) {
      mesh.material.color = new THREE.Color(0xffaa00);
      mesh.material.opacity = 0.3;
    }
    const line = g.children.find((c) => c.isLine);
    if (line && line.material) {
      line.material.color = new THREE.Color(0xffaa00);
    }

    // 2. Chuyển màu chữ Trắng/Đen theo Theme
    const lbl = g.children.find((c) => c.isCSS2DObject);
    if (lbl && lbl.element) {
      lbl.element.style.color = (window.App && App.theme === "dark") ? "#ffffff" : "#000000";
    }
  };

  Vec3D.removeAllAngleVisuals = function () {
    Vec3D.clearAngle();
  };

  // HÀM VẼ GÓC 3D (Được viết đầy đủ)
  Vec3D.drawAngleArc3D = function (v1, v2, rad, deg) {
    Vec3D.clearAngle(); // Xóa cái cũ trước

    const u = Vec3D.S3D.unitsPerWorld || 1;
    const rawA = new THREE.Vector3(...toVec3(v1));
    const rawB = new THREE.Vector3(...toVec3(v2));
    const A = rawA.clone().normalize();
    const B = rawB.clone().normalize();

    // Nếu 2 vector song song hoặc trùng nhau -> không vẽ
    if (A.lengthSq() < 1e-9 || B.lengthSq() < 1e-9) return;
    const angleVal = A.angleTo(B);
    if (Math.abs(angleVal) < 1e-5) return;

    // [FIX] Bán kính: Lấy 60% chiều dài của vector ngắn nhất để không bị lố
    const minLen = Math.min(rawA.length(), rawB.length());
    const displayRadius = Math.max(0.5, minLen * 0.6) * u;

    // Tạo geometry cung tròn
    const curve = new THREE.EllipseCurve(
      0,
      0, // ax, aY
      displayRadius,
      displayRadius, // xRadius, yRadius
      0,
      angleVal, // startAngle, endAngle
      false, // clockwise
      0, // rotation
    );
    const pts = curve.getPoints(32);
    const geometry = new THREE.BufferGeometry().setFromPoints(pts);

    // Vật liệu (Material)
    const material = new THREE.LineBasicMaterial({ color: 0xffaa00 });
    const arcLine = new THREE.Line(geometry, material);

    // Tạo mặt phẳng rẻ quạt (Mesh) cho đẹp
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    pts.forEach((p) => shape.lineTo(p.x, p.y));
    shape.lineTo(0, 0);
    const meshGeo = new THREE.ShapeGeometry(shape);
    const meshMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(meshGeo, meshMat);

    // Group chứa tất cả
    const group = new THREE.Group();
    group.add(arcLine);
    group.add(mesh);

    // Xoay Group để khớp với mặt phẳng tạo bởi 2 vector
    // Trục Z mặc định của EllipseCurve là (0,0,1). Ta cần xoay nó trùng với Cross(A, B).
    const normal = new THREE.Vector3().crossVectors(A, B).normalize();
    // Nếu cross = 0 (song song), dùng trục bất kỳ
    if (normal.lengthSq() < 0.001) normal.set(0, 0, 1);

    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal,
    );
    group.setRotationFromQuaternion(quaternion);

    // Xoay tiếp để điểm bắt đầu khớp với A
    // EllipseCurve bắt đầu tại (Radius, 0, 0) local.
    // Sau khi xoay phẳng, vector (1,0,0) local sẽ nằm trên mặt phẳng.
    // Ta cần xoay quanh trục Normal sao cho vector đó trùng với A.
    const startVecLocal = new THREE.Vector3(1, 0, 0).applyQuaternion(
      quaternion,
    );
    const angleOffset = startVecLocal.angleTo(A);
    // Kiểm tra hướng xoay (trái hay phải)
    const testCross = new THREE.Vector3().crossVectors(startVecLocal, A);
    const sign = testCross.dot(normal) >= 0 ? 1 : -1;

    group.rotateOnAxis(new THREE.Vector3(0, 0, 1), sign * angleOffset);

    // Label hiển thị số độ
    const degTxt = (deg !== undefined ? deg : (angleVal * 180) / Math.PI).toFixed(1) + "°";
    const div = document.createElement("div");
    div.className = "angle-label";
    div.textContent = degTxt;
    
    // [FIX] Đổi màu chữ Trắng/Đen theo Theme
    div.style.color = (window.App && App.theme === "dark") ? "#ffffff" : "#000000";
    div.style.fontWeight = "bold"; // In đậm cho dễ nhìn
    
    const labelObj = new THREE.CSS2DObject(div);

    // [FIX] Dùng tọa độ Local, KHÔNG applyQuaternion để chữ không bị văng ra vũ trụ
    const midAngle = angleVal / 2;
    const midDirLocal = new THREE.Vector3(Math.cos(midAngle), Math.sin(midAngle), 0);
    
    labelObj.position.copy(midDirLocal.clone().multiplyScalar(displayRadius + 0.6 * u));
    group.add(labelObj);

    // Metadata để scale theo zoom (Truyền đúng midDirLocal vào)
    group.userData.angleMeta = {
      src: { a: toVec3(v1), b: toVec3(v2) },
      createdU: u,
      r: displayRadius,
      midDir: midDirLocal.clone().normalize(),
    };

    Vec3D._angleLayer.add(group);
    App.currentAngleVisual3D = group;
  };

  // [THÊM MỚI] Hàm này giúp Animation chạy mượt mà không bị xóa mất Ghost
  Vec3D.renderOnce = function () {
    if (Vec3D._renderer && Vec3D._scene && Vec3D._camera) {
      Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
      if (Vec3D._labelRenderer)
        Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
    }
  };

  // =========================================================================
  // 3D LINEAR TRANSFORMATION SIMULATION ENGINE
  // =========================================================================
  Vec3D._transformGroup = null;

  Vec3D.initTransformGroup = function () {
    if (Vec3D.clearTransformGroup) Vec3D.clearTransformGroup();
    if (!Vec3D._scene) Vec3D.init3D();
    if (!Vec3D._mathGroup) Vec3D.update3DHelpersBase();

    const group = new THREE.Group();
    group.name = "linearTransformGroup3D";
    Vec3D._transformGroup = group;
    Vec3D._mathGroup.add(group);

    // Cụm các nhóm con: khối hộp định thức, vector cơ sở, vector theo dõi
    const parallelepipedGroup = new THREE.Group();
    parallelepipedGroup.name = "ltParallelepiped";
    group.add(parallelepipedGroup);

    const basisGroup = new THREE.Group();
    basisGroup.name = "ltBasis";
    group.add(basisGroup);

    const targetsGroup = new THREE.Group();
    targetsGroup.name = "ltTargets";
    group.add(targetsGroup);

    // 1. Khối hộp định thức 3D (Parallelepiped)
    // 12 tam giác * 3 đỉnh * 3 tọa độ = 108 floats
    const facePositions = new Float32Array(108);
    const boxFaceGeo = new THREE.BufferGeometry();
    boxFaceGeo.setAttribute("position", new THREE.BufferAttribute(facePositions, 3));
    const boxFaceMat = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const boxFaceMesh = new THREE.Mesh(boxFaceGeo, boxFaceMat);
    parallelepipedGroup.add(boxFaceMesh);

    // 12 cạnh viền * 2 đầu mút * 3 tọa độ = 72 floats
    const edgePositions = new Float32Array(72);
    const boxEdgeGeo = new THREE.BufferGeometry();
    boxEdgeGeo.setAttribute("position", new THREE.BufferAttribute(edgePositions, 3));
    const boxEdgeMat = new THREE.LineBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.75,
    });
    const boxEdgeMesh = new THREE.LineSegments(boxEdgeGeo, boxEdgeMat);
    parallelepipedGroup.add(boxEdgeMesh);

    // 1b. Tấm phẳng không gian con 2D (Subspace 2D Sheet) cho các biến đổi 2D nâng lên 3D
    const subspaceGroup = new THREE.Group();
    subspaceGroup.name = "ltSubspace2D";
    subspaceGroup.visible = false;
    group.add(subspaceGroup);

    // 2 tam giác = 6 đỉnh = 18 floats
    const subspaceFacePositions = new Float32Array(18);
    const subspaceFaceGeo = new THREE.BufferGeometry();
    subspaceFaceGeo.setAttribute("position", new THREE.BufferAttribute(subspaceFacePositions, 3));
    const subspaceFaceMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const subspaceFaceMesh = new THREE.Mesh(subspaceFaceGeo, subspaceFaceMat);
    subspaceGroup.add(subspaceFaceMesh);

    // 4 cạnh viền = 8 đỉnh = 24 floats
    const subspaceEdgePositions = new Float32Array(24);
    const subspaceEdgeGeo = new THREE.BufferGeometry();
    subspaceEdgeGeo.setAttribute("position", new THREE.BufferAttribute(subspaceEdgePositions, 3));
    const subspaceEdgeMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.9,
    });
    const subspaceEdgeMesh = new THREE.LineSegments(subspaceEdgeGeo, subspaceEdgeMat);
    subspaceGroup.add(subspaceEdgeMesh);

    // 1c. Trục đối xứng không gian chính x = y = z cho Transpose
    const diagGroup = new THREE.Group();
    diagGroup.name = "ltDiag3D";
    diagGroup.visible = false;
    group.add(diagGroup);

    const diagPositions = new Float32Array(6);
    const diagGeo = new THREE.BufferGeometry();
    diagGeo.setAttribute("position", new THREE.BufferAttribute(diagPositions, 3));
    const diagMat = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.8,
    });
    const diagMesh = new THREE.Line(diagGeo, diagMat);
    diagGroup.add(diagMesh);

    // 2. Cấu trúc dựng Vector 3D (Thân trụ + Mũi nón + Nhãn CSS2D)
    const createVecMeshStructure = (parentGroup, colorHex, labelText, isGhost = false, isUserLive = false) => {
      const vGroup = new THREE.Group();
      const isTransparent = isGhost;
      const opacity = isGhost ? 0.35 : 1.0;

      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: isTransparent,
        opacity: opacity,
        depthWrite: !isTransparent,
      });

      const shaftGeo = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true);
      const headGeo = new THREE.ConeGeometry(1, 1, 20);

      const shaft = new THREE.Mesh(shaftGeo, mat);
      const head = new THREE.Mesh(headGeo, mat);
      vGroup.add(shaft);
      vGroup.add(head);

      // Thêm viền phát sáng tương phản (halo) cho Vector người dùng để không bao giờ bị chìm/trùng màu
      let haloShaft = null;
      let haloHead = null;
      if (isUserLive) {
        const haloMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
        });
        haloShaft = new THREE.Mesh(shaftGeo, haloMat);
        haloHead = new THREE.Mesh(headGeo, haloMat);
        haloShaft.renderOrder = -1;
        haloHead.renderOrder = -1;
        vGroup.add(haloShaft);
        vGroup.add(haloHead);
      }

      let labelObj = null;
      if (labelText) {
        const div = document.createElement("div");
        div.className = "tip-label";
        div.style.padding = isUserLive ? "3px 8px" : "2px 6px";
        div.style.fontSize = isUserLive ? "12px" : "11px";
        div.style.fontWeight = "700";
        const isDark = document.body.classList.contains("dark-theme") || document.body.classList.contains("dark") || (window.App && App.theme === "dark");
        div.style.color = isDark ? "#ffffff" : "#111113";
        div.style.background = isDark ? "rgba(24, 25, 27, 0.92)" : "rgba(255, 255, 255, 0.95)";
        div.style.border = isUserLive ? `1.5px solid ${new THREE.Color(colorHex).getStyle()}` : `1px solid ${new THREE.Color(colorHex).getStyle()}`;
        if (isUserLive) {
          div.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
        }
        const cleanText = (labelText || "").replace(/[\u20D7\u20D6\u20D0\u20D1⃗]/g, "").trim();
        if (cleanText === "i" || cleanText === "j" || cleanText === "k" || cleanText === "v" || labelText.includes("\u20d7")) {
          div.innerHTML = `<span style="display:inline-flex; flex-direction:column; align-items:center; line-height:1; vertical-align:middle;"><span style="font-size:8px; line-height:0.7; transform:scaleX(0.85); font-weight:normal;">&rarr;</span><span style="font-style:italic; font-size:11px; line-height:1;">${cleanText}</span></span>`;
        } else {
          div.textContent = cleanText;
        }

        labelObj = new THREE.CSS2DObject(div);
        vGroup.add(labelObj);
      }

      parentGroup.add(vGroup);

      return {
        group: vGroup,
        shaft: shaft,
        head: head,
        haloShaft: haloShaft,
        haloHead: haloHead,
        mat: mat,
        labelObj: labelObj,
        colorHex: colorHex,
        isUserLive: isUserLive,
      };
    };

    // Vector cơ sở i, j, k (Mũi tên định hình khối hộp không gian)
    const basisI = createVecMeshStructure(basisGroup, 0xe5484d, "i");
    const basisJ = createVecMeshStructure(basisGroup, 0x10b981, "j");
    const basisK = createVecMeshStructure(basisGroup, 0x8b5cf6, "k");

    // Vector mục tiêu theo dõi (Ghost + Live có halo + Quỹ đạo nét đứt)
    const targetStructures = [];
    const targetVectors = (window.App?.LinearTransform?.targetVectors) || [];

    targetVectors.forEach((tv) => {
      const colorHex = new THREE.Color(tv.color || "#0090ff").getHex();
      const name = tv.name || "v";

      // Ghost vector mờ tại vị trí gốc v0
      const ghost = createVecMeshStructure(targetsGroup, 0x888888, `${name}(0)`, true);

      // Live vector động nổi bật với viền tương phản
      const live = createVecMeshStructure(targetsGroup, colorHex, `${name}(t)`, false, true);

      // Quỹ đạo Trajectory Line (30 bước)
      const trajSteps = 30;
      const trajPositions = new Float32Array((trajSteps + 1) * 3);
      const trajGeo = new THREE.BufferGeometry();
      trajGeo.setAttribute("position", new THREE.BufferAttribute(trajPositions, 3));
      const trajMat = new THREE.LineBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.6,
      });
      const trajLine = new THREE.Line(trajGeo, trajMat);
      targetsGroup.add(trajLine);

      targetStructures.push({
        id: tv.id,
        name: name,
        v0: [Number(tv.vec[0]) || 0, Number(tv.vec[1]) || 0, Number(tv.vec[2]) || 0],
        colorHex: colorHex,
        ghost: ghost,
        live: live,
        trajPositions: trajPositions,
        trajGeo: trajGeo,
        trajLine: trajLine,
      });
    });

    group.userData = {
      facePositions: facePositions,
      boxFaceGeo: boxFaceGeo,
      boxFaceMat: boxFaceMat,
      edgePositions: edgePositions,
      boxEdgeGeo: boxEdgeGeo,
      boxEdgeMat: boxEdgeMat,
      subspaceGroup: subspaceGroup,
      subspaceFacePositions: subspaceFacePositions,
      subspaceFaceGeo: subspaceFaceGeo,
      subspaceFaceMat: subspaceFaceMat,
      subspaceEdgePositions: subspaceEdgePositions,
      subspaceEdgeGeo: subspaceEdgeGeo,
      subspaceEdgeMat: subspaceEdgeMat,
      diagGroup: diagGroup,
      diagPositions: diagPositions,
      diagGeo: diagGeo,
      parallelepipedGroup: parallelepipedGroup,
      basisGroup: basisGroup,
      targetsGroup: targetsGroup,
      basisI: basisI,
      basisJ: basisJ,
      basisK: basisK,
      targetStructures: targetStructures,
    };
  };

  Vec3D.clearTransformGroup = function () {
    if (!Vec3D._transformGroup) return;
    Vec3D._transformGroup.traverse((obj) => {
      if (obj.isCSS2DObject && obj.element) obj.element.remove();
      if (obj.geometry) obj.geometry.dispose?.();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m?.dispose?.());
      } else {
        obj.material?.dispose?.();
      }
    });
    if (Vec3D._transformGroup.parent) {
      Vec3D._transformGroup.parent.remove(Vec3D._transformGroup);
    }
    Vec3D._transformGroup = null;
  };

  // Điều khiển hiển thị các lớp đồ họa biến đổi
  Vec3D.setTransformLayers = function (opts = {}) {
    if (!Vec3D._transformGroup || !Vec3D._transformGroup.userData) return;
    const data = Vec3D._transformGroup.userData;
    if (typeof opts.showVolume === "boolean") {
      if (data.parallelepipedGroup) data.parallelepipedGroup.visible = opts.showVolume;
    }
    if (typeof opts.showBasis === "boolean") {
      if (data.basisGroup) data.basisGroup.visible = opts.showBasis;
    }
    if (typeof opts.showTraj === "boolean") {
      if (data.targetStructures) {
        data.targetStructures.forEach((ts) => {
          if (ts.ghost?.group) ts.ghost.group.visible = opts.showTraj;
          if (ts.trajLine) ts.trajLine.visible = opts.showTraj;
        });
      }
    }
    Vec3D.renderOnce();
  };

  Vec3D.updateTransform3D = function (t, M) {
    if (!Vec3D._transformGroup || !Vec3D._transformGroup.userData) return;

    const data = Vec3D._transformGroup.userData;
    const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);

    // Kích thước chuẩn tỷ lệ phối cảnh theo camera
    const vFOV = ((Vec3D._camera ? Vec3D._camera.fov : Vec3D.DEFAULT_FOV || 24) * Math.PI) / 180;
    const screenH = Math.max(1, Vec3D._renderer?.domElement?.clientHeight || 760);
    const camDist = Vec3D._camera ? Vec3D._camera.position.distanceTo(new THREE.Vector3(0, 0, 0)) : 25;
    const worldPerPx = (2 * Math.tan(vFOV / 2) * camDist) / screenH;

    const UP = new THREE.Vector3(0, 1, 0);

    // Cập nhật vị trí và kích thước vector
    const positionVecMesh = (vecStruct, mathVec, isGhost = false) => {
      const tipLocal = new THREE.Vector3(mathVec[0] * u, mathVec[1] * u, mathVec[2] * u);
      const len = Math.max(tipLocal.length(), 1e-9);
      const dirLocal = len > 1e-9 ? tipLocal.clone().normalize() : new THREE.Vector3(1, 0, 0);

      const isUserLive = vecStruct.isUserLive;
      let idealHeadH = (isUserLive ? 16.5 : 12.0) * worldPerPx;
      let idealHeadR = (isUserLive ? 5.2 : 3.6) * worldPerPx;
      let idealShaftR = (isGhost ? 1.2 : isUserLive ? 2.5 : 1.6) * worldPerPx;

      if (idealHeadH > len * 0.35) {
        const scale = (len * 0.35) / idealHeadH;
        idealHeadH = len * 0.35;
        idealHeadR *= scale;
        idealShaftR = Math.min(idealShaftR, idealHeadR * 0.44);
      }

      const shaftLen = Math.max(len - idealHeadH, 1e-6);

      // Thân trụ
      vecStruct.shaft.scale.set(idealShaftR, shaftLen, idealShaftR);
      vecStruct.shaft.quaternion.setFromUnitVectors(UP, dirLocal);
      vecStruct.shaft.position.copy(dirLocal).multiplyScalar(shaftLen / 2);

      // Mũi nón
      vecStruct.head.scale.set(idealHeadR, idealHeadH, idealHeadR);
      vecStruct.head.quaternion.setFromUnitVectors(UP, dirLocal);
      vecStruct.head.position.copy(tipLocal).addScaledVector(dirLocal, -idealHeadH / 2);

      // Halo viền tương phản (nếu là user live vector)
      if (vecStruct.haloShaft && vecStruct.haloHead) {
        const haloExtra = 1.4 * worldPerPx;
        vecStruct.haloShaft.scale.set(idealShaftR + haloExtra, shaftLen, idealShaftR + haloExtra);
        vecStruct.haloShaft.quaternion.copy(vecStruct.shaft.quaternion);
        vecStruct.haloShaft.position.copy(vecStruct.shaft.position);

        vecStruct.haloHead.scale.set(idealHeadR + haloExtra, idealHeadH + haloExtra, idealHeadR + haloExtra);
        vecStruct.haloHead.quaternion.copy(vecStruct.head.quaternion);
        vecStruct.haloHead.position.copy(vecStruct.head.position);
      }

      // Nhãn
      if (vecStruct.labelObj) {
        const labelOffset = dirLocal.clone().multiplyScalar(idealHeadH + 0.3 * u);
        vecStruct.labelObj.position.copy(tipLocal).add(labelOffset);
      }
    };

    // Chế độ mô phỏng đa chiều
    const ltMode = window.App?.LinearTransform?.mode;
    const ltRank = window.App?.LinearTransform?.rank;
    const isEmbed2Dto3D = (ltMode === "embed_2d_to_3d") || (ltMode === "cross_compound_2d_3d_2d" && t <= 0.5);
    const isCrossEnd2D = (ltMode === "cross_compound_2d_3d_2d" && t > 0.5);
    const isCross3Dto2D = (ltMode === "cross_compound_3d_2d_3d" && t <= 0.5);
    const isProject3Dto2D = (ltMode === "project_3d_to_2d");
    const isRank2 = (ltMode === "rank" && ltRank === 2);
    const isRank1 = (ltMode === "rank" && ltRank === 1);
    const isTranspose = (ltMode === "transpose");

    // 1. Cột ma trận M (Vector cơ sở biến dạng)
    const vI = [M[0][0], M[1][0], M[2][0]];
    const vJ = [M[0][1], M[1][1], M[2][1]];
    const vK = [M[0][2], M[1][2], M[2][2]];

    positionVecMesh(data.basisI, vI);
    positionVecMesh(data.basisJ, vJ);
    if (!isEmbed2Dto3D && !isCrossEnd2D) {
      positionVecMesh(data.basisK, vK);
    }

    // Cập nhật nhãn vector cơ sở theo ký hiệu toán học chuẩn (i, j, k hoặc i', j', k')
    const primeSuffix = (t > 0.1) ? "'" : "";
    if (data.basisI?.labelObj?.element) {
      data.basisI.labelObj.element.innerHTML = `<span style="display:inline-flex; flex-direction:column; align-items:center; line-height:1; vertical-align:middle;"><span style="font-size:8px; line-height:0.7; transform:scaleX(0.85); font-weight:normal;">&rarr;</span><span style="font-style:italic; font-size:11px; line-height:1;">i${primeSuffix}</span></span>`;
    }
    if (data.basisJ?.labelObj?.element) {
      data.basisJ.labelObj.element.innerHTML = `<span style="display:inline-flex; flex-direction:column; align-items:center; line-height:1; vertical-align:middle;"><span style="font-size:8px; line-height:0.7; transform:scaleX(0.85); font-weight:normal;">&rarr;</span><span style="font-style:italic; font-size:11px; line-height:1;">j${primeSuffix}</span></span>`;
    }
    if (data.basisK?.labelObj?.element) {
      data.basisK.labelObj.element.innerHTML = `<span style="display:inline-flex; flex-direction:column; align-items:center; line-height:1; vertical-align:middle;"><span style="font-size:8px; line-height:0.7; transform:scaleX(0.85); font-weight:normal;">&rarr;</span><span style="font-style:italic; font-size:11px; line-height:1;">k${primeSuffix}</span></span>`;
    }

    // 2. 8 Đỉnh của Khối hộp định thức 3D (Parallelepiped)
    const p0 = [0, 0, 0];
    const p1 = [vI[0] * u, vI[1] * u, vI[2] * u];
    const p2 = [vJ[0] * u, vJ[1] * u, vJ[2] * u];
    const p3 = [(vI[0] + vJ[0]) * u, (vI[1] + vJ[1]) * u, (vI[2] + vJ[2]) * u];
    const p4 = [vK[0] * u, vK[1] * u, vK[2] * u];
    const p5 = [(vI[0] + vK[0]) * u, (vI[1] + vK[1]) * u, (vI[2] + vK[2]) * u];
    const p6 = [(vJ[0] + vK[0]) * u, (vJ[1] + vK[1]) * u, (vJ[2] + vK[2]) * u];
    const p7 = [(vI[0] + vJ[0] + vK[0]) * u, (vI[1] + vJ[1] + vK[1]) * u, (vI[2] + vJ[2] + vK[2]) * u];

    // 6 Mặt (12 Tam giác)
    const triangles = [
      p0, p1, p3,   p0, p3, p2, // Bottom
      p4, p6, p7,   p4, p7, p5, // Top
      p0, p4, p5,   p0, p5, p1, // Front
      p2, p3, p7,   p2, p7, p6, // Back
      p0, p2, p6,   p0, p6, p4, // Left
      p1, p5, p7,   p1, p7, p3, // Right
    ];

    const fArr = data.facePositions;
    let fi = 0;
    for (let i = 0; i < triangles.length; i++) {
      fArr[fi++] = triangles[i][0];
      fArr[fi++] = triangles[i][1];
      fArr[fi++] = triangles[i][2];
    }
    data.boxFaceGeo.attributes.position.needsUpdate = true;

    // 12 Cạnh viền
    const edges = [
      p0, p1,  p1, p3,  p3, p2,  p2, p0, // Bottom
      p4, p5,  p5, p7,  p7, p6,  p6, p4, // Top
      p0, p4,  p1, p5,  p2, p6,  p3, p7, // Trụ đứng
    ];
    const eArr = data.edgePositions;
    let ei = 0;
    for (let i = 0; i < edges.length; i++) {
      eArr[ei++] = edges[i][0];
      eArr[ei++] = edges[i][1];
      eArr[ei++] = edges[i][2];
    }
    data.boxEdgeGeo.attributes.position.needsUpdate = true;

    // Cập nhật Tấm phẳng không gian con 2D (Subspace 2D sheet)
    let subV1 = vI;
    let subV2 = vJ;
    if (isRank2) {
      // Tìm 2 cột độc lập tuyến tính để căng mặt phẳng ảnh Im(A)
      const crossIJ = [vI[1] * vJ[2] - vI[2] * vJ[1], vI[2] * vJ[0] - vI[0] * vJ[2], vI[0] * vJ[1] - vI[1] * vJ[0]];
      const lenIJ = Math.hypot(crossIJ[0], crossIJ[1], crossIJ[2]);
      if (lenIJ > 1e-4) {
        subV1 = vI;
        subV2 = vJ;
      } else {
        const crossIK = [vI[1] * vK[2] - vI[2] * vK[1], vI[2] * vK[0] - vI[0] * vK[2], vI[0] * vK[1] - vI[1] * vK[0]];
        const lenIK = Math.hypot(crossIK[0], crossIK[1], crossIK[2]);
        if (lenIK > 1e-4) {
          subV1 = vI;
          subV2 = vK;
        } else {
          subV1 = vJ;
          subV2 = vK;
        }
      }
    }

    const sp0 = [0, 0, 0];
    const sp1 = [subV1[0] * u, subV1[1] * u, subV1[2] * u];
    const sp2 = [subV2[0] * u, subV2[1] * u, subV2[2] * u];
    const sp3 = [(subV1[0] + subV2[0]) * u, (subV1[1] + subV2[1]) * u, (subV1[2] + subV2[2]) * u];

    const subTriangles = [
      sp0, sp1, sp3,
      sp0, sp3, sp2,
    ];
    const subFArr = data.subspaceFacePositions;
    if (subFArr && data.subspaceFaceGeo) {
      let sfi = 0;
      for (let i = 0; i < subTriangles.length; i++) {
        subFArr[sfi++] = subTriangles[i][0];
        subFArr[sfi++] = subTriangles[i][1];
        subFArr[sfi++] = subTriangles[i][2];
      }
      data.subspaceFaceGeo.attributes.position.needsUpdate = true;
    }

    const subEdges = [
      sp0, sp1,  sp1, sp3,  sp3, sp2,  sp2, sp0,
    ];
    const subEArr = data.subspaceEdgePositions;
    if (subEArr && data.subspaceEdgeGeo) {
      let sei = 0;
      for (let i = 0; i < subEdges.length; i++) {
        subEArr[sei++] = subEdges[i][0];
        subEArr[sei++] = subEdges[i][1];
        subEArr[sei++] = subEdges[i][2];
      }
      data.subspaceEdgeGeo.attributes.position.needsUpdate = true;
    }

    // Điều khiển hiển thị giữa khối hộp 3D và tấm phẳng 2D tùy theo chế độ
    if (data.subspaceGroup) {
      if (isEmbed2Dto3D || isCrossEnd2D || isProject3Dto2D || isCross3Dto2D || isRank2) {
        data.subspaceGroup.visible = true;
      } else {
        data.subspaceGroup.visible = false;
      }
    }

    if (isRank2 && data.subspaceFaceMat && data.subspaceEdgeMat) {
      data.subspaceFaceMat.color.setHex(0xf59e0b);
      data.subspaceFaceMat.opacity = 0.32;
      data.subspaceEdgeMat.color.setHex(0xf59e0b);
      data.subspaceEdgeMat.opacity = 0.95;
    } else if (data.subspaceFaceMat && data.subspaceEdgeMat) {
      data.subspaceFaceMat.color.setHex(0x06b6d4);
      data.subspaceFaceMat.opacity = 0.28;
      data.subspaceEdgeMat.color.setHex(0x06b6d4);
      data.subspaceEdgeMat.opacity = 0.9;
    }

    // Không hiển thị trục đối xứng gây rối mắt cho Transpose
    if (data.diagGroup) {
      data.diagGroup.visible = false;
    }

    if (isEmbed2Dto3D || isCrossEnd2D || isRank2 || isRank1) {
      if (data.parallelepipedGroup) data.parallelepipedGroup.visible = false;
      if (isEmbed2Dto3D || isCrossEnd2D) {
        if (data.basisK) {
          data.basisK.group.visible = false;
          if (data.basisK.shaft) data.basisK.shaft.visible = false;
          if (data.basisK.head) data.basisK.head.visible = false;
          if (data.basisK.labelObj) {
            data.basisK.labelObj.visible = false;
            if (data.basisK.labelObj.element) data.basisK.labelObj.element.style.display = "none";
          }
        }
      }
    } else {
      if (data.parallelepipedGroup) data.parallelepipedGroup.visible = true;
      if (data.basisK) {
        data.basisK.group.visible = true;
        if (data.basisK.shaft) data.basisK.shaft.visible = true;
        if (data.basisK.head) data.basisK.head.visible = true;
        if (data.basisK.labelObj) {
          data.basisK.labelObj.visible = true;
          if (data.basisK.labelObj.element) data.basisK.labelObj.element.style.display = "";
        }
      }
    }

    // Màu sắc và độ trong suốt theo định thức (det)
    const det = window.App?.LinearTransform?.getDet?.(M) ?? 1;
    if (Math.abs(det) < 0.001) {
      data.boxFaceMat.opacity = 0.04;
      data.boxEdgeMat.color.setHex(0xe5484d);
      data.boxEdgeMat.opacity = 0.85;
    } else if (det < 0) {
      data.boxFaceMat.color.setHex(0xf59e0b);
      data.boxEdgeMat.color.setHex(0xf59e0b);
      data.boxFaceMat.opacity = 0.20;
      data.boxEdgeMat.opacity = 0.8;
    } else {
      data.boxFaceMat.color.setHex(0x8b5cf6);
      data.boxEdgeMat.color.setHex(0x8b5cf6);
      data.boxFaceMat.opacity = 0.18;
      data.boxEdgeMat.opacity = 0.75;
    }

    // 3. Cập nhật các Vector theo dõi
    if (data.targetStructures && data.targetStructures.length > 0) {
      const lt = window.App?.LinearTransform;
      data.targetStructures.forEach((ts) => {
        // Ghost Vector tại vị trí gốc v0
        positionVecMesh(ts.ghost, ts.v0, true);

        // Live Vector vt = M * v0
        const vt = lt ? lt.mulVec(M, ts.v0) : ts.v0;
        positionVecMesh(ts.live, vt, false);

        // Cập nhật text nhãn trực tiếp
        if (ts.live.labelObj && ts.live.labelObj.element) {
          const fmt = lt?.fmt || ((n) => Number(n).toFixed(2));
          ts.live.labelObj.element.textContent = `${ts.name}(t) = [${fmt(vt[0])}, ${fmt(vt[1])}, ${fmt(vt[2])}]`;
        }

        // Cập nhật đường quỹ đạo nối từ tau = 0 đến tau = t (Đoạn thẳng toán học chính xác)
        const steps = 30;
        const trajArr = ts.trajPositions;
        const x0 = ts.v0[0] * u, y0 = ts.v0[1] * u, z0 = ts.v0[2] * u;
        const dx = (vt[0] - ts.v0[0]) * u;
        const dy = (vt[1] - ts.v0[1]) * u;
        const dz = (vt[2] - ts.v0[2]) * u;
        let ti = 0;
        for (let s = 0; s <= steps; s++) {
          const frac = s / steps;
          trajArr[ti++] = x0 + dx * frac;
          trajArr[ti++] = y0 + dy * frac;
          trajArr[ti++] = z0 + dz * frac;
        }
        ts.trajGeo.attributes.position.needsUpdate = true;
      });
    }
  };

  // --- UTILS ---
  Vec3D.hardRefresh3D = function (frameFirst = false) {
    if (App.mode !== "3D") return;
    if (!Vec3D._scene) Vec3D.init3D();
    Vec3D.draw3DAllVectors({
      frame: frameFirst,
    });
    Vec3D._controls.update();
    Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
    Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
  };

  Vec3D.setFOV = function (fovDeg = 24) {
    if (!Vec3D._camera) return;
    Vec3D._camera.fov = Math.max(5, Math.min(90, fovDeg));
    Vec3D._camera.updateProjectionMatrix();
    Vec3D.hardRefresh3D(false);
  };

  Vec3D.resetView = function () {
    if (!Vec3D._camera || !Vec3D._controls) return;
    if (Vec3D._resetAnimId) cancelAnimationFrame(Vec3D._resetAnimId);
    const startPos = Vec3D._camera.position.clone();
    const startTarget = Vec3D._controls.target.clone();
    const startZoom = Vec3D.S3D.unitsPerWorld;
    const targetPos = new THREE.Vector3(10, 10, 10);
    const targetLookAt = new THREE.Vector3(0, 0, 0);
    const targetZoom = 1;
    const duration = 1000;
    const startTime = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 4);

    function loop(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      Vec3D._camera.position.lerpVectors(startPos, targetPos, ease(progress));
      Vec3D._controls.target.lerpVectors(
        startTarget,
        targetLookAt,
        ease(progress),
      );
      Vec3D.S3D.unitsPerWorld =
        startZoom + (targetZoom - startZoom) * ease(progress);
      Vec3D.S3D.zoomTarget = Vec3D.S3D.unitsPerWorld;
      Vec3D._controls.update();
      if (!Vec3D._animating) {
        Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
        Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
        Vec3D.addAxisLabelsDynamic();
      }
      if (progress < 1) Vec3D._resetAnimId = requestAnimationFrame(loop);
      else {
        Vec3D._resetAnimId = null;
        Vec3D.S3D.offset.set(0, 0, 0);
        Vec3D.S3D.hasPivot = false;
        Vec3D.hardRefresh3D(false);
      }
    }
    Vec3D._resetAnimId = requestAnimationFrame(loop);
  };

  Vec3D._drawUnitSphere = function (alpha) {
    if (!Vec3D._unitSphereMesh) {
      const geo = new THREE.SphereGeometry(1, 32, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        wireframe: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      Vec3D._unitSphereMesh = new THREE.Mesh(geo, mat);
      Vec3D._mathGroup.add(Vec3D._unitSphereMesh);
    }
    const u = Vec3D.S3D.unitsPerWorld;
    Vec3D._unitSphereMesh.visible = alpha > 0.01;
  };

  Vec3D.setPerspectiveView = function () {
    if (!Vec3D._camera || !Vec3D._controls) return;
    if (Vec3D._resetAnimId) {
      cancelAnimationFrame(Vec3D._resetAnimId);
      Vec3D._resetAnimId = null;
    }
    Vec3D._camera.position.set(18, 16, 14);
    Vec3D._camera.up.set(0, 0, 1);
    Vec3D._controls.target.set(0, 0, 0);
    Vec3D._camera.lookAt(0, 0, 0);
    Vec3D._controls.update();
  };
})();
