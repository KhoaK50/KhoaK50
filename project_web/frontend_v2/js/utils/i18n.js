const i18nConfig = {
  defaultLocale: 'vi',
  currentLocale: localStorage.getItem('locale') || (navigator.language && navigator.language.startsWith('vi') ? 'vi' : 'en'),
  translations: {}
};

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

window.setLang = async function(lang) {
  if (lang === i18nConfig.currentLocale && i18nConfig.translations[lang]) {
    return;
  }
  
  i18nConfig.currentLocale = lang;
  localStorage.setItem('locale', lang);
  
  if (!i18nConfig.translations[lang]) {
    await loadTranslations(lang);
  }
  
  updateDOM();
};

// Initialize
async function initI18n() {
  await loadTranslations(i18nConfig.currentLocale);
  updateDOM();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initI18n);
} else {
  initI18n();
}





