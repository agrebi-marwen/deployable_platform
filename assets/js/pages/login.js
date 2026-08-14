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

  // Check rate limit
  try {
    const rateLimitResponse = await fetch('../api/rateLimit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!rateLimitResponse.ok) {
      const rateLimitData = await rateLimitResponse.json();
      messageEl.style.color = "#fe4e00";
      messageEl.textContent = "Error: " + rateLimitData.error;
      return;
    }
  } catch (err) {
    // Rate limiting service unavailable, proceed anyway
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    messageEl.style.color = "#fe4e00";
    messageEl.textContent = "Error: " + error.message;
  } else {
    messageEl.style.color = "#83b5d1";
    messageEl.textContent = "Success! Redirecting...";

    // Redirect the user to the main dashboard
    setTimeout(() => {
      window.location.href = "../dashboard/dashboard.html";
    }, 1000);
  }
});