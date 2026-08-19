'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
>

export function ProductDetailTabs(props: TabsProps) {
  const { supplement_facts, science_facts } = props

  return (
    <Tabs defaultValue="description">
      <TabsList>
        <TabsTrigger value="description">Descripción</TabsTrigger>
        <TabsTrigger value="science">Datos científicos</TabsTrigger>
      </TabsList>

      <TabsContent value="description" className="mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {props.long_description && (
              <section>
                <h3 className="font-semibold mb-2">Descripción</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {props.long_description}
                </p>
              </section>
            )}
            {props.ingredients_list && (
              <section>
                <h3 className="font-semibold mb-2">Ingredientes</h3>
                <p className="text-sm text-muted-foreground">{props.ingredients_list}</p>
              </section>
            )}
            {props.other_ingredients && (
              <section>
                <h3 className="font-semibold mb-2">Otros ingredientes</h3>
                <p className="text-sm text-muted-foreground">{props.other_ingredients}</p>
              </section>
            )}
            {props.suggested_use && (
              <section>
                <h3 className="font-semibold mb-2">Modo de uso</h3>
                <p className="text-sm text-muted-foreground">{props.suggested_use}</p>
              </section>
            )}
            {props.warning && (
              <section>
                <h3 className="font-semibold mb-2 text-amber-600">Advertencia</h3>
                <p className="text-sm text-muted-foreground">{props.warning}</p>
              </section>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {props.manufacturer_country && (
                <div>
                  <span className="font-semibold">País de fabricación: </span>
                  <span className="text-muted-foreground">{props.manufacturer_country}</span>
                </div>
              )}
              {props.product_weight_g && (
                <div>
                  <span className="font-semibold">Peso neto: </span>
                  <span className="text-muted-foreground">{props.product_weight_g}g</span>
                </div>
              )}
              {props.gross_weight_g && (
                <div>
                  <span className="font-semibold">Peso bruto: </span>
                  <span className="text-muted-foreground">{props.gross_weight_g}g</span>
                </div>
              )}
            </div>
          </div>
          {supplement_facts && <SupplementFactsPanel facts={supplement_facts} />}
        </div>
      </TabsContent>

      <TabsContent value="science" className="mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {science_facts && science_facts.length > 0 ? (
              <div className="space-y-4">
                {science_facts.map((fact, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-2">
                    <h3 className="font-semibold">{fact.title}</h3>
                    <p className="text-sm text-muted-foreground">{fact.content}</p>
                    {fact.source && (
                      <a
                        href={fact.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary underline"
                      >
                        Ver fuente →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay datos científicos disponibles.
              </p>
            )}
          </div>
          {supplement_facts && <SupplementFactsPanel facts={supplement_facts} />}
        </div>
      </TabsContent>
    </Tabs>
  )
}
