'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { registerAction } from '../actions'
import { Logo } from '@/components/shared/logo'

const ic = 'w-full h-12 rounded-[11px] border border-black/10 bg-white px-4 text-[14.5px] outline-none transition-colors focus:border-black/25 placeholder:text-[#AEAEB2]'

function RightPanel() {
  return (
    <div className="hidden lg:block p-4 bg-[#F5F5F7] el-0">
      <div className="h-full rounded-3xl overflow-hidden relative">
        <Image src="/onboarding/primera_foto_-.png" alt="" fill className="object-cover" priority sizes="50vw" />
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const [state, action, isPending] = useActionState(registerAction, { error: null, success: null })

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F5F5F7] anim-page">
      <div className="flex flex-col justify-center px-10 md:px-20 py-12">
        <div className="max-w-sm mx-auto w-full">
          <div className="mb-10 el-0"><Logo href="/" /></div>
          <div className="el-1">
            <h1 className="mb-2 text-[36px] font-normal leading-[1.12] tracking-[-0.008em] text-[#1D1E20]">Reclama<br />tu lugar.</h1>
            <p className="mb-5 text-[14.5px] font-medium text-[#C0303B]">Acceso limitado.</p>
            <hr className="border-gray-300 mb-6" />
          </div>
          <form action={action} className="space-y-4 el-2">
            <div>
              <label className="mb-1.5 block text-[12.5px] text-[#86868B]">nombre y apellido</label>
              <input name="full_name" placeholder="Nombre y Apellido" required autoComplete="name" className={ic} />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] text-[#86868B]">correo electrónico</label>
              <input name="email" type="email" placeholder="tu@email.com" required autoComplete="email" className={ic} />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] text-[#86868B]">contraseña</label>
              <input name="password" type="password" placeholder="tu contraseña" required autoComplete="new-password" className={ic} />
            </div>
            {state.error && <p className="rounded-[11px] bg-[#FBE9E6] px-3.5 py-2.5 text-[13.5px] text-[#C0303B]">{state.error}</p>}
            <button type="submit" disabled={isPending}
              className="mt-1 h-12 w-full rounded-full bg-[#1D1E20] text-[15px] font-medium text-white transition-all hover:bg-[#F97316] active:scale-[0.98] disabled:opacity-60">
              {isPending ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
          <p className="el-3 mt-5 text-center text-[14px] text-[#6E6E73]">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-medium text-[#1D1E20] hover:underline">Inicia sesión</Link>
          </p>
        </div>
      </div>
      <RightPanel />
    </div>
  )
}
