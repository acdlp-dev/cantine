console.log('🚀 Starting Cantine Backend Server...');

require('dotenv').config({ path: '/usr/src/app/.env' });

console.log('✅ Environment variables loaded');

const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");

console.log('⏳ Loading logger...');
const logger = require('./config/logger');
console.log('✅ Logger loaded');

const httpLogger = require('./middleware/httpLogger');
console.log('✅ HTTP Logger loaded');

// Importer les routes
console.log('⏳ Loading routes...');
console.log('  - Loading auth...');
const { router: authRoutes } = require('./routes/auth'); // Import seulement le router
console.log('  - Loading database...');
const databaseRoute = require('./routes/database');
console.log('  - Loading assos...');
const assosRoute = require('./routes/assos');
console.log('  - Loading backOffice...');
const donsBackoffice = require('./routes/backOffice');
console.log('  - Loading cantine...');
const cantineRoute = require('./routes/cantine');
console.log('✅ Routes loaded');


// Servir des fichiers statiques (si besoin)
app.use(express.static(process.env.STATIC_DIR));

// Configurer CORS pour autoriser l’accès depuis le front Angular 
// + permettre l’envoi de cookies (credentials)
app.use(cors({
    origin: 'http://localhost:4200', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}));

// Activer la prise en charge des JSON dans body
app.use(express.json());

// Activer cookie-parser pour lire/écrire des cookies
app.use(cookieParser());

// Middleware de logging HTTP (doit être avant les routes)
app.use(httpLogger);

// Monter les routes
app.use('/api', authRoutes);
app.use('/api', databaseRoute);
app.use('/api', assosRoute);
app.use('/api', donsBackoffice);
app.use('/api', cantineRoute);



// Health check endpoint (pour Docker healthcheck)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Exemple de route de test
app.get('/api/test', (req, res) => {
    logger.info('Test endpoint called');
    res.status(200).json({ message: "ok" });
});

// Démarrer le serveur
app.listen(4242, () => {
    logger.info('Node server listening on port 4242', {
        environment: process.env.NODE_ENV || 'development',
        logLevel: process.env.LOG_LEVEL || 'info'
    });
});
