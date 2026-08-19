'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { OrderRow } from './order-row'
import type { Order, OrderStatus } from '@/types'

type FilterValue = OrderStatus | 'all' | 'pending_group'

const PENDING: OrderStatus[] = ['quote_pending', 'payment_pending', 'payment_failed', 'pending', 'paid']

const STATS = [
  { label: 'Total',      color: 'text-gray-900',    fn: (os: Order[]) => os.length },
  { label: 'Entregadas', color: 'text-emerald-600', fn: (os: Order[]) => os.filter(o => o.status === 'delivered').length },
  { label: 'Enviadas',   color: 'text-violet-600',  fn: (os: Order[]) => os.filter(o => o.status === 'shipped').length },
  { label: 'Pendientes', color: 'text-orange-500',  fn: (os: Order[]) => os.filter(o => (PENDING as string[]).includes(o.status)).length },
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
  `text-xs px-3.5 py-1.5 rounded-full border transition-all duration-150 ${
    active
      ? 'bg-gray-900 text-white border-gray-900'
      : 'border-gray-200 text-gray-600 hover:border-gray-400 bg-white'
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STATS.map(({ label, color, fn }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
            <p className={`text-3xl font-heading font-normal tracking-[0] ${color}`}>{fn(orders)}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 sm:flex-none">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Orden, producto, cliente..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white w-full sm:w-64 focus:outline-none focus:border-gray-400 transition-colors"
          />
          {q && (
            <button onClick={() => setQ('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(({ value, label }) => (
            <button key={value} onClick={() => setFilter(value)} className={pill(filter === value)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-gray-400">
            {orders.length === 0 ? 'Aún no tienes órdenes.' : 'Sin resultados para esa búsqueda.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => <OrderRow key={order.id} order={order} />)}
        </div>
      )}
    </div>
  )
}