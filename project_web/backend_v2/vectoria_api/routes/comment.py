import os
from flask import Blueprint, request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from vectoria_api.config import DB_URL, GEMINI_API_KEY
from vectoria_api.middleware.auth import token_required
import jwt
from google import genai

comment_bp = Blueprint('comment_bp', __name__)
    
import re
LOCAL_BAD_WORDS = [
    r'\bfuck\b', r'\bshit\b', r'\bbitch\b', r'\basshole\b',
    r'\bditme\b', r'\bd[ịi]t\s*m[ẹe]\b', r'\bvcl\b', r'\bvl\b', r'\bđm\b', r'\bđ[iị]t\b',
    r'\bl[ồo]n\b', r'\bc[ặa]c\b', r'\bcu\b'
]

def check_profanity_and_mask(text):
    original = text
    # 1. Fast local regex check for common words
    for word in LOCAL_BAD_WORDS:
        text = re.sub(word, '[BỊ ẨN]', text, flags=re.IGNORECASE)
    
    # If local filter caught something, return immediately to save API call time
    if text != original:
        return text

    # 2. Deep check using Gemini for all other languages and complex cases
    if not GEMINI_API_KEY:
        return text
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        prompt = f"Bạn là một hệ thống kiểm duyệt nội dung. Hãy giữ nguyên đoạn văn bản sau, nhưng thay thế TẤT CẢ các từ ngữ chửi bậy, thô tục, phản cảm (tiếng Việt hoặc tiếng Anh) bằng chuỗi '[BỊ ẨN]'. Nếu không có từ nào vi phạm, hãy trả về nguyên bản. KHÔNG thêm bất kỳ lời giải thích hay ngoặc kép nào.\n\nVăn bản: {text}"
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=prompt
        )
        return response.text.strip()
    except Exception as e:
        print(f"Gemini API error: {e}")
        return text

@comment_bp.route('/api/comment/topic/<topic_id>/lesson/<order_index>', methods=['GET'])
def get_comments(topic_id, order_index):
    try:
        # Extract optional user_id from token
        current_user_id = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(" ")[1]
            try:
                data = jwt.decode(token, os.getenv("JWT_SECRET_KEY", "super-secret-key-vectoria-2026"), algorithms=["HS256"])
                current_user_id = data.get('user_id')
            except:
                pass
                
        sort_by = request.args.get('sort', 'latest')
        order_clause = "ORDER BY c.created_at DESC"
        if sort_by == 'relevant':
            order_clause = "ORDER BY c.upvote_count DESC, c.created_at DESC"
        elif sort_by == 'oldest':
            order_clause = "ORDER BY c.created_at ASC"

        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # JOIN with users table to get display_name and avatar_url
        query = f"""
            SELECT c.id, c.user_id, c.topic_id, c.order_index, c.content, c.parent_comment_id as parent_id, c.created_at, c.upvote_count,
                   u.display_name, u.email, u.avatar_url,
                   (SELECT COUNT(*) FROM comment_upvotes cu WHERE cu.comment_id = c.id AND cu.user_id = %s) as is_upvoted_by_me
            FROM lesson_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.topic_id = %s AND c.order_index = %s
            {order_clause};
        """
        cursor.execute(query, (current_user_id, topic_id, order_index))
        comments = cursor.fetchall()
        
        # Build tree structure
        comment_dict = {}
        root_comments = []
        
        for row in comments:
            row['id'] = str(row['id'])
            if row['parent_id']:
                row['parent_id'] = str(row['parent_id'])
            row['replies'] = []
            row['created_at'] = row['created_at'].isoformat()
            
            # Simple avatar generation based on name
            display_name = row['display_name'] or row['email'] or 'User'
            row['author_name'] = display_name
            row['avatar_letter'] = display_name[0].upper()
            row['is_upvoted_by_me'] = bool(row['is_upvoted_by_me'])
            
            comment_dict[row['id']] = row
            
        for row in comments:
            if row['parent_id']:
                parent_id = row['parent_id']
                if parent_id in comment_dict:
                    comment_dict[parent_id]['replies'].append(row)
            else:
                root_comments.append(row)
                
        return jsonify({"success": True, "comments": root_comments}), 200
    except Exception as e:
        print(f"Error fetching comments: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@comment_bp.route('/api/comment', methods=['POST'])
@token_required
def create_comment(user_id):
    data = request.json
    topic_id = data.get('topic_id')
    order_index = data.get('order_index')
    content = data.get('content')
    parent_id = data.get('parent_id') # optional
    
    if not topic_id or not order_index or not content:
        return jsonify({"success": False, "message": "Missing required fields"}), 400
        
    # Profanity Masking
    masked_content = check_profanity_and_mask(content)
        
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
            INSERT INTO lesson_comments (user_id, topic_id, order_index, content, parent_comment_id, upvote_count)
            VALUES (%s, %s, %s, %s, %s, 0)
            RETURNING id, created_at;
        """
        cursor.execute(query, (user_id, topic_id, order_index, masked_content, parent_id))
        result = cursor.fetchone()
        conn.commit()
        
        return jsonify({
            "success": True, 
            "message": "Comment posted successfully",
            "comment_id": str(result['id']),
            "created_at": result['created_at'].isoformat()
        }), 201
    except Exception as e:
        print(f"Error creating comment: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()

@comment_bp.route('/api/comment/upvote', methods=['POST'])
@token_required
def toggle_upvote(user_id):
    data = request.json
    comment_id = data.get('comment_id')
    
    if not comment_id:
        return jsonify({"success": False, "message": "Missing comment_id"}), 400
        
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check if already upvoted
        cursor.execute("SELECT 1 FROM comment_upvotes WHERE user_id = %s AND comment_id = %s", (user_id, comment_id))
        existing = cursor.fetchone()
        
        if existing:
            # Delete upvote
            cursor.execute("DELETE FROM comment_upvotes WHERE user_id = %s AND comment_id = %s", (user_id, comment_id))
            cursor.execute("UPDATE lesson_comments SET upvote_count = upvote_count - 1 WHERE id = %s RETURNING upvote_count", (comment_id,))
            result = cursor.fetchone()
            conn.commit()
            return jsonify({"success": True, "action": "removed", "upvote_count": result['upvote_count']}), 200
        else:
            # Insert upvote
            cursor.execute("INSERT INTO comment_upvotes (user_id, comment_id) VALUES (%s, %s)", (user_id, comment_id))
            cursor.execute("UPDATE lesson_comments SET upvote_count = upvote_count + 1 WHERE id = %s RETURNING upvote_count", (comment_id,))
            result = cursor.fetchone()
            conn.commit()
            return jsonify({"success": True, "action": "added", "upvote_count": result['upvote_count']}), 200
            
    except Exception as e:
        conn.rollback()
        print(f"Error toggling upvote: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): conn.close()
