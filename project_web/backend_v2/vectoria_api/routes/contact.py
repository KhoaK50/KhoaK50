import sqlite3
import os
import requests 
import threading # Thư viện chạy ngầm
import smtplib   # [MỚI] Thư viện gửi mail
from email.mime.text import MIMEText # [MỚI] Định dạng nội dung
from email.mime.multipart import MIMEMultipart # [MỚI] Cấu trúc mail
from datetime import datetime
from flask import Blueprint, request, jsonify
import base64

contact_bp = Blueprint('contact', __name__)

# --- CẤU HÌNH ---
# Link Google Script
GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyQtYiblsalJRXXo1P85Cio1L9Q3mO2OreWNiJdvxHtZJsNIqMlJHT1FVjNOoX3grNfSw/exec" 

# Cấu hình Email gửi đi
SMTP_SERVER = 'smtp.gmail.com'
SMTP_PORT = 465 # Cổng bảo mật SSL
SENDER_EMAIL = 'sc3.nguyentrandangkhoa@gmail.com' 
SENDER_PASSWORD = 'gkon zewb nyua ywkb'   

# --- 1. HÀM KHỞI TẠO DB ---
def init_feedback_db():
    try:
        conn = sqlite3.connect('feedback.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS feedbacks 
                      (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                       name TEXT, email TEXT, message TEXT, created_at TEXT)''')
        conn.commit()
        conn.close()
        print(">> [Database] Ready.")
    except Exception as e:
        print(f">> [Database Error] {e}")

# --- 2. HÀM CHẠY NGẦM (GỬI GOOGLE) ---
def send_to_google_background(payload):
    try:
        print(f">> [Background] Đang gửi sang Google (Size: {len(str(payload))} bytes)...")
        requests.post(GOOGLE_SCRIPT_URL, json=payload, timeout=30)
        print(">> [Background] Gửi Google thành công!")
    except Exception as e:
        print(f">> [Background Error] Gửi Google thất bại: {e}")

# --- [MỚI] 3. HÀM CHẠY NGẦM (GỬI EMAIL TỰ ĐỘNG) ---
def send_email_background(user_email, user_name):
    try:
        # Kiểm tra email hợp lệ cơ bản
        if not user_email or "@" not in user_email:
            return 

        print(f">> [Email] Đang gửi mail cho {user_email}...")

        # Tạo nội dung email
        msg = MIMEMultipart()
        msg['From'] = f"Vectoria Support <{SENDER_EMAIL}>"
        msg['To'] = user_email
        msg['Subject'] = "Cảm ơn bạn đã liên hệ với Vectoria!"

        # Nội dung thư (HTML)
        html_body = f"""
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #3a78ff; padding: 20px; text-align: center;">
                <h2 style="color: #ffffff; margin: 0;">Vectoria Reply</h2>
            </div>
            <div style="padding: 20px;">
                <p>Xin chào <strong>{user_name}</strong>,</p>
                <p>Cảm ơn bạn đã liên hệ với chúng tôi. Hệ thống đã ghi nhận tin nhắn của bạn thành công.</p>
                <p>Đội ngũ hỗ trợ sẽ xem xét và phản hồi trong thời gian sớm nhất nếu cần thiết.</p>
                <br>
                <p style="font-style: italic; color: #666;">Đây là email tự động, vui lòng không trả lời email này.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 0.9em; color: #888;">
                    Trân trọng,<br>
                    <strong>Đội ngũ Vectoria</strong>
                </p>
            </div>
        </div>
        """
        msg.attach(MIMEText(html_body, 'html'))

        # Kết nối Server Gmail và gửi
        server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        print(f">> [Email] Đã gửi thành công cho {user_email}")
    except Exception as e:
        print(f">> [Email Error] Gửi thất bại: {e}")

# --- 4. API CHÍNH ---
@contact_bp.route('/api/contact', methods=['POST'])
def handle_contact():
    try:
        # A. Lấy dữ liệu
        user_name = request.form.get('user_name', 'Ẩn danh')
        user_email = request.form.get('user_email', '') # Mặc định rỗng để check gửi mail
        message = request.form.get('message', '')
        uploaded_file = request.files.get('attachment')
        
        file_payload = None
        file_name_str = ""

        # B. Xử lý File (nếu có)
        if uploaded_file:
            try:
                file_name_str = uploaded_file.filename
                file_content = uploaded_file.read()
                file_b64 = base64.b64encode(file_content).decode('utf-8')
                
                file_payload = {
                    "name": file_name_str,
                    "mimeType": uploaded_file.content_type,
                    "data": file_b64
                }
            except Exception as e:
                print(f">> [File Error] {e}")

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # C. Lưu Database
        full_msg = str(message) + (f"\n[📎 {file_name_str}]" if file_name_str else "")
        
        try:
            with sqlite3.connect('feedback.db') as conn:
                c = conn.cursor()
                c.execute("INSERT INTO feedbacks (name, email, message, created_at) VALUES (?, ?, ?, ?)",
                          (user_name, user_email, full_msg, timestamp))
                conn.commit()
        except Exception:
            pass 

        # D. Chuẩn bị gói tin Google
        google_json = {
            "name": user_name,
            "email": user_email,
            "message": full_msg,
            "file": file_payload 
        }

        # E. KÍCH HOẠT CHẠY NGẦM (QUAN TRỌNG)
        
        # 1. Gửi sang Google Sheet
        thread_google = threading.Thread(target=send_to_google_background, args=(google_json,))
        thread_google.start()

        # 2. [MỚI] Gửi Email cảm ơn (Chỉ gửi nếu user có nhập email)
        if user_email and "@" in user_email:
            thread_email = threading.Thread(target=send_email_background, args=(user_email, user_name))
            thread_email.start()

        # F. Phản hồi Web ngay lập tức (0.1s)
        return jsonify({"status": "success", "message": "Đã nhận tin"}), 200

    except Exception as e:
        print(f">> [CRITICAL ERROR] {e}")
        return jsonify({"error": str(e)}), 500