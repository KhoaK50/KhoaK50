import os
import psycopg2
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

load_dotenv()

DB_URL = "postgresql://postgres.hebswwabrjbmbwqvymal:NtDk2108$$$@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

def create_superuser():
    print("=== TẠO TÀI KHOẢN ADMIN MỚI ===")
    username = input("Nhập username: ").strip()
    if not username:
        print("Username không được để trống!")
        return
        
    password = input("Nhập mật khẩu: ").strip()
    if not password:
        print("Mật khẩu không được để trống!")
        return

    # Xác thực bằng master key
    master_key_input = input("Nhập Master Key để xác nhận quyền: ").strip()
    actual_master_key = os.environ.get("ADMIN_SECRET_KEY", "vectoria-admin-123")
    
    if master_key_input != actual_master_key:
        print("Sai Master Key! Bạn không có quyền tạo tài khoản Admin.")
        return

    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()
        
        password_hash = generate_password_hash(password)
        
        c.execute(
            "INSERT INTO admins (username, password_hash) VALUES (%s, %s)",
            (username, password_hash)
        )
        conn.commit()
        conn.close()
        
        print(f"\n[THÀNH CÔNG] Đã tạo tài khoản admin '{username}' thành công!")
        print("Bạn có thể dùng tài khoản này để đăng nhập vào Admin Panel.")
    except psycopg2.IntegrityError:
        print(f"\n[LỖI] Tài khoản '{username}' đã tồn tại trong hệ thống!")
    except Exception as e:
        print(f"\n[LỖI HỆ THỐNG] {e}")

if __name__ == "__main__":
    create_superuser()
