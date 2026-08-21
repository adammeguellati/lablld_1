import Link from 'next/link'
import { safeServerClient } from '@/lib/supabase/safe'
import { AuthShell } from '@/components/auth/auth-shell'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

// The recovery link lands on /api/auth/callback, which exchanges the code for a
// session and forwards here. No session means the link was already used, has
// expired, or the page was opened directly.
export default async function ResetPasswordPage() {
  const supabase = await safeServerClient()
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } }

  if (!data.user) {
    return (
      <AuthShell
        heading={<>Ese enlace<br />ya no sirve.</>}
        lede="Los enlaces de recuperación vencen en una hora y solo se pueden usar una vez."
        footer={<Link href="/login" className="font-medium text-[#1D1E20] hover:underline">Volver a iniciar sesión</Link>}
      >
        <Link href="/forgot-password" className="el-2 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#1D1E20] text-[15px] font-medium text-white transition-all hover:bg-[#F97316]">
          Pedir un enlace nuevo
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      heading={<>Crea tu<br />contraseña nueva.</>}
      lede={`Vas a cambiar la contraseña de ${data.user.email}.`}
    >
      <ResetPasswordForm />
    </AuthShell>
  )
}
