import psycopg2
from psycopg2 import pool
from psycopg2.extensions import STATUS_IN_TRANSACTION
from vectoria_api.config import DB_URL
import threading
import time

_pool_lock = threading.Lock()
db_pool = None

def _create_pool():
    global db_pool
    if not DB_URL:
        print(">> [Database Error] DB_URL is empty or not configured.")
        return None
    try:
        new_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=20,
            dsn=DB_URL,
            connect_timeout=10,
            keepalives=1,
            keepalives_idle=30,
            keepalives_interval=10,
            keepalives_count=5
        )
        print(">> [Database] Connection pool created successfully with TCP keepalives.")
        return new_pool
    except Exception as e:
        print(f">> [Database Error] Could not create connection pool: {e}")
        return None

db_pool = _create_pool()

def _is_connection_alive(conn):
    """
    Check if the connection socket is alive.
    Prevents 'server closed the connection unexpectedly' errors when Supabase drops idle connections.
    """
    if conn is None or conn.closed != 0:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1;")
            cur.fetchone()
        return True
    except (psycopg2.OperationalError, psycopg2.InterfaceError, psycopg2.DatabaseError):
        return False
    except Exception:
        return False

def get_db_connection(max_retries=3):
    """
    Acquire a database connection with pre-ping validation and automatic dead socket recovery.
    """
    global db_pool
    
    for attempt in range(max_retries):
        conn = None
        is_from_pool = False
        
        if db_pool:
            try:
                conn = db_pool.getconn()
                is_from_pool = True
            except Exception as e:
                print(f">> [Database Warning] Failed to get conn from pool (attempt {attempt + 1}): {e}")
                conn = None
        
        if conn is None:
            # Fallback to direct connection if pool fails or is unavailable
            try:
                return psycopg2.connect(
                    DB_URL,
                    connect_timeout=10,
                    keepalives=1,
                    keepalives_idle=30,
                    keepalives_interval=10,
                    keepalives_count=5
                )
            except Exception as direct_err:
                if attempt == max_retries - 1:
                    raise direct_err
                time.sleep(0.2)
                continue

        # Validate connection via pre-ping
        if _is_connection_alive(conn):
            return conn
        else:
            # Dead connection detected: safely evict from pool and retry
            print(f">> [Database Notice] Stale connection detected. Discarding and reconnecting (attempt {attempt + 1})...")
            if is_from_pool and db_pool:
                try:
                    db_pool.putconn(conn, close=True)
                except Exception:
                    try:
                        conn.close()
                    except Exception:
                        pass
            else:
                try:
                    conn.close()
                except Exception:
                    pass
            time.sleep(0.1)

    # Final fallback if pool checkout retries exhausted
    return psycopg2.connect(
        DB_URL,
        connect_timeout=10,
        keepalives=1,
        keepalives_idle=30,
        keepalives_interval=10,
        keepalives_count=5
    )

def release_db_connection(conn):
    """
    Safely release connection back to pool.
    Rolls back any active transaction and evicts dead connections.
    """
    global db_pool
    if not conn:
        return
        
    try:
        if conn.closed != 0:
            if db_pool:
                try:
                    db_pool.putconn(conn, close=True)
                except Exception:
                    pass
            return

        # Rollback active transactions to prevent state leakage
        try:
            if conn.status == STATUS_IN_TRANSACTION:
                conn.rollback()
        except Exception:
            pass

        if db_pool:
            db_pool.putconn(conn)
        else:
            conn.close()
    except Exception as e:
        print(f">> [Database Warning] Error releasing connection: {e}")
        try:
            conn.close()
        except Exception:
            pass
