import os
import jwt
from flask import Blueprint, request, jsonify
from functools import wraps
import psycopg2
from psycopg2.extras import RealDictCursor
from vectoria_api.config import DB_URL

admin_moderation_bp = Blueprint('admin_moderation_bp', __name__)

def get_admin_secret():
    return os.environ.get("ADMIN_SECRET_KEY", "vectoria-admin-123")

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"success": False, "message": "Unauthorized"}), 401
        
        token = auth_header.split(" ")[1]
        
        if token == get_admin_secret():
            return f(*args, **kwargs)
            
        try:
            payload = jwt.decode(token, get_admin_secret(), algorithms=["HS256"])
            return f(*args, **kwargs)
        except:
            return jsonify({"success": False, "message": "Invalid token"}), 401
    return decorated

@admin_moderation_bp.route('/api/admin/moderation/comments', methods=['GET'])
@admin_required
def get_flagged_comments():
    status = request.args.get('status', 'PENDING')
    user_id = request.args.get('user_id')
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT fc.id, fc.comment_id, fc.original_content, fc.ai_severity_score, 
                   fc.ai_reason, fc.status, fc.ip_address, fc.created_at,
                   c.content as masked_content, c.user_id,
                   u.display_name, u.email, u.avatar_url, u.status
            FROM flagged_comments fc
            JOIN lesson_comments c ON fc.comment_id = c.id
            JOIN users u ON c.user_id = u.id
            WHERE fc.status = %s
        """
        params = [status]
        
        if user_id:
            query += " AND c.user_id = %s"
            params.append(user_id)
            
        query += " ORDER BY fc.created_at DESC;"
        
        cursor.execute(query, tuple(params))
        flags = cursor.fetchall()
        
        for f in flags:
            f['created_at'] = f['created_at'].isoformat()
            
        return jsonify({"success": True, "flags": flags}), 200
    except Exception as e:
        print(f"Error fetching flagged comments: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@admin_moderation_bp.route('/api/admin/moderation/comments/<flag_id>', methods=['PUT'])
@admin_required
def resolve_flagged_comment(flag_id):
    data = request.json
    new_content = data.get('content')
    action = data.get('action') # 'RESOLVE', 'DISMISS'
    
    if action not in ['RESOLVE', 'DISMISS']:
        return jsonify({"success": False, "message": "Invalid action"}), 400
        
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get the comment_id first
        cursor.execute("SELECT comment_id FROM flagged_comments WHERE id = %s", (flag_id,))
        flag = cursor.fetchone()
        if not flag:
            return jsonify({"success": False, "message": "Flag not found"}), 404
            
        if action == 'RESOLVE' and new_content is not None:
            # Update the original comment
            cursor.execute("UPDATE lesson_comments SET content = %s WHERE id = %s", (new_content, flag['comment_id']))
            
        # Update flag status
        new_status = 'RESOLVED' if action == 'RESOLVE' else 'DISMISSED'
        cursor.execute("UPDATE flagged_comments SET status = %s WHERE id = %s", (new_status, flag_id))
        
        conn.commit()
        return jsonify({"success": True, "message": f"Flag marked as {new_status}"}), 200
    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        print(f"Error resolving flag: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@admin_moderation_bp.route('/api/admin/moderation/comments/<flag_id>/warn', methods=['POST'])
@admin_required
def warn_user(flag_id):
    data = request.json
    message = data.get('message')
    
    if not message:
        return jsonify({"success": False, "message": "Warning message is required"}), 400
        
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get user_id from flag
        cursor.execute("""
            SELECT c.user_id 
            FROM flagged_comments fc
            JOIN lesson_comments c ON fc.comment_id = c.id
            WHERE fc.id = %s
        """, (flag_id,))
        flag = cursor.fetchone()
        
        if not flag:
            return jsonify({"success": False, "message": "Flag not found"}), 404
            
        # Insert notification
        cursor.execute("""
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (%s, 'WARNING', 'Cảnh cáo vi phạm tiêu chuẩn cộng đồng', %s)
        """, (flag['user_id'], message))
        
        # Also mark flag as RESOLVED
        cursor.execute("UPDATE flagged_comments SET status = 'RESOLVED' WHERE id = %s", (flag_id,))
        
        conn.commit()
        return jsonify({"success": True, "message": "Warning sent successfully"}), 200
    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        print(f"Error sending warning: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@admin_moderation_bp.route('/api/admin/users/<int:user_id>/ban', methods=['POST'])
@admin_required
def ban_user(user_id):
    data = request.json or {}
    new_status = data.get('status', 'BANNED')
    
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        
        title = 'Tài khoản của bạn đã bị khóa'
        message = 'Tài khoản của bạn đã bị cấm đăng nhập do vi phạm nghiêm trọng tiêu chuẩn cộng đồng.'
        if new_status == 'LOCKED':
            message = 'Tài khoản của bạn đã bị cấm bình luận do vi phạm tiêu chuẩn cộng đồng.'
        elif new_status == 'ACTIVE':
            title = 'Tài khoản đã được mở khóa'
            message = 'Tài khoản của bạn đã được khôi phục trạng thái hoạt động bình thường.'
            
        cursor.execute("""
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (%s, 'SYSTEM', %s, %s)
        """, (user_id, title, message))
        
        cursor.execute("UPDATE users SET status = %s WHERE id = %s", (new_status.lower(), user_id))
        
        conn.commit()
        return jsonify({"success": True, "message": f"User status updated to {new_status}"}), 200
    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        print(f"Error banning user: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()
