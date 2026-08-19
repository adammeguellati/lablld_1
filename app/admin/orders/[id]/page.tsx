import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { OrderStatusForm } from '@/components/admin/order-status-form'
import { formatCOP, formatDate, isAdmin } from '@/lib/utils'
import type { Order, OrderItem, MerchantProduct, Product } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  quote_pending: 'Pendiente de cotización',
  payment_pending: 'Pendiente de pago',
  pending: 'Pendiente', paid: 'Pagada', payment_failed: 'Pago fallido',
  in_production: 'En producción', shipped: 'Enviada', delivered: 'Entregada', cancelled: 'Cancelada',
}

const MGMT_STATUSES = ['pending', 'quote_pending', 'payment_pending', 'paid', 'in_production', 'shipped']

type ItemRow = OrderItem & { merchant_product: (MerchantProduct & { product: Product | null }) | null }

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) redirect('/login')

  const db = createAdminClient()
  const [orderRes, itemsRes] = await Promise.all([
    db.from('orders').select('*, merchant:merchants(full_name, email)').eq('id', id).single(),
    db.from('order_items').select('*, merchant_product:merchant_products(*, product:products(name))').eq('order_id', id),
  ])

  if (!orderRes.data) notFound()
  const order = orderRes.data as unknown as Order & { merchant: { full_name: string; email: string } | null }
  const items = (itemsRes.data as unknown as ItemRow[]) ?? []
  const addr = order.shipping_address

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/orders" className="text-sm text-muted-foreground hover:underline">← Órdenes</Link>
        <h1 className="text-xl md:text-2xl font-bold">
          Orden #{order.shopify_order_number ?? order.id.slice(0, 8)}
        </h1>
        <Badge>{STATUS_LABELS[order.status] ?? order.status}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Merchant</p>
          <p className="font-medium">{order.merchant?.full_name ?? '—'}</p>
          <p className="text-sm text-muted-foreground">{order.merchant?.email}</p>
        </div>
        <div className="bg-white rounded-lg border p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Cliente</p>
          <p className="font-medium">{order.customer_name ?? '—'}</p>
          <p className="text-sm text-muted-foreground">{order.customer_email ?? '—'}</p>
          {addr && <p className="text-sm text-muted-foreground">{addr.address1}, {addr.city}, {addr.country}</p>}
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4 space-y-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Productos · Etiquetas</p>
        <div className="divide-y">
          {items.filter(item => item.unit_price > 0).map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-3">
              {item.merchant_product?.label_url ? (
                <a href={item.merchant_product.label_url} target="_blank" rel="noopener noreferrer"
                  className="flex-shrink-0 w-12 h-12 rounded border border-gray-200 bg-gray-50 overflow-hidden hover:opacity-80 transition-opacity">
                  <img src={item.merchant_product.label_url} alt="Etiqueta" className="w-full h-full object-contain" />
                </a>
              ) : (
                <div className="flex-shrink-0 w-12 h-12 rounded border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
                  <span className="text-xs text-gray-300">sin etiqueta</span>
                </div>
              )}
              <div className="flex-1 flex justify-between items-baseline text-sm min-w-0">
                <span className="truncate">{item.merchant_product?.product?.name ?? item.product_name} <span className="text-muted-foreground">×{item.quantity}</span></span>
                <span className="text-muted-foreground ml-2 shrink-0">{formatCOP(item.unit_price * item.quantity)}</span>
              </div>
            </div>
          ))}
        </div>
        {order.shipping_cost_cop != null && order.shipping_cost_cop > 0 && (
          <div className="flex justify-between text-sm pt-1 border-t text-muted-foreground">
            <span>Envío estimado (Envia)</span><span>{formatCOP(order.shipping_cost_cop)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-sm pt-1 border-t">
          <span>Total {order.status === 'quote_pending' ? 'estimado' : 'cobrado'}</span>
          <span>{order.fulfillment_cost ? formatCOP(order.fulfillment_cost) : '—'}</span>
        </div>
      </div>

      {order.tracking_number && (
        <div className="bg-white rounded-lg border p-4 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Envío</p>
          <p className="text-sm">{order.carrier} · {order.tracking_number}</p>
          {order.shipped_at && <p className="text-xs text-muted-foreground">Enviado {formatDate(order.shipped_at)}</p>}
          {order.label_pdf_url && (
            <a href={order.label_pdf_url} target="_blank" rel="noopener noreferrer"
              className="inline-block mt-2 text-xs font-semibold text-emerald-600 hover:underline">Descargar guía PDF →</a>
          )}
        </div>
      )}

      {MGMT_STATUSES.includes(order.status) && (
        <div className="bg-white rounded-lg border p-4 space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Gestionar orden</p>
          <OrderStatusForm orderId={order.id} status={order.status} productCostCop={order.fulfillment_cost ?? null} />
        </div>
      )}

      <p className="text-xs text-muted-foreground">Creada {formatDate(order.created_at)}</p>
    </div>
  )
}
