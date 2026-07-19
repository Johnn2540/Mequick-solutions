const passport = require('../../config/passport');
const { DEFAULT_MAX_AGE, REMEMBER_ME_MAX_AGE } = require('../../config/session');
const { logAction } = require('../../services/audit.service');
const AUDIT = require('../../utils/auditActions');

// GET /admin/login
exports.loginForm = (req, res) => {
  res.render('admin/login', { title: 'Admin Login' });
};

// POST /admin/login
exports.login = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      if (res.flash) res.flash('error', info?.message || 'Invalid email or password.');
      return res.redirect('/admin/login');
    }

    // Regenerate the session BEFORE logging in — the standard defense
    // against session fixation. Order matters: regenerate() first creates
    // a brand new session, then req.login() writes the authenticated user
    // into that fresh session (writing it first would just carry the old,
    // pre-auth session id forward).
    req.session.regenerate((regenerateErr) => {
      if (regenerateErr) return next(regenerateErr);

      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);

        req.session.cookie.maxAge = req.body.rememberMe ? REMEMBER_ME_MAX_AGE : DEFAULT_MAX_AGE;

        if (res.flash) res.flash('success', `Welcome back, ${user.name}.`);
        res.redirect('/admin');
      });
    });
  })(req, res, next);
};

// POST /admin/logout
exports.logout = (req, res, next) => {
  const userId = req.user?.id;
  const userName = req.user?.name;

  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr);
      res.clearCookie('qs.sid');
      // Fire-and-forget: the audit write happens after the session cookie
      // is already cleared, so it can't block or fail the actual logout.
      logAction({ req, userId, action: AUDIT.LOGOUT, entityType: 'User', entityId: userId, description: `${userName} logged out.` });
      res.redirect('/admin/login');
    });
  });
};
