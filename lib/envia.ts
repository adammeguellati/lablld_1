import type { ShippingAddress } from '@/types'

const BASE = process.env.ENVIA_API_URL ?? 'https://api.ship-test.envia.com'

// Standard padded envelope used for all LABLLD shipments
const PKG_DIMS = { length: 25, width: 18, height: 5 }
const DEFAULT_WEIGHT_KG = 0.3

// Update with actual warehouse address once available
const ORIGIN = {
  name: 'LABLLD', company: 'LABLLD SAS',
  email: 'ops@lablld.com', phone: '3001234567',
  street: 'Calle 50', number: '1', district: 'El Centro',
  city: 'Medellín', state: 'Antioquia', country: 'CO', postalCode: '050021',
}

export interface EnviaRate {
  carrier: string
  service: string
  totalPrice: number
  deliveryEstimated: string
}

export interface EnviaLabel {
  trackingNumber: string
  label: string
  carrier: string
  totalPrice: number
}

function headers() {
  return {
    'Authorization': `Bearer ${process.env.ENVIA_API_KEY}`,
    'Content-Type': 'application/json',
  }
}

function buildDestination(addr: ShippingAddress) {
  return {
    name: addr.name, company: '', email: '',
    phone: addr.phone ?? '', street: addr.address1,
    number: addr.address2 ?? '', district: '',
    city: addr.city, state: addr.province,
    country: 'CO',
    postalCode: addr.zip ?? '',
  }
}

function buildPackage(weightKg: number, content: string, declaredValue = 0) {
  return {
    content, amount: 1, type: 'box',
    dimensions: PKG_DIMS,
    weight: { value: weightKg, unit: 'KG' },
    insurance: 0, declaredValue,
  }
}

export async function quoteShipping(
  addr: ShippingAddress,
  weightKg = DEFAULT_WEIGHT_KG,
): Promise<EnviaRate[]> {
  const body = {
    origin: ORIGIN,
    destination: buildDestination(addr),
    packages: [buildPackage(weightKg, 'Suplemento')],
    shipment: { carrier: 'all', type: 1 },
  }
  const res = await fetch(`${BASE}/ship/rate/`, {
    method: 'POST', headers: headers(), body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Envia rate failed: ${res.status}`)
  const json = await res.json()
  return (json.data ?? []) as EnviaRate[]
}

export async function generateLabel(
  addr: ShippingAddress,
  carrier: string,
  weightKg = DEFAULT_WEIGHT_KG,
  content = 'Suplemento',
  declaredValue = 0,
): Promise<EnviaLabel> {
  const body = {
    origin: ORIGIN,
    destination: buildDestination(addr),
    packages: [buildPackage(weightKg, content, declaredValue)],
    shipment: { carrier, type: 1, description: content, total: declaredValue },
  }
  const res = await fetch(`${BASE}/ship/generate/`, {
    method: 'POST', headers: headers(), body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Envia generate failed: ${res.status}`)
  const json = await res.json()
  const data = json.data?.[0]
  if (!data) throw new Error('Envia: no data in response')
  return data as EnviaLabel
}

export function selectCarrier(rates: EnviaRate[], tier: 'standard' | 'express'): EnviaRate | null {
  if (!rates.length) return null
  if (tier === 'express') {
    const express = rates.filter((r) =>
      /1.{0,5}d[íi]/i.test(r.deliveryEstimated) || /express/i.test(r.service)
    )
    const pool = express.length > 0 ? express : rates
    return pool.reduce((a, b) => (a.totalPrice <= b.totalPrice ? a : b))
  }
  return rates.reduce((a, b) => (a.totalPrice <= b.totalPrice ? a : b))
}
