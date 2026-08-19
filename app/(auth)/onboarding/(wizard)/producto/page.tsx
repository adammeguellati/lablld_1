'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/shared/logo'
import { useNav } from '@/hooks/use-nav'

const PRODUCTS = [
  { id: 'inositol',     name: 'Inositol Complex',     img: '/onboarding/1781129074853-pj2pob2pff.png' },
  { id: 'skin-clarity', name: 'Skin Clarity Complex',  img: '/onboarding/1781126374929-ml2psuid96.png' },
  { id: 'crema',        name: 'Crema Aclarante',       img: '/onboarding/8sccY7QOP0nftQnyQSN_S6.png' },
]

export default function ProductoPage() {
  const { ref, to, back } = useNav()
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div ref={ref} className="min-h-screen bg-[#F5F5F7] flex flex-col items-center px-6 py-16 relative anim-page">
      <button
        onClick={back}
        className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/70 hover:bg-white text-gray-600 transition-all"
      >
        <ArrowLeft size={18} />
      </button>

      <div className="el-0"><Logo href="/" height={28} /></div>

      <div className="mt-10 text-center mb-2 el-1">
        <h1 className="text-4xl md:text-5xl text-gray-900 leading-tight">
          Crea tu marca en<br />menos de 2 minutos.
        </h1>
      </div>
      <p className="text-sm text-gray-400 mb-2 mt-3 el-1">Elige un producto para empezar.</p>
      <hr className="w-full max-w-3xl border-gray-300 mb-10 el-1" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mb-12 el-2">
        {PRODUCTS.map((p) => (
          <button key={p.id} onClick={() => setSelected(p.id)}
            className={`rounded-2xl overflow-hidden border-2 transition-all ${
              selected === p.id
                ? 'border-gray-900 scale-[1.03]'
                : 'border-transparent hover:border-gray-300 hover:scale-[1.01]'
            }`}>
            <div className="relative aspect-[3/4] w-full">
              <Image src={p.img} alt={p.name} fill className="object-cover" priority sizes="(max-width: 640px) 90vw, 33vw" />
            </div>
          </button>
        ))}
      </div>

      <div className="el-3">
        <button
          onClick={() => { if (selected) to(`/onboarding/estilo?product=${selected}`) }}
          disabled={!selected}
          className="px-20 h-12 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 disabled:opacity-40 active:scale-[0.98] transition-all"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
