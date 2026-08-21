// No 'use server' here: a route handler already runs only on the server, and
// the directive turns every export into a server ACTION, which route handlers
// are not. It was inert at best and misleading at worst.
import { NextResponse, type NextRequest } from 'next/server'
import { exchangeCodeForToken, registerOrderWebhook, registerFulfillmentService, registerWebhook, listWebhooksForTopic, deleteWebhook, verifyOAuthState, SHOPIFY_OAUTH_STATE_COOKIE } from '@/lib/shopify'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const shop = searchParams.get('shop')
  const code = searchParams.get('code')
  const state = searchParams.get('state') ?? ''

  if (!shop || !code) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const hmac = searchParams.get('hmac') ?? ''
  const paramEntries = [...request.nextUrl.searchParams.entries()].filter(([k]) => k !== 'hmac')
  const message = paramEntries.sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&')
  const computed = crypto.createHmac('sha256', process.env.SHOPIFY_API_SECRET!).update(message).digest('hex')
  if (computed !== hmac) {
    return NextResponse.json({ error: 'Invalid HMAC' }, { status: 403 })
  }

  const expectedState = request.cookies.get(SHOPIFY_OAUTH_STATE_COOKIE)?.value ?? ''
  if (!verifyOAuthState(state, expectedState)) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 403 })
  }

  // Single use, cleared on every path that got past the check. A failed check
  // deliberately leaves it alone: burning a pending state on a forged callback
  // would let anyone break a real merchant's install by guessing the URL.
  const consumeState = <T extends NextResponse>(response: T): T => {
    response.cookies.delete(SHOPIFY_OAUTH_STATE_COOKIE)
    return response
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return consumeState(NextResponse.redirect(new URL('/login', request.url)))

  const db = createAdminClient()

  const { data: existingStore } = await db
    .from('shopify_stores')
    .select('merchant_id')
    .eq('shop_domain', shop)
    .maybeSingle()

  if (existingStore && existingStore.merchant_id !== user.id) {
    return consumeState(NextResponse.redirect(new URL('/settings?tab=tiendas&error=store_already_connected', request.url)))
  }

  let accessToken: string
  try {
    accessToken = await exchangeCodeForToken(shop, code)
  } catch {
    return consumeState(NextResponse.redirect(new URL('/settings?tab=tiendas&error=token_exchange_failed', request.url)))
  }

  let webhookId: string | null = null
  let foWebhookError: string | null = null
  try { webhookId = await registerOrderWebhook(shop, accessToken) } catch { /* requires HTTPS */ }

  const foTopic = 'fulfillment_orders/fulfillment_request_submitted'
  const foAddress = `${process.env.SHOPIFY_WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/shopify/fulfillment-order`
  try {
    const existing = await listWebhooksForTopic(shop, accessToken, foTopic)
    await Promise.all(existing.map(w => deleteWebhook(shop, accessToken, w.id)))
    await registerWebhook(shop, accessToken, foTopic, foAddress)
  } catch (err) {
    foWebhookError = err instanceof Error ? err.message : String(err)
  }

  let fulfillmentServiceId: string | null = null
  let fulfillmentServiceLocationId: number | null = null
  let fulfillmentServiceHandle: string | null = null
  let fsError: string | null = null
  try {
    const fs = await registerFulfillmentService(shop, accessToken)
    fulfillmentServiceId = String(fs.id)
    fulfillmentServiceLocationId = fs.location_id
    fulfillmentServiceHandle = fs.handle
  } catch (err) {
    fsError = err instanceof Error ? err.message : String(err)
  }

  await db.from('shopify_stores').upsert({
    merchant_id: user.id,
    shop_domain: shop,
    access_token: accessToken,
    webhook_id: webhookId,
    fulfillment_service_id: fulfillmentServiceId,
    fulfillment_service_location_id: fulfillmentServiceLocationId,
    fulfillment_service_handle: fulfillmentServiceHandle,
  }, { onConflict: 'shop_domain' })

  await db.from('merchants').update({ shopify_connected: true }).eq('id', user.id)

  const redirectUrl = new URL('/settings/shopify', request.url)
  if (fsError) redirectUrl.searchParams.set('fs_error', encodeURIComponent(fsError))
  if (foWebhookError) redirectUrl.searchParams.set('fo_webhook_error', encodeURIComponent(foWebhookError))
  return consumeState(NextResponse.redirect(redirectUrl))
}
