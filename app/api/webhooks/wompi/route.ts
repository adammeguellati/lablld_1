import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyWompiEvent } from '@/lib/wompi'

interface WompiTransaction {
  id: string
  status: string
  amount_in_cents: number
  currency: string
  payment_method_type: string
  reference: string
  payment_link_id?: string
}

interface WompiEvent {
  event: string
  data: { transaction: WompiTransaction }
  signature: { checksum: string; properties: string[] }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as WompiEvent
  const { transaction } = body.data

  const sig = body.signature as { checksum?: string; properties?: string[] } | undefined
  const checksum = sig?.checksum ?? req.headers.get('x-event-checksum') ?? ''
  const properties = sig?.properties ?? []

  if (!properties.length || !checksum) {
    return NextResponse.json({ error: 'Sin firma' }, { status: 401 })
  }

  if (!verifyWompiEvent(transaction as unknown as Record<string, string | number>, properties, checksum)) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
  }

  const db = createAdminClient()

  if (body.event === 'transaction.updated') {
    const { status, reference, id, payment_link_id } = transaction
    const newOrderStatus = status === 'APPROVED' ? 'paid' : status === 'DECLINED' ? 'payment_failed' : null

    if (payment_link_id) {
      if (newOrderStatus) {
        await db.from('orders')
          .update({ status: newOrderStatus, wompi_transaction_id: id })
          .eq('payment_link_id', payment_link_id)
      }
    } else if (reference.startsWith('ord_')) {
      const orderId = reference.slice(4)
      if (newOrderStatus) {
        await db.from('orders')
          .update({ status: newOrderStatus, wompi_transaction_id: id })
          .eq('id', orderId)
      }
    } else if (reference.startsWith('renewal-')) {
      const merchantId = reference.split('-')[1]
      if (status === 'APPROVED') {
        const next = new Date()
        next.setDate(next.getDate() + 30)
        await db.from('merchants').update({
          plan_status: 'active',
          subscription_next_billing_at: next.toISOString().slice(0, 10),
        }).eq('id', merchantId)
      } else if (status === 'DECLINED' || status === 'ERROR') {
        await db.from('merchants').update({ plan_status: 'past_due' }).eq('id', merchantId)
      }
    } else if (reference.startsWith('sub-')) {
      const merchantId = reference.replace('sub-', '').split('-')[0]
      if (status === 'DECLINED' || status === 'ERROR') {
        await db.from('merchants').update({ plan: null, plan_status: 'cancelled' }).eq('id', merchantId)
      }
    }
  }

  return NextResponse.json({ received: true })
}
