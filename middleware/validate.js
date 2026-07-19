const { validationResult } = require('express-validator');

// Runs after an express-validator chain. On failure, flashes a combined
// error message and bounces the user back to the form they submitted.
// NOTE: this loses their input (no sticky form re-population) — acceptable
// for an admin-only MVP; revisit if that friction becomes a real problem.
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const message = errors
    .array()
    .map((e) => e.msg)
    .join(' ');

  if (res.flash) res.flash('error', message);
  return res.redirect(req.get('Referer') || '/admin');
}

module.exports = handleValidation;
