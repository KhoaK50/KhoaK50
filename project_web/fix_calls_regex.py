import re

file_path = 'D:/Programming_language/project_web/frontend_v2/login.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Chào mừng -> Đăng nhập thành công
content = re.sub(
    r'showToast\(Ch.o m.ng, \$\{data\.display_name\}\., true\);',
    r'showToast(Chào mừng, ., true, "Đăng nhập thành công");',
    content
)

# Đang khôi phục phiên làm việc -> Phiên làm việc
content = re.sub(
    r'showToast\("..ang kh.i ph.c phi.n l.m vi.c\.", true\);',
    r'showToast("Đang khôi phục phiên làm việc.", true, "Phiên làm việc");',
    content
)

# Xác thực hoàn tất -> Kích hoạt tài khoản
content = re.sub(
    r'showToast\("X.c th.c ho.n t.t\. Tab n.y s. t. ..ng\.", true\);',
    r'showToast("Xác thực hoàn tất. Tab này sẽ tự đóng.", true, "Kích hoạt tài khoản");',
    content
)

# Đã xác thực thành công -> Kích hoạt tài khoản
content = re.sub(
    r'showToast\(".. x.c th.c th.nh c.ng\. Vui l.ng ..ng nh.p\.", true\);',
    r'showToast("Đã xác thực thành công. Vui lòng đăng nhập.", true, "Kích hoạt tài khoản");',
    content
)

# Mật khẩu đã được thay đổi -> Đặt lại mật khẩu
content = re.sub(
    r'showToast\("M.t kh.u .. ..ợc thay ..i\. Vui l.ng ..ng nh.p\.", true\);',
    r'showToast("Mật khẩu đã được thay đổi. Vui lòng đăng nhập.", true, "Đặt lại mật khẩu");',
    content
)

# Đang xác thực với Google -> Đang kết nối
content = re.sub(
    r'showToast\("..ang x.c th.c v.i Google\.", true\);',
    r'showToast("Đang xác thực với Google.", true, "Đang kết nối");',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Regex calls update done")
