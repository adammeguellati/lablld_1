import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
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

  const stats = [
    { label: 'Órdenes por procesar', value: paidRes.count ?? 0, href: '/admin/orders', color: 'text-amber-600' },
    { label: 'Etiquetas pendientes', value: labelsRes.count ?? 0, href: '/admin/labels', color: 'text-blue-600' },
    { label: 'Merchants activos', value: merchantsRes.count ?? 0, href: '#', color: 'text-emerald-600' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="bg-white rounded-lg border p-5 hover:border-gray-300 transition-colors">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-lg border">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold">Órdenes recientes</h2>
          <Link href="/admin/orders" className="text-sm text-muted-foreground hover:underline">Ver todas</Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No hay órdenes aún.</p>
        ) : (
          <div className="divide-y">
            {orders.map((order) => (
              <Link key={order.id} href={`/admin/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between px-4 md:px-5 py-3 hover:bg-muted/40 gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm">#{order.shopify_order_number ?? order.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {order.merchant?.full_name ?? '—'} · {order.customer_name ?? '—'} · {formatDate(order.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {order.fulfillment_cost && (
                    <span className="text-sm font-medium">{formatCOP(order.fulfillment_cost)}</span>
                  )}
                  <Badge variant={order.status === 'paid' ? 'outline' : order.status === 'payment_failed' ? 'destructive' : 'default'}>
                    {order.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
