'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateProduct } from '@/lib/shopify'
import type { MerchantProduct } from '@/types'

// Re-adding a product the merchant deleted, per Adam's ruling of 2026-08-21:
// the previous label is revived, but the merchant is told and gets the choice.
//
// Both paths UPDATE the existing row rather than inserting. The unique
// (merchant_id, product_id) constraint deliberately stays whole — six call sites
// resolve that pair with .maybeSingle() — so a second row is not available even
// when "start blank" is what the merchant wants.
async function reopenMerchantProduct(
  productId: string,
  keepLabel: boolean,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const db = createAdminClient()
  const { data: mp } = await db
    .from('merchant_products')
    .select('id')
    .eq('product_id', productId)
    .eq('merchant_id', user.id)
    .not('deleted_at', 'is', null)
    .maybeSingle()

  if (!mp) return { error: 'Producto no encontrado' }

  const patch: Record<string, unknown> = { deleted_at: null, is_active: true }
  if (!keepLabel) {
    // A clear, not a delete. The row survives so the order history hanging off
    // it survives with it.
    patch.label_url = null
    patch.label_status = 'pending'
    patch.label_rejection_reason = null
    patch.mockup_url = null
  }

  const { error } = await db
    .from('merchant_products')
    .update(patch)
    .eq('id', (mp as { id: string }).id)
    .eq('merchant_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/products')
  revalidatePath(`/products/${productId}`)
  return { error: null }
}

export async function reviveWithPreviousLabelAction(productId: string) {
  return reopenMerchantProduct(productId, true)
}

export async function reviveBlankAction(productId: string) {
  return reopenMerchantProduct(productId, false)
}

// Soft delete, per Adam's ruling of 2026-08-21. order_items references this row
// with ON DELETE RESTRICT, so a hard delete is impossible for any product that
// ever sold and relaxing that FK would rewrite a paid order's history.
export async function softDeleteMerchantProductAction(
  merchantProductId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const db = createAdminClient()

  const { data: mp, error: fetchError } = await db
    .from('merchant_products')
    .select('id, shopify_product_id, merchant_id, deleted_at')
    .eq('id', merchantProductId)
    .eq('merchant_id', user.id)
    .single()

  if (fetchError || !mp) return { error: 'Producto no encontrado' }

  const { error } = await db
    .from('merchant_products')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', merchantProductId)
    .eq('merchant_id', user.id)

  if (error) return { error: error.message }

  // Same treatment toggleMerchantProductAction already gives a deactivated
  // product: leaving the listing live in the merchant's own store while it is
  // gone from here would let a customer buy something we no longer show them.
  const typedMp = mp as unknown as Pick<MerchantProduct, 'id' | 'shopify_product_id' | 'merchant_id'>
  if (typedMp.shopify_product_id) {
    const { data: store } = await db
      .from('shopify_stores')
      .select('shop_domain, access_token')
      .eq('merchant_id', user.id)
      .single()

    if (store) {
      await updateProduct(store.shop_domain, store.access_token, typedMp.shopify_product_id, {
        status: 'draft',
      }).catch(() => {})
    }
  }

  revalidatePath('/products')
  revalidatePath('/catalog')
  return { error: null }
}

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
