import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import psycopg2
from vectoria_api.config import DB_URL

queries = [
    """
    CREATE TABLE IF NOT EXISTS flagged_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        comment_id INTEGER NOT NULL REFERENCES lesson_comments(id) ON DELETE CASCADE,
        original_content TEXT NOT NULL,
        ai_severity_score NUMERIC(3,2) NOT NULL CHECK (ai_severity_score >= 0.0 AND ai_severity_score <= 1.0),
        ai_reason TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED', 'DISMISSED')),
        ip_address VARCHAR(45),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(30) NOT NULL DEFAULT 'WARNING' CHECK (type IN ('WARNING', 'SYSTEM', 'INFO')),
        title VARCHAR(150) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """
]

def run_patch():
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        for q in queries:
            cursor.execute(q)
        conn.commit()
        print("Database patched successfully for Moderation system.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    run_patch()
