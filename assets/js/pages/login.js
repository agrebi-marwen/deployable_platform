// login.js - Sign-in page
// Bootstrap: config.js + common.js must load before this file.

initApp(checkSessionAndRedirect, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

// Redirect authenticated users straight to the dashboard
async function checkSessionAndRedirect() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session && session.user) {
    window.location.href = "../dashboard/dashboard.html";
  }
}

// ELEMENTS
const form = document.getElementById('login-form');
const messageEl = document.getElementById('message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  messageEl.textContent = "Logging in...";
  messageEl.style.color = "inherit";

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  // Sign in through the serverless endpoint: rate limiting is enforced server-side.
  try {
    const response = await fetch('../api/authLogin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (!response.ok || !result.session) {
      messageEl.style.color = "#fe4e00";
      messageEl.textContent = "Error: " + (result.error || "Login failed");
      return;
    }

    // Adopt the session returned by the server.
    const { error: sessionError } = await supabaseClient.auth.setSession(result.session);
    if (sessionError) {
      messageEl.style.color = "#fe4e00";
      messageEl.textContent = "Error: " + sessionError.message;
      return;
    }

    messageEl.style.color = "#83b5d1";
    messageEl.textContent = "Success! Redirecting...";

    // Redirect the user to the main dashboard
    setTimeout(() => {
      window.location.href = "../dashboard/dashboard.html";
    }, 1000);
  } catch (err) {
    messageEl.style.color = "#fe4e00";
    messageEl.textContent = "Error: authentication service unavailable.";
  }
});