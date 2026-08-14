// api-cache.js - Request deduplication and caching
// Simple client-side cache with TTL to reduce redundant API calls

class APICache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minute default TTL
    this.store = new Map();
    this.ttl = ttl;
  }

  generateKey(endpoint, params = {}) {
    return `${endpoint}_${JSON.stringify(params)}`;
  }

  get(key) {
    const cached = this.store.get(key);
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > this.ttl) {
      this.store.delete(key);
      return null;
    }
    
    return cached.data;
  }

  set(key, data) {
    this.store.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.store.clear();
  }
}

// Global cache instance
window.apiCache = new APICache();
