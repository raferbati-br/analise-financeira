const { fetchAvailableTickers } = require('../services/brapiService');
const { parseTickerQuery } = require('../utils/validate');

async function handleTickers(url, sendJson) {
  const query = parseTickerQuery(url);
  try {
    const tickers = await fetchAvailableTickers();
    const filtered = query
      ? tickers.filter((item) => item.includes(query))
      : tickers;
    sendJson(200, { count: filtered.length, results: filtered });
  } catch (err) {
    sendJson(500, { error: 'Falha ao carregar lista', detail: String(err) });
  }
}

module.exports = { handleTickers };
