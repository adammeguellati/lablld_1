import { createAdminClient } from '@/lib/supabase/admin'
import type { ShopifyOrderWebhook, ShippingAddress } from '@/types'

type ResolvedProduct = {
  id: string
  base_price: number
  fulfillment_fee_cop: number | null
  stock: number | null
  gross_weight_g: number | null
}

export async function processShopifyOrder(order: ShopifyOrderWebhook, shopDomain: string) {
  const db = createAdminClient()

  const { data: store } = await db
    .from('shopify_stores').select('merchant_id').eq('shop_domain', shopDomain).single()
  if (!store) return

  const resolved: Array<{
    merchantProductId: string
    productId: string
    productStock: number | null
    title: string
    quantity: number
    unitPrice: number
  }> = []

  let productCostTotal = 0

  for (const item of order.line_items ?? []) {
    const { data: raw } = await db
      .from('merchant_products')
      .select('id, product:products(id, base_price, fulfillment_fee_cop, stock, gross_weight_g)')
      .eq('shopify_variant_id', String(item.variant_id))
      .maybeSingle()

    if (!raw?.product) continue
    const mp = raw as unknown as { id: string; product: ResolvedProduct }

    productCostTotal += (mp.product.base_price + (mp.product.fulfillment_fee_cop ?? 0)) * item.quantity

    resolved.push({
      merchantProductId: mp.id,
      productId: mp.product.id,
      productStock: mp.product.stock,
      title: item.title,
      quantity: item.quantity,
      unitPrice: parseFloat(item.price),
    })
  }

  if (!resolved.length) return

  const { data: existingOrder } = await db
    .from('orders').select('id').eq('shopify_order_id', String(order.id)).maybeSingle()
  if (existingOrder) return

  const addr = order.shipping_address as ShippingAddress | null

  const { data: savedOrder } = await db.from('orders').insert({
    merchant_id: store.merchant_id,
    shopify_order_id: String(order.id),
    shopify_order_number: String(order.order_number),
    customer_name: order.customer
      ? `${order.customer.first_name} ${order.customer.last_name}` : null,
    customer_email: order.email,
    shipping_address: addr ?? null,
    fulfillment_cost: productCostTotal,
    status: 'quote_pending',
  }).select('id').single()

  if (!savedOrder) return

  await db.from('order_items').insert(
    resolved.map((r) => ({
      order_id: savedOrder.id,
      merchant_product_id: r.merchantProductId,
      product_name: r.title,
      quantity: r.quantity,
      unit_price: r.unitPrice,
    }))
  )

  for (const r of resolved) {
    if (r.productStock === null) continue
    const newStock = Math.max(0, r.productStock - r.quantity)
    await db.from('products').update({ stock: newStock }).eq('id', r.productId)
    if (newStock === 0) {
      await db.from('products').update({ is_active: false }).eq('id', r.productId)
      await db.from('merchant_products').update({ is_active: false }).eq('product_id', r.productId)
    }
  }
}
