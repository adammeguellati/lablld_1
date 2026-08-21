import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Plan } from '@/types'

const PLUS_DISCOUNT = 0.18

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  // Two defects fixed together, both visible on the orders list.
  // 1. The locale was en-US in a Colombian Spanish app, so every date read
  //    "Aug 11, 2026".
  // 2. A date-only string parses as UTC midnight, which renders as the PREVIOUS
  //    day everywhere west of UTC, including all of Colombia at UTC-5. Anchor
  //    those to local time; timestamps already carry their own offset.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(dateString) ? `${dateString}T00:00:00` : dateString
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso))
}

// Compact variant for dense rows. "12 de ago de 2026" wraps inside the orders
// list's 92px id tile; es-CO is day-first so the numeric form is unambiguous.
export function formatDateShort(dateString: string): string {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(dateString) ? `${dateString}T00:00:00` : dateString
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatCOP(amount: number): string {
  const formatted = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
  return `$${formatted} COP`
}

export function calculateMerchantPrice(wholesalePrice: number, plan: Plan): number {
  if (plan === 'plus') return Math.round(wholesalePrice * (1 - PLUS_DISCOUNT) * 100) / 100
  return wholesalePrice
}

export function isProductNew(createdAt: string): boolean {
  const days = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  return days < 30
}

// filter(Boolean) is load-bearing, not tidying. Without it an unset
// ADMIN_EMAILS yields [''], and a user whose email is null or undefined
// matches it, so the allowlist grants admin instead of denying it.
const ADMIN_EMAIL_LIST = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export function isAdmin(email: string | null | undefined): boolean {
  const normalised = (email ?? '').trim().toLowerCase()
  return normalised !== '' && ADMIN_EMAIL_LIST.includes(normalised)
}
