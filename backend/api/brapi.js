const Brapi = require('brapi');

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
    const logo = result?.logourl || result?.logoUrl || null;
    return {
      symbol: result?.symbol || normalized,
      ok: true,
      history,
      logo
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

module.exports = {
  fetchQuote,
  fetchHistory,
  fetchAvailableTickers
};
