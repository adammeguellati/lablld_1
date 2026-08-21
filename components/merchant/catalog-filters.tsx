'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'

// Three, from the ProductCategory enum. The design's fourth (Cuidado personal)
// is not built: three categories is the truth and the enum wins.
const CATEGORIES = [
  { key: 'supplements', label: 'Suplementos Dietarios', dot: '#8FC79A' },
  { key: 'cosmeticos', label: 'Cosméticos & Cuidado Personal', dot: '#E4A0B7' },
  { key: 'cafe', label: 'Café y Infusiones', dot: '#D9B27C' },
]

const FORMATS = [
  { key: 'capsule', label: 'Cápsula' }, { key: 'powder', label: 'Polvo' },
  { key: 'serum', label: 'Sérum' }, { key: 'oil', label: 'Aceite' },
  { key: 'gummy', label: 'Gomita' }, { key: 'liquid', label: 'Líquido' },
  { key: 'cream', label: 'Crema' }, { key: 'solid', label: 'Sólido' },
]

const SORTS = [
  { key: '', label: 'Más recientes' },
  { key: 'name', label: 'Nombre (A–Z)' },
  { key: 'price_asc', label: 'Costo: menor a mayor' },
  { key: 'price_desc', label: 'Costo: mayor a menor' },
]

interface Props {
  formatCounts?: Record<string, number>
}

export function CatalogFilters({ formatCounts = {} }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const routerRef = useRef(router)
  const paramsRef = useRef(searchParams)

  useEffect(() => {
    routerRef.current = router
    paramsRef.current = searchParams
  })

  // Skips the first run. Without the guard this effect fires 350ms after every
  // mount and pushes a navigation nobody asked for, because q has not changed
  // yet: it is only meant to react to typing.
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    const t = setTimeout(() => {
      const p = new URLSearchParams(paramsRef.current.toString())
      if (q) p.set('q', q)
      else p.delete('q')
      p.delete('page')
      routerRef.current.push(`/catalog?${p.toString()}`)
    }, 350)
    return () => clearTimeout(t)
  }, [q])

  // Any click that is not inside an open menu closes it. Without this the menu
  // can only be dismissed by re-clicking its own trigger.
  useEffect(() => {
    if (!openMenu) return
    const close = () => setOpenMenu(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openMenu])

  const push = useCallback(
    (p: URLSearchParams) => {
      p.delete('page')
      const qs = p.toString()
      router.push(qs ? `/catalog?${qs}` : '/catalog')
    },
    [router],
  )

  const setSingle = useCallback(
    (key: string, value: string | null) => {
      const p = new URLSearchParams(searchParams.toString())
      if (value) p.set(key, value)
      else p.delete(key)
      push(p)
    },
    [searchParams, push],
  )

  // The design's filter bar is multi-select. `format` was single-valued and
  // becomes comma-separated, matching how `icons` already worked.
  const toggleMulti = useCallback(
    (key: string, value: string) => {
      const p = new URLSearchParams(searchParams.toString())
      const current = (p.get(key) ?? '').split(',').filter(Boolean)
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
      if (next.length) p.set(key, next.join(','))
      else p.delete(key)
      push(p)
    },
    [searchParams, push],
  )

  const category = searchParams.get('category')
  const formats = (searchParams.get('format') ?? '').split(',').filter(Boolean)
  const sort = searchParams.get('sort') ?? ''
  const sortLabel = SORTS.find((s) => s.key === sort)?.label ?? SORTS[0].label

  const activeChips = [
    ...(category ? [{ label: CATEGORIES.find((c) => c.key === category)?.label ?? category, clear: () => setSingle('category', null) }] : []),
    ...formats.map((f) => ({ label: FORMATS.find((x) => x.key === f)?.label ?? f, clear: () => toggleMulti('format', f) })),
    ...(q ? [{ label: `“${q}”`, clear: () => setQ('') }] : []),
  ]

  const trigger = (active: boolean) =>
    `flex items-center gap-2 rounded-[11px] border px-3.5 py-2.5 text-[14.5px] font-medium transition-colors ${
      active
        ? 'border-[#1D1E20] bg-white text-[#1D1E20]'
        : 'border-black/10 bg-white text-[#1D1E20] hover:border-black/25'
    }`

  const menu = 'absolute top-[calc(100%+8px)] left-0 z-40 min-w-[230px] rounded-[14px] border border-black/10 bg-white p-[7px] shadow-[0_12px_36px_rgba(0,0,0,.14)] max-h-[290px] overflow-auto'

  return (
    <div className="rounded-[18px] bg-[#F5F5F7] p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-none">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868B]" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-56 rounded-[11px] border border-black/10 bg-white py-2.5 pl-10 pr-8 text-[14.5px] outline-none transition-colors focus:border-black/25"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AEAEB2] transition-colors hover:text-[#1D1E20]"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="relative flex-none" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => setOpenMenu(openMenu === 'format' ? null : 'format')} className={trigger(formats.length > 0)}>
            <span>Presentación</span>
            {formats.length > 0 && (
              <span className="flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-[#1D1E20] px-[5px] text-[11.5px] font-semibold text-white">
                {formats.length}
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openMenu === 'format' ? 'rotate-180' : ''}`} />
          </button>
          {openMenu === 'format' && (
            <div className={menu}>
              {FORMATS.map(({ key, label }) => {
                const on = formats.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleMulti('format', key)}
                    className="flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[14.5px] transition-colors hover:bg-black/[.04]"
                  >
                    <span className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[5px] border ${on ? 'border-[#1D1E20] bg-[#1D1E20]' : 'border-black/20 bg-white'}`}>
                      {on && <Check className="h-3 w-3 text-white" strokeWidth={3.4} />}
                    </span>
                    <span className="flex-1">{label}</span>
                    <span className="text-[12.5px] font-medium text-[#AEAEB2]">{formatCounts[key] ?? 0}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex-1" />

        <div className="relative flex-none" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => setOpenMenu(openMenu === 'sort' ? null : 'sort')} className={trigger(sort !== '')}>
            <SlidersHorizontal className="h-[15px] w-[15px]" />
            <span>{sortLabel}</span>
          </button>
          {openMenu === 'sort' && (
            <div className={`${menu} left-auto right-0`}>
              {SORTS.map(({ key, label }) => (
                <button
                  key={key || 'default'}
                  type="button"
                  onClick={() => setSingle('sort', key || null)}
                  className={`flex w-full items-center rounded-[9px] px-2.5 py-2 text-left text-[14.5px] transition-colors hover:bg-black/[.04] ${sort === key ? 'font-medium text-[#1D1E20]' : 'text-[#6E6E73]'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        {CATEGORIES.map(({ key, label, dot }) => {
          const on = category === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSingle('category', on ? null : key)}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13.5px] font-medium transition-colors ${
                on ? 'border-[#1D1E20] bg-[#1D1E20] text-white' : 'border-black/10 bg-white text-[#1D1E20] hover:border-black/25'
              }`}
            >
              <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: dot }} />
              {label}
            </button>
          )
        })}
      </div>

      {activeChips.length > 0 && (
        <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border-t border-black/[.09] pt-3.5">
          {activeChips.map((chip, i) => (
            <button
              key={`${chip.label}-${i}`}
              type="button"
              onClick={chip.clear}
              className="flex items-center gap-1.5 rounded-full border border-black/[.08] bg-white py-1.5 pl-3.5 pr-2 text-[14px] font-medium transition-colors hover:bg-[#F0F0F3]"
            >
              <span>{chip.label}</span>
              <X className="h-3 w-3 text-[#86868B]" strokeWidth={2.4} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => { setQ(''); router.push('/catalog') }}
            className="px-1.5 py-1.5 text-[14px] font-medium text-[#6E6E73] transition-colors hover:text-[#1D1E20]"
          >
            Limpiar todo
          </button>
        </div>
      )}
    </div>
  )
}
