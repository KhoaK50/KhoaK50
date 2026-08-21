import os
from dotenv import load_dotenv

load_dotenv()

def get_modern_email(title, greeting, paragraphs, btn_text=None, btn_link=None, fallback_link=None, sub_text=None, lang='vi'):
    btn_html = ""
    if btn_text and btn_link:
        btn_html = f"""
        <div style="margin: 32px 0;">
            <a href="{btn_link}" style="display: inline-block; padding: 12px 24px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">{btn_text}</a>
        </div>
        """
        if fallback_link:
            fallback_msg = "Nếu nút bấm không hoạt động, vui lòng sao chép và dán liên kết sau:" if lang == 'vi' else "If the button doesn't work, please copy and paste the following link:"
            btn_html += f"""
            <p style="color: #64748b; font-size: 13px; margin-bottom: 8px;">{fallback_msg}</p>
            <p style="color: #3b82f6; font-size: 13px; word-break: break-all; margin-top: 0;"><a href="{fallback_link}" style="color: #3b82f6; text-decoration: underline;">{fallback_link}</a></p>
            """
            
    p_html = "".join([f'<p style="color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">{p}</p>' for p in paragraphs])
    sub_html = f'<p style="color: #64748b; font-size: 13px; margin-top: 32px;">{sub_text}</p>' if sub_text else ""
    
    footer_text = "Nếu bạn không yêu cầu hành động này, vui lòng bỏ qua email này." if lang == 'vi' else "If you didn't request this action, please ignore this email."
    
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 40px 20px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <tr>
      <td style="padding: 40px;">
        <div style="font-weight: 800; font-size: 20px; color: #0f172a; letter-spacing: -0.5px; margin-bottom: 40px;">VECTORIA</div>
        <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 24px;">{title}</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">{greeting}</p>
        {p_html}
        {btn_html}
        {sub_html}
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
        <p style="color: #94a3b8; font-size: 13px; margin-bottom: 8px;">{footer_text}</p>
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; 2026 Vectoria &mdash; vectoria.io.vn</p>
      </td>
    </tr>
  </table>
</body>
</html>"""


def tr_msg(msg_vi):
    try:
        from flask import request
        if request.method == "GET":
            lang = request.args.get("lang", "vi")
        elif request.is_json and request.json:
            lang = request.json.get("language", "vi")
        else:
            lang = "vi"
    except Exception:
        lang = "vi"
        
    msgs = {
        "Vui lòng điền đầy đủ thông tin!": "Please fill in all information!",
        "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ và số!": "Password must be at least 8 characters, including letters and numbers!",
        "Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.": "Registration successful! Please check your email to activate your account.",
        "Email này đã được sử dụng!": "This email is already in use!",
        "Thiếu mã xác thực!": "Missing authentication code!",
        "Mã xác thực không hợp lệ hoặc đã hết hạn!": "Invalid or expired authentication code!",
        "Tài khoản này đã được kích hoạt rồi!": "This account is already activated!",
        "Tài khoản đã được kích hoạt thành công!": "Account activated successfully!",
        "Vui lòng nhập Email và Mật khẩu!": "Please enter Email and Password!",
        "Email hoặc mật khẩu không đúng!": "Incorrect email or password!",
        "Vui lòng nhập Email!": "Please enter Email!",
        "Nếu email tồn tại, thư khôi phục đã được gửi.": "If the email exists, a recovery email has been sent.",
        "Thiếu thông tin yêu cầu!": "Missing required information!",
        "Đường dẫn đổi mật khẩu không hợp lệ hoặc đã hết hạn!": "Invalid or expired password reset link!",
        "Thay đổi mật khẩu thành công! Tài khoản đã được bảo vệ.": "Password changed successfully! Your account is protected.",
        "Thiếu mã xác thực Google!": "Missing Google authentication code!",
        "Token Google không hợp lệ hoặc đã hết hạn!": "Invalid or expired Google token!"
    }
    if lang == 'en':
        return msgs.get(msg_vi, msg_vi)
    return msg_vi

from flask import Blueprint, request, jsonify, redirect
import psycopg2
from werkzeug.security import generate_password_hash, check_password_hash

# Import DB_URL tập trung từ file config
from vectoria_api.config import DB_URL, FRONTEND_URL
import jwt
import secrets
from datetime import datetime, timedelta, timezone
import requests
from email.mime.text import MIMEText
import re

def is_strong_password(password):
    if len(password) < 8:
        return False
    if not re.search(r"[a-zA-Z]", password):
        return False
    if not re.search(r"[0-9]", password):
        return False
    return True

user_bp = Blueprint("user", __name__)


def init_user_db():
    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        # 1. Bảng USER
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                display_name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL CHECK (email LIKE '%@%'),
                password_hash VARCHAR(255),
                auth_provider VARCHAR(20) DEFAULT 'local',
                google_id VARCHAR(255) UNIQUE,
                status VARCHAR(20) DEFAULT 'pending', 
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Cập nhật thêm các cột mới cho tính năng Bảo mật JWT và Đa ngôn ngữ (nếu chưa có)
        c.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1;")
        c.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS language_pref VARCHAR(10) DEFAULT 'vi';")
        
        # Thêm cột is_trusted cho thiết bị
        c.execute("ALTER TABLE loginhistory ADD COLUMN IF NOT EXISTS is_trusted BOOLEAN DEFAULT TRUE;")

        # 2. Bảng Lịch sử đăng nhập 
        c.execute('''
            CREATE TABLE IF NOT EXISTS loginhistory (
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR(45),
                device_info VARCHAR(255),
                PRIMARY KEY (user_id, login_at)
            )
        ''')

        # 3. Bảng Xác thực tài khoản
        c.execute('''
            CREATE TABLE IF NOT EXISTS accountactivations (
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                activation_token VARCHAR(255) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',
                is_used BOOLEAN NOT NULL DEFAULT FALSE,
                PRIMARY KEY (user_id, activation_token)
            )
        ''')

        # 4. Bảng Đặt lại mật khẩu
        c.execute('''
            CREATE TABLE IF NOT EXISTS passwordresets (
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                is_used BOOLEAN NOT NULL DEFAULT FALSE,
                PRIMARY KEY (user_id, token)
            )
        ''')
        conn.commit()
        conn.close()
        print(">> [Database] Các bảng Users, LoginHistory, AccountActivations & PasswordResets đã sẵn sàng.")
    except Exception as e:
        print(f">> [Database Error - User DB] {e}")

# Tự động chạy tạo bảng khi khởi động backend
init_user_db()


def send_auth_email(to_email, subject, html_content):
    RESEND_AUTH_KEY = os.getenv("RESEND_AUTH_KEY") 
    
    if not RESEND_AUTH_KEY:
        print(">> [Email Error] Thiếu RESEND_AUTH_KEY trong biến môi trường!")
        return

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {RESEND_AUTH_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "from": "Vectoria Auth <support@vectoria.io.vn>", 
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code in [200, 201]:
            print(f">> [Resend System] Đã phát email kích hoạt thành công đến {to_email}")
        else:
            print(f">> [Resend Error] API trả về lỗi: {response.text}")
    except Exception as e:
        print(f">> [Email Error] Không thể kết nối tới Resend: {e}")


# --- API ĐĂNG KÝ TÀI KHOẢN ---
@user_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    display_name = data.get("display_name")
    email = data.get("email")
    password = data.get("password")
    language = data.get("language", "vi")

    if not display_name or not email or not password:
        return jsonify({"status": "error", "message": tr_msg("Vui lòng điền đầy đủ thông tin!")}), 400

    if not is_strong_password(password):
        return jsonify({"status": "error", "message": tr_msg("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ và số!")}), 400

    hashed_password = generate_password_hash(password, method="pbkdf2:sha256")

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()
        
        # 1. Tạo tài khoản với language_pref
        c.execute(
            "INSERT INTO users (display_name, email, password_hash, language_pref) VALUES (%s, %s, %s, %s) RETURNING id",
            (display_name, email, hashed_password)
        )
        user_id = c.fetchone()[0]

        # 2. Tạo mã token kích hoạt bảo mật ngẫu nhiên
        activation_token = secrets.token_hex(20)

        # 3. Lưu token vào bảng accountactivations (hết hạn sau 24 giờ)
        c.execute(
            "INSERT INTO accountactivations (user_id, activation_token, expires_at) VALUES (%s, %s, CURRENT_TIMESTAMP + INTERVAL '24 hours')",
            (user_id, activation_token)
        )
        conn.commit()
        
        # 4. Gửi email kích hoạt
        referer = request.headers.get("Referer", "")
        if referer and "login.html" in referer:
            base_url = referer.split("login.html")[0].rstrip("/")
        else:
            base_url = request.headers.get("Origin", FRONTEND_URL) + "/frontend_v2" if "127.0.0.1" in request.headers.get("Origin", "") or "localhost" in request.headers.get("Origin", "") else request.headers.get("Origin", FRONTEND_URL)
        
        activation_link = f"{base_url}/verify.html?token={activation_token}"
        
        if language == 'en':
            email_content = get_modern_email(
                title="Confirm your account",
                greeting=f"Hi {display_name},",
                paragraphs=["Thanks for signing up for Vectoria. Please confirm your email address to complete your registration."],
                btn_text="Verify Email",
                btn_link=activation_link,
                fallback_link=activation_link,
                lang="en"
            )
            send_auth_email(email, "Verify your Vectoria account", email_content)
        else:
            email_content = get_modern_email(
                title="Xác thực tài khoản",
                greeting=f"Chào bạn, {display_name},",
                paragraphs=["Cảm ơn bạn đã đăng ký. Vui lòng xác thực email để hoàn tất quá trình đăng ký."],
                btn_text="Xác thực ngay",
                btn_link=activation_link,
                fallback_link=activation_link,
                lang="vi"
            )
            send_auth_email(email, "Xác thực tài khoản — Vectoria", email_content)

        return jsonify({"status": "success", "message": tr_msg("Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.")}), 201
    
    except psycopg2.IntegrityError:
        return jsonify({"status": "error", "message": tr_msg("Email này đã được sử dụng!")}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi hệ thống: {str(e)}"}), 500
    finally:
        if 'conn' in locals():
            conn.close()


# --- API XÁC THỰC KÍCH HOẠT TÀI KHOẢN ---
@user_bp.route("/api/verify", methods=["GET"])
def verify_account():
    token = request.args.get("token")
    
    if not token:
        return jsonify({"status": "error", "message": tr_msg("Thiếu mã xác thực!")}), 400

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        # Kiểm tra token có hợp lệ không
        c.execute(
            "SELECT user_id, is_used FROM accountactivations WHERE activation_token = %s AND expires_at > CURRENT_TIMESTAMP",
            (token,)
        )
        result = c.fetchone()

        if not result:
            return jsonify({"status": "error", "message": tr_msg("Mã xác thực không hợp lệ hoặc đã hết hạn!")}), 400
            
        user_id = result[0]
        is_used = result[1]

        if is_used:
            return jsonify({"status": "error", "message": tr_msg("Tài khoản này đã được kích hoạt rồi!")}), 400

        # Cập nhật trạng thái tài khoản
        c.execute("UPDATE users SET status = 'active' WHERE id = %s", (user_id,))
        c.execute("UPDATE accountactivations SET is_used = TRUE WHERE activation_token = %s", (token,))
        
        conn.commit()
        return jsonify({"status": "success", "message": tr_msg("Tài khoản đã được kích hoạt thành công!")}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi hệ thống: {str(e)}"}), 500
    finally:
        if 'conn' in locals():
            conn.close()


# --- API ĐĂNG NHẬP TÀI KHOẢN ---
@user_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    language = data.get("language", "vi")

    if not email or not password:
        return jsonify({"status": "error", "message": tr_msg("Vui lòng nhập Email và Mật khẩu!")}), 400

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        # Cập nhật ngôn ngữ ưu tiên mới nhất khi đăng nhập
        c.execute("UPDATE users SET language_pref = %s WHERE email = %s", (language, email))

        # Tìm kiếm tài khoản bằng email
        c.execute("SELECT id, display_name, email, password_hash, status, token_version, avatar_url FROM users WHERE email = %s", (email,))
        user = c.fetchone()

        if user and check_password_hash(user[3], password):
            user_id = user[0]
            display_name = user[1]
            user_status = user[4]
            token_version = user[5]
            avatar_url = user[6]
            
            if user_status == 'pending':
                return jsonify({
                    "status": "error", 
                    "message": "Tài khoản của bạn chưa được kích hoạt! Vui lòng kiểm tra email."
                }), 403
            
            if user_status in ['locked', 'banned']:
                return jsonify({
                    "status": "error", 
                    "message": "Tài khoản này hiện đang bị khóa hoặc bị cấm truy cập!"
                }), 403

            ip_address = request.remote_addr
            device_info = request.headers.get('User-Agent', 'Unknown Device')

            friendly_device = device_info
            try:
                from user_agents import parse
                ua = parse(device_info)
                device_str = f"{ua.device.family} - " if ua.device.family and ua.device.family != 'Other' else ""
                friendly_device = f"{device_str}{ua.os.family} ({ua.browser.family})"
            except:
                pass

            # Check total trusted logins to see if this is the first login ever
            c.execute("SELECT COUNT(*) FROM loginhistory WHERE user_id = %s AND is_trusted = TRUE", (user_id,))
            total_trusted_logins = c.fetchone()[0]

            # Check if this specific device is already trusted
            c.execute("SELECT 1 FROM loginhistory WHERE user_id = %s AND device_info = %s AND is_trusted = TRUE", (user_id, device_info))
            is_new_device = not c.fetchone()

            is_trusted_now = True if total_trusted_logins == 0 else (not is_new_device)

            c.execute(
                "INSERT INTO loginhistory (user_id, ip_address, device_info, is_trusted) VALUES (%s, %s, %s, %s)",
                (user_id, ip_address, device_info, is_trusted_now)
            )

            if is_new_device and total_trusted_logins > 0:
                # Generate a secure token to lock the account and reset password
                secure_token = secrets.token_hex(20)
                c.execute(
                    "INSERT INTO passwordresets (user_id, token, expires_at) VALUES (%s, %s, CURRENT_TIMESTAMP + INTERVAL '1 hour')",
                    (user_id, secure_token)
                )
                
                SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key-vectoria-2026")
                confirm_token = jwt.encode(
                    {"user_id": user_id, "device_info": device_info, "action": "confirm_device", "exp": datetime.now(timezone.utc) + timedelta(days=7)},
                    SECRET_KEY, 
                    algorithm="HS256"
                )

                API_BASE = os.getenv("API_BASE", "https://visualization-rr5v.onrender.com")
                secure_link = f"{API_BASE}/api/secure-account?token={secure_token}"
                confirm_link = f"{API_BASE}/api/confirm-device?token={confirm_token}"

                if language == 'en':
                    email_content = get_modern_email(
                title="New login detected",
                greeting=f"Hi {display_name},",
                paragraphs=["We detected a new login to your Vectoria account from an unrecognized device."],
                sub_text=f"<b>Time:</b> {current_time}<br><b>Device IP:</b> {ip_address}<br><b>User Agent:</b> {user_agent}",
                btn_text="Yes, it was me",
                btn_link=confirm_link,
                fallback_link=confirm_link,
                lang="en"
            )
                    send_auth_email(email, "Security alert — Vectoria", email_content)
                else:
                    email_content = get_modern_email(
                title="Phát hiện đăng nhập mới",
                greeting=f"Chào bạn, {display_name},",
                paragraphs=["Chúng tôi phát hiện một lượt đăng nhập mới vào tài khoản Vectoria của bạn từ một thiết bị lạ."],
                sub_text=f"<b>Thời gian:</b> {current_time}<br><b>Địa chỉ IP:</b> {ip_address}<br><b>Thiết bị:</b> {user_agent}",
                btn_text="Vâng, đó là tôi",
                btn_link=confirm_link,
                fallback_link=confirm_link,
                lang="vi"
            )
                    send_auth_email(email, "Cảnh báo bảo mật — Vectoria", email_content)
            
            conn.commit()

            # Trả về token JWT thực sự
            SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key-vectoria-2026")
            real_token = jwt.encode(
                {"user_id": user_id, "token_version": token_version, "exp": datetime.now(timezone.utc) + timedelta(days=7)},
                SECRET_KEY, 
                algorithm="HS256"
            )

            return jsonify({
                "status": "success",
                "token": real_token,
                "display_name": display_name,
                "email": user[2],
                "avatar_url": avatar_url
            }), 200
        else:
            return jsonify({"status": "error", "message": tr_msg("Email hoặc mật khẩu không đúng!")}), 401
    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi hệ thống: {str(e)}"}), 500
    finally:
        if 'conn' in locals(): conn.close()


# --- API QUÊN MẬT KHẨU ---
@user_bp.route("/api/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()
    email = data.get("email")
    language = data.get("language", "vi")

    if not email:
        return jsonify({"status": "error", "message": tr_msg("Vui lòng nhập Email!")}), 400

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        c.execute("SELECT id, display_name, language_pref FROM users WHERE email = %s", (email,))
        user = c.fetchone()
        
        if not user:
            return jsonify({"status": "success", "message": tr_msg("Nếu email tồn tại, thư khôi phục đã được gửi.")}), 200

        user_id = user[0]
        display_name = user[1]
        
        # Nếu người dùng đang dùng ngôn ngữ nào trên web thì email cũng sẽ gửi theo ngôn ngữ đó (có thể cập nhật luôn db)
        c.execute("UPDATE users SET language_pref = %s WHERE id = %s", (language, user_id))
        
        reset_token = secrets.token_hex(20)

        c.execute(
            "INSERT INTO passwordresets (user_id, token, expires_at) VALUES (%s, %s, CURRENT_TIMESTAMP + INTERVAL '1 hour')",
            (user_id, reset_token)
        )
        conn.commit()

        referer = request.headers.get("Referer", "")
        if referer and "login.html" in referer:
            base_url = referer.split("login.html")[0].rstrip("/")
        else:
            base_url = request.headers.get("Origin", FRONTEND_URL) + "/frontend_v2" if "127.0.0.1" in request.headers.get("Origin", "") or "localhost" in request.headers.get("Origin", "") else request.headers.get("Origin", FRONTEND_URL)
            
        reset_link = f"{base_url}/reset_password.html?token={reset_token}"
        
        if language == 'en':
            email_content = get_modern_email(
                title="Reset your password",
                greeting=f"Hi {display_name},",
                paragraphs=["We received a request to reset the password for your Vectoria account. Click the button below to choose a new password."],
                btn_text="Reset Password",
                btn_link=reset_link,
                fallback_link=reset_link,
                lang="en"
            )
            send_auth_email(email, "Reset your password — Vectoria", email_content)
        else:
            email_content = get_modern_email(
                title="Đặt lại mật khẩu",
                greeting=f"Chào bạn, {display_name},",
                paragraphs=["Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Vectoria của bạn. Nhấn vào nút bên dưới để tạo mật khẩu mới."],
                btn_text="Đặt lại mật khẩu",
                btn_link=reset_link,
                fallback_link=reset_link,
                lang="vi"
            )
            send_auth_email(email, "Đặt lại mật khẩu — Vectoria", email_content)

        return jsonify({"status": "success", "message": tr_msg("Nếu email tồn tại, thư khôi phục đã được gửi.")}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi hệ thống: {str(e)}"}), 500
    finally:
        if 'conn' in locals(): conn.close()


# --- API ĐẶT LẠI MẬT KHẨU MỚI ---
@user_bp.route("/api/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()
    token = data.get("token")
    new_password = data.get("new_password")

    if not token or not new_password:
        return jsonify({"status": "error", "message": tr_msg("Thiếu thông tin yêu cầu!")}), 400

    if not is_strong_password(new_password):
        return jsonify({"status": "error", "message": tr_msg("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ và số!")}), 400

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        c.execute("""
            SELECT user_id FROM passwordresets 
            WHERE token = %s AND is_used = FALSE AND expires_at > CURRENT_TIMESTAMP
        """, (token,))
        result = c.fetchone()

        if not result:
            return jsonify({"status": "error", "message": tr_msg("Đường dẫn đổi mật khẩu không hợp lệ hoặc đã hết hạn!")}), 400

        user_id = result[0]
        hashed_password = generate_password_hash(new_password)

        # Cập nhật mật khẩu mới, đồng thời MỞ KHÓA tài khoản (nếu đang bị khóa) và vô hiệu hóa token cũ
        c.execute("UPDATE users SET password_hash = %s, status = 'active', token_version = token_version + 1 WHERE id = %s", (hashed_password, user_id))
        
        # Đánh dấu mã này đã dùng xong
        c.execute("UPDATE passwordresets SET is_used = TRUE WHERE user_id = %s AND token = %s", (user_id, token))
        
        conn.commit()
        return jsonify({"status": "success", "message": tr_msg("Thay đổi mật khẩu thành công! Tài khoản đã được bảo vệ.")}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi hệ thống: {str(e)}"}), 500
    finally:
        if 'conn' in locals(): conn.close()




# --- API XÁC NHẬN THIẾT BỊ AN TOÀN ---
@user_bp.route("/api/confirm-device", methods=["GET"])
def confirm_device():
    token = request.args.get("token")
    if not token:
        return "Thiếu mã xác nhận (Missing token)", 400

    try:
        SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key-vectoria-2026")
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        
        if payload.get("action") != "confirm_device":
            return "Mã xác nhận không hợp lệ", 400
            
        user_id = payload.get("user_id")
        device_info = payload.get("device_info")

        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        # Cập nhật thiết bị thành is_trusted
        c.execute("UPDATE loginhistory SET is_trusted = TRUE WHERE user_id = %s AND device_info = %s", (user_id, device_info))
        conn.commit()
        
        return "Xác nhận thiết bị thành công! Từ nay bạn sẽ không nhận được cảnh báo bảo mật khi đăng nhập trên thiết bị này nữa."
    except jwt.ExpiredSignatureError:
        return "Mã xác nhận đã hết hạn (Token expired)", 400
    except jwt.InvalidTokenError:
        return "Mã xác nhận không hợp lệ (Invalid token)", 400
    except Exception as e:
        return f"Lỗi hệ thống: {str(e)}", 500
    finally:
        if 'conn' in locals():
            conn.close()

# --- API BẢO VỆ TÀI KHOẢN KHI BỊ XÂM NHẬP ---
@user_bp.route("/api/secure-account", methods=["GET"])
def secure_account():
    token = request.args.get("token")
    if not token:
        return "Thiếu mã bảo vệ (Missing token)", 400

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        # Kiểm tra token hợp lệ
        c.execute("""
            SELECT user_id FROM passwordresets 
            WHERE token = %s AND is_used = FALSE AND expires_at > CURRENT_TIMESTAMP
        """, (token,))
        result = c.fetchone()

        if not result:
            return "Đường dẫn bảo vệ tài khoản không hợp lệ hoặc đã hết hạn (Link invalid or expired)", 400

        user_id = result[0]

        # Khóa tài khoản và vô hiệu hóa JWT token cũ ngay lập tức (Force Logout)
        c.execute("UPDATE users SET status = 'locked', token_version = token_version + 1 WHERE id = %s", (user_id,))
        conn.commit()
        
        # Chuyển hướng người dùng đến giao diện đặt lại mật khẩu của frontend
        return redirect(f"{FRONTEND_URL}/reset_password.html?token={token}")
    except Exception as e:
        return f"Lỗi hệ thống: {str(e)}", 500
    finally:
        if 'conn' in locals():
            conn.close()

# --- API ĐĂNG NHẬP BẰNG GOOGLE ---
@user_bp.route("/api/google-login", methods=["POST"])
def google_login():
    data = request.get_json()
    access_token = data.get("access_token")
    language = data.get("language", "vi")

    if not access_token:
        return jsonify({"status": "error", "message": tr_msg("Thiếu mã xác thực Google!")}), 400

    try:
        google_api_url = f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={access_token}"
        google_res = requests.get(google_api_url)
        
        if google_res.status_code != 200:
            return jsonify({"status": "error", "message": tr_msg("Token Google không hợp lệ hoặc đã hết hạn!")}), 401
            
        user_info = google_res.json()
        email = user_info.get("email")
        google_id = user_info.get("sub")
        display_name = user_info.get("name", email.split('@')[0]) 

        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        c.execute("SELECT id, status, auth_provider, token_version, avatar_url FROM users WHERE email = %s", (email,))
        user = c.fetchone()
        
        c.execute("UPDATE users SET language_pref = %s WHERE email = %s", (language, email))

        if user:
            user_id = user[0]
            user_status = user[1]
            user_provider = user[2]
            token_version = user[3]
            avatar_url = user[4]
            
            if user_provider == 'local':
                return jsonify({
                    "status": "error",
                    "message": "Email này đã được đăng ký bằng mật khẩu. Vui lòng đăng nhập bằng Email & Mật khẩu!"
                }), 400

            if user_status == 'pending':
                c.execute(
                    "UPDATE users SET status = 'active', google_id = %s WHERE id = %s", 
                    (google_id, user_id)
                )
            else:
                c.execute(
                    "UPDATE users SET google_id = %s WHERE id = %s AND google_id IS NULL", 
                    (google_id, user_id)
                )

            # Update avatar from Google if user has none
            if not avatar_url and user_info.get("picture"):
                avatar_url = user_info.get("picture")
                c.execute("UPDATE users SET avatar_url = %s WHERE id = %s", (avatar_url, user_id))
        else:
            avatar_url = user_info.get("picture")
            c.execute(
                "INSERT INTO users (display_name, email, auth_provider, google_id, status, language_pref, avatar_url) VALUES (%s, %s, 'google', %s, 'active', %s, %s) RETURNING id",
                (display_name, email, google_id, language, avatar_url)
            )
            user_id = c.fetchone()[0]
            token_version = 1

        ip_address = request.remote_addr
        device_info = request.headers.get('User-Agent', 'Unknown Device')
        
        friendly_device = device_info
        try:
            from user_agents import parse
            ua = parse(device_info)
            device_str = f"{ua.device.family} - " if ua.device.family and ua.device.family != 'Other' else ""
            friendly_device = f"{device_str}{ua.os.family} ({ua.browser.family})"
        except:
            pass
            
        # Check total trusted logins to see if this is the first login ever
        c.execute("SELECT COUNT(*) FROM loginhistory WHERE user_id = %s AND is_trusted = TRUE", (user_id,))
        total_trusted_logins = c.fetchone()[0]

        # Check if this specific device is already trusted
        c.execute("SELECT 1 FROM loginhistory WHERE user_id = %s AND device_info = %s AND is_trusted = TRUE", (user_id, device_info))
        is_new_device = not c.fetchone()

        is_trusted_now = True if total_trusted_logins == 0 else (not is_new_device)

        c.execute(
            "INSERT INTO loginhistory (user_id, ip_address, device_info, is_trusted) VALUES (%s, %s, %s, %s)",
            (user_id, ip_address, device_info, is_trusted_now)
        )
        
        if is_new_device and total_trusted_logins > 0:
            # Generate a secure token to lock the account and reset password
            secure_token = secrets.token_hex(20)
            c.execute(
                "INSERT INTO passwordresets (user_id, token, expires_at) VALUES (%s, %s, CURRENT_TIMESTAMP + INTERVAL '1 hour')",
                (user_id, secure_token)
            )
            
            SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key-vectoria-2026")
            confirm_token = jwt.encode(
                {"user_id": user_id, "device_info": device_info, "action": "confirm_device", "exp": datetime.now(timezone.utc) + timedelta(days=7)},
                SECRET_KEY, 
                algorithm="HS256"
            )

            API_BASE = os.getenv("API_BASE", "https://visualization-rr5v.onrender.com")
            secure_link = f"{API_BASE}/api/secure-account?token={secure_token}"
            confirm_link = f"{API_BASE}/api/confirm-device?token={confirm_token}"

            if language == 'en':
                email_content = get_modern_email(
                title="New Google login detected",
                greeting=f"Hi {display_name},",
                paragraphs=["We detected a login to your Vectoria account using Google from an unrecognized device."],
                sub_text=f"<b>Time:</b> {current_time}<br><b>Device IP:</b> {ip_address}<br><b>User Agent:</b> {user_agent}",
                btn_text="Yes, it was me",
                btn_link=confirm_link,
                fallback_link=confirm_link,
                lang="en"
            )
                send_auth_email(email, "Security alert — Vectoria", email_content)
            else:
                email_content = get_modern_email(
                title="Phát hiện đăng nhập Google mới",
                greeting=f"Chào bạn, {display_name},",
                paragraphs=["Chúng tôi phát hiện một lượt đăng nhập vào tài khoản Vectoria của bạn bằng Google từ một thiết bị lạ."],
                sub_text=f"<b>Thời gian:</b> {current_time}<br><b>Địa chỉ IP:</b> {ip_address}<br><b>Thiết bị:</b> {user_agent}",
                btn_text="Vâng, đó là tôi",
                btn_link=confirm_link,
                fallback_link=confirm_link,
                lang="vi"
            )
                send_auth_email(email, "Cảnh báo bảo mật — Vectoria", email_content)

        SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key-vectoria-2026")
        real_token = jwt.encode(
            {"user_id": user_id, "token_version": token_version, "exp": datetime.now(timezone.utc) + timedelta(days=7)},
            SECRET_KEY, 
            algorithm="HS256"
        )

        return jsonify({
            "status": "success",
            "token": real_token,
            "display_name": display_name,
            "email": email,
            "avatar_url": avatar_url
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi hệ thống: {str(e)}"}), 500
    finally:
        if 'conn' in locals():
            conn.close()

# --- API LẤY DANH SÁCH BÀI ĐÃ LƯU (BOOKMARKS) ---
@user_bp.route("/api/user/<int:user_id>/bookmarks", methods=["GET", "POST"])
def manage_user_bookmarks(user_id):
    try:
        from psycopg2.extras import RealDictCursor
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        if request.method == "POST":
            data = request.json
            topic_id = data.get("topic_id")
            order_index = data.get("order_index")
            note = data.get("note", "")
            action = data.get("action") # "save" or "remove"
            
            if not topic_id or order_index is None:
                return jsonify({"success": False, "message": "Missing topic_id or order_index"}), 400
                
            if action == "save":
                query = """
                    INSERT INTO saved_lessons (user_id, topic_id, order_index, note, saved_at, is_pinned)
                    VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, FALSE)
                    ON CONFLICT (user_id, topic_id, order_index) 
                    DO UPDATE SET note = EXCLUDED.note, saved_at = CURRENT_TIMESTAMP;
                """
                cursor.execute(query, (user_id, topic_id, order_index, note))
            elif action == "remove":
                query = """
                    DELETE FROM saved_lessons
                    WHERE user_id = %s AND topic_id = %s AND order_index = %s;
                """
                cursor.execute(query, (user_id, topic_id, order_index))
            else:
                return jsonify({"success": False, "message": "Invalid action"}), 400
                
            conn.commit()
            return jsonify({"success": True, "message": f"Bookmark {action}d successfully."}), 200

        # GET method
        query = """
            SELECT sl.topic_id, sl.order_index, sl.note, sl.saved_at, sl.is_pinned, l.title, l.complexity, l.time
            FROM saved_lessons sl
            LEFT JOIN lessons l ON sl.topic_id = l.topic_id AND sl.order_index = l.order_index
            WHERE sl.user_id = %s
            ORDER BY sl.is_pinned DESC, sl.saved_at DESC;
        """
        cursor.execute(query, (user_id,))
        bookmarks = cursor.fetchall()
        
        for b in bookmarks:
            b['saved_at'] = b['saved_at'].isoformat() if b['saved_at'] else None
            
        return jsonify({"success": True, "bookmarks": bookmarks}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()


# --- API BOOKMARK VỚI JWT AUTH (Frontend dùng endpoint này) ---
from vectoria_api.middleware.auth import token_required as bookmark_token_required

@user_bp.route("/api/bookmarks", methods=["GET", "POST"])
@bookmark_token_required
def manage_bookmarks_jwt(user_id):
    try:
        from psycopg2.extras import RealDictCursor
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        if request.method == "POST":
            data = request.json
            lesson_id = data.get("lesson_id")
            action = data.get("action")
            note = data.get("note", "")
            
            if not lesson_id:
                return jsonify({"success": False, "message": "Missing lesson_id"}), 400
            
            parts = lesson_id.rsplit('-', 1)
            if len(parts) == 2 and parts[1].isdigit():
                topic_id = parts[0]
                order_index = int(parts[1])
            else:
                topic_id = lesson_id
                order_index = 1
                
            # Temporary mapping for frontend mock data: if topic_id is 'l1', map to 't1'
            if topic_id == 'l1':
                topic_id = 't1'
                
            if action == "save":
                query = """
                    INSERT INTO saved_lessons (user_id, topic_id, order_index, note, saved_at, is_pinned)
                    VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, FALSE)
                    ON CONFLICT (user_id, topic_id, order_index) 
                    DO UPDATE SET note = EXCLUDED.note, saved_at = CURRENT_TIMESTAMP;
                """
                try:
                    cursor.execute(query, (user_id, topic_id, order_index, note))
                except psycopg2.errors.ForeignKeyViolation:
                    conn.rollback()
                    return jsonify({"success": False, "message": f"Bài học không tồn tại trong hệ thống (topic={topic_id}, index={order_index})"}), 400
            elif action == "remove":
                query = """
                    DELETE FROM saved_lessons
                    WHERE user_id = %s AND topic_id = %s AND order_index = %s;
                """
                cursor.execute(query, (user_id, topic_id, order_index))
            else:
                return jsonify({"success": False, "message": "Invalid action"}), 400
                
            conn.commit()
            return jsonify({"success": True, "message": f"Bookmark {action}d successfully."}), 200

        # GET
        query = """
            SELECT sl.topic_id, sl.order_index, sl.note, sl.saved_at, sl.is_pinned, l.title, l.complexity, l.time
            FROM saved_lessons sl
            LEFT JOIN lessons l ON sl.topic_id = l.topic_id AND sl.order_index = l.order_index
            WHERE sl.user_id = %s
            ORDER BY sl.is_pinned DESC, sl.saved_at DESC;
        """
        cursor.execute(query, (user_id,))
        bookmarks = cursor.fetchall()
        
        for b in bookmarks:
            b['saved_at'] = b['saved_at'].isoformat() if b['saved_at'] else None
            if b['topic_id'] == 't1' and b['order_index'] == 1:
                b['lesson_id'] = 'l1-1'
            else:
                b['lesson_id'] = f"{b['topic_id']}-{b['order_index']}"
            
        return jsonify({"success": True, "bookmarks": bookmarks}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()


# --- API LẤY LỊCH SỬ HỌC TẬP (HISTORY) ---
@user_bp.route("/api/user/<int:user_id>/history", methods=["GET"])
def get_user_history(user_id):
    try:
        from psycopg2.extras import RealDictCursor
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT topic_id, order_index, last_read_percent, visited_at
            FROM user_lesson_history
            WHERE user_id = %s
            ORDER BY visited_at DESC
            LIMIT 50;
        """
        cursor.execute(query, (user_id,))
        history = cursor.fetchall()
        
        for h in history:
            h['visited_at'] = h['visited_at'].isoformat()
            
        return jsonify({"success": True, "history": history}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

# --- API ĐÁNH GIÁ & TỐI ƯU LỘ TRÌNH (GRAPH ROUTING) ---
from vectoria_api.routes.routing_logic import calculate_optimal_path
import json

@user_bp.route("/api/user/<int:user_id>/routing/optimize", methods=["POST"])
def optimize_routing(user_id):
    try:
        is_new, proposed, notes = calculate_optimal_path(user_id)
        return jsonify({
            "success": True, 
            "is_new_proposal": is_new, 
            "proposed_path": proposed, 
            "reasoning_notes": notes
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@user_bp.route("/api/user/<int:user_id>/routing/accept", methods=["POST"])
def accept_routing(user_id):
    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()
        
        # Get proposed path
        c.execute("SELECT current_path, proposed_path FROM user_learning_paths WHERE user_id = %s", (user_id,))
        row = c.fetchone()
        if not row or not row[1]:
            return jsonify({"success": False, "message": "No proposed path found"}), 400
            
        current_path = row[0]
        proposed_path = row[1]
        
        # Backup to history_path (if exists) or just overwrite current_path
        # We can store the old current_path in proposed_path as a backup for rollback
        c.execute("""
            UPDATE user_learning_paths 
            SET current_path = %s, proposed_path = %s, is_pending_decision = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
        """, (json.dumps(proposed_path) if isinstance(proposed_path, list) else proposed_path, 
              json.dumps(current_path) if isinstance(current_path, list) else current_path, 
              user_id))
        conn.commit()
        
        return jsonify({"success": True, "message": "Routing accepted"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'c' in locals(): c.close()
        if 'conn' in locals(): conn.close()

@user_bp.route("/api/user/<int:user_id>/routing/rollback", methods=["POST"])
def rollback_routing(user_id):
    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()
        
        # We stored the old path in proposed_path during accept
        c.execute("SELECT current_path, proposed_path FROM user_learning_paths WHERE user_id = %s", (user_id,))
        row = c.fetchone()
        if not row or not row[1]:
            return jsonify({"success": False, "message": "No rollback path found"}), 400
            
        current_path = row[0]
        backup_path = row[1]
        
        c.execute("""
            UPDATE user_learning_paths 
            SET current_path = %s, proposed_path = %s, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
        """, (json.dumps(backup_path) if isinstance(backup_path, list) else backup_path, 
              json.dumps(current_path) if isinstance(current_path, list) else current_path, 
              user_id))
        conn.commit()
        
        return jsonify({"success": True, "message": "Routing rolled back"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'c' in locals(): c.close()
        if 'conn' in locals(): conn.close()

from vectoria_api.core.cloudinary_service import upload_avatar_to_cloudinary

@user_bp.route("/api/user/avatar", methods=["POST"])
def upload_avatar():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"success": False, "message": "Missing or invalid token"}), 401
    
    token = auth_header.split(" ")[1]
    try:
        import os
        SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key-vectoria-2026")
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
    except Exception as e:
        return jsonify({"success": False, "message": "Invalid token"}), 401

    if "file" not in request.files:
        return jsonify({"success": False, "message": "No file uploaded"}), 400
        
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "message": "Empty file name"}), 400
        
    secure_url = upload_avatar_to_cloudinary(file, user_id)
    if not secure_url:
        return jsonify({"success": False, "message": "Failed to upload to Cloudinary"}), 500
        
    # Update DB
    try:
        from psycopg2 import connect
        from vectoria_api.config import DB_URL
        conn = connect(DB_URL)
        c = conn.cursor()
        c.execute("UPDATE users SET avatar_url = %s WHERE id = %s", (secure_url, user_id))
        conn.commit()
    except Exception as e:
        print(f"Error updating avatar in DB: {e}")
        return jsonify({"success": False, "message": "Failed to save avatar URL to database"}), 500
    finally:
        if 'c' in locals(): c.close()
        if 'conn' in locals(): conn.close()
        
    return jsonify({"success": True, "avatar_url": secure_url})
