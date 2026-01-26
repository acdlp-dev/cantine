const logger = require('../config/logger');

/**
 * Middleware pour logger toutes les requêtes HTTP
 * Capture le temps de réponse et le code de statut
 */
const httpLogger = (req, res, next) => {
  const startTime = Date.now();

  // Capturer la fin de la réponse
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logger.logRequest(req, res.statusCode, responseTime);
  });

  next();
};

module.exports = httpLogger;
