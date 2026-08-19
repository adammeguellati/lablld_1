import { NextResponse, type NextRequest } from 'next/server'
import { verifyComplianceWebhookHmac } from '@/lib/shopify'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const hmac = request.headers.get('x-shopify-hmac-sha256') ?? ''
  if (!verifyComplianceWebhookHmac(rawBody, hmac)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody) as { shop_domain: string }
  const db = createAdminClient()
  await db.from('shopify_stores').delete().eq('shop_domain', payload.shop_domain)

  return NextResponse.json({ received: true })
}
