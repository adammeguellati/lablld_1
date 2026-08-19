'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createPaymentSource, chargePaymentSource, getPlanPriceCOP,
  createPSETransaction, createNequiTransaction, getTransaction,
  createPaymentLink,
} from '@/lib/wompi'
import { redirect } from 'next/navigation'
import type { Plan } from '@/types'

export async function completeOnboardingAction(
  cardToken: string,
  plan: Plan
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()
  const { data: merchant } = await admin.from('merchants').select('plan, email').eq('id', user.id).single()
  if (!merchant) return { error: 'Cuenta no encontrada' }
  if (merchant.plan) redirect('/dashboard')

  let paymentSourceId: number
  try {
    paymentSourceId = await createPaymentSource(cardToken, merchant.email)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al guardar tarjeta' }
  }

  const amount = getPlanPriceCOP(plan)
  const reference = `sub-${user.id.slice(0, 8)}-${Date.now()}`
  let txStatus: string
  let txId: string
  try {
    const tx = await chargePaymentSource(paymentSourceId, amount, reference, merchant.email)
    txStatus = tx.status; txId = tx.id
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al procesar el pago' }
  }

  if (txStatus === 'DECLINED' || txStatus === 'ERROR') {
    return { error: 'Pago rechazado. Verifica los datos de tu tarjeta e intenta de nuevo.' }
  }

  const today = new Date()
  const nextBilling = new Date(today)
  nextBilling.setDate(nextBilling.getDate() + 30)

  await admin.from('merchants').update({
    wompi_payment_source_id: paymentSourceId, plan, plan_status: 'active',
    subscription_started_at: today.toISOString(),
    subscription_next_billing_at: nextBilling.toISOString().slice(0, 10),
  }).eq('id', user.id)

  await admin.from('orders').insert({
    merchant_id: user.id, status: 'paid', fulfillment_cost: amount,
    wompi_transaction_id: txId, notes: `Suscripción ${plan} — pago inicial`,
  }).select().maybeSingle()

  redirect('/dashboard')
}

export async function initPSEOnboardingAction(opts: {
  bankCode: string; docType: string; docNum: string; plan: Plan
}): Promise<{ paymentUrl: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { paymentUrl: null, error: 'No autenticado' }

  const admin = createAdminClient()
  const { data: merchant } = await admin.from('merchants').select('plan, email').eq('id', user.id).single()
  if (!merchant) return { paymentUrl: null, error: 'Cuenta no encontrada' }
  if (merchant.plan) redirect('/dashboard')

  try {
    const tx = await createPSETransaction({
      amountCOP: getPlanPriceCOP(opts.plan), email: merchant.email,
      bankCode: opts.bankCode, docType: opts.docType, docNum: opts.docNum,
      reference: `sub-${user.id.slice(0, 8)}-${Date.now()}`,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/payment/resultado?plan=${opts.plan}`,
      description: `Suscripción LABLLD Plan ${opts.plan}`,
    })
    return { paymentUrl: tx.paymentUrl, error: null }
  } catch (err) {
    return { paymentUrl: null, error: err instanceof Error ? err.message : 'Error al iniciar PSE' }
  }
}

export async function initNequiOnboardingAction(
  phone: string, plan: Plan
): Promise<{ txId: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { txId: null, error: 'No autenticado' }

  const admin = createAdminClient()
  const { data: merchant } = await admin.from('merchants').select('plan, email').eq('id', user.id).single()
  if (!merchant) return { txId: null, error: 'Cuenta no encontrada' }
  if (merchant.plan) redirect('/dashboard')

  try {
    const tx = await createNequiTransaction({
      amountCOP: getPlanPriceCOP(plan), email: merchant.email, phone,
      reference: `sub-${user.id.slice(0, 8)}-${Date.now()}`,
    })
    return { txId: tx.id, error: null }
  } catch (err) {
    return { txId: null, error: err instanceof Error ? err.message : 'Error al iniciar Nequi' }
  }
}

export async function createOnboardingPaymentLinkAction(
  plan: Plan
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { url: null, error: 'No autenticado' }

  const admin = createAdminClient()
  const { data: merchant } = await admin.from('merchants').select('plan').eq('id', user.id).single()
  if (!merchant) return { url: null, error: 'Cuenta no encontrada' }
  if (merchant.plan) return { url: null, error: 'Ya tienes un plan activo' }

  try {
    const price = getPlanPriceCOP(plan)
    const planLabel = plan === 'starter' ? 'Esencial' : 'Pro'
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/payment/resultado?plan=${plan}`
    const { url } = await createPaymentLink({
      name: `Plan ${planLabel} - LABLLD`,
      description: `Suscripción mensual Plan ${planLabel}`,
      amountCOP: price,
      redirectUrl,
    })
    return { url, error: null }
  } catch (err) {
    return { url: null, error: err instanceof Error ? err.message : 'Error al crear link de pago' }
  }
}

export async function activateFromTransactionAction(
  txId: string, plan: Plan
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  try {
    const { status } = await getTransaction(txId)
    if (status !== 'APPROVED') return { error: 'El pago aún no ha sido aprobado' }
  } catch {
    return { error: 'Error al verificar el pago' }
  }

  const today = new Date()
  const nextBilling = new Date(today)
  nextBilling.setDate(nextBilling.getDate() + 30)

  await createAdminClient().from('merchants').update({
    plan, plan_status: 'active',
    subscription_started_at: today.toISOString(),
    subscription_next_billing_at: nextBilling.toISOString().slice(0, 10),
  }).eq('id', user.id)

  redirect('/dashboard')
}
