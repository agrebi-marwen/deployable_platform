// learn.js - Academy roadmap gallery
// Bootstrap: config.js + common.js must load before this file.

initApp(initLearnPage);

// DOM Elements
const navUsername = document.getElementById('nav-username');
const logoutBtn = document.getElementById('logout-btn');
const gridContainer = document.getElementById('learn-grid');

async function initLearnPage() {
  bindLogout(logoutBtn);

  const session = await requireSession();
  if (!session) return;

  await loadUsername(session.user.id, navUsername);
  await fetchRoadmaps(session.user.id);
}

async function fetchRoadmaps(userId) {
  gridContainer.innerHTML = `<div class="loading-state">Unlocking the academy vault...</div>`;

  // PERF: check cache first (5-minute TTL)
  const cacheKey = 'roadmaps';
  const cached = window.apiCache?.get(`supabase_${cacheKey}`);

  let roadmaps, error;
  if (cached) {
    roadmaps = cached.roadmaps;
    error = cached.error;
  } else {
    const result = await supabaseClient
      .from('roadmaps')
      .select('id, slug, title, description, difficulty')
      .order('created_at', { ascending: true });
    roadmaps = result.data;
    error = result.error;
    if (window.apiCache) {
      window.apiCache.set(`supabase_${cacheKey}`, { roadmaps, error });
    }
  }

  if (error) {
    gridContainer.innerHTML = `<div class="loading-state">Academy scanner offline: ${escapeHtml(error.message)}</div>`;
    return;
  }

  if (!roadmaps || roadmaps.length === 0) {
    gridContainer.innerHTML = `<div class="loading-state">The academy archive is empty. No paths deployed yet.</div>`;
    return;
  }

  // Fetch all steps (ids grouped by roadmap) + the user's completed step ids
  const [{ data: steps, error: stepsError }, { data: progress, error: progressError }] = await Promise.all([
    supabaseClient.from('roadmap_steps').select('id, roadmap_id'),
    supabaseClient.from('roadmap_progress').select('step_id').eq('user_id', userId)
  ]);

  if (stepsError || progressError) {
    console.error('Learn loader failed:', stepsError, progressError);
  }

  const stepsByRoadmap = {};
  (steps || []).forEach(s => {
    (stepsByRoadmap[s.roadmap_id] = stepsByRoadmap[s.roadmap_id] || []).push(s.id);
  });

  const completedSet = new Set((progress || []).map(p => p.step_id));

  // PERF: Batch DOM updates with DocumentFragment
  const fragment = document.createDocumentFragment();

  roadmaps.forEach(roadmap => {
    const total = (stepsByRoadmap[roadmap.id] || []).length;
    const done = (stepsByRoadmap[roadmap.id] || []).filter(id => completedSet.has(id)).length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    const card = document.createElement('a');
    card.classList.add('path-card');
    card.href = `roadmap.html?id=${encodeURIComponent(roadmap.id)}`;
    card.style.setProperty('--epoch-hue', window.epochHue ? window.epochHue(roadmap.slug) : 25);

    card.innerHTML = `
            <div class="path-card-top">
                <span class="path-badge">${escapeHtml(roadmap.difficulty || 'Path')}</span>
                <span class="path-difficulty">${total} step${total === 1 ? '' : 's'}</span>
            </div>
            <h3>${escapeHtml(roadmap.title)}</h3>
            <p class="path-desc">${escapeHtml(roadmap.description || '')}</p>
            <div class="learn-progress-bar">${buildSegments(pct)}</div>
            <div class="path-progress-caption">
                <span>${done}/${total} complete</span>
                <strong>${pct}%</strong>
            </div>
            <span class="path-enter">Enter the Path →</span>
        `;

    fragment.appendChild(card);
  });

  // Single DOM write
  gridContainer.innerHTML = "";
  gridContainer.appendChild(fragment);
}