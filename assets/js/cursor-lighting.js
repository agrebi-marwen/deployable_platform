/**
 * Interactive Cursor Spotlight & Dynamic Lighting Effect
 */

(function () {
  function initCursorLighting() {
    const RING_SIZE = 32; // must match CSS width/height
    const HALF = RING_SIZE / 2;

    // Create spotlight overlay
    let spotlight = document.getElementById('cursor-spotlight-layer');
    if (!spotlight) {
      spotlight = document.createElement('div');
      spotlight.id = 'cursor-spotlight-layer';
      spotlight.className = 'cursor-spotlight-layer';
      document.body.appendChild(spotlight);
    }

    // Create cursor light ring
    let cursorRing = document.getElementById('cursor-light-ring');
    if (!cursorRing) {
      cursorRing = document.createElement('div');
      cursorRing.id = 'cursor-light-ring';
      cursorRing.className = 'cursor-light-ring';
      document.body.appendChild(cursorRing);
    }

    let isVisible = false;
    let targetX = -200, targetY = -200;
    let currentX = -200, currentY = -200;
    let rafId;

    // Smooth follow loop
    function tick() {
      rafId = requestAnimationFrame(tick);
      // Lerp ring toward cursor
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;
      cursorRing.style.transform = `translate3d(${currentX - HALF}px, ${currentY - HALF}px, 0)`;
    }
    rafId = requestAnimationFrame(tick);

    function onMouseMove(e) {
      targetX = e.clientX;
      targetY = e.clientY;

      // Update spotlight CSS vars
      document.documentElement.style.setProperty('--mouse-x', `${targetX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${targetY}px`);

      if (!isVisible) {
        spotlight.style.opacity = '1';
        cursorRing.style.opacity = '1';
        isVisible = true;
      }
    }

    function onMouseLeave() {
      spotlight.style.opacity = '0';
      cursorRing.style.opacity = '0';
      isVisible = false;
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);

    // Card hover lighting
    function attachCardEvents() {
      const cards = document.querySelectorAll('.card, .stat-card, .panel-card, .signup-form, .challenge-card, .leaderboard-card, .modal-content, .submission-card, .challenge-details-card, .login-card');
      cards.forEach(card => {
        if (!card.dataset.lightingAttached) {
          card.dataset.lightingAttached = 'true';
          card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--card-mouse-x', `${e.clientX - rect.left}px`);
            card.style.setProperty('--card-mouse-y', `${e.clientY - rect.top}px`);
          }, { passive: true });
        }
      });
    }

    attachCardEvents();
    const observer = new MutationObserver(attachCardEvents);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCursorLighting);
  } else {
    initCursorLighting();
  }
})();
