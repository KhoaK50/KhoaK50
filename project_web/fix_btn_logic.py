import re

path = 'D:/Programming_language/project_web/frontend_v2/knowledge_info.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

replacement = """      .then(function(r){ return r.json(); })
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
          (window.App && window.App.showToast ? window.App.showToast(data.message || 'Lỗi khi ' + tr('knowledge.send_comment', 'Gửi bình luận') + '', 'warning') : alert(data.message || 'Lỗi khi ' + tr('knowledge.send_comment', 'Gửi bình luận') + ''));
        }
      })"""

html = re.sub(r'      \.then\(function\(r\)\{ return r\.json\(\); \}\)\s*\.then\(function\(data\)\{.*?\}\)\s*\.catch\(function\(err\)\{', replacement + '\n      .catch(function(err){', html, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)
