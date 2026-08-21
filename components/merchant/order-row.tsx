'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { formatCOP, formatDateShort } from '@/lib/utils'
import { OrderTabPanel } from './order-tab-panel'
import type { Order, OrderStatus } from '@/types'

export type TabId = 'info' | 'cotizacion' | 'pago' | 'pagado' | 'produccion' | 'enviado' | 'entregado'

export const STATUS_LABELS: Record<OrderStatus, string> = {
  quote_pending: 'Pendiente de cotización', payment_pending: 'Pendiente de pago', pending: 'Pendiente',
  paid: 'Pagada', payment_failed: 'Pago fallido', in_production: 'En producción',
  shipped: 'Enviada', delivered: 'Entregada', cancelled: 'Cancelada',
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  quote_pending: 'bg-[#FDEFE0] text-[#B4690E]', payment_pending: 'bg-[#FDEFE0] text-[#B4690E]',
  pending: 'bg-[#FDEFE0] text-[#B4690E]', paid: 'bg-[#E6F6EB] text-[#16A34A]',
  payment_failed: 'bg-[#FBE9E6] text-[#C0303B]', in_production: 'bg-[#EDF4FC] text-[#1D5EA8]',
  shipped: 'bg-[#EFEBFB] text-[#6E56CF]', delivered: 'bg-[#E6F6EB] text-[#16A34A]',
  cancelled: 'bg-[#F0F0F3] text-[#86868B]',
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
  const ref = order.shopify_order_number ?? order.id.slice(0, 8).toUpperCase()
  const firstItem = items[0]
  const currentStep = STATUS_STEP[order.status] ?? -1
  const isShopify = !!order.shopify_order_id

  const unitCount = items.reduce((n, i) => n + (i.quantity ?? 0), 0)
  const labelThumbs = items.map((i) => i.merchant_product?.label_url).filter(Boolean).slice(0, 3) as string[]

  return (
    <div className="overflow-hidden rounded-[14px] border border-black/[.08] bg-[#FCFCFD]">
      <button
        onClick={() => { setOpen(v => !v); if (!open) setTab('info') }}
        className="grid w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-black/[.02] [grid-template-columns:92px_minmax(0,1fr)_minmax(104px,auto)_minmax(108px,max-content)_16px]"
      >
        <div className="rounded-[10px] bg-[#F7F7F8] px-2 py-1.5">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[12px] font-semibold tabular-nums text-[#1D1E20]">{ref.slice(0, 8).toUpperCase()}</p>
            {/* SH / PA is backed by orders.shopify_order_id, unlike the design's
                Dropshipping / Al por mayor kind badge, which no column carries. */}
            <span className={`flex-none rounded px-1 py-0.5 text-[9px] font-bold uppercase ${isShopify ? 'bg-[#EFEBFB] text-[#6E56CF]' : 'bg-[#FDEFE0] text-[#B4690E]'}`}>
              {isShopify ? 'SH' : 'PA'}
            </span>
          </div>
          <p className="mt-0.5 text-[10.5px] tabular-nums text-[#AEAEB2]">{formatDateShort(order.created_at)}</p>
        </div>

        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-medium text-[#1D1E20]">
            {items.length > 1 ? `${items.length} productos` : firstItem?.product_name ?? '—'}
          </p>
          <p className="mt-0.5 truncate text-[12.5px] text-[#86868B]">
            {[
              order.fulfillment_cost ? formatCOP(order.fulfillment_cost) : null,
              order.customer_name,
              unitCount ? `${unitCount} ${unitCount === 1 ? 'unidad' : 'unidades'}` : null,
            ].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="flex items-center justify-end gap-1.5">
          {labelThumbs.map((url) => (
            <span key={url} className="h-8 w-8 flex-none overflow-hidden rounded-[5px] border border-black/[.08] bg-white">
              {/* Signed, expiring label URL: not next/image, per SEC-labels-bucket. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-contain" />
            </span>
          ))}
        </div>

        <span className={`flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1.5 text-[12px] font-medium ${STATUS_COLORS[order.status]}`}>
          <span className={`h-1.5 w-1.5 flex-none rounded-full ${STATUS_DOT[order.status]}`} />
          <span className="truncate">{STATUS_LABELS[order.status]}</span>
        </span>

        <ChevronDown className={`h-4 w-4 flex-none text-[#AEAEB2] transition-transform duration-[350ms] ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-black/[.08] bg-white">
          <div className="flex items-center gap-1 overflow-x-auto border-b border-black/[.08] px-3 py-1.5">
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