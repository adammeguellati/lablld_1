'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createProduct, connectInventoryItem, getVariantInventoryItemId,
  getFulfillmentServiceHandle, updateVariantFulfillmentService,
} from '@/lib/shopify'
import { redirect } from 'next/navigation'

type PublishResult = { error: string } | { success: true }

export async function publishToShopifyAction(
  merchantProductId: string,
  productId: string
): Promise<PublishResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()
  const [storeRes, mpRes, productRes, merchantRes] = await Promise.all([
    db.from('shopify_stores')
      .select('shop_domain, access_token, fulfillment_service_location_id')
      .eq('merchant_id', user.id).single(),
    db.from('merchant_products').select('custom_name, mockup_url, retail_price, label_status').eq('id', merchantProductId).single(),
    db.from('products').select('name, long_description, images, sku').eq('id', productId).single(),
    db.from('merchants').select('plan').eq('id', user.id).single(),
  ])

  if (!merchantRes.data?.plan) return { error: 'REQUIRES_PLAN' }
  if (!storeRes.data) return { error: 'No tienes una tienda Shopify conectada' }
  if (!mpRes.data || !productRes.data) return { error: 'Producto no encontrado' }
  if (mpRes.data.label_status !== 'approved') return { error: 'La etiqueta debe estar aprobada por el administrador antes de publicar' }
  if (!mpRes.data.retail_price || mpRes.data.retail_price <= 0) return { error: 'Debes ingresar un precio de venta válido antes de publicar' }

  const { shop_domain, access_token, fulfillment_service_location_id } = storeRes.data
  const mp = mpRes.data
  const p = productRes.data

  const fsHandle = await getFulfillmentServiceHandle(shop_domain, access_token)
  if (!fsHandle) return { error: 'No se encontró el fulfillment service LABLLD en Shopify — reconecta la tienda' }

  try {
    const shopifyRes = await createProduct(shop_domain, access_token, {
      title: mp.custom_name || p.name,
      body_html: p.long_description || '',
      vendor: 'LABLLD',
      product_type: '',
      images: mp.mockup_url
        ? [{ src: mp.mockup_url }]
        : p.images?.[0] ? [{ src: p.images[0] }] : [],
      variants: [{
        price: mp.retail_price ? String(mp.retail_price) : '0.00',
        sku: p.sku || merchantProductId,
      }],
    })

    const sp = shopifyRes.product as { id: number; variants: { id: number; inventory_item_id: number }[] }

    if (fulfillment_service_location_id && sp.variants?.[0]?.inventory_item_id) {
      await connectInventoryItem(shop_domain, access_token, sp.variants[0].inventory_item_id, fulfillment_service_location_id).catch(() => {})
    }

    await db.from('merchant_products').update({
      shopify_product_id: String(sp.id),
      shopify_variant_id: sp.variants?.[0]?.id ? String(sp.variants[0].id) : null,
      is_published: true,
    }).eq('id', merchantProductId)

    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al publicar en Shopify.' }
  }
}

export async function reconnectInventoryAction(merchantProductId: string): Promise<PublishResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()
  const [storeRes, mpRes, merchantRes] = await Promise.all([
    db.from('shopify_stores')
      .select('shop_domain, access_token, fulfillment_service_location_id')
      .eq('merchant_id', user.id).single(),
    db.from('merchant_products')
      .select('shopify_product_id, shopify_variant_id, product:products(sku)')
      .eq('id', merchantProductId).single(),
    db.from('merchants').select('plan').eq('id', user.id).single(),
  ])

  if (!merchantRes.data?.plan) return { error: 'REQUIRES_PLAN' }
  if (!storeRes.data) return { error: 'No tienes una tienda Shopify conectada' }
  if (!mpRes.data?.shopify_product_id || !mpRes.data?.shopify_variant_id) {
    return { error: 'Producto no publicado en Shopify' }
  }

  const { shop_domain, access_token, fulfillment_service_location_id } = storeRes.data
  const mp = mpRes.data as unknown as {
    shopify_product_id: string
    shopify_variant_id: string
    product: { sku: string | null }
  }

  const fsHandle = await getFulfillmentServiceHandle(shop_domain, access_token)
  if (!fsHandle) return { error: 'No se encontró el fulfillment service LABLLD en Shopify — reconecta la tienda' }

  try {
    await updateVariantFulfillmentService(
      shop_domain, access_token, mp.shopify_variant_id, fsHandle, mp.product?.sku || merchantProductId
    )

    if (fulfillment_service_location_id) {
      const inventoryItemId = await getVariantInventoryItemId(shop_domain, access_token, mp.shopify_variant_id)
      await connectInventoryItem(shop_domain, access_token, inventoryItemId, fulfillment_service_location_id).catch(() => {})
    }

    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al sincronizar' }
  }
}
