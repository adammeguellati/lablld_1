'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createPaymentSource, chargePaymentSource,
  createPSETransaction, createNequiTransaction, getTransaction,
} from '@/lib/wompi'

async function getCtx(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const [{ data: order }, { data: merchant }] = await Promise.all([
    db.from('orders').select('id, fulfillment_cost, shopify_order_id').eq('id', orderId).eq('merchant_id', user.id).single(),
    db.from('merchants').select('id, email').eq('id', user.id).single(),
  ])
  if (!order || !merchant) return null
  return { order, merchant, userId: user.id, db }
}

export async function payOrderWithCardAction(
  orderId: string, cardToken: string, savePM: boolean
): Promise<{ error: string | null }> {
  const ctx = await getCtx(orderId)
  if (!ctx) return { error: 'No autorizado' }
  const { order, merchant, userId, db } = ctx

  let sourceId: number
  try {
    sourceId = await createPaymentSource(cardToken, merchant.email)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al procesar tarjeta' }
  }

  if (savePM) {
    await db.from('merchants').update({ wompi_payment_source_id: sourceId }).eq('id', userId)
  }

  const ref = `ord_${orderId}`
  try {
    const tx = await chargePaymentSource(sourceId, order.fulfillment_cost ?? 0, ref, merchant.email)
    const status = tx.status === 'APPROVED' ? 'paid' : tx.status === 'DECLINED' ? 'payment_failed' : 'payment_pending'
    await db.from('orders').update({ status, wompi_transaction_id: tx.id }).eq('id', orderId)
    if (status === 'paid') redirect('/orders')
    if (status === 'payment_failed') return { error: 'Pago rechazado. Intenta con otra tarjeta.' }
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al cobrar' }
  }
}

export async function initPSEOrderPaymentAction(
  orderId: string, bankCode: string, docType: string, docNum: string
): Promise<{ paymentUrl: string | null; error: string | null }> {
  const ctx = await getCtx(orderId)
  if (!ctx) return { paymentUrl: null, error: 'No autorizado' }
  const { order, merchant } = ctx

  try {
    const tx = await createPSETransaction({
      amountCOP: order.fulfillment_cost ?? 0, email: merchant.email,
      bankCode, docType, docNum,
      reference: `ord_${orderId}`,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}/pay/resultado`,
      description: `Orden LABLLD ${orderId.slice(0, 8)}`,
    })
    return { paymentUrl: tx.paymentUrl, error: null }
  } catch (err) {
    return { paymentUrl: null, error: err instanceof Error ? err.message : 'Error al iniciar PSE' }
  }
}

export async function initNequiOrderPaymentAction(
  orderId: string, phone: string
): Promise<{ txId: string | null; error: string | null }> {
  const ctx = await getCtx(orderId)
  if (!ctx) return { txId: null, error: 'No autorizado' }
  const { order, merchant } = ctx

  try {
    const tx = await createNequiTransaction({
      amountCOP: order.fulfillment_cost ?? 0, email: merchant.email, phone,
      reference: `ord_${orderId}`,
    })
    return { txId: tx.id, error: null }
  } catch (err) {
    return { txId: null, error: err instanceof Error ? err.message : 'Error al iniciar Nequi' }
  }
}

export async function activateNequiOrderPaymentAction(
  orderId: string, txId: string
): Promise<{ error: string | null }> {
  const ctx = await getCtx(orderId)
  if (!ctx) return { error: 'No autorizado' }

  try {
    const { status } = await getTransaction(txId)
    if (status !== 'APPROVED') return { error: 'El pago aún no ha sido aprobado' }
  } catch {
    return { error: 'Error al verificar el pago' }
  }

  await ctx.db.from('orders').update({ status: 'paid', wompi_transaction_id: txId }).eq('id', orderId)
  redirect('/orders')
}
