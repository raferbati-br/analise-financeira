function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function parseSymbols(raw, max = 10) {
  if (!raw) return [];
  const symbols = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
  return symbols;
}

function parseHistoryParams(url) {
  const raw = url.searchParams.get('symbol') || url.searchParams.get('symbols') || '';
  const symbol = raw.split(',').map((s) => s.trim()).filter(Boolean)[0] || '';
  const range = (url.searchParams.get('range') || '1mo').trim();
  const interval = (url.searchParams.get('interval') || '1d').trim();
  return { symbol, range, interval };
}

function parseTickerQuery(url) {
  return (url.searchParams.get('q') || '').trim().toUpperCase();
}

module.exports = {
  clamp,
  parseSymbols,
  parseHistoryParams,
  parseTickerQuery
};
