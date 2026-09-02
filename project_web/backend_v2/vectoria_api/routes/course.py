import os
import psycopg2
from vectoria_api.database import get_db_connection, release_db_connection

from psycopg2.extras import RealDictCursor
from flask import Blueprint, request, jsonify
from vectoria_api.config import DB_URL

course_bp = Blueprint("course", __name__)

def init_course_db():
    try:
        conn = get_db_connection()
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

        # 3.1. LESSON TRANSLATIONS
        c.execute("""
            CREATE TABLE IF NOT EXISTS lesson_translations (
                topic_id VARCHAR(10) NOT NULL,
                order_index INT NOT NULL,
                language_code VARCHAR(5) NOT NULL,
                title VARCHAR(150) NOT NULL,
                content_html TEXT NOT NULL,
                PRIMARY KEY (topic_id, order_index, language_code),
                FOREIGN KEY (topic_id, order_index) REFERENCES lessons(topic_id, order_index) ON DELETE CASCADE
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

        # 7. USER_METRICS (Lưu trữ biến ẩn cá nhân hóa)
        c.execute("""
            CREATE TABLE IF NOT EXISTS user_metrics (
                user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                latent_ability NUMERIC(5,2) NOT NULL DEFAULT 1.00 CHECK (latent_ability > 0),
                trust_weight NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (trust_weight >= 0 AND trust_weight <= 1.00),
                total_activities INT NOT NULL DEFAULT 0,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 8. USER_LESSON_MASTERY (Độ thành thạo từng bài học)
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

        # 9. USER_LEARNING_PATHS
        c.execute("""
            CREATE TABLE IF NOT EXISTS user_learning_paths (
                user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                current_path JSONB NOT NULL DEFAULT '[]',
                proposed_path JSONB,
                reasoning_notes JSONB,
                is_pending_decision BOOLEAN NOT NULL DEFAULT FALSE,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.commit()
        release_db_connection(conn)
        print(">> Init Course DB Successfully")
    except Exception as e:
        print(">> Error initializing Course DB:", str(e))

init_course_db()

from vectoria_api.middleware.auth import token_required

@course_bp.route('/api/course/topic/<topic_id>/lesson/<order_index>', methods=['GET'])
def get_lesson(topic_id, order_index):
    try:
        lang = request.args.get('lang', 'vi')
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT * FROM lessons WHERE topic_id = %s AND order_index = %s", (topic_id, order_index))
        lesson = cursor.fetchone()
        
        if lesson:
            if 'created_at' in lesson and lesson['created_at']:
                lesson['created_at'] = lesson['created_at'].isoformat()
            if 'updated_at' in lesson and lesson['updated_at']:
                lesson['updated_at'] = lesson['updated_at'].isoformat()
                
            # Fetch translation if lang is not 'vi' or if we want to ensure translation overrides
            if lang != 'vi':
                cursor.execute("SELECT title, content_html FROM lesson_translations WHERE topic_id = %s AND order_index = %s AND language_code = %s", (topic_id, order_index, lang))
                trans = cursor.fetchone()
                if trans:
                    if trans['title'] is not None: lesson['title'] = trans['title']
                    if trans['content_html'] is not None: lesson['content_html'] = trans['content_html']
                    
            return jsonify({"success": True, "lesson": lesson}), 200
        return jsonify({"success": False, "message": "Lesson not found"}), 404
    except Exception as e:
        print(f"Error fetching lesson: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): release_db_connection(conn)

@course_bp.route('/api/course/topic/<topic_id>/lesson/<order_index>/view', methods=['POST'])
def increment_lesson_view(topic_id, order_index):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE lessons SET total_views = total_views + 1 WHERE topic_id = %s AND order_index = %s", (topic_id, order_index))
        conn.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        print(f"Error incrementing lesson view: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): release_db_connection(conn)

@course_bp.route('/api/course/graph', methods=['GET'])
def get_course_graph():
    # TODO: Fetch from DB instead of using mock, but for now we'll serve the logic
    pass

@course_bp.route('/api/course/submit-survey', methods=['POST'])
@token_required
def submit_survey(user_id):
    """
    Nhận kết quả khảo sát đầu vào.
    Body: {"survey_data": [{"topic_id": "t1", "order_index": 1, "s_self": 1.0}, ...]}
    """
    data = request.get_json()
    survey_data = data.get("survey_data", [])
    if not survey_data:
        return jsonify({"status": "error", "message": "No data provided"}), 400
        
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Đảm bảo user có dòng trong user_metrics
        c.execute("""
            INSERT INTO user_metrics (user_id, latent_ability, trust_weight, total_activities) 
            VALUES (%s, 1.00, 0.00, 0)
            ON CONFLICT (user_id) DO NOTHING
        """, (user_id,))
        
        for item in survey_data:
            t_id = item.get("topic_id")
            o_idx = item.get("order_index")
            s_self = float(item.get("s_self", 0.0))
            
            # Tính mastery_score ban đầu (alpha = 0, nên mastery_score = s_self)
            c.execute("""
                INSERT INTO user_lesson_mastery (user_id, topic_id, order_index, s_self, s_web, mastery_score)
                VALUES (%s, %s, %s, %s, 0.00, %s)
                ON CONFLICT (user_id, topic_id, order_index) 
                DO UPDATE SET s_self = EXCLUDED.s_self, mastery_score = (
                    SELECT (trust_weight * user_lesson_mastery.s_web) + ((1 - trust_weight) * EXCLUDED.s_self)
                    FROM user_metrics WHERE user_id = %s
                )
            """, (user_id, t_id, o_idx, s_self, s_self, user_id))
            
        conn.commit()
        return jsonify({"status": "success", "message": "Khảo sát đã được lưu."}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if 'conn' in locals():
            release_db_connection(conn)

@course_bp.route('/api/course/track-quiz', methods=['POST'])
@token_required
def track_quiz(user_id):
    """
    Nhận kết quả làm bài tập để update s_web, alpha và beta.
    Body: {"topic_id": "t1", "order_index": 1, "score": 8, "max_score": 10, "time_taken": 300} # time in seconds
    """
    data = request.get_json()
    t_id = data.get("topic_id")
    o_idx = data.get("order_index")
    score = float(data.get("score", 0))
    max_score = float(data.get("max_score", 10))
    time_taken_sec = float(data.get("time_taken", 0))
    time_taken_min = time_taken_sec / 60.0
    
    if not t_id or o_idx is None or max_score == 0:
        return jsonify({"status": "error", "message": "Invalid data"}), 400
        
    s_web_new = score / max_score
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # 1. Update user metrics (beta & alpha)
        c.execute("SELECT latent_ability, trust_weight, total_activities FROM user_metrics WHERE user_id = %s", (user_id,))
        metrics = c.fetchone()
        if not metrics:
            c.execute("INSERT INTO user_metrics (user_id) VALUES (%s) RETURNING latent_ability, trust_weight, total_activities", (user_id,))
            metrics = c.fetchone()
            
        beta, alpha, activities = float(metrics[0]), float(metrics[1]), metrics[2]
        
        # Lấy T lý thuyết của bài học
        c.execute("SELECT time FROM lessons WHERE topic_id = %s AND order_index = %s", (t_id, o_idx))
        lesson = c.fetchone()
        T_expected = float(lesson[0]) if lesson else 15.0
        
        # Tính delta Beta
        if s_web_new >= 0.8:
            if time_taken_min < T_expected * 0.8:
                beta += 0.1 # Nhanh & Đúng
            else:
                beta += 0.05 # Đúng nhưng hơi chậm
        elif s_web_new < 0.5:
            if time_taken_min > T_expected:
                beta -= 0.05 # Chậm & Sai
            else:
                beta -= 0.1 # Sai & Nhanh -> lụi/ẩu
                
        beta = max(0.5, min(beta, 3.0)) # Limit beta
        
        # Cập nhật alpha
        activities += 1
        alpha = min(1.0, alpha + 0.05)
        
        c.execute("""
            UPDATE user_metrics 
            SET latent_ability = %s, trust_weight = %s, total_activities = %s, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
        """, (beta, alpha, activities, user_id))
        
        # 2. Update user lesson mastery
        c.execute("""
            INSERT INTO user_lesson_mastery (user_id, topic_id, order_index, s_self, s_web, mastery_score)
            VALUES (%s, %s, %s, 0.00, %s, 0.00)
            ON CONFLICT (user_id, topic_id, order_index)
            DO UPDATE SET 
                s_web = EXCLUDED.s_web,
                updated_at = CURRENT_TIMESTAMP
        """, (user_id, t_id, o_idx, s_web_new))
        
        c.execute("""
            UPDATE user_lesson_mastery
            SET mastery_score = (%s * s_web) + ((1 - %s) * s_self)
            WHERE user_id = %s AND topic_id = %s AND order_index = %s
        """, (alpha, alpha, user_id, t_id, o_idx))
        
        conn.commit()
        return jsonify({
            "status": "success", 
            "beta_new": float(beta), 
            "alpha_new": float(alpha), 
            "s_web_new": float(s_web_new)
        }), 200
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if 'conn' in locals():
            release_db_connection(conn)

@course_bp.route('/api/course/track-reading', methods=['POST'])
@token_required
def track_reading(user_id):
    """
    Ghi nhận hành vi đọc lý thuyết của user
    Body: {"topic_id": "t1", "order_index": 1, "time_spent": 120} # in seconds
    """
    data = request.get_json()
    t_id = data.get("topic_id")
    o_idx = data.get("order_index")
    time_spent_sec = float(data.get("time_spent", 0))
    time_spent_min = time_spent_sec / 60.0
    
    if not t_id or o_idx is None:
        return jsonify({"status": "error", "message": "Invalid data"}), 400
        
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # 1. Update user metrics (beta & alpha)
        c.execute("SELECT latent_ability, trust_weight, total_activities FROM user_metrics WHERE user_id = %s", (user_id,))
        metrics = c.fetchone()
        if not metrics:
            c.execute("INSERT INTO user_metrics (user_id) VALUES (%s) RETURNING latent_ability, trust_weight, total_activities", (user_id,))
            metrics = c.fetchone()
            
        beta, alpha, activities = float(metrics[0]), float(metrics[1]), metrics[2]
        
        # Lấy T lý thuyết của bài học
        c.execute("SELECT time FROM lessons WHERE topic_id = %s AND order_index = %s", (t_id, o_idx))
        lesson = c.fetchone()
        T_expected = float(lesson[0]) if lesson else 15.0
        
        # Hành vi đọc: Nếu lướt quá nhanh (< 20% thời gian T)
        if time_spent_min < T_expected * 0.2:
            # Skim: Phạt nhẹ beta nếu chưa đủ niềm tin
            beta -= 0.01
        elif time_spent_min >= T_expected * 0.8:
            # Đọc kỹ: Tăng nhẹ beta
            beta += 0.01
            
        beta = max(0.5, min(beta, 3.0)) # Limit beta
        
        # Cập nhật alpha
        activities += 1
        alpha = min(1.0, alpha + 0.01) # Đọc bài thì tăng alpha ít hơn làm quiz (0.01 vs 0.05)
        
        c.execute("""
            UPDATE user_metrics 
            SET latent_ability = %s, trust_weight = %s, total_activities = %s, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
        """, (beta, alpha, activities, user_id))
        
        conn.commit()
        return jsonify({"status": "success", "message": "Đã ghi nhận hành vi đọc"}), 200
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if 'conn' in locals():
            release_db_connection(conn)

@course_bp.route('/api/quiz/available-count', methods=['POST'])
@token_required
def get_available_question_count(user_id):
    data = request.get_json()
    selected_topics = data.get("selected_topics", [])
    selected_lessons = data.get("selected_lessons", [])
    difficulty_config = data.get("difficulty_config", "MIXED")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if selected_lessons:
            filter_col = "lesson_id"
            filter_val = selected_lessons
        elif selected_topics:
            filter_col = "topic_id"
            filter_val = selected_topics
        else:
            return jsonify({"success": True, "count": 0}), 200
            
        if difficulty_config == "MIXED":
            query = f"SELECT COUNT(*) FROM questions WHERE {filter_col} = ANY(%s) AND is_active = TRUE"
            cursor.execute(query, (filter_val,))
        else:
            query = f"SELECT COUNT(*) FROM questions WHERE {filter_col} = ANY(%s) AND is_active = TRUE AND difficulty_level = %s"
            cursor.execute(query, (filter_val, difficulty_config))
            
        count = cursor.fetchone()[0]
        return jsonify({"success": True, "count": count}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if 'conn' in locals():
            release_db_connection(conn)

@course_bp.route('/api/quiz/generate', methods=['POST'])
@token_required
def generate_quiz(user_id):
    data = request.get_json()
    selected_topics = data.get("selected_topics", [])
    selected_lessons = data.get("selected_lessons", [])
    difficulty_config = data.get("difficulty_config", "MIXED")
    question_count = data.get("question_count", 10)
    mode = data.get("mode", "PRACTICE")
    time_limit = data.get("time_limit", 30)

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            INSERT INTO quizzes (user_id, title, selected_topics, selected_lessons, question_count, status, difficulty_config, mode, time_limit, started_at)
            VALUES (%s, 'Bài kiểm tra', %s, %s, %s, 'IN_PROGRESS', %s, %s, %s, CURRENT_TIMESTAMP)
            RETURNING id
        """, (user_id, selected_topics, selected_lessons, question_count, difficulty_config, mode, time_limit))
        quiz_id = cursor.fetchone()['id']
        
        # Determine filtering condition
        if selected_lessons:
            filter_col = "lesson_id"
            filter_val = selected_lessons
        else:
            filter_col = "topic_id"
            filter_val = selected_topics
            
        if difficulty_config == "MIXED":
            query = f"""
                SELECT id, content_html, image_url, option_a, option_b, option_c, option_d, difficulty_level
                FROM questions
                WHERE {filter_col} = ANY(%s) AND is_active = TRUE
                ORDER BY RANDOM()
                LIMIT %s
            """
            cursor.execute(query, (filter_val, question_count))
        else:
            query = f"""
                SELECT id, content_html, image_url, option_a, option_b, option_c, option_d, difficulty_level
                FROM questions
                WHERE {filter_col} = ANY(%s) AND is_active = TRUE AND difficulty_level = %s
                ORDER BY RANDOM()
                LIMIT %s
            """
            cursor.execute(query, (filter_val, difficulty_config, question_count))
            
        questions = cursor.fetchall()
        
        for i, q in enumerate(questions):
            cursor.execute("""
                INSERT INTO quizz_questions (quiz_id, question_id, order_index, status)
                VALUES (%s, %s, %s, 'UNSEEN')
            """, (quiz_id, q['id'], i + 1))
            q['order_index'] = i + 1
            
        conn.commit()
        return jsonify({"success": True, "quiz_id": quiz_id, "questions": questions}), 200
        
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): release_db_connection(conn)

@course_bp.route('/api/quiz/<int:quiz_id>/submit', methods=['POST'])
@token_required
def submit_quiz(user_id, quiz_id):
    data = request.get_json()
    answers = data.get("answers", [])
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT id FROM quizzes WHERE id = %s AND user_id = %s", (quiz_id, user_id))
        quiz = cursor.fetchone()
        if not quiz:
            return jsonify({"success": False, "message": "Quiz not found or unauthorized"}), 404
            
        correct_count = 0
        total_questions = len(answers)
        results = []
        
        for ans in answers:
            q_id = ans.get("question_id")
            selected_answer = ans.get("selected_answer")
            
            cursor.execute("SELECT correct_answer, explanation_html FROM questions WHERE id = %s", (q_id,))
            q_data = cursor.fetchone()
            
            if q_data:
                correct_ans = q_data['correct_answer']
                is_correct = (selected_answer == correct_ans)
                if is_correct:
                    correct_count += 1
                
                cursor.execute("""
                    UPDATE quizz_questions
                    SET selected_answer = %s, is_correct = %s, status = 'ANSWERED', answered_at = CURRENT_TIMESTAMP
                    WHERE quiz_id = %s AND question_id = %s
                """, (selected_answer, is_correct, quiz_id, q_id))
                
                results.append({
                    "question_id": q_id,
                    "selected_answer": selected_answer,
                    "correct_answer": correct_ans,
                    "is_correct": is_correct,
                    "explanation_html": q_data['explanation_html']
                })
                
        total_score = round((correct_count / total_questions) * 10, 2) if total_questions > 0 else 0
        
        cursor.execute("""
            UPDATE quizzes
            SET total_score = %s, status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (total_score, quiz_id))
        
        conn.commit()
        return jsonify({
            "success": True, 
            "total_score": total_score, 
            "correct_count": correct_count, 
            "total_questions": total_questions, 
            "results": results
        }), 200
        
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): release_db_connection(conn)




@course_bp.route('/api/course/all', methods=['GET'])
def get_all_course_data():
    lang = request.args.get('lang', 'vi').strip()
    try:
        conn = get_db_connection()
        c = conn.cursor(cursor_factory=RealDictCursor)
        
        if lang == 'vi':
            c.execute('''
                SELECT 
                    l.topic_id,
                    l.order_index as lesson_num,
                    l.title as lesson_title,
                    l.content_html,
                    t.title as topic_title,
                    s.id as section_id,
                    s.title as section_title
                FROM lessons l
                JOIN topics t ON l.topic_id = t.id
                JOIN sections s ON l.section_id = s.id
                ORDER BY t.created_at ASC, l.order_index ASC
            ''')
            rows = c.fetchall()
        else:
            # ONLY return lessons that HAVE a translation
            c.execute('''
                SELECT 
                    lt.topic_id,
                    lt.order_index as lesson_num,
                    lt.title as lesson_title,
                    lt.content_html,
                    t.title as topic_title,
                    s.id as section_id,
                    s.title as section_title
                FROM lesson_translations lt
                JOIN lessons l ON lt.topic_id = l.topic_id AND lt.order_index = l.order_index
                JOIN topics t ON lt.topic_id = t.id
                JOIN sections s ON l.section_id = s.id
                WHERE lt.language_code = %s
                ORDER BY t.created_at ASC, lt.order_index ASC
            ''', (lang,))
            rows = c.fetchall()
            
        import re as regex
        for row in rows:
            clean_text = regex.sub(r'<[^>]+>', ' ', row['content_html'])
            clean_text = regex.sub(r'\s+', ' ', clean_text).strip()
            row['content_text'] = clean_text
            del row['content_html']
            
        return jsonify({"success": True, "results": rows}), 200
    except Exception as e:
        print("GetAll error:", e)
        return jsonify({"success": False, "error": "Internal server error"}), 500
    finally:
        if 'conn' in locals() and conn:
            release_db_connection(conn)



