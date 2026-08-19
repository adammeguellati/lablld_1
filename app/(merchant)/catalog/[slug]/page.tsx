import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { ProductGallery } from '@/components/merchant/product-gallery'
import { ProductDetailTabs } from '@/components/merchant/product-detail-tabs'
import { calculateMerchantPrice, formatCOP, isProductNew } from '@/lib/utils'
import type { Product, Merchant } from '@/types'

const DISCLAIMER =
  'Aviso: Tenga en cuenta que el producto real puede variar ligeramente con respecto a las imágenes mostradas en nuestro sitio web. Pueden existir pequeñas variaciones en el empaque y el contenido, como el color, el diseño o la textura, entre los diferentes lotes de producción. Estas diferencias no afectan la calidad ni la funcionalidad del producto.'

const ICON_LABELS: Record<string, string> = {
  vegan: '🌱 Vegano',
  non_gmo: '✓ Non-GMO',
  gluten_free: '🌾 Sin Gluten',
  organic: '🌿 Orgánico',
  halal: '☪ Halal',
  kosher: '✡ Kosher',
  dairy_free: '🥛 Sin Lácteos',
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
  const [productRes, merchantRes] = await Promise.all([
    db.from('products').select('*, shipping_rates(*)').eq(isUuid ? 'id' : 'slug', slug).eq('is_active', true).single(),
    db.from('merchants').select('plan').eq('id', user.id).single(),
  ])

  if (!productRes.data) notFound()

  const product = productRes.data as unknown as Product
  const merchant = merchantRes.data as unknown as Pick<Merchant, 'plan'>

  const { data: merchantProduct } = await db
    .from('merchant_products')
    .select('id')
    .eq('merchant_id', user.id)
    .eq('product_id', product.id)
    .maybeSingle()

  const price = merchant?.plan && product.price_cop
    ? calculateMerchantPrice(product.price_cop, merchant.plan)
    : null
  const showNew = product.is_new || isProductNew(product.created_at)

  const shippingRates = (product.shipping_rates ?? []) as { rate_cop: number | null }[]
  const rateCops = shippingRates.map((r) => r.rate_cop).filter((v): v is number => v !== null)
  const minRateCop = rateCops.length ? Math.min(...rateCops) : null
  const maxRateCop = rateCops.length ? Math.max(...rateCops) : null

  return (
    <div className="max-w-6xl mx-auto">
      <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-2 flex-wrap">
        <Link href="/catalog" className="hover:text-foreground transition-colors">
          Catálogo
        </Link>
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 mb-10 lg:mb-14">
        <ProductGallery images={product.images} name={product.name} />

        <div className="space-y-4">
          {showNew && (
            <Badge className="bg-emerald-500 text-white border-0">NEW</Badge>
          )}
          <h1 className="text-3xl font-bold leading-tight">{product.name}</h1>
          {product.shipping_scope && (
            <p className="text-sm text-muted-foreground">{product.shipping_scope}</p>
          )}
          {product.short_description && (
            <p className="text-muted-foreground">{product.short_description}</p>
          )}
          <div className="py-1 space-y-3">
            {price !== null ? (
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                  Tu precio por orden
                </p>
                <p className="text-3xl font-bold">{formatCOP(Math.round(price))}</p>
                {merchant.plan === 'plus' && (
                  <p className="text-xs text-emerald-600 mt-1">Incluye descuento Plus (18%)</p>
                )}
              </div>
            ) : !merchant?.plan ? (
              <Link
                href="/settings/billing"
                className="inline-block border rounded-md px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Ver precio →
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">Precio en configuración</p>
            )}
            <div className="border rounded-md divide-y text-sm">
              {product.price_cop && (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-muted-foreground">Precio sugerido de venta</span>
                  <span className="font-semibold">{formatCOP(product.suggested_retail_price_cop ?? Math.round(product.price_cop * 3))}</span>
                </div>
              )}
              {product.shipping_cost_cop ? (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-muted-foreground">Tarifa de cumplimiento</span>
                  <span className="font-medium text-xs">{formatCOP(product.shipping_cost_cop)} / orden</span>
                </div>
              ) : minRateCop !== null ? (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-muted-foreground">Tarifa de cumplimiento</span>
                  <span className="font-medium text-xs">
                    {minRateCop === maxRateCop
                      ? formatCOP(minRateCop)
                      : `${formatCOP(minRateCop)} – ${formatCOP(maxRateCop!)}`}
                    {' '}/ orden
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-muted-foreground">Costo de envío</span>
                <a href="https://lablld.com/env%C3%ADos-y-cobertura/env%C3%ADos-colombia" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Ver precios por región en Colombia →</a>
              </div>
            </div>
          </div>
          {product.icons && product.icons.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {product.icons.map((icon) => (
                <span key={icon} className="text-xs border rounded-full px-3 py-1">
                  {ICON_LABELS[icon] ?? icon}
                </span>
              ))}
            </div>
          )}
          <div className="pt-1 flex flex-wrap gap-2 items-start">
            <Link
              href={`/products/${product.id}`}
              className="inline-flex items-center justify-center rounded-md bg-gray-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              {merchantProduct ? 'Ir a configuración →' : 'Agregar a mis productos'}
            </Link>
            <Link
              href={`/orders/new?productId=${product.id}&sample=1`}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 text-gray-700 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Solicitar Muestra
            </Link>
          </div>
          <div className="bg-muted/50 border rounded-md p-3 text-xs text-muted-foreground leading-relaxed">
            {DISCLAIMER}
          </div>
        </div>
      </div>

      <div className="mb-14">
        <ProductDetailTabs
          long_description={product.long_description}
          ingredients_list={product.ingredients_list}
          other_ingredients={product.other_ingredients}
          manufacturer_country={product.manufacturer_country}
          product_weight_g={product.product_weight_g}
          gross_weight_g={product.gross_weight_g}
          suggested_use={product.suggested_use}
          warning={product.warning}
          science_facts={product.science_facts}
          supplement_facts={product.supplement_facts}
        />
      </div>

      {product.benefit_blocks && product.benefit_blocks.length > 0 && (
        <section className="bg-gray-900 text-white rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Beneficios</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {product.benefit_blocks.map((block, i) => (
              <div key={i} className="text-center space-y-2">
                <div className="text-4xl">{block.icon}</div>
                <h3 className="font-semibold">{block.title}</h3>
                <p className="text-sm text-gray-300">{block.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
