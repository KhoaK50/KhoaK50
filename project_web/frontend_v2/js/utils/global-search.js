// Vectoria Global Search - Academic Knowledge Index
(function () {
  'use strict';

  var isOpen = false;
  var searchTimeout = null;
  var fuseVi = null;
  var fuseEn = null;
  var cachedData = null;
  var isDataLoading = false;
  var activeIndex = -1;

  function _tr(key, fallback) {
    return typeof window.tr === 'function' ? window.tr(key, fallback) : fallback;
  }

  function getApiBase() {
    return window.App ? window.App.API_BASE : 'http://127.0.0.1:5000';
  }

  function getCurrentLang() {
    return (window.i18nConfig && window.i18nConfig.currentLocale) || 'vi';
  }

  function getLibraryTerm(id) {
    try {
      var lang = getCurrentLang();
      var t = window.i18nConfig && window.i18nConfig.translations;
      var terms = t && t[lang] && t[lang].library_terms;
      return terms && terms[id] ? terms[id] : null;
    } catch (e) { return null; }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── LaTeX Cleaning ──
  function cleanLatex(text) {
    if (!text) return '';
    var s = text;
    if (s.indexOf('\\begin{document}') !== -1) {
      var parts = s.split('\\begin{document}');
      s = parts[1] ? parts[1].split('\\end{document}')[0] : s;
    }
    s = s.replace(/\\\([\s\S]*?\\\)/g, ' ');
    s = s.replace(/\\\[[\s\S]*?\\\]/g, ' ');
    s = s.replace(/\$[^$]*\$/g, ' ');
    s = s.replace(/\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g, ' ');
    s = s.replace(/\\(?:textbf|textit|emph|underline|text|mathrm|mathbf|math|bf|it)\{([^}]+)\}/g, '$1');
    s = s.replace(/\\textcolor\{[^}]+\}\{([^}]+)\}/g, '$1');
    s = s.replace(/\\section\*?\{([^}]+)\}/g, '$1');
    s = s.replace(/\\[a-zA-Z]+\*?(\{[^}]*\})*/g, ' ');
    s = s.replace(/[{}_^&#%~]/g, ' ');
    return s.replace(/\s+/g, ' ').trim();
  }

  // ── Highlight (indexOf, safe for Vietnamese) ──
  function highlightText(text, query) {
    if (!text || !query) return escapeHtml(text || '');
    var terms = query.toLowerCase().split(/\s+/).filter(function(t) { return t.length >= 2; });
    if (terms.length === 0) return escapeHtml(text);

    var lowerText = text.toLowerCase();
    var highlights = [];

    terms.forEach(function(term) {
      var pos = 0;
      while (pos < lowerText.length) {
        var idx = lowerText.indexOf(term, pos);
        if (idx === -1) break;
        highlights.push({ s: idx, e: idx + term.length });
        pos = idx + 1;
      }
    });

    if (highlights.length === 0) return escapeHtml(text);

    highlights.sort(function(a, b) { return a.s - b.s; });
    var merged = [{ s: highlights[0].s, e: highlights[0].e }];
    for (var i = 1; i < highlights.length; i++) {
      var last = merged[merged.length - 1];
      if (highlights[i].s <= last.e) {
        last.e = Math.max(last.e, highlights[i].e);
      } else {
        merged.push({ s: highlights[i].s, e: highlights[i].e });
      }
    }

    var result = '';
    var cursor = 0;
    merged.forEach(function(r) {
      if (r.s > cursor) result += escapeHtml(text.substring(cursor, r.s));
      result += '<span class="search-hl">' + escapeHtml(text.substring(r.s, r.e)) + '</span>';
      cursor = r.e;
    });
    if (cursor < text.length) result += escapeHtml(text.substring(cursor));
    return result;
  }

  // ── Snippet ──
  function extractSnippet(text, query) {
    if (!text) return '';
    var terms = query.toLowerCase().split(/\s+/).filter(function(t) { return t.length >= 2; });
    var lower = text.toLowerCase();
    var firstIdx = -1;

    for (var i = 0; i < terms.length; i++) {
      var idx = lower.indexOf(terms[i]);
      if (idx !== -1) { firstIdx = idx; break; }
    }

    var snippet;
    if (firstIdx !== -1) {
      var start = Math.max(0, firstIdx - 40);
      var end = Math.min(text.length, firstIdx + 80);
      snippet = text.substring(start, end);
      if (start > 0) snippet = '\u2026' + snippet;
      if (end < text.length) snippet = snippet + '\u2026';
    } else {
      snippet = text.substring(0, 100);
      if (text.length > 100) snippet += '\u2026';
    }
    return highlightText(snippet, query);
  }

  
  // ── Sync Topbar & Session ──
  function syncInput(val) {
    var modalInp = document.getElementById('vec-search-input');
    if (modalInp && modalInp.value !== val) modalInp.value = val;
    
    var triggers = document.querySelectorAll('input[type="search"], [data-i18n-placeholder="nav.search_global"], .topbar-search');
    triggers.forEach(function(el) {
      if (el.tagName === 'INPUT' && el.id !== 'vec-search-input' && el.value !== val) el.value = val;
    });
    sessionStorage.setItem('vec_last_search', val);
  }

  // ── Data Loading ──
  async function loadData() {
    if (cachedData) return true;
    try {
      var base = getApiBase();

      var responses = await Promise.all([
        fetch(base + '/api/course/all?lang=vi').then(function(r) { return r.json(); }),
        fetch(base + '/api/course/all?lang=en').then(function(r) { return r.json(); })
      ]);

      var resVi = responses[0], resEn = responses[1];
      if (!resVi.success || !resEn.success) return false;

      var mapVi = new Map();
      var mapEn = new Map();

      function processItems(items, lang, outMap) {
        items.forEach(function(item) {
          var key = item.topic_id + '_' + item.lesson_num;
          
          var tTitle = item.topic_title || '';
          if (lang === 'en') tTitle = getLibraryTerm(item.topic_id) || tTitle;
          
          var sTitle = item.section_title || '';
          if (lang === 'en') sTitle = getLibraryTerm(item.section_id) || sTitle;
          sTitle = sTitle.replace(/^\d+\.\s*/, '');
          
          var lTitle = item.lesson_title || '';
          if (lang === 'en') lTitle = getLibraryTerm('l' + item.lesson_num) || lTitle;
          
          var cText = item.content_text || '';
          var clean = cleanLatex(cText);
          
          var searchable = clean;
          
          outMap.set(key, {
            topic_id: item.topic_id,
            section_id: item.section_id || 'none',
            lesson_num: item.lesson_num,
            topic_title: tTitle,
            section_title: sTitle,
            lesson_title: lTitle,
            content_text: clean,
            searchable: searchable
          });
        });
      }

      processItems(resVi.results, 'vi', mapVi);
      processItems(resEn.results, 'en', mapEn);
      
      var arrVi = Array.from(mapVi.values());
      var arrEn = Array.from(mapEn.values());

      fuseVi = new Fuse(arrVi, { includeScore: true, ignoreLocation: true, ignoreFieldNorm: true, threshold: 0.6, minMatchCharLength: 2, keys: ['searchable'] });
      fuseEn = new Fuse(arrEn, { includeScore: true, ignoreLocation: true, ignoreFieldNorm: true, threshold: 0.6, minMatchCharLength: 2, keys: ['searchable'] });
      
      cachedData = { vi: arrVi, en: arrEn };
      return true;
    } catch (e) {
      console.error('[Vectoria Search] Load failed:', e);
      return false;
    }
  }

  // ── Recent Lessons (sessionStorage) ──
  function getRecentLessons() {
    try { var r = sessionStorage.getItem('vec_recent_lessons'); return r ? JSON.parse(r) : []; }
    catch (e) { return []; }
  }

  function addRecentLesson(lessonNum, lessonTitle, topicTitle, sectionTitle) {
    try {
      var recent = getRecentLessons().filter(function(r) { return r.lesson_num !== lessonNum; });
      recent.unshift({ lesson_num: lessonNum, lesson_title: lessonTitle,
        topic_title: topicTitle, section_title: sectionTitle || '', timestamp: Date.now() });
      if (recent.length > 5) recent = recent.slice(0, 5);
      sessionStorage.setItem('vec_recent_lessons', JSON.stringify(recent));
    } catch (e) {}
  }
  window.vecAddRecentLesson = addRecentLesson;

  // ── Bookmarks (API) ──
  async function getBookmarks() {
    try {
      var token = (window.AuthGuard && window.AuthGuard.getToken)
        ? window.AuthGuard.getToken() : localStorage.getItem('user_token');
      if (!token) return [];
      var res = await fetch(getApiBase() + '/api/bookmarks',
        { headers: { 'Authorization': 'Bearer ' + token } });
      var data = await res.json();
      return (data.success && data.bookmarks) ? data.bookmarks.slice(0, 5) : [];
    } catch (e) { return []; }
  }

  // ── Modal Injection ──
  function injectModal() {
    if (document.getElementById('vec-search-modal')) return;

    var overlay = document.createElement('div');
    overlay.id = 'vec-search-modal';
    overlay.className = 'search-modal-overlay';
    overlay.style.display = 'none';

    var container = document.createElement('div');
    container.className = 'search-modal-container';

    var header = document.createElement('div');
    header.className = 'search-modal-header';

    var icon = document.createElement('i');
    icon.className = 'ph ph-magnifying-glass search-icon';

    var input = document.createElement('input');
    input.type = 'text';
    input.id = 'vec-search-input';
    input.setAttribute('data-i18n-placeholder', 'knowledge.search_placeholder');
    input.placeholder = _tr('knowledge.search_placeholder', 'T\u00ecm ki\u1ebfm b\u00e0i h\u1ecdc, ch\u1ee7 \u0111\u1ec1, t\u1eeb kh\u00f3a...');
    input.autocomplete = 'off';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'search-close-btn';
    closeBtn.innerHTML = '<i class="ph ph-x"></i>';
    closeBtn.addEventListener('click', closeModal);

    header.appendChild(icon);
    header.appendChild(input);
    header.appendChild(closeBtn);

    var body = document.createElement('div');
    body.className = 'search-modal-body';
    body.id = 'vec-search-body';

    container.appendChild(header);
    container.appendChild(body);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });

    input.addEventListener('input', function() {
      var rawQ = input.value; syncInput(rawQ); var q = rawQ.trim();
      clearTimeout(searchTimeout);
      activeIndex = -1;
      if (q.length === 0) { renderEmptyState(); return; }
      if (q.length < 2) {
        document.getElementById('vec-search-body').innerHTML =
          '<div class="search-status">' + _tr('knowledge.search_min', 'Nh\u1eadp \u00edt nh\u1ea5t 2 k\u00fd t\u1ef1 \u0111\u1ec3 t\u00ecm ki\u1ebfm...') + '</div>';
        return;
      }
      searchTimeout = setTimeout(function() { performSearch(q); }, 250);
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { closeModal(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        navigateResults(e.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      if (e.key === 'Enter') {
        var items = document.getElementById('vec-search-body').querySelectorAll('.search-result-item');
        if (activeIndex >= 0 && activeIndex < items.length) { e.preventDefault(); items[activeIndex].click(); }
      }
    });

    window.addEventListener('languageChanged', function() {
      cachedData = null; fuseVi = null; fuseEn = null;
      input.value = '';
      input.placeholder = _tr('knowledge.search_placeholder', 'T\u00ecm ki\u1ebfm b\u00e0i h\u1ecdc, ch\u1ee7 \u0111\u1ec1, t\u1eeb kh\u00f3a...');
      if(isOpen) {
         renderEmptyState();
      }
    });
  }

  function navigateResults(dir) {
    var body = document.getElementById('vec-search-body');
    if (!body) return;
    var items = body.querySelectorAll('.search-result-item');
    if (items.length === 0) return;
    if (activeIndex >= 0 && activeIndex < items.length) items[activeIndex].classList.remove('active');
    activeIndex += dir;
    if (activeIndex < 0) activeIndex = items.length - 1;
    if (activeIndex >= items.length) activeIndex = 0;
    items[activeIndex].classList.add('active');
    items[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  // ── Open / Close ──
  async function openModal(triggerEl) {
    if (isOpen) return;
    isOpen = true; activeIndex = -1;

    var overlay = document.getElementById('vec-search-modal');
    var input = document.getElementById('vec-search-input');
    if (!overlay) return;

    overlay.style.display = 'flex';
    requestAnimationFrame(function() {
      overlay.classList.add('open');
      if (input) input.focus();
    });

    var body = document.getElementById('vec-search-body');
    if (!cachedData) {
      body.innerHTML = '<div class="search-status"><i class="ph ph-spinner ph-spin"></i> ' +
        _tr('knowledge.search_loading', 'Đang tải dữ liệu học thuật...') + '</div>';
      var ok = await loadData();
      if (ok) {
        if (triggerEl && triggerEl.tagName === 'INPUT') {
            syncInput(triggerEl.value);
            if (triggerEl.value.trim().length >= 2) performSearch(triggerEl.value.trim());
            else renderEmptyState();
        } else {
            var saved = sessionStorage.getItem('vec_last_search');
            if (saved) {
                if (input) input.value = saved;
                performSearch(saved);
            } else {
                renderEmptyState();
            }
        }
      } else {
        body.innerHTML = '<div class="search-status error">' +
          _tr('knowledge.search_error', 'Lỗi kết nối Backend. Vui lòng kiểm tra Server.') + '</div>';
      }
    } else {
        if (triggerEl && triggerEl.tagName === 'INPUT') {
            syncInput(triggerEl.value);
            if (triggerEl.value.trim().length >= 2) performSearch(triggerEl.value.trim());
            else renderEmptyState();
        } else {
            var saved = sessionStorage.getItem('vec_last_search');
            if (saved) {
                if (input) input.value = saved;
                performSearch(saved);
            } else {
                if (input && input.value.trim().length >= 2) performSearch(input.value.trim());
                else renderEmptyState();
            }
        }
    }
  }

  function closeModal() {
    isOpen = false; activeIndex = -1;
    var overlay = document.getElementById('vec-search-modal');
    if (!overlay) return;
    overlay.classList.remove('open');
    setTimeout(function() { overlay.style.display = 'none'; }, 200);
  }
  window.vecCloseModal = closeModal;
  
  window.vecNavigateToLesson = function(lid, query, matchIdx) {
      window.vecCloseModal();
      sessionStorage.setItem('vecHighlightTask', JSON.stringify({query: query, match: matchIdx}));
      if (typeof window.navigateTo === 'function') {
          var ldata = null;
          if (typeof MOCK_LIBRARY_DATA !== 'undefined') {
              for (var t of MOCK_LIBRARY_DATA.topics) {
                  for (var s of t.sections) {
                      for (var l of s.lessons) { if (l.id === lid) { ldata = l; break; } }
                      if (ldata) break;
                  }
                  if (ldata) break;
              }
          }
          window.navigateTo('lesson', lid, 'Bài học', ldata);
      } else {
          window.location.href = 'knowledge_info.html?type=lesson&id=' + lid;
      }
  };

  // ── Empty State ──
  async function renderEmptyState() {
    var body = document.getElementById('vec-search-body');
    if (!body) return;
    
    var input = document.getElementById('vec-search-input');
    if (input && input.value.trim().length >= 2) return;

    var recent = getRecentLessons();
    var html = '';
    
    if (recent && recent.length > 0) {
      html += '<div class="search-section-label">' + _tr('knowledge.search_recent', 'Tìm kiếm gần đây') + '</div>';
      html += '<div class="saved-lesson-group">';
        recent.forEach(function(r) {
        html += '<a href="knowledge_info.html?type=lesson&id=' + r.lesson_id + '" class="search-result-item saved-lesson-item" onclick="window.vecCloseModal()">';
        html += '<div class="result-title">' + escapeHtml(r.title) + '</div>';
        html += '</a>';
      });
      html += '</div>';
    }

    var bookmarks = await getBookmarks();
    if (input && input.value.trim().length >= 2) return;

    if (bookmarks.length > 0) {
      html += '<div class="search-section-label">' + _tr('knowledge.search_saved', 'Bài học đã lưu') + '</div>';
      html += '<div class="lesson-group">';
      bookmarks.forEach(function(b) {
        html += '<a href="knowledge_info.html?type=lesson&id=' + b.lesson_id + '" class="search-result-item saved-lesson-item" onclick="window.vecCloseModal()">';
        html += '<div class="result-title">' + escapeHtml(b.title) + '</div>';
        html += '</a>';
      });
      html += '</div>';
    }

    if (!html) {
      html = '<div class="search-status">' + _tr('knowledge.search_placeholder', 'Tìm kiếm bài học, chủ đề...') + '</div>';
    }
    
    body.innerHTML = html;
  }

  function extractMultipleSnippets(text, query) {
    if (!text || !query) return [];
    var terms = query.toLowerCase().split(/\s+/).filter(function(t) { return t.length >= 2; });
    if (terms.length === 0) return [];
    
    var t = text.toLowerCase();
    var occurrences = [];
    
    terms.forEach(function(term) {
      var searchIdx = 0;
      while ((searchIdx = t.indexOf(term, searchIdx)) !== -1) {
        occurrences.push(searchIdx);
        searchIdx += term.length;
      }
    });
    
    occurrences.sort(function(a, b) { return a - b; });
    if (occurrences.length === 0) return [];
    
    var snippets = [];
    var MAX_SNIPPETS = 50;
    for (var i = 0; i < Math.min(occurrences.length, MAX_SNIPPETS); i++) {
      var idx = occurrences[i];
      var start = Math.max(0, idx - 40);
      var end = Math.min(text.length, idx + 80);
      var snippet = text.substring(start, end);
      
      if (start > 0) snippet = '...' + snippet;
      if (end < text.length) snippet = snippet + '...';
      
      snippets.push(highlightText(snippet, query));
    }
    
    return snippets;
  }

  function performSearch(query) {
    var body = document.getElementById('vec-search-body');
    if (!body) return;
    activeIndex = -1;

    var lang = getCurrentLang();
    var fuse = lang === 'en' ? fuseEn : fuseVi;
    var data = lang === 'en' ? cachedData.en : cachedData.vi;

    if (!fuse || !data) {
      body.innerHTML = '<div class="search-status error">' + _tr('knowledge.search_error', 'Lỗi tải dữ liệu. Vui lòng tải lại trang.') + '</div>';
      return;
    }

    var results = fuse.search(query);
    if (results.length === 0) {
      body.innerHTML = '<div class="search-status">' + _tr('knowledge.search_no_results', 'Không tìm thấy kết quả nào cho') + ' “<b>' + escapeHtml(query) + '</b>”.</div>';
      return;
    }

    var set = new Map();
    results.forEach(function(r) {
      if (r.score <= 0.6) {
        var k = r.item.topic_id + '_' + r.item.lesson_num;
        if (!set.has(k)) set.set(k, r);
      }
    });

    var ordered = [];
    data.forEach(function(item) {
      var k = item.topic_id + '_' + item.lesson_num;
      if (set.has(k)) ordered.push(set.get(k));
    });

    var groups = {};
    ordered.forEach(function(r) {
      var item = r.item;
      if (!groups[item.topic_id]) {
        groups[item.topic_id] = { title: item.topic_title, sections: {} };
      }
      var secId = item.section_id || 'none';
      if (!groups[item.topic_id].sections[secId]) {
        groups[item.topic_id].sections[secId] = { title: item.section_title, lessons: [] };
      }
      groups[item.topic_id].sections[secId].lessons.push(item);
    });

    var html = '';
    var cIndex = 0;
    
        for (var tId in groups) {
      var topic = groups[tId];
      var topicHtml = '';
      var hasValidSections = false;
      
      for (var sId in topic.sections) {
        var section = topic.sections[sId];
        var sectionHtml = '';
        var hasValidLessons = false;
        
                section.lessons.forEach(function(item) {
          var lTitle = item.lesson_title || '';
          if (!lTitle && lang === 'en') lTitle = 'Lesson ' + item.lesson_num;
          if (!lTitle && lang === 'vi') lTitle = 'Bài ' + item.lesson_num;
          
          var lUrlBase = 'knowledge_info.html?type=lesson&id=l' + item.lesson_num + '&hl=' + encodeURIComponent(query);
          
          var snippetsArr = extractMultipleSnippets(item.content_text || '', query);
          if (!snippetsArr || snippetsArr.length === 0) return; // FIX: check array length
          
          hasValidLessons = true;
          sectionHtml += '<div class="search-result-item" data-index="' + cIndex + '">';
          sectionHtml += '<a href="' + lUrlBase.replace(/'/g, "\'") + '" class="result-title" onclick="window.vecCloseModal()">' + escapeHtml(lTitle) + '</a>';
          
          // Render max 2 snippets initially
          var renderCount = Math.min(snippetsArr.length, 2);
          for (var i = 0; i < renderCount; i++) {
             var onClickCode = "window.vecNavigateToLesson('l" + item.lesson_num + "', '" + query.replace(/'/g, "\\'") + "', " + i + "); return false;";
             sectionHtml += '<a href="knowledge_info.html?type=lesson&id=l' + item.lesson_num + '" class="snippet-row" onclick="' + onClickCode + '">' + snippetsArr[i] + '</a>';
          }
          
          // If there are more snippets, add a hidden container and a 'Show more' button
          if (snippetsArr.length > 2) {
             sectionHtml += '<div class="hidden-snippets" id="hidden-snippets-' + cIndex + '">';
             for (var i = 2; i < snippetsArr.length; i++) {
                var onClickCode = "window.vecNavigateToLesson('l" + item.lesson_num + "', '" + query.replace(/'/g, "\\'") + "', " + i + "); return false;";
                sectionHtml += '<a href="knowledge_info.html?type=lesson&id=l' + item.lesson_num + '" class="snippet-row" onclick="' + onClickCode + '">' + snippetsArr[i] + '</a>';
             }
             sectionHtml += '</div>';
             sectionHtml += '<span class="more-snippets-btn" onclick="document.getElementById(\'hidden-snippets-' + cIndex + '\').classList.toggle(\'expanded\'); if(this.innerText.startsWith(\'+\')) { this.dataset.orig = this.innerText; this.innerText = \'Thu gọn\'; } else { this.innerText = this.dataset.orig; }">+' + (snippetsArr.length - 2) + ' kết quả khác</span>';
          }
          
          sectionHtml += '</div>';
          cIndex++;
        });
        
        if (hasValidLessons) {
          hasValidSections = true;
          topicHtml += '<div class="lesson-group">';
          if (sId !== 'none' && section.title) {
            var sUrl = 'knowledge_info.html?type=section&id=' + sId;
            topicHtml += '<a href="' + sUrl.replace(/'/g, "\'") + '" class="lesson-name" onclick="window.vecCloseModal()">' + escapeHtml(section.title) + '</a>';
          }
          topicHtml += sectionHtml;
          topicHtml += '</div>';
        }
      }
      
      if (hasValidSections) {
        html += '<div class="index-chapter">';
        var tUrl = 'knowledge_info.html?type=topic&id=' + tId;
        if (topic.title) {
          html += '<a href="' + tUrl.replace(/'/g, "\'") + '" class="chapter-title" onclick="window.vecCloseModal()">' + escapeHtml(topic.title) + '</a>';
        }
        html += topicHtml;
        html += '</div>';
      }
    }
    body.innerHTML = html;
  }



  function init() {
    var lastSearch = sessionStorage.getItem('vec_last_search') || '';
    if (typeof Fuse === 'undefined') {
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/fuse.js@6.6.2';
      script.onload = function() { injectModal(); if (lastSearch) syncInput(lastSearch); };
      document.head.appendChild(script);
    } else {
      injectModal();
      if (lastSearch) syncInput(lastSearch);
    }

    setTimeout(function() {
      var triggers = Array.from(document.querySelectorAll(
        'input[type="search"],' +
        '[data-i18n-placeholder="nav.search_global"],' +
        '.topbar-search,.search-btn'
      )).filter(function(el) { return el.id !== 'vec-search-input'; });

      triggers.forEach(function(el) {
        var handler = function(e) {
          e.preventDefault(); e.stopPropagation();
          if (el.tagName === 'INPUT') el.blur();
          openModal(el);
        };
        el.addEventListener('click', handler);
        if (el.tagName === 'INPUT') el.addEventListener('focus', handler);
      });
    }, 500);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isOpen) closeModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();


// ── Accordion ──
window.vecToggleSnippets = function(idx, btn, moreTxt, lessTxt) {
  var el = document.getElementById('hidden-snip-' + idx);
  if (!el) return;
  if (el.classList.contains('expanded')) {
    el.classList.remove('expanded');
    btn.innerText = moreTxt;
  } else {
    el.classList.add('expanded');
    btn.innerText = lessTxt;
  }
};
