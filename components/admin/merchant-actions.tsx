'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

type Action = 'toggle_active' | 'cancel_subscription' | 'delete'

interface Props {
  merchantId: string
  merchantName: string
  isActive: boolean
  hasSubscription: boolean
}

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    return typeof data?.error === 'string' ? data.error : 'No se pudo completar la acción.'
  } catch {
    return 'No se pudo completar la acción.'
  }
}

const WARNINGS: Record<Action, (name: string) => { title: string; body: string; cta: string; danger: boolean }> = {
  toggle_active: (name) => ({
    title: 'Confirmar cambio de estado',
    body: `¿Suspender a ${name}? No podrá acceder a la plataforma hasta que lo reactives. Su suscripción sigue activa y se le seguirá cobrando.`,
    cta: 'Suspender cuenta',
    danger: false,
  }),
  cancel_subscription: (name) => ({
    title: `¿Cancelar suscripción de ${name}?`,
    body: 'Se cancelará la suscripción inmediatamente y se borrará su método de pago. El merchant perderá acceso al catálogo. Esta acción no se puede deshacer.',
    cta: 'Cancelar suscripción',
    danger: true,
  }),
  delete: (name) => ({
    title: `¿Eliminar cuenta de ${name}?`,
    body: 'Se eliminará permanentemente la cuenta, todos sus datos y su suscripción. Esta acción es irreversible.',
    cta: 'Eliminar permanentemente',
    danger: true,
  }),
}

export function MerchantActions({ merchantId, merchantName, isActive, hasSubscription }: Props) {
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState<Action | null>(null)
  const [localActive, setLocalActive] = useState(isActive)
  const [subCancelled, setSubCancelled] = useState(!hasSubscription)
  const [deleted, setDeleted] = useState(false)

  if (deleted) return <span className="text-xs text-gray-400">Eliminado</span>

  async function execute(action: Action) {
    setConfirm(null)
    startTransition(async () => {
      if (action === 'delete') {
        const res = await fetch(`/api/admin/merchants/${merchantId}`, { method: 'DELETE' })
        if (!res.ok) { toast.error(await readError(res)); return }
        setDeleted(true)
        toast.success(`Cuenta de ${merchantName} eliminada.`)
        return
      }
      const res = await fetch(`/api/admin/merchants/${merchantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      // Every one of these branches used to fail SILENTLY: a non-ok response
      // left the row exactly as it was and told the operator nothing.
      if (!res.ok) { toast.error(await readError(res)); return }
      if (action === 'toggle_active') {
        setLocalActive((v) => !v)
        toast.success(localActive ? 'Cuenta suspendida.' : 'Cuenta reactivada.')
      }
      if (action === 'cancel_subscription') {
        setSubCancelled(true)
        toast.success('Suscripción cancelada.')
      }
    })
  }

  const info = confirm ? WARNINGS[confirm](merchantName) : null

  return (
    <div className="space-y-2">
      {confirm && info && (
        <div className={`rounded-xl border p-3 space-y-2 ${info.danger ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className={`mt-0.5 shrink-0 ${info.danger ? 'text-red-600' : 'text-amber-600'}`} />
            <div>
              <p className={`text-xs font-semibold ${info.danger ? 'text-red-800' : 'text-amber-800'}`}>{info.title}</p>
              <p className={`text-xs mt-0.5 ${info.danger ? 'text-red-700' : 'text-amber-700'}`}>{info.body}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => execute(confirm)} disabled={isPending}
              className={`text-xs px-3 py-1 rounded-lg text-white disabled:opacity-50 cursor-pointer ${info.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-900 hover:bg-gray-800'}`}>
              {isPending ? '...' : info.cta}
            </button>
            <button onClick={() => setConfirm(null)} disabled={isPending}
              className="text-xs px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 cursor-pointer">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!confirm && (
        <div className="flex gap-3 justify-end flex-wrap">
          <button onClick={() => {
            if (!localActive) { execute('toggle_active'); return }
            setConfirm('toggle_active')
          }} disabled={isPending}
            className={`text-xs underline cursor-pointer disabled:opacity-50 ${localActive ? 'text-amber-600 hover:text-amber-700' : 'text-green-600 hover:text-green-700'}`}>
            {isPending ? '...' : localActive ? 'Suspender' : 'Reactivar'}
          </button>
          {!subCancelled && (
            <button onClick={() => setConfirm('cancel_subscription')} disabled={isPending}
              className="text-xs text-orange-600 hover:text-orange-700 underline cursor-pointer disabled:opacity-50">
              Cancelar suscripción
            </button>
          )}
          <button onClick={() => setConfirm('delete')} disabled={isPending}
            className="text-xs text-red-600 hover:text-red-700 underline cursor-pointer disabled:opacity-50">
            Eliminar
          </button>
        </div>
      )}
    </div>
  )
}
