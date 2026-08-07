import re
import codecs

req_path = r"D:\Programming_language\project_web\backend_v2\requirements.txt"
with codecs.open(req_path, "r", encoding="utf-16le") as f:
    reqs = f.read()

if "user-agents" not in reqs:
    reqs += "\nuser-agents==2.2.0\n"
    with codecs.open(req_path, "w", encoding="utf-16le") as f:
        f.write(reqs)

user_py = r"D:\Programming_language\project_web\backend_v2\vectoria_api\routes\user.py"
with open(user_py, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Local Login
login_old = """        # Ghi lịch sử đăng nhập & Kiểm tra thiết bị lạ
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
            email_content = f"Chào {user[1]},\\n\\nChúng tôi phát hiện một lượt đăng nhập mới vào tài khoản Vectoria của bạn.\\n- Địa chỉ IP: {ip_address}\\n- Thiết bị: {device_info}\\n\\nNếu đây không phải là bạn, vui lòng truy cập {FRONTEND_URL}/login.html, chọn mục 'Quên mật khẩu' để đổi mật khẩu bảo vệ tài khoản ngay lập tức."
            send_auth_email(email, "Cảnh báo Bảo mật: Đăng nhập từ thiết bị mới", email_content)"""

login_new = """        # Ghi lịch sử đăng nhập & Kiểm tra thiết bị lạ
        ip_address = request.remote_addr
        device_info = request.headers.get('User-Agent', 'Unknown Device')
        
        # Parse tên thiết bị thân thiện
        friendly_device = device_info
        try:
            from user_agents import parse
            ua = parse(device_info)
            device_str = f"{ua.device.family} - " if ua.device.family and ua.device.family != 'Other' else ""
            friendly_device = f"{device_str}{ua.os.family} ({ua.browser.family})"
        except:
            pass
        
        c.execute("SELECT 1 FROM loginhistory WHERE user_id = %s AND device_info = %s", (user_id, device_info))
        is_new_device = not c.fetchone()

        c.execute(
            "INSERT INTO loginhistory (user_id, ip_address, device_info) VALUES (%s, %s, %s)",
            (user_id, ip_address, device_info)
        )
        conn.commit()

        if is_new_device:
            email_content = f"Chào {user[1]},\\n\\nChúng tôi phát hiện một lượt đăng nhập mới vào tài khoản Vectoria của bạn.\\n- Địa chỉ IP: {ip_address}\\n- Thiết bị: {friendly_device}\\n\\nNếu đây không phải là bạn, vui lòng truy cập {FRONTEND_URL}/login.html, chọn mục 'Quên mật khẩu' để đổi mật khẩu bảo vệ tài khoản ngay lập tức."
            send_auth_email(email, "Cảnh báo Bảo mật: Đăng nhập từ thiết bị mới", email_content)"""
content = content.replace(login_old, login_new)

# 2. Google Login
google_old = """        # Ghi lịch sử đăng nhập & Kiểm tra thiết bị lạ
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
            email_content = f"Chào {display_name},\\n\\nChúng tôi phát hiện một lượt đăng nhập mới vào tài khoản Vectoria của bạn qua Google.\\n- Địa chỉ IP: {ip_address}\\n- Thiết bị: {device_info}\\n\\nNếu đây không phải là bạn, tài khoản Google của bạn có thể đã bị thỏa hiệp. Vui lòng đổi mật khẩu Google ngay lập tức."
            send_auth_email(email, "Cảnh báo Bảo mật: Đăng nhập từ thiết bị mới", email_content)"""

google_new = """        # Ghi lịch sử đăng nhập & Kiểm tra thiết bị lạ
        ip_address = request.remote_addr
        device_info = request.headers.get('User-Agent', 'Unknown Device')
        
        # Parse tên thiết bị thân thiện
        friendly_device = device_info
        try:
            from user_agents import parse
            ua = parse(device_info)
            device_str = f"{ua.device.family} - " if ua.device.family and ua.device.family != 'Other' else ""
            friendly_device = f"{device_str}{ua.os.family} ({ua.browser.family})"
        except:
            pass
            
        c.execute("SELECT 1 FROM loginhistory WHERE user_id = %s AND device_info = %s", (user_id, device_info))
        is_new_device = not c.fetchone()

        c.execute(
            "INSERT INTO loginhistory (user_id, ip_address, device_info) VALUES (%s, %s, %s)",
            (user_id, ip_address, device_info)
        )
        conn.commit()
        
        if is_new_device:
            email_content = f"Chào {display_name},\\n\\nChúng tôi phát hiện một lượt đăng nhập mới vào tài khoản Vectoria của bạn qua Google.\\n- Địa chỉ IP: {ip_address}\\n- Thiết bị: {friendly_device}\\n\\nNếu đây không phải là bạn, tài khoản Google của bạn có thể đã bị thỏa hiệp. Vui lòng đổi mật khẩu Google ngay lập tức."
            send_auth_email(email, "Cảnh báo Bảo mật: Đăng nhập từ thiết bị mới", email_content)"""
content = content.replace(google_old, google_new)

with open(user_py, "w", encoding="utf-8") as f:
    f.write(content)
print("Done adding user-agents logic")
