'use strict';
require('dotenv').config({ quiet: true });

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const formRoutes = require('./routes/formRoutes');
const { missingConfig } = require('./config/emailConfig');
const logger = require('./utils/logger');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : process.env.TRUST_PROXY);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
      },
    },
  }));
  app.use(express.json({ limit: '50kb' }));

  // The shared catalog is used by both browser and server.
  app.get('/js/catalog.js', (req, res) => res.sendFile(path.join(__dirname, 'shared', 'catalog.js')));
  app.use(express.static(path.join(__dirname, 'public'), { maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));

  app.get('/api/health', (req, res) => res.json({ ok: true, emailConfigured: missingConfig().length === 0 }));
  app.use('/api', formRoutes);
  app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'Not found.' }));

  // Malformed JSON and other errors
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ success: false, message: 'Invalid request body.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ success: false, message: 'Request is too large.' });
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  });

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const missing = missingConfig();
  if (missing.length) logger.warn('Email is not fully configured - submissions will fail until these .env values are set', { missing });
  createApp().listen(port, () => logger.info(`Vision Board server running at http://localhost:${port}`));
}

module.exports = { createApp };
