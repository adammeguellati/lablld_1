'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ShopifyConnectForm } from './shopify-connect-form'
import { PlanSwitcher } from './plan-switcher'
import { CancelSubscriptionButton } from './cancel-subscription-button'
import { ChangePaymentForm } from './change-payment-form'
import { SecurityForm } from './security-form'
import { disconnectShopifyAction } from '@/app/(merchant)/settings/shopify/actions'
import { updateProfileAction } from '@/app/(merchant)/settings/profile/actions'
import { formatCOP, formatDate } from '@/lib/utils'
import type { Plan } from '@/types'

export type Tab = 'general' | 'seguridad' | 'facturacion' | 'tiendas'
interface Props {
  fullName: string; email: string
  plan: Plan | null; pendingPlan: Plan | null; planStatus: string | null; planCancelAt: string | null
  hasPaymentMethod: boolean; nextBillingAt: string | null
  shopDomain: string | null; initialTab?: Tab
}
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700', past_due: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-600',
}
const STATUS_LABELS: Record<string, string> = { active: 'Activo', past_due: 'Pago vencido', cancelled: 'Cancelado' }

export function SettingsTabs({ fullName, email, plan, pendingPlan, planStatus, planCancelAt, hasPaymentMethod, nextBillingAt, shopDomain, initialTab = 'general' }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [name, setName] = useState(fullName)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const tabs: { key: Tab; label: string }[] = [
    { key: 'general', label: 'General' }, { key: 'seguridad', label: 'Seguridad' },
    { key: 'facturacion', label: 'Facturación' }, { key: 'tiendas', label: 'Tiendas' },
  ]

  function handleSave() {
    startTransition(async () => {
      await updateProfileAction(name)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const firstName = name.split(' ')[0] ?? ''
  const lastName = name.split(' ').slice(1).join(' ')
  const ic = 'w-full rounded-[11px] border border-black/10 px-3.5 py-2.5 text-[14.5px] outline-none transition-colors focus:border-black/25'

  return (
    <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 lg:gap-12">
      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:w-52 sm:shrink-0 sm:flex-col sm:px-0 sm:pb-0 sm:pt-1">
        {tabs.map(({ key, label }) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`shrink-0 whitespace-nowrap rounded-[10px] px-3 py-2.5 text-left text-[15px] transition-colors sm:w-full ${
              tab === key ? 'bg-[#F2F2F7] font-medium text-[#1D1E20]' : 'text-[#6E6E73] hover:bg-black/[.04] hover:text-[#1D1E20]'
            }`}>{label}
          </button>
        ))}
      </nav>

      <div className="flex-1 min-w-0 max-w-xl">
        {tab === 'general' && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Nombre completo</label>
              <div className="flex gap-3">
                <input type="text" value={firstName} onChange={(e) => setName(`${e.target.value} ${lastName}`.trim())} placeholder="Nombre" className={ic} />
                <input type="text" value={lastName} onChange={(e) => setName(`${firstName} ${e.target.value}`.trim())} placeholder="Apellido" className={ic} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Correo electrónico</label>
              <input type="email" value={email} disabled className="w-full border border-gray-100 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
            </div>
            <div className="flex justify-end">
              <button onClick={handleSave} disabled={isPending} className="bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-gray-800 transition-colors disabled:opacity-60">
                {saved ? '✓ Guardado' : isPending ? 'Guardando...' : 'GUARDAR'}
              </button>
            </div>
          </div>
        )}

        {tab === 'seguridad' && <SecurityForm />}

        {tab === 'facturacion' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Suscripción</span>
                {plan ? (
                  planStatus && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[planStatus] ?? 'bg-gray-100 text-gray-600'}`}>{STATUS_LABELS[planStatus] ?? planStatus}</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Sin plan</span>
                )}
              </div>
              {plan ? (
                <>
                  <PlanSwitcher currentPlan={plan} pendingPlan={pendingPlan} />
                  {nextBillingAt && <p className="text-xs text-gray-400">Próxima renovación: {formatDate(nextBillingAt)}</p>}
                </>
              ) : (
                <div className="max-w-sm">
                  <div className="rounded-xl border-2 border-gray-900 p-5 space-y-4">
                    <div>
                      <p className="font-bold text-gray-900 text-lg">Esencial</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{formatCOP(119000)}<span className="text-sm font-normal text-gray-400">/mes</span></p>
                    </div>
                    <ul className="space-y-1.5">
                      {['Acceso completo al catálogo', '1 Integración de tienda', 'Mockups de producto', 'Soporte por email y WhatsApp', 'Recursos de marketing'].map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-emerald-500 font-bold shrink-0">✓</span>{f}
                        </li>
                      ))}
                    </ul>
                    <Link href="/onboarding/payment?plan=starter" className="block w-full text-center py-2.5 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 transition-colors">
                      Contratar Esencial
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Método de pago</p>
                {hasPaymentMethod && <ChangePaymentForm />}
              </div>
              {hasPaymentMethod ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-7 bg-gray-100 rounded flex items-center justify-center text-xs font-bold text-gray-500">CARD</div>
                  <p className="text-sm text-gray-700">Tarjeta guardada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">No tienes tarjeta guardada.</p>
                  <ChangePaymentForm />
                </div>
              )}
            </div>

            {planStatus !== 'cancelled' && plan && <CancelSubscriptionButton cancelAt={planCancelAt ?? null} />}
          </div>
        )}

        {tab === 'tiendas' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-[14px] border border-black/[.08] p-5">
              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                <svg viewBox="0 0 24 24" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <rect width="24" height="24" fill="#96BF48" rx="5"/>
                  <path fill="white" d="M17.2 8h-1.4c-.1-1.5-1.2-2.8-2.8-2.8-1.6 0-2.7 1.3-2.8 2.8H8.8C8.4 8 8 8.4 8 8.8L6.8 16c-.1.5.3.9.8.9h8.8c.5 0 .9-.4.8-.9L16 8.8c0-.4-.4-.8-.8-.8zM13 6.3c.7 0 1.3.7 1.4 1.7h-2.8c.1-1 .7-1.7 1.4-1.7zm-1.1 6.4c-.6-.2-.9-.4-.9-.8 0-.4.4-.7 1.1-.7.5 0 .9.1 1.2.3l.3-.9c-.4-.2-.8-.3-1.4-.3-1.1 0-2 .6-2 1.6 0 .8.6 1.3 1.4 1.6.7.3 1 .5 1 .9s-.4.7-1.1.7c-.6 0-1.2-.2-1.6-.5l-.3.9c.4.3 1 .5 1.7.5 1.3 0 2.1-.6 2.1-1.7 0-.8-.5-1.3-1.5-1.6z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-900">Shopify</p>
                {shopDomain ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-xs text-emerald-700 font-medium">{shopDomain}</span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">Ninguna tienda conectada</p>
                )}
              </div>
              {shopDomain ? (
                <form action={disconnectShopifyAction}>
                  <button type="submit" className="text-xs text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors">Desconectar</button>
                </form>
              ) : (
                <span className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50">Sin conectar</span>
              )}
            </div>

            {!shopDomain && (
              <div className="rounded-[14px] border border-black/[.08] p-5">
                <ShopifyConnectForm />
              </div>
            )}

            <div className="flex items-center justify-between rounded-[14px] border border-black/[.08] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm">?</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">¿Vendes en otra plataforma?</p>
                  <p className="text-xs text-gray-400">Escríbenos y evaluamos la integración con tu tienda.</p>
                </div>
              </div>
              <a href="mailto:soporte@lablld.com"
                className="text-sm font-semibold text-gray-900 hover:underline shrink-0">
                Contáctanos
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
