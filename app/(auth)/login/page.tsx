'use client'

import { Suspense, useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { loginAction } from '../actions'
import { Logo } from '@/components/shared/logo'

const ic = 'w-full h-12 border border-gray-200 rounded-xl px-4 text-sm outline-none focus:border-gray-400 bg-white transition-colors placeholder:text-gray-400'

function RightPanel() {
  return (
    <div className="hidden lg:block p-4 bg-[#F5F5F7] el-0">
      <div className="h-full rounded-3xl overflow-hidden relative">
        <Image src="/onboarding/primera_foto_-.png" alt="" fill className="object-cover" priority sizes="50vw" />
      </div>
    </div>
  )
}

function LoginForm() {
  const [state, action, isPending] = useActionState(loginAction, { error: null })
  const searchParams = useSearchParams()
  const registered = searchParams.get('registered') === '1'
  const next = searchParams.get('next') ?? ''

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F5F5F7] anim-page">
      <div className="flex flex-col justify-center px-10 md:px-20 py-12">
        <div className="max-w-sm mx-auto w-full">
          <div className="mb-10 el-0"><Logo href="/" /></div>
          <div className="el-1">
            <h1 className="text-4xl text-gray-900 leading-tight mb-2">Bienvenido<br />de vuelta.</h1>
            <p className="text-sm text-gray-400 mb-5">Por favor, introduzca sus datos.</p>
            <hr className="border-gray-300 mb-6" />
          </div>
          {registered && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-5 el-1">
              <p className="text-sm text-emerald-700">Confirma tu correo y luego inicia sesión.</p>
            </div>
          )}
          <form action={action} autoComplete="off" className="space-y-4 el-2">
            {next && <input type="hidden" name="next" value={next} />}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">correo electrónico</label>
              <input name="email" type="email" placeholder="tu@email.com" required autoComplete="off" className={ic} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">contraseña</label>
              <input name="password" type="password" placeholder="tu contraseña" required autoComplete="new-password" className={ic} />
            </div>
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <button type="submit" disabled={isPending}
              className="w-full h-12 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 disabled:opacity-60 active:scale-[0.98] transition-all mt-1">
              {isPending ? 'Entrando...' : 'Iniciar sesión'}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-gray-500 el-3">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-gray-900 font-bold">Regístrate</Link>
          </p>
        </div>
      </div>
      <RightPanel />
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
