(function () {
  window.App = window.App || {};

  // Gõ chữ từng ký tự (karaoke)
  App.typeText = function (el, fullText, speed = 25) {
    return new Promise((resolve) => {
      el.innerText = "";
      let i = 0;

      const timer = setInterval(() => {
        if (i >= fullText.length) {
          clearInterval(timer);
          resolve();
          return;
        }
        el.innerText += fullText[i];
        i++;
      }, speed);
    });
  };

  // Fade-out utility (mờ dần đến 0 rồi display:none)
  // dùng cho “ẩn có hiệu ứng” sau này
  App.fadeOut = function (el, ms = 220) {
    if (!el) return Promise.resolve();
    return new Promise((resolve) => {
      el.style.transition = `opacity ${ms}ms ease`;
      el.style.opacity = "1";
      // force reflow
      void el.offsetHeight;
      el.style.opacity = "0";
      const done = () => {
        el.removeEventListener("transitionend", done);
        el.style.display = "none";
        resolve();
      };
      el.addEventListener("transitionend", done);
      // fallback
      setTimeout(done, ms + 30);
    });
  };

  App.fadeIn = function (el, ms = 220, display = "block") {
    if (!el) return Promise.resolve();
    return new Promise((resolve) => {
      el.style.display = display;
      el.style.transition = `opacity ${ms}ms ease`;
      el.style.opacity = "0";
      void el.offsetHeight;
      el.style.opacity = "1";
      const done = () => {
        el.removeEventListener("transitionend", done);
        resolve();
      };
      el.addEventListener("transitionend", done);
      setTimeout(done, ms + 30);
    });
  };
})();
