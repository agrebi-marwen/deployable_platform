// config.js - Centralized Supabase configuration
// Fetches credentials from Vercel serverless function (keeps API keys secret)
window.SUPABASE_CONFIG = null;
window.SUPABASE_CONFIG_READY = false;

async function loadSupabaseConfig() {
  try {
    // Detect environment
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const endpoint = isDev 
      ? 'http://localhost:3000/api/config' 
      : '/api/config';

    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`Config fetch failed: ${response.status}`);
    
    window.SUPABASE_CONFIG = await response.json();
    window.SUPABASE_CONFIG_READY = true;
    console.log('✓ Supabase config loaded securely');
  } catch (error) {
    console.error('✗ Failed to load Supabase config:', error);
    alert('Configuration error. Please refresh the page.');
  }
}

// Wait for config to be ready before accessing it
function waitForConfig() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (window.SUPABASE_CONFIG_READY) {
        clearInterval(checkInterval);
        resolve(window.SUPABASE_CONFIG);
      }
    }, 50);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      console.error('Timeout waiting for config');
      resolve(null);
    }, 5000);
  });
}

// Load config immediately
loadSupabaseConfig();
