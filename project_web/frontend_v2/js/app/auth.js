// File: js/app/auth.js
// AuthGuard — Quản lý phiên đăng nhập, kiểm tra Token JWT, hỗ trợ Remember Me
window.AuthGuard = {

    // Giải mã payload JWT mà không cần thư viện bên ngoài
    _decodeJWT: function(token) {
        try {
            var parts = token.split('.');
            if (parts.length !== 3) return null;
            // Base64url → Base64 → decode
            var payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            var decoded = atob(payload);
            return JSON.parse(decoded);
        } catch (e) {
            return null;
        }
    },

    // Lấy Token từ storage (ưu tiên sessionStorage trước, rồi localStorage)
    getToken: function() {
        return sessionStorage.getItem('user_token') || localStorage.getItem('user_token');
    },

    // Kiểm tra đăng nhập: Token phải tồn tại VÀ chưa hết hạn
    isLoggedIn: function() {
        var token = this.getToken();
        if (!token) return false;

        var payload = this._decodeJWT(token);
        if (!payload || !payload.exp) {
            this.clearSession();
            return false;
        }

        // So sánh thời gian hết hạn (đơn vị giây) với hiện tại
        var nowSec = Math.floor(Date.now() / 1000);
        if (payload.exp < nowSec) {
            // Token đã hết hạn → dọn sạch phiên đăng nhập
            this.clearSession();
            return false;
        }
        return true;
    },

    // Xóa sạch toàn bộ dữ liệu phiên đăng nhập
    clearSession: function() {
        sessionStorage.removeItem('user_token');
        localStorage.removeItem('user_token');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_avatar');
        localStorage.removeItem('locale');
    },

    // Lưu Token vào storage tùy theo lựa chọn Remember Me
    saveToken: function(token, remember) {
        if (remember) {
            localStorage.setItem('user_token', token);
            sessionStorage.removeItem('user_token');
        } else {
            sessionStorage.setItem('user_token', token);
            localStorage.removeItem('user_token');
        }
    },

    requireAuth: function(callback) {
        if (this.isLoggedIn()) {
            callback();
        } else {
            this.showLoginPrompt();
        }
    },

    showLoginPrompt: function() {
        if (typeof window.Modal !== 'undefined') {
            window.Modal.show({
                title: '<i class="ph ph-lock"></i> ' + (window.tr ? window.tr("auth.login_required_title", "Yêu cầu Đăng nhập") : "Yêu cầu Đăng nhập"),
                message: window.tr ? window.tr("auth.login_required_msg", "Tính năng này yêu cầu tài khoản Vectoria.<br><br>Bạn có muốn chuyển đến trang Đăng nhập?") : 'Tính năng này yêu cầu tài khoản Vectoria.<br><br>Bạn có muốn chuyển đến trang Đăng nhập?',
                confirmText: window.tr ? window.tr("auth.go_login", "Đến Đăng nhập") : 'Đến Đăng nhập',
                confirmClass: 'btn-primary',
                onConfirm: function() {
                    sessionStorage.setItem('redirect_after_login', window.location.href);
                    window.location.href = 'login.html';
                }
            });
        } else {
            if (typeof App !== 'undefined' && App.showToast) {
                App.showToast("Cần tài khoản. Vui lòng đăng nhập!", "warning");
            }
            if (window.App && window.App.showConfirm) {
                window.App.showConfirm("Tính năng này yêu cầu tài khoản Vectoria.<br><br>Bạn có muốn chuyển đến trang Đăng nhập?", function() {
                    sessionStorage.setItem('redirect_after_login', window.location.href);
                    window.location.href = 'login.html';
                });
            } else {
                sessionStorage.setItem('redirect_after_login', window.location.href);
                window.location.href = 'login.html';
            }
        }
    }
};