'use client'

import { useState } from 'react'
import { SupplementFactsPanel } from '@/components/merchant/supplement-facts-panel'
import type { Product } from '@/types'

type TabsProps = Pick<
  Product,
  | 'long_description'
  | 'ingredients_list'
  | 'other_ingredients'
  | 'manufacturer_country'
  | 'product_weight_g'
  | 'gross_weight_g'
  | 'suggested_use'
  | 'warning'
  | 'science_facts'
  | 'supplement_facts'
> & { fulfillmentNote?: string | null }

// Three edge-to-edge tabs, per the design: Resumen | Detalles | Entrega. Every
// field the previous two-tab version rendered is still rendered, redistributed
// rather than dropped: Resumen keeps the prose, Detalles keeps composition and
// measurements, and Entrega is new prose from SCREENS.md section 2.
const TABS = [
  { k: 'overview', label: 'Resumen' },
  { k: 'details', label: 'Detalles' },
  { k: 'delivery', label: 'Entrega' },
] as const

type TabKey = (typeof TABS)[number]['k']

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[19px] font-normal text-[#1D1E20]">{title}</p>
      <div className="mt-3 text-[15.5px] leading-[1.65] text-[#6E6E73] text-pretty">{children}</div>
    </div>
  )
}

export function ProductDetailTabs({ fulfillmentNote, ...props }: TabsProps) {
  const [tab, setTab] = useState<TabKey>('overview')
  const { supplement_facts, science_facts } = props

  return (
    <div>
      <div className="flex items-center gap-[38px] border-b border-black/[.12]">
        {TABS.map(({ k, label }) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`-mb-px border-b-[2.5px] pb-3 text-[16px] transition-colors ${
              tab === k ? 'border-[#2F6FE0] text-[#1D1E20]' : 'border-transparent text-[#AEAEB2] hover:text-[#6E6E73]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-y-9 gap-x-[52px] pb-2.5 pt-9 lg:grid-cols-3">
          <div className="space-y-8">
            {props.long_description && <Block title="Descripción">{props.long_description}</Block>}
            {props.suggested_use && <Block title="Modo de uso">{props.suggested_use}</Block>}
          </div>
          <div className="space-y-8">
            {props.warning && <Block title="Advertencia">{props.warning}</Block>}
            {science_facts && science_facts.length > 0 && (
              <Block title="Datos científicos">
                <div className="space-y-4">
                  {science_facts.map((fact, i) => (
                    <div key={i}>
                      <p className="text-[15.5px] text-[#1D1E20]">{fact.title}</p>
                      <p className="mt-1">{fact.content}</p>
                      {fact.source && (
                        <a href={fact.source} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[13.5px] text-[#2F6FE0] hover:underline">
                          Ver fuente →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </Block>
            )}
          </div>
          {supplement_facts && <SupplementFactsPanel facts={supplement_facts} />}
        </div>
      )}

      {tab === 'details' && (
        <div className="grid grid-cols-1 gap-y-9 gap-x-[52px] pb-2.5 pt-9 lg:grid-cols-3">
          <div className="space-y-8">
            {props.ingredients_list && <Block title="Ingredientes">{props.ingredients_list}</Block>}
            {props.other_ingredients && <Block title="Otros ingredientes">{props.other_ingredients}</Block>}
          </div>
          <div className="space-y-8">
            <Block title="Ficha técnica">
              <dl className="space-y-1.5">
                {props.manufacturer_country && (
                  <div className="flex justify-between gap-4">
                    <dt>País de fabricación</dt>
                    <dd className="text-[#1D1E20]">{props.manufacturer_country}</dd>
                  </div>
                )}
                {props.product_weight_g && (
                  <div className="flex justify-between gap-4">
                    <dt>Peso neto</dt>
                    <dd className="text-[#1D1E20]">{props.product_weight_g} g</dd>
                  </div>
                )}
                {props.gross_weight_g && (
                  <div className="flex justify-between gap-4">
                    <dt>Peso bruto</dt>
                    <dd className="text-[#1D1E20]">{props.gross_weight_g} g</dd>
                  </div>
                )}
              </dl>
            </Block>
          </div>
          {supplement_facts && <SupplementFactsPanel facts={supplement_facts} />}
        </div>
      )}

      {tab === 'delivery' && (
        <div className="grid grid-cols-1 gap-y-9 gap-x-[52px] pb-2.5 pt-9 lg:grid-cols-3">
          <Block title="Producción">
            Preparamos tu orden apenas confirmamos el pago. Para órdenes de más de 100 unidades
            el tiempo de producción es de 12 días hábiles.
          </Block>
          <Block title="Envío">
            <p>Nacional en 3–5 días hábiles una vez despachada la orden.</p>
            {fulfillmentNote && <p className="mt-2">{fulfillmentNote}</p>}
            <a
              href="https://lablld.com/env%C3%ADos-y-cobertura/env%C3%ADos-colombia"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-[14.5px] text-[#2F6FE0] hover:underline"
            >
              Ver precios por región en Colombia →
            </a>
          </Block>
          <Block title="Dropshipping">
            Enviamos directamente a tu cliente final con tu marca en el paquete, sin que
            mantengas inventario.
          </Block>
        </div>
      )}
    </div>
  )
}
