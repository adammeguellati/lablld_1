'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateProduct, updateVariantPrice } from '@/lib/shopify'
import { generateMockup } from '@/lib/sudomock'
import { signLabelUrl, LABEL_FETCH_TTL } from '@/lib/storage'
import type { MerchantProduct } from '@/types'

const MOCKUP_LIMIT = 6

export async function saveMerchantProductAction(
  productId: string,
  labelUrl: string | null,
  customName: string,
  retailPrice: number,
  shippingTier: 'standard' | 'express' = 'standard'
): Promise<{ error: string | null; mpId: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', mpId: null }

  const db = createAdminClient()
  const { data: merchantData } = await db.from('merchants').select('plan').eq('id', user.id).single()
  if (!merchantData?.plan) return { error: 'REQUIRES_PLAN', mpId: null }

  const { data: existing } = await db
    .from('merchant_products')
    .select('id, label_url, shopify_product_id, shopify_variant_id')
    .eq('merchant_id', user.id).eq('product_id', productId).maybeSingle()

  const mp = existing as unknown as Pick<MerchantProduct, 'id' | 'label_url' | 'shopify_product_id' | 'shopify_variant_id'> | null

  if (mp) {
    const update: Record<string, unknown> = { custom_name: customName || null, retail_price: retailPrice || null, shipping_tier: shippingTier }

    if (labelUrl !== null && labelUrl !== mp.label_url) {
      update.label_url = labelUrl
      update.label_status = 'approved'
      update.mockup_url = null
    }

    const { error } = await db.from('merchant_products').update(update).eq('id', mp.id)
    if (error) return { error: error.message, mpId: null }

    if (mp.shopify_product_id) {
      const { data: store } = await db.from('shopify_stores').select('shop_domain, access_token').eq('merchant_id', user.id).single()
      if (store) {
        if (customName) await updateProduct(store.shop_domain, store.access_token, mp.shopify_product_id, { title: customName }).catch(() => {})
        if (retailPrice && mp.shopify_variant_id) await updateVariantPrice(store.shop_domain, store.access_token, mp.shopify_variant_id, retailPrice).catch(() => {})
      }
    }
    return { error: null, mpId: mp.id }
  }

  const { data: newMp, error } = await db.from('merchant_products').insert({
    merchant_id: user.id, product_id: productId,
    label_url: labelUrl || null,
    label_status: labelUrl ? 'approved' : 'pending',
    custom_name: customName || null, retail_price: retailPrice || null,
    shipping_tier: shippingTier,
  }).select('id').single()
  return { error: error?.message ?? null, mpId: newMp?.id ?? null }
}

export async function getLabelStatusAction(
  merchantProductId: string
): Promise<{ error: string | null; labelStatus: string | null; labelRejectionReason: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', labelStatus: null, labelRejectionReason: null }

  const db = createAdminClient()
  const { data, error } = await db
    .from('merchant_products')
    .select('label_status, label_rejection_reason')
    .eq('id', merchantProductId)
    .eq('merchant_id', user.id)
    .single()

  if (error || !data) return { error: error?.message ?? 'No encontrado', labelStatus: null, labelRejectionReason: null }
  return { error: null, labelStatus: data.label_status, labelRejectionReason: data.label_rejection_reason }
}

export async function generateProductMockupAction(
  merchantProductId: string,
  force = false,
): Promise<{ error: string | null; mockupUrl: string | null; creditsUsed: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', mockupUrl: null, creditsUsed: 0 }

  const db = createAdminClient()
  const { data: merchantData } = await db
    .from('merchants')
    .select('plan, mockup_credits_used, mockup_credits_reset_at')
    .eq('id', user.id).single()
  if (!merchantData?.plan) return { error: 'REQUIRES_PLAN', mockupUrl: null, creditsUsed: 0 }

  const now = new Date()
  const resetAt = merchantData.mockup_credits_reset_at ? new Date(merchantData.mockup_credits_reset_at) : null
  let creditsUsed = merchantData.mockup_credits_used ?? 0

  if (!resetAt || resetAt <= now) {
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    await db.from('merchants').update({ mockup_credits_used: 0, mockup_credits_reset_at: nextReset.toISOString() }).eq('id', user.id)
    creditsUsed = 0
  }

  const { data: mp } = await db.from('merchant_products').select('label_url, product_id, mockup_url').eq('id', merchantProductId).eq('merchant_id', user.id).single()
  if (!mp?.label_url) return { error: 'Sin etiqueta', mockupUrl: null, creditsUsed }
  if (mp.mockup_url && !force) return { error: null, mockupUrl: mp.mockup_url, creditsUsed }
  if (creditsUsed >= MOCKUP_LIMIT) return { error: 'MOCKUP_LIMIT', mockupUrl: mp.mockup_url ?? null, creditsUsed }

  const { data: product } = await db.from('products').select('mockup_template_id, mockup_smart_object_uuid, mockup_so_width, mockup_so_height').eq('id', mp.product_id).single()
  if (!product?.mockup_template_id || !product?.mockup_smart_object_uuid) return { error: 'Sin plantilla de mockup configurada', mockupUrl: null, creditsUsed }

  try {
    const labelFetchUrl = (await signLabelUrl(mp.label_url, LABEL_FETCH_TTL)) ?? mp.label_url
    const mockupUrl = await generateMockup(product.mockup_template_id, product.mockup_smart_object_uuid, labelFetchUrl, product.mockup_so_width, product.mockup_so_height)
    const newCredits = creditsUsed + 1
    await Promise.all([
      db.from('merchant_products').update({ mockup_url: mockupUrl }).eq('id', merchantProductId),
      db.from('merchants').update({ mockup_credits_used: newCredits }).eq('id', user.id),
    ])
    return { error: null, mockupUrl, creditsUsed: newCredits }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al generar', mockupUrl: null, creditsUsed }
  }
}
