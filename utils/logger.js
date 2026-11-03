'use strict';
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'submissions.log');

function write(level, message, meta) {
  const entry = { time: new Date().toISOString(), level, message, ...(meta || {}) };
  const line = JSON.stringify(entry);
  (level === 'error' ? console.error : console.log)(line);
  if (process.env.NODE_ENV === 'test') return;
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (_) {
    /* file logging is best-effort */
  }
}

module.exports = {
  info: (m, meta) => write('info', m, meta),
  warn: (m, meta) => write('warn', m, meta),
  error: (m, meta) => write('error', m, meta),
};
