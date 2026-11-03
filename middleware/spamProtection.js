'use strict';
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/** Per-IP rate limit for the submission endpoint. */
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: () => Number(process.env.RATE_LIMIT_MAX) || 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit hit', { ip: req.ip });
    res.status(429).json({ success: false, message: 'Too many submissions. Please wait a few minutes and try again.' });
  },
});

/**
 * Honeypot + time-trap:
 *  - `website` is a hidden field humans never fill in.
 *  - `formStartedAt` (ms epoch) must be at least MIN_FILL_SECONDS in the past.
 * Bots get a fake 200 so they don't learn they were blocked.
 */
function honeypot(req, res, next) {
  const b = req.body || {};
  const minSeconds = Number(process.env.MIN_FILL_SECONDS ?? 3);
  const started = Number(b.formStartedAt);
  const elapsed = (Date.now() - started) / 1000;
  const trapped = (b.website && String(b.website).trim() !== '') || !Number.isFinite(started) || elapsed < minSeconds || elapsed > 60 * 60 * 24;
  if (trapped) {
    logger.warn('Spam submission blocked', { ip: req.ip, reason: b.website ? 'honeypot' : 'timing', elapsed });
    return res.status(200).json({ success: true, message: 'Thanks! Your request was received.' });
  }
  return next();
}

/**
 * Duplicate-submission guard: the browser sends a unique submissionId;
 * the same id is accepted only once (kept for 30 minutes). A request that is
 * still in flight with the same id is rejected with 409.
 */
const seen = new Map(); // id -> { status: 'pending'|'done', at }
const TTL = 30 * 60 * 1000;
function sweep() {
  const now = Date.now();
  for (const [k, v] of seen) if (now - v.at > TTL) seen.delete(k);
}
function dedupe(req, res, next) {
  sweep();
  const id = req.body && req.body.submissionId;
  if (!id) return next();
  const prev = seen.get(id);
  if (prev && prev.status === 'done') {
    return res.status(409).json({ success: false, duplicate: true, message: 'This request was already submitted. We\'ll be in touch soon!' });
  }
  if (prev && prev.status === 'pending') {
    return res.status(409).json({ success: false, duplicate: true, message: 'Your request is already being processed.' });
  }
  seen.set(id, { status: 'pending', at: Date.now() });
  res.locals.markSubmission = (ok) => {
    if (ok) seen.set(id, { status: 'done', at: Date.now() });
    else seen.delete(id); // allow a retry after a failure
  };
  return next();
}

module.exports = { submitLimiter, honeypot, dedupe, _seen: seen };
