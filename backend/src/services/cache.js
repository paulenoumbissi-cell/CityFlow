// src/services/cache.js
// Simple in‑memory cache with TTL (seconds).

class SimpleCache {
  constructor() {
    this.store = new Map();
  }

  /**
   * Set a value with optional TTL (in seconds).
   * @param {string} key 
   * @param {*} value 
   * @param {number} ttlSeconds 
   */
  set(key, value, ttlSeconds = 0) {
    const expires = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expires });
  }

  /**
   * Get a value if not expired.
   * @param {string} key 
   * @returns {*|null}
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expires && Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Clear the cache (optional utility).
   */
  clear() {
    this.store.clear();
  }
}

export default new SimpleCache();
