
import os
import jwt
from functools import wraps
from flask import request, jsonify
import psycopg2
from vectoria_api.config import DB_URL

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key-vectoria-2026")

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
            conn = psycopg2.connect(DB_URL)
            c = conn.cursor()
            c.execute("SELECT token_version FROM users WHERE id = %s", (user_id,))
            record = c.fetchone()
            conn.close()
            
            if not record or record[0] != token_version:
                return jsonify({"status": "error", "message": "Phiên đăng nhập đã hết hạn hoặc bị đăng xuất!"}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({"status": "error", "message": "Token đã hết hạn!"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"status": "error", "message": "Token không hợp lệ!"}), 401
            
        return f(user_id, *args, **kwargs)
        
    return decorated
