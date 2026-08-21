'use client'

interface Props {
  mpId: string | null
  mockupUrl: string | null
  isPending: boolean
  creditsUsed: number
  creditsLimit: number
  onGenerate: () => void
  onRegenerate: () => void
  onSkip: () => void
}

export function ProductStepMockup({ mpId, mockupUrl, isPending, creditsUsed, creditsLimit, onGenerate, onRegenerate, onSkip }: Props) {
  const remaining = creditsLimit - creditsUsed
  const limitReached = remaining <= 0

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mt-0.5">Crea una imagen 3D de tu producto con tu etiqueta.</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
          limitReached ? 'bg-red-50 text-red-600' : creditsUsed >= creditsLimit - 2 ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'
        }`}>
          {remaining} de {creditsLimit} renders restantes
        </span>
      </div>

      {mockupUrl ? (
        <div className="space-y-4">
          <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-emerald-800 mb-3">✓ Mockup generado</p>
            <div className="aspect-square w-full max-w-xs mx-auto rounded-lg overflow-hidden border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mockupUrl} alt="Mockup del producto" className="w-full h-full object-contain" />
            </div>
            <a href={mockupUrl} download target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-gray-900 underline hover:text-gray-600">
              Descargar imagen →
            </a>
          </div>
          {limitReached ? (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              Has alcanzado el límite de {creditsLimit} mockups este mes. Se renueva el próximo mes.
            </p>
          ) : (
            <button onClick={onRegenerate} disabled={isPending}
              className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors">
              {isPending ? 'Generando...' : `Regenerar mockup (${remaining} restante${remaining !== 1 ? 's' : ''})`}
            </button>
          )}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl p-6 space-y-4 text-center">
          <p className="text-4xl">🎨</p>
          <p className="font-semibold text-gray-800">Tu etiqueta está lista</p>
          <p className="text-sm text-gray-500">Genera un mockup 3D fotorrealista de tu producto con tu etiqueta aplicada.</p>
          {limitReached ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              Has alcanzado el límite de {creditsLimit} mockups este mes. Se renueva el próximo mes.
            </p>
          ) : (
            <>
              <button onClick={onGenerate} disabled={isPending || !mpId}
                className="w-full bg-gray-900 text-white py-3 rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-60 transition-colors">
                {isPending ? 'Generando...' : 'Generar Mockup →'}
              </button>
              {/* The design promises "Intentos ilimitados hasta que te guste".
                  The meter is real and monthly, so the chip above states the
                  remaining count before it is hit, not only in the error. Both
                  numbers come from the MOCKUP_LIMIT the server enforces. */}
              <p className="text-xs text-gray-400">Se renueva el primer día de cada mes.</p>
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <span />
        <button onClick={onSkip} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
          {mockupUrl ? 'Continuar →' : 'Omitir por ahora →'}
        </button>
      </div>
    </div>
  )
}
