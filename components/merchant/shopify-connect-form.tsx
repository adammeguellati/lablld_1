'use client'

import { useState } from 'react'

export function ShopifyConnectForm() {
  const [domain, setDomain] = useState('')

  function handleConnect() {
    const raw = domain.trim()
    if (!raw) return
    const shop = raw.includes('.myshopify.com') ? raw : `${raw}.myshopify.com`
    window.location.href = `/api/shopify/auth?shop=${encodeURIComponent(shop)}`
  }

  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-gray-300" />
        <span className="text-sm text-muted-foreground">No conectada</span>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Dominio de tu tienda</label>
        <div className="flex gap-2">
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            placeholder="mitienda.myshopify.com"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="button"
            onClick={handleConnect}
            disabled={!domain.trim()}
            className="shrink-0 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            Conectar
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Puedes ingresar solo el nombre (ej: <span className="font-mono">mitienda</span>) o el dominio completo
        </p>
      </div>
    </div>
  )
}
