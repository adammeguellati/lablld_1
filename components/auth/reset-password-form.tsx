'use client'

import { useActionState } from 'react'
import { resetPasswordAction } from '@/app/(auth)/actions'
import { authInput, authButton } from './auth-shell'

export function ResetPasswordForm() {
  const [state, action, isPending] = useActionState(resetPasswordAction, { error: null })

  return (
    <form action={action} className="space-y-4 el-2">
      <div>
        <label className="mb-1.5 block text-[12.5px] text-[#86868B]">contraseña nueva</label>
        <input name="password" type="password" placeholder="mínimo 8 caracteres" required minLength={8}
          autoComplete="new-password" className={authInput} />
      </div>
      <div>
        <label className="mb-1.5 block text-[12.5px] text-[#86868B]">confirma la contraseña</label>
        <input name="confirm" type="password" placeholder="repite la contraseña" required minLength={8}
          autoComplete="new-password" className={authInput} />
      </div>
      {state.error && <p className="rounded-[11px] bg-[#FBE9E6] px-3.5 py-2.5 text-[13.5px] text-[#C0303B]">{state.error}</p>}
      <button type="submit" disabled={isPending} className={authButton}>
        {isPending ? 'Guardando...' : 'Guardar contraseña'}
      </button>
    </form>
  )
}
