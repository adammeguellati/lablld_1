'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Error al procesar')
        return
      }
      toast.success(action === 'approve' ? 'Etiqueta aprobada.' : 'Etiqueta rechazada.')
      setShowReject(false)
      setReason('')
      router.refresh()
    })
  }

  if (showReject) {
    return (
      <div className="space-y-2">
        <textarea
          className="w-full resize-none rounded-[11px] border border-black/[.10] px-3 py-2 text-[13.5px] outline-none transition-colors placeholder:text-[#AEAEB2] focus:border-black/25"
          rows={2}
          placeholder="Razón del rechazo..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {error && <p className="text-[12px] text-[#C0303B]">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => handleAction('reject')}
            disabled={isPending || !reason.trim()}
            className="whitespace-nowrap rounded-[9px] bg-[#C0303B] px-3 py-1.5 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Enviando...' : 'Confirmar rechazo'}
          </button>
          <button
            onClick={() => setShowReject(false)}
            disabled={isPending}
            className="whitespace-nowrap rounded-[9px] border border-black/[.10] px-3 py-1.5 text-[12.5px] font-medium text-[#1D1E20] transition-colors hover:bg-black/[.03]"
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
        className="whitespace-nowrap rounded-[9px] bg-[#1D1E20] px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-[#F97316] disabled:opacity-50"
      >
        {isPending ? '...' : 'Aprobar'}
      </button>
      <button
        onClick={() => setShowReject(true)}
        disabled={isPending}
        className="whitespace-nowrap rounded-[9px] border border-[#C0303B]/30 px-3 py-1.5 text-[12.5px] font-medium text-[#C0303B] transition-colors hover:bg-[#FBE9E6] disabled:opacity-50"
      >
        Rechazar
      </button>
    </div>
  )
}
