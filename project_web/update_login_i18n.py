import re

file_path = 'D:/Programming_language/project_web/frontend_v2/login.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace hardcoded strings with data-i18n
replacements = [
    # Topbar - already uses some? Wait, let's inject i18n script first.
    ('</body>', '<script src="js/utils/i18n.js"></script>\n</body>'),
    
    # UI Texts
    ('<h2>Chào mừng trở lại</h2>', '<h2 data-i18n="auth.welcome_back">Chào mừng trở lại</h2>'),
    ('<p>Đăng nhập để đồng bộ dữ liệu</p>', '<p data-i18n="auth.login_to_sync">Đăng nhập để đồng bộ dữ liệu</p>'),
    ('Bạn chưa có tài khoản?', '<span data-i18n="auth.no_account">Bạn chưa có tài khoản?</span>'),
    ('>Đăng ký ngay</a>', ' data-i18n="auth.register_now">Đăng ký ngay</a>'),
    
    ('<h2>Khởi tạo tài khoản</h2>', '<h2 data-i18n="auth.create_account">Khởi tạo tài khoản</h2>'),
    ('<p>Đăng ký để trải nghiệm đầy đủ tính năng</p>', '<p data-i18n="auth.register_desc">Đăng ký để trải nghiệm đầy đủ tính năng</p>'),
    ('Đã có tài khoản?', '<span data-i18n="auth.have_account">Đã có tài khoản?</span>'),
    ('>Đăng nhập</a>', ' data-i18n="auth.login_now">Đăng nhập</a>'),
    
    ('<label>Tên hiển thị</label>', '<label data-i18n="auth.display_name">Tên hiển thị</label>'),
    ('<label>Email đăng nhập</label>', '<label data-i18n="auth.email_login">Email đăng nhập</label>'),
    ('<label>Email đăng ký</label>', '<label data-i18n="auth.email_register">Email đăng ký</label>'),
    ('<label>Mật khẩu</label>', '<label data-i18n="auth.password">Mật khẩu</label>'),
    ('<span>Ghi nhớ tôi</span>', '<span data-i18n="auth.remember_me">Ghi nhớ tôi</span>'),
    ('>Quên mật khẩu?</a>', ' data-i18n="auth.forgot_password_link">Quên mật khẩu?</a>'),
    
    ('>Đăng nhập <i class="fa-solid fa-arrow-right-to-bracket"></i></button>', ' data-i18n="auth.login_btn">Đăng nhập <i class="fa-solid fa-arrow-right-to-bracket"></i></button>'),
    ('>Đăng ký <i class="fa-solid fa-user-plus"></i></button>', ' data-i18n="auth.register_btn">Đăng ký <i class="fa-solid fa-user-plus"></i></button>'),
    
    ('<span>HOẶC</span>', '<span data-i18n="auth.or_text">HOẶC</span>'),
    ('<span>Tiếp tục với Google</span>', '<span data-i18n="auth.continue_google">Tiếp tục với Google</span>'),
    
    ('<h2>Khôi phục mật khẩu</h2>', '<h2 data-i18n="auth.reset_password_title">Khôi phục mật khẩu</h2>'),
    ('<p>Nhập email của bạn, chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.</p>', '<p data-i18n="auth.reset_password_desc">Nhập email của bạn, chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.</p>'),
    ('>Gửi liên kết <i class="fa-solid fa-paper-plane"></i></button>', ' data-i18n="auth.send_link">Gửi liên kết <i class="fa-solid fa-paper-plane"></i></button>'),
    ('>Quay lại đăng nhập</a>', ' data-i18n="auth.back_to_login">Quay lại đăng nhập</a>'),
]

for old, new in replacements:
    content = content.replace(old, new)

# Update Javascript Toast Logic
js_replacements = [
    # showToast function
    ('title.innerText = customTitle ? customTitle : (isSuccess ? "Thông báo" : "Có lỗi xảy ra");',
     'title.innerText = customTitle ? customTitle : (isSuccess ? (window.tr ? tr("auth.toast_notice", "Thông báo") : "Thông báo") : (window.tr ? tr("auth.toast_error", "Có lỗi xảy ra") : "Có lỗi xảy ra"));'),
    
    # login toasts
    ('showToast(Chào mừng, ., true, "Đăng nhập thành công");',
     'showToast(window.tr ? ${tr("auth.welcome_back", "Chào mừng")}, . : Chào mừng, ., true, window.tr ? tr("auth.toast_login_success", "Đăng nhập thành công") : "Đăng nhập thành công");'),
    
    ('showToast("Không thể kết nối đến máy chủ.", false);',
     'showToast(window.tr ? tr("auth.toast_server_error", "Không thể kết nối đến máy chủ.") : "Không thể kết nối đến máy chủ.", false);'),
     
    ('showToast("Đang khôi phục phiên làm việc.", true, "Phiên làm việc");',
     'showToast(window.tr ? tr("auth.toast_session", "Đang khôi phục phiên làm việc.") : "Đang khôi phục phiên làm việc.", true, window.tr ? tr("auth.toast_session", "Phiên làm việc") : "Phiên làm việc");'),
     
    # verify logic
    ('showToast("Xác thực hoàn tất. Tab này sẽ tự đóng.", true, "Tài khoản đã kích hoạt");',
     'showToast(window.tr ? tr("auth.toast_account_activated", "Xác thực hoàn tất. Tab này sẽ tự đóng.") : "Xác thực hoàn tất. Tab này sẽ tự đóng.", true, window.tr ? tr("auth.toast_account_activated", "Kích hoạt tài khoản") : "Kích hoạt tài khoản");'),
     
    ('const msgs = {\n              \'invalid_token\': "Mã xác thực không hợp lệ hoặc đã hết hạn!",\n              \'already_activated\': "Tài khoản này đã được kích hoạt trước đó!",\n              \'server_error\': "Lỗi máy chủ trong quá trình xác thực!"\n          };',
     'const msgs = {\n              \'invalid_token\': window.tr ? tr("auth.err_invalid_token", "Mã xác thực không hợp lệ hoặc đã hết hạn!") : "Mã xác thực không hợp lệ hoặc đã hết hạn!",\n              \'already_activated\': window.tr ? tr("auth.err_already_activated", "Tài khoản này đã được kích hoạt trước đó!") : "Tài khoản này đã được kích hoạt trước đó!",\n              \'server_error\': window.tr ? tr("auth.err_server_auth", "Lỗi máy chủ trong quá trình xác thực!") : "Lỗi máy chủ trong quá trình xác thực!"\n          };'),
     
    ('showToast(msgs[errorMsg] || "Lỗi xác thực.", false);',
     'showToast(msgs[errorMsg] || (window.tr ? tr("auth.toast_error", "Lỗi xác thực.") : "Lỗi xác thực."), false);'),
     
    # google auth
    ('showToast("Đang xác thực với Google.", true, "Đang kết nối");',
     'showToast(window.tr ? tr("auth.toast_connecting", "Đang xác thực với Google.") : "Đang xác thực với Google.", true, window.tr ? tr("auth.toast_connecting", "Đang kết nối") : "Đang kết nối");'),
     
    ('showToast("Không thể kết nối qua Google.", false);',
     'showToast(window.tr ? tr("auth.toast_server_error", "Không thể kết nối qua Google.") : "Không thể kết nối qua Google.", false);'),
     
    # register
    ('showToast("Thông tin đăng ký không hợp lệ.", false);',
     'showToast(window.tr ? tr("auth.toast_invalid_info", "Thông tin đăng ký không hợp lệ.") : "Thông tin đăng ký không hợp lệ.", false);'),
     
    ('showToast("Google chưa sẵn sàng, vui lòng thử lại.", false);',
     'showToast(window.tr ? tr("auth.toast_google_not_ready", "Google chưa sẵn sàng, vui lòng thử lại.") : "Google chưa sẵn sàng, vui lòng thử lại.", false);'),
]

for old, new in js_replacements:
    content = content.replace(old, new)

# One more for forgot password / URL errors
content = content.replace('showToast("Đã xác thực thành công. Vui lòng đăng nhập.", true, "Xác thực thành công");',
 'showToast(window.tr ? tr("auth.toast_account_activated", "Đã xác thực thành công. Vui lòng đăng nhập.") : "Đã xác thực thành công. Vui lòng đăng nhập.", true, window.tr ? tr("auth.toast_account_activated", "Xác thực thành công") : "Xác thực thành công");')

content = content.replace('showToast("Mật khẩu đã được thay đổi. Vui lòng đăng nhập.", true, "Thay đổi mật khẩu");',
 'showToast(window.tr ? tr("auth.toast_reset_password", "Mật khẩu đã được thay đổi. Vui lòng đăng nhập.") : "Mật khẩu đã được thay đổi. Vui lòng đăng nhập.", true, window.tr ? tr("auth.toast_reset_password", "Thay đổi mật khẩu") : "Thay đổi mật khẩu");')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated login.html with i18n")
