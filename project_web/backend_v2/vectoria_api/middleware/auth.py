import os
import jwt
from functools import wraps
from flask import request, jsonify
import psycopg2
from vectoria_api.database import get_db_connection, release_db_connection

from vectoria_api.config import DB_URL

from vectoria_api.config import JWT_SECRET_KEY as SECRET_KEY

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({"status": "error", "message": "Thiếu token xác thực!"}), 401
            
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_id = data.get("user_id")
            token_version = data.get("token_version")
            
            # Kiểm tra token_version với Database
            conn = get_db_connection()
            c = conn.cursor()
            c.execute("SELECT token_version FROM users WHERE id = %s", (user_id,))
            record = c.fetchone()
            release_db_connection(conn)
            
            if not record or record[0] != token_version:
                return jsonify({"status": "error", "message": "Phiên đăng nhập đã hết hạn hoặc bị đăng xuất!"}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({"status": "error", "message": "Token đã hết hạn!"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"status": "error", "message": "Token không hợp lệ!"}), 401
            
        return f(user_id, *args, **kwargs)
        
    return decorated
