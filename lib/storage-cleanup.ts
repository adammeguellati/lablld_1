import { createAdminClient } from './supabase/admin'
import { LABELS_BUCKET, labelObjectPath } from './label-path'

// Deleting a row that points at a label leaves the object behind. Nothing ever
// collected them, so every deleted merchant, product or label was one more file
// paid for and — while the bucket was public — still reachable by anyone holding
// the path.
//
// Best-effort by design: a storage failure must never fail the delete that
// called it. The row going is the thing the operator asked for; the object is
// cleanup, and a retry has somewhere to happen (a sweep) while a half-deleted
// merchant does not.
export async function deleteLabelObjects(urls: (string | null | undefined)[]): Promise<number> {
  const paths = [...new Set(urls.map(labelObjectPath).filter((p): p is string => Boolean(p)))]
  if (paths.length === 0) return 0
  try {
    const { data } = await createAdminClient().storage.from(LABELS_BUCKET).remove(paths)
    return data?.length ?? 0
  } catch {
    return 0
  }
}

/** Every label URL a merchant owns, across both tables that store one. */
export async function collectMerchantLabelUrls(merchantId: string): Promise<string[]> {
  const db = createAdminClient()
  const [mp, ml] = await Promise.all([
    db.from('merchant_products').select('label_url').eq('merchant_id', merchantId),
    db.from('merchant_labels').select('label_url').eq('merchant_id', merchantId),
  ])
  const rows = [...(mp.data ?? []), ...(ml.data ?? [])] as { label_url: string | null }[]
  return rows.map((r) => r.label_url).filter((u): u is string => Boolean(u))
}
