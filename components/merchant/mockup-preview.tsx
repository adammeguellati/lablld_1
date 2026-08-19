'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/loading'

interface MockupPreviewProps {
  merchantProductId: string
  mockupUrl: string | null
}

export function MockupPreview({ merchantProductId, mockupUrl }: MockupPreviewProps) {
  const [url, setUrl] = useState(mockupUrl)
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    try {
      const res = await fetch('/api/mockups/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_product_id: merchantProductId }),
      })
      const data = await res.json()
      if (data.mockup_url) setUrl(data.mockup_url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Mockup del producto" className="w-full rounded-lg" />
      ) : (
        <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
          <p className="text-sm text-muted-foreground">Sin mockup generado</p>
        </div>
      )}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <Button onClick={generate} variant="outline" className="w-full">
          {url ? 'Regenerar mockup' : 'Generar mockup'}
        </Button>
      )}
    </div>
  )
}
