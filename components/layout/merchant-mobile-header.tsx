'use client'

import Link from 'next/link'
import { Logo } from '@/components/shared/logo'
import { LogoutButton } from '@/components/shared/logout-button'

interface Props {
  merchantName: string
}

export function MerchantMobileHeader({ merchantName }: Props) {
  const initials = merchantName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0">
      <Logo />
      <div className="flex items-center gap-3">
        <LogoutButton
          iconOnly
          className="flex items-center text-gray-400 hover:text-gray-700 transition-colors p-1"
        />
        <Link href="/settings" className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-xs font-semibold text-white hover:bg-gray-700 transition-colors">
          {initials}
        </Link>
      </div>
    </header>
  )
}
