import re

file_path = r"D:\Programming_language\project_web\backend_v2\vectoria_api\routes\user.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update /api/register to capture language, save it, and send correct email template
reg_pattern = re.compile(r'    password = data\.get\("password"\)\n.*?send_auth_email\(email, "Kích hoạt tài khoản Vectoria", email_content\)', re.DOTALL)
reg_match = reg_pattern.search(content)

if reg_match:
    old_reg = reg_match.group(0)
    new_reg = """    password = data.get("password")
    language = data.get("language", "vi")

    if not display_name or not email or not password:
        return jsonify({"status": "error", "message": "Vui lòng điền đầy đủ thông tin!"}), 400

    hashed_password = generate_password_hash(password, method="pbkdf2:sha256")

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()
        
        # 1. Tạo tài khoản với language_pref
        c.execute(
            "INSERT INTO users (display_name, email, password_hash, language_pref) VALUES (%s, %s, %s, %s) RETURNING id",
            (display_name, email, hashed_password, language)
        )
        user_id = c.fetchone()[0]

        # 2. Tạo mã token kích hoạt bảo mật ngẫu nhiên
        activation_token = secrets.token_hex(20)

        # 3. Lưu token vào bảng accountactivations (hết hạn sau 24 giờ)
        c.execute(
            "INSERT INTO accountactivations (user_id, activation_token, expires_at) VALUES (%s, %s, CURRENT_TIMESTAMP + INTERVAL '24 hours')",
            (user_id, activation_token)
        )
        conn.commit()
        
        # 4. Gửi email kích hoạt
        activation_link = f"{FRONTEND_URL}/verify?token={activation_token}"
        
        if language == 'en':
            email_content = f\"\"\"
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #3a78ff;">Activate your Vectoria Account</h2>
                <p>Hello <b>{display_name}</b>,</p>
                <p>Thank you for registering. Please click the button below to activate your account:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{activation_link}" style="background-color: #3a78ff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Activate Account</a>
                </div>
                <p style="font-size: 12px; color: #888;">If the button doesn't work, copy and paste this link: <br>{activation_link}</p>
            </div>
            \"\"\"
            send_auth_email(email, "Activate your Vectoria Account", email_content)
        else:
            email_content = f\"\"\"
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #3a78ff;">Kích hoạt tài khoản Vectoria</h2>
                <p>Chào <b>{display_name}</b>,</p>
                <p>Cảm ơn bạn đã đăng ký tài khoản. Vui lòng bấm vào nút bên dưới để kích hoạt tài khoản của bạn:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{activation_link}" style="background-color: #3a78ff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Kích hoạt tài khoản</a>
                </div>
                <p style="font-size: 12px; color: #888;">Nếu nút không hoạt động, bạn có thể copy đường dẫn sau: <br>{activation_link}</p>
            </div>
            \"\"\"
            send_auth_email(email, "Kích hoạt tài khoản Vectoria", email_content)"""
    content = content.replace(old_reg, new_reg)


# 2. Update /api/login to capture language, update DB, and send correct email template
login_pattern = re.compile(r'    password = data\.get\("password"\)\n.*?send_auth_email\(email, "⚠️ Cảnh báo: Đăng nhập từ thiết bị lạ", email_content\)', re.DOTALL)
login_match = login_pattern.search(content)

if login_match:
    old_login = login_match.group(0)
    # The login block is large, let's use a more precise replacement just for the language logic
    
    # We will inject `language = data.get("language", "vi")`
    # We will inject `c.execute("UPDATE users SET language_pref = %s WHERE id = %s", (language, user_id))`
    # We will split the email content building logic.

    # First, let's just do a manual string replace for the specific parts in login.
    pass

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated register")
