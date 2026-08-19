import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateVariantPrice } from '@/lib/shopify'
import { isAdmin } from '@/lib/utils'
import { z } from 'zod'

const rateSchema = z.object({
  country: z.string().min(1),
  country_code: z.string().length(2),
  rate: z.number().positive(),
  rate_cop: z.number().int().min(0).optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  short_description: z.string().optional(),
  long_description: z.string().optional(),
  base_price: z.number().positive().optional(),
  wholesale_price_usd: z.number().optional(),
  category: z.enum(['supplements', 'cosmeticos', 'cafe']).optional(),
  format: z.string().optional(),
  available_tiers: z.array(z.enum(['starter', 'plus'])).optional(),
  icons: z.array(z.string()).optional(),
  mockup_template_id: z.string().optional(),
  mockup_smart_object_uuid: z.string().optional(),
  mockup_so_width: z.number().int().positive().optional(),
  mockup_so_height: z.number().int().positive().optional(),
  ingredients_list: z.string().optional(),
  other_ingredients: z.string().optional(),
  suggested_use: z.string().optional(),
  warning: z.string().optional(),
  manufacturer_country: z.string().optional(),
  product_weight_g: z.number().optional(),
  gross_weight_g: z.number().optional(),
  fulfillment_fee_cop: z.number().optional(),
  shipping_scope: z.string().optional(),
  supplement_facts: z.any().optional(),
  benefit_blocks: z.array(z.any()).optional(),
  science_facts: z.array(z.any()).optional(),
  images: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  is_new: z.boolean().optional(),
  stock: z.number().int().min(0).nullable().optional(),
  price_cop: z.number().int().min(0).nullable().optional(),
  suggested_retail_price_cop: z.number().int().min(0).nullable().optional(),
  shipping_cost_cop: z.number().int().min(0).nullable().optional(),
  label_dimensions: z.object({ width: z.number(), height: z.number(), unit: z.string() }).nullable().optional(),
  label_template_url: z.string().optional(),
  canva_template_url: z.string().optional(),
  theme_labels: z.array(z.object({ id: z.string(), name: z.string(), preview_url: z.string(), file_url: z.string() })).optional(),
  shipping_rates: z.array(rateSchema).optional(),
})

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return null
  return user
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { shipping_rates, ...productData } = parsed.data
  const db = createAdminClient()

  // Auto-reactivate when stock is replenished
  if (parsed.data.stock !== undefined && parsed.data.stock !== null && parsed.data.stock > 0) {
    productData.is_active = true
  }

  const { data, error } = await db
    .from('products')
    .update({ ...productData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (shipping_rates !== undefined) {
    await db.from('shipping_rates').delete().eq('product_id', id)
    if (shipping_rates.length > 0) {
      const { error: rErr } = await db.from('shipping_rates').insert(
        shipping_rates.map((r) => ({ ...r, product_id: id }))
      )
      if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })
    }
  }

  if (parsed.data.wholesale_price_usd !== undefined) {
    const { data: published } = await db
      .from('merchant_products')
      .select('merchant_id, shopify_variant_id, retail_price')
      .eq('product_id', id)
      .not('shopify_variant_id', 'is', null)
      .not('retail_price', 'is', null)

    if (published?.length) {
      const merchantIds = [...new Set(published.map(p => p.merchant_id))]
      const { data: stores } = await db
        .from('shopify_stores')
        .select('merchant_id, shop_domain, access_token')
        .in('merchant_id', merchantIds)

      const storeMap = new Map(stores?.map(s => [s.merchant_id, s]) ?? [])
      void Promise.all(
        published.map(p => {
          const store = storeMap.get(p.merchant_id)
          if (!store || !p.shopify_variant_id || !p.retail_price) return
          return updateVariantPrice(store.shop_domain, store.access_token, p.shopify_variant_id, p.retail_price).catch(() => {})
        })
      )
    }
  }

  // Cascade reactivation to merchant_products if product was reactivated
  if (productData.is_active === true) {
    await db.from('merchant_products').update({ is_active: true }).eq('product_id', id)
  }

  revalidateTag('catalog-products', {})
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const db = createAdminClient()

  const { data: mps } = await db.from('merchant_products').select('id').eq('product_id', id)
  const mpIds = mps?.map((mp) => mp.id) ?? []
  if (mpIds.length > 0) {
    await db.from('order_items').delete().in('merchant_product_id', mpIds)
  }
  await db.from('shipping_rates').delete().eq('product_id', id)
  await db.from('merchant_products').delete().eq('product_id', id)
  const { error } = await db.from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidateTag('catalog-products', {})
  return NextResponse.json({ success: true })
}
