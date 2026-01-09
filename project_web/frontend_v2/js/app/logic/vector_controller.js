// ===================== vector_controller.js (FULL - FIX ID RESET) =====================
(function () {
  window.App = window.App || {};

  // [FIX] Biến đếm ID toàn cục cho module này (để reset được)
  let nextVectorId = 1;

  const toVec3 = (v) => [v?.[0] || 0, v?.[1] || 0, v?.[2] || 0];

  /* =======================================================================
      PHẦN 1: TIỆN ÍCH & GIAO DIỆN (TOAST, THEME, SCROLL...)
      ======================================================================= */

  // 1. Hiển thị Popup thông báo (Toast)
  App.showToast = function(message, type = 'error') {
      let container = document.getElementById("toast-container");
      if (!container) {
          container = document.createElement("div");
          container.id = "toast-container";
          document.body.appendChild(container);
      }

      const toast = document.createElement("div");
      toast.className = "toast-item";
      
      const iconSVG = type === 'error' 
        ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>' 
        : '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';

      toast.innerHTML = `
          <div class="toast-content">
              <span class="toast-icon">${iconSVG}</span>
              <span>${message}</span>
          </div>
          <div class="toast-progress"></div>
      `;

      container.appendChild(toast);
      setTimeout(() => {
          toast.classList.add("hide");
          toast.addEventListener("animationend", () => toast.remove());
      }, 5000);
  };

  // 2. Xử lý khi danh sách vector trống
  App.handleEmptyListAction = function() {
      if(App.vectorList.length === 0) {
          App.showToast("Danh sách trống! Hãy tạo vector ở đây trước 👇");
          const createCard = document.getElementById("card-create");
          if(createCard) {
              createCard.scrollIntoView({ behavior: "smooth", block: "center" });
              const inp = document.getElementById("vectorInput");
              if(inp) { 
                  inp.focus(); 
                  inp.style.transition = "box-shadow 0.2s";
                  inp.style.boxShadow = "0 0 0 4px rgba(255, 77, 79, 0.4)";
                  setTimeout(()=>inp.style.boxShadow="", 1000); 
              }
          }
          return true;
      }
      return false;
  };

  // 3. Theme, Mode, Auto
  App.applyTheme = function () {
    document.body.classList.toggle("dark", App.theme === "dark");
    const themeBadge = document.getElementById("themeBadge");
    if (themeBadge) themeBadge.textContent = `Theme: ${App.theme === "dark" ? "Dark" : "Light"}`;
    // Nếu có hàm refreshHaloColors (từ vector_list_renderer) thì gọi
    if(typeof App.refreshHaloColors === 'function') App.refreshHaloColors();
    
    if (App.mode === "2D" && window.Vec2D) Vec2D.draw2DAllVectors();
    
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

  App.toggleAuto = function () {
    const btn = document.getElementById("btnAuto");
    App.autoMode = !App.autoMode;
    if (btn) btn.textContent = App.autoMode ? "Tự động chuyển chiều không gian: BẬT" : "Tự động chuyển chiều không gian: TẮT";
  };

  App._portAngleOverlay = function (toMode) {
    if (toMode === "3D") {
      if (!window.Vec3D) return;
      if (App.currentAngleVisual3D) { Vec3D.refreshAngleTheme(); return; }
      const g2 = App.currentAngleVisual2D;
      if (g2) {
        const deg = parseFloat(String(g2.deg));
        if (isFinite(deg)) {
            const rad = deg * Math.PI / 180;
            Vec3D.drawAngleArc3D([g2.a[0], g2.a[1], 0], [g2.b[0], g2.b[1], 0], rad, deg);
        }
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
        const ax = src.a[0], ay = src.a[1], bx = src.b[0], by = src.b[1];
        const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
        if (la > 1e-9 && lb > 1e-9) {
          let c = (ax * bx + ay * by) / (la * lb);
          c = Math.max(-1, Math.min(1, c));
          const rad = Math.acos(c);
          Vec2D.drawAngleArc2D([ax, ay], [bx, by], rad * 180 / Math.PI);
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
        Vec3D.show3D();
        Vec3D.resetView(); 
        App._portAngleOverlay("3D");
      }
    } else {
      if (window.Vec2D) {
        Vec2D.show2D();
        Vec2D.resetView(); 
        App._portAngleOverlay("2D");
      }
    }
  };

  App.clearAngleOverlay = function () {
    App.currentAngleVisual2D = null;
    const angEl = document.getElementById("result_angle");
    if (angEl) angEl.innerText = "—";
    if (window.Vec3D) {
      Vec3D.clearAngle();
      if (App.mode === "3D") Vec3D.hardRefresh3D(false);
    }
  };

  App.getCheckedVectors = function (container) {
    const arr = [];
    if (!container) return arr;
    container.querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => {
      const id = Number(cb.value);
      const it = App.vectorList.find((v) => v.id === id);
      if (it) arr.push(it.vec.slice());
    });
    return arr;
  };

  App.selectIdToVector = function (selectEl) {
    if (!selectEl) return null;
    const id = Number(selectEl.value);
    return App.vectorList.find((v) => v.id === id)?.vec ?? null;
  };

  App.redrawAll = function (opts = { frame: true }) {
    if (App.mode === "2D") {
      if (window.Vec2D) { Vec2D.show2D(); Vec2D.draw2DAllVectors(); }
    } else {
      if (window.Vec3D) { Vec3D.show3D(); Vec3D.draw3DAllVectors({ frame: opts.frame }); }
    }
  };

  // [NEW HELPER] Hàm tạo object vector chuẩn với ID tăng dần
  App._attachVectorItem = function(vec, hue) {
      return {
          id: nextVectorId++, // ID lấy từ biến đếm toàn cục
          vec: vec,
          // Giả lập màu nếu App.hslToHex chưa có (hoặc dùng hàm có sẵn)
          colorHex: (typeof App.hslToHex === 'function') 
              ? App.hslToHex((hue % 360) / 360, 0.85, 0.6) 
              : `hsl(${hue}, 85%, 60%)`, 
          colorCss: `hsl(${hue}, 85%, 60%)`,
          haloCss: `hsl(${hue}, 85%, 80%)`,
          visible: true,
          focus: false,
          highlighted: false,
          alpha: 1
      };
  };

  // 4. Hàm thêm Vector
  App.onAddVector = function () {
    const inp = document.getElementById("vectorInput");
    if (!inp) return;
    const raw = inp.value.trim();
    let v;
    try {
      v = App.parseVectorExpr(raw);
      if (!Array.isArray(v) || v.length < 2) throw new Error("Vector phải có ít nhất 2 toạ độ");
    } catch (err) { 
        App.showToast("Lỗi nhập liệu: " + err.message); 
        return; 
    }
    
    App.currentVector = v.slice();
    App.firstDrawForVector = true;
    const hue = App._pickUniqueHue();
    
    // Sử dụng hàm helper đã thêm ở trên
    const item = App._attachVectorItem(v, hue);
    App.vectorList.push(item);

    App.renderVectorList();
    App.refreshCalcVectorOptions();

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
    // [FIX] Reset biến đếm ID về 1
    nextVectorId = 1;
    App.usedHues.clear();
    App.clearAngleOverlay();
    App.renderVectorList();
    App.refreshCalcVectorOptions();
    App.redrawAll({ frame: true });
  };

  /* =======================================================================
      PHẦN 2: LOGIC MENU 2 - PHÉP TOÁN
      ======================================================================= */
  function vectorById(id) { return App.vectorList.find((v) => v.id === id)?.vec ?? null; }

  // 1. Ẩn hiện UI ô nhập liệu
  App.refreshCalcUI = function () {
    const opEl = document.getElementById("opSelect");
    if(!opEl) return;
    const op = opEl.value;
    const v2Box = document.getElementById("v2Box");
    const scalarBox = document.getElementById("scalarBox");
    const btnCompute = document.getElementById("btnCompute");

    if (!v2Box || !scalarBox) return;

    if (op === "scale") {
        v2Box.style.display = "none";
        scalarBox.style.display = "block";
    } else if (op === "normalize" || op === "vector_norm") {
        v2Box.style.display = "none";
        scalarBox.style.display = "none";
    } else {
        v2Box.style.display = "block";
        scalarBox.style.display = "none";
    }
    
    if (btnCompute) {
        const measureOps = ["dot", "vector_norm", "angle_between"];
        btnCompute.textContent = measureOps.includes(op) ? "Tính toán" : "Thực hiện";
    }
    
    const s = document.getElementById("calcSteps"); 
    if(s) { 
        s.innerHTML = "Kết quả phép tính sẽ hiển thị ở đây."; 
        s.style.color = "";
    }
  };

  // 2. Hàm chạy tính toán chính
  App.runCalc = async function (addToList) {
    if (App.handleEmptyListAction()) return;

    const op = document.getElementById("opSelect").value;
    const id1 = Number(document.getElementById("v1Select").value);
    const id2 = Number(document.getElementById("v2Select").value);
    const scalarInp = document.getElementById("scalarInp");
    const calcSteps = document.getElementById("calcSteps");

    const v1 = vectorById(id1);
    const needsV2 = !["scale", "normalize", "vector_norm"].includes(op);
    const v2 = needsV2 ? vectorById(id2) : null;

    let payload = null;

    try {
      if (!v1) throw "Chưa chọn Vector 1.";
      if (needsV2 && !v2) throw "Chưa chọn Vector 2.";
      if (needsV2 && v1.length !== v2.length) throw "Hai vector phải cùng số chiều.";
      
      if (op === "add") { payload = { v1, v2 }; } 
      else if (op === "scale") { 
          const k = parseFloat(scalarInp.value); 
          if (!isFinite(k)) throw "Hệ số k không hợp lệ.";
          payload = { v: v1, scalar: k }; 
      }
      else if (op === "cross") { 
          if(v1.length!==3||v2.length!==3) throw "Tích có hướng cần vector 3 chiều."; 
          payload = { v1, v2 }; 
      }
      else if (op === "normalize") { payload = { v: v1 }; }
      else if (op === "projection") { payload = { v: v1, u: v2 }; }
      else if (op === "dot") { payload = { v1, v2 }; }
      else if (op === "vector_norm") { payload = { v: v1 }; }
      else if (op === "angle_between") { payload = { v1, v2 }; }
    } catch (err) { App.showToast(String(err)); return; }

    const mapOpToApi={add:"add_vectors",scale:"scale_vector",cross:"cross_product",normalize:"normalize",projection:"projection",dot:"dot_product",vector_norm:"vector_norm",angle_between:"angle_between"};
    
    calcSteps.innerHTML="Đang tính...";
    calcSteps.style.color = "var(--text-muted, #888)";

    try{
        let data=await App.callAPI(mapOpToApi[op], payload);
        if(data.error) throw data.error;
        
        calcSteps.style.color = "";

        if(["dot","vector_norm","angle_between"].includes(op)){
            let val=data.result;
            if(op==="angle_between"){
                const deg=val*180/Math.PI;
                if(App.mode==="2D"&&window.Vec2D) Vec2D.drawAngleArc2D(v1,v2,deg);
                else if(window.Vec3D) Vec3D.drawAngleArc3D(v1,v2,val,deg);
                calcSteps.innerHTML=`<div>${deg.toFixed(2)}°</div>`;
            } else { 
                calcSteps.innerHTML=`<div>${App.formatScalar(val)}</div>`; 
            }
            return;
        }

        const vecRes = data.result || data.result_vec;
        if (!vecRes) { App.showToast("Lỗi: Backend không trả về kết quả."); return; }

        const pretty = App.formatVectorShort(vecRes);
        calcSteps.innerHTML=`<div><b>Kết quả:</b> <code>${pretty}</code></div>`;

        if(addToList){
            const hue=App._pickUniqueHue();
            const newItem=App._attachVectorItem(vecRes,hue);
            newItem.highlighted=true;
            App.vectorList.push(newItem);
            App.renderVectorList();
            App.refreshCalcVectorOptions();

            if(op==="scale"){
                const target=[...newItem.vec]; const start=[...v1];
                const elastic=(t)=>Math.pow(2,-10*t)*Math.sin((t*10-0.75)*(2*Math.PI)/3)+1;
                const dur=1200, t0=performance.now();
                
                function anim(now){
                    const p=Math.min((now-t0)/dur,1);
                    newItem.vec=start.map((s,i)=>s+(target[i]-s)*elastic(p));
                    App.redrawAll({frame:false});
                    if(p<1)requestAnimationFrame(anim);
                    else { newItem.vec=target; App.redrawAll({frame:false}); }
                }
                requestAnimationFrame(anim);
            } else { 
                App.redrawAll({frame:false}); 
            }
            
            App.currentAngleVisual2D = null;
            if (window.Vec3D) Vec3D.clearAngle();
        } else { 
            App.previewVector(vecRes); 
        }
    } catch(e){ 
        calcSteps.innerHTML="Lỗi."; 
        calcSteps.style.color="salmon"; 
        App.showToast("Lỗi API: " + e);
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
      const g = new THREE.Group(); g.add(grp, proj);
      Vec3D._scene.add(g);
      App._previewTemp = g;
      Vec3D.hardRefresh3D(false);
    }
    App.coordOut(App.formatTip(vec));
  };

  /* =======================================================================
      4. UI UPDATE: CHECKLIST & DROPDOWN (ĐÃ SỬA SEARCH & DISPLAY)
      ======================================================================= */
  App.refreshCalcVectorOptions = function () {
    const list = App.vectorList || [];
    
    // 1. Cập nhật Select
    const selectIds = ["v1Select", "v2Select", "vCoordSelect", "vProjSelect", "vNormSelect", "v1DotSelect", "v2DotSelect", "v1AngleSelect", "v2AngleSelect"];
    selectIds.forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.onmousedown = function(e) { if (list.length === 0) { e.preventDefault(); App.handleEmptyListAction(); }};
      const oldVal = sel.value;
      sel.innerHTML = "";
      if(list.length===0) { const opt=document.createElement("option"); opt.text="(Trống)"; sel.appendChild(opt); sel.disabled=true; } 
      else {
          sel.disabled = false;
          list.forEach(v => {
            const opt = document.createElement("option");
            opt.value = v.id;
            opt.textContent = `${v.name || ("#" + v.id)} [${v.vec.join(",")}]`;
            sel.appendChild(opt);
          });
          if (oldVal && list.some(x => x.id == oldVal)) sel.value = oldVal;
      }
    });

    // 2. Cập nhật Checklist (Search Bất Chấp Dấu Cách)
    const checklistIds = ["indepChecklist", "rankChecklist", "basisChecklist", "basisCoordChecklist", "projBasisChecklist"];
    
    checklistIds.forEach(id => {
        const container = document.getElementById(id);
        if(!container) return;
        container.innerHTML = "";

        if(list.length === 0) {
            const emptyDiv = document.createElement("div");
            emptyDiv.className = "empty-list-msg";
            emptyDiv.innerHTML = "⚠️ Chưa có vector.<br>Nhấn để tạo ngay!";
            emptyDiv.onclick = () => App.handleEmptyListAction();
            container.appendChild(emptyDiv);
            return;
        }

        // Tool bar
        const toolsDiv = document.createElement("div");
        toolsDiv.className = "checklist-tools";
        const searchInp = document.createElement("input");
        searchInp.type="text"; searchInp.placeholder="🔍 Tìm vector..."; searchInp.className="vec-search-inp";
        
        // Dòng Chọn tất cả
        const saRow = document.createElement("div"); saRow.className = "select-all-row";
        const saLabel = document.createElement("span"); saLabel.className = "select-all-text"; saLabel.textContent = "Chọn tất cả";
        const saCb = document.createElement("input"); saCb.type = "checkbox"; saCb.className = "select-all-cb";

        saRow.appendChild(saLabel);
        saRow.appendChild(saCb);
        
        toolsDiv.appendChild(searchInp);
        toolsDiv.appendChild(saRow);
        container.appendChild(toolsDiv);

        // Scrollable List
        const listDiv = document.createElement("div");
        listDiv.className = "vec-list-scroll";
        const checkboxes = [];

        list.forEach(v => {
            const row = document.createElement("div");
            row.className = "vec-item-row";
            
            const span = document.createElement("span");
            span.className = "vec-label-text"; 
            span.textContent = `${v.name || "#"+v.id} [${v.vec.join(", ")}]`;
            span.title = span.textContent;

            const cb = document.createElement("input");
            cb.type = "checkbox"; cb.value = v.id; cb.className = "vec-checkbox";

            // Set data-id để đảm bảo lấy đúng ID
            cb.setAttribute("data-id", v.id);

            row.addEventListener("click", (e) => { if(e.target!==cb) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); } });
            row.appendChild(span); row.appendChild(cb);
            listDiv.appendChild(row);
            checkboxes.push({ row, cb, text: span.textContent.toLowerCase() });
        });
        container.appendChild(listDiv);

        // --- FIX LOGIC SEARCH (BỎ DẤU CÁCH) ---
        searchInp.addEventListener("input", () => {
            // Xóa sạch dấu cách ở từ khóa tìm kiếm
            const term = searchInp.value.toLowerCase().replace(/\s+/g, '');
            checkboxes.forEach(i => {
                // Xóa sạch dấu cách ở tên vector trong danh sách
                const cleanText = i.text.replace(/\s+/g, '');
                i.row.style.display = cleanText.includes(term) ? "flex" : "none";
            });
        });

        saCb.addEventListener("change", () => {
            checkboxes.forEach(i => { if(i.row.style.display!=="none") i.cb.checked = saCb.checked; });
        });
    });
  };

  /* =======================================================================
      PHẦN 5: LOGIC GỌI API MENU 1
      ======================================================================= */
  
  App.refreshExtraUI = function() {
      const el = document.getElementById("opExtraSelect");
      if(!el) return;
      const val = el.value;
      document.querySelectorAll(".extra-form").forEach(f => f.style.display = "none");
      const active = document.getElementById("form-" + val);
      if(active) active.style.display = "block";
  };

  App.rankVectorsUI = async function () {
    const container = document.getElementById("rankChecklist");
    if (App.handleEmptyListAction()) return;
    const vectors = App.getCheckedVectors(container);
    if (!vectors.length) { App.showToast("⚠️ Hãy tick chọn ít nhất 1 vector!"); return; }
    try {
      const res = await App.callAPI("rank", { vectors });
      document.getElementById("result_rank").innerText = `Hạng = ${res.rank}`;
    } catch (err) { document.getElementById("result_rank").innerText = "Lỗi: " + err.message; App.showToast(err.message); }
  };

  // --- HÀM BẠN CẦN SỬA ĐÂY RỒI ---
  App.linearIndependenceUI = async function () {
    const container = document.getElementById("indepChecklist");
    if (App.handleEmptyListAction()) return;
    const vectors = App.getCheckedVectors(container);
    if (!vectors.length) { App.showToast("⚠️ Hãy tick chọn ít nhất 1 vector!"); return; }
    
    try {
      const res = await App.callAPI("linear_independence", { vectors });
      
      // --- FIX LOGIC: Tự tính status dựa trên Rank và số lượng vector ---
      const n = vectors.length;
      const r = res.rank;
      let statusText = "";

      if (r === n) {
          statusText = "Độc lập tuyến tính";
      } else {
          statusText = "Phụ thuộc tuyến tính";
      }

      document.getElementById("result_indep").innerText = statusText;

    } catch (err) { 
        document.getElementById("result_indep").innerText = "Lỗi: " + err.message; 
        App.showToast(err.message); 
    }
  };

  App.coordinatesUI = async function () {
    if (App.handleEmptyListAction()) return;
    const v = App.selectIdToVector(document.getElementById("vCoordSelect"));
    const basis = App.getCheckedVectors(document.getElementById("basisCoordChecklist"));
    if (!v) { App.showToast("Chưa chọn vector cần tìm tọa độ!"); return; }
    if (!basis.length) { App.showToast("Chọn hệ cơ sở (tick ít nhất 1 vector)!"); return; }

    try {
      const res = await App.callAPI("coordinates", { vector: v, basis: basis });
      const coords = res.coordinates;
      if (!coords) throw new Error("Không tìm thấy tọa độ.");
      const text = `[${coords.map(x => (typeof App.formatScalar === 'function' ? App.formatScalar(x) : x)).join(", ")}]`;
      document.getElementById("result_coord").innerText = `${App.formatVectorShort(v)} = ${text} (theo cơ sở)`;
    } catch (err) { document.getElementById("result_coord").innerText = "Lỗi: " + err.message; App.showToast(err.message); }
  };

  // --- INIT BINDING ---
  window.addEventListener("load", () => {
      const extraSelect = document.getElementById("opExtraSelect");
      if(extraSelect) {
          extraSelect.addEventListener("change", App.refreshExtraUI);
          App.refreshExtraUI();
      }
      const btnIndep = document.getElementById("btnIndep"); if(btnIndep) btnIndep.onclick = App.linearIndependenceUI;
      const btnRank = document.getElementById("btnRank"); if(btnRank) btnRank.onclick = App.rankVectorsUI;
      const btnCoord = document.getElementById("btnCoord"); if(btnCoord) btnCoord.onclick = App.coordinatesUI;
  });

})();