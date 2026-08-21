'use server'

import { safeServerClient, safeAdminClient } from '@/lib/supabase/safe'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { isAdmin } from '@/lib/utils'

const CONFIG_ERROR = 'El servicio no está disponible en este momento. Intenta de nuevo más tarde.'

function translateAuthError(msg: string): string {
  if (msg.includes('sending confirmation email')) return 'Error al enviar el correo de confirmación. Intenta de nuevo.'
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'Este correo ya tiene una cuenta registrada.'
  if (msg.includes('Invalid login credentials') || msg.includes('invalid credentials')) return 'Correo o contraseña incorrectos.'
  if (msg.includes('Email not confirmed')) return 'Debes confirmar tu correo antes de iniciar sesión.'
  if (msg.includes('Too many requests')) return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.'
  if (msg.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres.'
  if (msg.includes('Unable to validate email')) return 'Correo electrónico inválido.'
  if (msg.includes('New password should be different')) return 'La nueva contraseña debe ser distinta de la anterior.'
  if (msg.includes('Auth session missing')) return 'Tu enlace expiró. Pide uno nuevo para continuar.'
  if (msg.includes('Invalid path specified in request URL')) return CONFIG_ERROR
  // Unknown messages pass through: signup gating is configured in Supabase Auth
  // and its message arrives here, so a generic fallback would swallow it.
  return msg
}

const RegisterSchema = z.object({
  full_name: z.string().min(2, 'Nombre demasiado corto'),
  email: z.email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

const ForgotPasswordSchema = z.object({
  email: z.email('Email inválido'),
})

const ResetPasswordSchema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm'],
})

const LoginSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
})

export async function registerAction(
  _prevState: { error: string | null; success?: string | null },
  formData: FormData
): Promise<{ error: string | null; success?: string | null }> {
  const parsed = RegisterSchema.safeParse({
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { full_name, email, password } = parsed.data
  const admin = safeAdminClient()
  if (!admin) return { error: CONFIG_ERROR }

  const { count, error: lookupError } = await admin
    .from('merchants')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)

  if (lookupError) return { error: CONFIG_ERROR }
  if (count && count > 0) return { error: 'Este correo ya tiene una cuenta registrada.' }

  const supabase = await safeServerClient()
  if (!supabase) return { error: CONFIG_ERROR }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.lablld.com'
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: {
      data: { full_name, onboarding_completed: false },
      emailRedirectTo: `${appUrl}/api/auth/callback`,
    },
  })

  if (error) {
    const isAlreadyRegistered = error.message.includes('already registered') || error.message.includes('already been registered')
    if (isAlreadyRegistered) {
      const { data: { users } } = await admin.auth.admin.listUsers()
      const orphan = users.find(u => u.email === email)
      if (orphan) {
        const { count: merchantCount } = await admin.from('merchants').select('id', { count: 'exact', head: true }).eq('id', orphan.id)
        if (!merchantCount || merchantCount === 0) {
          await admin.auth.admin.deleteUser(orphan.id)
          return { error: 'Hubo un problema con tu registro anterior. Por favor intenta de nuevo.' }
        }
      }
    }
    return { error: translateAuthError(error.message) }
  }
  if (!data.user) return { error: 'Error al crear usuario' }

  const { error: merchantError } = await admin
    .from('merchants')
    .upsert({ id: data.user.id, email, full_name }, { onConflict: 'id' })

  if (merchantError) {
    await admin.auth.admin.deleteUser(data.user.id)
    if (merchantError.code === '23505') return { error: 'Este correo ya tiene una cuenta registrada.' }
    return { error: 'Error al crear cuenta' }
  }

  if (!data.session) {
    redirect('/login?registered=1')
  }

  redirect('/onboarding/quien-eres')
}

export async function loginAction(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const next = (formData.get('next') as string | null)?.trim() ?? ''
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { email, password } = parsed.data
  const supabase = await safeServerClient()
  if (!supabase) return { error: CONFIG_ERROR }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: translateAuthError(error.message) }

  if (isAdmin(data.user?.email ?? '')) redirect('/admin/dashboard')

  if (next && next.startsWith('/')) redirect(next)

  const admin = safeAdminClient()
  const { count } = (await admin?.from('merchants').select('id', { count: 'exact', head: true }).eq('id', data.user.id)) ?? {}
  if (admin && (!count || count === 0)) {
    await admin.from('merchants').insert({
      id: data.user.id,
      email: data.user.email ?? email,
      full_name: data.user.user_metadata?.full_name ?? email.split('@')[0],
    })
  }

  const onboardingDone = data.user.user_metadata?.onboarding_completed === true
  redirect(onboardingDone ? '/dashboard' : '/onboarding/quien-eres')
}

export async function requestPasswordResetAction(
  _prevState: { error: string | null; sent: boolean },
  formData: FormData
): Promise<{ error: string | null; sent: boolean }> {
  const parsed = ForgotPasswordSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { error: parsed.error.issues[0].message, sent: false }

  const supabase = await safeServerClient()
  if (!supabase) return { error: CONFIG_ERROR, sent: false }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.lablld.com'
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/api/auth/callback?next=/reset-password`,
  })

  // Supabase answers 200 for an address it does not know, so nothing here can
  // reveal whether an account exists — which matters because registration is
  // invite-gated. Any error that does arrive is a real failure (rate limit, SMTP,
  // misconfiguration) and is shown rather than swallowed: reporting "enviado"
  // during an outage leaves the merchant waiting for mail that never comes.
  if (error) return { error: translateAuthError(error.message), sent: false }
  return { error: null, sent: true }
}

export async function resetPasswordAction(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const parsed = ResetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await safeServerClient()
  if (!supabase) return { error: CONFIG_ERROR }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tu enlace expiró. Pide uno nuevo para continuar.' }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { error: translateAuthError(error.message) }

  redirect('/login?reset=1')
}

export async function logoutAction() {
  const supabase = await safeServerClient()
  await supabase?.auth.signOut()
  redirect('/login')
}
