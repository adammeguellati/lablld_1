'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

const CATEGORIES = [
  { key: 'supplements', label: 'Suplementos Dietarios' },
  { key: 'cosmeticos', label: 'Cosméticos & Cuidado Personal' },
  { key: 'cafe', label: 'Café y Infusiones' },
]

const FORMATS = [
  { key: 'capsule', label: 'Cápsula' },
  { key: 'powder', label: 'Polvo' },
  { key: 'serum', label: 'Sérum' },
  { key: 'oil', label: 'Aceite' },
  { key: 'gummy', label: 'Gomita' },
  { key: 'liquid', label: 'Líquido' },
  { key: 'cream', label: 'Crema' },
  { key: 'solid', label: 'Sólido' },
]

export function CatalogFilters() {
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
      p.delete('page')
      routerRef.current.push(`/catalog?${p.toString()}`)
    }, 350)
    return () => clearTimeout(t)
  }, [q])

  const set = useCallback(
    (key: string, value: string | null) => {
      const p = new URLSearchParams(searchParams.toString())
      if (value) p.set(key, value)
      else p.delete(key)
      p.delete('page')
      router.push(`/catalog?${p.toString()}`)
    },
    [router, searchParams],
  )

  const category = searchParams.get('category')
  const format = searchParams.get('format')
  const hasFilters = category || format || q

  const pill = (active: boolean) =>
    `text-xs px-3.5 py-1.5 rounded-full border transition-all duration-150 ${
      active
        ? 'bg-gray-900 text-white border-gray-900'
        : 'border-gray-200 text-gray-600 hover:border-gray-400 bg-white'
    }`

  return (
    <div className="space-y-3 mb-8">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white w-56 focus:outline-none focus:border-gray-400 transition-colors"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="h-5 w-px bg-gray-200 hidden sm:block" />

        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => set('category', category === key ? null : key)}
              className={pill(category === key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-gray-200 hidden sm:block" />

        <div className="flex items-center gap-2 flex-wrap">
          {FORMATS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => set('format', format === key ? null : key)}
              className={pill(format === key)}
            >
              {label}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button
            onClick={() => { setQ(''); router.push('/catalog') }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors ml-1"
          >
            <X className="w-3 h-3" /> Limpiar
          </button>
        )}
      </div>
    </div>
  )
}
