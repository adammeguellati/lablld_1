'use client'

import { useState, useTransition } from 'react'
import { updatePasswordAction } from '@/app/(merchant)/settings/profile/actions'

export function SecurityForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setMessage(null)
    if (next.length < 8) {
      setMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 8 caracteres.' })
      return
    }
    if (next !== confirm) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' })
      return
    }
    startTransition(async () => {
      const result = await updatePasswordAction(current, next)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' })
        setCurrent('')
        setNext('')
        setConfirm('')
      }
    })
  }

  const inputClass =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 transition-colors'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          Contraseña actual
        </label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="••••••••"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          Nueva contraseña
        </label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          Confirmar nueva contraseña
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repite la nueva contraseña"
          required
          className={inputClass}
        />
      </div>
      {message && (
        <p className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
          {message.text}
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-gray-800 transition-colors disabled:opacity-60"
        >
          {isPending ? 'Actualizando...' : 'Actualizar contraseña'}
        </button>
      </div>
    </form>
  )
}
