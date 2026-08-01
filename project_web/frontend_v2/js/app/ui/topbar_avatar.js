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
            themeBtn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
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
            const initial = userName.charAt(0).toUpperCase();

            if (savedAvatar) {
                topAvatarBtn.innerHTML = "";
                topAvatarBtn.style.backgroundImage = `url(${savedAvatar})`;
                topAvatarBtn.style.backgroundSize = "cover";
                topAvatarBtn.style.backgroundPosition = "center";
            } else {
                topAvatarBtn.innerHTML = initial;
                topAvatarBtn.style.backgroundImage = "none";
            }

            menuAva.innerHTML = `
              <div class="avatar-edit-wrapper" style="text-align: center; margin-bottom: 10px; position: relative; width: 64px; height: 64px; margin: 0 auto 10px;">
                  <div class="user-avatar-lg" style="width: 64px; height: 64px; border-radius: 50%; background: var(--primary-base); color: white; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; ${savedAvatar ? `background-image: url(${savedAvatar}); background-size: cover; background-position: center; font-size:0;` : ''}">${savedAvatar ? '' : initial}</div>
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
            topAvatarBtn.innerHTML = '<i class="fa-solid fa-user-secret"></i>';
            topAvatarBtn.style.background = "var(--bg-card, #ffffff)";
            topAvatarBtn.style.color = "var(--slate-11, #475569)";
            topAvatarBtn.style.border = "1px solid var(--border-strong, #cbd5e1)";
            topAvatarBtn.style.backgroundImage = "none";

            menuAva.innerHTML = `
              <div style="padding: 20px; text-align: center;">
                  <div style="width: 50px; height: 50px; border-radius: 50%; background: var(--bg-hover, #f1f5f9); border: 1px solid var(--border-strong, #cbd5e1); display: flex; align-items: center; justify-content: center; font-size: 24px; color: var(--slate-11, #475569); margin: 0 auto 10px;">
                      <i class="fa-solid fa-user-secret"></i>
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

    handleUpload: function(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            if (window.Modal) window.Modal.show({ title: 'Lỗi tải ảnh', message: 'Vui lòng chọn ảnh < 2MB.', hideCancel: true });
            else alert('Vui lòng chọn ảnh < 2MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            localStorage.setItem("user_avatar", e.target.result);
            this.updateUI();
            // Try to sync with Dashboard's updateAuthUI if it exists
            if (typeof updateAuthUI === 'function') updateAuthUI();
        };
        reader.readAsDataURL(file);
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
            alert('Tính năng chuyển đổi nhanh nhiều tài khoản sắp ra mắt!');
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
