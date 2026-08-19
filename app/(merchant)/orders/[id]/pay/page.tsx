import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPSEBanks } from '@/lib/wompi'
import { formatCOP } from '@/lib/utils'
import { OrderPaymentForm } from './payment-form'

interface Props { params: Promise<{ id: string }> }

export default async function OrderPayPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()
  const { data: order } = await db
    .from('orders')
    .select('id, fulfillment_cost, status, shopify_order_number')
    .eq('id', id)
    .eq('merchant_id', user.id)
    .single()

  if (!order) notFound()
  const PAYABLE = ['payment_pending', 'payment_failed']
  if (!PAYABLE.includes(order.status)) redirect('/orders')

  const banks = await getPSEBanks().catch(() => [])
  const ref = order.shopify_order_number ? `#${order.shopify_order_number}` : id.slice(0, 8).toUpperCase()

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <Link href="/orders" className="text-sm text-gray-400 hover:text-gray-600">← Volver a órdenes</Link>
        <h1 className="text-2xl font-bold mt-4">Pagar orden {ref}</h1>
        <p className="text-gray-500 mt-1">
          Total a pagar:{' '}
          <span className="font-semibold text-gray-900">{formatCOP(order.fulfillment_cost ?? 0)}</span>
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <OrderPaymentForm orderId={id} banks={banks} />
      </div>
    </div>
  )
}
