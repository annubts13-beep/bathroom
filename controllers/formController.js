'use strict';
const crypto = require('crypto');
const { getTransporter, missingConfig, fromAddress } = require('../config/emailConfig');
const { buildOwnerEmail } = require('../services/emailTemplate');
const logger = require('../utils/logger');

function shareUrlFor(board, req) {
  const base = (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const payload = Buffer.from(JSON.stringify({ s: board.selections, v: board.variants || {}, a: !!board.accessible, st: board.style || null })).toString('base64url');
  return `${base}/?board=${payload}#summary`;
}

/** POST /api/submit-form */
async function submitForm(req, res) {
  const mark = res.locals.markSubmission || (() => {});
  const submissionId = req.body.submissionId || crypto.randomUUID();
  const data = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    phone: req.body.phone,
    zip: req.body.zip,
    city: req.body.city,
    state: req.body.state,
    bestTime: req.body.bestTime || 'No preference',
    board: req.body.board,
  };

  const missing = missingConfig();
  if (missing.length) {
    mark(false);
    logger.error('Submission failed: email is not configured', { submissionId, missing });
    return res.status(503).json({ success: false, message: 'We could not send your request right now. Please call us or try again shortly.' });
  }

  const submittedAt = new Date();
  const email = buildOwnerEmail(data, {
    submittedAt,
    shareUrl: shareUrlFor(data.board, req),
    ip: req.ip,
    userAgent: req.get('user-agent') || '',
    submissionId,
  });

  try {
    const info = await getTransporter().sendMail({
      from: fromAddress(),
      to: process.env.OWNER_EMAIL,
      replyTo: `"${data.firstName} ${data.lastName}" <${data.email}>`,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: email.attachments,
    });
    if (info && Array.isArray(info.rejected) && info.rejected.length) throw new Error(`Recipient rejected: ${info.rejected.join(', ')}`);
    mark(true);
    logger.info('Submission emailed to owner', { submissionId, messageId: info && info.messageId, customer: `${data.firstName} ${data.lastName}`, email: data.email });
    return res.status(200).json({ success: true, submissionId, message: `Thanks, ${data.firstName}! Your vision board is on its way to our design team.` });
  } catch (err) {
    mark(false);
    logger.error('Submission failed: owner email could not be sent', { submissionId, error: err.message, code: err.code });
    return res.status(502).json({ success: false, message: 'Sorry - we couldn\'t send your request. Please try again in a moment.' });
  }
}

module.exports = { submitForm, shareUrlFor };
