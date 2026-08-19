'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/utils'
import { Resend } from 'resend'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) redirect('/login')
  return user
}

export async function sendShopifyLinkAction(merchantId: string): Promise<{ error?: string; sent?: boolean }> {
  await requireAdmin()
  const db = createAdminClient()

  const { data: merchant } = await db
    .from('merchants')
    .select('email, full_name, shopify_request_domain')
    .eq('id', merchantId)
    .single()

  if (!merchant?.shopify_request_domain) return { error: 'Sin dominio de solicitud.' }
  if (!merchant.email) return { error: 'Merchant sin email.' }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const installUrl = `${appUrl}/api/shopify/auth?shop=${merchant.shopify_request_domain}`
  const firstName = merchant.full_name?.split(' ')[0] ?? 'Merchant'

  if (!process.env.RESEND_API_KEY) return { error: 'RESEND_API_KEY no configurado.' }
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'LABLLD <noreply@lablld.com>',
    to: merchant.email,
    subject: 'Tu enlace de instalación para conectar Shopify',
    html: `<p>¡Hola ${firstName}!</p>
<p>Tu solicitud para conectar <strong>${merchant.shopify_request_domain}</strong> ha sido aprobada.</p>
<p>Haz clic en el siguiente enlace para completar la instalación:</p>
<p><a href="${installUrl}" style="background:#111;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Instalar LABLLD en Shopify →</a></p>
<p>El enlace es válido y único para tu cuenta. Asegúrate de estar conectado a LABLLD cuando lo uses.</p>
<p>Equipo LABLLD</p>`,
  })

  return { sent: true }
}

export async function dismissShopifyRequestAction(merchantId: string): Promise<{ error?: string }> {
  await requireAdmin()
  const { error } = await createAdminClient()
    .from('merchants')
    .update({ shopify_request_domain: null })
    .eq('id', merchantId)
  return error ? { error: error.message } : {}
}
