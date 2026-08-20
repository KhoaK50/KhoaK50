import re

path = 'D:/Programming_language/project_web/frontend_v2/knowledge_info.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

start_idx = html.find('function _doSendComment() {')
end_idx = html.find('sendBtn.onclick = _doSendComment;', start_idx)
func_body = html[start_idx:end_idx]

import sys
sys.stdout.reconfigure(encoding='utf-8')
print("--- FUNC BODY END ---")
print(func_body[-800:])
