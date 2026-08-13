// 1. Configure & Initialize Supabase - Loaded from centralized config.js
let supabaseClient = null;

// Initialize Supabase client after config loads
async function initSupabaseClient() {
  const config = await waitForConfig();
  if (!config) {
    return;
  }
  
  supabaseClient = supabase.createClient(config.url, config.anonKey);
  
  // Initialize submissions page after client is ready
  initSubmissionsPage();
}

// Initialize client immediately
initSupabaseClient();

// Escape untrusted values before interpolating into innerHTML (prevents XSS)
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const logsTableBody = document.getElementById('logs-table-body');
let currentUser = null;

async function initSubmissionsPage() {
    // Authenticate user session
    const { data: { session }, error: authError } = await supabaseClient.auth.getSession();
    
    if (authError || !session || !session.user) {
        window.location.href = "../account/login.html";
        return;
    }
    
    currentUser = session.user;
    await fetchUserSubmissions();
}

async function fetchUserSubmissions() {
    logsTableBody.innerHTML = `<tr><td colspan="4" class="table-loading">Syncing secure telemetry feed...</td></tr>`;

    // We fetch submissions and join the matching 'challenges' records to display the title
    const { data: submissions, error } = await supabaseClient
        .from('submissions')
        .select(`
            id,
            submitted_at,
            submission_url,
            status,
            challenges (
                title
            )
        `)
        .eq('user_id', currentUser.id)
        .order('submitted_at', { ascending: false });

    if (error) {
        console.error("Failed to query submissions log stream:", error);
        logsTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="table-error">
                    Telemetry Fetch Failed: ${escapeHtml(error.message)}
                </td>
            </tr>`;
        return;
    }

    if (!submissions || submissions.length === 0) {
        logsTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="table-empty">
                    No active or pending transmission signals detected from your origin coordinates.
                </td>
            </tr>`;
        return;
    }

    logsTableBody.innerHTML = ""; // Clear loader placeholder

    submissions.forEach(sub => {
        const timestamp = sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : "Unknown";
        const challengeTitle = sub.challenges ? sub.challenges.title : "Unrecognized Anomaly";
        const targetUrl = sub.submission_url || "No target registered";
        
        // Status aesthetic rendering
        const cleanStatus = (sub.status || "PENDING").toUpperCase();
        let statusClass = "status-pending";
        if (cleanStatus === "APPROVED" || cleanStatus === "ACCEPTED") statusClass = "status-accepted";
        if (cleanStatus === "REJECTED") statusClass = "status-rejected";

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="col-time">${escapeHtml(timestamp)}</td>
            <td class="col-title">${escapeHtml(challengeTitle)}</td>
            <td class="col-url">
                <a href="${escapeHtml(targetUrl.startsWith('http') ? targetUrl : '#')}" target="_blank" rel="noopener noreferrer" class="table-link">
                    ${escapeHtml(targetUrl)}
                </a>
            </td>
            <td class="col-status">
                <span class="table-status-badge ${escapeHtml(statusClass)}">${escapeHtml(cleanStatus)}</span>
            </td>
        `;
        logsTableBody.appendChild(row);
    });
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