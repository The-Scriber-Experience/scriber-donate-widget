/**
 * The Scriber Experience - Universal OBS Donate Widget Entry Point
 */
const { startServer, server, PLATFORMS, DONATION_TARGETS, TSE_LINKS } = require('./server');

if (require.main === module) {
  startServer();
}

module.exports = { startServer, server, PLATFORMS, DONATION_TARGETS, TSE_LINKS };
