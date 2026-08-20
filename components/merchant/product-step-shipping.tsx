'use client'


interface Props {
  mode: 'standard' | 'express'
  onChange: (mode: 'standard' | 'express') => void
  onNext: () => void
  onBack: () => void
}

const OPTIONS = [
  {
    key: 'standard' as const,
    label: 'Estándar',
    days: '3–7 días hábiles',
    price: 'Precio base por región',
    badge: null,
  },
  {
    key: 'express' as const,
    label: 'Express',
    days: '1–2 días hábiles',
    price: 'Precio base + tarifa express',
    badge: 'RÁPIDO',
  },
]

export function ProductStepShipping({ mode, onChange, onNext, onBack }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">PASO 2</p>
        <h2 className="text-xl font-bold">Modalidad de envío</h2>
        <p className="text-sm text-gray-500 mt-1">
          Selecciona el servicio de entrega para los pedidos de este producto.{' '}
          <a
            href="https://lablld.com/envíos-y-cobertura/envíos-colombia"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 font-semibold hover:underline"
          >
            Ver precios por región en Colombia →
          </a>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {OPTIONS.map((opt) => {
          const selected = mode === opt.key
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              className={`border-2 rounded-xl p-5 text-left transition-colors ${selected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-emerald-500' : 'border-gray-300'}`}>
                  {selected && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                </div>
                <span className="font-bold text-sm">{opt.label}</span>
                {opt.badge && (
                  <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">{opt.badge}</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-2 pl-6">{opt.days}</p>
              <p className="text-xs font-semibold text-emerald-700 pl-6">{opt.price}</p>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="border border-gray-200 px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
          ← Atrás
        </button>
        <button onClick={onNext} className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors">
          Siguiente →
        </button>
      </div>
    </div>
  )
}
