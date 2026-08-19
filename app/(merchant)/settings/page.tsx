import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SettingsTabs, type Tab } from '@/components/merchant/settings-tabs'

const VALID_TABS: Tab[] = ['general', 'seguridad', 'facturacion', 'tiendas']

interface Props { searchParams: Promise<{ tab?: string; error?: string }> }

export default async function SettingsPage({ searchParams }: Props) {
  const sp = await searchParams
  const initialTab = VALID_TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : 'general'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()
  const [storeRes, merchantRes] = await Promise.all([
    db.from('shopify_stores').select('shop_domain').eq('merchant_id', user.id).maybeSingle(),
    db.from('merchants')
      .select('full_name, plan, pending_plan, plan_status, plan_cancel_at, wompi_payment_source_id, subscription_next_billing_at')
      .eq('id', user.id).single(),
  ])

  const store = storeRes.data
  const merchant = merchantRes.data
  const name = merchant?.full_name ?? user.email ?? ''
  const initials = name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div>
      <h1 className="text-2xl mb-8 tracking-[0]">Configuración</h1>
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center text-white font-semibold text-lg">
          {initials}
        </div>
        <p className="font-semibold text-lg">{name}</p>
      </div>
      <SettingsTabs
        fullName={merchant?.full_name ?? ''}
        email={user.email ?? ''}
        plan={merchant?.plan ?? null}
        pendingPlan={merchant?.pending_plan ?? null}
        planStatus={merchant?.plan_status ?? null}
        planCancelAt={merchant?.plan_cancel_at ?? null}
        hasPaymentMethod={!!merchant?.wompi_payment_source_id}
        nextBillingAt={merchant?.subscription_next_billing_at ?? null}
        shopDomain={store?.shop_domain ?? null}
        initialTab={initialTab}
      />
    </div>
  )
}
