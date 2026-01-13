const { loadEnvFile } = require('../env');

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
  corsAllowOrigin: process.env.CORS_ALLOW_ORIGIN || '*'
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
