// 1. Configure & Initialize Supabase - Loaded from centralized config.js
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
const challengesList = document.getElementById('challenges-list');
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
const targetChallengeId = new URLSearchParams(window.location.search).get('target');

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
    await fetchChallenges();
}
async function fetchUserProfile() {
  const { data: profile, error } = await supabaseClient
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

    currentUser = currentUser; // no-op, just keeping flow readable
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
// 2. DYNAMIC CHALLENGES FLOW
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

async function fetchChallenges() {
    challengesList.innerHTML = `<div class="loading-state">Scanning temporal streams...</div>`;

    // PERF: Check cache first (5-minute TTL)
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
        // Cache the result
        if (window.apiCache) {
            window.apiCache.set(`supabase_${cacheKey}`, { data: challenges, error });
        }
    }

    if (error) {
        challengesList.innerHTML = `<div class="loading-state">Temporal scanner offline: ${escapeHtml(error.message)}</div>`;
        return;
    }

    if (!challenges || challenges.length === 0) {
        challengesList.innerHTML = `<div class="loading-state">No active anomalies detected at this moment. Secure zone.</div>`;
        return;
    }

    // PERF: Batch DOM updates with DocumentFragment (single reflow instead of multiple)
    const fragment = document.createDocumentFragment();

    challenges.forEach(challenge => {
        const card = document.createElement('div');
        card.classList.add('challenge-card');
        card.dataset.id = challenge.id;
        const hue = window.epochHue ? window.epochHue(challenge.month_year) : 25;
        card.style.setProperty('--epoch-hue', hue);

        card.addEventListener('click', () => {
            window.location.href = `submit.html?id=${challenge.id}`;
        });

        card.innerHTML = `
            <div class="card-top">
                <span class="card-badge">${escapeHtml(challenge.month_year || 'Epoch')}</span>
                <span class="card-points">+${escapeHtml(challenge.points_worth ?? 100)} EP</span>
            </div>
            <h3>${escapeHtml(challenge.title)}</h3>
            <span class="enter-link">Initiate Synchronization →</span>
        `;
        fragment.appendChild(card);
    });

    // Single DOM write
    challengesList.innerHTML = "";
    challengesList.appendChild(fragment);

    // Highlight a challenge targeted from the homepage "View Paradox" link (?target=<id>)
    if (targetChallengeId) {
        const targetCard = challengesList.querySelector(`[data-id="${CSS.escape(targetChallengeId)}"]`);
        if (targetCard) {
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetCard.classList.add('highlighted');
            setTimeout(() => targetCard.classList.remove('highlighted'), 3000);
        }
    }
}

// ==========================================
// 3. LEADERBOARD & SETTINGS MODALS FLOW
// ==========================================
async function fetchLeaderboard() {
    const tbody = document.getElementById('leaderboard-tbody');
    tbody.innerHTML = `<tr><td colspan="3" class="modal-loading">Scanning timelines...</td></tr>`;

    // PERF: Pagination - load 50 at a time instead of unlimited
    const { data: rankings, error } = await supabaseClient
        .from('profiles')
        .select('username, total_points')
        .order('total_points', { ascending: false })
        .limit(50);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="3" class="modal-loading">Failed to read registry: ${escapeHtml(error.message)}</td></tr>`;
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
        loadMoreRow.innerHTML = `<td colspan="3" style="text-align: center; padding: 15px;"><button onclick="loadMoreLeaderboard()" style="padding: 8px 16px; background: #f97316; color: white; border: none; border-radius: 6px; cursor: pointer;">Load More Travelers</button></td>`;
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
            loadMoreRow.innerHTML = `<td colspan="3" style="text-align: center; padding: 15px;"><button onclick="loadMoreLeaderboard()" style="padding: 8px 16px; background: #f97316; color: white; border: none; border-radius: 6px; cursor: pointer;">Load More Travelers</button></td>`;
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

// Stealth Trigger registered in setupEventListeners()