(function () {
  window.App = window.App || {};

  const SESSION_KEY = "vectoria_workspace";

  const SessionManager = {
    init() {
      this.loadAutoSave();

      // Ensure that we can export/import
      window.App.exportSession = this.exportSession.bind(this);
      window.App.importSession = this.importSession.bind(this);
    },

    getCurrentSession() {
      return {
        version: "1.0",
        timestamp: new Date().toISOString(),
        mode: window.App.mode,
        nextId: window.App.nextId,
        nextMatrixId: window.App.nextMatrixId,
        vectorList: window.App.vectorList || [],
        matrixList: window.App.matrixList || [],
        paperLog: (window.App.PaperLogger && window.App.PaperLogger.logs) ? window.App.PaperLogger.logs : [],
        paperTitle: document.getElementById('paperTitle') ? document.getElementById('paperTitle').value : ''
      };
    },

    autoSave() {
      // Debounce auto-save to avoid stuttering during rapid updates
      if (this.saveTimeout) clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => {
        const sessionData = this.getCurrentSession();
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      }, 500);
    },

    loadAutoSave() {
      const savedData = localStorage.getItem(SESSION_KEY);
      if (savedData) {
        try {
          const session = JSON.parse(savedData);
          this.restoreSession(session);
        } catch (e) {
          console.error("Failed to parse auto-saved session:", e);
        }
      }
    },

    exportSession() {
      const sessionData = this.getCurrentSession();
      const jsonStr = JSON.stringify(sessionData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `vectoria_session_${Date.now()}.vectoria`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      if (window.App.showToast) {
        window.App.showToast("Đã xuất file .vectoria thành công!", "success");
      }
    },

    importSession(fileContent) {
      try {
        const session = JSON.parse(fileContent);
        
        // Basic validation
        if (!session.vectorList || !session.matrixList) {
          throw new Error("Invalid .vectoria file structure");
        }
        
        this.restoreSession(session);
        
        if (window.App.showToast) {
          window.App.showToast("Đã nạp Không gian làm việc!", "success");
        }
      } catch (e) {
        console.error("Lỗi khi đọc file .vectoria:", e);
        if (window.App.showToast) {
          window.App.showToast("File .vectoria không hợp lệ hoặc bị lỗi!", "error");
        }
      }
    },

    restoreSession(session) {
      // Restore basic states
      if (session.mode && window.App.mode !== session.mode) {
        window.App.mode = session.mode;
        // Trigger UI button if needed
        const btn2D = document.getElementById("btn2D");
        const btn3D = document.getElementById("btn3D");
        if (session.mode === "2D" && btn2D) btn2D.click();
        if (session.mode === "3D" && btn3D) btn3D.click();
      }
      
      if (session.nextId) window.App.nextId = session.nextId;
      if (session.nextMatrixId) window.App.nextMatrixId = session.nextMatrixId;
      
      // Restore Vectors
      window.App.vectorList = session.vectorList || [];
      if (typeof window.App.renderVectorList === 'function') {
        window.App.renderVectorList();
      }
      
      // Restore Matrices
      window.App.matrixList = session.matrixList || [];
      if (typeof window.App.renderMatrixList === 'function') {
        window.App.renderMatrixList();
      }
      
      // Restore Paper Log
      if (window.App.PaperLogger) {
        window.App.PaperLogger.logs = session.paperLog || [];
        window.App.PaperLogger.renderAll();
      }
      
      const titleInput = document.getElementById('paperTitle');
      if (titleInput && session.paperTitle !== undefined) {
        titleInput.value = session.paperTitle;
      }
      
      // Redraw UI
      if (typeof window.App.redrawAll === "function") {
        window.App.redrawAll({ frame: false });
      }
      if (typeof window.App.renderMatrixList === "function") {
        window.App.renderMatrixList();
      }
    }
  };

  window.App.SessionManager = SessionManager;
})();
