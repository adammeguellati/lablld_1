'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTransaction } from '@/lib/wompi'

export async function checkPaymentStatusAction(
  orderId: string, txId: string
): Promise<{ status: 'paid' | 'payment_failed' | 'pending' }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'pending' }
  const db = createAdminClient()

  const { data: order } = await db.from('orders').select('status').eq('id', orderId).eq('merchant_id', user.id).single()
  if (order?.status === 'paid') return { status: 'paid' }
  if (order?.status === 'payment_failed') return { status: 'payment_failed' }

  try {
    const { status: wompiStatus } = await getTransaction(txId)
    if (wompiStatus === 'APPROVED') {
      await db.from('orders').update({ status: 'paid', wompi_transaction_id: txId }).eq('id', orderId).eq('merchant_id', user.id)
      return { status: 'paid' }
    }
    if (wompiStatus === 'DECLINED' || wompiStatus === 'ERROR') {
      await db.from('orders').update({ status: 'payment_failed', wompi_transaction_id: txId }).eq('id', orderId).eq('merchant_id', user.id)
      return { status: 'payment_failed' }
    }
  } catch { /* ignore */ }
  return { status: 'pending' }
}

export async function rejectQuoteAction(orderId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { error } = await createAdminClient()
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)
    .eq('merchant_id', user.id)
    .eq('status', 'payment_pending')
  return error ? { error: error.message } : {}
}
