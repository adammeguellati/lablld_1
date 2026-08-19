'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/utils'
import type { ShippingAddress } from '@/types'

interface AdminOrderInput {
  merchantId: string
  productId: string
  quantity: number
  customerName: string
  customerEmail: string
  shippingAddress: ShippingAddress
}

export async function createAdminOrderAction(
  input: AdminOrderInput
): Promise<{ error: string | null; orderId: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return { error: 'No autorizado', orderId: null }

  const db = createAdminClient()
  const [productRes, mpRes] = await Promise.all([
    db.from('products').select('name, base_price, wholesale_price_usd').eq('id', input.productId).single(),
    db.from('merchant_products').select('id').eq('merchant_id', input.merchantId).eq('product_id', input.productId).maybeSingle(),
  ])

  if (!productRes.data) return { error: 'Producto no encontrado', orderId: null }

  const unitPrice = productRes.data.wholesale_price_usd ?? productRes.data.base_price
  const fulfillmentCost = unitPrice * input.quantity

  const { data: order, error: orderErr } = await db.from('orders').insert({
    merchant_id: input.merchantId,
    source: 'admin',
    status: 'paid',
    customer_name: input.customerName,
    customer_email: input.customerEmail || null,
    shipping_address: input.shippingAddress,
    fulfillment_cost: fulfillmentCost,
  }).select('id').single()

  if (orderErr || !order) return { error: orderErr?.message ?? 'Error al crear orden', orderId: null }

  await db.from('order_items').insert({
    order_id: order.id,
    merchant_product_id: mpRes.data?.id ?? null,
    product_name: productRes.data.name,
    quantity: input.quantity,
    unit_price: unitPrice,
  })

  return { error: null, orderId: order.id }
}
