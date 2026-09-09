/* perf-mode.js - Performance mode: disables the heavy galaxy background,
   cursor spotlight/ring, card lighting, and resource-intensive animations.
   Loaded (non-defer) in <head> so the mode applies before first paint.
   Other effect scripts (galaxy-bg.js, cursor-lighting.js) subscribe via
   window.perfMode.on(...) so they can fully START/STOP their loops when the
   mode is toggled at runtime. */
(function () {
  'use strict';

  var STORAGE_KEY = 'timeportal_perf';
  var root = document.documentElement;
  var listeners = [];
  var enabled = false;

  // Restore persisted preference
  try { enabled = localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) {}
  window.__PERF_MODE = enabled;
  if (enabled) root.classList.add('perf-mode');

  function notify() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](window.__PERF_MODE); } catch (e) {}
    }
  }

  function renderToggle(btn) {
    if (!btn) return;
    btn.setAttribute('aria-pressed', window.__PERF_MODE ? 'true' : 'false');
    btn.title = window.__PERF_MODE
      ? 'Performance mode ON - click to disable'
      : 'Performance mode OFF - click to enable';
    btn.textContent = window.__PERF_MODE ? '⚡ Perf ON' : '⚡ Perf OFF';
  }

  function toggle() {
    window.__PERF_MODE = !window.__PERF_MODE;
    root.classList.toggle('perf-mode', window.__PERF_MODE);
    try { localStorage.setItem(STORAGE_KEY, window.__PERF_MODE ? '1' : '0'); } catch (e) {}
    var btn = document.querySelector('[data-perf-toggle]');
    renderToggle(btn);
    notify();
  }

  // Public API: subscribe to changes; receive latest state on subscribe.
  window.perfMode = {
    enabled: function () { return window.__PERF_MODE; },
    set: function (on) {
      if (!!on === window.__PERF_MODE) return;
      window.__PERF_MODE = !!on;
      root.classList.toggle('perf-mode', window.__PERF_MODE);
      try { localStorage.setItem(STORAGE_KEY, on ? '1' : '0'); } catch (e) {}
      renderToggle(document.querySelector('[data-perf-toggle]'));
      notify();
    },
    on: function (cb) {
      listeners.push(cb);
      cb(window.__PERF_MODE);
      return function () { listeners = listeners.filter(function (l) { return l !== cb; }); };
    }
  };

  function ensureToggle() {
    var existing = document.querySelector('[data-perf-toggle]');
    if (existing) { renderToggle(existing); return existing; }
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
      willChange: 'auto'
    };
    Object.keys(css).forEach(function (k) { btn.style[k] = css[k]; });
    // No CSS transitions on the toggle itself (perf mode is about removing cost).
    btn.addEventListener('click', toggle);
    document.body.appendChild(btn);
    renderToggle(btn);
    return btn;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureToggle);
  } else {
    ensureToggle();
  }
})();
