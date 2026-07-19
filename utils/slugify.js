// Converts a string into a URL-safe slug: "Theatre & ICU Equipment" -> "theatre-icu-equipment"
function slugify(text) {
  return text
    .toString()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents (combining diacritical marks left by NFKD)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // drop everything but letters, numbers, spaces, hyphens
    .replace(/[\s_-]+/g, '-') // collapse whitespace/underscores/hyphens
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
}

module.exports = slugify;
