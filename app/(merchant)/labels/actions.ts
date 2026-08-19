'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function saveLabelAction(
  labelUrl: string,
  name: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const db = createAdminClient()
  const { error } = await db.from('merchant_labels').insert({
    merchant_id: user.id,
    label_url: labelUrl,
    name: name || null,
    status: 'pending',
  })
  return { error: error?.message ?? null }
}
