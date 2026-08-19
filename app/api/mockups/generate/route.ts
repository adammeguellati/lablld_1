import { NextResponse, type NextRequest } from 'next/server'
import { generateMockup } from '@/lib/dynamic-mockups'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { merchant_product_id } = await request.json()
  if (!merchant_product_id) return NextResponse.json({ error: 'Missing merchant_product_id' }, { status: 400 })

  const db = createAdminClient()
  const { data: mp } = await db
    .from('merchant_products')
    .select('label_url, product_id')
    .eq('id', merchant_product_id)
    .eq('merchant_id', user.id)
    .single()

  if (!mp?.label_url) return NextResponse.json({ error: 'Missing label' }, { status: 400 })

  const { data: product } = await db
    .from('products')
    .select('mockup_template_id, mockup_smart_object_uuid')
    .eq('id', mp.product_id)
    .single()

  if (!product?.mockup_template_id || !product?.mockup_smart_object_uuid) {
    return NextResponse.json({ error: 'Missing mockup template' }, { status: 400 })
  }

  const mockupUrl = await generateMockup(product.mockup_template_id, product.mockup_smart_object_uuid, mp.label_url)
  await db.from('merchant_products').update({ mockup_url: mockupUrl }).eq('id', merchant_product_id)
  return NextResponse.json({ mockup_url: mockupUrl })
}
