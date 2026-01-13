const { fetchAvailableTickers } = require('../services/brapiService');

async function handleTickers(url, sendJson) {
  const query = (url.searchParams.get('q') || '').trim().toUpperCase();
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
