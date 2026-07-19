// Real guards backed by Passport — req.isAuthenticated()/req.user are
// populated by passport.session() (see routes/admin/index.js), which in
// turn re-fetches the user from the DB on every request via
// config/passport.js's deserializeUser. A deactivated account or role
// change therefore takes effect on the user's very next request.

function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  if (res.flash) res.flash('error', 'Please log in to continue.');
  return res.redirect('/admin/login');
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated() && roles.includes(req.user.role)) return next();
    return res.status(403).render('errors/500', {
      title: 'Forbidden',
      message: 'You do not have permission to perform this action.',
    });
  };
}

// For guest-only pages (the login form) — bounces an already-authenticated
// admin straight to the dashboard instead of showing them a login form.
function requireGuest(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.redirect('/admin');
  }
  next();
}

module.exports = { requireAuth, requireRole, requireGuest };
