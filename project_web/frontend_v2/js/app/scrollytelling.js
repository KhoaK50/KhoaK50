/**
 * Simple IntersectionObserver for fade-up animations on the homepage features.
 */
document.addEventListener("DOMContentLoaded", function () {
  const fadeElements = document.querySelectorAll('[data-gsap="fade-up"]');
  
  // Set initial state
  fadeElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(40px)';
    el.style.transition = 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      } else {
        entry.target.style.opacity = '0';
        entry.target.style.transform = 'translateY(40px)';
      }
    });
  }, {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  });

  fadeElements.forEach(el => observer.observe(el));
});
