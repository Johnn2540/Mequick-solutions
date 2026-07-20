// Global front-end behaviour shared across all pages.
document.addEventListener('DOMContentLoaded', () => {
  // Enable Bootstrap tooltips anywhere they're used.
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
    // eslint-disable-next-line no-undef
    new bootstrap.Tooltip(el);
  });

  // Respect prefers-reduced-motion for any auto-playing carousel (e.g. the
  // homepage testimonials slider) — same care already given to the
  // partners marquee's pure-CSS animation, just via the Carousel API since
  // this one is JS-driven. Manual prev/next/indicator navigation still
  // works; only the automatic sliding is suppressed.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.carousel[data-bs-ride]').forEach((el) => {
      // eslint-disable-next-line no-undef
      bootstrap.Carousel.getOrCreateInstance(el).pause();
    });
  }
});
