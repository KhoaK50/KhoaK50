import re
content = open(r'D:\Programming_language\project_web\backend_v2\vectoria_api\routes\user.py', encoding='utf-8').read()
for match in re.findall(r'(email_content = f"Chào.*?send_auth_email.*?\}?\))', content, re.DOTALL):
    print("---")
    print(match)
