import { MerchantAvatar } from './merchant-avatar'
import { MerchantRowMenu } from './merchant-row-menu'
import { formatCOP } from '@/lib/utils'

export interface MerchantRow {
  id: string
  full_name: string
  email: string
  plan: string | null
  plan_status: string | null
  pending_plan: string | null
  is_active: boolean | null
  created_at: string
  orderCount: number
  lifetimeVolume: number
}

const PLAN_LABELS: Record<string, string> = { starter: 'Esencial', plus: 'Pro' }

// The design's vocabulary is Esencial / Gratis / Mes gratis / Pago vencido /
// Suspendida. These are the states the schema can actually hold: there is no
// trial column, so "Mes gratis" has nothing to read.
function statePill(m: MerchantRow): { label: string; cls: string } {
  if (m.is_active === false) return { label: 'Suspendida', cls: 'bg-[#F0F0F3] text-[#6E6E73]' }
  if (!m.plan) return { label: 'Sin plan', cls: 'bg-[#F0F0F3] text-[#86868B]' }
  if (m.plan_status === 'past_due') return { label: 'Pago vencido', cls: 'bg-[#FBE9E6] text-[#C0303B]' }
  if (m.plan_status === 'cancelled') return { label: 'Cancelada', cls: 'bg-[#F0F0F3] text-[#86868B]' }
  return { label: 'Al día', cls: 'bg-[#E6F6EB] text-[#16A34A]' }
}

/** "Desde mar 2026", per the design. */
function joinedLabel(iso: string): string {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso)
  return `Desde ${new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric' }).format(d)}`
}

export function AdminMerchantsTable({ rows, filtered }: { rows: MerchantRow[]; filtered: boolean }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[18px] border border-dashed border-black/[.12] py-14 text-center">
        <p className="text-[15px] text-[#6E6E73]">
          {filtered ? 'Ningún merchant coincide con tu búsqueda.' : 'No hay merchants registrados aún.'}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] border-collapse text-left">
        <thead>
          <tr className="border-b border-black/[.08]">
            {['Merchant', 'Plan', 'Estado', 'Órdenes', 'Volumen', ''].map((h) => (
              <th key={h} className="whitespace-nowrap pb-3 pr-3 text-[12px] font-medium uppercase tracking-[.04em] text-[#86868B]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const pill = statePill(m)
            return (
              <tr key={m.id} className={`border-b border-black/[.05] last:border-0 ${m.is_active === false ? 'opacity-60' : ''}`}>
                <td className="py-3.5 pr-3">
                  <div className="flex items-center gap-3">
                    <MerchantAvatar name={m.full_name} id={m.id} />
                    <div className="min-w-0">
                      <p className="truncate text-[14.5px] font-medium text-[#1D1E20]">{m.full_name}</p>
                      <p className="truncate text-[12.5px] text-[#86868B]">{m.email}</p>
                      <p className="text-[12px] text-[#AEAEB2]">{joinedLabel(m.created_at)}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 pr-3 text-[14px] text-[#1D1E20]">
                  {m.plan ? PLAN_LABELS[m.plan] ?? m.plan : <span className="text-[#AEAEB2]">—</span>}
                  {m.pending_plan && (
                    <span className="block text-[12px] text-[#B4690E]">→ {PLAN_LABELS[m.pending_plan] ?? m.pending_plan} programado</span>
                  )}
                </td>
                <td className="py-3.5 pr-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${pill.cls}`}>{pill.label}</span>
                </td>
                <td className="py-3.5 pr-3 text-[14px] text-[#1D1E20]">{m.orderCount}</td>
                <td className="py-3.5 pr-3 text-[14px] text-[#1D1E20]">
                  {m.lifetimeVolume > 0 ? formatCOP(m.lifetimeVolume) : <span className="text-[#AEAEB2]">—</span>}
                </td>
                <td className="py-3.5">
                  <MerchantRowMenu merchantId={m.id} merchantName={m.full_name} merchantEmail={m.email}
                    isActive={m.is_active !== false} hasSubscription={Boolean(m.plan)} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
