import re

with open(r"D:\Programming_language\project_web\frontend_v2\login.html", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Insert CSS
css_to_add = """
      /* --- REAL-TIME VALIDATION UI --- */
      .input-wrapper {
        position: relative;
        transition: 0.3s;
      }
      .input-wrapper.error {
        border-color: #ff4d4d;
        box-shadow: 0 0 0 4px rgba(255, 77, 77, 0.1);
      }
      .input-wrapper.success {
        border-color: #2ecc71;
      }
      .error-msg {
        color: #ff4d4d;
        font-size: 0.8rem;
        margin-top: 5px;
        display: none;
      }
      .error-msg.show {
        display: block;
      }
      .caps-lock-warning {
        position: absolute;
        right: 40px;
        top: 50%;
        transform: translateY(-50%);
        color: #f39c12;
        font-size: 1rem;
        display: none;
        pointer-events: none;
      }
      .caps-lock-warning.show {
        display: block;
      }
      /* Password strength */
      .pwd-strength-container {
        margin-top: 10px;
        display: none;
      }
      .pwd-strength-bar {
        height: 4px;
        background: var(--border-light);
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 8px;
        display: flex;
      }
      .pwd-strength-fill {
        height: 100%;
        width: 0%;
        transition: width 0.3s ease, background-color 0.3s ease;
      }
      .pwd-rules {
        list-style: none;
        padding: 0;
        margin: 0;
        font-size: 0.8rem;
        color: var(--text-muted);
      }
      .pwd-rules li {
        margin-bottom: 3px;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .pwd-rules li i {
        font-size: 0.7rem;
      }
      .pwd-rules li.valid {
        color: #2ecc71;
      }
"""
content = content.replace("/* --- MATH BACKGROUND --- */", css_to_add + "\n      /* --- MATH BACKGROUND --- */")

# 2. Modify Register Email
reg_email_old = """          <div class="form-group">
            <label>Email liên hệ</label>
            <div class="input-wrapper">
              <input
                type="email"
                id="regEmail"
                placeholder="abc@example.com"
                required
              />
              <i class="fa-regular fa-envelope input-icon"></i>
            </div>
          </div>"""
reg_email_new = """          <div class="form-group">
            <label>Email liên hệ</label>
            <div class="input-wrapper" id="regEmailWrapper">
              <input
                type="email"
                id="regEmail"
                placeholder="abc@example.com"
                required
              />
              <i class="fa-regular fa-envelope input-icon"></i>
            </div>
            <div class="error-msg" id="regEmailError">Email không hợp lệ</div>
          </div>"""
content = content.replace(reg_email_old, reg_email_new)

# 3. Modify Register Password
reg_pass_old = """          <div class="form-group">
            <label>Mật khẩu</label>
            <div class="input-wrapper">
              <input
                type="password"
                id="regPass"
                class="has-pwd-toggle"
                placeholder="Tạo mật khẩu"
                required
              />
              <i class="fa-solid fa-lock input-icon"></i>
              <i
                class="fa-solid fa-eye-slash toggle-pwd"
                onclick="togglePassword('regPass', this)"
                title="Hiện/Ẩn mật khẩu"
              ></i>
            </div>
          </div>"""
reg_pass_new = """          <div class="form-group">
            <label>Mật khẩu</label>
            <div class="input-wrapper" id="regPassWrapper">
              <input
                type="password"
                id="regPass"
                class="has-pwd-toggle"
                placeholder="Tạo mật khẩu"
                required
              />
              <i class="fa-solid fa-lock input-icon"></i>
              <i class="fa-solid fa-eye-slash toggle-pwd" onclick="togglePassword('regPass', this)" title="Hiện/Ẩn mật khẩu"></i>
              <i class="fa-solid fa-keyboard caps-lock-warning" id="regCapsWarning" title="Caps Lock đang bật"></i>
            </div>
            <div class="pwd-strength-container" id="pwdStrengthContainer">
              <div class="pwd-strength-bar">
                <div class="pwd-strength-fill" id="pwdStrengthFill"></div>
              </div>
              <ul class="pwd-rules">
                <li id="ruleLength"><i class="fa-solid fa-circle-xmark"></i> Tối thiểu 8 ký tự</li>
                <li id="ruleLetter"><i class="fa-solid fa-circle-xmark"></i> Có ít nhất 1 chữ cái</li>
                <li id="ruleNumber"><i class="fa-solid fa-circle-xmark"></i> Có ít nhất 1 chữ số</li>
              </ul>
            </div>
          </div>"""
content = content.replace(reg_pass_old, reg_pass_new)

# 4. Modify Confirm Password
reg_pass_confirm_old = """          <div class="form-group">
            <label>Xác nhận mật khẩu</label>
            <div class="input-wrapper">
              <input
                type="password"
                id="regPassConfirm"
                class="has-pwd-toggle"
                placeholder="Nhập lại mật khẩu"
                required
              />
              <i class="fa-solid fa-lock input-icon"></i>
              <i
                class="fa-solid fa-eye-slash toggle-pwd"
                onclick="togglePassword('regPassConfirm', this)"
                title="Hiện/Ẩn mật khẩu"
              ></i>
            </div>
          </div>"""
reg_pass_confirm_new = """          <div class="form-group">
            <label>Xác nhận mật khẩu</label>
            <div class="input-wrapper" id="regPassConfirmWrapper">
              <input
                type="password"
                id="regPassConfirm"
                class="has-pwd-toggle"
                placeholder="Nhập lại mật khẩu"
                required
              />
              <i class="fa-solid fa-lock input-icon"></i>
              <i class="fa-solid fa-eye-slash toggle-pwd" onclick="togglePassword('regPassConfirm', this)" title="Hiện/Ẩn mật khẩu"></i>
            </div>
            <div class="error-msg" id="regPassConfirmError">Mật khẩu không khớp</div>
          </div>"""
content = content.replace(reg_pass_confirm_old, reg_pass_confirm_new)

# 5. Insert JS Logic
js_logic = """
      /* --- REAL-TIME VALIDATION & CAPS LOCK --- */
      function debounce(func, wait) {
        let timeout;
        return function(...args) {
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(this, args), wait);
        };
      }

      const regEmail = document.getElementById('regEmail');
      const regEmailWrapper = document.getElementById('regEmailWrapper');
      const regEmailError = document.getElementById('regEmailError');
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      const checkEmail = () => {
        if (!regEmail.value) {
          regEmailWrapper.classList.remove('error', 'success');
          regEmailError.classList.remove('show');
          return;
        }
        if (!emailRegex.test(regEmail.value)) {
          regEmailWrapper.classList.add('error');
          regEmailWrapper.classList.remove('success');
          regEmailError.classList.add('show');
        } else {
          regEmailWrapper.classList.remove('error');
          regEmailWrapper.classList.add('success');
          regEmailError.classList.remove('show');
        }
      };

      if(regEmail) {
        regEmail.addEventListener('keyup', debounce(checkEmail, 500));
        regEmail.addEventListener('blur', checkEmail);
      }

      const regPass = document.getElementById('regPass');
      const regPassWrapper = document.getElementById('regPassWrapper');
      const pwdStrengthContainer = document.getElementById('pwdStrengthContainer');
      const pwdStrengthFill = document.getElementById('pwdStrengthFill');
      const regCapsWarning = document.getElementById('regCapsWarning');
      
      const ruleLength = document.getElementById('ruleLength');
      const ruleLetter = document.getElementById('ruleLetter');
      const ruleNumber = document.getElementById('ruleNumber');
      
      if(regPass) {
        regPass.addEventListener('focus', () => {
          pwdStrengthContainer.style.display = 'block';
        });

        regPass.addEventListener('keyup', (e) => {
          // Caps Lock Check
          if (e.getModifierState && e.getModifierState('CapsLock')) {
            regCapsWarning.classList.add('show');
          } else {
            regCapsWarning.classList.remove('show');
          }

          const val = regPass.value;
          let score = 0;
          
          // Rule Length
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
          }

          // Update Bar
          if (score === 0 && val.length > 0) {
            pwdStrengthFill.style.width = '10%';
            pwdStrengthFill.style.backgroundColor = '#ff4d4d'; // Red
          } else if (score === 1) {
            pwdStrengthFill.style.width = '33%';
            pwdStrengthFill.style.backgroundColor = '#ff4d4d';
          } else if (score === 2) {
            pwdStrengthFill.style.width = '66%';
            pwdStrengthFill.style.backgroundColor = '#f1c40f'; // Yellow
          } else if (score === 3) {
            pwdStrengthFill.style.width = '100%';
            pwdStrengthFill.style.backgroundColor = '#2ecc71'; // Green
          } else {
            pwdStrengthFill.style.width = '0%';
          }
          
          checkPassConfirm(); // recheck confirm
        });
      }

      const regPassConfirm = document.getElementById('regPassConfirm');
      const regPassConfirmWrapper = document.getElementById('regPassConfirmWrapper');
      const regPassConfirmError = document.getElementById('regPassConfirmError');

      const checkPassConfirm = () => {
        if (!regPassConfirm.value) {
          regPassConfirmWrapper.classList.remove('error', 'success');
          regPassConfirmError.classList.remove('show');
          return;
        }
        if (regPassConfirm.value !== regPass.value) {
          regPassConfirmWrapper.classList.add('error');
          regPassConfirmWrapper.classList.remove('success');
          regPassConfirmError.classList.add('show');
        } else {
          regPassConfirmWrapper.classList.remove('error');
          regPassConfirmWrapper.classList.add('success');
          regPassConfirmError.classList.remove('show');
        }
      };

      if(regPassConfirm) {
        regPassConfirm.addEventListener('keyup', checkPassConfirm);
        regPassConfirm.addEventListener('blur', checkPassConfirm);
      }

      // Pre-flight check before submit
      document.getElementById('registerForm').addEventListener('submit', (e) => {
        const score = (regPass.value.length >= 8 ? 1 : 0) + (/[a-zA-Z]/.test(regPass.value) ? 1 : 0) + (/[0-9]/.test(regPass.value) ? 1 : 0);
        if (score < 3 || !emailRegex.test(regEmail.value) || regPassConfirm.value !== regPass.value) {
          e.preventDefault();
          showToast("Vui lòng kiểm tra lại thông tin đăng ký chưa hợp lệ!", false);
          return false;
        }
      });
"""
content = content.replace("function handleGoogleAuth() {", js_logic + "\n      function handleGoogleAuth() {")

with open(r"D:\Programming_language\project_web\frontend_v2\login.html", "w", encoding="utf-8") as f:
    f.write(content)
print("Done frontend patch")
