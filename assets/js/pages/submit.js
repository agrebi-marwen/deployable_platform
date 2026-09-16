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

const repoBlock = document.getElementById('repo-submit-block');
const cpBlock   = document.getElementById('cp-submit-block');
const cpLangSlct = document.getElementById('cp-language');
const cpLimitsEl = document.getElementById('cp-limits');
const cpSubmitBtn = document.getElementById('cp-submit-btn');
const cpVerdictEl = document.getElementById('cp-verdict');

let currentUserId = null;
let challengeId = null;
let isCpChallenge = false;
let cpEditorView = null;
let cmLoadAttempt = 0;

// Capture the real reason if the CodeMirror loader fails, so the editor error
// message includes the underlying network/CSP error instead of hiding it.
window.__cmLoadError = null;
window.addEventListener('error', (e) => {
  if (e.target && e.target.tagName === 'SCRIPT' && String(e.target.src || '').includes('codemirror-loader.js')) {
    window.__cmLoadError = e.message || String(e.error && e.error.message) || 'module failed to load';
  }
});
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && e.reason.message) window.__cmLoadError = e.reason.message;
});

const LANG_TEMPLATES = {
  c: `#include <stdio.h>\n\nint main(void) {\n    return 0;\n}\n`,
  'c++': `#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n`,
  python: `def main():\n    pass\n\nif __name__ == "__main__":\n    main()\n`,
  java: `public class Main {\n    public static void main(String[] args) {\n    }\n}\n`
};

async function initSubmitPage() {
  const session = await requireSession();
  if (!session) return;

  currentUserId = session.user.id;

  challengeId = new URLSearchParams(window.location.search).get('id');
  if (!challengeId) {
    challengeTitle.textContent = "Challenge Not Found";
    challengeInstructions.textContent = "Please return to the dashboard and select a challenge.";
    submitBtn.disabled = true;
    cpSubmitBtn && (cpSubmitBtn.disabled = true);
    return;
  }

  await loadChallengeDetails();
  await loadCpConfig();
}

async function loadChallengeDetails() {
  const { data: challenge, error } = await supabaseClient
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single();

  if (error || !challenge) {
    challengeTitle.textContent = "Loading Failed";
    challengeInstructions.textContent = "Could not load this challenge. It may have been removed.";
    console.error("Fetch challenge error:", error);
    submitBtn.disabled = true;
    cpSubmitBtn && (cpSubmitBtn.disabled = true);
    return;
  }

  challengeTitle.textContent = challenge.title;
  challengeMonth.textContent = challenge.month_year || "Active Challenge";
  challengePoints.textContent = `Reward: ${challenge.points_worth} pts`;
  challengeInstructions.textContent = challenge.instructions;

  const detailsCard = document.querySelector('.challenge-details-card');
  if (detailsCard && window.applyEpochColor && window.epochHue) {
    window.applyEpochColor(detailsCard, window.epochHue(challenge.month_year));
  }
}

// Fetch CP judge config. If present → show CP block; else stay on repo block.
async function loadCpConfig() {
  const { data, error } = await supabaseClient
    .from('cp_problems')
    .select('languages, time_limit_ms, memory_limit_mb')
    .eq('challenge_id', challengeId)
    .maybeSingle();

  if (error || !data) return; // Not a CP challenge — use repo form.

  isCpChallenge = true;
  repoBlock.style.display = 'none';
  cpBlock.style.display = 'block';
  submissionForm.style.display = 'none';

  const allowed = Array.isArray(data.languages) && data.languages.length
    ? data.languages
    : ['c++', 'c', 'python', 'java'];

  cpLangSlct.innerHTML = '';
  allowed.forEach(lang => {
    const opt = document.createElement('option');
    opt.value = lang;
    opt.textContent = lang === 'c++' ? 'C++' : lang === 'c' ? 'C' : lang === 'python' ? 'Python 3' : 'Java';
    cpLangSlct.appendChild(opt);
  });

  const tl = data.time_limit_ms || 1000;
  const ml = data.memory_limit_mb || 256;
  cpLimitsEl.textContent = `Time: ${tl} ms  ·  Memory: ${ml} MB  ·  ${allowed.length} language${allowed.length > 1 ? 's' : ''}`;

  waitForEditor('cp-editor', LANG_TEMPLATES[cpLangSlct.value] || LANG_TEMPLATES['c++'], cpLangSlct.value);

  cpLangSlct.addEventListener('change', () => {
    if (!cpEditorView) return;
    window.cmSetCode(cpEditorView, LANG_TEMPLATES[cpLangSlct.value] || '');
    window.cmSetLanguage(cpEditorView, cpLangSlct.value);
  });

  cpSubmitBtn.addEventListener('click', handleCpSubmit);
}

// Ensure the CodeMirror loader is running, then mount the editor.
// The loader pulls ESM bundles from jsDelivr's "+esm" endpoint, which has had
// intermittent production outages; if the static module in the page never
// initialises, retry with a cache-busted import so a stale/corrupt CDN bundle
// gets bypassed, and report the actual error if it still fails.
async function waitForEditor(containerId, source, lang) {
  const el = document.getElementById(containerId);
  if (!el) return;

  for (;;) {
    if (typeof window.makeCodeEditor === 'function') {
      cpEditorView = window.makeCodeEditor(el);
      if (source) window.cmSetCode(cpEditorView, source);
      if (lang)  window.cmSetLanguage(cpEditorView, lang);
      return;
    }

    if (cmLoadAttempt++ >= 2) {
      const detail = window.__cmLoadError
        ? ` (${window.__cmLoadError})`
        : ' (see the browser console for details)';
      el.innerHTML = `<p style="color:#fe4e00;">Code editor failed to load${detail}. Please refresh the page.</p>`;
      return;
    }

    const bust = cmLoadAttempt === 1 ? '' : `?t=${Date.now()}`;
    await import(`../assets/js/codemirror-loader.js${bust}`)
      .catch((e) => {
        window.__cmLoadError = e && e.message ? e.message : String(e);
      });
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

// Handle Form Submission (repo)
submissionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submissionMessage.textContent = "Submitting solution...";
  submissionMessage.style.color = "var(--text-strong)";

  const url = submissionUrl.value.trim();
  const gitUrlRegex = /^https?:\/\/(www\.)?(github\.com|gitlab\.com)\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/i;

  if (!gitUrlRegex.test(url)) {
    submissionMessage.textContent = "Invalid URL. Please provide a valid GitHub or GitLab repository link.";
    submissionMessage.style.color = "#fe4e00";
    submitBtn.disabled = false;
    return;
  }

  const { error } = await supabaseClient
    .from('submissions')
    .insert([{
      user_id: currentUserId,
      challenge_id: challengeId,
      submission_url: url,
      status: 'PENDING',
      submitted_at: new Date().toISOString()
    }]);

  if (error) {
    submissionMessage.textContent = "Failed to submit solution: " + error.message;
    submissionMessage.style.color = "#fe4e00";
    submitBtn.disabled = false;
  } else {
    submissionMessage.textContent = "Solution submitted! Waiting for admin approval.";
    submissionMessage.style.color = "#83b5d1";
    submissionUrl.value = "";
    submitBtn.textContent = "Solution Submitted";

    if (window.burstParticles) {
      const rect = submitBtn.getBoundingClientRect();
      const hue = window.epochHue ? window.epochHue(challengeMonth.textContent) : undefined;
      window.burstParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, hue);
    }

    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Solution";
    }, 3000);
  }
});

// Handle CP submission (code editor → judge endpoint)
async function handleCpSubmit() {
  if (!cpEditorView || !currentUserId || !challengeId) return;

  cpSubmitBtn.disabled = true;
  cpSubmitBtn.textContent = "Judging...";
  cpVerdictEl.style.display = 'none';
  submissionMessage.textContent = "Running your code against test cases...";
  submissionMessage.style.color = "var(--text-strong)";

  const code = window.cmGetCode(cpEditorView);
  const language = cpLangSlct.value;

  if (!code.trim()) {
    submissionMessage.textContent = "Your solution is empty. Write some code first.";
    submissionMessage.style.color = "#fe4e00";
    cpSubmitBtn.disabled = false;
    cpSubmitBtn.textContent = "Run & Submit";
    return;
  }

  const session = await supabaseClient.auth.getSession();
  const token = session && session.data && session.data.session && session.data.session.access_token;

  try {
    const res = await fetch('../api/cpSubmit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (token || '')
      },
      body: JSON.stringify({ challengeId, code, language })
    });

    const data = await res.json();

    if (!res.ok) {
      submissionMessage.textContent = data.error || "Judge request failed.";
      submissionMessage.style.color = "#fe4e00";
      cpSubmitBtn.disabled = false;
      cpSubmitBtn.textContent = "Run & Submit";
      return;
    }

    cpVerdictEl.style.display = 'block';

    if (data.verdict === 'AC') {
      cpVerdictEl.innerHTML = `
        <span class="cp-verdict-badge verdict-ac">AC</span>
        <span class="cp-verdict-detail">All sub-tests passed (${data.executionTimeMs || 0} ms).</span>`;
      submissionMessage.textContent = "Accepted! Submission queued for approval.";
      submissionMessage.style.color = "#83b5d1";
    } else {
      const detailText = data.verdict === 'WA'
        ? `Wrong answer — output does not match the expected output.`
        : data.verdict === 'TLE'
        ? `Time limit exceeded.`
        : data.verdict === 'CE'
        ? `Compilation error.`
        : data.verdict === 'RE'
        ? `Runtime error during execution.`
        : `Verdict: ${data.verdict}`;
      cpVerdictEl.innerHTML = `
        <span class="cp-verdict-badge verdict-${data.verdict.toLowerCase()}">${data.verdict}</span>
        <span class="cp-verdict-detail">${escapeHtml(detailText)}</span>`;
      submissionMessage.textContent = "Not accepted. Try again!";
      submissionMessage.style.color = "#fe4e00";
    }

    if (data.verdict === 'AC' && window.burstParticles) {
      const rect = cpSubmitBtn.getBoundingClientRect();
      const hue = window.epochHue ? window.epochHue(challengeMonth.textContent) : undefined;
      window.burstParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, hue);
    }
  } catch (err) {
    submissionMessage.textContent = "Judge request failed: " + err.message;
    submissionMessage.style.color = "#fe4e00";
  }

  cpSubmitBtn.disabled = false;
  cpSubmitBtn.textContent = "Run & Submit";
}