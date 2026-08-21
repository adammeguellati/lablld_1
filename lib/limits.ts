// Limits that are BOTH enforced in code and displayed on screen. They live
// outside any 'use server' module (which cannot export a plain constant) so the
// check and the copy can never state different numbers.

/** Mockup renders per merchant per calendar month. Adam ruling 2026-08-21. */
export const MOCKUP_LIMIT = 6

/**
 * Label artwork limits, shared by both uploaders since Adam's ruling of
 * 2026-08-21 made them agree. The bucket enforces the same ceiling server-side;
 * see supabase/migrations/0004_labels_bucket_limits.sql. The client checks are a
 * Spanish error message, not the boundary.
 */
export const LABEL_MAX_MB = 10
export const LABEL_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'] as const
export const LABEL_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
export const LABEL_ACCEPT_ATTR = LABEL_MIME_TYPES.join(',')
export const LABEL_TYPES_COPY = 'JPG, PNG, WebP o PDF'
