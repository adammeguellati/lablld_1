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

  const fulfillmentNote =
    product.shipping_cost_cop
      ? `Tarifa de cumplimiento: ${formatCOP(product.shipping_cost_cop)} por orden.`
      : minRateCop !== null
        ? `Tarifa de cumplimiento: ${minRateCop === maxRateCop ? formatCOP(minRateCop) : `${formatCOP(minRateCop)} – ${formatCOP(maxRateCop!)}`} por orden.`
        : null

  return (
    <div>
      <nav className="mb-5 flex flex-wrap items-center gap-2 text-[13.5px] text-[#86868B]">
        <Link href="/catalog" className="transition-colors hover:text-[#1D1E20]">Catálogo</Link>
        <span>/</span>
        <span className="text-[#1D1E20]">{product.name}</span>
      </nav>

      <ProductGallery images={product.images} name={product.name} />

      <div className="mt-10 grid grid-cols-1 gap-x-[52px] gap-y-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2.5">
            {showNew && (
              <Badge className="border-0 bg-[#1D1E20] text-white">Nuevo</Badge>
            )}
            {product.shipping_scope && (
              <span className="text-[13.5px] text-[#86868B]">{product.shipping_scope}</span>
            )}
          </div>
          <h1 className="mt-2.5 text-[36px] font-normal leading-[1.12] tracking-[-0.008em] text-pretty">
            {product.name}
          </h1>
          {product.short_description && (
            <p className="mt-3 max-w-2xl text-[15.5px] leading-[1.65] text-[#6E6E73] text-pretty">
              {product.short_description}
            </p>
          )}

          {product.icons && product.icons.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {product.icons.map((icon) => (
                <span key={icon} className="rounded-full border border-black/10 bg-white px-3 py-1 text-[12.5px] text-[#3A3A3D]">
                  {ICON_LABELS[icon] ?? icon}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[18px] border border-black/[.08] bg-white p-5">
          {price !== null ? (
            <>
              <p className="text-[12.5px] uppercase tracking-wide text-[#86868B]">Tu precio por orden</p>
              <p className="mt-1 text-[32px] font-normal leading-none tracking-[-0.008em]">
                {formatCOP(Math.round(price))}
              </p>
              {merchant.plan === 'plus' && (
                <p className="mt-1.5 text-[12.5px] text-[#16A34A]">Incluye descuento Plus (18%)</p>
              )}
            </>
          ) : !merchant?.plan ? (
            <Link
              href="/settings/billing"
              className="inline-flex items-center rounded-[11px] border border-black/10 px-4 py-2.5 text-[14.5px] font-medium transition-colors hover:border-black/25"
            >
              Ver precio →
            </Link>
          ) : (
            <p className="text-[14.5px] text-[#86868B]">Precio en configuración</p>
          )}

          <dl className="mt-4 space-y-2 border-t border-black/[.08] pt-4 text-[14px]">
            {product.price_cop && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[#86868B]">Precio sugerido de venta</dt>
                <dd className="font-medium text-[#1D1E20]">
                  {formatCOP(product.suggested_retail_price_cop ?? Math.round(product.price_cop * 3))}
                </dd>
              </div>
            )}
            {fulfillmentNote && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[#86868B]">Tarifa de cumplimiento</dt>
                <dd className="text-right text-[13px] font-medium text-[#1D1E20]">
                  {fulfillmentNote.replace('Tarifa de cumplimiento: ', '').replace(' por orden.', ' / orden')}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-5 flex flex-col gap-2.5">
            <Link
              href={`/products/${product.id}`}
              className="flex items-center justify-center rounded-[15px] bg-[#1D1E20] px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#F97316]"
            >
              {merchantProduct ? 'Ir a configuración →' : 'Agregar a mis productos'}
            </Link>
            <Link
              href={`/orders/new?productId=${product.id}&sample=1`}
              className="flex items-center justify-center rounded-[15px] border border-black/10 px-6 py-3 text-[15px] font-medium text-[#1D1E20] transition-colors hover:border-black/25"
            >
              Solicitar muestra
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-12">
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
          fulfillmentNote={fulfillmentNote}
        />
      </div>

      {product.benefit_blocks && product.benefit_blocks.length > 0 && (
        <section className="mt-12 rounded-[22px] bg-[#1D1E20] p-10 text-white">
          <h2 className="text-center text-[32px] font-normal tracking-[-0.008em]">Beneficios</h2>
          <div className="mt-9 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {product.benefit_blocks.map((block, i) => (
              <div key={i} className="space-y-2 text-center">
                <div className="text-4xl">{block.icon}</div>
                <p className="text-[17px] font-medium">{block.title}</p>
                <p className="text-[14.5px] leading-[1.6] text-white/70">{block.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="mt-10 border-t border-black/[.08] pt-5 text-[12.5px] leading-[1.7] text-[#AEAEB2]">
        {DISCLAIMER}
      </p>
    </div>
  )
}
