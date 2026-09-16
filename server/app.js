const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { requestId } = require('./middleware/requestId');
const { requestLogger } = require('./middleware/requestLogger');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const gameRoutes = require('./routes/gameRoutes');

function createApp(options = {}) {
  const serveClient = options.serveClient !== false;
  const app = express();
  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com'],
          'img-src': ["'self'", 'data:'],
          'connect-src': ["'self'"]
        }
      }
    })
  );
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(requestId);
  app.use(requestLogger);

  app.get('/api/health', (req, res) => {
    res.json({ success: true, data: { ok: true } });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/games', gameRoutes);

  if (serveClient) {
    const clientDir = path.join(__dirname, '..', 'client');
    app.use(
      express.static(clientDir, {
        maxAge: env.isProd ? '7d' : 0
      })
    );
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(clientDir, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
