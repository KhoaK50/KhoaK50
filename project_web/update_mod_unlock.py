import re

path = 'D:/Programming_language/project_web/admin_v2/src/pages/Moderation.jsx'
with open(path, 'r', encoding='utf-8') as f:
    jsx = f.read()

# I will replace the buttons with a dynamic rendering based on flag.status (which is the user's status now).

# First, fix handleBan confirm message
new_handle_ban = """
  const handleBan = async (userId, newStatus) => {
    let confirmMsg = 'Bạn có chắc chắn muốn mở khóa tài khoản này?';
    if (newStatus === 'BANNED') confirmMsg = 'Bạn có chắc chắn muốn cấm vĩnh viễn tài khoản này? Người dùng sẽ không thể đăng nhập.';
    if (newStatus === 'LOCKED') confirmMsg = 'Bạn có chắc chắn muốn khóa tài khoản này? Người dùng sẽ không thể bình luận.';
    
    if (!confirm(confirmMsg)) return;
    try {
      const token = localStorage.getItem('adminAuth');
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/ban`, {
"""
jsx = re.sub(r"  const handleBan = async \(userId, newStatus\) => \{.*?const res = await fetch\(`\$\{API_BASE\}/api/admin/users/\$\{userId\}/ban`, \{", new_handle_ban, jsx, flags=re.DOTALL)


# Now, update the buttons in the row:
old_buttons = """<button
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

new_buttons = """{flag.status === 'locked' || flag.status === 'banned' ? (
                              <button
                                onClick={() => handleBan(flag.user_id, 'ACTIVE')}
                                title="Mở khóa TK"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Mở khóa
                              </button>
                            ) : (
                              <>
                                <button
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
                                </button>
                              </>
                            )}"""

jsx = jsx.replace(old_buttons, new_buttons)

# Also let's show the user's status next to their name.
old_name = """{flag.display_name || 'Người dùng'}"""
new_name = """{flag.display_name || 'Người dùng'}
                              {flag.status === 'locked' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-500/20 text-orange-400">LOCKED</span>}
                              {flag.status === 'banned' && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400">BANNED</span>}"""
jsx = jsx.replace(old_name, new_name)

# Make handleBan reload flags on success
old_success = """if (data.success) {
        alert(data.message || 'Đã cập nhật trạng thái tài khoản');
      }"""
new_success = """if (data.success) {
        alert(data.message || 'Đã cập nhật trạng thái tài khoản');
        fetchFlags(); // reload to show new status
      }"""
jsx = jsx.replace(old_success, new_success)

with open(path, 'w', encoding='utf-8') as f:
    f.write(jsx)
