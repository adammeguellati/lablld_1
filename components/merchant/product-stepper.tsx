'use client'

import { useState, useTransition, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { ProductStepLabel } from './product-step-label'
import { ProductStepPublish } from './product-step-publish'
import { ProductStepMockup } from './product-step-mockup'
import { ProductStepShipping } from './product-step-shipping'
import { saveMerchantProductAction, getLabelStatusAction, generateProductMockupAction } from '@/app/(merchant)/products/[id]/actions'
import { publishToShopifyAction } from '@/app/(merchant)/catalog/[slug]/actions'
import { MOCKUP_LIMIT } from '@/lib/limits'
import type { MerchantProduct, Plan, LabelStatus, ThemeLabel } from '@/types'

// SIX steps, not the design's four. The design has no Envío, no Revisión and no
// Publicar; Shopify publishing is a standing keep, so the code's sequence wins
// and only the chrome is redesigned. Each entry carries the design's step-intro
// pattern: an eyebrow, a one-line promise, and a headline.
const STEPS: { label: string; promise: string; headline: string }[] = [
  { label: 'Producto', promise: 'Empecemos por lo tuyo.', headline: 'Ponle tu nombre y tu precio' },
  { label: 'Envío', promise: 'Define cómo llega a tu cliente.', headline: 'Elige la modalidad de envío' },
  { label: 'Etiqueta', promise: 'Tu marca sobre el envase.', headline: 'Sube o diseña tu etiqueta' },
  { label: 'Revisión', promise: 'Revisamos que todo cumpla.', headline: 'Tu etiqueta está en revisión' },
  { label: 'Mockup', promise: 'Míralo antes de venderlo.', headline: 'Genera tu mockup' },
  { label: 'Publicar', promise: 'El último paso.', headline: 'Publica en tu tienda' },
]

interface Props {
  productId: string; productName: string
  dims: { width: number; height: number; unit: string } | null
  canvaUrl: string | null; themeLabels: ThemeLabel[] | null
  merchantId: string; mp: MerchantProduct | null
  plan: Plan | null; wholesalePrice: number | null
  shopDomain: string | null; initialStep: number
  mockupCreditsUsed: number
}

const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors'

export function ProductStepper({ productId, productName, dims, canvaUrl, themeLabels, merchantId, mp: initMp, plan, wholesalePrice, shopDomain, initialStep, mockupCreditsUsed }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(initialStep)
  const [maxStep, setMaxStep] = useState(initialStep)
  const [mpId, setMpId] = useState(initMp?.id ?? null)
  const [labelUrl, setLabelUrl] = useState(initMp?.label_url ?? null)
  const [labelStatus, setLabelStatus] = useState<LabelStatus | null>(initMp?.label_status ?? null)
  const [labelRejectionReason, setLabelRejectionReason] = useState<string | null>(initMp?.label_rejection_reason ?? null)
  const [shopifyProductId, setShopifyProductId] = useState(initMp?.shopify_product_id ?? null)
  const [mockupUrl, setMockupUrl] = useState<string | null>(initMp?.mockup_url ?? null)
  const [mockupCredits, setMockupCredits] = useState(mockupCreditsUsed)
  const [customName, setCustomName] = useState(initMp?.custom_name ?? productName)
  const [retailPrice, setRetailPrice] = useState<number>(initMp?.retail_price ?? 0)
  const [shippingMode, setShippingMode] = useState<'standard' | 'express'>('standard')
  const [error, setError] = useState<string | null>(null)
  const [isPending, start] = useTransition()
  const [isMockupPending, startMockup] = useTransition()

  function goTo(n: number) {
    setStep(n)
    setMaxStep((prev) => Math.max(prev, n))
  }

  function saveStep1() {
    setError(null)
    start(async () => {
      const r = await saveMerchantProductAction(productId, null, customName, retailPrice)
      if (r.error) { setError(r.error); return }
      if (r.mpId) setMpId(r.mpId)
      goTo(2)
    })
  }

  function saveLabel() {
    if (!labelUrl) return
    setError(null)
    start(async () => {
      const r = await saveMerchantProductAction(productId, labelUrl, customName, retailPrice, shippingMode)
      if (r.error) { setError(r.error); return }
      if (r.mpId) setMpId(r.mpId)
      setLabelStatus('approved')
      goTo(5)
    })
  }

  function refreshLabelStatus() {
    if (!mpId) return
    start(async () => {
      const r = await getLabelStatusAction(mpId)
      if (r.error) return
      setLabelStatus(r.labelStatus as LabelStatus | null)
      setLabelRejectionReason(r.labelRejectionReason)
    })
  }

  function generateMockup(force = false) {
    if (!mpId) return
    startMockup(async () => {
      const r = await generateProductMockupAction(mpId, force)
      if (r.error === 'MOCKUP_LIMIT') { setError(`Has alcanzado el límite de ${MOCKUP_LIMIT} mockups este mes.`); return }
      if (r.error) { setError(r.error); return }
      if (r.mockupUrl) setMockupUrl(r.mockupUrl)
      setMockupCredits(r.creditsUsed)
    })
  }

  function publish() {
    const id = mpId
    if (!id) return
    setError(null)
    start(async () => {
      await saveMerchantProductAction(productId, null, customName, retailPrice)
      const r = await publishToShopifyAction(id, productId)
      if ('error' in r) { setError(r.error); return }
      setShopifyProductId('published')
      router.refresh()
    })
  }

  return (
    <div className="rounded-[22px] border border-black/[.08] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,.03)] md:p-10">
      <div className="mb-8 flex items-start">
        {STEPS.map(({ label }, i) => {
          const done = maxStep > i + 1
          const active = step === i + 1
          return (
            <Fragment key={i}>
              <button
                onClick={() => i + 1 < maxStep && setStep(i + 1)}
                disabled={i + 1 >= maxStep}
                className={`flex min-w-0 flex-col items-center gap-1.5 ${i + 1 < maxStep ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[12.5px] font-medium transition-colors ${
                  done ? 'border-[#1D1E20] bg-[#1D1E20] text-white'
                    : active ? 'border-[#1D1E20] text-[#1D1E20]'
                    : 'border-black/15 text-[#AEAEB2]'
                }`}>{done ? '✓' : i + 1}</div>
                <span className={`hidden text-center text-[11px] font-medium leading-tight sm:block ${
                  active ? 'text-[#1D1E20]' : done ? 'text-[#6E6E73]' : 'text-[#AEAEB2]'
                }`}>{label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`mx-1 mt-4 h-px flex-1 ${done ? 'bg-[#1D1E20]' : 'bg-black/10'}`} />
              )}
            </Fragment>
          )
        })}
      </div>

      {/* The design's step intro: PASO n DE 6, a one-line promise, a 38px
          headline. The denominator is STEPS.length so it can never drift from
          the rail above it. */}
      {STEPS[step - 1] && (
        <div className="mb-7">
          <p className="text-[11.5px] font-medium uppercase tracking-[.04em] text-[#86868B]">
            Paso {step} de {STEPS.length}
          </p>
          <p className="mt-2 text-[15px] text-[#6E6E73]">{STEPS[step - 1].promise}</p>
          <h2 className="mt-1 text-[38px] font-normal leading-[1.1] tracking-[-0.008em] text-pretty">
            {STEPS[step - 1].headline}
          </h2>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mb-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      {step === 1 && (
        <div className="space-y-5 max-w-2xl">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Nombre del producto en tu tienda</label>
            <input className={ic} value={customName} onChange={(e) => setCustomName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Precio de venta</label>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:border-gray-400">
              <span className="px-3 py-2.5 text-sm text-gray-400 bg-gray-50 border-r border-gray-200">COP $</span>
              <input type="number" step="1" className="flex-1 px-3 py-2.5 text-sm outline-none" value={retailPrice || ''} onChange={(e) => setRetailPrice(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={saveStep1} disabled={isPending}
              className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-60 transition-colors">
              {isPending ? 'Guardando...' : 'Siguiente →'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <ProductStepShipping mode={shippingMode} onChange={setShippingMode}
          onNext={() => goTo(3)} onBack={() => setStep(1)} />
      )}

      {step === 3 && (
        <ProductStepLabel productName={productName} dims={dims} canvaUrl={canvaUrl}
          themeLabels={themeLabels} labelUrl={labelUrl} merchantId={merchantId}
          productId={productId} isPending={isPending} onLabelChange={setLabelUrl}
          onSubmit={saveLabel} onBack={() => setStep(2)} />
      )}

      {step === 4 && (
        <div className="space-y-5 max-w-2xl">
          {labelStatus === 'pending' && (
            <div className="border border-yellow-200 bg-yellow-50 rounded-xl p-5">
              <p className="font-semibold text-sm text-yellow-800">Tu etiqueta está siendo revisada...</p>
              <p className="text-xs text-yellow-700 mt-1">Esto toma entre 1–2 días hábiles. Haz clic en &quot;Actualizar estado&quot; para ver cambios.</p>
            </div>
          )}
          {labelStatus === 'rejected' && (
            <div className="border border-red-200 bg-red-50 rounded-xl p-5">
              <p className="font-semibold text-sm text-red-800">Etiqueta rechazada</p>
              {labelRejectionReason && <p className="text-xs text-red-700 mt-1">{labelRejectionReason}</p>}
            </div>
          )}
          {labelStatus === 'approved' && (
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold">Verificación automática</p>
                  <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full">Aprobado</span>
                </div>
                {['Resolución ≥ 300 DPI', 'Dimensiones correctas', 'Zona regulatoria intacta', 'Campos requeridos presentes', 'Tamaño < 15MB'].map((c) => (
                  <div key={c} className="flex items-center gap-2 py-1.5 border-t border-gray-100 text-sm">
                    <span className="text-emerald-500 shrink-0 font-bold">✓</span>{c}
                  </div>
                ))}
              </div>
              <p className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 font-medium">
                ✓ Etiqueta aprobada. Lista para el siguiente paso.
              </p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <button onClick={() => setStep(3)} className="border border-gray-200 px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">← Cambiar etiqueta</button>
            <div className="flex gap-2">
              <button onClick={refreshLabelStatus} disabled={isPending}
                className="text-sm border border-gray-200 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition-colors">
                {isPending ? 'Actualizando...' : 'Actualizar estado'}
              </button>
              {labelStatus === 'approved' && (
                <button onClick={() => goTo(5)}
                  className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors">
                  Continuar →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 5 && (
        <ProductStepMockup mpId={mpId} mockupUrl={mockupUrl}
          isPending={isMockupPending} creditsUsed={mockupCredits} creditsLimit={MOCKUP_LIMIT}
          onGenerate={() => generateMockup(false)} onRegenerate={() => generateMockup(true)} onSkip={() => goTo(6)} />
      )}

      {step === 6 && (
        <ProductStepPublish customName={customName} retailPrice={retailPrice}
          wholesalePrice={wholesalePrice} plan={plan} shopDomain={shopDomain}
          shopifyProductId={shopifyProductId} isPending={isPending} onPublish={publish} />
      )}
    </div>
  )
}
