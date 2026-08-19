'use client'

import { useState, type ChangeEvent } from 'react'
import { updatePaymentMethodAction } from '@/app/(merchant)/settings/billing/actions'

const _pub = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ?? ''
const WOMPI_BASE = _pub.startsWith('pub_test_')
  ? 'https://sandbox.wompi.co/v1'
  : 'https://production.wompi.co/v1'

const ic = 'w-full h-9 border border-gray-200 rounded-lg px-3 text-sm outline-none focus:border-gray-400 bg-white transition-colors placeholder:text-gray-400'

export function ChangePaymentForm() {
  const [open, setOpen] = useState(false)
  const [number, setNumber] = useState('')
  const [holder, setHolder] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function formatNumber(v: string) {
    return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  }
  function formatExpiry(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 4)
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const [expMonth, expYear] = expiry.split('/')
    try {
      const res = await fetch(`${WOMPI_BASE}/tokens/cards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: number.replace(/\s/g, ''),
          exp_month: expMonth,
          exp_year: expYear,
          cvc,
          card_holder: holder.toUpperCase(),
        }),
      })
      const data = await res.json() as { id?: string; error?: { reason: string } }
      if (!res.ok || !data.id) { setError(data.error?.reason ?? 'Tarjeta inválida'); setLoading(false); return }

      const result = await updatePaymentMethodAction(data.id)
      if (result.error) { setError(result.error); setLoading(false); return }
      setOpen(false)
    } catch {
      setError('Error de conexión')
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="text-xs text-gray-500 underline hover:text-gray-700 transition-colors">
        Cambiar tarjeta
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-2 mt-2">
      <input value={number} onChange={(e: ChangeEvent<HTMLInputElement>) => setNumber(formatNumber(e.target.value))}
        placeholder="Número de tarjeta" required inputMode="numeric" className={ic} />
      <input value={holder} onChange={(e: ChangeEvent<HTMLInputElement>) => setHolder(e.target.value)}
        placeholder="Nombre en la tarjeta" required className={ic} />
      <div className="grid grid-cols-2 gap-2">
        <input value={expiry} onChange={(e: ChangeEvent<HTMLInputElement>) => setExpiry(formatExpiry(e.target.value))}
          placeholder="MM/AA" required inputMode="numeric" className={ic} />
        <input value={cvc} onChange={(e: ChangeEvent<HTMLInputElement>) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="CVC" required inputMode="numeric" className={ic} />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="h-8 px-4 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="h-8 px-4 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  )
}
