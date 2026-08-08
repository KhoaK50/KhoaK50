import os
from dotenv import load_dotenv

load_dotenv()
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
        return jsonify({"status": "error", "message": "Vui lòng điền đầy đủ thông tin!"}), 400

    if not is_strong_password(password):
        return jsonify({"status": "error", "message": "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ và số!"}), 400

    hashed_password = generate_password_hash(password, method="pbkdf2:sha256")

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()
        
        # 1. Tạo tài khoản với language_pref
        c.execute(
            "INSERT INTO users (display_name, email, password_hash, language_pref) VALUES (%s, %s, %s, %s) RETURNING id",
            (display_name, email, hashed_password, language)
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
        activation_link = f"{FRONTEND_URL}/verify?token={activation_token}"
        
        if language == 'en':
            email_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #3a78ff;">Activate Your Vectoria Account</h2>
                <p>Dear <b>{display_name}</b>,</p>
                <p>Thank you for registering with Vectoria. Please verify your email address to complete your registration:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{activation_link}" style="background-color: #3a78ff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Activate Account</a>
                </div>
                <p style="font-size: 12px; color: #888;">If the button does not work, please copy and paste the following link into your browser: <br>{activation_link}</p>
            </div>
            """
            send_auth_email(email, "Activate Your Vectoria Account", email_content)
        else:
            email_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #3a78ff;">Kích hoạt tài khoản Vectoria</h2>
                <p>Kính gửi <b>{display_name}</b>,</p>
                <p>Cảm ơn bạn đã đăng ký tài khoản tại Vectoria. Vui lòng xác thực địa chỉ email để hoàn tất quá trình đăng ký:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{activation_link}" style="background-color: #3a78ff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Kích hoạt tài khoản</a>
                </div>
                <p style="font-size: 12px; color: #888;">Nếu nút bấm không hoạt động, vui lòng sao chép và dán liên kết sau vào trình duyệt: <br>{activation_link}</p>
            </div>
            """
            send_auth_email(email, "Kích hoạt tài khoản Vectoria", email_content)

        return jsonify({"status": "success", "message": "Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản."}), 201
    
    except psycopg2.IntegrityError:
        return jsonify({"status": "error", "message": "Email này đã được sử dụng!"}), 400
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
        return jsonify({"status": "error", "message": "Thiếu mã xác thực!"}), 400

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
            return jsonify({"status": "error", "message": "Mã xác thực không hợp lệ hoặc đã hết hạn!"}), 400
            
        user_id = result[0]
        is_used = result[1]

        if is_used:
            return jsonify({"status": "error", "message": "Tài khoản này đã được kích hoạt rồi!"}), 400

        # Cập nhật trạng thái tài khoản
        c.execute("UPDATE users SET status = 'active' WHERE id = %s", (user_id,))
        c.execute("UPDATE accountactivations SET is_used = TRUE WHERE activation_token = %s", (token,))
        
        conn.commit()
        return jsonify({"status": "success", "message": "Tài khoản đã được kích hoạt thành công!"}), 200
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
        return jsonify({"status": "error", "message": "Vui lòng nhập Email và Mật khẩu!"}), 400

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        # Cập nhật ngôn ngữ ưu tiên mới nhất khi đăng nhập
        c.execute("UPDATE users SET language_pref = %s WHERE email = %s", (language, email))

        # Tìm kiếm tài khoản bằng email
        c.execute("SELECT id, display_name, email, password_hash, status, token_version FROM users WHERE email = %s", (email,))
        user = c.fetchone()

        if user and check_password_hash(user[3], password):
            user_id = user[0]
            display_name = user[1]
            user_status = user[4]
            token_version = user[5]
            
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
                    email_content = f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
                        <h2 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">Security Alert: New Login Detected</h2>
                        <p>Dear <b>{display_name}</b>,</p>
                        <p>We detected a new login to your Vectoria account from an unrecognized device.</p>
                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>IP Address:</strong> {ip_address}</p>
                            <p style="margin: 5px 0;"><strong>Device:</strong> {friendly_device}</p>
                            <p style="margin: 5px 0;"><strong>Time:</strong> {datetime.now().strftime('%H:%M - %d/%m/%Y')}</p>
                        </div>
                        <p style="margin: 20px 0; font-size: 16px;">Is this you?</p>
                        <p style="color: #666; font-size: 14px;">If you recognize this activity, please confirm your device to prevent future alerts.</p>
                        <div style="text-align: center; margin: 20px 0;">
                            <a href="{confirm_link}" style="background-color: #2ecc71; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin-right: 10px;">Yes, it was me</a>
                        </div>
                        <p style="color: #e74c3c; font-weight: bold; margin-top: 25px;">If you did not authorize this login, please secure your account immediately.</p>
                        <div style="text-align: center; margin: 20px 0;">
                            <a href="{secure_link}" style="background-color: #e74c3c; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Secure Account</a>
                        </div>
                    </div>
                    """
                    send_auth_email(email, "Security Alert: Login from a new device", email_content)
                else:
                    email_content = f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
                        <h2 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">Cảnh báo bảo mật: Đăng nhập từ thiết bị mới</h2>
                        <p>Kính gửi <b>{display_name}</b>,</p>
                        <p>Hệ thống ghi nhận một lượt đăng nhập mới vào tài khoản Vectoria của bạn từ một thiết bị chưa được xác thực.</p>
                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Địa chỉ IP:</strong> {ip_address}</p>
                            <p style="margin: 5px 0;"><strong>Thiết bị:</strong> {friendly_device}</p>
                            <p style="margin: 5px 0;"><strong>Thời gian:</strong> {datetime.now().strftime('%H:%M - %d/%m/%Y')}</p>
                        </div>
                        <p style="margin: 20px 0; font-size: 16px;">Có phải là bạn không?</p>
                        <p style="color: #666; font-size: 14px;">Nếu là bạn, vui lòng xác nhận thiết bị để không bị nhận cảnh báo vào lần sau.</p>
                        <div style="text-align: center; margin: 20px 0;">
                            <a href="{confirm_link}" style="background-color: #2ecc71; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin-right: 10px;">Xác nhận đây là tôi</a>
                        </div>
                        <p style="color: #e74c3c; font-weight: bold; margin-top: 25px;">Nếu bạn không thực hiện đăng nhập này, vui lòng bảo vệ tài khoản ngay lập tức.</p>
                        <div style="text-align: center; margin: 20px 0;">
                            <a href="{secure_link}" style="background-color: #e74c3c; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Bảo vệ tài khoản</a>
                        </div>
                    </div>
                    """
                    send_auth_email(email, "Cảnh báo bảo mật: Đăng nhập từ thiết bị mới", email_content)
            
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
                "email": user[2]
            }), 200
        else:
            return jsonify({"status": "error", "message": "Email hoặc mật khẩu không đúng!"}), 401
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
        return jsonify({"status": "error", "message": "Vui lòng nhập Email!"}), 400

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        c.execute("SELECT id, display_name, language_pref FROM users WHERE email = %s", (email,))
        user = c.fetchone()
        
        if not user:
            return jsonify({"status": "success", "message": "Nếu email tồn tại, thư khôi phục đã được gửi."}), 200

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

        reset_link = f"{FRONTEND_URL}/login.html?reset_token={reset_token}"
        
        if language == 'en':
            email_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #3a78ff;">Password Reset Request</h2>
                <p>Dear <b>{display_name}</b>,</p>
                <p>We received a request to reset the password for your Vectoria account. Click the button below to proceed:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="background-color: #3a78ff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Reset Password</a>
                </div>
                <p style="color: #e74c3c; font-size: 13px;"><i>* This link is valid for 1 hour.</i></p>
                <p style="font-size: 12px; color: #888; margin-top: 20px;">If you did not request a password reset, please ignore this email.</p>
            </div>
            """
            send_auth_email(email, "Reset your Vectoria Password", email_content)
        else:
            email_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #3a78ff;">Yêu cầu Đặt lại mật khẩu</h2>
                <p>Kính gửi <b>{display_name}</b>,</p>
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Vectoria của bạn. Vui lòng sử dụng liên kết dưới đây để thiết lập mật khẩu mới:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="background-color: #3a78ff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Đặt lại mật khẩu</a>
                </div>
                <p style="color: #e74c3c; font-size: 13px;"><i>* Liên kết này có hiệu lực trong vòng 1 giờ.</i></p>
                <p style="font-size: 12px; color: #888; margin-top: 20px;">Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua thông báo này.</p>
            </div>
            """
            send_auth_email(email, "Yêu cầu Đặt lại mật khẩu Vectoria", email_content)

        return jsonify({"status": "success", "message": "Nếu email tồn tại, thư khôi phục đã được gửi."}), 200
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
        return jsonify({"status": "error", "message": "Thiếu thông tin yêu cầu!"}), 400

    if not is_strong_password(new_password):
        return jsonify({"status": "error", "message": "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ và số!"}), 400

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        c.execute("""
            SELECT user_id FROM passwordresets 
            WHERE token = %s AND is_used = FALSE AND expires_at > CURRENT_TIMESTAMP
        """, (token,))
        result = c.fetchone()

        if not result:
            return jsonify({"status": "error", "message": "Đường dẫn đổi mật khẩu không hợp lệ hoặc đã hết hạn!"}), 400

        user_id = result[0]
        hashed_password = generate_password_hash(new_password)

        # Cập nhật mật khẩu mới, đồng thời MỞ KHÓA tài khoản (nếu đang bị khóa) và vô hiệu hóa token cũ
        c.execute("UPDATE users SET password_hash = %s, status = 'active', token_version = token_version + 1 WHERE id = %s", (hashed_password, user_id))
        
        # Đánh dấu mã này đã dùng xong
        c.execute("UPDATE passwordresets SET is_used = TRUE WHERE user_id = %s AND token = %s", (user_id, token))
        
        conn.commit()
        return jsonify({"status": "success", "message": "Thay đổi mật khẩu thành công! Tài khoản đã được bảo vệ."}), 200
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
        return redirect(f"{FRONTEND_URL}/login.html?reset_token={token}")
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
        return jsonify({"status": "error", "message": "Thiếu mã xác thực Google!"}), 400

    try:
        google_api_url = f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={access_token}"
        google_res = requests.get(google_api_url)
        
        if google_res.status_code != 200:
            return jsonify({"status": "error", "message": "Token Google không hợp lệ hoặc đã hết hạn!"}), 401
            
        user_info = google_res.json()
        email = user_info.get("email")
        google_id = user_info.get("sub")
        display_name = user_info.get("name", email.split('@')[0]) 

        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        c.execute("SELECT id, status, auth_provider, token_version FROM users WHERE email = %s", (email,))
        user = c.fetchone()
        
        c.execute("UPDATE users SET language_pref = %s WHERE email = %s", (language, email))

        if user:
            user_id = user[0]
            user_status = user[1]
            user_provider = user[2]
            token_version = user[3]
            
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
        else:
            c.execute(
                "INSERT INTO users (display_name, email, auth_provider, google_id, status, language_pref) VALUES (%s, %s, 'google', %s, 'active', %s) RETURNING id",
                (display_name, email, google_id, language)
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
                email_content = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
                    <h2 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">Security Alert: New Google Login Detected</h2>
                    <p>Dear <b>{display_name}</b>,</p>
                    <p>We detected a new login to your Vectoria account using <b>Google</b> from an unrecognized device.</p>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>IP Address:</strong> {ip_address}</p>
                        <p style="margin: 5px 0;"><strong>Device:</strong> {friendly_device}</p>
                        <p style="margin: 5px 0;"><strong>Time:</strong> {datetime.now().strftime('%H:%M - %d/%m/%Y')}</p>
                    </div>
                    <p style="color: #e74c3c; font-weight: bold;">If you did not authorize this login, please secure your Google account immediately.</p>
                </div>
                """
                send_auth_email(email, "Security Alert: Google login from a new device", email_content)
            else:
                email_content = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
                    <h2 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">Cảnh báo bảo mật: Đăng nhập Google từ thiết bị mới</h2>
                    <p>Kính gửi <b>{display_name}</b>,</p>
                    <p>Hệ thống ghi nhận một lượt đăng nhập mới vào tài khoản Vectoria của bạn bằng <b>Google</b> từ một thiết bị chưa được xác thực.</p>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Địa chỉ IP:</strong> {ip_address}</p>
                        <p style="margin: 5px 0;"><strong>Thiết bị:</strong> {friendly_device}</p>
                        <p style="margin: 5px 0;"><strong>Thời gian:</strong> {datetime.now().strftime('%H:%M - %d/%m/%Y')}</p>
                    </div>
                    <p style="color: #e74c3c; font-weight: bold;">Nếu bạn không thực hiện đăng nhập này, vui lòng kiểm tra và bảo mật tài khoản Google của bạn ngay lập tức.</p>
                </div>
                """
                send_auth_email(email, "Cảnh báo bảo mật: Đăng nhập Google từ thiết bị mới", email_content)

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
            "email": email
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi hệ thống: {str(e)}"}), 500
    finally:
        if 'conn' in locals():
            conn.close()
