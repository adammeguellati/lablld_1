'use client'

export interface PaymentMethodItem {
  id: string
  brand: string | null
  last4: string | null
  isDefault: boolean
}
