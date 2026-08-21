'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { OrderRow } from './order-row'
import type { Order, OrderStatus } from '@/types'

type FilterValue = OrderStatus | 'all' | 'pending_group'

const PENDING: OrderStatus[] = ['quote_pending', 'payment_pending', 'payment_failed', 'pending', 'paid']

// 2x2, reading Total / Pendientes over Enviadas / Entregadas, per SCREENS.md
// section 6. Each is also the filter for the state it counts, so the number and
// the control are the same object rather than a number beside a pill.
const STATS: { label: string; color: string; filter: FilterValue; fn: (os: Order[]) => number }[] = [
  { label: 'Total',      color: '#1D1E20', filter: 'all',           fn: (os) => os.length },
  { label: 'Pendientes', color: '#B4690E', filter: 'pending_group', fn: (os) => os.filter(o => (PENDING as string[]).includes(o.status)).length },
  { label: 'Enviadas',   color: '#6E56CF', filter: 'shipped',       fn: (os) => os.filter(o => o.status === 'shipped').length },
  { label: 'Entregadas', color: '#16A34A', filter: 'delivered',     fn: (os) => os.filter(o => o.status === 'delivered').length },
]

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all',           label: 'Todos' },
  { value: 'pending_group', label: 'Pendiente' },
  { value: 'in_production', label: 'Producción' },
  { value: 'shipped',       label: 'Enviada' },
  { value: 'delivered',     label: 'Entregada' },
  { value: 'cancelled',     label: 'Cancelada' },
]

const pill = (active: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-[13.5px] font-medium transition-colors ${
    active
      ? 'border-[#1D1E20] bg-[#1D1E20] text-white'
      : 'border-black/10 bg-white text-[#1D1E20] hover:border-black/25'
  }`

export function MerchantOrdersTable({ orders }: { orders: Order[] }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<FilterValue>('all')

  const filtered = orders.filter((o) => {
    const matchQ = !q || [o.shopify_order_number, o.id, o.customer_name]
      .some((v) => v?.toLowerCase().includes(q.toLowerCase()))
    const matchStatus = filter === 'all'
      || (filter === 'pending_group' && (PENDING as string[]).includes(o.status))
      || o.status === filter
    return matchQ && matchStatus
  })

  return (
    <div>
      <div className="grid grid-cols-2 gap-3.5 lg:max-w-[560px]">
        {STATS.map(({ label, color, filter: f, fn }) => {
          const active = filter === f
          return (
            <button
              key={label}
              type="button"
              onClick={() => setFilter(f)}
              className={`flex h-[112px] flex-col justify-between rounded-[14px] border bg-white p-5 text-left transition-colors ${
                active ? 'border-[#1D1E20]' : 'border-black/[.08] hover:border-black/25'
              }`}
            >
              <span className="text-[12px] text-[#86868B]">{label}</span>
              <span className="self-end text-[40px] font-normal leading-none tracking-[-0.02em]" style={{ color }}>
                {fn(orders)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-11 rounded-[22px] border border-black/[.08] bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]">
        <div className="flex flex-wrap items-center gap-3 rounded-[18px] bg-[#F5F5F7] p-6">
          <div className="relative flex-none">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868B]" />
            <input
              type="text"
              placeholder="Orden, producto, cliente..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-64 rounded-[11px] border border-black/10 bg-white py-2.5 pl-10 pr-8 text-[14.5px] outline-none transition-colors focus:border-black/25"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AEAEB2] transition-colors hover:text-[#1D1E20]"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map(({ value, label }) => (
              <button key={value} type="button" onClick={() => setFilter(value)} className={pill(filter === value)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="my-[26px] mb-3.5 flex items-baseline justify-between gap-4">
          <span className="text-[15px] font-medium text-[#6E6E73]">
            {filtered.length === 1 ? '1 orden' : `${filtered.length} órdenes`}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-[14px] border border-black/[.08] px-5 py-16 text-center">
            <p className="text-[15px] font-medium text-[#1D1E20]">
              {orders.length === 0 ? 'Aún no tienes órdenes.' : 'Sin resultados para esa búsqueda.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map((order) => <OrderRow key={order.id} order={order} />)}
          </div>
        )}
      </div>
    </div>
  )
}
