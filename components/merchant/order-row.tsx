'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { formatCOP, formatDate } from '@/lib/utils'
import { OrderTabPanel } from './order-tab-panel'
import type { Order, OrderStatus } from '@/types'

export type TabId = 'info' | 'cotizacion' | 'pago' | 'pagado' | 'produccion' | 'enviado' | 'entregado'

export const STATUS_LABELS: Record<OrderStatus, string> = {
  quote_pending: 'Pendiente de cotización', payment_pending: 'Pendiente de pago', pending: 'Pendiente',
  paid: 'Pagada', payment_failed: 'Pago fallido', in_production: 'En producción',
  shipped: 'Enviada', delivered: 'Entregada', cancelled: 'Cancelada',
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  quote_pending: 'bg-orange-50 text-orange-600', payment_pending: 'bg-orange-50 text-orange-600',
  pending: 'bg-amber-50 text-amber-700', paid: 'bg-green-50 text-green-700',
  payment_failed: 'bg-red-50 text-red-600', in_production: 'bg-blue-50 text-blue-700',
  shipped: 'bg-violet-50 text-violet-700', delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const STATUS_DOT: Record<OrderStatus, string> = {
  quote_pending: 'bg-orange-500', payment_pending: 'bg-orange-500', pending: 'bg-amber-400',
  paid: 'bg-green-500', payment_failed: 'bg-red-500', in_production: 'bg-blue-500',
  shipped: 'bg-violet-500', delivered: 'bg-emerald-500', cancelled: 'bg-gray-300',
}

export const STATUS_STEP: Partial<Record<OrderStatus, number>> = {
  pending: 0, quote_pending: 0, payment_pending: 1, paid: 2, in_production: 3, shipped: 4, delivered: 5,
}

const STEP_TABS: { id: TabId; label: string; step: number }[] = [
  { id: 'cotizacion', label: 'Cotización', step: 0 },
  { id: 'pago',       label: 'Pago',       step: 1 },
  { id: 'pagado',     label: 'Pagado',     step: 2 },
  { id: 'produccion', label: 'Producción', step: 3 },
  { id: 'enviado',    label: 'Enviado',    step: 4 },
  { id: 'entregado',  label: 'Entregado',  step: 5 },
]

function StepIcon({ done, current }: { done: boolean; current: boolean }) {
  if (done) return (
    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
      <svg className="w-2 h-2 text-white" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
  if (current) return <span className="w-2 h-2 rounded-full bg-gray-900 shrink-0" />
  return <span className="w-2.5 h-2.5 rounded-full border-2 border-gray-300 shrink-0" />
}

export function OrderRow({ order }: { order: Order }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<TabId>('info')
  const items = order.order_items ?? []
  const addr = order.shipping_address
  const ref = order.shopify_order_number ?? order.id.slice(0, 8).toUpperCase()
  const firstItem = items[0]
  const currentStep = STATUS_STEP[order.status] ?? -1
  const isShopify = !!order.shopify_order_id

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={() => { setOpen(v => !v); if (!open) setTab('info') }}
        className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-gray-50/50 transition-colors"
      >
        <div className="shrink-0 min-w-[80px]">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-gray-900 tabular-nums">{ref.slice(0, 8).toUpperCase()}</p>
            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${isShopify ? 'bg-violet-100 text-violet-700' : 'bg-orange-100 text-orange-600'}`}>
              {isShopify ? 'SH' : 'PA'}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(order.created_at)}</p>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{firstItem?.product_name ?? '—'}</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {order.customer_name}{addr?.city ? ` · ${addr.city}` : ''}
          </p>
        </div>

        <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap ${STATUS_COLORS[order.status]}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[order.status]}`} />
          {STATUS_LABELS[order.status]}
        </span>

        <p className="text-sm font-bold text-gray-900 shrink-0">
          {order.fulfillment_cost ? formatCOP(order.fulfillment_cost) : '—'}
        </p>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-gray-100">
          <div className="px-3 py-1.5 bg-gray-50 flex items-center gap-1 overflow-x-auto border-b border-gray-100">
            <button onClick={() => setTab('info')}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${tab === 'info' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              Información
            </button>
            {STEP_TABS.map(({ id, label, step }) => {
              const done = step < currentStep
              const current = step === currentStep
              return (
                <button key={id} onClick={() => setTab(id)}
                  className={`shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
                    tab === id ? 'bg-white shadow-sm font-semibold text-gray-900' : step > currentStep ? 'text-gray-400' : 'text-gray-600 hover:text-gray-800'
                  }`}>
                  <StepIcon done={done} current={current} />
                  {label}
                </button>
              )
            })}
          </div>
          <OrderTabPanel order={order} tab={tab} currentStep={currentStep} />
        </div>
      )}
    </div>
  )
}