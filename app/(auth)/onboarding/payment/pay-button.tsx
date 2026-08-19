'use client'

import { useState } from 'react'
import { createOnboardingPaymentLinkAction } from '../actions'
import type { Plan } from '@/types'

export function WompiPayButton({ plan }: { plan: Plan }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePay() {
    setLoading(true)
    setError(null)
    const result = await createOnboardingPaymentLinkAction(plan)
    if (result.error) { setError(result.error); setLoading(false); return }
    if (result.url) window.location.href = result.url
  }

  return (
    <div className="space-y-3">
      <button onClick={handlePay} disabled={loading}
        className="w-full h-12 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 disabled:opacity-60 transition-all">
        {loading ? 'Redirigiendo a Wompi...' : 'Pagar con Wompi →'}
      </button>
      {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      <p className="text-xs text-gray-400 text-center">Serás redirigido al checkout seguro de Wompi</p>
    </div>
  )
}
