import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ListingControls } from '@/components/admin/listing-controls'
import { ListingPagination } from '@/components/admin/listing-pagination'
import { AdminStatCards } from '@/components/admin/admin-stat-cards'
import { AdminProductsTable } from '@/components/admin/admin-products-table'
import { CATEGORY_LABELS, CATEGORY_VALUES } from '@/lib/product-category'
import { isAdmin } from '@/lib/utils'
import type { Product } from '@/types'

const PAGE_SIZE = 25

interface PageProps {
  searchParams: Promise<{ q?: string; categoria?: string; page?: string }>
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) redirect('/login')

  const db = createAdminClient()
  const [{ data: products }, { data: mpCounts }] = await Promise.all([
    db.from('products').select('*').order('created_at', { ascending: false }),
    db.from('merchant_products').select('product_id, merchant_id'),
  ])

  const merchantCount = new Map<string, number>()
  for (const row of (mpCounts ?? [])) {
    merchantCount.set(row.product_id, (merchantCount.get(row.product_id) ?? 0) + 1)
  }

  let rows = ((products as Product[]) ?? [])
  const totalAll = rows.length
  const counts = new Map<string, number>()
  for (const p of rows) counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
  const activeCount = rows.filter((p) => p.is_active).length
  const outOfStock = rows.filter((p) => p.stock === 0).length

  if (params.categoria) rows = rows.filter((p) => p.category === params.categoria)
  if (params.q) {
    const q = params.q.toLowerCase()
    rows = rows.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q))
  }

  const total = rows.length
  const page = Math.max(1, Number(params.page ?? '1') || 1)
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-[36px] font-normal leading-[1.12] tracking-[0]">Productos</h1>
        <Link href="/admin/products/new"
          className="flex flex-none items-center gap-2.5 rounded-[15px] bg-[#1D1E20] px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#F97316]">
          <Plus className="h-[17px] w-[17px]" strokeWidth={2} />
          Nuevo producto
        </Link>
      </div>

      <Suspense fallback={null}>
        <AdminStatCards basePath="/admin/products" facetKey="categoria" stats={[
          { key: 'total', label: 'Productos', value: totalAll },
          { key: 'active', label: 'Activos', value: activeCount },
          { key: 'stock', label: 'Agotados', value: outOfStock },
          { key: 'cat', label: 'Categorías', value: CATEGORY_VALUES.length },
        ]} />
      </Suspense>

      <div className="rounded-[22px] border border-black/[.08] bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]">
        <Suspense fallback={null}>
          <ListingControls basePath="/admin/products" placeholder="Buscar por nombre o SKU"
            facetKey="categoria" total={totalAll}
            facets={CATEGORY_VALUES.map((v) => ({ value: v, label: CATEGORY_LABELS[v], count: counts.get(v) ?? 0 }))} />
        </Suspense>
        <div className="mt-6">
          <AdminProductsTable rows={pageRows} merchantCount={Object.fromEntries(merchantCount)}
            filtered={Boolean(params.q || params.categoria)} />
        </div>
        <Suspense fallback={null}>
          <ListingPagination basePath="/admin/products" page={page} pageSize={PAGE_SIZE} total={total} />
        </Suspense>
      </div>
    </div>
  )
}
