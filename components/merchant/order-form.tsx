'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ColombiaAddressSelector } from '@/components/shared/colombia-address-selector'
import { createManualOrderAction, createSampleOrderAction } from '@/app/(merchant)/orders/new/actions'
import { formatCOP, calculateMerchantPrice } from '@/lib/utils'
import type { Plan } from '@/types'

interface ProductOption { id: string; name: string; price_cop: number | null; base_price: number; wholesale_price_usd: number | null }
interface MerchantProductOption { product_id: string; product: ProductOption | null }

interface Props {
  isSample: boolean
  merchantProducts: MerchantProductOption[]
  sampleProduct: ProductOption | null
  preselectedProductId?: string
  plan: Plan | null
}

export function OrderForm({ isSample, merchantProducts, sampleProduct, preselectedProductId, plan }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')

  const [selectedId, setSelectedId] = useState(preselectedProductId ?? merchantProducts[0]?.product_id ?? '')

  const activeProduct = isSample
    ? sampleProduct
    : merchantProducts.find((mp) => mp.product_id === selectedId)?.product ?? null

  const displayPrice = activeProduct?.price_cop && plan
    ? calculateMerchantPrice(activeProduct.price_cop, plan)
    : null

  function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault()
    if (!activeProduct) return
    const fd = new FormData(e.currentTarget)

    const shippingAddress = {
      name: (fd.get('recipient_name') as string) || '',
      address1: fd.get('address1') as string,
      city,
      province,
      zip: (fd.get('zip') as string) || '',
      country: 'Colombia',
    }

    startTransition(async () => {
      setError(null)
      try {
        const result = isSample
          ? await createSampleOrderAction({ productId: activeProduct.id, quantity: qty, shippingAddress })
          : await createManualOrderAction({
              productId: activeProduct.id,
              quantity: qty,
              shippingAddress,
              customerName: fd.get('customer_name') as string,
              customerEmail: fd.get('customer_email') as string,
            })

        if (result.error) { setError(result.error); return }
        router.push('/orders')
      } catch {
        setError('Ocurrió un error inesperado. Inténtalo de nuevo.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</p>}

      {!isSample && (
        <div className="space-y-1">
          <Label>Producto</Label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {merchantProducts.map((mp) => (
              <option key={mp.product_id} value={mp.product_id}>{mp.product?.name ?? mp.product_id}</option>
            ))}
          </select>
        </div>
      )}

      {isSample && activeProduct && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm font-medium">{activeProduct.name}</div>
      )}

      <div className="space-y-1">
        <Label>Cantidad</Label>
        <Input type="number" min={1} max={100} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-24" />
      </div>

      {!isSample && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Datos del cliente</h3>
          <div className="space-y-1"><Label>Nombre</Label><Input name="customer_name" placeholder="Juan Pérez" /></div>
          <div className="space-y-1"><Label>Email</Label><Input name="customer_email" type="email" placeholder="juan@email.com" /></div>
          <div className="space-y-1"><Label>Nombre destinatario</Label><Input name="recipient_name" placeholder="Juan Pérez" /></div>
        </div>
      )}

      {isSample && (
        <div className="space-y-1">
          <Label>Tu nombre (destinatario)</Label>
          <Input name="recipient_name" required placeholder="Tu nombre" />
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">{isSample ? 'Tu dirección de entrega' : 'Dirección de envío'}</h3>
        <div className="space-y-1"><Label>Dirección</Label><Input name="address1" required placeholder="Calle 10 # 20-30" /></div>
        <ColombiaAddressSelector province={province} city={city} onProvinceChange={setProvince} onCityChange={setCity} />
        <div className="space-y-1"><Label>Código postal</Label><Input name="zip" placeholder="110111" /></div>
      </div>

      {displayPrice !== null && (
        <div className="bg-gray-50 border rounded-xl p-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Precio unitario</span>
            <span className="font-medium">{formatCOP(Math.round(displayPrice))}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-1 mt-1">
            <span>Total ({qty} ud.)</span>
            <span>{formatCOP(Math.round(displayPrice * qty))}</span>
          </div>
        </div>
      )}

      <Button type="submit" disabled={isPending || !activeProduct} className="w-full">
        {isPending ? 'Procesando...' : isSample ? 'Solicitar Muestra' : 'Crear pedido'}
      </Button>
    </form>
  )
}
