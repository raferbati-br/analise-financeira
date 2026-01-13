const { quoteRetrieve, quoteList } = require('../clients/brapiClient');
const { createCache } = require('../utils/cache');
const config = require('../config');

const quoteCache = createCache(config.quoteCacheTtlMs);
const historyCache = createCache(config.historyCacheTtlMs);
let tickersCache = { data: null, ts: 0 };

function normalizeSymbol(raw) {
  if (!raw) return '';
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return '';
  return trimmed.split('.')[0];
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
  const cached = quoteCache.get(normalized);
  if (cached) {
    return cached;
  }
  try {
    const data = await quoteRetrieve(normalized, {
      range: '1d',
      interval: '1d'
    });
    const result = data?.results?.[0];
    if (!result) {
      return { symbol: normalized, ok: false, error: 'Nao encontrado' };
    }
    return quoteCache.set(normalized, {
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
    });
  } catch (err) {
    return { symbol: normalized, ok: false, error: formatBrapiError(err) };
  }
}

async function fetchHistory(symbol, range, interval) {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) {
    return { symbol, ok: false, error: 'Ticker vazio' };
  }
  const key = `${normalized}|${range}|${interval}`;
  const cached = historyCache.get(key);
  if (cached) {
    return cached;
  }
  try {
    const data = await quoteRetrieve(normalized, {
      range,
      interval
    });
    const result = data?.results?.[0];
    const history = Array.isArray(result?.historicalDataPrice)
      ? result.historicalDataPrice
      : [];
    const logo = result?.logourl || result?.logoUrl || null;
    const name = result?.longName || result?.shortName || result?.name || null;
    return historyCache.set(key, {
      symbol: result?.symbol || normalized,
      ok: true,
      history,
      logo,
      name
    });
  } catch (err) {
    return { symbol: normalized, ok: false, error: formatBrapiError(err) };
  }
}

async function fetchAvailableTickers() {
  const now = Date.now();
  if (tickersCache.data && now - tickersCache.ts < config.tickersCacheTtlMs) {
    return tickersCache.data;
  }
  try {
    const data = await quoteList({ limit: 10000, type: 'stock' });
    const list = Array.isArray(data?.stocks) ? data.stocks : [];
    const allowedTypes = config.brapiTickerTypes.split(',')
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
