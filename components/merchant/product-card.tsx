'use client'

import Link from 'next/link'
import { formatCOP, calculateMerchantPrice } from '@/lib/utils'
import type { Product, Plan, ProductCategory } from '@/types'

const FORMAT_LABELS: Record<string, string> = {
  capsule: 'Cápsula', powder: 'Polvo', serum: 'Sérum', oil: 'Aceite',
  gummy: 'Gomita', liquid: 'Líquido', cream: 'Crema', solid: 'Sólido',
}

// Three categories, and three is the answer: Adam ruled on 2026-08-21 that the
// design's fourth, Cuidado personal, is not a product line. Keyed on
// ProductCategory rather than string so a value the enum cannot hold is a
// compile error instead of a branch that silently never runs.
const CATEGORY_LABELS: Record<ProductCategory, string> = {
  supplements: 'Suplementos', cosmeticos: 'Cosméticos', cafe: 'Café',
}

const CATEGORY_DOTS: Record<ProductCategory, string> = {
  supplements: '#8FC79A', cosmeticos: '#E4A0B7', cafe: '#D9B27C',
}

interface Props {
  product: Product
  configured?: boolean
  plan: Plan | null
}

export function ProductCard({ product, configured, plan }: Props) {
  const slug = product.slug ?? product.id
  const image = product.images[0]
  const base = product.price_cop ?? null
  const merchantPrice = base && plan ? calculateMerchantPrice(base, plan) : null
  const suggestedPrice = product.suggested_retail_price_cop ?? null
  const fmt = (v: number) => formatCOP(Math.round(v))
  const soldOut = product.stock === 0

  // The status chip is whichever single state is true, so the row never grows a
  // third element. Agotado outranks Nuevo: it changes what you can do.
  const status = soldOut ? 'Agotado' : configured ? 'Agregado' : product.is_new ? 'Nuevo' : null
  const statusClass = soldOut
    ? 'bg-white/92 text-[#86868B]'
    : configured
      ? 'bg-[#E6F6EB] text-[#16A34A]'
      : 'bg-[#1D1E20] text-white'

  return (
    <Link href={`/catalog/${slug}`} className="group flex flex-col">
      <div className="relative aspect-[4/5] rounded-[5px] overflow-hidden bg-[#EDEDEF]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[11px] text-[#AEAEB2] uppercase tracking-widest">Sin imagen</span>
          </div>
        )}

        {/* The collision-proof chip row: ONE absolutely positioned flex row
            pinned to all three edges with space-between, so the category chip
            can ellipsize into whatever room is left and the two can never
            overlap however long the category label gets. */}
        <div className="absolute top-3 left-3 right-3 z-[2] flex items-center justify-between gap-2">
          <span className="min-w-0 flex items-center gap-1.5 rounded-[5px] bg-white/92 px-2 py-1 text-[11.5px] font-medium text-[#1D1E20] backdrop-blur-sm">
            <span
              className="h-1.5 w-1.5 flex-none rounded-full"
              style={{ background: CATEGORY_DOTS[product.category] ?? '#AEAEB2' }}
            />
            <span className="truncate">{CATEGORY_LABELS[product.category] ?? product.category}</span>
          </span>
          {status && (
            <span className={`flex-none whitespace-nowrap rounded-[5px] px-2.5 py-1 text-[11.5px] font-medium ${statusClass}`}>
              {status}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-3.5">
        <p className="text-[15px] font-medium leading-[1.38] text-[#1D1E20] text-pretty">{product.name}</p>
        {product.format && (
          <p className="mt-1 text-[13px] font-medium text-[#86868B]">
            {FORMAT_LABELS[product.format] ?? product.format}
          </p>
        )}

        <div className="min-h-3 flex-1" />

        {merchantPrice !== null ? (
          <div className="flex flex-col gap-0.5 pt-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[12.5px] text-[#86868B]">Costo del producto</span>
              <span className="text-[14.5px] text-[#1D1E20]">{fmt(merchantPrice)}</span>
            </div>
            {suggestedPrice !== null && (
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12.5px] text-[#86868B]">Precio sugerido</span>
                <span className="text-[14.5px] font-medium text-[#1D1E20]">{fmt(suggestedPrice)}</span>
              </div>
            )}
          </div>
        ) : !plan ? (
          <span className="pt-2.5 text-[13px] font-medium text-[#6E6E73] group-hover:text-[#1D1E20] transition-colors">
            Ver precio →
          </span>
        ) : null}
      </div>
    </Link>
  )
}
