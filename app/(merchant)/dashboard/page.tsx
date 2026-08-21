import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatCOP } from '@/lib/utils'
import { DashboardSteps } from '@/components/merchant/dashboard-steps'

interface BannerItem { image_url: string; link_url: string }
interface LearnItem  { image_url: string; link_url: string }
interface DashboardSettings {
  banners: [BannerItem, BannerItem]
  learn: [LearnItem, LearnItem, LearnItem]
  order_button_url: string
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()
  const [merchantRes, ordersRes, mpRes, storeRes, settingsRes, activeProductsRes] = await Promise.all([
    db.from('merchants').select('full_name, plan, plan_status').eq('id', user.id).single(),
    db.from('orders').select('id, status, order_items(unit_price, quantity)').eq('merchant_id', user.id),
    db.from('merchant_products').select('label_url, label_status, shopify_product_id').eq('merchant_id', user.id),
    db.from('shopify_stores').select('id').eq('merchant_id', user.id).maybeSingle(),
    Promise.resolve(db.from('platform_settings').select('value').eq('key', 'dashboard').maybeSingle()).catch(() => ({ data: null })),
    db.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])

  const merchant  = merchantRes.data
  const allOrders = ordersRes.data ?? []
  const mps       = mpRes.data ?? []
  const settings  = settingsRes.data?.value as DashboardSettings | null

  const firstName     = merchant?.full_name?.split(' ')[0] ?? 'Merchant'
  const totalOrders   = allOrders.length
  type OrderWithItems = { id: string; status: string; order_items: { unit_price: number; quantity: number }[] }
  const totalRevenue = (allOrders as unknown as OrderWithItems[])
    .filter(o => ['paid', 'in_production', 'shipped', 'delivered'].includes(o.status))
    .reduce((s, o) => s + o.order_items.reduce((si, i) => si + (i.unit_price ?? 0) * i.quantity, 0), 0)
  const activeProducts = activeProductsRes.count ?? 0

  const isPastDue = merchant?.plan_status === 'past_due'
  const pendingOrders = allOrders.filter(o => o.status === 'payment_pending' || o.status === 'payment_failed')

  const hasLabel     = mps.some(mp => mp.label_url)
  const hasShopify   = !!storeRes.data
  const hasPublished = mps.some(mp => mp.shopify_product_id)

  const banners = settings?.banners ?? [{ image_url: '', link_url: '#' }, { image_url: '', link_url: '#' }]
  const learn   = settings?.learn   ?? [{ image_url: '', link_url: '#' }, { image_url: '', link_url: '#' }, { image_url: '', link_url: '#' }]
  const orderUrl = settings?.order_button_url ?? '/catalog'

  const alerts = [
    !merchant?.plan && {
      tone: 'warn' as const,
      title: 'Activa tu suscripción para comenzar',
      body: 'Suscríbete a LABLLD para crear productos, gestionar pedidos y utilizar nuestros servicios de fulfillment.',
      href: '/onboarding/plan',
      cta: 'Activar suscripción →',
    },
    isPastDue && {
      tone: 'stop' as const,
      title: 'Tu suscripción ha vencido',
      body: 'Renueva tu plan para seguir accediendo a todas las funciones.',
      href: '/settings/billing',
      cta: 'Renovar ahora →',
    },
    pendingOrders.length > 0 && {
      tone: 'warn' as const,
      title: pendingOrders.length === 1 ? '1 orden pendiente de pago' : `${pendingOrders.length} órdenes pendientes de pago`,
      body: 'Realiza el pago para que LABLLD procese tu pedido.',
      href: '/orders',
      cta: 'Ver órdenes →',
    },
  ].filter(Boolean) as { tone: 'warn' | 'stop'; title: string; body: string; href: string; cta: string }[]

  return (
    <div>
      {alerts.length > 0 && (
        <div className="mb-[22px] flex flex-col gap-2.5">
          {alerts.map((a) => (
            <div
              key={a.title}
              className={`flex flex-col justify-between gap-3 rounded-[14px] border px-5 py-4 sm:flex-row sm:items-center ${
                a.tone === 'stop'
                  ? 'border-[#C0303B]/[.14] bg-[#FBE9E6]'
                  : 'border-[#B4690E]/[.14] bg-[#FDEFE0]'
              }`}
            >
              <div>
                <p className={`text-[15px] font-medium ${a.tone === 'stop' ? 'text-[#C0303B]' : 'text-[#B4690E]'}`}>{a.title}</p>
                <p className="mt-0.5 text-[13.5px] text-[#6E6E73]">{a.body}</p>
              </div>
              <Link
                href={a.href}
                className={`flex-none rounded-full px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 ${
                  a.tone === 'stop' ? 'bg-[#C0303B]' : 'bg-[#B4690E]'
                }`}
              >
                {a.cta}
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-[36px] font-normal leading-[1.12] tracking-[0]">¡Hola, {firstName}!</h1>
          <p className="mt-1 text-[15px] text-[#6E6E73]">Todo lo que necesita tu marca, en un solo lugar.</p>
        </div>
        <Link
          href={orderUrl}
          className="flex flex-none items-center gap-2.5 rounded-[15px] bg-[#1D1E20] px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#F97316]"
        >
          Ordenar productos
        </Link>
      </div>

      {/* Admin-configurable, from platform_settings.dashboard. Kept exactly as
          it was fed; only the frame changed. */}
      <div className="mt-[22px] grid h-56 grid-cols-5 gap-3.5">
        {banners.map((b, i) => (
          <Link
            key={i}
            href={b.link_url || '#'}
            className={`relative overflow-hidden rounded-[5px] bg-[#EDEDEF] transition-opacity hover:opacity-90 ${i === 0 ? 'col-span-3' : 'col-span-2'}`}
          >
            {b.image_url ? (
              <Image src={b.image_url} alt="" fill className="object-cover" sizes={i === 0 ? '60vw' : '40vw'} />
            ) : (
              <div className="absolute inset-0 flex items-end p-4">
                <span className="text-[12px] font-medium text-[#AEAEB2]">Imagen con enlace</span>
              </div>
            )}
          </Link>
        ))}
      </div>

      <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {[
          { label: 'Ingresos totales', value: formatCOP(totalRevenue), color: '#1D1E20' },
          { label: 'Total órdenes', value: totalOrders.toString(), color: '#1D5EA8' },
          { label: 'Productos activos', value: activeProducts.toString(), color: '#16A34A' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex h-[112px] flex-col justify-between rounded-[14px] border border-black/[.08] bg-white p-5">
            <span className="text-[12px] text-[#86868B]">{label}</span>
            <span className="self-end text-[32px] font-normal leading-none tracking-[-0.02em]" style={{ color }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-[22px] grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <div className="rounded-[22px] border border-black/[.08] bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]">
          <p className="mb-4 text-[15px] font-medium text-[#6E6E73]">Tus próximos pasos</p>
          <DashboardSteps hasLabel={hasLabel} hasShopify={hasShopify} hasPublished={hasPublished} />
        </div>

        <div className="rounded-[22px] border border-black/[.08] bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]">
          <p className="mb-4 text-[15px] font-medium text-[#6E6E73]">Aprende</p>
          <div className="grid grid-cols-3 gap-3.5">
            {learn.map((c, i) => (
              <Link
                key={i}
                href={c.link_url || '#'}
                className="relative block aspect-[3/4] overflow-hidden rounded-[5px] bg-[#EDEDEF] transition-opacity hover:opacity-90"
              >
                {c.image_url ? (
                  <Image src={c.image_url} alt="" fill className="object-cover" sizes="20vw" />
                ) : (
                  <div className="absolute inset-0 flex items-end p-2">
                    <span className="text-[10.5px] font-medium leading-tight text-[#AEAEB2]">Imagen con enlace</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
