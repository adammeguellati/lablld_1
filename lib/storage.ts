import { createAdminClient } from './supabase/admin'
import { LABELS_BUCKET, LABEL_VIEW_TTL, labelObjectPath } from './label-path'

export { LABEL_VIEW_TTL, LABEL_FETCH_TTL, labelObjectPath } from './label-path'

// Falls back to the stored URL on every failure path, which is what lets the
// same code serve a public bucket and a private one. Before the flip the
// fallback is never needed; after it, a failure degrades to a broken image
// rather than a crash, and never to a blank page.
export async function signLabelUrl(
  url: string | null | undefined,
  expiresIn: number = LABEL_VIEW_TTL,
): Promise<string | null> {
  if (!url) return null
  const path = labelObjectPath(url)
  if (!path) return url
  try {
    const { data } = await createAdminClient()
      .storage.from(LABELS_BUCKET)
      .createSignedUrl(path, expiresIn)
    return data?.signedUrl ?? url
  } catch {
    return url
  }
}

export async function signLabelUrls(
  urls: (string | null | undefined)[],
  expiresIn: number = LABEL_VIEW_TTL,
): Promise<(string | null)[]> {
  return Promise.all(urls.map((u) => signLabelUrl(u, expiresIn)))
}
