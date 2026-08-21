import { Resend } from 'resend'

// Lazy singleton. The Resend
// constructor throws on a missing key, so building it at module scope took the
// admin order page down at import time: its only importer is
// app/admin/orders/[id]/actions.ts, and the guard below never got to run.
let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY is not set')
    _resend = new Resend(key)
  }
  return _resend
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'LABLLD <noreply@lablld.com>'

function fmt(n: number) {
  return `$${n.toLocaleString('es-CO')} COP`
}

export async function sendQuoteEmail(opts: {
  to: string
  firstName: string
  orderRef: string
  items: string
  carrier: string
  estimatedDelivery: string
  productCostCop: number
  shippingCostCop: number
  totalCop: number
  paymentUrl: string
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return
  const { to, firstName, orderRef, items, carrier, estimatedDelivery, productCostCop, shippingCostCop, totalCop, paymentUrl } = opts
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Tu cotización está lista — Orden ${orderRef}`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;max-width:560px">
  <tr><td style="background:#111;padding:28px 32px">
    <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px">LABLLD</span>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111">Hola, ${firstName} 👋</p>
    <p style="margin:0 0 24px;color:#555;font-size:15px">Tu cotización para la <strong>Orden ${orderRef}</strong> está lista.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;margin-bottom:24px">
      <tr>
        <td style="padding:16px 20px;border-right:1px solid #333">
          <p style="margin:0;font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px">Transportadora</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#fff">${carrier}</p>
        </td>
        <td style="padding:16px 20px">
          <p style="margin:0;font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px">Entrega estimada</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#fff">${estimatedDelivery}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 6px;font-size:11px;color:#999;font-weight:600;text-transform:uppercase;letter-spacing:1px">Resumen del pedido</p>
    <p style="margin:0 0 16px;font-size:13px;color:#555">${items}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f8;border-radius:10px;padding:16px;margin-bottom:24px">
      <tr><td style="padding:4px 0;color:#555;font-size:14px">Costo de producto</td><td align="right" style="padding:4px 0;color:#555;font-size:14px">${fmt(productCostCop)}</td></tr>
      <tr><td style="padding:4px 0;color:#555;font-size:14px">Costo de envío</td><td align="right" style="padding:4px 0;color:#555;font-size:14px">${fmt(shippingCostCop)}</td></tr>
      <tr><td colspan="2" style="padding:8px 0 0;border-top:1px solid #e5e5e5"></td></tr>
      <tr><td style="padding:4px 0;font-size:16px;font-weight:700;color:#111">Total a pagar</td><td align="right" style="padding:4px 0;font-size:16px;font-weight:700;color:#111">${fmt(totalCop)}</td></tr>
    </table>
    <a href="${paymentUrl}" style="display:block;background:#111;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:600">Pagar ahora →</a>
    <p style="margin:16px 0 0;font-size:12px;color:#aaa;text-align:center">Este enlace es de uso único y estará disponible por 7 días.</p>
  </td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #f0f0f0">
    <p style="margin:0;font-size:12px;color:#aaa">LABLLD · Plataforma de fulfillment</p>
  </td></tr>
</table></td></tr></table></body></html>`,
  })
}
