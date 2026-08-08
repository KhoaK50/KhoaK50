import psycopg2

DB_URL = "postgresql://postgres.hebswwabrjbmbwqvymal:NtDk2108$$$@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

def init_behavior_db():
    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        c.execute("""
            CREATE TABLE IF NOT EXISTS user_metrics (
                user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                latent_ability NUMERIC(5,2) NOT NULL DEFAULT 1.00 CHECK (latent_ability > 0),
                trust_weight NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (trust_weight >= 0 AND trust_weight <= 1.00),
                total_activities INT NOT NULL DEFAULT 0,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS user_lesson_mastery (
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                topic_id VARCHAR(10) NOT NULL,
                order_index INT NOT NULL,
                s_self NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (s_self >= 0 AND s_self <= 1.00),
                s_web NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (s_web >= 0 AND s_web <= 1.00),
                mastery_score NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (mastery_score >= 0 AND mastery_score <= 1.00),
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, topic_id, order_index),
                FOREIGN KEY (topic_id, order_index) REFERENCES lessons(topic_id, order_index) ON DELETE CASCADE
            )
        """)
        
        conn.commit()
        conn.close()
        print(">> Behavior DB Tables Initialized Successfully")
    except Exception as e:
        print(">> Error initializing Behavior DB:", str(e))

if __name__ == "__main__":
    init_behavior_db()
