import os

HOST = "0.0.0.0"
PORT = 5000
DEBUG = os.environ.get("DEBUG", "False").lower() == "true"
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
ADMIN_SECRET_KEY = os.environ.get("ADMIN_SECRET_KEY")

# Đọc danh sách ALLOWED_ORIGINS từ biến môi trường trên Render
raw_origins = os.environ.get("ALLOWED_ORIGINS", "")

if raw_origins:
    # Chuyển chuỗi "url1,url2" thành một tập hợp (set) và xóa khoảng trắng thừa
    ALLOWED_ORIGINS = {
        origin.strip() for origin in raw_origins.split(",") if origin.strip()
    }
else:
    # Danh sách dự phòng khi chạy ở máy nhà (Localhost)
    ALLOWED_ORIGINS = {
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    }

DB_URL = os.environ.get("DB_URL", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://127.0.0.1:5501/frontend_v2")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")