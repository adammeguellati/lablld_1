'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

export interface Facet {
  value: string
  label: string
  count: number
}

interface Props {
  basePath: string
  placeholder: string
  facetKey: string
  facets: Facet[]
  total: number
}

// One search-and-filter bar for every admin list. The three lists had none at
// all, which is the audit's scale finding: the only way to find an order was to
// read the whole table.
export function ListingControls({ basePath, placeholder, facetKey, facets, total }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const active = searchParams.get(facetKey)
  const routerRef = useRef(router)
  const paramsRef = useRef(searchParams)

  // Refs are kept current in an effect, never during render: the debounce below
  // must re-run only when q changes, and writing a ref during render breaks
  // under React 19. Same fix W1 made to the merchant filters.
  useEffect(() => {
    routerRef.current = router
    paramsRef.current = searchParams
  })

  useEffect(() => {
    const current = paramsRef.current.get('q') ?? ''
    if (q === current) return
    const t = setTimeout(() => {
      const p = new URLSearchParams(paramsRef.current.toString())
      if (q) p.set('q', q)
      else p.delete('q')
      p.delete('page')
      routerRef.current.push(`${basePath}?${p.toString()}`)
    }, 350)
    return () => clearTimeout(t)
  }, [q, basePath])

  const setFacet = useCallback((value: string | null) => {
    const p = new URLSearchParams(searchParams.toString())
    if (value) p.set(facetKey, value)
    else p.delete(facetKey)
    p.delete('page')
    router.push(`${basePath}?${p.toString()}`)
  }, [router, searchParams, basePath, facetKey])

  return (
    <div className="space-y-3.5">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#AEAEB2]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-11 w-full rounded-[13px] border border-black/[.08] bg-white pl-10 pr-9 text-[14.5px] outline-none transition-colors placeholder:text-[#AEAEB2] focus:border-black/25"
        />
        {q && (
          <button type="button" onClick={() => setQ('')} aria-label="Limpiar búsqueda"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AEAEB2] hover:text-[#1D1E20]">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setFacet(null)} aria-pressed={!active}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            !active ? 'bg-[#1D1E20] text-white' : 'border border-black/[.08] bg-white text-[#6E6E73] hover:border-black/25'
          }`}>
          Todas <span className="ml-1 opacity-60">{total}</span>
        </button>
        {facets.filter((f) => f.count > 0).map((f) => (
          <button key={f.value} type="button" onClick={() => setFacet(active === f.value ? null : f.value)}
            aria-pressed={active === f.value}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              active === f.value ? 'bg-[#1D1E20] text-white' : 'border border-black/[.08] bg-white text-[#6E6E73] hover:border-black/25'
            }`}>
            {f.label} <span className="ml-1 opacity-60">{f.count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
