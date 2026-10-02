import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import JSZip from './admin_v2/node_modules/jszip/lib/index.js';

// 1. Kiểm tra logic xử lý ZIP và nạp LaTeX từ Courses.jsx
test('Courses.jsx: resolveLatexImports and Image Data URL mapping', async () => {
  // Tạo file ZIP giả lập cấu trúc Overleaf đầy đủ
  const zip = new JSZip();

  // main.tex
  zip.file('main.tex', `
\\documentclass{book}
\\input{setup.sty}
\\begin{document}
\\input{bia.tex}
\\chapter{Chương 1}
\\input{C1/LT.tex}
\\chapter{Chương 2}
\\input{C2/LT.tex}
\\end{document}
  `.trim());

  // setup.sty (chứa macro và \undefined)
  zip.file('setup.sty', `
\\ProvidesPackage{setup}
\\let\\c@something\\undefined
\\def\\mycommand{\\undefined}
  `.trim());

  // bia.tex (bìa có titlepage và subfile preambles)
  zip.file('bia.tex', `
\\documentclass[main.tex]{subfiles}
\\begin{document}
\\begin{titlepage}
\\centering
\\textbf{\\Huge ĐẠI SỐ TUYẾN TÍNH}
\\includegraphics{images/logo.png}
\\end{titlepage}
\\end{document}
  `.trim());

  // C1/LT.tex (nội dung có công thức toán chứa $, $1, $', $$ và \includegraphics với đường dẫn tương đối và URL)
  zip.file('C1/LT.tex', `
\\documentclass[main.tex]{subfiles}
\\begin{document}
\\section{Định nghĩa không gian véc tơ}
Cho $V$ là không gian véc tơ trên trường $K$.
Giá trị $100 và công thức $x = $1 + $2$ và display math:
$$f(x) = \\int_0^1 t^2 dt$$
Tham khảo: \\url{https://vi.wikipedia.org/wiki/%C4%90%E1%BA%A1i_s%E1%BB%91} để biết thêm % Đây là comment
\\begin{figure}[h]
  \\centering
  \\includegraphics[width=0.8\\linewidth]{../images/diagram}
  \\caption{Hình 1.1: Sơ đồ minh họa}
\\end{figure}
\\end{document}
  `.trim());

  // C2/LT.tex (kiểm tra không bị nhầm lẫn với C1/LT.tex qua baseName lt.tex)
  zip.file('C2/LT.tex', `
\\documentclass[main.tex]{subfiles}
\\begin{document}
\\section{Ma trận và ánh xạ tuyến tính}
Nội dung chương 2 với ma trận $A = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$.
\\end{document}
  `.trim());

  // Thêm ảnh giả lập vào zip
  const fakePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  zip.file('images/logo.png', Buffer.from(fakePngBase64, 'base64'));
  zip.file('images/diagram.png', Buffer.from(fakePngBase64, 'base64'));

  // Logic chuẩn xác y hệt Courses.jsx
  const normalizePath = (p) => {
    if (!p) return '';
    const parts = p.replace(/\\/g, '/').split('/');
    const stack = [];
    for (const part of parts) {
      if (!part || part === '.') continue;
      if (part === '..') {
        if (stack.length > 0) stack.pop();
      } else {
        stack.push(part);
      }
    }
    return stack.join('/');
  };

  const stripLatexComments = (text) => {
    if (!text) return '';
    return text.split('\n').map(line => {
      let inUrl = false;
      let urlDepth = 0;
      for (let i = 0; i < line.length; i++) {
        if (line.substr(i, 5) === '\\url{' || line.substr(i, 6) === '\\href{') {
          inUrl = true;
          urlDepth = 1;
          i += line.substr(i, 5) === '\\url{' ? 4 : 5;
          continue;
        }
        if (inUrl) {
          if (line[i] === '{') urlDepth++;
          else if (line[i] === '}') {
            urlDepth--;
            if (urlDepth <= 0) inUrl = false;
          }
          continue;
        }
        if (line[i] === '%') {
          let backslashes = 0;
          let j = i - 1;
          while (j >= 0 && line[j] === '\\') {
            backslashes++;
            j--;
          }
          if (backslashes % 2 === 0) {
            return line.substring(0, i);
          }
        }
      }
      return line;
    }).join('\n');
  };

  const isStyleOrMacro = (pathStr) => {
    if (!pathStr) return false;
    const norm = pathStr.toLowerCase().replace(/\\/g, '/');
    const base = norm.split('/').pop().replace(/\.tex$/, '');
    return norm.endsWith('.sty') ||
           base === 'setup' || base === 'macros' || base === 'config' || base === 'style' ||
           norm.includes('/setup.') || norm.includes('/macros.') || norm.includes('/config.');
  };

  let texContent = null;
  let mainTexPath = null;

  const texCandidates = [];
  for (const [p, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    const lower = p.toLowerCase().replace(/\\/g, '/');
    if (lower.includes('__macosx') || lower.split('/').pop().startsWith('.')) continue;
    if (lower.endsWith('.tex')) texCandidates.push(p);
  }

  assert.ok(texCandidates.length > 0, 'Tìm thấy ứng viên .tex');

  let bestCandidate = null;
  let bestScore = -1;
  for (const cand of texCandidates) {
    const lower = cand.toLowerCase().replace(/\\/g, '/');
    const baseName = lower.split('/').pop();
    let score = 0;
    if (baseName === 'main.tex') score += 100;
    else if (baseName === 'root.tex' || baseName === 'book.tex' || baseName === 'document.tex') score += 60;
    if (!cand.includes('/')) score += 15;
    const snippet = await zip.files[cand].async('string');
    if (snippet.includes('\\documentclass') && !snippet.includes('documentclass[main.tex]{subfiles}')) score += 50;
    if (snippet.includes('\\begin{document}')) score += 30;
    if (/\\(?:input|include|subfile)\s*\{/.test(snippet)) score += 20;
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = cand;
    }
  }

  mainTexPath = bestCandidate || texCandidates[0];
  assert.equal(mainTexPath, 'main.tex');
  texContent = await zip.files[mainTexPath].async('string');

  // Trích xuất ảnh
  const imageMap = new Map();
  for (const [p, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const lowerPath = p.toLowerCase().replace(/\\/g, '/');
    if (lowerPath.includes('__macosx') || lowerPath.split('/').pop().startsWith('.')) continue;

    let mime = null;
    if (lowerPath.endsWith('.png')) mime = 'image/png';
    else if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) mime = 'image/jpeg';
    else if (lowerPath.endsWith('.svg')) mime = 'image/svg+xml';
    else if (lowerPath.endsWith('.webp')) mime = 'image/webp';
    else if (lowerPath.endsWith('.gif')) mime = 'image/gif';

    if (mime) {
      const base64 = await entry.async('base64');
      const dataUrl = `data:${mime};base64,${base64}`;

      const norm = normalizePath(lowerPath);
      imageMap.set(norm, dataUrl);
      imageMap.set(lowerPath, dataUrl);
      imageMap.set(lowerPath.replace(/^\.?\//, ''), dataUrl);

      const fileName = lowerPath.split('/').pop();
      if (fileName) {
        if (!imageMap.has(fileName)) imageMap.set(fileName, dataUrl);
        const dotIdx = fileName.lastIndexOf('.');
        if (dotIdx !== -1) {
          const noExt = fileName.substring(0, dotIdx);
          if (!imageMap.has(noExt)) imageMap.set(noExt, dataUrl);
        }
      }
    }
  }

  const resolveImageDataUrl = (rawImgPath, currentDir = '') => {
    if (!rawImgPath) return null;
    const p = rawImgPath.trim();
    if (p.startsWith('data:') || p.startsWith('http://') || p.startsWith('https://')) return p;
    const lower = p.toLowerCase().replace(/\\/g, '/');
    const cleanNoLeading = lower.replace(/^\.?\//, '');
    const relativeWithDir = currentDir ? normalizePath(`${currentDir}/${cleanNoLeading}`) : cleanNoLeading;

    const extensions = ['', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif'];
    for (const ext of extensions) {
      const candidate = relativeWithDir + ext;
      if (imageMap.has(candidate)) return imageMap.get(candidate);
    }
    for (const ext of extensions) {
      if (imageMap.has(lower + ext)) return imageMap.get(lower + ext);
      if (imageMap.has(cleanNoLeading + ext)) return imageMap.get(cleanNoLeading + ext);
    }
    for (const [key, url] of imageMap.entries()) {
      if (key.endsWith('/' + cleanNoLeading) || cleanNoLeading.endsWith('/' + key)) return url;
    }
    const baseName = lower.split('/').pop().replace(/\.[a-z0-9]+$/i, '');
    const baseWithExt = lower.split('/').pop();
    if (imageMap.has(baseWithExt)) return imageMap.get(baseWithExt);
    if (imageMap.has(baseName)) return imageMap.get(baseName);
    for (const ext of extensions) {
      if (ext && imageMap.has(baseName + ext)) return imageMap.get(baseName + ext);
    }
    return null;
  };

  const resolveLatexImports = async (content, currentDir = '', visited = new Set()) => {
    content = stripLatexComments(content);
    const regex = /\\(?:input|include|subfile)\s*\{([^}]+)\}/g;
    let result = content;
    let matches = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push(match);
    }

    for (const m of matches) {
      const fullMatch = m[0];
      let rawPath = m[1].trim();

      if (isStyleOrMacro(rawPath)) {
        result = result.replaceAll(fullMatch, () => '');
        continue;
      }

      let filePath = rawPath;
      if (!filePath.endsWith('.tex') && !filePath.includes('.')) filePath += '.tex';

      let zipEntry = null;
      let candidatePath = currentDir ? normalizePath(`${currentDir}/${filePath}`) : filePath;
      candidatePath = candidatePath.replace(/\\/g, '/');
      zipEntry = zip.file(candidatePath);

      if (!zipEntry) zipEntry = zip.file(filePath);

      if (!zipEntry) {
        const lowerCandidate = candidatePath.toLowerCase().replace(/^\.?\//, '');
        const lowerFilePath = filePath.toLowerCase().replace(/\\/g, '/').replace(/^\.?\//, '');
        for (const [entryPath, entry] of Object.entries(zip.files)) {
          if (entry.dir) continue;
          const normP = entryPath.toLowerCase().replace(/\\/g, '/').replace(/^\.?\//, '');
          if (normP === lowerCandidate || normP === lowerFilePath || normP.endsWith('/' + lowerFilePath)) {
            zipEntry = entry;
            break;
          }
        }
      }

      if (!zipEntry) {
        // Chỉ tìm kiếm fallback theo baseName nếu filePath KHÔNG chứa thư mục (tránh C1/LT.tex khớp nhầm C2/LT.tex)
        if (!filePath.includes('/') && !filePath.includes('\\')) {
          const baseName = filePath.toLowerCase();
          for (const [entryPath, entry] of Object.entries(zip.files)) {
            if (entry.dir) continue;
            const pBase = entryPath.split(/[/\\]/).pop().toLowerCase();
            if (pBase === baseName) {
              zipEntry = entry;
              break;
            }
          }
        }
      }

      if (zipEntry) {
        if (visited.has(zipEntry.name)) {
          result = result.replaceAll(fullMatch, () => `% [Bỏ qua import vòng lặp: ${zipEntry.name}]\n`);
          continue;
        }
        const nextVisited = new Set(visited);
        nextVisited.add(zipEntry.name);

        const subDir = zipEntry.name.includes('/') ? zipEntry.name.substring(0, zipEntry.name.lastIndexOf('/')) : '';
        let subContent = await zipEntry.async('string');
        subContent = stripLatexComments(subContent);

        // Bóc tách preamble: tìm từ \begin{document} đầu tiên đến \end{document} cuối cùng
        const docStartMatch = subContent.match(/\\begin\s*\{document\}/);
        const docEndMatch = [...subContent.matchAll(/\\end\s*\{document\}/g)].pop();
        if (docStartMatch && docEndMatch && docEndMatch.index > docStartMatch.index) {
          subContent = subContent.substring(docStartMatch.index + docStartMatch[0].length, docEndMatch.index);
        } else if (docStartMatch) {
          subContent = subContent.substring(docStartMatch.index + docStartMatch[0].length);
        } else {
          subContent = subContent.replace(/\\documentclass(?:\[[\s\S]*?\])?\{[\s\S]*?\}/g, '');
          subContent = subContent.replace(/\\usepackage(?:\[[\s\S]*?\])?\{[\s\S]*?\}/g, '');
        }
        subContent = subContent.replace(/\\begin\s*\{document\}/g, '');
        subContent = subContent.replace(/\\end\s*\{document\}/g, '');

        subContent = subContent.replace(/\\includegraphics\s*(?:\[([\s\S]*?)\])?\s*\{([^}]+)\}/g, (imgMatch, opt, imgPath) => {
          const dataUrl = resolveImageDataUrl(imgPath, subDir);
          if (dataUrl) {
            return opt ? `\\includegraphics[${opt}]{${dataUrl}}` : `\\includegraphics{${dataUrl}}`;
          }
          return imgMatch;
        });

        const resolvedSub = await resolveLatexImports(subContent, subDir, nextVisited);
        result = result.replaceAll(fullMatch, () => (resolvedSub !== undefined ? resolvedSub : ''));
      } else {
        result = result.replaceAll(fullMatch, () => `% [CẢNH BÁO: Không tìm thấy file ${filePath} trong ZIP]\n`);
      }
    }
    return result;
  };

  const mainDir = mainTexPath.includes('/') ? mainTexPath.substring(0, mainTexPath.lastIndexOf('/')) : '';
  texContent = await resolveLatexImports(texContent, mainDir);

  texContent = texContent.replace(/\\includegraphics\s*(?:\[([\s\S]*?)\])?\s*\{([^}]+)\}/g, (match, opt, imgPath) => {
    const dataUrl = resolveImageDataUrl(imgPath, mainDir);
    if (dataUrl) {
      return opt ? `\\includegraphics[${opt}]{${dataUrl}}` : `\\includegraphics{${dataUrl}}`;
    }
    return match;
  });

  // KIỂM TRA KẾT QUẢ:
  // 1. Phải nạp đủ cả bìa, Chương 1 và Chương 2 (không bị nuốt hay đè chéo do trùng tên file lt.tex)
  assert.ok(texContent.includes('ĐẠI SỐ TUYẾN TÍNH'), 'Bìa phải được nạp đầy đủ');
  assert.ok(texContent.includes('Định nghĩa không gian véc tơ'), 'Chương 1 phải được nạp đầy đủ');
  assert.ok(texContent.includes('Ma trận và ánh xạ tuyến tính'), 'Chương 2 phải được nạp đầy đủ');
  assert.ok(texContent.includes('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}'), 'Ma trận chương 2 được bảo toàn');

  // 2. Không chứa setup.sty gây tràn macro \undefined
  assert.ok(!texContent.includes('\\let\\c@something\\undefined'), 'Macro setup.sty phải được loại bỏ');

  // 3. Công thức toán có ký tự $ và $1 không bị nuốt hoặc thay thế sai
  assert.ok(texContent.includes('Cho $V$ là không gian véc tơ'), 'Toán học $V$ phải được bảo toàn');
  assert.ok(texContent.includes('$x = $1 + $2$'), 'Ký tự $1, $2 trong toán học phải được giữ nguyên');

  // 4. URL có % không bị cắt cụt làm comment
  assert.ok(texContent.includes('%C4%90%E1%BA%A1i_s%E1%BB%91'), 'URL percent encoding được bảo toàn');

  // 5. Ảnh đã được chuyển thành Base64 Data URL (kể cả relative ../images/diagram)
  assert.ok(texContent.includes('data:image/png;base64,'), 'Ảnh phải được chuyển thành Base64');
  assert.ok(!texContent.includes('\\includegraphics{images/logo.png}'), 'Đường dẫn ảnh cũ phải được thay thế');
  assert.ok(!texContent.includes('\\includegraphics[width=0.8\\linewidth]{../images/diagram}'), 'Đường dẫn relative diagram phải được thay thế');
});

// 2. Kiểm tra parseLatexToHTML trích xuất trực tiếp từ knowledge_info.html
test('knowledge_info.html: parseLatexToHTML handles academic environments, nested lists, and formulas', async () => {
  // Đọc mã nguồn từ knowledge_info.html để đảm bảo test đúng code thực tế
  const htmlFile = fs.readFileSync('frontend_v2/knowledge_info.html', 'utf8');

  // Trích xuất hàm parseLatexToHTML từ file
  const funcStart = htmlFile.indexOf('function parseLatexToHTML(texString) {');
  assert.ok(funcStart !== -1, 'Tìm thấy hàm parseLatexToHTML trong knowledge_info.html');

  // Lấy toàn bộ hàm parseLatexToHTML
  const afterFunc = htmlFile.substring(funcStart);
  const funcEnd = afterFunc.indexOf('function formatLessonBody');
  assert.ok(funcEnd !== -1, 'Tìm thấy điểm kết thúc hàm');
  const funcBody = afterFunc.substring(0, funcEnd).trim();

  // Nạp katex
  const katexModule = await import('./admin_v2/node_modules/katex/dist/katex.js');
  const katex = katexModule.default || katexModule;
  const tr = (key, fallback) => fallback;

  // Thực thi hàm trong ngữ cảnh sandbox của Node
  const testParser = new Function('katex', 'tr', `
    ${funcBody}
    return parseLatexToHTML;
  `)(katex, tr);

  // Test Case 1: Các môi trường định lý, định nghĩa từ setup.sty
  const testTex1 = `
\\begin{document}
\\begin{titlepage}
\\textbf{ĐẠI SỐ TUYẾN TÍNH}
\\end{titlepage}

\\begin{dn}[Không gian véc tơ con]
Cho không gian véc tơ $V$ và tập con $W \\subset V$.
\\end{dn}

\\begin{dl}[Tiêu chuẩn không gian con]
Tập con $W$ là không gian con khi và chỉ khi đóng kín với hai phép toán.
\\end{dl}

\\begin{tc}
Giao của hai không gian con là một không gian con.
\\end{tc}

\\begin{vd}[Ví dụ ma trận]
Xét ma trận $A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$.
\\end{vd}

\\begin{hq}
Hệ quả trực tiếp từ định lý trên.
\\end{hq}

\\begin{nx}
Nhận xét về số chiều của không gian.
\\end{nx}

\\begin{proof}
Chứng minh rõ ràng bằng quy nạp.
\\end{proof}
\\end{document}
  `.trim();

  const result1 = testParser(testTex1);

  // Kiểm tra môi trường hộp học thuật phẳng
  assert.ok(result1.includes('latex-titlepage'), 'Có container titlepage');
  assert.ok(result1.includes('latex-box-dn'), 'Có hộp định nghĩa');
  assert.ok(result1.includes('Định nghĩa'), 'Có nhãn Định nghĩa');
  assert.ok(result1.includes('Không gian véc tơ con'), 'Có tiêu đề Định nghĩa');

  assert.ok(result1.includes('latex-box-dl'), 'Có hộp định lý');
  assert.ok(result1.includes('Định lý'), 'Có nhãn Định lý');

  assert.ok(result1.includes('latex-box-tc'), 'Có hộp tính chất');
  assert.ok(result1.includes('Tính chất'), 'Có nhãn Tính chất');

  assert.ok(result1.includes('latex-box-vd'), 'Có hộp ví dụ');
  assert.ok(result1.includes('Ví dụ'), 'Có nhãn Ví dụ');

  assert.ok(result1.includes('latex-box-hq'), 'Có hộp hệ quả');
  assert.ok(result1.includes('latex-box-nx'), 'Có hộp nhận xét');

  assert.ok(result1.includes('latex-proof'), 'Có khối chứng minh');
  assert.ok(result1.includes('latex-tombstone'), 'Có ký hiệu Halmos tombstone ở cuối chứng minh');

  // Test Case 2: Figure, Caption và Bảng (Tabular)
  const testTex2 = `
\\begin{figure}[htbp]
  \\centering
  \\includegraphics{data:image/png;base64,abc123}
  \\caption{Hình 2.1: Không gian nghiệm của hệ phương trình}
\\end{figure}

\\begin{tabular}{|c|c|}
\\hline
$x$ & $f(x)$ \\\\
\\hline
1 & 2 \\\\
3 & 4 \\\\
\\hline
\\end{tabular}
  `.trim();

  const result2 = testParser(testTex2);
  assert.ok(result2.includes('latex-figure'), 'Có figure container');
  assert.ok(result2.includes('latex-caption'), 'Có figcaption');
  assert.ok(result2.includes('Hình 2.1: Không gian nghiệm'), 'Nội dung caption được giữ nguyên');
  assert.ok(result2.includes('latex-table'), 'Có bảng academic');
  assert.ok(result2.includes('</th>'), 'Có tiêu đề bảng th');
  assert.ok(result2.includes('</td>'), 'Có ô dữ liệu td');

  // Test Case 3: Danh sách lồng nhau (Nested list không bị nuốt nội dung)
  const testTex3 = `
\\begin{itemize}
  \\item Mục cha 1
    \\begin{itemize}
      \\item Mục con 1.1
      \\item Mục con 1.2
    \\end{itemize}
  \\item Mục cha 2
\\end{itemize}
  `.trim();

  const result3 = testParser(testTex3);
  assert.ok(result3.includes('Mục cha 1'), 'Mục cha 1 phải có');
  assert.ok(result3.includes('Mục con 1.1'), 'Mục con 1.1 phải có');
  assert.ok(result3.includes('Mục con 1.2'), 'Mục con 1.2 phải có');
  assert.ok(result3.includes('Mục cha 2'), 'Mục cha 2 KHÔNG được bị nuốt');

  // Test Case 4: Không để sót macro \undefined
  const testTex4 = `
\\let\\c@something\\undefined
\\undefined
Nội dung bài học chuẩn xác không có rác macro.
  `.trim();

  const result4 = testParser(testTex4);
  assert.ok(!result4.includes('\\undefined'), 'Tuyệt đối không còn chữ \\undefined thô');
  assert.ok(result4.includes('Nội dung bài học chuẩn xác'), 'Nội dung chính vẫn nguyên vẹn');

  // Test Case 5: Toán học với toán tử so sánh <, > trong $...$ và $$...$$
  const testTex5 = `
Cho $x < 5$ và $y > 10$.
Ta có hệ thức:
$$0 < \\frac{x}{y} < \\frac{1}{2}$$
\\begin{align}
a &< b \\\\
c &> d
\\end{align}
  `.trim();
  const result5 = testParser(testTex5);
  assert.ok(result5.includes('katex'), 'KaTeX đã biên dịch thành công biểu thức chứa < và >');
  assert.ok(!result5.includes('&lt;') || result5.includes('katex-html'), 'Không bị lộ escape thô trong công thức toán');

  // Test Case 6: Edge case đầu vào rỗng, null, hoặc toàn khoảng trắng
  assert.equal(testParser(''), '', 'Chuỗi rỗng trả về rỗng');
  assert.equal(testParser(null), '', 'Null trả về rỗng');
  assert.equal(testParser('   '), '', 'Khoảng trắng trả về rỗng');

  // Test Case 7: Môi trường lồng phức tạp: dn chứa vd, vd chứa itemize và math
  const testTex7 = `
\\begin{dn}[Không gian định chuẩn]
Một không gian véc tơ $V$ cùng chuẩn $\|.\|$.
\\begin{vd}
Ví dụ với chuẩn Euclid:
\\begin{itemize}
  \\item[+] Trong không gian $\\mathbb{R}^n$: $\|x\| = \\sqrt{\\sum x_i^2}$.
  \\item[+] Trong không gian $C[a, b]$.
\\end{itemize}
\\end{vd}
\\end{dn}
  `.trim();
  const result7 = testParser(testTex7);
  assert.ok(result7.includes('latex-box-dn'), 'Chứa khối dn bên ngoài');
  assert.ok(result7.includes('latex-box-vd'), 'Chứa khối vd bên trong dn');
  assert.ok(result7.includes('latex-list'), 'Chứa danh sách bên trong vd');
  assert.ok(result7.includes('Không gian $\\mathbb{R}^n$') || result7.includes('katex'), 'KaTeX đã render đúng');

  // Test Case 8: Thẻ không đóng (Unmatched \begin không gây treo đệ quy)
  const testTex8 = `
\\begin{dn}
Đây là định nghĩa bị thiếu thẻ đóng
Văn bản vẫn phải hiển thị an toàn.
  `.trim();
  const start = Date.now();
  const result8 = testParser(testTex8);
  const duration = Date.now() - start;
  assert.ok(duration < 200, 'Không bị treo vòng lặp vô tận');
  assert.ok(result8.includes('Văn bản vẫn phải hiển thị an toàn'), 'Văn bản được giữ nguyên');

  // Test Case 9: Hộp học thuật nhiều đoạn văn không bị lỗi DOM lồng <div> trong <p>
  const testTex9 = `
\\begin{dn}
Đoạn 1 của định nghĩa không gian.

Đoạn 2 của định nghĩa không gian.
\\end{dn}
  `.trim();
  const result9 = testParser(testTex9);
  assert.ok(!result9.includes('</div></div></p>'), 'DOM không bị vỡ do thẻ p lồng đóng div');
  assert.ok(result9.includes('Đoạn 1 của định nghĩa không gian'), 'Đoạn 1 có mặt');
  assert.ok(result9.includes('Đoạn 2 của định nghĩa không gian'), 'Đoạn 2 có mặt');

  // Test Case 10: Toán học chứa \\textbf và toán tử so sánh <, > không bị hỏng bởi HTML replacement
  const testTex10 = 'Cho $f(\\textbf{x}) = 0$ với $x < 5 \\land y > 10$.';
  const result10 = testParser(testTex10);
  assert.ok(!result10.includes('<strong style="font-weight: 700;">x</strong>'), 'Không replace HTML vào trong math');
  assert.ok(result10.includes('katex'), 'KaTeX biên dịch thành công');

  // Test Case 11: Bảng chứa ma trận trong ô không bị xé vụn bởi \\\\ và &
  const testTex11 = `
\\begin{tabular}{|c|c|}
\\hline
$\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$ & Ma trận \\\\
\\hline
\\end{tabular}
  `.trim();
  const result11 = testParser(testTex11);
  assert.ok(result11.includes('latex-table'), 'Có bảng');
  assert.ok(!result11.includes('4 \\end{pmatrix}</td>'), 'Ma trận không bị xé nát giữa các hàng/cột');
  assert.ok(result11.includes('katex'), 'KaTeX ma trận được render trong bảng');

  // Test Case 12: Multicols nhận tham số ngoặc nhọn {2} không bị lộ chữ {2} thô
  const testTex12 = '\\begin{multicols}{2}\nNội dung chia 2 cột\n\\end{multicols}';
  const result12 = testParser(testTex12);
  assert.ok(!result12.includes('{2}'), 'Không bị lộ chữ {2} thô');
  assert.ok(result12.includes('latex-multicols cols-2'), 'Có container 2 cột');

  // Test Case 13: Đoạn văn giới thiệu trước \\item đầu tiên trong itemize không bị nuốt mất
  const testTex13 = `
\\begin{itemize}
Lời dẫn giới thiệu các tính chất sau:
\\item Tính chất 1
\\item Tính chất 2
\\end{itemize}
  `.trim();
  const result13 = testParser(testTex13);
  assert.ok(result13.includes('Lời dẫn giới thiệu các tính chất sau'), 'Lời dẫn trước item 1 không bị nuốt');

  // Test Case 14: Ngoặc cân bằng giúp caption và section không bị ngắt cụt khi chứa toán có {}
  const testTex14 = `
\\section{Không gian $\\mathbb{R}^n$ và hệ $\\{e_1, e_2\\}$}
\\begin{figure}
\\caption{Hình 1: Biểu đồ trong $\\mathbb{R}^3$ và tập $\\{x_0\\}$}
\\end{figure}
  `.trim();
  const result14 = testParser(testTex14);
  const beforeFigCap = result14.substring(result14.indexOf('<figure'), result14.indexOf('<figcaption'));
  assert.ok(!beforeFigCap.includes('Biểu đồ trong'), 'Nội dung caption không bị rò rỉ ra ngoài figcaption');
  assert.ok(result14.includes('Không gian'), 'Section heading đầy đủ');
  assert.ok(result14.includes('</h2>'), 'Section tag đóng đúng chỗ');

  // Test Case 15: Phông chữ \\Huge và \\textbf{\\Huge ...} không để lại chuỗi \\Huge thô
  const testTex15 = '\\textbf{\\Huge ĐẠI SỐ TUYẾN TÍNH}';
  const result15 = testParser(testTex15);
  assert.ok(!result15.includes('\\Huge'), 'Không còn chữ \\Huge thô');
  assert.ok(result15.includes('ĐẠI SỐ TUYẾN TÍNH'), 'Tiêu đề to vẫn còn');

  // Test Case 16: Preamble macros (setlength, definecolor, newtheorem) bị loại bỏ sạch sẽ
  const testTex16 = `
\\setlength{\\parindent}{0pt}
\\definecolor{mycolor}{rgb}{0,0,1}
\\newtheorem{dn}{Định nghĩa}
Nội dung văn bản chính thức của bài học.
  `.trim();
  const result16 = testParser(testTex16);
  assert.ok(!result16.includes('\\setlength'), 'Không còn \\setlength');
  assert.ok(!result16.includes('\\definecolor'), 'Không còn \\definecolor');
  assert.ok(!result16.includes('\\newtheorem'), 'Không còn \\newtheorem');
  assert.ok(result16.includes('Nội dung văn bản chính thức'), 'Nội dung chính vẫn nguyên vẹn');
});


