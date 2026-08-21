'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { publishToShopifyAction, reconnectInventoryAction } from '@/app/(merchant)/catalog/[slug]/actions'
import { toast } from 'sonner'

interface Props {
  merchantProductId: string
  productId: string
  shopifyProductId: string | null
  shopDomain: string
}

export function PublishToShopifyButton({ merchantProductId, productId, shopifyProductId, shopDomain }: Props) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  if (shopifyProductId) {
    function handleReconnect() {
      startTransition(async () => {
        const result = await reconnectInventoryAction(merchantProductId)
        if ('error' in result) toast.error(result.error)
        else toast.success('Sincronizado correctamente. Los próximos pedidos se enrutarán a LABLLD.')
      })
    }

    return (
      <div className="flex flex-col gap-2">
        <a
          href={`https://${shopDomain}/admin/products/${shopifyProductId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm border rounded-md px-4 py-2 hover:bg-muted transition-colors"
        >
          Ver en Shopify →
        </a>
        <button
          onClick={handleReconnect}
          disabled={pending}
          className="text-xs text-muted-foreground underline hover:text-foreground disabled:opacity-50 transition-colors text-left"
        >
          {pending ? 'Sincronizando...' : 'Sincronizar fulfillment con Shopify'}
        </button>
      </div>
    )
  }

  function handlePublish() {
    startTransition(async () => {
      const result = await publishToShopifyAction(merchantProductId, productId)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Publicado en tu tienda Shopify.')
        router.refresh()
      }
    })
  }

  return (
    <button
      onClick={handlePublish}
      disabled={pending}
      className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Publicando...' : 'Publicar en Shopify'}
    </button>
  )
}
