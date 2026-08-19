import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LinkButton } from '@/components/shared/link-button'
import { MyProductCard } from '@/components/merchant/my-product-card'
import { MerchantProductsFilters } from '@/components/merchant/merchant-products-filters'
import type { MerchantProduct, Product } from '@/types'

type Row = MerchantProduct & { product: Product | null }

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string }>
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()
  const { data } = await db
    .from('merchant_products')
    .select('*, product:products(*)')
    .eq('merchant_id', user.id)
    .order('created_at', { ascending: false })

  let rows = (data as unknown as Row[]) ?? []

  if (params.q) {
    const q = params.q.toLowerCase()
    rows = rows.filter((r) =>
      (r.custom_name ?? r.product?.name ?? '').toLowerCase().includes(q) ||
      (r.product?.name ?? '').toLowerCase().includes(q),
    )
  }
  if (params.status) rows = rows.filter((r) => r.label_status === params.status)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-heading font-normal tracking-[0]">Mis Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona y personaliza tus productos</p>
        </div>
        <LinkButton href="/catalog" variant="outline" className="rounded-xl text-sm">
          Explorar catálogo →
        </LinkButton>
      </div>

      <Suspense fallback={null}>
        <MerchantProductsFilters />
      </Suspense>

      {rows.length === 0 ? (
        <div className="text-center py-24 space-y-2">
          <p className="text-sm text-gray-400">
            {params.q || params.status
              ? 'No hay productos que coincidan.'
              : 'Aún no has agregado ningún producto.'}
          </p>
          {!params.q && !params.status && (
            <Link href="/catalog" className="text-sm text-gray-600 underline hover:text-gray-900 transition-colors">
              Explorar catálogo →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {rows.map((row) => (
            <MyProductCard key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  )
}
