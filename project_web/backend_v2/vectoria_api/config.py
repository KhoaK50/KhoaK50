import os

HOST = "0.0.0.0"
PORT = 5000
DEBUG = os.environ.get("DEBUG", "False").lower() == "true"
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
ADMIN_SECRET_KEY = os.environ.get("ADMIN_SECRET_KEY")

# Danh sách mặc định các domain được phép truy cập API (Production & Development)
DEFAULT_ALLOWED_ORIGINS = {
    "https://vectoria.io.vn",
    "https://www.vectoria.io.vn",
    "https://visualization-rr5v.onrender.com",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5501",
    "http://localhost:5501",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5000",
    "http://localhost:5000",
}

# Đọc danh sách ALLOWED_ORIGINS từ biến môi trường trên Render
raw_origins = os.environ.get("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = set(DEFAULT_ALLOWED_ORIGINS)

if raw_origins:
    # Bổ sung các origin từ biến môi trường nếu có
    ALLOWED_ORIGINS.update(
        origin.strip() for origin in raw_origins.split(",") if origin.strip()
    )

DB_URL = os.environ.get("DB_URL", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://vectoria.io.vn" if not DEBUG else "http://127.0.0.1:5501/frontend_v2")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")