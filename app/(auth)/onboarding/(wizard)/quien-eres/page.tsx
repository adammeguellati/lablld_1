'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/shared/logo'
import { useNav } from '@/hooks/use-nav'

const ROLES = [
  { id: 'emprendedor',    label: 'emprendedor',    img: '/onboarding/page_quien_eres_1.jpg' },
  { id: 'influencer',     label: 'influencer',     img: '/onboarding/page_quien_eres_2.jpg' },
  { id: 'dropshipper',    label: 'dropshipper',    img: '/onboarding/page_quien_eres_3.jpg' },
  { id: 'hotel-cafe-spa', label: 'hotel, cafe, spa', img: '/onboarding/page_quien_eres_6.jpg' },
  { id: 'agencia',        label: 'agencia',        img: '/onboarding/page_quien_eres_5.jpg' },
  { id: 'otro',           label: 'otro',           img: '/onboarding/page_quien_eres_4.jpg' },
]

export default function QuienEresPage() {
  const { ref, to, back } = useNav()
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div ref={ref} className="min-h-screen grid lg:grid-cols-2 bg-[#F5F5F7] anim-page">
      <div className="flex flex-col justify-center px-10 md:px-16 py-12 relative">
        <button
          onClick={back}
          className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/70 hover:bg-white text-gray-600 transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="max-w-sm mx-auto w-full">
          <div className="mb-8 el-0"><Logo href="/" /></div>
          <div className="el-1">
            <h1 className="text-4xl text-gray-900 leading-tight mb-1">¿Quién<br />eres?</h1>
            <p className="text-sm text-gray-400 mb-6">Elige el perfil que más te representa.</p>
            <hr className="border-gray-300 mb-6" />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-8 el-2">
            {ROLES.map((r) => (
              <button key={r.id} onClick={() => setSelected(r.id)}
                className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all ${
                  selected === r.id
                    ? 'border-gray-900 scale-[1.04]'
                    : 'border-transparent hover:border-gray-300 hover:scale-[1.02]'
                }`}>
                <Image src={r.img} alt={r.label} fill className="object-cover" sizes="15vw" />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <span className="block bg-white/90 backdrop-blur-sm text-[11px] font-semibold text-gray-800 rounded-lg px-2 py-1 text-center leading-tight">
                    {r.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <div className="el-3">
            <button
              onClick={() => to('/onboarding/producto')}
              className="w-full h-12 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 active:scale-[0.98] transition-all"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
      <div className="hidden lg:block p-4 bg-[#F5F5F7] el-0">
        <div className="h-full rounded-3xl overflow-hidden relative">
          <Image
            src="/onboarding/quien_eres_-_foto.png"
            alt="" fill
            className="object-cover object-center"
            priority sizes="50vw"
          />
        </div>
      </div>
    </div>
  )
}
