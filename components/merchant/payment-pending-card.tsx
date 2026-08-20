'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Truck, Clock } from 'lucide-react'
import { formatCOP } from '@/lib/utils'
import { rejectQuoteAction } from '@/app/(merchant)/orders/actions'
import type { Order } from '@/types'

export function PaymentPendingCard({ order }: { order: Order }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [isPending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const items = order.order_items ?? []
  const productTotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const shippingCost = order.shipping_cost_cop ?? 0
  const total = order.fulfillment_cost ?? 0
  const ref = order.shopify_order_number ? `#${order.shopify_order_number}` : order.id.slice(0, 8).toUpperCase()

  if (confirming) return (
    <div className="bg-white border border-red-200 rounded-2xl p-5 space-y-4">
      <div>
        <p className="font-semibold text-gray-900 text-sm">¿Rechazar esta cotización?</p>
        <p className="text-sm text-gray-500 mt-1.5">
          El pedido será <strong>cancelado</strong> y no podrá ser procesado. Para continuar deberás hacer una nueva solicitud desde <em>Ordenar Productos</em>.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button onClick={() => setConfirming(false)} disabled={isPending}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          Cancelar
        </button>
        <button
          onClick={() => start(async () => {
            const r = await rejectQuoteAction(order.id)
            if (r?.error) { setError(r.error); return }
            router.push('/orders')
          })}
          disabled={isPending}
          className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
          {isPending ? 'Cancelando...' : 'Confirmar rechazo'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-gray-900 px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400">Orden {ref}</p>
            <p className="text-sm font-semibold text-white mt-0.5 leading-snug">
              {items[0]?.product_name ?? '—'}
              {items.length > 1 && <span className="text-gray-400"> · +{items.length - 1} más</span>}
            </p>
          </div>
          <span className="text-[11px] font-semibold bg-amber-500 text-white px-2.5 py-1 rounded-full shrink-0">
            Pendiente de pago
          </span>
        </div>
        {(order.carrier || order.estimated_delivery) && (
          <div className="mt-3 bg-gray-800 rounded-xl px-4 py-3 flex gap-6 flex-wrap">
            {order.carrier && (
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 leading-none">Transportadora</p>
                  <p className="text-sm font-semibold text-white mt-0.5">{order.carrier}</p>
                </div>
              </div>
            )}
            {order.estimated_delivery && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 leading-none">Entrega estimada</p>
                  <p className="text-sm font-semibold text-white mt-0.5">{order.estimated_delivery}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="bg-white px-5 py-4 space-y-2 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>Costo de producto</span><span>{formatCOP(productTotal)}</span>
        </div>
        {shippingCost > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>Costo de envío</span><span>{formatCOP(shippingCost)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100 text-base">
          <span>Total a pagar</span><span>{formatCOP(total)}</span>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={() => setConfirming(true)}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors">
            Rechazar
          </button>
          <a
            href={order.payment_link_url ?? `/orders/${order.id}/pay`}
            target={order.payment_link_url ? '_blank' : undefined}
            rel={order.payment_link_url ? 'noopener noreferrer' : undefined}
            className="flex-1 py-3 rounded-xl border border-gray-900 bg-white text-gray-900 text-sm font-semibold text-center hover:bg-gray-50 transition-colors">
            Aceptar y pagar
          </a>
        </div>
      </div>
    </div>
  )
}
