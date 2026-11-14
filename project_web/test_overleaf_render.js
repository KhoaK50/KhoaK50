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

// 3. Regression Test cho Visual LaTeX Slicer & AST Reconstructor:
//    - Phân biệt chính xác môi trường có đóng khung bo góc (tcolorbox / newtcbtheorem / tcolorboxenvironment / BeforeBeginEnvironment / delegated newenvironment) với môi trường phẳng không khung (\newtheorem{vd}, \newtheorem{bt}).
//    - Không rò rỉ \end{comment}, \hfill, \textbf, ngoặc nhọn {...} hay đánh số mồ côi 1.1 khi cắt giữa khối và đảo thứ tự mọi hoán vị 3 đoạn.
test('Visual LaTeX Slicer: authentic rounded framed boxes vs unboxed theorems & zero leaks across all 6 segment reorderings', async () => {
  const { ingestLatexFileOrZip, exportUsedAssetsToDataUrls } = await import(
    './admin_v2/src/utils/latexSlicer/zipIngestor.js'
  );
  const { parsePreambleAndGlobals } = await import(
    './admin_v2/src/utils/latexSlicer/preambleParser.js'
  );
  const { buildTexAst, snapAndReconstructSlice } = await import(
    './admin_v2/src/utils/latexSlicer/texAstEngine.js'
  );
  const { composeAndNormalizeSegments } = await import(
    './admin_v2/src/utils/latexSlicer/hierarchyNormalizer.js'
  );
  const { renderLatexForPreviewAndUI } = await import(
    './admin_v2/src/utils/latexSlicer/vectoriaLatexRenderer.js'
  );

  const htmlFile = fs.readFileSync('frontend_v2/knowledge_info.html', 'utf8');
  const funcStart = htmlFile.indexOf('function parseLatexToHTML(texString) {');
  const afterFunc = htmlFile.substring(funcStart);
  const funcEnd = afterFunc.indexOf('function formatLessonBody');
  const funcBody = afterFunc.substring(0, funcEnd).trim();
  const katexModule = await import('./admin_v2/node_modules/katex/dist/katex.js');
  const katex = katexModule.default || katexModule;
  const parseLatexToHTML = new Function('katex', 'tr', `${funcBody}\nreturn parseLatexToHTML;`)(
    katex,
    (_k, fb) => fb
  );

  const stripKatexSpans = (str) => {
    let out = '';
    let i = 0;
    while (i < str.length) {
      const idx = str.indexOf('<span class="katex', i);
      if (idx === -1) {
        out += str.slice(i);
        break;
      }
      const nextCh = str[idx + '<span class="katex'.length];
      if (nextCh !== '"' && nextCh !== ' ' && nextCh !== '-') {
        out += str.slice(i, idx + 18);
        i = idx + 18;
        continue;
      }
      out += str.slice(i, idx) + ' ';
      let depth = 0;
      let cur = idx;
      while (cur < str.length) {
        const nextOpen = str.indexOf('<span', cur);
        const nextClose = str.indexOf('</span>', cur);
        if (nextClose === -1) {
          cur = str.length;
          break;
        }
        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          cur = nextOpen + 5;
        } else {
          depth--;
          cur = nextClose + 7;
          if (depth <= 0) break;
        }
      }
      i = cur;
    }
    return out;
  };

  const assertZeroLeaks = (html, tag) => {
    assert.equal((html.match(/katex-error/g) || []).length, 0, `[${tag}] Không được có lỗi KaTeX`);
    assert.deepEqual(html.match(/___[A-Z0-9_]+___/g) || [], [], `[${tag}] Không rò rỉ placeholder nội bộ`);
    const vis = stripKatexSpans(
      html
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
        .replace(/<annotation[\s\S]*?<\/annotation>/gi, ' ')
    )
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    assert.deepEqual(vis.match(/\\[a-zA-Z@]+/g) || [], [], `[${tag}] Không rò rỉ lệnh LaTeX thô`);
    assert.deepEqual(vis.match(/[{}]/g) || [], [], `[${tag}] Không rò rỉ ngoặc nhọn nhóm TeX`);
    return vis;
  };

  const zip = new JSZip();
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  zip.file('images/matrix_diag.png', Buffer.from(pngBase64, 'base64'));
  zip.file(
    'macros/boxes.sty',
    String.raw`
\definecolor{dnframe}{HTML}{0369A1}
\definecolor{dnbg}{RGB}{240, 249, 255}
\colorlet{dlframe}{teal!80!black}
\tcbset{dsttrounded/.style={enhanced, arc=8pt, boxrule=1.5pt}}
\newtheorem{dn}{Định nghĩa}[chapter]
\tcolorboxenvironment{dn}{dsttrounded, colframe=dnframe, colback=dnbg}
\newtcbtheorem[number within=chapter]{dl}{Định lý}{dsttrounded, colframe=dlframe, colback=teal!6!white, attach boxed title to top left={yshift=-2mm,xshift=4mm}, colbacktitle=dlframe, coltitle=white}{thm}
\newtcolorbox{tcbox}{dsttrounded, colframe=violet!75!black, colback=violet!6!white}
\newtheorem{tcthm}{Tính chất}[chapter]
\newenvironment{tc}{\begin{tcbox}\begin{tcthm}}{\end{tcthm}\end{tcbox}}
\newtheorem*{note}{Ghi chú}
\BeforeBeginEnvironment{note}{\begin{tcolorbox}[sharp corners, boxrule=0pt, leftrule=3.5pt, colframe=orange!85!black, colback=orange!8!white]}
\AfterEndEnvironment{note}{\end{tcolorbox}}
\newtheorem{vd}{Ví dụ}[chapter]
\newtheorem{bt}{Bài tập}[chapter]
\newtcolorbox{warningbox}[1][Lưu ý]{arc=6pt, colframe=red!75!black, colback=red!5!white, colbacktitle=red!75!black, coltitle=white, title={#1}}
\newcommand{\qedd}{\blacksquare}
\newenvironment{lgiai}{\par\noindent\textbf{\textcolor{dnframe}{Lời giải.}}\ }{\hfill$\qedd$\par}
`
  );
  zip.file(
    'setup.sty',
    String.raw`
\ProvidesPackage{setup}
\graphicspath{{images/}}
\newcommand{\R}{\mathbb{R}}
\DeclareMathOperator{\Span}{Span}
\DeclareRobustCommand{\rank}{\operatorname{rank}}
\input{macros/boxes.sty}
`
  );
  zip.file(
    'chapters/ch2.tex',
    String.raw`
\pagestyle{C2}
\chapter{Ma trận}
\begin{comment}
\section{Hạng ma trận}
\subsection{Các phép biến đổi sơ cấp}
\begin{dn}
Cho $A \in \R^{m \times n}$, hạng ký hiệu $\rank(A)$ và không gian sinh $\Span(A)$.
\begin{enumerate}[label=\alph*)]
  \item Đổi chỗ hai dòng.
  \item Nhân một dòng với $\lambda \neq 0$.
\end{enumerate}
\end{dn}
\begin{vd}
Tìm hạng của $A = \begin{pmatrix} 1 & 2 \\ 0 & 3 \end{pmatrix}$.
\begin{lgiai}
Có 2 dòng khác không nên $\rank(A) = 2$.
\end{lgiai}
\end{vd}
\end{comment}
\subsection{Định lý Đa thức đặc trưng}
\begin{dl}{Định lý Cayley-Hamilton}{cayley}
Mọi ma trận vuông $A \in \R^{n \times n}$ thỏa $P_A(A) = O$.
\end{dl}
\begin{tc}
Nếu $A$ khả nghịch thì $\rank(A) = n$.
\end{tc}
\begin{note}
Lưu ý dấu định thức khi hoán vị hai dòng.
\end{note}
\begin{warningbox}[Cảnh báo quan trọng]
Phép nhân ma trận \textbf{\Large{\textcolor{dnframe}{không giao hoán}}}.
\end{warningbox}
\begin{figure}[htbp]
  \centering
  \includegraphics[width=0.5\textwidth]{matrix_diag}
  \caption{Sơ đồ biến đổi hạng}
\end{figure}
\section*{Bài tập Chương 2}
\begin{bt}
Cho $A = \begin{pmatrix} 1 & 3 \\ -1 & 2 \end{pmatrix}$. Tính:
\begin{multicols}{3}
\begin{enumerate}
  \item[a)] $2A$
  \item[b)] {Tính $A^T$}
  \item[c)] $\rank(A)$
\end{enumerate}
\end{multicols}
\end{bt}
`
  );
  zip.file(
    'main.tex',
    String.raw`
\documentclass[12pt]{report}
\usepackage{setup}
\begin{document}
\input{chapters/ch2}
\end{document}
`
  );

  const uint8 = await zip.generateAsync({ type: 'uint8array' });
  const session = await ingestLatexFileOrZip({
    name: 'ĐSTT_Vectoria.zip',
    async arrayBuffer() {
      return uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
    }
  });

  const preambleData = parsePreambleAndGlobals(session.rawPreambleText, session.masterBodyTex);
  const body = session.masterBodyTex;
  const ast = buildTexAst(body, preambleData, { hideCommentEnvs: false });

  const s1 = snapAndReconstructSlice(body, body.indexOf('\\section{Hạng ma trận}'), body.indexOf('\\end{vd}') + 8, ast);
  const s2 = snapAndReconstructSlice(body, body.indexOf('\\subsection{Định lý Đa thức đặc trưng}'), body.indexOf('\\end{figure}') + 12, ast);
  const s3 = snapAndReconstructSlice(body, body.indexOf('\\section*{Bài tập Chương 2}'), body.indexOf('\\end{bt}') + 8, ast);

  const segMap = {
    1: { id: '1', reconstructedTex: s1.reconstructedTex },
    2: { id: '2', reconstructedTex: s2.reconstructedTex },
    3: { id: '3', reconstructedTex: s3.reconstructedTex }
  };

  for (const perm of [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]) {
    const label = perm.join('->');
    const composed = composeAndNormalizeSegments(
      perm.map((k) => segMap[k]),
      { normalizeHierarchy: true, mergeAdjacentLists: true },
      preambleData
    );
    const { resolvedTex } = await exportUsedAssetsToDataUrls(composed.wrappedDocumentTex, session.assetVault);
    const adminHtml = renderLatexForPreviewAndUI(resolvedTex, { sourceMapMode: false, preambleData });
    const studentHtml = parseLatexToHTML(resolvedTex);

    const visAdmin = assertZeroLeaks(adminHtml, `Admin ${label}`);
    const visStudent = assertZeroLeaks(studentHtml, `Student ${label}`);

    for (const [tag, hOut, vOut] of [
      [`Admin ${label}`, adminHtml, visAdmin],
      [`Student ${label}`, studentHtml, visStudent]
    ]) {
      assert.ok(hOut.includes('latex-box-dn is-framed-box'), `[${tag}] dn phải có khung bo góc`);
      assert.ok(hOut.includes('--tcb-radius: 10.8px'), `[${tag}] dn/dl giữ bán kính bo góc 8pt (10.8px)`);
      assert.ok(hOut.includes('latex-box-dl is-framed-box has-boxed-pill'), `[${tag}] dl phải có nhãn pill đính góc trên`);
      assert.ok(hOut.includes('latex-box-tc is-framed-box'), `[${tag}] tc ủy quyền phải có khung`);
      assert.ok(hOut.includes('latex-box-note is-framed-box'), `[${tag}] note từ BeforeBeginEnvironment phải có khung`);
      assert.ok(!hOut.includes('latex-box-vd is-framed-box'), `[${tag}] vd phẳng không được tự ý đóng khung`);
      assert.ok(!hOut.includes('latex-box-bt is-framed-box'), `[${tag}] bt phẳng không được tự ý đóng khung`);
      assert.ok(vOut.includes('Định lý Cayley-Hamilton'), `[${tag}] tiêu đề Định lý phải hiển thị đầy đủ`);
      assert.ok(!vOut.includes('cayley'), `[${tag}] mã tham chiếu {cayley} không được lộ`);
    }

    if (perm[0] === 2 || (perm[0] === 3 && perm[1] === 2)) {
      assert.ok(!/<h3[^>]*>\s*(?:0\.1|1\.1)\b/.test(studentHtml), `[${label}] Không để mục con mồ côi 1.1 trước mục 1`);
    }
  }
});

test('Overleaf Fidelity (ĐSTT_Vectoria): disabled comments/conditionals/includeonly/endinput, scoped \\begingroup\\color{magenta}\\tableofcontents\\endgroup without color bleed, and Chapter 2 counters', async () => {
  const { default: JSZip } = await import('./admin_v2/node_modules/jszip/lib/index.js');
  const { ingestLatexFileOrZip, exportUsedAssetsToDataUrls } = await import(
    './admin_v2/src/utils/latexSlicer/zipIngestor.js'
  );
  const { parsePreambleAndGlobals } = await import('./admin_v2/src/utils/latexSlicer/preambleParser.js');
  const { buildTexAst, snapAndReconstructSlice } = await import('./admin_v2/src/utils/latexSlicer/texAstEngine.js');
  const { composeAndNormalizeSegments } = await import('./admin_v2/src/utils/latexSlicer/hierarchyNormalizer.js');
  const { renderLatexForPreviewAndUI, VECTORIA_ACADEMIC_PREVIEW_CSS } = await import(
    './admin_v2/src/utils/latexSlicer/vectoriaLatexRenderer.js'
  );

  const htmlFile = fs.readFileSync('frontend_v2/knowledge_info.html', 'utf8');
  const funcStart = htmlFile.indexOf('function parseLatexToHTML(texString) {');
  const afterFunc = htmlFile.substring(funcStart);
  const funcEnd = afterFunc.indexOf('function formatLessonBody');
  const funcBody = afterFunc.substring(0, funcEnd).trim();
  const katexModule = await import('./admin_v2/node_modules/katex/dist/katex.js');
  const katex = katexModule.default || katexModule;
  const parseLatexToHTML = new Function('katex', 'tr', `${funcBody}\nreturn parseLatexToHTML;`)(
    katex,
    (_k, fb) => fb
  );

  const zip = new JSZip();
  zip.file(
    'setup.sty',
    String.raw`
\usepackage{xcolor, amsmath, amssymb, comment}
\excludecomment{ghichunhap}
\newtheorem{dn}{Định nghĩa}[chapter]
\newtheorem{vd}{Ví dụ}[chapter]
`
  );
  zip.file('chapters/ch1_disabled.tex', String.raw`\chapter{Chương 1 bị tắt bằng dấu phần trăm}`);
  zip.file('chapters/ch1_draft.tex', String.raw`\chapter{Chương 1 nằm trong khối comment}`);
  zip.file('chapters/ch3_excluded.tex', String.raw`\chapter{Chương 3 bị lọc bởi includeonly}`);
  zip.file(
    'chapters/ch2.tex',
    String.raw`
\setcounter{chapter}{1}
\chapter{Ma trận và hệ phương trình tuyến tính}

\section*{Dẫn nhập}
Ở Chương 1, chúng ta đã biết một vector trong không gian $\mathbb{R}^n$ là một bộ gồm $n$ số thực xếp theo thứ tự. Trong thực tế, khi cần khảo sát đồng thời nhiều đối tượng hoặc nhiều hệ phương trình, ta cần ghép nhiều vector lại với nhau thành một bảng số hai chiều.

\section{Ma trận và các phép toán}
\subsection{Khái niệm ma trận và các loại ma trận đặc biệt}
\begin{dn}
Một ma trận cấp \(m \times n\) là một bảng gồm \(m \cdot n\) số thực.
\end{dn}
\subsubsection{Phép cộng hai ma trận}
Hai ma trận cùng cấp có thể cộng tương ứng từng phần tử.

\begin{comment}
\section{Hạng ma trận}
\subsection{Các phép biến đổi sơ cấp trên dòng và cột}
Nội dung đang soạn dở dang phải được ẩn mặc định giống hệt Overleaf.
\end{comment}

\begin{ghichunhap}
Đoạn ghi chú nội bộ tắt bằng lệnh excludecomment không được hiển thị.
\end{ghichunhap}

\iffalse
\section{Mục nháp tắt bằng iffalse có chứa $P \iff Q$}
\fi

\section*{Bài tập Chương 2}
\addcontentsline{toc}{section}{Bài tập Chương 2}
Hãy giải các bài tập củng cố sau đây.

\endinput
\section{Nội dung rác nằm sau lệnh endinput không bao giờ được biên dịch}
`
  );
  zip.file(
    'main.tex',
    String.raw`
\documentclass[12pt,letterpaper]{report}
\usepackage{setup}
\includeonly{chapters/ch2}
\begin{document}
\begin{titlepage}
\begin{center}
\textbf{ĐỀ TÀI ĐẠI SỐ TUYẾN TÍNH}\\
\textbf{TP. Hồ Chí Minh, \today}
\end{center}
\end{titlepage}
\begingroup
\color{magenta}
\tableofcontents
\endgroup
\newpage
% \input{chapters/ch1_disabled}
\begin{comment}
\input{chapters/ch1_draft}
\end{comment}
\include{chapters/ch2}
\include{chapters/ch3_excluded}
\end{document}
`
  );

  const uint8 = await zip.generateAsync({ type: 'uint8array' });
  const session = await ingestLatexFileOrZip({
    name: 'ĐSTT_Vectoria (1).zip',
    async arrayBuffer() {
      return uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
    }
  });

  const preambleData = parsePreambleAndGlobals(session.rawPreambleText, session.masterBodyTex);
  const body = session.masterBodyTex;
  // Default options (hideCommentEnvs defaults to true like Overleaf)
  const ast = buildTexAst(body, preambleData);
  const manuscriptHtml = renderLatexForPreviewAndUI(body, {
    sourceMapMode: true,
    ast,
    preambleData
  });

  // Also test full merged document through frontend_v2/knowledge_info.html parseLatexToHTML
  const fullStandaloneLikeDoc = `${session.rawPreambleText}\n\\begin{document}\n${body}\n\\end{document}`;
  const fullStudentHtml = parseLatexToHTML(fullStandaloneLikeDoc);

  for (const [label, htmlOut] of [
    ['Admin Manuscript Preview', manuscriptHtml],
    ['Student Full Render', fullStudentHtml]
  ]) {
    // 1. All commented / disabled / excluded / post-endinput blocks MUST be hidden like Overleaf
    assert.ok(!htmlOut.includes('Chương 1 bị tắt'), `[${label}] Không lộ file tắt bằng %`);
    assert.ok(!htmlOut.includes('Chương 1 nằm trong khối comment'), `[${label}] Không nạp \\input bên trong \\begin{comment}`);
    assert.ok(!htmlOut.includes('Chương 3 bị lọc bởi includeonly'), `[${label}] Tôn trọng \\includeonly`);
    assert.ok(!htmlOut.includes('Hạng ma trận'), `[${label}] Ẩn mặc định \\begin{comment}...\\end{comment}`);
    assert.ok(!htmlOut.includes('excludecomment'), `[${label}] Ẩn môi trường \\excludecomment`);
    assert.ok(!htmlOut.includes('Mục nháp tắt bằng iffalse'), `[${label}] Ẩn khối \\iffalse...\\fi chứa \\iff`);
    assert.ok(!htmlOut.includes('sau lệnh endinput'), `[${label}] Cắt bỏ nội dung sau \\endinput`);

    // 2. \tableofcontents rendered in magenta (#d11270) with exact Overleaf entries & tocdepth=2
    assert.ok(htmlOut.includes('latex-toc'), `[${label}] Phải render khối \\tableofcontents`);
    const tocIdx = htmlOut.indexOf('latex-toc');
    const danNhapIdx = htmlOut.indexOf('Dẫn nhập');
    assert.ok(tocIdx !== -1 && danNhapIdx > tocIdx, `[${label}] Mục lục phải nằm trước phần Dẫn nhập`);
    const tocSegment = htmlOut.slice(Math.max(0, tocIdx - 80), danNhapIdx);
    assert.ok(/#d11270/i.test(tocSegment), `[${label}] Mục lục trong \\begingroup\\color{magenta} phải có màu hồng đỏ #d11270`);
    assert.ok(tocSegment.includes('Ma trận và hệ phương trình tuyến tính'), `[${label}] TOC có Chương 2`);
    assert.ok(tocSegment.includes('2.1'), `[${label}] TOC đánh số 2.1 theo bộ đếm Chương 2`);
    assert.ok(tocSegment.includes('2.1.1'), `[${label}] TOC có mục 2.1.1`);
    assert.ok(tocSegment.includes('Bài tập Chương 2'), `[${label}] TOC nhận \\addcontentsline{toc}{section}{Bài tập Chương 2}`);
    assert.ok(!tocSegment.includes('Dẫn nhập'), `[${label}] TOC không tự chèn mục có dấu sao \\section*{Dẫn nhập}`);
    assert.ok(!tocSegment.includes('Phép cộng hai ma trận'), `[${label}] TOC report tocdepth=2 không chèn \\subsubsection`);

    // 3. ZERO magenta color bleeding into "Ở Chương 1, chúng ta đã biết..." after \endgroup
    const afterDanNhap = htmlOut.slice(danNhapIdx);
    const afterDanNhapText = afterDanNhap.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    assert.ok(
      afterDanNhapText.includes('Ở Chương 1, chúng ta đã biết'),
      `[${label}] Đoạn dẫn nhập phải hiển thị đầy đủ`
    );
    assert.ok(
      !/#d11270|magenta/i.test(afterDanNhap),
      `[${label}] Tuyệt đối KHÔNG tràn màu hồng đỏ #d11270 ra ngoài \\endgroup vào đoạn "Ở Chương 1, chúng ta đã biết..."`
    );

    // 4. Authentic Overleaf Chapter 2 layout & numbering
    assert.ok(htmlOut.includes('latex-chapter-label'), `[${label}] Chương hiển thị nhãn dòng trên chuẩn report`);
    assert.ok(htmlOut.includes('Chương 2'), `[${label}] Tôn trọng \\setcounter{chapter}{1} -> Chương 2`);
    assert.ok(!htmlOut.includes('CHƯƠNG 1:'), `[${label}] Không ép in hoa CHƯƠNG 1: sai lệch so với Overleaf`);
    assert.ok(htmlOut.includes('Định nghĩa 2.1'), `[${label}] Đánh số Định nghĩa 2.1 khớp Chương 2`);
    assert.equal((htmlOut.match(/katex-error/g) || []).length, 0, `[${label}] Không được có lỗi KaTeX`);
  }

  // 5. Outline sidebar numbers match Overleaf
  const outlineLabels = ast.outlineHeadings.map((h) => (h.numLabel ? `${h.numLabel} ${h.cleanTitle}` : h.cleanTitle));
  assert.deepEqual(outlineLabels, [
    '2 Ma trận và hệ phương trình tuyến tính',
    'Dẫn nhập',
    '2.1 Ma trận và các phép toán',
    '2.1.1 Khái niệm ma trận và các loại ma trận đặc biệt',
    '2.1.1.1 Phép cộng hai ma trận',
    'Bài tập Chương 2'
  ]);

  // 6. Slicing Section 2.1 + Bài tập Chương 2 as a standalone lesson normalizes numbering from 1 & strips orphan \addcontentsline
  const secStart = body.indexOf('\\section{Ma trận và các phép toán}');
  const secEnd = body.indexOf('từng phần tử.') + 'từng phần tử.'.length;
  const btStart = body.indexOf('\\section*{Bài tập Chương 2}');
  const btEnd = body.indexOf('sau đây.') + 'sau đây.'.length;
  const slice1 = snapAndReconstructSlice(body, secStart, secEnd, ast);
  const slice2 = snapAndReconstructSlice(body, btStart, btEnd, ast);
  const composed = composeAndNormalizeSegments(
    [
      { id: '1', reconstructedTex: slice1.reconstructedTex },
      { id: '2', reconstructedTex: slice2.reconstructedTex }
    ],
    { normalizeHierarchy: true, mergeAdjacentLists: true },
    preambleData
  );
  const { resolvedTex } = await exportUsedAssetsToDataUrls(composed.wrappedDocumentTex, session.assetVault);
  const slicedAdminHtml = renderLatexForPreviewAndUI(resolvedTex, { sourceMapMode: false, preambleData });
  const slicedStudentHtml = parseLatexToHTML(resolvedTex);
  assert.ok(!slicedAdminHtml.includes('addcontentsline'), 'Không rò rỉ \\addcontentsline khi cắt rời mục không kèm TOC');
  assert.ok(!slicedStudentHtml.includes('addcontentsline'), 'Student UI không rò rỉ \\addcontentsline');
  assert.ok(/1\s+Ma trận và các phép toán/.test(slicedStudentHtml.replace(/<[^>]+>/g, ' ')), 'Bài học đơn lẻ chuẩn hóa mục 2.1 về 1');
});

test('Overleaf Visual & Color Parity: STIX Two Text WOFF2, 12pt Chapter/Section hierarchy, royal-blue Ví dụ inside black tcolorbox, equation (2.1) & magenta \\eqref{1.1}, author highlight macros & [model] colors', async () => {
  const { default: JSZip } = await import('./admin_v2/node_modules/jszip/lib/index.js');
  const { ingestLatexFileOrZip, exportUsedAssetsToDataUrls } = await import(
    './admin_v2/src/utils/latexSlicer/zipIngestor.js'
  );
  const { parsePreambleAndGlobals } = await import('./admin_v2/src/utils/latexSlicer/preambleParser.js');
  const { buildTexAst, snapAndReconstructSlice } = await import('./admin_v2/src/utils/latexSlicer/texAstEngine.js');
  const { composeAndNormalizeSegments } = await import('./admin_v2/src/utils/latexSlicer/hierarchyNormalizer.js');
  const { renderLatexForPreviewAndUI, VECTORIA_ACADEMIC_PREVIEW_CSS } = await import(
    './admin_v2/src/utils/latexSlicer/vectoriaLatexRenderer.js'
  );

  // 1. Self-hosted STIX Two Text WOFF2 binary & CSS/preload integrity
  const fontVariants = [
    'STIXTwoText-Regular.woff2',
    'STIXTwoText-Italic.woff2',
    'STIXTwoText-Bold.woff2',
    'STIXTwoText-BoldItalic.woff2'
  ];
  for (const dir of ['admin_v2/public/fonts', 'frontend_v2/fonts']) {
    for (const file of fontVariants) {
      const fp = path.join(dir, file);
      assert.ok(fs.existsSync(fp), `Thiếu file font self-host: ${fp}`);
      const buf = fs.readFileSync(fp);
      assert.ok(buf.length > 100_000, `File font ${fp} phải là bản đầy đủ tiếng Việt (>100KB), thực tế ${buf.length}B`);
      assert.equal(buf.toString('ascii', 0, 4), 'wOF2', `Header magic WOFF2 không hợp lệ ở ${fp}`);
    }
  }
  const adminCss = fs.readFileSync('admin_v2/src/index.css', 'utf8');
  const frontBaseCss = fs.readFileSync('frontend_v2/css/base.css', 'utf8');
  const adminIndexHtml = fs.readFileSync('admin_v2/index.html', 'utf8');
  const htmlFile = fs.readFileSync('frontend_v2/knowledge_info.html', 'utf8');

  assert.ok(adminCss.includes("font-family: 'STIX Two Text'"), 'admin_v2/src/index.css phải khai báo @font-face STIX Two Text');
  assert.ok(frontBaseCss.includes("font-family: 'STIX Two Text'"), 'frontend_v2/css/base.css phải khai báo @font-face STIX Two Text');
  assert.ok(!adminCss.includes('fonts.googleapis.com') && !frontBaseCss.includes('fonts.googleapis.com'), 'Cấm dùng Google Fonts CDN');
  assert.ok(!/--font-academic:[^\n;]*Cambria[^\n;]*STIX Two Text/.test(adminCss), 'Không đặt Cambria đứng trước STIX Two Text ở admin_v2');
  assert.ok(!/--font-academic:[^\n;]*Cambria[^\n;]*STIX Two Text/.test(htmlFile), 'Không đặt Cambria đứng trước STIX Two Text ở frontend_v2');
  assert.ok(adminIndexHtml.includes('STIXTwoText-Regular.woff2') && adminIndexHtml.includes('STIXTwoText-Bold.woff2'), 'admin_v2/index.html phải preload STIX Two Text');
  assert.ok(htmlFile.includes('STIXTwoText-Regular.woff2') && htmlFile.includes('STIXTwoText-Bold.woff2'), 'knowledge_info.html phải preload STIX Two Text');

  // Verify Overleaf 12pt heading scale & clean borderless section rule in Admin VECTORIA_ACADEMIC_PREVIEW_CSS
  assert.match(VECTORIA_ACADEMIC_PREVIEW_CSS, /\.vectoria-academic-paper\s+\.latex-chapter-label\s*\{[^}]*font-size:\s*1\.96rem/);
  assert.match(VECTORIA_ACADEMIC_PREVIEW_CSS, /\.vectoria-academic-paper\s+\.latex-chapter-title\s*\{[^}]*font-size:\s*2\.36rem/);
  const adminSecCssMatch = /\.vectoria-academic-paper\s+\.latex-section\s*\{([^}]*)\}/.exec(VECTORIA_ACADEMIC_PREVIEW_CSS);
  assert.ok(adminSecCssMatch && adminSecCssMatch[1].includes('1.62rem'), 'Admin .latex-section phải có cỡ 1.62rem');
  assert.ok(!/border-bottom:\s*1px/.test(adminSecCssMatch[1]), 'Admin .latex-section không được tự kẻ gạch ngang 1px dưới chân');

  // Extract Student UI parseLatexToHTML
  const funcStart = htmlFile.indexOf('function parseLatexToHTML(texString) {');
  const afterFunc = htmlFile.substring(funcStart);
  const funcEnd = afterFunc.indexOf('function formatLessonBody');
  const funcBody = afterFunc.substring(0, funcEnd).trim();
  const katexModule = await import('./admin_v2/node_modules/katex/dist/katex.js');
  const katex = katexModule.default || katexModule;
  const parseLatexToHTML = new Function('katex', 'tr', `${funcBody}\nreturn parseLatexToHTML;`)(
    katex,
    (_k, fb) => fb
  );

  // 2. Construct multi-file Overleaf ZIP reproducing ĐSTT_Vectoria Chapter 2 page 2 & 3 + author highlights
  const zip = new JSZip();
  zip.file(
    'setup.sty',
    String.raw`
\usepackage{amsmath, amssymb, amsthm, xcolor, soul, ulem}
\usepackage[most]{tcolorbox}
\usepackage[colorlinks=true, allcolors=magenta]{hyperref}
\definecolor{authoramber}{HTML}{D97706}
\newcommand{\nhanh}[1]{\textcolor{red}{\textbf{#1}}}
\newcommand{\tukhoa}[1]{\textcolor[HTML]{D97706}{\textit{#1}}}
\newtheoremstyle{purplethm}{3pt}{3pt}{\itshape}{}{\bfseries\color{purple}}{.}{.5em}{}
\theoremstyle{purplethm}
\newtheorem{dl}{Định lý}[chapter]
\theoremstyle{definition}
\newtheorem{vd}{\color{blue}Ví dụ}[chapter]
\tcolorboxenvironment{vd}{colback=white, colframe=black, arc=4pt, boxrule=1pt}
`
  );
  zip.file(
    'chapters/ch2.tex',
    String.raw`
\setcounter{chapter}{1}
\chapter{Ma trận và hệ phương trình tuyến tính}

\section*{Dẫn nhập}
Ở Chương 1, chúng ta đã biết không gian $\mathbb{R}^n$.

\section{Ma trận và các phép toán}
\subsection{Khái niệm ma trận và các loại ma trận đặc biệt}

\begin{dn}
Một ma trận cấp \(m \times n\) là một bảng gồm \(m \cdot n\) số \(a_{ij}\) được sắp xếp thành \(m\) hàng và \(n\) cột có dạng:
\begin{equation}\label{1.1}
A = \begin{pmatrix}
a_{11} & a_{12} & \dots & a_{1n} \\
a_{21} & a_{22} & \dots & a_{2n} \\
\dots & \dots & \dots & \dots \\
a_{m1} & a_{m2} & \dots & a_{mn}
\end{pmatrix}
\end{equation}
\end{dn}

Ma trận \eqref{1.1} được ký hiệu bởi \(A = (a_{ij})_{m \times \color{red}n}\).

\begin{vd}
Ma trận \(H = \begin{pmatrix} 0 & 4 & 0 \\ 2 & 0 & 6 \end{pmatrix}\) là ma trận cấp \(2 \times 3\), ở đây \(a_{13} = 0, a_{21} = 2\).
\end{vd}

\begin{dn}
Ma trận vuông là ma trận có số dòng \(m\) bằng số cột \(n\).
\end{dn}

Trong ma trận vuông cấp \(n\), người ta gọi các phần tử \(a_{11}, a_{22}, \dots, a_{nn}\) là các phần tử thuộc \nhanh{đường chéo chính của ma trận $A$}, còn \tukhoa{cấp của ma trận $n$} và \textcolor[HTML]{D97706}{hạng cơ sở} cùng {\color[RGB]{220, 38, 38} lưu ý dấu}, \hl{từ khóa cần nhớ}, \uwave{nhấn mạnh gợn sóng}.

\begin{align}
B &= \begin{bmatrix} 1 & 0 \\ 0 & 9 \end{bmatrix} \label{1.2} \\
C &= I_2 \label{1.3}
\end{align}

Hệ thức \eqref{1.2} và \eqref{1.3} minh họa ma trận chéo.

\begin{dl}
Mọi ma trận đơn vị cấp \(n\) đều khả nghịch.
\end{dl}
`
  );
  zip.file(
    'main.tex',
    String.raw`
\documentclass[12pt,a4paper]{report}
\newtheorem{dn}{Định nghĩa}[chapter]
\usepackage{setup}
\begin{document}
\include{chapters/ch2}
\end{document}
`
  );

  const uint8 = await zip.generateAsync({ type: 'uint8array' });
  const session = await ingestLatexFileOrZip({
    name: 'DSTT_Chapter2_Colors.zip',
    async arrayBuffer() {
      return uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
    }
  });

  // Verify zipIngestor inlined setup.sty AFTER \newtheorem{dn} so dn stays plain theorem (not overridden by setup.sty's \theoremstyle{definition})
  const preambleData = parsePreambleAndGlobals(session.rawPreambleText, session.masterBodyTex);
  assert.equal(preambleData.customEnvs.get('dn')?.bodyFontStyle, 'italic', 'dn khai báo trước setup.sty phải giữ plain italic');
  assert.equal(preambleData.customEnvs.get('dn')?.isFramed, false, 'dn không dùng tcolorbox phải không đóng khung');
  assert.equal(preambleData.customEnvs.get('vd')?.isFramed, true, 'vd bọc bởi \\tcolorboxenvironment phải có khung');
  assert.equal(preambleData.customEnvs.get('vd')?.labelColor, '#1d4ed8', 'vd có \\color{blue} phải giữ màu xanh hoàng gia #1d4ed8');
  assert.equal(preambleData.customEnvs.get('vd')?.bodyFontStyle, 'normal', 'vd dưới \\theoremstyle{definition} phải là chữ đứng');
  assert.equal(preambleData.customEnvs.get('dl')?.labelColor, '#9333ea', 'dl dưới \\newtheoremstyle{purplethm} phải giữ màu tím #9333ea');

  const body = session.masterBodyTex;
  const ast = buildTexAst(body, preambleData);
  const adminManuscriptHtml = renderLatexForPreviewAndUI(body, {
    sourceMapMode: true,
    ast,
    preambleData
  });
  const fullStudentHtml = parseLatexToHTML(`${session.rawPreambleText}\n\\begin{document}\n${body}\n\\end{document}`);

  const assertCommonAuthorColorsAndMath = (tag, htmlOut) => {
    assert.equal((htmlOut.match(/katex-error/g) || []).length, 0, `[${tag}] Không được có lỗi KaTeX`);
    assert.ok(!/\\(?:nhanh|tukhoa|textcolor|uwave|eqref)\b/.test(htmlOut), `[${tag}] Không rò rỉ lệnh LaTeX thô`);

    // Framed vd with black frame AND royal blue #1d4ed8 label (not swallowed by colframe=black)
    const vdTagMatch = /<div class="latex-box latex-box-vd is-framed-box[^"]*"[^>]*style="([^"]+)"/.exec(htmlOut);
    assert.ok(vdTagMatch, `[${tag}] Ví dụ phải có khung bo góc is-framed-box`);
    assert.match(vdTagMatch[1], /--tcb-frame:\s*#11181c/i, `[${tag}] Khung Ví dụ phải viền đen #11181c`);
    assert.match(vdTagMatch[1], /--tcb-label-color:\s*#1d4ed8/i, `[${tag}] Nhãn Ví dụ phải giữ màu xanh dương #1d4ed8`);

    // Unframed dn with italic body, and purple dl
    assert.ok(!htmlOut.includes('latex-box-dn is-framed-box'), `[${tag}] Định nghĩa không được đóng khung giả`);
    assert.ok(htmlOut.includes('latex-box-dn is-body-italic'), `[${tag}] Định nghĩa phải in nghiêng chuẩn plain theorem`);
    assert.match(htmlOut, /latex-box-dl[^"]*"[^>]*style="[^"]*--tcb-label-color:\s*#9333ea/i, `[${tag}] Định lý phải giữ màu tím #9333ea`);

    // Author highlights: \nhanh (#dc2626 + KaTeX A), \tukhoa & \textcolor[HTML]{D97706} (#d97706), {\color[RGB]{220,38,38}}, \hl, \uwave, math \color{red}
    assert.match(htmlOut, /#dc2626/i, `[${tag}] Phải giữ màu đỏ tác giả đánh dấu (#dc2626)`);
    assert.match(htmlOut, /#d97706/i, `[${tag}] Phải giữ màu cam hổ phách [HTML]{D97706} (#d97706)`);
    assert.ok(htmlOut.includes('đường chéo chính của ma trận'), `[${tag}] Nội dung trong macro \\nhanh phải hiển thị đầy đủ`);
    assert.ok(htmlOut.includes('<mark'), `[${tag}] \\hl{...} phải render thẻ highlight <mark>`);
    assert.ok(htmlOut.includes('underline wavy'), `[${tag}] \\uwave{...} phải render gạch chân lượn sóng`);
  };

  for (const [tag, htmlOut] of [
    ['Admin Manuscript Preview', adminManuscriptHtml],
    ['Student Full Render', fullStudentHtml]
  ]) {
    assertCommonAuthorColorsAndMath(tag, htmlOut);

    // Chapter 2 heading scale & clean section headings
    assert.ok(htmlOut.includes('latex-chapter-label') && htmlOut.includes('Chương 2'), `[${tag}] Phải hiển thị nhãn Chương 2`);
    if (tag === 'Student Full Render') {
      assert.match(htmlOut, /latex-chapter-label"[^>]*font-size:\s*1\.96rem/, '[Student] Nhãn Chương 2 phải đạt 1.96rem');
      assert.match(htmlOut, /latex-chapter-title"[^>]*font-size:\s*2\.36rem/, '[Student] Tên Chương 2 phải đạt 2.36rem');
      const stuSecMatch = /<h2 class="latex-section"[^>]*style="([^"]+)"/.exec(htmlOut);
      assert.ok(stuSecMatch && stuSecMatch[1].includes('1.62rem') && !stuSecMatch[1].includes('border-bottom'), '[Student] Section 1.62rem không kẻ đường gạch dưới giả');
    }

    // Equation numbers (2.1), (2.2), (2.3) flush-right without double-counting pmatrix/bmatrix rows
    const eqNums = [...htmlOut.matchAll(/class="latex-eq-number"[^>]*>\(([^)]+)\)<\/span>/g)].map((m) => m[1]);
    assert.deepEqual(eqNums, ['2.1', '2.2', '2.3'], `[${tag}] Đánh số phương trình phải khớp chính xác (2.1), (2.2), (2.3)`);

    // Cross-references Ma trận (2.1), (2.2), (2.3): black parentheses outside + magenta #d11270 number inside
    assert.match(
      htmlOut,
      /\(<a[^>]*class="latex-eqref"[^>]*color:\s*#d11270[^>]*>2\.1<\/a>\)/i,
      `[${tag}] Ma trận \\eqref{1.1} phải có dấu ngoặc đen và số 2.1 màu hồng đỏ #d11270`
    );
    assert.match(
      htmlOut,
      /\(<a[^>]*class="latex-eqref"[^>]*color:\s*#d11270[^>]*>2\.3<\/a>\)/i,
      `[${tag}] Hệ thức \\eqref{1.3} phải trỏ đúng tới dòng thứ 2 của align là 2.3 màu #d11270`
    );
    assert.ok(htmlOut.includes('Ví dụ 2.1.') && htmlOut.includes('Định nghĩa 2.2.'), `[${tag}] Đánh số Ví dụ 2.1. và Định nghĩa 2.2.`);
  }

  // 3. Slice from Section 2.1 to end of Định lý 2.1 (mid-chapter slice WITHOUT \chapter header)
  const sliceStart = body.indexOf('\\section{Ma trận và các phép toán}');
  const sliceEnd = body.indexOf('\\end{dl}') + '\\end{dl}'.length;
  const snapped = snapAndReconstructSlice(body, sliceStart, sliceEnd, ast);

  // 3a. Preserve original Chapter 2 numbering (normalizeHierarchy: false)
  const preservedComposed = composeAndNormalizeSegments(
    [{ id: '1', reconstructedTex: snapped.reconstructedTex }],
    { normalizeHierarchy: false, mergeAdjacentLists: true },
    preambleData
  );
  const { resolvedTex: preservedTex } = await exportUsedAssetsToDataUrls(
    preservedComposed.wrappedDocumentTex,
    session.assetVault
  );
  // Render WITHOUT passing preambleData to prove % @vectoria-doc-config & % @vectoria-box-style self-sufficiency!
  const preservedAdminHtml = renderLatexForPreviewAndUI(preservedTex, { sourceMapMode: false });
  const preservedStudentHtml = parseLatexToHTML(preservedTex);

  for (const [tag, htmlOut] of [
    ['Sliced Preserve Admin (self-contained)', preservedAdminHtml],
    ['Sliced Preserve Student UI', preservedStudentHtml]
  ]) {
    assertCommonAuthorColorsAndMath(tag, htmlOut);
    assert.ok(htmlOut.includes('2.1 Ma trận và các phép toán'), `[${tag}] Giữ nguyên số mục 2.1`);
    assert.ok(htmlOut.includes('Ví dụ 2.1.') && htmlOut.includes('Định nghĩa 2.2.'), `[${tag}] Giữ nguyên Ví dụ 2.1. và Định nghĩa 2.2.`);
    assert.ok(htmlOut.includes('(2.1)') && htmlOut.includes('(2.3)'), `[${tag}] Giữ nguyên số phương trình (2.1) và (2.3)`);
    assert.match(htmlOut, /#d11270[^>]*>2\.1<\//i, `[${tag}] Giữ nguyên tham chiếu (2.1) màu #d11270`);
  }

  // 3b. Standalone normalized lesson numbering from 1 (normalizeHierarchy: true)
  const normComposed = composeAndNormalizeSegments(
    [{ id: '1', reconstructedTex: snapped.reconstructedTex }],
    { normalizeHierarchy: true, mergeAdjacentLists: true },
    preambleData
  );
  const { resolvedTex: normTex } = await exportUsedAssetsToDataUrls(
    normComposed.wrappedDocumentTex,
    session.assetVault
  );
  const normAdminHtml = renderLatexForPreviewAndUI(normTex, { sourceMapMode: false });
  const normStudentHtml = parseLatexToHTML(normTex);

  for (const [tag, htmlOut] of [
    ['Sliced Normalized Admin (self-contained)', normAdminHtml],
    ['Sliced Normalized Student UI', normStudentHtml]
  ]) {
    assertCommonAuthorColorsAndMath(tag, htmlOut);
    const eqNums = [...htmlOut.matchAll(/class="latex-eq-number"[^>]*>\(([^)]+)\)<\/span>/g)].map((m) => m[1]);
    assert.deepEqual(eqNums, ['1', '2', '3'], `[${tag}] Bài học độc lập đánh số phương trình từ (1), (2), (3)`);
    assert.match(htmlOut, /#d11270[^>]*>1<\//i, `[${tag}] Tham chiếu \\eqref{1.1} tự động cập nhật sang (1) màu #d11270`);
    assert.match(htmlOut, /#d11270[^>]*>3<\//i, `[${tag}] Tham chiếu \\eqref{1.3} tự động cập nhật sang (3) màu #d11270`);
    assert.ok(htmlOut.includes('Ví dụ 1.') && htmlOut.includes('Định nghĩa 2.'), `[${tag}] Đánh số Ví dụ 1. và Định nghĩa 2.`);
  }
});

test('Partial TOC + Chapter 2 Intro Slice Regression (ĐSTT_Vectoria): preserves full magenta Mục lục in Stitched Preview & Student UI, keeps 2-line Chương 2 (never degrades to "1 Ma trận..."), and eliminates "chapter1" excerpt leak', async () => {
  const { default: JSZip } = await import('./admin_v2/node_modules/jszip/lib/index.js');
  const { ingestLatexFileOrZip, exportUsedAssetsToDataUrls } = await import(
    './admin_v2/src/utils/latexSlicer/zipIngestor.js'
  );
  const { parsePreambleAndGlobals, buildShortExcerpt } = await import(
    './admin_v2/src/utils/latexSlicer/preambleParser.js'
  );
  const { buildTexAst, snapAndReconstructSlice } = await import('./admin_v2/src/utils/latexSlicer/texAstEngine.js');
  const { composeAndNormalizeSegments } = await import('./admin_v2/src/utils/latexSlicer/hierarchyNormalizer.js');
  const { renderLatexForPreviewAndUI } = await import(
    './admin_v2/src/utils/latexSlicer/vectoriaLatexRenderer.js'
  );

  const htmlFile = fs.readFileSync('frontend_v2/knowledge_info.html', 'utf8');
  const funcStart = htmlFile.indexOf('function parseLatexToHTML(texString) {');
  const afterFunc = htmlFile.substring(funcStart);
  const funcEnd = afterFunc.indexOf('function formatLessonBody');
  const funcBody = afterFunc.substring(0, funcEnd).trim();
  const katexModule = await import('./admin_v2/node_modules/katex/dist/katex.js');
  const katex = katexModule.default || katexModule;
  const parseLatexToHTML = new Function('katex', 'tr', `${funcBody}\nreturn parseLatexToHTML;`)(
    katex,
    (_k, fb) => fb
  );

  // Verify LatexSlicerModal defaults normalizeHierarchy to false ("Giữ nguyên bản gốc")
  const modalSrc = fs.readFileSync('admin_v2/src/components/editor/LatexSlicerModal.jsx', 'utf8');
  assert.ok(
    modalSrc.includes('const [normalizeHierarchy, setNormalizeHierarchy] = useState(false);'),
    'LatexSlicerModal phải mặc định giữ nguyên đánh số bản thảo gốc (normalizeHierarchy = false)'
  );

  const zip = new JSZip();
  zip.file(
    'main.tex',
    String.raw`
\documentclass[12pt,letterpaper]{report}
\usepackage{amsmath, amssymb, xcolor}
\begin{document}
\begingroup
\color{magenta}
\tableofcontents
\endgroup
\newpage
\setcounter{chapter}{1}
\chapter{Ma trận và hệ phương trình tuyến tính}
\section*{Dẫn nhập}
Ở Chương 1, chúng ta đã biết một vector trong không gian $\mathbb{R}^n$ là một bộ gồm $n$ số thực xếp theo thứ tự. Trong thực tế, khi cần khảo sát đồng thời nhiều đối tượng hoặc nhiều hệ phương trình, ta cần ghép nhiều vector lại với nhau thành một bảng số hai chiều. Cấu trúc bảng số đó được gọi là ma trận.

\section{Ma trận và các phép toán}
\subsection{Khái niệm ma trận và các loại ma trận đặc biệt}
Nội dung 2.1.1.
\subsection{Phép cộng ma trận và nhân ma trận với số thực}
Nội dung 2.1.2.
\subsection{Phép nhân hai ma trận và phép chuyển vị ma trận}
Nội dung 2.1.3.
\section*{Bài tập Chương 2}
\addcontentsline{toc}{section}{\textbf{Bài tập Chương 2}}
Nội dung bài tập chương 2.
\end{document}
`
  );

  const uint8 = await zip.generateAsync({ type: 'uint8array' });
  const session = await ingestLatexFileOrZip({
    name: 'ĐSTT_Vectoria (1).zip',
    async arrayBuffer() {
      return uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
    }
  });

  const preambleData = parsePreambleAndGlobals(session.rawPreambleText, session.masterBodyTex);
  const body = session.masterBodyTex;
  const ast = buildTexAst(body, preambleData);

  // Exact slice from user screenshot: from Mục lục (\begingroup) to end of Dẫn nhập ("được gọi là ma trận.")
  const sliceStart = body.indexOf('\\begingroup');
  const endPhrase = 'Cấu trúc bảng số đó được gọi là ma trận.';
  const sliceEnd = body.indexOf(endPhrase) + endPhrase.length;
  const snapped = snapAndReconstructSlice(body, sliceStart, sliceEnd, ast);

  // 1. Sidebar excerpt must NEVER leak "chapter1" or "@vectoria-slice-counters"
  const excerpt = buildShortExcerpt(snapped.reconstructedTex);
  assert.ok(!/chapter\s*1/i.test(excerpt), `Thẻ trích đoạn không được rò rỉ "chapter1": ${excerpt}`);
  assert.ok(!excerpt.includes('vectoria-slice-counters'), `Thẻ trích đoạn không được lộ comment counter: ${excerpt}`);
  assert.ok(excerpt.startsWith('Mục lục · Ma trận'), `Thẻ trích đoạn phải bắt đầu bằng "Mục lục · Ma trận...": ${excerpt}`);

  // 2. Default Stitched Mode (normalizeHierarchy: false) -> Preserves full 6-entry magenta Mục lục + 2-line Chương 2
  const defaultComposed = composeAndNormalizeSegments(
    [{ id: 'seg_1', reconstructedTex: snapped.reconstructedTex }],
    { normalizeHierarchy: false, mergeAdjacentLists: true, manuscriptTocEntries: ast.tocEntries },
    preambleData
  );
  const { resolvedTex: defaultTex } = await exportUsedAssetsToDataUrls(
    defaultComposed.wrappedDocumentTex,
    session.assetVault
  );
  const stitchedAdminSelfContained = renderLatexForPreviewAndUI(defaultTex, { sourceMapMode: false });
  const stitchedStudentHtml = parseLatexToHTML(defaultTex);

  for (const [tag, htmlOut] of [
    ['Stitched Admin Default (self-contained)', stitchedAdminSelfContained],
    ['Student UI Default', stitchedStudentHtml]
  ]) {
    assert.equal((htmlOut.match(/katex-error/g) || []).length, 0, `[${tag}] Không lỗi KaTeX`);
    assert.ok(htmlOut.includes('latex-toc'), `[${tag}] Khối Mục lục KHÔNG ĐƯỢC biến mất ở Bản ghép`);
    const tocMatch = /<(?:div|nav)[^>]*class="latex-toc"/.exec(htmlOut);
    const chapMatch = /<h1[^>]*class="latex-chapter"/.exec(htmlOut);
    const tocIdx = tocMatch ? tocMatch.index : -1;
    const chapIdx = chapMatch ? chapMatch.index : -1;
    assert.ok(tocIdx !== -1 && chapIdx > tocIdx, `[${tag}] Mục lục phải đứng trước Chương 2`);

    const tocPart = htmlOut.slice(Math.max(0, tocIdx - 80), chapIdx);
    assert.match(tocPart, /#d11270/i, `[${tag}] Mục lục giữ đúng màu hồng đỏ #d11270`);
    for (const expectedEntry of [
      'Ma trận và hệ phương trình tuyến tính',
      '2.1',
      '2.1.1',
      '2.1.2',
      '2.1.3',
      'Bài tập Chương 2'
    ]) {
      assert.ok(tocPart.includes(expectedEntry), `[${tag}] Mục lục phải bảo toàn đầy đủ mục "${expectedEntry}" dù cắt ngang sau Dẫn nhập`);
    }

    // Two-line Chương 2 preserved (NEVER mutated into "1 Ma trận và hệ phương trình tuyến tính")
    assert.ok(htmlOut.includes('latex-chapter-label') && htmlOut.includes('Chương 2'), `[${tag}] Phải giữ nguyên nhãn 2 dòng Chương 2`);
    assert.ok(!/1\s+Ma trận và hệ phương trình tuyến tính/.test(htmlOut.replace(/<[^>]+>/g, ' ')), `[${tag}] Cấm biến Chương 2 thành mục "1 Ma trận..."`);

    // Zero magenta bleed into Chương 2 or Dẫn nhập
    const afterChap = htmlOut.slice(chapIdx);
    assert.ok(!/#d11270|magenta/i.test(afterChap), `[${tag}] Không tràn màu #d11270 xuống Chương 2 và Dẫn nhập`);
  }

  // 3. Even when Admin toggles ON normalizeHierarchy: true, \chapter stays a 2-line \chapter ("Chương 1") instead of flattening into \section ("1 Ma trận...")
  const normalizedChapComposed = composeAndNormalizeSegments(
    [{ id: 'seg_1', reconstructedTex: snapped.reconstructedTex }],
    { normalizeHierarchy: true, mergeAdjacentLists: true, manuscriptTocEntries: ast.tocEntries },
    preambleData
  );
  const normChapAdmin = renderLatexForPreviewAndUI(normalizedChapComposed.wrappedDocumentTex, { sourceMapMode: false });
  const normChapStudent = parseLatexToHTML(normalizedChapComposed.wrappedDocumentTex);
  for (const [tag, htmlOut] of [
    ['Normalized Chapter Admin', normChapAdmin],
    ['Normalized Chapter Student', normChapStudent]
  ]) {
    assert.ok(htmlOut.includes('latex-chapter-label') && htmlOut.includes('Chương 1'), `[${tag}] Khi chuẩn hóa từ 1, \\chapter vẫn phải giữ bố cục 2 dòng Chương 1`);
    assert.ok(!/<h2 class="latex-section"[^>]*>\s*1\s+Ma trận/.test(htmlOut), `[${tag}] Không bao giờ giáng cấp \\chapter xuống \\section`);
  }

  // 4. Slicing Mục lục ALONE (0 headings in slice) still renders full 6-entry magenta Mục lục
  const tocOnlyEnd = body.indexOf('\\endgroup') + '\\endgroup'.length;
  const tocOnlySnap = snapAndReconstructSlice(body, sliceStart, tocOnlyEnd, ast);
  const tocOnlyComposed = composeAndNormalizeSegments(
    [{ id: 'seg_toc', reconstructedTex: tocOnlySnap.reconstructedTex }],
    { normalizeHierarchy: false, mergeAdjacentLists: true },
    preambleData
  );
  const tocOnlyAdmin = renderLatexForPreviewAndUI(tocOnlyComposed.wrappedDocumentTex, { sourceMapMode: false });
  const tocOnlyStudent = parseLatexToHTML(tocOnlyComposed.wrappedDocumentTex);
  assert.ok(tocOnlyAdmin.includes('latex-toc') && tocOnlyAdmin.includes('2.1.3') && tocOnlyAdmin.includes('Bài tập Chương 2'));
  assert.ok(tocOnlyStudent.includes('latex-toc') && tocOnlyStudent.includes('2.1.3') && tocOnlyStudent.includes('Bài tập Chương 2'));
});

test('Direct Preview In-Object Editing Round-Trip & Admin-Student 100% Parity: fonts, sizes, marks, colors, alignment, atomic math chips, special TeX char escaping, and validation', async () => {
  const {
    parseLatexBlockToEditableModel,
    serializeEditableDomToLatex,
    validateSerializedLatexBlock,
    buildMathChipHtml,
    buildRefChipHtml,
    sanitizePastedContentToHtml
  } = await import('./admin_v2/src/utils/latexSlicer/previewBlockEditor.js');
  const { renderLatexForPreviewAndUI } = await import(
    './admin_v2/src/utils/latexSlicer/vectoriaLatexRenderer.js'
  );
  const { composeAndNormalizeSegments } = await import(
    './admin_v2/src/utils/latexSlicer/hierarchyNormalizer.js'
  );

  // Extract Student UI parseLatexToHTML directly from frontend_v2/knowledge_info.html
  const htmlFile = fs.readFileSync('frontend_v2/knowledge_info.html', 'utf8');
  const funcStart = htmlFile.indexOf('function parseLatexToHTML(texString) {');
  const afterFunc = htmlFile.substring(funcStart);
  const funcEnd = afterFunc.indexOf('function formatLessonBody');
  const funcBody = afterFunc.substring(0, funcEnd).trim();
  const katexModule = await import('./admin_v2/node_modules/katex/dist/katex.js');
  const katex = katexModule.default || katexModule;
  const parseLatexToHTML = new Function('katex', 'tr', `${funcBody}\nreturn parseLatexToHTML;`)(
    katex,
    (_k, fb) => fb
  );

  // 1. Round-trip an existing academic Definition box with optional title, label, bold, italic, and inline math
  const originalBoxTex = `\\begin{dn}[Ma trận vuông]
\\label{dn:mat-vuong}
Một \\textbf{ma trận vuông} cấp $n$ có số dòng $m$ bằng số cột $n$, xem \\eqref{eq:2.1}.
\\end{dn}`;

  const parsedBox = parseLatexBlockToEditableModel(originalBoxTex);
  assert.equal(parsedBox.blockRole, 'box:dn');
  assert.equal(parsedBox.boxTitle, 'Ma trận vuông');
  assert.deepEqual(parsedBox.preservedLabels, ['dn:mat-vuong']);
  assert.ok(parsedBox.editableHtml.includes('data-v-chip="math"'), 'Inline math locked as atomic chip');
  assert.ok(parsedBox.editableHtml.includes('data-v-chip="ref"'), '\\eqref locked as atomic ref chip');

  const roundTrippedBox = serializeEditableDomToLatex(parsedBox.editableHtml, parsedBox);
  assert.equal(validateSerializedLatexBlock(roundTrippedBox).valid, true);
  assert.ok(roundTrippedBox.includes('\\begin{dn}[Ma trận vuông]'));
  assert.ok(roundTrippedBox.includes('\\label{dn:mat-vuong}'));
  assert.ok(roundTrippedBox.includes('\\textbf{ma trận vuông}'));
  assert.ok(roundTrippedBox.includes('$n$'));
  assert.ok(roundTrippedBox.includes('\\eqref{eq:2.1}'));

  // 2. Simulate rich in-place editing with ALL fonts, sizes, marks, colors, alignment, math chip, AND dangerous TeX chars (%, #, &, _, $50 — $100, {, }, ~, ^)
  const mathChip = buildMathChipHtml('A \\in \\mathbb{R}^{m \\times n}', '$');
  const refChip = buildRefChipHtml('eqref', 'eq:2.1');
  const richEditedHtml = [
    '<span data-v-size="Large"><span data-v-font="sans"><span data-v-color="#8e1728"><strong data-v-mark="bold">Lưu ý quan trọng:</strong></span></span></span> ',
    'Tăng 15% ở bước #1 với x_1 &amp; x_2, chi phí $50 — $100 {mức ~2^3} cho ma trận ',
    mathChip,
    ' theo ',
    refChip,
    '. ',
    '<span data-v-size="footnotesize"><span data-v-font="mono">det(A) != 0</span></span> ',
    '<span data-v-font="smallcaps">Hệ Tiên Đề</span> ',
    '<span data-v-mark="uwave">nhấn sóng</span> ',
    '<mark data-v-mark="hl">tô sáng</mark> ',
    '<s data-v-mark="sout">bỏ cũ</s>.'
  ].join('');

  const serializedRichTex = serializeEditableDomToLatex(richEditedHtml, {
    blockRole: 'paragraph',
    align: 'center',
    preservedLabels: []
  });

  const validRich = validateSerializedLatexBlock(serializedRichTex);
  assert.equal(validRich.valid, true, `Khối LaTeX sinh ra phải hợp lệ 100%: ${validRich.error}`);
  assert.ok(serializedRichTex.startsWith('\\begin{center}') && serializedRichTex.endsWith('\\end{center}'));
  assert.ok(serializedRichTex.includes('\\Large'), 'Có cỡ chữ \\Large');
  assert.ok(serializedRichTex.includes('\\textsf{'), 'Có font không chân \\textsf');
  assert.ok(serializedRichTex.includes('\\textcolor{#8e1728}'), 'Có màu #8e1728');
  assert.ok(serializedRichTex.includes('\\texttt{'), 'Có font mã lệnh \\texttt');
  assert.ok(serializedRichTex.includes('\\textsc{'), 'Có font hoa nhỏ \\textsc');
  assert.ok(serializedRichTex.includes('\\uwave{nhấn sóng}'), 'Có gạch chân lượn sóng \\uwave');
  assert.ok(serializedRichTex.includes('\\hl{tô sáng}'), 'Có tô sáng \\hl');
  assert.ok(serializedRichTex.includes('\\sout{bỏ cũ}'), 'Có gạch ngang \\sout');
  assert.ok(serializedRichTex.includes('15\\%') && serializedRichTex.includes('\\#1'), 'Tự động escape % và #');
  assert.ok(serializedRichTex.includes('x\\_1 \\& x\\_2'), 'Tự động escape _ và &');
  assert.ok(serializedRichTex.includes('\\$50 - \\$100'), 'Tự động escape $ tiền tệ và chuẩn hóa em-dash sang -');
  assert.ok(serializedRichTex.includes('$A \\in \\mathbb{R}^{m \\times n}$'), 'Chip toán học giữ nguyên $...$ không bị escape');

  // 3. Verify 100% Render Parity across Admin Preview AND Student UI (knowledge_info.html)
  const composedRich = composeAndNormalizeSegments(
    [{ id: 'seg_rich', kind: 'sliced', reconstructedTex: serializedRichTex }],
    { normalizeHierarchy: false }
  );
  const adminHtml = renderLatexForPreviewAndUI(composedRich.wrappedDocumentTex, { sourceMapMode: false });
  const studentHtml = parseLatexToHTML(composedRich.wrappedDocumentTex);

  for (const [engineName, outHtml] of [
    ['Admin Preview (vectoriaLatexRenderer)', adminHtml],
    ['Student UI (knowledge_info.html)', studentHtml]
  ]) {
    assert.equal((outHtml.match(/katex-error/g) || []).length, 0, `[${engineName}] Không có lỗi KaTeX`);
    assert.ok(outHtml.includes('katex'), `[${engineName}] Biểu thức ma trận A in R^{m x n} được KaTeX biên dịch`);
    assert.ok(outHtml.includes('Be Vietnam Pro'), `[${engineName}] Render đúng font không chân Be Vietnam Pro cho \\textsf`);
    assert.match(outHtml, /1\.35?rem/, `[${engineName}] Render đúng cỡ chữ \\Large`);
    assert.match(outHtml, /0\.85em/, `[${engineName}] Render đúng cỡ chữ \\footnotesize (0.85em)`);
    assert.match(outHtml, /#8e1728/i, `[${engineName}] Render đúng màu học thuật #8e1728`);
    assert.match(outHtml, /wavy/i, `[${engineName}] Render đúng gạch chân lượn sóng \\uwave`);
    assert.match(outHtml, /<mark\b/i, `[${engineName}] Render đúng tô sáng \\hl`);
    assert.match(outHtml, /small-caps/i, `[${engineName}] Render đúng hoa nhỏ \\textsc`);

    const plainVisible = outHtml.replace(/<[^>]+>/g, ' ').replace(/&#36;/g, '$').replace(/&amp;/g, '&');
    assert.ok(plainVisible.includes('15%'), `[${engineName}] Hiển thị đúng 15% không bị cắt comment`);
    assert.ok(plainVisible.includes('#1'), `[${engineName}] Hiển thị đúng #1 không lòi \\#1`);
    assert.ok(plainVisible.includes('x_1 & x_2'), `[${engineName}] Hiển thị đúng x_1 & x_2`);
    assert.ok(plainVisible.includes('$50 - $100'), `[${engineName}] Hiển thị đúng $50 - $100 mà không bị nuốt làm toán $...$`);

    // Must never leak raw LaTeX command tokens
    for (const forbidden of [
      '\\textsf',
      '\\Large',
      '\\footnotesize',
      '\\textcolor',
      '\\uwave',
      '\\hl{',
      '\\sout{',
      '\\textasciitilde',
      '\\textasciicircum',
      '___LATEX_ESCAPED_DOLLAR___'
    ]) {
      assert.ok(!outHtml.includes(forbidden), `[${engineName}] Tuyệt đối không rò rỉ mã lệnh thô "${forbidden}"`);
    }
  }

  // 4. Paste sanitizer turns inline $...$ into atomic KaTeX chip while normalizing em-dash
  const pastedHtml = sanitizePastedContentToHtml('Ta xét $x^2 + y^2 = 1$ — đường tròn đơn vị.');
  assert.ok(pastedHtml.includes('data-v-chip="math"') && pastedHtml.includes('x^2 + y^2 = 1'));
  assert.ok(!pastedHtml.includes('—') && pastedHtml.includes(' - '));

  // 5. Validation catches unbalanced braces, mismatched environments, and odd $ delimiters
  assert.equal(validateSerializedLatexBlock('\\textbf{thiếu ngoặc').valid, false);
  assert.equal(validateSerializedLatexBlock('\\begin{dn}\nNội dung\n\\end{vd}').valid, false);
  assert.equal(validateSerializedLatexBlock('Công thức lẻ $x + 1 chưa đóng').valid, false);
});

test('Outside-Object Custom Segment (kind: "custom") Stitching, Counter Preservation, Normalization, Reordering & Deletion', async () => {
  const { parsePreambleAndGlobals, parseVectoriaBoxStyleComments, parseVectoriaDocConfigComments } =
    await import('./admin_v2/src/utils/latexSlicer/preambleParser.js');
  const { buildTexAst, snapAndReconstructSlice } = await import(
    './admin_v2/src/utils/latexSlicer/texAstEngine.js'
  );
  const {
    composeAndNormalizeSegments,
    canonicalizeSlicedSegmentTex,
    createHeadingNormalizerRunner,
    cleanBoxOptionalTitle
  } = await import('./admin_v2/src/utils/latexSlicer/hierarchyNormalizer.js');
  const { renderLatexForPreviewAndUI } = await import(
    './admin_v2/src/utils/latexSlicer/vectoriaLatexRenderer.js'
  );

  const rawDoc = `
\\documentclass{book}
\\newtheorem{dn}{Định nghĩa}[chapter]
\\begin{document}
\\setcounter{chapter}{1}
\\chapter{Ma trận và hệ phương trình}
\\section{Khái niệm ma trận}
Đoạn trích 1 ở mục 2.1 với ma trận $A$.

\\section{Các phép toán ma trận}
Mục 2.2 bị bỏ qua không trích xuất.

\\section{Hạng của ma trận}
\\begin{dn}[Hạng ma trận]
Đoạn trích 2 ở mục 2.3 sau khi bỏ qua mục 2.2.
\\end{dn}
\\end{document}
  `.trim();

  const bodyStart = rawDoc.indexOf('\\begin{document}') + '\\begin{document}'.length;
  const bodyEnd = rawDoc.indexOf('\\end{document}');
  const rawPreamble = rawDoc.slice(0, rawDoc.indexOf('\\begin{document}'));
  const masterBody = rawDoc.slice(bodyStart, bodyEnd);

  const preambleData = parsePreambleAndGlobals(rawPreamble, masterBody);
  const ast = buildTexAst(masterBody, preambleData);

  // Slice Seg 1 (Section 2.1) and Seg 3 (Section 2.3, skipping 2.2)
  const s1Start = masterBody.indexOf('\\section{Khái niệm ma trận}');
  const s1End = masterBody.indexOf('\\section{Các phép toán ma trận}');
  const snap1 = snapAndReconstructSlice(masterBody, s1Start, s1End, ast);
  const canon1 = canonicalizeSlicedSegmentTex(snap1.reconstructedTex, preambleData);

  const s3Start = masterBody.indexOf('\\section{Hạng của ma trận}');
  const s3End = masterBody.length;
  const snap3 = snapAndReconstructSlice(masterBody, s3Start, s3End, ast);
  const canon3 = canonicalizeSlicedSegmentTex(snap3.reconstructedTex, preambleData);

  const seg1 = {
    id: 'seg_1',
    kind: 'sliced',
    snappedStart: snap1.snappedStart,
    snappedEnd: snap1.snappedEnd,
    countersBefore: canon1.countersBefore,
    originalTex: canon1.canonicalTex,
    reconstructedTex: canon1.canonicalTex
  };

  // Independent Outside-Object Custom Segment inserted between Seg 1 and Seg 3!
  const customBridgeTex = [
    '\\subsection*{Liên hệ chuyển tiếp giữa khái niệm và hạng ma trận}',
    '{\\Large \\textcolor{#1d4ed8}{\\textbf{Cầu nối sư phạm:}}} Trước khi xét hạng của $A$, ta lưu ý phép biến đổi sơ cấp không làm đổi không gian dòng.'
  ].join('\n\n');

  const seg2Custom = {
    id: 'seg_2_custom',
    kind: 'custom',
    snappedStart: null,
    snappedEnd: null,
    countersBefore: null,
    originalTex: customBridgeTex,
    reconstructedTex: customBridgeTex
  };

  const seg3 = {
    id: 'seg_3',
    kind: 'sliced',
    snappedStart: snap3.snappedStart,
    snappedEnd: snap3.snappedEnd,
    countersBefore: canon3.countersBefore,
    originalTex: canon3.canonicalTex,
    reconstructedTex: canon3.canonicalTex
  };

  const stitchedSegments = [seg1, seg2Custom, seg3];

  // 1. Default mode (normalizeHierarchy: false) -> No overlap false-positives; Seg 3 keeps original 2.3 numbering despite Custom Seg 2 in between!
  const composedOrig = composeAndNormalizeSegments(
    stitchedSegments,
    { normalizeHierarchy: false },
    preambleData
  );
  assert.equal(composedOrig.overlappingSegmentPairs.length, 0, 'Đối tượng custom (snappedStart: null) không gây báo động giả chồng lấn');

  const fullOrigHtml = renderLatexForPreviewAndUI(composedOrig.wrappedDocumentTex, {
    sourceMapMode: false,
    preambleData
  });
  assert.ok(fullOrigHtml.includes('2.1 Khái niệm ma trận'), 'Seg 1 giữ đúng mục 2.1');
  assert.ok(fullOrigHtml.includes('Cầu nối sư phạm:'), 'Seg 2 (custom) xuất hiện đúng giữa Seg 1 và Seg 3');
  assert.ok(fullOrigHtml.includes('2.3 Hạng của ma trận'), 'Seg 3 giữ đúng mục 2.3 gốc dù có đối tượng custom đứng giữa');

  // Verify per-segment source-mapped rendering on Tab 2 ("Bản ghép") matches fullOrigHtml numbering
  const sharedCounters = {
    isStandaloneNormalized: false,
    persistedBoxStyles: parseVectoriaBoxStyleComments(composedOrig.wrappedDocumentTex),
    persistedDocCfg: parseVectoriaDocConfigComments(composedOrig.wrappedDocumentTex),
    overrideGlobalLabels: composedOrig.stitchedLabelMap,
    headingNormalizer: createHeadingNormalizerRunner(stitchedSegments, false),
    cleanBoxOptFn: null,
    stitchedTocEntries: composedOrig.stitchedTocEntries,
    headingNums: { chap: 0, sec: 0, subsec: 0, subsubsec: 0 },
    eqCounters: { eq: 0 },
    boxCounters: {}
  };
  const perSegHtmls = stitchedSegments.map((seg, idx) => {
    if (seg.countersBefore) {
      const sc = seg.countersBefore;
      if (idx > 0 || (sc.chapter || 0) > 0) sharedCounters.headingNums.chap = sc.chapter || 0;
      if (idx > 0 || (sc.section || 0) > 0) sharedCounters.headingNums.sec = sc.section || 0;
    }
    return renderLatexForPreviewAndUI(seg.reconstructedTex, {
      sourceMapMode: true,
      preambleData,
      sharedCounters
    });
  });
  assert.ok(perSegHtmls[0].includes('2.1 Khái niệm ma trận'));
  assert.ok(
    perSegHtmls[1].replace(/<[^>]+>/g, '').includes('Cầu nối sư phạm:') &&
      perSegHtmls[1].includes('data-tex-start="0"')
  );
  assert.ok(perSegHtmls[2].includes('2.3 Hạng của ma trận'));

  // 2. Normalized mode (normalizeHierarchy: true) -> Continuous 1-based numbering across sliced & custom segments
  const composedNorm = composeAndNormalizeSegments(
    stitchedSegments,
    { normalizeHierarchy: true },
    preambleData
  );
  const fullNormHtml = renderLatexForPreviewAndUI(composedNorm.wrappedDocumentTex, {
    sourceMapMode: false,
    preambleData
  });
  assert.ok(fullNormHtml.includes('1 Khái niệm ma trận'), 'Chuẩn hóa từ 1: mục đầu đánh số 1');
  assert.ok(fullNormHtml.includes('2 Hạng của ma trận'), 'Chuẩn hóa từ 1: mục sau khối custom đánh số liên tục là 2');

  // 3. Reordering [Seg 2 (custom), Seg 1, Seg 3] places custom object first cleanly
  const reordered = composeAndNormalizeSegments(
    [seg2Custom, seg1, seg3],
    { normalizeHierarchy: true },
    preambleData
  );
  assert.ok(
    reordered.finalBodyTex.indexOf('Cầu nối sư phạm:') <
      reordered.finalBodyTex.indexOf('Khái niệm ma trận'),
    'Đảo thứ tự đưa đối tượng custom lên đầu bài học hoạt động chính xác'
  );

  // 4. Deleting Seg 2 (custom) leaves Seg 1 and Seg 3 completely untouched
  const afterDeleteCustom = composeAndNormalizeSegments(
    [seg1, seg3],
    { normalizeHierarchy: false },
    preambleData
  );
  assert.ok(!afterDeleteCustom.finalBodyTex.includes('Cầu nối sư phạm:'));
  assert.ok(afterDeleteCustom.finalBodyTex.includes('Khái niệm ma trận'));
  assert.ok(afterDeleteCustom.finalBodyTex.includes('Hạng của ma trận'));
});






