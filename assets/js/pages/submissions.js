// submissions.js - Submission history log
// Bootstrap: config.js + common.js must load before this file.

initApp(initSubmissionsPage);

const logsTableBody = document.getElementById('logs-table-body');

async function initSubmissionsPage() {
  const session = await requireSession();
  if (!session) return;

  await fetchUserSubmissions(session.user.id);
}

async function fetchUserSubmissions(userId) {
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
    .eq('user_id', userId)
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