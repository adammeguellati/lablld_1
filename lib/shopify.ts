import crypto from 'crypto'

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!
const SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!
const WEBHOOK_URL = process.env.SHOPIFY_WEBHOOK_BASE_URL || APP_URL

export function getAuthUrl(shop: string, state: string): string {
  const params = new URLSearchParams({
    client_id: SHOPIFY_API_KEY, scope: SHOPIFY_SCOPES,
    redirect_uri: `${APP_URL}/api/shopify/callback`, state, access_mode: 'offline',
  })
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`
}

export async function exchangeCodeForToken(shop: string, code: string): Promise<string> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: SHOPIFY_API_KEY, client_secret: SHOPIFY_API_SECRET, code }),
  })
  if (!res.ok) throw new Error(`Shopify token exchange failed: ${res.statusText}`)
  const data = await res.json()
  return data.access_token as string
}

export function verifyWebhookHmac(rawBody: string, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET!
  const hash = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64')
  try { return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader)) } catch { return false }
}

// Fulfillment-order traffic arrives two ways and the two are signed with
// different secrets: the topic webhook registered in the OAuth callback is
// signed with SHOPIFY_API_SECRET, a Dev Dashboard registration with its own
// SHOPIFY_WEBHOOK_SECRET. Both are accepted, so neither registration path is
// silently rejected.
export function verifyFulfillmentHmac(rawBody: string, hmacHeader: string): boolean {
  const trySecret = (secret: string) => {
    try {
      const hash = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64')
      if (hash.length !== hmacHeader.length) return false
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader))
    } catch { return false }
  }
  return trySecret(SHOPIFY_API_SECRET) || trySecret(process.env.SHOPIFY_WEBHOOK_SECRET!)
}

export function verifyComplianceWebhookHmac(rawBody: string, hmacHeader: string): boolean {
  const hash = crypto.createHmac('sha256', SHOPIFY_API_SECRET).update(rawBody, 'utf8').digest('base64')
  try { return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader)) } catch { return false }
}

export async function createProduct(
  shop: string, accessToken: string,
  product: { title: string; body_html: string; vendor: string; product_type: string; images: { src: string }[]; variants: { price: string; sku?: string; fulfillment_service?: string; inventory_management?: string }[] }
) {
  const res = await fetch(`https://${shop}/admin/api/2026-01/products.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
    body: JSON.stringify({ product }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Shopify createProduct failed: ${res.status} — ${body}`)
  }
  return res.json()
}

export async function updateProduct(
  shop: string, accessToken: string, shopifyProductId: string,
  data: { title?: string; status?: 'active' | 'draft' | 'archived'; variants?: { id: number; price?: string; fulfillment_service?: string; sku?: string }[] }
): Promise<void> {
  const res = await fetch(`https://${shop}/admin/api/2026-01/products/${shopifyProductId}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
    body: JSON.stringify({ product: { id: shopifyProductId, ...data } }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Shopify updateProduct failed: ${res.status} — ${body}`)
  }
}

export async function updateVariantFulfillmentService(
  shop: string, accessToken: string, variantId: string, fulfillmentService: string, sku: string
): Promise<void> {
  const res = await fetch(`https://${shop}/admin/api/2026-01/variants/${variantId}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
    body: JSON.stringify({ variant: { id: variantId, fulfillment_service: fulfillmentService, inventory_management: fulfillmentService, sku } }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Shopify updateVariantFulfillmentService failed: ${res.status} — ${body}`)
  }
}

export async function updateVariantPrice(
  shop: string, accessToken: string, variantId: string, price: number
): Promise<void> {
  const res = await fetch(`https://${shop}/admin/api/2026-01/variants/${variantId}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
    body: JSON.stringify({ variant: { id: variantId, price: String(price) } }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Shopify updateVariantPrice failed: ${res.status} — ${body}`)
  }
}

export async function registerFulfillmentService(
  shop: string, accessToken: string
): Promise<{ id: number; location_id: number; handle: string }> {
  const callbackUrl = `${WEBHOOK_URL}/api/shopify`
  const headers = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken }

  const listRes = await fetch(`https://${shop}/admin/api/2026-01/fulfillment_services.json`, { headers })
  if (listRes.ok) {
    const listData = await listRes.json()
    type FS = { id: number; name: string; location_id: number; handle: string }
    const existing = (listData.fulfillment_services as FS[])?.find(f => f.name === 'LABLLD')
    if (existing) {
      await fetch(`https://${shop}/admin/api/2026-01/fulfillment_services/${existing.id}.json`, {
        method: 'PUT', headers,
        body: JSON.stringify({ fulfillment_service: { id: existing.id, callback_url: callbackUrl } }),
      })
      return { id: existing.id, location_id: existing.location_id, handle: existing.handle }
    }
  }

  const res = await fetch(`https://${shop}/admin/api/2026-01/fulfillment_services.json`, {
    method: 'POST', headers,
    body: JSON.stringify({
      fulfillment_service: {
        name: 'LABLLD', callback_url: callbackUrl,
        inventory_management: false, tracking_support: true, requires_shipping_method: true,
      },
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Shopify registerFulfillmentService failed: ${res.statusText} — ${body}`)
  }
  const data = await res.json()
  return { id: data.fulfillment_service.id, location_id: data.fulfillment_service.location_id, handle: data.fulfillment_service.handle as string }
}

export async function getFulfillmentServiceHandle(shop: string, accessToken: string): Promise<string | null> {
  const res = await fetch(`https://${shop}/admin/api/2026-01/fulfillment_services.json`, {
    headers: { 'X-Shopify-Access-Token': accessToken },
  })
  if (!res.ok) return null
  const data = await res.json()
  const fs = (data.fulfillment_services as { name: string; handle: string }[])?.find(f => f.name === 'LABLLD')
  return fs?.handle ?? null
}

export async function getVariantInventoryItemId(
  shop: string, accessToken: string, variantId: string
): Promise<number> {
  const res = await fetch(`https://${shop}/admin/api/2026-01/variants/${variantId}.json`, {
    headers: { 'X-Shopify-Access-Token': accessToken },
  })
  if (!res.ok) throw new Error(`Shopify getVariant failed: ${res.statusText}`)
  const data = await res.json()
  return data.variant.inventory_item_id as number
}

export async function connectInventoryItem(
  shop: string, accessToken: string, inventoryItemId: number, locationId: number
): Promise<void> {
  const res = await fetch(`https://${shop}/admin/api/2026-01/inventory_levels/connect.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
    body: JSON.stringify({ location_id: locationId, inventory_item_id: inventoryItemId, relocate_if_necessary: true }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Shopify connectInventoryItem failed: ${res.statusText} — ${body}`)
  }
}

export async function getFulfillmentOrderId(
  shop: string, accessToken: string, shopifyOrderId: string
): Promise<string> {
  type FO = { id: number; order_id: number; status: string }
  const isOpen = (f: FO) => f.status !== 'closed' && f.status !== 'cancelled' && f.status !== 'incomplete'

  const orderRes = await fetch(
    `https://${shop}/admin/api/2026-01/orders/${shopifyOrderId}/fulfillment_orders.json`,
    { headers: { 'X-Shopify-Access-Token': accessToken } }
  )
  if (orderRes.ok) {
    const data = await orderRes.json()
    const fos = data.fulfillment_orders as FO[]
    const fo = fos?.find(isOpen)
    if (fo) return String(fo.id)
    const statuses = fos?.map(f => f.status).join(',') || 'empty'
    return `ERR:orders_ok_no_open_fo(statuses=${statuses})`
  }
  const orderErr = orderRes.status

  const assignedRes = await fetch(
    `https://${shop}/admin/api/2026-01/assigned_fulfillment_orders.json`,
    { headers: { 'X-Shopify-Access-Token': accessToken } }
  )
  if (assignedRes.ok) {
    const data = await assignedRes.json()
    const fos = data.fulfillment_orders as FO[]
    const fo = fos?.find(f => String(f.order_id) === shopifyOrderId && isOpen(f))
    if (fo) return String(fo.id)
    const allOrders = fos?.map(f => f.order_id).join(',') || 'empty'
    return `ERR:assigned_ok_no_match(orders_endpoint=${orderErr},assigned_orders=${allOrders})`
  }

  return `ERR:both_blocked(orders=${orderErr},assigned=${assignedRes.status})`
}

export async function createFulfillment(
  shop: string, accessToken: string,
  shopifyOrderId: string, trackingNumber: string, carrier: string,
): Promise<{ synced: boolean }> {
  const authHeader = { 'X-Shopify-Access-Token': accessToken }
  const jsonHeaders = { 'Content-Type': 'application/json', ...authHeader }

  const foRes = await fetch(
    `https://${shop}/admin/api/2026-01/orders/${shopifyOrderId}/fulfillment_orders.json`,
    { headers: authHeader }
  )
  if (!foRes.ok) {
    await updateOrderNote(shop, accessToken, shopifyOrderId, trackingNumber, carrier)
    return { synced: false }
  }

  const foData = await foRes.json() as { fulfillment_orders: { id: number; status: string }[] }
  const fos = foData.fulfillment_orders ?? []
  const fo = fos.find((f) => f.status !== 'closed' && f.status !== 'cancelled')

  if (!fo) {
    await updateOrderNote(shop, accessToken, shopifyOrderId, trackingNumber, carrier)
    return { synced: false }
  }

  const res = await fetch(`https://${shop}/admin/api/2026-01/fulfillments.json`, {
    method: 'POST', headers: jsonHeaders,
    body: JSON.stringify({
      fulfillment: {
        line_items_by_fulfillment_order: [{ fulfillment_order_id: fo.id }],
        tracking_info: { number: trackingNumber, company: carrier },
        notify_customer: true,
      },
    }),
  })
  if (!res.ok) {
    await updateOrderNote(shop, accessToken, shopifyOrderId, trackingNumber, carrier)
    return { synced: false }
  }
  return { synced: true }
}

async function updateOrderNote(
  shop: string, accessToken: string,
  shopifyOrderId: string, trackingNumber: string, carrier: string,
): Promise<void> {
  await fetch(`https://${shop}/admin/api/2026-01/orders/${shopifyOrderId}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
    body: JSON.stringify({
      order: {
        id: Number(shopifyOrderId),
        note: `Enviado — Tracking: ${trackingNumber} — ${carrier}`,
        tags: `shipped,tracking:${trackingNumber}`,
      },
    }),
  })
}

export async function listWebhooksForTopic(
  shop: string, accessToken: string, topic: string
): Promise<{ id: number; address: string }[]> {
  const res = await fetch(
    `https://${shop}/admin/api/2026-01/webhooks.json?topic=${encodeURIComponent(topic)}`,
    { headers: { 'X-Shopify-Access-Token': accessToken } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.webhooks ?? []) as { id: number; address: string }[]
}

export async function deleteWebhook(shop: string, accessToken: string, webhookId: number): Promise<void> {
  await fetch(`https://${shop}/admin/api/2026-01/webhooks/${webhookId}.json`, {
    method: 'DELETE',
    headers: { 'X-Shopify-Access-Token': accessToken },
  })
}

export async function registerWebhook(
  shop: string, accessToken: string, topic: string, address: string
): Promise<string> {
  const res = await fetch(`https://${shop}/admin/api/2026-01/webhooks.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
    body: JSON.stringify({ webhook: { topic, address, format: 'json' } }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Shopify registerWebhook (${topic}) failed: ${res.status} — ${body}`)
  }
  const data = await res.json()
  return String(data.webhook.id)
}

export async function registerOrderWebhook(shop: string, accessToken: string): Promise<string> {
  return registerWebhook(shop, accessToken, 'orders/create', `${WEBHOOK_URL}/api/webhooks/shopify`)
}
