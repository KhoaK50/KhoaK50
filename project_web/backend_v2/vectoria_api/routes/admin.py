import bleach
from vectoria_api.config import ADMIN_SECRET_KEY
import os
import threading
import time
import requests
import psycopg2
from vectoria_api.database import get_db_connection, release_db_connection

import jwt
import zipfile
import re
import uuid
import shutil
import tempfile
from datetime import datetime, timedelta, timezone
from werkzeug.security import check_password_hash
from vectoria_api.config import DB_URL
from flask import Blueprint, request, jsonify

admin_bp = Blueprint("admin", __name__)

def get_admin_secret():
    return ADMIN_SECRET_KEY



def parse_latex_to_html(text):
    if not text: return text
    import re
    # 1. Collapsible Proofs (Hỗ trợ proof, chungminh, giai, huongdan)
    text = re.sub(
        r'\\begin\{(proof|chungminh|solution|giai|huongdan|explain)\}\s*(.*?)\s*\\end\{\1\}', 
        r'<details><summary>Chi tiết (Xem/Ẩn)</summary><div class="proof-content">\2</div></details>', 
        text, 
        flags=re.DOTALL | re.IGNORECASE
    )
    
    # 2. Anchors and Cross-referencing
    text = re.sub(r'\\label\{([^}]+)\}', r'<a id="\1"></a>', text)
    text = re.sub(r'\\ref\{([^}]+)\}', r'<a href="#\1">[Xem mục \1]</a>', text)
    text = re.sub(r'\\hyperref\[([^\]]+)\]\{([^}]+)\}', r'<a href="#\1">\2</a>', text)
    
    # 3. URLs
    text = re.sub(r'\\url\{([^}]+)\}', r'<a href="\1" target="_blank">\1</a>', text)
    text = re.sub(r'\\href\{([^}]+)\}\{([^}]+)\}', r'<a href="\1" target="_blank">\2</a>', text)
    
    return text

# --- STRESS TEST ENGINE (In-memory state) ---
stress_state = {
    'is_running': False,
    'started_by': None,
    'started_at': None,
    'config': {},
    'results': [],
    'summary': {
        'total_requests': 0,
        'success_count': 0,
        'error_count': 0,
        'avg_latency_ms': 0,
        'min_latency_ms': 0,
        'max_latency_ms': 0,
        'requests_per_second': 0,
        'p95_latency_ms': 0,
        'p99_latency_ms': 0,
    },
    'per_target': {},
    'timeline': [],
    'stop_flag': False
}
stress_lock = threading.Lock()

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
        release_db_connection(conn)
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
        release_db_connection(conn)
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
        release_db_connection(conn)
        
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
        release_db_connection(conn)
        
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
        release_db_connection(conn)
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
        release_db_connection(conn)
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
        release_db_connection(conn)
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
                   l.section_id, t.title as topic_title, s.title as section_title,
                   l.complexity as difficulty_level, l.time as estimated_time
            FROM lessons l
            LEFT JOIN topics t ON l.topic_id = t.id
            LEFT JOIN sections s ON l.section_id = s.id
            ORDER BY l.topic_id ASC, l.order_index ASC, l.created_at ASC;
        """)
        rows = c.fetchall()
        cols = [desc[0] for desc in c.description]
        data = [dict(zip(cols, row)) for row in rows]
        release_db_connection(conn)
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
        lang = data.get("lang", "vi")
        title = data.get("title", "") # if they provide title
        difficulty_level = data.get("difficulty_level")
        estimated_time = data.get("estimated_time")
        
        conn = get_db_connection()
        c = conn.cursor()
        
        if lang == 'vi':
            # Update base attributes along with vi content
            if difficulty_level is not None and estimated_time is not None:
                c.execute(
                    "UPDATE lessons SET content_html = %s, complexity = %s, time = %s WHERE topic_id = %s AND order_index = %s RETURNING title;",
                    (content_html, difficulty_level, estimated_time, topic_id, order_index)
                )
            else:
                c.execute(
                    "UPDATE lessons SET content_html = %s WHERE topic_id = %s AND order_index = %s RETURNING title;",
                    (content_html, topic_id, order_index)
                )
                
            if c.rowcount == 0:
                release_db_connection(conn)
                return jsonify({"error": "Lesson not found"}), 404
            lesson_title = c.fetchone()[0]
        else:
            # For non-vi, still update the shared base properties if provided
            if difficulty_level is not None and estimated_time is not None:
                c.execute(
                    "UPDATE lessons SET complexity = %s, time = %s WHERE topic_id = %s AND order_index = %s;",
                    (difficulty_level, estimated_time, topic_id, order_index)
                )
            lesson_title = f"Topic {topic_id} Lesson {order_index}"
            
        # Also upsert to translations
        c.execute(
            "INSERT INTO lesson_translations (topic_id, order_index, language_code, title, content_html) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (topic_id, order_index, language_code) DO UPDATE SET title = EXCLUDED.title, content_html = EXCLUDED.content_html;",
            (topic_id, order_index, lang, title, content_html)
        )
        
        conn.commit()
        release_db_connection(conn)
        
        log_admin_action(username, "UPDATE_LESSON", f"Updated content for lesson: {lesson_title} (Topic: {topic_id}, Lang: {lang})")
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
        lang = data.get("lang", "vi")
        difficulty_level = data.get("difficulty_level", 5)
        estimated_time = data.get("estimated_time", 45)
        
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("INSERT INTO topics (id, title) VALUES (%s, %s) ON CONFLICT (id) DO NOTHING;", (topic_id, title + ' Topic'))
        c.execute("INSERT INTO sections (id, topic_id, title, order_index) VALUES (%s, %s, %s, 1) ON CONFLICT (id) DO NOTHING;", (section_id, topic_id, title + ' Section'))
        
        # Backward compatibility: always upsert lessons table for 'vi' or just to ensure it exists
        if lang == 'vi':
            c.execute(
                "INSERT INTO lessons (topic_id, order_index, section_id, title, content_html, complexity, time) VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (topic_id, order_index) DO UPDATE SET title = EXCLUDED.title, content_html = EXCLUDED.content_html, complexity = EXCLUDED.complexity, time = EXCLUDED.time;",
                (topic_id, order_index, section_id, title, content_html, difficulty_level, estimated_time)
            )
        else:
            c.execute(
                "INSERT INTO lessons (topic_id, order_index, section_id, title, content_html, complexity, time) VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (topic_id, order_index) DO UPDATE SET complexity = EXCLUDED.complexity, time = EXCLUDED.time;",
                (topic_id, order_index, section_id, title, "", difficulty_level, estimated_time)
            )
            
        # Upsert into translations table
        c.execute(
            "INSERT INTO lesson_translations (topic_id, order_index, language_code, title, content_html) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (topic_id, order_index, language_code) DO UPDATE SET title = EXCLUDED.title, content_html = EXCLUDED.content_html;",
            (topic_id, order_index, lang, title, content_html)
        )
        
        conn.commit()
        release_db_connection(conn)
        
        log_admin_action(username, "CREATE_LESSON", f"Created/Updated lesson: {title} in Topic: {topic_id} (Lang: {lang})")
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
        release_db_connection(conn)
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
        release_db_connection(conn)
        
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
            release_db_connection(conn)
            return jsonify({"error": "Feedback not found"}), 404
            
        user_name, user_email, original_message = feedback

        api_key = os.getenv("RESEND_API_KEY")
        if not api_key:
            release_db_connection(conn)
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
            release_db_connection(conn)
            return jsonify({"error": f"Failed to send email: {response.text}"}), 500

        current_time = datetime.now(timezone.utc)
        c.execute("""
            UPDATE feedbacks 
            SET status = 'replied', admin_reply = %s, replied_at = %s 
            WHERE id = %s
        """, (reply_message, current_time, feedback_id))
        conn.commit()
        release_db_connection(conn)

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
        release_db_connection(conn)
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
                    
        release_db_connection(conn)
        return jsonify({"columns": cols, "data": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/api/admin/db/query", methods=["POST"])
def execute_db_query():
    return jsonify({"error": "Endpoint chạy SQL tự do đã bị khóa để bảo mật dữ liệu."}), 403

# ========================================================
# ADMIN QUIZ MANAGEMENT
# ========================================================

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'static', 'uploads', 'questions')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@admin_bp.route('/api/admin/questions', methods=['GET'])
def admin_get_questions():
    is_valid, username = check_auth()
    if not is_valid: return jsonify({'error': 'Unauthorized'}), 401
    
    topic_id = request.args.get('topic_id')
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        query = 'SELECT * FROM questions'
        params = []
        if topic_id:
            query += ' WHERE topic_id = %s'
            params.append(topic_id)
            
        query += ' ORDER BY id DESC LIMIT 500'
        
        c.execute(query, tuple(params))
        cols = [desc[0] for desc in c.description]
        rows = c.fetchall()
        
        questions = []
        for row in rows:
            q_dict = dict(zip(cols, row))
            for k, v in q_dict.items():
                if isinstance(v, datetime):
                    q_dict[k] = v.isoformat()
                elif hasattr(v, 'quantize'):
                    q_dict[k] = float(v)
            questions.append(q_dict)
            
        release_db_connection(conn)
        return jsonify({'success': True, 'questions': questions}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/admin/questions', methods=['POST'])
def admin_create_question():
    is_valid, username = check_auth()
    if not is_valid: return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.json
        conn = get_db_connection()
        c = conn.cursor()
        
        tags_raw = data.get('tags', [])
        if isinstance(tags_raw, str):
            tags_list = [t.strip() for t in tags_raw.split(',') if t.strip()]
        else:
            tags_list = tags_raw if isinstance(tags_raw, list) else []

        c.execute('''
            INSERT INTO questions 
            (lesson_id, topic_id, tags, difficulty_level, difficulty_index, discrimination_index,
             content_html, image_url, source_reference, option_a, option_b, option_c, option_d,
             correct_answer, explanation_html, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        ''', (
            data.get('lesson_id', 'l1'),
            data.get('topic_id', 't1'),
            tags_list,
            data.get('difficulty_level', 'MEDIUM'),
            data.get('difficulty_index'),
            data.get('discrimination_index'),
            data.get('content_html', ''),
            data.get('image_url'),
            data.get('source_reference'),
            data.get('option_a', ''),
            data.get('option_b', ''),
            data.get('option_c', ''),
            data.get('option_d', ''),
            data.get('correct_answer', 'A'),
            data.get('explanation_html', ''),
            False
        ))
        
        new_id = c.fetchone()[0]
        conn.commit()
        release_db_connection(conn)
        
        log_admin_action(username, 'CREATE_QUESTION', f'Created question #{new_id}')
        return jsonify({'success': True, 'question': {'id': new_id}}), 201
    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/admin/questions/<int:question_id>', methods=['PUT'])
def admin_update_question(question_id):
    is_valid, username = check_auth()
    if not is_valid: return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.json
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute('''
            UPDATE questions SET
                lesson_id = %s, topic_id = %s, tags = %s, difficulty_level = %s,
                difficulty_index = %s, discrimination_index = %s, content_html = %s,
                image_url = %s, source_reference = %s, option_a = %s, option_b = %s,
                option_c = %s, option_d = %s, correct_answer = %s, explanation_html = %s,
                is_active = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        ''', (
            data.get('lesson_id', 'l1'),
            data.get('topic_id', 't1'),
            data.get('tags', []),
            data.get('difficulty_level', 'MEDIUM'),
            data.get('difficulty_index'),
            data.get('discrimination_index'),
            data.get('content_html', ''),
            data.get('image_url'),
            data.get('source_reference'),
            data.get('option_a', ''),
            data.get('option_b', ''),
            data.get('option_c', ''),
            data.get('option_d', ''),
            data.get('correct_answer', 'A'),
            data.get('explanation_html', ''),
            data.get('is_active', True),
            question_id
        ))
        
        conn.commit()
        release_db_connection(conn)
        
        log_admin_action(username, 'UPDATE_QUESTION', f'Updated question #{question_id}')
        return jsonify({'success': True}), 200
    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/admin/questions/<int:question_id>/toggle', methods=['PATCH'])
def admin_toggle_question(question_id):
    is_valid, username = check_auth()
    if not is_valid: return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute('UPDATE questions SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING is_active', (question_id,))
        row = c.fetchone()
        if not row:
            release_db_connection(conn)
            return jsonify({'success': False, 'error': 'Not found'}), 404
        
        conn.commit()
        release_db_connection(conn)
        
        new_status = row[0]
        log_admin_action(username, 'TOGGLE_QUESTION', f'Question #{question_id} is_active={new_status}')
        return jsonify({'success': True, 'is_active': new_status}), 200
    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/admin/questions/<int:question_id>/upload-image', methods=['POST'])
def admin_upload_question_image(question_id):
    is_valid, username = check_auth()
    if not is_valid: return jsonify({'error': 'Unauthorized'}), 401
    
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'No image file provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'Empty filename'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'success': False, 'error': 'File type not allowed'}), 400
    
    try:
        import uuid
        ext = file.filename.rsplit('.', 1)[1].lower()
        filename = f"q{question_id}_{uuid.uuid4().hex[:8]}.{ext}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        image_url = f"/static/uploads/questions/{filename}"
        
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('UPDATE questions SET image_url = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s', (image_url, question_id))
        conn.commit()
        release_db_connection(conn)
        
        log_admin_action(username, 'UPLOAD_IMAGE', f'Question #{question_id}: {filename}')
        return jsonify({'success': True, 'image_url': image_url}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/admin/questions/import', methods=['POST'])
def admin_import_questions():
    is_valid, username = check_auth()
    if not is_valid: return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.json
        questions = data.get('questions', [])
        if not questions or not isinstance(questions, list):
            return jsonify({'success': False, 'error': 'Invalid data format.'}), 400
            
        conn = get_db_connection()
        c = conn.cursor()
        
        inserted = 0
        for q in questions:
            tags_raw = q.get('tags', [])
            if isinstance(tags_raw, str):
                tags_list = [t.strip() for t in tags_raw.split(',') if t.strip()]
            else:
                tags_list = tags_raw if isinstance(tags_raw, list) else []

            c.execute('''
                INSERT INTO questions 
                (lesson_id, topic_id, tags, difficulty_level, difficulty_index, discrimination_index,
                 content_html, image_url, source_reference, option_a, option_b, option_c, option_d,
                 correct_answer, explanation_html, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                q.get('lesson_id', 'l1'),
                q.get('topic_id', 't1'),
                tags_list,
                q.get('difficulty_level', 'MEDIUM'),
                q.get('difficulty_index', None),
                q.get('discrimination_index', None),
                q.get('content_html', ''),
                q.get('image_url', None),
                'AI_GENERATED',
                q.get('option_a', ''),
                q.get('option_b', ''),
                q.get('option_c', ''),
                q.get('option_d', ''),
                q.get('correct_answer', 'A'),
                q.get('explanation_html', ''),
                False
            ))
            inserted += 1
            
        conn.commit()
        release_db_connection(conn)
        log_admin_action(username, 'IMPORT_QUESTIONS', f'Imported {inserted} questions.')
        return jsonify({'success': True, 'message': f'Imported {inserted} questions.', 'count': inserted}), 200
    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/admin/questions/import-zip', methods=['POST'])
def admin_import_questions_zip():
    is_valid, username = check_auth()
    if not is_valid: return jsonify({'error': 'Unauthorized'}), 401
    
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400
        
    file = request.files['file']
    if not file.filename.endswith('.zip'):
        return jsonify({'success': False, 'error': 'Must be a ZIP file'}), 400

    try:
        temp_dir = tempfile.mkdtemp()
        zip_path = os.path.join(temp_dir, file.filename)
        file.save(zip_path)
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
            
        inserted = 0
        conn = get_db_connection()
        c = conn.cursor()
        
        # Traverse and find all .tex files
        for root, dirs, files in os.walk(temp_dir):
            for f in files:
                if f.endswith('.tex'):
                    tex_path = os.path.join(root, f)
                    with open(tex_path, 'r', encoding='utf-8') as tf:
                        content = tf.read()
                        
                    # Extract \begin{question}...\end{question}
                    questions_raw = re.findall(r'\\begin\{question\}(.*?)\\end\{question\}', content, re.DOTALL)
                    
                    for raw in questions_raw:
                        # Extract fields
                        lesson_match = re.search(r'\\lesson\{(.*?)\}', raw)
                        topic_match = re.search(r'\\topic\{(.*?)\}', raw)
                        diff_match = re.search(r'\\difficulty\{(.*?)\}', raw)
                        content_match = re.search(r'\\content\{(.*?)\}', raw, re.DOTALL)
                        a_match = re.search(r'\\choiceA\{(.*?)\}', raw, re.DOTALL)
                        b_match = re.search(r'\\choiceB\{(.*?)\}', raw, re.DOTALL)
                        c_match = re.search(r'\\choiceC\{(.*?)\}', raw, re.DOTALL)
                        d_match = re.search(r'\\choiceD\{(.*?)\}', raw, re.DOTALL)
                        correct_match = re.search(r'\\correct\{(.*?)\}', raw)
                        exp_match = re.search(r'\\explanation\{(.*?)\}', raw, re.DOTALL)
                        
                        lesson_id = lesson_match.group(1).strip() if lesson_match else 'l1'
                        topic_id = topic_match.group(1).strip() if topic_match else 't1'
                        diff = diff_match.group(1).strip().upper() if diff_match else 'MEDIUM'
                        q_content = parse_latex_to_html(content_match.group(1).strip() if content_match else '')
                        opt_a = parse_latex_to_html(a_match.group(1).strip() if a_match else '')
                        opt_b = parse_latex_to_html(b_match.group(1).strip() if b_match else '')
                        opt_c = parse_latex_to_html(c_match.group(1).strip() if c_match else '')
                        opt_d = parse_latex_to_html(d_match.group(1).strip() if d_match else '')
                        correct = correct_match.group(1).strip().upper() if correct_match else 'A'
                        expl = parse_latex_to_html(exp_match.group(1).strip() if exp_match else '')
                        
                        # Handle images \includegraphics{img.png}
                        image_url = None
                        img_match = re.search(r'\\includegraphics.*?\{(.*?)\}', q_content)
                        if img_match:
                            img_filename = img_match.group(1)
                            # Find image in extracted dir
                            for r2, d2, f2 in os.walk(temp_dir):
                                if img_filename in f2:
                                    src_img = os.path.join(r2, img_filename)
                                    ext = img_filename.rsplit('.', 1)[-1].lower() if '.' in img_filename else 'png'
                                    new_name = f"zip_{uuid.uuid4().hex[:8]}.{ext}"
                                    dst_img = os.path.join(UPLOAD_FOLDER, new_name)
                                    shutil.copy2(src_img, dst_img)
                                    image_url = f"/static/uploads/questions/{new_name}"
                                    # Remove \includegraphics from content
                                    q_content = re.sub(r'\\includegraphics.*?\{.*?\}', '', q_content).strip()
                                    break
                                    
                        c.execute('''
                            INSERT INTO questions 
                            (lesson_id, topic_id, difficulty_level, content_html, image_url, 
                             source_reference, option_a, option_b, option_c, option_d, correct_answer, explanation_html, is_active)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ''', (lesson_id, topic_id, diff, q_content, image_url, 'OVERLEAF_ZIP', opt_a, opt_b, opt_c, opt_d, correct, expl, False))
                        inserted += 1
                        
        conn.commit()
        release_db_connection(conn)
        shutil.rmtree(temp_dir)
        log_admin_action(username, 'IMPORT_ZIP', f'Imported {inserted} questions from ZIP.')
        return jsonify({'success': True, 'message': f'Imported {inserted} questions.', 'count': inserted}), 200
        
    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        if 'temp_dir' in locals() and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================
#   CODEBASE METRICS API
# ============================================

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

@admin_bp.route('/api/admin/stress/reset', methods=['POST'])
def admin_stress_reset():
    global stress_state
    is_valid, _ = check_auth()
    if not is_valid: return jsonify({'error': 'Unauthorized'}), 401
    
    with stress_lock:
        if stress_state['is_running']:
            return jsonify({'error': 'Cannot reset while running'}), 400
            
        stress_state = {
            'is_running': False,
            'stop_flag': False,
            'started_by': None,
            'started_at': None,
            'config': {},
            'results': [],
            'summary': {},
            'per_target': {},
            'timeline': []
        }
    return jsonify({"success": True, "message": "State reset successfully"})

@admin_bp.route('/api/admin/metrics/codebase', methods=['GET'])
def admin_codebase_metrics():
    is_valid, username = check_auth()
    if not is_valid: return jsonify({'error': 'Unauthorized'}), 401
    
    scan_dirs = ['frontend_v2', 'backend_v2', 'admin_v2']
    extensions = ['.py', '.jsx', '.js', '.css', '.html', '.json', '.sql']
    skip_dirs = {'node_modules', '__pycache__', 'venv', '.venv', '.git', 'dist', 'build', '.next', '.vite'}
    skip_files = {'package-lock.json', 'yarn.lock'}
    
    stats = {}
    for ext in extensions:
        stats[ext] = {'files': 0, 'lines': 0, 'bytes': 0}
    stats['other'] = {'files': 0, 'lines': 0, 'bytes': 0}
    
    total_files = 0
    total_lines = 0
    total_bytes = 0
    largest_files = []
    
    for scan_dir in scan_dirs:
        dir_path = os.path.join(PROJECT_ROOT, scan_dir)
        if not os.path.exists(dir_path):
            continue
        for root, dirs, files in os.walk(dir_path):
            dirs[:] = [d for d in dirs if d not in skip_dirs]
            for f in files:
                if f in skip_files:
                    continue
                fpath = os.path.join(root, f)
                ext = os.path.splitext(f)[1].lower()
                try:
                    fsize = os.path.getsize(fpath)
                    flines = 0
                    if ext in extensions:
                        try:
                            with open(fpath, 'r', encoding='utf-8', errors='ignore') as fp:
                                flines = sum(1 for _ in fp)
                        except:
                            pass
                        stats[ext]['files'] += 1
                        stats[ext]['lines'] += flines
                        stats[ext]['bytes'] += fsize
                    else:
                        stats['other']['files'] += 1
                        stats['other']['bytes'] += fsize
                    
                    total_files += 1
                    total_lines += flines
                    total_bytes += fsize
                    
                    rel_path = os.path.relpath(fpath, PROJECT_ROOT).replace('\\', '/')
                    largest_files.append({'path': rel_path, 'lines': flines, 'bytes': fsize, 'ext': ext})
                except:
                    pass
    
    largest_files.sort(key=lambda x: x['lines'], reverse=True)
    largest_files = largest_files[:15]
    
    breakdown = []
    for ext, data in stats.items():
        if data['files'] > 0:
            breakdown.append({
                'extension': ext,
                'files': data['files'],
                'lines': data['lines'],
                'bytes': data['bytes']
            })
    breakdown.sort(key=lambda x: x['lines'], reverse=True)
    
    return jsonify({
        'success': True,
        'total_files': total_files,
        'total_lines': total_lines,
        'total_bytes': total_bytes,
        'breakdown': breakdown,
        'largest_files': largest_files,
        'scan_dirs': scan_dirs
    }), 200

# ============================================
#   STRESS TEST API
# ============================================

def _run_stress_worker(config):
    """Background thread that fires HTTP requests or DB queries to simulate load."""
    global stress_state
    import urllib.request
    import urllib.error
    import statistics
    import random
    import concurrent.futures
    import psycopg2
    from vectoria_api.config import DB_URL
    
    targets = config.get('targets', [])
    num_users = config.get('num_users', 10)
    base_url = config.get('base_url', 'http://127.0.0.1:5000')
    mode = config.get('mode', 'real')
    
    all_latencies = []
    per_target_data = {}
    for t in targets:
        per_target_data[t] = {'requests': 0, 'success': 0, 'errors': 0, 'latencies': []}
    
    start_time = time.time()
    timeline_interval = 2  # seconds
    last_timeline_ts = start_time
    
    def fire_one(target_id, mode, current_num_users):
        t_start = time.time()
        
        if mode.startswith('sim_'):
            # Mô phỏng Render Plans
            caps = {
                'sim_free': 15,
                'sim_starter': 75,
                'sim_standard': 150,
                'sim_pro': 300,
                'sim_pro_plus': 600,
                'sim_pro_ultra': 1200
            }
            capacity = caps.get(mode, 15)
            queue_size = max(0, current_num_users - capacity)
            
            latency_ms = random.uniform(30, 80) + (queue_size * random.uniform(5, 20))
            if '__db_benchmark__' in target_id:
                latency_ms *= 1.5
            
            # Nếu queue lớn gấp 4 lần sức chứa, bắt đầu văng lỗi 502
            if queue_size > (capacity * 4) and random.random() < 0.3:
                status = 502
            else:
                status = 200
                
            # Sleep 1 chút để vòng lặp không chạy quá nhanh
            time.sleep(0.05)
            t_end = time.time()
            return target_id, status, round(latency_ms, 2)
            
        else: # mode == 'real'
            if target_id == '__db_benchmark__':
                try:
                    conn = get_db_connection()
                    cur = conn.cursor()
                    # Query giả lập tải nặng
                    cur.execute("SELECT * FROM lessons ORDER BY RANDOM() LIMIT 5;")
                    cur.fetchall()
                    cur.close()
                    release_db_connection(conn)
                    status = 200
                except Exception:
                    status = 500
            else:
                try:
                    full_url = base_url.rstrip('/') + '/' + target_id.lstrip('/')
                    req = urllib.request.Request(full_url, method='GET')
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        resp.read()
                        status = resp.status
                except urllib.error.HTTPError as e:
                    status = e.code
                except Exception:
                    status = 0
                    
            t_end = time.time()
            latency_ms = round((t_end - t_start) * 1000, 2)
            return target_id, status, latency_ms
    
    # Chạy liên tục cho đến khi người dùng bấm Stop
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(num_users, 100)) as executor:
            while not stress_state['stop_flag']:
                batch_size = min(num_users, 100)
                futures = []
                for _ in range(batch_size):
                    target_id = random.choice(targets) if config.get('random', False) else targets[0]
                    futures.append(executor.submit(fire_one, target_id, mode, num_users))
                
                for future in concurrent.futures.as_completed(futures):
                    try:
                        target_id, status, latency_ms = future.result()
                        # Cập nhật số liệu
                        if target_id in per_target_data:
                            per_target_data[target_id]['requests'] += 1
                            per_target_data[target_id]['latencies'].append(latency_ms)
                            if 200 <= status < 400:
                                per_target_data[target_id]['success'] += 1
                            else:
                                per_target_data[target_id]['errors'] += 1
                        
                        all_latencies.append(latency_ms)
                        
                        with stress_lock:
                            stress_state['summary']['total_requests'] = len(all_latencies)
                            stress_state['summary']['success_count'] = sum(d['success'] for d in per_target_data.values())
                            stress_state['summary']['error_count'] = sum(d['errors'] for d in per_target_data.values())
                            if all_latencies:
                                stress_state['summary']['avg_latency_ms'] = round(statistics.mean(all_latencies), 2)
                                stress_state['summary']['min_latency_ms'] = round(min(all_latencies), 2)
                                stress_state['summary']['max_latency_ms'] = round(max(all_latencies), 2)
                                sorted_lat = sorted(all_latencies)
                                p95_idx = int(len(sorted_lat) * 0.95)
                                p99_idx = int(len(sorted_lat) * 0.99)
                                stress_state['summary']['p95_latency_ms'] = round(sorted_lat[min(p95_idx, len(sorted_lat)-1)], 2)
                                stress_state['summary']['p99_latency_ms'] = round(sorted_lat[min(p99_idx, len(sorted_lat)-1)], 2)
                            
                            elapsed = stress_state.get('accumulated_time', 0) + (time.time() - stress_state.get('start_time', time.time()))
                            if elapsed > 0:
                                stress_state['summary']['requests_per_second'] = round(len(all_latencies) / elapsed, 2)
                            
                            # Update per-target stats
                            for t, d in per_target_data.items():
                                stress_state['per_target'][t] = {
                                    'requests': d['requests'],
                                    'success': d['success'],
                                    'errors': d['errors'],
                                    'avg_latency_ms': round(statistics.mean(d['latencies']), 2) if d['latencies'] else 0,
                                    'error_rate': round(d['errors'] / max(d['requests'], 1) * 100, 1)
                                }
                            
                            if time.time() - last_log_time >= 2.0:
                                last_log_time = time.time()
                                stress_state['timeline'].append({
                                    'elapsed_s': round(stress_state.get('accumulated_time', 0) + (time.time() - stress_state.get('start_time', time.time())), 1),
                                    'total_requests': len(all_latencies),
                                    'rps': stress_state['summary']['requests_per_second'],
                                    'avg_latency': stress_state['summary']['avg_latency_ms'],
                                    'error_rate': round(stress_state['summary']['error_count'] / max(len(all_latencies), 1) * 100, 1)
                                })
                    except Exception:
                        pass
    finally:
        with stress_lock:
            stress_state['is_running'] = False
            stress_state['accumulated_time'] = stress_state.get('accumulated_time', 0) + (time.time() - stress_state.get('start_time', time.time()))
            stress_state['stop_flag'] = False


@admin_bp.route('/api/admin/stress/start', methods=['POST'])
def admin_stress_start():
    global stress_state
    is_valid, username = check_auth()
    if not is_valid: return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json or {}
    mode = data.get('mode', 'real')
    max_limit = 10000000000 if mode.startswith('sim_') else 5000
    
    config = {
        'targets': data.get('targets', ['index.html', 'knowledge_info.html']),
        'num_users': min(int(data.get('num_users', 10)), max_limit),
        'base_url': data.get('base_url', 'http://127.0.0.1:5000'),
        'random': data.get('random', True),
        'mode': mode
    }
    
    with stress_lock:
        if stress_state.get('results') and len(stress_state['results']) > 0:
            if stress_state.get('is_running'):
                return jsonify({
                    'success': False, 
                    'error': f"Hệ thống đang được Test Stress bởi {stress_state['started_by']}",
                    'started_by': stress_state['started_by']
                }), 409
            stress_state['is_running'] = True
            stress_state['stop_flag'] = False
            stress_state['started_by'] = username
            stress_state['started_at'] = datetime.now(timezone.utc).isoformat()
            stress_state['config'] = config
            stress_state['start_time'] = time.time()
        else:
            stress_state = {
                'is_running': True,
                'stop_flag': False,
                'started_by': username,
                'started_at': datetime.now(timezone.utc).isoformat(),
                'config': config,
                'results': [],
                'summary': {
                    'total_requests': 0, 'success_count': 0, 'error_count': 0,
                    'avg_latency_ms': 0, 'min_latency_ms': 0, 'max_latency_ms': 0,
                    'requests_per_second': 0, 'p95_latency_ms': 0, 'p99_latency_ms': 0,
                },
                'per_target': {},
                'timeline': [],
                'start_time': time.time(),
                'accumulated_time': 0
            }
    
    thread = threading.Thread(target=_run_stress_worker, args=(config,), daemon=True)
    thread.start()
    
    log_admin_action(username, 'STRESS_TEST_START', f"Started stress test with {config['num_users']} virtual users on targets: {config['targets']}")
    return jsonify({'success': True, 'message': 'Stress test started.', 'config': config}), 200


@admin_bp.route('/api/admin/stress/status', methods=['GET'])
def admin_stress_status():
    is_valid, username = check_auth()
    if not is_valid: return jsonify({'error': 'Unauthorized'}), 401
    
    with stress_lock:
        return jsonify({
            'success': True,
            'is_running': stress_state['is_running'],
            'started_by': stress_state['started_by'],
            'started_at': stress_state['started_at'],
            'config': stress_state['config'],
            'summary': stress_state['summary'],
            'per_target': stress_state['per_target'],
            'timeline': stress_state['timeline'][-50:],  # Last 50 data points
        }), 200


@admin_bp.route('/api/admin/stress/stop', methods=['POST'])
def admin_stress_stop():
    global stress_state
    is_valid, username = check_auth()
    if not is_valid: return jsonify({'error': 'Unauthorized'}), 401
    
    with stress_lock:
        if not stress_state['is_running']:
            return jsonify({'success': False, 'error': 'Không có phiên test nào đang chạy.'}), 400
        stress_state['stop_flag'] = True
    
    log_admin_action(username, 'STRESS_TEST_STOP', f"Stopped stress test by {username}")
    return jsonify({'success': True, 'message': 'Đang dừng stress test...'}), 200
