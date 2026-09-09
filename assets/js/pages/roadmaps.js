// roadmaps.js - Node-based roadmap gallery (fields like CP, MLOps)
// Bootstrap: config.js + common.js must load before this file.

initApp(initRoadmapsPage);

// DOM Elements
const navUsername = document.getElementById('nav-username');
const logoutBtn = document.getElementById('logout-btn');
const gridContainer = document.getElementById('roadmaps-grid');

let currentUserId = null;

async function initRoadmapsPage() {
  bindLogout(logoutBtn);

  const session = await requireSession();
  if (!session) return;

  currentUserId = session.user.id;
  await loadUsername(session.user.id, navUsername);
  await fetchRoadmaps();
}

async function fetchRoadmaps() {
  gridContainer.innerHTML = `<div class="loading-state">Loading roadmaps...</div>`;

  // PERF: check cache first (5-minute TTL)
  const cacheKey = 'roadmaps_nodes';
  const cached = window.apiCache?.get(`supabase_${cacheKey}`);

  let roadmaps, error;
  if (cached) {
    roadmaps = cached.roadmaps;
    error = cached.error;
  } else {
    const result = await supabaseClient
      .from('roadmaps')
      .select('id, slug, title, description, difficulty')
      .eq('type', 'nodes')
      .order('created_at', { ascending: true });
    roadmaps = result.data;
    error = result.error;
    if (window.apiCache) {
      window.apiCache.set(`supabase_${cacheKey}`, { roadmaps, error });
    }
  }

  if (error) {
    gridContainer.innerHTML = `<div class="loading-state">Failed to load roadmaps: ${escapeHtml(error.message)}</div>`;
    return;
  }

  if (!roadmaps || roadmaps.length === 0) {
    gridContainer.innerHTML = `<div class="loading-state">No roadmaps available yet. Check back soon.</div>`;
    return;
  }

  // Fetch all nodes (ids grouped by roadmap) + the user's deepest unlocked node per roadmap
  const [{ data: nodes, error: nodesError }, { data: progress, error: progressError }] = await Promise.all([
    supabaseClient
      .from('roadmap_nodes')
      .select('id, roadmap_id')
      .in('roadmap_id', roadmaps.map(r => r.id)),
    supabaseClient
      .from('roadmap_node_progress')
      .select('roadmap_id, node_id')
      .eq('user_id', currentUserId)
  ]);

  if (nodesError || progressError) {
    console.error('Roadmaps loader failed:', nodesError, progressError);
  }

  const nodesByRoadmap = {};
  (nodes || []).forEach(n => {
    (nodesByRoadmap[n.roadmap_id] = nodesByRoadmap[n.roadmap_id] || []).push(n.id);
  });

  const progressByRoadmap = {};
  (progress || []).forEach(p => {
    // Keep the deepest = by node position; node_id is enough for display here
    progressByRoadmap[p.roadmap_id] = p.node_id;
  });

  const fragment = document.createDocumentFragment();

  roadmaps.forEach(roadmap => {
    const total = (nodesByRoadmap[roadmap.id] || []).length;
    const hasProgress = Boolean(progressByRoadmap[roadmap.id]);

    const card = document.createElement('a');
    card.classList.add('path-card');
    card.href = `roadmap-map.html?id=${encodeURIComponent(roadmap.id)}`;
    card.style.setProperty('--epoch-hue', window.epochHue ? window.epochHue(roadmap.slug) : 25);

    card.innerHTML = `
            <div class="path-card-top">
                <span class="path-badge">${escapeHtml(roadmap.difficulty || 'Field')}</span>
                <span class="path-difficulty">${total} node${total === 1 ? '' : 's'}</span>
            </div>
            <h3>${escapeHtml(roadmap.title)}</h3>
            <p class="path-desc">${escapeHtml(roadmap.description || '')}</p>
            <div class="path-progress-caption">
                <span>${hasProgress ? 'In progress' : 'Not started'}</span>
            </div>
            <span class="path-enter">Explore Field →</span>
        `;

    fragment.appendChild(card);
  });

  gridContainer.innerHTML = "";
  gridContainer.appendChild(fragment);
}
