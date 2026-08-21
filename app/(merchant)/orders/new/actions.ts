'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ShippingAddress } from '@/types'

interface OrderInput {
  productId: string
  quantity: number
  shippingAddress: ShippingAddress
  customerName?: string
  customerEmail?: string
}

export async function createManualOrderAction(
  input: OrderInput
): Promise<{ error: string | null; orderId: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', orderId: null }

  const db = createAdminClient()
  const [merchantRes, productRes, mpRes] = await Promise.all([
    db.from('merchants').select('full_name').eq('id', user.id).single(),
    db.from('products').select('name, base_price').eq('id', input.productId).single(),
    db.from('merchant_products').select('id, retail_price').eq('merchant_id', user.id).is('deleted_at', null).eq('product_id', input.productId).maybeSingle(),
  ])

  const merchant = merchantRes.data
  const product = productRes.data
  if (!product) return { error: 'Producto no encontrado', orderId: null }
  const fulfillmentCost = product.base_price * input.quantity

  const { data: order, error: orderErr } = await db.from('orders').insert({
    merchant_id: user.id,
    source: 'manual',
    status: 'quote_pending',
    customer_name: input.customerName || merchant?.full_name,
    customer_email: input.customerEmail || null,
    shipping_address: input.shippingAddress,
    fulfillment_cost: fulfillmentCost,
  }).select('id').single()

  if (orderErr || !order) return { error: orderErr?.message ?? 'Error al crear orden', orderId: null }

  if (mpRes.data) {
    await db.from('order_items').insert({
      order_id: order.id,
      merchant_product_id: mpRes.data.id,
      product_name: product.name,
      quantity: input.quantity,
      unit_price: mpRes.data.retail_price ?? product.base_price,
    })
  }

  return { error: null, orderId: order.id }
}

export async function createSampleOrderAction(
  input: Omit<OrderInput, 'customerName' | 'customerEmail'>
): Promise<{ error: string | null; orderId: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', orderId: null }

  const db = createAdminClient()
  const [merchantRes, productRes] = await Promise.all([
    db.from('merchants').select('full_name').eq('id', user.id).single(),
    db.from('products').select('name, base_price').eq('id', input.productId).single(),
  ])

  const merchant = merchantRes.data
  const product = productRes.data
  if (!product) return { error: 'Producto no encontrado', orderId: null }

  const priceCop = product.base_price
  const fulfillmentCost = priceCop * input.quantity

  const { data: order, error: orderErr } = await db.from('orders').insert({
    merchant_id: user.id,
    source: 'sample',
    status: 'quote_pending',
    customer_name: merchant?.full_name,
    shipping_address: input.shippingAddress,
    fulfillment_cost: fulfillmentCost,
  }).select('id').single()

  if (orderErr || !order) return { error: orderErr?.message ?? 'Error al crear orden', orderId: null }

  await db.from('order_items').insert({
    order_id: order.id,
    merchant_product_id: null,
    product_name: product.name,
    quantity: input.quantity,
    unit_price: priceCop,
  })

  return { error: null, orderId: order.id }
}
