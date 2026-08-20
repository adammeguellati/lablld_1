'use client'

import Link from 'next/link'
import { formatCOP, calculateMerchantPrice } from '@/lib/utils'
import type { Product, Plan } from '@/types'

const FORMAT_LABELS: Record<string, string> = {
  capsule: 'Cápsula', powder: 'Polvo', serum: 'Sérum', oil: 'Aceite',
  gummy: 'Gomita', liquid: 'Líquido', cream: 'Crema', solid: 'Sólido',
}

const CATEGORY_LABELS: Record<string, string> = {
  supplements: 'Suplementos', cosmeticos: 'Cosméticos', cafe: 'Café',
  beauty: 'Cosméticos', skincare: 'Cosméticos',
}

interface Props {
  product: Product
  configured?: boolean
  plan: Plan | null
}

export function ProductCard({ product, configured, plan }: Props) {
  const slug = product.slug ?? product.id
  const image = product.images[0]
  const showNew = product.is_new
  const base = product.price_cop ?? null
  const merchantPrice = base && plan ? calculateMerchantPrice(base, plan) : null
  const suggestedPrice = product.suggested_retail_price_cop ?? null
  const fmt = (v: number) => formatCOP(Math.round(v))

  return (
    <Link
      href={`/catalog/${slug}`}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs text-gray-300 uppercase tracking-widest">Sin imagen</span>
          </div>
        )}
        {showNew && (
          <span className="absolute top-3 left-3 bg-gray-900 text-white text-[10px] font-medium px-2.5 py-1 rounded-full tracking-wide">Nuevo</span>
        )}
        {configured && (
          <span className="absolute top-3 right-3 text-[10px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Agregado</span>
        )}
        {product.stock === 0 && (
          <span className="absolute bottom-3 left-3 bg-white/90 text-gray-500 text-[10px] font-medium px-2.5 py-1 rounded-full border border-gray-200">Agotado</span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-1">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
          {CATEGORY_LABELS[product.category] ?? product.category}
          {product.format && ` · ${FORMAT_LABELS[product.format] ?? product.format}`}
        </p>
        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-gray-600 transition-colors">
          {product.name}
        </h3>

        {merchantPrice !== null ? (
          <div className="mt-2 pt-2.5 border-t border-gray-50 space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] text-gray-400">Costo del Producto</span>
              <span className="text-xs text-gray-600">{fmt(merchantPrice)}</span>
            </div>
            {suggestedPrice !== null && (
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] text-gray-400">Precio sugerido</span>
                <span className="text-xs font-semibold text-gray-900">{fmt(suggestedPrice)}</span>
              </div>
            )}
          </div>
        ) : !plan ? (
          <span className="text-xs text-gray-400 mt-1.5">Ver precio →</span>
        ) : null}
      </div>
    </Link>
  )
}
