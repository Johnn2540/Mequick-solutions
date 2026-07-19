// Global front-end behaviour shared across all pages.
document.addEventListener('DOMContentLoaded', () => {
  // Enable Bootstrap tooltips anywhere they're used.
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
    // eslint-disable-next-line no-undef
    new bootstrap.Tooltip(el);
  });
});
