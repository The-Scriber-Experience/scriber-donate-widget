/**
 * The Scriber Experience - Universal OBS Donate Widget Entry Point
 */
const { startServer, server, PLATFORMS, DONATION_TARGETS } = require('./server');

if (require.main === module) {
  startServer();
}

module.exports = { startServer, server };
