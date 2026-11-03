'use strict';
const catalog = require('../shared/catalog');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Turn a validated board into human-readable rows, one per category. */
function describeBoard(board) {
  const rows = [];
  const variants = board.variants || {};
  for (const step of catalog.steps) {
    const v = board.selections[step.key];
    let choice;
    let detail = '';
    if (v === catalog.SKIP) {
      choice = 'Not in my project';
      detail = `Skip ${step.label.toLowerCase()} - not updating this`;
    } else if (step.multi) {
      const opts = v.map((id) => catalog.findOption(step.key, id));
      choice = opts.map((o) => o.name).join(', ');
      detail = opts.map((o) => o.desc).join('; ');
    } else {
      const o = catalog.findOption(step.key, v);
      choice = o.name;
      detail = o.desc;
    }
    const extras = [];
    const groups = step.variants || (step.variant ? [step.variant] : []);
    if (v !== catalog.SKIP) {
      for (const g of groups) {
        const id = variants[step.key] && variants[step.key][g.key];
        const o = g.options.find((x) => x.id === id) || g.options[0];
        extras.push(`${g.label.replace(/\s*\(Optional\)/i, '')}: ${o.name}${o.desc ? ` (${o.desc})` : ''}`);
      }
    }
    rows.push({ category: step.label, choice, detail, extras, skipped: v === catalog.SKIP });
  }
  return rows;
}

function formatDate(date) {
  const tz = process.env.TIMEZONE || 'America/Denver';
  try {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'long', timeZone: tz }).format(date);
  } catch (_) {
    return date.toUTCString();
  }
}

function buildOwnerEmail(data, { submittedAt = new Date(), shareUrl, ip, userAgent, submissionId } = {}) {
  const rows = describeBoard(data.board);
  const style = data.board.style ? catalog.styles.find((s) => s.id === data.board.style) : null;
  const name = `${data.firstName} ${data.lastName}`;
  const when = formatDate(submittedAt);
  const answered = rows.filter((r) => !r.skipped).length;

  const contact = [
    ['Customer Name', name],
    ['Email Address', `<a href="mailto:${esc(data.email)}" style="color:#1e6fd9">${esc(data.email)}</a>`, true],
    ['Phone Number', `<a href="tel:+1${esc(data.phone.replace(/\D/g, ''))}" style="color:#1e6fd9">${esc(data.phone)}</a>`, true],
    ['City', data.city],
    ['State', data.state],
    ['ZIP Code', data.zip],
    ['Best Time to Call', data.bestTime || 'No preference'],
  ];

  const tr = (label, value, raw) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #eef1f5;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.04em;width:38%;vertical-align:top">${esc(label)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eef1f5;color:#111827;font-size:14px;font-weight:600">${raw ? value : esc(value)}</td>
      </tr>`;

  const boardRows = rows.map((r, i) => `
      <tr>
        <td style="padding:12px 14px;border-bottom:1px solid #eef1f5;vertical-align:top;width:38%">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Step ${i + 1}</div>
          <div style="font-size:13px;color:#111827;font-weight:700">${esc(r.category)}</div>
        </td>
        <td style="padding:12px 14px;border-bottom:1px solid #eef1f5;vertical-align:top">
          <div style="font-size:14px;font-weight:700;color:${r.skipped ? '#9ca3af' : '#1e6fd9'}">${esc(r.choice)}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px">${esc(r.detail)}</div>
          ${r.extras.map((x) => `<div style="font-size:12px;color:#374151;margin-top:4px">&#8226; ${esc(x)}</div>`).join('')}
        </td>
      </tr>`).join('');

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New Vision Board Submission</title></head>
<body style="margin:0;padding:0;background:#f3f5f9;font-family:Segoe UI,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f9;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(16,24,40,.08)">
        <tr><td style="background:#1e6fd9;padding:24px 28px;color:#fff">
          <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.85;font-weight:700">New Form Submission &middot; Website Inquiry</div>
          <div style="font-size:22px;font-weight:800;margin-top:6px">${esc(name)} wants a bathroom render</div>
          <div style="font-size:13px;opacity:.9;margin-top:6px">Submitted ${esc(when)}</div>
        </td></tr>

        <tr><td style="padding:22px 28px 6px">
          <div style="font-size:12px;font-weight:800;color:#111827;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">Contact Details</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef1f5;border-radius:10px;border-collapse:separate;overflow:hidden">${contact.map(([l, v, raw]) => tr(l, v, raw)).join('')}
          </table>
        </td></tr>

        <tr><td style="padding:18px 28px 6px">
          <div style="font-size:12px;font-weight:800;color:#111827;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">Bathroom Vision Board (${answered} of ${rows.length} categories selected)</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef1f5;border-radius:10px;border-collapse:separate;overflow:hidden">${boardRows}
          </table>
        </td></tr>

        <tr><td style="padding:18px 28px 6px">
          <div style="font-size:12px;font-weight:800;color:#111827;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">Additional Information</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef1f5;border-radius:10px;border-collapse:separate;overflow:hidden">
            ${tr('Quick-Start Style', style ? `${style.name} - ${style.desc}` : 'Started from scratch')}
            ${tr('Make it Accessible', data.board.accessible ? 'Yes - walk-in tub, grab bars, non-slip & more' : 'No')}
            ${shareUrl ? tr('Vision Board Link', `<a href="${esc(shareUrl)}" style="color:#1e6fd9">Open this customer's board</a>`, true) : ''}
            ${tr('Submission Date & Time', when)}
            ${submissionId ? tr('Submission ID', submissionId) : ''}
            ${ip ? tr('IP Address', ip) : ''}
            ${userAgent ? tr('Browser', userAgent.slice(0, 160)) : ''}
          </table>
        </td></tr>

        <tr><td style="padding:18px 28px 26px">
          <a href="mailto:${esc(data.email)}?subject=${encodeURIComponent('Your bathroom vision board')}" style="display:inline-block;background:#1e6fd9;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:999px">Reply to ${esc(data.firstName)}</a>
          <a href="tel:+1${esc(data.phone.replace(/\D/g, ''))}" style="display:inline-block;margin-left:8px;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:999px">Call ${esc(data.phone)}</a>
          <p style="font-size:11px;color:#9ca3af;margin:18px 0 0">Sent automatically by the Bathroom Vision Board form. The full submission is also attached as JSON.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    'NEW FORM SUBMISSION - WEBSITE INQUIRY',
    `Submitted: ${when}`,
    '',
    'CONTACT DETAILS',
    `Customer Name: ${name}`,
    `Email Address: ${data.email}`,
    `Phone Number: ${data.phone}`,
    `City: ${data.city}`,
    `State: ${data.state}`,
    `ZIP Code: ${data.zip}`,
    `Best Time to Call: ${data.bestTime || 'No preference'}`,
    '',
    `BATHROOM VISION BOARD (${answered} of ${rows.length} categories selected)`,
    ...rows.map((r, i) => `${i + 1}. ${r.category}: ${r.choice}${r.detail ? ` - ${r.detail}` : ''}${r.extras.length ? `\n   ${r.extras.join('\n   ')}` : ''}`),
    '',
    'ADDITIONAL INFORMATION',
    `Quick-Start Style: ${style ? style.name : 'Started from scratch'}`,
    `Make it Accessible: ${data.board.accessible ? 'Yes' : 'No'}`,
    shareUrl ? `Vision Board Link: ${shareUrl}` : null,
    submissionId ? `Submission ID: ${submissionId}` : null,
  ].filter((l) => l !== null).join('\n');

  const json = {
    submittedAt: submittedAt.toISOString(),
    submissionId: submissionId || null,
    contact: {
      firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone,
      city: data.city, state: data.state, zip: data.zip, bestTime: data.bestTime || 'No preference',
    },
    style: style ? style.name : null,
    accessible: !!data.board.accessible,
    selections: rows.map((r) => ({ category: r.category, choice: r.choice, details: r.detail, options: r.extras })),
    raw: data.board,
    shareUrl: shareUrl || null,
  };

  return {
    subject: `New Form Submission – Website Inquiry: ${name} (Bathroom Vision Board)`,
    html,
    text,
    attachments: [{ filename: `vision-board-${data.lastName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${submittedAt.toISOString().slice(0, 10)}.json`, content: JSON.stringify(json, null, 2), contentType: 'application/json' }],
  };
}

module.exports = { buildOwnerEmail, describeBoard, esc };
