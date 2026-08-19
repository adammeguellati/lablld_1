import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTransaction } from '@/lib/wompi'
import type { Plan } from '@/types'

interface Props {
  searchParams: Promise<{ id?: string; plan?: string; status?: string }>
}

export default async function OnboardingResultadoPage({ searchParams }: Props) {
  const sp = await searchParams
  const txId = sp.id ?? ''
  const plan = sp.plan as Plan | undefined

  if (!txId || !plan || (plan !== 'starter' && plan !== 'plus')) redirect('/onboarding/plan')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let txStatus = sp.status ?? 'PENDING'
  try {
    const tx = await getTransaction(txId)
    txStatus = tx.status
  } catch { /* use URL status as fallback */ }

  if (txStatus === 'APPROVED') {
    const today = new Date()
    const nextBilling = new Date(today)
    nextBilling.setDate(nextBilling.getDate() + 30)
    await createAdminClient().from('merchants').update({
      plan, plan_status: 'active',
      subscription_started_at: today.toISOString(),
      subscription_next_billing_at: nextBilling.toISOString().slice(0, 10),
    }).eq('id', user.id)
    redirect('/dashboard')
  }

  const isPending = txStatus === 'PENDING' || txStatus === 'PROCESSING'

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-4">
      {isPending && <meta httpEquiv="refresh" content="5" />}
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-5">
        {isPending ? (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-3xl animate-pulse">⏳</div>
            <h1 className="text-xl font-semibold text-gray-900">Verificando pago...</h1>
            <p className="text-sm text-gray-500">Estamos confirmando tu pago. Esta página se actualizará automáticamente.</p>
            <Link href={`/onboarding/payment/resultado?plan=${plan}&id=${txId}`}
              className="inline-block text-sm font-semibold text-gray-900 underline">
              Verificar ahora
            </Link>
          </>
        ) : (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center text-3xl">✕</div>
            <h1 className="text-xl font-semibold text-gray-900">Pago no aprobado</h1>
            <p className="text-sm text-gray-500">El pago fue rechazado o hubo un error. Puedes intentarlo de nuevo.</p>
            <Link href={`/onboarding/payment?plan=${plan}`}
              className="block w-full py-3 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors">
              Intentar de nuevo
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
