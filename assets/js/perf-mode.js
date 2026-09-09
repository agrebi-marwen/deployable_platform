/* perf-mode.js - Performance mode: disables the heavy galaxy background,
   cursor spotlight/ring, card lighting, and resource-intensive animations.
   Loaded (non-defer) in <head> so the mode applies before first paint.
   Other effects scripts (galaxy-bg.js, cursor-lighting.js) check
   window.__PERF_MODE and bail early when it is enabled. */
(function () {
  'use strict';

  var STORAGE_KEY = 'timeportal_perf';
  window.__PERF_MODE = false;

  var root = document.documentElement;

  function applyMode(on) {
    window.__PERF_MODE = !!on;
    root.classList.toggle('perf-mode', !!on);
    var btn = document.querySelector('[data-perf-toggle]');
    if (btn) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.title = on ? 'Performance mode ON - click to disable' : 'Performance mode OFF - click to enable';
      btn.textContent = on ? '⚡ Perf ON' : '⚡ Perf OFF';
    }
  }

  var stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  var enabled = stored === '1';
  applyMode(enabled);

  // Floating toggle button (non-intrusive, injected here so we don't have to
  // edit every page's sidebar).
  function ensureToggle() {
    var existing = document.querySelector('[data-perf-toggle]');
    if (existing) {
      applyMode(window.__PERF_MODE);
      return existing;
    }
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-perf-toggle', '');
    var css = {
      position: 'fixed',
      bottom: '18px',
      left: '18px',
      zIndex: '9970',
      fontFamily: 'var(--font-meta, monospace)',
      fontSize: '12px',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      color: 'var(--text-strong, inherit)',
      background: 'var(--bg-panel, #111)',
      border: '1px solid var(--line, #333)',
      padding: '6px 10px',
      cursor: 'pointer',
      opacity: '0.55',
      transition: 'opacity 0.15s ease'
    };
    Object.keys(css).forEach(function (k) { btn.style[k] = css[k]; });
    btn.addEventListener('mouseenter', function () { btn.style.opacity = '1'; });
    btn.addEventListener('mouseleave', function () { btn.style.opacity = '0.55'; });
    btn.addEventListener('click', function () {
      var next = !window.__PERF_MODE;
      applyMode(next);
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch (e) {}
    });
    document.body.appendChild(btn);
    applyMode(window.__PERF_MODE);
    return btn;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureToggle);
  } else {
    ensureToggle();
  }
})();
