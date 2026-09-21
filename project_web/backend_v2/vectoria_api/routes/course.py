import os
import json
import threading
from datetime import datetime
import psycopg2
from vectoria_api.database import get_db_connection, release_db_connection

from psycopg2.extras import RealDictCursor
from flask import Blueprint, request, jsonify
from vectoria_api.config import DB_URL
from vectoria_api.core.diagnostic_engine import (
    calculate_bkt_update,
    calculate_person_fit_lz,
    calculate_rte,
    classify_edge_cases,
    get_neo4j_prerequisites
)
from vectoria_api.core.mentor_service import MentorService

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
            normalized = []
            for item in selected_lessons:
                s = str(item).strip()
                normalized.append(s)
                if s.startswith("lesson_"):
                    normalized.append("l" + s[7:])
                elif s.startswith("l") and s[1:].isdigit():
                    normalized.append("lesson_" + s[1:])
                elif s.isdigit():
                    normalized.append("lesson_" + s)
                    normalized.append("l" + s)
            filter_val = list(set(normalized))
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
        if count == 0:
            cursor.execute("SELECT COUNT(*) FROM questions WHERE is_active = TRUE")
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
    selected_topics = data.get("selected_topics") or []
    if not isinstance(selected_topics, list):
        selected_topics = [selected_topics]
    selected_lessons = data.get("selected_lessons") or []
    if not isinstance(selected_lessons, list):
        selected_lessons = [selected_lessons]
    difficulty_config = data.get("difficulty_config", "MIXED")
    mode = data.get("mode", "PRACTICE")
    title = data.get("title") or ("Bài thi Tổng hợp Lộ trình" if mode == "EXAM" else "Bài kiểm tra")
    
    if not selected_topics:
        selected_topics = ["t1"]
    
    try:
        question_count = int(data.get("question_count", 5))
        if question_count < 5:
            question_count = 5
    except (ValueError, TypeError):
        question_count = 5

    try:
        time_limit = int(data.get("time_limit", 0))
        if time_limit < 0:
            time_limit = 0
    except (ValueError, TypeError):
        time_limit = 0

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            INSERT INTO quizzes (user_id, title, selected_topics, selected_lessons, question_count, status, difficulty_config, mode, time_limit, started_at)
            VALUES (%s, %s, %s, %s, %s, 'IN_PROGRESS', %s, %s, %s, CURRENT_TIMESTAMP)
            RETURNING id
        """, (user_id, title, selected_topics, selected_lessons, question_count, difficulty_config, mode, time_limit))
        quiz_id = cursor.fetchone()['id']
        
        # Determine filtering condition
        filter_col = "topic_id"
        filter_val = selected_topics
        if selected_lessons:
            filter_col = "lesson_id"
            normalized = []
            for item in selected_lessons:
                s = str(item).strip()
                normalized.append(s)
                if s.startswith("lesson_"):
                    normalized.append("l" + s[7:])
                elif s.startswith("l") and s[1:].isdigit():
                    normalized.append("lesson_" + s[1:])
                elif s.isdigit():
                    normalized.append("lesson_" + s)
                    normalized.append("l" + s)
            filter_val = list(set(normalized))
            
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

        # Graceful fallback: If specified lessons have no questions yet in DB, fetch from active pool
        if not questions:
            cursor.execute("""
                SELECT id, content_html, image_url, option_a, option_b, option_c, option_d, difficulty_level
                FROM questions
                WHERE is_active = TRUE
                ORDER BY RANDOM()
                LIMIT %s
            """, (question_count,))
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

def _async_mentor_llm_worker(q_id, u_id, u_name, d_result, t_score, q_title, att_num, enr_items, base_meta):
    try:
        llm_res = MentorService.generate_llm_feedback(
            diagnosis_result=d_result,
            total_score=t_score,
            topic_title=q_title,
            attempt_number=att_num,
            enriched_items=enr_items,
            user_name=u_name
        )
        if llm_res:
            base_meta["mentor_speech"] = {
                "text": llm_res.get("mentor_speech") or llm_res.get("message", ""),
                "emotion_state": llm_res.get("emotion_state", "ANALYTICAL_NEUTRAL"),
                "avatar_mood": llm_res.get("avatar_mood", "thoughtful"),
                "summary_reason": llm_res.get("summary_reason", ""),
                "suggested_action": llm_res.get("suggested_action", ""),
                "source": llm_res.get("source", "LLM_GEMINI")
            }
            base_meta["llm_status"] = "completed"
            base_meta["tone_emotion"] = llm_res.get("emotion_state", "ANALYTICAL_NEUTRAL")
            base_meta["avatar_mood"] = llm_res.get("avatar_mood", "thoughtful")
            base_meta["core_gap"] = llm_res.get("summary_reason", "")
            base_meta["actionable_direction"] = llm_res.get("suggested_action", "")
            
            w_conn = get_db_connection()
            w_cur = w_conn.cursor()
            w_cur.execute("UPDATE quizzes SET metadata = %s WHERE id = %s", (json.dumps(base_meta), q_id))

            # Cập nhật đánh giá LLM sâu vào user_tasks nếu bài tập gắn với node_id
            req_node_id = base_meta.get("node_id")
            if req_node_id:
                try:
                    w_cur.execute("""
                        UPDATE user_tasks
                        SET progress_data = jsonb_set(
                            progress_data,
                            '{mentor_evaluation}',
                            %s::jsonb
                        ),
                        last_accessed = CURRENT_TIMESTAMP
                        WHERE user_id = %s AND node_id = %s AND task_type = 'practice'
                    """, (json.dumps(base_meta["mentor_speech"]), u_id, str(req_node_id)))
                except Exception as e_ut:
                    print(f">> [AsyncMentorWorker] Warning updating user_tasks with LLM feedback: {e_ut}")

            w_conn.commit()
            w_cur.close()
            release_db_connection(w_conn)
            print(f">> [AsyncMentorWorker] Updated quiz {q_id} and user_tasks with LLM feedback successfully.")
    except Exception as ex:
        print(f">> [AsyncMentorWorker] Error generating LLM feedback for quiz {q_id}: {ex}")
        try:
            base_meta["llm_status"] = "completed"
            w_conn = get_db_connection()
            w_cur = w_conn.cursor()
            w_cur.execute("UPDATE quizzes SET metadata = %s WHERE id = %s", (json.dumps(base_meta), q_id))
            w_conn.commit()
            w_cur.close()
            release_db_connection(w_conn)
        except Exception:
            pass

@course_bp.route('/api/quiz/<int:quiz_id>/submit', methods=['POST'])
@token_required
def submit_quiz(user_id, quiz_id):
    data = request.get_json() or {}
    answers = data.get("answers", [])
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT id, title FROM quizzes WHERE id = %s AND user_id = %s", (quiz_id, user_id))
        quiz = cursor.fetchone()
        if not quiz:
            return jsonify({"success": False, "message": "Quiz not found or unauthorized"}), 404
            
        quiz_title = quiz.get("title") or "Bài kiểm tra Đại số Tuyến tính"

        # Lấy display_name của người học
        cursor.execute("SELECT display_name FROM users WHERE id = %s", (user_id,))
        u_row = cursor.fetchone()
        user_name = (u_row.get("display_name") or "").strip() if u_row else ""
            
        cursor.execute("""
            SELECT qq.question_id, qq.order_index, qq.attempt_number,
                   q.correct_answer, q.explanation_html, q.difficulty_level,
                   q.difficulty_index, q.discrimination_index, q.tags,
                   q.distractor_mapping, q.topic_id, q.lesson_id
            FROM quizz_questions qq
            JOIN questions q ON qq.question_id = q.id
            WHERE qq.quiz_id = %s
            ORDER BY qq.order_index ASC
        """, (quiz_id,))
        quiz_q_rows = cursor.fetchall()
        
        total_questions = len(quiz_q_rows) if quiz_q_rows else len(answers)
        correct_count = 0
        results = []
        
        ans_map = {}
        for a in answers:
            ans_map[a.get("question_id")] = a
            
        # Lấy bản đồ năng lực quá khứ (BKT Prior) của người học
        user_p_l_map = {}
        cursor.execute("SELECT tag, mastery_score FROM user_competencies WHERE user_id = %s", (user_id,))
        for c_row in cursor.fetchall():
            user_p_l_map[c_row["tag"]] = float(c_row["mastery_score"]) / 100.0
            
        # Lấy năng lực tiềm ẩn latent_ability (theta)
        cursor.execute("SELECT latent_ability, trust_weight, total_activities FROM user_metrics WHERE user_id = %s", (user_id,))
        metric_row = cursor.fetchone()
        if not metric_row:
            cursor.execute("INSERT INTO user_metrics (user_id) VALUES (%s) RETURNING latent_ability, trust_weight, total_activities", (user_id,))
            metric_row = cursor.fetchone()
            
        theta = float(metric_row["latent_ability"]) - 1.0 if metric_row else 0.0
        alpha = float(metric_row["trust_weight"]) if metric_row else 0.0
        activities = int(metric_row["total_activities"]) if metric_row else 0
        
        # 1. Thu thập dữ liệu vi hành vi từng câu hỏi
        items_for_diag = []
        for q_data in (quiz_q_rows if quiz_q_rows else []):
            q_id = q_data['question_id']
            correct_ans = q_data['correct_answer']
            user_ans_obj = ans_map.get(q_id) or {}
            
            raw_ans = user_ans_obj.get("selected_answer")
            ans_str = str(raw_ans).strip()[:1].upper() if raw_ans is not None else None
            selected_answer = ans_str if ans_str in ['A', 'B', 'C', 'D'] else None
            t_spent = int(user_ans_obj.get("time_spent_seconds") or user_ans_obj.get("time_spent") or 0)
            sw_count = int(user_ans_obj.get("switch_count") or 0)
            
            is_correct = (selected_answer == correct_ans) if selected_answer else False
            if is_correct:
                correct_count += 1
                
            distractor_map = q_data.get('distractor_mapping') or {}
            distractor_type = distractor_map.get(selected_answer, "NONE") if not is_correct and selected_answer else "NONE"
            
            items_for_diag.append({
                "question_id": q_id,
                "selected_answer": selected_answer,
                "correct_answer": correct_ans,
                "is_correct": is_correct,
                "time_spent_seconds": t_spent,
                "switch_count": sw_count,
                "difficulty_level": q_data.get('difficulty_level', 'MEDIUM'),
                "difficulty_index": float(q_data.get('difficulty_index') or 0.0),
                "discrimination_index": float(q_data.get('discrimination_index') or 1.0),
                "tags": q_data.get('tags') or [],
                "distractor_type": distractor_type,
                "topic_id": q_data.get('topic_id'),
                "lesson_id": q_data.get('lesson_id'),
                "explanation_html": q_data.get('explanation_html')
            })
            
        # 2. Chạy Bộ Não Chẩn Đoán Toán Học
        overall_rte, enriched_items = calculate_rte(items_for_diag, default_expected_time=60.0)
        l_z, log_lik, var_lik = calculate_person_fit_lz(enriched_items, theta=theta)
        diag_result = classify_edge_cases(enriched_items, l_z=l_z, overall_rte=overall_rte, user_p_l_map=user_p_l_map)
        
        # 3. Cập nhật quizz_questions với dữ liệu vi hành vi và cờ chẩn đoán
        for it in enriched_items:
            q_id = it["question_id"]
            selected_answer = it["selected_answer"]
            is_correct = it["is_correct"]
            t_spent = it["time_spent_seconds"]
            sw_count = it["switch_count"]
            q_flag = diag_result["item_diagnoses"].get(q_id, "NORMAL")
            q_status = 'ANSWERED' if selected_answer else 'VIEWED'
            
            cursor.execute("""
                UPDATE quizz_questions
                SET selected_answer = %s,
                    is_correct = %s,
                    status = %s,
                    answered_at = CURRENT_TIMESTAMP,
                    time_spent_seconds = %s,
                    switch_count = %s,
                    diagnosis_flag = %s
                WHERE quiz_id = %s AND question_id = %s
            """, (selected_answer, is_correct, q_status, t_spent, sw_count, q_flag, quiz_id, q_id))
            
            results.append({
                "question_id": q_id,
                "selected_answer": selected_answer,
                "correct_answer": it["correct_answer"],
                "is_correct": is_correct,
                "time_spent_seconds": t_spent,
                "switch_count": sw_count,
                "diagnosis_flag": q_flag,
                "explanation_html": it["explanation_html"]
            })
            
        # 4. Cập nhật BKT vào user_competencies
        tag_results = {}
        for it in enriched_items:
            for tag in (it.get("tags") or []):
                if tag not in tag_results:
                    tag_results[tag] = []
                tag_results[tag].append(it["is_correct"])
                
        for tag, bools in tag_results.items():
            p_curr = user_p_l_map.get(tag, 0.50)
            tag_correct_count = sum(1 for b in bools if b)
            tag_total_count = len(bools)
            
            for b in bools:
                p_curr = calculate_bkt_update(p_curr, is_correct=b)
                
            new_mastery_pct = round(p_curr * 100.0, 2)
            cursor.execute("""
                INSERT INTO user_competencies (user_id, tag, total_attempts, correct_attempts, mastery_score, last_practiced_at)
                VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, tag)
                DO UPDATE SET 
                    total_attempts = user_competencies.total_attempts + EXCLUDED.total_attempts,
                    correct_attempts = user_competencies.correct_attempts + EXCLUDED.correct_attempts,
                    mastery_score = EXCLUDED.mastery_score,
                    last_practiced_at = CURRENT_TIMESTAMP;
            """, (user_id, tag, tag_total_count, tag_correct_count, new_mastery_pct))
            
        # 5. Sinh phản hồi tức thì siêu tốc qua MentorService (không nghẽn luồng)
        total_score = round((correct_count / total_questions) * 10, 2) if total_questions > 0 else 0
        attempt_number = quiz_q_rows[0].get("attempt_number", 1) if quiz_q_rows else 1
        mentor_res = MentorService.generate_immediate_feedback(
            diagnosis_result=diag_result,
            total_score=total_score,
            topic_title=quiz_title,
            attempt_number=attempt_number,
            user_name=user_name
        )
        
        # 6. Xây dựng cấu trúc diagnostic_metadata JSON chuẩn mực kèm chi tiết câu hỏi
        total_time = sum(it.get("time_spent_seconds", 0) for it in enriched_items)
        avg_time = round(total_time / total_questions, 1) if total_questions > 0 else 0
        total_switches = sum(it.get("switch_count", 0) for it in enriched_items)
        
        items_summary = [
            {
                "question_id": it["question_id"],
                "is_correct": it["is_correct"],
                "time_spent_seconds": it.get("time_spent_seconds", 0),
                "switch_count": it.get("switch_count", 0),
                "tags": it.get("tags") or []
            }
            for it in enriched_items
        ]
        
        diagnostic_metadata = {
            "quiz_id": quiz_id,
            "user_id": user_id,
            "user_name": user_name,
            "quiz_title": quiz_title,
            "score": total_score,
            "correct_count": correct_count,
            "total_questions": total_questions,
            "percentage": round((correct_count / total_questions) * 100, 1) if total_questions > 0 else 0,
            "llm_status": "pending",
            "items_summary": items_summary,
            "telemetry": {
                "total_time_seconds": total_time,
                "avg_time_per_question": avg_time,
                "time_per_question_avg": avg_time,
                "total_switch_count": total_switches,
                "switch_tab_count": total_switches,
                "rapid_guessing_detected": overall_rte < 0.5 or (avg_time > 0 and avg_time < 15.0),
                "reading_pacing_status": "rapid_guessing" if (overall_rte < 0.5 or (avg_time > 0 and avg_time < 15.0)) else "standard",
                "overall_rte": round(overall_rte, 2)
            },
            "cognitive_diagnosis": {
                "person_fit_lz": round(l_z, 2),
                "is_false_mastery": diag_result.get("is_false_mastery", False),
                "detected_cases": diag_result.get("detected_cases", []),
                "suspected_lucky_count": diag_result.get("suspected_lucky_count", 0),
                "latent_ability_theta": round(theta + 1.0, 2)
            },
            "mentor_speech": {
                "text": mentor_res.get("mentor_speech") or mentor_res.get("message", ""),
                "emotion_state": mentor_res.get("emotion_state", "ANALYTICAL_NEUTRAL"),
                "avatar_mood": mentor_res.get("avatar_mood", "thoughtful"),
                "summary_reason": mentor_res.get("summary_reason", ""),
                "suggested_action": mentor_res.get("suggested_action", ""),
                "source": mentor_res.get("source", "DETERMINISTIC_FALLBACK")
            },
            "tone_emotion": mentor_res.get("emotion_state", "ANALYTICAL_NEUTRAL"),
            "avatar_mood": mentor_res.get("avatar_mood", "thoughtful"),
            "core_gap": mentor_res.get("summary_reason", ""),
            "actionable_direction": mentor_res.get("suggested_action", ""),
            "evaluated_at": datetime.now().isoformat()
        }

        # 7. Cập nhật quizzes & user_metrics
        cursor.execute("""
            UPDATE quizzes
            SET total_score = %s, status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP,
                metadata = %s
            WHERE id = %s
        """, (total_score, json.dumps(diagnostic_metadata), quiz_id))
        
        # Cập nhật latent_ability (theta) dựa trên kết quả và RTE
        if total_score >= 8.0 and overall_rte >= 0.7:
            theta = min(2.0, theta + 0.1)
        elif total_score < 5.0:
            theta = max(-2.0, theta - 0.1)
        alpha = min(1.0, alpha + 0.05)
        activities += 1
        
        cursor.execute("""
            UPDATE user_metrics
            SET latent_ability = %s, trust_weight = %s, total_activities = %s, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
        """, (theta + 1.0, alpha, activities, user_id))
        
        # 8. Ghi nhận nợ tri thức vào knowledge_debts nếu có nghi ngờ hoặc ảo tưởng thành thạo
        if diag_result.get("suspected_lucky_count", 0) > 0 or diag_result.get("is_false_mastery"):
            suspected_items = [it for it in enriched_items if diag_result["item_diagnoses"].get(it["question_id"]) == "SUSPECTED_LUCKY"]
            for s_it in suspected_items:
                debt_node = s_it.get("lesson_id") or s_it.get("topic_id") or "matrix_concept"
                source_node = s_it.get("lesson_id") or s_it.get("topic_id") or "quiz_test"
                cursor.execute("""
                    INSERT INTO knowledge_debts (user_id, debt_node_id, source_node_id, suspected_count, is_cleared, created_at)
                    VALUES (%s, %s, %s, 1, FALSE, CURRENT_TIMESTAMP)
                    ON CONFLICT (user_id, debt_node_id)
                    DO UPDATE SET 
                        suspected_count = knowledge_debts.suspected_count + 1,
                        is_cleared = FALSE,
                        created_at = CURRENT_TIMESTAMP;
                """, (user_id, debt_node, source_node))
                
        # 8. Tự động suy luận node_id và path_id để bảo đảm dữ liệu luôn được ghi vào user_tasks
        req_node_id = data.get("node_id") or data.get("lesson_id")
        if not req_node_id:
            cursor.execute("SELECT selected_lessons FROM quizzes WHERE id = %s", (quiz_id,))
            q_row = cursor.fetchone()
            if q_row and q_row.get("selected_lessons"):
                s_lessons = q_row["selected_lessons"]
                if isinstance(s_lessons, list) and len(s_lessons) > 0:
                    req_node_id = str(s_lessons[0]).strip()
        if not req_node_id:
            cursor.execute("""
                SELECT q.lesson_id FROM quizz_questions qq
                JOIN questions q ON qq.question_id = q.id
                WHERE qq.quiz_id = %s AND q.lesson_id IS NOT NULL
                LIMIT 1
            """, (quiz_id,))
            q_l = cursor.fetchone()
            if q_l and q_l.get("lesson_id"):
                req_node_id = str(q_l["lesson_id"]).strip()

        # Chuẩn hóa node_id (e.g. '1' -> 'l1', 'lesson_1' -> 'l1')
        if req_node_id:
            req_node_id = str(req_node_id).strip()
            if req_node_id.startswith("lesson_"):
                req_node_id = "l" + req_node_id[7:]
            elif req_node_id.isdigit():
                req_node_id = "l" + req_node_id

        req_path_id = data.get("path_id")
        if not req_path_id and req_node_id:
            cursor.execute("""
                SELECT path_id, path_nodes FROM user_learning_paths
                WHERE user_id = %s AND status IN ('pending', 'active')
                ORDER BY created_at DESC LIMIT 1
            """, (user_id,))
            p_row = cursor.fetchone()
            if p_row:
                p_nodes = p_row.get("path_nodes") or []
                if isinstance(p_nodes, str):
                    try:
                        p_nodes = json.loads(p_nodes)
                    except Exception:
                        p_nodes = []
                if req_node_id in p_nodes:
                    req_path_id = p_row["path_id"]

        # Cập nhật tiến trình vào user_tasks nếu có node_id
        if user_id and req_node_id:
            try:
                task_progress = {
                    "status": "completed" if total_score >= 5.0 else "in_progress",
                    "score": total_score,
                    "passed": total_score >= 5.0,
                    "quiz_id": quiz_id,
                    "correct_count": correct_count,
                    "total_questions": total_questions,
                    "path_id": req_path_id,
                    "telemetry": diagnostic_metadata.get("telemetry", {}),
                    "mentor_evaluation": diagnostic_metadata.get("mentor_speech", {}),
                    "completed_at": datetime.now().isoformat()
                }
                cursor.execute("""
                    INSERT INTO user_tasks (user_id, node_id, task_type, progress_data, last_accessed)
                    VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (user_id, node_id, task_type)
                    DO UPDATE SET
                        progress_data = EXCLUDED.progress_data,
                        last_accessed = CURRENT_TIMESTAMP;
                """, (user_id, str(req_node_id), 'practice', json.dumps(task_progress)))
                diagnostic_metadata["node_id"] = req_node_id
                if req_path_id:
                    diagnostic_metadata["path_id"] = req_path_id
            except Exception as e_task:
                print(f">> [submit_quiz] Warning updating user_tasks: {e_task}")

        # Cập nhật lộ trình: CHỈ đánh dấu 'completed' khi TOÀN BỘ các node trong lộ trình đã pass
        if req_path_id and total_score >= 5.0:
            try:
                cursor.execute("SELECT path_nodes FROM user_learning_paths WHERE user_id = %s AND path_id = %s", (user_id, req_path_id))
                p_info = cursor.fetchone()
                if p_info:
                    p_nodes = p_info.get("path_nodes") or []
                    if isinstance(p_nodes, str):
                        try:
                            p_nodes = json.loads(p_nodes)
                        except Exception:
                            p_nodes = []

                    cursor.execute("""
                        SELECT node_id FROM user_tasks
                        WHERE user_id = %s AND task_type = 'practice' AND (progress_data->>'passed')::boolean = true
                    """, (user_id,))
                    passed_nodes = {r['node_id'] for r in cursor.fetchall()}

                    all_passed = all(n in passed_nodes for n in p_nodes) if p_nodes else False
                    if all_passed:
                        cursor.execute("""
                            UPDATE user_learning_paths
                            SET status = 'completed'
                            WHERE user_id = %s AND path_id = %s
                        """, (user_id, req_path_id))
                        print(f">> [submit_quiz] Path {req_path_id} marked COMPLETED: All nodes passed.")
            except Exception as e_path:
                print(f">> [submit_quiz] Warning updating path completion: {e_path}")

        conn.commit()

        # 9. Khởi chạy Background Thread sinh phản hồi LLM ngầm không chặn luồng chính
        threading.Thread(
            target=_async_mentor_llm_worker,
            args=(quiz_id, user_id, user_name, diag_result, total_score, quiz_title, attempt_number, enriched_items, diagnostic_metadata),
            daemon=True
        ).start()

        return jsonify({
            "success": True, 
            "total_score": total_score, 
            "correct_count": correct_count, 
            "total_questions": total_questions, 
            "results": results,
            "metadata": diagnostic_metadata,
            "diagnosis": {
                "mentor_feedback": mentor_res.get("mentor_speech") or mentor_res.get("message", ""),
                "mentor_emotion": mentor_res.get("emotion_state", "ANALYTICAL_NEUTRAL"),
                "mentor_avatar_mood": mentor_res.get("avatar_mood", "thoughtful"),
                "summary_reason": mentor_res.get("summary_reason", ""),
                "suggested_action": mentor_res.get("suggested_action", ""),
                "mentor_source": mentor_res.get("source")
            }
        }), 200
        
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): release_db_connection(conn)

@course_bp.route('/api/quiz/<int:quiz_id>/metadata', methods=['GET'])
@token_required
def get_quiz_metadata(user_id, quiz_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT metadata FROM quizzes WHERE id = %s AND user_id = %s", (quiz_id, user_id))
        row = cursor.fetchone()
        if not row or not row.get("metadata"):
            return jsonify({"success": False, "message": "Metadata not found"}), 404
        
        meta = row["metadata"]
        if isinstance(meta, str):
            meta = json.loads(meta)
        return jsonify({"success": True, "metadata": meta}), 200
    except Exception as e:
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



