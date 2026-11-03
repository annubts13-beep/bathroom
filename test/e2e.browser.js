/**
 * Real-browser end-to-end test (Playwright + Chromium).
 *
 *   npm run test:e2e
 *
 * Starts the app and a local SMTP catcher, walks the whole vision board in
 * a browser, tests validation, submits the form, and verifies the owner
 * email. Also checks the failure path (SMTP down => no success message)
 * and saves screenshots for desktop / tablet / mobile to test/screenshots.
 */
'use strict';
process.env.NODE_ENV = 'test';
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');

const SHOTS = path.join(__dirname, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });
const inbox = [];

function startSmtp() {
  return new Promise((resolve) => {
    const s = new SMTPServer({
      disabledCommands: ['STARTTLS'], allowInsecureAuth: true, logger: false,
      onAuth: (a, sess, cb) => cb(null, { user: a.username }),
      onData(stream, session, cb) {
        const chunks = [];
        stream.on('data', (c) => chunks.push(c));
        stream.on('end', async () => { inbox.push(await simpleParser(Buffer.concat(chunks))); cb(); });
      },
    });
    s.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function main() {
  const smtp = await startSmtp();
  Object.assign(process.env, {
    OWNER_EMAIL: 'owner@example.com', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.server.address().port), SMTP_SECURE: 'false',
    SMTP_USER: 'dev', SMTP_PASS: 'dev', RATE_LIMIT_MAX: '100', MIN_FILL_SECONDS: '1',
  });
  const { createApp } = require('../server');
  const server = await new Promise((r) => { const s = createApp().listen(0, '127.0.0.1', () => r(s)); });
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const consoleErrors = [];

  try {
    // ---------------- Desktop full flow ----------------
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.googleapis|ERR_FAILED|502 \(Bad Gateway\)/.test(m.text())) consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push(e.message));
    await page.goto(url);
    await page.waitForSelector('.style-card');
    assert.equal(await page.locator('.style-card').count(), 4, '4 quick-start styles');
    await page.screenshot({ path: path.join(SHOTS, 'desktop-1-start.png') });

    // Start from scratch and pick an option on each step
    await page.click('#scratchBtn');
    await page.waitForSelector('#view-step:not([hidden])');
    const picks = {
      1: 'Neo-Angle Shower', 2: 'Chevron', 3: 'Calcutta Marble', 4: 'Porcelain Marble-Look', 5: 'Shaker Navy',
      6: 'Quartz Black', 7: 'Framed', 8: 'Brushed / Bronzed Gold', 9: 'Round / Pill',
    };
    for (let i = 1; i <= 9; i++) {
      assert.match(await page.textContent('#stepChip'), new RegExp(`Step ${i} of 10`, 'i'));
      if (i === 2) await page.click('.pill:has-text("Grayline")');
      if (i === 7) { await page.click('.pill:has-text("Frost")'); await page.click('.pill:has-text("Arrow")'); }
      if (i === 6) { // test "Not in my project" then change mind
        await page.click('#skipCard');
        await page.waitForFunction(() => location.hash === '#step-7');
        await page.click('#backBtn');
        await page.waitForFunction(() => location.hash === '#step-6');
      }
      if (i === 2) await page.screenshot({ path: path.join(SHOTS, 'desktop-2-step-wall-pattern.png') });
      await page.click(`.opt:has(.o-name:text-is("${picks[i]}"))`);
      await page.waitForFunction((n) => location.hash === `#step-${n}`, i + 1); // auto-advance
    }
    // Accessories: multi select, no auto-advance
    await page.click('.opt:has(.o-name:text-is("Rainfall Head"))');
    await page.click('.opt:has(.o-name:text-is("Grab Bars"))');
    assert.equal(await page.locator('.opt.selected').count(), 2);
    assert.equal(await page.textContent('#ringPct'), '100%');
    await page.screenshot({ path: path.join(SHOTS, 'desktop-3-step-accessories.png') });
    await page.click('#nextBtn');
    await page.waitForSelector('#view-summary:not([hidden])');
    assert.equal(await page.locator('.sel-list li').count(), 10);
    assert.equal(await page.locator('#boardGrid .tile').count(), 11);
    await page.screenshot({ path: path.join(SHOTS, 'desktop-4-summary.png'), fullPage: true });

    // Validation: empty submit
    await page.click('#submitBtn');
    for (const f of ['firstName', 'lastName', 'email', 'phone', 'zip']) {
      assert.ok(await page.locator(`.field:has(#${f}).invalid`).count(), `${f} flagged`);
    }
    assert.equal(inbox.length, 0);
    // Invalid values
    await page.fill('#firstName', 'Jane');
    await page.fill('#lastName', 'Smith');
    await page.fill('#email', 'jane@nowhere');
    await page.fill('#phone', '12345');
    await page.fill('#zip', '815');
    await page.click('#submitBtn');
    assert.match(await page.textContent('[data-err-for="email"]'), /valid email/);
    assert.match(await page.textContent('[data-err-for="phone"]'), /10-digit/);
    assert.match(await page.textContent('[data-err-for="zip"]'), /ZIP/);
    await page.screenshot({ path: path.join(SHOTS, 'desktop-5-validation.png'), fullPage: true });

    // Server/email failure: SMTP down -> error shown, no success
    const oldPort = process.env.SMTP_PORT;
    process.env.SMTP_PORT = '1';
    require('../config/emailConfig').resetTransporter();
    await page.fill('#email', 'jane.smith@example.com');
    await page.fill('#phone', '9705550100');
    assert.equal(await page.inputValue('#phone'), '(970) 555-0100', 'phone auto-formats');
    await page.fill('#zip', '81501');
    await page.selectOption('#bestTime', { label: 'Morning (8am - 12pm)' });
    await page.click('#submitBtn');
    await page.waitForSelector('#formError:not([hidden])');
    assert.match(await page.textContent('#formError'), /couldn't send/i);
    assert.ok(await page.isHidden('#successCard'), 'no success on email failure');
    await page.screenshot({ path: path.join(SHOTS, 'desktop-6-email-failure.png'), fullPage: true });
    process.env.SMTP_PORT = oldPort;
    require('../config/emailConfig').resetTransporter();

    // Valid submission (double click must only send once)
    await page.dblclick('#submitBtn');
    await page.waitForSelector('#successCard:not([hidden])');
    assert.match(await page.textContent('#successMsg'), /Thanks, Jane/);
    await page.screenshot({ path: path.join(SHOTS, 'desktop-7-success.png'), fullPage: true });
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(inbox.length, 1, 'exactly one owner email');
    const mail = inbox[0];
    assert.equal(mail.to.value[0].address, 'owner@example.com');
    for (const s of ['Jane Smith', 'jane.smith@example.com', '(970) 555-0100', '81501', 'Grand Junction', 'Morning (8am - 12pm)',
      'Neo-Angle Shower', 'Chevron', 'Grayline', 'Calcutta Marble', 'Porcelain Marble-Look', 'Shaker Navy', 'Quartz Black',
      'Framed', 'Frost', 'Arrow', 'Brushed / Bronzed Gold', 'Round / Pill', 'Rainfall Head, Grab Bars', 'Submission Date']) {
      assert.ok(mail.html.includes(s.replace(/'/g, '&#39;')), `email contains ${s}`);
    }
    fs.writeFileSync(path.join(SHOTS, 'owner-email.html'), mail.html);
    const ep = await ctx.newPage();
    await ep.setContent(mail.html);
    await ep.screenshot({ path: path.join(SHOTS, 'owner-email.png'), fullPage: true });

    await ctx.close();

    // ---------------- Quick-start + responsive ----------------
    for (const [name, opts] of [
      ['tablet', { viewport: { width: 820, height: 1180 } }],
      ['mobile', devices['iPhone 13']],
    ]) {
      const c = await browser.newContext(opts);
      await c.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
      const p = await c.newPage();
      p.on('pageerror', (e) => consoleErrors.push(e.message));
      await p.goto(url);
      await p.screenshot({ path: path.join(SHOTS, `${name}-1-start.png`), fullPage: true });
      await p.click('.style-card:has-text("Spa Retreat")');
      await p.waitForFunction(() => location.hash === '#step-1');
      assert.equal(await p.textContent('#ringPct'), '100%', 'style preloads all 10');
      await p.screenshot({ path: path.join(SHOTS, `${name}-2-step.png`), fullPage: true });
      // accessible toggle
      if (name === 'mobile') await p.click('#sbToggle');
      await p.click('.accessible-row');
      await p.waitForTimeout(100);
      assert.equal(await p.locator('.opt.selected .o-name').textContent(), 'Walk-In Tub');
      if (name === 'mobile') await p.screenshot({ path: path.join(SHOTS, 'mobile-3-sidebar-open.png'), fullPage: true });
      await p.evaluate(() => { location.hash = '#summary'; });
      await p.waitForSelector('#view-summary:not([hidden])');
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 1, `${name}: no horizontal scroll (${overflow}px)`);
      await p.waitForTimeout(3000); await p.screenshot({ path: path.join(SHOTS, `${name}-4-summary.png`), fullPage: true });
      await p.fill('#firstName', 'Sam'); await p.fill('#lastName', "O'Neil"); await p.fill('#email', 'sam@example.com');
      await p.fill('#phone', '970 555 0199'); await p.fill('#zip', '81501');
      await p.click('#submitBtn');
      await p.waitForSelector('#successCard:not([hidden])');
      await c.close();
    }
    assert.equal(inbox.length, 3);
    assert.ok(inbox[1].html.includes('Walk-In Tub') && inbox[1].html.includes('Spa Retreat'));
    assert.deepEqual(consoleErrors, [], 'no browser errors: ' + JSON.stringify(consoleErrors));
    console.log('✅ E2E passed — screenshots in test/screenshots');
  } finally {
    await browser.close();
    server.close();
    smtp.close();
  }
}

main().catch((e) => { console.error('❌ E2E failed:', e); process.exit(1); });
