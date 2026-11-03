/**
 * Local SMTP "catcher" for development & testing — no real email account needed.
 *
 *   npm run mail:dev            (listens on 127.0.0.1:2525)
 *
 * Point .env at it:
 *   SMTP_HOST=127.0.0.1  SMTP_PORT=2525  SMTP_SECURE=false  SMTP_USER=dev  SMTP_PASS=dev
 *
 * Every email the app sends is printed here and saved to logs/mail/ as
 * .eml (raw), .html (open in a browser to preview) and attachments.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');

const PORT = Number(process.env.DEV_SMTP_PORT || process.argv[2] || 2525);
const OUT = path.join(__dirname, '..', 'logs', 'mail');
fs.mkdirSync(OUT, { recursive: true });

const server = new SMTPServer({
  disabledCommands: ['STARTTLS'],
  allowInsecureAuth: true,
  logger: false,
  onAuth(auth, session, cb) { cb(null, { user: auth.username }); },
  onData(stream, session, cb) {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', async () => {
      const raw = Buffer.concat(chunks);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const base = path.join(OUT, stamp);
      fs.writeFileSync(`${base}.eml`, raw);
      try {
        const mail = await simpleParser(raw);
        if (mail.html) fs.writeFileSync(`${base}.html`, mail.html);
        for (const a of mail.attachments) fs.writeFileSync(`${base}-${a.filename}`, a.content);
        console.log(`\n📧  ${mail.subject}\n    to: ${mail.to && mail.to.text}\n    saved: ${base}.html`);
      } catch (e) {
        console.log('Received mail (could not parse):', e.message);
      }
      cb();
    });
  },
});

server.listen(PORT, '127.0.0.1', () => console.log(`Dev SMTP catcher listening on 127.0.0.1:${PORT} — emails saved to ${OUT}`));
