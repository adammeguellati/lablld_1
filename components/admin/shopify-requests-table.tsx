'use client'

import { useState, useTransition } from 'react'
import { Copy, Check, Mail, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { sendShopifyLinkAction, dismissShopifyRequestAction } from '@/app/admin/shopify/actions'
import type { Merchant } from '@/types'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} title="Copiar enlace"
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copiado' : 'Copiar enlace'}
    </button>
  )
}

function RequestRow({ r, appUrl }: { r: Merchant; appUrl: string }) {
  const [isPending, start] = useTransition()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const installUrl = `${appUrl}/api/shopify/auth?shop=${r.shopify_request_domain}`

  function sendEmail() {
    start(async () => {
      const res = await sendShopifyLinkAction(r.id)
      if (res?.error) { setError(res.error); return }
      setSent(true)
    })
  }

  function dismiss() {
    start(async () => {
      await dismissShopifyRequestAction(r.id)
      location.reload()
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{r.full_name}</p>
          <p className="text-xs text-gray-500">{r.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-2.5 py-0.5 rounded-full">
              {r.shopify_request_domain}
            </span>
            <span className="text-xs text-gray-400">{formatDate(r.created_at)}</span>
          </div>
          <div className="mt-3 p-2.5 bg-gray-50 rounded-lg">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Enlace de instalación</p>
            <p className="text-xs text-gray-600 break-all font-mono">{installUrl}</p>
          </div>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button onClick={sendEmail} disabled={isPending || sent}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-60">
            <Mail className="w-3.5 h-3.5" />
            {sent ? '¡Enviado!' : isPending ? 'Enviando...' : 'Enviar por correo'}
          </button>
          <CopyButton text={installUrl} />
          <button onClick={dismiss} disabled={isPending}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50">
            <X className="w-3.5 h-3.5" />
            Descartar
          </button>
        </div>
      </div>
    </div>
  )
}

export function ShopifyRequestsTable({ requests, appUrl }: { requests: Merchant[]; appUrl: string }) {
  if (!requests.length) {
    return (
      <div className="py-20 text-center bg-white rounded-xl border border-gray-100">
        <p className="text-sm text-gray-400">No hay solicitudes pendientes de conexión Shopify.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {requests.map((r) => <RequestRow key={r.id} r={r} appUrl={appUrl} />)}
    </div>
  )
}
