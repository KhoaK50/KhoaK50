import unittest
import sys
import os
from dotenv import load_dotenv

load_dotenv('d:/Programming_language/project_web/backend_v2/.env')
sys.path.append('d:/Programming_language/project_web/backend_v2')

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

from vectoria_api.core.mentor_service import MentorService

class TestMentorService(unittest.TestCase):

    def test_fallback_templates_direct(self):
        # 1. Test Fallback for Procedural Trap
        cases_proc = [{"code": "EC-2_PROCEDURAL_TRAP", "title": "Học vẹt thao tác", "reason": "Thao tác 100%, bản chất 0%"}]
        msg_proc = MentorService._generate_fallback_template(cases_proc, total_score=5.0, topic_title="Định thức ma trận", attempt_number=1, is_false_mastery=False)
        self.assertIn("bản chất", msg_proc)
        self.assertNotIn("—", msg_proc)

        # 2. Test Fallback for False Mastery
        cases_false = [{"code": "EC-7_FALSE_MASTERY", "title": "Ảo tưởng thành thạo", "reason": "Nghi ngờ ăn may"}]
        msg_false = MentorService._generate_fallback_template(cases_false, total_score=8.5, topic_title="Ma trận nghịch đảo", attempt_number=1, is_false_mastery=True)
        self.assertIn("kiểm chứng", msg_false)
        self.assertNotIn("—", msg_false)

        # 3. Test Fallback for Careless Slip
        cases_slip = [{"code": "EC-8_CARELESS_SLIP", "title": "Bất cẩn số học", "reason": "Nhầm dấu"}]
        msg_slip = MentorService._generate_fallback_template(cases_slip, total_score=7.0, topic_title="Phép nhân ma trận", attempt_number=1, is_false_mastery=False)
        self.assertIn("nhầm dấu", msg_slip)
        self.assertNotIn("—", msg_slip)

    def test_generate_feedback_integration(self):
        # Kiểm tra hàm generate_feedback trả về cấu trúc chuẩn, không văng lỗi, không có em-dash
        diag = {
            "detected_cases": [{"code": "EC-2_PROCEDURAL_TRAP", "title": "Học vẹt thao tác", "reason": "Thao tác 100%, bản chất 0%"}],
            "l_z": 0.0,
            "overall_rte": 1.0,
            "is_false_mastery": False
        }
        res = MentorService.generate_feedback(diag, total_score=5.0, topic_title="Định thức ma trận")
        self.assertIn("source", res)
        self.assertIn(res["source"], ["LLM_GEMINI", "DETERMINISTIC_FALLBACK"])
        self.assertIn("message", res)
        self.assertNotIn("—", res["message"], "Zero em-dash constraint violated!")
        self.assertTrue(len(res["message"]) > 15)

if __name__ == "__main__":
    unittest.main()
