import type { OrderStatus } from '@/types'

const STEPS = ['Cotización', 'Pago', 'Pagado', 'Producción', 'Enviado', 'Entregado']

const STATUS_STEP: Partial<Record<OrderStatus, number>> = {
  quote_pending: 0,
  payment_pending: 1,
  paid: 2,
  in_production: 3,
  shipped: 4,
  delivered: 5,
}

export function OrderSteps({ status }: { status: OrderStatus }) {
  const current = STATUS_STEP[status] ?? 0

  return (
    <div className="flex items-center overflow-x-auto gap-0 pb-0.5">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={label} className="flex items-center shrink-0">
            {i > 0 && (
              <div className={`h-px w-5 sm:w-8 mx-1 shrink-0 ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {done ? (
                <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              ) : active ? (
                <span className="w-3 h-3 rounded-full bg-gray-900 shrink-0" />
              ) : (
                <span className="w-3 h-3 rounded-full border-2 border-gray-300 shrink-0" />
              )}
              <span className={`text-[10px] sm:text-xs whitespace-nowrap ${
                done ? 'text-emerald-600' : active ? 'text-gray-900 font-semibold' : 'text-gray-400'
              }`}>
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}