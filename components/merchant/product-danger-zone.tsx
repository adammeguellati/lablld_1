'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { softDeleteMerchantProductAction } from '@/app/(merchant)/products/actions'

interface Props {
  merchantProductId: string
  productName: string
  hasShopifyListing: boolean
}

export function ProductDangerZone({ merchantProductId, productName, hasShopifyListing }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, start] = useTransition()

  function remove() {
    setError(null)
    start(async () => {
      const r = await softDeleteMerchantProductAction(merchantProductId)
      if (r.error) { setError(r.error); return }
      router.push('/products')
      router.refresh()
    })
  }

  return (
    <div className="mt-10 border-t border-black/[.08] pt-6">
      <p className="text-[13px] font-medium text-[#6E6E73]">Zona de riesgo</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[#86868B]">
        Eliminar quita este producto de tu lista{hasShopifyListing ? ' y lo pasa a borrador en tu tienda Shopify' : ''}.
        Tus pedidos anteriores no cambian.
      </p>
      {error && <p className="mt-3 rounded-lg bg-[#FBE9E6] px-3 py-2 text-[13px] text-[#C0303B]">{error}</p>}

      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)}
          className="mt-4 rounded-lg border border-[#C0303B]/30 px-4 py-2 text-[13.5px] font-medium text-[#C0303B] transition-colors hover:bg-[#FBE9E6]">
          Eliminar producto
        </button>
      ) : (
        <div className="mt-4 rounded-xl border border-[#C0303B]/25 bg-[#FBE9E6]/40 p-4">
          <p className="text-[14px] font-medium text-[#1D1E20]">¿Eliminar {productName}?</p>
          <p className="mt-1 text-[13px] text-[#6E6E73]">
            Puedes volver a agregarlo desde el catálogo cuando quieras.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={remove} disabled={isPending}
              className="rounded-lg bg-[#C0303B] px-4 py-2 text-[13.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60">
              {isPending ? 'Eliminando...' : 'Eliminar para siempre'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={isPending}
              className="rounded-lg border border-black/10 px-4 py-2 text-[13.5px] font-medium text-[#1D1E20] transition-colors hover:bg-black/[.03]">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
