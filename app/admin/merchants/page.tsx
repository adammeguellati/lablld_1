import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ListingControls } from '@/components/admin/listing-controls'
import { ListingPagination } from '@/components/admin/listing-pagination'
import { AdminStatCards } from '@/components/admin/admin-stat-cards'
import { AdminMerchantsTable, type MerchantRow } from '@/components/admin/admin-merchants-table'
import { formatCOP, isAdmin } from '@/lib/utils'

const PAGE_SIZE = 25

// The facets are what the schema can actually express. The design's pill
// vocabulary adds "Mes gratis", which needs a trial state the code has no column
// for; that is on the gift-a-month card, gated adam_authorizes.
const FACETS = [
  { value: 'active', label: 'Al día' },
  { value: 'past_due', label: 'Pago vencido' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'no_plan', label: 'Sin plan' },
  { value: 'suspended', label: 'Suspendida' },
]

function facetOf(m: MerchantRow): string {
  if (m.is_active === false) return 'suspended'
  if (!m.plan) return 'no_plan'
  return m.plan_status ?? 'no_plan'
}

interface PageProps {
  searchParams: Promise<{ q?: string; estado?: string; page?: string }>
}

export default async function AdminMerchantsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) redirect('/login')

  const db = createAdminClient()
  const [merchantsRes, ordersRes] = await Promise.all([
    db.from('merchants')
      .select('id, full_name, email, plan, plan_status, pending_plan, is_active, created_at')
      .order('created_at', { ascending: false }),
    // Aggregated here rather than in SQL: postgrest has no group-by, and the
    // alternative is a view. Order count and lifetime volume are derived, so
    // neither needs a column.
    db.from('orders').select('merchant_id, fulfillment_cost, status'),
  ])

  const totals = new Map<string, { orders: number; volume: number }>()
  for (const o of (ordersRes.data ?? []) as { merchant_id: string; fulfillment_cost: number | null; status: string }[]) {
    const t = totals.get(o.merchant_id) ?? { orders: 0, volume: 0 }
    t.orders += 1
    if (o.status !== 'cancelled' && o.status !== 'payment_failed') t.volume += o.fulfillment_cost ?? 0
    totals.set(o.merchant_id, t)
  }

  let rows = ((merchantsRes.data as unknown as MerchantRow[]) ?? []).map((m) => ({
    ...m,
    orderCount: totals.get(m.id)?.orders ?? 0,
    lifetimeVolume: totals.get(m.id)?.volume ?? 0,
  }))

  const totalAll = rows.length
  const counts = new Map<string, number>()
  for (const m of rows) counts.set(facetOf(m), (counts.get(facetOf(m)) ?? 0) + 1)
  const activeCount = rows.filter((m) => m.is_active !== false && m.plan).length
  const lifetime = rows.reduce((s, m) => s + m.lifetimeVolume, 0)

  if (params.estado) rows = rows.filter((m) => facetOf(m) === params.estado)
  if (params.q) {
    const q = params.q.toLowerCase()
    rows = rows.filter((m) =>
      (m.full_name ?? '').toLowerCase().includes(q) || (m.email ?? '').toLowerCase().includes(q))
  }

  const total = rows.length
  const page = Math.max(1, Number(params.page ?? '1') || 1)
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <h1 className="text-[36px] font-normal leading-[1.12] tracking-[0]">Merchants</h1>

      <Suspense fallback={null}>
        <AdminStatCards basePath="/admin/merchants" facetKey="estado" stats={[
          { key: 'total', label: 'Registrados', value: totalAll },
          { key: 'active', label: 'Con plan activo', value: activeCount, facet: 'active' },
          { key: 'suspended', label: 'Suspendidos', value: counts.get('suspended') ?? 0, facet: 'suspended' },
          { key: 'volume', label: 'Volumen histórico', value: formatCOP(lifetime) },
        ]} />
      </Suspense>

      <div className="rounded-[22px] border border-black/[.08] bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]">
        <Suspense fallback={null}>
          <ListingControls basePath="/admin/merchants" placeholder="Buscar por nombre o correo"
            facetKey="estado" total={totalAll}
            facets={FACETS.map((f) => ({ ...f, count: counts.get(f.value) ?? 0 }))} />
        </Suspense>
        <div className="mt-6">
          <AdminMerchantsTable rows={pageRows} filtered={Boolean(params.q || params.estado)} />
        </div>
        <Suspense fallback={null}>
          <ListingPagination basePath="/admin/merchants" page={page} pageSize={PAGE_SIZE} total={total} />
        </Suspense>
      </div>
    </div>
  )
}
