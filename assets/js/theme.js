/* theme.js - Shared dark/light theme toggle for every page.
   Loaded (non-defer) in <head> so the theme applies before first paint. */
(function () {
  'use strict';

  var STORAGE_KEY = 'timeportal_theme';
  var root = document.documentElement;

  // Restore persisted preference (default: dark)
  var stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  var theme = stored === 'light' ? 'light' : 'dark';
  root.setAttribute('data-theme', theme);

  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function renderButtons() {
    var isLight = root.getAttribute('data-theme') === 'light';
    var buttons = document.querySelectorAll('.theme-toggle');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].innerHTML = isLight ? MOON : SUN;
      buttons[i].setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
    }
  }

  function setTheme(next) {
    theme = next;
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
    renderButtons();
  }

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!target || !target.closest) return;
    var btn = target.closest('.theme-toggle');
    if (!btn) return;
    setTheme(theme === 'light' ? 'dark' : 'light');
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderButtons);
  } else {
    renderButtons();
  }
})();