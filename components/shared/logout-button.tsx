'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { logoutAction } from '@/app/(auth)/actions'

interface Props {
  className?: string
  iconOnly?: boolean
}

export function LogoutButton({ className, iconOnly }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function confirm() {
    startTransition(async () => {
      await logoutAction()
      router.push('/login')
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        aria-label="Cerrar sesión"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {!iconOnly && <span>Cerrar sesión</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-gray-900">¿Cerrar sesión?</h2>
              <p className="text-sm text-gray-500">Tu sesión se cerrará en este dispositivo.</p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 h-10 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={isPending}
                className="flex-1 h-10 rounded-full bg-gray-900 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Saliendo...' : 'Cerrar sesión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
