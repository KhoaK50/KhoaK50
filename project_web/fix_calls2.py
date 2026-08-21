import re

file_path = 'D:/Programming_language/project_web/frontend_v2/login.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'showToast\([^]+display_name[^]+, true\);',
    r'showToast(Chào mừng, ., true, "Đăng nhập thành công");',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
