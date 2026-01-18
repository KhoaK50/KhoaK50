import sqlite3
import smtplib
import os
from email.mime.text import MIMEText
from datetime import datetime
from flask import Blueprint, request, jsonify

# Tạo Blueprint
contact_bp = Blueprint('contact', __name__)

# --- CẤU HÌNH ---
# Lấy từ Environment Variables trên Render
SMTP_EMAIL = os.environ.get("SMTP_EMAIL") 
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")

def get_receivers():
    return [
        "minhhuy42work@gmail.com",
        os.environ.get("SMTP_EMAIL")
    ]

def init_feedback_db():
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
        # 1. Kiểm tra biến môi trường có tồn tại không
        if not SMTP_EMAIL or not SMTP_PASSWORD:
            print(">> [BÁO ĐỘNG] Thiếu SMTP_EMAIL hoặc SMTP_PASSWORD trên Render Environment!")
            return jsonify({"status": "error", "message": "Cấu hình Server chưa hoàn tất"}), 500

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
        receivers = get_receivers()
        try:
            subject = f"🔔 [Góp Ý Mới] Từ {name} - Vectoria"
            body = f"Người gửi: {name}\nEmail: {email}\nNội dung: {message}"
            
            msg = MIMEText(body, 'plain', 'utf-8')
            msg['Subject'] = subject
            msg['From'] = SMTP_EMAIL
            msg['To'] = ", ".join(receivers)

            print(f">> [Email] Đang thử kết nối tới Gmail với tài khoản: {SMTP_EMAIL}...")
            
            # Sử dụng cổng 587 (TLS) để ổn định hơn trên môi trường Cloud
            with smtplib.SMTP('smtp.gmail.com', 587) as server:
                server.set_debuglevel(1) # Lệnh này sẽ in chi tiết quá trình bắt tay với Google ra Logs
                server.starttls()
                server.login(SMTP_EMAIL, SMTP_PASSWORD)
                server.sendmail(SMTP_EMAIL, receivers, msg.as_string())
            
            print(f">> [Email] GỬI THÀNH CÔNG cho {len(receivers)} người.")

        except smtplib.SMTPAuthenticationError:
            print(">> [Email Error] SAI MẬT KHẨU! Hãy kiểm tra lại SMTP_PASSWORD trên Render (nhớ xóa khoảng trắng).")
        except Exception as e_mail:
            print(f">> [Email Error] Lỗi cụ thể: {str(e_mail)}")

        return jsonify({"status": "success", "message": "Góp ý đã được ghi nhận."}), 200

    except Exception as e:
        print(f">> [System Error] Lỗi xử lý: {e}")
        return jsonify({"status": "error", "message": "Lỗi hệ thống"}), 500
