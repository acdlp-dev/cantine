require('dotenv').config({ path: '/usr/src/app/.env' });

const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const logger = require('./config/logger');
const httpLogger = require('./middleware/httpLogger');

// Importer les routes
const { router: authRoutes } = require('./routes/auth'); // Import seulement le router
const databaseRoute = require('./routes/database');
const donsRoute = require('./routes/dons');
const subscriptionsRoute = require('./routes/subscriptions');
const donateursRoute = require('./routes/donateurs');
const assosRoute = require('./routes/assos');
const recusRoute = require('./routes/recus');
const emailDonateursRoute = require('./routes/emailDonateurs');
const paymentRoute = require('./routes/payment');
const paymentPaypalRoute = require('./routes/payment-paypal');
const donsBackoffice = require('./routes/backOffice');
const cantineRoute = require('./routes/cantine');
const benevolesRoute = require('./routes/benevoles');
const testDashboardRoute = require('./routes/test-dashboard');
const supportRoute = require('./routes/support');


// Servir des fichiers statiques (si besoin)
app.use(express.static(process.env.STATIC_DIR));

// Configurer CORS pour autoriser l’accès depuis le front Angular 
// + permettre l’envoi de cookies (credentials)
app.use(cors({
    origin: 'http://localhost:4200', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}));

// Middleware pour capturer le raw body (nécessaire pour la vérification de signature Stripe)
// IMPORTANT: Doit être AVANT express.json() pour les routes webhook
app.use('/api/stripe', express.raw({ type: 'application/json' }));

// Activer la prise en charge des JSON dans body (pour toutes les autres routes)
app.use(express.json());

// Activer cookie-parser pour lire/écrire des cookies
app.use(cookieParser());

// Middleware de logging HTTP (doit être avant les routes)
app.use(httpLogger);

// Monter les routes
app.use('/api', authRoutes);
app.use('/api', databaseRoute);
app.use('/api', donsRoute);
app.use('/api', subscriptionsRoute);
app.use('/api', donateursRoute);
app.use('/api', assosRoute);
app.use('/api', recusRoute);
app.use('/api', emailDonateursRoute);
app.use('/api', paymentRoute);
app.use('/api', paymentPaypalRoute);
app.use('/api', donsBackoffice);
app.use('/api', cantineRoute);
app.use('/api', benevolesRoute);
app.use('/api/test-dashboard', testDashboardRoute);
app.use('/api', supportRoute);


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
