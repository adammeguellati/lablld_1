import Link from 'next/link'
import { LabelLightbox } from './label-lightbox'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/order-status'
import { formatCOP, formatDate } from '@/lib/utils'
import type { Order } from '@/types'
import { LabelThumb } from '@/components/shared/label-thumb'

export type AdminOrderRow = Order & {
  merchant: { full_name: string } | null
  order_items: {
    id: string
    product_name: string | null
    quantity: number
    merchant_product: { label_url: string | null } | null
  }[] | null
}

interface Props {
  rows: AdminOrderRow[]
  labelUrls: Record<string, string | null>
  filtered: boolean
}

export function AdminOrdersTable({ rows, labelUrls, filtered }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[18px] border border-dashed border-black/[.12] py-14 text-center">
        <p className="text-[15px] text-[#6E6E73]">
          {filtered ? 'Ninguna orden coincide con tu búsqueda.' : 'No hay órdenes aún.'}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-left">
        <thead>
          <tr className="border-b border-black/[.08]">
            {['Etiquetas', 'Orden', 'Merchant', 'Cliente', 'Estado', 'Costo', 'Fecha', ''].map((h) => (
              <th key={h} className="whitespace-nowrap pb-3 pr-3 text-[12px] font-medium uppercase tracking-[.04em] text-[#86868B]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((order) => {
            const items = (order.order_items ?? []).filter((i) => labelUrls[i.id])
            return (
              <tr key={order.id} className="border-b border-black/[.05] last:border-0">
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-1.5">
                    {items.slice(0, 3).map((i) => (
                      <LabelLightbox key={i.id} url={labelUrls[i.id] as string}
                        alt={i.product_name ?? 'Etiqueta'}
                        className="h-[62px] w-[46px] shrink-0 overflow-hidden rounded-[7px] border border-black/[.08] bg-[#F5F5F7] transition-opacity hover:opacity-80">
                        <LabelThumb url={labelUrls[i.id]} alt="" className="h-full w-full" />
                      </LabelLightbox>
                    ))}
                    {items.length > 3 && (
                      <span className="text-[12px] text-[#AEAEB2]">+{items.length - 3}</span>
                    )}
                    {items.length === 0 && (
                      <div className="flex h-[62px] w-[46px] shrink-0 items-center justify-center rounded-[7px] border border-dashed border-black/[.12] bg-[#FAFAFA]">
                        <span className="text-[10px] leading-tight text-[#C7C7CC]">sin<br />etiqueta</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-3 text-[14px] font-medium text-[#1D1E20]">
                  #{order.shopify_order_number ?? order.id.slice(0, 8)}
                </td>
                <td className="py-3 pr-3 text-[14px] text-[#1D1E20]">{order.merchant?.full_name ?? '—'}</td>
                <td className="py-3 pr-3 text-[14px] text-[#6E6E73]">{order.customer_name ?? '—'}</td>
                <td className="py-3 pr-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </td>
                <td className="py-3 pr-3 text-[14px] text-[#1D1E20]">
                  {order.fulfillment_cost ? formatCOP(order.fulfillment_cost) : '—'}
                </td>
                <td className="py-3 pr-3 text-[14px] text-[#86868B]">{formatDate(order.created_at)}</td>
                <td className="py-3">
                  <Link href={`/admin/orders/${order.id}`}
                    className="text-[13.5px] font-medium text-[#1D1E20] underline-offset-4 hover:underline">
                    Ver
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
