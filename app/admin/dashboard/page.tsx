import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/order-status'
import { formatCOP, formatDate, isAdmin } from '@/lib/utils'
import type { Order } from '@/types'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) redirect('/login')

  const db = createAdminClient()
  const [paidRes, labelsRes, merchantsRes, ordersRes] = await Promise.all([
    db.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
    db.from('merchant_products').select('id', { count: 'exact', head: true })
      .eq('label_status', 'pending').not('label_url', 'is', null),
    db.from('merchants').select('id', { count: 'exact', head: true }).not('plan', 'is', null),
    db.from('orders').select('id, shopify_order_number, customer_name, status, fulfillment_cost, created_at, merchant:merchants(full_name)')
      .order('created_at', { ascending: false }).limit(8),
  ])

  const orders = (ordersRes.data as unknown as (Order & { merchant: { full_name: string } | null })[]) ?? []

  // Every card links somewhere real. "Merchants activos" pointed at href="#",
  // which looks clickable, is clickable, and goes nowhere.
  const stats = [
    { label: 'Órdenes por procesar', value: paidRes.count ?? 0, href: '/admin/orders?status=paid' },
    { label: 'Etiquetas pendientes', value: labelsRes.count ?? 0, href: '/admin/labels' },
    { label: 'Merchants con plan', value: merchantsRes.count ?? 0, href: '/admin/merchants?estado=active' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-[36px] font-normal leading-[1.12] tracking-[0]">Dashboard</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}
            className="rounded-[18px] border border-black/[.08] bg-white px-5 py-4 transition-colors hover:border-black/25">
            <p className="text-[12.5px] text-[#86868B]">{s.label}</p>
            <p className="mt-1 text-[26px] font-normal leading-tight tracking-[-0.01em] text-[#1D1E20]">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-[22px] border border-black/[.08] bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-[18px] font-medium text-[#1D1E20]">Órdenes recientes</h2>
          <Link href="/admin/orders" className="text-[13.5px] font-medium text-[#1D1E20] underline-offset-4 hover:underline">
            Ver todas
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="mt-5 rounded-[18px] border border-dashed border-black/[.12] py-14 text-center">
            <p className="text-[15px] text-[#6E6E73]">No hay órdenes aún.</p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-black/[.05]">
            {orders.map((order) => (
              <Link key={order.id} href={`/admin/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-3 py-3.5 transition-colors hover:bg-black/[.015]">
                <div className="min-w-0">
                  <p className="text-[14.5px] font-medium text-[#1D1E20]">
                    #{order.shopify_order_number ?? order.id.slice(0, 8)}
                  </p>
                  <p className="truncate text-[12.5px] text-[#86868B]">
                    {order.merchant?.full_name ?? '—'} · {order.customer_name ?? '—'} · {formatDate(order.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {order.fulfillment_cost && (
                    <span className="text-[14px] text-[#1D1E20]">{formatCOP(order.fulfillment_cost)}</span>
                  )}
                  {/* This rendered {order.status} raw until W3, so an operator
                      read "payment_failed" and "in_production". */}
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
