import { NextResponse, type NextRequest } from 'next/server'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyFulfillmentHmac } from '@/lib/shopify'

// Shopify calls this from the fulfillment service callback_url registered in
// registerFulfillmentService (lib/shopify.ts), which is why proxy.ts lets
// /api/shopify/* through unauthenticated. Until this check existed, anyone
// could reach a service-role write here.
// Comfortably inside maxDuration below, so the loop cannot be the thing that
// kills the function.
const RETRY_BUDGET_MS = 8000

export const maxDuration = 30

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

      // orders/create runs in its own after() and may not be committed yet, so
      // this polls for the row. The old schedule slept 0+1.5+3+4.5+6+7.5 =
      // 22.5s, which outlives the function on any default budget — the later
      // attempts never ran and the fulfillment id was silently never written.
      // Flat 1.2s backoff keeps the same six attempts inside RETRY_BUDGET_MS.
      const started = Date.now()
      for (let attempt = 0; attempt < 6; attempt++) {
        if (attempt > 0) {
          if (Date.now() - started > RETRY_BUDGET_MS) break
          await new Promise(r => setTimeout(r, 1200))
        }
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
