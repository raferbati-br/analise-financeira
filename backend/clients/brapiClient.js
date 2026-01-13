const Brapi = require('brapi');
const config = require('../config');
let brapiClient = null;

function getBrapiClient() {
  if (!brapiClient) {
    brapiClient = new Brapi({
      apiKey: config.brapiApiKey,
      maxRetries: config.brapiMaxRetries,
      timeout: config.brapiTimeoutMs
    });
  }
  return brapiClient;
}

module.exports = { getBrapiClient };
