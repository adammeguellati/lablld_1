'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkPaymentStatusAction } from '@/app/(merchant)/orders/actions'

interface Props { orderId: string; txId: string; failRedirect: string }

export function PaymentResultPoller({ orderId, txId, failRedirect }: Props) {
  const router = useRouter()
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const poll = async () => {
      const { status } = await checkPaymentStatusAction(orderId, txId)
      if (status === 'paid') { router.push('/orders'); return }
      if (status === 'payment_failed') { router.push(failRedirect); return }
    }

    poll()
    const interval = setInterval(() => {
      setSeconds(s => s + 3)
      poll()
    }, 3000)
    return () => clearInterval(interval)
  }, [orderId, txId, router, failRedirect])

  if (seconds >= 30) {
    return (
      <p className="text-sm text-amber-600 mt-2">
        Esto está tardando más de lo usual. Si ya pagaste, tu orden se actualizará en breve automáticamente.
      </p>
    )
  }
  return null
}
