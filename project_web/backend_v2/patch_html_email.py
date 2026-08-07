import re

file_path = r"D:\Programming_language\project_web\backend_v2\vectoria_api\routes\user.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Change send_auth_email to send html instead of text
send_old = """    payload = {
        # D verify domain r?i th dng lun auth@vectoria.io.vn cho ng?u
        "from": "Vectoria Auth <support@vectoria.io.vn>", 
        "to": [to_email],
        "subject": subject,
        "text": content
    }"""
send_new = """    payload = {
        "from": "Vectoria Auth <support@vectoria.io.vn>", 
        "to": [to_email],
        "subject": subject,
        "html": content
    }"""
content = re.sub(r'    payload = \{.*?"text": content\n    \}', send_new, content, flags=re.DOTALL)

# 2. Update /api/register email
reg_old = """        email_content = f"Chào {display_name},\\nVui lòng kích hoạt tài khoản Vectoria của bạn bằng cách bấm vào đường dẫn sau: {activation_link}"
        send_auth_email(email, "Kích hoạt tài khoản Vectoria", email_content)"""
reg_new = """        email_content = f\"\"\"
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
content = content.replace(reg_old, reg_new)

# 3. Update /api/login email
login_old = """        if is_new_device:
            email_content = f"Chào {user[1]},\\n\\nChúng tôi phát hiện một lượt đăng nhập mới vào tài khoản Vectoria của bạn.\\n- Địa chỉ IP: {ip_address}\\n- Thiết bị: {friendly_device}\\n\\nNếu đây không phải là bạn, vui lòng truy cập {FRONTEND_URL}/login.html, chọn mục 'Quên mật khẩu' để đổi mật khẩu bảo vệ tài khoản ngay lập tức."
            send_auth_email(email, "Cảnh báo Bảo mật: Đăng nhập từ thiết bị mới", email_content)"""
login_new = """        if is_new_device:
            email_content = f\"\"\"
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
                <h2 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">Cảnh báo đăng nhập lạ</h2>
                <p>Chào <b>{user[1]}</b>,</p>
                <p>Chúng tôi vừa phát hiện một lượt đăng nhập mới vào tài khoản Vectoria của bạn từ một thiết bị chưa từng được sử dụng trước đây.</p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Địa chỉ IP:</strong> {ip_address}</p>
                    <p style="margin: 5px 0;"><strong>Thiết bị:</strong> {friendly_device}</p>
                    <p style="margin: 5px 0;"><strong>Thời gian:</strong> {datetime.now().strftime('%H:%M - %d/%m/%Y')}</p>
                </div>
                <p style="color: #e74c3c; font-weight: bold;">Nếu bạn không thực hiện việc đăng nhập này, tài khoản của bạn có thể đang bị đe dọa!</p>
                <p>Vui lòng đổi mật khẩu ngay lập tức bằng cách bấm vào nút bên dưới:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{FRONTEND_URL}/login.html" style="background-color: #e74c3c; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Khôi phục Mật khẩu</a>
                </div>
            </div>
            \"\"\"
            send_auth_email(email, "⚠️ Cảnh báo: Đăng nhập từ thiết bị lạ", email_content)"""
content = content.replace(login_old, login_new)

# 4. Update /api/google-login email
google_old = """        if is_new_device:
            email_content = f"Chào {display_name},\\n\\nChúng tôi phát hiện một lượt đăng nhập mới vào tài khoản Vectoria của bạn qua Google.\\n- Địa chỉ IP: {ip_address}\\n- Thiết bị: {friendly_device}\\n\\nNếu đây không phải là bạn, tài khoản Google của bạn có thể đã bị thỏa hiệp. Vui lòng đổi mật khẩu Google ngay lập tức."
            send_auth_email(email, "Cảnh báo Bảo mật: Đăng nhập từ thiết bị mới", email_content)"""
google_new = """        if is_new_device:
            email_content = f\"\"\"
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
                <h2 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">Cảnh báo đăng nhập Google</h2>
                <p>Chào <b>{display_name}</b>,</p>
                <p>Chúng tôi vừa phát hiện một lượt đăng nhập mới vào tài khoản Vectoria của bạn bằng <b>Google</b> từ một thiết bị lạ.</p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Địa chỉ IP:</strong> {ip_address}</p>
                    <p style="margin: 5px 0;"><strong>Thiết bị:</strong> {friendly_device}</p>
                    <p style="margin: 5px 0;"><strong>Thời gian:</strong> {datetime.now().strftime('%H:%M - %d/%m/%Y')}</p>
                </div>
                <p style="color: #e74c3c; font-weight: bold;">Nếu bạn không thực hiện việc đăng nhập này, tài khoản Google của bạn có thể đã bị đánh cắp!</p>
                <p>Vectoria không quản lý mật khẩu Google của bạn. Xin vui lòng truy cập trang quản lý tài khoản Google để đổi mật khẩu ngay lập tức.</p>
            </div>
            \"\"\"
            send_auth_email(email, "⚠️ Cảnh báo: Đăng nhập Google từ thiết bị lạ", email_content)"""
content = content.replace(google_old, google_new)

# 5. Update /api/forgot-password email
forgot_old = """        email_content = f"Chào {user[1]},\\n\\nBạn (hoặc ai đó) vừa yêu cầu khôi phục mật khẩu. Vui lòng bấm vào đường dẫn sau để tạo mật khẩu mới:\\n{reset_link}\\n\\nLiên kết này sẽ hết hạn sau 1 giờ. Nếu không phải bạn yêu cầu, vui lòng bỏ qua email này."
        send_auth_email(email, "Khôi phục mật khẩu Vectoria", email_content)"""
forgot_new = """        email_content = f\"\"\"
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #3a78ff;">Khôi phục mật khẩu</h2>
            <p>Chào <b>{user[1]}</b>,</p>
            <p>Bạn (hoặc ai đó) vừa yêu cầu khôi phục mật khẩu cho tài khoản Vectoria của bạn. Vui lòng bấm vào nút bên dưới để tạo mật khẩu mới:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" style="background-color: #3a78ff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Tạo Mật khẩu Mới</a>
            </div>
            <p style="color: #e74c3c; font-size: 13px;"><i>* Liên kết này sẽ tự động hết hạn sau 1 giờ để đảm bảo an toàn.</i></p>
            <p style="font-size: 12px; color: #888; margin-top: 20px;">Nếu bạn không yêu cầu, hãy bỏ qua email này. Tài khoản của bạn vẫn an toàn.</p>
        </div>
        \"\"\"
        send_auth_email(email, "Khôi phục mật khẩu Vectoria", email_content)"""
content = content.replace(forgot_old, forgot_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done patching HTML emails")
