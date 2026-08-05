// API SETTINGS - Loaded from centralized config.js
const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = window.SUPABASE_CONFIG;
 
// API CONNECTION
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

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

        container.innerHTML = challenges.map(ch => `
            <div class="challenge-card" style="
                background: rgba(255, 255, 255, 0.02);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div>
                    <span style="font-size: 0.75rem; color: #f97316; font-weight: bold; text-transform: uppercase; display: block; margin-bottom: 4px;">
                        ${escapeHtml(ch.month_year || "Active Epoch")}
                    </span>
                    <h3 style="color: #ffffff; margin: 0 0 8px 0; font-family: 'Space Grotesk', sans-serif;">
                        ${escapeHtml(ch.title)}
                    </h3>
                    <p style="color: #9ca3af; font-size: 0.85rem; margin: 0; line-height: 1.4;">
                        ${ch.instructions ? escapeHtml(ch.instructions.substring(0, 100) + (ch.instructions.length > 100 ? '...' : '')) : ''}
                    </p>
                </div>
                <div style="text-align: right; min-width: 100px;">
                    <span style="display: block; color: #10b981; font-weight: bold; font-size: 1.1rem; margin-bottom: 8px;">
                        +${escapeHtml(ch.points_worth)} EP
                    </span>
                    <a href="Dashboard/dashboard.html?target=${escapeHtml(encodeURIComponent(ch.id))}" class="action-btn" style="
                        display: inline-block;
                        padding: 8px 12px;
                        background: #f97316;
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 6px;
                        font-size: 0.8rem;
                        font-weight: 600;
                    ">
                        View Paradox
                    </a>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("❌ Challenges Error:", err);
        container.innerHTML = `<p style="color: #ef4444; font-size: 0.9rem;">Error accessing temporal stream: ${escapeHtml(err.message)}</p>`;
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
        tbody.innerHTML = `<tr><td colspan="3" class="table-loading" style="color: #ef4444;">Link offline.</td></tr>`;
    }
}

//login state change
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
                        <a href="Dashboard/dashboard.html" style="font-weight: bold; font-size: 14px; color: #fff; text-decoration: none; border-bottom: 1px dashed #f97316; padding-bottom: 2px;">
                            🕒 ${escapeHtml(username)} (${escapeHtml(points)} EP)
                        </a>
                        <button id="logout-btn" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 6px 14px; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 0.8rem;">Log Out</button>
                    </div>
                `;
                document.getElementById('logout-btn').addEventListener('click', handleLogout);
            }

            if (heroCtaBtn) {
                heroCtaBtn.textContent = "Enter Command Center";
                heroCtaBtn.setAttribute('href', 'Dashboard/dashboard.html');
            }
        } catch (e) {
            console.error("Error setting dynamic auth layout:", e);
        }
    }
});

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


document.addEventListener('DOMContentLoaded', () => {
    loadPublicLeaderboard();
    fetchLastThreeChallenges();
});