import os
import requests
import psycopg2
import jwt
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from vectoria_api.config import DB_URL

admin_bp = Blueprint("admin", __name__)

def get_admin_secret():
    return os.environ.get("ADMIN_SECRET_KEY", "vectoria-admin-123")

def get_db_connection():
    return psycopg2.connect(DB_URL)

# --- 1. INITIALIZE DB ---
def init_admin_db():
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Bảng admins
        c.execute("""
            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Bảng logs
        c.execute("""
            CREATE TABLE IF NOT EXISTS admin_audit_logs (
                id SERIAL PRIMARY KEY,
                admin_username VARCHAR(50),
                action VARCHAR(100),
                details TEXT,
                ip_address VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        


        conn.commit()
        conn.close()
        print(">> [Database] Admin & Audit Logs tables initialized.")
    except Exception as e:
        print(f">> [Database Error] Admin init: {e}")

init_admin_db()

# --- 2. AUTHENTICATION & LOGGING ---
def check_auth():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return False, None
    
    token = auth_header.split(" ")[1]
    
    # Hỗ trợ cả 2 dạng: Master Key cũ (cho những API chưa update) và JWT mới
    if token == get_admin_secret():
        return True, "system"
        
    try:
        payload = jwt.decode(token, get_admin_secret(), algorithms=["HS256"])
        return True, payload.get("username")
    except:
        return False, None

def log_admin_action(username, action, details):
    try:
        ip = request.remote_addr or "unknown"
        conn = get_db_connection()
        c = conn.cursor()
        c.execute(
            "INSERT INTO admin_audit_logs (admin_username, action, details, ip_address) VALUES (%s, %s, %s, %s)",
            (username, action, details, ip)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Failed to log admin action: {e}")

# --- 3. ROUTES ---
@admin_bp.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    master_key = data.get("master_key") # Tùy chọn: Nhập 2 lớp bảo vệ
    
    if master_key and master_key != get_admin_secret():
        return jsonify({"error": "Sai Master Key bảo vệ!"}), 401

    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT id, password_hash FROM admins WHERE username = %s", (username,))
        row = c.fetchone()
        conn.close()
        
        if row and check_password_hash(row[1], password):
            # Tạo JWT Token
            token = jwt.encode(
                {
                    "username": username, 
                    "exp": datetime.now(timezone.utc) + timedelta(hours=12)
                }, 
                get_admin_secret(), 
                algorithm="HS256"
            )
            log_admin_action(username, "LOGIN", "Admin logged in successfully.")
            return jsonify({"status": "success", "token": token, "username": username}), 200
        else:
            return jsonify({"error": "Sai tên đăng nhập hoặc mật khẩu"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/api/admin/register", methods=["POST"])
def admin_register():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    master_key = data.get("master_key")
    
    if not master_key or master_key != get_admin_secret():
        return jsonify({"error": "Sai Master Key! Bạn không có quyền tạo tài khoản."}), 403
        
    if not username or not password:
        return jsonify({"error": "Thiếu username hoặc password."}), 400

    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        password_hash = generate_password_hash(password)
        c.execute(
            "INSERT INTO admins (username, password_hash) VALUES (%s, %s)",
            (username, password_hash)
        )
        conn.commit()
        conn.close()
        
        log_admin_action("system", "REGISTER_ADMIN", f"Tạo tài khoản admin mới: {username}")
        return jsonify({"message": "Tạo tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ."}), 201
    except psycopg2.IntegrityError:
        return jsonify({"error": "Tên đăng nhập này đã tồn tại."}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/api/admin/verify", methods=["GET"])
def verify_admin():
    is_valid, username = check_auth()
    if not is_valid:
        return jsonify({"valid": False}), 401
    return jsonify({"valid": True, "username": username}), 200

@admin_bp.route("/api/admin/logs", methods=["GET"])
def get_audit_logs():
    is_valid, _ = check_auth()
    if not is_valid: return jsonify({"error": "Unauthorized"}), 401
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT id, admin_username, action, details, ip_address, created_at FROM admin_audit_logs ORDER BY created_at DESC LIMIT 100;")
        rows = c.fetchall()
        cols = [desc[0] for desc in c.description]
        data = [dict(zip(cols, row)) for row in rows]
        conn.close()
        for item in data:
            if item['created_at']:
                item['created_at'] = item['created_at'].strftime("%Y-%m-%d %H:%M:%S")
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/api/admin/tables", methods=["GET"])
def get_tables():
    is_valid, _ = check_auth()
    if not is_valid: return jsonify({"error": "Unauthorized"}), 401
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';")
        tables = [row[0] for row in c.fetchall()]
        conn.close()
        return jsonify(tables)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/api/admin/table/<table_name>", methods=["GET"])
def get_table_data(table_name):
    is_valid, _ = check_auth()
    if not is_valid: return jsonify({"error": "Unauthorized"}), 401
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';")
        valid_tables = [row[0] for row in c.fetchall()]
        if table_name not in valid_tables:
            return jsonify({"error": "Invalid table"}), 400
            
        c.execute(f"SELECT * FROM {table_name} LIMIT 50;")
        rows = c.fetchall()
        cols = [desc[0] for desc in c.description]
        data = [dict(zip(cols, row)) for row in rows]
        conn.close()
        return jsonify({"columns": cols, "data": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/api/admin/lessons", methods=["GET"])
def get_lessons():
    is_valid, _ = check_auth()
    if not is_valid: return jsonify({"error": "Unauthorized"}), 401
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT l.topic_id, l.order_index, l.title, l.content_html, l.total_views, l.created_at,
                   l.section_id, t.title as topic_title, s.title as section_title
            FROM lessons l
            LEFT JOIN topics t ON l.topic_id = t.id
            LEFT JOIN sections s ON l.section_id = s.id
            ORDER BY l.topic_id ASC, l.order_index ASC, l.created_at ASC;
        """)
        rows = c.fetchall()
        cols = [desc[0] for desc in c.description]
        data = [dict(zip(cols, row)) for row in rows]
        conn.close()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/api/admin/lesson/<topic_id>/<int:order_index>", methods=["PUT"])
def update_lesson(topic_id, order_index):
    is_valid, username = check_auth()
    if not is_valid: return jsonify({"error": "Unauthorized"}), 401
    try:
        data = request.json
        content_html = data.get("content_html")
        
        conn = get_db_connection()
        c = conn.cursor()
        c.execute(
            "UPDATE lessons SET content_html = %s WHERE topic_id = %s AND order_index = %s RETURNING title;",
            (content_html, topic_id, order_index)
        )
        if c.rowcount == 0:
            conn.close()
            return jsonify({"error": "Lesson not found"}), 404
        
        lesson_title = c.fetchone()[0]
        conn.commit()
        conn.close()
        
        log_admin_action(username, "UPDATE_LESSON", f"Updated content for lesson: {lesson_title} (Topic: {topic_id})")
        return jsonify({"message": "Lesson updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/api/admin/lesson", methods=["POST"])
def create_lesson():
    is_valid, username = check_auth()
    if not is_valid: return jsonify({"error": "Unauthorized"}), 401
    try:
        data = request.json
        topic_id = data.get("topic_id")
        order_index = data.get("order_index", 1)
        section_id = data.get("section_id")
        title = data.get("title")
        content_html = data.get("content_html", "")
        
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("INSERT INTO topics (id, title) VALUES (%s, %s) ON CONFLICT (id) DO NOTHING;", (topic_id, title + ' Topic'))
        c.execute("INSERT INTO sections (id, topic_id, title, order_index) VALUES (%s, %s, %s, 1) ON CONFLICT (id) DO NOTHING;", (section_id, topic_id, title + ' Section'))
        
        c.execute(
            "INSERT INTO lessons (topic_id, order_index, section_id, title, content_html) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (topic_id, order_index) DO UPDATE SET title = EXCLUDED.title, content_html = EXCLUDED.content_html RETURNING topic_id;",
            (topic_id, order_index, section_id, title, content_html)
        )
        conn.commit()
        conn.close()
        
        log_admin_action(username, "CREATE_LESSON", f"Created/Updated lesson: {title} in Topic: {topic_id}")
        return jsonify({"message": "Lesson created/updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/api/course/lesson/<lesson_id>", methods=["GET"])
def get_public_lesson(lesson_id):
    try:
        order_idx = int(lesson_id.replace('l', ''))
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT content_html FROM lessons WHERE order_index = %s LIMIT 1;", (order_idx,))
        row = c.fetchone()
        conn.close()
        if row:
            return jsonify({"content_html": row[0]})
        return jsonify({"error": "Not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/api/admin/feedbacks", methods=["GET"])
def get_feedbacks():
    is_valid, _ = check_auth()
    if not is_valid: return jsonify({"error": "Unauthorized"}), 401
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT id, name, email, message, created_at, status, admin_reply, replied_at 
            FROM feedbacks 
            ORDER BY created_at DESC;
        """)
        rows = c.fetchall()
        cols = [desc[0] for desc in c.description]
        data = [dict(zip(cols, row)) for row in rows]
        conn.close()
        
        for item in data:
            if item['created_at']:
                item['created_at'] = item['created_at'].strftime("%Y-%m-%d %H:%M:%S")
            if item['replied_at']:
                item['replied_at'] = item['replied_at'].strftime("%Y-%m-%d %H:%M:%S")

        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/api/admin/feedbacks/<int:feedback_id>/reply", methods=["POST"])
def reply_feedback(feedback_id):
    is_valid, username = check_auth()
    if not is_valid: return jsonify({"error": "Unauthorized"}), 401
    try:
        data = request.json
        reply_message = data.get("reply_message")
        if not reply_message:
            return jsonify({"error": "Reply message is required"}), 400

        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT name, email, message FROM feedbacks WHERE id = %s", (feedback_id,))
        feedback = c.fetchone()
        
        if not feedback:
            conn.close()
            return jsonify({"error": "Feedback not found"}), 404
            
        user_name, user_email, original_message = feedback

        api_key = os.getenv("RESEND_API_KEY")
        if not api_key:
            conn.close()
            return jsonify({"error": "RESEND_API_KEY is not configured"}), 500

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; display: inline-block;">Vectoria Support</h2>
            </div>
            <p>Kính gửi <strong>{user_name}</strong>,</p>
            <p>Cảm ơn bạn đã liên hệ với <strong>Vectoria</strong>. Đội ngũ quản trị viên của chúng tôi đã nhận được tin nhắn và xin phản hồi bạn như sau:</p>
            
            <div style="background-color: #f1f8ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3498db; white-space: pre-wrap;">{reply_message}</div>
            
            <p style="margin-top: 25px; font-size: 14px; color: #7f8c8d;">Nội dung tin nhắn gốc của bạn:</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-style: italic; color: #7f8c8d; border-left: 4px solid #bdc3c7;">"{original_message}"</div>
            
            <p>Trân trọng,<br><strong>Đội ngũ Vectoria</strong></p>
        </div>
        """

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "from": "Vectoria Support <support@vectoria.io.vn>",
            "to": [user_email],
            "subject": "Phản hồi từ Vectoria",
            "html": html_content,
        }
        
        response = requests.post("https://api.resend.com/emails", headers=headers, json=payload)
        
        if response.status_code >= 400:
            conn.close()
            return jsonify({"error": f"Failed to send email: {response.text}"}), 500

        current_time = datetime.now(timezone.utc)
        c.execute("""
            UPDATE feedbacks 
            SET status = 'replied', admin_reply = %s, replied_at = %s 
            WHERE id = %s
        """, (reply_message, current_time, feedback_id))
        conn.commit()
        conn.close()

        log_admin_action(username, "REPLY_FEEDBACK", f"Replied to feedback #{feedback_id} from {user_email}")
        return jsonify({"status": "success", "message": "Đã gửi phản hồi thành công"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/api/admin/db/tables", methods=["GET"])
def get_db_tables():
    is_valid, _ = check_auth()
    if not is_valid: return jsonify({"error": "Unauthorized"}), 401
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
        tables = [row[0] for row in c.fetchall()]
        conn.close()
        return jsonify(tables)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/api/admin/db/table/<table_name>", methods=["GET"])
def get_db_table_data(table_name):
    is_valid, _ = check_auth()
    if not is_valid: return jsonify({"error": "Unauthorized"}), 401
    try:
        conn = get_db_connection()
        c = conn.cursor()
        # Ensure table_name is safe by checking if it exists in information_schema
        c.execute("SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s", (table_name,))
        if not c.fetchone():
            return jsonify({"error": "Invalid table"}), 400
            
        c.execute(f"SELECT * FROM {table_name} LIMIT 100;")
        rows = c.fetchall()
        cols = [desc[0] for desc in c.description]
        data = [dict(zip(cols, row)) for row in rows]
        
        # Format datetime objects
        for row in data:
            for k, v in row.items():
                if isinstance(v, datetime):
                    row[k] = v.strftime("%Y-%m-%d %H:%M:%S")
                    
        conn.close()
        return jsonify({"columns": cols, "data": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/api/admin/db/query", methods=["POST"])
def execute_db_query():
    is_valid, username = check_auth()
    if not is_valid: return jsonify({"error": "Unauthorized"}), 401
    try:
        query = request.json.get("query", "").strip()
        if not query:
            return jsonify({"error": "Empty query"}), 400
            
        conn = get_db_connection()
        c = conn.cursor()
        c.execute(query)
        
        if query.upper().startswith("SELECT"):
            rows = c.fetchall()
            cols = [desc[0] for desc in c.description]
            data = [dict(zip(cols, row)) for row in rows]
            
            for row in data:
                for k, v in row.items():
                    if isinstance(v, datetime):
                        row[k] = v.strftime("%Y-%m-%d %H:%M:%S")
            conn.close()
            return jsonify({"columns": cols, "data": data})
        else:
            conn.commit()
            affected = c.rowcount
            conn.close()
            log_admin_action(username, "DB_QUERY", f"Executed query affecting {affected} rows: {query[:100]}")
            return jsonify({"message": f"Query executed successfully. Affected rows: {affected}"})
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500
