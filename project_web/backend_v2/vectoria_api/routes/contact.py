import sqlite3
import os
import requests
import threading
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify
import base64
import psycopg2
from vectoria_api.database import get_db_connection, release_db_connection


contact_bp = Blueprint("contact", __name__)

from vectoria_api.config import DB_URL

# 2. HÀM KHỞI TẠO BẢNG (Chạy 1 lần để tạo cấu trúc)
def init_postgres_db():
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS feedbacks (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                email VARCHAR(255),
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Thêm các cột cho tính năng quản lý phản hồi Admin
        c.execute("ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';")
        c.execute("ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS admin_reply TEXT;")
        c.execute("ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP;")
        
        conn.commit()
        release_db_connection(conn)
        print(">> [Database] Feedbacks table ready.")
    except Exception as e:
        print(f">> [Database Error] {e}")

# 3. HÀM LƯU TIN NHẮN VÀO DB
def save_to_postgres(name, email, message):
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute(
            "INSERT INTO feedbacks (name, email, message) VALUES (%s, %s, %s)",
            (name, email, message)
        )
        conn.commit()
        release_db_connection(conn)
        print(">> [PostgreSQL] Đã lưu Data thành công!")
    except Exception as e:
        print(f">> [PostgreSQL Error] Lỗi lưu Data: {e}")

init_postgres_db()

# --- HÀM 1: GỬI MAIL AUTO-REPLY CHO KHÁCH (CHUYÊN NGHIỆP) ---
def send_auto_reply(user_email, user_name, user_message):
    try:
        api_key = os.getenv("RESEND_API_KEY")
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; display: inline-block;">Vectoria Support</h2>
            </div>
            <p>Kính gửi <strong>{user_name}</strong>,</p>
            <p>Cảm ơn bạn đã liên hệ với <strong>Vectoria</strong>. Hệ thống đã tiếp nhận yêu cầu/góp ý của bạn thành công.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3498db;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #7f8c8d; text-transform: uppercase; font-weight: bold;">Nội dung bạn đã gửi:</p>
                <p style="margin: 0; font-style: italic; color: #2c3e50;">"{user_message}"</p>
            </div>
            
            <p>Đội ngũ của chúng tôi sẽ xem xét nội dung và phản hồi lại bạn sớm nhất có thể.</p>
            <p>Trân trọng,<br><strong>Đội ngũ Vectoria</strong></p>
        </div>
        """
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "from": "Vectoria Support <support@vectoria.io.vn>",
            "to": [user_email],
            "subject": "Vectoria đã nhận được yêu cầu của bạn",
            "html": html_content,
        }
        response = requests.post("https://api.resend.com/emails", headers=headers, json=payload, timeout=10)
        print(f">> [Mail API - User] Trạng thái: {response.status_code}")

    except Exception as e:
        print(f">> [Mail API - User Error] {e}")


# --- 3. API CHÍNH (Đã xóa phụ thuộc Lark & Google) ---
@contact_bp.route("/api/contact", methods=["POST"])
def handle_contact():
    try:
        user_name = request.form.get("user_name", "Ẩn danh")
        user_email = request.form.get("user_email", "")
        message = request.form.get("message", "")
        uploaded_file = request.files.get("attachment")

        file_name_str = ""

        # Nếu có file đính kèm, ghi nhận tên file vào nội dung tin nhắn
        if uploaded_file:
            try:
                file_name_str = uploaded_file.filename
            except Exception as e:
                print(f">> [File Error] {e}")

        full_msg = str(message) + (f"\n[Đính kèm tệp: {file_name_str}]" if file_name_str else "")

        if user_email and "@" in user_email:
            # Bắn mail tự động trả lời khách hàng
            threading.Thread(
                target=send_auto_reply, args=(user_email, user_name, message)
            ).start()
            
            # Lưu trực tiếp vào Database để Admin xử lý trên Panel
            threading.Thread(target=save_to_postgres, args=(user_name, user_email, full_msg)).start()

        return jsonify({"status": "success", "message": "Đã gửi thành công"}), 200

    except Exception as e:
        print(f">> [CRITICAL ERROR] {e}")
        return jsonify({"error": str(e)}), 500
