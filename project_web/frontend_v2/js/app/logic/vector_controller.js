// ===================== js/app/logic/vector_controller.js (FINAL DETAILED VERSION) =====================
(function () {
    window.App = window.App || {};
    App._pickUniqueHue = function () {
        // Thuật toán Góc Vàng: Màu rải đều, không bao giờ trùng, siêu nhanh
        const i = App.vectorList ? App.vectorList.length : 0;
        return (i * 137.508) % 360;
    };
    App.useAnimation = true;
    App.formatVectorShort = function (vec) {
        if (!Array.isArray(vec)) return "[]";

        const clean = (x) => {
            let n = Number(x);
            // Nếu sai số < 0.0001 thì ép về số nguyên luôn (3.00000012 -> 3)
            if (Math.abs(n - Math.round(n)) < 1e-4) return Math.round(n);
            return n;
        };

        return "[" + vec.map(x => {
            let v = clean(x);
            // Nếu có hàm formatScalar xịn thì dùng, không thì dùng string
            return (typeof App.formatScalar === 'function' ? App.formatScalar(v) : String(v));
        }).join(", ") + "]";
    };
    // Biến đếm ID toàn cục (Reset được)
    let nextVectorId = 1;
    function smartFormat(num) {
        const val = Number(num);
        if (isNaN(val)) return "0";
        if (Math.abs(val) < 1e-9) return "0"; // Xử lý số 0

        const absVal = Math.abs(val);
        const sign = val < 0 ? "-" : "";

        // 1. Số nguyên (Nới lỏng sai số lên 1e-4 để bắt được cả số đã bị làm tròn)
        if (Math.abs(val - Math.round(val)) < 1e-4) return String(Math.round(val));

        // 2. Phân số
        for (let d = 2; d <= 50; d++) {
            let n = val * d;
            if (Math.abs(n - Math.round(n)) < 1e-4) {
                return `\\frac{${Math.round(n)}}{${d}}`;
            }
        }

        // --- TRUY NGƯỢC CĂN THỨC (Nới lỏng sai số và tăng phạm vi) ---
        // Sai số cho phép: 0.0005 (để bắt được 1.4953 so với 1.49534...)
        const TOLERANCE = 5e-4; 

        // 3. Căn bậc 2: k * sqrt(n)
        for (let k = 1; k <= 10; k++) {
            const base = (absVal / k) ** 2;
            const roundBase = Math.round(base);
            if (Math.abs(base - roundBase) < TOLERANCE && roundBase < 1000) {
                const latexK = k === 1 ? "" : String(k);
                return `${sign}${latexK}\\sqrt{${roundBase}}`;
            }
        }

        // 4. Căn bậc 4: sqrt[4](n) (Ưu tiên kiểm tra trước căn bậc 3 vì dễ trùng)
        // Ví dụ: 1.4953 -> mũ 4 lên = 4.999... -> 5
        const pow4 = Math.pow(absVal, 4);
        if (Math.abs(pow4 - Math.round(pow4)) < TOLERANCE * 10) { // Nới lỏng hơn cho bậc cao
             return `${sign}\\sqrt[4]{${Math.round(pow4)}}`;
        }

        // 5. Căn bậc 3: k * cbrt(n)
        for (let k = 1; k <= 5; k++) {
            const base = (absVal / k) ** 3;
            const roundBase = Math.round(base);
            if (Math.abs(base - roundBase) < TOLERANCE && roundBase < 1000) {
                const latexK = k === 1 ? "" : String(k);
                return `${sign}${latexK}\\sqrt[3]{${roundBase}}`;
            }
        }

        // 6. Số Pi (k*pi)
        const divPi = absVal / Math.PI;
        if (Math.abs(divPi - Math.round(divPi)) < TOLERANCE) {
            const k = Math.round(divPi);
            return (k === 1 ? "" : String(k)) + "\\pi";
        }

        // 7. Chịu thua -> In số thập phân
        return Number(val).toFixed(4).replace(/\.?0+$/, "");
    }
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

    

    // Helper tạo Object Vector mới
    App._attachVectorItem = function (vec, hue) {
        const lightness = (nextVectorId % 2 === 0) ? 50 : 65;
        return {
            id: nextVectorId++, // ID tăng dần
            vec: vec,
            colorHex: (typeof App.hslToHex === 'function')
                ? App.hslToHex((hue % 360) / 360, 0.85, 0.6)
                : `hsl(${hue}, 85%, 60%)`,
            colorCss: `hsl(${hue}, 85%, ${lightness}%)`,
            haloCss: `hsl(${hue}, 85%, ${lightness + 20}%)`,
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
            if (!Array.isArray(v) || v.length < 2) throw new Error("Vector phải có ít nhất 2 toạ độ");
        } catch (err) { App.showToast("Lỗi nhập liệu: " + err.message); return; }

        App.currentVector = v.slice();
        App.firstDrawForVector = true;
        const hue = App._pickUniqueHue ? App._pickUniqueHue() : (Math.random() * 360);
        const item = App._attachVectorItem(v, hue);

        // --- [ĐOẠN LOGIC QUAN TRỌNG ĐÃ SỬA] ---
        // Kiểm tra xem có hàm cần tính toán (sin, log...) không?
        const needsCalc = /(sin|cos|tan|cot|log|ln|pi|e\^|e\s|e$)/i.test(raw);

        if (needsCalc) {
            // Tính ra số -> Rồi ép ngược về phân số đẹp (VD: 0.5 -> 1/2)
            const latexArr = v.map(val => smartFormat(val));
            item.latex = `[${latexArr.join(", ")}]`;
        } else {
            // Nếu là căn, phân số hoặc số thường -> Giữ nguyên
            item.latex = raw;
        }
        // ---------------------------------------

        App.vectorList.push(item);

        if (App.renderVectorList) App.renderVectorList();
        if (App.refreshCalcVectorOptions) App.refreshCalcVectorOptions();
        if (App.renderExtraCalcOptions) App.renderExtraCalcOptions();

        if (App.autoMode) {
            App.mode = (v.length >= 3) ? "3D" : "2D";
            const mb = document.getElementById("modeBadge");
            if (mb) mb.textContent = `Mode: ${App.mode}`;
        }
        if (App.redrawAll) App.redrawAll({ frame: false });
        if (App.mode === "3D" && window.Vec3D) Vec3D.hardRefresh3D(false);
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

            // 2. Xử lý kết quả Vector (Đã fix hiển thị MathLive + Fix lỗi 2 viền)
            const rawRes = data.result !== undefined ? data.result : data.result_vec;
            
            // Hàm làm tròn số
            const fmtVal = (n) => {
                let x = Number(n);
                if (isNaN(x)) return "0";
                if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
                return String(parseFloat(x.toFixed(4))); 
            };

            // Tạo chuỗi Latex: Vector (x, y) hoặc số
            let latex = "";
            if (Array.isArray(rawRes)) {
                latex = `\\left( ${rawRes.map(fmtVal).join(",\\; ")} \\right)`;
            } else {
                latex = fmtVal(rawRes);
            }

            // [FIX QUAN TRỌNG] Reset sạch style thẻ cha để không bị 2 viền chồng nhau
            calcSteps.className = ""; 
            calcSteps.style.padding = "0";
            calcSteps.style.border = "none";
            calcSteps.style.background = "transparent";

            // Gán HTML khung xanh mới
            calcSteps.innerHTML = `
                <div class="calc-result-box">
                    <div class="calc-result-label">
                        Kết quả:
                    </div>
                    
                    <math-field read-only class="calc-result-math">
                        ${latex}
                    </math-field>
                </div>
            `;
            if (addToList) {
                // [FIX LỖI] Định nghĩa vecRes lấy từ kết quả rawRes ở trên
                const vecRes = Array.isArray(rawRes) ? rawRes : [rawRes];

                const hue = App._pickUniqueHue ? App._pickUniqueHue() : 0;

                // Giờ vecRes đã có giá trị, không bị lỗi nữa
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
            App.showToast("Hãy tick chọn ít nhất 1 vector!");
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
            App.showToast("Hãy tick chọn ít nhất 1 vector!");
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

            // [FIX QUAN TRỌNG]: Ưu tiên lấy chuỗi đẹp từ Backend (pretty_coordinates)
            // Nếu backend chưa gửi pretty thì mới dùng bản thô (coordinates)
            const displayCoords = res.pretty_coordinates || res.coordinates;

            if (!displayCoords) throw new Error("Không tìm thấy tọa độ.");

            // Vì displayCoords đã là chuỗi đẹp ("4/3", "1") nên chỉ cần join lại
            const text = `[${displayCoords.join(", ")}]`;

            document.getElementById("result_coord").innerText = `${App.formatVectorShort ? App.formatVectorShort(v) : v} = ${text} (theo cơ sở)`;
        } catch (err) {
            document.getElementById("result_coord").innerText = "Lỗi: " + err.message;
            App.showToast(err.message);
        }
    };

    // --- INIT ---
    // --- INIT ---
    window.addEventListener("load", () => {
        // [FIX LỆCH PHA] 1. Đồng bộ trạng thái App.theme từ LocalStorage ngay lập tức
        const savedTheme = localStorage.getItem('vec_theme');
        if (savedTheme === 'dark') {
            App.theme = 'dark';
        } else {
            App.theme = 'light';
        }
        
        // 2. Đồng bộ giao diện (Icon & Màu sắc) theo App.theme vừa lấy
        App.applyTheme(); 

        // Các nút cơ bản cũ
        if (document.getElementById("btnAddVector")) document.getElementById("btnAddVector").onclick = App.onAddVector;
        if (document.getElementById("btnIndep")) document.getElementById("btnIndep").onclick = App.linearIndependenceUI;
        if (document.getElementById("btnRank")) document.getElementById("btnRank").onclick = App.rankVectorsUI;
        //if (document.getElementById("btnCoord")) document.getElementById("btnCoord").onclick = App.coordinatesUI;

        // --- XỬ LÝ MENU CÀI ĐẶT (BÁNH RĂNG) ---
        const btnSettings = document.getElementById('btnSettings');
        const dropdown = document.getElementById('settingsDropdown');

        // 1. Bật/Tắt Menu
        if (btnSettings && dropdown) {
            btnSettings.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('show'); 
            });
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target) && e.target !== btnSettings) {
                    dropdown.classList.remove('show');
                }
            });
        }

        // 2. Toggle Animation 
        const animToggle = document.getElementById('animToggle');
        if (animToggle) {
            animToggle.checked = App.useAnimation; 
            animToggle.addEventListener('change', () => {
                App.useAnimation = animToggle.checked;
            });
        }

        // 3. Toggle Theme (Đã fix đồng bộ)
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            // [QUAN TRỌNG] Set trạng thái nút gạt theo App.theme đã đồng bộ ở trên
            themeToggle.checked = (App.theme === 'dark');
            
            // Xử lý sự kiện khi bấm
            themeToggle.addEventListener('change', () => {
                App.toggleTheme();
            });
        }

        const opSel = document.getElementById("opSelect");
        if (opSel) {
            opSel.onchange = function () {
                const v1 = document.getElementById("v1Select");
                const v2 = document.getElementById("v2Select");
                if (v1) v1.value = "";
                if (v2) v2.value = "";

                if (App.vectorList) {
                    App.vectorList.forEach(v => v.visible = false);
                }

                if (typeof App.renderVectorList === 'function') App.renderVectorList(); 
                if (typeof App.redrawAll === 'function') App.redrawAll({ frame: false }); 
                if (typeof App.refreshCalcUI === 'function') App.refreshCalcUI();
            };
        }
    });
    // =========================================================
    // PHẦN 3: LOGIC TƯƠNG TÁC HÌNH HỘP & GIZMO (ĐÃ FIX)
    // =========================================================

    let interactMode = false;
    let transformControl = null;
    let parallelepipedMesh = null;
    let interactVectors = []; // Lưu danh sách các object vector đang tham gia

    // 1. Khởi tạo hệ thống tương tác
    function initInteraction() {
        if (!window.App || !window.Vec3D || !Vec3D._scene) return;

        // Tạo Gizmo điều khiển
        transformControl = new THREE.TransformControls(Vec3D._camera, Vec3D._renderer.domElement);

        // Khi đang kéo -> Tắt xoay camera
        transformControl.addEventListener('dragging-changed', function (event) {
            if (Vec3D._controls) Vec3D._controls.enabled = !event.value;
        });

        // Khi kéo xong -> Cập nhật lại hình hộp & Số liệu
        transformControl.addEventListener('change', function () {
            if (interactMode) {
                syncVectorData();         // Cập nhật số liệu trong object
                updateParallelepipedMesh(); // Vẽ lại hộp

                // [QUAN TRỌNG] Cập nhật lại giao diện & render lại
                if (App.renderVectorList) App.renderVectorList();
                if (App.refreshCalcVectorOptions) App.refreshCalcVectorOptions(); // Để số trên checklist nhảy theo
                // Lưu ý: Không gọi redrawAll() ở đây vì sẽ làm mất Gizmo, ta chỉ cập nhật mũi tên thôi
            }
        });

        Vec3D._scene.add(transformControl);

        // Gắn sự kiện nút
        const btnInt = document.getElementById('btnInteract');
        if (btnInt) btnInt.addEventListener('click', toggleInteraction);
    }

    // 2. Bật/Tắt chế độ tương tác
    function toggleInteraction() {
        // Lấy danh sách ID đang được tick trong phần "Độc lập tuyến tính" (hoặc checklist nào ông muốn)
        // Giả sử dùng 'indepChecklist' làm chuẩn để chọn 3 vector tạo hộp
        const container = document.getElementById("indepChecklist");
        if (!container) return;

        const checkedBoxes = container.querySelectorAll('input[type="checkbox"]:checked');
        const selectedIds = Array.from(checkedBoxes).map(cb => Number(cb.value));

        if (!interactMode) {
            // --- BẮT ĐẦU ---
            if (selectedIds.length !== 3) {
                App.showToast("⚠️ Vui lòng tick chọn ĐÚNG 3 vector trong danh sách 'Kiểm tra ĐLTT' để tạo hộp!", "error");
                return;
            }

            interactMode = true;
            const btn = document.getElementById('btnInteract');
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-stop"></i> Dừng';
                btn.classList.add('active');
            }

            // Lấy object vector từ ID
            interactVectors = selectedIds.map(id => App.vectorList.find(v => v.id === id)).filter(x => x);

            // Vẽ hộp
            updateParallelepipedMesh();

            // Gắn Gizmo vào vector thứ 3 (vecto cuối cùng)
            attachGizmoToVector(interactVectors[2]);

        } else {
            // --- DỪNG ---
            interactMode = false;
            const btn = document.getElementById('btnInteract');
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-cube"></i> Tương tác Hộp';
                btn.classList.remove('active');
            }

            if (parallelepipedMesh) {
                Vec3D._scene.remove(parallelepipedMesh);
                parallelepipedMesh = null;
            }
            transformControl.detach();
            if (App.redrawAll) App.redrawAll({ frame: false }); // Vẽ lại sạch sẽ
        }
    }

    // 3. Vẽ hình hộp
    function updateParallelepipedMesh() {
        if (parallelepipedMesh) Vec3D._scene.remove(parallelepipedMesh);
        if (!interactMode || interactVectors.length < 3) return;

        // Chuyển mảng [x,y,z] thành THREE.Vector3
        // [FIX] Dùng v.vec thay vì v.components
        const v1 = new THREE.Vector3(...toVec3(interactVectors[0].vec));
        const v2 = new THREE.Vector3(...toVec3(interactVectors[1].vec));
        const v3 = new THREE.Vector3(...toVec3(interactVectors[2].vec));

        // Scale theo tỷ lệ khung nhìn (nếu có logic scale) - ở đây lấy thô
        const u = Vec3D.S3D ? Vec3D.S3D.unitsPerWorld : 1;
        v1.multiplyScalar(u); v2.multiplyScalar(u); v3.multiplyScalar(u);

        const O = new THREE.Vector3(0, 0, 0);
        const A = v1.clone(), B = v2.clone(), C = v3.clone();
        const D = v1.clone().add(v2);
        const E = v1.clone().add(v3);
        const F = v2.clone().add(v3);
        const G = v1.clone().add(v2).add(v3);

        // Thứ tự đỉnh để tạo các mặt tam giác (Counter-clockwise)
        const vertices = [
            O, B, D, O, D, A, // Đáy dưới (O-B-D-A)
            C, E, G, C, G, F, // Đáy trên (C-E-G-F)
            O, A, E, O, E, C, // Mặt bên trái
            B, F, G, B, G, D, // Mặt bên phải
            O, C, F, O, F, B, // Mặt sau
            A, D, G, A, G, E  // Mặt trước
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(vertices);
        geometry.computeVertexNormals();

        const material = new THREE.MeshPhongMaterial({
            color: 0x90ee90, transparent: true, opacity: 0.3,
            side: THREE.DoubleSide, shininess: 50, depthWrite: false
        });

        parallelepipedMesh = new THREE.Mesh(geometry, material);

        // Wireframe viền đen cho đẹp
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x27ae60 }));
        parallelepipedMesh.add(line);

        Vec3D._scene.add(parallelepipedMesh);
    }

    // 4. Đồng bộ dữ liệu: Gizmo -> Vector Object
    function syncVectorData() {
        const targetMesh = transformControl.object;
        if (!targetMesh) return;

        // Tìm xem Gizmo đang gắn vào vector nào
        // [FIX] So sánh qua thuộc tính tạm gizmoBall
        const targetVec = interactVectors.find(v => v.gizmoBall === targetMesh);

        if (targetVec) {
            // Tọa độ thế giới thực của Gizmo
            const newPos = targetMesh.position;

            // Chuyển về tọa độ toán học (chia cho tỉ lệ vẽ)
            const u = Vec3D.S3D ? Vec3D.S3D.unitsPerWorld : 1;
            const x = parseFloat((newPos.x / u).toFixed(2));
            const y = parseFloat((newPos.y / u).toFixed(2));
            const z = parseFloat((newPos.z / u).toFixed(2));

            // Cập nhật dữ liệu gốc
            targetVec.vec = [x, y, z];

            // Cập nhật hình ảnh 3D (Gọi trực tiếp hàm của Vec3D để nhanh)
            if (window.Vec3D) {
                // Xóa arrow cũ vẽ lại arrow mới (hoặc update nếu Vec3D hỗ trợ update)
                // Cách đơn giản nhất: Vẽ lại toàn bộ mũi tên
                Vec3D.draw3DAllVectors({ frame: false });
                // Lưu ý: redrawAll sẽ xóa scene, làm mất GizmoBall -> Cần cẩn thận.
                // Tốt nhất chỉ update Mesh nếu có thể. Nhưng để đơn giản, ta chấp nhận redraw 
                // nhưng phải add lại gizmoBall.

                // => CÁCH TỐT HƠN: Cập nhật object tham chiếu trong Scene (nếu ông lưu arrowMesh vào object vector)
                // Ở đây ta dùng cách đơn giản: Cập nhật text hiển thị thôi, hình vẽ chờ thả chuột mới update full.
            }
        }
    }

    // 5. Gắn Gizmo
    function attachGizmoToVector(vec) {
        if (!window.Vec3D) return;

        // Tạo 1 cục dummy tại đầu vector để gizmo bám vào
        if (vec.gizmoBall) Vec3D._scene.remove(vec.gizmoBall);

        const u = Vec3D.S3D ? Vec3D.S3D.unitsPerWorld : 1;
        const pos = new THREE.Vector3(vec.vec[0] * u, vec.vec[1] * u, (vec.vec[2] || 0) * u);

        const geo = new THREE.BoxGeometry(u * 0.5, u * 0.5, u * 0.5);
        const mat = new THREE.MeshBasicMaterial({ visible: false }); // Ẩn đi
        vec.gizmoBall = new THREE.Mesh(geo, mat);
        vec.gizmoBall.position.copy(pos);

        Vec3D._scene.add(vec.gizmoBall);
        transformControl.attach(vec.gizmoBall);
    }

    // Tự động init
    window.addEventListener('load', () => { setTimeout(initInteraction, 1500); });


    // --- [CHÈN VÀO CUỐI FILE] Hàm chỉ hiện vector đang được chọn ---
    App.updateVisibilityByCalc = function () {
        // 1. Lấy ID đang chọn trong ô v1, v2
        const v1Select = document.getElementById("v1Select");
        const v2Select = document.getElementById("v2Select");

        const id1 = v1Select ? Number(v1Select.value) : -1;
        const id2 = v2Select ? Number(v2Select.value) : -1;

        // 2. Kiểm tra xem có đang chọn gì không (ID > 0 là có chọn)
        let hasSelection = (id1 > 0 || id2 > 0);

        // 3. Duyệt danh sách vector để Bật/Tắt
        App.vectorList.forEach(item => {
            if (hasSelection) {
                // Nếu đang tính toán: Chỉ hiện thằng được chọn, thằng khác ẩn
                const isSelected = (item.id === id1 || item.id === id2);
                item.visible = isSelected;
            } else {
                // Nếu chưa chọn gì (mới vào hoặc reset): Hiện tất cả
                item.visible = true;
            }
        });

        // 4. Cập nhật giao diện
        if (typeof App.renderVectorList === 'function') App.renderVectorList();
        if (typeof App.redrawAll === 'function') App.redrawAll({ frame: false });
    };

    // --- [MỚI] HÀM QUẢN LÝ ẨN/HIỆN KHI TÍNH TOÁN ---
    App.updateVisibilityByCalc = function () {
        const v1Sel = document.getElementById("v1Select");
        const v2Sel = document.getElementById("v2Select");

        const id1 = v1Sel ? Number(v1Sel.value) : 0;
        const id2 = v2Sel ? Number(v2Sel.value) : 0;

        // Có đang chọn vector nào không?
        const hasSelection = (id1 > 0 || id2 > 0);

        App.vectorList.forEach(v => {
            if (!hasSelection) {
                // Nếu chưa chọn gì cả (hoặc mới reset) -> Hiện tất cả cho dễ nhìn
                v.visible = true;
            } else {
                // Nếu đã chọn -> Chỉ hiện những thằng được chọn
                v.visible = (v.id === id1 || v.id === id2);
            }
        });

        // Vẽ lại giao diện
        if (App.renderVectorList) App.renderVectorList();
        if (App.redrawAll) App.redrawAll({ frame: false });
    };
})();