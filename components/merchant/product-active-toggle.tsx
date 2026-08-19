'use client'

import { useTransition } from 'react'
import { toggleMerchantProductAction } from '@/app/(merchant)/products/actions'

interface Props {
  merchantProductId: string
  isActive: boolean
}

export function ProductActiveToggle({ merchantProductId, isActive }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      await toggleMerchantProductAction(merchantProductId, !isActive)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title={isActive ? 'Pausar producto' : 'Activar producto'}
      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors ${
        isPending
          ? 'bg-gray-100 text-gray-400 cursor-wait'
          : isActive
            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      {isPending ? '...' : isActive ? 'Activo' : 'Pausado'}
    </button>
  )
}
