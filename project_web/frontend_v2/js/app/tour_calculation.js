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
// Thay thế hàm toggleGraphHighlight cũ bằng hàm này
function toggleGraphHighlight(isActive) {
    let flashlight = document.getElementById('tour-graph-flashlight');
    
    // Nếu chưa có khung đèn pin thì tự động tạo ra
    if (!flashlight) {
        flashlight = document.createElement('div');
        flashlight.id = 'tour-graph-flashlight';
        document.body.appendChild(flashlight);
    }
    
    // Bật/tắt khung sáng
    if (isActive) {
        flashlight.classList.add('active');
    } else {
        flashlight.classList.remove('active');
    }
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

// [ĐÃ FIX]: Dùng Text thuần túy thay vì LaTeX để tránh mọi lỗi cú pháp khi Lùi bước
const stepStates = {
    1: { v: [], i: '' },
    2: { v: [], i: '[1, 3]' },
    3: { v: [], i: '[1, 3]' },
    4: { v: ['[1, 3]'], i: '[1, 3]' },
    5: { v: ['[1, 3]'], i: '[1, 3]' },
    6: { v: ['[1, 3]'], i: '[1, 2, 3]' },
    7: { v: ['[1, 3]', '[1, 2, 3]'], i: '[1, 2, 3]' },
    8: { v: ['[1, 3]', '[1, 2, 3]'], i: '[1, 2, 3]' },
    9: { v: ['[1, 3]', '[1, 2, 3]'], i: '[1, 2, 3]' },
    10: { v: ['[1, 3]', '[1, 2, 3]'], i: '[1, 2, 3]' },
    11: { v: ['[1, 2, 3]'], i: '[1, 2, 3]' } 
};

function syncStepState(stepNum) {
    const state = stepStates[stepNum];
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
   KỊCH BẢN ĐẠO DIỄN: ĐÃ TÍCH HỢP CHỐNG LỖI KHI ĐI LÙI
   ========================================================= */
const khoiTaoVectorSteps = [
    {
        element: '#vectorInput', 
        popover: { title: 'Khu vực nhập liệu', description: 'Trong Vectoria, tọa độ của vector là mảng một chiều chứa các giá trị tọa độ theo thứ tự tăng dần về chiều không gian. Ví dụ ta có vector <b>[1, 3]</b>, trong đó giá trị tọa độ của chiều thứ nhất là 1, giá trị tọa độ của chiều thứ hai là 3.', side: 'bottom' },
        onHighlighted: () => {
            if (!isTourRunning) { backupUserState(); isTourRunning = true; }
            syncStepState(1); 
            clearTourTimeouts();
            lockTour('Đang nhập liệu...'); 
            moveCursorTo('#vectorInput', () => {
                clickCursor(null, () => {
                    const mf = document.getElementById('vectorInput');
                    // Giao toàn bộ việc diễn mổ cò cho MathLive lo
                    simulateHumanTyping(mf, '[1, 3]', unlockTour);
                });
            });
        }
    },
    {
        element: '#myMenuBtn', 
        popover: { title: 'Danh sách các lệnh', description: 'Đây là danh sách chứa các lệnh để chèn hàm vào trong khu vực nhập liệu gồm dấu khai căn, logarit, lũy thừa,...', side: 'bottom' },
        onHighlighted: () => {
            syncStepState(2);
            clearTourTimeouts();
            lockTour('Đang di chuyển...');
            moveCursorTo('#myMenuBtn', unlockTour);
        }
    },
    {
        element: '#btnDraw', 
        popover: { title: 'Khởi tạo Vector', description: 'Sau khi nhập tọa độ xong, bấm nút <b>Thêm vector</b> để tạo vector trên đồ thị.', side: 'right' },
        onHighlighted: () => {
            syncStepState(3);
            clearTourTimeouts();
            lockTour('Đang click...');
            moveCursorTo('#btnDraw', () => clickCursor(document.getElementById('btnDraw'), unlockTour));
        }
    },
    {
        element: '#btnAuto', 
        popover: { title: 'Chuyển chiều không gian tự động', description: 'Tính năng này mặc định <b>BẬT</b>. Tác dụng của nó là đồng bộ chiều không gian của đồ thị với vector mà mình đã tạo. Đơn cử, khi mình tạo vector có 3 giá trị tọa độ, đồ thị sẽ chuyển sang không gian 3 chiều. Nếu vector có hơn 3 giá trị tọa độ, đồ thị vẫn sẽ chuyển qua không gian 3 chiều và từ giá trị tọa độ thứ tư trở đi của vector mặc định bằng 0.', side: 'right' },
        onHighlighted: () => {
            syncStepState(4);
            clearTourTimeouts();
            lockTour('Đang di chuyển...');
            moveCursorTo('#btnAuto', unlockTour);
        }
    },
    {
        element: '#vectorInput', 
        popover: { title: 'Thử nghiệm tính năng "Chuyển chiều không gian tự động" [1]', description: 'Hiện tại, đồ thị đang là không gian 2 chiều, ta nhập tiếp một vector 3 chiều: <b>[1, 2, 3]</b>.', side: 'bottom' },
        onHighlighted: () => {
            syncStepState(5);
            clearTourTimeouts();
            lockTour('Đang nhập liệu...');
            moveCursorTo('#vectorInput', () => {
                clickCursor(null, () => {
                    const mf = document.getElementById('vectorInput');
                    // Tự động gõ phím 3D mượt mà
                    simulateHumanTyping(mf, '[1, 2, 3]', unlockTour);
                });
            });
        }
    },
    {
        element: '#btnDraw', 
        popover: { title: 'Thử nghiệm tính năng "Chuyển chiều không gian tự động" [2]', description: 'Kết quả là đồ thị tự đồng bộ chiều không gian với vector vừa được tạo.', side: 'right' },
        onHighlighted: () => {
            syncStepState(6);
            clearTourTimeouts();
            lockTour('Đang click...');
            moveCursorTo('#btnDraw', () => clickCursor(document.getElementById('btnDraw'), unlockTour));
        }
    },
    {
        element: '#mainVecSearch', 
        popover: { title: 'Khu vực tìm kiếm vector', description: 'Khi có hàng tá vector trong danh sách, để tìm nhanh một vector nhằm mục đích thao tác trên vector đó, ta cứ gõ tọa độ vào đây, hệ thống sẽ tìm cho ta vector tương ứng.', side: 'top' },
        onHighlighted: () => {
            syncStepState(7);
            clearTourTimeouts();
            lockTour('Đang di chuyển...');
            moveCursorTo('#mainVecSearch', unlockTour);
        }
    },
    {
        element: '.section-list', 
        popover: { title: '8. Nút "Chú ý"', description: 'Nút <b>Chú ý</b> giúp vector [1, 3] được nổi bật và làm mờ các vector khác.', side: 'top' },
        onHighlighted: () => {
            syncStepState(8);
            clearTourTimeouts();
            lockTour('Đang test nút...');
            toggleGraphHighlight(true); // Bật viền sáng cho đồ thị

            tourSetTimeout(() => {
                const list = document.getElementById('vectorList');
                if (list && list.firstElementChild) {
                    const btns = Array.from(list.firstElementChild.querySelectorAll('button'));
                    const targetBtn = btns.find(b => b.textContent.includes('Chú ý'));
                    
                    if (targetBtn) {
                        moveCursorTo(targetBtn, () => {
                            clickCursor(targetBtn, () => {
                                // Nghỉ 1.5 giây cho user ngắm đồ thị, sau đó click tắt đi
                                tourSetTimeout(() => clickCursor(targetBtn, unlockTour), 1500);
                            });
                        });
                    } else unlockTour();
                } else unlockTour();
            }, 400);
        }
    },
    {
        element: '.section-list', 
        popover: { title: '9. Nút "Ẩn/Hiện"', description: 'Nút <b>Ẩn</b> làm ẩn vector được chỉ định. Nút <b>Hiện</b> làm hiện vector được chỉ định ẩn trước đó.', side: 'top' },
        onHighlighted: () => {
            syncStepState(9);
            clearTourTimeouts();
            lockTour('Đang test nút...');
            toggleGraphHighlight(true); // Bật viền sáng cho đồ thị

            tourSetTimeout(() => {
                const list = document.getElementById('vectorList');
                if (list && list.firstElementChild) {
                    const btns = Array.from(list.firstElementChild.querySelectorAll('button'));
                    const targetBtn = btns.find(b => b.textContent.includes('Ẩn') || b.textContent.includes('Hiện'));
                    
                    if (targetBtn) {
                        moveCursorTo(targetBtn, () => {
                            clickCursor(targetBtn, () => {
                                // Nghỉ 1.5 giây, sau đó click bật lại
                                tourSetTimeout(() => clickCursor(targetBtn, unlockTour), 1500);
                            });
                        });
                    } else unlockTour();
                } else unlockTour();
            }, 400);
        }
    },
    {
        element: '.section-list', 
        popover: { title: '10. Nút "Xóa"', description: 'Nút <b>Xóa</b> sẽ loại bỏ hoàn toàn vector ra khỏi danh sách và đồ thị.', side: 'top' },
        onHighlighted: () => {
            syncStepState(10);
            clearTourTimeouts();
            lockTour('Đang test nút...');
            toggleGraphHighlight(true); // Bật viền sáng cho đồ thị

            tourSetTimeout(() => {
                const list = document.getElementById('vectorList');
                if (list && list.firstElementChild) {
                    const btns = Array.from(list.firstElementChild.querySelectorAll('button'));
                    const targetBtn = btns.find(b => b.textContent.includes('Xóa'));
                    
                    if (targetBtn) moveCursorTo(targetBtn, () => clickCursor(targetBtn, unlockTour));
                    else unlockTour();
                } else unlockTour();
            }, 400);
        }
    },
    {
        element: '#btnClearAll', 
        popover: { title: 'Nút "Xóa hết vector"', description: 'Loại bỏ hết các vector có trong danh sách và đồ thị', side: 'right' },
        onHighlighted: () => {
            syncStepState(11);
            clearTourTimeouts();
            lockTour('Đang dọn dẹp...');
            toggleGraphHighlight(false); // Tắt viền sáng đồ thị
            
            moveCursorTo('#btnClearAll', () => clickCursor(document.getElementById('btnClearAll'), unlockTour));
        }
    }
];

/* =========================================================
   DỌN DẸP HIỆN TRƯỜNG KHI KẾT THÚC (HOẶC USER BẤM DẤU X)
   ========================================================= */
function cleanupTour() {
    clearTourTimeouts();
    toggleGraphHighlight(false); 
    
    const cursor = document.getElementById('tour-fake-cursor');
    if (cursor) cursor.style.opacity = '0';

    const menu = document.getElementById('myCustomMenu');
    if (menu) menu.style.display = 'none';

    // [QUAN TRỌNG]: Đóng tour là phải trả lại đồ đạc cho User
    restoreUserState();
    isTourRunning = false;
}

// Khởi chạy Tour
setupGuidedTour('btn-tour-khoitao', khoiTaoVectorSteps, cleanupTour);

