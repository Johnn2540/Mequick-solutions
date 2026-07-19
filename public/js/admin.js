// Shared behavior for every /admin page (see views/layouts/admin.hbs).
//
// This app's CSP sets `script-src-attr 'none'`, which silently blocks
// inline event-handler attributes (onsubmit="...", onchange="...") — the
// browser never runs them and raises no visible error, so a delete button
// with onsubmit="return confirm(...)" just submits unconfirmed. Event
// delegation off data attributes replaces every instance of that pattern
// app-wide instead of patching each template with its own inline JS.
document.addEventListener('submit', (event) => {
  const form = event.target.closest('[data-confirm]');
  if (form && !window.confirm(form.dataset.confirm)) {
    event.preventDefault();
  }
});

document.addEventListener('change', (event) => {
  if (event.target.matches('[data-autosubmit]')) {
    event.target.form.submit();
  }
});

document.addEventListener('click', (event) => {
  if (event.target.closest('[data-print]')) {
    window.print();
  }
});

// Role-change confirmation on the user edit form (views/admin/users/form.hbs)
// — prompts only when the role select's value actually differs from what
// it was on page load, not on every save. data-original-role doubles as
// the marker ("this form needs the check") and the value to compare
// against, since it can only ever hold the role it was initialized with.
document.addEventListener('submit', (event) => {
  const form = event.target.closest('[data-original-role]');
  if (!form) return;
  const roleSelect = form.querySelector('#role');
  if (!roleSelect || roleSelect.value === form.dataset.originalRole) return;
  const msg = `Change this user's role from ${form.dataset.originalRole} to ${roleSelect.value}?`;
  if (!window.confirm(msg)) {
    event.preventDefault();
  }
});
