window.App = window.App || {};

(function() {
  // Ensure CSS
  if (!document.getElementById('global-toast-css')) {
    const style = document.createElement('style');
    style.id = 'global-toast-css';
    style.innerHTML = `
      #toast-container { position: fixed; bottom: 20px; right: 20px; z-index: 999999; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
      .toast-item { 
        pointer-events: auto;
        background: var(--bg-card, #fff); color: var(--text-main, #111); 
        box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px; 
        position: relative; min-width: 250px; max-width: 350px; 
        opacity: 0; transform: translateY(20px); overflow: hidden;
        transition: all 0.35s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        cursor: pointer; display: flex; align-items: center;
      }
      body.dark .toast-item { background: var(--s2, #1e293b); color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
      .toast-progress { position: absolute; bottom: 0; left: 0; height: 3px; border-radius: 0 0 0 8px; transition: width linear; width: 100%; }
    `;
    document.head.appendChild(style);
  }

  function getContainer() {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }
    return container;
  }
  
  function saveToasts(toasts) {
    sessionStorage.setItem('global_active_toasts', JSON.stringify(toasts));
  }

  function getSavedToasts() {
    try {
      let data = sessionStorage.getItem('global_active_toasts');
      return data ? JSON.parse(data) : [];
    } catch(e) { return []; }
  }

  // We maintain a list of active toast objects in JS memory, sync to sessionStorage.
  let activeToastObjects = [];

  window.App.showToast = function (message, type = "error", customDuration = 5000, id = null, startTime = null) {
    let container = getContainer();
    const removeToastSmoothly = (t) => {
      if (t.isRemoving) return;
      t.isRemoving = true;
      t.style.opacity = "0";
      t.style.transform = "translateX(120%)";
      // Remove from session storage
      if (t.toastId) {
        let saved = getSavedToasts().filter(x => x.id !== t.toastId);
        saveToasts(saved);
      }
      setTimeout(() => {
        t.style.marginTop = "0"; t.style.marginBottom = "0";
        t.style.paddingTop = "0"; t.style.paddingBottom = "0";
        t.style.height = "0";
      }, 150);
      setTimeout(() => { if (t.parentNode) t.remove(); }, 400);
    };

    let activeDOMs = Array.from(container.children).filter(t => !t.isRemoving);
    while (activeDOMs.length >= 3) {
      let oldest = activeDOMs.shift();
      removeToastSmoothly(oldest);
    }

    const toast = document.createElement("div");
    toast.className = "toast-item";
    
    let toastId = id || Date.now().toString() + Math.random().toString();
    toast.toastId = toastId;
    let startedAt = startTime || Date.now();
    let expiresAt = startedAt + customDuration;
    let remaining = expiresAt - Date.now();
    
    if (remaining <= 0) return; // Expired already
    
    // Save to session immediately if it's a new toast
    if (!id) {
       let saved = getSavedToasts();
       saved.push({ id: toastId, message, type, startedAt, duration: customDuration });
       saveToasts(saved);
    }

    let iconSVG = "", colorHex = "";
    if (type === "error") {
      colorHex = "#f44336";
      iconSVG = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';
    } else if (type === "warning") {
      colorHex = "#ff9800";
      iconSVG = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>';
    } else {
      colorHex = "#4caf50";
      iconSVG = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
    }

    toast.style.borderLeft = `4px solid ${colorHex}`;
    toast.innerHTML = `
      <div class="toast-content" style="display: flex; align-items: center; gap: 10px; padding: 12px 16px; padding-bottom: 16px;">
          <span class="toast-icon" style="color: ${colorHex}; display: flex;">${iconSVG}</span>
          <span style="font-weight: 500; font-size: 0.95rem;">${message}</span>
      </div>
      <div class="toast-progress" style="background: ${colorHex}; width: ${(remaining/customDuration)*100}%; transition: width ${remaining}ms linear;"></div>
    `;

    toast.onclick = function () { removeToastSmoothly(toast); };
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0) translateX(0)";
      // Start progress bar animation
      let prog = toast.querySelector('.toast-progress');
      if (prog) {
        // slight delay to ensure transition triggers
        setTimeout(() => { prog.style.width = '0%'; }, 10);
      }
    });

    setTimeout(function () {
      removeToastSmoothly(toast);
    }, remaining);
  };

  // On page load, revive toasts
  document.addEventListener("DOMContentLoaded", () => {
    let saved = getSavedToasts();
    let now = Date.now();
    let valid = [];
    saved.forEach(t => {
      if (t.startedAt + t.duration > now) {
        valid.push(t);
        window.App.showToast(t.message, t.type, t.duration, t.id, t.startedAt);
      }
    });
    saveToasts(valid);
  });
})();

  window.App.showConfirm = function(message, onConfirm, onCancel = null) {
    let modalOverlay = document.createElement('div');
    modalOverlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999999; display:flex; justify-content:center; align-items:center; opacity:0; transition:opacity 0.2s; backdrop-filter:blur(4px); pointer-events:auto;';
    
    let modalBox = document.createElement('div');
    modalBox.style.cssText = 'background:var(--bg-card, #fff); border-radius:12px; padding:24px; width:90%; max-width:400px; box-shadow:0 10px 30px rgba(0,0,0,0.2); transform:scale(0.9); transition:transform 0.2s;';
    if (document.body.classList.contains('dark')) {
      modalBox.style.background = 'var(--s2, #1e293b)';
      modalBox.style.color = '#fff';
    }
    
    let msgDiv = document.createElement('div');
    msgDiv.style.cssText = 'font-size:1.05rem; margin-bottom:24px; line-height:1.5; font-weight:500;';
    msgDiv.innerHTML = message.replace(/\n/g, '<br>');
    
    let btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex; justify-content:flex-end; gap:12px;';
    
    let cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Hủy';
    cancelBtn.style.cssText = 'padding:8px 16px; border-radius:6px; border:1px solid var(--border-strong, #ccc); background:transparent; color:inherit; cursor:pointer; font-weight:600;';
    
    let confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Xác nhận';
    confirmBtn.style.cssText = 'padding:8px 16px; border-radius:6px; border:none; background:var(--primary-base, #3b82f6); color:#fff; cursor:pointer; font-weight:600;';
    
    const close = () => {
      modalOverlay.style.opacity = '0';
      modalBox.style.transform = 'scale(0.9)';
      setTimeout(() => { if (modalOverlay.parentNode) modalOverlay.remove(); }, 200);
    };
    
    cancelBtn.onclick = () => { close(); if (onCancel) onCancel(); };
    confirmBtn.onclick = () => { close(); if (onConfirm) onConfirm(); };
    
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(confirmBtn);
    modalBox.appendChild(msgDiv);
    modalBox.appendChild(btnRow);
    modalOverlay.appendChild(modalBox);
    document.body.appendChild(modalOverlay);
    
    requestAnimationFrame(() => {
      modalOverlay.style.opacity = '1';
      modalBox.style.transform = 'scale(1)';
    });
  };
