import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(key, { apiVersion: '2026-02-25.clover', typescript: true })
  }
  return _stripe
}

export async function createStripeCustomer(email: string, name: string) {
  return getStripe().customers.create({ email, name })
}

export async function createSetupIntent(customerId: string) {
  return getStripe().setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
  })
}

export async function startSubscription(
  customerId: string,
  priceId: string,
  paymentMethodId: string
) {
  await getStripe().customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  })
  return getStripe().subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    default_payment_method: paymentMethodId,
  })
}

export async function chargeForOrder(
  customerId: string,
  paymentMethodId: string,
  amount: number,
  orderId: string
) {
  return getStripe().paymentIntents.create({
    amount,
    currency: 'cop',
    customer: customerId,
    payment_method: paymentMethodId,
    confirm: true,
    off_session: true,
    metadata: { order_id: orderId },
  })
}

export async function cancelSubscription(subscriptionId: string) {
  return getStripe().subscriptions.cancel(subscriptionId)
}

export async function scheduleCancelSubscription(subscriptionId: string) {
  return getStripe().subscriptions.update(subscriptionId, { cancel_at_period_end: true })
}

export async function revertCancelSubscription(subscriptionId: string) {
  return getStripe().subscriptions.update(subscriptionId, { cancel_at_period_end: false })
}

export async function changePlan(
  subscriptionId: string,
  newPriceId: string,
  isUpgrade: boolean
) {
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
  const itemId = subscription.items.data[0].id
  return getStripe().subscriptions.update(subscriptionId, {
    items: [{ id: itemId, price: newPriceId }],
    proration_behavior: isUpgrade ? 'always_invoice' : 'none',
  })
}

export function getPriceId(plan: 'starter' | 'plus'): string {
  return plan === 'starter'
    ? process.env.STRIPE_STARTER_PRICE_ID!
    : process.env.STRIPE_PLUS_PRICE_ID!
}
