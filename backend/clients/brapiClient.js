const Brapi = require('brapi');
const config = require('../config');

let brapiClient = null;

function getBrapiClient() {
  if (!brapiClient) {
    brapiClient = new Brapi({
      apiKey: config.brapiApiKey,
      maxRetries: 0,
      timeout: config.brapiTimeoutMs
    });
  }
  return brapiClient;
}

function isRetryableError(err) {
  const code = err?.code ? String(err.code) : '';
  const message = err?.message ? String(err.message).toLowerCase() : '';
  return (
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    message.includes('timeout') ||
    message.includes('timed out')
  );
}

function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error(`Timeout after ${timeoutMs}ms`);
      err.code = 'ETIMEDOUT';
      reject(err);
    }, timeoutMs);
    promise
      .then((value) => resolve(value))
      .catch((err) => reject(err))
      .finally(() => clearTimeout(timer));
  });
}

async function runWithRetry(fn) {
  const maxAttempts = Math.max(1, config.brapiMaxRetries + 1);
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt >= maxAttempts || !isRetryableError(err)) {
        throw err;
      }
    }
  }
}

function quoteRetrieve(symbol, options) {
  const client = getBrapiClient();
  return runWithRetry(() =>
    withTimeout(client.quote.retrieve(symbol, options), config.brapiTimeoutMs)
  );
}

function quoteList(options) {
  const client = getBrapiClient();
  return runWithRetry(() =>
    withTimeout(client.quote.list(options), config.brapiTimeoutMs)
  );
}

module.exports = {
  quoteRetrieve,
  quoteList
};
