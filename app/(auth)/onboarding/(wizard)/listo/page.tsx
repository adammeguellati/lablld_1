'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Logo } from '@/components/shared/logo'
import { useNav } from '@/hooks/use-nav'

const MOCKUPS: Record<string, Record<string, string>> = {
  'inositol':     { verde: '/onboarding/inositol_-_verde.webp',   naranja: '/onboarding/inositol_-_naranja.webp', negro: '/onboarding/inositol_-_negro.webp' },
  'skin-clarity': { verde: '/onboarding/pomelli_photoshoot_image_9_16_0613.webp', naranja: '/onboarding/skin_clarity_-_naranja.webp', negro: '/onboarding/skin_clarity_-_negro.webp' },
  'crema':        { rosada: '/onboarding/crema_-_rosada.webp', azul: '/onboarding/creama_-_azul.webp' },
}
const STATS: Record<string, { name: string; profit: string; monthly: string }> = {
  'inositol':     { name: 'Complejo de Inositol',      profit: '$40.100 COP',  monthly: '$3.007.500 COP' },
  'skin-clarity': { name: 'Complejo claridad de piel', profit: '$60.200 COP',  monthly: '$4.515.500 COP' },
  'crema':        { name: 'Crema Aclarante',            profit: '$24.200 COP',  monthly: '$1.815.000 COP' },
}

function ListoContent() {
  const { ref, to } = useNav()
  const searchParams = useSearchParams()
  const product = searchParams.get('product') ?? 'inositol'
  const style   = searchParams.get('style')   ?? 'verde'

  const mockupImg = MOCKUPS[product]?.[style] ?? MOCKUPS['inositol']['verde']
  const stats     = STATS[product] ?? STATS['inositol']

  return (
    <div ref={ref} className="min-h-screen bg-[#F5F5F7] flex flex-col items-center px-6 py-16 anim-page">
      <div className="el-0"><Logo href="/" height={28} /></div>
      <h1 className="text-4xl md:text-5xl text-gray-900 mt-8 mb-6 text-center el-1">
        Tu producto está listo.
      </h1>

      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden aspect-[3/4] mb-6 el-2">
        <Image src={mockupImg} alt="Tu producto" fill className="object-cover" priority sizes="(max-width: 640px) 90vw, 384px" />
      </div>

      <div className="w-full max-w-2xl bg-white rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10 el-3">
        <div>
          <p className="text-base font-semibold text-gray-900">{stats.name}</p>
          <p className="text-xs text-gray-400">tu primer producto</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-emerald-600">{stats.profit}</p>
          <p className="text-xs text-emerald-500">ganancia por unidad</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-emerald-600">{stats.monthly}</p>
          <p className="text-xs text-emerald-500">meta mensual (75 ventas)</p>
        </div>
      </div>

      <div className="el-4">
        <button
          onClick={() => to('/onboarding/turno')}
          className="px-20 h-12 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 active:scale-[0.98] transition-all"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

export default function ListoPage() {
  return <Suspense><ListoContent /></Suspense>
}
