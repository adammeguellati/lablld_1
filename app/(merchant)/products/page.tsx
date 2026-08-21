import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
    .is('deleted_at', null)
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
      <div className="flex flex-wrap items-start justify-between gap-6">
        <h1 className="text-[36px] font-normal leading-[1.12] tracking-[0]">Mis Productos</h1>
        <Link
          href="/catalog"
          className="flex flex-none items-center gap-2.5 rounded-[15px] bg-[#1D1E20] px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#F97316]"
        >
          <Plus className="h-[17px] w-[17px]" strokeWidth={2} />
          Crear producto
        </Link>
      </div>

      <div className="mt-[18px] rounded-[22px] border border-black/[.08] bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]">
        <Suspense fallback={null}>
          <MerchantProductsFilters />
        </Suspense>

        <div className="my-[26px] mb-3.5 flex items-baseline justify-between gap-4">
          <span className="text-[15px] font-medium text-[#6E6E73]">
            {rows.length === 1 ? '1 producto' : `${rows.length} productos`}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-[14px] border border-black/[.08] bg-white px-5 py-16 text-center">
            <p className="text-[15px] font-medium text-[#1D1E20]">
              {params.q || params.status
                ? 'No hay productos que coincidan.'
                : 'Aún no has agregado ningún producto.'}
            </p>
            {!params.q && !params.status && (
              <Link href="/catalog" className="mt-1.5 inline-block text-[14px] text-[#6E6E73] underline transition-colors hover:text-[#1D1E20]">
                Explorar catálogo →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))] lg:[grid-template-columns:repeat(3,minmax(0,1fr))]">
            {rows.map((row) => (
              <MyProductCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
