import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProductCard } from '@/components/merchant/product-card'
import { CatalogFilters } from '@/components/merchant/catalog-filters'
import { CatalogPagination } from '@/components/merchant/catalog-pagination'
import Link from 'next/link'
import { Plus, Truck } from 'lucide-react'
import type { Product, Merchant } from '@/types'

const PAGE_SIZE = 28
const PRODUCT_FIELDS = 'id,name,slug,category,format,short_description,images,is_new,icons,wholesale_price_usd,base_price,price_cop,suggested_retail_price_cop,stock,created_at,available_tiers'

const getCachedProducts = unstable_cache(
  async () => {
    const db = createAdminClient()
    const { data } = await db
      .from('products')
      .select(PRODUCT_FIELDS)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    return (data as unknown as Product[]) ?? []
  },
  ['catalog-products-v2'],
  { revalidate: 300, tags: ['catalog-products'] },
)

interface PageProps {
  searchParams: Promise<{ category?: string; format?: string; icons?: string; q?: string; page?: string; sort?: string }>
}

export default async function CatalogPage({ searchParams }: PageProps) {
  const params = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()
  const [productsAll, merchantRes, myProductsRes] = await Promise.all([
    getCachedProducts(),
    db.from('merchants').select('plan').eq('id', user.id).single(),
    db.from('merchant_products').select('product_id').eq('merchant_id', user.id).is('deleted_at', null),
  ])

  let products = productsAll
  const merchant = merchantRes.data as unknown as Pick<Merchant, 'plan'>
  const configuredIds = new Set((myProductsRes.data ?? []).map((mp) => mp.product_id as string))

  if (params.q) {
    const q = params.q.toLowerCase()
    products = products.filter((p) => p.name.toLowerCase().includes(q) || (p.short_description ?? '').toLowerCase().includes(q))
  }
  if (params.category) products = products.filter((p) => p.category === params.category)
  if (params.format) {
    const wanted = params.format.split(',').filter(Boolean)
    products = products.filter((p) => p.format != null && wanted.includes(p.format))
  }
  if (params.icons) {
    const filterIcons = params.icons.split(',').filter(Boolean)
    products = products.filter((p) => filterIcons.every((icon) => p.icons?.includes(icon)))
  }

  if (params.sort) {
    const price = (p: Product) => p.price_cop ?? p.base_price ?? 0
    const sorted = [...products]
    if (params.sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name, 'es-CO'))
    if (params.sort === 'price_asc') sorted.sort((a, b) => price(a) - price(b))
    if (params.sort === 'price_desc') sorted.sort((a, b) => price(b) - price(a))
    products = sorted
  }

  // Counts come from the category-and-search-filtered set, before the format
  // filter, so a facet never reads zero for something you could still pick.
  const formatCounts: Record<string, number> = {}
  for (const p of products) if (p.format) formatCounts[p.format] = (formatCounts[p.format] ?? 0) + 1

  const total = products.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, parseInt(params.page ?? '1')), totalPages)
  const paginated = products.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <h1 className="text-[36px] font-normal leading-[1.12] tracking-[0]">Catálogo</h1>
        <Link
          href="/orders/new"
          className="flex flex-none items-center gap-2.5 rounded-[15px] bg-[#1D1E20] px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#F97316]"
        >
          <Plus className="h-[17px] w-[17px]" strokeWidth={2} />
          Crear orden
        </Link>
      </div>

      <div className="mt-[22px] flex items-center gap-3.5 rounded-[14px] border border-[#1D5EA8]/[.14] bg-[#EDF4FC] px-5 py-4">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[9px] bg-[#DCE8F5]">
          <Truck className="h-[18px] w-[18px] text-[#1D5EA8]" strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[16.5px] font-normal">Sin mínimo de compra: pide desde 1 unidad para probar</p>
          <p className="mt-0.5 text-[14px] font-medium text-[#4A6C93]">Envío nacional en 3–5 días hábiles</p>
        </div>
      </div>

      <div className="mt-[18px] rounded-[22px] border border-black/[.08] bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]">
        <Suspense fallback={null}>
          <CatalogFilters formatCounts={formatCounts} />
        </Suspense>

        <div className="my-[26px] mb-3.5 flex items-baseline justify-between gap-4">
          <span className="text-[15px] font-medium text-[#6E6E73]">
            {total === 1 ? '1 producto' : `${total} productos`}
          </span>
        </div>

        {paginated.length === 0 ? (
          <div className="rounded-[14px] border border-black/[.08] bg-white px-5 py-16 text-center">
            <p className="text-[15px] font-medium text-[#1D1E20]">No encontramos productos con esos filtros.</p>
            <p className="mt-1.5 text-[14px] text-[#86868B]">Prueba quitando alguno o buscando otro término.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
              {paginated.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  configured={configuredIds.has(p.id)}
                  plan={merchant?.plan ?? null}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <Suspense fallback={null}>
                <CatalogPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  total={total}
                  perPage={PAGE_SIZE}
                />
              </Suspense>
            )}
          </>
        )}
      </div>
    </div>
  )
}
