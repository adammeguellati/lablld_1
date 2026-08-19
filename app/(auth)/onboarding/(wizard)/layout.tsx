import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function WizardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (user.user_metadata?.onboarding_completed === true) redirect('/dashboard')

  return <>{children}</>
}
