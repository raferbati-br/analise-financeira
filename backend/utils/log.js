function logRequest(req, res, startMs, path) {
  const durationMs = Date.now() - startMs;
  const method = req.method || 'UNKNOWN';
  const status = res.statusCode || 0;
  const route = path || req.url || '-';
  console.log(
    `method=${method} path=${route} status=${status} durationMs=${durationMs}`
  );
}

module.exports = { logRequest };
