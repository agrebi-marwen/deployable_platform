// API SETTINGS - Loaded from centralized config.js
let supabaseClient = null;

// Initialize Supabase client after config loads
async function initSupabaseClient() {
  const config = await waitForConfig();
  if (!config) {
    return;
  }
  
  supabaseClient = supabase.createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  
  // Start loading data after client is ready
  fetchLastThreeChallenges();
  loadPublicLeaderboard();

  // Track login state changes after the client is ready
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    const authBtn = document.getElementById('auth-btn');
    
    const heroCtaBtn = document.getElementById('time-rift-btn'); 

    if (session && session.user) {
        try {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('username, total_points')
                .eq('id', session.user.id)
                .single();

            const username = profile ? profile.username : "Traveler";
            const points = profile ? profile.total_points : 0;

            if (authBtn) {
                authBtn.outerHTML = `
                    <div id="user-nav-container" style="display: flex; align-items: center; gap: 15px;">
                        <a href="dashboard/dashboard.html" style="font-family: 'VT323', monospace; font-size: 19px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-strong); text-decoration: none; border-bottom: 2px dashed var(--neon-cyan); padding-bottom: 2px;">
                            🕒 ${escapeHtml(username)} (${escapeHtml(points)} EP)
                        </a>
                        <button id="logout-btn" style="font-family: 'VT323', monospace; font-size: 17px; text-transform: uppercase; letter-spacing: 0.06em; background: var(--bg-panel); border: 2px solid var(--line); box-shadow: var(--shadow-hard-sm); color: var(--neon-red); padding: 4px 14px; cursor: pointer;">Log Out</button>
                    </div>
                `;
                document.getElementById('logout-btn').addEventListener('click', handleLogout);
            }

            if (heroCtaBtn) {
                heroCtaBtn.textContent = "Enter Command Center";
                heroCtaBtn.setAttribute('href', 'dashboard/dashboard.html');
            }
        } catch (e) {
            console.error("Error setting dynamic auth layout:", e);
        }
    }
});
}

// Initialize on page load
initSupabaseClient();

// Escape untrusted values before interpolating into innerHTML (prevents XSS)
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

//fetch last three challenges from database
async function fetchLastThreeChallenges() {
    const container = document.getElementById('latest-challenges-container');
    if (!container) return;
    
    try {
        const { data: challenges, error } = await supabaseClient
            .from('challenges')
            .select('id, title, instructions, points_worth, month_year, is_active')
            .eq('is_active', true) 
            .order('created_at', { ascending: false }) 
            .limit(3); 

        if (error) throw error;

        if (!challenges || challenges.length === 0) {
            container.innerHTML = `<p class="empty-state">The temporal timeline is stable. No active anomalies detected.</p>`;
            return;
        }

        container.innerHTML = challenges.map(ch => {
            const hue = window.epochHue ? window.epochHue(ch.month_year) : 25;
            return `
            <div class="challenge-card-homepage" style="--epoch-hue: ${hue};">
                <div>
                    <span class="challenge-card-homepage-epoch">
                        ${escapeHtml(ch.month_year || "Active Epoch")}
                    </span>
                    <h3 class="challenge-card-homepage-title">
                        ${escapeHtml(ch.title)}
                    </h3>
                    <p class="challenge-card-homepage-desc">
                        ${ch.instructions ? escapeHtml(ch.instructions.substring(0, 100) + (ch.instructions.length > 100 ? '...' : '')) : ''}
                    </p>
                </div>
                <div class="challenge-card-homepage-meta">
                    <span class="challenge-card-homepage-points">
                        +${escapeHtml(ch.points_worth)} EP
                    </span>
                    <a href="dashboard/challenges.html?target=${escapeHtml(encodeURIComponent(ch.id))}" class="challenge-card-homepage-btn">
                        View Paradox
                    </a>
                </div>
            </div>
        `;
        }).join('');
    } catch (err) {
        console.error("❌ Challenges Error:", err);
        container.innerHTML = `<p style="color: #fe4e00; font-size: 0.9rem;">Error accessing temporal stream: ${escapeHtml(err.message)}</p>`;
    }
}


//load leaderboard from database
async function loadPublicLeaderboard() {
    const tbody = document.getElementById('public-leaderboard-tbody');
    if (!tbody) return;

    try {
        const { data: rankings, error } = await supabaseClient
            .from('profiles')
            .select('username, total_points')
            .order('total_points', { ascending: false })
            .limit(3);

        if (error) throw error;

        if (!rankings || rankings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="table-loading">No timeline adjustments logged yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = rankings.map((profile, index) => {
            let rankBadge = `#${index + 1}`;
            if (index === 0) rankBadge = "🥇";
            else if (index === 1) rankBadge = "🥈";
            else if (index === 2) rankBadge = "🥉";

            return `
                <tr>
                    <td class="col-rank"><strong>${rankBadge}</strong></td>
                    <td class="col-name">${escapeHtml(profile.username || "Anonymous Traveler")}</td>
                    <td class="col-points">${escapeHtml(profile.total_points ?? 0)} EP</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error("❌ Leaderboard Error:", err);
        tbody.innerHTML = `<tr><td colspan="3" class="table-loading" style="color: #fe4e00;">Link offline.</td></tr>`;
    }
}

//login state change
async function handleLogout() {
    await supabaseClient.auth.signOut();
    window.location.reload(); 
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