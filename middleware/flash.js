// Minimal one-time flash message, stored in the session so it survives a
// redirect. No extra dependency (connect-flash) needed for one field.
function flash(req, res, next) {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;

  res.flash = (type, message) => {
    req.session.flash = { type, message };
  };

  next();
}

module.exports = flash;
