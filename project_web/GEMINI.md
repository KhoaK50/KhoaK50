# 1. Vectoria — Quy tắc làm việc bắt buộc

## 1.1 Thứ tự ưu tiên
1. Yêu cầu hiện tại của người dùng.
2. Code và cấu trúc đang tồn tại trong dự án.
3. Tài liệu kỹ thuật của dự án.
4. Chỉ được giả định khi không thể kiểm tra; phải ghi rõ giả định đó.

## 1.2 Không được hallucinate
- Không tự bịa API endpoint, database table/column, biến môi trường, package, cấu hình deploy, tài khoản, key, hoặc hành vi người dùng.
- Trước khi sửa, phải tìm và đọc phần code liên quan.
- Nếu yêu cầu mơ hồ làm thay đổi đáng kể kiến trúc, dữ liệu, bảo mật, chi phí hoặc giao diện, dừng lại và hỏi lại.
- Không nói “đã chạy”, “đã sửa”, “đã an toàn”, “đã deploy” nếu không có bằng chứng kiểm tra tương ứng.

## 1.3 Nguyên tắc sửa code
- Chỉ sửa phần tối thiểu cần thiết để hoàn thành task.
- Không tự refactor toàn dự án, đổi framework, thêm package hoặc thay đổi schema ngoài phạm vi task.
- Không thay toàn bộ file nếu chỉ cần sửa cục bộ.
- Không dùng mock, placeholder, fake success, hard-code secret hoặc bỏ qua kiểm tra lỗi để làm task “trông như chạy”.
- Không sửa, in ra, commit hoặc đưa secret vào frontend/repo.
- Không thực hiện hành động không đảo ngược như xoá dữ liệu, migration production, deploy, xoay key hay sửa cấu hình cloud nếu chưa được yêu cầu rõ ràng.

## 1.4 Bảo mật bắt buộc
- Mọi API liên quan dữ liệu cá nhân phải xác thực ở server và kiểm tra quyền sở hữu ở từng request.
- Không tin `user_id`, role, giá tiền hay quyền gửi từ frontend.
- Validate toàn bộ input ở server; giới hạn kích thước và độ phức tạp input khi phù hợp.
- Không trả stack trace, token, secret hay lỗi nội bộ cho client.
- Khi sửa endpoint có dữ liệu người dùng, phải thêm hoặc cập nhật test chống IDOR.

## 1.5 Kiểm chứng trước khi hoàn thành
- Chạy lint, build và các test liên quan nếu môi trường cho phép.
- Nếu có bug hoặc lỗ hổng, thêm regression test để lỗi đó không quay lại.
- Nếu không chạy được test, nêu chính xác lý do; không được tuyên bố task hoàn thành hoàn toàn.
- Kiểm tra các luồng lỗi, quyền truy cập và dữ liệu biên — không chỉ happy path.

## 1.6 Mẫu báo cáo cuối task
1. Kết quả đã làm.
2. File đã sửa và lý do.
3. Kiểm chứng đã chạy cùng kết quả.
4. Điều chưa kiểm chứng hoặc rủi ro còn lại.
5. Không tự đề xuất mở rộng phạm vi trừ khi đó là blocker thực sự.

---

# 2. Database Schema Specification Format
Whenever discussing, creating, or modifying database entities and attributes, you MUST present the schema using the exact Markdown table format below to match the project's documentation standards.

**Thực thể: [Tên thực thể]**
- **Loại thực thể:** [Thực thể mạnh / Thực thể yếu]
- **Quan hệ (Relationships):** [Mô tả ngắn gọn quan hệ 1-1, 1-N, N-N]

| Thực thể | Loại thực thể | Thuộc tính | Ràng buộc (Constraints) | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| `tên_bảng` | [Loại] | `tên_cột` (Kiểu dữ liệu) | [PK, FK, NOT NULL, v.v.] | [Giải thích] |
| | | `cột_2` (Kiểu dữ liệu) | | |

---

# 3. UI/UX Anti-Slop Design Rules (Chắt lọc từ taste-skill)

Các quy tắc dưới đây được trích xuất từ hệ sinh thái `taste-skill-main` và tinh chỉnh cho bối cảnh Vectoria (nền tảng giáo dục trực tuyến, đối tượng là sinh viên Việt Nam). Mọi task liên quan đến giao diện PHẢI tuân thủ.

## 3.1 Tối ưu Đầu ra Code (Full-Output Enforcement)
- Không bao giờ sinh code kiểu `// ...`, `// rest of code`, `// phần này giữ nguyên`, `// TODO`, `/* ... */`, `// similar to above`. Mọi đoạn code sinh ra phải hoàn chỉnh 100%, sẵn sàng chạy.
- Nếu output quá dài, viết đầy đủ đến một điểm dừng tự nhiên (hết function, hết file) rồi thông báo rõ ràng phần còn lại, không bao giờ cắt xén âm thầm.
- Không bao giờ mô tả code nên làm gì thay vì viết code đó ra.

## 3.2 Bố cục & Hero Section
- **Cấm rập khuôn Hero:** Tuyệt đối tránh kiểu bố cục Hero mặc định của AI (bên trái 1 khối Text, bên phải 1 tấm hình). Phải cân nhắc các phương án: Text canh giữa đè lên hình nền, Stacked center, Text phải / Hình trái, hoặc bố cục Editorial lệch lưới. Chỉ dùng kiểu trái-Text/phải-Hình khi nó thực sự là lựa chọn tốt nhất cho ngữ cảnh.
- **Cấm Layout 3-cột rập khuôn:** Cấm kiểu xếp 3 thẻ (Card) giống hệt nhau nằm ngang đều tăm tắp. Bắt buộc dùng Zig-zag (xoay chiều), Bất đối xứng (Asymmetrical Bento), lưới Masonry, hoặc cuộn ngang (horizontal-scroll).
- **Navbar:** Không làm thanh điều hướng dính chặt vào viền trên một cách cứng nhắc rập khuôn. Nếu dùng sticky navbar, phải có hiệu ứng phân biệt (backdrop blur, đổ bóng nhẹ khi cuộn, thu nhỏ padding).
- **Page Theme Lock:** Trang có MỘT theme duy nhất (light, dark, hoặc auto). Cấm pha trộn một Section nền sáng vào giữa trang đang tối (hoặc ngược lại). Các biến thể nhẹ trong cùng họ màu thì được (VD: `--bg-body` kế `--bg-card`).

## 3.3 Typography (Định dạng kiểu LaTeX PDF - Tiêu chuẩn Cao)
- **Font chữ bắt buộc:** Dùng font học thuật chuyên dụng làm mặc định cho **100% UI** (Heading, Body, Button, Navigation). Ưu tiên `Latin Modern Roman` (nếu có bản đủ Tiếng Việt), hoặc dùng `STIX Two Text` / `Libertinus Serif` để đảm bảo 100% hiển thị hoàn hảo dấu Tiếng Việt.
- **Cấm dùng CDN bên ngoài (Self-hosting bắt buộc):** Tuyệt đối không dùng Google Fonts hay các đường dẫn trung gian. Phải tải file font (`.woff2`) về lưu trữ tĩnh trực tiếp trên server dự án để tránh rủi ro bị geoblock (chặn IP quốc gia) và loại bỏ hoàn toàn độ trễ kết nối (network delay).
- **Kỹ thuật tải Font & Fallback:** Bắt buộc preload font trong `<head>`. Chuỗi fallback trong Tailwind: `['Font_Hoc_Thuat', 'Times New Roman', 'Times', 'serif']`.
- **Chống Layout Shift (CLS):** Bắt buộc dùng `size-adjust`, `ascent-override` ở CSS `@font-face` để đồng bộ kích thước khung hình của font dự phòng sao cho khớp tuyệt đối với font chính.
- **Cấm Sans-serif:** Cấm sử dụng các font sans-serif (Inter, Roboto) ở bất kỳ đâu trên giao diện. Ghi đè toàn bộ `theme.fontFamily` của Tailwind.
- **Render Toán học (Bất khả xâm phạm):** Giữ nguyên engine mặc định của KaTeX/MathJax. Tuyệt đối không dùng CSS toàn cục can thiệp vào `font-family`, `letter-spacing`, `margin`, hay `line-height` của các class toán học.

## 3.4 Khối hình học & Chi tiết UI (Anti-Industrial App)
- **Định hướng UI:** Loại bỏ hoàn toàn cảm giác "App công nghiệp/SaaS rập khuôn". Giao diện phải mang lại trải nghiệm thị giác tĩnh lặng, chính xác của tài liệu PDF học thuật.
- **Bo góc & Đổ bóng:** Ép `border-radius` về mức sắc cạnh hoặc siêu nhỏ (`0px` đến `2px`). Không sử dụng `box-shadow` có màu sắc hoặc độ lan tỏa lớn; thay vào đó là cấu trúc phẳng (flat design). 
- **Đường phân cách:** Dùng không gian trắng (whitespace) và các đường viền mảnh (hairline borders, 1px solid) để phân chia bố cục, tương tự cách kẻ bảng `\hline` trong LaTeX.

## 3.5 Microcopy & Nội dung (Chống AI Slop)
- **Cấm Emoji làm trang trí:** Không nhét Emoji vào Heading, Card title, hoặc Button. Dùng Icon library đồng bộ (Phosphor, HugeIcons, Tabler, Radix Icons) nếu cần biểu tượng.
- **Cấm từ ngữ sáo rỗng (AI Clichés):** Cấm triệt để các cụm từ: "Nâng tầm", "Mượt mà", "Kỷ nguyên mới", "Thay đổi cuộc chơi", "Được tin dùng âm thầm", "Công nghệ tiên tiến", "Giải pháp toàn diện". Viết tiếng Việt học thuật, trực diện, cụ thể.
- **Cấm dữ liệu rác (Jane Doe Effect):** Không dùng tên giả kiểu "Nguyễn Văn A", "John Doe", "Acme Corp". Không dùng avatar SVG vô hồn (Dicebear, Boring Avatars). Chưa có dữ liệu thật thì để trống hoặc dùng chữ viết tắt (initials).
- **Cấm giả lập UI (Fake Product Previews):** Không vẽ Dashboard/Terminal/Task list giả bằng `<div>` styled trong Hero section. Dùng ảnh chụp màn hình thật, hình sinh ra từ công cụ, hoặc không dùng hình.
- **Cấm copy kiểu "Quietly in use at":** Không dùng các header social proof kiểu lắt léo. Viết thẳng: "Được sử dụng bởi", "Đối tác", hoặc bỏ header để logo tự nói.

## 3.6 Chi tiết siêu nhỏ (Micro-aesthetics)
- **Zero Em-dash (`—`):** Tuyệt đối không dùng dấu gạch ngang dài làm điểm nhấn thiết kế trong headline, button, eyebrow, pill, body, quote, caption, alt text. Chỉ dùng dấu gạch nối ngắn (`-`) hoặc dấu phẩy.
- **Cấm dấu chấm trạng thái (Status dots) vô nghĩa:** Không đặt chấm tròn màu trước text nếu nó không mang ý nghĩa trạng thái thực tế (Online/Offline, Hoàn thành/Chưa hoàn thành). Chấm trang trí thuần túy bị cấm.
- **Cấm ép ngắt dòng (`<br>`):** Không dùng `<br>` ngắt dòng headline một cách gượng ép để "trông nghệ thuật". Heading phải reflow tự nhiên theo viewport.
- **Cấm custom mouse cursor:** Không thay đổi con trỏ chuột mặc định trừ trường hợp tương tác cụ thể (drag, resize). Custom cursor toàn trang bị cấm.
- **Alt text phải mô tả thực:** Mọi thẻ `<img>` phải có `alt` mô tả nội dung cụ thể (VD: `alt="Biểu đồ phân rã ma trận SVD"`), không dùng `alt="Hình 1"`, `alt="Avatar"`, `alt="image"`.

## 3.7 Motion & Animation
- **Cấm animation vô tận:** Không dùng `animation: spin infinite` hoặc micro-animation lặp liên tục không có mục đích. Animation phải có trigger rõ ràng (hover, scroll into view, click).
- **Cấm ease-in-out mặc định:** Mọi transition phải dùng custom cubic-bezier hoặc spring physics cho cảm giác tự nhiên. Tránh `transition: all 0.3s ease-in-out` làm mặc định mọi nơi.
- **Tôn trọng `prefers-reduced-motion`:** Mọi animation phải có fallback `@media (prefers-reduced-motion: reduce)` để tắt hoặc giảm cho người dùng nhạy cảm.

## 3.8 Hình ảnh & Assets
- **Ưu tiên hình thật:** Nếu có công cụ sinh hình (image-gen), dùng nó để tạo asset phù hợp cho từng section. Nếu không, dùng ảnh chụp thật từ sản phẩm.
- **Cấm placeholder trống:** Không deploy code có `src="/placeholder.svg"`, `src=""`, hoặc broken image link. Nếu chưa có asset, dùng gradient/pattern background thay vì ảnh vỡ.
- **Cấm ảnh Corporate Memphis / 3D Pastel:** Không dùng hình minh họa kiểu người không mặt, bóng đèn 3D, bánh răng pastel. Với Vectoria, dùng ảnh chụp thật hoặc đồ họa toán học (graph, vector space, matrix) làm minh họa.
