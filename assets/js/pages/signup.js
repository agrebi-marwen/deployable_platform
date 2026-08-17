// signup.js - Account creation page
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
const form = document.getElementById('signup-form');
const messageEl = document.getElementById('message');

// Password strength validator
function validatePasswordStrength(password) {
  // Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!minLength) return { valid: false, message: 'Password must be at least 8 characters long.' };
  if (!hasUppercase) return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  if (!hasLowercase) return { valid: false, message: 'Password must contain at least one lowercase letter.' };
  if (!hasNumber) return { valid: false, message: 'Password must contain at least one number.' };

  return { valid: true, message: 'Password is strong.' };
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  messageEl.textContent = "Creating account...";
  messageEl.style.color = "inherit";

  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  // Password strength validation
  const strengthCheck = validatePasswordStrength(password);
  if (!strengthCheck.valid) {
    messageEl.style.color = "#fe4e00";
    messageEl.textContent = "Error: " + strengthCheck.message;
    return;
  }

  // Validate passwords match
  if (password !== confirmPassword) {
    messageEl.style.color = "#fe4e00";
    messageEl.textContent = "Passwords do not match!";
    return;
  }

  // Check if the username is already taken
  const { data: existingProfile, error: checkError } = await supabaseClient
    .from('profiles')
    .select('username')
    .eq('username', username)
    .maybeSingle();

  if (existingProfile) {
    messageEl.style.color = "#fe4e00";
    messageEl.textContent = "Error: Username is already taken!";
    return;
  }

  if (checkError) {
    console.error("Database connection check failed:", checkError);
  }

  // Create the account through the serverless endpoint:
  // rate limiting is enforced server-side (fail-closed).
  try {
    const response = await fetch('../api/authSignup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username })
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      messageEl.style.color = "#fe4e00";
      if ((result.error || '').toLowerCase().includes("already registered")) {
        messageEl.textContent = "Error: Email is already registered!";
      } else {
        messageEl.textContent = "Error: " + (result.error || "Signup failed");
      }
      return;
    }

    messageEl.style.color = "#83b5d1";
    if (result.session) {
      messageEl.textContent = "Success! Account created. Redirecting to login...";
    } else {
      messageEl.textContent = "Success! Account created. Check your email to confirm before logging in.";
    }
    form.reset();

    // Redirect to login.html
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);
  } catch (err) {
    messageEl.style.color = "#fe4e00";
    messageEl.textContent = "Error: registration service unavailable.";
  }
});