import sqlite3
import smtplib
import os
from email.mime.text import MIMEText
from datetime import datetime
from flask import Blueprint, request, jsonify

# Tạo Blueprint
contact_bp = Blueprint('contact', __name__)

# --- CẤU HÌNH (Sửa lại đoạn này) ---

# Thay vì viết thẳng email, hãy bảo nó lấy từ biến MAIL_USERNAME trên Render
SMTP_EMAIL = os.environ.get("SMTP_EMAIL") 

# Lấy mật khẩu từ biến MAIL_PASSWORD trên Render
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")

RECEIVERS = [
    "minhhuy42work@gmail.com",
    os.environ.get("SMTP_EMAIL") # Gửi về cho chính mình luôn
]

def init_feedback_db():
    """Hàm này sẽ được gọi bên app.py khi khởi động"""
    try:
        conn = sqlite3.connect('feedback.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS feedbacks 
                     (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                      name TEXT, email TEXT, message TEXT, created_at TEXT)''')
        conn.commit()
        conn.close()
        print(">> [Database] Đã kiểm tra/khởi tạo feedback.db thành công.")
    except Exception as e:
        print(f">> [Database Error] Không thể tạo DB: {e}")

@contact_bp.route('/api/contact', methods=['POST'])
def handle_contact():
    try:
        data = request.json
        name = data.get('user_name')
        email = data.get('user_email')
        message = data.get('message')
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # A. LƯU VÀO DATABASE
        with sqlite3.connect('feedback.db') as conn:
            c = conn.cursor()
            c.execute("INSERT INTO feedbacks (name, email, message, created_at) VALUES (?, ?, ?, ?)",
                      (name, email, message, timestamp))
            conn.commit()

        # B. GỬI MAIL
        try:
            subject = f"🔔 [Góp Ý Mới] Từ {name} - Vectoria"
            body = f"""
            Hệ thống Vectoria nhận được tin nhắn mới:
            -----------------------------------------
            🕒 Thời gian: {timestamp}
            👤 Người gửi: {name}
            📧 Email họ: {email}
            
            📝 Nội dung:
            {message}
            -----------------------------------------
            (Tin nhắn tự động gửi đến: {', '.join(RECEIVERS)})
            """
            
            msg = MIMEText(body, 'plain', 'utf-8')
            msg['Subject'] = subject
            msg['From'] = SMTP_EMAIL
            msg['To'] = ", ".join(RECEIVERS)

            with smtplib.SMTP('smtp.gmail.com', 587) as server:
                server.starttls()  # Bước này cực quan trọng để mã hóa đường truyền
                server.login(SMTP_EMAIL, SMTP_PASSWORD)
                server.sendmail(SMTP_EMAIL, receivers, msg.as_string())
            
            print(f">> [Email] Đã gửi mail thành công cho {len(RECEIVERS)} người.")

        except Exception as e_mail:
            print(f">> [Email Error] Gửi mail thất bại: {e_mail}")

        return jsonify({"status": "success", "message": "Cảm ơn! Góp ý đã được gửi."}), 200

    except Exception as e:
        print(f">> [System Error] Lỗi xử lý contact: {e}")
        return jsonify({"status": "error", "message": "Lỗi Server"}), 500
