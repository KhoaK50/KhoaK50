import re

file_path = r"D:\Programming_language\project_web\frontend_v2\login.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add .invalid CSS
css_old = """      .pwd-rules li.valid {
        color: #2ecc71;
      }"""
css_new = """      .pwd-rules li.valid {
        color: #2ecc71;
      }
      .pwd-rules li.invalid {
        color: #ff4d4d;
      }"""
content = content.replace(css_old, css_new)

# 2. Update rule validation JS
js_old = """          // Rule Length
          if (val.length >= 8) {
            score++;
            ruleLength.classList.add('valid');
            ruleLength.innerHTML = '<i class="fa-solid fa-circle-check"></i> Tối thiểu 8 ký tự';
          } else {
            ruleLength.classList.remove('valid');
            ruleLength.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Tối thiểu 8 ký tự';
          }
          
          // Rule Letter
          if (/[a-zA-Z]/.test(val)) {
            score++;
            ruleLetter.classList.add('valid');
            ruleLetter.innerHTML = '<i class="fa-solid fa-circle-check"></i> Có ít nhất 1 chữ cái';
          } else {
            ruleLetter.classList.remove('valid');
            ruleLetter.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Có ít nhất 1 chữ cái';
          }

          // Rule Number
          if (/[0-9]/.test(val)) {
            score++;
            ruleNumber.classList.add('valid');
            ruleNumber.innerHTML = '<i class="fa-solid fa-circle-check"></i> Có ít nhất 1 chữ số';
          } else {
            ruleNumber.classList.remove('valid');
            ruleNumber.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Có ít nhất 1 chữ số';
          }"""
js_new = """          // Rule Length
          if (val.length >= 8) {
            score++;
            ruleLength.classList.add('valid');
            ruleLength.classList.remove('invalid');
            ruleLength.innerHTML = '<i class="fa-solid fa-circle-check"></i> Tối thiểu 8 ký tự';
          } else {
            ruleLength.classList.remove('valid');
            if(val.length > 0) ruleLength.classList.add('invalid'); else ruleLength.classList.remove('invalid');
            ruleLength.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Tối thiểu 8 ký tự';
          }
          
          // Rule Letter
          if (/[a-zA-Z]/.test(val)) {
            score++;
            ruleLetter.classList.add('valid');
            ruleLetter.classList.remove('invalid');
            ruleLetter.innerHTML = '<i class="fa-solid fa-circle-check"></i> Có ít nhất 1 chữ cái';
          } else {
            ruleLetter.classList.remove('valid');
            if(val.length > 0) ruleLetter.classList.add('invalid'); else ruleLetter.classList.remove('invalid');
            ruleLetter.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Có ít nhất 1 chữ cái';
          }

          // Rule Number
          if (/[0-9]/.test(val)) {
            score++;
            ruleNumber.classList.add('valid');
            ruleNumber.classList.remove('invalid');
            ruleNumber.innerHTML = '<i class="fa-solid fa-circle-check"></i> Có ít nhất 1 chữ số';
          } else {
            ruleNumber.classList.remove('valid');
            if(val.length > 0) ruleNumber.classList.add('invalid'); else ruleNumber.classList.remove('invalid');
            ruleNumber.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Có ít nhất 1 chữ số';
          }"""
content = content.replace(js_old, js_new)

# 3. Add auto-focus to switchTab and flipCard
tab_old = """      function switchTab(tab) {
        const inner = document.getElementById('flipCardInner');
        if (tab === "register") {
          flipCard(true);
        } else if (tab === "login") {
          flipCard(false);
          document.getElementById("forgotForm").style.display = "none";
          document.getElementById("loginForm").style.display = "block";
          document.getElementById("authSubtitleLogin").innerText = "Đăng nhập để đồng bộ dữ liệu";
        } else if (tab === "forgot") {
          flipCard(false);
          document.getElementById("loginForm").style.display = "none";
          document.getElementById("forgotForm").style.display = "block";
          document.getElementById("authSubtitleLogin").innerText = "Khôi phục mật khẩu";
        }
      }"""
tab_new = """      function switchTab(tab) {
        const inner = document.getElementById('flipCardInner');
        if (tab === "register") {
          flipCard(true);
          setTimeout(() => document.getElementById("regName").focus(), 300);
        } else if (tab === "login") {
          flipCard(false);
          document.getElementById("forgotForm").style.display = "none";
          document.getElementById("loginForm").style.display = "block";
          document.getElementById("authSubtitleLogin").innerText = "Đăng nhập để đồng bộ dữ liệu";
          setTimeout(() => document.getElementById("loginEmail").focus(), 300);
        } else if (tab === "forgot") {
          flipCard(false);
          document.getElementById("loginForm").style.display = "none";
          document.getElementById("forgotForm").style.display = "block";
          document.getElementById("authSubtitleLogin").innerText = "Khôi phục mật khẩu";
          setTimeout(() => document.getElementById("forgotEmail").focus(), 300);
        }
      }"""
content = content.replace(tab_old, tab_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done final UI patches")
