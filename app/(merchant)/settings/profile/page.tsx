import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProfileForm } from '@/components/merchant/profile-form'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()
  const { data: merchant } = await db
    .from('merchants')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const initials = (merchant?.full_name ?? user.email ?? '')
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-8">Mi Perfil</h1>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center text-white font-semibold text-lg">
          {initials}
        </div>
        <p className="font-semibold text-lg">{merchant?.full_name ?? '—'}</p>
      </div>

      <ProfileForm
        fullName={merchant?.full_name ?? ''}
        email={user.email ?? ''}
      />
    </div>
  )
}
