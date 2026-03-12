// File: js/app/ui/tour_calculation.js

/* =========================================================
   1. HỆ THỐNG GIẢ LẬP HÀNH VI CON NGƯỜI (AUTO-PILOT)
   ========================================================= */
let tourTimeouts = [];

function clearTourTimeouts() {
    tourTimeouts.forEach(clearTimeout);
    tourTimeouts = [];
}

function tourSetTimeout(fn, delay) {
    const id = setTimeout(fn, delay);
    tourTimeouts.push(id);
    return id;
}

// [MỚI]: Khóa nút Tiếp tục để user không bấm phá kịch bản
function lockTour(msg = 'Đang thao tác...') {
    const nextBtn = document.querySelector('.driver-popover-next-btn');
    if (nextBtn) {
        if (!nextBtn.dataset.originalText) {
            nextBtn.dataset.originalText = nextBtn.innerText;
        }
        nextBtn.innerText = msg;
        nextBtn.style.pointerEvents = 'none';
        nextBtn.style.opacity = '0.4';
        nextBtn.style.cursor = 'not-allowed';
    }
}

// [MỚI]: Mở khóa nút Tiếp tục khi diễn xong
function unlockTour() {
    const nextBtn = document.querySelector('.driver-popover-next-btn');
    if (nextBtn) {
        nextBtn.innerText = nextBtn.dataset.originalText || 'Tiếp tục →';
        nextBtn.style.pointerEvents = 'auto';
        nextBtn.style.opacity = '1';
        nextBtn.style.cursor = 'pointer';
    }
}
// Hàm tính toán Bounding Box chính xác ôm sát vector
function toggleGraphHighlight(isActive, vectors = []) {
    let flashlight = document.getElementById('tour-graph-flashlight');
    if (!flashlight) {
        flashlight = document.createElement('div');
        flashlight.id = 'tour-graph-flashlight';
        document.body.appendChild(flashlight);
    }

    if (!isActive) {
        flashlight.classList.remove('active');
        return;
    }

    try {
        if (vectors.length > 0 && window.App.mode === '3D' && window.Vec3D && Vec3D._camera) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            const points = [[0, 0, 0], ...vectors];

            const canvasRect = Vec3D._renderer.domElement.getBoundingClientRect();
            const u = Vec3D.S3D ? Math.max(1e-12, Vec3D.S3D.unitsPerWorld) : 1;

            points.forEach(v => {
                const vec3 = new THREE.Vector3(v[0] || 0, v[1] || 0, v[2] || 0).multiplyScalar(u);
                vec3.project(Vec3D._camera);
                const px = (vec3.x * 0.5 + 0.5) * canvasRect.width + canvasRect.left;
                const py = (-(vec3.y * 0.5) + 0.5) * canvasRect.height + canvasRect.top;

                minX = Math.min(minX, px); maxX = Math.max(maxX, px);
                minY = Math.min(minY, py); maxY = Math.max(maxY, py);
            });

            // [ĐÃ SỬA] Bóp đệm nhỏ lại cho vừa khít 2 vector
            const padding = 20;
            flashlight.style.left = (minX - padding) + 'px';
            flashlight.style.top = (minY - padding) + 'px';
            flashlight.style.width = (maxX - minX + padding * 2) + 'px';
            flashlight.style.height = (maxY - minY + padding * 2) + 'px';
            flashlight.style.transform = 'none';
        } else {
            flashlight.style.top = '10%'; flashlight.style.left = '10%';
            flashlight.style.width = '80%'; flashlight.style.height = '40vh';
        }
    } catch (e) { console.warn("Lỗi tính toán khung sáng:", e); }

    flashlight.classList.add('active');
}

function getFakeCursor() {
    let cursor = document.getElementById('tour-fake-cursor');
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.id = 'tour-fake-cursor';
        cursor.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 3.21V20.8C5.5 21.46 6.25 21.84 6.78 21.44L11.44 17.96C11.66 17.8 11.93 17.71 12.21 17.71H19.5C20.18 17.71 20.55 16.92 20.12 16.42L5.5 3.21Z" fill="#111" stroke="white" stroke-width="2"/></svg>`;

        cursor.style.position = 'fixed';
        cursor.style.zIndex = '999999999';
        cursor.style.transition = 'top 0.8s ease-in-out, left 0.8s ease-in-out, transform 0.2s';
        cursor.style.pointerEvents = 'none';
        cursor.style.opacity = '0';
        cursor.style.top = '80%';
        cursor.style.left = '80%';
        cursor.style.transformOrigin = 'top left';
        cursor.style.filter = 'drop-shadow(0px 4px 6px rgba(0,0,0,0.4))';
        document.body.appendChild(cursor);
    }
    return cursor;
}

function moveCursorTo(target, callback) {
    const cursor = getFakeCursor();
    let el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    cursor.style.opacity = '1';
    cursor.style.top = (rect.top + rect.height / 2) + 'px';
    cursor.style.left = (rect.left + rect.width / 2) + 'px';

    if (callback) tourSetTimeout(callback, 850);
}

function clickCursor(targetElement, callback) {
    const cursor = getFakeCursor();
    cursor.style.transform = 'scale(0.8)';
    tourSetTimeout(() => {
        cursor.style.transform = 'scale(1)';
        if (targetElement) targetElement.click();
        if (callback) tourSetTimeout(callback, 300);
    }, 150);
}

// [TUYỆT CHIÊU MỚI]: Giả lập gõ phím y hệt người thật bằng Core của MathLive
function simulateHumanTyping(mf, text, callback) {
    if (!mf) return callback && callback();

    mf.focus();
    mf.executeCommand('deleteAll'); // Xóa sạch bảng

    let i = 0;
    const typeNext = () => {
        if (i < text.length) {
            // Lệnh insert của MathLive tự động format chuẩn xác nhất, không sinh rác
            mf.executeCommand(['insert', text[i]]);
            mf.dispatchEvent(new Event('input', { bubbles: true }));
            i++;
            tourSetTimeout(typeNext, 200); // Tốc độ gõ 200ms/phím
        } else {
            mf.dispatchEvent(new Event('change', { bubbles: true }));
            if (callback) tourSetTimeout(callback, 200);
        }
    };
    tourSetTimeout(typeNext, 200);
}

// Hàm gõ nhanh dùng cho việc Đồng bộ (Lùi bước)
function quickSyncMathLive(mf, text) {
    if (!mf || !text) return;
    mf.executeCommand('deleteAll');
    mf.executeCommand(['insert', text]);
    mf.dispatchEvent(new Event('input', { bubbles: true }));
    mf.dispatchEvent(new Event('change', { bubbles: true }));
}

/* =========================================================
   [MỚI] HỆ THỐNG CACHE TRẠNG THÁI (TRƯỚC TOUR & TỪNG BƯỚC)
   ========================================================= */
let isTourRunning = false;
let userPreTourState = { input: '', vectors: [] };

function backupUserState() {
    const mf = document.getElementById('vectorInput');
    userPreTourState.input = mf ? mf.value : '';
    userPreTourState.vectors = [];
    const list = document.getElementById('vectorList');
    if (list) {
        const items = list.querySelectorAll('math-field, input[type="text"]');
        items.forEach(item => {
            if (item.id !== 'vectorInput' && item.value) userPreTourState.vectors.push(item.value);
        });
    }
}

function restoreUserState() {
    const btnClear = document.getElementById('btnClearAll');
    if (btnClear) btnClear.click();
    const mf = document.getElementById('vectorInput');
    const btnDraw = document.getElementById('btnDraw');
    if (mf && btnDraw) {
        userPreTourState.vectors.forEach(vec => {
            mf.value = vec;
            mf.dispatchEvent(new Event('input', { bubbles: true }));
            btnDraw.click();
        });
        mf.value = userPreTourState.input;
        mf.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

const stepStates = {
    'step-nhap-1': { v: [], i: '' },
    'step-menu': { v: [], i: '[1, 3]' },
    'step-add-1': { v: [], i: '[1, 3]' },
    'step-auto': { v: ['[1, 3]'], i: '[1, 3]' },
    'step-nhap-2': { v: ['[1, 3]'], i: '[1, 3]' },
    'step-add-2': { v: ['[1, 3]'], i: '[1, 2, 3]' },
    'step-search': { v: ['[1, 3]', '[1, 2, 3]'], i: '[1, 2, 3]' },
    'step-focus': { v: ['[1, 3]', '[1, 2, 3]'], i: '[1, 2, 3]' },
    'step-toggle': { v: ['[1, 3]', '[1, 2, 3]'], i: '[1, 2, 3]' },
    'step-delete': { v: ['[1, 3]', '[1, 2, 3]'], i: '[1, 2, 3]' },
    'step-clear': { v: ['[1, 2, 3]'], i: '[1, 2, 3]' }
};

function syncStepState(stepId) {
    const state = stepStates[stepId];
    if (!state) return;
    const btnClear = document.getElementById('btnClearAll');
    if (btnClear) btnClear.click();
    const mf = document.getElementById('vectorInput');
    const btnDraw = document.getElementById('btnDraw');
    if (mf && btnDraw) {
        state.v.forEach(vec => {
            quickSyncMathLive(mf, vec);
            btnDraw.click();
        });
        quickSyncMathLive(mf, state.i);
    }
}

/* =========================================================
   THUẬT TOÁN CUỘN ĐỘNG (CHỈ CUỘN KHI BỊ CHE KHUẤT)
   ========================================================= */
function smartScrollTo(targetSelector) {
    const targetEl = typeof targetSelector === 'string' ? document.querySelector(targetSelector) : targetSelector;
    const container = document.getElementById('controls');
    const tabs = document.querySelector('.sidebar-tabs');

    if (!container || !targetEl) return;

    // Lấy tọa độ trên màn hình thực tế
    const tRect = targetEl.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    const tabsRect = tabs ? tabs.getBoundingClientRect() : { bottom: cRect.top };

    // XÁC ĐỊNH VÙNG NHÌN THẤY AN TOÀN (Giữa Menu và Đáy)
    const safeTop = tabsRect.bottom;
    const safeBottom = cRect.bottom;

    // NẾU ĐÃ NHÌN THẤY TRỌN VẸN -> TỪ CHỐI CUỘN! MÀN HÌNH SẼ ĐỨNG IM!
    if (tRect.top >= safeTop && tRect.bottom <= safeBottom) {
        return;
    }

    // NẾU BỊ CHE (Hoặc mép trên đụng trần, hoặc mép dưới lố đáy) -> TÍNH TOÁN CUỘN
    let offsetTop = 0;
    let el = targetEl;
    while (el && el !== container && container.contains(el)) {
        offsetTop += el.offsetTop;
        el = el.offsetParent;
    }

    // Ép đối tượng nằm ngay ngắn dưới thanh Tab (cách 10px cho thoáng)
    const targetScrollPos = offsetTop - (tabs ? tabs.offsetHeight : 0) - 10;

    // Cuộn tức thời để Tour Guide vẽ khung không bị lệch
    container.scrollTo({ top: targetScrollPos, behavior: 'instant' });

    // Ép trình duyệt ghi nhận giao diện mới ngay lập tức
    void container.offsetHeight;
}

/* =========================================================
   KỊCH BẢN ĐẠO DIỄN
   ========================================================= */
const khoiTaoVectorSteps = [
    {
        id: 'step-nhap-1', // ID mới
        element: '#vectorInput',
        popover: { title: 'Khu vực nhập liệu', description: 'Trong Vectoria, tọa độ của vector là mảng một chiều chứa các giá trị tọa độ... Ví dụ ta có vector <b>[1, 3]</b>.', side: 'bottom' },
        onHighlighted: () => {
            if (!isTourRunning) { backupUserState(); isTourRunning = true; }
            syncStepState('step-nhap-1'); // GỌI BẰNG ID
            clearTourTimeouts(); lockTour('Đang nhập liệu...'); toggleGraphHighlight(false);
            forceScrollToTop();
            tourSetTimeout(() => {
                moveCursorTo('#vectorInput', () => {
                    clickCursor(null, () => {
                        const mf = document.getElementById('vectorInput'); simulateHumanTyping(mf, '[1, 3]', unlockTour);
                    });
                });
            }, 50);
        }
    },
    {
        id: 'step-menu', // Gắn ID 
        element: '#myMenuBtn',
        popover: { title: 'Danh sách các lệnh', description: 'Đây là danh sách chứa các lệnh để chèn hàm vào trong khu vực nhập liệu gồm dấu khai căn, logarit, lũy thừa,...', side: 'bottom' },
        onHighlighted: () => {
            syncStepState('step-menu');
            clearTourTimeouts(); lockTour('Đang di chuyển...'); forceScrollToTop();
            tourSetTimeout(() => moveCursorTo('#myMenuBtn', unlockTour), 50);
        }
    },
    {
        id: 'step-add-1',
        element: '#btnDraw',
        popover: { title: 'Khởi tạo Vector', description: 'Sau khi nhập tọa độ xong, bấm nút <b>Thêm vector</b> để tạo vector trên đồ thị.', side: 'right' },
        onHighlighted: () => {
            syncStepState('step-add-1');
            clearTourTimeouts(); lockTour('Đang click...'); forceScrollToTop();
            tourSetTimeout(() => moveCursorTo('#btnDraw', () => clickCursor(document.getElementById('btnDraw'), unlockTour)), 50);
        }
    },
    {
        id: 'step-auto',
        element: '#btnAuto',
        popover: { title: 'Chuyển chiều không gian tự động', description: 'Tính năng này mặc định <b>BẬT</b>...', side: 'right' },
        onHighlighted: () => {
            syncStepState('step-auto');
            clearTourTimeouts(); lockTour('Đang di chuyển...'); forceScrollToTop();
            tourSetTimeout(() => moveCursorTo('#btnAuto', unlockTour), 50);
        }
    },
    {
        id: 'step-nhap-2',
        element: '#vectorInput',
        popover: { title: 'Thử nghiệm [1]', description: 'Ta nhập tiếp một vector 3 chiều: <b>[1, 2, 3]</b>.', side: 'bottom' },
        onHighlighted: () => {
            syncStepState('step-nhap-2');
            clearTourTimeouts(); lockTour('Đang nhập liệu...'); forceScrollToTop();
            tourSetTimeout(() => {
                moveCursorTo('#vectorInput', () => {
                    clickCursor(null, () => {
                        const mf = document.getElementById('vectorInput'); simulateHumanTyping(mf, '[1, 2, 3]', unlockTour);
                    });
                });
            }, 50);
        }
    },
    {
        id: 'step-add-2',
        element: '#btnDraw',
        popover: { title: 'Thử nghiệm [2]', description: 'Kết quả là đồ thị tự đồng bộ...', side: 'right' },
        onHighlighted: () => {
            syncStepState('step-add-2');
            clearTourTimeouts(); lockTour('Đang click...'); forceScrollToTop();
            tourSetTimeout(() => moveCursorTo('#btnDraw', () => clickCursor(document.getElementById('btnDraw'), unlockTour)), 50);
        }
    },
    {
        id: 'step-search',
        element: '#mainVecSearch',
        popover: { title: 'Khu vực tìm kiếm vector', description: 'Khi có hàng tá vector trong danh sách, để tìm nhanh một vector...', side: 'top' },
        onHighlighted: () => {
            syncStepState('step-search');
            clearTourTimeouts(); lockTour('Đang di chuyển...'); toggleGraphHighlight(false);

            smartScrollTo('#mainVecSearch');
            tourSetTimeout(() => moveCursorTo('#mainVecSearch', unlockTour), 50);
        }
    },
    {
        id: 'step-focus',
        element: '.vec-item:nth-child(1) .vec-actions button:nth-child(1)',
        popover: { title: 'Nút "Chú ý"', description: 'Nút <b>Chú ý</b> giúp vector [1, 3] được nổi bật...', side: 'top' },
        onHighlighted: () => {
            syncStepState('step-focus');
            clearTourTimeouts(); lockTour('Đang thao tác...'); toggleGraphHighlight(false);

            const targetBtn = document.querySelector('.vec-item:nth-child(1) .vec-actions button:nth-child(1)');
            if (targetBtn) {
                smartScrollTo('.vec-item:nth-child(1)');
                tourSetTimeout(() => {
                    toggleGraphHighlight(true, [[1, 3], [1, 2, 3]]);
                    moveCursorTo(targetBtn, () => clickCursor(targetBtn, () => {
                        tourSetTimeout(() => clickCursor(targetBtn, unlockTour), 1500);
                    }));
                }, 50);
            } else unlockTour();
        }
    },
    {
        id: 'step-toggle',
        element: '.vec-item:nth-child(1) .vec-actions button:nth-child(2)',
        popover: { title: 'Nút "Ẩn/Hiện"', description: 'Nút <b>Ẩn</b> làm ẩn vector được chỉ định...', side: 'top' },
        onHighlighted: () => {
            syncStepState('step-toggle');
            clearTourTimeouts(); lockTour('Đang thao tác...');

            const targetBtn = document.querySelector('.vec-item:nth-child(1) .vec-actions button:nth-child(2)');
            if (targetBtn) {
                smartScrollTo('.vec-item:nth-child(1)');
                tourSetTimeout(() => {
                    toggleGraphHighlight(true, [[1, 3], [1, 2, 3]]);
                    moveCursorTo(targetBtn, () => clickCursor(targetBtn, () => {
                        tourSetTimeout(() => clickCursor(targetBtn, unlockTour), 1500);
                    }));
                }, 50);
            } else unlockTour();
        }
    },
    {
        id: 'step-delete',
        element: '.vec-item:nth-child(1) .vec-actions button:nth-child(3)',
        popover: { title: 'Nút "Xóa"', description: 'Nút <b>Xóa</b> sẽ loại bỏ hoàn toàn vector...', side: 'top' },
        onHighlighted: () => {
            syncStepState('step-delete');
            clearTourTimeouts(); lockTour('Đang thao tác...');

            const targetBtn = document.querySelector('.vec-item:nth-child(1) .vec-actions button:nth-child(3)');
            if (targetBtn) {
                smartScrollTo('.vec-item:nth-child(1)');
                tourSetTimeout(() => {
                    toggleGraphHighlight(true, [[1, 3], [1, 2, 3]]);
                    moveCursorTo(targetBtn, () => clickCursor(targetBtn, unlockTour));
                }, 50);
            } else unlockTour();
        }
    },
    {
        id: 'step-clear',
        element: '#btnClearAll',
        popover: { title: 'Nút "Xóa hết vector"', description: 'Loại bỏ hết các vector có trong danh sách và đồ thị', side: 'right' },
        onHighlighted: () => {
            syncStepState('step-clear');
            clearTourTimeouts(); lockTour('Đang dọn dẹp...'); toggleGraphHighlight(false);

            smartScrollTo('#btnClearAll');
            tourSetTimeout(() => moveCursorTo('#btnClearAll', () => clickCursor(document.getElementById('btnClearAll'), unlockTour)), 50);
        }
    }
];

function cleanupTour() {
    clearTourTimeouts();
    toggleGraphHighlight(false);
    const cursor = document.getElementById('tour-fake-cursor');
    if (cursor) cursor.style.opacity = '0';
    restoreUserState();
    isTourRunning = false;
}

let finalSteps = khoiTaoVectorSteps;

// Xóa mảng qua ID thay vì tham chiếu (An toàn 100%)
if (window.innerWidth <= 768) {
    finalSteps = khoiTaoVectorSteps.filter(step => step.id !== 'step-menu');
}

setupGuidedTour('btn-tour-khoitao', finalSteps, cleanupTour);