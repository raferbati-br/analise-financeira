const { loadEnvFile } = require('./env');

loadEnvFile();

function parseIntOrDefault(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

const config = {
  port: parseIntOrDefault(process.env.PORT, 3000),
  brapiApiKey: process.env.BRAPI_API_KEY || process.env.BRAPI_TOKEN || '',
  brapiTickerTypes: process.env.BRAPI_TICKER_TYPES || 'stock',
  brapiTimeoutMs: parseIntOrDefault(process.env.BRAPI_TIMEOUT_MS, 15000),
  brapiMaxRetries: parseIntOrDefault(process.env.BRAPI_MAX_RETRIES, 2),
  tickersCacheTtlMs: parseIntOrDefault(process.env.TICKERS_CACHE_TTL_MS, 1000 * 60 * 60),
  quoteCacheTtlMs: parseIntOrDefault(process.env.QUOTE_CACHE_TTL_MS, 60 * 1000),
  historyCacheTtlMs: parseIntOrDefault(process.env.HISTORY_CACHE_TTL_MS, 5 * 60 * 1000),
  corsAllowOrigin: process.env.CORS_ALLOW_ORIGIN || '*',
  rateLimitWindowMs: parseIntOrDefault(process.env.RATE_LIMIT_WINDOW_MS, 60 * 1000),
  rateLimitMax: parseIntOrDefault(process.env.RATE_LIMIT_MAX, 120)
};

function validateConfig(values) {
  const errors = [];
  if (!values.brapiApiKey) {
    errors.push('BRAPI_API_KEY (ou BRAPI_TOKEN)');
  }
  if (!Number.isInteger(values.port) || values.port <= 0) {
    errors.push('PORT');
  }
  if (errors.length) {
    throw new Error(`Configuracao invalida: faltando ${errors.join(', ')}`);
  }
}

validateConfig(config);

module.exports = config;
