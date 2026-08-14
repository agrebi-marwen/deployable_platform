// API CONNECTION - Loaded from centralized config.js
let supabaseClient = null;

// Initialize Supabase client after config loads
async function initSupabaseClient() {
  const config = await waitForConfig();
  if (!config) {
    return;
  }
  
  // Load admin password from secure config endpoint
  ADMIN_SECRET_KEY = config.adminPassword;
  
  supabaseClient = supabase.createClient(config.url, config.anonKey);
  
  // Verify admin role after client is ready
  verifyAdminRole();
}

// Initialize client
initSupabaseClient();

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

// SECURITY SETTINGS - Admin password loaded from environment via config API
let ADMIN_SECRET_KEY = null;
let isRoleAuthorized = false;
let isPasswordAuthorized = false;

const overlay = document.getElementById('security-overlay');
const adminPanel = document.getElementById('admin-panel-content');
const authError = document.getElementById('auth-error');
const passInput = document.getElementById('admin-pass-input');

// Add event listener only if element exists
if (passInput) {
  passInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') window.checkAdminPassword();
  });
}

// DATABASE ROLE VERIFICATION 
async function verifyAdminRole() {
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (sessionError || !session || !session.user) {
        alert("Unauthorized terminal. Please login.");
        window.location.href = "../account/login.html";
        return;
    }

    const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (profileError || !profile || profile.role !== 'admin') {
        alert("ACCESS DENIED: Administrative credentials required.");
        window.location.href = "../dashboard/dashboard.html";
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
        loadRoadmaps();
    } else {
        authError.textContent = "CRITICAL: Access Denied. Invalid terminal code.";
        passInput.value = "";
        passInput.focus();
    }
};

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
        creationMessage.style.color = "#fe4e00";
        creationMessage.textContent = "Failed: " + error.message;
    } else {
        creationMessage.style.color = "#83b5d1";
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

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h3 style="color: var(--text-strong); margin: 0; font-family: 'VT323', monospace; font-size: 1.25rem;">${escapeHtml(challengeTitle)}</h3>
                    <p style="color: #6e8296; font-size: 0.8rem; margin: 4px 0 0 0;">Traveler: <strong>${escapeHtml(username)}</strong> • ${escapeHtml(date)}</p>
                </div>
                <span style="font-size: 0.8rem; color: #eec643; background: rgba(238, 198, 67, 0.1); padding: 3px 8px; border: 2px solid #eec643; font-family: 'VT323', monospace; text-transform: uppercase;">PENDING</span>
            </div>
            
            <div style="background: rgba(0,0,0,0.2); padding: 10px; border: 2px solid rgba(131,181,209,0.15);">
                <span style="color: #6e8296; font-size: 0.8rem; display:block; margin-bottom:2px;">Repository Payload URL:</span>
                <a href="${escapeHtml(safeUrl(sub.submission_url))}" target="_blank" rel="noopener noreferrer" style="color: #83b5d1; font-size: 0.9rem; word-break: break-all; text-decoration: none;">
                    ${escapeHtml(sub.submission_url)} ↗
                </a>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 5px;">
                <button class="action-btn btn-approve" data-id="${escapeHtml(sub.id)}" data-action="APPROVED">Approve Patch</button>
                <button class="action-btn btn-reject" data-id="${escapeHtml(sub.id)}" data-action="REJECTED">Reject Patch</button>
            </div>
        `;
        submissionsList.appendChild(card);
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

// ==========================================
// ROADMAP MANAGEMENT (paths + steps)
// ==========================================
const roadmapForm = document.getElementById('roadmap-form');
const roadmapMessage = document.getElementById('roadmap-message');
const roadmapAdminList = document.getElementById('roadmap-admin-list');

roadmapForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!isRoleAuthorized || !isPasswordAuthorized) {
        alert("Security breach detected. Terminal locked.");
        window.location.reload();
        return;
    }

    const title = document.getElementById('roadmap-title').value.trim();
    const slug = document.getElementById('roadmap-slug').value.trim().toLowerCase().replace(/\s+/g, '-');
    const description = document.getElementById('roadmap-description').value.trim();
    const difficulty = document.getElementById('roadmap-difficulty').value;

    roadmapMessage.textContent = "Deploying learning path...";
    roadmapMessage.style.color = "var(--text-strong)";

    const { error } = await supabaseClient
        .from('roadmaps')
        .insert([{ title, slug, description, difficulty }]);

    if (error) {
        roadmapMessage.style.color = "#fe4e00";
        roadmapMessage.textContent = "Failed: " + error.message;
    } else {
        roadmapMessage.style.color = "#83b5d1";
        roadmapMessage.textContent = `Success! Path "${title}" deployed.`;
        roadmapForm.reset();
        loadRoadmaps();
    }
});

async function loadRoadmaps() {
    if (!isRoleAuthorized || !isPasswordAuthorized) return;

    const { data: roadmaps, error } = await supabaseClient
        .from('roadmaps')
        .select('id, slug, title, description, difficulty')
        .order('created_at', { ascending: true });

    if (error) {
        roadmapAdminList.innerHTML = `<p class="empty-state">Failed to load paths: ${escapeHtml(error.message)}</p>`;
        return;
    }

    if (!roadmaps || roadmaps.length === 0) {
        roadmapAdminList.innerHTML = `<p class="empty-state">No learning paths deployed yet.</p>`;
        return;
    }

    roadmapAdminList.innerHTML = "";
    roadmaps.forEach(roadmap => {
        roadmapAdminList.appendChild(renderRoadmapCard(roadmap));
    });
}

function renderRoadmapCard(roadmap) {
    const card = document.createElement('div');
    card.classList.add('roadmap-admin-card');
    card.dataset.roadmapId = roadmap.id;

    card.innerHTML = `
        <div class="roadmap-admin-head">
            <div>
                <h3>${escapeHtml(roadmap.title)}</h3>
                <div class="roadmap-admin-meta">/${escapeHtml(roadmap.slug)} • ${escapeHtml(roadmap.difficulty || 'Path')}</div>
            </div>
            <div class="roadmap-admin-actions">
                <button class="roadmap-admin-btn" data-action="edit">Edit</button>
                <button class="roadmap-admin-btn" data-action="steps">Manage Steps</button>
                <button class="roadmap-admin-btn danger" data-action="delete">Delete</button>
            </div>
        </div>
        <div class="roadmap-admin-steps" data-role="steps" style="display: none;">
            <p class="empty-state">Loading steps...</p>
        </div>
    `;

    card.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        if (!confirm(`Delete path "${roadmap.title}" and ALL its steps?`)) return;
        const { error } = await supabaseClient.from('roadmaps').delete().eq('id', roadmap.id);
        if (error) {
            alert("Delete failed: " + error.message);
        } else {
            loadRoadmaps();
        }
    });

    card.querySelector('[data-action="edit"]').addEventListener('click', () => {
        toggleRoadmapEdit(card, roadmap);
    });

    card.querySelector('[data-action="steps"]').addEventListener('click', () => {
        const stepsBox = card.querySelector('[data-role="steps"]');
        const isHidden = stepsBox.style.display === 'none';
        stepsBox.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) loadRoadmapSteps(card, roadmap);
    });

    return card;
}

function toggleRoadmapEdit(card, roadmap) {
    const existing = card.querySelector('[data-role="edit"]');
    if (existing) {
        existing.remove();
        return;
    }

    const form = document.createElement('form');
    form.dataset.role = 'edit';
    form.classList.add('roadmap-edit-form');

    form.innerHTML = `
        <div class="form-group">
            <label>Path Title</label>
            <input type="text" value="${escapeHtml(roadmap.title)}" required>
        </div>
        <div class="form-group">
            <label>Slug</label>
            <input type="text" value="${escapeHtml(roadmap.slug)}" required>
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea required>${escapeHtml(roadmap.description || '')}</textarea>
        </div>
        <div class="form-group">
            <label>Difficulty</label>
            <select>
                <option value="Beginner" ${roadmap.difficulty === 'Beginner' ? 'selected' : ''}>Beginner</option>
                <option value="Intermediate" ${roadmap.difficulty === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
                <option value="Advanced" ${roadmap.difficulty === 'Advanced' ? 'selected' : ''}>Advanced</option>
            </select>
        </div>
        <div class="roadmap-admin-actions">
            <button type="submit" class="roadmap-admin-btn">Save Path</button>
            <button type="button" class="roadmap-admin-btn" data-action="cancel-edit">Cancel</button>
        </div>
    `;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = form.querySelector('input').value.trim();
        const slug = form.querySelectorAll('input')[1].value.trim().toLowerCase().replace(/\s+/g, '-');
        const description = form.querySelector('textarea').value.trim();
        const difficulty = form.querySelector('select').value;

        const { error } = await supabaseClient
            .from('roadmaps')
            .update({ title, slug, description, difficulty })
            .eq('id', roadmap.id);

        if (error) {
            alert("Update failed: " + error.message);
        } else {
            loadRoadmaps();
        }
    });

    form.querySelector('[data-action="cancel-edit"]').addEventListener('click', () => form.remove());

    card.querySelector('.roadmap-admin-head').after(form);
}

async function loadRoadmapSteps(card, roadmap) {
    const stepsBox = card.querySelector('[data-role="steps"]');
    if (!isRoleAuthorized || !isPasswordAuthorized) return;

    const { data: steps, error } = await supabaseClient
        .from('roadmap_steps')
        .select('id, title, description, resources, position')
        .eq('roadmap_id', roadmap.id)
        .order('position', { ascending: true });

    if (error) {
        stepsBox.innerHTML = `<p class="empty-state">Failed to load steps: ${escapeHtml(error.message)}</p>`;
        return;
    }

    if (!steps || steps.length === 0) {
        stepsBox.innerHTML = `<p class="empty-state">No steps yet. Add the first one below.</p>`;
    } else {
        stepsBox.innerHTML = "";
        steps.forEach((step, index) => {
            stepsBox.appendChild(renderRoadmapStep(card, roadmap, step, index, steps.length));
        });
    }

    // Add-step form at the bottom
    const stepForm = document.createElement('form');
    stepForm.classList.add('roadmap-step-form');
    stepForm.innerHTML = `
        <div class="form-group">
            <label>Step Title</label>
            <input type="text" placeholder="e.g., Time Complexity & Big-O" required>
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea placeholder="What should the traveler learn here?" required></textarea>
        </div>
        <div class="form-group">
            <label>Resources (one per line: Title | URL)</label>
            <textarea placeholder="Big-O Cheat Sheet | https://www.bigocheatsheet.com/"></textarea>
        </div>
        <p class="hint">Resources are optional. Format each line as "Title | URL".</p>
        <button type="submit" class="roadmap-admin-btn">+ Add Step</button>
    `;

    stepForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputs = stepForm.querySelectorAll('input, textarea');
        const title = inputs[0].value.trim();
        const description = inputs[1].value.trim();
        const resourcesRaw = inputs[2].value.trim();

        const resources = resourcesRaw
            ? resourcesRaw.split('\n').map(line => {
                const sep = line.indexOf('|');
                if (sep === -1) return null;
                return { title: line.slice(0, sep).trim(), url: line.slice(sep + 1).trim() };
            }).filter(r => r && r.url)
            : [];

        const position = steps ? steps.length : 0;

        const { error } = await supabaseClient
            .from('roadmap_steps')
            .insert([{ roadmap_id: roadmap.id, position, title, description, resources }]);

        if (error) {
            alert("Failed to add step: " + error.message);
        } else {
            loadRoadmapSteps(card, roadmap);
        }
    });

    stepsBox.appendChild(stepForm);
}

function renderRoadmapStep(card, roadmap, step, index, total) {
    const row = document.createElement('div');
    row.classList.add('roadmap-admin-step');
    row.dataset.stepId = step.id;

    row.innerHTML = `
        <span class="roadmap-admin-step-pos">#${index + 1}</span>
        <span class="roadmap-admin-step-title">${escapeHtml(step.title)}</span>
        <div class="roadmap-admin-actions">
            <button class="roadmap-admin-btn" data-action="up" ${index === 0 ? 'disabled' : ''}>↑</button>
            <button class="roadmap-admin-btn" data-action="down" ${index === total - 1 ? 'disabled' : ''}>↓</button>
            <button class="roadmap-admin-btn" data-action="edit-step">Edit</button>
            <button class="roadmap-admin-btn danger" data-action="delete-step">Del</button>
        </div>
    `;

    row.querySelector('[data-action="up"]').addEventListener('click', async () => {
        await swapStepPositions(step, -1, roadmap.id);
    });

    row.querySelector('[data-action="down"]').addEventListener('click', async () => {
        await swapStepPositions(step, 1, roadmap.id);
    });

    row.querySelector('[data-action="delete-step"]').addEventListener('click', async () => {
        if (!confirm(`Delete step "${step.title}"?`)) return;
        const { error } = await supabaseClient.from('roadmap_steps').delete().eq('id', step.id);
        if (error) {
            alert("Delete failed: " + error.message);
        } else {
            loadRoadmapSteps(card, roadmap);
        }
    });

    row.querySelector('[data-action="edit-step"]').addEventListener('click', () => {
        toggleStepEdit(card, roadmap, row, step);
    });

    return row;
}

// Swap two steps' positions (move up/down), then reload
async function swapStepPositions(step, direction, roadmapId) {
    const { data: steps } = await supabaseClient
        .from('roadmap_steps')
        .select('id, position')
        .eq('roadmap_id', roadmapId)
        .order('position', { ascending: true });

    const idx = steps.findIndex(s => s.id === step.id);
    const target = steps[idx + direction];
    if (!target) return;

    const { error } = await supabaseClient
        .from('roadmap_steps')
        .upsert([
            { id: step.id, position: target.position },
            { id: target.id, position: step.position }
        ]);

    if (error) {
        alert("Reorder failed: " + error.message);
    } else {
        loadRoadmaps();
    }
}

function toggleStepEdit(card, roadmap, row, step) {
    const existing = row.querySelector('[data-role="edit-step"]');
    if (existing) {
        existing.remove();
        return;
    }

    const form = document.createElement('form');
    form.dataset.role = 'edit-step';
    form.classList.add('roadmap-edit-form');

    const resourcesText = (Array.isArray(step.resources) ? step.resources : [])
        .map(r => `${r.title} | ${r.url}`).join('\n');

    form.innerHTML = `
        <div class="form-group">
            <label>Step Title</label>
            <input type="text" value="${escapeHtml(step.title)}" required>
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea required>${escapeHtml(step.description || '')}</textarea>
        </div>
        <div class="form-group">
            <label>Resources (one per line: Title | URL)</label>
            <textarea>${escapeHtml(resourcesText)}</textarea>
        </div>
        <div class="roadmap-admin-actions">
            <button type="submit" class="roadmap-admin-btn">Save Step</button>
            <button type="button" class="roadmap-admin-btn" data-action="cancel-step-edit">Cancel</button>
        </div>
    `;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputs = form.querySelectorAll('input, textarea');
        const title = inputs[0].value.trim();
        const description = inputs[1].value.trim();
        const resourcesRaw = inputs[2].value.trim();

        const resources = resourcesRaw
            ? resourcesRaw.split('\n').map(line => {
                const sep = line.indexOf('|');
                if (sep === -1) return null;
                return { title: line.slice(0, sep).trim(), url: line.slice(sep + 1).trim() };
            }).filter(r => r && r.url)
            : [];

        const { error } = await supabaseClient
            .from('roadmap_steps')
            .update({ title, description, resources })
            .eq('id', step.id);

        if (error) {
            alert("Update failed: " + error.message);
        } else {
            loadRoadmapSteps(card, roadmap);
        }
    });

    form.querySelector('[data-action="cancel-step-edit"]').addEventListener('click', () => form.remove());

    row.appendChild(form);
}

