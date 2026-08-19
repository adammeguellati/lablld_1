'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateProduct } from '@/lib/shopify'
import type { MerchantProduct } from '@/types'

export async function toggleMerchantProductAction(
  merchantProductId: string,
  isActive: boolean,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const db = createAdminClient()

  const { data: mp, error: fetchError } = await db
    .from('merchant_products')
    .select('id, shopify_product_id, merchant_id')
    .eq('id', merchantProductId)
    .eq('merchant_id', user.id)
    .single()

  if (fetchError || !mp) return { error: 'Producto no encontrado' }

  const { error } = await db
    .from('merchant_products')
    .update({ is_active: isActive })
    .eq('id', merchantProductId)

  if (error) return { error: error.message }

  const typedMp = mp as unknown as Pick<MerchantProduct, 'id' | 'shopify_product_id' | 'merchant_id'>

  if (typedMp.shopify_product_id) {
    const { data: store } = await db
      .from('shopify_stores')
      .select('shop_domain, access_token')
      .eq('merchant_id', user.id)
      .single()

    if (store) {
      await updateProduct(store.shop_domain, store.access_token, typedMp.shopify_product_id, {
        status: isActive ? 'active' : 'draft',
      }).catch(() => {})
    }
  }

  revalidatePath('/products')
  return { error: null }
}
