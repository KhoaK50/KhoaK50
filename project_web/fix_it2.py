import re

path = 'D:/Programming_language/project_web/frontend_v2/knowledge_info.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

start_idx = html.find('function _doSendComment() {')
end_idx = html.find('sendBtn.onclick = _doSendComment;', start_idx)

if start_idx == -1 or end_idx == -1:
    print("Could not find bounds")
    exit(1)

func_body = html[start_idx:end_idx]

fetch_then_idx = func_body.find('.then(function(r){ return r.json(); })')
if fetch_then_idx == -1:
    print("Could not find .then")
    exit(1)

catch_idx = func_body.find('.catch(function(err){', fetch_then_idx)
if catch_idx == -1:
    print("Could not find .catch")
    exit(1)

print("Found block to replace!")

new_block = """.then(function(r){ return r.json(); })
      .then(function(data){
        if (data.success) {
          sendBtn.innerHTML = '<i class="fa-solid fa-check"></i> ' + tr('knowledge.sent', 'Đã gửi!');
          sendBtn.style.background = '#22c55e';
          setTimeout(function(){
            sendBtn.innerHTML = origHTML;
            sendBtn.disabled = false;
            sendBtn.style.opacity = '1';
            sendBtn.style.background = '#3b82f6';
          }, 1200);
          
          textarea.innerHTML = '';
          _replyParentId = null;
          replyIndicator.style.display = 'none';
          loadComments();
        } else {
          sendBtn.innerHTML = origHTML;
          sendBtn.disabled = false;
          sendBtn.style.opacity = '1';
          sendBtn.style.background = '#3b82f6';
          (window.App && window.App.showToast ? window.App.showToast(data.message || 'Lỗi khi gửi', 'warning') : alert(data.message || 'Lỗi khi gửi'));
        }
      })
      """

func_body = func_body[:fetch_then_idx] + new_block + func_body[catch_idx:]

html = html[:start_idx] + func_body + html[end_idx:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)
print("Replaced successfully!")
