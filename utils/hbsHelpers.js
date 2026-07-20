// Registers small, reusable Handlebars helpers used across views.
// Kept deliberately minimal — add more here as templates need them.
function registerHelpers(hbs) {
  // {{#eq a b}}...{{/eq}} — block helper for equality checks (hbs has no built-in comparison helpers)
  hbs.registerHelper('eq', function (a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
  });

  // {{#if (eqVal a b)}}...{{/if}} — plain (non-block) equality check for use
  // as a subexpression, e.g. inside a class-attribute conditional. `eq` above
  // can't fill that role: as a subexpression it's called without .fn/.inverse
  // and throws.
  hbs.registerHelper('eqVal', function (a, b) {
    return a === b;
  });

  // {{formatCurrency price}} → "KES 1,250.00"
  hbs.registerHelper('formatCurrency', function (value) {
    if (value === null || value === undefined || value === '') return 'Contact for price';
    const amount = Number(value);
    if (Number.isNaN(amount)) return 'Contact for price';
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
    }).format(amount);
  });

  // {{truncate text 120}}
  hbs.registerHelper('truncate', function (text, length) {
    if (!text) return '';
    const limit = typeof length === 'number' ? length : 100;
    return text.length > limit ? `${text.slice(0, limit).trim()}…` : text;
  });

  // {{year}} — current year, used in the footer copyright line
  hbs.registerHelper('year', () => new Date().getFullYear());

  // {{waLink phone message}} — builds a wa.me deep link with a prefilled message.
  // When called with just `phone` (no message), Handlebars still appends its
  // internal options object as the final argument — a `message || default`
  // check would see that object as truthy and stringify it to "[object
  // Object]", so this must check for an actual string instead.
  hbs.registerHelper('waLink', function (phone, message) {
    const text = encodeURIComponent(
      typeof message === 'string' ? message : 'Hello, I would like to enquire about your products.'
    );
    return `https://wa.me/${phone}?text=${text}`;
  });

  // {{productEnquiryLink phone productName}} — wa.me link prefilled for a specific product
  hbs.registerHelper('productEnquiryLink', function (phone, productName) {
    const text = encodeURIComponent(`Hello, I would like to enquire about the ${productName}.`);
    return `https://wa.me/${phone}?text=${text}`;
  });

  // {{#gt a b}}...{{/gt}} — block helper for "greater than" comparisons
  hbs.registerHelper('gt', function (a, b, options) {
    return a > b ? options.fn(this) : options.inverse(this);
  });

  // {{paginationUrl baseUrl filters pageNumber}} — rebuilds a page's query
  // string with an updated `page` param while preserving active filters.
  hbs.registerHelper('paginationUrl', function (baseUrl, filters, pageNumber) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set('page', pageNumber);
    return `${baseUrl}?${params.toString()}`;
  });

  // {{flashClass type}} → maps a flash message type to a Bootstrap alert class
  hbs.registerHelper('flashClass', function (type) {
    if (type === 'success') return 'success';
    if (type === 'error') return 'danger';
    return 'info';
  });

  // {{concat "a" "b" "c"}} → "abc" — joins any number of string arguments.
  // The last argument is always Handlebars' options object, so it's dropped.
  hbs.registerHelper('concat', function (...args) {
    return args.slice(0, -1).join('');
  });

  // {{hash key=value key2=value2}} → { key: value, key2: value2 }
  // Lets a subexpression build a plain object inline, e.g. to pass a small
  // filters map into the `pagination` partial without a dedicated local.
  hbs.registerHelper('hash', function (options) {
    return options.hash;
  });

  // {{auditBadgeClass action}} → Bootstrap badge color for an AuditLog action
  hbs.registerHelper('auditBadgeClass', function (action) {
    if (!action) return 'secondary';
    if (action.includes('DELETE') || action.includes('FAILURE')) return 'danger';
    if (action.includes('CREATE') || action.includes('SUCCESS')) return 'success';
    if (action.includes('UPDATE') || action.includes('CHANGE')) return 'primary';
    return 'secondary';
  });

  // {{encodeUri str}} → URI-encodes a value for safe use inside a query string
  hbs.registerHelper('encodeUri', function (str) {
    return encodeURIComponent(str || '');
  });

  // {{fieldError errors "email"}} → the express-validator message for that
  // field's `path`, or '' if there isn't one. Used to drive `is-invalid`
  // classes and `invalid-feedback` text on public-facing forms.
  hbs.registerHelper('fieldError', function (errors, field) {
    if (!errors || !Array.isArray(errors)) return '';
    const match = errors.find((e) => e.path === field);
    return match ? match.msg : '';
  });

  // {{inc @index}} → @index + 1, for 1-based labels/numbering in a loop.
  hbs.registerHelper('inc', function (value) {
    return Number(value) + 1;
  });

  // {{{stars rating}}} → filled/empty Bootstrap star icons for a 1-5 rating.
  // Triple-stash required (returns markup, not escaped text). Anything
  // falsy renders 5 empty stars rather than nothing, so a testimonial
  // without a rating set still shows a consistent-looking row.
  hbs.registerHelper('stars', function (rating) {
    const filled = Math.max(0, Math.min(5, Number(rating) || 0));
    let html = '';
    for (let i = 0; i < 5; i += 1) {
      html += i < filled ? '<i class="bi bi-star-fill"></i>' : '<i class="bi bi-star"></i>';
    }
    return new hbs.SafeString(html);
  });

  // {{#if (any a b c)}} — true if any argument is truthy. Plain (not block)
  // so it can be used as a subexpression inside {{#if}}.
  hbs.registerHelper('any', function (...args) {
    const values = args.slice(0, -1);
    return values.some(Boolean);
  });

  // {{#if (startsWith currentPath "/admin/products")}} — plain prefix check,
  // used to highlight a whole sidebar section (list + new + edit pages) as
  // active, not just an exact-match page. Plain (not block) so it can be
  // used as a subexpression inside {{#if}}.
  hbs.registerHelper('startsWith', function (str, prefix) {
    return typeof str === 'string' && str.startsWith(prefix);
  });
}

module.exports = registerHelpers;
