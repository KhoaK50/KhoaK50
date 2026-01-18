import sqlite3
import os
import requests  # <-- Nhớ có cái này trong requirements.txt
from datetime import datetime
from flask import Blueprint, request, jsonify

contact_bp = Blueprint('contact', __name__)

# --- CẤU HÌNH GOOGLE APPS SCRIPT (BẤT TỬ) ---
# Ông dán cái link dài ngoằng lấy từ Google Script vào đây:
GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx1f5FhomrrFrwEVtoQh7bgMNTHvY8gwe2O1VR78TXdpE78gInR3kDgcpvVBC_CnMmvvQ/exec" 

# Hàm khởi tạo Database (Giữ nguyên để lưu dự phòng)
def init_feedback_db():
    try:
        conn = sqlite3.connect('feedback.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS feedbacks 
                     (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                      name TEXT, email TEXT, message TEXT, created_at TEXT)''')
        conn.commit()
        conn.close()
        print(">> [Database] Đã kiểm tra/khởi tạo feedback.db.")
    except Exception as e:
        print(f">> [Database Error] {e}")

@contact_bp.route('/api/contact', methods=['POST'])
def handle_contact():
    try:
        print(">> [Backend] Nhận request contact...")
        data = request.json
        
        # Lấy dữ liệu từ Frontend (HTML của ông dùng user_name, user_email)
        user_name = data.get('user_name')
        user_email = data.get('user_email')
        message = data.get('message')
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # 1. LƯU VÀO DATABASE (Dự phòng)
        try:
            with sqlite3.connect('feedback.db') as conn:
                c = conn.cursor()
                c.execute("INSERT INTO feedbacks (name, email, message, created_at) VALUES (?, ?, ?, ?)",
                          (user_name, user_email, message, timestamp))
                conn.commit()
            print(">> [Database] Đã lưu thành công.")
        except Exception as db_err:
            print(f">> [Database Error] {db_err}")

        # 2. GỬI SANG GOOGLE SHEET (BẤT TỬ)
        try:
            print(f">> [Google] Đang gửi dữ liệu sang Sheet...")
            
            # Đổi tên biến cho khớp với Google Script (name, email)
            # Đây là bước "Phiên dịch" để ông không phải sửa HTML
            google_payload = {
                "name": user_name,
                "email": user_email,
                "message": message
            }
            
            # Gửi đi
            requests.post(GOOGLE_SCRIPT_URL, json=google_payload)
            print(f">> [Google] Đã bắn tin thành công!")

        except Exception as e_req:
            print(f">> [Google Error] Lỗi kết nối: {e_req}")

        # 3. TRẢ VỀ THÀNH CÔNG
        return jsonify({"status": "success", "message": "Gửi thành công!"}), 200

    except Exception as e:
        print(f">> [System Error] {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
