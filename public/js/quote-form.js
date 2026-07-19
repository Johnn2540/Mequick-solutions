// Dynamic add/remove product rows for the public "Request a Quote" form.
// Row `name` attributes are always kept as a gap-free `items[0]`, `items[1]`, ...
// sequence — qs (the query-string parser express.urlencoded uses) turns a
// sparse indexed array into one with holes, and the server's items validation
// assumes every index holds a real object, so a gap would 500 the request.
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('quote-items');
  const addBtn = document.getElementById('add-item-btn');
  const template = document.getElementById('quote-item-template');
  if (!container || !addBtn || !template) return;

  function syncCustomNameField(row) {
    const select = row.querySelector('.product-select');
    const customInput = row.querySelector('.custom-name-input');
    if (!select || !customInput) return;
    const isCustom = select.value === 'custom';
    customInput.classList.toggle('d-none', !isCustom);
    customInput.required = isCustom;
    if (!isCustom) customInput.value = '';
  }

  function reindexRows() {
    const rows = container.querySelectorAll('.quote-item-row');
    rows.forEach((row, index) => {
      row.dataset.index = index;
      row.querySelectorAll('[name]').forEach((field) => {
        const match = field.name.match(/^items\[[^\]]*\]\[(\w+)\]$/);
        if (match) field.name = `items[${index}][${match[1]}]`;
      });
      const removeBtn = row.querySelector('.remove-item-btn');
      if (removeBtn) removeBtn.disabled = rows.length <= 1;
    });
  }

  container.querySelectorAll('.quote-item-row').forEach(syncCustomNameField);
  reindexRows();

  addBtn.addEventListener('click', () => {
    const clone = template.content.cloneNode(true);
    container.appendChild(clone);
    reindexRows();
  });

  container.addEventListener('change', (event) => {
    if (event.target.classList.contains('product-select')) {
      syncCustomNameField(event.target.closest('.quote-item-row'));
    }
  });

  container.addEventListener('click', (event) => {
    const removeBtn = event.target.closest('.remove-item-btn');
    if (!removeBtn) return;
    const row = removeBtn.closest('.quote-item-row');
    if (container.querySelectorAll('.quote-item-row').length <= 1) return;
    row.remove();
    reindexRows();
  });
});
