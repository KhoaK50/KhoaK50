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
        import random

        salutation = f"{user_name} ơi, " if user_name else "Bạn ơi, "
        case_codes = [c.get("code") for c in detected_cases]

        # Case 1: False Mastery / Lucky Guess / Super fast high score
        if is_false_mastery or "EC-7_FALSE_MASTERY" in case_codes or "EC-1_LUCKY_GUESS" in case_codes:
            openers = [
                f"{salutation}ú òa! Điểm {total_score}/10 ở bài {topic_title} nhìn loáng mắt tưởng cao thủ ẩn danh ghé thăm lớp mình nè!",
                f"{salutation}hú hồn chim én luôn! Bài {topic_title} đạt {total_score}/10 mà bạn bấm nộp cái rụp làm tớ ngồi cạnh chưa kịp chớp mắt luôn á!",
                f"{salutation}ôi chao, con số {total_score}/10 bài {topic_title} sáng rực rỡ luôn, mà sao bạn hoàn thành với vận tốc ánh sáng vậy ta?",
                f"{salutation}thần sầu dữ vậy nè! Vừa mở bài {topic_title} ra mà bạn ẵm trọn {total_score}/10 trong một nốt nhạc luôn á!",
                f"{salutation}bạn mới bật chế độ siêu nhân tính nhẩm hả? Điểm {total_score}/10 bài {topic_title} chớp nhoáng quá chừng!",
                f"{salutation}quá trời quá đất rồi! Nhìn điểm {total_score}/10 bài {topic_title} mà tớ ngồi bên cạnh phải dụi mắt ba lần luôn á!"
            ]
            observations = [
                "Mỗi câu bạn chốt đáp án chỉ trong tích tắc vài giây, nhanh hơn cả vận tốc pha ly mì gói luôn.",
                "Tớ còn đang mải đọc dòng đầu của đề bài thì bạn đã chọn xong câu cuối cùng rồi.",
                "Nhìn thanh thời gian mà tớ ngỡ ngàng, bạn lướt qua các câu hỏi nhẹ tênh như không vậy á.",
                "Bấm vèo vèo qua từng câu không một nhịp khựng lại, phong thái tự tin ngút ngàn luôn.",
                "Thời gian phản hồi siêu tốc làm máy chủ chấm điểm cũng phải ngỡ ngàng theo bạn luôn nè.",
                "Bạn giải đề với nhịp thở siêu nhanh, lướt vèo vèo qua các phương án như gió thoảng."
            ]
            analogies = [
                "Bạn có bí kíp tính nhẩm thần sầu nào thì bật mí cho tớ học lỏm với nha, hay là bốc thăm trúng thưởng vậy nè?",
                "Trực giác nhạy bén thì cừ thật, cơ mà toán học có những khúc cua khét lẹt, đi nhanh quá lỡ trượt chân là tiếc hùi hụi luôn á.",
                "Toán chứ đâu phải săn sale flash 0 đồng đâu mà bạn chốt đơn gấp gáp dữ vậy nè bạn ơi.",
                "Nhanh thế này lỡ gặp đề thi thật chắc giám thị đứng hình mất năm giây luôn quá nè.",
                "Biết đâu hôm nay thần may mắn ghé ngang phù hộ, nhưng tự lực cánh sinh hiểu sâu mới bền lâu nha.",
                "Lướt nhanh như lướt story mạng xã hội vậy, lỡ có cạm bẫy giăng ngầm là dễ dính chấu lắm á."
            ]
            advices = [
                "Mấy bài sau bẫy giăng như mạng nhện, tụi mình cần kiểm chứng lại độ chắc tay ở bài đánh giá tổng kết sắp tới nha!",
                "Tụi mình cùng kiểm chứng lại nền tảng ở các câu hỏi tư duy sâu hơn để đảm bảo không bị hớ nè!",
                "Chậm lại một nhịp ở bài sau để kiểm chứng xem bí kíp của bạn có bách phát bách trúng tiếp hông nhé!",
                "Tớ với bạn cùng kiểm chứng lại lý thuyết cốt lõi để giữ phong độ vững vàng suốt chặng đường dài nha!"
            ]
            reasons = [
                "Tốc độ phản hồi cực nhanh đạt điểm tối đa, cần đối chiếu bí kíp tư duy.",
                "Hoàn thành chớp nhoáng với điểm số tuyệt đối, cần kiểm chứng tính bền vững.",
                "Thời gian giải bài siêu tốc, phản ánh phản xạ trực giác cực mạnh."
            ]
            actions = [
                "Bật mí bí kíp tư duy bên dưới để Nori đồng hành cùng bạn nha.",
                "Kiểm tra lại phương pháp suy luận ở bài đánh giá tổng kết nhé.",
                "Giữ vững sự cẩn trọng khi bước vào các bài toán phân hóa tiếp theo."
            ]
            progressions = [
                ["shocked", "wink", "puzzled"],
                ["puzzled", "wink", "proud"],
                ["shocked", "puzzled", "wink"]
            ]
            return {
                "mentor_speech": f"{random.choice(openers)} {random.choice(observations)} {random.choice(analogies)} {random.choice(advices)}",
                "emotion_state": "PUZZLED_SPEED",
                "avatar_mood": "puzzled",
                "emotion_progression": random.choice(progressions),
                "summary_reason": random.choice(reasons),
                "suggested_action": random.choice(actions)
            }

        # Case 2: Global Spam Rush (EC-4A)
        if "EC-4A_GLOBAL_SPAM_GUESSING" in case_codes:
            openers = [
                f"{salutation}tớ thấy bạn chọn phương án ở tất cả các câu của bài {topic_title} nhanh như gió thoảng luôn!",
                f"{salutation}khoan khoan dừng khoảng chừng là hai giây nè! Bạn lướt qua toàn bộ bài {topic_title} như một cơn lốc xoáy vậy á!",
                f"{salutation}bạn ơi bạn ơi, nãy giờ bạn đang giải bài {topic_title} hay đang bấm nút thử vận may vậy nè?",
                f"{salutation}hú hồn luôn á! Toàn bộ các câu hỏi của bài {topic_title} được bạn hoàn thành chỉ trong chớp mắt!",
                f"{salutation}bình tĩnh bạn ơi! Vừa bấm bắt đầu bài {topic_title} mà bạn đã nộp bài cái rụp luôn rồi!"
            ]
            observations = [
                "Mỗi câu chưa đầy hai giây thì sao mà đọc kịp yêu cầu của người ra đề được ta.",
                "Đề bài còn chưa kịp load xong chữ là bạn đã chốt xong phương án rồi, vội dữ vậy nè.",
                "Tớ ngồi bên cạnh thấy tay bạn bấm liên thanh như gõ phím chơi game hành động vậy á.",
                "Nhịp bấm nhanh tới mức tớ hoa cả mắt, rõ ràng là mắt chưa kịp quét hết bốn phương án lựa chọn mà."
            ]
            analogies = [
                "Ủa nãy là bạn đọc đề hay đề đọc bạn vậy nè? Toán chứ đâu phải bốc thăm trúng quà đâu bạn ơi.",
                "Làm vội thế này chẳng khác nào bịt mắt chọn đồ ăn trong tủ lạnh, dễ bốc trúng ớt hiểm cay xè lắm á.",
                "Đi vội như chạy trốn deadline vậy, làm toán cần ngẫm nghĩ chút xíu mới thấy cái hay của nó chứ nè.",
                "Toán học không vội được đâu, gấp gáp quá chỉ làm mất công làm lại từ đầu thôi hà."
            ]
            advices = [
                "Hít một hơi thật sâu, uống ngụm nước mát rồi tụi mình cùng đọc kỹ đề làm lại nhen, tớ ngồi đây đợi bạn mà!",
                "Bây giờ thư giãn tay chân xíu, đọc chậm rãi từng dòng đề rồi tụi mình làm lại cho thật chuẩn nè!",
                "Bỏ lại lần thử này qua một bên, giờ tụi mình đọc kỹ từng giả thiết để làm lại đàng hoàng nha!",
                "Thong thả lại một nhịp, nhâm nhi miếng nước rồi tụi mình đọc đề từ tốn cùng nhau nhé!"
            ]
            progressions = [
                ["shocked", "wink", "stern", "empathetic"],
                ["shocked", "puzzled", "empathetic"],
                ["puzzled", "stern", "empathetic"]
            ]
            return {
                "mentor_speech": f"{random.choice(openers)} {random.choice(observations)} {random.choice(analogies)} {random.choice(advices)}",
                "emotion_state": "SOCRATIC_STERN",
                "avatar_mood": "shocked",
                "emotion_progression": random.choice(progressions),
                "summary_reason": "Chọn phương án quá nhanh ở tất cả các câu hỏi, chưa kịp đọc đề.",
                "suggested_action": "Thong thả uống ngụm nước, đọc kỹ đề rồi làm lại cùng Nori nhé."
            }

        # Case 3: End of Test Fatigue (EC-4B)
        if "EC-4B_END_OF_TEST_FATIGUE" in case_codes:
            openers = [
                f"{salutation}mấy câu đầu của bài {topic_title} bạn giải ngọt lịm như trà sữa full topping luôn á!",
                f"{salutation}những câu đầu bạn làm xuất sắc và chắc tay ghê, nhìn rất có nét của sinh viên chăm chỉ nè!",
                f"{salutation}tớ thấy bạn khởi đầu bài {topic_title} siêu mượt mà, từng bước đều rất chuẩn chỉnh!",
                f"{salutation}đoạn đầu bài {topic_title} bạn giải phong độ ngời ngời luôn, làm tớ vỗ tay tán thưởng quá chừng!"
            ]
            observations = [
                "Mà tự dưng đến những câu cuối tay bạn bấm vèo vèo như pin điện thoại tụt còn một phần trăm á!",
                "Cơ mà càng về cuối bài thì tốc độ bấm càng nhanh bất thường, giống như não đang phát tín hiệu cầu cứu vậy.",
                "Khúc sau tự dưng bạn tăng tốc bất ngờ, mấy câu cuối lướt qua vội vã như muốn nộp cho xong bài vậy nè.",
                "Mấy câu cuối bạn chọn nhanh gấp ba lần lúc đầu, chắc bắt đầu mỏi mắt và cạn năng lượng rồi đúng hông?"
            ]
            analogies = [
                "Chắc não bộ bắt đầu kêu réo đòi nghỉ xả hơi rồi đúng hông nè?",
                "Cảm giác như chạy marathon đến những mét cuối cùng chân bắt đầu líu ríu vậy á.",
                "Giống như thức khuya cày phim tới tập cuối thì mi mắt sụp xuống không cưỡng lại được vậy nè.",
                "Học toán tiêu hao calo không kém gì tập gym đâu, đuối sức giữa chừng là chuyện bình thường nha."
            ]
            advices = [
                "Thôi đứng dậy vươn vai, rửa mặt cho tỉnh táo rồi tụi mình chiến tiếp, đừng để mấy câu cuối làm rơi rớt uổng công sức nhen!",
                "Nghỉ ngơi ba phút nạp lại năng lượng rồi quay lại giải quyết dứt điểm mấy câu cuối cùng tớ nha!",
                "Pha một tách nước ấm, hít thở sâu rồi tụi mình cùng làm lại những câu cuối cho trọn vẹn điểm mười nhé!"
            ]
            progressions = [
                ["puzzled", "stern", "empathetic"],
                ["thoughtful", "puzzled", "empathetic"],
                ["wink", "thoughtful", "empathetic"]
            ]
            return {
                "mentor_speech": f"{random.choice(openers)} {random.choice(observations)} {random.choice(analogies)} {random.choice(advices)}",
                "emotion_state": "SOCRATIC_STERN",
                "avatar_mood": "stern",
                "emotion_progression": random.choice(progressions),
                "summary_reason": "Sự tập trung suy giảm ở những câu cuối bài kiểm tra do đuối sức.",
                "suggested_action": "Nghỉ ngơi 3 phút nạp năng lượng rồi cùng Nori làm tiếp nào."
            }

        # Case 4: Rapid Guessing on long items (EC-4)
        if "EC-4_RAPID_GUESSING" in case_codes:
            openers = [
                f"{salutation}hú hồn chim én luôn, có mấy câu trong bài {topic_title} đề dài ngoằng mà bạn lướt qua nhanh như cơn gió vậy á!",
                f"{salutation}tớ để ý có vài câu ở bài {topic_title} nhìn hơi rối mắt là bạn chọn đáp án trong một nốt nhạc luôn nè!",
                f"{salutation}bạn ơi, có mấy câu hỏi dài trong bài {topic_title} hình như bạn chưa kịp đọc hết giả thiết đã bấm nộp rồi á!"
            ]
            observations = [
                "Mấy câu đó người ra đề giăng bẫy ngọt ngào lắm, lơ là một nhịp là chọn trúng đáp án mồi liền.",
                "Câu hỏi càng dài thì gợi ý nằm càng nhiều trong thân bài, lướt vội là bỏ lỡ manh mối quý giá á.",
                "Chỉ cần đọc lướt qua câu chữ là dễ bị đánh lừa bởi những từ khóa tương tự nhau lắm nè."
            ]
            analogies = [
                "Đề dài nhìn giống như bản điều khoản dài dằng dặc, nhưng không bấm đồng ý bừa được đâu nha.",
                "Giải toán câu dài như bóc vỏ kẹo vậy á, bóc từ từ từng lớp thì mới tới được viên kẹo ngọt ngào bên trong.",
                "Toán học dài chữ là thử thách tính kiên nhẫn, đi nhanh là dễ dính bẫy ngầm của tác giả đề thi lắm đó."
            ]
            advices = [
                "Chậm lại một nhịp nha bạn ơi, đọc kỹ từng giả thiết như bóc vỏ kẹo thì mới không bị hớ nè!",
                "Lần sau gặp câu dài cứ gạch chân từng số liệu, làm từ từ cùng tớ là nắm chắc điểm số liền à!",
                "Đọc thong thả lại một xíu, đừng để độ dài của câu hỏi làm mình bị khớp nha!"
            ]
            return {
                "mentor_speech": f"{random.choice(openers)} {random.choice(observations)} {random.choice(analogies)} {random.choice(advices)}",
                "emotion_state": "SOCRATIC_STERN",
                "avatar_mood": "stern",
                "emotion_progression": ["puzzled", "stern", "empathetic"],
                "summary_reason": "Thao tác vội ở một số câu hỏi khiến bỏ sót chi tiết then chốt.",
                "suggested_action": "Đọc chậm lại một nhịp và thử lại bài kiểm tra nhé."
            }

        # Case 5: Diligent Struggle (EC-3B)
        if "EC-3B_DILIGENT_STRUGGLE" in case_codes:
            openers = [
                f"{salutation}tớ thấy bạn ngồi ngẫm nghĩ rồi đổi đáp án tới lui mấy bận ở bài {topic_title}, nhìn thương ghê á!",
                f"{salutation}bạn làm bài {topic_title} cẩn thận ghê luôn, cân nhắc tới lui từng phương án một cách nghiêm túc nè!",
                f"{salutation}nhìn bạn đắn đo chọn đi chọn lại giữa các phương án của bài {topic_title} làm tớ cũng nín thở theo luôn á!"
            ]
            observations = [
                "Tính cẩn trọng này là điểm cộng siêu bự nè, người học toán giỏi ai cũng cần sự tỉ mỉ như vậy.",
                "Bạn suy nghĩ rất thấu đáo, chỉ là đôi khi nghĩ nhiều quá lại làm tâm trí mình rối tinh như cuộn chỉ.",
                "Đứng trước hai phương án năm mươi năm mươi phân vân mãi làm mình dễ mất tự tin vào trực giác ban đầu."
            ]
            analogies = [
                "Cứ như lúc đứng trước quầy trà sữa phân vân giữa đường năm mươi với bảy mươi phần trăm vậy á.",
                "Càng đắn đo thì các đáp án càng giống nhau, giống như lạc vào mê cung số học vậy nè.",
                "Nghĩ nhiều quá dễ sinh ra nghi ngờ chính mình, trong khi bước giải đầu tiên thường là đúng nhất đó."
            ]
            advices = [
                f"Cứ bám chắc vào định nghĩa cốt lõi của {topic_title} như công thức gốc thôi, đừng tự làm khó mình nha, bạn làm được mà!",
                f"Tin tưởng vào lập luận ban đầu của mình hơn một xíu, nắm chắc định nghĩa {topic_title} là tự tin bấm ngay!",
                f"Lần tới cứ tự tin với phương án đầu tiên mình tìm ra theo định nghĩa {topic_title} nha, đừng dao động nè!"
            ]
            return {
                "mentor_speech": f"{random.choice(openers)} {random.choice(observations)} {random.choice(analogies)} {random.choice(advices)}",
                "emotion_state": "EMPATHETIC_ENCOURAGING",
                "avatar_mood": "empathetic",
                "emotion_progression": ["thoughtful", "puzzled", "wink", "empathetic"],
                "summary_reason": "Cân nhắc kỹ lưỡng nhưng còn phân vân giữa các phương án lý thuyết.",
                "suggested_action": f"Xem lại định nghĩa cốt lõi của {topic_title} rồi tự tin làm lại nha."
            }

        # Case 6: Procedural Trap (EC-2)
        if "EC-2_PROCEDURAL_TRAP" in case_codes:
            openers = [
                f"{salutation}mấy câu tính toán công thức của bài {topic_title} bạn bấm máy vèo vèo chuẩn không cần chỉnh luôn, tớ vỗ tay rào rào nè!",
                f"{salutation}kỹ năng tính toán của bạn ở bài {topic_title} mượt mà đỉnh cao luôn á, bấm số nhanh như chớp!",
                f"{salutation}tớ công nhận bạn làm mấy bước biến đổi đại số của bài {topic_title} rất điêu luyện luôn nè!"
            ]
            observations = [
                "Cơ mà hễ đụng tới bản chất lý thuyết là bạn hơi khựng lại xíu ha.",
                "Nhưng mà khi gặp các câu hỏi xoay quanh ý nghĩa bản chất định lý thì bạn lại hơi bối rối một chút.",
                "Mỗi khi đề bài hỏi sâu vào lý do vì sao có công thức đó, tức là đụng vào bản chất, thì bạn lại phân vân."
            ]
            analogies = [
                "Toán giống như lắp lego vậy á, ráp trơn tru nhưng phải hiểu khối nào chịu lực thì công trình mới vững được.",
                "Giống như học lái xe biết nhấn ga nhấn phanh nhưng cũng cần hiểu luật giao thông thì mới an toàn trên đường dài á.",
                "Tính toán là thanh kiếm, còn thấu hiểu bản chất mới là tấm khiên bảo vệ bạn trước mọi cạm bẫy của đề thi nha."
            ]
            advices = [
                f"Dành thêm chút thời gian nghía lại ý nghĩa hình học và bản chất của {topic_title}, bạn sẽ thấy bài toán thú vị hơn nhiều đó!",
                f"Tụi mình cùng ngẫm lại bản chất lý thuyết của {topic_title} một xíu là tự tin cân đẹp mọi dạng bài liền à!",
                f"Hiểu sâu bản chất định lý sẽ giúp bạn không bao giờ bị đánh lừa bởi bất kỳ đề bài biến tướng nào hết trơn!"
            ]
            return {
                "mentor_speech": f"{random.choice(openers)} {random.choice(observations)} {random.choice(analogies)} {random.choice(advices)}",
                "emotion_state": "ANALYTICAL_NEUTRAL",
                "avatar_mood": "thoughtful",
                "emotion_progression": ["wink", "thoughtful", "empathetic"],
                "summary_reason": "Tính toán rất cừ nhưng cần củng cố thêm bản chất định lý.",
                "suggested_action": f"Xem lại ý nghĩa hình học của {topic_title} cùng Nori nhé."
            }

        # Case 7: Careless Slip (EC-8)
        if "EC-8_CARELESS_SLIP" in case_codes:
            openers = [
                f"{salutation}trời ơi tiếc hùi hụi luôn á! Bài {topic_title} này bạn nắm chắc như lòng bàn tay rồi mà!",
                f"{salutation}tớ ngồi cạnh xem mà tiếc đứt ruột luôn nè bạn ơi! Bài {topic_title} làm hay ơi là hay luôn!",
                f"{salutation}xém chút nữa là ẵm trọn điểm tuyệt đối bài {topic_title} rồi á, tiếc quá chừng luôn!"
            ]
            observations = [
                "Bạn lập luận đâu ra đó chắc nịch từ đầu tới đuôi, mà khúc cuối trượt vỏ chuối vì nhầm dấu ở bước cộng trừ.",
                "Phương pháp giải thì chuẩn chỉnh một trăm phần trăm, chỉ mỗi tội khúc bấm máy tính hay rút gọn lại sơ ý nhầm dấu một xíu.",
                "Mọi bước biến đổi logic đều đỉnh chóp, chỉ vướng mỗi lỗi nhầm dấu số học làm rơi rớt điểm uổng ghê."
            ]
            analogies = [
                "Coi như bài học xương máu nè, giống như dắt xe tới cổng nhà rồi mà quên gạt chân chống vậy á.",
                "Đúng là ma trận hay số học thì dấu trừ luôn là kẻ thù số một của mọi sinh viên tụi mình ha.",
                "Trượt vỏ chuối ngay trước vạch đích thế này cay cú ghê, nhưng lần sau cẩn thận là không ai qua mặt được bạn đâu."
            ]
            advices = [
                "Lần sau trước khi bấm nộp bài, dành ra năm giây rà soát lại dấu cộng trừ là điểm mười nằm gọn trong tay rồi nha!",
                "Nhớ kiểm tra kỹ dấu số học ở bước cuối cùng, bạn có đủ bản lĩnh để đạt điểm tối đa ở bài sau đó!",
                "Khắc phục được nhầm dấu là bạn vô đối luôn, chuẩn bị tinh thần rinh trọn điểm mười nhé!"
            ]
            return {
                "mentor_speech": f"{random.choice(openers)} {random.choice(observations)} {random.choice(analogies)} {random.choice(advices)}",
                "emotion_state": "EMPATHETIC_ENCOURAGING",
                "avatar_mood": "empathetic",
                "emotion_progression": ["puzzled", "stern", "empathetic"],
                "summary_reason": "Nắm chắc phương pháp, chỉ sơ suất ở bước tính toán số học.",
                "suggested_action": "Rèn luyện thêm thói quen kiểm tra dấu số học trước khi hoàn thành."
            }

        # Case 8: Repeated Attempt High Score (attempt_number >= 2 and total_score >= 8.0)
        if attempt_number >= 2 and total_score >= 8.0:
            openers = [
                f"{salutation}xịn đét luôn bạn ơi! Sau {attempt_number} lần kiên trì cày cuốc thì con số {total_score}/10 này xứng đáng nhận điểm mười cho tinh thần luôn á!",
                f"{salutation}tinh thần chiến binh là đây chứ đâu! Lần thứ {attempt_number} làm bài {topic_title} và bạn đã chạm tới {total_score}/10 điểm thật ngọt ngào!",
                f"{salutation}quá đã luôn nè! Nhìn điểm {total_score}/10 sau {attempt_number} lần rèn luyện làm tớ vui lây luôn á!"
            ]
            observations = [
                "Tớ ngồi canh mà thấy bạn sửa từng lỗi nhỏ một từ lần trước, sự tiến bộ thấy rõ luôn.",
                "Bạn không hề nản chí mà rút kinh nghiệm cực kỳ nhanh, phong độ nâng cấp rõ rệt qua từng lần làm.",
                "Khả năng học hỏi từ lỗi sai của bạn cực kỳ cừ khôi, từng câu hỏi khó đều bị bạn khuất phục trọn vẹn."
            ]
            analogies = [
                "Cứ kiên trì bền bỉ thế này thì đề thi đại học hay kết thúc học phần cũng không làm khó được bạn đâu.",
                "Đúng chất sinh viên kiên cường, vấp chỗ nào đứng dậy nâng cấp vũ khí ngay chỗ đó!",
                "Nỗ lực vượt bậc thế này chính là chìa khóa mở toang mọi cánh cửa học thuật nè."
            ]
            advices = [
                "Cứ giữ vững ngọn lửa nhiệt huyết này thì bài nào tụi mình cũng cân đẹp hết trơn!",
                "Thừa thắng xông lên bước tiếp theo trên hành trình học tập thôi nào bạn ơi!",
                "Tiếp tục duy trì phong độ kiên cường này ở bài đánh giá tổng kết nhé!"
            ]
            return {
                "mentor_speech": f"{random.choice(openers)} {random.choice(observations)} {random.choice(analogies)} {random.choice(advices)}",
                "emotion_state": "IMPRESSED_PROUD",
                "avatar_mood": "proud",
                "emotion_progression": ["proud", "wink", "proud"],
                "summary_reason": f"Kiên trì rèn luyện và tiến bộ rõ rệt sau {attempt_number} lần làm bài.",
                "suggested_action": "Tiếp tục tiến vào bài học tiếp theo trên lộ trình nào."
            }

        # Case 9: High Score (total_score >= 8.0)
        if total_score >= 8.0:
            openers = [
                f"{salutation}đỉnh của chóp luôn nha! Bạn hoàn thành bài {topic_title} với điểm số {total_score}/10 sáng rực rỡ luôn nè!",
                f"{salutation}xuất sắc xuất sắc! Bài {topic_title} đạt {total_score}/10 điểm đẹp như một bức tranh vậy á!",
                f"{salutation}quá ngưỡng mộ luôn bạn ơi! Con số {total_score}/10 bài {topic_title} chứng minh phong độ của bạn đang ở đỉnh cao nè!",
                f"{salutation}làm bài ngọt lịm luôn! Điểm {total_score}/10 ở bài {topic_title} làm tớ ngồi cạnh vỗ tay không ngớt luôn á!"
            ]
            observations = [
                "Từng bước phân tích đều chắc nịch, nhịp độ làm bài vừa vặn không chê vào đâu được.",
                "Bạn đọc đề kỹ càng, tính toán chuẩn xác và chốt đáp án cực kỳ dứt khoát luôn.",
                "Phong thái làm bài đĩnh đạc và chuẩn chỉnh của một người thật sự làm chủ kiến thức.",
                "Tốc độ giải bài rất đều tay, chứng tỏ bạn đã thẩm thấu bài học cực kỳ sâu sắc."
            ]
            analogies = [
                "Giải toán nhẹ nhàng tựa như đi dạo trong công viên ngày nắng đẹp vậy á.",
                "Phong độ đang thăng hoa như thế này thì học phần này điểm A chắc chắn trong tầm tay rồi.",
                "Mọi cạm bẫy của người ra đề đều bị bạn hóa giải dễ như ăn kẹo luôn nè."
            ]
            advices = [
                "Phong độ đang lên cao chót vót, tụi mình thừa thắng xông lên bài tiếp theo luôn cho nóng hén!",
                "Giữ vững sự tập trung này để chinh phục trọn vẹn bài đánh giá tổng kết sắp tới nha bạn ơi!",
                "Cứ phong độ này thì bài kiểm tra tổng kết chỉ là chuyện nhỏ đối với bạn thôi!"
            ]
            return {
                "mentor_speech": f"{random.choice(openers)} {random.choice(observations)} {random.choice(analogies)} {random.choice(advices)}",
                "emotion_state": "IMPRESSED_PROUD",
                "avatar_mood": "proud",
                "emotion_progression": ["proud", "wink", "proud"],
                "summary_reason": "Nắm vững trọn vẹn kiến thức với nhịp độ tư duy chuẩn mực.",
                "suggested_action": "Tiến thẳng vào bài học tiếp theo trên lộ trình nào."
            }

        # Case 10: Medium Score (total_score >= 5.0)
        elif total_score >= 5.0:
            openers = [
                f"{salutation}nền tảng của bạn ở bài {topic_title} khá ổn áp rồi nè, đạt được {total_score}/10 là có bước đệm rất tốt rồi!",
                f"{salutation}kết quả {total_score}/10 ở bài {topic_title} cho thấy bạn đã nắm được phần lớn kiến thức cốt lõi rồi á!",
                f"{salutation}cố gắng lắm nè! Bài {topic_title} đạt {total_score}/10 là một nỗ lực rất đáng ghi nhận luôn!",
                f"{salutation}bài {topic_title} kết thúc với điểm số {total_score}/10, tụi mình đã đi được hơn nửa chặng đường rồi nè!"
            ]
            observations = [
                "Chỉ là gặp mấy câu gài bẫy nâng cao thì mình còn hơi lúng túng một xíu thôi.",
                "Những câu hỏi cơ bản bạn xử lý rất êm, chỉ cần mài giũa thêm một chút ở các câu suy luận đa bước nữa thôi.",
                "Bạn nắm khá chắc các định nghĩa ban đầu, chỉ cần chú ý thêm ở các trường hợp đặc biệt.",
                "Nhịp độ làm bài ổn định, chỉ cần bình tĩnh hơn ở những câu phân loại học sinh."
            ]
            analogies = [
                "Không sao hết á, ai mới học cũng phải vấp vài chỗ thì mới vỡ lẽ ra được nhiều điều hay ho chứ.",
                "Giống như tập đi xe đạp, lúc đầu hơi loạng choạng xíu nhưng giữ thăng bằng được rồi là phóng vèo vèo ngay.",
                "Toán học như pha trà sữa vậy á, nếm thử vài lần mới biết công thức nào hợp gu mình nhất nè."
            ]
            advices = [
                f"Tụi mình nghía lại phần lý thuyết của {topic_title} một tí rồi luyện thêm vài câu là phản xạ bén ngót ngay thôi!",
                f"Tự tin lên nha, rà soát lại mấy câu chưa đúng cùng tớ là lần sau ẵm trọn điểm tám điểm chín liền à!",
                f"Xem lại các ví dụ minh họa cùng Nori để tự tin làm chủ toàn bộ chủ đề {topic_title} nhé!"
            ]
            return {
                "mentor_speech": f"{random.choice(openers)} {random.choice(observations)} {random.choice(analogies)} {random.choice(advices)}",
                "emotion_state": "ANALYTICAL_NEUTRAL",
                "avatar_mood": "thoughtful",
                "emotion_progression": ["wink", "thoughtful", "empathetic"],
                "summary_reason": "Nắm chắc kiến thức nền tảng, cần phân tích kỹ hơn ở các câu hỏi nâng cao.",
                "suggested_action": f"Làm thêm vài câu tự luyện của {topic_title} cùng Nori nha."
            }

        # Case 11: Low Score (total_score < 5.0)
        else:
            openers = [
                f"{salutation}đừng buồn nha, bài {topic_title} này công nhận hơi hóc búa thiệt, tớ nhìn đề lúc đầu cũng thấy hoa cả mắt á!",
                f"{salutation}không sao đâu bạn ơi! Bài {topic_title} này nổi tiếng là nhiều khúc quanh khó nhằn mà!",
                f"{salutation}hít thở sâu một hơi nào! Điểm số lần này của bài {topic_title} chưa như ý nhưng không có gì phải nản lòng hết nè!",
                f"{salutation}tớ ngồi cạnh đây với bạn nè! Chủ đề {topic_title} quả thực cần nhiều thời gian để thẩm thấu hơn bình thường."
            ]
            observations = [
                "Coi như lần này tụi mình đi thám thính địa hình để biết người ra đề hay gài bẫy ở đâu trước đi.",
                "Kiến thức mới bao giờ lúc đầu cũng thấy hơi lạ lẫm, quan trọng là mình tìm ra chỗ vướng để gỡ rối từ từ.",
                "Đừng để những câu hỏi khó làm bạn nản chí, ai cũng từng trải qua giai đoạn bỡ ngỡ ban đầu mà.",
                "Tụi mình mới chỉ bắt đầu làm quen thôi, còn rất nhiều cơ hội để nâng cấp điểm số phía trước."
            ]
            analogies = [
                "Đường đi tới đỉnh núi lúc nào cũng dốc, nhưng bước từng bước một thì thế nào cũng tới nơi thôi hà.",
                "Giống như chơi game qua màn khó vậy á, chết vài mạng là chuyện thường, thuộc bài rồi là phá đảo liền.",
                "Học toán giống như gieo hạt vậy, cần thời gian bén rễ thì cây mới nở hoa kết trái ngọt ngào được."
            ]
            advices = [
                f"Giờ nghỉ ngơi một tí, uống miếng nước rồi tớ với bạn cùng mổ xẻ lại từng ví dụ mẫu của {topic_title}, không có gì phải xoắn hết nè!",
                f"Cùng Nori xem lại bài giảng cốt lõi của {topic_title} từ từ nha, tụi mình sẽ làm lại và phục thù ngoạn mục cho xem!",
                f"Đừng ngần ngại xem lại lý thuyết {topic_title}, tớ luôn sẵn sàng đồng hành cùng bạn trên mọi nẻo đường nè!"
            ]
            return {
                "mentor_speech": f"{random.choice(openers)} {random.choice(observations)} {random.choice(analogies)} {random.choice(advices)}",
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
            for mod_name in ['gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-pro-latest']:
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
                temperature=0.95,
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
