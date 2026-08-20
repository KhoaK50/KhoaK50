import re

path = 'D:/Programming_language/project_web/admin_v2/src/pages/Moderation.jsx'
with open(path, 'r', encoding='utf-8') as f:
    jsx = f.read()

old_button = r'''<button\s*onClick=\{\(\) => handleBan\(flag\.user_id\)\}\s*className="inline-flex items-center gap-1\.5 px-2\.5 py-1\.5 text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"\s*>\s*<Lock className="w-3\.5 h-3\.5" />\s*Khóa TK\s*</button>'''

new_buttons = """<button
                              onClick={() => handleBan(flag.user_id, 'LOCKED')}
                              title="Khóa TK (Vẫn đăng nhập được nhưng không thể bình luận)"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded transition-colors"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              Khóa TK
                            </button>
                            <button
                              onClick={() => handleBan(flag.user_id, 'BANNED')}
                              title="Cấm TK (Không thể đăng nhập)"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              Cấm TK
                            </button>"""

jsx = re.sub(old_button, new_buttons, jsx, flags=re.DOTALL)
with open(path, 'w', encoding='utf-8') as f:
    f.write(jsx)
