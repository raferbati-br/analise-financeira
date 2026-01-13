const http = require('http');
const {
  fetchAvailableTickers,
  fetchHistory,
  fetchQuote
} = require('./api/brapi');

const PORT = process.env.PORT || 3000;

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }

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

    res.writeHead(404, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end('Not found');
  });
}

function startServer() {
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`Servidor em http://localhost:${PORT}`);
  });
}

module.exports = { startServer };
