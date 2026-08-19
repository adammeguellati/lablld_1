import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlanPriceCOP } from '@/lib/wompi'
import { formatCOP } from '@/lib/utils'
import { WompiPayButton } from './pay-button'
import type { Plan } from '@/types'

const planLabels: Record<Plan, string> = {
  starter: 'Esencial',
  plus: 'Pro',
}

export default async function OnboardingPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const { plan } = await searchParams
  if (plan !== 'starter' && plan !== 'plus') redirect('/onboarding/plan')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: merchant } = await admin
    .from('merchants')
    .select('plan')
    .eq('id', user.id)
    .single()

  if (merchant?.plan) redirect('/dashboard')

  const price = getPlanPriceCOP(plan)

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-4">
        <Link href="/onboarding/plan" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          ← Volver a planes
        </Link>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Confirmar suscripción</h1>
            <p className="text-sm text-gray-500 mt-1">
              Plan {planLabels[plan]} · {formatCOP(price)}/mes
            </p>
          </div>
          <WompiPayButton plan={plan} />
        </div>
      </div>
    </div>
  )
}
