import re

file_path = 'D:/Programming_language/project_web/backend_v2/vectoria_api/routes/user.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Register - EN
old_reg_en = r'''email_content = f\"\"\"\n<!DOCTYPE html>.*?Confirm Account.*?</html>\n\s+\"\"\"'''
new_reg_en = '''email_content = get_modern_email(
                title="Confirm your account",
                greeting=f"Hi {display_name},",
                paragraphs=["Thanks for signing up for Vectoria. Please confirm your email address to complete your registration."],
                btn_text="Verify Email",
                btn_link=activation_link,
                fallback_link=activation_link,
                lang="en"
            )'''
content = re.sub(old_reg_en, new_reg_en, content, flags=re.DOTALL)

# 2. Register - VI
old_reg_vi = r'''email_content = f\"\"\"\n<!DOCTYPE html>.*?Xác thực tài khoản.*?</html>\n\s+\"\"\"'''
new_reg_vi = '''email_content = get_modern_email(
                title="Xác thực tài khoản",
                greeting=f"Chào bạn, {display_name},",
                paragraphs=["Cảm ơn bạn đã đăng ký. Vui lòng xác thực email để hoàn tất quá trình đăng ký."],
                btn_text="Xác thực ngay",
                btn_link=activation_link,
                fallback_link=activation_link,
                lang="vi"
            )'''
content = re.sub(old_reg_vi, new_reg_vi, content, flags=re.DOTALL)

# 3. Forgot Password - EN
old_fp_en = r'''email_content = f\"\"\"\n<!DOCTYPE html>.*?Reset Password.*?</html>\n\s+\"\"\"'''
new_fp_en = '''email_content = get_modern_email(
                title="Reset your password",
                greeting=f"Hi {display_name},",
                paragraphs=["We received a request to reset the password for your Vectoria account. Click the button below to choose a new password."],
                btn_text="Reset Password",
                btn_link=reset_link,
                fallback_link=reset_link,
                lang="en"
            )'''
content = re.sub(old_fp_en, new_fp_en, content, flags=re.DOTALL)

# 4. Forgot Password - VI
old_fp_vi = r'''email_content = f\"\"\"\n<!DOCTYPE html>.*?Đặt lại mật khẩu.*?</html>\n\s+\"\"\"'''
new_fp_vi = '''email_content = get_modern_email(
                title="Đặt lại mật khẩu",
                greeting=f"Chào bạn, {display_name},",
                paragraphs=["Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Vectoria của bạn. Nhấn vào nút bên dưới để tạo mật khẩu mới."],
                btn_text="Đặt lại mật khẩu",
                btn_link=reset_link,
                fallback_link=reset_link,
                lang="vi"
            )'''
content = re.sub(old_fp_vi, new_fp_vi, content, flags=re.DOTALL)

# 5. Login Alert - EN
old_la_en = r'''email_content = f\"\"\"\n<!DOCTYPE html>.*?Security alert.*?</html>\n\s+\"\"\"'''
new_la_en = '''email_content = get_modern_email(
                title="New login detected",
                greeting=f"Hi {display_name},",
                paragraphs=["We detected a new login to your Vectoria account from an unrecognized device."],
                sub_text=f"<b>Time:</b> {current_time}<br><b>Device IP:</b> {ip_address}<br><b>User Agent:</b> {user_agent}",
                btn_text="Yes, it was me",
                btn_link=confirm_link,
                fallback_link=confirm_link,
                lang="en"
            )'''
content = re.sub(old_la_en, new_la_en, content, flags=re.DOTALL)

# 6. Login Alert - VI
old_la_vi = r'''email_content = f\"\"\"\n<!DOCTYPE html>.*?Cảnh báo bảo mật.*?</html>\n\s+\"\"\"'''
new_la_vi = '''email_content = get_modern_email(
                title="Phát hiện đăng nhập mới",
                greeting=f"Chào bạn, {display_name},",
                paragraphs=["Chúng tôi phát hiện một lượt đăng nhập mới vào tài khoản Vectoria của bạn từ một thiết bị lạ."],
                sub_text=f"<b>Thời gian:</b> {current_time}<br><b>Địa chỉ IP:</b> {ip_address}<br><b>Thiết bị:</b> {user_agent}",
                btn_text="Vâng, đó là tôi",
                btn_link=confirm_link,
                fallback_link=confirm_link,
                lang="vi"
            )'''
content = re.sub(old_la_vi, new_la_vi, content, flags=re.DOTALL)

# 7. Google Login Alert - EN
old_gla_en = r'''email_content = f\"\"\"\n<!DOCTYPE html>.*?Security alert.*?using <b>Google</b>.*?</html>\n\s+\"\"\"'''
new_gla_en = '''email_content = get_modern_email(
                title="New Google login detected",
                greeting=f"Hi {display_name},",
                paragraphs=["We detected a login to your Vectoria account using Google from an unrecognized device."],
                sub_text=f"<b>Time:</b> {current_time}<br><b>Device IP:</b> {ip_address}<br><b>User Agent:</b> {user_agent}",
                btn_text="Yes, it was me",
                btn_link=confirm_link,
                fallback_link=confirm_link,
                lang="en"
            )'''
content = re.sub(old_gla_en, new_gla_en, content, flags=re.DOTALL)

# 8. Google Login Alert - VI
old_gla_vi = r'''email_content = f\"\"\"\n<!DOCTYPE html>.*?Cảnh báo bảo mật.*?bằng <b>Google</b>.*?</html>\n\s+\"\"\"'''
new_gla_vi = '''email_content = get_modern_email(
                title="Phát hiện đăng nhập Google mới",
                greeting=f"Chào bạn, {display_name},",
                paragraphs=["Chúng tôi phát hiện một lượt đăng nhập vào tài khoản Vectoria của bạn bằng Google từ một thiết bị lạ."],
                sub_text=f"<b>Thời gian:</b> {current_time}<br><b>Địa chỉ IP:</b> {ip_address}<br><b>Thiết bị:</b> {user_agent}",
                btn_text="Vâng, đó là tôi",
                btn_link=confirm_link,
                fallback_link=confirm_link,
                lang="vi"
            )'''
content = re.sub(old_gla_vi, new_gla_vi, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Email templates replaced")
