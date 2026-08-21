import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Plus } from 'lucide-react'
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
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-[36px] font-normal leading-[1.12] tracking-[0]">Órdenes</h1>
          <p className="mt-1 text-[15px] text-[#6E6E73]">
            {orders.length > 0
              ? `${orders.length} ${orders.length === 1 ? 'orden en total' : 'órdenes en total'}`
              : 'Sin órdenes aún'}
          </p>
        </div>
        <Link
          href="/orders/new"
          className="flex flex-none items-center gap-2.5 rounded-[15px] bg-[#1D1E20] px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#F97316]"
        >
          <Plus className="h-[17px] w-[17px]" strokeWidth={2} />
          Crear orden
        </Link>
      </div>

      <div className="mt-[22px]">
        <MerchantOrdersTable orders={orders} />
      </div>
    </div>
  )
}
