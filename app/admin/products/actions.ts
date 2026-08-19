'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateProduct } from '@/lib/shopify'
import { isAdmin } from '@/lib/utils'

export async function toggleProductAction(
  productId: string,
  isActive: boolean,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return { error: 'No autorizado' }

  const db = createAdminClient()

  const { error } = await db
    .from('products')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', productId)

  if (error) return { error: error.message }

  await db.from('merchant_products').update({ is_active: isActive }).eq('product_id', productId)

  const { data: published } = await db
    .from('merchant_products')
    .select('merchant_id, shopify_product_id')
    .eq('product_id', productId)
    .not('shopify_product_id', 'is', null)

  if (published?.length) {
    const merchantIds = [...new Set(published.map((p) => p.merchant_id))]
    const { data: stores } = await db
      .from('shopify_stores')
      .select('merchant_id, shop_domain, access_token')
      .in('merchant_id', merchantIds)

    const storeMap = new Map(stores?.map((s) => [s.merchant_id, s]) ?? [])
    void Promise.all(
      published.map((p) => {
        const store = storeMap.get(p.merchant_id)
        if (!store || !p.shopify_product_id) return
        return updateProduct(store.shop_domain, store.access_token, p.shopify_product_id, {
          status: isActive ? 'active' : 'draft',
        }).catch(() => {})
      }),
    )
  }

  revalidateTag('catalog-products', {})
  revalidatePath('/admin/products')
  return { error: null }
}
