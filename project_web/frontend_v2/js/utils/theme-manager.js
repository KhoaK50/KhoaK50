/**
 * Theme Manager - Quản lý theme chung cho tất cả trang
 * Hỗ trợ View Transitions API cho hiệu ứng mượt mà hoàn hảo
 */

const ThemeManager = (() => {
  const STORAGE_KEY = "vec_theme";
  const DARK_CLASS = "dark";
  const DARK_THEME_CLASS = "dark-theme";

  function init() {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    const isDark = savedTheme === "dark";
    
    // Apply instantly on load (no transition) to avoid flash on load
    applyClasses(isDark);
    showBody();
    window.addEventListener("storage", onStorageChange);
    return isDark;
  }

  function applyClasses(isDark) {
    const html = document.documentElement;
    const body = document.body;
    
    if (isDark) {
      html.classList.add(DARK_CLASS, DARK_THEME_CLASS);
      html.setAttribute("data-theme", "dark");
      if (body) body.classList.add(DARK_CLASS, DARK_THEME_CLASS);
    } else {
      html.classList.remove(DARK_CLASS, DARK_THEME_CLASS);
      html.removeAttribute("data-theme");
      if (body) body.classList.remove(DARK_CLASS, DARK_THEME_CLASS);
    }
  }

  function applyTheme(isDark) {
    // Nếu trình duyệt hỗ trợ View Transitions API -> Dùng hiệu ứng mượt
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        applyClasses(isDark);
      });
    } else {
      // Fallback: Chuyển tức thì (Instant Snap) cho trình duyệt cũ
      applyClasses(isDark);
    }
  }

  function showBody() {
    if (document.body) {
      document.body.style.opacity = "1";
    }
  }

  function onStorageChange(e) {
    if (e.key === STORAGE_KEY) {
      const isDark = e.newValue === "dark";
      applyTheme(isDark);
    }
  }

  function toggle() {
    const isDark = getCurrent() === "dark";
    const newTheme = isDark ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme === "dark");
    return newTheme === "dark";
  }

  function getCurrent() {
    return localStorage.getItem(STORAGE_KEY) || "light";
  }

  function isDarkMode() {
    return getCurrent() === "dark";
  }

  function setTheme(theme) {
    if (theme !== "light" && theme !== "dark") return;
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme === "dark");
  }

  return {
    init, toggle, getCurrent, isDarkMode, setTheme, applyTheme, STORAGE_KEY, DARK_CLASS, DARK_THEME_CLASS
  };
})();

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (ThemeManager.init) ThemeManager.init();
    });
  } else {
    ThemeManager.init();
  }
}
