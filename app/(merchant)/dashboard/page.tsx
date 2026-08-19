import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatCOP } from '@/lib/utils'
import { LinkButton } from '@/components/shared/link-button'
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

  return (
    <div className="space-y-8">
      {!merchant?.plan && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-amber-800 text-sm">Activa tu suscripción para comenzar</p>
            <p className="text-xs text-amber-600 mt-0.5">Suscríbete a LABLLD para crear productos, gestionar pedidos y utilizar nuestros servicios de fulfillment.</p>
          </div>
          <Link href="/onboarding/plan" className="shrink-0 text-xs font-semibold bg-amber-700 text-white rounded-full px-4 py-2 hover:bg-amber-800 transition-colors">
            Activar suscripción →
          </Link>
        </div>
      )}
      {isPastDue && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-red-800 text-sm">Tu suscripción ha vencido</p>
            <p className="text-xs text-red-600 mt-0.5">Renueva tu plan para seguir accediendo a todas las funciones.</p>
          </div>
          <Link href="/settings/billing" className="shrink-0 text-xs font-semibold bg-red-700 text-white rounded-full px-4 py-2 hover:bg-red-800 transition-colors">
            Renovar ahora →
          </Link>
        </div>
      )}
      {pendingOrders.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-amber-800 text-sm">{pendingOrders.length === 1 ? '1 orden pendiente de pago' : `${pendingOrders.length} órdenes pendientes de pago`}</p>
            <p className="text-xs text-amber-600 mt-0.5">Realiza el pago para que LABLLD procese tu pedido.</p>
          </div>
          <Link href="/orders" className="shrink-0 text-xs font-semibold bg-amber-700 text-white rounded-full px-4 py-2 hover:bg-amber-800 transition-colors">
            Ver órdenes →
          </Link>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-[30px] leading-tight text-gray-900">¡Hola, {firstName}!</h1>
          <p className="text-[16px] font-semibold text-[#595959] mt-1">Todo lo que necesita tu marca, en un solo lugar.</p>
        </div>
        <LinkButton href={orderUrl} variant="default"
          className="shrink-0 h-10 px-5 text-[13px] font-semibold rounded-full bg-gray-900 hover:bg-gray-800 self-start">
          Ordenar Productos
        </LinkButton>
      </div>

      <div className="grid grid-cols-5 gap-3 h-56">
        {banners.map((b, i) => (
          <Link key={i} href={b.link_url || '#'} className={`relative rounded-2xl overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity ${i === 0 ? 'col-span-3' : 'col-span-2'}`}>
            {b.image_url
              ? <Image src={b.image_url} alt="" fill className="object-cover" sizes={i === 0 ? '60vw' : '40vw'} />
              : <div className="absolute inset-0 bg-gradient-to-br from-teal-200 via-cyan-300 to-sky-400 flex items-end p-4">
                  <span className="text-white/70 text-xs font-semibold">imagen con enlace</span>
                </div>
            }
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-px bg-gray-100 rounded-2xl overflow-hidden">
        {[
          { label: 'INGRESOS TOTALES',  value: formatCOP(totalRevenue) },
          { label: 'TOTAL ÓRDENES',     value: totalOrders.toString() },
          { label: 'PRODUCTOS ACTIVOS', value: activeProducts.toString() },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white px-6 py-6">
            <p className="text-[11px] font-semibold text-[#595959] tracking-widest uppercase mb-3">{label}</p>
            <p className="text-[32px] font-normal text-gray-900 leading-none font-heading tracking-[0]">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <p className="text-[11px] font-semibold text-[#595959] tracking-widest uppercase mb-4">Tus próximos pasos</p>
          <DashboardSteps hasLabel={hasLabel} hasShopify={hasShopify} hasPublished={hasPublished} />
        </div>

        <div>
          <p className="text-[11px] font-semibold text-[#595959] tracking-widest uppercase mb-4">Aprende</p>
          <div className="grid grid-cols-3 gap-3">
            {learn.map((c, i) => (
              <Link key={i} href={c.link_url || '#'} className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity block">
                {c.image_url
                  ? <Image src={c.image_url} alt="" fill className="object-cover" sizes="20vw" />
                  : <div className="absolute inset-0 bg-gray-200 flex items-end p-2">
                      <span className="text-gray-400 text-[10px] font-semibold leading-tight">imagen con enlace</span>
                    </div>
                }
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
