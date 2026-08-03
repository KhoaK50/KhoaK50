import os
from dotenv import load_dotenv

load_dotenv()
from flask import Blueprint, request, jsonify
import psycopg2
from werkzeug.security import generate_password_hash, check_password_hash

# Import DB_URL tập trung từ file config
from vectoria_api.config import DB_URL, FRONTEND_URL
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
        c.execute("""
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
        """)

        # 2. Bảng Lịch sử đăng nhập 
        c.execute("""
            CREATE TABLE IF NOT EXISTS loginhistory (
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR(45),
                device_info VARCHAR(255),
                PRIMARY KEY (user_id, login_at)
            )
        """)

        # 3. Bảng Xác thực tài khoản
        c.execute("""
            CREATE TABLE IF NOT EXISTS accountactivations (
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                activation_token VARCHAR(255) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',
                is_used BOOLEAN NOT NULL DEFAULT FALSE,
                PRIMARY KEY (user_id, activation_token)
            )
        """)

        # 4. Bảng Đặt lại mật khẩu
        c.execute("""
            CREATE TABLE IF NOT EXISTS passwordresets (
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                is_used BOOLEAN NOT NULL DEFAULT FALSE,
                PRIMARY KEY (user_id, token)
            )
        """)
        conn.commit()
        conn.close()
        print(">> [Database] Các bảng Users, LoginHistory, AccountActivations & PasswordResets đã sẵn sàng.")
    except Exception as e:
        print(f">> [Database Error - User DB] {e}")

# Tự động chạy tạo bảng khi khởi động backend
init_user_db()


def send_auth_email(to_email, subject, content):
    RESEND_AUTH_KEY = os.getenv("RESEND_AUTH_KEY") 
    
    # Ki?m tra an ton l? qun c?u hnh key
    if not RESEND_AUTH_KEY:
        print(">> [Email Error] Thi?u RESEND_AUTH_KEY trong bi?n mi tru?ng!")
        return

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {RESEND_AUTH_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        # D verify domain r?i th dng lun auth@vectoria.io.vn cho ng?u
        "from": "Vectoria Auth <support@vectoria.io.vn>", 
        "to": [to_email],
        "subject": subject,
        "text": content
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

    import re
    if not display_name or not email or not password:
        return jsonify({"status": "error", "message": "Vui lòng điền đủ thông tin!"}), 400
        
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({"status": "error", "message": "Email không hợp lệ!"}), 400
        
    if len(password) < 8 or not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
        return jsonify({"status": "error", "message": "Mật khẩu quá yếu! Phải có ít nhất 8 ký tự, 1 chữ cái và 1 chữ số."}), 400

    # Mã hóa mật khẩu bảo mật trước khi lưu
    password_hash = generate_password_hash(password)

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        # Kiểm tra trùng email và lấy kèm cột auth_provider
        c.execute("SELECT id, auth_provider FROM users WHERE email = %s", (email,))
        existing_user = c.fetchone()
        
        if existing_user:
            provider = existing_user[1]
            if provider == 'google':
                return jsonify({
                    "status": "error", 
                    "message": "Email này đã được liên kết với tài khoản Google. Vui lòng đăng nhập bằng Google!"
                }), 400
            else:
                return jsonify({
                    "status": "error", 
                    "message": "Email này đã được đăng ký bằng mật khẩu!"
                }), 400

        # 1. Lưu tài khoản mới với trạng thái 'pending' (Chờ kích hoạt)
        c.execute(
            "INSERT INTO users (display_name, email, password_hash, status) VALUES (%s, %s, %s, 'pending') RETURNING id",
            (display_name, email, password_hash)
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

        # 4. Gửi mail tự động chứa mã kích hoạt cho user
        # Đã cập nhật đường link trỏ thẳng vào Backend để trông chuyên nghiệp hơn và không lộ đường dẫn Frontend
        API_BASE = os.getenv("API_BASE", "http://127.0.0.1:5000")
        activation_link = f"{API_BASE}/api/verify?token={activation_token}"
        email_content = f"Chào {display_name},\nVui lòng kích hoạt tài khoản Vectoria của bạn bằng cách bấm vào đường dẫn sau: {activation_link}"
        send_auth_email(email, "Kích hoạt tài khoản Vectoria", email_content)

        return jsonify({"status": "success", "message": "Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản."}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi hệ thống: {str(e)}"}), 500
    finally:
        if 'conn' in locals():
            conn.close()



from flask import redirect

@user_bp.route("/api/verify", methods=["GET"])
def verify_account():
    token = request.args.get("token")
    if not token:
        return redirect(f"{FRONTEND_URL}/login.html?error=invalid_token")
        
    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()
        
        c.execute(
            "SELECT user_id, is_used FROM accountactivations WHERE activation_token = %s AND expires_at > CURRENT_TIMESTAMP",
            (token,)
        )
        record = c.fetchone()
        
        if not record:
            return redirect(f"{FRONTEND_URL}/login.html?error=invalid_token")
            
        user_id, is_used = record
        if is_used:
            return redirect(f"{FRONTEND_URL}/login.html?error=already_activated")
            
        c.execute("UPDATE users SET status = 'active' WHERE id = %s", (user_id,))
        c.execute("UPDATE accountactivations SET is_used = TRUE WHERE activation_token = %s", (token,))
        conn.commit()
        
        return redirect(f"{FRONTEND_URL}/login.html?activated=true")
        
    except Exception as e:
        return redirect(f"{FRONTEND_URL}/login.html?error=server_error")
    finally:
        if 'conn' in locals():
            conn.close()

@user_bp.route("/api/reset", methods=["GET"])
def handle_reset_redirect():
    token = request.args.get("token")
    if not token:
        return redirect(f"{FRONTEND_URL}/login.html")
    # Redirect straight to frontend reset interface
    return redirect(f"{FRONTEND_URL}/login.html?reset_token={token}")

# --- API ĐĂNG NHẬP TÀI KHOẢN & GHI LOG ---
@user_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"status": "error", "message": "Vui lòng nhập Email và Mật khẩu!"}), 400

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        # Tìm kiếm tài khoản bằng email
        c.execute("SELECT id, display_name, email, password_hash, status FROM users WHERE email = %s", (email,))
        user = c.fetchone()

        if user and check_password_hash(user[3], password):
            user_id = user[0]
            user_status = user[4]
            
            if user_status == 'pending':
                return jsonify({
                    "status": "error", 
                    "message": "Tài khoản của bạn chưa được kích hoạt! Vui lòng kiểm tra email."
                }), 403 # Mã lỗi 403 Forbidden (Chưa kích hoạt)
            
            if user_status in ['locked', 'banned']:
                return jsonify({
                    "status": "error", 
                    "message": "Tài khoản này hiện đang bị khóa hoặc bị cấm truy cập!"
                }), 403
            # Tự động lấy IP và thông tin thiết bị của Client từ Header của request
            ip_address = request.remote_addr
            device_info = request.headers.get('User-Agent', 'Unknown Device')

            # Ghi lịch sử đăng nhập & Kiểm tra thiết bị lạ
            c.execute("SELECT 1 FROM loginhistory WHERE user_id = %s AND device_info = %s", (user_id, device_info))
            is_new_device = not c.fetchone()

            c.execute(
                "INSERT INTO loginhistory (user_id, ip_address, device_info) VALUES (%s, %s, %s)",
                (user_id, ip_address, device_info)
            )
            conn.commit()

            if is_new_device:
                email_content = f"Chào {user[1]},\n\nChúng tôi phát hiện một lượt đăng nhập mới vào tài khoản Vectoria của bạn.\n- Địa chỉ IP: {ip_address}\n- Thiết bị: {device_info}\n\nNếu đây không phải là bạn, vui lòng truy cập {FRONTEND_URL}/login.html, chọn mục 'Quên mật khẩu' để đổi mật khẩu bảo vệ tài khoản ngay lập tức."
                send_auth_email(email, "Cảnh báo Bảo mật: Đăng nhập từ thiết bị mới", email_content)

            # Trả về token đăng nhập
            fake_token = f"vec_token_{user_id}"
            return jsonify({
                "status": "success",
                "token": fake_token,
                "display_name": user[1],
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

    if not email:
        return jsonify({"status": "error", "message": "Vui lòng nhập Email!"}), 400

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        c.execute("SELECT id, display_name FROM users WHERE email = %s", (email,))
        user = c.fetchone()

        if not user:
            return jsonify({"status": "error", "message": "Email không tồn tại trong hệ thống!"}), 404

        user_id, display_name = user
        reset_token = secrets.token_hex(20)
        
        # Lưu token vào database
        c.execute(
            "INSERT INTO passwordresets (user_id, token, expires_at) VALUES (%s, %s, CURRENT_TIMESTAMP + INTERVAL '1 hour')",
            (user_id, reset_token)
        )
        conn.commit()

        # Gửi link đổi mật khẩu
        # Đã cập nhật đường link trỏ thẳng vào Backend để trông chuyên nghiệp hơn và không lộ đường dẫn Frontend
        API_BASE = os.getenv("API_BASE", "http://127.0.0.1:5000")
        reset_link = f"{API_BASE}/api/reset?token={reset_token}"
        email_content = f"Chào {display_name},\nBạn đã yêu cầu đặt lại mật khẩu. Vui lòng nhấn vào đường dẫn sau để tạo mật khẩu mới (Hiệu lực 1 tiếng): {reset_link}"
        send_auth_email(email, "Đặt lại mật khẩu Vectoria", email_content)

        return jsonify({"status": "success", "message": "Hệ thống đã gửi liên kết đặt lại mật khẩu vào email của bạn."}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi hệ thống: {str(e)}"}), 500
    finally:
        if 'conn' in locals(): conn.close()


# --- API TIẾN HÀNH ĐẶT LẠI MẬT KHẨU MỚI ---
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

        # Xác thực tính hợp lệ của mã token đổi mật khẩu
        c.execute("""
            SELECT user_id FROM passwordresets 
            WHERE token = %s AND is_used = FALSE AND expires_at > CURRENT_TIMESTAMP
        """, (token,))
        result = c.fetchone()

        if not result:
            return jsonify({"status": "error", "message": "Đường dẫn đổi mật khẩu không hợp lệ hoặc đã hết hạn!"}), 400

        user_id = result[0]
        hashed_password = generate_password_hash(new_password)

        # Cập nhật mật khẩu mới cho User
        c.execute("UPDATE users SET password_hash = %s WHERE id = %s", (hashed_password, user_id))
        # Đánh dấu mã này đã dùng xong
        c.execute("UPDATE passwordresets SET is_used = TRUE WHERE user_id = %s AND token = %s", (user_id, token))
        
        conn.commit()
        return jsonify({"status": "success", "message": "Thay đổi mật khẩu thành công! Bạn có thể sử dụng mật khẩu mới để đăng nhập."}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi hệ thống: {str(e)}"}), 500
    finally:
        if 'conn' in locals(): conn.close()


# --- API ĐĂNG NHẬP / ĐĂNG KÝ BẰNG GOOGLE ---
@user_bp.route("/api/google-login", methods=["POST"])
def google_login():
    data = request.get_json()
    access_token = data.get("access_token")

    if not access_token:
        return jsonify({"status": "error", "message": "Thiếu mã xác thực Google!"}), 400

    try:
        # 1. Gọi trực tiếp API của Google để lấy thông tin người dùng bằng access_token
        google_api_url = f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={access_token}"
        google_res = requests.get(google_api_url)
        
        if google_res.status_code != 200:
            return jsonify({"status": "error", "message": "Token Google không hợp lệ hoặc đã hết hạn!"}), 401
            
        user_info = google_res.json()
        email = user_info.get("email")
        google_id = user_info.get("sub")
        # Có những người dùng Google không set tên, mình lấy phần đầu email làm tên
        display_name = user_info.get("name", email.split('@')[0]) 

        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        # 2. Kiểm tra xem người dùng đã có trong Database chưa 
        c.execute("SELECT id, status, auth_provider FROM users WHERE email = %s", (email,))
        user = c.fetchone()

        if user:
            user_id = user[0]
            user_status = user[1]
            user_provider = user[2]
            
            # Nếu là tài khoản đăng ký tay thì không cho đăng nhập bằng Google chen ngang
            if user_provider == 'local':
                return jsonify({
                    "status": "error",
                    "message": "Email này đã được đăng ký bằng mật khẩu. Vui lòng đăng nhập bằng Email & Mật khẩu!"
                }), 400

            if user_status == 'pending':
                # Chỉ kích hoạt tài khoản nếu là tài khoản chờ của Google
                c.execute(
                    "UPDATE users SET status = 'active', google_id = %s WHERE id = %s", 
                    (google_id, user_id)
                )
            else:
                # Đồng bộ google_id nếu lỡ bị trống
                c.execute(
                    "UPDATE users SET google_id = %s WHERE id = %s AND google_id IS NULL", 
                    (google_id, user_id)
                )
        else:
            # 3. NẾU LÀ NGƯỜI MỚI: Tự động Đăng ký & Kích hoạt (Active) ngay lập tức!
            c.execute(
                """INSERT INTO users (display_name, email, auth_provider, google_id, status) 
                   VALUES (%s, %s, 'google', %s, 'active') RETURNING id""",
                (display_name, email, google_id)
            )
            user_id = c.fetchone()[0]

        # Ghi lịch sử đăng nhập & Kiểm tra thiết bị lạ
        ip_address = request.remote_addr
        device_info = request.headers.get('User-Agent', 'Unknown Device')
        
        # Parse tên thiết bị thân thiện
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
            email_content = f"Chào {display_name},\n\nChúng tôi phát hiện một lượt đăng nhập mới vào tài khoản Vectoria của bạn qua Google.\n- Địa chỉ IP: {ip_address}\n- Thiết bị: {friendly_device}\n\nNếu đây không phải là bạn, tài khoản Google của bạn có thể đã bị thỏa hiệp. Vui lòng đổi mật khẩu Google ngay lập tức."
            send_auth_email(email, "Cảnh báo Bảo mật: Đăng nhập từ thiết bị mới", email_content)

        # Trả về token đăng nhập
        fake_token = f"vec_token_{user_id}"
        return jsonify({
            "status": "success",
            "token": fake_token,
            "display_name": display_name,
            "email": email
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi hệ thống: {str(e)}"}), 500
    finally:
        if 'conn' in locals():
            conn.close()