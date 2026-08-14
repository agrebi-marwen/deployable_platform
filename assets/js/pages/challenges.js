// challenges.js - Epoch archive of all challenges
// Bootstrap: config.js + common.js must load before this file.

initApp(initChallengesPage);

// DOM Elements
const navUsername = document.getElementById('nav-username');
const logoutBtn = document.getElementById('logout-btn');
const archiveContainer = document.getElementById('challenges-archive');

const targetChallengeId = new URLSearchParams(window.location.search).get('target');

async function initChallengesPage() {
  bindLogout(logoutBtn);

  const session = await requireSession();
  if (!session) return;

  await loadUsername(session.user.id, navUsername);
  await fetchAllChallenges();
}

async function fetchAllChallenges() {
  archiveContainer.innerHTML = `<div class="loading-state">Scanning the temporal archive...</div>`;

  // PERF: Check cache first (5-minute TTL)
  const cacheKey = 'all_challenges';
  const cached = window.apiCache?.get(`supabase_${cacheKey}`);
  let challenges, error;

  if (cached) {
    ({ data: challenges, error } = cached);
  } else {
    const result = await supabaseClient
      .from('challenges')
      .select('id, title, instructions, month_year, points_worth, is_active')
      .order('created_at', { ascending: false });
    challenges = result.data;
    error = result.error;
    if (window.apiCache) {
      window.apiCache.set(`supabase_${cacheKey}`, { data: challenges, error });
    }
  }

  if (error) {
    archiveContainer.innerHTML = `<div class="loading-state">Temporal scanner offline: ${escapeHtml(error.message)}</div>`;
    return;
  }

  if (!challenges || challenges.length === 0) {
    archiveContainer.innerHTML = `<div class="loading-state">The archive is empty. No anomalies deployed yet.</div>`;
    return;
  }

  // Group by deployment month (month_year), newest epoch first
  const groups = {};
  challenges.forEach(challenge => {
    const month = (challenge.month_year || 'Unknown Epoch').trim();
    (groups[month] = groups[month] || []).push(challenge);
  });

  const sortedMonths = Object.keys(groups).sort((a, b) => parseMonthYear(b) - parseMonthYear(a));

  // PERF: Batch DOM updates with DocumentFragment (single reflow instead of multiple)
  const fragment = document.createDocumentFragment();

  sortedMonths.forEach(month => {
    const monthChallenges = groups[month];
    const hue = window.epochHue ? window.epochHue(month) : 25;

    const section = document.createElement('section');
    section.classList.add('epoch-section');
    section.style.setProperty('--epoch-hue', hue);

    const header = document.createElement('div');
    header.classList.add('epoch-header');
    header.innerHTML = `
            <span class="epoch-month">${escapeHtml(month)}</span>
            <span class="epoch-count">${monthChallenges.length} anomaly${monthChallenges.length === 1 ? '' : 'ies'}</span>
        `;

    const grid = document.createElement('div');
    grid.classList.add('challenges-grid');

    monthChallenges.forEach(challenge => {
      const archived = !challenge.is_active;
      const card = document.createElement('div');
      card.classList.add('challenge-card');
      if (archived) card.classList.add('card-archived');
      card.dataset.id = challenge.id;

      if (!archived) {
        card.addEventListener('click', () => {
          window.location.href = `submit.html?id=${challenge.id}`;
        });
      }

      card.innerHTML = `
                <div class="card-top">
                    <span class="card-badge">${escapeHtml(challenge.month_year || 'Epoch')}</span>
                    <span class="card-points">+${escapeHtml(challenge.points_worth ?? 100)} EP</span>
                </div>
                <h3>${escapeHtml(challenge.title)}</h3>
                <p class="challenge-desc">${escapeHtml((challenge.instructions || '').replace(/\s+/g, ' ').trim().slice(0, 140))}</p>
                <span class="enter-link">${archived ? 'Archived Epoch' : 'Initiate Synchronization →'}</span>
            `;
      grid.appendChild(card);
    });

    section.appendChild(header);
    section.appendChild(grid);
    fragment.appendChild(section);
  });

  // Single DOM write
  archiveContainer.innerHTML = "";
  archiveContainer.appendChild(fragment);

  // Highlight a challenge targeted from the homepage "View Paradox" link (?target=<id>)
  if (targetChallengeId) {
    const targetCard = archiveContainer.querySelector(`[data-id="${CSS.escape(targetChallengeId)}"]`);
    if (targetCard) {
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetCard.classList.add('highlighted');
      setTimeout(() => targetCard.classList.remove('highlighted'), 3000);
    }
  }
}