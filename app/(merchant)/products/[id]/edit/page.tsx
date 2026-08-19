import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProductEditInfoForm } from '@/components/merchant/product-edit-info-form'
import type { MerchantProduct } from '@/types'

interface Props { params: Promise<{ id: string }> }

export default async function EditProductPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()
  const [productRes, mpRes] = await Promise.all([
    db.from('products').select('id, name').eq('id', id).single(),
    db.from('merchant_products').select('*').eq('product_id', id).eq('merchant_id', user.id).maybeSingle(),
  ])

  if (!productRes.data) notFound()
  if (!mpRes.data) redirect('/products')

  const mp = mpRes.data as unknown as MerchantProduct

  return (
    <div className="max-w-md">
      <Link href="/products" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5">
        <ArrowLeft className="h-4 w-4" /> Mis Productos
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Editar producto</h1>
        <p className="text-sm text-gray-500 mt-0.5">{mp.custom_name ?? productRes.data.name}</p>
      </div>
      <ProductEditInfoForm
        productId={id}
        defaultName={mp.custom_name ?? ''}
        defaultPrice={mp.retail_price ?? 0}
      />
    </div>
  )
}
