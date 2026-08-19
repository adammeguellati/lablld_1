'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MoreVertical } from 'lucide-react'
import { toggleMerchantProductAction } from '@/app/(merchant)/products/actions'
import type { LabelStatus, MerchantProduct, Product } from '@/types'

export type MyProductRow = MerchantProduct & { product: Product | null }

const CATEGORY_LABELS: Record<string, string> = {
  supplements: 'Suplementos',
  cosmeticos: 'Cosméticos',
  cafe: 'Café',
  beauty: 'Cosméticos',
  skincare: 'Cosméticos',
}

const STATUS: Record<LabelStatus, { label: string; cls: string }> = {
  pending:  { label: 'En revisión', cls: 'bg-amber-50 text-amber-600' },
  approved: { label: 'Aprobada',    cls: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Rechazada',   cls: 'bg-red-50 text-red-600' },
}

export function MyProductCard({ row }: { row: MyProductRow }) {
  const product = row.product
  const image = row.mockup_url ?? product?.images?.[0]
  const paused = product?.is_active === false
  const isActive = row.is_active ?? true
  const status = STATUS[row.label_status]

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

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setOpen(false)
    startTransition(async () => { await toggleMerchantProductAction(row.id, !isActive) })
  }

  return (
    <div className={`group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${paused ? 'opacity-60 grayscale' : ''}`}>

      <Link href={`/products/${row.product_id}`} className="block">
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {image ? (
            <Image src={image} alt={product?.name ?? ''} fill className="object-cover group-hover:scale-[1.04] transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xs text-gray-300 uppercase tracking-widest">Sin imagen</span>
            </div>
          )}

          {paused && (
            <div className="absolute inset-0 bg-gray-900/20 flex items-center justify-center">
              <span className="bg-gray-900/80 text-white text-[10px] font-medium px-2.5 py-1 rounded-full">Pausado</span>
            </div>
          )}
          {!paused && product?.is_new && (
            <span className="absolute top-3 left-3 bg-gray-900 text-white text-[10px] font-medium px-2.5 py-1 rounded-full">Nuevo</span>
          )}

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
            <span className="bg-white text-gray-900 text-xs font-semibold px-4 py-1.5 rounded-full shadow-md translate-y-1 group-hover:translate-y-0 transition-transform duration-200">
              Personalizar →
            </span>
          </div>
        </div>
      </Link>

      <div ref={menuRef} className="absolute top-3 right-3 z-10">
        <button
          onClick={(e) => { e.preventDefault(); setOpen((v) => !v) }}
          className="w-7 h-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition-colors"
        >
          <MoreVertical className="w-3.5 h-3.5 text-gray-600" />
        </button>

        {open && (
          <div className="absolute right-0 top-9 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-20">
            <Link href={`/products/${row.product_id}`} onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              Personalizar
            </Link>
            {row.label_status === 'approved' && (
              <Link href={`/orders/new?productId=${row.product_id}`} onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                Hacer pedido
              </Link>
            )}
            {!paused && (
              <button onClick={handleToggle} disabled={isPending}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
                {isPending ? '…' : isActive ? 'Pausar producto' : 'Activar producto'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
          {CATEGORY_LABELS[product?.category ?? ''] ?? product?.category ?? '—'}
        </p>
        <p className="text-sm font-semibold text-gray-900 truncate">
          {row.custom_name ?? product?.name ?? '—'}
        </p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.cls}`}>
            {status.label}
          </span>
          {!isActive && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              Inactivo
            </span>
          )}
          {row.is_published && (
            <span className="text-[10px] font-medium text-emerald-600">✓ Shopify</span>
          )}
        </div>
      </div>
    </div>
  )
}
