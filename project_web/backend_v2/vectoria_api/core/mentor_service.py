import os
import json
import re
from typing import Any, Dict, List, Optional
from vectoria_api.config import GEMINI_API_KEY

try:
    from google import genai
    from google.genai import types
    _HAS_GENAI = True
except ImportError:
    _HAS_GENAI = False


class MentorService:
    """
    Dịch vụ Sư phạm LLM Ổn định (Stabilized Pedagogical Mentor).
    Tiếp nhận dữ liệu chẩn đoán toán học đã tính sẵn và giao tiếp với học viên.
    Bảo đảm Zero-Hallucination, Zero-Slop, Zero Internal Variables và có Fallback Templates dự phòng 100%.
    """

    SYSTEM_INSTRUCTION = """Bạn là Nori - Người bạn Đồng hành Trí tuệ của Hệ thống Giáo dục Vectoria.
    Bạn là một người bạn học cùng bàn: thông minh, sâu sắc, nhưng cực kỳ ngố ngố, nũng nịu, hồn nhiên, ấm áp và biết trêu nhẹ đáng yêu.
    Bạn TUYỆT ĐỐI KHÔNG PHẢI là giáo viên, gia sư nghiêm khắc hay giám thị. Tuyệt đối KHÔNG xưng 'thầy - em', 'cô - em'.
    Bạn xưng hô tự nhiên như bạn thân cùng bàn: 'Khoa ơi,', 'Bạn ơi,', xưng 'tớ - bạn' hoặc 'mình - bạn'.

    NGUYÊN TẮC VĂN PHONG VÀ CÁ TÍNH (BẮT BUỘC TUÂN THỦ):
    1. VÍ VON ĐỜI THỰC GẦN GŨI SINH VIÊN (ANTI-CRINGE):
       - TUYỆT ĐỐI CẤM gượng ép chơi chữ hay nhồi nhét thuật ngữ toán học gượng gạo (CẤM: 'niềm tin khả nghịch', 'không gian co cụm sự tự tin', 'ma trận tình bạn').
       - Hãy dùng các hình ảnh đời thường mà sinh viên đại học ai cũng gặp: ly trà sữa phân vân đường đá, điện thoại tụt pin vì cày lâu, trượt vỏ chuối vì quên dấu trừ, bóc tách bài toán như xếp hình lego, nín thở chờ đáp án, cú đêm 2h sáng giường nệm gọi tên.
       - Trêu nhẹ nhưng duyên và ấm lòng: 'Ủa bạn ơi, nãy là bạn đọc đề hay đề đọc bạn vậy nè?', 'Hú hồn chim én, nãy tớ nín thở xem bạn bấm luôn á!', 'Ú òa! Bất ngờ chưa!'.
    2. TUYỆT ĐỐI CẤM THUẬT NGỮ NỘI BỘ VÀ TỪ SÁO RỖNG:
       - Cấm các biến nội bộ: 'RTE', 'l_z', 'BKT', 'theta', 'EC-1', 'flag', 'ngưỡng đọc hiểu', 'điều kiện biên'...
       - Cấm sáo ngữ rẻ tiền: 'nâng tầm', 'kỷ nguyên mới', 'thay đổi cuộc chơi', 'bộ não sắc sảo', 'êm ru', 'lên đỉnh'.
    3. ZERO EM-DASH: Tuyệt đối không dùng dấu gạch ngang dài (em-dash), chỉ dùng dấu gạch nối ngắn (-) hoặc dấu phẩy.
    4. ĐỘ DÀI: 3 đến 4 câu tiếng Việt tự nhiên, có hồn, sinh động.
    5. TRẢ VỀ JSON VỚI DANH SÁCH BIỂU CẢM CHUYỂN DỊCH THEO TỪNG CÂU:
    {
      "mentor_speech": "Lời thoại bạn cùng bàn sinh động, gần gũi (3-4 câu)...",
      "emotion_state": "PUZZLED_SPEED" | "SOCRATIC_STERN" | "IMPRESSED_PROUD" | "EMPATHETIC_ENCOURAGING" | "ANALYTICAL_NEUTRAL",
      "avatar_mood": "shocked" | "wink" | "proud" | "puzzled" | "stern" | "empathetic" | "relieved" | "thoughtful",
      "emotion_progression": ["puzzled", "wink", "empathetic"],
      "summary_reason": "1 câu ngắn gọn trúng điểm mấu chốt",
      "suggested_action": "Hành động gợi ý cụ thể, gần gũi"
    }
    """

    @classmethod
    def _generate_fallback_structured(
        cls,
        detected_cases: List[Dict[str, Any]],
        total_score: float,
        topic_title: str,
        attempt_number: int,
        is_false_mastery: bool,
        user_name: str = ""
    ) -> Dict[str, Any]:
        salutation = f"{user_name} ơi, " if user_name else "Bạn ơi, "
        case_codes = [c.get("code") for c in detected_cases]

        if is_false_mastery or "EC-7_FALSE_MASTERY" in case_codes or "EC-1_LUCKY_GUESS" in case_codes:
            return {
                "mentor_speech": (
                    f"{salutation}ú òa! Điểm {total_score}/10 ở bài {topic_title} nhìn loáng mắt tưởng cao thủ ẩn danh ghé thăm! "
                    "Cơ mà mỗi câu bạn bấm có vài giây làm tớ ngồi cạnh dụi mắt mấy lần luôn. "
                    "Bạn có bí kíp tính nhẩm thần sầu nào thì bật mí cho tớ học lỏm với nha, hay là chọn đại mà trúng phóc vậy nè? "
                    "Mấy bài sau cạm bẫy giăng như mạng nhện, lướt vội là dễ trượt vỏ chuối lắm á!"
                ),
                "emotion_state": "PUZZLED_SPEED",
                "avatar_mood": "puzzled",
                "emotion_progression": ["shocked", "wink", "puzzled"],
                "summary_reason": "Tốc độ phản hồi cực nhanh đạt điểm tối đa, cần đối chiếu bí kíp tư duy.",
                "suggested_action": "Bật mí bí kíp tư duy bên dưới để Nori đồng hành cùng bạn nha."
            }

        if "EC-4A_GLOBAL_SPAM_GUESSING" in case_codes:
            return {
                "mentor_speech": (
                    f"{salutation}tớ thấy bạn chọn phương án ở tất cả các câu hỏi của bài {topic_title} nhanh như gió thoảng luôn, chưa đầy 2 giây một câu! "
                    "Ủa nãy là bạn đọc đề hay đề đọc bạn vậy nè? Toán chứ đâu phải bốc thăm trúng thưởng đâu bạn ơi. "
                    "Hít một hơi thật sâu, uống ngụm nước mát rồi tụi mình cùng đọc kỹ đề làm lại nhen, tớ ngồi đây đợi bạn mà!"
                ),
                "emotion_state": "SOCRATIC_STERN",
                "avatar_mood": "shocked",
                "emotion_progression": ["shocked", "wink", "stern", "empathetic"],
                "summary_reason": "Chọn phương án quá nhanh ở tất cả các câu hỏi.",
                "suggested_action": "Thong thả uống ngụm nước, đọc kỹ đề rồi làm lại cùng Nori nhé."
            }

        if "EC-4B_END_OF_TEST_FATIGUE" in case_codes:
            return {
                "mentor_speech": (
                    f"{salutation}mấy câu đầu bạn giải ngọt lịm như trà sữa full topping vậy, mà tự dưng đến những câu cuối tay bấm vèo vèo như pin điện thoại tụt còn 1% á! "
                    "Chắc não bắt đầu kêu đòi nghỉ xả hơi rồi đúng hông nè? "
                    "Thôi đứng dậy vươn vai, rửa mặt cho tỉnh táo rồi tụi mình chiến tiếp, đừng để mấy câu cuối làm rơi rớt uổng công sức nhen!"
                ),
                "emotion_state": "SOCRATIC_STERN",
                "avatar_mood": "stern",
                "emotion_progression": ["puzzled", "stern", "empathetic"],
                "summary_reason": "Sự tập trung suy giảm ở những câu cuối bài kiểm tra.",
                "suggested_action": "Nghỉ ngơi 3 phút nạp năng lượng rồi cùng Nori làm tiếp nào."
            }

        if "EC-4_RAPID_GUESSING" in case_codes:
            return {
                "mentor_speech": (
                    f"{salutation}hú hồn chim én luôn, có mấy câu đề dài ngoằng mà bạn lướt qua nhanh như cơn gió vậy á! "
                    "Mấy câu đó người ra đề gài bẫy ngọt ngào lắm, lơ là một nhịp là chọn trúng đáp án mồi liền. "
                    "Chậm lại một nhịp nha bạn ơi, đọc kỹ từng giả thiết như bóc vỏ kẹo thì mới không bị hớ nè!"
                ),
                "emotion_state": "SOCRATIC_STERN",
                "avatar_mood": "stern",
                "emotion_progression": ["puzzled", "stern", "empathetic"],
                "summary_reason": "Thao tác vội ở một số câu hỏi khiến bỏ sót chi tiết then chốt.",
                "suggested_action": "Đọc chậm lại một nhịp và thử lại bài kiểm tra nhé."
            }

        if "EC-3B_DILIGENT_STRUGGLE" in case_codes:
            return {
                "mentor_speech": (
                    f"{salutation}tớ thấy bạn ngồi ngẫm nghĩ rồi đổi đáp án tới lui mấy bận luôn, nhìn thương ghê á! "
                    "Tính cẩn thận này là điểm cộng siêu bự nè, nhưng đôi khi nghĩ nhiều quá lại làm mình rối tinh như cuộn chỉ. "
                    f"Cứ bám chắc vào định nghĩa cốt lõi của {topic_title} như công thức gốc thôi, đừng tự làm khó mình nha, bạn làm được mà!"
                ),
                "emotion_state": "EMPATHETIC_ENCOURAGING",
                "avatar_mood": "empathetic",
                "emotion_progression": ["thoughtful", "puzzled", "wink", "empathetic"],
                "summary_reason": "Cân nhắc kỹ lưỡng nhưng còn phân vân giữa các phương án lý thuyết.",
                "suggested_action": f"Xem lại định nghĩa cốt lõi của {topic_title} rồi tự tin làm lại nha."
            }

        if "EC-2_PROCEDURAL_TRAP" in case_codes:
            return {
                "mentor_speech": (
                    f"{salutation}mấy câu tính toán công thức của bài {topic_title} bạn bấm máy vèo vèo chuẩn không cần chỉnh luôn, tớ vỗ tay rào rào nè! "
                    "Cơ mà hễ đụng tới bản chất lý thuyết là bạn hơi khựng lại xíu ha. "
                    "Toán giống như lắp lego vậy á, ráp trơn tru nhưng phải hiểu khối nào chịu lực thì công trình mới vững được. "
                    "Xem lại hình minh họa một xíu là tự tin liền à!"
                ),
                "emotion_state": "ANALYTICAL_NEUTRAL",
                "avatar_mood": "thoughtful",
                "emotion_progression": ["wink", "thoughtful", "empathetic"],
                "summary_reason": "Tính toán rất cừ nhưng cần củng cố thêm bản chất định lý.",
                "suggested_action": f"Xem lại ý nghĩa hình học của {topic_title} cùng Nori nhé."
            }

        if "EC-8_CARELESS_SLIP" in case_codes:
            return {
                "mentor_speech": (
                    f"{salutation}trời ơi tiếc hùi hụi luôn á! "
                    "Bạn lập luận đâu ra đó chắc nịch từ đầu tới đuôi, mà khúc cuối trượt vỏ chuối nhầm đúng dấu số học ở bước cộng trừ. "
                    "Coi như bài học xương máu nè, lần sau trước khi bấm nộp dành 5 giây ngó lại dấu số học là ẵm trọn điểm mười trong tay rồi!"
                ),
                "emotion_state": "EMPATHETIC_ENCOURAGING",
                "avatar_mood": "empathetic",
                "emotion_progression": ["puzzled", "stern", "empathetic"],
                "summary_reason": "Nắm chắc phương pháp, chỉ sơ suất ở bước tính toán số học.",
                "suggested_action": "Rèn luyện thêm thói quen kiểm tra dấu số học trước khi hoàn thành."
            }

        if attempt_number >= 2 and total_score >= 8.0:
            return {
                "mentor_speech": (
                    f"{salutation}xịn đét luôn bạn ơi! Sau {attempt_number} lần kiên trì cày cuốc thì điểm {total_score}/10 này xứng đáng 100 điểm tinh thần luôn á! "
                    "Tớ ngồi canh mà thấy bạn sửa từng lỗi một, ngầu thực sự. "
                    "Cứ giữ vững tinh thần chiến binh này thì bài nào tụi mình cũng cân đẹp hết trơn!"
                ),
                "emotion_state": "IMPRESSED_PROUD",
                "avatar_mood": "proud",
                "emotion_progression": ["proud", "wink", "proud"],
                "summary_reason": f"Kiên trì rèn luyện và tiến bộ rõ rệt sau {attempt_number} lần làm bài.",
                "suggested_action": "Tiếp tục tiến vào bài học tiếp theo trên lộ trình nào."
            }

        if total_score >= 8.0:
            return {
                "mentor_speech": (
                    f"{salutation}đỉnh của chóp luôn nha! Bạn làm bài {topic_title} nhẹ nhàng như ăn kẹo, điểm {total_score}/10 sáng rực rỡ luôn nè! "
                    "Từng bước phân tích đều chắc nịch, nhịp độ vừa vặn không chê vào đâu được. "
                    "Phong độ đang lên cao chót vót, tụi mình thừa thắng xông lên bài tiếp theo luôn cho nóng hén!"
                ),
                "emotion_state": "IMPRESSED_PROUD",
                "avatar_mood": "proud",
                "emotion_progression": ["proud", "wink", "proud"],
                "summary_reason": "Nắm vững trọn vẹn kiến thức với nhịp độ tư duy chuẩn mực.",
                "suggested_action": "Tiến thẳng vào bài học tiếp theo trên lộ trình nào."
            }
        elif total_score >= 5.0:
            return {
                "mentor_speech": (
                    f"{salutation}nền tảng của bạn ở bài {topic_title} khá ổn áp rồi nè, chỉ là gặp mấy câu gài bẫy hơi lúng túng xíu thôi. "
                    "Không sao hết á, ai mới học cũng phải vấp vài chỗ mới vỡ lẽ ra được. "
                    "Tụi mình nghía lại phần lý thuyết một tí rồi làm vài câu tương tự là phản xạ bén ngót ngay thôi!"
                ),
                "emotion_state": "ANALYTICAL_NEUTRAL",
                "avatar_mood": "thoughtful",
                "emotion_progression": ["wink", "thoughtful", "empathetic"],
                "summary_reason": "Nắm chắc kiến thức nền tảng, cần phân tích kỹ hơn ở các câu hỏi nâng cao.",
                "suggested_action": f"Làm thêm vài câu tự luyện của {topic_title} cùng Nori nha."
            }
        else:
            return {
                "mentor_speech": (
                    f"{salutation}đừng buồn nha, bài {topic_title} này công nhận hơi hóc búa thiệt, tớ nhìn đề lúc đầu cũng thấy hoa cả mắt á! "
                    "Coi như lần này mình đi thám thính địa hình trước đi. "
                    "Giờ nghỉ ngơi một tí, uống miếng nước rồi tớ với bạn cùng mổ xẻ lại từng dạng bài từ từ, không có gì phải xoắn hết nè!"
                ),
                "emotion_state": "EMPATHETIC_ENCOURAGING",
                "avatar_mood": "empathetic",
                "emotion_progression": ["empathetic", "thoughtful", "empathetic"],
                "summary_reason": "Chưa nắm chắc kiến thức cơ sở, cần rà soát lại bài giảng.",
                "suggested_action": f"Đọc lại lý thuyết và các ví dụ mẫu của {topic_title} rồi thử lại nha."
            }

    @classmethod
    def _generate_fallback_template(
        cls,
        detected_cases: List[Dict[str, Any]],
        total_score: float,
        topic_title: str,
        attempt_number: int,
        is_false_mastery: bool,
        user_name: str = ""
    ) -> str:
        """Khuôn mẫu dự phòng tương thích ngược dạng chuỗi."""
        res = cls._generate_fallback_structured(
            detected_cases=detected_cases,
            total_score=total_score,
            topic_title=topic_title,
            attempt_number=attempt_number,
            is_false_mastery=is_false_mastery,
            user_name=user_name
        )
        return res["mentor_speech"]

    @classmethod
    def generate_immediate_feedback(
        cls,
        diagnosis_result: Dict[str, Any],
        total_score: float,
        topic_title: str = "Đại số Tuyến tính",
        attempt_number: int = 1,
        user_name: str = ""
    ) -> Dict[str, Any]:
        """
        Sinh phản hồi tức thì siêu tốc (< 5ms) bằng Fallback Engine để trả về ngay cho người học.
        """
        detected_cases = diagnosis_result.get("detected_cases", [])
        is_false_mastery = diagnosis_result.get("is_false_mastery", False)
        
        fb = cls._generate_fallback_structured(
            detected_cases=detected_cases,
            total_score=total_score,
            topic_title=topic_title,
            attempt_number=attempt_number,
            is_false_mastery=is_false_mastery,
            user_name=user_name
        )
        fb["source"] = "DETERMINISTIC_FALLBACK"
        fb["message"] = fb["mentor_speech"]
        fb["detected_cases"] = detected_cases
        return fb

    @classmethod
    def generate_llm_feedback(
        cls,
        diagnosis_result: Dict[str, Any],
        total_score: float,
        topic_title: str = "Đại số Tuyến tính",
        attempt_number: int = 1,
        enriched_items: Optional[List[Dict[str, Any]]] = None,
        user_name: str = ""
    ) -> Dict[str, Any]:
        """
        Gọi Gemini LLM chạy trong background thread để phân tích sâu mà không làm nghẽn request.
        """
        detected_cases = diagnosis_result.get("detected_cases", [])
        overall_rte = diagnosis_result.get("overall_rte", 1.0)
        is_false_mastery = diagnosis_result.get("is_false_mastery", False)

        if _HAS_GENAI and GEMINI_API_KEY:
            for mod_name in ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest']:
                try:
                    structured = cls._call_gemini_mentor(
                        model_name=mod_name,
                        detected_cases=detected_cases,
                        total_score=total_score,
                        topic_title=topic_title,
                        attempt_number=attempt_number,
                        overall_rte=overall_rte,
                        is_false_mastery=is_false_mastery,
                        enriched_items=enriched_items,
                        user_name=user_name
                    )
                    if structured and structured.get("mentor_speech"):
                        structured["source"] = "LLM_GEMINI"
                        structured["message"] = structured["mentor_speech"]
                        structured["detected_cases"] = detected_cases
                        return structured
                except Exception as e:
                    print(f">> [MentorService] Model {mod_name} error: {e}. Trying next model.")

        # Nếu LLM lỗi, dùng fallback an toàn
        return cls.generate_immediate_feedback(
            diagnosis_result=diagnosis_result,
            total_score=total_score,
            topic_title=topic_title,
            attempt_number=attempt_number,
            user_name=user_name
        )

    @classmethod
    def generate_feedback(
        cls,
        diagnosis_result: Dict[str, Any],
        total_score: float,
        topic_title: str = "Đại số Tuyến tính",
        attempt_number: int = 1,
        enriched_items: Optional[List[Dict[str, Any]]] = None,
        user_name: str = ""
    ) -> Dict[str, Any]:
        """Hàm tương thích ngược."""
        return cls.generate_llm_feedback(
            diagnosis_result=diagnosis_result,
            total_score=total_score,
            topic_title=topic_title,
            attempt_number=attempt_number,
            enriched_items=enriched_items,
            user_name=user_name
        )

    @classmethod
    def _call_gemini_mentor(
        cls,
        model_name: str,
        detected_cases: List[Dict[str, Any]],
        total_score: float,
        topic_title: str,
        attempt_number: int,
        overall_rte: float,
        is_false_mastery: bool,
        enriched_items: Optional[List[Dict[str, Any]]] = None,
        user_name: str = ""
    ) -> Optional[Dict[str, Any]]:
        client = genai.Client(api_key=GEMINI_API_KEY)

        # Xây dựng mô tả sư phạm tự nhiên, tuyệt đối không lộ tên biến
        has_global_rush = any(c.get("code") == "EC-4A_GLOBAL_SPAM_GUESSING" for c in detected_cases)
        has_tail_rush = any(c.get("code") == "EC-4B_END_OF_TEST_FATIGUE" for c in detected_cases)

        if has_global_rush:
            speed_desc = "Chọn vội ở TẤT CẢ các câu hỏi từ đầu đến cuối (Global Spam Rush). Người học chọn bừa lấy lệ, không hề đọc đề bài. Hãy nhắc nhở về tác phong vội vàng ở TOÀN BỘ bài thi."
        elif has_tail_rush:
            speed_desc = "Đuối sức ở các câu cuối (Tail Rush): Các câu đầu làm cẩn thận nhưng các câu cuối chọn vội dưới ngưỡng đọc hiểu."
        elif overall_rte < 0.6:
            speed_desc = "Tốc độ làm bài cực kỳ nhanh so với độ dài đề bài (nguy cơ cao chọn đáp án cảm tính hoặc đoán mò)."
        elif overall_rte > 1.4:
            speed_desc = "Dành nhiều thời gian đọc kỹ đề và suy ngẫm cẩn trọng."
        else:
            speed_desc = "Nhịp độ làm bài ổn định, phân bổ thời gian hợp lý."

        case_descs = []
        for c in detected_cases:
            case_descs.append(f"{c.get('title', '')}: {c.get('reason', '')}")
        pedagogy_notes = "; ".join(case_descs) if case_descs else "Làm bài đều đặn, không ghi nhận bất thường về phong cách thao tác."

        # Chi tiết câu làm sai để chỉ rõ nguyên nhân
        wrong_details = []
        item_time_details = []
        if enriched_items:
            for idx, it in enumerate(enriched_items):
                t_sec = it.get("time_spent_seconds", 0)
                item_time_details.append(f"Câu {idx+1}: {t_sec}s")
                if not it.get("is_correct"):
                    tags = ", ".join(it.get("tags") or [])
                    dtype = it.get("distractor_type")
                    dtype_str = f", dạng sai sót: {dtype}" if dtype and dtype != "NONE" else ""
                    wrong_details.append(f"Câu {idx+1} (Chủ đề: {tags or topic_title}{dtype_str})")

        error_summary = "; ".join(wrong_details) if wrong_details else "Không có câu sai, giải quyết chính xác toàn bộ."
        timing_summary = ", ".join(item_time_details) if item_time_details else "Không có dữ liệu thời gian từng câu."

        prompt = f"""DỮ LIỆU ĐỐI SOÁT NGƯỜI HỌC:
- Tên người học: {user_name if user_name else "Chưa rõ (gọi là bạn)"}
- Chủ đề kiểm tra: {topic_title}
- Điểm số: {total_score}/10.0 (Lần làm thứ {attempt_number})
- Nhịp độ thời gian: {speed_desc}
- Thời gian từng câu: {timing_summary}
- Ghi nhận sư phạm: {pedagogy_notes}
- Các câu hỏi làm sai: {error_summary}

Hãy đưa ra đánh giá khoa học chuẩn mực bằng JSON theo đúng hướng dẫn."""

        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=cls.SYSTEM_INSTRUCTION,
                temperature=0.25,
                max_output_tokens=2000,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
                response_mime_type="application/json"
            )
        )
        text = (response.text or "").strip()
        text = text.replace("\u2014", "-")
        data = json.loads(text)

        mentor_speech = (data.get("mentor_speech") or "").replace("\u2014", "-").strip()
        emotion_state = data.get("emotion_state", "ANALYTICAL_NEUTRAL")
        avatar_mood = data.get("avatar_mood", "thoughtful")
        emotion_progression = data.get("emotion_progression")
        if not isinstance(emotion_progression, list) or not emotion_progression:
            emotion_progression = [avatar_mood]
        summary_reason = (data.get("summary_reason") or "").replace("\u2014", "-").strip()
        suggested_action = (data.get("suggested_action") or "").replace("\u2014", "-").strip()

        return {
            "mentor_speech": mentor_speech,
            "emotion_state": emotion_state,
            "avatar_mood": avatar_mood,
            "emotion_progression": emotion_progression,
            "summary_reason": summary_reason,
            "suggested_action": suggested_action
        }
