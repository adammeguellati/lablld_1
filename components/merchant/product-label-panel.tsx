'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, ExternalLink, Check, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LabelUploader } from '@/components/merchant/label-uploader'
import { ThemeLabelSelector } from '@/components/merchant/theme-label-selector'
import { PublishToShopifyButton } from '@/components/merchant/publish-to-shopify-button'
import { saveMerchantProductAction, generateProductMockupAction } from '@/app/(merchant)/products/[id]/actions'
import type { MerchantProduct, ThemeLabel } from '@/types'

interface ProductInfo {
  id: string
  label_dimensions: { width: number; height: number; unit: string } | null
  label_template_url: string | null
  canva_template_url: string | null
  theme_labels: ThemeLabel[] | null
  mockup_template_id: string | null
}
interface Props {
  product: ProductInfo
  mp: MerchantProduct | null
  userId: string
  shopifyData: { shopDomain: string; shopifyProductId: string | null } | null
}

export function ProductLabelPanel({ product, mp, userId, shopifyData }: Props) {
  const router = useRouter()
  const [isSaving, startSave] = useTransition()
  const [isMockup, startMockup] = useTransition()
  const [selectedUrl, setSelectedUrl] = useState<string | null>(mp?.label_url ?? null)
  const [mockupUrl, setMockupUrl] = useState<string | null>(mp?.mockup_url ?? null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [mockupError, setMockupError] = useState<string | null>(null)

  const isApproved = mp?.label_status === 'approved'

  function handleSave() {
    if (!selectedUrl) return
    setSaved(false)
    startSave(async () => {
      const result = await saveMerchantProductAction(product.id, selectedUrl, mp?.custom_name ?? '', mp?.retail_price ?? 0)
      if (result.error) { setError(result.error); return }
      setSaved(true)
      setMockupUrl(null)
      router.refresh()
    })
  }

  function handleGenerateMockup() {
    if (!mp?.id) return
    setMockupError(null)
    startMockup(async () => {
      const result = await generateProductMockupAction(mp.id)
      if (result.error) { setMockupError(result.error); return }
      if (result.mockupUrl) setMockupUrl(result.mockupUrl)
    })
  }

  return (
    <div className="space-y-6">
      {(product.label_dimensions || product.label_template_url || product.canva_template_url) && (
        <div className="border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-sm">1. Diseña tu etiqueta</h2>
          {product.label_dimensions && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm inline-flex gap-2">
              <span className="text-gray-500">Dimensiones:</span>
              <span className="font-medium">{product.label_dimensions.width} × {product.label_dimensions.height} {product.label_dimensions.unit}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {product.label_template_url && (
              <a href={product.label_template_url} download className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
                <Download className="h-4 w-4" /> Descargar plantilla
              </a>
            )}
            {product.canva_template_url && (
              <a href={product.canva_template_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
                <ExternalLink className="h-4 w-4" /> Editar en Canva
              </a>
            )}
          </div>
        </div>
      )}

      <div className="border rounded-xl p-4 space-y-4">
        <h2 className="font-semibold text-sm">2. Sube tu etiqueta</h2>
        <ThemeLabelSelector options={product.theme_labels ?? []} selected={selectedUrl} onChange={setSelectedUrl} />
        <LabelUploader merchantId={userId} productId={product.id} currentUrl={selectedUrl} onUpload={setSelectedUrl} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
            <Check className="h-4 w-4" /> Etiqueta enviada a revisión
          </div>
        )}
        <Button onClick={handleSave} disabled={!selectedUrl || isSaving} size="sm">
          {isSaving ? 'Enviando...' : 'Enviar para aprobación'}
        </Button>
      </div>
      {mp?.label_url && (
        <div className="border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-sm">3. Estado de la etiqueta</h2>
          {mp.label_status === 'rejected' && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
              <p className="font-medium">Etiqueta rechazada</p>
              {mp.label_rejection_reason && <p className="mt-0.5 text-xs">{mp.label_rejection_reason}</p>}
            </div>
          )}
          {mp.label_status === 'pending' && <p className="text-sm bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-yellow-700">Tu etiqueta está en revisión.</p>}
          {isApproved && <p className="text-sm bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-emerald-700 font-medium">✓ Etiqueta aprobada</p>}
        </div>
      )}
      {isApproved && (
        <div className="border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-sm">4. Publicar en Shopify</h2>
          {!shopifyData ? (
            <p className="text-sm text-gray-500"><a href="/settings/shopify" className="underline hover:text-gray-900">Conecta tu tienda Shopify</a> para publicar.</p>
          ) : mp ? (
            <PublishToShopifyButton merchantProductId={mp.id} productId={product.id} shopifyProductId={shopifyData.shopifyProductId} shopDomain={shopifyData.shopDomain} />
          ) : null}
        </div>
      )}

      {isApproved && product.mockup_template_id && (
        <div className="border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-sm">5. Mockup 3D</h2>
          {mockupUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mockupUrl} alt="Mockup 3D" className="w-full max-w-xs rounded-xl border object-contain bg-gray-50 p-2" />
              <div className="flex gap-2">
                <a href={mockupUrl} download className="inline-flex items-center gap-1.5 text-sm border rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"><Download className="h-3.5 w-3.5" /> Descargar</a>
                <a href={mockupUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800"><ExternalLink className="h-3.5 w-3.5" /> Ver completo</a>
              </div>
            </>
          ) : (
            <>
              {mockupError && <p className="text-sm text-red-600">{mockupError}</p>}
              <Button variant="outline" size="sm" onClick={handleGenerateMockup} disabled={isMockup} className="gap-2">
                <Sparkles className="h-4 w-4" />{isMockup ? 'Generando...' : 'Generar mockup 3D'}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
