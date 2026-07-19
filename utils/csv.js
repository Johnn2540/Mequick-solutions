/**
 * Builds a CSV string from an array of row objects. Any value containing a
 * comma, quote, or newline is wrapped in quotes with internal quotes
 * doubled, per RFC 4180 — the minimum needed for the output to survive a
 * round-trip through Excel/Sheets without silently corrupting a column.
 */
function toCsv(rows, columns) {
  const escape = (value) => {
    const str = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const header = columns.map((col) => escape(col.label)).join(',');
  const lines = rows.map((row) => columns.map((col) => escape(col.value(row))).join(','));
  return [header, ...lines].join('\r\n');
}

module.exports = { toCsv };
