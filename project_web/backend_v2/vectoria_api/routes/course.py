import os
import psycopg2
from flask import Blueprint, request, jsonify
from vectoria_api.config import DB_URL

course_bp = Blueprint("course", __name__)

def init_course_db():
    try:
        conn = psycopg2.connect(DB_URL)
        c = conn.cursor()

        # 1. TOPIC
        c.execute("""
            CREATE TABLE IF NOT EXISTS topics (
                id VARCHAR(10) PRIMARY KEY,
                title VARCHAR(150) UNIQUE NOT NULL,
                summary VARCHAR(500),
                case_study_html TEXT,
                mindmap_url VARCHAR(255),
                meta_keywords VARCHAR(255),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 2. SECTION
        c.execute("""
            CREATE TABLE IF NOT EXISTS sections (
                id VARCHAR(10) PRIMARY KEY,
                topic_id VARCHAR(10) NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
                title VARCHAR(150) UNIQUE NOT NULL,
                summary VARCHAR(500),
                learning_objective TEXT,
                order_index INT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 3. LESSON
        c.execute("""
            CREATE TABLE IF NOT EXISTS lessons (
                topic_id VARCHAR(10) NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
                order_index INT NOT NULL,
                section_id VARCHAR(10) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
                title VARCHAR(150) NOT NULL,
                content_html TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                total_views INT NOT NULL DEFAULT 0,
                complexity INT NOT NULL DEFAULT 5,
                time INT NOT NULL DEFAULT 45,
                value INT NOT NULL DEFAULT 5,
                PRIMARY KEY (topic_id, order_index)
            )
        """)

        # 4. USER_LESSON_HISTORY
        c.execute("""
            CREATE TABLE IF NOT EXISTS user_lesson_history (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                topic_id VARCHAR(10) NOT NULL,
                order_index INT NOT NULL,
                last_read_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (last_read_percent >= 0.00 AND last_read_percent <= 100.00),
                visited_at TIMESTAMP,
                FOREIGN KEY (topic_id, order_index) REFERENCES lessons(topic_id, order_index) ON DELETE CASCADE
            )
        """)

        # 5. LESSON_COMMENT
        c.execute("""
            CREATE TABLE IF NOT EXISTS lesson_comments (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                topic_id VARCHAR(10) NOT NULL,
                order_index INT NOT NULL,
                parent_comment_id INT REFERENCES lesson_comments(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                upvote_count INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (topic_id, order_index) REFERENCES lessons(topic_id, order_index) ON DELETE CASCADE
            )
        """)

        # 6. SAVED_LESSON
        c.execute("""
            CREATE TABLE IF NOT EXISTS saved_lessons (
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                topic_id VARCHAR(10) NOT NULL,
                order_index INT NOT NULL,
                note VARCHAR(255),
                saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
                PRIMARY KEY (user_id, topic_id, order_index),
                FOREIGN KEY (topic_id, order_index) REFERENCES lessons(topic_id, order_index) ON DELETE CASCADE
            )
        """)

        conn.commit()
        conn.close()
        print(">> Init Course DB Successfully")
    except Exception as e:
        print(">> Error initializing Course DB:", str(e))

init_course_db()

@course_bp.route('/api/course/graph', methods=['GET'])
def get_course_graph():
    # TODO: Fetch from DB instead of using mock, but for now we'll serve the logic
    pass
