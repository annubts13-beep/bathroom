'use strict';
const { body, validationResult } = require('express-validator');
const catalog = require('../shared/catalog');

const US_STATES = new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR'.split(' '));
const NAME_RE = /^[\p{L}][\p{L}\p{M}' .-]{0,49}$/u;

/** Normalise a US phone number to its 10 digits, or return null. */
function phoneDigits(v) {
  const d = String(v || '').replace(/\D/g, '');
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(ten) ? ten : null;
}

function validateBoard(board) {
  if (!board || typeof board !== 'object') throw new Error('Your vision board is missing.');
  const sel = board.selections;
  if (!sel || typeof sel !== 'object') throw new Error('Your vision board is missing.');

  for (const step of catalog.steps) {
    const v = sel[step.key];
    if (step.multi) {
      if (v === catalog.SKIP) continue;
      if (!Array.isArray(v) || v.length === 0) throw new Error(`Please choose at least one option for ${step.label} (or mark it "Not in my project").`);
      if (v.length > step.options.length) throw new Error(`Invalid ${step.label} selection.`);
      for (const id of v) if (!catalog.findOption(step.key, id)) throw new Error(`Invalid ${step.label} selection.`);
      if (new Set(v).size !== v.length) throw new Error(`Duplicate ${step.label} selection.`);
    } else {
      if (v === undefined || v === null || v === '') throw new Error(`Please make a choice for ${step.label}.`);
      if (v !== catalog.SKIP && !catalog.findOption(step.key, v)) throw new Error(`Invalid ${step.label} selection.`);
    }
  }
  for (const key of Object.keys(sel)) {
    if (!catalog.findStep(key)) throw new Error('Unknown board category.');
  }

  // Optional variants (panel etch, glass type, v-groove)
  const variants = board.variants || {};
  if (typeof variants !== 'object') throw new Error('Invalid options.');
  for (const step of catalog.steps) {
    const groups = step.variants || (step.variant ? [step.variant] : []);
    for (const g of groups) {
      const chosen = variants[step.key] && variants[step.key][g.key];
      if (chosen !== undefined && !g.options.some((o) => o.id === chosen)) throw new Error(`Invalid ${g.label} option.`);
    }
  }
  if (board.style !== undefined && board.style !== null && !catalog.styles.some((s) => s.id === board.style)) {
    throw new Error('Invalid style.');
  }
  if (board.accessible !== undefined && typeof board.accessible !== 'boolean') throw new Error('Invalid accessibility flag.');
  return true;
}

const submitFormRules = [
  body('firstName').exists({ values: 'falsy' }).withMessage('First name is required.').bail()
    .isString().trim().matches(NAME_RE).withMessage('Please enter a valid first name.'),
  body('lastName').exists({ values: 'falsy' }).withMessage('Last name is required.').bail()
    .isString().trim().matches(NAME_RE).withMessage('Please enter a valid last name.'),
  body('email').exists({ values: 'falsy' }).withMessage('Email is required.').bail()
    .isString().trim().isLength({ max: 254 }).isEmail().withMessage('Please enter a valid email address.').bail()
    .normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false }),
  body('phone').exists({ values: 'falsy' }).withMessage('Phone number is required.').bail()
    .isString().custom((v) => phoneDigits(v) !== null).withMessage('Please enter a valid 10-digit US phone number.')
    .customSanitizer((v) => {
      const d = phoneDigits(v);
      if (!d) return v;
      return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    }),
  body('zip').exists({ values: 'falsy' }).withMessage('ZIP code is required.').bail()
    .isString().trim().matches(/^\d{5}(-\d{4})?$/).withMessage('Please enter a valid 5-digit ZIP code.'),
  body('city').exists({ values: 'falsy' }).withMessage('City is required.').bail()
    .isString().trim().isLength({ min: 2, max: 60 }).withMessage('Please enter a valid city.')
    .matches(/^[\p{L}][\p{L}\p{M}' .-]*$/u).withMessage('Please enter a valid city.'),
  body('state').exists({ values: 'falsy' }).withMessage('State is required.').bail()
    .isString().trim().toUpperCase().custom((v) => US_STATES.has(v)).withMessage('Please enter a valid 2-letter state (e.g. CO).'),
  body('bestTime').optional({ values: 'falsy' }).isString().isIn(catalog.bestTimes).withMessage('Please choose a valid time to call.'),
  body('board').custom(validateBoard),
  body('submissionId').optional().isString().isLength({ min: 8, max: 64 }).matches(/^[\w-]+$/),
];

function handleValidation(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = {};
  for (const e of result.array({ onlyFirstError: true })) {
    if (!errors[e.path]) errors[e.path] = e.msg;
  }
  return res.status(422).json({ success: false, message: 'Please correct the highlighted fields.', errors });
}

module.exports = { submitFormRules, handleValidation, phoneDigits, validateBoard, US_STATES };
