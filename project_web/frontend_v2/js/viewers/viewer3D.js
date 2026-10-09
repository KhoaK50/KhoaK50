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
    shaftSeg: isMobile ? 8 : 12,
    headSeg: isMobile ? 12 : 16,
    maxPixel: isMobile ? 1.25 : 1.5,
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

    // Hệ thống đèn chiếu sáng cho không gian 3D
    const ambLight = new THREE.AmbientLight(0xffffff, 0.90);
    Vec3D._scene.add(ambLight);
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.75);
    dirLight1.position.set(30, 45, 50);
    Vec3D._scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.45);
    dirLight2.position.set(-30, -45, -30);
    Vec3D._scene.add(dirLight2);

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
    Vec3D._isOrbiting = false;
    Vec3D._controls.addEventListener("start", () => {
      Vec3D._userControlledCamera = true;
      Vec3D._isOrbiting = true;
    });
    Vec3D._controls.addEventListener("end", () => {
      Vec3D._isOrbiting = false;
    });
    Vec3D._controls.addEventListener("change", () => {
      if (typeof Vec3D.updateVectorLabelsLive === "function") {
        Vec3D.updateVectorLabelsLive();
      }
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

      const isBlocked = typeof App.isInteractionBlocked === "function" && App.isInteractionBlocked();
      if (!isBlocked && !(window.App && App.isAnimating)) {
          let hitId = null;
          let group = null;

          // 1. Raycast Heads
          if (Vec3D._pickableHeads && Vec3D._pickableHeads.length > 0) {
              raycaster.params.Line.threshold = 0.5;
              const intersects = raycaster.intersectObjects(Vec3D._pickableHeads, false);
              if (intersects.length > 0) {
                  const hitObj = intersects[0].object;
                  hitId = hitObj.userData?.vectorId || null;
                  group = hitObj.parent;
                  if (!hitId) {
                      for (let [id, grp] of Vec3D.threeVecMap.entries()) {
                          if (grp === group) { hitId = id; break; }
                      }
                  }
              }
          }

          // 2. Raycast Shafts
          if (!hitId && Vec3D._pickableMeshes && Vec3D._pickableMeshes.length > 0) {
              const intersects = raycaster.intersectObjects(Vec3D._pickableMeshes, false);
              if (intersects.length > 0) {
                  let p = intersects[0].object;
                  while (p && p !== Vec3D._vectorsGroup) {
                      for (const [id, grp] of Vec3D.threeVecMap.entries()) {
                          if (grp === p) { hitId = id; group = grp; break; }
                      }
                      if (hitId) break;
                      p = p.parent;
                  }
              }
          }

          // 3. Kiem tra CSS2D Labels
          if (!hitId && Vec3D._vectorsGroup) {
              for (const g of Vec3D._vectorsGroup.children) {
                  const vId = g.userData?.vectorId;
                  const lbl = g.children.find((ch) => ch.isCSS2DObject && ch.name === "tipLabel");
                  if (lbl && lbl.element && lbl.visible !== false) {
                      const lrect = lbl.element.getBoundingClientRect();
                      if (cx >= lrect.left - 4 && cx <= lrect.right + 4 && cy >= lrect.top - 4 && cy <= lrect.bottom + 4) {
                          hitId = vId;
                          group = g;
                          break;
                      }
                  }
              }
          }

          if (hitId) {
              if (!group) group = Vec3D.threeVecMap.get(hitId);
              if (group && group.userData && group.userData.tipLocal) {
                  Vec3D.S3D.draggedVectorId = hitId;
                  Vec3D.S3D.hoveredVectorId = hitId;
                  Vec3D._isOrbiting = false; // Triệt tiêu cờ Orbiting để không chặn kéo
                  Vec3D._controls.enabled = false; // Tạm khóa OrbitControls

                  if (window.App && App.History && typeof App.History.snapshot === "function") {
                    Vec3D.S3D._dragPreState = App.History.snapshot(`Di chuyển vector #${hitId}`);
                    const hitV = App.vectorList.find((v) => v.id === hitId);
                    Vec3D.S3D._dragStartVec = hitV ? [...hitV.vec] : null;
                  }

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
                      // KÉO TỰ DO: Dùng mặt phẳng vuông góc với Camera đi qua đỉnh vector
                      dragPlane.setFromNormalAndCoplanarPoint(camDir.multiplyScalar(-1), tipWorld);
                  }

                  // PHƯƠNG ÁN 1: Khóa độ lệch tương đối giữa chuột và ngọn vector tại thời điểm click
                  const planeIntersect = new THREE.Vector3();
                  const hasPlaneHit = raycaster.ray.intersectPlane(dragPlane, planeIntersect);
                  if (hasPlaneHit) {
                    dragOffset.copy(planeIntersect).sub(tipWorld);
                  } else {
                    dragOffset.set(0, 0, 0);
                  }

                  e.preventDefault();
                  e.stopPropagation();
                  e.stopImmediatePropagation();
                  try {
                    renderDom.setPointerCapture(e.pointerId || (e.touches ? e.touches[0].identifier : 0));
                  } catch (_) {}
                  renderDom.style.cursor = "grabbing";
                  Vec3D.draw3DAllVectors();
                  return;
              }
          }
      }
    };
    
    // POINTER MOVE: Trượt Vector hoặc Hover phát hiện tọa độ
    const pointerMoveHandler = (e) => {
      if (Vec3D._isOrbiting && !Vec3D.S3D.draggedVectorId) return;

      if (!Vec3D.S3D.draggedVectorId) {
        // [HOVER DETECTION IN 3D]
        if (!Vec3D._camera || !Vec3D._vectorsGroup) return;
        const rect = renderDom.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        mouse.x = ((cx - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((cy - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, Vec3D._camera);

        let hitId = null;

        // 1. Ưu tiên raycast vào HEAD (đầu vector để nắm kéo)
        const isBlocked = typeof App.isInteractionBlocked === "function" && App.isInteractionBlocked();
        if (!isBlocked && Vec3D._pickableHeads && Vec3D._pickableHeads.length > 0) {
          const headIntersects = raycaster.intersectObjects(Vec3D._pickableHeads, false);
          if (headIntersects.length > 0) {
            const headObj = headIntersects[0].object;
            hitId = headObj.userData?.vectorId || null;
            if (!hitId) {
              let p = headObj;
              while (p && p !== Vec3D._vectorsGroup) {
                for (const [id, grp] of Vec3D.threeVecMap.entries()) {
                  if (grp === p) { hitId = id; break; }
                }
                if (hitId) break;
                p = p.parent;
              }
            }
          }
        }

        // 2. Kiểm tra thân vector (Shaft)
        if (!isBlocked && !hitId && Vec3D._pickableMeshes && Vec3D._pickableMeshes.length > 0) {
          const bodyIntersects = raycaster.intersectObjects(Vec3D._pickableMeshes, false);
          if (bodyIntersects.length > 0) {
            let p = bodyIntersects[0].object;
            while (p && p !== Vec3D._vectorsGroup) {
              for (const [id, grp] of Vec3D.threeVecMap.entries()) {
                if (grp === p) { hitId = id; break; }
              }
              if (hitId) break;
              p = p.parent;
            }
          }
        }

        // 3. Kiểm tra nhãn CSS2D Labels
        if (!isBlocked && !hitId && Vec3D._vectorsGroup) {
          for (const g of Vec3D._vectorsGroup.children) {
            const vId = g.userData?.vectorId;
            const lbl = g.children.find((ch) => ch.isCSS2DObject && ch.name === "tipLabel");
            if (lbl && lbl.element && lbl.visible !== false) {
              const lrect = lbl.element.getBoundingClientRect();
              if (cx >= lrect.left - 4 && cx <= lrect.right + 4 && cy >= lrect.top - 4 && cy <= lrect.bottom + 4) {
                hitId = vId;
                break;
              }
            }
          }
        }

        // RÀNG BUỘC CON TRỎ: Đổi thành 'grab' khi hover mũi tên hoặc nhãn
        renderDom.style.cursor = (!isBlocked && hitId) ? "grab" : "default";

        if (hitId !== Vec3D.S3D.hoveredVectorId) {
          Vec3D.S3D.hoveredVectorId = hitId;
          Vec3D.S3D.activeVectorId = hitId;
          if (typeof Vec3D.updateVectorLabelsLive === "function") {
            Vec3D.updateVectorLabelsLive();
          }
          Vec3D.draw3DAllVectors(); // Cập nhật reticle halo ngay lập tức
        }
        return;
      } 
      
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const vItem = App.vectorList.find(v => v.id === Vec3D.S3D.draggedVectorId);
      if (!vItem) return;

      const rect = renderDom.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      mouse.x = ((cx - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((cy - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, Vec3D._camera);
      const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
      
      const isSnap = e.ctrlKey; 
      const step = Vec3D.S3D.stepUnit || 1; 

      const intersect = new THREE.Vector3();
      const hasHit = raycaster.ray.intersectPlane(dragPlane, intersect);
      
      if (hasHit) {
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

          if (isSnap) { 
              nx = Math.round(nx / step) * step; 
              ny = Math.round(ny / step) * step; 
              nz = Math.round(nz / step) * step; 
          }
          
          if (Vec3D.S3D.axisConstraint === 'x') vItem.vec[0] = nx;
          else if (Vec3D.S3D.axisConstraint === 'y') vItem.vec[1] = ny;
          else if (Vec3D.S3D.axisConstraint === 'z') vItem.vec[2] = nz;
          else {
            vItem.vec[0] = nx;
            vItem.vec[1] = ny;
            vItem.vec[2] = nz;
          }
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

      Vec3D.draw3DAllVectors(); 
    };

    // POINTER UP: Thả chuột chốt số
    const pointerUpHandler = (e) => {
      if (Vec3D.S3D.draggedVectorId) {
          // 1. Chốt số Vector vật thể
          const draggedVec = App.vectorList.find(v => v.id === Vec3D.S3D.draggedVectorId);
          if (draggedVec) {
              draggedVec.vec = draggedVec.vec.map(val => Number(Number(val).toFixed(2)));
              if (!draggedVec.isParametric) {
                draggedVec.latex = `[${draggedVec.vec.join(", ")}]`;
              }

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
                  if (!draggedVec.isParametric) {
                    const newCoordsStr = App.formatVectorShort ? App.formatVectorShort(draggedVec.vec) : `[${draggedVec.vec.join(", ")}]`;
                    draggedVec.rawInput = newCoordsStr;
                    draggedVec.latex = newCoordsStr;
                    if (App.editingVectorId === draggedVec.id) {
                      const inp = document.getElementById("vectorInput");
                      if (inp) {
                        inp.value = newCoordsStr;
                        if (typeof App.updateVectorInputPreview === "function") {
                          App.updateVectorInputPreview(newCoordsStr);
                        }
                      }
                    }
                  }
                }
              }
          }

          Vec3D.S3D._dragPreState = null;
          Vec3D.S3D._dragStartVec = null;
          Vec3D.S3D.draggedVectorId = null;
          Vec3D.S3D.hoveredVectorId = null;
          Vec3D.S3D.activeVectorId = null;
          Vec3D._isOrbiting = false;
          Vec3D._controls.enabled = true; // Mở lại OrbitControls
          renderDom.style.cursor = "default";
          if (renderDom.releasePointerCapture && e.pointerId) {
            try { renderDom.releasePointerCapture(e.pointerId); } catch (_) {}
          }

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

    renderDom.addEventListener("pointerdown", pointerDownHandler, { capture: true });
    renderDom.addEventListener("pointermove", pointerMoveHandler);
    renderDom.addEventListener("pointerup", pointerUpHandler);
    renderDom.addEventListener("pointercancel", pointerUpHandler);
    renderDom.addEventListener("pointerleave", () => {
      if (Vec3D.S3D.hoveredVectorId !== null || Vec3D.S3D.activeVectorId !== null) {
        Vec3D.S3D.hoveredVectorId = null;
        Vec3D.S3D.activeVectorId = null;
        renderDom.style.cursor = "default";
        if (typeof Vec3D.updateVectorLabelsLive === "function") {
          Vec3D.updateVectorLabelsLive();
        }
        Vec3D.draw3DAllVectors();
      }
    });

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
      if (!Vec3D._animating) {
        Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
        Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
      }
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
  Vec3D._lastSyncCache = [];
  Vec3D._syncVectorList = function () {
    const vList = App.vectorList || [];
    const cache = Vec3D._lastSyncCache;
    let isDirty = false;

    const isBasisAnim = window.App && (App._basisAnimActive || (App.BasisAnimator && typeof App.BasisAnimator.isActive === "function" && App.BasisAnimator.isActive()));
    const isCoordAnim = window.App && (App._coordAnimActive || (App.CoordAnimator && typeof App.CoordAnimator.isActive === "function" && App.CoordAnimator.isActive()));

    if (vList.length !== cache.length) {
      isDirty = true;
    } else {
      for (let i = 0; i < vList.length; i++) {
        const v = vList[i];
        const c = cache[i];
        const vArr = v.vec;
        if (
          v.id !== c.id ||
          (v.visible !== false ? 1 : 0) !== c.vis ||
          (v.isImageMesh ? 1 : 0) !== c.isImg ||
          (v.showWireframe ? 1 : 0) !== c.wire ||
          (v.focus ? 1 : 0) !== c.focus ||
          ((isBasisAnim && typeof v._basisAlpha === "number") ? v._basisAlpha : ((isCoordAnim && typeof v._coordAlpha === "number") ? v._coordAlpha : (v.alpha ?? 1))) !== c.alpha ||
          ((isBasisAnim && v._basisColorCss) ? v._basisColorCss : ((isCoordAnim && v._coordColorCss) ? v._coordColorCss : (v.colorHex || v.colorCss || ""))) !== c.col ||
          !vArr ||
          vArr[0] !== c.x ||
          vArr[1] !== c.y ||
          (vArr[2] ?? 0) !== c.z
        ) {
          isDirty = true;
          break;
        }
      }
    }

    if (isDirty) {
      Vec3D._lastSyncCache = vList.map((v) => {
        const vArr = v.vec || [0, 0, 0];
        return {
          id: v.id,
          vis: v.visible !== false ? 1 : 0,
          isImg: v.isImageMesh ? 1 : 0,
          wire: v.showWireframe ? 1 : 0,
          focus: v.focus ? 1 : 0,
          alpha: (isBasisAnim && typeof v._basisAlpha === "number") ? v._basisAlpha : ((isCoordAnim && typeof v._coordAlpha === "number") ? v._coordAlpha : (v.alpha ?? 1)),
          col: (isBasisAnim && v._basisColorCss) ? v._basisColorCss : ((isCoordAnim && v._coordColorCss) ? v._coordColorCss : (v.colorHex || v.colorCss || "")),
          x: vArr[0],
          y: vArr[1],
          z: vArr[2] ?? 0,
        };
      });
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
    const overlay2d = document.getElementById("labels2dOverlay");
    if (overlay2d) {
      overlay2d.style.display = "none";
      overlay2d.innerHTML = "";
    }
    if (document.body) {
      document.body.classList.add("mode-3d");
      document.body.classList.remove("mode-2d");
    }
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
        if (Vec3D._focusPulseMaterials && Vec3D._focusPulseMaterials.length > 0) {
          const time = Date.now() * PULSE_SPEED_3D;
          const pulseOpacity = 0.2 + ((Math.sin(time) + 1) / 2) * 0.5; // 0.2 -> 0.7
          for (let i = 0; i < Vec3D._focusPulseMaterials.length; i++) {
            Vec3D._focusPulseMaterials[i].opacity = pulseOpacity;
          }
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
      const keepVectors = Vec3D._vectorsGroup || new THREE.Group();
      const keepAngles = Vec3D._angleLayer || new THREE.Group();
      const keepTransform = Vec3D._transformGroup || null;
      keepVectors.parent && keepVectors.parent.remove(keepVectors);
      keepAngles.parent && keepAngles.parent.remove(keepAngles);
      if (keepTransform && keepTransform.parent) keepTransform.parent.remove(keepTransform);
      if (Vec3D._nori3DGroup && Vec3D._nori3DGroup.parent) Vec3D._nori3DGroup.parent.remove(Vec3D._nori3DGroup);
      Vec3D._mathGroup.clear();
      Vec3D._vectorsGroup = keepVectors;
      Vec3D._angleLayer = keepAngles;
      if (keepTransform) Vec3D._transformGroup = keepTransform;
      Vec3D._nori3DGroup = null;
    }
    if (!Vec3D._vectorsGroup) Vec3D._vectorsGroup = new THREE.Group();
    if (!Vec3D._angleLayer) Vec3D._angleLayer = new THREE.Group();

    // Bo hoan toan gridHelper san Oxy o 3D theo yeu cau cua nguoi dung
    Vec3D._planeXY = null;

    // Don dep triet de axesGroup cu khoi _mathGroup va giai phong tai nguyen
    if (Vec3D._axesGroup) {
      if (Vec3D._axesGroup.parent) Vec3D._axesGroup.parent.remove(Vec3D._axesGroup);
      Vec3D._axesGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      Vec3D._axesGroup = null;
    }
    if (Vec3D._mathGroup) {
      for (let i = Vec3D._mathGroup.children.length - 1; i >= 0; i--) {
        const c = Vec3D._mathGroup.children[i];
        if (c.name === "axesGroup") {
          Vec3D._mathGroup.remove(c);
          c.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
          });
        }
      }
    }

    Vec3D._axesGroup = (function buildAxesWorld(L) {
      const g = new THREE.Group();
      g.name = "axesGroup";
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
    const showAxesInitial = (window.App?.graphSettings?.showAxes !== false);
    Vec3D._axesGroup.visible = showAxesInitial;
    Vec3D._mathGroup.add(Vec3D._axesGroup);
    Vec3D._mathGroup.add(Vec3D._vectorsGroup);
    Vec3D._mathGroup.add(Vec3D._angleLayer);
    if (Vec3D._transformGroup) Vec3D._mathGroup.add(Vec3D._transformGroup);
    Vec3D._mathGroup.position.copy(Vec3D.S3D.offset);
    Vec3D.updateFromSettings();
  };

  // Cập nhật nhãn vector 3D tức thì chuẩn KaTeX (Zero Lag, chống đè mũi tên & chống chồng chập)
  Vec3D.updateVectorLabelsLive = function () {
    if (!Vec3D._vectorsGroup) return;
    const settings = window.App?.graphSettings || { labelMode: "name" };
    const rect = Vec3D._renderer?.domElement?.getBoundingClientRect() || { width: 760, height: 760 };

    // 1. Tính toán tọa độ màn hình của các đỉnh vector để phân tách khi chồng chập
    const tipData = [];
    for (const g of Vec3D._vectorsGroup.children) {
      const vId = g.userData?.vectorId;
      const it = App.vectorList?.find((v) => v.id === vId);
      if (!it || !g.userData?.tipLocal) continue;
      const tScr = Vec3D._camera ? g.userData.tipLocal.clone().project(Vec3D._camera) : new THREE.Vector3();
      tipData.push({
        vId,
        it,
        group: g,
        pxX: ((tScr.x + 1) / 2) * rect.width,
        pxY: ((-tScr.y + 1) / 2) * rect.height,
        tipLocal: g.userData.tipLocal,
      });
    }

    const originScr = Vec3D._camera ? new THREE.Vector3(0, 0, 0).project(Vec3D._camera) : new THREE.Vector3();
    const origPxX = ((originScr.x + 1) / 2) * rect.width;
    const origPxY = ((-originScr.y + 1) / 2) * rect.height;

    for (let i = 0; i < tipData.length; i++) {
      const td = tipData[i];
      const it = td.it;
      const g = td.group;
      const lbl = g.children.find((ch) => ch.isCSS2DObject && ch.name === "tipLabel");
      if (!lbl || !lbl.element) continue;

      const isHoveredOrFocused = (Vec3D.S3D.hoveredVectorId === it.id) || (Vec3D.S3D.draggedVectorId === it.id) || !!it.focus;
      const showCoord = settings.labelMode === "both" || isHoveredOrFocused;
      const latex = App.getVectorLatexLabel ? App.getVectorLatexLabel(it, showCoord) : (it.name || "v");

      if (lbl.element.dataset.latex !== latex) {
        lbl.element.dataset.latex = latex;
        if (window.katex) {
          lbl.element.innerHTML = katex.renderToString(latex, { throwOnError: false, displayMode: false });
        } else {
          lbl.element.textContent = latex;
        }
      }

      const isBasisAnim = window.App && (App._basisAnimActive || (App.BasisAnimator && typeof App.BasisAnimator.isActive === "function" && App.BasisAnimator.isActive()));
      const isCoordAnim = window.App && (App._coordAnimActive || (App.CoordAnimator && typeof App.CoordAnimator.isActive === "function" && App.CoordAnimator.isActive()));
      const isDark = (window.App && App.theme === "dark") || document.documentElement.classList.contains("dark") || (document.body && document.body.classList.contains("dark"));
      const labelColor = (isBasisAnim && it._basisColorCss)
        ? it._basisColorCss
        : ((isCoordAnim && it._coordColorCss)
          ? it._coordColorCss
          : (it.colorCss || it.colorHex || (isDark ? "#ffffff" : "#111827")));

      lbl.element.style.color = "var(--text-main, #edeef0)";
      lbl.element.style.setProperty("--vec-color", labelColor);
      lbl.element.style.borderColor = labelColor;
      if (isHoveredOrFocused) {
        lbl.element.classList.add("is-hovered");
      } else {
        lbl.element.classList.remove("is-hovered");
      }

      if (settings.labelMode === "none" && !isHoveredOrFocused) {
        lbl.element.style.display = "none";
        lbl.visible = false;
      } else {
        lbl.element.style.display = "";
        lbl.visible = true;
      }

      // 2. Chống đè lên mũi tên & tách nhãn khi chồng chập
      let shiftCount = 0;
      let myRank = 0;
      for (let j = 0; j < tipData.length; j++) {
        if (i === j) continue;
        const dSq = (tipData[j].pxX - td.pxX) ** 2 + (tipData[j].pxY - td.pxY) ** 2;
        if (dSq < 2025) { // Trong bán kính 45px
          shiftCount++;
          if (tipData[j].vId < td.vId) myRank++;
        }
      }

      const dx = td.pxX - origPxX;
      const dy = td.pxY - origPxY;
      const angle = (dx * dx + dy * dy > 4) ? Math.atan2(dy, dx) : -Math.PI / 4;

      let offX = Math.cos(angle) * 22;
      let offY = Math.sin(angle) * 22;
      if (shiftCount > 0) {
        const shiftFactor = myRank - shiftCount / 2;
        const nx = -Math.sin(angle);
        const ny = Math.cos(angle);
        offX += nx * shiftFactor * 34;
        offY += ny * shiftFactor * 28;
      }
      lbl.element.style.marginLeft = `${Math.round(offX)}px`;
      lbl.element.style.marginTop = `${Math.round(offY)}px`;
    }
  };

  Vec3D.updateFromSettings = function () {
    const App = window.App || {};
    if (App.mode !== "3D" || !Vec3D._scene) return;
    const settings = App.graphSettings || { gridMode: "full", labelMode: "name", showAxes: true };

    // 1. Grid (Hop khung)
    if (Vec3D._frameGroup) {
      Vec3D._frameGroup.visible = settings.gridMode === "full";
    }

    // 2. Truc toa do (Axes, Ticks, Letters)
    const showAxes = settings.showAxes !== false;
    if (Vec3D._axesGroup) {
      Vec3D._axesGroup.visible = showAxes;
    }
    if (Vec3D._mathGroup) {
      for (let i = 0; i < Vec3D._mathGroup.children.length; i++) {
        const c = Vec3D._mathGroup.children[i];
        if (c.name === "axesGroup") c.visible = showAxes;
      }
    }
    if (Vec3D._ticksGroup) {
      Vec3D._ticksGroup.visible = showAxes;
    }

    // Force cap nhat nhan so va chu truc
    Vec3D._lastLabelKey = "";
    Vec3D.addAxisLabelsDynamic();

    // 3. Nhan Vector (Tip Labels)
    if (typeof Vec3D.updateVectorLabelsLive === "function") {
      Vec3D.updateVectorLabelsLive();
    }

    Vec3D.draw3DAllVectors();
    if (Vec3D._renderer && Vec3D._scene && Vec3D._camera) {
      Vec3D._renderer.render(Vec3D._scene, Vec3D._camera);
    }
    if (Vec3D._labelRenderer && Vec3D._scene && Vec3D._camera) {
      Vec3D._labelRenderer.render(Vec3D._scene, Vec3D._camera);
    }
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

    const lastU = Vec3D._lastUForVectors || 0;
    const uRatio = lastU > 0 ? Math.abs(u - lastU) / lastU : 1;

    // Chi ve lai tat ca vector khi do phong to thu nho (zoom u) thay doi dang ke (> 8%)
    // Tuyet doi khong ve lai khi xoay camera de dat toc do 60-120 FPS muot ma khong lag
    if (uRatio > 0.08) {
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

    const targetPx = 110;
    const step = niceStep(targetPx / Math.max(1e-30, pxPerMath));
    Vec3D.S3D.stepUnit = step;
    const off = Vec3D.S3D.offset;
    const settings = window.App?.graphSettings || { showAxes: true, gridMode: "full" };
    const offKey = `${off.x.toFixed(2)},${off.y.toFixed(2)},${off.z.toFixed(2)}`;
    const key = `${Lw}|${step}|${+u.toFixed(5)}|${App.theme}|${settings.showAxes}|${settings.gridMode}|${offKey}`;

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

    const showAxes = settings.showAxes !== false;
    if (Vec3D._axesGroup) {
      Vec3D._axesGroup.visible = showAxes;
    }
    if (Vec3D._mathGroup) {
      for (let i = 0; i < Vec3D._mathGroup.children.length; i++) {
        const c = Vec3D._mathGroup.children[i];
        if (c.name === "axesGroup") c.visible = showAxes;
      }
    }

    // Neu tat truc toa do, tat ca 3 duong truc, vach chia, chu so va ky hieu x, y, z deu bien mat
    if (!showAxes) {
      return;
    }

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
    if (window.App?.graphSettings?.showAxes === false) {
      Vec3D._ticksGroup.visible = false;
    }

    const putLabel = (axis, tMath) => {
      if (Math.abs(tMath) <= 1e-12) return;
      const txt = formatTick(tMath, step);
      const outer = document.createElement("div");
      outer.className = "axis-label-outer";
      const inner = document.createElement("div");
      inner.className = `axis-label-inner axis-${axis}`;
      inner.textContent = txt;
      const isDark = (window.App && App.theme === "dark");
      inner.style.color = isDark ? "#f1f5f9" : "#1e293b";
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
      const isDark = (window.App && App.theme === "dark");
      el.style.color =
        axis === "x"
          ? (App.getCSS?.("--axis-x") || (isDark ? "#ff8a8a" : "#e04b4b"))
          : axis === "y"
            ? (App.getCSS?.("--axis-y") || (isDark ? "#7be3a0" : "#2fb463"))
            : (App.getCSS?.("--axis-z") || (isDark ? "#9bb9ff" : "#3a78ff"));
      const obj = new THREE.CSS2DObject(el);
      obj.position.copy(position);
      Vec3D._mathGroup.add(obj);
      Vec3D._axisLetters.push(obj);
    };
    addLetter("x", "x", new THREE.Vector3(letterOffW, 0, 0));
    addLetter("y", "y", new THREE.Vector3(0, letterOffW, 0));
    addLetter("z", "z", new THREE.Vector3(0, 0, letterOffW));

    (function updateTipLabels() {
      if (!Vec3D._vectorsGroup) return;
      for (const g of Vec3D._vectorsGroup.children) {
        const tip = g.userData?.tipLocal;
        if (!tip) continue;
        const lbl = g.children.find((ch) => ch.isCSS2DObject && ch.name === "tipLabel");
        if (!lbl) continue;
        lbl.position.copy(tip);
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
    const [x, y, z] = vecWorld;
    const mat = new THREE.LineDashedMaterial({
      color: new THREE.Color(colorCSS),
      dashSize: 0.6,
      gapSize: 0.35,
      transparent: true,
      opacity: Math.max(0, Math.min(1, Number(alpha) || 0)),
    });
    // Hop nhat 9 canh hop hinh chieu vao 1 mesh duy nhat (THREE.LineSegments)
    // giam thieu draw calls tu 11 xuong con 1 cho moi vector
    const positions = new Float32Array([
      // Tu dinh (x, y, z) ha vuong goc xuong 3 mat phang toa do
      x, y, z,   x, y, 0,
      x, y, z,   0, y, z,
      x, y, z,   x, 0, z,
      // Tu diem chieu (x, y, 0) tren mat XY chieu ve 2 truc X va Y
      x, y, 0,   x, 0, 0,
      x, y, 0,   0, y, 0,
      // Tu diem chieu (x, 0, z) tren mat XZ chieu ve 2 truc X va Z
      x, 0, z,   x, 0, 0,
      x, 0, z,   0, 0, z,
      // Tu diem chieu (0, y, z) tren mat YZ chieu ve 2 truc Y va Z
      0, y, z,   0, y, 0,
      0, y, z,   0, 0, z,
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const lineSegs = new THREE.LineSegments(geo, mat);
    lineSegs.computeLineDistances();
    return lineSegs;
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

  // --- KẾT XUẤT LƯỚI VECTOR TRANH THÍCH ỨNG 3D (DELAUNAY RELIEF MESH) ---
  function drawImageMesh3D(it, u) {
    if (!it.worldPoints || !it.triangles || !Vec3D._vectorsGroup) return;

    const pts = it.worldPoints;
    const tris = it.triangles;
    const vCols = it.vertexColors;
    const alpha = typeof it.alpha === "number" ? Math.max(0, Math.min(1, it.alpha)) : 1.0;
    const showWireframe = !!it.showWireframe;

    const positions = new Float32Array(pts.length * 3);
    for (let i = 0; i < pts.length; i++) {
      positions[i * 3] = pts[i][0] * u;
      positions[i * 3 + 1] = pts[i][1] * u;
      positions[i * 3 + 2] = (pts[i][2] || 0) * u;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    if (vCols && vCols.length === pts.length * 3) {
      geom.setAttribute("color", new THREE.BufferAttribute(vCols, 3));
    }
    geom.setIndex(new THREE.BufferAttribute(new Uint32Array(tris), 1));
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: !!(vCols && vCols.length === pts.length * 3),
      roughness: 0.5,
      metalness: 0.08,
      side: THREE.DoubleSide,
      transparent: alpha < 0.999,
      opacity: alpha,
      wireframe: showWireframe,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.isImageMesh = true;
    mesh.userData.itemId = it.id;

    Vec3D._vectorsGroup.add(mesh);
  }

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
    Vec3D._pickableMeshes = [];
    Vec3D._pickableHeads = [];
    Vec3D._focusPulseMaterials = [];

    const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
    const Lm = Vec3D._axisMaxWorld / u;

    const hasFocus = App.vectorList?.some((v) => v.focus);
    const list = (App.vectorList || []).filter((v) => v.visible !== false);

    // Sort: Focus last
    list.sort((a, b) => (a.focus ? 1 : 0) - (b.focus ? 1 : 0));

    // Thu thập tọa độ đỉnh của tất cả vector để xử lý chống chồng chập (De-overlap) và góc chiếu màn hình
    const rect = Vec3D._renderer?.domElement?.getBoundingClientRect() || { width: 760, height: 760 };
    const allTips = list.map((item) => {
      const vecCoord = toVec3(item.vec);
      const tipM = clipToCubeMath(vecCoord[0], vecCoord[1], vecCoord[2], Lm);
      const tipL = tipM.clone().multiplyScalar(u);
      const tScr = Vec3D._camera ? tipL.clone().project(Vec3D._camera) : new THREE.Vector3();
      return {
        id: item.id,
        pxX: ((tScr.x + 1) / 2) * rect.width,
        pxY: ((-tScr.y + 1) / 2) * rect.height,
        tipLocal: tipL,
      };
    });

    const originScr = Vec3D._camera ? new THREE.Vector3(0, 0, 0).project(Vec3D._camera) : new THREE.Vector3();
    const origPxX = ((originScr.x + 1) / 2) * rect.width;
    const origPxY = ((-originScr.y + 1) / 2) * rect.height;

    for (const it of list) {
      if (it.isImageMesh) {
        drawImageMesh3D(it, u);
        continue;
      }

      if (window.App?.LinearTransform?.isActive?.() && window.App.LinearTransform.dim === 3) {
        if (window.App.LinearTransform.isVectorSelected(it.id)) {
          continue; // Bỏ qua vector đang được mô phỏng biến đổi vì _transformGroup quản lý render Live & Ghost
        }
      }
      const isBasisAnim = window.App && (App._basisAnimActive || (App.BasisAnimator && typeof App.BasisAnimator.isActive === "function" && App.BasisAnimator.isActive()));
      const isCoordAnim = window.App && (App._coordAnimActive || (App.CoordAnimator && typeof App.CoordAnimator.isActive === "function" && App.CoordAnimator.isActive()));
      const v = toVec3(it.vec);
      let aItem = (isBasisAnim && typeof it._basisAlpha === "number")
        ? Math.max(0, Math.min(1, it._basisAlpha))
        : ((isCoordAnim && typeof it._coordAlpha === "number")
          ? Math.max(0, Math.min(1, it._coordAlpha))
          : (typeof it.alpha === "number" ? Math.max(0, Math.min(1, it.alpha)) : 1));

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
      const colStr = (isBasisAnim && it._basisColorCss) ? it._basisColorCss : ((isCoordAnim && it._coordColorCss) ? it._coordColorCss : (it.colorHex || it.colorCss || "#ffffff"));
      const color = new THREE.Color(colStr);

      const group = new THREE.Group();
      group.userData.vectorId = it.id;
      group.userData.tipLocal = tipLocal;
      group.userData.dirLocal = dirLocal;

      const isTargeted = (Vec3D.S3D.hoveredVectorId === it.id) || (Vec3D.S3D.draggedVectorId === it.id) || !!it.focus;
      if (isTargeted && it.showArrow !== false) {
        // [HALO HOVER & FOCUS 3D]
        const hStyle = (window.App && window.App.graphSettings && window.App.graphSettings.haloStyle)
          || (window.App && window.App.haloStyle)
          || (typeof localStorage !== "undefined" && localStorage.getItem("vectoria_halo_style"))
          || "precision_reticle";

        if (hStyle === "precision_reticle") {
          // [PRECISION RETICLE 3D] Tâm ngắm kỹ thuật & Trắc địa mặt phẳng hướng Camera
          const haloR = 12 * worldPerPx;
          const reticleGroup = new THREE.Group();
          reticleGroup.name = "reticleHalo";
          reticleGroup.position.copy(tipLocal);

          // 1. Vòng tròn ngoài
          const ringMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            depthTest: false,
          });
          const ringMesh = new THREE.Mesh(new THREE.RingGeometry(haloR * 0.88, haloR, 32), ringMat);
          reticleGroup.add(ringMesh);

          // 2. Vòng tròn ngắm trong
          const innerRingMesh = new THREE.Mesh(new THREE.RingGeometry(haloR * 0.38, haloR * 0.46, 24), ringMat);
          reticleGroup.add(innerRingMesh);

          // 3. 4 vạch chuẩn ngắm tâm (Crosshair ticks)
          const tickPositions = new Float32Array(24);
          const tIn = haloR * 0.55, tOut = haloR * 1.35;
          tickPositions[0] = tIn; tickPositions[1] = 0; tickPositions[2] = 0;
          tickPositions[3] = tOut; tickPositions[4] = 0; tickPositions[5] = 0;
          tickPositions[6] = -tIn; tickPositions[7] = 0; tickPositions[8] = 0;
          tickPositions[9] = -tOut; tickPositions[10] = 0; tickPositions[11] = 0;
          tickPositions[12] = 0; tickPositions[13] = tIn; tickPositions[14] = 0;
          tickPositions[15] = 0; tickPositions[16] = tOut; tickPositions[17] = 0;
          tickPositions[18] = 0; tickPositions[19] = -tIn; tickPositions[20] = 0;
          tickPositions[21] = 0; tickPositions[22] = -tOut; tickPositions[23] = 0;

          const tickGeo = new THREE.BufferGeometry();
          tickGeo.setAttribute("position", new THREE.BufferAttribute(tickPositions, 3));
          const tickMat = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.95,
            depthTest: false,
          });
          const tickLines = new THREE.LineSegments(tickGeo, tickMat);
          reticleGroup.add(tickLines);

          if (Vec3D._camera) reticleGroup.quaternion.copy(Vec3D._camera.quaternion);
          reticleGroup.renderOrder = 999;
          group.add(reticleGroup);
        } else {
          // Classic Neon hoặc Soft Elevation
          const pulseColor3D = (hStyle === "classic_neon") ? PULSE_COLOR_3D : (it.colorHex || it.colorCss || PULSE_COLOR_3D);
          const pulseMat = new THREE.MeshBasicMaterial({
            color: pulseColor3D,
            transparent: true,
            opacity: 0.55,
            depthWrite: false,
            side: THREE.FrontSide,
          });
          Vec3D._focusPulseMaterials.push(pulseMat);

          const haloR = 2.5 * worldPerPx;
          const pulseShaftR = DYN_SHAFT_R + haloR;
          const pulseHeadR = DYN_HEAD_R + haloR;
          const pulseHeadH = DYN_HEAD_H + haloR * 1.5;

          const pulseShaft = new THREE.Mesh(
            new THREE.CylinderGeometry(pulseShaftR, pulseShaftR, shaftLen, 12, 1, true),
            pulseMat
          );
          pulseShaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirLocal);
          pulseShaft.position.copy(dirLocal.clone().multiplyScalar(shaftLen / 2));
          pulseShaft.userData.isFocusPulse = true;
          group.add(pulseShaft);

          const pulseHead = new THREE.Mesh(
            new THREE.ConeGeometry(pulseHeadR, pulseHeadH, 12),
            pulseMat
          );
          pulseHead.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirLocal);
          pulseHead.position.copy(tipLocal.clone().addScaledVector(dirLocal, -pulseHeadH / 2));
          pulseHead.userData.isFocusPulse = true;
          group.add(pulseHead);
        }
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

      // Hit target vô hình để tóm đầu vector chính xác 100% bằng raycaster (dùng transparent thay vì visible: false)
      const hitRadius = Math.max(DYN_HEAD_R * 2.2, 14 * worldPerPx);
      const hitHead = new THREE.Mesh(
        new THREE.SphereGeometry(hitRadius, 8, 6),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      hitHead.position.copy(tipLocal);
      hitHead.userData.isVectorHead = true;
      hitHead.userData.vectorId = it.id;

      const projColor = it.isParametric
        ? (it.colorHex || it.colorCss || "#0090ff")
        : (App.getCSS?.("--axis") || "#888");
      const projAlpha = it.isParametric
        ? Math.max(0.75, aItem * 0.95)
        : aItem * 0.9;
      const proj = Vec3D.buildProjectionGroupZUp(
        [tipLocal.x, tipLocal.y, tipLocal.z],
        projColor,
        projAlpha,
      );
      if (it.showProjection === false) {
        proj.visible = false;
      }
      
      const el = document.createElement("div");
      el.className = "tip-label";
      const settings = window.App?.graphSettings || { labelMode: "name" };

      const isHoveredOrFocused = (Vec3D.S3D.hoveredVectorId === it.id) || (Vec3D.S3D.draggedVectorId === it.id) || !!it.focus;
      const showCoord = settings.labelMode === "both" || isHoveredOrFocused;
      const latex = App.getVectorLatexLabel ? App.getVectorLatexLabel(it, showCoord) : (it.name || "v");

      el.dataset.latex = latex;
      if (window.katex) {
        el.innerHTML = katex.renderToString(latex, { throwOnError: false, displayMode: false });
      } else {
        el.textContent = latex;
      }

      const isDark = (window.App && App.theme === "dark") || document.documentElement.classList.contains("dark") || (document.body && document.body.classList.contains("dark"));
      const labelColor = (isBasisAnim && it._basisColorCss)
        ? it._basisColorCss
        : ((isCoordAnim && it._coordColorCss)
          ? it._coordColorCss
          : (it.colorCss || it.colorHex || (isDark ? "#ffffff" : "#111827")));

      el.style.color = "var(--text-main, #edeef0)";
      el.style.setProperty("--vec-color", labelColor);
      el.style.borderColor = labelColor;
      if (isHoveredOrFocused) {
        el.classList.add("is-hovered");
      } else {
        el.classList.remove("is-hovered");
      }
      el.style.opacity = String(aItem);
      if (settings.labelMode === "none" && !isHoveredOrFocused) {
        el.style.display = "none";
      }

      // Xử lý chống chồng chập (De-overlap) và đẩy nhãn ra ngoài đầu nhọn mũi tên
      const myTipData = allTips.find((t) => t.id === it.id);
      let shiftCount = 0;
      let myRank = 0;
      if (myTipData) {
        for (let j = 0; j < allTips.length; j++) {
          if (allTips[j].id === it.id) continue;
          const distSq = (allTips[j].pxX - myTipData.pxX) ** 2 + (allTips[j].pxY - myTipData.pxY) ** 2;
          if (distSq < 2025) { // Trong bán kính 45px
            shiftCount++;
            if (allTips[j].id < it.id) myRank++;
          }
        }
      }

      const dx = myTipData ? (myTipData.pxX - origPxX) : 1;
      const dy = myTipData ? (myTipData.pxY - origPxY) : -1;
      const screenAngle = (dx * dx + dy * dy > 4) ? Math.atan2(dy, dx) : -Math.PI / 4;

      let offX = Math.cos(screenAngle) * 22;
      let offY = Math.sin(screenAngle) * 22;
      if (shiftCount > 0) {
        const shiftFactor = myRank - shiftCount / 2;
        const nx = -Math.sin(screenAngle);
        const ny = Math.cos(screenAngle);
        offX += nx * shiftFactor * 34;
        offY += ny * shiftFactor * 28;
      }
      el.style.marginLeft = `${Math.round(offX)}px`;
      el.style.marginTop = `${Math.round(offY)}px`;

      const labelEl = new THREE.CSS2DObject(el);
      labelEl.name = "tipLabel";
      labelEl.position.copy(tipLocal);
      if (settings.labelMode === "none") {
        labelEl.visible = false;
      }

      if (aItem <= 0.001) {
        group.visible = false;
      }

      if (isBasisAnim && it._basisIsBasis) {
        group.renderOrder = 999;
        shaft.renderOrder = 999;
        head.renderOrder = 999;
        shaft.material.depthTest = false;
        head.material.depthTest = false;
        shaft.material.depthWrite = false;
        head.material.depthWrite = false;
      } else {
        group.renderOrder = 1;
        shaft.renderOrder = 10;
        head.renderOrder = 10;
      }

      // Vẽ mặt cong 3D hoặc khối thể tích 3D cho vector từ 2 biến trở lên (chỉ bật khi người dùng chọn hiển thị)
      if (it.isParametric && it.vars && it.vars.length >= 2 && !!it.showAreaFill) {
        try {
          const isInteracting = it.isAnimating || (window.App && window.App._isDraggingSlider);
          const sColor = new THREE.Color(it.surfaceColor || it.colorCss || it.colorHex || "#0090ff");
          const surfaceOpacity = typeof it.surfaceOpacity === "number" ? it.surfaceOpacity : 0.45;
          const geom = new THREE.BufferGeometry();
          const vertices = [];
          const indices = [];
          let vertexIndex = 0;

          if (it.vars.length >= 3) {
            // KHỐI THỂ TÍCH 3D (3-variable Volume): Dựng 6 mặt bao ngoài của khối thể tích tham số
            const v0Name = it.vars[0], v1Name = it.vars[1], v2Name = it.vars[2];
            const v0Min = it.paramInfinity ? -20 : Number(it.varRanges?.[v0Name]?.min ?? it.paramMin ?? -4);
            const v0Max = it.paramInfinity ? 20 : Number(it.varRanges?.[v0Name]?.max ?? it.paramMax ?? 4);
            const v1Min = it.paramInfinity ? -20 : Number(it.varRanges?.[v1Name]?.min ?? it.surfaceMin ?? -4);
            const v1Max = it.paramInfinity ? 20 : Number(it.varRanges?.[v1Name]?.max ?? it.surfaceMax ?? 4);
            const v2Min = it.paramInfinity ? -20 : Number(it.varRanges?.[v2Name]?.min ?? -4);
            const v2Max = it.paramInfinity ? 20 : Number(it.varRanges?.[v2Name]?.max ?? 4);

            const K = isInteracting ? 6 : 8;

            function addVolumeFace(fixedName, fixedVal, aName, aMin, aMax, bName, bMin, bMax) {
              const da = (aMax - aMin) / K;
              const db = (bMax - bMin) / K;
              const grid = [];
              for (let i = 0; i <= K; i++) {
                grid[i] = [];
                const aVal = aMin + i * da;
                for (let j = 0; j <= K; j++) {
                  const bVal = bMin + j * db;
                  const scope = Object.assign({}, it.scopeValues, {
                    [fixedName]: fixedVal,
                    [aName]: aVal,
                    [bName]: bVal
                  });
                  try {
                    const pt = it.fn.call(it, scope);
                    if (Array.isArray(pt) && isFinite(pt[0]) && isFinite(pt[1])) {
                      const z = isFinite(pt[2]) ? pt[2] : 0;
                      if (Math.abs(pt[0]) <= 50 && Math.abs(pt[1]) <= 50 && Math.abs(z) <= 50) {
                        vertices.push(pt[0] * u, pt[1] * u, z * u);
                        grid[i][j] = vertexIndex++;
                        continue;
                      }
                    }
                  } catch (e) {}
                  grid[i][j] = -1;
                }
              }

              for (let i = 0; i < K; i++) {
                for (let j = 0; j < K; j++) {
                  const a = grid[i][j];
                  const b = grid[i + 1][j];
                  const c = grid[i + 1][j + 1];
                  const d = grid[i][j + 1];
                  if (a !== -1 && b !== -1 && c !== -1) indices.push(a, b, c);
                  if (a !== -1 && c !== -1 && d !== -1) indices.push(a, c, d);
                }
              }
            }

            // 6 mặt bao quanh khối thể tích tham số
            addVolumeFace(v0Name, v0Min, v1Name, v1Min, v1Max, v2Name, v2Min, v2Max);
            addVolumeFace(v0Name, v0Max, v1Name, v1Min, v1Max, v2Name, v2Min, v2Max);
            addVolumeFace(v1Name, v1Min, v0Name, v0Min, v0Max, v2Name, v2Min, v2Max);
            addVolumeFace(v1Name, v1Max, v0Name, v0Min, v0Max, v2Name, v2Min, v2Max);
            addVolumeFace(v2Name, v2Min, v0Name, v0Min, v0Max, v1Name, v1Min, v1Max);
            addVolumeFace(v2Name, v2Max, v0Name, v0Min, v0Max, v1Name, v1Min, v1Max);
          } else {
            // MẶT DIỆN TÍCH CONG 3D (2-variable Surface)
            const N = isInteracting ? 14 : 26;
            const M = isInteracting ? 14 : 26;
            const uMin = it.paramInfinity ? -20 : Number(it.varRanges?.[it.vars[0]]?.min ?? it.paramMin ?? -4);
            const uMax = it.paramInfinity ? 20 : Number(it.varRanges?.[it.vars[0]]?.max ?? it.paramMax ?? 4);
            const vMin = it.paramInfinity ? -20 : Number(it.varRanges?.[it.vars[1]]?.min ?? it.surfaceMin ?? -4);
            const vMax = it.paramInfinity ? 20 : Number(it.varRanges?.[it.vars[1]]?.max ?? it.surfaceMax ?? 4);
            const du = (uMax - uMin) / N, dv = (vMax - vMin) / M;
            const evalFn = typeof it.eval2D === "function"
              ? (uVal, vVal) => it.eval2D(uVal, vVal, it.scopeValues)
              : (uVal, vVal) => it.fn.call(it, Object.assign({}, it.scopeValues, { [it.vars[0]]: uVal, [it.vars[1]]: vVal }));
            const indexGrid = [];

            for (let i = 0; i <= N; i++) {
              indexGrid[i] = [];
              const uVal = uMin + i * du;
              for (let j = 0; j <= M; j++) {
                const vVal = vMin + j * dv;
                try {
                  const pt = evalFn(uVal, vVal);
                  if (Array.isArray(pt) && isFinite(pt[0]) && isFinite(pt[1])) {
                    const z = isFinite(pt[2]) ? pt[2] : 0;
                    if (Math.abs(pt[0]) <= 50 && Math.abs(pt[1]) <= 50 && Math.abs(z) <= 50) {
                      vertices.push(pt[0] * u, pt[1] * u, z * u);
                      indexGrid[i][j] = vertexIndex++;
                      continue;
                    }
                  }
                } catch (e) {}
                indexGrid[i][j] = -1;
              }
            }

            for (let i = 0; i < N; i++) {
              for (let j = 0; j < M; j++) {
                const a = indexGrid[i][j];
                const b = indexGrid[i + 1][j];
                const c = indexGrid[i + 1][j + 1];
                const d = indexGrid[i][j + 1];
                if (a !== -1 && b !== -1 && c !== -1) indices.push(a, b, c);
                if (a !== -1 && c !== -1 && d !== -1) indices.push(a, c, d);
              }
            }
          }

          if (indices.length >= 3) {
            geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
            geom.setIndex(indices);
            geom.computeVertexNormals();

            // Kết xuất bề mặt đổ bóng trơn láng mượt mà không đan lưới sắt
            const mat = new THREE.MeshStandardMaterial({
              color: sColor,
              roughness: 0.35,
              metalness: 0.15,
              transparent: true,
              opacity: aItem * surfaceOpacity,
              depthWrite: false,
              side: THREE.DoubleSide
            });
            const surfaceMesh = new THREE.Mesh(geom, mat);
            surfaceMesh.renderOrder = 0;
            group.add(surfaceMesh);
          }
        } catch (err) {}
      }

      // Vẽ vệt quỹ đạo đường cong 3D nét đứt cho vector tham số (chỉ khi có đúng 1 biến)
      const varCount = Array.isArray(it.vars) ? it.vars.length : 1;
      if (it.isParametric && typeof it.fn === "function" && it.showTrajectory !== false && varCount <= 1) {
        const exprText = (it.rawExprs || []).join(" ") + " " + (it.latex || "");
        const isTrig = /sin|cos/i.test(exprText);

        const activeVars = (Array.isArray(it.activeAnimVars) && it.activeAnimVars.length > 0)
          ? it.activeAnimVars
          : [it.paramVar || (it.vars && it.vars[0]) || "t"];

        activeVars.forEach((curVar) => {
          let tMin, tMax, numSamples;
          if (it.paramInfinity) {
            tMin = isTrig ? -Math.PI * 4 : -25.0;
            tMax = isTrig ? Math.PI * 4 : 25.0;
            numSamples = isTrig ? 180 : 220;
          } else {
            const rObj = it.varRanges?.[curVar];
            tMin = Number(rObj?.min ?? (curVar === it.paramVar ? it.paramMin : -10.0) ?? -10.0);
            tMax = Number(rObj?.max ?? (curVar === it.paramVar ? it.paramMax : 10.0) ?? 10.0);
            if (tMax <= tMin) tMax = tMin + 1.0;
            numSamples = Math.min(260, Math.max(60, Math.round((tMax - tMin) * 15)));
          }

          const curvePts = [];
          const dt = (tMax - tMin) / numSamples;
          const scope = Object.assign({}, it.scopeValues);

          for (let i = 0; i <= numSamples; i++) {
            const tVal = tMin + i * dt;
            scope[curVar] = tVal;
            try {
              const pt = it.fn.call(it, scope);
              if (Array.isArray(pt) && isFinite(pt[0]) && isFinite(pt[1])) {
                const z = isFinite(pt[2]) ? pt[2] : 0;
                if (Math.abs(pt[0]) <= 50 && Math.abs(pt[1]) <= 50 && Math.abs(z) <= 50) {
                  curvePts.push(new THREE.Vector3(pt[0] * u, pt[1] * u, z * u));
                }
              }
            } catch (e) {}
          }

          if (curvePts.length >= 2) {
            const geom = new THREE.BufferGeometry().setFromPoints(curvePts);
            const mat = new THREE.LineDashedMaterial({
              color: it.colorHex || 0x0090ff,
              transparent: true,
              opacity: aItem * 0.9,
              dashSize: 0.35 * u,
              gapSize: 0.2 * u,
              depthWrite: false
            });
            const line = new THREE.Line(geom, mat);
            line.computeLineDistances();
            line.renderOrder = 5;
            group.add(line);
          }
        });
      }

      if (it.showArrow !== false) {
        group.add(shaft, head, hitHead, proj, labelEl);
        Vec3D._pickableMeshes.push(shaft, head);
        Vec3D._pickableHeads.push(hitHead);
      }
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
            if (it.isImageMesh) {
              return Math.max(it.width || 12, it.height || 12) * 0.7;
            }
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

    // Dẹp sạch hoàn toàn Nori khỏi 3D: Nori chỉ hoạt động ở mặt phẳng 2D
    if (Vec3D._nori3DGroup) {
      Vec3D.removeNoriHamsterEntity3D();
    }

    // [BASIS & DIMENSION SUBSPACE HOOK 3D]
    if (window.App && App.BasisAnimator && App.BasisAnimator.isActive()) {
      App.BasisAnimator.render3D(Vec3D._mathGroup);
    }
    // [COORDINATE ANIMATION HOOK 3D]
    if (window.App && App.CoordAnimator && App.CoordAnimator.isActive()) {
      App.CoordAnimator.render3D(Vec3D._mathGroup);
    }
  };

  // --- THỰC THỂ LINH VẬT NORI: ĐÃ DẸP KHỎI KHÔNG GIAN 3D (CHỈ HOẠT ĐỘNG Ở 2D CHUẨN MỰC) ---
  Vec3D._nori3DGroup = null;
  Vec3D._noriTextureCache = {};

  Vec3D.removeNoriHamsterEntity3D = function () {
    if (!Vec3D._nori3DGroup) return;
    if (Vec3D._nori3DGroup.parent) {
      Vec3D._nori3DGroup.parent.remove(Vec3D._nori3DGroup);
    }
    Vec3D._nori3DGroup.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose?.();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m?.dispose?.());
      } else {
        obj.material?.dispose?.();
      }
    });
    Vec3D._nori3DGroup = null;
  };

  Vec3D.renderNoriHamsterEntity3D = function () {
    if (Vec3D._nori3DGroup) {
      Vec3D.removeNoriHamsterEntity3D();
    }
  };

  Vec3D.setNori3DExpression = function () {};
  Vec3D.applyTransformToNori3D = function () {
    if (Vec3D._nori3DGroup) {
      Vec3D.removeNoriHamsterEntity3D();
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
