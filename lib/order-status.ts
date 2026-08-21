import type { OrderStatus } from '@/types'

// One order-status vocabulary for the whole app. It was written out five times
// — three admin screens, two merchant ones — and /admin/dashboard had no copy at
// all, so it rendered the raw slug: an operator read "payment_failed".

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  quote_pending: 'Pendiente de cotización',
  payment_pending: 'Pendiente de pago',
  pending: 'Pendiente',
  paid: 'Pagada',
  payment_failed: 'Pago fallido',
  in_production: 'En producción',
  shipped: 'Enviada',
  delivered: 'Entregada',
  cancelled: 'Cancelada',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  quote_pending: 'bg-[#FDEFE0] text-[#B4690E]',
  payment_pending: 'bg-[#FDEFE0] text-[#B4690E]',
  pending: 'bg-[#FDEFE0] text-[#B4690E]',
  paid: 'bg-[#E6F6EB] text-[#16A34A]',
  payment_failed: 'bg-[#FBE9E6] text-[#C0303B]',
  in_production: 'bg-[#EDF4FC] text-[#1D5EA8]',
  shipped: 'bg-[#EFEBFB] text-[#6E56CF]',
  delivered: 'bg-[#E6F6EB] text-[#16A34A]',
  cancelled: 'bg-[#F0F0F3] text-[#86868B]',
}

/** Order of the filter pills, and of the workflow they describe. */
export const ORDER_STATUS_ORDER: OrderStatus[] = [
  'quote_pending', 'payment_pending', 'pending', 'paid',
  'in_production', 'shipped', 'delivered', 'payment_failed', 'cancelled',
]
