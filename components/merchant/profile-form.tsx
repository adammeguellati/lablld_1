'use client'

import { useState, useTransition } from 'react'
import { updateProfileAction } from '@/app/(merchant)/settings/profile/actions'
import { SecurityForm } from '@/components/merchant/security-form'

type Tab = 'personal' | 'direcciones' | 'facturacion' | 'seguridad'

interface Props {
  fullName: string
  email: string
}

export function ProfileForm({ fullName, email }: Props) {
  const [tab, setTab] = useState<Tab>('personal')
  const [name, setName] = useState(fullName)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const firstName = name.split(' ')[0] ?? ''
  const lastName = name.split(' ').slice(1).join(' ')

  function handleSave() {
    startTransition(async () => {
      await updateProfileAction(name)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'personal', label: 'Personal' },
    { key: 'direcciones', label: 'Direcciones' },
    { key: 'facturacion', label: 'Facturación' },
    { key: 'seguridad', label: 'Seguridad' },
  ]

  return (
    <div>
      <div className="flex gap-1 mb-8 border-b border-gray-100">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'personal' && (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Nombre completo
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setName(`${e.target.value} ${lastName}`.trim())}
                placeholder="Nombre"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 transition-colors"
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setName(`${firstName} ${e.target.value}`.trim())}
                placeholder="Apellido"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-gray-800 transition-colors disabled:opacity-60"
            >
              {saved ? '✓ Guardado' : isPending ? 'Guardando...' : 'GUARDAR'}
            </button>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Eliminación de cuenta</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Esta acción no se puede deshacer.
                </p>
              </div>
              <button className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-full px-4 py-2 hover:border-red-200 hover:text-red-600 transition-colors">
                Eliminar cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'direcciones' && (
        <div className="text-center py-16 text-gray-400 text-sm">
          Próximamente
        </div>
      )}

      {tab === 'facturacion' && (
        <div className="text-center py-16 text-gray-400 text-sm">
          <p>Ve a la página de{' '}
            <a href="/settings/billing" className="underline text-gray-600 hover:text-gray-900">
              facturación
            </a>
          </p>
        </div>
      )}

      {tab === 'seguridad' && <SecurityForm />}
    </div>
  )
}
