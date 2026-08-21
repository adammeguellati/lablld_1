import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProductEditForm } from '@/components/admin/product-edit-form'
import { DeleteProductButton } from '@/components/admin/delete-product-button'
import { isAdmin } from '@/lib/utils'
import type { Product, ShippingRate } from '@/types'

export default async function AdminEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) redirect('/login')

  const { id } = await params
  const db = createAdminClient()

  const [productRes, ratesRes] = await Promise.all([
    db.from('products').select('*').eq('id', id).single(),
    db.from('shipping_rates').select('*').eq('product_id', id),
  ])

  if (!productRes.data) notFound()

  const product = {
    ...(productRes.data as unknown as Product),
    shipping_rates: (ratesRes.data ?? []) as ShippingRate[],
  }

  return (
    <div>
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] text-[#86868B] transition-colors hover:text-[#1D1E20]">
        <ArrowLeft className="h-4 w-4" /> Productos
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-[36px] font-normal leading-[1.12] tracking-[0]">{product.name}</h1>
        <DeleteProductButton productId={id} />
      </div>
      <div className="rounded-[22px] border border-black/[.08] bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]">
        <ProductEditForm product={product} />
      </div>
    </div>
  )
}
