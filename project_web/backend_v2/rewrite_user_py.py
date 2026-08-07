import os

file_content = """import os
from dotenv import load_dotenv

load_dotenv()
from flask import Blueprint, request, jsonify
import psycopg2
from werkzeug.security import generate_password_hash, check_password_hash

# Import DB_URL tập trung từ file config
from vectoria_api.config import DB_URL, FRONTEND_URL
import jwt
import secrets
from datetime import datetime, timedelta, timezone
import requests
from email.mime.text import MIMEText

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
            email_content = f\"\"\"
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #3a78ff;">Activate your Vectoria Account</h2>
                <p>Hello <b>{display_name}</b>,</p>
                <p>Thank you for registering. Please click the button below to activate your account:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{activation_link}" style="background-color: #3a78ff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Activate Account</a>
                </div>
                <p style="font-size: 12px; color: #888;">If the button doesn't work, copy and paste this link: <br>{activation_link}</p>
            </div>
            \"\"\"
            send_auth_email(email, "Activate your Vectoria Account", email_content)
        else:
            email_content = f\"\"\"
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #3a78ff;">Kích hoạt tài khoản Vectoria</h2>
                <p>Chào <b>{display_name}</b>,</p>
                <p>Cảm ơn bạn đã đăng ký tài khoản. Vui lòng bấm vào nút bên dưới để kích hoạt tài khoản của bạn:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{activation_link}" style="background-color: #3a78ff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Kích hoạt tài khoản</a>
                </div>
                <p style="font-size: 12px; color: #888;">Nếu nút không hoạt động, bạn có thể copy đường dẫn sau: <br>{activation_link}</p>
            </div>
            \"\"\"
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

            c.execute("SELECT 1 FROM loginhistory WHERE user_id = %s AND device_info = %s", (user_id, device_info))
            is_new_device = not c.fetchone()

            c.execute(
                "INSERT INTO loginhistory (user_id, ip_address, device_info) VALUES (%s, %s, %s)",
                (user_id, ip_address, device_info)
            )
            conn.commit()

            if is_new_device:
                if language == 'en':
                    email_content = f\"\"\"
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
                        <h2 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">Security Alert: New Device Login</h2>
                        <p>Hello <b>{display_name}</b>,</p>
                        <p>We noticed a new login to your Vectoria account from an unrecognized device.</p>
                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>IP Address:</strong> {ip_address}</p>
                            <p style="margin: 5px 0;"><strong>Device:</strong> {friendly_device}</p>
                            <p style="margin: 5px 0;"><strong>Time:</strong> {datetime.now().strftime('%H:%M - %d/%m/%Y')}</p>
                        </div>
                        <p style="color: #e74c3c; font-weight: bold;">If you didn't do this, your account might be compromised!</p>
                        <p>Please change your password immediately by clicking the button below:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{FRONTEND_URL}/login.html" style="background-color: #e74c3c; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Recover Account</a>
                        </div>
                    </div>
                    \"\"\"
                    send_auth_email(email, "⚠️ Security Alert: Login from a new device", email_content)
                else:
                    email_content = f\"\"\"
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
                        <h2 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">Cảnh báo đăng nhập lạ</h2>
                        <p>Chào <b>{display_name}</b>,</p>
                        <p>Chúng tôi vừa phát hiện một lượt đăng nhập mới vào tài khoản Vectoria của bạn từ một thiết bị chưa từng được sử dụng trước đây.</p>
                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Địa chỉ IP:</strong> {ip_address}</p>
                            <p style="margin: 5px 0;"><strong>Thiết bị:</strong> {friendly_device}</p>
                            <p style="margin: 5px 0;"><strong>Thời gian:</strong> {datetime.now().strftime('%H:%M - %d/%m/%Y')}</p>
                        </div>
                        <p style="color: #e74c3c; font-weight: bold;">Nếu bạn không thực hiện việc đăng nhập này, tài khoản của bạn có thể đang bị đe dọa!</p>
                        <p>Vui lòng đổi mật khẩu ngay lập tức bằng cách bấm vào nút bên dưới:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{FRONTEND_URL}/login.html" style="background-color: #e74c3c; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Khôi phục Mật khẩu</a>
                        </div>
                    </div>
                    \"\"\"
                    send_auth_email(email, "⚠️ Cảnh báo: Đăng nhập từ thiết bị lạ", email_content)

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
            email_content = f\"\"\"
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #3a78ff;">Reset your password</h2>
                <p>Hello <b>{display_name}</b>,</p>
                <p>You (or someone else) requested a password reset for your Vectoria account. Click the button below to create a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="background-color: #3a78ff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Create New Password</a>
                </div>
                <p style="color: #e74c3c; font-size: 13px;"><i>* This link will expire in 1 hour for security reasons.</i></p>
                <p style="font-size: 12px; color: #888; margin-top: 20px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
            \"\"\"
            send_auth_email(email, "Reset your Vectoria Password", email_content)
        else:
            email_content = f\"\"\"
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #3a78ff;">Khôi phục mật khẩu</h2>
                <p>Chào <b>{display_name}</b>,</p>
                <p>Bạn (hoặc ai đó) vừa yêu cầu khôi phục mật khẩu cho tài khoản Vectoria của bạn. Vui lòng bấm vào nút bên dưới để tạo mật khẩu mới:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="background-color: #3a78ff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Tạo Mật khẩu Mới</a>
                </div>
                <p style="color: #e74c3c; font-size: 13px;"><i>* Liên kết này sẽ tự động hết hạn sau 1 giờ để đảm bảo an toàn.</i></p>
                <p style="font-size: 12px; color: #888; margin-top: 20px;">Nếu bạn không yêu cầu, hãy bỏ qua email này. Tài khoản của bạn vẫn an toàn.</p>
            </div>
            \"\"\"
            send_auth_email(email, "Khôi phục mật khẩu Vectoria", email_content)

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

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        c.execute(\"\"\"
            SELECT user_id FROM passwordresets 
            WHERE token = %s AND is_used = FALSE AND expires_at > CURRENT_TIMESTAMP
        \"\"\", (token,))
        result = c.fetchone()

        if not result:
            return jsonify({"status": "error", "message": "Đường dẫn đổi mật khẩu không hợp lệ hoặc đã hết hạn!"}), 400

        user_id = result[0]
        hashed_password = generate_password_hash(new_password)

        c.execute("UPDATE users SET password_hash = %s WHERE id = %s", (hashed_password, user_id))
        c.execute("UPDATE passwordresets SET is_used = TRUE WHERE user_id = %s AND token = %s", (user_id, token))
        # Vô hiệu hóa toàn bộ token cũ (Force Logout)
        c.execute("UPDATE users SET token_version = token_version + 1 WHERE id = %s", (user_id,))
        
        conn.commit()
        return jsonify({"status": "success", "message": "Thay đổi mật khẩu thành công!"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi hệ thống: {str(e)}"}), 500
    finally:
        if 'conn' in locals(): conn.close()


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
            
        c.execute("SELECT 1 FROM loginhistory WHERE user_id = %s AND device_info = %s", (user_id, device_info))
        is_new_device = not c.fetchone()

        c.execute(
            "INSERT INTO loginhistory (user_id, ip_address, device_info) VALUES (%s, %s, %s)",
            (user_id, ip_address, device_info)
        )
        conn.commit()
        
        if is_new_device:
            if language == 'en':
                email_content = f\"\"\"
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
                    <h2 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">Security Alert: New Google Login</h2>
                    <p>Hello <b>{display_name}</b>,</p>
                    <p>We noticed a new login to your Vectoria account using <b>Google</b> from an unrecognized device.</p>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>IP Address:</strong> {ip_address}</p>
                        <p style="margin: 5px 0;"><strong>Device:</strong> {friendly_device}</p>
                        <p style="margin: 5px 0;"><strong>Time:</strong> {datetime.now().strftime('%H:%M - %d/%m/%Y')}</p>
                    </div>
                    <p style="color: #e74c3c; font-weight: bold;">If you didn't do this, your Google account might be compromised!</p>
                    <p>Vectoria does not manage your Google password. Please visit your Google Account settings to change your password immediately.</p>
                </div>
                \"\"\"
                send_auth_email(email, "⚠️ Security Alert: Google login from a new device", email_content)
            else:
                email_content = f\"\"\"
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
                    <h2 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">Cảnh báo đăng nhập Google</h2>
                    <p>Chào <b>{display_name}</b>,</p>
                    <p>Chúng tôi vừa phát hiện một lượt đăng nhập mới vào tài khoản Vectoria của bạn bằng <b>Google</b> từ một thiết bị lạ.</p>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Địa chỉ IP:</strong> {ip_address}</p>
                        <p style="margin: 5px 0;"><strong>Thiết bị:</strong> {friendly_device}</p>
                        <p style="margin: 5px 0;"><strong>Thời gian:</strong> {datetime.now().strftime('%H:%M - %d/%m/%Y')}</p>
                    </div>
                    <p style="color: #e74c3c; font-weight: bold;">Nếu bạn không thực hiện việc đăng nhập này, tài khoản Google của bạn có thể đã bị đánh cắp!</p>
                    <p>Vectoria không quản lý mật khẩu Google của bạn. Xin vui lòng truy cập trang quản lý tài khoản Google để đổi mật khẩu ngay lập tức.</p>
                </div>
                \"\"\"
                send_auth_email(email, "⚠️ Cảnh báo: Đăng nhập Google từ thiết bị lạ", email_content)

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
"""

with open(r"D:\Programming_language\project_web\backend_v2\vectoria_api\routes\user.py", "w", encoding="utf-8") as f:
    f.write(file_content)
