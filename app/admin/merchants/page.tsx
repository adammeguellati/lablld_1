import { createAdminClient } from '@/lib/supabase/admin'
import { MerchantActions } from '@/components/admin/merchant-actions'
import { formatDate } from '@/lib/utils'

const PLAN_LABELS: Record<string, string> = { starter: 'Esencial', plus: 'Pro' }
const STATUS_COLORS: Record<string, string> = {
  active: 'text-green-700 bg-green-100',
  past_due: 'text-red-700 bg-red-100',
  cancelled: 'text-gray-600 bg-gray-100',
}
const STATUS_LABELS: Record<string, string> = {
  active: 'Activo', past_due: 'Pago vencido', cancelled: 'Cancelado',
}

export default async function AdminMerchantsPage() {
  const db = createAdminClient()
  const { data: merchants } = await db
    .from('merchants')
    .select('id, full_name, email, plan, plan_status, pending_plan, is_active, wompi_payment_source_id, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Merchants</h1>
        <p className="text-sm text-gray-500 mt-1">{merchants?.length ?? 0} merchants registrados</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-500">Merchant</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Plan</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Registro</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(merchants ?? []).map((m) => (
              <tr key={m.id} className={m.is_active === false ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate max-w-[160px]">{m.full_name}</p>
                      <p className="text-gray-500 text-xs truncate max-w-[160px]">{m.email}</p>
                    </div>
                    {m.is_active === false && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 font-medium shrink-0">Suspendido</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-gray-900">
                    {m.plan ? PLAN_LABELS[m.plan] ?? m.plan : <span className="text-gray-400">Sin plan</span>}
                  </span>
                  {m.pending_plan && (
                    <span className="ml-1 text-xs text-amber-600 block sm:inline">(→ {PLAN_LABELS[m.pending_plan]} programado)</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {m.plan_status ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[m.plan_status] ?? 'text-gray-600 bg-gray-100'}`}>
                      {STATUS_LABELS[m.plan_status] ?? m.plan_status}
                    </span>
                  ) : '-'}
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(m.created_at)}</td>
                <td className="px-4 py-3">
                  <MerchantActions
                    merchantId={m.id}
                    merchantName={m.full_name}
                    isActive={m.is_active !== false}
                    hasSubscription={!!m.plan}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
