import sys

path = "D:/Programming_language/project_web/frontend_v2/knowledge_info.html"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

bell_html = """
          <div class="vec-dropdown-container right-align" id="notificationDropdownContainer" style="display: none;">
            <button class="vec-icon-btn" title="Thông báo" id="notificationBellBtn" style="position: relative;">
              <i class="fa-solid fa-bell"></i>
              <span id="unreadBadge" style="display: none; position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; background-color: #ef4444; border-radius: 50%; box-shadow: 0 0 0 2px var(--s2);"></span>
            </button>
            <div class="vec-dropdown-menu" id="notificationMenu" style="min-width: 320px; max-height: 400px; overflow-y: auto; padding: 0;">
              <div style="padding: 12px 16px; border-bottom: 1px solid var(--s3); font-weight: 600; font-family: var(--font); display: flex; justify-content: space-between; align-items: center;">
                <span>Thông báo</span>
                <button id="markAllReadBtn" style="font-size: 0.8em; color: var(--b9); background: none; border: none; cursor: pointer; display: none;">Đánh dấu đã đọc</button>
              </div>
              <div id="notificationList">
                <div style="padding: 16px; text-align: center; color: var(--s6); font-family: var(--font);">Không có thông báo mới</div>
              </div>
            </div>
          </div>
"""

target = '<div class="vec-dropdown-container right-align">\n          <button class="vec-icon-btn" title="Ngôn ngữ">'
if "notificationBellBtn" not in html:
    html = html.replace(target, bell_html + target)

js_logic = """
// --- Notification System ---
document.addEventListener('DOMContentLoaded', function() {
    var token = localStorage.getItem('user_token');
    if (!token) return; // Not logged in
    
    var notifContainer = document.getElementById('notificationDropdownContainer');
    if (notifContainer) notifContainer.style.display = 'inline-block';
    
    function fetchNotifications() {
        fetch('https://visualization-rr5v.onrender.com/api/notifications', {
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
                    fetch(`https://visualization-rr5v.onrender.com/api/notifications/${n.id}/read`, {
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
            fetch('https://visualization-rr5v.onrender.com/api/notifications/read-all', {
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

if "// --- Notification System ---" not in html:
    html = html.replace('</script>\n</body>', js_logic + '\n</script>\n</body>')

with open(path, "w", encoding="utf-8") as f:
    f.write(html)
