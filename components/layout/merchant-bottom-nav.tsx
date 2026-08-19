'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ShoppingBag, Package, Settings, ClipboardList } from 'lucide-react'

const items = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  { href: '/catalog', label: 'Catálogo', icon: Package },
  { href: '/products', label: 'Productos', icon: ShoppingBag },
  { href: '/settings', label: 'Config.', icon: Settings },
  { href: '/orders', label: 'Órdenes', icon: ClipboardList },
]

export function MerchantBottomNav({ pendingOrderCount = 0 }: { pendingOrderCount?: number }) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex md:hidden z-50">
      {items.map(({ href, label, icon: Icon }) => {
        const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
        const showDot = href === '/orders' && pendingOrderCount > 0
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px]',
              isActive ? 'text-gray-900' : 'text-gray-400'
            )}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {showDot && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white" />}
            </div>
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
