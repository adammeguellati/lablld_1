'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordResetAction } from '../actions'
import { AuthShell, authInput, authButton } from '@/components/auth/auth-shell'

export default function ForgotPasswordPage() {
  const [state, action, isPending] = useActionState(requestPasswordResetAction, { error: null, sent: false })

  if (state.sent) {
    return (
      <AuthShell
        heading={<>Revisa<br />tu correo.</>}
        lede="Si esa dirección tiene una cuenta, te enviamos un enlace para crear una contraseña nueva."
        footer={<Link href="/login" className="font-medium text-[#1D1E20] hover:underline">Volver a iniciar sesión</Link>}
      >
        <div className="el-2 rounded-[11px] border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm text-emerald-700">El enlace vence en una hora. Si no llega, revisa tu carpeta de spam.</p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      heading={<>¿Olvidaste<br />tu contraseña?</>}
      lede="Escribe tu correo y te enviamos un enlace para crear una nueva."
      footer={<>¿Ya la recordaste? <Link href="/login" className="font-medium text-[#1D1E20] hover:underline">Inicia sesión</Link></>}
    >
      <form action={action} className="space-y-4 el-2">
        <div>
          <label className="mb-1.5 block text-[12.5px] text-[#86868B]">correo electrónico</label>
          <input name="email" type="email" placeholder="tu@email.com" required autoComplete="username" className={authInput} />
        </div>
        {state.error && <p className="rounded-[11px] bg-[#FBE9E6] px-3.5 py-2.5 text-[13.5px] text-[#C0303B]">{state.error}</p>}
        <button type="submit" disabled={isPending} className={authButton}>
          {isPending ? 'Enviando...' : 'Enviar enlace'}
        </button>
      </form>
    </AuthShell>
  )
}
