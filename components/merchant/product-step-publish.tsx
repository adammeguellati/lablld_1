'use client'

import { calculateMerchantPrice, formatCOP } from '@/lib/utils'
import type { Plan } from '@/types'

interface Props {
  customName: string
  retailPrice: number
  wholesalePrice: number | null
  plan: Plan | null
  shopDomain: string | null
  shopifyProductId: string | null
  isPending: boolean
  onPublish: () => void
}

export function ProductStepPublish({ customName, retailPrice, wholesalePrice, plan, shopDomain, shopifyProductId, isPending, onPublish }: Props) {
  const cost = plan && wholesalePrice ? calculateMerchantPrice(wholesalePrice, plan) : null
  const margin = cost && retailPrice > 0 ? Math.round(((retailPrice - cost) / retailPrice) * 100) : null

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-gray-500 mt-0.5">Puedes gestionar tus pedidos manualmente o publicarlo directamente en tu tienda Shopify.</p>
      </div>

      <div className="border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Nombre del producto</span>
          <span className="font-medium text-gray-900">{customName}</span>
        </div>
        <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-3">
          <span className="text-gray-500">Precio de venta</span>
          <span className="font-medium text-gray-900">{retailPrice > 0 ? formatCOP(retailPrice) : '—'}</span>
        </div>
        {cost !== null && retailPrice > 0 && margin !== null && (
          <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-3">
            <span className="text-gray-500">Tu costo · Margen estimado</span>
            <span className="text-emerald-600 font-medium">{formatCOP(Math.round(cost))} · {margin}%</span>
          </div>
        )}
      </div>

      {shopifyProductId ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3">
          <p className="font-semibold text-sm text-emerald-800">✓ Publicado en Shopify</p>
          {shopDomain && (
            <a href={`https://${shopDomain}/admin/products`} target="_blank" rel="noopener noreferrer"
              className="text-sm text-gray-900 underline hover:text-gray-600">Ver en Shopify →</a>
          )}
        </div>
      ) : !shopDomain ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          <a href="/settings?tab=tiendas" className="underline font-medium">Conecta tu tienda Shopify</a> desde Configuración para poder publicar.
        </div>
      ) : (
        <>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800 leading-relaxed">
            <b>¿Qué pasa al publicar?</b> Los renders se suben automáticamente a tu producto en Shopify. Los pedidos serán procesados por LABLLD y enviados vía Envia.com.
          </div>
          <button onClick={onPublish} disabled={isPending || !retailPrice || retailPrice <= 0}
            className="w-full bg-gray-900 text-white py-3 rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-60 transition-colors">
            {isPending ? 'Publicando...' : 'Publicar ahora →'}
          </button>
        </>
      )}
    </div>
  )
}
