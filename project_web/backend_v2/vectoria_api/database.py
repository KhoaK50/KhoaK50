import psycopg2
from psycopg2 import pool
from vectoria_api.config import DB_URL
import threading

# Thread-safe pool
try:
    db_pool = psycopg2.pool.ThreadedConnectionPool(1, 20, DB_URL)
    print(">> [Database] Connection pool created successfully")
except Exception as e:
    print(f">> [Database Error] Could not create connection pool: {e}")
    db_pool = None

def get_db_connection():
    if db_pool:
        return db_pool.getconn()
    else:
        return psycopg2.connect(DB_URL)

def release_db_connection(conn):
    if db_pool and conn:
        db_pool.putconn(conn)
    elif conn:
        conn.close()
