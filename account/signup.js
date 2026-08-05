// API SETTINGS - Loaded from centralized config.js
let supabaseClient = null;

// Initialize Supabase client after config loads
async function initSupabaseClient() {
  const config = await waitForConfig();
  if (!config) {
    console.error('Failed to initialize Supabase client');
    return;
  }
  
  supabaseClient = supabase.createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  
  // Check session after client is ready
  checkSessionAndRedirect();
}

// Initialize client
initSupabaseClient();

// CHECK ACTIVITY
async function checkSessionAndRedirect() {
    if (!supabaseClient) return;
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
        messageEl.style.color = "red";
        messageEl.textContent = "Error: " + strengthCheck.message;
        return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
        messageEl.style.color = "red";
        messageEl.textContent = "Passwords do not match!";
        return;
    }

    // Check rate limit
    try {
        const rateLimitResponse = await fetch('../api/rateLimit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (!rateLimitResponse.ok) {
            const rateLimitData = await rateLimitResponse.json();
            messageEl.style.color = "red";
            messageEl.textContent = "Error: " + rateLimitData.error;
            return;
        }
    } catch (err) {
        // Rate limiting service unavailable, proceed anyway
    }

    //  Check if the username is already taken 
    const { data: existingProfile, error: checkError } = await supabaseClient
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle(); 

    if (existingProfile) {
        messageEl.style.color = "red";
        messageEl.textContent = "Error: Username is already taken!";
        return; 
    }

    if (checkError) {   
        console.error("Database connection check failed:", checkError);
    }

    //  If the username is free, proceed with your original signUp logic
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                username: username 
            }
        }
    });

    if (error) {
        messageEl.style.color = "red";
        if (error.message.includes("already registered")) {
            messageEl.textContent = "Error: Email is already registered!";
        } else {
            messageEl.textContent = "Error: " + error.message;
        }
        console.error(error);
    } else {
        messageEl.style.color = "green";
        messageEl.textContent = "Success! Account created. Redirecting to login...";
        form.reset();

        // Redirect to login.html 
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1500);
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
