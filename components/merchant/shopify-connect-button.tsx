'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ShopifyConnectButtonProps {
  isConnected: boolean
  shopDomain?: string
}

export function ShopifyConnectButton({
  isConnected,
  shopDomain,
}: ShopifyConnectButtonProps) {
  const [shop, setShop] = useState('')

  function connect() {
    if (!shop) return
    const domain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`
    window.location.href = `/api/shopify/auth?shop=${domain}`
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium">{shopDomain}</span>
        </div>
        <Button variant="outline" size="sm">
          Desconectar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="shop">URL de tu tienda Shopify</Label>
        <div className="flex gap-2">
          <Input
            id="shop"
            placeholder="mi-tienda.myshopify.com"
            value={shop}
            onChange={(e) => setShop(e.target.value)}
          />
          <Button onClick={connect}>Conectar</Button>
        </div>
      </div>
    </div>
  )
}
