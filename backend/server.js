const http = require('http');
const { handleQuote } = require('./routes/quote');
const { handleTickers } = require('./routes/tickers');
const { handleHistory } = require('./routes/history');
const { logRequest } = require('./utils/log');
const { createRateLimiter } = require('./utils/rateLimit');

function sendJson(res, status, payload, config) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'Access-Control-Allow-Origin': config.corsAllowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function createServer(config) {
  const rateLimiter = createRateLimiter({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax
  });

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const startMs = Date.now();
    const send = (status, payload) => sendJson(res, status, payload, config);
    const apiPrefix = '/api';
    const apiVersionPrefix = '/api/v1';
    const path = url.pathname.startsWith(apiVersionPrefix)
      ? url.pathname.slice(apiVersionPrefix.length) || '/'
      : url.pathname;
    const clientKey = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    res.on('finish', () => {
      logRequest(req, res, startMs, url.pathname);
    });

    if (!rateLimiter.isAllowed(clientKey)) {
      const retryAfterMs = rateLimiter.getResetAfterMs(clientKey);
      res.writeHead(429, {
        'Access-Control-Allow-Origin': config.corsAllowOrigin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Retry-After': Math.ceil(retryAfterMs / 1000)
      });
      res.end('Too Many Requests');
      return;
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': config.corsAllowOrigin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }

    if (path === `${apiPrefix}/quote`) {
      await handleQuote(url, send);
      return;
    }

    if (path === `${apiPrefix}/tickers`) {
      await handleTickers(url, send);
      return;
    }

    if (path === `${apiPrefix}/history`) {
      await handleHistory(url, send);
      return;
    }

    res.writeHead(404, {
      'Access-Control-Allow-Origin': config.corsAllowOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end('Not found');
  });
}

function startServer(config) {
  const server = createServer(config);
  server.listen(config.port, () => {
    console.log(`Servidor em http://localhost:${config.port}`);
  });
}

module.exports = { startServer };
