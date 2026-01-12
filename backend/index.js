const { loadEnvFile } = require('./env');

loadEnvFile();

const { startServer } = require('./server');

startServer();
