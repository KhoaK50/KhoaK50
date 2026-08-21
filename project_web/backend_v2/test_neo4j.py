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

print("Dang khoi tao ket noi den may chu Neo4j...")

try:
    if not URI or not PASSWORD:
        print("[WARNING] NEO4J_URI hoac NEO4J_PASSWORD chua duoc cau hinh trong .env")
        # Khong exit de web con chay duoc neu khong can neo4j ngay
        driver = None
    else:
        # Khởi tạo Driver kết nối
        driver = GraphDatabase.driver(URI, auth=AUTH)
        
        # KIỂM TRA ĐƯỜNG TRUYỀN
        driver.verify_connectivity()
        print("[SUCCESS] Connected successfully to Neo4j.\n")
    
except Exception as e:
    print("[ERROR] Connection error:")
    print("If Unauthorized: Check credentials.")
    print(f"Details: {e}")
    sys.exit(1)

# --- HÀM 2: LẤY LỘ TRÌNH TỪ NEO4J TRẢ VỀ FLASK ---
def tim_lo_trinh_ngan_nhat(tx, diem_bat_dau, dich_den):
    query = """
    MATCH (start:Subject {id: $diem_bat_dau}), (end:Subject {id: $dich_den})
    MATCH p = shortestPath((start)-[:REQUIRES*]->(end))
    RETURN [n in nodes(p) | n.id] AS lo_trinh
    """
    result = tx.run(query, diem_bat_dau=diem_bat_dau, dich_den=dich_den)
    record = result.single()
    
    if record:
        return record["lo_trinh"]
    else:
        return None
