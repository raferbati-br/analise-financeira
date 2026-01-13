function createCache(ttlMs) {
  const store = new Map();

  function get(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.value;
  }

  function set(key, value) {
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  return { get, set };
}

module.exports = { createCache };
