// ===================== viewer2D.js (FULL + NEON PULSE FOCUS) =====================
(function () {
  window.Vec2D = window.Vec2D || {};

  const canvas2d = document.getElementById("canvas2d");
  if (!canvas2d) return;

  const ctx2d = canvas2d.getContext("2d", { alpha: false });

  // ----- State (Giữ nguyên toàn bộ) -----
  Vec2D.S2D = {
    pxPerUnit: 80,
    offsetX: 0,
    offsetY: 0,
    isPanningOne: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    velX: 0,
    velY: 0,
    lastTime: 0,
    momentumId: null,
    pointers: new Map(),
    lastCentroidX: null,
    lastCentroidY: null,
    lastDist: null,
    zoomVel: 0,
    pinchCooldown: 0,
    hoveredVectorId: null,
    dragStartOffset: null,
  };

  Vec2D.gridInfo2D = null;
  Vec2D._animLoopId = null;

  const VEC_STROKE_W = 3.2;
  const ARROW_HEAD = 14;

  // [FUNKY PULSE CONFIG]
  const PULSE_SPEED = 0.005; // Tốc độ nhịp
  const PULSE_MIN_W = 6; // Độ rộng min
  const PULSE_MAX_W = 20; // Độ rộng max
  const PULSE_COLOR = "#00ffff"; // Màu cyan neon

  const toVec2 = (v) => [Number(v?.[0]) || 0, Number(v?.[1]) || 0];

  function getLogicalSize() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas2d.width / dpr || 1;
    const h = canvas2d.height / dpr || 1;
    return { w, h };
  }

  // --- INIT ---
  Vec2D.init2D = function () {
    const App = window.App || {};
    Vec2D.resize2D();
    Vec2D.bind2DEvents();
    if (canvas2d) canvas2d.style.touchAction = "none";
    if (App.applyTheme) App.applyTheme();

    const viewerDiv = document.getElementById("viewer");
    if (viewerDiv) {
      const ro = new ResizeObserver(() => {
        if (App.mode === "2D") {
          Vec2D.resize2D();
          Vec2D.draw2DAllVectors();
        }
      });
      ro.observe(viewerDiv);
    }
  };

  Vec2D.show2D = function () {
    const canvas = document.getElementById("canvas2d");
    const threeLayer = document.getElementById("threeLayer");
    if (canvas) canvas.style.display = "block";
    if (threeLayer) threeLayer.style.display = "none";
    const overlay = document.getElementById("labels2dOverlay");
    if (overlay) overlay.style.display = "block";
    if (document.body) {
      document.body.classList.add("mode-2d");
      document.body.classList.remove("mode-3d");
    }

    requestAnimationFrame(() => {
      Vec2D.resize2D();
      if (!Vec2D._animLoopId) Vec2D.draw2DAllVectors();
    });
  };

  Vec2D.resize2D = function () {
    const el = document.getElementById("viewer");
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (rect.width === 0 || rect.height === 0) return;
    const c = canvas2d || document.getElementById("canvas2d");
    const ctx = ctx2d || (c ? c.getContext("2d", { alpha: false }) : null);
    if (!c || !ctx) return;
    c.width = Math.floor(rect.width * dpr);
    c.height = Math.floor(rect.height * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  };

  // --- EVENT HANDLERS (GIỮ NGUYÊN 100%) ---
  function centroidOfPointers(ptrs) {
    let sx = 0,
      sy = 0,
      n = 0;
    for (const p of ptrs.values()) {
      sx += p.x;
      sy += p.y;
      n++;
    }
    if (!n) return null;
    return { x: sx / n, y: sy / n };
  }

  function distanceTwoPointers(ptrs) {
    if (ptrs.size !== 2) return null;
    const it = ptrs.values();
    const a = it.next().value,
      b = it.next().value;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function applyZoomAboutScreenPoint(mx, my, factor) {
    const { w, h } = getLogicalSize();
    const cx = w / 2 + Vec2D.S2D.offsetX;
    const cy = h / 2 + Vec2D.S2D.offsetY;
    const wx = (mx - cx) / Vec2D.S2D.pxPerUnit;
    const wy = (cy - my) / Vec2D.S2D.pxPerUnit;
    Vec2D.S2D.pxPerUnit *= factor;
    if (!isFinite(Vec2D.S2D.pxPerUnit) || Vec2D.S2D.pxPerUnit <= 1e-12)
      Vec2D.S2D.pxPerUnit = 1e-12;
    if (Vec2D.S2D.pxPerUnit > 1e12) Vec2D.S2D.pxPerUnit = 1e12;
    const cxNew = mx - wx * Vec2D.S2D.pxPerUnit;
    const cyNew = my + wy * Vec2D.S2D.pxPerUnit;
    Vec2D.S2D.offsetX = cxNew - w / 2;
    Vec2D.S2D.offsetY = cyNew - h / 2;
  }

  // [TÌM VÀ DÁN ĐÈ TRONG viewer2D.js]
  Vec2D.bind2DEvents = function () {
    window.addEventListener("resize", () => {
      const App = window.App || {};
      if (App.mode === "2D") {
        Vec2D.resize2D();
        Vec2D.draw2DAllVectors();
      }
    });

    function distPointToSegment(px, py, x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const l2 = dx * dx + dy * dy;
      if (l2 < 1e-6) return Math.hypot(px - x1, py - y1);
      let t = ((px - x1) * dx + (py - y1) * dy) / l2;
      t = Math.max(0, Math.min(1, t));
      const projX = x1 + t * dx;
      const projY = y1 + t * dy;
      return Math.hypot(px - projX, py - projY);
    }

    // --- HAM TINH BAO: KIEM TRA CHUOT CO CHAM NGON, NHAN HOAC THAN VECTOR KHONG ---
    function getHitVectorId(mx, my) {
      if (typeof App.isInteractionBlocked === "function" && App.isInteractionBlocked()) return null;
      if (!App.vectorList || !Vec2D.gridInfo2D) return null;
      const { cx, cy, px } = Vec2D.gridInfo2D;
      
      let hitId = null;
      let minDistance = 25; // Ban kinh nhay cam dau mui ten
      const hasFocus = App.vectorList.some(v => v.focus);

      // 1. Uu tien ngon vector (Tip)
      for (let i = App.vectorList.length - 1; i >= 0; i--) {
        const v = App.vectorList[i];
        if (v.visible === false || v.isImageMesh || !v.vec || v.showArrow === false) continue;
        
        const vx = Number(v.vec[0] || 0);
        const vy = Number(v.vec[1] || 0);
        const tipX = cx + vx * px;
        const tipY = cy - vy * px;

        const dist = Math.hypot(mx - tipX, my - tipY);

        if (hasFocus) {
            if (v.focus && dist <= 30) return v.id;
            continue;
        }

        if (dist <= minDistance) {
            minDistance = dist;
            hitId = v.id;
        }
      }
      if (hitId) return hitId;

      // 2. Kiem tra Nhan vector (Label bounds)
      if (Vec2D._labelBounds) {
        for (let i = App.vectorList.length - 1; i >= 0; i--) {
          const v = App.vectorList[i];
          if (v.visible === false || v.isImageMesh || !v.vec || v.showArrow === false) continue;
          if (hasFocus && !v.focus) continue;

          const bounds = Vec2D._labelBounds.get(v.id);
          if (bounds) {
            if (mx >= bounds.left && mx <= bounds.right && my >= bounds.top && my <= bounds.bottom) {
              return v.id;
            }
          }
        }
      }

      // 3. Kiem tra Than mui ten (Shaft)
      for (let i = App.vectorList.length - 1; i >= 0; i--) {
        const v = App.vectorList[i];
        if (v.visible === false || v.isImageMesh || !v.vec || v.showArrow === false) continue;
        if (hasFocus && !v.focus) continue;

        const vx = Number(v.vec[0] || 0);
        const vy = Number(v.vec[1] || 0);
        const tipX = cx + vx * px;
        const tipY = cy - vy * px;

        const distToShaft = distPointToSegment(mx, my, cx, cy, tipX, tipY);
        if (distToShaft <= 10) {
          return v.id;
        }
      }

      return null;
    }

    canvas2d.addEventListener("pointerdown", (e) => {
      Vec2D.S2D.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (Vec2D.S2D.momentumId) cancelAnimationFrame(Vec2D.S2D.momentumId);
      const n = Vec2D.S2D.pointers.size;
      Vec2D.S2D.lastTime = performance.now();

      const rect = canvas2d.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (n === 1) {
        // RADAR BAT VAT THE (Mui ten hoac Nhan)
        const hitId = getHitVectorId(mouseX, mouseY);
        const isBlocked = typeof App.isInteractionBlocked === "function" && App.isInteractionBlocked();
        if (hitId && !isBlocked && !(window.App && App.isAnimating)) {
            Vec2D.S2D.draggedVectorId = hitId;
            const hitV = App.vectorList.find((v) => v.id === hitId);
            if (hitV && Vec2D.gridInfo2D) {
              const { cx, cy, px } = Vec2D.gridInfo2D;
              const mouseMathX = (mouseX - cx) / px;
              const mouseMathY = -(mouseY - cy) / px;
              const curVx = Number(hitV.vec[0] || 0);
              const curVy = Number(hitV.vec[1] || 0);

              // PHUONG AN 1: Khoa do lech tuong doi giua chuot va ngon vector tai thoi diem click
              Vec2D.S2D.dragStartOffset = {
                x: mouseMathX - curVx,
                y: mouseMathY - curVy,
              };

              if (window.App && App.History && typeof App.History.snapshot === "function") {
                Vec2D.S2D._dragPreState = App.History.snapshot(`Di chuyển vector #${hitId}`);
                Vec2D.S2D._dragStartVec = [...hitV.vec];
              }
            }
            canvas2d.style.cursor = "grabbing";
            canvas2d.setPointerCapture(e.pointerId);
            return; // Dung tai day, KHONG bat co Pan do thi
        }

        // NEU KHONG TRUNG VECTOR -> PAN DO THI NHU CU
        Vec2D.S2D.isPanningOne = true;
        Vec2D.S2D.draggedVectorId = null;
        Vec2D.S2D.startX = e.clientX - Vec2D.S2D.offsetX;
        Vec2D.S2D.startY = e.clientY - Vec2D.S2D.offsetY;
        Vec2D.S2D.lastX = e.clientX;
        Vec2D.S2D.lastY = e.clientY;
        canvas2d.setPointerCapture(e.pointerId);
        canvas2d.style.cursor = "grabbing";
      } else if (n === 2) {
        // Tha vector neu lo cham ngon 2
        Vec2D.S2D.draggedVectorId = null;
        const c = centroidOfPointers(Vec2D.S2D.pointers);
        Vec2D.S2D.lastCentroidX = c.x;
        Vec2D.S2D.lastCentroidY = c.y;
        Vec2D.S2D.lastDist = distanceTwoPointers(Vec2D.S2D.pointers);
        Vec2D.S2D.isPanningOne = false;
      }
      e.preventDefault();
    });

    canvas2d.addEventListener("pointermove", (e) => {
      const App = window.App || {};

      // Hover detection khi khong keo hoac pan
      if (Vec2D.S2D.pointers.size === 0) {
        const isBlocked = typeof App.isInteractionBlocked === "function" && App.isInteractionBlocked();
        const rect = canvas2d.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const hitId = isBlocked ? null : getHitVectorId(mx, my);
        if (hitId !== Vec2D.S2D.hoveredVectorId) {
          Vec2D.S2D.hoveredVectorId = hitId;
          canvas2d.style.cursor = (!isBlocked && hitId) ? "grab" : "default";
          Vec2D.draw2DAllVectors();
        }
        return;
      }

      if (!Vec2D.S2D.pointers.has(e.pointerId)) return;
      Vec2D.S2D.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const now = performance.now();
      const dt = now - Vec2D.S2D.lastTime || 16;
      const n = Vec2D.S2D.pointers.size;

      // --- LOGIC KEO VECTOR (DRAG) ---
      if (Vec2D.S2D.draggedVectorId && n === 1) {
          canvas2d.style.cursor = "grabbing";
          const vItem = App.vectorList.find(v => v.id === Vec2D.S2D.draggedVectorId);
          if (vItem && Vec2D.gridInfo2D) {
              const { cx, cy, px } = Vec2D.gridInfo2D;
              const rect = canvas2d.getBoundingClientRect();
              const mx = e.clientX - rect.left;
              const my = e.clientY - rect.top;

              // Chuyen Pixel nguoc ve Toan hoc
              let mouseMathX = (mx - cx) / px;
              let mouseMathY = -(my - cy) / px;

              // Giu Ctrl -> Hit vao cac vach dang hien tren luoi do thi
              if (e.ctrlKey) {
                  const step = Vec2D.gridInfo2D ? Vec2D.gridInfo2D.stepUnit : 1;
                  mouseMathX = Math.round(mouseMathX / step) * step;
                  mouseMathY = Math.round(mouseMathY / step) * step;
              }

              // PHUONG AN 1: Ap dung do lech tuong doi da khoa
              const offset = Vec2D.S2D.dragStartOffset || { x: 0, y: 0 };
              let mathX = mouseMathX - offset.x;
              let mathY = mouseMathY - offset.y;

              if (e.ctrlKey) {
                  const step = Vec2D.gridInfo2D ? Vec2D.gridInfo2D.stepUnit : 1;
                  mathX = Math.round(mathX / step) * step;
                  mathY = Math.round(mathY / step) * step;
              }

              // Update data realtime (Duy tri cac chieu cao hon neu co)
              vItem.vec[0] = mathX;
              vItem.vec[1] = mathY;
              
              // [LIVE SYNC] ÉP ĐỒNG BỘ PHÉP CHIẾU THỜI GIAN THỰC (ZERO LAG)
              if (App.currentProjVisual) {
                  const v1 = App.vectorList.find(v => v.id === App.currentProjVisual.v1Id);
                  const res = App.vectorList.find(v => v.id === App.currentProjVisual.resId);
                  const v2 = App.vectorList.find(v => v.id === App.currentProjVisual.v2Id);
                  
                  // Nếu Sếp đang nắm đầu vật thể (v1) hoặc giá đỡ (v2)
                  if (v1 && res && v2 && (vItem.id === v1.id || vItem.id === v2.id)) {
                      let dot = 0, magSq = 0;
                      const dim = Math.max(v1.vec.length, v2.vec.length);
                      // Tự xử lý Toán học ngay trên máy Sếp để chống giật
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
                      // Ra lệnh cho nét đứt và góc vuông bám theo ngay lập tức!
                      if (typeof App.refreshProjectionOverlay === "function") {
                          App.refreshProjectionOverlay();
                      }
                  }
              }

              // Xóa Label thật, báo UI tạm thời `[..., ...]`
              App.coordOut?.(`[..., ...]`);
              
              // Kích hoạt vẽ lại (chỉ vẽ Canvas, không đụng DOM)
              Vec2D.draw2DAllVectors(); 
          }
          return; // Chặn ngang, không cho chạy xuống logic Pan đồ thị
      }

      // --- LOGIC PAN/ZOOM ĐỒ THỊ NHƯ CŨ ---
      if (n >= 2) {
        const c = centroidOfPointers(Vec2D.S2D.pointers);
        const dist = distanceTwoPointers(Vec2D.S2D.pointers);
        if (Vec2D.S2D.lastCentroidX != null) {
          const dx = c.x - Vec2D.S2D.lastCentroidX;
          const dy = c.y - Vec2D.S2D.lastCentroidY;
          Vec2D.S2D.offsetX += dx;
          Vec2D.S2D.offsetY += dy;
          Vec2D.S2D.velX = dx / dt;
          Vec2D.S2D.velY = dy / dt;
        }
        if (Vec2D.S2D.lastDist) {
          const rawFactor = dist / Vec2D.S2D.lastDist;
          const factor = Math.pow(rawFactor, 0.9);
          applyZoomAboutScreenPoint(c.x, c.y, factor);
          Vec2D.S2D.zoomVel = Math.log(factor) / dt;
        }
        Vec2D.S2D.lastCentroidX = c.x;
        Vec2D.S2D.lastCentroidY = c.y;
        Vec2D.S2D.lastDist = dist;
        Vec2D.S2D.lastTime = now;
        return;
      }

      if (Vec2D.S2D.isPanningOne && n === 1) {
        if (e.shiftKey) {
          const dy = e.clientY - Vec2D.S2D.lastY;
          const factor = dy > 0 ? 1 + dy * 0.01 : 1 / (1 - dy * 0.01);
          const rect = canvas2d.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          applyZoomAboutScreenPoint(mx, my, factor);
          Vec2D.S2D.lastX = e.clientX;
          Vec2D.S2D.lastY = e.clientY;
          Vec2D.S2D.lastTime = now;
          return;
        }

        if (Vec2D.S2D.pinchCooldown && now < Vec2D.S2D.pinchCooldown) {
          Vec2D.S2D.startX = e.clientX - Vec2D.S2D.offsetX;
          Vec2D.S2D.startY = e.clientY - Vec2D.S2D.offsetY;
          Vec2D.S2D.lastX = e.clientX;
          Vec2D.S2D.lastY = e.clientY;
          Vec2D.S2D.lastTime = now;
          return;
        }

        Vec2D.S2D.offsetX = e.clientX - Vec2D.S2D.startX;
        Vec2D.S2D.offsetY = e.clientY - Vec2D.S2D.startY;

        const rawVelX = (e.clientX - Vec2D.S2D.lastX) / Math.max(dt, 5);
        const rawVelY = (e.clientY - Vec2D.S2D.lastY) / Math.max(dt, 5);
        Vec2D.S2D.velX = Vec2D.S2D.velX * 0.5 + rawVelX * 0.5;
        Vec2D.S2D.velY = Vec2D.S2D.velY * 0.5 + rawVelY * 0.5;
        const MAX_VEL = 2.5;
        Vec2D.S2D.velX = Math.max(-MAX_VEL, Math.min(MAX_VEL, Vec2D.S2D.velX));
        Vec2D.S2D.velY = Math.max(-MAX_VEL, Math.min(MAX_VEL, Vec2D.S2D.velY));

        Vec2D.S2D.lastX = e.clientX;
        Vec2D.S2D.lastY = e.clientY;
        Vec2D.S2D.lastTime = now;
      }
    });

    const endPointer = (e) => {
      const App = window.App || {};
      if (!Vec2D.S2D.pointers.has(e.pointerId)) return;
      Vec2D.S2D.pointers.delete(e.pointerId);
      const n = Vec2D.S2D.pointers.size;

      // --- CHỐT SỔ DRAG VECTOR ---
      if (Vec2D.S2D.draggedVectorId) {
          // 1. CHỐT SỐ VECTOR VẬT THỂ VỪA KÉO
          const draggedVec = App.vectorList.find(v => v.id === Vec2D.S2D.draggedVectorId);
          if (draggedVec) {
              // Ép mảng số về chuẩn 2 chữ số (Cắt bỏ rác thập phân do JS tính toán)
              draggedVec.vec = draggedVec.vec.map(val => Number(Number(val).toFixed(2)));
              // Nạp lại chuỗi Latex để Sidebar cập nhật số mới (nếu không phải vector tham số)
              if (!draggedVec.isParametric) {
                draggedVec.latex = `[${draggedVec.vec.join(", ")}]`;
              }

              // [HOÀN TÁC THÔNG MINH]: Chỉ lưu nếu vector có thay đổi vị trí thực tế
              if (
                Vec2D.S2D._dragPreState &&
                Vec2D.S2D._dragStartVec &&
                window.App &&
                App.History &&
                typeof App.History.record === "function"
              ) {
                const moved = draggedVec.vec.some(
                  (val, i) => Math.abs(val - (Vec2D.S2D._dragStartVec[i] || 0)) > 0.001
                );
                if (moved) {
                  App.History.record(`Di chuyển vector #${draggedVec.id}`, Vec2D.S2D._dragPreState);
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

          Vec2D.S2D._dragPreState = null;
          Vec2D.S2D._dragStartVec = null;
          Vec2D.S2D.draggedVectorId = null;
          Vec2D.S2D.dragStartOffset = null;
          const rect = canvas2d.getBoundingClientRect();
          const mx = (e && typeof e.clientX === "number") ? e.clientX - rect.left : -9999;
          const my = (e && typeof e.clientY === "number") ? e.clientY - rect.top : -9999;
          const isBlocked = typeof App.isInteractionBlocked === "function" && App.isInteractionBlocked();
          const stillHit = isBlocked ? null : getHitVectorId(mx, my);
          canvas2d.style.cursor = (!isBlocked && stillHit) ? "grab" : "default";
          
          // 2. CHỐT SỐ VECTOR BÓNG (HÌNH CHIẾU) VÀ Ô OUTPUT KẾT QUẢ
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

          // 3. Ra lệnh vẽ lại Sidebar
          if (App.renderVectorList) App.renderVectorList();
          if (App.refreshCalcVectorOptions) App.refreshCalcVectorOptions();

          return;
      }

      if (n === 0) {
        if (canvas2d.releasePointerCapture)
          canvas2d.releasePointerCapture(e.pointerId);
        canvas2d.style.cursor = "default";
        Vec2D.S2D.isPanningOne = false;
        Vec2D.S2D.lastCentroidX = Vec2D.S2D.lastCentroidY = null;
        Vec2D.S2D.lastDist = null;
        Vec2D.S2D.velX = 0;
        Vec2D.S2D.velY = 0;
        Vec2D.S2D.zoomVel = 0;
        if (Vec2D.S2D.momentumId) {
          cancelAnimationFrame(Vec2D.S2D.momentumId);
          Vec2D.S2D.momentumId = null;
        }
      } else if (n === 1) {
        const remain = Vec2D.S2D.pointers.values().next().value;
        Vec2D.S2D.isPanningOne = true;
        Vec2D.S2D.startX = remain.x - Vec2D.S2D.offsetX;
        Vec2D.S2D.startY = remain.y - Vec2D.S2D.offsetY;
        Vec2D.S2D.lastX = remain.x;
        Vec2D.S2D.lastY = remain.y;
        Vec2D.S2D.lastTime = performance.now();
        Vec2D.S2D.lastCentroidX = Vec2D.S2D.lastCentroidY = null;
        Vec2D.S2D.lastDist = null;
        Vec2D.S2D.velX = 0;
        Vec2D.S2D.velY = 0;
        Vec2D.S2D.zoomVel = 0;

        Vec2D.S2D.pinchCooldown = performance.now() + 200;
      } else {
        const c = centroidOfPointers(Vec2D.S2D.pointers);
        Vec2D.S2D.lastCentroidX = c.x;
        Vec2D.S2D.lastCentroidY = c.y;
        Vec2D.S2D.lastDist = distanceTwoPointers(Vec2D.S2D.pointers);
        Vec2D.S2D.lastTime = performance.now();
      }
    };

    canvas2d.addEventListener("pointerup", endPointer);
    canvas2d.addEventListener("pointercancel", endPointer);
    canvas2d.addEventListener("pointerleave", () => {
      if (Vec2D.S2D.hoveredVectorId) {
        Vec2D.S2D.hoveredVectorId = null;
        canvas2d.style.cursor = "default";
        Vec2D.draw2DAllVectors();
      }
    });
    
    canvas2d.addEventListener(
      "wheel",
      (e) => {
        const rect = canvas2d.getBoundingClientRect();
        const mx = e.clientX - rect.left,
          my = e.clientY - rect.top;
        const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
        applyZoomAboutScreenPoint(mx, my, factor);

        // --- CẬP NHẬT VECTOR NẾU VỪA DRAG VỪA ZOOM ---
        if (Vec2D.S2D.draggedVectorId && Vec2D.gridInfo2D) {
            const vItem = App.vectorList.find(v => v.id === Vec2D.S2D.draggedVectorId);
            if (vItem) {
                // Do pxPerUnit vừa thay đổi, ta tính lại Toán học để vector dính chặt vào con chuột
                const { cx, cy, px } = Vec2D.S2D; // Lay state truc tiep vi gridInfo chua kip update
                let mouseMathX = (mx - cx) / px;
                let mouseMathY = -(my - cy) / px;
                const offset = Vec2D.S2D.dragStartOffset || { x: 0, y: 0 };
                let mathX = mouseMathX - offset.x;
                let mathY = mouseMathY - offset.y;

                if (e.ctrlKey) {
                    const step = Vec2D.gridInfo2D ? Vec2D.gridInfo2D.stepUnit : 1;
                    mathX = Math.round(mathX / step) * step;
                    mathY = Math.round(mathY / step) * step;
                }
                vItem.vec[0] = mathX;
                vItem.vec[1] = mathY;
                Vec2D.draw2DAllVectors(); 
            }
        }
        e.preventDefault();
      },
      { passive: false },
    );
  };

  // --- [HAM VE CHU TEXT HALO HOC THUAT (TIEP MAU NEN, KHONG DUNG HOP DUC)] ---
  function drawHaloText(ctx, text, x, y, options = {}) {
    const isDark = (window.App && App.theme === "dark") || document.documentElement.classList.contains("dark") || (document.body && document.body.classList.contains("dark"));
    const haloColor = options.haloColor || (isDark ? "#111113" : "#ffffff");
    const textColor = options.color || (isDark ? "#f1f5f9" : "#1e293b");

    ctx.save();
    ctx.font = options.font || "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Be Vietnam Pro', Roboto, sans-serif";
    ctx.textAlign = options.align || "center";
    ctx.textBaseline = options.baseline || "top";

    // Quang sang halo tiep mau nen de chu noi bat tren luoi va truc
    ctx.strokeStyle = haloColor;
    ctx.lineWidth = options.haloWidth || 4.0;
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.strokeText(text, x, y);

    // Chu thuc
    ctx.fillStyle = textColor;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // --- [HAM VE NHAN VECTOR CHONG VA CHAM & TEXT HALO - TOI UU HIEU NANG ZERO-LAG] ---
  // --- [HAM CAP NHAT NHAN VECTOR 2D CHUAN KATEX TRUONG HOP THEO OVERLAY LAYER] ---
  function draw2DVectorLabels(ctx, list, gridInfo) {
    const App = window.App || {};
    const overlay = document.getElementById("labels2dOverlay");

    if (App.mode === "3D" || (document.body && document.body.classList.contains("mode-3d"))) {
      if (overlay) {
        overlay.style.display = "none";
        overlay.innerHTML = "";
      }
      return;
    }

    const settings = App.graphSettings || { labelMode: "name" };

    if (!gridInfo || settings.labelMode === "none" || !list || list.length === 0) {
      if (overlay) overlay.innerHTML = "";
      return;
    }

    const { cx, cy, px } = gridInfo;
    const isDark = (window.App && App.theme === "dark") || document.documentElement.classList.contains("dark") || (document.body && document.body.classList.contains("dark"));

    // Thu thap toa do nhanh gon khong cap phat mang trung gian
    const n = list.length;
    const tipData = [];
    for (let i = 0; i < n; i++) {
      const v = list[i];
      if (v.visible === false || v.isImageMesh || !Array.isArray(v.vec) || v.showArrow === false) continue;
      const vx = Number(v.vec[0] || 0);
      const vy = Number(v.vec[1] || 0);
      const lenSq = vx * vx + vy * vy;
      if (lenSq < 1e-8) continue;
      const tipX = cx + vx * px;
      const tipY = cy - vy * px;
      const angle = Math.atan2(-vy, vx);
      tipData.push({ item: v, vx, vy, tipX, tipY, angle });
    }

    const count = tipData.length;
    if (count === 0) {
      if (overlay) overlay.innerHTML = "";
      return;
    }

    const activeLabelIds = new Set();

    for (let i = 0; i < count; i++) {
      const entry = tipData[i];
      const item = entry.item;
      const isHoveredOrFocused = (Vec2D.S2D.hoveredVectorId === item.id) || (Vec2D.S2D.draggedVectorId === item.id) || !!item.focus;
      const showCoord = settings.labelMode === "both" || isHoveredOrFocused;

      // Do vector lan can trong ban kinh 45px (2025 = 45^2 de tranh can bac hai)
      let shiftCount = 0;
      let myRank = 0;
      for (let j = 0; j < count; j++) {
        if (i === j) continue;
        const dx = tipData[j].tipX - entry.tipX;
        const dy = tipData[j].tipY - entry.tipY;
        if (dx * dx + dy * dy < 2025) {
          shiftCount++;
          if (tipData[j].item.id < item.id) myRank++;
        }
      }

      let labelX = entry.tipX + Math.cos(entry.angle) * 16;
      let labelY = entry.tipY + Math.sin(entry.angle) * 16;
      let align = Math.cos(entry.angle) > 0.3 ? "left" : (Math.cos(entry.angle) < -0.3 ? "right" : "center");
      let baseline = Math.sin(entry.angle) > 0.3 ? "top" : (Math.sin(entry.angle) < -0.3 ? "bottom" : "middle");

      if (shiftCount > 0) {
        const shiftFactor = myRank - shiftCount / 2;
        const nx = -Math.sin(entry.angle);
        const ny = Math.cos(entry.angle);
        labelX += nx * shiftFactor * 30;
        labelY += ny * shiftFactor * 24;

        if (Math.abs(nx * shiftFactor) > 0.15) {
          align = (nx * shiftFactor > 0) ? "left" : "right";
        }
      }

      const isBasisAnim = window.App && (App._basisAnimActive || (App.BasisAnimator && typeof App.BasisAnimator.isActive === "function" && App.BasisAnimator.isActive()));
      const isCoordAnim = window.App && (App._coordAnimActive || (App.CoordAnimator && typeof App.CoordAnimator.isActive === "function" && App.CoordAnimator.isActive()));
      const labelColor = (isBasisAnim && item._basisColorCss)
        ? item._basisColorCss
        : ((isCoordAnim && item._coordColorCss)
          ? item._coordColorCss
          : (item.colorCss || item.colorHex || (isDark ? "#ffffff" : "#111827")));
      const latex = App.getVectorLatexLabel ? App.getVectorLatexLabel(item, showCoord) : (item.name || "v");

      if (overlay) {
        const domId = `vecLabel2D_${item.id}`;
        activeLabelIds.add(domId);
        let el = document.getElementById(domId);
        if (!el) {
          el = document.createElement("div");
          el.id = domId;
          el.className = "vec-label-2d";
          overlay.appendChild(el);
        }

        if (el.dataset.latex !== latex) {
          el.dataset.latex = latex;
          if (window.katex) {
            el.innerHTML = katex.renderToString(latex, { throwOnError: false, displayMode: false });
          } else {
            el.textContent = latex;
          }
        }

        el.style.color = "var(--text-main, #edeef0)";
        el.style.setProperty("--vec-color", labelColor);
        el.style.borderColor = labelColor;
        if (isHoveredOrFocused) {
          el.classList.add("is-hovered");
        } else {
          el.classList.remove("is-hovered");
        }
        if (isBasisAnim && typeof item._basisAlpha === "number") {
          el.style.opacity = String(item._basisAlpha);
        } else if (isCoordAnim && typeof item._coordAlpha === "number") {
          el.style.opacity = String(item._coordAlpha);
        } else {
          el.style.opacity = "";
        }
        const tx = align === "left" ? "0%" : (align === "right" ? "-100%" : "-50%");
        const ty = baseline === "top" ? "0%" : (baseline === "bottom" ? "-100%" : "-50%");
        el.style.transform = `translate3d(${labelX}px, ${labelY}px, 0) translate(${tx}, ${ty})`;
        el.style.display = (settings.labelMode === "none" && !isHoveredOrFocused) ? "none" : "";

        // Cache toa do hop nhan de Radar nhan dien chuot hover va click keo (Phuong an 1)
        Vec2D._labelBounds = Vec2D._labelBounds || new Map();
        const canvas2dEl = document.getElementById("canvas2d");
        if (canvas2dEl) {
          const cRect = canvas2dEl.getBoundingClientRect();
          const eRect = el.getBoundingClientRect();
          Vec2D._labelBounds.set(item.id, {
            left: eRect.left - cRect.left - 4,
            top: eRect.top - cRect.top - 4,
            right: eRect.right - cRect.left + 4,
            bottom: eRect.bottom - cRect.top + 4,
          });
        }
      } else {
        const font = showCoord
          ? "italic 600 14.5px 'STIX Two Text', 'KaTeX_Math', 'Times New Roman', serif"
          : "italic 600 15px 'STIX Two Text', 'KaTeX_Math', 'Times New Roman', serif";
        drawHaloText(ctx, latex, labelX, labelY, {
          font: font,
          color: labelColor,
          haloColor: haloColor,
          align: align,
          baseline: baseline,
          haloWidth: 4.2,
        });
      }
    }

    if (overlay) {
      const allChilds = Array.from(overlay.children);
      for (const ch of allChilds) {
        if (!activeLabelIds.has(ch.id)) {
          ch.remove();
        }
      }
      if (Vec2D._labelBounds) {
        for (const id of Vec2D._labelBounds.keys()) {
          if (!list.some((v) => v.id === id)) {
            Vec2D._labelBounds.delete(id);
          }
        }
      }
    }
  }

  Vec2D.render2DGrid = function () {
    const App = window.App || {};
    const settings = App.graphSettings || { gridMode: "full", labelMode: "name", showAxes: true };
    const { w, h } = getLogicalSize();
    const cx = w / 2 + Vec2D.S2D.offsetX,
      cy = h / 2 + Vec2D.S2D.offsetY,
      px = Vec2D.S2D.pxPerUnit;

    const isDark = (window.App && App.theme === "dark") || document.documentElement.classList.contains("dark") || (document.body && document.body.classList.contains("dark"));
    ctx2d.fillStyle = isDark ? "#111113" : "#ffffff";
    ctx2d.fillRect(0, 0, w, h);

    const targetPx = 70;
    const rawStep = targetPx / Math.max(1e-30, px);
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const res = rawStep / mag;
    let stepUnit =
      res <= 1 ? 1 * mag : res <= 2 ? 2 * mag : res <= 5 ? 5 * mag : 10 * mag;
    const tickPx = stepUnit * px;
    const subTickPx = tickPx / 5;

    const startKx = Math.floor(-cx / tickPx) - 1,
      endKx = Math.ceil((w - cx) / tickPx) + 1;
    const startKy = Math.floor((cy - h) / tickPx) - 1,
      endKy = Math.ceil((cy + h) / tickPx) + 1;

    // TY LE TUONG PHAN TUY CHINH THEO THANH TRUOT SLIDER (0% den 100%)
    let baseAlpha = 0.50;
    if (typeof settings.gridContrast === "number") {
      baseAlpha = Math.max(0, Math.min(100, settings.gridContrast)) / 100;
    } else if (settings.gridContrast === "subtle") {
      baseAlpha = 0.35;
    } else if (settings.gridContrast === "high") {
      baseAlpha = 0.70;
    }
    const isLTActive = !!(window.App?.LinearTransform?.isActive?.() && window.App.LinearTransform.t > 0.02);
    const ltFade = isLTActive ? 0.45 : 1.0;
    const majorAlphaMult = baseAlpha * ltFade;
    const minorAlphaMult = baseAlpha * 0.5 * ltFade; // Ty le phan cap 50% so voi luoi chinh

    // 1. Luoi phu (Minor Grid - tuong phan 25% so voi truc, em diu khong gay ngop mat)
    if (settings.gridMode === "full") {
      const distFade = Math.min(1, Math.max(0.2, (tickPx - 15) / 30));
      ctx2d.save();
      ctx2d.strokeStyle = isDark ? "#475569" : "#94a3b8";
      ctx2d.lineWidth = 0.65;
      ctx2d.globalAlpha = minorAlphaMult * distFade;
      ctx2d.beginPath();
      for (let x = cx % subTickPx; x <= w; x += subTickPx) {
        ctx2d.moveTo(x, 0);
        ctx2d.lineTo(x, h);
      }
      for (let y = cy % subTickPx; y <= h; y += subTickPx) {
        ctx2d.moveTo(0, y);
        ctx2d.lineTo(w, y);
      }
      ctx2d.stroke();
      ctx2d.restore();
    }

    // 2. Luoi chinh (Major Grid - tuong phan 50% so voi truc, phan cap ro net)
    if (settings.gridMode === "full" || settings.gridMode === "major") {
      ctx2d.save();
      ctx2d.strokeStyle = isDark ? "#94a3b8" : "#64748b";
      ctx2d.lineWidth = 1.0;
      ctx2d.globalAlpha = majorAlphaMult;
      ctx2d.beginPath();
      for (let k = startKx; k <= endKx; k++) {
        const x = cx + k * tickPx;
        ctx2d.moveTo(x, 0);
        ctx2d.lineTo(x, h);
      }
      for (let k = startKy; k <= endKy; k++) {
        const y = cy - k * tickPx;
        ctx2d.moveTo(0, y);
        ctx2d.lineTo(w, y);
      }
      ctx2d.stroke();
      ctx2d.restore();
    }

    // 3. Truc toa do va so khac (Axes & Labels - tuong phan 100% vung chai, ro ret)
    if (settings.showAxes !== false) {
      const axisColor = isDark ? "#f8fafc" : "#0f172a";
      const haloColor = isDark ? "#111113" : "#ffffff";
      const labelColor = isDark ? "#cbd5e1" : "#334155";

      ctx2d.save();
      ctx2d.strokeStyle = axisColor;
      ctx2d.lineWidth = 1.8;
      ctx2d.globalAlpha = isLTActive ? 0.40 : 1.0;
      ctx2d.beginPath();
      ctx2d.moveTo(0, cy);
      ctx2d.lineTo(w, cy);
      ctx2d.moveTo(cx, 0);
      ctx2d.lineTo(cx, h);
      ctx2d.stroke();

      // Mui ten dau truc Ox
      if (cy >= 0 && cy <= h) {
        ctx2d.beginPath();
        ctx2d.moveTo(w - 10, cy - 4.5);
        ctx2d.lineTo(w - 1, cy);
        ctx2d.lineTo(w - 10, cy + 4.5);
        ctx2d.fillStyle = axisColor;
        ctx2d.fill();
        ctx2d.stroke();

        drawHaloText(ctx2d, "x", w - 12, cy - 14, {
          font: "italic 700 14.5px 'STIX Two Text', 'KaTeX_Math', 'Times New Roman', serif",
          color: axisColor,
          haloColor: haloColor,
          align: "right",
          baseline: "bottom",
          haloWidth: 3.5,
        });
      }

      // Mui ten dau truc Oy
      if (cx >= 0 && cx <= w) {
        ctx2d.beginPath();
        ctx2d.moveTo(cx - 4.5, 10);
        ctx2d.lineTo(cx, 1);
        ctx2d.lineTo(cx + 4.5, 10);
        ctx2d.fillStyle = axisColor;
        ctx2d.fill();
        ctx2d.stroke();

        drawHaloText(ctx2d, "y", cx + 12, 4, {
          font: "italic 700 14.5px 'STIX Two Text', 'KaTeX_Math', 'Times New Roman', serif",
          color: axisColor,
          haloColor: haloColor,
          align: "left",
          baseline: "top",
          haloWidth: 3.5,
        });
      }

      // Vach chia khac 7px (+- 3.5px)
      ctx2d.lineWidth = 1.2;
      ctx2d.beginPath();
      for (let k = startKx; k <= endKx; k++) {
        if (k === 0) continue;
        const x = cx + k * tickPx;
        ctx2d.moveTo(x, cy - 3.5);
        ctx2d.lineTo(x, cy + 3.5);
      }
      for (let k = startKy; k <= endKy; k++) {
        if (k === 0) continue;
        const y = cy - k * tickPx;
        ctx2d.moveTo(cx - 3.5, y);
        ctx2d.lineTo(cx + 3.5, y);
      }
      ctx2d.stroke();
      ctx2d.restore();

      const formatLabel2D = (v) => {
        const abs = Math.abs(v);
        if (abs >= 1e6 || (abs > 0 && abs < 1e-4)) {
          return Number(v).toExponential(2).replace(/\.00e/, "e").replace(/\+/, "");
        }
        return parseFloat(v.toFixed(12)).toString();
      };

      // Neo nhan truc X
      let drawCy = cy;
      if (cy < 0) drawCy = 0;
      if (cy > h - 18) drawCy = h - 18;

      for (let k = startKx; k <= endKx; k++) {
        const unitVal = k * stepUnit;
        if (Math.abs(unitVal) < 1e-30) continue;
        const x = cx + k * tickPx;
        if (Math.abs(x - cx) > 15) {
          drawHaloText(ctx2d, formatLabel2D(unitVal), x, drawCy + 5, {
            font: "500 12.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Be Vietnam Pro', Roboto, sans-serif",
            color: labelColor,
            haloColor: haloColor,
            align: "center",
            baseline: "top",
            haloWidth: 3.8,
          });
        }
      }

      // Neo nhan truc Y
      let drawCx = cx;
      if (cx < 35) drawCx = 35;
      if (cx > w - 10) drawCx = w - 10;

      for (let k = startKy; k <= endKy; k++) {
        const unitVal = k * stepUnit;
        if (Math.abs(unitVal) < 1e-30) continue;
        const y = cy - k * tickPx;
        if (Math.abs(y - drawCy) < 18) continue;

        if (Math.abs(y - cy) > 15) {
          drawHaloText(ctx2d, formatLabel2D(unitVal), drawCx - 7, y, {
            font: "500 12.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Be Vietnam Pro', Roboto, sans-serif",
            color: labelColor,
            haloColor: haloColor,
            align: "right",
            baseline: "middle",
            haloWidth: 3.8,
          });
        }
      }

      // Ve so 0 o goc toa do bang Text Halo
      if (cx >= -10 && cx <= w + 10 && cy >= -10 && cy <= h + 10) {
        drawHaloText(ctx2d, "0", cx - 7, cy + 4, {
          font: "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Be Vietnam Pro', Roboto, sans-serif",
          color: labelColor,
          haloColor: haloColor,
          align: "right",
          baseline: "top",
          haloWidth: 3.5,
        });
      }
    }

    return {
      cx,
      cy,
      px,
      w,
      h,
      stepUnit,
      originPx: { x: cx, y: cy },
      pixelsPerUnit: px,
    };
  };

  // --- [HALO / FOCUS HIGHLIGHT STYLES - CACHED & MODULAR] ---

  // Phong cách 1 (Cached 100%): Cyan Neon Pulse nguyên bản
  function drawHaloClassicNeon(ctx, startX, startY, x2, y2, angle, vecLenPx, DYNAMIC_ARROW_HEAD, noArrow, alpha, pulseFactor) {
    ctx.save();
    const currentWidth = PULSE_MIN_W + (PULSE_MAX_W - PULSE_MIN_W) * pulseFactor;
    const currentAlpha = (0.3 + 0.4 * (1 - pulseFactor)) * alpha;

    ctx.strokeStyle = PULSE_COLOR;
    ctx.globalAlpha = currentAlpha;
    ctx.lineWidth = currentWidth;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const haloHead = DYNAMIC_ARROW_HEAD + currentWidth * 0.3;
    if (!noArrow && vecLenPx > 1) {
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - haloHead * Math.cos(angle - Math.PI / 6), y2 - haloHead * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - haloHead * Math.cos(angle + Math.PI / 6), y2 - haloHead * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    }
    ctx.restore();
  }

  // Phong cách 2: Quầng sáng đồng màu (academic_aura)
  // Màu đồng bộ với chính vector, quầng sáng mềm mại
  function drawHaloAcademicAura(ctx, startX, startY, x2, y2, angle, vecLenPx, DYNAMIC_ARROW_HEAD, noArrow, alpha, pulseFactor, color) {
    ctx.save();
    const pulseWidth = 6 + 4 * pulseFactor;
    const auraAlpha = (0.2 + 0.15 * (1 - pulseFactor)) * alpha;

    // Lớp 1: Quầng sáng mịn bên ngoài (outer soft feathered aura)
    ctx.strokeStyle = color;
    ctx.globalAlpha = auraAlpha;
    ctx.lineWidth = pulseWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const haloHead = DYNAMIC_ARROW_HEAD + pulseWidth * 0.25;
    if (!noArrow && vecLenPx > 1) {
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - haloHead * Math.cos(angle - Math.PI / 6), y2 - haloHead * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - haloHead * Math.cos(angle + Math.PI / 6), y2 - haloHead * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    }

    // Lớp 2: Quầng sáng tụ điểm bên trong ôm sát thân vector (inner crisp aura)
    ctx.globalAlpha = (0.35 + 0.15 * (1 - pulseFactor)) * alpha;
    ctx.lineWidth = VEC_STROKE_W + 3;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  // Phong cách 1: Tâm điểm tọa độ (precision_reticle)
  // Vòng tròn kép đồng tâm hairline tại ngọn, vạch chữ thập 4 phương, đường gióng song song
  function drawHaloPrecisionReticle(ctx, startX, startY, x2, y2, angle, vecLenPx, DYNAMIC_ARROW_HEAD, noArrow, alpha, pulseFactor, color) {
    ctx.save();
    const normX = -Math.sin(angle);
    const normY = Math.cos(angle);

    // 1. Hai đường gióng song song mảnh ôm thân vector (hairline guide lines)
    const guideDist = 4;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.45 * alpha;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);

    ctx.beginPath();
    ctx.moveTo(startX + normX * guideDist, startY + normY * guideDist);
    ctx.lineTo(x2 + normX * guideDist, y2 + normY * guideDist);
    ctx.moveTo(startX - normX * guideDist, startY - normY * guideDist);
    ctx.lineTo(x2 - normX * guideDist, y2 - normY * guideDist);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Vòng tâm ngắm tại điểm ngọn mút vector (Precision Target Reticle at tip)
    if (vecLenPx > 1) {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.85 * alpha;
      ctx.lineWidth = 1.2;

      // Vòng tròn nhỏ (r = 5px)
      ctx.beginPath();
      ctx.arc(x2, y2, 5, 0, Math.PI * 2);
      ctx.stroke();

      // Vòng tròn ngoài (r = 11px)
      ctx.beginPath();
      ctx.arc(x2, y2, 11, 0, Math.PI * 2);
      ctx.stroke();

      // 4 vạch ngắm chữ thập trắc địa
      const cInner = 6;
      const cOuter = 15;
      ctx.beginPath();
      ctx.moveTo(x2 + Math.cos(angle) * cInner, y2 + Math.sin(angle) * cInner);
      ctx.lineTo(x2 + Math.cos(angle) * cOuter, y2 + Math.sin(angle) * cOuter);
      ctx.moveTo(x2 - Math.cos(angle) * cInner, y2 - Math.sin(angle) * cInner);
      ctx.lineTo(x2 - Math.cos(angle) * cOuter, y2 - Math.sin(angle) * cOuter);
      ctx.moveTo(x2 + normX * cInner, y2 + normY * cInner);
      ctx.lineTo(x2 + normX * cOuter, y2 + normY * cOuter);
      ctx.moveTo(x2 - normX * cInner, y2 - normY * cInner);
      ctx.lineTo(x2 - normX * cOuter, y2 - normY * cOuter);
      ctx.stroke();

      // Chấm tâm điểm chính xác tại (x2, y2)
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x2, y2, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Phong cách 3: Đổ bóng mờ (soft_elevation)
  // Tạo chiều sâu mờ tinh tế trên mặt phẳng canvas, viền mịn chống chói
  function drawHaloSoftElevation(ctx, startX, startY, x2, y2, angle, vecLenPx, DYNAMIC_ARROW_HEAD, noArrow, alpha, pulseFactor, color) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12 + 4 * pulseFactor;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.5 * alpha;
    ctx.lineWidth = VEC_STROKE_W + 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    if (!noArrow && vecLenPx > 1) {
      const haloHead = DYNAMIC_ARROW_HEAD + 3;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - haloHead * Math.cos(angle - Math.PI / 6), y2 - haloHead * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - haloHead * Math.cos(angle + Math.PI / 6), y2 - haloHead * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    }
    ctx.restore();
  }

  // Điều phối vẽ hào quang theo cài đặt
  function draw2DVectorHalo(ctx, startX, startY, x2, y2, angle, vecLenPx, DYNAMIC_ARROW_HEAD, noArrow, alpha, pulseFactor, color) {
    const haloStyle = (window.App && window.App.graphSettings && window.App.graphSettings.haloStyle)
      || (window.App && window.App.haloStyle)
      || (typeof localStorage !== "undefined" && localStorage.getItem("vectoria_halo_style"))
      || "precision_reticle";

    if (haloStyle === "classic_neon") {
      drawHaloClassicNeon(ctx, startX, startY, x2, y2, angle, vecLenPx, DYNAMIC_ARROW_HEAD, noArrow, alpha, pulseFactor);
    } else if (haloStyle === "academic_aura") {
      drawHaloAcademicAura(ctx, startX, startY, x2, y2, angle, vecLenPx, DYNAMIC_ARROW_HEAD, noArrow, alpha, pulseFactor, color);
    } else if (haloStyle === "soft_elevation") {
      drawHaloSoftElevation(ctx, startX, startY, x2, y2, angle, vecLenPx, DYNAMIC_ARROW_HEAD, noArrow, alpha, pulseFactor, color);
    } else {
      // Mặc định: precision_reticle
      drawHaloPrecisionReticle(ctx, startX, startY, x2, y2, angle, vecLenPx, DYNAMIC_ARROW_HEAD, noArrow, alpha, pulseFactor, color);
    }
  }

  // --- [VECTOR CHUẨN TOÁN HỌC & TỈ LỆ MŨI TÊN] ---
  function draw2DVectorSingle(
    v,
    color,
    highlighted,
    alpha = 1,
    pulseFactor = 0,
    offset = [0, 0],
    noArrow = false,        
    isRightAngle = false,   
    isDashed = false        
  ) {
    alpha = Math.max(0, Math.min(1, Number(alpha) || 0));
    const { cx, cy, px } = Vec2D.gridInfo2D;
    const startX = cx + offset[0] * px;
    const startY = cy - offset[1] * px; 
    const x2 = startX + v[0] * px;
    const y2 = startY - v[1] * px;

    const angle = Math.atan2(y2 - startY, x2 - startX);
    
    // 1. Tính toán độ dài THỰC TẾ của vector trên màn hình (Pixel)
    const vecLenPx = Math.hypot(x2 - startX, y2 - startY);

    // 2. LUẬT VIỄN CẬN CÁ THỂ: 
    // Mũi tên có size tiêu chuẩn là 15px. NHƯNG không bao giờ được phép bự quá 30% thân vector.
    // -> Vector ngắn hoặc bị zoom xa sẽ tự động teo mũi tên lại và biến mất. Vector dài vẫn giữ mũi tên đẹp.
    const DYNAMIC_ARROW_HEAD = Math.min(15, vecLenPx * 0.3);

    if (highlighted) {
      draw2DVectorHalo(ctx2d, startX, startY, x2, y2, angle, vecLenPx, DYNAMIC_ARROW_HEAD, noArrow, alpha, pulseFactor, color);
    }

    ctx2d.save();
    ctx2d.globalAlpha = alpha;
    ctx2d.strokeStyle = color;
    ctx2d.lineWidth = VEC_STROKE_W; // Giữ nguyên độ dày thân bút

    if (isDashed) {
        ctx2d.setLineDash([6, 6]);
    } else {
        ctx2d.setLineDash([]);
    }

    ctx2d.beginPath();
    ctx2d.moveTo(startX, startY);
    ctx2d.lineTo(x2, y2);
    ctx2d.stroke();
    ctx2d.setLineDash([]);
    
    // Vẽ mũi tên thực
    if (!noArrow && vecLenPx > 1) {
        ctx2d.beginPath();
        ctx2d.moveTo(x2, y2);
        ctx2d.lineTo(x2 - DYNAMIC_ARROW_HEAD * Math.cos(angle - Math.PI / 6), y2 - DYNAMIC_ARROW_HEAD * Math.sin(angle - Math.PI / 6));
        ctx2d.moveTo(x2, y2);
        ctx2d.lineTo(x2 - DYNAMIC_ARROW_HEAD * Math.cos(angle + Math.PI / 6), y2 - DYNAMIC_ARROW_HEAD * Math.sin(angle + Math.PI / 6));
        ctx2d.stroke();
    }

    if (isRightAngle) {
        const symbolSize = 12; 
        ctx2d.beginPath();
        ctx2d.moveTo(x2, y2);
        
        const p1x = x2 - symbolSize * Math.cos(angle);
        const p1y = y2 - symbolSize * Math.sin(angle);
        const p2x = x2 - symbolSize * Math.cos(angle + Math.PI/2);
        const p2y = y2 - symbolSize * Math.sin(angle + Math.PI/2);
        const p3x = p1x - symbolSize * Math.cos(angle + Math.PI/2);
        const p3y = p1y - symbolSize * Math.sin(angle + Math.PI/2);

        ctx2d.moveTo(p1x, p1y);
        ctx2d.lineTo(p3x, p3y);
        ctx2d.lineTo(p2x, p2y);
        
        ctx2d.lineWidth = 1.5;
        ctx2d.strokeStyle = color; 
        ctx2d.stroke();
    }
    ctx2d.restore();
  }

  // Vẽ vệt quỹ đạo đường cong vector tham số thích ứng toàn màn hình Canvas
  // Vẽ vệt quỹ đạo đường cong vector tham số thích ứng toàn màn hình Canvas
  function drawParametricTrajectory2D(ctx, it, gridInfo, baseAlpha) {
    if (!gridInfo || typeof it.fn !== "function") return;
    const { cx, cy, px } = gridInfo;
    const color = it.colorCss || "#0090ff";
    const alpha = (typeof baseAlpha === "number" ? baseAlpha : 1) * 0.8;

    const exprText = (it.rawExprs || []).join(" ") + " " + (it.latex || "");
    const isTrig = /sin|cos/i.test(exprText);

    // Xác định các biến đang chạy hoạt ảnh
    const activeVars = (Array.isArray(it.activeAnimVars) && it.activeAnimVars.length > 0)
      ? it.activeAnimVars
      : [it.paramVar || (it.vars && it.vars[0]) || "t"];

    const margin = 300;
    const minX = -margin;
    const maxX = ctx.canvas.width + margin;
    const minY = -margin;
    const maxY = ctx.canvas.height + margin;

    // Vẽ từng đường tọa độ tham số tương ứng với các biến đang hoạt động
    activeVars.forEach((curVar) => {
      let tMin, tMax, numSamples;
      if (it.paramInfinity) {
        if (isTrig) {
          tMin = -Math.PI * 4;
          tMax = Math.PI * 4;
          numSamples = 240;
        } else {
          const wSpan = Math.max(Math.abs(cx / px), Math.abs((ctx.canvas.width - cx) / px), 10);
          const hSpan = Math.max(Math.abs(cy / px), Math.abs((ctx.canvas.height - cy) / px), 10);
          const span = Math.max(wSpan, hSpan);
          const tBound = Math.min(span * 1.3, 40);
          tMin = -tBound;
          tMax = tBound;
          numSamples = 280;
        }
      } else {
        const rObj = it.varRanges?.[curVar];
        tMin = Number(rObj?.min ?? (curVar === it.paramVar ? it.paramMin : -10.0) ?? -10.0);
        tMax = Number(rObj?.max ?? (curVar === it.paramVar ? it.paramMax : 10.0) ?? 10.0);
        if (tMax <= tMin) tMax = tMin + 1.0;
        numSamples = Math.min(600, Math.max(120, Math.round((tMax - tMin) * 35)));
      }

      const path = new Path2D();
      let started = false;
      const dt = (tMax - tMin) / numSamples;
      const scope = Object.assign({}, it.scopeValues);

      for (let i = 0; i <= numSamples; i++) {
        const tVal = tMin + i * dt;
        scope[curVar] = tVal;
        try {
          const pt = it.fn.call(it, scope);
          if (Array.isArray(pt) && isFinite(pt[0]) && isFinite(pt[1])) {
            const sx = cx + pt[0] * px;
            const sy = cy - pt[1] * px;
            if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) {
              if (!started) {
                path.moveTo(sx, sy);
                started = true;
              } else {
                path.lineTo(sx, sy);
              }
              continue;
            }
          }
        } catch (e) {}
        started = false;
      }

      ctx.save();
      // 1. Vệt sáng neon mờ phía dưới
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha * 0.22;
      ctx.lineWidth = 5.0;
      ctx.setLineDash([]);
      ctx.stroke(path);

      // 2. Đường nét đứt toán học chính xác
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 4]);
      ctx.stroke(path);
      ctx.restore();
    });
  }

  // Vẽ 2 đường gióng tọa độ trực giao từ ngọn vector tới trục Ox và Oy
  function drawParametricProjection2D(ctx, it, gridInfo, baseAlpha) {
    if (!gridInfo || !it || !Array.isArray(it.vec)) return;
    const { cx, cy, px } = gridInfo;
    const [vx, vy] = it.vec;
    if (Math.abs(vx) < 1e-4 && Math.abs(vy) < 1e-4) return;

    const color = it.colorCss || "#0090ff";
    const alpha = (typeof baseAlpha === "number" ? baseAlpha : 1) * 0.85;

    const sx = cx + vx * px;
    const sy = cy - vy * px;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.35;
    ctx.globalAlpha = alpha;
    ctx.setLineDash([4, 3]);

    // 1. Đường gióng từ ngọn vector (sx, sy) hạ vuông góc xuống trục hoành Ox tại (sx, cy)
    if (Math.abs(vy) >= 1e-3) {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, cy);
      ctx.stroke();

      // Điểm mút tại chân đường gióng trên trục Ox
      ctx.beginPath();
      ctx.arc(sx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Đường gióng từ ngọn vector (sx, sy) hạ vuông góc sang trục tung Oy tại (cx, sy)
    if (Math.abs(vx) >= 1e-3) {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(cx, sy);
      ctx.stroke();

      // Điểm mút tại chân đường gióng trên trục Oy
      ctx.beginPath();
      ctx.arc(cx, sy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  // Vẽ vùng diện tích 2D khi vector có từ 2 biến trở lên
  function drawParametricArea2D(ctx, it, gridInfo, baseAlpha) {
    if (!gridInfo || !it.vars || it.vars.length < 2 || !it.showAreaFill) return;
    const { cx, cy, px } = gridInfo;
    const color = it.surfaceColor || it.colorCss || "#0090ff";
    const alpha = typeof baseAlpha === "number" ? baseAlpha : 1;

    const isInteracting = it.isAnimating || (window.App && window.App._isDraggingSlider);
    const N = isInteracting ? 40 : 64;
    const M = isInteracting ? 10 : 16;
    const v0 = it.vars[0];
    const v1 = it.vars[1];

    let uMin, uMax, vMin, vMax;
    if (it.paramInfinity) {
      const wSpan = Math.max(Math.abs(cx / px), Math.abs((ctx.canvas.width - cx) / px), 10);
      const hSpan = Math.max(Math.abs(cy / px), Math.abs((ctx.canvas.height - cy) / px), 10);
      const bound = Math.max(wSpan, hSpan) * 1.35;
      uMin = -bound;
      uMax = bound;
      vMin = -bound;
      vMax = bound;
    } else {
      uMin = Number(it.varRanges?.[v0]?.min ?? it.paramMin ?? -5.0);
      uMax = Number(it.varRanges?.[v0]?.max ?? it.paramMax ?? 5.0);
      vMin = Number(it.varRanges?.[v1]?.min ?? it.surfaceMin ?? -5.0);
      vMax = Number(it.varRanges?.[v1]?.max ?? it.surfaceMax ?? 5.0);
    }

    const du = (uMax - uMin) / N;
    const dv = (vMax - vMin) / M;
    const baseScope = Object.assign({}, it.scopeValues);
    const evalFn = (u, v) => {
      baseScope[v0] = u;
      baseScope[v1] = v;
      return it.fn.call(it, baseScope);
    };

    const pts = [];
    for (let i = 0; i <= N; i++) {
      pts[i] = [];
      const u = uMin + i * du;
      for (let j = 0; j <= M; j++) {
        const v = vMin + j * dv;
        try {
          const pt = evalFn(u, v);
          if (Array.isArray(pt) && isFinite(pt[0]) && isFinite(pt[1])) {
            pts[i][j] = [cx + pt[0] * px, cy - pt[1] * px];
          } else {
            pts[i][j] = null;
          }
        } catch (e) {
          pts[i][j] = null;
        }
      }
    }

    ctx.save();

    // 1. Tô màu nền vùng diện tích theo độ mờ tùy chỉnh (phẳng mịn, không lằn kẻ đan xen)
    const sOpacity = typeof it.surfaceOpacity === "number" ? it.surfaceOpacity : 0.25;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * sOpacity;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < M; j++) {
        const p00 = pts[i][j];
        const p10 = pts[i + 1][j];
        const p11 = pts[i + 1][j + 1];
        const p01 = pts[i][j + 1];
        if (p00 && p10 && p11 && p01) {
          ctx.beginPath();
          ctx.moveTo(p00[0], p00[1]);
          ctx.lineTo(p10[0], p10[1]);
          ctx.lineTo(p11[0], p11[1]);
          ctx.lineTo(p01[0], p01[1]);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  // --- KẾT XUẤT LƯỚI VECTOR TRANH THÍCH ỨNG 2D (ADAPTIVE DELAUNAY MESH) ---
  function drawImageMesh2D(ctx, it, gridInfo) {
    if (!it.worldPoints || !it.triangles || !gridInfo) return;
    const { cx, cy, px } = gridInfo;
    const pts = it.worldPoints;
    const tris = it.triangles;
    const cols = it.triangleColors || [];
    const showWireframe = !!it.showWireframe;
    const alpha = typeof it.alpha === "number" ? Math.max(0, Math.min(1, it.alpha)) : 1.0;
    const isDark = (window.App && App.theme === "dark");

    ctx.save();
    ctx.globalAlpha = alpha;

    const numTriangles = Math.floor(tris.length / 3);
    for (let t = 0; t < numTriangles; t++) {
      const i0 = tris[t * 3];
      const i1 = tris[t * 3 + 1];
      const i2 = tris[t * 3 + 2];

      const p0 = pts[i0];
      const p1 = pts[i1];
      const p2 = pts[i2];
      if (!p0 || !p1 || !p2) continue;

      const x0 = cx + p0[0] * px;
      const y0 = cy - p0[1] * px;
      const x1 = cx + p1[0] * px;
      const y1 = cy - p1[1] * px;
      const x2 = cx + p2[0] * px;
      const y2 = cy - p2[1] * px;

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.closePath();

      ctx.fillStyle = cols[t] || "#888888";
      ctx.fill();

      if (showWireframe) {
        ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.25)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      } else {
        // Nối liền các mép tam giác khử khe hở răng cưa
        ctx.strokeStyle = cols[t] || "#888888";
        ctx.lineWidth = 0.35;
        ctx.stroke();
      }
    }

  }

  // --- KẾT XUẤT THỰC THỂ LINH VẬT NORI CHUẨN SHOWCASE VỚI ĐỘNG CƠ BIỂU CẢM TOÁN HỌC 2D ---
  function drawNoriCommonBase(ctx, living) {
    const earTwitch = living?.earTwitch || 0;
    const twitchRad = (earTwitch * Math.PI) / 180;

    // 1. Bóng tiếp đất (Ground Shadow)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(50, 92, 26, 4.5, 0, 0, Math.PI * 2);
    const gradShadow = ctx.createRadialGradient(50, 92, 0, 50, 92, 26);
    gradShadow.addColorStop(0, "rgba(30, 20, 15, 0.28)");
    gradShadow.addColorStop(1, "rgba(30, 20, 15, 0)");
    ctx.fillStyle = gradShadow;
    ctx.fill();
    ctx.restore();

    // 2. Hai bàn chân (Feet)
    ctx.fillStyle = "#d97706";
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(35, 85, 7.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(65, 85, 7.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3. Hai tai có vi chuyển động vẫy tai tự nhiên (Ears with organic micro-twitch)
    ctx.beginPath();
    ctx.ellipse(25, 22, 10.5, 9.5, -0.15 + twitchRad, 0, Math.PI * 2);
    const earGradL = ctx.createRadialGradient(25, 22, 1, 25, 22, 10.5);
    earGradL.addColorStop(0, "#f59e0b");
    earGradL.addColorStop(1, "#d97706");
    ctx.fillStyle = earGradL;
    ctx.fill();
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(25.5, 22.5, 6.2, 5.4, -0.15 + twitchRad, 0, Math.PI * 2);
    ctx.fillStyle = "#fecdd3";
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(75, 22, 10.5, 9.5, 0.15 - twitchRad, 0, Math.PI * 2);
    const earGradR = ctx.createRadialGradient(75, 22, 1, 75, 22, 10.5);
    earGradR.addColorStop(0, "#f59e0b");
    earGradR.addColorStop(1, "#d97706");
    ctx.fillStyle = earGradR;
    ctx.fill();
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(74.5, 22.5, 6.2, 5.4, 0.15 - twitchRad, 0, Math.PI * 2);
    ctx.fillStyle = "#fecdd3";
    ctx.fill();

    // 4. Thân và đầu hình quả lê tròn múp (Head & Body Silhouette)
    const headPath = new Path2D("M 50 19 C 72 19, 85 30, 85 47 C 85 62, 79 74, 69 79 C 59 84, 41 84, 31 79 C 21 74, 15 62, 15 47 C 15 30, 28 19, 50 19 Z");
    const bodyGrad = ctx.createRadialGradient(45, 35, 4, 50, 52, 45);
    bodyGrad.addColorStop(0, "#f59e0b");
    bodyGrad.addColorStop(1, "#d97706");
    ctx.fillStyle = bodyGrad;
    ctx.fill(headPath);
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.6;
    ctx.stroke(headPath);

    // 5. Bụng trắng sữa mềm mịn (Creamy Tummy)
    const bellyPath = new Path2D("M 50 43 C 63 43, 73 51, 73 63 C 73 74, 63 79, 50 79 C 37 79, 27 74, 27 63 C 27 51, 37 43, 50 43 Z");
    ctx.fillStyle = "#fefae0";
    ctx.globalAlpha = 0.95;
    ctx.fill(bellyPath);
    ctx.globalAlpha = 1.0;

    // 6. Má hồng ấm áp (Blush)
    ctx.fillStyle = "rgba(244, 63, 94, 0.38)";
    ctx.beginPath();
    ctx.ellipse(25, 56, 5.2, 3.0, 0, 0, Math.PI * 2);
    ctx.ellipse(75, 56, 5.2, 3.0, 0, 0, Math.PI * 2);
    ctx.fill();

    // 7. Mũi nhỏ xinh
    ctx.fillStyle = "#292524";
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.ellipse(50, 54, 1.5, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 8. Hai tay nhỏ ôm trước ngực (Paws)
    ctx.fillStyle = "#f59e0b";
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(36, 62, 4.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(64, 62, 4.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Sắc thái 1: Tươi tắn sinh động (Relaxed Living Neutral)
  function drawNoriRelaxedFace(ctx, isDark, living) {
    drawNoriCommonBase(ctx, living);

    const isBlinking = living?.isBlinking || false;
    const gx = living?.gazeX || 0;
    const gy = living?.gazeY || 0;

    // Lông mày nhẹ nhàng thân thiện
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(34, 40.5); ctx.quadraticCurveTo(39, 38.0, 45, 40.5);
    ctx.moveTo(55, 40.5); ctx.quadraticCurveTo(61, 38.0, 66, 40.5);
    ctx.stroke();

    if (isBlinking) {
      // Mí mắt khép lại êm ái khi chớp mắt sinh học
      ctx.strokeStyle = "#292524";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(38, 49.0, 4.6, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(62, 49.0, 4.6, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else {
      // Đôi mắt tròn sáng ngời dõi nhìn tự nhiên
      ctx.fillStyle = "#292524";
      ctx.beginPath();
      ctx.ellipse(38 + gx, 49 + gy, 5.2, 5.8, 0, 0, Math.PI * 2);
      ctx.ellipse(62 + gx, 49 + gy, 5.2, 5.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Catchlights lóng lánh
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(39.6 + gx, 46.8 + gy, 1.8, 0, Math.PI * 2);
      ctx.arc(63.6 + gx, 46.8 + gy, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(36.8 + gx, 51.2 + gy, 0.85, 0, Math.PI * 2);
      ctx.arc(60.8 + gx, 51.2 + gy, 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    // Miệng mỉm cười hiền lành
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(45.5, 59.5); ctx.quadraticCurveTo(50, 61.5, 54.5, 59.5);
    ctx.stroke();
  }

  // Sắc thái 2: Xoay chuyển không gian (Spinning / Pure Rotation)
  function drawNoriSpinningFace(ctx, rotAngle, living) {
    drawNoriCommonBase(ctx, living);

    // Lông mày uốn theo chiều quay
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 2.0;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(33, 37.5); ctx.quadraticCurveTo(39, 34, 45, 37.5);
    ctx.moveTo(55, 37.5); ctx.quadraticCurveTo(61, 34, 67, 37.5);
    ctx.stroke();

    // Đôi mắt cười dõi theo quỹ đạo quay
    ctx.strokeStyle = "#292524";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(38, 49.5, 5.0, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(62, 49.5, 5.0, Math.PI, 0);
    ctx.stroke();

    // Miệng cười nhẹ nhàng
    ctx.fillStyle = "#451a03";
    ctx.beginPath();
    ctx.moveTo(44.5, 58.5); ctx.quadraticCurveTo(50, 64.5, 55.5, 58.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fb7185";
    ctx.beginPath();
    ctx.ellipse(50, 62, 2.4, 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sắc thái 3: Phóng to / Thu nhỏ (Scaling Expansion / Contraction)
  function drawNoriScalingFace(ctx, det, living) {
    drawNoriCommonBase(ctx, living);

    if (det > 1.25) {
      // Phóng to phổng phao: ngạc nhiên hớn hở (O w O)
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 2.0;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(33, 36.5); ctx.quadraticCurveTo(39, 33, 45, 36.5);
      ctx.moveTo(55, 36.5); ctx.quadraticCurveTo(61, 33, 67, 36.5);
      ctx.stroke();

      // Mắt tròn to xoe
      ctx.fillStyle = "#292524";
      ctx.beginPath();
      ctx.arc(38, 48, 6.2, 0, Math.PI * 2);
      ctx.arc(62, 48, 6.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(40, 45.8, 2.4, 0, Math.PI * 2);
      ctx.arc(64, 45.8, 2.4, 0, Math.PI * 2);
      ctx.fill();

      // Miệng chữ O ngạc nhiên đáng yêu
      ctx.fillStyle = "#451a03";
      ctx.beginPath();
      ctx.ellipse(50, 60.5, 2.8, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fb7185";
      ctx.beginPath();
      ctx.ellipse(50, 62, 1.8, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Thu nhỏ: ngơ ngác đáng yêu
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 1.8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(34, 41); ctx.quadraticCurveTo(39, 39, 45, 41);
      ctx.moveTo(55, 41); ctx.quadraticCurveTo(61, 39, 66, 41);
      ctx.stroke();

      ctx.fillStyle = "#292524";
      ctx.beginPath();
      ctx.ellipse(38, 49, 4.6, 5.0, 0, 0, Math.PI * 2);
      ctx.ellipse(62, 49, 4.6, 5.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(39.5, 47, 1.5, 0, Math.PI * 2);
      ctx.arc(63.5, 47, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(46.5, 60); ctx.quadraticCurveTo(50, 61.5, 53.5, 60);
      ctx.stroke();
    }
  }

  // Sắc thái 4: Tò mò ngơ ngác khi biến dạng nhẹ (Curious Mild Strain)
  function drawNoriCuriousFace(ctx, leanAngle, living) {
    drawNoriCommonBase(ctx, living);

    const gx = living?.gazeX || 0;
    const gy = living?.gazeY || 0;
    const isBlinking = living?.isBlinking || false;

    // Một bên mày nhướng cao tò mò
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(34, 37.5); ctx.quadraticCurveTo(39, 35.0, 45, 38.0);
    ctx.moveTo(55, 41.0); ctx.quadraticCurveTo(60, 42.0, 66, 40.0);
    ctx.stroke();

    if (isBlinking) {
      ctx.strokeStyle = "#292524";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(38, 49.0, 4.6, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(62, 49.0, 4.6, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else {
      // Mắt liếc nhẹ tò mò theo góc lực căng
      const angle = typeof leanAngle === "number" ? leanAngle : 0;
      const ox = Math.max(-1.8, Math.min(1.8, Math.cos(angle) * 1.5 + gx * 0.4));
      const oy = Math.max(-1.5, Math.min(1.5, -Math.sin(angle) * 1.2 + gy * 0.4));

      ctx.fillStyle = "#292524";
      ctx.beginPath();
      ctx.ellipse(38 + ox, 49 + oy, 5.0, 5.5, 0, 0, Math.PI * 2);
      ctx.ellipse(62 + ox, 49 + oy, 5.0, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(39.6 + ox, 46.8 + oy, 1.8, 0, Math.PI * 2);
      ctx.arc(63.6 + ox, 46.8 + oy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Khóe miệng chúm chím tò mò
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(46, 60); ctx.quadraticCurveTo(50, 58.8, 54, 60);
    ctx.stroke();
  }

  // Sắc thái 5: Gồng mình chịu lực căng cực độ (Extreme Strain - Đau đớn ngấn lệ)
  function drawNoriStrainedFace(ctx, strain, det, isDark, living) {
    drawNoriCommonBase(ctx, living);

    // Lông mày nhíu chặt hướng tâm
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(33, 44); ctx.quadraticCurveTo(39, 45.5, 45, 41.5);
    ctx.moveTo(55, 41.5); ctx.quadraticCurveTo(61, 45.5, 67, 44);
    ctx.stroke();

    // Nếp nhăn trán
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(48.5, 42.0); ctx.lineTo(48.5, 45.0);
    ctx.moveTo(51.5, 42.0); ctx.lineTo(51.5, 45.0);
    ctx.stroke();

    // Đôi mắt nhắm gãy gọn chịu lực (> <)
    ctx.strokeStyle = "#292524";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(33, 46); ctx.lineTo(43, 49.5); ctx.lineTo(33, 53);
    ctx.moveTo(67, 46); ctx.lineTo(57, 49.5); ctx.lineTo(67, 53);
    ctx.stroke();

    // Hai giọt lệ lăn xuống má
    ctx.fillStyle = "rgba(56, 189, 248, 0.88)";
    ctx.beginPath();
    ctx.arc(38, 55.5, 2.0, 0, Math.PI * 2);
    ctx.arc(62, 55.5, 2.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(37.5, 54.8, 0.8, 0, Math.PI * 2);
    ctx.arc(61.5, 54.8, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Miệng chịu lực cắn chặt
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(44.0, 61.0); ctx.lineTo(56.0, 61.0);
    ctx.stroke();
  }

  // Sắc thái mới 1: Nghiêng trượt song song theo góc biến dạng affine (Shear Lean - Mất đà chới với)
  function drawNoriShearLeanFace(ctx, leanAngle, shearFactor, living) {
    drawNoriCommonBase(ctx, living);

    const angle = typeof leanAngle === "number" ? leanAngle : 0;
    const factor = Math.min(1.5, typeof shearFactor === "number" ? shearFactor : 0.5);
    const shiftX = Math.max(-2.5, Math.min(2.5, Math.cos(angle) * factor * 2.2));
    const shiftY = Math.max(-1.5, Math.min(1.5, -Math.sin(angle) * factor * 1.5));

    // Lông mày lệch pha: Một bên giật ngược hoang mang, một bên sụp xuống gắng gượng
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 2.0;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(33, 36.5 + shiftY);
    ctx.quadraticCurveTo(39, 33.5 + shiftY * 1.5, 45, 37.0 + shiftY);
    ctx.moveTo(55, 41.5 + shiftY * 0.5);
    ctx.quadraticCurveTo(61, 44.0 + shiftY, 67, 41.5 + shiftY * 0.5);
    ctx.stroke();

    // Một mắt mở tròn to hoang mang mất đà, một mắt nheo nhỏ lo lắng
    ctx.fillStyle = "#292524";
    ctx.beginPath();
    ctx.ellipse(38 + shiftX, 48 + shiftY, 5.5, 6.0, 0, 0, Math.PI * 2);
    ctx.ellipse(62 + shiftX, 50 + shiftY, 4.2, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Điểm sáng mắt
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(39.5 + shiftX, 45.8 + shiftY, 2.0, 0, Math.PI * 2);
    ctx.arc(63.2 + shiftX, 48.5 + shiftY, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Giọt nước mắt nhỏ chới với ở khóe mắt
    ctx.fillStyle = "rgba(56, 189, 248, 0.85)";
    ctx.beginPath();
    ctx.arc(66.0 + shiftX, 53.0 + shiftY, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Miệng méo xệch chới với theo hướng trượt
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 2.0;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(44.0, 61.5 - shiftY * 0.5);
    ctx.quadraticCurveTo(49.0, 63.5, 55.5, 59.0 + shiftY * 0.5);
    ctx.stroke();
  }

  // Sắc thái mới 2: Kéo dãn bất đẳng hướng theo phương đứng Oy (Anisotropic Stretch - Khó chịu rơm rớm nước mắt)
  function drawNoriAnisotropicStretchFace(ctx, aspect, living) {
    drawNoriCommonBase(ctx, living);

    // Lông mày rướn ngược hình chữ V ngược, nhíu chặt chịu đau tức
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(33, 41.5); ctx.quadraticCurveTo(39, 44.5, 45, 37.5);
    ctx.moveTo(55, 37.5); ctx.quadraticCurveTo(61, 44.5, 67, 41.5);
    ctx.stroke();

    // Nếp nhăn căng thẳng giữa hai đầu chân mày
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(48.5, 41.0); ctx.lineTo(48.5, 43.5);
    ctx.moveTo(51.5, 41.0); ctx.lineTo(51.5, 43.5);
    ctx.stroke();

    // Đôi mắt nheo chặt chịu sức căng dọc, tròng mắt hẹp lại
    ctx.fillStyle = "#292524";
    ctx.beginPath();
    ctx.ellipse(38, 48.5, 4.0, 5.0, 0, 0, Math.PI * 2);
    ctx.ellipse(62, 48.5, 4.0, 5.0, 0, 0, Math.PI * 2);
    ctx.fill();

    // Điểm sáng mắt co cụm vì chói và đau
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(38.8, 47.0, 1.2, 0, Math.PI * 2);
    ctx.arc(62.8, 47.0, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Giọt nước mắt long lanh ở hai khóe mi dưới vì khó chịu rơm rớm khóc
    ctx.fillStyle = "rgba(56, 189, 248, 0.88)";
    ctx.beginPath();
    ctx.arc(41.2, 53.0, 2.2, 0, Math.PI * 2);
    ctx.arc(58.8, 53.0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(40.6, 52.3, 0.85, 0, Math.PI * 2);
    ctx.arc(58.2, 52.3, 0.85, 0, Math.PI * 2);
    ctx.fill();

    // Vệt nước mắt nhỏ rịn xuống má
    ctx.strokeStyle = "rgba(56, 189, 248, 0.65)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(41.2, 55.0); ctx.lineTo(41.2, 58.5);
    ctx.moveTo(58.8, 55.0); ctx.lineTo(58.8, 58.5);
    ctx.stroke();

    // Má đỏ ửng vì máu dồn khi bị kéo căng
    ctx.fillStyle = "rgba(239, 68, 68, 0.38)";
    ctx.beginPath();
    ctx.ellipse(25, 56, 6.0, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(75, 56, 6.0, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Miệng mím chặt run run lượn sóng chịu đựng
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 2.0;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(44.5, 61.5);
    ctx.quadraticCurveTo(47.2, 59.8, 50, 62.0);
    ctx.quadraticCurveTo(52.8, 64.0, 55.5, 61.5);
    ctx.stroke();
  }

  // Sắc thái mới 3: Nén dẹp bè ngang theo phương hoành Ox (Anisotropic Squash - Bị ép bẹp dí mếu má)
  function drawNoriAnisotropicSquashFace(ctx, aspect, living) {
    drawNoriCommonBase(ctx, living);

    // Lông mày bị đè nén sụp sâu xuống sát mắt, góc mày cau chặt
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(31, 45.0); ctx.quadraticCurveTo(39, 43.0, 46, 46.5);
    ctx.moveTo(54, 46.5); ctx.quadraticCurveTo(61, 43.0, 69, 45.0);
    ctx.stroke();

    // Nếp nhăn ép giữa trán
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(48.5, 45.5); ctx.lineTo(48.5, 48.0);
    ctx.moveTo(51.5, 45.5); ctx.lineTo(51.5, 48.0);
    ctx.stroke();

    // Đôi mắt nhắm nghiến ép chặt chịu trận (> <)
    ctx.strokeStyle = "#292524";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(33, 48.0); ctx.lineTo(42, 50.8); ctx.lineTo(33, 53.5);
    ctx.moveTo(67, 48.0); ctx.lineTo(58, 50.8); ctx.lineTo(67, 53.5);
    ctx.stroke();

    // Giọt nước mắt phòi ứa ra ở hai khóe mi ngoài do bị nén ép dẹp
    ctx.fillStyle = "rgba(56, 189, 248, 0.88)";
    ctx.beginPath();
    ctx.arc(30.0, 50.8, 2.2, 0, Math.PI * 2);
    ctx.arc(70.0, 50.8, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(29.4, 50.1, 0.85, 0, Math.PI * 2);
    ctx.arc(69.4, 50.1, 0.85, 0, Math.PI * 2);
    ctx.fill();

    // Hai má phồng to bự bè ra hai bên, đỏ ửng vì lực ép
    ctx.fillStyle = "rgba(239, 68, 68, 0.45)";
    ctx.beginPath();
    ctx.ellipse(22, 57, 7.8, 3.4, 0, 0, Math.PI * 2);
    ctx.ellipse(78, 57, 7.8, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Miệng mếu xệch bè ngang bị ép bẹp
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(42.0, 62.5);
    ctx.quadraticCurveTo(50, 59.8, 58.0, 62.5);
    ctx.stroke();
  }

  // Sắc thái mới 4: Tĩnh tại trên trục riêng bất biến (Eigenvector Alignment)
  function drawNoriEigenAlignFace(ctx, living) {
    drawNoriCommonBase(ctx, living);

    // Lông mày cân xứng hoàn hảo, độ cong thanh tịnh
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(34, 39.5); ctx.quadraticCurveTo(39, 37.0, 45, 39.5);
    ctx.moveTo(55, 39.5); ctx.quadraticCurveTo(61, 37.0, 66, 39.5);
    ctx.stroke();

    // Đôi mắt khép nửa tĩnh tại, tập trung suy tưởng thông tuệ
    ctx.strokeStyle = "#292524";
    ctx.lineWidth = 2.1;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(38, 48.0, 4.8, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(62, 48.0, 4.8, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Khóe miệng mỉm cười thanh thản khi phương không gian được bảo toàn
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(46.0, 59.8); ctx.quadraticCurveTo(50, 61.2, 54.0, 59.8);
    ctx.stroke();
  }

  // Sắc thái 6: Thở phào nhẹ nhõm sau biến đổi (Relieved 1.5s)
  function drawNoriRelievedFace(ctx, living) {
    drawNoriCommonBase(ctx, living);

    // Lông mày mềm mại an tâm
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(34, 41); ctx.quadraticCurveTo(39, 39.5, 45, 41);
    ctx.moveTo(55, 41); ctx.quadraticCurveTo(61, 39.5, 66, 41);
    ctx.stroke();

    // Đôi mắt nhắm thư thái êm đềm (u u)
    ctx.strokeStyle = "#292524";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(38, 47.5, 4.8, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(62, 47.5, 4.8, 0, Math.PI);
    ctx.stroke();

    // Miệng cười nhẹ nhõm an lòng
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(46, 60.5); ctx.quadraticCurveTo(50, 62.2, 54, 60.5);
    ctx.stroke();

    // Vệt làn hơi thở phào nhẹ nhõm nhỏ xinh
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(68, 58); ctx.quadraticCurveTo(72, 56, 75, 59);
    ctx.stroke();
  }

  // Sắc thái 7: Mặt sau lưng chuột hamster khi lật không gian (Reflection det < 0)
  function drawNoriBacksideView(ctx, strain, isDark) {
    // 1. Bóng tiếp đất
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(50, 92, 26, 4.5, 0, 0, Math.PI * 2);
    const gradShadow = ctx.createRadialGradient(50, 92, 0, 50, 92, 26);
    gradShadow.addColorStop(0, "rgba(30, 20, 15, 0.28)");
    gradShadow.addColorStop(1, "rgba(30, 20, 15, 0)");
    ctx.fillStyle = gradShadow;
    ctx.fill();
    ctx.restore();

    // 2. Hai bàn chân sau (Feet from behind)
    ctx.fillStyle = "#d97706";
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(35, 85, 7.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(65, 85, 7.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3. Hai tai nhìn từ phía sau (Chỉ thấy lưng tai màu lông vàng, không có vành hồng)
    const earGradBack = ctx.createRadialGradient(50, 22, 2, 50, 22, 35);
    earGradBack.addColorStop(0, "#f59e0b");
    earGradBack.addColorStop(1, "#d97706");
    ctx.fillStyle = earGradBack;
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.6;

    ctx.beginPath();
    ctx.ellipse(25, 22, 10.5, 9.5, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(75, 22, 10.5, 9.5, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Nếp lông tai sau
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(23, 20); ctx.quadraticCurveTo(25, 15, 27, 22);
    ctx.moveTo(73, 20); ctx.quadraticCurveTo(75, 15, 77, 22);
    ctx.stroke();

    // 4. Lưng tròn xoe của chuột hamster (Body Silhouette from back)
    const headPath = new Path2D("M 50 19 C 72 19, 85 30, 85 47 C 85 62, 79 74, 69 79 C 59 84, 41 84, 31 79 C 21 74, 15 62, 15 47 C 15 30, 28 19, 50 19 Z");
    ctx.fillStyle = earGradBack;
    ctx.fill(headPath);
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.6;
    ctx.stroke(headPath);

    // 5. Đường sống lưng sọc lông hamster
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 2.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(50, 25); ctx.lineTo(50, 60);
    ctx.stroke();
    ctx.setLineDash([]);

    // 6. ĐUÔI CỤT TRÒN XOE ĐẶC TRƯNG HAMSTER (Pom-pom tail nằm chính giữa lưng dưới)
    ctx.beginPath();
    ctx.arc(50, 74, 8.5, 0, Math.PI * 2);
    const tailGrad = ctx.createRadialGradient(48, 72, 1, 50, 74, 8.5);
    tailGrad.addColorStop(0, "#ffffff");
    tailGrad.addColorStop(1, "#fef3c7");
    ctx.fillStyle = tailGrad;
    ctx.fill();
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Vệt sáng bồng bềnh đuôi bông
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.beginPath();
    ctx.arc(48.5, 72.5, 4.0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sắc thái 8: Bẹp dẹp thành bánh kếp 1D khi sụp đổ số chiều (Singular det -> 0)
  function drawNoriFlatPancake1D(ctx, a, c, b, d, px, isDark, living) {
    let vx = a * px;
    let vy = -c * px;
    let len = Math.hypot(vx, vy);
    if (len < 1e-3) {
      vx = b * px;
      vy = -d * px;
      len = Math.hypot(vx, vy);
    }

    ctx.save();

    // Trường hợp ma trận suy biến thành điểm (Zero Matrix det=0, rank=0)
    if (len < 1e-3) {
      // Nori bị nén sụp đổ thành một điểm (0, 0)
      ctx.beginPath();
      ctx.arc(0, 0, 7.0, 0, Math.PI * 2);
      ctx.fillStyle = "#f59e0b";
      ctx.fill();
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Đôi mắt xoắn ốc hoa mắt chóng mặt
      ctx.strokeStyle = "#292524";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(-2.5, -0.5, 1.8, 0, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(2.5, -0.5, 1.8, 0, Math.PI * 1.5);
      ctx.stroke();

      ctx.restore();
      return;
    }

    // Góc nghiêng của không gian ảnh 1D Im(T)
    const angle = Math.atan2(vy, vx);
    ctx.rotate(angle);

    // Kích thước dẹp bánh kếp
    const tSec = (living && typeof living.tSec === "number") ? living.tSec : (Date.now() / 1000);
    const breathe = Math.sin(tSec * 2.5);
    const isBlink = living ? living.isBlinking : false;

    // Chiều dài dọc theo đường thẳng và độ dày mỏng dẹp hữu cơ
    const baseLen = Math.max(38, Math.min(65, 1.25 * px));
    const L = baseLen - 1.2 * breathe;
    const h = 7.5 + 0.6 * breathe;

    // 1. Đường tiệm cận trục không gian ảnh Im(T) (Đại số tuyến tính)
    ctx.strokeStyle = isDark ? "rgba(148, 163, 184, 0.30)" : "rgba(120, 53, 15, 0.22)";
    ctx.lineWidth = 1.0;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(-L - 45, 0);
    ctx.lineTo(L + 45, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Bóng tiếp xúc nền (Drop shadow dẹp dài)
    ctx.fillStyle = isDark ? "rgba(0, 0, 0, 0.35)" : "rgba(69, 26, 3, 0.16)";
    ctx.beginPath();
    ctx.ellipse(0, h + 1.8, L * 0.94, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Hai bàn chân nhỏ dẹp dí peeking ở cạnh dưới (Bottom paws)
    ctx.fillStyle = "#f59e0b";
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.3;

    ctx.beginPath();
    ctx.ellipse(-L * 0.40, h - 0.5, 4.8, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(L * 0.40, h - 0.5, 4.8, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4. Hai mẩu tai thò ra ở cạnh trên kèm vành tai hồng (Top ears)
    ctx.fillStyle = "#d97706";
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.4;

    ctx.beginPath();
    ctx.ellipse(L * 0.18, -h + 0.8, 5.2, 3.2, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(L * 0.46, -h + 0.8, 5.2, 3.2, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Vành tai trong màu hồng nhạt
    ctx.fillStyle = "#fecdd3";
    ctx.beginPath();
    ctx.ellipse(L * 0.18, -h + 0.8, 3.0, 1.8, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(L * 0.46, -h + 0.8, 3.0, 1.8, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // 5. Thân bánh kếp vàng óng dẹp dí (Squished golden body pill)
    const bodyGrad = ctx.createLinearGradient(0, -h, 0, h);
    bodyGrad.addColorStop(0, "#fbbf24");
    bodyGrad.addColorStop(0.45, "#f59e0b");
    bodyGrad.addColorStop(1, "#d97706");
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.6;

    ctx.beginPath();
    ctx.moveTo(-L + h, -h);
    ctx.lineTo(L - h, -h);
    ctx.arc(L - h, 0, h, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(-L + h, h);
    ctx.arc(-L + h, 0, h, Math.PI / 2, 3 * Math.PI / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 6. Đuôi cụt tròn xoe hamster bẹp dí ở mông trái
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-L - 2.2, 0, 4.0, 3.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 7. Vạt bụng trắng sữa mềm mại (Creamy tummy strip)
    ctx.fillStyle = "#fefae0";
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.ellipse(-L * 0.20, 0.8, L * 0.32, h * 0.68, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 8. Hai má hồng bẹp dí phúng phính (Blush)
    ctx.fillStyle = "rgba(244, 63, 94, 0.45)";
    ctx.beginPath();
    ctx.ellipse(L * 0.32, 0.5, 4.2, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(L * 0.80, 0.5, 4.2, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 9. Đôi mắt chịu trận bẹp dí (> <)
    ctx.strokeStyle = "#292524";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (isBlink) {
      // Khi chớp mắt lúc bẹp dí: hai mí khép lại thành vạch ngang mảnh
      ctx.beginPath();
      ctx.moveTo(L * 0.42, 0); ctx.lineTo(L * 0.52, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(L * 0.62, 0); ctx.lineTo(L * 0.72, 0);
      ctx.stroke();
    } else {
      // Bình thường: nhắm nghiến chịu nén (> <)
      ctx.beginPath();
      ctx.moveTo(L * 0.42, -2.6);
      ctx.lineTo(L * 0.49, 0);
      ctx.lineTo(L * 0.42, 2.6);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(L * 0.72, -2.6);
      ctx.lineTo(L * 0.65, 0);
      ctx.lineTo(L * 0.72, 2.6);
      ctx.stroke();
    }

    // 10. Mũi nhỏ xinh dẹp dí
    ctx.fillStyle = "#78350f";
    ctx.beginPath();
    ctx.ellipse(L * 0.57, -1.2, 1.4, 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 11. Miệng bĩu dẹp sóng nhỏ chịu đựng
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(L * 0.52, 1.8);
    ctx.quadraticCurveTo(L * 0.57, 3.2, L * 0.62, 1.8);
    ctx.stroke();

    // 12. Giọt nước mắt / mồ hôi chới với vì bị ép dẹp vào 1D
    ctx.fillStyle = "rgba(56, 189, 248, 0.92)";
    ctx.beginPath();
    ctx.moveTo(L * 0.65, -h - 6.5);
    ctx.quadraticCurveTo(L * 0.65 + 2.4, -h - 3.5, L * 0.65, -h - 2.0);
    ctx.quadraticCurveTo(L * 0.65 - 2.4, -h - 3.5, L * 0.65, -h - 6.5);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(L * 0.65 + 0.6, -h - 3.2, 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // BỘ PHÂN TÍCH HÌNH HỌC MA TRẬN & PHÂN LOẠI BIỂU CẢM TOÁN HỌC NORI (DÙNG CHUNG 2D & 3D)
  Vec2D.getNoriExpressionState = function (M, isRelieved) {
    if (!M || !Array.isArray(M) || M.length === 0) {
      return { state: isRelieved ? "RELIEVED" : "RELAXED", det: 1, strain: 0, rotAngle: 0 };
    }
    const is3D = M.length >= 3 && M[0].length >= 3;
    if (is3D) {
      const a = Number(M[0][0]) || 0, b = Number(M[0][1]) || 0, c = Number(M[0][2]) || 0;
      const d = Number(M[1][0]) || 0, e = Number(M[1][1]) || 0, f = Number(M[1][2]) || 0;
      const g = Number(M[2][0]) || 0, h = Number(M[2][1]) || 0, i = Number(M[2][2]) || 0;

      const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
      const L0 = Math.hypot(a, d, g);
      const L1 = Math.hypot(b, e, h);
      const L2 = Math.hypot(c, f, i);
      const dot01 = Math.abs(a * b + d * e + g * h) / (L0 * L1 + 1e-6);
      const dot02 = Math.abs(a * c + d * f + g * i) / (L0 * L2 + 1e-6);
      const dot12 = Math.abs(b * c + e * f + h * i) / (L1 * L2 + 1e-6);
      const maxShear = Math.max(dot01, dot02, dot12);
      const maxL = Math.max(L0, L1, L2);
      const minL = Math.min(L0, L1, L2);
      const aspect = maxL / (minL + 1e-6);
      const distortion = maxShear * 1.5 + (aspect - 1);

      if (Math.abs(det) < 0.06) {
        return { state: "PANCAKE", det, distortion, rotAngle: 0, a, b, c, d, e, f, g, h, i };
      }
      if (det < 0) {
        return { state: "BACKSIDE", det, distortion, rotAngle: 0, a, b, c, d, e, f, g, h, i };
      }
      if (isRelieved) {
        return { state: "RELIEVED", det, distortion, rotAngle: 0, a, b, c, d, e, f, g, h, i };
      }

      // 1. Phép quay thuần túy 3D (Pure Rotation)
      const isOrtho = maxShear < 0.15 && Math.abs(L0 - 1) < 0.18 && Math.abs(L1 - 1) < 0.18 && Math.abs(L2 - 1) < 0.18;
      const isRot = isOrtho && Math.abs(det - 1) < 0.25;
      const tr = a + e + i;
      const rotAngle = Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2)));
      if (isRot && Math.abs(rotAngle) > 0.08) {
        return { state: "SPINNING", det, distortion, rotAngle, a, b, c, d, e, f, g, h, i };
      }

      // 2. Nghiêng trượt song song 3D (Shear Lean)
      if (maxShear >= 0.18 && Math.abs(det - 1.0) < 0.35) {
        const leanAngle = Math.atan2(d + b, a + e);
        return { state: "SHEAR_LEAN", det, distortion, rotAngle: 0, leanAngle, shearFactor: maxShear, a, b, c, d, e, f, g, h, i };
      }

      // 3. Kéo dãn bất đẳng hướng đứng 3D (Anisotropic Stretch theo Oy/Oz)
      if (aspect >= 1.65 && (L1 > 1.25 * L0 || L2 > 1.25 * L0) && maxShear < 0.45) {
        return { state: "ANISOTROPIC_STRETCH", det, distortion, rotAngle: 0, aspect, a, b, c, d, e, f, g, h, i };
      }

      // 4. Nén dẹp bè ngang 3D (Anisotropic Squash)
      if (aspect >= 1.65 && L0 > 1.25 * Math.max(L1, L2) && maxShear < 0.45) {
        return { state: "ANISOTROPIC_SQUASH", det, distortion, rotAngle: 0, aspect, a, b, c, d, e, f, g, h, i };
      }

      // 5. Trục riêng đối xứng / đường chéo 3D (Eigen Align)
      const isDiag3 = Math.abs(b) < 0.04 && Math.abs(c) < 0.04 && Math.abs(d) < 0.04 && Math.abs(f) < 0.04 && Math.abs(g) < 0.04 && Math.abs(h) < 0.04;
      const isSym3 = Math.abs(b - d) < 0.05 && Math.abs(c - g) < 0.05 && Math.abs(f - h) < 0.05 && (Math.abs(b) > 0.05 || Math.abs(c) > 0.05 || Math.abs(f) > 0.05);
      if ((isDiag3 || isSym3) && aspect < 1.65 && distortion < 1.2 && (Math.abs(a - 1) > 0.15 || Math.abs(e - 1) > 0.15 || Math.abs(i - 1) > 0.15 || isSym3)) {
        return { state: "EIGEN_ALIGN", det, distortion, rotAngle: 0, a, b, c, d, e, f, g, h, i };
      }

      // 6. Phóng to / thu nhỏ đồng dạng 3D (Uniform Scale)
      const isScale = maxShear < 0.20 && aspect < 1.30;
      if (isScale && (det > 1.25 || det < 0.85)) {
        return { state: "SCALING", det, distortion, rotAngle: 0, a, b, c, d, e, f, g, h, i };
      }

      // 7. Biến dạng gắt 3D (Extreme Strain)
      if (distortion >= 2.8 || maxShear >= 0.94 || aspect >= 3.6 || Math.abs(det) >= 6.0 || Math.abs(det) <= 0.10) {
        return { state: "STRAINED", det, distortion, rotAngle: 0, a, b, c, d, e, f, g, h, i };
      }

      // 8. Biến dạng nhẹ / vừa phải 3D (Curious)
      if (distortion >= 0.15 || maxShear >= 0.10 || aspect >= 1.15) {
        const leanAngle = Math.atan2(d + b, a + e);
        return { state: "CURIOUS", det, distortion, rotAngle: 0, leanAngle, a, b, c, d, e, f, g, h, i };
      }

      // 9. Bình thản nguyên bản (Relaxed)
      return { state: "RELAXED", det, distortion, rotAngle: 0, a, b, c, d, e, f, g, h, i };
    }

    const a = Number(M?.[0]?.[0]) || 0;
    const b = Number(M?.[0]?.[1]) || 0;
    const c = Number(M?.[1]?.[0]) || 0;
    const d = Number(M?.[1]?.[1]) || 0;

    const det = a * d - b * c;
    const Lx = Math.sqrt(a * a + c * c);
    const Ly = Math.sqrt(b * b + d * d);
    const dot = a * b + c * d;
    const shearFactor = Math.abs(dot) / (Lx * Ly + 1e-6);
    const aspect = Math.max(Lx, Ly) / (Math.min(Lx, Ly) + 1e-6);
    const distortion = shearFactor * 1.5 + (aspect - 1);

    if (Math.abs(det) < 0.06) {
      return { state: "PANCAKE", det, distortion, rotAngle: 0, a, b, c, d };
    }
    if (det < 0) {
      return { state: "BACKSIDE", det, distortion, rotAngle: 0, a, b, c, d };
    }
    if (isRelieved) {
      return { state: "RELIEVED", det, distortion, rotAngle: 0, a, b, c, d };
    }

    // 1. Phép quay thuần túy (Rotation)
    const isOrtho = shearFactor < 0.15 && Math.abs(Lx - 1) < 0.18 && Math.abs(Ly - 1) < 0.18;
    const isRot = isOrtho && Math.abs(a - d) < 0.25 && Math.abs(b + c) < 0.25 && Math.abs(det - 1) < 0.25;
    const rotAngle = Math.atan2(c, a);
    if (isRot && Math.abs(rotAngle) > 0.08) {
      return { state: "SPINNING", det, distortion, rotAngle, a, b, c, d };
    }

    // 2. Nghiêng trượt song song (Shear Lean: ví dụ [[1, 1.5], [0, 1]])
    if (shearFactor >= 0.18 && Math.abs(det - 1.0) < 0.35) {
      const leanAngle = Math.atan2(c + b, a + d);
      return { state: "SHEAR_LEAN", det, distortion, rotAngle: 0, leanAngle, shearFactor, a, b, c, d };
    }

    // 3. Kéo dãn bất đẳng hướng theo trục Oy (Anisotropic Stretch: ví dụ [[0.5, 0], [0, 2.2]])
    if (aspect >= 1.65 && Ly > 1.25 * Lx && shearFactor < 0.45) {
      return { state: "ANISOTROPIC_STRETCH", det, distortion, rotAngle: 0, aspect, a, b, c, d };
    }

    // 4. Nén dẹp bè ngang theo trục Ox (Anisotropic Squash: ví dụ [[2.2, 0], [0, 0.5]])
    if (aspect >= 1.65 && Lx > 1.25 * Ly && shearFactor < 0.45) {
      return { state: "ANISOTROPIC_SQUASH", det, distortion, rotAngle: 0, aspect, a, b, c, d };
    }

    // 5. Trục riêng bất biến / đối xứng (Eigen Align: ví dụ [[1.3, 0], [0, 0.8]] hoặc [[1.2, 0.4], [0.4, 1.2]])
    const isDiag = Math.abs(b) < 0.04 && Math.abs(c) < 0.04 && (Math.abs(a - 1) > 0.15 || Math.abs(d - 1) > 0.15);
    const isSym = Math.abs(b - c) < 0.04 && Math.abs(b) > 0.05 && shearFactor < 0.35;
    if ((isDiag || isSym) && aspect < 1.65 && distortion < 1.2) {
      return { state: "EIGEN_ALIGN", det, distortion, rotAngle: 0, a, b, c, d };
    }

    // 6. Phóng to / thu nhỏ đồng dạng (Uniform Scale)
    const isScale = shearFactor < 0.20 && aspect < 1.30;
    if (isScale && (det > 1.25 || det < 0.85)) {
      return { state: "SCALING", det, distortion, rotAngle: 0, a, b, c, d };
    }

    // 7. Biến dạng gắt (Extreme Strain)
    if (distortion >= 2.8 || shearFactor >= 0.94 || aspect >= 3.6 || det >= 6.0 || det <= 0.10) {
      return { state: "STRAINED", det, distortion, rotAngle: 0, a, b, c, d };
    }

    // 8. Biến dạng nhẹ / kéo vừa phải (Curious)
    if (distortion >= 0.15 || shearFactor >= 0.10 || aspect >= 1.15) {
      const leanAngle = Math.atan2(c + b, a + d);
      return { state: "CURIOUS", det, distortion, rotAngle: 0, leanAngle, a, b, c, d };
    }

    // 9. Bình thản nguyên bản (Relaxed)
    return { state: "RELAXED", det, distortion, rotAngle: 0, a, b, c, d };
  };

  function drawNoriPencilEntity2D(ctx, gridInfo, ltMatrix) {
    if (!gridInfo) return;
    const { cx, cy, px } = gridInfo;
    const isDark = (window.App && App.theme === "dark");
    const isRelieved = !!(window.App && App.isNoriRelieved);

    const M = ltMatrix || [[1, 0], [0, 1]];
    const expr = Vec2D.getNoriExpressionState(M, isRelieved);

    // Động cơ sinh học sống động (Living Biological Momentum & Micro-actions)
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const tSec = now / 1000;

    const isHeavyDeform = expr.state === "ANISOTROPIC_STRETCH" || expr.state === "ANISOTROPIC_SQUASH" || expr.state === "SHEAR_LEAN" || expr.state === "STRAINED";

    // Nhịp thở: Nhanh dồn dập (1.8s) khi bị biến dạng gắt, thở sâu điềm tĩnh (3.6s) khi trung tính
    const breatheFreq = isHeavyDeform ? 1.8 : 3.6;
    const breathe = Math.sin(tSec * (2 * Math.PI / breatheFreq));
    const scaleY = isHeavyDeform ? (1.0 + 0.015 * breathe) : (1.0 + 0.024 * breathe);
    const scaleX = isHeavyDeform ? (1.0 - 0.010 * breathe) : (1.0 - 0.015 * breathe);

    // Chu kỳ chớp mắt sinh học (Poisson ngẫu nhiên ~4.2s kèm chớp mắt kép tự nhiên)
    const cycle4 = tSec % 4.2;
    const cycle12 = tSec % 12.6;
    const isSingleBlink = cycle4 > 4.05;
    const isDoubleBlink = (cycle12 > 7.80 && cycle12 < 7.94) || (cycle12 > 8.08 && cycle12 < 8.22);
    const isBlinking = isSingleBlink || isDoubleBlink;

    // Vi chuyển động liếc mắt suy tưởng (Gaze wandering)
    const gazeX = Math.sin(tSec * 0.75) * 1.5;
    const gazeY = Math.cos(tSec * 0.55) * 0.9;

    // Vi chuyển động vẩy tai tự nhiên (Subtle ear twitch)
    const twitchCycle = tSec % 5.5;
    const earTwitch = (twitchCycle < 0.22) ? Math.sin(twitchCycle * Math.PI * 8) * 1.8 : 0;

    const living = {
      tSec,
      breathe,
      scaleX,
      scaleY,
      isBlinking,
      gazeX,
      gazeY,
      earTwitch,
      isHeavyDeform
    };

    ctx.save();
    ctx.translate(cx, cy);

    if (expr.state === "PANCAKE") {
      drawNoriFlatPancake1D(ctx, expr.a, expr.c, expr.b, expr.d, px, isDark, living);
    } else {
      ctx.transform(expr.a * px, -expr.c * px, expr.b * px, -expr.d * px, 0, 0);
      ctx.scale(0.018, -0.018);

      // Áp dụng nhịp thở sinh học quanh trọng tâm nhân vật (50, 75)
      ctx.translate(50, 75);
      ctx.scale(living.scaleX, living.scaleY);
      ctx.translate(-50, -75);

      ctx.translate(-50, -50);

      switch (expr.state) {
        case "BACKSIDE":
          drawNoriBacksideView(ctx, expr.strain, isDark);
          break;
        case "SPINNING":
          drawNoriSpinningFace(ctx, expr.rotAngle, living);
          break;
        case "SHEAR_LEAN":
          drawNoriShearLeanFace(ctx, expr.leanAngle, expr.shearFactor, living);
          break;
        case "ANISOTROPIC_STRETCH":
          drawNoriAnisotropicStretchFace(ctx, expr.aspect, living);
          break;
        case "ANISOTROPIC_SQUASH":
          drawNoriAnisotropicSquashFace(ctx, expr.aspect, living);
          break;
        case "EIGEN_ALIGN":
          drawNoriEigenAlignFace(ctx, living);
          break;
        case "SCALING":
          drawNoriScalingFace(ctx, expr.det, living);
          break;
        case "CURIOUS":
          drawNoriCuriousFace(ctx, expr.leanAngle, living);
          break;
        case "STRAINED":
          drawNoriStrainedFace(ctx, expr.strain, expr.det, isDark, living);
          break;
        case "RELIEVED":
          drawNoriRelievedFace(ctx, living);
          break;
        default:
          drawNoriRelaxedFace(ctx, isDark, living);
          break;
      }
    }

    ctx.restore();
  }

  // Xuất Canvas Linh vật Nori chuẩn 100% vector dùng chung cho 3D Figurine và Showcase
  Vec2D.renderNoriToCanvas = function (canvas, state = "RELAXED", isDark = false, living = null) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    const margin = canvas.width * 0.05;
    const size = canvas.width - margin * 2;
    const s = size / 100;
    ctx.translate(margin, margin);
    ctx.scale(s, s);

    const l = living || { breathe: 0, scaleX: 1, scaleY: 1, isBlinking: false, gazeX: 0, gazeY: 0, earTwitch: 0 };

    switch (state) {
      case "BACKSIDE":
        drawNoriBacksideView(ctx, 0, isDark);
        break;
      case "SPINNING":
        drawNoriSpinningFace(ctx, 0, l);
        break;
      case "SHEAR_LEAN":
        drawNoriShearLeanFace(ctx, 0.35, 0.45, l);
        break;
      case "ANISOTROPIC_STRETCH":
        drawNoriAnisotropicStretchFace(ctx, 2.0, l);
        break;
      case "ANISOTROPIC_SQUASH":
        drawNoriAnisotropicSquashFace(ctx, 2.0, l);
        break;
      case "EIGEN_ALIGN":
        drawNoriEigenAlignFace(ctx, l);
        break;
      case "SCALING":
      case "SCALING_BIG":
        drawNoriScalingFace(ctx, 1.4, l);
        break;
      case "SCALING_SMALL":
        drawNoriScalingFace(ctx, 0.7, l);
        break;
      case "CURIOUS":
        drawNoriCuriousFace(ctx, 0, l);
        break;
      case "STRAINED":
        drawNoriStrainedFace(ctx, 1, 1, isDark, l);
        break;
      case "RELIEVED":
        drawNoriRelievedFace(ctx, l);
        break;
      default:
        drawNoriRelaxedFace(ctx, isDark, l);
        break;
    }
    ctx.restore();
  };

  // Vòng lặp vẽ chính
  Vec2D.draw2DAllVectors = function () {
    const App = window.App || {};
    if (Vec2D._animLoopId) {
      cancelAnimationFrame(Vec2D._animLoopId);
      Vec2D._animLoopId = null;
    }
    if (App.mode !== "2D") {
      return;
    }

    const time = Date.now() * PULSE_SPEED;
    const pulseFactor = (Math.sin(time) + 1) / 2;

    const { w, h } = getLogicalSize();

    if (
      App.firstDrawForVector &&
      App.currentVector &&
      App.currentVector.length >= 2
    ) {
      App.firstDrawForVector = false;
    }

    Vec2D.gridInfo2D = Vec2D.render2DGrid();

    // [LINEAR TRANSFORMATION ENGINE HOOK]
    const isLT = !!(window.App && App.LinearTransform && App.LinearTransform.isActive());
    const ltMatrix = isLT ? App.LinearTransform.getInterpMatrix(App.LinearTransform.t) : (window.App?.activeNoriTransformMatrix || null);

    if (isLT) {
      App.LinearTransform.render2D(ctx2d, Vec2D.gridInfo2D);
    }

    // [BASIS & DIMENSION SUBSPACE HOOK]
    if (window.App && App.BasisAnimator && App.BasisAnimator.isActive()) {
      App.BasisAnimator.render2DSubspace(ctx2d, Vec2D.gridInfo2D);
    }
    // [COORDINATE ANIMATION SUBSPACE HOOK]
    if (window.App && App.CoordAnimator && App.CoordAnimator.isActive()) {
      App.CoordAnimator.render2DSubspace(ctx2d, Vec2D.gridInfo2D);
    }

    // [NORI PENCIL LIVING ENTITY HOOK]
    if (App.noriEntityActive) {
      drawNoriPencilEntity2D(ctx2d, Vec2D.gridInfo2D, ltMatrix);
    }

    // Focus Logic: Dim others
    const hasFocus = App.vectorList?.some((v) => v.focus);
    const list = (App.vectorList || []).filter((v) => v.visible !== false);
    list.sort((a, b) => (a.focus ? 1 : 0) - (b.focus ? 1 : 0)); // Focus vẽ sau

    for (const it of list) {
      // Nếu là tranh lưới vector
      if (it.isImageMesh) {
        drawImageMesh2D(ctx2d, it, Vec2D.gridInfo2D);
        continue;
      }

      // Nếu LinearTransform đang chạy và có danh sách targetVectors:
      if (isLT && App.LinearTransform.hasTargetVectors?.()) {
        if (App.LinearTransform.isVectorSelected?.(it.id)) {
          // Vector này đã được LinearTransform.render2D vẽ kèm ghost mốc, vệt quỹ đạo và nhãn live
          continue;
        }
      }

      let v2 = toVec2(it.vec);
      let alpha = typeof it.alpha === "number" ? it.alpha : 1;
      if (hasFocus && !it.focus) alpha *= 0.15; // Mờ đi
      if (isLT) {
        // Vector không tham gia biến đổi: giữ nguyên vị trí ban đầu và làm mờ 0.25 để đối chiếu không gian
        alpha *= 0.25;
      }

      // Vẽ vùng diện tích 2D nếu vector có từ 2 biến trở lên (chỉ bật khi người dùng chọn hiển thị)
      if (it.isParametric && it.vars && it.vars.length >= 2 && !!it.showAreaFill) {
        drawParametricArea2D(ctx2d, it, Vec2D.gridInfo2D, alpha);
      }

      // Vẽ vệt quỹ đạo đường cong cho vector tham số (chỉ vẽ đường cong 1D khi có đúng 1 biến)
      if (it.isParametric && typeof it.fn === "function" && it.showTrajectory !== false) {
        const varCount = Array.isArray(it.vars) ? it.vars.length : 1;
        if (varCount <= 1) {
          drawParametricTrajectory2D(ctx2d, it, Vec2D.gridInfo2D, alpha);
        }
      }

      // Vẽ 2 đường gióng tọa độ trực giao từ ngọn vector xuống Ox và sang Oy
      if (it.isParametric && it.showProjection !== false && Vec2D.gridInfo2D) {
        drawParametricProjection2D(ctx2d, it, Vec2D.gridInfo2D, alpha);
      }

      if (it.showArrow !== false) {
        const isBasisAnim = window.App && (App._basisAnimActive || (App.BasisAnimator && typeof App.BasisAnimator.isActive === "function" && App.BasisAnimator.isActive()));
        const isCoordAnim = window.App && (App._coordAnimActive || (App.CoordAnimator && typeof App.CoordAnimator.isActive === "function" && App.CoordAnimator.isActive()));
        const drawColor = (isBasisAnim && it._basisColorCss) ? it._basisColorCss : ((isCoordAnim && it._coordColorCss) ? it._coordColorCss : it.colorCss);
        const drawAlpha = (isBasisAnim && typeof it._basisAlpha === "number") ? it._basisAlpha : ((isCoordAnim && typeof it._coordAlpha === "number") ? it._coordAlpha : alpha);
        const isHoveredOrActive = (Vec2D.S2D.hoveredVectorId === it.id) || (Vec2D.S2D.draggedVectorId === it.id) || !!it.focus;
        draw2DVectorSingle(
          v2,
          drawColor,
          isHoveredOrActive,
          drawAlpha,
          pulseFactor,
          [0, 0],
        );
      }
    }

    // Ve nhan Text Halo hoc thuat cho cac vector (chong va cham)
    if (Vec2D.gridInfo2D) {
      draw2DVectorLabels(ctx2d, list, Vec2D.gridInfo2D);
    }

    // [BASIS & DIMENSION PROJECTION DECOMPOSITION HOOK]
    if (window.App && App.BasisAnimator && App.BasisAnimator.isActive()) {
      App.BasisAnimator.render2DProjections(ctx2d, Vec2D.gridInfo2D);
    }
    // [COORDINATE ANIMATION PROJECTIONS HOOK]
    if (window.App && App.CoordAnimator && App.CoordAnimator.isActive()) {
      App.CoordAnimator.render2DProjections(ctx2d, Vec2D.gridInfo2D);
    }
    if (App.tempGhosts && Array.isArray(App.tempGhosts)) {
      for (const g of App.tempGhosts) {
        if (g.isFlashlight) {
          // [QUAN TRỌNG] Nếu là đèn pin thì gọi hàm vẽ riêng
          drawFlashlight2D(g);

          // Vẽ thêm cái bóng đen (Vector kết quả màu đen)
          const vRes = toVec2(g.res);
          draw2DVectorSingle(vRes, "#000000", false, g.shadowAlpha, 0, [0, 0]);
        } else if (g.isNormalize) {
          const { cx, cy, px } = Vec2D.gridInfo2D;
          // 1. Vẽ vòng kim cô (Đường tròn đơn vị)
          ctx2d.save();
          ctx2d.beginPath();
          ctx2d.arc(cx, cy, 1 * px, 0, Math.PI * 2);
          ctx2d.strokeStyle = `rgba(0, 255, 255, ${g.unitCircleAlpha})`;
          ctx2d.setLineDash([5, 5]); // Nét đứt cho "ngầu"
          ctx2d.lineWidth = 2;
          ctx2d.stroke();
          ctx2d.restore();

          // 2. Vẽ vector ảo đang co dãn (headGlow > 0.4 sẽ bật neon)
          draw2DVectorSingle(
            g.vec,
            g.colorCss,
            g.headGlow > 0.4,
            g.alpha,
            g.headGlow,
            [0, 0],
          );
        } else {
          // Vẽ các ghost bình thường (như phép cộng)
          draw2DVectorSingle(
            g.vec,
            g.colorCss,
            false,
            g.alpha,
            0,
            g.offset || [0, 0],
            g.noArrow,      // [THÊM] Truyền cờ noArrow
            g.isRightAngle, // [THÊM] Truyền cờ góc vuông
            g.isDashed      // [THÊM] Truyền cờ nét đứt
          );
        }
      }
    }

    // Custom drawing hook for topic modules (e.g. Conic curves, parabolas, parametric traces)
    if (typeof App.custom2DDrawHook === "function" && Vec2D.gridInfo2D) {
      try {
        App.custom2DDrawHook(ctx2d, Vec2D.gridInfo2D, getLogicalSize());
      } catch (err) {
        console.error("Error in custom2DDrawHook:", err);
      }
    }

    if (App.currentAngleVisual2D)
      _drawAngleArc2DOverlay(App.currentAngleVisual2D);
    if (App.currentVector && App.currentVector.length >= 2) {
      const vOriginal = App.currentVector;
      const vStr = App.formatTip
        ? App.formatTip(vOriginal)
        : `[${vOriginal.join(", ")}]`;
      const suffix = vOriginal.length > 2 ? " (Chiếu 2D)" : "";
      App.coordOut?.(`Toạ độ: ${vStr}` + suffix);
    } else {
      App.coordOut?.("-");
    }

    // Khi LinearTransform đang kích hoạt ở chế độ 2D, LinearTransform.loop chịu trách nhiệm điều phối RAF.
    // Không lên lịch vòng lặp song song để tránh nhân bản requestAnimationFrame gây giật lag.
    if (window.App?.LinearTransform?.isActive?.() && window.App?.LinearTransform?.dim === 2) {
      return;
    }

    Vec2D._animLoopId = requestAnimationFrame(Vec2D.draw2DAllVectors);
  };

  Vec2D.drawAngleArc2D = function (v1, v2, deg) {
    const a = toVec2(v1),
      b = toVec2(v2);
    const App = window.App || {};
    App.currentAngleVisual2D = {
      a: [a[0], a[1]],
      b: [b[0], b[1]],
      deg: Number(deg),
    };
  };

  // [TÌM VÀ DÁN ĐÈ TRONG viewer2D.js]
  function _drawAngleArc2DOverlay(state) {
    const App = window.App || {};
    if (!Vec2D.gridInfo2D || !state) return;
    
    // Lấy thông số môi trường Grid hiện tại
    const { cx, cy, px } = Vec2D.gridInfo2D; 
    
    const a = state.a, b = state.b;
    const { w, h } = getLogicalSize();
    
    // Tính góc bắt đầu và kết thúc
    const angA = Math.atan2(-a[1], a[0]);
    const angB = Math.atan2(-b[1], b[0]);
    
    // Chuẩn hóa góc chênh lệch (Delta) luôn từ -PI đến PI
    const normPi = (x) => {
      while (x <= -Math.PI) x += 2 * Math.PI;
      while (x > Math.PI) x -= 2 * Math.PI;
      return x;
    };
    const delta = normPi(angB - angA);
    const anticlockwise = delta < 0;

    // --- TÍNH TOÁN BÁN KÍNH ĐỘNG THEO ZOOM (PX) ---
    // 1. Độ dài thực tế Toán học của 2 vector
    const mathLenA = Math.hypot(a[0], a[1]);
    const mathLenB = Math.hypot(b[0], b[1]);
    
    // 2. Chốt bán kính hình quạt = 60% vector ngắn nhất
    const mathMinLen = Math.min(mathLenA, mathLenB);
    const mathRadius = Math.max(0.5, mathMinLen * 0.6); 
    
    // 3. Nhân với hệ số pxPerUnit để ra kích thước Pixel thật trên màn hình
    const r = mathRadius * px;

    ctx2d.save();
    
    // Vẽ phần nền quạt (Fill)
    ctx2d.beginPath();
    ctx2d.moveTo(cx, cy);
    ctx2d.arc(cx, cy, r, angA, angA + delta, anticlockwise);
    ctx2d.closePath();
    ctx2d.fillStyle = "rgba(255, 200, 0, 0.32)";
    ctx2d.fill();
    
    // Vẽ đường viền vòng cung (Stroke)
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, r, angA, angA + delta, anticlockwise);
    ctx2d.strokeStyle = "#ffaa00";
    ctx2d.lineWidth = 1.5;
    ctx2d.stroke();

    // Tính toán tọa độ đặt Chữ số góc
    const mid = angA + delta / 2;
    // Điểm đặt chữ lùi ra xa tâm một khoảng r + 15px
    const padPx = 15;
    const tx = cx + Math.cos(mid) * (r + padPx);
    const ty = cy + Math.sin(mid) * (r + padPx);
    const degShow = state.deg != null ? state.deg : Math.abs((delta * 180) / Math.PI);
    
    // --- TÍNH TOÁN FONT SIZE ĐỘNG THEO ZOOM ---
    // Quy chuẩn: 80px/unit tương ứng font 14px. 
    // Giới hạn nhỏ nhất là 10px, lớn nhất là 18px để không bị vỡ giao diện.
    const fontSize = Math.max(10, Math.min(18, 14 * (px / 80)));
    
    ctx2d.font = `bold ${fontSize}px sans-serif`;
    ctx2d.textAlign = "center";
    ctx2d.textBaseline = "middle";
    
    // Lấy màu tương phản theo Theme
    const textColor = App.getCSS?.("--label-fg") || App.getCSS?.("--fg") || "#fff";
    ctx2d.fillStyle = textColor;
    
    // Vẽ chữ độ
    ctx2d.fillText(`${degShow.toFixed(1)}°`, tx, ty);
    ctx2d.restore();
  }

  Vec2D.resetView = function () {
    if (Vec2D._resetAnimId) cancelAnimationFrame(Vec2D._resetAnimId);
    const startX = Vec2D.S2D.offsetX;
    const startY = Vec2D.S2D.offsetY;
    const startScale = Vec2D.S2D.pxPerUnit;
    const targetX = 0;
    const targetY = 0;
    const targetScale = 80;
    const duration = 800;
    const startTime = performance.now();
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    function loop(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeOutCubic(progress);
      Vec2D.S2D.offsetX = startX + (targetX - startX) * ease;
      Vec2D.S2D.offsetY = startY + (targetY - startY) * ease;
      Vec2D.S2D.pxPerUnit = startScale + (targetScale - startScale) * ease;
      if (progress < 1) Vec2D._resetAnimId = requestAnimationFrame(loop);
      else {
        Vec2D._resetAnimId = null;
        Vec2D.S2D.offsetX = targetX;
        Vec2D.S2D.offsetY = targetY;
        Vec2D.S2D.pxPerUnit = targetScale;
      }
    }
    Vec2D._resetAnimId = requestAnimationFrame(loop);
  };
})();
