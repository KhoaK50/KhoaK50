# backend_v2/vectoria_api/routes/health.py
from flask import Blueprint, jsonify

from test_neo4j import driver 

bp = Blueprint("health", __name__)

@bp.get("/")
def home():
    return jsonify({"status": "ok"})

@bp.get("/api/health")
def health():
    try:
        # Đánh thức Neo4j bằng 1 câu truy vấn rác
        with driver.session() as session:
            session.run("RETURN 1")
            
        # Nếu chạy qua được dòng trên, chứng tỏ Neo4j đang thức
        return jsonify({"ok": True, "neo4j": "awake"})
        
    except Exception as e:
        # Nếu Neo4j đang ngủ (Paused) hoặc rớt mạng, nó văng vô đây
        print(f">> [NEO4J SLEEPING / ERROR]: {str(e)}")
        return jsonify({"ok": False, "error": str(e)}), 500