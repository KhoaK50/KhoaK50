import unittest
import sys
import os
import json
import jwt
from dotenv import load_dotenv

load_dotenv('d:/Programming_language/project_web/backend_v2/.env')
sys.path.append('d:/Programming_language/project_web/backend_v2')

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

from app import app
from vectoria_api.config import JWT_SECRET_KEY
from vectoria_api.database import get_db_connection, release_db_connection

class TestIntegrationQuizSubmit(unittest.TestCase):

    def setUp(self):
        self.client = app.test_client()
        self.user_id = 57
        
        # Lấy token_version chuẩn của user 57 trong DB
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT token_version FROM users WHERE id = %s;", (self.user_id,))
        row = c.fetchone()
        token_ver = row[0] if row and row[0] is not None else 1
        release_db_connection(conn)
        
        # Sinh token JWT hợp lệ kèm token_version
        self.token = jwt.encode({"user_id": self.user_id, "token_version": token_ver}, JWT_SECRET_KEY, algorithm="HS256")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def test_full_quiz_submission_and_diagnosis(self):
        conn = get_db_connection()
        c = conn.cursor()
        
        # 1. Tạo 1 đề thi thử nghiệm gồm 5 câu hỏi (thỏa mãn constraint question_count IN (5,10,15,20,25))
        c.execute("SELECT id FROM questions LIMIT 5;")
        q_rows = c.fetchall()
        if len(q_rows) < 5:
            self.skipTest("Cần ít nhất 5 câu hỏi trong database để test.")
            
        q_ids = [r[0] for r in q_rows]
        
        c.execute("""
            INSERT INTO quizzes (user_id, title, status, question_count, selected_topics, time_limit)
            VALUES (%s, 'Bài Test Chẩn Đoán Tích Hợp', 'IN_PROGRESS', 5, ARRAY['t1'], 15)
            RETURNING id;
        """, (self.user_id,))
        test_quiz_id = c.fetchone()[0]
        
        # Thêm 5 câu hỏi vào quizz_questions
        for idx, qid in enumerate(q_ids, 1):
            c.execute("""
                INSERT INTO quizz_questions (quiz_id, question_id, order_index, status)
                VALUES (%s, %s, %s, 'UNSEEN')
                ON CONFLICT (quiz_id, question_id) DO NOTHING;
            """, (test_quiz_id, qid, idx))
        conn.commit()
        
        try:
            # 2. Gửi request nộp bài kèm telemetry vi hành vi
            # Câu 1: Bình thường 30s
            # Câu 2: Đoán mò siêu tốc 2s (vi phạm ngưỡng RTE)
            # Câu 3-5: Bình thường
            payload = {
                "answers": [
                    {"question_id": q_ids[0], "selected_answer": "A", "time_spent_seconds": 30, "switch_count": 1},
                    {"question_id": q_ids[1], "selected_answer": "B", "time_spent_seconds": 2, "switch_count": 0},
                    {"question_id": q_ids[2], "selected_answer": "C", "time_spent_seconds": 45, "switch_count": 2},
                    {"question_id": q_ids[3], "selected_answer": "D", "time_spent_seconds": 50, "switch_count": 0},
                    {"question_id": q_ids[4], "selected_answer": "A", "time_spent_seconds": 40, "switch_count": 1}
                ]
            }
            
            response = self.client.post(
                f"/api/quiz/{test_quiz_id}/submit",
                data=json.dumps(payload),
                headers=self.headers
            )
            
            self.assertEqual(response.status_code, 200, f"Submit failed: {response.data}")
            data = json.loads(response.data)
            
            # 3. Xác thực cấu trúc phản hồi
            self.assertTrue(data.get("success"))
            self.assertIn("total_score", data)
            self.assertIn("diagnosis", data)
            
            diag = data["diagnosis"]
            self.assertIn("l_z", diag)
            self.assertIn("overall_rte", diag)
            self.assertIn("detected_cases", diag)
            self.assertIn("mentor_feedback", diag)
            self.assertNotIn("—", diag["mentor_feedback"], "Phản hồi của Mentor không được chứa dấu gạch ngang dài!")
            
            print(f">> [Integration Test Passed] Score: {data['total_score']}/10, l_z: {diag['l_z']}, RTE: {diag['overall_rte']}")
            print(f">> [Mentor Output]: {diag['mentor_feedback']}")
            
            # 4. Xác thực dữ liệu được ghi vào PostgreSQL thực tế
            c.execute("""
                SELECT question_id, time_spent_seconds, switch_count, diagnosis_flag 
                FROM quizz_questions 
                WHERE quiz_id = %s ORDER BY order_index;
            """, (test_quiz_id,))
            qq_rows = c.fetchall()
            
            self.assertEqual(len(qq_rows), 5)
            self.assertEqual(qq_rows[0][1], 30) # time_spent_seconds q1
            self.assertEqual(qq_rows[0][2], 1)  # switch_count q1
            self.assertEqual(qq_rows[1][1], 2)  # time_spent_seconds q2
            self.assertEqual(qq_rows[1][2], 0)  # switch_count q2
            
        finally:
            # Dọn dẹp dữ liệu test
            c.execute("DELETE FROM quizz_questions WHERE quiz_id = %s;", (test_quiz_id,))
            c.execute("DELETE FROM quizzes WHERE id = %s;", (test_quiz_id,))
            conn.commit()
            release_db_connection(conn)

if __name__ == "__main__":
    unittest.main()
