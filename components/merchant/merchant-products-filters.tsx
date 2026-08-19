'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'pending',  label: 'En revisión' },
  { value: 'approved', label: 'Aprobada' },
  { value: 'rejected', label: 'Rechazada' },
]

export function MerchantProductsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const routerRef = useRef(router)
  const paramsRef = useRef(searchParams)
  routerRef.current = router
  paramsRef.current = searchParams

  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams(paramsRef.current.toString())
      if (q) p.set('q', q)
      else p.delete('q')
      routerRef.current.push(`/products?${p.toString()}`)
    }, 350)
    return () => clearTimeout(t)
  }, [q])

  const set = useCallback(
    (key: string, value: string | null) => {
      const p = new URLSearchParams(searchParams.toString())
      if (value) p.set(key, value)
      else p.delete(key)
      router.push(`/products?${p.toString()}`)
    },
    [router, searchParams],
  )

  const status = searchParams.get('status')
  const hasFilters = status || q

  const pill = (active: boolean) =>
    `text-xs px-3.5 py-1.5 rounded-full border transition-all duration-150 ${
      active
        ? 'bg-gray-900 text-white border-gray-900'
        : 'border-gray-200 text-gray-600 hover:border-gray-400 bg-white'
    }`

  return (
    <div className="flex items-center gap-3 flex-wrap mb-7">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar productos..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white w-52 focus:outline-none focus:border-gray-400 transition-colors"
        />
        {q && (
          <button onClick={() => setQ('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="h-5 w-px bg-gray-200 hidden sm:block" />

      {STATUS_OPTIONS.map(({ value, label }) => (
        <button key={value} onClick={() => set('status', status === value ? null : value)}
          className={pill(status === value)}>
          {label}
        </button>
      ))}

      {hasFilters && (
        <button onClick={() => { setQ(''); router.push('/products') }}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors ml-1">
          <X className="w-3 h-3" /> Limpiar
        </button>
      )}
    </div>
  )
}
