const slugify = require('./slugify');

/**
 * Generates a slug from `name` and appends -2, -3, ... until it no longer
 * collides with an existing row (excluding `excludeId`, for updates).
 * @param {import('@prisma/client').PrismaClient[keyof import('@prisma/client').PrismaClient]} model - a Prisma model delegate, e.g. prisma.category
 * @param {string} name
 * @param {string} [excludeId]
 */
async function generateUniqueSlug(model, name, excludeId) {
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await model.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

module.exports = generateUniqueSlug;
