import bleach
from vectoria_api.middleware.auth import token_required as bookmark_token_required
import os
from dotenv import load_dotenv

load_dotenv()

def get_modern_email(title, greeting, paragraphs, btn_text=None, btn_link=None, fallback_link=None, sub_text=None, lang='vi'):
    btn_html = ""
    if btn_text and btn_link:
        btn_html = f"""
        <div style="margin: 32px 0;">
            <a href="{btn_link}" style="display: inline-block; padding: 12px 24px; background-color: #0090ff; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">{btn_text}</a>
        </div>
        """
        if fallback_link:
            fallback_msg = "Nếu nút bấm không hoạt động, vui lòng sao chép và dán liên kết sau:" if lang == 'vi' else "If the button doesn't work, please copy and paste the following link:"
            btn_html += f"""
            <p style="color: #64748b; font-size: 13px; margin-bottom: 8px;">{fallback_msg}</p>
            <p style="color: #3b82f6; font-size: 13px; word-break: break-all; margin-top: 0;"><a href="{fallback_link}" style="color: #3b82f6; text-decoration: underline;">{fallback_link}</a></p>
            """
            
    p_html = "".join([f'<p style="color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">{p}</p>' for p in paragraphs])
    sub_html = f'<p style="color: #64748b; font-size: 13px; margin-top: 32px;">{sub_text}</p>' if sub_text else ""
    
    footer_text = "Nếu bạn không yêu cầu hành động này, vui lòng bỏ qua email này." if lang == 'vi' else "If you didn't request this action, please ignore this email."
    
    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 40px 20px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <tr>
      <td style="padding: 40px;">
        <div style="font-weight: 800; font-size: 20px; color: #0090ff; letter-spacing: -0.5px; margin-bottom: 40px;"><span translate="no" class="notranslate">VECTORIA</span></div>
        <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 24px;">{title}</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">{greeting}</p>
        {p_html}
        {btn_html}
        {sub_html}
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
        <p style="color: #94a3b8; font-size: 13px; margin-bottom: 8px;">{footer_text}</p>
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; 2026 <span translate="no" class="notranslate">Vectoria</span> - vectoria.io.vn</p>
      </td>
    </tr>
  </table>
</body>
</html>"""


def get_friendly_device(ua_string, lang='vi'):
    """Trích xuất tên thiết bị, hệ điều hành và trình duyệt theo chuẩn nhận diện."""
    if not ua_string or ua_string == "Unknown Device":
        return "Thiết bị không xác định" if lang == 'vi' else "Unrecognized Device"
    try:
        from user_agents import parse
        ua = parse(ua_string)
        device_part = f"{ua.device.family} - " if ua.device.family and ua.device.family != "Other" else ""
        os_part = ua.os.family if ua.os.family else ("Hệ điều hành khác" if lang == 'vi' else "Other OS")
        browser_part = f"{ua.browser.family}" if ua.browser.family else ("Trình duyệt khác" if lang == 'vi' else "Other Browser")
        return f"{device_part}{os_part} ({browser_part})"
    except Exception:
        return "Thiết bị không xác định" if lang == 'vi' else "Unrecognized Device"


def get_security_alert_email(display_name, friendly_device, client_ip, login_time, confirm_link, secure_link, lang='vi'):
    """Email cảnh báo bảo mật chuẩn Enterprise Formality, đối soát 2 luồng Xác nhận / Khóa tài khoản."""
    if lang == 'en':
        title = "Security Alert: New Sign-in Detected"
        greeting = f"Dear {display_name},"
        lead_paragraph = (
            "The Vectoria Security System detected a new sign-in to your account from a device or environment "
            "that has not been recognized previously."
        )
        box_title = "Sign-in Session Details"
        lbl_time = "Timestamp"
        lbl_device = "Device & Browser"
        lbl_ip = "IP Address"
        lbl_status = "Status"
        val_status = "Unverified Device"

        owner_heading = "If this sign-in was made by you:"
        owner_desc = (
            "Click the confirmation button below to trust this device. Once verified, future sign-ins "
            "from this device will proceed without generating security alerts."
        )
        owner_btn = "Confirm This Device"
        fallback_confirm = "If the button above does not work, copy and paste this verification URL into your browser:"

        intruder_heading = "If you did NOT initiate this sign-in:"
        intruder_desc = (
            "Your account credentials may have been compromised. Immediately secure your account to terminate "
            "all active sessions and initiate an emergency password reset."
        )
        intruder_btn = "Lock Account & Reset Password Immediately"
        fallback_secure = "Direct security link:"

        footer_automated = "This is an automated security notification from the Vectoria Identity System."
        footer_warning = "For your protection, never forward or share this email with anyone."
        footer_copy = "&copy; 2026 Vectoria - vectoria.io.vn"
    else:
        title = "Cảnh báo an ninh: Phát hiện đăng nhập từ thiết bị mới"
        greeting = f"Kính gửi Quý người dùng {display_name},"
        lead_paragraph = (
            "Hệ thống an ninh Vectoria ghi nhận một phiên đăng nhập mới vào tài khoản của bạn từ một thiết bị hoặc "
            "môi trường duyệt web chưa từng được xác nhận trước đây."
        )
        box_title = "Thông tin chi tiết phiên đăng nhập"
        lbl_time = "Thời gian ghi nhận"
        lbl_device = "Thiết bị và Trình duyệt"
        lbl_ip = "Địa chỉ IP"
        lbl_status = "Trạng thái"
        val_status = "Chưa xác minh tin cậy"

        owner_heading = "Trường hợp đây là phiên đăng nhập của bạn:"
        owner_desc = (
            "Vui lòng nhấn nút xác nhận bên dưới để ghi nhận thiết bị này vào danh sách an toàn. Sau khi xác nhận, "
            "các lần đăng nhập tiếp theo trên thiết bị này sẽ diễn ra bình thường và không kích hoạt cảnh báo."
        )
        owner_btn = "Xác nhận thiết bị này"
        fallback_confirm = "Nếu nút bấm trên không phản hồi, bạn có thể sao chép liên kết xác thực sau vào trình duyệt:"

        intruder_heading = "Trường hợp bạn KHÔNG thực hiện đăng nhập này:"
        intruder_desc = (
            "Thông tin tài khoản của bạn có nguy cơ đã bị lộ. Vui lòng bấm vào nút bảo vệ khẩn cấp bên dưới để khóa "
            "tài khoản, thu hồi toàn bộ phiên truy cập hiện hữu và đặt lại mật khẩu ngay lập tức."
        )
        intruder_btn = "Khóa tài khoản và Đổi mật khẩu ngay"
        fallback_secure = "Liên kết bảo vệ tài khoản khẩn cấp:"

        footer_automated = "Thông báo an ninh tự động từ Hệ thống Nhận diện và Xác thực Vectoria."
        footer_warning = "Nhằm bảo đảm an toàn thông tin, tuyệt đối không chuyển tiếp email này cho người khác."
        footer_copy = "&copy; 2026 Vectoria - vectoria.io.vn"

    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
    <tr>
      <td style="padding: 32px 36px; border-bottom: 2px solid #0090ff;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size: 16px; font-weight: 800; letter-spacing: 0.5px; color: #0090ff; text-transform: uppercase;">
              <span translate="no" class="notranslate">VECTORIA</span> <span style="color: #64748b; font-weight: 600; font-size: 13px; letter-spacing: 0;">SECURITY</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 36px 36px 28px 36px;">
        <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; line-height: 1.4; color: #0f172a; letter-spacing: -0.2px;">
          {title}
        </h1>
        <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
          {greeting}
        </p>
        <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
          {lead_paragraph}
        </p>

        <!-- Session Details Box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 28px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px;">
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">
              {box_title}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="38%" style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 500;">{lbl_time}:</td>
                  <td width="62%" style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600;">{login_time}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 500;">{lbl_device}:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600;">{friendly_device}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 500;">{lbl_ip}:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600; font-family: monospace;">{client_ip}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 500;">{lbl_status}:</td>
                  <td style="padding: 6px 0; font-size: 13px; color: #d97706; font-weight: 600;">{val_status}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Option 1: Owner Confirmation -->
        <div style="margin: 0 0 28px 0; padding: 20px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px;">
          <h2 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #0f172a;">
            {owner_heading}
          </h2>
          <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.5; color: #475569;">
            {owner_desc}
          </p>
          <div style="margin: 0 0 12px 0;">
            <a href="{confirm_link}" style="display: inline-block; padding: 10px 22px; background-color: #0090ff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px;">
              {owner_btn}
            </a>
          </div>
          <p style="margin: 0; font-size: 12px; line-height: 1.4; color: #64748b;">
            {fallback_confirm}<br>
            <a href="{confirm_link}" style="color: #0090ff; word-break: break-all; text-decoration: underline;">{confirm_link}</a>
          </p>
        </div>

        <!-- Option 2: Intruder Alert & Lockdown -->
        <div style="margin: 0 0 28px 0; padding: 20px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 4px;">
          <h2 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #991b1b;">
            {intruder_heading}
          </h2>
          <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.5; color: #7f1d1d;">
            {intruder_desc}
          </p>
          <div style="margin: 0 0 12px 0;">
            <a href="{secure_link}" style="display: inline-block; padding: 10px 22px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px;">
              {intruder_btn}
            </a>
          </div>
          <p style="margin: 0; font-size: 12px; line-height: 1.4; color: #991b1b;">
            {fallback_secure}<br>
            <a href="{secure_link}" style="color: #b91c1c; word-break: break-all; text-decoration: underline;">{secure_link}</a>
          </p>
        </div>

        <!-- System Footer -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 12px;">
          <p style="margin: 0 0 6px 0; font-size: 12px; line-height: 1.5; color: #64748b;">
            {footer_automated}
          </p>
          <p style="margin: 0 0 12px 0; font-size: 12px; line-height: 1.5; color: #94a3b8;">
            {footer_warning}
          </p>
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">
            {footer_copy}
          </p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>"""


def get_device_confirmation_page(status, friendly_device=None, frontend_url="https://vectoria.io.vn", lang='vi'):
    """Trang phản hồi HTML chuyên nghiệp cho liên kết xác nhận thiết bị và bảo vệ tài khoản."""
    if status == "success":
        badge_color = "#16a34a"
        badge_bg = "#f0fdf4"
        badge_border = "#bbf7d0"
        title = "Xác nhận thiết bị thành công" if lang == 'vi' else "Device Verified Successfully"
        desc = (
            f"Thiết bị <strong>{friendly_device or 'mới'}</strong> đã được ghi nhận vào danh sách thiết bị tin cậy "
            f"của tài khoản. Từ các phiên đăng nhập tiếp theo trên thiết bị này, bạn sẽ không nhận cảnh báo bảo mật nữa."
            if lang == 'vi' else
            f"The device <strong>{friendly_device or 'new'}</strong> has been registered to your trusted device list. "
            f"Subsequent sign-ins from this device will proceed without triggering security alerts."
        )
        btn_text = "Tiếp tục vào Vectoria" if lang == 'vi' else "Continue to Vectoria"
        btn_link = frontend_url
    elif status == "expired":
        badge_color = "#d97706"
        badge_bg = "#fffbeb"
        badge_border = "#fde68a"
        title = "Liên kết xác nhận đã hết hạn" if lang == 'vi' else "Verification Link Expired"
        desc = (
            "Liên kết xác nhận thiết bị này đã vượt quá thời hạn hiệu lực (7 ngày). "
            "Nếu bạn tiếp tục đăng nhập trên thiết bị đó, hệ thống sẽ tự động gửi một email xác nhận mới."
            if lang == 'vi' else
            "This verification link has expired (valid for 7 days). "
            "If you sign in again from that device, a new verification email will be generated automatically."
        )
        btn_text = "Đến trang Đăng nhập" if lang == 'vi' else "Go to Sign In"
        btn_link = f"{frontend_url}/login.html"
    else:
        badge_color = "#dc2626"
        badge_bg = "#fef2f2"
        badge_border = "#fecaca"
        title = "Mã xác nhận không hợp lệ" if lang == 'vi' else "Invalid Verification Code"
        desc = (
            "Mã xác thực không đúng hoặc đường dẫn đã bị chỉnh sửa. Vui lòng kiểm tra lại liên kết trong thư điện tử của bạn."
            if lang == 'vi' else
            "The verification token is invalid or corrupted. Please verify the URL provided in your email."
        )
        btn_text = "Về trang chủ" if lang == 'vi' else "Return to Homepage"
        btn_link = frontend_url

    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} - Vectoria</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }}
    .card {{
      background: #ffffff;
      width: 100%;
      max-width: 520px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      padding: 36px 32px;
      text-align: center;
    }}
    .brand {{
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #0090ff;
      text-transform: uppercase;
      margin-bottom: 24px;
    }}
    .badge {{
      display: inline-block;
      padding: 6px 14px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background-color: {badge_bg};
      color: {badge_color};
      border: 1px solid {badge_border};
      margin-bottom: 20px;
    }}
    h1 {{
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 14px;
      line-height: 1.4;
    }}
    p {{
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 28px;
    }}
    .btn {{
      display: inline-block;
      padding: 12px 28px;
      background-color: #0090ff;
      color: #ffffff;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 600;
      font-size: 14px;
      transition: background-color 0.15s ease;
    }}
    .btn:hover {{
      background-color: #007ae5;
    }}
    .footer {{
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #f1f5f9;
      font-size: 12px;
      color: #94a3b8;
    }}
  </style>
</head>
<body>
  <div class="card">
    <div class="brand"><span translate="no" class="notranslate">VECTORIA</span> SECURITY</div>
    <div class="badge">{status.upper()}</div>
    <h1>{title}</h1>
    <p>{desc}</p>
    <a href="{btn_link}" class="btn">{btn_text}</a>
    <div class="footer">
      &copy; 2026 Vectoria - vectoria.io.vn
    </div>
  </div>
</body>
</html>"""


def tr_msg(msg_vi):
    try:
        from flask import request
        if request.method == "GET":
            lang = request.args.get("lang", "vi")
        elif request.is_json and request.json:
            lang = request.json.get("language", "vi")
        else:
            lang = "vi"
    except Exception:
        lang = "vi"
        
    msgs = {
        "Vui lòng điền đầy đủ thông tin!": "Please fill in all information!",
        "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ và số!": "Password must be at least 8 characters, including letters and numbers!",
        "Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.": "Registration successful! Please check your email to activate your account.",
        "Email này đã được sử dụng!": "This email is already in use!",
        "Thiếu mã xác thực!": "Missing authentication code!",
        "Mã xác thực không hợp lệ hoặc đã hết hạn!": "Invalid or expired authentication code!",
        "Tài khoản này đã được kích hoạt rồi!": "This account is already activated!",
        "Tài khoản đã được kích hoạt thành công!": "Account activated successfully!",
        "Vui lòng nhập Email và Mật khẩu!": "Please enter Email and Password!",
        "Email hoặc mật khẩu không đúng!": "Incorrect email or password!",
        "Vui lòng nhập Email!": "Please enter Email!",
        "Nếu email tồn tại, thư khôi phục đã được gửi.": "If the email exists, a recovery email has been sent.",
        "Thiếu thông tin yêu cầu!": "Missing required information!",
        "Đường dẫn đổi mật khẩu không hợp lệ hoặc đã hết hạn!": "Invalid or expired password reset link!",
        "Thay đổi mật khẩu thành công! Tài khoản đã được bảo vệ.": "Password changed successfully! Your account is protected.",
        "Thiếu mã xác thực Google!": "Missing Google authentication code!",
        "Token Google không hợp lệ hoặc đã hết hạn!": "Invalid or expired Google token!"
    }
    if lang == 'en':
        return msgs.get(msg_vi, msg_vi)
    return msg_vi

from flask import Blueprint, request, jsonify, redirect
import psycopg2
from vectoria_api.database import get_db_connection, release_db_connection

from werkzeug.security import generate_password_hash, check_password_hash

# Import DB_URL tập trung từ file config
from vectoria_api.config import DB_URL, FRONTEND_URL
import jwt
import secrets
from datetime import datetime, timedelta, timezone
import requests
from email.mime.text import MIMEText
import re

def is_strong_password(password):
    if len(password) < 8:
        return False
    if not re.search(r"[a-zA-Z]", password):
        return False
    if not re.search(r"[0-9]", password):
        return False
    return True

user_bp = Blueprint("user", __name__)


def init_user_db():
    try:
        conn = get_db_connection()
        c = conn.cursor()

        # 1. Bảng USER
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                display_name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL CHECK (email LIKE '%@%'),
                password_hash VARCHAR(255),
                auth_provider VARCHAR(20) DEFAULT 'local',
                google_id VARCHAR(255) UNIQUE,
                status VARCHAR(20) DEFAULT 'pending', 
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Cập nhật thêm các cột mới cho tính năng Bảo mật JWT và Đa ngôn ngữ (nếu chưa có)
        c.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1;")
        c.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS language_pref VARCHAR(10) DEFAULT 'vi';")
        
        # Thêm cột is_trusted và friendly_device cho thiết bị
        c.execute("ALTER TABLE loginhistory ADD COLUMN IF NOT EXISTS is_trusted BOOLEAN DEFAULT TRUE;")
        c.execute("ALTER TABLE loginhistory ADD COLUMN IF NOT EXISTS friendly_device VARCHAR(150);")
        c.execute("ALTER TABLE loginhistory ALTER COLUMN device_info TYPE TEXT;")

        # 2. Bảng Lịch sử đăng nhập 
        c.execute('''
            CREATE TABLE IF NOT EXISTS loginhistory (
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR(45),
                device_info TEXT,
                friendly_device VARCHAR(150),
                is_trusted BOOLEAN DEFAULT TRUE,
                PRIMARY KEY (user_id, login_at)
            )
        ''')

        # 3. Bảng Xác thực tài khoản
        c.execute('''
            CREATE TABLE IF NOT EXISTS accountactivations (
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                activation_token VARCHAR(255) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',
                is_used BOOLEAN NOT NULL DEFAULT FALSE,
                PRIMARY KEY (user_id, activation_token)
            )
        ''')

        # 4. Bảng Đặt lại mật khẩu
        c.execute('''
            CREATE TABLE IF NOT EXISTS passwordresets (
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                is_used BOOLEAN NOT NULL DEFAULT FALSE,
                PRIMARY KEY (user_id, token)
            )
        ''')
        conn.commit()
        release_db_connection(conn)
        print(">> [Database] Users, LoginHistory, AccountActivations & PasswordResets ready.")
    except Exception as e:
        print(f">> [Database Error - User DB] {e}")

# Tự động chạy tạo bảng khi khởi động backend
init_user_db()


def send_auth_email(to_email, subject, html_content):
    RESEND_AUTH_KEY = os.getenv("RESEND_AUTH_KEY") 
    
    if not RESEND_AUTH_KEY:
        print(">> [Email Error] Thiếu RESEND_AUTH_KEY trong biến môi trường!")
        return

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {RESEND_AUTH_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "from": "Vectoria Auth <support@vectoria.io.vn>", 
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code in [200, 201]:
            print(f">> [Resend System] Đã phát email kích hoạt thành công đến {to_email}")
        else:
            print(f">> [Resend Error] API trả về lỗi: {response.text}")
    except Exception as e:
        print(f">> [Email Error] Không thể kết nối tới Resend: {e}")


def process_device_login(c, user_id, display_name, email, language, request):
    """
    Xử lý kiểm tra và ghi nhận thiết bị đăng nhập theo chuẩn an ninh Enterprise.
    Tuân thủ 5 trạng thái logic:
    1. Chưa có tài khoản / Đăng nhập lần đầu: Tự động tin cậy thiết bị, không cảnh báo.
    2. Đăng nhập cùng thiết bị ban đầu: Thiết bị đã tin cậy, không cảnh báo.
    3. Đăng nhập thiết bị KHÁC (chưa tin cậy): Ghi nhận chưa tin cậy, gửi email cảnh báo với 2 lựa chọn.
    4. Xác nhận từ email cảnh báo: Cập nhật thiết bị thành tin cậy, không cảnh báo ở các lần sau.
    5. Đăng nhập thiết bị lạ tiếp theo: Tiếp tục gửi cảnh báo.
    """
    # 1. Trích xuất IP thực tế (xử lý proxy Cloudflare / Render)
    client_ip = (
        request.headers.get("CF-Connecting-IP")
        or (request.headers.get("X-Forwarded-For", "").split(",")[0].strip() if request.headers.get("X-Forwarded-For") else None)
        or request.remote_addr
        or "127.0.0.1"
    )

    # 2. Trích xuất và định danh thiết bị
    raw_user_agent = request.headers.get('User-Agent', 'Unknown Device')
    friendly_device = get_friendly_device(raw_user_agent, language)

    # 3. Kiểm tra số lần đăng nhập tin cậy của tài khoản
    c.execute("SELECT COUNT(*) FROM loginhistory WHERE user_id = %s AND is_trusted = TRUE", (user_id,))
    total_trusted_logins = c.fetchone()[0]

    # 4. Kiểm tra thiết bị hiện tại đã từng được tin cậy chưa (khớp theo user-agent hoặc friendly_device)
    c.execute("""
        SELECT 1 FROM loginhistory 
        WHERE user_id = %s 
          AND is_trusted = TRUE 
          AND (device_info = %s OR (friendly_device IS NOT NULL AND friendly_device = %s))
        LIMIT 1
    """, (user_id, raw_user_agent, friendly_device))
    is_already_trusted = c.fetchone() is not None

    if total_trusted_logins == 0:
        # Lần đầu tiên đăng nhập sau khi tạo tài khoản: Tự động tin cậy thiết bị ban đầu
        is_trusted_now = True
        is_new_device = False
    elif is_already_trusted:
        # Thiết bị đã được tin cậy từ trước (thiết bị ban đầu hoặc đã qua xác nhận)
        is_trusted_now = True
        is_new_device = False
    else:
        # Thiết bị mới / lạ: Chưa tin cậy, kích hoạt cảnh báo an ninh
        is_trusted_now = False
        is_new_device = True

    # 5. Ghi nhận nhật ký đăng nhập
    c.execute("""
        INSERT INTO loginhistory (user_id, ip_address, device_info, friendly_device, is_trusted) 
        VALUES (%s, %s, %s, %s, %s)
    """, (user_id, client_ip, raw_user_agent, friendly_device, is_trusted_now))

    # 6. Nếu phát hiện thiết bị lạ: Gửi email cảnh báo bảo mật chuẩn Enterprise
    if is_new_device:
        # Mã khẩn cấp khóa tài khoản và đổi mật khẩu (hạn 24 giờ)
        secure_token = secrets.token_hex(20)
        c.execute("""
            INSERT INTO passwordresets (user_id, token, expires_at) 
            VALUES (%s, %s, CURRENT_TIMESTAMP + INTERVAL '24 hours')
        """, (user_id, secure_token))

        # Mã JWT xác nhận thiết bị tin cậy (hạn 7 ngày)
        from vectoria_api.config import JWT_SECRET_KEY as SECRET_KEY
        confirm_token = jwt.encode(
            {
                "user_id": user_id, 
                "device_info": raw_user_agent, 
                "friendly_device": friendly_device,
                "action": "confirm_device", 
                "exp": datetime.now(timezone.utc) + timedelta(days=7)
            },
            SECRET_KEY, 
            algorithm="HS256"
        )

        # Xác định API Base động an toàn (ưu tiên request.host_url khi chạy dev/prod)
        api_base = os.getenv("API_BASE")
        if not api_base:
            api_base = request.host_url.rstrip("/")

        confirm_link = f"{api_base}/api/confirm-device?token={confirm_token}"
        secure_link = f"{api_base}/api/secure-account?token={secure_token}"

        from datetime import timezone as dt_timezone
        tz_vn = dt_timezone(timedelta(hours=7))
        current_time_str = datetime.now(tz_vn).strftime("%H:%M:%S (UTC+7), %d/%m/%Y")

        subject = (
            "[Vectoria] Security Alert: New sign-in detected"
            if language == 'en' else
            "[Vectoria] Cảnh báo an ninh: Phát hiện đăng nhập từ thiết bị mới"
        )

        email_content = get_security_alert_email(
            display_name=display_name,
            friendly_device=friendly_device,
            client_ip=client_ip,
            login_time=current_time_str,
            confirm_link=confirm_link,
            secure_link=secure_link,
            lang=language
        )

        send_auth_email(email, subject, email_content)


# --- API ĐĂNG KÝ TÀI KHOẢN ---
@user_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    display_name = data.get("display_name")
    email = data.get("email")
    password = data.get("password")
    language = data.get("language", "vi")

    if not display_name or not email or not password:
        return jsonify({"status": "error", "message": tr_msg("Vui lòng điền đầy đủ thông tin!")}), 400

    if not is_strong_password(password):
        return jsonify({"status": "error", "message": tr_msg("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ và số!")}), 400

    hashed_password = generate_password_hash(password, method="pbkdf2:sha256")

    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # 1. Tạo tài khoản với language_pref
        c.execute(
            "INSERT INTO users (display_name, email, password_hash, language_pref) VALUES (%s, %s, %s, %s) RETURNING id",
            (display_name, email, hashed_password, language)
        )
        user_id = c.fetchone()[0]

        # 2. Tạo mã token kích hoạt bảo mật ngẫu nhiên
        activation_token = secrets.token_hex(20)

        # 3. Lưu token vào bảng accountactivations (hết hạn sau 24 giờ)
        c.execute(
            "INSERT INTO accountactivations (user_id, activation_token, expires_at) VALUES (%s, %s, CURRENT_TIMESTAMP + INTERVAL '24 hours')",
            (user_id, activation_token)
        )
        conn.commit()
        
        # 4. Gửi email kích hoạt
        referer = request.headers.get("Referer", "")
        if referer and "login.html" in referer:
            base_url = referer.split("login.html")[0].rstrip("/")
        else:
            base_url = request.headers.get("Origin", FRONTEND_URL) + "/frontend_v2" if "127.0.0.1" in request.headers.get("Origin", "") or "localhost" in request.headers.get("Origin", "") else request.headers.get("Origin", FRONTEND_URL)
        
        activation_link = f"{base_url}/login.html?verify_token={activation_token}"
        
        if language == 'en':
            email_content = get_modern_email(
                title="Confirm your account",
                greeting=f"Hi {display_name},",
                paragraphs=["Thanks for signing up for Vectoria. Please confirm your email address to complete your registration."],
                btn_text="Verify Email",
                btn_link=activation_link,
                fallback_link=activation_link,
                lang="en"
            )
            send_auth_email(email, "[Vectoria] Verify your account", email_content)
        else:
            email_content = get_modern_email(
                title="Xác thực tài khoản",
                greeting=f"Chào bạn, {display_name},",
                paragraphs=["Cảm ơn bạn đã đăng ký. Vui lòng xác thực email để hoàn tất quá trình đăng ký."],
                btn_text="Xác thực ngay",
                btn_link=activation_link,
                fallback_link=activation_link,
                lang="vi"
            )
            send_auth_email(email, "[Vectoria] Xác thực tài khoản", email_content)

        return jsonify({"status": "success", "message": tr_msg("Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.")}), 201
    
    except psycopg2.IntegrityError:
        return jsonify({"status": "error", "message": tr_msg("Email này đã được sử dụng!")}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": f"System Error: {str(e)}"}), 500
    finally:
        if 'conn' in locals():
            release_db_connection(conn)


# --- API XÁC THỰC KÍCH HOẠT TÀI KHOẢN ---
@user_bp.route("/api/verify", methods=["GET"])
def verify_account():
    token = request.args.get("token")
    
    if not token:
        return jsonify({"status": "error", "message": tr_msg("Thiếu mã xác thực!")}), 400

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Kiểm tra token có hợp lệ không
        c.execute(
            "SELECT user_id, is_used FROM accountactivations WHERE activation_token = %s AND expires_at > CURRENT_TIMESTAMP",
            (token,)
        )
        result = c.fetchone()

        if not result:
            return jsonify({"status": "error", "message": tr_msg("Mã xác thực không hợp lệ hoặc đã hết hạn!")}), 400
            
        user_id = result[0]
        is_used = result[1]

        if is_used:
            return jsonify({"status": "error", "message": tr_msg("Tài khoản này đã được kích hoạt rồi!")}), 400

        # Cập nhật trạng thái tài khoản
        c.execute("UPDATE users SET status = 'active' WHERE id = %s", (user_id,))
        c.execute("UPDATE accountactivations SET is_used = TRUE WHERE activation_token = %s", (token,))
        
        conn.commit()
        return jsonify({"status": "success", "message": tr_msg("Tài khoản đã được kích hoạt thành công!")}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"System Error: {str(e)}"}), 500
    finally:
        if 'conn' in locals():
            release_db_connection(conn)


# --- API ĐĂNG NHẬP TÀI KHOẢN ---
@user_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    language = data.get("language", "vi")

    if not email or not password:
        return jsonify({"status": "error", "message": tr_msg("Vui lòng nhập Email và Mật khẩu!")}), 400

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Không cập nhật ngôn ngữ ưu tiên từ Frontend nữa. Chỉ lấy từ DB ra.


        # Tìm kiếm tài khoản bằng email
        c.execute("SELECT id, display_name, email, password_hash, status, token_version, avatar_url, language_pref FROM users WHERE email = %s", (email,))
        user = c.fetchone()

        if user and check_password_hash(user[3], password):
            user_id = user[0]
            display_name = user[1]
            user_status = user[4]
            token_version = user[5]
            avatar_url = user[6]
            user_lang = user[7]
            
            if user_status == 'pending':
                return jsonify({
                    "status": "error", 
                    "message": "Tài khoản của bạn chưa được kích hoạt! Vui lòng kiểm tra email."
                }), 403
            
            if user_status in ['locked', 'banned']:
                return jsonify({
                    "status": "error", 
                    "message": "Tài khoản này hiện đang bị khóa hoặc bị cấm truy cập!"
                }), 403

            # Xử lý kiểm tra và ghi nhận thiết bị đăng nhập theo chuẩn an ninh Enterprise
            process_device_login(c, user_id, display_name, user[2], user_lang, request)
            conn.commit()

            # Trả về token JWT thực sự
            from vectoria_api.config import JWT_SECRET_KEY as SECRET_KEY
            real_token = jwt.encode(
                {"user_id": user_id, "token_version": token_version, "exp": datetime.now(timezone.utc) + timedelta(days=7)},
                SECRET_KEY, 
                algorithm="HS256"
            )

            return jsonify({
                "status": "success",
                "token": real_token,
                "display_name": display_name,
                "email": user[2],
                "avatar_url": avatar_url,
                "language": user_lang
            }), 200
        else:
            return jsonify({"status": "error", "message": tr_msg("Email hoặc mật khẩu không đúng!")}), 401
    except Exception as e:
        return jsonify({"status": "error", "message": f"System Error: {str(e)}"}), 500
    finally:
        if 'conn' in locals(): release_db_connection(conn)


# --- API QUÊN MẬT KHẨU ---
@user_bp.route("/api/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()
    email = data.get("email")
    language = data.get("language", "vi")

    if not email:
        return jsonify({"status": "error", "message": tr_msg("Vui lòng nhập Email!")}), 400

    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("SELECT id, display_name, language_pref FROM users WHERE email = %s", (email,))
        user = c.fetchone()
        
        if not user:
            return jsonify({"status": "success", "message": tr_msg("Nếu email tồn tại, thư khôi phục đã được gửi.")}), 200

        user_id = user[0]
        display_name = user[1]
        
        # Nếu người dùng đang dùng ngôn ngữ nào trên web thì email cũng sẽ gửi theo ngôn ngữ đó (có thể cập nhật luôn db)
        c.execute("UPDATE users SET language_pref = %s WHERE id = %s", (language, user_id))
        
        reset_token = secrets.token_hex(20)

        c.execute(
            "INSERT INTO passwordresets (user_id, token, expires_at) VALUES (%s, %s, CURRENT_TIMESTAMP + INTERVAL '1 hour')",
            (user_id, reset_token)
        )
        conn.commit()

        referer = request.headers.get("Referer", "")
        if referer and "login.html" in referer:
            base_url = referer.split("login.html")[0].rstrip("/")
        else:
            base_url = request.headers.get("Origin", FRONTEND_URL) + "/frontend_v2" if "127.0.0.1" in request.headers.get("Origin", "") or "localhost" in request.headers.get("Origin", "") else request.headers.get("Origin", FRONTEND_URL)
            
        reset_link = f"{base_url}/login.html?reset_token={reset_token}"
        
        if language == 'en':
            email_content = get_modern_email(
                title="Reset your password",
                greeting=f"Hi {display_name},",
                paragraphs=["We received a request to reset the password for your Vectoria account. Click the button below to choose a new password."],
                btn_text="Reset Password",
                btn_link=reset_link,
                fallback_link=reset_link,
                lang="en"
            )
            send_auth_email(email, "[Vectoria] Reset your password", email_content)
        else:
            email_content = get_modern_email(
                title="Đặt lại mật khẩu",
                greeting=f"Chào bạn, {display_name},",
                paragraphs=["Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Vectoria của bạn. Nhấn vào nút bên dưới để tạo mật khẩu mới."],
                btn_text="Đặt lại mật khẩu",
                btn_link=reset_link,
                fallback_link=reset_link,
                lang="vi"
            )
            send_auth_email(email, "[Vectoria] Đặt lại mật khẩu", email_content)

        return jsonify({"status": "success", "message": tr_msg("Nếu email tồn tại, thư khôi phục đã được gửi.")}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"System Error: {str(e)}"}), 500
    finally:
        if 'conn' in locals(): release_db_connection(conn)


# --- API ĐẶT LẠI MẬT KHẨU MỚI ---
@user_bp.route("/api/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()
    token = data.get("token")
    new_password = data.get("new_password")

    if not token or not new_password:
        return jsonify({"status": "error", "message": tr_msg("Thiếu thông tin yêu cầu!")}), 400

    if not is_strong_password(new_password):
        return jsonify({"status": "error", "message": tr_msg("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ và số!")}), 400

    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("""
            SELECT user_id FROM passwordresets 
            WHERE token = %s AND is_used = FALSE AND expires_at > CURRENT_TIMESTAMP
        """, (token,))
        result = c.fetchone()

        if not result:
            return jsonify({"status": "error", "message": tr_msg("Đường dẫn đổi mật khẩu không hợp lệ hoặc đã hết hạn!")}), 400

        user_id = result[0]
        hashed_password = generate_password_hash(new_password)

        # Cập nhật mật khẩu mới, đồng thời MỞ KHÓA tài khoản (nếu đang bị khóa) và vô hiệu hóa token cũ
        c.execute("UPDATE users SET password_hash = %s, status = 'active', token_version = token_version + 1 WHERE id = %s", (hashed_password, user_id))
        
        # Đánh dấu mã này đã dùng xong
        c.execute("UPDATE passwordresets SET is_used = TRUE WHERE user_id = %s AND token = %s", (user_id, token))
        
        conn.commit()
        return jsonify({"status": "success", "message": tr_msg("Thay đổi mật khẩu thành công! Tài khoản đã được bảo vệ.")}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"System Error: {str(e)}"}), 500
    finally:
        if 'conn' in locals(): release_db_connection(conn)




# --- API XÁC NHẬN THIẾT BỊ AN TOÀN ---
@user_bp.route("/api/confirm-device", methods=["GET"])
def confirm_device():
    token = request.args.get("token")
    lang = request.args.get("lang", "vi")
    if not token:
        return get_device_confirmation_page("invalid", None, FRONTEND_URL, lang), 400

    try:
        from vectoria_api.config import JWT_SECRET_KEY as SECRET_KEY
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        
        if payload.get("action") != "confirm_device":
            return get_device_confirmation_page("invalid", None, FRONTEND_URL, lang), 400
            
        user_id = payload.get("user_id")
        device_info = payload.get("device_info")
        friendly_device = payload.get("friendly_device")

        conn = get_db_connection()
        c = conn.cursor()

        # Cập nhật thiết bị thành is_trusted
        c.execute("""
            UPDATE loginhistory 
            SET is_trusted = TRUE 
            WHERE user_id = %s 
              AND (device_info = %s OR (friendly_device IS NOT NULL AND friendly_device = %s))
        """, (user_id, device_info, friendly_device))
        conn.commit()
        
        return get_device_confirmation_page("success", friendly_device, FRONTEND_URL, lang)
    except jwt.ExpiredSignatureError:
        return get_device_confirmation_page("expired", None, FRONTEND_URL, lang), 400
    except jwt.InvalidTokenError:
        return get_device_confirmation_page("invalid", None, FRONTEND_URL, lang), 400
    except Exception as e:
        return f"System Error: {str(e)}", 500
    finally:
        if 'conn' in locals():
            release_db_connection(conn)

# --- API BẢO VỆ TÀI KHOẢN KHI BỊ XÂM NHẬP ---
@user_bp.route("/api/secure-account", methods=["GET"])
def secure_account():
    token = request.args.get("token")
    lang = request.args.get("lang", "vi")
    if not token:
        return get_device_confirmation_page("invalid", None, FRONTEND_URL, lang), 400

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Kiểm tra token hợp lệ
        c.execute("""
            SELECT user_id FROM passwordresets 
            WHERE token = %s AND is_used = FALSE AND expires_at > CURRENT_TIMESTAMP
        """, (token,))
        result = c.fetchone()

        if not result:
            return get_device_confirmation_page("expired", None, FRONTEND_URL, lang), 400

        user_id = result[0]

        # Khóa tài khoản và vô hiệu hóa JWT token cũ ngay lập tức (Force Logout)
        c.execute("UPDATE users SET status = 'locked', token_version = token_version + 1 WHERE id = %s", (user_id,))
        conn.commit()
        
        # Chuyển hướng người dùng đến giao diện đặt lại mật khẩu của frontend
        return redirect(f"{FRONTEND_URL}/login.html?reset_token={token}&account_secured=1")
    except Exception as e:
        return f"System Error: {str(e)}", 500
    finally:
        if 'conn' in locals():
            release_db_connection(conn)

# --- API ĐĂNG NHẬP BẰNG GOOGLE ---
@user_bp.route("/api/google-login", methods=["POST"])
def google_login():
    data = request.get_json()
    access_token = data.get("access_token")
    language = data.get("language", "vi")

    if not access_token:
        return jsonify({"status": "error", "message": tr_msg("Thiếu mã xác thực Google!")}), 400

    try:
        google_api_url = f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={access_token}"
        google_res = requests.get(google_api_url)
        
        if google_res.status_code != 200:
            return jsonify({"status": "error", "message": tr_msg("Token Google không hợp lệ hoặc đã hết hạn!")}), 401
            
        user_info = google_res.json()
        email = user_info.get("email")
        google_id = user_info.get("sub")
        display_name = user_info.get("name", email.split('@')[0]) 

        conn = get_db_connection()
        c = conn.cursor()

        c.execute("SELECT id, status, auth_provider, token_version, avatar_url, language_pref FROM users WHERE email = %s", (email,))
        user = c.fetchone()
        
        # Không cập nhật language_pref từ frontend nếu user đã tồn tại

        if user:
            user_id = user[0]
            user_status = user[1]
            user_provider = user[2]
            token_version = user[3]
            avatar_url = user[4]
            user_lang = user[5]
            
            if user_provider == 'local':
                return jsonify({
                    "status": "error",
                    "message": "Email này đã được đăng ký bằng mật khẩu. Vui lòng đăng nhập bằng Email & Mật khẩu!"
                }), 400

            if user_status == 'pending':
                c.execute(
                    "UPDATE users SET status = 'active', google_id = %s WHERE id = %s", 
                    (google_id, user_id)
                )
            else:
                c.execute(
                    "UPDATE users SET google_id = %s WHERE id = %s AND google_id IS NULL", 
                    (google_id, user_id)
                )

            # Update avatar from Google if user has none
            if not avatar_url and user_info.get("picture"):
                avatar_url = user_info.get("picture")
                c.execute("UPDATE users SET avatar_url = %s WHERE id = %s", (avatar_url, user_id))
        else:
            avatar_url = user_info.get("picture")
            c.execute(
                "INSERT INTO users (display_name, email, auth_provider, google_id, status, language_pref, avatar_url) VALUES (%s, %s, 'google', %s, 'active', %s, %s) RETURNING id",
                (display_name, email, google_id, language, avatar_url)
            )
            user_id = c.fetchone()[0]
            token_version = 1
            user_lang = language

        # Xử lý kiểm tra và ghi nhận thiết bị đăng nhập theo chuẩn an ninh Enterprise
        process_device_login(c, user_id, display_name, email, user_lang, request)
        conn.commit()

        from vectoria_api.config import JWT_SECRET_KEY as SECRET_KEY
        real_token = jwt.encode(
            {"user_id": user_id, "token_version": token_version, "exp": datetime.now(timezone.utc) + timedelta(days=7)},
            SECRET_KEY, 
            algorithm="HS256"
        )

        return jsonify({
            "status": "success",
            "token": real_token,
            "display_name": display_name,
            "email": email,
            "avatar_url": avatar_url,
            "language": user_lang
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": f"System Error: {str(e)}"}), 500
    finally:
        if 'conn' in locals():
            release_db_connection(conn)

# --- API LẤY DANH SÁCH BÀI ĐÃ LƯU (BOOKMARKS) ---
@user_bp.route("/api/user/bookmarks", methods=["GET", "POST"])
@bookmark_token_required
def manage_user_bookmarks(user_id):
    try:
        from psycopg2.extras import RealDictCursor
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        if request.method == "POST":
            data = request.json
            topic_id = data.get("topic_id")
            order_index = data.get("order_index")
            note = bleach.clean(data.get("note", ""))
            action = data.get("action") # "save" or "remove"
            
            if not topic_id or order_index is None:
                return jsonify({"success": False, "message": "Missing topic_id or order_index"}), 400
                
            if action == "save":
                query = """
                    INSERT INTO saved_lessons (user_id, topic_id, order_index, note, saved_at, is_pinned)
                    VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, FALSE)
                    ON CONFLICT (user_id, topic_id, order_index) 
                    DO UPDATE SET note = EXCLUDED.note, saved_at = CURRENT_TIMESTAMP;
                """
                cursor.execute(query, (user_id, topic_id, order_index, note))
            elif action == "remove":
                query = """
                    DELETE FROM saved_lessons
                    WHERE user_id = %s AND topic_id = %s AND order_index = %s;
                """
                cursor.execute(query, (user_id, topic_id, order_index))
            else:
                return jsonify({"success": False, "message": "Invalid action"}), 400
                
            conn.commit()
            return jsonify({"success": True, "message": f"Bookmark {action}d successfully."}), 200

        # GET method
        query = """
            SELECT sl.topic_id, sl.order_index, sl.note, sl.saved_at, sl.is_pinned, l.title, l.complexity, l.time
            FROM saved_lessons sl
            LEFT JOIN lessons l ON sl.topic_id = l.topic_id AND sl.order_index = l.order_index
            WHERE sl.user_id = %s
            ORDER BY sl.is_pinned DESC, sl.saved_at DESC;
        """
        cursor.execute(query, (user_id,))
        bookmarks = cursor.fetchall()
        
        for b in bookmarks:
            b['saved_at'] = b['saved_at'].isoformat() if b['saved_at'] else None
            
        return jsonify({"success": True, "bookmarks": bookmarks}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): release_db_connection(conn)


# --- API BOOKMARK VỚI JWT AUTH (Frontend dùng endpoint này) ---


@user_bp.route("/api/bookmarks", methods=["GET", "POST"])
@bookmark_token_required
def manage_bookmarks_jwt(user_id):
    try:
        from psycopg2.extras import RealDictCursor
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        if request.method == "POST":
            data = request.json
            lesson_id = data.get("lesson_id")
            action = data.get("action")
            note = bleach.clean(data.get("note", ""))
            
            if not lesson_id:
                return jsonify({"success": False, "message": "Missing lesson_id"}), 400
            
            parts = lesson_id.rsplit('-', 1)
            if len(parts) == 2 and parts[1].isdigit():
                topic_id = parts[0]
                order_index = int(parts[1])
            else:
                topic_id = lesson_id
                order_index = 1
                
            # Temporary mapping for frontend mock data: if topic_id is 'l1', map to 't1'
            if topic_id == 'l1':
                topic_id = 't1'
                
            if action == "save":
                query = """
                    INSERT INTO saved_lessons (user_id, topic_id, order_index, note, saved_at, is_pinned)
                    VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, FALSE)
                    ON CONFLICT (user_id, topic_id, order_index) 
                    DO UPDATE SET note = EXCLUDED.note, saved_at = CURRENT_TIMESTAMP;
                """
                try:
                    cursor.execute(query, (user_id, topic_id, order_index, note))
                except psycopg2.errors.ForeignKeyViolation:
                    conn.rollback()
                    return jsonify({"success": False, "message": f"Bài học không tồn tại trong hệ thống (topic={topic_id}, index={order_index})"}), 400
            elif action == "remove":
                query = """
                    DELETE FROM saved_lessons
                    WHERE user_id = %s AND topic_id = %s AND order_index = %s;
                """
                cursor.execute(query, (user_id, topic_id, order_index))
            else:
                return jsonify({"success": False, "message": "Invalid action"}), 400
                
            conn.commit()
            return jsonify({"success": True, "message": f"Bookmark {action}d successfully."}), 200

        # GET
        query = """
            SELECT sl.topic_id, sl.order_index, sl.note, sl.saved_at, sl.is_pinned, l.title, l.complexity, l.time
            FROM saved_lessons sl
            LEFT JOIN lessons l ON sl.topic_id = l.topic_id AND sl.order_index = l.order_index
            WHERE sl.user_id = %s
            ORDER BY sl.is_pinned DESC, sl.saved_at DESC;
        """
        cursor.execute(query, (user_id,))
        bookmarks = cursor.fetchall()
        
        for b in bookmarks:
            b['saved_at'] = b['saved_at'].isoformat() if b['saved_at'] else None
            if b['topic_id'] == 't1' and b['order_index'] == 1:
                b['lesson_id'] = 'l1-1'
            else:
                b['lesson_id'] = f"{b['topic_id']}-{b['order_index']}"
            
        return jsonify({"success": True, "bookmarks": bookmarks}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): release_db_connection(conn)


# --- API LẤY LỊCH SỬ HỌC TẬP (HISTORY) ---
@user_bp.route("/api/user/history", methods=["GET"])
@bookmark_token_required
def get_user_history(user_id):
    try:
        from psycopg2.extras import RealDictCursor
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT topic_id, order_index, last_read_percent, visited_at
            FROM user_lesson_history
            WHERE user_id = %s
            ORDER BY visited_at DESC
            LIMIT 50;
        """
        cursor.execute(query, (user_id,))
        history = cursor.fetchall()
        
        for h in history:
            h['visited_at'] = h['visited_at'].isoformat()
            
        return jsonify({"success": True, "history": history}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals(): release_db_connection(conn)

# --- API ĐÁNH GIÁ & TỐI ƯU LỘ TRÌNH (GRAPH ROUTING) ---
from vectoria_api.routes.routing_logic import calculate_optimal_path
import json

@user_bp.route("/api/user/routing/optimize", methods=["POST"])
@bookmark_token_required
def optimize_routing(user_id):
    try:
        is_new, proposed, notes = calculate_optimal_path(user_id)
        return jsonify({
            "success": True, 
            "is_new_proposal": is_new, 
            "proposed_path": proposed, 
            "reasoning_notes": notes
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@user_bp.route("/api/user/routing/accept", methods=["POST"])
@bookmark_token_required
def accept_routing(user_id):
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Get proposed path
        c.execute("SELECT current_path, proposed_path FROM user_learning_paths WHERE user_id = %s", (user_id,))
        row = c.fetchone()
        if not row or not row[1]:
            return jsonify({"success": False, "message": "No proposed path found"}), 400
            
        current_path = row[0]
        proposed_path = row[1]
        
        # Backup to history_path (if exists) or just overwrite current_path
        # We can store the old current_path in proposed_path as a backup for rollback
        c.execute("""
            UPDATE user_learning_paths 
            SET current_path = %s, proposed_path = %s, is_pending_decision = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
        """, (json.dumps(proposed_path) if isinstance(proposed_path, list) else proposed_path, 
              json.dumps(current_path) if isinstance(current_path, list) else current_path, 
              user_id))
        conn.commit()
        
        return jsonify({"success": True, "message": "Routing accepted"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'c' in locals(): c.close()
        if 'conn' in locals(): release_db_connection(conn)

@user_bp.route("/api/user/routing/rollback", methods=["POST"])
@bookmark_token_required
def rollback_routing(user_id):
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # We stored the old path in proposed_path during accept
        c.execute("SELECT current_path, proposed_path FROM user_learning_paths WHERE user_id = %s", (user_id,))
        row = c.fetchone()
        if not row or not row[1]:
            return jsonify({"success": False, "message": "No rollback path found"}), 400
            
        current_path = row[0]
        backup_path = row[1]
        
        c.execute("""
            UPDATE user_learning_paths 
            SET current_path = %s, proposed_path = %s, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
        """, (json.dumps(backup_path) if isinstance(backup_path, list) else backup_path, 
              json.dumps(current_path) if isinstance(current_path, list) else current_path, 
              user_id))
        conn.commit()
        
        return jsonify({"success": True, "message": "Routing rolled back"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if 'c' in locals(): c.close()
        if 'conn' in locals(): release_db_connection(conn)

from vectoria_api.core.cloudinary_service import upload_avatar_to_cloudinary

@user_bp.route("/api/user/avatar", methods=["POST"])
def upload_avatar():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"success": False, "message": "Missing or invalid token"}), 401
    
    token = auth_header.split(" ")[1]
    try:
        import os
        from vectoria_api.config import JWT_SECRET_KEY as SECRET_KEY
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
    except Exception as e:
        return jsonify({"success": False, "message": "Invalid token"}), 401

    if "file" not in request.files:
        return jsonify({"success": False, "message": "No file uploaded"}), 400
        
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "message": "Empty file name"}), 400
        
    secure_url = upload_avatar_to_cloudinary(file, user_id)
    if not secure_url:
        return jsonify({"success": False, "message": "Failed to upload to Cloudinary"}), 500
        
    # Update DB
    try:
        from psycopg2 import connect
        from vectoria_api.config import DB_URL
        conn = connect(DB_URL)
        c = conn.cursor()
        c.execute("UPDATE users SET avatar_url = %s WHERE id = %s", (secure_url, user_id))
        conn.commit()
    except Exception as e:
        print(f"Error updating avatar in DB: {e}")
        return jsonify({"success": False, "message": "Failed to save avatar URL to database"}), 500
    finally:
        if 'c' in locals(): c.close()
        if 'conn' in locals(): release_db_connection(conn)
        
    return jsonify({"success": True, "avatar_url": secure_url})

@user_bp.route('/api/user/language', methods=['POST'])
@bookmark_token_required
def update_user_language(user_id):
    data = request.get_json()
    language = data.get('language')
    if not language:
        return jsonify({'success': False, 'message': 'Missing language'}), 400
    try:
        from psycopg2 import connect
        from vectoria_api.config import DB_URL
        conn = connect(DB_URL)
        c = conn.cursor()
        c.execute('UPDATE users SET language_pref = %s WHERE id = %s', (language, user_id))
        conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        if 'conn' in locals(): release_db_connection(conn)

