// index.js - Public landing page
// Bootstrap: config.js + common.js must load before this file.

initApp(
  () => {
    // Fallback: drop team images that fail to load (keeps the CSP free of
    // inline handlers while preserving the previous onerror="this.remove()").
    document.querySelectorAll('.team-avatar img').forEach(img => {
      img.addEventListener('error', () => img.remove());
    });

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

          const username = profile ? profile.username : "User";
          const points = profile ? profile.total_points : 0;

          if (authBtn) {
            authBtn.outerHTML = `
                    <div id="user-nav-container" style="display: flex; align-items: center; gap: 15px;">
                        <a href="dashboard/dashboard.html" style="font-family: 'VT323', monospace; font-size: 19px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-strong); text-decoration: none; border-bottom: 2px dashed var(--neon-cyan); padding-bottom: 2px;">
                            🕒 ${escapeHtml(username)} (${escapeHtml(points)} pts)
                        </a>
                        <button id="logout-btn" style="font-family: 'VT323', monospace; font-size: 17px; text-transform: uppercase; letter-spacing: 0.06em; background: var(--bg-panel); border: 2px solid var(--line); box-shadow: var(--shadow-hard-sm); color: var(--neon-red); padding: 4px 14px; cursor: pointer;">Log Out</button>
                    </div>
                `;
            document.getElementById('logout-btn').addEventListener('click', handleLogout);
          }

          if (heroCtaBtn) {
            heroCtaBtn.textContent = "Open Dashboard";
            heroCtaBtn.setAttribute('href', 'dashboard/dashboard.html');
          }
        } catch (e) {
          console.error("Error setting dynamic auth layout:", e);
        }
      }
    });
  },
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

// Login state change
async function handleLogout() {
  await supabaseClient.auth.signOut();
  window.location.reload();
}