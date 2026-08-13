/* creative.js - Shared theming helpers
   epochHue / applyEpochColor : per-month accent colors
   burstParticles             : success sparkle burst
*/

// Stable hue (0-360) derived from a month string like "AUGUST 2026"
// Maps onto the DESIGN.md 5-color palette only:
//   Sky Reflection  #83b5d1 -> hsl 205 · Dusk Blue #345995 -> hsl 220
//   Flame Orange    #fe4e00 -> hsl 18  · Tuscan Sun #eec643 -> hsl 45
const PALETTE_HUES = [205, 220, 18, 45];

function hashToHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) % 997;
  }
  return PALETTE_HUES[h % PALETTE_HUES.length];
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
    ? [`hsl(${hue} 85% 60%)`, `hsl(${(hue + 25) % 360} 85% 62%)`, '#ffffff']
    : ['#83b5d1', '#fe4e00', '#eec643', '#ffffff'];

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
