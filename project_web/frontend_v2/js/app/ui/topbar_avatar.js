window.TopbarAvatar = {
    init: function() {
        const topAvatarBtn = document.getElementById("btnTopAvatar");
        const menuAva = document.getElementById("menuTopAvatar");
        if (!topAvatarBtn || !menuAva) return;

        // Toggle avatar dropdown
        topAvatarBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            // Nếu đang hiện panel Switch Account, quay về menu chính trước
            var switchPanel = menuAva.querySelector('.switch-account-panel');
            if (switchPanel) switchPanel.remove();
            menuAva.classList.toggle("show");
        });

        // Close when clicking outside
        document.addEventListener("click", (e) => {
            if (!menuAva.contains(e.target) && e.target !== topAvatarBtn) {
                menuAva.classList.remove("show");
                // Reset về menu chính nếu đang ở panel Switch
                var switchPanel = menuAva.querySelector('.switch-account-panel');
                if (switchPanel) switchPanel.remove();
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

    // Tạo chữ cái đầu từ tên hiển thị
    _getInitial: function(name) {
        if (!name) return '?';
        var trimmed = name.trim();
        if (!trimmed) return '?';
        return trimmed.charAt(0).toUpperCase();
    },

    // Hash tên thành một màu nền đẹp (bảng màu Radix-inspired, tránh mặc định Tailwind)
    _getAvatarColor: function(name) {
        var palette = [
            '#e54666', '#d6409f', '#8e4ec6', '#6e56cf',
            '#3e63dd', '#0091ff', '#00a2c7', '#12a594',
            '#30a46c', '#978365', '#f76b15', '#e5484d'
        ];
        var hash = 0;
        for (var i = 0; i < (name || '').length; i++) {
            hash = (name || '').charCodeAt(i) + ((hash << 5) - hash);
        }
        return palette[Math.abs(hash) % palette.length];
    },

    // Tạo HTML cho avatar (dùng ảnh nếu có, dùng chữ cái nếu không)
    _renderAvatarHTML: function(name, avatarUrl, size) {
        size = size || 64;
        if (avatarUrl) {
            return '<div style="width:' + size + 'px; height:' + size + 'px; border-radius:50%; background-image:url(' + avatarUrl + '); background-size:cover; background-position:center;"></div>';
        }
        var initial = this._getInitial(name);
        var color = this._getAvatarColor(name);
        var fontSize = Math.round(size * 0.42);
        return '<div style="width:' + size + 'px; height:' + size + 'px; border-radius:50%; background:' + color + '; color:#fff; display:flex; align-items:center; justify-content:center; font-size:' + fontSize + 'px; font-weight:700; letter-spacing:0.5px; user-select:none;">' + initial + '</div>';
    },

    updateUI: function() {
        const topAvatarBtn = document.getElementById("btnTopAvatar");
        const menuAva = document.getElementById("menuTopAvatar");
        if (!topAvatarBtn || !menuAva) return;

        const isLoggedIn = window.AuthGuard && window.AuthGuard.isLoggedIn();
        const savedAvatar = localStorage.getItem("user_avatar");

        if (isLoggedIn) {
            const userName = localStorage.getItem("user_name") || "Người dùng";
            const userEmail = localStorage.getItem("user_email") || "";
            
            // Topbar button: Avatar ảnh hoặc chữ cái đầu
            if (savedAvatar) {
                topAvatarBtn.innerHTML = "";
                topAvatarBtn.style.backgroundImage = `url(${savedAvatar})`;
                topAvatarBtn.style.backgroundSize = "cover";
                topAvatarBtn.style.backgroundPosition = "center";
                topAvatarBtn.style.backgroundColor = "transparent";
                topAvatarBtn.style.color = "transparent";
            } else {
                var initial = this._getInitial(userName);
                var color = this._getAvatarColor(userName);
                topAvatarBtn.innerHTML = initial;
                topAvatarBtn.style.backgroundImage = "none";
                topAvatarBtn.style.backgroundColor = color;
                topAvatarBtn.style.color = "#fff";
                topAvatarBtn.style.fontWeight = "700";
                topAvatarBtn.style.fontSize = "14px";
                topAvatarBtn.style.letterSpacing = "0.5px";
                topAvatarBtn.style.border = "none";
            }

            // Dropdown menu
            var dropdownAvatarHTML = savedAvatar
                ? '<div id="dropdownUserAvatar" style="width:64px; height:64px; border-radius:50%; background-image:url(' + savedAvatar + '); background-size:cover; background-position:center;"></div>'
                : '<div id="dropdownUserAvatar" style="width:64px; height:64px; border-radius:50%; background:' + this._getAvatarColor(userName) + '; color:#fff; display:flex; align-items:center; justify-content:center; font-size:26px; font-weight:700; letter-spacing:0.5px;">' + this._getInitial(userName) + '</div>';

            menuAva.innerHTML = `
              <div class="avatar-edit-wrapper" style="text-align: center; margin-bottom: 10px; position: relative; width: 64px; height: 64px; margin: 0 auto 10px;">
                  ${dropdownAvatarHTML}
                  <label for="topbarAvatarUpload" style="position: absolute; bottom: 0; right: -5px; background: var(--bg-card, #fff); border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.18); color: var(--text-muted, #64748b); transition: transform 0.15s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                      <i class="ph ph-camera" style="font-size: 10px;"></i>
                  </label>
                  <input type="file" id="topbarAvatarUpload" accept="image/*" hidden onchange="window.TopbarAvatar.handleUpload(event)">
              </div>
              <div style="text-align: center; font-weight: 600; font-size: 16px; margin-bottom: 4px; color: var(--text-main);">
                  <span>${userName}</span>
                  <i class="ph ph-pencil-simple" style="cursor: pointer; color: var(--text-muted, #64748b); margin-left: 5px; font-size: 13px; transition: color 0.15s;" title="${window.tr ? window.tr("avatar.change_name", "Đổi tên") : "Đổi tên"}" onclick="window.TopbarAvatar.changeName()" onmouseover="this.style.color='var(--primary-base, #3b82f6)'" onmouseout="this.style.color='var(--text-muted, #64748b)'"></i>
              </div>
              ${userEmail ? '<div style="text-align: center; color: var(--text-muted, #64748b); font-size: 12px; margin-bottom: 12px;">' + userEmail + '</div>' : '<div style="margin-bottom: 12px;"></div>'}
              <div style="height: 1px; background: var(--border-subtle, #e2e8f0); margin: 0 0 8px;"></div>
              
              <div class="dropdown-item" style="padding: 9px 14px; cursor: pointer; display: flex; align-items: center; gap: 10px; color: var(--text-main); font-weight: 500; transition: background 0.15s; border-radius: 6px; font-size: 14px;" onmouseover="this.style.background='var(--bg-hover, #f1f5f9)'" onmouseout="this.style.background='transparent'" onclick="event.stopPropagation(); window.TopbarAvatar.showSwitchAccount()">
                  <i class="ph ph-arrows-left-right" style="width: 18px; text-align: center; color: var(--text-muted, #64748b); font-size: 13px;"></i> <span data-i18n="avatar.switch_account">${window.tr ? window.tr("avatar.switch_account", "Chuyển tài khoản") : "Chuyển tài khoản"}</span>
              </div>
              <div class="dropdown-item" style="padding: 9px 14px; cursor: pointer; display: flex; align-items: center; gap: 10px; color: var(--danger-base, #e5484d); font-weight: 500; transition: background 0.15s; border-radius: 6px; font-size: 14px;" onmouseover="this.style.background='rgba(229, 72, 77, 0.08)'" onmouseout="this.style.background='transparent'" onclick="window.TopbarAvatar.logout()">
                  <i class="ph ph-sign-out" style="width: 18px; text-align: center; font-size: 13px;"></i> <span data-i18n="avatar.logout">${window.tr ? window.tr("avatar.logout", "Đăng xuất") : "Đăng xuất"}</span>
              </div>
            `;
        } else {
            topAvatarBtn.innerHTML = '<i class="ph ph-user"></i>';
            topAvatarBtn.style.background = "var(--bg-card, #ffffff)";
            topAvatarBtn.style.color = "var(--slate-11, #475569)";
            topAvatarBtn.style.border = "1px solid var(--border-strong, #cbd5e1)";
            topAvatarBtn.style.backgroundImage = "none";
            topAvatarBtn.style.fontWeight = "normal";
            topAvatarBtn.style.fontSize = "";
            topAvatarBtn.style.letterSpacing = "";

            menuAva.innerHTML = `
              <div style="padding: 20px; text-align: center;">
                  <div style="width: 50px; height: 50px; border-radius: 50%; background: var(--bg-hover, #f1f5f9); border: 1px solid var(--border-strong, #cbd5e1); display: flex; align-items: center; justify-content: center; font-size: 24px; color: var(--text-muted, #64748b); margin: 0 auto 10px;">
                      <i class="ph ph-user"></i>
                  </div>
                  <h3 style="margin: 0 0 5px; font-size: 16px; color: var(--text-main);" data-i18n="avatar.guest">${window.tr ? window.tr("avatar.guest", "Chưa đăng nhập") : "Chưa đăng nhập"}</h3>
                  <p style="margin: 0 0 15px; font-size: 13px; color: var(--text-muted, #64748b);" data-i18n="avatar.guest_desc">${window.tr ? window.tr("avatar.guest_desc", "Đăng nhập để theo dõi và lưu trữ kết quả học tập.") : "Đăng nhập để lưu trữ kết quả và đồng bộ đám mây."}</p>
                  <a href="login.html" onclick="sessionStorage.setItem('redirect_after_login', window.location.href); window.location.href='login.html'; return false;" style="display: block; width: 100%; padding: 8px 0; background: var(--primary-base, #2563eb); color: white; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; transition: background 0.2s;" data-i18n="avatar.login">
                      ${window.tr ? window.tr("avatar.login", "Đăng nhập ngay") : "Đăng nhập ngay"}
                  </a>
              </div>
            `;
        }
        if (window.updateDOM) {
            window.updateDOM();
        }
    },

    // Hiển thị panel chuyển đổi tài khoản (slide-in bên trong dropdown)
    showSwitchAccount: function() {
        var menuAva = document.getElementById("menuTopAvatar");
        if (!menuAva) return;

        var accounts = [];
        try { accounts = JSON.parse(localStorage.getItem("saved_accounts") || "[]"); } catch(e) {}

        var currentEmail = localStorage.getItem("user_email") || "";

        menuAva.innerHTML = "";

        var panel = document.createElement('div');
        panel.className = 'switch-account-panel';
        panel.style.cssText = 'background:var(--bg-card, #fff); border-radius:inherit; display:flex; flex-direction:column; animation: fadeSlideIn 0.18s ease-out;';

        var header = document.createElement('div');
        header.style.cssText = 'display:flex; align-items:center; gap:8px; padding:12px 14px; border-bottom:1px solid var(--border-subtle, #e2e8f0);';
        header.innerHTML = '<i class="ph ph-arrow-left" style="cursor:pointer; color:var(--text-muted, #64748b); font-size:14px; padding:4px;" onclick="event.stopPropagation(); window.TopbarAvatar.updateUI()"></i><span style="font-weight:600; font-size:14px; color:var(--text-main);">' + (window.tr ? window.tr("avatar.switch_account", "Chuyển tài khoản") : "Chuyển tài khoản") + '</span>';
        panel.appendChild(header);

        var listContainer = document.createElement('div');
        listContainer.style.cssText = 'flex:1; overflow-y:auto; padding:6px 0; max-height: 300px;';

        var self = this;

        if (accounts.length === 0) {
            listContainer.innerHTML = '<div style="padding:24px 16px; text-align:center; color:var(--text-muted, #64748b); font-size:13px;"><i class="ph ph-user-circle" style="font-size:28px; display:block; margin-bottom:8px; opacity:0.5;"></i>' + (window.tr ? window.tr("avatar.no_saved_accounts", "Chưa có tài khoản nào được lưu.") : "Chưa có tài khoản nào được lưu.") + '</div>';
        } else {
            accounts.forEach(function(acc) {
                var isCurrent = (acc.email === currentEmail);
                var item = document.createElement('div');
                item.style.cssText = 'display:flex; align-items:center; gap:10px; padding:10px 14px; cursor:' + (isCurrent ? 'default' : 'pointer') + '; transition:background 0.12s; border-radius:0;' + (isCurrent ? ' background:rgba(59,130,246,0.06);' : '');
                if (!isCurrent) {
                    item.onmouseover = function() { this.style.background = 'var(--bg-hover, #f1f5f9)'; };
                    item.onmouseout = function() { this.style.background = 'transparent'; };
                    item.onclick = function() { self.switchToAccount(acc); };
                }

                var avatarSmall = self._renderAvatarHTML(acc.name, acc.avatar, 36);

                item.innerHTML = avatarSmall +
                    '<div style="flex:1; min-width:0;">' +
                        '<div style="font-weight:600; font-size:13px; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + (acc.name || 'Người dùng') + '</div>' +
                        '<div style="font-size:11px; color:var(--text-muted, #64748b); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + (acc.email || '') + '</div>' +
                    '</div>' +
                    (isCurrent ? '<i class="ph ph-check-circle" style="color:var(--primary-base, #3b82f6); font-size:14px; flex-shrink:0;"></i>' : '');

                listContainer.appendChild(item);
            });
        }
        panel.appendChild(listContainer);

        var addBtn = document.createElement('div');
        addBtn.style.cssText = 'padding:12px 14px; display:flex; align-items:center; gap:8px; cursor:pointer; color:var(--primary-base, #3b82f6); font-weight:500; font-size:13px; border-top:1px solid var(--border-subtle, #e2e8f0); transition:background 0.15s;';
        addBtn.onmouseover = function() { this.style.background = 'var(--bg-hover, #f1f5f9)'; };
        addBtn.onmouseout = function() { this.style.background = 'transparent'; };
        addBtn.onclick = function() { window.location.href = 'login.html?add_account=1'; };
        addBtn.innerHTML = '<i class="ph ph-plus"></i> ' + (window.tr ? window.tr("avatar.add_account", "Thêm tài khoản") : "Thêm tài khoản");
        panel.appendChild(addBtn);

        if (!document.getElementById('switch-account-styles')) {
            var style = document.createElement('style');
            style.id = 'switch-account-styles';
            style.textContent = '@keyframes fadeSlideIn { from { opacity:0; transform:translateX(8px); } to { opacity:1; transform:translateX(0); } }';
            document.head.appendChild(style);
        }

        menuAva.appendChild(panel);
    },
    
    switchToAccount: function(acc) {
        if (!acc || !acc.token) return;

        // Lưu token mới (luôn remember vì acc đã lưu trong saved_accounts)
        if (window.AuthGuard && window.AuthGuard.saveToken) {
            window.AuthGuard.saveToken(acc.token, true);
        } else {
            localStorage.setItem("user_token", acc.token);
        }
        localStorage.setItem("user_name", acc.name || "Người dùng");
        localStorage.setItem("user_email", acc.email || "");
        if (acc.avatar) {
            localStorage.setItem("user_avatar", acc.avatar);
        } else {
            localStorage.removeItem("user_avatar");
        }

        window.location.reload();
    },

    handleUpload: async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            if (window.Modal) window.Modal.show({ title: 'Lỗi tải ảnh', message: 'Vui lòng chọn ảnh < 2MB.', hideCancel: true });
            else window.App.showToast('Vui lòng chọn ảnh < 2MB.', 'warning');
            return;
        }

        var token = (window.AuthGuard && window.AuthGuard.getToken) ? window.AuthGuard.getToken() : localStorage.getItem("user_token");
        if (!token) return;

        const avatarEl = document.getElementById("dropdownUserAvatar");
        if (avatarEl) {
            avatarEl.innerHTML = '<i class="ph ph-spinner ph-spin" style="font-size: 24px;"></i>';
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
                const newAvatar = data.avatar_url + "?v=" + Date.now();
                localStorage.setItem("user_avatar", newAvatar);

                // Cập nhật luôn trong saved_accounts
                try {
                    var email = localStorage.getItem("user_email");
                    var accounts = JSON.parse(localStorage.getItem("saved_accounts") || "[]");
                    var idx = accounts.findIndex(function(a) { return a.email === email; });
                    if (idx > -1) { accounts[idx].avatar = newAvatar; localStorage.setItem("saved_accounts", JSON.stringify(accounts)); }
                } catch(e) {}

                this.updateUI();
                if (typeof updateAuthUI === 'function') updateAuthUI();
                if (typeof App !== 'undefined' && App.showToast) {
                    App.showToast(window.tr ? window.tr("avatar.upload_success", "Cập nhật ảnh đại diện thành công!") : "Cập nhật ảnh đại diện thành công!", "success");
                }
            } else {
                throw new Error(data.message || "Lỗi tải ảnh lên");
            }
        } catch (err) {
            console.error(err);
            if (window.Modal) window.Modal.show({ title: 'Lỗi tải ảnh', message: err.message, hideCancel: true });
            else window.App.showToast(err.message, 'warning');
            this.updateUI();
        }
    },

    changeName: function() {
        if (window.Modal) {
            window.Modal.show({
                title: '<i class="ph ph-pen"></i> ' + (window.tr ? window.tr("avatar.change_name_title", "Đổi tên hiển thị") : "Đổi tên hiển thị"),
                message: window.tr ? window.tr("avatar.change_name_desc", "Tên mới sẽ được cập nhật.") : "Tên mới sẽ được cập nhật.",
                type: 'join_room', 
                confirmText: window.tr ? window.tr("avatar.save_changes", "Lưu thay đổi") : "Lưu thay đổi",
                onConfirm: () => {
                    const newName = document.getElementById("modalInputRoom").value.trim();
                    if(newName.length > 2) {
                        localStorage.setItem("user_name", newName);

                        // Cập nhật luôn trong saved_accounts
                        try {
                            var email = localStorage.getItem("user_email");
                            var accounts = JSON.parse(localStorage.getItem("saved_accounts") || "[]");
                            var idx = accounts.findIndex(function(a) { return a.email === email; });
                            if (idx > -1) { accounts[idx].name = newName; localStorage.setItem("saved_accounts", JSON.stringify(accounts)); }
                        } catch(e) {}

                        this.updateUI();
                        if (typeof updateAuthUI === 'function') updateAuthUI();
                    }
                }
            });
            setTimeout(() => {
                const label = document.getElementById("modalRoomLabel");
                if(label) label.textContent = window.tr ? window.tr("avatar.enter_new_name", "Nhập tên hiển thị mới:") : "Nhập tên hiển thị mới:";
                const input = document.getElementById("modalInputRoom");
                if(input) { input.placeholder = "Ví dụ: Khoa"; input.value = localStorage.getItem("user_name") || ""; }
            }, 50);
        } else {
            const newName = prompt(window.tr ? window.tr("avatar.enter_new_name", "Nhập tên hiển thị mới:") : "Nhập tên hiển thị mới:", localStorage.getItem("user_name") || "");
            if (newName && newName.trim().length > 2) {
                localStorage.setItem("user_name", newName.trim());
                this.updateUI();
                if (typeof updateAuthUI === 'function') updateAuthUI();
            }
        }
    },

    logout: function() {
        const doLogout = () => {
            // Xóa tài khoản hiện tại khỏi saved_accounts
            try {
                var currentEmail = localStorage.getItem("user_email");
                var accounts = JSON.parse(localStorage.getItem("saved_accounts") || "[]");
                var filtered = accounts.filter(function(a) { return a.email !== currentEmail; });
                localStorage.setItem("saved_accounts", JSON.stringify(filtered));
            } catch(e) {}

            // Xóa phiên đăng nhập hiện tại
            if (window.AuthGuard && window.AuthGuard.clearSession) {
                window.AuthGuard.clearSession();
            } else {
                localStorage.removeItem("user_token");
                localStorage.removeItem("user_name");
                localStorage.removeItem("user_email");
                localStorage.removeItem("user_avatar");
            }
            localStorage.removeItem("locale");
            window.location.reload();
        };

        const msg = window.tr ? window.tr("auth.logout_confirm", "Bạn có chắc chắn muốn đăng xuất khỏi thiết bị này?") : "Bạn có chắc chắn muốn đăng xuất khỏi thiết bị này?";
        const title = window.tr ? window.tr("auth.logout", "Đăng xuất") : "Đăng xuất";
        
        if (window.Modal) {
            window.Modal.show({
                title: '<i class="ph ph-power-off"></i> ' + title,
                message: msg,
                confirmText: title,
                confirmClass: "btn-danger",
                onConfirm: doLogout
            });
        } else {
            if(window.App && window.App.showConfirm){window.App.showConfirm(msg, doLogout);}else{doLogout();}
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    window.TopbarAvatar.init();
});




// --- Notification System ---
document.addEventListener('DOMContentLoaded', function() {
    var token = (window.AuthGuard && window.AuthGuard.getToken) ? window.AuthGuard.getToken() : localStorage.getItem('user_token');
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
                    <i class="ph ph-x"></i>
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
        var freshToken = (window.AuthGuard && window.AuthGuard.getToken) ? window.AuthGuard.getToken() : localStorage.getItem('user_token');
        if (!freshToken) return;

        var _l = atob('aHR0cDovLzEyNy4wLjAuMTo1MDAw');
        var _p = atob('aHR0cHM6Ly92aXN1YWxpemF0aW9uLXJyNXYub25yZW5kZXIuY29t');
        var API_BASE = (location.hostname === '127.0.0.1' || location.hostname === 'localhost') ? _l : _p;

        fetch(API_BASE + '/api/notifications', {
            headers: { 'Authorization': 'Bearer ' + freshToken }
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
                  <i class="ph ph-bell-slash"></i>
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
                    var freshToken = (window.AuthGuard && window.AuthGuard.getToken) ? window.AuthGuard.getToken() : localStorage.getItem('user_token');

                    fetch(API_BASE + `/api/notifications/${n.id}/read`, {
                        method: 'PUT',
                        headers: { 'Authorization': 'Bearer ' + freshToken }
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
    setInterval(fetchNotifications, 60000);
});
// --- End Notification System ---
