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
GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyQtYiblsalJRXXo1P85Cio1L9Q3mO2OreWNiJdvxHtZJsNIqMlJHT1FVjNOoX3grNfSw/exec"

# (Đã xóa hết phần cấu hình SMTP/Email ở đây cho nhẹ gánh)


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


# --- 2. HÀM GỬI SANG GOOGLE (QUAN TRỌNG) ---
# Hàm này sẽ chạy trực tiếp để đảm bảo dữ liệu sang được Google trước khi trả về
def send_to_google_direct(payload):
    try:
        print(f">> [Google] Đang gửi dữ liệu...")
        # Gửi request sang Google Script
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
            "send_email": True,  # Cờ báo hiệu cho Google Script biết là hãy gửi mail đi
        }

        # D. Gửi sang Google (Chạy Sync để đảm bảo Vercel không kill process)
        # Việc này mất khoảng 0.5s - 1s, rất an toàn cho Vercel
        send_to_google_direct(google_json)

        return jsonify({"status": "success", "message": "Đã gửi thành công"}), 200

    except Exception as e:
        print(f">> [CRITICAL ERROR] {e}")
        return jsonify({"error": str(e)}), 500
