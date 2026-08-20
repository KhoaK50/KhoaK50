import re

path = 'D:/Programming_language/project_web/frontend_v2/js/app/ui/topbar_avatar.js'
with open(path, 'r', encoding='utf-8') as f:
    js = f.read()

new_toast_func = """
    function showNotificationToast(title, message, type) {
        var container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 99999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
            document.body.appendChild(container);
        }
        var toast = document.createElement('div');
        toast.style.cssText = 'background: var(--bg-card, #ffffff); border: 1px solid var(--border-strong, #e2e8f0); border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1); padding: 14px 16px; min-width: 300px; max-width: 380px; animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; font-family: var(--font, system-ui, sans-serif); position: relative; overflow: hidden; pointer-events: auto;';
        
        var iconColor = type === 'WARNING' ? '#ef4444' : '#3b82f6';
        var iconClass = type === 'WARNING' ? 'fa-triangle-exclamation' : 'fa-bell';
        var iconBg = type === 'WARNING' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)';
        
        toast.innerHTML = `
            <div style="display: flex; gap: 12px; align-items: flex-start; z-index: 2; position: relative;">
                <div style="color: ${iconColor}; background: ${iconBg}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 14px;">
                    <i class="fa-solid ${iconClass}"></i>
                </div>
                <div style="flex-grow: 1;">
                    <div style="font-weight: 600; font-size: 14px; margin-bottom: 2px; color: var(--text-main, #0f172a); line-height: 1.4;">${title}</div>
                    <div style="font-size: 13px; color: var(--text-muted, #64748b); line-height: 1.4;">${message}</div>
                </div>
                <button class="toast-close" style="background: transparent; border: none; color: var(--text-muted, #94a3b8); cursor: pointer; padding: 4px; border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: 0.2s;" onmouseover="this.style.background='var(--bg-hover, #f1f5f9)';" onmouseout="this.style.background='transparent';">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="toast-progress" style="position: absolute; bottom: 0; left: 0; height: 3px; background: ${iconColor}; width: 100%; animation: shrinkProgress 5s linear forwards; transform-origin: left; z-index: 1;"></div>
        `;
        
        container.appendChild(toast);
        
        var isRemoved = false;
        function removeToast() {
            if (isRemoved) return;
            isRemoved = true;
            toast.style.animation = 'slideOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
            setTimeout(() => toast.remove(), 300);
        }
        
        var timeoutId = setTimeout(removeToast, 5000);
        
        toast.querySelector('.toast-close').onclick = function() {
            clearTimeout(timeoutId);
            removeToast();
        };
        
        if (!document.getElementById('toast-styles-saas')) {
            var style = document.createElement('style');
            style.id = 'toast-styles-saas';
            style.innerHTML = '@keyframes slideIn { 0% { transform: translateX(100%); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } } @keyframes slideOut { 0% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(100%); opacity: 0; } } @keyframes shrinkProgress { 0% { transform: scaleX(1); } 100% { transform: scaleX(0); } }';
            document.head.appendChild(style);
        }
    }
"""

js = re.sub(r'    function showNotificationToast.*?\}\n    \}\n', new_toast_func, js, flags=re.DOTALL)
with open(path, 'w', encoding='utf-8') as f:
    f.write(js)
