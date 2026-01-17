// ===================== js/app/logic/vector_controller.js (FINAL DETAILED VERSION) =====================
(function () {
    window.App = window.App || {};
    App.useAnimation = true;
    // Biến đếm ID toàn cục (Reset được)
    let nextVectorId = 1;

    // Helper: Chuyển vector bất kỳ thành mảng [x, y, z] an toàn
    const toVec3 = function (v) {
        return [v?.[0] || 0, v?.[1] || 0, v?.[2] || 0];
    };

    /* =======================================================================
       PHẦN 1: TIỆN ÍCH & GIAO DIỆN
       ======================================================================= */

    // Hiển thị thông báo Toast
    App.showToast = function (message, type = 'error') {
        let container = document.getElementById("toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "toast-container";
            document.body.appendChild(container);
        }

        const toast = document.createElement("div");
        toast.className = "toast-item";

        let iconSVG = '';
        if (type === 'error') {
            iconSVG = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';
        } else {
            iconSVG = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
        }

        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${iconSVG}</span>
                <span>${message}</span>
            </div>
            <div class="toast-progress"></div>
        `;

        container.appendChild(toast);
        setTimeout(function () {
            toast.classList.add("hide");
            toast.addEventListener("animationend", function () {
                toast.remove();
            });
        }, 5000);
    };

    // Xử lý khi danh sách vector trống
    App.handleEmptyListAction = function () {
        if (App.vectorList.length === 0) {
            App.showToast("Danh sách trống! Hãy tạo vector ở đây trước 👇");
            const createCard = document.getElementById("card-create");
            if (createCard) {
                createCard.scrollIntoView({ behavior: "smooth", block: "center" });
                const inp = document.getElementById("vectorInput");
                if (inp) {
                    inp.focus();
                    inp.style.transition = "box-shadow 0.2s";
                    inp.style.boxShadow = "0 0 0 4px rgba(255, 77, 79, 0.4)";
                    setTimeout(function () { inp.style.boxShadow = ""; }, 1000);
                }
            }
            return true;
        }
        return false;
    };

    // Áp dụng Theme (Dark/Light)
    App.applyTheme = function () {
        document.body.classList.toggle("dark", App.theme === "dark");
        const themeBadge = document.getElementById("themeBadge");
        if (themeBadge) {
            themeBadge.textContent = `Theme: ${App.theme === "dark" ? "Dark" : "Light"}`;
        }

        if (typeof App.refreshHaloColors === 'function') App.refreshHaloColors();

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

    function triggerThemeAnim(isDark) {
        const s = document.getElementById('sunIcon');
        const m = document.getElementById('moonIcon');
        if (!s || !m) return;

        // Reset animation cũ để có thể chạy lại
        s.classList.remove('animate-rise-fade');
        m.classList.remove('animate-rise-fade');

        // Hack: Buộc trình duyệt vẽ lại (reflow) để nhận diện reset
        void s.offsetWidth;

        // Thêm class để chạy animation
        if (isDark) m.classList.add('animate-rise-fade');
        else s.classList.add('animate-rise-fade');
    }

    // [SỬA] Cập nhật hàm toggleTheme để gọi hiệu ứng
    App.toggleTheme = function () {
        App.theme = App.theme === "light" ? "dark" : "light";
        App.applyTheme();

        // Gọi hiệu ứng bay lên
        triggerThemeAnim(App.theme === 'dark');

        localStorage.setItem('vec_theme', App.theme);
    };

    App.toggleAuto = function () {
        const btn = document.getElementById("btnAuto");
        App.autoMode = !App.autoMode;
        if (btn) {
            btn.textContent = App.autoMode ? "Tự động chuyển chiều không gian: BẬT" : "Tự động chuyển chiều không gian: TẮT";
        }
    };

    // Xử lý vẽ đè góc (Angle Overlay) khi chuyển chế độ
    App._portAngleOverlay = function (toMode) {
        if (toMode === "3D") {
            if (!window.Vec3D) return;
            if (App.currentAngleVisual3D) {
                Vec3D.refreshAngleTheme();
                return;
            }
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

    // Vẽ lại toàn bộ (Gọi cả 2D và 3D)
    App.redrawAll = function (opts) {
        opts = opts || { frame: true };
        if (App.mode === "2D") {
            if (window.Vec2D) {
                Vec2D.show2D();
                Vec2D.draw2DAllVectors();
            }
        } else {
            if (window.Vec3D) {
                Vec3D.show3D();
                Vec3D.draw3DAllVectors({ frame: opts.frame });
            }
        }
    };

    // --- PHẦN TẠO VECTOR ---

    // Hàm parse chuỗi nhập liệu (VD: "1, 2, 3" -> [1, 2, 3])
    // Thêm vào đây để đảm bảo chức năng tạo vector không bị lỗi nếu thiếu file logic
    App.parseVectorExpr = function (str) {
        if (!str) return null;
        // Loại bỏ ngoặc [], (), vector{}, dấu cách thừa
        let s = str.replace(/[\[\]\(\)\{\}]/g, "").replace(/vector/gi, "").trim();
        if (!s) return null;

        // Tách bằng dấu phẩy hoặc khoảng trắng
        let parts = s.split(/[\s,]+/);
        let res = [];
        for (let p of parts) {
            if (!p) continue;
            let val = parseFloat(p);
            if (isNaN(val)) throw new Error("Giá trị không hợp lệ: " + p);
            res.push(val);
        }
        return res;
    };

    // Helper tạo Object Vector mới
    App._attachVectorItem = function (vec, hue) {
        return {
            id: nextVectorId++, // ID tăng dần
            vec: vec,
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

    // Hàm xử lý sự kiện nút "Thêm Vector"
    App.onAddVector = function () {
        const inp = document.getElementById("vectorInput");
        if (!inp) return;

        const raw = inp.value.trim();
        let v;
        try {
            v = App.parseVectorExpr(raw);
            if (!Array.isArray(v) || v.length < 2) {
                throw new Error("Vector phải có ít nhất 2 toạ độ");
            }
        } catch (err) {
            App.showToast("Lỗi nhập liệu: " + err.message);
            return;
        }

        App.currentVector = v.slice();
        App.firstDrawForVector = true;
        const hue = App._pickUniqueHue ? App._pickUniqueHue() : (Math.random() * 360);

        const item = App._attachVectorItem(v, hue);
        App.vectorList.push(item);

        App.renderVectorList();
        App.refreshCalcVectorOptions();

        // Tự động chuyển mode nếu cần
        if (App.autoMode) {
            App.mode = (v.length >= 3) ? "3D" : "2D";
            const modeBadge = document.getElementById("modeBadge");
            if (modeBadge) modeBadge.textContent = `Mode: ${App.mode}`;
        }

        App.redrawAll({ frame: false });

        if (App.mode === "3D" && window.Vec3D) {
            Vec3D.hardRefresh3D(false);
        }
    };

    // Hàm xóa hết vector
    App.clearAllVectors = function () {
        App.vectorList.length = 0;
        nextVectorId = 1;
        if (App.usedHues) App.usedHues.clear();

        App.clearAngleOverlay();
        App.renderVectorList();
        App.refreshCalcVectorOptions();
        App.redrawAll({ frame: true });
    };

    /* =======================================================================
       PHẦN 2: LOGIC TÍNH TOÁN & KÍCH HOẠT ANIMATION
       ======================================================================= */

    function vectorById(id) {
        const item = App.vectorList.find(function (v) { return v.id === id; });
        return item ? item.vec : null;
    }

    App.refreshCalcUI = function () {
        const opEl = document.getElementById("opSelect");
        if (!opEl) return;

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
        if (s) {
            s.innerHTML = "Kết quả phép tính sẽ hiển thị ở đây.";
            s.style.color = "";
        }
    };

    // --- MAIN FUNCTION: CHẠY TÍNH TOÁN ---
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

            if (op === "add") payload = { v1, v2 };
            else if (op === "scale") {
                const k = parseFloat(scalarInp.value);
                if (!isFinite(k)) throw "Hệ số k không hợp lệ.";
                payload = { v: v1, scalar: k };
            }
            else if (op === "cross") payload = { v1, v2 };
            else if (op === "normalize") payload = { v: v1 };
            else if (op === "projection") payload = { v: v1, u: v2 };
            else if (op === "dot") payload = { v1, v2 };
            else if (op === "vector_norm") payload = { v: v1 };
            else if (op === "angle_between") payload = { v1, v2 };
        } catch (err) { App.showToast(String(err)); return; }

        const mapOpToApi = {
            add: "add_vectors", scale: "scale_vector", cross: "cross_product",
            normalize: "normalize", projection: "projection", dot: "dot_product",
            vector_norm: "vector_norm", angle_between: "angle_between"
        };

        calcSteps.innerHTML = "Đang tính...";
        try {
            let data = await App.callAPI(mapOpToApi[op], payload);
            if (data.error) throw data.error;

            // 1. Xử lý kết quả vô hướng
            if (["dot", "vector_norm", "angle_between"].includes(op)) {
                let val = data.result;
                if (op === "angle_between") {
                    const deg = val * 180 / Math.PI;
                    if (App.mode === "2D" && window.Vec2D) Vec2D.drawAngleArc2D(v1, v2, deg);
                    else if (window.Vec3D) Vec3D.drawAngleArc3D(v1, v2, val, deg);
                    calcSteps.innerHTML = `<div>${deg.toFixed(2)}°</div>`;
                } else {
                    calcSteps.innerHTML = `<div>${App.formatScalar ? App.formatScalar(val) : val}</div>`;
                }
                return;
            }

            // 2. Xử lý kết quả Vector
            const vecRes = data.result || data.result_vec;
            calcSteps.innerHTML = `<div><b>Kết quả:</b> <code>${vecRes.join(", ")}</code></div>`;

            if (addToList) {
                const hue = App._pickUniqueHue ? App._pickUniqueHue() : 0;
                const newItem = App._attachVectorItem(vecRes, hue);

                // [FIX] Đưa vào danh sách NGAY LẬP TỨC để đồng bộ ID
                App.vectorList.push(newItem);
                App.renderVectorList();
                App.refreshCalcVectorOptions();

                if (!App.useAnimation) {
                    newItem.alpha = 1;      // Hiện ngay
                    newItem.vec = vecRes;   // Gán giá trị cuối
                    App.tempGhosts = [];    // Xóa bóng ma (nếu có)
                    App.redrawAll({ frame: false });
                    return; // Dừng hàm, không chạy xuống phần animation dưới nữa
                }
                // --- 3. XỬ LÝ ANIMATION CO DÃN (LÒ XO) ---
                if (op === "normalize" || op === "scale") {
                    const startVec = [...v1];
                    const targetVec = [...vecRes];
                    const stretchGhost = {
                        isNormalize: (op === "normalize"),
                        vec: [...startVec],
                        colorCss: newItem.colorCss,
                        alpha: 1,
                        unitCircleAlpha: 0,
                        headGlow: 0
                    };

                    App.tempGhosts = [stretchGhost];

                    // [SỬA 1] Đừng ẩn nữa, để 1 cho 3D nó thấy đường mà vẽ
                    newItem.alpha = 1;

                    const dur = 1200;
                    const t0 = performance.now();

                    function animSpring(now) {
                        const p = Math.min((now - t0) / dur, 1);

                        // [CÔNG THỨC OVERSHOOT THỦ CÔNG - NHÉT TRỰC TIẾP VÀO ĐÂY]
                        // 1. Math.sin(...) tạo dao động
                        // 2. Math.pow(2, -6 * p) làm dao động yếu dần
                        // 3. Số 1.2 là biên độ (độ văng), chỉnh lên 1.5 nếu muốn văng xa hơn
                        let elastic = 1;
                        if (p < 1) {
                            elastic = 1 + 1.2 * Math.pow(2, -6 * p) * Math.sin((p * 5 - 0.5) * Math.PI);
                        }

                        // Tính toán độ dài vector (sẽ có lúc dài hơn đích)
                        const currentVec = startVec.map((s, i) => s + (targetVec[i] - s) * elastic);

                        stretchGhost.vec = currentVec;
                        newItem.vec = currentVec; // Ép 3D vẽ lại

                        // Hiệu ứng vòng tròn khi chuẩn hóa
                        if (op === "normalize") {
                            stretchGhost.unitCircleAlpha = Math.min(p * 3, 1) * 0.5;
                            if (p > 0.8) stretchGhost.headGlow = (p - 0.8) * 5;
                        }

                        App.redrawAll({ frame: false });

                        if (p < 1) {
                            requestAnimationFrame(animSpring);
                        } else {
                            setTimeout(() => {
                                newItem.alpha = 1;
                                newItem.vec = targetVec; // Chốt hạ giá trị chuẩn
                                App.tempGhosts = [];
                                App.redrawAll({ frame: false });
                            }, 200);
                        }
                    }
                    requestAnimationFrame(animSpring);
                }
                // PHÉP CỘNG & CHIẾU
                else {
                    const hasAnim = (op === 'add' || op === 'projection') && typeof App.animateOperation === 'function';
                    newItem.alpha = hasAnim ? 0 : 1;
                    App.redrawAll({ frame: false });
                    if (hasAnim) App.animateOperation(op, [id1, id2], newItem.id);
                }
            } else {
                App.previewVector(vecRes);
            }
        } catch (e) { App.showToast("Lỗi: " + e); }
    };

    App.previewVector = function (vec) {
        App.currentVector = vec.slice();
        if (App.mode === "2D" && window.Vec2D) {
            App.firstDrawForVector = false;
            Vec2D.draw2DAllVectors();
        } else if (window.Vec3D) {
            if (App._previewTemp) {
                Vec3D._scene.remove(App._previewTemp);
                App._previewTemp = null;
            }
            const v3 = toVec3(vec);
            const u = Math.max(1e-12, Vec3D.S3D.unitsPerWorld);
            const tipWorld = new THREE.Vector3(v3[0] * u, v3[1] * u, v3[2] * u);
            const grp = Vec3D.buildVectorGroup3D([tipWorld.x, tipWorld.y, tipWorld.z], "#bdbdbd");
            const proj = Vec3D.buildProjectionGroupZUp([tipWorld.x, tipWorld.y, tipWorld.z], "#555");
            const g = new THREE.Group();
            g.add(grp, proj);
            Vec3D._scene.add(g);
            App._previewTemp = g;
            Vec3D.hardRefresh3D(false);
        }
        if (App.coordOut && App.formatTip) {
            App.coordOut(App.formatTip(vec));
        }
    };

    /* =======================================================================
       PHẦN 4: UI UPDATE (CHECKLIST, DROPDOWN, SEARCH)
       ======================================================================= */

    App.refreshCalcVectorOptions = function () {
        const list = App.vectorList || [];

        // 1. Danh sách các ID của Select box cần cập nhật
        const selectIds = ["v1Select", "v2Select", "vCoordSelect", "vProjSelect", "vNormSelect", "v1DotSelect", "v2DotSelect", "v1AngleSelect", "v2AngleSelect"];

        selectIds.forEach(function (id) {
            const sel = document.getElementById(id);
            if (!sel) return;

            // Xử lý khi nhấn vào select box mà danh sách trống
            sel.onmousedown = function (e) {
                if (list.length === 0) {
                    e.preventDefault();
                    App.handleEmptyListAction();
                }
            };

            const oldVal = sel.value;
            sel.innerHTML = "";

            if (list.length === 0) {
                const opt = document.createElement("option");
                opt.text = "(Trống)";
                sel.appendChild(opt);
                sel.disabled = true;
            } else {
                sel.disabled = false;
                // Duyệt list và dùng index để hiển thị nhãn cho đồng bộ
                list.forEach(function (v, index) {
                    const opt = document.createElement("option");
                    opt.value = v.id; // Giá trị ngầm vẫn là ID thực để logic xử lý đúng

                    // Nhãn hiển thị dùng index + 1 (khớp với giao diện danh sách bên dưới)
                    const displayLabel = index + 1;
                    opt.textContent = `#${displayLabel} [${v.vec.join(", ")}]`;

                    sel.appendChild(opt);
                });

                // Giữ lại lựa chọn cũ nếu nó vẫn tồn tại trong danh sách mới
                if (oldVal && list.some(function (x) { return x.id == oldVal; })) {
                    sel.value = oldVal;
                }
            }
        });

        // 2. Cập nhật Checklist (Có Search)
        const checklistIds = ["indepChecklist", "rankChecklist", "basisChecklist", "basisCoordChecklist", "projBasisChecklist"];

        checklistIds.forEach(function (id) {
            const container = document.getElementById(id);
            if (!container) return;
            container.innerHTML = "";

            if (list.length === 0) {
                const emptyDiv = document.createElement("div");
                emptyDiv.className = "empty-list-msg";
                emptyDiv.innerHTML = "⚠️ Chưa có vector.<br>Nhấn để tạo ngay!";
                emptyDiv.onclick = function () { App.handleEmptyListAction(); };
                container.appendChild(emptyDiv);
                return;
            }

            const toolsDiv = document.createElement("div");
            toolsDiv.className = "checklist-tools";
            const searchInp = document.createElement("input");
            searchInp.type = "text";
            searchInp.placeholder = "🔍 Tìm vector...";
            searchInp.className = "vec-search-inp";

            const saRow = document.createElement("div");
            saRow.className = "select-all-row";
            const saLabel = document.createElement("span");
            saLabel.className = "select-all-text";
            saLabel.textContent = "Chọn tất cả";
            const saCb = document.createElement("input");
            saCb.type = "checkbox";
            saCb.className = "select-all-cb";

            saRow.appendChild(saLabel);
            saRow.appendChild(saCb);

            toolsDiv.appendChild(searchInp);
            toolsDiv.appendChild(saRow);
            container.appendChild(toolsDiv);

            const listDiv = document.createElement("div");
            listDiv.className = "vec-list-scroll";
            const checkboxes = [];

            list.forEach(function (v) {
                const row = document.createElement("div");
                row.className = "vec-item-row";

                const span = document.createElement("span");
                span.className = "vec-label-text";
                span.textContent = `${v.name || "#" + v.id} [${v.vec.join(", ")}]`;
                span.title = span.textContent;

                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.value = v.id;
                cb.className = "vec-checkbox";
                cb.setAttribute("data-id", v.id);

                row.addEventListener("click", function (e) {
                    if (e.target !== cb) {
                        cb.checked = !cb.checked;
                        cb.dispatchEvent(new Event('change'));
                    }
                });

                row.appendChild(span);
                row.appendChild(cb);
                listDiv.appendChild(row);
                checkboxes.push({ row: row, cb: cb, text: span.textContent.toLowerCase() });
            });
            container.appendChild(listDiv);

            searchInp.addEventListener("input", function () {
                const term = searchInp.value.toLowerCase().replace(/\s+/g, '');
                checkboxes.forEach(function (i) {
                    const cleanText = i.text.replace(/\s+/g, '');
                    i.row.style.display = cleanText.includes(term) ? "flex" : "none";
                });
            });

            saCb.addEventListener("change", function () {
                checkboxes.forEach(function (i) {
                    if (i.row.style.display !== "none") i.cb.checked = saCb.checked;
                });
            });
        });
    };

    /* =======================================================================
       PHẦN 5: LOGIC GỌI API MENU 1 (EXTRA UTILS)
       ======================================================================= */

    App.refreshExtraUI = function () {
        const el = document.getElementById("opExtraSelect");
        if (!el) return;
        const val = el.value;
        document.querySelectorAll(".extra-form").forEach(function (f) { f.style.display = "none"; });
        const active = document.getElementById("form-" + val);
        if (active) active.style.display = "block";
    };

    App.getCheckedVectors = function (container) {
        const arr = [];
        if (!container) return arr;
        container.querySelectorAll('input[type="checkbox"]:checked').forEach(function (cb) {
            const id = Number(cb.value);
            const it = App.vectorList.find(function (v) { return v.id === id; });
            if (it) arr.push(it.vec.slice());
        });
        return arr;
    };

    App.selectIdToVector = function (selectEl) {
        if (!selectEl) return null;
        const id = Number(selectEl.value);
        const item = App.vectorList.find(function (v) { return v.id === id; });
        return item ? item.vec : null;
    };

    App.rankVectorsUI = async function () {
        const container = document.getElementById("rankChecklist");
        if (App.handleEmptyListAction()) return;
        const vectors = App.getCheckedVectors(container);
        if (!vectors.length) {
            App.showToast("⚠️ Hãy tick chọn ít nhất 1 vector!");
            return;
        }
        try {
            const res = await App.callAPI("rank", { vectors: vectors });
            document.getElementById("result_rank").innerText = `Hạng = ${res.rank}`;
        } catch (err) {
            document.getElementById("result_rank").innerText = "Lỗi: " + err.message;
            App.showToast(err.message);
        }
    };

    App.linearIndependenceUI = async function () {
        const container = document.getElementById("indepChecklist");
        if (App.handleEmptyListAction()) return;
        const vectors = App.getCheckedVectors(container);
        if (!vectors.length) {
            App.showToast("⚠️ Hãy tick chọn ít nhất 1 vector!");
            return;
        }

        try {
            const res = await App.callAPI("linear_independence", { vectors: vectors });
            const n = vectors.length;
            const r = res.rank;
            let statusText = (r === n) ? "Độc lập tuyến tính" : "Phụ thuộc tuyến tính";
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
            document.getElementById("result_coord").innerText = `${App.formatVectorShort ? App.formatVectorShort(v) : v} = ${text} (theo cơ sở)`;
        } catch (err) {
            document.getElementById("result_coord").innerText = "Lỗi: " + err.message;
            App.showToast(err.message);
        }
    };

    // --- INIT ---
    window.addEventListener("load", () => {
        // Các nút cơ bản cũ
        if (document.getElementById("btnAddVector")) document.getElementById("btnAddVector").onclick = App.onAddVector;
        if (document.getElementById("btnIndep")) document.getElementById("btnIndep").onclick = App.linearIndependenceUI;
        if (document.getElementById("btnRank")) document.getElementById("btnRank").onclick = App.rankVectorsUI;
        if (document.getElementById("btnCoord")) document.getElementById("btnCoord").onclick = App.coordinatesUI;

        // --- [MỚI] XỬ LÝ MENU CÀI ĐẶT (BÁNH RĂNG) ---
        const btnSettings = document.getElementById('btnSettings');
        const dropdown = document.getElementById('settingsDropdown');

        // 1. Bật/Tắt Menu
        if (btnSettings && dropdown) {
            btnSettings.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('show'); // Ông nhớ thêm CSS .show { display: block; }
            });
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target) && e.target !== btnSettings) {
                    dropdown.classList.remove('show');
                }
            });
        }

        // 2. Toggle Animation (id="animToggle" trong HTML cài đặt)
        const animToggle = document.getElementById('animToggle');
        if (animToggle) {
            animToggle.checked = App.useAnimation; // Đồng bộ trạng thái đầu
            animToggle.addEventListener('change', () => {
                App.useAnimation = animToggle.checked;

            });
        }

        // 3. Toggle Theme (id="themeToggle" trong HTML cài đặt)
        // Thay thế hoàn toàn nút Theme cũ
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.checked = (App.theme === 'dark');
            themeToggle.addEventListener('change', () => {
                App.toggleTheme();
            });
        }
    });

})();