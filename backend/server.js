const http = require('http');
const { handleQuote } = require('./routes/quote');
const { handleTickers } = require('./routes/tickers');
const { handleHistory } = require('./routes/history');

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
    const send = (status, payload) => sendJson(res, status, payload);

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
      await handleQuote(url, send);
      return;
    }

    if (url.pathname === '/api/tickers') {
      await handleTickers(url, send);
      return;
    }

    if (url.pathname === '/api/history') {
      await handleHistory(url, send);
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
