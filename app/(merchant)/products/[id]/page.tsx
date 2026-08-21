import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProductStepper } from '@/components/merchant/product-stepper'
import { ProductRevivePrompt } from '@/components/merchant/product-revive-prompt'
import { signLabelUrl } from '@/lib/storage'
import { ArrowLeft } from 'lucide-react'
import type { MerchantProduct, Product } from '@/types'

interface Props { params: Promise<{ id: string }> }

function getInitialStep(mp: MerchantProduct | null): number {
  if (!mp) return 1
  if (!mp.label_url) return 3
  if (mp.label_status !== 'approved') return 4
  if (!mp.shopify_product_id) return 5
  return 6
}

export default async function ProductPersonalizePage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()
  const [productRes, planRes, mpRes, storeRes] = await Promise.all([
    db.from('products').select('id, name, wholesale_price_usd, label_dimensions, canva_template_url, theme_labels, mockup_template_id').eq('id', id).single(),
    db.from('merchants').select('plan').eq('id', user.id).single(),
    db.from('merchant_products').select('*').eq('product_id', id).eq('merchant_id', user.id).is('deleted_at', null).maybeSingle(),
    db.from('shopify_stores').select('shop_domain').eq('merchant_id', user.id).maybeSingle(),
  ])

  if (productRes.error || !productRes.data) notFound()
  if (!planRes.data?.plan) redirect('/settings/billing')

  const creditsRes = await Promise.resolve(
    db.from('merchants').select('mockup_credits_used').eq('id', user.id).single()
  ).catch(() => ({ data: null }))
  const mockupCreditsUsed = (creditsRes?.data as { mockup_credits_used?: number } | null)?.mockup_credits_used ?? 0

  const product = productRes.data as unknown as Product
  const mp = mpRes.data as unknown as MerchantProduct | null

  // The live row is filtered by deleted_at, so a product the merchant deleted is
  // invisible here while still being found by saveMerchantProductAction, which
  // would silently revive it. That asymmetry is where the choice belongs.
  // Only asked when there is a stored label to reuse.
  let revive: { labelUrl: string; isPdf: boolean } | null = null
  if (!mp) {
    const { data: deleted } = await db
      .from('merchant_products')
      .select('label_url')
      .eq('product_id', id).eq('merchant_id', user.id)
      .not('deleted_at', 'is', null)
      .maybeSingle()
    const storedUrl = (deleted as { label_url: string | null } | null)?.label_url ?? null
    if (storedUrl) {
      const signed = await signLabelUrl(storedUrl)
      if (signed) revive = { labelUrl: signed, isPdf: storedUrl.split('?')[0].toLowerCase().endsWith('.pdf') }
    }
  }

  return (
    <div>
      <Link href="/products" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5">
        <ArrowLeft className="h-4 w-4" /> Mis Productos
      </Link>
      <div className="mb-6">
        <p className="text-xs text-gray-400 mb-1">Mis Productos → Agregar producto</p>
        <h1 className="text-2xl font-bold">Agregar producto</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configura tu etiqueta, genera el mockup y publica en Shopify</p>
      </div>
      {revive ? (
        <ProductRevivePrompt
          productId={product.id}
          productName={product.name}
          labelUrl={revive.labelUrl}
          isPdf={revive.isPdf}
        />
      ) : (
      <ProductStepper
        productId={product.id}
        productName={product.name}
        dims={product.label_dimensions}
        canvaUrl={product.canva_template_url}
        themeLabels={product.theme_labels}
        merchantId={user.id}
        mp={mp}
        plan={planRes.data?.plan ?? null}
        wholesalePrice={product.wholesale_price_usd}
        shopDomain={storeRes.data?.shop_domain ?? null}
        initialStep={getInitialStep(mp)}
        mockupCreditsUsed={mockupCreditsUsed}
      />
      )}
    </div>
  )
}
