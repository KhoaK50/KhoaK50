import sqlite3
import smtplib
import os
from email.mime.text import MIMEText
from datetime import datetime
from flask import Blueprint, request, jsonify

# Tạo Blueprint
contact_bp = Blueprint('contact', __name__)

# --- CẤU HÌNH ---
SMTP_EMAIL = os.environ.get("SMTP_EMAIL") 
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")

# Tạo danh sách người nhận (Lọc bỏ giá trị None nếu chưa set biến môi trường)
raw_receivers = ["minhhuy42work@gmail.com", os.environ.get("SMTP_EMAIL")]
RECEIVERS = [r for r in raw_receivers if r]  # Chỉ lấy các email hợp lệ

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
        print(">> [Backend] Bắt đầu xử lý contact form...")
        data = request.json
        name = data.get('user_name')
        email = data.get('user_email')
        message = data.get('message')
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # A. LƯU VÀO DATABASE (Có try-catch riêng để không ảnh hưởng gửi mail)
        try:
            with sqlite3.connect('feedback.db') as conn:
                c = conn.cursor()
                c.execute("INSERT INTO feedbacks (name, email, message, created_at) VALUES (?, ?, ?, ?)",
                          (name, email, message, timestamp))
                conn.commit()
            print(">> [Database] Lưu feedback thành công.")
        except Exception as db_err:
            print(f">> [Database Error] Lỗi lưu DB (vẫn tiếp tục gửi mail): {db_err}")

        # B. GỬI MAIL
        try:
            print(f">> [Email] Đang kết nối tới Gmail (SMTP)...")
            
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

            # --- CÁC SỬA ĐỔI QUAN TRỌNG ---
            # 1. Thêm timeout=30s để tránh treo server
            with smtplib.SMTP('smtp.gmail.com', 587, timeout=30) as server:
                # 2. Bật log debug để hiện chi tiết quá trình bắt tay với Google
                server.set_debuglevel(1) 
                
                server.starttls() 
                server.login(SMTP_EMAIL, SMTP_PASSWORD)
                
                # 3. SỬA LỖI TYPO: Dùng biến RECEIVERS (viết hoa) thay vì receivers
                server.sendmail(SMTP_EMAIL, RECEIVERS, msg.as_string())
            
            print(f">> [Email] Đã gửi mail thành công cho: {RECEIVERS}")

        except Exception as e_mail:
            print(f">> [Email Error] Gửi mail thất bại: {e_mail}")
            # 4. QUAN TRỌNG: Ném lỗi ra ngoài để API trả về 500
            # Nếu không có dòng này, Frontend sẽ tưởng là thành công
            raise e_mail 

        return jsonify({"status": "success", "message": "Cảm ơn! Góp ý đã được gửi."}), 200

    except Exception as e:
        # Bắt tất cả lỗi (bao gồm lỗi mail vừa ném ra ở trên)
        print(f">> [System Error] Lỗi xử lý contact: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
