import re

file_path = r"D:\Programming_language\project_web\backend_v2\vectoria_api\routes\user.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Register Validation
reg_val_old = """    if not display_name or not email or not password:
        return jsonify({"status": "error", "message": "Vui lòng điền đủ thông tin!"}), 400"""
reg_val_new = """    import re
    if not display_name or not email or not password:
        return jsonify({"status": "error", "message": "Vui lòng điền đủ thông tin!"}), 400
        
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({"status": "error", "message": "Email không hợp lệ!"}), 400
        
    if len(password) < 8 or not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
        return jsonify({"status": "error", "message": "Mật khẩu quá yếu! Phải có ít nhất 8 ký tự, 1 chữ cái và 1 chữ số."}), 400"""
content = content.replace(reg_val_old, reg_val_new)

# 2. Login Device Check
login_old = """            # Ghi lịch sử đăng nhập
            c.execute(
                "INSERT INTO loginhistory (user_id, ip_address, device_info) VALUES (%s, %s, %s)",
                (user_id, ip_address, device_info)
            )
            conn.commit()"""
login_new = """            # Ghi lịch sử đăng nhập & Kiểm tra thiết bị lạ
            c.execute("SELECT 1 FROM loginhistory WHERE user_id = %s AND device_info = %s", (user_id, device_info))
            is_new_device = not c.fetchone()

            c.execute(
                "INSERT INTO loginhistory (user_id, ip_address, device_info) VALUES (%s, %s, %s)",
                (user_id, ip_address, device_info)
            )
            conn.commit()

            if is_new_device:
                email_content = f"Chào {user[1]},\\n\\nChúng tôi phát hiện một lượt đăng nhập mới vào tài khoản Vectoria của bạn.\\n- Địa chỉ IP: {ip_address}\\n- Thiết bị: {device_info}\\n\\nNếu đây không phải là bạn, vui lòng đăng nhập và đổi mật khẩu ngay lập tức."
                send_auth_email(email, "Cảnh báo Bảo mật: Đăng nhập từ thiết bị mới", email_content)"""
content = content.replace(login_old, login_new)

# 3. Google Login Device Check
google_old = """        # Ghi lịch sử đăng nhập (Log)
        ip_address = request.remote_addr
        device_info = request.headers.get('User-Agent', 'Unknown Device')
        c.execute(
            "INSERT INTO loginhistory (user_id, ip_address, device_info) VALUES (%s, %s, %s)",
            (user_id, ip_address, device_info)
        )
        conn.commit()"""
google_new = """        # Ghi lịch sử đăng nhập & Kiểm tra thiết bị lạ
        ip_address = request.remote_addr
        device_info = request.headers.get('User-Agent', 'Unknown Device')
        
        c.execute("SELECT 1 FROM loginhistory WHERE user_id = %s AND device_info = %s", (user_id, device_info))
        is_new_device = not c.fetchone()

        c.execute(
            "INSERT INTO loginhistory (user_id, ip_address, device_info) VALUES (%s, %s, %s)",
            (user_id, ip_address, device_info)
        )
        conn.commit()
        
        if is_new_device:
            email_content = f"Chào {display_name},\\n\\nChúng tôi phát hiện một lượt đăng nhập mới vào tài khoản Vectoria của bạn qua Google.\\n- Địa chỉ IP: {ip_address}\\n- Thiết bị: {device_info}\\n\\nNếu đây không phải là bạn, vui lòng kiểm tra lại quyền truy cập tài khoản."
            send_auth_email(email, "Cảnh báo Bảo mật: Đăng nhập từ thiết bị mới", email_content)"""
content = content.replace(google_old, google_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done backend patch")
