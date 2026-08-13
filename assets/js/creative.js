/* creative.js - Shared motion + theming helpers
   epochHue / applyEpochColor : per-month accent colors
   burstParticles             : success sparkle burst
   portalNavigate             : animated page-to-page navigation
   initScrollTimeTravel       : homepage scroll hue shift
*/

// Stable hue (0-360) derived from a month string like "AUGUST 2026"
function hashToHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) % 997;
  }
  return h % 360;
}

window.epochHue = function (monthYear) {
  const key = String(monthYear || '').toUpperCase().trim();
  if (!key) return 25; // brand orange fallback
  return hashToHue(key);
};

window.applyEpochColor = function (el, hue) {
  if (!el) return;
  el.style.setProperty('--epoch-hue', hue);
};

// ---- Portal transition between pages ------------------------------------
window.initPortalTransition = function () {
  let overlay = document.getElementById('portal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'portal-overlay';
    document.body.appendChild(overlay);
  }

  window.portalNavigate = function (url) {
    overlay.classList.add('active');
    setTimeout(() => { window.location.href = url; }, 460);
  };

  // Brief portal-in flash on page load
  setTimeout(() => {
    overlay.classList.add('active');
    setTimeout(() => overlay.classList.remove('active'), 600);
  }, 60);

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (link.getAttribute('target') === '_blank') return;

    const href = link.getAttribute('href') || '';
    if (/^(#|mailto:|tel:|javascript:|data:)/i.test(href)) return;

    // External links (different origin) are left alone
    if (/^(https?:)?\/\//i.test(href)) {
      try {
        if (new URL(href, window.location.origin).origin !== window.location.origin) return;
      } catch (err) { return; }
    }

    e.preventDefault();
    window.portalNavigate(href);
  }, true);
};

// ---- Scroll-driven time travel (homepage only) --------------------------
window.initScrollTimeTravel = function () {
  const doc = document.documentElement;

  function apply() {
    const max = doc.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

    // past(220) -> present(35) -> future(285)
    let hueVal;
    if (progress < 0.5) {
      hueVal = 220 + (35 - 220) * progress * 2;
    } else {
      hueVal = 35 + (285 - 35) * (progress - 0.5) * 2;
    }
    doc.style.setProperty('--travel-hue', Math.round(hueVal));

    const fill = document.getElementById('time-ruler-fill');
    if (fill) fill.style.height = (progress * 100) + '%';
  }

  window.addEventListener('scroll', apply, { passive: true });
  apply();
};

// ---- Success particle burst ---------------------------------------------
window.burstParticles = function (x, y, hue) {
  let layer = document.getElementById('burst-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'burst-layer';
    layer.className = 'burst-layer';
    document.body.appendChild(layer);
  }

  const palette = hue !== undefined && hue !== null
    ? [`hsl(${hue} 85% 60%)`, `hsl(${(hue + 40) % 360} 85% 65%)`, '#ffffff']
    : ['#f97316', '#f59e0b', '#ffffff'];

  for (let i = 0; i < 26; i++) {
    const p = document.createElement('span');
    p.className = 'burst-particle';
    const angle = Math.random() * Math.PI * 2;
    const dist = 55 + Math.random() * 95;
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
    p.style.setProperty('--dy', (Math.sin(angle) * dist).toFixed(1) + 'px');
    p.style.background = palette[i % palette.length];
    const size = (4 + Math.random() * 5).toFixed(1);
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    layer.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
};

// ---- Auto-init -----------------------------------------------------------
(function () {
  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }
  onReady(function () {
    if (typeof window.initPortalTransition === 'function') window.initPortalTransition();
    if (document.body && document.body.classList.contains('home')) {
      if (typeof window.initScrollTimeTravel === 'function') window.initScrollTimeTravel();
    }
  });
})();