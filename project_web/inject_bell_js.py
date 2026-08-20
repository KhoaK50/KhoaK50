import sys

path = 'D:/Programming_language/project_web/frontend_v2/js/app/ui/topbar_avatar.js'
with open(path, 'r', encoding='utf-8') as f:
    js = f.read()

bell_logic = """
// --- Notification System ---
document.addEventListener('DOMContentLoaded', function() {
    var token = localStorage.getItem('user_token');
    if (!token) return; // Not logged in
    
    var notifContainer = document.getElementById('notificationDropdownContainer');
    if (notifContainer) notifContainer.style.display = 'inline-block';
    else return;
    
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
                renderNotifications(data.notifications, data.unread_count);
            }
        })
        .catch(err => console.error('Error fetching notifications:', err));
    }
    
    function renderNotifications(notifications, unreadCount) {
        var badge = document.getElementById('unreadBadge');
        var list = document.getElementById('notificationList');
        var markAllBtn = document.getElementById('markAllReadBtn');
        
        if (unreadCount > 0) {
            badge.style.display = 'block';
            markAllBtn.style.display = 'block';
        } else {
            badge.style.display = 'none';
            markAllBtn.style.display = 'none';
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
                        <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 4px; color: var(--s12);">${n.title}</div>
                        <div style="font-size: 0.85rem; color: var(--s11); line-height: 1.4;">${n.message}</div>
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
        markAllBtn.onclick = function() {
            var _l = atob('aHR0cDovLzEyNy4wLjAuMTo1MDAw');
            var _p = atob('aHR0cHM6Ly92aXN1YWxpemF0aW9uLXJyNXYub25yZW5kZXIuY29t');
            var API_BASE = (location.hostname === '127.0.0.1' || location.hostname === 'localhost') ? _l : _p;

            fetch(API_BASE + '/api/notifications/read-all', {
                method: 'PUT',
                headers: { 'Authorization': 'Bearer ' + token }
            }).then(() => fetchNotifications());
        };
    }
    
    fetchNotifications();
    // Poll every 3 minutes
    setInterval(fetchNotifications, 180000);
});
// --- End Notification System ---
"""

if "// --- Notification System ---" not in js:
    with open(path, 'a', encoding='utf-8') as f:
        f.write('\n' + bell_logic)
