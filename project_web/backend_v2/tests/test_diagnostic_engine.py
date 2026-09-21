import unittest
import sys
import os
from dotenv import load_dotenv

load_dotenv('d:/Programming_language/project_web/backend_v2/.env')
sys.path.append('d:/Programming_language/project_web/backend_v2')

from vectoria_api.core.diagnostic_engine import (
    calculate_bkt_update,
    calculate_person_fit_lz,
    calculate_rte,
    classify_edge_cases,
    get_neo4j_prerequisites
)

class TestDiagnosticEngine(unittest.TestCase):

    def test_bkt_update_logic(self):
        # Đúng: Xác suất hiểu bài phải tăng
        p_prev = 0.50
        p_next_corr = calculate_bkt_update(p_prev, is_correct=True)
        self.assertGreater(p_next_corr, p_prev)
        self.assertTrue(0.70 <= p_next_corr <= 0.85)

        # Sai: Xác suất hiểu bài phải giảm
        p_next_wrong = calculate_bkt_update(p_prev, is_correct=False)
        self.assertLess(p_next_wrong, p_prev)
        self.assertTrue(0.10 <= p_next_wrong <= 0.30)

    def test_person_fit_lz_guttman_violation(self):
        # 1. Mẫu làm bài bình thường: Đúng câu dễ (b=-1.5), đúng câu vừa (b=0.0), sai câu khó (b=1.5)
        normal_responses = [
            {"is_correct": True, "difficulty_index": -1.5, "discrimination_index": 1.0},
            {"is_correct": True, "difficulty_index": 0.0, "discrimination_index": 1.0},
            {"is_correct": False, "difficulty_index": 1.5, "discrimination_index": 1.0},
        ]
        lz_normal, _, _ = calculate_person_fit_lz(normal_responses, theta=0.0)

        # 2. Mẫu làm bài bất thường (Vi phạm Guttman): Sai câu cực dễ (b=-1.8), đúng câu cực khó (b=1.8)
        abnormal_responses = [
            {"is_correct": False, "difficulty_index": -1.8, "discrimination_index": 1.2},
            {"is_correct": False, "difficulty_index": -1.2, "discrimination_index": 1.2},
            {"is_correct": True, "difficulty_index": 1.8, "discrimination_index": 1.2},
        ]
        lz_abnormal, _, _ = calculate_person_fit_lz(abnormal_responses, theta=0.0)

        self.assertGreater(lz_normal, lz_abnormal)
        self.assertLess(lz_abnormal, -1.5)

    def test_rte_rapid_guessing(self):
        responses = [
            {"time_spent_seconds": 2, "expected_time": 60},  # < 6s -> rapid guess
            {"time_spent_seconds": 45, "expected_time": 60}, # >= 6s -> engaged
        ]
        rte, enriched = calculate_rte(responses)
        self.assertEqual(rte, 0.5)
        self.assertTrue(enriched[0]["is_rapid_guess"])
        self.assertFalse(enriched[1]["is_rapid_guess"])

    def test_edge_case_student_an_procedural_trap(self):
        # Sinh viên An: Làm đúng câu tính toán máy móc, làm sai câu bản chất định lý
        items = [
            {"question_id": 1, "is_correct": True, "tags": ["procedural", "matrix"], "time_spent_seconds": 30},
            {"question_id": 2, "is_correct": True, "tags": ["procedural", "matrix"], "time_spent_seconds": 40},
            {"question_id": 3, "is_correct": False, "tags": ["conceptual", "matrix"], "time_spent_seconds": 15, "distractor_type": "CONCEPTUAL_FALLACY"},
            {"question_id": 4, "is_correct": False, "tags": ["conceptual", "matrix"], "time_spent_seconds": 20, "distractor_type": "CONCEPTUAL_FALLACY"},
        ]
        res = classify_edge_cases(items, l_z=0.1, overall_rte=1.0, user_p_l_map={"matrix": 0.6})
        codes = [c["code"] for c in res["detected_cases"]]
        self.assertIn("EC-2_PROCEDURAL_TRAP", codes)

    def test_edge_case_student_binh_lucky_guess(self):
        # Sinh viên Bình: Sai câu dễ, đúng câu khó trong 3 giây
        items = [
            {"question_id": 10, "is_correct": False, "difficulty_level": "EASY", "time_spent_seconds": 35, "tags": ["matrix"]},
            {"question_id": 11, "is_correct": True, "difficulty_level": "HARD", "time_spent_seconds": 3, "is_rapid_guess": True, "tags": ["matrix"]},
        ]
        res = classify_edge_cases(items, l_z=-2.1, overall_rte=0.5, user_p_l_map={"matrix": 0.4})
        codes = [c["code"] for c in res["detected_cases"]]
        self.assertIn("EC-1_LUCKY_GUESS", codes)
        self.assertEqual(res["item_diagnoses"][11], "SUSPECTED_LUCKY")

    def test_edge_case_student_chi_overthinking(self):
        # Sinh viên Chi: Năng lực cao (BKT=0.9), ngẫm nghĩ 140s, rơi vào bẫy điều kiện biên
        items = [
            {"question_id": 20, "is_correct": False, "time_spent_seconds": 140, "distractor_type": "BOUNDARY_TRAP", "tags": ["matrix"]},
        ]
        res = classify_edge_cases(items, l_z=-0.5, overall_rte=1.0, user_p_l_map={"matrix": 0.90})
        codes = [c["code"] for c in res["detected_cases"]]
        self.assertIn("EC-3_OVERTHINKING", codes)
        self.assertEqual(res["item_diagnoses"][20], "OVERTHINKING_SLIP")

    def test_neo4j_prerequisite_traversal(self):
        # Test truy vấn Neo4j thực tế
        prereqs = get_neo4j_prerequisites("l2")
        self.assertIsInstance(prereqs, list)

if __name__ == "__main__":
    unittest.main()
