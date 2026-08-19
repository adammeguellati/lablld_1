import { NextResponse, type NextRequest } from 'next/server'
import { getStripe, changePlan, getPriceId } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import type Stripe from 'stripe'
import type { Plan } from '@/types'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const sig = request.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      if (pi.metadata?.order_id) {
        await supabase
          .from('orders')
          .update({ status: 'paid', stripe_payment_intent_id: pi.id })
          .eq('id', pi.metadata.order_id)
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      if (pi.metadata?.order_id) {
        await supabase
          .from('orders')
          .update({ status: 'payment_failed' })
          .eq('id', pi.metadata.order_id)
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const priceId = sub.items.data[0]?.price.id
      const plan =
        priceId === process.env.STRIPE_PLUS_PRICE_ID
          ? 'plus'
          : priceId === process.env.STRIPE_STARTER_PRICE_ID
            ? 'starter'
            : undefined
      await supabase
        .from('merchants')
        .update({
          ...(plan ? { plan } : {}),
          plan_status: sub.status === 'active' ? 'active' : 'past_due',
        })
        .eq('stripe_subscription_id', sub.id)
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      const inv = invoice as unknown as { billing_reason: string; parent?: { subscription_details?: { subscription?: string } } }
      const subId = inv.parent?.subscription_details?.subscription
      if (!subId) break

      if (inv.billing_reason === 'subscription_create') {
        const sub = await getStripe().subscriptions.retrieve(subId)
        const priceId = sub.items.data[0]?.price.id
        const plan = priceId === process.env.STRIPE_PLUS_PRICE_ID ? 'plus'
          : priceId === process.env.STRIPE_STARTER_PRICE_ID ? 'starter' : null
        if (plan) {
          await supabase.from('merchants')
            .update({ plan, plan_status: 'active' })
            .eq('stripe_subscription_id', subId)
            .is('plan', null)
        }
      }

      if (inv.billing_reason === 'subscription_cycle') {
        const { data: merchant } = await supabase
          .from('merchants')
          .select('id, pending_plan, stripe_subscription_id')
          .eq('stripe_subscription_id', subId)
          .single()
        if (merchant?.pending_plan && merchant.stripe_subscription_id) {
          await changePlan(merchant.stripe_subscription_id, getPriceId(merchant.pending_plan as Plan), false)
          await supabase.from('merchants').update({ plan: merchant.pending_plan, pending_plan: null }).eq('id', merchant.id)
        }
      }
      break
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as unknown as { billing_reason: string; parent?: { subscription_details?: { subscription?: string } } }
      const subId = inv.parent?.subscription_details?.subscription
      if (subId && inv.billing_reason?.startsWith('subscription')) {
        await supabase
          .from('merchants')
          .update({ plan_status: 'past_due' })
          .eq('stripe_subscription_id', subId)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabase
        .from('merchants')
        .update({ plan: null, pending_plan: null, plan_status: 'cancelled', stripe_subscription_id: null })
        .eq('stripe_subscription_id', sub.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
