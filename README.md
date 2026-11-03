# Bathroom Vision Board: Lead Form with Owner Email Notifications

This is a Node.js and Express rebuild of the **SuperFast Kitchen & Bath "Your Vision Board"** bathroom designer shown in the reference video. The customer picks a style or starts from scratch, goes through 10 design categories and reviews their vision board. They then fill in the **"See Your New Bathroom Come to Life"** form. Each valid submission is checked on the server and emailed to the website owner with Nodemailer. The email holds every answer.

---

## What's included (taken from the video)

| Screen | Elements |
|---|---|
| **Sidebar** (on every screen) | Logo, "SuperFast Kitchen & Bath / Your Vision Board", % ring, progress bar, "N of 10 choices", "Board complete!", **"Your vision board is ready!" + View My Board** card, **Make it Accessible** toggle (walk-in tub, grab bars, non-slip & more), 10 thumbnails of your picks, **Categories** list |
| **Quick Start: Pick a Style to Start** | Spa Retreat (Most Popular), Timeless Classic, Modern Luxe (Designer's Pick), Accessible Comfort, plus **Start from Scratch** |
| **Step 1: Shower / Tub Style** | Walk-In Shower, Neo-Angle Shower, Tub-to-Shower Conversion, Shower-to-Tub Conversion, Replacement Bathtub, Tub-Shower Combo, Walk-In Tub |
| **Step 2: Wall Pattern** | Panel Etch Design: Othello / Grayline · 3×6″ Subway, 4×12″ Subway, 6″ Hexagonal, 12×12″ Marazzi, 24×6″ Fairfield, Chevron, 12×24″ Roman Block, 6×24″ Milano, Smooth Seamless |
| **Step 3: Wall Color** | White, Biscuit, Almond, Calcutta Marble, Pompeii Marble, Bianco Travertine, Classic Concrete, Galena, Tuscany |
| **Step 4: Flooring** | Porcelain Marble-Look, Porcelain Wood-Look Plank, Porcelain Concrete/Stone-Look, LVP Gray Driftwood, Hexagon Mosaic, Slate-Look Matte |
| **Step 5: Vanity** | Shaker White, Shaker Navy, Flat-Panel White, Flat-Panel Wood-Tone, Espresso Traditional, Floating Wall-Mounted |
| **Step 6: Countertop** | Quartz White / Marble-Look, Quartz Gray, Quartz Black, Granite Speckled Neutral, Cultured Marble, Butcher Block |
| **Step 7: Shower Door** | Glass Type: Clear / Rain / Frost / Corrugated · V-Groove Pattern: None / Arrow / Hopscotch / Roman Block / Vertical Block · Frameless, Semi-Frameless, Sliding / Bypass, Barn-Door, Pivot / Hinged, Framed |
| **Step 8: Faucet & Hardware Finish** | Chrome, Brushed Nickel, Matte Black, Oil-Rubbed Bronze, Brushed / Bronzed Gold (with a note about coordinating finishes) |
| **Step 9: Mirror** | Framed Rectangle, Frameless Rectangle, Round / Pill, Arched |
| **Step 10: Accessories** (choose several) | Corner Shelf, Soap Dish, Built-in / Folding Shower Seat, Grab Bars, Shower Rod, Hand-Held Wand, Recessed Niche, Rainfall Head |
| **Every step** | "STEP N OF 10" and "✓ Selected" chips, Popular / Designer's Pick badges, selected card turns blue with a check mark, moves to the next step on its own after a single choice, **Not in my project** skip card, Back / Next, step dots, green top progress bar |
| **Summary** | Blue "Board Complete! / Your Vision Board is Ready!" banner, **Copy Share Link**, printable-style vision board grid, **Your Selections** list with Edit links |
| **Lead form** | First Name, Last Name, Email, Phone, Zip Code, City (filled in as Grand Junction), State (filled in as CO), **Best Time to Call** dropdown, **Show Me My Bathroom Render** button |

The video has no file-upload field, so the app doesn't include one. The owner email comes with a JSON attachment that holds the full submission.

> **Images:** the build environment couldn't download the site's photos, so every option uses a locally generated SVG illustration in `public/images/options/`. Wall patterns and stone/wood textures match the video closely. To use real photos, drop in a file with the same name, or change the `image` path for that option in `shared/catalog.js`. Run `npm run images` to rebuild the SVGs.

---

## Project structure

```
├── public/                  # Frontend (static)
│   ├── index.html
│   ├── css/style.css
│   ├── js/script.js         # Builder UI, routing, validation, submission
│   └── images/              # logo, favicon, options/*.svg, styles/*.svg
├── shared/catalog.js        # Steps & options. Used by the browser AND the server
├── routes/formRoutes.js     # POST /api/submit-form
├── controllers/formController.js
├── config/emailConfig.js    # Nodemailer SMTP transport from .env
├── middleware/
│   ├── validation.js        # express-validator rules + board validation
│   └── spamProtection.js    # rate limit, honeypot, time-trap, duplicate guard
├── services/emailTemplate.js# HTML + text owner email, JSON attachment
├── utils/logger.js          # JSON logs → console + logs/submissions.log
├── scripts/
│   ├── generate-images.js   # builds the SVG artwork
│   └── dev-mail-server.js   # local SMTP catcher for testing
├── test/
│   ├── form.test.js         # API + email tests (node:test, real SMTP server)
│   └── e2e.browser.js       # full browser test (Playwright) + screenshots
├── server.js
├── .env.example
└── package.json
```

---

## Installation

Requirements: **Node.js 18+** (tested on Node 22).

```bash
npm install
```

```bash
cp .env.example .env
```

Edit `.env` (see below), then:

```bash
npm start
```

Open http://localhost:3000. Use `npm run dev` to restart automatically when files change.

## Configuring the owner's email

All secrets live in `.env`, which git ignores. None of them reach the browser.

```ini
OWNER_EMAIL=owner@example.com        # who receives every submission
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false                    # true for port 465
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
MAIL_FROM_NAME=SuperFast Vision Board
MAIL_FROM_ADDRESS=your-email@example.com   # usually the same as SMTP_USER
PUBLIC_BASE_URL=https://your-site.com      # used for the "open this board" link in the email
TIMEZONE=America/Denver                    # optional; time zone for the submission time
```

Common providers:

| Provider | Host | Port | Notes |
|---|---|---|---|
| Gmail / Google Workspace | `smtp.gmail.com` | 587 | Use an **App Password** (2-Step Verification is required), not your normal password |
| Microsoft 365 / Outlook | `smtp.office365.com` | 587 | SMTP AUTH must be turned on for the mailbox |
| SendGrid | `smtp.sendgrid.net` | 587 | User `apikey`, password = your API key |
| Mailgun | `smtp.mailgun.org` | 587 | Domain SMTP credentials |

Check the setup at `GET /api/health`. It returns `{"emailConfigured": true}` once every required variable is set.

## Testing

**1. Automated API + email tests.** These start a real local SMTP server and check the real emails:

```bash
npm test
```

There are 13 tests. They cover:
- a valid submission and the owner email: every contact field, all 10 choices, sub-options, style, accessibility flag, date/time and the JSON attachment
- skipped categories
- missing fields, and invalid email, phone, ZIP, state and best-time values
- vision boards that are incomplete or tampered with
- malformed JSON
- honeypot and too-fast spam
- duplicate submissions, including two sent at once
- SMTP authentication failure (502, and the same submission can be retried)
- SMTP server unreachable (502)
- missing email config (503)
- rate limiting (429)

**2. Full browser test.** Playwright + Chromium, run on desktop, tablet and mobile:

```bash
npm run test:e2e
```

It goes through all 10 steps, tests "Not in my project", sub-options, choosing several accessories, validation messages and phone auto-formatting. It also checks that **no success message appears when sending the email fails**, that a double-click sends only one email, the quick-start styles, the Make it Accessible toggle, and that no screen size scrolls sideways. Screenshots and the rendered owner email go to `test/screenshots/`. Playwright is not a listed dependency, so if your machine doesn't have it, run `npm i -D playwright && npx playwright install chromium` first.

**3. Manual test without a real email account:**

```bash
npm run mail:dev
```

Set `SMTP_HOST=127.0.0.1`, `SMTP_PORT=2525`, `SMTP_USER=dev` and `SMTP_PASS=dev` in `.env`, then run `npm start`. Submit the form, and each email is printed and saved as `logs/mail/*.html` so you can open it in a browser.

## API

`POST /api/submit-form` (JSON)

```json
{
  "firstName": "Jane", "lastName": "Smith", "email": "jane@example.com",
  "phone": "(970) 555-0100", "zip": "81501", "city": "Grand Junction", "state": "CO",
  "bestTime": "No preference",
  "board": {
    "selections": { "showerTub": "walk-in-shower", "wallPattern": "chevron", "...": "...", "accessories": ["grab-bars"] },
    "variants": { "wallPattern": { "etch": "othello" }, "showerDoor": { "glass": "clear", "vgroove": "none" } },
    "accessible": false, "style": "spa-retreat"
  },
  "submissionId": "uuid", "formStartedAt": 1730000000000, "website": ""
}
```

A category can be `"skip"` ("Not in my project"). Responses:

| Code | Meaning |
|---|---|
| `200` | The owner email was sent |
| `409` | Duplicate submission |
| `422` | Validation errors, returned as `{ errors: { field: message } }` |
| `429` | Rate limited |
| `502` | The email could not be sent |
| `503` | Email is not configured |

The browser shows the success message **only** on `200`.

## Security & spam protection

- SMTP credentials and the owner address are read from environment variables on the server only.
- Every field is validated on the server, and choices are checked against `shared/catalog.js`.
- Helmet sets security headers and a strict Content Security Policy. JSON bodies are capped at 50 KB.
- A hidden honeypot field and a minimum fill time (`MIN_FILL_SECONDS`) catch bots. Bots get a fake success response.
- Each IP is limited to `RATE_LIMIT_MAX` submissions per 15 minutes.
- Duplicate protection: the button is disabled while sending, and the server accepts each `submissionId` only once.
- Successful and failed submissions are logged to the console and to `logs/submissions.log`. Behind a reverse proxy, set `TRUST_PROXY=true` so client IPs and rate limits are correct.
