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
      <h1 className="text-[36px] font-normal leading-[1.12] tracking-[0]">Configuración</h1>

      <div className="mt-6 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#141A2B] text-[17px] font-medium text-white">
          {initials}
        </div>
        <div>
          <p className="text-[17px] font-medium text-[#1D1E20]">{name}</p>
          <p className="text-[13.5px] text-[#86868B]">{user.email}</p>
        </div>
      </div>

      <div className="mt-[22px] rounded-[22px] border border-black/[.08] bg-white p-[22px] shadow-[0_1px_2px_rgba(0,0,0,.03)]">
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
    </div>
  )
}
