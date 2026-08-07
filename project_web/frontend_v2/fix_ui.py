import re

file_path = r"D:\Programming_language\project_web\frontend_v2\login.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Fix CSS
css_old = """      .input-wrapper.error {
        border-color: #ff4d4d;
        box-shadow: 0 0 0 4px rgba(255, 77, 77, 0.1);
      }
      .input-wrapper.success {
        border-color: #2ecc71;
      }"""
css_new = """      .input-wrapper.error input {
        border-color: #ff4d4d;
        box-shadow: 0 0 0 4px rgba(255, 77, 77, 0.1);
      }
      .input-wrapper.success input {
        border-color: #2ecc71;
      }"""
content = content.replace(css_old, css_new)

# 2. Fix handleAuth
auth_old = """            if (data.status === "success") {
              showToast("Đăng ký thành công! Đang chuyển trang...", true);
              setTimeout(() => {
                switchTab("login");
                document.getElementById("loginEmail").value = email;
              }, 1500);
            }"""
auth_new = """            if (data.status === "success") {
              const form = document.getElementById("registerForm");
              form.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                  <i class="fa-solid fa-envelope-circle-check" style="font-size: 3.5rem; color: #2ecc71; margin-bottom: 20px;"></i>
                  <h3 style="color: var(--text-main); margin-bottom: 10px; font-size: 1.3rem;">Đăng ký thành công!</h3>
                  <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; margin-bottom: 25px;">
                    Chúng tôi đã gửi một email xác thực đến <br><b style="color: var(--text-main);">${email}</b>.<br><br>Vui lòng kiểm tra hộp thư đến (hoặc thư rác) và bấm vào liên kết để kích hoạt tài khoản trước khi đăng nhập.
                  </p>
                  <button type="button" class="btn-submit" onclick="window.location.reload()">
                    <i class="fa-solid fa-arrow-left"></i> Quay lại Đăng nhập
                  </button>
                </div>
              `;
            }"""
content = content.replace(auth_old, auth_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done fixing UI")
