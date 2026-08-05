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
        window.location.href = "../Dashboard/dashboard.html";
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

    
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        messageEl.style.color = "red";
        messageEl.textContent = "Error: " + error.message;
    } else {
        messageEl.style.color = "green";
        messageEl.textContent = "Success! Redirecting...";
        
        // Redirect the user to your main project dashboard
        setTimeout(() => {
            window.location.href = "../Dashboard/dashboard.html";
        }, 1000);
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
