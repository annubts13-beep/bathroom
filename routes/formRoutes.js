'use strict';
const express = require('express');
const { submitForm } = require('../controllers/formController');
const { submitFormRules, handleValidation } = require('../middleware/validation');
const { submitLimiter, honeypot, dedupe } = require('../middleware/spamProtection');

const router = express.Router();

router.post('/submit-form', submitLimiter, honeypot, submitFormRules, handleValidation, dedupe, submitForm);

module.exports = router;
