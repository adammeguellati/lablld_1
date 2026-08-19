import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ShopifySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; fs_error?: string; fo_webhook_error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sp = await searchParams
  const params = new URLSearchParams()
  if (sp.error) params.set('error', sp.error)
  if (sp.fs_error) params.set('fs_error', sp.fs_error)
  if (sp.fo_webhook_error) params.set('fo_webhook_error', sp.fo_webhook_error)
  const qs = params.toString()
  redirect(`/settings?tab=tiendas${qs ? `&${qs}` : ''}`)
}
