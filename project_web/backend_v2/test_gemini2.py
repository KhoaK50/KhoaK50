import os
from dotenv import load_dotenv
load_dotenv()
from google import genai

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
client = genai.Client(api_key=GEMINI_API_KEY)
prompt = "Bạn là một hệ thống kiểm duyệt nội dung. Hãy giữ nguyên đoạn văn bản sau, nhưng thay thế TẤT CẢ các từ ngữ chửi bậy, thô tục, phản cảm (tiếng Việt hoặc tiếng Anh) bằng các dấu sao (****). Nếu không có từ nào vi phạm, hãy trả về nguyên bản. KHÔNG thêm bất kỳ lời giải thích hay ngoặc kép nào.\n\nVăn bản: ditme"
try:
    response = client.models.generate_content(
        model='gemini-3.6-flash',
        contents=prompt
    )
    print('Response:', repr(response.text))
except Exception as e:
    print('Error:', e)
