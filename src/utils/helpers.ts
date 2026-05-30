/**
 * Generate a URL-friendly slug from a string.
 * e.g. "Maybelline Lip Gloss" → "maybelline-lip-gloss"
 */
export const slugify = (str: string): string =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Generate a unique order number.
 * Format: SB-{timestamp}-{random}
 */
export const generateOrderNumber = (): string => {
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `SB-${Date.now()}-${random}`;
};

/**
 * Generate a unique product code.
 * Format: PC-{timestamp}{random}
 */
export const generateProductCode = (): string => {
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PC-${Date.now()}${random}`;
};

/**
 * Build pagination meta from total, page, limit.
 */
export const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number
) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});

/**
 * Parse page and limit from query params with safe defaults.
 */
export const parsePagination = (
  pageStr: unknown,
  limitStr: unknown,
  maxLimit = 100
) => {
  const page = Math.max(1, parseInt(String(pageStr ?? 1), 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(String(limitStr ?? 20), 10) || 20)
  );
  return { page, limit, skip: (page - 1) * limit };
};
