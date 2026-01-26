const express = require('express');
const router = express.Router();
const logger = require('../config/logger');

// Simulate delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// GET /api/test-dashboard/fast - Requête rapide (50ms)
router.get('/fast', async (req, res) => {
  const startTime = Date.now();
  await delay(50);
  const responseTime = Date.now() - startTime;
  
  logger.info('Fast endpoint called', {
    url: '/api/test-dashboard/fast',
    method: 'GET',
    statusCode: 200,
    responseTime: responseTime,
    service: 'myamana-api'
  });
  
  res.json({ success: true, message: 'Fast response', responseTime: responseTime });
});

// GET /api/test-dashboard/slow - Requête lente (500ms)
router.get('/slow', async (req, res) => {
  const startTime = Date.now();
  await delay(500);
  const responseTime = Date.now() - startTime;
  
  logger.warn('Slow endpoint called', {
    url: '/api/test-dashboard/slow',
    method: 'GET',
    statusCode: 200,
    responseTime: responseTime,
    service: 'myamana-api'
  });
  
  res.json({ success: true, message: 'Slow response', responseTime: responseTime });
});

// GET /api/test-dashboard/error - Génère une erreur 500
router.get('/error', (req, res) => {
  const startTime = Date.now();
  const responseTime = Date.now() - startTime;
  
  logger.error('Error endpoint called', {
    url: '/api/test-dashboard/error',
    method: 'GET',
    statusCode: 500,
    responseTime: responseTime,
    service: 'myamana-api',
    error: 'Simulated internal server error'
  });
  
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// GET /api/test-dashboard/notfound - Génère une erreur 404
router.get('/notfound', (req, res) => {
  const startTime = Date.now();
  const responseTime = Date.now() - startTime;
  
  logger.warn('Not found endpoint called', {
    url: '/api/test-dashboard/notfound',
    method: 'GET',
    statusCode: 404,
    responseTime: responseTime,
    service: 'myamana-api'
  });
  
  res.status(404).json({ success: false, error: 'Resource not found' });
});

// POST /api/test-dashboard/create - Test POST
router.post('/create', async (req, res) => {
  const startTime = Date.now();
  await delay(100);
  const responseTime = Date.now() - startTime;
  
  logger.info('Create endpoint called', {
    url: '/api/test-dashboard/create',
    method: 'POST',
    statusCode: 201,
    responseTime: responseTime,
    service: 'myamana-api'
  });
  
  res.status(201).json({ success: true, message: 'Resource created', responseTime: responseTime });
});

// PUT /api/test-dashboard/update - Test PUT
router.put('/update', async (req, res) => {
  const startTime = Date.now();
  await delay(75);
  const responseTime = Date.now() - startTime;
  
  logger.info('Update endpoint called', {
    url: '/api/test-dashboard/update',
    method: 'PUT',
    statusCode: 200,
    responseTime: responseTime,
    service: 'myamana-api'
  });
  
  res.json({ success: true, message: 'Resource updated', responseTime: responseTime });
});

// DELETE /api/test-dashboard/delete - Test DELETE
router.delete('/delete', async (req, res) => {
  const startTime = Date.now();
  await delay(60);
  const responseTime = Date.now() - startTime;
  
  logger.info('Delete endpoint called', {
    url: '/api/test-dashboard/delete',
    method: 'DELETE',
    statusCode: 200,
    responseTime: responseTime,
    service: 'myamana-api'
  });
  
  res.json({ success: true, message: 'Resource deleted', responseTime: responseTime });
});

// GET /api/test-dashboard/stress - Génère 100 requêtes variées
router.get('/stress', async (req, res) => {
  const endpoints = [
    { url: '/api/test-dashboard/fast', level: 'info', status: 200, delay: 50 },
    { url: '/api/test-dashboard/slow', level: 'warn', status: 200, delay: 500 },
    { url: '/api/test-dashboard/error', level: 'error', status: 500, delay: 10 },
    { url: '/api/test-dashboard/notfound', level: 'warn', status: 404, delay: 10 },
    { url: '/api/test-dashboard/create', level: 'info', status: 201, delay: 100 },
    { url: '/api/test-dashboard/update', level: 'info', status: 200, delay: 75 },
    { url: '/api/test-dashboard/delete', level: 'info', status: 200, delay: 60 }
  ];
  
  let count = 0;
  const total = 100;
  
  // Générer 100 logs en arrière-plan
  (async () => {
    for (let i = 0; i < total; i++) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const startTime = Date.now();
      await delay(endpoint.delay + Math.random() * 50);
      const responseTime = Date.now() - startTime;
      
      const logData = {
        url: endpoint.url,
        method: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
        statusCode: endpoint.status,
        responseTime: responseTime,
        service: 'myamana-api',
        stressTest: true
      };
      
      switch(endpoint.level) {
        case 'error':
          logger.error(`Stress test - ${endpoint.url}`, logData);
          break;
        case 'warn':
          logger.warn(`Stress test - ${endpoint.url}`, logData);
          break;
        default:
          logger.info(`Stress test - ${endpoint.url}`, logData);
      }
      
      count++;
      await delay(50); // Petit délai entre chaque log
    }
  })();
  
  res.json({ 
    success: true, 
    message: `Generating ${total} logs in background...`,
    note: 'Check Grafana dashboard in 10-15 seconds'
  });
});

// GET /api/test-dashboard/info - Info sur l'API
router.get('/info', (req, res) => {
  logger.info('Test dashboard info requested', {
    url: '/api/test-dashboard/info',
    method: 'GET',
    statusCode: 200,
    responseTime: 1,
    service: 'myamana-api'
  });
  
  res.json({
    name: 'Grafana Dashboard Test API',
    version: '1.0.0',
    endpoints: {
      'GET /api/test-dashboard/fast': 'Fast response (~50ms)',
      'GET /api/test-dashboard/slow': 'Slow response (~500ms)',
      'GET /api/test-dashboard/error': 'Returns 500 error',
      'GET /api/test-dashboard/notfound': 'Returns 404 error',
      'POST /api/test-dashboard/create': 'Test POST request',
      'PUT /api/test-dashboard/update': 'Test PUT request',
      'DELETE /api/test-dashboard/delete': 'Test DELETE request',
      'GET /api/test-dashboard/stress': 'Generates 100 varied logs',
      'GET /api/test-dashboard/info': 'This info page'
    },
    grafana: 'http://localhost:3001'
  });
});

module.exports = router;
