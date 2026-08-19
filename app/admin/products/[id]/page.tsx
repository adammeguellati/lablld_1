import { notFound, redirect } from 'next/navigation'
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Editar producto</h1>
        <DeleteProductButton productId={id} />
      </div>
      <ProductEditForm product={product} />
    </div>
  )
}
