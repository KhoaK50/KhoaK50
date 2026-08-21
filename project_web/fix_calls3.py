file_path = 'D:/Programming_language/project_web/frontend_v2/login.html'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "display_name" in line and "showToast" in line and "Đăng nhập" not in line:
        lines[i] = line.replace('true);', 'true, "Đăng nhập thành công");')
        break

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
