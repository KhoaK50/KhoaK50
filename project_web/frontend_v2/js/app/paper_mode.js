/**
 * Paper Mode (Chế độ ghi chép)
 * Quản lý giao diện và logic thêm nội dung nhật ký toán học
 */
const PaperMode = (() => {
  let isPaperMode = false;

  function init() {
    const btnVisual = document.getElementById('btnVisualMode');
    const btnPaper = document.getElementById('btnPaperMode');
    const viewer = document.getElementById('viewer');
    const paperWrap = document.getElementById('paperWrap');
    const canvasHudTools = document.getElementById('canvasHudTools');
    const axisControls = document.getElementById('axisControls');
    
    // Fallback if elements not found (e.g. some pages don't have paper mode)
    if (!btnVisual || !btnPaper || !viewer || !paperWrap) return;

    btnVisual.addEventListener('click', () => {
      isPaperMode = false;
      
      // Update UI
      btnVisual.classList.add('active');
      btnPaper.classList.remove('active');
      
      // Toggle Views
      paperWrap.style.display = 'none';
      viewer.style.display = 'block';
      if (canvasHudTools) canvasHudTools.style.display = 'inline-flex';
      
      if (axisControls) {
        axisControls.style.display = (window.App && window.App.mode === '3D') ? 'inline-flex' : 'none';
      }
    });

    btnPaper.addEventListener('click', () => {
      isPaperMode = true;
      
      // Update UI
      btnPaper.classList.add('active');
      btnVisual.classList.remove('active');
      
      // Toggle Views
      viewer.style.display = 'none';
      paperWrap.style.display = 'block';
      if (canvasHudTools) canvasHudTools.style.display = 'none';
    });
  }

  function addLog(title, mathLatex = '', htmlContent = '') {
    if (window.App && window.App.PaperLogger && typeof window.App.PaperLogger.log === 'function') {
      window.App.PaperLogger.log(title, mathLatex, htmlContent);
    }
  }

  return {
    init,
    addLog,
    isPaperMode: () => isPaperMode
  };
})();

// Khởi tạo khi DOM tải xong
document.addEventListener('DOMContentLoaded', () => {
  PaperMode.init();
});
