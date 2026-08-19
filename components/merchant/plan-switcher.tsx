'use client'

import { useState, useTransition } from 'react'
import { Check, AlertTriangle } from 'lucide-react'
import { changePlanAction, cancelPendingPlanAction } from '@/app/(merchant)/settings/billing/actions'
import { formatCOP } from '@/lib/utils'
import type { Plan } from '@/types'

const PLANS = [
  {
    id: 'starter' as Plan, name: 'Esencial', price: 119000,
    features: ['Acceso completo al catálogo', '1 Integración de tienda', 'Mockups de producto (fondo blanco)', 'Soporte por email y WhatsApp', 'Recursos de marketing incluidos'],
  },
]

type ConfirmType = 'upgrade' | 'downgrade' | 'cancel_pending'

const CONFIRMS: Record<ConfirmType, { title: string; body: string; cta: string }> = {
  upgrade: {
    title: '¿Actualizar a Pro?',
    body: 'Se cobrará de inmediato el valor proporcional a los días restantes del ciclo actual (prorrateo). Por ejemplo, si quedan 15 días del mes, pagarás aprox. la mitad de la diferencia entre planes.',
    cta: 'Confirmar y pagar',
  },
  downgrade: {
    title: '¿Cambiar a Esencial al próximo ciclo?',
    body: 'Conservarás todos los beneficios de Pro hasta que termine tu ciclo actual. El cambio a Esencial se aplicará automáticamente en la próxima renovación, sin cobros adicionales.',
    cta: 'Programar cambio a Esencial',
  },
  cancel_pending: {
    title: '¿Cancelar el cambio programado a Esencial?',
    body: 'Tu suscripción Pro se renovará normalmente al precio actual. El cambio a Esencial quedará descartado.',
    cta: 'Sí, conservar Pro',
  },
}

interface Props { currentPlan: Plan; pendingPlan?: Plan | null }

export function PlanSwitcher({ currentPlan, pendingPlan }: Props) {
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState<ConfirmType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function execute(type: ConfirmType) {
    setConfirm(null)
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      if (type === 'cancel_pending') {
        const r = await cancelPendingPlanAction()
        if (r.error) setError(r.error)
        else setSuccess('Cambio cancelado. Tu plan Plus continúa sin modificaciones.')
        return
      }
      const r = await changePlanAction(type === 'upgrade' ? 'plus' : 'starter')
      if (r.error) setError(r.error)
      else setSuccess(type === 'upgrade'
        ? 'Actualizado a Plus correctamente. Se cobró el prorrateo en tu tarjeta.'
        : 'Cambio a Starter programado para tu próximo ciclo de facturación.'
      )
    })
  }

  return (
    <div className="space-y-4">
      {confirm && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-800">{CONFIRMS[confirm].title}</p>
              <p className="text-sm text-amber-700">{CONFIRMS[confirm].body}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => execute(confirm)} disabled={isPending}
              className="px-4 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 cursor-pointer">
              {isPending ? 'Procesando...' : CONFIRMS[confirm].cta}
            </button>
            <button onClick={() => setConfirm(null)} disabled={isPending}
              className="px-4 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 cursor-pointer">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan
          const isPendingThis = plan.id === pendingPlan
          const isDowngrade = plan.id === 'starter' && currentPlan === 'plus' && !pendingPlan

          return (
            <div key={plan.id} className={`rounded-xl border p-5 space-y-4 ${isCurrent ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-semibold text-gray-900">{plan.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatCOP(plan.price)}<span className="text-sm font-normal text-gray-500">/mes</span></p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {isCurrent && <span className="text-xs bg-gray-900 text-white px-2.5 py-1 rounded-full font-medium">Plan actual</span>}
                  {isPendingThis && <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">Cambio programado</span>}
                </div>
              </div>
              <ul className="space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check size={14} className="text-green-500 mt-0.5 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              {isPendingThis && (
                <div className="space-y-1.5">
                  <button onClick={() => setConfirm('cancel_pending')} disabled={isPending}
                    className="w-full py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer">
                    Cancelar cambio a Esencial
                  </button>
                  <p className="text-xs text-gray-500 text-center">Cambio efectivo al próximo ciclo de facturación</p>
                </div>
              )}
              {isDowngrade && (
                <div className="space-y-1.5">
                  <button onClick={() => setConfirm('downgrade')} disabled={isPending}
                    className="w-full py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer">
                    Cambiar a Esencial
                  </button>
                  <p className="text-xs text-gray-500 text-center">El cambio es efectivo al próximo ciclo</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
    </div>
  )
}
