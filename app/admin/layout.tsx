import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/utils'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Defence in depth, deliberately duplicating proxy.ts:39-45. Until this
  // existed the entire admin page gate rested on the proxy matcher alone, so
  // narrowing that one regex would have opened every admin page at once.
  if (!user) redirect('/login')
  if (!isAdmin(user.email)) redirect('/dashboard')

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header userEmail={user.email} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
