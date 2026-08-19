import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PlanCard } from '@/components/onboarding/plan-card'

export default async function OnboardingPlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const hasPlan = user
    ? (await createAdminClient().from('merchants').select('plan').eq('id', user.id).single()).data?.plan
    : null

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl space-y-8">
        {hasPlan && (
          <Link href="/settings/billing" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            ← Volver a facturación
          </Link>
        )}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Elige tu plan</h1>
          <p className="mt-1 text-sm text-gray-500">Empieza hoy y personaliza tus productos</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <PlanCard
            id="starter"
            name="Esencial"
            price={119000}
            description="Todo lo que necesitas para empezar a vender"
            features={[
              'Acceso completo al catálogo',
              '1 Integración de tienda',
              'Mockups de producto (fondo blanco)',
              'Soporte por email y WhatsApp',
              'Recursos de marketing incluidos',
            ]}
          />
          <PlanCard
            id="plus"
            name="Pro"
            price={219000}
            description="Para marcas que quieren crecer más rápido"
            popular
            disabled
            features={[
              'Todo lo del plan Esencial',
              'Descuento del 18% en todos los productos',
              'Mockups premium con lifestyle',
              'Soporte prioritario',
              'Acceso anticipado a nuevos productos',
            ]}
          />
        </div>
      </div>
    </div>
  )
}
