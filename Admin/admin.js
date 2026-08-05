// API CONNECTION - Loaded from centralized config.js
const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = window.SUPABASE_CONFIG;

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Escape untrusted values before interpolating into innerHTML (prevents XSS)
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Only allow http(s) URLs in href; otherwise render an inert link (blocks javascript: etc.)
function safeUrl(value) {
    const url = String(value ?? '');
    return /^https?:\/\//i.test(url) ? url : '#';
}

// SECURITY SETTINGS
const ADMIN_SECRET_KEY = "BAGABOZ"; 
let isRoleAuthorized = false;
let isPasswordAuthorized = false;

const overlay = document.getElementById('security-overlay');
const adminPanel = document.getElementById('admin-panel-content');
const authError = document.getElementById('auth-error');
const passInput = document.getElementById('admin-pass-input');


passInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') window.checkAdminPassword();
});

// DATABASE ROLE VERIFICATION 
async function verifyAdminRole() {
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (sessionError || !session || !session.user) {
        alert("Unauthorized terminal. Please login.");
        window.location.href = "../Account/login.html";
        return;
    }

    const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (profileError || !profile || profile.role !== 'admin') {
        alert("ACCESS DENIED: Administrative credentials required.");
        window.location.href = "../Dashboard/dashboard.html";
        return;
    }


    isRoleAuthorized = true;
    overlay.style.display = "flex";
    passInput.focus();
}

// PASSWORD VERIFICATION 
window.checkAdminPassword = function() {
    if (!isRoleAuthorized) return;

    const inputVal = passInput.value;

    if (inputVal === ADMIN_SECRET_KEY) {
        isPasswordAuthorized = true;
        authError.textContent = "";


        overlay.style.display = "none";
        adminPanel.style.display = "block";

        fetchPendingSubmissions(); 
    } else {
        authError.textContent = "CRITICAL: Access Denied. Invalid terminal code.";
        passInput.value = "";
        passInput.focus();
    }
};


verifyAdminRole();

// SUBMIT NEW CHALLENGES
const challengeForm = document.getElementById('challenge-form');
const creationMessage = document.getElementById('creation-message');
const submitBtn = document.getElementById('submit-btn');
const submissionsList = document.getElementById('submissions-list');

challengeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!isRoleAuthorized || !isPasswordAuthorized) {
        alert("Security breach detected. Terminal locked.");
        window.location.reload();
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Deploying Anomaly...";
    creationMessage.textContent = "";

    const title = document.getElementById('title').value.trim();
    const points_worth = parseInt(document.getElementById('points_worth').value, 10);
    const instructions = document.getElementById('instructions').value.trim();
    const is_active = document.getElementById('is_active').checked;

    const currentDate = new Date();
    const month_year = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();

    const { error } = await supabaseClient
        .from('challenges')
        .insert([{ title, instructions, month_year, points_worth, is_active }]);

    if (error) {
        creationMessage.style.color = "#ef4444";
        creationMessage.textContent = "Failed: " + error.message;
    } else {
        creationMessage.style.color = "#10b981";
        creationMessage.textContent = `Success! Anomaly deployed under timeline index: ${month_year}`;
        challengeForm.reset();
        document.getElementById('is_active').checked = true;
    }
    submitBtn.disabled = false;
    submitBtn.textContent = "Deploy Anomaly";
});

// PENDING SUBMISSIONS
async function fetchPendingSubmissions() {
    if (!isRoleAuthorized || !isPasswordAuthorized) return;

    const { data: submissions, error } = await supabaseClient
        .from('submissions')
        .select(`
            id,
            submission_url,
            submitted_at,
            status,
            user_id,
            challenge_id,
            profiles (username)
        `)
        .eq('status', 'PENDING');

    if (error) {
        console.error("Failed to load timeline queue:", error);
        return;
    }

    const { data: challenges } = await supabaseClient.from('challenges').select('id, title');
    const challengeLookup = {};
    if (challenges) {
        challenges.forEach(c => challengeLookup[c.id] = c.title);
    }

    renderSubmissions(submissions, challengeLookup);
}

// RENDERING ENGINE 
function renderSubmissions(submissions, challengeLookup) {
    submissionsList.innerHTML = "";

    if (!submissions || submissions.length === 0) {
        submissionsList.innerHTML = `<p class="empty-state">No pending anomalies currently require review.</p>`;
        return;
    }

    submissions.forEach(sub => {
        const username = sub.profiles?.username || "Unknown Traveler";
        const challengeTitle = challengeLookup[sub.challenge_id] || "Active Paradox Target";
        const dateRaw = sub.submitted_at || sub.created_at;
        const date = dateRaw ? new Date(dateRaw).toLocaleString() : "Recent Stream";

        const card = document.createElement('div');
        card.className = "sub-card";
        card.style.cssText = `
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        `;


        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h3 style="color: #ffffff; margin: 0; font-family: 'Space Grotesk', sans-serif; font-size: 1.1rem;">${escapeHtml(challengeTitle)}</h3>
                    <p style="color: #6b7280; font-size: 0.75rem; margin: 4px 0 0 0;">Traveler: <strong>${escapeHtml(username)}</strong> • ${escapeHtml(date)}</p>
                </div>
                <span style="font-size: 0.75rem; color: #f59e0b; background: rgba(245, 158, 11, 0.1); padding: 3px 8px; border: 1px solid rgba(245,158,11,0.2); border-radius: 6px; font-weight: 700;">PENDING</span>
            </div>
            
            <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.02);">
                <span style="color: #6b7280; font-size: 0.75rem; display:block; margin-bottom:2px;">Repository Payload URL:</span>
                <a href="${escapeHtml(safeUrl(sub.submission_url))}" target="_blank" rel="noopener noreferrer" style="color: #f97316; font-size: 0.85rem; word-break: break-all; text-decoration: none;">
                    ${escapeHtml(sub.submission_url)} ↗
                </a>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 5px;">
                <button class="action-btn btn-approve" data-id="${escapeHtml(sub.id)}" data-action="APPROVED" style="flex: 1; padding: 10px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; border-radius: 6px; cursor: pointer; font-family: 'Space Grotesk'; font-weight: 600; font-size: 0.85rem;">Approve Patch</button>
                <button class="action-btn btn-reject" data-id="${escapeHtml(sub.id)}" data-action="REJECTED" style="flex: 1; padding: 10px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; border-radius: 6px; cursor: pointer; font-family: 'Space Grotesk'; font-weight: 600; font-size: 0.85rem;">Reject Patch</button>
            </div>
        `;
        submissionsList.appendChild(card);
    });
}

submissionsList.addEventListener('click', async (e) => {
    const targetButton = e.target.closest('button[data-action]');
    if (!targetButton) return;

    e.preventDefault();

    if (!isRoleAuthorized || !isPasswordAuthorized) {
        alert("Terminal unauthorized.");
        return;
    }

    const submissionId = targetButton.getAttribute('data-id');
    const newStatus = targetButton.getAttribute('data-action');


    const submissionCard = targetButton.closest('.sub-card');


    const siblingButtons = submissionCard ? submissionCard.querySelectorAll('button') : [];
    siblingButtons.forEach(btn => btn.disabled = true);
    targetButton.textContent = "Syncing Grid...";

    console.log(`Executing Database Call: Row ${submissionId} changing to state ${newStatus}`);

    const { error } = await supabaseClient
        .from('submissions')
        .update({ status: newStatus })
        .eq('id', submissionId);

    if (error) {
        alert("Failure adjusting status: " + error.message);
        siblingButtons.forEach(btn => btn.disabled = false);
        targetButton.textContent = newStatus === 'APPROVED' ? 'Approve Patch' : 'Reject Patch';
    } else {
        console.log("Database updated successfully!");
        

        if (submissionCard) {
            submissionCard.style.transition = "all 0.3s ease";
            submissionCard.style.opacity = "0";
            submissionCard.style.transform = "scale(0.95)";
            
            setTimeout(async () => {
                submissionCard.remove();

                await fetchPendingSubmissions();
            }, 300);
        } else {
            await fetchPendingSubmissions();
        }
    }
});

// RESOLVE PENDING 
window.resolveSubmission = async (id, status) => {
    if (!isRoleAuthorized || !isPasswordAuthorized) {
        alert("Terminal unauthorized.");
        return;
    }

    const { error } = await supabaseClient
        .from('submissions')
        .update({ status: status })
        .eq('id', id);

    if (error) {
        alert("Failure adjusting status: " + error.message);
    } else {
        fetchPendingSubmissions();
    }
};