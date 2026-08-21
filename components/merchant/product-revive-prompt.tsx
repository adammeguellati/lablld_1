'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reviveWithPreviousLabelAction, reviveBlankAction } from '@/app/(merchant)/products/actions'

interface Props {
  productId: string
  productName: string
  labelUrl: string
  isPdf: boolean
}

// Only rendered when there is a stored label to reuse. A prompt offering an
// empty option would be worse than no prompt.
export function ProductRevivePrompt({ productId, productName, labelUrl, isPdf }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, start] = useTransition()

  function choose(keep: boolean) {
    setError(null)
    start(async () => {
      const r = await (keep ? reviveWithPreviousLabelAction(productId) : reviveBlankAction(productId))
      if (r.error) { setError(r.error); return }
      router.refresh()
    })
  }

  return (
    <div className="rounded-[22px] border border-black/[.08] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,.03)] md:p-10">
      <p className="text-[11.5px] font-medium uppercase tracking-[.04em] text-[#86868B]">Ya habías empezado este producto</p>
      <h2 className="mt-2 text-[30px] font-normal leading-[1.15] tracking-[-0.008em] text-pretty">
        Guardamos tu etiqueta de {productName}
      </h2>
      <p className="mt-2 text-[15px] text-[#6E6E73]">
        La eliminaste de tu lista, pero no la borramos. Puedes seguir con la misma o empezar de cero.
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-5">
        <div className="flex h-[124px] w-[92px] shrink-0 items-center justify-center overflow-hidden rounded-[11px] border border-black/[.08] bg-[#F5F5F7]">
          {isPdf ? (
            <span className="text-[12px] text-[#86868B]">PDF</span>
          ) : (
            // A signed, expiring URL is a fresh optimizer cache miss on every
            // render, so next/image would bill a transformation each time.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={labelUrl} alt="Tu etiqueta anterior" className="h-full w-full object-contain" />
          )}
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={() => choose(true)} disabled={isPending}
            className="h-12 rounded-full bg-[#1D1E20] px-6 text-[15px] font-medium text-white transition-all hover:bg-[#F97316] active:scale-[0.98] disabled:opacity-60">
            {isPending ? 'Un momento...' : 'Usar etiqueta anterior'}
          </button>
          <button type="button" onClick={() => choose(false)} disabled={isPending}
            className="h-12 rounded-full border border-black/[.12] px-6 text-[15px] font-medium text-[#1D1E20] transition-colors hover:bg-black/[.03] disabled:opacity-60">
            Empezar de cero
          </button>
        </div>
      </div>

      {error && <p className="mt-4 rounded-[11px] bg-[#FBE9E6] px-3.5 py-2.5 text-[13.5px] text-[#C0303B]">{error}</p>}
    </div>
  )
}
