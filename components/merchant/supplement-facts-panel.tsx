import type { SupplementFacts } from '@/types'

interface Props {
  facts: SupplementFacts
}

export function SupplementFactsPanel({ facts }: Props) {
  return (
    <div className="border-4 border-black p-3 text-sm font-sans max-w-xs">
      <h3 className="text-2xl font-black leading-none mb-1">Datos del Suplemento</h3>
      <div className="border-b border-black pb-1 mb-1 text-xs">
        Tamaño de porción {facts.serving_size}
      </div>
      <div className="border-b-8 border-black pb-1 mb-1 text-xs">
        {facts.servings_per_container} porciones por envase
      </div>
      <div className="flex justify-between text-xs font-bold border-b-4 border-black pb-0.5 mb-0.5">
        <span>Cantidad por porción</span>
        <span>% Valor Diario*</span>
      </div>
      {(facts.rows ?? []).map((row, i) => (
        <div
          key={i}
          className={`flex justify-between text-xs border-b border-gray-300 py-0.5 ${
            row.indent ? 'pl-4' : ''
          }`}
        >
          <span className={row.indent ? '' : 'font-semibold'}>
            {row.name} {row.amount}
          </span>
          <span>{row.dv ?? ''}</span>
        </div>
      ))}
      <p className="text-xs mt-2 text-gray-500">
        * Los porcentajes del Valor Diario están basados en una dieta de 2.000 calorías.
      </p>
    </div>
  )
}
