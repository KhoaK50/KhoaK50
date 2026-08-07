import re

file_path = r"D:\Programming_language\project_web\backend_v2\vectoria_api\routes\user.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update local login email
login_old = """            if is_new_device:
                email_content = f"Chào {user[1]},\\n\\nChúng tôi phát hiện một lượt đăng nhập mới vào tài khoản Vectoria của bạn.\\n- Địa chỉ IP: {ip_address}\\n- Thiết bị: {device_info}\\n\\nNếu đây không phải là bạn, vui lòng đăng nhập và đổi mật khẩu ngay lập tức."
                send_auth_email(email, "Cảnh báo Bảo mật: Đăng nhập từ thiết bị mới", email_content)"""
login_new = """            if is_new_device:
                email_content = f"Chào {user[1]},\\n\\nChúng tôi phát hiện một lượt đăng nhập mới vào tài khoản Vectoria của bạn.\\n- Địa chỉ IP: {ip_address}\\n- Thiết bị: {device_info}\\n\\nNếu đây không phải là bạn, vui lòng truy cập {FRONTEND_URL}/login.html, chọn mục 'Quên mật khẩu' để đổi mật khẩu bảo vệ tài khoản ngay lập tức."
                send_auth_email(email, "Cảnh báo Bảo mật: Đăng nhập từ thiết bị mới", email_content)"""
content = content.replace(login_old, login_new)

# 2. Update Google login email
google_old = """        if is_new_device:
            email_content = f"Chào {display_name},\\n\\nChúng tôi phát hiện một lượt đăng nhập mới vào tài khoản Vectoria của bạn qua Google.\\n- Địa chỉ IP: {ip_address}\\n- Thiết bị: {device_info}\\n\\nNếu đây không phải là bạn, vui lòng kiểm tra lại quyền truy cập tài khoản."
            send_auth_email(email, "Cảnh báo Bảo mật: Đăng nhập từ thiết bị mới", email_content)"""
google_new = """        if is_new_device:
            email_content = f"Chào {display_name},\\n\\nChúng tôi phát hiện một lượt đăng nhập mới vào tài khoản Vectoria của bạn qua Google.\\n- Địa chỉ IP: {ip_address}\\n- Thiết bị: {device_info}\\n\\nNếu đây không phải là bạn, tài khoản Google của bạn có thể đã bị thỏa hiệp. Vui lòng đổi mật khẩu Google ngay lập tức."
            send_auth_email(email, "Cảnh báo Bảo mật: Đăng nhập từ thiết bị mới", email_content)"""
content = content.replace(google_old, google_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done patching email templates")
