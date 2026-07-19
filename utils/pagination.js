const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 48;

/**
 * Normalizes a `?page=` query param and derives Prisma `skip`/`take` values.
 * @param {string|number} rawPage
 * @param {number} [pageSize]
 */
function getPageParams(rawPage, pageSize = DEFAULT_PAGE_SIZE) {
  const size = Math.min(Math.max(Number(pageSize) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const page = Math.max(Number.parseInt(rawPage, 10) || 1, 1);
  return { page, size, skip: (page - 1) * size, take: size };
}

/** Builds the pagination metadata object handed to templates. */
function buildPagination(page, size, totalCount) {
  const totalPages = Math.max(Math.ceil(totalCount / size), 1);
  const current = Math.min(page, totalPages);
  return {
    page: current,
    totalPages,
    totalCount,
    hasPrev: current > 1,
    hasNext: current < totalPages,
    prevPage: current - 1,
    nextPage: current + 1,
    pages: Array.from({ length: totalPages }, (_, i) => ({ number: i + 1, isCurrent: i + 1 === current })),
  };
}

module.exports = { getPageParams, buildPagination, DEFAULT_PAGE_SIZE };
