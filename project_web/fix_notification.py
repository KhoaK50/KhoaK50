import re

path = 'D:/Programming_language/project_web/frontend_v2/js/app/ui/topbar_avatar.js'
with open(path, 'r', encoding='utf-8') as f:
    js = f.read()

new_bell_logic = """
// --- Notification System ---
document.addEventListener('DOMContentLoaded', function() {
    var token = localStorage.getItem('user_token');
    if (!token) return; // Not logged in
    
    var notifContainer = document.getElementById('notificationDropdownContainer');
    if (notifContainer) notifContainer.style.display = 'inline-flex';
    else return;
    
    var lastUnreadCount = -1;
    
    function showNotificationToast(title, message, type) {
        if (window.App && window.App.showToast && false) { 
            window.App.showToast(message, type === 'WARNING' ? 'error' : 'info');
        } else {
            var container = document.getElementById('toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container';
                container.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
                document.body.appendChild(container);
            }
            var toast = document.createElement('div');
            toast.style.cssText = 'background: var(--bg-card, white); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 12px 16px; min-width: 250px; max-width: 350px; border-left: 4px solid ' + (type === 'WARNING' ? '#ef4444' : '#3b82f6') + '; animation: slideIn 0.3s ease forwards; font-family: var(--font, sans-serif); display: flex; gap: 12px; align-items: flex-start;';
            
            var iconColor = type === 'WARNING' ? '#ef4444' : '#3b82f6';
            var iconClass = type === 'WARNING' ? 'fa-triangle-exclamation' : 'fa-bell';
            
            toast.innerHTML = `
                <div style="color: ${iconColor}; font-size: 1.2rem; padding-top: 2px;"><i class="fa-solid ${iconClass}"></i></div>
                <div>
                    <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 4px; color: var(--text-main, #1e293b);">${title}</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted, #475569); line-height: 1.4;">${message}</div>
                </div>
            `;
            container.appendChild(toast);
            setTimeout(function() {
                toast.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => toast.remove(), 300);
            }, 5000);
            
            if (!document.getElementById('toast-styles')) {
                var style = document.createElement('style');
                style.id = 'toast-styles';
                style.innerHTML = '@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }';
                document.head.appendChild(style);
            }
        }
    }

    function fetchNotifications() {
        var _l = atob('aHR0cDovLzEyNy4wLjAuMTo1MDAw');
        var _p = atob('aHR0cHM6Ly92aXN1YWxpemF0aW9uLXJyNXYub25yZW5kZXIuY29t');
        var API_BASE = (location.hostname === '127.0.0.1' || location.hostname === 'localhost') ? _l : _p;

        fetch(API_BASE + '/api/notifications', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                if (lastUnreadCount !== -1 && data.unread_count > lastUnreadCount && data.notifications.length > 0) {
                    var newest = data.notifications[0];
                    if (!newest.is_read) {
                        showNotificationToast(newest.title, newest.message, newest.type);
                    }
                }
                lastUnreadCount = data.unread_count;
                renderNotifications(data.notifications, data.unread_count);
            }
        })
        .catch(err => console.error('Error fetching notifications:', err));
    }
    
    var originalAlert = window.alert;
    window.alert = function(msg) {
        if (typeof msg === 'string' && (msg.includes('bị khóa') || msg.includes('không thể bình luận'))) {
            showNotificationToast('Cảnh báo', msg, 'WARNING');
        } else {
            originalAlert(msg);
        }
    };
    
    function renderNotifications(notifications, unreadCount) {
        var badge = document.getElementById('unreadBadge');
        var list = document.getElementById('notificationList');
        var markAllBtn = document.getElementById('markAllReadBtn');
        
        if (unreadCount > 0) {
            badge.style.display = 'flex';
            badge.innerText = unreadCount > 9 ? '9+' : unreadCount;
            if (markAllBtn) markAllBtn.style.display = 'none';
        } else {
            badge.style.display = 'none';
            if (markAllBtn) markAllBtn.style.display = 'none';
        }
        
        if (!notifications || notifications.length === 0) {
            list.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--s6); font-family: var(--font);">Không có thông báo mới</div>';
            return;
        }
        
        list.innerHTML = '';
        notifications.forEach(n => {
            var item = document.createElement('div');
            item.style.padding = '12px 16px';
            item.style.borderBottom = '1px solid var(--s3)';
            item.style.fontFamily = 'var(--font)';
            item.style.cursor = 'pointer';
            item.style.transition = 'background 0.2s';
            item.style.background = n.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)';
            
            item.onmouseover = () => item.style.background = 'var(--s3)';
            item.onmouseout = () => item.style.background = n.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)';
            
            var iconColor = n.type === 'WARNING' ? '#ef4444' : (n.type === 'INFO' ? '#3b82f6' : '#8b5cf6');
            var iconClass = n.type === 'WARNING' ? 'fa-triangle-exclamation' : 'fa-bell';
            
            var dateObj = new Date(n.created_at);
            var dateStr = dateObj.toLocaleDateString('vi-VN') + ' ' + dateObj.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
            
            item.innerHTML = `
                <div style="display: flex; gap: 12px;">
                    <div style="color: ${iconColor}; font-size: 1.2rem; padding-top: 2px;"><i class="fa-solid ${iconClass}"></i></div>
                    <div>
                        <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 4px; color: var(--text-main, #1e293b);">${n.title}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted, #475569); line-height: 1.4;">${n.message}</div>
                        <div style="font-size: 0.75rem; color: var(--s8); margin-top: 6px;">${dateStr}</div>
                    </div>
                </div>
            `;
            
            if (!n.is_read) {
                item.onclick = function() {
                    var _l = atob('aHR0cDovLzEyNy4wLjAuMTo1MDAw');
                    var _p = atob('aHR0cHM6Ly92aXN1YWxpemF0aW9uLXJyNXYub25yZW5kZXIuY29t');
                    var API_BASE = (location.hostname === '127.0.0.1' || location.hostname === 'localhost') ? _l : _p;

                    fetch(API_BASE + `/api/notifications/${n.id}/read`, {
                        method: 'PUT',
                        headers: { 'Authorization': 'Bearer ' + token }
                    }).then(() => fetchNotifications());
                };
            }
            list.appendChild(item);
        });
    }
    
    var markAllBtn = document.getElementById('markAllReadBtn');
    if (markAllBtn) {
        markAllBtn.style.display = 'none';
    }
    
    fetchNotifications();
    setInterval(fetchNotifications, 5000); // Check every 5 seconds for immediate feedback during testing
});
// --- End Notification System ---
"""

js = re.sub(r'// --- Notification System ---.*// --- End Notification System ---', new_bell_logic, js, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(js)
