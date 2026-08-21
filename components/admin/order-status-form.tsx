'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { confirmQuoteAction, markDeliveredAction, markInProductionAction, markShippedAction } from '@/app/admin/orders/[id]/actions'
import type { OrderStatus } from '@/types'
import { toast } from 'sonner'

interface Props { orderId: string; status: OrderStatus; productCostCop?: number | null }

export function OrderStatusForm({ orderId, status, productCostCop }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [shippingStr, setShippingStr] = useState('')
  const [carrier, setCarrier] = useState('')
  const [estimatedDelivery, setEstimatedDelivery] = useState('')
  const [tracking, setTracking] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [shopifyMsg, setShopifyMsg] = useState<{ type: 'warn' | 'info'; text: string } | null>(null)

  const shippingCop = Number(shippingStr) || 0
  const totalCop = (productCostCop ?? 0) + shippingCop

  function exec(fn: () => Promise<{ error?: string; shopifyWarning?: string; shopifyInfo?: string } | void>) {
    setError(null); setShopifyMsg(null)
    startTransition(async () => {
      const res = (await fn()) ?? {}
      if ('error' in res && res.error) { setError(res.error); return }
      if ('shopifyWarning' in res && res.shopifyWarning) { setShopifyMsg({ type: 'warn', text: `Shopify: ${res.shopifyWarning}` }); return }
      if ('shopifyInfo' in res && res.shopifyInfo) { setShopifyMsg({ type: 'info', text: res.shopifyInfo }); return }
      toast.success('Pedido actualizado.')
      router.refresh()
    })
  }

  if (status === 'quote_pending' || status === 'pending') return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Ingresa los detalles de envío para cotizar al merchant.</p>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block font-medium">Costo de envío (COP)</label>
        <div className="flex items-center border rounded overflow-hidden focus-within:ring-1 focus-within:ring-ring">
          <span className="px-3 py-2 text-sm text-muted-foreground bg-muted border-r">$</span>
          <input type="number" min="0" step="100" value={shippingStr}
            onChange={e => setShippingStr(e.target.value)} className="flex-1 px-3 py-2 text-sm outline-none" placeholder="18000" />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block font-medium">Empresa de transporte</label>
        <input type="text" value={carrier} onChange={e => setCarrier(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm" placeholder="Coordinadora, Servientrega..." />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block font-medium">Plazo de entrega estimado</label>
        <input type="text" value={estimatedDelivery} onChange={e => setEstimatedDelivery(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm" placeholder="3-5 días hábiles" />
      </div>
      <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1.5">
        <div className="flex justify-between text-muted-foreground">
          <span>Costo del producto</span><span>${(productCostCop ?? 0).toLocaleString('es-CO')} COP</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Costo de envío</span><span>${shippingCop.toLocaleString('es-CO')} COP</span>
        </div>
        <div className="flex justify-between font-semibold border-t border-border pt-1.5">
          <span>Total a cobrar</span><span>${totalCop.toLocaleString('es-CO')} COP</span>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        onClick={() => {
          if (!carrier.trim() || !estimatedDelivery.trim()) { setError('Completa todos los campos'); return }
          exec(() => confirmQuoteAction(orderId, { shippingCostCop: shippingCop, carrier: carrier.trim(), estimatedDelivery: estimatedDelivery.trim() }))
        }}
        disabled={isPending || shippingCop <= 0 || !carrier.trim() || !estimatedDelivery.trim()}
        // The design specifies the DISABLED colours for this gate rather than a
        // dimmed primary, because the three-field requirement is the point of the
        // control and a 50%-opacity green still reads as "nearly ready".
        className="w-full rounded-[13px] px-4 py-3 text-[14.5px] font-medium transition-colors bg-[#1D1E20] text-white hover:bg-[#F97316] disabled:bg-[#E9E9ED] disabled:text-[#AEAEB2] disabled:hover:bg-[#E9E9ED]">
        {isPending ? 'Enviando...' : 'Enviar cotización al merchant'}
      </button>
    </div>
  )

  if (status === 'payment_pending') return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
      Esperando que el merchant confirme y pague. Se notificará automáticamente cuando el pago sea procesado.
    </div>
  )

  if (status === 'paid') return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">La orden está pagada. Márcala en producción cuando empieces a procesarla.</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button onClick={() => exec(() => markInProductionAction(orderId))} disabled={isPending}
        className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50">
        {isPending ? 'Actualizando...' : 'Marcar en producción'}
      </button>
    </div>
  )

  if (status === 'in_production') return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Número de tracking</label>
          <input className="w-full border rounded px-3 py-2 text-sm" placeholder="1Z999AA10123456784"
            value={tracking} onChange={e => setTracking(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Transportista</label>
          <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Coordinadora, DHL..."
            value={carrier} onChange={e => setCarrier(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {shopifyMsg && <p className={`text-sm ${shopifyMsg.type === 'warn' ? 'text-amber-600' : 'text-blue-600'}`}>{shopifyMsg.text}</p>}
      <button
        onClick={() => { if (!tracking.trim() || !carrier.trim()) { setError('Ingresa tracking y transportista'); return } exec(() => markShippedAction(orderId, tracking.trim(), carrier.trim())) }}
        disabled={isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50">
        {isPending ? 'Enviando...' : 'Marcar como enviada'}
      </button>
    </div>
  )

  if (status === 'shipped') return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Confirma que el pedido fue entregado al cliente.</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button onClick={() => exec(() => markDeliveredAction(orderId))} disabled={isPending}
        className="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
        {isPending ? 'Actualizando...' : 'Marcar como entregada'}
      </button>
    </div>
  )

  return null
}
