'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createAdminOrderAction } from '@/app/admin/orders/new/actions'
import { ColombiaAddressSelector } from '@/components/shared/colombia-address-selector'
import type { Product } from '@/types'

interface Merchant { id: string; full_name: string; email: string }

interface Props {
  merchants: Merchant[]
  products: Pick<Product, 'id' | 'name' | 'wholesale_price_usd'>[]
}

const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors'

export function AdminOrderForm({ merchants, products }: Props) {
  const router = useRouter()
  const [isPending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [merchantId, setMerchantId] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [address1, setAddress1] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [zip, setZip] = useState('')

  function submit() {
    if (!merchantId || !productId || !customerName || !address1 || !city || !province) {
      setError('Completa todos los campos requeridos.')
      return
    }
    setError(null)
    start(async () => {
      const r = await createAdminOrderAction({
        merchantId, productId, quantity,
        customerName, customerEmail,
        shippingAddress: { address1, city, province, zip, country: 'Colombia', name: customerName },
      })
      if (r.error) { setError(r.error); return }
      router.push(`/admin/orders/${r.orderId}`)
    })
  }

  return (
    <div className="space-y-6 max-w-xl">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      <div className="bg-white rounded-lg border p-5 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Merchant y producto</p>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Merchant *</label>
          <select value={merchantId} onChange={(e) => setMerchantId(e.target.value)} className={ic}>
            <option value="">Seleccionar merchant...</option>
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name} — {m.email}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Producto *</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className={ic}>
            <option value="">Seleccionar producto...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.wholesale_price_usd ? ` — $${p.wholesale_price_usd}` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Cantidad *</label>
          <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))} className={ic} />
        </div>
      </div>

      <div className="bg-white rounded-lg border p-5 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Datos del cliente</p>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Nombre *</label>
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={ic} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
          <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className={ic} />
        </div>
      </div>

      <div className="bg-white rounded-lg border p-5 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dirección de envío</p>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Dirección *</label>
          <input value={address1} onChange={(e) => setAddress1(e.target.value)} className={ic} placeholder="Calle, carrera, número..." />
        </div>
        <ColombiaAddressSelector
          province={province}
          city={city}
          onProvinceChange={setProvince}
          onCityChange={setCity}
        />
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Código postal</label>
          <input value={zip} onChange={(e) => setZip(e.target.value)} className={ic} placeholder="Opcional" />
        </div>
      </div>

      <button onClick={submit} disabled={isPending}
        className="w-full bg-gray-900 text-white py-3 rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-60 transition-colors">
        {isPending ? 'Creando pedido...' : 'Crear pedido →'}
      </button>
    </div>
  )
}
