'use client'

import { useActionState } from 'react'
import { requestShopifyConnectionAction } from '@/app/(merchant)/settings/shopify/actions'

const INITIAL = { error: undefined, success: false }

export function ShopifyRequestForm() {
  const [state, action, pending] = useActionState(requestShopifyConnectionAction, INITIAL)

  if (state.success) {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 space-y-1">
        <p className="font-semibold text-emerald-800 text-sm">¡Solicitud enviada!</p>
        <p className="text-sm text-emerald-700">Nuestro equipo te contactará en menos de 8 horas hábiles para completar la conexión.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-1">Conecta tu tienda Shopify</p>
        <p className="text-sm text-gray-500">
          Envíanos el dominio de tu tienda y nuestro equipo preparará un enlace de instalación exclusivo para tu cuenta. Te responderemos en un máximo de 8 horas hábiles.
        </p>
      </div>

      <form action={action} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Dominio de tu tienda</label>
          <div className="flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden focus-within:border-gray-400 transition-colors bg-white">
            <input
              name="subdomain"
              type="text"
              placeholder="mi-tienda"
              required
              className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent min-w-0"
            />
            <span className="px-3 py-2.5 text-sm text-gray-400 bg-gray-50 border-l border-gray-200 shrink-0 whitespace-nowrap">
              .myshopify.com
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Lo encuentras en tu panel de Shopify, en Configuración → Dominios.</p>
        </div>

        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            {pending ? 'Enviando...' : 'Solicitar conexión'}
          </button>
          <span className="text-xs text-gray-400">Respuesta en menos de 8 horas</span>
        </div>
      </form>
    </div>
  )
}