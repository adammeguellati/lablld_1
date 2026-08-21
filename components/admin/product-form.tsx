'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SupplementFactsEditor } from '@/components/admin/supplement-facts-editor'
import { BenefitBlocksEditor } from '@/components/admin/benefit-blocks-editor'
import { ScienceFactsEditor } from '@/components/admin/science-facts-editor'
import { ShippingRatesEditor, type RateInput } from '@/components/admin/shipping-rates-editor'
import { ProductImageUploader } from '@/components/admin/product-image-uploader'
import { ThemeLabelsEditor } from '@/components/admin/theme-labels-editor'
import type { ProductCategory, Plan, SupplementFacts, BenefitBlock, ScienceFact, ThemeLabel } from '@/types'
import { CATEGORY_LABELS, CATEGORY_VALUES, showsSupplementFacts } from '@/lib/product-category'

const FORMATS = [
  { value: 'capsule', label: 'Cápsula' }, { value: 'powder', label: 'Polvo' },
  { value: 'serum', label: 'Sérum' }, { value: 'oil', label: 'Aceite' },
  { value: 'gummy', label: 'Gomita' }, { value: 'liquid', label: 'Líquido' },
  { value: 'cream', label: 'Crema' }, { value: 'solid', label: 'Sólido' },
]
const ICONS = ['vegan', 'non_gmo', 'gluten_free', 'organic', 'halal', 'kosher', 'dairy_free']
const TA = 'w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring'

function S({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-4"><h2 className="font-semibold border-b pb-2">{title}</h2>{children}</section>
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>
}

export function ProductForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<ProductCategory>('supplements')
  const [format, setFormat] = useState('')
  const [tiers, setTiers] = useState<Plan[]>(['starter', 'plus'])
  const [icons, setIcons] = useState<string[]>([])
  const [rates, setRates] = useState<RateInput[]>([])
  const [images, setImages] = useState<string[]>([])
  const [themeLabels, setThemeLabels] = useState<ThemeLabel[]>([])
  const [supplementFacts, setSupplementFacts] = useState<SupplementFacts | null>(null)
  const [benefitBlocks, setBenefitBlocks] = useState<BenefitBlock[]>([])
  const [scienceFacts, setScienceFacts] = useState<ScienceFact[]>([])

  const toggleTier = (t: Plan) => setTiers((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))
  const toggleIcon = (i: string) => setIcons((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))

  async function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const g = (k: string) => (fd.get(k) as string) || undefined
    const n = (k: string) => (fd.get(k) ? Number(fd.get(k)) : undefined)
    const body = {
      name: fd.get('name') as string, slug: g('slug'), sku: g('sku'),
      category, format: format || undefined, available_tiers: tiers, icons,
      base_price: Number(fd.get('base_price')), wholesale_price_usd: n('wholesale_price_usd'),
      stock: fd.get('stock') ? Number(fd.get('stock')) : null,
      price_cop: fd.get('price_cop') ? Number(fd.get('price_cop')) : null,
      suggested_retail_price_cop: fd.get('suggested_retail_price_cop') ? Number(fd.get('suggested_retail_price_cop')) : null,
      shipping_cost_cop: fd.get('shipping_cost_cop') ? Number(fd.get('shipping_cost_cop')) : null,
      label_template_url: g('label_template_url'),
      canva_template_url: g('canva_template_url'),
      label_dimensions: (fd.get('lbl_w') && fd.get('lbl_h'))
        ? { width: Number(fd.get('lbl_w')), height: Number(fd.get('lbl_h')), unit: (fd.get('lbl_unit') as string) || 'mm' }
        : null,
      theme_labels: themeLabels.length > 0 ? themeLabels : undefined,
      short_description: g('short_description'), long_description: g('long_description'),
      ingredients_list: g('ingredients_list'), other_ingredients: g('other_ingredients'),
      suggested_use: g('suggested_use'), warning: g('warning'),
      manufacturer_country: g('manufacturer_country'), shipping_scope: g('shipping_scope'),
      product_weight_g: n('product_weight_g'), gross_weight_g: n('gross_weight_g'),
      fulfillment_fee_cop: n('fulfillment_fee_cop'),
      images,
      mockup_template_id: g('mockup_template_id'),
      mockup_smart_object_uuid: g('mockup_smart_object_uuid'),
      mockup_so_width: n('mockup_so_width'),
      mockup_so_height: n('mockup_so_height'),
      supplement_facts: supplementFacts ?? undefined,
      benefit_blocks: benefitBlocks.length > 0 ? benefitBlocks : undefined,
      science_facts: scienceFacts.length > 0 ? scienceFacts : undefined,
      shipping_rates: rates.map((r) => ({ country: r.country, country_code: r.country_code, rate: Number(r.rate), rate_cop: r.rate_cop ? Number(r.rate_cop) : undefined })),
    }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const j = await res.json(); setError(typeof j.error === 'string' ? j.error : 'Error al crear'); return }
      router.push('/admin/products')
      router.refresh()
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <S title="Imágenes">
        <ProductImageUploader images={images} onChange={setImages} />
      </S>
      <S title="Información básica">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><F label="Nombre *"><Input name="name" required /></F></div>
          <F label="Slug"><Input name="slug" placeholder="nombre-del-producto" /></F>
          <F label="SKU"><Input name="sku" /></F>
          <F label="Categoría *">
            <Select value={category} onValueChange={(v) => setCategory(v as ProductCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORY_VALUES.map((v) => (
                  <SelectItem key={v} value={v}>{CATEGORY_LABELS[v]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
          <F label="Formato">
            <Select value={format} onValueChange={(v) => setFormat(v ?? '')}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>{FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </F>

        </div>
      </S>
      <S title="Precios y tiers">
        <div className="grid grid-cols-2 gap-4">
          <F label="Precio base (USD) *"><Input name="base_price" type="number" step="0.01" min="0.01" required /></F>
          <F label="Precio wholesale (USD)"><Input name="wholesale_price_usd" type="number" step="0.01" min="0" /></F>
          <F label="Precio COP (opcional)"><Input name="price_cop" type="number" step="1" min="0" /></F>
          <F label="Precio sugerido de venta COP"><Input name="suggested_retail_price_cop" type="number" step="1" min="0" placeholder="Vacío = precio COP × 3" /></F>
          <F label="Costo envío COP (opcional)"><Input name="shipping_cost_cop" type="number" step="1" min="0" /></F>
          <F label="Stock (vacío = ilimitado)"><Input name="stock" type="number" step="1" min="0" /></F>
        </div>
        <div className="space-y-2">
          <Label>Tiers con acceso</Label>
          <div className="flex gap-4">
            {(['starter', 'plus'] as Plan[]).map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                <input type="checkbox" checked={tiers.includes(t)} onChange={() => toggleTier(t)} className="rounded" />{t}
              </label>
            ))}
          </div>
        </div>
      </S>
      <S title="Contenido">
        <F label="Descripción corta"><Input name="short_description" /></F>
        <F label="Descripción larga"><textarea name="long_description" rows={4} className={TA} /></F>
      </S>
      <S title="Ingredientes y uso">
        <F label="Lista de ingredientes"><textarea name="ingredients_list" rows={3} className={TA} /></F>
        <F label="Otros ingredientes"><Input name="other_ingredients" /></F>
        <F label="Modo de uso"><Input name="suggested_use" /></F>
        <F label="Advertencia"><textarea name="warning" rows={2} className={TA} /></F>
      </S>
      {/* Supplements only, per Adam ruling 2026-08-21. Any facts already
          stored on a product that has since been recategorised are left in the
          column untouched — the save sends undefined, which the PATCH drops —
          so correcting the category brings them back rather than retyping. */}
      {showsSupplementFacts(category) && (
        <S title="Supplement Facts">
          <SupplementFactsEditor onChange={setSupplementFacts} />
        </S>
      )}
      <S title="Benefit blocks">
        <BenefitBlocksEditor onChange={setBenefitBlocks} />
      </S>
      <S title="Datos científicos">
        <ScienceFactsEditor onChange={setScienceFacts} />
      </S>
      <S title="Logística">
        <div className="grid grid-cols-2 gap-4">
          <F label="País de fabricación"><Input name="manufacturer_country" /></F>
          <F label="Alcance de envío"><Input name="shipping_scope" placeholder="Envíos a Colombia y RD" /></F>
          <F label="Peso neto (g)"><Input name="product_weight_g" type="number" /></F>
          <F label="Peso bruto (g)"><Input name="gross_weight_g" type="number" /></F>
          <F label="Fee de fulfillment (COP)"><Input name="fulfillment_fee_cop" type="number" placeholder="Opcional" /></F>
          <F label="Mockup Template ID"><Input name="mockup_template_id" /></F>
          <F label="Smart Object UUID"><Input name="mockup_smart_object_uuid" /></F>
          <F label="SO Ancho (px)"><Input name="mockup_so_width" type="number" step="1" min="0" /></F>
          <F label="SO Alto (px)"><Input name="mockup_so_height" type="number" step="1" min="0" /></F>
        </div>
      </S>
      <S title="Íconos y certificaciones">
        <div className="flex flex-wrap gap-4">
          {ICONS.map((icon) => (
            <label key={icon} className="flex items-center gap-2 text-sm cursor-pointer capitalize">
              <input type="checkbox" checked={icons.includes(icon)} onChange={() => toggleIcon(icon)} className="rounded" />
              {icon.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
      </S>
      <S title="Etiqueta y plantilla">
        <div className="grid grid-cols-2 gap-4">
          <F label="Ancho etiqueta"><Input name="lbl_w" type="number" step="0.1" min="0" placeholder="100" /></F>
          <F label="Alto etiqueta"><Input name="lbl_h" type="number" step="0.1" min="0" placeholder="75" /></F>
          <F label="Unidad"><Input name="lbl_unit" defaultValue="mm" placeholder="mm" /></F>
        </div>
        <F label="URL plantilla descarga"><Input name="label_template_url" placeholder="https://..." /></F>
        <F label="URL plantilla Canva"><Input name="canva_template_url" placeholder="https://www.canva.com/..." /></F>
        <div className="space-y-2"><Label>Etiquetas de tema</Label><ThemeLabelsEditor onChange={setThemeLabels} /></div>
      </S>
      <S title="Tarifas de envío">
        <ShippingRatesEditor rates={rates} onChange={setRates} />
      </S>
      <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear producto'}</Button>
    </form>
  )
}
