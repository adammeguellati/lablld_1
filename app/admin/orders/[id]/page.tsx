import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signLabelUrls } from '@/lib/storage'
import { OrderStatusForm } from '@/components/admin/order-status-form'
import { OrderDeliveryTable } from '@/components/admin/order-delivery-table'
import { LabelLightbox } from '@/components/admin/label-lightbox'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/order-status'
import { formatCOP, formatDate, isAdmin } from '@/lib/utils'
import type { Order, OrderItem, MerchantProduct, Product } from '@/types'
import { LabelThumb } from '@/components/shared/label-thumb'

const MGMT_STATUSES = ['pending', 'quote_pending', 'payment_pending', 'paid', 'in_production', 'shipped']
const CARD = 'rounded-[22px] border border-black/[.08] bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]'
const EYEBROW = 'text-[12px] font-medium uppercase tracking-[.04em] text-[#86868B]'

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
  const items = ((itemsRes.data as unknown as ItemRow[]) ?? []).filter((i) => i.unit_price > 0)
  const signed = await signLabelUrls(items.map((i) => i.merchant_product?.label_url))
  const labelViewUrls = new Map(items.map((i, n) => [i.id, signed[n]]))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] text-[#86868B] transition-colors hover:text-[#1D1E20]">
          <ArrowLeft className="h-4 w-4" /> Órdenes
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[36px] font-normal leading-[1.12] tracking-[0]">
            Orden #{order.shopify_order_number ?? order.id.slice(0, 8)}
          </h1>
          <span className={`inline-flex rounded-full px-3 py-1 text-[12.5px] font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </div>
        <p className="mt-1.5 text-[14px] text-[#86868B]">Creada {formatDate(order.created_at)}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <section className={CARD}>
            <p className={EYEBROW}>Productos y etiquetas</p>
            <div className="mt-4 divide-y divide-black/[.05]">
              {items.map((item) => {
                const labelUrl = labelViewUrls.get(item.id) ?? item.merchant_product?.label_url
                const name = item.merchant_product?.product?.name ?? item.product_name
                return (
                  <div key={item.id} className="flex items-center gap-4 py-3.5 first:pt-0">
                    {labelUrl ? (
                      <LabelLightbox url={labelUrl} alt={name ?? 'Etiqueta'}
                        className="h-[62px] w-[46px] shrink-0 overflow-hidden rounded-[7px] border border-black/[.08] bg-[#F5F5F7] transition-opacity hover:opacity-80">
                        <LabelThumb url={labelUrl} alt="" className="h-full w-full" />
                      </LabelLightbox>
                    ) : (
                      <div className="flex h-[62px] w-[46px] shrink-0 items-center justify-center rounded-[7px] border border-dashed border-black/[.12] bg-[#FAFAFA]">
                        <span className="text-[10px] leading-tight text-[#C7C7CC]">sin<br />etiqueta</span>
                      </div>
                    )}
                    <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-2">
                      <span className="truncate text-[14.5px] text-[#1D1E20]">
                        {name} <span className="text-[#86868B]">×{item.quantity}</span>
                      </span>
                      <span className="shrink-0 text-[14px] text-[#6E6E73]">{formatCOP(item.unit_price * item.quantity)}</span>
                    </div>
                  </div>
                )
              })}
              {items.length === 0 && <p className="py-3 text-[14px] text-[#86868B]">Esta orden no tiene productos.</p>}
            </div>
            {order.shipping_cost_cop != null && order.shipping_cost_cop > 0 && (
              <div className="mt-3 flex justify-between border-t border-black/[.06] pt-3 text-[14px] text-[#6E6E73]">
                <span>Envío</span><span>{formatCOP(order.shipping_cost_cop)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-black/[.06] pt-3 text-[15px] font-medium text-[#1D1E20]">
              <span>Total {order.status === 'quote_pending' ? 'estimado' : 'cobrado'}</span>
              <span>{order.fulfillment_cost ? formatCOP(order.fulfillment_cost) : '—'}</span>
            </div>
          </section>

          <section className={CARD}>
            <p className={EYEBROW}>Entrega y contacto</p>
            <div className="mt-4"><OrderDeliveryTable order={order} /></div>
            {order.label_pdf_url && (
              <a href={order.label_pdf_url} target="_blank" rel="noopener noreferrer"
                className="mt-4 inline-block text-[13.5px] font-medium text-[#1D1E20] underline-offset-4 hover:underline">
                Descargar guía PDF →
              </a>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className={CARD}>
            <p className={EYEBROW}>Merchant</p>
            <p className="mt-3 text-[15px] text-[#1D1E20]">{order.merchant?.full_name ?? '—'}</p>
            {order.merchant?.email && (
              <a href={`mailto:${order.merchant.email}`} className="text-[13.5px] text-[#86868B] underline-offset-4 hover:text-[#1D1E20] hover:underline">
                {order.merchant.email}
              </a>
            )}
          </section>

          {MGMT_STATUSES.includes(order.status) && (
            <section className={CARD}>
              <p className={`${EYEBROW} mb-4`}>Gestionar orden</p>
              <OrderStatusForm orderId={order.id} status={order.status} productCostCop={order.fulfillment_cost ?? null} />
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
