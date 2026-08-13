// 1. Configure & Initialize Supabase - Loaded from centralized config.js
let supabaseClient = null;

// Initialize Supabase client after config loads
async function initSupabaseClient() {
  const config = await waitForConfig();
  if (!config) {
    console.error('Failed to initialize Supabase client');
    return;
  }
  
  supabaseClient = supabase.createClient(config.url, config.anonKey);
  initSubmitPage();
}

// Initialize client
initSupabaseClient();

// DOM Elements
const challengeTitle = document.getElementById('challenge-title');
const challengeMonth = document.getElementById('challenge-month');
const challengePoints = document.getElementById('challenge-points');
const challengeInstructions = document.getElementById('challenge-instructions');
const submissionForm = document.getElementById('submission-form');
const submissionUrl = document.getElementById('submission-url');
const submissionMessage = document.getElementById('submission-message');
const submitBtn = document.getElementById('submit-btn');

let currentUser = null;
let challengeId = null;

async function initSubmitPage() {
    // Check if session exists
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session || !session.user) {
        window.location.href = "../account/login.html";
        return;
    }
    
    currentUser = session.user;

    // Grab the challenge ID from URL query parameters (e.g. submit.html?id=uuid)
    const urlParams = new URLSearchParams(window.location.search);
    challengeId = urlParams.get('id');

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
}

// Handle Form Submission
submissionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submissionMessage.textContent = "Syncing solution into portal...";
    submissionMessage.style.color = "white";

    const url = submissionUrl.value.trim();

    // 1. Regex validation for GitHub and GitLab
    // Matches: http(s)://(www.)github.com/username/repository or gitlab.com/username/repository
    const gitUrlRegex = /^https?:\/\/(www\.)?(github\.com|gitlab\.com)\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/i;

    if (!gitUrlRegex.test(url)) {
        submissionMessage.textContent = "Invalid URL. Please provide a valid GitHub or GitLab repository link.";
        submissionMessage.style.color = "#ef4444";
        submitBtn.disabled = false;
        return; // Halt execution and don't insert into database
    }

    // 2. Insert submission record into the 'submissions' table
    const { error } = await supabaseClient
        .from('submissions')
        .insert([
            {
                user_id: currentUser.id,
                challenge_id: challengeId,
                submission_url: url,
                status: 'PENDING',
                submitted_at: new Date().toISOString()
            }
        ]);

    if (error) {
        console.error("Supabase insert crash details:", error);
        submissionMessage.textContent = "Failed to secure solution: " + error.message;
        submissionMessage.style.color = "#ef4444";
        submitBtn.disabled = false;
    } else {
        submissionMessage.textContent = "Patch deployed successfully! Standing by for supervisor clearance.";
        submissionMessage.style.color = "#10b981";
        submissionUrl.value = "";
        submitBtn.textContent = "Patch Synchronized";
        
        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = "Initialize Patch";
        }, 3000);
    }
});


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