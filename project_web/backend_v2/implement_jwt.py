import os

# 1. Create auth.py
auth_code = """
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
"""
with open(r"D:\Programming_language\project_web\backend_v2\vectoria_api\middleware\auth.py", "w", encoding="utf-8") as f:
    f.write(auth_code)

# 2. Update user.py JWT generation
user_py = r"D:\Programming_language\project_web\backend_v2\vectoria_api\routes\user.py"
with open(user_py, "r", encoding="utf-8") as f:
    content = f.read()

# Replace fake_token with real JWT
import_jwt = "from vectoria_api.config import DB_URL, FRONTEND_URL\nimport jwt\nimport os"
content = content.replace("from vectoria_api.config import DB_URL, FRONTEND_URL", import_jwt)

# Login endpoint
login_old = """            # Trả về token đăng nhập
            fake_token = f"vec_token_{user_id}"
            
            return jsonify({
                "status": "success", 
                "token": fake_token,"""
login_new = """            # Trả về token đăng nhập
            SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key-vectoria-2026")
            c.execute("SELECT token_version FROM users WHERE id = %s", (user_id,))
            token_version = c.fetchone()[0]
            
            real_token = jwt.encode(
                {"user_id": user_id, "token_version": token_version, "exp": datetime.now(timezone.utc) + timedelta(days=7)},
                SECRET_KEY, 
                algorithm="HS256"
            )
            
            return jsonify({
                "status": "success", 
                "token": real_token,"""
content = content.replace(login_old, login_new)

# Google Login endpoint
google_old = """        # Trả về token đăng nhập
        fake_token = f"vec_token_{user_id}"
        
        return jsonify({
            "status": "success", 
            "token": fake_token,"""
google_new = """        # Trả về token đăng nhập
        SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key-vectoria-2026")
        c.execute("SELECT token_version FROM users WHERE id = %s", (user_id,))
        token_version = c.fetchone()[0]
        
        real_token = jwt.encode(
            {"user_id": user_id, "token_version": token_version, "exp": datetime.now(timezone.utc) + timedelta(days=7)},
            SECRET_KEY, 
            algorithm="HS256"
        )
        
        return jsonify({
            "status": "success", 
            "token": real_token,"""
content = content.replace(google_old, google_new)

# 3. Update Reset Password to increment token_version
reset_old = """        c.execute("UPDATE passwordresets SET is_used = TRUE WHERE user_id = %s AND token = %s", (user_id, token))
        conn.commit()
        
        return jsonify({"status": "success", "message": "Mật khẩu đã được đổi thành công!"}), 200"""
reset_new = """        c.execute("UPDATE passwordresets SET is_used = TRUE WHERE user_id = %s AND token = %s", (user_id, token))
        # Vô hiệu hóa toàn bộ token cũ của user bằng cách tăng token_version
        c.execute("UPDATE users SET token_version = token_version + 1 WHERE id = %s", (user_id,))
        conn.commit()
        
        return jsonify({"status": "success", "message": "Mật khẩu đã được đổi thành công!"}), 200"""
content = content.replace(reset_old, reset_new)

with open(user_py, "w", encoding="utf-8") as f:
    f.write(content)

print("Done JWT implementation")
