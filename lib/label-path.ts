export const LABELS_BUCKET = 'labels'
const PUBLIC_MARKER = `/storage/v1/object/public/${LABELS_BUCKET}/`

// An hour covers a page view and any reload of it. Ten minutes is enough for an
// external renderer to fetch the artwork once and is not worth handing out for
// longer, since that URL leaves our control.
export const LABEL_VIEW_TTL = 60 * 60
export const LABEL_FETCH_TTL = 60 * 10

// merchant_products.label_url and merchant_labels.label_url store the PUBLIC
// form of the URL and are matched on for equality in three places, so the stored
// value is an identity as much as a locator and must stay stable. Signing
// happens at render, from the object path recovered here.
//
// Pure and dependency-free so it can be exercised directly. Returns null for
// anything that is not a labels-bucket URL, which is what keeps product-images
// out of the signing path.
export function labelObjectPath(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = url.indexOf(PUBLIC_MARKER)
  if (marker === -1) return null
  const path = url.slice(marker + PUBLIC_MARKER.length).split('?')[0]
  return path ? decodeURIComponent(path) : null
}
