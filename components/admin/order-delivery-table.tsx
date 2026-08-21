import { formatDate } from '@/lib/utils'
import type { Order } from '@/types'

// The design's ENTREGA Y CONTACTO zebra table: fixed rows in a fixed order, so
// an operator reading two orders side by side finds the same fact in the same
// place. A row with no value shows a dash rather than disappearing.
export function OrderDeliveryTable({ order }: { order: Order }) {
  const addr = order.shipping_address
  const rows: [string, string | null][] = [
    ['Destinatario', addr?.name ?? order.customer_name ?? null],
    ['Correo', order.customer_email ?? null],
    ['Teléfono', addr?.phone ?? null],
    ['Dirección', addr?.address1 ?? null],
    ['Complemento', addr?.address2 ?? null],
    ['Ciudad', addr?.city ?? null],
    ['Departamento', addr?.province ?? null],
    ['Código postal', addr?.zip ?? null],
    ['País', addr?.country ?? null],
    ['Transportadora', order.carrier ?? null],
    ['Días estimados', order.estimated_delivery ?? null],
    ['Guía', order.tracking_number ?? null],
    ['Enviada', order.shipped_at ? formatDate(order.shipped_at) : null],
  ]

  return (
    <dl className="overflow-hidden rounded-[14px] border border-black/[.06]">
      {rows.map(([label, value], i) => (
        <div key={label} className={`flex flex-wrap items-baseline justify-between gap-3 px-4 py-2.5 ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}>
          <dt className="text-[13px] text-[#86868B]">{label}</dt>
          <dd className="max-w-[60%] text-right text-[13.5px] text-[#1D1E20]">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
