from neo4j import GraphDatabase
import sys

# --- CẤU HÌNH KẾT NỐI (Lấy từ Neo4j Aura) ---
URI = "neo4j+s://4dd80172.databases.neo4j.io"

# TUI CHỊU TRÁCH NHIỆM CHỖ NÀY: Dùng .strip() để gọt sạch mọi dấu cách, dấu Enter thừa lỡ dính vào lúc copy
PASSWORD = "V7LbjDyESk03bsWOMOZx6in4plhZuIuuHH4Of1o2aLA".strip()
AUTH = ("4dd80172", PASSWORD)

print("Dang khoi tao ket noi den may chu Neo4j...")

try:
    # Khởi tạo Driver kết nối
    driver = GraphDatabase.driver(URI, auth=AUTH)
    
    # KIỂM TRA ĐƯỜNG TRUYỀN: Test mật khẩu ngay lập tức trước khi chạy lệnh
    driver.verify_connectivity()
    print("✅ BẮT TAY THÀNH CÔNG! Mật khẩu chuẩn 100%, không bị lỗi Unauthorized nữa nhé!\n")
    
except Exception as e:
    print("❌ LỖI KẾT NỐI NGAY TỪ BƯỚC ĐẦU:")
    print("1. Nếu vẫn báo Unauthorized: File .txt hệ thống cấp đã bị lỗi (không khớp máy chủ). Sếp HÃY XÓA DB ĐÓ TẠO LẠI DB MỚI.")
    print(f"Chi tiết lỗi kỹ thuật: {e}")
    sys.exit(1) # Dừng chương trình luôn, không chạy xuống dưới


# --- HÀM 2: LẤY LỘ TRÌNH TỪ NEO4J TRẢ VỀ FLASK ---
def tim_lo_trinh_ngan_nhat(tx, diem_bat_dau, dich_den):
    # Lệnh Cypher kinh điển tìm đường đi ngắn nhất (shortestPath)
    query = """
    MATCH (start:Subject {id: $diem_bat_dau}), (end:Subject {id: $dich_den})
    MATCH p = shortestPath((start)-[:REQUIRES*]->(end))
    RETURN [n in nodes(p) | n.id] AS lo_trinh
    """
    # Chạy lệnh và truyền tham số (A và C)
    result = tx.run(query, diem_bat_dau=diem_bat_dau, dich_den=dich_den)
    record = result.single()
    
    if record:
        return record["lo_trinh"]
    else:
        return None

