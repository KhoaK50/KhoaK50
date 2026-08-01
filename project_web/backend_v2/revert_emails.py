import re

with open("vectoria_api/routes/user.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Revert send_auth_email function
old_send_auth = """def send_auth_email(to_email, subject, text_content, html_content=None):
    RESEND_AUTH_KEY = os.getenv("RESEND_AUTH_KEY") 
    
    if not RESEND_AUTH_KEY:
        print(">> [Email Error] Thiếu RESEND_AUTH_KEY trong biến môi trường!")
        return

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {RESEND_AUTH_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "from": "Vectoria Auth <support@vectoria.io.vn>", 
        "to": [to_email],
        "subject": subject,
        "text": text_content
    }
    if html_content:
        payload["html"] = html_content"""

new_send_auth = """def send_auth_email(to_email, subject, content):
    RESEND_AUTH_KEY = os.getenv("RESEND_AUTH_KEY") 
    
    # Ki?m tra an ton l? qun c?u hnh key
    if not RESEND_AUTH_KEY:
        print(">> [Email Error] Thi?u RESEND_AUTH_KEY trong bi?n mi tru?ng!")
        return

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {RESEND_AUTH_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        # D verify domain r?i th dng lun auth@vectoria.io.vn cho ng?u
        "from": "Vectoria Auth <support@vectoria.io.vn>", 
        "to": [to_email],
        "subject": subject,
        "text": content
    }"""
content = re.sub(r'def send_auth_email.*?payload\["html"\] = html_content', new_send_auth, content, flags=re.DOTALL)


# 2. Revert registration email
old_reg_email = """        # 4. Gửi mail tự động chứa mã kích hoạt cho user
        activation_link = f"{FRONTEND_URL}/login.html?token={activation_token}"
        text_content = f"Chào {display_name},\\nVui lòng kích hoạt tài khoản Vectoria của bạn bằng cách bấm vào đường dẫn sau: {activation_link}"
        html_content = f\"\"\"
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #0d6efd; text-align: center;">Chào mừng đến với Vectoria!</h2>
            <p style="font-size: 16px; color: #333;">Xin chào <strong>{display_name}</strong>,</p>
            <p style="font-size: 16px; color: #333;">Cảm ơn bạn đã đăng ký tài khoản tại Vectoria. Để hoàn tất việc đăng ký, vui lòng nhấn vào nút bên dưới để kích hoạt tài khoản của bạn:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{activation_link}" style="background-color: #0d6efd; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Kích hoạt tài khoản</a>
            </div>
            <p style="font-size: 14px; color: #666;">Hoặc bạn có thể copy đường dẫn sau dán vào trình duyệt:</p>
            <p style="font-size: 14px; color: #666; word-break: break-all;">{activation_link}</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
        </div>
        \"\"\"
        send_auth_email(email, "Kích hoạt tài khoản Vectoria", text_content, html_content)"""

new_reg_email = """        # 4. G?i mail t? d?ng ch?a ma kch ho?t cho user
        # (Link s? du?c d?nh d?ng l?i ? phi?n b?n chuyn nghi?p sau n?y, t?m th?i gi? nguyn logic cu nhung d?n gi?n ha path)
        activation_link = f"{FRONTEND_URL}/verify?token={activation_token}"
        email_content = f"Cho {display_name},\\nVui lng kch ho?t ti kho?n Vectoria c?a b?n b?ng cch b?m vo du?ng d?n sau: {activation_link}"
        send_auth_email(email, "Kch ho?t ti kho?n Vectoria", email_content)"""
content = re.sub(r'# 4\. G.*?(?=return jsonify)', new_reg_email + "\n\n        ", content, flags=re.DOTALL)


# 3. Revert reset password email
old_reset_email = """        # Gửi link đổi mật khẩu
        reset_link = f"{FRONTEND_URL}/login.html?reset_token={reset_token}"
        text_content = f"Chào {display_name},\\nBạn đã yêu cầu đặt lại mật khẩu. Vui lòng nhấn vào đường dẫn sau để tạo mật khẩu mới (Hiệu lực 1 tiếng): {reset_link}"
        html_content = f\"\"\"
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #0d6efd; text-align: center;">Yêu cầu đặt lại mật khẩu</h2>
            <p style="font-size: 16px; color: #333;">Xin chào <strong>{display_name}</strong>,</p>
            <p style="font-size: 16px; color: #333;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Vectoria của bạn. Nhấn vào nút bên dưới để tạo mật khẩu mới (có hiệu lực trong 1 giờ):</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" style="background-color: #0d6efd; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Đặt lại mật khẩu</a>
            </div>
            <p style="font-size: 14px; color: #666;">Hoặc bạn có thể copy đường dẫn sau dán vào trình duyệt:</p>
            <p style="font-size: 14px; color: #666; word-break: break-all;">{reset_link}</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">Nếu bạn không thực hiện yêu cầu này, mật khẩu của bạn sẽ giữ nguyên và an toàn.</p>
        </div>
        \"\"\"
        send_auth_email(email, "Đặt lại mật khẩu Vectoria", text_content, html_content)"""

new_reset_email = """        # G?i link d?i m?t kh?u
        reset_link = f"{FRONTEND_URL}/reset?token={reset_token}"
        email_content = f"Cho {display_name},\\nB?n da yu c?u d?t l?i m?t kh?u. Vui lng nh?n vo du?ng d?n sau d? t?o m?t kh?u m?i (Hi?u l?c 1 ti?ng): {reset_link}"
        send_auth_email(email, "D?t l?i m?t kh?u Vectoria", email_content)"""
content = re.sub(r'# G.*?link.*?d.*?i.*?m.*?kh.*?u.*?(?=return jsonify)', new_reset_email + "\n\n        ", content, flags=re.DOTALL)

with open("vectoria_api/routes/user.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Reverted HTML email and changed the URL paths!")
