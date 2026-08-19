import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProductCard } from '@/components/merchant/product-card'
import { CatalogFilters } from '@/components/merchant/catalog-filters'
import { CatalogPagination } from '@/components/merchant/catalog-pagination'
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
  searchParams: Promise<{ category?: string; format?: string; icons?: string; q?: string; page?: string }>
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
    db.from('merchant_products').select('product_id').eq('merchant_id', user.id),
  ])

  let products = productsAll
  const merchant = merchantRes.data as unknown as Pick<Merchant, 'plan'>
  const configuredIds = new Set((myProductsRes.data ?? []).map((mp) => mp.product_id as string))

  if (params.q) {
    const q = params.q.toLowerCase()
    products = products.filter((p) => p.name.toLowerCase().includes(q) || (p.short_description ?? '').toLowerCase().includes(q))
  }
  if (params.category) products = products.filter((p) => p.category === params.category)
  if (params.format) products = products.filter((p) => p.format === params.format)
  if (params.icons) {
    const filterIcons = params.icons.split(',').filter(Boolean)
    products = products.filter((p) => filterIcons.every((icon) => p.icons?.includes(icon)))
  }

  const total = products.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, parseInt(params.page ?? '1')), totalPages)
  const paginated = products.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-normal tracking-[0]">Catálogo</h1>
        <p className="text-sm text-gray-500 mt-1">Elige productos para vender con tu marca</p>
      </div>

      <Suspense fallback={null}>
        <CatalogFilters />
      </Suspense>

      {paginated.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-gray-400">No hay productos que coincidan con los filtros.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
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
  )
}
