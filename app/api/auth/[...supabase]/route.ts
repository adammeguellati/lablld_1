import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )
    const { data } = await supabase.auth.exchangeCodeForSession(code)
    const onboardingDone = data.session?.user?.user_metadata?.onboarding_completed === true
    const destination = next !== '/dashboard' ? next : (onboardingDone ? '/dashboard' : '/onboarding/quien-eres')
    return NextResponse.redirect(new URL(destination, requestUrl.origin))
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
