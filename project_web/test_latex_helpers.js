import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import katex from './admin_v2/node_modules/katex/dist/katex.js';

// Nạp trực tiếp parseLatexToHTML từ frontend_v2/knowledge_info.html
function createParser(katexLib) {
  const htmlFile = fs.readFileSync('frontend_v2/knowledge_info.html', 'utf8');
  const funcStart = htmlFile.indexOf('function parseLatexToHTML(texString) {');
  assert.ok(funcStart !== -1, 'Tìm thấy hàm parseLatexToHTML trong knowledge_info.html');
  const afterFunc = htmlFile.substring(funcStart);
  const funcEnd = afterFunc.indexOf('function formatLessonBody');
  assert.ok(funcEnd !== -1, 'Tìm thấy điểm kết thúc hàm');
  const funcBody = afterFunc.substring(0, funcEnd).trim();
  const tr = (key, fallback) => fallback;
  return new Function('katex', 'tr', `
    ${funcBody}
    return parseLatexToHTML;
  `)(katexLib, tr);
}

const parser = createParser(katex);

test('Fix 1: Box with multi-paragraphs does not corrupt HTML divs into <p>', () => {
  const tex = '\\begin{dn}\nĐoạn 1 của định nghĩa.\n\nĐoạn 2 của định nghĩa.\n\\end{dn}';
  const out = parser(tex);
  assert.ok(!out.includes('</div></div></p>'), 'DOM không bị lỗi lồng unclosed <div> trong <p>');
  assert.ok(out.includes('<div class="latex-box latex-box-dn">'), 'Có box dn');
  assert.ok(out.includes('Đoạn 1 của định nghĩa'), 'Có đoạn 1');
  assert.ok(out.includes('Đoạn 2 của định nghĩa'), 'Có đoạn 2');
});

test('Fix 2: Math containing \\textbf and operators does not fail KaTeX', () => {
  const tex = 'Cho hàm số $f(\\textbf{x}) = 0$ và $x < 5 \\land y > 10$.';
  const out = parser(tex);
  assert.ok(!out.includes('<strong style="font-weight: 700;">x</strong>'), 'Không bị replace HTML vào trong math');
  assert.ok(out.includes('katex'), 'KaTeX render thành công');
});

test('Fix 3: Tabular containing matrix in a cell is not split brokenly', () => {
  const tex = `
\\begin{tabular}{|c|c|}
\\hline
$\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$ & Kết quả \\\\
\\hline
\\end{tabular}
  `.trim();
  const out = parser(tex);
  assert.ok(out.includes('<table class="latex-table"'), 'Có bảng');
  assert.ok(!out.includes('4 \\end{pmatrix}</td>'), 'Matrix không bị xé vụn bởi split \\\\');
  assert.ok(out.includes('katex'), 'KaTeX matrix render thành công trong ô bảng');
});

test('Fix 4: Multicols with curly braces {2} does not leave raw {2}', () => {
  const tex = '\\begin{multicols}{2}\nCột 1 và cột 2\n\\end{multicols}';
  const out = parser(tex);
  assert.ok(!out.includes('{2}'), 'Không bị lộ chữ {2} thô');
  assert.ok(out.includes('latex-multicols cols-2'), 'Có container 2 cột');
});

test('Fix 5: Text before first \\item in itemize is preserved', () => {
  const tex = '\\begin{itemize}\nLời giới thiệu danh sách\n\\item Mục 1\n\\item Mục 2\n\\end{itemize}';
  const out = parser(tex);
  assert.ok(out.includes('Lời giới thiệu danh sách'), 'Lời giới thiệu không bị nuốt mất');
});

test('Fix 6: Balanced braces prevent caption and section truncation on math braces', () => {
  const tex1 = '\\caption{Hình 1: Tập hợp $\\mathbb{R}$ và cơ sở $\\{v_1, v_2\\}$}';
  const tex2 = '\\section{Không gian $\\mathbb{R}^n$ và $\{e_1, \\dots, e_n\}$}';
  const tex3 = '\\textbf{Vector $\\vec{v} \\in \\mathbb{R}^n$ quan trọng}';

  const out1 = parser('\\begin{figure}' + tex1 + '\\end{figure}');
  const out2 = parser(tex2);
  const out3 = parser(tex3);

  const beforeFigCap = out1.substring(out1.indexOf('<figure'), out1.indexOf('<figcaption'));
  assert.ok(!beforeFigCap.includes('và cơ sở'), 'Caption không bị tràn ra ngoài figcaption');
  assert.ok(out1.includes('figcaption'), 'Có figcaption');
  assert.ok(out2.includes('Không gian'), 'Section đủ nội dung');
  assert.ok(out2.includes('</h2>'), 'Section đóng đúng vị trí');
  assert.ok(out3.includes('Vector'), 'Textbf đủ nội dung');
});

test('Fix 7: Standalone Huge and \\textbf{\\Huge ...} do not leave raw \\Huge', () => {
  const tex = '\\textbf{\\Huge ĐẠI SỐ TUYẾN TÍNH}';
  const out = parser(tex);
  assert.ok(!out.includes('\\Huge'), 'Không còn chữ \\Huge thô');
  assert.ok(out.includes('ĐẠI SỐ TUYẾN TÍNH'), 'Có tiêu đề lớn');
});

test('Fix 8: Preamble macros (setlength, definecolor, newtheorem) are stripped', () => {
  const tex = '\\setlength{\\parindent}{0pt}\\definecolor{maincolor}{rgb}{0.1,0.2,0.3}\\newtheorem{dn}{Dinh nghia}\nNoi dung sach';
  const out = parser(tex);
  assert.ok(!out.includes('\\setlength'), 'Không còn \\setlength');
  assert.ok(!out.includes('\\definecolor'), 'Không còn \\definecolor');
  assert.ok(!out.includes('\\newtheorem'), 'Không còn \\newtheorem');
  assert.ok(out.includes('Noi dung sach'), 'Nội dung sách vẫn hiển thị');
});

test('Fix 9: extractBalancedBraces handles double backslash before closing brace \\\\}', () => {
  const tex = '\\textbf{ĐỀ TÀI NGHIÊN CỨU KHOA HỌC\\\\}\nNội dung tiếp theo';
  const out = parser(tex);
  assert.ok(out.includes('<strong style="font-weight: 700;">ĐỀ TÀI NGHIÊN CỨU KHOA HỌC'), 'textbf được bao đóng chính xác');
  assert.ok(!out.includes('\\textbf{'), 'Không để sót thẻ \\textbf{ thô');
  assert.ok(out.includes('Nội dung tiếp theo'), 'Nội dung sau textbf không bị nuốt');
});

test('Fix 10: Math with matrix does not leak math tokens into KaTeX or display red error', () => {
  const tex = 'Cho $\\lambda = 2$ và $A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$. Khi đó:';
  const out = parser(tex);
  assert.ok(!out.includes('KATEX_MATH_DISP'), 'Không rò rỉ token KATEX_MATH_DISP');
  assert.ok(!out.includes('katex-error'), 'Không bị lỗi KaTeX parse error màu đỏ');
  assert.ok(out.includes('katex'), 'KaTeX biên dịch thành công ma trận');
});

test('Fix 11: Font size environments \\begin{Large} and \\begin{huge} are converted cleanly', () => {
  const tex = '\\begin{Large}Trường ĐH Bách Khoa\\end{Large}\n\\begin{huge}Khoa CNTT\\end{huge}';
  const out = parser(tex);
  assert.ok(!out.includes('\\begin{Large}'), 'Không còn \\begin{Large}');
  assert.ok(!out.includes('\\end{Large}'), 'Không còn \\end{Large}');
  assert.ok(!out.includes('\\begin{huge}'), 'Không còn \\begin{huge}');
  assert.ok(!out.includes('\\end{huge}'), 'Không còn \\end{huge}');
  assert.ok(out.includes('Trường ĐH Bách Khoa'), 'Nội dung trường được giữ nguyên');
  assert.ok(out.includes('Khoa CNTT'), 'Nội dung khoa được giữ nguyên');
  assert.ok(out.includes('<div style="font-size: 1.3rem;'), 'Được render thành div HTML thật chứ không bị escape');
  assert.ok(!out.includes('&lt;div'), 'Tuyệt đối không bị escape thành &lt;div');
});

test('Fix 12: Zero AI-slop colored vertical bars and uppercase badges; Overleaf quiet styling', () => {
  const tex = `
\\begin{dn}[Ma trận vuông]
Ma trận có số hàng bằng số cột.
\\end{dn}
\\begin{vd}
Ví dụ về ma trận đơn vị.
\\end{vd}
\\begin{proof}
Chứng minh bằng phản chứng.
\\end{proof}
  `.trim();
  const out = parser(tex);

  // 1. Không có thanh dọc màu AI-slop
  assert.ok(!out.includes('border-left: 3px solid'), 'Tuyệt đối KHÔNG có border-left: 3px solid');
  assert.ok(!out.includes('border-left: 2px solid'), 'Tuyệt đối KHÔNG có border-left: 2px solid');
  assert.ok(!out.includes('latex-box-label'), 'Tuyệt đối KHÔNG có thẻ nhãn hoa uppercase latex-box-label');

  // 2. Định nghĩa là đoạn văn serif học thuật với tiêu đề in đậm inline
  assert.ok(out.includes('<strong>Định nghĩa (Ma trận vuông).</strong>'), 'Định nghĩa dùng tiêu đề inline bold chuẩn Overleaf');

  // 3. Ví dụ là thẻ phẳng 1px viền kín
  assert.ok(out.includes('latex-box-vd'), 'Có container ví dụ');
  assert.ok(out.includes('<strong>Ví dụ.</strong>'), 'Ví dụ có tiêu đề inline bold');

  // 4. Chứng minh sạch sẽ với tombstone
  assert.ok(out.includes('<em>Chứng minh.</em>'), 'Chứng minh dùng tiêu đề nghiêng');
  assert.ok(out.includes('latex-tombstone'), 'Chứng minh có tombstone kết thúc');
});

test('Fix 13: Preamble title, author, date are preserved and rendered with maketitle', () => {
  const tex = `
\\documentclass{article}
\\title{ĐẠI SỐ TUYẾN TÍNH NÂNG CAO}
\\author{TS. Nguyễn Văn A}
\\date{2026}
\\begin{document}
\\maketitle
\\section{Mở đầu}
Nội dung bài viết.
\\end{document}
  `.trim();
  const out = parser(tex);
  assert.ok(out.includes('ĐẠI SỐ TUYẾN TÍNH NÂNG CAO'), 'Tiêu đề trong preamble được hiển thị');
  assert.ok(out.includes('TS. Nguyễn Văn A'), 'Tác giả trong preamble được hiển thị');
  assert.ok(out.includes('2026'), 'Ngày tháng được hiển thị');
  assert.ok(out.includes('latex-titlepage'), 'Có container titlepage');
});

test('Fix 14: Headings with optional arguments like \\section[short]{full} and \\chapter[short]{full}', () => {
  const tex = `
\\chapter[C1]{Chương 1: Tổng quan}
\\section[GT]{Giới thiệu chi tiết}
\\subsection[TM]{Tiểu mục 1.1}
  `.trim();
  const out = parser(tex);
  assert.ok(out.includes('<h1 class="latex-chapter"'), 'Chapter được parse thành h1');
  assert.ok(out.includes('Chương 1: Tổng quan</h1>'), 'Nội dung chapter đầy đủ');
  assert.ok(out.includes('<h2 class="latex-section"'), 'Section được parse thành h2');
  assert.ok(out.includes('Giới thiệu chi tiết</h2>'), 'Nội dung section đầy đủ');
  assert.ok(out.includes('<h3 class="latex-subsection"'), 'Subsection được parse thành h3');
  assert.ok(out.includes('Tiểu mục 1.1</h3>'), 'Nội dung subsection đầy đủ');
  assert.ok(!out.includes('<br/>section'), 'Không bị gãy thành <br/>section');
});

test('Fix 15: Theorem and Corollary use academic italic content with upright strong title', () => {
  const tex = `
\\begin{dl}[Pythagore]
Trong tam giác vuông, bình phương cạnh huyền bằng tổng bình phương hai cạnh góc vuông.
\\end{dl}
\\begin{hq}
Cạnh huyền luôn lớn hơn từng cạnh góc vuông.
\\end{hq}
  `.trim();
  const out = parser(tex);
  assert.ok(out.includes('latex-box-dl'), 'Có box định lý');
  assert.ok(out.includes('<strong>Định lý (Pythagore).</strong>'), 'Tiêu đề định lý in đậm');
  assert.ok(out.includes('.latex-box-dl .latex-box-content'), 'CSS có quy tắc định lý');
  assert.ok(out.includes('font-style: italic'), 'Nội dung định lý theo phong cách italic chuẩn Overleaf');
});

test('Fix 16: Vietnamese academic environment aliases (dinhnghia, vidu, dinhly, baitap)', () => {
  const tex = `
\\begin{dinhnghia}
Khái niệm cơ sở.
\\end{dinhnghia}
\\begin{vidu}
Ví dụ minh họa.
\\end{vidu}
\\begin{dinhly}
Định lý quan trọng.
\\end{dinhly}
\\begin{baitap}
Bài tập áp dụng.
\\end{baitap}
  `.trim();
  const out = parser(tex);
  assert.ok(out.includes('<strong>Định nghĩa.</strong>'), 'dinhnghia map chuẩn nhãn Định nghĩa');
  assert.ok(out.includes('<strong>Ví dụ.</strong>'), 'vidu map chuẩn nhãn Ví dụ');
  assert.ok(out.includes('latex-box-vd'), 'vidu có box ví dụ');
  assert.ok(out.includes('<strong>Định lý.</strong>'), 'dinhly map chuẩn nhãn Định lý');
  assert.ok(out.includes('<strong>Bài tập.</strong>'), 'baitap map chuẩn nhãn Bài tập');
});

test('Fix 17: Multiline math environments (gather, multline) render cleanly in KaTeX without errors', () => {
  const tex = `
\\begin{gather}
x + y = 10 \\\\
2x - y = 5
\\end{gather}
  `.trim();
  const out = parser(tex);
  assert.ok(!out.includes('katex-error'), 'gather biên dịch KaTeX không bị lỗi');
  assert.ok(out.includes('katex-display-wrapper'), 'Có container hiển thị khối toán học');
});

test('Fix 18: Literal dollar sign \\$ is preserved without breaking adjacent inline math', () => {
  const tex = 'Chi phí là \\$50 và công thức nghiệm là $x = \\frac{-b}{2a}$.';
  const out = parser(tex);
  assert.ok(out.includes('$50'), 'Ký tự dollar $50 được hiển thị đúng');
  assert.ok(out.includes('katex'), 'Công thức nghiệm được KaTeX biên dịch');
  assert.ok(!out.includes('frac{-b}{2a}$'), 'Công thức không bị dở dang do \\$');
});

test('Fix 19: Maketitle outputs real HTML div rather than escaped &lt;div', () => {
  const tex = '\\title{Giải Tích Số}\n\\author{Nguyễn Văn B}\n\\maketitle';
  const out = parser(tex);
  assert.ok(out.includes('<div class="latex-titlepage"'), 'Có div latex-titlepage thật');
  assert.ok(!out.includes('&lt;div class="latex-titlepage"'), 'Tuyệt đối không bị escape thành &lt;div');
  assert.ok(out.includes('<h1'), 'Có thẻ h1 thật');
  assert.ok(out.includes('Giải Tích Số</h1>'), 'Tiêu đề h1 đầy đủ');
});

test('Fix 20: Standalone Huge and scoped {\\Huge ...} have closed </span> and do not leak to subsequent paragraphs', () => {
  const tex = '\\textbf{\\Huge ĐẠI SỐ TUYẾN TÍNH}\n\nĐoạn văn bình thường sau tiêu đề.';
  const out = parser(tex);
  assert.ok(out.includes('<span style="font-size: 2.2rem; font-weight: 800; line-height: 1.3;">ĐẠI SỐ TUYẾN TÍNH</span>'), 'Tag span kích cỡ được đóng đúng');
  assert.ok(out.includes('<p style="margin-bottom: 16px;">Đoạn văn bình thường sau tiêu đề.</p>'), 'Đoạn văn sau có thẻ p bình thường, không bị nuốt vào span');
  // Scoped {\Huge ...} with balanced braces
  const scopedTex = '{\\Huge Tiêu đề {nâng cao}}\n\nNội dung thường.';
  const scopedOut = parser(scopedTex);
  assert.ok(scopedOut.includes('<span style="font-size: 2.2rem; font-weight: 800; line-height: 1.3;">Tiêu đề {nâng cao}</span>'), 'Scoped font size đóng đúng');
});

test('Fix 21: Display math is not wrapped inside <p> tag avoiding invalid <p><div> DOM structure', () => {
  const tex = 'Đoạn trước.\n\n$$x^2 + y^2 = 1$$\n\nĐoạn sau.';
  const out = parser(tex);
  assert.ok(!out.includes('<p style="margin-bottom: 16px;"><div class="katex-display-wrapper"'), 'Display math không bị bọc trong thẻ p');
  assert.ok(out.includes('<div class="katex-display-wrapper"'), 'Display math nằm ở khối block ngoài thẻ p');
});

test('Fix 22: eqnarray and flalign math environments are supported and rendered by KaTeX', () => {
  const tex = '\\begin{eqnarray*}\nx &=& 1 + 2 \\\\\ny &=& 3 + 4\n\\end{eqnarray*}';
  const out = parser(tex);
  assert.ok(!out.includes('\\begin{eqnarray*}'), 'Môi trường eqnarray được xử lý');
  assert.ok(out.includes('katex'), 'KaTeX render thành công');
  assert.ok(!out.includes('katex-error'), 'Không có lỗi biên dịch');
});

test('Fix 23: Escaped LaTeX text symbols (\\&, \\_, \\%, ~) are converted to clean web text', () => {
  const tex = 'Khoa Toán \\& Tin học, tỷ lệ 50\\%, biến a\\_1, xem Hình~1.';
  const out = parser(tex);
  assert.ok(out.includes('Khoa Toán &amp; Tin học'), 'Ampersand \\& chuyển thành &amp;');
  assert.ok(out.includes('tỷ lệ 50%'), 'Tỷ lệ 50% không còn dấu gạch chéo \\%');
  assert.ok(out.includes('biến a_1'), 'Gạch dưới a\\_1 chuyển thành a_1');
  assert.ok(out.includes('Hình&nbsp;1'), 'Dấu ngã ~ chuyển thành &nbsp;');
});

test('Fix 24: Title deduplication when \\title in preamble and \\begin{titlepage} in body exist', () => {
  const tex = `
\\title{Đề tài nghiên cứu}
\\begin{document}
\\begin{titlepage}
Trang bìa tùy chỉnh đặc biệt
\\end{titlepage}
\\section{Mở đầu}
Nội dung chương 1.
\\end{document}
  `.trim();
  const out = parser(tex);
  const titleCount = (out.match(/Đề tài nghiên cứu/g) || []).length;
  assert.equal(titleCount, 0, 'Không tự động chèn thêm titlepage nếu tài liệu đã có môi trường titlepage riêng');
  assert.ok(out.includes('Trang bìa tùy chỉnh đặc biệt'), 'Nội dung trang bìa titlepage tùy chỉnh được giữ nguyên');
});

test('Fix 25: border-radius: 2px conforms strictly to GEMINI.md Rule 3.4 (flat academic styling)', () => {
  const tex = '\\begin{vd}\nVí dụ phẳng.\n\\end{vd}';
  const out = parser(tex);
  assert.ok(out.includes('border-radius: 2px'), 'border-radius sắc cạnh 2px theo chuẩn GEMINI.md Rule 3.4');
  assert.ok(!out.includes('border-radius: 4px'), 'Tuyệt đối không còn border-radius: 4px');
});

test('Fix 26: Newline with vertical offset \\\\[0.7cm] does not collide with display math regex \\\\[ ... \\\\]', () => {
  const tex = `
\\textbf{ĐỀ TÀI NGHIÊN CỨU KHOA HỌC\\\\[0.7cm]\\Large{\\textcolor{blue}{XÂY DỰNG HỆ THỐNG}}}\\\\[1.5cm]
\\chapter{Kiến thức chuẩn bị}
Nội dung chương 1 không bị nuốt.
\\begin{vd}
Ví dụ 1.
\\[ x^2 + y^2 = 1 \\]
\\end{vd}
  `.trim();
  const out = parser(tex);
  assert.ok(out.includes('Kiến thức chuẩn bị'), 'Chương 1 không bị nuốt bởi \\[0.7cm]');
  assert.ok(out.includes('Nội dung chương 1 không bị nuốt'), 'Nội dung văn bản được bảo toàn');
  assert.ok(out.includes('Ví dụ 1'), 'Ví dụ được render đầy đủ');
  assert.ok(!out.includes('undefined'), 'Không sinh ra undefined trong KaTeX');
});

test('Fix 27: Overleaf Cover Page rendering fidelity (logo scale, borderless tabular, today, divider, clean TOC)', () => {
  const tex = `
\\documentclass[12pt,letterpaper]{report}
\\usepackage[utf8]{vietnam}
\\usepackage{setup}

\\begin{document}
\\begin{titlepage}
  \\begin{center}
    \\begin{Large}
      \\textbf{TRƯỜNG ĐẠI HỌC SƯ PHẠM TP. HỒ CHÍ MINH}\\\\
      \\vspace{0.5cm}
      \\textbf{KHOA CÔNG NGHỆ THÔNG TIN}\\\\
      \\vspace{0.35cm}
      \\textbf{---------------------------------------------}\\\\
      \\vspace{1.3cm}
      \\begin{figure}[h]
        \\centering
        \\includegraphics[scale=0.35]{data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==}
      \\end{figure}
      \\vspace{1.5cm}
      \\textbf{\\Huge ĐẠI SỐ TUYẾN TÍNH}\\\\
      \\vspace{0.5cm}
      \\textbf{\\Large TÀI LIỆU HỌC TẬP VÀ THỰC HÀNH}\\\\
    \\end{Large}
  \\end{center}
  \\vspace{2cm}
  \\begin{center}
    \\begin{tabular}{ll}
      \\\\[0.2cm]
      \\textbf{Giảng viên hướng dẫn:} & TS. Nguyễn Văn A \\\\
      \\\\[0.2cm]
      \\textbf{Sinh viên thực hiện:} & Trần Văn B \\\\
      \\\\[0.2cm]
      \\textbf{Mã số sinh viên:} & 48.01.104.123 \\\\
    \\end{tabular}
  \\end{center}
  \\vfill
  \\begin{center}
    \\today
  \\end{center}
\\end{titlepage}

\\begingroup
\\color{magenta}
\\tableofcontents
\\endgroup
\\end{document}
  `.trim();

  const out = parser(tex);

  // 1. Logo trường được giới hạn kích thước gọn gàng, không bị thổi phồng 100%
  assert.ok(out.includes('max-width: 200px'), 'Ảnh logo scale 0.35 có max-width: 200px');
  assert.ok(out.includes('max-height: 180px'), 'Ảnh logo scale 0.35 có max-height: 180px');

  // 2. Bảng tác giả không có đường viền thô và không bị rò rỉ [0.2cm]
  assert.ok(out.includes('latex-table-borderless'), 'Bảng tác giả là bảng không viền');
  assert.ok(!out.includes('[0.2cm]'), 'Tuyệt đối không rò rỉ [0.2cm] ra giao diện');
  assert.ok(out.includes('Giảng viên hướng dẫn:'), 'Có giảng viên hướng dẫn');
  assert.ok(out.includes('TS. Nguyễn Văn A'), 'Có tên giảng viên');

  // 3. Đường kẻ ngang phân cách thanh mảnh
  assert.ok(out.includes('latex-divider'), 'Đường gạch ngang được chuyển thành latex-divider');

  // 4. Ngày tháng được định dạng tiếng Việt học thuật
  assert.ok(!out.includes('\\today'), 'Không còn chữ \\today thô');
  assert.ok(out.includes('năm 2026'), 'Thời gian năm 2026 được định dạng tiếng Việt');

  // 5. Macro begingroup / color magenta / tableofcontents được dọn sạch hoàn toàn
  assert.ok(!out.includes('\\begingroup'), 'Không còn \\begingroup');
  assert.ok(!out.includes('\\endgroup'), 'Không còn \\endgroup');
  assert.ok(!out.includes('magenta'), 'Không còn magenta');
  assert.ok(!out.includes('\\tableofcontents'), 'Không còn \\tableofcontents');
});

test('Fix 28: Chapter-scoped automatic numbering for sections, dn, and vd (Ví dụ 2.1 to 2.10)', () => {
  const tex = `
\\chapter{MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH}
\\section{Khái niệm ma trận}
\\subsection{Định nghĩa}
\\begin{dn}
Cho ma trận cỡ $m \\times n$.
\\end{dn}
\\begin{vd}
Ví dụ mở đầu ma trận.
\\end{vd}

\\chapter{HỆ PHƯƠNG TRÌNH TUYẾN TÍNH}
\\section{Khái niệm về hệ phương trình tuyến tính}
\\begin{dn}
Một hệ gồm $m$ phương trình tuyến tính đối với $n$ ẩn số.
\\end{dn}
\\begin{vd}
Hệ phương trình bậc nhất hai ẩn.
\\end{vd}
\\begin{vd}
Hệ phương trình bậc nhất ba ẩn.
\\end{vd}
  `.trim();

  const out = parser(tex);

  // 1. Phân cấp chương 1
  assert.ok(out.includes('Chương 1: MA TRẬN VÀ HỆ PHƯƠNG TRÌNH TUYẾN TÍNH'), 'Chapter 1 có tiêu đề phân cấp');
  assert.ok(out.includes('1.1 Khái niệm ma trận'), 'Section 1.1 được đánh số');
  assert.ok(out.includes('1.1.1 Định nghĩa'), 'Subsection 1.1.1 được đánh số');
  assert.ok(out.includes('<strong>Định nghĩa 1.1.</strong>'), 'Định nghĩa chương 1 đánh số 1.1');
  assert.ok(out.includes('<strong>Ví dụ 1.1.</strong>'), 'Ví dụ chương 1 đánh số 1.1');

  // 2. Phân cấp chương 2
  assert.ok(out.includes('Chương 2: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH'), 'Chapter 2 có tiêu đề phân cấp');
  assert.ok(out.includes('2.1 Khái niệm về hệ phương trình tuyến tính'), 'Section 2.1 được đánh số chính xác');
  assert.ok(out.includes('<strong>Định nghĩa 2.1.</strong>'), 'Định nghĩa chương 2 đánh số 2.1');
  assert.ok(out.includes('<strong>Ví dụ 2.1.</strong>'), 'Ví dụ 1 của chương 2 đánh số 2.1');
  assert.ok(out.includes('<strong>Ví dụ 2.2.</strong>'), 'Ví dụ 2 của chương 2 đánh số 2.2');

  // 3. Styling kiểm chứng
  assert.ok(out.includes('latex-box-vd strong'), 'CSS có bộ chọn tiêu đề ví dụ xanh');
  assert.ok(out.includes('.latex-box-dn .latex-box-content'), 'CSS định nghĩa chữ nghiêng');
});

