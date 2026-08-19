import Link from 'next/link'
import { Package, Upload, Store, Rocket, Check } from 'lucide-react'

const STEPS = [
  { label: 'Explorar el catálogo', href: '/catalog',           icon: Package },
  { label: 'Subir tu etiqueta',    href: '/products',          icon: Upload },
  { label: 'Conectar tu tienda',   href: '/settings/shopify',  icon: Store },
  { label: 'Publicar producto',    href: '/products',          icon: Rocket },
]

interface Props {
  hasLabel: boolean
  hasShopify: boolean
  hasPublished: boolean
}

export function DashboardSteps({ hasLabel, hasShopify, hasPublished }: Props) {
  const done = [true, hasLabel, hasShopify, hasPublished]
  const current = done.findIndex((d) => !d)

  return (
    <div className="space-y-2">
      {STEPS.map(({ label, href, icon: Icon }, i) => {
        const isDone    = done[i]
        const isActive  = current === i
        return (
          <Link key={i} href={href}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all ${
              isDone
                ? 'border-gray-100 bg-white text-[#595959] hover:border-gray-200'
                : isActive
                  ? 'border-emerald-200 bg-emerald-50 text-gray-900 hover:border-emerald-300'
                  : 'border-gray-100 bg-white text-[#595959] hover:border-gray-200'
            }`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isDone ? 'bg-emerald-100' : isActive ? 'bg-emerald-500' : 'bg-gray-100'
            }`}>
              {isDone
                ? <Check className="h-3.5 w-3.5 text-emerald-600" />
                : <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              }
            </div>
            <span className="text-[13px] font-semibold">{label}</span>
          </Link>
        )
      })}
    </div>
  )
}
