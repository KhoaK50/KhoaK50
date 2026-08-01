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
    const modeBadge = document.getElementById('modeBadge');
    const axisControls = document.getElementById('axisControls');
    
    // Fallback if elements not found (e.g. some pages don't have paper mode)
    if (!btnVisual || !btnPaper || !viewer || !paperWrap) return;

    btnVisual.addEventListener('click', () => {
      isPaperMode = false;
      
      // Update UI
      btnVisual.classList.add('active');
      btnVisual.style.background = 'var(--primary-base)';
      btnVisual.style.color = 'white';
      
      btnPaper.classList.remove('active');
      btnPaper.style.background = 'transparent';
      btnPaper.style.color = 'var(--text-muted)';
      
      // Toggle Views
      paperWrap.style.display = 'none';
      viewer.style.display = 'block';
      if(modeBadge) modeBadge.style.display = 'flex';
      
      if(window.App && window.App.mode === '3D') {
        if(axisControls) axisControls.style.display = 'flex';
      }
    });

    btnPaper.addEventListener('click', () => {
      isPaperMode = true;
      
      // Update UI
      btnPaper.classList.add('active');
      btnPaper.style.background = 'var(--primary-base)';
      btnPaper.style.color = 'white';
      
      btnVisual.classList.remove('active');
      btnVisual.style.background = 'transparent';
      btnVisual.style.color = 'var(--text-muted)';
      
      // Toggle Views
      viewer.style.display = 'none';
      paperWrap.style.display = 'block';
      if(modeBadge) modeBadge.style.display = 'none';
      if(axisControls) axisControls.style.display = 'none';
    });
  }

  /**
   * Thêm một block toán học vào sổ ghi chép
   * @param {string} title Tiêu đề của bước (vd: "Khai báo Vector")
   * @param {string} mathLatex Công thức LaTeX (nếu có)
   * @param {string} htmlContent Nội dung HTML tuỳ chỉnh
   */
  function addLog(title, mathLatex = '', htmlContent = '') {
    const logArea = document.getElementById('paperLogArea');
    if (!logArea) return;

    // Xoá dòng chữ placeholder nếu đây là log đầu tiên
    const placeholder = logArea.querySelector('.fa-pen-nib');
    if (placeholder) {
      logArea.innerHTML = ''; // Xoá trắng
    }

    const stepDiv = document.createElement('div');
    stepDiv.className = 'paper-step-block';
    stepDiv.style.cssText = `
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-subtle, rgba(0,0,0,0.1));
    `;

    let contentHTML = `
      <div style="font-weight: 600; font-size: 18px; color: var(--primary-base); margin-bottom: 8px;">${title}</div>
    `;

    if (mathLatex) {
      contentHTML += `<div style="font-size: 20px; overflow-x: auto; margin-bottom: 8px;">\\[ ${mathLatex} \\]</div>`;
    }
    
    if (htmlContent) {
      contentHTML += `<div style="font-size: 16px;">${htmlContent}</div>`;
    }

    stepDiv.innerHTML = contentHTML;
    logArea.appendChild(stepDiv);

    // Re-render LaTeX
    if (window.renderMathInElement) {
      window.renderMathInElement(stepDiv, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '\\\\[', right: '\\\\]', display: true},
          {left: '$', right: '$', display: false},
          {left: '\\\\(', right: '\\\\)', display: false}
        ],
        throwOnError: false
      });
    }

    // Tự động cuộn xuống cuối
    const paperWrap = document.getElementById('paperWrap');
    if (paperWrap) {
      paperWrap.scrollTop = paperWrap.scrollHeight;
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
