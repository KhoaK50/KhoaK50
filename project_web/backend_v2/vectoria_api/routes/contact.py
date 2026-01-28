import sqlite3
import os
import requests 
import threading # Thư viện chạy ngầm
from datetime import datetime
from flask import Blueprint, request, jsonify
import base64

contact_bp = Blueprint('contact', __name__)

# Link Google Script
GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyQtYiblsalJRXXo1P85Cio1L9Q3mO2OreWNiJdvxHtZJsNIqMlJHT1FVjNOoX3grNfSw/exec" 

# --- 1. HÀM KHỞI TẠO DB (APP.PY CẦN GỌI HÀM NÀY) ---
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

# --- 2. HÀM CHẠY NGẦM (GỬI GOOGLE MÀ KHÔNG BẮT CHỜ) ---
def send_to_google_background(payload):
    try:
        print(f">> [Background] Đang gửi sang Google (Size: {len(str(payload))} bytes)...")
        # Timeout 30s (thoải mái vì chạy ngầm)
        requests.post(GOOGLE_SCRIPT_URL, json=payload, timeout=30)
        print(">> [Background] Gửi thành công!")
    except Exception as e:
        print(f">> [Background Error] Gửi thất bại: {e}")

# --- 3. API CHÍNH ---
@contact_bp.route('/api/contact', methods=['POST'])
def handle_contact():
    try:
        # A. Lấy dữ liệu
        user_name = request.form.get('user_name', 'Ẩn danh')
        user_email = request.form.get('user_email', 'Không có email')
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

        # C. Lưu Database (Sửa lỗi full_message scope)
        full_msg = str(message) + (f"\n[📎 {file_name_str}]" if file_name_str else "")
        
        try:
            with sqlite3.connect('feedback.db') as conn:
                c = conn.cursor()
                c.execute("INSERT INTO feedbacks (name, email, message, created_at) VALUES (?, ?, ?, ?)",
                          (user_name, user_email, full_msg, timestamp))
                conn.commit()
        except Exception:
            pass 

        # D. Chuẩn bị gói tin
        google_json = {
            "name": user_name,
            "email": user_email,
            "message": full_msg,
            "file": file_payload 
        }

        # E. KÍCH HOẠT CHẠY NGẦM (QUAN TRỌNG)
        # Tạo luồng riêng để gửi Google, trả lời Web ngay lập tức
        thread = threading.Thread(target=send_to_google_background, args=(google_json,))
        thread.start()

        # F. Phản hồi Web ngay lập tức (0.1s)
        return jsonify({"status": "success", "message": "Đã nhận tin"}), 200

    except Exception as e:
        print(f">> [CRITICAL ERROR] {e}")
        return jsonify({"error": str(e)}), 500