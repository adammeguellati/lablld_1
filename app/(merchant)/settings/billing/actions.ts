'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPaymentSource } from '@/lib/wompi'
import { revalidatePath } from 'next/cache'
import type { Plan } from '@/types'

async function getMerchant(userId: string) {
  return createAdminClient().from('merchants').select('*').eq('id', userId).single()
}

export async function changePlanAction(newPlan: Plan): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: merchant } = await getMerchant(user.id)
  if (!merchant?.plan) return { error: 'No hay suscripción activa' }
  if (merchant.plan === newPlan && !merchant.pending_plan) return { error: 'Ya estás en este plan' }

  if (newPlan === 'plus') {
    await createAdminClient().from('merchants').update({ plan: 'plus', pending_plan: null }).eq('id', user.id)
  } else {
    await createAdminClient().from('merchants').update({ pending_plan: 'starter' }).eq('id', user.id)
  }
  revalidatePath('/settings/billing')
  return { error: null }
}

export async function cancelSubscriptionAction(): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: merchant } = await getMerchant(user.id)
  if (!merchant?.plan) return { error: 'No hay suscripción activa' }

  const cancelAt = merchant.subscription_next_billing_at
  await createAdminClient().from('merchants').update({ plan_cancel_at: cancelAt }).eq('id', user.id)
  revalidatePath('/settings/billing')
  return { error: null }
}

export async function revertCancelAction(): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  await createAdminClient().from('merchants').update({ plan_cancel_at: null }).eq('id', user.id)
  revalidatePath('/settings/billing')
  return { error: null }
}

export async function cancelPendingPlanAction(): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  await createAdminClient().from('merchants').update({ pending_plan: null }).eq('id', user.id)
  revalidatePath('/settings/billing')
  return { error: null }
}

export async function updatePaymentMethodAction(cardToken: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: merchant } = await getMerchant(user.id)
  if (!merchant) return { error: 'Cuenta no encontrada' }

  let paymentSourceId: number
  try {
    paymentSourceId = await createPaymentSource(cardToken, merchant.email)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error al guardar tarjeta' }
  }

  await createAdminClient().from('merchants').update({ wompi_payment_source_id: paymentSourceId }).eq('id', user.id)
  revalidatePath('/settings/billing')
  return { error: null }
}
