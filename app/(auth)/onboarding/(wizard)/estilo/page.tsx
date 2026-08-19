'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/shared/logo'
import { useNav } from '@/hooks/use-nav'

const PRODUCT_IMGS: Record<string, string> = {
  'inositol':     '/onboarding/1781129074853-pj2pob2pff.png',
  'skin-clarity': '/onboarding/1781126374929-ml2psuid96.png',
  'crema':        '/onboarding/8sccY7QOP0nftQnyQSN_S6.png',
}
const STYLES_SUPP  = [
  { id: 'verde',   img: '/onboarding/mzmz.png' },
  { id: 'naranja', img: '/onboarding/mdms1.png' },
  { id: 'negro',   img: '/onboarding/mz1.png' },
]
const STYLES_CREMA = [
  { id: 'azul',   img: '/onboarding/azul_-_estilo.png' },
  { id: 'rosada', img: '/onboarding/rosado_-_estilo.png' },
]

function EstiloContent() {
  const { ref, to, back } = useNav()
  const searchParams = useSearchParams()
  const product = searchParams.get('product') ?? 'inositol'
  const [selected, setSelected] = useState<string | null>(null)

  const styles     = product === 'crema' ? STYLES_CREMA : STYLES_SUPP
  const productImg = PRODUCT_IMGS[product] ?? PRODUCT_IMGS['inositol']

  return (
    <div ref={ref} className="min-h-screen bg-[#F5F5F7] flex flex-col items-center px-6 py-16 relative anim-page">
      <button
        onClick={back}
        className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/70 hover:bg-white text-gray-600 transition-all"
      >
        <ArrowLeft size={18} />
      </button>

      <div className="el-0"><Logo href="/" height={28} /></div>
      <h1 className="text-4xl md:text-5xl text-gray-900 mt-8 mb-2 text-center el-1">Elige el estilo.</h1>
      <hr className="w-full max-w-3xl border-gray-300 mb-8 mt-4 el-1" />

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-3xl items-stretch el-2">
        <div className="hidden md:flex relative w-56 shrink-0 rounded-2xl overflow-hidden min-h-[280px]">
          <Image src={productImg} alt="" fill className="object-cover" priority sizes="25vw" />
        </div>
        <div className="flex flex-col gap-3 flex-1 w-full">
          {styles.map((s) => (
            <button key={s.id} onClick={() => setSelected(s.id)}
              className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                selected === s.id
                  ? 'border-gray-900 scale-[1.02]'
                  : 'border-gray-100 bg-white hover:border-gray-300 hover:scale-[1.01]'
              }`}>
              <div className="relative h-28 w-full">
                <Image src={s.img} alt={s.id} fill className="object-cover rounded-xl" priority sizes="(max-width: 768px) 90vw, 50vw" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 el-3">
        <button
          onClick={() => { if (selected) to(`/onboarding/listo?product=${product}&style=${selected}`) }}
          disabled={!selected}
          className="px-20 h-12 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 disabled:opacity-40 active:scale-[0.98] transition-all"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

export default function EstiloPage() {
  return <Suspense><EstiloContent /></Suspense>
}
