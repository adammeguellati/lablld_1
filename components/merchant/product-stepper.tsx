'use client'

import { useState, useTransition, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { ProductStepLabel } from './product-step-label'
import { ProductStepPublish } from './product-step-publish'
import { ProductStepMockup } from './product-step-mockup'
import { ProductStepShipping } from './product-step-shipping'
import { saveMerchantProductAction, getLabelStatusAction, generateProductMockupAction } from '@/app/(merchant)/products/[id]/actions'
import { publishToShopifyAction } from '@/app/(merchant)/catalog/[slug]/actions'
import type { MerchantProduct, Plan, LabelStatus, ThemeLabel } from '@/types'

const STEPS = ['Producto', 'Envío', 'Etiqueta', 'Revisión', 'Mockup', 'Publicar']

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
      if (r.error === 'MOCKUP_LIMIT') { setError('Has alcanzado el límite de 6 mockups este mes.'); return }
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
    <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-10">
      <div className="flex items-start mb-8">
        {STEPS.map((label, i) => {
          const done = maxStep > i + 1
          const active = step === i + 1
          return (
            <Fragment key={i}>
              <button onClick={() => i + 1 < maxStep && setStep(i + 1)} disabled={i + 1 >= maxStep}
                className={`flex flex-col items-center gap-1 min-w-0 ${i + 1 < maxStep ? 'cursor-pointer' : 'cursor-default'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 ${
                  done ? 'bg-emerald-500 border-emerald-500 text-white' :
                  active ? 'border-gray-900 text-gray-900' : 'border-gray-200 text-gray-400'
                }`}>{done ? '✓' : i + 1}</div>
                <span className={`text-[9px] font-medium uppercase text-center leading-tight hidden sm:block ${
                  active ? 'text-gray-900' : done ? 'text-emerald-600' : 'text-gray-400'
                }`}>{label}</span>
              </button>
              {i < 5 && <div className={`flex-1 h-px mt-4 mx-1 ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
            </Fragment>
          )
        })}
      </div>

      {error && <p className="text-sm text-red-600 mb-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      {step === 1 && (
        <div className="space-y-5 max-w-2xl">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">PASO 1</p>
            <h2 className="text-xl font-bold">Configura tu producto</h2>
          </div>
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
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">PASO 4</p>
            <h2 className="text-xl font-bold">Revisión de etiqueta</h2>
            <p className="text-sm text-gray-500 mt-0.5">Verificamos que tu etiqueta cumple todos los requisitos.</p>
          </div>
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
          isPending={isMockupPending} creditsUsed={mockupCredits} creditsLimit={6}
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
