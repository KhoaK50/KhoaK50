import psycopg2
import sys
import os

# Add parent directory to path to import vectoria_api
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from vectoria_api.database import get_db_connection, release_db_connection

def create_learning_tables():
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # 1. user_node_progress
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_node_progress (
                    user_id INT REFERENCES users(id) ON DELETE CASCADE,
                    node_id VARCHAR(50) NOT NULL,
                    status VARCHAR(20) DEFAULT 'locked',
                    highest_score FLOAT DEFAULT 0,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, node_id)
                );
            """)
            print(">> Created user_node_progress table.")

            # 2. user_tasks
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_tasks (
                    user_id INT REFERENCES users(id) ON DELETE CASCADE,
                    node_id VARCHAR(50) NOT NULL,
                    task_type VARCHAR(20) NOT NULL,
                    progress_data JSONB,
                    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, node_id, task_type)
                );
            """)
            print(">> Created user_tasks table.")

            # 3. knowledge_debts
            cur.execute("""
                CREATE TABLE IF NOT EXISTS knowledge_debts (
                    user_id INT REFERENCES users(id) ON DELETE CASCADE,
                    debt_node_id VARCHAR(50) NOT NULL,
                    source_node_id VARCHAR(50) NOT NULL,
                    is_cleared BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, debt_node_id)
                );
            """)
            print(">> Created knowledge_debts table.")

            # 4. user_learning_paths
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_learning_paths (
                    user_id INT REFERENCES users(id) ON DELETE CASCADE,
                    path_id VARCHAR(50) NOT NULL,
                    start_node_id VARCHAR(50) NOT NULL,
                    target_node_id VARCHAR(50) NOT NULL,
                    path_nodes JSONB NOT NULL,
                    status VARCHAR(20) DEFAULT 'active' NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    PRIMARY KEY (user_id, path_id)
                );
            """)
            print(">> Created user_learning_paths table.")

        conn.commit()
        print(">> All learning path tables created successfully!")
    except Exception as e:
        conn.rollback()
        print(f">> Error creating tables: {e}")
    finally:
        release_db_connection(conn)

if __name__ == "__main__":
    create_learning_tables()
