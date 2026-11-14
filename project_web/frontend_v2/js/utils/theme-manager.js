/**
 * Theme Manager - Quản lý theme chung cho tất cả trang
 * Hỗ trợ View Transitions API cho hiệu ứng mượt mà hoàn hảo
 */

const ThemeManager = (() => {
  const STORAGE_KEY = "vec_theme";
  const DARK_CLASS = "dark";
  const DARK_THEME_CLASS = "dark-theme";

  function resolveIsDark() {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("theme");
      if (savedTheme === "dark") return true;
      if (savedTheme === "light") return false;
      return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    } catch (e) {
      return false;
    }
  }

  function init() {
    const isDark = resolveIsDark();
    
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
      html.style.backgroundColor = "#111113";
      if (body) {
        body.classList.remove("light-theme");
        body.classList.add(DARK_CLASS, DARK_THEME_CLASS);
      }
    } else {
      html.classList.remove(DARK_CLASS, DARK_THEME_CLASS);
      html.removeAttribute("data-theme");
      html.style.backgroundColor = "#fcfcfd";
      if (body) {
        body.classList.remove(DARK_CLASS, DARK_THEME_CLASS, "dark-mode");
        body.classList.add("light-theme");
      }
    }
  }

  function notifyApp(isDark) {
    if (typeof window !== "undefined" && window.App) {
      window.App.theme = isDark ? "dark" : "light";
      if (typeof window.App.applyTheme === "function") {
        window.App.applyTheme();
      }
    }
  }

  function applyTheme(isDark) {
    // Nếu trình duyệt hỗ trợ View Transitions API -> Dùng hiệu ứng mượt
    if (document.startViewTransition) {
      try {
        const transition = document.startViewTransition(() => {
          applyClasses(isDark);
          notifyApp(isDark);
        });
        if (transition) {
          if (transition.ready && typeof transition.ready.catch === "function") {
            transition.ready.catch(() => {});
          }
          if (transition.finished && typeof transition.finished.catch === "function") {
            transition.finished.catch(() => {});
          }
        }
      } catch (err) {
        applyClasses(isDark);
        notifyApp(isDark);
      }
    } else {
      // Fallback: Chuyển tức thì (Instant Snap) cho trình duyệt cũ
      applyClasses(isDark);
      notifyApp(isDark);
    }
  }

  function showBody() {
    if (document.body) {
      document.body.style.opacity = "1";
    }
  }

  function onStorageChange(e) {
    if (e.key === STORAGE_KEY || e.key === "theme") {
      const isDark = e.newValue === "dark";
      applyTheme(isDark);
    }
  }

  function toggle() {
    const isDark = isDarkMode();
    const newTheme = isDark ? "light" : "dark";
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
      localStorage.setItem("theme", newTheme);
    } catch (e) {}
    applyTheme(newTheme === "dark");
    return newTheme === "dark";
  }

  function getCurrent() {
    return resolveIsDark() ? "dark" : "light";
  }

  function isDarkMode() {
    return resolveIsDark();
  }

  function setTheme(theme) {
    if (theme !== "light" && theme !== "dark") return;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
      localStorage.setItem("theme", theme);
    } catch (e) {}
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
      initMobileNav();
    });
  } else {
    ThemeManager.init();
    initMobileNav();
  }
}

function initMobileNav() {
  const sidebarToggleBtn = document.getElementById('globalMobileToggleBtn');
  const navLinks = document.querySelector('.vec-nav-links');
  
  if (!sidebarToggleBtn || !navLinks) return;

  function closeMenu() {
    navLinks.classList.remove('show-mobile');
    const openDropdowns = navLinks.querySelectorAll('.vec-dropdown-container.open');
    openDropdowns.forEach(d => d.classList.remove('open'));
  }

  // Prevent multiple listeners if initMobileNav is called multiple times somehow
  if (sidebarToggleBtn.dataset.navInitialized) return;
  sidebarToggleBtn.dataset.navInitialized = "true";

  sidebarToggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (navLinks.classList.contains('show-mobile')) {
      closeMenu();
    } else {
      navLinks.classList.add('show-mobile');
    }
  });

  // Universal mobile submenu toggle ("Khám phá") across all pages
  const navDropdowns = navLinks.querySelectorAll('.vec-dropdown-container');
  navDropdowns.forEach((container) => {
    if (container.dataset.mobileDropdownBound) return;
    container.dataset.mobileDropdownBound = "true";
    const trigger = container.querySelector(':scope > .vec-nav-link');
    if (!trigger) return;
    trigger.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        e.stopPropagation();
        container.classList.toggle('open');
      }
    });
  });

  // Touch-friendly language dropdown toggle in right topbar
  const rightDropdowns = document.querySelectorAll('.vec-topbar-right .vec-dropdown-container');
  rightDropdowns.forEach((container) => {
    if (container.id === 'notificationDropdownContainer') return;
    if (container.querySelector('#btnTopAvatar')) return;
    if (container.dataset.rightDropdownBound) return;
    container.dataset.rightDropdownBound = "true";
    const btn = container.querySelector(':scope > .vec-icon-btn');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      container.classList.toggle('open');
    });
  });
  
  document.addEventListener('click', (e) => {
    if (navLinks.classList.contains('show-mobile')) {
      if (!navLinks.contains(e.target) && !sidebarToggleBtn.contains(e.target)) {
        closeMenu();
      }
    }
    document.querySelectorAll('.vec-topbar-right .vec-dropdown-container.open').forEach((d) => {
      if (!d.contains(e.target)) d.classList.remove('open');
    });
  }, true);
}
