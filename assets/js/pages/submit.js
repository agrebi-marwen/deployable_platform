// submit.js - Submit a solution to a challenge
// Bootstrap: config.js + common.js must load before this file.

initApp(initSubmitPage);

// DOM Elements
const challengeTitle = document.getElementById('challenge-title');
const challengeMonth = document.getElementById('challenge-month');
const challengePoints = document.getElementById('challenge-points');
const challengeInstructions = document.getElementById('challenge-instructions');
const submissionForm = document.getElementById('submission-form');
const submissionUrl = document.getElementById('submission-url');
const submissionMessage = document.getElementById('submission-message');
const submitBtn = document.getElementById('submit-btn');

let currentUserId = null;
let challengeId = null;

async function initSubmitPage() {
  const session = await requireSession();
  if (!session) return;

  currentUserId = session.user.id;

  // Grab the challenge ID from URL query parameters (e.g. submit.html?id=uuid)
  challengeId = new URLSearchParams(window.location.search).get('id');

  if (!challengeId) {
    challengeTitle.textContent = "Invalid Anomaly Code";
    challengeInstructions.textContent = "Please return to the dashboard and select an anomaly from the radar list.";
    submitBtn.disabled = true;
    return;
  }

  await loadChallengeDetails();
}

async function loadChallengeDetails() {
  const { data: challenge, error } = await supabaseClient
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single();

  if (error || !challenge) {
    challengeTitle.textContent = "Scanning Failure";
    challengeInstructions.textContent = "Could not locate this specific paradox anomaly inside the timeline databases.";
    console.error("Fetch challenge error:", error);
    return;
  }

  // Populate the HTML
  challengeTitle.textContent = challenge.title;
  challengeMonth.textContent = challenge.month_year || "Active Paradox";
  challengePoints.textContent = `Reward: ${challenge.points_worth} EP`;
  challengeInstructions.textContent = challenge.instructions;

  // Tint the challenge header with this month's epoch hue
  const detailsCard = document.querySelector('.challenge-details-card');
  if (detailsCard && window.applyEpochColor && window.epochHue) {
    window.applyEpochColor(detailsCard, window.epochHue(challenge.month_year));
  }
}

// Handle Form Submission
submissionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submissionMessage.textContent = "Syncing solution into portal...";
  submissionMessage.style.color = "var(--text-strong)";

  const url = submissionUrl.value.trim();

  // Regex validation for GitHub/GitLab repository links
  const gitUrlRegex = /^https?:\/\/(www\.)?(github\.com|gitlab\.com)\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/i;

  if (!gitUrlRegex.test(url)) {
    submissionMessage.textContent = "Invalid URL. Please provide a valid GitHub or GitLab repository link.";
    submissionMessage.style.color = "#fe4e00";
    submitBtn.disabled = false;
    return;
  }

  const { error } = await supabaseClient
    .from('submissions')
    .insert([
      {
        user_id: currentUserId,
        challenge_id: challengeId,
        submission_url: url,
        status: 'PENDING',
        submitted_at: new Date().toISOString()
      }
    ]);

  if (error) {
    console.error("Supabase insert crash details:", error);
    submissionMessage.textContent = "Failed to secure solution: " + error.message;
    submissionMessage.style.color = "#fe4e00";
    submitBtn.disabled = false;
  } else {
    submissionMessage.textContent = "Patch deployed successfully! Standing by for supervisor clearance.";
    submissionMessage.style.color = "#83b5d1";
    submissionUrl.value = "";
    submitBtn.textContent = "Patch Synchronized";

    // Sparkle burst from the submit button
    if (window.burstParticles) {
      const rect = submitBtn.getBoundingClientRect();
      const hue = window.epochHue ? window.epochHue(challengeMonth.textContent) : undefined;
      window.burstParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, hue);
    }

    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = "Initialize Patch";
    }, 3000);
  }
});