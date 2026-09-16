// sidebar-modals.js - Shared leaderboard + settings modals for every dashboard page.
// Drop this script into any page that has #open-leaderboard / #open-settings in the
// sidebar. It injects the modal markup (once) and wires up open / close / fetch.
//
// On dashboard.html the modals are already inline, so this script is a no-op
// (it checks for #leaderboard-modal before injecting).
//
// Requires: supabaseClient (global from common.js) is available when this runs.

(function () {
  'use strict';

  const LEADERBOARD_HTML = `
  <div class="modal-overlay" id="leaderboard-modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>🏆 Leaderboard</h2>
        <button class="close-modal" id="close-leaderboard">&times;</button>
      </div>
      <p class="modal-subtitle">Top members ranked by points.</p>
      <div class="modal-table-container">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Member Name</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody id="leaderboard-tbody">
            <tr><td colspan="3" class="modal-loading">Loading leaderboard...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>`;

  const SETTINGS_HTML = `
  <div class="modal-overlay" id="settings-modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>⚙️ Account Settings</h2>
        <button class="close-modal" id="close-settings">&times;</button>
      </div>
      <p class="modal-subtitle">Update your public username and password.</p>
      <form id="settings-form" class="settings-form-layout">
        <div class="form-group">
          <label for="settings-username">Public Username</label>
          <input type="text" id="settings-username" placeholder="New username" required minlength="3" maxlength="50" pattern="^[a-zA-Z0-9_]+$" title="Usernames can only contain letters, numbers, and underscores (3-50 chars).">
        </div>
        <div class="form-group">
          <label for="settings-password">New Password</label>
          <input type="password" id="settings-password" placeholder="Leave blank to keep current">
        </div>
        <button type="submit" class="btn-save-settings">Save Changes</button>
        <div id="settings-message"></div>
      </form>
    </div>
  </div>`;

  let leaderboardOffset = 50;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    // If the dashboard page already has inline modals, bail out.
    if (document.getElementById('leaderboard-modal')) return;

    const openLeaderboard = document.getElementById('open-leaderboard');
    const openSettings    = document.getElementById('open-settings');
    if (!openLeaderboard && !openSettings) return;

    // Inject modal markup before </body>.
    const wrapper = document.createElement('div');
    wrapper.innerHTML = LEADERBOARD_HTML + SETTINGS_HTML;
    document.body.appendChild(wrapper);

    // ---- Leaderboard --------------------------------------------------------
    const lbModal = document.getElementById('leaderboard-modal');
    const lbClose = document.getElementById('close-leaderboard');

    if (openLeaderboard) {
      openLeaderboard.addEventListener('click', function (e) {
        e.preventDefault();
        lbModal.classList.add('active');
        fetchLeaderboard();
      });
    }
    if (lbClose) lbClose.addEventListener('click', function () {
      lbModal.classList.remove('active');
    });

    // ---- Settings -----------------------------------------------------------
    const stModal    = document.getElementById('settings-modal');
    const stClose    = document.getElementById('close-settings');
    const stForm     = document.getElementById('settings-form');
    const stUsername = document.getElementById('settings-username');
    const stPassword = document.getElementById('settings-password');
    const stMessage  = document.getElementById('settings-message');

    if (openSettings) {
      openSettings.addEventListener('click', function (e) {
        e.preventDefault();
        stModal.classList.add('active');
        prefillSettings(stUsername);
      });
    }
    if (stClose) stClose.addEventListener('click', function () {
      stModal.classList.remove('active');
    });

    // Close on backdrop click.
    lbModal.addEventListener('click', function (e) {
      if (e.target === lbModal) lbModal.classList.remove('active');
    });
    stModal.addEventListener('click', function (e) {
      if (e.target === stModal) stModal.classList.remove('active');
    });

    // Settings form submit.
    if (stForm) {
      stForm.addEventListener('submit', function (e) {
        e.preventDefault();
        saveSettings(stUsername, stPassword, stMessage, stModal);
      });
    }
  }

  // ---- Leaderboard helpers --------------------------------------------------

  async function fetchLeaderboard() {
    const tbody = document.getElementById('leaderboard-tbody');
    if (!tbody) return;
    leaderboardOffset = 50;
    tbody.innerHTML = '<tr><td colspan="3" class="modal-loading">Loading leaderboard...</td></tr>';

    const { data: rankings, error } = await supabaseClient
      .from('profiles')
      .select('username, total_points')
      .order('total_points', { ascending: false })
      .limit(50);

    if (error) {
      tbody.innerHTML = '<tr><td colspan="3" class="modal-loading">Failed to load leaderboard.</td></tr>';
      return;
    }
    if (!rankings || rankings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="modal-loading">No members yet.</td></tr>';
      return;
    }

    const fragment = document.createDocumentFragment();
    rankings.forEach(function (profile, i) {
      var row = document.createElement('tr');
      row.innerHTML =
        '<td><strong>#' + (i + 1) + '</strong></td>' +
        '<td>' + escapeHtml(profile.username) + '</td>' +
        '<td>' + escapeHtml(profile.total_points ?? 0) + ' pts</td>';
      fragment.appendChild(row);
    });
    tbody.innerHTML = '';
    tbody.appendChild(fragment);

    if (rankings.length === 50) addLoadMore(tbody);
  }

  function addLoadMore(tbody) {
    var row = document.createElement('tr');
    var td  = document.createElement('td');
    td.colSpan = 3;
    td.style.textAlign = 'center';
    td.style.padding  = '15px';
    var btn = document.createElement('button');
    btn.className   = 'load-more-btn';
    btn.textContent = 'Load More Members';
    btn.addEventListener('click', loadMoreLeaderboard);
    td.appendChild(btn);
    row.appendChild(td);
    tbody.appendChild(row);
  }

  async function loadMoreLeaderboard() {
    var tbody   = document.getElementById('leaderboard-tbody');
    var lastRow = tbody.lastChild;
    if (lastRow) lastRow.remove();

    var { data: rankings } = await supabaseClient
      .from('profiles')
      .select('username, total_points')
      .order('total_points', { ascending: false })
      .range(leaderboardOffset, leaderboardOffset + 49);

    if (rankings && rankings.length > 0) {
      var fragment = document.createDocumentFragment();
      rankings.forEach(function (profile, i) {
        var row = document.createElement('tr');
        row.innerHTML =
          '<td><strong>#' + (leaderboardOffset + i + 1) + '</strong></td>' +
          '<td>' + escapeHtml(profile.username) + '</td>' +
          '<td>' + escapeHtml(profile.total_points ?? 0) + ' pts</td>';
        fragment.appendChild(row);
      });
      tbody.appendChild(fragment);
      leaderboardOffset += 50;
      if (rankings.length === 50) addLoadMore(tbody);
    }
  }

  // ---- Settings helpers -----------------------------------------------------

  async function prefillSettings(input) {
    if (!input || !supabaseClient) return;
    var { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.user) return;
    var { data: profile } = await supabaseClient
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .maybeSingle();
    if (profile && profile.username) input.value = profile.username;
  }

  async function saveSettings(usernameInput, passwordInput, msgEl, modal) {
    msgEl.textContent = 'Saving changes...';
    msgEl.style.color = 'var(--text-strong)';

    var { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.user) {
      msgEl.textContent = 'Session expired.';
      msgEl.style.color = '#fe4e00';
      return;
    }

    var newUsername = usernameInput.value.trim();
    var newPassword = passwordInput.value;

    var { error: profileError } = await supabaseClient
      .from('profiles')
      .update({ username: newUsername })
      .eq('id', session.user.id);

    if (profileError) {
      msgEl.textContent = 'Error: ' + profileError.message;
      msgEl.style.color = '#fe4e00';
      return;
    }

    if (newPassword.trim() !== '') {
      var { error: authError } = await supabaseClient.auth.updateUser({ password: newPassword });
      if (authError) {
        msgEl.textContent = 'Username saved, but password failed: ' + authError.message;
        msgEl.style.color = '#fe4e00';
        return;
      }
    }

    msgEl.textContent = 'Changes saved successfully!';
    msgEl.style.color = '#83b5d1';
    setTimeout(function () {
      modal.classList.remove('active');
      msgEl.textContent = '';
      passwordInput.value = '';
    }, 1500);
  }

  // ---- Tiny util shared with other scripts (safe to redefine) ---------------
  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
