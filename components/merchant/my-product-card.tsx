'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MoreVertical } from 'lucide-react'
import { formatCOP } from '@/lib/utils'
import { toggleMerchantProductAction } from '@/app/(merchant)/products/actions'
import type { LabelStatus, MerchantProduct, Product, ProductCategory } from '@/types'

export type MyProductRow = MerchantProduct & { product: Product | null }

// Keyed on ProductCategory, not string: the beauty / skincare arms that used to
// sit here were keyed on values the enum cannot hold, so they could never run.
const CATEGORY_LABELS: Record<ProductCategory, string> = {
  supplements: 'Suplementos', cosmeticos: 'Cosméticos', cafe: 'Café',
}

const CATEGORY_DOTS: Record<ProductCategory, string> = {
  supplements: '#8FC79A', cosmeticos: '#E4A0B7', cafe: '#D9B27C',
}

const STATUS: Record<LabelStatus, { label: string; cls: string }> = {
  pending: { label: 'En revisión', cls: 'bg-[#FDEFE0] text-[#B4690E]' },
  approved: { label: 'Aprobada', cls: 'bg-[#E6F6EB] text-[#16A34A]' },
  rejected: { label: 'Rechazada', cls: 'bg-[#FBE9E6] text-[#C0303B]' },
}

export function MyProductCard({ row }: { row: MyProductRow }) {
  const product = row.product
  const image = row.mockup_url ?? product?.images?.[0]
  const paused = product?.is_active === false
  const isActive = row.is_active ?? true
  const status = STATUS[row.label_status]
  const unitCost = product?.price_cop ?? null

  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleToggle() {
    setOpen(false)
    startTransition(async () => { await toggleMerchantProductAction(row.id, !isActive) })
  }

  return (
    <div className={`group relative flex flex-col ${paused ? 'opacity-60' : ''}`}>
      <Link href={`/products/${row.product_id}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[5px] bg-[#EDEDEF]">
          {image ? (
            <Image src={image} alt={product?.name ?? ''} fill className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-[11px] uppercase tracking-widest text-[#AEAEB2]">Sin mockup</span>
            </div>
          )}

          {/* One absolute flex row with space-between, so the category chip can
              ellipsize and the status chip can never be pushed off or overlapped. */}
          <div className="absolute left-3 right-3 top-3 z-[2] flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 rounded-[5px] bg-white/92 px-2 py-1 text-[11.5px] font-medium text-[#1D1E20]">
              <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: (product && CATEGORY_DOTS[product.category]) ?? '#AEAEB2' }} />
              <span className="truncate">{(product && CATEGORY_LABELS[product.category]) ?? '—'}</span>
            </span>
            <span className={`flex-none whitespace-nowrap rounded-[5px] px-2.5 py-1 text-[11.5px] font-medium ${paused ? 'bg-white/92 text-[#86868B]' : status.cls}`}>
              {paused ? 'Pausado' : status.label}
            </span>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col pt-3.5">
        <p className="text-[15px] font-medium leading-[1.38] text-[#1D1E20] text-pretty">
          {row.custom_name ?? product?.name ?? '—'}
        </p>
        {row.custom_name && product?.name && (
          <p className="mt-1 text-[13px] font-medium text-[#86868B]">{product.name}</p>
        )}

        <div className="min-h-3 flex-1" />

        {unitCost !== null && (
          <div className="flex items-baseline justify-between gap-2 pt-2.5">
            <span className="text-[12.5px] text-[#86868B]">Costo por unidad</span>
            <span className="text-[14.5px] text-[#1D1E20]">{formatCOP(unitCost)}</span>
          </div>
        )}
        {row.retail_price != null && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[12.5px] text-[#86868B]">Tu precio de venta</span>
            <span className="text-[14.5px] font-medium text-[#1D1E20]">{formatCOP(row.retail_price)}</span>
          </div>
        )}

        {!isActive && !paused && (
          <p className="mt-1.5 text-[12.5px] text-[#86868B]">Inactivo en tu tienda</p>
        )}

        <div className="mt-3.5 flex items-center gap-2">
          {row.label_status === 'approved' && !paused ? (
            <Link
              href={`/orders/new?productId=${row.product_id}`}
              className="flex flex-1 items-center justify-center rounded-[11px] bg-[#1D1E20] px-3 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#F97316]"
            >
              Crear orden
            </Link>
          ) : null}
          <Link
            href={`/products/${row.product_id}`}
            className={`flex items-center justify-center rounded-[11px] border border-black/10 px-3.5 py-2.5 text-[14px] font-medium text-[#1D1E20] transition-colors hover:border-black/25 ${row.label_status === 'approved' && !paused ? '' : 'flex-1'}`}
          >
            Editar
          </Link>

          {/* The pause/activate action stays. The design replaces this menu with
              a delete, which is FEAT-merchant-product-delete and out of W1, so
              removing the toggle would drop behaviour the design never replaced. */}
          {!paused && (
            <div ref={menuRef} className="relative flex-none">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] border border-black/10 transition-colors hover:border-black/25"
                aria-label="Más acciones"
              >
                <MoreVertical className="h-4 w-4 text-[#6E6E73]" />
              </button>
              {open && (
                <div className="absolute bottom-[calc(100%+6px)] right-0 z-20 w-48 rounded-[14px] border border-black/10 bg-white p-[7px] shadow-[0_12px_36px_rgba(0,0,0,.14)]">
                  <button
                    type="button"
                    onClick={handleToggle}
                    disabled={isPending}
                    className="w-full rounded-[9px] px-2.5 py-2 text-left text-[14.5px] transition-colors hover:bg-black/[.04] disabled:opacity-50"
                  >
                    {isPending ? '…' : isActive ? 'Pausar producto' : 'Activar producto'}
                  </button>
                  {row.is_published && (
                    <p className="px-2.5 py-2 text-[13px] text-[#16A34A]">✓ Publicado en Shopify</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
