from flask import Blueprint, jsonify
import psycopg2
from vectoria_api.database import get_db_connection, release_db_connection


from test_neo4j import driver 
from vectoria_api.config import DB_URL

bp = Blueprint("health", __name__)

@bp.get("/")
def home():
    return jsonify({"status": "ok"})

@bp.get("/api/health")
@bp.get("/healthz")
def health():
    try:
        # 1. Đánh thức Neo4j
        with driver.session() as session:
            session.run("RETURN 1")
            
        # 2. Đánh thức PostgreSQL (Supabase)
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        release_db_connection(conn)
            
        return jsonify({"ok": True, "neo4j": "awake", "postgres": "awake"})
        
    except Exception as e:
        print(f">> [DB SLEEPING / ERROR]: {str(e)}")
        # Tr v 200 d Render khAng kill deployment
        return jsonify({"ok": False, "error": str(e), "status": "waking_up"}), 200