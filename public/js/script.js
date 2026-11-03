/* =========================================================
   Bathroom Vision Board — front-end logic
   ========================================================= */
(function () {
  'use strict';

  const C = window.CATALOG;
  const STEPS = C.steps;
  const TOTAL = STEPS.length;
  const STORE_KEY = 'visionBoard.v1';
  const AUTO_ADVANCE_MS = 450;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const el = (tag, attrs = {}, children = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children)) if (c) n.append(c);
    return n;
  };
  const checkIcon = () => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '12'); s.setAttribute('height', '12');
    s.innerHTML = '<path d="M5 12l5 5 9-10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    return s;
  };

  // ---------------------------------------------------------------- state
  function defaultVariants() {
    const v = {};
    for (const s of STEPS) {
      const groups = s.variants || (s.variant ? [s.variant] : []);
      if (groups.length) {
        v[s.key] = {};
        for (const g of groups) v[s.key][g.key] = g.options[0].id;
      }
    }
    return v;
  }
  let state = { selections: {}, variants: defaultVariants(), accessible: false, style: null, beforeAccessible: null };

  function sanitize(raw) {
    const out = { selections: {}, variants: defaultVariants(), accessible: !!(raw && raw.accessible), style: null, beforeAccessible: null };
    if (!raw || typeof raw !== 'object') return out;
    const sel = raw.selections || {};
    for (const s of STEPS) {
      const v = sel[s.key];
      if (v === C.SKIP) out.selections[s.key] = C.SKIP;
      else if (s.multi && Array.isArray(v)) {
        const ok = [...new Set(v)].filter((id) => C.findOption(s.key, id));
        if (ok.length) out.selections[s.key] = ok;
      } else if (!s.multi && C.findOption(s.key, v)) out.selections[s.key] = v;
    }
    const vars = raw.variants || {};
    for (const s of STEPS) {
      const groups = s.variants || (s.variant ? [s.variant] : []);
      for (const g of groups) {
        const id = vars[s.key] && vars[s.key][g.key];
        if (g.options.some((o) => o.id === id)) out.variants[s.key][g.key] = id;
      }
    }
    if (C.styles.some((x) => x.id === raw.style)) out.style = raw.style;
    if (raw.beforeAccessible && typeof raw.beforeAccessible === 'object') out.beforeAccessible = raw.beforeAccessible;
    return out;
  }

  function save() {
    submitted = false; // a changed board can be submitted again
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) { /* storage unavailable */ }
  }
  function load() {
    // A shared link (?board=...) wins over local storage.
    const params = new URLSearchParams(location.search);
    const shared = params.get('board');
    if (shared) {
      try {
        const json = JSON.parse(atob(shared.replace(/-/g, '+').replace(/_/g, '/')));
        state = sanitize({ selections: json.s, variants: json.v, accessible: json.a, style: json.st });
        history.replaceState(null, '', location.pathname + location.hash);
        save();
        return;
      } catch (_) { /* ignore malformed link */ }
    }
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (raw) state = sanitize(raw);
    } catch (_) { /* ignore */ }
  }

  const isAnswered = (s) => {
    const v = state.selections[s.key];
    return v === C.SKIP || (s.multi ? Array.isArray(v) && v.length > 0 : !!v);
  };
  const answeredCount = () => STEPS.filter(isAnswered).length;
  const isComplete = () => answeredCount() === TOTAL;
  const firstUnanswered = () => STEPS.findIndex((s) => !isAnswered(s));

  function selectedOptions(s) {
    const v = state.selections[s.key];
    if (!v || v === C.SKIP) return [];
    return (Array.isArray(v) ? v : [v]).map((id) => C.findOption(s.key, id)).filter(Boolean);
  }
  function variantText(s) {
    const groups = s.variants || (s.variant ? [s.variant] : []);
    return groups.map((g) => {
      const id = state.variants[s.key] && state.variants[s.key][g.key];
      const o = g.options.find((x) => x.id === id) || g.options[0];
      return `${g.label.replace(/\s*\(Optional\)/i, '')}: ${o.name}`;
    }).join(' · ');
  }

  // ---------------------------------------------------------------- routing
  let current = 'start'; // 'start' | number (0-based step) | 'summary'
  function parseHash() {
    const h = location.hash.replace('#', '');
    if (h === 'summary') return 'summary';
    const m = /^step-(\d+)$/.exec(h);
    if (m) {
      const n = Math.min(Math.max(parseInt(m[1], 10) - 1, 0), TOTAL - 1);
      return n;
    }
    return 'start';
  }
  function go(target) {
    const hash = target === 'summary' ? '#summary' : target === 'start' ? '#start' : `#step-${target + 1}`;
    if (location.hash === hash) render(); else location.hash = hash;
  }
  function render() {
    let target = parseHash();
    if (target === 'summary' && !isComplete()) {
      const i = firstUnanswered();
      toast(`Almost there! Finish "${STEPS[i].label}" to see your board.`);
      history.replaceState(null, '', `#step-${i + 1}`);
      target = i;
    }
    current = target;
    $('#view-start').hidden = target !== 'start';
    $('#view-step').hidden = typeof target !== 'number';
    $('#view-summary').hidden = target !== 'summary';
    if (target === 'start') renderStart();
    else if (target === 'summary') renderSummary();
    else renderStep(target);
    renderSidebar();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    $('#main').scrollTop = 0;
  }

  // ---------------------------------------------------------------- sidebar
  function renderSidebar() {
    const n = answeredCount();
    const pct = Math.round((n / TOTAL) * 100);
    $('#ringPct').textContent = `${pct}%`;
    $('#ring').setAttribute('aria-label', `${pct}% complete`);
    $('#ringFg').style.strokeDashoffset = String(97.4 - (97.4 * pct) / 100);
    $('#sbProgress').style.width = `${pct}%`;
    $('#sbCount').textContent = `${n} of ${TOTAL} choices`;
    const status = $('#sbStatus');
    status.textContent = n === TOTAL ? 'Board complete!' : n === 0 ? 'Start picking!' : `${TOTAL - n} to go`;
    status.classList.toggle('done', n === TOTAL);
    $('#readyCard').hidden = n !== TOTAL || current === 'summary';
    $('#accessibleToggle').checked = state.accessible;

    const stepProgress = typeof current === 'number' ? ((current + 1) / TOTAL) * 100 : current === 'summary' ? 100 : 0;
    $('#topProgress').style.width = `${stepProgress}%`;

    const thumbs = $('#thumbs');
    thumbs.replaceChildren(...STEPS.map((s, i) => {
      const opts = selectedOptions(s);
      const skipped = state.selections[s.key] === C.SKIP;
      const cls = ['thumb'];
      if (!opts.length) cls.push('empty');
      if (skipped) cls.push('skipped');
      if (current === i) cls.push('current');
      const label = skipped ? `${s.short}: skipped` : opts.length ? opts.map((o) => o.name).join(', ') : s.short;
      const b = el('button', { type: 'button', class: cls.join(' '), title: `${s.label}: ${label}`, 'aria-label': `${s.label}: ${label}`, onclick: () => go(i) });
      if (opts.length) {
        b.append(el('img', { src: opts[0].image, alt: '', loading: 'lazy' }), el('span', { class: 't-label', text: opts.length > 1 ? `${opts[0].name} +${opts.length - 1}` : opts[0].name }));
      } else {
        b.append(document.createTextNode(skipped ? 'Skipped' : s.short));
      }
      return b;
    }));

    $('#catsList').replaceChildren(...STEPS.map((s, i) => {
      const opts = selectedOptions(s);
      const skipped = state.selections[s.key] === C.SKIP;
      const li = el('li');
      const b = el('button', { type: 'button', class: [current === i ? 'active' : '', opts.length ? 'done' : '', skipped ? 'skip' : ''].join(' ').trim(), onclick: () => { go(i); closeSidebar(); } }, [
        el('span', { class: 'c-num', text: String(i + 1) }),
        el('span', { text: s.short }),
        el('span', { class: 'c-val', text: skipped ? 'Skipped' : opts.map((o) => o.name).join(', ') }),
      ]);
      if (current === i) b.setAttribute('aria-current', 'step');
      li.append(b);
      return li;
    }));
  }

  function flashThumb(i) {
    const t = $$('#thumbs .thumb')[i];
    if (t) { t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); }
  }

  function closeSidebar() {
    $('#sidebar').classList.remove('open');
    $('#sbToggle').setAttribute('aria-expanded', 'false');
  }

  // ---------------------------------------------------------------- start
  function renderStart() {
    $('#styleGrid').replaceChildren(...C.styles.map((st) => {
      const card = el('button', { type: 'button', class: `style-card${state.style === st.id ? ' active' : ''}`, 'aria-label': `${st.name}: ${st.desc}`, onclick: () => applyStyle(st) }, [
        el('img', { src: st.image, alt: '' }),
        st.badge ? el('span', { class: `badge ${st.badgeType === 'designer' ? 'designer' : ''}`, text: `★ ${st.badge}` }) : null,
        el('span', { class: 'sc-text' }, [el('div', { class: 'sc-name', text: st.name }), el('div', { class: 'sc-desc', text: st.desc })]),
      ]);
      return card;
    }));
  }
  function applyStyle(st) {
    state.style = st.id;
    state.selections = JSON.parse(JSON.stringify(st.picks));
    state.variants = defaultVariants();
    state.beforeAccessible = null;
    state.accessible = st.id === 'accessible-comfort';
    save();
    renderStart();
    renderSidebar();
    toast(`${st.name} loaded - customize any category.`);
    setTimeout(() => go(0), AUTO_ADVANCE_MS);
  }

  // ---------------------------------------------------------------- step
  let advanceTimer = null;
  function renderStep(i) {
    clearTimeout(advanceTimer);
    const s = STEPS[i];
    const answered = isAnswered(s);
    $('#stepChip').textContent = `Step ${i + 1} of ${TOTAL}`;
    $('#selectedChip').hidden = !answered;
    $('#stepTitle').textContent = s.label;
    $('#stepSub').textContent = s.subtitle || 'Tap one to add it to your board. It auto-advances - or change anytime.';
    const note = $('#stepNote');
    note.hidden = !s.note;
    note.textContent = s.note || '';

    // Variant pill groups
    const groups = s.variants || (s.variant ? [s.variant] : []);
    $('#variantWrap').replaceChildren(...groups.map((g) => el('div', { class: 'variant', role: 'radiogroup', 'aria-label': g.label }, [
      el('div', { class: 'variant-label', text: g.label }),
      el('div', { class: 'pills' }, g.options.map((o) => {
        const active = state.variants[s.key][g.key] === o.id;
        return el('button', {
          type: 'button', class: `pill${active ? ' active' : ''}`, role: 'radio', 'aria-checked': String(active),
          onclick: () => { state.variants[s.key][g.key] = o.id; save(); renderStep(i); },
        }, [document.createTextNode(o.name), o.desc ? el('small', { text: `· ${o.desc}` }) : null]);
      })),
    ])));

    // Options
    const grid = $('#optionGrid');
    grid.setAttribute('aria-multiselectable', s.multi ? 'true' : 'false');
    grid.setAttribute('aria-label', s.label);
    const v = state.selections[s.key];
    grid.replaceChildren(...s.options.map((o) => {
      const selected = s.multi ? Array.isArray(v) && v.includes(o.id) : v === o.id;
      return el('button', {
        type: 'button', class: `opt${selected ? ' selected' : ''}`, role: 'option', 'aria-selected': String(selected), 'data-id': o.id,
        onclick: () => choose(i, o.id),
      }, [
        el('div', { class: 'o-img' }, [el('img', { src: o.image, alt: '', loading: 'lazy', width: '400', height: '300' })]),
        o.badge ? el('span', { class: `badge ${o.badge === 'designer' ? 'designer' : ''}`, text: o.badge === 'designer' ? "★ Designer's Pick" : '★ Popular' }) : null,
        el('span', { class: 'o-check', 'aria-hidden': 'true' }, [checkIcon()]),
        el('div', { class: 'o-body' }, [el('div', { class: 'o-name', text: o.name }), el('div', { class: 'o-desc', text: o.desc })]),
      ]);
    }));

    const skip = $('#skipCard');
    skip.classList.toggle('selected', v === C.SKIP);
    skip.setAttribute('aria-pressed', String(v === C.SKIP));
    $('#skipText').textContent = `Skip ${s.label.toLowerCase()} - I'm not updating this`;

    $('#backBtn').textContent = i === 0 ? '‹ Styles' : '‹ Back';
    $('#nextBtn').firstChild.textContent = i === TOTAL - 1 ? (isComplete() ? 'View My Board ' : 'Finish ') : 'Next ';

    $('#dots').replaceChildren(...STEPS.map((x, k) => el('span', { class: [k === i ? 'active' : '', isAnswered(x) ? 'done' : ''].join(' ').trim() })));
  }

  function choose(i, id) {
    const s = STEPS[i];
    if (s.multi) {
      let arr = Array.isArray(state.selections[s.key]) ? state.selections[s.key].slice() : [];
      arr = arr.includes(id) ? arr.filter((x) => x !== id) : arr.concat(id);
      if (arr.length) state.selections[s.key] = arr; else delete state.selections[s.key];
      save();
      renderStep(i);
      renderSidebar();
      flashThumb(i);
      return;
    }
    state.selections[s.key] = id;
    save();
    renderStep(i);
    renderSidebar();
    flashThumb(i);
    advanceTimer = setTimeout(() => next(i), AUTO_ADVANCE_MS);
  }
  function skipStep(i) {
    const s = STEPS[i];
    state.selections[s.key] = state.selections[s.key] === C.SKIP ? undefined : C.SKIP;
    if (state.selections[s.key] === undefined) delete state.selections[s.key];
    save();
    renderStep(i);
    renderSidebar();
    if (state.selections[s.key] === C.SKIP) advanceTimer = setTimeout(() => next(i), AUTO_ADVANCE_MS);
  }
  function next(i) {
    if (current !== i) return;
    if (i < TOTAL - 1) return go(i + 1);
    if (isComplete()) return go('summary');
    const k = firstUnanswered();
    toast(`Pick an option for "${STEPS[k].label}" (or mark it "Not in my project").`);
    go(k);
  }

  // ---------------------------------------------------------------- accessible toggle
  function setAccessible(on) {
    if (on === state.accessible) return;
    if (on) {
      state.beforeAccessible = { showerTub: state.selections.showerTub, flooring: state.selections.flooring, accessories: state.selections.accessories };
      state.selections.showerTub = C.accessible.showerTub;
      state.selections.flooring = C.accessible.flooring;
      const acc = Array.isArray(state.selections.accessories) ? state.selections.accessories : [];
      state.selections.accessories = [...new Set(acc.concat(C.accessible.accessories))];
      toast('Accessible upgrades added: walk-in tub, grab bars, seat & non-slip floor.');
    } else {
      const b = state.beforeAccessible || {};
      for (const k of ['showerTub', 'flooring', 'accessories']) {
        if (b[k] === undefined) delete state.selections[k]; else state.selections[k] = b[k];
      }
      state.beforeAccessible = null;
      toast('Accessible upgrades removed.');
    }
    state.accessible = on;
    save();
    render();
  }

  // ---------------------------------------------------------------- summary
  function renderSummary() {
    const n = STEPS.filter((s) => selectedOptions(s).length).length;
    $('#summarySub').textContent = n === TOTAL
      ? `All ${TOTAL} categories selected - your dream bathroom is fully mapped out.`
      : `${n} of ${TOTAL} categories selected - your dream bathroom is mapped out.`;
    $('#boardDate').textContent = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const tiles = [];
    STEPS.forEach((s) => {
      const opts = selectedOptions(s);
      if (!opts.length) return;
      const list = s.multi ? opts : [opts[0]];
      list.forEach((o) => tiles.push(el('figure', { class: 'tile' }, [
        el('img', { src: o.image, alt: `${s.label}: ${o.name}` }),
        el('figcaption', { class: 't-cap' }, [el('div', { class: 't-cat', text: s.short }), el('div', { class: 't-name', text: o.name })]),
      ])));
    });
    $('#boardGrid').replaceChildren(...tiles);

    $('#selList').replaceChildren(...STEPS.map((s, i) => {
      const opts = selectedOptions(s);
      const skipped = state.selections[s.key] === C.SKIP;
      const extra = variantText(s);
      return el('li', {}, [
        opts.length ? el('img', { src: opts[0].image, alt: '' }) : el('img', { src: 'images/favicon.svg', alt: '' }),
        el('div', { class: 's-text' }, [
          el('div', { class: 's-cat', text: s.label }),
          el('div', { class: 's-val', text: skipped ? 'Not in my project' : opts.map((o) => o.name).join(', ') }),
          extra && !skipped ? el('div', { class: 's-extra', text: extra }) : null,
        ]),
        el('button', { type: 'button', class: 's-edit', 'aria-label': `Edit ${s.label}`, onclick: () => go(i), text: 'Edit' }),
        el('span', { class: 's-ok', 'aria-hidden': 'true', text: '✓' }),
      ]);
    }));

    // restore form/success state
    $('#leadForm').hidden = submitted;
    $('#successCard').hidden = !submitted;
  }

  function shareLink() {
    const payload = JSON.stringify({ s: state.selections, v: state.variants, a: state.accessible, st: state.style });
    const b64 = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `${location.origin}${location.pathname}?board=${b64}#summary`;
  }
  async function copyShare() {
    const url = shareLink();
    try {
      await navigator.clipboard.writeText(url);
    } catch (_) {
      const ta = el('textarea', { class: 'hp' }); ta.value = url; document.body.append(ta); ta.select();
      try { document.execCommand('copy'); } catch (__) { /* ignore */ }
      ta.remove();
    }
    $('#shareLabel').textContent = 'Link Copied!';
    toast('Share link copied to clipboard.');
    setTimeout(() => { $('#shareLabel').textContent = 'Copy Share Link'; }, 2200);
  }

  // ---------------------------------------------------------------- form
  const form = $('#leadForm');
  const formStartedAt = Date.now();
  let submissionId = newId();
  let submitting = false;
  let submitted = false;

  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  const NAME_RE = /^[\p{L}][\p{L}\p{M}' .-]{0,49}$/u;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const STATES = new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR'.split(' '));
  const phoneDigits = (v) => {
    const d = String(v || '').replace(/\D/g, '');
    const ten = d.length === 11 && d[0] === '1' ? d.slice(1) : d;
    return /^[2-9]\d{2}[2-9]\d{6}$/.test(ten) ? ten : null;
  };
  const validators = {
    firstName: (v) => (!v.trim() ? 'First name is required.' : NAME_RE.test(v.trim()) ? '' : 'Please enter a valid first name.'),
    lastName: (v) => (!v.trim() ? 'Last name is required.' : NAME_RE.test(v.trim()) ? '' : 'Please enter a valid last name.'),
    email: (v) => (!v.trim() ? 'Email is required.' : EMAIL_RE.test(v.trim()) ? '' : 'Please enter a valid email address.'),
    phone: (v) => (!v.trim() ? 'Phone number is required.' : phoneDigits(v) ? '' : 'Please enter a valid 10-digit US phone number.'),
    zip: (v) => (!v.trim() ? 'ZIP code is required.' : /^\d{5}(-\d{4})?$/.test(v.trim()) ? '' : 'Please enter a valid 5-digit ZIP code.'),
    city: (v) => (!v.trim() ? 'City is required.' : v.trim().length >= 2 ? '' : 'Please enter a valid city.'),
    state: (v) => (!v.trim() ? 'State is required.' : STATES.has(v.trim().toUpperCase()) ? '' : 'Please enter a valid 2-letter state (e.g. CO).'),
    bestTime: () => '',
  };

  function setFieldError(name, msg) {
    const input = form.elements[name];
    if (!input) return;
    const field = input.closest('.field');
    const err = $(`[data-err-for="${name}"]`, form);
    field.classList.toggle('invalid', !!msg);
    field.classList.toggle('valid', !msg && !!input.value.trim());
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) { err.textContent = msg || ''; err.id = `err-${name}`; input.setAttribute('aria-describedby', err.id); }
  }
  function validateField(name) {
    const msg = validators[name](form.elements[name].value);
    setFieldError(name, msg);
    return !msg;
  }
  function validateAll() {
    let firstBad = null;
    for (const name of Object.keys(validators)) {
      if (!validateField(name) && !firstBad) firstBad = name;
    }
    return firstBad;
  }

  function formatPhone(v) {
    const d = v.replace(/\D/g, '').replace(/^1(?=\d{10})/, '').slice(0, 10);
    if (d.length < 4) return d;
    if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }

  function setLoading(on) {
    const btn = $('#submitBtn');
    btn.disabled = on;
    btn.classList.toggle('loading', on);
    btn.setAttribute('aria-busy', String(on));
    $('.btn-label', btn).lastChild.textContent = on ? ' Sending your board…' : ' Show Me My Bathroom Render';
  }
  function showFormError(msg) {
    const box = $('#formError');
    box.textContent = msg || '';
    box.hidden = !msg;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting || submitted) return; // prevent duplicate submissions
    showFormError('');
    const bad = validateAll();
    if (bad) {
      form.elements[bad].focus();
      showFormError('Please correct the highlighted fields.');
      return;
    }
    if (!isComplete()) {
      showFormError('Please finish every category of your vision board first.');
      return;
    }

    const payload = {
      firstName: form.elements.firstName.value.trim(),
      lastName: form.elements.lastName.value.trim(),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
      zip: form.elements.zip.value.trim(),
      city: form.elements.city.value.trim(),
      state: form.elements.state.value.trim().toUpperCase(),
      bestTime: form.elements.bestTime.value,
      website: form.elements.website.value,
      formStartedAt,
      submissionId,
      board: { selections: state.selections, variants: state.variants, accessible: state.accessible, style: state.style },
    };

    submitting = true;
    setLoading(true);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch('/api/submit-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      let data = {};
      try { data = await res.json(); } catch (_) { /* non-JSON */ }

      if (res.ok && data.success) {
        submitted = true;
        submissionId = newId();
        $('#successMsg').textContent = data.message || 'Your vision board is on its way to our design team.';
        form.hidden = true;
        const card = $('#successCard');
        card.hidden = false;
        card.focus();
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (res.status === 409 && data.duplicate) {
        submitted = true;
        form.hidden = true;
        $('#successMsg').textContent = data.message;
        $('#successCard').hidden = false;
        return;
      }
      if (res.status === 422 && data.errors) {
        for (const [k, msg] of Object.entries(data.errors)) {
          if (form.elements[k]) setFieldError(k, msg);
        }
        const boardErr = data.errors.board;
        showFormError(boardErr || data.message || 'Please correct the highlighted fields.');
        const firstKey = Object.keys(data.errors).find((k) => form.elements[k]);
        if (firstKey) form.elements[firstKey].focus();
        return;
      }
      showFormError(data.message || 'Sorry - something went wrong sending your request. Please try again.');
    } catch (err) {
      showFormError(err.name === 'AbortError'
        ? 'The request timed out. Please check your connection and try again.'
        : 'We couldn\'t reach our server. Please check your connection and try again.');
    } finally {
      submitting = false;
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------- toast
  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  // ---------------------------------------------------------------- wire up
  function init() {
    load();

    $('#bestTime').replaceChildren(...C.bestTimes.map((t) => el('option', { value: t, text: t })));

    $('#scratchBtn').addEventListener('click', () => { state.style = null; save(); go(0); });
    $('#skipCard').addEventListener('click', () => typeof current === 'number' && skipStep(current));
    $('#backBtn').addEventListener('click', () => { if (typeof current === 'number') go(current === 0 ? 'start' : current - 1); });
    $('#nextBtn').addEventListener('click', () => { if (typeof current === 'number') { clearTimeout(advanceTimer); next(current); } });
    $('#accessibleToggle').addEventListener('change', (e) => setAccessible(e.target.checked));
    $('#shareBtn').addEventListener('click', copyShare);
    $('#sbToggle').addEventListener('click', () => {
      const open = !$('#sidebar').classList.contains('open');
      $('#sidebar').classList.toggle('open', open);
      $('#sbToggle').setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-go]');
      if (!t) return;
      const g = t.getAttribute('data-go');
      closeSidebar();
      if (g === 'summary') go('summary');
      else if (g.startsWith('step-')) go(parseInt(g.slice(5), 10) - 1);
    });

    // Keyboard: arrows move between steps when not typing
    document.addEventListener('keydown', (e) => {
      if (typeof current !== 'number' || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      if (e.key === 'ArrowRight') next(current);
      if (e.key === 'ArrowLeft') go(current === 0 ? 'start' : current - 1);
    });

    // Form
    form.addEventListener('submit', onSubmit);
    for (const name of Object.keys(validators)) {
      const input = form.elements[name];
      input.addEventListener('blur', () => { if (input.value.trim() || input.closest('.field').classList.contains('invalid')) validateField(name); });
      input.addEventListener('input', () => { if (input.closest('.field').classList.contains('invalid')) validateField(name); });
    }
    form.elements.phone.addEventListener('input', (e) => { e.target.value = formatPhone(e.target.value); });
    form.elements.zip.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/[^\d-]/g, '').slice(0, 10); });
    form.elements.state.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 2); });

    window.addEventListener('hashchange', () => { closeSidebar(); render(); });
    if (!location.hash) history.replaceState(null, '', isComplete() ? '#summary' : answeredCount() ? `#step-${firstUnanswered() + 1}` : '#start');
    render();
  }

  init();
})();
