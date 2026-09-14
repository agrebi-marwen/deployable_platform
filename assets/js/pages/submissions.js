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
  logsTableBody.innerHTML = `<tr><td colspan="4" class="table-loading">Loading your submissions...</td></tr>`;

  const { data: submissions, error } = await supabaseClient
    .from('submissions')
    .select(`
            id,
            submitted_at,
            submission_url,
            status,
            challenges (
                title
            ),
            cp_submission_details (
                language,
                verdict
            )
        `)
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error("Failed to query submissions log:", error);
    logsTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="table-error">
                    Failed to load submissions: ${escapeHtml(error.message)}
                </td>
            </tr>`;
    return;
  }

  if (!submissions || submissions.length === 0) {
    logsTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="table-empty">
                    No submissions yet.
                </td>
            </tr>`;
    return;
  }

  logsTableBody.innerHTML = "";

  submissions.forEach(sub => {
    const timestamp = sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : "Unknown";
    const challengeTitle = sub.challenges ? sub.challenges.title : "Unknown Challenge";

    const cpDetails = sub.cp_submission_details || null;
    const cp = Array.isArray(cpDetails) ? cpDetails[0] : cpDetails;

    let detailHtml;
    if (cp && cp.verdict) {
      const langLabel = (cp.language || '').toUpperCase();
      const verdictCode = (cp.verdict || 'PENDING').toUpperCase();
      let vClass = 'cp-v-pending';
      if (verdictCode === 'AC')  vClass = 'cp-v-ac';
      if (verdictCode === 'WA')  vClass = 'cp-v-wa';
      if (verdictCode === 'TLE') vClass = 'cp-v-tle';
      if (verdictCode === 'RE')  vClass = 'cp-v-re';
      if (verdictCode === 'CE')  vClass = 'cp-v-ce';
      detailHtml = `
        <span class="cp-detail-lang">${escapeHtml(langLabel)}</span>
        <span class="cp-detail-verdict ${escapeHtml(vClass)}">${escapeHtml(verdictCode)}</span>`;
    } else if (sub.submission_url) {
      detailHtml = `<a href="${escapeHtml(sub.submission_url)}" target="_blank" rel="noopener noreferrer" class="table-link">${escapeHtml(sub.submission_url)}</a>`;
    } else {
      detailHtml = '<span class="cp-detail-pending">Code submitted</span>';
    }

    const cleanStatus = (sub.status || "PENDING").toUpperCase();
    let statusClass = "status-pending";
    if (cleanStatus === "APPROVED" || cleanStatus === "ACCEPTED") statusClass = "status-accepted";
    if (cleanStatus === "REJECTED") statusClass = "status-rejected";

    const row = document.createElement('tr');
    row.innerHTML = `
            <td class="col-time">${escapeHtml(timestamp)}</td>
            <td class="col-title">${escapeHtml(challengeTitle)}</td>
            <td class="col-details">${detailHtml}</td>
            <td class="col-status">
                <span class="table-status-badge ${escapeHtml(statusClass)}">${escapeHtml(cleanStatus)}</span>
            </td>
        `;
    logsTableBody.appendChild(row);
  });
}