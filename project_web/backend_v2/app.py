from flask import Flask
from vectoria_api.middleware.cors import attach_cors_middleware
from vectoria_api.routes import register_blueprints
from vectoria_api.config import HOST, PORT, DEBUG
from vectoria_api.explainers import init_explainers

# IMPORT MODULE MỚI VỪA TẠO
from vectoria_api.routes.contact import contact_bp, init_feedback_db

def create_app():
    app = Flask(__name__)
# Đoạn này ép buộc Flask cấp quyền cho mọi trình duyệt
    @app.after_request
    def add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        return response
    # 1) CORS
    attach_cors_middleware(app)

    # 2) Nạp explainers
    init_explainers()

    # 3) Khởi tạo Database (Gọi hàm từ file contact.py)
    init_feedback_db()

    # 4) Đăng ký các routes cũ
    register_blueprints(app)

    # 5) ĐĂNG KÝ ROUTE LIÊN HỆ MỚI
    app.register_blueprint(contact_bp)

    return app

# Tạo instance global
app = create_app()

if __name__ == "__main__":
    print(f">> Server đang chạy tại: http://{HOST}:{PORT}")
    app.run(host=HOST, port=PORT, debug=DEBUG)
