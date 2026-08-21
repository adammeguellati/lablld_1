'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  basePath: string
  page: number
  pageSize: number
  total: number
}

// The three admin lists loaded every row and rendered every row. At a few dozen
// that is merely slow; the audit filed it as the scale finding because nothing
// about it degrades gracefully.
export function ListingPagination({ basePath, page, pageSize, total }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  function go(n: number) {
    const p = new URLSearchParams(searchParams.toString())
    if (n <= 1) p.delete('page')
    else p.set('page', String(n))
    router.push(`${basePath}?${p.toString()}`)
  }

  const btn = 'rounded-[11px] border border-black/[.08] bg-white px-3.5 py-2 text-[13px] font-medium text-[#1D1E20] transition-colors hover:border-black/25 disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="text-[13px] text-[#86868B]">
        {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} disabled={page <= 1} onClick={() => go(page - 1)}>Anterior</button>
        <span className="text-[13px] text-[#6E6E73]">{page} / {pages}</span>
        <button type="button" className={btn} disabled={page >= pages} onClick={() => go(page + 1)}>Siguiente</button>
      </div>
    </div>
  )
}
