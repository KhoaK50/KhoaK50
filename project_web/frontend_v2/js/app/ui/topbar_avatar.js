window.TopbarAvatar = {
    init: function() {
        const topAvatarBtn = document.getElementById("btnTopAvatar");
        const menuAva = document.getElementById("menuTopAvatar");
        if (!topAvatarBtn || !menuAva) return;

        // Toggle avatar dropdown
        topAvatarBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            menuAva.classList.toggle("show");
        });

        // Close when clicking outside
        document.addEventListener("click", (e) => {
            if (!menuAva.contains(e.target) && e.target !== topAvatarBtn) {
                menuAva.classList.remove("show");
            }
        });

        this.updateUI();

    // Add global theme toggle logic
    const themeBtn = document.getElementById("themeToggleBtn");
    if (themeBtn) {
        // Sync icon on load
        const syncIcon = () => {
            const isDark = typeof ThemeManager !== "undefined" ? ThemeManager.isDarkMode() : document.body.classList.contains("dark-theme");
            
        };
        syncIcon();
        
        themeBtn.addEventListener("click", () => {
            if (typeof ThemeManager !== "undefined") {
                const isDark = ThemeManager.toggle();
                syncIcon();            } else {
                document.body.classList.toggle("dark-theme");
                document.body.classList.toggle("dark");
                syncIcon();
            }
        });
    }

        this.highlightActiveLink();
    },

    
    highlightActiveLink: function() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        
        const links = document.querySelectorAll('.vec-nav-link');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href === page) {
                link.classList.add('active');
            }
        });
    },

    updateUI: function() {
        const topAvatarBtn = document.getElementById("btnTopAvatar");
        const menuAva = document.getElementById("menuTopAvatar");
        if (!topAvatarBtn || !menuAva) return;

        const isLoggedIn = window.AuthGuard && window.AuthGuard.isLoggedIn();
        const savedAvatar = localStorage.getItem("user_avatar");

        if (isLoggedIn) {
            const userName = localStorage.getItem("user_name") || "Người dùng";
            
            if (savedAvatar) {
                topAvatarBtn.innerHTML = "";
                topAvatarBtn.style.backgroundImage = `url(${savedAvatar})`;
                topAvatarBtn.style.backgroundSize = "cover";
                topAvatarBtn.style.backgroundPosition = "center";
                topAvatarBtn.style.backgroundColor = "transparent";
                topAvatarBtn.style.color = "transparent";
            } else {
                topAvatarBtn.innerHTML = '<i class="fa-solid fa-user"></i>';
                topAvatarBtn.style.backgroundImage = "none";
                topAvatarBtn.style.backgroundColor = "var(--bg-hover, #f1f5f9)";
                topAvatarBtn.style.color = "var(--slate-11, #475569)";
            }

            menuAva.innerHTML = `
              <div class="avatar-edit-wrapper" style="text-align: center; margin-bottom: 10px; position: relative; width: 64px; height: 64px; margin: 0 auto 10px;">
                  <div id="dropdownUserAvatar" class="user-avatar-lg" style="width: 64px; height: 64px; border-radius: 50%; background: var(--bg-hover, #f1f5f9); color: var(--slate-11, #475569); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; border: 1px solid var(--border-strong, #cbd5e1); ${savedAvatar ? `background-image: url(${savedAvatar}); background-size: cover; background-position: center; border: none; font-size:0;` : ''}">${savedAvatar ? '' : '<i class="fa-solid fa-user"></i>'}</div>
                  <label for="topbarAvatarUpload" style="position: absolute; bottom: 0; right: -5px; background: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2); color: var(--slate-11);">
                      <i class="fa-solid fa-camera" style="font-size: 10px;"></i>
                  </label>
                  <input type="file" id="topbarAvatarUpload" accept="image/*" hidden onchange="window.TopbarAvatar.handleUpload(event)">
              </div>
              <div style="text-align: center; font-weight: 600; font-size: 16px; margin-bottom: 5px; color: var(--text-main);">
                  <span>${userName}</span>
                  <i class="fa-solid fa-pen-to-square" style="cursor: pointer; color: var(--slate-11); margin-left: 5px; font-size: 14px;" title="Đổi tên" onclick="window.TopbarAvatar.changeName()"></i>
              </div>
              
              <div style="text-align: center; color: var(--slate-11); font-size: 11px; margin-bottom: 15px;" data-i18n="avatar.name_changes">Còn 2 lượt đổi tên trong tháng</div>
              <div class="dropdown-divider" style="height: 1px; background: var(--border-light, #e2e8f0); margin: 15px 0;"></div>
              
              <div class="dropdown-item" style="padding: 10px 15px; cursor: pointer; display: flex; align-items: center; gap: 10px; color: var(--text-main); font-weight: 500; transition: background 0.2s; border-radius: 6px;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'" onclick="window.TopbarAvatar.changeAccount()">
                  <i class="fa-solid fa-users-arrows-right" style="width: 20px; text-align: center; color: var(--slate-11);"></i> <span data-i18n="avatar.switch_account">Chuyển tài khoản</span>
              </div>
              <div class="dropdown-item" style="padding: 10px 15px; cursor: pointer; display: flex; align-items: center; gap: 10px; color: var(--danger-base, #ef4444); font-weight: 500; transition: background 0.2s; border-radius: 6px;" onmouseover="this.style.background='rgba(239, 68, 68, 0.1)'" onmouseout="this.style.background='transparent'" onclick="window.TopbarAvatar.logout()">
                  <i class="fa-solid fa-arrow-right-from-bracket" style="width: 20px; text-align: center;"></i> <span data-i18n="avatar.logout">Đăng xuất</span>
              </div>
            `;
        } else {
            topAvatarBtn.innerHTML = '<i class="fa-solid fa-user"></i>';
            topAvatarBtn.style.background = "var(--bg-card, #ffffff)";
            topAvatarBtn.style.color = "var(--slate-11, #475569)";
            topAvatarBtn.style.border = "1px solid var(--border-strong, #cbd5e1)";
            topAvatarBtn.style.backgroundImage = "none";

            menuAva.innerHTML = `
              <div style="padding: 20px; text-align: center;">
                  <div style="width: 50px; height: 50px; border-radius: 50%; background: var(--bg-hover, #f1f5f9); border: 1px solid var(--border-strong, #cbd5e1); display: flex; align-items: center; justify-content: center; font-size: 24px; color: var(--slate-11, #475569); margin: 0 auto 10px;">
                      <i class="fa-solid fa-user"></i>
                  </div>
                  <h3 style="margin: 0 0 5px; font-size: 16px; color: var(--text-main);" data-i18n="avatar.guest">Khách truy cập</h3>
                  <p style="margin: 0 0 15px; font-size: 13px; color: var(--slate-11);" data-i18n="avatar.guest_desc">Đăng nhập để lưu trữ kết quả và đồng bộ đám mây.</p>
                  <a href="login.html" style="display: block; width: 100%; padding: 8px 0; background: var(--primary-base, #2563eb); color: white; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; transition: background 0.2s;" data-i18n="avatar.login">
                      Đăng nhập ngay
                  </a>
              </div>
            `;
        }
        if (window.updateDOM) {
            window.updateDOM();
        }
    },

    handleUpload: async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            if (window.Modal) window.Modal.show({ title: 'Lỗi tải ảnh', message: 'Vui lòng chọn ảnh < 2MB.', hideCancel: true });
            else (window.App && window.App.showToast ? window.App.showToast('Vui lòng chọn ảnh < 2MB.', 'warning') : alert('Vui lòng chọn ảnh < 2MB.'));
            return;
        }

        const token = localStorage.getItem("user_token");
        if (!token) return;

        const avatarEl = document.getElementById("dropdownUserAvatar");
        if (avatarEl) {
            avatarEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="font-size: 24px;"></i>';
            avatarEl.style.backgroundImage = 'none';
        }

        const formData = new FormData();
        formData.append("file", file);

        const _l = atob("aHR0cDovLzEyNy4wLjAuMTo1MDAw");
        const _p = atob("aHR0cHM6Ly92aXN1YWxpemF0aW9uLXJyNXYub25yZW5kZXIuY29t");
        const API_BASE = (location.hostname === "127.0.0.1" || location.hostname === "localhost") ? _l : _p;

        try {
            const res = await fetch(`${API_BASE}/api/user/avatar`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });
            const data = await res.json();
            
            if (data.success && data.avatar_url) {
                // Thêm timestamp để bypass cache
                const newAvatar = data.avatar_url + "?v=" + Date.now();
                localStorage.setItem("user_avatar", newAvatar);
                this.updateUI();
                if (typeof updateAuthUI === 'function') updateAuthUI();
                if (typeof App !== 'undefined' && App.showToast) {
                    App.showToast("Cập nhật ảnh đại diện thành công!", "success");
                }
            } else {
                throw new Error(data.message || "Lỗi tải ảnh lên");
            }
        } catch (err) {
            console.error(err);
            if (window.Modal) window.Modal.show({ title: 'Lỗi tải ảnh', message: err.message, hideCancel: true });
            else (window.App && window.App.showToast ? window.App.showToast(err.message, 'warning') : alert(err.message));
            this.updateUI(); // Khôi phục UI cũ
        }
    },

    changeName: function() {
        if (window.Modal) {
            window.Modal.show({
                title: '<i class="fa-solid fa-pen"></i> Đổi tên hiển thị',
                message: 'Tên mới sẽ được cập nhật.',
                type: 'join_room', 
                confirmText: 'Lưu thay đổi',
                onConfirm: () => {
                    const newName = document.getElementById("modalInputRoom").value.trim();
                    if(newName.length > 2) {
                        localStorage.setItem("user_name", newName);
                        this.updateUI();
                        if (typeof updateAuthUI === 'function') updateAuthUI();
                    }
                }
            });
            setTimeout(() => {
                const label = document.getElementById("modalRoomLabel");
                if(label) label.textContent = "Nhập tên hiển thị mới:";
                const input = document.getElementById("modalInputRoom");
                if(input) { input.placeholder = "Ví dụ: Khoa"; input.value = localStorage.getItem("user_name") || ""; }
            }, 50);
        } else {
            const newName = prompt("Nhập tên hiển thị mới:", localStorage.getItem("user_name") || "");
            if (newName && newName.trim().length > 2) {
                localStorage.setItem("user_name", newName.trim());
                this.updateUI();
                if (typeof updateAuthUI === 'function') updateAuthUI();
            }
        }
    },

    changeAccount: function() {
        if (window.Modal) {
            window.Modal.show({title: 'Chuyển tài khoản', message: 'Tính năng chuyển đổi nhanh nhiều tài khoản sắp ra mắt!', hideCancel: true});
        } else {
            (window.App && window.App.showToast ? window.App.showToast('Tính năng chuyển đổi nhanh nhiều tài khoản sắp ra mắt!', 'warning') : alert('Tính năng chuyển đổi nhanh nhiều tài khoản sắp ra mắt!'));
        }
    },

    logout: function() {
        const doLogout = () => {
            localStorage.removeItem("user_token");
            localStorage.removeItem("user_name");
            localStorage.removeItem("user_email");
            window.location.reload();
        };

        if (window.Modal) {
            window.Modal.show({
                title: '<i class="fa-solid fa-power-off"></i> Đăng xuất',
                message: "Bạn có chắc chắn muốn đăng xuất khỏi thiết bị này?",
                confirmText: "Đăng xuất",
                confirmClass: "btn-danger",
                onConfirm: doLogout
            });
        } else {
            if (confirm("Bạn có chắc chắn muốn đăng xuất khỏi thiết bị này?")) {
                doLogout();
            }
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    window.TopbarAvatar.init();
});




// --- Notification System ---
document.addEventListener('DOMContentLoaded', function() {
    var token = localStorage.getItem('user_token');
    if (!token) return; // Not logged in
    
    var notifContainer = document.getElementById('notificationDropdownContainer');
    if (notifContainer) notifContainer.style.display = 'inline-flex';
    else return;
    
    var lastUnreadCount = -1;
    

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
        
        var iconColor = type === 'WARNING' ? 'var(--danger-base, #ef4444)' : 'var(--primary-base, #3b82f6)';
        var iconClass = type === 'WARNING' ? 'fa-triangle-exclamation' : 'fa-bell';
        var iconBg = type === 'WARNING' ? 'rgba(229, 72, 77, 0.1)' : 'rgba(0, 144, 255, 0.1)';
        
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
            list.innerHTML = `
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center;">
                <div style="width: 56px; height: 56px; background: var(--bg-hover, #f1f5f9); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; color: var(--text-muted, #94a3b8); font-size: 20px;">
                  <i class="fa-regular fa-bell-slash"></i>
                </div>
                <h4 style="margin: 0 0 4px 0; font-size: 1rem; color: var(--text-main, #0f172a); font-family: 'Lora', serif;">Chưa có thông báo nào</h4>
                <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted, #64748b);">Khi có hoạt động mới, thông báo sẽ hiển thị ở đây.</p>
              </div>
            `;
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

