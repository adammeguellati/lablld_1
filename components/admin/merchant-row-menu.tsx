'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { MoreVertical, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

type Action = 'toggle_active' | 'cancel_subscription' | 'delete'

interface Props {
  merchantId: string
  merchantName: string
  merchantEmail: string
  isActive: boolean
  hasSubscription: boolean
}

const WARNINGS: Record<Action, (name: string) => { title: string; body: string; cta: string; danger: boolean }> = {
  toggle_active: (name) => ({
    title: `¿Suspender a ${name}?`,
    body: 'No podrá acceder a la plataforma hasta que lo reactives. Su suscripción sigue activa y se le seguirá cobrando.',
    cta: 'Suspender cuenta', danger: false,
  }),
  cancel_subscription: (name) => ({
    title: `¿Cancelar la suscripción de ${name}?`,
    body: 'Se cancelará de inmediato y se borrará su método de pago. Perderá acceso al catálogo. No se puede deshacer.',
    cta: 'Cancelar suscripción', danger: true,
  }),
  // The design specifies this copy and it is materially different from a generic
  // warning: it names what is destroyed AND what survives, because the thing an
  // operator actually needs to know is that invoiced orders are not lost.
  delete: (name) => ({
    title: `¿Eliminar la cuenta de ${name}?`,
    body: 'Se eliminan su perfil, sus productos y sus etiquetas. Las órdenes ya facturadas se conservan. Esta acción es irreversible.',
    cta: 'Eliminar permanentemente', danger: true,
  }),
}

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    return typeof data?.error === 'string' ? data.error : 'No se pudo completar la acción.'
  } catch {
    return 'No se pudo completar la acción.'
  }
}

export function MerchantRowMenu({ merchantId, merchantName, merchantEmail, isActive, hasSubscription }: Props) {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState<Action | null>(null)
  const [localActive, setLocalActive] = useState(isActive)
  const [subCancelled, setSubCancelled] = useState(!hasSubscription)
  const [deleted, setDeleted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function execute(action: Action) {
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
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
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

  if (deleted) return <span className="text-[13px] text-[#AEAEB2]">Eliminada</span>

  const info = confirm ? WARNINGS[confirm](merchantName) : null
  const item = 'flex w-full items-center px-3.5 py-2.5 text-left text-[13.5px] transition-colors hover:bg-black/[.03] disabled:opacity-50'

  return (
    <div ref={wrap} className="relative flex justify-end">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={`Acciones para ${merchantName}`}
        aria-expanded={open}
        className="rounded-lg p-1.5 text-[#6E6E73] transition-colors hover:bg-black/[.04] hover:text-[#1D1E20]">
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && !confirm && (
        <div role="menu" className="absolute right-0 top-9 z-20 w-60 overflow-hidden rounded-[14px] border border-black/[.08] bg-white py-1 shadow-[0_10px_34px_-12px_rgba(0,0,0,.28)]">
          <a href={`mailto:${merchantEmail}`} className={`${item} flex-col items-start gap-0.5`} onClick={() => setOpen(false)}>
            <span className="text-[#1D1E20]">Enviar correo</span>
            <span className="truncate text-[12px] text-[#86868B]">{merchantEmail}</span>
          </a>
          <div className="my-1 h-px bg-black/[.06]" />
          <button type="button" disabled={isPending} className={`${item} text-[#1D1E20]`}
            onClick={() => { setOpen(false); if (!localActive) execute('toggle_active'); else setConfirm('toggle_active') }}>
            {localActive ? 'Suspender cuenta' : 'Reactivar cuenta'}
          </button>
          {!subCancelled && (
            <button type="button" disabled={isPending} className={`${item} text-[#1D1E20]`}
              onClick={() => { setOpen(false); setConfirm('cancel_subscription') }}>
              Cancelar suscripción
            </button>
          )}
          <div className="my-1 h-px bg-black/[.06]" />
          <button type="button" disabled={isPending} className={`${item} text-[#C0303B]`}
            onClick={() => { setOpen(false); setConfirm('delete') }}>
            Eliminar cuenta
          </button>
        </div>
      )}

      {confirm && info && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm"
          onClick={() => setConfirm(null)}>
          <div onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[20px] border border-black/[.08] bg-white p-6 shadow-[0_24px_60px_-24px_rgba(0,0,0,.45)]">
            <div className="flex items-start gap-3">
              <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${info.danger ? 'text-[#C0303B]' : 'text-[#B4690E]'}`} />
              <div>
                <p className="text-[16px] font-medium text-[#1D1E20]">{info.title}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#6E6E73]">{info.body}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setConfirm(null)} disabled={isPending}
                className="rounded-[11px] border border-black/[.10] px-4 py-2.5 text-[14px] font-medium text-[#1D1E20] transition-colors hover:bg-black/[.03] disabled:opacity-50">
                Cancelar
              </button>
              <button type="button" onClick={() => execute(confirm)} disabled={isPending}
                className={`rounded-[11px] px-4 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${
                  info.danger ? 'bg-[#C0303B]' : 'bg-[#1D1E20]'
                }`}>
                {isPending ? 'Procesando...' : info.cta}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
