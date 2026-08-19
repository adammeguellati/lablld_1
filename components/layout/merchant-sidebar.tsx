'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/shared/logo'
import { LogoutButton } from '@/components/shared/logout-button'
import {
  LayoutDashboard, ShoppingBag, Package, Settings,
  ClipboardList, Home, MessageCircle, HelpCircle,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Inicio',          icon: LayoutDashboard },
  { href: '/products',  label: 'Mis Productos',    icon: ShoppingBag },
  { href: '/catalog',   label: 'Catálogo',         icon: Package },
  { href: '/orders',    label: 'Órdenes',          icon: ClipboardList },
  { href: '/settings',  label: 'Configuración',    icon: Settings },
]

const WA_URL = 'https://api.whatsapp.com/send/?phone=%2B573219482805&text=Hola%2C+tengo+una+pregunta+sobre+LABLLD+%F0%9F%8F%B7&type=phone_number&app_absent=0'
const HELP_URL = 'https://lablld.com/centro-de-ayuda'

interface Props { merchantName: string; pendingOrderCount?: number }

export function MerchantSidebar({ merchantName, pendingOrderCount = 0 }: Props) {
  const pathname = usePathname()
  const initials = merchantName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  const firstName = merchantName.split(' ')[0] || merchantName

  return (
    <aside className="hidden md:flex md:w-16 lg:w-60 bg-white border-r border-gray-100 flex-col h-screen shrink-0">
      <div className="px-3 lg:px-6 pt-7 pb-5 flex items-center justify-center lg:justify-start">
        <span className="hidden lg:block"><Logo /></span>
        <div className="lg:hidden w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white text-xs font-bold">L</div>
      </div>

      <div className="px-3 lg:px-5 pb-5 flex items-center justify-center lg:justify-between">
        <Link href="/settings" className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-xs font-semibold text-white shrink-0">
            {initials}
          </div>
          <span className="hidden lg:block text-[13px] font-semibold text-gray-800 truncate">{firstName}</span>
        </Link>
        <LogoutButton iconOnly className="hidden lg:flex text-gray-400 hover:text-gray-700 transition-colors shrink-0" />
      </div>

      <div className="h-px bg-gray-100 mx-4 mb-2" />

      <nav className="flex-1 px-3 lg:px-4 space-y-0.5 py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
          const showDot = href === '/orders' && pendingOrderCount > 0
          return (
            <Link key={href} href={href} prefetch={true} title={label}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-colors',
                'justify-center lg:justify-start',
                isActive
                  ? 'bg-gray-100 text-black'
                  : 'text-[#595959] hover:bg-gray-50 hover:text-black'
              )}>
              <div className="relative shrink-0">
                <Icon className="h-[18px] w-[18px]" />
                {showDot && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white" />}
              </div>
              <span className="hidden lg:block">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="h-px bg-gray-100 mx-4 my-2" />

      <div className="px-3 lg:px-4 pb-6 space-y-0.5">
        <a href={WA_URL} target="_blank" rel="noopener noreferrer" title="Contáctanos"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold text-[#595959] hover:bg-gray-50 hover:text-black transition-colors justify-center lg:justify-start">
          <MessageCircle className="h-[18px] w-[18px] shrink-0 text-green-500" />
          <span className="hidden lg:block">Contáctanos</span>
        </a>
        <a href={HELP_URL} target="_blank" rel="noopener noreferrer" title="Centro de ayuda"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold text-[#595959] hover:bg-gray-50 hover:text-black transition-colors justify-center lg:justify-start">
          <HelpCircle className="h-[18px] w-[18px] shrink-0" />
          <span className="hidden lg:block">Centro de ayuda</span>
        </a>
        <a href="https://lablld.com" target="_blank" rel="noopener noreferrer" title="Página principal"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold text-[#595959] hover:bg-gray-50 hover:text-black transition-colors justify-center lg:justify-start">
          <Home className="h-[18px] w-[18px] shrink-0" />
          <span className="hidden lg:block">Página principal</span>
        </a>
        <LogoutButton iconOnly className="lg:hidden w-full flex items-center justify-center py-2.5 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors" />
      </div>
    </aside>
  )
}
