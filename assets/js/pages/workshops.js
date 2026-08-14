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
  initWorkshopsPage();
}

// Initialize client immediately
initSupabaseClient();

// Escape untrusted values before interpolating into innerHTML (prevents XSS)
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Only allow http(s) URLs in href; otherwise render an inert link (blocks javascript: etc.)
function safeUrl(value) {
    const url = String(value ?? '');
    return /^https?:\/\//i.test(url) ? url : '#';
}

// Normalize a Google Drive share link (or bare file id) to its preview embed URL.
// Accepted forms:
//   https://drive.google.com/file/d/<ID>/view?usp=sharing
//   https://drive.google.com/file/d/<ID>/preview
//   https://drive.google.com/open?id=<ID>
//   https://drive.google.com/uc?export=download&id=<ID>
//   <bare ID>
// Returns null when no usable Drive id can be extracted.
function toDriveEmbed(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;

    let id = null;
    const fileMatch = raw.match(/drive\.google\.com\/file\/d\/([^\/?#]+)/);
    const idParamMatch = raw.match(/[?&]id=([^&]+)/);

    if (fileMatch) {
        id = fileMatch[1];
    } else if (idParamMatch) {
        id = idParamMatch[1];
    } else if (/^[A-Za-z0-9_-]{10,}$/.test(raw)) {
        id = raw;
    }

    if (!id) return null;
    return `https://drive.google.com/file/d/${id}/preview`;
}

// DOM Elements
const navUsername = document.getElementById('nav-username');
const logoutBtn = document.getElementById('logout-btn');
const filtersEl = document.getElementById('workshop-filters');
const gridContainer = document.getElementById('workshop-grid');
const overlay = document.getElementById('workshop-player-overlay');
const playerFrame = document.getElementById('player-frame');
const playerCategory = document.getElementById('player-category');
const playerTitle = document.getElementById('player-title');
const playerMeta = document.getElementById('player-meta');
const playerDesc = document.getElementById('player-desc');

let currentUser = null;
let allWorkshops = [];
let activeFilter = 'all';

// ==========================================
// 1. AUTHENTICATION & PROFILE FLOW
// ==========================================
async function initWorkshopsPage() {
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

    await fetchWorkshops();
}

// ==========================================
// 2. WORKSHOPS FLOW
// ==========================================
async function fetchWorkshops() {
    gridContainer.innerHTML = `<div class="loading-state">Unlocking the seminar vault...</div>`;

    // PERF: check cache first (5-minute TTL)
    const cacheKey = 'workshops';
    const cached = window.apiCache?.get(`supabase_${cacheKey}`);

    let data, error;
    if (cached) {
        data = cached.data;
        error = cached.error;
    } else {
        const result = await supabaseClient
            .from('workshops')
            .select(`
                id,
                title,
                description,
                video_url,
                duration,
                published_at,
                category_id,
                workshop_categories (id, slug, name)
            `)
            .order('published_at', { ascending: false });
        data = result.data;
        error = result.error;
        if (window.apiCache) {
            window.apiCache.set(`supabase_${cacheKey}`, { data, error });
        }
    }

    if (error) {
        gridContainer.innerHTML = `<div class="loading-state">Vault scanner offline: ${escapeHtml(error.message)}</div>`;
        return;
    }

    if (!data || data.length === 0) {
        gridContainer.innerHTML = `<div class="loading-state">The seminar vault is empty. No workshops deployed yet.</div>`;
        filtersEl.hidden = true;
        return;
    }

    allWorkshops = data;
    renderFilters();
    renderGrid();
}

function renderFilters() {
    const categories = [];
    allWorkshops.forEach(w => {
        const cat = w.workshop_categories;
        if (cat && !categories.some(c => c.id === cat.id)) {
            categories.push(cat);
        }
    });

    filtersEl.innerHTML = `<button class="pill active" data-cat="all">All</button>`;
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'pill';
        btn.dataset.cat = cat.id;
        btn.textContent = cat.name;
        filtersEl.appendChild(btn);
    });

    filtersEl.hidden = false;
}

function renderGrid() {
    const visible = activeFilter === 'all'
        ? allWorkshops
        : allWorkshops.filter(w => w.category_id === activeFilter);

    if (visible.length === 0) {
        gridContainer.innerHTML = `<div class="loading-state">No transmissions in this category yet.</div>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    visible.forEach(workshop => {
        const cat = workshop.workshop_categories;
        const hue = cat?.slug ? (window.epochHue ? window.epochHue(cat.slug) : 25) : 25;
        const date = workshop.published_at ? new Date(workshop.published_at).toLocaleDateString() : '';

        const card = document.createElement('article');
        card.className = 'workshop-card';
        card.dataset.id = workshop.id;
        card.style.setProperty('--epoch-hue', hue);

        card.innerHTML = `
            <div class="workshop-card-top">
                <span class="path-badge">${escapeHtml(cat?.name || 'Workshop')}</span>
                <span class="workshop-duration">${escapeHtml(workshop.duration || '')}</span>
            </div>
            <h3>${escapeHtml(workshop.title)}</h3>
            <p class="workshop-desc">${escapeHtml(workshop.description || '')}</p>
            <div class="workshop-card-foot">
                <span class="workshop-date">${escapeHtml(date)}</span>
                <span class="workshop-play">Play Transmission ▸</span>
            </div>
        `;

        card.addEventListener('click', () => openPlayer(workshop));
        fragment.appendChild(card);
    });

    gridContainer.innerHTML = "";
    gridContainer.appendChild(fragment);
}

// ==========================================
// 3. PLAYER MODAL
// ==========================================
function openPlayer(workshop) {
    const embedUrl = toDriveEmbed(workshop.video_url);
    if (!embedUrl) {
        alert("This transmission has no valid Google Drive link.");
        return;
    }

    const cat = workshop.workshop_categories;
    const date = workshop.published_at ? new Date(workshop.published_at).toLocaleDateString() : '';
    const metaParts = [workshop.duration, date].filter(Boolean).join(' • ');

    playerCategory.textContent = cat?.name || 'Workshop';
    playerTitle.textContent = workshop.title;
    playerMeta.textContent = metaParts;
    playerDesc.textContent = workshop.description || '';
    playerFrame.src = embedUrl;

    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
}

function closePlayer() {
    overlay.hidden = true;
    playerFrame.src = '';
    document.body.style.overflow = '';
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
    if (event.key === 'Escape') {
        closePlayer();
    }
});

// Instantly pauses execution if DevTools is open
setInterval(() => {
    debugger;
}, 100);

// Filter pills
filtersEl.addEventListener('click', (e) => {
    const pill = e.target.closest('.pill');
    if (!pill) return;

    activeFilter = pill.dataset.cat;
    filtersEl.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p === pill));
    renderGrid();
});

// Player modal controls
document.getElementById('player-close').addEventListener('click', closePlayer);
overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePlayer();
});
