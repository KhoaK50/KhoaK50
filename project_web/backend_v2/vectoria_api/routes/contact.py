import sqlite3
import os
import requests
import threading
from datetime import datetime
from flask import Blueprint, request, jsonify
import base64


contact_bp = Blueprint("contact", __name__)

# --- CẤU HÌNH ---
# Link Google Script của bạn
GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwEDUGk1_-QxGbZXzEv-k5oVE6XIQWeCBWzZp83g7bfBbGIGwxOANLYrxm-8bSV9-6Bhg/exec"



# --- 1. HÀM KHỞI TẠO DB ---
def init_feedback_db():
    try:
        conn = sqlite3.connect("feedback.db")
        c = conn.cursor()
        c.execute(
            """CREATE TABLE IF NOT EXISTS feedbacks 
                      (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                       name TEXT, email TEXT, message TEXT, created_at TEXT)"""
        )
        conn.commit()
        conn.close()
        print(">> [Database] Ready.")
    except Exception as e:
        print(f">> [Database Error] {e}")


def send_email_via_lark(to_email, user_name, user_message):
    try:
        api_key = os.getenv("RESEND_API_KEY")

        html_content = f"""
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #3a78ff; padding: 20px; text-align: center;">
                <h2 style="color: #ffffff; margin: 0;">Vectoria Support</h2>
            </div>
            <div style="padding: 20px;">
                <p>Xin chào <strong>{user_name}</strong>,</p>
                <p>Cảm ơn bạn đã liên hệ với chúng tôi. Hệ thống đã ghi nhận tin nhắn của bạn thành công.</p>
                <p><strong>Nội dung bạn gửi:</strong></p>
                <blockquote style="background: #f9f9f9; padding: 10px; border-left: 4px solid #3a78ff;">{user_message}</blockquote>
                <p>Đội ngũ hỗ trợ sẽ xem xét và phản hồi trong thời gian sớm nhất.</p>
                <br>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 0.9em; color: #888;">
                    Trân trọng,<br>
                    <strong>Đội ngũ Vectoria</strong>
                </p>
            </div>
        </div>
        """

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        # Cái tên hiển thị xịn sò Sếp muốn đây:
        payload = {
            "from": "Vectoria Support <support@vectoria.io.vn>",
            "to": [to_email],
            "subject": "Cảm ơn bạn đã liên hệ với Vectoria!",
            "html": html_content,
        }

        # Gọi Resend API bắn mail đi
        response = requests.post(
            "https://api.resend.com/emails", headers=headers, json=payload
        )
        print(f">> [Mail API] Trạng thái: {response.status_code} - {response.text}")

    except Exception as e:
        print(f">> [Mail API Error] {e}")


# --- 2. HÀM GỬI SANG GOOGLE (QUAN TRỌNG) ---
def send_to_google_direct(payload):
    try:
        print(f">> [Google] Đang gửi dữ liệu...")
        response = requests.post(GOOGLE_SCRIPT_URL, json=payload, timeout=10)
        print(f">> [Google] Kết quả: {response.text}")
    except Exception as e:
        print(f">> [Google Error] {e}")


# --- 3. API CHÍNH ---
@contact_bp.route("/api/contact", methods=["POST"])
def handle_contact():
    try:
        # A. Lấy dữ liệu
        user_name = request.form.get("user_name", "Ẩn danh")
        user_email = request.form.get("user_email", "")
        message = request.form.get("message", "")
        uploaded_file = request.files.get("attachment")

        file_payload = None
        file_name_str = ""

        # B. Xử lý File
        if uploaded_file:
            try:
                file_name_str = uploaded_file.filename
                file_content = uploaded_file.read()
                file_b64 = base64.b64encode(file_content).decode("utf-8")
                file_payload = {
                    "name": file_name_str,
                    "mimeType": uploaded_file.content_type,
                    "data": file_b64,
                }
            except Exception as e:
                print(f">> [File Error] {e}")

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        full_msg = str(message) + (f"\n[📎 {file_name_str}]" if file_name_str else "")

        # C. Chuẩn bị gói tin gửi Google
        google_json = {
            "name": user_name,
            "email": user_email,
            "message": full_msg,
            "file": file_payload,
            "send_email": False,  # Cờ báo hiệu cho Google Script biết là hãy gửi mail đi
        }

        # D. Gửi sang Google
        send_to_google_direct(google_json)

        # E. Gửi mail Auto-reply qua Resend API (Chạy ẩn thả ga)
        if user_email and "@" in user_email:
            threading.Thread(
                target=send_email_via_lark, args=(user_email, user_name, message)
            ).start()

        return jsonify({"status": "success", "message": "Đã gửi thành công"}), 200

    # Chèn vào ngay dưới dòng: return jsonify({"status": "success"...
    except Exception as e:
        print(f">> [CRITICAL ERROR] {e}")
        return jsonify({"error": str(e)}), 500
