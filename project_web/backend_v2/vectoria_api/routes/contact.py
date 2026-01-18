import sqlite3
import smtplib
import os
from email.mime.text import MIMEText
from datetime import datetime
from flask import Blueprint, request, jsonify

contact_bp = Blueprint('contact', __name__)

# --- CẤU HÌNH ---
SMTP_EMAIL = os.environ.get("SMTP_EMAIL") 
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")

# Lấy danh sách email và lọc cái nào rỗng
raw_receivers = ["minhhuy42work@gmail.com", os.environ.get("SMTP_EMAIL")]
RECEIVERS = [r for r in raw_receivers if r]

# --- HÀM KHỞI TẠO DATABASE (Hồi nãy bị thiếu cái này nè) ---
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

# --- API XỬ LÝ CONTACT ---
@contact_bp.route('/api/contact', methods=['POST'])
def handle_contact():
    try:
        print(">> [Backend] Bắt đầu xử lý contact form...")
        data = request.json
        name = data.get('user_name')
        email = data.get('user_email')
        message = data.get('message')
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # A. LƯU VÀO DATABASE
        try:
            with sqlite3.connect('feedback.db') as conn:
                c = conn.cursor()
                c.execute("INSERT INTO feedbacks (name, email, message, created_at) VALUES (?, ?, ?, ?)",
                          (name, email, message, timestamp))
                conn.commit()
            print(">> [Database] Lưu feedback thành công.")
        except Exception as db_err:
            print(f">> [Database Error] Lỗi lưu DB (vẫn tiếp tục gửi mail): {db_err}")

        # B. GỬI MAIL (DÙNG CỔNG 465 SSL - BẤT TỬ)
        try:
            print(f">> [Email] Đang kết nối tới Gmail qua cổng 465 (SSL)...")
            
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

            # --- Dùng SMTP_SSL cho cổng 465 ---
            with smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=30) as server:
                server.set_debuglevel(1)  # Bật log
                server.login(SMTP_EMAIL, SMTP_PASSWORD)
                server.sendmail(SMTP_EMAIL, RECEIVERS, msg.as_string())
            
            print(f">> [Email] Đã gửi mail thành công cho: {RECEIVERS}")

        except Exception as e_mail:
            print(f">> [Email Error] Gửi mail thất bại: {e_mail}")
            raise e_mail 

        return jsonify({"status": "success", "message": "Cảm ơn! Góp ý đã được gửi."}), 200

    except Exception as e:
        print(f">> [System Error] Lỗi xử lý contact: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
