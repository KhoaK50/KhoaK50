from neo4j import GraphDatabase
import sys
import os
from dotenv import load_dotenv

load_dotenv()

# --- CẤU HÌNH KẾT NỐI ---
URI = os.getenv("NEO4J_URI", "")
USER = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "")
AUTH = (USER, PASSWORD)

import threading

driver = None

if not URI or not PASSWORD:
    print("[WARNING] NEO4J_URI hoac NEO4J_PASSWORD chua duoc cau hinh trong .env")
else:
    try:
        # Khoi tao Driver ket noi (khong ton thoi gian mang)
        driver = GraphDatabase.driver(URI, auth=AUTH)
        
        def _verify_bg(drv):
            try:
                drv.verify_connectivity()
                print("[SUCCESS] Connected successfully to Neo4j.\n")
            except Exception as e:
                print(f">> [Neo4j Notice] May chu dang ngu dong hoac ket noi cham: {e}\n")

        # Chay kiem tra ket noi trong luong nen de khong lam treo server Flask
        t = threading.Thread(target=_verify_bg, args=(driver,), daemon=True)
        t.start()
    except Exception as e:
        print(f"[ERROR] Khong the khoi tao driver Neo4j: {e}")

# --- HÀM 2: LẤY LỘ TRÌNH TỪ NEO4J TRẢ VỀ FLASK ---
def tim_lo_trinh_ngan_nhat(tx, diem_bat_dau, dich_den):
    query = """
    MATCH (start:Lesson {id: $diem_bat_dau}), (end:Lesson {id: $dich_den})
    MATCH p = shortestPath((start)-[:REQUIRES*]->(end))
    RETURN [n in nodes(p) | n.id] AS lo_trinh
    """
    result = tx.run(query, diem_bat_dau=diem_bat_dau, dich_den=dich_den)
    record = result.single()
    
    if record:
        return record["lo_trinh"]
    else:
        return None
