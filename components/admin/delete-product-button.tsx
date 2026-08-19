'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export function DeleteProductButton({ productId }: { productId: string }) {
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => {
      const res = await fetch(`/api/admin/products/${productId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Error al eliminar')
        setConfirm(false)
        return
      }
      router.push('/admin/products')
      router.refresh()
    })
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="flex items-center gap-1.5 text-sm text-red-600 border border-red-200 rounded-lg px-3 py-2 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
        Eliminar
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <span className="text-sm text-gray-600">¿Confirmar eliminación?</span>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="text-sm font-semibold text-white bg-red-600 rounded-lg px-3 py-2 hover:bg-red-700 transition-colors disabled:opacity-60"
      >
        {isPending ? 'Eliminando...' : 'Sí, eliminar'}
      </button>
      <button
        onClick={() => setConfirm(false)}
        className="text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
      >
        Cancelar
      </button>
    </div>
  )
}
