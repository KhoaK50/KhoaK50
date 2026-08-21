import re

file_path = 'D:/Programming_language/project_web/frontend_v2/login.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Instead of exact replace, use regex for the function signature
content = re.sub(
    r'function showToast\(message, isSuccess = true\) \{',
    r'function showToast(message, isSuccess = true, customTitle = null) {',
    content
)

content = re.sub(
    r'title\.innerText = isSuccess \? "Thông báo" : "Có lỗi xảy ra";',
    r'title.innerText = customTitle ? customTitle : (isSuccess ? "Thông báo" : "Có lỗi xảy ra");',
    content
)

replacements = [
    ('showToast(Chào mừng, ., true);', 'showToast(Chào mừng, ., true, "Đăng nhập thành công");'),
    ('showToast("Đang khôi phục phiên làm việc.", true);', 'showToast("Đang khôi phục phiên làm việc.", true, "Phiên làm việc");'),
    ('showToast("Xác thực hoàn tất. Tab này sẽ tự đóng.", true);', 'showToast("Xác thực hoàn tất. Tab này sẽ tự đóng.", true, "Kích hoạt tài khoản");'),
    ('showToast("Đã xác thực thành công. Vui lòng đăng nhập.", true);', 'showToast("Đã xác thực thành công. Vui lòng đăng nhập.", true, "Kích hoạt tài khoản");'),
    ('showToast("Mật khẩu đã được thay đổi. Vui lòng đăng nhập.", true);', 'showToast("Mật khẩu đã được thay đổi. Vui lòng đăng nhập.", true, "Đặt lại mật khẩu");'),
    ('showToast("Đang xác thực với Google.", true);', 'showToast("Đang xác thực với Google.", true, "Đang kết nối");')
]

for old, new in replacements:
    content = content.replace(old, new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Regex update done")
