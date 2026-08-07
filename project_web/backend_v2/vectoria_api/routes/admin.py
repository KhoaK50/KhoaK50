import os
from flask import Blueprint, request, jsonify
import psycopg2
from vectoria_api.config import DB_URL

admin_bp = Blueprint("admin", __name__)

def get_admin_secret():
    return os.environ.get("ADMIN_SECRET_KEY", "vectoria-admin-123")

def check_auth():
    auth_header = request.headers.get("Authorization")
    if not auth_header or auth_header != f"Bearer {get_admin_secret()}":
        return False
    return True

@admin_bp.route("/api/admin/verify", methods=["GET"])
def verify_admin():
    if not check_auth():
        return jsonify({"valid": False}), 401
    return jsonify({"valid": True}), 200

def get_db_connection():
    return psycopg2.connect(DB_URL)

@admin_bp.route("/api/admin/tables", methods=["GET"])
def get_tables():
    if not check_auth(): return jsonify({"error": "Unauthorized"}), 401
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
    if not check_auth(): return jsonify({"error": "Unauthorized"}), 401
    try:
        conn = get_db_connection()
        c = conn.cursor()
        # Prevent SQL injection by checking table_name against public tables
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
    if not check_auth(): return jsonify({"error": "Unauthorized"}), 401
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT topic_id, order_index, title, content_html, total_views, created_at FROM lessons ORDER BY order_index ASC;")
        rows = c.fetchall()
        cols = [desc[0] for desc in c.description]
        data = [dict(zip(cols, row)) for row in rows]
        conn.close()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/api/admin/lesson/<topic_id>/<int:order_index>", methods=["PUT"])
def update_lesson(topic_id, order_index):
    if not check_auth(): return jsonify({"error": "Unauthorized"}), 401
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
            
        conn.commit()
        conn.close()
        return jsonify({"message": "Lesson updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/api/admin/lesson", methods=["POST"])
def create_lesson():
    if not check_auth(): return jsonify({"error": "Unauthorized"}), 401
    try:
        data = request.json
        topic_id = data.get("topic_id")
        order_index = data.get("order_index", 1)
        section_id = data.get("section_id")
        title = data.get("title")
        content_html = data.get("content_html", "")
        
        conn = get_db_connection()
        c = conn.cursor()
        
        # Insert Topic and Section if not exists to avoid foreign key errors during testing
        c.execute("INSERT INTO topics (id, title) VALUES (%s, %s) ON CONFLICT (id) DO NOTHING;", (topic_id, title + ' Topic'))
        c.execute("INSERT INTO sections (id, topic_id, title, order_index) VALUES (%s, %s, %s, 1) ON CONFLICT (id) DO NOTHING;", (section_id, topic_id, title + ' Section'))
        
        c.execute(
            "INSERT INTO lessons (topic_id, order_index, section_id, title, content_html) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (topic_id, order_index) DO UPDATE SET title = EXCLUDED.title, content_html = EXCLUDED.content_html RETURNING topic_id;",
            (topic_id, order_index, section_id, title, content_html)
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "Lesson created/updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/api/course/lesson/<topic_id>", methods=["GET"])
def get_public_lesson(topic_id):
    # Public API for frontend user to fetch lesson by topic_id
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT content_html FROM lessons WHERE topic_id = %s LIMIT 1;", (topic_id,))
        row = c.fetchone()
        conn.close()
        if row:
            return jsonify({"content_html": row[0]})
        return jsonify({"error": "Not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
