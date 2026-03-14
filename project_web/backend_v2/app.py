from flask import Flask

# 1. BỎ dòng import middleware/cors tự viết
# from vectoria_api.middleware.cors import attach_cors_middleware

# 2. THÊM thư viện chuẩn này
from flask_cors import CORS

from vectoria_api.routes import register_blueprints
from vectoria_api.config import HOST, PORT, DEBUG
from vectoria_api.explainers import init_explainers

# Import module contact
from vectoria_api.routes.contact import contact_bp, init_feedback_db


def create_app():
    print(">> FORCE UPDATE VERCEL V1")  # Thêm dòng này
    app = Flask(__name__)

    # ============================================================
    # CẤU HÌNH CORS TỔNG QUÁT (THE GENERAL WAY)
    # ============================================================
    # Dòng này tương đương với việc ông viết 20 dòng code thủ công.
    # Nó tự động cho phép mọi nguồn (*), mọi method (GET, POST, OPTIONS...),
    # và tự động xử lý Preflight check cho việc upload file.
    CORS(app)
    # ============================================================

    # 2) Nạp explainers
    init_explainers()

    # 3) Khởi tạo Database
    init_feedback_db()

    # 4) Đăng ký các routes cũ
    register_blueprints(app)

    # 5) ĐĂNG KÝ ROUTE LIÊN HỆ
    app.register_blueprint(contact_bp)

    return app


# Tạo instance global
app = create_app()

if __name__ == "__main__":
    print(f">> Server đang chạy tại: http://{HOST}:{PORT}")
    app.run(host=HOST, port=PORT, debug=DEBUG)
