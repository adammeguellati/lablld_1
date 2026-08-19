'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { markOnboardingCompleteAction } from './actions'

export default function TurnoPage() {
  const router = useRouter()
  const [entering, setEntering] = useState(false)

  async function enterPanel() {
    if (entering) return
    setEntering(true)
    await markOnboardingCompleteAction()
    setTimeout(() => router.push('/dashboard'), 620)
  }

  return (
    <>
      {entering && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-gray-50 anim-overlay"
          style={{ animationDelay: '160ms' }}
        />,
        document.body
      )}
      <div
        className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center gap-8 px-6 anim-page"
        style={entering ? { animation: 'exitFwd 400ms cubic-bezier(0.4,0,1,1) forwards' } : undefined}
      >
        <div className="w-full max-w-3xl el-1 relative aspect-[5/2] rounded-3xl overflow-hidden shadow-xl">
          <Image
            src="/onboarding/ahora_es_tu_turno_-_asset.png"
            alt="Ahora es tu turno."
            fill
            className="object-cover object-center"
            priority
            sizes="(max-width: 640px) 90vw, 768px"
          />
        </div>
        <div className="el-2">
          <button
            onClick={enterPanel}
            disabled={entering}
            className="px-20 h-12 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 active:scale-[0.98] disabled:opacity-60 transition-all"
          >
            {entering ? 'Cargando...' : 'Entrar al panel'}
          </button>
        </div>
      </div>
    </>
  )
}
