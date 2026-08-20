import os
from dotenv import load_dotenv
load_dotenv()
from google import genai

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
print('Key:', GEMINI_API_KEY)
client = genai.Client(api_key=GEMINI_API_KEY)
prompt = "Bạn là một hệ thống kiểm duyệt nội dung. Hãy trả lời 'True' nếu đoạn văn bản sau chứa từ ngữ chửi bậy, thô tục, phản cảm tiếng Việt hoặc tiếng Anh. Nếu không, hãy trả lời 'False'. Chỉ trả về một từ True hoặc False.\n\nVăn bản: fuck"
response = client.models.generate_content(
    model='gemini-2.5-flash',
    contents=prompt
)
print('Response:', response.text)
