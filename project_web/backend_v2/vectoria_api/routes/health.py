from flask import Blueprint, jsonify
import psycopg2

from test_neo4j import driver 
from vectoria_api.config import DB_URL

bp = Blueprint("health", __name__)

@bp.get("/")
def home():
    return jsonify({"status": "ok"})

@bp.get("/api/health")
def health():
    try:
        # 1. Đánh thức Neo4j
        with driver.session(database="neo4j") as session:
            session.run("RETURN 1")
            
        # 2. Đánh thức PostgreSQL (Supabase)
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute("SELECT 1")
        conn.close()
            
        return jsonify({"ok": True, "neo4j": "awake", "postgres": "awake"})
        
    except Exception as e:
        print(f">> [DB SLEEPING / ERROR]: {str(e)}")
        return jsonify({"ok": False, "error": str(e)}), 500