import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signLabelUrls } from '@/lib/storage'
import { ListingControls } from '@/components/admin/listing-controls'
import { ListingPagination } from '@/components/admin/listing-pagination'
import { AdminStatCards } from '@/components/admin/admin-stat-cards'
import { AdminOrdersTable, type AdminOrderRow } from '@/components/admin/admin-orders-table'
import { ORDER_STATUS_LABELS, ORDER_STATUS_ORDER } from '@/lib/order-status'
import { formatCOP, isAdmin } from '@/lib/utils'
import type { Order, OrderStatus } from '@/types'

const PAGE_SIZE = 25
const OPEN: OrderStatus[] = ['quote_pending', 'payment_pending', 'pending', 'paid', 'in_production']

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) redirect('/login')

  const db = createAdminClient()
  const { data } = await db
    .from('orders')
    .select('*, merchant:merchants(full_name), order_items(id, product_name, quantity, merchant_product:merchant_products(label_url))')
    .order('created_at', { ascending: false })

  let rows = (data as unknown as AdminOrderRow[]) ?? []

  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.status, (counts.get(r.status) ?? 0) + 1)
  const totalAll = rows.length
  const openCount = rows.filter((r) => OPEN.includes(r.status)).length
  const revenue = rows
    .filter((r) => r.status !== 'cancelled' && r.status !== 'payment_failed')
    .reduce((sum, r) => sum + (r.fulfillment_cost ?? 0), 0)

  if (params.status) rows = rows.filter((r) => r.status === params.status)
  if (params.q) {
    const q = params.q.toLowerCase()
    rows = rows.filter((r) =>
      String(r.shopify_order_number ?? '').includes(q) ||
      r.id.toLowerCase().includes(q) ||
      (r.merchant?.full_name ?? '').toLowerCase().includes(q) ||
      (r.customer_name ?? '').toLowerCase().includes(q) ||
      (r.order_items ?? []).some((i) => (i.product_name ?? '').toLowerCase().includes(q)),
    )
  }

  const total = rows.length
  const page = Math.max(1, Number(params.page ?? '1') || 1)
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Signed only for the page being rendered. Signing every label on every order
  // in the table would be one storage round trip per row, most of them for rows
  // nobody is looking at.
  const flat = pageRows.flatMap((r) => (r.order_items ?? []).map((i) => i.merchant_product?.label_url))
  const signed = await signLabelUrls(flat)
  const labelUrls: Record<string, string | null> = {}
  let n = 0
  for (const r of pageRows) for (const i of r.order_items ?? []) labelUrls[i.id] = signed[n++]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-[36px] font-normal leading-[1.12] tracking-[0]">Órdenes</h1>
        <Link href="/admin/orders/new"
          className="flex flex-none items-center gap-2.5 rounded-[15px] bg-[#1D1E20] px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#F97316]">
          <Plus className="h-[17px] w-[17px]" strokeWidth={2} />
          Nuevo pedido
        </Link>
      </div>

      <Suspense fallback={null}>
        <AdminStatCards basePath="/admin/orders" facetKey="status" stats={[
          { key: 'total', label: 'Órdenes', value: totalAll },
          { key: 'open', label: 'En curso', value: openCount },
          { key: 'shipped', label: 'Enviadas', value: counts.get('shipped') ?? 0, facet: 'shipped' },
          { key: 'revenue', label: 'Facturado', value: formatCOP(revenue) },
        ]} />
      </Suspense>

      <div className="rounded-[22px] border border-black/[.08] bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]">
        <Suspense fallback={null}>
          <ListingControls
            basePath="/admin/orders"
            placeholder="Buscar por orden, merchant, cliente o producto"
            facetKey="status"
            total={totalAll}
            facets={ORDER_STATUS_ORDER.map((s) => ({
              value: s, label: ORDER_STATUS_LABELS[s], count: counts.get(s) ?? 0,
            }))}
          />
        </Suspense>

        <div className="mt-6">
          <AdminOrdersTable rows={pageRows} labelUrls={labelUrls} filtered={Boolean(params.q || params.status)} />
        </div>

        <Suspense fallback={null}>
          <ListingPagination basePath="/admin/orders" page={page} pageSize={PAGE_SIZE} total={total} />
        </Suspense>
      </div>
    </div>
  )
}

export type { Order }
