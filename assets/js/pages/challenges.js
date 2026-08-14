// Configure & Initialize Supabase - Loaded from centralized config.js
let supabaseClient = null;

// Initialize Supabase client after config loads
async function initSupabaseClient() {
  const config = await waitForConfig();
  if (!config) {
    return;
  }

  supabaseClient = supabase.createClient(config.url, config.anonKey);

  // Initialize page after client is ready
  initChallengesPage();
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
const archiveContainer = document.getElementById('challenges-archive');

const targetChallengeId = new URLSearchParams(window.location.search).get('target');

// ==========================================
// 1. AUTHENTICATION & PROFILE FLOW
// ==========================================
async function initChallengesPage() {
    logoutBtn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = "../index.html";
    });

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session || !session.user) {
        window.location.href = "../account/login.html";
        return;
    }

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

    await fetchAllChallenges();
}

// Parse a deployment label like "AUGUST 2026" into a comparable numeric value
function parseMonthYear(label) {
    const match = String(label || '').trim().toUpperCase().match(/^([A-Z]+)\s*(\d{4})$/);
    if (!match) return 0;
    const months = {
        JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4, MAY: 5, JUNE: 6,
        JULY: 7, AUGUST: 8, SEPTEMBER: 9, OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12
    };
    return months[match[1]] ? Number(match[2]) * 12 + months[match[1]] : 0;
}

// ==========================================
// 2. DYNAMIC CHALLENGES FLOW (ALL EPOCHS)
// ==========================================
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