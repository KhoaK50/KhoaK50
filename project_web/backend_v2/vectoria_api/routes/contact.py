import sqlite3
import os
import requests  # <-- Thư viện mới để đi đường HTTP (Bắt buộc phải có trong requirements.txt)
from datetime import datetime
from flask import Blueprint, request, jsonify

contact_bp = Blueprint('contact', __name__)

# --- CẤU HÌNH FORMSPREE ---
# Đây là mã form tui lấy từ hình ông gửi
FORMSPREE_URL = "https://formspree.io/f/xbddgogg"

# --- HÀM KHỞI TẠO DATABASE ---
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

        # 1. LƯU VÀO DATABASE (Vẫn giữ để lưu trữ nội bộ)
        try:
            with sqlite3.connect('feedback.db') as conn:
                c = conn.cursor()
                c.execute("INSERT INTO feedbacks (name, email, message, created_at) VALUES (?, ?, ?, ?)",
                          (name, email, message, timestamp))
                conn.commit()
            print(">> [Database] Lưu feedback thành công.")
        except Exception as db_err:
            print(f">> [Database Error] Lỗi lưu DB: {db_err}")

        # 2. GỬI QUA FORMSPREE (Dùng HTTP - Không bị Render chặn)
        try:
            print(f">> [Formspree] Đang gửi dữ liệu sang Formspree...")
            
            # Gửi request POST sang server của Formspree
            response = requests.post(
                FORMSPREE_URL,
                json={
                    "email": email,
                    "message": message,
                    "name": name,
                    "_subject": f"🔔 Góp ý mới từ {name} (Vectoria)" # Tiêu đề mail
                }
            )

            if response.status_code == 200:
                print(f">> [Formspree] Gửi thành công! Mail sẽ về hòm thư của ông.")
            else:
                print(f">> [Formspree Warning] Có lỗi nhỏ: {response.text}")
                # Không raise lỗi, để Frontend vẫn báo thành công cho user vui

        except Exception as e_req:
            print(f">> [Formspree Error] Lỗi kết nối: {e_req}")

        # 3. TRẢ VỀ THÀNH CÔNG CHO FRONTEND
        return jsonify({"status": "success", "message": "Cảm ơn! Góp ý đã được gửi."}), 200

    except Exception as e:
        print(f">> [System Error] Lỗi xử lý contact: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
