/**
 * Generates the SVG artwork used by the vision board (one image per option
 * plus the quick-start style covers). Run with: npm run images
 *
 * Every image is a plain SVG file in public/images, so you can replace any
 * of them with a real photo (same file name, or update `image` in
 * shared/catalog.js) without touching code.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const catalog = require('../shared/catalog');

const OUT = path.join(__dirname, '..', 'public', 'images');
const W = 400;
const H = 300;

// ---------- deterministic randomness ----------
function rng(seed) {
  let s = 0;
  for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const svg = (body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>\n`;

// ---------- textures ----------
function veins(seed, color, count, width, opacity) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    let x = r() * W;
    let y = -20;
    let d = `M${x.toFixed(1)} ${y}`;
    while (y < H + 20) {
      const nx = x + (r() - 0.45) * 120;
      const ny = y + 40 + r() * 60;
      d += ` Q${(x + (r() - 0.5) * 80).toFixed(1)} ${((y + ny) / 2).toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`;
      x = nx; y = ny;
    }
    out += `<path d="${d}" fill="none" stroke="${color}" stroke-width="${(width * (0.4 + r())).toFixed(2)}" opacity="${(opacity * (0.5 + r() * 0.5)).toFixed(2)}" stroke-linecap="round"/>`;
  }
  return out;
}

function noiseFilter(id, freq, octaves, opacity, tint = '0 0 0') {
  const [r, g, b] = tint.split(' ');
  return `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${octaves}" seed="7"/><feColorMatrix values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${opacity} 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;
}

function stoneRect(id, x, y, w, h, base, vein, opts = {}) {
  const f = `n-${id}`;
  return {
    defs: noiseFilter(f, opts.freq || '0.012 0.03', 4, opts.noise ?? 0.25, opts.tint || '0.3 0.3 0.3'),
    body: `<g><clipPath id="c-${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath><g clip-path="url(#c-${id})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${base}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${base}" filter="url(#${f})"/>${vein ? veins(id, vein, opts.veins || 6, opts.veinWidth || 2.2, opts.veinOpacity || 0.7) : ''}</g></g>`,
  };
}

function woodPlanks(id, x, y, w, h, base, dark, plankH = 34, horizontal = true) {
  const r = rng(id);
  let body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${base}"/>`;
  for (let py = y, row = 0; py < y + h; py += plankH, row++) {
    const off = (row % 3) * 70;
    for (let px = x - off; px < x + w; px += 210) {
      body += `<rect x="${px}" y="${py}" width="210" height="${plankH}" fill="${base}" stroke="${dark}" stroke-width="1.2" opacity="${0.85 + r() * 0.15}"/>`;
      for (let g = 0; g < 4; g++) {
        const gy = py + 5 + r() * (plankH - 10);
        body += `<path d="M${px + 4} ${gy.toFixed(1)} C${px + 60} ${(gy + (r() - 0.5) * 6).toFixed(1)} ${px + 140} ${(gy + (r() - 0.5) * 6).toFixed(1)} ${px + 206} ${gy.toFixed(1)}" stroke="${dark}" stroke-width="0.7" fill="none" opacity="0.35"/>`;
      }
    }
  }
  if (!horizontal) return `<g transform="rotate(90 ${x + w / 2} ${y + h / 2})">${body}</g>`;
  return `<g><clipPath id="c-${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath><g clip-path="url(#c-${id})">${body}</g></g>`;
}

// ---------- wall-pattern line art ----------
function patternLines(id, stroke = '#111', sw = 2.2, bg = '#fff') {
  const L = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  let g = '';
  const brick = (bw, bh) => {
    for (let y = 0, r = 0; y <= H; y += bh, r++) {
      g += L(0, y, W, y);
      const off = r % 2 ? bw / 2 : 0;
      for (let x = -off; x <= W; x += bw) g += L(x, y, x, y + bh);
    }
  };
  switch (id) {
    case 'subway-3x6': brick(50, 25); break;
    case 'subway-4x12': brick(100, 33); break;
    case 'marazzi-12x12': for (let i = 0; i <= W; i += 100) g += L(i, 0, i, H); for (let j = 0; j <= H; j += 100) g += L(0, j, W, j); break;
    case 'fairfield-24x6': brick(160, 40); break;
    case 'roman-block-12x24': brick(150, 75); break;
    case 'milano-6x24':
      for (let x = 0, c = 0; x <= W; x += 55, c++) {
        g += L(x, 0, x, H);
        const off = c % 2 ? 110 : 0;
        for (let y = -off; y <= H; y += 220) g += L(x, y, x + 55, y);
      }
      break;
    case 'hexagonal-6': {
      const r = 34; const hw = Math.sqrt(3) * r;
      for (let row = -1; row < 8; row++) {
        for (let col = -1; col < 8; col++) {
          const cx = col * hw + (row % 2 ? hw / 2 : 0);
          const cy = row * r * 1.5;
          const pts = [];
          for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`); }
          g += `<polygon points="${pts.join(' ')}" fill="none"/>`;
        }
      }
      break;
    }
    case 'chevron':
      for (let x = -40; x <= W + 40; x += 50) {
        for (let y = -60; y <= H + 60; y += 40) {
          g += L(x, y, x + 25, y + 25) + L(x + 25, y + 25, x + 50, y);
        }
        g += L(x + 25, -60, x + 25, H + 60);
      }
      break;
    case 'smooth-seamless':
      return `<rect width="${W}" height="${H}" fill="#f4f2ec"/><rect width="${W}" height="${H}" fill="url(#sheen)"/>`;
    default: break;
  }
  return `<rect width="${W}" height="${H}" fill="${bg}"/><g stroke="${stroke}" stroke-width="${sw}" fill="none">${g}</g>`;
}

// ---------- reusable scene pieces ----------
const FINISH = {
  'chrome': ['#e9edf1', '#9aa6b2', '#5d6975'],
  'brushed-nickel': ['#d8d2c8', '#a39c90', '#6f685e'],
  'matte-black': ['#4a4a4a', '#222', '#000'],
  'oil-rubbed-bronze': ['#8a6248', '#4e3424', '#2a1a10'],
  'brushed-gold': ['#f0d38a', '#c89b3c', '#8a6420'],
};
const metal = (id, key) => {
  const [a, b, c] = FINISH[key];
  return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="0.55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;
};

const wallTiles = (fill = '#eef0f2', line = '#d5d9de', size = 40, y2 = 210) => {
  let g = `<rect width="${W}" height="${y2}" fill="${fill}"/>`;
  for (let x = 0; x <= W; x += size) g += `<line x1="${x}" y1="0" x2="${x}" y2="${y2}" stroke="${line}"/>`;
  for (let y = 0; y <= y2; y += size) g += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${line}"/>`;
  return g;
};
const floor = (fill = '#d9dadc', y = 210) => `<rect y="${y}" width="${W}" height="${H - y}" fill="${fill}"/><rect y="${y}" width="${W}" height="6" fill="#000" opacity="0.06"/>`;
const plant = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-9" y="0" width="18" height="20" rx="3" fill="#f5f5f5" stroke="#ccc"/><path d="M0 0 C-14 -16 -18 -30 -8 -38 M0 0 C2 -20 8 -32 16 -36 M0 0 C-4 -12 4 -26 2 -44" stroke="#4f7d4a" stroke-width="5" fill="none" stroke-linecap="round"/></g>`;
const towel = (x, y, c = '#fff') => `<rect x="${x}" y="${y}" width="34" height="46" rx="3" fill="${c}" stroke="#d0d0d0"/><rect x="${x}" y="${y + 34}" width="34" height="4" fill="#d0d0d0"/>`;
const showerHead = (x, y, finish = 'chrome', rain = false) =>
  rain
    ? `<rect x="${x - 2}" y="${y - 40}" width="4" height="40" fill="url(#m)"/><ellipse cx="${x}" cy="${y}" rx="34" ry="6" fill="url(#m)"/>${Array.from({ length: 9 }, (_, i) => `<line x1="${x - 28 + i * 7}" y1="${y + 8}" x2="${x - 30 + i * 7}" y2="${y + 70}" stroke="#9cc7e6" stroke-width="1.4" opacity="0.6"/>`).join('')}`
    : `<path d="M${x} ${y - 30} L${x} ${y} L${x - 22} ${y + 6}" stroke="url(#m)" stroke-width="5" fill="none"/><ellipse cx="${x - 26}" cy="${y + 10}" rx="12" ry="5" fill="url(#m)" transform="rotate(-20 ${x - 26} ${y + 10})"/>`;
const glass = (x, y, w, h, type = 'clear') => {
  const fill = { clear: 'rgba(190,220,235,0.25)', frost: 'rgba(235,240,244,0.75)', rain: 'rgba(200,220,235,0.4)', corrugated: 'rgba(200,220,235,0.4)' }[type];
  let extra = `<line x1="${x + w * 0.2}" y1="${y + 10}" x2="${x + w * 0.05}" y2="${y + 50}" stroke="#fff" stroke-width="3" opacity="0.7"/>`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="#b8cdd8" stroke-width="1.5"/>${extra}`;
};
const tub = (x, y, w, fill = '#fbfbfb') => `<rect x="${x}" y="${y}" width="${w}" height="62" rx="8" fill="${fill}" stroke="#d6d6d6" stroke-width="2"/><rect x="${x}" y="${y}" width="${w}" height="10" rx="4" fill="#fff" stroke="#d6d6d6"/><rect x="${x + 10}" y="${y + 3}" width="${w - 20}" height="5" rx="2" fill="#cfe7f3"/>`;
const vanityBox = (x, y, w, h, fill, line, style, handle = '#c9a24a') => {
  let g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}" stroke="${line}" stroke-width="1.5"/>`;
  const doors = 3; const dw = w / doors;
  for (let i = 0; i < doors; i++) {
    const dx = x + i * dw;
    if (style === 'shaker') g += `<rect x="${dx + 6}" y="${y + 8}" width="${dw - 12}" height="${h - 16}" fill="none" stroke="${line}" stroke-width="2"/><rect x="${dx + 14}" y="${y + 16}" width="${dw - 28}" height="${h - 32}" fill="${fill}" stroke="${line}" stroke-width="0.8" opacity="0.8"/>`;
    else if (style === 'raised') g += `<rect x="${dx + 6}" y="${y + 8}" width="${dw - 12}" height="${h - 16}" rx="8" fill="none" stroke="${line}" stroke-width="2.4"/><rect x="${dx + 16}" y="${y + 18}" width="${dw - 32}" height="${h - 36}" rx="12" fill="#000" opacity="0.12"/>`;
    else g += `<line x1="${dx}" y1="${y + 4}" x2="${dx}" y2="${y + h - 4}" stroke="${line}" stroke-width="1"/>`;
    g += `<rect x="${dx + dw / 2 - 10}" y="${y + 14}" width="20" height="3" rx="1.5" fill="${handle}"/>`;
  }
  return g;
};
const sink = (cx, y, finishKey = 'chrome') => `<ellipse cx="${cx}" cy="${y + 4}" rx="34" ry="7" fill="#fff" stroke="#cfcfcf"/><ellipse cx="${cx}" cy="${y + 4}" rx="24" ry="4" fill="#eceff1"/><path d="M${cx} ${y - 2} L${cx} ${y - 22} Q${cx} ${y - 28} ${cx + 14} ${y - 26}" stroke="url(#m)" stroke-width="5" fill="none" stroke-linecap="round"/>`;
const mirrorShape = (shape, cx, cy, w, h, frame) => {
  const inner = `fill="url(#mirrorFill)"`;
  switch (shape) {
    case 'framed-rectangle': return `<rect x="${cx - w / 2 - 8}" y="${cy - h / 2 - 8}" width="${w + 16}" height="${h + 16}" rx="2" fill="${frame}"/><rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" ${inner}/>`;
    case 'frameless-rectangle': return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="3" ${inner} stroke="#c7d0d6" stroke-width="1.5"/><rect x="${cx - w / 2 - 3}" y="${cy - h / 2 - 3}" width="${w + 6}" height="${h + 6}" rx="5" fill="none" stroke="#fffbe8" stroke-width="3" opacity="0.8"/>`;
    case 'round-pill': return `<rect x="${cx - w / 4 - 5}" y="${cy - h / 2 - 5}" width="${w / 2 + 10}" height="${h + 10}" rx="${w / 4 + 5}" fill="${frame}"/><rect x="${cx - w / 4}" y="${cy - h / 2}" width="${w / 2}" height="${h}" rx="${w / 4}" ${inner}/>`;
    case 'arched': return `<path d="M${cx - w / 2 - 6} ${cy + h / 2 + 6} V${cy - h / 2 + w / 2} A${w / 2 + 6} ${w / 2 + 6} 0 0 1 ${cx + w / 2 + 6} ${cy - h / 2 + w / 2} V${cy + h / 2 + 6} Z" fill="${frame}"/><path d="M${cx - w / 2} ${cy + h / 2} V${cy - h / 2 + w / 2} A${w / 2} ${w / 2} 0 0 1 ${cx + w / 2} ${cy - h / 2 + w / 2} V${cy + h / 2} Z" ${inner}/>`;
    default: return '';
  }
};
const commonDefs = (finishKey = 'chrome') =>
  metal('m', finishKey) +
  `<linearGradient id="mirrorFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dfe8ee"/><stop offset="0.5" stop-color="#b9c8d2"/><stop offset="1" stop-color="#e8eef2"/></linearGradient>` +
  `<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.8"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#d8d4ca" stop-opacity="0.6"/></linearGradient>` +
  `<radialGradient id="light" cx="0.3" cy="0.1" r="0.9"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
const lightOverlay = `<rect width="${W}" height="${H}" fill="url(#light)"/>`;

// ---------- per-category renderers ----------
const render = {
  showerTub(id) {
    let b = wallTiles('#eceff1', '#d6dbe0', 36) + floor('#cfd3d6');
    switch (id) {
      case 'walk-in-shower':
        b += `<rect x="60" y="20" width="200" height="190" fill="#e3e7ea"/>` + showerHead(200, 60) + glass(250, 30, 8, 180) + `<rect x="60" y="205" width="200" height="6" fill="#bfc6cc"/><rect x="140" y="200" width="30" height="4" fill="url(#m)"/>` + plant(330, 190) + towel(300, 110);
        break;
      case 'neo-angle-shower':
        b += `<polygon points="60,20 300,20 300,210 230,240 90,240 60,210" fill="#e6eaed"/>` + showerHead(180, 60) + `<polygon points="230,40 300,20 300,210 230,240" fill="rgba(190,220,235,0.3)" stroke="#b8cdd8" stroke-width="2"/><polygon points="90,40 230,40 230,240 90,240" fill="rgba(190,220,235,0.22)" stroke="#b8cdd8" stroke-width="2"/><polygon points="60,20 90,40 90,240 60,210" fill="rgba(190,220,235,0.3)" stroke="#b8cdd8" stroke-width="2"/><line x1="220" y1="120" x2="220" y2="160" stroke="url(#m)" stroke-width="4"/>`;
        break;
      case 'tub-to-shower':
        b += `<rect x="40" y="20" width="230" height="190" fill="#e6eaed"/>` + showerHead(210, 60) + `<rect x="40" y="198" width="230" height="14" fill="#f5f5f5" stroke="#ddd"/>` + glass(150, 30, 120, 170) + `<rect x="60" y="100" width="40" height="30" fill="#d8dde1" stroke="#c3c9ce"/>` + towel(310, 100) + plant(340, 195);
        break;
      case 'shower-to-tub':
      case 'replacement-bathtub':
        b += tub(50, 150, 260) + showerHead(270, 70) + (id === 'replacement-bathtub' ? `<rect x="110" y="95" width="90" height="12" rx="3" fill="#fff" stroke="#d6d6d6"/><circle cx="130" cy="90" r="5" fill="#cfa"/><rect x="150" y="82" width="8" height="13" fill="#b3a28e"/>` : '') + towel(330, 110) ;
        break;
      case 'tub-shower-combo':
        b += tub(50, 150, 260) + showerHead(250, 60) + `<line x1="40" y1="30" x2="320" y2="30" stroke="url(#m)" stroke-width="4"/><path d="M290 32 Q300 90 292 150 L320 150 L320 32 Z" fill="#fff" stroke="#ddd"/>` + plant(70, 140);
        break;
      case 'walk-in-tub':
        b += `<rect x="90" y="110" width="190" height="105" rx="10" fill="#fbfbfb" stroke="#d0d0d0" stroke-width="2"/><rect x="110" y="125" width="70" height="85" rx="8" fill="#f1f3f5" stroke="#c9cdd1" stroke-width="2"/><rect x="170" y="160" width="6" height="20" rx="3" fill="url(#m)"/><rect x="200" y="130" width="62" height="40" rx="6" fill="#eef1f3"/><line x1="70" y1="90" x2="70" y2="170" stroke="url(#m)" stroke-width="6" stroke-linecap="round"/>` + showerHead(250, 60);
        break;
    }
    return svg(b + lightOverlay, commonDefs());
  },

  wallPattern(id) {
    return svg(patternLines(id), commonDefs());
  },

  wallColor(id) {
    const solid = { white: '#f7f7f3', biscuit: '#f3e7cc', almond: '#f5ebc9' };
    if (solid[id]) return svg(`<rect width="${W}" height="${H}" fill="${solid[id]}"/><rect width="${W}" height="${H}" fill="url(#sheen)" opacity="0.6"/>`, commonDefs());
    const stones = {
      'calcutta-marble': ['#f8f8f8', '#7d8288', { veins: 9, veinWidth: 2, noise: 0.08 }],
      'pompeii-marble': ['#d8d1c2', '#8a7a62', { veins: 10, veinWidth: 1.6, noise: 0.3, tint: '0.45 0.4 0.3' }],
      'bianco-travertine': ['#d6c9b1', '#a8987c', { veins: 4, veinWidth: 1.2, noise: 0.45, freq: '0.02 0.08', tint: '0.5 0.42 0.3' }],
      'classic-concrete': ['#c9c9c6', null, { noise: 0.35, freq: '0.04', tint: '0.4 0.4 0.4' }],
      'galena': ['#f1f1ef', '#b9bcbf', { veins: 12, veinWidth: 1.2, noise: 0.06 }],
      'tuscany': ['#d9a965', '#b57d3a', { veins: 5, veinWidth: 1.4, noise: 0.45, freq: '0.006 0.09', tint: '0.6 0.4 0.15' }],
    };
    const [base, vein, o] = stones[id];
    const s = stoneRect(id, 0, 0, W, H, base, vein, o);
    return svg(s.body, commonDefs() + s.defs);
  },

  flooring(id) {
    let defs = commonDefs();
    let b = '';
    const wall = '<rect width="400" height="90" fill="#eef0f1"/><rect x="250" y="20" width="90" height="70" rx="6" fill="#fff" stroke="#ddd"/><rect y="88" width="400" height="4" fill="#d9d9d9"/>';
    switch (id) {
      case 'porcelain-marble': { const s = stoneRect(id, 0, 92, W, 208, '#f2f2f1', '#9aa0a5', { veins: 8 }); defs += s.defs; b = wall + s.body + `<g stroke="#e0e0e0">${[0, 100, 200, 300, 400].map((x) => `<line x1="${x}" y1="92" x2="${x}" y2="300"/>`).join('')}<line x1="0" y1="196" x2="400" y2="196"/></g>`; break; }
      case 'porcelain-wood': b = wall + woodPlanks(id, 0, 92, W, 208, '#d8b98f', '#9a7550', 30); break;
      case 'porcelain-concrete': { const s = stoneRect(id, 0, 92, W, 208, '#9c9d9b', null, { noise: 0.45, freq: '0.05', tint: '0.25 0.25 0.25' }); defs += s.defs; b = wall + s.body + `<g stroke="#7c7d7b">${[0, 130, 260, 390].map((x) => `<line x1="${x}" y1="92" x2="${x}" y2="300"/>`).join('')}<line x1="0" y1="196" x2="400" y2="196"/></g>`; break; }
      case 'lvp-gray-driftwood': b = wall + woodPlanks(id, 0, 92, W, 208, '#a9a8a3', '#6e6d68', 26); break;
      case 'hexagon-mosaic': {
        let hexes = ''; const r = 11; const hw = Math.sqrt(3) * r;
        for (let row = 0; row < 20; row++) for (let col = -1; col < 26; col++) {
          const cx = col * hw + (row % 2 ? hw / 2 : 0); const cy = 92 + row * r * 1.5;
          const pts = []; for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`); }
          hexes += `<polygon points="${pts.join(' ')}"/>`;
        }
        b = wall + `<rect y="92" width="400" height="208" fill="#fdfdfd"/><g fill="#fbfbfb" stroke="#c9cccf" stroke-width="1.4">${hexes}</g>`;
        break;
      }
      case 'slate-matte': { const s = stoneRect(id, 0, 92, W, 208, '#4f5357', '#3a3d40', { veins: 5, veinWidth: 3, noise: 0.5, freq: '0.03', tint: '0.15 0.15 0.15' }); defs += s.defs; b = wall + s.body + `<g stroke="#2f3235" stroke-width="2">${[0, 130, 260, 390].map((x) => `<line x1="${x}" y1="92" x2="${x}" y2="300"/>`).join('')}<line x1="0" y1="196" x2="400" y2="196"/></g>`; break; }
    }
    return svg(b + lightOverlay, defs);
  },

  vanity(id) {
    const cfg = {
      'shaker-white': ['#f6f6f4', '#cfd2d4', 'shaker', '#b7b7b7'],
      'shaker-navy': ['#22365a', '#152340', 'shaker', '#c9a24a'],
      'flat-panel-white': ['#f8f8f8', '#d6d6d6', 'flat', '#a7a7a7'],
      'flat-panel-wood': ['#b98552', '#80562e', 'flat', '#222'],
      'espresso-traditional': ['#3a261b', '#1d120c', 'raised', '#c9a24a'],
      'floating-wall-mounted': ['#c99a63', '#8f6838', 'flat', '#c9a24a'],
    }[id];
    const floating = id === 'floating-wall-mounted';
    const vy = floating ? 150 : 165; const vh = floating ? 60 : 85;
    let b = `<rect width="400" height="250" fill="#eef0f0"/>` + floor('#dcdcda', 250) +
      mirrorShape(id.includes('shaker') || id === 'espresso-traditional' ? 'framed-rectangle' : id === 'floating-wall-mounted' ? 'round-pill' : 'frameless-rectangle', 200, 80, 170, 100, id === 'espresso-traditional' ? '#3a261b' : '#c9a24a') +
      `<rect x="60" y="${vy - 10}" width="280" height="12" rx="2" fill="#f4f4f2" stroke="#d8d8d8"/>` + sink(200, vy - 12) +
      vanityBox(65, vy + 2, 270, vh, cfg[0], cfg[1], cfg[2], cfg[3]);
    if (floating) b += `<ellipse cx="200" cy="260" rx="130" ry="6" fill="#000" opacity="0.08"/>`;
    return svg(b + lightOverlay, commonDefs('brushed-gold'));
  },

  countertop(id) {
    const st = {
      'quartz-white': ['#f5f5f4', '#9ea4aa', { veins: 6, noise: 0.06 }],
      'quartz-gray': ['#8e9396', '#6d7275', { veins: 2, noise: 0.25, veinWidth: 1 }],
      'quartz-black': ['#1d1e20', '#3c3e41', { veins: 3, noise: 0.3, tint: '0.3 0.3 0.3' }],
      'granite-speckled': ['#c7bba8', null, { noise: 0.7, freq: '0.35', tint: '0.25 0.2 0.15' }],
      'cultured-marble': ['#f2efe9', '#d6cfc3', { veins: 4, veinWidth: 1, noise: 0.05 }],
    }[id];
    let defs = commonDefs();
    let top;
    if (id === 'butcher-block') top = woodPlanks(id, 30, 140, 340, 60, '#c58a4c', '#8a5a2b', 12);
    else { const s = stoneRect(id, 30, 140, 340, 60, st[0], st[1], st[2]); defs += s.defs; top = s.body; }
    const b = wallTiles('#f0f0ef', '#e1e1df', 50, 140) + `<rect y="140" width="400" height="160" fill="#4a3426"/>` + top +
      `<rect x="30" y="196" width="340" height="10" fill="#000" opacity="0.15"/>` +
      `<ellipse cx="200" cy="162" rx="60" ry="12" fill="#fff" stroke="#cfcfcf"/><ellipse cx="200" cy="162" rx="46" ry="8" fill="#e9ecee"/>` +
      `<path d="M200 150 L200 110 Q200 100 222 104" stroke="url(#m)" stroke-width="7" fill="none" stroke-linecap="round"/>` +
      `<rect x="300" y="118" width="14" height="28" rx="3" fill="#7a5a3c"/><rect x="320" y="126" width="12" height="20" rx="3" fill="#2f2f2f"/>` + plant(70, 122);
    return svg(b + lightOverlay, defs);
  },

  showerDoor(id) {
    let b = wallTiles('#e9ecee', '#d3d8dc', 30) + floor('#cfd2d4') + showerHead(180, 50);
    const frame = '#9aa6b2';
    switch (id) {
      case 'frameless': b += glass(70, 25, 130, 190) + glass(200, 25, 130, 190) + `<rect x="190" y="110" width="4" height="40" fill="url(#m)"/>`; break;
      case 'semi-frameless': b += glass(70, 25, 260, 190) + `<rect x="70" y="25" width="260" height="190" fill="none" stroke="${frame}" stroke-width="4"/><line x1="200" y1="25" x2="200" y2="215" stroke="${frame}" stroke-width="2"/><rect x="206" y="110" width="4" height="40" fill="url(#m)"/>`; break;
      case 'sliding-bypass': b += `<rect x="60" y="22" width="280" height="6" fill="url(#m)"/>` + glass(70, 30, 150, 185) + glass(180, 34, 150, 181) + `<rect x="200" y="110" width="4" height="40" fill="url(#m)"/><rect x="190" y="110" width="4" height="40" fill="url(#m)"/>`; break;
      case 'barn-door': b += `<rect x="40" y="18" width="330" height="7" fill="#222"/><circle cx="120" cy="22" r="7" fill="#222"/><circle cx="260" cy="22" r="7" fill="#222"/>` + glass(90, 28, 200, 188) + `<rect x="280" y="100" width="5" height="60" fill="#222"/>`; break;
      case 'pivot-hinged': b += `<rect x="70" y="25" width="90" height="190" fill="rgba(190,220,235,0.25)" stroke="#b8cdd8" stroke-width="2"/><polygon points="160,25 300,45 300,200 160,215" fill="rgba(190,220,235,0.3)" stroke="#b8cdd8" stroke-width="2"/><rect x="286" y="100" width="6" height="50" fill="url(#m)"/>`; break;
      case 'framed': b += glass(70, 25, 260, 190) + `<rect x="70" y="25" width="260" height="190" fill="none" stroke="url(#m)" stroke-width="9"/><line x1="200" y1="25" x2="200" y2="215" stroke="url(#m)" stroke-width="7"/><rect x="210" y="105" width="5" height="44" fill="url(#m)"/>`; break;
    }
    return svg(b + lightOverlay, commonDefs('chrome'));
  },

  finish(id) {
    const b = `<rect width="400" height="300" fill="#f1f2f2"/>` +
      (() => { const s = stoneRect('f-' + id, 0, 190, 400, 110, '#f6f6f5', '#a7adb2', { veins: 5, noise: 0.05 }); return s.body; })() +
      `<ellipse cx="230" cy="240" rx="90" ry="20" fill="#fff" stroke="#d4d4d4"/><ellipse cx="230" cy="240" rx="70" ry="13" fill="#e8ebed"/>` +
      `<rect x="120" y="150" width="26" height="45" rx="6" fill="url(#m)"/><path d="M133 150 L133 95 Q133 70 165 70 L200 70 Q214 70 214 86 L214 104" stroke="url(#m)" stroke-width="16" fill="none" stroke-linecap="round"/><rect x="106" y="128" width="54" height="10" rx="5" fill="url(#m)" transform="rotate(-18 133 133)"/><ellipse cx="133" cy="196" rx="24" ry="5" fill="url(#m)"/>` +
      `<path d="M214 110 Q212 160 222 228" stroke="#a8d4f0" stroke-width="6" fill="none" opacity="0.55" stroke-linecap="round"/>`;
    const s = stoneRect('f-' + id, 0, 190, 400, 110, '#f6f6f5', '#a7adb2', { veins: 5, noise: 0.05 });
    return svg(b + lightOverlay, metal('m', id) + s.defs + `<radialGradient id="light" cx="0.3" cy="0.1" r="0.9"><stop offset="0" stop-color="#fff" stop-opacity="0.5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`);
  },

  mirror(id) {
    const b = `<rect width="400" height="300" fill="#eef0ee"/><g stroke="#e0e3e0">${[50, 100, 150, 200].map((y) => `<line x1="0" y1="${y}" x2="400" y2="${y}"/>`).join('')}</g>` +
      mirrorShape(id, 200, 115, id === 'round-pill' ? 220 : 150, id === 'arched' ? 170 : 150, id === 'framed-rectangle' ? '#2b2b2b' : '#c9a24a') +
      `<rect x="70" y="215" width="260" height="12" rx="2" fill="#f5f5f4" stroke="#d8d8d8"/>` + vanityBox(75, 227, 250, 73, '#c99a63', '#8f6838', 'flat', '#222') + sink(200, 213) + plant(310, 195);
    return svg(b + lightOverlay, commonDefs());
  },

  accessories(id) {
    let b = wallTiles('#f2f3f4', '#d8dcdf', 36, 300);
    switch (id) {
      case 'corner-shelf': b += [80, 140, 200].map((y) => `<path d="M140 ${y} L260 ${y} L200 ${y + 30} Z" fill="rgba(200,215,225,0.6)" stroke="url(#m)" stroke-width="3"/>`).join('') + `<line x1="200" y1="60" x2="200" y2="240" stroke="url(#m)" stroke-width="4"/><rect x="170" y="56" width="12" height="26" rx="3" fill="#6a8caf"/><rect x="210" y="60" width="12" height="22" rx="3" fill="#e2b553"/><rect x="180" y="120" width="14" height="22" rx="3" fill="#9a6cb0"/><rect x="200" y="180" width="14" height="22" rx="3" fill="#f2f2f2" stroke="#bbb"/>`; break;
      case 'soap-dish': b += `<rect x="120" y="120" width="160" height="80" rx="18" fill="#fff" stroke="#cfd4d8" stroke-width="3"/><rect x="138" y="134" width="124" height="50" rx="14" fill="#eef1f3"/><rect x="160" y="140" width="80" height="34" rx="12" fill="#f5ecd6" stroke="#e2d4b0"/>`; break;
      case 'shower-seat': b += `<rect x="100" y="150" width="200" height="22" rx="4" fill="#b98552" stroke="#80562e"/>${[0, 1, 2, 3, 4].map((i) => `<line x1="${110 + i * 40}" y1="150" x2="${110 + i * 40}" y2="172" stroke="#80562e"/>`).join('')}<path d="M110 172 L130 210 M290 172 L270 210" stroke="url(#m)" stroke-width="5"/><rect x="90" y="70" width="220" height="8" rx="4" fill="url(#m)"/>` + showerHead(330, 60); break;
      case 'grab-bars': b += `<rect x="70" y="140" width="260" height="12" rx="6" fill="url(#m)"/><rect x="62" y="134" width="16" height="24" rx="4" fill="url(#m)"/><rect x="322" y="134" width="16" height="24" rx="4" fill="url(#m)"/><rect x="60" y="40" width="12" height="90" rx="6" fill="url(#m)" transform="rotate(30 66 85)"/>`; break;
      case 'shower-rod': b += `<path d="M40 50 Q200 90 360 50" stroke="url(#m)" stroke-width="7" fill="none"/>${Array.from({ length: 10 }, (_, i) => `<circle cx="${60 + i * 30}" cy="${58 + Math.sin((i / 9) * Math.PI) * 14}" r="5" fill="none" stroke="url(#m)" stroke-width="2"/>`).join('')}<path d="M55 64 Q200 104 345 64 L340 280 Q300 270 260 282 Q220 270 180 282 Q140 270 100 282 Q70 274 60 280 Z" fill="#fff" stroke="#ddd"/>`; break;
      case 'hand-held-wand': b += `<rect x="196" y="30" width="8" height="220" rx="4" fill="url(#m)"/><rect x="186" y="110" width="28" height="18" rx="4" fill="url(#m)"/><path d="M214 118 L260 70" stroke="url(#m)" stroke-width="10" stroke-linecap="round"/><ellipse cx="270" cy="60" rx="24" ry="14" transform="rotate(-45 270 60)" fill="url(#m)"/><path d="M200 128 Q150 200 200 260" stroke="#9aa6b2" stroke-width="4" fill="none"/>`; break;
      case 'recessed-niche': b += `<rect x="110" y="70" width="180" height="160" fill="#d9dde0" stroke="#c4c9cd" stroke-width="3"/><rect x="110" y="148" width="180" height="6" fill="#c4c9cd"/><rect x="130" y="108" width="20" height="40" rx="4" fill="#3d3d3d"/><rect x="156" y="114" width="20" height="34" rx="4" fill="#7a5a3c"/><rect x="200" y="190" width="24" height="40" rx="4" fill="#f5f5f5" stroke="#aaa"/><rect x="232" y="198" width="18" height="32" rx="4" fill="#3d3d3d"/>`; break;
      case 'rainfall-head': b += showerHead(200, 90, 'chrome', true) + `<rect x="196" y="0" width="8" height="50" fill="url(#m)"/>`; break;
    }
    return svg(b + lightOverlay, commonDefs());
  },
};

// ---------- style covers (composite scenes) ----------
function styleCover(style) {
  const p = style.picks;
  const pal = {
    'spa-retreat': { wall: ['#f7f7f7', '#8b9096'], floor: '#e9e9e7', vanity: ['#c99a63', '#8f6838'], top: '#f5f5f4', finish: 'brushed-nickel' },
    'timeless-classic': { wall: ['#fbfbf8', null], floor: '#f6f6f6', vanity: ['#f6f6f4', '#cfd2d4'], top: '#f4f4f2', finish: 'chrome' },
    'modern-luxe': { wall: ['#a8a8a5', null], floor: '#3e4245', vanity: ['#b98552', '#80562e'], top: '#1d1e20', finish: 'matte-black' },
    'accessible-comfort': { wall: ['#efe2c2', '#c9b58c'], floor: '#5a5e62', vanity: ['#f6f6f4', '#cfd2d4'], top: '#f2efe9', finish: 'chrome' },
  }[style.id];
  const s = stoneRect('w-' + style.id, 0, 0, W, 220, pal.wall[0], pal.wall[1], { veins: 7, noise: 0.2 });
  let b = s.body + `<rect y="220" width="400" height="80" fill="${pal.floor}"/>`;
  if (p.wallPattern === 'subway-3x6') b += `<g opacity="0.35">${patternLines('subway-3x6', '#9aa', 1).replace(/<rect[^>]*\/>/, '')}</g><rect y="220" width="400" height="80" fill="${pal.floor}"/>`;
  // shower / tub on the left
  if (p.showerTub === 'replacement-bathtub' || p.showerTub === 'walk-in-tub') b += tub(20, 160, 190);
  else b += `<rect x="20" y="30" width="190" height="190" fill="#000" opacity="0.04"/>` + glass(120, 30, 90, 190);
  b += showerHead(110, 55, pal.finish, p.accessories.includes('rainfall-head'));
  if (p.accessories.includes('grab-bars')) b += `<rect x="30" y="140" width="80" height="8" rx="4" fill="url(#m)"/>`;
  if (p.accessories.includes('recessed-niche')) b += `<rect x="40" y="100" width="50" height="34" fill="#000" opacity="0.12"/>`;
  // vanity on the right
  b += mirrorShape(p.mirror, 310, 80, p.mirror === 'round-pill' ? 120 : 100, 90, pal.finish === 'matte-black' ? '#222' : '#c9a24a') +
    `<rect x="230" y="150" width="160" height="10" fill="${pal.top}" stroke="#bbb"/>` + sink(310, 148) +
    vanityBox(235, 160, 150, p.vanity === 'floating-wall-mounted' ? 40 : 60, pal.vanity[0], pal.vanity[1], p.vanity.includes('shaker') ? 'shaker' : 'flat', '#c9a24a');
  b += plant(380, 214);
  return svg(b + lightOverlay, commonDefs(pal.finish) + s.defs);
}

// ---------- write files ----------
fs.mkdirSync(path.join(OUT, 'options'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'styles'), { recursive: true });
let n = 0;
for (const step of catalog.steps) {
  for (const o of step.options) {
    fs.writeFileSync(path.join(OUT, '..', o.image), render[step.key](o.id));
    n++;
  }
}
for (const st of catalog.styles) {
  fs.writeFileSync(path.join(OUT, '..', st.image), styleCover(st));
  n++;
}
console.log(`Generated ${n} SVG images in public/images`);
