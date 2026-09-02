let savedLocale = null;
if (localStorage.getItem('user_token')) {
    savedLocale = localStorage.getItem('locale');
} else {
    savedLocale = sessionStorage.getItem('guest_locale');
}
const defaultBrowser = navigator.language && navigator.language.startsWith('vi') ? 'vi' : 'en';

const i18nConfig = {
  defaultLocale: 'vi',
  currentLocale: savedLocale || defaultBrowser,
  translations: {}
};
window.i18nConfig = i18nConfig;

let _loadPromise = null;
async function loadTranslations(lang) {
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
  try {
    const response = await fetch(`locales/${lang}.json?v=` + new Date().getTime());
    if (!response.ok) throw new Error(`Could not load ${lang}.json`);
    i18nConfig.translations[lang] = await response.json();
  } catch (error) {
    console.error('Error loading translations:', error);
  }
  _loadPromise = null;
  })();
  return _loadPromise;
}

function updateDOM() {
  const elements = document.querySelectorAll('[data-i18n], [data-i18n-title], [data-i18n-placeholder]');
  const t = i18nConfig.translations[i18nConfig.currentLocale];
  if (!t) return;

  const getValue = (key) => {
    const keys = key.split('.');
    let value = t;
    for (const k of keys) {
      if (value[k] === undefined) return null;
      value = value[k];
    }
    return value;
  };

  elements.forEach(el => {
    if (el.hasAttribute('data-i18n')) {
      const val = getValue(el.getAttribute('data-i18n'));
      if (val) el.innerHTML = val;
    }
    if (el.hasAttribute('data-i18n-title')) {
      const val = getValue(el.getAttribute('data-i18n-title'));
      if (val) el.setAttribute('title', val);
    }
    if (el.hasAttribute('data-i18n-placeholder')) {
      const val = getValue(el.getAttribute('data-i18n-placeholder'));
      if (val) el.setAttribute('placeholder', val);
    }
  });
  
  document.documentElement.lang = i18nConfig.currentLocale;
}

window.updateDOM = updateDOM;

window.tr = function(key, fallback = "") {
  const t = i18nConfig.translations[i18nConfig.currentLocale];
  if (!t) return fallback;
  const keys = key.split('.');
  let value = t;
  for (const k of keys) {
    if (value && value[k] !== undefined) {
      value = value[k];
    } else {
      return fallback;
    }
  }
  return value;
};

window.setLang = async function(lang) {
  if (lang === i18nConfig.currentLocale && i18nConfig.translations[lang]) {
    return;
  }
  
  i18nConfig.currentLocale = lang;
  if (localStorage.getItem('user_token')) {
      localStorage.setItem('locale', lang);
  } else {
      sessionStorage.setItem('guest_locale', lang);
  }
  
  if (!i18nConfig.translations[lang]) {
    await loadTranslations(lang);
  }
  
  updateDOM();
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: i18nConfig.currentLocale }));

  // Sync to backend if logged in (with Anti-Spam Debounce)
  const token = (window.AuthGuard && window.AuthGuard.getToken) ? window.AuthGuard.getToken() : localStorage.getItem("user_token");
  if (token) {
    if (window.langSyncTimeout) clearTimeout(window.langSyncTimeout);
    window.langSyncTimeout = setTimeout(() => {
      const API_BASE = (window.App && window.App.API_BASE) ? window.App.API_BASE : "http://127.0.0.1:5000";
      try {
        fetch(`${API_BASE}/api/user/language`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ language: lang })
        }).catch(e => console.error("Language sync error:", e));
      } catch(e) {}
    }, 1500); // Wait 1.5s after the last click before saving to DB
  }
};

// Initialize
async function initI18n() {
  await loadTranslations(i18nConfig.currentLocale);
  updateDOM();
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: i18nConfig.currentLocale }));
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initI18n);
} else {
  initI18n();
}





