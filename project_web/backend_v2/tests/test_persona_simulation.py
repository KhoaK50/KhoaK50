import unittest
import sys
import os
from dotenv import load_dotenv

load_dotenv('d:/Programming_language/project_web/backend_v2/.env')
sys.path.append('d:/Programming_language/project_web/backend_v2')

from vectoria_api.core.diagnostic_engine import calculate_rte, classify_edge_cases
from vectoria_api.core.mentor_service import MentorService

class TestPersonaSimulation(unittest.TestCase):
    def test_persona_1_the_spammer_all_rushed(self):
        items = [
            {'question_id': 1, 'is_correct': False, 'time_spent_seconds': 1.5, 'switch_count': 0, 'expected_time': 60},
            {'question_id': 2, 'is_correct': False, 'time_spent_seconds': 1.2, 'switch_count': 0, 'expected_time': 60},
            {'question_id': 3, 'is_correct': False, 'time_spent_seconds': 1.8, 'switch_count': 0, 'expected_time': 60},
            {'question_id': 4, 'is_correct': False, 'time_spent_seconds': 1.4, 'switch_count': 0, 'expected_time': 60},
            {'question_id': 5, 'is_correct': False, 'time_spent_seconds': 1.1, 'switch_count': 0, 'expected_time': 60},
        ]
        rte, enriched = calculate_rte(items)
        diag = classify_edge_cases(enriched, l_z=0.0, overall_rte=rte, user_p_l_map={})
        codes = [c['code'] for c in diag['detected_cases']]
        self.assertIn('EC-4A_GLOBAL_SPAM_GUESSING', codes)
        self.assertNotIn('EC-4B_END_OF_TEST_FATIGUE', codes)
        feedback = MentorService.generate_immediate_feedback(diag, total_score=0.0, user_name='Khoa')
        speech = feedback['mentor_speech']
        self.assertIn('tất cả các câu hỏi', speech)
        self.assertNotIn('ở các câu cuối', speech)

    def test_persona_2_the_fatigued_tail_rush(self):
        items = [
            {'question_id': 1, 'is_correct': True, 'time_spent_seconds': 45, 'switch_count': 0, 'expected_time': 60},
            {'question_id': 2, 'is_correct': True, 'time_spent_seconds': 50, 'switch_count': 1, 'expected_time': 60},
            {'question_id': 3, 'is_correct': False, 'time_spent_seconds': 60, 'switch_count': 0, 'expected_time': 60},
            {'question_id': 4, 'is_correct': False, 'time_spent_seconds': 2.0, 'switch_count': 0, 'expected_time': 60},
            {'question_id': 5, 'is_correct': False, 'time_spent_seconds': 1.5, 'switch_count': 0, 'expected_time': 60},
        ]
        rte, enriched = calculate_rte(items)
        diag = classify_edge_cases(enriched, l_z=0.0, overall_rte=rte, user_p_l_map={})
        codes = [c['code'] for c in diag['detected_cases']]
        self.assertIn('EC-4B_END_OF_TEST_FATIGUE', codes)
        self.assertNotIn('EC-4A_GLOBAL_SPAM_GUESSING', codes)
        feedback = MentorService.generate_immediate_feedback(diag, total_score=4.0, user_name='Khoa')
        speech = feedback['mentor_speech']
        self.assertIn('những câu cuối', speech)

    def test_persona_3_the_lucky_guesser_speed_10_points(self):
        items = [
            {'question_id': 1, 'is_correct': True, 'time_spent_seconds': 2, 'expected_time': 60},
            {'question_id': 2, 'is_correct': True, 'time_spent_seconds': 2, 'expected_time': 60},
            {'question_id': 3, 'is_correct': True, 'time_spent_seconds': 2, 'expected_time': 60},
            {'question_id': 4, 'is_correct': True, 'time_spent_seconds': 2, 'expected_time': 60},
            {'question_id': 5, 'is_correct': True, 'time_spent_seconds': 2, 'expected_time': 60},
        ]
        rte, enriched = calculate_rte(items)
        diag = classify_edge_cases(enriched, l_z=-2.5, overall_rte=rte, user_p_l_map={})
        codes = [c['code'] for c in diag['detected_cases']]
        self.assertIn('EC-7_FALSE_MASTERY', codes)
        feedback = MentorService.generate_immediate_feedback(diag, total_score=10.0, user_name='Khoa')
        self.assertEqual(feedback['avatar_mood'], 'puzzled')
        self.assertEqual(feedback['emotion_state'], 'PUZZLED_SPEED')

    def test_persona_4_the_overthinker_diligent_struggle(self):
        items = [
            {'question_id': 1, 'is_correct': False, 'time_spent_seconds': 90, 'switch_count': 4, 'expected_time': 60},
            {'question_id': 2, 'is_correct': False, 'time_spent_seconds': 95, 'switch_count': 3, 'expected_time': 60},
            {'question_id': 3, 'is_correct': False, 'time_spent_seconds': 85, 'switch_count': 4, 'expected_time': 60},
            {'question_id': 4, 'is_correct': True, 'time_spent_seconds': 80, 'switch_count': 1, 'expected_time': 60},
            {'question_id': 5, 'is_correct': False, 'time_spent_seconds': 90, 'switch_count': 3, 'expected_time': 60},
        ]
        rte, enriched = calculate_rte(items)
        diag = classify_edge_cases(enriched, l_z=0.2, overall_rte=rte, user_p_l_map={})
        codes = [c['code'] for c in diag['detected_cases']]
        self.assertIn('EC-3B_DILIGENT_STRUGGLE', codes)
        feedback = MentorService.generate_immediate_feedback(diag, total_score=2.0, user_name='Khoa')
        self.assertEqual(feedback['avatar_mood'], 'empathetic')

    def test_persona_5_careless_slip(self):
        items = [
            {'question_id': 1, 'is_correct': True, 'time_spent_seconds': 45, 'expected_time': 60, 'tags': ['matrix']},
            {'question_id': 2, 'is_correct': True, 'time_spent_seconds': 40, 'expected_time': 60, 'tags': ['matrix']},
            {'question_id': 3, 'is_correct': True, 'time_spent_seconds': 50, 'expected_time': 60, 'tags': ['matrix']},
            {'question_id': 4, 'is_correct': False, 'time_spent_seconds': 55, 'distractor_type': 'ARITHMETIC_SLIP', 'tags': ['matrix'], 'expected_time': 60},
            {'question_id': 5, 'is_correct': True, 'time_spent_seconds': 45, 'expected_time': 60, 'tags': ['matrix']},
        ]
        rte, enriched = calculate_rte(items)
        diag = classify_edge_cases(enriched, l_z=0.0, overall_rte=rte, user_p_l_map={'matrix': 0.85})
        codes = [c['code'] for c in diag['detected_cases']]
        self.assertIn('EC-8_CARELESS_SLIP', codes)
        feedback = MentorService.generate_immediate_feedback(diag, total_score=8.0, user_name='Khoa')
        self.assertIn('dấu số học', feedback['mentor_speech'])

    def test_persona_6_authentic_mastery(self):
        items = [
            {'question_id': 1, 'is_correct': True, 'time_spent_seconds': 45, 'expected_time': 60},
            {'question_id': 2, 'is_correct': True, 'time_spent_seconds': 40, 'expected_time': 60},
            {'question_id': 3, 'is_correct': True, 'time_spent_seconds': 50, 'expected_time': 60},
            {'question_id': 4, 'is_correct': True, 'time_spent_seconds': 55, 'expected_time': 60},
            {'question_id': 5, 'is_correct': True, 'time_spent_seconds': 45, 'expected_time': 60},
        ]
        rte, enriched = calculate_rte(items)
        diag = classify_edge_cases(enriched, l_z=0.5, overall_rte=rte, user_p_l_map={})
        feedback = MentorService.generate_immediate_feedback(diag, total_score=10.0, user_name='Khoa')
        self.assertEqual(feedback['emotion_state'], 'IMPRESSED_PROUD')
        self.assertEqual(feedback['avatar_mood'], 'proud')

if __name__ == '__main__':
    unittest.main()
