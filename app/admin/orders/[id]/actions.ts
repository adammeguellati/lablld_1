'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createFulfillment } from '@/lib/shopify'
import { createPaymentLink } from '@/lib/wompi'
import { sendQuoteEmail } from '@/lib/email'
import { isAdmin } from '@/lib/utils'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) redirect('/login')
  return user
}

export async function confirmQuoteAction(
  orderId: string,
  opts: { shippingCostCop: number; carrier: string; estimatedDelivery: string }
): Promise<{ error?: string }> {
  await requireAdmin()
  const db = createAdminClient()

  const [itemsRes, orderRes] = await Promise.all([
    db.from('order_items').select('product_name, quantity').eq('order_id', orderId),
    db.from('orders').select('shopify_order_number, merchant_id, fulfillment_cost, merchant:merchants(email, full_name)').eq('id', orderId).single(),
  ])

  if (!orderRes.data) return { error: 'Orden no encontrada' }

  const items = itemsRes.data ?? []
  const productCost = orderRes.data.fulfillment_cost ?? 0
  const fulfillmentCost = productCost + opts.shippingCostCop
  if (fulfillmentCost <= 0) return { error: 'El costo total debe ser mayor a 0' }

  const orderRef = orderRes.data.shopify_order_number ? `#${orderRes.data.shopify_order_number}` : orderId.slice(0, 8).toUpperCase()
  const itemsSummary = items.map(i => `${i.product_name} ×${i.quantity}`).join(', ')
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}/resultado`

  const linkDescription = `${itemsSummary} | Envío ${opts.carrier} ($${opts.shippingCostCop.toLocaleString('es-CO')} COP)`

  let paymentLinkId: string | undefined
  let paymentLinkUrl: string | undefined
  try {
    const link = await createPaymentLink({
      name: `LABLLD · Orden ${orderRef}`,
      description: linkDescription,
      amountCOP: fulfillmentCost,
      redirectUrl,
    })
    paymentLinkId = link.id
    paymentLinkUrl = link.url
  } catch {
    // Non-fatal: continue without payment link
  }

  const { error } = await db.from('orders').update({
    status: 'payment_pending',
    fulfillment_cost: fulfillmentCost,
    shipping_cost_cop: opts.shippingCostCop,
    carrier: opts.carrier,
    estimated_delivery: opts.estimatedDelivery,
    ...(paymentLinkId && { payment_link_id: paymentLinkId }),
    ...(paymentLinkUrl && { payment_link_url: paymentLinkUrl }),
  }).eq('id', orderId).in('status', ['quote_pending', 'pending'])
  if (error) return { error: error.message }

  const merchant = orderRes.data.merchant as unknown as { email: string; full_name: string } | null
  if (merchant?.email && paymentLinkUrl) {
    sendQuoteEmail({
      to: merchant.email,
      firstName: merchant.full_name?.split(' ')[0] ?? 'Merchant',
      orderRef,
      items: itemsSummary,
      carrier: opts.carrier,
      estimatedDelivery: opts.estimatedDelivery,
      productCostCop: productCost,
      shippingCostCop: opts.shippingCostCop,
      totalCop: fulfillmentCost,
      paymentUrl: paymentLinkUrl,
    }).catch(() => {})
  }

  return {}
}

export async function markDeliveredAction(orderId: string): Promise<{ error?: string }> {
  await requireAdmin()
  const { error } = await createAdminClient()
    .from('orders').update({ status: 'delivered' })
    .eq('id', orderId).eq('status', 'shipped')
  return error ? { error: error.message } : {}
}

export async function markInProductionAction(orderId: string): Promise<{ error?: string }> {
  await requireAdmin()
  const { error } = await createAdminClient()
    .from('orders').update({ status: 'in_production' })
    .eq('id', orderId).eq('status', 'paid')
  return error ? { error: error.message } : {}
}

export async function markShippedAction(
  orderId: string, trackingNumber: string, carrier: string
): Promise<{ error?: string; shopifyWarning?: string; shopifyInfo?: string }> {
  await requireAdmin()
  const db = createAdminClient()
  const { data: order } = await db
    .from('orders').select('shopify_order_id, merchant_id').eq('id', orderId).single()
  if (!order) return { error: 'Orden no encontrada' }

  let shopifyWarning: string | undefined
  let shopifyInfo: string | undefined
  if (order.shopify_order_id) {
    const { data: store } = await db.from('shopify_stores')
      .select('shop_domain, access_token').eq('merchant_id', order.merchant_id).single()
    if (store) {
      try {
        const result = await createFulfillment(store.shop_domain, store.access_token, order.shopify_order_id, trackingNumber, carrier)
        if (!result.synced) shopifyInfo = 'Marcada como enviada en LABLLD. Shopify se sincronizará cuando la app esté aprobada.'
      } catch (err) {
        shopifyWarning = err instanceof Error ? err.message : String(err)
      }
    }
  }

  const { error } = await db.from('orders').update({
    status: 'shipped', tracking_number: trackingNumber, carrier, shipped_at: new Date().toISOString(),
  }).eq('id', orderId)
  if (error) return { error: error.message }
  if (shopifyWarning) return { shopifyWarning }
  if (shopifyInfo) return { shopifyInfo }
  return {}
}
