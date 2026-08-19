'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ClipboardList, Package, Tag, Users, Settings } from 'lucide-react'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Órdenes', icon: ClipboardList },
  { href: '/admin/products', label: 'Productos', icon: Package },
  { href: '/admin/labels', label: 'Etiquetas', icon: Tag },
  { href: '/admin/merchants', label: 'Merchants', icon: Users },
  { href: '/admin/settings', label: 'Configuración', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-14 lg:w-64 bg-gray-900 text-white flex flex-col shrink-0">
      <div className="h-16 flex items-center px-3 lg:px-6 border-b border-gray-700 justify-center lg:justify-start">
        <span className="hidden lg:block text-xl font-bold tracking-tight">LABLLD Admin</span>
        <span className="lg:hidden text-lg font-bold">L</span>
      </div>
      <nav className="flex-1 px-2 lg:px-4 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              'flex items-center gap-3 px-2 lg:px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
              'justify-center lg:justify-start',
              pathname.startsWith(href)
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden lg:block">{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
