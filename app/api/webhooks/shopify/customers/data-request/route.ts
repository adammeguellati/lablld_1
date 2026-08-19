import { NextResponse, type NextRequest } from 'next/server'
import { verifyComplianceWebhookHmac } from '@/lib/shopify'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const hmac = request.headers.get('x-shopify-hmac-sha256') ?? ''
  if (!verifyComplianceWebhookHmac(rawBody, hmac)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ received: true })
}
