import { NextResponse, type NextRequest } from 'next/server'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyFulfillmentHmac } from '@/lib/shopify'

// Shopify calls this from the fulfillment service callback_url registered in
// registerFulfillmentService (lib/shopify.ts), which is why proxy.ts lets
// /api/shopify/* through unauthenticated. Until this check existed, anyone
// could reach a service-role write here.
export async function POST(request: NextRequest) {
  const body = await request.text()
  const hmacHeader = request.headers.get('x-shopify-hmac-sha256') ?? ''

  if (!verifyFulfillmentHmac(body, hmacHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  after(async () => {
    try {
      const payload = JSON.parse(body)
      const fo = payload.fulfillment_order
      if (!fo?.id || !fo?.order_id) return

      const db = createAdminClient()
      const shopifyOrderId = String(fo.order_id)
      const fulfillmentOrderId = String(fo.id)

      // Retry up to 6 times — orders/create webhook also runs in after() and may not be committed yet
      for (let attempt = 0; attempt < 6; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 1500))
        const { data } = await db
          .from('orders')
          .select('id')
          .eq('shopify_order_id', shopifyOrderId)
          .maybeSingle()
        if (!data) continue
        await db
          .from('orders')
          .update({ shopify_fulfillment_order_id: fulfillmentOrderId })
          .eq('id', data.id)
        break
      }
    } catch { /* non-fatal */ }
  })

  return NextResponse.json({ ok: true })
}
