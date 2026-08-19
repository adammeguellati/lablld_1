import { redirect } from 'next/navigation'
import { MerchantSidebar } from '@/components/layout/merchant-sidebar'
import { MerchantBottomNav } from '@/components/layout/merchant-bottom-nav'
import { MerchantMobileHeader } from '@/components/layout/merchant-mobile-header'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/utils'

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (isAdmin(user.email)) redirect('/admin/dashboard')

  const admin = createAdminClient()
  const [merchantRes, pendingRes] = await Promise.all([
    admin.from('merchants').select('plan, full_name, is_active').eq('id', user.id).single(),
    admin.from('orders').select('id', { count: 'exact', head: true }).eq('merchant_id', user.id).eq('status', 'payment_pending'),
  ])

  const merchant = merchantRes.data
  if (merchant?.is_active === false) redirect('/suspended')

  const name = merchant?.full_name ?? user.email ?? ''
  const pendingOrderCount = pendingRes.count ?? 0

  return (
    <div className="flex h-screen bg-gray-50">
      <MerchantSidebar merchantName={name} pendingOrderCount={pendingOrderCount} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <MerchantMobileHeader merchantName={name} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
          <div className="max-w-[1400px] mx-auto anim-panel">{children}</div>
        </main>
      </div>
      <MerchantBottomNav pendingOrderCount={pendingOrderCount} />
    </div>
  )
}
