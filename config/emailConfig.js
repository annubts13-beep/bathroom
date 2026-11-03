'use strict';
const nodemailer = require('nodemailer');

const REQUIRED = ['OWNER_EMAIL', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];

function missingConfig() {
  return REQUIRED.filter((k) => !process.env[k] || !String(process.env[k]).trim());
}

let transporter = null;

/** Lazily create (and cache) the SMTP transporter from environment variables. */
function getTransporter() {
  if (transporter) return transporter;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false' ? { rejectUnauthorized: false } : undefined,
  });
  return transporter;
}

/** For tests / config reloads. */
function resetTransporter() {
  transporter = null;
}

function fromAddress() {
  const name = process.env.MAIL_FROM_NAME || 'Vision Board';
  const addr = process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER;
  return `"${name.replace(/"/g, '')}" <${addr}>`;
}

module.exports = { getTransporter, resetTransporter, missingConfig, fromAddress };
