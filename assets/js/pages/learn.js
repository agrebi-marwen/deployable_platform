// 1. Configure & Initialize Supabase - Loaded from centralized config.js
let supabaseClient = null;

// Initialize Supabase client after config loads
async function initSupabaseClient() {
  const config = await waitForConfig();
  if (!config) {
    return;
  }

  supabaseClient = supabase.createClient(config.url, config.anonKey);

  // Initialize page after client is ready
  initLearnPage();
}

// Initialize client immediately
initSupabaseClient();

// Escape untrusted values before interpolating into innerHTML (prevents XSS)
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// DOM Elements
const navUsername = document.getElementById('nav-username');
const logoutBtn = document.getElementById('logout-btn');
const gridContainer = document.getElementById('learn-grid');

let currentUser = null;

// ==========================================
// 1. AUTHENTICATION & PROFILE FLOW
// ==========================================
async function initLearnPage() {
    logoutBtn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = "../index.html";
    });

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session || !session.user) {
        window.location.href = "../account/login.html";
        return;
    }

    currentUser = session.user;

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .maybeSingle();

    if (profile?.username) {
        navUsername.textContent = `Traveler: ${profile.username}`;
    } else {
        navUsername.textContent = 'Traveler';
    }

    await fetchRoadmaps();
}

// ==========================================
// 2. ROADMAPS FLOW
// ==========================================
async function fetchRoadmaps() {
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
        supabaseClient.from('roadmap_progress').select('step_id').eq('user_id', currentUser.id)
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

// Segmented pixel-bar helper (10 cells)
function buildSegments(pct) {
    const SEGMENTS = 10;
    const filled = Math.round(Math.min(100, Math.max(0, pct)) / 100 * SEGMENTS);
    let html = '';
    for (let i = 0; i < SEGMENTS; i++) {
        html += `<div class="seg${i < filled ? ' on' : ''}"></div>`;
    }
    return html;
}

// Prevent right-click context menu
document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

// Block common developer tool keyboard shortcuts
document.addEventListener('keydown', (event) => {
    if (event.key === 'F12') {
        event.preventDefault();
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'I') {
        event.preventDefault();
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'J') {
        event.preventDefault();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'u') {
        event.preventDefault();
    }
});

// Instantly pauses execution if DevTools is open
setInterval(() => {
    debugger;
}, 100);
