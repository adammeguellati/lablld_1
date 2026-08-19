import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SuspendedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  async function logout() {
    'use server'
    const sb = await import('@/lib/supabase/server').then((m) => m.createClient())
    await sb.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="w-full max-w-sm space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">Cuenta suspendida</h1>
        <p className="text-sm text-gray-500">
          Tu cuenta ha sido suspendida temporalmente. Contacta a soporte si crees que esto es un error.
        </p>
      </div>
      <form action={logout}>
        <button type="submit" className="text-sm text-gray-500 hover:text-gray-700 underline cursor-pointer">
          Cerrar sesión
        </button>
      </form>
    </div>
  )
}
