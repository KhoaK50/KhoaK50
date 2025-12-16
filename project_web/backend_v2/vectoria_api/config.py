# backend_v2/vectoria_api/config.py

HOST = "0.0.0.0"
PORT = 5000
DEBUG = True

# CORS allowlist
ALLOWED_ORIGINS = {
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://vsv-i0ya.onrender.com",  # domain frontend Render (bạn ghi)
    "https://visualization-rr5v.onrender.com",  # nếu bạn còn dùng domain này
}
