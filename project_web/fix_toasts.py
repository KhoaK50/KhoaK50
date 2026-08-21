import re

file_path = 'D:/Programming_language/project_web/frontend_v2/login.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update showToast signature and title logic
old_func = '''function showToast(message, isSuccess = true) {
        const toast = document.getElementById("static-toast");
        const icon = toast.querySelector(".toast-icon");
        const title = document.getElementById("toastTitle");
        const desc = document.getElementById("toastMessage");
        const bar = toast.querySelector(".toast-bar");

        icon.className = isSuccess
          ? "fa-solid fa-circle-check toast-icon"
          : "fa-solid fa-circle-xmark toast-icon";
        icon.style.color = isSuccess ? "#2ecc71" : "#e74c3c";

        title.innerText = isSuccess ? "Thông báo" : "Có lỗi xảy ra";'''

new_func = '''function showToast(message, isSuccess = true, customTitle = null) {
        const toast = document.getElementById("static-toast");
        const icon = toast.querySelector(".toast-icon");
        const title = document.getElementById("toastTitle");
        const desc = document.getElementById("toastMessage");
        const bar = toast.querySelector(".toast-bar");

        icon.className = isSuccess
          ? "fa-solid fa-circle-check toast-icon"
          : "fa-solid fa-circle-xmark toast-icon";
        icon.style.color = isSuccess ? "#2ecc71" : "#e74c3c";

        title.innerText = customTitle ? customTitle : (isSuccess ? "Thông báo" : "Có lỗi xảy ra");'''

content = content.replace(old_func, new_func)

# 2. Update specific showToast calls to have meaningful titles
replacements = [
    ('showToast(Chào mừng, ., true);', 'showToast(Chào mừng, ., true, "Đăng nhập thành công");'),
    ('showToast("Đang khôi phục phiên làm việc.", true);', 'showToast("Đang khôi phục phiên làm việc.", true, "Phiên làm việc");'),
    ('showToast("Xác thực hoàn tất. Tab này sẽ tự đóng.", true);', 'showToast("Xác thực hoàn tất. Tab này sẽ tự đóng.", true, "Tài khoản đã kích hoạt");'),
    ('showToast("Đã xác thực thành công. Vui lòng đăng nhập.", true);', 'showToast("Đã xác thực thành công. Vui lòng đăng nhập.", true, "Xác thực thành công");'),
    ('showToast("Mật khẩu đã được thay đổi. Vui lòng đăng nhập.", true);', 'showToast("Mật khẩu đã được thay đổi. Vui lòng đăng nhập.", true, "Thay đổi mật khẩu");'),
    ('showToast("Đang xác thực với Google.", true);', 'showToast("Đang xác thực với Google.", true, "Đang kết nối");')
]

for old, new in replacements:
    content = content.replace(old, new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated login.html")
