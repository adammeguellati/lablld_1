import { createHash } from 'crypto'

function privateKey(): string {
  const k = process.env.WOMPI_PRIVATE_KEY
  if (!k) throw new Error('WOMPI_PRIVATE_KEY not configured')
  return k
}

function getBase(): string {
  return privateKey().startsWith('prv_test_')
    ? 'https://sandbox.wompi.co/v1'
    : 'https://production.wompi.co/v1'
}

async function wompiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${privateKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json() as { data?: T; error?: { reason: string } }
  if (!res.ok) throw new Error(json.error?.reason ?? `Wompi HTTP ${res.status}`)
  return json.data as T
}

async function wompiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, {
    headers: { 'Authorization': `Bearer ${privateKey()}` },
    cache: 'no-store',
  })
  const json = await res.json() as { data: T }
  return json.data
}

export async function getAcceptanceToken(): Promise<string> {
  const pub = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ?? ''
  const base = pub.startsWith('pub_test_') ? 'https://sandbox.wompi.co/v1' : 'https://production.wompi.co/v1'
  const res = await fetch(`${base}/merchants/${pub}`, { next: { revalidate: 300 } })
  const json = await res.json() as { data: { presigned_acceptance: { acceptance_token: string } } }
  return json.data.presigned_acceptance.acceptance_token
}

export async function createPaymentSource(cardToken: string, email: string): Promise<number> {
  const acceptance_token = await getAcceptanceToken()
  const data = await wompiPost<{ id: number }>('/payment_sources', {
    type: 'CARD', token: cardToken, customer_email: email, acceptance_token,
  })
  return data.id
}

export async function chargePaymentSource(
  paymentSourceId: number,
  amountCOP: number,
  reference: string,
  email: string,
): Promise<{ id: string; status: string }> {
  const acceptance_token = await getAcceptanceToken()
  const data = await wompiPost<{ id: string; status: string }>('/transactions', {
    amount_in_cents: amountCOP * 100,
    currency: 'COP',
    customer_email: email,
    payment_method: { id: paymentSourceId, type: 'CARD' },
    reference,
    acceptance_token,
  })
  return { id: data.id, status: data.status }
}

export async function getTransaction(id: string): Promise<{ status: string }> {
  const data = await wompiGet<{ status: string }>(`/transactions/${id}`)
  return { status: data.status }
}

export function getPlanPriceCOP(plan: 'starter' | 'plus'): number {
  const val = plan === 'starter'
    ? process.env.WOMPI_STARTER_PRICE_COP
    : process.env.WOMPI_PLUS_PRICE_COP
  if (!val) throw new Error(`Precio para plan "${plan}" no configurado`)
  return parseInt(val, 10)
}

type WompiTxProps = Record<string, string | number>

export interface PSEBank { code: string; name: string }

export async function getPSEBanks(): Promise<PSEBank[]> {
  const data = await wompiGet<{ financial_institution_code: string; financial_institution_name: string }[]>(
    '/pse/financial_institutions'
  )
  return data.map(b => ({ code: b.financial_institution_code, name: b.financial_institution_name }))
}

export async function createPSETransaction(opts: {
  amountCOP: number; email: string; bankCode: string
  docType: string; docNum: string; reference: string; redirectUrl: string; description: string
}): Promise<{ id: string; paymentUrl: string }> {
  const acceptance_token = await getAcceptanceToken()
  const data = await wompiPost<{
    id: string; status: string
    payment_method: { extra: { async_payment_url: string } }
  }>('/transactions', {
    amount_in_cents: opts.amountCOP * 100, currency: 'COP', customer_email: opts.email,
    payment_method: {
      type: 'PSE', user_type: 0,
      user_legal_id_type: opts.docType, user_legal_id: opts.docNum,
      financial_institution_code: opts.bankCode, payment_description: opts.description,
    },
    redirect_url: opts.redirectUrl, reference: opts.reference, acceptance_token,
  })
  return { id: data.id, paymentUrl: data.payment_method.extra.async_payment_url }
}

export async function createNequiTransaction(opts: {
  amountCOP: number; email: string; phone: string; reference: string
}): Promise<{ id: string; status: string }> {
  const acceptance_token = await getAcceptanceToken()
  const data = await wompiPost<{ id: string; status: string }>('/transactions', {
    amount_in_cents: opts.amountCOP * 100, currency: 'COP', customer_email: opts.email,
    payment_method: { type: 'NEQUI', phone_number: opts.phone },
    reference: opts.reference, acceptance_token,
  })
  return { id: data.id, status: data.status }
}

export async function createPaymentLink(opts: {
  name: string
  description: string
  amountCOP: number
  redirectUrl: string
}): Promise<{ id: string; url: string }> {
  const data = await wompiPost<{ id: string; permalink?: string; url?: string }>('/payment_links', {
    name: opts.name,
    description: opts.description,
    amount_in_cents: opts.amountCOP * 100,
    currency: 'COP',
    single_use: false,
    collect_shipping: false,
    redirect_url: opts.redirectUrl,
  })
  const url = data.permalink ?? data.url ?? (data.id ? `https://checkout.wompi.co/l/${data.id}` : '')
  if (!url) throw new Error('Wompi payment link: no ID in response')
  return { id: data.id, url }
}

export function verifyWompiEvent(
  txProps: WompiTxProps,
  properties: string[],
  checksum: string,
): boolean {
  const secret = process.env.WOMPI_EVENTS_SECRET ?? ''
  const str = properties.map(p => {
    const key = p.startsWith('transaction.') ? p.slice('transaction.'.length) : p
    return String(txProps[key] ?? '')
  }).join('') + secret
  return createHash('sha256').update(str).digest('hex') === checksum
}
