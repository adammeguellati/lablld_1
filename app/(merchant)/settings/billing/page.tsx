import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PlanSwitcher } from '@/components/merchant/plan-switcher'
import { CancelSubscriptionButton } from '@/components/merchant/cancel-subscription-button'
import { ChangePaymentForm } from '@/components/merchant/change-payment-form'
import { getPlanPriceCOP } from '@/lib/wompi'
import { formatCOP, formatDate } from '@/lib/utils'
import type { Plan } from '@/types'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo', past_due: 'Pago vencido', cancelled: 'Cancelado',
}
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  past_due: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()
  const { data: merchant } = await db
    .from('merchants')
    .select('plan, pending_plan, plan_status, plan_cancel_at, wompi_payment_source_id, subscription_next_billing_at')
    .eq('id', user.id)
    .single()

  if (!merchant) redirect('/login')

  const starterPrice = getPlanPriceCOP('starter')

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Facturación</h1>
        <p className="text-sm text-gray-500 mt-1">Gestiona tu plan y método de pago</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Tu suscripción</h2>
          {merchant.plan ? (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[merchant.plan_status] ?? 'bg-gray-100 text-gray-600'}`}>
              {STATUS_LABELS[merchant.plan_status] ?? merchant.plan_status}
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Sin plan</span>
          )}
        </div>

        {merchant.plan ? (
          <>
            <PlanSwitcher currentPlan={merchant.plan as Plan} pendingPlan={merchant.pending_plan as Plan | null} />
            {merchant.subscription_next_billing_at && (
              <p className="text-xs text-gray-400">
                Próxima renovación: {formatDate(merchant.subscription_next_billing_at)}
                {merchant.plan_cancel_at && ' · Cancelación programada'}
              </p>
            )}
          </>
        ) : (
          <div className="max-w-sm">
            <div className="rounded-xl border-2 border-gray-900 p-5 space-y-4">
              <div>
                <p className="font-bold text-gray-900 text-lg">Esencial</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCOP(starterPrice)}<span className="text-sm font-normal text-gray-400">/mes</span></p>
              </div>
              <ul className="space-y-1.5">
                {['Acceso completo al catálogo', '1 Integración de tienda', 'Mockups de producto', 'Soporte por email y WhatsApp', 'Recursos de marketing'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-emerald-500 font-bold shrink-0">✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/onboarding/payment?plan=starter" className="block w-full text-center py-2.5 rounded-lg text-sm font-semibold transition-colors bg-gray-900 text-white hover:bg-gray-700">
                Contratar Esencial
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Método de pago</p>
        </div>
        {merchant.wompi_payment_source_id ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-7 bg-gray-100 rounded flex items-center justify-center text-xs font-bold text-gray-500">CARD</div>
              <p className="text-sm text-gray-700">Tarjeta guardada <span className="text-gray-400 text-xs">(ID {merchant.wompi_payment_source_id})</span></p>
            </div>
            <ChangePaymentForm />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">No tienes tarjeta guardada.</p>
            <ChangePaymentForm />
          </div>
        )}
      </div>

      {merchant.plan_status !== 'cancelled' && merchant.plan && (
        <div className="pt-2">
          <CancelSubscriptionButton cancelAt={merchant.plan_cancel_at ?? null} />
        </div>
      )}
    </div>
  )
}
