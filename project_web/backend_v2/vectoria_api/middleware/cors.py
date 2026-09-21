# backend_v2/vectoria_api/middleware/cors.py
from flask import request
from vectoria_api.config import ALLOWED_ORIGINS


def attach_cors_middleware(app):
    @app.before_request
    def _cors_preflight():
        # Preflight cho mọi /api/*
        if request.method == "OPTIONS" and request.path.startswith("/api/"):
            resp = app.make_response(("OK", 200))
            return _corsify(resp)

    @app.after_request
    def _cors_after(resp):
        return _corsify(resp)


def _corsify(resp):
    origin = request.headers.get("Origin", "")
    if origin in ALLOWED_ORIGINS or origin.endswith("vectoria.io.vn"):
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS,PATCH"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,X-Requested-With,Accept"
        resp.headers["Access-Control-Max-Age"] = "3600"
        resp.headers["Access-Control-Allow-Credentials"] = "true"
    return resp
