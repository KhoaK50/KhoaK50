const i18nConfig = {
  defaultLocale: 'vi',
  currentLocale: localStorage.getItem('locale') || 'vi',
  translations: {}
};

async function loadTranslations(lang) {
  try {
    const response = await fetch(`locales/${lang}.json`);
    if (!response.ok) throw new Error(`Could not load ${lang}.json`);
    i18nConfig.translations[lang] = await response.json();
  } catch (error) {
    console.error('Error loading translations:', error);
  }
}

function updateDOM() {
  const elements = document.querySelectorAll('[data-i18n], [data-i18n-title]');
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
document.addEventListener('DOMContentLoaded', async () => {
  await loadTranslations(i18nConfig.currentLocale);
  updateDOM();
});
