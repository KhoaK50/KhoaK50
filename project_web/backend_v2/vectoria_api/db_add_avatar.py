import os
import sys
from psycopg2 import connect
from config import DB_URL

def add_avatar_column():
    try:
        conn = connect(DB_URL)
    except Exception as e:
        print("Could not connect to database:", e)
        return
    
    try:
        with conn.cursor() as cur:
            # Check if avatar_url exists
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users' and column_name='avatar_url';
            """)
            if cur.fetchone():
                print("Column 'avatar_url' already exists.")
            else:
                cur.execute("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255);")
                conn.commit()
                print("Successfully added 'avatar_url' column to users table.")
    except Exception as e:
        print(f"Error updating schema: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_avatar_column()
