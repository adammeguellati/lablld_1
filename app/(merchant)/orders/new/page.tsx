import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { OrderForm } from '@/components/merchant/order-form'
import { ArrowLeft } from 'lucide-react'
import type { Product } from '@/types'

interface Props { searchParams: Promise<{ productId?: string; sample?: string }> }

export default async function NewOrderPage({ searchParams }: Props) {
  const sp = await searchParams
  const isSample = sp.sample === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()

  const [merchantRes, merchantProductsRes] = await Promise.all([
    db.from('merchants').select('plan').eq('id', user.id).single(),
    db.from('merchant_products')
      .select('product_id, product:products(id, name, price_cop, base_price, wholesale_price_usd)')
      .eq('merchant_id', user.id)
      .eq('label_status', 'approved'),
  ])

  const merchant = merchantRes.data
  const merchantProducts = (merchantProductsRes.data as unknown as Array<{ product_id: string; product: Product | null }>) ?? []

  let sampleProduct: Product | null = null
  if (isSample && sp.productId) {
    const { data } = await db.from('products').select('id, name, price_cop, base_price, wholesale_price_usd').eq('id', sp.productId).single()
    sampleProduct = data as unknown as Product | null
    if (!sampleProduct) redirect('/catalog')
  }

  return (
    <div className="max-w-2xl">
      <Link href={isSample ? '/catalog' : '/orders'} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5">
        <ArrowLeft className="h-4 w-4" /> {isSample ? 'Catálogo' : 'Pedidos'}
      </Link>
      <h1 className="text-2xl font-bold mb-6">{isSample ? 'Solicitar Muestra' : 'Nuevo pedido'}</h1>
      <OrderForm
        isSample={isSample}
        merchantProducts={merchantProducts}
        sampleProduct={sampleProduct}
        preselectedProductId={sp.productId}
        plan={merchant?.plan ?? null}
      />
    </div>
  )
}
