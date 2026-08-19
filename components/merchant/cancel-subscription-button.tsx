'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cancelSubscriptionAction, revertCancelAction } from '@/app/(merchant)/settings/billing/actions'
import { formatDate } from '@/lib/utils'

interface Props { cancelAt?: string | null }

export function CancelSubscriptionButton({ cancelAt: initialCancelAt }: Props) {
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancelAt, setCancelAt] = useState(initialCancelAt ?? null)

  function scheduleCancel() {
    startTransition(async () => {
      const r = await cancelSubscriptionAction()
      if (r.error) { setError(r.error); setConfirm(false) }
      else {
        setConfirm(false)
        // reload to get the updated cancel date from server
        window.location.reload()
      }
    })
  }

  function revert() {
    startTransition(async () => {
      const r = await revertCancelAction()
      if (r.error) setError(r.error)
      else setCancelAt(null)
    })
  }

  if (cancelAt) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Suscripción programada para cancelarse</p>
            <p className="text-sm text-amber-700">
              Tu acceso continuará hasta el <strong>{formatDate(cancelAt)}</strong>. Después de esa fecha no se realizarán más cobros y volverás al proceso de onboarding.
            </p>
          </div>
        </div>
        <button
          onClick={revert}
          disabled={isPending}
          className="text-sm text-amber-800 underline hover:text-amber-900 cursor-pointer disabled:opacity-50"
        >
          {isPending ? 'Procesando...' : 'Revertir — mantener suscripción activa'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  if (confirm) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-red-800">¿Cancelar tu suscripción?</p>
            <p className="text-sm text-red-700">
              Seguirás con acceso hasta el final de tu ciclo actual. Después no se realizarán más cobros y perderás acceso al catálogo y tus productos.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={scheduleCancel} disabled={isPending}
            className="px-4 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer">
            {isPending ? 'Procesando...' : 'Sí, cancelar al fin del ciclo'}
          </button>
          <button onClick={() => setConfirm(false)} disabled={isPending}
            className="px-4 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 cursor-pointer">
            Mantener suscripción
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <button onClick={() => setConfirm(true)}
      className="text-sm text-red-600 hover:text-red-700 underline cursor-pointer">
      Cancelar suscripción
    </button>
  )
}
