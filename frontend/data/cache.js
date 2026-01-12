import { state } from '../state.js';

const CACHE_KEY = 'financeiro-cache-v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function loadPersistedCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.tickers) || typeof data.ts !== 'number') return null;
    if (Date.now() - data.ts > CACHE_TTL_MS) return null;
    return data;
  } catch (err) {
    return null;
  }
}

export function applyPersistedCache(cache) {
  state.tickers = cache.tickers.slice();
  state.analysisCache.clear();
  Object.entries(cache.analysis || {}).forEach(([symbol, data]) => {
    state.analysisCache.set(symbol, data);
  });
}

export function savePersistedCache() {
  try {
    const payload = {
      ts: Date.now(),
      tickers: state.tickers,
      analysis: Object.fromEntries(state.analysisCache)
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch (err) {
    // Sem acao: storage pode estar cheio ou bloqueado.
  }
}
