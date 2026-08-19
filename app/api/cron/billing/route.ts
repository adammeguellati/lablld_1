import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { chargePaymentSource, getPlanPriceCOP } from '@/lib/wompi'
import type { Plan } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const db = createAdminClient()

  const { data: merchants } = await db
    .from('merchants')
    .select('id, email, plan, pending_plan, plan_cancel_at, wompi_payment_source_id, subscription_next_billing_at')
    .not('plan', 'is', null)
    .not('wompi_payment_source_id', 'is', null)
    .lte('subscription_next_billing_at', today)
    .eq('plan_status', 'active')

  // Mark merchants without saved card whose subscription expired as past_due
  const { data: expiredNoCard } = await db
    .from('merchants')
    .select('id')
    .not('plan', 'is', null)
    .is('wompi_payment_source_id', null)
    .lte('subscription_next_billing_at', today)
    .eq('plan_status', 'active')

  if (expiredNoCard?.length) {
    await db.from('merchants').update({ plan_status: 'past_due' })
      .in('id', expiredNoCard.map(m => m.id))
  }

  if (!merchants?.length) return NextResponse.json({ charged: 0, pastDue: expiredNoCard?.length ?? 0 })

  const results: { id: string; status: string }[] = []

  for (const m of merchants) {
    const isCancelling = m.plan_cancel_at && m.plan_cancel_at <= today

    if (isCancelling) {
      await db.from('merchants').update({
        plan: null, pending_plan: null, plan_status: 'cancelled', plan_cancel_at: null,
      }).eq('id', m.id)
      results.push({ id: m.id, status: 'cancelled' })
      continue
    }

    const activePlan: Plan = (m.pending_plan as Plan | null) ?? (m.plan as Plan)
    const amount = getPlanPriceCOP(activePlan)
    const reference = `renewal-${m.id.slice(0, 8)}-${today}`

    try {
      const tx = await chargePaymentSource(m.wompi_payment_source_id as number, amount, reference, m.email)

      if (tx.status === 'APPROVED') {
        const next = new Date(today)
        next.setDate(next.getDate() + 30)
        await db.from('merchants').update({
          plan: activePlan,
          pending_plan: null,
          plan_status: 'active',
          subscription_next_billing_at: next.toISOString().slice(0, 10),
        }).eq('id', m.id)
        results.push({ id: m.id, status: 'charged' })
      } else {
        await db.from('merchants').update({ plan_status: 'past_due' }).eq('id', m.id)
        results.push({ id: m.id, status: 'pending' })
      }
    } catch {
      await db.from('merchants').update({ plan_status: 'past_due' }).eq('id', m.id)
      results.push({ id: m.id, status: 'failed' })
    }
  }

  return NextResponse.json({ charged: results.filter(r => r.status === 'charged').length, pastDue: expiredNoCard?.length ?? 0, results })
}
