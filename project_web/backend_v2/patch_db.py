import codecs

# 1. Update requirements.txt
req_path = r"D:\Programming_language\project_web\backend_v2\requirements.txt"
with codecs.open(req_path, "r", encoding="utf-16le") as f:
    reqs = f.read()

if "PyJWT" not in reqs:
    reqs += "\nPyJWT==2.8.0\n"
    with codecs.open(req_path, "w", encoding="utf-16le") as f:
        f.write(reqs)

# 2. Update user.py init_user_db()
user_py = r"D:\Programming_language\project_web\backend_v2\vectoria_api\routes\user.py"
with open(user_py, "r", encoding="utf-8") as f:
    content = f.read()

old_init = "        # 2. Bảng Lịch sử đăng nhập"
new_init = """        # Cập nhật thêm các cột mới cho tính năng Bảo mật JWT và Đa ngôn ngữ (nếu chưa có)
        c.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1;")
        c.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS language_pref VARCHAR(10) DEFAULT 'vi';")

        # 2. Bảng Lịch sử đăng nhập"""
content = content.replace(old_init, new_init)

with open(user_py, "w", encoding="utf-8") as f:
    f.write(content)
print("Done patching DB logic")
