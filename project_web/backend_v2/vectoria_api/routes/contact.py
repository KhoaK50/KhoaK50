import sqlite3
import os
import requests 
import threading # Still needed for Google Sheets async
import smtplib   # Library for sending emails
from email.mime.text import MIMEText # Formatting email content
from email.mime.multipart import MIMEMultipart # Email structure
from datetime import datetime
from flask import Blueprint, request, jsonify
import base64

contact_bp = Blueprint('contact', __name__)

# --- CONFIGURATION ---
# Google Script Link
GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyQtYiblsalJRXXo1P85Cio1L9Q3mO2OreWNiJdvxHtZJsNIqMlJHT1FVjNOoX3grNfSw/exec" 

# Email Configuration
SMTP_SERVER = 'smtp.gmail.com'
SMTP_PORT = 465 # SSL Port
SENDER_EMAIL = 'sc3.nguyentrandangkhoa@gmail.com' 
SENDER_PASSWORD = 'gkon zewb nyua ywkb'   

# --- 1. DB INITIALIZATION FUNCTION ---
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

# --- 2. BACKGROUND FUNCTION (SEND TO GOOGLE) ---
# Keeping this async is generally safer for performance, even on serverless, 
# as the request is fast.
def send_to_google_background(payload):
    try:
        print(f">> [Background] Sending to Google (Size: {len(str(payload))} bytes)...")
        # Reduced timeout to ensure it doesn't hang the thread too long
        requests.post(GOOGLE_SCRIPT_URL, json=payload, timeout=10)
        print(">> [Background] Sent to Google successfully!")
    except Exception as e:
        print(f">> [Background Error] Google send failed: {e}")

# --- 3. SYNCHRONOUS EMAIL FUNCTION ---
# This runs in the main thread to ensure completion on Vercel/Render
def send_email_direct(user_email, user_name):
    try:
        # Basic email validation
        if not user_email or "@" not in user_email:
            return 

        print(f">> [Email] Sending email to {user_email}...")

        # Create email content
        msg = MIMEMultipart()
        msg['From'] = f"Vectoria Support <{SENDER_EMAIL}>"
        msg['To'] = user_email
        msg['Subject'] = "Cảm ơn bạn đã liên hệ với Vectoria!"

        # HTML Email Content
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

        # Connect to Gmail Server and send
        server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        print(f">> [Email] Sent successfully to {user_email}")
    except Exception as e:
        print(f">> [Email Error] Send failed: {e}")

# --- 4. MAIN API ---
@contact_bp.route('/api/contact', methods=['POST'])
def handle_contact():
    try:
        # A. Get Data
        user_name = request.form.get('user_name', 'Ẩn danh')
        user_email = request.form.get('user_email', '') # Default empty to check for email sending
        message = request.form.get('message', '')
        uploaded_file = request.files.get('attachment')
        
        file_payload = None
        file_name_str = ""

        # B. Handle File (if any)
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

        # C. Save to Database (Local sqlite)
        full_msg = str(message) + (f"\n[📎 {file_name_str}]" if file_name_str else "")
        
        try:
            with sqlite3.connect('feedback.db') as conn:
                c = conn.cursor()
                c.execute("INSERT INTO feedbacks (name, email, message, created_at) VALUES (?, ?, ?, ?)",
                          (user_name, user_email, full_msg, timestamp))
                conn.commit()
        except Exception:
            pass 

        # D. Prepare payload for Google
        google_json = {
            "name": user_name,
            "email": user_email,
            "message": full_msg,
            "file": file_payload 
        }

        # E. EXECUTE TASKS
        
        # 1. Send to Google Sheets (Background Thread)
        # We keep this async because it's an external API call that might be slow but isn't critical for the user's immediate confirmation loop in the same way email is.
        # However, Vercel might still kill this. If you want 100% guarantee for sheets too, remove threading here as well.
        # For now, leaving it as requested to focus on fixing email.
        thread_google = threading.Thread(target=send_to_google_background, args=(google_json,))
        thread_google.start()

        # 2. Send Auto-reply Email (DIRECT/SYNCHRONOUS call)
        # This blocks the response until email is sent, ensuring execution on serverless platforms.
        if user_email and "@" in user_email:
            send_email_direct(user_email, user_name)

        # F. Response to Web
        return jsonify({"status": "success", "message": "Đã nhận tin"}), 200

    except Exception as e:
        print(f">> [CRITICAL ERROR] {e}")
        return jsonify({"error": str(e)}), 500