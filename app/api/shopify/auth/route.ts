import { NextResponse, type NextRequest } from 'next/server'
import { getAuthUrl, SHOPIFY_OAUTH_STATE_COOKIE } from '@/lib/shopify'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const shop = searchParams.get('shop')
  if (!shop) return NextResponse.json({ error: 'Missing shop' }, { status: 400 })
  if (!/^[a-zA-Z0-9-]+\.myshopify\.com$/.test(shop)) {
    return NextResponse.json({ error: 'Invalid shop domain' }, { status: 400 })
  }

  const hmac = searchParams.get('hmac')
  if (hmac) {
    const paramEntries = [...searchParams.entries()].filter(([k]) => k !== 'hmac')
    const message = paramEntries.sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&')
    const computed = crypto.createHmac('sha256', process.env.SHOPIFY_API_SECRET!).update(message).digest('hex')
    if (computed !== hmac) {
      return NextResponse.json({ error: 'Invalid HMAC' }, { status: 403 })
    }
  }

  const state = crypto.randomBytes(16).toString('hex')
  const response = NextResponse.redirect(getAuthUrl(shop, state))
  // SameSite=Lax, not Strict: the callback arrives as a cross-site top-level
  // navigation from Shopify, and Strict would withhold the cookie there and
  // break every install. Ten minutes is the handshake window.
  response.cookies.set(SHOPIFY_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/shopify',
    maxAge: 600,
  })
  return response
}
