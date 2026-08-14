/* security.js - Consolidated anti-tamper protections.
   Loaded on every page so these listeners are registered exactly once.
   NOTE: The former per-file `setInterval(debugger)` is intentionally
   dropped — it burned a 100ms timer on every tab and added no real
   protection. Right-click + devtools shortcut guards are kept. */
(function () {
  'use strict';

  // Prevent right-click context menu
  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  // Block common developer tool keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    if (event.key === 'F12') {
      event.preventDefault();
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'I' || event.key === 'J')) {
      event.preventDefault();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'u') {
      event.preventDefault();
    }
  });
})();