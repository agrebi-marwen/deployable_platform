// Configure & Initialize Supabase - Loaded from centralized config.js
let supabaseClient = null;

// Initialize Supabase client after config loads
async function initSupabaseClient() {
  const config = await waitForConfig();
  if (!config) {
    return;
  }

  supabaseClient = supabase.createClient(config.url, config.anonKey);

  // Initialize dashboard after client is ready
  initDashboard();
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
const statRank = document.getElementById('stat-rank');
const statPoints = document.getElementById('stat-points');
const statSolved = document.getElementById('stat-solved');
const missionProgress = document.getElementById('mission-progress');
const epochStats = document.getElementById('epoch-stats');
const logoutBtn = document.getElementById('logout-btn');

// Modal Elements
const leaderboardModal = document.getElementById('leaderboard-modal');
const settingsModal = document.getElementById('settings-modal');
const openLeaderboardBtn = document.getElementById('open-leaderboard');
const openSettingsBtn = document.getElementById('open-settings');
const closeLeaderboardBtn = document.getElementById('close-leaderboard');
const closeSettingsBtn = document.getElementById('close-settings');

// Settings Form Elements
const settingsForm = document.getElementById('settings-form');
const settingsUsernameInput = document.getElementById('settings-username');
const settingsPasswordInput = document.getElementById('settings-password');
const settingsMessage = document.getElementById('settings-message');

let currentUser = null;

// ==========================================
// 1. AUTHENTICATION & PROFILE FLOW
// ==========================================
async function initDashboard() {
    setupEventListeners();

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session || !session.user) {
        window.location.href = "../account/login.html";
        return;
    }

    currentUser = session.user;

    await fetchUserProfile();
    await fetchDashboardData();
}
async function fetchUserProfile() {
  let { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('username, total_points')
    .eq('id', currentUser.id)
    .maybeSingle(); // <-- important: returns null instead of throwing for "no rows"

  // If no row exists for this user, create it
  if (!profile && !error) {
    const { error: insertError } = await supabaseClient
      .from('profiles')
      .insert({
        id: currentUser.id,
        username: 'Traveler',
        total_points: 0,
      });

    if (insertError) {
      console.error('Profile insert failed:', insertError);
      navUsername.textContent = 'Traveler';
      statPoints.textContent = '0 EP';
      statSolved.textContent = '0';
      return;
    }

    // refetch after insert
    const { data: newProfile } = await supabaseClient
      .from('profiles')
      .select('username, total_points')
      .eq('id', currentUser.id)
      .single();

    profile = newProfile;
  } else if (error) {
    console.error('Profile load failed:', error);
    navUsername.textContent = 'Traveler';
    statPoints.textContent = '0 EP';
    statSolved.textContent = '0';
    return;
  }

  // Now update UI from `profile`
  const points = profile.total_points ?? 0;

  navUsername.textContent = `Traveler: ${profile.username}`;
  statPoints.textContent = `${points} EP`;
  settingsUsernameInput.value = profile.username;

  if (points >= 1000) {
    statRank.textContent = "Grand Time Lord";
  } else if (points >= 500) {
    statRank.textContent = "Chronos Engineer";
  } else {
    statRank.textContent = "Novice Traveler";
  }

  updateRankBar(points);

  const { count, error: countError } = await supabaseClient
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', currentUser.id)
    .eq('status', 'APPROVED');

  if (!countError) {
    statSolved.textContent = count ?? 0;
  } else {
    console.error("Failed to count submissions:", countError);
    statSolved.textContent = "0";
  }
}
// ==========================================
// 2. DASHBOARD DATA FLOW
// ==========================================

// Bar-style progress toward the next rank
function updateRankBar(points) {
    const fill = document.getElementById('rank-bar-fill');
    const next = document.getElementById('rank-bar-next');
    if (!fill || !next) return;

    let currentMin = 0, nextMin = 500;
    if (points >= 1000) {
        nextMin = null;
    } else if (points >= 500) {
        currentMin = 500; nextMin = 1000;
    }

    if (nextMin === null) {
        fill.style.width = '100%';
        next.textContent = 'Highest rank reached';
        return;
    }

    const progress = Math.min(1, Math.max(0, (points - currentMin) / (nextMin - currentMin)));
    fill.style.width = (progress * 100).toFixed(1) + '%';
    next.textContent = `${nextMin - points} EP to next rank`;
}

async function fetchDashboardData() {
    // Fetch active challenges (cached 5-min) and the user's full submission history
    const cacheKey = 'active_challenges';
    const cached = window.apiCache?.get(`supabase_${cacheKey}`);
    let challenges, error;

    if (cached) {
        ({ data: challenges, error } = cached);
    } else {
        const result = await supabaseClient
            .from('challenges')
            .select('id, title, instructions, month_year, points_worth, is_active')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        challenges = result.data;
        error = result.error;
        if (window.apiCache) {
            window.apiCache.set(`supabase_${cacheKey}`, { data: challenges, error });
        }
    }

    const { data: submissions, error: subError } = await supabaseClient
        .from('submissions')
        .select('id, submitted_at, status, challenge_id')
        .eq('user_id', currentUser.id)
        .order('submitted_at', { ascending: false });

    if (subError) {
        console.error('Submissions load failed:', subError);
    }

    const submissionsList = submissions || [];
    const latestByChallenge = buildLatestStatusMap(submissionsList);

    renderMissionProgress(error ? [] : challenges || [], latestByChallenge);
    renderEpochStats(error ? [] : challenges || [], latestByChallenge);
}

// Map each challenge to its most recent submission status
function buildLatestStatusMap(submissions) {
    const map = {};
    submissions.forEach(s => {
        const ts = s.submitted_at ? new Date(s.submitted_at).getTime() : 0;
        const cur = map[s.challenge_id];
        if (!cur || ts > cur.ts) {
            map[s.challenge_id] = { status: s.status, ts };
        }
    });
    return map;
}

function statusLabel(status) {
    switch (status) {
        case 'APPROVED': return 'Approved';
        case 'REJECTED': return 'Rejected';
        case 'PENDING': return 'Pending Review';
        default: return 'Not Started';
    }
}

function statusClass(status) {
    switch (status) {
        case 'APPROVED': return 'status-accepted';
        case 'REJECTED': return 'status-rejected';
        case 'PENDING': return 'status-pending';
        default: return 'status-none';
    }
}

function renderMissionProgress(challenges, latestByChallenge) {
    if (!challenges || challenges.length === 0) {
        missionProgress.innerHTML = `<div class="loading-state">No active anomalies detected at this moment. Secure zone.</div>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    challenges.slice(0, 3).forEach(challenge => {
        const entry = latestByChallenge[challenge.id];
        const status = entry?.status ?? null;
        const row = document.createElement('div');
        row.classList.add('mission-row');
        row.style.setProperty('--epoch-hue', window.epochHue ? window.epochHue(challenge.month_year) : 25);

        row.innerHTML = `
            <div class="mission-meta">
                <span class="mission-title">${escapeHtml(challenge.title)}</span>
                <span class="mission-date">${status ? 'Last deployment ' + escapeHtml(formatDate(entry.ts)) : 'Awaiting first deployment'}</span>
            </div>
            <span class="table-status-badge ${statusClass(status)}">${escapeHtml(statusLabel(status))}</span>
            <a class="mission-link" href="submit.html?id=${encodeURIComponent(challenge.id)}">Open &rarr;</a>
        `;
        fragment.appendChild(row);
    });

    missionProgress.innerHTML = "";
    missionProgress.appendChild(fragment);
}

function renderEpochStats(challenges, latestByChallenge) {
    const epochs = {};
    challenges.forEach(challenge => {
        const month = (challenge.month_year || 'Unknown Epoch').trim();
        if (!epochs[month]) {
            epochs[month] = { total: 0, approved: 0, hue: window.epochHue ? window.epochHue(month) : 25 };
        }
        epochs[month].total++;
        if (latestByChallenge[challenge.id]?.status === 'APPROVED') {
            epochs[month].approved++;
        }
    });

    const sorted = Object.keys(epochs).sort((a, b) => parseMonthYear(b) - parseMonthYear(a));

    if (sorted.length === 0) {
        epochStats.innerHTML = `<div class="loading-state">No active anomalies detected at this moment.</div>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    sorted.forEach(month => {
        const epoch = epochs[month];
        const pct = epoch.total ? Math.round((epoch.approved / epoch.total) * 100) : 0;
        const stat = document.createElement('div');
        stat.classList.add('epoch-stat');
        stat.style.setProperty('--epoch-hue', epoch.hue);

        stat.innerHTML = `
            <div class="epoch-stat-head">
                <span>${escapeHtml(month)}</span>
                <span class="epoch-stat-count">${epoch.approved}/${epoch.total} approved</span>
            </div>
            <div class="epoch-stat-bar">
                <div class="epoch-stat-fill" style="width:${pct}%"></div>
            </div>
        `;
        fragment.appendChild(stat);
    });

    epochStats.innerHTML = "";
    epochStats.appendChild(fragment);
}

function formatDate(value) {
    if (!value) return 'Unknown';
    const d = new Date(value);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
// 3. INLINE LEADERBOARD & SETTINGS FLOW
// ==========================================
async function fetchLeaderboard() {
    const tbody = document.getElementById('leaderboard-tbody');
    tbody.innerHTML = `<tr><td colspan="3" class="table-loading">Scanning timelines...</td></tr>`;

    // PERF: Pagination - load 50 at a time instead of unlimited
    const { data: rankings, error } = await supabaseClient
        .from('profiles')
        .select('username, total_points')
        .order('total_points', { ascending: false })
        .limit(50);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="3" class="table-loading">Failed to read registry: ${escapeHtml(error.message)}</td></tr>`;
        return;
    }

    if (!rankings || rankings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="table-loading">No travelers registered yet.</td></tr>`;
        return;
    }

    // PERF: Batch DOM updates with DocumentFragment
    const fragment = document.createDocumentFragment();
    rankings.forEach((profile, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>#${index + 1}</strong></td>
            <td>${escapeHtml(profile.username)}</td>
            <td>${escapeHtml(profile.total_points ?? 0)} EP</td>
        `;
        fragment.appendChild(row);
    });

    // Single DOM write
    tbody.innerHTML = "";
    tbody.appendChild(fragment);

    // Add Load More button if there are 50 results
    if (rankings.length === 50) {
        const loadMoreRow = document.createElement('tr');
        loadMoreRow.innerHTML = `<td colspan="3" style="text-align: center; padding: 15px;"><button class="load-more-btn" onclick="loadMoreLeaderboard()">Load More Travelers</button></td>`;
        tbody.appendChild(loadMoreRow);
    }
}

// Load additional leaderboard entries
let leaderboardOffset = 50;
async function loadMoreLeaderboard() {
    const tbody = document.getElementById('leaderboard-tbody');
    const lastRow = tbody.lastChild;
    if (lastRow) lastRow.remove(); // Remove Load More button

    const { data: rankings, error } = await supabaseClient
        .from('profiles')
        .select('username, total_points')
        .order('total_points', { ascending: false })
        .range(leaderboardOffset, leaderboardOffset + 49);

    if (!error && rankings?.length > 0) {
        const fragment = document.createDocumentFragment();
        rankings.forEach((profile, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>#${leaderboardOffset + index + 1}</strong></td>
                <td>${escapeHtml(profile.username)}</td>
                <td>${escapeHtml(profile.total_points ?? 0)} EP</td>
            `;
            fragment.appendChild(row);
        });
        tbody.appendChild(fragment);
        leaderboardOffset += 50;

        // Add Load More button again if full batch returned
        if (rankings.length === 50) {
            const loadMoreRow = document.createElement('tr');
            loadMoreRow.innerHTML = `<td colspan="3" style="text-align: center; padding: 15px;"><button class="load-more-btn" onclick="loadMoreLeaderboard()">Load More Travelers</button></td>`;
            tbody.appendChild(loadMoreRow);
        }
    }
}

settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    settingsMessage.textContent = "Updating protocol...";
    settingsMessage.style.color = "white";

    const newUsername = settingsUsernameInput.value.trim();
    const newPassword = settingsPasswordInput.value;

    const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ username: newUsername })
        .eq('id', currentUser.id);

    if (profileError) {
        settingsMessage.textContent = "Error: " + profileError.message;
        settingsMessage.style.color = "red";
        return;
    }

    if (newPassword.trim() !== "") {
        const { error: authError } = await supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (authError) {
            settingsMessage.textContent = "Username saved, but password failed: " + authError.message;
            settingsMessage.style.color = "red";
            return;
        }
    }

    settingsMessage.textContent = "Identity stabilized successfully!";
    settingsMessage.style.color = "green";
    fetchUserProfile();
    setTimeout(() => {
        settingsModal.classList.remove('active');
        settingsMessage.textContent = "";
        settingsPasswordInput.value = "";
    }, 1500);
});

// ==========================================
// 4. GENERAL EVENTS
// ==========================================
function setupEventListeners() {
    openLeaderboardBtn.addEventListener('click', (e) => {
        e.preventDefault();
        leaderboardModal.classList.add('active');
        fetchLeaderboard();
    });

    openSettingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        settingsModal.classList.add('active');
    });

    closeLeaderboardBtn.addEventListener('click', () => leaderboardModal.classList.remove('active'));
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('active'));

    window.addEventListener('click', (e) => {
        if (e.target === leaderboardModal) leaderboardModal.classList.remove('active');
        if (e.target === settingsModal) settingsModal.classList.remove('active');
    });

    logoutBtn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = "../index.html";
    });

    // Stealth Trigger: Click the STATS RANK text ("Novice Traveler") 5 times
    // BUT only while holding down the "Shift" key!
    statRank.addEventListener('click', (e) => {
        // Only count the click if the Shift key is actively being held down
        if (e.shiftKey) {
            clickTracker++;

            clearTimeout(clickTimeout);
            clickTimeout = setTimeout(() => {
                clickTracker = 0;
            }, 1500); // Must complete 5 clicks within 1.5 seconds

            if (clickTracker === 5) {
                clickTracker = 0;
                triggerStealthRedirect();
            }
        }
    });
}

// ==========================================
// 5. THE STEALTH GATEWAY (UNEXPOSED)
// ==========================================
let clickTracker = 0;
let clickTimeout;

// This is the Base64 encoded string of "../admin/admin.html"
// Anyone inspecting your JS file will only see a random string of characters!
const ENCODED_ROUTE = "Li4vYWRtaW4vYWRtaW4uaHRtbA==";

function triggerStealthRedirect() {
    // Decode the path dynamically in memory right before redirecting
    const targetPath = atob(ENCODED_ROUTE);
    window.location.href = targetPath;
}

// Prevent right-click context menu
document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});


// Block common developer tool keyboard shortcuts
document.addEventListener('keydown', (event) => {
    // 1. Block F12
    if (event.key === 'F12') {
        event.preventDefault();
    }

    // 2. Block Ctrl+Shift+I (Windows/Linux) or Cmd+Opt+I (Mac)
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'I') {
        event.preventDefault();
    }

    // 3. Block Ctrl+Shift+J / Cmd+Opt+J (Opens Console directly)
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'J') {
        event.preventDefault();
    }

    // 4. Block Ctrl+U / Cmd+Opt+U (View Page Source)
    if ((event.ctrlKey || event.metaKey) && event.key === 'u') {
        event.preventDefault();
    }
});

// Instantly pauses execution if DevTools is open
setInterval(() => {
    debugger;
}, 100);