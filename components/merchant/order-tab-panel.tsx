'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatCOP, formatDate } from '@/lib/utils'
import { rejectQuoteAction } from '@/app/(merchant)/orders/actions'
import type { Order } from '@/types'
import type { TabId } from './order-row'

const DL = 'divide-y divide-gray-100 rounded-xl bg-gray-50 border border-gray-100'
const DR = 'flex justify-between items-center py-3 px-4 text-sm'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={DR}>
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

function CheckIcon({ green = true }: { green?: boolean }) {
  return (
    <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${green ? 'bg-emerald-500' : 'bg-gray-300'}`}>
      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function PhaseHeader({ title, description, done = true }: { title: string; description: string; done?: boolean }) {
  return (
    <div className="flex gap-3 mb-4">
      <CheckIcon green={done} />
      <div>
        <p className="font-bold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
  )
}

function NotYet({ label, rows }: { label: string; rows?: { label: string; value: string }[] }) {
  return (
    <div className="px-5 py-5">
      <div className="flex items-center gap-2 mb-2">
        <p className="font-bold text-gray-400 text-base">{label}</p>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Aún no iniciado</span>
      </div>
      <p className="text-sm text-gray-400 mb-5">Este paso aún no comienza. Aquí verás el detalle cuando tu orden llegue a esta etapa.</p>
      {rows && (
        <div className={`${DL} opacity-40`}>
          {rows.map((r) => <Row key={r.label} label={r.label} value={r.value} />)}
        </div>
      )}
    </div>
  )
}

export function OrderTabPanel({ order, tab, currentStep }: { order: Order; tab: TabId; currentStep: number }) {
  const items = order.order_items ?? []
  const addr = order.shipping_address
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0)
  const router = useRouter()
  const [isPending, start] = useTransition()
  const [showReject, setShowReject] = useState(false)
  const [rejectError, setRejectError] = useState<string | null>(null)

  if (tab === 'info') {
    return (
      <div className="px-5 py-5 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Productos y etiqueta</p>
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-2.5 mb-3">
              {item.merchant_product?.label_url && (
                <div className="w-10 h-10 rounded border border-gray-200 bg-white overflow-hidden shrink-0">
                  {/* User-uploaded storage URL in a fixed-size container. Converting to
                      next/image is deferred to the UI wave, not skipped: SEC-labels-bucket
                      moves these to signed URLs, which changes the shape the optimizer's
                      remotePatterns must match, so converting now would be redone. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.merchant_product.label_url} alt="" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm text-gray-800">{item.product_name} <span className="text-gray-400 text-xs">×{item.quantity}</span></p>
                {item.merchant_product?.label_url && (
                  <a href={item.merchant_product.label_url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-700 mt-0.5 inline-block">
                    Ver etiqueta
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Cliente y entrega</p>
          {addr ? (
            <div className="text-sm space-y-0.5 text-gray-700">
              <p className="font-semibold">{order.customer_name}</p>
              <p>{addr.address1}</p>
              <p>{addr.city}, {addr.province} {addr.zip}</p>
              <p>{addr.country}</p>
              {order.customer_email && <p className="text-xs text-gray-400 pt-1">{order.customer_email}</p>}
            </div>
          ) : <p className="text-sm text-gray-400">Sin dirección registrada.</p>}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Detalles de la orden</p>
          <div className="text-sm space-y-2">
            <div className="flex justify-between gap-2"><span className="text-gray-500">Origen</span><span className="font-medium text-gray-900">{order.shopify_order_id ? 'Shopify' : 'Personalizado'}</span></div>
            <div className="flex justify-between gap-2"><span className="text-gray-500">Recibida</span><span className="font-medium text-gray-900">{formatDate(order.created_at)}</span></div>
            {order.tracking_number && <div className="flex justify-between gap-2"><span className="text-gray-500">Tracking</span><span className="font-medium text-gray-900">{order.tracking_number}</span></div>}
          </div>
        </div>
      </div>
    )
  }

  if (tab === 'cotizacion') {
    const done = currentStep > 0
    return (
      <div className="px-5 py-5">
        <PhaseHeader done={!done ? false : true}
          title={done ? 'Cotización completada' : 'Estamos preparando tu cotización'}
          description={done ? 'Tu cotización fue procesada.' : 'Recibimos tu pedido. En breve calcularemos el costo total y te avisaremos para que apruebes el pago.'} />
        <div className={DL}>
          <Row label="Recibida" value={formatDate(order.created_at)} />
          <Row label="Unidades" value={String(totalUnits)} />
          {!done && <Row label="Respuesta estimada" value="24 h hábiles" />}
        </div>
      </div>
    )
  }

  if (tab === 'pago') {
    if (currentStep < 1) return <NotYet label="Pago" />
    if (currentStep > 1) {
      return (
        <div className="px-5 py-5">
          <PhaseHeader title="Pago realizado" description="El pago fue aprobado y procesado exitosamente." />
          <div className={DL}><Row label="Total pagado" value={formatCOP(order.fulfillment_cost ?? 0)} /></div>
        </div>
      )
    }
    if (showReject) return (
      <div className="px-5 py-5 space-y-4">
        <div>
          <p className="font-semibold text-gray-900 text-sm mb-1">¿Rechazar esta cotización?</p>
          <p className="text-sm text-gray-500">El pedido será cancelado.</p>
        </div>
        {rejectError && <p className="text-sm text-red-600">{rejectError}</p>}
        <div className="flex gap-3">
          <button onClick={() => setShowReject(false)} disabled={isPending} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
          <button onClick={() => start(async () => {
            const r = await rejectQuoteAction(order.id)
            if (r?.error) { setRejectError(r.error); return }
            router.push('/orders')
          })} disabled={isPending} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
            {isPending ? 'Cancelando...' : 'Confirmar rechazo'}
          </button>
        </div>
      </div>
    )
    return (
      <div className="px-5 py-5">
        <PhaseHeader done={false} title="Tu cotización está lista" description="Revisa el detalle de costos y aprueba el pago para que tu orden entre a la fila de preparación en bodega." />
        <div className={`${DL} mb-5`}>
          {order.shipping_cost_cop && order.shipping_cost_cop > 0 && <Row label="Envío LABLLD" value={formatCOP(order.shipping_cost_cop)} />}
          {order.carrier && <Row label="Transportadora" value={order.carrier} />}
          {order.estimated_delivery && <Row label="Entrega estimada" value={order.estimated_delivery} />}
          <Row label="Total a pagar" value={formatCOP(order.fulfillment_cost ?? 0)} />
        </div>
        <div className="flex gap-3">
          <a
            href={order.payment_link_url ?? `/orders/${order.id}/pay`}
            target={order.payment_link_url ? '_blank' : undefined}
            rel={order.payment_link_url ? 'noopener noreferrer' : undefined}
            className="bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-gray-800 transition-colors">
            Aceptar y pagar
          </a>
          <button onClick={() => setShowReject(true)} className="text-sm font-semibold text-gray-600 border border-gray-200 px-5 py-2.5 rounded-full hover:bg-gray-50 transition-colors">
            Rechazar cotización
          </button>
        </div>
      </div>
    )
  }

  if (tab === 'pagado') {
    if (currentStep < 2) return <NotYet label="Pagado" />
    return (
      <div className="px-5 py-5">
        <PhaseHeader title="Pago confirmado" description="Recibimos tu pago. Ya reservamos el inventario en bodega y tu orden entra a la fila de preparación." />
        <div className={DL}>
          {order.shipped_at && <Row label="Fecha de pago" value={formatDate(order.shipped_at)} />}
          {order.wompi_transaction_id && <Row label="Referencia" value={order.wompi_transaction_id} />}
          <Row label="Total pagado" value={formatCOP(order.fulfillment_cost ?? 0)} />
        </div>
      </div>
    )
  }

  if (tab === 'produccion') {
    if (currentStep < 3) return <NotYet label="Producción" rows={[{ label: 'Inicio de preparación', value: '—' }, { label: 'Salida estimada', value: '—' }]} />
    return (
      <div className="px-5 py-5">
        <PhaseHeader title="Tu pedido está en producción" description="Tu pedido se está preparando y revisando en nuestras bodegas. Te avisamos apenas salga a despacho." />
        <div className={DL}>
          <Row label="Inicio de preparación" value={formatDate(order.updated_at)} />
          {order.estimated_delivery && <Row label="Salida estimada" value={order.estimated_delivery} />}
        </div>
      </div>
    )
  }

  if (tab === 'enviado') {
    if (currentStep < 4) return <NotYet label="Enviado" rows={[{ label: 'Transportadora', value: '—' }, { label: 'Número de guía', value: '—' }]} />
    return (
      <div className="px-5 py-5">
        <PhaseHeader title="Tu pedido va en camino" description="Tu pedido salió de nuestra bodega y está en manos de la transportadora. Usa la guía para seguirlo en tiempo real." />
        <div className={`${DL} mb-5`}>
          {order.carrier && <Row label="Transportadora" value={order.carrier} />}
          {order.tracking_number && <Row label="Número de guía" value={order.tracking_number} />}
          {order.shipped_at && <Row label="Despachado" value={formatDate(order.shipped_at)} />}
        </div>
        <div className="flex gap-3">
          <a href="mailto:soporte@lablld.com" className="text-sm font-semibold text-gray-600 border border-gray-200 px-5 py-2.5 rounded-full hover:bg-gray-50 transition-colors">Reportar un problema</a>
        </div>
      </div>
    )
  }

  if (tab === 'entregado') {
    if (currentStep < 5) return <NotYet label="Entregado" rows={[{ label: 'Fecha de entrega', value: order.estimated_delivery ?? '—' }, { label: 'Número de guía', value: order.tracking_number ?? '—' }]} />
    return (
      <div className="px-5 py-5">
        <PhaseHeader title="Pedido entregado" description="Tu pedido fue entregado exitosamente." />
        <div className={DL}>
          {order.customer_name && <Row label="Recibido por" value={order.customer_name} />}
          {order.tracking_number && <Row label="Guía" value={order.tracking_number} />}
        </div>
      </div>
    )
  }

  return null
}