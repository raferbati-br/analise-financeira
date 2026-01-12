const http = require('http');
const fs = require('fs');
const path = require('path');
const {
  fetchAvailableTickers,
  fetchHistory,
  fetchQuote
} = require('./api/brapi');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'frontend');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function safeJoin(base, target) {
  const normalized = path.normalize(target).replace(/^([/\\])+/, '');
  return path.join(base, normalized);
}

function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/api/quote') {
      const raw = url.searchParams.get('symbols') || '';
      const symbols = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10);

      if (symbols.length === 0) {
        sendJson(res, 400, { error: 'Informe symbols, ex: PETR4.SA,VALE3.SA' });
        return;
      }

      try {
        const results = await Promise.all(symbols.map(fetchQuote));
        sendJson(res, 200, { symbols, results });
      } catch (err) {
        sendJson(res, 500, { error: 'Falha ao consultar preco', detail: String(err) });
      }
      return;
    }

    if (url.pathname === '/api/tickers') {
      const query = (url.searchParams.get('q') || '').trim().toUpperCase();
      try {
        const tickers = await fetchAvailableTickers();
        const filtered = query
          ? tickers.filter((item) => item.includes(query))
          : tickers;
        sendJson(res, 200, { count: filtered.length, results: filtered });
      } catch (err) {
        sendJson(res, 500, { error: 'Falha ao carregar lista', detail: String(err) });
      }
      return;
    }

    if (url.pathname === '/api/history') {
      const raw = url.searchParams.get('symbol') || url.searchParams.get('symbols') || '';
      const symbol = raw.split(',').map((s) => s.trim()).filter(Boolean)[0];
      const range = (url.searchParams.get('range') || '1mo').trim();
      const interval = (url.searchParams.get('interval') || '1d').trim();

      if (!symbol) {
        sendJson(res, 400, { error: 'Informe symbol, ex: PETR4' });
        return;
      }

      try {
        const result = await fetchHistory(symbol, range, interval);
        sendJson(res, 200, { symbol, range, interval, result });
      } catch (err) {
        sendJson(res, 500, { error: 'Falha ao carregar historico', detail: String(err) });
      }
      return;
    }

    const reqPath = url.pathname === '/' ? '/index.html' : url.pathname;
    const filePath = safeJoin(PUBLIC_DIR, reqPath);

    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

function startServer() {
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`Servidor em http://localhost:${PORT}`);
  });
}

module.exports = { startServer };
