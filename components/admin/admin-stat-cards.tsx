'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export interface Stat {
  key: string
  label: string
  value: string | number
  facet?: string
}

interface Props {
  basePath: string
  facetKey: string
  stats: Stat[]
}

// The design's stat cards are filters, not decoration: clicking one narrows the
// list below it. A card with no facet is a read-only total.
export function AdminStatCards({ basePath, facetKey, stats }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const active = searchParams.get(facetKey)

  function go(facet?: string) {
    if (!facet) return
    const p = new URLSearchParams(searchParams.toString())
    if (active === facet) p.delete(facetKey)
    else p.set(facetKey, facet)
    p.delete('page')
    router.push(`${basePath}?${p.toString()}`)
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => {
        const on = Boolean(s.facet) && active === s.facet
        const Tag = s.facet ? 'button' : 'div'
        return (
          <Tag key={s.key} {...(s.facet ? { type: 'button' as const, onClick: () => go(s.facet), 'aria-pressed': on } : {})}
            className={`rounded-[18px] border bg-white px-5 py-4 text-left transition-colors ${
              on ? 'border-[#1D1E20]' : 'border-black/[.08]'
            } ${s.facet ? 'hover:border-black/25' : ''}`}>
            <p className="text-[12.5px] text-[#86868B]">{s.label}</p>
            <p className="mt-1 text-[26px] font-normal leading-tight tracking-[-0.01em] text-[#1D1E20]">{s.value}</p>
          </Tag>
        )
      })}
    </div>
  )
}
