const Brapi = require('brapi');

const BRAPI_API_KEY = process.env.BRAPI_API_KEY || process.env.BRAPI_TOKEN || '';
let brapiClient = null;

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

module.exports = { getBrapiClient };
