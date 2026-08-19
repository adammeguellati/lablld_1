'use client'

import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import {
  payOrderWithCardAction, initPSEOrderPaymentAction,
  initNequiOrderPaymentAction, activateNequiOrderPaymentAction,
} from './actions'
const _pub = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ?? ''
const WOMPI_BASE = _pub.startsWith('pub_test_')
  ? 'https://sandbox.wompi.co/v1' : 'https://production.wompi.co/v1'
const ic = 'w-full h-11 border border-gray-200 rounded-xl px-3 text-sm outline-none focus:border-gray-400 bg-white transition-colors placeholder:text-gray-400'
const DOC_TYPES = [{ v: 'CC', l: 'Cédula' }, { v: 'CE', l: 'Cédula ext.' }, { v: 'NIT', l: 'NIT' }, { v: 'PP', l: 'Pasaporte' }]
type Method = 'card' | 'pse' | 'nequi'
interface PSEBank { code: string; name: string }
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}
export function OrderPaymentForm({ orderId, banks }: { orderId: string; banks: PSEBank[] }) {
  const [method, setMethod] = useState<Method>('card')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [number, setNumber] = useState('')
  const [holder, setHolder] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [savePM, setSavePM] = useState(true)
  const [bankCode, setBankCode] = useState('')
  const [docType, setDocType] = useState('CC')
  const [docNum, setDocNum] = useState('')
  const [phone, setPhone] = useState('')
  const [txId, setTxId] = useState<string | null>(null)
  const [txStatus, setTxStatus] = useState('PENDING')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (!txId) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/transactions/${txId}`)
        const data = await res.json() as { status: string }
        setTxStatus(data.status)
        if (data.status === 'APPROVED') { clearInterval(pollRef.current!); await activateNequiOrderPaymentAction(orderId, txId) }
        if (data.status === 'DECLINED' || data.status === 'ERROR') { clearInterval(pollRef.current!); setError('Pago rechazado.'); setTxId(null) }
      } catch { /* ignore */ }
    }, 3000)
    return () => clearInterval(pollRef.current!)
  }, [txId, orderId])
  async function handleCard(e: { preventDefault(): void }) {
    e.preventDefault(); setError(null); setLoading(true)
    const [expMonth, expYear] = expiry.split('/')
    if (!expMonth || !expYear || expYear.length < 2) { setError('Fecha de vencimiento inválida'); setLoading(false); return }
    try {
      const res = await fetch(`${WOMPI_BASE}/tokens/cards`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: number.replace(/\s/g, ''), exp_month: expMonth, exp_year: expYear, cvc, card_holder: holder.toUpperCase() }),
      })
      const data = await res.json() as { id?: string; error?: { reason: string } }
      if (!res.ok || !data.id) { setError(data.error?.reason ?? 'Datos de tarjeta inválidos'); setLoading(false); return }
      const result = await payOrderWithCardAction(orderId, data.id, savePM)
      if (result?.error) { setError(result.error); setLoading(false) }
    } catch { setError('Error de conexión.'); setLoading(false) }
  }
  async function handlePSE(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!bankCode) { setError('Selecciona tu banco'); return }
    setError(null); setLoading(true)
    const res = await initPSEOrderPaymentAction(orderId, bankCode, docType, docNum)
    if (res.error) { setError(res.error); setLoading(false); return }
    if (res.paymentUrl) window.location.href = res.paymentUrl
  }
  async function handleNequi(e: { preventDefault(): void }) {
    e.preventDefault(); setError(null); setLoading(true)
    const res = await initNequiOrderPaymentAction(orderId, phone)
    if (res.error) { setError(res.error); setLoading(false); return }
    setTxId(res.txId); setLoading(false)
  }
  if (txId) return (
    <div className="text-center space-y-4 py-4">
      <div className="w-12 h-12 mx-auto rounded-full bg-violet-100 flex items-center justify-center text-2xl animate-pulse">📱</div>
      <p className="font-semibold">Aprueba el pago en Nequi ({phone})</p>
      <p className="text-xs text-gray-400">{txStatus}</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {(['card', 'pse', 'nequi'] as Method[]).map(m => (
          <button key={m} type="button" onClick={() => { setMethod(m); setError(null) }}
            className={`flex-1 h-9 text-sm font-medium rounded-lg transition-colors ${method === m ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {m === 'card' ? 'Tarjeta' : m.toUpperCase()}
          </button>
        ))}
      </div>

      {method === 'card' && (
        <form onSubmit={handleCard} className="space-y-3">
          <div><label className="block text-xs text-gray-500 mb-1">Número de tarjeta</label>
            <input value={number} onChange={(e: ChangeEvent<HTMLInputElement>) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim())} placeholder="1234 5678 9012 3456" required inputMode="numeric" className={ic} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Nombre en la tarjeta</label>
            <input value={holder} onChange={(e: ChangeEvent<HTMLInputElement>) => setHolder(e.target.value)} placeholder="NOMBRE APELLIDO" required className={ic} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">Vencimiento</label>
              <input value={expiry} onChange={(e: ChangeEvent<HTMLInputElement>) => setExpiry(formatExpiry(e.target.value))} placeholder="MM/AA" required inputMode="numeric" className={ic} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">CVC</label>
              <input value={cvc} onChange={(e: ChangeEvent<HTMLInputElement>) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123" required inputMode="numeric" className={ic} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={savePM} onChange={e => setSavePM(e.target.checked)} className="rounded" />
            Guardar tarjeta para futuros pagos
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full h-12 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 disabled:opacity-60 transition-all">{loading ? 'Procesando...' : 'Pagar orden'}</button>
        </form>
      )}

      {method === 'pse' && (
        <form onSubmit={handlePSE} className="space-y-3">
          <div><label className="block text-xs text-gray-500 mb-1">Banco</label>
            <select value={bankCode} onChange={(e: ChangeEvent<HTMLSelectElement>) => setBankCode(e.target.value)} required className={ic}>
              <option value="">Selecciona tu banco</option>
              {banks.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">Tipo de documento</label>
              <select value={docType} onChange={(e: ChangeEvent<HTMLSelectElement>) => setDocType(e.target.value)} className={ic}>
                {DOC_TYPES.map(d => <option key={d.v} value={d.v}>{d.v} — {d.l}</option>)}
              </select></div>
            <div><label className="block text-xs text-gray-500 mb-1">Número de documento</label>
              <input value={docNum} onChange={(e: ChangeEvent<HTMLInputElement>) => setDocNum(e.target.value.replace(/\D/g, ''))} placeholder="1234567890" required inputMode="numeric" className={ic} /></div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full h-12 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 disabled:opacity-60 transition-all">{loading ? 'Redirigiendo...' : 'Continuar al banco →'}</button>
        </form>
      )}

      {method === 'nequi' && (
        <form onSubmit={handleNequi} className="space-y-3">
          <div><label className="block text-xs text-gray-500 mb-1">Número de teléfono Nequi</label>
            <input value={phone} onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="3001234567" required inputMode="numeric" className={ic} /></div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full h-12 bg-violet-600 text-white text-sm font-semibold rounded-full hover:bg-violet-700 disabled:opacity-60 transition-all">{loading ? 'Enviando...' : 'Enviar notificación Nequi →'}</button>
        </form>
      )}
    </div>
  )
}
