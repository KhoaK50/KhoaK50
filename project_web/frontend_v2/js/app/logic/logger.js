(function () {
  window.App = window.App || {};

  const STORAGE_KEY = 'vectoria_paper_log';
  const TITLE_KEY = 'vectoria_paper_title';

  const PaperLogger = {
    logs: [],
    
    init() {
      // 1. Khôi phục tiêu đề
      const titleInput = document.getElementById('paperTitle');
      if (titleInput) {
        const savedTitle = localStorage.getItem(TITLE_KEY);
        if (savedTitle) {
          titleInput.value = savedTitle;
        }
        titleInput.addEventListener('input', (e) => {
          localStorage.setItem(TITLE_KEY, e.target.value);
        });
      }

      // 2. Khôi phục nhật ký
      const savedLogs = localStorage.getItem(STORAGE_KEY);
      if (savedLogs) {
        try {
          this.logs = JSON.parse(savedLogs);
          this.renderAll();
        } catch (e) {
          console.error("Lỗi đọc nhật ký từ LocalStorage", e);
          this.logs = [];
        }
      }

      // 3. Render placeholder nếu trống
      if (this.logs.length === 0) {
        this.renderPlaceholder();
      }

      // 4. Tạo nút "Xoá sổ tay" nếu chưa có
      this.attachClearButton();
    },

    attachClearButton() {
      const container = document.querySelector('.paper-container');
      if (container && !document.getElementById('btnClearPaper')) {
        const btnClear = document.createElement('button');
        btnClear.id = 'btnClearPaper';
        btnClear.innerHTML = '<i class="fa-solid fa-trash-can" style="margin-right: 6px;"></i> Xóa lịch sử';
        btnClear.style.cssText = `
          display: block; margin: 30px auto 0; padding: 10px 20px;
          background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444;
          color: #dc2626; border-radius: 8px; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif;
        `;
        btnClear.onmouseover = () => {
          btnClear.style.background = '#ef4444';
          btnClear.style.color = '#ffffff';
        };
        btnClear.onmouseout = () => {
          btnClear.style.background = 'rgba(239, 68, 68, 0.1)';
          btnClear.style.color = '#dc2626';
        };
        btnClear.onclick = () => {
          // Giao diện xác nhận Custom Modal
          const overlay = document.createElement('div');
          overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
            z-index: 9999; backdrop-filter: blur(4px);
          `;
          const box = document.createElement('div');
          box.style.cssText = `
            background: var(--bg-card, #fff); padding: 24px; border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-width: 400px; width: 90%;
            font-family: 'Inter', sans-serif; text-align: center;
          `;
          box.innerHTML = `
            <div style="font-size: 48px; color: #ef4444; margin-bottom: 16px;"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <h3 style="margin: 0 0 12px 0; color: var(--text-main, #111); font-size: 20px;">Xoá toàn bộ sổ tay?</h3>
            <p style="color: var(--text-muted, #666); font-size: 15px; margin-bottom: 24px; line-height: 1.5;">Hành động này sẽ xoá vĩnh viễn toàn bộ lịch sử các phép tính trong sổ tay của bạn. Bạn không thể khôi phục lại!</p>
            <div style="display: flex; gap: 12px; justify-content: center;">
              <button id="btnCancelClear" style="flex: 1; padding: 12px 0; border: 1px solid var(--border-strong, #ccc); background: transparent; border-radius: 8px; cursor: pointer; color: var(--text-main, #333); font-weight: 600; font-size: 14px; transition: 0.2s;">Huỷ bỏ</button>
              <button id="btnConfirmClear" style="flex: 1; padding: 12px 0; border: none; background: #ef4444; color: white; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; box-shadow: 0 2px 8px rgba(239,68,68,0.3); transition: 0.2s;">Đồng ý xoá</button>
            </div>
          `;
          overlay.appendChild(box);
          document.body.appendChild(overlay);

          // Hiệu ứng hover nút
          const btnCancel = document.getElementById('btnCancelClear');
          const btnConfirm = document.getElementById('btnConfirmClear');
          btnCancel.onmouseover = () => btnCancel.style.background = 'rgba(0,0,0,0.05)';
          btnCancel.onmouseout = () => btnCancel.style.background = 'transparent';
          btnConfirm.onmouseover = () => btnConfirm.style.background = '#dc2626';
          btnConfirm.onmouseout = () => btnConfirm.style.background = '#ef4444';

          btnCancel.onclick = () => overlay.remove();
          btnConfirm.onclick = () => {
            this.clear();
            overlay.remove();
            if(window.App && window.App.showToast) App.showToast("Đã xóa lịch sử tính toán!", "success");
          };
        };
        container.appendChild(btnClear);
      }
    },

    save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
    },

    clear() {
      this.logs = [];
      this.save();
      const titleInput = document.getElementById('paperTitle');
      if (titleInput) {
        titleInput.value = '';
        localStorage.removeItem(TITLE_KEY);
      }
      this.renderPlaceholder();
    },

    renderPlaceholder() {
      const logArea = document.getElementById('paperLogArea');
      if (logArea) {
        logArea.innerHTML = `
          <div style="text-align: center; color: var(--text-muted); margin-top: 100px; font-style: italic; font-family: 'Inter', sans-serif;" id="paperPlaceholder">
            <i class="fa-solid fa-pen-nib" style="font-size: 32px; margin-bottom: 15px; opacity: 0.5;"></i><br>
            Các thao tác toán học bạn thực hiện trên thanh công cụ sẽ được ghi chép tự động tại đây...
          </div>
        `;
      }
    },

    deleteLog(id) {
      this.logs = this.logs.filter(log => log.id !== id);
      this.save();
      const el = document.getElementById(`log-${id}`);
      if (el) {
        el.style.opacity = '0';
        el.style.transform = 'scale(0.95)';
        setTimeout(() => {
          el.remove();
          if (this.logs.length === 0) this.renderPlaceholder();
        }, 200);
      } else {
        this.renderAll();
      }
    },

    /**
     * Ghi một log mới vào sổ tay
     * @param {string} title Tiêu đề của phép toán (VD: Cộng vector)
     * @param {string} summaryLatex Biểu thức toán học LaTeX tóm tắt (VD: \vec{v_1} + \vec{v_2} = [1, 2, 3])
     * @param {string} detailsHtml (Tuỳ chọn) HTML mô tả các bước giải chi tiết.
     */
    log(title, summaryLatex, detailsHtml = "", solutionPack = null, animationData = null) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const newLog = {
        id: Date.now(),
        time: timeStr,
        title: title,
        summaryLatex: summaryLatex,
        detailsHtml: detailsHtml,
        solutionPack: solutionPack,
        animationData: animationData ? JSON.parse(JSON.stringify(animationData)) : null
      };

      this.logs.push(newLog);
      this.save();
      
      this.appendLogDOM(newLog);

      // Trì hoãn việc lấy snapshot 1 tick để đảm bảo vector kết quả đã được push vào App.vectorList
      setTimeout(() => {
          if (newLog.animationData && window.App && window.App.vectorList) {
              newLog.animationData.snapshot = [];
              const idsToSnap = new Set();
              
              if (Array.isArray(newLog.animationData.vectors)) {
                  newLog.animationData.vectors.forEach(id => idsToSnap.add(String(id)));
              }
              if (newLog.animationData.result !== undefined) {
                  idsToSnap.add(String(newLog.animationData.result));
              }
              if (Array.isArray(newLog.animationData.selectedIds)) {
                  newLog.animationData.selectedIds.forEach(id => idsToSnap.add(String(id)));
              }
              
              window.App.vectorList.forEach(v => {
                  if (idsToSnap.has(String(v.id))) {
                      newLog.animationData.snapshot.push(JSON.parse(JSON.stringify(v)));
                  }
              });
              
              this.save(); // Lưu lại bản ghi đã có snapshot
          }
      }, 0);
    },

    openSolution(id) {
      const log = this.logs.find(l => l.id === id);
      if (log && log.solutionPack && window.App.openSolutionPanel) {
        const config = Object.assign({}, log.solutionPack, { autoOpen: true });
        window.App.openSolutionPanel(config);
      }
    },

    playAnimation(id) {
      const log = this.logs.find(l => l.id === id);
      if (log && log.animationData) {
        // Switch to Visualizer mode
        const btnVis = document.getElementById("btnVisualMode");
        if (btnVis) btnVis.click();
        
        // Ensure 3D is active if needed by animation (most work better in 3D)
        if (window.App.mode === "2D") {
           const btn3D = document.getElementById("btn3D");
           if (btn3D) btn3D.click();
        }

        // Trigger animation
        setTimeout(() => {
          // --- TRUE REPLAY VECTOR INJECTION ---
          if (log.animationData.snapshot && Array.isArray(log.animationData.snapshot) && window.App.vectorList) {
              // 1. Sao lưu thực tại
              if (!window.App._preReplayVectorList) {
                  window.App._preReplayVectorList = JSON.parse(JSON.stringify(window.App.vectorList));
              }
              
              // 2. Hiện HUD Chế độ Khảo sát
              if (window.App.showReplayHUD) window.App.showReplayHUD();
              
              // 3. Ép các vector tham gia phép tính về trạng thái của Snapshot
              log.animationData.snapshot.forEach(snap => {
                  const existingIdx = window.App.vectorList.findIndex(v => String(v.id) === String(snap.id));
                  const snapCopy = JSON.parse(JSON.stringify(snap));
                  
                  if (existingIdx !== -1) {
                      window.App.vectorList[existingIdx] = snapCopy;
                  } else {
                      window.App.vectorList.push(snapCopy);
                  }
                  
                  // Đặt opacity chuẩn cho animation
                  const v = window.App.vectorList.find(x => String(x.id) === String(snapCopy.id));
                  if (v) {
                      v.alpha = (String(snapCopy.id) === String(log.animationData.result)) ? 0 : 1;
                  }
              });
              
              // [FIX LỖI] Sắp xếp lại mảng vectorList theo id nội bộ để giữ nguyên số thứ tự hiển thị UI (VD: #1, #2)
              window.App.vectorList.sort((a, b) => a.id - b.id);
              
              if (window.App.renderVectorList) window.App.renderVectorList();
              if (window.App.redrawAll) window.App.redrawAll({ frame: false });
          }
          // ------------------------------------
          
          if (window.App.replayTimeoutId) clearTimeout(window.App.replayTimeoutId);

          if (log.animationData.type === 'basis') {
              if (window.App && typeof window.App.startBasisAnimation === 'function') {
                  window.App.startBasisAnimation(log.animationData).then(() => {
                      window.App.replayTimeoutId = setTimeout(() => {
                          if (window.App.cleanupReplayGhosts) window.App.cleanupReplayGhosts();
                      }, 1500);
                  });
              }
          } else {
              if (window.App && typeof window.App.animateOperation === 'function') {
                  if (log.animationData.result !== undefined && window.App.vectorList) {
                      const resVec = window.App.vectorList.find(v => String(v.id) === String(log.animationData.result));
                      if (resVec) {
                          resVec.alpha = 0; // Tạm ẩn vector kết quả để chạy hiệu ứng tạo ra nó
                          if (window.App.redrawAll) window.App.redrawAll({ frame: false });
                      }
                  }
                  window.App.animateOperation(log.animationData.type, log.animationData.vectors, log.animationData.result);
                  window.App.replayTimeoutId = setTimeout(() => {
                      if (window.App.cleanupReplayGhosts) window.App.cleanupReplayGhosts();
                  }, 4500);
              }
          }
        }, 100);
      }
    },
    renderAll() {
      const logArea = document.getElementById('paperLogArea');
      if (!logArea) return;
      
      if (this.logs.length === 0) {
        this.renderPlaceholder();
        return;
      }
      
      logArea.innerHTML = '';
      this.logs.forEach(log => this.appendLogDOM(log, false));
      
      // Kích hoạt MathJax cho toàn bộ
      if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([logArea]).catch((err) => console.log(err));
      }
    },

    appendLogDOM(log, animate = true) {
      const logArea = document.getElementById('paperLogArea');
      if (!logArea) return;

      const placeholder = document.getElementById('paperPlaceholder');
      if (placeholder) placeholder.remove();

      const div = document.createElement('div');
      div.id = `log-${log.id}`;
      div.className = 'paper-log-entry';
      div.style.cssText = `
        position: relative;
        padding: 20px 24px;
        margin-bottom: 24px;
        background: var(--bg-hover, rgba(0,0,0,0.02));
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        transition: all 0.3s ease;
      `;
      if (animate) {
        div.style.opacity = '0';
        div.style.transform = 'translateY(10px)';
      }

      // Xây dựng nội dung
      let innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-strong); padding-bottom: 10px; margin-bottom: 16px;">
          <div style="font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; color: var(--primary-base, #2563eb);">
            ${log.title}
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-family: 'Inter', sans-serif; font-size: 12px; color: var(--muted);">${log.time}</span>
            <button class="btn-del-log" onclick="window.App.PaperLogger.deleteLog(${log.id})" style="background:transparent; border:none; color:var(--muted); cursor:pointer; font-size:14px; padding: 4px;" title="Xoá log này">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>
        </div>
        <div style="font-size: 18px; margin-bottom: ${log.detailsHtml ? '16px' : '0'}; overflow-x: auto; padding-bottom: 8px;" class="math-scrollable">
          \\[ ${log.summaryLatex} \\]
        </div>
      `;

      if (log.detailsHtml) {
        innerHTML += `
          <div style="font-family: 'Inter', sans-serif; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; margin-top: 10px;">
            <div style="padding: 16px; font-size: 14px; line-height: 1.6; color: var(--text-main); overflow-x: auto;">
              ${log.detailsHtml}
            </div>
          </div>
        `;
      }

        if (log.solutionPack) {
          // Render a button to open the solution panel
          innerHTML += `
            <button class="btn-open-solution-log" onclick='window.App.PaperLogger.openSolution(${log.id})' style="margin-top: 12px; padding: 10px 16px; background: rgba(37, 99, 235, 0.1); color: var(--primary-base); border: 1px solid rgba(37, 99, 235, 0.2); border-radius: 6px; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s;">
              <i class="fa-solid fa-file-invoice"></i> Xem Lời giải chi tiết
            </button>
          `;
        }

        if (log.animationData) {
          // Render a button to play animation
          innerHTML += `
            <button class="btn-play-animation-log" onclick='window.App.PaperLogger.playAnimation(${log.id})' style="margin-top: 12px; padding: 10px 16px; background: rgba(16, 185, 129, 0.1); color: var(--success-base, #10b981); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 6px; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; margin-left: 10px;">
              <i class="fa-solid fa-play"></i> Khảo sát Đồ thị
            </button>
          `;
        }

        div.innerHTML = innerHTML;
        logArea.appendChild(div);

      // Thêm style hover cho nút xoá (nếu chưa có)
      if (!document.getElementById('paper-logger-styles')) {
        const style = document.createElement('style');
        style.id = 'paper-logger-styles';
        style.innerHTML = `
          .paper-log-entry:hover { border-color: var(--border-strong); box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
          .btn-del-log:hover { color: #ef4444 !important; }
          .math-scrollable::-webkit-scrollbar { height: 6px; }
          .math-scrollable::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
        `;
        document.head.appendChild(style);
      }

      // Render bằng MathJax (nếu không phải lúc renderAll)
      if (animate && window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([div]).then(() => {
          div.style.opacity = '1';
          div.style.transform = 'translateY(0)';
        }).catch((err) => console.log(err));
      } else if (animate) {
        div.style.opacity = '1';
        div.style.transform = 'translateY(0)';
      }
    }
  };

  App.PaperLogger = PaperLogger;

  // Khởi tạo khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.PaperLogger.init());
  } else {
    App.PaperLogger.init();
  }
})();


