// roadmap.js - Learning path detail + step completion
// Bootstrap: config.js + common.js must load before this file.

initApp(initRoadmapPage);

// DOM Elements
const navUsername = document.getElementById('nav-username');
const logoutBtn = document.getElementById('logout-btn');
const difficultyEl = document.getElementById('roadmap-difficulty');
const titleEl = document.getElementById('roadmap-title');
const descEl = document.getElementById('roadmap-description');
const headerEl = document.getElementById('roadmap-header');
const overviewEl = document.getElementById('roadmap-overview');
const progressBar = document.getElementById('roadmap-progress-bar');
const progressCaption = document.getElementById('roadmap-progress-caption');
const stepsContainer = document.getElementById('roadmap-steps');

let currentUserId = null;
let roadmapId = null;
let currentHue = 25;

async function initRoadmapPage() {
  bindLogout(logoutBtn);

  const session = await requireSession();
  if (!session) return;

  currentUserId = session.user.id;
  await loadUsername(session.user.id, navUsername);

  // Grab the roadmap ID from URL query parameters (e.g. roadmap.html?id=uuid)
  const urlParams = new URLSearchParams(window.location.search);
  roadmapId = urlParams.get('id');

  if (!roadmapId) {
    titleEl.textContent = "Invalid Path Code";
    descEl.textContent = "Please return to the Learn archive and select a path.";
    stepsContainer.innerHTML = `<div class="loading-state">No path selected.</div>`;
    return;
  }

  await loadRoadmap();
}

async function loadRoadmap() {
  const [{ data: roadmap, error: roadmapError }, { data: steps, error: stepsError }] = await Promise.all([
    supabaseClient.from('roadmaps').select('id, slug, title, description, difficulty').eq('id', roadmapId).maybeSingle(),
    supabaseClient.from('roadmap_steps').select('id, title, description, resources').eq('roadmap_id', roadmapId).order('position', { ascending: true })
  ]);

  if (roadmapError || !roadmap) {
    titleEl.textContent = "Scanning Failure";
    descEl.textContent = "Could not locate this path inside the academy databases.";
    stepsContainer.innerHTML = `<div class="loading-state">Path not found.</div>`;
    return;
  }

  currentHue = window.epochHue ? window.epochHue(roadmap.slug) : 25;
  headerEl.style.setProperty('--epoch-hue', currentHue);
  overviewEl.style.setProperty('--epoch-hue', currentHue);

  difficultyEl.textContent = roadmap.difficulty || 'Path';
  titleEl.textContent = roadmap.title;
  descEl.textContent = roadmap.description || '';

  const { data: progress, error: progressError } = await supabaseClient
    .from('roadmap_progress')
    .select('step_id')
    .eq('user_id', currentUserId);

  if (progressError) {
    console.error('Progress load failed:', progressError);
  }

  const completedSet = new Set((progress || []).map(p => p.step_id));

  renderSteps(stepsError ? [] : steps || [], completedSet);
}

function renderSteps(steps, completedSet) {
  if (!steps || steps.length === 0) {
    stepsContainer.innerHTML = `<div class="loading-state">This path has no steps deployed yet.</div>`;
    updateProgress(0, 0, completedSet);
    return;
  }

  const fragment = document.createDocumentFragment();

  steps.forEach((step, index) => {
    const isDone = completedSet.has(step.id);
    const row = document.createElement('div');
    row.classList.add('roadmap-step');
    if (isDone) row.classList.add('is-done');
    row.dataset.stepId = step.id;

    const resources = Array.isArray(step.resources) ? step.resources : [];
    const resourceHtml = resources.length
      ? `<div class="roadmap-step-resources">` +
        resources.map(r => `<a class="roadmap-resource" href="${escapeHtml(safeUrl(r.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.title || r.url)} ↗</a>`).join('') +
        `</div>`
      : '';

    row.innerHTML = `
            <div class="roadmap-step-check">
                <input type="checkbox" id="step-${escapeHtml(step.id)}" ${isDone ? 'checked' : ''} aria-label="Mark step ${index + 1} complete">
                <label class="check-box" for="step-${escapeHtml(step.id)}"></label>
            </div>
            <div class="roadmap-step-body">
                <div class="roadmap-step-head">
                    <span class="roadmap-step-num">Step ${index + 1}</span>
                    <span class="roadmap-step-title">${escapeHtml(step.title)}</span>
                </div>
                <p class="roadmap-step-desc">${escapeHtml(step.description || '')}</p>
                ${resourceHtml}
            </div>
        `;

    fragment.appendChild(row);
  });

  stepsContainer.innerHTML = "";
  stepsContainer.appendChild(fragment);

  const total = steps.length;
  const done = steps.filter(s => completedSet.has(s.id)).length;
  updateProgress(done, total, completedSet);
}

function updateProgress(done, total, completedSet) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  progressBar.innerHTML = buildSegments(pct);
  progressCaption.innerHTML = `${done}/${total} steps complete — <strong>${pct}%</strong>`;
}

// ==========================================
// 3. STEP COMPLETION TOGGLE (event delegation)
// ==========================================
stepsContainer.addEventListener('change', async (e) => {
  const checkbox = e.target;
  if (checkbox.type !== 'checkbox') return;

  const row = checkbox.closest('.roadmap-step');
  if (!row) return;

  const stepId = row.dataset.stepId;
  checkbox.disabled = true;

  const { error } = checkbox.checked
    ? await supabaseClient.from('roadmap_progress').insert({ user_id: currentUserId, step_id: stepId })
    : await supabaseClient.from('roadmap_progress').delete().eq('user_id', currentUserId).eq('step_id', stepId);

  if (error) {
    console.error('Progress update failed:', error);
    checkbox.checked = !checkbox.checked;
    checkbox.disabled = false;
    return;
  }

  row.classList.toggle('is-done', checkbox.checked);
  checkbox.disabled = false;

  // Recompute counters from the DOM
  const rows = stepsContainer.querySelectorAll('.roadmap-step');
  const total = rows.length;
  const done = stepsContainer.querySelectorAll('.roadmap-step.is-done').length;
  updateProgress(done, total, null);
});