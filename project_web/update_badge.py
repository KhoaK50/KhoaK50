import re
import sys

path = 'D:/Programming_language/project_web/frontend_v2/js/app/ui/topbar_avatar.js'
with open(path, 'r', encoding='utf-8') as f:
    js = f.read()

# Update HTML
path_html = 'D:/Programming_language/project_web/frontend_v2/knowledge_info.html'
with open(path_html, 'r', encoding='utf-8') as f:
    html = f.read()
html = re.sub(
    r'<span id="unreadBadge" style=".*?"></span>', 
    '<span id="unreadBadge" style="display: none; position: absolute; top: -2px; right: -2px; min-width: 16px; height: 16px; background-color: #ef4444; border-radius: 10px; color: white; font-size: 10px; font-family: var(--font); font-weight: 700; align-items: center; justify-content: center; border: 2px solid var(--s1); padding: 0 4px; box-sizing: border-box; line-height: 1;"></span>', 
    html
)
with open(path_html, 'w', encoding='utf-8') as f:
    f.write(html)

# Update JS
js = js.replace("badge.style.display = 'block';", "badge.style.display = 'flex';\n            badge.innerText = unreadCount > 9 ? '9+' : unreadCount;")
with open(path, 'w', encoding='utf-8') as f:
    f.write(js)
