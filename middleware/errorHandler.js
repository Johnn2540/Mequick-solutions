// 404 — reached when no route matched. Must be registered after all routes.
function notFound(req, res, next) {
  res.status(404).render('errors/404', {
    title: 'Page Not Found',
  });
}

// Central error handler — must be registered last (4-arg signature is what
// tells Express this is an error-handling middleware).
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // A CSRF failure usually just means a form sat open too long or the
  // visitor's session cookie was cleared — not worth a scary error page.
  // Bounce them back with an explanation instead.
  if (err.code === 'EBADCSRFTOKEN') {
    console.warn(`[${new Date().toISOString()}] CSRF validation failed for ${req.method} ${req.originalUrl}`);
    if (req.originalUrl.startsWith('/admin')) {
      if (res.flash) res.flash('error', 'Your session expired or the form was submitted twice. Please try again.');
      return res.redirect(req.get('Referer') || '/admin/login');
    }
    // Public forms (Contact, Request a Quote) have no session/flash
    // mechanism to carry a message across the redirect — bounce back to the
    // form itself with a query flag the page checks to show an inline notice.
    const fallback = req.originalUrl.startsWith('/request-quote') ? '/request-quote' : '/contact';
    return res.redirect(`${fallback}?csrfError=1`);
  }

  const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} →`, err);

  res.status(statusCode).render('errors/500', {
    title: statusCode === 500 ? 'Server Error' : 'Something Went Wrong',
    message: process.env.NODE_ENV === 'production' ? null : err.message,
  });
}

module.exports = { notFound, errorHandler };
