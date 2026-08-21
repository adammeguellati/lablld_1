import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/utils'
import { z } from 'zod'

const shippingRateSchema = z.object({
  country: z.string().min(1),
  country_code: z.string().length(2),
  rate: z.number().positive(),
  rate_cop: z.number().int().min(0).optional(),
})

const supplementFactRowSchema = z.object({
  name: z.string(),
  amount: z.string(),
  dv: z.string().optional(),
  indent: z.boolean().optional(),
})

const supplementFactsSchema = z.object({
  serving_size: z.string(),
  servings_per_container: z.number(),
  rows: z.array(supplementFactRowSchema),
})

const benefitBlockSchema = z.object({
  icon: z.string(),
  title: z.string(),
  description: z.string(),
})

const scienceFactSchema = z.object({
  title: z.string(),
  content: z.string(),
  source: z.string().optional(),
})

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  short_description: z.string().optional(),
  long_description: z.string().optional(),
  base_price: z.number().positive(),
  wholesale_price_usd: z.number().optional(),
  category: z.enum(['supplements', 'cosmeticos', 'cafe']),
  format: z.string().optional(),
  available_tiers: z.array(z.enum(['starter', 'plus'])).optional().default([]),
  images: z.array(z.string()).optional().default([]),
  icons: z.array(z.string()).optional().default([]),
  mockup_template_id: z.string().optional(),
  mockup_smart_object_uuid: z.string().optional(),
  mockup_so_width: z.number().int().positive().optional(),
  mockup_so_height: z.number().int().positive().optional(),
  label_area: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }).optional(),
  ingredients_list: z.string().optional(),
  other_ingredients: z.string().optional(),
  suggested_use: z.string().optional(),
  warning: z.string().optional(),
  manufacturer_country: z.string().optional(),
  product_weight_g: z.number().optional(),
  gross_weight_g: z.number().optional(),
  // .int() to match every sibling *_cop. COP has no minor unit in practice and
  // the other four declarations already said so; this one did not, which is why
  // its column is numeric(12,2) while the others are integer. See 0007.
  fulfillment_fee_cop: z.number().int().min(0).optional(),
  shipping_scope: z.string().optional(),
  supplement_facts: supplementFactsSchema.optional(),
  benefit_blocks: z.array(benefitBlockSchema).optional(),
  science_facts: z.array(scienceFactSchema).optional(),
  is_new: z.boolean().optional().default(false),
  stock: z.number().int().min(0).nullable().optional(),
  price_cop: z.number().int().min(0).nullable().optional(),
  suggested_retail_price_cop: z.number().int().min(0).nullable().optional(),
  shipping_cost_cop: z.number().int().min(0).nullable().optional(),
  label_dimensions: z.object({ width: z.number(), height: z.number(), unit: z.string() }).nullable().optional(),
  label_template_url: z.string().optional(),
  canva_template_url: z.string().optional(),
  theme_labels: z.array(z.object({ id: z.string(), name: z.string(), preview_url: z.string(), file_url: z.string() })).optional(),
  shipping_rates: z.array(shippingRateSchema).optional().default([]),
})

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return null
  return user
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = productSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { shipping_rates, ...productData } = parsed.data
  const supabase = createAdminClient()

  const { data: product, error } = await supabase
    .from('products')
    .insert({ ...productData, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (shipping_rates.length > 0) {
    const rates = shipping_rates.map((r) => ({ ...r, product_id: product.id }))
    const { error: ratesError } = await supabase.from('shipping_rates').insert(rates)
    if (ratesError) return NextResponse.json({ error: ratesError.message }, { status: 500 })
  }

  revalidateTag('catalog-products', {})
  return NextResponse.json(product, { status: 201 })
}
