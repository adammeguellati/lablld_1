import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MerchantOrdersTable } from '@/components/merchant/orders-table'
import { signLabelUrl } from '@/lib/storage'
import type { Order } from '@/types'

export default async function MerchantOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()
  const { data } = await db
    .from('orders')
    .select('*, order_items(*, merchant_product:merchant_products(label_url))')
    .eq('merchant_id', user.id)
    .order('created_at', { ascending: false })

  const orders = (data as unknown as Order[]) ?? []

  // Safe to substitute in place here, unlike the label pages: nothing downstream
  // of MerchantOrdersTable compares label_url, it only renders it.
  await Promise.all(
    orders.flatMap((o) => (o.order_items ?? []).map(async (item) => {
      const mp = item.merchant_product
      if (mp?.label_url) mp.label_url = (await signLabelUrl(mp.label_url)) ?? mp.label_url
    })),
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl tracking-[0]">Órdenes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {orders.length > 0 ? `${orders.length} ${orders.length === 1 ? 'orden en total' : 'órdenes en total'}` : 'Sin órdenes aún'}
        </p>
      </div>
      <MerchantOrdersTable orders={orders} />
    </div>
  )
}
