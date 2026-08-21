'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Resend } from 'resend'
import { isAdmin } from '@/lib/utils'
import { ADMIN_EMAIL_LIST } from '@/lib/utils'

export async function disconnectShopifyAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase.from('shopify_stores').delete().eq('merchant_id', user.id)
  await supabase.from('merchants').update({ shopify_connected: false }).eq('id', user.id)

  redirect('/settings?tab=tiendas')
}

export async function requestShopifyConnectionAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || isAdmin(user.email)) return { error: 'No autorizado' }

  const subdomain = (formData.get('subdomain') as string ?? '').trim().toLowerCase()
  if (!subdomain || !/^[a-zA-Z0-9-]+$/.test(subdomain)) {
    return { error: 'Ingresa un subdominio válido (solo letras, números y guiones).' }
  }
  const shopDomain = `${subdomain}.myshopify.com`

  const db = createAdminClient()
  const existing = await db.from('shopify_stores').select('id').eq('shop_domain', shopDomain).maybeSingle()
  if (existing.data) return { error: 'Esta tienda ya está conectada a otra cuenta.' }

  const { data: merchant } = await db.from('merchants').select('full_name, email').eq('id', user.id).single()

  await db.from('merchants').update({ shopify_request_domain: shopDomain }).eq('id', user.id)

  if (ADMIN_EMAIL_LIST.length && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'LABLLD <noreply@lablld.com>',
      to: [...ADMIN_EMAIL_LIST],
      subject: `Solicitud de conexión Shopify — ${shopDomain}`,
      html: `<p><strong>${merchant?.full_name ?? user.email}</strong> (${merchant?.email ?? user.email}) solicita conectar la tienda <strong>${shopDomain}</strong>.<br>Merchant ID: ${user.id}</p>`,
    }).catch(() => {})
  }

  return { success: true }
}
