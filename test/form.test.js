'use strict';
/**
 * End-to-end API tests: a real Express server + a real local SMTP server
 * (smtp-server) that captures the owner notification email.
 */
process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');

const inbox = [];
let rejectAuth = false;
let smtp;
let server;
let base;

function startSmtp() {
  return new Promise((resolve) => {
    smtp = new SMTPServer({
      disabledCommands: ['STARTTLS'],
      allowInsecureAuth: true,
      logger: false,
      onAuth(auth, session, cb) {
        if (rejectAuth) return cb(new Error('Invalid credentials'));
        if (auth.username === 'smtp-user' && auth.password === 'smtp-pass') return cb(null, { user: auth.username });
        return cb(new Error('Invalid credentials'));
      },
      onData(stream, session, cb) {
        const chunks = [];
        stream.on('data', (c) => chunks.push(c));
        stream.on('end', () => {
          inbox.push({ to: session.envelope.rcptTo.map((r) => r.address), from: session.envelope.mailFrom.address, raw: Buffer.concat(chunks).toString('utf8') });
          cb();
        });
      },
    });
    smtp.listen(0, '127.0.0.1', () => resolve(smtp.server.address().port));
  });
}

const fullBoard = () => ({
  selections: {
    showerTub: 'neo-angle-shower', wallPattern: 'chevron', wallColor: 'calcutta-marble', flooring: 'porcelain-marble',
    vanity: 'shaker-navy', countertop: 'quartz-black', showerDoor: 'framed', finish: 'brushed-gold',
    mirror: 'round-pill', accessories: ['rainfall-head', 'grab-bars'],
  },
  variants: { wallPattern: { etch: 'grayline' }, showerDoor: { glass: 'frost', vgroove: 'arrow' } },
  accessible: false,
  style: 'spa-retreat',
});
let idCounter = 0;
const validBody = (over = {}) => ({
  firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com', phone: '970-555-0100',
  zip: '81501', city: 'Grand Junction', state: 'co', bestTime: 'Evening (4pm - 7pm)',
  website: '', formStartedAt: Date.now() - 10000, submissionId: `test-submission-${++idCounter}-abcdef`,
  board: fullBoard(), ...over,
});
const post = (body) => fetch(`${base}/api/submit-form`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  .then(async (r) => ({ status: r.status, body: await r.json() }));


test.before(async () => {
  const port = await startSmtp();
  Object.assign(process.env, {
    OWNER_EMAIL: 'owner@example.com', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(port), SMTP_SECURE: 'false',
    SMTP_USER: 'smtp-user', SMTP_PASS: 'smtp-pass', MAIL_FROM_ADDRESS: 'noreply@example.com',
    RATE_LIMIT_MAX: '1000', MIN_FILL_SECONDS: '3', PUBLIC_BASE_URL: 'http://localhost:3000',
  });
  const { createApp } = require('../server');
  await new Promise((resolve) => { server = createApp().listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => { server.close(); smtp.close(); });

test('serves the form page and shared catalog', async () => {
  const html = await (await fetch(base + '/')).text();
  assert.match(html, /See Your New Bathroom Come to Life/);
  assert.match(html, /Pick a Style to Start/);
  const cat = await fetch(base + '/js/catalog.js');
  assert.equal(cat.status, 200);
  assert.doesNotMatch(html + (await cat.text()), /owner@example\.com|smtp-pass/, 'no secrets in frontend');
});

test('valid submission emails the owner with every field and selection', async () => {
  inbox.length = 0;
  const res = await post(validBody());
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.success, true);
  assert.equal(inbox.length, 1);
  const mail = inbox[0];
  assert.deepEqual(mail.to, ['owner@example.com']);
  const parsed = await simpleParser(mail.raw);
  assert.equal(parsed.subject, 'New Form Submission – Website Inquiry: Jane Smith (Bathroom Vision Board)');
  assert.equal(parsed.replyTo.value[0].address, 'jane.smith@example.com');
  assert.equal(parsed.attachments.length, 1);
  const json = JSON.parse(parsed.attachments[0].content.toString());
  assert.equal(json.contact.phone, '(970) 555-0100');
  assert.equal(json.selections.length, 10);
  assert.ok(parsed.text.includes('Neo-Angle Shower'));
  const body = parsed.html + parsed.attachments[0].filename;
  for (const s of [
    'Jane Smith', 'jane.smith@example.com', '(970) 555-0100', 'Grand Junction', 'CO', '81501', 'Evening (4pm - 7pm)',
    'Neo-Angle Shower', 'Chevron', 'Panel Etch Design: Grayline', 'Calcutta Marble', 'Porcelain Marble-Look',
    'Shaker Navy', 'Quartz Black', 'Framed', 'Glass Type: Frost', 'V-Groove Pattern: Arrow', 'Brushed / Bronzed Gold',
    'Round / Pill', 'Rainfall Head, Grab Bars', 'Spa Retreat', 'Make it Accessible', 'Submission Date', 'vision-board-smith-',
  ]) assert.ok(body.includes(s), `email should include "${s}"`);
});

test('"Not in my project" choices are reported as such', async () => {
  inbox.length = 0;
  const b = fullBoard(); b.selections.countertop = 'skip'; b.selections.accessories = 'skip';
  const res = await post(validBody({ board: b }));
  assert.equal(res.status, 200);
  const body = (await simpleParser(inbox[0].raw)).text;
  assert.match(body, /Countertop: Not in my project/);
  assert.match(body, /8 of 10 categories selected/);
});

test('missing required fields return 422 with a message per field and no email', async () => {
  inbox.length = 0;
  const res = await post(validBody({ firstName: '', lastName: '', email: '', phone: '', zip: '', city: '', state: '' }));
  assert.equal(res.status, 422);
  for (const k of ['firstName', 'lastName', 'email', 'phone', 'zip', 'city', 'state']) assert.ok(res.body.errors[k], `error for ${k}`);
  assert.equal(inbox.length, 0);
});

test('invalid email, phone, zip, state are rejected', async () => {
  const res = await post(validBody({ email: 'jane@', phone: '123', zip: '8150', state: 'ZZ', bestTime: 'Midnight' }));
  assert.equal(res.status, 422);
  assert.deepEqual(Object.keys(res.body.errors).sort(), ['bestTime', 'email', 'phone', 'state', 'zip']);
});

test('incomplete or tampered vision boards are rejected', async () => {
  const b1 = fullBoard(); delete b1.selections.vanity;
  assert.equal((await post(validBody({ board: b1 }))).status, 422);
  const b2 = fullBoard(); b2.selections.vanity = 'gold-plated-throne';
  assert.equal((await post(validBody({ board: b2 }))).status, 422);
  const b3 = fullBoard(); b3.variants.showerDoor.glass = 'bulletproof';
  assert.equal((await post(validBody({ board: b3 }))).status, 422);
  const b4 = fullBoard(); b4.selections.accessories = [];
  assert.equal((await post(validBody({ board: b4 }))).status, 422);
});

test('malformed JSON returns 400', async () => {
  const r = await fetch(`${base}/api/submit-form`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(r.status, 400);
});

test('honeypot and too-fast submissions are silently dropped', async () => {
  inbox.length = 0;
  assert.equal((await post(validBody({ website: 'http://spam.example' }))).status, 200);
  assert.equal((await post(validBody({ formStartedAt: Date.now() }))).status, 200);
  assert.equal(inbox.length, 0, 'no email for spam');
});

test('duplicate submissions with the same id are rejected', async () => {
  inbox.length = 0;
  const body = validBody();
  const [a, b] = await Promise.all([post(body), post(body)]);
  const statuses = [a.status, b.status].sort();
  assert.deepEqual(statuses, [200, 409]);
  const c = await post(body);
  assert.equal(c.status, 409);
  assert.equal(inbox.length, 1);
});

test('SMTP failure returns 502 (no success) and the same id can be retried', async () => {
  inbox.length = 0;
  rejectAuth = true;
  require('../config/emailConfig').resetTransporter();
  const body = validBody();
  const res = await post(body);
  assert.equal(res.status, 502);
  assert.equal(res.body.success, false);
  rejectAuth = false;
  require('../config/emailConfig').resetTransporter();
  const retry = await post(body);
  assert.equal(retry.status, 200);
  assert.equal(inbox.length, 1);
});

test('SMTP server unreachable returns 502', async () => {
  const old = process.env.SMTP_PORT;
  process.env.SMTP_PORT = '1';
  require('../config/emailConfig').resetTransporter();
  const res = await post(validBody());
  assert.equal(res.status, 502);
  process.env.SMTP_PORT = old;
  require('../config/emailConfig').resetTransporter();
});

test('missing email configuration returns 503', async () => {
  const old = process.env.OWNER_EMAIL;
  delete process.env.OWNER_EMAIL;
  const res = await post(validBody());
  assert.equal(res.status, 503);
  assert.equal(res.body.success, false);
  process.env.OWNER_EMAIL = old;
});

test('rate limiting returns 429', async () => {
  process.env.RATE_LIMIT_MAX = '1';
  const res = await post(validBody());
  assert.equal(res.status, 429);
  process.env.RATE_LIMIT_MAX = '1000';
});
