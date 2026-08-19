import { NextResponse, type NextRequest } from 'next/server'
import { after } from 'next/server'
import { verifyWebhookHmac } from '@/lib/shopify'
import { processShopifyOrder } from './_process-order'
import type { ShopifyOrderWebhook } from '@/types'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const hmacHeader = request.headers.get('x-shopify-hmac-sha256') ?? ''
  const shopDomain = request.headers.get('x-shopify-shop-domain') ?? ''

  if (!verifyWebhookHmac(rawBody, hmacHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const order = JSON.parse(rawBody) as ShopifyOrderWebhook
  after(() => processShopifyOrder(order, shopDomain))
  return NextResponse.json({ received: true })
}
