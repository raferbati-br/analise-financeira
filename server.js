const http = require('http');
const fs = require('fs');
const path = require('path');
const Brapi = require('brapi');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const ENV_PATH = path.join(__dirname, '.env');

function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) {
    return;
  }
  const content = fs.readFileSync(ENV_PATH, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    const idx = trimmed.indexOf('=');
    if (idx === -1) {
      return;
    }
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

loadEnvFile();

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

const BRAPI_API_KEY = process.env.BRAPI_API_KEY || process.env.BRAPI_TOKEN || '';
const BRAPI_TICKER_TYPES = process.env.BRAPI_TICKER_TYPES || 'stock';
const TICKERS_CACHE_TTL = 1000 * 60 * 60;
let tickersCache = { data: null, ts: 0 };
let brapiClient = null;

function normalizeSymbol(raw) {
  if (!raw) return '';
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return '';
  return trimmed.split('.')[0];
}

function getBrapiClient() {
  if (!brapiClient) {
    brapiClient = new Brapi({
      apiKey: BRAPI_API_KEY,
      maxRetries: 2,
      timeout: 15000
    });
  }
  return brapiClient;
}

function formatBrapiError(err) {
  if (!err) return 'Erro desconhecido';
  const status = err.status || err.statusCode;
  const name = err.name || '';
  const authHint =
    status === 401 || name === 'AuthenticationError' ? ' (adicione BRAPI_API_KEY)' : '';
  if (status) return `HTTP ${status}${authHint}`;
  if (err.message) return `${err.message}${authHint}`;
  return `Erro inesperado${authHint}`;
}

async function fetchQuote(symbol) {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) {
    return { symbol, ok: false, error: 'Ticker vazio' };
  }
  try {
    const client = getBrapiClient();
    const data = await client.quote.retrieve(normalized, {
      range: '1d',
      interval: '1d'
    });
    const result = data?.results?.[0];
    if (!result) {
      return { symbol: normalized, ok: false, error: 'Nao encontrado' };
    }
    return {
      symbol: result.symbol || normalized,
      ok: true,
      timestamp: result.regularMarketTime
        ? new Date(result.regularMarketTime).getTime()
        : null,
      open: result.regularMarketOpen,
      high: result.regularMarketDayHigh,
      low: result.regularMarketDayLow,
      close: result.regularMarketPrice,
      volume: result.regularMarketVolume
    };
  } catch (err) {
    return { symbol: normalized, ok: false, error: formatBrapiError(err) };
  }
}

async function fetchHistory(symbol, range, interval) {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) {
    return { symbol, ok: false, error: 'Ticker vazio' };
  }
  try {
    const client = getBrapiClient();
    const data = await client.quote.retrieve(normalized, {
      range,
      interval
    });
    const result = data?.results?.[0];
    const history = Array.isArray(result?.historicalDataPrice)
      ? result.historicalDataPrice
      : [];
    return {
      symbol: result?.symbol || normalized,
      ok: true,
      history
    };
  } catch (err) {
    return { symbol: normalized, ok: false, error: formatBrapiError(err) };
  }
}

async function fetchAvailableTickers() {
  const now = Date.now();
  if (tickersCache.data && now - tickersCache.ts < TICKERS_CACHE_TTL) {
    return tickersCache.data;
  }
  try {
    const client = getBrapiClient();
    const data = await client.quote.list({ limit: 10000, type: 'stock' });
    const list = Array.isArray(data?.stocks) ? data.stocks : [];
    const allowedTypes = BRAPI_TICKER_TYPES.split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    const tickers = list
      .filter((item) => {
        if (typeof item === 'string') return true;
        const type = String(item?.type || '').toLowerCase();
        if (!type || allowedTypes.length === 0) return true;
        return allowedTypes.includes(type);
      })
      .map((item) => {
        if (typeof item === 'string') return item;
        return item?.stock || item?.symbol || '';
      })
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
    const unique = Array.from(new Set(tickers)).sort();
    tickersCache = { data: unique, ts: now };
    return unique;
  } catch (err) {
    throw new Error(formatBrapiError(err));
  }
}

const server = http.createServer(async (req, res) => {
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

server.listen(PORT, () => {
  console.log(`Servidor em http://localhost:${PORT}`);
});
