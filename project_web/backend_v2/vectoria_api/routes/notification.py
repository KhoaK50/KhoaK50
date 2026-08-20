import os
from flask import Blueprint, request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from vectoria_api.config import DB_URL
from vectoria_api.middleware.auth import token_required

notification_bp = Blueprint('notification_bp', __name__)

@notification_bp.route('/api/notifications', methods=['GET'])
@token_required
def get_notifications(user_id):
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get unread count
        cursor.execute("SELECT COUNT(*) FROM notifications WHERE user_id = %s AND is_read = FALSE", (user_id,))
        unread_count = cursor.fetchone()['count']
        
        # Get recent notifications
        cursor.execute("""
            SELECT id, type, title, message, is_read, created_at 
            FROM notifications 
            WHERE user_id = %s 
            ORDER BY created_at DESC 
            LIMIT 50
        """, (user_id,))
        notifications = cursor.fetchall()
        
        for n in notifications:
            n['created_at'] = n['created_at'].isoformat()
            
        return jsonify({
            "success": True, 
            "notifications": notifications,
            "unread_count": unread_count
        }), 200
    except Exception as e:
        print(f"Error fetching notifications: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@notification_bp.route('/api/notifications/<int:notif_id>/read', methods=['PUT'])
@token_required
def mark_as_read(user_id, notif_id):
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        
        cursor.execute("UPDATE notifications SET is_read = TRUE WHERE id = %s AND user_id = %s", (notif_id, user_id))
        conn.commit()
        
        return jsonify({"success": True}), 200
    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        print(f"Error marking notification as read: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()
        
@notification_bp.route('/api/notifications/read-all', methods=['PUT'])
@token_required
def mark_all_as_read(user_id):
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        
        cursor.execute("UPDATE notifications SET is_read = TRUE WHERE user_id = %s AND is_read = FALSE", (user_id,))
        conn.commit()
        
        return jsonify({"success": True}), 200
    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        print(f"Error marking all notifications as read: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()
