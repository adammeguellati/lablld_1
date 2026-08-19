'use client'

import { useState, useTransition } from 'react'

export function MerchantCancelButton({ merchantId }: { merchantId: string }) {
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState(false)
  const [done, setDone] = useState(false)

  if (done) return <span className="text-xs text-gray-400">Cancelada</span>

  if (confirm) {
    return (
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => startTransition(async () => {
            await fetch(`/api/admin/merchants/${merchantId}`, { method: 'DELETE' })
            setDone(true)
          })}
          disabled={isPending}
          className="text-xs px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer"
        >
          {isPending ? '...' : 'Confirmar'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          disabled={isPending}
          className="text-xs px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
        >
          No
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-xs text-red-600 hover:text-red-700 underline cursor-pointer"
    >
      Cancelar suscripción
    </button>
  )
}
