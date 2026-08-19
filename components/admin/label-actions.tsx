'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  merchantProductId: string
}

export function LabelActions({ merchantProductId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleAction(action: 'approve' | 'reject') {
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/admin/labels/${merchantProductId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: action === 'reject' ? reason : undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al procesar')
        return
      }
      setShowReject(false)
      setReason('')
      router.refresh()
    })
  }

  if (showReject) {
    return (
      <div className="space-y-2">
        <textarea
          className="w-full border rounded px-2 py-1 text-sm resize-none"
          rows={2}
          placeholder="Razón del rechazo..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => handleAction('reject')}
            disabled={isPending || !reason.trim()}
            className="text-xs px-3 py-1 bg-destructive text-white rounded disabled:opacity-50"
          >
            {isPending ? 'Enviando...' : 'Confirmar rechazo'}
          </button>
          <button
            onClick={() => setShowReject(false)}
            disabled={isPending}
            className="text-xs px-3 py-1 border rounded"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleAction('approve')}
        disabled={isPending}
        className="text-xs px-3 py-1 bg-emerald-600 text-white rounded disabled:opacity-50"
      >
        {isPending ? '...' : 'Aprobar'}
      </button>
      <button
        onClick={() => setShowReject(true)}
        disabled={isPending}
        className="text-xs px-3 py-1 border border-destructive text-destructive rounded disabled:opacity-50"
      >
        Rechazar
      </button>
    </div>
  )
}
