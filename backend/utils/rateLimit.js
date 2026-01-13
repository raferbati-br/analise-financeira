function createRateLimiter(options) {
  const windowMs = options.windowMs;
  const max = options.max;
  const store = new Map();

  function isAllowed(key) {
    const now = Date.now();
    const entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= max) {
      return false;
    }
    entry.count += 1;
    return true;
  }

  function getResetAfterMs(key) {
    const entry = store.get(key);
    if (!entry) return windowMs;
    return Math.max(0, entry.resetAt - Date.now());
  }

  return { isAllowed, getResetAfterMs };
}

module.exports = { createRateLimiter };
