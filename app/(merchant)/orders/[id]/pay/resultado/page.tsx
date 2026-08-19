import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTransaction } from '@/lib/wompi'
import { PaymentResultPoller } from '@/components/merchant/payment-result-poller'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ id?: string }>
}

export default async function ResultadoPagoPSE({ params, searchParams }: Props) {
  const { id: orderId } = await params
  const { id: txId } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()

  if (!txId) redirect('/orders')

  try {
    const { status } = await getTransaction(txId)
    if (status === 'APPROVED') {
      await db.from('orders').update({ status: 'paid', wompi_transaction_id: txId }).eq('id', orderId).eq('merchant_id', user.id)
      redirect('/orders')
    }
    if (status === 'DECLINED' || status === 'ERROR') {
      await db.from('orders').update({ status: 'payment_failed', wompi_transaction_id: txId }).eq('id', orderId).eq('merchant_id', user.id)
      redirect(`/orders/${orderId}/pay`)
    }
  } catch { /* sigue al UI de espera */ }

  return (
    <div className="max-w-md mx-auto mt-20 text-center space-y-4 px-4">
      <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin mx-auto" />
      <p className="font-semibold text-gray-900">Verificando tu pago...</p>
      <p className="text-sm text-gray-500">Tu banco está procesando la transacción. Esto puede tardar unos segundos.</p>
      <PaymentResultPoller orderId={orderId} txId={txId} failRedirect={`/orders/${orderId}/pay`} />
      <Link href="/orders" className="inline-block text-sm text-gray-400 hover:text-gray-700 underline mt-4">
        Ver mis órdenes
      </Link>
    </div>
  )
}
