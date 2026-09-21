/**
 * LaTeX Question Parser for Vectoria Admin
 * Chuyen boc tach de bai trac nghiem Toan hoc viet bang LaTeX / Text
 * Chuan hoa cac truong: De bai, 4 phuong an, Dap an dung, Loi giai, Loai bay, Nhan nhan thuc
 */

const DISTRACTOR_PATTERNS = [
  { type: 'SIGN_SLIP', regex: /\[SIGN_SLIP\]|\((?:nhầm dấu|sai dấu|dấu âm|dấu)\)/i },
  { type: 'DEGENERACY_TRAP', regex: /\[DEGENERACY_TRAP\]|\((?:suy biến|điều kiện biên|biên|det\s*=\s*0|tham số\s*=\s*0)\)/i },
  { type: 'PROPERTY_CONFUSION', regex: /\[PROPERTY_CONFUSION\]|\((?:nhầm tính chất|tính chất|giao hoán|không giao hoán)\)/i },
  { type: 'DIMENSION_MISMATCH', regex: /\[DIMENSION_MISMATCH\]|\((?:nhầm số chiều|sai số chiều|số chiều|hệ sinh)\)/i },
  { type: 'ARITHMETIC_SLIP', regex: /\[ARITHMETIC_SLIP\]|\((?:tính nhẩm|bất cẩn|số học|sai số)\)/i }
];

/**
 * Trich xuat loai bay tu chuoi phuong an va lam sach text
 */
function extractDistractor(text) {
  if (!text) return { cleanText: '', distractorType: 'NONE' };
  
  let cleanText = text;
  let distractorType = 'NONE';

  for (const p of DISTRACTOR_PATTERNS) {
    if (p.regex.test(cleanText)) {
      distractorType = p.type;
      cleanText = cleanText.replace(p.regex, '').trim();
      break;
    }
  }

  return { cleanText, distractorType };
}

/**
 * Trich xuat noi dung ben trong macro co chua ngoac nhon long nhau
 * Vi du: \content{Cho ma tran $\begin{pmatrix} 1 & 2 \end{pmatrix}$}
 */
function extractBalancedMacro(str, macroName) {
  if (!str) return null;
  const marker = '\\' + macroName + '{';
  const startIdx = str.indexOf(marker);
  if (startIdx === -1) return null;

  let depth = 1;
  let i = startIdx + marker.length;
  while (i < str.length && depth > 0) {
    const ch = str[i];
    const prev = i > 0 ? str[i - 1] : '';
    if (ch === '{' && prev !== '\\') {
      depth++;
    } else if (ch === '}' && prev !== '\\') {
      depth--;
    }
    if (depth === 0) break;
    i++;
  }

  if (depth === 0) {
    return {
      content: str.substring(startIdx + marker.length, i).trim(),
      fullMatch: str.substring(startIdx, i + 1)
    };
  }
  return null;
}

/**
 * Boc tach 1 cau hoi don le tu van ban
 */
export function parseSingleQuestion(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return null;
  }

  let text = rawText.trim();
  
  // Loai bo cac boc moi truong \begin{question}/\begin{ex}/\begin{exercise} neu co
  text = text
    .replace(/^\\begin\{(?:question|ex|exercise)\}/i, '')
    .replace(/\\end\{(?:question|ex|exercise)\}$/i, '')
    .trim();

  // 0. Bóc tách metadata nếu có: \topic{...}, \lesson{...}, \difficulty{...}, \source{...}, \tags{...}
  let explicitTopic = null;
  let explicitLesson = null;
  let explicitDifficulty = null;
  let explicitSource = null;
  let explicitTags = [];

  const topicMatch = text.match(/\\topic\{([^}]+)\}/i);
  if (topicMatch) {
    explicitTopic = topicMatch[1].trim();
    text = text.replace(topicMatch[0], '').trim();
  }

  const lessonMatch = text.match(/\\lesson\{([^}]+)\}/i);
  if (lessonMatch) {
    explicitLesson = lessonMatch[1].trim();
    text = text.replace(lessonMatch[0], '').trim();
  }

  const diffMatch = text.match(/\\difficulty\{([^}]+)\}/i);
  if (diffMatch) {
    explicitDifficulty = diffMatch[1].trim().toUpperCase();
    text = text.replace(diffMatch[0], '').trim();
  }

  // Bóc tách nguồn: \source{...} hoặc \nguon{...}
  const sourceMacro = extractBalancedMacro(text, 'source') || extractBalancedMacro(text, 'nguon');
  if (sourceMacro) {
    explicitSource = sourceMacro.content.trim();
    text = text.replace(sourceMacro.fullMatch, '').trim();
  } else {
    // Nhận diện tiền tố [Đề thi...] hoặc [Nguồn: ...] ở đầu câu
    const prefixMatch = text.match(/^\s*\[((?:Đề|Thi|GK|CK|K\d+|ĐH|ĐHQG|ĐHBK|Giáo trình|Nguồn|Bài tập)[\s\S]*?)\]\s*/i);
    if (prefixMatch) {
      explicitSource = prefixMatch[1].trim();
      text = text.replace(prefixMatch[0], '').trim();
    }
  }

  // Bóc tách tags bổ trợ: \tags{l1, l3} hoặc \tags{...}
  const tagsMacro = extractBalancedMacro(text, 'tags');
  if (tagsMacro) {
    explicitTags = tagsMacro.content.split(',').map(t => t.trim()).filter(Boolean);
    text = text.replace(tagsMacro.fullMatch, '').trim();
  }

  // 1. Tach phan Loi giai / Giai thich
  let explanationHtml = '';
  const balancedExp = extractBalancedMacro(text, 'explanation') || extractBalancedMacro(text, 'loigiai');
  if (balancedExp) {
    explanationHtml = balancedExp.content;
    text = text.replace(balancedExp.fullMatch, '').trim();
  } else {
    const solMatch = text.match(/(?:\\begin\{solution\}([\s\S]*?)\\end\{solution\}|(?:Lời giải|Giải thích|HD|Hướng dẫn|Solution|Explanation)\s*[:：]\s*([\s\S]*)$)/i);
    if (solMatch) {
      explanationHtml = (solMatch[1] || solMatch[2] || '').trim();
      text = text.substring(0, solMatch.index).trim();
    }
  }

  // 2. Tach Dap an dung tuong minh: \correct{A} hoac Dap an: A
  let explicitKey = null;
  const correctMacroMatch = text.match(/\\correct\{([A-D])\}/i);
  if (correctMacroMatch) {
    explicitKey = correctMacroMatch[1].toUpperCase();
    text = text.replace(correctMacroMatch[0], '').trim();
  } else {
    const keyMatch = text.match(/(?:Đáp án(?: đúng)?|Key|Answer)\s*[:：]\s*([A-D])/i);
    if (keyMatch) {
      explicitKey = keyMatch[1].toUpperCase();
      text = text.replace(keyMatch[0], '').trim();
    }
  }

  // 3. Boc tach 4 Phuong an A, B, C, D
  let optionA = '';
  let optionB = '';
  let optionC = '';
  let optionD = '';
  let detectedKey = explicitKey;
  let distractorMapping = {};

  // Kieu A: Overleaf macro rieng \choiceA{...} \choiceB{...} \choiceC{...} \choiceD{...} (co the co ngoac long nhau)
  const choiceAData = extractBalancedMacro(text, 'choiceA');
  const choiceBData = extractBalancedMacro(text, 'choiceB');
  const choiceCData = extractBalancedMacro(text, 'choiceC');
  const choiceDData = extractBalancedMacro(text, 'choiceD');

  if (choiceAData && choiceBData) {
    const rawOpts = [
      choiceAData.content,
      choiceBData.content,
      choiceCData ? choiceCData.content : '',
      choiceDData ? choiceDData.content : ''
    ];
    const letters = ['A', 'B', 'C', 'D'];
    rawOpts.forEach((raw, idx) => {
      let isCorrect = false;
      let clean = raw;
      if (clean.startsWith('*')) {
        isCorrect = true;
        clean = clean.substring(1).trim();
      }
      const { cleanText, distractorType } = extractDistractor(clean);
      if (isCorrect && !detectedKey) detectedKey = letters[idx];
      if (letters[idx] === 'A') optionA = cleanText;
      if (letters[idx] === 'B') optionB = cleanText;
      if (letters[idx] === 'C') optionC = cleanText;
      if (letters[idx] === 'D') optionD = cleanText;
      if (distractorType !== 'NONE') distractorMapping[letters[idx]] = distractorType;
    });

    // Remove choice macros from text
    text = text
      .replace(choiceAData.fullMatch, '')
      .replace(choiceBData.fullMatch, '')
      .replace(choiceCData ? choiceCData.fullMatch : '', '')
      .replace(choiceDData ? choiceDData.fullMatch : '', '')
      .trim();

  } else {
    // Kieu B: \choice {A} {B} {C} {D} cua LaTeX
    const choiceBlockMatch = text.match(/\\choice\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}/i);
    if (choiceBlockMatch) {
      const rawOpts = [
        choiceBlockMatch[1].trim(),
        choiceBlockMatch[2].trim(),
        choiceBlockMatch[3].trim(),
        choiceBlockMatch[4].trim()
      ];
      text = text.substring(0, choiceBlockMatch.index).trim();

      const letters = ['A', 'B', 'C', 'D'];
      rawOpts.forEach((raw, idx) => {
        let isCorrect = false;
        let clean = raw;
        if (clean.startsWith('*')) {
          isCorrect = true;
          clean = clean.substring(1).trim();
        }
        const { cleanText, distractorType } = extractDistractor(clean);
        if (isCorrect && !detectedKey) detectedKey = letters[idx];
        if (letters[idx] === 'A') optionA = cleanText;
        if (letters[idx] === 'B') optionB = cleanText;
        if (letters[idx] === 'C') optionC = cleanText;
        if (letters[idx] === 'D') optionD = cleanText;
        if (distractorType !== 'NONE') distractorMapping[letters[idx]] = distractorType;
      });
    } else {
      // Kieu C: Tim cac moc [A-D]. hoac [A-D]) hoac \item[A.] hoac A.
      const optRegex = /(?:^|\n)\s*(?:\\item\s*)?(\*?)\s*(?:\[|\()?([A-D])(?:\]|\)|\.|\:)\s*([\s\S]*?)(?=(?:\n\s*(?:\\item\s*)?\*?\s*(?:\[|\()?([A-D])(?:\]|\)|\.|\:))|$)/gi;
      const matches = Array.from(text.matchAll(optRegex));

      if (matches.length >= 2) {
        const firstOptIndex = matches[0].index;
        const stemPart = text.substring(0, firstOptIndex).trim();
        text = stemPart;

        matches.forEach(m => {
          const hasStar = m[1] === '*';
          const letter = m[2].toUpperCase();
          let content = m[3] ? m[3].trim() : '';
          
          if (content.startsWith('*')) {
            content = content.substring(1).trim();
          }

          const { cleanText, distractorType } = extractDistractor(content);

          if (hasStar && !detectedKey) {
            detectedKey = letter;
          }

          if (letter === 'A') optionA = cleanText;
          if (letter === 'B') optionB = cleanText;
          if (letter === 'C') optionC = cleanText;
          if (letter === 'D') optionD = cleanText;

          if (distractorType !== 'NONE') {
            distractorMapping[letter] = distractorType;
          }
        });
      }
    }
  }

  // 4. Lam sach De bai (Stem)
  let contentHtml = text;
  const contentMacroData = extractBalancedMacro(contentHtml, 'content');
  if (contentMacroData) {
    contentHtml = contentMacroData.content.trim();
  } else {
    contentHtml = contentHtml
      .replace(/^(?:Câu|Bài|Ex|Problem|Question)\s*\d+[:.]\s*/i, '')
      .replace(/\\begin\{enumerate\}/gi, '')
      .replace(/\\end\{enumerate\}/gi, '')
      .trim();
  }

  // 5. Tu dong nhan dien Nhan Nhan thuc (conceptual vs procedural)
  let cognitiveTag = 'procedural';
  if (/\[conceptual\]|\[lý thuyết\]|\[bản chất\]/i.test(rawText)) {
    cognitiveTag = 'conceptual';
    contentHtml = contentHtml.replace(/\[conceptual\]|\[lý thuyết\]|\[bản chất\]/i, '').trim();
  } else if (/\[procedural\]|\[thao tác\]|\[tính toán\]/i.test(rawText)) {
    cognitiveTag = 'procedural';
    contentHtml = contentHtml.replace(/\[procedural\]|\[thao tác\]|\[tính toán\]/i, '').trim();
  } else {
    if (/(khẳng định nào|mệnh đề nào|định nghĩa|tính chất|điều kiện cần và đủ|đúng hay sai)/i.test(contentHtml)) {
      cognitiveTag = 'conceptual';
    }
  }

  return {
    content_html: contentHtml,
    option_a: optionA,
    option_b: optionB,
    option_c: optionC,
    option_d: optionD,
    correct_answer: detectedKey || 'A',
    explanation_html: explanationHtml,
    distractor_mapping: distractorMapping,
    cognitive_tag: cognitiveTag,
    expected_time_seconds: cognitiveTag === 'conceptual' ? 45 : 75,
    topic_id: explicitTopic,
    lesson_id: explicitLesson,
    difficulty_level: explicitDifficulty,
    source_reference: explicitSource,
    tags: explicitTags
  };
}

/**
 * Boc tach hang loat cau hoi tu van ban lon
 */
export function parseBatchQuestions(batchText) {
  if (!batchText || typeof batchText !== 'string') return [];

  let chunks = [];

  if (/\\begin\{(?:question|ex|exercise)\}/i.test(batchText)) {
    // Tach theo khoi moi truong \begin{question}...\end{question}
    const envRegex = /\\begin\{(?:question|ex|exercise)\}[\s\S]*?\\end\{(?:question|ex|exercise)\}/gi;
    const matches = Array.from(batchText.matchAll(envRegex));
    if (matches.length > 0) {
      chunks = matches.map(m => m[0].trim());
    }
  }

  if (chunks.length === 0) {
    if (batchText.includes('---')) {
      chunks = batchText.split(/\n\s*---\s*\n/).map(c => c.trim()).filter(Boolean);
    } else if (/(?:^|\n)(?:Câu|Bài|Question)\s+\d+[:.]/i.test(batchText)) {
      chunks = batchText.split(/(?:^|\n)(?=(?:Câu|Bài|Question)\s+\d+[:.])/i).map(c => c.trim()).filter(Boolean);
    } else {
      chunks = [batchText.trim()];
    }
  }

  const results = [];
  chunks.forEach(c => {
    const q = parseSingleQuestion(c);
    if (q && q.content_html && (q.option_a || q.option_b)) {
      results.push(q);
    }
  });

  return results;
}

